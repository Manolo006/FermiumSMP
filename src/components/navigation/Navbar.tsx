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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const communityTimeout = useRef<number | null>(null);
  const toolsTimeout = useRef<number | null>(null);
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  const isToolsRoute =
    location.pathname.startsWith('/tools') || location.pathname === '/world';
  const isHomeRoute = location.pathname === '/';

  // Scroll state & subtle reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 16);
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(1, Math.max(0, y / docHeight)) : 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Homepage active section scroll-spy
  useEffect(() => {
    if (!isHomeRoute) {
      setActiveSection('');
      return;
    }

    const sectionIds = ['home', 'about', 'tools-hub', 'members', 'live', 'projects', 'gallery'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: '-30% 0px -55% 0px', threshold: 0.01 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [isHomeRoute]);

  // Close menus on Escape or outside click
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCommunityOpen(false);
        setToolsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(e.target as Node)
      ) {
        setCommunityOpen(false);
        setToolsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setCommunityOpen(false);
    setToolsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setCommunityOpen(false);
    setToolsOpen(false);
    if (location.pathname !== '/') {
      window.location.hash = `#/`;
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navBtnClass = (isActive: boolean) =>
    `relative px-3.5 py-2 rounded-xl text-sm transition-[color,background-color] duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
      isActive
        ? 'text-accent-cyan bg-accent-cyan/[0.08] font-medium'
        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 pt-4">
      {/* Skip to content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-accent-cyan focus:text-[#061018] focus:font-heading focus:font-semibold focus:text-sm focus:shadow-glow-cyan"
      >
        {t.nav.skipToContent}
      </a>

      <div
        ref={navContainerRef}
        className={`relative max-w-6xl mx-auto rounded-2xl transition-[background-color,border-color,padding,box-shadow] duration-200 px-4 sm:px-6 ${
          mobileMenuOpen
            ? 'bg-[#0C1119]/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_56px_-12px_rgba(2,6,14,0.85)] py-3.5'
            : isScrolled
              ? 'glass-nav py-3'
              : 'bg-[#0B0F14]/70 backdrop-blur-md border border-white/[0.07] py-3.5'
        }`}
      >
        {/* Subtle Cyan Reading Progress Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-4 right-4 h-[1.5px] overflow-hidden rounded-full"
        >
          <div
            className="h-full bg-gradient-to-r from-accent-cyan-deep via-accent-cyan to-accent-cyan-hover origin-left transition-opacity duration-200"
            style={{
              transform: `scaleX(${scrollProgress})`,
              opacity: isScrolled && scrollProgress > 0.01 ? 0.85 : 0,
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            type="button"
            onClick={() => scrollToSection('home')}
            className="flex items-center gap-3 group cursor-pointer rounded-xl px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80"
          >
            <img
              src={fermiumLogo}
              alt="Fermium SMP"
              className="w-8 h-8 object-contain transition-transform duration-200 ease-out-Quart group-hover:scale-105"
            />
            <span className="font-heading font-bold text-base sm:text-lg tracking-tight text-text-primary">
              Fermium
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className={navBtnClass(isHomeRoute && activeSection === 'home')}
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className={navBtnClass(isHomeRoute && activeSection === 'about')}
            >
              {t.nav.about}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('gallery')}
              className={navBtnClass(isHomeRoute && activeSection === 'gallery')}
            >
              {t.nav.gallery}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('live')}
              className={navBtnClass(isHomeRoute && activeSection === 'live')}
            >
              {t.nav.live}
            </button>

            {/* Community Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (communityTimeout.current) clearTimeout(communityTimeout.current);
                setCommunityOpen(true);
                setToolsOpen(false);
              }}
              onMouseLeave={() => {
                communityTimeout.current = window.setTimeout(() => setCommunityOpen(false), 140);
              }}
            >
              <button
                type="button"
                aria-expanded={communityOpen}
                aria-haspopup="true"
                onClick={() => {
                  setCommunityOpen(!communityOpen);
                  setToolsOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-[color,background-color] duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
                  communityOpen || (isHomeRoute && (activeSection === 'members' || activeSection === 'projects'))
                    ? 'text-accent-cyan bg-accent-cyan/[0.08] font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <span>{t.nav.community}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    communityOpen ? 'rotate-180 text-accent-cyan' : ''
                  }`}
                />
              </button>

              {communityOpen && (
                <div className="absolute top-full left-0 w-64 pt-2 animate-dropdown-in">
                  <div className="glass-nav rounded-2xl p-2 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => scrollToSection('members')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.members}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.membersSub}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection('projects')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.projects}
                        </div>
                        <div className="text-xs text-text-secondary">{t.nav.projectsSub}</div>
                      </div>
                    </button>

                    <Link
                      to="/timeline"
                      onClick={() => setCommunityOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-secondary shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-heading font-medium text-text-primary">
                            {t.nav.timeline}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/[0.06] text-text-muted">
                            {t.nav.soon}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.timelineSub}</div>
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
                setCommunityOpen(false);
              }}
              onMouseLeave={() => {
                toolsTimeout.current = window.setTimeout(() => setToolsOpen(false), 140);
              }}
            >
              <button
                type="button"
                aria-expanded={toolsOpen}
                aria-haspopup="true"
                onClick={() => {
                  setToolsOpen(!toolsOpen);
                  setCommunityOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-[color,background-color] duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
                  toolsOpen || isToolsRoute || (isHomeRoute && activeSection === 'tools-hub')
                    ? 'text-accent-cyan bg-accent-cyan/[0.08] font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <span>{t.nav.tools}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    toolsOpen ? 'rotate-180 text-accent-cyan' : ''
                  }`}
                />
              </button>

              {toolsOpen && (
                <div className="absolute top-full left-0 w-72 pt-2 animate-dropdown-in">
                  <div className="glass-nav rounded-2xl p-2 space-y-0.5">
                    <Link
                      to="/world"
                      onClick={() => setToolsOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group ${
                        location.pathname === '/world' ? 'bg-accent-cyan/[0.08]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <Map className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.worldMap}
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.worldMapSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/enchanting"
                      onClick={() => setToolsOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group ${
                        location.pathname === '/tools/enchanting' ? 'bg-accent-cyan/[0.08]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.enchanting}
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.enchantingSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/chunk-loader"
                      onClick={() => setToolsOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group ${
                        location.pathname === '/tools/chunk-loader' ? 'bg-accent-cyan/[0.08]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <Grid3X3 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.chunkLoader}
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.chunkLoaderSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/storage"
                      onClick={() => setToolsOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group ${
                        location.pathname === '/tools/storage' ? 'bg-accent-cyan/[0.08]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.storage}
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.storageSub}</div>
                      </div>
                    </Link>

                    <Link
                      to="/tools/archive"
                      onClick={() => setToolsOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group ${
                        location.pathname === '/tools/archive' ? 'bg-accent-cyan/[0.08]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan shrink-0">
                        <Archive className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-heading font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {t.nav.archive}
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.archiveSub}</div>
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-heading font-medium text-text-primary">
                            {t.nav.status}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/[0.06] text-text-muted">
                            {t.nav.soon}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary truncate">{t.nav.statusSub}</div>
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
            <div
              role="group"
              aria-label="Language"
              className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10"
            >
              <button
                type="button"
                aria-pressed={lang === 'it'}
                onClick={() => setLang('it')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-[background-color,color] duration-150 cursor-pointer ${
                  lang === 'it'
                    ? 'bg-accent-cyan text-[#061018] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-[background-color,color] duration-150 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-accent-cyan text-[#061018] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                EN
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />}
              iconPosition="left"
              href={DISCORD_INVITE_URL}
              target="_blank"
            >
              {t.nav.discord}
            </Button>
          </div>

          {/* Mobile Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <div
              role="group"
              aria-label="Language"
              className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/10"
            >
              <button
                type="button"
                aria-pressed={lang === 'it'}
                onClick={() => setLang('it')}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium cursor-pointer ${
                  lang === 'it' ? 'bg-accent-cyan text-[#061018] font-semibold' : 'text-text-secondary'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium cursor-pointer ${
                  lang === 'en' ? 'bg-accent-cyan text-[#061018] font-semibold' : 'text-text-secondary'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-text-secondary hover:text-white cursor-pointer active:scale-[0.96] transition-[transform,color]"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-1 pb-2 max-h-[75vh] overflow-y-auto animate-dropdown-in">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.about}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('members')}
              className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.members}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('live')}
              className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.live}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('projects')}
              className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.projects}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('gallery')}
              className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05]"
            >
              {t.nav.gallery}
            </button>

            <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
              <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                {t.nav.tools}
              </div>
              <Link
                to="/world"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-accent-cyan hover:bg-white/[0.05]"
              >
                <Map className="w-4 h-4 text-accent-cyan" />
                <span>{t.nav.worldMap}</span>
              </Link>
              <Link
                to="/tools/enchanting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-accent-cyan hover:bg-white/[0.05]"
              >
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <span>{t.nav.enchanting}</span>
              </Link>
              <Link
                to="/tools/chunk-loader"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-accent-cyan hover:bg-white/[0.05]"
              >
                <Grid3X3 className="w-4 h-4 text-accent-cyan" />
                <span>{t.nav.chunkLoader}</span>
              </Link>
              <Link
                to="/tools/storage"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-accent-cyan hover:bg-white/[0.05]"
              >
                <Database className="w-4 h-4 text-accent-cyan" />
                <span>{t.nav.storage}</span>
              </Link>
              <Link
                to="/tools/archive"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-accent-cyan hover:bg-white/[0.05]"
              >
                <Archive className="w-4 h-4 text-accent-cyan" />
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
