import type { GallerySlot } from '../types';
import shot1 from '../assets/images/1.png';
import shot2 from '../assets/images/2.png';
import shot3 from '../assets/images/3.png';
import shot4 from '../assets/images/4.png';
import shot5 from '../assets/images/5.png';

export const gallerySlots: GallerySlot[] = [
  { id: 'gallery-1', slotNumber: 1, aspectClass: 'lg:col-span-7 aspect-[16/10]', imageUrl: shot5 },
  { id: 'gallery-2', slotNumber: 2, aspectClass: 'lg:col-span-5 aspect-[16/10]', imageUrl: shot1 },
  { id: 'gallery-3', slotNumber: 3, aspectClass: 'lg:col-span-4 aspect-[4/3]', imageUrl: shot2 },
  { id: 'gallery-4', slotNumber: 4, aspectClass: 'lg:col-span-4 aspect-[4/3]', imageUrl: shot3 },
  { id: 'gallery-5', slotNumber: 5, aspectClass: 'lg:col-span-4 aspect-[4/3]', imageUrl: shot4 },
];
