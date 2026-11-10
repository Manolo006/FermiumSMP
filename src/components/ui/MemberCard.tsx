import React from 'react';
import type { Member, MemberRoleGroup } from '../../types';
import { getMemberBustUrl } from '../../data/members';

interface MemberCardProps {
  member: Member;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  const bustUrl = getMemberBustUrl(member);

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

  return (
    <div className="group relative flex flex-col items-center pt-4 pb-2 px-2 select-none">
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
        className={`relative z-20 -mt-8 w-full max-w-[230px] rounded-full frosted-name-pill border-2 ${style.pillBorder} ${style.glow} py-3 px-5 text-center transition-all duration-200 ease-out-Quart group-hover:-translate-y-0.5`}
      >
        <span className="block text-text-primary truncate font-pixel tracking-tight text-base sm:text-lg">
          {member.name}
        </span>
      </div>
    </div>
  );
};
