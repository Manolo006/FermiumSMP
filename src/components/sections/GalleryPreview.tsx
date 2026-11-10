import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { gallerySlots } from '../../data/gallery';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { Lightbox } from '../ui/Lightbox';

export const GalleryPreview: React.FC = () => {
  const { t } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openSlot = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section
      id="gallery"
      className="relative py-24 sm:py-32 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-xl text-left mb-12">
          <div className="mb-3">
            <Badge variant="orange">{t.gallery.tag}</Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
            {t.gallery.title}{' '}
            <span className="text-accent-orange">{t.gallery.titleAccent}</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {t.gallery.subtitle}
          </p>
        </div>

        {/* Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {gallerySlots.map((slot, idx) => (
            <div
              key={slot.id}
              onClick={() => openSlot(idx)}
              className={`group glass-panel rounded-2xl p-2 cursor-pointer transition-all duration-200 ease-out-Quart hover:-translate-y-1 hover:border-white/20 relative ${slot.aspectClass}`}
            >
              <div className="w-full h-full rounded-xl overflow-hidden border border-white/[0.06] relative">
                {slot.imageUrl && (
                  <img
                    src={slot.imageUrl}
                    alt={`${t.gallery.placeholderTitle} #${slot.slotNumber}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[#101216]/75 border border-white/10 backdrop-blur-md flex items-center justify-center text-text-secondary group-hover:text-white transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Lightbox
        items={gallerySlots}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setCurrentIndex(idx)}
      />
    </section>
  );
};
