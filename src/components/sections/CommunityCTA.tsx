import React from 'react';
import { MessageSquare } from 'lucide-react';
import fermiumLogo from '../../assets/logo/Fermium_logo.png';
import { DISCORD_INVITE_URL, DISCORD_INVITE_SHORT } from '../../config/links';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../ui/Button';

export const CommunityCTA: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section
      id="discord-cta"
      className="relative py-24 sm:py-32 bg-bg-main border-t border-white/[0.06] overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="glass-panel rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden">
          {/* Subtle Top Radial Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-64 bg-accent-orange/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-center mb-6">
              <img
                src={fermiumLogo}
                alt="Fermium Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary leading-tight mb-4 max-w-2xl">
              {t.cta.title}{' '}
              <span className="text-accent-orange">{t.cta.titleAccent}</span>
            </h2>

            <p className="max-w-xl text-sm sm:text-base text-text-secondary leading-relaxed mb-8">
              {t.cta.subtitle}
            </p>

            <Button
              variant="primary"
              size="lg"
              icon={<MessageSquare className="w-4 h-4" />}
              iconPosition="left"
              href={DISCORD_INVITE_URL}
              target="_blank"
              className="min-w-[210px]"
            >
              {t.cta.button}
            </Button>

            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-xs text-text-muted hover:text-accent-orange font-mono transition-colors"
            >
              {DISCORD_INVITE_SHORT}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
