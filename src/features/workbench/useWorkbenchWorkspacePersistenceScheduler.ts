import { useEffect, useRef, useState } from 'react';
import { saveWorkbenchWorkspaceToIndexedDb, type WorkbenchWorkspacePersistenceSnapshot } from './workbenchIndexedDbPersistence.ts';
import { createWorkbenchPersistenceScheduler, type WorkbenchPersistenceScheduler, type WorkbenchPersistenceStatus } from './workbenchPersistenceScheduler.ts';

/** One scheduler belongs to one mounted workspace, with symmetric disposal. */
export const useWorkbenchWorkspacePersistenceScheduler = () => {
  const [workspacePersistenceStatus, setWorkspacePersistenceStatus] = useState<WorkbenchPersistenceStatus>({
    state: 'idle',
    savedAtMs: null,
  });
  const workspacePersistenceSchedulerRef = useRef<WorkbenchPersistenceScheduler<
    WorkbenchWorkspacePersistenceSnapshot
  > | null>(null);
  useEffect(() => {
    const scheduler = createWorkbenchPersistenceScheduler<WorkbenchWorkspacePersistenceSnapshot>({
      save: saveWorkbenchWorkspaceToIndexedDb,
      onStatus: setWorkspacePersistenceStatus,
    });
    workspacePersistenceSchedulerRef.current = scheduler;
    return () => {
      if (workspacePersistenceSchedulerRef.current === scheduler) {
        workspacePersistenceSchedulerRef.current = null;
      }
      scheduler.dispose();
    };
  }, []);
  return { workspacePersistenceStatus, workspacePersistenceSchedulerRef };
};
