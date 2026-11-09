import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ProjectCategoryKey } from '../../types';
import { projectSlots } from '../../data/projects';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PlaceholderSurface } from '../ui/PlaceholderSurface';

export const ProjectsPreview: React.FC = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryKey>('all');

  const categories: ProjectCategoryKey[] = [
    'all',
    'farms',
    'redstone',
    'perimeters',
    'storage',
    'infrastructure',
    'megabuilds',
  ];

  const filteredSlots =
    selectedCategory === 'all'
      ? projectSlots
      : projectSlots.filter((slot) => slot.category === selectedCategory);

  return (
    <section
      id="projects"
      className="relative py-24 sm:py-32 bg-bg-main border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-xl text-left mb-10">
          <div className="mb-3">
            <Badge variant="orange">{t.projects.tag}</Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
            {t.projects.title}{' '}
            <span className="text-accent-orange">{t.projects.titleAccent}</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {t.projects.subtitle}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.96] whitespace-nowrap ${
                  active
                    ? 'bg-accent-orange text-[#101216] font-semibold shadow-glow-orange'
                    : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:text-text-primary hover:bg-white/[0.07]'
                }`}
              >
                {t.projects.categories[cat]}
              </button>
            );
          })}
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlots.map((slot) => (
            <div
              key={slot.id}
              className="group glass-panel rounded-2xl p-3 flex flex-col justify-between text-left transition-all duration-200 ease-out-Quart hover:-translate-y-1 hover:border-white/20"
            >
              <div>
                {/* Cover Image (Concentric Radius: outer rounded-2xl p-3 -> inner rounded-xl) */}
                <div className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-white/[0.06] mb-4 relative bg-[#12151B]">
                  {slot.coverImage ? (
                    <img
                      src={slot.coverImage}
                      alt={`${t.projects.placeholderCardTitle} #${slot.slotNumber}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <PlaceholderSurface
                      title={`${t.projects.placeholderCardTitle} #${slot.slotNumber}`}
                      subtitle={t.projects.placeholderImage}
                    />
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="neutral">
                      {t.projects.categories[slot.category]}
                    </Badge>
                  </div>
                </div>

                {/* Card Copy */}
                <div className="px-2">
                  <h3 className="text-lg font-heading font-semibold text-text-primary group-hover:text-accent-orange transition-colors mb-1.5">
                    {t.projects.placeholderCardTitle} #{slot.slotNumber}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                    {t.projects.placeholderCardDesc}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-2 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-text-muted">{t.projects.contributorsLabel} —</span>
                <Link
                  to={`/projects/${slot.id}`}
                  className="inline-flex items-center gap-1 font-medium text-accent-orange hover:underline"
                >
                  <span>{t.projects.detailsLink}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Link to="/projects">
            <Button variant="secondary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
              {t.projects.viewAll}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
