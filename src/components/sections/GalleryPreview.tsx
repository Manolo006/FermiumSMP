import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { gallerySlots } from '../../data/gallery';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from '../ui/Badge';
import { Lightbox } from '../ui/Lightbox';

export const GalleryPreview: React.FC = () => {
  const { t, lang } = useLanguage();
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
            <Badge variant="cyan">{t.gallery.tag}</Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
            {t.gallery.title}{' '}
            <span className="text-accent-cyan">{t.gallery.titleAccent}</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {t.gallery.subtitle}
          </p>
        </div>

        {/* Asymmetric Grid (Semantic Buttons for Full Keyboard Accessibility) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {gallerySlots.map((slot, idx) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => openSlot(idx)}
              aria-label={
                lang === 'it'
                  ? `Apri immagine #${slot.slotNumber} a schermo intero`
                  : `Open image #${slot.slotNumber} fullscreen`
              }
              className={`group glass-panel hover-lift rounded-2xl p-2 cursor-pointer hover:border-accent-cyan/35 relative text-left active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${slot.aspectClass}`}
            >
              <div className="w-full h-full rounded-xl overflow-hidden img-outline-dark relative">
                {slot.imageUrl && (
                  <img
                    src={slot.imageUrl}
                    alt={`${t.gallery.placeholderTitle} #${slot.slotNumber}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}

                <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[#0B0F14]/80 border border-white/15 backdrop-blur-md flex items-center justify-center text-text-secondary group-hover:text-accent-cyan group-hover:border-accent-cyan/40 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
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
