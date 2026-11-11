import type { BlockFacing, BlockVisualStyle } from './litematicBlocks';
import type { IsoRotation } from './litematicIsometric';

export type FaceSlot = 'top' | 'left' | 'right';

const MC_ASSETS_BASE =
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.21.4/assets/minecraft/textures/block';

const FACE_SHADE: Record<FaceSlot, number> = {
  top: 1.06,
  left: 0.85,
  right: 0.68,
};

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function hash2d(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Resolve vanilla 16x16 block texture filenames for each block & face.
 * Returns null for chests/entity UV sheets handled by dedicated sprites.
 */
function resolveTextureMapping(
  style: BlockVisualStyle,
  slot: FaceSlot,
  cameraRot: IsoRotation
): { texName: string | null; angleQuarterTurns: 0 | 1 | 2 | 3; tint?: [number, number, number] } {
  const { blockName: name, facing, lit } = style;
  const rel = resolveFacingRelation(facing, cameraRot, slot);

  // Chests use 64x64 entity UV sheets in vanilla; keep our crisp 16x16 chest lock sprite
  if (name === 'chest' || name === 'trapped_chest' || name === 'ender_chest') {
    return { texName: null, angleQuarterTurns: 0 };
  }

  // Leaves need Plains biome green tint (except cherry_leaves which is pre-colored pink)
  let tint: [number, number, number] | undefined;
  if (name === 'oak_leaves' || name === 'jungle_leaves' || name === 'acacia_leaves' || name === 'dark_oak_leaves') {
    tint = [96, 174, 72];
  } else if (name === 'spruce_leaves') {
    tint = [82, 134, 74];
  } else if (name === 'birch_leaves') {
    tint = [116, 170, 84];
  } else if (name === 'grass_block' && slot === 'top') {
    tint = [112, 186, 82];
  }

  // Directional Redstone & Utility Blocks
  if (name === 'observer') {
    if (rel.isFront) return { texName: 'observer_front', angleQuarterTurns: 0 };
    if (rel.isBack) return { texName: 'observer_back', angleQuarterTurns: 0 };
    if (slot === 'top') {
      const q = rel.arrowRot !== null ? (((rel.arrowRot + 1) % 4) as 0 | 1 | 2 | 3) : 0;
      return { texName: 'observer_top', angleQuarterTurns: q };
    }
    return { texName: 'observer_side', angleQuarterTurns: 0 };
  }

  if (name === 'piston' || name === 'sticky_piston') {
    const pushTex = name === 'sticky_piston' ? 'piston_top_sticky' : 'piston_top';
    if (rel.isFront || (facing === 'up' && slot === 'top')) {
      return { texName: pushTex, angleQuarterTurns: 0 };
    }
    if (rel.isBack || (facing === 'down' && slot === 'top')) {
      return { texName: 'piston_bottom', angleQuarterTurns: 0 };
    }
    if (slot === 'top' && rel.arrowRot !== null) {
      return {
        texName: 'piston_side',
        angleQuarterTurns: ((rel.arrowRot + 1) % 4) as 0 | 1 | 2 | 3,
      };
    }
    if (facing === 'down' && slot !== 'top') {
      return { texName: 'piston_side', angleQuarterTurns: 2 };
    }
    return { texName: 'piston_side', angleQuarterTurns: 0 };
  }

  if (name === 'piston_head') {
    return { texName: 'piston_top', angleQuarterTurns: 0 };
  }

  if (name === 'dropper' || name === 'dispenser') {
    if (rel.isFront || (facing === 'up' && slot === 'top')) {
      return {
        texName: facing === 'up' || facing === 'down' ? `${name}_front_vertical` : `${name}_front`,
        angleQuarterTurns: 0,
      };
    }
    return { texName: 'furnace_top', angleQuarterTurns: 0 };
  }

  if (name === 'hopper') {
    return {
      texName: slot === 'top' ? 'hopper_top' : 'hopper_outside',
      angleQuarterTurns: 0,
    };
  }

  if (name === 'tnt') {
    return { texName: slot === 'top' ? 'tnt_top' : 'tnt_side', angleQuarterTurns: 0 };
  }

  if (name === 'barrel') {
    return { texName: slot === 'top' ? 'barrel_top' : 'barrel_side', angleQuarterTurns: 0 };
  }

  if (name === 'honey_block') {
    return {
      texName: slot === 'top' ? 'honey_block_top' : 'honey_block_side',
      angleQuarterTurns: 0,
    };
  }

  if (name === 'target') {
    return { texName: slot === 'top' ? 'target_top' : 'target_side', angleQuarterTurns: 0 };
  }

  if (name === 'melon') {
    return { texName: slot === 'top' ? 'melon_top' : 'melon_side', angleQuarterTurns: 0 };
  }

  if (name === 'jack_o_lantern') {
    return {
      texName: slot === 'top' ? 'pumpkin_top' : rel.isFront ? 'jack_o_lantern' : 'pumpkin_side',
      angleQuarterTurns: 0,
    };
  }

  if (name === 'scaffolding') {
    return { texName: slot === 'top' ? 'scaffolding_top' : 'scaffolding_side', angleQuarterTurns: 0 };
  }

  if (name === 'composter') {
    return { texName: slot === 'top' ? 'composter_top' : 'composter_side', angleQuarterTurns: 0 };
  }

  if (name === 'stonecutter') {
    return { texName: slot === 'top' ? 'stonecutter_top' : 'stonecutter_side', angleQuarterTurns: 0 };
  }

  if (name === 'redstone_lamp') {
    return { texName: lit ? 'redstone_lamp_on' : 'redstone_lamp', angleQuarterTurns: 0 };
  }

  if (name === 'oxidized_copper_bulb') {
    return { texName: lit ? 'oxidized_copper_bulb_lit' : 'oxidized_copper_bulb', angleQuarterTurns: 0 };
  }

  if (name === 'smooth_stone_slab' || name === 'smooth_stone') {
    return {
      texName: slot === 'top' ? 'smooth_stone' : 'smooth_stone_slab_side',
      angleQuarterTurns: 0,
    };
  }

  if (name === 'grass_block') {
    return { texName: slot === 'top' ? 'grass_block_top' : 'grass_block_side', angleQuarterTurns: 0, tint };
  }

  if (name.endsWith('_log') || name.endsWith('_stem')) {
    return { texName: slot === 'top' ? `${name}_top` : name, angleQuarterTurns: 0 };
  }

  if (name.endsWith('_stained_glass_pane')) {
    return { texName: name.replace('_pane', ''), angleQuarterTurns: 0 };
  }
  if (name === 'glass_pane') {
    return { texName: 'glass', angleQuarterTurns: 0 };
  }
  if (name === 'deepslate_tile_stairs') {
    return { texName: 'deepslate_tiles', angleQuarterTurns: 0 };
  }
  if (name === 'stone_brick_stairs' || name === 'stone_brick_wall') {
    return { texName: 'stone_bricks', angleQuarterTurns: 0 };
  }
  if (name === 'deepslate_brick_wall') {
    return { texName: 'deepslate_bricks', angleQuarterTurns: 0 };
  }
  if (name === 'cobblestone_wall') {
    return { texName: 'cobblestone', angleQuarterTurns: 0 };
  }
  if (name.includes('_wall_sign') || name.includes('_sign') || name.includes('_fence_gate') || name.includes('_trapdoor')) {
    const wood = name.split('_')[0];
    if (['oak', 'birch', 'spruce', 'jungle', 'acacia', 'dark', 'cherry'].includes(wood)) {
      const plankWood = wood === 'dark' ? 'dark_oak' : wood;
      return { texName: `${plankWood}_planks`, angleQuarterTurns: 0 };
    }
    if (name === 'iron_trapdoor') return { texName: 'iron_trapdoor', angleQuarterTurns: 0 };
  }

  if (name === 'repeater' || name === 'comparator') {
    return { texName: 'smooth_stone', angleQuarterTurns: 0 };
  }

  if (
    name === 'water' ||
    name === 'bubble_column' ||
    name === 'lava' ||
    name === 'nether_portal' ||
    name.includes('fire') ||
    name.includes('rail') ||
    name.includes('wire') ||
    name.includes('torch') ||
    name.includes('lever') ||
    name.includes('coral') ||
    name.includes('pressure_plate')
  ) {
    return { texName: null, angleQuarterTurns: 0 };
  }

  return { texName: name, angleQuarterTurns: 0, tint };
}

// Global CDN image cache: texName -> loaded HTMLImageElement | null (when failed/404)
const rawImageCache = new Map<string, HTMLImageElement | null>();
const pendingLoads = new Map<string, Promise<void>>();

function loadVanillaTexture(texName: string): Promise<void> {
  if (rawImageCache.has(texName)) return Promise.resolve();
  const existing = pendingLoads.get(texName);
  if (existing) return existing;

  const task = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => {
      if (!rawImageCache.has(texName)) rawImageCache.set(texName, null);
      pendingLoads.delete(texName);
      resolve();
    }, 4500);

    img.onload = () => {
      window.clearTimeout(timer);
      rawImageCache.set(texName, img);
      pendingLoads.delete(texName);
      resolve();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      rawImageCache.set(texName, null);
      pendingLoads.delete(texName);
      resolve();
    };
    img.src = `${MC_ASSETS_BASE}/${texName}.png`;
  });

  pendingLoads.set(texName, task);
  return task;
}

/**
 * Concurrently prefetch every real Minecraft 16x16 block PNG needed by a schematic's palette.
 */
export async function ensureMinecraftTextures(styles: BlockVisualStyle[]): Promise<void> {
  const needed = new Set<string>();
  const slots: FaceSlot[] = ['top', 'left', 'right'];
  for (const st of styles) {
    for (const sl of slots) {
      const m = resolveTextureMapping(st, sl, 0);
      if (m.texName && !rawImageCache.has(m.texName)) {
        needed.add(m.texName);
      }
      // Also prefetch front/back variants for rotatable directional blocks
      if (st.blockName === 'observer') {
        needed.add('observer_front');
        needed.add('observer_back');
      } else if (st.blockName === 'piston' || st.blockName === 'sticky_piston') {
        needed.add(st.blockName === 'sticky_piston' ? 'piston_top_sticky' : 'piston_top');
        needed.add('piston_bottom');
      } else if (st.blockName === 'dropper' || st.blockName === 'dispenser') {
        needed.add(`${st.blockName}_front`);
        needed.add('furnace_top');
      }
    }
  }
  if (needed.size === 0) return;
  await Promise.all(Array.from(needed).map((tex) => loadVanillaTexture(tex)));
}

type PixelSetter = (
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a?: number
) => void;

function fillBaseNoise(
  setPx: PixelSetter,
  r: number,
  g: number,
  b: number,
  alpha: number,
  amplitude: number,
  seed: number,
  borderDarken = 0
) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const h = (hash2d(x, y, seed) - 0.5) * 2 * amplitude;
      let mult = 1 + h;
      if (borderDarken > 0 && (x === 0 || x === 15 || y === 0 || y === 15)) {
        mult *= 1 - borderDarken;
      }
      setPx(x, y, r * mult, g * mult, b * mult, alpha);
    }
  }
}

function resolveFacingRelation(
  facing: BlockFacing,
  cameraRot: IsoRotation,
  slot: FaceSlot
): {
  isFront: boolean;
  isBack: boolean;
  isUp: boolean;
  isDown: boolean;
  arrowRot: 0 | 1 | 2 | 3 | null;
} {
  if (facing === 'none') {
    return { isFront: false, isBack: false, isUp: false, isDown: false, arrowRot: null };
  }
  if (facing === 'up') {
    return {
      isFront: slot === 'top',
      isBack: false,
      isUp: true,
      isDown: false,
      arrowRot: null,
    };
  }
  if (facing === 'down') {
    return {
      isFront: false,
      isBack: slot === 'top',
      isUp: false,
      isDown: true,
      arrowRot: null,
    };
  }

  const worldDirIdx =
    facing === 'east' ? 0 : facing === 'south' ? 1 : facing === 'west' ? 2 : 3;
  const camDir = ((worldDirIdx - cameraRot) % 4 + 4) % 4;

  const isFront =
    (slot === 'right' && camDir === 0) || (slot === 'left' && camDir === 1);
  const isBack =
    (slot === 'right' && camDir === 2) || (slot === 'left' && camDir === 3);

  return {
    isFront,
    isBack,
    isUp: false,
    isDown: false,
    arrowRot: camDir as 0 | 1 | 2 | 3,
  };
}

function rotatePoint(x: number, y: number, rot: 0 | 1 | 2 | 3): [number, number] {
  if (rot === 0) return [x, y];
  if (rot === 1) return [15 - y, x];
  if (rot === 2) return [15 - x, 15 - y];
  return [y, 15 - x];
}

function drawProceduralFallback(
  setPx: PixelSetter,
  style: BlockVisualStyle,
  slot: FaceSlot,
  cameraRot: IsoRotation
) {
  const { r, g, b, alpha, pattern, facing } = style;
  const rel = resolveFacingRelation(facing, cameraRot, slot);

  if (pattern === 'chest') {
    fillBaseNoise(setPx, 174, 124, 52, 1, 0.08, 31, 0.22);
    if (slot !== 'top') {
      for (let x = 0; x < 16; x++) setPx(x, 5, 74, 48, 22, 1);
      if (rel.isFront || (!rel.isBack && slot === 'left')) {
        setPx(7, 4, 218, 222, 228, 1);
        setPx(8, 4, 218, 222, 228, 1);
        setPx(7, 5, 198, 202, 208, 1);
        setPx(8, 5, 198, 202, 208, 1);
        setPx(7, 6, 165, 168, 174, 1);
        setPx(8, 6, 165, 168, 174, 1);
      }
    }
    return;
  }

  if (pattern === 'ender_chest') {
    fillBaseNoise(setPx, 40, 50, 68, 1, 0.12, 32, 0.25);
    if (slot !== 'top') {
      for (let x = 0; x < 16; x++) setPx(x, 5, 22, 26, 36, 1);
      if (rel.isFront || (!rel.isBack && slot === 'left')) {
        setPx(7, 4, 232, 210, 118, 1);
        setPx(8, 4, 232, 210, 118, 1);
        setPx(7, 5, 212, 188, 96, 1);
        setPx(8, 5, 212, 188, 96, 1);
      }
    }
    return;
  }

  if (pattern === 'observer') {
    fillBaseNoise(setPx, 82, 85, 92, 1, 0.14, 17, 0.16);
    if (rel.arrowRot !== null && slot === 'top') {
      for (let px = 4; px <= 12; px++) {
        const [rx, ry] = rotatePoint(px, 7, rel.arrowRot);
        setPx(rx, ry, 185, 190, 198, 1);
      }
    }
    return;
  }

  fillBaseNoise(setPx, r, g, b, alpha, 0.1, 101, 0.1);
}

const spriteCache = new Map<string, HTMLCanvasElement>();

export function getBlockFaceSprite(
  style: BlockVisualStyle,
  slot: FaceSlot,
  cameraRot: IsoRotation
): HTMLCanvasElement {
  const mapping = resolveTextureMapping(style, slot, cameraRot);
  const loadedImg = mapping.texName ? rawImageCache.get(mapping.texName) : undefined;
  const usingVanilla = Boolean(loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0);

  const key = usingVanilla
    ? `mc|${mapping.texName}|rot=${mapping.angleQuarterTurns}|tint=${mapping.tint?.join(',') || ''}|${slot}`
    : `proc|${style.blockName}|${style.r},${style.g},${style.b}|${style.facing}|${slot}|${cameraRot}`;

  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  const shade = FACE_SHADE[slot];

  if (usingVanilla && loadedImg) {
    // Draw cropped first 16x16 frame (handles animated strips like 16x80 crimson_stem cleanly)
    ctx.save();
    if (mapping.angleQuarterTurns !== 0) {
      ctx.translate(8, 8);
      ctx.rotate((mapping.angleQuarterTurns * Math.PI) / 2);
      ctx.translate(-8, -8);
    }
    ctx.drawImage(loadedImg, 0, 0, 16, 16, 0, 0, 16, 16);
    ctx.restore();

    // Apply lighting shade and optional Plains biome tint pixel-by-pixel
    const imgData = ctx.getImageData(0, 0, 16, 16);
    const data = imgData.data;
    const tint = mapping.tint;
    for (let p = 0; p < data.length; p += 4) {
      if (data[p + 3] === 0) continue;
      let pr = data[p];
      let pg = data[p + 1];
      let pb = data[p + 2];
      if (tint) {
        pr = (pr * tint[0]) / 255;
        pg = (pg * tint[1]) / 255;
        pb = (pb * tint[2]) / 255;
      }
      data[p] = clamp(pr * shade);
      data[p + 1] = clamp(pg * shade);
      data[p + 2] = clamp(pb * shade);
    }
    ctx.putImageData(imgData, 0, 0);
  } else {
    const imgData = ctx.createImageData(16, 16);
    const data = imgData.data;
    const setPx: PixelSetter = (x, y, r, g, b, a = 1) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || px >= 16 || py < 0 || py >= 16) return;
      const idx = (py * 16 + px) * 4;
      data[idx] = clamp(r * shade);
      data[idx + 1] = clamp(g * shade);
      data[idx + 2] = clamp(b * shade);
      data[idx + 3] = clamp(a * 255);
    };
    drawProceduralFallback(setPx, style, slot, cameraRot);
    ctx.putImageData(imgData, 0, 0);
  }

  spriteCache.set(key, canvas);
  return canvas;
}
