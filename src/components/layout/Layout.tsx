import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../navigation/Navbar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-primary font-sans relative">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};
