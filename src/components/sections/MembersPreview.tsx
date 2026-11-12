import React, { useEffect, useMemo, useState } from 'react';
import type { Member, MemberStats } from '../../types';
import { membersList as defaultMembers, sortMembersByRole } from '../../data/members';
import {
  buildFallbackStatsForName,
  defaultMemberStats,
} from '../../data/memberStats';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { MemberCard } from '../ui/MemberCard';
import { MemberStatsModal } from '../ui/MemberStatsModal';

export const MembersPreview: React.FC = () => {
  const { t } = useLanguage();
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [statsList, setStatsList] = useState<MemberStats[]>(defaultMemberStats);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const bust = Date.now();

    fetch(`./members.json?t=${bust}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const parsed: Member[] = data
          .filter((item) => item && typeof item.name === 'string')
          .map((item) => ({
            id: (item.id || item.name).toLowerCase(),
            name: item.name.trim(),
            roleGroup:
              item.roleGroup === 'owner' || item.roleGroup === 'member' || item.roleGroup === 'trial'
                ? item.roleGroup
                : 'member',
          }));
        if (parsed.length > 0) {
          setMembers(sortMembersByRole(parsed));
        }
      })
      .catch(() => {});

    fetch(`./stats.json?t=${bust}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const valid = data.filter(
          (item): item is MemberStats => item && typeof item.name === 'string'
        );
        if (valid.length > 0) {
          setStatsList(valid);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const statsMap = useMemo(() => {
    const map = new Map<string, MemberStats>();
    for (const s of statsList) {
      map.set(s.name.toLowerCase(), s);
    }
    return map;
  }, [statsList]);

  const memberMetrics = useMemo(() => {
    return members.map(
      (m) => statsMap.get(m.name.toLowerCase()) ?? buildFallbackStatsForName(m.name)
    );
  }, [members, statsMap]);

  const { maxCarpetScore, maxBlocksMined, rankByName } = useMemo(() => {
    let maxCarpet = 1;
    let maxMined = 1;
    for (const st of memberMetrics) {
      if (st.carpetScore > maxCarpet) maxCarpet = st.carpetScore;
      if (st.blocksMined > maxMined) maxMined = st.blocksMined;
    }
    const sorted = [...memberMetrics].sort((a, b) => b.carpetScore - a.carpetScore);
    const rankMap = new Map<string, number>();
    sorted.forEach((st, idx) => rankMap.set(st.name.toLowerCase(), idx + 1));
    return {
      maxCarpetScore: maxCarpet,
      maxBlocksMined: maxMined,
      rankByName: rankMap,
    };
  }, [memberMetrics]);

  const selectedMember = selectedIdx !== null ? members[selectedIdx] ?? null : null;
  const selectedStats = selectedIdx !== null ? memberMetrics[selectedIdx] ?? null : null;
  const selectedRank = selectedMember
    ? rankByName.get(selectedMember.name.toLowerCase()) ?? 1
    : 1;

  return (
    <section
      id="members"
      className="relative py-24 sm:py-32 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-xl text-left mb-12">
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

        {/* Members Grid (Ordinati: Owner -> Member -> Trial) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {members.map((member, idx) => (
            <MemberCard
              key={member.id}
              member={member}
              onSelect={() => setSelectedIdx(idx)}
            />
          ))}
        </div>
      </div>

      <MemberStatsModal
        member={selectedMember}
        stats={selectedStats}
        rank={selectedRank}
        totalMembers={members.length}
        maxCarpetScore={maxCarpetScore}
        maxBlocksMined={maxBlocksMined}
        onClose={() => setSelectedIdx(null)}
        onPrev={() =>
          setSelectedIdx((prev) =>
            prev === null ? null : (prev - 1 + members.length) % members.length
          )
        }
        onNext={() =>
          setSelectedIdx((prev) =>
            prev === null ? null : (prev + 1) % members.length
          )
        }
      />
    </section>
  );
};
