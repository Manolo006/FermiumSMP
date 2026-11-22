import type { StatisticSlot } from '../types';
import { membersList } from './members';
import { projectSlots } from './projects';

export const WORLD_START_DATE = '2026-10-12T22:30:00+01:00';

/**
 * Calcola i giorni del mondo scattando ogni sera alle 22:30,
 * calibrato in modo che il 12/11/2026 alle 22:30 segni esattamente 30 gg.
 */
export function getWorldAgeDays(): number {
  const anchor30DaysMs = new Date('2026-11-12T22:30:00+01:00').getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const startMs = anchor30DaysMs - 30 * dayMs;
  const diffDays = Math.floor((Date.now() - startMs) / dayMs);
  return Math.max(0, diffDays);
}

export const serverStatistics: StatisticSlot[] = [
  {
    id: 'members',
    value: String(membersList.length),
    isPlaceholder: false,
  },
  {
    id: 'projects',
    value: String(projectSlots.length),
    isPlaceholder: false,
  },
  {
    id: 'farms',
    value: String(projectSlots.filter((p) => p.category === 'farms').length),
    isPlaceholder: false,
  },
  {
    id: 'worldAge',
    value: `${getWorldAgeDays()} gg`,
    isPlaceholder: false,
  },
];
