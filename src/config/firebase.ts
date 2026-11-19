import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

export const RUNTIME_CONFIG_STORAGE_KEY = 'fermium_firebase_runtime_config_v1';
export const ADMIN_EMAILS_STORAGE_KEY = 'fermium_admin_emails_v1';

/**
 * Configurazione Firebase Web opzionale precompilata.
 * Puoi inserire qui i valori pubblici della tua Web App Firebase oppure incollarli
 * direttamente dal portale nascosto #/staff senza toccare il codice.
 */
export const FIREBASE_WEB_CONFIG: FirebaseWebConfig = {
  apiKey: 'AIzaSyD7oC6mepLUMAjKUHrYeuW7iwcWL9bO8vU',
  authDomain: 'fermiumsmp.firebaseapp.com',
  projectId: 'fermiumsmp',
  storageBucket: 'fermiumsmp.firebasestorage.app',
  messagingSenderId: '1064523970006',
  appId: '1:1064523970006:web:db6d9b600178f93c232077',
};

const BASE_ADMIN_EMAILS = ['manuelcarpita@gmail.com'];

function normalizeEmailList(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const item of raw) {
    const clean = item.trim().toLowerCase();
    if (clean && clean.includes('@')) {
      seen.add(clean);
    }
  }
  return Array.from(seen);
}

function getEnvAdminEmails(): string[] {
  const envVal = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) || '';
  return envVal ? envVal.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
}

export const ALLOWED_ADMIN_EMAILS: string[] = normalizeEmailList([
  ...BASE_ADMIN_EMAILS,
  ...getEnvAdminEmails(),
]);

export function getRuntimeAdminEmails(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ADMIN_EMAILS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? normalizeEmailList(parsed.filter((v): v is string => typeof v === 'string'))
      : [];
  } catch {
    return [];
  }
}

export function saveRuntimeAdminEmails(emails: string[]): string[] {
  const normalized = normalizeEmailList(emails);
  if (typeof window !== 'undefined') {
    try {
      if (normalized.length > 0) {
        window.localStorage.setItem(ADMIN_EMAILS_STORAGE_KEY, JSON.stringify(normalized));
      } else {
        window.localStorage.removeItem(ADMIN_EMAILS_STORAGE_KEY);
      }
    } catch {
      // ignore storage failure
    }
  }
  return normalized;
}

export function getAllowedAdminEmails(): string[] {
  return normalizeEmailList([...ALLOWED_ADMIN_EMAILS, ...getRuntimeAdminEmails()]);
}

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return getAllowedAdminEmails().includes(clean);
}

function isValidConfig(cfg: Partial<FirebaseWebConfig> | null | undefined): cfg is FirebaseWebConfig {
  return Boolean(
    cfg &&
      typeof cfg.apiKey === 'string' &&
      cfg.apiKey.trim().length > 5 &&
      typeof cfg.authDomain === 'string' &&
      cfg.authDomain.trim().length > 3 &&
      typeof cfg.projectId === 'string' &&
      cfg.projectId.trim().length > 1 &&
      typeof cfg.appId === 'string' &&
      cfg.appId.trim().length > 5
  );
}

function sanitizeConfig(cfg: Partial<FirebaseWebConfig>): FirebaseWebConfig {
  return {
    apiKey: String(cfg.apiKey || '').trim(),
    authDomain: String(cfg.authDomain || '').trim(),
    projectId: String(cfg.projectId || '').trim(),
    storageBucket: String(cfg.storageBucket || '').trim(),
    messagingSenderId: String(cfg.messagingSenderId || '').trim(),
    appId: String(cfg.appId || '').trim(),
  };
}

function getEnvFirebaseConfig(): FirebaseWebConfig | null {
  const candidate: Partial<FirebaseWebConfig> = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
  return isValidConfig(candidate) ? sanitizeConfig(candidate) : null;
}

export function getRuntimeFirebaseConfig(): FirebaseWebConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirebaseWebConfig>;
    return isValidConfig(parsed) ? sanitizeConfig(parsed) : null;
  } catch {
    return null;
  }
}

export function getActiveFirebaseConfig(): FirebaseWebConfig | null {
  const runtime = getRuntimeFirebaseConfig();
  if (runtime) return runtime;
  const envCfg = getEnvFirebaseConfig();
  if (envCfg) return envCfg;
  return isValidConfig(FIREBASE_WEB_CONFIG) ? sanitizeConfig(FIREBASE_WEB_CONFIG) : null;
}

export function isFirebaseConfigured(): boolean {
  return getActiveFirebaseConfig() !== null;
}

let cachedServices: FirebaseServices | null = null;
let cachedConfigKey = '';

export function resetFirebaseServices(): void {
  cachedServices = null;
  cachedConfigKey = '';
  const existing = getApps();
  for (const app of existing) {
    deleteApp(app).catch(() => {});
  }
}

export function saveRuntimeFirebaseConfig(cfg: Partial<FirebaseWebConfig>): FirebaseWebConfig {
  const clean = sanitizeConfig(cfg);
  if (!isValidConfig(clean)) {
    throw new Error('Configurazione Firebase incompleta: verifica apiKey, authDomain, projectId e appId.');
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(clean));
  }
  resetFirebaseServices();
  return clean;
}

export function clearRuntimeFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
  }
  resetFirebaseServices();
}

/**
 * Estrae una FirebaseWebConfig sia da JSON valido sia dallo snippet JS copiato
 * dalla Console Firebase (`const firebaseConfig = { apiKey: "...", ... };`).
 */
export function parseFirebaseConfigInput(rawInput: string): FirebaseWebConfig {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Incolla la configurazione JSON o lo snippet JS di Firebase.');
  }

  // Tentativo 1: JSON diretto
  try {
    const direct = JSON.parse(trimmed) as Partial<FirebaseWebConfig>;
    if (isValidConfig(direct)) return sanitizeConfig(direct);
  } catch {
    // passa al parser flessibile per snippet JS
  }

  // Tentativo 2: estrazione oggetto { ... } da snippet JS
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const body = trimmed.slice(braceStart, braceEnd + 1);
    const extractField = (key: keyof FirebaseWebConfig): string => {
      const rx = new RegExp(`["']?${key}["']?\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'i');
      const m = body.match(rx);
      return m ? m[1].trim() : '';
    };
    const extracted: FirebaseWebConfig = {
      apiKey: extractField('apiKey'),
      authDomain: extractField('authDomain'),
      projectId: extractField('projectId'),
      storageBucket: extractField('storageBucket'),
      messagingSenderId: extractField('messagingSenderId'),
      appId: extractField('appId'),
    };
    if (isValidConfig(extracted)) return extracted;
  }

  throw new Error('Formato configurazione non riconosciuto: assicurati che siano presenti apiKey, authDomain, projectId e appId.');
}

export function getFirebaseServices(): FirebaseServices | null {
  const cfg = getActiveFirebaseConfig();
  if (!cfg) return null;

  const key = `${cfg.projectId}:${cfg.appId}:${cfg.apiKey}`;
  if (cachedServices && cachedConfigKey === key) {
    return cachedServices;
  }

  try {
    const existing = getApps()[0];
    const app = existing ?? initializeApp(cfg);
    const auth = getAuth(app);
    const db = getFirestore(app);
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    cachedServices = { app, auth, db };
    cachedConfigKey = key;
    return cachedServices;
  } catch (err) {
    console.warn('Firebase initialization failed:', err);
    return null;
  }
}
