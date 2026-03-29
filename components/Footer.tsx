import React, { Suspense, lazy, useState } from 'react';
import { Translation } from '../types';
import { Github, FileText, Mail, GraduationCap, Sparkles, Check, User } from 'lucide-react';

const PdfModal = lazy(() => import('./PdfModal'));

interface FooterProps {
  t: Translation;
  showNotification: (text: string, duration?: number, type?: 'info' | 'success' | 'warning') => void;
  supportsHover?: boolean;
  compactLinks?: boolean;
}

const PdfModalFallback = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-5 py-4 text-sm font-medium text-slate-200 shadow-2xl">
      Loading PDF viewer...
    </div>
  </div>
);

const Footer: React.FC<FooterProps> = ({ t, showNotification, supportsHover = true, compactLinks = false }) => {
  const [emailCopied, setEmailCopied] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const iconLiftClass = supportsHover ? 'group-hover:scale-110' : '';
  const accentHoverClass = supportsHover ? 'group-hover:text-sciblue-400' : '';
  const linkHoverClass = supportsHover ? 'hover:bg-slate-800 hover:text-white' : '';
  const compactLinkCardClass = supportsHover
    ? 'hover:border-sciblue-500/40 hover:bg-slate-800/50 hover:text-white'
    : '';
  const linksSectionClass = compactLinks
    ? 'order-last w-full basis-full'
    : 'w-full min-w-0 flex-[0.8_1_200px] sm:min-w-[180px] sm:max-w-[260px]';
  const linksListClass = compactLinks
    ? 'grid gap-3 sm:grid-cols-3'
    : 'flex flex-col gap-2';
  const linkItemClass = compactLinks
    ? `group flex min-h-[56px] items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-sm text-slate-300 transition-all ${compactLinkCardClass}`
    : `group -ml-2 flex items-center gap-3 rounded-lg p-2 text-sm text-slate-300 transition-all ${linkHoverClass}`;
  const linkButtonClass = compactLinks
    ? `group flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-left text-sm text-slate-300 transition-all ${compactLinkCardClass}`
    : `group -ml-2 flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm text-slate-300 transition-all ${linkHoverClass}`;

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const email = 'project-team@users.noreply.github.com';

    window.location.href = `mailto:${email}`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(() => {
        setEmailCopied(true);
        showNotification(t.footer.emailCopiedMsg, 2000, 'success');
        window.setTimeout(() => setEmailCopied(false), 2000);
      }).catch(() => {
        // Ignore clipboard failures.
      });
    }
  };

  const handleOpenPdf = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPdfOpen(true);
  };

  const headerStyle = 'mb-5 flex h-5 items-center text-xs font-bold uppercase tracking-widest text-slate-300';

  return (
    <>
      <footer className="relative z-10 mt-20 w-full shrink-0 overflow-hidden border-t border-slate-800 bg-slate-900 text-slate-300">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-sciblue-500/50 to-transparent" />

        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="flex flex-wrap gap-x-12 gap-y-12">
            <div className="flex w-full min-w-0 flex-[1.2_1_280px] flex-col items-start pr-4 sm:min-w-[240px] sm:max-w-[360px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sciblue-300 shadow-sm">
                Project Institution 2025
              </div>

              <div className="mb-4 flex items-start gap-4">
                <div className="group mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner">
                  <GraduationCap size={24} className={`text-sciblue-400 transition-transform duration-500 ${iconLiftClass}`} />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-bold leading-tight tracking-tight text-white">{t.title}</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{t.footer.school}</p>
                </div>
              </div>

              <p className="mt-auto font-mono text-xs text-slate-400">{t.footer.version}</p>
            </div>

            <div className="w-full min-w-0 flex-[0.95_1_260px] sm:min-w-[220px] sm:max-w-[340px]">
              <h3 className={headerStyle}>{t.footer.team}</h3>
              <ul className="space-y-5">
                <li className="group flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition-colors ${supportsHover ? 'group-hover:border-amber-500/50' : ''}`}>
                      <User size={14} className={`text-slate-300 ${supportsHover ? 'group-hover:text-amber-400' : ''}`} />
                    </div>
                    <div>
                      <span className={`block text-sm font-bold text-white transition-colors ${supportsHover ? 'group-hover:text-amber-400' : ''}`}>Project Team (Project Team)</span>
                      <span className="text-[10px] font-medium text-amber-500">{t.footer.role_leader}</span>
                    </div>
                  </div>
                </li>

                <li className="group flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition-colors ${supportsHover ? 'group-hover:border-sciblue-500/50' : ''}`}>
                      <User size={14} className={`text-slate-300 ${supportsHover ? 'group-hover:text-sciblue-400' : ''}`} />
                    </div>
                    <div>
                      <span className={`block text-sm font-medium text-slate-200 transition-colors ${accentHoverClass}`}>陈彻 (Chen Che)</span>
                      <span className="text-[10px] font-medium text-slate-400">{t.footer.role_algo}</span>
                    </div>
                  </div>
                </li>

                <li className="group border-t border-slate-800/50 pt-2">
                  <div className={`rounded-xl border border-transparent px-3 py-2.5 transition-all ${supportsHover ? 'hover:border-slate-700/60 hover:bg-slate-800/30 hover:shadow-sm' : ''}`}>
                    <p className={`text-[13px] font-semibold leading-7 text-slate-300 transition-colors ${supportsHover ? 'group-hover:text-sciblue-300' : ''}`}>申杰霖、季唐羽、欧一帅、张子航</p>
                    <span className="mt-1 block text-[11px] font-medium leading-5 text-slate-400">{t.footer.role_research}</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex w-full min-w-0 flex-[1_1_300px] flex-col gap-7 sm:min-w-[250px] sm:max-w-[360px]">
              <div>
                <h3 className={headerStyle}>{t.footer.supervisor}</h3>
                <div className={`group flex w-full max-w-[320px] items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 transition-colors ${supportsHover ? 'hover:bg-slate-800' : ''}`}>
                  <div className={`rounded-full bg-slate-700/50 p-2 text-slate-300 transition-colors ${supportsHover ? 'group-hover:text-white' : ''}`}>
                    <GraduationCap size={16} />
                  </div>
                  <span className="text-sm font-medium text-white">赵翔 (Zhao Xiang)</span>
                </div>
              </div>

              <div>
                <h3 className={headerStyle}>Acknowledgements</h3>
                <div className={`group w-full max-w-[320px] rounded-[20px] border border-slate-700/80 bg-slate-800/25 px-4 py-3 text-slate-300 transition-colors ${supportsHover ? 'hover:border-sciblue-500/30' : ''}`}>
                  <p className="flex items-start gap-3">
                    <Sparkles size={16} className={`mt-0.5 shrink-0 fill-amber-500/20 text-amber-400 ${supportsHover ? 'group-hover:animate-pulse' : ''}`} />
                    <span className="whitespace-pre-line text-[12px] leading-6 sm:text-[13px] [text-wrap:balance]">{t.footer.acknowledgement}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className={linksSectionClass}>
              <h3 className={headerStyle}>{t.footer.links}</h3>
              <div className={linksListClass}>
                <a
                  href="https://github.com/yanshi-qibixunchang/gas-laws-lab-history"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkItemClass}
                >
                  <Github size={18} className={`transition-transform ${iconLiftClass}`} />
                  <span>{t.footer.github}</span>
                </a>

                <a
                  href="#"
                  onClick={handleOpenPdf}
                  className={linkItemClass}
                >
                  <FileText size={18} className={`transition-all ${accentHoverClass} ${iconLiftClass}`} />
                  <span>{t.footer.report}</span>
                </a>

                <button
                  onClick={handleEmailClick}
                  className={linkButtonClass}
                >
                  {emailCopied ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <Mail size={18} className={`transition-all ${supportsHover ? 'group-hover:text-emerald-400' : ''} ${iconLiftClass}`} />
                  )}
                  <span className={emailCopied ? 'text-emerald-400' : ''}>{emailCopied ? t.footer.copied : t.footer.contact}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/50 py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 text-center text-[10px] uppercase tracking-widest text-slate-400 md:flex-row md:text-left lg:px-8">
            <p>
              © 2025 Hard Sphere Project. <br className="md:hidden" />
              All rights reserved.
            </p>
            <p className="mt-2 flex items-center justify-center gap-2 md:mt-0">
              <span className="h-1.5 w-1.5 rounded-full bg-sciblue-500" />
              {t.footer.designedBy}
            </p>
          </div>
        </div>
      </footer>

      {isPdfOpen && (
        <Suspense fallback={<PdfModalFallback />}>
          <PdfModal
            isOpen={isPdfOpen}
            onClose={() => setIsPdfOpen(false)}
            pdfPath="/Project_Report.pdf"
            title={t.footer.report}
            exportLabel={t.footer.exportPdf}
            exportFailedMessage={t.footer.exportFailed}
            showNotification={showNotification}
            supportsHover={supportsHover}
          />
        </Suspense>
      )}
    </>
  );
};

export default Footer;
