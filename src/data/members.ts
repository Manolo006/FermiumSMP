import type { Member } from '../types';

import jenktland3Bust from '../assets/members/jenktland3.png';
import redpl4yerBust from '../assets/members/redpl4yer.png';
import poncherBust from '../assets/members/poncher.png';
import drp1nBust from '../assets/members/drp1n.png';
import ohluck_Bust from '../assets/members/ohluck_.png';
import supercece9Bust from '../assets/members/supercece9.png';
import lollo235_Bust from '../assets/members/lollo235_.png';
import manolo006Bust from '../assets/members/manolo006.png';
import capo_rg5Bust from '../assets/members/capo_rg5.png';

export const membersList: Member[] = [
  {
    id: 'jenktland3',
    name: 'jenktland3',
    roleGroup: 'owner',
    customImageUrl: jenktland3Bust,
  },
  {
    id: 'redpl4yer',
    name: 'redpl4yer',
    roleGroup: 'owner',
    customImageUrl: redpl4yerBust,
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
    roleGroup: 'owner',
    customImageUrl: ohluck_Bust,
  },
  {
    id: 'supercece9',
    name: 'supercece9',
    roleGroup: 'owner',
    customImageUrl: supercece9Bust,
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
 * Restituisce l'immagine bust 3D locale oppure genera dinamicamente l'URL Visage
 * in base al nickname Minecraft dell'account.
 */
export const getMemberBustUrl = (member: Member): string => {
  return member.customImageUrl || `https://visage.surgeplay.com/bust/512/${member.name}`;
};
