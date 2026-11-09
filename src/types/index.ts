export type MemberRoleGroup = 'owner' | 'member' | 'trial';

export interface Member {
  id: string;
  name: string;
  roleGroup: MemberRoleGroup;
  customImageUrl?: string; // Predisposto per quando l'utente invierà lo stile immagine dinamico
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
