import type { StatisticSlot } from '../types';

export const WORLD_START_DATE = '2026-10-14';

export function getWorldAgeDays(startIso: string = WORLD_START_DATE): number {
  const [year, month, day] = startIso.split('-').map(Number);
  const now = new Date();
  const startUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((todayUtc - startUtc) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export const serverStatistics: StatisticSlot[] = [
  {
    id: 'members',
    value: '9',
    isPlaceholder: false,
  },
  {
    id: 'projects',
    value: '—',
    isPlaceholder: true,
  },
  {
    id: 'farms',
    value: '—',
    isPlaceholder: true,
  },
  {
    id: 'worldAge',
    value: `${getWorldAgeDays()} gg`,
    isPlaceholder: false,
  },
];
