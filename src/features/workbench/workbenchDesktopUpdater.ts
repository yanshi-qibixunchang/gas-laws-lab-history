import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

export type WorkbenchUpdateStatus = DesktopUpdateStatus;
export type WorkbenchLocalizedText = Record<string, string>;
export type WorkbenchUpdateReleaseItem = DesktopUpdateReleaseItem;
export type WorkbenchUpdateReleaseSection = DesktopUpdateReleaseSection;
export type WorkbenchUpdateState = DesktopUpdateState;

export interface WorkbenchUpdateStatusCopy {
  checking: string;
  available: string;
  updateAvailableStatus: (version: string) => string;
  upToDateStatus: string;
  downloadingUpdateStatus: (percent: number | null) => string;
  retryingUpdateStatus: (attempt: number | null, maxAttempts: number | null) => string;
  updateReadyStatus: string;
  unsupportedUpdateStatus: string;
  updateErrorStatus: string;
}

export const WORKBENCH_IGNORED_UPDATE_VERSION_KEY = 'hslIgnoredUpdateVersion';

export const mergeWorkbenchUpdateDialogState = (
  nextState: WorkbenchUpdateState,
  previousState: WorkbenchUpdateState | null,
): WorkbenchUpdateState => {
  if (!previousState) return nextState;
  const nextVersion = nextState.latestVersion ?? null;
  const previousVersion = previousState.latestVersion ?? null;
  if (nextVersion && previousVersion && nextVersion !== previousVersion) return nextState;

  return {
    ...nextState,
    releaseName: nextState.releaseName ?? previousState.releaseName,
    releaseDate: nextState.releaseDate ?? previousState.releaseDate,
    releaseNotes: nextState.releaseNotes ?? previousState.releaseNotes,
    releaseSummary: nextState.releaseSummary ?? previousState.releaseSummary,
    releaseSections: nextState.releaseSections ?? previousState.releaseSections,
    releasePageUrl: nextState.releasePageUrl ?? previousState.releasePageUrl,
    manualDownloadUrl: nextState.manualDownloadUrl ?? previousState.manualDownloadUrl,
  };
};

export const getAboutUpdateStatusLabel = (
  state: WorkbenchUpdateState,
  copy: WorkbenchUpdateStatusCopy,
  desktopUpdaterAvailable: boolean,
) => {
  if (state.status === 'checking') return copy.checking;
  if (state.status === 'available') return copy.updateAvailableStatus(state.latestVersion || '--');
  if (state.status === 'not-available') return copy.upToDateStatus;
  if (state.status === 'downloading') return copy.downloadingUpdateStatus(state.percent ?? null);
  if (state.status === 'retrying') {
    return copy.retryingUpdateStatus(state.downloadAttempt ?? null, state.maxDownloadAttempts ?? null);
  }
  if (state.status === 'downloaded') return copy.updateReadyStatus;
  if (state.status === 'unsupported') return copy.unsupportedUpdateStatus;
  if (state.status === 'error') return copy.updateErrorStatus;
  return desktopUpdaterAvailable ? copy.available : copy.unsupportedUpdateStatus;
};

export const getWorkbenchLocalizedText = (
  value: WorkbenchLocalizedText | null | undefined,
  language: WorkbenchLanguagePreference,
) => value?.[language] || value?.['zh-CN'] || value?.en || null;

export const formatWorkbenchReleaseDate = (
  value: string | null | undefined,
  language: WorkbenchLanguagePreference,
) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = language === 'en' ? 'en-GB' : language;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
