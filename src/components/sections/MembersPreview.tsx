import React, { useEffect, useState } from 'react';
import type { Member } from '../../types';
import { membersList as defaultMembers, sortMembersByRole } from '../../data/members';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { MemberCard } from '../ui/MemberCard';

export const MembersPreview: React.FC = () => {
  const { t } = useLanguage();
  const [members, setMembers] = useState<Member[]>(defaultMembers);

  useEffect(() => {
    let cancelled = false;
    fetch(`./members.json?t=${Date.now()}`, { cache: 'no-store' })
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
      .catch(() => {
        // Fallback su defaultMembers
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
};
