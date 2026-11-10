import type { StreamerCreator, FeaturedVideo } from '../types';

/**
 * Configurazione Ufficiale Canali Creator di Fermium SMP (Twitch, YouTube, TikTok).
 * - Twitch: controllo automatico LIVE in tempo reale + player interattivo integrato.
 * - YouTube: Channel ID ufficiale (`UC...`) + link al canale `@handle`.
 * - TikTok: link diretti al profilo `@username` e alla eventuale Live (`/@username/live`).
 */
export const streamerCreators: StreamerCreator[] = [
  {
    memberId: 'jenktland3',
    name: 'jenktland3',
    roleGroup: 'owner',
    twitchChannel: 'jenktland3_',
    youtubeChannelId: 'UCeFkDCJONKih_-Axmxy9Y3w',
    youtubeUrl: 'https://www.youtube.com/@jenktland3',
    tiktokUsername: 'jenktland3',
  },
  {
    memberId: 'redpl4yers',
    name: 'REDpl4yers',
    roleGroup: 'owner',
    twitchChannel: 'redpl4yers',
    youtubeChannelId: 'UCN8VOZ-ZfRDQCsa5i9sVcDg',
    youtubeUrl: 'https://www.youtube.com/@REDPL4YERS',
    tiktokUsername: 'redpl4yers',
  },
  {
    memberId: 'manolo006',
    name: 'Manolo006',
    roleGroup: 'trial',
    twitchChannel: 'manolo_0006',
    youtubeChannelId: 'UCVypoAS4yRiwc9mASfNeu0g',
    youtubeUrl: 'https://www.youtube.com/@Manolo006',
    tiktokUsername: 'manuel_madeddu',
  },
  {
    memberId: 'poncher',
    name: 'poncher',
    roleGroup: 'owner',
    twitchChannel: 'poncher04',
  },
  {
    memberId: 'ohluck_',
    name: 'ohluck_',
    roleGroup: 'owner',
    youtubeChannelId: 'UCG1b0T9S4720yN_ANAHaw8A',
    youtubeUrl: 'https://www.youtube.com/@ohluck_',
  },
];

/**
 * Sezione Video Manuale (Ultimi Episodi & Highlights).
 * Per pubblicare un video basta incollare il link di YouTube (o TikTok) in `videoUrl`,
 * inserire `title` e `creatorName`.
 * Esempio:
 * {
 *   id: 'video-1',
 *   slotNumber: 1,
 *   title: 'Fermium SMP Ep. 1 — Il Perimetro!',
 *   creatorName: 'Manolo006',
 *   platform: 'youtube',
 *   videoUrl: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
 *   dateLabel: 'Nov 2026',
 * }
 */
export const featuredVideos: FeaturedVideo[] = [
  {
    id: 'video-1',
    slotNumber: 1,
    platform: 'youtube',
  },
  {
    id: 'video-2',
    slotNumber: 2,
    platform: 'youtube',
  },
  {
    id: 'video-3',
    slotNumber: 3,
    platform: 'youtube',
  },
];

/**
 * Estrae automaticamente l'ID di 11 caratteri da qualsiasi link YouTube
 * (watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/, o ID diretto)
 */
export function extractYouTubeId(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const regExp =
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

/**
 * Estrae l'ID numerico di un video TikTok da un URL del tipo tiktok.com/@user/video/123456789
 */
export function extractTikTokVideoId(input?: string): string | null {
  if (!input) return null;
  const match = input.trim().match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}
