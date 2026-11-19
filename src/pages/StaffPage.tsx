import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  Check,
  FolderGit2,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useSiteContent } from '../context/SiteContentContext';
import {
  getAllowedAdminEmails,
  saveRuntimeAdminEmails,
} from '../config/firebase';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  GalleryFormModal,
  MemberFormModal,
  ProjectFormModal,
  SchematicFormModal,
  VideoFormModal,
} from '../components/admin/AdminModals';

export const StaffPage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const navigate = useNavigate();

  const {
    isAdmin,
    firebaseVerified,
    adminUser,
    authLoading,
    authError,
    signInWithGoogle,
    signOutAdmin,
    clearAuthError,
    syncAllowedEmailsToFirestore,
  } = useAdminAuth();

  const {
    members,
    projects,
    gallery,
    videos,
    schematics,
    firestoreConnected,
    saveMember,
    saveProject,
    addGalleryPhoto,
    addVideo,
    saveSchematic,
  } = useSiteContent();

  const [emailsInput, setEmailsInput] = useState(() =>
    getAllowedAdminEmails().join(', ')
  );
  const [configFeedback, setConfigFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Quick Modals inside /staff dashboard
  const [openModal, setOpenModal] = useState<
    null | 'member' | 'project' | 'gallery' | 'video' | 'schematic'
  >(null);

  const handleSaveEmails = async () => {
    setConfigFeedback(null);
    const emailParts = emailsInput
      .split(/[,\n;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes('@'));
    saveRuntimeAdminEmails(emailParts);
    const merged = getAllowedAdminEmails();
    setEmailsInput(merged.join(', '));
    try {
      if (firebaseVerified) {
        await syncAllowedEmailsToFirestore(merged);
      }
      setConfigFeedback({
        type: 'ok',
        text: firebaseVerified
          ? isIt
            ? 'Lista email Staff salvata e sincronizzata con Firestore Rules.'
            : 'Allowed emails saved and synced to Firestore Rules.'
          : isIt
            ? 'Lista email salvata in memoria.'
            : 'Allowed emails saved locally.',
      });
    } catch (err) {
      setConfigFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const jumpToHomeSection = (sectionId: string) => {
    navigate('/');
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const dashboardCards = [
    {
      key: 'member' as const,
      titleIt: 'Membri del Server',
      titleEn: 'Server Members',
      count: members.length,
      descIt: 'Aggiungi membri (skin Mojang automatica), cambia ruolo o rimuovi dal roster.',
      descEn: 'Add players (auto Mojang 3D skin), change roles, or remove from roster.',
      icon: Users,
      addLabelIt: 'Aggiungi Membro',
      addLabelEn: 'Add Member',
      onJump: () => jumpToHomeSection('members'),
    },
    {
      key: 'project' as const,
      titleIt: 'Progetti Tecnici',
      titleEn: 'Technical Projects',
      count: projects.length,
      descIt: 'Carica foto (WebP auto) con titolo e descrizione obbligatori in Italiano e Inglese.',
      descEn: 'Upload compressed WebP cover with mandatory Italian + English copy.',
      icon: FolderGit2,
      addLabelIt: 'Aggiungi Progetto',
      addLabelEn: 'Add Project',
      onJump: () => jumpToHomeSection('projects'),
    },
    {
      key: 'gallery' as const,
      titleIt: 'Galleria Foto',
      titleEn: 'Photo Gallery',
      count: gallery.length,
      descIt: 'Upload diretto screenshot del mondo con ottimizzazione automatica WebP.',
      descEn: 'Direct screenshot upload with automatic WebP compression.',
      icon: ImageIcon,
      addLabelIt: 'Carica Foto',
      addLabelEn: 'Upload Photo',
      onJump: () => jumpToHomeSection('gallery'),
    },
    {
      key: 'video' as const,
      titleIt: 'Live & Video',
      titleEn: 'Live & Videos',
      count: videos.length,
      descIt: 'Incolla un link YouTube o TikTok per aggiungerlo alla bacheca episodi.',
      descEn: 'Paste any YouTube or TikTok URL to publish on the showcase.',
      icon: Video,
      addLabelIt: 'Aggiungi Video',
      addLabelEn: 'Add Video',
      onJump: () => jumpToHomeSection('live'),
    },
    {
      key: 'schematic' as const,
      titleIt: 'Archivio Schematics',
      titleEn: 'Schematics Archive',
      count: schematics.length,
      descIt: 'Carica file .litematic con anteprima 3D isometrica e conteggio blocchi automatici.',
      descEn: 'Upload .litematic files with automatic 3D isometric previews.',
      icon: Archive,
      addLabelIt: 'Carica .litematic',
      addLabelEn: 'Upload .litematic',
      onJump: () => navigate('/tools/archive'),
    },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="cyan">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isIt ? 'Area Riservata Staff' : 'Staff Portal'}</span>
            </Badge>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] border border-white/10 text-text-muted">
              #/staff
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-text-primary">
            Fermium <span className="text-accent-cyan">Staff CMS</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
            {isIt
              ? 'Pannello di controllo riservato allo Staff di Fermium SMP.'
              : 'Restricted dashboard for Fermium SMP Staff.'}
          </p>
        </div>

        {/* Global Feedback Banner */}
        {configFeedback && (
          <div
            className={`mb-6 rounded-2xl p-4 flex items-start gap-3 border ${
              configFeedback.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {configFeedback.type === 'ok' ? (
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm font-mono leading-relaxed">
              {configFeedback.text}
            </div>
          </div>
        )}

        {/* Auth Error Banner */}
        {authError && (
          <div className="mb-6 rounded-2xl p-4 flex items-start justify-between gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-mono leading-relaxed">
                {authError}
              </div>
            </div>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-xs font-mono text-rose-200/80 hover:text-white cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        )}

        {isAdmin ? (
          /* ================================================================= */
          /* STATE: LOGGED IN AS STAFF -> FULL DASHBOARD                       */
          /* ================================================================= */
          <div className="space-y-10">
            {/* Top User Bar */}
            <div className="glass-panel border-gradient-cyan rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                {adminUser?.photoURL ? (
                  <img
                    src={adminUser.photoURL}
                    alt={adminUser.displayName}
                    className="w-12 h-12 rounded-2xl object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/35 flex items-center justify-center text-accent-cyan">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-bold text-lg text-text-primary">
                      {adminUser?.displayName || 'Fermium Staff'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                      localStorage • 0ms
                    </span>
                    {firestoreConnected ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Firestore Realtime Live
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Verifica Firebase in corso
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-text-secondary mt-0.5 block">
                    {adminUser?.email}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
                  {isIt ? 'Vai al Sito' : 'Back to Site'}
                </Button>
                <button
                  type="button"
                  onClick={() => signOutAdmin()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono font-medium text-red-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isIt ? 'Esci' : 'Sign Out'}</span>
                </button>
              </div>
            </div>

            {/* Dashboard 5 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboardCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-accent-cyan/35 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/[0.04] border border-white/10 text-text-primary tabular-nums">
                          {card.count}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-heading font-semibold text-text-primary mb-1.5">
                        {isIt ? card.titleIt : card.titleEn}
                      </h2>
                      <p className="text-xs text-text-secondary leading-relaxed mb-5">
                        {isIt ? card.descIt : card.descEn}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setOpenModal(card.key)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold transition-colors cursor-pointer shadow-glow-cyan"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isIt ? card.addLabelIt : card.addLabelEn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={card.onJump}
                        aria-label={isIt ? `Apri sezione ${card.titleIt}` : `Open ${card.titleEn}`}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-text-secondary hover:text-accent-cyan transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gestione Account Staff & Collaboratori */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-2">
                <Settings className="w-4 h-4 text-accent-cyan" />
                <h3 className="font-heading font-bold text-base text-text-primary">
                  {isIt ? 'Gestione Account Staff & Collaboratori' : 'Staff Accounts Management'}
                </h3>
              </div>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                {isIt
                  ? 'Aggiungi o rimuovi le email Google autorizzate ad accedere al pannello Staff. Separa gli indirizzi con una virgola.'
                  : 'Add or remove Google emails authorized to manage the site as Staff. Separate addresses with commas.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="cms-allowed-emails"
                  type="text"
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  placeholder="manuelcarpita@gmail.com, altro.account@gmail.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm font-mono text-text-primary"
                />
                <button
                  type="button"
                  onClick={handleSaveEmails}
                  className="px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] font-heading font-semibold text-xs cursor-pointer shadow-glow-cyan transition-colors shrink-0"
                >
                  {isIt ? 'Salva Email' : 'Save Emails'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* LOGGED OUT: SOLO PULSANTE ACCEDI CON GOOGLE                      */
          /* ================================================================= */
          <div className="glass-panel border-gradient-cyan rounded-3xl p-8 sm:p-12 max-w-md mx-auto text-center my-8">
            <div className="w-16 h-16 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/35 flex items-center justify-center text-accent-cyan mb-6 mx-auto shadow-glow-cyan">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
              {isIt ? 'Accesso Staff Fermium' : 'Fermium Staff Sign-In'}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-8">
              {isIt
                ? 'Accedi con il tuo account Google autorizzato per sbloccare la gestione del sito.'
                : 'Sign in with your authorized Google account to manage the site.'}
            </p>

            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] font-heading font-bold text-sm sm:text-base transition-all cursor-pointer disabled:opacity-50 shadow-glow-cyan active:scale-[0.97]"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
              <span>
                {isIt ? 'Accedi con Google' : 'Sign in with Google'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Quick-action Modals inside Dashboard */}
      <MemberFormModal
        isOpen={openModal === 'member'}
        onClose={() => setOpenModal(null)}
        onSave={saveMember}
      />
      <ProjectFormModal
        isOpen={openModal === 'project'}
        onClose={() => setOpenModal(null)}
        onSave={saveProject}
      />
      <GalleryFormModal
        isOpen={openModal === 'gallery'}
        onClose={() => setOpenModal(null)}
        onSave={addGalleryPhoto}
      />
      <VideoFormModal
        isOpen={openModal === 'video'}
        onClose={() => setOpenModal(null)}
        onSave={addVideo}
      />
      <SchematicFormModal
        isOpen={openModal === 'schematic'}
        onClose={() => setOpenModal(null)}
        onSave={saveSchematic}
      />
    </div>
  );
};
