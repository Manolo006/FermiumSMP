import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Box,
  Check,
  ImagePlus,
  Loader2,
  RefreshCw,
  Upload,
  UserPlus,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import type { Member, MemberRoleGroup, ProjectCategoryKey, ProjectSlot } from '../../types';
import { getMemberSkinUrls } from '../../data/members';
import type { ManagedSchematicItem } from '../../context/SiteContentContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { extractTikTokVideoId, extractYouTubeId } from '../../data/media';
import {
  compressImageToWebP,
  formatBytesCompact,
  lookupMojangPlayer,
  readLitematicFile,
} from '../../utils/mediaUpload';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-xl',
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#06090E]/85 backdrop-blur-xl overflow-y-auto overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} glass-panel border-gradient-cyan rounded-2xl p-5 sm:p-7 text-left my-auto max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-white/10">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-accent-cyan block mb-1">
              Fermium Staff CMS
            </span>
            <h3 className="text-lg sm:text-xl font-heading font-bold text-text-primary">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-text-secondary hover:text-white transition-colors cursor-pointer active:scale-[0.96]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ErrorBanner: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-400/35 text-xs text-red-200 flex items-start gap-2.5"
    >
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
};

// ============================================================================
// 1. MEMBER MODAL (Add / Edit)
// ============================================================================
interface MemberFormModalProps {
  isOpen: boolean;
  initialMember?: Member | null;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    roleGroup: MemberRoleGroup;
    uuid?: string;
  }) => Promise<void>;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  initialMember,
  onClose,
  onSave,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [name, setName] = useState('');
  const [roleGroup, setRoleGroup] = useState<MemberRoleGroup>('member');
  const [uuid, setUuid] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialMember?.name || '');
    setRoleGroup(initialMember?.roleGroup || 'member');
    setUuid(initialMember?.uuid || '');
    setError(null);
  }, [isOpen, initialMember]);

  const runMojangLookup = async (nick: string) => {
    const clean = nick.trim();
    if (clean.length < 2) return;
    setLookingUp(true);
    try {
      const res = await lookupMojangPlayer(clean);
      if (res.uuid) setUuid(res.uuid);
      if (res.exactName && !initialMember) setName(res.exactName);
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !name.trim() || uuid) return;
    const timer = window.setTimeout(() => {
      runMojangLookup(name);
    }, 550);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isOpen]);

  const previewUrl = name.trim()
    ? getMemberSkinUrls(name.trim(), 'bust', uuid || undefined)[0]
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(isIt ? 'Inserisci il nickname Minecraft.' : 'Enter Minecraft nickname.');
      return;
    }
    setSaving(true);
    try {
      let resolvedUuid = uuid.trim();
      if (!resolvedUuid) {
        const res = await lookupMojangPlayer(name.trim());
        if (res.uuid) resolvedUuid = res.uuid;
      }
      await onSave({
        id: initialMember?.id,
        name: name.trim(),
        roleGroup,
        uuid: resolvedUuid || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialMember
          ? isIt
            ? `Modifica Membro: ${initialMember.name}`
            : `Edit Member: ${initialMember.name}`
          : isIt
            ? 'Aggiungi Nuovo Membro'
            : 'Add New Member'
      }
      subtitle={
        isIt
          ? 'La skin 3D viene recuperata automaticamente tramite UUID ufficiale Mojang.'
          : 'The 3D skin is automatically resolved from the official Mojang UUID.'
      }
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
          <div className="w-28 h-28 rounded-2xl bg-[#0B0F14] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden p-2">
            {previewUrl ? (
              <img src={previewUrl} alt={name} className="w-full h-full object-contain" />
            ) : (
              <UserPlus className="w-8 h-8 text-text-muted" />
            )}
          </div>

          <div className="flex-1 w-full space-y-3">
            <div>
              <label
                htmlFor="cms-member-name"
                className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
              >
                {isIt ? 'Nickname Minecraft *' : 'Minecraft Nickname *'}
              </label>
              <div className="flex gap-2">
                <input
                  id="cms-member-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!initialMember) setUuid('');
                  }}
                  placeholder="Es. Manolo006"
                  required
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm font-mono text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => runMojangLookup(name)}
                  disabled={lookingUp || name.trim().length < 2}
                  title={isIt ? 'Cerca UUID Mojang' : 'Lookup Mojang UUID'}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-accent-cyan disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${lookingUp ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {uuid && (
                <p className="text-[11px] font-mono text-emerald-400 mt-1 truncate">
                  UUID Mojang: {uuid}
                </p>
              )}
            </div>

            <div>
              <span className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5">
                {isIt ? 'Ruolo nel Server *' : 'Server Role *'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'owner', label: 'Owner', dot: 'bg-role-owner' },
                    { id: 'member', label: 'Member', dot: 'bg-role-member' },
                    { id: 'trial', label: 'Trial', dot: 'bg-role-trial' },
                  ] as const
                ).map((r) => {
                  const active = roleGroup === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoleGroup(r.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan'
                          : 'bg-white/[0.03] border-white/10 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading font-medium text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {isIt ? 'Annulla' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer disabled:opacity-50 shadow-glow-cyan"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isIt ? 'Salva Membro' : 'Save Member'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ============================================================================
// 2. PROJECT MODAL (Mandatory IT + EN + WebP Upload)
// ============================================================================
interface ProjectFormModalProps {
  isOpen: boolean;
  initialProject?: ProjectSlot | null;
  onClose: () => void;
  onSave: (
    input: Omit<ProjectSlot, 'slotNumber'> & { slotNumber?: number }
  ) => Promise<void>;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  initialProject,
  onClose,
  onSave,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [category, setCategory] = useState<Exclude<ProjectCategoryKey, 'all'>>('perimeters');
  const [coverImage, setCoverImage] = useState('');
  const [imageSizeInfo, setImageSizeInfo] = useState<string>('');
  const [compressing, setCompressing] = useState(false);

  const [titleIt, setTitleIt] = useState('');
  const [descIt, setDescIt] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descEn, setDescEn] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCategory(initialProject?.category || 'perimeters');
    setCoverImage(initialProject?.coverImage || '');
    setTitleIt(initialProject?.titleIt || '');
    setDescIt(initialProject?.descIt || '');
    setTitleEn(initialProject?.titleEn || '');
    setDescEn(initialProject?.descEn || '');
    setImageSizeInfo('');
    setError(null);
  }, [isOpen, initialProject]);

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setCompressing(true);
    try {
      const res = await compressImageToWebP(file, 1600, 320_000);
      setCoverImage(res.dataUrl);
      setImageSizeInfo(`${res.width}×${res.height} · ${formatBytesCompact(res.byteSize)} WebP`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCompressing(false);
    }
  };

  const bilingualValid =
    titleIt.trim().length > 0 &&
    descIt.trim().length > 0 &&
    titleEn.trim().length > 0 &&
    descEn.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!bilingualValid) {
      setError(
        isIt
          ? 'Compila tutti i campi obbligatori sia in Italiano che in Inglese prima di salvare.'
          : 'Fill in both Italian and English titles and descriptions before saving.'
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: initialProject?.id || '',
        slotNumber: initialProject?.slotNumber,
        category,
        coverImage: coverImage.trim() || undefined,
        titleIt: titleIt.trim(),
        titleEn: titleEn.trim(),
        descIt: descIt.trim(),
        descEn: descEn.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title={
        initialProject
          ? isIt
            ? 'Modifica Progetto'
            : 'Edit Project'
          : isIt
            ? 'Nuovo Progetto Tecnico'
            : 'Add Technical Project'
      }
      subtitle={
        isIt
          ? 'Carica uno screenshot (compresso in WebP automaticamente) e compila entrambi i testi IT + EN.'
          : 'Upload a screenshot (auto-compressed WebP) and provide both IT + EN texts.'
      }
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category & Image Upload */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="cms-proj-cat"
              className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
            >
              {isIt ? 'Categoria *' : 'Category *'}
            </label>
            <select
              id="cms-proj-cat"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Exclude<ProjectCategoryKey, 'all'>)
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary"
            >
              <option value="perimeters">Perimetri / Perimeters</option>
              <option value="redstone">Redstone</option>
              <option value="storage">Storage Systems</option>
              <option value="farms">Farms</option>
              <option value="infrastructure">Infrastrutture / Infrastructure</option>
              <option value="megabuilds">Mega-builds</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5">
              {isIt ? 'Immagine Progetto (WebP / URL)' : 'Project Screenshot (WebP / URL)'}
            </span>
            <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/35 text-xs font-mono font-semibold text-accent-cyan cursor-pointer transition-colors">
              {compressing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              <span>{isIt ? 'Carica Foto dal PC' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
            </label>
            {imageSizeInfo && (
              <p className="text-[11px] font-mono text-emerald-400 mt-1">{imageSizeInfo}</p>
            )}
          </div>
        </div>

        {coverImage && (
          <div className="relative aspect-[16/9] max-h-44 w-full rounded-xl overflow-hidden border border-white/10 bg-[#0B0F14]">
            <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setCoverImage('');
                setImageSizeInfo('');
              }}
              aria-label="Rimuovi immagine"
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#0B0F14]/85 border border-white/15 text-text-secondary hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mandatory IT + EN fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-accent-cyan">
                ITALIANO (Obbligatorio)
              </span>
            </div>
            <div>
              <label
                htmlFor="cms-proj-title-it"
                className="block text-[11px] font-mono text-text-secondary mb-1"
              >
                Titolo IT *
              </label>
              <input
                id="cms-proj-title-it"
                type="text"
                value={titleIt}
                onChange={(e) => setTitleIt(e.target.value)}
                placeholder="Es. Gold Farm Sul Tetto"
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary"
              />
            </div>
            <div>
              <label
                htmlFor="cms-proj-desc-it"
                className="block text-[11px] font-mono text-text-secondary mb-1"
              >
                Descrizione IT *
              </label>
              <textarea
                id="cms-proj-desc-it"
                rows={3}
                value={descIt}
                onChange={(e) => setDescIt(e.target.value)}
                placeholder="Descrizione tecnica in italiano..."
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary resize-none"
              />
            </div>
          </div>

          <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-accent-cyan">
                ENGLISH (Required)
              </span>
            </div>
            <div>
              <label
                htmlFor="cms-proj-title-en"
                className="block text-[11px] font-mono text-text-secondary mb-1"
              >
                Title EN *
              </label>
              <input
                id="cms-proj-title-en"
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Nether Roof Gold Farm"
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary"
              />
            </div>
            <div>
              <label
                htmlFor="cms-proj-desc-en"
                className="block text-[11px] font-mono text-text-secondary mb-1"
              >
                Description EN *
              </label>
              <textarea
                id="cms-proj-desc-en"
                rows={3}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="Technical description in English..."
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-text-muted">
            {bilingualValid ? (
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {isIt ? 'IT + EN completi' : 'IT + EN complete'}
              </span>
            ) : isIt ? (
              'Compila tutti i campi IT e EN'
            ) : (
              'Complete all IT and EN fields'
            )}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading font-medium text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {isIt ? 'Annulla' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving || compressing || !bilingualValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer disabled:opacity-45 shadow-glow-cyan"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isIt ? 'Salva Progetto' : 'Save Project'}</span>
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

// ============================================================================
// 3. GALLERY MODAL (Upload WebP)
// ============================================================================
interface GalleryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { imageUrl: string; aspectClass: string }) => Promise<void>;
}

export const GalleryFormModal: React.FC<GalleryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [imageUrl, setImageUrl] = useState('');
  const [imageMeta, setImageMeta] = useState('');
  const [aspectClass, setAspectClass] = useState('lg:col-span-4 aspect-[4/3]');
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setImageUrl('');
    setImageMeta('');
    setAspectClass('lg:col-span-4 aspect-[4/3]');
    setError(null);
  }, [isOpen]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setCompressing(true);
    try {
      const res = await compressImageToWebP(file, 1600, 320_000);
      setImageUrl(res.dataUrl);
      setImageMeta(`${res.width}×${res.height} · ${formatBytesCompact(res.byteSize)} WebP`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!imageUrl.trim()) {
      setError(isIt ? 'Seleziona una foto dal PC.' : 'Select a photo first.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ imageUrl, aspectClass });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isIt ? 'Carica Foto in Galleria' : 'Upload Photo to Gallery'}
      subtitle={
        isIt
          ? 'Ottimizzazione automatica WebP nel browser, zero peso extra su GitHub.'
          : 'Automatic in-browser WebP optimization stored directly in Firestore.'
      }
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-accent-cyan/35 bg-accent-cyan/[0.04] hover:bg-accent-cyan/[0.08] transition-colors cursor-pointer text-center">
          {compressing ? (
            <Loader2 className="w-8 h-8 text-accent-cyan animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-accent-cyan" />
          )}
          <span className="text-sm font-heading font-semibold text-text-primary">
            {isIt ? 'Clicca per scegliere uno screenshot' : 'Click to choose a screenshot'}
          </span>
          <span className="text-xs font-mono text-text-muted">PNG / JPG / WebP</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {imageUrl && (
          <div className="space-y-1.5">
            <div className="aspect-[16/10] max-h-52 w-full rounded-xl overflow-hidden border border-white/10 bg-[#0B0F14]">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            {imageMeta && <p className="text-xs font-mono text-emerald-400">{imageMeta}</p>}
          </div>
        )}

        <div>
          <span className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2">
            {isIt ? 'Dimensione Riquadro nella Griglia' : 'Grid Tile Size'}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'lg:col-span-7 aspect-[16/10]', label: isIt ? 'Grande 16:10' : 'Wide 16:10' },
              { id: 'lg:col-span-5 aspect-[16/10]', label: isIt ? 'Media 16:10' : 'Medium 16:10' },
              { id: 'lg:col-span-4 aspect-[4/3]', label: isIt ? 'Standard 4:3' : 'Standard 4:3' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAspectClass(opt.id)}
                className={`py-2 px-3 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                  aspectClass === opt.id
                    ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan font-semibold'
                    : 'bg-white/[0.03] border-white/10 text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading font-medium text-text-secondary cursor-pointer"
          >
            {isIt ? 'Annulla' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving || compressing || !imageUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer disabled:opacity-45 shadow-glow-cyan"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isIt ? 'Pubblica Foto' : 'Publish Photo'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ============================================================================
// 4. VIDEO MODAL (YouTube / TikTok Link)
// ============================================================================
interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}

export const VideoFormModal: React.FC<VideoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrl('');
    setError(null);
  }, [isOpen]);

  const ytId = extractYouTubeId(url);
  const tkId = extractTikTokVideoId(url);
  const isValidVideoUrl = Boolean(ytId || tkId || url.trim().startsWith('http'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim().startsWith('http')) {
      setError(isIt ? 'Incolla un URL valido YouTube o TikTok.' : 'Paste a valid YouTube or TikTok URL.');
      return;
    }
    setSaving(true);
    try {
      await onSave(url.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isIt ? 'Aggiungi Video Fermium SMP' : 'Add Fermium SMP Video'}
      subtitle={
        isIt
          ? 'Incolla il link YouTube o TikTok: titolo, autore e copertina vengono caricati in automatico.'
          : 'Paste any YouTube or TikTok link: title, author, and thumbnail load automatically.'
      }
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="cms-video-url"
            className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
          >
            URL Video (YouTube / TikTok) *
          </label>
          <input
            id="cms-video-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm font-mono text-text-primary"
          />
        </div>

        {(ytId || tkId) && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
            {ytId ? (
              <img
                src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
                alt="Video Thumbnail"
                className="w-24 h-14 rounded-lg object-cover shrink-0 border border-white/10"
              />
            ) : (
              <div className="w-24 h-14 rounded-lg bg-[#0B0F14] border border-white/10 flex items-center justify-center shrink-0">
                <VideoIcon className="w-5 h-5 text-accent-cyan" />
              </div>
            )}
            <div className="text-xs font-mono">
              <span className="text-accent-cyan font-semibold uppercase block">
                {ytId ? 'YouTube Rilevato' : 'TikTok Rilevato'}
              </span>
              <span className="text-text-muted">ID: {ytId || tkId}</span>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading font-medium text-text-secondary cursor-pointer"
          >
            {isIt ? 'Annulla' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving || !isValidVideoUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer disabled:opacity-45 shadow-glow-cyan"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isIt ? 'Aggiungi Video' : 'Add Video'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ============================================================================
// 5. SCHEMATIC MODAL (.litematic Upload + Auto 3D Parsing + Optional Image)
// ============================================================================
interface SchematicFormModalProps {
  isOpen: boolean;
  initialSchematic?: ManagedSchematicItem | null;
  onClose: () => void;
  onSave: (item: ManagedSchematicItem) => Promise<void>;
}

const SCHEMATIC_CATEGORIES = [
  'Storage Tech',
  'Perimeter Tech',
  'Redstone Tech',
  'Mob Farms',
  'Slimestone',
  'Infrastructure',
];

export const SchematicFormModal: React.FC<SchematicFormModalProps> = ({
  isOpen,
  initialSchematic,
  onClose,
  onSave,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [name, setName] = useState('');
  const [author, setAuthor] = useState('Fermium SMP');
  const [origin, setOrigin] = useState<'fermium' | 'external'>('fermium');
  const [category, setCategory] = useState('Redstone Tech');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [blocks, setBlocks] = useState<number>(0);
  const [size, setSize] = useState('');
  const [image, setImage] = useState('');

  const [parsingFile, setParsingFile] = useState(false);
  const [compressingImg, setCompressingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialSchematic?.name || '');
    setAuthor(initialSchematic?.author || 'Fermium SMP');
    setOrigin(initialSchematic?.origin === 'external' ? 'external' : 'fermium');
    setCategory(initialSchematic?.category || 'Redstone Tech');
    setDescription(initialSchematic?.description || '');
    setFileName(initialSchematic?.fileName || '');
    setFileUrl(initialSchematic?.fileUrl || initialSchematic?.url || '');
    setDimensions(initialSchematic?.dimensions || '');
    setBlocks(initialSchematic?.blocks || 0);
    setSize(initialSchematic?.size || '');
    setImage(initialSchematic?.image || initialSchematic?.imageUrl || '');
    setError(null);
  }, [isOpen, initialSchematic]);

  const handleLitematicUpload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setParsingFile(true);
    try {
      const parsed = await readLitematicFile(file);
      setFileUrl(parsed.dataUrl);
      setFileName(file.name);
      setDimensions(parsed.dimensions);
      setBlocks(parsed.blocks);
      setSize(parsed.sizeLabel);
      if (!name.trim()) setName(parsed.suggestedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsingFile(false);
    }
  };

  const handleExtraPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setCompressingImg(true);
    try {
      const res = await compressImageToWebP(file, 1400, 260_000);
      setImage(res.dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCompressingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !fileUrl.trim()) {
      setError(
        isIt
          ? 'Carica un file .litematic e inserisci il nome della schematic.'
          : 'Upload a .litematic file and enter a schematic name.'
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: initialSchematic?.id || '',
        name: name.trim(),
        author: author.trim() || 'Fermium SMP',
        origin,
        category: category.trim() || 'Redstone Tech',
        description: description.trim(),
        dimensions,
        blocks,
        size,
        format: '.litematic',
        fileName: fileName || `${name.trim()}.litematic`,
        fileUrl,
        image,
        images: initialSchematic?.images || [],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title={
        initialSchematic
          ? isIt
            ? `Modifica Schematic: ${initialSchematic.name}`
            : `Edit Schematic: ${initialSchematic.name}`
          : isIt
            ? 'Carica Nuova Schematic (.litematic)'
            : 'Upload New Schematic (.litematic)'
      }
      subtitle={
        isIt
          ? 'Il sito legge automaticamente dimensioni, numero di blocchi e genera l’anteprima isometrica 3D.'
          : 'Dimensions, block count, and 3D isometric previews are generated automatically.'
      }
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Upload .litematic box */}
        <label className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-accent-cyan/40 bg-accent-cyan/[0.04] hover:bg-accent-cyan/[0.08] transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
              {parsingFile ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Box className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-heading font-semibold text-text-primary">
                {fileName || (isIt ? 'Seleziona file .litematic (max ~680 KB)' : 'Select .litematic file (max ~680 KB)')}
              </div>
              <div className="text-[11px] font-mono text-text-secondary">
                {dimensions
                  ? `${dimensions} · ${blocks.toLocaleString('it-IT')} blocchi · ${size}`
                  : isIt
                    ? 'Parsing NBT automatico + vista 3D'
                    : 'Automatic NBT parse + 3D isometric view'}
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-accent-cyan text-[#061018] text-xs font-mono font-semibold shrink-0">
            {isIt ? 'Sfoglia .litematic' : 'Browse .litematic'}
          </span>
          <input
            type="file"
            accept=".litematic"
            className="sr-only"
            onChange={(e) => handleLitematicUpload(e.target.files?.[0])}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="cms-schem-name"
              className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
            >
              {isIt ? 'Nome Schematic *' : 'Schematic Name *'}
            </label>
            <input
              id="cms-schem-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Main Storage Array"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary"
            />
          </div>

          <div>
            <label
              htmlFor="cms-schem-author"
              className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
            >
              {isIt ? 'Autore' : 'Author'}
            </label>
            <input
              id="cms-schem-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Es. Fermium SMP"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5">
              {isIt ? 'Origine' : 'Origin'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrigin('fermium')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold cursor-pointer ${
                  origin === 'fermium'
                    ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan'
                    : 'bg-white/[0.03] border-white/10 text-text-secondary'
                }`}
              >
                Fermium SMP
              </button>
              <button
                type="button"
                onClick={() => setOrigin('external')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold cursor-pointer ${
                  origin === 'external'
                    ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan'
                    : 'bg-white/[0.03] border-white/10 text-text-secondary'
                }`}
              >
                {isIt ? 'Esterna' : 'External'}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="cms-schem-cat"
              className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
            >
              {isIt ? 'Categoria' : 'Category'}
            </label>
            <input
              id="cms-schem-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary mb-1.5"
            />
            <div className="flex flex-wrap gap-1">
              {SCHEMATIC_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-accent-cyan/15 border border-white/10 text-[10px] font-mono text-text-secondary hover:text-accent-cyan cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="cms-schem-desc"
            className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5"
          >
            {isIt ? 'Descrizione' : 'Description'}
          </label>
          <textarea
            id="cms-schem-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isIt ? 'Dettagli tecnici della costruzione...' : 'Technical notes...'}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm text-text-primary resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="text-xs text-text-secondary">
            {image
              ? isIt
                ? 'Foto extra allegata (verrà mostrata oltre al render 3D)'
                : 'Extra screenshot attached'
              : isIt
                ? 'Foto extra facoltativa (altrimenti usa il render 3D automatico)'
                : 'Optional extra screenshot'}
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-mono text-accent-cyan cursor-pointer shrink-0">
            {compressingImg ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            <span>{isIt ? 'Allega Foto' : 'Attach Photo'}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleExtraPhoto(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading font-medium text-text-secondary cursor-pointer"
          >
            {isIt ? 'Annulla' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving || parsingFile || compressingImg || !fileUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer disabled:opacity-45 shadow-glow-cyan"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isIt ? 'Salva Schematic' : 'Save Schematic'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
