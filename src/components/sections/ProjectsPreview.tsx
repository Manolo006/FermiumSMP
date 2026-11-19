import React, { useState } from 'react';
import { FolderPlus, Pencil, Trash2, X } from 'lucide-react';
import type { ProjectCategoryKey, ProjectSlot } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { Badge } from '../ui/Badge';
import { ProjectFormModal } from '../admin/AdminModals';

export const ProjectsPreview: React.FC = () => {
  const { lang, t } = useLanguage();
  const isIt = lang === 'it';
  const { isAdmin } = useAdminAuth();
  const { projects, saveProject, deleteProject } = useSiteContent();

  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryKey>('all');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<ProjectSlot | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categories: ProjectCategoryKey[] = [
    'all',
    'perimeters',
    'redstone',
    'storage',
    'farms',
  ];

  const filteredSlots =
    selectedCategory === 'all'
      ? projects
      : projects.filter((slot) => slot.category === selectedCategory);

  const handleDeleteProject = async (slot: ProjectSlot) => {
    const label = isIt ? slot.titleIt : slot.titleEn;
    const msg = isIt
      ? `Eliminare il progetto "${label}"?`
      : `Delete project "${label}"?`;
    if (!window.confirm(msg)) return;
    setActionError(null);
    try {
      await deleteProject(slot.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section
      id="projects"
      className="relative py-24 sm:py-32 bg-bg-main border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 text-left">
          <div className="max-w-xl">
            <div className="mb-3">
              <Badge variant="cyan">{t.projects.tag}</Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-text-primary">
              {t.projects.title}{' '}
              <span className="text-accent-cyan">{t.projects.titleAccent}</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
              {t.projects.subtitle}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-cyan text-[#061018] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-cyan-hover shadow-glow-cyan transition-all cursor-pointer active:scale-[0.97] whitespace-nowrap self-start md:self-auto"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isIt ? '+ Aggiungi Progetto' : '+ Add Project'}</span>
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

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            const count =
              cat === 'all'
                ? projects.length
                : projects.filter((s) => s.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 cursor-pointer active:scale-[0.96] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/80 ${
                  active
                    ? 'bg-accent-cyan text-[#061018] font-semibold shadow-glow-cyan'
                    : 'bg-white/[0.04] text-text-secondary border border-white/10 hover:text-text-primary hover:bg-white/[0.07]'
                }`}
              >
                <span>{t.projects.categories[cat]}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    active ? 'bg-[#061018]/15 text-[#061018]' : 'bg-white/[0.06] text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlots.map((slot) => {
            const title = lang === 'it' ? slot.titleIt : slot.titleEn;
            const desc = lang === 'it' ? slot.descIt : slot.descEn;

            return (
              <div
                key={slot.id}
                className="group glass-panel hover-lift rounded-2xl p-3 flex flex-col justify-between text-left hover:border-accent-cyan/30"
              >
                <div>
                  <div className="aspect-[16/10] w-full rounded-xl overflow-hidden img-outline-dark mb-4 relative bg-[#0E131B]">
                    {slot.coverImage && (
                      <img
                        src={slot.coverImage}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge variant="neutral">
                        {t.projects.categories[slot.category]}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProject(slot);
                            setModalOpen(true);
                          }}
                          aria-label={isIt ? `Modifica ${title}` : `Edit ${title}`}
                          title={isIt ? 'Modifica progetto' : 'Edit project'}
                          className="p-1.5 rounded-lg bg-[#0B0F14]/85 border border-white/15 text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/50 backdrop-blur-md transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(slot)}
                          aria-label={isIt ? `Elimina ${title}` : `Delete ${title}`}
                          title={isIt ? 'Elimina progetto' : 'Delete project'}
                          className="p-1.5 rounded-lg bg-[#0B0F14]/85 border border-white/15 text-text-secondary hover:text-rose-400 hover:border-rose-500/50 backdrop-blur-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-2 pb-2">
                    <h3 className="text-lg font-heading font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-1.5">
                      {title}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ProjectFormModal
        isOpen={modalOpen}
        initialProject={editingProject}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSave={saveProject}
      />
    </section>
  );
};
