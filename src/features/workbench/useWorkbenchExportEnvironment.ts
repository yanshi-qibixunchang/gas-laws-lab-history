import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { hasDesktopExportBridge, isExportEnvironmentAvailableStatus, getAboutEnvironmentResultBody } from './workbenchDesktopCapabilities.ts';
import { workbenchCopies, type WorkbenchCopy } from './workbenchStudioCopy.ts';
import type { WorkbenchExportEnvironmentStatus } from './workbenchFileState.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { createConsoleLog, type ConsoleLog } from './workbenchConsolePresentation.ts';
import type { WorkbenchLogWriter } from './workbenchActionPorts.ts';
import type { PromptFeedbackKind } from '../../components/prompts/promptFeedbackPolicy.ts';
export const useWorkbenchExportEnvironment = ({ tutorialActiveRef, settingsLanguagePreference, workbenchCopy, setLogs, pushLog, showAboutResultNotice }: {
  tutorialActiveRef: { current: boolean };
  settingsLanguagePreference: WorkbenchLanguagePreference;
  workbenchCopy: WorkbenchCopy;
  setLogs: Dispatch<SetStateAction<ConsoleLog[]>>;
  pushLog: WorkbenchLogWriter;
  showAboutResultNotice: (title: string, body: string, kind?: PromptFeedbackKind) => void;
}) => {
  const [exportEnvironmentStatus, setExportEnvironmentStatus] = useState<WorkbenchExportEnvironmentStatus>(() => (
    hasDesktopExportBridge() ? 'checking' : 'unavailable'
  ));
  useEffect(() => {
    const bridge = window.hardSphereLabExporter;
    if (!bridge) {
      setExportEnvironmentStatus('unavailable');
      return;
    }

    let cancelled = false;
    setExportEnvironmentStatus('checking');

    bridge.checkExportEnvironment()
      .then((result) => {
        if (cancelled) return;
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        setExportEnvironmentStatus(nextStatus);
        if (tutorialActiveRef.current) return;
        setLogs((current) => [
          ...current,
          createConsoleLog(
            current.length + 1,
            nextStatus === 'available-system' || nextStatus === 'available-bundled' ? 'success' : 'warning',
            (language) => workbenchCopies[language].exportEnvironment[nextStatus].detail,
            settingsLanguagePreference,
          ),
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        setExportEnvironmentStatus('error');
        if (tutorialActiveRef.current) return;
        setLogs((current) => [
          ...current,
          createConsoleLog(
            current.length + 1,
            'error',
            (language) => workbenchCopies[language].exportEnvironment.error.detail,
            settingsLanguagePreference,
          ),
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const runAboutEnvironmentCheck = () => {
    const bridge = window.hardSphereLabExporter;
    setExportEnvironmentStatus('checking');

    if (!bridge) {
      window.setTimeout(() => {
        const nextStatus: WorkbenchExportEnvironmentStatus = 'unavailable';
        setExportEnvironmentStatus(nextStatus);
        showAboutResultNotice(
          workbenchCopy.about.environmentResultTitle,
          getAboutEnvironmentResultBody(nextStatus, workbenchCopy),
          'warning',
        );
      }, 650);
      return;
    }

    bridge.checkExportEnvironment()
      .then((result) => {
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        setExportEnvironmentStatus(nextStatus);
        pushLog(
          (language) => workbenchCopies[language].exportEnvironment[nextStatus].detail,
          isExportEnvironmentAvailableStatus(nextStatus) ? 'success' : 'warning',
        );
        showAboutResultNotice(
          workbenchCopy.about.environmentResultTitle,
          getAboutEnvironmentResultBody(nextStatus, workbenchCopy),
          isExportEnvironmentAvailableStatus(nextStatus) ? 'success' : 'warning',
        );
      })
      .catch(() => {
        const nextStatus: WorkbenchExportEnvironmentStatus = 'error';
        setExportEnvironmentStatus(nextStatus);
        pushLog((language) => workbenchCopies[language].exportEnvironment[nextStatus].detail, 'error');
        showAboutResultNotice(
          workbenchCopy.about.environmentResultTitle,
          getAboutEnvironmentResultBody(nextStatus, workbenchCopy),
          'danger',
        );
      });
  };
  return { exportEnvironmentStatus, runAboutEnvironmentCheck };
};
