import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Layers,
  Compass,
  ArrowLeftRight,
  Copy,
  Check,
  Gauge,
  Grid3X3,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';

export const TmcToolsPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  // --- 1. STACK & SHULKER CALCULATOR STATE ---
  const [stackSize, setStackSize] = useState<64 | 16>(64);

  // Mode A: Items -> Stacks & Shulkers
  const [rawItemsInput, setRawItemsInput] = useState<string>('1728');

  // Mode B: Shulkers + Stacks + Items -> Total Items
  const [shulkerCountInput, setShulkerCountInput] = useState<string>('1');
  const [stackCountInput, setStackCountInput] = useState<string>('0');
  const [looseItemsInput, setLooseItemsInput] = useState<string>('0');

  // --- 2. NETHER <-> OVERWORLD COORDINATE CONVERTER STATE ---
  const [owX, setOwX] = useState<string>('800');
  const [owY, setOwY] = useState<string>('64');
  const [owZ, setOwZ] = useState<string>('-1600');
  const [netherX, setNetherX] = useState<string>('100');
  const [netherY, setNetherY] = useState<string>('64');
  const [netherZ, setNetherZ] = useState<string>('-200');
  const [copiedCoord, setCopiedCoord] = useState<'ow' | 'nether' | null>(null);

  // --- 3. FARM RATE -> HOPPER / LOADER SPEED STATE ---
  const [itemsPerHourInput, setItemsPerHourInput] = useState<string>('36000');

  // Calcoli Items -> Stack & Shulker
  const itemsPerShulker = 27 * stackSize; // 1728 per stack da 64, 432 per stack da 16
  const itemsPerDoubleChestOfShulkers = 54 * itemsPerShulker;

  const totalItemsA = Math.max(0, Math.floor(Number(rawItemsInput) || 0));
  const totalStacksOnly = Math.floor(totalItemsA / stackSize);
  const remainderItemsOnly = totalItemsA % stackSize;

  const fullShulkers = Math.floor(totalItemsA / itemsPerShulker);
  const afterShulkers = totalItemsA % itemsPerShulker;
  const remainingStacksInShulker = Math.floor(afterShulkers / stackSize);
  const remainingLooseItems = afterShulkers % stackSize;
  const decimalShulkers = (totalItemsA / itemsPerShulker).toFixed(2);
  const decimalDoubleChests = (totalItemsA / itemsPerDoubleChestOfShulkers).toFixed(2);

  // Calcoli Shulker & Stack -> Items
  const inShulkers = Math.max(0, Math.floor(Number(shulkerCountInput) || 0));
  const inStacks = Math.max(0, Math.floor(Number(stackCountInput) || 0));
  const inLoose = Math.max(0, Math.floor(Number(looseItemsInput) || 0));
  const totalItemsB = inShulkers * itemsPerShulker + inStacks * stackSize + inLoose;
  const totalStacksB = Math.floor(totalItemsB / stackSize);
  const remainderB = totalItemsB % stackSize;

  // Handlers Coordinate Bidirezionali
  const handleOwChange = (axis: 'x' | 'y' | 'z', val: string) => {
    if (axis === 'x') {
      setOwX(val);
      if (val.trim() === '') {
        setNetherX('');
        return;
      }
      const n = Number(val);
      if (!Number.isNaN(n) && val !== '-') {
        setNetherX(String(Math.floor(n / 8)));
      }
    } else if (axis === 'y') {
      setOwY(val);
      setNetherY(val);
    } else {
      setOwZ(val);
      if (val.trim() === '') {
        setNetherZ('');
        return;
      }
      const n = Number(val);
      if (!Number.isNaN(n) && val !== '-') {
        setNetherZ(String(Math.floor(n / 8)));
      }
    }
  };

  const handleNetherChange = (axis: 'x' | 'y' | 'z', val: string) => {
    if (axis === 'x') {
      setNetherX(val);
      if (val.trim() === '') {
        setOwX('');
        return;
      }
      const n = Number(val);
      if (!Number.isNaN(n) && val !== '-') {
        setOwX(String(Math.round(n * 8)));
      }
    } else if (axis === 'y') {
      setNetherY(val);
      setOwY(val);
    } else {
      setNetherZ(val);
      if (val.trim() === '') {
        setOwZ('');
        return;
      }
      const n = Number(val);
      if (!Number.isNaN(n) && val !== '-') {
        setOwZ(String(Math.round(n * 8)));
      }
    }
  };

  const numOwX = Number(owX) || 0;
  const numOwZ = Number(owZ) || 0;
  const chunkX = Math.floor(numOwX / 16);
  const chunkZ = Math.floor(numOwZ / 16);
  const regionX = Math.floor(chunkX / 32);
  const regionZ = Math.floor(chunkZ / 32);

  const copyCoordinates = (type: 'ow' | 'nether') => {
    const text =
      type === 'ow' ? `${owX} ${owY} ${owZ}` : `${netherX} ${netherY} ${netherZ}`;
    navigator.clipboard.writeText(text);
    setCopiedCoord(type);
    setTimeout(() => setCopiedCoord(null), 1800);
  };

  // Calcoli Farm Rate -> Hopper Speed
  const itemsPerHour = Math.max(0, Number(itemsPerHourInput) || 0);
  const hopperSpeed = 9000; // 1x hopper speed = 2.5 items/s = 9000 items/h
  const hopperMultiple = itemsPerHour / hopperSpeed;
  const shulkersPerHour = itemsPerHour / itemsPerShulker;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-12">
          <div className="max-w-2xl text-left">
            <div className="mb-3">
              <Badge variant="orange">Technical Minecraft Tools</Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {isIt ? 'Calcolatori ' : 'TMC '}
              <span className="text-accent-orange">
                {isIt ? 'Tecnici TMC' : 'Calculators'}
              </span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {isIt
                ? 'Strumenti rapidi per convertire item, stack (64 o 16) e Shulker Box, calcolare coordinate Nether ↔ Overworld, file regione e velocità degli Shulker Loader.'
                : 'Fast utilities to convert items, stacks (64 or 16) and Shulker Boxes, calculate Nether ↔ Overworld coordinates, region files, and Shulker Loader speeds.'}
            </p>
          </div>

          <Link
            to="/tools/chunk-loader"
            className="inline-flex items-center gap-2 self-start lg:self-auto px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-accent-orange" />
            <span>Chunk Loader Calculator</span>
          </Link>
        </div>

        {/* Stack Size Selector Bar (64 vs 16) */}
        <div className="glass-panel rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/25 flex items-center justify-center text-accent-orange shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-heading font-semibold text-text-primary">
                {isIt ? 'Dimensione Stack di Riferimento' : 'Reference Stack Size'}
              </h2>
              <p className="text-xs text-text-secondary">
                {isIt
                  ? `1 Shulker Box (27 slot) = ${itemsPerShulker.toLocaleString('it-IT')} item con stack da ${stackSize}`
                  : `1 Shulker Box (27 slots) = ${itemsPerShulker.toLocaleString('en-US')} items at ${stackSize}/stack`}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-[#101216] border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStackSize(64)}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                stackSize === 64
                  ? 'bg-accent-orange text-[#101216] shadow-glow-orange'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              64 / Stack (Standard)
            </button>
            <button
              type="button"
              onClick={() => setStackSize(16)}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                stackSize === 16
                  ? 'bg-accent-orange text-[#101216] shadow-glow-orange'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isIt ? '16 / Stack (Ender Pearl, Cartelli, ecc.)' : '16 / Stack (Ender Pearls, Signs, etc.)'}
            </button>
          </div>
        </div>

        {/* ROW 1: ITEMS <-> STACKS & SHULKERS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Items -> Stacks & Shulker Boxes */}
          <div className="glass-panel rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-accent-orange" />
                  <h3 className="text-lg font-heading font-bold text-text-primary">
                    {isIt ? 'Item → Stack & Shulker Box' : 'Items → Stacks & Shulkers'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-accent-orange px-2.5 py-1 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
                  Stack {stackSize}
                </span>
              </div>

              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2">
                {isIt ? 'Numero totale di Item' : 'Total Item Count'}
              </label>
              <input
                type="number"
                min="0"
                value={rawItemsInput}
                onChange={(e) => setRawItemsInput(e.target.value)}
                placeholder="Es. 17280"
                className="w-full px-4 py-3 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-lg font-mono text-text-primary mb-6"
              />
            </div>

            <div className="space-y-3">
              {/* Breakdown in Shulker + Stack + Item */}
              <div className="p-4 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                  {isIt
                    ? 'Scomposizione Shulker Box + Stack + Item'
                    : 'Shulker Boxes + Stacks + Items'}
                </div>
                <div className="text-xl sm:text-2xl font-heading font-bold text-text-primary flex flex-wrap items-baseline gap-x-2">
                  <span className="text-accent-orange">{fullShulkers.toLocaleString()}</span>
                  <span className="text-xs font-mono text-text-secondary">SB</span>
                  <span className="text-text-muted">+</span>
                  <span>{remainingStacksInShulker}</span>
                  <span className="text-xs font-mono text-text-secondary">Stack</span>
                  <span className="text-text-muted">+</span>
                  <span>{remainingLooseItems}</span>
                  <span className="text-xs font-mono text-text-secondary">Item</span>
                </div>
              </div>

              {/* Breakdown in solo Stack + Item */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                    {isIt ? 'Totale in Stack' : 'Total in Stacks'}
                  </div>
                  <div className="text-base sm:text-lg font-heading font-bold text-text-primary">
                    {totalStacksOnly.toLocaleString()} <span className="text-xs font-mono text-text-secondary">Stack</span>
                    {remainderItemsOnly > 0 && (
                      <span className="text-xs font-mono text-accent-orange ml-1.5">
                        +{remainderItemsOnly}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                    {isIt ? 'Shulker / Casse Doppie' : 'Shulkers / Double Chests'}
                  </div>
                  <div className="text-base sm:text-lg font-heading font-bold text-text-primary">
                    {decimalShulkers} <span className="text-xs font-mono text-text-secondary">SB</span>
                    <span className="text-xs font-mono text-text-muted ml-1.5">
                      ({decimalDoubleChests} DC)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Shulker Boxes & Stacks -> Total Items */}
          <div className="glass-panel rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-accent-orange" />
                  <h3 className="text-lg font-heading font-bold text-text-primary">
                    {isIt ? 'Shulker & Stack → Totale Item' : 'Shulkers & Stacks → Total Items'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-accent-orange px-2.5 py-1 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
                  Stack {stackSize}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2">
                    Shulker Box
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shulkerCountInput}
                    onChange={(e) => setShulkerCountInput(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-base font-mono text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2">
                    Stack ({stackSize})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stackCountInput}
                    onChange={(e) => setStackCountInput(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-base font-mono text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2">
                    {isIt ? 'Item Singoli' : 'Loose Items'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={looseItemsInput}
                    onChange={(e) => setLooseItemsInput(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-base font-mono text-text-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                  {isIt ? 'Totale Complessivo Item' : 'Exact Total Items'}
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-bold text-accent-orange">
                  {totalItemsB.toLocaleString()}{' '}
                  <span className="text-xs font-mono text-text-secondary">Item</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07] flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">
                  {isIt ? 'Equivalente in Stack:' : 'Equivalent in Stacks:'}
                </span>
                <span className="text-sm font-mono font-semibold text-text-primary">
                  {totalStacksB.toLocaleString()} Stack
                  {remainderB > 0 ? ` + ${remainderB} Item` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: NETHER <-> OVERWORLD COORDINATE CONVERTER & FARM RATE CALCULATOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Nether <-> Overworld Coordinate Converter (7 cols) */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 text-left">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-accent-orange" />
                <h3 className="text-lg font-heading font-bold text-text-primary">
                  {isIt
                    ? 'Convertitore Coordinate Overworld ↔ Nether'
                    : 'Overworld ↔ Nether Coordinate Converter'}
                </h3>
              </div>
              <ArrowLeftRight className="w-4 h-4 text-text-muted" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {/* Overworld Box */}
              <div className="p-4 rounded-xl bg-[#101216]/90 border border-emerald-500/25">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Overworld (×8)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCoordinates('ow')}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    {copiedCoord === 'ow' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isIt ? 'Copiato' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isIt ? 'Copia' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-text-muted mb-1">X</label>
                    <input
                      type="number"
                      value={owX}
                      onChange={(e) => handleOwChange('x', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-bg-card border border-white/10 focus:border-emerald-400 focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-text-muted mb-1">Y</label>
                    <input
                      type="number"
                      value={owY}
                      onChange={(e) => handleOwChange('y', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-bg-card border border-white/10 focus:border-emerald-400 focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-text-muted mb-1">Z</label>
                    <input
                      type="number"
                      value={owZ}
                      onChange={(e) => handleOwChange('z', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-bg-card border border-white/10 focus:border-emerald-400 focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Nether Box */}
              <div className="p-4 rounded-xl bg-[#101216]/90 border border-red-500/25">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-red-400 font-semibold">
                    Nether (÷8)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCoordinates('nether')}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    {copiedCoord === 'nether' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-red-400" />
                        <span>{isIt ? 'Copiato' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isIt ? 'Copia' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-text-muted mb-1">X</label>
                    <input
                      type="number"
                      value={netherX}
                      onChange={(e) => handleNetherChange('x', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-bg-card border border-white/10 focus:border-red-400 focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-text-muted mb-1">Y</label>
                    <input
                      type="number"
                      value={netherY}
                      onChange={(e) => handleNetherChange('y', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-bg-card border border-white/10 focus:border-red-400 focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-text-muted mb-1">Z</label>
                    <input
                      type="number"
                      value={netherZ}
                      onChange={(e) => handleNetherChange('z', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-bg-card border border-white/10 focus:border-red-400 focus:outline-none text-sm font-mono text-text-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chunk & Region File Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
                  {isIt ? 'Coordinate Chunk (Overworld)' : 'Chunk Coordinates (Overworld)'}
                </span>
                <span className="text-sm font-mono font-semibold text-text-primary">
                  Chunk [{chunkX}, {chunkZ}]
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07]">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
                  {isIt ? 'File Regione (.mca)' : 'Region File (.mca)'}
                </span>
                <span className="text-sm font-mono font-semibold text-accent-orange">
                  r.{regionX}.{regionZ}.mca
                </span>
              </div>
            </div>
          </div>

          {/* Hopper & Shulker Loader Speed Calculator (5 cols) */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <Gauge className="w-5 h-5 text-accent-orange" />
                <h3 className="text-lg font-heading font-bold text-text-primary">
                  {isIt ? 'Produzione Farm → Shulker Loader' : 'Farm Rate → Shulker Loaders'}
                </h3>
              </div>

              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2">
                {isIt ? 'Produzione Farm (Item / Ora)' : 'Farm Output (Items / Hour)'}
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={itemsPerHourInput}
                onChange={(e) => setItemsPerHourInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#101216] border border-white/10 focus:border-accent-orange focus:outline-none text-lg font-mono text-text-primary mb-5"
              />
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07] flex items-center justify-between">
                <span className="text-xs font-mono text-text-secondary">
                  Hopper Speed (9.000/h):
                </span>
                <span className="text-base font-mono font-bold text-accent-orange">
                  {hopperMultiple.toFixed(2)}x Hopper
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07] flex items-center justify-between">
                <span className="text-xs font-mono text-text-secondary">
                  {isIt ? 'Shulker Box / Ora:' : 'Shulker Boxes / Hour:'}
                </span>
                <span className="text-base font-mono font-bold text-text-primary">
                  {shulkersPerHour.toFixed(1)} SB/h
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101216]/90 border border-white/[0.07] flex items-center justify-between">
                <span className="text-xs font-mono text-text-secondary">
                  {isIt ? 'Loader minimi (1x / 2x / 4x):' : 'Min Loaders (1x / 2x / 4x):'}
                </span>
                <span className="text-xs font-mono font-semibold text-text-primary">
                  {Math.ceil(hopperMultiple)}× (1x) · {Math.ceil(hopperMultiple / 2)}× (2x) ·{' '}
                  {Math.ceil(hopperMultiple / 4)}× (4x)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
