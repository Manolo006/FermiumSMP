import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Box,
  Check,
  Compass,
  Copy,
  Flame,
  Globe2,
  Grid3X3,
  Info,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';

type LoaderType = 'portal' | 'pearl';
type TargetDimension = 'overworld' | 'nether';
type CalcMode = 'single' | 'area';
type AreaRequirement = 'entity' | 'redstone';

interface ChunkCellInfo {
  cx: number;
  cz: number;
  dx: number;
  dz: number;
  ticketLevel: number;
  tier: 'origin' | 'entity' | 'redstone' | 'lazy' | 'unloaded';
}

interface PlacedLoader {
  index: number;
  cx: number;
  cz: number;
  centerX: number;
  centerZ: number;
  pairedX: number;
  pairedZ: number;
  regionX: number;
  regionZ: number;
}

function toChunkCoord(blockCoord: number): number {
  return Math.floor(blockCoord / 16);
}

function toRegionCoord(chunkCoord: number): number {
  return Math.floor(chunkCoord / 32);
}

function chunkBounds(c: number): [number, number] {
  const min = c * 16;
  return [min, min + 15];
}

function mod16(n: number): number {
  return ((n % 16) + 16) % 16;
}

function classifyTicket(distChebyshev: number, loaderType: LoaderType): ChunkCellInfo['tier'] {
  if (loaderType === 'portal') {
    if (distChebyshev === 0) return 'origin';
    if (distChebyshev <= 1) return 'entity';
    if (distChebyshev === 2) return 'redstone';
    if (distChebyshev === 3) return 'lazy';
    return 'unloaded';
  }
  // Ender Pearl (1.21.2+): base ticket level 31 -> 1x1 entity, 3x3 redstone, 5x5 border/lazy
  if (distChebyshev === 0) return 'origin';
  if (distChebyshev === 1) return 'redstone';
  if (distChebyshev === 2) return 'lazy';
  return 'unloaded';
}

function ticketLevelFor(distChebyshev: number, loaderType: LoaderType): number {
  const base = loaderType === 'portal' ? 30 : 31;
  return base + distChebyshev;
}

function computeLoaderPositions(
  minChunk: number,
  maxChunk: number,
  radius: number
): number[] {
  const stride = radius * 2 + 1;
  const span = maxChunk - minChunk + 1;
  const count = Math.max(1, Math.ceil(span / stride));
  const coveredWidth = count * stride;
  const surplus = coveredWidth - span;
  const firstStart = minChunk - Math.floor(surplus / 2);

  const centers: number[] = [];
  for (let i = 0; i < count; i++) {
    centers.push(firstStart + i * stride + radius);
  }
  return centers;
}

export const ChunkLoaderPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [mode, setMode] = useState<CalcMode>('single');
  const [loaderType, setLoaderType] = useState<LoaderType>('portal');
  const [dimension, setDimension] = useState<TargetDimension>('overworld');

  // Single loader inputs
  const [blockXInput, setBlockXInput] = useState<string>('0');
  const [blockZInput, setBlockZInput] = useState<string>('0');
  const [selectedCell, setSelectedCell] = useState<{ cx: number; cz: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Area planner inputs
  const [x1Input, setX1Input] = useState<string>('-128');
  const [z1Input, setZ1Input] = useState<string>('-128');
  const [x2Input, setX2Input] = useState<string>('128');
  const [z2Input, setZ2Input] = useState<string>('128');
  const [areaReq, setAreaReq] = useState<AreaRequirement>('entity');

  const blockX = Number.isFinite(Number(blockXInput)) ? Math.floor(Number(blockXInput)) : 0;
  const blockZ = Number.isFinite(Number(blockZInput)) ? Math.floor(Number(blockZInput)) : 0;

  const centerCX = toChunkCoord(blockX);
  const centerCZ = toChunkCoord(blockZ);
  const [chunkMinX, chunkMaxX] = chunkBounds(centerCX);
  const [chunkMinZ, chunkMaxZ] = chunkBounds(centerCZ);
  const optimalPortalX = chunkMinX + 8;
  const optimalPortalZ = chunkMinZ + 8;

  const pairedPortalX =
    dimension === 'overworld' ? Math.floor(optimalPortalX / 8) : optimalPortalX * 8;
  const pairedPortalZ =
    dimension === 'overworld' ? Math.floor(optimalPortalZ / 8) : optimalPortalZ * 8;

  const regionX = toRegionCoord(centerCX);
  const regionZ = toRegionCoord(centerCZ);

  // 9x9 Grid centered on (centerCX, centerCZ)
  const gridCells: ChunkCellInfo[] = useMemo(() => {
    const out: ChunkCellInfo[] = [];
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        out.push({
          cx: centerCX + dx,
          cz: centerCZ + dz,
          dx,
          dz,
          ticketLevel: ticketLevelFor(dist, loaderType),
          tier: classifyTicket(dist, loaderType),
        });
      }
    }
    return out;
  }, [centerCX, centerCZ, loaderType]);

  const inspectedCell: ChunkCellInfo = useMemo(() => {
    if (selectedCell) {
      const found = gridCells.find((c) => c.cx === selectedCell.cx && c.cz === selectedCell.cz);
      if (found) return found;
    }
    return gridCells.find((c) => c.dx === 0 && c.dz === 0)!;
  }, [gridCells, selectedCell]);

  // Multi-loader Area calculations
  const areaPlan = useMemo(() => {
    const rawX1 = Number.isFinite(Number(x1Input)) ? Math.floor(Number(x1Input)) : 0;
    const rawZ1 = Number.isFinite(Number(z1Input)) ? Math.floor(Number(z1Input)) : 0;
    const rawX2 = Number.isFinite(Number(x2Input)) ? Math.floor(Number(x2Input)) : 0;
    const rawZ2 = Number.isFinite(Number(z2Input)) ? Math.floor(Number(z2Input)) : 0;

    const minX = Math.min(rawX1, rawX2);
    const maxX = Math.max(rawX1, rawX2);
    const minZ = Math.min(rawZ1, rawZ2);
    const maxZ = Math.max(rawZ1, rawZ2);

    const minCX = toChunkCoord(minX);
    const maxCX = toChunkCoord(maxX);
    const minCZ = toChunkCoord(minZ);
    const maxCZ = toChunkCoord(maxZ);

    const reqRadius =
      loaderType === 'portal' ? (areaReq === 'entity' ? 1 : 2) : areaReq === 'entity' ? 0 : 1;

    const centersX = computeLoaderPositions(minCX, maxCX, reqRadius);
    const centersZ = computeLoaderPositions(minCZ, maxCZ, reqRadius);

    const loaders: PlacedLoader[] = [];
    let idx = 1;
    for (const cz of centersZ) {
      for (const cx of centersX) {
        const centerX = cx * 16 + 8;
        const centerZ = cz * 16 + 8;
        const pairedX = dimension === 'overworld' ? Math.floor(centerX / 8) : centerX * 8;
        const pairedZ = dimension === 'overworld' ? Math.floor(centerZ / 8) : centerZ * 8;
        loaders.push({
          index: idx++,
          cx,
          cz,
          centerX,
          centerZ,
          pairedX,
          pairedZ,
          regionX: toRegionCoord(cx),
          regionZ: toRegionCoord(cz),
        });
      }
    }

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      minCX,
      maxCX,
      minCZ,
      maxCZ,
      chunkWidth: maxCX - minCX + 1,
      chunkDepth: maxCZ - minCZ + 1,
      totalAreaChunks: (maxCX - minCX + 1) * (maxCZ - minCZ + 1),
      reqRadius,
      cols: centersX.length,
      rows: centersZ.length,
      loaders,
    };
  }, [x1Input, z1Input, x2Input, z2Input, loaderType, areaReq, dimension]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const applyFromChunkInputs = (cxStr: string, czStr: string) => {
    const cx = Number.isFinite(Number(cxStr)) ? Math.floor(Number(cxStr)) : 0;
    const cz = Number.isFinite(Number(czStr)) ? Math.floor(Number(czStr)) : 0;
    setBlockXInput(String(cx * 16 + 8));
    setBlockZInput(String(cz * 16 + 8));
    setSelectedCell(null);
  };

  const tierColors: Record<ChunkCellInfo['tier'], string> = {
    origin:
      'bg-accent-orange/90 border-amber-200 text-[#101216] shadow-[0_0_16px_rgba(240,138,54,0.45)] font-bold',
    entity: 'bg-emerald-500/35 border-emerald-400/55 text-emerald-100 hover:bg-emerald-500/50',
    redstone: 'bg-sky-500/25 border-sky-400/45 text-sky-100 hover:bg-sky-500/40',
    lazy: 'bg-white/[0.08] border-white/20 text-text-secondary hover:bg-white/[0.14]',
    unloaded: 'bg-[#0D0F13]/80 border-white/[0.05] text-text-muted/45 hover:bg-white/[0.05]',
  };

  const tierDescription = (tier: ChunkCellInfo['tier']) => {
    if (tier === 'origin') {
      return {
        title: isIt ? 'Origine Ticket (Centro Loader)' : 'Ticket Origin (Loader Center)',
        desc: isIt
          ? 'Chunk esatto in cui risiede il portale o la pearl. Tutte le entità, tile-entity e redstone vengono processate al 100%.'
          : 'Exact chunk containing the portal or pearl. Entities, block entities, and redstone tick at full speed.',
        entities: true,
        redstone: true,
      };
    }
    if (tier === 'entity') {
      return {
        title: isIt ? 'Zona Entity-Ticking (3×3)' : 'Entity-Ticking Zone (3×3)',
        desc: isIt
          ? 'Caricamento completo delle entità: mob, minecart, item a terra, drop e circuiti redstone attivi.'
          : 'Full entity ticking: mobs, minecarts, dropped items, and redstone contraptions all process normally.',
        entities: true,
        redstone: true,
      };
    }
    if (tier === 'redstone') {
      return {
        title: isIt ? 'Zona Redstone / Block-Ticking' : 'Redstone / Block-Ticking Zone',
        desc: isIt
          ? 'Redstone, hopper, pistoni e aggiornamenti blocchi attivi. Le entità (mob/item/minecart) in quest’anello sono congelate!'
          : 'Redstone, hoppers, pistons, and block updates run. Entities (mobs/items/minecarts) in this ring do NOT process!',
        entities: false,
        redstone: true,
      };
    }
    if (tier === 'lazy') {
      return {
        title: isIt ? 'Anello Border / Lazy Chunks' : 'Border / Lazy Chunks Ring',
        desc: isIt
          ? 'Chunk caricati in memoria ma inattivi (niente tick blocchi né entità). Evita di far passare linee redstone o minecart qui.'
          : 'Chunks remain loaded in memory but idle (no block or entity ticking). Avoid running redstone or rails here.',
        entities: false,
        redstone: false,
      };
    }
    return {
      title: isIt ? 'Esterno al Raggio (Non Caricato)' : 'Outside Radius (Unloaded)',
      desc: isIt
        ? 'Oltre il livello ticket 33: questi chunk non vengono caricati da questo loader.'
        : 'Beyond ticket level 33: these chunks are unloaded by this chunk loader.',
      entities: false,
      redstone: false,
    };
  };

  const inspectedMeta = tierDescription(inspectedCell.tier);
  const [inspMinX, inspMaxX] = chunkBounds(inspectedCell.cx);
  const [inspMinZ, inspMaxZ] = chunkBounds(inspectedCell.cz);

  const exportLoadersList = areaPlan.loaders
    .map(
      (l) =>
        `#${l.index} | Chunk [${l.cx}, ${l.cz}] | ${
          dimension === 'overworld' ? 'Overworld' : 'Nether'
        }: X=${l.centerX}, Z=${l.centerZ} | ${
          dimension === 'overworld' ? 'Nether Portal' : 'Overworld Portal'
        }: X=${l.pairedX}, Z=${l.pairedZ}`
    )
    .join('\n');

  const entitySpanBlocks = loaderType === 'portal' ? '48×48 (3×3)' : '16×16 (1×1)';
  const redstoneSpanBlocks = loaderType === 'portal' ? '80×80 (5×5)' : '48×48 (3×3)';
  const totalSpanBlocks = loaderType === 'portal' ? '112×112 (7×7)' : '80×80 (5×5)';

  return (
    <div className="pt-28 pb-24 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-3">
          <Badge variant="orange">
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Minecraft Java · Chunk Tickets</span>
          </Badge>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary tracking-tight">
            {isIt ? 'Chunk Loader Calculator' : 'Chunk Loader Calculator'}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
            {isIt
              ? 'Calcola con precisione i raggi Entity-Ticking, Redstone-Ticking e Border per portali del Nether (livello 30) ed Ender Pearl 1.21.2+ (livello 31), oppure pianifica una griglia multi-loader per intere farm o perimetri.'
              : 'Calculate exact Entity-Ticking, Redstone-Ticking, and Border zones for Nether Portal loaders (level 30) and 1.21.2+ Ender Pearls (level 31), or plan multi-loader coverage grids across large farms and perimeters.'}
          </p>
        </div>

        <Link
          to="/tools/storage"
          className="inline-flex items-center gap-2 self-start lg:self-auto px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-accent-orange" />
          <span>{isIt ? 'Calcolatori TMC (Stack & Coords)' : 'TMC Calculators (Stacks & Coords)'}</span>
        </Link>
      </div>

      {/* Mode & Engine Selector Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Single vs Area Planner */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#101216] border border-white/10">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              mode === 'single'
                ? 'bg-accent-orange text-[#101216] shadow-glow-orange'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{isIt ? 'Analisi Singolo Loader (9×9)' : 'Single Loader (9×9 Grid)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('area')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              mode === 'area'
                ? 'bg-accent-orange text-[#101216] shadow-glow-orange'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isIt ? 'Griglia Multi-Loader (Farm / Area)' : 'Multi-Loader Area Planner'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Loader Mechanic Selector */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#101216] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setLoaderType('portal');
                setSelectedCell(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                loaderType === 'portal'
                  ? 'bg-purple-500/20 border border-purple-400/50 text-purple-200 font-semibold'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Nether Portal (Lv.30)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoaderType('pearl');
                setSelectedCell(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                loaderType === 'pearl'
                  ? 'bg-teal-500/20 border border-teal-400/50 text-teal-200 font-semibold'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Ender Pearl 1.21.2+ (Lv.31)</span>
            </button>
          </div>

          {/* Dimension Target */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#101216] border border-white/10">
            <button
              type="button"
              onClick={() => setDimension('overworld')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                dimension === 'overworld'
                  ? 'bg-emerald-500/20 border border-emerald-400/45 text-emerald-200 font-semibold'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Overworld</span>
            </button>
            <button
              type="button"
              onClick={() => setDimension('nether')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                dimension === 'nether'
                  ? 'bg-rose-500/20 border border-rose-400/45 text-rose-200 font-semibold'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Nether</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Specs Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
            {isIt ? 'Area Entity-Ticking' : 'Entity-Ticking Area'}
          </div>
          <div className="text-lg font-heading font-bold text-emerald-300">{entitySpanBlocks}</div>
          <div className="text-[11px] font-mono text-text-secondary mt-0.5">
            {loaderType === 'portal' ? 'Ticket Lv. 30–31' : 'Ticket Lv. 31'}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
            {isIt ? 'Area Redstone' : 'Redstone Area'}
          </div>
          <div className="text-lg font-heading font-bold text-sky-300">{redstoneSpanBlocks}</div>
          <div className="text-[11px] font-mono text-text-secondary mt-0.5">Ticket Lv. 32</div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
            {isIt ? 'Footprint Totale' : 'Total Footprint'}
          </div>
          <div className="text-lg font-heading font-bold text-text-primary">{totalSpanBlocks}</div>
          <div className="text-[11px] font-mono text-text-secondary mt-0.5">Ticket Lv. 33 Border</div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
            {isIt ? 'Regola / Timer' : 'Rule / Timer'}
          </div>
          <div className="text-lg font-heading font-bold text-accent-orange">
            {loaderType === 'portal' ? '300 tick (15s)' : isIt ? 'Owner Online' : 'Owner Online'}
          </div>
          <div className="text-[11px] font-mono text-text-secondary mt-0.5">
            {loaderType === 'portal'
              ? isIt
                ? 'Refresh automatico tramite portale'
                : 'Auto-refreshed per portal pass'
              : isIt
              ? 'Cross-dimensione se online'
              : 'Works cross-dimension while online'}
          </div>
        </div>
      </div>

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Coordinate & Pairing Inputs (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-5 h-5 text-accent-orange" />
                  <h2 className="text-lg font-heading font-bold text-text-primary">
                    {isIt ? 'Posizione del Loader' : 'Loader Position'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBlockXInput('0');
                    setBlockZInput('0');
                    setSelectedCell(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Spawn (0, 0)
                </button>
              </div>

              {/* Block Coords */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
                  {isIt
                    ? `Coordinate Blocco Target (${dimension === 'overworld' ? 'Overworld' : 'Nether'})`
                    : `Target Block Coordinates (${dimension === 'overworld' ? 'Overworld' : 'Nether'})`}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-text-secondary mb-1">X</label>
                    <input
                      type="number"
                      value={blockXInput}
                      onChange={(e) => {
                        setBlockXInput(e.target.value);
                        setSelectedCell(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-base font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-text-secondary mb-1">Z</label>
                    <input
                      type="number"
                      value={blockZInput}
                      onChange={(e) => {
                        setBlockZInput(e.target.value);
                        setSelectedCell(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-base font-mono text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Chunk Coords */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
                  {isIt ? 'Oppure inserisci Chunk [CX, CZ]' : 'Or enter Chunk [CX, CZ]'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-text-secondary mb-1">Chunk X</label>
                    <input
                      type="number"
                      value={centerCX}
                      onChange={(e) => applyFromChunkInputs(e.target.value, String(centerCZ))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-text-secondary mb-1">Chunk Z</label>
                    <input
                      type="number"
                      value={centerCZ}
                      onChange={(e) => applyFromChunkInputs(String(centerCX), e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Exact Derived Info Cards */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.07]">
                <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      {isIt ? 'Centro Chunk Ideale (Portale / Pearl)' : 'Optimal Chunk Center'}
                    </div>
                    <div className="text-sm font-mono font-bold text-accent-orange mt-0.5">
                      X: {optimalPortalX} · Z: {optimalPortalZ}
                    </div>
                    <div className="text-[11px] font-mono text-text-muted mt-0.5">
                      {isIt ? 'Blocchi chunk:' : 'Chunk range:'} [{chunkMinX}..{chunkMaxX}], [{chunkMinZ}..{chunkMaxZ}]
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${optimalPortalX} 64 ${optimalPortalZ}`, 'center')}
                    className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-text-secondary hover:text-text-primary cursor-pointer"
                    title={isIt ? 'Copia coordinate' : 'Copy coords'}
                  >
                    {copiedId === 'center' ? (
                      <Check className="w-4 h-4 text-accent-orange" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {loaderType === 'portal' && (
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300/80">
                        {dimension === 'overworld'
                          ? isIt
                            ? 'Portale Gemello nel Nether (÷8)'
                            : 'Paired Portal in Nether (÷8)'
                          : isIt
                          ? 'Portale Gemello in Overworld (×8)'
                          : 'Paired Portal in Overworld (×8)'}
                      </div>
                      <div className="text-sm font-mono font-bold text-rose-200 mt-0.5">
                        X: {pairedPortalX} · Z: {pairedPortalZ}
                      </div>
                      <div className="text-[11px] font-mono text-rose-300/60 mt-0.5">
                        Chunk [{toChunkCoord(pairedPortalX)}, {toChunkCoord(pairedPortalZ)}]
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${pairedPortalX} 120 ${pairedPortalZ}`, 'paired')}
                      className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 cursor-pointer"
                      title={isIt ? 'Copia coordinate portale gemello' : 'Copy paired portal coords'}
                    >
                      {copiedId === 'paired' ? (
                        <Check className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      {isIt ? 'Posizione Sub-Chunk' : 'In-Chunk Offset'}
                    </div>
                    <div className="text-sm font-mono font-semibold text-text-primary mt-0.5">
                      ({mod16(blockX)}, {mod16(blockZ)}) / 15
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      {isIt ? 'File Regione' : 'Region File'}
                    </div>
                    <div className="text-sm font-mono font-semibold text-text-primary mt-0.5">
                      r.{regionX}.{regionZ}.mca
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive 9x9 Chunk Matrix & Cell Inspector (7 cols) */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-heading font-bold text-text-primary">
                  {isIt ? 'Mappa Chunk Caricati (Griglia 9×9)' : 'Loaded Chunk Map (9×9 Grid)'}
                </h2>
                <p className="text-xs text-text-secondary">
                  {isIt
                    ? 'Clicca o passa su un chunk per leggere il livello ticket e i blocchi esatti.'
                    : 'Click any chunk cell to inspect its ticket level and exact block boundaries.'}
                </p>
              </div>
              <span className="text-[11px] font-mono text-text-muted">↑ Nord (-Z)</span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-accent-orange">
                <span className="w-3 h-3 rounded bg-accent-orange" />
                {loaderType === 'portal' ? 'Lv.30 Centro' : 'Lv.31 Pearl'}
              </span>
              {loaderType === 'portal' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <span className="w-3 h-3 rounded bg-emerald-500/50 border border-emerald-400/60" />
                  {isIt ? 'Lv.31 Entity (3×3)' : 'Lv.31 Entity (3×3)'}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-sky-300">
                <span className="w-3 h-3 rounded bg-sky-500/40 border border-sky-400/60" />
                {loaderType === 'portal' ? 'Lv.32 Redstone (5×5)' : 'Lv.32 Redstone (3×3)'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                <span className="w-3 h-3 rounded bg-white/15 border border-white/25" />
                {loaderType === 'portal' ? 'Lv.33 Border (7×7)' : 'Lv.33 Border (5×5)'}
              </span>
            </div>

            {/* Interactive 9x9 Grid */}
            <div className="grid grid-cols-9 gap-1.5 max-w-[460px] mx-auto select-none">
              {gridCells.map((cell) => {
                const isSelected =
                  inspectedCell.cx === cell.cx && inspectedCell.cz === cell.cz;
                return (
                  <button
                    key={`${cell.cx}_${cell.cz}`}
                    type="button"
                    onClick={() => setSelectedCell({ cx: cell.cx, cz: cell.cz })}
                    className={`aspect-square rounded-lg border text-[10px] font-mono flex flex-col items-center justify-center leading-tight transition-all cursor-pointer ${
                      tierColors[cell.tier]
                    } ${isSelected ? 'ring-2 ring-white scale-105 z-10' : ''}`}
                    title={`Chunk [${cell.cx}, ${cell.cz}] · Lv.${cell.ticketLevel}`}
                  >
                    <span>{cell.dx === 0 && cell.dz === 0 ? '★' : cell.ticketLevel}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Chunk Readout */}
            <div className="p-4 rounded-xl bg-[#101216]/90 border border-white/[0.08] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-xs font-mono font-bold text-text-primary">
                    Chunk [{inspectedCell.cx}, {inspectedCell.cz}]
                  </span>
                  <span className="text-xs font-mono text-accent-orange font-semibold">
                    {inspectedMeta.title} (Lv.{inspectedCell.ticketLevel})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-text-muted">
                  X: {inspMinX}..{inspMaxX} · Z: {inspMinZ}..{inspMaxZ}
                </span>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">{inspectedMeta.desc}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                    inspectedMeta.entities
                      ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-400/25 text-rose-300/80'
                  }`}
                >
                  {isIt ? 'Entità & Mob:' : 'Entities & Mobs:'}{' '}
                  {inspectedMeta.entities ? (isIt ? 'ATTIVE' : 'ACTIVE') : isIt ? 'FERME' : 'FROZEN'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                    inspectedMeta.redstone
                      ? 'bg-sky-500/15 border-sky-400/35 text-sky-300'
                      : 'bg-rose-500/10 border-rose-400/25 text-rose-300/80'
                  }`}
                >
                  {isIt ? 'Redstone & Block Ticks:' : 'Redstone & Block Ticks:'}{' '}
                  {inspectedMeta.redstone ? (isIt ? 'ATTIVI' : 'ACTIVE') : isIt ? 'INATTIVI' : 'IDLE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB B: MULTI-LOADER AREA COVERAGE PLANNER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Bounds & Requirement Inputs (5 cols) */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-accent-orange" />
              <h2 className="text-lg font-heading font-bold text-text-primary">
                {isIt ? 'Area da Mantenere Carica' : 'Area to Keep Loaded'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Angolo 1 · X1
                </label>
                <input
                  type="number"
                  value={x1Input}
                  onChange={(e) => setX1Input(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-sm font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Angolo 1 · Z1
                </label>
                <input
                  type="number"
                  value={z1Input}
                  onChange={(e) => setZ1Input(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-sm font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Angolo 2 · X2
                </label>
                <input
                  type="number"
                  value={x2Input}
                  onChange={(e) => setX2Input(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-sm font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Angolo 2 · Z2
                </label>
                <input
                  type="number"
                  value={z2Input}
                  onChange={(e) => setZ2Input(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-sm font-mono text-text-primary"
                />
              </div>
            </div>

            {/* Required Tick Tier */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                {isIt ? 'Requisito di Funzionamento' : 'Processing Requirement'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAreaReq('entity')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    areaReq === 'entity'
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-[#101216] border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="text-xs font-mono font-bold">
                    {isIt ? 'Entity Ticking' : 'Entity Ticking'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {loaderType === 'portal'
                      ? isIt
                        ? 'Passo 3×3 chunk (48m)'
                        : '3×3 chunk stride (48m)'
                      : isIt
                      ? 'Passo 1×1 chunk (16m)'
                      : '1×1 chunk stride (16m)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAreaReq('redstone')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    areaReq === 'redstone'
                      ? 'bg-sky-500/15 border-sky-400/50 text-sky-200'
                      : 'bg-[#101216] border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="text-xs font-mono font-bold">
                    {isIt ? 'Solo Redstone' : 'Redstone Only'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {loaderType === 'portal'
                      ? isIt
                        ? 'Passo 5×5 chunk (80m)'
                        : '5×5 chunk stride (80m)'
                      : isIt
                      ? 'Passo 3×3 chunk (48m)'
                      : '3×3 chunk stride (48m)'}
                  </div>
                </button>
              </div>
            </div>

            {/* Area Summary Stats */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.07]">
              <div className="p-3 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                <div className="text-[10px] font-mono uppercase text-text-muted">Chunk Area</div>
                <div className="text-sm font-mono font-bold text-text-primary mt-0.5">
                  {areaPlan.chunkWidth}×{areaPlan.chunkDepth}
                </div>
                <div className="text-[10px] font-mono text-text-muted">
                  ({areaPlan.totalAreaChunks} ch)
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                <div className="text-[10px] font-mono uppercase text-text-muted">Griglia Loader</div>
                <div className="text-sm font-mono font-bold text-text-primary mt-0.5">
                  {areaPlan.cols}×{areaPlan.rows}
                </div>
                <div className="text-[10px] font-mono text-text-muted">
                  {isIt ? 'passo' : 'stride'} {areaPlan.reqRadius * 2 + 1}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/35">
                <div className="text-[10px] font-mono uppercase text-accent-orange">Totale</div>
                <div className="text-lg font-heading font-bold text-accent-orange mt-0.5">
                  {areaPlan.loaders.length}
                </div>
                <div className="text-[10px] font-mono text-accent-orange/80">
                  {loaderType === 'portal' ? 'portali' : 'stasis'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-start gap-2.5 text-[11px] text-text-secondary leading-relaxed">
              <Info className="w-4 h-4 text-accent-orange shrink-0 mt-0.5" />
              <span>
                {isIt
                  ? 'Le coordinate dei loader sono centrate simmetricamente rispetto ai chunk dell’area così da ridurre al minimo i buchi sui bordi.'
                  : 'Loader centers are symmetrically aligned to the target chunk bounding box so edge coverage is balanced.'}
              </span>
            </div>
          </div>

          {/* Right: Loader Placement Coordinates List (7 cols) */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-heading font-bold text-text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-orange" />
                  <span>
                    {isIt
                      ? `Posizioni Ottimali (${areaPlan.loaders.length} Loader)`
                      : `Optimal Placements (${areaPlan.loaders.length} Loaders)`}
                  </span>
                </h2>
                <p className="text-xs font-mono text-text-muted mt-0.5">
                  Chunk [{areaPlan.minCX}..{areaPlan.maxCX}] × [{areaPlan.minCZ}..{areaPlan.maxCZ}]
                </p>
              </div>

              {areaPlan.loaders.length > 0 && areaPlan.loaders.length <= 200 && (
                <button
                  type="button"
                  onClick={() => handleCopy(exportLoadersList, 'all_loaders')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  {copiedId === 'all_loaders' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isIt ? 'Lista Copiata!' : 'List Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isIt ? 'Copia Tutte le Posizioni' : 'Copy All Coordinates'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {areaPlan.loaders.length > 120 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/35 text-xs text-amber-200 leading-relaxed">
                {isIt
                  ? `Questa combinazione richiede ${areaPlan.loaders.length} loader (griglia ${areaPlan.cols}×${areaPlan.rows}). Riduci la zona o passa a Nether Portal (passo 3×3 / 5×5) per ottenere una lista pratica.`
                  : `This combination needs ${areaPlan.loaders.length} loaders (${areaPlan.cols}×${areaPlan.rows} grid). Shrink the area or switch to Nether Portals for a manageable list.`}
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2">
                {areaPlan.loaders.map((item) => (
                  <div
                    key={item.index}
                    className="p-3 rounded-xl bg-[#101216]/90 border border-white/[0.07] hover:border-accent-orange/35 transition-colors flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-accent-orange/15 border border-accent-orange/30 text-accent-orange text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {item.index}
                      </span>
                      <div className="text-xs font-mono space-y-0.5">
                        <div className="text-text-primary font-semibold">
                          Chunk [{item.cx}, {item.cz}]{' '}
                          <span className="text-text-muted font-normal">
                            · X: {item.centerX}, Z: {item.centerZ}
                          </span>
                        </div>
                        {loaderType === 'portal' && (
                          <div className="text-rose-300/85 text-[11px]">
                            {dimension === 'overworld'
                              ? `Nether Portal: X=${item.pairedX}, Z=${item.pairedZ}`
                              : `Overworld Portal: X=${item.pairedX}, Z=${item.pairedZ}`}{' '}
                            <span className="text-text-muted">· r.{item.regionX}.{item.regionZ}.mca</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(`${item.centerX} 64 ${item.centerZ}`, `loader_${item.index}`)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[11px] font-mono text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedId === `loader_${item.index}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{isIt ? 'Copiato' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>X/Z</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
