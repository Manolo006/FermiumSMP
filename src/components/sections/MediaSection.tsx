import React, { useEffect, useState } from 'react';
import {
  Radio,
  Tv,
  Play,
  ExternalLink,
  Eye,
  Video,
  Sparkles,
} from 'lucide-react';
import {
  streamerCreators,
  extractYouTubeId,
  extractTikTokVideoId,
} from '../../data/media';
import type { StreamerCreator, MemberRoleGroup } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { PlaceholderSurface } from '../ui/PlaceholderSurface';

interface LiveStreamStatus {
  memberId: string;
  isLive: boolean;
  platform: 'twitch' | 'youtube' | null;
  uptime?: string;
  title?: string;
  viewers?: string;
}

interface ResolvedVideoItem {
  id: string;
  url: string;
  platform: 'youtube' | 'tiktok';
  youtubeId: string | null;
  tiktokId: string | null;
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

export const MediaSection: React.FC = () => {
  const { t } = useLanguage();
  const [liveMap, setLiveMap] = useState<Record<string, LiveStreamStatus>>({});
  const [checking, setChecking] = useState<boolean>(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'twitch' | 'youtube'>('twitch');
  const [videos, setVideos] = useState<ResolvedVideoItem[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const parentHost =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'localhost';

  // 1. Carica automaticamente i link da videos.json e recupera titolo/autore/copertina via oEmbed
  useEffect(() => {
    let cancelled = false;

    async function loadVideosFromJson() {
      try {
        const res = await fetch(`./videos.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const rawList: unknown = await res.json();
        if (!Array.isArray(rawList)) return;

        const urls = rawList
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((u) => u.startsWith('http'));

        const resolved = await Promise.all(
          urls.map(async (url, idx): Promise<ResolvedVideoItem> => {
            const ytId = extractYouTubeId(url);
            const tiktokId = extractTikTokVideoId(url);
            const isTikTok = url.includes('tiktok.com') || Boolean(tiktokId);
            const platform: 'youtube' | 'tiktok' = isTikTok ? 'tiktok' : 'youtube';

            let title = `Video #${idx + 1}`;
            let authorName = 'Fermium SMP';
            let thumbnailUrl = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '';

            try {
              const oembedEndpoint =
                platform === 'tiktok'
                  ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
                  : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

              const metaRes = await fetch(oembedEndpoint);
              if (metaRes.ok) {
                const meta = await metaRes.json();
                if (meta.title) title = meta.title;
                if (meta.author_name) authorName = meta.author_name;
                if (meta.thumbnail_url && !thumbnailUrl) thumbnailUrl = meta.thumbnail_url;
              }
            } catch {
              // Se oEmbed fallisce usa comunque thumbnail e player standard
            }

            return {
              id: `video-${idx}-${ytId || tiktokId || idx}`,
              url,
              platform,
              youtubeId: ytId,
              tiktokId,
              title,
              authorName,
              thumbnailUrl,
            };
          })
        );

        if (!cancelled) {
          setVideos(resolved);
        }
      } catch {
        // Ignora errori se videos.json è vuoto
      }
    }

    loadVideosFromJson();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Controlla automaticamente le live dei membri
  useEffect(() => {
    let cancelled = false;

    async function checkAllStreams() {
      setChecking(true);
      const results: Record<string, LiveStreamStatus> = {};

      await Promise.all(
        streamerCreators.map(async (creator) => {
          const ytLiveId = extractYouTubeId(creator.youtubeLiveVideoId);
          if (ytLiveId) {
            results[creator.memberId] = {
              memberId: creator.memberId,
              isLive: true,
              platform: 'youtube',
            };
            return;
          }

          if (creator.twitchChannel) {
            try {
              const res = await fetch(
                `https://decapi.me/twitch/uptime/${encodeURIComponent(creator.twitchChannel)}`,
                { cache: 'no-store' }
              );
              const text = (await res.text()).trim();
              const lower = text.toLowerCase();

              const isOffline =
                !res.ok ||
                !text ||
                lower.includes('offline') ||
                lower.includes('not found') ||
                lower.includes('error') ||
                lower.includes('invalid') ||
                lower.includes('404');

              if (!isOffline) {
                let title = '';
                let viewers = '';
                try {
                  const [titleRes, viewersRes] = await Promise.all([
                    fetch(
                      `https://decapi.me/twitch/title/${encodeURIComponent(creator.twitchChannel)}`
                    ),
                    fetch(
                      `https://decapi.me/twitch/viewercount/${encodeURIComponent(creator.twitchChannel)}`
                    ),
                  ]);
                  if (titleRes.ok) title = (await titleRes.text()).trim();
                  if (viewersRes.ok) viewers = (await viewersRes.text()).trim();
                } catch {
                  // Ignora errori secondari
                }

                results[creator.memberId] = {
                  memberId: creator.memberId,
                  isLive: true,
                  platform: 'twitch',
                  uptime: text,
                  title,
                  viewers,
                };
                return;
              }
            } catch {
              // Ignora errori di rete
            }
          }

          results[creator.memberId] = {
            memberId: creator.memberId,
            isLive: false,
            platform: null,
          };
        })
      );

      if (cancelled) return;
      setLiveMap(results);
      setChecking(false);

      const firstLive = streamerCreators.find((c) => results[c.memberId]?.isLive);
      if (firstLive) {
        setSelectedCreatorId((prev) => prev || firstLive.memberId);
        const st = results[firstLive.memberId];
        if (st?.platform) setSelectedPlatform(st.platform);
      }
    }

    checkAllStreams();
    const interval = window.setInterval(checkAllStreams, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const liveCreators = streamerCreators.filter((c) => liveMap[c.memberId]?.isLive);
  const activeCreator: StreamerCreator | undefined =
    streamerCreators.find((c) => c.memberId === selectedCreatorId) || liveCreators[0];
  const activeStatus = activeCreator ? liveMap[activeCreator.memberId] : undefined;

  const handleSelectCreator = (creator: StreamerCreator, preferredPlatform?: 'twitch' | 'youtube') => {
    setSelectedCreatorId(creator.memberId);
    if (preferredPlatform) {
      setSelectedPlatform(preferredPlatform);
    } else if (creator.twitchChannel) {
      setSelectedPlatform('twitch');
    } else if (creator.youtubeChannelId || creator.youtubeLiveVideoId) {
      setSelectedPlatform('youtube');
    }
  };

  const roleDotColor: Record<MemberRoleGroup, string> = {
    owner: 'bg-role-owner shadow-[0_0_8px_#60A5FA]',
    member: 'bg-role-member shadow-[0_0_8px_#38BDF8]',
    trial: 'bg-role-trial shadow-[0_0_8px_#FACC15]',
  };

  const renderStreamIframe = (creator: StreamerCreator) => {
    const ytLiveId = extractYouTubeId(creator.youtubeLiveVideoId);
    const useYouTube =
      (selectedPlatform === 'youtube' && (ytLiveId || creator.youtubeChannelId)) ||
      (!creator.twitchChannel && (ytLiveId || creator.youtubeChannelId));

    if (useYouTube) {
      if (ytLiveId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${ytLiveId}?autoplay=1&rel=0`}
            title={`${creator.name} YouTube Live`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        );
      }
      if (creator.youtubeChannelId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/live_stream?channel=${creator.youtubeChannelId}&autoplay=0`}
            title={`${creator.name} YouTube Channel Live`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        );
      }
    }

    if (creator.twitchChannel) {
      const isCurrentlyLive = liveMap[creator.memberId]?.isLive;
      return (
        <iframe
          src={`https://player.twitch.tv/?channel=${encodeURIComponent(
            creator.twitchChannel
          )}&parent=${encodeURIComponent(parentHost)}&autoplay=${
            isCurrentlyLive ? 'true' : 'false'
          }&muted=false`}
          title={`${creator.name} Twitch Stream`}
          className="w-full h-full border-0"
          allowFullScreen
        />
      );
    }

    return null;
  };

  return (
    <section
      id="live"
      className="relative py-24 sm:py-32 bg-bg-main border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 text-left">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-3">
              <Badge variant="orange">{t.media.tag}</Badge>

              {checking ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono bg-white/[0.04] border border-white/10 text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-accent-orange animate-ping" />
                  <span>{t.media.checkingBadge}</span>
                </span>
              ) : liveCreators.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-red-500/15 border border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>
                    {t.media.liveNowBadge} ({liveCreators.length})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono bg-white/[0.04] border border-white/10 text-text-muted">
                  <span className="w-2 h-2 rounded-full bg-white/25" />
                  <span>{t.media.offlineBadge}</span>
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {t.media.title}{' '}
              <span className="text-accent-orange">{t.media.titleAccent}</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {t.media.subtitle}
            </p>
          </div>
        </div>

        {/* LIVE STREAM THEATER + ROSTER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-20">
          {/* Left: 16:9 Stream Player Frame */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="glass-panel rounded-2xl p-2.5 flex-1 flex flex-col justify-between">
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/[0.06] bg-[#0D0F13] relative">
                {activeCreator ? (
                  renderStreamIframe(activeCreator)
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(240,138,54,0.08),transparent_65%)] pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-accent-orange mb-4">
                      <Radio className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-heading font-semibold text-text-primary mb-2">
                      {t.media.offlineTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary max-w-md leading-relaxed mb-6">
                      {t.media.offlineSubtitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {streamerCreators.map((c) => (
                        <button
                          key={c.memberId}
                          onClick={() => handleSelectCreator(c)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-text-primary transition-all cursor-pointer active:scale-[0.96]"
                        >
                          <img
                            src={`https://nmsr.nickac.dev/bust/${encodeURIComponent(
                              c.name
                            )}`}
                            alt={c.name}
                            className="w-4 h-4 object-contain"
                          />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stream Info Footer Bar */}
              {activeCreator && (
                <div className="mt-2.5 px-2 py-1.5 flex flex-wrap items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={`https://nmsr.nickac.dev/bust/${encodeURIComponent(
                        activeCreator.name
                      )}`}
                      alt={activeCreator.name}
                      className="w-9 h-9 rounded-lg bg-white/[0.04] p-0.5 object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-heading font-bold text-text-primary truncate">
                          {activeCreator.name}
                        </span>
                        {activeStatus?.isLive ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                            ● LIVE
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-text-muted">
                            {t.media.previewingChannel} {activeCreator.name}
                          </span>
                        )}
                      </div>
                      {activeStatus?.title && (
                        <p className="text-xs text-text-secondary truncate max-w-md">
                          {activeStatus.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Platform Switcher & External Links */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeStatus?.viewers && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-text-secondary">
                        <Eye className="w-3.5 h-3.5 text-red-400" />
                        <span>
                          {activeStatus.viewers} {t.media.viewers}
                        </span>
                      </span>
                    )}

                    {activeCreator.twitchChannel && (
                      <a
                        href={`https://www.twitch.tv/${activeCreator.twitchChannel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#9146FF]/15 text-[#c49fff] border border-[#9146FF]/35 hover:bg-[#9146FF]/25 transition-colors"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span>Twitch</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {activeCreator.youtubeUrl && (
                      <a
                        href={activeCreator.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/35 hover:bg-red-500/25 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {activeCreator.tiktokUsername && (
                      <a
                        href={`https://www.tiktok.com/@${activeCreator.tiktokUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.06] text-text-primary border border-white/15 hover:bg-white/[0.12] transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent-orange" />
                        <span>TikTok</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Official Creator Roster */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-2xl p-4 h-full flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-heading font-semibold text-text-primary">
                      {t.media.rosterTitle}
                    </h3>
                    <p className="text-xs text-text-muted">{t.media.rosterSub}</p>
                  </div>
                  <Tv className="w-4 h-4 text-accent-orange" />
                </div>

                <div className="space-y-2">
                  {streamerCreators.map((creator) => {
                    const st = liveMap[creator.memberId];
                    const isLive = Boolean(st?.isLive);
                    const isSelected = activeCreator?.memberId === creator.memberId;

                    return (
                      <div
                        key={creator.memberId}
                        onClick={() => handleSelectCreator(creator)}
                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.08] border-accent-orange/50 shadow-glow-orange'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-10 h-10 rounded-lg bg-[#101216] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={`https://nmsr.nickac.dev/bust/${encodeURIComponent(
                                creator.name
                              )}`}
                              alt={creator.name}
                              className="w-9 h-9 object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  roleDotColor[creator.roleGroup]
                                }`}
                              />
                              <span className="text-sm font-heading font-semibold text-text-primary truncate">
                                {creator.name}
                              </span>
                              {isLive && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                  LIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-text-muted block truncate">
                              {isLive && st?.uptime
                                ? `Live (${st.uptime})`
                                : creator.twitchChannel
                                  ? `twitch.tv/${creator.twitchChannel}`
                                  : creator.youtubeUrl?.replace('https://www.', '')}
                            </span>
                          </div>
                        </div>

                        {/* Platform Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {creator.twitchChannel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCreator(creator, 'twitch');
                              }}
                              title={`Player Twitch: ${creator.twitchChannel}`}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
                                isSelected && selectedPlatform === 'twitch'
                                  ? 'bg-[#9146FF] text-white border-[#9146FF]'
                                  : 'bg-[#9146FF]/15 text-[#c49fff] border-[#9146FF]/30 hover:bg-[#9146FF]/25'
                              }`}
                            >
                              Twitch
                            </button>
                          )}

                          {creator.youtubeUrl && (
                            <a
                              href={creator.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`YouTube: ${creator.name}`}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-colors inline-flex items-center gap-1"
                            >
                              <span>YouTube</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}

                          {creator.tiktokUsername && (
                            <a
                              href={`https://www.tiktok.com/@${creator.tiktokUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`TikTok: @${creator.tiktokUsername}`}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-white/[0.06] hover:bg-white/[0.14] text-text-primary border border-white/10 transition-colors inline-flex items-center gap-1"
                            >
                              <span>TikTok</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PART: VIDEOS LOADED FROM videos.json */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-left">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent-orange block mb-1.5">
                {t.media.videosTag}
              </span>
              <h3 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary tracking-tight">
                {t.media.videosTitle}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-text-secondary">
                {t.media.videosSubtitle}
              </p>
            </div>
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => {
                const isPlaying = playingVideoId === video.id;

                return (
                  <div
                    key={video.id}
                    className="group glass-panel rounded-2xl p-3 flex flex-col justify-between text-left transition-all duration-200 ease-out-Quart hover:-translate-y-1 hover:border-white/20"
                  >
                    <div>
                      <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/[0.06] mb-3.5 relative bg-[#0D0F13]">
                        {video.youtubeId ? (
                          isPlaying ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                              title={video.title}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPlayingVideoId(video.id)}
                              className="w-full h-full relative block cursor-pointer group/play"
                            >
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/play:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/35 group-hover/play:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="w-12 h-12 rounded-2xl bg-accent-orange text-[#101216] flex items-center justify-center shadow-glow-orange transition-transform duration-200 group-hover/play:scale-110">
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                </div>
                              </div>
                            </button>
                          )
                        ) : video.tiktokId ? (
                          isPlaying ? (
                            <iframe
                              src={`https://www.tiktok.com/embed/v2/${video.tiktokId}`}
                              title={video.title}
                              className="w-full h-full border-0"
                              allowFullScreen
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPlayingVideoId(video.id)}
                              className="w-full h-full relative block cursor-pointer group/play"
                            >
                              {video.thumbnailUrl ? (
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/play:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#12151B]" />
                              )}
                              <div className="absolute inset-0 bg-black/35 group-hover/play:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="w-12 h-12 rounded-2xl bg-accent-orange text-[#101216] flex items-center justify-center shadow-glow-orange transition-transform duration-200 group-hover/play:scale-110">
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                </div>
                              </div>
                            </button>
                          )
                        ) : null}
                      </div>

                      <div className="px-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-accent-orange block mb-1">
                          {video.authorName}
                        </span>
                        <h4 className="text-base font-heading font-semibold text-text-primary line-clamp-2">
                          {video.title}
                        </h4>
                      </div>
                    </div>

                    <div className="px-1.5 pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-text-muted font-mono uppercase">
                        <Video className="w-3.5 h-3.5 text-accent-orange" />
                        <span>{video.platform}</span>
                      </span>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-accent-orange hover:underline"
                      >
                        <span>
                          {t.media.openOnPlatform}{' '}
                          {video.platform === 'youtube' ? 'YouTube' : 'TikTok'}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((slotNum) => (
                <div
                  key={slotNum}
                  className="glass-panel rounded-2xl p-3 flex flex-col justify-between text-left"
                >
                  <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/[0.06] mb-3.5 bg-[#0D0F13]">
                    <PlaceholderSurface
                      title={`${t.media.videoSlotTitle} #${slotNum}`}
                      subtitle={t.media.videoSlotSub}
                    />
                  </div>
                  <div className="px-1.5 pb-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-accent-orange block mb-1">
                      videos.json
                    </span>
                    <h4 className="text-base font-heading font-semibold text-text-primary mb-1">
                      {t.media.videoSlotTitle} #{slotNum}
                    </h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {t.media.videoSlotSub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
