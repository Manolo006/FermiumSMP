import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Eye,
  Flame,
  Globe2,
  Info,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Navigation,
  Sparkles,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';
import { BLUEMAP_SITE_URL } from '../config/links';

type ViewMode = 'perspective' | 'flat' | 'free';

interface BlueMapDimensionSettings {
  name?: string;
  sorting?: number;
  startPos?: [number, number];
  perspectiveView?: boolean;
  flatView?: boolean;
  freeFlightView?: boolean;
}

interface DimensionState {
  id: string;
  labelIt: string;
  labelEn: string;
  accentDot: string;
  activePill: string;
  startPos: [number, number];
  hasSettings: boolean;
  hasTiles: boolean;
}

const DEFAULT_DIMENSIONS: DimensionState[] = [
  {
    id: 'world',
    labelIt: 'Overworld',
    labelEn: 'Overworld',
    accentDot: 'bg-emerald-400',
    activePill: 'bg-emerald-500/15 border-emerald-400/45 text-emerald-300',
    startPos: [0, 0],
    hasSettings: false,
    hasTiles: true,
  },
  {
    id: 'world_the_nether',
    labelIt: 'Nether',
    labelEn: 'The Nether',
    accentDot: 'bg-rose-400',
    activePill: 'bg-rose-500/15 border-rose-400/45 text-rose-300',
    startPos: [0, 0],
    hasSettings: false,
    hasTiles: false,
  },
  {
    id: 'world_the_end',
    labelIt: 'End',
    labelEn: 'The End',
    accentDot: 'bg-violet-400',
    activePill: 'bg-violet-500/15 border-violet-400/45 text-violet-300',
    startPos: [0, 0],
    hasSettings: false,
    hasTiles: false,
  },
];

async function probeAnyTileExists(dimId: string): Promise<boolean> {
  const candidates = [
    `${BLUEMAP_SITE_URL}/maps/${dimId}/tiles/1/x0/z0.png`,
    `${BLUEMAP_SITE_URL}/maps/${dimId}/tiles/1/x-1/z0.png`,
    `${BLUEMAP_SITE_URL}/maps/${dimId}/tiles/2/x0/z0.png`,
    `${BLUEMAP_SITE_URL}/maps/${dimId}/tiles/3/x0/z0.png`,
    `${BLUEMAP_SITE_URL}/maps/${dimId}/tiles/0/x0/z0.prbm.gz`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) return true;
    } catch {
      // ignore offline/missing probe
    }
  }
  return false;
}

function buildBlueMapHash(dimId: string, startPos: [number, number], mode: ViewMode): string {
  const [sx, sz] = startPos;
  const dist = mode === 'flat' ? 900 : 600;
  const angle = mode === 'flat' ? 0 : 0.72;
  return `${dimId}:${sx}:64:${sz}:${dist}:0:${angle}:0:0:${mode}`;
}

export const WorldMapPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';

  const [dimensions, setDimensions] = useState<DimensionState[]>(DEFAULT_DIMENSIONS);
  const [activeDimId, setActiveDimId] = useState<string>('world');
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [dismissedEmptyAlert, setDismissedEmptyAlert] = useState<string | null>(null);
  const [externalSiteUnavailable, setExternalSiteUnavailable] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const activeDimRef = useRef<DimensionState>(DEFAULT_DIMENSIONS[0]);
  const viewModeRef = useRef<ViewMode>('perspective');

  // Discover settings & available tiles across all dimensions in ./maps/
  useEffect(() => {
    let cancelled = false;

    async function inspectMaps() {
      let mapIds = ['world', 'world_the_nether', 'world_the_end'];
      let rootReachable = false;
      try {
        const rootRes = await fetch(`${BLUEMAP_SITE_URL}/settings.json`);
        if (rootRes.ok) {
          rootReachable = true;
          const rootJson = (await rootRes.json()) as { maps?: string[] };
          if (Array.isArray(rootJson.maps) && rootJson.maps.length > 0) {
            mapIds = rootJson.maps;
          }
        }
      } catch {
        // external map site not published or blocked
      }

      if (!cancelled) {
        setExternalSiteUnavailable(!rootReachable);
      }
      if (!rootReachable) return;

      const resolved = await Promise.all(
        mapIds.map(async (id) => {
          const base = DEFAULT_DIMENSIONS.find((d) => d.id === id) ?? {
            id,
            labelIt: id,
            labelEn: id,
            accentDot: 'bg-accent-orange',
            activePill: 'bg-accent-orange/15 border-accent-orange/45 text-accent-orange',
            startPos: [0, 0] as [number, number],
            hasSettings: false,
            hasTiles: false,
          };

          let hasSettings = false;
          let startPos: [number, number] = base.startPos;

          try {
            const sRes = await fetch(`${BLUEMAP_SITE_URL}/maps/${id}/settings.json`);
            if (sRes.ok) {
              const sJson = (await sRes.json()) as BlueMapDimensionSettings;
              hasSettings = true;
              if (Array.isArray(sJson.startPos) && sJson.startPos.length >= 2) {
                startPos = [Number(sJson.startPos[0]) || 0, Number(sJson.startPos[1]) || 0];
              }
            }
          } catch {
            // missing dimension settings
          }

          const hasTiles = hasSettings ? await probeAnyTileExists(id) : false;
          return { ...base, startPos, hasSettings, hasTiles };
        })
      );

      if (!cancelled) {
        setDimensions(resolved);
      }
    }

    inspectMaps();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const activeDimension = useMemo(
    () => dimensions.find((d) => d.id === activeDimId) ?? dimensions[0],
    [dimensions, activeDimId]
  );

  useEffect(() => {
    activeDimRef.current = activeDimension;
  }, [activeDimension]);

  const syncIframeCamera = useCallback((dim: DimensionState, mode: ViewMode) => {
    const nextHash = `#${buildBlueMapHash(dim.id, dim.startPos, mode)}`;
    try {
      const cw = iframeRef.current?.contentWindow;
      if (cw && cw.location) {
        cw.location.hash = nextHash;
        return;
      }
    } catch {
      // ignore cross-frame read timing before load
    }
    if (iframeRef.current) {
      iframeRef.current.src = `${BLUEMAP_SITE_URL}/${nextHash}`;
    }
  }, []);

  const handleSelectDimension = (dim: DimensionState) => {
    activeDimRef.current = dim;
    setActiveDimId(dim.id);
    setDismissedEmptyAlert(null);
    syncIframeCamera(dim, viewModeRef.current);
  };

  const handleSelectViewMode = (mode: ViewMode) => {
    viewModeRef.current = mode;
    setViewMode(mode);
    syncIframeCamera(activeDimRef.current, mode);
  };

  const handleResetSpawn = () => {
    syncIframeCamera(activeDimRef.current, viewModeRef.current);
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const initialSrc = useMemo(
    () => `${BLUEMAP_SITE_URL}/#${buildBlueMapHash('world', [0, 0], 'perspective')}`,
    []
  );

  const directBlueMapHref = useMemo(
    () => `${BLUEMAP_SITE_URL}/#${buildBlueMapHash(activeDimension.id, activeDimension.startPos, viewMode)}`,
    [activeDimension, viewMode]
  );

  const dimIcon = (id: string) => {
    if (id.includes('nether')) return <Flame className="w-3.5 h-3.5" />;
    if (id.includes('end')) return <Sparkles className="w-3.5 h-3.5" />;
    return <Globe2 className="w-3.5 h-3.5" />;
  };

  return (
    <div className="pt-28 pb-20 max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Badge variant="orange">
            <Compass className="w-3.5 h-3.5" />
            <span>BlueMap 3D · WebGL</span>
          </Badge>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            {isIt ? 'Mappa del Mondo' : 'World Map'}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
            {isIt
              ? 'Esplora il mondo di Fermium SMP in 3D interattivo direttamente dal browser, con supporto per Overworld, Nether ed End.'
              : 'Explore the Fermium SMP world in interactive 3D directly in your browser across Overworld, Nether, and The End.'}
          </p>
        </div>

        <a
          href={directBlueMapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>{isIt ? 'Apri BlueMap a schermo intero' : 'Open standalone BlueMap'}</span>
          <ExternalLink className="w-3.5 h-3.5 text-accent-orange" />
        </a>
      </div>

      {/* Interactive Viewer Frame */}
      <div
        ref={containerRef}
        className={`glass-panel rounded-3xl overflow-hidden border border-white/10 flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#101216]' : ''
        }`}
      >
        {/* Top Control Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-[#14171D]/90 flex flex-wrap items-center justify-between gap-3">
          {/* Dimension Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {dimensions.map((dim) => {
              const isActive = dim.id === activeDimId;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => handleSelectDimension(dim)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono border transition-colors cursor-pointer ${
                    isActive
                      ? dim.activePill
                      : 'bg-white/[0.03] border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/[0.06]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${dim.accentDot}`} />
                  {dimIcon(dim.id)}
                  <span>{isIt ? dim.labelIt : dim.labelEn}</span>
                  {dim.hasSettings && !dim.hasTiles && (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-text-muted">
                      {isIt ? 'Vuota' : 'Empty'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Camera & Viewport Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              {(
                [
                  { id: 'perspective', labelIt: '3D', labelEn: '3D', icon: Layers },
                  { id: 'flat', labelIt: '2D', labelEn: '2D', icon: Eye },
                  { id: 'free', labelIt: 'Volo', labelEn: 'Free', icon: Navigation },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectViewMode(mode.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      active
                        ? 'bg-accent-orange text-[#101216] font-semibold'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{isIt ? mode.labelIt : mode.labelEn}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleResetSpawn}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={isIt ? 'Centra allo Spawn' : 'Center on Spawn'}
            >
              <Compass className="w-3.5 h-3.5 text-accent-orange" />
              <span>Spawn</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              aria-label={isIt ? 'Schermo intero' : 'Toggle fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Viewport Container */}
        <div
          className={`relative w-full bg-[#0B0D11] ${
            isFullscreen ? 'flex-1 min-h-0' : 'h-[68vh] min-h-[520px] max-h-[820px]'
          }`}
        >
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0D1015]/95 pointer-events-none">
              <Loader2 className="w-7 h-7 text-accent-orange animate-spin" />
              <div className="text-xs font-mono text-text-secondary">
                {isIt ? 'Inizializzazione motore 3D BlueMap...' : 'Initializing BlueMap 3D engine...'}
              </div>
            </div>
          )}

          {externalSiteUnavailable && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-[#0D1015]/95">
              <div className="max-w-lg w-full rounded-2xl bg-[#141821] border border-accent-orange/35 p-6 space-y-3 text-center shadow-2xl">
                <Info className="w-7 h-7 text-accent-orange mx-auto" />
                <h2 className="font-heading text-lg font-bold text-text-primary">
                  {isIt ? 'Sito Mappa Separato non ancora online' : 'Separate Map Site Not Live Yet'}
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {isIt ? (
                    <>
                      Il sito è collegato a{' '}
                      <code className="text-accent-orange break-all">{BLUEMAP_SITE_URL}</code>. Carica su
                      quel repository i file preparati nella cartella Desktop <code className="text-text-primary">FermiumSMP-Map</code> e attiva GitHub Pages sul branch <code className="text-text-primary">main</code>.
                    </>
                  ) : (
                    <>
                      This page points to{' '}
                      <code className="text-accent-orange break-all">{BLUEMAP_SITE_URL}</code>. Push the prepared <code className="text-text-primary">FermiumSMP-Map</code> folder and enable GitHub Pages on branch <code className="text-text-primary">main</code>.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {!externalSiteUnavailable &&
            activeDimension.hasSettings &&
            !activeDimension.hasTiles &&
            dismissedEmptyAlert !== activeDimension.id && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl rounded-2xl bg-[#141821]/95 border border-accent-orange/35 px-4 py-3 shadow-2xl backdrop-blur-md flex items-start gap-3">
                <Info className="w-4 h-4 text-accent-orange shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary leading-relaxed flex-1">
                  {isIt ? (
                    <>
                      La dimensione{' '}
                      <strong className="text-text-primary font-mono">{activeDimension.id}</strong> è
                      configurata, ma al momento la cartella <code className="text-accent-orange">maps/{activeDimension.id}</code>{' '}
                      non contiene ancora file in <code className="text-accent-orange">tiles/</code>. Quando
                      caricherai le tile renderizzate da BlueMap, appariranno qui automaticamente.
                    </>
                  ) : (
                    <>
                      Dimension{' '}
                      <strong className="text-text-primary font-mono">{activeDimension.id}</strong> is
                      configured, but <code className="text-accent-orange">maps/{activeDimension.id}</code>{' '}
                      does not contain rendered <code className="text-accent-orange">tiles/</code> yet. Once
                      you upload rendered BlueMap tiles, they will show up automatically.
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedEmptyAlert(activeDimension.id)}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] cursor-pointer"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          <iframe
            ref={iframeRef}
            title={isIt ? 'Mappa 3D Fermium SMP' : 'Fermium SMP 3D Map'}
            src={initialSrc}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0 block"
            allow="fullscreen"
          />
        </div>

        {/* Bottom Controls Legend */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-white/[0.06] bg-[#12151B]/90 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted">
          <span>
            {isIt
              ? 'Sinistro: trascina mappa · Rotella: zoom · Destro: ruota camera · Doppio click: centra'
              : 'Left drag: pan · Scroll: zoom · Right drag: orbit · Double click: focus'}
          </span>
          <span className="text-text-secondary">
            {isIt ? 'Dati statici BlueMap 5.29' : 'BlueMap 5.29 static export'}
          </span>
        </div>
      </div>
    </div>
  );
};
