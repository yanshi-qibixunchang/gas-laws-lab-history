import { useEffect } from 'react';
import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import { HEAT_CAPACITY_LIFECYCLE_DUPLICATE_FLUSH_WINDOW_MS } from './workbenchPersistenceTiming.ts';
export interface WorkbenchLifecyclePersistencePorts { window: Pick<Window, 'addEventListener' | 'removeEventListener' | 'hardSphereLabWindow'>; document: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>; performance: Pick<Performance, 'now'>; heatCapacityLifecycleLastCompletedFlushAtMsRef: Ref<number | null>; persistWorkspaceLifecycleCheckpointRef: Ref<(forceFresh?: boolean) => Promise<boolean>>; prepareDesktopExitQuiescenceRef: Ref<(blockInput?: boolean) => void>; resumeDesktopExitQuiescenceRef: Ref<() => void>; }
export const attachWorkbenchLifecyclePersistence = (ports: WorkbenchLifecyclePersistencePorts) => {
 const { window, document, performance, heatCapacityLifecycleLastCompletedFlushAtMsRef, persistWorkspaceLifecycleCheckpointRef, prepareDesktopExitQuiescenceRef, resumeDesktopExitQuiescenceRef } = ports;

    const persistLifecycleCheckpointOnce = async () => {
      const now = performance.now();
      const lastCompletedAtMs = heatCapacityLifecycleLastCompletedFlushAtMsRef.current;
      if (
        lastCompletedAtMs !== null &&
        now - lastCompletedAtMs < HEAT_CAPACITY_LIFECYCLE_DUPLICATE_FLUSH_WINDOW_MS
      ) {
        return true;
      }
      const persisted = await persistWorkspaceLifecycleCheckpointRef.current();
      if (persisted) {
        heatCapacityLifecycleLastCompletedFlushAtMsRef.current = performance.now();
      }
      return persisted;
    };
    const persistBeforePageHide = () => {
      void persistLifecycleCheckpointOnce();
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        void persistLifecycleCheckpointOnce();
        return;
      }
      heatCapacityLifecycleLastCompletedFlushAtMsRef.current = null;
    };
    const resetLifecycleFlushAfterPageShow = () => {
      heatCapacityLifecycleLastCompletedFlushAtMsRef.current = null;
    };
    const desktopWindowBridge = window.hardSphereLabWindow;
    const unsubscribePrepareExit = desktopWindowBridge?.onPrepareExit?.((request) => {
      void (async () => {
        let saved = false;
        let message = '';
        try {
          prepareDesktopExitQuiescenceRef.current();
          saved = await persistWorkspaceLifecycleCheckpointRef.current(true);
          if (!saved) message = 'Workspace persistence or scene checkpoint capture did not complete.';
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }
        await desktopWindowBridge.reportPersistenceResult({
          requestId: request.requestId,
          saved,
          message,
        });
      })();
    });
    const unsubscribeResumeAfterExitCancel = desktopWindowBridge?.onResumeAfterExitCancel?.(() => {
      resumeDesktopExitQuiescenceRef.current();
    });
    window.addEventListener('pagehide', persistBeforePageHide);
    window.addEventListener('pageshow', resetLifecycleFlushAfterPageShow);
    document.addEventListener('visibilitychange', persistWhenHidden);
    return () => {
      window.removeEventListener('pagehide', persistBeforePageHide);
      window.removeEventListener('pageshow', resetLifecycleFlushAfterPageShow);
      document.removeEventListener('visibilitychange', persistWhenHidden);
      unsubscribePrepareExit?.();
      unsubscribeResumeAfterExitCancel?.();
    };

};
export const useWorkbenchLifecyclePersistence = (ports: WorkbenchLifecyclePersistencePorts & { selectedPanel: WorkbenchPanelKey; guideHeatCapacityStrongReminderActive: boolean; guideHeatCapacityStrongReminderControlId: string | null }) => {
 const { selectedPanel, guideHeatCapacityStrongReminderActive, guideHeatCapacityStrongReminderControlId } = ports;
 useEffect(() => attachWorkbenchLifecyclePersistence(ports), [
    selectedPanel,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
  ]);
};
