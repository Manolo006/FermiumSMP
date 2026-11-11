import { getBlockVisualStyle, type BlockVisualStyle } from './litematicBlocks';

export interface DecodedVoxel {
  x: number;
  y: number;
  z: number;
  styleIndex: number;
}

export interface ParsedLitematic {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  totalBlocks: number;
  paletteStyles: BlockVisualStyle[];
  /** Packed flat arrays for fast GC-free rendering & rotation */
  xs: Uint16Array;
  ys: Uint16Array;
  zs: Uint16Array;
  styles: Uint16Array;
}

interface NbtRegion {
  Position?: { x?: number; y?: number; z?: number };
  Size?: { x?: number; y?: number; z?: number };
  BlockStatePalette?: Array<{ Name?: string }>;
  BlockStates?: { hi: Uint32Array; lo: Uint32Array };
}

interface NbtRoot {
  Regions?: Record<string, NbtRegion>;
  Metadata?: { TotalBlocks?: number };
}

const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

function parseLitematicNbt(buffer: ArrayBuffer): NbtRoot {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  const readUByte = () => bytes[offset++];
  const readUShort = () => {
    const v = view.getUint16(offset, false);
    offset += 2;
    return v;
  };
  const readInt = () => {
    const v = view.getInt32(offset, false);
    offset += 4;
    return v;
  };
  const readString = () => {
    const len = readUShort();
    const s = decoder.decode(bytes.subarray(offset, offset + len));
    offset += len;
    return s;
  };

  function skipOrReadPayload(tagType: number, insideRegionTarget: boolean): unknown {
    switch (tagType) {
      case 0:
        return null;
      case 1:
        offset += 1;
        return 0;
      case 2:
        offset += 2;
        return 0;
      case 3:
        return readInt();
      case 4:
        offset += 8;
        return 0;
      case 5:
        offset += 4;
        return 0;
      case 6:
        offset += 8;
        return 0;
      case 7: {
        const len = readInt();
        offset += len;
        return null;
      }
      case 8:
        return readString();
      case 9: {
        const elemType = readUByte();
        const len = readInt();
        if (!insideRegionTarget) {
          for (let i = 0; i < len; i++) {
            skipOrReadPayload(elemType, false);
          }
          return null;
        }
        const arr = new Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = skipOrReadPayload(elemType, true);
        }
        return arr;
      }
      case 10: {
        const obj: Record<string, unknown> = {};
        while (offset < bytes.length) {
          const t = readUByte();
          if (t === 0) break;
          const name = readString();
          const needChildren =
            insideRegionTarget ||
            name === 'Regions' ||
            name === 'Metadata' ||
            name === 'BlockStatePalette' ||
            name === 'Position' ||
            name === 'Size';
          if (name === 'Entities' || name === 'TileEntities' || name === 'PendingBlockTicks' || name === 'PendingFluidTicks') {
            skipOrReadPayload(t, false);
          } else if (needChildren) {
            obj[name] = skipOrReadPayload(t, true);
          } else {
            obj[name] = skipOrReadPayload(t, false);
          }
        }
        return obj;
      }
      case 11: {
        const len = readInt();
        offset += len * 4;
        return null;
      }
      case 12: {
        const len = readInt();
        if (!insideRegionTarget) {
          offset += len * 8;
          return null;
        }
        const hi = new Uint32Array(len);
        const lo = new Uint32Array(len);
        for (let i = 0; i < len; i++) {
          hi[i] = view.getUint32(offset, false);
          lo[i] = view.getUint32(offset + 4, false);
          offset += 8;
        }
        return { hi, lo };
      }
      default:
        throw new Error(`Unsupported NBT tag type: ${tagType}`);
    }
  }

  readUByte(); // Root TAG_Compound (10)
  readString(); // Root name
  return skipOrReadPayload(10, true) as NbtRoot;
}

function getLongBits(
  hi: Uint32Array,
  lo: Uint32Array,
  longIdx: number,
  bitOffset: number,
  numBits: number
): number {
  const mask = (1 << numBits) - 1;
  if (bitOffset < 32) {
    if (bitOffset + numBits <= 32) {
      return (lo[longIdx] >>> bitOffset) & mask;
    }
    const lowCount = 32 - bitOffset;
    const lowPart = lo[longIdx] >>> bitOffset;
    const highMask = (1 << (numBits - lowCount)) - 1;
    const highPart = (hi[longIdx] & highMask) << lowCount;
    return (lowPart | highPart) >>> 0;
  }
  const hiOff = bitOffset - 32;
  return (hi[longIdx] >>> hiOff) & mask;
}

async function gunzipIfNeeded(rawBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(rawBuffer, 0, Math.min(2, rawBuffer.byteLength));
  // Gzip magic header: 0x1f 0x8b
  if (head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser does not support DecompressionStream');
    }
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Blob([rawBuffer]).stream().pipeThrough(ds);
    return await new Response(decompressedStream).arrayBuffer();
  }
  return rawBuffer;
}

const schematicCache = new Map<string, Promise<ParsedLitematic>>();

export function parseLitematicFromUrl(url: string): Promise<ParsedLitematic> {
  const existing = schematicCache.get(url);
  if (existing) return existing;

  const task = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch schematic: ${res.status}`);
    }
    const rawBuffer = await res.arrayBuffer();
    const nbtBuffer = await gunzipIfNeeded(rawBuffer);
    const root = parseLitematicNbt(nbtBuffer);
    const regions = Object.values(root.Regions || {});

    const paletteStyles: BlockVisualStyle[] = [];
    const styleIdMap = new Map<string, number>();

    const getStyleId = (name: string): number => {
      let id = styleIdMap.get(name);
      if (id === undefined) {
        id = paletteStyles.length;
        paletteStyles.push(getBlockVisualStyle(name));
        styleIdMap.set(name, id);
      }
      return id;
    };

    const rawX: number[] = [];
    const rawY: number[] = [];
    const rawZ: number[] = [];
    const rawStyle: number[] = [];

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (const reg of regions) {
      if (!reg.Size || !reg.BlockStatePalette || !reg.BlockStates) continue;
      const sxRaw = reg.Size.x ?? 0;
      const syRaw = reg.Size.y ?? 0;
      const szRaw = reg.Size.z ?? 0;
      const absX = Math.abs(sxRaw);
      const absY = Math.abs(syRaw);
      const absZ = Math.abs(szRaw);
      if (absX === 0 || absY === 0 || absZ === 0) continue;

      const posX = reg.Position?.x ?? 0;
      const posY = reg.Position?.y ?? 0;
      const posZ = reg.Position?.z ?? 0;
      const signX = sxRaw >= 0 ? 1 : -1;
      const signY = syRaw >= 0 ? 1 : -1;
      const signZ = szRaw >= 0 ? 1 : -1;

      const palette = reg.BlockStatePalette;
      const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
      const mask = (1 << bits) - 1;
      const { hi, lo } = reg.BlockStates;
      const layerStride = absX * absZ;

      const paletteAirFlags = new Uint8Array(palette.length);
      const paletteStyleIds = new Int32Array(palette.length);
      for (let p = 0; p < palette.length; p++) {
        const bName = palette[p]?.Name || 'minecraft:air';
        if (AIR_NAMES.has(bName)) {
          paletteAirFlags[p] = 1;
          paletteStyleIds[p] = -1;
        } else {
          paletteStyleIds[p] = getStyleId(bName);
        }
      }

      const vol = absX * absY * absZ;
      for (let idx = 0; idx < vol; idx++) {
        const bitPos = idx * bits;
        const lIdx = Math.floor(bitPos / 64);
        const bOff = bitPos - lIdx * 64;

        let palIdx: number;
        if (bOff + bits <= 64) {
          palIdx = getLongBits(hi, lo, lIdx, bOff, bits);
        } else {
          const firstBits = 64 - bOff;
          const p1 = getLongBits(hi, lo, lIdx, bOff, firstBits);
          const p2 = getLongBits(hi, lo, lIdx + 1, 0, bits - firstBits);
          palIdx = p1 | (p2 << firstBits);
        }
        palIdx &= mask;

        if (palIdx >= palette.length || paletteAirFlags[palIdx] === 1) continue;

        const ly = Math.floor(idx / layerStride);
        const rem = idx - ly * layerStride;
        const lz = Math.floor(rem / absX);
        const lx = rem - lz * absX;

        const wx = posX + lx * signX;
        const wy = posY + ly * signY;
        const wz = posZ + lz * signZ;

        if (wx < minX) minX = wx;
        if (wy < minY) minY = wy;
        if (wz < minZ) minZ = wz;
        if (wx > maxX) maxX = wx;
        if (wy > maxY) maxY = wy;
        if (wz > maxZ) maxZ = wz;

        rawX.push(wx);
        rawY.push(wy);
        rawZ.push(wz);
        rawStyle.push(paletteStyleIds[palIdx]);
      }
    }

    if (rawX.length === 0) {
      return {
        sizeX: 1,
        sizeY: 1,
        sizeZ: 1,
        totalBlocks: 0,
        paletteStyles: [],
        xs: new Uint16Array(0),
        ys: new Uint16Array(0),
        zs: new Uint16Array(0),
        styles: new Uint16Array(0),
      };
    }

    const total = rawX.length;
    const xs = new Uint16Array(total);
    const ys = new Uint16Array(total);
    const zs = new Uint16Array(total);
    const styles = new Uint16Array(total);

    for (let i = 0; i < total; i++) {
      xs[i] = rawX[i] - minX;
      ys[i] = rawY[i] - minY;
      zs[i] = rawZ[i] - minZ;
      styles[i] = rawStyle[i];
    }

    return {
      sizeX: maxX - minX + 1,
      sizeY: maxY - minY + 1,
      sizeZ: maxZ - minZ + 1,
      totalBlocks: total,
      paletteStyles,
      xs,
      ys,
      zs,
      styles,
    };
  })().catch((err) => {
    schematicCache.delete(url);
    throw err;
  });

  schematicCache.set(url, task);
  return task;
}
