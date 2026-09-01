import { PhysicsEngine } from '../../../domain/hardSphere/PhysicsEngine.ts';
import {
  HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
  validateHardSphereSimulationParams,
} from '../../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  HEAT_CAPACITY_FREE_BATCH_VERSION,
} from '../../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  getHeatCapacityFreeExperimentGroupInvariantErrors,
  type HeatCapacityFreeExperimentGroupCollection,
} from '../../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
  HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
  diagnoseHeatCapacityFreeExperimentGroupCollectionForPersistence,
  normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence,
  normalizeHeatCapacityModeSessionStore,
} from '../workbenchHeatCapacityModeSession.ts';
import {
  normalizeHardSphereEngineSnapshot,
} from '../../../domain/hardSphere/hardSphereSnapshotCodec.ts';
import {
  normalizePistonOscillationGuideSession,
  type PistonOscillationGuideSession,
} from '../../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  normalizePistonOscillationDemoSession,
} from '../../../domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';
import {
  normalizePistonOscillationFreeSession,
} from '../../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type {
  PistonOscillationCalculationAnswerState,
  PistonOscillationDataProcessingSession,
  PistonOscillationPeriodAnswerState,
} from '../../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  projectHardSphereEngineOntoWorkspaceFile,
} from '../workbenchHardSphereProjection.ts';
import {
  decodeHeatCapacityFreeExperimentDomainAggregate,
  isAllowedHeatCapacityFreeDomainAggregateCacheRepair,
  isAllowedHeatCapacityFreeDomainAggregateMigration,
} from '../workbenchHeatCapacityFreeAggregateCodec.ts';
import {
  prepareHeatCapacityFreeCapture,
} from '../workbenchHeatCapacityFreeCapture.ts';
import {
  applyHeatCapacityFreeDomainToRuntimeFields,
  applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields,
  areWorkbenchParamsEqual,
  clampWorkbenchLiveSplitRatio,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  createEmptyChartData,
  createIdleStats,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreeFileAcknowledgements,
  WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
  type HeatCapacityFreeExperimentDomainState,
  type WorkbenchFileState,
  type WorkbenchHeatCapacityState,
  type WorkbenchIdealState,
  type WorkbenchStandardState,
} from '../workbenchState.ts';
import {
  assertNeverWorkbenchFileKind,
  isWorkbenchFileKind,
  type WorkbenchFileKind,
} from '../workbenchFileKind.ts';
import {
  normalizePersistenceV3IdealWindowLayout as normalizeIdealWindowLayoutState,
  normalizePersistenceV3StandardResultsLayout as normalizeStandardResultsLayout,
} from './layoutNormalization.ts';
import {
  normalizeWorkbenchPanelKeys,
} from '../workbenchPanelRegistry.ts';
import {
  repairPistonOscillationModeSessionExclusivity,
} from '../../../domain/pistonOscillation/pistonOscillationModeSessionExclusivity.ts';
import {
  canonicalizeWorkbenchPersistenceV3Json,
} from './fingerprint.ts';
import {
  decodeHeatCapacityV3AuthorityValues,
} from './heatCapacityValueDecoder.ts';
import {
  createWorkbenchPersistenceV3Diagnostic,
  createWorkbenchPersistenceV3Failure,
  createWorkbenchPersistenceV3Success,
  type WorkbenchPersistenceV3AggregateKind,
  type WorkbenchPersistenceV3DecodeResult,
  type WorkbenchPersistenceV3Diagnostic,
  type WorkbenchPersistenceV3DiagnosticCategory,
  type WorkbenchPersistenceV3DiagnosticPhase,
} from './contract.ts';

export const WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION = 1 as const;

export const PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION = 3 as const;
export const PISTON_OSCILLATION_GUIDE_DERIVED_CACHE_VERSION = 1 as const;

export interface WorkbenchPersistenceV3ClassifiedFields {
  authoritative: Record<string, unknown>;
  relation: Record<string, unknown>;
  derived: Record<string, unknown>;
  quality: Record<string, unknown>;
  uiCheckpoint: Record<string, unknown>;
}

export interface WorkbenchPersistenceV3FileProjection {
  projectionVersion:
    typeof WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION;
  fileId: string;
  fileKind: WorkbenchFileKind;
  aggregateKind: Exclude<
    WorkbenchPersistenceV3AggregateKind,
    | 'workspace-manifest'
    | 'file-header'
    | 'heat-capacity-mode'
    | 'heat-capacity-batch'
    | 'heat-capacity-trial'
    | 'heat-capacity-calculation'
    | 'ui-checkpoint'
  >;
  fields: WorkbenchPersistenceV3ClassifiedFields;
}

export interface WorkbenchPersistenceV3ProjectionCompatibilityHooks {
  migrateMissingHeatCapacityExperimentGroups?: (input: {
    fileId: string;
    selectedScheme: 'real' | 'ideal';
    real: HeatCapacityFreeExperimentDomainState;
    ideal: HeatCapacityFreeExperimentDomainState;
    fallbackCreatedAtMs: number;
  }) => HeatCapacityFreeExperimentGroupCollection;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isFiniteNonNegative = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isSimulationParamsShape = (value: unknown) => {
  if (!isPlainRecord(value)) return false;
  const requiredNumberKeys = [
    'L',
    'N',
    'r',
    'm',
    'k',
    'dt',
    'nu',
    'equilibriumTime',
    'statsDuration',
  ] as const;
  return requiredNumberKeys.every((key) => isFiniteNumber(value[key])) &&
    (
      value.targetTemperature === undefined ||
      isFiniteNumber(value.targetTemperature)
    );
};

const isHistogramBin = (value: unknown) => (
  isPlainRecord(value) &&
  isFiniteNumber(value.binStart) &&
  isFiniteNumber(value.binEnd) &&
  isFiniteNumber(value.count) &&
  isFiniteNumber(value.probability) &&
  (
    value.theoretical === undefined ||
    isFiniteNumber(value.theoretical)
  )
);

const isCanonicalChartData = (value: unknown) => (
  isPlainRecord(value) &&
  Array.isArray(value.speed) &&
  value.speed.length <= 30 &&
  value.speed.every(isHistogramBin) &&
  Array.isArray(value.energy) &&
  value.energy.length <= 30 &&
  value.energy.every(isHistogramBin) &&
  Array.isArray(value.energyLog) &&
  value.energyLog.length <= 30 &&
  value.energyLog.every((point) => (
    isPlainRecord(point) &&
    isFiniteNumber(point.energy) &&
    isFiniteNumber(point.logProb) &&
    isFiniteNumber(point.theoreticalLog)
  )) &&
  Array.isArray(value.tempHistory) &&
  value.tempHistory.length <= HARD_SPHERE_MAX_TEMPERATURE_HISTORY &&
  value.tempHistory.every((point) => (
    isPlainRecord(point) &&
    isFiniteNumber(point.time) &&
    isFiniteNumber(point.error) &&
    isFiniteNumber(point.totalEnergy) &&
    (
      point.temperature === undefined ||
      isFiniteNumber(point.temperature)
    ) &&
    (
      point.targetTemperature === undefined ||
      isFiniteNumber(point.targetTemperature)
    )
  ))
);

const isCanonicalIdealPoint = (
  value: unknown,
  relation: 'pt' | 'pv' | 'pn',
): value is Record<string, unknown> & { id: string } => (
  isPlainRecord(value) &&
  typeof value.id === 'string' &&
  value.id.trim().length > 0 &&
  value.id.length <= 256 &&
  value.relation === relation &&
  isFiniteNumber(value.targetTemperature) &&
  isFiniteNumber(value.meanTemperature) &&
  isFiniteNumber(value.meanPressure) &&
  isFiniteNumber(value.idealPressure) &&
  isFiniteNumber(value.relativeGap) &&
  isFiniteNumber(value.timestamp) &&
  (value.boxLength === undefined || value.boxLength === null ||
    isFiniteNumber(value.boxLength)) &&
  (value.volume === undefined || value.volume === null ||
    isFiniteNumber(value.volume)) &&
  (value.inverseVolume === undefined || value.inverseVolume === null ||
    isFiniteNumber(value.inverseVolume)) &&
  (value.particleCount === undefined || value.particleCount === null ||
    isFiniteNumber(value.particleCount))
);

const isCanonicalPointsByRelation = (value: unknown) => {
  if (!isPlainRecord(value)) return false;
  const relations = ['pt', 'pv', 'pn'] as const;
  const ids = new Set<string>();
  for (const relation of relations) {
    const points = value[relation];
    if (!Array.isArray(points) || points.length > 1_000) return false;
    for (const point of points) {
      if (!isCanonicalIdealPoint(point, relation) || ids.has(point.id)) {
        return false;
      }
      ids.add(point.id);
    }
  }
  return true;
};

const canonicalClone = <T>(value: T): T => (
  JSON.parse(canonicalizeWorkbenchPersistenceV3Json(value)) as T
);

const areCanonicalValuesEqual = (
  left: unknown,
  right: unknown,
) => {
  try {
    return canonicalizeWorkbenchPersistenceV3Json(left) ===
      canonicalizeWorkbenchPersistenceV3Json(right);
  } catch {
    return false;
  }
};

const createPistonOscillationPeriodAnswerAuthority = (
  answer: PistonOscillationPeriodAnswerState,
) => ({
  draftRaw: answer.draftRaw,
  status: answer.status,
  feedback: answer.feedback,
  attemptCount: answer.attemptCount,
  attempts: answer.attempts,
  resolution: answer.resolution,
});

const createPistonOscillationCalculationAnswerAuthority = (
  answer: PistonOscillationCalculationAnswerState,
) => ({
  draftRaw: answer.draftRaw,
  status: answer.status,
  feedback: answer.feedback,
  attempts: answer.attempts,
  resolution: answer.resolution,
});

const createPistonOscillationDataProcessingAuthority = (
  session: PistonOscillationDataProcessingSession,
) => ({
  schemaVersion: session.schemaVersion,
  processingPolicy: session.processingPolicy,
  status: session.status,
  activeRunIndex: session.activeRunIndex,
  runs: session.runs.map((run) => ({
    rawMeasurementRecordId: run.rawMeasurementRecordId,
    measurementIndex: run.measurementIndex,
    selection: run.selection === null
      ? null
      : {
          algorithmVersion: run.selection.algorithmVersion,
          rangeStartTimeS: run.selection.rangeStartTimeS,
          rangeEndTimeS: run.selection.rangeEndTimeS,
          leftEndpoint: run.selection.leftEndpoint === null
            ? null
            : { sampleIndex: run.selection.leftEndpoint.sampleIndex },
          rightEndpoint: run.selection.rightEndpoint === null
            ? null
            : { sampleIndex: run.selection.rightEndpoint.sampleIndex },
          selectedAtMs: run.selection.selectedAtMs,
        },
    answers: {
      t1: createPistonOscillationPeriodAnswerAuthority(run.answers.t1),
      t2: createPistonOscillationPeriodAnswerAuthority(run.answers.t2),
      period: createPistonOscillationPeriodAnswerAuthority(run.answers.period),
    },
    result: run.result === null
      ? null
      : {
          leftSampleIndex: run.result.leftSampleIndex,
          rightSampleIndex: run.result.rightSampleIndex,
          completedAtMs: run.result.completedAtMs,
        },
  })),
  linearFitResult: session.linearFitResult === null
    ? null
    : {
        algorithmVersion: session.linearFitResult.algorithmVersion,
        selectedRunIndices: session.linearFitResult.selectedRunIndices,
        completedAtMs: session.linearFitResult.completedAtMs,
      },
  calculationSession: session.calculationSession === null
    ? null
    : {
        schemaVersion: session.calculationSession.schemaVersion,
        status: session.calculationSession.status,
        knowns: session.calculationSession.knowns,
        selectedRunIndices: session.calculationSession.selectedRunIndices,
        activeFieldId: session.calculationSession.activeFieldId,
        answers: {
          area: createPistonOscillationCalculationAnswerAuthority(
            session.calculationSession.answers.area,
          ),
          gamma: createPistonOscillationCalculationAnswerAuthority(
            session.calculationSession.answers.gamma,
          ),
          relativeError: createPistonOscillationCalculationAnswerAuthority(
            session.calculationSession.answers.relativeError,
          ),
        },
        startedAtMs: session.calculationSession.startedAtMs,
        completedAtMs: session.calculationSession.completedAtMs,
      },
  audit: session.audit,
  startedAtMs: session.startedAtMs,
  updatedAtMs: session.updatedAtMs,
});

const createPistonOscillationGuideSessionAuthority = (
  session: PistonOscillationGuideSession,
) => ({
  ...session,
  dataProcessing: session.dataProcessing === null
    ? null
    : createPistonOscillationDataProcessingAuthority(session.dataProcessing),
});

const createPistonOscillationGuideDerivedCache = (
  session: PistonOscillationGuideSession,
) => ({
  cacheVersion: PISTON_OSCILLATION_GUIDE_DERIVED_CACHE_VERSION,
  dataProcessing: session.dataProcessing,
});

export const isWorkbenchPersistenceV3AuthoritativeMigrationAllowed = (
  source: WorkbenchPersistenceV3FileProjection,
  canonical: WorkbenchPersistenceV3FileProjection,
) => {
  if (
    source.fileKind === 'heatCapacityPistonOscillation' &&
    canonical.fileKind === 'heatCapacityPistonOscillation' &&
    source.fileId === canonical.fileId
  ) {
    const sourceAuthority = source.fields.authoritative;
    const canonicalAuthority = canonical.fields.authoritative;
    const sourceProjectionVersion =
      sourceAuthority.pistonGuideSessionProjectionVersion;
    if (
      (
        sourceProjectionVersion !== undefined
        && sourceProjectionVersion !== 1
        && sourceProjectionVersion !== 2
      ) ||
      canonicalAuthority.pistonGuideSessionProjectionVersion !==
        PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION
    ) return false;
    try {
      const migratedAuthority = canonicalClone(sourceAuthority);
      migratedAuthority.pistonGuideSessionProjectionVersion =
        PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION;
      if (
        migratedAuthority.lessonIntroAutoShown === undefined &&
        canonicalAuthority.lessonIntroAutoShown === false
      ) {
        migratedAuthority.lessonIntroAutoShown = false;
      }
      if (
        migratedAuthority.demoSession === undefined &&
        canonicalAuthority.demoSession !== undefined
      ) {
        migratedAuthority.demoSession = canonicalClone(
          canonicalAuthority.demoSession,
        );
      }
      if (
        migratedAuthority.freeSession === undefined &&
        canonicalAuthority.freeSession !== undefined
      ) {
        migratedAuthority.freeSession = canonicalClone(
          canonicalAuthority.freeSession,
        );
      }
      migratedAuthority.guideSession = canonicalClone(
        canonicalAuthority.guideSession,
      );
      return areCanonicalValuesEqual(migratedAuthority, canonicalAuthority);
    } catch {
      return false;
    }
  }
  if (
    source.fileKind !== 'heatCapacity' ||
    canonical.fileKind !== 'heatCapacity' ||
    source.fileId !== canonical.fileId
  ) {
    return false;
  }
  const sourceAuthority = source.fields.authoritative;
  const canonicalAuthority = canonical.fields.authoritative;
  const sourceDomains = sourceAuthority.freeDomains;
  const canonicalDomains = canonicalAuthority.freeDomains;
  if (
    !isPlainRecord(sourceDomains) ||
    !isPlainRecord(canonicalDomains)
  ) {
    return false;
  }
  try {
    const candidateAuthority = canonicalClone(sourceAuthority);
    const candidateDomains = candidateAuthority.freeDomains;
    if (!isPlainRecord(candidateDomains)) return false;
    if (
      !areCanonicalValuesEqual(
        sourceAuthority.activeRuntime,
        canonicalAuthority.activeRuntime,
      )
    ) {
      if (
        !isPlainRecord(sourceAuthority.activeRuntime) ||
        !isPlainRecord(canonicalAuthority.activeRuntime)
      ) {
        return false;
      }
      const migratedActiveRuntime = canonicalClone(
        sourceAuthority.activeRuntime,
      );
      if (migratedActiveRuntime.heatCapacityFreeRuntimeVersion === 5) {
        migratedActiveRuntime.heatCapacityFreeRuntimeVersion =
          HEAT_CAPACITY_FREE_RUNTIME_VERSION;
      }
      if (migratedActiveRuntime.heatCapacityFreeTraceVersion === 5) {
        migratedActiveRuntime.heatCapacityFreeTraceVersion =
          HEAT_CAPACITY_FREE_TRACE_VERSION;
      }
      if (
        !areCanonicalValuesEqual(
          migratedActiveRuntime,
          canonicalAuthority.activeRuntime,
        )
      ) {
        return false;
      }
      candidateAuthority.activeRuntime = migratedActiveRuntime;
    }
    for (const scheme of ['real', 'ideal'] as const) {
      const sourceDomain = sourceDomains[scheme];
      const canonicalDomain = canonicalDomains[scheme];
      if (areCanonicalValuesEqual(sourceDomain, canonicalDomain)) {
        continue;
      }
      if (
        !isPlainRecord(canonicalDomain) ||
        !isAllowedHeatCapacityFreeDomainAggregateMigration(
          sourceDomain,
          canonicalDomain as unknown as
            HeatCapacityFreeExperimentDomainState,
        )
      ) {
        return false;
      }
      candidateDomains[scheme] = canonicalClone(canonicalDomain);
    }
    const domainAuthorityChanged = (['real', 'ideal'] as const).some((scheme) => (
      !areCanonicalValuesEqual(sourceDomains[scheme], canonicalDomains[scheme])
    ));
    if (
      sourceDomains.experimentGroups === undefined &&
      canonicalDomains.experimentGroups !== undefined
    ) {
      candidateDomains.experimentGroups = canonicalClone(
        canonicalDomains.experimentGroups,
      );
    } else if (!areCanonicalValuesEqual(
      sourceDomains.experimentGroups,
      canonicalDomains.experimentGroups,
    )) {
      if (
        !domainAuthorityChanged ||
        normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(
          sourceDomains.experimentGroups,
        ) === null ||
        normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(
          canonicalDomains.experimentGroups,
        ) === null
      ) return false;
      candidateDomains.experimentGroups = canonicalClone(
        canonicalDomains.experimentGroups,
      );
    }
    if (
      !areCanonicalValuesEqual(
        sourceAuthority.modeSessions,
        canonicalAuthority.modeSessions,
      )
    ) {
      if (
        !isAllowedHeatCapacityModeSessionMigration(
          sourceAuthority.modeSessions,
          canonicalAuthority.modeSessions,
        ) &&
        !isAllowedHeatCapacityModeSessionCacheRepair(
          sourceAuthority.modeSessions,
          canonicalAuthority.modeSessions,
        )
      ) {
        return false;
      }
      candidateAuthority.modeSessions = canonicalClone(
        canonicalAuthority.modeSessions,
      );
    }
    return areCanonicalValuesEqual(
      candidateAuthority,
      canonicalAuthority,
    );
  } catch {
    return false;
  }
};

export const isWorkbenchPersistenceV3AuthoritativeCacheRepairAllowed = (
  source: WorkbenchPersistenceV3FileProjection,
  canonical: WorkbenchPersistenceV3FileProjection,
) => {
  if (
    source.fileKind !== 'heatCapacity' ||
    canonical.fileKind !== 'heatCapacity' ||
    source.fileId !== canonical.fileId
  ) {
    return false;
  }
  const sourceAuthority = source.fields.authoritative;
  const canonicalAuthority = canonical.fields.authoritative;
  const sourceDomains = sourceAuthority.freeDomains;
  const canonicalDomains = canonicalAuthority.freeDomains;
  if (
    !isPlainRecord(sourceDomains) ||
    !isPlainRecord(canonicalDomains)
  ) {
    return false;
  }
  try {
    const candidateAuthority = canonicalClone(sourceAuthority);
    const candidateDomains = candidateAuthority.freeDomains;
    if (!isPlainRecord(candidateDomains)) return false;
    for (const scheme of ['real', 'ideal'] as const) {
      const sourceDomain = sourceDomains[scheme];
      const canonicalDomain = canonicalDomains[scheme];
      if (areCanonicalValuesEqual(sourceDomain, canonicalDomain)) {
        continue;
      }
      if (
        !isPlainRecord(canonicalDomain) ||
        !isAllowedHeatCapacityFreeDomainAggregateCacheRepair(
          sourceDomain,
          canonicalDomain as unknown as
            HeatCapacityFreeExperimentDomainState,
        )
      ) {
        return false;
      }
      candidateDomains[scheme] = canonicalClone(canonicalDomain);
    }
    if (
      !areCanonicalValuesEqual(
        sourceAuthority.modeSessions,
        canonicalAuthority.modeSessions,
      )
    ) {
      if (
        !isAllowedHeatCapacityModeSessionCacheRepair(
          sourceAuthority.modeSessions,
          canonicalAuthority.modeSessions,
        )
      ) {
        return false;
      }
      candidateAuthority.modeSessions = canonicalClone(
        canonicalAuthority.modeSessions,
      );
    }
    return areCanonicalValuesEqual(
      candidateAuthority,
      canonicalAuthority,
    );
  } catch {
    return false;
  }
};

export const getWorkbenchPersistenceV3AggregateKindForFileKind = (
  kind: WorkbenchFileKind,
): WorkbenchPersistenceV3FileProjection['aggregateKind'] => {
  switch (kind) {
    case 'standard':
      return 'standard-document';
    case 'ideal':
      return 'ideal-document';
    case 'heatCapacity':
      return 'heat-capacity-document';
    case 'heatCapacityPistonOscillation':
      return 'piston-oscillation-document';
    default:
      return assertNeverWorkbenchFileKind(kind);
  }
};

interface FileDiagnosticOptions {
  fileId: string;
  fileKind: WorkbenchFileKind;
  phase: WorkbenchPersistenceV3DiagnosticPhase;
  category: WorkbenchPersistenceV3DiagnosticCategory;
  code: string;
  message: string;
  fieldPath?: string;
  sourceVersion?: number;
  supportedVersion?: number;
}

const createFileDiagnostic = ({
  fileId,
  fileKind,
  phase,
  category,
  code,
  message,
  fieldPath,
  sourceVersion,
  supportedVersion,
}: FileDiagnosticOptions): WorkbenchPersistenceV3Diagnostic => (
  createWorkbenchPersistenceV3Diagnostic({
    severity: category === 'derived-cache' ? 'warning' : 'error',
    phase,
    category,
    code,
    message,
    aggregate: {
      kind: getWorkbenchPersistenceV3AggregateKindForFileKind(fileKind),
      id: fileId,
      fileId,
      fileKind,
    },
    retry: category === 'derived-cache' ? 'never' : 'after-state-change',
    recovery: category === 'derived-cache'
      ? 'recompute-derived'
      : 'quarantine-file',
    fieldPath,
    sourceVersion,
    supportedVersion,
  })
);

const projectionFailure = (
  status: 'unsupported-future' | 'quarantined',
  raw: unknown,
  options: FileDiagnosticOptions,
) => createWorkbenchPersistenceV3Failure(
  status,
  raw,
  [createFileDiagnostic(options)],
);

interface HeatCapacityFutureVersionIssue {
  fieldPath: string;
  sourceVersion: number;
  supportedVersion?: number;
  message: string;
}

const findFutureNumericRecordVersion = (
  value: unknown,
  versionKey: string,
  supportedVersion: number,
  fieldPath: string,
  label: string,
): HeatCapacityFutureVersionIssue | null => {
  if (!isPlainRecord(value)) return null;
  const version = value[versionKey];
  return typeof version === 'number' &&
    Number.isInteger(version) &&
    version > supportedVersion
    ? {
        fieldPath: `${fieldPath}.${versionKey}`,
        sourceVersion: version,
        supportedVersion,
        message: `${label} requires a newer application.`,
      }
    : null;
};

const findFutureHeatCapacityDomainVersion = (
  value: unknown,
  scheme: 'real' | 'ideal',
  fieldPath: string,
  fallback: HeatCapacityFreeExperimentDomainState,
): HeatCapacityFutureVersionIssue | null => {
  const decoded = decodeHeatCapacityFreeExperimentDomainAggregate(
    value,
    scheme,
    'air',
    fallback,
  );
  if (
    decoded.ok ||
    decoded.status !== 'unsupported-future' ||
    typeof decoded.sourceVersion !== 'number'
  ) {
    return null;
  }
  return {
    fieldPath: decoded.fieldPath
      ? `${fieldPath}.${decoded.fieldPath}`
      : fieldPath,
    sourceVersion: decoded.sourceVersion,
    message: decoded.reason,
  };
};

interface HeatCapacityFutureDomainCandidate {
  value: unknown;
  scheme: 'real' | 'ideal';
  fieldPath: string;
  fallback: HeatCapacityFreeExperimentDomainState;
}

const findFirstFutureHeatCapacityDomainVersion = (
  candidates: readonly HeatCapacityFutureDomainCandidate[],
) => {
  for (const candidate of candidates) {
    const issue = findFutureHeatCapacityDomainVersion(
      candidate.value,
      candidate.scheme,
      candidate.fieldPath,
      candidate.fallback,
    );
    if (issue !== null) return issue;
  }
  return null;
};

const mapHeatCapacityRuntimeAggregateFieldPath = (
  fieldPath: string,
  prefix: string,
) => {
  for (const [aggregateKey, runtimeKey] of [
    ['batch', 'heatCapacityFreeBatch'],
    ['activeRunConfigSnapshot', 'heatCapacityFreeActiveRunConfigSnapshot'],
    ['trials', 'heatCapacityFreeTrials'],
    ['traceStore', 'heatCapacityFreeTraceStore'],
    ['activeAttempt', 'heatCapacityFreeActiveAttempt'],
  ] as const) {
    const aggregatePath = `${prefix}.${aggregateKey}`;
    if (
      fieldPath === aggregatePath ||
      fieldPath.startsWith(`${aggregatePath}.`) ||
      fieldPath.startsWith(`${aggregatePath}[`)
    ) {
      return `${prefix}.${runtimeKey}${fieldPath.slice(aggregatePath.length)}`;
    }
  }
  return fieldPath;
};

const findFutureHeatCapacityModeSessionVersion = (
  value: unknown,
  fieldPath: string,
): HeatCapacityFutureVersionIssue | null => {
  if (!isPlainRecord(value)) return null;
  const fallback = createDefaultHeatCapacityFile(1);
  for (const mode of ['demo', 'guide', 'free'] as const) {
    const entry = value[mode];
    if (!isPlainRecord(entry) || !isPlainRecord(entry.snapshot)) continue;
    const snapshot = entry.snapshot;
    const snapshotPath = `${fieldPath}.${mode}.snapshot`;
    const snapshotVersion = findFutureNumericRecordVersion(
      snapshot,
      'schemaVersion',
      HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
      snapshotPath,
      `The suspended ${mode} runtime snapshot`,
    );
    if (snapshotVersion !== null) return snapshotVersion;
    if (mode !== 'free' || !isPlainRecord(snapshot.free)) continue;
    const free = snapshot.free;
    for (const [versionKey, supportedVersion, label] of [
      [
        'heatCapacityFreeRuntimeVersion',
        HEAT_CAPACITY_FREE_RUNTIME_VERSION,
        'The suspended Free runtime',
      ],
      [
        'heatCapacityFreeTraceVersion',
        HEAT_CAPACITY_FREE_TRACE_VERSION,
        'The suspended Free trace store',
      ],
    ] as const) {
      const version = free[versionKey];
      if (
        typeof version === 'number' &&
        Number.isInteger(version) &&
        version > supportedVersion
      ) {
        return {
          fieldPath: `${snapshotPath}.free.${versionKey}`,
          sourceVersion: version,
          supportedVersion,
          message: `${label} requires a newer application.`,
        };
      }
    }
    const realDomain = free.heatCapacityFreeRealDomain;
    const idealDomain = free.heatCapacityFreeIdealDomain;
    const selectedScheme = free.heatCapacityFreeParameterScheme === 'ideal'
      ? 'ideal'
      : 'real';
    const selectedDomain = selectedScheme === 'ideal'
      ? idealDomain
      : realDomain;
    const runtimeAggregate = {
      ...(isPlainRecord(selectedDomain) ? selectedDomain : {}),
      batch: free.heatCapacityFreeBatch,
      activeRunConfigSnapshot: free.heatCapacityFreeActiveRunConfigSnapshot,
      trials: free.heatCapacityFreeTrials,
      traceStore: free.heatCapacityFreeTraceStore,
      activeAttempt: free.heatCapacityFreeActiveAttempt,
    };
    const runtimeFuture = findFutureHeatCapacityDomainVersion(
      runtimeAggregate,
      selectedScheme,
      `${snapshotPath}.free`,
      selectedScheme === 'ideal'
        ? fallback.heatCapacityFreeIdealDomain
        : fallback.heatCapacityFreeRealDomain,
    );
    if (runtimeFuture !== null) {
      return {
        ...runtimeFuture,
        fieldPath: mapHeatCapacityRuntimeAggregateFieldPath(
          runtimeFuture.fieldPath,
          `${snapshotPath}.free`,
        ),
      };
    }
    const realFuture = findFutureHeatCapacityDomainVersion(
      realDomain,
      'real',
      `${snapshotPath}.free.heatCapacityFreeRealDomain`,
      fallback.heatCapacityFreeRealDomain,
    );
    if (realFuture !== null) return realFuture;
    const idealFuture = findFutureHeatCapacityDomainVersion(
      idealDomain,
      'ideal',
      `${snapshotPath}.free.heatCapacityFreeIdealDomain`,
      fallback.heatCapacityFreeIdealDomain,
    );
    if (idealFuture !== null) return idealFuture;
  }
  return null;
};

interface HeatCapacityModeSessionCacheRepair {
  value: unknown;
  repaired: boolean;
  migrated: boolean;
}

const repairHeatCapacityModeSessionCaches = (
  value: unknown,
): HeatCapacityModeSessionCacheRepair => {
  if (!isPlainRecord(value)) {
    return { value, repaired: false, migrated: false };
  }
  try {
    const cloned = canonicalClone(value);
    if (
      !isPlainRecord(cloned.free) ||
      !isPlainRecord(cloned.free.snapshot) ||
      !isPlainRecord(cloned.free.snapshot.free)
    ) {
      return { value: cloned, repaired: false, migrated: false };
    }
    const free = cloned.free.snapshot.free;
    const fallback = createDefaultHeatCapacityFile(1);
    let repaired = false;
    let migrated = false;
    if (free.heatCapacityFreeTraceVersion === 5) {
      free.heatCapacityFreeTraceVersion =
        HEAT_CAPACITY_FREE_TRACE_VERSION;
      migrated = true;
    }
    for (const [key, scheme, fallbackDomain] of [
      [
        'heatCapacityFreeRealDomain',
        'real',
        fallback.heatCapacityFreeRealDomain,
      ],
      [
        'heatCapacityFreeIdealDomain',
        'ideal',
        fallback.heatCapacityFreeIdealDomain,
      ],
    ] as const) {
      const sourceDomain = free[key];
      const decoded = decodeHeatCapacityFreeExperimentDomainAggregate(
        sourceDomain,
        scheme,
        'air',
        fallbackDomain,
      );
      if (decoded.ok) {
        if (
          decoded.status === 'migrated' &&
          isAllowedHeatCapacityFreeDomainAggregateMigration(
            sourceDomain,
            decoded.value,
          )
        ) {
          free[key] = canonicalClone(decoded.value);
          migrated = true;
        } else if (
          decoded.status === 'repaired-cache' &&
          isAllowedHeatCapacityFreeDomainAggregateCacheRepair(
            sourceDomain,
            decoded.value,
          )
        ) {
          free[key] = canonicalClone(decoded.value);
          repaired = true;
        }
      }
    }
    const selectedScheme = free.heatCapacityFreeParameterScheme === 'ideal'
      ? 'ideal'
      : 'real';
    const selectedDomain = selectedScheme === 'ideal'
      ? free.heatCapacityFreeIdealDomain
      : free.heatCapacityFreeRealDomain;
    const runtimeAggregate = {
      ...(isPlainRecord(selectedDomain) ? selectedDomain : {}),
      batch: free.heatCapacityFreeBatch,
      activeRunConfigSnapshot: free.heatCapacityFreeActiveRunConfigSnapshot,
      trials: free.heatCapacityFreeTrials,
      traceStore: free.heatCapacityFreeTraceStore,
      activeAttempt: free.heatCapacityFreeActiveAttempt,
    };
    const decodedRuntime = decodeHeatCapacityFreeExperimentDomainAggregate(
      runtimeAggregate,
      selectedScheme,
      'air',
      selectedScheme === 'ideal'
        ? fallback.heatCapacityFreeIdealDomain
        : fallback.heatCapacityFreeRealDomain,
    );
    if (
      decodedRuntime.ok &&
      decodedRuntime.status === 'migrated' &&
      isAllowedHeatCapacityFreeDomainAggregateMigration(
        runtimeAggregate,
        decodedRuntime.value,
      )
    ) {
      free.heatCapacityFreeBatch = canonicalClone(
        decodedRuntime.value.batch,
      );
      free.heatCapacityFreeActiveRunConfigSnapshot = canonicalClone(
        decodedRuntime.value.activeRunConfigSnapshot,
      );
      free.heatCapacityFreeTrials = canonicalClone(
        decodedRuntime.value.trials,
      );
      free.heatCapacityFreeTraceStore = canonicalClone(
        decodedRuntime.value.traceStore,
      );
      free.heatCapacityFreeActiveAttempt = canonicalClone(
        decodedRuntime.value.activeAttempt,
      );
      migrated = true;
    }
    if (
      isPlainRecord(selectedDomain) &&
      Array.isArray(selectedDomain.trials) &&
      Array.isArray(free.heatCapacityFreeTrials) &&
      selectedDomain.trials.length === free.heatCapacityFreeTrials.length &&
      selectedDomain.trials.every(isPlainRecord) &&
      free.heatCapacityFreeTrials.every(isPlainRecord)
    ) {
      const repairedTopTrials = free.heatCapacityFreeTrials.map(
        (trial, index) => {
          const canonicalTrial = selectedDomain.trials[index]!;
          if (trial.id !== canonicalTrial.id) return null;
          return {
            ...trial,
            correctedSignals: canonicalClone(
              canonicalTrial.correctedSignals,
            ),
          };
        },
      );
      if (
        !repairedTopTrials.some((trial) => trial === null) &&
        areCanonicalValuesEqual(
          repairedTopTrials,
          selectedDomain.trials,
        ) &&
        !areCanonicalValuesEqual(
          free.heatCapacityFreeTrials,
          selectedDomain.trials,
        )
      ) {
        free.heatCapacityFreeTrials = canonicalClone(
          selectedDomain.trials,
        );
        repaired = true;
      }
    }
    const experimentGroups = free.heatCapacityFreeExperimentGroups;
    if (
      isPlainRecord(experimentGroups) &&
      Array.isArray(experimentGroups.groups) &&
      typeof experimentGroups.currentGroupId === 'string' &&
      isPlainRecord(selectedDomain) &&
      Array.isArray(selectedDomain.trials)
    ) {
      const currentGroup = experimentGroups.groups.find((group) => (
        isPlainRecord(group) && group.id === experimentGroups.currentGroupId
      ));
      const runSeries = isPlainRecord(currentGroup) && isPlainRecord(currentGroup.runSeries)
        ? currentGroup.runSeries
        : null;
      if (
        runSeries !== null &&
        Array.isArray(runSeries.trials) &&
        runSeries.trials.length === selectedDomain.trials.length &&
        runSeries.trials.every(isPlainRecord) &&
        selectedDomain.trials.every(isPlainRecord)
      ) {
        const repairedGroupTrials = runSeries.trials.map((trial, index) => {
          const canonicalTrial = selectedDomain.trials[index]!;
          if (trial.id !== canonicalTrial.id) return null;
          return {
            ...trial,
            correctedSignals: canonicalClone(canonicalTrial.correctedSignals),
          };
        });
        if (
          !repairedGroupTrials.some((trial) => trial === null) &&
          areCanonicalValuesEqual(repairedGroupTrials, selectedDomain.trials) &&
          !areCanonicalValuesEqual(runSeries.trials, selectedDomain.trials)
        ) {
          runSeries.trials = canonicalClone(selectedDomain.trials);
          repaired = true;
        }
      }
    }
    return { value: cloned, repaired, migrated };
  } catch {
    return { value, repaired: false, migrated: false };
  }
};

interface HeatCapacityExperimentGroupCacheRepair {
  value: unknown;
  repaired: boolean;
}

const repairHeatCapacityExperimentGroupCaches = (
  value: unknown,
  realDomain: unknown,
  idealDomain: unknown,
): HeatCapacityExperimentGroupCacheRepair => {
  if (!isPlainRecord(value)) return { value, repaired: false };
  try {
    const cloned = canonicalClone(value);
    if (
      !isPlainRecord(cloned) ||
      !Array.isArray(cloned.groups) ||
      typeof cloned.currentGroupId !== 'string'
    ) return { value: cloned, repaired: false };
    const currentGroup = cloned.groups.find((group) => (
      isPlainRecord(group) && group.id === cloned.currentGroupId
    ));
    if (!isPlainRecord(currentGroup) || !isPlainRecord(currentGroup.runSeries)) {
      return { value: cloned, repaired: false };
    }
    const domain = currentGroup.scheme === 'ideal' ? idealDomain : realDomain;
    if (!isPlainRecord(domain) || !Array.isArray(domain.trials)) {
      return { value: cloned, repaired: false };
    }
    const runSeries = currentGroup.runSeries;
    if (
      !Array.isArray(runSeries.trials) ||
      runSeries.trials.length !== domain.trials.length ||
      !runSeries.trials.every(isPlainRecord) ||
      !domain.trials.every(isPlainRecord)
    ) return { value: cloned, repaired: false };
    const repairedTrials = runSeries.trials.map((trial, index) => {
      const canonicalTrial = domain.trials[index]!;
      if (trial.id !== canonicalTrial.id) return null;
      return {
        ...trial,
        correctedSignals: canonicalClone(canonicalTrial.correctedSignals),
      };
    });
    if (
      repairedTrials.some((trial) => trial === null) ||
      !areCanonicalValuesEqual(repairedTrials, domain.trials) ||
      areCanonicalValuesEqual(runSeries.trials, domain.trials)
    ) return { value: cloned, repaired: false };
    runSeries.trials = canonicalClone(domain.trials);
    return { value: cloned, repaired: true };
  } catch {
    return { value, repaired: false };
  }
};

const isAllowedHeatCapacityModeSessionCacheRepair = (
  source: unknown,
  canonical: unknown,
) => {
  const repaired = repairHeatCapacityModeSessionCaches(source);
  return repaired.repaired &&
    areCanonicalValuesEqual(repaired.value, canonical);
};

const isAllowedHeatCapacityModeSessionMigration = (
  source: unknown,
  canonical: unknown,
) => {
  const normalized = repairHeatCapacityModeSessionCaches(source);
  return normalized.migrated &&
    areCanonicalValuesEqual(normalized.value, canonical);
};

const readFileMetadata = (
  projection: WorkbenchPersistenceV3FileProjection,
) => {
  const metadata = projection.fields.authoritative.metadata;
  if (
    !isPlainRecord(metadata) ||
    typeof metadata.name !== 'string' ||
    metadata.name.trim().length === 0 ||
    !isFiniteNonNegative(metadata.createdAt) ||
    !isFiniteNonNegative(metadata.updatedAt) ||
    !isFiniteNonNegative(metadata.lastOpenedAt)
  ) {
    return null;
  }
  return {
    name: metadata.name,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    lastOpenedAt: metadata.lastOpenedAt,
  };
};

const createMetadata = (file: WorkbenchFileState) => ({
  name: file.name,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
  lastOpenedAt: file.lastOpenedAt,
});

const createCommonRelation = (file: WorkbenchFileState) => ({
  fileId: file.id,
  fileKind: file.kind,
});

const normalizeVisiblePanels = (
  value: unknown,
  fallback: WorkbenchFileState['visiblePanels'],
) => [
  ...new Set(normalizeWorkbenchPanelKeys(value, fallback)),
];

const createCommonUiCheckpoint = (
  file: WorkbenchFileState,
  fallback: WorkbenchFileState,
) => ({
  visiblePanels: normalizeVisiblePanels(
    file.visiblePanels,
    fallback.visiblePanels,
  ),
  liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
    file.liveWorkspaceSplitRatio,
  ),
});

const canonicalizeHardSphereRuntime = <
  File extends WorkbenchStandardState | WorkbenchIdealState,
>(
  file: File,
): {
  file: File;
  repaired: boolean;
} | null => {
  if (
    !isSimulationParamsShape(file.params) ||
    !validateHardSphereSimulationParams(file.appliedParams).valid ||
    (
      !validateHardSphereSimulationParams(file.params).valid &&
      file.runState !== 'needs-reset'
    ) ||
    (
      file.finalChartData !== null &&
      !isCanonicalChartData(file.finalChartData)
    ) ||
    (
      file.kind === 'ideal' &&
      (
        !validateHardSphereSimulationParams(file.activeParams).valid ||
        !areWorkbenchParamsEqual(file.appliedParams, file.activeParams) ||
        (
          !validateHardSphereSimulationParams(file.params).valid &&
          !file.needsReset
        ) ||
        !isCanonicalPointsByRelation(file.pointsByRelation)
      )
    )
  ) {
    return null;
  }
  const normalizedSnapshot = normalizeHardSphereEngineSnapshot(
    file.hardSphereEngineSnapshot,
  );
  if (
    file.hardSphereEngineSnapshot !== null &&
    normalizedSnapshot === null
  ) {
    return null;
  }
  const runtimeParams = file.kind === 'ideal'
    ? file.activeParams
    : file.appliedParams;
  if (
    normalizedSnapshot !== null &&
    !areWorkbenchParamsEqual(normalizedSnapshot.params, runtimeParams)
  ) {
    return null;
  }

  let canonicalFile: File;
  if (normalizedSnapshot !== null) {
    try {
      const engine = PhysicsEngine.fromSnapshot(normalizedSnapshot);
      canonicalFile = projectHardSphereEngineOntoWorkspaceFile(
        {
          ...file,
          runState: file.runState === 'running' ? 'paused' : file.runState,
          hardSphereEngineSnapshot: normalizedSnapshot,
        },
        engine,
      ) as File;
    } catch {
      return null;
    }
  } else {
    canonicalFile = {
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      stats: createIdleStats(),
      chartData: createEmptyChartData(),
      particles: [],
      hardSphereEngineSnapshot: null,
      ...(file.kind === 'ideal'
        ? { latestPressureSummary: null }
        : {}),
    } as File;
  }

  const repaired = !areCanonicalValuesEqual(
    file.kind === 'ideal'
      ? {
          runState: file.runState === 'running' ? 'paused' : file.runState,
          stats: file.stats,
          chartData: file.chartData,
          particles: file.particles,
          hardSphereEngineSnapshot: file.hardSphereEngineSnapshot,
          latestPressureSummary: file.latestPressureSummary,
        }
      : {
          runState: file.runState === 'running' ? 'paused' : file.runState,
          stats: file.stats,
          chartData: file.chartData,
          particles: file.particles,
          hardSphereEngineSnapshot: file.hardSphereEngineSnapshot,
        },
    file.kind === 'ideal'
      ? {
          runState: canonicalFile.runState,
          stats: canonicalFile.stats,
          chartData: canonicalFile.chartData,
          particles: canonicalFile.particles,
          hardSphereEngineSnapshot: canonicalFile.hardSphereEngineSnapshot,
          latestPressureSummary:
            (canonicalFile as WorkbenchIdealState).latestPressureSummary,
        }
      : {
          runState: canonicalFile.runState,
          stats: canonicalFile.stats,
          chartData: canonicalFile.chartData,
          particles: canonicalFile.particles,
          hardSphereEngineSnapshot: canonicalFile.hardSphereEngineSnapshot,
        },
  );
  return { file: canonicalFile, repaired };
};

const projectStandardFile = (
  file: WorkbenchStandardState,
): {
  projection: WorkbenchPersistenceV3FileProjection;
  repaired: boolean;
} | null => {
  const canonical = canonicalizeHardSphereRuntime(file);
  if (canonical === null) return null;
  const fallback = createDefaultStandardFile(1);
  const uiCheckpoint = {
    ...createCommonUiCheckpoint(file, fallback),
    standardResultsLayout: normalizeStandardResultsLayout(
      canonical.file.standardResultsLayout,
    ),
  };
  return {
    projection: {
      projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
      fileId: file.id,
      fileKind: file.kind,
      aggregateKind: 'standard-document',
      fields: {
        authoritative: canonicalClone({
          metadata: createMetadata(file),
          params: canonical.file.params,
          appliedParams: canonical.file.appliedParams,
          finalChartData: canonical.file.finalChartData,
          runtimeCheckpoint: {
            runState: canonical.file.runState,
            engineSnapshot: canonical.file.hardSphereEngineSnapshot,
          },
        }),
        relation: canonicalClone(createCommonRelation(file)),
        derived: canonicalClone({
          stats: canonical.file.stats,
          chartData: canonical.file.chartData,
          particles: canonical.file.particles,
        }),
        quality: {},
        uiCheckpoint: canonicalClone(uiCheckpoint),
      },
    },
    repaired: canonical.repaired || !areCanonicalValuesEqual(
      {
        visiblePanels: file.visiblePanels,
        liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
        standardResultsLayout: file.standardResultsLayout,
      },
      uiCheckpoint,
    ),
  };
};

const projectIdealFile = (
  file: WorkbenchIdealState,
): {
  projection: WorkbenchPersistenceV3FileProjection;
  repaired: boolean;
} | null => {
  const canonical = canonicalizeHardSphereRuntime(file);
  if (canonical === null) return null;
  const fallback = createDefaultIdealFile(1);
  const uiCheckpoint = {
    ...createCommonUiCheckpoint(file, fallback),
    idealWindowLayout: normalizeIdealWindowLayoutState(
      canonical.file.idealWindowLayout,
    ),
  };
  const sourceQuality = {
    verificationState: canonical.file.verificationState,
    historyUnlocked: canonical.file.historyUnlocked,
  };
  const quality = normalizeIdealQuality(sourceQuality, fallback);
  return {
    projection: {
      projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
      fileId: file.id,
      fileKind: file.kind,
      aggregateKind: 'ideal-document',
      fields: {
        authoritative: canonicalClone({
          metadata: createMetadata(file),
          relation: canonical.file.relation,
          params: canonical.file.params,
          appliedParams: canonical.file.appliedParams,
          activeParams: canonical.file.activeParams,
          pointsByRelation: canonical.file.pointsByRelation,
          finalChartData: canonical.file.finalChartData,
           runtimeCheckpoint: {
             runState: canonical.file.runState,
             engineSnapshot: canonical.file.hardSphereEngineSnapshot,
             needsReset: canonical.file.needsReset,
           },
        }),
        relation: canonicalClone(createCommonRelation(file)),
        derived: canonicalClone({
          stats: canonical.file.stats,
          chartData: canonical.file.chartData,
           particles: canonical.file.particles,
           latestPressureSummary: canonical.file.latestPressureSummary,
         }),
        quality: canonicalClone(quality),
        uiCheckpoint: canonicalClone(uiCheckpoint),
      },
    },
    repaired: canonical.repaired || !areCanonicalValuesEqual(
      {
        visiblePanels: file.visiblePanels,
        liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
        idealWindowLayout: file.idealWindowLayout,
      },
      uiCheckpoint,
    ) || !areCanonicalValuesEqual(sourceQuality, quality),
  };
};

const HEAT_CAPACITY_RELATION_KEYS = new Set([
  'heatCapacityMode',
  'heatCapacityModeSessions',
  'heatCapacityFreeParameterScheme',
  'heatCapacityFreeDisplayScheme',
]);

const HEAT_CAPACITY_QUALITY_KEYS = new Set([
  'heatCapacityTeachingStatus',
  'heatCapacityFreePreheatCompleted',
]);

const HEAT_CAPACITY_UI_KEYS = new Set([
  'visiblePanels',
  'liveWorkspaceSplitRatio',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'heatCapacityMaterialsExpanded',
  'heatCapacityTabContainerHeight',
  'heatCapacityFreeEquilibriumSpeedMultiplier',
  'heatCapacityFreeFileAcknowledgements',
  'heatCapacityLessonIntroAutoShown',
  'hardSphereViewEnabled',
]);

const HEAT_CAPACITY_GUIDE_KEYS = new Set([
  'heatCapacityGuidePhysicsConfig',
  'heatCapacityGuidePhysicsState',
  'heatCapacityGuideTemperatureSensorState',
  'heatCapacityGuideWorkflow',
  'heatCapacityGuideTrial',
  'heatCapacityGuideCalculationSession',
]);

const HEAT_CAPACITY_DERIVED_KEYS = new Set([
  'stats',
  'chartData',
  'particles',
]);

const HEAT_CAPACITY_ACTIVE_FREE_PROJECTION_KEYS = new Set([
  'heatCapacityFreeBatch',
  'heatCapacityFreeExperimentGroupStatus',
  'heatCapacityFreeGasType',
  'heatCapacityFreeParameterDraft',
  'heatCapacityFreeActiveRunConfigSnapshot',
  'heatCapacityFreeRecordConfig',
  'heatCapacityFreePressureWarningMv',
  'heatCapacityFreeInstrumentNoiseEnabled',
  'heatCapacityFreeEnvironmentConfig',
  'heatCapacityFreePhysicsConfig',
  'heatCapacityFreePhysicsState',
  'heatCapacityFreeSensorConfig',
  'heatCapacityFreeSensorState',
  'heatCapacityFreeCalibrationState',
  'heatCapacityFreeRollbackSnapshots',
  'heatCapacityFreeTraceStore',
  'heatCapacityFreeTrials',
  'heatCapacityFreeActiveAttempt',
]);

const HEAT_CAPACITY_HEADER_AND_DOMAIN_KEYS = new Set([
  'id',
  'kind',
  'name',
  'createdAt',
  'updatedAt',
  'lastOpenedAt',
  'heatCapacityFreeRealDomain',
  'heatCapacityFreeIdealDomain',
  'heatCapacityFreeExperimentGroups',
]);

const isHeatCapacityActiveRuntimeKey = (
  key: string,
  mode: WorkbenchHeatCapacityState['heatCapacityMode'],
) => (
  !HEAT_CAPACITY_HEADER_AND_DOMAIN_KEYS.has(key) &&
  !HEAT_CAPACITY_RELATION_KEYS.has(key) &&
  !HEAT_CAPACITY_QUALITY_KEYS.has(key) &&
  !HEAT_CAPACITY_UI_KEYS.has(key) &&
  !HEAT_CAPACITY_ACTIVE_FREE_PROJECTION_KEYS.has(key) &&
  !HEAT_CAPACITY_GUIDE_KEYS.has(key) &&
  !HEAT_CAPACITY_DERIVED_KEYS.has(key) &&
  !(mode === 'free' && (
    key === 'heatCapacityReleaseState' ||
    key === 'theoreticalGamma'
  ))
);

const pickRecordKeys = (
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
) => Object.fromEntries(
  Object.entries(value).filter(([key]) => keys.has(key)),
);

const normalizeHeatCapacityUiCheckpoint = (
  value: Record<string, unknown>,
  fallback: WorkbenchHeatCapacityState,
) => {
  const openTabs = Array.isArray(value.openHeatCapacityTabs)
    ? [...new Set(value.openHeatCapacityTabs.filter((tab) => (
        tab === 'guide' || tab === 'records' || tab === 'review'
      )))]
    : [...fallback.openHeatCapacityTabs];
  const activeHeatCapacityTabId = (
    value.activeHeatCapacityTabId === null ||
    (
      (
        value.activeHeatCapacityTabId === 'guide' ||
        value.activeHeatCapacityTabId === 'records' ||
        value.activeHeatCapacityTabId === 'review'
      ) &&
      openTabs.includes(value.activeHeatCapacityTabId)
    )
  )
    ? value.activeHeatCapacityTabId
    : openTabs[0] ?? null;
  const tabHeight = isFiniteNumber(value.heatCapacityTabContainerHeight)
    ? Math.min(1, Math.max(0.25, value.heatCapacityTabContainerHeight))
    : fallback.heatCapacityTabContainerHeight;
  return {
    visiblePanels: normalizeVisiblePanels(
      value.visiblePanels,
      fallback.visiblePanels,
    ),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
      value.liveWorkspaceSplitRatio,
    ),
    openHeatCapacityTabs: openTabs,
    activeHeatCapacityTabId,
    heatCapacityMaterialsExpanded:
      typeof value.heatCapacityMaterialsExpanded === 'boolean'
        ? value.heatCapacityMaterialsExpanded
        : fallback.heatCapacityMaterialsExpanded,
    heatCapacityTabContainerHeight: tabHeight,
    heatCapacityFreeEquilibriumSpeedMultiplier:
      normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(
        value.heatCapacityFreeEquilibriumSpeedMultiplier,
      ),
    heatCapacityFreeFileAcknowledgements:
      normalizeHeatCapacityFreeFileAcknowledgements(
        value.heatCapacityFreeFileAcknowledgements,
      ),
    heatCapacityLessonIntroAutoShown:
      typeof value.heatCapacityLessonIntroAutoShown === 'boolean'
        ? value.heatCapacityLessonIntroAutoShown
        : fallback.heatCapacityLessonIntroAutoShown,
    hardSphereViewEnabled:
      typeof value.hardSphereViewEnabled === 'boolean'
        ? value.hardSphereViewEnabled
        : fallback.hardSphereViewEnabled,
  };
};

const normalizeIdealQuality = (
  value: Record<string, unknown>,
  fallback: WorkbenchIdealState,
) => ({
  verificationState:
    value.verificationState === 'not-started' ||
    value.verificationState === 'collecting' ||
    value.verificationState === 'verified' ||
    value.verificationState === 'failed'
      ? value.verificationState
      : fallback.verificationState,
  historyUnlocked: typeof value.historyUnlocked === 'boolean'
    ? value.historyUnlocked
    : fallback.historyUnlocked,
});

const normalizeHeatCapacityQuality = (
  value: Record<string, unknown>,
  fallback: WorkbenchHeatCapacityState,
) => ({
  heatCapacityTeachingStatus:
    value.heatCapacityTeachingStatus === 'idle' ||
    value.heatCapacityTeachingStatus === 'running' ||
    value.heatCapacityTeachingStatus === 'completed'
      ? value.heatCapacityTeachingStatus
      : fallback.heatCapacityTeachingStatus,
  heatCapacityFreePreheatCompleted:
    typeof value.heatCapacityFreePreheatCompleted === 'boolean'
      ? value.heatCapacityFreePreheatCompleted
      : fallback.heatCapacityFreePreheatCompleted,
});

const projectHeatCapacityFile = (
  file: WorkbenchHeatCapacityState,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileProjection> => {
  const runtimeVersionCandidates = [
    [
      file.heatCapacityFreeRuntimeVersion,
      HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      'heatCapacityFreeRuntimeVersion',
      'persistence-v3-heat-runtime-version',
    ],
    [
      file.heatCapacityFreeTraceVersion,
      HEAT_CAPACITY_FREE_TRACE_VERSION,
      'heatCapacityFreeTraceVersion',
      'persistence-v3-heat-trace-version',
    ],
  ] as const;
  for (
    const [version, supportedVersion, fieldPath, code]
    of runtimeVersionCandidates
  ) {
    if (
      typeof version === 'number' &&
      Number.isInteger(version) &&
      version > supportedVersion
    ) {
      return projectionFailure('unsupported-future', file, {
        fileId: file.id,
        fileKind: file.kind,
        phase: 'capture',
        category: 'unsupported-future',
        code: `${code}-future`,
        message: 'The Free runtime projection requires a newer application.',
        fieldPath,
        sourceVersion: version,
        supportedVersion,
      });
    }
  }
  const futureScanFallback = createDefaultHeatCapacityFile(1);
  const domainFuture = findFirstFutureHeatCapacityDomainVersion([
    {
      value: file.heatCapacityFreeRealDomain,
      scheme: 'real',
      fieldPath: 'heatCapacityFreeRealDomain',
      fallback: futureScanFallback.heatCapacityFreeRealDomain,
    },
    {
      value: file.heatCapacityFreeIdealDomain,
      scheme: 'ideal',
      fieldPath: 'heatCapacityFreeIdealDomain',
      fallback: futureScanFallback.heatCapacityFreeIdealDomain,
    },
  ]);
  if (domainFuture !== null) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-domain-nested-future',
      message: domainFuture.message,
      fieldPath: domainFuture.fieldPath,
      sourceVersion: domainFuture.sourceVersion,
      supportedVersion: domainFuture.supportedVersion,
    });
  }
  const activeDomain = file.heatCapacityFreeParameterScheme === 'ideal'
    ? file.heatCapacityFreeIdealDomain
    : file.heatCapacityFreeRealDomain;
  const batchCandidates: ReadonlyArray<readonly [
    unknown,
    string,
  ]> = [
    [file.heatCapacityFreeBatch, 'heatCapacityFreeBatch'],
  ];
  for (const [batch, fieldPath] of batchCandidates) {
    if (
      isPlainRecord(batch) &&
      typeof batch.version === 'number' &&
      Number.isInteger(batch.version) &&
      batch.version > HEAT_CAPACITY_FREE_BATCH_VERSION
    ) {
      return projectionFailure('unsupported-future', file, {
        fileId: file.id,
        fileKind: file.kind,
        phase: 'capture',
        category: 'unsupported-future',
        code: 'persistence-v3-heat-active-batch-future',
        message:
          'The active Free batch requires a newer application.',
        fieldPath,
        sourceVersion: batch.version,
        supportedVersion: HEAT_CAPACITY_FREE_BATCH_VERSION,
      });
    }
  }
  const modeSessionStoreFuture = findFutureNumericRecordVersion(
    file.heatCapacityModeSessions,
    'schemaVersion',
    HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
    'heatCapacityModeSessions',
    'Heat-capacity mode-session state',
  );
  if (modeSessionStoreFuture !== null) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-mode-session-future',
      message: modeSessionStoreFuture.message,
      fieldPath: modeSessionStoreFuture.fieldPath,
      sourceVersion: modeSessionStoreFuture.sourceVersion,
      supportedVersion: modeSessionStoreFuture.supportedVersion,
    });
  }
  const nestedModeSessionFuture = findFutureHeatCapacityModeSessionVersion(
    file.heatCapacityModeSessions,
    'heatCapacityModeSessions',
  );
  if (nestedModeSessionFuture !== null) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-mode-session-nested-future',
      message: nestedModeSessionFuture.message,
      fieldPath: nestedModeSessionFuture.fieldPath,
      sourceVersion: nestedModeSessionFuture.sourceVersion,
      supportedVersion: nestedModeSessionFuture.supportedVersion,
    });
  }
  const runtimeAggregate = {
    ...activeDomain,
    batch: file.heatCapacityFreeBatch,
    activeRunConfigSnapshot: file.heatCapacityFreeActiveRunConfigSnapshot,
    trials: file.heatCapacityFreeTrials,
    traceStore: file.heatCapacityFreeTraceStore,
    activeAttempt: file.heatCapacityFreeActiveAttempt,
  };
  const runtimeFuture = findFutureHeatCapacityDomainVersion(
    runtimeAggregate,
    file.heatCapacityFreeParameterScheme,
    'heatCapacityFreeRuntime',
    file.heatCapacityFreeParameterScheme === 'ideal'
      ? futureScanFallback.heatCapacityFreeIdealDomain
      : futureScanFallback.heatCapacityFreeRealDomain,
  );
  if (runtimeFuture !== null) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-runtime-nested-future',
      message: runtimeFuture.message,
      fieldPath: mapHeatCapacityRuntimeAggregateFieldPath(
        runtimeFuture.fieldPath,
        'heatCapacityFreeRuntime',
      ).replace(
        'heatCapacityFreeRuntime.',
        '',
      ),
      sourceVersion: runtimeFuture.sourceVersion,
      supportedVersion: runtimeFuture.supportedVersion,
    });
  }
  for (
    const [version, supportedVersion, fieldPath, code]
    of runtimeVersionCandidates
  ) {
    if (version !== supportedVersion) {
      return projectionFailure('quarantined', file, {
        fileId: file.id,
        fileKind: file.kind,
        phase: 'capture',
        category: 'schema-version',
        code: `${code}-invalid`,
        message: 'The Free runtime projection version is unsupported.',
        fieldPath,
        sourceVersion: typeof version === 'number' ? version : undefined,
        supportedVersion,
      });
    }
  }
  const captured = prepareHeatCapacityFreeCapture(
    file,
    file.heatCapacityMode === 'free',
  );
  if (captured.ok === false) {
    return projectionFailure(captured.status, file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: captured.status === 'unsupported-future'
        ? 'unsupported-future'
        : 'authoritative-data',
      code: 'persistence-v3-heat-capture-domain-invalid',
      message: captured.reason,
      fieldPath: captured.fieldPath,
      sourceVersion: typeof captured.sourceVersion === 'number'
        ? captured.sourceVersion
        : undefined,
    });
  }
  const captureSource = captured.file;
  if (
    !isPlainRecord(captureSource.heatCapacityModeSessions) ||
    typeof captureSource.heatCapacityModeSessions.schemaVersion !== 'number'
  ) {
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'schema-shape',
      code: 'persistence-v3-heat-mode-session-invalid',
      message: 'Heat-capacity mode-session state is invalid.',
      fieldPath: 'heatCapacityModeSessions',
    });
  }
  if (
    captureSource.heatCapacityModeSessions.schemaVersion >
    HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION
  ) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-mode-session-future',
      message: 'Heat-capacity mode-session state requires a newer application.',
      fieldPath: 'heatCapacityModeSessions.schemaVersion',
    });
  }
  const modeSessionFuture = findFutureHeatCapacityModeSessionVersion(
    captureSource.heatCapacityModeSessions,
    'heatCapacityModeSessions',
  );
  if (modeSessionFuture !== null) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-mode-session-nested-future',
      message: modeSessionFuture.message,
      fieldPath: modeSessionFuture.fieldPath,
      sourceVersion: modeSessionFuture.sourceVersion,
      supportedVersion: modeSessionFuture.supportedVersion,
    });
  }
  const modeSessionCacheRepair = repairHeatCapacityModeSessionCaches(
    captureSource.heatCapacityModeSessions,
  );
  const normalizedModeSessions = normalizeHeatCapacityModeSessionStore(
    modeSessionCacheRepair.value,
    captureSource.id,
  );
  if (
    !areCanonicalValuesEqual(
      normalizedModeSessions,
      modeSessionCacheRepair.value,
    )
  ) {
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'relationship',
      code: 'persistence-v3-heat-mode-session-not-canonical',
      message:
        'Heat-capacity mode-session authority is not canonical for this file.',
      fieldPath: 'heatCapacityModeSessions',
    });
  }
  const real = decodeHeatCapacityFreeExperimentDomainAggregate(
    captureSource.heatCapacityFreeRealDomain,
    'real',
    captureSource.heatCapacityFreeGasType,
    createDefaultHeatCapacityFile(1).heatCapacityFreeRealDomain,
  );
  if (real.ok === false) {
    return projectionFailure(real.status, file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: real.status === 'unsupported-future'
        ? 'unsupported-future'
        : 'relationship',
      code: 'persistence-v3-heat-real-domain-invalid',
      message: real.reason,
      fieldPath: real.fieldPath
        ? `heatCapacityFreeRealDomain.${real.fieldPath}`
        : 'heatCapacityFreeRealDomain',
      sourceVersion: typeof real.sourceVersion === 'number'
        ? real.sourceVersion
        : undefined,
    });
  }
  const ideal = decodeHeatCapacityFreeExperimentDomainAggregate(
    captureSource.heatCapacityFreeIdealDomain,
    'ideal',
    'air',
    createDefaultHeatCapacityFile(1).heatCapacityFreeIdealDomain,
  );
  if (ideal.ok === false) {
    return projectionFailure(ideal.status, file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: ideal.status === 'unsupported-future'
        ? 'unsupported-future'
        : 'relationship',
      code: 'persistence-v3-heat-ideal-domain-invalid',
      message: ideal.reason,
      fieldPath: ideal.fieldPath
        ? `heatCapacityFreeIdealDomain.${ideal.fieldPath}`
        : 'heatCapacityFreeIdealDomain',
      sourceVersion: typeof ideal.sourceVersion === 'number'
        ? ideal.sourceVersion
        : undefined,
    });
  }
  if (
    (
      real.status === 'migrated' &&
      !isAllowedHeatCapacityFreeDomainAggregateMigration(
        captureSource.heatCapacityFreeRealDomain,
        real.value,
      )
    ) ||
    (
      real.status === 'exact' &&
      !areCanonicalValuesEqual(
        captureSource.heatCapacityFreeRealDomain,
        real.value,
      )
    ) ||
    (
      real.status === 'repaired-cache' &&
      !isAllowedHeatCapacityFreeDomainAggregateCacheRepair(
        captureSource.heatCapacityFreeRealDomain,
        real.value,
      )
    )
  ) {
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'authoritative-data',
      code: 'persistence-v3-heat-real-domain-authority-changed',
      message:
        'The real Free domain requires changes outside the supported aggregate migration.',
      fieldPath: 'heatCapacityFreeRealDomain',
    });
  }
  if (
    (
      ideal.status === 'migrated' &&
      !isAllowedHeatCapacityFreeDomainAggregateMigration(
        captureSource.heatCapacityFreeIdealDomain,
        ideal.value,
      )
    ) ||
    (
      ideal.status === 'exact' &&
      !areCanonicalValuesEqual(
        captureSource.heatCapacityFreeIdealDomain,
        ideal.value,
      )
    ) ||
    (
      ideal.status === 'repaired-cache' &&
      !isAllowedHeatCapacityFreeDomainAggregateCacheRepair(
        captureSource.heatCapacityFreeIdealDomain,
        ideal.value,
      )
    )
  ) {
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'authoritative-data',
      code: 'persistence-v3-heat-ideal-domain-authority-changed',
      message:
        'The ideal Free domain requires changes outside the supported aggregate migration.',
      fieldPath: 'heatCapacityFreeIdealDomain',
    });
  }
  const experimentGroupCacheRepair = repairHeatCapacityExperimentGroupCaches(
    captureSource.heatCapacityFreeExperimentGroups,
    real.value,
    ideal.value,
  );
  const experimentGroups =
    normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(
      experimentGroupCacheRepair.value,
    );
  if (
    experimentGroups === null ||
    !areCanonicalValuesEqual(
      experimentGroupCacheRepair.value,
      experimentGroups,
    )
  ) {
    const invariantDetails = getHeatCapacityFreeExperimentGroupInvariantErrors(
      captureSource.heatCapacityFreeExperimentGroups,
    );
    const nestedDetails = diagnoseHeatCapacityFreeExperimentGroupCollectionForPersistence(
      captureSource.heatCapacityFreeExperimentGroups,
    );
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'relationship',
      code: 'persistence-v3-heat-experiment-groups-invalid',
      message: invariantDetails.length === 0
        ? `The heat-capacity experiment-group collection has invalid nested data: ${nestedDetails.join(', ')}.`
        : `The heat-capacity experiment-group collection is invalid: ${invariantDetails.join(' ')}`,
      fieldPath: 'heatCapacityFreeExperimentGroups',
    });
  }

  const activeRuntime: Record<string, unknown> = {};
  const guide: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(captureSource)) {
    if (
      HEAT_CAPACITY_HEADER_AND_DOMAIN_KEYS.has(key) ||
      HEAT_CAPACITY_RELATION_KEYS.has(key) ||
      HEAT_CAPACITY_QUALITY_KEYS.has(key) ||
      HEAT_CAPACITY_UI_KEYS.has(key) ||
      HEAT_CAPACITY_ACTIVE_FREE_PROJECTION_KEYS.has(key)
    ) {
      continue;
    }
    if (HEAT_CAPACITY_GUIDE_KEYS.has(key)) {
      guide[key] = entry;
    } else if (
      isHeatCapacityActiveRuntimeKey(key, captureSource.heatCapacityMode)
    ) {
      activeRuntime[key] = entry;
    }
  }

  const migrated = captured.status === 'migrated' ||
    modeSessionCacheRepair.migrated ||
    real.status === 'migrated' ||
    ideal.status === 'migrated';
  const fallback = createDefaultHeatCapacityFile(1);
  const sourceUi = Object.fromEntries(
    Object.entries(captureSource).filter(([key]) => (
      HEAT_CAPACITY_UI_KEYS.has(key)
    )),
  );
  const uiCheckpoint = normalizeHeatCapacityUiCheckpoint(
    sourceUi,
    fallback,
  );
  const sourceQuality = {
    heatCapacityTeachingStatus:
      captureSource.heatCapacityTeachingStatus,
    heatCapacityFreePreheatCompleted:
      captureSource.heatCapacityFreePreheatCompleted,
  };
  const quality = normalizeHeatCapacityQuality(sourceQuality, fallback);
  const captureRepaired = captured.status === 'repaired-cache';
  const repaired =
    captureRepaired ||
    modeSessionCacheRepair.repaired ||
    real.status === 'repaired-cache' ||
    ideal.status === 'repaired-cache' ||
    experimentGroupCacheRepair.repaired ||
    !areCanonicalValuesEqual(
      {
        stats: captureSource.stats,
        chartData: captureSource.chartData,
        particles: captureSource.particles,
      },
      {
        stats: createIdleStats(),
        chartData: createEmptyChartData(),
        particles: [],
      },
    ) ||
    !areCanonicalValuesEqual(sourceUi, uiCheckpoint) ||
    !areCanonicalValuesEqual(sourceQuality, quality);
  const projection: WorkbenchPersistenceV3FileProjection = {
    projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
    fileId: file.id,
    fileKind: file.kind,
    aggregateKind: 'heat-capacity-document',
    fields: {
      authoritative: canonicalClone({
        metadata: createMetadata(captureSource),
        activeRuntime,
        freeDomains: {
          real: real.value,
          ideal: ideal.value,
          experimentGroups,
        },
        guide,
        modeSessions: normalizedModeSessions,
      }),
      relation: canonicalClone({
        ...createCommonRelation(captureSource),
        heatCapacityMode: captureSource.heatCapacityMode,
        heatCapacityFreeParameterScheme:
          captureSource.heatCapacityFreeParameterScheme,
        heatCapacityFreeDisplayScheme:
          captureSource.heatCapacityFreeDisplayScheme,
      }),
      derived: canonicalClone({
        stats: createIdleStats(),
        chartData: createEmptyChartData(),
        particles: [],
      }),
      quality: canonicalClone(quality),
      uiCheckpoint: canonicalClone(uiCheckpoint),
    },
  };
  return createWorkbenchPersistenceV3Success(
    migrated ? 'migrated' : repaired ? 'repaired-cache' : 'exact',
    projection,
    repaired
       ? [createFileDiagnostic({
           fileId: file.id,
           fileKind: file.kind,
           phase: 'capture',
           category: 'derived-cache',
           code: 'persistence-v3-heat-domain-cache-reprojected',
           message: captureRepaired
              ? 'Heat-capacity active runtime projection was rebuilt from durable domain authority.'
              : modeSessionCacheRepair.repaired
                ? 'Suspended Free corrected-signal caches were rebuilt from recorded voltages.'
              : real.status === 'repaired-cache' ||
                  ideal.status === 'repaired-cache'
                ? 'Heat-capacity corrected-signal cache was rebuilt from recorded voltages.'
                : experimentGroupCacheRepair.repaired
                  ? 'Heat-capacity experiment-group corrected-signal cache was rebuilt from recorded voltages.'
                : 'Heat-capacity derived domain cache was reprojected.',
            fieldPath: captureRepaired
              ? 'activeRuntime'
              : modeSessionCacheRepair.repaired
                ? 'heatCapacityModeSessions.free.snapshot.free.heatCapacityFreeTrials.correctedSignals'
              : real.status === 'repaired-cache' ||
                  ideal.status === 'repaired-cache'
                ? 'heatCapacityFreeDomains.trials.correctedSignals'
                : experimentGroupCacheRepair.repaired
                  ? 'heatCapacityFreeExperimentGroups.groups.runSeries.trials.correctedSignals'
                : 'heatCapacityFreeRealDomain.batch.calculationSession',
         })]
      : [],
  );
};

const projectPistonOscillationFile = (
  file: Extract<
    WorkbenchFileState,
    { kind: 'heatCapacityPistonOscillation' }
  >,
): WorkbenchPersistenceV3DecodeResult<{
  projection: WorkbenchPersistenceV3FileProjection;
  repaired: boolean;
  guideCacheRepaired: boolean;
}> => {
  if (
    file.pistonOscillationSchemaVersion >
    WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION
  ) {
    return projectionFailure('unsupported-future', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'unsupported-future',
      code: 'persistence-v3-piston-runtime-version-future',
      message: 'The piston-oscillation runtime requires a newer application.',
      fieldPath: 'pistonOscillationSchemaVersion',
    });
  }
  if (
    file.pistonOscillationSchemaVersion !==
    WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION
  ) {
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'schema-version',
      code: 'persistence-v3-piston-runtime-version-invalid',
      message: 'The piston-oscillation runtime version is invalid.',
      fieldPath: 'pistonOscillationSchemaVersion',
    });
  }
  const fallback = createDefaultHeatCapacityPistonOscillationFile(1);
  const previewCameraPreset =
    WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS.includes(
      file.previewCameraPreset,
    )
      ? file.previewCameraPreset
      : fallback.previewCameraPreset;
  const uiCheckpoint = {
    ...createCommonUiCheckpoint(file, fallback),
    previewCameraPreset,
    pistonOscillationOperationVisualizationEnabled:
      file.pistonOscillationOperationVisualizationEnabled === true,
    pistonOscillationMaterialsExpanded:
      file.pistonOscillationMaterialsExpanded !== false,
  };
  const demoSession = normalizePistonOscillationDemoSession(
    file.pistonOscillationDemoSession,
  );
  const guideSession = normalizePistonOscillationGuideSession(
    file.pistonOscillationGuideSession,
  );
  const freeSession = normalizePistonOscillationFreeSession(
    file.pistonOscillationFreeSession,
  );
  const guideCacheRepaired = !areCanonicalValuesEqual(
    guideSession,
    file.pistonOscillationGuideSession,
  );
  const freeSessionRepaired = !areCanonicalValuesEqual(
    freeSession,
    file.pistonOscillationFreeSession,
  );
  const uiCheckpointRepaired = !areCanonicalValuesEqual(
    {
      visiblePanels: file.visiblePanels,
      liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
      previewCameraPreset: file.previewCameraPreset,
      pistonOscillationOperationVisualizationEnabled:
        file.pistonOscillationOperationVisualizationEnabled,
      pistonOscillationMaterialsExpanded:
        file.pistonOscillationMaterialsExpanded,
    },
    uiCheckpoint,
  );
  return createWorkbenchPersistenceV3Success('exact', {
    projection: {
      projectionVersion: WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION,
      fileId: file.id,
      fileKind: file.kind,
      aggregateKind: 'piston-oscillation-document',
      fields: {
        authoritative: canonicalClone({
          metadata: createMetadata(file),
          pistonOscillationSchemaVersion:
            file.pistonOscillationSchemaVersion,
          lessonIntroAutoShown: file.pistonOscillationLessonIntroAutoShown,
          demoSession,
          pistonGuideSessionProjectionVersion:
            PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION,
          guideSession: createPistonOscillationGuideSessionAuthority(
            guideSession,
          ),
          freeSession,
        }),
        relation: canonicalClone(createCommonRelation(file)),
        derived: canonicalClone({
          pistonGuideDataProcessingCache:
            createPistonOscillationGuideDerivedCache(guideSession),
        }),
        quality: {},
        uiCheckpoint: canonicalClone(uiCheckpoint),
      },
    },
    repaired: guideCacheRepaired || freeSessionRepaired || uiCheckpointRepaired,
    guideCacheRepaired,
  });
};

export const projectWorkbenchPersistenceV3File = (
  file: WorkbenchFileState,
  index = 1,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3FileProjection> => {
  void index;
  if (
    typeof file.id !== 'string' ||
    file.id.trim().length === 0 ||
    typeof file.name !== 'string' ||
    file.name.trim().length === 0 ||
    !isFiniteNonNegative(file.createdAt) ||
    !isFiniteNonNegative(file.updatedAt) ||
    !isFiniteNonNegative(file.lastOpenedAt)
  ) {
    return projectionFailure('quarantined', file, {
      fileId: typeof file.id === 'string' ? file.id : 'unknown',
      fileKind: file.kind,
      phase: 'capture',
      category: 'identity',
      code: 'persistence-v3-runtime-file-header-invalid',
      message: 'Runtime file identity or authoritative metadata is invalid.',
      fieldPath: 'id',
    });
  }
  try {
    switch (file.kind) {
      case 'standard': {
        const result = projectStandardFile(file);
        if (result === null) {
          return projectionFailure('quarantined', file, {
            fileId: file.id,
            fileKind: file.kind,
            phase: 'capture',
            category: 'authoritative-data',
            code: 'persistence-v3-standard-authority-invalid',
            message: 'Standard simulation authoritative state is invalid.',
          });
        }
        return createWorkbenchPersistenceV3Success(
          result.repaired ? 'repaired-cache' : 'exact',
          result.projection,
          result.repaired
            ? [createFileDiagnostic({
                fileId: file.id,
                fileKind: file.kind,
                phase: 'capture',
                category: 'derived-cache',
                code: 'persistence-v3-standard-cache-reprojected',
                message: 'Standard simulation cache was reprojected.',
              })]
            : [],
        );
      }
      case 'ideal': {
        const result = projectIdealFile(file);
        if (result === null) {
          return projectionFailure('quarantined', file, {
            fileId: file.id,
            fileKind: file.kind,
            phase: 'capture',
            category: 'authoritative-data',
            code: 'persistence-v3-ideal-authority-invalid',
            message: 'Ideal-gas authoritative state is invalid.',
          });
        }
        return createWorkbenchPersistenceV3Success(
          result.repaired ? 'repaired-cache' : 'exact',
          result.projection,
          result.repaired
            ? [createFileDiagnostic({
                fileId: file.id,
                fileKind: file.kind,
                phase: 'capture',
                category: 'derived-cache',
                code: 'persistence-v3-ideal-cache-reprojected',
                message: 'Ideal-gas cache was reprojected.',
              })]
            : [],
        );
      }
      case 'heatCapacity':
        return projectHeatCapacityFile(file);
      case 'heatCapacityPistonOscillation': {
        const result = projectPistonOscillationFile(file);
        if (result.ok === false) return result;
        return createWorkbenchPersistenceV3Success(
          result.value.repaired ? 'repaired-cache' : 'exact',
          result.value.projection,
          result.value.repaired
            ? [createFileDiagnostic({
                fileId: file.id,
                fileKind: file.kind,
                phase: 'capture',
                category: 'derived-cache',
                code: result.value.guideCacheRepaired
                  ? 'persistence-v3-piston-guide-cache-reprojected'
                  : 'persistence-v3-piston-ui-checkpoint-repaired',
                message: result.value.guideCacheRepaired
                  ? 'Piston-oscillation derived processing values were rebuilt from recorded observations and endpoint sample indices.'
                  : 'Piston-oscillation UI checkpoint was repaired.',
                fieldPath: result.value.guideCacheRepaired
                  ? 'fields.authoritative.guideSession.dataProcessing'
                  : 'fields.uiCheckpoint',
              })]
            : [],
        );
      }
      default:
        return assertNeverWorkbenchFileKind(file);
    }
  } catch (error) {
    return projectionFailure('quarantined', file, {
      fileId: file.id,
      fileKind: file.kind,
      phase: 'capture',
      category: 'schema-shape',
      code: 'persistence-v3-file-not-canonical-json',
      message: error instanceof Error
        ? error.message
        : 'Runtime file cannot be represented as canonical JSON.',
    });
  }
};

const validateProjectionIdentity = (
  projection: WorkbenchPersistenceV3FileProjection,
) => (
  projection.projectionVersion ===
    WORKBENCH_PERSISTENCE_V3_FILE_PROJECTION_VERSION &&
  typeof projection.fileId === 'string' &&
  projection.fileId.trim().length > 0 &&
  projection.fields.relation.fileId === projection.fileId &&
  projection.fields.relation.fileKind === projection.fileKind &&
  projection.aggregateKind ===
    getWorkbenchPersistenceV3AggregateKindForFileKind(projection.fileKind)
);

const readRuntimeCheckpoint = (
  projection: WorkbenchPersistenceV3FileProjection,
) => {
  const checkpoint = projection.fields.authoritative.runtimeCheckpoint;
  return isPlainRecord(checkpoint) ? checkpoint : null;
};

const reprojectStandardFile = (
  projection: WorkbenchPersistenceV3FileProjection,
  index: number,
): WorkbenchStandardState | null => {
  const metadata = readFileMetadata(projection);
  const authority = projection.fields.authoritative;
  const checkpoint = readRuntimeCheckpoint(projection);
  const ui = projection.fields.uiCheckpoint;
  if (
    metadata === null ||
    !isSimulationParamsShape(authority.params) ||
    !isPlainRecord(authority.appliedParams) ||
    checkpoint === null ||
    !(
      checkpoint.runState === 'idle' ||
      checkpoint.runState === 'paused' ||
      checkpoint.runState === 'finished' ||
      checkpoint.runState === 'needs-reset' ||
      checkpoint.runState === 'running'
    )
  ) return null;
  const fallback = createDefaultStandardFile(index);
  const base: WorkbenchStandardState = {
    ...fallback,
    id: projection.fileId,
    ...metadata,
    params: canonicalClone(authority.params) as unknown as
      WorkbenchStandardState['params'],
    appliedParams:
      canonicalClone(authority.appliedParams) as unknown as
        WorkbenchStandardState['appliedParams'],
    finalChartData: authority.finalChartData === null
      ? null
      : canonicalClone(authority.finalChartData) as WorkbenchStandardState['finalChartData'],
    runState: checkpoint.runState === 'running'
      ? 'paused'
      : checkpoint.runState,
    hardSphereEngineSnapshot:
      canonicalClone(checkpoint.engineSnapshot) as
        WorkbenchStandardState['hardSphereEngineSnapshot'],
    visiblePanels: normalizeVisiblePanels(
      ui.visiblePanels,
      fallback.visiblePanels,
    ),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
      ui.liveWorkspaceSplitRatio,
    ),
    standardResultsLayout: normalizeStandardResultsLayout(
      ui.standardResultsLayout,
    ),
  };
  const canonical = canonicalizeHardSphereRuntime(base);
  return canonical?.file ?? null;
};

const reprojectIdealFile = (
  projection: WorkbenchPersistenceV3FileProjection,
  index: number,
): WorkbenchIdealState | null => {
  const metadata = readFileMetadata(projection);
  const authority = projection.fields.authoritative;
  const checkpoint = readRuntimeCheckpoint(projection);
  const quality = projection.fields.quality;
  const ui = projection.fields.uiCheckpoint;
  if (
    metadata === null ||
    !isSimulationParamsShape(authority.params) ||
    !isPlainRecord(authority.appliedParams) ||
    !isPlainRecord(authority.activeParams) ||
    !isPlainRecord(authority.pointsByRelation) ||
    checkpoint === null ||
    !(
      authority.relation === 'pt' ||
      authority.relation === 'pv' ||
      authority.relation === 'pn'
    ) ||
    typeof checkpoint.needsReset !== 'boolean' ||
    !(
      checkpoint.runState === 'idle' ||
      checkpoint.runState === 'paused' ||
      checkpoint.runState === 'finished' ||
      checkpoint.runState === 'needs-reset' ||
      checkpoint.runState === 'running'
    )
  ) return null;
  const fallback = createDefaultIdealFile(index);
  const normalizedQuality = normalizeIdealQuality(quality, fallback);
  const base: WorkbenchIdealState = {
    ...fallback,
    id: projection.fileId,
    ...metadata,
    relation: authority.relation as WorkbenchIdealState['relation'],
    params: canonicalClone(authority.params) as unknown as
      WorkbenchIdealState['params'],
    appliedParams:
      canonicalClone(authority.appliedParams) as unknown as
        WorkbenchIdealState['appliedParams'],
    activeParams:
      canonicalClone(authority.activeParams) as unknown as
        WorkbenchIdealState['activeParams'],
    pointsByRelation:
      canonicalClone(authority.pointsByRelation) as WorkbenchIdealState['pointsByRelation'],
    finalChartData: authority.finalChartData === null
      ? null
      : canonicalClone(authority.finalChartData) as WorkbenchIdealState['finalChartData'],
    runState: checkpoint.runState === 'running'
      ? 'paused'
      : checkpoint.runState,
    hardSphereEngineSnapshot:
      canonicalClone(checkpoint.engineSnapshot) as
        WorkbenchIdealState['hardSphereEngineSnapshot'],
    needsReset: checkpoint.needsReset,
    verificationState:
      normalizedQuality.verificationState,
    historyUnlocked: normalizedQuality.historyUnlocked,
    visiblePanels: normalizeVisiblePanels(
      ui.visiblePanels,
      fallback.visiblePanels,
    ),
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
      ui.liveWorkspaceSplitRatio,
    ),
    idealWindowLayout: normalizeIdealWindowLayoutState(
      ui.idealWindowLayout,
    ),
  };
  const canonical = canonicalizeHardSphereRuntime(base);
  if (canonical === null) return null;
  return {
    ...canonical.file,
    needsReset: checkpoint.needsReset,
  };
};

const reprojectHeatCapacityFile = (
  projection: WorkbenchPersistenceV3FileProjection,
  index: number,
  compatibilityHooks: WorkbenchPersistenceV3ProjectionCompatibilityHooks,
): WorkbenchPersistenceV3DecodeResult<WorkbenchHeatCapacityState> => {
  const metadata = readFileMetadata(projection);
  const authority = projection.fields.authoritative;
  const relation = projection.fields.relation;
  const quality = projection.fields.quality;
  const ui = projection.fields.uiCheckpoint;
  if (
    metadata === null ||
    !isPlainRecord(authority.activeRuntime) ||
    !isPlainRecord(authority.freeDomains) ||
    !isPlainRecord(authority.guide) ||
    !isPlainRecord(authority.modeSessions) ||
    !(
      relation.heatCapacityMode === 'demo' ||
      relation.heatCapacityMode === 'guide' ||
      relation.heatCapacityMode === 'free' ||
      relation.heatCapacityMode === null
    ) ||
    !(
      relation.heatCapacityFreeParameterScheme === 'real' ||
      relation.heatCapacityFreeParameterScheme === 'ideal'
    ) ||
    !(
      relation.heatCapacityFreeDisplayScheme === 'real' ||
      relation.heatCapacityFreeDisplayScheme === 'ideal'
    )
  ) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'schema-shape',
      code: 'persistence-v3-heat-projection-invalid',
      message: 'Heat-capacity V3 projection is invalid.',
    });
  }
  const fallback = createDefaultHeatCapacityFile(index);
  const runtimeVersionCandidates = [
    [
      authority.activeRuntime.heatCapacityFreeRuntimeVersion,
      HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      'fields.authoritative.activeRuntime.heatCapacityFreeRuntimeVersion',
      'persistence-v3-heat-runtime-projection-version',
    ],
    [
      authority.activeRuntime.heatCapacityFreeTraceVersion,
      HEAT_CAPACITY_FREE_TRACE_VERSION,
      'fields.authoritative.activeRuntime.heatCapacityFreeTraceVersion',
      'persistence-v3-heat-trace-projection-version',
    ],
  ] as const;
  for (
    const [version, supportedVersion, fieldPath, code]
    of runtimeVersionCandidates
  ) {
    if (
      typeof version === 'number' &&
      Number.isInteger(version) &&
      version > supportedVersion
    ) {
      return projectionFailure('unsupported-future', projection, {
        fileId: projection.fileId,
        fileKind: 'heatCapacity',
        phase: 'restore',
        category: 'unsupported-future',
        code: `${code}-future`,
        message:
          'The heat-capacity runtime projection requires a newer application.',
        fieldPath,
        sourceVersion: version,
        supportedVersion,
      });
    }
  }
  if (
    typeof authority.modeSessions.schemaVersion === 'number' &&
    authority.modeSessions.schemaVersion >
      HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION
  ) {
    return projectionFailure('unsupported-future', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-mode-session-projection-future',
      message:
        'The heat-capacity mode-session projection requires a newer application.',
      fieldPath: 'fields.authoritative.modeSessions.schemaVersion',
    });
  }
  const modeSessionFuture = findFutureHeatCapacityModeSessionVersion(
    authority.modeSessions,
    'fields.authoritative.modeSessions',
  );
  if (modeSessionFuture !== null) {
    return projectionFailure('unsupported-future', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-mode-session-projection-nested-future',
      message: modeSessionFuture.message,
      fieldPath: modeSessionFuture.fieldPath,
      sourceVersion: modeSessionFuture.sourceVersion,
      supportedVersion: modeSessionFuture.supportedVersion,
    });
  }
  const domainFuture = findFirstFutureHeatCapacityDomainVersion([
    {
      value: authority.freeDomains.real,
      scheme: 'real',
      fieldPath: 'fields.authoritative.freeDomains.real',
      fallback: fallback.heatCapacityFreeRealDomain,
    },
    {
      value: authority.freeDomains.ideal,
      scheme: 'ideal',
      fieldPath: 'fields.authoritative.freeDomains.ideal',
      fallback: fallback.heatCapacityFreeIdealDomain,
    },
  ]);
  if (domainFuture !== null) {
    return projectionFailure('unsupported-future', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'unsupported-future',
      code: 'persistence-v3-heat-domain-projection-nested-future',
      message: domainFuture.message,
      fieldPath: domainFuture.fieldPath,
      sourceVersion: domainFuture.sourceVersion,
      supportedVersion: domainFuture.supportedVersion,
    });
  }
  for (
    const [version, supportedVersion, fieldPath, code]
    of runtimeVersionCandidates
  ) {
    const isLegacyTraceVersion =
      fieldPath ===
        'fields.authoritative.activeRuntime.heatCapacityFreeTraceVersion' &&
      version === 5;
    const isLegacyRuntimeVersion =
      fieldPath ===
        'fields.authoritative.activeRuntime.heatCapacityFreeRuntimeVersion' &&
      version === 5;
    if (
      version !== supportedVersion &&
      !isLegacyTraceVersion &&
      !isLegacyRuntimeVersion
    ) {
      return projectionFailure('quarantined', projection, {
        fileId: projection.fileId,
        fileKind: 'heatCapacity',
        phase: 'restore',
        category: 'schema-version',
        code: `${code}-invalid`,
        message: 'The heat-capacity runtime projection version is unsupported.',
        fieldPath,
        sourceVersion: typeof version === 'number' ? version : undefined,
        supportedVersion,
      });
    }
  }
  if (
    !isPlainRecord(authority.freeDomains.real) ||
    !isPlainRecord(authority.freeDomains.ideal)
  ) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'schema-shape',
      code: 'persistence-v3-heat-projection-invalid',
      message: 'Heat-capacity V3 projection is invalid.',
      fieldPath: 'fields.authoritative.freeDomains',
    });
  }
  const decodedAuthorityValues = decodeHeatCapacityV3AuthorityValues(
    authority.activeRuntime,
    authority.guide,
    relation.heatCapacityMode as WorkbenchHeatCapacityState['heatCapacityMode'],
  );
  if (decodedAuthorityValues.ok === false) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'authoritative-data',
      code: 'persistence-v3-heat-authority-value-invalid',
      message: decodedAuthorityValues.reason,
      fieldPath: decodedAuthorityValues.fieldPath,
    });
  }
  const modeSessionCacheRepair = repairHeatCapacityModeSessionCaches(
    authority.modeSessions,
  );
  const normalizedModeSessions = normalizeHeatCapacityModeSessionStore(
    modeSessionCacheRepair.value,
    projection.fileId,
  );
  if (
    !areCanonicalValuesEqual(
      normalizedModeSessions,
      modeSessionCacheRepair.value,
    )
  ) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'relationship',
      code: 'persistence-v3-heat-mode-session-projection-not-canonical',
      message:
        'The heat-capacity mode-session projection is invalid for this file.',
      fieldPath: 'fields.authoritative.modeSessions',
    });
  }
  const real = decodeHeatCapacityFreeExperimentDomainAggregate(
    authority.freeDomains.real,
    'real',
    fallback.heatCapacityFreeGasType,
    fallback.heatCapacityFreeRealDomain,
  );
  if (real.ok === false) {
    return projectionFailure(real.status, projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: real.status === 'unsupported-future'
        ? 'unsupported-future'
        : 'relationship',
      code: 'persistence-v3-heat-real-domain-restore-invalid',
      message: real.reason,
      fieldPath: real.fieldPath
        ? `fields.authoritative.freeDomains.real.${real.fieldPath}`
        : 'fields.authoritative.freeDomains.real',
      sourceVersion: typeof real.sourceVersion === 'number'
        ? real.sourceVersion
        : undefined,
    });
  }
  const ideal = decodeHeatCapacityFreeExperimentDomainAggregate(
    authority.freeDomains.ideal,
    'ideal',
    'air',
    fallback.heatCapacityFreeIdealDomain,
  );
  if (ideal.ok === false) {
    return projectionFailure(ideal.status, projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: ideal.status === 'unsupported-future'
        ? 'unsupported-future'
        : 'relationship',
      code: 'persistence-v3-heat-ideal-domain-restore-invalid',
      message: ideal.reason,
      fieldPath: ideal.fieldPath
        ? `fields.authoritative.freeDomains.ideal.${ideal.fieldPath}`
        : 'fields.authoritative.freeDomains.ideal',
      sourceVersion: typeof ideal.sourceVersion === 'number'
        ? ideal.sourceVersion
        : undefined,
    });
  }
  if (
    (
      real.status === 'migrated' &&
      !isAllowedHeatCapacityFreeDomainAggregateMigration(
        authority.freeDomains.real,
        real.value,
      )
    ) ||
    (
      real.status === 'exact' &&
      !areCanonicalValuesEqual(
        authority.freeDomains.real,
        real.value,
      )
    ) ||
    (
      real.status === 'repaired-cache' &&
      !isAllowedHeatCapacityFreeDomainAggregateCacheRepair(
        authority.freeDomains.real,
        real.value,
      )
    )
  ) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'authoritative-data',
      code: 'persistence-v3-heat-real-domain-migration-delta-invalid',
      message:
        'The real Free domain requires changes outside the supported aggregate migration.',
      fieldPath: 'fields.authoritative.freeDomains.real',
    });
  }
  if (
    (
      ideal.status === 'migrated' &&
      !isAllowedHeatCapacityFreeDomainAggregateMigration(
        authority.freeDomains.ideal,
        ideal.value,
      )
    ) ||
    (
      ideal.status === 'exact' &&
      !areCanonicalValuesEqual(
        authority.freeDomains.ideal,
        ideal.value,
      )
    ) ||
    (
      ideal.status === 'repaired-cache' &&
      !isAllowedHeatCapacityFreeDomainAggregateCacheRepair(
        authority.freeDomains.ideal,
        ideal.value,
      )
    )
  ) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'authoritative-data',
      code: 'persistence-v3-heat-ideal-domain-migration-delta-invalid',
      message:
        'The ideal Free domain requires changes outside the supported aggregate migration.',
      fieldPath: 'fields.authoritative.freeDomains.ideal',
    });
  }
  const sourceExperimentGroups = authority.freeDomains.experimentGroups;
  const experimentGroups = sourceExperimentGroups === undefined
    ? compatibilityHooks.migrateMissingHeatCapacityExperimentGroups?.({
        fileId: projection.fileId,
        selectedScheme: relation.heatCapacityFreeParameterScheme,
        real: real.value,
        ideal: ideal.value,
        fallbackCreatedAtMs: metadata.createdAt,
      }) ?? null
    : normalizeHeatCapacityFreeExperimentGroupCollectionForPersistence(
        sourceExperimentGroups,
      );
  if (experimentGroups === null) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: 'heatCapacity',
      phase: 'restore',
      category: 'relationship',
      code: 'persistence-v3-heat-experiment-groups-restore-invalid',
      message: 'The heat-capacity experiment-group collection is invalid.',
      fieldPath: 'fields.authoritative.freeDomains.experimentGroups',
    });
  }
  const allowedActiveRuntimeKeys = new Set(
    Object.keys(fallback).filter((key) => (
      isHeatCapacityActiveRuntimeKey(
        key,
        relation.heatCapacityMode as WorkbenchHeatCapacityState['heatCapacityMode'],
      )
    )),
  );
  const normalizedUi = normalizeHeatCapacityUiCheckpoint(ui, fallback);
  const normalizedQuality = normalizeHeatCapacityQuality(quality, fallback);
  const base = {
    ...fallback,
    ...canonicalClone(pickRecordKeys(
      decodedAuthorityValues.value.activeRuntime,
      allowedActiveRuntimeKeys,
    )),
    stats: createIdleStats(),
    chartData: createEmptyChartData(),
    particles: [],
    ...canonicalClone(pickRecordKeys(
      decodedAuthorityValues.value.guide,
      HEAT_CAPACITY_GUIDE_KEYS,
    )),
    ...canonicalClone(normalizedUi),
    ...metadata,
    id: projection.fileId,
    kind: 'heatCapacity',
    heatCapacityMode: relation.heatCapacityMode,
    heatCapacityModeSessions: canonicalClone(normalizedModeSessions),
    heatCapacityFreeParameterScheme:
      relation.heatCapacityFreeParameterScheme,
    heatCapacityFreeDisplayScheme:
      relation.heatCapacityFreeDisplayScheme,
    heatCapacityTeachingStatus:
      normalizedQuality.heatCapacityTeachingStatus,
    heatCapacityFreePreheatCompleted:
      normalizedQuality.heatCapacityFreePreheatCompleted,
    heatCapacityFreeRealDomain: real.value,
    heatCapacityFreeIdealDomain: ideal.value,
    heatCapacityFreeExperimentGroups: experimentGroups,
  } as unknown as WorkbenchHeatCapacityState;
  const activeDomain = relation.heatCapacityFreeParameterScheme === 'ideal'
    ? ideal.value
    : real.value;
  const activeReleaseState = base.heatCapacityReleaseState;
  const activeTheoreticalGamma = base.theoreticalGamma;
  const reprojected = applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields(
    applyHeatCapacityFreeDomainToRuntimeFields(
      base,
      activeDomain,
    ),
  );
  const value = relation.heatCapacityMode === 'free'
    ? reprojected
    : {
        ...reprojected,
        heatCapacityReleaseState: activeReleaseState,
        theoreticalGamma: activeTheoreticalGamma,
      };
  return createWorkbenchPersistenceV3Success(
    sourceExperimentGroups === undefined ||
      authority.activeRuntime.heatCapacityFreeRuntimeVersion === 5 ||
      authority.activeRuntime.heatCapacityFreeTraceVersion === 5 ||
      real.status === 'migrated' ||
      ideal.status === 'migrated' ||
      modeSessionCacheRepair.migrated
      ? 'migrated'
      : real.status === 'repaired-cache' ||
          ideal.status === 'repaired-cache' ||
          modeSessionCacheRepair.repaired
        ? 'repaired-cache'
        : 'exact',
    value,
    real.status === 'repaired-cache' ||
      ideal.status === 'repaired-cache' ||
      modeSessionCacheRepair.repaired
      ? [createFileDiagnostic({
          fileId: projection.fileId,
          fileKind: 'heatCapacity',
          phase: 'restore',
          category: 'derived-cache',
          code: 'persistence-v3-heat-corrected-signals-reprojected',
          message:
            modeSessionCacheRepair.repaired
              ? 'Suspended Free corrected-signal caches were rebuilt from recorded voltages.'
              : 'Heat-capacity corrected-signal cache was rebuilt from recorded voltages.',
          fieldPath: modeSessionCacheRepair.repaired
            ? 'fields.authoritative.modeSessions.free.snapshot.free'
            : 'fields.authoritative.freeDomains',
        })]
      : [],
  );
};

const reprojectPistonOscillationFile = (
  projection: WorkbenchPersistenceV3FileProjection,
  index: number,
) => {
  const metadata = readFileMetadata(projection);
  const ui = projection.fields.uiCheckpoint;
  if (metadata === null) return null;
  const fallback = createDefaultHeatCapacityPistonOscillationFile(index);
  const previewCameraPreset =
    WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS.includes(
      ui.previewCameraPreset as
        (typeof WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS)[number],
    )
      ? ui.previewCameraPreset as typeof fallback.previewCameraPreset
      : fallback.previewCameraPreset;
  const normalizedGuideSession = normalizePistonOscillationGuideSession(
    projection.fields.authoritative.guideSession,
  );
  const demoSession = normalizePistonOscillationDemoSession(
    projection.fields.authoritative.demoSession,
  );
  const freeSessionSource = projection.fields.authoritative.freeSession;
  const normalizedFreeSession = normalizePistonOscillationFreeSession(freeSessionSource);
  const modeSessionRepair = repairPistonOscillationModeSessionExclusivity(
    normalizedGuideSession,
    normalizedFreeSession,
  );
  const guideSession = modeSessionRepair.guideSession;
  const freeSession = modeSessionRepair.freeSession;
  const migrated = !isPlainRecord(freeSessionSource) ||
    projection.fields.authoritative.pistonGuideSessionProjectionVersion !==
      PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION;
  const expectedDerivedCache = createPistonOscillationGuideDerivedCache(
    guideSession,
  );
  const derivedCacheRepaired = !migrated && !areCanonicalValuesEqual(
    projection.fields.derived.pistonGuideDataProcessingCache,
    expectedDerivedCache,
  );
  const repaired = derivedCacheRepaired || modeSessionRepair.repaired;
  const lessonIntroAutoShown =
    projection.fields.authoritative.lessonIntroAutoShown === true;
  return {
    file: {
      ...fallback,
      id: projection.fileId,
      ...metadata,
      pistonOscillationSchemaVersion:
        WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
      visiblePanels: normalizeVisiblePanels(
        ui.visiblePanels,
        fallback.visiblePanels,
      ),
      liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
        ui.liveWorkspaceSplitRatio,
      ),
      previewCameraPreset,
      pistonOscillationOperationVisualizationEnabled:
        ui.pistonOscillationOperationVisualizationEnabled === true,
      pistonOscillationLessonIntroAutoShown: lessonIntroAutoShown,
      pistonOscillationDemoSession: demoSession,
      pistonOscillationGuideSession: guideSession,
      pistonOscillationFreeSession: freeSession,
      pistonOscillationMaterialsExpanded:
        ui.pistonOscillationMaterialsExpanded !== false,
    },
    migrated,
    repaired,
    derivedCacheRepaired,
    modeSessionExclusivityRepaired: modeSessionRepair.repaired,
  };
};

export const reprojectWorkbenchPersistenceV3File = (
  projection: WorkbenchPersistenceV3FileProjection,
  index = 1,
  compatibilityHooks: WorkbenchPersistenceV3ProjectionCompatibilityHooks = {},
): WorkbenchPersistenceV3DecodeResult<WorkbenchFileState> => {
  if (
    !isPlainRecord(projection) ||
    !isPlainRecord(projection.fields) ||
    !isPlainRecord(projection.fields.authoritative) ||
    !isPlainRecord(projection.fields.relation) ||
    !isPlainRecord(projection.fields.derived) ||
    !isPlainRecord(projection.fields.quality) ||
    !isPlainRecord(projection.fields.uiCheckpoint) ||
    !isWorkbenchFileKind(projection.fileKind) ||
    !validateProjectionIdentity(projection)
  ) {
    return projectionFailure('quarantined', projection, {
      fileId: typeof projection?.fileId === 'string'
        ? projection.fileId
        : 'unknown',
      fileKind: isWorkbenchFileKind(projection?.fileKind)
        ? projection.fileKind
        : 'standard',
      phase: 'restore',
      category: 'relationship',
      code: 'persistence-v3-file-projection-identity-invalid',
      message: 'V3 file projection identity or field classes are invalid.',
      fieldPath: 'fields.relation.fileId',
    });
  }
  try {
    switch (projection.fileKind) {
      case 'standard': {
        const file = reprojectStandardFile(projection, index);
        return file === null
          ? projectionFailure('quarantined', projection, {
              fileId: projection.fileId,
              fileKind: projection.fileKind,
              phase: 'restore',
              category: 'authoritative-data',
              code: 'persistence-v3-standard-reproject-failed',
              message: 'Standard simulation authority cannot be reprojected.',
            })
          : createWorkbenchPersistenceV3Success('exact', file);
      }
      case 'ideal': {
        const file = reprojectIdealFile(projection, index);
        return file === null
          ? projectionFailure('quarantined', projection, {
              fileId: projection.fileId,
              fileKind: projection.fileKind,
              phase: 'restore',
              category: 'authoritative-data',
              code: 'persistence-v3-ideal-reproject-failed',
              message: 'Ideal-gas authority cannot be reprojected.',
            })
          : createWorkbenchPersistenceV3Success('exact', file);
      }
      case 'heatCapacity':
        return reprojectHeatCapacityFile(projection, index, compatibilityHooks);
      case 'heatCapacityPistonOscillation': {
        const sourceVersion =
          projection.fields.authoritative.pistonOscillationSchemaVersion;
        if (
          Number.isInteger(sourceVersion) &&
          (sourceVersion as number) >
            WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION
        ) {
          return projectionFailure('unsupported-future', projection, {
            fileId: projection.fileId,
            fileKind: projection.fileKind,
            phase: 'restore',
            category: 'unsupported-future',
            code: 'persistence-v3-piston-projection-version-future',
            message:
              'The piston-oscillation projection requires a newer application.',
            fieldPath:
              'fields.authoritative.pistonOscillationSchemaVersion',
          });
        }
        if (
          sourceVersion !== WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION
        ) {
          return projectionFailure('quarantined', projection, {
            fileId: projection.fileId,
            fileKind: projection.fileKind,
            phase: 'restore',
            category: 'schema-version',
            code: 'persistence-v3-piston-projection-version-invalid',
            message: 'The piston-oscillation projection version is invalid.',
            fieldPath:
              'fields.authoritative.pistonOscillationSchemaVersion',
          });
        }
        const guideProjectionVersion = projection.fields.authoritative
          .pistonGuideSessionProjectionVersion;
        if (
          Number.isInteger(guideProjectionVersion) &&
          (guideProjectionVersion as number) >
            PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION
        ) {
          return projectionFailure('unsupported-future', projection, {
            fileId: projection.fileId,
            fileKind: projection.fileKind,
            phase: 'restore',
            category: 'unsupported-future',
            code: 'persistence-v3-piston-guide-authority-version-future',
            message:
              'The piston-oscillation guide authority requires a newer application.',
            fieldPath:
              'fields.authoritative.pistonGuideSessionProjectionVersion',
          });
        }
        if (
          guideProjectionVersion !== undefined &&
          guideProjectionVersion !== 1 &&
          guideProjectionVersion !== 2 &&
          guideProjectionVersion !==
            PISTON_OSCILLATION_GUIDE_AUTHORITY_PROJECTION_VERSION
        ) {
          return projectionFailure('quarantined', projection, {
            fileId: projection.fileId,
            fileKind: projection.fileKind,
            phase: 'restore',
            category: 'schema-version',
            code: 'persistence-v3-piston-guide-authority-version-invalid',
            message:
              'The piston-oscillation guide authority version is invalid.',
            fieldPath:
              'fields.authoritative.pistonGuideSessionProjectionVersion',
          });
        }
        const result = reprojectPistonOscillationFile(projection, index);
        return result === null
          ? projectionFailure('quarantined', projection, {
              fileId: projection.fileId,
              fileKind: projection.fileKind,
              phase: 'restore',
              category: 'authoritative-data',
              code: 'persistence-v3-piston-reproject-failed',
              message: 'Piston-oscillation projection cannot be restored.',
            })
          : createWorkbenchPersistenceV3Success(
              result.migrated
                ? 'migrated'
                : result.repaired
                  ? 'repaired-cache'
                  : 'exact',
              result.file,
              [
                ...(result.derivedCacheRepaired
                  ? [createFileDiagnostic({
                      fileId: projection.fileId,
                      fileKind: projection.fileKind,
                      phase: 'restore',
                      category: 'derived-cache',
                      code: 'persistence-v3-piston-guide-cache-repaired',
                      message:
                        'Piston-oscillation derived processing values were rebuilt from recorded observations and endpoint sample indices.',
                      fieldPath:
                        'fields.derived.pistonGuideDataProcessingCache',
                    })]
                  : []),
                ...(result.modeSessionExclusivityRepaired
                  ? [createWorkbenchPersistenceV3Diagnostic({
                      severity: 'warning',
                      phase: 'restore',
                      category: 'relationship',
                      code: 'persistence-v3-piston-mode-exclusivity-repaired',
                      message:
                        'Conflicting active Guide and Free sessions were repaired by pausing Free Mode without discarding its progress.',
                      aggregate: {
                        kind: 'piston-oscillation-document',
                        id: projection.fileId,
                        fileId: projection.fileId,
                        fileKind: projection.fileKind,
                      },
                      retry: 'never',
                      recovery: 'none',
                      fieldPath: 'fields.authoritative.freeSession.status',
                      mode: 'free',
                    })]
                  : []),
              ],
            );
      }
      default:
        return assertNeverWorkbenchFileKind(projection.fileKind);
    }
  } catch (error) {
    return projectionFailure('quarantined', projection, {
      fileId: projection.fileId,
      fileKind: projection.fileKind,
      phase: 'restore',
      category: 'schema-shape',
      code: 'persistence-v3-file-reproject-threw',
      message: error instanceof Error
        ? error.message
        : 'V3 file projection could not be restored.',
    });
  }
};

export const createWorkbenchPersistenceV3SemanticProjection = (
  projection: WorkbenchPersistenceV3FileProjection,
) => canonicalClone({
  projectionVersion: projection.projectionVersion,
  fileId: projection.fileId,
  fileKind: projection.fileKind,
  aggregateKind: projection.aggregateKind,
  authoritative: projection.fields.authoritative,
  relation: projection.fields.relation,
  quality: projection.fields.quality,
});

export const areWorkbenchPersistenceV3ProjectionFieldClassesEqual = (
  left: WorkbenchPersistenceV3FileProjection,
  right: WorkbenchPersistenceV3FileProjection,
  classes: readonly (
    keyof WorkbenchPersistenceV3ClassifiedFields
  )[],
) => classes.every((fieldClass) => (
  areCanonicalValuesEqual(
    left.fields[fieldClass],
    right.fields[fieldClass],
  )
));

export const cloneWorkbenchPersistenceV3FileProjection = (
  projection: WorkbenchPersistenceV3FileProjection,
) => canonicalClone(projection);
