import React, { useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Member, MemberRoleGroup } from '../../types';
import { getMemberBustUrl } from '../../data/members';

interface MemberCardProps {
  member: Member;
  onSelect?: (member: Member, sourceRect: DOMRect | null) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onSelect }) => {
  const bustUrl = getMemberBustUrl(member);
  const pillRef = useRef<HTMLDivElement | null>(null);

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

  const handleClick = () => {
    const rect = pillRef.current?.getBoundingClientRect() ?? null;
    onSelect?.(member, rect);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative flex flex-col items-center pt-4 pb-2 px-2 select-none w-full text-center cursor-pointer transition-transform duration-150 ease-out-Quart active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/70 rounded-3xl"
    >
      {/* Subtle Hover Stats Hint */}
      <span className="absolute top-3 right-4 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#141820]/90 border border-white/15 text-text-secondary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none">
        <BarChart3 className="w-3 h-3 text-accent-orange" />
        <span>Stats</span>
      </span>

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
          src={bustUrl}
          alt={member.name}
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
        <span className="block text-text-primary truncate font-pixel tracking-tight text-base sm:text-lg">
          {member.name}
        </span>
      </div>
    </button>
  );
};
