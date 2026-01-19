import React, { useState } from 'react';
import { Translation } from '../types';
import { Github, FileText, Mail, GraduationCap, Sparkles, Check, User } from 'lucide-react';
import PdfModal from './PdfModal';

interface FooterProps {
  t: Translation;
  showNotification: (text: string, duration?: number, type?: 'info' | 'success' | 'warning') => void;
}

const Footer: React.FC<FooterProps> = ({ t, showNotification }) => {
  const [emailCopied, setEmailCopied] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const email = "project-team@users.noreply.github.com";
    
    // Copy to clipboard first
    navigator.clipboard.writeText(email).then(() => {
      setEmailCopied(true);
      showNotification(t.footer.emailCopiedMsg, 2000, 'success');
      
      // Reset copied state after animation
      setTimeout(() => setEmailCopied(false), 2000); 
      
      // Add delay before opening mail client so user sees the notification
      setTimeout(() => {
          window.location.href = `mailto:${email}`;
      }, 1000);
    });
  };

  const handleOpenPdf = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPdfOpen(true);
  };

  // Header Style - Brightened to text-slate-300
  const HeaderStyle = "text-xs font-bold text-slate-300 uppercase tracking-widest mb-6 h-5 flex items-center";

  return (
    <>
      <footer className="w-full bg-slate-900 text-slate-300 mt-20 border-t border-slate-800 relative overflow-hidden z-10 shrink-0">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sciblue-500/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 md:gap-x-12">
          
          {/* --- Col 1: Brand (Span 4) --- */}
          <div className="md:col-span-4 flex flex-col items-start pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 text-sciblue-300 text-[10px] font-bold tracking-widest uppercase border border-slate-700 mb-6 shadow-sm">
               Project Institution 2025
            </div>
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700 shadow-inner mt-1 shrink-0 group">
                  <GraduationCap size={24} className="text-sciblue-400 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-white tracking-tight leading-tight mb-2">{t.title}</h2>
                  {/* Lightened description from slate-400 to slate-300, enable line break via whitespace-pre-line */}
                  <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                      {t.footer.school}
                  </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-auto font-mono">{t.footer.version}</p>
          </div>

          {/* --- Col 2: Team (Span 3) --- */}
          <div className="md:col-span-3">
            <h3 className={HeaderStyle}>{t.footer.team}</h3>
            <ul className="space-y-5">
              {/* Leader */}
              <li className="flex flex-col gap-1 group">
                 <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-amber-500/50 transition-colors">
                        <User size={14} className="text-slate-300 group-hover:text-amber-400"/>
                     </div>
                     <div>
                        <span className="text-white font-bold text-sm block group-hover:text-amber-400 transition-colors">Project Team (Project Team)</span>
                        <span className="text-[10px] text-amber-500 font-medium">
                            {t.footer.role_leader}
                        </span>
                     </div>
                 </div>
              </li>
              
              {/* Algo */}
              <li className="flex flex-col gap-1 group">
                 <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-sciblue-500/50 transition-colors">
                        <User size={14} className="text-slate-300 group-hover:text-sciblue-400"/>
                     </div>
                     <div>
                        <span className="text-slate-200 font-medium text-sm block group-hover:text-sciblue-400 transition-colors">陈彻 (Chen Che)</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {t.footer.role_algo}
                        </span>
                     </div>
                 </div>
              </li>

              {/* Research */}
              <li className="pt-2 border-t border-slate-800/50">
                 <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">{t.footer.role_research}</span>
                     <p className="text-slate-300 text-xs leading-relaxed">
                        申杰霖, 季唐羽, 欧一帅, 张子航
                     </p>
                 </div>
              </li>
            </ul>
          </div>

          {/* --- Col 3: Supervisor & Ack (Span 3) --- */}
          <div className="md:col-span-3 flex flex-col gap-8">
            {/* Supervisor Block */}
            <div>
              <h3 className={HeaderStyle}>{t.footer.supervisor}</h3>
              <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors group">
                <div className="bg-slate-700/50 p-2 rounded-full text-slate-300 group-hover:text-white transition-colors">
                    <GraduationCap size={16}/>
                </div>
                <span className="font-medium text-sm text-white">赵翔 (Zhao Xiang)</span>
              </div>
            </div>
            
            {/* Acknowledgements Block - ALIGNED VERTICALLY */}
            <div>
              <h3 className={HeaderStyle}>Acknowledgements</h3>
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-700 hover:border-sciblue-500/30 transition-colors group">
                 <p className="flex items-start gap-3">
                    <Sparkles size={16} className="mt-0.5 text-amber-400 shrink-0 fill-amber-500/20 group-hover:animate-pulse"/>
                    {/* Enable line break */}
                    <span className="leading-5 whitespace-pre-line">{t.footer.acknowledgement}</span>
                 </p>
              </div>
            </div>
          </div>

          {/* --- Col 4: Links (Span 2) --- */}
          <div className="md:col-span-2">
             <h3 className={HeaderStyle}>{t.footer.links}</h3>
             <div className="flex flex-col gap-2">
                {/* GitHub */}
                <a href="https://github.com/yanshi-qibixunchang/gas-laws-lab-history" target="_blank" rel="noopener noreferrer" 
                   className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-all group p-2 hover:bg-slate-800 rounded-lg -ml-2"
                >
                    <Github size={18} className="group-hover:scale-110 transition-transform"/> 
                    <span>{t.footer.github}</span>
                </a>
                
                {/* PDF */}
                <a href="#" onClick={handleOpenPdf}
                   className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-all group p-2 hover:bg-slate-800 rounded-lg -ml-2"
                >
                    <FileText size={18} className="group-hover:text-sciblue-400 group-hover:scale-110 transition-all"/> 
                    <span>{t.footer.report}</span>
                </a>

                {/* Email */}
                <button onClick={handleEmailClick}
                   className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-all group p-2 hover:bg-slate-800 rounded-lg -ml-2 w-full text-left"
                >
                    {emailCopied ? <Check size={18} className="text-emerald-400"/> : <Mail size={18} className="group-hover:text-emerald-400 group-hover:scale-110 transition-all"/>}
                    <span className={emailCopied ? "text-emerald-400" : ""}>{emailCopied ? t.footer.copied : t.footer.contact}</span>
                </button>
             </div>
          </div>

        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="bg-slate-950/50 border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest text-center md:text-left">
            <p>
                © 2025 Hard Sphere Project. <br className="md:hidden"/>
                All rights reserved.
            </p>
            <p className="mt-2 md:mt-0 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sciblue-500"></span>
                {t.footer.designedBy}
            </p>
        </div>
      </div>
      </footer>
      <PdfModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        pdfPath="/Project_Report.pdf"
        title={t.footer.report}
        showNotification={showNotification}
      />
    </>
  );
};

export default Footer;
