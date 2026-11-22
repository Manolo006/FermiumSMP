import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Archive, Database, Grid3X3, Map, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const ToolsSubNav: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  const items = [
    {
      to: '/world',
      label: t.nav.worldMap,
      icon: Map,
      active: pathname === '/world',
    },
    {
      to: '/tools/status',
      label: t.nav.status,
      icon: Activity,
      active: pathname === '/tools/status',
    },
    {
      to: '/tools/enchanting',
      label: t.nav.enchanting,
      icon: Sparkles,
      active: pathname === '/tools/enchanting',
    },
    {
      to: '/tools/chunk-loader',
      label: t.nav.chunkLoader,
      icon: Grid3X3,
      active: pathname === '/tools/chunk-loader',
    },
    {
      to: '/tools/storage',
      label: t.nav.storage,
      icon: Database,
      active: pathname === '/tools/storage' || pathname === '/tools/calculators',
    },
    {
      to: '/tools/archive',
      label: t.nav.archive,
      icon: Archive,
      active: pathname === '/tools/archive',
    },
  ];

  // Auto-center active pill on narrow viewports so it is never clipped
  useEffect(() => {
    const scroller = scrollRef.current;
    const activeEl = activeLinkRef.current;
    if (!scroller || !activeEl) return;
    if (scroller.scrollWidth > scroller.clientWidth) {
      const targetLeft =
        activeEl.offsetLeft - scroller.clientWidth / 2 + activeEl.clientWidth / 2;
      scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: 'instant' });
    }
  }, [pathname]);

  return (
    <div className="mb-8 relative">
      <nav
        ref={scrollRef}
        aria-label={t.nav.tools}
        className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar"
      >
        <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-[#11161F]/85 border border-white/10 backdrop-blur-md min-w-max">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                ref={item.active ? activeLinkRef : undefined}
                to={item.to}
                aria-current={item.active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out-Quart active:scale-[0.97] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
                  item.active
                    ? 'bg-accent-cyan text-[#061018] font-semibold shadow-glow-cyan'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    item.active ? 'text-[#061018]' : 'text-accent-cyan'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
