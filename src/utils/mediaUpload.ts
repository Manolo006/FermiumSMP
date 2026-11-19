import { parseLitematicFromBuffer } from './litematicParser';

export interface CompressedImageResult {
  dataUrl: string;
  byteSize: number;
  width: number;
  height: number;
}

export interface ParsedLitematicUpload {
  dataUrl: string;
  sizeLabel: string;
  dimensions: string;
  blocks: number;
  suggestedName: string;
  byteSize: number;
}

export interface MojangPlayerLookupResult {
  uuid?: string;
  exactName?: string;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossibile leggere il file immagine selezionato.'));
    };
    img.src = url;
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const b64Len = dataUrl.length - (commaIdx + 1);
  return Math.floor((b64Len * 3) / 4);
}

export function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Ridimensiona e comprime lato browser un'immagine in WebP (fallback JPEG) per
 * restare sotto il limite di Firestore Spark Free senza perdere nitidezza.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1600,
  maxBytes = 320_000
): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Seleziona un file immagine valido (PNG, JPG, WebP).');
  }

  const img = await loadImageElement(file);
  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;

  const qualities = [0.84, 0.74, 0.64, 0.52, 0.42];
  const scaleSteps = [1, 0.78, 0.6, 0.45];

  const baseScale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contesto canvas non disponibile nel browser.');
  }

  let bestUrl = '';
  let bestBytes = Infinity;
  let bestW = srcW;
  let bestH = srcH;

  for (const step of scaleSteps) {
    const w = Math.max(16, Math.round(srcW * baseScale * step));
    const h = Math.max(16, Math.round(srcH * baseScale * step));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of qualities) {
      let dataUrl = canvas.toDataURL('image/webp', q);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      const bytes = estimateBase64Bytes(dataUrl);
      if (bytes < bestBytes) {
        bestBytes = bytes;
        bestUrl = dataUrl;
        bestW = w;
        bestH = h;
      }
      if (bytes <= maxBytes) {
        return {
          dataUrl,
          byteSize: bytes,
          width: w,
          height: h,
        };
      }
    }
  }

  if (bestBytes > 750_000) {
    throw new Error('L’immagine supera il limite massimo consentito anche dopo la compressione.');
  }

  return {
    dataUrl: bestUrl,
    byteSize: bestBytes,
    width: bestW,
    height: bestH,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

/**
 * Legge e valida un file `.litematic`, ne estrae automaticamente dimensioni e
 * conteggio blocchi tramite il parser NBT, e lo codifica in Data URL per Firestore.
 */
export async function readLitematicFile(
  file: File,
  maxBytes = 680_000
): Promise<ParsedLitematicUpload> {
  if (!file.name.toLowerCase().endsWith('.litematic')) {
    throw new Error('Seleziona un file con estensione .litematic.');
  }
  if (file.size <= 0) {
    throw new Error('Il file .litematic selezionato è vuoto.');
  }
  if (file.size > maxBytes) {
    throw new Error(
      `Il file pesa ${formatBytesCompact(file.size)} e supera il limite di ~${formatBytesCompact(
        maxBytes
      )} per il salvataggio diretto gratuito su Firestore.`
    );
  }

  const buffer = await file.arrayBuffer();
  const parsed = await parseLitematicFromBuffer(buffer);
  const base64 = arrayBufferToBase64(buffer);
  const dataUrl = `data:application/octet-stream;base64,${base64}`;

  const suggestedName = file.name
    .replace(/\.litematic$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return {
    dataUrl,
    sizeLabel: formatBytesCompact(file.size),
    dimensions: `${parsed.sizeX} × ${parsed.sizeY} × ${parsed.sizeZ}`,
    blocks: parsed.totalBlocks,
    suggestedName: suggestedName || file.name,
    byteSize: file.size,
  };
}

/**
 * Cerca UUID ufficiale Mojang e capitalization esatta tramite PlayerDB (CORS-enabled).
 */
export async function lookupMojangPlayer(username: string): Promise<MojangPlayerLookupResult> {
  const clean = username.trim();
  if (clean.length < 2) return {};
  try {
    const res = await fetch(
      `https://playerdb.co/api/player/minecraft/${encodeURIComponent(clean)}`
    );
    if (!res.ok) return {};
    const json = (await res.json()) as {
      success?: boolean;
      data?: { player?: { raw_id?: string; username?: string } };
    };
    const player = json?.data?.player;
    if (!json?.success || !player) return {};
    return {
      uuid: typeof player.raw_id === 'string' ? player.raw_id.toLowerCase() : undefined,
      exactName: typeof player.username === 'string' ? player.username : undefined,
    };
  } catch {
    return {};
  }
}
