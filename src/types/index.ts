export type MemberRoleGroup = 'owner' | 'member' | 'trial';

export interface Member {
  id: string;
  name: string;
  roleGroup: MemberRoleGroup;
  customImageUrl?: string;
}

export interface StreamerCreator {
  memberId: string;
  name: string;
  roleGroup: MemberRoleGroup;
  /** Username del canale Twitch (es. 'manolo006') per controllo live automatico + iframe */
  twitchChannel?: string;
  /** Channel ID di YouTube (es. 'UCxxxxxxxx') o URL/handle del canale */
  youtubeChannelId?: string;
  youtubeUrl?: string;
  /** ID o URL di una live YouTube attiva (opzionale, per embed diretto) */
  youtubeLiveVideoId?: string;
  /** Username TikTok senza @ (es. 'manolo006') per i link diretti al profilo e alla live */
  tiktokUsername?: string;
}

export interface FeaturedVideo {
  id: string;
  slotNumber: number;
  title?: string;
  creatorName?: string;
  platform: 'youtube' | 'tiktok';
  /** Link completo YouTube (es. https://youtu.be/...) o TikTok; se vuoto mostra lo slot segnaposto */
  videoUrl?: string;
  dateLabel?: string;
}

export type ProjectCategoryKey =
  | 'all'
  | 'farms'
  | 'redstone'
  | 'infrastructure'
  | 'perimeters'
  | 'storage'
  | 'megabuilds';

export interface ProjectSlot {
  id: string;
  slotNumber: number;
  category: Exclude<ProjectCategoryKey, 'all'>;
  coverImage?: string;
}

export interface GallerySlot {
  id: string;
  slotNumber: number;
  aspectClass: string;
  imageUrl?: string;
}

export interface StatisticSlot {
  id: 'members' | 'projects' | 'farms' | 'worldAge';
  value: string;
  isPlaceholder: boolean;
}
