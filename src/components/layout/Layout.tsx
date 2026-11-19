import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Navbar } from '../navigation/Navbar';
import { Footer } from './Footer';
import { AdminFloatingBar } from '../admin/AdminFloatingBar';
import { useLanguage } from '../../i18n/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate('/staff');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackTop(window.scrollY > 640);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-primary font-sans relative">
      <Navbar />
      <main id="main-content" className="flex-1 outline-none" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <AdminFloatingBar />

      {/* Back-to-top floating control */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={t.common.backToTop}
        title={t.common.backToTop}
        className={`fixed bottom-5 right-5 z-30 w-11 h-11 rounded-xl glass-nav border-white/15 flex items-center justify-center text-accent-cyan hover:text-accent-cyan-hover hover:border-accent-cyan/45 hover:shadow-glow-cyan transition-[opacity,transform,border-color,color,box-shadow] duration-200 ease-out-Quart active:scale-[0.96] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
          showBackTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-4 h-4 stroke-[2.25]" />
      </button>
    </div>
  );
};
