import { useEffect, useState } from 'react';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
import type { PromptFeedbackKind } from '../../components/prompts/promptFeedbackPolicy.ts';
import { hasDesktopUpdaterBridge } from './workbenchDesktopCapabilities.ts';
import { WORKBENCH_IGNORED_UPDATE_VERSION_KEY, type WorkbenchUpdateState } from './workbenchDesktopUpdater.ts';
import type { WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshBoolean } from './workbenchHeatCapacityUiCheckpoint.ts';
import { createWorkbenchUpdaterActions } from './workbenchUpdaterActions.ts';

export const useWorkbenchUpdaterController = ({ appVersion, initialHeatCapacityRefreshWindows, aboutCopy, showAboutResultNotice }: {
  appVersion: string;
  initialHeatCapacityRefreshWindows: WorkbenchHeatCapacityRefreshSession['ui']['windows'];
  aboutCopy: WorkbenchCopy['about'];
  showAboutResultNotice: (title: string, body: string, kind?: PromptFeedbackKind) => void;
}) => {
  const [updaterState, setUpdaterState] = useState<WorkbenchUpdateState>(() => ({
    status: hasDesktopUpdaterBridge() ? 'idle' : 'unsupported',
    currentVersion: appVersion,
    latestVersion: null,
    releaseName: null,
    releaseDate: null,
    releaseNotes: null,
    releaseSummary: null,
    releaseSections: null,
    releasePageUrl: null,
    manualDownloadUrl: null,
    downloadAttempt: null,
    maxDownloadAttempts: null,
    retrying: false,
    errorKind: null,
    percent: null,
    message: '',
  }));
  const [updateDialogOpen, setUpdateDialogOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'updateDialogOpen')
  ));
  const aboutUpdateChecking = updaterState.status === 'checking';
  const updateDialogState = updateDialogOpen ? updaterState : null;
  const getIgnoredUpdateVersion = () => (
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(WORKBENCH_IGNORED_UPDATE_VERSION_KEY)
  );

  const rememberIgnoredUpdateVersion = (version: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKBENCH_IGNORED_UPDATE_VERSION_KEY, version);
    }
  };


  const actions = createWorkbenchUpdaterActions({
    appVersion, updaterState, updateDialogState, aboutUpdateChecking, aboutCopy,
    setUpdaterState, setUpdateDialogOpen, getIgnoredUpdateVersion, rememberIgnoredUpdateVersion,
    showAboutResultNotice, readUpdaterBridge: () => window.hardSphereLabUpdater,
    hasUpdaterBridge: hasDesktopUpdaterBridge,
  });
  useEffect(() => {
    const unsubscribe = window.hardSphereLabUpdater?.onStatus?.((state) => {
      actions.applyUpdaterState(state);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [aboutCopy]);
  return { updaterState, updateDialogOpen, updateDialogState, aboutUpdateChecking,
    closeUpdateDialog: () => setUpdateDialogOpen(false),
    openManualUpdateDownload: actions.openManualUpdateDownload,
    runAboutUpdateCheck: actions.runAboutUpdateCheck,
    ignoreUpdateDialogVersion: actions.ignoreUpdateDialogVersion,
    startUpdateDownload: actions.startUpdateDownload,
    restartAndInstallUpdate: actions.restartAndInstallUpdate,
  };
};
