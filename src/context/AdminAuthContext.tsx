import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import {
  getAllowedAdminEmails,
  getFirebaseServices,
  isAllowedAdminEmail,
  isFirebaseConfigured,
  saveRuntimeAdminEmails,
} from '../config/firebase';
import { useLanguage } from '../i18n/LanguageContext';

export const ADMIN_STORAGE_KEY = 'fermium_staff_admin_v1';

export interface StoredAdminSession {
  isAdmin: true;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  verifiedAt: number;
}

interface AdminAuthContextType {
  isAdmin: boolean;
  firebaseVerified: boolean;
  firebaseConfigured: boolean;
  adminUser: StoredAdminSession | null;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutAdmin: () => Promise<void>;
  clearAuthError: () => void;
  refreshFirebaseBinding: () => void;
  syncAllowedEmailsToFirestore: (emails: string[]) => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function readStoredAdminSession(): StoredAdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>;
    if (
      parsed &&
      parsed.isAdmin === true &&
      typeof parsed.email === 'string' &&
      parsed.email.includes('@') &&
      typeof parsed.uid === 'string' &&
      parsed.uid.length > 0 &&
      isAllowedAdminEmail(parsed.email)
    ) {
      return {
        isAdmin: true,
        uid: parsed.uid,
        email: parsed.email.toLowerCase(),
        displayName: parsed.displayName || parsed.email,
        photoURL: parsed.photoURL || '',
        verifiedAt: typeof parsed.verifiedAt === 'number' ? parsed.verifiedAt : Date.now(),
      };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeStoredAdminSession(session: StoredAdminSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function toStoredSession(user: User): StoredAdminSession {
  return {
    isAdmin: true,
    uid: user.uid,
    email: (user.email || '').toLowerCase(),
    displayName: user.displayName || user.email || 'Fermium Admin',
    photoURL: user.photoURL || '',
    verifiedAt: Date.now(),
  };
}

async function verifyAdminWithFirestore(db: Firestore, user: User): Promise<boolean> {
  if (!user.email || user.emailVerified === false) return false;
  const email = user.email.trim().toLowerCase();
  try {
    const snap = await getDoc(doc(db, 'cms_meta', 'admins'));
    const docEmails =
      snap.exists() && Array.isArray(snap.data()?.emails)
        ? (snap.data().emails as unknown[]).filter(
            (v): v is string => typeof v === 'string' && v.includes('@')
          )
        : [];
    saveRuntimeAdminEmails([...getAllowedAdminEmails(), ...docEmails, email]);
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'permission-denied') {
      return false;
    }
    return isAllowedAdminEmail(email);
  }
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  // Caricamento sincrono da localStorage -> sblocco UI a 0ms senza aspettare Firebase!
  const initialSession = readStoredAdminSession();
  const [adminUser, setAdminUser] = useState<StoredAdminSession | null>(initialSession);
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(initialSession));
  const [firebaseVerified, setFirebaseVerified] = useState<boolean>(false);
  const [firebaseConfigured, setFirebaseConfigured] = useState<boolean>(() =>
    isFirebaseConfigured()
  );
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bindingTick, setBindingTick] = useState<number>(0);

  const refreshFirebaseBinding = useCallback(() => {
    setFirebaseConfigured(isFirebaseConfigured());
    setBindingTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const services = getFirebaseServices();
    setFirebaseConfigured(Boolean(services));

    if (!services) {
      setFirebaseVerified(false);
      return;
    }

    const { auth, db } = services;
    let active = true;

    // Gestisce eventuale rientro da signInWithRedirect su browser mobili / popup bloccati
    getRedirectResult(auth)
      .then(async (res) => {
        if (!active || !res?.user) return;
        const allowed = await verifyAdminWithFirestore(db, res.user);
        if (!active) return;
        if (!allowed) {
          await signOut(auth);
          writeStoredAdminSession(null);
          setAdminUser(null);
          setIsAdmin(false);
          setFirebaseVerified(false);
          setAuthError(
            isIt
              ? `Account non autorizzato (${res.user.email || 'sconosciuto'}). Accedi solo con l'account Google di Fermium.`
              : `Unauthorized account (${res.user.email || 'unknown'}). Use the Fermium Google account only.`
          );
        }
      })
      .catch(() => {
        // Ignora se non c'è alcun redirect pendente
      });

    let unsubscribe = () => {};

    (async () => {
      try {
        await auth.authStateReady();
      } catch {
        // fallback al listener standard
      }
      if (!active) return;

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;

        if (user) {
          const allowed = await verifyAdminWithFirestore(db, user);
          if (!active) return;
          if (allowed) {
            const session = toStoredSession(user);
            writeStoredAdminSession(session);
            setAdminUser(session);
            setIsAdmin(true);
            setFirebaseVerified(true);
            setAuthError(null);
          } else {
            await signOut(auth).catch(() => {});
            writeStoredAdminSession(null);
            setAdminUser(null);
            setIsAdmin(false);
            setFirebaseVerified(false);
            setAuthError(
              isIt
                ? `L'account ${user.email || ''} non è autorizzato su Firebase (cms_meta/admins).`
                : `Account ${user.email || ''} is not authorized in Firebase (cms_meta/admins).`
            );
          }
        } else {
          // Quando Firebase conferma che non c'è sessione attiva, rimuove eventuale cache stantia
          writeStoredAdminSession(null);
          setAdminUser(null);
          setIsAdmin(false);
          setFirebaseVerified(false);
        }
      });
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [bindingTick, isIt]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const services = getFirebaseServices();
    if (!services) {
      setAuthError(
        isIt
          ? 'Firebase non è ancora configurato nel sito.'
          : 'Firebase is not configured in the site yet.'
      );
      return;
    }

    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(services.auth, provider);
      const user = result.user;

      const allowed = await verifyAdminWithFirestore(services.db, user);
      if (!allowed) {
        await signOut(services.auth).catch(() => {});
        writeStoredAdminSession(null);
        setAdminUser(null);
        setIsAdmin(false);
        setFirebaseVerified(false);
        setAuthError(
          isIt
            ? `Accesso negato: ${user.email || 'questo account'} non è autorizzato a modificare Fermium SMP.`
            : `Access denied: ${user.email || 'this account'} is not authorized.`
        );
        return;
      }

      const session = toStoredSession(user);
      writeStoredAdminSession(session);
      setAdminUser(session);
      setIsAdmin(true);
      setFirebaseVerified(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-blocked') {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(services.auth, provider);
          return;
        } catch {
          // continua al messaggio errore
        }
      }

      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'manolo006.github.io';
        setAuthError(
          isIt
            ? `Dominio "${host}" non autorizzato su Firebase. Vai su Firebase Console → Authentication → Settings → Authorized domains e aggiungi "${host}".`
            : `Domain "${host}" is not authorized in Firebase Auth settings.`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError(
          isIt
            ? 'Popup chiuso prima di completare l’accesso Google.'
            : 'Sign-in popup was closed before completing login.'
        );
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setAuthError(message);
      }
    } finally {
      setAuthLoading(false);
    }
  }, [isIt]);

  const signOutAdmin = useCallback(async () => {
    setAuthError(null);
    const services = getFirebaseServices();
    if (services) {
      await signOut(services.auth).catch(() => {});
    }
    writeStoredAdminSession(null);
    setAdminUser(null);
    setIsAdmin(false);
    setFirebaseVerified(false);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const syncAllowedEmailsToFirestore = useCallback(
    async (emails: string[]) => {
      const services = getFirebaseServices();
      if (!services || !services.auth.currentUser) {
        throw new Error(
          isIt
            ? 'Devi aver effettuato l’accesso con l’account Owner principale per sincronizzare su Firestore.'
            : 'You must be signed in as the bootstrap Owner to sync emails to Firestore.'
        );
      }
      const normalized = Array.from(
        new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@')))
      );
      await setDoc(doc(services.db, 'cms_meta', 'admins'), {
        emails: normalized,
        updatedAt: serverTimestamp(),
      });
    },
    [isIt]
  );

  return (
    <AdminAuthContext.Provider
      value={{
        isAdmin,
        firebaseVerified,
        firebaseConfigured,
        adminUser,
        authLoading,
        authError,
        signInWithGoogle,
        signOutAdmin,
        clearAuthError,
        refreshFirebaseBinding,
        syncAllowedEmailsToFirestore,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
};
