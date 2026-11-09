import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-[80vh] flex items-center justify-center pt-32 pb-20 px-4">
      <div className="glass-panel rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center">
        <div className="mb-4">
          <Badge variant="orange">{t.placeholderPage.badge}</Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
          {title}
        </h1>

        <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-8">
          {t.placeholderPage.description}
        </p>

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
