import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { HeatCapacitySceneCheckpointProvider } from '../heatCapacity/HeatCapacityInstrumentScene.tsx';
import type { useWorkbenchWorkspacePersistenceResources } from './useWorkbenchWorkspacePersistenceResources.ts';
type Resources = ReturnType<typeof useWorkbenchWorkspacePersistenceResources>;
export interface WorkbenchLifecycleCheckpointPorts extends Pick<Resources, 'heatCapacityLifecycleFlushInProgressRef' | 'heatCapacityLifecycleFlushPromiseRef' | 'heatCapacityRefreshPersistRef' | 'flushWorkspacePersistenceRef'> {
 clearHeatCapacitySemanticCheckpointTimers: () => void; filesRef: Ref<WorkbenchFileState[]>; activeFileIdRef: Ref<string>; heatCapacitySceneCheckpointProviderRef: Ref<{ fileId: string; provider: HeatCapacitySceneCheckpointProvider } | null>;
}
export const createWorkbenchLifecycleCheckpointActions = (ports: WorkbenchLifecycleCheckpointPorts) => {
 const { clearHeatCapacitySemanticCheckpointTimers, filesRef, activeFileIdRef, heatCapacitySceneCheckpointProviderRef, heatCapacityLifecycleFlushInProgressRef, heatCapacityLifecycleFlushPromiseRef, heatCapacityRefreshPersistRef, flushWorkspacePersistenceRef } = ports;
 const persistWorkspaceLifecycleCheckpoint = async (forceFresh = false) => {
    if (forceFresh) {
      let activeFlush = heatCapacityLifecycleFlushPromiseRef.current;
      while (activeFlush) {
        try {
          await activeFlush;
        } catch {
          // A native exit must still attempt one post-quiescence checkpoint after an older flush fails.
        }
        activeFlush = heatCapacityLifecycleFlushPromiseRef.current;
      }
    } else {
      const activeFlush = heatCapacityLifecycleFlushPromiseRef.current;
      if (activeFlush) return activeFlush;
    }
    const flushOperation = (async () => {
      clearHeatCapacitySemanticCheckpointTimers();
      const activeSceneFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      const sceneCheckpointRegistration = heatCapacitySceneCheckpointProviderRef.current;
      const sceneCheckpointProvider = activeSceneFile?.kind === 'heatCapacity' &&
        sceneCheckpointRegistration?.fileId === activeSceneFile.id
        ? sceneCheckpointRegistration.provider
        : null;
      let sceneCheckpointCompleted = activeSceneFile?.kind !== 'heatCapacity';
      heatCapacityLifecycleFlushInProgressRef.current = true;
      try {
        if (sceneCheckpointProvider) {
          sceneCheckpointCompleted = sceneCheckpointProvider() !== null;
        }
      } finally {
        heatCapacityLifecycleFlushInProgressRef.current = false;
      }
      heatCapacityRefreshPersistRef.current();
      const saved = await flushWorkspacePersistenceRef.current();
      return sceneCheckpointCompleted && saved;
    })();
    heatCapacityLifecycleFlushPromiseRef.current = flushOperation;
    void flushOperation.then(
      () => {
        if (heatCapacityLifecycleFlushPromiseRef.current === flushOperation) {
          heatCapacityLifecycleFlushPromiseRef.current = null;
        }
      },
      () => {
        if (heatCapacityLifecycleFlushPromiseRef.current === flushOperation) {
          heatCapacityLifecycleFlushPromiseRef.current = null;
        }
      },
    );
    return flushOperation;
  };
 return { persistWorkspaceLifecycleCheckpoint };
};
