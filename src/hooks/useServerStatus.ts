import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices } from '../config/firebase';
import type { LiveServerStatus } from '../types';

export const SERVER_STATUS_STALE_MS = 90_000;

export interface UseServerStatusResult {
  status: LiveServerStatus | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  isEffectivelyOnline: boolean;
  ageSeconds: number | null;
  publishStatus: (payload: LiveServerStatus) => Promise<void>;
}

export function useServerStatus(): UseServerStatusResult {
  const [status, setStatus] = useState<LiveServerStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) {
      setLoading(false);
      setError('Firebase non configurato.');
      return;
    }

    const ref = doc(services.db, 'server_status', 'live');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setError(null);
        setLoading(false);
        if (!snap.exists()) {
          setStatus(null);
          return;
        }
        const raw = snap.data() as Partial<LiveServerStatus>;
        if (typeof raw.updatedAtMs !== 'number') {
          setStatus(null);
          return;
        }
        setStatus({
          online: Boolean(raw.online),
          tps: typeof raw.tps === 'number' ? raw.tps : 0,
          mspt: typeof raw.mspt === 'number' ? raw.mspt : 0,
          msptMin: typeof raw.msptMin === 'number' ? raw.msptMin : undefined,
          msptMax: typeof raw.msptMax === 'number' ? raw.msptMax : undefined,
          playersOnline: typeof raw.playersOnline === 'number' ? raw.playersOnline : 0,
          botsOnline: typeof raw.botsOnline === 'number' ? raw.botsOnline : undefined,
          maxPlayers: typeof raw.maxPlayers === 'number' ? raw.maxPlayers : 20,
          players: Array.isArray(raw.players) ? raw.players : [],
          version: typeof raw.version === 'string' ? raw.version : undefined,
          motd: typeof raw.motd === 'string' ? raw.motd : undefined,
          uptimeSeconds: typeof raw.uptimeSeconds === 'number' ? raw.uptimeSeconds : undefined,
          memoryUsedMb: typeof raw.memoryUsedMb === 'number' ? raw.memoryUsedMb : undefined,
          memoryMaxMb: typeof raw.memoryMaxMb === 'number' ? raw.memoryMaxMb : undefined,
          history: Array.isArray(raw.history) ? raw.history : [],
          updatedAtMs: raw.updatedAtMs,
        });
      },
      (err) => {
        setLoading(false);
        const code = (err as { code?: string })?.code;
        if (code === 'permission-denied') {
          // Regole server_status/live non ancora pubblicate su Firebase Console: mostra stato attesa pulito
          setError(null);
          setStatus(null);
          return;
        }
        setError(err.message || 'Impossibile leggere lo stato da Firestore.');
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const ageSeconds = status?.updatedAtMs
    ? Math.max(0, Math.floor((nowMs - status.updatedAtMs) / 1000))
    : null;
  const isStale = !status?.updatedAtMs || nowMs - status.updatedAtMs > SERVER_STATUS_STALE_MS;
  const isEffectivelyOnline = Boolean(status?.online && !isStale);

  const publishStatus = useCallback(async (payload: LiveServerStatus) => {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase non configurato.');
    }
    const clean: Record<string, unknown> = {
      online: Boolean(payload.online),
      tps: Number(payload.tps),
      mspt: Number(payload.mspt),
      playersOnline: Math.max(0, Math.round(payload.playersOnline)),
      maxPlayers: Math.max(0, Math.round(payload.maxPlayers)),
      updatedAtMs: Number(payload.updatedAtMs || Date.now()),
      updatedAt: serverTimestamp(),
    };
    if (typeof payload.msptMin === 'number') clean.msptMin = payload.msptMin;
    if (typeof payload.msptMax === 'number') clean.msptMax = payload.msptMax;
    if (typeof payload.botsOnline === 'number') {
      clean.botsOnline = Math.max(0, Math.round(payload.botsOnline));
    }
    if (Array.isArray(payload.players)) clean.players = payload.players.slice(0, 60);
    if (typeof payload.version === 'string') clean.version = payload.version.slice(0, 80);
    if (typeof payload.motd === 'string') clean.motd = payload.motd.slice(0, 200);
    if (typeof payload.uptimeSeconds === 'number') {
      clean.uptimeSeconds = Math.max(0, Math.round(payload.uptimeSeconds));
    }
    if (typeof payload.memoryUsedMb === 'number') clean.memoryUsedMb = payload.memoryUsedMb;
    if (typeof payload.memoryMaxMb === 'number') clean.memoryMaxMb = payload.memoryMaxMb;
    if (Array.isArray(payload.history)) clean.history = payload.history.slice(-60);

    await setDoc(doc(services.db, 'server_status', 'live'), clean);
  }, []);

  return {
    status,
    loading,
    error,
    isStale,
    isEffectivelyOnline,
    ageSeconds,
    publishStatus,
  };
}
