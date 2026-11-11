import type { BlockFacing, BlockVisualStyle } from './litematicBlocks';
import type { IsoRotation } from './litematicIsometric';

export type FaceSlot = 'top' | 'left' | 'right';

const FACE_SHADE: Record<FaceSlot, number> = {
  top: 1.07,
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

/**
 * Determine relative face role & top arrow rotation (in 90deg steps)
 * for directional redstone/storage blocks under the current camera rotation.
 */
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
  // camDir: 0 = +u (Front-Right), 1 = +v (Front-Left), 2 = -u (Back-Left), 3 = -v (Back-Right)
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

function rotatePoint(
  x: number,
  y: number,
  rot: 0 | 1 | 2 | 3
): [number, number] {
  // Texture space: rot=0 points right (+x); rot=1 points down (+y); rot=2 points left; rot=3 points up
  if (rot === 0) return [x, y];
  if (rot === 1) return [15 - y, x];
  if (rot === 2) return [15 - x, 15 - y];
  return [y, 15 - x];
}

function drawObserverTexture(
  setPx: PixelSetter,
  rel: ReturnType<typeof resolveFacingRelation>
) {
  // Base dark basalt cobblestone
  fillBaseNoise(setPx, 82, 85, 92, 1, 0.14, 17, 0.16);

  if (rel.isFront) {
    // Classic observer eyes + surprised mouth
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 15) {
          setPx(x, y, 52, 54, 60, 1);
        }
      }
    }
    // Two eyes
    for (let y = 4; y <= 6; y++) {
      for (let x = 3; x <= 5; x++) setPx(x, y, 22, 24, 28, 1);
      for (let x = 10; x <= 12; x++) setPx(x, y, 22, 24, 28, 1);
    }
    setPx(4, 5, 190, 200, 210, 1);
    setPx(11, 5, 190, 200, 210, 1);
    // Mouth
    for (let x = 5; x <= 10; x++) {
      setPx(x, 10, 24, 26, 30, 1);
      setPx(x, 11, 24, 26, 30, 1);
    }
  } else if (rel.isBack) {
    // Glowing redstone output dot on back
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 10; x++) {
        setPx(x, y, 36, 32, 36, 1);
      }
    }
    for (let y = 6; y <= 9; y++) {
      for (let x = 6; x <= 9; x++) {
        setPx(x, y, 228, 38, 28, 1);
      }
    }
    setPx(7, 7, 255, 145, 110, 1);
  } else if (rel.arrowRot !== null) {
    // Top face directional arrow pointing toward facing direction!
    const r = rel.arrowRot;
    for (let px = 4; px <= 12; px++) {
      const [rx, ry] = rotatePoint(px, 7, r);
      const [rx2, ry2] = rotatePoint(px, 8, r);
      setPx(rx, ry, 175, 180, 190, 1);
      setPx(rx2, ry2, 175, 180, 190, 1);
    }
    for (let off = 1; off <= 4; off++) {
      const [ax1, ay1] = rotatePoint(12 - off, 7 - off, r);
      const [ax2, ay2] = rotatePoint(12 - off, 8 + off, r);
      setPx(ax1, ay1, 215, 220, 228, 1);
      setPx(ax2, ay2, 215, 220, 228, 1);
    }
    // Red accent near back edge
    for (let y = 5; y <= 10; y++) {
      const [bx, by] = rotatePoint(2, y, r);
      setPx(bx, by, 190, 38, 30, 1);
    }
  }
}

function drawPistonTexture(
  setPx: PixelSetter,
  sticky: boolean,
  rel: ReturnType<typeof resolveFacingRelation>,
  facing: BlockFacing
) {
  if (rel.isFront || (rel.isUp && rel.arrowRot === null && facing === 'up')) {
    // Wooden head plate + iron rim
    fillBaseNoise(setPx, 184, 146, 92, 1, 0.1, 41, 0.12);
    for (let i = 0; i < 16; i++) {
      setPx(i, 4, 148, 112, 66, 1);
      setPx(i, 10, 148, 112, 66, 1);
      setPx(i, 0, 128, 130, 134, 1);
      setPx(i, 15, 128, 130, 134, 1);
      setPx(0, i, 128, 130, 134, 1);
      setPx(15, i, 128, 130, 134, 1);
    }
    if (sticky) {
      // Sticky green slime patch on pusher face
      for (let y = 2; y <= 13; y++) {
        for (let x = 2; x <= 13; x++) {
          if (hash2d(x, y, 88) > 0.25) {
            setPx(x, y, 118, 210, 86, 1);
          }
        }
      }
    }
  } else {
    // Cobblestone base + wooden collar strip
    fillBaseNoise(setPx, 118, 120, 124, 1, 0.14, 42, 0.1);
    if (facing === 'up') {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 16; x++) {
          setPx(x, y, sticky && y === 0 ? 118 : 182, sticky && y === 0 ? 208 : 144, sticky && y === 0 ? 86 : 90, 1);
        }
      }
      for (let x = 0; x < 16; x++) setPx(x, 4, 62, 64, 70, 1);
    } else if (facing === 'down') {
      for (let y = 12; y < 16; y++) {
        for (let x = 0; x < 16; x++) setPx(x, y, 182, 144, 90, 1);
      }
    } else {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 16; x++) setPx(x, y, 182, 144, 90, 1);
      }
    }
  }
}

function drawTntTexture(setPx: PixelSetter, slot: FaceSlot) {
  if (slot === 'top') {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const stripe = x % 4 === 0 ? 182 : 214;
        setPx(x, y, stripe, 52, 40, 1);
      }
    }
    for (let y = 4; y <= 11; y++) {
      for (let x = 4; x <= 11; x++) {
        setPx(x, y, 92, 86, 82, 1);
      }
    }
    setPx(7, 7, 232, 224, 212, 1);
    setPx(8, 8, 232, 224, 212, 1);
  } else {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (y >= 5 && y <= 10) {
          setPx(x, y, 236, 230, 218, 1);
        } else {
          const alt = x % 3 === 0 ? 0.86 : 1;
          setPx(x, y, 214 * alt, 52 * alt, 40 * alt, 1);
        }
      }
    }
    // Crisp dark "TNT" pixels across middle white band
    const pts = [
      [2,6],[3,6],[4,6],[3,7],[3,8],[3,9], // T
      [6,6],[6,7],[6,8],[6,9],[7,7],[8,8],[9,6],[9,7],[9,8],[9,9], // N
      [11,6],[12,6],[13,6],[12,7],[12,8],[12,9], // T
    ];
    for (const [px, py] of pts) {
      setPx(px, py, 34, 32, 34, 1);
    }
  }
}

function drawBlockFacePattern(
  setPx: PixelSetter,
  style: BlockVisualStyle,
  slot: FaceSlot,
  cameraRot: IsoRotation
) {
  const { r, g, b, alpha, pattern, facing, lit } = style;
  const rel = resolveFacingRelation(facing, cameraRot, slot);

  switch (pattern) {
    case 'observer':
      drawObserverTexture(setPx, rel);
      return;

    case 'piston':
    case 'sticky_piston':
      drawPistonTexture(setPx, pattern === 'sticky_piston', rel, facing);
      return;

    case 'tnt':
      drawTntTexture(setPx, slot);
      return;

    case 'dropper':
      fillBaseNoise(setPx, 134, 136, 140, 1, 0.1, 22, 0.16);
      if (rel.isFront) {
        for (let y = 5; y <= 10; y++) {
          for (let x = 5; x <= 10; x++) {
            setPx(x, y, 26, 28, 32, 1);
          }
        }
      }
      return;

    case 'chest':
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

    case 'ender_chest':
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

    case 'barrel':
      fillBaseNoise(setPx, 144, 108, 66, 1, 0.09, 33, 0.15);
      if (slot !== 'top') {
        for (let x = 0; x < 16; x++) {
          setPx(x, 3, 74, 76, 82, 1);
          setPx(x, 12, 74, 76, 82, 1);
        }
      } else {
        for (let y = 4; y <= 11; y++) {
          for (let x = 4; x <= 11; x++) {
            setPx(x, y, 102, 74, 42, 1);
          }
        }
      }
      return;

    case 'redstone_block':
      fillBaseNoise(setPx, 186, 32, 18, 1, 0.18, 51, 0.24);
      for (let i = 3; i <= 12; i++) {
        setPx(i, i, 234, 74, 52, 1);
      }
      return;

    case 'redstone_lamp': {
      const base = lit ? [246, 198, 102] : [118, 70, 42];
      fillBaseNoise(setPx, base[0], base[1], base[2], 1, 0.1, 52, 0.35);
      for (let i = 0; i < 16; i++) {
        setPx(i, 7, 68, 42, 26, 1);
        setPx(7, i, 68, 42, 26, 1);
      }
      return;
    }

    case 'note_block':
      fillBaseNoise(setPx, 118, 72, 52, 1, 0.12, 53, 0.28);
      if (slot !== 'top') {
        for (let y = 3; y <= 12; y++) {
          for (let x = 3; x <= 12; x++) {
            if (x === 3 || x === 12 || y === 3 || y === 12) {
              setPx(x, y, 66, 38, 28, 1);
            }
          }
        }
      }
      return;

    case 'target':
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const dist = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
          const isRed = dist < 2 || (dist >= 4 && dist < 5.8);
          if (isRed) setPx(x, y, 196, 46, 36, 1);
          else setPx(x, y, 228, 212, 196, 1);
        }
      }
      return;

    case 'emerald':
      fillBaseNoise(setPx, 54, 198, 102, 1, 0.1, 55, 0.22);
      for (let y = 3; y <= 12; y++) {
        for (let x = 3; x <= 12; x++) {
          setPx(x, y, 76, 226, 128, 1);
        }
      }
      setPx(5, 5, 192, 255, 214, 1);
      setPx(6, 5, 192, 255, 214, 1);
      setPx(5, 6, 192, 255, 214, 1);
      return;

    case 'glass':
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const border = x === 0 || x === 15 || y === 0 || y === 15;
          const glare = (x + y === 5 || x + y === 6) && x >= 2 && x <= 5;
          const glare2 = x + y === 24 && x >= 10 && x <= 13;
          if (glare || glare2) {
            setPx(x, y, 240, 250, 255, Math.min(1, alpha + 0.35));
          } else if (border) {
            setPx(x, y, Math.min(255, r + 35), Math.min(255, g + 35), Math.min(255, b + 35), Math.min(1, alpha + 0.28));
          } else {
            setPx(x, y, r, g, b, alpha * 0.65);
          }
        }
      }
      return;

    case 'packed_ice':
      fillBaseNoise(setPx, r, g, b, alpha, 0.08, 61, 0.1);
      for (let i = 2; i <= 11; i++) {
        setPx(i, 14 - i, 196, 226, 255, alpha);
        if (i < 9) setPx(i + 3, 15 - i, 182, 216, 255, alpha);
      }
      return;

    case 'planks':
      fillBaseNoise(setPx, r, g, b, 1, 0.08, 71, 0.1);
      for (let x = 0; x < 16; x++) {
        setPx(x, 4, r * 0.72, g * 0.72, b * 0.72, 1);
        setPx(x, 9, r * 0.72, g * 0.72, b * 0.72, 1);
        setPx(x, 14, r * 0.72, g * 0.72, b * 0.72, 1);
      }
      return;

    case 'log':
      if (slot === 'top') {
        fillBaseNoise(setPx, 168, 134, 88, 1, 0.08, 72, 0.25);
        for (let y = 3; y <= 12; y++) {
          for (let x = 3; x <= 12; x++) {
            if (x === 3 || x === 12 || y === 3 || y === 12) {
              setPx(x, y, 132, 102, 66, 1);
            }
          }
        }
      } else {
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const bark = x % 3 === 0 ? 0.84 : 1 + (hash2d(x, y, 73) - 0.5) * 0.14;
            setPx(x, y, r * bark, g * bark, b * bark, 1);
          }
        }
      }
      return;

    case 'leaves':
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const v = hash2d(x, y, 81);
          if (v < 0.22) {
            setPx(x, y, r * 0.62, g * 0.62, b * 0.62, 0.78);
          } else {
            const mult = v > 0.78 ? 1.18 : 0.96;
            setPx(x, y, r * mult, g * mult, b * mult, alpha);
          }
        }
      }
      return;

    case 'cobble':
    case 'deepslate':
      fillBaseNoise(setPx, r, g, b, alpha, 0.16, 91, 0.12);
      for (let x = 0; x < 16; x++) {
        setPx(x, 4, r * 0.75, g * 0.75, b * 0.75, alpha);
        setPx(x, 11, r * 0.75, g * 0.75, b * 0.75, alpha);
      }
      for (let y = 0; y < 5; y++) setPx(7, y, r * 0.75, g * 0.75, b * 0.75, alpha);
      for (let y = 5; y < 12; y++) setPx(12, y, r * 0.75, g * 0.75, b * 0.75, alpha);
      return;

    case 'smooth_stone':
      fillBaseNoise(setPx, r, g, b, 1, 0.05, 92, 0.14);
      if (slot !== 'top') {
        for (let x = 0; x < 16; x++) setPx(x, 8, r * 0.82, g * 0.82, b * 0.82, 1);
      }
      return;

    case 'obsidian':
      fillBaseNoise(setPx, r, g, b, 1, 0.22, 95, 0.14);
      setPx(4, 3, 118, 66, 178, 1);
      setPx(11, 9, 118, 66, 178, 1);
      setPx(6, 12, 92, 52, 146, 1);
      return;

    case 'glazed':
      fillBaseNoise(setPx, r, g, b, 1, 0.08, 98, 0.14);
      for (let i = 0; i < 16; i++) {
        setPx(i, i, 240, 242, 245, 0.75);
        setPx(15 - i, i, Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40), 0.9);
      }
      return;

    case 'scaffolding':
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const edge = x <= 2 || x >= 13 || y <= 2 || y >= 13;
          const lattice = (x + y) % 5 === 0;
          if (edge) setPx(x, y, 214, 178, 94, 1);
          else if (lattice) setPx(x, y, 184, 148, 72, 0.75);
          else setPx(x, y, 184, 148, 72, 0.15);
        }
      }
      return;

    default:
      fillBaseNoise(setPx, r, g, b, alpha, pattern === 'concrete' ? 0.05 : 0.1, 101, 0.1);
  }
}

const spriteCache = new Map<string, HTMLCanvasElement>();

export function getBlockFaceSprite(
  style: BlockVisualStyle,
  slot: FaceSlot,
  cameraRot: IsoRotation
): HTMLCanvasElement {
  // Only directional blocks vary per cameraRot
  const isDirectional =
    style.pattern === 'observer' ||
    style.pattern === 'piston' ||
    style.pattern === 'sticky_piston' ||
    style.pattern === 'dropper' ||
    style.pattern === 'chest' ||
    style.pattern === 'ender_chest';

  const rotKey = isDirectional ? cameraRot : 0;
  const key = `${style.pattern}|${style.r},${style.g},${style.b}|${Math.round(style.alpha * 100)}|${isDirectional ? style.facing : 'none'}|${style.lit ? 1 : 0}|${slot}|${rotKey}`;

  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(16, 16);
  const data = imgData.data;
  const shade = FACE_SHADE[slot];

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

  drawBlockFacePattern(setPx, style, slot, cameraRot);
  ctx.putImageData(imgData, 0, 0);

  spriteCache.set(key, canvas);
  return canvas;
}
