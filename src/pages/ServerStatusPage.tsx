import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Clock,
  Cpu,
  Gauge,
  HardDrive,
  Loader2,
  Play,
  PowerOff,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ToolsSubNav } from '../components/navigation/ToolsSubNav';
import { Badge } from '../components/ui/Badge';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useServerStatus } from '../hooks/useServerStatus';
import { useLanguage } from '../i18n/LanguageContext';
import type { LiveServerStatus, ServerStatusSample } from '../types';

function formatRelativeAge(seconds: number | null, isIt: boolean): string {
  if (seconds === null) return isIt ? 'Mai ricevuto' : 'No heartbeat yet';
  if (seconds < 5) return isIt ? 'Adesso' : 'Just now';
  if (seconds < 60) return isIt ? `${seconds}s fa` : `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return isIt ? `${mins} min fa` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return isIt ? `${hrs}h ${mins % 60}m fa` : `${hrs}h ${mins % 60}m ago`;
}

function formatUptime(uptimeSeconds: number | undefined, isIt: boolean): string {
  if (typeof uptimeSeconds !== 'number' || uptimeSeconds <= 0) return '—';
  const totalMins = Math.floor(uptimeSeconds / 60);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return isIt ? `${days}g ${hours}h` : `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface SparkChartProps {
  samples: ServerStatusSample[];
  metric: 'tps' | 'mspt';
  isIt: boolean;
}

const TelemetrySparkChart: React.FC<SparkChartProps> = ({ samples, metric, isIt }) => {
  const width = 460;
  const height = 136;
  const padX = 10;
  const padY = 14;

  const isTps = metric === 'tps';
  const maxVal = useMemo(() => {
    if (isTps) return 20;
    const peak = Math.max(55, ...samples.map((s) => s.mspt || 0));
    return Math.ceil(peak / 10) * 10;
  }, [isTps, samples]);

  const points = useMemo(() => {
    if (samples.length === 0) return [];
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    return samples.map((s, idx) => {
      const val = isTps ? Math.min(20, Math.max(0, s.tps)) : Math.max(0, s.mspt);
      const x =
        samples.length === 1
          ? width / 2
          : padX + (idx / (samples.length - 1)) * usableW;
      const y = height - padY - (val / maxVal) * usableH;
      return { x, y, val };
    });
  }, [samples, isTps, maxVal]);

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length >= 2
      ? `M ${points[0].x.toFixed(1)},${height - padY} L ${points
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' L ')} L ${points[points.length - 1].x.toFixed(1)},${height - padY} Z`
      : '';

  const lagLineY = !isTps
    ? height - padY - (50 / maxVal) * (height - padY * 2)
    : null;

  const strokeColor = isTps ? '#22d3ee' : '#34d399';
  const gradId = `fermium-chart-grad-${metric}`;

  if (samples.length < 2) {
    return (
      <div className="h-[140px] rounded-xl bg-[#0B0F14]/70 border border-white/[0.06] flex items-center justify-center text-xs font-mono text-text-muted px-4 text-center">
        {isIt
          ? 'In attesa di almeno 2 campioni telemetrici per disegnare il grafico'
          : 'Waiting for at least 2 telemetry samples to plot chart'}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl bg-[#0B0F14]/75 border border-white/[0.06] p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[136px] overflow-visible"
        role="img"
        aria-label={isTps ? 'Grafico TPS storico' : 'Grafico MSPT storico'}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal reference lines */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = padY + (height - padY * 2) * ratio;
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        {/* 50ms lag threshold for MSPT */}
        {lagLineY !== null && lagLineY >= padY && lagLineY <= height - padY && (
          <>
            <line
              x1={padX}
              x2={width - padX}
              y1={lagLineY}
              y2={lagLineY}
              stroke="rgba(251, 191, 36, 0.55)"
              strokeWidth="1.25"
              strokeDasharray="4 4"
            />
            <text
              x={width - padX - 4}
              y={lagLineY - 4}
              textAnchor="end"
              fill="rgba(251, 191, 36, 0.85)"
              fontSize="10"
              fontFamily="monospace"
            >
              50ms limit
            </text>
          </>
        )}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />

        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3.8"
            fill={strokeColor}
          />
        )}
      </svg>
    </div>
  );
};

export const ServerStatusPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const { isAdmin } = useAdminAuth();
  const { status, loading, error, isStale, isEffectivelyOnline, ageSeconds, publishStatus } =
    useServerStatus();

  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const playersList = useMemo(() => status?.players ?? [], [status]);
  const humanPlayers = useMemo(() => playersList.filter((p) => !p.isBot), [playersList]);
  const botPlayers = useMemo(() => playersList.filter((p) => p.isBot), [playersList]);

  const effectiveTps = isEffectivelyOnline ? status?.tps ?? 0 : 0;
  const effectiveMspt = isEffectivelyOnline ? status?.mspt ?? 0 : 0;
  const effectiveHumans = isEffectivelyOnline
    ? status?.playersOnline ?? humanPlayers.length
    : 0;
  const effectiveBots = isEffectivelyOnline
    ? status?.botsOnline ?? botPlayers.length
    : 0;

  const tpsTone = !isEffectivelyOnline
    ? 'text-text-muted'
    : effectiveTps >= 19.5
      ? 'text-emerald-400'
      : effectiveTps >= 17
        ? 'text-amber-300'
        : 'text-rose-400';

  const msptTone = !isEffectivelyOnline
    ? 'text-text-muted'
    : effectiveMspt <= 35
      ? 'text-emerald-400'
      : effectiveMspt <= 50
        ? 'text-amber-300'
        : 'text-rose-400';

  const handlePublishTestOnline = async () => {
    setActionBusy(true);
    setActionMsg(null);
    try {
      const now = Date.now();
      const history: ServerStatusSample[] = Array.from({ length: 12 }, (_, idx) => {
        const wave = Math.sin(idx * 0.7) * 1.4;
        const mspt = Number((13.6 + wave).toFixed(1));
        return {
          ts: now - (11 - idx) * 20_000,
          tps: 20.0,
          mspt,
          players: 2,
          bots: 1,
        };
      });
      const payload: LiveServerStatus = {
        online: true,
        tps: 20.0,
        mspt: 13.8,
        msptMin: 11.4,
        msptMax: 16.9,
        playersOnline: 2,
        botsOnline: 1,
        maxPlayers: 20,
        players: [
          { name: 'Manolo006', isBot: false },
          { name: 'jenktland3', isBot: false },
          { name: 'bot_raid', isBot: true },
        ],
        version: 'Fabric 1.21.4',
        motd: 'Fermium Technical SMP',
        uptimeSeconds: 18_420,
        memoryUsedMb: 3420,
        memoryMaxMb: 8192,
        history,
        updatedAtMs: now,
      };
      await publishStatus(payload);
      setActionMsg(
        isIt
          ? 'Telemetria di prova pubblicata in tempo reale su server_status/live!'
          : 'Test telemetry published live to server_status/live!'
      );
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkOffline = async () => {
    setActionBusy(true);
    setActionMsg(null);
    try {
      await publishStatus({
        online: false,
        tps: 0,
        mspt: 0,
        playersOnline: 0,
        botsOnline: 0,
        maxPlayers: status?.maxPlayers ?? 20,
        players: [],
        version: status?.version || 'Fabric 1.21.4',
        uptimeSeconds: 0,
        memoryUsedMb: 0,
        memoryMaxMb: status?.memoryMaxMb ?? 8192,
        history: status?.history ?? [],
        updatedAtMs: Date.now(),
      });
      setActionMsg(isIt ? 'Stato impostato su Offline.' : 'Status set to Offline.');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const ramPercent =
    isEffectivelyOnline && status?.memoryMaxMb && status.memoryUsedMb
      ? Math.min(100, Math.round((status.memoryUsedMb / status.memoryMaxMb) * 100))
      : 0;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8">
        <ToolsSubNav />

        {/* Header + Status Pill */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <Badge variant="cyan">
                <Activity className="w-3.5 h-3.5" />
                <span>{isIt ? 'Telemetria Live Firestore' : 'Firestore Live Telemetry'}</span>
              </Badge>

              {loading ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-white/[0.04] border border-white/10 text-text-secondary">
                  <Loader2 className="w-3 h-3 animate-spin text-accent-cyan" />
                  <span>{isIt ? 'Connessione...' : 'Connecting...'}</span>
                </span>
              ) : !status ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-amber-500/10 border border-amber-400/30 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{isIt ? 'In attesa telemetria' : 'Awaiting telemetry'}</span>
                </span>
              ) : isEffectivelyOnline ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span>ONLINE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/15 border border-rose-400/40 text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>{isIt ? 'OFFLINE / CHIUSO' : 'OFFLINE / CLOSED'}</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {isIt ? 'Stato ' : 'Live '}
              <span className="text-accent-cyan">{isIt ? 'Server' : 'Server Status'}</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
              {isIt
                ? 'Monitoraggio in tempo reale di stato Online/Offline, TPS, MSPT, utilizzo memoria e giocatori collegati senza esporre l’IP privato.'
                : 'Real-time tracking of server availability, TPS, MSPT tick budget, RAM usage, and online players without exposing private server IP.'}
            </p>
          </div>

          <div className="glass-panel rounded-2xl px-4 py-3 text-xs font-mono space-y-1 shrink-0">
            <div className="flex items-center gap-2 text-text-secondary">
              <Radio className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{status?.version || 'Minecraft Java · Fabric 1.21.x'}</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted tabular-nums">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              <span>
                {isIt ? 'Ultimo segnale:' : 'Last heartbeat:'}{' '}
                <strong className="text-text-primary">
                  {formatRelativeAge(ageSeconds, isIt)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs font-mono text-rose-200">
            {error}
          </div>
        )}

        {status?.online && isStale && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs font-mono text-amber-200">
            {isIt
              ? 'Nessun heartbeat ricevuto negli ultimi 90 secondi: il server è considerato Offline / in manutenzione.'
              : 'No heartbeat received in the last 90 seconds: server is treated as Offline.'}
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* TPS */}
          <div className="glass-panel border-gradient-cyan rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                TPS (Ticks / s)
              </span>
              <Gauge className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className={`text-3xl sm:text-4xl font-heading font-bold tabular-nums ${tpsTone}`}>
              {effectiveTps.toFixed(1)}
              <span className="text-sm font-mono text-text-muted ml-1.5">/ 20.0</span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-accent-cyan transition-all duration-300"
                style={{ width: `${Math.min(100, (effectiveTps / 20) * 100)}%` }}
              />
            </div>
          </div>

          {/* MSPT */}
          <div className="glass-panel border-gradient-cyan rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                MSPT (ms / Tick)
              </span>
              <Cpu className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className={`text-3xl sm:text-4xl font-heading font-bold tabular-nums ${msptTone}`}>
              {effectiveMspt.toFixed(1)}
              <span className="text-sm font-mono text-text-muted ml-1.5">ms</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-text-muted tabular-nums">
              <span>Budget max 50ms</span>
              {isEffectivelyOnline && typeof status?.msptMin === 'number' && typeof status?.msptMax === 'number' && (
                <span>
                  {status.msptMin.toFixed(1)}–{status.msptMax.toFixed(1)}ms
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  effectiveMspt > 50
                    ? 'bg-rose-400'
                    : effectiveMspt > 35
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (effectiveMspt / 50) * 100)}%` }}
              />
            </div>
          </div>

          {/* Players & Carpet Bots */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                {isIt ? 'Giocatori Online' : 'Players Online'}
              </span>
              <Users className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="text-3xl sm:text-4xl font-heading font-bold text-text-primary tabular-nums">
              {effectiveHumans}
              <span className="text-sm font-mono text-text-muted ml-1.5">
                / {status?.maxPlayers ?? 20}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-mono text-text-secondary tabular-nums">
              <Bot className="w-3.5 h-3.5 text-accent-cyan" />
              <span>
                {effectiveBots} Carpet {effectiveBots === 1 ? 'Bot' : 'Bots'}
              </span>
            </div>
          </div>

          {/* RAM & Uptime */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                RAM / Uptime
              </span>
              <HardDrive className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-text-primary tabular-nums">
              {isEffectivelyOnline && status?.memoryUsedMb
                ? `${(status.memoryUsedMb / 1024).toFixed(1)} GB`
                : '0.0 GB'}
              <span className="text-xs font-mono text-text-muted ml-1.5">
                / {status?.memoryMaxMb ? `${(status.memoryMaxMb / 1024).toFixed(0)} GB` : '8 GB'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-text-muted tabular-nums">
              <span>Uptime</span>
              <span className="text-text-secondary">
                {isEffectivelyOnline ? formatUptime(status?.uptimeSeconds, isIt) : '—'}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-accent-cyan transition-all duration-300"
                style={{ width: `${ramPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* History Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base text-text-primary">
                {isIt ? 'Storico TPS Recenti' : 'Recent TPS History'}
              </h2>
              <span className="text-xs font-mono text-accent-cyan tabular-nums">
                Target: 20.0 TPS
              </span>
            </div>
            <TelemetrySparkChart samples={status?.history ?? []} metric="tps" isIt={isIt} />
          </div>

          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base text-text-primary">
                {isIt ? 'Storico MSPT (Tick Time)' : 'Recent MSPT History'}
              </h2>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">
                Soglia lag: 50.0 ms
              </span>
            </div>
            <TelemetrySparkChart samples={status?.history ?? []} metric="mspt" isIt={isIt} />
          </div>
        </div>

        {/* Players & Bots List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg text-text-primary">
                {isIt ? 'Giocatori in Partita' : 'Active Players'}
              </h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-white/[0.04] border border-white/10 text-text-secondary tabular-nums">
                {isEffectivelyOnline ? humanPlayers.length : 0}
              </span>
            </div>

            {!isEffectivelyOnline ? (
              <div className="rounded-xl bg-[#0B0F14]/70 border border-white/[0.06] p-6 text-center text-xs sm:text-sm text-text-secondary">
                {!status
                  ? isIt
                    ? 'Nessuna telemetria ancora inviata dal server GameHosting.'
                    : 'No telemetry samples pushed from the GameHosting server yet.'
                  : isIt
                    ? 'Il server risulta attualmente chiuso / offline.'
                    : 'The server is currently closed / offline.'}
              </div>
            ) : humanPlayers.length === 0 ? (
              <div className="rounded-xl bg-[#0B0F14]/70 border border-white/[0.06] p-6 text-center text-xs sm:text-sm text-text-secondary">
                {isIt
                  ? 'Nessun giocatore connesso al momento.'
                  : 'No human players connected right now.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {humanPlayers.map((p) => (
                  <div
                    key={p.uuid || p.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0B0F14]/75 border border-white/[0.08]"
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(p.name)}/32`}
                      alt={p.name}
                      className="w-8 h-8 rounded-lg bg-white/[0.04] shrink-0"
                      loading="lazy"
                    />
                    <span className="font-mono text-sm text-text-primary truncate flex-1">
                      {p.name}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carpet Bots */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg text-text-primary">
                Carpet Bots
              </h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan tabular-nums">
                {isEffectivelyOnline ? botPlayers.length : 0}
              </span>
            </div>

            {!isEffectivelyOnline || botPlayers.length === 0 ? (
              <div className="rounded-xl bg-[#0B0F14]/70 border border-white/[0.06] p-6 text-center text-xs text-text-muted">
                {isIt ? 'Nessun fake player attivo.' : 'No active fake players.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {botPlayers.map((b) => (
                  <div
                    key={b.uuid || b.name}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0B0F14]/75 border border-white/[0.08]"
                  >
                    <span className="font-mono text-xs text-text-primary truncate">
                      {b.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/30 text-[10px] font-mono text-accent-cyan shrink-0">
                      BOT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Owner Telemetry Controls */}
        {isAdmin && (
          <div className="glass-panel border-gradient-cyan rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-heading font-semibold text-base text-text-primary">
                    {isIt ? 'Controlli Owner Telemetria' : 'Owner Telemetry Controls'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {isIt
                      ? 'Documento Firestore: server_status/live · Reporter dedicato: status-bot@fermiumsmp.local'
                      : 'Firestore doc: server_status/live · Dedicated reporter: status-bot@fermiumsmp.local'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handlePublishTestOnline}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer disabled:opacity-50 shadow-glow-cyan"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isIt ? 'Test Telemetria Live' : 'Test Live Telemetry'}</span>
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleMarkOffline}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/40 text-xs font-mono text-text-secondary hover:text-rose-200 cursor-pointer disabled:opacity-50"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>{isIt ? 'Segna Offline' : 'Mark Offline'}</span>
                </button>
              </div>
            </div>

            {actionMsg && (
              <div className="text-xs font-mono text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/25 rounded-xl px-3.5 py-2">
                {actionMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
