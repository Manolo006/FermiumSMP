/**
 * Pure parser for Minecraft Java Edition player statistics (`world/stats/<uuid>.json`).
 * Keeps all parsing/formatting deterministic and dependency-free for CLI and tests.
 */

const EXCLUDED_USED_SUFFIXES = [
  '_pickaxe',
  '_shovel',
  '_axe',
  '_hoe',
  '_sword',
  '_helmet',
  '_chestplate',
  '_leggings',
  '_boots',
  '_bucket',
  '_boat',
  '_raft',
  '_minecart',
  '_spawn_egg',
  '_potion',
  '_stew',
  '_soup',
  '_bottle',
  '_book',
  '_map',
  '_dye',
  '_music_disc',
  '_smithing_template',
  '_sherd',
];

const EXCLUDED_USED_PREFIXES = ['cooked_', 'golden_'];

const EXCLUDED_USED_ITEMS = new Set([
  'firework_rocket',
  'ender_pearl',
  'shears',
  'flint_and_steel',
  'fishing_rod',
  'bow',
  'crossbow',
  'trident',
  'mace',
  'shield',
  'spyglass',
  'brush',
  'wind_charge',
  'snowball',
  'egg',
  'bone_meal',
  'lead',
  'name_tag',
  'totem_of_undying',
  'bread',
  'apple',
  'carrot',
  'potato',
  'baked_potato',
  'melon_slice',
  'sweet_berries',
  'glow_berries',
  'dried_kelp',
  'chorus_fruit',
  'rotten_flesh',
  'spider_eye',
  'pumpkin_pie',
  'compass',
  'recovery_compass',
  'clock',
  'goat_horn',
  'bundle',
  'ender_eye',
  'experience_bottle',
  'enchanted_golden_apple',
  'potion',
  'splash_potion',
  'lingering_potion',
  'honey_bottle',
  'cookie',
  'milk_bucket',
  'water_bucket',
  'lava_bucket',
  'writable_book',
  'written_book',
  'knowledge_book',
]);

/**
 * Strips hyphens/punctuation and lowercases a Minecraft UUID.
 * @param {string | undefined | null} uuid
 * @returns {string}
 */
export function normalizeUuid(uuid) {
  return String(uuid || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .toLowerCase();
}

/**
 * Carpet fake players / offline UUIDs use version 3 UUIDs (`xxxxxxxx-xxxx-3xxx-...`).
 * @param {string | undefined | null} uuid
 * @returns {boolean}
 */
export function isOfflineBotUuid(uuid) {
  const clean = normalizeUuid(uuid);
  return clean.length === 32 && clean[12] === '3';
}

/**
 * Parses Pterodactyl SFTP endpoints whether pasted as `sftp://host:2022` or plain hostname.
 * @param {string | undefined} rawHost
 * @param {string | number | undefined} rawPort
 * @returns {{ host: string; port: number }}
 */
export function parseSftpConnectionTarget(rawHost, rawPort = 2022) {
  const trimmedHost = String(rawHost || '').trim();
  if (!trimmedHost) {
    throw new Error('SFTP_HOST mancante.');
  }

  const parsedDefaultPort = Number(rawPort);
  const fallbackPort =
    Number.isInteger(parsedDefaultPort) && parsedDefaultPort > 0 && parsedDefaultPort <= 65535
      ? parsedDefaultPort
      : 2022;

  const hasScheme = /^[a-z]+:\/\//i.test(trimmedHost);
  const candidate = hasScheme ? trimmedHost : `sftp://${trimmedHost}`;
  try {
    const u = new URL(candidate);
    const portNum = u.port ? Number(u.port) : fallbackPort;
    return {
      host: u.hostname,
      port:
        Number.isInteger(portNum) && portNum > 0 && portNum <= 65535
          ? portNum
          : fallbackPort,
    };
  } catch {
    const cleaned = trimmedHost.replace(/^sftp:\/\//i, '').replace(/\/+$/, '');
    const parts = cleaned.split(':');
    const hostOnly = parts[0].trim();
    const inlinePort = parts[1] ? Number(parts[1]) : fallbackPort;
    return {
      host: hostOnly,
      port:
        Number.isInteger(inlinePort) && inlinePort > 0 && inlinePort <= 65535
          ? inlinePort
          : fallbackPort,
    };
  }
}

/**
 * Converts a Minecraft namespaced block ID (`minecraft:deepslate_bricks`) into a label (`Deepslate Bricks`).
 * @param {string} id
 * @returns {string}
 */
export function formatBlockLabel(id) {
  const clean = String(id || '').replace(/^minecraft:/i, '').trim();
  if (!clean) return 'Unknown';
  return clean
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function isExcludedUsedItem(rawId) {
  const id = String(rawId || '').replace(/^minecraft:/i, '').toLowerCase();
  if (!id) return true;
  if (EXCLUDED_USED_ITEMS.has(id)) return true;
  if (EXCLUDED_USED_PREFIXES.some((prefix) => id.startsWith(prefix))) return true;
  return EXCLUDED_USED_SUFFIXES.some((suffix) => id.endsWith(suffix));
}

function safeNonNegativeNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const MAX_TOP_ENTRIES = 10;

function sumAndCollectEntries(source, excludeNonBlockUsedItems = false) {
  let total = 0;
  const entries = [];
  if (!source || typeof source !== 'object') {
    return { total, entries };
  }
  for (const [key, rawCount] of Object.entries(source)) {
    if (excludeNonBlockUsedItems && isExcludedUsedItem(key)) continue;
    const count = Math.round(safeNonNegativeNumber(rawCount));
    if (count <= 0) continue;
    total += count;
    const id = String(key).replace(/^minecraft:/i, '').trim();
    if (id) {
      entries.push({
        id,
        label: formatBlockLabel(key),
        count,
      });
    }
  }
  return { total, entries };
}

function rankTopEntries(entries, maxItems = MAX_TOP_ENTRIES) {
  return [...entries]
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, maxItems);
}

/**
 * Extracts normalized MemberStats from a Minecraft `world/stats/<uuid>.json` object.
 * @param {{ name: string; uuid?: string; rawStats: any }} params
 */
export function parsePlayerStatsJson({ name, uuid, rawStats }) {
  const rootStats =
    rawStats && typeof rawStats === 'object' && rawStats.stats && typeof rawStats.stats === 'object'
      ? rawStats.stats
      : {};

  const custom =
    rootStats['minecraft:custom'] && typeof rootStats['minecraft:custom'] === 'object'
      ? rootStats['minecraft:custom']
      : {};
  const mined =
    rootStats['minecraft:mined'] && typeof rootStats['minecraft:mined'] === 'object'
      ? rootStats['minecraft:mined']
      : {};
  const used =
    rootStats['minecraft:used'] && typeof rootStats['minecraft:used'] === 'object'
      ? rootStats['minecraft:used']
      : {};
  const killed =
    rootStats['minecraft:killed'] && typeof rootStats['minecraft:killed'] === 'object'
      ? rootStats['minecraft:killed']
      : {};

  const playTimeTicks = safeNonNegativeNumber(
    custom['minecraft:play_time'] ?? custom['minecraft:play_one_minute'] ?? 0
  );
  const playTimeHours = Math.round((playTimeTicks / 20 / 3600) * 10) / 10;

  const { total: blocksMined, entries: minedEntries } = sumAndCollectEntries(mined, false);
  const { total: blocksPlaced, entries: placedEntries } = sumAndCollectEntries(used, true);
  const { entries: killedEntries } = sumAndCollectEntries(killed, false);

  const deaths = Math.round(safeNonNegativeNumber(custom['minecraft:deaths'] ?? 0));
  const mobKills = Math.round(safeNonNegativeNumber(custom['minecraft:mob_kills'] ?? 0));

  let distanceCm = 0;
  for (const [key, rawVal] of Object.entries(custom)) {
    if (key.endsWith('_one_cm')) {
      distanceCm += safeNonNegativeNumber(rawVal);
    }
  }
  const distanceKm = Math.round((distanceCm / 100000) * 10) / 10;

  const topBlocks = rankTopEntries(minedEntries);
  const topPlacedBlocks = rankTopEntries(placedEntries);
  const topKilledMobs = rankTopEntries(killedEntries);
  const cleanUuid = normalizeUuid(uuid);

  return {
    name: String(name || cleanUuid || 'Unknown').trim(),
    ...(cleanUuid.length === 32 ? { uuid: cleanUuid } : {}),
    playTimeHours,
    blocksMined,
    blocksPlaced,
    deaths,
    mobKills,
    distanceKm,
    carpetScore: blocksMined + blocksPlaced,
    topBlocks,
    topPlacedBlocks,
    topKilledMobs,
  };
}
