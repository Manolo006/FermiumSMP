import React, { useState } from 'react';
import { ImagePlus, Maximize2, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { Badge } from '../ui/Badge';
import { Lightbox } from '../ui/Lightbox';
import { GalleryFormModal } from '../admin/AdminModals';

export const GalleryPreview: React.FC = () => {
  const { t, lang } = useLanguage();
  const isIt = lang === 'it';
  const { isAdmin } = useAdminAuth();
  const { gallery, addGalleryPhoto, deleteGalleryPhoto } = useSiteContent();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openSlot = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handleDeletePhoto = async (id: string, slotNumber: number) => {
    const msg = isIt
      ? `Eliminare la foto #${slotNumber} dalla galleria?`
      : `Delete photo #${slotNumber} from gallery?`;
    if (!window.confirm(msg)) return;
    setActionError(null);
    try {
      await deleteGalleryPhoto(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const safeIndex =
    gallery.length > 0 ? Math.min(currentIndex, gallery.length - 1) : 0;

  return (
    <section
      id="gallery"
      className="relative py-24 sm:py-32 bg-bg-secondary/50 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-left">
          <div className="max-w-xl">
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

          {isAdmin && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-cyan text-[#061018] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-cyan-hover shadow-glow-cyan transition-all cursor-pointer active:scale-[0.97] whitespace-nowrap self-start md:self-auto"
            >
              <ImagePlus className="w-4 h-4" />
              <span>{isIt ? '+ Carica Foto' : '+ Upload Photo'}</span>
            </button>
          )}
        </div>

        {actionError && (
          <div className="mb-6 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-200/80 hover:text-white cursor-pointer"
              aria-label="Chiudi errore"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Asymmetric Grid (Semantic Buttons for Full Keyboard Accessibility) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {gallery.map((slot, idx) => (
            <div key={slot.id} className={`group relative ${slot.aspectClass}`}>
              <button
                type="button"
                onClick={() => openSlot(idx)}
                aria-label={
                  isIt
                    ? `Apri immagine #${slot.slotNumber} a schermo intero`
                    : `Open image #${slot.slotNumber} fullscreen`
                }
                className="w-full h-full glass-panel hover-lift rounded-2xl p-2 cursor-pointer hover:border-accent-cyan/35 relative text-left active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 block"
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

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(slot.id, slot.slotNumber)}
                  aria-label={isIt ? `Elimina foto #${slot.slotNumber}` : `Delete photo #${slot.slotNumber}`}
                  title={isIt ? 'Elimina foto' : 'Delete photo'}
                  className="absolute top-4 left-4 z-20 p-1.5 rounded-lg bg-[#0B0F14]/85 border border-white/15 text-text-secondary hover:text-rose-400 hover:border-rose-500/50 backdrop-blur-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Lightbox
        items={gallery}
        currentIndex={safeIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setCurrentIndex(idx)}
      />

      <GalleryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addGalleryPhoto}
      />
    </section>
  );
};
