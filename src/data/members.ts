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
 * UUID ufficiali Mojang (senza trattini) per bypassare i rate-limit dei lookup username
 * su NMSR/Ashcon e garantire sempre il render della vera skin di ogni membro.
 */
export const KNOWN_MEMBER_UUIDS: Record<string, string> = {
  jenktland3: '0c30ec2c435c4a75aa5ffe5f7cc4cf88',
  redpl4yers: '96ee85be870449368a5cfc78f8b61e73',
  poncher: '3bfdace78767441f8ebebfe974f74829',
  drp1n: 'c36528078e50415aa9b25196a4358009',
  supercece_: '3b24d88f08d447dda69727e22ec8b7fe',
  ohluck_: '75f26af80f914315abccde17ff5aa381',
  lollo235_: '04c2062facb844388ccc0d8ca784ead6',
  manolo006: '01c530a35f97448fa25d5cdd01c65715',
};

/**
 * Lista iniziale dei membri ordinata: prima Owner, poi Member, poi Trial.
 */
export const membersList: Member[] = [
  { id: 'jenktland3', name: 'jenktland3', roleGroup: 'owner', uuid: KNOWN_MEMBER_UUIDS.jenktland3 },
  { id: 'redpl4yers', name: 'REDpl4yers', roleGroup: 'owner', uuid: KNOWN_MEMBER_UUIDS.redpl4yers },
  { id: 'poncher', name: 'poncher', roleGroup: 'owner', uuid: KNOWN_MEMBER_UUIDS.poncher },
  { id: 'drp1n', name: 'drp1n', roleGroup: 'owner', uuid: KNOWN_MEMBER_UUIDS.drp1n },
  { id: 'supercece_', name: 'supercece_', roleGroup: 'owner', uuid: KNOWN_MEMBER_UUIDS.supercece_ },
  { id: 'ohluck_', name: 'ohluck_', roleGroup: 'member', uuid: KNOWN_MEMBER_UUIDS.ohluck_ },
  { id: 'lollo235_', name: 'lollo235_', roleGroup: 'member', uuid: KNOWN_MEMBER_UUIDS.lollo235_ },
  { id: 'manolo006', name: 'Manolo006', roleGroup: 'member', uuid: KNOWN_MEMBER_UUIDS.manolo006 },
];

export function resolveMemberSkinId(name: string, explicitUuid?: string): string {
  const cleanUuid = explicitUuid?.replace(/-/g, '').trim();
  if (cleanUuid && /^[0-9a-fA-F]{32}$/.test(cleanUuid)) {
    return cleanUuid.toLowerCase();
  }
  const known = KNOWN_MEMBER_UUIDS[name.trim().toLowerCase()];
  if (known) return known;
  return encodeURIComponent(name.trim());
}

/**
 * Restituisce una catena ordinata di URL 3D (NMSR -> Visage/VZGE -> MC-Heads) usando lo UUID
 * ufficiale Mojang quando disponibile, così le skin non cadono mai su Steve o immagini rotte.
 */
export function getMemberSkinUrls(
  name: string,
  mode: 'bust' | 'full' | 'fullbody' = 'bust',
  explicitUuid?: string
): string[] {
  const id = resolveMemberSkinId(name, explicitUuid);
  const nmsrMode = mode === 'bust' ? 'bust' : 'fullbody';
  const vzgeMode = mode === 'bust' ? 'bust' : 'full';
  return [
    `https://nmsr.nickac.dev/${nmsrMode}/${id}`,
    `https://vzge.me/${vzgeMode}/512/${id}.png`,
    `https://mc-heads.net/body/${id}/256`,
  ];
}

/**
 * Genera dinamicamente il link primario del busto 3D isometrico (512px) da Mojang via UUID.
 */
export const getMemberBustUrl = (member: Pick<Member, 'name' | 'uuid' | 'customImageUrl'>): string => {
  if (member.customImageUrl) return member.customImageUrl;
  return getMemberSkinUrls(member.name, 'bust', member.uuid)[0];
};
