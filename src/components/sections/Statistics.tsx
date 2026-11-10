import React, { useEffect, useState } from 'react';
import { Users, FolderGit2, Zap, Clock } from 'lucide-react';
import { serverStatistics, getWorldAgeDays } from '../../data/statistics';
import { useLanguage } from '../../i18n/LanguageContext';

export const Statistics: React.FC = () => {
  const { t, lang } = useLanguage();
  const [worldDays, setWorldDays] = useState<number>(() => getWorldAgeDays());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWorldDays(getWorldAgeDays());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const getIcon = (id: string) => {
    switch (id) {
      case 'members':
        return <Users className="w-4 h-4 text-accent-orange" />;
      case 'projects':
        return <FolderGit2 className="w-4 h-4 text-accent-orange" />;
      case 'farms':
        return <Zap className="w-4 h-4 text-accent-orange" />;
      case 'worldAge':
        return <Clock className="w-4 h-4 text-accent-orange" />;
      default:
        return <Zap className="w-4 h-4 text-accent-orange" />;
    }
  };

  return (
    <section className="relative py-20 bg-bg-main border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-left">
          <span className="text-xs font-mono uppercase tracking-wider text-accent-orange block mb-1.5">
            {t.stats.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary tracking-tight">
            {t.stats.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {serverStatistics.map((stat) => {
            const copy = t.stats.items[stat.id];
            const displayValue =
              stat.id === 'worldAge'
                ? lang === 'it'
                  ? `${worldDays} gg`
                  : `${worldDays}d`
                : stat.value;

            return (
              <div
                key={stat.id}
                className="glass-panel rounded-2xl p-6 text-left transition-colors hover:border-white/15"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-text-secondary">
                    {copy.label}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    {getIcon(stat.id)}
                  </div>
                </div>

                <div className="text-3xl sm:text-4xl font-heading font-bold text-text-primary tracking-tight">
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
