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
  const { t } = useLanguage();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0D10]/90 backdrop-blur-2xl p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
        <span className="px-3.5 py-1.5 rounded-full glass-panel text-xs font-mono text-text-secondary pointer-events-auto">
          {currentIndex + 1} / {items.length}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="pointer-events-auto p-2.5 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer active:scale-[0.96]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((currentIndex - 1 + items.length) % items.length);
        }}
        aria-label="Previous"
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer active:scale-[0.96]"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((currentIndex + 1) % items.length);
        }}
        aria-label="Next"
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl glass-panel text-text-secondary hover:text-white transition-colors cursor-pointer active:scale-[0.96]"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <div
        className="relative w-full max-w-4xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-panel rounded-2xl overflow-hidden p-2">
          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden">
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
