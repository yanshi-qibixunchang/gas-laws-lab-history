import { ArrowLeft, ChevronRight, ExternalLink, ListTree } from 'lucide-react';
import type { ReactNode, Ref, UIEventHandler } from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import type {
  WorkbenchBuildNoticeFilePreview,
  WorkbenchBuildNoticeLegalFile,
  WorkbenchBuildNoticeSection,
  WorkbenchLegalMaterialId,
} from './workbenchBuildNoticeContract.ts';

export interface WorkbenchBuildNoticeCopy {
  closeBuildNotice: string;
  buildNoticeTitle: string;
  buildNoticeSubtitle: string;
  buildNoticeNavToggle: string;
  buildNoticeNavTitle: string;
  buildNoticeBack: string;
  buildNoticeOpenLocalFile: string;
  buildNoticeOpenInBrowser: string;
  buildNoticeLargeFileBody: string;
  buildNoticePreviewUnavailable: string;
}

interface WorkbenchBuildNoticeWindowProps {
  open: boolean;
  copy: WorkbenchBuildNoticeCopy;
  sections: WorkbenchBuildNoticeSection[];
  legalMaterialFiles: Record<WorkbenchLegalMaterialId, WorkbenchBuildNoticeLegalFile>;
  navOpen: boolean;
  activeMaterialId: WorkbenchLegalMaterialId | null;
  filePreview: WorkbenchBuildNoticeFilePreview | null;
  openError: string | null;
  desktopLegalBridgeAvailable: boolean;
  desktopLegalReadAvailable: boolean;
  dismiss?: {
    closeButton: boolean;
    escape: boolean;
    backdrop: boolean;
  };
  bodyRef?: Ref<HTMLDivElement>;
  onBodyScroll?: UIEventHandler<HTMLDivElement>;
  footer?: ReactNode;
  extraDialogClassName?: string;
  onClose: () => void;
  onNavOpenChange: (open: boolean) => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenMaterial: (materialId: WorkbenchLegalMaterialId) => void;
  onCloseMaterial: () => void;
  onOpenLegalFile: (materialId: WorkbenchLegalMaterialId) => void;
}

export const WorkbenchBuildNoticeWindow = ({
  open,
  copy,
  sections,
  legalMaterialFiles,
  navOpen,
  activeMaterialId,
  filePreview,
  openError,
  desktopLegalBridgeAvailable,
  desktopLegalReadAvailable,
  dismiss,
  bodyRef,
  onBodyScroll,
  footer,
  extraDialogClassName,
  onClose,
  onNavOpenChange,
  onJumpToSection,
  onOpenMaterial,
  onCloseMaterial,
  onOpenLegalFile,
}: WorkbenchBuildNoticeWindowProps) => {
  if (!open) return null;

  const materialEntries = sections.flatMap((section) => section.materials ?? []);
  const activeMaterial = activeMaterialId
    ? materialEntries.find((material) => material.id === activeMaterialId) ?? null
    : null;
  const activeMaterialFile = activeMaterial ? legalMaterialFiles[activeMaterial.id] : null;
  const activeMaterialPreview = activeMaterial && filePreview?.id === activeMaterial.id ? filePreview : null;
  const openLegalFileLabel = !desktopLegalBridgeAvailable && activeMaterialFile?.previewPath
    ? copy.buildNoticeOpenInBrowser
    : copy.buildNoticeOpenLocalFile;

  return (
    <PromptDialogShell
      title={copy.buildNoticeTitle}
      titleId="studio-build-notice-title"
      subtitle={copy.buildNoticeSubtitle}
      variant="notice"
      closeLabel={dismiss?.closeButton === false ? undefined : copy.closeBuildNotice}
      dismiss={dismiss ?? { closeButton: true, escape: true, backdrop: true }}
      onRequestClose={onClose}
      overlayClassName="studio-build-notice-overlay"
      dialogClassName={`studio-build-notice-window ${navOpen ? 'studio-build-notice-nav-open' : ''} ${extraDialogClassName ?? ''}`}
      headerClassName="studio-build-notice-header"
      closeButtonClassName="studio-build-notice-close"
    >
        <div className="studio-build-notice-shell">
          <aside className="studio-build-notice-rail" aria-label={copy.buildNoticeNavTitle}>
            <button
              type="button"
              className="studio-build-notice-rail-toggle"
              aria-label={copy.buildNoticeNavToggle}
              aria-expanded={navOpen}
              onClick={() => onNavOpenChange(!navOpen)}
            >
              <ListTree size={15} />
            </button>
          </aside>
          {navOpen ? (
            <button
              type="button"
              className="studio-build-notice-nav-scrim"
              aria-label={copy.buildNoticeNavToggle}
              onClick={() => onNavOpenChange(false)}
            />
          ) : null}
          <nav className="studio-build-notice-nav-panel" aria-label={copy.buildNoticeNavTitle} aria-hidden={!navOpen}>
            <strong>{copy.buildNoticeNavTitle}</strong>
            <div>
              {sections.map((section) => (
                <button type="button" className="studio-build-notice-nav-item" key={section.id} onClick={() => onJumpToSection(section.id)}>
                  <span className="studio-build-notice-nav-item-text">{section.title}</span>
                </button>
              ))}
            </div>
          </nav>
          <div className={`studio-build-notice-body ${navOpen ? 'studio-build-notice-body-dimmed' : ''}`}
            ref={bodyRef}
            onScroll={onBodyScroll}
          >
            {activeMaterial && activeMaterialFile ? (
              <article className="studio-build-notice-document studio-build-notice-detail-document">
                <button type="button" className="studio-build-notice-back" onClick={onCloseMaterial}>
                  <ArrowLeft size={15} />
                  <span>{copy.buildNoticeBack}</span>
                </button>
                <h2 className="studio-build-notice-document-title">{activeMaterial.title}</h2>
                <p className="studio-build-notice-detail-summary">{activeMaterial.description}</p>
                <div className="studio-build-notice-detail-actions">
                  <button type="button" onClick={() => onOpenLegalFile(activeMaterial.id)}>
                    <ExternalLink size={15} />
                    <span>{openLegalFileLabel}</span>
                  </button>
                </div>
                {openError ? <p className="studio-build-notice-detail-error">{openError}</p> : null}
                {activeMaterialFile.largeFile ? (
                  <p className="studio-build-notice-detail-note">{copy.buildNoticeLargeFileBody}</p>
                ) : null}
                {!activeMaterialFile.largeFile && activeMaterialFile.previewKind === 'html' && activeMaterialFile.previewPath ? (
                  <iframe
                    className="studio-build-notice-detail-frame"
                    src={desktopLegalReadAvailable ? undefined : activeMaterialFile.previewPath}
                    srcDoc={desktopLegalReadAvailable ? activeMaterialPreview?.content : undefined}
                    title={activeMaterial.title}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                  />
                ) : null}
                {!activeMaterialFile.largeFile && activeMaterialFile.previewKind === 'text' ? (
                  activeMaterialPreview?.kind === 'text' ? (
                    <pre className="studio-build-notice-detail-text">{activeMaterialPreview.content}</pre>
                  ) : (
                    <p className="studio-build-notice-detail-note">{copy.buildNoticePreviewUnavailable}</p>
                  )
                ) : null}
                {!activeMaterialFile.largeFile && !activeMaterialFile.previewKind ? (
                  <p className="studio-build-notice-detail-note">{copy.buildNoticePreviewUnavailable}</p>
                ) : null}
              </article>
            ) : (
              <article className="studio-build-notice-document">
                <h2 className="studio-build-notice-document-title">{copy.buildNoticeTitle}</h2>
                {sections.map((section) => (
                  <section className="studio-build-notice-section" id={`studio-build-notice-section-${section.id}`} key={section.id}>
                    <span>{section.eyebrow}</span>
                    <h3>{section.title}</h3>
                    {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                    {section.bullets && section.bullets.length > 0 ? (
                      <ul>{section.bullets.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    ) : null}
                    {section.tables && section.tables.length > 0 ? (
                      section.tables.map((table, tableIndex) => (
                        <div className="studio-build-notice-table-wrap" key={tableIndex}>
                          <table>
                            <thead>
                              <tr>{table.headers.map((header) => <th key={header}>{header}</th>)}</tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))
                    ) : null}
                    {section.materials && section.materials.length > 0 ? (
                      <div className="studio-build-notice-materials">
                        {section.materials.map((material) => (
                          <button type="button" className="studio-build-notice-material-row" key={material.id} onClick={() => onOpenMaterial(material.id)}>
                            <span>
                              <strong>{material.title}</strong>
                              <small>{material.description}</small>
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </article>
            )}
          </div>
        </div>
        {footer}
    </PromptDialogShell>
  );
};
