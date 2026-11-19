import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  Check,
  Database,
  ExternalLink,
  FolderGit2,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useSiteContent } from '../context/SiteContentContext';
import {
  clearRuntimeFirebaseConfig,
  getActiveFirebaseConfig,
  getAllowedAdminEmails,
  getRuntimeAdminEmails,
  getRuntimeFirebaseConfig,
  parseFirebaseConfigInput,
  saveRuntimeAdminEmails,
  saveRuntimeFirebaseConfig,
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
    firebaseConfigured,
    adminUser,
    authLoading,
    authError,
    signInWithGoogle,
    signOutAdmin,
    clearAuthError,
    refreshFirebaseBinding,
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

  // Config / Setup state
  const [configSnippet, setConfigSnippet] = useState('');
  const [emailsInput, setEmailsInput] = useState(() =>
    getAllowedAdminEmails().join(', ')
  );
  const [configFeedback, setConfigFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Quick Modals inside /staff dashboard
  const [openModal, setOpenModal] = useState<
    null | 'member' | 'project' | 'gallery' | 'video' | 'schematic'
  >(null);

  const activeConfig = getActiveFirebaseConfig();
  const hasRuntimeOverride = Boolean(getRuntimeFirebaseConfig());

  const handleSaveFirebaseSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigFeedback(null);
    try {
      const parsed = parseFirebaseConfigInput(configSnippet);
      saveRuntimeFirebaseConfig(parsed);
      const emailParts = emailsInput
        .split(/[,\n;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      saveRuntimeAdminEmails(emailParts);
      refreshFirebaseBinding();
      clearAuthError();
      setConfigSnippet('');
      setConfigFeedback({
        type: 'ok',
        text: isIt
          ? `Firebase collegato al progetto "${parsed.projectId}". Ora puoi accedere con Google!`
          : `Firebase connected to project "${parsed.projectId}". You can sign in with Google now!`,
      });
    } catch (err) {
      setConfigFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

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
            ? 'Lista email Owner salvata su questo dispositivo e sincronizzata con Firestore Rules.'
            : 'Allowed emails saved locally and synced to Firestore Rules.'
          : isIt
            ? 'Lista email salvata in localStorage su questo dispositivo.'
            : 'Allowed emails saved to localStorage.',
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

  const runtimeEmailCount = getRuntimeAdminEmails().length;
  void runtimeEmailCount;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="cyan">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isIt ? 'Area Riservata Owner' : 'Restricted Staff Portal'}</span>
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
              ? 'Pannello nascosto riservato esclusivamente all’account Google Owner di Fermium SMP. Nessun utente normale vede questa pagina né controlli di modifica.'
              : 'Hidden portal restricted to the Fermium SMP Owner Google account. Regular visitors never see admin buttons or registration prompts.'}
          </p>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-400/35 text-xs sm:text-sm text-red-200 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{authError}</div>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-xs font-mono text-red-300 hover:text-white underline cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {/* Config Feedback Banner */}
        {configFeedback && (
          <div
            role="status"
            className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
              configFeedback.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
                : 'bg-red-500/15 border-red-400/35 text-red-200'
            }`}
          >
            {configFeedback.type === 'ok' ? (
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{configFeedback.text}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE 3: LOGGED IN DASHBOARD (isAdmin === true)                   */}
        {/* ================================================================= */}
        {isAdmin ? (
          <div className="space-y-8">
            {/* Session Status Strip */}
            <div className="glass-panel border-gradient-cyan rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {adminUser?.photoURL ? (
                  <img
                    src={adminUser.photoURL}
                    alt={adminUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border border-accent-cyan/40 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/35 flex items-center justify-center text-accent-cyan shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-heading font-bold text-text-primary truncate">
                      {adminUser?.displayName || 'Fermium Owner'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-accent-cyan/15 border border-accent-cyan/35 text-accent-cyan">
                      localStorage · 0ms
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        firebaseVerified
                          ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                          : 'bg-amber-500/15 border-amber-400/35 text-amber-300'
                      }`}
                    >
                      {firebaseVerified
                        ? 'Firebase Auth Verificata'
                        : isIt
                          ? 'Verifica Firebase in corso / richiesta per salvare'
                          : 'Firebase session required to write'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-text-secondary truncate mt-0.5">
                    {adminUser?.email}
                    {activeConfig ? ` · Project: ${activeConfig.projectId}` : ''}
                    {firestoreConnected ? ' · Firestore Sync Live' : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link to="/">
                  <Button variant="secondary" size="sm">
                    {isIt ? 'Vai al Sito' : 'View Site'}
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => signOutAdmin()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/35 text-xs font-mono font-semibold text-red-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isIt ? 'Esci' : 'Sign Out'}</span>
                </button>
              </div>
            </div>

            {/* 5 Quick Content Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
          </div>
        ) : firebaseConfigured ? (
          /* ================================================================= */
          /* STATE 2: FIREBASE CONFIGURED & LOGGED OUT                         */
          /* ================================================================= */
          <div className="glass-panel border-gradient-cyan rounded-3xl p-7 sm:p-10 max-w-xl">
            <div className="w-12 h-12 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/35 flex items-center justify-center text-accent-cyan mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">
              {isIt ? 'Accesso Owner Fermium SMP' : 'Fermium SMP Owner Sign-In'}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
              {isIt
                ? 'Accedi una sola volta con l’account Google autorizzato di Fermium. Questo dispositivo manterrà in memoria lo sblocco rapido in localStorage per tutte le pagine senza tempi di attesa.'
                : 'Sign in once with the authorized Fermium Google account. Your browser keeps instant localStorage admin state across routes.'}
            </p>

            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={authLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] font-heading font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 shadow-glow-cyan active:scale-[0.97]"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>
                {isIt
                  ? 'Accedi con Google (Account Fermium)'
                  : 'Sign in with Google (Fermium Account)'}
              </span>
            </button>

            <div className="mt-6 pt-5 border-t border-white/10 text-xs font-mono text-text-muted space-y-1">
              <div>
                {isIt ? 'Progetto collegato:' : 'Project ID:'}{' '}
                <span className="text-text-secondary">{activeConfig?.projectId}</span>
              </div>
              <div>
                {isIt
                  ? 'Accesso consentito esclusivamente agli account Google Owner autorizzati.'
                  : 'Access restricted strictly to authorized Owner Google accounts.'}
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* STATE 1: FIREBASE NOT CONFIGURED YET                              */
          /* ================================================================= */
          <div className="glass-panel border-gradient-cyan rounded-3xl p-6 sm:p-9 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-accent-cyan/15 border border-accent-cyan/35 flex items-center justify-center text-accent-cyan shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-bold text-text-primary mb-1">
                  {isIt
                    ? 'Collega il Progetto Firebase (Piano Spark Gratuito)'
                    : 'Connect Firebase Project (Free Spark Plan)'}
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {isIt
                    ? 'Non ho trovato credenziali Firebase loggate su questo PC, ma tutto il CMS, le Firestore Rules e gli upload WebP/.litematic sono già pronti. Ti basta collegare le chiavi pubbliche della tua Web App Firebase qui sotto:'
                    : 'No logged-in Firebase CLI session was present on this machine, so paste your public Firebase Web App config below to enable live Google Sign-In & Firestore writes:'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-text-secondary">
              <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/10">
                <div className="font-mono text-accent-cyan font-semibold mb-1">1. Authentication</div>
                <p>
                  Attiva <strong>Google Sign-In</strong> e aggiungi{' '}
                  <code className="text-text-primary">manolo006.github.io</code> e{' '}
                  <code className="text-text-primary">localhost</code> in Authorized Domains.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/10">
                <div className="font-mono text-accent-cyan font-semibold mb-1">2. Cloud Firestore</div>
                <p>
                  Crea database <strong>Firestore Database</strong> gratuito (Spark, no carta) e incolla le regole dal file{' '}
                  <code className="text-text-primary">firestore.rules</code> della repo.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-white/10">
                <div className="font-mono text-accent-cyan font-semibold mb-1">3. Web App Snippet</div>
                <p>
                  In Impostazioni Progetto → Aggiungi App Web (`&lt;/&gt;`), copia{' '}
                  <code className="text-text-primary">firebaseConfig</code> e incollalo qui sotto.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-accent-cyan transition-colors"
              >
                <span>Apri Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* COLLAPSIBLE RUNTIME CONFIG / ADMIN EMAILS EDITOR                  */}
        {/* ================================================================= */}
        <div className="mt-8 glass-panel rounded-2xl p-5">
          <button
            type="button"
            onClick={() => setShowAdvancedConfig((s) => !s)}
            className="w-full flex items-center justify-between text-xs font-mono text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent-cyan" />
              <span>
                {isIt
                  ? 'Configurazione Firebase & Email Google Autorizzate'
                  : 'Firebase Runtime Config & Allowed Owner Emails'}
              </span>
            </span>
            <span className="text-accent-cyan">
              {showAdvancedConfig ? (isIt ? 'Chiudi' : 'Close') : isIt ? 'Espandi' : 'Expand'}
            </span>
          </button>

        {(showAdvancedConfig || !firebaseConfigured) && (
          <div className="mt-5 pt-5 border-t border-white/10 space-y-6">
              {/* Email allowlist manager (solo Owner autenticato) */}
              {isAdmin && (
                <div className="space-y-2">
                  <label
                    htmlFor="cms-allowed-emails"
                    className="block text-xs font-mono uppercase tracking-wider text-text-secondary"
                  >
                    {isIt
                      ? 'Email Google Owner Autorizzate (separate da virgola)'
                      : 'Authorized Owner Google Emails (comma-separated)'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="cms-allowed-emails"
                      type="text"
                      value={emailsInput}
                      onChange={(e) => setEmailsInput(e.target.value)}
                      placeholder="owner@example.com, co-owner@example.com"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-base sm:text-sm font-mono text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSaveEmails}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-accent-cyan/20 border border-white/15 hover:border-accent-cyan/40 text-xs font-mono font-semibold text-accent-cyan transition-colors cursor-pointer shrink-0"
                    >
                      {isIt ? 'Salva Email' : 'Save Emails'}
                    </button>
                  </div>
                </div>
              )}

              {/* Paste Firebase Snippet */}
              <form onSubmit={handleSaveFirebaseSetup} className="space-y-3">
                <label
                  htmlFor="cms-firebase-snippet"
                  className="block text-xs font-mono uppercase tracking-wider text-text-secondary"
                >
                  {isIt
                    ? 'Incolla Configurazione Firebase (JSON o const firebaseConfig = { ... })'
                    : 'Paste Firebase Config (JSON or const firebaseConfig = { ... })'}
                </label>
                <textarea
                  id="cms-firebase-snippet"
                  rows={5}
                  value={configSnippet}
                  onChange={(e) => setConfigSnippet(e.target.value)}
                  placeholder={`{\n  "apiKey": "AIza...",\n  "authDomain": "fermium-smp.firebaseapp.com",\n  "projectId": "fermium-smp",\n  "appId": "1:123456:web:abcdef"\n}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F14] border border-white/10 focus:border-accent-cyan/70 focus:outline-none text-xs font-mono text-text-primary"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {hasRuntimeOverride && (
                    <button
                      type="button"
                      onClick={() => {
                        clearRuntimeFirebaseConfig();
                        refreshFirebaseBinding();
                        setConfigFeedback({
                          type: 'ok',
                          text: isIt
                            ? 'Configurazione runtime rimossa.'
                            : 'Runtime Firebase config cleared.',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 text-xs font-mono text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isIt ? 'Rimuovi Config Salvata' : 'Clear Saved Config'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan-hover text-[#061018] text-xs font-heading font-semibold cursor-pointer shadow-glow-cyan"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isIt ? 'Salva & Collega Firebase' : 'Save & Connect Firebase'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
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
