import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Box,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode2,
  Images,
  Maximize2,
  Search,
  X,
  ZoomIn,
} from 'lucide-react';
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
  image?: string;
  imageUrl?: string;
  images?: string[];
  fileName?: string;
  fileUrl?: string;
  url?: string;
}

interface LightboxState {
  item: SchematicItem;
  images: string[];
  index: number;
}

function getSchematicImages(item: SchematicItem): string[] {
  const candidates = [
    item.image,
    item.imageUrl,
    ...(Array.isArray(item.images) ? item.images : []),
  ];
  const unique = new Set<string>();
  for (const src of candidates) {
    if (typeof src === 'string') {
      const trimmed = src.trim();
      if (!trimmed) continue;
      unique.add(trimmed.startsWith('schematics/') ? `./${trimmed}` : trimmed);
    }
  }
  return Array.from(unique);
}

interface SchematicCardProps {
  item: SchematicItem;
  isIt: boolean;
  onOpenLightbox: (item: SchematicItem, images: string[], index: number) => void;
}

const SchematicCard: React.FC<SchematicCardProps> = ({
  item,
  isIt,
  onOpenLightbox,
}) => {
  const images = useMemo(() => getSchematicImages(item), [item]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const validImages = useMemo(
    () => images.filter((src) => !failedUrls[src]),
    [images, failedUrls]
  );

  const safeIdx = validImages.length > 0 ? activeIdx % validImages.length : 0;
  const activeSrc = validImages[safeIdx];
  const href = item.fileUrl || item.url || '#';

  const stepImage = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (validImages.length <= 1) return;
    setActiveIdx((prev) => (prev + delta + validImages.length) % validImages.length);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between text-left hover:border-accent-orange/35 transition-all group">
      <div>
        {activeSrc ? (
          <div
            onClick={() => onOpenLightbox(item, validImages, safeIdx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenLightbox(item, validImages, safeIdx);
              }
            }}
            className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-white/10 mb-4 relative bg-[#12151B] cursor-pointer group/preview focus:outline-none focus:ring-2 focus:ring-accent-orange/60"
          >
            <img
              src={activeSrc}
              alt={item.name}
              loading="lazy"
              onError={() =>
                setFailedUrls((prev) => ({ ...prev, [activeSrc]: true }))
              }
              className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#101216]/80 via-transparent to-[#101216]/35 pointer-events-none" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5">
                {item.category && <Badge variant="neutral">{item.category}</Badge>}
              </div>
              <div className="flex items-center gap-1.5">
                {validImages.length > 1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white px-2 py-0.5 rounded-md bg-[#101216]/80 backdrop-blur-md border border-white/15">
                    <Images className="w-3 h-3 text-accent-orange" />
                    {safeIdx + 1}/{validImages.length}
                  </span>
                )}
                {item.size && (
                  <span className="text-[11px] font-mono text-white/90 px-2 py-0.5 rounded-md bg-[#101216]/80 backdrop-blur-md border border-white/15">
                    {item.size}
                  </span>
                )}
              </div>
            </div>

            {/* Carousel Controls inside Preview if Multiple Images */}
            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => stepImage(e, -1)}
                  aria-label={isIt ? 'Immagine precedente' : 'Previous image'}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#101216]/75 border border-white/15 text-white/85 hover:text-white hover:border-accent-orange/60 opacity-0 group-hover/preview:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => stepImage(e, 1)}
                  aria-label={isIt ? 'Immagine successiva' : 'Next image'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#101216]/75 border border-white/15 text-white/85 hover:text-white hover:border-accent-orange/60 opacity-0 group-hover/preview:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Zoom Hint */}
            <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-[#101216]/75 border border-white/15 text-white/80 opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
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
        )}

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

        {(item.dimensions || typeof item.blocks === 'number') && (
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
};

interface SchematicLightboxProps {
  state: LightboxState | null;
  isIt: boolean;
  onClose: () => void;
  onChangeIndex: (newIdx: number) => void;
}

const SchematicLightbox: React.FC<SchematicLightboxProps> = ({
  state,
  isIt,
  onClose,
  onChangeIndex,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!state) return;
      if (e.key === 'Escape') onClose();
      if (state.images.length > 1) {
        if (e.key === 'ArrowRight') {
          onChangeIndex((state.index + 1) % state.images.length);
        }
        if (e.key === 'ArrowLeft') {
          onChangeIndex(
            (state.index - 1 + state.images.length) % state.images.length
          );
        }
      }
    },
    [state, onClose, onChangeIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    if (state) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [state, handleKeyDown]);

  if (!state) return null;

  const { item, images, index } = state;
  const currentSrc = images[index];
  const href = item.fileUrl || item.url || '#';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0D10]/92 backdrop-blur-2xl p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-20 pointer-events-none">
        <span className="px-3.5 py-1.5 rounded-full glass-panel text-xs font-mono text-text-secondary pointer-events-auto">
          {index + 1} / {images.length}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={isIt ? 'Chiudi anteprima' : 'Close preview'}
          className="pointer-events-auto p-2.5 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((index - 1 + images.length) % images.length);
            }}
            aria-label={isIt ? 'Precedente' : 'Previous'}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIndex((index + 1) % images.length);
            }}
            aria-label={isIt ? 'Successiva' : 'Next'}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Modal Content */}
      <div
        className="relative w-full max-w-5xl z-10 glass-panel rounded-2xl p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full rounded-xl overflow-hidden bg-[#0B0D10] flex items-center justify-center">
          <img
            src={currentSrc}
            alt={item.name}
            className="max-h-[70vh] w-full object-contain"
          />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-heading font-bold text-text-primary">
                {item.name}
              </h3>
              {item.category && <Badge variant="neutral">{item.category}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-text-secondary">
              {item.author && <span className="text-accent-orange">by {item.author}</span>}
              {item.dimensions && <span>{item.dimensions}</span>}
              {typeof item.blocks === 'number' && (
                <span>
                  {item.blocks.toLocaleString('it-IT')}{' '}
                  {isIt ? 'blocchi' : 'blocks'}
                </span>
              )}
              {item.size && <span>{item.size}</span>}
            </div>
          </div>

          <a
            href={href}
            download={item.fileName || true}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-orange text-[#101216] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-orange-hover transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isIt ? 'Scarica .litematic' : 'Download .litematic'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export const ArchivePage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const [schematics, setSchematics] = useState<SchematicItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

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
              const label =
                cat === 'ALL'
                  ? isIt
                    ? 'Tutte (' + schematics.length + ')'
                    : 'All (' + schematics.length + ')'
                  : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer ${
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
            {filteredSchematics.map((item, idx) => (
              <SchematicCard
                key={item.id || idx}
                item={item}
                isIt={isIt}
                onOpenLightbox={(targetItem, images, index) =>
                  setLightbox({ item: targetItem, images, index })
                }
              />
            ))}
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

      <SchematicLightbox
        state={lightbox}
        isIt={isIt}
        onClose={() => setLightbox(null)}
        onChangeIndex={(newIdx) =>
          setLightbox((prev) => (prev ? { ...prev, index: newIdx } : null))
        }
      />
    </div>
  );
};
