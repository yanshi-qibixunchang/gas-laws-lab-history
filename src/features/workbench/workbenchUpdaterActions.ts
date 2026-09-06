import type { Dispatch, SetStateAction } from 'react';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
import type { PromptFeedbackKind } from '../../components/prompts/promptFeedbackPolicy.ts';
import { getAboutUpdateStatusLabel, isWorkbenchUpdateCheckFailure, mergeWorkbenchUpdateState, type WorkbenchUpdateState } from './workbenchDesktopUpdater.ts';

export interface WorkbenchUpdaterActionPorts {
  appVersion: string;
  updaterState: WorkbenchUpdateState;
  updateDialogState: WorkbenchUpdateState | null;
  aboutUpdateChecking: boolean;
  aboutCopy: WorkbenchCopy['about'];
  setUpdaterState: Dispatch<SetStateAction<WorkbenchUpdateState>>;
  setUpdateDialogOpen: (open: boolean) => void;
  getIgnoredUpdateVersion: () => string | null;
  rememberIgnoredUpdateVersion: (version: string) => void;
  showAboutResultNotice: (title: string, body: string, kind?: PromptFeedbackKind) => void;
  readUpdaterBridge: () => Window['hardSphereLabUpdater'];
  hasUpdaterBridge: () => boolean;
}

export const createWorkbenchUpdaterActions = ({ appVersion, updaterState, updateDialogState, aboutUpdateChecking, aboutCopy, setUpdaterState, setUpdateDialogOpen, getIgnoredUpdateVersion, rememberIgnoredUpdateVersion, showAboutResultNotice, readUpdaterBridge, hasUpdaterBridge }: WorkbenchUpdaterActionPorts) => {
  const applyUpdaterState = (nextState: WorkbenchUpdateState, options: { manual?: boolean } = {}) => {
    setUpdaterState((currentState) => mergeWorkbenchUpdateState(nextState, currentState));

    if (nextState.status === 'available') {
      const latestVersion = nextState.latestVersion || '';
      if (latestVersion && getIgnoredUpdateVersion() === latestVersion) {
        setUpdateDialogOpen(false);
        if (options.manual) {
          showAboutResultNotice(
            aboutCopy.ignoredVersionTitle,
            aboutCopy.ignoredVersionBody(latestVersion),
            'info',
          );
        }
        return;
      }
      setUpdateDialogOpen(true);
      return;
    }

    if (
      nextState.status === 'downloading'
      || nextState.status === 'retrying'
      || nextState.status === 'downloaded'
      || nextState.status === 'installing'
      || (nextState.status === 'error' && hasUpdaterBridge())
    ) {
      setUpdateDialogOpen(true);
      return;
    }

    setUpdateDialogOpen(false);

    if (nextState.status === 'not-available' && options.manual) {
      showAboutResultNotice(
        aboutCopy.updateResultTitle,
        aboutCopy.upToDateStatus,
        'success',
      );
      return;
    }

    if ((nextState.status === 'unsupported' || nextState.status === 'error') && options.manual) {
      showAboutResultNotice(
        aboutCopy.updateResultTitle,
        getAboutUpdateStatusLabel(nextState, aboutCopy, hasUpdaterBridge()),
        nextState.status === 'error' ? 'danger' : 'warning',
      );
    }
  };

  const runAboutUpdateCheck = () => {
    if (aboutUpdateChecking) return;
    const updateCheckRequest = readUpdaterBridge()?.checkForUpdates?.();
    if (!updateCheckRequest) {
      const unsupportedState: WorkbenchUpdateState = {
        ...updaterState,
        status: 'unsupported',
        currentVersion: appVersion,
        message: aboutCopy.unsupportedUpdateStatus,
      };
      applyUpdaterState(unsupportedState, { manual: true });
      return;
    }
    setUpdaterState((currentState) => ({
      ...currentState,
      status: 'checking',
      message: '',
      errorStage: null,
    }));
    void updateCheckRequest
      .then((result) => applyUpdaterState(result, { manual: true }))
      .catch((error) => {
        console.error('[Workbench] Update check failed:', error);
        applyUpdaterState({
          ...updaterState,
          status: 'error',
          currentVersion: appVersion,
          message: aboutCopy.updateErrorStatus,
          errorStage: 'check',
        }, { manual: true });
      });
  };

  const ignoreUpdateDialogVersion = () => {
    const version = updaterState.latestVersion;
    if (version) {
      rememberIgnoredUpdateVersion(version);
      showAboutResultNotice(
        aboutCopy.ignoredVersionTitle,
        aboutCopy.ignoredVersionBody(version),
        'info',
      );
    }
    setUpdateDialogOpen(false);
  };

  const startUpdateDownload = () => {
    if (!updateDialogState) return;
    if (isWorkbenchUpdateCheckFailure(updateDialogState)) {
      setUpdateDialogOpen(false);
      runAboutUpdateCheck();
      return;
    }
    const downloadRequest = readUpdaterBridge()?.downloadUpdate?.();
    if (!downloadRequest) return;
    setUpdaterState((currentState) => ({
      ...currentState,
      status: 'downloading',
      percent: 0,
      errorStage: null,
    }));
    void downloadRequest
      .then((result) => applyUpdaterState(result))
      .catch((error) => {
        console.error('[Workbench] Update download failed:', error);
        applyUpdaterState({
          ...updaterState,
          status: 'error',
          currentVersion: appVersion,
          message: aboutCopy.updateErrorStatus,
          errorStage: 'download',
        }, { manual: true });
      });
  };

  const restartAndInstallUpdate = () => {
    if (!updateDialogState) return;
    const installRequest = readUpdaterBridge()?.quitAndInstall?.();
    if (!installRequest) return;
    setUpdaterState((currentState) => ({ ...currentState, status: 'installing', percent: 100 }));
    void installRequest
      .then((result) => applyUpdaterState(result))
      .catch((error) => {
        console.error('[Workbench] Restart and install failed:', error);
        setUpdaterState((currentState) => ({
          ...currentState,
          status: 'error',
          message: aboutCopy.updateErrorStatus,
        }));
      });
  };



  const openManualUpdateDownload = () => {
    const manualDownloadRequest = readUpdaterBridge()?.openManualDownload?.();
    if (!manualDownloadRequest) return;
    void manualDownloadRequest.then((result) => {
      if (result.status === 'error') {
        console.error('[Workbench] Manual update page failed to open:', result.message);
        showAboutResultNotice(
          aboutCopy.updateResultTitle,
          aboutCopy.updateErrorStatus,
          'danger',
        );
      }
    }).catch((error) => {
      console.error('[Workbench] Manual update page failed to open:', error);
      showAboutResultNotice(
        aboutCopy.updateResultTitle,
        aboutCopy.updateErrorStatus,
        'danger',
      );
    });
  };
  return { openManualUpdateDownload, applyUpdaterState, runAboutUpdateCheck, ignoreUpdateDialogVersion, startUpdateDownload, restartAndInstallUpdate };
};
