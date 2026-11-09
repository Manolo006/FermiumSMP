import React from 'react';
import type { Member, MemberRoleGroup } from '../../types';
import { getMemberBustUrl } from '../../data/members';
import { useLanguage } from '../../i18n/LanguageContext';

export type MemberCardStyle = 'floating-pill' | 'glass-card';

interface MemberCardProps {
  member: Member;
  cardStyle?: MemberCardStyle;
  usePixelFont?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  cardStyle = 'floating-pill',
  usePixelFont = true,
}) => {
  const { t } = useLanguage();
  const bustUrl = getMemberBustUrl(member);

  const roleStyles: Record<
    MemberRoleGroup,
    {
      pillBorder: string;
      cardBorder: string;
      glow: string;
      auraBg: string;
      badgeBg: string;
      dot: string;
    }
  > = {
    owner: {
      pillBorder: 'border-role-owner/65 group-hover:border-role-owner',
      cardBorder: 'border-role-owner/45 hover:border-role-owner/90',
      glow: 'group-hover:shadow-glow-owner',
      auraBg: 'bg-role-owner/20',
      badgeBg: 'bg-role-owner/15 text-role-owner border-role-owner/35',
      dot: 'bg-role-owner shadow-[0_0_8px_#60A5FA]',
    },
    member: {
      pillBorder: 'border-role-member/65 group-hover:border-role-member',
      cardBorder: 'border-role-member/45 hover:border-role-member/90',
      glow: 'group-hover:shadow-glow-member',
      auraBg: 'bg-role-member/20',
      badgeBg: 'bg-role-member/15 text-role-member border-role-member/35',
      dot: 'bg-role-member shadow-[0_0_8px_#38BDF8]',
    },
    trial: {
      pillBorder: 'border-role-trial/75 group-hover:border-role-trial',
      cardBorder: 'border-role-trial/55 hover:border-role-trial/95',
      glow: 'group-hover:shadow-glow-trial',
      auraBg: 'bg-role-trial/20',
      badgeBg: 'bg-role-trial/15 text-role-trial border-role-trial/40',
      dot: 'bg-role-trial shadow-[0_0_8px_#FACC15]',
    },
  };

  const style = roleStyles[member.roleGroup];
  const fontClass = usePixelFont
    ? 'font-pixel tracking-tight text-base sm:text-lg'
    : 'font-heading font-bold tracking-tight text-lg sm:text-xl';

  if (cardStyle === 'floating-pill') {
    return (
      <div className="group relative flex flex-col items-center pt-4 pb-2 px-2 select-none">
        {/* Role Micro-Pill Floating Top-Right */}
        <div
          className={`z-20 mb-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border backdrop-blur-md flex items-center gap-1.5 transition-transform duration-200 group-hover:-translate-y-0.5 ${style.badgeBg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          <span>{t.members.roles[member.roleGroup]}</span>
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
            onError={(e) => {
              if (member.customImageUrl && e.currentTarget.src !== member.customImageUrl) {
                e.currentTarget.src = member.customImageUrl;
              }
            }}
            className="absolute inset-0 w-full h-full object-contain blur-2xl scale-110 opacity-45 group-hover:opacity-75 group-hover:scale-125 transition-all duration-300 pointer-events-none"
          />

          {/* Layer 3: Crisp 3D Bust Render */}
          <img
            src={bustUrl}
            alt={member.name}
            onError={(e) => {
              if (member.customImageUrl && e.currentTarget.src !== member.customImageUrl) {
                e.currentTarget.src = member.customImageUrl;
              }
            }}
            className="relative z-10 w-[88%] h-[88%] object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out-Quart group-hover:-translate-y-1.5 group-hover:scale-[1.03] pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* Layer 4: Overlapping Frosted Glass Pill (blurs the lower torso behind it!) */}
        <div
          className={`relative z-20 -mt-8 w-full max-w-[230px] rounded-full frosted-name-pill border-2 ${style.pillBorder} ${style.glow} py-3 px-5 text-center transition-all duration-200 ease-out-Quart group-hover:-translate-y-0.5`}
        >
          <span className={`block text-text-primary truncate ${fontClass}`}>
            {member.name}
          </span>
        </div>
      </div>
    );
  }

  // Variant 2: Full Frosted Glass Card with Progressive Bottom Blur
  return (
    <div
      className={`group relative rounded-3xl bg-[#15181F]/70 backdrop-blur-xl border ${style.cardBorder} ${style.glow} p-4 flex flex-col items-center justify-between overflow-hidden transition-all duration-200 ease-out-Quart hover:-translate-y-1 shadow-glass`}
    >
      {/* Top Bar: Role Badge */}
      <div className="w-full flex items-center justify-end z-20 mb-1">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border backdrop-blur-md flex items-center gap-1.5 ${style.badgeBg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          <span>{t.members.roles[member.roleGroup]}</span>
        </span>
      </div>

      {/* Center Bust with Dynamic Skin Blur */}
      <div className="relative w-full aspect-square flex items-end justify-center overflow-hidden rounded-2xl">
        {/* Role Aura */}
        <div
          className={`absolute inset-6 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none ${style.auraBg}`}
        />

        {/* Blurred Skin Backlight */}
        <img
          src={bustUrl}
          alt=""
          aria-hidden="true"
          onError={(e) => {
            if (member.customImageUrl && e.currentTarget.src !== member.customImageUrl) {
              e.currentTarget.src = member.customImageUrl;
            }
          }}
          className="absolute inset-0 w-full h-full object-contain blur-2xl scale-115 opacity-45 group-hover:opacity-75 transition-all duration-300 pointer-events-none"
        />

        {/* Crisp 3D Bust */}
        <img
          src={bustUrl}
          alt={member.name}
          onError={(e) => {
            if (member.customImageUrl && e.currentTarget.src !== member.customImageUrl) {
              e.currentTarget.src = member.customImageUrl;
            }
          }}
          className="relative z-10 w-[86%] h-[86%] object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out-Quart group-hover:scale-105 pointer-events-none"
          loading="lazy"
        />

        {/* Progressive Blur Overlay at the base of the bust */}
        <div className="absolute inset-x-0 bottom-0 h-16 progressive-bottom-blur z-15 pointer-events-none" />
      </div>

      {/* Overlapping Frosted Pill */}
      <div
        className={`relative z-20 -mt-7 w-full rounded-full frosted-name-pill border ${style.pillBorder} py-2.5 px-4 text-center transition-all duration-200`}
      >
        <span className={`block text-text-primary truncate ${fontClass}`}>
          {member.name}
        </span>
      </div>
    </div>
  );
};
