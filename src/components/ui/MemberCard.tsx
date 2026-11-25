import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Crown, Pencil, Trash2 } from 'lucide-react';
import type { Member, MemberRoleGroup } from '../../types';
import { getMemberSkinUrls } from '../../data/members';

export interface MemberCardOriginRects {
  pillRect: DOMRect;
  bustRect: DOMRect;
  nameRect: DOMRect;
}

interface MemberCardProps {
  member: Member;
  rank?: number;
  totalMembers?: number;
  isHidden?: boolean;
  onSelect?: (member: Member, metrics: MemberCardOriginRects | null) => void;
  isAdmin?: boolean;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
}

function getCardRankStyle(rank: number): { badgeClass: string; iconClass: string } {
  if (rank === 1) {
    return {
      badgeClass:
        'bg-[#1B160A]/90 border-amber-300/70 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.34)]',
      iconClass: 'text-amber-300',
    };
  }
  if (rank === 2) {
    return {
      badgeClass:
        'bg-[#131822]/90 border-slate-300/60 text-slate-100 shadow-[0_0_14px_rgba(203,213,225,0.22)]',
      iconClass: 'text-slate-200',
    };
  }
  if (rank === 3) {
    return {
      badgeClass:
        'bg-[#1D130C]/90 border-orange-400/60 text-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.24)]',
      iconClass: 'text-orange-300',
    };
  }
  return {
    badgeClass: 'bg-[#0E141D]/85 border-white/15 text-text-secondary',
    iconClass: 'text-text-muted',
  };
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  rank,
  totalMembers,
  isHidden = false,
  onSelect,
  isAdmin = false,
  onEdit,
  onDelete,
}) => {
  const skinCandidates = useMemo(() => {
    const fallbacks = getMemberSkinUrls(member.name, 'bust', member.uuid);
    return member.customImageUrl ? [member.customImageUrl, ...fallbacks] : fallbacks;
  }, [member.name, member.uuid, member.customImageUrl]);

  const [skinUrlIdx, setSkinUrlIdx] = useState(0);
  useEffect(() => {
    setSkinUrlIdx(0);
  }, [skinCandidates]);
  const bustUrl = skinCandidates[Math.min(skinUrlIdx, skinCandidates.length - 1)];

  const pillRef = useRef<HTMLDivElement | null>(null);
  const bustRef = useRef<HTMLImageElement | null>(null);
  const nameRef = useRef<HTMLSpanElement | null>(null);

  const handleImageError = () => {
    setSkinUrlIdx((prev) => (prev + 1 < skinCandidates.length ? prev + 1 : prev));
  };

  const roleStyles: Record<
    MemberRoleGroup,
    {
      pillBorder: string;
      glow: string;
      auraBg: string;
    }
  > = {
    owner: {
      pillBorder: 'border-role-owner/70 group-hover:border-role-owner',
      glow: 'group-hover:shadow-glow-owner',
      auraBg: 'bg-role-owner/20',
    },
    member: {
      pillBorder: 'border-role-member/70 group-hover:border-role-member',
      glow: 'group-hover:shadow-glow-member',
      auraBg: 'bg-role-member/20',
    },
    trial: {
      pillBorder: 'border-role-trial/80 group-hover:border-role-trial',
      glow: 'group-hover:shadow-glow-trial',
      auraBg: 'bg-role-trial/20',
    },
  };

  const style = roleStyles[member.roleGroup];
  const rankStyle = typeof rank === 'number' && rank > 0 ? getCardRankStyle(rank) : null;

  const handleClick = () => {
    const pillRect = pillRef.current?.getBoundingClientRect();
    const bustRect = bustRef.current?.getBoundingClientRect();
    const nameRect = nameRef.current?.getBoundingClientRect();
    if (pillRect && bustRect && nameRect) {
      onSelect?.(member, { pillRect, bustRect, nameRect });
    } else {
      onSelect?.(member, null);
    }
  };

  return (
    <div
      className={`group relative transition-[opacity] duration-150 ${
        isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {isAdmin && (
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1 opacity-75 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit?.(member)}
            aria-label={`Modifica ${member.name}`}
            title={`Modifica ${member.name}`}
            className="p-1.5 rounded-lg bg-[#0E141D]/90 border border-white/15 text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/50 backdrop-blur-md transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(member)}
            aria-label={`Rimuovi ${member.name}`}
            title={`Rimuovi ${member.name}`}
            className="p-1.5 rounded-lg bg-[#0E141D]/90 border border-white/15 text-text-secondary hover:text-rose-400 hover:border-rose-500/50 backdrop-blur-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        className="relative flex flex-col items-center pt-4 pb-2 px-2 select-none w-full text-center cursor-pointer transition-[transform,opacity] duration-150 ease-out-Quart active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 rounded-3xl"
      >
        {/* Top-Right Leaderboard Position Badge + Hover Stats Hint */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
          {typeof rank === 'number' && rank > 0 && rankStyle && (
            <span
              aria-label={totalMembers ? `Posizione #${rank} su ${totalMembers}` : `Posizione #${rank}`}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tabular-nums border backdrop-blur-md transition-transform duration-200 ease-out-Quart group-hover:-translate-y-0.5 ${rankStyle.badgeClass}`}
            >
              {rank <= 3 && <Crown className={`w-3 h-3 shrink-0 ${rankStyle.iconClass}`} />}
              <span>#{rank}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#0E141D]/90 border border-white/15 text-text-secondary backdrop-blur-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-[opacity,transform] duration-200">
            <BarChart3 className="w-3 h-3 text-accent-cyan" />
            <span>Stats</span>
          </span>
        </div>

        {/* Bust Container with Dynamic Skin Back-Blur */}
        <div className="relative w-full max-w-[210px] aspect-square flex items-end justify-center">
          {/* Layer 1: Role Ambient Aura */}
          <div
            className={`absolute inset-6 rounded-full blur-3xl opacity-35 group-hover:opacity-65 transition-opacity duration-300 pointer-events-none ${style.auraBg}`}
          />

          {/* Layer 2: Duplicated Blurred Skin (Dynamic Color Extraction Blur) */}
          <img
            src={bustUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain blur-2xl scale-110 opacity-45 group-hover:opacity-75 group-hover:scale-125 transition-all duration-300 pointer-events-none"
          />

          {/* Layer 3: Crisp 3D Bust Render */}
          <img
            ref={bustRef}
            data-member-bust={member.id}
            src={bustUrl}
            alt={member.name}
            onError={handleImageError}
            className="relative z-10 w-[88%] h-[88%] object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out-Quart group-hover:-translate-y-1.5 group-hover:scale-[1.03] pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* Layer 4: Overlapping Frosted Glass Pill + Pixel MC Font */}
        <div
          ref={pillRef}
          data-member-pill={member.id}
          className={`relative z-20 -mt-8 w-full max-w-[230px] rounded-full frosted-name-pill border-2 ${style.pillBorder} ${style.glow} py-3 px-5 text-center transition-all duration-200 ease-out-Quart group-hover:-translate-y-0.5`}
        >
          <span
            ref={nameRef}
            data-member-name={member.id}
            className="inline-block max-w-full align-middle text-text-primary truncate font-pixel tracking-tight text-base sm:text-lg"
          >
            {member.name}
          </span>
        </div>
      </button>
    </div>
  );
};
