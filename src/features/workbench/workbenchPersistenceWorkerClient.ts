import type {
  WorkbenchPersistenceV3RetainedState,
} from './persistenceV3/productionFacade.ts';
import {
  WORKBENCH_PERSISTENCE_WORKER_TIMEOUT_MS,
  type WorkbenchPersistenceWorkerRequest,
  type WorkbenchPersistenceWorkerResponse,
  type WorkbenchPersistenceWorkerSaveRequest,
} from './workbenchPersistenceWorkerProtocol.ts';

export class WorkbenchPersistenceWorkerTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkbenchPersistenceWorkerTransportError';
  }
}

export class WorkbenchPersistenceWorkerSaveError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name || 'WorkbenchPersistenceWorkerSaveError';
  }
}

type WorkerSaveWaiter = {
  resolve: (retained: WorkbenchPersistenceV3RetainedState) => void;
  reject: (cause: unknown) => void;
};

type PendingWorkerSave = {
  request: WorkbenchPersistenceWorkerSaveRequest;
  waiters: WorkerSaveWaiter[];
  timeoutId: ReturnType<typeof setTimeout> | null;
};

export class WorkbenchPersistenceWorkerClient {
  private worker: Worker | null = null;
  private active: PendingWorkerSave | null = null;
  private queued: PendingWorkerSave | null = null;

  isSupported() {
    return typeof Worker !== 'undefined';
  }

  private rejectPending(cause: unknown) {
    for (const pending of [this.active, this.queued]) {
      if (!pending) continue;
      if (pending.timeoutId !== null) clearTimeout(pending.timeoutId);
      for (const waiter of pending.waiters) waiter.reject(cause);
    }
    this.active = null;
    this.queued = null;
  }

  private handleTransportFailure(worker: Worker, cause: unknown) {
    worker.terminate();
    if (this.worker === worker) this.worker = null;
    this.rejectPending(cause);
  }

  private dispatch(
    worker: Worker,
    pending: PendingWorkerSave,
  ) {
    pending.timeoutId = setTimeout(() => {
      this.handleTransportFailure(
        worker,
        new WorkbenchPersistenceWorkerTransportError(
          'Persistence worker save timed out.',
        ),
      );
    }, WORKBENCH_PERSISTENCE_WORKER_TIMEOUT_MS);
    this.active = pending;
    try {
      worker.postMessage(
        pending.request satisfies WorkbenchPersistenceWorkerRequest,
      );
    } catch (cause) {
      this.handleTransportFailure(
        worker,
        new WorkbenchPersistenceWorkerTransportError(
          cause instanceof Error ? cause.message : String(cause),
        ),
      );
    }
  }

  private dispatchQueued(
    worker: Worker,
    retained?: WorkbenchPersistenceV3RetainedState,
  ) {
    const next = this.queued;
    this.queued = null;
    if (!next) return;
    if (retained) {
      next.request = {
        ...next.request,
        retained,
      };
    }
    this.dispatch(worker, next);
  }

  private ensureWorker() {
    if (this.worker) return this.worker;
    if (!this.isSupported()) {
      throw new WorkbenchPersistenceWorkerTransportError(
        'Web Worker is unavailable in this runtime.',
      );
    }
    const worker = new Worker(
      new URL('./workbenchPersistence.worker.ts', import.meta.url),
      { type: 'module', name: 'workbench-persistence-v3' },
    );
    worker.addEventListener('message', (
      event: MessageEvent<WorkbenchPersistenceWorkerResponse>,
    ) => {
      const response = event.data;
      const pending = this.active;
      if (!pending || pending.request.requestId !== response.requestId) return;
      this.active = null;
      if (pending.timeoutId !== null) clearTimeout(pending.timeoutId);
      if (response.type === 'save-completed') {
        for (const waiter of pending.waiters) {
          waiter.resolve(response.retained);
        }
        this.dispatchQueued(worker, response.retained);
        return;
      }
      const cause = new WorkbenchPersistenceWorkerSaveError(
        response.error.name,
        response.error.message,
      );
      for (const waiter of pending.waiters) waiter.reject(cause);
      this.dispatchQueued(worker);
    });
    worker.addEventListener('error', (event) => {
      const cause = new WorkbenchPersistenceWorkerTransportError(
        event.message || 'Persistence worker stopped unexpectedly.',
      );
      this.handleTransportFailure(worker, cause);
    });
    worker.addEventListener('messageerror', () => {
      const cause = new WorkbenchPersistenceWorkerTransportError(
        'Persistence worker could not decode a message.',
      );
      this.handleTransportFailure(worker, cause);
    });
    this.worker = worker;
    return worker;
  }

  save(
    request: WorkbenchPersistenceWorkerSaveRequest,
  ): Promise<WorkbenchPersistenceV3RetainedState> {
    let worker: Worker;
    try {
      worker = this.ensureWorker();
    } catch (cause) {
      return Promise.reject(cause);
    }
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };
      if (this.active) {
        if (this.queued) {
          this.queued.request = request;
          this.queued.waiters.push(waiter);
        } else {
          this.queued = {
            request,
            waiters: [waiter],
            timeoutId: null,
          };
        }
        return;
      }
      this.dispatch(worker, {
        request,
        waiters: [waiter],
        timeoutId: null,
      });
    });
  }

  restart() {
    const worker = this.worker;
    this.worker = null;
    worker?.terminate();
    this.rejectPending(new WorkbenchPersistenceWorkerTransportError(
      'Persistence worker was restarted.',
    ));
  }
}
