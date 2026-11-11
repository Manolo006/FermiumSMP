import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Box, Download, FileCode2, Maximize2, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';

interface SchematicItem {
  id?: string;
  name: string;
  author?: string;
  category?: string;
  dimensions?: string;
  blocks?: number;
  size?: string;
  format?: string;
  description?: string;
  fileName?: string;
  fileUrl?: string;
  url?: string;
}

export const ArchivePage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const [schematics, setSchematics] = useState<SchematicItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetch(`./schematics.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSchematics(
            data.filter((item) => item && item.name && (item.fileUrl || item.url))
          );
        }
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    schematics.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return ['ALL', ...Array.from(cats)];
  }, [schematics]);

  const filteredSchematics = useMemo(() => {
    return schematics.filter((item) => {
      const matchesCat =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const hay = `${item.name} ${item.author || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase();
      return matchesCat && hay.includes(q);
    });
  }, [schematics, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl text-left">
            <div className="mb-3">
              <Badge variant="orange">Fermium SMP • Litematica</Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {isIt ? 'Archivio ' : 'Schematics '}
              <span className="text-accent-orange">Schematics</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {isIt
                ? 'Raccolta ufficiale delle schematics .litematic sincronizzate dal server Fermium SMP (World Eater, Trencher, Perimeter Tech e Storage).'
                : 'Official collection of .litematic schematics synced from the Fermium SMP server (World Eaters, Trenchers, Perimeter Tech, and Storage).'}
            </p>
          </div>

          {schematics.length > 0 && (
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isIt ? 'Cerca schematic o autore...' : 'Search schematic or author...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/60 transition-colors"
              />
            </div>
          )}
        </div>

        {categories.length > 2 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              const label = cat === 'ALL' ? (isIt ? 'Tutte (' + schematics.length + ')' : 'All (' + schematics.length + ')') : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all ${
                    active
                      ? 'bg-accent-orange text-[#101216] border-accent-orange font-bold shadow-[0_0_20px_rgba(240,136,50,0.3)]'
                      : 'bg-white/[0.03] text-text-secondary border-white/10 hover:border-white/25 hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {filteredSchematics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchematics.map((item, idx) => {
              const href = item.fileUrl || item.url || '#';
              return (
                <div
                  key={item.id || idx}
                  className="glass-panel rounded-2xl p-5 flex flex-col justify-between text-left hover:border-accent-orange/35 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/25 flex items-center justify-center text-accent-orange group-hover:scale-105 transition-transform">
                        <FileCode2 className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        {item.size && (
                          <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/10">
                            {item.size}
                          </span>
                        )}
                        {item.category && <Badge variant="neutral">{item.category}</Badge>}
                      </div>
                    </div>

                    <h3 className="text-lg font-heading font-bold text-text-primary mb-1 group-hover:text-accent-orange transition-colors">
                      {item.name}
                    </h3>
                    {item.author && (
                      <span className="text-xs font-mono text-accent-orange block mb-3">
                        by {item.author}
                      </span>
                    )}
                    {item.description && (
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                        {item.description}
                      </p>
                    )}

                    {(item.dimensions || item.blocks) && (
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 mb-2">
                        {item.dimensions && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
                            <Maximize2 className="w-3.5 h-3.5 text-accent-orange shrink-0" />
                            <span className="truncate">{item.dimensions}</span>
                          </div>
                        )}
                        {typeof item.blocks === 'number' && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
                            <Box className="w-3.5 h-3.5 text-accent-orange shrink-0" />
                            <span>
                              {item.blocks.toLocaleString('it-IT')}{' '}
                              {isIt ? 'blocchi' : 'blocks'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <a
                    href={href}
                    download={item.fileName || true}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-orange text-[#101216] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-orange-hover transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isIt ? 'Scarica .litematic' : 'Download .litematic'}
                    </span>
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-10 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-accent-orange mx-auto mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-text-primary mb-2">
              {isIt ? 'Nessuna schematic trovata' : 'No schematic found'}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {isIt
                ? 'Prova a cambiare categoria o termine di ricerca.'
                : 'Try changing the category or search query.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
