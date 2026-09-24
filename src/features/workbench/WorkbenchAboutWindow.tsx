import { ChevronRight, Loader2 } from 'lucide-react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';

interface WorkbenchAboutWindowCopy {
  title: string;
  subtitle: string;
  closeAria: string;
  currentVersion: string;
  checkUpdates: string;
  localDataExportEnvironment: string;
  workspaceSessionCache: string;
  buildNotes: string;
  openBuildNotice: string;
  checking: string;
}

interface WorkbenchAboutWindowProps {
  open: boolean;
  copy: WorkbenchAboutWindowCopy;
  appVersion: string;
  updateChecking: boolean;
  updateStatusLabel: string;
  environmentChecking: boolean;
  environmentAvailable: boolean;
  environmentStatusLabel: string;
  sessionCacheSummary: { summary: string; breakdown: string };
  onClose: () => void;
  onCheckUpdates: () => void;
  onCheckEnvironment: () => void;
  onOpenBuildNotice: () => void;
  browserCopy?: { edition: string; button: string; exportLabel: string; desktopOnly: string };
}

export const WorkbenchAboutWindow = ({
  open,
  copy,
  appVersion,
  updateChecking,
  updateStatusLabel,
  environmentChecking,
  environmentAvailable,
  environmentStatusLabel,
  sessionCacheSummary,
  onClose,
  onCheckUpdates,
  onCheckEnvironment,
  onOpenBuildNotice,
  browserCopy,
}: WorkbenchAboutWindowProps) => {
  if (!open) return null;

  return (
    <PromptDialogShell
      title={copy.title}
      titleId="studio-about-title"
      subtitle={copy.subtitle}
      variant="task"
      closeLabel={copy.closeAria}
      dismiss={{ closeButton: true, escape: true, backdrop: true }}
      onRequestClose={onClose}
      returnFocusSelector="[data-workbench-top-command='help']"
      overlayClassName="studio-settings-overlay studio-about-overlay"
      dialogClassName="studio-settings-window studio-about-window"
      headerClassName="studio-settings-header studio-about-header"
      closeButtonClassName="studio-settings-close"
    >
        <div className="studio-about-body">
          <section className="studio-about-card">
            <div className="studio-about-row">
              <span className="studio-about-label">{copy.currentVersion}</span>
              <span className="studio-about-value"><strong>{appVersion}{browserCopy ? ` · ${browserCopy.edition}` : ''}</strong></span>
            </div>
            <button type="button" className="studio-about-row studio-about-action-row" onClick={onCheckUpdates}>
              <span className="studio-about-label">{browserCopy?.button ?? copy.checkUpdates}</span>
              <span className="studio-about-value">
                <span>{browserCopy ? 'Windows' : updateChecking ? copy.checking : updateStatusLabel}</span>
                <span className="studio-about-action-icon" aria-hidden="true">
                  {updateChecking ? <Loader2 size={15} /> : <ChevronRight size={17} />}
                </span>
              </span>
            </button>
            <button type="button" className="studio-about-row studio-about-action-row" onClick={onCheckEnvironment}>
              <span className="studio-about-label">{browserCopy?.exportLabel ?? copy.localDataExportEnvironment}</span>
              <span className="studio-about-value">
                <span className="studio-about-status">
                  {!browserCopy && <i className={`studio-about-status-dot ${environmentAvailable ? 'studio-about-status-dot-ready' : ''}`} />}
                  <span>{browserCopy?.desktopOnly ?? environmentStatusLabel}</span>
                </span>
                <span className="studio-about-action-icon" aria-hidden="true">
                  {environmentChecking ? <Loader2 size={15} /> : <ChevronRight size={17} />}
                </span>
              </span>
            </button>
            <div className="studio-about-row studio-about-cache-row">
              <span className="studio-about-label">{copy.workspaceSessionCache}</span>
              <span className="studio-about-value">
                <strong>{sessionCacheSummary.summary}</strong>
                <span className="studio-about-cache-breakdown">{sessionCacheSummary.breakdown}</span>
              </span>
            </div>
            <button type="button" className="studio-about-row studio-about-action-row" onClick={onOpenBuildNotice} aria-label={copy.openBuildNotice}>
              <span className="studio-about-label">{copy.buildNotes}</span>
              <span className="studio-about-value">
                <span className="studio-about-action-icon" aria-hidden="true">
                  <ChevronRight size={17} />
                </span>
              </span>
            </button>
          </section>
        </div>

    </PromptDialogShell>
  );
};
