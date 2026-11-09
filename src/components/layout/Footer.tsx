import React from 'react';
import { Link } from 'react-router-dom';
import fermiumLogo from '../../assets/logo/Fermium_logo.png';
import { DISCORD_INVITE_URL } from '../../config/links';
import { useLanguage } from '../../i18n/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-bg-main border-t border-white/[0.06] py-14 text-left">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/[0.06]">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={fermiumLogo}
                alt="Fermium SMP"
                className="w-7 h-7 object-contain"
              />
              <span className="font-heading font-bold text-base text-text-primary">
                Fermium SMP
              </span>
            </div>
            <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
              {t.footer.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary mb-3.5">
              {t.footer.navigation}
            </h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <button
                  onClick={() => scrollTo('home')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t.nav.home}
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('about')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t.nav.about}
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('gallery')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t.nav.gallery}
                </button>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary mb-3.5">
              {t.footer.community}
            </h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <button
                  onClick={() => scrollTo('members')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t.nav.members}
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('projects')}
                  className="hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t.nav.projects}
                </button>
              </li>
              <li>
                <Link to="/timeline" className="hover:text-text-primary transition-colors">
                  {t.nav.timeline}
                </Link>
              </li>
              <li>
                <Link to="/hall-of-fame" className="hover:text-text-primary transition-colors">
                  {t.nav.hallOfFame}
                </Link>
              </li>
              <li>
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-orange hover:underline transition-colors"
                >
                  {t.nav.discord}
                </a>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary mb-3.5">
              {t.footer.tools}
            </h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link to="/world" className="hover:text-text-primary transition-colors">
                  {t.nav.worldMap}
                </Link>
              </li>
              <li>
                <Link to="/tools/storage" className="hover:text-text-primary transition-colors">
                  {t.nav.storage}
                </Link>
              </li>
              <li>
                <Link to="/tools/archive" className="hover:text-text-primary transition-colors">
                  {t.nav.archive}
                </Link>
              </li>
              <li>
                <Link to="/tools/status" className="hover:text-text-primary transition-colors">
                  {t.nav.status}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} Fermium SMP. {t.footer.rights}
          </div>
          <div className="text-center sm:text-right">{t.footer.disclaimer}</div>
        </div>
      </div>
    </footer>
  );
};
