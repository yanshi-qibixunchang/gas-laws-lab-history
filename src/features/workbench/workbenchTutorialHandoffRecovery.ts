import { clearExperimentTutorialHandoff } from '../learning/workbenchTutorialCoordinator.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
export type WorkbenchTutorialHandoffRecoveryPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'setTutorialOperationError' | 'setTutorialNoticeKind'> & {
  initialTutorialHandoffRecovery: boolean;
  flushWorkspacePersistenceRef: { current: () => Promise<boolean> };
  settingsLanguagePreference: WorkbenchLanguagePreference;
  window: Window;
};
export const scheduleWorkbenchTutorialHandoffRecovery = ({ initialTutorialHandoffRecovery, flushWorkspacePersistenceRef, settingsLanguagePreference, setTutorialOperationError, setTutorialNoticeKind, window }: WorkbenchTutorialHandoffRecoveryPorts, clearHandoff = clearExperimentTutorialHandoff) => {
    if (!initialTutorialHandoffRecovery) return undefined;
    let cancelled = false;
    const finalizeRecoveredHandoff = async () => {
      const saved = await flushWorkspacePersistenceRef.current();
      if (cancelled) return;
      if (!saved) {
        setTutorialOperationError({
          message: settingsLanguagePreference === 'en'
            ? 'The unlocked experiment file could not be saved yet.'
            : settingsLanguagePreference === 'zh-TW'
              ? '解鎖後的新實驗檔案尚未能安全儲存。'
              : '解锁后的新实验文件尚未能安全保存。',
          retry: () => { void finalizeRecoveredHandoff(); },
        });
        return;
      }
      const cleared = clearHandoff();
      if (!cleared.ok) {
        setTutorialOperationError({
          message: cleared.error.message,
          retry: () => { void finalizeRecoveredHandoff(); },
        });
        return;
      }
      setTutorialOperationError(null);
      void window.hardSphereLabTutorial?.deactivate?.();
      setTutorialNoticeKind('all-unlocked');
    };
    const timerId = window.setTimeout(() => {
      void finalizeRecoveredHandoff();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  };
