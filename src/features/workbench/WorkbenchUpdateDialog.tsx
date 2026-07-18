import { Download, Loader2, X } from 'lucide-react';
import {
  formatWorkbenchReleaseDate,
  getWorkbenchLocalizedText,
  isWorkbenchUpdateCheckFailure,
  type WorkbenchUpdateState,
} from './workbenchDesktopUpdater.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

export interface WorkbenchUpdateDialogCopy {
  updateReadyTitle: string;
  updateAvailableTitle: string;
  updateCheckFailedTitle: string;
  updateReadyBody: string;
  updateAvailableBody: string;
  updateCheckFailedBody: string;
  updateReadyStatus: string;
  retryingUpdateStatus: (attempt: number | null, maxAttempts: number | null) => string;
  updateDownloadFailedStatus: (attempt: number | null, maxAttempts: number | null) => string;
  downloadingUpdateStatus: (percent: number | null) => string;
  noReleaseNotes: string;
  later: string;
  currentVersionLabel: string;
  latestVersionLabel: string;
  releaseDateLabel: string;
  releaseNotesLabel: string;
  restartAndInstall: string;
  retryCheck: string;
  retryDownload: string;
  manualDownload: string;
  ignoreThisVersion: string;
  updateNow: string;
}

interface WorkbenchUpdateDialogProps {
  state: WorkbenchUpdateState | null;
  appVersion: string;
  language: WorkbenchLanguagePreference;
  copy: WorkbenchUpdateDialogCopy;
  onClose: () => void;
  onIgnoreVersion: () => void;
  onDownload: () => void;
  onRestartAndInstall: () => void;
  onManualDownload: () => void;
}

export const WorkbenchUpdateDialog = ({
  state,
  appVersion,
  language,
  copy,
  onClose,
  onIgnoreVersion,
  onDownload,
  onRestartAndInstall,
  onManualDownload,
}: WorkbenchUpdateDialogProps) => {
  if (!state) return null;

  const downloading = state.status === 'downloading';
  const retrying = state.status === 'retrying';
  const downloaded = state.status === 'downloaded';
  const installing = state.status === 'installing';
  const failed = state.status === 'error';
  const checkFailed = isWorkbenchUpdateCheckFailure(state);
  const releaseNotes = state.releaseNotes?.trim() || copy.noReleaseNotes;
  const releaseSummary = getWorkbenchLocalizedText(state.releaseSummary, language);
  const releaseSections = state.releaseSections ?? [];
  const latestVersion = state.latestVersion || '--';
  const title = downloaded || installing
    ? copy.updateReadyTitle
    : checkFailed
      ? copy.updateCheckFailedTitle
      : copy.updateAvailableTitle;
  const body = downloaded || installing
    ? copy.updateReadyBody
    : checkFailed
      ? copy.updateCheckFailedBody
      : copy.updateAvailableBody;
  const statusMessage = installing
    ? copy.updateReadyStatus
    : retrying
      ? copy.retryingUpdateStatus(state.downloadAttempt ?? null, state.maxDownloadAttempts ?? null)
      : checkFailed
        ? copy.updateCheckFailedBody
        : failed
        ? copy.updateDownloadFailedStatus(state.downloadAttempt ?? null, state.maxDownloadAttempts ?? null)
        : copy.downloadingUpdateStatus(state.percent ?? null);
  const showStatus = downloading || retrying || installing || failed;

  return (
    <div className="studio-settings-overlay studio-update-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="studio-settings-window studio-update-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-update-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="studio-settings-header studio-update-header">
          <div>
            <strong id="studio-update-title">{title}</strong>
            <span>{body}</span>
          </div>
          <button type="button" className="studio-settings-close" aria-label={copy.later} onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="studio-update-body">
          <div className="studio-update-version-grid">
            <span>{copy.currentVersionLabel}</span>
            <strong>{state.currentVersion || appVersion}</strong>
            <span>{copy.latestVersionLabel}</span>
            <strong>{latestVersion}</strong>
            <span>{copy.releaseDateLabel}</span>
            <strong>{formatWorkbenchReleaseDate(state.releaseDate, language)}</strong>
          </div>
          {releaseSummary ? <p className="studio-update-summary">{releaseSummary}</p> : null}
          <section className="studio-update-notes">
            <strong>{copy.releaseNotesLabel}</strong>
            {releaseSections.length > 0 ? (
              <div className="studio-update-note-sections">
                {releaseSections.map((section) => {
                  const sectionTitle = getWorkbenchLocalizedText(section.title, language) || section.type;
                  return (
                    <section className="studio-update-note-section" key={section.type}>
                      <h4>{sectionTitle}</h4>
                      <ul>
                        {section.items.map((item, index) => {
                          const itemTitle = getWorkbenchLocalizedText(item.title, language) || item.scope;
                          const itemBody = getWorkbenchLocalizedText(item.body, language);
                          return (
                            <li key={`${item.scope}-${index}`}>
                              <span>{itemTitle}</span>
                              {itemBody ? <p>{itemBody}</p> : null}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : (
              <p>{releaseNotes}</p>
            )}
          </section>
          {showStatus ? (
            <div className={`studio-update-status studio-update-status-${state.status}`}>
              <span>{statusMessage}</span>
              {downloading || installing ? (
                <i style={{ width: `${Math.max(0, Math.min(100, state.percent ?? 0))}%` }} />
              ) : null}
            </div>
          ) : null}
        </div>
        <footer className="studio-update-actions">
          {downloaded || installing ? (
            <>
              <button type="button" className="studio-update-secondary" onClick={onClose}>
                {copy.later}
              </button>
              <button type="button" className="studio-update-primary" onClick={onRestartAndInstall} disabled={installing}>
                {installing ? <Loader2 size={14} /> : <Download size={14} />}
                {copy.restartAndInstall}
              </button>
            </>
          ) : failed ? (
            <>
              <button type="button" className="studio-update-secondary" onClick={onClose}>
                {copy.later}
              </button>
              <button type="button" className="studio-update-secondary" onClick={onDownload}>
                <Download size={14} />
                {checkFailed ? copy.retryCheck : copy.retryDownload}
              </button>
              <button type="button" className="studio-update-primary" onClick={onManualDownload}>
                <Download size={14} />
                {copy.manualDownload}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="studio-update-secondary" onClick={onIgnoreVersion} disabled={downloading || retrying}>
                {copy.ignoreThisVersion}
              </button>
              <button type="button" className="studio-update-primary" onClick={onDownload} disabled={downloading || retrying}>
                {downloading || retrying ? <Loader2 size={14} /> : <Download size={14} />}
                {copy.updateNow}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
};
