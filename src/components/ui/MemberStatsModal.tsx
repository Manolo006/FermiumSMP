import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Award,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Footprints,
  Hammer,
  Pickaxe,
  RotateCw,
  Skull,
  Swords,
  X,
} from 'lucide-react';
import type { Member, MemberRoleGroup, MemberStats } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface MemberStatsModalProps {
  member: Member | null;
  stats: MemberStats | null;
  rank: number;
  totalMembers: number;
  maxCarpetScore: number;
  maxBlocksMined: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const MC_BLOCK_ICON_BASE =
  'https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.21.4/assets/minecraft/textures/block';

const ROLE_THEME: Record<
  MemberRoleGroup,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    glowHex: string;
    ringHex: string;
    auraClass: string;
    labelIt: string;
    labelEn: string;
  }
> = {
  owner: {
    badgeBg: 'bg-role-owner/15',
    badgeBorder: 'border-role-owner/45',
    badgeText: 'text-role-owner',
    glowHex: 'rgba(96, 165, 250, 0.38)',
    ringHex: 'rgba(96, 165, 250, 0.55)',
    auraClass: 'bg-role-owner/25',
    labelIt: 'Owner',
    labelEn: 'Owner',
  },
  member: {
    badgeBg: 'bg-role-member/15',
    badgeBorder: 'border-role-member/45',
    badgeText: 'text-role-member',
    glowHex: 'rgba(56, 189, 248, 0.35)',
    ringHex: 'rgba(56, 189, 248, 0.55)',
    auraClass: 'bg-role-member/25',
    labelIt: 'Member',
    labelEn: 'Member',
  },
  trial: {
    badgeBg: 'bg-role-trial/15',
    badgeBorder: 'border-role-trial/45',
    badgeText: 'text-role-trial',
    glowHex: 'rgba(250, 204, 21, 0.32)',
    ringHex: 'rgba(250, 204, 21, 0.5)',
    auraClass: 'bg-role-trial/25',
    labelIt: 'Trial',
    labelEn: 'Trial',
  },
};

function formatCompact(val: number, decimals = 0): string {
  return val.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getRankBadgeStyle(rank: number): string {
  if (rank === 1) return 'bg-amber-400/20 border-amber-300/60 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.3)]';
  if (rank === 2) return 'bg-slate-300/15 border-slate-300/45 text-slate-200';
  if (rank === 3) return 'bg-orange-500/15 border-orange-400/45 text-orange-300';
  return 'bg-white/[0.04] border-white/10 text-text-muted';
}

export const MemberStatsModal: React.FC<MemberStatsModalProps> = ({
  member,
  stats,
  rank,
  totalMembers,
  maxCarpetScore,
  maxBlocksMined,
  onClose,
  onPrev,
  onNext,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const [skinPose, setSkinPose] = useState<'full' | 'frontfull'>('full');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const skinRef = useRef<HTMLDivElement | null>(null);
  const skinImgRef = useRef<HTMLImageElement | null>(null);
  const pedestalRingRef = useRef<HTMLDivElement | null>(null);
  const scanLineRef = useRef<HTMLDivElement | null>(null);
  const rankBadgeRef = useRef<HTMLSpanElement | null>(null);
  const counterRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const wasOpenRef = useRef(false);
  const isClosingRef = useRef(false);
  const navDirRef = useRef<-1 | 0 | 1>(0);

  const handleAnimatedClose = useCallback(() => {
    if (isClosingRef.current) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || !panelRef.current || !backdropRef.current) {
      wasOpenRef.current = false;
      onClose();
      return;
    }

    isClosingRef.current = true;
    gsap
      .timeline({
        onComplete: () => {
          isClosingRef.current = false;
          wasOpenRef.current = false;
          onClose();
        },
      })
      .to(
        panelRef.current,
        { opacity: 0, scale: 0.96, y: 12, duration: 0.18, ease: 'power2.in' },
        0
      )
      .to(backdropRef.current, { opacity: 0, duration: 0.18, ease: 'power2.in' }, 0);
  }, [onClose]);

  const handlePrev = useCallback(() => {
    navDirRef.current = -1;
    onPrev();
  }, [onPrev]);

  const handleNext = useCallback(() => {
    navDirRef.current = 1;
    onNext();
  }, [onNext]);

  // Reset open tracker cleanly when modal closes
  useEffect(() => {
    if (!member) {
      wasOpenRef.current = false;
      isClosingRef.current = false;
      navDirRef.current = 0;
    }
  }, [member]);

  // Keyboard navigation + scroll lock
  useEffect(() => {
    if (!member) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleAnimatedClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [member, handleAnimatedClose, handlePrev, handleNext]);

  // GSAP HUD Entrance, Switch Slide, Scanner Sweep, Count-Up & Ambient Floating
  useEffect(() => {
    if (!member || !stats || !rootRef.current) return;

    const safeCarpet = stats.carpetScore ?? 0;
    const safeMined = stats.blocksMined ?? 0;
    const serverSharePct =
      maxCarpetScore > 0 ? Math.min(100, Math.round((safeCarpet / maxCarpetScore) * 100)) : 100;
    const mineSharePct =
      maxBlocksMined > 0 ? Math.min(100, Math.round((safeMined / maxBlocksMined) * 100)) : 100;

    const topBlocks = Array.isArray(stats.topBlocks) ? stats.topBlocks : [];
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const metricTargets: Array<{
      key: string;
      target: number;
      decimals?: number;
      suffix?: string;
    }> = [
      { key: 'blocksMined', target: safeMined },
      { key: 'playTimeHours', target: stats.playTimeHours ?? 0, decimals: 1, suffix: ' h' },
      { key: 'carpetScore', target: safeCarpet },
      { key: 'deaths', target: stats.deaths ?? 0 },
      { key: 'blocksPlaced', target: stats.blocksPlaced ?? 0 },
      { key: 'mobKills', target: stats.mobKills ?? 0 },
      { key: 'distanceKm', target: stats.distanceKm ?? 0, decimals: 1, suffix: ' km' },
      { key: 'carpetPct', target: serverSharePct, suffix: '%' },
      { key: 'minedPct', target: mineSharePct, suffix: '%' },
      ...topBlocks.slice(0, 3).map((b, i) => ({
        key: `topBlock_${i}`,
        target: b.count ?? 0,
      })),
    ];

    if (prefersReduced) {
      for (const item of metricTargets) {
        const el = counterRefs.current[item.key];
        if (el) {
          el.textContent = `${formatCompact(item.target, item.decimals ?? 0)}${item.suffix ?? ''}`;
        }
      }
      wasOpenRef.current = true;
      return;
    }

    const isInitialOpen = !wasOpenRef.current;
    const slideDir = navDirRef.current;
    wasOpenRef.current = true;
    navDirRef.current = 0;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (isInitialOpen) {
        if (backdropRef.current) {
          tl.fromTo(
            backdropRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.24, ease: 'power2.out' },
            0
          );
        }
        if (panelRef.current) {
          tl.fromTo(
            panelRef.current,
            { opacity: 0, y: 24, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.36 },
            0.02
          );
        }
      }

      // HUD laser scan sweep
      if (scanLineRef.current) {
        tl.fromTo(
          scanLineRef.current,
          { yPercent: -10, opacity: 0 },
          { yPercent: 1400, opacity: 0.8, duration: 0.65, ease: 'power2.inOut' },
          isInitialOpen ? 0.08 : 0
        ).to(scanLineRef.current, { opacity: 0, duration: 0.15 }, '-=0.15');
      }

      // Rank badge pop
      if (rankBadgeRef.current) {
        tl.fromTo(
          rankBadgeRef.current,
          { scale: 0.7, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(2)' },
          isInitialOpen ? 0.1 : 0.02
        );
      }

      // Full 3D character entrance (directional slide on switch, rising scale on open)
      if (skinRef.current) {
        tl.fromTo(
          skinRef.current,
          isInitialOpen
            ? { opacity: 0, y: 26, scale: 0.88 }
            : { opacity: 0, x: slideDir * 28, scale: 0.94 },
          { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.44, ease: 'power3.out' },
          isInitialOpen ? 0.08 : 0
        );
      }

      // Continuous subtle zero-G levitation for full skin + rotating hologram ring
      if (skinImgRef.current) {
        gsap.killTweensOf(skinImgRef.current);
        gsap.fromTo(
          skinImgRef.current,
          { y: 2 },
          { y: -5, duration: 2.3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.35 }
        );
      }
      if (pedestalRingRef.current) {
        gsap.killTweensOf(pedestalRingRef.current);
        gsap.to(pedestalRingRef.current, {
          rotation: 360,
          duration: 18,
          repeat: -1,
          ease: 'none',
        });
      }

      // Staggered metric cards entrance
      tl.fromTo(
        '[data-stat-card]',
        isInitialOpen
          ? { opacity: 0, y: 16, scale: 0.96 }
          : { opacity: 0, x: slideDir * 18, scale: 0.98 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.34, stagger: 0.045 },
        isInitialOpen ? 0.12 : 0.03
      );

      // Minecraft block icon pop-in
      tl.fromTo(
        '[data-block-icon]',
        { scale: 0.45, rotation: -12, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.38, stagger: 0.08, ease: 'back.out(1.8)' },
        isInitialOpen ? 0.2 : 0.1
      );

      // ScaleX animated bars
      tl.fromTo(
        '[data-stat-bar]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.72, stagger: 0.075, ease: 'power3.out' },
        isInitialOpen ? 0.22 : 0.12
      );

      // Smooth count-up values directly via DOM refs
      for (const item of metricTargets) {
        const el = counterRefs.current[item.key];
        if (!el) continue;
        const proxy = { val: 0 };
        el.textContent = `0${item.suffix ?? ''}`;
        tl.to(
          proxy,
          {
            val: item.target,
            duration: 0.92,
            ease: 'power3.out',
            onUpdate: () => {
              const value = item.decimals
                ? Number(proxy.val.toFixed(item.decimals))
                : Math.round(proxy.val);
              el.textContent = `${formatCompact(value, item.decimals ?? 0)}${item.suffix ?? ''}`;
            },
          },
          isInitialOpen ? 0.14 : 0.06
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [member?.id, stats, maxCarpetScore, maxBlocksMined]);

  const toggleSkinPose = () => {
    setSkinPose((p) => (p === 'full' ? 'frontfull' : 'full'));
    if (
      skinImgRef.current &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      gsap.fromTo(
        skinImgRef.current,
        { rotateY: -75, scale: 0.92, opacity: 0.35 },
        { rotateY: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  };

  if (!member || !stats) return null;

  const theme = ROLE_THEME[member.roleGroup];
  const fullSkinUrl = `https://nmsr.nickac.dev/${skinPose}/${encodeURIComponent(member.name)}`;
  const safeCarpet = stats.carpetScore ?? 0;
  const safeMined = stats.blocksMined ?? 0;
  const topBlocks = Array.isArray(stats.topBlocks) ? stats.topBlocks : [];
  const serverSharePct =
    maxCarpetScore > 0 ? Math.min(100, Math.round((safeCarpet / maxCarpetScore) * 100)) : 100;
  const mineSharePct =
    maxBlocksMined > 0 ? Math.min(100, Math.round((safeMined / maxBlocksMined) * 100)) : 100;
  const maxTopBlockCount = topBlocks.reduce((acc, b) => Math.max(acc, b.count), 1);

  const primaryCards = [
    {
      key: 'blocksMined',
      label: isIt ? 'Blocchi Rotti' : 'Blocks Mined',
      icon: Pickaxe,
      accent: 'text-accent-orange',
      hoverBorder: 'hover:border-accent-orange/35',
      bgGlow: 'from-accent-orange/15 to-transparent',
    },
    {
      key: 'playTimeHours',
      label: 'Playtime',
      icon: Clock,
      accent: 'text-sky-400',
      hoverBorder: 'hover:border-sky-400/35',
      bgGlow: 'from-sky-400/15 to-transparent',
    },
    {
      key: 'carpetScore',
      label: 'Carpet /stats',
      icon: Award,
      accent: 'text-emerald-400',
      hoverBorder: 'hover:border-emerald-400/35',
      bgGlow: 'from-emerald-400/15 to-transparent',
    },
    {
      key: 'deaths',
      label: isIt ? 'Morti' : 'Deaths',
      icon: Skull,
      accent: 'text-rose-400',
      hoverBorder: 'hover:border-rose-400/35',
      bgGlow: 'from-rose-400/15 to-transparent',
    },
    {
      key: 'blocksPlaced',
      label: isIt ? 'Blocchi Piazzati' : 'Blocks Placed',
      icon: Hammer,
      accent: 'text-amber-300',
      hoverBorder: 'hover:border-amber-300/35',
      bgGlow: 'from-amber-300/15 to-transparent',
    },
    {
      key: 'mobKills',
      label: isIt ? 'Mob Uccisi' : 'Mob Kills',
      icon: Swords,
      accent: 'text-purple-400',
      hoverBorder: 'hover:border-purple-400/35',
      bgGlow: 'from-purple-400/15 to-transparent',
    },
  ];

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name} Minecraft Stats`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Blurred Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleAnimatedClose}
        className="fixed inset-0 bg-[#080A0D]/85 backdrop-blur-xl"
      />

      {/* Previous / Next Player Desktop Controls */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label={isIt ? 'Membro precedente' : 'Previous member'}
        className="hidden lg:flex fixed left-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-white/25 transition-colors cursor-pointer active:scale-[0.96]"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label={isIt ? 'Membro successivo' : 'Next member'}
        className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-white/25 transition-colors cursor-pointer active:scale-[0.96]"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Stats Panel */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-4xl glass-panel rounded-3xl p-5 sm:p-7 border border-white/15 overflow-hidden my-auto"
      >
        {/* Top Ambient Role Glow */}
        <div
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-56 rounded-full blur-3xl pointer-events-none opacity-45"
          style={{ background: theme.glowHex }}
        />

        {/* HUD Scanner Beam Overlay */}
        <div
          ref={scanLineRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-accent-orange/20 to-transparent z-30 opacity-0"
        />

        {/* Header Controls Row */}
        <div className="relative flex items-center justify-between gap-3 pb-4 mb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-accent-orange/10 border border-accent-orange/30 text-accent-orange">
              <Box className="w-3.5 h-3.5" />
              <span>Carpet /stats HUD</span>
            </span>
            <span
              ref={rankBadgeRef}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${getRankBadgeStyle(
                rank
              )}`}
            >
              {rank <= 3 && <Crown className="w-3 h-3" />}
              <span>
                #{rank} / {totalMembers}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex lg:hidden items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                aria-label={isIt ? 'Precedente' : 'Previous'}
                className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white cursor-pointer active:scale-[0.95]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label={isIt ? 'Successivo' : 'Next'}
                className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white cursor-pointer active:scale-[0.95]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAnimatedClose}
              aria-label={isIt ? 'Chiudi' : 'Close'}
              className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white hover:border-white/25 transition-colors cursor-pointer active:scale-[0.95]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Grid: 3D Character Left + Telemetry Right */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left Pedestal: Full 3D Character Render */}
          <div className="md:col-span-4 rounded-2xl bg-[#11141A]/90 border border-white/[0.07] p-5 flex flex-col items-center justify-between relative overflow-hidden">
            <div className="w-full flex items-center justify-between z-10">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
              >
                {isIt ? theme.labelIt : theme.labelEn}
              </span>

              <button
                type="button"
                onClick={toggleSkinPose}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white cursor-pointer transition-colors active:scale-[0.95]"
                title={isIt ? 'Ruota vista skin' : 'Toggle skin angle'}
              >
                <RotateCw className="w-3 h-3 text-accent-orange" />
                <span>{skinPose === 'full' ? '3D Iso' : 'Front'}</span>
              </button>
            </div>

            <div
              ref={skinRef}
              style={{ perspective: '700px' }}
              className="relative w-full h-56 sm:h-64 flex items-center justify-center my-2"
            >
              <div
                className={`absolute inset-8 rounded-full blur-3xl opacity-50 pointer-events-none ${theme.auraClass}`}
              />

              {/* Isometric Rotating Hologram Base Ring */}
              <div
                aria-hidden="true"
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-12 pointer-events-none flex items-center justify-center"
                style={{ transform: 'translateX(-50%) rotateX(68deg)' }}
              >
                <div
                  ref={pedestalRingRef}
                  className="w-32 h-32 rounded-full border-2 border-dashed opacity-65"
                  style={{ borderColor: theme.ringHex }}
                />
              </div>

              <img
                ref={skinImgRef}
                src={fullSkinUrl}
                alt={member.name}
                className="relative z-10 h-full w-auto object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)] will-change-transform"
              />
            </div>

            <div className="w-full text-center z-10 pt-2 border-t border-white/[0.07]">
              <h3 className="font-pixel text-xl sm:text-2xl text-text-primary truncate mb-1">
                {member.name}
              </h3>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                <Footprints className="w-3.5 h-3.5 text-accent-orange" />
                <span>{isIt ? 'Distanza:' : 'Distance:'}</span>
                <span
                  ref={(el) => {
                    counterRefs.current.distanceKm = el;
                  }}
                  className="text-text-primary font-semibold tabular-nums"
                >
                  {formatCompact(stats.distanceKm ?? 0, 1)} km
                </span>
              </div>
            </div>
          </div>

          {/* Right Dashboard: Telemetry Metrics + Comparison Bars + Top Blocks */}
          <div className="md:col-span-8 flex flex-col justify-between gap-4 text-left">
            {/* 6 Animated Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {primaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    data-stat-card
                    className={`group/tile rounded-2xl bg-[#11141A]/90 border border-white/[0.07] ${card.hoverBorder} p-3.5 relative overflow-hidden transition-[transform,border-color] duration-200 hover:-translate-y-0.5`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.bgGlow} opacity-45 group-hover/tile:opacity-80 transition-opacity duration-200 pointer-events-none`}
                    />
                    <div className="relative flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted truncate">
                        {card.label}
                      </span>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${card.accent} transition-transform duration-200 group-hover/tile:scale-110`}
                      />
                    </div>
                    <div className="relative text-xl sm:text-2xl font-heading font-bold text-text-primary tabular-nums">
                      <span
                        ref={(el) => {
                          counterRefs.current[card.key] = el;
                        }}
                      >
                        0
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Animated Comparison + Top Mined Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Server Rank & Progress vs Leader */}
              <div
                data-stat-card
                className="rounded-2xl bg-[#11141A]/90 border border-white/[0.07] p-4 flex flex-col justify-between gap-3"
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                  {isIt ? 'Indice Attività vs Top Server' : 'Server Leaderboard Share'}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-text-secondary">
                        {isIt ? 'Indice Carpet Score' : 'Carpet Score Index'}
                      </span>
                      <span
                        ref={(el) => {
                          counterRefs.current.carpetPct = el;
                        }}
                        className="text-accent-orange font-semibold tabular-nums"
                      >
                        {serverSharePct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        data-stat-bar
                        style={{ width: `${serverSharePct}%`, transformOrigin: 'left center' }}
                        className="h-full rounded-full bg-gradient-to-r from-accent-orange to-amber-300 shadow-[0_0_12px_rgba(240,138,54,0.45)]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-text-secondary">
                        {isIt ? 'Indice Scavo Blocchi' : 'Mining Volume Index'}
                      </span>
                      <span
                        ref={(el) => {
                          counterRefs.current.minedPct = el;
                        }}
                        className="text-sky-400 font-semibold tabular-nums"
                      >
                        {mineSharePct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        data-stat-bar
                        style={{ width: `${mineSharePct}%`, transformOrigin: 'left center' }}
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 3 Mined Blocks with Real 16x16 Minecraft Textures */}
              <div
                data-stat-card
                className="rounded-2xl bg-[#11141A]/90 border border-white/[0.07] p-4 flex flex-col justify-between gap-2.5"
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                  {isIt ? 'Top 3 Blocchi Scavati' : 'Top 3 Mined Blocks'}
                </div>

                <div className="space-y-2.5">
                  {topBlocks.slice(0, 3).map((block, bIdx) => {
                    const pct = Math.max(12, Math.round((block.count / maxTopBlockCount) * 100));
                    const cleanId = block.id.replace('minecraft:', '');
                    return (
                      <div key={block.id} className="flex items-center gap-2.5">
                        <img
                          data-block-icon
                          src={`${MC_BLOCK_ICON_BASE}/${encodeURIComponent(cleanId)}.png`}
                          alt={block.label}
                          style={{ imageRendering: 'pixelated' }}
                          className="w-6 h-6 rounded border border-white/10 bg-[#181C24] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs font-mono mb-1">
                            <span className="text-text-primary truncate">{block.label}</span>
                            <span
                              ref={(el) => {
                                counterRefs.current[`topBlock_${bIdx}`] = el;
                              }}
                              className="text-text-secondary tabular-nums ml-2"
                            >
                              {formatCompact(block.count)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              data-stat-bar
                              style={{ width: `${pct}%`, transformOrigin: 'left center' }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
