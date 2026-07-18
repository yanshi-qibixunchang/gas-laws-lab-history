export const WORKBENCH_PERSISTENCE_DEBOUNCE_MS = 750;
export const WORKBENCH_PERSISTENCE_MAX_WAIT_MS = 2_000;

export type WorkbenchPersistenceStatus =
  | { state: 'idle'; savedAtMs: number | null }
  | { state: 'pending'; savedAtMs: number | null }
  | { state: 'saving'; savedAtMs: number | null }
  | { state: 'retrying'; savedAtMs: number | null; error: Error }
  | { state: 'failed'; savedAtMs: number | null; error: Error };

type TimeoutHandle = ReturnType<typeof setTimeout>;

export type WorkbenchPersistenceScheduler<Snapshot> = {
  schedule: (produceSnapshot: () => Snapshot) => void;
  flush: () => Promise<boolean>;
  dispose: () => void;
  getStatus: () => WorkbenchPersistenceStatus;
};

export const createWorkbenchPersistenceScheduler = <Snapshot>({
  save,
  onStatus,
  debounceMs = WORKBENCH_PERSISTENCE_DEBOUNCE_MS,
  maxWaitMs = WORKBENCH_PERSISTENCE_MAX_WAIT_MS,
}: {
  save: (snapshot: Snapshot) => Promise<void>;
  onStatus?: (status: WorkbenchPersistenceStatus) => void;
  debounceMs?: number;
  maxWaitMs?: number;
}): WorkbenchPersistenceScheduler<Snapshot> => {
  let pendingProducer: (() => Snapshot) | null = null;
  let debounceTimer: TimeoutHandle | null = null;
  let maxWaitTimer: TimeoutHandle | null = null;
  let firstPendingAtMs: number | null = null;
  let activeSave: Promise<boolean> | null = null;
  let activeDrain: Promise<boolean> | null = null;
  let disposed = false;
  let retryCount = 0;
  let status: WorkbenchPersistenceStatus = { state: 'idle', savedAtMs: null };

  const publish = (nextStatus: WorkbenchPersistenceStatus) => {
    status = nextStatus;
    onStatus?.(nextStatus);
  };
  const clearTimers = () => {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    if (maxWaitTimer !== null) clearTimeout(maxWaitTimer);
    debounceTimer = null;
    maxWaitTimer = null;
    firstPendingAtMs = null;
  };

  const savePendingSnapshot = async (): Promise<boolean> => {
    const producer = pendingProducer;
    if (!producer) return status.state !== 'failed';
    pendingProducer = null;
    clearTimers();
    const previousSavedAtMs = status.savedAtMs;
    publish({ state: 'saving', savedAtMs: previousSavedAtMs });
    activeSave = (async () => {
      try {
        await save(producer());
        retryCount = 0;
        const savedAtMs = Date.now();
        publish(pendingProducer
          ? { state: 'pending', savedAtMs }
          : { state: 'idle', savedAtMs });
        return true;
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        retryCount += 1;
        pendingProducer = pendingProducer ?? producer;
        if (retryCount <= 1) {
          publish({ state: 'retrying', savedAtMs: previousSavedAtMs, error });
          debounceTimer = setTimeout(() => { void flush(); }, debounceMs);
        } else {
          publish({ state: 'failed', savedAtMs: previousSavedAtMs, error });
        }
        return false;
      } finally {
        activeSave = null;
      }
    })();
    return activeSave;
  };

  const flush = (): Promise<boolean> => {
    if (disposed) return Promise.resolve(false);
    if (activeDrain) return activeDrain;
    activeDrain = (async () => {
      while (!disposed) {
        if (activeSave) {
          const saved = await activeSave;
          if (!saved) return false;
          continue;
        }
        if (!pendingProducer) return status.state !== 'failed';
        const saved = await savePendingSnapshot();
        if (!saved) return false;
      }
      return false;
    })().finally(() => {
      activeDrain = null;
    });
    return activeDrain;
  };

  const schedule = (produceSnapshot: () => Snapshot) => {
    if (disposed) return;
    pendingProducer = produceSnapshot;
    const savedAtMs = status.savedAtMs;
    publish({ state: 'pending', savedAtMs });
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { void flush(); }, debounceMs);
    if (firstPendingAtMs === null) {
      firstPendingAtMs = Date.now();
      maxWaitTimer = setTimeout(() => { void flush(); }, maxWaitMs);
    }
  };

  return {
    schedule,
    flush,
    dispose: () => {
      disposed = true;
      pendingProducer = null;
      clearTimers();
    },
    getStatus: () => status,
  };
};
