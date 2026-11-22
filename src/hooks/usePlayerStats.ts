import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '../config/firebase';
import { LIVE_STATS_JSON_URL } from '../config/links';
import { defaultMemberStats } from '../data/memberStats';
import type { MemberStatTopBlock, MemberStats } from '../types';

function toFiniteNumber(val: unknown, fallback = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeMemberStatsEntry(raw: unknown): MemberStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name.trim()) return null;

  const rawTop = Array.isArray(obj.topBlocks) ? obj.topBlocks : [];
  const topBlocks: MemberStatTopBlock[] = [];
  for (const item of rawTop.slice(0, 3)) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    if (typeof b.id !== 'string' || !b.id.trim()) continue;
    topBlocks.push({
      id: b.id.trim(),
      label: typeof b.label === 'string' && b.label.trim() ? b.label.trim() : b.id.trim(),
      count: Math.round(toFiniteNumber(b.count)),
    });
  }

  return {
    name: obj.name.trim(),
    ...(typeof obj.uuid === 'string' && obj.uuid.trim() ? { uuid: obj.uuid.trim() } : {}),
    playTimeHours: toFiniteNumber(obj.playTimeHours),
    blocksMined: Math.round(toFiniteNumber(obj.blocksMined)),
    blocksPlaced: Math.round(toFiniteNumber(obj.blocksPlaced)),
    deaths: Math.round(toFiniteNumber(obj.deaths)),
    mobKills: Math.round(toFiniteNumber(obj.mobKills)),
    distanceKm: toFiniteNumber(obj.distanceKm),
    carpetScore: Math.round(toFiniteNumber(obj.carpetScore)),
    topBlocks,
  };
}

/**
 * Reads live player statistics synced to Firestore (`server_status/player_stats`)
 * and falls back silently to `LIVE_STATS_JSON_URL` / `./stats.json` until populated.
 */
export function usePlayerStats(): MemberStats[] {
  const [statsList, setStatsList] = useState<MemberStats[]>(defaultMemberStats);
  const firestoreActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    firestoreActiveRef.current = false;

    const services = getFirebaseServices();
    let unsubscribe = () => {};

    if (services) {
      const ref = doc(services.db, 'server_status', 'player_stats');
      unsubscribe = onSnapshot(
        ref,
        (snap) => {
          if (cancelled || !snap.exists()) return;
          const raw = snap.data() as { players?: unknown };
          if (!Array.isArray(raw.players)) return;
          const normalized = raw.players
            .map(normalizeMemberStatsEntry)
            .filter((item): item is MemberStats => item !== null);
          if (normalized.length > 0) {
            firestoreActiveRef.current = true;
            setStatsList(normalized);
          }
        },
        () => {
          // Permesso negato o rete assente: mantieni fallback silenzioso su stats.json
        }
      );
    }

    async function loadFallbackStats() {
      const bust = Date.now();
      const candidates = [
        `${LIVE_STATS_JSON_URL}?t=${bust}`,
        `./stats.json?t=${bust}`,
      ];
      for (const url of candidates) {
        if (cancelled || firestoreActiveRef.current) return;
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const data = await res.json();
          if (cancelled || firestoreActiveRef.current || !Array.isArray(data)) return;
          const normalized = data
            .map(normalizeMemberStatsEntry)
            .filter((item): item is MemberStats => item !== null);
          if (normalized.length > 0 && !firestoreActiveRef.current) {
            setStatsList(normalized);
            return;
          }
        } catch {
          // Passa alla sorgente fallback successiva
        }
      }
    }

    loadFallbackStats();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return statsList;
}
