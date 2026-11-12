import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Box,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileCode2,
  Image as ImageIcon,
  Images,
  Layers,
  Maximize2,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';
import {
  parseLitematicFromUrl,
  type ParsedLitematic,
} from '../utils/litematicParser';
import {
  getAutoIsometricPreviewUrl,
  renderLitematicToCanvas,
  type IsoRotation,
} from '../utils/litematicIsometric';
import { ensureMinecraftTextures } from '../utils/litematicTextures';

interface SchematicItem {
  id?: string;
  name: string;
  author?: string;
  origin?: 'fermium' | 'external';
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
  manualImages: string[];
  index: number;
  mode: 'iso' | 'photo';
}

function getManualImages(item: SchematicItem): string[] {
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

function isLitematicFile(url: string): boolean {
  return url.toLowerCase().split('?')[0].endsWith('.litematic');
}

interface SchematicCardProps {
  item: SchematicItem;
  isIt: boolean;
  onOpenLightbox: (
    item: SchematicItem,
    manualImages: string[],
    index: number,
    mode: 'iso' | 'photo'
  ) => void;
}

const SchematicCard: React.FC<SchematicCardProps> = ({
  item,
  isIt,
  onOpenLightbox,
}) => {
  const manualImages = useMemo(() => getManualImages(item), [item]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [autoIsoUrl, setAutoIsoUrl] = useState<string>('');
  const [isoLoading, setIsoLoading] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const validManual = useMemo(
    () => manualImages.filter((src) => !failedUrls[src]),
    [manualImages, failedUrls]
  );

  const href = item.fileUrl || item.url || '#';
  const canAutoRender = validManual.length === 0 && isLitematicFile(href);

  // Lazy-trigger isometric generation only when card enters viewport
  useEffect(() => {
    if (!canAutoRender || isVisible) return;
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canAutoRender, isVisible]);

  useEffect(() => {
    if (!canAutoRender || !isVisible) return;
    let cancelled = false;
    setIsoLoading(true);
    getAutoIsometricPreviewUrl(href, parseLitematicFromUrl, 0)
      .then((url) => {
        if (!cancelled && url) setAutoIsoUrl(url);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAutoRender, isVisible, href]);

  const hasPhotoGallery = validManual.length > 0;
  const safeIdx = hasPhotoGallery ? activeIdx % validManual.length : 0;
  const displaySrc = hasPhotoGallery ? validManual[safeIdx] : autoIsoUrl;
  const clickMode: 'iso' | 'photo' = hasPhotoGallery ? 'photo' : 'iso';

  const stepImage = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (validManual.length <= 1) return;
    setActiveIdx((prev) => (prev + delta + validManual.length) % validManual.length);
  };

  return (
    <div
      ref={cardRef}
      className="glass-panel rounded-2xl p-5 flex flex-col justify-between text-left hover:border-accent-orange/35 transition-all group"
    >
      <div>
        {displaySrc ? (
          <div
            onClick={() => onOpenLightbox(item, validManual, safeIdx, clickMode)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenLightbox(item, validManual, safeIdx, clickMode);
              }
            }}
            className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-white/10 mb-4 relative bg-[#0D1015] cursor-pointer group/preview focus:outline-none focus:ring-2 focus:ring-accent-orange/60"
          >
            <img
              src={displaySrc}
              alt={item.name}
              loading="lazy"
              onError={() => {
                if (hasPhotoGallery) {
                  setFailedUrls((prev) => ({ ...prev, [displaySrc]: true }));
                }
              }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#101216]/75 via-transparent to-[#101216]/25 pointer-events-none" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5">
                {item.category && <Badge variant="neutral">{item.category}</Badge>}
              </div>
              <div className="flex items-center gap-1.5">
                {hasPhotoGallery && validManual.length > 1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white px-2 py-0.5 rounded-md bg-[#101216]/80 backdrop-blur-md border border-white/15">
                    <Images className="w-3 h-3 text-accent-orange" />
                    {safeIdx + 1}/{validManual.length}
                  </span>
                )}
                {!hasPhotoGallery && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-300 px-2 py-0.5 rounded-md bg-[#101216]/85 backdrop-blur-md border border-sky-400/25">
                    ISO 3D
                  </span>
                )}
                {item.size && (
                  <span className="text-[11px] font-mono text-white/90 px-2 py-0.5 rounded-md bg-[#101216]/80 backdrop-blur-md border border-white/15">
                    {item.size}
                  </span>
                )}
              </div>
            </div>

            {hasPhotoGallery && validManual.length > 1 && (
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
            <div className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#101216]/80 border border-white/15 text-[11px] font-mono text-white/85 opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5 text-accent-orange" />
              <span>{hasPhotoGallery ? (isIt ? 'Ingrandisci' : 'Zoom') : (isIt ? 'Vista 3D' : '3D View')}</span>
            </div>
          </div>
        ) : isoLoading ? (
          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-white/10 mb-4 relative bg-[#0D1015] flex flex-col items-center justify-center gap-2">
            <Box className="w-6 h-6 text-accent-orange animate-pulse" />
            <span className="text-[11px] font-mono text-text-muted">
              {isIt ? 'Rendering isometrico...' : 'Rendering isometric view...'}
            </span>
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
  onChangeState: (updater: (prev: LightboxState) => LightboxState) => void;
}

const ROTATION_LABELS = ['SE', 'SW', 'NW', 'NE'] as const;

const SchematicLightbox: React.FC<SchematicLightboxProps> = ({
  state,
  isIt,
  onClose,
  onChangeState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  const [rotation, setRotation] = useState<IsoRotation>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sliceY, setSliceY] = useState<number | null>(null);
  const [parsed, setParsed] = useState<ParsedLitematic | null>(null);

  const href = state ? state.item.fileUrl || state.item.url || '#' : '';
  const hasLitematic = state ? isLitematicFile(href) : false;

  // Reset camera controls when opening a different schematic
  useEffect(() => {
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliceY(null);
    setParsed(null);
  }, [state?.item.id, state?.item.name]);

  // Parse .litematic and ensure real Minecraft textures are loaded when opening Lightbox
  useEffect(() => {
    if (!state || state.mode !== 'iso' || !hasLitematic) return;
    let cancelled = false;
    parseLitematicFromUrl(href)
      .then(async (res) => {
        await ensureMinecraftTextures(res.paletteStyles);
        if (!cancelled) {
          setParsed(res);
          setSliceY(res.sizeY - 1);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state?.mode, hasLitematic, href]);

  // Re-render interactive canvas whenever parsed data, rotation, zoom, pan, or Y slice changes
  useEffect(() => {
    if (!state || state.mode !== 'iso' || !parsed || !canvasRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const w = Math.max(640, Math.round(rect?.width || 960));
    const h = Math.max(400, Math.round(rect?.height || 560));
    renderLitematicToCanvas(canvasRef.current, parsed, {
      width: w,
      height: h,
      rotation,
      zoom,
      panX: pan.x,
      panY: pan.y,
      maxY: sliceY ?? parsed.sizeY - 1,
      showWireframe: true,
    });
  }, [state?.mode, parsed, rotation, zoom, pan, sliceY]);

  // Mouse wheel zoom inside interactive isometric viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !state || state.mode !== 'iso') return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      setZoom((z) => {
        const next = Math.min(12, Math.max(0.5, z * factor));
        return Number(next.toFixed(2));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [state?.mode, parsed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!state) return;
      if (e.key === 'Escape') onClose();
      if (state.mode === 'photo' && state.manualImages.length > 1) {
        if (e.key === 'ArrowRight') {
          onChangeState((prev) => ({
            ...prev,
            index: (prev.index + 1) % prev.manualImages.length,
          }));
        }
        if (e.key === 'ArrowLeft') {
          onChangeState((prev) => ({
            ...prev,
            index:
              (prev.index - 1 + prev.manualImages.length) %
              prev.manualImages.length,
          }));
        }
      } else if (state.mode === 'iso') {
        if (e.key === 'ArrowRight') {
          setRotation((r) => ((r + 1) % 4) as IsoRotation);
        }
        if (e.key === 'ArrowLeft') {
          setRotation((r) => ((r + 3) % 4) as IsoRotation);
        }
      }
    },
    [state, onClose, onChangeState]
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

  const { item, manualImages, index, mode } = state;
  const currentPhotoSrc = manualImages[index];

  const handleSavePng = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    const baseName = (item.fileName || item.name).replace(/\.litematic$/i, '');
    link.download = `${baseName}_iso_${ROTATION_LABELS[rotation]}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0D10]/92 backdrop-blur-2xl p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {hasLitematic && manualImages.length > 0 && (
            <div className="inline-flex items-center p-1 rounded-xl glass-panel">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeState((prev) => ({ ...prev, mode: 'iso' }));
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                  mode === 'iso'
                    ? 'bg-accent-orange text-[#101216] font-bold'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                ISO 3D
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeState((prev) => ({ ...prev, mode: 'photo' }));
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                  mode === 'photo'
                    ? 'bg-accent-orange text-[#101216] font-bold'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {isIt ? 'Foto' : 'Photos'}
              </button>
            </div>
          )}

          {mode === 'photo' && (
            <span className="px-3.5 py-1.5 rounded-full glass-panel text-xs font-mono text-text-secondary">
              {index + 1} / {manualImages.length}
            </span>
          )}
        </div>

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

      {/* Photo Navigation Arrows */}
      {mode === 'photo' && manualImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeState((prev) => ({
                ...prev,
                index:
                  (prev.index - 1 + prev.manualImages.length) %
                  prev.manualImages.length,
              }));
            }}
            aria-label={isIt ? 'Precedente' : 'Previous'}
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeState((prev) => ({
                ...prev,
                index: (prev.index + 1) % prev.manualImages.length,
              }));
            }}
            aria-label={isIt ? 'Successiva' : 'Next'}
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Dialog Card */}
      <div
        className="relative w-full max-w-5xl z-10 glass-panel rounded-2xl p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === 'iso' ? (
          <div>
            <div
              ref={containerRef}
              onMouseDown={(e) => {
                dragRef.current = { active: true, x: e.clientX, y: e.clientY };
              }}
              onMouseMove={(e) => {
                if (!dragRef.current.active) return;
                const dx = e.clientX - dragRef.current.x;
                const dy = e.clientY - dragRef.current.y;
                dragRef.current.x = e.clientX;
                dragRef.current.y = e.clientY;
                setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
              }}
              onMouseUp={() => {
                dragRef.current.active = false;
              }}
              onMouseLeave={() => {
                dragRef.current.active = false;
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  dragRef.current = {
                    active: true,
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                  };
                }
              }}
              onTouchMove={(e) => {
                if (!dragRef.current.active || e.touches.length !== 1) return;
                const dx = e.touches[0].clientX - dragRef.current.x;
                const dy = e.touches[0].clientY - dragRef.current.y;
                dragRef.current.x = e.touches[0].clientX;
                dragRef.current.y = e.touches[0].clientY;
                setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
              }}
              onTouchEnd={() => {
                dragRef.current.active = false;
              }}
              className="w-full h-[54vh] sm:h-[62vh] rounded-xl overflow-hidden bg-[#0D1015] border border-white/10 relative select-none touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              {parsed ? (
                <canvas ref={canvasRef} className="w-full h-full block" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Box className="w-8 h-8 text-accent-orange animate-pulse" />
                  <span className="text-xs font-mono">
                    {isIt
                      ? 'Generazione vista isometrica da .litematic...'
                      : 'Generating isometric view from .litematic...'}
                  </span>
                </div>
              )}

              {/* Isometric Controls Bar */}
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
              >
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#101216]/85 backdrop-blur-md border border-white/15 pointer-events-auto">
                  {ROTATION_LABELS.map((label, rIdx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRotation(rIdx as IsoRotation)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-colors ${
                        rotation === rIdx
                          ? 'bg-accent-orange text-[#101216] font-bold'
                          : 'text-text-secondary hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRotation((r) => ((r + 1) % 4) as IsoRotation)}
                    title={isIt ? 'Ruota 90°' : 'Rotate 90°'}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-white cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {parsed && parsed.sizeY > 1 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101216]/85 backdrop-blur-md border border-white/15 pointer-events-auto">
                    <Layers className="w-3.5 h-3.5 text-accent-orange shrink-0" />
                    <span className="text-[11px] font-mono text-text-secondary">Y</span>
                    <input
                      type="range"
                      min={0}
                      max={parsed.sizeY - 1}
                      value={sliceY ?? parsed.sizeY - 1}
                      onChange={(e) => setSliceY(Number(e.target.value))}
                      className="w-24 sm:w-32 accent-[#F08832] cursor-pointer"
                      aria-label="Layer height slice"
                    />
                    <span className="text-[11px] font-mono text-text-primary min-w-[44px] text-right">
                      {(sliceY ?? parsed.sizeY - 1) + 1}/{parsed.sizeY}
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#101216]/85 backdrop-blur-md border border-white/15 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z / 1.4).toFixed(2))))}
                    aria-label="Zoom out"
                    className="p-1.5 rounded-lg text-text-secondary hover:text-white cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[11px] font-mono text-text-primary">
                    {zoom.toFixed(1)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(12, Number((z * 1.4).toFixed(2))))}
                    aria-label="Zoom in"
                    className="p-1.5 rounded-lg text-text-secondary hover:text-white cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                      if (parsed) setSliceY(parsed.sizeY - 1);
                    }}
                    title="Reset"
                    className="p-1.5 rounded-lg text-text-secondary hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-xl overflow-hidden bg-[#0B0D10] flex items-center justify-center">
            <img
              src={currentPhotoSrc}
              alt={item.name}
              className="max-h-[68vh] w-full object-contain"
            />
          </div>
        )}

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

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {mode === 'iso' && parsed && (
              <button
                type="button"
                onClick={handleSavePng}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-text-primary hover:border-accent-orange/60 font-heading font-medium text-xs sm:text-sm transition-all cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-accent-orange" />
                <span>{isIt ? 'Salva PNG' : 'Save PNG'}</span>
              </button>
            )}

            <a
              href={href}
              download={item.fileName || true}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-orange text-[#101216] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-orange-hover transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isIt ? 'Scarica .litematic' : 'Download .litematic'}</span>
            </a>
          </div>
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

  const fermiumSchematics = useMemo(
    () => filteredSchematics.filter((item) => item.origin === 'fermium'),
    [filteredSchematics]
  );

  const externalSchematics = useMemo(
    () => filteredSchematics.filter((item) => item.origin !== 'fermium'),
    [filteredSchematics]
  );

  const renderSection = (
    title: string,
    subtitle: string,
    items: SchematicItem[],
    variant: 'fermium' | 'external',
    withTopDivider = false
  ) => {
    if (items.length === 0) return null;
    const isFermium = variant === 'fermium';

    return (
      <section className={withTopDivider ? 'pt-14 mt-14 border-t border-white/[0.08]' : ''}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 text-left">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider border ${
                  isFermium
                    ? 'bg-accent-orange/15 border-accent-orange/40 text-accent-orange'
                    : 'bg-white/[0.05] border-white/15 text-text-secondary'
                }`}
              >
                {isFermium ? (
                  <Sparkles className="w-3 h-3" />
                ) : (
                  <ExternalLink className="w-3 h-3" />
                )}
                <span>
                  {isFermium
                    ? isIt
                      ? 'Originali Fermium'
                      : 'Fermium Originals'
                    : isIt
                      ? 'Risorse Esterne'
                      : 'External Designs'}
                </span>
              </span>
              <span className="text-xs font-mono text-text-muted">({items.length})</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-text-secondary">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <SchematicCard
              key={item.id || `${variant}-${idx}`}
              item={item}
              isIt={isIt}
              onOpenLightbox={(targetItem, manualImages, index, mode) =>
                setLightbox({ item: targetItem, manualImages, index, mode })
              }
            />
          ))}
        </div>
      </section>
    );
  };

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
                ? 'Anteprima isometrica automatica generata dai file .litematic del server Fermium SMP. Clicca su qualsiasi schematic per ruotarla ed ispezionarla.'
                : 'Automatic isometric previews generated directly from Fermium SMP .litematic files. Click any schematic to rotate and inspect it.'}
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
          <div className="flex flex-wrap items-center gap-2 mb-10">
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
          <div>
            {renderSection(
              isIt ? 'Progettate da Fermium SMP' : 'Designed by Fermium SMP',
              isIt
                ? 'Schematics originali realizzate e progettate dai membri di Fermium.'
                : 'Original schematics designed and engineered by Fermium SMP members.',
              fermiumSchematics,
              'fermium',
              false
            )}

            {renderSection(
              isIt ? 'Schematics Esterne Usate sul Server' : 'External Schematics Used on Server',
              isIt
                ? 'Macchinari, world eater e sistemi di altri creator tecnici utilizzati nel mondo di Fermium SMP.'
                : 'Contraptions, world eaters, and systems created by external technical designers used on Fermium SMP.',
              externalSchematics,
              'external',
              fermiumSchematics.length > 0
            )}
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
        onChangeState={(updater) =>
          setLightbox((prev) => (prev ? updater(prev) : null))
        }
      />
    </div>
  );
};
