import type { Member } from '../types';

/**
 * Lista iniziale dei membri (viene anche letta dinamicamente in tempo reale da ./members.json!).
 * Nessuna immagine statica salvata: le skin 3D vengono generate in tempo reale da Mojang via NMSR.
 */
export const membersList: Member[] = [
  { id: 'jenktland3', name: 'jenktland3', roleGroup: 'owner' },
  { id: 'redpl4yers', name: 'REDpl4yers', roleGroup: 'owner' },
  { id: 'poncher', name: 'poncher', roleGroup: 'owner' },
  { id: 'drp1n', name: 'drp1n', roleGroup: 'owner' },
  { id: 'ohluck_', name: 'ohluck_', roleGroup: 'member' },
  { id: 'supercece_', name: 'supercece_', roleGroup: 'owner' },
  { id: 'lollo235_', name: 'lollo235_', roleGroup: 'member' },
  { id: 'manolo006', name: 'Manolo006', roleGroup: 'trial' },
  { id: 'capo_rg5', name: 'capo_rg5', roleGroup: 'trial' },
];

/**
 * Genera dinamicamente il link del busto 3D isometrico (512px) in tempo reale da Mojang tramite NMSR.
 * A differenza di Visage (che teneva in cache la vecchia skin per 8 giorni),
 * NMSR legge la skin aggiornata direttamente dai server di Minecraft!
 */
export const getMemberBustUrl = (member: Member): string => {
  return `https://nmsr.nickac.dev/bust/${encodeURIComponent(member.name)}`;
};
