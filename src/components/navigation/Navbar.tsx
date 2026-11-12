import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Menu,
  X,
  Users,
  FolderGit2,
  History,
  Map,
  Database,
  Grid3X3,
  Sparkles,
  Archive,
  Activity,
  MessageSquare,
} from 'lucide-react';
import fermiumLogo from '../../assets/logo/Fermium_logo.png';
import { DISCORD_INVITE_URL } from '../../config/links';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const communityTimeout = useRef<number | null>(null);
  const toolsTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setCommunityOpen(false);
    setToolsOpen(false);
    if (location.pathname !== '/') {
      window.location.hash = `#/`;
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 pt-4 transition-all duration-200">
      <div
        className={`max-w-6xl mx-auto rounded-2xl transition-all duration-200 px-4 sm:px-6 ${
          isScrolled ? 'glass-nav py-3' : 'bg-[#101216]/60 backdrop-blur-md border border-white/[0.06] py-3.5'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('home')}
            className="flex items-center gap-3 group cursor-pointer focus:outline-none"
          >
            <img
              src={fermiumLogo}
              alt="Fermium SMP"
              className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-heading font-bold text-base sm:text-lg tracking-tight text-text-primary">
              Fermium
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => scrollToSection('home')}
              className="px-3.5 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {t.nav.home}
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="px-3.5 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {t.nav.about}
            </button>
            <button
              onClick={() => scrollToSection('gallery')}
              className="px-3.5 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {t.nav.gallery}
            </button>
            <button
              onClick={() => scrollToSection('live')}
              className="px-3.5 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {t.nav.live}
            </button>

            {/* Community Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (communityTimeout.current) clearTimeout(communityTimeout.current);
                setCommunityOpen(true);
              }}
              onMouseLeave={() => {
                communityTimeout.current = window.setTimeout(() => setCommunityOpen(false), 140);
              }}
            >
              <button
                onClick={() => setCommunityOpen(!communityOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                  communityOpen
                    ? 'text-text-primary bg-white/[0.05]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <span>{t.nav.community}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    communityOpen ? 'rotate-180 text-accent-orange' : ''
                  }`}
                />
              </button>

              {communityOpen && (
                <div className="absolute top-full left-0 w-64 pt-2">
                  <div className="glass-nav rounded-2xl p-2 space-y-0.5">
                    <button
                      onClick={() => scrollToSection('members')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                          {t.nav.members}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.membersSub}</div>
                      </div>
                    </button>

                    <button
                      onClick={() => scrollToSection('projects')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                          {t.nav.projects}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.projectsSub}</div>
                      </div>
                    </button>

                    <Link
                      to="/timeline"
                      onClick={() => setCommunityOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-secondary shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary">
                          {t.nav.timeline}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.timelineSub}</div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (toolsTimeout.current) clearTimeout(toolsTimeout.current);
                setToolsOpen(true);
              }}
              onMouseLeave={() => {
                toolsTimeout.current = window.setTimeout(() => setToolsOpen(false), 140);
              }}
            >
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                  toolsOpen
                    ? 'text-text-primary bg-white/[0.05]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <span>{t.nav.tools}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    toolsOpen ? 'rotate-180 text-accent-orange' : ''
                  }`}
                />
              </button>

              {toolsOpen && (
                <div className="absolute top-full left-0 w-64 pt-2">
                  <div className="glass-nav rounded-2xl p-2 space-y-0.5">
                    <Link
                      to="/world"
                      onClick={() => setToolsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-secondary shrink-0">
                        <Map className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary">
                          {t.nav.worldMap}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.worldMapSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/storage"
                      onClick={() => setToolsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                          {t.nav.storage}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.storageSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/chunk-loader"
                      onClick={() => setToolsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                        <Grid3X3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                          {t.nav.chunkLoader}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.chunkLoaderSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/enchanting"
                      onClick={() => setToolsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                          {t.nav.enchanting}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.enchantingSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/archive"
                      onClick={() => setToolsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                        <Archive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                          {t.nav.archive}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.archiveSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/status"
                      onClick={() => setToolsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-secondary shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary">
                          {t.nav.status}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.statusSub}</div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Controls: Language Switcher & Discord */}
          <div className="hidden lg:flex items-center gap-3">
            {/* IT / EN Switcher */}
            <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                onClick={() => setLang('it')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  lang === 'it'
                    ? 'bg-accent-orange text-[#101216] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                IT
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-accent-orange text-[#101216] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                EN
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquare className="w-3.5 h-3.5 text-accent-orange" />}
              iconPosition="left"
              href={DISCORD_INVITE_URL}
              target="_blank"
            >
              {t.nav.discord}
            </Button>
          </div>

          {/* Mobile Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/10">
              <button
                onClick={() => setLang('it')}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium cursor-pointer ${
                  lang === 'it' ? 'bg-accent-orange text-[#101216] font-semibold' : 'text-text-secondary'
                }`}
              >
                IT
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium cursor-pointer ${
                  lang === 'en' ? 'bg-accent-orange text-[#101216] font-semibold' : 'text-text-secondary'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-1 pb-2">
            <button
              onClick={() => scrollToSection('home')}
              className="block w-full text-left px-3 py-2 rounded-xl text-sm text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.home}
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.about}
            </button>
            <button
              onClick={() => scrollToSection('members')}
              className="block w-full text-left px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.members}
            </button>
            <button
              onClick={() => scrollToSection('projects')}
              className="block w-full text-left px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.projects}
            </button>
            <button
              onClick={() => scrollToSection('gallery')}
              className="block w-full text-left px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.gallery}
            </button>
            <button
              onClick={() => scrollToSection('live')}
              className="block w-full text-left px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.live}
            </button>

            <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
              <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                {t.nav.tools}
              </div>
              <Link
                to="/tools/storage"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-accent-orange hover:bg-white/[0.05]"
              >
                <Database className="w-4 h-4 text-accent-orange" />
                <span>{t.nav.storage}</span>
              </Link>
              <Link
                to="/tools/chunk-loader"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-accent-orange hover:bg-white/[0.05]"
              >
                <Grid3X3 className="w-4 h-4 text-accent-orange" />
                <span>{t.nav.chunkLoader}</span>
              </Link>
              <Link
                to="/tools/enchanting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-accent-orange hover:bg-white/[0.05]"
              >
                <Sparkles className="w-4 h-4 text-accent-orange" />
                <span>{t.nav.enchanting}</span>
              </Link>
              <Link
                to="/tools/archive"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-accent-orange hover:bg-white/[0.05]"
              >
                <Archive className="w-4 h-4 text-accent-orange" />
                <span>{t.nav.archive}</span>
              </Link>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                iconPosition="left"
                href={DISCORD_INVITE_URL}
                target="_blank"
              >
                {t.nav.discord}
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
