import {
  commitWorkbenchPersistenceV3ProductionSnapshot,
} from './persistenceV3/productionFacade.ts';
import {
  IndexedDbWorkbenchPersistenceV3GenerationStore,
} from './workbenchPersistenceV3IndexedDbGenerationStore.ts';
import type {
  WorkbenchPersistenceWorkerRequest,
  WorkbenchPersistenceWorkerResponse,
} from './workbenchPersistenceWorkerProtocol.ts';

const WORKBENCH_INDEXED_DB_NAME = 'hard-sphere-lab-workbench';
const WORKBENCH_INDEXED_DB_VERSION = 3;

type PersistenceWorkerGlobal = typeof globalThis & {
  onmessage: ((event: MessageEvent<WorkbenchPersistenceWorkerRequest>) => void) | null;
  postMessage: (response: WorkbenchPersistenceWorkerResponse) => void;
};

const workerGlobal = globalThis as PersistenceWorkerGlobal;
let databasePromise: Promise<IDBDatabase> | null = null;

const openWorkbenchDatabase = () => {
  if (databasePromise) return databasePromise;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      WORKBENCH_INDEXED_DB_NAME,
      WORKBENCH_INDEXED_DB_VERSION,
    );
    request.addEventListener('success', () => resolve(request.result), {
      once: true,
    });
    request.addEventListener('error', () => reject(
      request.error ?? new Error('Persistence worker could not open IndexedDB.'),
    ), { once: true });
    request.addEventListener('blocked', () => reject(
      new Error('Persistence worker IndexedDB open request was blocked.'),
    ), { once: true });
    request.addEventListener('upgradeneeded', () => {
      request.transaction?.abort();
      reject(new Error(
        'Persistence worker cannot initialize the workspace database before renderer bootstrap.',
      ));
    }, { once: true });
  }).catch((cause) => {
    if (databasePromise === opening) databasePromise = null;
    throw cause;
  });
  databasePromise = opening;
  return opening;
};

const isQuotaExceededError = (cause: unknown) => (
  cause instanceof DOMException && cause.name === 'QuotaExceededError'
) || (
  typeof cause === 'object' &&
  cause !== null &&
  'name' in cause &&
  cause.name === 'QuotaExceededError'
);

const commitSaveRequest = async (
  request: Extract<WorkbenchPersistenceWorkerRequest, { type: 'save' }>,
) => {
  const database = await openWorkbenchDatabase();
  const store = new IndexedDbWorkbenchPersistenceV3GenerationStore(database);
  try {
    return await commitWorkbenchPersistenceV3ProductionSnapshot({
      store,
      namespace: request.namespace,
      generationId: request.generationId,
      capturedAtMs: request.capturedAtMs,
      snapshot: request.snapshot,
      retained: request.retained,
    });
  } catch (cause) {
    if (!isQuotaExceededError(cause)) throw cause;
    const head = await store.readHead(request.namespace);
    await store.pruneGenerations(request.namespace, {
      retainGenerationIds: [
        head.currentGenerationId,
        head.previousGenerationId,
      ].filter((generationId): generationId is string => generationId !== null),
    });
    return commitWorkbenchPersistenceV3ProductionSnapshot({
      store,
      namespace: request.namespace,
      generationId: request.generationId,
      capturedAtMs: request.capturedAtMs,
      snapshot: request.snapshot,
      retained: request.retained,
    });
  }
};

workerGlobal.onmessage = (event) => {
  const request = event.data;
  if (request?.type !== 'save') return;
  void commitSaveRequest(request).then(
    (committed) => {
      workerGlobal.postMessage({
        type: 'save-completed',
        requestId: request.requestId,
        retained: committed.retained,
      });
    },
    (cause) => {
      const error = cause instanceof Error
        ? cause
        : new Error(String(cause));
      workerGlobal.postMessage({
        type: 'save-failed',
        requestId: request.requestId,
        error: {
          name: error.name,
          message: error.message,
        },
      });
    },
  );
};
