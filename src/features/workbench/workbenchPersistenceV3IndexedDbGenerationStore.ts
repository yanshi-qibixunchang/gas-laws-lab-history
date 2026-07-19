import {
  canonicalizeWorkbenchPersistenceV3Json,
} from './persistenceV3/fingerprint.ts';
import type {
  WorkbenchPersistenceV3CompareAndSwapHeadCommand,
  WorkbenchPersistenceV3CompareAndSwapHeadResult,
  WorkbenchPersistenceV3GenerationCandidate,
  WorkbenchPersistenceV3GenerationHead,
  WorkbenchPersistenceV3GenerationStore,
  WorkbenchPersistenceV3PruneOptions,
  WorkbenchPersistenceV3PruneResult,
  WorkbenchPersistenceV3StageResult,
  WorkbenchPersistenceV3StoredGeneration,
} from './persistenceV3/generationStore.ts';

export const WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE =
  'persistenceV3GenerationHeads';
export const WORKBENCH_PERSISTENCE_V3_GENERATION_STORE =
  'persistenceV3Generations';

interface IndexedDbGenerationRecord
  extends WorkbenchPersistenceV3StoredGeneration {
  key: string;
}

const generationKey = (namespace: string, generationId: string) => (
  `${namespace}\u0000${generationId}`
);

const requestResult = <Value>(request: IDBRequest<Value>): Promise<Value> => (
  new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed.')),
      { once: true },
    );
  })
);

const transactionCompleted = (transaction: IDBTransaction) => (
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener(
      'abort',
      () => reject(
        transaction.error ?? new Error('IndexedDB transaction aborted.'),
      ),
      { once: true },
    );
    transaction.addEventListener(
      'error',
      () => reject(
        transaction.error ?? new Error('IndexedDB transaction failed.'),
      ),
      { once: true },
    );
  })
);

const cloneGeneration = (
  value: IndexedDbGenerationRecord,
): WorkbenchPersistenceV3StoredGeneration => ({
  namespace: value.namespace,
  generationId: value.generationId,
  contentFingerprint: value.contentFingerprint,
  capturedAtMs: value.capturedAtMs,
  content: structuredClone(value.content),
});

const defaultHead = (
  namespace: string,
): WorkbenchPersistenceV3GenerationHead => ({
  namespace,
  revision: 0,
  currentGenerationId: null,
  previousGenerationId: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isGenerationHead = (
  value: unknown,
  namespace: string,
): value is WorkbenchPersistenceV3GenerationHead => (
  isRecord(value) &&
  Object.keys(value).length === 4 &&
  value.namespace === namespace &&
  Number.isSafeInteger(value.revision) &&
  (value.revision as number) >= 0 &&
  (
    value.currentGenerationId === null ||
    (
      typeof value.currentGenerationId === 'string' &&
      value.currentGenerationId.length > 0
    )
  ) &&
  (
    value.previousGenerationId === null ||
    (
      typeof value.previousGenerationId === 'string' &&
      value.previousGenerationId.length > 0
    )
  ) &&
  (
    value.currentGenerationId === null ||
    value.currentGenerationId !== value.previousGenerationId
  ) &&
  Object.prototype.hasOwnProperty.call(value, 'namespace') &&
  Object.prototype.hasOwnProperty.call(value, 'revision') &&
  Object.prototype.hasOwnProperty.call(value, 'currentGenerationId') &&
  Object.prototype.hasOwnProperty.call(value, 'previousGenerationId')
);

const normalizeGenerationRecord = (
  value: unknown,
  namespace: string,
  generationId: string,
): WorkbenchPersistenceV3StoredGeneration | null => {
  if (!isRecord(value)) return null;
  if (
    value.namespace === namespace &&
    value.generationId === generationId &&
    typeof value.contentFingerprint === 'string' &&
    value.contentFingerprint.length > 0 &&
    Number.isSafeInteger(value.capturedAtMs) &&
    (value.capturedAtMs as number) >= 0 &&
    Object.prototype.hasOwnProperty.call(value, 'content')
  ) {
    return cloneGeneration(value as unknown as IndexedDbGenerationRecord);
  }
  return {
    namespace,
    generationId,
    contentFingerprint: 'invalid-indexeddb-generation-record',
    capturedAtMs: 0,
    content: {
      source: 'invalid-indexeddb-generation-record',
      raw: structuredClone(value),
    },
  };
};

export class IndexedDbWorkbenchPersistenceV3GenerationStore
implements WorkbenchPersistenceV3GenerationStore {
  readonly database: IDBDatabase;

  constructor(database: IDBDatabase) {
    this.database = database;
  }

  async readHead(
    namespace: string,
  ): Promise<WorkbenchPersistenceV3GenerationHead> {
    const transaction = this.database.transaction(
      WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE,
      'readonly',
    );
    const value = await requestResult(
      transaction.objectStore(
        WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE,
      ).get(namespace),
    );
    if (value === undefined) return defaultHead(namespace);
    if (!isGenerationHead(value, namespace)) {
      console.warn(
        '[Workbench persistence] Ignoring an invalid V3 generation head while retaining generation records.',
      );
      return defaultHead(namespace);
    }
    return structuredClone(value);
  }

  async stageCandidate(
    candidate: WorkbenchPersistenceV3GenerationCandidate,
  ): Promise<WorkbenchPersistenceV3StageResult> {
    const key = generationKey(candidate.namespace, candidate.generationId);
    const transaction = this.database.transaction(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      'readwrite',
    );
    const completed = transactionCompleted(transaction);
    const store = transaction.objectStore(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
    );
    const existing = await requestResult(store.get(key)) as
      IndexedDbGenerationRecord | undefined;
    if (existing !== undefined) {
      if (
        existing.contentFingerprint !== candidate.contentFingerprint ||
        existing.capturedAtMs !== candidate.capturedAtMs ||
        canonicalizeWorkbenchPersistenceV3Json(existing.content) !==
          canonicalizeWorkbenchPersistenceV3Json(candidate.content)
      ) {
        transaction.abort();
        await completed.catch(() => undefined);
        throw new Error(
          'Persistence V3 generation identity collision detected.',
        );
      }
      await completed;
      return {
        status: 'already-staged',
        generation: cloneGeneration(existing),
      };
    }
    const record: IndexedDbGenerationRecord = {
      key,
      namespace: candidate.namespace,
      generationId: candidate.generationId,
      contentFingerprint: candidate.contentFingerprint,
      capturedAtMs: candidate.capturedAtMs,
      content: structuredClone(candidate.content),
    };
    store.add(record);
    await completed;
    return {
      status: 'staged',
      generation: cloneGeneration(record),
    };
  }

  async readGeneration(
    namespace: string,
    generationId: string,
  ): Promise<WorkbenchPersistenceV3StoredGeneration | null> {
    const transaction = this.database.transaction(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      'readonly',
    );
    const value = await requestResult(
      transaction.objectStore(
        WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      ).get(generationKey(namespace, generationId)),
    );
    return value === undefined
      ? null
      : normalizeGenerationRecord(value, namespace, generationId);
  }

  async compareAndSwapHead(
    command: WorkbenchPersistenceV3CompareAndSwapHeadCommand,
  ): Promise<WorkbenchPersistenceV3CompareAndSwapHeadResult> {
    const transaction = this.database.transaction(
      [
        WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE,
        WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      ],
      'readwrite',
    );
    const completed = transactionCompleted(transaction);
    const headStore = transaction.objectStore(
      WORKBENCH_PERSISTENCE_V3_GENERATION_HEAD_STORE,
    );
    const generationStore = transaction.objectStore(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
    );
    const currentValue = await requestResult(headStore.get(command.namespace));
    const current = isGenerationHead(currentValue, command.namespace)
      ? currentValue
      : defaultHead(command.namespace);
    if (current.revision !== command.expectedRevision) {
      await completed;
      return {
        ok: false,
        status: 'revision-conflict',
        expectedRevision: command.expectedRevision,
        head: structuredClone(current),
      };
    }
    const generation = await requestResult(
      generationStore.get(
        generationKey(command.namespace, command.generationId),
      ),
    );
    if (generation === undefined) {
      transaction.abort();
      await completed.catch(() => undefined);
      throw new Error(
        'Persistence V3 cannot activate a generation that was not staged.',
      );
    }
    if (current.currentGenerationId === command.generationId) {
      await completed;
      return {
        ok: true,
        status: 'already-current',
        head: structuredClone(current),
      };
    }
    const next: WorkbenchPersistenceV3GenerationHead = {
      namespace: command.namespace,
      revision: current.revision + 1,
      currentGenerationId: command.generationId,
      previousGenerationId: current.currentGenerationId,
    };
    headStore.put(next);
    await completed;
    return {
      ok: true,
      status: 'activated',
      head: structuredClone(next),
    };
  }

  async listGenerationIds(namespace: string): Promise<string[]> {
    const transaction = this.database.transaction(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      'readonly',
    );
    const values = await requestResult(
      transaction.objectStore(
        WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      ).getAll(),
    ) as IndexedDbGenerationRecord[];
    const prefix = `${namespace}\u0000`;
    return values
      .flatMap((value) => {
        if (
          value.namespace === namespace &&
          typeof value.generationId === 'string' &&
          value.generationId.length > 0
        ) {
          return [value.generationId];
        }
        return typeof value.key === 'string' && value.key.startsWith(prefix)
          ? [value.key.slice(prefix.length)]
          : [];
      })
      .filter((generationId, index, ids) => (
        generationId.length > 0 && ids.indexOf(generationId) === index
      ))
      .sort();
  }

  async pruneGenerations(
    namespace: string,
    options: WorkbenchPersistenceV3PruneOptions = {},
  ): Promise<WorkbenchPersistenceV3PruneResult> {
    const retained = new Set(options.retainGenerationIds ?? []);
    const transaction = this.database.transaction(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
      'readwrite',
    );
    const completed = transactionCompleted(transaction);
    const store = transaction.objectStore(
      WORKBENCH_PERSISTENCE_V3_GENERATION_STORE,
    );
    const values = await requestResult(store.getAll()) as
      IndexedDbGenerationRecord[];
    const removedGenerationIds: string[] = [];
    for (const value of values) {
      if (value.namespace !== namespace || retained.has(value.generationId)) {
        continue;
      }
      store.delete(value.key);
      removedGenerationIds.push(value.generationId);
    }
    await completed;
    return {
      retainedGenerationIds: [...retained].sort(),
      removedGenerationIds: removedGenerationIds.sort(),
    };
  }
}
