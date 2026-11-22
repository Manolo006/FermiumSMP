import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Archive,
  ArrowUpRight,
  Database,
  Grid3X3,
  Map,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';

export const ToolsShowcase: React.FC = () => {
  const { t } = useLanguage();
  const copy = t.toolsShowcase;

  const tools = [
    {
      key: 'worldMap',
      to: '/world',
      icon: Map,
      featured: true,
      data: copy.items.worldMap,
    },
    {
      key: 'status',
      to: '/tools/status',
      icon: Activity,
      featured: true,
      data: copy.items.status,
    },
    {
      key: 'enchanting',
      to: '/tools/enchanting',
      icon: Sparkles,
      featured: false,
      data: copy.items.enchanting,
    },
    {
      key: 'chunkLoader',
      to: '/tools/chunk-loader',
      icon: Grid3X3,
      featured: false,
      data: copy.items.chunkLoader,
    },
    {
      key: 'storage',
      to: '/tools/storage',
      icon: Database,
      featured: false,
      data: copy.items.storage,
    },
    {
      key: 'archive',
      to: '/tools/archive',
      icon: Archive,
      featured: false,
      data: copy.items.archive,
    },
  ];

  return (
    <section
      id="tools-hub"
      className="relative py-24 sm:py-28 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl text-left mb-12">
          <div className="mb-3">
            <Badge variant="cyan">{copy.tag}</Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
            {copy.title}{' '}
            <span className="text-accent-cyan">{copy.titleAccent}</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        {/* Balanced 6-Card Suite Grid (2 Featured Cyan Highlighted + 4 Standard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.key}
                to={tool.to}
                className={`group glass-panel hover-lift rounded-2xl p-6 text-left flex flex-col justify-between relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
                  tool.featured
                    ? 'border-gradient-cyan'
                    : 'hover:border-accent-cyan/35'
                }`}
              >
                {/* Quiet corner cyan bloom on hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-accent-cyan/[0.07] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />

                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan group-hover:bg-accent-cyan group-hover:text-[#061018] transition-[background-color,color] duration-200">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/[0.04] border border-white/10 text-text-secondary group-hover:border-accent-cyan/30 group-hover:text-accent-cyan transition-colors">
                      {tool.data.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-heading font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-2">
                    {tool.data.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {tool.data.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-text-secondary group-hover:text-accent-cyan transition-colors">
                  <span>{copy.openTool}</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-200 ease-out-Quart group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
