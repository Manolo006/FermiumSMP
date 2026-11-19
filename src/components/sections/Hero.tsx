import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, Grid3X3, Map, MessageSquare, Sparkles } from 'lucide-react';
import fermiumLogo from '../../assets/logo/Fermium_logo.png';
import heroScreenshot from '../../assets/images/5.png';
import { DISCORD_INVITE_URL } from '../../config/links';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const Hero: React.FC = () => {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.from('.hero-anim', {
        opacity: 0,
        y: 18,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative min-h-screen pt-36 pb-20 sm:pt-44 sm:pb-28 flex flex-col items-center justify-center overflow-hidden ambient-hero-glow"
    >
      {/* Subtle Architectural Masked Grid & Restrained Vertical Cyan Hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 tech-grid-fade opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-px h-56 bg-gradient-to-b from-accent-cyan/60 via-accent-cyan/20 to-transparent"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10 w-full">
        {/* Logo in Frosted Glass Frame */}
        <div className="hero-anim mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel border-gradient-cyan p-3.5 flex items-center justify-center mx-auto">
            <img
              src={fermiumLogo}
              alt="Fermium SMP Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Pill Badge */}
        <div className="hero-anim mb-5">
          <Badge variant="cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            <span>{t.hero.tag}</span>
          </Badge>
        </div>

        {/* Main Headline */}
        <h1 className="hero-anim text-4xl sm:text-6xl md:text-7xl font-heading font-bold tracking-tight text-text-primary leading-[1.04] mb-6">
          {t.hero.titleLine1}{' '}
          <span className="text-accent-cyan">{t.hero.titleAccent}</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-anim max-w-2xl text-base sm:text-lg text-text-secondary leading-relaxed mb-8">
          {t.hero.description}
        </p>

        {/* CTA Buttons */}
        <div className="hero-anim flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-6">
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() =>
              document.getElementById('tools-hub')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="w-full sm:w-auto min-w-[195px]"
          >
            {t.hero.ctaPrimary}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={<MessageSquare className="w-4 h-4 text-accent-cyan" />}
            iconPosition="left"
            href={DISCORD_INVITE_URL}
            target="_blank"
            className="w-full sm:w-auto min-w-[195px]"
          >
            {t.hero.ctaSecondary}
          </Button>
        </div>

        {/* Direct Quick-Launch Tool Shortcuts */}
        <div className="hero-anim flex flex-wrap items-center justify-center gap-2 mb-14">
          <Link
            to="/world"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-text-secondary bg-white/[0.03] border border-white/[0.08] hover:border-accent-cyan/40 hover:text-accent-cyan transition-[color,border-color,background-color] duration-150"
          >
            <Map className="w-3.5 h-3.5 text-accent-cyan" />
            <span>{t.nav.worldMap}</span>
          </Link>
          <Link
            to="/tools/enchanting"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-text-secondary bg-white/[0.03] border border-white/[0.08] hover:border-accent-cyan/40 hover:text-accent-cyan transition-[color,border-color,background-color] duration-150"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            <span>{t.nav.enchanting}</span>
          </Link>
          <Link
            to="/tools/chunk-loader"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-text-secondary bg-white/[0.03] border border-white/[0.08] hover:border-accent-cyan/40 hover:text-accent-cyan transition-[color,border-color,background-color] duration-150"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-accent-cyan" />
            <span>{t.nav.chunkLoader}</span>
          </Link>
        </div>

        {/* Main Hero Showcase Frame (Concentric Radius: outer rounded-2xl p-2 -> inner rounded-xl) */}
        <div className="hero-anim w-full max-w-4xl mx-auto">
          <div className="glass-panel border-gradient-cyan rounded-2xl p-2 sm:p-2.5">
            <div className="aspect-[16/9] w-full rounded-xl overflow-hidden img-outline-dark relative bg-[#0E131B]">
              <img
                src={heroScreenshot}
                alt="Fermium SMP World Perimeter"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14]/65 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
