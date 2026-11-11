export type BlockShapeKind =
  | 'cube'
  | 'jelly' // slime / honey with inner solid core
  | 'glass' // crisp Minecraft frame + glint
  | 'hopper' // stepped funnel
  | 'chest' // slightly inset + clasp
  | 'slab' // half height (supports top or bottom)
  | 'stairs' // L-shaped 3D stair
  | 'plate' // low height (repeater/comparator/carpet/pressure plate)
  | 'rail' // thin track stripes
  | 'wire' // redstone dust flat network
  | 'torch' // thin vertical rod + glowing tip
  | 'pane' // thin vertical glass/fence/wall/door
  | 'fluid';

export type TexturePattern =
  | 'solid'
  | 'stone'
  | 'cobble'
  | 'deepslate'
  | 'smooth_stone'
  | 'obsidian'
  | 'planks'
  | 'log'
  | 'leaves'
  | 'concrete'
  | 'terracotta'
  | 'wool'
  | 'glazed'
  | 'glass'
  | 'packed_ice'
  | 'slime'
  | 'honey'
  | 'redstone_block'
  | 'redstone_lamp'
  | 'tnt'
  | 'observer'
  | 'piston'
  | 'sticky_piston'
  | 'dropper'
  | 'chest'
  | 'ender_chest'
  | 'barrel'
  | 'hopper'
  | 'note_block'
  | 'target'
  | 'shulker'
  | 'emerald'
  | 'glowstone'
  | 'copper'
  | 'scaffolding'
  | 'nether_portal'
  | 'water';

export type BlockFacing = 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 'none';

export interface BlockVisualStyle {
  blockName: string;
  r: number;
  g: number;
  b: number;
  alpha: number;
  heightScale: number;
  isTopHalf: boolean;
  isOpaque: boolean;
  shape: BlockShapeKind;
  pattern: TexturePattern;
  facing: BlockFacing;
  lit: boolean;
}

const DYE_COLORS: Record<string, [number, number, number]> = {
  white: [232, 236, 237],
  orange: [234, 126, 36],
  magenta: [189, 75, 179],
  light_blue: [75, 175, 224],
  yellow: [244, 204, 48],
  lime: [118, 198, 42],
  pink: [232, 120, 160],
  gray: [84, 90, 96],
  light_gray: [152, 156, 154],
  cyan: [36, 148, 164],
  purple: [134, 58, 182],
  blue: [58, 78, 184],
  brown: [126, 82, 50],
  green: [88, 122, 38],
  red: [174, 44, 38],
  black: [42, 44, 52],
};

const EXACT_COLORS: Record<string, [number, number, number, number?, number?]> = {
  slime_block: [114, 208, 84, 0.84, 1],
  honey_block: [242, 174, 48, 0.86, 1],
  redstone_block: [182, 34, 20, 1, 1],
  redstone_lamp: [118, 70, 42, 1, 1],
  redstone_wire: [222, 40, 26, 1, 0.1],
  redstone_torch: [240, 62, 34, 1, 0.65],
  redstone_wall_torch: [240, 62, 34, 1, 0.65],
  repeater: [164, 164, 168, 1, 0.18],
  comparator: [160, 156, 164, 1, 0.18],
  observer: [78, 82, 90, 1, 1],
  dispenser: [130, 132, 136, 1, 1],
  dropper: [136, 138, 142, 1, 1],
  piston: [182, 144, 92, 1, 1],
  sticky_piston: [134, 184, 92, 1, 1],
  piston_head: [188, 150, 96, 1, 0.48],
  hopper: [78, 84, 94, 1, 1],
  note_block: [116, 72, 54, 1, 1],
  target: [222, 202, 188, 1, 1],
  tnt: [214, 54, 42, 1, 1],
  lever: [134, 124, 108, 1, 0.35],
  lightning_rod: [202, 122, 88, 1, 0.85],
  light_weighted_pressure_plate: [238, 202, 64, 1, 0.12],
  rail: [158, 146, 126, 1, 0.1],
  powered_rail: [210, 86, 52, 1, 0.1],
  detector_rail: [182, 74, 62, 1, 0.1],
  activator_rail: [172, 78, 68, 1, 0.1],
  chest: [176, 126, 54, 1, 0.88],
  trapped_chest: [178, 120, 52, 1, 0.88],
  ender_chest: [40, 48, 66, 1, 0.88],
  barrel: [144, 108, 66, 1, 1],
  shulker_box: [146, 98, 152, 1, 1],
  composter: [134, 98, 58, 1, 1],
  stonecutter: [138, 140, 144, 1, 0.65],
  scaffolding: [218, 182, 98, 0.86, 1],
  obsidian: [44, 32, 66, 1, 1],
  crying_obsidian: [56, 36, 92, 1, 1],
  stone: [132, 134, 138, 1, 1],
  cobblestone: [124, 126, 130, 1, 1],
  smooth_stone: [160, 162, 166, 1, 1],
  smooth_stone_slab: [160, 162, 166, 1, 0.5],
  dirt: [136, 98, 68, 1, 1],
  grass_block: [106, 158, 76, 1, 1],
  mud: [68, 64, 70, 1, 1],
  soul_sand: [88, 68, 56, 1, 1],
  soul_soil: [80, 62, 52, 1, 1],
  moss_block: [98, 128, 56, 1, 1],
  melon: [124, 154, 44, 1, 1],
  jack_o_lantern: [222, 138, 38, 1, 1],
  glass: [188, 228, 248, 0.45, 1],
  tinted_glass: [58, 52, 70, 0.68, 1],
  packed_ice: [144, 184, 244, 0.94, 1],
  blue_ice: [118, 166, 248, 0.95, 1],
  ice: [154, 198, 252, 0.68, 1],
  water: [48, 114, 230, 0.55, 0.9],
  bubble_column: [74, 148, 246, 0.52, 0.9],
  lava: [242, 104, 28, 0.95, 0.9],
  nether_portal: [138, 56, 236, 0.74, 1],
  soul_fire: [66, 214, 234, 0.82, 0.55],
  fire: [246, 146, 36, 0.85, 0.55],
  glowstone: [236, 192, 98, 1, 1],
  shroomlight: [244, 154, 76, 1, 1],
  sea_lantern: [178, 220, 214, 1, 1],
  emerald_block: [60, 208, 108, 1, 1],
  iron_block: [222, 224, 228, 1, 1],
  gold_block: [246, 206, 58, 1, 1],
  diamond_block: [100, 228, 222, 1, 1],
  netherite_block: [74, 68, 74, 1, 1],
  iron_door: [212, 216, 220, 1, 1],
  iron_trapdoor: [212, 216, 220, 1, 0.2],
  oxidized_copper_bulb: [86, 160, 136, 1, 1],
  oak_leaves: [80, 138, 58, 0.94, 1],
  spruce_leaves: [60, 102, 58, 0.94, 1],
  birch_leaves: [106, 150, 74, 0.94, 1],
  jungle_leaves: [74, 150, 50, 0.94, 1],
  acacia_leaves: [88, 140, 50, 0.94, 1],
  dark_oak_leaves: [66, 114, 48, 0.94, 1],
  cherry_leaves: [240, 168, 200, 0.94, 1],
  nether_wart_block: [126, 26, 30, 1, 1],
  warped_wart_block: [28, 126, 122, 1, 1],
  crimson_stem: [116, 46, 68, 1, 1],
  warped_stem: [48, 118, 118, 1, 1],
};

function findDyePrefix(name: string): [number, number, number] | null {
  const orderedKeys = Object.keys(DYE_COLORS).sort((a, b) => b.length - a.length);
  for (const dye of orderedKeys) {
    if (name.startsWith(`${dye}_`)) {
      return DYE_COLORS[dye];
    }
  }
  return null;
}

function detectShapeAndPattern(
  name: string,
  heightScale: number
): { shape: BlockShapeKind; pattern: TexturePattern } {
  if (name === 'slime_block') return { shape: 'jelly', pattern: 'slime' };
  if (name === 'honey_block') return { shape: 'jelly', pattern: 'honey' };
  if (name === 'hopper') return { shape: 'hopper', pattern: 'hopper' };
  if (name === 'chest' || name === 'trapped_chest') return { shape: 'chest', pattern: 'chest' };
  if (name === 'ender_chest') return { shape: 'chest', pattern: 'ender_chest' };
  if (name === 'redstone_wire') return { shape: 'wire', pattern: 'solid' };
  if (name === 'redstone_torch' || name === 'redstone_wall_torch') {
    return { shape: 'torch', pattern: 'solid' };
  }
  if (name === 'repeater' || name === 'comparator') {
    return { shape: 'plate', pattern: 'smooth_stone' };
  }
  if (name.endsWith('rail')) return { shape: 'rail', pattern: 'solid' };
  if (name.includes('stairs')) return { shape: 'stairs', pattern: name.includes('deepslate') ? 'deepslate' : 'stone' };
  if (name.includes('slab')) return { shape: 'slab', pattern: 'smooth_stone' };
  if (name.includes('glass_pane') || name.includes('wall') || name.includes('fence') || name.includes('door')) {
    return {
      shape: name.includes('stained_glass_pane') || name.includes('glass_pane') ? 'glass' : 'pane',
      pattern: name.includes('glass') ? 'glass' : 'stone',
    };
  }
  if (name.includes('glass')) return { shape: 'glass', pattern: 'glass' };
  if (name === 'water' || name === 'bubble_column' || name === 'lava' || name === 'nether_portal') {
    return { shape: 'fluid', pattern: name === 'nether_portal' ? 'nether_portal' : 'water' };
  }
  if (heightScale < 0.45) return { shape: 'plate', pattern: 'solid' };

  if (name === 'observer') return { shape: 'cube', pattern: 'observer' };
  if (name === 'piston') return { shape: 'cube', pattern: 'piston' };
  if (name === 'sticky_piston') return { shape: 'cube', pattern: 'sticky_piston' };
  if (name === 'dispenser' || name === 'dropper') return { shape: 'cube', pattern: 'dropper' };
  if (name === 'tnt') return { shape: 'cube', pattern: 'tnt' };
  if (name === 'redstone_block') return { shape: 'cube', pattern: 'redstone_block' };
  if (name === 'redstone_lamp') return { shape: 'cube', pattern: 'redstone_lamp' };
  if (name === 'barrel') return { shape: 'cube', pattern: 'barrel' };
  if (name === 'note_block') return { shape: 'cube', pattern: 'note_block' };
  if (name === 'target') return { shape: 'cube', pattern: 'target' };
  if (name === 'packed_ice' || name === 'blue_ice' || name === 'ice') {
    return { shape: 'cube', pattern: 'packed_ice' };
  }
  if (name === 'emerald_block') return { shape: 'cube', pattern: 'emerald' };
  if (name === 'glowstone' || name === 'shroomlight' || name === 'sea_lantern') {
    return { shape: 'cube', pattern: 'glowstone' };
  }
  if (name === 'scaffolding') return { shape: 'cube', pattern: 'scaffolding' };
  if (name.includes('shulker_box')) return { shape: 'cube', pattern: 'shulker' };
  if (name.includes('leaves')) return { shape: 'cube', pattern: 'leaves' };
  if (name.includes('glazed_terracotta')) return { shape: 'cube', pattern: 'glazed' };
  if (name.includes('terracotta')) return { shape: 'cube', pattern: 'terracotta' };
  if (name.includes('concrete')) return { shape: 'cube', pattern: 'concrete' };
  if (name.includes('wool')) return { shape: 'cube', pattern: 'wool' };
  if (name.includes('obsidian')) return { shape: 'cube', pattern: 'obsidian' };
  if (name.includes('deepslate')) return { shape: 'cube', pattern: 'deepslate' };
  if (name.includes('smooth_stone')) return { shape: 'cube', pattern: 'smooth_stone' };
  if (name.includes('cobble')) return { shape: 'cube', pattern: 'cobble' };
  if (name === 'stone' || name.includes('stone_brick')) return { shape: 'cube', pattern: 'stone' };
  if (name.includes('copper')) return { shape: 'cube', pattern: 'copper' };
  if (name.includes('log') || name.includes('stem')) return { shape: 'cube', pattern: 'log' };
  if (name.includes('planks') || name.includes('composter') || name.includes('oak') || name.includes('birch') || name.includes('spruce')) {
    return { shape: 'cube', pattern: 'planks' };
  }

  return { shape: 'cube', pattern: 'stone' };
}

const styleCache = new Map<string, BlockVisualStyle>();

export function getBlockVisualStyle(
  rawName: string,
  props?: Record<string, string>
): BlockVisualStyle {
  const name = rawName.replace('minecraft:', '');
  const facingRaw = (props?.facing || 'none') as BlockFacing;
  const facing: BlockFacing = ['north', 'south', 'east', 'west', 'up', 'down'].includes(facingRaw)
    ? facingRaw
    : 'none';
  const isTopHalf = props?.type === 'top' || props?.half === 'top';
  const lit = props?.lit === 'true' || props?.powered === 'true';

  const cacheKey = `${name}|${facing}|${isTopHalf ? 'T' : 'B'}|${lit ? '1' : '0'}`;
  const cached = styleCache.get(cacheKey);
  if (cached) return cached;

  let r = 136;
  let g = 140;
  let b = 148;
  let alpha = 1;
  let heightScale = 1;

  const exact = EXACT_COLORS[name];
  if (exact) {
    r = exact[0];
    g = exact[1];
    b = exact[2];
    alpha = exact[3] ?? 1;
    heightScale = exact[4] ?? 1;
    if (name === 'redstone_lamp' && lit) {
      r = 246;
      g = 194;
      b = 98;
    }
  } else {
    const dye = findDyePrefix(name);
    if (name.includes('stained_glass_pane')) {
      const c = dye || [184, 214, 236];
      r = c[0];
      g = c[1];
      b = c[2];
      alpha = 0.45;
    } else if (name.includes('stained_glass')) {
      const c = dye || [184, 214, 236];
      r = c[0];
      g = c[1];
      b = c[2];
      alpha = 0.48;
    } else if (name.includes('shulker_box')) {
      const c = dye || [146, 98, 152];
      r = c[0];
      g = c[1];
      b = c[2];
    } else if (name.includes('concrete') || name.includes('wool')) {
      const c = dye || [184, 188, 192];
      r = c[0];
      g = c[1];
      b = c[2];
    } else if (name.includes('terracotta')) {
      const c = dye || [154, 100, 80];
      r = Math.round(c[0] * 0.85 + 24);
      g = Math.round(c[1] * 0.78 + 20);
      b = Math.round(c[2] * 0.72 + 16);
    } else if (name.includes('carpet')) {
      const c = dye || [144, 148, 152];
      r = c[0];
      g = c[1];
      b = c[2];
      heightScale = 0.14;
    } else if (name.includes('coral_wall_fan')) {
      r = 132;
      g = 128;
      b = 124;
      heightScale = 0.35;
    } else if (name.includes('deepslate')) {
      r = 82;
      g = 86;
      b = 92;
    } else if (name.includes('stone_brick')) {
      r = 128;
      g = 130;
      b = 134;
    } else if (
      name.includes('oak') ||
      name.includes('birch') ||
      name.includes('spruce') ||
      name.includes('jungle') ||
      name.includes('acacia') ||
      name.includes('cherry')
    ) {
      r = name.includes('birch') ? 204 : name.includes('spruce') ? 112 : name.includes('cherry') ? 218 : 162;
      g = name.includes('birch') ? 188 : name.includes('spruce') ? 82 : name.includes('cherry') ? 158 : 126;
      b = name.includes('birch') ? 138 : name.includes('spruce') ? 52 : name.includes('cherry') ? 164 : 78;
    } else if (name.includes('leaves')) {
      r = 78;
      g = 138;
      b = 60;
      alpha = 0.94;
    } else if (name.includes('copper')) {
      r = name.includes('oxidized') ? 86 : name.includes('weathered') ? 112 : 194;
      g = name.includes('oxidized') ? 160 : name.includes('weathered') ? 152 : 114;
      b = name.includes('oxidized') ? 136 : name.includes('weathered') ? 118 : 84;
    }

    if (name.includes('slab')) heightScale = 0.5;
    else if (name.includes('trapdoor')) heightScale = 0.22;
    else if (name.includes('sign')) heightScale = 0.4;
    else if (name.includes('fence_gate')) heightScale = 0.72;
    else if (name.includes('pressure_plate')) heightScale = 0.14;
    else if (name.includes('wall')) heightScale = 0.88;
  }

  const { shape, pattern } = detectShapeAndPattern(name, heightScale);

  const style: BlockVisualStyle = {
    blockName: name,
    r,
    g,
    b,
    alpha,
    heightScale,
    isTopHalf,
    isOpaque: alpha >= 0.99 && heightScale >= 0.99 && shape === 'cube',
    shape,
    pattern,
    facing,
    lit,
  };
  styleCache.set(cacheKey, style);
  return style;
}
