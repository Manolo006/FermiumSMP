import React, { useMemo, useState } from 'react';
import { BarChart3, Search, UserPlus, X } from 'lucide-react';
import type { Member, MemberRoleGroup, MemberStats } from '../../types';
import { buildFallbackStatsForName } from '../../data/memberStats';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { Badge } from '../ui/Badge';
import { MemberCard, type MemberCardOriginRects } from '../ui/MemberCard';
import { MemberStatsModal } from '../ui/MemberStatsModal';
import { MemberFormModal } from '../admin/AdminModals';

type MemberRoleFilter = 'all' | MemberRoleGroup;

function normalizeUuid(uuid?: string): string {
  return uuid ? uuid.replace(/-/g, '').trim().toLowerCase() : '';
}

export const MembersPreview: React.FC = () => {
  const { t, lang } = useLanguage();
  const isIt = lang === 'it';
  const { isAdmin } = useAdminAuth();
  const { members, saveMember, deleteMember } = useSiteContent();

  const statsList = usePlayerStats();
  const [roleFilter, setRoleFilter] = useState<MemberRoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [originMetrics, setOriginMetrics] = useState<MemberCardOriginRects | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDeleteMember = async (member: Member) => {
    const confirmMsg = isIt
      ? `Rimuovere "${member.name}" dai membri di Fermium SMP?`
      : `Remove "${member.name}" from Fermium SMP members?`;
    if (!window.confirm(confirmMsg)) return;
    setActionError(null);
    try {
      await deleteMember(member.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const { statsByUuid, statsByName } = useMemo(() => {
    const byUuid = new Map<string, MemberStats>();
    const byName = new Map<string, MemberStats>();
    for (const s of statsList) {
      const uuid = normalizeUuid(s.uuid);
      if (uuid.length === 32) byUuid.set(uuid, s);
      byName.set(s.name.toLowerCase(), s);
    }
    return { statsByUuid: byUuid, statsByName: byName };
  }, [statsList]);

  const memberMetrics = useMemo(() => {
    return members.map((m) => {
      const uuid = normalizeUuid(m.uuid);
      return (
        (uuid ? statsByUuid.get(uuid) : undefined) ??
        statsByName.get(m.name.toLowerCase()) ??
        buildFallbackStatsForName(m.name)
      );
    });
  }, [members, statsByUuid, statsByName]);

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

  // Role counts
  const roleCounts = useMemo(() => {
    const counts = { all: members.length, owner: 0, member: 0, trial: 0 };
    for (const m of members) {
      counts[m.roleGroup] += 1;
    }
    return counts;
  }, [members]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.roleGroup !== roleFilter) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, roleFilter, searchQuery]);

  const selectedGlobalIdx = useMemo(() => {
    if (!selectedMemberId) return null;
    const idx = members.findIndex((m) => m.id === selectedMemberId);
    return idx >= 0 ? idx : null;
  }, [members, selectedMemberId]);

  const selectedMember = selectedGlobalIdx !== null ? members[selectedGlobalIdx] ?? null : null;
  const selectedStats = selectedGlobalIdx !== null ? memberMetrics[selectedGlobalIdx] ?? null : null;
  const selectedRank = selectedMember
    ? rankByName.get(selectedMember.name.toLowerCase()) ?? 1
    : 1;

  const filterOrder: MemberRoleFilter[] = ['all', 'owner', 'member', 'trial'];

  const roleDot: Record<MemberRoleFilter, string | null> = {
    all: null,
    owner: 'bg-role-owner',
    member: 'bg-role-member',
    trial: 'bg-role-trial',
  };

  return (
    <section
      id="members"
      className="relative py-24 sm:py-32 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 text-left">
          <div className="max-w-xl">
            <div className="mb-3">
              <Badge variant="cyan">{t.members.tag}</Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {t.members.title}{' '}
              <span className="text-accent-cyan">{t.members.titleAccent}</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {t.members.subtitle}
            </p>
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <BarChart3 className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
              <span>{t.members.clickHint}</span>
            </p>
          </div>

          {/* Search Input + Admin Action */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <div className="relative w-full sm:w-64 lg:w-72">
              <label htmlFor="member-search" className="sr-only">
                {t.members.searchPlaceholder}
              </label>
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="member-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.members.searchPlaceholder}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t.members.clearFilters}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setMemberModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-cyan text-[#061018] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-cyan-hover shadow-glow-cyan transition-all cursor-pointer active:scale-[0.97] whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isIt ? '+ Aggiungi Membro' : '+ Add Member'}</span>
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mb-6 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-200/80 hover:text-white cursor-pointer"
              aria-label="Chiudi errore"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Role Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
          {filterOrder.map((role) => {
            const active = roleFilter === role;
            const count = roleCounts[role];
            if (role !== 'all' && count === 0) return null;
            return (
              <button
                key={role}
                type="button"
                aria-pressed={active}
                onClick={() => setRoleFilter(role)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 cursor-pointer active:scale-[0.96] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
                  active
                    ? 'bg-accent-cyan text-[#061018] font-semibold shadow-glow-cyan'
                    : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:text-text-primary hover:bg-white/[0.08]'
                }`}
              >
                {roleDot[role] && !active && (
                  <span className={`w-2 h-2 rounded-full ${roleDot[role]}`} />
                )}
                <span>{t.members.filters[role]}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    active ? 'bg-[#061018]/15 text-[#061018]' : 'bg-white/[0.06] text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Members Grid (Ordinati: Owner -> Member -> Trial) */}
        {filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isHidden={selectedMember?.id === member.id}
                isAdmin={isAdmin}
                onEdit={(m) => {
                  setEditingMember(m);
                  setMemberModalOpen(true);
                }}
                onDelete={handleDeleteMember}
                onSelect={(m, metrics) => {
                  setOriginMetrics(metrics);
                  setSelectedMemberId(m.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <p className="text-sm text-text-secondary mb-4">{t.members.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/35 text-xs font-mono font-semibold text-accent-cyan hover:bg-accent-cyan/25 transition-colors cursor-pointer"
            >
              {t.members.clearFilters}
            </button>
          </div>
        )}
      </div>

      <MemberStatsModal
        member={selectedMember}
        stats={selectedStats}
        originMetrics={originMetrics}
        rank={selectedRank}
        totalMembers={members.length}
        maxCarpetScore={maxCarpetScore}
        maxBlocksMined={maxBlocksMined}
        onClose={() => {
          setSelectedMemberId(null);
          setOriginMetrics(null);
        }}
        onPrev={() => {
          if (selectedGlobalIdx === null) return;
          const prevIdx = (selectedGlobalIdx - 1 + members.length) % members.length;
          setSelectedMemberId(members[prevIdx].id);
        }}
        onNext={() => {
          if (selectedGlobalIdx === null) return;
          const nextIdx = (selectedGlobalIdx + 1) % members.length;
          setSelectedMemberId(members[nextIdx].id);
        }}
      />

      <MemberFormModal
        isOpen={memberModalOpen}
        initialMember={editingMember}
        onClose={() => {
          setMemberModalOpen(false);
          setEditingMember(null);
        }}
        onSave={saveMember}
      />
    </section>
  );
};
