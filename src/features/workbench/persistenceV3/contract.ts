import type { WorkbenchFileKind } from '../workbenchFileKind.ts';

export const WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY =
  'hard-sphere-lab.persistence-v3' as const;
export const WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION = 1 as const;

export const WORKBENCH_PERSISTENCE_FIELD_CLASSES = [
  'authoritative',
  'relation',
  'derived',
  'quality',
  'ui-checkpoint',
  'transient',
] as const;

export type WorkbenchPersistenceFieldClass =
  (typeof WORKBENCH_PERSISTENCE_FIELD_CLASSES)[number];

export const WORKBENCH_PERSISTENCE_V3_AGGREGATE_KINDS = [
  'workspace-manifest',
  'file-header',
  'standard-document',
  'ideal-document',
  'heat-capacity-document',
  'heat-capacity-mode',
  'heat-capacity-batch',
  'heat-capacity-trial',
  'heat-capacity-calculation',
  'piston-oscillation-document',
  'ui-checkpoint',
] as const;

export type WorkbenchPersistenceV3AggregateKind =
  (typeof WORKBENCH_PERSISTENCE_V3_AGGREGATE_KINDS)[number];

export interface WorkbenchPersistenceV3AggregateRef {
  kind: WorkbenchPersistenceV3AggregateKind;
  id: string;
  fileKind?: WorkbenchFileKind;
  fileId?: string;
  revision?: number;
}

export type WorkbenchPersistenceV3DiagnosticCategory =
  | 'schema-version'
  | 'schema-shape'
  | 'identity'
  | 'relationship'
  | 'authoritative-data'
  | 'resource-limit'
  | 'revision-conflict'
  | 'quota'
  | 'transaction'
  | 'unsupported-future'
  | 'derived-cache'
  | 'quality';

export type WorkbenchPersistenceV3DiagnosticPhase =
  | 'capture'
  | 'encode'
  | 'decode'
  | 'migration'
  | 'reference-validation'
  | 'write'
  | 'readback'
  | 'restore'
  | 'scheduler';

export type WorkbenchPersistenceV3RetryDirective =
  | 'never'
  | 'after-state-change'
  | 'transient-backoff'
  | 'manual';

export type WorkbenchPersistenceV3RecoveryDirective =
  | 'none'
  | 'retry'
  | 'recompute-derived'
  | 'quarantine-mode'
  | 'quarantine-file'
  | 'read-only-workspace'
  | 'user-action';

export interface WorkbenchPersistenceV3Diagnostic {
  severity: 'info' | 'warning' | 'error' | 'fatal';
  phase: WorkbenchPersistenceV3DiagnosticPhase;
  category: WorkbenchPersistenceV3DiagnosticCategory;
  code: string;
  message: string;
  aggregate: WorkbenchPersistenceV3AggregateRef;
  retry: WorkbenchPersistenceV3RetryDirective;
  recovery: WorkbenchPersistenceV3RecoveryDirective;
  fieldPath?: string;
  namespace?: string;
  generationId?: string;
  mode?: 'demo' | 'guide' | 'free';
  sourceVersion?: number;
  supportedVersion?: number;
  developerDetail?: string;
}

export type WorkbenchPersistenceV3DecodeStatus =
  | 'exact'
  | 'migrated'
  | 'repaired-cache'
  | 'unsupported-future'
  | 'quarantined';

export type WorkbenchPersistenceV3Success<T> = {
  ok: true;
  status: Exclude<
    WorkbenchPersistenceV3DecodeStatus,
    'unsupported-future' | 'quarantined'
  >;
  value: T;
  diagnostics: WorkbenchPersistenceV3Diagnostic[];
};

export type WorkbenchPersistenceV3Failure = {
  ok: false;
  status: Extract<
    WorkbenchPersistenceV3DecodeStatus,
    'unsupported-future' | 'quarantined'
  >;
  raw: unknown;
  diagnostics: [WorkbenchPersistenceV3Diagnostic, ...WorkbenchPersistenceV3Diagnostic[]];
};

export type WorkbenchPersistenceV3DecodeResult<T> =
  | WorkbenchPersistenceV3Success<T>
  | WorkbenchPersistenceV3Failure;

export const createWorkbenchPersistenceV3Diagnostic = (
  diagnostic: WorkbenchPersistenceV3Diagnostic,
): WorkbenchPersistenceV3Diagnostic => ({ ...diagnostic });

export const createWorkbenchPersistenceV3Success = <T>(
  status: WorkbenchPersistenceV3Success<T>['status'],
  value: T,
  diagnostics: WorkbenchPersistenceV3Diagnostic[] = [],
): WorkbenchPersistenceV3Success<T> => ({
  ok: true,
  status,
  value,
  diagnostics: diagnostics.map(createWorkbenchPersistenceV3Diagnostic),
});

export const createWorkbenchPersistenceV3Failure = (
  status: WorkbenchPersistenceV3Failure['status'],
  raw: unknown,
  diagnostics: WorkbenchPersistenceV3Failure['diagnostics'],
): WorkbenchPersistenceV3Failure => ({
  ok: false,
  status,
  raw,
  diagnostics: diagnostics.map(createWorkbenchPersistenceV3Diagnostic) as
    WorkbenchPersistenceV3Failure['diagnostics'],
});

export type WorkbenchPersistenceV3ErrorKind =
  | 'snapshot-contract'
  | 'unsupported-future'
  | 'conflict'
  | 'quota'
  | 'blocked'
  | 'storage-unavailable'
  | 'transaction-aborted'
  | 'readback-mismatch'
  | 'unknown';

export class WorkbenchPersistenceV3Error extends Error {
  readonly kind: WorkbenchPersistenceV3ErrorKind;
  readonly retry: WorkbenchPersistenceV3RetryDirective;
  readonly diagnostic: WorkbenchPersistenceV3Diagnostic;

  constructor(
    kind: WorkbenchPersistenceV3ErrorKind,
    diagnostic: WorkbenchPersistenceV3Diagnostic,
    options?: ErrorOptions,
  ) {
    super(diagnostic.message, options);
    this.name = 'WorkbenchPersistenceV3Error';
    this.kind = kind;
    this.retry = diagnostic.retry;
    this.diagnostic = createWorkbenchPersistenceV3Diagnostic(diagnostic);
  }
}
