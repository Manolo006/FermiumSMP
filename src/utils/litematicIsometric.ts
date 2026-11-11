import type { ParsedLitematic } from './litematicParser';

export type IsoRotation = 0 | 1 | 2 | 3;

export interface IsoRenderOptions {
  width: number;
  height: number;
  rotation?: IsoRotation;
  zoom?: number;
  panX?: number;
  panY?: number;
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
    showWireframe = true,
  } = options;

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Blueprint / Litematica dark backdrop gradient
  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    10,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72
  );
  bg.addColorStop(0, '#191E28');
  bg.addColorStop(1, '#0D1015');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (data.totalBlocks === 0) return;

  const { sizeX, sizeY, sizeZ, xs, ys, zs, styles, paletteStyles, totalBlocks } = data;

  const spanU = rotation === 1 || rotation === 3 ? sizeZ : sizeX;
  const spanV = rotation === 1 || rotation === 3 ? sizeX : sizeZ;

  const pad = Math.min(width, height) * 0.11;
  const normW = Math.max(1, spanU + spanV);
  const normH = Math.max(1, normW * TAN30 + sizeY * INV_COS30);
  const fitHw = Math.min((width - pad * 2) / normW, (height - pad * 2) / normH);
  const hw = Math.min(26 * zoom, fitHw * zoom);
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
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Bottom perimeter rectangle
    ctx.moveTo(projX(0, 0), projY(0, 0, 0));
    ctx.lineTo(projX(spanU, 0), projY(spanU, 0, 0));
    ctx.lineTo(projX(spanU, spanV), projY(spanU, 0, spanV));
    ctx.lineTo(projX(0, spanV), projY(0, 0, spanV));
    ctx.closePath();

    // Back 3 edges of bounding box
    ctx.moveTo(projX(0, 0), projY(0, 0, 0));
    ctx.lineTo(projX(0, 0), projY(0, sizeY, 0));
    ctx.lineTo(projX(spanU, 0), projY(spanU, sizeY, 0));
    ctx.moveTo(projX(0, 0), projY(0, sizeY, 0));
    ctx.lineTo(projX(0, spanV), projY(0, sizeY, spanV));
    ctx.stroke();

    // Subtle orange ground fill
    ctx.fillStyle = 'rgba(240, 136, 50, 0.03)';
    ctx.beginPath();
    ctx.moveTo(projX(0, 0), projY(0, 0, 0));
    ctx.lineTo(projX(spanU, 0), projY(spanU, 0, 0));
    ctx.lineTo(projX(spanU, spanV), projY(spanU, 0, spanV));
    ctx.lineTo(projX(0, spanV), projY(0, 0, spanV));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Rotate coordinates into active isometric camera space
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

  // Build opaque occupancy set to cull completely hidden interior blocks
  const canPackKey = spanU < 4096 && spanV < 4096 && sizeY < 512;
  const opaqueSet = canPackKey ? new Set<number>() : null;
  if (opaqueSet) {
    for (let i = 0; i < totalBlocks; i++) {
      if (paletteStyles[styles[i]].isOpaque) {
        opaqueSet.add(packCoordKey(uArr[i], ys[i], vArr[i]));
      }
    }
  }

  // Filter visible voxels and sort back-to-front by exact isometric depth key
  const visibleIndices: number[] = [];
  for (let i = 0; i < totalBlocks; i++) {
    if (opaqueSet) {
      const u = uArr[i];
      const y = ys[i];
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

  // Precompute palette face colors for zero string allocation during drawing
  const topColors = paletteStyles.map((s) =>
    shadeRgba(s.r, s.g, s.b, s.alpha, 1.08)
  );
  const leftColors = paletteStyles.map((s) =>
    shadeRgba(s.r, s.g, s.b, s.alpha, 0.85)
  );
  const rightColors = paletteStyles.map((s) =>
    shadeRgba(s.r, s.g, s.b, s.alpha, 0.68)
  );

  // Macro mode for mega-perimeters (e.g. 528x528, 1024x1024) vs Detailed Cube mode
  const isMacroScale = hw < 1.6;
  const darkOutline = hw >= 5.0;
  ctx.lineWidth = hw >= 10 ? 0.8 : 0.55;

  if (isMacroScale) {
    const dotW = Math.max(1.5, hw * 2.15);
    const dotH = Math.max(1.5, ch * 1.4);
    for (let k = 0; k < visibleIndices.length; k++) {
      const i = visibleIndices[k];
      const u = uArr[i];
      const y = ys[i];
      const v = vArr[i];
      const cx = originX + (u - v) * hw;
      const cy = originY + (u + v) * hh - y * ch;
      if (cx < -10 || cx > width + 10 || cy < -10 || cy > height + 10) continue;
      ctx.fillStyle = topColors[styles[i]];
      ctx.fillRect(cx - dotW * 0.5, cy - dotH * 0.65, dotW, dotH);
    }
  } else {
    for (let k = 0; k < visibleIndices.length; k++) {
      const i = visibleIndices[k];
      const stIdx = styles[i];
      const style = paletteStyles[stIdx];
      const hScale = style.heightScale;
      const isOpaqueCube = style.alpha >= 0.99;
      const u = uArr[i];
      const y = ys[i];
      const v = vArr[i];

      const cx = originX + (u - v) * hw;
      const cy = originY + (u + v) * hh - y * ch;
      const topOffset = ch * hScale;

      if (cx + hw < -4 || cx - hw > width + 4 || cy - topOffset > height + 4 || cy + hh * 2 < -4) {
        continue;
      }

      const tTopY = cy - topOffset;
      const tSideY = cy + hh - topOffset;
      const tBotY = cy + hh * 2 - topOffset;
      const bSideY = cy + hh;
      const bBotY = cy + hh * 2;

      // Top face
      ctx.fillStyle = topColors[stIdx];
      ctx.beginPath();
      ctx.moveTo(cx, tTopY);
      ctx.lineTo(cx + hw, tSideY);
      ctx.lineTo(cx, tBotY);
      ctx.lineTo(cx - hw, tSideY);
      ctx.closePath();
      ctx.fill();
      if (isOpaqueCube) {
        ctx.strokeStyle = darkOutline ? 'rgba(10, 12, 16, 0.28)' : topColors[stIdx];
        ctx.stroke();
      }

      // Front-left face (+v)
      ctx.fillStyle = leftColors[stIdx];
      ctx.beginPath();
      ctx.moveTo(cx - hw, tSideY);
      ctx.lineTo(cx, tBotY);
      ctx.lineTo(cx, bBotY);
      ctx.lineTo(cx - hw, bSideY);
      ctx.closePath();
      ctx.fill();
      if (isOpaqueCube) {
        ctx.strokeStyle = darkOutline ? 'rgba(10, 12, 16, 0.28)' : leftColors[stIdx];
        ctx.stroke();
      }

      // Front-right face (+u)
      ctx.fillStyle = rightColors[stIdx];
      ctx.beginPath();
      ctx.moveTo(cx, tBotY);
      ctx.lineTo(cx + hw, tSideY);
      ctx.lineTo(cx + hw, bSideY);
      ctx.lineTo(cx, bBotY);
      ctx.closePath();
      ctx.fill();
      if (isOpaqueCube) {
        ctx.strokeStyle = darkOutline ? 'rgba(10, 12, 16, 0.28)' : rightColors[stIdx];
        ctx.stroke();
      }
    }
  }

  // Front subtle selection outline corners (classic Litematica feel)
  if (showWireframe) {
    ctx.save();
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
  const key = `${fileUrl}#rot=${rotation}`;
  const existing = previewDataUrlCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    const parsed = await parseFn(fileUrl);
    if (parsed.totalBlocks === 0) return '';
    const canvas = document.createElement('canvas');
    renderLitematicToCanvas(canvas, parsed, {
      width: 640,
      height: 400,
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
