import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Grid3X3, Map, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const { t, lang } = useLanguage();

  return (
    <div className="min-h-[80vh] flex items-center justify-center pt-32 pb-20 px-4">
      <div className="glass-panel border-gradient-cyan rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center">
        <div className="mb-4">
          <Badge variant="cyan">{t.placeholderPage.badge}</Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
          {title}
        </h1>

        <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-7">
          {t.placeholderPage.description}
        </p>

        {/* Quick access to live tools so visitors always have a clear next action */}
        <div className="mb-7 pt-5 border-t border-white/10">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-3">
            {lang === 'it' ? 'Strumenti già disponibili' : 'Available tools'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/world"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors"
            >
              <Map className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{t.nav.worldMap}</span>
            </Link>
            <Link
              to="/tools/enchanting"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{t.nav.enchanting}</span>
            </Link>
            <Link
              to="/tools/chunk-loader"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{t.nav.chunkLoader}</span>
            </Link>
          </div>
        </div>

        <Link to="/">
          <Button
            variant="primary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            iconPosition="left"
          >
            {t.placeholderPage.backHome}
          </Button>
        </Link>
      </div>
    </div>
  );
};
