export interface BlockVisualStyle {
  r: number;
  g: number;
  b: number;
  alpha: number; // 0..1
  heightScale: number; // 1 = full cube, 0.5 = slab, 0.25 = plate/repeater/rail
  isOpaque: boolean;
}

const DYE_COLORS: Record<string, [number, number, number]> = {
  white: [232, 236, 237],
  orange: [234, 126, 36],
  magenta: [189, 75, 179],
  light_blue: [75, 175, 224],
  yellow: [244, 204, 48],
  lime: [118, 198, 42],
  pink: [232, 120, 160],
  gray: [76, 82, 87],
  light_gray: [148, 152, 150],
  cyan: [36, 146, 162],
  purple: [130, 56, 178],
  blue: [54, 72, 175],
  brown: [122, 78, 48],
  green: [86, 118, 36],
  red: [168, 42, 36],
  black: [34, 36, 42],
};

const EXACT_COLORS: Record<string, [number, number, number, number?, number?]> = {
  // Slime & Honey (signature TMC flying machines)
  slime_block: [112, 206, 84, 0.9, 1],
  honey_block: [242, 172, 46, 0.9, 1],

  // Redstone Components
  redstone_block: [178, 32, 18, 1, 1],
  redstone_lamp: [116, 68, 40, 1, 1],
  redstone_wire: [212, 36, 24, 1, 0.14],
  redstone_torch: [235, 58, 32, 1, 0.6],
  redstone_wall_torch: [235, 58, 32, 1, 0.6],
  repeater: [162, 162, 166, 1, 0.22],
  comparator: [158, 154, 162, 1, 0.22],
  observer: [72, 74, 80, 1, 1],
  dispenser: [128, 130, 134, 1, 1],
  dropper: [134, 136, 140, 1, 1],
  piston: [178, 142, 90, 1, 1],
  sticky_piston: [134, 182, 92, 1, 1],
  piston_head: [188, 150, 96, 1, 0.5],
  hopper: [74, 78, 86, 1, 0.85],
  note_block: [112, 70, 52, 1, 1],
  target: [218, 198, 186, 1, 1],
  tnt: [212, 54, 42, 1, 1],
  lever: [128, 118, 102, 1, 0.35],
  lightning_rod: [198, 118, 86, 1, 0.85],
  light_weighted_pressure_plate: [236, 198, 62, 1, 0.16],

  // Rails
  rail: [154, 142, 122, 1, 0.14],
  powered_rail: [204, 84, 52, 1, 0.14],
  detector_rail: [178, 72, 60, 1, 0.14],
  activator_rail: [168, 76, 66, 1, 0.14],

  // Storage & Utility
  chest: [174, 124, 54, 1, 0.88],
  trapped_chest: [176, 118, 52, 1, 0.88],
  ender_chest: [34, 42, 56, 1, 0.88],
  barrel: [142, 106, 64, 1, 1],
  shulker_box: [144, 96, 148, 1, 1],
  composter: [132, 96, 56, 1, 1],
  stonecutter: [136, 138, 140, 1, 0.65],
  scaffolding: [216, 180, 98, 0.82, 1],

  // Structural / Stone / Obsidian
  obsidian: [32, 22, 48, 1, 1],
  crying_obsidian: [46, 26, 78, 1, 1],
  stone: [128, 130, 134, 1, 1],
  cobblestone: [122, 124, 126, 1, 1],
  smooth_stone: [158, 160, 164, 1, 1],
  smooth_stone_slab: [158, 160, 164, 1, 0.5],
  dirt: [134, 96, 66, 1, 1],
  grass_block: [104, 156, 74, 1, 1],
  mud: [60, 56, 60, 1, 1],
  soul_sand: [82, 64, 52, 1, 1],
  soul_soil: [74, 58, 48, 1, 1],
  moss_block: [96, 126, 54, 1, 1],
  melon: [122, 152, 42, 1, 1],
  jack_o_lantern: [218, 136, 38, 1, 1],

  // Ice, Glass & Fluids
  glass: [184, 224, 246, 0.42, 1],
  tinted_glass: [48, 42, 58, 0.65, 1],
  packed_ice: [142, 182, 242, 0.92, 1],
  blue_ice: [116, 164, 246, 0.94, 1],
  ice: [152, 196, 250, 0.65, 1],
  water: [46, 112, 226, 0.52, 0.9],
  bubble_column: [72, 146, 244, 0.5, 0.9],
  lava: [240, 102, 26, 0.95, 0.9],
  nether_portal: [134, 52, 232, 0.72, 1],
  soul_fire: [64, 212, 232, 0.8, 0.55],
  fire: [244, 144, 34, 0.85, 0.55],

  // Lighting & Metals
  glowstone: [232, 188, 96, 1, 1],
  shroomlight: [242, 152, 74, 1, 1],
  sea_lantern: [176, 218, 212, 1, 1],
  emerald_block: [58, 206, 106, 1, 1],
  iron_block: [220, 222, 226, 1, 1],
  gold_block: [244, 204, 56, 1, 1],
  diamond_block: [98, 226, 220, 1, 1],
  netherite_block: [68, 62, 66, 1, 1],
  iron_door: [210, 214, 218, 1, 1],
  iron_trapdoor: [210, 214, 218, 1, 0.2],
  oxidized_copper_bulb: [84, 158, 134, 1, 1],

  // Foliage & Nether
  oak_leaves: [78, 136, 56, 0.92, 1],
  spruce_leaves: [58, 98, 56, 0.92, 1],
  birch_leaves: [104, 148, 72, 0.92, 1],
  jungle_leaves: [72, 148, 48, 0.92, 1],
  acacia_leaves: [86, 138, 48, 0.92, 1],
  dark_oak_leaves: [64, 112, 46, 0.92, 1],
  cherry_leaves: [238, 166, 198, 0.92, 1],
  nether_wart_block: [122, 22, 26, 1, 1],
  warped_wart_block: [26, 122, 118, 1, 1],
  crimson_stem: [112, 44, 66, 1, 1],
  warped_stem: [46, 114, 114, 1, 1],
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

const styleCache = new Map<string, BlockVisualStyle>();

export function getBlockVisualStyle(rawName: string): BlockVisualStyle {
  const name = rawName.replace('minecraft:', '');
  const cached = styleCache.get(name);
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
  } else {
    const dye = findDyePrefix(name);
    if (name.includes('stained_glass_pane')) {
      const c = dye || [180, 210, 232];
      r = c[0];
      g = c[1];
      b = c[2];
      alpha = 0.42;
    } else if (name.includes('stained_glass')) {
      const c = dye || [180, 210, 232];
      r = c[0];
      g = c[1];
      b = c[2];
      alpha = 0.46;
    } else if (name.includes('shulker_box')) {
      const c = dye || [144, 96, 148];
      r = c[0];
      g = c[1];
      b = c[2];
    } else if (name.includes('concrete') || name.includes('wool')) {
      const c = dye || [180, 184, 188];
      r = c[0];
      g = c[1];
      b = c[2];
    } else if (name.includes('terracotta')) {
      const c = dye || [152, 98, 78];
      r = Math.round(c[0] * 0.85 + 22);
      g = Math.round(c[1] * 0.78 + 18);
      b = Math.round(c[2] * 0.72 + 14);
    } else if (name.includes('carpet')) {
      const c = dye || [140, 144, 148];
      r = c[0];
      g = c[1];
      b = c[2];
      heightScale = 0.14;
    } else if (name.includes('coral_wall_fan')) {
      r = 128;
      g = 124;
      b = 120;
      heightScale = 0.35;
    } else if (name.includes('deepslate')) {
      r = 76;
      g = 78;
      b = 84;
    } else if (name.includes('stone_brick')) {
      r = 124;
      g = 126;
      b = 130;
    } else if (name.includes('oak') || name.includes('birch') || name.includes('spruce') || name.includes('jungle') || name.includes('acacia') || name.includes('cherry')) {
      r = name.includes('birch') ? 202 : name.includes('spruce') ? 106 : name.includes('cherry') ? 216 : 158;
      g = name.includes('birch') ? 186 : name.includes('spruce') ? 78 : name.includes('cherry') ? 156 : 124;
      b = name.includes('birch') ? 136 : name.includes('spruce') ? 48 : name.includes('cherry') ? 162 : 76;
    } else if (name.includes('leaves')) {
      r = 76;
      g = 134;
      b = 58;
      alpha = 0.92;
    } else if (name.includes('copper')) {
      r = name.includes('oxidized') ? 84 : name.includes('weathered') ? 108 : 190;
      g = name.includes('oxidized') ? 158 : name.includes('weathered') ? 148 : 112;
      b = name.includes('oxidized') ? 134 : name.includes('weathered') ? 116 : 82;
    }

    if (name.includes('slab')) heightScale = 0.5;
    else if (name.includes('trapdoor')) heightScale = 0.22;
    else if (name.includes('sign')) heightScale = 0.4;
    else if (name.includes('fence_gate')) heightScale = 0.72;
    else if (name.includes('pressure_plate')) heightScale = 0.14;
    else if (name.includes('wall')) heightScale = 0.88;
  }

  const style: BlockVisualStyle = {
    r,
    g,
    b,
    alpha,
    heightScale,
    isOpaque: alpha >= 0.99 && heightScale >= 0.99,
  };
  styleCache.set(name, style);
  return style;
}
