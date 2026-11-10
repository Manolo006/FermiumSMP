import type { StreamerCreator, FeaturedVideo } from '../types';

/**
 * Configurazione Canali Live dei Membri (Twitch, YouTube, TikTok).
 * - Twitch: il sito controlla in automatico se il canale `twitchChannel` è in LIVE
 *   e mostra direttamente il player interattivo quando qualcuno trasmette.
 * - YouTube: se inserisci `youtubeLiveVideoId` (o `youtubeChannelId` per il live embed),
 *   il sito può riprodurre la live o il video direttamente nell'iframe.
 * - TikTok: se inserisci `tiktokUsername`, compare il badge rapido verso `tiktok.com/@username/live`.
 */
export const streamerCreators: StreamerCreator[] = [
  {
    memberId: 'jenktland3',
    name: 'jenktland3',
    roleGroup: 'owner',
    twitchChannel: 'jenktland3',
  },
  {
    memberId: 'redpl4yers',
    name: 'REDpl4yers',
    roleGroup: 'owner',
    twitchChannel: 'redpl4yers',
  },
  {
    memberId: 'poncher',
    name: 'poncher',
    roleGroup: 'owner',
    twitchChannel: 'poncher',
  },
  {
    memberId: 'drp1n',
    name: 'drp1n',
    roleGroup: 'owner',
    twitchChannel: 'drp1n',
  },
  {
    memberId: 'ohluck_',
    name: 'ohluck_',
    roleGroup: 'owner',
    twitchChannel: 'ohluck_',
  },
  {
    memberId: 'supercece_',
    name: 'supercece_',
    roleGroup: 'owner',
    twitchChannel: 'supercece_',
  },
  {
    memberId: 'lollo235_',
    name: 'lollo235_',
    roleGroup: 'member',
    twitchChannel: 'lollo235_',
  },
  {
    memberId: 'manolo006',
    name: 'Manolo006',
    roleGroup: 'trial',
    twitchChannel: 'manolo006',
  },
  {
    memberId: 'capo_rg5',
    name: 'capo_rg5',
    roleGroup: 'trial',
    twitchChannel: 'capo_rg5',
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
    // Incolla qui `videoUrl`, `title` e `creatorName` quando vuoi mostrare un video reale
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
