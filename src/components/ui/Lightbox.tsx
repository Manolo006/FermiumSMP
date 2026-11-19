import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GallerySlot } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { PlaceholderSurface } from './PlaceholderSurface';

interface LightboxProps {
  items: GallerySlot[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { t, lang } = useLanguage();
  const currentItem = items[currentIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % items.length);
      if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + items.length) % items.length);
    },
    [isOpen, currentIndex, items.length, onClose, onNavigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t.gallery.placeholderTitle} ${currentIndex + 1} / ${items.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A0F]/92 backdrop-blur-2xl p-4 sm:p-8 overscroll-contain"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-3.5 py-1.5 rounded-full glass-panel text-xs font-mono text-text-primary tabular-nums">
            {currentIndex + 1} / {items.length}
          </span>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full glass-panel text-[11px] font-mono text-text-muted">
            {lang === 'it' ? 'Frecce per scorrere · ESC per chiudere' : 'Arrow keys to browse · ESC to close'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={lang === 'it' ? 'Chiudi anteprima' : 'Close preview'}
          className="pointer-events-auto p-2.5 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-accent-cyan/40 transition-[color,border-color,transform] duration-150 cursor-pointer active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((currentIndex - 1 + items.length) % items.length);
        }}
        aria-label={lang === 'it' ? 'Immagine precedente' : 'Previous image'}
        className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-accent-cyan/40 transition-[color,border-color,transform] duration-150 cursor-pointer active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((currentIndex + 1) % items.length);
        }}
        aria-label={lang === 'it' ? 'Immagine successiva' : 'Next image'}
        className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white hover:border-accent-cyan/40 transition-[color,border-color,transform] duration-150 cursor-pointer active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <div
        className="relative w-full max-w-5xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-panel border-gradient-cyan rounded-2xl overflow-hidden p-2">
          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden img-outline-dark">
            {currentItem.imageUrl ? (
              <img
                src={currentItem.imageUrl}
                alt={`${t.gallery.placeholderTitle} #${currentItem.slotNumber}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <PlaceholderSurface
                title={`${t.gallery.placeholderTitle} #${currentItem.slotNumber}`}
                subtitle={t.gallery.placeholderCaption}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
