import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const AdminFloatingBar: React.FC = () => {
  const { isAdmin, firebaseVerified, adminUser, signOutAdmin } = useAdminAuth();
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  const isIt = lang === 'it';

  if (!isAdmin) return null;

  return (
    <div
      role="region"
      aria-label={isIt ? 'Controlli rapidi Staff' : 'Staff quick bar'}
      className="fixed bottom-5 left-5 z-30 inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-2xl glass-nav border-gradient-cyan"
    >
      <span
        title={
          firebaseVerified
            ? isIt
              ? 'Firebase verificato'
              : 'Firebase verified'
            : isIt
              ? 'Sblocco istantaneo localStorage attivo'
              : 'Instant localStorage unlock active'
        }
        className={`w-2 h-2 rounded-full shrink-0 ${
          firebaseVerified
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
            : 'bg-accent-cyan animate-pulse'
        }`}
      />

      {adminUser?.photoURL ? (
        <img
          src={adminUser.photoURL}
          alt={adminUser.displayName}
          className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <ShieldCheck className="w-4 h-4 text-accent-cyan shrink-0" />
      )}

      <Link
        to="/staff"
        className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
          pathname === '/staff'
            ? 'bg-accent-cyan text-[#061018]'
            : 'text-text-primary hover:text-accent-cyan'
        }`}
      >
        Owner
      </Link>

      <button
        type="button"
        onClick={() => signOutAdmin()}
        aria-label={isIt ? 'Esci da Staff' : 'Sign out'}
        title={isIt ? 'Esci dalla modalità Owner' : 'Sign out'}
        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-text-secondary hover:text-red-300 transition-colors cursor-pointer active:scale-[0.96]"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
