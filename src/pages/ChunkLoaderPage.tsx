import React, { useEffect, useMemo, useState } from 'react';
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
  RotateCcw,
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
  primaryChunks: Set<string>;
  secondaryChunks: Set<string>;
  lazyChunks: Set<string>;
}

interface DragSelectionBox {
  startCX: number;
  startCZ: number;
  currCX: number;
  currCZ: number;
  mode: 'add' | 'remove';
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

function clampInt(val: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

function getBoxBounds(box: DragSelectionBox) {
  return {
    minX: Math.min(box.startCX, box.currCX),
    maxX: Math.max(box.startCX, box.currCX),
    minZ: Math.min(box.startCZ, box.currCZ),
    maxZ: Math.max(box.startCZ, box.currCZ),
  };
}

function solveSetCover(
  targets: Set<string>,
  option: ActiveOption,
  req: RequirementMode,
  dimension: TargetDimension,
  portalSide: number,
  pearlSide: number,
  simDistance: number
): SolutionResult {
  const empty: SolutionResult = {
    option,
    placements: [],
    primaryChunks: new Set(),
    secondaryChunks: new Set(),
    lazyChunks: new Set(),
  };
  if (targets.size === 0) return empty;

  const targetList = Array.from(targets).map(parseKey);

  const side = option === 'portal' ? portalSide : option === 'pearl' ? pearlSide : simDistance;
  const lo = -Math.floor((side - 1) / 2);
  const hi = Math.ceil((side - 1) / 2);

  const coversPoint = (cx: number, cz: number, tx: number, tz: number) => {
    if (option === 'player') {
      const dx = tx - cx;
      const dz = tz - cz;
      return dx * dx + dz * dz <= simDistance * simDistance;
    }
    const dx = tx - cx;
    const dz = tz - cz;
    return dx >= lo && dx <= hi && dz >= lo && dz <= hi;
  };

  let chosenCenters: Array<[number, number]> = [];

  if (option !== 'player' && side <= 1) {
    chosenCenters = targetList.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
  } else {
    const meanX = targetList.reduce((s, [x]) => s + x, 0) / targetList.length;
    const meanZ = targetList.reduce((s, [, z]) => s + z, 0) / targetList.length;

    const candidateMap = new Map<string, [number, number]>();
    if (option === 'player') {
      const minX = Math.min(...targetList.map(([x]) => x));
      const maxX = Math.max(...targetList.map(([x]) => x));
      const minZ = Math.min(...targetList.map(([, z]) => z));
      const maxZ = Math.max(...targetList.map(([, z]) => z));
      const pad = Math.min(simDistance, 14);
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
        for (let dcz = lo; dcz <= hi; dcz++) {
          for (let dcx = lo; dcx <= hi; dcx++) {
            const cx = tx - dcx;
            const cz = tz - dcz;
            candidateMap.set(keyOf(cx, cz), [cx, cz]);
          }
        }
      }
    }

    const candidates = Array.from(candidateMap.values());
    const uncovered = new Set<string>(targets);

    // Check if a single loader covers everything (centered closest to selection centroid)
    let bestSingle: [number, number] | null = null;
    let bestSingleDist = Infinity;
    for (const [cx, cz] of candidates) {
      let coversAll = true;
      for (const [tx, tz] of targetList) {
        if (!coversPoint(cx, cz, tx, tz)) {
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
            if (coversPoint(cx, cz, tx, tz)) hitCount++;
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
          if (coversPoint(bestCand[0], bestCand[1], tx, tz)) {
            uncovered.delete(keyOf(tx, tz));
          }
        }
      }

      // Redundancy pruning pass
      for (let i = chosenCenters.length - 1; i >= 0; i--) {
        const subset = chosenCenters.filter((_, idx) => idx !== i);
        const stillCovers = targetList.every(([tx, tz]) =>
          subset.some(([cx, cz]) => coversPoint(cx, cz, tx, tz))
        );
        if (stillCovers) chosenCenters = subset;
      }

      chosenCenters.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
    }
  }

  const primaryChunks = new Set<string>();
  const secondaryChunks = new Set<string>();
  const lazyChunks = new Set<string>();

  for (const [cx, cz] of chosenCenters) {
    if (option === 'player') {
      for (let dz = -simDistance; dz <= simDistance; dz++) {
        for (let dx = -simDistance; dx <= simDistance; dx++) {
          if (dx * dx + dz * dz <= simDistance * simDistance) {
            primaryChunks.add(keyOf(cx + dx, cz + dz));
          }
        }
      }
    } else {
      // Exact configured NxN footprint + 1-chunk outer redstone/border rings when using vanilla sizes
      for (let dz = lo; dz <= hi; dz++) {
        for (let dx = lo; dx <= hi; dx++) {
          const k = keyOf(cx + dx, cz + dz);
          if (req === 'entity') primaryChunks.add(k);
          else secondaryChunks.add(k);
        }
      }
      if (req === 'entity') {
        for (let dz = lo - 1; dz <= hi + 1; dz++) {
          for (let dx = lo - 1; dx <= hi + 1; dx++) {
            const k = keyOf(cx + dx, cz + dz);
            if (!primaryChunks.has(k)) secondaryChunks.add(k);
          }
        }
        for (let dz = lo - 2; dz <= hi + 2; dz++) {
          for (let dx = lo - 2; dx <= hi + 2; dx++) {
            const k = keyOf(cx + dx, cz + dz);
            if (!primaryChunks.has(k) && !secondaryChunks.has(k)) lazyChunks.add(k);
          }
        }
      } else {
        for (let dz = lo - 1; dz <= hi + 1; dz++) {
          for (let dx = lo - 1; dx <= hi + 1; dx++) {
            const k = keyOf(cx + dx, cz + dz);
            if (!secondaryChunks.has(k)) lazyChunks.add(k);
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

  return { option, placements, primaryChunks, secondaryChunks, lazyChunks };
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

  // Writable grid dimensions (no fixed 3 presets!)
  const [gridColsInput, setGridColsInput] = useState<string>('17');
  const [gridRowsInput, setGridRowsInput] = useState<string>('17');

  // Writable chunk loader coverage size inputs per mechanic (user can override standard sizes by typing!)
  const [portalSideInput, setPortalSideInput] = useState<string>('3');
  const [pearlSideInput, setPearlSideInput] = useState<string>('1');
  const [simDistInput, setSimDistInput] = useState<string>('10');

  const gridCols = clampInt(Number(gridColsInput), 5, 41, 17);
  const gridRows = clampInt(Number(gridRowsInput), 5, 41, 17);
  const portalSide = clampInt(Number(portalSideInput), 1, 21, reqMode === 'entity' ? 3 : 5);
  const pearlSide = clampInt(Number(pearlSideInput), 1, 21, reqMode === 'entity' ? 1 : 3);
  const simDistance = clampInt(Number(simDistInput), 1, 32, 10);

  // Viewport center in Chunk coords
  const [viewCX, setViewCX] = useState<number>(0);
  const [viewCZ, setViewCZ] = useState<number>(0);
  const [jumpXInput, setJumpXInput] = useState<string>('0');
  const [jumpZInput, setJumpZInput] = useState<string>('0');

  // Painted chunks & rectangular marquee drag state
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(() => buildInitialPreset());
  const [dragBox, setDragBox] = useState<DragSelectionBox | null>(null);
  const [shiftHeld, setShiftHeld] = useState<boolean>(false);
  const [hoveredChunk, setHoveredChunk] = useState<[number, number] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Update Shift indicator & commit rectangle marquee on pointer release
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!dragBox) return;

    const commitRectangle = () => {
      const { minX, maxX, minZ, maxZ } = getBoxBounds(dragBox);
      setSelectedChunks((prev) => {
        const next = new Set(prev);
        for (let cz = minZ; cz <= maxZ; cz++) {
          for (let cx = minX; cx <= maxX; cx++) {
            const k = keyOf(cx, cz);
            if (dragBox.mode === 'add') next.add(k);
            else next.delete(k);
          }
        }
        return next;
      });
      setDragBox(null);
    };

    window.addEventListener('pointerup', commitRectangle);
    window.addEventListener('pointercancel', commitRectangle);
    return () => {
      window.removeEventListener('pointerup', commitRectangle);
      window.removeEventListener('pointercancel', commitRectangle);
    };
  }, [dragBox]);

  const handleRequirementSwitch = (nextReq: RequirementMode) => {
    const prevDefPortal = reqMode === 'entity' ? '3' : '5';
    const prevDefPearl = reqMode === 'entity' ? '1' : '3';
    if (portalSideInput === prevDefPortal) {
      setPortalSideInput(nextReq === 'entity' ? '3' : '5');
    }
    if (pearlSideInput === prevDefPearl) {
      setPearlSideInput(nextReq === 'entity' ? '1' : '3');
    }
    setReqMode(nextReq);
  };

  // Live solve ALL 3 options simultaneously
  const portalSolution = useMemo(
    () => solveSetCover(selectedChunks, 'portal', reqMode, dimension, portalSide, pearlSide, simDistance),
    [selectedChunks, reqMode, dimension, portalSide, pearlSide, simDistance]
  );
  const pearlSolution = useMemo(
    () => solveSetCover(selectedChunks, 'pearl', reqMode, dimension, portalSide, pearlSide, simDistance),
    [selectedChunks, reqMode, dimension, portalSide, pearlSide, simDistance]
  );
  const playerSolution = useMemo(
    () => solveSetCover(selectedChunks, 'player', reqMode, dimension, portalSide, pearlSide, simDistance),
    [selectedChunks, reqMode, dimension, portalSide, pearlSide, simDistance]
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

  const handleCellPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    cx: number,
    cz: number
  ) => {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    const erase = e.shiftKey || e.button === 2;
    setDragBox({
      startCX: cx,
      startCZ: cz,
      currCX: cx,
      currCZ: cz,
      mode: erase ? 'remove' : 'add',
    });
  };

  const handleCellPointerEnter = (e: React.PointerEvent<HTMLButtonElement>, cx: number, cz: number) => {
    setHoveredChunk([cx, cz]);
    if (dragBox) {
      setDragBox((prev) =>
        prev
          ? {
              ...prev,
              currCX: cx,
              currCZ: cz,
              mode: e.shiftKey ? 'remove' : prev.mode,
            }
          : null
      );
    }
  };

  const handleJumpCoords = () => {
    const bx = Number.isFinite(Number(jumpXInput)) ? Math.floor(Number(jumpXInput)) : 0;
    const bz = Number.isFinite(Number(jumpZInput)) ? Math.floor(Number(jumpZInput)) : 0;
    setViewCX(toChunk(bx));
    setViewCZ(toChunk(bz));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const startOffsetX = -Math.floor((gridCols - 1) / 2);
  const startOffsetZ = -Math.floor((gridRows - 1) / 2);

  const cxCols = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < gridCols; i++) arr.push(viewCX + startOffsetX + i);
    return arr;
  }, [viewCX, startOffsetX, gridCols]);

  const czRows = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < gridRows; i++) arr.push(viewCZ + startOffsetZ + i);
    return arr;
  }, [viewCZ, startOffsetZ, gridRows]);

  const activeBoxBounds = dragBox ? getBoxBounds(dragBox) : null;
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
            <span>Minecraft Java · Drag Box &amp; Custom Size</span>
          </Badge>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Chunk Loader Calculator
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed">
            {isIt
              ? 'Trascina con il tasto sinistro per fare una selezione rettangolare omogenea (tieni premuto Shift per deselezionare). Imposta liberamente dimensione della griglia e lato dei loader.'
              : 'Left-click and drag to make a rectangular marquee selection (hold Shift + drag to deselect). Customize grid size and each loader coverage radius freely.'}
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

      {/* Top Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Required Tick Level */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#101216] border border-white/10">
            <button
              type="button"
              onClick={() => handleRequirementSwitch('entity')}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                reqMode === 'entity'
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {isIt ? 'Entity Ticking (Mob / Item)' : 'Entity Ticking (Mobs / Items)'}
            </button>
            <button
              type="button"
              onClick={() => handleRequirementSwitch('redstone')}
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

        {/* Grid Size Custom Numeric Inputs + Clear */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101216] border border-white/10">
            <span className="text-[11px] font-mono text-text-muted">
              {isIt ? 'Griglia:' : 'Grid:'}
            </span>
            <input
              type="number"
              min={5}
              max={41}
              aria-label="Grid columns"
              value={gridColsInput}
              onChange={(e) => setGridColsInput(e.target.value)}
              className="w-12 bg-white/[0.05] rounded px-1.5 py-0.5 text-center text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-orange"
            />
            <span className="text-xs font-mono text-text-muted">×</span>
            <input
              type="number"
              min={5}
              max={41}
              aria-label="Grid rows"
              value={gridRowsInput}
              onChange={(e) => setGridRowsInput(e.target.value)}
              className="w-12 bg-white/[0.05] rounded px-1.5 py-0.5 text-center text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-orange"
            />
            <span className="text-[10px] font-mono text-text-muted">ch</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedChunks(new Set())}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-xs font-mono text-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isIt ? 'Pulisci Tutto' : 'Clear All'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Interactive Rectangular Selection Grid (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Status + Center Jump */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <MousePointerClick className="w-4 h-4 text-accent-orange" />
              <span className="text-text-secondary">
                {isIt
                  ? `Selezionati: ${selectedChunks.size} chunk (${selectedChunks.size * 256} m²)`
                  : `Selected: ${selectedChunks.size} chunks`}
              </span>

              {(shiftHeld || dragBox?.mode === 'remove') && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/45 text-rose-200 text-[10px]">
                  {isIt ? 'Shift: Deseleziona' : 'Shift: Erase'}
                </span>
              )}

              {activeBoxBounds && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] border ${
                    dragBox?.mode === 'remove'
                      ? 'bg-rose-500/20 border-rose-400/45 text-rose-200'
                      : 'bg-accent-orange/20 border-accent-orange/45 text-accent-orange'
                  }`}
                >
                  {activeBoxBounds.maxX - activeBoxBounds.minX + 1}×
                  {activeBoxBounds.maxZ - activeBoxBounds.minZ + 1} ch
                </span>
              )}
            </div>

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
          </div>

          {/* Pan Arrows + Rectangular Marquee Grid */}
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

            <div
              onContextMenu={(e) => e.preventDefault()}
              className="w-full max-w-[580px] mx-auto bg-[#0D0F14] p-2 rounded-2xl border border-white/[0.08]"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                gap: gridCols > 24 || gridRows > 24 ? '1px' : '2.5px',
              }}
            >
              {czRows.map((cz) =>
                cxCols.map((cx) => {
                  const k = keyOf(cx, cz);
                  const isSelected = selectedChunks.has(k);
                  const placement = placementMap.get(k);
                  const isPrimary = activeSolution.primaryChunks.has(k);
                  const isSecondary = activeSolution.secondaryChunks.has(k);
                  const isLazy = activeSolution.lazyChunks.has(k);

                  const inDragBox =
                    activeBoxBounds !== null &&
                    cx >= activeBoxBounds.minX &&
                    cx <= activeBoxBounds.maxX &&
                    cz >= activeBoxBounds.minZ &&
                    cz <= activeBoxBounds.maxZ;

                  let cellClasses =
                    'bg-[#131720] border-white/[0.05] text-transparent hover:border-white/25';

                  if (placement) {
                    cellClasses =
                      activeOption === 'portal'
                        ? 'bg-purple-500 border-purple-200 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.65)] z-10'
                        : activeOption === 'pearl'
                        ? 'bg-teal-400 border-teal-100 text-[#0B1214] font-bold shadow-[0_0_12px_rgba(45,212,191,0.65)] z-10'
                        : 'bg-amber-400 border-amber-100 text-[#101216] font-bold shadow-[0_0_12px_rgba(251,191,36,0.65)] z-10';
                  } else if (isPrimary) {
                    cellClasses = 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200';
                  } else if (isSecondary) {
                    cellClasses = 'bg-sky-500/25 border-sky-400/45 text-sky-200';
                  } else if (isLazy) {
                    cellClasses = 'bg-white/[0.07] border-white/15 text-text-muted';
                  }

                  let selectionRing = isSelected ? 'ring-2 ring-accent-orange ring-inset' : '';
                  if (inDragBox) {
                    selectionRing =
                      dragBox?.mode === 'remove'
                        ? 'ring-2 ring-rose-400 bg-rose-500/35 border-rose-300 z-10'
                        : 'ring-2 ring-accent-orange bg-accent-orange/35 border-amber-200 z-10';
                  }

                  return (
                    <button
                      key={k}
                      type="button"
                      onPointerDown={(e) => handleCellPointerDown(e, cx, cz)}
                      onPointerEnter={(e) => handleCellPointerEnter(e, cx, cz)}
                      className={`aspect-square rounded-[3px] border text-[8px] font-mono flex items-center justify-center leading-none transition-colors cursor-crosshair select-none ${cellClasses} ${selectionRing}`}
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

          {/* Grid Legend + Live Hover Readout */}
          <div className="pt-2 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-accent-orange">
                <span className="w-3 h-3 rounded border-2 border-accent-orange bg-[#131720]" />
                {isIt ? 'Seleziona: Drag Sx' : 'Select: Left Drag'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-300">
                <span className="w-3 h-3 rounded border-2 border-rose-400 bg-rose-500/30" />
                {isIt ? 'Deseleziona: Shift + Drag' : 'Erase: Shift + Drag'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400/60" />
                Entity
              </span>
              {activeOption !== 'player' && (
                <span className="inline-flex items-center gap-1.5 text-sky-300">
                  <span className="w-3 h-3 rounded bg-sky-500/35 border border-sky-400/55" />
                  Redstone
                </span>
              )}
            </div>

            <span className="text-text-secondary">
              {hoveredChunk
                ? `Chunk [${hoveredChunk[0]}, ${hoveredChunk[1]}] · X:${hoveredChunk[0] * 16}..${
                    hoveredChunk[0] * 16 + 15
                  } Z:${hoveredChunk[1] * 16}..${hoveredChunk[1] * 16 + 15}`
                : `${gridCols}×${gridRows} chunk`}
            </span>
          </div>
        </div>

        {/* RIGHT: 3 Automatic Options with Custom Writable Size per Loader (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-2.5">
            {/* Option 1: Nether Portals with custom writable NxN size */}
            <div
              onClick={() => setActiveOption('portal')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveOption('portal');
              }}
              className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-3 ${
                activeOption === 'portal'
                  ? 'glass-panel border-purple-400/60 shadow-[0_0_24px_rgba(168,85,247,0.18)]'
                  : 'glass-panel border-white/10 hover:border-white/25 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-heading font-bold text-text-primary">
                      Nether Portal Loaders ({portalSide}×{portalSide})
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {isIt
                        ? 'Offline-safe (refresh 15s) · Default vanilla: 3×3 Entità / 5×5 Redstone'
                        : 'Works offline (15s loop) · Vanilla default: 3×3 Entity / 5×5 Redstone'}
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
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.07]"
              >
                <span className="text-[11px] font-mono text-text-muted">
                  {isIt ? 'Dimensione loader (N×N chunk):' : 'Loader size (N×N chunks):'}
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={21}
                    aria-label="Portal loader size"
                    value={portalSideInput}
                    onChange={(e) => setPortalSideInput(e.target.value)}
                    className="w-14 bg-[#101216] border border-white/15 rounded-lg px-2 py-1 text-center text-xs font-mono text-text-primary focus:outline-none focus:border-purple-400"
                  />
                  <span className="text-[11px] font-mono text-text-muted">× {portalSide}</span>
                  <button
                    type="button"
                    onClick={() => setPortalSideInput(reqMode === 'entity' ? '3' : '5')}
                    className="p-1 rounded hover:bg-white/[0.07] text-text-muted hover:text-text-primary cursor-pointer"
                    title="Reset vanilla default"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Option 2: Ender Pearl Stasis with custom writable NxN size */}
            <div
              onClick={() => setActiveOption('pearl')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveOption('pearl');
              }}
              className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-3 ${
                activeOption === 'pearl'
                  ? 'glass-panel border-teal-400/60 shadow-[0_0_24px_rgba(45,212,191,0.18)]'
                  : 'glass-panel border-white/10 hover:border-white/25 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-heading font-bold text-text-primary">
                      Ender Pearl Stasis ({pearlSide}×{pearlSide})
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {isIt
                        ? 'Owner online · Default 1.21.2+: 1×1 Entità / 3×3 Redstone'
                        : 'Requires owner online · 1.21.2+ default: 1×1 Entity / 3×3 Redstone'}
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
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.07]"
              >
                <span className="text-[11px] font-mono text-text-muted">
                  {isIt ? 'Dimensione perla (N×N chunk):' : 'Pearl size (N×N chunks):'}
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={21}
                    aria-label="Pearl loader size"
                    value={pearlSideInput}
                    onChange={(e) => setPearlSideInput(e.target.value)}
                    className="w-14 bg-[#101216] border border-white/15 rounded-lg px-2 py-1 text-center text-xs font-mono text-text-primary focus:outline-none focus:border-teal-400"
                  />
                  <span className="text-[11px] font-mono text-text-muted">× {pearlSide}</span>
                  <button
                    type="button"
                    onClick={() => setPearlSideInput(reqMode === 'entity' ? '1' : '3')}
                    className="p-1 rounded hover:bg-white/[0.07] text-text-muted hover:text-text-primary cursor-pointer"
                    title="Reset vanilla default"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Option 3: Player AFK with custom writable Simulation Distance */}
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
                      Player AFK (Raggio {simDistance} ch)
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
                  Simulation Distance (raggio chunk):
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={32}
                    aria-label="Player simulation distance"
                    value={simDistInput}
                    onChange={(e) => setSimDistInput(e.target.value)}
                    className="w-14 bg-[#101216] border border-white/15 rounded-lg px-2 py-1 text-center text-xs font-mono text-text-primary focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[11px] font-mono text-text-muted">ch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exact Coordinates Output List */}
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
                    ? 'Nessun chunk selezionato. Trascina con il tasto sinistro sulla griglia per selezionare un rettangolo (Shift + Drag per deselezionare).'
                    : 'No chunks selected. Left-drag on the grid to select a rectangle (Shift + Drag to deselect).'}
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
                  ? 'Drag sinistro = aggiungi rettangolo · Shift + Drag sinistro (o tasto destro) = rimuovi rettangolo.'
                  : 'Left drag = add rectangle · Shift + Left drag (or right drag) = subtract rectangle.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
