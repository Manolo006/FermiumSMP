import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Type } from 'lucide-react';
import type { MemberRoleGroup } from '../../types';
import { membersList } from '../../data/members';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MemberCard, type MemberCardStyle } from '../ui/MemberCard';

export const MembersPreview: React.FC = () => {
  const { lang, t } = useLanguage();
  const [filter, setFilter] = useState<'all' | MemberRoleGroup>('all');
  const [cardStyle, setCardStyle] = useState<MemberCardStyle>('floating-pill');
  const [usePixelFont, setUsePixelFont] = useState<boolean>(true);

  const filteredMembers =
    filter === 'all' ? membersList : membersList.filter((m) => m.roleGroup === filter);

  const filterButtons: { key: 'all' | MemberRoleGroup; label: string; count: number }[] = [
    { key: 'all', label: t.members.filters.all, count: membersList.length },
    {
      key: 'owner',
      label: t.members.filters.owner,
      count: membersList.filter((m) => m.roleGroup === 'owner').length,
    },
    {
      key: 'member',
      label: t.members.filters.member,
      count: membersList.filter((m) => m.roleGroup === 'member').length,
    },
    {
      key: 'trial',
      label: t.members.filters.trial,
      count: membersList.filter((m) => m.roleGroup === 'trial').length,
    },
  ];

  return (
    <section
      id="members"
      className="relative py-24 sm:py-32 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 text-left">
          <div className="max-w-xl">
            <div className="mb-3">
              <Badge variant="orange">{t.members.tag}</Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {t.members.title}{' '}
              <span className="text-accent-orange">{t.members.titleAccent}</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {t.members.subtitle}
            </p>
          </div>

          {/* Role Color Legend */}
          <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-2 text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-full bg-role-owner shadow-[0_0_8px_#60A5FA]" />
              <span>{t.members.legend.owner}</span>
            </span>
            <span className="flex items-center gap-2 text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-full bg-role-member shadow-[0_0_8px_#38BDF8]" />
              <span>{t.members.legend.member}</span>
            </span>
            <span className="flex items-center gap-2 text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-full bg-role-trial shadow-[0_0_8px_#FACC15]" />
              <span>{t.members.legend.trial}</span>
            </span>
          </div>
        </div>

        {/* Controls Bar: Role Filter + Live Blur/Font Style Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          {/* Role Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterButtons.map((btn) => {
              const active = filter === btn.key;
              return (
                <button
                  key={btn.key}
                  onClick={() => setFilter(btn.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.96] whitespace-nowrap ${
                    active
                      ? 'bg-accent-orange text-[#101216] font-semibold shadow-glow-orange'
                      : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:text-text-primary hover:bg-white/[0.07]'
                  }`}
                >
                  {btn.label} ({btn.count})
                </button>
              );
            })}
          </div>

          {/* Interactive Style Preview Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                setCardStyle(cardStyle === 'floating-pill' ? 'glass-card' : 'floating-pill')
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors cursor-pointer active:scale-[0.96]"
              title="Cambia variante card"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-orange" />
              <span>
                {cardStyle === 'floating-pill'
                  ? lang === 'it'
                    ? 'Stile: Busto + Pillola Blur'
                    : 'Style: Bust + Blur Pill'
                  : lang === 'it'
                  ? 'Stile: Card Vetro Completa'
                  : 'Style: Full Glass Card'}
              </span>
            </button>

            <button
              onClick={() => setUsePixelFont(!usePixelFont)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors cursor-pointer active:scale-[0.96]"
              title="Cambia font del nome"
            >
              <Type className="w-3.5 h-3.5 text-accent-orange" />
              <span>{usePixelFont ? 'Font: Pixel MC' : 'Font: Modern'}</span>
            </button>
          </div>
        </div>

        {/* 8 Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              cardStyle={cardStyle}
              usePixelFont={usePixelFont}
            />
          ))}
        </div>

        {/* Link to Full Members Page */}
        <div className="mt-14 text-center">
          <Link to="/members">
            <Button variant="secondary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
              {t.members.viewAll}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
