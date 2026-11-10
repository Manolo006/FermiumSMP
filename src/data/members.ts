import type { Member, MemberRoleGroup } from '../types';

export const ROLE_PRIORITY: Record<MemberRoleGroup, number> = {
  owner: 0,
  member: 1,
  trial: 2,
};

export const sortMembersByRole = (list: Member[]): Member[] => {
  return [...list].sort(
    (a, b) => (ROLE_PRIORITY[a.roleGroup] ?? 99) - (ROLE_PRIORITY[b.roleGroup] ?? 99)
  );
};

/**
 * Lista iniziale dei membri ordinata: prima Owner, poi Member, poi Trial.
 */
export const membersList: Member[] = [
  { id: 'jenktland3', name: 'jenktland3', roleGroup: 'owner' },
  { id: 'redpl4yers', name: 'REDpl4yers', roleGroup: 'owner' },
  { id: 'poncher', name: 'poncher', roleGroup: 'owner' },
  { id: 'drp1n', name: 'drp1n', roleGroup: 'owner' },
  { id: 'supercece_', name: 'supercece_', roleGroup: 'owner' },
  { id: 'ohluck_', name: 'ohluck_', roleGroup: 'member' },
  { id: 'lollo235_', name: 'lollo235_', roleGroup: 'member' },
  { id: 'manolo006', name: 'Manolo006', roleGroup: 'trial' },
  { id: 'capo_rg5', name: 'capo_rg5', roleGroup: 'trial' },
];

/**
 * Genera dinamicamente il link del busto 3D isometrico (512px) in tempo reale da Mojang tramite NMSR.
 */
export const getMemberBustUrl = (member: Member): string => {
  return `https://nmsr.nickac.dev/bust/${encodeURIComponent(member.name)}`;
};
