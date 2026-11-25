import type { MemberStats } from '../types';

export const defaultMemberStats: MemberStats[] = [
  {
    name: 'jenktland3',
    playTimeHours: 342.4,
    blocksMined: 2845120,
    blocksPlaced: 618400,
    deaths: 12,
    mobKills: 48210,
    distanceKm: 1940.5,
    carpetScore: 3463520,
    topBlocks: [
      { id: 'deepslate', label: 'Deepslate', count: 1420300 },
      { id: 'stone', label: 'Stone', count: 690450 },
      { id: 'netherrack', label: 'Netherrack', count: 412800 },
    ],
  },
  {
    name: 'REDpl4yers',
    playTimeHours: 318.8,
    blocksMined: 2610940,
    blocksPlaced: 594120,
    deaths: 9,
    mobKills: 53420,
    distanceKm: 1812.3,
    carpetScore: 3205060,
    topBlocks: [
      { id: 'deepslate', label: 'Deepslate', count: 1185200 },
      { id: 'netherrack', label: 'Netherrack', count: 642100 },
      { id: 'stone', label: 'Stone', count: 489300 },
    ],
  },
  {
    name: 'poncher',
    playTimeHours: 274.2,
    blocksMined: 1942800,
    blocksPlaced: 488210,
    deaths: 15,
    mobKills: 31900,
    distanceKm: 1428.0,
    carpetScore: 2431010,
    topBlocks: [
      { id: 'stone', label: 'Stone', count: 812400 },
      { id: 'deepslate', label: 'Deepslate', count: 694100 },
      { id: 'obsidian', label: 'Obsidian', count: 124600 },
    ],
  },
  {
    name: 'drp1n',
    playTimeHours: 296.5,
    blocksMined: 2480350,
    blocksPlaced: 512900,
    deaths: 11,
    mobKills: 39450,
    distanceKm: 1684.7,
    carpetScore: 2993250,
    topBlocks: [
      { id: 'deepslate', label: 'Deepslate', count: 1290400 },
      { id: 'stone', label: 'Stone', count: 615800 },
      { id: 'end_stone', label: 'End Stone', count: 294500 },
    ],
  },
  {
    name: 'supercece_',
    playTimeHours: 251.0,
    blocksMined: 1765420,
    blocksPlaced: 441600,
    deaths: 18,
    mobKills: 28140,
    distanceKm: 1310.4,
    carpetScore: 2207020,
    topBlocks: [
      { id: 'stone', label: 'Stone', count: 745900 },
      { id: 'deepslate', label: 'Deepslate', count: 589300 },
      { id: 'tuff', label: 'Tuff', count: 218400 },
    ],
  },
  {
    name: 'ohluck_',
    playTimeHours: 229.6,
    blocksMined: 1628900,
    blocksPlaced: 392450,
    deaths: 14,
    mobKills: 34820,
    distanceKm: 1195.8,
    carpetScore: 2021350,
    topBlocks: [
      { id: 'deepslate', label: 'Deepslate', count: 792300 },
      { id: 'netherrack', label: 'Netherrack', count: 418900 },
      { id: 'stone', label: 'Stone', count: 284100 },
    ],
  },
  {
    name: 'lollo235_',
    playTimeHours: 204.3,
    blocksMined: 1384200,
    blocksPlaced: 356800,
    deaths: 16,
    mobKills: 24910,
    distanceKm: 1086.2,
    carpetScore: 1741000,
    topBlocks: [
      { id: 'stone', label: 'Stone', count: 614200 },
      { id: 'deepslate', label: 'Deepslate', count: 442800 },
      { id: 'sand', label: 'Sand', count: 168500 },
    ],
  },
  {
    name: 'Manolo006',
    playTimeHours: 186.7,
    blocksMined: 1294600,
    blocksPlaced: 378900,
    deaths: 10,
    mobKills: 22480,
    distanceKm: 1024.9,
    carpetScore: 1673500,
    topBlocks: [
      { id: 'deepslate', label: 'Deepslate', count: 598400 },
      { id: 'stone', label: 'Stone', count: 412600 },
      { id: 'white_concrete', label: 'Concrete', count: 145200 },
    ],
  },
];

export function buildFallbackStatsForName(name: string): MemberStats {
  return {
    name,
    playTimeHours: 120.0,
    blocksMined: 750000,
    blocksPlaced: 210000,
    deaths: 8,
    mobKills: 15000,
    distanceKm: 640.0,
    carpetScore: 960000,
    topBlocks: [
      { id: 'deepslate', label: 'Deepslate', count: 340000 },
      { id: 'stone', label: 'Stone', count: 250000 },
      { id: 'netherrack', label: 'Netherrack', count: 160000 },
    ],
  };
}

export interface MemberOverallRanking {
  overallScore: number;
  overallSharePct: number;
  rank: number;
}

export interface OverallRankingsResult {
  byMemberId: Map<string, MemberOverallRanking>;
  maxOverallScore: number;
  maxCarpetScore: number;
  maxBlocksMined: number;
}

export const OVERALL_SCORE_WEIGHTS = {
  blocksMined: 0.24,
  playTimeHours: 0.24,
  blocksPlaced: 0.2,
  distanceKm: 0.12,
  mobKills: 0.12,
  survival: 0.08,
} as const;

function nonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function sqrtNorm(value: number, maxValue: number): number {
  return maxValue > 0 && value > 0 ? Math.sqrt(value / maxValue) : 0;
}

/**
 * Computes a weighted overall leaderboard across all 6 member metrics using
 * square-root normalization so single-stat outliers do not flatten other rankings.
 */
export function computeMemberOverallRankings(
  entries: Array<{ id: string; stats: MemberStats }>
): OverallRankingsResult {
  if (entries.length === 0) {
    return {
      byMemberId: new Map(),
      maxOverallScore: 1,
      maxCarpetScore: 1,
      maxBlocksMined: 1,
    };
  }

  let maxMined = 0;
  let maxPlaced = 0;
  let maxHours = 0;
  let maxDistance = 0;
  let maxMobKills = 0;
  let maxSurvival = 0;
  let maxCarpetScore = 1;
  let maxBlocksMined = 1;

  const prepared = entries.map(({ id, stats }) => {
    const blocksMined = nonNegative(stats.blocksMined);
    const blocksPlaced = nonNegative(stats.blocksPlaced);
    const playTimeHours = nonNegative(stats.playTimeHours);
    const distanceKm = nonNegative(stats.distanceKm);
    const mobKills = nonNegative(stats.mobKills);
    const deaths = nonNegative(stats.deaths);
    const carpetScore = nonNegative(stats.carpetScore);
    const survival = playTimeHours / (deaths + 1);

    if (blocksMined > maxMined) maxMined = blocksMined;
    if (blocksPlaced > maxPlaced) maxPlaced = blocksPlaced;
    if (playTimeHours > maxHours) maxHours = playTimeHours;
    if (distanceKm > maxDistance) maxDistance = distanceKm;
    if (mobKills > maxMobKills) maxMobKills = mobKills;
    if (survival > maxSurvival) maxSurvival = survival;
    if (carpetScore > maxCarpetScore) maxCarpetScore = carpetScore;
    if (blocksMined > maxBlocksMined) maxBlocksMined = blocksMined;

    return {
      id,
      blocksMined,
      blocksPlaced,
      playTimeHours,
      distanceKm,
      mobKills,
      carpetScore,
      survival,
    };
  });

  const scored = prepared
    .map((item) => {
      const rawScore =
        OVERALL_SCORE_WEIGHTS.blocksMined * sqrtNorm(item.blocksMined, maxMined) +
        OVERALL_SCORE_WEIGHTS.playTimeHours * sqrtNorm(item.playTimeHours, maxHours) +
        OVERALL_SCORE_WEIGHTS.blocksPlaced * sqrtNorm(item.blocksPlaced, maxPlaced) +
        OVERALL_SCORE_WEIGHTS.distanceKm * sqrtNorm(item.distanceKm, maxDistance) +
        OVERALL_SCORE_WEIGHTS.mobKills * sqrtNorm(item.mobKills, maxMobKills) +
        OVERALL_SCORE_WEIGHTS.survival * sqrtNorm(item.survival, maxSurvival);

      return {
        ...item,
        rawScore,
        overallScore: Math.round(rawScore * 1000) / 10,
      };
    })
    .sort(
      (a, b) =>
        b.rawScore - a.rawScore ||
        b.carpetScore - a.carpetScore ||
        b.playTimeHours - a.playTimeHours ||
        b.blocksMined - a.blocksMined
    );

  const maxRaw = scored[0]?.rawScore ?? 0;
  const maxOverallScore = maxRaw > 0 ? Math.round(maxRaw * 1000) / 10 : 1;

  const byMemberId = new Map<string, MemberOverallRanking>();
  scored.forEach((entry, idx) => {
    const overallSharePct =
      maxRaw > 0 ? Math.min(100, Math.round((entry.rawScore / maxRaw) * 100)) : 0;
    byMemberId.set(entry.id, {
      overallScore: entry.overallScore,
      overallSharePct,
      rank: idx + 1,
    });
  });

  return {
    byMemberId,
    maxOverallScore,
    maxCarpetScore,
    maxBlocksMined,
  };
}
