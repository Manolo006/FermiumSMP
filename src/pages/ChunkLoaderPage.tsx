import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  Eraser,
  Flame,
  Globe2,
  Grid3X3,
  Info,
  MousePointerClick,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';

type ActiveOption = 'portal' | 'pearl' | 'player';
type TargetDimension = 'overworld' | 'nether';
type RequirementMode = 'entity' | 'redstone';

interface LoaderPlacement {
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

interface SolutionResult {
  option: ActiveOption;
  placements: LoaderPlacement[];
  entityChunks: Set<string>;
  redstoneChunks: Set<string>;
  lazyChunks: Set<string>;
}

function keyOf(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

function parseKey(k: string): [number, number] {
  const [x, z] = k.split(',').map(Number);
  return [x, z];
}

function toChunk(blockCoord: number): number {
  return Math.floor(blockCoord / 16);
}

function toRegion(chunkCoord: number): number {
  return Math.floor(chunkCoord / 32);
}

function solveSetCover(
  targets: Set<string>,
  option: ActiveOption,
  req: RequirementMode,
  dimension: TargetDimension,
  simDistance: number
): SolutionResult {
  const empty: SolutionResult = {
    option,
    placements: [],
    entityChunks: new Set(),
    redstoneChunks: new Set(),
    lazyChunks: new Set(),
  };
  if (targets.size === 0) return empty;

  const targetList = Array.from(targets).map(parseKey);

  // Determine covering radius for required tier
  // Portal: Lv.30 base -> entity radius 1 (3x3), redstone radius 2 (5x5), lazy radius 3 (7x7)
  // Pearl (1.21.2+): Lv.31 base -> entity radius 0 (1x1), redstone radius 1 (3x3), lazy radius 2 (5x5)
  // Player AFK: cylindrical distance dx^2 + dz^2 <= simDistance^2
  let reqRadius = 1;
  if (option === 'portal') reqRadius = req === 'entity' ? 1 : 2;
  else if (option === 'pearl') reqRadius = req === 'entity' ? 0 : 1;
  else reqRadius = simDistance;

  const coversPoint = (cx: number, cz: number, tx: number, tz: number, radius: number) => {
    const dx = Math.abs(cx - tx);
    const dz = Math.abs(cz - tz);
    if (option === 'player') {
      return dx * dx + dz * dz <= radius * radius;
    }
    return Math.max(dx, dz) <= radius;
  };

  let chosenCenters: Array<[number, number]> = [];

  if (option === 'pearl' && req === 'entity') {
    // 1x1 Entity-ticking: every selected chunk requires 1 pearl
    chosenCenters = targetList.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
  } else {
    // Centroid for intuitive tie-breaking (picks middle of symmetric shapes)
    const meanX = targetList.reduce((s, [x]) => s + x, 0) / targetList.length;
    const meanZ = targetList.reduce((s, [, z]) => s + z, 0) / targetList.length;

    // Candidate centers = all chunks that can cover at least one target
    const candidateMap = new Map<string, [number, number]>();
    if (option === 'player') {
      const minX = Math.min(...targetList.map(([x]) => x));
      const maxX = Math.max(...targetList.map(([x]) => x));
      const minZ = Math.min(...targetList.map(([, z]) => z));
      const maxZ = Math.max(...targetList.map(([, z]) => z));
      const pad = Math.min(reqRadius, 12);
      for (let cz = minZ - pad; cz <= maxZ + pad; cz++) {
        for (let cx = minX - pad; cx <= maxX + pad; cx++) {
          candidateMap.set(keyOf(cx, cz), [cx, cz]);
        }
      }
      candidateMap.set(keyOf(Math.round(meanX), Math.round(meanZ)), [
        Math.round(meanX),
        Math.round(meanZ),
      ]);
    } else {
      for (const [tx, tz] of targetList) {
        for (let dz = -reqRadius; dz <= reqRadius; dz++) {
          for (let dx = -reqRadius; dx <= reqRadius; dx++) {
            const cx = tx + dx;
            const cz = tz + dz;
            candidateMap.set(keyOf(cx, cz), [cx, cz]);
          }
        }
      }
    }

    const candidates = Array.from(candidateMap.values());
    const uncovered = new Set<string>(targets);

    // Quick check: can 1 loader cover everything? Pick the candidate closest to centroid
    let bestSingle: [number, number] | null = null;
    let bestSingleDist = Infinity;
    for (const [cx, cz] of candidates) {
      let coversAll = true;
      for (const [tx, tz] of targetList) {
        if (!coversPoint(cx, cz, tx, tz, reqRadius)) {
          coversAll = false;
          break;
        }
      }
      if (coversAll) {
        const d2 = (cx - meanX) ** 2 + (cz - meanZ) ** 2 - (targets.has(keyOf(cx, cz)) ? 0.25 : 0);
        if (d2 < bestSingleDist) {
          bestSingleDist = d2;
          bestSingle = [cx, cz];
        }
      }
    }

    if (bestSingle) {
      chosenCenters = [bestSingle];
    } else {
      while (uncovered.size > 0) {
        const remList = Array.from(uncovered).map(parseKey);
        const remMeanX = remList.reduce((s, [x]) => s + x, 0) / remList.length;
        const remMeanZ = remList.reduce((s, [, z]) => s + z, 0) / remList.length;

        let bestCand: [number, number] | null = null;
        let bestCount = -1;
        let bestTie = Infinity;

        for (const [cx, cz] of candidates) {
          let hitCount = 0;
          for (const [tx, tz] of remList) {
            if (coversPoint(cx, cz, tx, tz, reqRadius)) hitCount++;
          }
          if (hitCount === 0) continue;

          const distScore =
            (cx - remMeanX) ** 2 + (cz - remMeanZ) ** 2 - (targets.has(keyOf(cx, cz)) ? 0.15 : 0);
          if (hitCount > bestCount || (hitCount === bestCount && distScore < bestTie)) {
            bestCount = hitCount;
            bestTie = distScore;
            bestCand = [cx, cz];
          }
        }

        if (!bestCand) break;
        chosenCenters.push(bestCand);
        for (const [tx, tz] of remList) {
          if (coversPoint(bestCand[0], bestCand[1], tx, tz, reqRadius)) {
            uncovered.delete(keyOf(tx, tz));
          }
        }
      }

      // Redundancy pruning pass
      for (let i = chosenCenters.length - 1; i >= 0; i--) {
        const subset = chosenCenters.filter((_, idx) => idx !== i);
        const stillCovers = targetList.every(([tx, tz]) =>
          subset.some(([cx, cz]) => coversPoint(cx, cz, tx, tz, reqRadius))
        );
        if (stillCovers) chosenCenters = subset;
      }

      chosenCenters.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
    }
  }

  // Compute full resulting footprints for visualization
  const entityChunks = new Set<string>();
  const redstoneChunks = new Set<string>();
  const lazyChunks = new Set<string>();

  for (const [cx, cz] of chosenCenters) {
    if (option === 'portal') {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dz));
          const k = keyOf(cx + dx, cz + dz);
          if (dist <= 1) entityChunks.add(k);
          else if (dist === 2) redstoneChunks.add(k);
          else lazyChunks.add(k);
        }
      }
    } else if (option === 'pearl') {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dz));
          const k = keyOf(cx + dx, cz + dz);
          if (dist === 0) entityChunks.add(k);
          else if (dist === 1) redstoneChunks.add(k);
          else lazyChunks.add(k);
        }
      }
    } else {
      for (let dz = -simDistance; dz <= simDistance; dz++) {
        for (let dx = -simDistance; dx <= simDistance; dx++) {
          if (dx * dx + dz * dz <= simDistance * simDistance) {
            entityChunks.add(keyOf(cx + dx, cz + dz));
          }
        }
      }
    }
  }

  const placements: LoaderPlacement[] = chosenCenters.map(([cx, cz], i) => {
    const centerX = cx * 16 + 8;
    const centerZ = cz * 16 + 8;
    const pairedX = dimension === 'overworld' ? Math.floor(centerX / 8) : centerX * 8;
    const pairedZ = dimension === 'overworld' ? Math.floor(centerZ / 8) : centerZ * 8;
    return {
      index: i + 1,
      cx,
      cz,
      centerX,
      centerZ,
      pairedX,
      pairedZ,
      regionX: toRegion(cx),
      regionZ: toRegion(cz),
    };
  });

  return { option, placements, entityChunks, redstoneChunks, lazyChunks };
}

function buildInitialPreset(): Set<string> {
  const s = new Set<string>();
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      s.add(keyOf(dx, dz));
    }
  }
  return s;
}

export const ChunkLoaderPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [dimension, setDimension] = useState<TargetDimension>('overworld');
  const [reqMode, setReqMode] = useState<RequirementMode>('entity');
  const [activeOption, setActiveOption] = useState<ActiveOption>('portal');
  const [simDistance, setSimDistance] = useState<number>(10);
  const [gridRadius, setGridRadius] = useState<6 | 8 | 10>(8); // 13x13, 17x17, 21x21

  // Viewport center in Chunk coords
  const [viewCX, setViewCX] = useState<number>(0);
  const [viewCZ, setViewCZ] = useState<number>(0);
  const [jumpXInput, setJumpXInput] = useState<string>('0');
  const [jumpZInput, setJumpZInput] = useState<string>('0');

  // Painted chunks
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(() => buildInitialPreset());
  const [hoveredChunk, setHoveredChunk] = useState<[number, number] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag-painting refs
  const isDraggingRef = useRef<boolean>(false);
  const dragModeRef = useRef<'add' | 'remove'>('add');

  useEffect(() => {
    const stopDrag = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, []);

  // Live solve ALL 3 options simultaneously whenever selection changes
  const portalSolution = useMemo(
    () => solveSetCover(selectedChunks, 'portal', reqMode, dimension, simDistance),
    [selectedChunks, reqMode, dimension, simDistance]
  );
  const pearlSolution = useMemo(
    () => solveSetCover(selectedChunks, 'pearl', reqMode, dimension, simDistance),
    [selectedChunks, reqMode, dimension, simDistance]
  );
  const playerSolution = useMemo(
    () => solveSetCover(selectedChunks, 'player', reqMode, dimension, simDistance),
    [selectedChunks, reqMode, dimension, simDistance]
  );

  const activeSolution =
    activeOption === 'portal'
      ? portalSolution
      : activeOption === 'pearl'
      ? pearlSolution
      : playerSolution;

  const placementMap = useMemo(() => {
    const m = new Map<string, LoaderPlacement>();
    for (const p of activeSolution.placements) {
      m.set(keyOf(p.cx, p.cz), p);
    }
    return m;
  }, [activeSolution]);

  const applyPaint = (cx: number, cz: number, action: 'add' | 'remove') => {
    const k = keyOf(cx, cz);
    setSelectedChunks((prev) => {
      if (action === 'add' && prev.has(k)) return prev;
      if (action === 'remove' && !prev.has(k)) return prev;
      const next = new Set(prev);
      if (action === 'add') next.add(k);
      else next.delete(k);
      return next;
    });
  };

  const handleCellPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    cx: number,
    cz: number
  ) => {
    e.preventDefault();
    const k = keyOf(cx, cz);
    const action: 'add' | 'remove' =
      e.button === 2 ? 'remove' : selectedChunks.has(k) ? 'remove' : 'add';
    isDraggingRef.current = true;
    dragModeRef.current = action;
    applyPaint(cx, cz, action);
  };

  const handleCellPointerEnter = (cx: number, cz: number) => {
    setHoveredChunk([cx, cz]);
    if (isDraggingRef.current) {
      applyPaint(cx, cz, dragModeRef.current);
    }
  };

  const handleJumpCoords = () => {
    const bx = Number.isFinite(Number(jumpXInput)) ? Math.floor(Number(jumpXInput)) : 0;
    const bz = Number.isFinite(Number(jumpZInput)) ? Math.floor(Number(jumpZInput)) : 0;
    setViewCX(toChunk(bx));
    setViewCZ(toChunk(bz));
  };

  const applyPreset = (type: 'clear' | '3x3' | '5x5' | 'line') => {
    const next = new Set<string>();
    if (type === '3x3') {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) next.add(keyOf(viewCX + dx, viewCZ + dz));
      }
    } else if (type === '5x5') {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) next.add(keyOf(viewCX + dx, viewCZ + dz));
      }
    } else if (type === 'line') {
      for (let dx = -5; dx <= 5; dx++) next.add(keyOf(viewCX + dx, viewCZ));
    }
    setSelectedChunks(next);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const gridSpan = gridRadius * 2 + 1;
  const cxCols = useMemo(() => {
    const arr: number[] = [];
    for (let dx = -gridRadius; dx <= gridRadius; dx++) arr.push(viewCX + dx);
    return arr;
  }, [viewCX, gridRadius]);

  const czRows = useMemo(() => {
    const arr: number[] = [];
    for (let dz = -gridRadius; dz <= gridRadius; dz++) arr.push(viewCZ + dz);
    return arr;
  }, [viewCZ, gridRadius]);

  const badgePrefix = activeOption === 'portal' ? 'P' : activeOption === 'pearl' ? 'E' : 'A';

  const exportText = activeSolution.placements
    .map((p) => {
      const base = `#${badgePrefix}${p.index} | Chunk [${p.cx}, ${p.cz}] | ${
        dimension === 'overworld' ? 'Overworld' : 'Nether'
      }: X=${p.centerX}, Z=${p.centerZ}`;
      if (activeOption === 'portal') {
        const other = dimension === 'overworld' ? 'Nether Portal' : 'Overworld Portal';
        return `${base} | ${other}: X=${p.pairedX}, Z=${p.pairedZ}`;
      }
      return base;
    })
    .join('\n');

  return (
    <div className="pt-28 pb-24 max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Badge variant="orange">
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Minecraft Java · Drag &amp; Solve</span>
          </Badge>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Chunk Loader Calculator
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed">
            {isIt
              ? 'Tieni premuto il tasto sinistro e trascina sulla griglia per selezionare i chunk esatti della tua farm o costruzione: il calcolatore trova in automatico i punti minimi per Portali, Ender Pearl (1.21.2+) o Player AFK.'
              : 'Hold left mouse button and drag across the grid to paint the chunks you want to keep loaded: automatically solves the optimal placements for Nether Portals, Ender Pearls (1.21.2+), and AFK Players.'}
          </p>
        </div>

        <Link
          to="/tools/storage"
          className="inline-flex items-center gap-2 self-start lg:self-auto px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-accent-orange" />
          <span>{isIt ? 'Calcolatori TMC (Stack & Coords)' : 'TMC Calculators'}</span>
        </Link>
      </div>

      {/* Top Controls Bar: What needs to tick + Dimension + Presets */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Required Tick Level */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#101216] border border-white/10">
            <button
              type="button"
              onClick={() => setReqMode('entity')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                reqMode === 'entity'
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {isIt ? 'Entity Ticking (Mob / Item / Drop)' : 'Entity Ticking (Mobs / Items)'}
            </button>
            <button
              type="button"
              onClick={() => setReqMode('redstone')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                reqMode === 'redstone'
                  ? 'bg-sky-500/20 border border-sky-400/50 text-sky-200'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {isIt ? 'Solo Redstone / Block Ticks' : 'Redstone / Block Ticks Only'}
            </button>
          </div>

          {/* Target Dimension */}
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

        {/* Quick Shapes & Clear */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('3x3')}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
          >
            3×3
          </button>
          <button
            type="button"
            onClick={() => applyPreset('5x5')}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
          >
            5×5
          </button>
          <button
            type="button"
            onClick={() => applyPreset('line')}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {isIt ? 'Linea 1×11' : '1×11 Line'}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('clear')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-[11px] font-mono text-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isIt ? 'Pulisci Tutto' : 'Clear All'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Interactive Grid Left (7 cols) + Live Options & Coordinates Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Interactive Drag-to-Paint Chunk Grid */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Grid Navigation & Zoom Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <MousePointerClick className="w-4 h-4 text-accent-orange" />
              <span>
                {isIt
                  ? `Selezionati: ${selectedChunks.size} chunk (${selectedChunks.size * 256} m²)`
                  : `Selected: ${selectedChunks.size} chunks`}
              </span>
            </div>

            {/* Center / Pan / Grid Size */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-[#101216] border border-white/10 rounded-lg px-2 py-1">
                <span className="text-[10px] font-mono text-text-muted">X</span>
                <input
                  type="number"
                  value={jumpXInput}
                  onChange={(e) => setJumpXInput(e.target.value)}
                  className="w-16 bg-transparent text-xs font-mono text-text-primary focus:outline-none"
                />
                <span className="text-[10px] font-mono text-text-muted">Z</span>
                <input
                  type="number"
                  value={jumpZInput}
                  onChange={(e) => setJumpZInput(e.target.value)}
                  className="w-16 bg-transparent text-xs font-mono text-text-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJumpCoords}
                  className="px-2 py-0.5 rounded bg-accent-orange/20 text-accent-orange text-[10px] font-mono font-semibold hover:bg-accent-orange/30 cursor-pointer"
                >
                  Go
                </button>
              </div>

              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#101216] border border-white/10">
                {([6, 8, 10] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setGridRadius(r)}
                    className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer ${
                      gridRadius === r
                        ? 'bg-white/15 text-text-primary font-semibold'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {r * 2 + 1}×{r * 2 + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pan Arrows + Interactive Grid */}
          <div className="flex flex-col items-center gap-2 select-none touch-none">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewCZ((z) => z - 4)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] font-mono text-text-secondary cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" /> -4Z
              </button>
              <button
                type="button"
                onClick={() => setViewCX((x) => x - 4)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] font-mono text-text-secondary cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> -4X
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewCX(0);
                  setViewCZ(0);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] font-mono text-text-muted hover:text-text-primary cursor-pointer"
              >
                Centro [{viewCX}, {viewCZ}]
              </button>
              <button
                type="button"
                onClick={() => setViewCX((x) => x + 4)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] font-mono text-text-secondary cursor-pointer"
              >
                +4X <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewCZ((z) => z + 4)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] font-mono text-text-secondary cursor-pointer"
              >
                +4Z <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            {/* Interactive Paint Grid */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              className="w-full max-w-[560px] mx-auto bg-[#0D0F14] p-2 rounded-2xl border border-white/[0.08]"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSpan}, minmax(0, 1fr))`,
                gap: gridRadius === 10 ? '2px' : '3px',
              }}
            >
              {czRows.map((cz) =>
                cxCols.map((cx) => {
                  const k = keyOf(cx, cz);
                  const isSelected = selectedChunks.has(k);
                  const placement = placementMap.get(k);
                  const isEntity = activeSolution.entityChunks.has(k);
                  const isRedstone = activeSolution.redstoneChunks.has(k);
                  const isLazy = activeSolution.lazyChunks.has(k);

                  let cellClasses =
                    'bg-[#131720] border-white/[0.05] text-transparent hover:border-white/25';

                  if (placement) {
                    cellClasses =
                      activeOption === 'portal'
                        ? 'bg-purple-500 border-purple-200 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.65)] z-10'
                        : activeOption === 'pearl'
                        ? 'bg-teal-400 border-teal-100 text-[#0B1214] font-bold shadow-[0_0_12px_rgba(45,212,191,0.65)] z-10'
                        : 'bg-amber-400 border-amber-100 text-[#101216] font-bold shadow-[0_0_12px_rgba(251,191,36,0.65)] z-10';
                  } else if (isEntity) {
                    cellClasses = 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200';
                  } else if (isRedstone) {
                    cellClasses = 'bg-sky-500/25 border-sky-400/45 text-sky-200';
                  } else if (isLazy) {
                    cellClasses = 'bg-white/[0.07] border-white/15 text-text-muted';
                  }

                  // Highlight painted target chunks strongly
                  const targetRing = isSelected
                    ? 'ring-2 ring-accent-orange ring-inset'
                    : '';

                  return (
                    <button
                      key={k}
                      type="button"
                      onPointerDown={(e) => handleCellPointerDown(e, cx, cz)}
                      onPointerEnter={() => handleCellPointerEnter(cx, cz)}
                      className={`aspect-square rounded-[4px] border text-[9px] font-mono flex items-center justify-center leading-none transition-colors cursor-crosshair select-none ${cellClasses} ${targetRing}`}
                      title={`Chunk [${cx}, ${cz}] (${cx * 16}..${cx * 16 + 15}, ${cz * 16}..${
                        cz * 16 + 15
                      })`}
                    >
                      {placement ? `${badgePrefix}${placement.index}` : isSelected ? '•' : ''}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Grid Legend + Live Hover Status */}
          <div className="pt-2 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-accent-orange">
                <span className="w-3 h-3 rounded border-2 border-accent-orange bg-[#131720]" />
                {isIt ? 'Selezionati (Drag Sx)' : 'Selected (Left Drag)'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400/60" />
                Entity
              </span>
              {activeOption !== 'player' && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <span className="w-3 h-3 rounded bg-sky-500/35 border border-sky-400/55" />
                    Redstone
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-text-secondary">
                    <span className="w-3 h-3 rounded bg-white/15 border border-white/25" />
                    Border
                  </span>
                </>
              )}
            </div>

            <span className="text-text-secondary">
              {hoveredChunk
                ? `Chunk [${hoveredChunk[0]}, ${hoveredChunk[1]}] · X:${hoveredChunk[0] * 16}..${
                    hoveredChunk[0] * 16 + 15
                  } Z:${hoveredChunk[1] * 16}..${hoveredChunk[1] * 16 + 15}`
                : isIt
                ? 'Trascina col tasto sinistro sulla griglia'
                : 'Drag left mouse button on the grid'}
            </span>
          </div>
        </div>

        {/* RIGHT: Automatic Comparison Across All 3 Options + Generated Placements (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Option Selector Cards (Portals / Pearls / AFK Players) */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setActiveOption('portal')}
              className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                activeOption === 'portal'
                  ? 'glass-panel border-purple-400/60 shadow-[0_0_24px_rgba(168,85,247,0.18)]'
                  : 'glass-panel border-white/10 hover:border-white/25 opacity-85'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-heading font-bold text-text-primary">
                    Nether Portal Loaders (Lv.30)
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {isIt
                      ? '3×3 Entità · 5×5 Redstone · Offline-safe (refresh 15s)'
                      : '3×3 Entity · 5×5 Redstone · Works offline (15s loop)'}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-heading font-bold text-purple-300">
                  {portalSolution.placements.length}
                </div>
                <div className="text-[10px] font-mono uppercase text-text-muted">
                  {portalSolution.placements.length === 1 ? 'portale' : 'portali'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveOption('pearl')}
              className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                activeOption === 'pearl'
                  ? 'glass-panel border-teal-400/60 shadow-[0_0_24px_rgba(45,212,191,0.18)]'
                  : 'glass-panel border-white/10 hover:border-white/25 opacity-85'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-heading font-bold text-text-primary">
                    Ender Pearl Stasis 1.21.2+ (Lv.31)
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {isIt
                      ? '1×1 Entità · 3×3 Redstone · Solo con owner online'
                      : '1×1 Entity · 3×3 Redstone · Requires owner online'}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-heading font-bold text-teal-300">
                  {pearlSolution.placements.length}
                </div>
                <div className="text-[10px] font-mono uppercase text-text-muted">
                  {pearlSolution.placements.length === 1 ? 'perla' : 'perle'}
                </div>
              </div>
            </button>

            <div
              onClick={() => setActiveOption('player')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveOption('player');
              }}
              className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-3 ${
                activeOption === 'player'
                  ? 'glass-panel border-amber-400/60 shadow-[0_0_24px_rgba(251,191,36,0.18)]'
                  : 'glass-panel border-white/10 hover:border-white/25 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-heading font-bold text-text-primary">
                      Player AFK (Sim Distance {simDistance})
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {isIt
                        ? 'Carica tutto + random ticks (colture/mob spawn vanilla)'
                        : 'Full load + random ticks (crops/natural spawns)'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-heading font-bold text-amber-300">
                    {playerSolution.placements.length}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-text-muted">player</div>
                </div>
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.07]"
              >
                <span className="text-[11px] font-mono text-text-muted">
                  Simulation Distance: <strong className="text-text-primary">{simDistance} chunk</strong>
                </span>
                <input
                  type="range"
                  min={5}
                  max={12}
                  value={simDistance}
                  onChange={(e) => setSimDistance(Number(e.target.value))}
                  className="w-28 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Exact Coordinate List for Selected Option */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-heading font-bold text-text-primary">
                {activeOption === 'portal'
                  ? isIt
                    ? 'Portali da Costruire'
                    : 'Portals to Build'
                  : activeOption === 'pearl'
                  ? isIt
                    ? 'Ender Pearl Stasis da Piazzare'
                    : 'Ender Pearls to Place'
                  : isIt
                  ? 'Posizioni Player AFK'
                  : 'AFK Player Spots'}
              </h2>

              {activeSolution.placements.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleCopy(exportText, 'all_coords')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  {copiedId === 'all_coords' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isIt ? 'Copiato!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isIt ? 'Copia Tutto' : 'Copy All'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {selectedChunks.size === 0 ? (
              <div className="p-4 rounded-xl bg-[#101216]/90 border border-white/[0.07] text-xs text-text-secondary flex items-start gap-2.5">
                <Eraser className="w-4 h-4 text-accent-orange shrink-0 mt-0.5" />
                <span>
                  {isIt
                    ? 'Nessun chunk selezionato. Tieni premuto il tasto sinistro e trascina sulla griglia per disegnare la zona da caricare.'
                    : 'No chunks selected yet. Hold left-click and drag across the grid to paint your target chunks.'}
                </span>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                {activeSolution.placements.map((p) => (
                  <div
                    key={p.index}
                    className="p-3 rounded-xl bg-[#101216]/90 border border-white/[0.07] flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-mono font-bold text-text-primary shrink-0">
                        {badgePrefix}
                        {p.index}
                      </span>
                      <div className="text-xs font-mono min-w-0">
                        <div className="text-text-primary font-semibold truncate">
                          Chunk [{p.cx}, {p.cz}]{' '}
                          <span className="text-text-muted font-normal">
                            · X:{p.centerX} Z:{p.centerZ}
                          </span>
                        </div>
                        {activeOption === 'portal' && (
                          <div className="text-[11px] text-rose-300/85 truncate">
                            {dimension === 'overworld'
                              ? `Nether Portal: X=${p.pairedX}, Z=${p.pairedZ}`
                              : `Overworld Portal: X=${p.pairedX}, Z=${p.pairedZ}`}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(`${p.centerX} 64 ${p.centerZ}`, `pos_${activeOption}_${p.index}`)
                      }
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
                      title={isIt ? 'Copia X Y Z' : 'Copy X Y Z'}
                    >
                      {copiedId === `pos_${activeOption}_${p.index}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.06] flex items-start gap-2 text-[11px] text-text-muted leading-relaxed">
              <Info className="w-3.5 h-3.5 text-accent-orange shrink-0 mt-0.5" />
              <span>
                {isIt
                  ? 'Suggerimento: trascina su un chunk già selezionato (o usa il tasto destro) per cancellarlo.'
                  : 'Tip: drag starting on an already-selected chunk (or right-click) to erase chunks.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
