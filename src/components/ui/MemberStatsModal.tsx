import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowLeft,
  Award,
  Box,
  ChevronDown,
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
import type {
  Member,
  MemberRoleGroup,
  MemberStatBreakdownItem,
  MemberStats,
} from '../../types';
import type { MemberCardOriginRects } from './MemberCard';
import { getMemberSkinUrls } from '../../data/members';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getMinecraftBlockIconCandidates,
  getMinecraftMobIconCandidates,
} from '../../utils/mcBlockIcons';

type BreakdownCategory = 'mined' | 'placed' | 'mobs';

interface MemberStatsModalProps {
  member: Member | null;
  stats: MemberStats | null;
  originMetrics?: MemberCardOriginRects | null;
  rank: number;
  totalMembers: number;
  overallSharePct?: number;
  maxCarpetScore: number;
  maxBlocksMined: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const VanillaTextureIcon: React.FC<{
  assetId: string;
  label: string;
  getCandidates: (id: string) => string[];
  fallbackIcon: React.ReactNode;
}> = ({ assetId, label, getCandidates, fallbackIcon }) => {
  const candidates = useMemo(() => getCandidates(assetId), [assetId, getCandidates]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [assetId]);

  const src = candidates[candidateIdx];
  if (!src) {
    return (
      <div
        data-block-icon
        aria-label={label}
        className="w-6 h-6 rounded border border-white/10 bg-[#181C24] flex items-center justify-center shrink-0"
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <img
      data-block-icon
      src={src}
      alt={label}
      onError={() => setCandidateIdx((prev) => prev + 1)}
      style={{ imageRendering: 'pixelated' }}
      className="w-6 h-6 rounded border border-white/10 bg-[#181C24] shrink-0 object-contain"
    />
  );
};

const BlockTextureIcon: React.FC<{ blockId: string; label: string }> = ({
  blockId,
  label,
}) => (
  <VanillaTextureIcon
    assetId={blockId}
    label={label}
    getCandidates={getMinecraftBlockIconCandidates}
    fallbackIcon={<Box className="w-3.5 h-3.5 text-text-muted" />}
  />
);

const MobTextureIcon: React.FC<{ mobId: string; label: string }> = ({
  mobId,
  label,
}) => (
  <VanillaTextureIcon
    assetId={mobId}
    label={label}
    getCandidates={getMinecraftMobIconCandidates}
    fallbackIcon={<Swords className="w-3.5 h-3.5 text-purple-300" />}
  />
);

const ROLE_THEME: Record<
  MemberRoleGroup,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    glowHex: string;
    ringHex: string;
    borderCss: string;
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
    ringHex: 'rgba(96, 165, 250, 0.65)',
    borderCss: 'rgba(96, 165, 250, 0.45)',
    auraClass: 'bg-role-owner/25',
    labelIt: 'Owner',
    labelEn: 'Owner',
  },
  member: {
    badgeBg: 'bg-role-member/15',
    badgeBorder: 'border-role-member/45',
    badgeText: 'text-role-member',
    glowHex: 'rgba(56, 189, 248, 0.35)',
    ringHex: 'rgba(56, 189, 248, 0.65)',
    borderCss: 'rgba(56, 189, 248, 0.45)',
    auraClass: 'bg-role-member/25',
    labelIt: 'Member',
    labelEn: 'Member',
  },
  trial: {
    badgeBg: 'bg-role-trial/15',
    badgeBorder: 'border-role-trial/45',
    badgeText: 'text-role-trial',
    glowHex: 'rgba(250, 204, 21, 0.32)',
    ringHex: 'rgba(250, 204, 21, 0.6)',
    borderCss: 'rgba(250, 204, 21, 0.45)',
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
  if (rank === 1) {
    return 'bg-amber-400/20 border-amber-300/60 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.3)]';
  }
  if (rank === 2) return 'bg-slate-300/15 border-slate-300/45 text-slate-200';
  if (rank === 3) return 'bg-orange-500/15 border-orange-400/45 text-orange-300';
  return 'bg-white/[0.04] border-white/10 text-text-muted';
}

function queryLiveMemberRects(memberId: string): MemberCardOriginRects | null {
  if (typeof document === 'undefined') return null;
  const pill = document.querySelector(`[data-member-pill="${memberId}"]`);
  const bust = document.querySelector(`[data-member-bust="${memberId}"]`);
  const name = document.querySelector(`[data-member-name="${memberId}"]`);
  if (!pill || !bust || !name) return null;
  const pillRect = pill.getBoundingClientRect();
  const bustRect = bust.getBoundingClientRect();
  const nameRect = name.getBoundingClientRect();
  if (pillRect.width <= 0 || bustRect.width <= 0 || nameRect.width <= 0) return null;
  return { pillRect, bustRect, nameRect };
}

export const MemberStatsModal: React.FC<MemberStatsModalProps> = ({
  member,
  stats,
  originMetrics,
  rank,
  totalMembers,
  overallSharePct,
  maxCarpetScore,
  maxBlocksMined,
  onClose,
  onPrev,
  onNext,
}) => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const [skinMode, setSkinMode] = useState<'bust' | 'full'>('bust');
  const [activeBreakdown, setActiveBreakdown] = useState<BreakdownCategory | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerNameRef = useRef<HTMLSpanElement | null>(null);
  const pedestalSlotRef = useRef<HTMLDivElement | null>(null);
  const settledSkinImgRef = useRef<HTMLImageElement | null>(null);
  const pedestalRingRef = useRef<HTMLDivElement | null>(null);
  const scanLineRef = useRef<HTMLDivElement | null>(null);

  // Floating non-clipped morph actors (fly seamlessly above the expanding pill!)
  const flightBustRef = useRef<HTMLImageElement | null>(null);
  const flightNameRef = useRef<HTMLSpanElement | null>(null);

  const counterRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const wasOpenRef = useRef(false);
  const isClosingRef = useRef(false);
  const navDirRef = useRef<-1 | 0 | 1>(0);

  const handleAnimatedClose = useCallback(() => {
    if (isClosingRef.current) return;
    if (!panelRef.current || !backdropRef.current || !member) {
      wasOpenRef.current = false;
      onClose();
      return;
    }

    isClosingRef.current = true;
    const dst = queryLiveMemberRects(member.id) || originMetrics;
    const panelRect = panelRef.current.getBoundingClientRect();
    const tgtNameRect = headerNameRef.current?.getBoundingClientRect();
    const tgtBustRect = settledSkinImgRef.current?.getBoundingClientRect();

    const tl = gsap.timeline({
      onComplete: () => {
        isClosingRef.current = false;
        wasOpenRef.current = false;
        onClose();
      },
    });

    // Fade out stats & chrome fast
    tl.to('[data-hud-chrome], [data-hud-box], [data-stat-card]', {
      opacity: 0,
      duration: 0.14,
      ease: 'power2.in',
    }, 0);

    if (
      dst &&
      dst.pillRect.top < window.innerHeight &&
      dst.pillRect.bottom > 0 &&
      tgtNameRect &&
      tgtBustRect &&
      flightBustRef.current &&
      flightNameRef.current
    ) {
      // Pin flying bust & name over their current modal slots, hide settled DOM copies
      gsap.set(settledSkinImgRef.current, { opacity: 0 });
      gsap.set(headerNameRef.current, { opacity: 0 });

      gsap.set(flightBustRef.current, {
        display: 'block',
        opacity: 1,
        left: tgtBustRect.left,
        top: tgtBustRect.top,
        width: tgtBustRect.width,
        height: tgtBustRect.height,
        x: 0,
        y: 0,
        scale: 1,
      });

      gsap.set(flightNameRef.current, {
        display: 'inline-block',
        opacity: 1,
        left: tgtNameRect.left,
        top: tgtNameRect.top,
        x: 0,
        y: 0,
        scale: 1,
      });

      const bustScaleBack = dst.bustRect.height / Math.max(1, tgtBustRect.height);
      const bustDx =
        dst.bustRect.left + dst.bustRect.width / 2 - (tgtBustRect.left + tgtBustRect.width / 2);
      const bustDy =
        dst.bustRect.top + dst.bustRect.height / 2 - (tgtBustRect.top + tgtBustRect.height / 2);

      const nameScaleBack = dst.nameRect.height / Math.max(1, tgtNameRect.height);
      const nameDx =
        dst.nameRect.left + dst.nameRect.width / 2 - (tgtNameRect.left + tgtNameRect.width / 2);
      const nameDy =
        dst.nameRect.top + dst.nameRect.height / 2 - (tgtNameRect.top + tgtNameRect.height / 2);

      // Pin panel to fixed coords matching current rect so width/height shrink smoothly back to pill!
      gsap.set(panelRef.current, {
        position: 'fixed',
        left: panelRect.left,
        top: panelRect.top,
        width: panelRect.width,
        height: panelRect.height,
        margin: 0,
      });

      const pillRadius = Math.max(16, Math.round(dst.pillRect.height / 2));

      tl.to(
        panelRef.current,
        {
          left: dst.pillRect.left,
          top: dst.pillRect.top,
          width: dst.pillRect.width,
          height: dst.pillRect.height,
          borderRadius: pillRadius,
          duration: 0.34,
          ease: 'power3.inOut',
        },
        0.04
      )
        .to(
          flightBustRef.current,
          {
            x: bustDx,
            y: bustDy,
            scale: bustScaleBack,
            duration: 0.34,
            ease: 'power3.inOut',
          },
          0.04
        )
        .to(
          flightNameRef.current,
          {
            x: nameDx,
            y: nameDy,
            scale: nameScaleBack,
            duration: 0.34,
            ease: 'power3.inOut',
          },
          0.04
        )
        .to(backdropRef.current, { opacity: 0, duration: 0.28, ease: 'power2.in' }, 0.08);
    } else {
      tl.to(
        panelRef.current,
        { opacity: 0, scale: 0.94, y: 12, duration: 0.2, ease: 'power2.in' },
        0
      ).to(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
    }
  }, [member, originMetrics, onClose]);

  const handlePrev = useCallback(() => {
    navDirRef.current = -1;
    setSkinMode('bust');
    onPrev();
  }, [onPrev]);

  const handleNext = useCallback(() => {
    navDirRef.current = 1;
    setSkinMode('bust');
    onNext();
  }, [onNext]);

  useEffect(() => {
    if (!member) {
      wasOpenRef.current = false;
      isClosingRef.current = false;
      navDirRef.current = 0;
      setSkinMode('bust');
      setActiveBreakdown(null);
    }
  }, [member]);

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

  // Pre-paint FLIP Choreography:
  // 1) Name Pill expands smoothly to full HUD Box (actual width/height/borderRadius — zero text stretch!)
  // 2) Bust slides continuously from card slot -> left pedestal
  // 3) Name glides continuously from bottom pill -> top header
  // 4) Stats dashboard cascades in with count-ups & bars!
  useLayoutEffect(() => {
    if (!member || !stats || !rootRef.current || !panelRef.current) return;

    const safeCarpet = stats.carpetScore ?? 0;
    const safeMined = stats.blocksMined ?? 0;
    const topBlocks = Array.isArray(stats.topBlocks) ? stats.topBlocks : [];
    const serverSharePct =
      typeof overallSharePct === 'number'
        ? Math.max(0, Math.min(100, Math.round(overallSharePct)))
        : maxCarpetScore > 0
          ? Math.min(100, Math.round((safeCarpet / maxCarpetScore) * 100))
          : 100;
    const mineSharePct =
      maxBlocksMined > 0 ? Math.min(100, Math.round((safeMined / maxBlocksMined) * 100)) : 100;

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

    const isInitialOpen = !wasOpenRef.current;
    const slideDir = navDirRef.current;
    wasOpenRef.current = true;
    navDirRef.current = 0;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (isInitialOpen) {
        // Ensure clean settled layout measurement without wiping React inline borderColor
        gsap.set(panelRef.current, {
          clearProps: 'position,left,top,width,height,margin,borderRadius,transform,opacity',
        });
        gsap.set([headerNameRef.current, settledSkinImgRef.current], { opacity: 1 });
        gsap.set('[data-hud-chrome], [data-hud-box], [data-stat-card]', {
          clearProps: 'opacity,transform',
        });

        const targetPanelRect = panelRef.current!.getBoundingClientRect();
        const targetNameRect = headerNameRef.current?.getBoundingClientRect();
        const targetBustRect = settledSkinImgRef.current?.getBoundingClientRect();

        const src = originMetrics || queryLiveMemberRects(member.id);

        if (
          src &&
          targetNameRect &&
          targetBustRect &&
          flightBustRef.current &&
          flightNameRef.current
        ) {
          // Hide settled copies while the real pixels fly into position!
          gsap.set(headerNameRef.current, { opacity: 0 });
          gsap.set(settledSkinImgRef.current, { opacity: 0 });

          // Backdrop soft fade in
          if (backdropRef.current) {
            tl.fromTo(
              backdropRef.current,
              { opacity: 0 },
              { opacity: 1, duration: 0.32, ease: 'power2.out' },
              0
            );
          }

          const startRadius = Math.max(16, Math.round(src.pillRect.height / 2));

          // 1) Name Pill expands smoothly from exact pillRect -> centered targetPanelRect (zero stretch!)
          tl.fromTo(
            panelRef.current,
            {
              position: 'fixed',
              left: src.pillRect.left,
              top: src.pillRect.top,
              width: src.pillRect.width,
              height: src.pillRect.height,
              borderRadius: startRadius,
              margin: 0,
            },
            {
              left: targetPanelRect.left,
              top: targetPanelRect.top,
              width: targetPanelRect.width,
              height: targetPanelRect.height,
              borderRadius: 24,
              duration: 0.48,
              ease: 'power3.out',
              onComplete: () => {
                if (panelRef.current) {
                  gsap.set(panelRef.current, {
                    clearProps: 'position,left,top,width,height,margin,borderRadius',
                  });
                }
              },
            },
            0
          );

          // 2) Bust slides continuously from above the pill -> LEFT Pedestal inside expanded panel!
          const bustStartScale = src.bustRect.height / Math.max(1, targetBustRect.height);
          const bustDx =
            src.bustRect.left +
            src.bustRect.width / 2 -
            (targetBustRect.left + targetBustRect.width / 2);
          const bustDy =
            src.bustRect.top +
            src.bustRect.height / 2 -
            (targetBustRect.top + targetBustRect.height / 2);

          gsap.set(flightBustRef.current, {
            display: 'block',
            opacity: 1,
            left: targetBustRect.left,
            top: targetBustRect.top,
            width: targetBustRect.width,
            height: targetBustRect.height,
          });

          tl.fromTo(
            flightBustRef.current,
            { x: bustDx, y: bustDy, scale: bustStartScale },
            {
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.48,
              ease: 'power3.out',
              onComplete: () => {
                if (settledSkinImgRef.current) gsap.set(settledSkinImgRef.current, { opacity: 1 });
                if (flightBustRef.current) gsap.set(flightBustRef.current, { display: 'none' });
              },
            },
            0
          );

          // 3) Name glides continuously from bottom Pill -> TOP Header inside expanded panel!
          const nameStartScale = src.nameRect.height / Math.max(1, targetNameRect.height);
          const nameDx =
            src.nameRect.left +
            src.nameRect.width / 2 -
            (targetNameRect.left + targetNameRect.width / 2);
          const nameDy =
            src.nameRect.top +
            src.nameRect.height / 2 -
            (targetNameRect.top + targetNameRect.height / 2);

          gsap.set(flightNameRef.current, {
            display: 'inline-block',
            opacity: 1,
            left: targetNameRect.left,
            top: targetNameRect.top,
          });

          tl.fromTo(
            flightNameRef.current,
            { x: nameDx, y: nameDy, scale: nameStartScale },
            {
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.48,
              ease: 'power3.out',
              onComplete: () => {
                if (headerNameRef.current) gsap.set(headerNameRef.current, { opacity: 1 });
                if (flightNameRef.current) gsap.set(flightNameRef.current, { display: 'none' });
              },
            },
            0
          );

          // 4) Pedestal chamber & chrome badges appear cleanly after the pill opens out
          tl.fromTo(
            '[data-hud-box]',
            { opacity: 0, scale: 0.97 },
            { opacity: 1, scale: 1, duration: 0.24, ease: 'power2.out' },
            0.18
          );
          tl.fromTo(
            '[data-hud-chrome]',
            { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.26, stagger: 0.03 },
            0.2
          );
        } else {
          if (backdropRef.current) {
            tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.24 }, 0);
          }
          tl.fromTo(
            panelRef.current,
            { opacity: 0, y: 20, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.34 },
            0
          );
        }
      } else {
        // Switching between players cleanly without blinking modal frame
        gsap.set([headerNameRef.current, settledSkinImgRef.current], { opacity: 1 });
        if (flightBustRef.current) gsap.set(flightBustRef.current, { display: 'none' });
        if (flightNameRef.current) gsap.set(flightNameRef.current, { display: 'none' });

        if (headerNameRef.current) {
          tl.fromTo(
            headerNameRef.current,
            { opacity: 0, x: slideDir * 22 },
            { opacity: 1, x: 0, duration: 0.32, ease: 'power3.out' },
            0
          );
        }
        if (settledSkinImgRef.current) {
          tl.fromTo(
            settledSkinImgRef.current,
            { opacity: 0, x: slideDir * 28, scale: 0.94 },
            { opacity: 1, x: 0, scale: 1, duration: 0.38, ease: 'power3.out' },
            0
          );
        }
      }

      const statsStart = isInitialOpen ? 0.2 : 0.04;

      // HUD scanline sweep across opened panel
      if (scanLineRef.current) {
        tl.fromTo(
          scanLineRef.current,
          { yPercent: -10, opacity: 0 },
          { yPercent: 1400, opacity: 0.75, duration: 0.58, ease: 'power2.inOut' },
          statsStart
        ).to(scanLineRef.current, { opacity: 0, duration: 0.15 }, '-=0.15');
      }

      // Staggered KPI tiles entrance on the right
      tl.fromTo(
        '[data-stat-card]',
        isInitialOpen
          ? { opacity: 0, x: 18, scale: 0.96 }
          : { opacity: 0, x: slideDir * 18, scale: 0.98 },
        { opacity: 1, x: 0, scale: 1, duration: 0.34, stagger: 0.045 },
        statsStart
      );

      // Pop-in block icons
      tl.fromTo(
        '[data-block-icon]',
        { scale: 0.45, rotation: -12, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.36, stagger: 0.075, ease: 'back.out(1.8)' },
        statsStart + 0.12
      );

      // ScaleX animated comparison bars
      tl.fromTo(
        '[data-stat-bar]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.7, stagger: 0.07, ease: 'power3.out' },
        statsStart + 0.14
      );

      // Rotating holographic ring under player feet
      if (pedestalRingRef.current) {
        gsap.killTweensOf(pedestalRingRef.current);
        gsap.to(pedestalRingRef.current, {
          rotation: 360,
          duration: 18,
          repeat: -1,
          ease: 'none',
        });
      }

      // Gentle levitation after landing
      if (settledSkinImgRef.current) {
        gsap.killTweensOf(settledSkinImgRef.current);
        gsap.fromTo(
          settledSkinImgRef.current,
          { y: 2 },
          {
            y: -4,
            duration: 2.3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: isInitialOpen ? 0.52 : 0.3,
          }
        );
      }

      // Fast DOM count-ups
      for (const item of metricTargets) {
        const el = counterRefs.current[item.key];
        if (!el) continue;
        const proxy = { val: 0 };
        el.textContent = `0${item.suffix ?? ''}`;
        tl.to(
          proxy,
          {
            val: item.target,
            duration: 0.88,
            ease: 'power3.out',
            onUpdate: () => {
              const value = item.decimals
                ? Number(proxy.val.toFixed(item.decimals))
                : Math.round(proxy.val);
              el.textContent = `${formatCompact(value, item.decimals ?? 0)}${item.suffix ?? ''}`;
            },
          },
          statsStart + 0.05
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [member?.id, stats, originMetrics, overallSharePct, maxCarpetScore, maxBlocksMined]);

  const toggleSkinPose = () => {
    setSkinMode((p) => (p === 'bust' ? 'full' : 'bust'));
    if (settledSkinImgRef.current) {
      gsap.fromTo(
        settledSkinImgRef.current,
        { rotateY: -75, scale: 0.92, opacity: 0.4 },
        { rotateY: 0, scale: 1, opacity: 1, duration: 0.38, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  };

  if (!member || !stats) return null;

  const theme = ROLE_THEME[member.roleGroup];
  const bustCandidates = getMemberSkinUrls(member.name, 'bust', member.uuid);
  const activeCandidates = getMemberSkinUrls(member.name, skinMode, member.uuid);
  const bustSkinUrl = bustCandidates[0];
  const activeSkinUrl = activeCandidates[0];

  const handleSkinFallback = (
    e: React.SyntheticEvent<HTMLImageElement>,
    candidates: string[]
  ) => {
    const img = e.currentTarget;
    const nextIdx = Number(img.dataset.fallbackIdx || '0') + 1;
    if (nextIdx < candidates.length) {
      img.dataset.fallbackIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };
  const safeCarpet = stats.carpetScore ?? 0;
  const safeMined = stats.blocksMined ?? 0;
  const safePlaced = stats.blocksPlaced ?? 0;
  const safeMobKills = stats.mobKills ?? 0;
  const topBlocks = Array.isArray(stats.topBlocks) ? stats.topBlocks : [];
  const topPlacedBlocks = Array.isArray(stats.topPlacedBlocks) ? stats.topPlacedBlocks : [];
  const topKilledMobs = Array.isArray(stats.topKilledMobs) ? stats.topKilledMobs : [];
  const serverSharePct =
    typeof overallSharePct === 'number'
      ? Math.max(0, Math.min(100, Math.round(overallSharePct)))
      : maxCarpetScore > 0
        ? Math.min(100, Math.round((safeCarpet / maxCarpetScore) * 100))
        : 100;
  const mineSharePct =
    maxBlocksMined > 0 ? Math.min(100, Math.round((safeMined / maxBlocksMined) * 100)) : 100;
  const maxTopBlockCount = topBlocks.reduce((acc, b) => Math.max(acc, b.count), 1);

  const primaryCards: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    hoverBorder: string;
    activeClass?: string;
    bgGlow: string;
    breakdown?: BreakdownCategory;
  }> = [
    {
      key: 'blocksMined',
      label: isIt ? 'Blocchi Rotti' : 'Blocks Mined',
      icon: Pickaxe,
      accent: 'text-accent-cyan',
      hoverBorder: 'hover:border-accent-cyan/45',
      activeClass: 'border-accent-cyan/70 ring-1 ring-accent-cyan/30 bg-accent-cyan/[0.06]',
      bgGlow: 'from-accent-cyan/15 to-transparent',
      breakdown: 'mined',
    },
    {
      key: 'blocksPlaced',
      label: isIt ? 'Blocchi Piazzati' : 'Blocks Placed',
      icon: Hammer,
      accent: 'text-amber-300',
      hoverBorder: 'hover:border-amber-300/45',
      activeClass: 'border-amber-300/70 ring-1 ring-amber-300/30 bg-amber-300/[0.06]',
      bgGlow: 'from-amber-300/15 to-transparent',
      breakdown: 'placed',
    },
    {
      key: 'mobKills',
      label: isIt ? 'Mob Uccisi' : 'Mob Kills',
      icon: Swords,
      accent: 'text-purple-400',
      hoverBorder: 'hover:border-purple-400/45',
      activeClass: 'border-purple-400/70 ring-1 ring-purple-400/30 bg-purple-400/[0.06]',
      bgGlow: 'from-purple-400/15 to-transparent',
      breakdown: 'mobs',
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
      key: 'deaths',
      label: isIt ? 'Morti' : 'Deaths',
      icon: Skull,
      accent: 'text-rose-400',
      hoverBorder: 'hover:border-rose-400/35',
      bgGlow: 'from-rose-400/15 to-transparent',
    },
    {
      key: 'carpetScore',
      label: 'Carpet /stats',
      icon: Award,
      accent: 'text-emerald-400',
      hoverBorder: 'hover:border-emerald-400/35',
      bgGlow: 'from-emerald-400/15 to-transparent',
    },
  ];

  const breakdownConfig: Record<
    BreakdownCategory,
    {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      accent: string;
      borderClass: string;
      barClass: string;
      items: MemberStatBreakdownItem[];
      total: number;
      kind: 'block' | 'mob';
    }
  > = {
    mined: {
      title: isIt ? 'Classifica Personale · Blocchi Rotti' : 'Personal Top · Blocks Mined',
      icon: Pickaxe,
      accent: 'text-accent-cyan',
      borderClass: 'border-accent-cyan/35',
      barClass: 'bg-gradient-to-r from-accent-cyan-deep to-accent-cyan-hover',
      items: topBlocks,
      total: safeMined,
      kind: 'block',
    },
    placed: {
      title: isIt ? 'Classifica Personale · Blocchi Piazzati' : 'Personal Top · Blocks Placed',
      icon: Hammer,
      accent: 'text-amber-300',
      borderClass: 'border-amber-300/35',
      barClass: 'bg-gradient-to-r from-amber-500 to-yellow-300',
      items: topPlacedBlocks,
      total: safePlaced,
      kind: 'block',
    },
    mobs: {
      title: isIt ? 'Classifica Personale · Mob Uccisi' : 'Personal Top · Mob Kills',
      icon: Swords,
      accent: 'text-purple-400',
      borderClass: 'border-purple-400/35',
      barClass: 'bg-gradient-to-r from-purple-500 to-fuchsia-400',
      items: topKilledMobs,
      total: safeMobKills,
      kind: 'mob',
    },
  };

  const activeBreakdownMeta = activeBreakdown ? breakdownConfig[activeBreakdown] : null;
  const activeBreakdownMaxCount = activeBreakdownMeta
    ? activeBreakdownMeta.items.reduce((acc, item) => Math.max(acc, item.count), 1)
    : 1;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name} Minecraft Stats`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain"
    >
      {/* Blurred Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleAnimatedClose}
        className="gsap-morph-actor fixed inset-0 bg-[#080A0D]/80 backdrop-blur-xl"
      />

      {/* Previous / Next Player Desktop Controls */}
      <button
        type="button"
        data-hud-chrome
        onClick={handlePrev}
        aria-label={isIt ? 'Membro precedente' : 'Previous member'}
        className="hidden lg:flex fixed left-5 top-1/2 -translate-y-1/2 z-30 p-3 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-white/25 transition-colors cursor-pointer active:scale-[0.96]"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        data-hud-chrome
        onClick={handleNext}
        aria-label={isIt ? 'Membro successivo' : 'Next member'}
        className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 p-3 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-white/25 transition-colors cursor-pointer active:scale-[0.96]"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Expanding Card (Morphed straight out of clicked Frosted Name Pill) */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: theme.borderCss }}
        className="gsap-morph-actor relative z-10 w-full max-w-4xl frosted-name-pill rounded-3xl p-5 sm:p-7 border overflow-hidden my-auto"
      >
        {/* Top Ambient Role Glow */}
        <div
          data-hud-chrome
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-56 rounded-full blur-3xl pointer-events-none opacity-45"
          style={{ background: theme.glowHex }}
        />

        {/* HUD Scanner Beam Overlay */}
        <div
          ref={scanLineRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-accent-cyan/25 to-transparent z-30 opacity-0"
        />

        {/* TOP HEADER: Name rises cleanly up here + Rank + Role + Controls */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h3 className="m-0 leading-none">
              <span
                ref={headerNameRef}
                className="gsap-morph-actor inline-block font-pixel text-2xl sm:text-3xl text-text-primary tracking-tight"
              >
                {member.name}
              </span>
            </h3>

            <span
              data-hud-chrome
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
            >
              {isIt ? theme.labelIt : theme.labelEn}
            </span>

            <span
              data-hud-chrome
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${getRankBadgeStyle(
                rank
              )}`}
            >
              {rank <= 3 && <Crown className="w-3 h-3" />}
              <span>
                #{rank} / {totalMembers}
              </span>
            </span>

            <span
              data-hud-chrome
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan"
            >
              <Box className="w-3 h-3" />
              <span>Carpet /stats</span>
            </span>
          </div>

          <div data-hud-chrome className="flex items-center gap-2">
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

        <div data-hud-chrome aria-hidden="true" className="gsap-morph-actor w-full h-px bg-white/[0.08] mb-5" />

        {/* Content Grid: Character Left + Stats Right */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left Pedestal: Bust moves continuously here on open! */}
          <div
            data-hud-box
            className="gsap-morph-actor md:col-span-4 rounded-2xl bg-[#11141A]/85 border border-white/[0.07] p-5 flex flex-col items-center justify-between relative overflow-hidden"
          >
            <div data-hud-chrome className="w-full flex items-center justify-end z-10">
              <button
                type="button"
                onClick={toggleSkinPose}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white cursor-pointer transition-colors active:scale-[0.95]"
                title={isIt ? 'Cambia vista Busto / Corpo Intero' : 'Toggle Bust / Full Body'}
              >
                <RotateCw className="w-3 h-3 text-accent-cyan" />
                <span>{skinMode === 'bust' ? 'Bust' : 'Full 3D'}</span>
              </button>
            </div>

            <div
              ref={pedestalSlotRef}
              style={{ perspective: '700px' }}
              className="relative w-full h-52 sm:h-60 flex items-center justify-center my-2"
            >
              <div
                data-hud-chrome
                className={`absolute inset-8 rounded-full blur-3xl opacity-50 pointer-events-none ${theme.auraClass}`}
              />

              {/* Isometric Rotating Hologram Base Ring */}
              <div
                data-hud-chrome
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center"
              >
                <div
                  className="w-36 h-12 flex items-center justify-center"
                  style={{ transform: 'perspective(700px) rotateX(68deg)' }}
                >
                  <div
                    ref={pedestalRingRef}
                    className="w-32 h-32 rounded-full border-2 border-dashed opacity-65"
                    style={{ borderColor: theme.ringHex }}
                  />
                </div>
              </div>

              <img
                ref={settledSkinImgRef}
                key={`${member.id}-${skinMode}`}
                src={activeSkinUrl}
                alt={member.name}
                onError={(e) => handleSkinFallback(e, activeCandidates)}
                className="gsap-morph-actor relative z-10 w-[86%] h-[86%] object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)] will-change-transform"
              />
            </div>

            <div data-hud-chrome className="w-full text-center z-10 pt-3 border-t border-white/[0.07]">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                <Footprints className="w-3.5 h-3.5 text-accent-cyan" />
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
                const breakdownKey = card.breakdown;
                const isInteractive = Boolean(breakdownKey);
                const isActive = Boolean(breakdownKey && activeBreakdown === breakdownKey);
                const cardClassName = `group/tile w-full rounded-2xl bg-[#11141A]/90 border ${
                  isActive && card.activeClass
                    ? card.activeClass
                    : `border-white/[0.07] ${card.hoverBorder}`
                } p-3.5 relative overflow-hidden transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 text-left ${
                  isInteractive
                    ? 'cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70'
                    : ''
                }`;
                const inner = (
                  <>
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.bgGlow} ${
                        isActive ? 'opacity-85' : 'opacity-45 group-hover/tile:opacity-80'
                      } transition-opacity duration-200 pointer-events-none`}
                    />
                    <div className="relative flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted truncate">
                        {card.label}
                      </span>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${card.accent} transition-transform duration-200 group-hover/tile:scale-110`}
                      />
                    </div>
                    <div className="relative flex items-baseline justify-between gap-2">
                      <span
                        ref={(el) => {
                          counterRefs.current[card.key] = el;
                        }}
                        className="text-xl sm:text-2xl font-heading font-bold text-text-primary tabular-nums"
                      >
                        0
                      </span>
                      {isInteractive && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                            isActive
                              ? card.accent
                              : 'text-text-muted group-hover/tile:text-text-secondary'
                          }`}
                        >
                          <span>{isActive ? (isIt ? 'Attivo' : 'Active') : 'Top'}</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${
                              isActive ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      )}
                    </div>
                  </>
                );

                if (breakdownKey) {
                  return (
                    <button
                      key={card.key}
                      type="button"
                      data-stat-card
                      aria-pressed={isActive}
                      onClick={() =>
                        setActiveBreakdown((prev) =>
                          prev === breakdownKey ? null : breakdownKey
                        )
                      }
                      className={cardClassName}
                    >
                      {inner}
                    </button>
                  );
                }

                return (
                  <div key={card.key} data-stat-card className={cardClassName}>
                    {inner}
                  </div>
                );
              })}
            </div>

            {/* Bottom Section: Summary Grid OR Active Personal Leaderboard */}
            {activeBreakdownMeta ? (
              <div
                key={activeBreakdown}
                className={`rounded-2xl bg-[#11141A]/95 border ${activeBreakdownMeta.borderClass} p-4 flex flex-col gap-3 animate-dropdown-in`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <activeBreakdownMeta.icon
                      className={`w-4 h-4 shrink-0 ${activeBreakdownMeta.accent}`}
                    />
                    <span className="text-xs font-mono uppercase tracking-wider text-text-primary truncate">
                      {activeBreakdownMeta.title}
                    </span>
                    {activeBreakdownMeta.items.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] border border-white/10 text-text-secondary shrink-0">
                        Top {activeBreakdownMeta.items.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveBreakdown(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-text-secondary hover:text-white transition-colors cursor-pointer active:scale-[0.96]"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>{isIt ? 'Riepilogo' : 'Summary'}</span>
                  </button>
                </div>

                {activeBreakdownMeta.items.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
                    {activeBreakdownMeta.items.map((item, idx) => {
                      const rankPos = idx + 1;
                      const barPct = Math.max(
                        8,
                        Math.round((item.count / activeBreakdownMaxCount) * 100)
                      );
                      const sharePct =
                        activeBreakdownMeta.total > 0
                          ? Math.round((item.count / activeBreakdownMeta.total) * 1000) / 10
                          : 0;
                      return (
                        <div key={`${item.id}-${idx}`} className="flex items-center gap-2.5">
                          <span
                            className={`w-7 text-center py-0.5 rounded-md text-[10px] font-mono font-semibold border shrink-0 tabular-nums ${getRankBadgeStyle(
                              rankPos
                            )}`}
                          >
                            #{rankPos}
                          </span>
                          {activeBreakdownMeta.kind === 'mob' ? (
                            <MobTextureIcon
                              key={`${member.id}-mob-${item.id}`}
                              mobId={item.id}
                              label={item.label}
                            />
                          ) : (
                            <BlockTextureIcon
                              key={`${member.id}-blk-${item.id}`}
                              blockId={item.id}
                              label={item.label}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 text-xs font-mono mb-1">
                              <span className="text-text-primary truncate">{item.label}</span>
                              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                                <span className="text-text-secondary">
                                  {formatCompact(item.count)}
                                </span>
                                <span className="text-[10px] text-text-muted w-11 text-right">
                                  {formatCompact(sharePct, 1)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                style={{ width: `${barPct}%` }}
                                className={`h-full rounded-full ${activeBreakdownMeta.barClass}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-6 text-center text-xs font-mono text-text-secondary">
                    {activeBreakdownMeta.total > 0
                      ? isIt
                        ? 'Classifica dettagliata pronta: aggiorna la mod server a v1.2.0 e le regole Firebase per popolare questa lista in automatico.'
                        : 'Detailed breakdown ready: update the server mod to v1.2.0 and Firebase rules to populate this list automatically.'
                      : isIt
                        ? 'Nessun dato registrato per questa categoria.'
                        : 'No recorded stats in this category yet.'}
                  </div>
                )}
              </div>
            ) : (
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
                          {isIt ? 'Indice Overall' : 'Overall Score Index'}
                        </span>
                        <span
                          ref={(el) => {
                            counterRefs.current.carpetPct = el;
                          }}
                          className="text-accent-cyan font-semibold tabular-nums"
                        >
                          {serverSharePct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          data-stat-bar
                          style={{ width: `${serverSharePct}%`, transformOrigin: 'left center' }}
                          className="h-full rounded-full bg-gradient-to-r from-accent-cyan-deep to-accent-cyan-hover shadow-[0_0_12px_rgba(34,211,238,0.45)]"
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                      {isIt ? 'Top 3 Blocchi Scavati' : 'Top 3 Mined Blocks'}
                    </span>
                    {topBlocks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveBreakdown('mined')}
                        className="text-[11px] font-mono text-accent-cyan hover:text-accent-cyan-hover transition-colors cursor-pointer"
                      >
                        {isIt ? 'Vedi tutti →' : 'View all →'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {topBlocks.slice(0, 3).map((block, bIdx) => {
                      const pct = Math.max(12, Math.round((block.count / maxTopBlockCount) * 100));
                      return (
                        <div key={block.id} className="flex items-center gap-2.5">
                          <BlockTextureIcon
                            key={`${member.id}-${block.id}`}
                            blockId={block.id}
                            label={block.label}
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
            )}
          </div>
        </div>
      </div>

      {/* Fixed Unclipped Flying Bust (Glides from card above pill -> Left pedestal!) */}
      <img
        ref={flightBustRef}
        key={`flight-${member.id}`}
        src={bustSkinUrl}
        alt=""
        aria-hidden="true"
        onError={(e) => handleSkinFallback(e, bustCandidates)}
        className="gsap-morph-actor fixed z-20 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)] pointer-events-none hidden will-change-transform"
      />

      {/* Fixed Unclipped Flying Player Name (Rises from bottom pill -> Top header!) */}
      <span
        ref={flightNameRef}
        aria-hidden="true"
        className="gsap-morph-actor fixed z-30 font-pixel text-2xl sm:text-3xl text-text-primary tracking-tight leading-none pointer-events-none hidden whitespace-nowrap will-change-transform"
      >
        {member.name}
      </span>
    </div>
  );
};
