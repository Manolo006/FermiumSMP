import { ALL_ENCHANTMENTS, type MinecraftItem } from '../data/minecraftEnchantments';

export interface SelectedEnchantment {
  id: string;
  level: number;
}

export interface EnchantmentBadge {
  id: string;
  nameIt: string;
  nameEn: string;
  level: number;
  roman: string;
  multiplier: number;
}

export interface AnvilSlotInfo {
  type: 'item' | 'book';
  title: string;
  enchantments: EnchantmentBadge[];
  priorWorkCount: number;
  priorWorkPenalty: number;
  producedInStep?: number;
}

export interface AnvilStepCost {
  targetPenalty: number;
  sacrificePenalty: number;
  enchantmentTransferCost: number;
  renameCost: number;
  totalStepCost: number;
}

export interface AnvilStep {
  stepIndex: number;
  leftSlot: AnvilSlotInfo;
  rightSlot: AnvilSlotInfo;
  resultSlot: AnvilSlotInfo;
  costBreakdown: AnvilStepCost;
  isSurvivalFeasible: boolean;
  warnings: string[];
}

export interface OptimizerResult {
  totalCostLevels: number;
  totalCostPoints: number;
  maxStepCost: number;
  isSurvivalFeasible: boolean;
  finalItemPenaltyCount: number;
  finalItemPenaltyLevels: number;
  steps: AnvilStep[];
}

export function toRoman(num: number): string {
  switch (num) {
    case 1:
      return 'I';
    case 2:
      return 'II';
    case 3:
      return 'III';
    case 4:
      return 'IV';
    case 5:
      return 'V';
    default:
      return String(num);
  }
}

export function priorWorkPenalty(count: number): number {
  if (count <= 0) return 0;
  return (1 << count) - 1;
}

export function levelToXpPoints(level: number): number {
  if (level <= 0) return 0;
  if (level <= 16) {
    return level * level + 6 * level;
  }
  if (level <= 31) {
    return Math.floor(2.5 * level * level - 40.5 * level + 360);
  }
  return Math.floor(4.5 * level * level - 162.5 * level + 2220);
}

interface InternalEnchant {
  id: string;
  level: number;
  cost: number;
  badge: EnchantmentBadge;
}

interface BookState {
  totalCost: number;
  maxStepCost: number;
  isLeaf?: boolean;
  index?: number;
  leftMask?: number;
  rightMask?: number;
  leftW?: number;
  rightW?: number;
  stepCost: number;
}

interface ItemState {
  totalCost: number;
  maxStepCost: number;
  fromItemMask?: number;
  fromItemW?: number;
  fromBookMask?: number;
  fromBookW?: number;
  stepCost: number;
}

export function optimizeAnvilOrder(
  targetItem: MinecraftItem,
  selected: SelectedEnchantment[],
  initialItemWorkCount: number = 0,
  renameItem: boolean = false,
  lang: 'it' | 'en' = 'it'
): OptimizerResult {
  // Filter only valid compatible enchantments
  const validEnchants: InternalEnchant[] = selected
    .filter((s) => ALL_ENCHANTMENTS[s.id] && targetItem.compatibleEnchantments.includes(s.id))
    .map((s) => {
      const def = ALL_ENCHANTMENTS[s.id];
      const lvl = Math.min(Math.max(1, s.level), def.maxLevel);
      const cost = lvl * def.bookMultiplier;
      return {
        id: s.id,
        level: lvl,
        cost,
        badge: {
          id: s.id,
          nameIt: def.nameIt,
          nameEn: def.nameEn,
          level: lvl,
          roman: toRoman(lvl),
          multiplier: def.bookMultiplier,
        },
      };
    });

  const N = validEnchants.length;

  if (N === 0) {
    return {
      totalCostLevels: 0,
      totalCostPoints: 0,
      maxStepCost: 0,
      isSurvivalFeasible: true,
      finalItemPenaltyCount: initialItemWorkCount,
      finalItemPenaltyLevels: priorWorkPenalty(initialItemWorkCount),
      steps: [],
    };
  }

  // Cost of all enchantments in a mask
  const getTransferCost = (mask: number): number => {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      if (mask & (1 << i)) {
        sum += validEnchants[i].cost;
      }
    }
    return sum;
  };

  // dpBook[mask] = Map of workCount -> BookState
  const dpBook: Map<number, BookState>[] = Array.from({ length: 1 << N }, () => new Map());

  // Base leaves: Single books
  for (let i = 0; i < N; i++) {
    dpBook[1 << i].set(0, {
      totalCost: 0,
      maxStepCost: 0,
      isLeaf: true,
      index: i,
      stepCost: 0,
    });
  }

  // Submask DP for composite books
  for (let size = 2; size <= N; size++) {
    for (let mask = 1; mask < 1 << N; mask++) {
      // Fast popcount
      let count = 0;
      let temp = mask;
      while (temp > 0) {
        temp &= temp - 1;
        count++;
      }
      if (count !== size) continue;

      // Iterate submasks
      for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
        const other = mask ^ sub;
        if (sub > other) continue; // avoid mirror symmetry

        const cSub = getTransferCost(sub);
        const cOther = getTransferCost(other);

        // Put higher transfer cost book in left slot (Target)
        // so that the cheaper book is transferred from right slot (Sacrifice)
        let leftMask = sub;
        let rightMask = other;
        let transferCost = cOther;
        if (cSub < cOther) {
          leftMask = other;
          rightMask = sub;
          transferCost = cSub;
        }

        for (const [wL, stateL] of dpBook[leftMask].entries()) {
          for (const [wR, stateR] of dpBook[rightMask].entries()) {
            const resW = Math.max(wL, wR) + 1;
            const stepCost = priorWorkPenalty(wL) + priorWorkPenalty(wR) + transferCost;
            const totalCost = stateL.totalCost + stateR.totalCost + stepCost;
            const maxStep = Math.max(stateL.maxStepCost, stateR.maxStepCost, stepCost);

            const existing = dpBook[mask].get(resW);
            // We favor lowest total cost, and break ties with lower maxStepCost
            if (
              !existing ||
              totalCost < existing.totalCost ||
              (totalCost === existing.totalCost && maxStep < existing.maxStepCost)
            ) {
              dpBook[mask].set(resW, {
                totalCost,
                maxStepCost: maxStep,
                leftMask,
                rightMask,
                leftW: wL,
                rightW: wR,
                stepCost,
              });
            }
          }
        }
      }
    }
  }

  // dpItem[mask] = Map of workCount -> ItemState
  const dpItem: Map<number, ItemState>[] = Array.from({ length: 1 << N }, () => new Map());
  dpItem[0].set(initialItemWorkCount, {
    totalCost: 0,
    maxStepCost: 0,
    stepCost: 0,
  });

  for (let size = 0; size < N; size++) {
    for (let itemMask = 0; itemMask < 1 << N; itemMask++) {
      let count = 0;
      let temp = itemMask;
      while (temp > 0) {
        temp &= temp - 1;
        count++;
      }
      if (count !== size) continue;

      const available = ((1 << N) - 1) ^ itemMask;
      for (const [itemW, itemState] of dpItem[itemMask].entries()) {
        // Try combining with any composite book from available
        for (let bookMask = available; bookMask > 0; bookMask = (bookMask - 1) & available) {
          const bookCost = getTransferCost(bookMask);
          for (const [bookW, bookState] of dpBook[bookMask].entries()) {
            const resW = Math.max(itemW, bookW) + 1;
            const stepCost = priorWorkPenalty(itemW) + priorWorkPenalty(bookW) + bookCost;
            const totalCost = itemState.totalCost + bookState.totalCost + stepCost;
            const maxStep = Math.max(itemState.maxStepCost, bookState.maxStepCost, stepCost);

            const nextMask = itemMask | bookMask;
            const existing = dpItem[nextMask].get(resW);
            if (
              !existing ||
              totalCost < existing.totalCost ||
              (totalCost === existing.totalCost && maxStep < existing.maxStepCost)
            ) {
              dpItem[nextMask].set(resW, {
                totalCost,
                maxStepCost: maxStep,
                fromItemMask: itemMask,
                fromItemW: itemW,
                fromBookMask: bookMask,
                fromBookW: bookW,
                stepCost,
              });
            }
          }
        }
      }
    }
  }

  // Choose the best final state:
  // 1) First priority: maxStepCost <= 39 (Survival Feasible)
  // 2) Lowest totalCost
  const finalMap = dpItem[(1 << N) - 1];
  let bestW = -1;
  let bestState: ItemState | null = null;

  for (const [w, state] of finalMap.entries()) {
    if (state.maxStepCost <= 39) {
      if (
        !bestState ||
        state.totalCost < bestState.totalCost ||
        (state.totalCost === bestState.totalCost && w < bestW)
      ) {
        bestState = state;
        bestW = w;
      }
    }
  }

  // If no state has maxStepCost <= 39, pick the one with lowest maxStepCost, then lowest totalCost
  if (!bestState) {
    for (const [w, state] of finalMap.entries()) {
      if (
        !bestState ||
        state.maxStepCost < bestState.maxStepCost ||
        (state.maxStepCost === bestState.maxStepCost && state.totalCost < bestState.totalCost)
      ) {
        bestState = state;
        bestW = w;
      }
    }
  }

  if (!bestState) {
    return {
      totalCostLevels: 0,
      totalCostPoints: 0,
      maxStepCost: 0,
      isSurvivalFeasible: false,
      finalItemPenaltyCount: initialItemWorkCount,
      finalItemPenaltyLevels: priorWorkPenalty(initialItemWorkCount),
      steps: [],
    };
  }

  // Helper to extract badges from mask
  const getBadges = (mask: number): EnchantmentBadge[] => {
    const list: EnchantmentBadge[] = [];
    for (let i = 0; i < N; i++) {
      if (mask & (1 << i)) {
        list.push(validEnchants[i].badge);
      }
    }
    return list;
  };

  // Traceback to reconstruct anvil steps in chronological order
  const rawSteps: AnvilStep[] = [];
  const bookProducedStepMap = new Map<string, number>();

  function traceBook(mask: number, w: number): AnvilSlotInfo {
    const st = dpBook[mask].get(w);
    if (!st || st.isLeaf) {
      const b = validEnchants[st!.index!].badge;
      return {
        type: 'book',
        title: lang === 'it' ? `Libro (${b.nameIt} ${b.roman})` : `Book (${b.nameEn} ${b.roman})`,
        enchantments: [b],
        priorWorkCount: w,
        priorWorkPenalty: priorWorkPenalty(w),
      };
    }

    const left = traceBook(st.leftMask!, st.leftW!);
    const right = traceBook(st.rightMask!, st.rightW!);

    const badges = getBadges(mask);
    const stepIdx = rawSteps.length + 1;
    const stepCost = st.stepCost;
    const isFeasible = stepCost <= 39;

    const warnings: string[] = [];
    if (!isFeasible) {
      warnings.push(
        lang === 'it'
          ? 'Troppo Costoso! Supera il limite di 39 livelli in Survival.'
          : 'Too Expensive! Exceeds the 39 level cap in Survival.'
      );
    }

    const resultSlot: AnvilSlotInfo = {
      type: 'book',
      title:
        lang === 'it'
          ? `Libro Combinato (${badges.map((b) => `${b.nameIt} ${b.roman}`).join(', ')})`
          : `Combined Book (${badges.map((b) => `${b.nameEn} ${b.roman}`).join(', ')})`,
      enchantments: badges,
      priorWorkCount: w,
      priorWorkPenalty: priorWorkPenalty(w),
      producedInStep: stepIdx,
    };

    rawSteps.push({
      stepIndex: stepIdx,
      leftSlot: left,
      rightSlot: right,
      resultSlot,
      costBreakdown: {
        targetPenalty: priorWorkPenalty(st.leftW!),
        sacrificePenalty: priorWorkPenalty(st.rightW!),
        enchantmentTransferCost: getTransferCost(st.rightMask!),
        renameCost: 0,
        totalStepCost: stepCost,
      },
      isSurvivalFeasible: isFeasible,
      warnings,
    });

    bookProducedStepMap.set(`${mask}-${w}`, stepIdx);
    return resultSlot;
  }

  function traceItem(mask: number, w: number): AnvilSlotInfo {
    const st = dpItem[mask].get(w);
    if (!st || mask === 0) {
      return {
        type: 'item',
        title: lang === 'it' ? targetItem.nameIt : targetItem.nameEn,
        enchantments: [],
        priorWorkCount: w,
        priorWorkPenalty: priorWorkPenalty(w),
      };
    }

    const prevItem = traceItem(st.fromItemMask!, st.fromItemW!);
    const sacrificeBook = traceBook(st.fromBookMask!, st.fromBookW!);

    const badges = getBadges(mask);
    const stepIdx = rawSteps.length + 1;
    const stepCost = st.stepCost;
    const isFeasible = stepCost <= 39;

    const warnings: string[] = [];
    if (!isFeasible) {
      warnings.push(
        lang === 'it'
          ? 'Troppo Costoso! Supera il limite di 39 livelli in Survival.'
          : 'Too Expensive! Exceeds the 39 level cap in Survival.'
      );
    }

    const resultSlot: AnvilSlotInfo = {
      type: 'item',
      title: lang === 'it' ? targetItem.nameIt : targetItem.nameEn,
      enchantments: badges,
      priorWorkCount: w,
      priorWorkPenalty: priorWorkPenalty(w),
      producedInStep: stepIdx,
    };

    rawSteps.push({
      stepIndex: stepIdx,
      leftSlot: prevItem,
      rightSlot: sacrificeBook,
      resultSlot,
      costBreakdown: {
        targetPenalty: priorWorkPenalty(st.fromItemW!),
        sacrificePenalty: priorWorkPenalty(st.fromBookW!),
        enchantmentTransferCost: getTransferCost(st.fromBookMask!),
        renameCost: 0,
        totalStepCost: stepCost,
      },
      isSurvivalFeasible: isFeasible,
      warnings,
    });

    return resultSlot;
  }

  traceItem((1 << N) - 1, bestW);

  // If renameItem is true, apply 1 level rename cost to the first anvil step involving the item
  let extraRename = 0;
  if (renameItem) {
    const firstItemStep = rawSteps.find((s) => s.leftSlot.type === 'item');
    if (firstItemStep) {
      firstItemStep.costBreakdown.renameCost = 1;
      firstItemStep.costBreakdown.totalStepCost += 1;
      extraRename = 1;
      if (firstItemStep.costBreakdown.totalStepCost > 39) {
        firstItemStep.isSurvivalFeasible = false;
        firstItemStep.warnings.push(
          lang === 'it'
            ? 'Troppo Costoso con la rinomina! Supera 39 livelli.'
            : 'Too Expensive with rename! Exceeds 39 levels.'
        );
      }
    }
  }

  const finalTotalCost = bestState.totalCost + extraRename;
  const finalMaxStep = Math.max(...rawSteps.map((s) => s.costBreakdown.totalStepCost));
  const totalPoints = rawSteps.reduce(
    (acc, s) => acc + levelToXpPoints(s.costBreakdown.totalStepCost),
    0
  );

  return {
    totalCostLevels: finalTotalCost,
    totalCostPoints: totalPoints,
    maxStepCost: finalMaxStep,
    isSurvivalFeasible: finalMaxStep <= 39,
    finalItemPenaltyCount: bestW,
    finalItemPenaltyLevels: priorWorkPenalty(bestW),
    steps: rawSteps,
  };
}
