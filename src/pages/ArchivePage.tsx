import React, { useEffect, useState } from 'react';
import { Archive, Download, FileCode2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Badge } from '../components/ui/Badge';

interface SchematicItem {
  id: string;
  name: string;
  author?: string;
  category?: string;
  description?: string;
  fileUrl: string;
}

export const ArchivePage: React.FC = () => {
  const { lang } = useLanguage();
  const isIt = lang === 'it';
  const [schematics, setSchematics] = useState<SchematicItem[]>([]);

  useEffect(() => {
    fetch(`./schematics.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSchematics(data.filter((item) => item && item.name && item.fileUrl));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-main">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl text-left mb-12">
          <div className="mb-3">
            <Badge variant="orange">Fermium SMP</Badge>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-text-primary">
            {isIt ? 'Archivio ' : 'Schematics '}
            <span className="text-accent-orange">Schematics</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {isIt
              ? 'Raccolta dei file .litematic e .schem utilizzati e progettati dai membri di Fermium SMP.'
              : 'Collection of .litematic and .schem files designed and used by Fermium SMP members.'}
          </p>
        </div>

        {schematics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schematics.map((item, idx) => (
              <div
                key={item.id || idx}
                className="glass-panel rounded-2xl p-5 flex flex-col justify-between text-left hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/25 flex items-center justify-center text-accent-orange">
                      <FileCode2 className="w-5 h-5" />
                    </div>
                    {item.category && <Badge variant="neutral">{item.category}</Badge>}
                  </div>

                  <h3 className="text-lg font-heading font-bold text-text-primary mb-1">
                    {item.name}
                  </h3>
                  {item.author && (
                    <span className="text-xs font-mono text-accent-orange block mb-2">
                      by {item.author}
                    </span>
                  )}
                  {item.description && (
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                      {item.description}
                    </p>
                  )}
                </div>

                <a
                  href={item.fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-orange text-[#101216] font-heading font-semibold text-xs sm:text-sm hover:bg-accent-orange-hover transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{isIt ? 'Scarica Schematic' : 'Download Schematic'}</span>
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-10 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-accent-orange mx-auto mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-text-primary mb-2">
              {isIt ? 'Archivio Schematics' : 'Schematics Archive'}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {isIt
                ? 'Le schematics pubbliche della community verranno caricate in questa sezione.'
                : 'Public community schematics will be uploaded in this section.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
