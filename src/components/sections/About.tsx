import React from 'react';
import { Cpu, Layers, Users } from 'lucide-react';
import aboutScreenshot from '../../assets/images/1.png';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';

export const About: React.FC = () => {
  const { t } = useLanguage();

  const icons = [
    <Cpu key="cpu" className="w-4 h-4 text-accent-orange" />,
    <Layers key="layers" className="w-4 h-4 text-accent-orange" />,
    <Users key="users" className="w-4 h-4 text-accent-orange" />,
  ];

  return (
    <section
      id="about"
      className="relative py-24 sm:py-32 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Editorial Text */}
          <div className="lg:col-span-6 text-left">
            <div className="mb-4">
              <Badge variant="orange">{t.about.tag}</Badge>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary leading-tight mb-6">
              {t.about.title}{' '}
              <span className="text-accent-orange">{t.about.titleAccent}</span>
            </h2>

            <p className="text-base text-text-secondary leading-relaxed mb-4">
              {t.about.paragraph1}
            </p>

            <p className="text-base text-text-secondary leading-relaxed mb-8">
              {t.about.paragraph2}
            </p>

            {/* Feature Cards */}
            <div className="space-y-3">
              {t.about.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="glass-panel rounded-2xl p-4 flex items-start gap-3.5 transition-colors hover:border-white/15"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center shrink-0 mt-0.5">
                    {icons[idx]}
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-semibold text-text-primary mb-0.5">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Screenshot Frame */}
          <div className="lg:col-span-6">
            <div className="glass-panel rounded-2xl p-2.5">
              <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/[0.06] relative bg-[#12151B]">
                <img
                  src={aboutScreenshot}
                  alt="Fermium SMP Redstone Engineering"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101216]/50 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
