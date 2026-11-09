import type { ProjectSlot } from '../types';
import shot1 from '../assets/images/1.png';
import shot2 from '../assets/images/2.png';
import shot3 from '../assets/images/3.png';
import shot4 from '../assets/images/4.png';
import shot5 from '../assets/images/5.png';

export const projectSlots: ProjectSlot[] = [
  { id: 'slot-1', slotNumber: 1, category: 'perimeters', coverImage: shot5 },
  { id: 'slot-2', slotNumber: 2, category: 'redstone', coverImage: shot1 },
  { id: 'slot-3', slotNumber: 3, category: 'storage', coverImage: shot2 },
  { id: 'slot-4', slotNumber: 4, category: 'farms', coverImage: shot3 },
  { id: 'slot-5', slotNumber: 5, category: 'farms', coverImage: shot4 },
  { id: 'slot-6', slotNumber: 6, category: 'megabuilds' },
];
