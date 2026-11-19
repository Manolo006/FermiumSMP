import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { GallerySlot, Member, MemberRoleGroup, ProjectSlot } from '../types';
import { membersList as defaultMembers, sortMembersByRole } from '../data/members';
import { projectSlots as defaultProjects } from '../data/projects';
import { gallerySlots as defaultGallery } from '../data/gallery';
import { getFirebaseServices } from '../config/firebase';
import { useAdminAuth } from './AdminAuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export const CMS_OVERLAY_STORAGE_KEY = 'fermium_cms_overlay_v1';

export interface ManagedVideoRef {
  id: string;
  url: string;
  createdAt?: number;
}

export interface ManagedSchematicItem {
  id: string;
  name: string;
  author?: string;
  origin?: 'fermium' | 'external';
  category?: string;
  dimensions?: string;
  blocks?: number;
  size?: string;
  format?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  fileName?: string;
  fileUrl?: string;
  url?: string;
  createdAt?: number;
}

type OverlayEntry<T> = T & { id: string; deleted?: boolean };

interface CmsOverlayState {
  members: Record<string, OverlayEntry<Member>>;
  projects: Record<string, OverlayEntry<ProjectSlot>>;
  gallery: Record<string, OverlayEntry<GallerySlot>>;
  videos: Record<string, OverlayEntry<ManagedVideoRef>>;
  schematics: Record<string, OverlayEntry<ManagedSchematicItem>>;
}

const EMPTY_OVERLAY: CmsOverlayState = {
  members: {},
  projects: {},
  gallery: {},
  videos: {},
  schematics: {},
};

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function deterministicVideoId(url: string): string {
  return `svid-${fnv1aHex(url.trim())}`;
}

export function deterministicSchematicId(item: Partial<ManagedSchematicItem>): string {
  if (item.id && !item.id.includes('/')) return item.id.trim();
  return `sschem-${fnv1aHex(`${item.name || ''}|${item.fileUrl || item.url || ''}`)}`;
}

function makeSlugId(prefix: string, seed: string): string {
  const clean = seed
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${clean || 'item'}-${rand}`;
}

function readCachedOverlay(): CmsOverlayState {
  if (typeof window === 'undefined') return EMPTY_OVERLAY;
  try {
    const raw = window.localStorage.getItem(CMS_OVERLAY_STORAGE_KEY);
    if (!raw) return EMPTY_OVERLAY;
    const parsed = JSON.parse(raw) as Partial<CmsOverlayState>;
    return {
      members: parsed.members || {},
      projects: parsed.projects || {},
      gallery: parsed.gallery || {},
      videos: parsed.videos || {},
      schematics: parsed.schematics || {},
    };
  } catch {
    return EMPTY_OVERLAY;
  }
}

function writeCachedOverlay(overlay: CmsOverlayState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CMS_OVERLAY_STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // Se lo spazio 5MB di localStorage è pieno per immagini/litematic base64, salva almeno membri/video/tombstones
    try {
      const compact: CmsOverlayState = {
        members: overlay.members,
        videos: overlay.videos,
        projects: {},
        gallery: {},
        schematics: {},
      };
      window.localStorage.setItem(CMS_OVERLAY_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // ignore quota errors
    }
  }
}

function mergeStaticAndOverlay<T extends { id: string }>(
  baseItems: T[],
  overlayMap: Record<string, OverlayEntry<T>>
): T[] {
  const result = new Map<string, T>();
  for (const item of baseItems) {
    result.set(item.id, item);
  }
  for (const [id, entry] of Object.entries(overlayMap)) {
    if (entry.deleted) {
      result.delete(id);
    } else {
      const { deleted: _deleted, ...clean } = entry;
      void _deleted;
      result.set(id, clean as unknown as T);
    }
  }
  return Array.from(result.values());
}

interface SiteContentContextType {
  members: Member[];
  projects: ProjectSlot[];
  gallery: GallerySlot[];
  videos: ManagedVideoRef[];
  schematics: ManagedSchematicItem[];
  firestoreConnected: boolean;
  saveMember: (input: {
    id?: string;
    name: string;
    roleGroup: MemberRoleGroup;
    uuid?: string;
    customImageUrl?: string;
  }) => Promise<void>;
  updateMemberRole: (id: string, roleGroup: MemberRoleGroup) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  saveProject: (
    input: Omit<ProjectSlot, 'slotNumber'> & { slotNumber?: number }
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addGalleryPhoto: (input: { imageUrl: string; aspectClass: string }) => Promise<void>;
  deleteGalleryPhoto: (id: string) => Promise<void>;
  addVideo: (url: string) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  saveSchematic: (item: ManagedSchematicItem) => Promise<void>;
  deleteSchematic: (id: string) => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextType | undefined>(undefined);

export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseVerified, firebaseConfigured } = useAdminAuth();
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [staticMembers, setStaticMembers] = useState<Member[]>(defaultMembers);
  const [staticVideos, setStaticVideos] = useState<ManagedVideoRef[]>([]);
  const [staticSchematics, setStaticSchematics] = useState<ManagedSchematicItem[]>([]);
  const [overlay, setOverlay] = useState<CmsOverlayState>(() => readCachedOverlay());
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);

  // Carica i JSON statici esistenti dal repository (zero perdita di dati)
  useEffect(() => {
    let cancelled = false;
    const bust = Date.now();

    fetch(`./members.json?t=${bust}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const parsed: Member[] = data
          .filter((item) => item && typeof item.name === 'string')
          .map((item) => ({
            id: (item.id || item.name).trim().toLowerCase(),
            name: item.name.trim(),
            uuid: typeof item.uuid === 'string' ? item.uuid.trim() : undefined,
            roleGroup:
              item.roleGroup === 'owner' || item.roleGroup === 'member' || item.roleGroup === 'trial'
                ? item.roleGroup
                : 'member',
            customImageUrl: typeof item.customImageUrl === 'string' ? item.customImageUrl : undefined,
          }));
        if (parsed.length > 0) setStaticMembers(parsed);
      })
      .catch(() => {});

    fetch(`./videos.json?t=${bust}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.text() : null))
      .then((rawText) => {
        if (cancelled || !rawText) return;
        let rawList: unknown = [];
        try {
          rawList = JSON.parse(rawText);
        } catch {
          rawList = rawText.match(/https?:\/\/[^\s"'\]\}]+/g) ?? [];
        }
        if (!Array.isArray(rawList)) return;
        const refs: ManagedVideoRef[] = rawList
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((u) => u.startsWith('http'))
          .map((url) => ({ id: deterministicVideoId(url), url }));
        setStaticVideos(refs);
      })
      .catch(() => {});

    fetch(`./schematics.json?t=${bust}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const valid: ManagedSchematicItem[] = data
          .filter((item) => item && item.name && (item.fileUrl || item.url))
          .map((item) => ({
            ...item,
            id: deterministicSchematicId(item),
          }));
        setStaticSchematics(valid);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Sottoscrizione realtime alle collezioni Cloud Firestore quando Firebase è configurato
  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) {
      setFirestoreConnected(false);
      return;
    }

    const { db } = services;
    const unsubs: Array<() => void> = [];

    const bindCollection = <K extends keyof CmsOverlayState>(
      colName: string,
      key: K
    ) => {
      try {
        const unsub = onSnapshot(
          collection(db, colName),
          (snap) => {
            setFirestoreConnected(true);
            setOverlay((prev) => {
              const map: Record<string, OverlayEntry<never>> = {};
              snap.forEach((docSnap) => {
                const data = docSnap.data() as Record<string, unknown>;
                map[docSnap.id] = { ...data, id: docSnap.id } as OverlayEntry<never>;
              });
              const next: CmsOverlayState = {
                ...prev,
                [key]: map,
              };
              writeCachedOverlay(next);
              return next;
            });
          },
          (err) => {
            console.warn(`Firestore listener (${colName}):`, err);
          }
        );
        unsubs.push(unsub);
      } catch (err) {
        console.warn(`Unable to subscribe to ${colName}:`, err);
      }
    };

    bindCollection('cms_members', 'members');
    bindCollection('cms_projects', 'projects');
    bindCollection('cms_gallery', 'gallery');
    bindCollection('cms_videos', 'videos');
    bindCollection('cms_schematics', 'schematics');

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseConfigured]);

  const staticMemberIds = useMemo(
    () => new Set(staticMembers.map((m) => m.id)),
    [staticMembers]
  );
  const staticProjectIds = useMemo(
    () => new Set(defaultProjects.map((p) => p.id)),
    []
  );
  const staticGalleryIds = useMemo(
    () => new Set(defaultGallery.map((g) => g.id)),
    []
  );
  const staticVideoIds = useMemo(
    () => new Set(staticVideos.map((v) => v.id)),
    [staticVideos]
  );
  const staticSchematicIds = useMemo(
    () => new Set(staticSchematics.map((s) => s.id)),
    [staticSchematics]
  );

  const members = useMemo(
    () => sortMembersByRole(mergeStaticAndOverlay(staticMembers, overlay.members)),
    [staticMembers, overlay.members]
  );

  const projects = useMemo(
    () => mergeStaticAndOverlay(defaultProjects, overlay.projects),
    [overlay.projects]
  );

  const gallery = useMemo(
    () => mergeStaticAndOverlay(defaultGallery, overlay.gallery),
    [overlay.gallery]
  );

  const videos = useMemo(
    () => mergeStaticAndOverlay(staticVideos, overlay.videos),
    [staticVideos, overlay.videos]
  );

  const schematics = useMemo(
    () => mergeStaticAndOverlay(staticSchematics, overlay.schematics),
    [staticSchematics, overlay.schematics]
  );

  const requireAuthorizedFirestore = useCallback(async () => {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error(
        isIt
          ? 'Firebase non è configurato su questo dispositivo. Apri #/staff per collegare il progetto Firebase.'
          : 'Firebase is not configured yet. Open #/staff to connect your Firebase project.'
      );
    }
    try {
      await services.auth.authStateReady();
    } catch {
      // continua
    }
    if (!services.auth.currentUser && !firebaseVerified) {
      throw new Error(
        isIt
          ? 'Sessione Google scaduta o non verificata. Riaccedi dal portale #/staff con l’account Fermium.'
          : 'Google session expired or unverified. Sign in again via #/staff.'
      );
    }
    return services.db;
  }, [firebaseVerified, isIt]);

  // --- CRUD MEMBRI ---
  const saveMember = useCallback(
    async (input: {
      id?: string;
      name: string;
      roleGroup: MemberRoleGroup;
      uuid?: string;
      customImageUrl?: string;
    }) => {
      const db = await requireAuthorizedFirestore();
      const cleanName = input.name.trim();
      if (!cleanName) {
        throw new Error(isIt ? 'Inserisci il nickname Minecraft.' : 'Enter Minecraft nickname.');
      }
      const docId = (input.id || cleanName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const payload: Record<string, unknown> = {
        id: docId,
        name: cleanName,
        roleGroup: input.roleGroup,
        deleted: false,
        updatedAt: serverTimestamp(),
      };
      if (input.uuid) payload.uuid = input.uuid.trim().toLowerCase();
      if (input.customImageUrl) payload.customImageUrl = input.customImageUrl.trim();

      await setDoc(doc(db, 'cms_members', docId), payload);
    },
    [isIt, requireAuthorizedFirestore]
  );

  const updateMemberRole = useCallback(
    async (id: string, roleGroup: MemberRoleGroup) => {
      const target = members.find((m) => m.id === id);
      if (!target) return;
      await saveMember({ ...target, id, roleGroup });
    },
    [members, saveMember]
  );

  const deleteMember = useCallback(
    async (id: string) => {
      const db = await requireAuthorizedFirestore();
      if (staticMemberIds.has(id)) {
        await setDoc(doc(db, 'cms_members', id), {
          id,
          deleted: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'cms_members', id));
      }
    },
    [requireAuthorizedFirestore, staticMemberIds]
  );

  // --- CRUD PROGETTI ---
  const saveProject = useCallback(
    async (input: Omit<ProjectSlot, 'slotNumber'> & { slotNumber?: number }) => {
      const db = await requireAuthorizedFirestore();
      if (
        !input.titleIt.trim() ||
        !input.titleEn.trim() ||
        !input.descIt.trim() ||
        !input.descEn.trim()
      ) {
        throw new Error(
          isIt
            ? 'Titolo e descrizione sono obbligatori sia in Italiano che in Inglese.'
            : 'Title and description are mandatory in both Italian and English.'
        );
      }
      const docId = input.id?.trim() || makeSlugId('proj', input.titleEn || input.titleIt);
      const slotNumber =
        input.slotNumber ??
        (projects.reduce((acc, p) => Math.max(acc, p.slotNumber || 0), 0) + 1);

      const payload: Record<string, unknown> = {
        id: docId,
        slotNumber,
        category: input.category,
        coverImage: input.coverImage || '',
        titleIt: input.titleIt.trim(),
        titleEn: input.titleEn.trim(),
        descIt: input.descIt.trim(),
        descEn: input.descEn.trim(),
        deleted: false,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'cms_projects', docId), payload);
    },
    [isIt, projects, requireAuthorizedFirestore]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const db = await requireAuthorizedFirestore();
      if (staticProjectIds.has(id)) {
        await setDoc(doc(db, 'cms_projects', id), {
          id,
          deleted: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'cms_projects', id));
      }
    },
    [requireAuthorizedFirestore, staticProjectIds]
  );

  // --- CRUD GALLERIA ---
  const addGalleryPhoto = useCallback(
    async (input: { imageUrl: string; aspectClass: string }) => {
      const db = await requireAuthorizedFirestore();
      if (!input.imageUrl.trim()) {
        throw new Error(isIt ? 'Carica una foto prima di salvare.' : 'Upload a photo first.');
      }
      const docId = makeSlugId('gal', 'photo');
      const slotNumber = gallery.reduce((acc, g) => Math.max(acc, g.slotNumber || 0), 0) + 1;
      await setDoc(doc(db, 'cms_gallery', docId), {
        id: docId,
        slotNumber,
        aspectClass: input.aspectClass || 'lg:col-span-4 aspect-[4/3]',
        imageUrl: input.imageUrl.trim(),
        deleted: false,
        updatedAt: serverTimestamp(),
      });
    },
    [gallery, isIt, requireAuthorizedFirestore]
  );

  const deleteGalleryPhoto = useCallback(
    async (id: string) => {
      const db = await requireAuthorizedFirestore();
      if (staticGalleryIds.has(id)) {
        await setDoc(doc(db, 'cms_gallery', id), {
          id,
          deleted: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'cms_gallery', id));
      }
    },
    [requireAuthorizedFirestore, staticGalleryIds]
  );

  // --- CRUD VIDEO ---
  const addVideo = useCallback(
    async (url: string) => {
      const db = await requireAuthorizedFirestore();
      const cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http')) {
        throw new Error(
          isIt ? 'Inserisci un link YouTube o TikTok valido.' : 'Enter a valid YouTube or TikTok URL.'
        );
      }
      const docId = deterministicVideoId(cleanUrl);
      await setDoc(doc(db, 'cms_videos', docId), {
        id: docId,
        url: cleanUrl,
        deleted: false,
        updatedAt: serverTimestamp(),
      });
    },
    [isIt, requireAuthorizedFirestore]
  );

  const deleteVideo = useCallback(
    async (id: string) => {
      const db = await requireAuthorizedFirestore();
      if (staticVideoIds.has(id)) {
        await setDoc(doc(db, 'cms_videos', id), {
          id,
          deleted: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'cms_videos', id));
      }
    },
    [requireAuthorizedFirestore, staticVideoIds]
  );

  // --- CRUD SCHEMATICS ---
  const saveSchematic = useCallback(
    async (item: ManagedSchematicItem) => {
      const db = await requireAuthorizedFirestore();
      if (!item.name.trim() || !(item.fileUrl || item.url)) {
        throw new Error(
          isIt
            ? 'Nome schematic e file .litematic sono obbligatori.'
            : 'Schematic name and .litematic file are required.'
        );
      }
      const docId = item.id?.trim() || makeSlugId('schem', item.name);
      const payload: Record<string, unknown> = {
        id: docId,
        name: item.name.trim(),
        author: (item.author || 'Fermium SMP').trim(),
        origin: item.origin === 'external' ? 'external' : 'fermium',
        category: (item.category || 'Redstone Tech').trim(),
        dimensions: item.dimensions || '',
        blocks: typeof item.blocks === 'number' ? item.blocks : 0,
        size: item.size || '',
        format: item.format || '.litematic',
        description: (item.description || '').trim(),
        image: item.image || item.imageUrl || '',
        images: Array.isArray(item.images) ? item.images : [],
        fileName: item.fileName || `${item.name.trim()}.litematic`,
        fileUrl: item.fileUrl || item.url || '',
        deleted: false,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'cms_schematics', docId), payload);
    },
    [isIt, requireAuthorizedFirestore]
  );

  const deleteSchematic = useCallback(
    async (id: string) => {
      const db = await requireAuthorizedFirestore();
      if (staticSchematicIds.has(id)) {
        await setDoc(doc(db, 'cms_schematics', id), {
          id,
          deleted: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'cms_schematics', id));
      }
    },
    [requireAuthorizedFirestore, staticSchematicIds]
  );

  return (
    <SiteContentContext.Provider
      value={{
        members,
        projects,
        gallery,
        videos,
        schematics,
        firestoreConnected,
        saveMember,
        updateMemberRole,
        deleteMember,
        saveProject,
        deleteProject,
        addGalleryPhoto,
        deleteGalleryPhoto,
        addVideo,
        deleteVideo,
        saveSchematic,
        deleteSchematic,
      }}
    >
      {children}
    </SiteContentContext.Provider>
  );
};

export const useSiteContent = () => {
  const ctx = useContext(SiteContentContext);
  if (!ctx) {
    throw new Error('useSiteContent must be used within SiteContentProvider');
  }
  return ctx;
};
