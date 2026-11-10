import type { ProjectSlot } from '../types';
import shot1 from '../assets/images/1.png';
import shot2 from '../assets/images/2.png';
import shot3 from '../assets/images/3.png';
import shot4 from '../assets/images/4.png';
import shot5 from '../assets/images/5.png';

export const projectSlots: ProjectSlot[] = [
  {
    id: 'perimeter-overworld',
    slotNumber: 1,
    category: 'perimeters',
    coverImage: shot5,
    titleIt: 'Perimetro Overworld',
    titleEn: 'Overworld Perimeter',
    descIt: 'Scavo su larga scala fino alla bedrock per isolare lo spawning e ospitare le farm principali.',
    descEn: 'Large-scale excavation down to bedrock to isolate mob spawning and host core farms.',
  },
  {
    id: 'nether-slimestone-complex',
    slotNumber: 2,
    category: 'redstone',
    coverImage: shot1,
    titleIt: 'Impianto Redstone & Slimestone',
    titleEn: 'Redstone & Slimestone Complex',
    descIt: 'Macchinario tecnico multi-modulo con linee di observer, pistoni e raccolta automatizzata nel Nether.',
    descEn: 'Multi-module technical contraption with observer lines, piston feed tapes, and automated collection.',
  },
  {
    id: 'nether-roof-crafter-storage',
    slotNumber: 3,
    category: 'storage',
    coverImage: shot2,
    titleIt: 'Auto-Crafter & Storage System',
    titleEn: 'Auto-Crafter & Storage System',
    descIt: 'Batteria di crafter automatici, filtri redstone e smistamento ad alta velocità sul tetto del Nether.',
    descEn: 'Automated crafter array, redstone filters, and high-speed sorting built on the Nether roof.',
  },
  {
    id: 'portal-gold-farm',
    slotNumber: 4,
    category: 'farms',
    coverImage: shot3,
    titleIt: 'Torre Portali — Gold & XP Farm',
    titleEn: 'Portal Tower — Gold & XP Farm',
    descIt: 'Struttura verticale di portali del Nether sul tetto di bedrock per la produzione massiva di oro.',
    descEn: 'Vertical Nether portal array on the bedrock roof engineered for high-rate gold production.',
  },
  {
    id: 'wither-skeleton-farm',
    slotNumber: 5,
    category: 'farms',
    coverImage: shot4,
    titleIt: 'Wither Skeleton Farm',
    titleEn: 'Wither Skeleton Farm',
    descIt: 'Piattaforma di spawning ottimizzata nella fortezza del Nether con trasporto rapido tramite portali.',
    descEn: 'Optimized Nether Fortress spawning platform with instant portal-based mob transport.',
  },
];
