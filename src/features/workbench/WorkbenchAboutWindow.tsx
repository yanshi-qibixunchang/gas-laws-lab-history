import { ChevronRight, Loader2, X } from 'lucide-react';

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
  resultNotice: { title: string; body: string } | null;
  onClose: () => void;
  onCheckUpdates: () => void;
  onCheckEnvironment: () => void;
  onOpenBuildNotice: () => void;
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
  resultNotice,
  onClose,
  onCheckUpdates,
  onCheckEnvironment,
  onOpenBuildNotice,
}: WorkbenchAboutWindowProps) => {
  if (!open) return null;

  return (
    <div className="studio-settings-overlay studio-about-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="studio-settings-window studio-about-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-about-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="studio-settings-header studio-about-header">
          <div>
            <strong id="studio-about-title">{copy.title}</strong>
            <span>{copy.subtitle}</span>
          </div>
          <button type="button" className="studio-settings-close" aria-label={copy.closeAria} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="studio-about-body">
          <section className="studio-about-card">
            <div className="studio-about-row">
              <span className="studio-about-label">{copy.currentVersion}</span>
              <span className="studio-about-value"><strong>{appVersion}</strong></span>
            </div>
            <button type="button" className="studio-about-row studio-about-action-row" onClick={onCheckUpdates}>
              <span className="studio-about-label">{copy.checkUpdates}</span>
              <span className="studio-about-value">
                <span>{updateChecking ? copy.checking : updateStatusLabel}</span>
                <span className="studio-about-action-icon" aria-hidden="true">
                  {updateChecking ? <Loader2 size={15} /> : <ChevronRight size={17} />}
                </span>
              </span>
            </button>
            <button type="button" className="studio-about-row studio-about-action-row" onClick={onCheckEnvironment}>
              <span className="studio-about-label">{copy.localDataExportEnvironment}</span>
              <span className="studio-about-value">
                <span className="studio-about-status">
                  <i className={`studio-about-status-dot ${environmentAvailable ? 'studio-about-status-dot-ready' : ''}`} />
                  <span>{environmentStatusLabel}</span>
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

        {resultNotice ? (
          <div className="studio-about-result-toast" role="status" aria-live="polite">
            <strong>{resultNotice.title}</strong>
            <span>{resultNotice.body}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
};
