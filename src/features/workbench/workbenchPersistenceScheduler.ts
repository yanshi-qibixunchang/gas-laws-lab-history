export const WORKBENCH_PERSISTENCE_DEBOUNCE_MS = 750;
export const WORKBENCH_PERSISTENCE_MAX_WAIT_MS = 2_000;
export const WORKBENCH_RUNTIME_CHECKPOINT_INTERVAL_MS = 15_000;
export const WORKBENCH_PERSISTENCE_RETRY_DELAYS_MS = [
  250,
  1_000,
  3_000,
] as const;

export type WorkbenchPersistenceReason =
  | 'semantic'
  | 'runtime-checkpoint'
  | 'lifecycle';

const RETRYABLE_PERSISTENCE_ERROR_NAMES = new Set([
  'AbortError',
  'InvalidStateError',
  'QuotaExceededError',
  'TimeoutError',
  'TransactionInactiveError',
  'UnknownError',
  'WorkbenchPersistenceConflictError',
  'WorkbenchPersistenceWorkerTransportError',
]);

export const isWorkbenchPersistenceRetryableError = (
  error: Error,
) => RETRYABLE_PERSISTENCE_ERROR_NAMES.has(error.name) ||
  /blocked|temporar|timed out|head changed repeatedly/i.test(error.message);

export type WorkbenchPersistenceStatus =
  | { state: 'idle'; savedAtMs: number | null }
  | { state: 'pending'; savedAtMs: number | null }
  | { state: 'saving'; savedAtMs: number | null }
  | { state: 'retrying'; savedAtMs: number | null; error: Error }
  | { state: 'failed'; savedAtMs: number | null; error: Error };

type TimeoutHandle = ReturnType<typeof setTimeout>;

export type WorkbenchPersistenceScheduler<Snapshot> = {
  schedule: (
    produceSnapshot: () => Snapshot,
    reason?: WorkbenchPersistenceReason,
  ) => boolean;
  flush: () => Promise<boolean>;
  dispose: () => void;
  getStatus: () => WorkbenchPersistenceStatus;
};

export const createWorkbenchPersistenceScheduler = <Snapshot>({
  save,
  onStatus,
  debounceMs = WORKBENCH_PERSISTENCE_DEBOUNCE_MS,
  maxWaitMs = WORKBENCH_PERSISTENCE_MAX_WAIT_MS,
  runtimeCheckpointIntervalMs = WORKBENCH_RUNTIME_CHECKPOINT_INTERVAL_MS,
  retryDelaysMs = WORKBENCH_PERSISTENCE_RETRY_DELAYS_MS,
  now = Date.now,
  shouldRetry = isWorkbenchPersistenceRetryableError,
}: {
  save: (snapshot: Snapshot) => Promise<void>;
  onStatus?: (status: WorkbenchPersistenceStatus) => void;
  debounceMs?: number;
  maxWaitMs?: number;
  runtimeCheckpointIntervalMs?: number;
  retryDelaysMs?: readonly number[];
  now?: () => number;
  shouldRetry?: (error: Error) => boolean;
}): WorkbenchPersistenceScheduler<Snapshot> => {
  let pendingProducer: (() => Snapshot) | null = null;
  let pendingReason: WorkbenchPersistenceReason | null = null;
  let debounceTimer: TimeoutHandle | null = null;
  let maxWaitTimer: TimeoutHandle | null = null;
  let firstPendingAtMs: number | null = null;
  let lastRuntimeCheckpointAcceptedAtMs: number | null = null;
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
    pendingReason = null;
    clearTimers();
    const previousSavedAtMs = status.savedAtMs;
    publish({ state: 'saving', savedAtMs: previousSavedAtMs });
    activeSave = (async () => {
      try {
        await save(producer());
        retryCount = 0;
        const savedAtMs = now();
        publish(pendingProducer
          ? { state: 'pending', savedAtMs }
          : { state: 'idle', savedAtMs });
        return true;
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        retryCount += 1;
        pendingProducer = pendingProducer ?? producer;
        pendingReason = pendingReason ?? 'semantic';
        const retryDelayMs = retryDelaysMs[retryCount - 1];
        if (retryDelayMs !== undefined && shouldRetry(error)) {
          publish({ state: 'retrying', savedAtMs: previousSavedAtMs, error });
          debounceTimer = setTimeout(() => { void flush(); }, retryDelayMs);
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

  const schedule = (
    produceSnapshot: () => Snapshot,
    reason: WorkbenchPersistenceReason = 'semantic',
  ) => {
    if (disposed) return false;
    const scheduledAtMs = now();
    if (
      reason === 'runtime-checkpoint' &&
      lastRuntimeCheckpointAcceptedAtMs !== null &&
      scheduledAtMs - lastRuntimeCheckpointAcceptedAtMs <
        runtimeCheckpointIntervalMs
    ) {
      return false;
    }
    if (reason === 'runtime-checkpoint') {
      lastRuntimeCheckpointAcceptedAtMs = scheduledAtMs;
    }
    if (status.state === 'failed') retryCount = 0;
    pendingProducer = produceSnapshot;
    if (
      pendingReason === null ||
      reason === 'lifecycle' ||
      (reason === 'semantic' && pendingReason === 'runtime-checkpoint')
    ) {
      pendingReason = reason;
    }
    const savedAtMs = status.savedAtMs;
    publish({ state: 'pending', savedAtMs });
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { void flush(); }, debounceMs);
    if (firstPendingAtMs === null) {
      firstPendingAtMs = scheduledAtMs;
      maxWaitTimer = setTimeout(() => { void flush(); }, maxWaitMs);
    }
    if (reason === 'lifecycle') void flush();
    return true;
  };

  return {
    schedule,
    flush,
    dispose: () => {
      disposed = true;
      pendingProducer = null;
      pendingReason = null;
      clearTimers();
    },
    getStatus: () => status,
  };
};
