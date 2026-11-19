import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  Axe,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crosshair,
  Feather,
  Fish,
  Flame,
  Footprints,
  Hammer,
  HelpCircle,
  Paintbrush,
  Pickaxe,
  Plus,
  RotateCcw,
  Scissors,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sword,
  Target,
  Wrench,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';
import { ToolsSubNav } from '../components/navigation/ToolsSubNav';
import {
  ALL_ENCHANTMENTS,
  MINECRAFT_ITEMS,
  type ItemCategory,
  type MinecraftItem,
} from '../data/minecraftEnchantments';
import {
  levelToXpPoints,
  optimizeAnvilOrder,
  priorWorkPenalty,
  toRoman,
  type SelectedEnchantment,
} from '../utils/anvilOptimizer';

// Map icon name to Lucide component
const ITEM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sword,
  Hammer,
  Axe,
  Crosshair,
  Target,
  Zap,
  Pickaxe,
  Shovel: Pickaxe,
  Hoe: Pickaxe,
  Fish,
  Scissors,
  Shield,
  ShieldAlert,
  Sparkles,
  Footprints,
  Feather,
  ShieldCheck,
  Paintbrush,
  Flame,
};

export const EnchantingPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  // --- STATE ---
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('weapons');
  const [selectedItemId, setSelectedItemId] = useState<string>('sword');

  // Selected enchantments map: id -> level
  const [activeEnchants, setActiveEnchants] = useState<Record<string, number>>(() => {
    const sword = MINECRAFT_ITEMS.find((i) => i.id === 'sword');
    return sword?.defaultPreset ? { ...sword.defaultPreset } : {};
  });

  // Advanced options
  const [initialItemWorkCount, setInitialItemWorkCount] = useState<number>(0);
  const [renameItem, setRenameItem] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);

  // Current Item Object
  const currentItem = useMemo(() => {
    return MINECRAFT_ITEMS.find((i) => i.id === selectedItemId) || MINECRAFT_ITEMS[0];
  }, [selectedItemId]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return MINECRAFT_ITEMS;
    return MINECRAFT_ITEMS.filter((i) => i.category === selectedCategory);
  }, [selectedCategory]);

  // Handle changing target item
  const handleSelectItem = (item: MinecraftItem) => {
    setSelectedItemId(item.id);
    if (item.defaultPreset) {
      setActiveEnchants({ ...item.defaultPreset });
    } else {
      const initial: Record<string, number> = {};
      item.compatibleEnchantments.forEach((eId) => {
        const def = ALL_ENCHANTMENTS[eId];
        if (def) initial[eId] = def.maxLevel;
      });
      setActiveEnchants(initial);
    }
  };

  // Toggle or swap an enchantment cleanly (auto-replaces conflicting enchantments on 1 click)
  const handleToggleEnchant = (enchantId: string) => {
    setActiveEnchants((prev) => {
      const next = { ...prev };
      if (next[enchantId] !== undefined) {
        delete next[enchantId];
      } else {
        const def = ALL_ENCHANTMENTS[enchantId];
        if (!def) return prev;

        def.incompatibleWith.forEach((confId) => {
          delete next[confId];
        });

        next[enchantId] = def.maxLevel;
      }
      return next;
    });
  };

  // Change enchantment level
  const handleChangeLevel = (enchantId: string, level: number) => {
    setActiveEnchants((prev) => ({
      ...prev,
      [enchantId]: level,
    }));
  };

  // Preset loaders
  const handleLoadPreset = () => {
    if (currentItem.defaultPreset) {
      setActiveEnchants({ ...currentItem.defaultPreset });
    }
  };

  const handleClearAll = () => {
    setActiveEnchants({});
  };

  // Check if selecting this enchantment will replace an active incompatible one
  const getConflictInfo = (enchantId: string): string | null => {
    const def = ALL_ENCHANTMENTS[enchantId];
    if (!def) return null;
    for (const confId of def.incompatibleWith) {
      if (activeEnchants[confId] !== undefined) {
        const confDef = ALL_ENCHANTMENTS[confId];
        return isIt
          ? `Sostituisce ${confDef?.nameIt || confId}`
          : `Replaces ${confDef?.nameEn || confId}`;
      }
    }
    return null;
  };

  // Compute optimization plan
  const selectedList: SelectedEnchantment[] = useMemo(() => {
    return Object.entries(activeEnchants).map(([id, level]) => ({ id, level }));
  }, [activeEnchants]);

  const plan = useMemo(() => {
    return optimizeAnvilOrder(
      currentItem,
      selectedList,
      initialItemWorkCount,
      renameItem,
      lang === 'en' ? 'en' : 'it'
    );
  }, [currentItem, selectedList, initialItemWorkCount, renameItem, lang]);

  // Copy plan to clipboard
  const handleCopyPlan = () => {
    const lines: string[] = [
      `=== FERMIUM SMP - PIANO INCANTESIMI INCUDINE ===`,
      `Oggetto: ${isIt ? currentItem.nameIt : currentItem.nameEn}`,
      `Livelli Totali: ${plan.totalCostLevels} LVL | Punti XP Stimati: ~${plan.totalCostPoints} XP`,
      `Costo Singolo Max: ${plan.maxStepCost} LVL (${plan.isSurvivalFeasible ? 'Survival Safe' : 'Troppo Costoso!'})`,
      `Numero Passaggi: ${plan.steps.length}`,
      ``,
    ];

    plan.steps.forEach((s) => {
      const leftEnchants = s.leftSlot.enchantments.map((e) => `${isIt ? e.nameIt : e.nameEn} ${e.roman}`).join(', ');
      const rightEnchants = s.rightSlot.enchantments.map((e) => `${isIt ? e.nameIt : e.nameEn} ${e.roman}`).join(', ');
      lines.push(
        `${isIt ? 'Passo' : 'Step'} ${s.stepIndex}: [${s.leftSlot.title}${leftEnchants ? ` - ${leftEnchants}` : ''}] + [${s.rightSlot.title}${rightEnchants ? ` - ${rightEnchants}` : ''}]`
      );
      lines.push(
        `  -> ${s.resultSlot.title} | ${s.costBreakdown.totalStepCost} LVL (Target Pen: ${s.costBreakdown.targetPenalty}, Sac Pen: ${s.costBreakdown.sacrificePenalty}, Transfer: ${s.costBreakdown.enchantmentTransferCost})`
      );
    });

    lines.push(``, `Generato su Fermium SMP: https://manolo006.github.io/FermiumSMP/#/tools/enchanting`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  const ItemIcon = ITEM_ICONS[currentItem.iconName] || Sword;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Unified Tools Navigation */}
        <ToolsSubNav />

        {/* --- PAGE HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl text-left">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="cyan">
                <Hammer className="w-3 h-3" />
                <span>{isIt ? 'Strumenti TMC' : 'TMC Tools'}</span>
              </Badge>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Minecraft 1.21.x Ready
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {isIt ? 'Ottimizzatore ' : 'Anvil & '}
              <span className="text-accent-cyan">
                {isIt ? 'Incudine & Incantesimi' : 'Enchant Optimizer'}
              </span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {isIt
                ? 'Calcola l’ordine matematicamente perfetto per combinare libri e attrezzi nell’incudine. Minimizza i livelli di esperienza, rispetta le prior work penalties esponenziali (2ⁿ − 1) ed evita il blocco "Troppo Costoso!".'
                : 'Calculate the mathematically optimal order to combine books and gear in Minecraft anvils. Minimizes total XP levels, tracks exponential prior work penalties (2ⁿ − 1), and avoids "Too Expensive!".'}
            </p>
          </div>
        </div>

        {/* --- STEP 1: ITEM SELECTION --- */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 mb-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                <ItemIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent-cyan font-semibold">
                  {isIt ? 'Passo 1' : 'Step 1'}
                </span>
                <h2 className="text-base sm:text-lg font-heading font-semibold text-text-primary">
                  {isIt ? 'Seleziona l’Oggetto da Incantare' : 'Select Gear Item'}
                </h2>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0F14] border border-white/10 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', labelIt: 'Tutti', labelEn: 'All' },
                  { id: 'weapons', labelIt: 'Armi', labelEn: 'Weapons' },
                  { id: 'armor', labelIt: 'Armature', labelEn: 'Armor' },
                  { id: 'tools', labelIt: 'Attrezzi', labelEn: 'Tools' },
                  { id: 'other', labelIt: 'Altro', labelEn: 'Other' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-[background-color,color,box-shadow] duration-150 cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-accent-cyan text-[#061018] font-semibold shadow-glow-cyan'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {isIt ? cat.labelIt : cat.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {filteredItems.map((item) => {
              const Icon = ITEM_ICONS[item.iconName] || Sword;
              const isSelected = item.id === selectedItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectItem(item)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.97] cursor-pointer ${
                    isSelected
                      ? 'bg-accent-cyan/15 border-accent-cyan/55 shadow-[0_0_18px_rgba(34,211,238,0.18)] text-text-primary'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05] text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-accent-cyan text-[#061018]'
                        : 'bg-white/[0.05] border border-white/10 text-accent-cyan'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-heading font-medium truncate">
                      {isIt ? item.nameIt.split(' (')[0] : item.nameEn.split(' (')[0]}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted truncate tabular-nums">
                      {item.compatibleEnchantments.length} inc.
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- STEP 2: ENCHANTMENT SELECTION & PRESETS --- */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 mb-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-accent-cyan font-semibold">
                    {isIt ? 'Passo 2' : 'Step 2'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] border border-white/10 text-text-secondary tabular-nums">
                    {selectedList.length} {isIt ? 'selezionati' : 'selected'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-heading font-semibold text-text-primary">
                  {isIt ? 'Scegli gli Incantesimi Desiderati' : 'Select Desired Enchantments'}
                </h2>
              </div>
            </div>

            {/* Presets and Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadPreset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/35 text-xs font-mono font-semibold text-accent-cyan transition-colors cursor-pointer active:scale-[0.97]"
                title={isIt ? 'Carica il set perfetto consigliato per questo oggetto' : 'Load recommended god-tier setup'}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isIt ? 'Preset Perfetto' : 'God Preset'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer active:scale-[0.97]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isIt ? 'Azzera' : 'Clear'}</span>
              </button>
            </div>
          </div>

          {/* Enchantments Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentItem.compatibleEnchantments.map((enchantId) => {
              const def = ALL_ENCHANTMENTS[enchantId];
              if (!def) return null;

              const isChecked = activeEnchants[enchantId] !== undefined;
              const currentLevel = activeEnchants[enchantId] || def.maxLevel;
              const conflictText = !isChecked ? getConflictInfo(enchantId) : null;
              const willSwap = Boolean(conflictText);

              return (
                <div
                  key={enchantId}
                  className={`rounded-xl p-3.5 border transition-[background-color,border-color,opacity] duration-150 ${
                    isChecked
                      ? 'bg-accent-cyan/[0.07] border-accent-cyan/40 shadow-sm'
                      : willSwap
                        ? 'bg-white/[0.015] border-dashed border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/[0.04]'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      aria-pressed={isChecked}
                      onClick={() => handleToggleEnchant(enchantId)}
                      className="flex items-start gap-2.5 text-left flex-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 rounded-lg"
                    >
                      <div
                        className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-accent-cyan text-[#061018]'
                            : willSwap
                              ? 'bg-amber-400/10 border border-amber-400/40 text-amber-300'
                              : 'bg-white/[0.06] border border-white/15'
                        }`}
                      >
                        {isChecked ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : willSwap ? (
                          <ArrowLeftRight className="w-3 h-3" />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-heading font-medium text-text-primary">
                            {isIt ? def.nameIt : def.nameEn}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-text-secondary tabular-nums">
                            ×{def.bookMultiplier}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-text-muted">
                          {isIt ? def.nameEn : def.nameIt}
                        </div>
                      </div>
                    </button>

                    {/* Level Pills (if maxLevel > 1) */}
                    {def.maxLevel > 1 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: def.maxLevel }, (_, i) => i + 1).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            disabled={!isChecked}
                            onClick={() => handleChangeLevel(enchantId, lvl)}
                            aria-label={`${isIt ? def.nameIt : def.nameEn} ${toRoman(lvl)}`}
                            className={`w-6 h-6 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                              !isChecked
                                ? 'opacity-30 cursor-not-allowed text-text-secondary bg-white/[0.02]'
                                : currentLevel === lvl
                                  ? 'bg-accent-cyan text-[#061018] font-bold shadow-glow-cyan'
                                  : 'bg-white/[0.05] hover:bg-white/[0.12] text-text-secondary'
                            }`}
                          >
                            {toRoman(lvl)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Click-to-swap hint if conflicting */}
                  {conflictText && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-300/90 font-mono">
                      <ArrowLeftRight className="w-3 h-3 shrink-0" />
                      <span>{conflictText}</span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="mt-2 text-xs text-text-secondary/85 leading-relaxed">
                    {isIt ? def.descriptionIt : def.descriptionEn}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Advanced options accordion */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <button
              type="button"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer py-1"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-accent-cyan" />
                <span>
                  {isIt
                    ? 'Opzioni Avanzate (Incudine già usata / Rinomina)'
                    : 'Advanced Anvil Options (Prior Uses / Rename)'}
                </span>
              </div>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 rounded-xl bg-[#0B0F14] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-medium text-text-primary mb-1">
                    {isIt ? 'Usi Incudine Precedenti sull’Oggetto Base' : 'Target Item Prior Anvil Uses'}
                  </label>
                  <p className="text-[11px] text-text-secondary mb-2 tabular-nums">
                    {isIt
                      ? `Penalità attuale: ${priorWorkPenalty(initialItemWorkCount)} livelli (${initialItemWorkCount} utilizzi)`
                      : `Current penalty: ${priorWorkPenalty(initialItemWorkCount)} levels (${initialItemWorkCount} uses)`}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((uses) => (
                      <button
                        key={uses}
                        type="button"
                        aria-pressed={initialItemWorkCount === uses}
                        onClick={() => setInitialItemWorkCount(uses)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          initialItemWorkCount === uses
                            ? 'bg-accent-cyan text-[#061018] font-bold'
                            : 'bg-white/[0.04] text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {uses} {isIt ? (uses === 1 ? 'uso' : 'usi') : uses === 1 ? 'use' : 'uses'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-text-primary mb-1">
                    {isIt ? 'Rinomina Oggetto in Contemporanea' : 'Rename Item During Process'}
                  </label>
                  <p className="text-[11px] text-text-secondary mb-2">
                    {isIt
                      ? 'Aggiunge 1 livello di costo alla prima combinazione con l’oggetto.'
                      : 'Adds 1 level cost to the first operation involving the item.'}
                  </p>
                  <button
                    type="button"
                    aria-pressed={renameItem}
                    onClick={() => setRenameItem(!renameItem)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      renameItem
                        ? 'bg-accent-cyan/15 border border-accent-cyan/35 text-accent-cyan font-semibold'
                        : 'bg-white/[0.04] border border-white/10 text-text-secondary'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        renameItem ? 'bg-accent-cyan text-[#061018]' : 'bg-white/[0.08]'
                      }`}
                    >
                      {renameItem && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{isIt ? 'Applica Rinomina (+1 LVL)' : 'Apply Rename (+1 LVL)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- STEP 3: COST METRICS HUD --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
          {/* Total Levels */}
          <div className="glass-panel border-gradient-cyan rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-cyan-deep via-accent-cyan to-accent-cyan-hover" />
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-1">
              {isIt ? 'Livelli XP Totali' : 'Total XP Levels'}
            </div>
            <div className="text-2xl sm:text-4xl font-pixel text-accent-cyan tracking-tight tabular-nums">
              {plan.totalCostLevels}{' '}
              <span className="text-sm font-mono text-text-secondary">LVL</span>
            </div>
            <div className="text-[11px] font-mono text-text-muted mt-1">
              {isIt ? 'Somma di tutti i passaggi' : 'Sum across all steps'}
            </div>
          </div>

          {/* Total Points */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-teal-400/80 to-emerald-500/40" />
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-1">
              {isIt ? 'Punti XP Minimi' : 'Min XP Points'}
            </div>
            <div className="text-2xl sm:text-4xl font-pixel text-emerald-400 tracking-tight tabular-nums">
              ~{plan.totalCostPoints.toLocaleString(isIt ? 'it-IT' : 'en-US')}
            </div>
            <div className="text-[11px] font-mono text-text-muted mt-1">
              {isIt ? 'Se livellato passo per passo' : 'Step-by-step from lvl 0'}
            </div>
          </div>

          {/* Max Step Cost */}
          <div
            className={`glass-panel rounded-2xl p-4 sm:p-5 border relative overflow-hidden ${
              plan.isSurvivalFeasible ? 'border-emerald-500/20' : 'border-red-500/35'
            }`}
          >
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                plan.isSurvivalFeasible ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-1">
              {isIt ? 'Costo Singolo Max' : 'Max Single Step'}
            </div>
            <div
              className={`text-2xl sm:text-4xl font-pixel tracking-tight tabular-nums ${
                plan.isSurvivalFeasible ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {plan.maxStepCost}{' '}
              <span className="text-sm font-mono text-text-secondary">LVL</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-mono">
              {plan.isSurvivalFeasible ? (
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Survival Safe (≤ 39)</span>
                </span>
              ) : (
                <span className="text-red-400 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{isIt ? 'Troppo Costoso!' : 'Too Expensive!'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Anvil Uses */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20" />
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-secondary mb-1">
              {isIt ? 'Passaggi Incudine' : 'Anvil Steps'}
            </div>
            <div className="text-2xl sm:text-4xl font-pixel text-text-primary tracking-tight tabular-nums">
              {plan.steps.length}{' '}
              <span className="text-sm font-mono text-text-secondary">step</span>
            </div>
            <div className="text-[11px] font-mono text-text-muted mt-1 tabular-nums">
              {isIt
                ? `Penalità finale: ${plan.finalItemPenaltyLevels} (${plan.finalItemPenaltyCount} usi)`
                : `Final penalty: ${plan.finalItemPenaltyLevels} (${plan.finalItemPenaltyCount} uses)`}
            </div>
          </div>
        </div>

        {/* --- STEP 4: VISUAL ANVIL CRAFTING PLAN --- */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent-cyan font-semibold">
                  {isIt ? 'Piano d’Azione' : 'Crafting Plan'}
                </span>
                <h2 className="text-base sm:text-lg font-heading font-semibold text-text-primary">
                  {isIt ? 'Sequenza di Combinazione Incudine' : 'Step-by-Step Anvil Sequence'}
                </h2>
              </div>
            </div>

            {plan.steps.length > 0 && (
              <button
                type="button"
                onClick={handleCopyPlan}
                className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer active:scale-[0.97]"
              >
                {copiedPlan ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{isIt ? 'Copiato!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>{isIt ? 'Copia Istruzioni Testuali' : 'Copy Text Checklist'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Empty state */}
          {plan.steps.length === 0 && (
            <div className="py-14 text-center">
              <BookOpen className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
              <div className="text-base font-heading font-medium text-text-primary">
                {isIt ? 'Nessun incantesimo selezionato' : 'No enchantments selected'}
              </div>
              <p className="text-xs text-text-secondary mt-1 mb-5 max-w-sm mx-auto">
                {isIt
                  ? 'Seleziona almeno un incantesimo sopra oppure carica subito il set consigliato.'
                  : 'Select at least one enchantment above or load the recommended preset.'}
              </p>
              <button
                type="button"
                onClick={handleLoadPreset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-cyan text-[#061018] text-xs font-heading font-semibold hover:bg-accent-cyan-hover transition-colors cursor-pointer active:scale-[0.97]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isIt ? 'Carica Preset Perfetto' : 'Load God Preset'}</span>
              </button>
            </div>
          )}

          {/* Steps List */}
          <div className="space-y-5">
            {plan.steps.map((step) => {
              const stepXpPoints = levelToXpPoints(step.costBreakdown.totalStepCost);
              const isResultItem = step.resultSlot.type === 'item';

              return (
                <div
                  key={step.stepIndex}
                  className="rounded-2xl bg-[#0B0F14] border border-white/10 p-4 sm:p-5 transition-colors hover:border-accent-cyan/25"
                >
                  {/* Step Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-accent-cyan text-[#061018] shadow-glow-cyan tabular-nums">
                        {isIt ? `PASSO ${step.stepIndex}` : `STEP ${step.stepIndex}`}
                      </span>

                      {step.isSurvivalFeasible ? (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          <span>Survival Safe</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 bg-red-500/15 border border-red-500/35 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{isIt ? 'Troppo Costoso!' : 'Too Expensive!'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-secondary">
                        {isIt ? 'Costo Operazione:' : 'Operation Cost:'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-pixel font-bold bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan tabular-nums">
                        {step.costBreakdown.totalStepCost} LVL
                      </span>
                    </div>
                  </div>

                  {/* Balanced 2-Slot Input Row: Target + Sacrifice */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                    {/* Left Slot: Target */}
                    <div className="rounded-xl bg-white/[0.025] border border-white/10 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                            {isIt ? 'Slot Sinistro (Target)' : 'Left Slot (Target)'}
                          </span>
                          {step.leftSlot.producedInStep && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan font-semibold">
                              {isIt
                                ? `Dal Passo ${step.leftSlot.producedInStep}`
                                : `From Step ${step.leftSlot.producedInStep}`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                              step.leftSlot.type === 'item'
                                ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                                : 'bg-violet-500/10 border-violet-400/30 text-violet-300'
                            }`}
                          >
                            {step.leftSlot.type === 'item' ? (
                              <ItemIcon className="w-5 h-5" />
                            ) : (
                              <BookOpen className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-heading font-medium text-text-primary truncate">
                              {step.leftSlot.title}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5 tabular-nums">
                              {isIt ? 'Penalità' : 'Penalty'}: {step.leftSlot.priorWorkPenalty} lv. ({step.leftSlot.priorWorkCount} {isIt ? 'usi' : 'uses'})
                            </div>
                          </div>
                        </div>
                      </div>

                      {step.leftSlot.enchantments.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {step.leftSlot.enchantments.map((e) => (
                            <span
                              key={e.id}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                step.leftSlot.type === 'item'
                                  ? 'bg-accent-cyan/10 border-accent-cyan/25 text-accent-cyan'
                                  : 'bg-violet-500/10 border-violet-400/25 text-violet-200'
                              }`}
                            >
                              {isIt ? e.nameIt : e.nameEn} {e.roman}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Plus Connector */}
                    <div className="flex items-center justify-center py-0.5">
                      <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/15 flex items-center justify-center text-accent-cyan">
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </div>

                    {/* Right Slot: Sacrifice */}
                    <div className="rounded-xl bg-white/[0.025] border border-white/10 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                            {isIt ? 'Slot Destro (Sacrificio)' : 'Right Slot (Sacrifice)'}
                          </span>
                          {step.rightSlot.producedInStep && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 border border-violet-400/30 text-violet-300 font-semibold">
                              {isIt
                                ? `Dal Passo ${step.rightSlot.producedInStep}`
                                : `From Step ${step.rightSlot.producedInStep}`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-400/30 flex items-center justify-center text-violet-300 shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-heading font-medium text-text-primary truncate">
                              {step.rightSlot.title}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5 tabular-nums">
                              {isIt ? 'Penalità' : 'Penalty'}: {step.rightSlot.priorWorkPenalty} lv. ({step.rightSlot.priorWorkCount} {isIt ? 'usi' : 'uses'})
                            </div>
                          </div>
                        </div>
                      </div>

                      {step.rightSlot.enchantments.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {step.rightSlot.enchantments.map((e) => (
                            <span
                              key={e.id}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 border border-violet-400/25 text-violet-200"
                            >
                              {isIt ? e.nameIt : e.nameEn} {e.roman}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Vertical Flow Connector into Result */}
                  <div className="flex items-center gap-3 my-2.5" aria-hidden="true">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-accent-cyan/25" />
                    <div className="w-7 h-7 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shrink-0">
                      <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-accent-cyan/25" />
                  </div>

                  {/* Output Slot: Result */}
                  <div
                    className={`rounded-xl border p-3.5 ${
                      isResultItem
                        ? 'bg-accent-cyan/[0.05] border-accent-cyan/30'
                        : 'bg-violet-500/[0.05] border-violet-400/25'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                          isResultItem ? 'text-accent-cyan' : 'text-violet-300'
                        }`}
                      >
                        {isIt ? 'Slot Output (Risultato Combinazione)' : 'Output Slot (Resulting Item)'}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary tabular-nums">
                        {isIt ? 'Nuova Penalità' : 'New Penalty'}: {step.resultSlot.priorWorkPenalty} lv. ({step.resultSlot.priorWorkCount} {isIt ? 'usi' : 'uses'})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-heading font-semibold text-text-primary mr-1.5">
                        {step.resultSlot.title}:
                      </span>
                      {step.resultSlot.enchantments.map((e) => (
                        <span
                          key={e.id}
                          className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${
                            isResultItem
                              ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan'
                              : 'bg-violet-500/15 border-violet-400/30 text-violet-200'
                          }`}
                        >
                          {isIt ? e.nameIt : e.nameEn} {e.roman}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Math Breakdown Bar */}
                  <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-secondary tabular-nums">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{isIt ? 'Dettaglio Calcolo:' : 'Cost Math:'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">
                        Pen. Target: {step.costBreakdown.targetPenalty}
                      </span>
                      <span>+</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">
                        {isIt ? 'Pen. Sacrificio' : 'Sac. Penalty'}: {step.costBreakdown.sacrificePenalty}
                      </span>
                      <span>+</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">
                        {isIt ? 'Trasferimento' : 'Transfer'}: {step.costBreakdown.enchantmentTransferCost}
                      </span>
                      {step.costBreakdown.renameCost > 0 && (
                        <>
                          <span>+</span>
                          <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">
                            {isIt ? 'Rinomina' : 'Rename'}: {step.costBreakdown.renameCost}
                          </span>
                        </>
                      )}
                      <span>=</span>
                      <span className="px-2 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-bold">
                        {step.costBreakdown.totalStepCost} {isIt ? 'Livelli' : 'Levels'}
                      </span>
                    </div>

                    <div className="text-[11px] text-emerald-400/90">
                      {isIt ? 'XP Equivalenti' : 'XP Equivalent'}: ~{stepXpPoints.toLocaleString(isIt ? 'it-IT' : 'en-US')} {isIt ? 'punti' : 'pts'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- EXPLANATION GUIDE / FAQ --- */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 mt-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-heading font-semibold text-text-primary">
              {isIt ? 'Come Funziona l’Incudine di Minecraft?' : 'How Minecraft Anvil Mechanics Work'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-text-secondary leading-relaxed">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="font-heading font-semibold text-text-primary mb-1">
                1. Prior Work Penalty (2ⁿ − 1)
              </div>
              <p>
                {isIt
                  ? 'Ogni volta che un oggetto o un libro viene lavorato in un’incudine, il suo contatore aumenta. Le penalità crescono esponenzialmente: 0 → 1 → 3 → 7 → 15 → 31 → 63 livelli.'
                  : 'Every time an item or book passes through an anvil, its use counter increments. Penalties grow exponentially: 0 → 1 → 3 → 7 → 15 → 31 → 63 levels.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="font-heading font-semibold text-text-primary mb-1">
                2. {isIt ? 'L’Albero di Combinazione Binario' : 'Binary Combination Tree'}
              </div>
              <p>
                {isIt
                  ? 'Aggiungere libri uno alla volta direttamente sull’arma porta subito al blocco "Troppo Costoso!". Combinando i libri a coppie piramidali, la penalità dell’arma resta minima.'
                  : 'Applying books linearly one-by-one quickly hits the "Too Expensive!" 40-level cap. Combining books pairwise in a binary tree keeps item penalty minimal.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="font-heading font-semibold text-text-primary mb-1">
                3. {isIt ? 'Ordine Sinistra / Destra' : 'Left / Right Slot Order'}
              </div>
              <p>
                {isIt
                  ? 'Il costo di trasferimento degli incantesimi viene addebitato SOLO per gli incantesimi presenti nello slot destro (sacrificio). Il nostro calcolatore posiziona sempre il libro più costoso a sinistra.'
                  : 'Enchantment transfer fees are paid ONLY for enchantments in the right slot (sacrifice). Our optimizer places the higher-weight book on the left to save XP.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
