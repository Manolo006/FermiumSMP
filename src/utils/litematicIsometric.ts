import type { BlockVisualStyle } from './litematicBlocks';
import type { ParsedLitematic } from './litematicParser';
import {
  ensureMinecraftTextures,
  getBlockFaceSprite,
  type FaceSlot,
} from './litematicTextures';

export type IsoRotation = 0 | 1 | 2 | 3;

export interface IsoRenderOptions {
  width: number;
  height: number;
  rotation?: IsoRotation;
  zoom?: number;
  panX?: number;
  panY?: number;
  maxY?: number;
  showWireframe?: boolean;
}

const TAN30 = 0.57735027;
const INV_COS30 = 1.15470054;

function clampChannel(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function shadeRgba(
  r: number,
  g: number,
  b: number,
  alpha: number,
  factor: number
): string {
  const rr = clampChannel(r * factor);
  const gg = clampChannel(g * factor);
  const bb = clampChannel(b * factor);
  if (alpha >= 0.99) {
    return `rgb(${rr},${gg},${bb})`;
  }
  return `rgba(${rr},${gg},${bb},${alpha.toFixed(2)})`;
}

function packCoordKey(u: number, y: number, v: number): number {
  return (u * 4096 + v) * 512 + y;
}

interface DrawBoxParams {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  originX: number;
  originY: number;
  hw: number;
  hh: number;
  ch: number;
  u0: number;
  u1: number;
  y0: number;
  y1: number;
  v0: number;
  v1: number;
  topFill: string;
  leftFill: string;
  rightFill: string;
  outline: string | null;
  sprites?: {
    top: HTMLCanvasElement;
    left: HTMLCanvasElement;
    right: HTMLCanvasElement;
  };
}

function drawIsoBox(p: DrawBoxParams): void {
  const {
    ctx,
    dpr,
    originX,
    originY,
    hw,
    hh,
    ch,
    u0,
    u1,
    y0,
    y1,
    v0,
    v1,
    topFill,
    leftFill,
    rightFill,
    outline,
    sprites,
  } = p;

  const du = u1 - u0;
  const dv = v1 - v0;
  const dy = y1 - y0;

  // Top face 4 corners: (u0,y1,v0), (u1,y1,v0), (u1,y1,v1), (u0,y1,v1)
  const tTopX = originX + (u0 - v0) * hw;
  const tTopY = originY + (u0 + v0) * hh - y1 * ch;

  const uVecX = du * hw;
  const uVecY = du * hh;
  const vVecX = -dv * hw;
  const vVecY = dv * hh;
  const hVecY = dy * ch;

  const tRightX = tTopX + uVecX;
  const tRightY = tTopY + uVecY;
  const tBotX = tTopX + uVecX + vVecX;
  const tBotY = tTopY + uVecY + vVecY;
  const tLeftX = tTopX + vVecX;
  const tLeftY = tTopY + vVecY;

  if (sprites) {
    // Top rhombus textured
    ctx.setTransform(
      uVecX * dpr,
      uVecY * dpr,
      vVecX * dpr,
      vVecY * dpr,
      tTopX * dpr,
      tTopY * dpr
    );
    ctx.drawImage(sprites.top, 0, 0, 16, 16, 0, 0, 1, 1);

    // Front-left parallelogram textured (+v face visible along u axis -> edge tLeft -> tBot)
    ctx.setTransform(
      uVecX * dpr,
      uVecY * dpr,
      0,
      hVecY * dpr,
      tLeftX * dpr,
      tLeftY * dpr
    );
    ctx.drawImage(sprites.left, 0, 0, 16, 16, 0, 0, 1, 1);

    // Front-right parallelogram textured (+u face visible along -v axis -> edge tBot -> tRight)
    ctx.setTransform(
      -vVecX * dpr,
      -vVecY * dpr,
      0,
      hVecY * dpr,
      tBotX * dpr,
      tBotY * dpr
    );
    ctx.drawImage(sprites.right, 0, 0, 16, 16, 0, 0, 1, 1);

    // Restore DPR transform for crisp optional edges
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (outline) {
      ctx.strokeStyle = outline;
      ctx.beginPath();
      ctx.moveTo(tTopX, tTopY);
      ctx.lineTo(tRightX, tRightY);
      ctx.lineTo(tBotX, tBotY);
      ctx.lineTo(tLeftX, tLeftY);
      ctx.closePath();
      ctx.moveTo(tLeftX, tLeftY);
      ctx.lineTo(tLeftX, tLeftY + hVecY);
      ctx.lineTo(tBotX, tBotY + hVecY);
      ctx.lineTo(tRightX, tRightY + hVecY);
      ctx.lineTo(tRightX, tRightY);
      ctx.moveTo(tBotX, tBotY);
      ctx.lineTo(tBotX, tBotY + hVecY);
      ctx.stroke();
    }
    return;
  }

  // Fallback shaded solid polygon mode
  ctx.fillStyle = topFill;
  ctx.beginPath();
  ctx.moveTo(tTopX, tTopY);
  ctx.lineTo(tRightX, tRightY);
  ctx.lineTo(tBotX, tBotY);
  ctx.lineTo(tLeftX, tLeftY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline || topFill;
  ctx.stroke();

  ctx.fillStyle = leftFill;
  ctx.beginPath();
  ctx.moveTo(tLeftX, tLeftY);
  ctx.lineTo(tBotX, tBotY);
  ctx.lineTo(tBotX, tBotY + hVecY);
  ctx.lineTo(tLeftX, tLeftY + hVecY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline || leftFill;
  ctx.stroke();

  ctx.fillStyle = rightFill;
  ctx.beginPath();
  ctx.moveTo(tBotX, tBotY);
  ctx.lineTo(tRightX, tRightY);
  ctx.lineTo(tRightX, tRightY + hVecY);
  ctx.lineTo(tBotX, tBotY + hVecY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline || rightFill;
  ctx.stroke();
}

export function renderLitematicToCanvas(
  canvas: HTMLCanvasElement,
  data: ParsedLitematic,
  options: IsoRenderOptions
): void {
  const {
    width,
    height,
    rotation = 0,
    zoom = 1,
    panX = 0,
    panY = 0,
    maxY,
    showWireframe = true,
  } = options;

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // Dark schematic blueprint backdrop gradient
  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    10,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.75
  );
  bg.addColorStop(0, '#1B212D');
  bg.addColorStop(1, '#0D1016');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (data.totalBlocks === 0) return;

  const { sizeX, sizeY, sizeZ, xs, ys, zs, styles, paletteStyles, totalBlocks } = data;
  const activeMaxY = maxY !== undefined ? Math.min(sizeY - 1, Math.max(0, maxY)) : sizeY - 1;

  const spanU = rotation === 1 || rotation === 3 ? sizeZ : sizeX;
  const spanV = rotation === 1 || rotation === 3 ? sizeX : sizeZ;

  const pad = Math.min(width, height) * 0.1;
  const normW = Math.max(1, spanU + spanV);
  const normH = Math.max(1, normW * TAN30 + sizeY * INV_COS30);
  const fitHw = Math.min((width - pad * 2) / normW, (height - pad * 2) / normH);
  const hw = Math.min(30 * zoom, fitHw * zoom);
  const hh = hw * TAN30;
  const ch = hw * INV_COS30;

  const originX = width * 0.5 + (spanV - spanU) * hw * 0.5 + panX;
  const originY = height * 0.5 + (sizeY * ch - (spanU + spanV) * hh) * 0.5 + panY;

  const projX = (u: number, v: number) => originX + (u - v) * hw;
  const projY = (u: number, y: number, v: number) =>
    originY + (u + v) * hh - y * ch;

  // Draw ground grid & back Litematica selection wireframe
  if (showWireframe) {
    ctx.save();
    ctx.fillStyle = 'rgba(240, 136, 50, 0.03)';
    ctx.beginPath();
    ctx.moveTo(projX(0, 0), projY(0, 0, 0));
    ctx.lineTo(projX(spanU, 0), projY(spanU, 0, 0));
    ctx.lineTo(projX(spanU, spanV), projY(spanU, 0, spanV));
    ctx.lineTo(projX(0, spanV), projY(0, 0, spanV));
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(projX(0, 0), projY(0, 0, 0));
    ctx.lineTo(projX(spanU, 0), projY(spanU, 0, 0));
    ctx.lineTo(projX(spanU, spanV), projY(spanU, 0, spanV));
    ctx.lineTo(projX(0, spanV), projY(0, 0, spanV));
    ctx.closePath();

    ctx.moveTo(projX(0, 0), projY(0, 0, 0));
    ctx.lineTo(projX(0, 0), projY(0, sizeY, 0));
    ctx.lineTo(projX(spanU, 0), projY(spanU, sizeY, 0));
    ctx.moveTo(projX(0, 0), projY(0, sizeY, 0));
    ctx.lineTo(projX(0, spanV), projY(0, sizeY, spanV));
    ctx.stroke();
    ctx.restore();
  }

  // Transform voxels into rotated camera space
  const uArr = new Uint16Array(totalBlocks);
  const vArr = new Uint16Array(totalBlocks);

  if (rotation === 0) {
    uArr.set(xs);
    vArr.set(zs);
  } else if (rotation === 1) {
    for (let i = 0; i < totalBlocks; i++) {
      uArr[i] = zs[i];
      vArr[i] = sizeX - 1 - xs[i];
    }
  } else if (rotation === 2) {
    for (let i = 0; i < totalBlocks; i++) {
      uArr[i] = sizeX - 1 - xs[i];
      vArr[i] = sizeZ - 1 - zs[i];
    }
  } else {
    for (let i = 0; i < totalBlocks; i++) {
      uArr[i] = sizeZ - 1 - zs[i];
      vArr[i] = xs[i];
    }
  }

  const canPackKey = spanU < 4096 && spanV < 4096 && sizeY < 512;
  const opaqueSet = canPackKey ? new Set<number>() : null;
  if (opaqueSet) {
    for (let i = 0; i < totalBlocks; i++) {
      if (ys[i] <= activeMaxY && paletteStyles[styles[i]].isOpaque) {
        opaqueSet.add(packCoordKey(uArr[i], ys[i], vArr[i]));
      }
    }
  }

  const visibleIndices: number[] = [];
  for (let i = 0; i < totalBlocks; i++) {
    const y = ys[i];
    if (y > activeMaxY) continue;
    if (opaqueSet) {
      const u = uArr[i];
      const v = vArr[i];
      if (
        opaqueSet.has(packCoordKey(u + 1, y, v)) &&
        opaqueSet.has(packCoordKey(u, y, v + 1)) &&
        opaqueSet.has(packCoordKey(u, y + 1, v))
      ) {
        continue;
      }
    }
    visibleIndices.push(i);
  }

  visibleIndices.sort((a, b) => {
    const da = uArr[a] + ys[a] + vArr[a];
    const db = uArr[b] + ys[b] + vArr[b];
    if (da !== db) return da - db;
    const ya = ys[a];
    const yb = ys[b];
    if (ya !== yb) return ya - yb;
    return uArr[a] - uArr[b];
  });

  // Precompute palette flat colors & cached 16x16 Minecraft textures
  const topColors = paletteStyles.map((s) => shadeRgba(s.r, s.g, s.b, s.alpha, 1.07));
  const leftColors = paletteStyles.map((s) => shadeRgba(s.r, s.g, s.b, s.alpha, 0.85));
  const rightColors = paletteStyles.map((s) => shadeRgba(s.r, s.g, s.b, s.alpha, 0.68));

  const isMacroScale = hw < 1.5;
  const useTextured = hw >= 3.2;
  const useGeometry = hw >= 3.8;
  const useAO = hw >= 4.0 && opaqueSet !== null;

  const spriteTriples = useTextured
    ? paletteStyles.map((st: BlockVisualStyle) => ({
        top: getBlockFaceSprite(st, 'top', rotation),
        left: getBlockFaceSprite(st, 'left' as FaceSlot, rotation),
        right: getBlockFaceSprite(st, 'right', rotation),
      }))
    : null;

  if (isMacroScale) {
    const dotW = Math.max(1.6, hw * 2.1);
    const dotH = Math.max(1.6, ch * 1.45);
    for (let k = 0; k < visibleIndices.length; k++) {
      const i = visibleIndices[k];
      const st = paletteStyles[styles[i]];
      const cx = originX + (uArr[i] - vArr[i]) * hw;
      const cy = originY + (uArr[i] + vArr[i]) * hh - ys[i] * ch;
      if (cx < -10 || cx > width + 10 || cy < -10 || cy > height + 10) continue;

      // Lift very dark macro blocks slightly so obsidian/deepslate silhouettes stand out cleanly
      const rr = Math.max(58, st.r);
      const gg = Math.max(60, st.g);
      const bb = Math.max(66, st.b);
      ctx.fillStyle =
        st.alpha >= 0.99 ? `rgb(${rr},${gg},${bb})` : `rgba(${rr},${gg},${bb},${st.alpha.toFixed(2)})`;
      ctx.fillRect(cx - dotW * 0.5, cy - dotH * 0.65, dotW, dotH);
    }
  } else {
    ctx.lineWidth = hw >= 10 ? 0.75 : 0.45;
    const cubeOutline = hw >= 6.0 ? 'rgba(8, 10, 14, 0.25)' : null;

    for (let k = 0; k < visibleIndices.length; k++) {
      const i = visibleIndices[k];
      const stIdx = styles[i];
      const style = paletteStyles[stIdx];
      const u = uArr[i];
      const y = ys[i];
      const v = vArr[i];

      const cx = originX + (u - v) * hw;
      const cy = originY + (u + v) * hh - y * ch;
      if (cx + hw < -6 || cx - hw > width + 6 || cy - ch > height + 6 || cy + hh * 2 < -6) {
        continue;
      }

      const sprites = spriteTriples && style.alpha >= 0.9 ? spriteTriples[stIdx] : undefined;
      const outline = style.alpha >= 0.9 ? cubeOutline : null;

      if (useGeometry && style.shape === 'jelly') {
        // Inner darker solid core + outer real Minecraft slime/honey texture
        const isHoney = style.pattern === 'honey';
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u + 0.24,
          u1: u + 0.76,
          y0: y + 0.24,
          y1: y + 0.76,
          v0: v + 0.24,
          v1: v + 0.76,
          topFill: isHoney ? '#D98614' : '#53A83B',
          leftFill: isHoney ? '#B96F0E' : '#408A2C',
          rightFill: isHoney ? '#9A5B09' : '#326F21',
          outline: null,
        });
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u,
          u1: u + 1,
          y0: y,
          y1: y + 1,
          v0: v,
          v1: v + 1,
          topFill: isHoney ? 'rgba(246, 186, 56, 0.56)' : 'rgba(126, 224, 92, 0.54)',
          leftFill: isHoney ? 'rgba(214, 154, 40, 0.56)' : 'rgba(98, 188, 70, 0.54)',
          rightFill: isHoney ? 'rgba(182, 128, 30, 0.56)' : 'rgba(78, 154, 54, 0.54)',
          outline: 'rgba(15, 20, 15, 0.24)',
          sprites: spriteTriples ? spriteTriples[stIdx] : undefined,
        });
      } else if (useGeometry && style.shape === 'hopper') {
        // Spout bottom + wide funnel rim with real hopper textures
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u + 0.3,
          u1: u + 0.7,
          y0: y,
          y1: y + 0.55,
          v0: v + 0.3,
          v1: v + 0.7,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u + 0.04,
          u1: u + 0.96,
          y0: y + 0.55,
          y1: y + 0.98,
          v0: v + 0.04,
          v1: v + 0.96,
          topFill: '#4C505A',
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });
      } else if (useGeometry && style.shape === 'chest') {
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u + 0.07,
          u1: u + 0.93,
          y0: y,
          y1: y + 0.88,
          v0: v + 0.07,
          v1: v + 0.93,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });
      } else if (useGeometry && style.shape === 'slab') {
        const y0 = style.isTopHalf ? y + 0.5 : y;
        const y1 = style.isTopHalf ? y + 1 : y + 0.5;
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u,
          u1: u + 1,
          y0,
          y1,
          v0: v,
          v1: v + 1,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });
      } else if (useGeometry && style.shape === 'stairs') {
        // Bottom full-width slab + back upper step
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u,
          u1: u + 1,
          y0: y,
          y1: y + 0.5,
          v0: v,
          v1: v + 1,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u,
          u1: u + 0.5,
          y0: y + 0.5,
          y1: y + 1,
          v0: v,
          v1: v + 1,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });
      } else if (useGeometry && style.shape === 'torch') {
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u + 0.42,
          u1: u + 0.58,
          y0: y,
          y1: y + 0.62,
          v0: v + 0.42,
          v1: v + 0.58,
          topFill: '#FF4530',
          leftFill: '#9B2214',
          rightFill: '#7D190E',
          outline: null,
        });
      } else if (useGeometry && style.shape === 'glass') {
        const glassSprites = spriteTriples ? spriteTriples[stIdx] : undefined;
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u,
          u1: u + 1,
          y0: y,
          y1: y + style.heightScale,
          v0: v,
          v1: v + 1,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline: null,
          sprites: glassSprites,
        });
      } else {
        // Full cube, plate, rail, wire, or fluid
        drawIsoBox({
          ctx,
          dpr,
          originX,
          originY,
          hw,
          hh,
          ch,
          u0: u,
          u1: u + 1,
          y0: y,
          y1: y + style.heightScale,
          v0: v,
          v1: v + 1,
          topFill: topColors[stIdx],
          leftFill: leftColors[stIdx],
          rightFill: rightColors[stIdx],
          outline,
          sprites,
        });

        // Subtle redstone torch nubs on repeaters / comparators
        if (
          useGeometry &&
          (style.pattern === 'smooth_stone' && style.shape === 'plate') &&
          hw >= 6
        ) {
          drawIsoBox({
            ctx,
            dpr,
            originX,
            originY,
            hw,
            hh,
            ch,
            u0: u + 0.35,
            u1: u + 0.65,
            y0: y + 0.18,
            y1: y + 0.36,
            v0: v + 0.35,
            v1: v + 0.65,
            topFill: style.lit ? '#FF5538' : '#A6281C',
            leftFill: '#8E1E14',
            rightFill: '#6E140C',
            outline: null,
          });
        }
      }

      // Corner Ambient Occlusion on top faces when walls stand adjacent on layer y+1
      if (useAO && style.isOpaque && !opaqueSet!.has(packCoordKey(u, y + 1, v))) {
        const hasBackU = opaqueSet!.has(packCoordKey(u - 1, y + 1, v));
        const hasBackV = opaqueSet!.has(packCoordKey(u, y + 1, v - 1));
        if (hasBackU || hasBackV) {
          const tTopX = originX + (u - v) * hw;
          const tTopY = originY + (u + v) * hh - (y + 1) * ch;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          if (hasBackU) {
            ctx.beginPath();
            ctx.moveTo(tTopX, tTopY);
            ctx.lineTo(tTopX - hw, tTopY + hh);
            ctx.lineTo(tTopX - hw * 0.72, tTopY + hh * 1.28);
            ctx.lineTo(tTopX + hw * 0.28, tTopY + hh * 0.28);
            ctx.closePath();
            ctx.fill();
          }
          if (hasBackV) {
            ctx.beginPath();
            ctx.moveTo(tTopX, tTopY);
            ctx.lineTo(tTopX + hw, tTopY + hh);
            ctx.lineTo(tTopX + hw * 0.72, tTopY + hh * 1.28);
            ctx.lineTo(tTopX - hw * 0.28, tTopY + hh * 0.28);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  }

  // Front subtle Litematica selection wireframe
  if (showWireframe) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(projX(spanU, 0), projY(spanU, sizeY, 0));
    ctx.lineTo(projX(spanU, spanV), projY(spanU, sizeY, spanV));
    ctx.lineTo(projX(0, spanV), projY(0, sizeY, spanV));
    ctx.moveTo(projX(spanU, spanV), projY(spanU, sizeY, spanV));
    ctx.lineTo(projX(spanU, spanV), projY(spanU, 0, spanV));
    ctx.stroke();
    ctx.restore();
  }
}

const previewDataUrlCache = new Map<string, Promise<string>>();

export function getAutoIsometricPreviewUrl(
  fileUrl: string,
  parseFn: (url: string) => Promise<ParsedLitematic>,
  rotation: IsoRotation = 0
): Promise<string> {
  const key = `${fileUrl}#mc1#rot=${rotation}`;
  const existing = previewDataUrlCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    const parsed = await parseFn(fileUrl);
    if (parsed.totalBlocks === 0) return '';
    await ensureMinecraftTextures(parsed.paletteStyles);
    const canvas = document.createElement('canvas');
    renderLitematicToCanvas(canvas, parsed, {
      width: 960,
      height: 600,
      rotation,
      zoom: 1,
      showWireframe: true,
    });
    return canvas.toDataURL('image/png');
  })().catch((err) => {
    previewDataUrlCache.delete(key);
    throw err;
  });

  previewDataUrlCache.set(key, task);
  return task;
}
