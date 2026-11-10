import type { Member } from '../types';

import jenktland3Bust from '../assets/members/jenktland3.png';
import redpl4yersBust from '../assets/members/redpl4yers.png';
import poncherBust from '../assets/members/poncher.png';
import drp1nBust from '../assets/members/drp1n.png';
import ohluck_Bust from '../assets/members/ohluck_.png';
import supercece_Bust from '../assets/members/supercece_.png';
import lollo235_Bust from '../assets/members/lollo235_.png';
import manolo006Bust from '../assets/members/manolo006.png';
import capo_rg5Bust from '../assets/members/capo_rg5.png';

/**
 * Per aggiungere un nuovo membro basta inserire { id, name, roleGroup }!
 * La skin 3D viene generata dinamicamente tramite il link Visage partendo dal nickname.
 */
export const membersList: Member[] = [
  {
    id: 'jenktland3',
    name: 'jenktland3',
    roleGroup: 'owner',
    customImageUrl: jenktland3Bust,
  },
  {
    id: 'redpl4yers',
    name: 'REDpl4yers',
    roleGroup: 'owner',
    customImageUrl: redpl4yersBust,
  },
  {
    id: 'poncher',
    name: 'poncher',
    roleGroup: 'owner',
    customImageUrl: poncherBust,
  },
  {
    id: 'drp1n',
    name: 'drp1n',
    roleGroup: 'owner',
    customImageUrl: drp1nBust,
  },
  {
    id: 'ohluck_',
    name: 'ohluck_',
    roleGroup: 'member',
    customImageUrl: ohluck_Bust,
  },
  {
    id: 'supercece_',
    name: 'supercece_',
    roleGroup: 'owner',
    customImageUrl: supercece_Bust,
  },
  {
    id: 'lollo235_',
    name: 'lollo235_',
    roleGroup: 'member',
    customImageUrl: lollo235_Bust,
  },
  {
    id: 'manolo006',
    name: 'Manolo006',
    roleGroup: 'trial',
    customImageUrl: manolo006Bust,
  },
  {
    id: 'capo_rg5',
    name: 'capo_rg5',
    roleGroup: 'trial',
    customImageUrl: capo_rg5Bust,
  },
];

/**
 * Genera dinamicamente il link del busto 3D isometrico (512px) a partire dal nickname Minecraft.
 * API: https://visage.surgeplay.com/bust/512/<NICKNAME>
 */
export const getMemberBustUrl = (member: Member): string => {
  return `https://visage.surgeplay.com/bust/512/${encodeURIComponent(member.name)}`;
};
