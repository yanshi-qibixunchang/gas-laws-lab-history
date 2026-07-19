import {
  WorkbenchPersistenceV3Error,
  createWorkbenchPersistenceV3Diagnostic,
  type WorkbenchPersistenceV3ErrorKind,
  type WorkbenchPersistenceV3RecoveryDirective,
  type WorkbenchPersistenceV3RetryDirective,
} from './contract.ts';

export interface WorkbenchPersistenceV3GenerationCandidate<TContent = unknown> {
  namespace: string;
  generationId: string;
  contentFingerprint: string;
  capturedAtMs: number;
  content: TContent;
}

export interface WorkbenchPersistenceV3StoredGeneration<TContent = unknown>
  extends WorkbenchPersistenceV3GenerationCandidate<TContent> {}

export interface WorkbenchPersistenceV3GenerationHead {
  namespace: string;
  revision: number;
  currentGenerationId: string | null;
  previousGenerationId: string | null;
}

export type WorkbenchPersistenceV3StageResult<TContent = unknown> = {
  status: 'staged' | 'already-staged';
  generation: WorkbenchPersistenceV3StoredGeneration<TContent>;
};

export interface WorkbenchPersistenceV3CompareAndSwapHeadCommand {
  namespace: string;
  generationId: string;
  expectedRevision: number;
}

export type WorkbenchPersistenceV3CompareAndSwapHeadResult =
  | {
      ok: true;
      status: 'activated' | 'already-current';
      head: WorkbenchPersistenceV3GenerationHead;
    }
  | {
      ok: false;
      status: 'revision-conflict';
      expectedRevision: number;
      head: WorkbenchPersistenceV3GenerationHead;
    };

export interface WorkbenchPersistenceV3PruneOptions {
  retainGenerationIds?: Iterable<string>;
}

export interface WorkbenchPersistenceV3PruneResult {
  retainedGenerationIds: string[];
  removedGenerationIds: string[];
}

export interface WorkbenchPersistenceV3GenerationStore<TContent = unknown> {
  readHead(namespace: string): Promise<WorkbenchPersistenceV3GenerationHead>;
  stageCandidate(
    candidate: WorkbenchPersistenceV3GenerationCandidate<TContent>,
  ): Promise<WorkbenchPersistenceV3StageResult<TContent>>;
  readGeneration(
    namespace: string,
    generationId: string,
  ): Promise<WorkbenchPersistenceV3StoredGeneration<TContent> | null>;
  compareAndSwapHead(
    command: WorkbenchPersistenceV3CompareAndSwapHeadCommand,
  ): Promise<WorkbenchPersistenceV3CompareAndSwapHeadResult>;
  listGenerationIds(namespace: string): Promise<string[]>;
  pruneGenerations(
    namespace: string,
    options?: WorkbenchPersistenceV3PruneOptions,
  ): Promise<WorkbenchPersistenceV3PruneResult>;
}

interface GenerationErrorOptions {
  kind: WorkbenchPersistenceV3ErrorKind;
  namespace: string;
  generationId?: string;
  category:
    | 'schema-shape'
    | 'identity'
    | 'relationship'
    | 'revision-conflict'
    | 'authoritative-data';
  code: string;
  message: string;
  retry: WorkbenchPersistenceV3RetryDirective;
  recovery: WorkbenchPersistenceV3RecoveryDirective;
}

const createGenerationError = ({
  kind,
  namespace,
  generationId,
  category,
  code,
  message,
  retry,
  recovery,
}: GenerationErrorOptions) => new WorkbenchPersistenceV3Error(
  kind,
  createWorkbenchPersistenceV3Diagnostic({
    severity: 'error',
    phase: 'write',
    category,
    code,
    message,
    aggregate: {
      kind: 'workspace-manifest',
      id: namespace,
    },
    retry,
    recovery,
    namespace,
    generationId,
  }),
);

const requireNonEmptyIdentity = (
  value: string,
  label: 'namespace' | 'generationId' | 'contentFingerprint',
) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createGenerationError({
      kind: 'snapshot-contract',
      namespace: label === 'namespace' ? String(value) : 'unknown',
      generationId: label === 'generationId' ? String(value) : undefined,
      category: 'schema-shape',
      code: `persistence-v3-generation-invalid-${label}`,
      message: `Generation ${label} must be a non-empty string.`,
      retry: 'after-state-change',
      recovery: 'retry',
    });
  }
};

const requireNamespace = (namespace: string) => {
  requireNonEmptyIdentity(namespace, 'namespace');
};

const requireGenerationId = (generationId: string) => {
  requireNonEmptyIdentity(generationId, 'generationId');
};

const requireExpectedRevision = (
  namespace: string,
  generationId: string,
  expectedRevision: number,
) => {
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    throw createGenerationError({
      kind: 'snapshot-contract',
      namespace,
      generationId,
      category: 'schema-shape',
      code: 'persistence-v3-generation-invalid-expected-revision',
      message: 'Expected head revision must be a non-negative safe integer.',
      retry: 'after-state-change',
      recovery: 'retry',
    });
  }
};

const requireCandidate = <TContent>(
  candidate: WorkbenchPersistenceV3GenerationCandidate<TContent>,
) => {
  requireNamespace(candidate.namespace);
  requireGenerationId(candidate.generationId);
  requireNonEmptyIdentity(candidate.contentFingerprint, 'contentFingerprint');
  if (!Number.isFinite(candidate.capturedAtMs) || candidate.capturedAtMs < 0) {
    throw createGenerationError({
      kind: 'snapshot-contract',
      namespace: candidate.namespace,
      generationId: candidate.generationId,
      category: 'schema-shape',
      code: 'persistence-v3-generation-invalid-captured-at',
      message: 'Generation capture time must be a finite non-negative number.',
      retry: 'after-state-change',
      recovery: 'retry',
    });
  }
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const areArrayBuffersEqual = (left: ArrayBuffer, right: ArrayBuffer) => {
  if (left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  return leftBytes.every((value, index) => value === rightBytes[index]);
};

interface StructuredValueComparisonState {
  leftToRight: Map<object, object>;
  rightToLeft: Map<object, object>;
}

const areStructuredValuesEqual = (
  left: unknown,
  right: unknown,
  state: StructuredValueComparisonState = {
    leftToRight: new Map(),
    rightToLeft: new Map(),
  },
): boolean => {
  if (Object.is(left, right)) return true;
  if (
    typeof left !== 'object' ||
    left === null ||
    typeof right !== 'object' ||
    right === null
  ) return false;

  const knownRight = state.leftToRight.get(left);
  if (knownRight !== undefined) return knownRight === right;
  if (state.rightToLeft.has(right)) return false;
  state.leftToRight.set(left, right);
  state.rightToLeft.set(right, left);

  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date &&
      right instanceof Date &&
      left.getTime() === right.getTime();
  }
  if (left instanceof RegExp || right instanceof RegExp) {
    return left instanceof RegExp &&
      right instanceof RegExp &&
      left.source === right.source &&
      left.flags === right.flags;
  }
  if (left instanceof ArrayBuffer || right instanceof ArrayBuffer) {
    return left instanceof ArrayBuffer &&
      right instanceof ArrayBuffer &&
      areArrayBuffersEqual(left, right);
  }
  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    if (!ArrayBuffer.isView(left) || !ArrayBuffer.isView(right)) return false;
    if (left.constructor !== right.constructor || left.byteLength !== right.byteLength) return false;
    const leftBytes = new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
    const rightBytes = new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
    return leftBytes.every((value, index) => value === rightBytes[index]);
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => areStructuredValuesEqual(value, right[index], state));
  }
  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map) || left.size !== right.size) return false;
    const leftEntries = [...left.entries()];
    const rightEntries = [...right.entries()];
    return leftEntries.every(([leftKey, leftValue], index) => {
      const [rightKey, rightValue] = rightEntries[index]!;
      return areStructuredValuesEqual(leftKey, rightKey, state) &&
        areStructuredValuesEqual(leftValue, rightValue, state);
    });
  }
  if (left instanceof Set || right instanceof Set) {
    if (!(left instanceof Set) || !(right instanceof Set) || left.size !== right.size) return false;
    const leftValues = [...left.values()];
    const rightValues = [...right.values()];
    return leftValues.every((value, index) => (
      areStructuredValuesEqual(value, rightValues[index], state)
    ));
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => (
      key === rightKeys[index] &&
      areStructuredValuesEqual(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
        state,
      )
    ));
};

const cloneGeneration = <TContent>(
  generation: WorkbenchPersistenceV3StoredGeneration<TContent>,
): WorkbenchPersistenceV3StoredGeneration<TContent> => ({
  namespace: generation.namespace,
  generationId: generation.generationId,
  contentFingerprint: generation.contentFingerprint,
  capturedAtMs: generation.capturedAtMs,
  content: cloneValue(generation.content),
});

const cloneHead = (
  head: WorkbenchPersistenceV3GenerationHead,
): WorkbenchPersistenceV3GenerationHead => ({ ...head });

const createEmptyHead = (
  namespace: string,
): WorkbenchPersistenceV3GenerationHead => ({
  namespace,
  revision: 0,
  currentGenerationId: null,
  previousGenerationId: null,
});

const cloneCandidateForStorage = <TContent>(
  candidate: WorkbenchPersistenceV3GenerationCandidate<TContent>,
) => {
  try {
    return cloneGeneration(candidate);
  } catch {
    throw createGenerationError({
      kind: 'snapshot-contract',
      namespace: candidate.namespace,
      generationId: candidate.generationId,
      category: 'schema-shape',
      code: 'persistence-v3-generation-content-not-cloneable',
      message: `Generation ${candidate.generationId} content is not structured-cloneable.`,
      retry: 'after-state-change',
      recovery: 'retry',
    });
  }
};

/**
 * Reference implementation for the generation protocol.
 *
 * Methods are asynchronous so an IndexedDB implementation can implement the
 * same interface later. Each method completes its mutation synchronously before
 * returning its promise, which makes the in-memory CAS atomic in one JS realm.
 */
export class InMemoryWorkbenchPersistenceV3GenerationStore<TContent = unknown>
implements WorkbenchPersistenceV3GenerationStore<TContent> {
  private readonly heads = new Map<string, WorkbenchPersistenceV3GenerationHead>();
  private readonly generations = new Map<
    string,
    Map<string, WorkbenchPersistenceV3StoredGeneration<TContent>>
  >();

  private getHead(namespace: string) {
    return this.heads.get(namespace) ?? createEmptyHead(namespace);
  }

  private getNamespaceGenerations(namespace: string) {
    const existing = this.generations.get(namespace);
    if (existing) return existing;
    const created = new Map<string, WorkbenchPersistenceV3StoredGeneration<TContent>>();
    this.generations.set(namespace, created);
    return created;
  }

  async readHead(namespace: string) {
    requireNamespace(namespace);
    return cloneHead(this.getHead(namespace));
  }

  async stageCandidate(
    candidate: WorkbenchPersistenceV3GenerationCandidate<TContent>,
  ): Promise<WorkbenchPersistenceV3StageResult<TContent>> {
    requireCandidate(candidate);
    const candidateSnapshot = cloneCandidateForStorage(candidate);
    const existing = this.generations
      .get(candidate.namespace)
      ?.get(candidate.generationId);
    if (existing) {
      if (
        existing.contentFingerprint !== candidateSnapshot.contentFingerprint ||
        !areStructuredValuesEqual(existing.content, candidateSnapshot.content)
      ) {
        throw createGenerationError({
          kind: 'conflict',
          namespace: candidate.namespace,
          generationId: candidate.generationId,
          category: 'authoritative-data',
          code: 'persistence-v3-generation-content-address-conflict',
          message: `Generation ${candidate.generationId} is already bound to different content.`,
          retry: 'never',
          recovery: 'read-only-workspace',
        });
      }
      if (existing.capturedAtMs !== candidateSnapshot.capturedAtMs) {
        throw createGenerationError({
          kind: 'conflict',
          namespace: candidate.namespace,
          generationId: candidate.generationId,
          category: 'identity',
          code: 'persistence-v3-generation-descriptor-conflict',
          message: `Generation ${candidate.generationId} is already bound to a different capture time.`,
          retry: 'never',
          recovery: 'read-only-workspace',
        });
      }
      return {
        status: 'already-staged',
        generation: cloneGeneration(existing),
      };
    }

    const generations = this.getNamespaceGenerations(candidate.namespace);
    const stored = candidateSnapshot;
    generations.set(stored.generationId, stored);
    return {
      status: 'staged',
      generation: cloneGeneration(stored),
    };
  }

  async readGeneration(namespace: string, generationId: string) {
    requireNamespace(namespace);
    requireGenerationId(generationId);
    const generation = this.generations.get(namespace)?.get(generationId);
    return generation ? cloneGeneration(generation) : null;
  }

  async compareAndSwapHead(
    command: WorkbenchPersistenceV3CompareAndSwapHeadCommand,
  ): Promise<WorkbenchPersistenceV3CompareAndSwapHeadResult> {
    requireNamespace(command.namespace);
    requireGenerationId(command.generationId);
    requireExpectedRevision(
      command.namespace,
      command.generationId,
      command.expectedRevision,
    );

    const currentHead = this.getHead(command.namespace);
    if (currentHead.revision !== command.expectedRevision) {
      return {
        ok: false,
        status: 'revision-conflict',
        expectedRevision: command.expectedRevision,
        head: cloneHead(currentHead),
      };
    }

    const candidate = this.generations.get(command.namespace)?.get(command.generationId);
    if (!candidate) {
      throw createGenerationError({
        kind: 'snapshot-contract',
        namespace: command.namespace,
        generationId: command.generationId,
        category: 'relationship',
        code: 'persistence-v3-generation-candidate-missing',
        message: `Generation ${command.generationId} must be staged and read back before activation.`,
        retry: 'after-state-change',
        recovery: 'retry',
      });
    }

    if (currentHead.currentGenerationId === command.generationId) {
      return {
        ok: true,
        status: 'already-current',
        head: cloneHead(currentHead),
      };
    }

    if (currentHead.revision >= Number.MAX_SAFE_INTEGER) {
      throw createGenerationError({
        kind: 'conflict',
        namespace: command.namespace,
        generationId: command.generationId,
        category: 'revision-conflict',
        code: 'persistence-v3-generation-revision-exhausted',
        message: 'Generation head revision cannot advance safely.',
        retry: 'never',
        recovery: 'read-only-workspace',
      });
    }

    const nextHead: WorkbenchPersistenceV3GenerationHead = {
      namespace: command.namespace,
      revision: currentHead.revision + 1,
      currentGenerationId: candidate.generationId,
      previousGenerationId: currentHead.currentGenerationId,
    };
    this.heads.set(command.namespace, nextHead);
    return {
      ok: true,
      status: 'activated',
      head: cloneHead(nextHead),
    };
  }

  async listGenerationIds(namespace: string) {
    requireNamespace(namespace);
    return [...(this.generations.get(namespace)?.keys() ?? [])];
  }

  async pruneGenerations(
    namespace: string,
    options: WorkbenchPersistenceV3PruneOptions = {},
  ): Promise<WorkbenchPersistenceV3PruneResult> {
    requireNamespace(namespace);
    const generations = this.generations.get(namespace);
    if (!generations) {
      return {
        retainedGenerationIds: [],
        removedGenerationIds: [],
      };
    }

    const head = this.getHead(namespace);
    const retained = new Set<string>(options.retainGenerationIds ?? []);
    if (head.currentGenerationId !== null) retained.add(head.currentGenerationId);
    if (head.previousGenerationId !== null) retained.add(head.previousGenerationId);

    const retainedGenerationIds: string[] = [];
    const removedGenerationIds: string[] = [];
    for (const generationId of generations.keys()) {
      if (retained.has(generationId)) {
        retainedGenerationIds.push(generationId);
      } else {
        generations.delete(generationId);
        removedGenerationIds.push(generationId);
      }
    }
    if (generations.size === 0) {
      this.generations.delete(namespace);
    }
    return {
      retainedGenerationIds,
      removedGenerationIds,
    };
  }
}
