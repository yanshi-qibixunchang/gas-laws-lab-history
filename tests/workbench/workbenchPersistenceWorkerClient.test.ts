import assert from 'node:assert/strict';
import {
  createEmptyWorkbenchPersistenceV3RetainedState,
} from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import {
  WorkbenchPersistenceWorkerClient,
  WorkbenchPersistenceWorkerSaveError,
  WorkbenchPersistenceWorkerTransportError,
} from '../../src/features/workbench/workbenchPersistenceWorkerClient.ts';
import type {
  WorkbenchPersistenceWorkerRequest,
  WorkbenchPersistenceWorkerResponse,
} from '../../src/features/workbench/workbenchPersistenceWorkerProtocol.ts';

type Listener = (event: { data?: unknown; message?: string }) => void;

class FakeWorker {
  static response:
    | 'success'
    | 'save-failed'
    | 'transport-failed'
    | 'deferred' =
    'success';
  static readonly sentRequestIds: string[] = [];
  static readonly deferred: Array<{
    worker: FakeWorker;
    request: WorkbenchPersistenceWorkerRequest;
  }> = [];

  private readonly listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [
      ...(this.listeners.get(type) ?? []),
      listener,
    ]);
  }

  postMessage(request: WorkbenchPersistenceWorkerRequest) {
    FakeWorker.sentRequestIds.push(request.requestId);
    if (FakeWorker.response === 'deferred') {
      FakeWorker.deferred.push({ worker: this, request });
      return;
    }
    queueMicrotask(() => {
      if (FakeWorker.response === 'transport-failed') {
        this.emit('error', { message: 'worker crashed' });
        return;
      }
      const response: WorkbenchPersistenceWorkerResponse =
        FakeWorker.response === 'save-failed'
          ? {
              type: 'save-failed',
              requestId: request.requestId,
              error: {
                name: 'QuotaExceededError',
                message: 'quota exhausted',
              },
            }
          : {
              type: 'save-completed',
              requestId: request.requestId,
              retained: request.retained,
            };
      this.emit('message', { data: response });
    });
  }

  static completeNextDeferred() {
    const deferred = FakeWorker.deferred.shift();
    if (!deferred) throw new Error('Expected one deferred Worker request.');
    deferred.worker.emit('message', {
      data: {
        type: 'save-completed',
        requestId: deferred.request.requestId,
        retained: deferred.request.retained,
      } satisfies WorkbenchPersistenceWorkerResponse,
    });
  }

  terminate() {
    // The fake has no external resources.
  }

  private emit(type: string, event: { data?: unknown; message?: string }) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const previousWorker = globalThis.Worker;
Object.defineProperty(globalThis, 'Worker', {
  configurable: true,
  value: FakeWorker,
});

try {
  const retained = createEmptyWorkbenchPersistenceV3RetainedState();
  const request = {
    type: 'save' as const,
    requestId: 'request-1',
    namespace: 'persistent:test',
    generationId: 'generation-1',
    capturedAtMs: 1,
    snapshot: {
      files: [],
      closedFiles: [],
      activeFileId: '',
      selectedPanel: 'preview' as const,
    },
    retained,
  };
  const client = new WorkbenchPersistenceWorkerClient();
  assert.deepEqual(await client.save(request), retained);

  FakeWorker.response = 'save-failed';
  await assert.rejects(
    client.save({ ...request, requestId: 'request-2' }),
    (error) => (
      error instanceof WorkbenchPersistenceWorkerSaveError &&
      error.name === 'QuotaExceededError'
    ),
  );

  FakeWorker.response = 'transport-failed';
  await assert.rejects(
    client.save({ ...request, requestId: 'request-3' }),
    WorkbenchPersistenceWorkerTransportError,
  );
  FakeWorker.response = 'success';
  assert.deepEqual(
    await client.save({ ...request, requestId: 'request-4' }),
    retained,
    'the client should create a fresh Worker after one transport crash',
  );

  FakeWorker.response = 'deferred';
  FakeWorker.sentRequestIds.length = 0;
  FakeWorker.deferred.length = 0;
  const coalescingClient = new WorkbenchPersistenceWorkerClient();
  const first = coalescingClient.save({
    ...request,
    requestId: 'coalesced-1',
    generationId: 'coalesced-generation-1',
  });
  const superseded = coalescingClient.save({
    ...request,
    requestId: 'coalesced-2',
    generationId: 'coalesced-generation-2',
  });
  const latest = coalescingClient.save({
    ...request,
    requestId: 'coalesced-3',
    generationId: 'coalesced-generation-3',
  });
  assert.deepEqual(
    FakeWorker.sentRequestIds,
    ['coalesced-1'],
    'only the active request should be posted before it completes',
  );
  FakeWorker.completeNextDeferred();
  assert.deepEqual(
    FakeWorker.sentRequestIds,
    ['coalesced-1', 'coalesced-3'],
    'queued saves should collapse to the latest request',
  );
  FakeWorker.completeNextDeferred();
  await Promise.all([first, superseded, latest]);
  assert.equal(FakeWorker.deferred.length, 0);
} finally {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    value: previousWorker,
  });
}

console.log('workbenchPersistenceWorkerClient tests passed');
