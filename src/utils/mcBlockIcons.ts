export const MC_TEXTURES_BASE =
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.21.4/assets/minecraft/textures';

export const MC_TEXTURES_1215 =
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.21.5/assets/minecraft/textures';

const WOOD_TYPES = new Set([
  'oak',
  'spruce',
  'birch',
  'jungle',
  'acacia',
  'dark_oak',
  'mangrove',
  'cherry',
  'bamboo',
  'crimson',
  'warped',
  'pale_oak',
]);

const SHAPED_SUFFIXES = [
  '_slab',
  '_stairs',
  '_wall',
  '_fence_gate',
  '_fence',
  '_button',
  '_pressure_plate',
  '_hanging_sign',
  '_sign',
] as const;

/**
 * Verified texture overrides for vanilla blocks whose textures use face suffixes
 * (e.g. `piston_side`, `composter_side`) or item sprites rather than `<id>.png`.
 */
const BLOCK_TEXTURE_OVERRIDES: Record<string, readonly string[]> = {
  piston: ['block/piston_side', 'block/piston_top'],
  sticky_piston: ['block/piston_top_sticky', 'block/piston_side'],
  piston_head: ['block/piston_top'],
  moving_piston: ['block/piston_side'],
  observer: ['block/observer_front', 'block/observer_side'],
  dispenser: ['block/dispenser_front'],
  dropper: ['block/dropper_front'],
  hopper: ['item/hopper', 'block/hopper_outside'],
  crafter: ['block/crafter_top'],
  repeater: ['item/repeater'],
  comparator: ['item/comparator'],
  redstone_wire: ['item/redstone'],
  tnt: ['block/tnt_side'],
  scaffolding: ['block/scaffolding_side'],
  composter: ['block/composter_side'],
  barrel: ['block/barrel_side'],
  furnace: ['block/furnace_front'],
  blast_furnace: ['block/blast_furnace_front'],
  smoker: ['block/smoker_front'],
  crafting_table: ['block/crafting_table_front'],
  smithing_table: ['block/smithing_table_front'],
  cartography_table: ['block/cartography_table_side1'],
  fletching_table: ['block/fletching_table_front'],
  loom: ['block/loom_front'],
  lectern: ['block/lectern_front'],
  stonecutter: ['block/stonecutter_side'],
  grass_block: ['block/grass_block_side'],
  mycelium: ['block/mycelium_side'],
  podzol: ['block/podzol_side'],
  crimson_nylium: ['block/crimson_nylium_side'],
  warped_nylium: ['block/warped_nylium_side'],
  magma_block: ['block/magma'],
  snow_block: ['block/snow'],
  quartz_block: ['block/quartz_block_side'],
  smooth_quartz: ['block/quartz_block_bottom'],
  honey_block: ['block/honey_block_side'],
  dried_kelp_block: ['block/dried_kelp_side'],
  hay_block: ['block/hay_block_side'],
  bone_block: ['block/bone_block_side'],
  basalt: ['block/basalt_side'],
  polished_basalt: ['block/polished_basalt_side'],
  ancient_debris: ['block/ancient_debris_side'],
  cactus: ['block/cactus_side'],
  pumpkin: ['block/pumpkin_side'],
  melon: ['block/melon_side'],
  bamboo: ['block/bamboo_stalk'],
  chest: ['block/oak_planks'],
  trapped_chest: ['block/oak_planks'],
  ender_chest: ['block/obsidian'],
  infested_stone: ['block/stone'],
  infested_cobblestone: ['block/cobblestone'],
  infested_deepslate: ['block/deepslate'],
  infested_stone_bricks: ['block/stone_bricks'],
  water: ['block/water_still'],
  lava: ['block/lava_still'],
  fire: ['block/fire_0'],
  soul_fire: ['block/soul_fire_0'],
  wall_torch: ['block/torch'],
  soul_wall_torch: ['block/soul_torch'],
  redstone_wall_torch: ['block/redstone_torch'],
  lantern: ['item/lantern'],
  soul_lantern: ['item/soul_lantern'],
  chain: ['item/chain'],
  bell: ['item/bell'],
  campfire: ['item/campfire'],
  soul_campfire: ['item/soul_campfire'],
  cauldron: ['item/cauldron'],
  water_cauldron: ['item/cauldron'],
  lava_cauldron: ['item/cauldron'],
  powder_snow_cauldron: ['item/cauldron'],
  brewing_stand: ['item/brewing_stand'],
  flower_pot: ['item/flower_pot'],
  cake: ['item/cake'],
  pointed_dripstone: ['item/pointed_dripstone'],
  dirt_path: ['block/dirt_path_side'],
  end_portal_frame: ['block/end_portal_frame_side'],
  enchanting_table: ['block/enchanting_table_side'],
  respawn_anchor: ['block/respawn_anchor_side0'],
  jukebox: ['block/jukebox_side'],
  chiseled_bookshelf: ['block/chiseled_bookshelf_occupied'],
  sculk_catalyst: ['block/sculk_catalyst_side'],
  sculk_sensor: ['block/sculk_sensor_side'],
  calibrated_sculk_sensor: ['block/calibrated_sculk_sensor_top'],
  sculk_shrieker: ['block/sculk_shrieker_side'],
  reinforced_deepslate: ['block/reinforced_deepslate_side'],
  muddy_mangrove_roots: ['block/muddy_mangrove_roots_side'],
  mangrove_roots: ['block/mangrove_roots_side'],
};

function addPaths(target: Set<string>, paths?: readonly string[]): void {
  if (!paths) return;
  for (const p of paths) {
    target.add(p);
  }
}

/**
 * Returns an ordered, deduplicated list of candidate vanilla asset PNG URLs for a
 * Minecraft block ID, handling multi-face textures, item sprites, and shaped blocks.
 */
export function getMinecraftBlockIconCandidates(rawBlockId: string): string[] {
  const cleanId = rawBlockId.trim().toLowerCase().replace(/^minecraft:/, '');
  if (!cleanId) return [];

  const baseId = cleanId.replace(/^(waxed_|potted_|wall_)/, '');
  const paths = new Set<string>();

  // 1. Explicit verified overrides for cleanId / baseId
  addPaths(paths, BLOCK_TEXTURE_OVERRIDES[cleanId]);
  if (baseId !== cleanId) {
    addPaths(paths, BLOCK_TEXTURE_OVERRIDES[baseId]);
  }

  // 2. Direct block texture
  paths.add(`block/${cleanId}`);
  if (baseId !== cleanId) {
    paths.add(`block/${baseId}`);
  }

  // 3. Common multi-face suffixes
  paths.add(`block/${cleanId}_side`);
  paths.add(`block/${cleanId}_front`);
  paths.add(`block/${cleanId}_top`);

  // 4. Item texture fallback
  paths.add(`item/${cleanId}`);

  // 5. Derived shaped-block base textures (carpets, panes, slabs, stairs, walls, etc.)
  if (baseId.endsWith('_carpet')) {
    const color = baseId.slice(0, -'_carpet'.length);
    if (color) paths.add(`block/${color}_wool`);
  } else if (baseId.endsWith('_pane')) {
    const stem = baseId.slice(0, -'_pane'.length);
    if (stem) paths.add(`block/${stem}`);
  }

  for (const suffix of SHAPED_SUFFIXES) {
    if (!baseId.endsWith(suffix)) continue;
    const stem = baseId.slice(0, -suffix.length);
    if (!stem) break;
    if (WOOD_TYPES.has(stem)) {
      paths.add(`block/${stem}_planks`);
    }
    addPaths(paths, BLOCK_TEXTURE_OVERRIDES[stem]);
    paths.add(`block/${stem}`);
    paths.add(`block/${stem}s`);
    paths.add(`block/${stem}_side`);
    break;
  }

  return Array.from(paths, (path) => `${MC_TEXTURES_BASE}/${encodeURIComponent(path).replace(/%2F/g, '/')}.png`);
}

const MOB_ICON_OVERRIDES: Record<string, string> = {
  player: 'item/diamond_sword',
  giant: 'item/zombie_spawn_egg',
  illusioner: 'item/evoker_spawn_egg',
  wither_skull: 'item/wither_spawn_egg',
};

const MOB_DROP_FALLBACKS: Record<string, string> = {
  zombified_piglin: 'gold_nugget',
  zombie: 'rotten_flesh',
  skeleton: 'bone',
  creeper: 'gunpowder',
  enderman: 'ender_pearl',
  wither_skeleton: 'coal',
  blaze: 'blaze_rod',
  guardian: 'prismarine_shard',
  elder_guardian: 'prismarine_shard',
  witch: 'glowstone_dust',
  pillager: 'emerald',
  vindicator: 'emerald',
  evoker: 'totem_of_undying',
  slime: 'slime_ball',
  magma_cube: 'magma_cream',
  ghast: 'ghast_tear',
  shulker: 'shulker_shell',
  phantom: 'phantom_membrane',
  spider: 'spider_eye',
  cave_spider: 'spider_eye',
  breeze: 'breeze_rod',
  wither: 'nether_star',
  ender_dragon: 'dragon_breath',
  iron_golem: 'iron_ingot',
  cow: 'beef',
  pig: 'porkchop',
  chicken: 'chicken',
  sheep: 'mutton',
  squid: 'ink_sac',
  glow_squid: 'glow_ink_sac',
};

/**
 * Returns an ordered, deduplicated list of candidate vanilla icon URLs for a
 * Minecraft entity/mob ID using 1.21.5 custom spawn eggs and iconic drop fallbacks.
 */
export function getMinecraftMobIconCandidates(rawMobId: string): string[] {
  const cleanId = rawMobId.trim().toLowerCase().replace(/^minecraft:/, '');
  if (!cleanId) return [];

  const urls = new Set<string>();
  const add1215 = (relPath: string) => {
    urls.add(`${MC_TEXTURES_1215}/${encodeURIComponent(relPath).replace(/%2F/g, '/')}.png`);
  };
  const add1214 = (relPath: string) => {
    urls.add(`${MC_TEXTURES_BASE}/${encodeURIComponent(relPath).replace(/%2F/g, '/')}.png`);
  };

  const overridePath = MOB_ICON_OVERRIDES[cleanId];
  if (overridePath) {
    add1215(overridePath);
  }
  add1215(`item/${cleanId}_spawn_egg`);

  const dropItem = MOB_DROP_FALLBACKS[cleanId];
  if (dropItem) {
    add1214(`item/${dropItem}`);
    add1215(`item/${dropItem}`);
  }

  return Array.from(urls);
}
