export type ActiveOption = 'portal' | 'pearl' | 'player';
export type TargetDimension = 'overworld' | 'nether';
export type RequirementMode = 'entity' | 'redstone';

export interface LoaderPlacement {
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

export interface SolutionResult {
  option: ActiveOption;
  placements: LoaderPlacement[];
  primaryChunks: Set<string>;
  secondaryChunks: Set<string>;
  lazyChunks: Set<string>;
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function parseChunkKey(k: string): [number, number] {
  const [x, z] = k.split(',').map(Number);
  return [x, z];
}

export function toChunk(blockCoord: number): number {
  return Math.floor(blockCoord / 16);
}

export function toRegion(chunkCoord: number): number {
  return Math.floor(chunkCoord / 32);
}

function normZero(n: number): number {
  return n === 0 ? 0 : n;
}

function boundingBoxCenter(
  pts: ReadonlyArray<[number, number]>,
  lo: number,
  hi: number
): [number, number] | null {
  if (pts.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const span = hi - lo;
  if (maxX - minX > span || maxZ - minZ > span) return null;
  const cx = normZero(Math.round((maxX - hi + (minX - lo)) / 2));
  const cz = normZero(Math.round((maxZ - hi + (minZ - lo)) / 2));
  return [cx, cz];
}

function covers(cx: number, cz: number, tx: number, tz: number, lo: number, hi: number): boolean {
  const dx = tx - cx;
  const dz = tz - cz;
  return dx >= lo && dx <= hi && dz >= lo && dz <= hi;
}

function tryTwoLoaders(
  pts: ReadonlyArray<[number, number]>,
  lo: number,
  hi: number
): Array<[number, number]> | null {
  const xs = Array.from(new Set(pts.map(([x]) => x))).sort((a, b) => a - b);
  const zs = Array.from(new Set(pts.map(([, z]) => z))).sort((a, b) => a - b);

  // 1) Pure axis-aligned separators along X or Z
  for (let i = 0; i < xs.length - 1; i++) {
    const split = xs[i];
    const a: Array<[number, number]> = [];
    const b: Array<[number, number]> = [];
    for (const p of pts) {
      if (p[0] <= split) a.push(p);
      else b.push(p);
    }
    const ca = boundingBoxCenter(a, lo, hi);
    if (!ca) continue;
    const cb = boundingBoxCenter(b, lo, hi);
    if (cb) return [ca, cb];
  }

  for (let j = 0; j < zs.length - 1; j++) {
    const split = zs[j];
    const a: Array<[number, number]> = [];
    const b: Array<[number, number]> = [];
    for (const p of pts) {
      if (p[1] <= split) a.push(p);
      else b.push(p);
    }
    const ca = boundingBoxCenter(a, lo, hi);
    if (!ca) continue;
    const cb = boundingBoxCenter(b, lo, hi);
    if (cb) return [ca, cb];
  }

  // 2) Corner / extreme-edge anchored slides (handles overlapping L-shaped 2-square covers)
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const minZ = zs[0];
  const maxZ = zs[zs.length - 1];

  const candidateFirst: Array<[number, number]> = [];
  for (const z of zs) {
    candidateFirst.push([minX - lo, z - lo], [minX - lo, z - hi]);
    candidateFirst.push([maxX - hi, z - lo], [maxX - hi, z - hi]);
  }
  for (const x of xs) {
    candidateFirst.push([x - lo, minZ - lo], [x - hi, minZ - lo]);
    candidateFirst.push([x - lo, maxZ - hi], [x - hi, maxZ - hi]);
  }

  for (const [cx1, cz1] of candidateFirst) {
    const rem: Array<[number, number]> = [];
    for (const p of pts) {
      if (!covers(cx1, cz1, p[0], p[1], lo, hi)) rem.push(p);
    }
    if (rem.length === 0) return [[normZero(cx1), normZero(cz1)]];
    const c2 = boundingBoxCenter(rem, lo, hi);
    if (c2) {
      return [
        [normZero(cx1), normZero(cz1)],
        c2,
      ];
    }
  }

  return null;
}

function sweepCover(
  pts: ReadonlyArray<[number, number]>,
  lo: number,
  hi: number,
  dirX: 1 | -1,
  dirZ: 1 | -1,
  primaryAxis: 'z' | 'x'
): Array<[number, number]> {
  let remaining = pts.slice();
  const placed: Array<[number, number]> = [];

  while (remaining.length > 0) {
    // Check if remainder already fits in 1 or 2 loaders!
    const one = boundingBoxCenter(remaining, lo, hi);
    if (one) {
      placed.push(one);
      break;
    }
    const two = tryTwoLoaders(remaining, lo, hi);
    if (two) {
      placed.push(...two);
      break;
    }

    // Pick extreme anchor along sweep order
    let anchor = remaining[0];
    for (let i = 1; i < remaining.length; i++) {
      const p = remaining[i];
      if (primaryAxis === 'z') {
        if (p[1] * dirZ < anchor[1] * dirZ || (p[1] === anchor[1] && p[0] * dirX < anchor[0] * dirX)) {
          anchor = p;
        }
      } else {
        if (p[0] * dirX < anchor[0] * dirX || (p[0] === anchor[0] && p[1] * dirZ < anchor[1] * dirZ)) {
          anchor = p;
        }
      }
    }

    // Generate candidate squares flush on the swept axis against anchor
    const candMap = new Map<string, [number, number]>();
    if (primaryAxis === 'z') {
      const cz = dirZ === 1 ? anchor[1] - lo : anchor[1] - hi;
      for (const p of remaining) {
        if (p[1] >= cz + lo && p[1] <= cz + hi) {
          const cxA = p[0] - lo;
          const cxB = p[0] - hi;
          if (anchor[0] >= cxA + lo && anchor[0] <= cxA + hi) candMap.set(`${cxA},${cz}`, [cxA, cz]);
          if (anchor[0] >= cxB + lo && anchor[0] <= cxB + hi) candMap.set(`${cxB},${cz}`, [cxB, cz]);
        }
      }
      const fallbackCX = dirX === 1 ? anchor[0] - lo : anchor[0] - hi;
      candMap.set(`${fallbackCX},${cz}`, [fallbackCX, cz]);
    } else {
      const cx = dirX === 1 ? anchor[0] - lo : anchor[0] - hi;
      for (const p of remaining) {
        if (p[0] >= cx + lo && p[0] <= cx + hi) {
          const czA = p[1] - lo;
          const czB = p[1] - hi;
          if (anchor[1] >= czA + lo && anchor[1] <= czA + hi) candMap.set(`${cx},${czA}`, [cx, czA]);
          if (anchor[1] >= czB + lo && anchor[1] <= czB + hi) candMap.set(`${cx},${czB}`, [cx, czB]);
        }
      }
      const fallbackCZ = dirZ === 1 ? anchor[1] - lo : anchor[1] - hi;
      candMap.set(`${cx},${fallbackCZ}`, [cx, fallbackCZ]);
    }

    let best: [number, number] | null = null;
    let bestCount = -1;
    let bestRemSpan = Infinity;

    for (const [cx, cz] of candMap.values()) {
      let hit = 0;
      let rMinX = Infinity;
      let rMaxX = -Infinity;
      let rMinZ = Infinity;
      let rMaxZ = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const [tx, tz] = remaining[i];
        if (covers(cx, cz, tx, tz, lo, hi)) {
          hit++;
        } else {
          if (tx < rMinX) rMinX = tx;
          if (tx > rMaxX) rMaxX = tx;
          if (tz < rMinZ) rMinZ = tz;
          if (tz > rMaxZ) rMaxZ = tz;
        }
      }
      const remArea = hit === remaining.length ? 0 : (rMaxX - rMinX + 1) * (rMaxZ - rMinZ + 1);
      if (hit > bestCount || (hit === bestCount && remArea < bestRemSpan)) {
        bestCount = hit;
        bestRemSpan = remArea;
        best = [cx, cz];
      }
    }

    if (!best) break;
    placed.push(best);
    remaining = remaining.filter(([tx, tz]) => !covers(best![0], best![1], tx, tz, lo, hi));
  }

  return placed;
}

function pruneAndMerge(
  initial: Array<[number, number]>,
  pts: ReadonlyArray<[number, number]>,
  lo: number,
  hi: number
): Array<[number, number]> {
  let centers = initial.map(([x, z]) => [normZero(x), normZero(z)] as [number, number]);

  let improved = true;
  while (improved) {
    improved = false;

    // 1) Redundancy prune
    for (let i = centers.length - 1; i >= 0; i--) {
      const subset = centers.filter((_, idx) => idx !== i);
      const ok = pts.every(([tx, tz]) =>
        subset.some(([cx, cz]) => covers(cx, cz, tx, tz, lo, hi))
      );
      if (ok) {
        centers = subset;
        improved = true;
        break;
      }
    }
    if (improved) continue;

    // 2) 2-into-1 geometric merge: if removing pair (i, j) leaves uncovered points that fit in ONE square, merge them!
    outer: for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const others = centers.filter((_, idx) => idx !== i && idx !== j);
        const need: Array<[number, number]> = [];
        for (const [tx, tz] of pts) {
          if (!others.some(([cx, cz]) => covers(cx, cz, tx, tz, lo, hi))) {
            need.push([tx, tz]);
          }
        }
        if (need.length === 0) {
          centers = others;
          improved = true;
          break outer;
        }
        const merged = boundingBoxCenter(need, lo, hi);
        if (merged) {
          centers = [...others, merged];
          improved = true;
          break outer;
        }
      }
    }
  }

  // Re-center each loader cleanly over its uniquely required points
  centers = centers.map(([cx, cz], idx) => {
    const others = centers.filter((_, oIdx) => oIdx !== idx);
    const mustCover = pts.filter(
      ([tx, tz]) => !others.some(([ox, oz]) => covers(ox, oz, tx, tz, lo, hi))
    );
    const centered = boundingBoxCenter(mustCover, lo, hi);
    return centered ?? [normZero(cx), normZero(cz)];
  });

  return centers.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
}

function fastLargeGridSweep(
  targets: Set<string>,
  pts: ReadonlyArray<[number, number]>,
  lo: number,
  hi: number
): Array<[number, number]> {
  const uncovered = new Set<string>(targets);
  const sorted = pts.slice().sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
  const placed: Array<[number, number]> = [];

  for (let idx = 0; idx < sorted.length; idx++) {
    const [ax, az] = sorted[idx];
    if (!uncovered.has(chunkKey(ax, az))) continue;

    // Anchor square flush top-left against (ax, az)
    const cx = ax - lo;
    const cz = az - lo;
    placed.push([normZero(cx), normZero(cz)]);

    for (let z = cz + lo; z <= cz + hi; z++) {
      for (let x = cx + lo; x <= cx + hi; x++) {
        uncovered.delete(chunkKey(x, z));
      }
    }
    if (uncovered.size === 0) break;
  }

  return placed;
}

export function solveChunkLoaders(
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

  const targetList = Array.from(targets).map(parseChunkKey);
  const side =
    option === 'portal' ? portalSide : option === 'pearl' ? pearlSide : simDistance * 2 + 1;
  const lo = -Math.floor((side - 1) / 2);
  const hi = Math.ceil((side - 1) / 2);

  let chosenCenters: Array<[number, number]> = [];

  if (side <= 1) {
    chosenCenters = targetList.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
  } else {
    // 1) Exact k = 1
    const single = boundingBoxCenter(targetList, lo, hi);
    if (single) {
      chosenCenters = [single];
    } else {
      // 2) Exact k = 2
      const two = tryTwoLoaders(targetList, lo, hi);
      if (two) {
        chosenCenters = two.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
      } else if (targetList.length > 600) {
        // Fast O(N * side^2) strip sweep so huge grids up to 100x100 stay instant
        chosenCenters = fastLargeGridSweep(targets, targetList, lo, hi);
      } else {
        // 3) 8 orthogonal corner-anchored sweeps + prune/merge -> pick global best
        const sweeps: Array<[1 | -1, 1 | -1, 'z' | 'x']> = [
          [1, 1, 'z'],
          [-1, 1, 'z'],
          [1, -1, 'z'],
          [-1, -1, 'z'],
          [1, 1, 'x'],
          [-1, 1, 'x'],
          [1, -1, 'x'],
          [-1, -1, 'x'],
        ];
        let bestSol: Array<[number, number]> | null = null;
        for (const [dx, dz, axis] of sweeps) {
          const raw = sweepCover(targetList, lo, hi, dx, dz, axis);
          const refined = pruneAndMerge(raw, targetList, lo, hi);
          if (!bestSol || refined.length < bestSol.length) {
            bestSol = refined;
          }
        }
        chosenCenters = bestSol ?? [];
      }
    }
  }

  const primaryChunks = new Set<string>();
  const secondaryChunks = new Set<string>();
  const lazyChunks = new Set<string>();

  for (const [cx, cz] of chosenCenters) {
    if (option === 'player') {
      const visR = Math.min(simDistance, 45);
      for (let dz = -visR; dz <= visR; dz++) {
        for (let dx = -visR; dx <= visR; dx++) {
          primaryChunks.add(chunkKey(cx + dx, cz + dz));
        }
      }
    } else {
      for (let dz = lo; dz <= hi; dz++) {
        for (let dx = lo; dx <= hi; dx++) {
          const k = chunkKey(cx + dx, cz + dz);
          if (req === 'entity') primaryChunks.add(k);
          else secondaryChunks.add(k);
        }
      }
      if (req === 'entity') {
        for (let dz = lo - 1; dz <= hi + 1; dz++) {
          for (let dx = lo - 1; dx <= hi + 1; dx++) {
            const k = chunkKey(cx + dx, cz + dz);
            if (!primaryChunks.has(k)) secondaryChunks.add(k);
          }
        }
        for (let dz = lo - 2; dz <= hi + 2; dz++) {
          for (let dx = lo - 2; dx <= hi + 2; dx++) {
            const k = chunkKey(cx + dx, cz + dz);
            if (!primaryChunks.has(k) && !secondaryChunks.has(k)) lazyChunks.add(k);
          }
        }
      } else {
        for (let dz = lo - 1; dz <= hi + 1; dz++) {
          for (let dx = lo - 1; dx <= hi + 1; dx++) {
            const k = chunkKey(cx + dx, cz + dz);
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
