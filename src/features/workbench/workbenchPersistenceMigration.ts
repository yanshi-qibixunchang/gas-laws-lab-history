import {
  applyHeatCapacityFreeDomainToRuntimeFields,
  createDefaultHeatCapacityFile,
  mergeHeatCapacityFreeRuntimeState,
  mergeHeatCapacityGuideRuntimeState,
  type WorkbenchFileState,
  type WorkbenchHeatCapacityState,
  type WorkbenchPanelKey,
} from './workbenchState.ts';
import type {
  WorkbenchSessionState,
} from './workbenchSession.ts';
import {
  createHeatCapacityPersistencePayload,
  restoreHeatCapacityFileFromPersistencePayload,
  validateHeatCapacityPersistencePayload,
} from './workbenchHeatCapacityPersistence.ts';
import {
  HEAT_CAPACITY_FREE_UI_REPLAY_KEYS,
} from './workbenchHeatCapacityPersistenceContract.ts';
import {
  LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION,
  createStandardPersistencePayload,
  restoreStandardFileFromPersistencePayload,
  validateStandardPersistencePayload,
} from './workbenchStandardPersistence.ts';
import {
  LEGACY_IDEAL_GAS_SCHEMA_VERSION,
  createIdealGasPersistencePayload,
  restoreIdealGasFileFromPersistencePayload,
  validateIdealGasPersistencePayload,
} from './workbenchIdealGasPersistence.ts';
import {
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import { repairMissingHardSphereEngineSnapshot } from './workbenchHardSphereProjection.ts';
import {
  WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
  isWorkbenchClosedFilesEnvelope,
  isWorkbenchSessionEnvelope,
  type WorkbenchClosedFilesEnvelopeV1,
  type WorkbenchExperimentFileEnvelopeV1,
  type WorkbenchPersistenceDiagnostic,
  type WorkbenchSessionEnvelopeV2,
} from './workbenchPersistenceSchema.ts';
import {
  isPersistenceFiniteNumber,
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';
import {
  areCanonicalPersistenceValuesEqual,
  isCanonicalStandardOrIdealWorkspaceFile,
} from './workbenchWorkspaceFileValidation.ts';
import {
  createDefaultHeatCapacityModeSessionStore,
  createHeatCapacityCommonRuntimeShell,
  HEAT_CAPACITY_LEGACY_423_U1_ANCHOR_PROVENANCE,
  isCanonicalHeatCapacityFreePersistenceRuntime,
  isCanonicalHeatCapacityGuidePersistenceRuntime,
  isHeatCapacityFreeRollbackSnapshotSemanticallyValid,
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from './workbenchHeatCapacityModeSession.ts';
import type {
  HeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  type HeatCapacityFreeTraceStore,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  normalizeHeatCapacityFreeRestoreConfigSnapshot,
  normalizeHeatCapacityFreeRestoreTraceStore,
  normalizeHeatCapacityFreeRestoreTrial,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
import {
  createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  createDefaultHeatCapacityGuidePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  calculateHeatCapacityIdealGasAmountMol,
  createHeatCapacityThermodynamicStateFromTemperature,
} from '../../domain/heatCapacity/heatCapacityThermodynamicKernel.ts';
import {
  createHeatCapacityFreeStandardReference,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
} from '../../domain/heatCapacity/heatCapacityGasTheory.ts';
import type {
  HeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  normalizeHeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';

export interface DecodeWorkbenchStorageResult {
  session: WorkbenchSessionState;
  diagnostics: WorkbenchPersistenceDiagnostic[];
  handled: boolean;
  migrationModeCaptureOverrides: WorkbenchMigrationModeCaptureOverride[];
}

export interface WorkbenchMigrationModeCaptureOverride {
  source: 'legacy-4.2.3' | 'public-5.1.1-blank-demo';
  fileId: string;
  mode: WorkbenchHeatCapacityState['heatCapacityMode'];
  capturedAtMs: number;
}

export interface DecodeWorkbenchClosedFilesStorageResult {
  files: WorkbenchFileState[];
  diagnostics: WorkbenchPersistenceDiagnostic[];
  handled: boolean;
  migrationModeCaptureOverrides: WorkbenchMigrationModeCaptureOverride[];
}

const fallbackSession = (): WorkbenchSessionState => ({
  version: 1,
  files: [],
  activeFileId: '',
  selectedPanel: 'preview',
});

const normalizeLegacyRunStateForCanonicalComparison = (payload: Record<string, unknown>) => {
  const runtime = isRecord(payload.runtime) ? payload.runtime : null;
  return runtime?.runState === 'running'
    ? { ...payload, runtime: { ...runtime, runState: 'paused' } }
    : payload;
};

const createUnsupportedFutureDiagnostic = (
  schemaVersion: number,
): WorkbenchPersistenceDiagnostic => ({
  level: 'error',
  code: 'unsupported-future-version',
  message: `Unsupported future workbench schema version: ${schemaVersion}.`,
});

const encodeFileEnvelope = (
  file: WorkbenchFileState,
  savedAt: number,
): WorkbenchExperimentFileEnvelopeV1 => ({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: file.id,
  kind: file.kind,
  name: file.name,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
  lastOpenedAt: file.lastOpenedAt,
  layout: {
    visiblePanels: file.visiblePanels,
    liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
    ...(file.kind === 'standard' ? { standardResultsLayout: file.standardResultsLayout } : {}),
    ...(file.kind === 'ideal' ? { idealWindowLayout: file.idealWindowLayout } : {}),
    ...(file.kind === 'heatCapacity'
      ? {
          openHeatCapacityTabs: file.openHeatCapacityTabs,
          activeHeatCapacityTabId: file.activeHeatCapacityTabId,
        }
      : {}),
  },
  payload: (
    file.kind === 'heatCapacity'
      ? createHeatCapacityPersistencePayload(file, savedAt)
      : file.kind === 'standard'
        ? createStandardPersistencePayload(file, savedAt)
        : createIdealGasPersistencePayload(file, savedAt)
  ) as unknown as Record<string, unknown>,
});

export const encodeWorkbenchStorageEnvelope = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
  savedAt = Date.now(),
): WorkbenchSessionEnvelopeV2 => ({
  schemaFamily: WORKBENCH_SESSION_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'development',
  savedAt,
  activeFileId: activeFileId || null,
  selectedPanel,
  files: files.map((file) => encodeFileEnvelope(
    file.kind === 'heatCapacity' &&
      file.id === activeFileId &&
      file.heatCapacityMode === 'demo' &&
      (
        file.runState === 'running' ||
        file.heatCapacityModeSessions.demo.status === 'empty'
      )
      ? suspendHeatCapacityModeSession(
          file,
          file.heatCapacityModeSessions[file.heatCapacityMode].uiCheckpoint,
          Math.max(savedAt, file.updatedAt),
        )
      : file,
    savedAt,
  )),
});

export const encodeWorkbenchClosedFilesStorageEnvelope = (
  files: WorkbenchFileState[],
  savedAt = Date.now(),
): WorkbenchClosedFilesEnvelopeV1 => ({
  schemaFamily: WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'development',
  savedAt,
  files: files.map((file) => encodeFileEnvelope(file, savedAt)),
});

const restoreStandardOrIdealRuntimeFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
): WorkbenchFileState[] => {
  const payload = fileEnvelope.payload;
  if (!isRecord(payload) || !isRecord(payload.runtimeState)) return [];
  const runtimeState = payload.runtimeState as unknown as WorkbenchFileState;
  if (
    (fileEnvelope.kind === 'standard' && runtimeState.kind !== 'standard') ||
    (fileEnvelope.kind === 'ideal' && runtimeState.kind !== 'ideal')
  ) {
    return [];
  }
  const restoredFile = repairMissingHardSphereEngineSnapshot({
    ...runtimeState,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(
      'hardSphereEngineSnapshot' in runtimeState ? runtimeState.hardSphereEngineSnapshot : null,
    ),
  } as Extract<WorkbenchFileState, { kind: 'standard' | 'ideal' }>);
  return isCanonicalStandardOrIdealWorkspaceFile(restoredFile) ? [restoredFile] : [];
};

const restoreStandardFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  index: number,
): WorkbenchFileState[] => {
  if (fileEnvelope.kind !== 'standard') return [];
  if (validateStandardPersistencePayload(fileEnvelope.payload).valid) {
    const restored = restoreStandardFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index);
    const canonicalPayload = createStandardPersistencePayload(restored, fileEnvelope.updatedAt);
    const isLegacySchema = fileEnvelope.payload.standardSchemaVersion ===
      LEGACY_STANDARD_SIMULATION_SCHEMA_VERSION;
    return (isLegacySchema || areCanonicalPersistenceValuesEqual(
      normalizeLegacyRunStateForCanonicalComparison(fileEnvelope.payload),
      canonicalPayload,
    )) &&
      isCanonicalStandardOrIdealWorkspaceFile(restored)
      ? [restored]
      : [];
  }
  return restoreStandardOrIdealRuntimeFile(fileEnvelope);
};

const restoreIdealGasFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  index: number,
): WorkbenchFileState[] => {
  if (fileEnvelope.kind !== 'ideal') return [];
  if (validateIdealGasPersistencePayload(fileEnvelope.payload).valid) {
    const restored = restoreIdealGasFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index);
    const canonicalPayload = createIdealGasPersistencePayload(restored, fileEnvelope.updatedAt);
    const isLegacySchema = fileEnvelope.payload.idealGasSchemaVersion ===
      LEGACY_IDEAL_GAS_SCHEMA_VERSION;
    return (isLegacySchema || areCanonicalPersistenceValuesEqual(
      normalizeLegacyRunStateForCanonicalComparison(fileEnvelope.payload),
      canonicalPayload,
    )) &&
      isCanonicalStandardOrIdealWorkspaceFile(restored)
      ? [restored]
      : [];
  }
  return restoreStandardOrIdealRuntimeFile(fileEnvelope);
};

const migrateLegacyHeatCapacityFocusIdentity = (payload: Record<string, unknown>) => {
  const common = isRecord(payload.common) ? payload.common : null;
  const modeSessions = common && isRecord(common.modeSessions) ? common.modeSessions : null;
  if (!common || !modeSessions) return payload;
  let changed = false;
  const migratedModeSessions = { ...modeSessions };
  (['demo', 'guide', 'free'] as const).forEach((mode) => {
    const entry = modeSessions[mode];
    if (!isRecord(entry) || !isRecord(entry.uiCheckpoint)) return;
    const scene = entry.uiCheckpoint.scene;
    if (!isRecord(scene) || (
      scene.focusMode === 'none' ||
      scene.focusMode === 'instrument' ||
      scene.focusMode === 'pump' ||
      scene.focusMode === 'bottle'
    )) return;
    if (Object.prototype.hasOwnProperty.call(scene, 'focusMode')) return;
    const cameraPose = isRecord(scene.cameraPose) ? scene.cameraPose : null;
    const legacyCameraMode = cameraPose?.cameraMode;
    const focusMode = legacyCameraMode === 'instrument' || legacyCameraMode === 'pump' || legacyCameraMode === 'bottle'
      ? legacyCameraMode
      : 'none';
    migratedModeSessions[mode] = {
      ...entry,
      uiCheckpoint: {
        ...entry.uiCheckpoint,
        scene: { ...scene, focusMode },
      },
    };
    changed = true;
  });
  return changed
    ? { ...payload, common: { ...common, modeSessions: migratedModeSessions } }
    : payload;
};

const hasOwn = (value: Record<string, unknown>, key: string) => (
  Object.prototype.hasOwnProperty.call(value, key)
);

const hasFiniteFields = (
  value: Record<string, unknown>,
  fields: readonly string[],
) => fields.every((field) => isPersistenceFiniteNumber(value[field]));

const LEGACY_423_FIXED_VESSEL_VOLUME_L = 2;
const LEGACY_423_FIXED_PUMP_AMOUNT_GAIN_RATIO = 0.00345;
const LEGACY_423_FIXED_STOPCOCK_FLOW_RATE = 5.25;
const LEGACY_423_FIXED_PUMP_PRESSURE_LIMIT_KPA = 109;
const LEGACY_423_FIXED_GAMMA = 1.4;
const LEGACY_423_FIXED_THERMAL_CONFIG = {
  gasWallConductanceWPerK: 0.14,
  wallAmbientConductanceWPerK: 0.45,
  wallHeatCapacityJPerK: 45,
  minimumGasHeatCapacityJPerK: 0.1,
} as const;
const LEGACY_423_FIXED_PUMP_STROKE_DURATION_S = 0.08;
const LEGACY_423_FIXED_RECOMMENDED_PUMP_INTERVAL_S = 0.1;
const LEGACY_423_FIXED_RELEASE_VISUAL_RESPONSE_DELAY_S = 0.02;
const LEGACY_423_FIXED_RELEASE_VISUAL_MAIN_DURATION_S = 0.18;
const LEGACY_423_FIXED_PUMP_SENSOR_LAG_RATE = 36;
const LEGACY_423_FIXED_FAST_PROCESS_SAMPLE_STEP_S = 0.04;

const isLegacy423FixedFreePhysicsConfig = (value: Record<string, unknown>) => (
  value.vesselVolumeL === LEGACY_423_FIXED_VESSEL_VOLUME_L &&
  value.pumpAmountGainRatio === LEGACY_423_FIXED_PUMP_AMOUNT_GAIN_RATIO &&
  value.stopcockFlowRate === LEGACY_423_FIXED_STOPCOCK_FLOW_RATE &&
  !hasOwn(value, 'pumpWorkRetention')
);

const isLegacy423FixedGuidePhysicsConfig = (value: Record<string, unknown>) => (
  isLegacy423FixedFreePhysicsConfig(value) &&
  value.gamma === LEGACY_423_FIXED_GAMMA &&
  value.pumpPressureLimitKPa === LEGACY_423_FIXED_PUMP_PRESSURE_LIMIT_KPA &&
  isRecord(value.thermal) &&
  Object.entries(LEGACY_423_FIXED_THERMAL_CONFIG).every(([key, expected]) => (
    value.thermal?.[key] === expected
  ))
);

const isLegacy423EnvironmentConfig = (value: unknown) => (
  isRecord(value) &&
  hasFiniteFields(value, ['ambientPressureKPa', 'ambientTemperatureK']) &&
  (value.ambientPressureKPa as number) > 0 &&
  (value.ambientTemperatureK as number) > 0
);

const isLegacy423ThermalConfig = (value: unknown) => (
  isRecord(value) &&
  hasFiniteFields(value, [
    'gasWallConductanceWPerK',
    'wallAmbientConductanceWPerK',
    'wallHeatCapacityJPerK',
    'minimumGasHeatCapacityJPerK',
  ])
);

const isLegacy423PhysicsConfig = (value: unknown) => (
  isRecord(value) &&
  isLegacy423EnvironmentConfig(value.environment) &&
  hasFiniteFields(value, [
    'vesselVolumeL',
    'gamma',
    'pumpAmountGainRatio',
    'pumpPressureLimitKPa',
    'stopcockFlowRate',
  ]) &&
  (value.vesselVolumeL as number) > 0 &&
  (value.gamma as number) > 1 &&
  isLegacy423FixedFreePhysicsConfig(value) &&
  isLegacy423ThermalConfig(value.thermal) &&
  isRecord(value.leakage) &&
  typeof value.leakage.enabled === 'boolean' &&
  isPersistenceFiniteNumber(value.leakage.ratePerS)
);

const isNullableFinite = (value: unknown) => value === null || isPersistenceFiniteNumber(value);

const isLegacy423ReleaseReference = (value: unknown) => value === null || (
  isRecord(value) &&
  hasFiniteFields(value, [
    'pressureBeforeKPa',
    'temperatureBeforeK',
    'amountBeforeRatio',
    'openedAtS',
  ]) &&
  isNullableFinite(value.reachedAmbientAtS)
);

const isLegacy423PhysicsState = (value: unknown, includeEnvironment: boolean) => {
  if (!isRecord(value)) return false;
  const validCore = hasFiniteFields(value, [
    'simulationTimeS',
    'gasAmountRatio',
    'gasTemperatureK',
    'wallTemperatureK',
    'pumpStrokeCount',
    'currentPumpValveOpenDurationS',
    'currentStopcockOpenDurationS',
  ]) &&
    (value.gasAmountRatio as number) > 0 &&
    (value.gasTemperatureK as number) > 0 &&
    (value.wallTemperatureK as number) > 0 &&
    Array.isArray(value.pumpProcesses) &&
    typeof value.releaseStarted === 'boolean' &&
    isNullableFinite(value.lastPumpStrokeAtS) &&
    isNullableFinite(value.lastPumpValveOpenedAtS) &&
    isNullableFinite(value.lastPumpValveClosedAtS) &&
    isNullableFinite(value.lastStopcockOpenedAtS) &&
    isNullableFinite(value.lastStopcockClosedAtS) &&
    isLegacy423ReleaseReference(value.releaseReference);
  return validCore && (!includeEnvironment || (
    hasFiniteFields(value, [
      'ambientPressureOffsetKPa',
      'ambientTemperatureOffsetK',
      'effectiveAmbientPressureKPa',
      'effectiveAmbientTemperatureK',
      'maxPressureKPa',
    ]) &&
    (typeof value.environmentDisturbanceSeed === 'string' ||
      isPersistenceFiniteNumber(value.environmentDisturbanceSeed))
  ));
};

const isLegacy423SensorConfig = (value: unknown) => (
  isRecord(value) &&
  hasFiniteFields(value, [
    'pressureMvPerKPa',
    'temperatureMvAtAmbient',
    'temperatureMvPerK',
    'lagRate',
    'noiseMv',
    'quantizationMv',
    'minSampleIntervalS',
    'maxSampleIntervalS',
    'historyWindowS',
  ]) &&
  (value.temperatureMvPerK as number) > 0
);

const isLegacy423SensorState = (value: unknown) => (
  isRecord(value) &&
  hasFiniteFields(value, [
    'pressureInitialBiasMv',
    'displayPressureMv',
    'displayTemperatureMv',
    'nextSampleAtS',
    'pressureSlopeMvPerS',
    'temperatureSlopeMvPerS',
    'pressureReliability',
    'pressureNonlinearErrorMv',
    'pressureStochasticErrorMv',
  ]) &&
  (typeof value.seed === 'string' || isPersistenceFiniteNumber(value.seed)) &&
  Array.isArray(value.pressureHistory) &&
  Array.isArray(value.temperatureHistory)
);

const isLegacy423CalibrationState = (value: unknown) => (
  isRecord(value) &&
  hasFiniteFields(value, ['calibrationVersion', 'zeroOffsetMv']) &&
  Array.isArray(value.zeroEvents) &&
  (value.automaticU0 === null || isRecord(value.automaticU0))
);

const isLegacy423GuidePhysicsConfig = (value: unknown) => (
  isRecord(value) &&
  isLegacy423EnvironmentConfig(value.environment) &&
  hasFiniteFields(value, [
    'vesselVolumeL',
    'gamma',
    'pumpAmountGainRatio',
    'pumpPressureLimitKPa',
    'stopcockFlowRate',
  ]) &&
  (value.vesselVolumeL as number) > 0 &&
  (value.gamma as number) > 1 &&
  isLegacy423ThermalConfig(value.thermal) &&
  isLegacy423FixedGuidePhysicsConfig(value)
);

const LEGACY_423_GUIDE_WORKFLOW_STEPS = new Set([
  'powerRequired',
  'openStopcockForZeroRequired',
  'zeroRequired',
  'recordU0Required',
  'closeStopcockBeforePumpRequired',
  'openPumpValveRequired',
  'pumpRequired',
  'closePumpValveRequired',
  'u1Waiting',
  'recordU1Required',
  'openStopcockForReleaseRequired',
  'closeStopcockAfterReleaseRequired',
  'u2Waiting',
  'recordU2Required',
  'closePowerRequired',
  'completed',
]);

const LEGACY_423_GUIDE_RELEASE_STARTED_STEPS = new Set([
  'closeStopcockAfterReleaseRequired',
  'u2Waiting',
  'recordU2Required',
  'closePowerRequired',
  'completed',
]);

const isLegacy423GuideWorkflow = (value: unknown) => (
  isRecord(value) &&
  typeof value.step === 'string' &&
  LEGACY_423_GUIDE_WORKFLOW_STEPS.has(value.step) &&
  (value.speedMultiplier === 2 || value.speedMultiplier === 4 ||
    value.speedMultiplier === 8 || value.speedMultiplier === 16) &&
  typeof value.paused === 'boolean' &&
  isNullableFinite(value.waitStartedAtS) &&
  (value.waitStage === null || value.waitStage === 'u1' || value.waitStage === 'u2') &&
  typeof value.strongReminderActive === 'boolean' &&
  (value.strongReminderTargetControlId === null ||
    typeof value.strongReminderTargetControlId === 'string') &&
  isPersistenceFiniteNumber(value.wrongActionCount)
);

const isRecordArrayWithStringIds = (value: unknown) => (
  Array.isArray(value) && value.every((entry) => isRecord(entry) && typeof entry.id === 'string')
);

const isLegacy423RollbackSnapshot = (value: unknown) => {
  if (value === null) return true;
  if (!isRecord(value) ||
    !hasOwn(value, 'heatCapacityFreeStopcockFlowOpen') ||
    !hasOwn(value, 'heatCapacityFreeStopcockPendingOpenAtMs') ||
    !hasOwn(value, 'heatCapacityFreeStopcockFlowPurpose')) return false;
  return typeof value.heatCapacityFreeStopcockFlowOpen === 'boolean' &&
    (value.heatCapacityFreeStopcockPendingOpenAtMs === null ||
      isPersistenceFiniteNumber(value.heatCapacityFreeStopcockPendingOpenAtMs)) &&
    (
      value.heatCapacityFreeStopcockFlowPurpose === 'none' ||
      value.heatCapacityFreeStopcockFlowPurpose === 'zeroing' ||
      value.heatCapacityFreeStopcockFlowPurpose === 'release'
    );
};

const isLegacy423RollbackSnapshots = (value: unknown) => (
  isRecord(value) &&
  hasOwn(value, 'afterPowerOn') &&
  hasOwn(value, 'beforePump') &&
  hasOwn(value, 'beforeRelease') &&
  isLegacy423RollbackSnapshot(value.afterPowerOn) &&
  isLegacy423RollbackSnapshot(value.beforePump) &&
  isLegacy423RollbackSnapshot(value.beforeRelease)
);

const isLegacy423HeatCapacityDomain = (value: unknown, expectedScheme: 'real' | 'ideal') => {
  if (!isRecord(value) || value.scheme !== expectedScheme) return false;
  const physicsState = isRecord(value.physicsState) ? value.physicsState : null;
  const sensorState = isRecord(value.sensorState) ? value.sensorState : null;
  const calibrationState = isRecord(value.calibrationState) ? value.calibrationState : null;
  const traceStore = isRecord(value.traceStore) ? value.traceStore : null;
  return (
    (value.gasType === 'air' || value.gasType === 'helium') &&
    isRecord(value.recordConfig) &&
    isPersistenceFiniteNumber(value.pressureWarningMv) &&
    typeof value.instrumentNoiseEnabled === 'boolean' &&
    isRecord(value.environmentConfig) &&
    isLegacy423PhysicsConfig(value.physicsConfig) &&
    isLegacy423PhysicsState(physicsState, true) &&
    isLegacy423SensorConfig(value.sensorConfig) &&
    isLegacy423SensorState(sensorState) &&
    sensorState !== null &&
    (sensorState.pressureReliability as number) >= 0 &&
    (sensorState.pressureReliability as number) <= 1 &&
    isLegacy423CalibrationState(calibrationState) &&
    typeof value.stopcockFlowOpen === 'boolean' &&
    (value.stopcockPendingOpenAtMs === null || isPersistenceFiniteNumber(value.stopcockPendingOpenAtMs)) &&
    (
      value.stopcockFlowPurpose === 'none' ||
      value.stopcockFlowPurpose === 'zeroing' ||
      value.stopcockFlowPurpose === 'release'
    ) &&
    isLegacy423RollbackSnapshots(value.rollbackSnapshots) &&
    traceStore !== null &&
    isRecordArrayWithStringIds(traceStore.traceTrials) &&
    isRecordArrayWithStringIds(value.trials)
  );
};

const isLegacy423HeatCapacityPayload = (payload: unknown) => {
  if (!isRecord(payload)) return false;
  const common = isRecord(payload.common) ? payload.common : null;
  const free = isRecord(payload.free) ? payload.free : null;
  const guided = payload.guided === null ? null : isRecord(payload.guided) ? payload.guided : undefined;
  return Boolean(
    common &&
    free &&
    !hasOwn(common, 'modeSessions') &&
    !hasOwn(free, 'preheatCompleted') &&
    guided !== undefined &&
    (guided === null || !hasOwn(guided, 'temperatureSensorState'))
  );
};

const validateLegacy423HeatCapacityPayload = (payload: Record<string, unknown>) => {
  const common = isRecord(payload.common) ? payload.common : null;
  const free = isRecord(payload.free) ? payload.free : null;
  const runtime = free && isRecord(free.runtime) ? free.runtime : null;
  const config = free && isRecord(free.config) ? free.config : null;
  const environment = config && isRecord(config.environment) ? config.environment : null;
  const physics = config && isRecord(config.physics) ? config.physics : null;
  const controls = free && isRecord(free.controls) ? free.controls : null;
  const traceStore = free && isRecord(free.traceStore) ? free.traceStore : null;
  const guided = payload.guided === null ? null : isRecord(payload.guided) ? payload.guided : undefined;
  return Boolean(
    payload.experimentKind === 'heatCapacity' &&
    payload.heatCapacitySchemaVersion === 1 &&
    (payload.mode === 'demo' || payload.mode === 'guide' || payload.mode === 'free') &&
    payload.demo === null &&
    common &&
    typeof common.materialsExpanded === 'boolean' &&
    (
      common.teachingStatus === 'idle' ||
      common.teachingStatus === 'running' ||
      common.teachingStatus === 'completed'
    ) &&
    Array.isArray(common.openHeatCapacityTabs) &&
    typeof common.lessonIntroAutoShown === 'boolean' &&
    (common.experimentProfile === null ||
      normalizeHeatCapacityTeachingProfile(common.experimentProfile) !== null) &&
    free &&
    free.runtimeVersion === 5 &&
    free.traceVersion === LEGACY_423_HEAT_CAPACITY_TRACE_VERSION &&
    free.calculationVersion === 'log-pressure-v1' &&
    (free.parameterScheme === 'real' || free.parameterScheme === 'ideal') &&
    (free.displayScheme === 'real' || free.displayScheme === 'ideal') &&
    (free.gasType === 'air' || free.gasType === 'helium') &&
    isLegacy423HeatCapacityDomain(free.real, 'real') &&
    isLegacy423HeatCapacityDomain(free.ideal, 'ideal') &&
    config &&
    config.version === LEGACY_423_HEAT_CAPACITY_CONFIG_VERSION &&
    environment &&
    isPersistenceFiniteNumber(environment.ambientTemperatureK) &&
    environment.ambientTemperatureK > 0 &&
    physics &&
    isPersistenceFiniteNumber(physics.gamma) &&
    physics.gamma > 1 &&
    isRecord(free.parameterDraft) &&
    isRecord(free.acknowledgements) &&
    isRecord(free.recordConfig) &&
    isPersistenceFiniteNumber(free.pressureWarningMv) &&
    typeof free.instrumentNoiseEnabled === 'boolean' &&
    runtime &&
    isLegacy423PhysicsState(runtime, true) &&
    controls &&
    typeof controls.powerOn === 'boolean' &&
    typeof controls.pumpValveOpen === 'boolean' &&
    typeof controls.stopcockOpen === 'boolean' &&
    typeof controls.stopcockFlowOpen === 'boolean' &&
    (
      controls.stopcockFlowPurpose === 'none' ||
      controls.stopcockFlowPurpose === 'zeroing' ||
      controls.stopcockFlowPurpose === 'release'
    ) &&
    isLegacy423SensorState(free.sensor) &&
    isLegacy423CalibrationState(free.calibration) &&
    isLegacy423RollbackSnapshots(free.rollbackSnapshots) &&
    traceStore &&
    isRecordArrayWithStringIds(traceStore.traceTrials) &&
    isRecordArrayWithStringIds(free.trials) &&
    isRecord(free.uiReplay) &&
    guided !== undefined &&
    (
      guided === null || (
        isLegacy423GuidePhysicsConfig(guided.physicsConfig) &&
        isLegacy423PhysicsState(guided.physicsState, false) &&
        isLegacy423GuideWorkflow(guided.workflow) &&
        (guided.trial === null || (isRecord(guided.trial) && typeof guided.trial.id === 'string'))
      )
    )
  );
};

const LEGACY_423_HEAT_CAPACITY_TRACE_VERSION = 4;
const LEGACY_423_HEAT_CAPACITY_CONFIG_VERSION = 7;

interface TemperatureSignalMapping {
  baseMv: number;
  sensitivityMvPerK: number;
}

const CURRENT_TEMPERATURE_SIGNAL_MAPPING: TemperatureSignalMapping = {
  baseMv: DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.temperatureBaseMv,
  sensitivityMvPerK: DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.temperatureSensitivityMvPerK,
};

const LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING: TemperatureSignalMapping = {
  baseMv: 1499.05,
  sensitivityMvPerK: 4,
};

const readLegacy423TemperatureSignalMapping = (
  value: unknown,
  fallback = LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING,
): TemperatureSignalMapping => {
  if (!isRecord(value)) return fallback;
  return isPersistenceFiniteNumber(value.temperatureMvAtAmbient) &&
    isPersistenceFiniteNumber(value.temperatureMvPerK) &&
    value.temperatureMvPerK > 0
    ? {
        baseMv: value.temperatureMvAtAmbient,
        sensitivityMvPerK: value.temperatureMvPerK,
      }
    : fallback;
};

const getLegacy423ConfigTemperatureSignalMapping = (value: unknown) => (
  isRecord(value) ? readLegacy423TemperatureSignalMapping(value.sensor) : null
);

const remapLegacy423TemperatureSignal = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => isPersistenceFiniteNumber(value)
  ? CURRENT_TEMPERATURE_SIGNAL_MAPPING.baseMv +
    ((value - mapping.baseMv) / mapping.sensitivityMvPerK) *
      CURRENT_TEMPERATURE_SIGNAL_MAPPING.sensitivityMvPerK
  : value;

const scaleLegacy423TemperatureDelta = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => isPersistenceFiniteNumber(value)
  ? value * CURRENT_TEMPERATURE_SIGNAL_MAPPING.sensitivityMvPerK /
    mapping.sensitivityMvPerK
  : value;

const LEGACY_423_TEACHING_PROFILE_TEMPERATURE_KEYS = [
  'ambientTemperatureMv',
  'initialTemperatureMv',
  'stableTemperatureMv',
  'releaseTemperatureLowMv',
  'recoveryTemperatureMv',
] as const;

const upgradeLegacy423TeachingProfile = (value: unknown) => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    ...Object.fromEntries(LEGACY_423_TEACHING_PROFILE_TEMPERATURE_KEYS.map((key) => [
      key,
      remapLegacy423TemperatureSignal(
        value[key],
        LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING,
      ),
    ])),
  };
};

const upgradeLegacy423TemperatureRecordConfig = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    temperatureStableSlopeMvPerS: scaleLegacy423TemperatureDelta(
      value.temperatureStableSlopeMvPerS,
      mapping,
    ),
    temperatureAmbientToleranceMv: scaleLegacy423TemperatureDelta(
      value.temperatureAmbientToleranceMv,
      mapping,
    ),
  };
};

const upgradeLegacy423ParameterDraft = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    temperatureStableSlopeMvPerS: scaleLegacy423TemperatureDelta(
      value.temperatureStableSlopeMvPerS,
      mapping,
    ),
    temperatureAmbientToleranceMv: scaleLegacy423TemperatureDelta(
      value.temperatureAmbientToleranceMv,
      mapping,
    ),
  };
};

const isLegacy423ConfigSnapshot = (value: unknown) => {
  if (!isRecord(value) || value.version !== LEGACY_423_HEAT_CAPACITY_CONFIG_VERSION) return false;
  const environment = isRecord(value.environment) ? value.environment : null;
  const physics = isRecord(value.physics) ? value.physics : null;
  const thermal = physics && isRecord(physics.thermal) ? physics.thermal : null;
  const leakage = physics && isRecord(physics.leakage) ? physics.leakage : null;
  const sensor = isRecord(value.sensor) ? value.sensor : null;
  const record = isRecord(value.record) ? value.record : null;
  return Boolean(
    isLegacy423EnvironmentConfig(environment) &&
    physics &&
    hasFiniteFields(physics, [
      'gamma',
      'vesselVolumeL',
      'pumpAmountGainRatio',
      'pumpPressureLimitKPa',
      'pumpStrokeDurationS',
      'recommendedPumpIntervalS',
      'stopcockFlowRate',
      'releaseVisualResponseDelayS',
      'releaseVisualMainDurationS',
    ]) &&
    (physics.gamma as number) > 1 &&
    (physics.vesselVolumeL as number) > 0 &&
    isLegacy423FixedFreePhysicsConfig(physics) &&
    physics.pumpStrokeDurationS === LEGACY_423_FIXED_PUMP_STROKE_DURATION_S &&
    physics.recommendedPumpIntervalS === LEGACY_423_FIXED_RECOMMENDED_PUMP_INTERVAL_S &&
    physics.releaseVisualResponseDelayS === LEGACY_423_FIXED_RELEASE_VISUAL_RESPONSE_DELAY_S &&
    physics.releaseVisualMainDurationS === LEGACY_423_FIXED_RELEASE_VISUAL_MAIN_DURATION_S &&
    !hasOwn(physics, 'openingAnimationDurationMs') &&
    !hasOwn(physics, 'closingAnimationDurationMs') &&
    !hasOwn(physics, 'releaseApertureRampS') &&
    !hasOwn(physics, 'releaseOptimalMinS') &&
    !hasOwn(physics, 'releaseOptimalMaxS') &&
    !hasOwn(physics, 'autoDemoReleaseDurationS') &&
    isLegacy423ThermalConfig(thermal) &&
    leakage &&
    typeof leakage.enabled === 'boolean' &&
    isPersistenceFiniteNumber(leakage.ratePerS) &&
    isLegacy423SensorConfig(sensor) &&
    sensor.pumpLagRate === LEGACY_423_FIXED_PUMP_SENSOR_LAG_RATE &&
    sensor.fastProcessSampleStepS === LEGACY_423_FIXED_FAST_PROCESS_SAMPLE_STEP_S &&
    record &&
    hasFiniteFields(record, [
      'u0ZeroToleranceMv',
      'pressureStableSlopeMvPerS',
      'temperatureStableSlopeMvPerS',
      'temperatureAmbientToleranceMv',
      'minimumUsefulU1CorrectedMv',
      'overVentedMinimumU2CorrectedMv',
      'pressureWarningMv',
      'pressureDangerMv',
    ]) &&
    isRecord(value.scoring) &&
    value.scoring.processScoringVersion === 'free-process-score-v1'
  );
};

const upgradeLegacy423ConfigSnapshot = (value: unknown) => {
  if (value === null) return null;
  if (!isLegacy423ConfigSnapshot(value) || !isRecord(value)) {
    throw new Error('v4.2.3 heat-capacity config snapshot is invalid.');
  }
  const mapping = getLegacy423ConfigTemperatureSignalMapping(value);
  if (!mapping) throw new Error('v4.2.3 heat-capacity sensor mapping is invalid.');
  const upgraded = normalizeHeatCapacityFreeRestoreConfigSnapshot({
    ...value,
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    record: upgradeLegacy423TemperatureRecordConfig(value.record, mapping),
  });
  if (!upgraded) throw new Error('v4.2.3 heat-capacity config snapshot could not be upgraded.');
  return createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs({
    environmentConfig: upgraded.environment,
    physicsConfig: {
      ...upgraded.physics,
      environment: upgraded.environment,
    },
    sensorConfig: upgraded.sensor,
    recordConfig: upgraded.record,
    pressureWarningMv: upgraded.record.pressureWarningMv,
  });
};

const alignLegacy423ActiveConfigSnapshot = (
  value: unknown,
  physicsConfig: Record<string, unknown>,
) => {
  const upgraded = upgradeLegacy423ConfigSnapshot(value);
  if (upgraded === null) return null;
  return {
    ...upgraded,
    physics: {
      ...upgraded.physics,
      stopcockFlowRate: physicsConfig.stopcockFlowRate,
    },
  };
};

const upgradeLegacy423TemperatureRecord = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => value === null || !isRecord(value)
  ? value
  : {
      ...value,
      displayTemperatureMv: remapLegacy423TemperatureSignal(value.displayTemperatureMv, mapping),
    };

const upgradeLegacy423TrialBase = (
  value: Record<string, unknown>,
  mapping: TemperatureSignalMapping,
) => {
  const correctedSignals = isRecord(value.correctedSignals)
    ? {
        ...value.correctedSignals,
        u0Source: value.u0 === null ? 'assumed-zero' : 'recorded',
        formulaGamma: value.correctedSignals.gamma,
        preheatBiasGamma: 0,
      }
    : value.correctedSignals;
  return {
    ...value,
    configSnapshot: upgradeLegacy423ConfigSnapshot(value.configSnapshot),
    standardReferenceSnapshot: null,
    preheatOutcome: 'completed',
    automaticU0: upgradeLegacy423TemperatureRecord(value.automaticU0, mapping),
    u0: upgradeLegacy423TemperatureRecord(value.u0, mapping),
    u1: upgradeLegacy423TemperatureRecord(value.u1, mapping),
    u2: upgradeLegacy423TemperatureRecord(value.u2, mapping),
    blockedReason: value.blockedReason === 'missing-u0'
      ? 'invalid-sequence'
      : value.blockedReason,
    correctedSignals,
  };
};

const upgradeLegacy423TraceSample = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => {
  if (!isRecord(value) || !isRecord(value.controls) || !isRecord(value.physical)) {
    throw new Error('v4.2.3 heat-capacity trace sample is invalid.');
  }
  const controls = value.controls;
  if (typeof controls.stopcockFlowOpen !== 'boolean') {
    throw new Error('v4.2.3 heat-capacity trace sample has no stopcock flow state.');
  }
  const { stopcockFlowOpen, ...retainedControls } = controls;
  const releaseStarted = value.physical.releaseStarted === true;
  const releasePhase = stopcockFlowOpen
    ? releaseStarted ? 'releasing' : 'open'
    : controls.stopcockOpen === true
      ? 'opening'
      : releaseStarted ? 'closedAfterRelease' : 'closed';
  return {
    ...value,
    sensor: isRecord(value.sensor)
      ? {
          ...value.sensor,
          displayTemperatureMv: remapLegacy423TemperatureSignal(
            value.sensor.displayTemperatureMv,
            mapping,
          ),
          temperatureSlopeMvPerS: scaleLegacy423TemperatureDelta(
            value.sensor.temperatureSlopeMvPerS,
            mapping,
          ),
        }
      : value.sensor,
    controls: {
      ...retainedControls,
      releaseFlowOpen: stopcockFlowOpen,
      releasePhase,
      releaseDurationS: isPersistenceFiniteNumber(value.physical.currentStopcockOpenDurationS)
        ? Math.max(0, value.physical.currentStopcockOpenDurationS)
        : 0,
    },
  };
};

const readLegacy423TraceEventTime = (value: unknown) => (
  isRecord(value) && isPersistenceFiniteNumber(value.atS) ? value.atS : 0
);

const readLegacy423TraceAttemptId = (...events: unknown[]) => {
  for (const event of events) {
    if (!isRecord(event) || !isRecord(event.payload)) continue;
    const attemptId = event.payload.attemptId;
    if (Number.isSafeInteger(attemptId) && (attemptId as number) > 0) {
      return attemptId as number;
    }
  }
  return 1;
};

interface UpgradedLegacy423TraceBranch {
  branch: Record<string, unknown>;
  eventIdMap: Map<string, string>;
}

const upgradeLegacy423TraceBranch = (
  branch: Record<string, unknown>,
  mapping: TemperatureSignalMapping,
): UpgradedLegacy423TraceBranch => {
  if (!Array.isArray(branch.samples) || !Array.isArray(branch.events)) {
    throw new Error('v4.2.3 heat-capacity trace branch is invalid.');
  }
  const samples: Record<string, unknown>[] = branch.samples.map((sample) => (
    upgradeLegacy423TraceSample(sample, mapping)
  ));
  const releaseSample = samples.find((sample) => (
    isRecord(sample.physical) && sample.physical.releaseStarted === true
  ));
  const existingEvents = branch.events.map((event) => {
    if (!isRecord(event)) throw new Error('v4.2.3 heat-capacity trace event is invalid.');
    return event.type === 'record-u1'
      ? {
          ...event,
          payload: {
            ...(isRecord(event.payload) ? event.payload : {}),
            hslMigrationProvenance: HEAT_CAPACITY_LEGACY_423_U1_ANCHOR_PROVENANCE,
          },
        }
      : event;
  });
  const hasReleaseStart = existingEvents.some((event) => event.type === 'release-start');
  let candidateEvents = existingEvents;

  if (
    !hasReleaseStart &&
    isRecord(releaseSample) &&
    typeof releaseSample.id === 'string' &&
    isPersistenceFiniteNumber(releaseSample.atS)
  ) {
    const releaseAtS = releaseSample.atS;
    const releaseOpenEvent = [...existingEvents].reverse().find((event) => (
      event.type === 'stopcock-open' && readLegacy423TraceEventTime(event) <= releaseAtS + 0.000001
    ));
    const releaseCloseEvent = existingEvents.find((event) => (
      event.type === 'stopcock-close' && readLegacy423TraceEventTime(event) >= releaseAtS - 0.000001
    ));
    const attemptId = readLegacy423TraceAttemptId(releaseOpenEvent, releaseCloseEvent);
    candidateEvents = existingEvents.map((event) => {
      if (event === releaseOpenEvent) {
        return {
          ...event,
          payload: {
            ...(isRecord(event.payload) ? event.payload : {}),
            attemptId,
            purpose: 'release',
          },
        };
      }
      if (event === releaseCloseEvent) {
        const closeCommandAtS = readLegacy423TraceEventTime(event);
        return {
          ...event,
          payload: {
            ...(isRecord(event.payload) ? event.payload : {}),
            attemptId,
            purpose: 'release',
            formedRelease: true,
            quickToggle: false,
            openingCompletedAtS: releaseAtS,
            closeCommandAtS,
            releaseDurationS: Math.max(0, closeCommandAtS - releaseAtS),
          },
        };
      }
      return event;
    });
    candidateEvents.push({
      id: 'event-migrated-release-start',
      index: 0,
      atS: releaseAtS,
      type: 'release-start',
      traceSampleId: releaseSample.id,
      payload: {
        migratedFrom: 'v4.2.3',
        attemptId,
        formedRelease: true,
        openingCompletedAtS: releaseAtS,
        releaseDurationS: 0,
      },
    });
  }

  const orderedEvents = candidateEvents
    .map((event, ordinal) => ({ event, ordinal }))
    .sort((left, right) => {
      const timeDifference = readLegacy423TraceEventTime(left.event) -
        readLegacy423TraceEventTime(right.event);
      if (Math.abs(timeDifference) > 0.000001) return timeDifference;
      const leftSynthesized = left.event.id === 'event-migrated-release-start';
      const rightSynthesized = right.event.id === 'event-migrated-release-start';
      if (leftSynthesized !== rightSynthesized) {
        const other = leftSynthesized ? right.event : left.event;
        const synthesizedAfterOther = other.type === 'stopcock-open';
        const synthesizedBeforeOther = other.type === 'stopcock-close' || other.type === 'record-u2';
        if (synthesizedAfterOther || synthesizedBeforeOther) {
          const comparison = synthesizedAfterOther ? 1 : -1;
          return leftSynthesized ? comparison : -comparison;
        }
      }
      return left.ordinal - right.ordinal;
    });
  const eventIdMap = new Map<string, string>();
  const events = orderedEvents.map(({ event }, index) => {
    const nextIndex = index + 1;
    const nextId = `event-${nextIndex}`;
    if (typeof event.id === 'string' && event.id !== 'event-migrated-release-start') {
      eventIdMap.set(event.id, nextId);
    }
    return { ...event, id: nextId, index: nextIndex };
  });
  return {
    branch: {
      ...branch,
      nextEventIndex: events.length + 1,
      samples,
      events,
    },
    eventIdMap,
  };
};

const upgradeLegacy423TraceStore = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.traceTrials)) {
    throw new Error('v4.2.3 heat-capacity trace store is invalid.');
  }
  return {
    ...value,
    traceTrials: value.traceTrials.map((trial) => {
      if (!isRecord(trial) || !Array.isArray(trial.branches)) {
        throw new Error('v4.2.3 heat-capacity trace trial is invalid.');
      }
      const mapping = getLegacy423ConfigTemperatureSignalMapping(trial.configSnapshot);
      if (!mapping) throw new Error('v4.2.3 trace sensor mapping is invalid.');
      const upgradedBranches = trial.branches.map((branch) => {
        if (!isRecord(branch)) {
          throw new Error('v4.2.3 heat-capacity trace branch is invalid.');
        }
        return upgradeLegacy423TraceBranch(branch, mapping);
      });
      const eventMapsByBranchId = new Map(upgradedBranches.map(({ branch, eventIdMap }) => (
        [branch.id, eventIdMap] as const
      )));
      return {
        ...trial,
        configSnapshot: upgradeLegacy423ConfigSnapshot(trial.configSnapshot),
        branches: upgradedBranches.map(({ branch }) => {
          const parentEventIdMap = typeof branch.parentBranchId === 'string'
            ? eventMapsByBranchId.get(branch.parentBranchId)
            : undefined;
          return {
            ...branch,
            createdByEventId: typeof branch.createdByEventId === 'string'
              ? parentEventIdMap?.get(branch.createdByEventId) ?? null
              : null,
          };
        }),
      };
    }),
  };
};

const normalizeUpgradedLegacy423TraceStore = (value: unknown) => {
  const normalized = normalizeHeatCapacityFreeRestoreTraceStore(
    value,
  );
  if (!isRecord(value) || !Array.isArray(value.traceTrials) ||
    normalized.traceTrials.length !== value.traceTrials.length) {
    throw new Error('v4.2.3 heat-capacity trace store could not be normalized.');
  }
  return normalized;
};

const synchronizeUpgradedLegacy423TraceCompletion = (
  traceStore: HeatCapacityFreeTraceStore,
  trialsValue: unknown,
): HeatCapacityFreeTraceStore => {
  if (!Array.isArray(trialsValue)) return traceStore;
  const completedTrialIds = new Set<string>();
  const completedTraceTrialIds = new Set<string>();
  const completedTrialIdByTraceTrialId = new Map<string, string>();
  trialsValue.forEach((trial) => {
    if (
      !isRecord(trial) ||
      !isPersistenceFiniteNumber(trial.completedAtMs) ||
      !isRecord(trial.standardReferenceSnapshot)
    ) return;
    if (typeof trial.id === 'string') completedTrialIds.add(trial.id);
    if (typeof trial.traceTrialId === 'string') {
      completedTraceTrialIds.add(trial.traceTrialId);
      if (typeof trial.id === 'string') {
        completedTrialIdByTraceTrialId.set(trial.traceTrialId, trial.id);
      }
    }
  });
  const traceTrials = traceStore.traceTrials.map((traceTrial) => {
    const linkedCompletedTrialId = completedTrialIdByTraceTrialId.get(traceTrial.id) ?? (
      traceTrial.linkedTrialId !== null && completedTrialIds.has(traceTrial.linkedTrialId)
        ? traceTrial.linkedTrialId
        : null
    );
    return linkedCompletedTrialId === null
      ? traceTrial
      : {
          ...traceTrial,
          linkedTrialId: linkedCompletedTrialId,
          status: 'completed' as const,
        };
  });
  return {
    ...traceStore,
    activeTraceTrialId: traceStore.activeTraceTrialId !== null &&
      completedTraceTrialIds.has(traceStore.activeTraceTrialId)
      ? null
      : traceStore.activeTraceTrialId,
    traceTrials,
  };
};

const LEGACY_423_STANDARD_REFERENCE_STAGE_IDS = new Set([
  'zero', 'fill', 'pump', 'stabilize', 'release', 'recover',
]);
const LEGACY_423_STANDARD_REFERENCE_RECORD_IDS = new Set(['u0', 'u1', 'u2']);
const LEGACY_423_STANDARD_REFERENCE_WINDOW_SOURCES = new Set([
  'standard-operation', 'actual-record', 'trace', 'automatic-u0',
]);

const isLegacy423StandardReferenceSummary = (value: unknown) => {
  if (!isRecord(value) || typeof value.feasible !== 'boolean' ||
    !isPersistenceFiniteNumber(value.seed) || !isNullableFinite(value.gamma) ||
    !isNullableFinite(value.relativeErrorPercent) || !isNullableFinite(value.targetPressureMv) ||
    !isNullableFinite(value.targetPressureDeltaKPa) || !isNullableFinite(value.releaseDurationS) ||
    !isNullableFinite(value.u1TimeS) || !isNullableFinite(value.u2TimeS) ||
    !isRecord(value.assumptions) || !isRecord(value.explanation)) return false;
  return value.assumptions.operationMode === 'standard-operation' &&
    value.assumptions.disturbancesPreserved === true &&
    value.assumptions.stageAligned === true &&
    typeof value.explanation.operation === 'string' &&
    typeof value.explanation.windows === 'string';
};

const isLegacy423StandardReferencePoint = (value: unknown) => (
  isRecord(value) && typeof value.sampleId === 'string' && value.sampleId.length > 0 &&
  typeof value.stageId === 'string' && LEGACY_423_STANDARD_REFERENCE_STAGE_IDS.has(value.stageId) &&
  hasFiniteFields(value, ['timeS', 'pressureDeltaKPa', 'temperatureDeltaK']) &&
  (value.timeS as number) >= 0
);

const isLegacy423StandardReferenceStage = (value: unknown) => (
  isRecord(value) && typeof value.id === 'string' &&
  LEGACY_423_STANDARD_REFERENCE_STAGE_IDS.has(value.id) &&
  typeof value.label === 'string' && hasFiniteFields(value, ['startS', 'endS']) &&
  (value.startS as number) >= 0 && (value.endS as number) >= (value.startS as number) &&
  (value.countText === undefined || typeof value.countText === 'string') &&
  (value.durationText === undefined || typeof value.durationText === 'string')
);

const isLegacy423StandardReferenceWindow = (value: unknown) => (
  isRecord(value) && typeof value.recordId === 'string' &&
  LEGACY_423_STANDARD_REFERENCE_RECORD_IDS.has(value.recordId) &&
  hasFiniteFields(value, ['startS', 'endS', 'qualityScore']) &&
  (value.startS as number) >= 0 && (value.endS as number) >= (value.startS as number) &&
  (value.recommendedSampleId === null ||
    (typeof value.recommendedSampleId === 'string' && value.recommendedSampleId.length > 0)) &&
  isNullableFinite(value.recommendedTimeS) && isNullableFinite(value.displayPressureMv) &&
  isNullableFinite(value.displayTemperatureMv) && isNullableFinite(value.pressureDeltaKPa) &&
  isNullableFinite(value.temperatureDeltaK) && typeof value.source === 'string' &&
  LEGACY_423_STANDARD_REFERENCE_WINDOW_SOURCES.has(value.source) && typeof value.reason === 'string'
);

const isLegacy423StandardReferenceUpperBound = (value: unknown) => (
  isRecord(value) && isNullableFinite(value.gamma) &&
  isNullableFinite(value.relativeErrorPercent) && isNullableFinite(value.gapFromActualPercent) &&
  Array.isArray(value.windows) && value.windows.length > 0 &&
  value.windows.every(isLegacy423StandardReferenceWindow)
);

const isLegacy423StandardOperationPreset = (value: unknown) => (
  isRecord(value) && hasFiniteFields(value, [
    'pumpStrokes', 'pumpTotalDurationS', 'waitAfterPumpS', 'openDurationS', 'waitAfterReleaseS',
  ]) && value.pumpStrokes === 18 && value.pumpTotalDurationS === 12 &&
  value.waitAfterPumpS === 300 && value.openDurationS === 0.35 &&
  value.waitAfterReleaseS === 300
);

const readLegacy423StandardReferenceRootSummary = (value: Record<string, unknown>) => ({
  feasible: value.feasible,
  seed: value.seed,
  gamma: value.gamma,
  relativeErrorPercent: value.relativeErrorPercent,
  targetPressureMv: value.targetPressureMv,
  targetPressureDeltaKPa: value.targetPressureDeltaKPa,
  releaseDurationS: value.releaseDurationS,
  u1TimeS: value.u1TimeS,
  u2TimeS: value.u2TimeS,
  assumptions: value.assumptions,
  explanation: value.explanation,
});

const isLegacy423StandardReferenceSnapshot = (value: unknown) => {
  if (!isRecord(value) || value.generatorVersion !== 'free-standard-reference-v1' ||
    !isLegacy423StandardOperationPreset(value.operationPreset) ||
    !isLegacy423ConfigSnapshot(value.configSnapshot) ||
    !Array.isArray(value.trace) || value.trace.length === 0 ||
    !value.trace.every(isLegacy423StandardReferencePoint) ||
    !Array.isArray(value.stages) || value.stages.length === 0 ||
    !value.stages.every(isLegacy423StandardReferenceStage) ||
    !Array.isArray(value.recordWindows) || value.recordWindows.length === 0 ||
    !value.recordWindows.every(isLegacy423StandardReferenceWindow) ||
    !isLegacy423StandardReferenceSummary(value) ||
    !isLegacy423StandardReferenceSummary(value.summary) ||
    !isLegacy423StandardReferenceUpperBound(value.operationUpperBound)) return false;
  const sampleIds = new Set(value.trace.map((point) => (point as Record<string, unknown>).sampleId));
  const stageIds = value.stages.map((stage) => (stage as Record<string, unknown>).id);
  const recordIds = value.recordWindows.map((window) => (window as Record<string, unknown>).recordId);
  const referenceRelationshipsValid = value.recordWindows.every((windowValue) => {
    const window = windowValue as Record<string, unknown>;
    if (window.recommendedSampleId === null) return true;
    if (window.source === 'trace') return sampleIds.has(window.recommendedSampleId);
    if (window.source === 'standard-operation') {
      return window.recommendedSampleId === `standard-${window.recordId}`;
    }
    return true;
  });
  return referenceRelationshipsValid &&
    sampleIds.size === value.trace.length &&
    new Set(stageIds).size === stageIds.length &&
    new Set(recordIds).size === recordIds.length &&
    recordIds.length === 3 &&
    ['u0', 'u1', 'u2'].every((recordId) => recordIds.includes(recordId)) &&
    value.trace.every((point) => stageIds.includes((point as Record<string, unknown>).stageId)) &&
    areCanonicalPersistenceValuesEqual(
      readLegacy423StandardReferenceRootSummary(value),
      value.summary,
    ) &&
    areCanonicalPersistenceValuesEqual(
      (value.operationUpperBound as Record<string, unknown>).windows,
      value.recordWindows,
    ) &&
    (value.summary as Record<string, unknown>).releaseDurationS ===
      (value.operationPreset as Record<string, unknown>).openDurationS;
};

const alignLegacy423TrialRecordsWithTrace = (
  value: Record<string, unknown>,
  traceStore: HeatCapacityFreeTraceStore,
) => {
  const traceTrial = traceStore.traceTrials.find((candidate) => (
    candidate.id === value.traceTrialId || candidate.linkedTrialId === value.id
  ));
  if (!traceTrial) return value;
  const alignRecord = (recordValue: unknown, expectedEventType: string) => {
    if (!isRecord(recordValue)) return recordValue;
    const branch = traceTrial.branches.find((candidate) => candidate.id === recordValue.traceBranchId);
    const sample = branch?.samples.find((candidate) => candidate.id === recordValue.traceSampleId);
    const eventById = branch?.events.find((candidate) => candidate.id === recordValue.eventId);
    const event = eventById?.type === expectedEventType && eventById.traceSampleId === sample?.id
      ? eventById
      : branch?.events.find((candidate) => (
        candidate.type === expectedEventType && candidate.traceSampleId === sample?.id
      ));
    if (
      !branch || !sample || !event ||
      event.type !== expectedEventType ||
      event.traceSampleId !== sample.id ||
      !isPersistenceFiniteNumber(sample.atS) ||
      !isPersistenceFiniteNumber(sample.sensor.displayPressureMv) ||
      !isPersistenceFiniteNumber(sample.sensor.displayTemperatureMv) ||
      !Number.isSafeInteger(sample.calibration.calibrationVersion) ||
      typeof sample.calibration.zeroEventId !== 'string'
    ) return recordValue;
    return {
      ...recordValue,
      atS: sample.atS,
      displayPressureMv: sample.sensor.displayPressureMv,
      displayTemperatureMv: sample.sensor.displayTemperatureMv,
      calibrationVersion: sample.calibration.calibrationVersion,
      zeroEventId: sample.calibration.zeroEventId,
      source: 'user',
      phaseAtRecord: sample.phase,
      traceTrialId: traceTrial.id,
      traceBranchId: branch.id,
      traceSampleId: sample.id,
      eventId: event.id,
    };
  };
  return {
    ...value,
    traceTrialId: traceTrial.id,
    branchCount: traceTrial.branches.length,
    u0: alignRecord(value.u0, 'record-u0'),
    u1: alignRecord(value.u1, 'record-u1'),
    u2: alignRecord(value.u2, 'record-u2'),
  };
};

const upgradeLegacy423Trials = (
  value: unknown,
  upgradedTraceStore: unknown,
  fallbackMapping: TemperatureSignalMapping,
  theoreticalGamma: number,
) => {
  if (!Array.isArray(value)) throw new Error('v4.2.3 heat-capacity trials are invalid.');
  const traceStore = normalizeUpgradedLegacy423TraceStore(upgradedTraceStore);
  return value.map((trialValue) => {
    if (!isRecord(trialValue)) throw new Error('v4.2.3 heat-capacity trial is invalid.');
    const mapping = getLegacy423ConfigTemperatureSignalMapping(trialValue.configSnapshot) ??
      fallbackMapping;
    const upgradedBase = alignLegacy423TrialRecordsWithTrace(
      upgradeLegacy423TrialBase(trialValue, mapping),
      traceStore,
    );
    const normalizedTrial = normalizeHeatCapacityFreeRestoreTrial(upgradedBase);
    if (!normalizedTrial) throw new Error('v4.2.3 heat-capacity trial could not be normalized.');
    if (trialValue.standardReferenceSnapshot === null || trialValue.standardReferenceSnapshot === undefined) {
      return normalizedTrial;
    }
    if (!isLegacy423StandardReferenceSnapshot(trialValue.standardReferenceSnapshot)) {
      throw new Error('v4.2.3 standard reference is invalid.');
    }
    const traceTrial = traceStore.traceTrials.find((trial) => (
      trial.id === normalizedTrial.traceTrialId || trial.linkedTrialId === normalizedTrial.id
    ));
    if (!traceTrial) throw new Error('v4.2.3 standard reference has no linked trace trial.');
    return {
      ...normalizedTrial,
      completedAtMs: isPersistenceFiniteNumber(trialValue.completedAtMs)
        ? trialValue.completedAtMs
        : normalizedTrial.completedAtMs,
      standardReferenceSnapshot: createHeatCapacityFreeStandardReference({
        traceTrial,
        trial: normalizedTrial,
        theoreticalGamma,
      }),
    };
  });
};

const upgradeLegacy423PhysicsConfig = (value: unknown) => {
  if (!isLegacy423PhysicsConfig(value) || !isRecord(value)) {
    throw new Error('v4.2.3 heat-capacity physics config is invalid.');
  }
  const current = createDefaultHeatCapacityFile(1).heatCapacityFreePhysicsConfig;
  return {
    ...value,
    vesselVolumeL: current.vesselVolumeL,
    pumpAmountGainRatio: current.pumpAmountGainRatio,
    pumpWorkRetention: current.pumpWorkRetention,
    stopcockFlowRate: current.stopcockFlowRate,
  };
};

const upgradeLegacy423GuidePhysicsConfig = (value: unknown) => {
  if (!isLegacy423GuidePhysicsConfig(value) || !isRecord(value)) {
    throw new Error('v4.2.3 Guide physics config is invalid.');
  }
  const current = createDefaultHeatCapacityGuidePhysicsConfig();
  return {
    ...current,
    environment: value.environment,
  };
};

const upgradeLegacy423ThermodynamicPhysicsState = (
  value: unknown,
  config: Record<string, unknown>,
  includeEnvironment: boolean,
) => {
  if (!isLegacy423PhysicsState(value, includeEnvironment) || !isRecord(value) ||
    !isLegacy423EnvironmentConfig(config.environment) || !isRecord(config.environment) ||
    !isPersistenceFiniteNumber(config.vesselVolumeL) ||
    !isPersistenceFiniteNumber(config.gamma)) {
    throw new Error('v4.2.3 heat-capacity physics state is invalid.');
  }
  const environment = config.environment as Record<string, unknown>;
  const ambientPressureKPa = environment.ambientPressureKPa as number;
  const ambientTemperatureK = environment.ambientTemperatureK as number;
  const vesselVolumeL = config.vesselVolumeL as number;
  const gamma = config.gamma as number;
  const gasAmountRatio = value.gasAmountRatio as number;
  const gasTemperatureK = value.gasTemperatureK as number;
  const wallTemperatureK = value.wallTemperatureK as number;
  const referenceAmountMol = calculateHeatCapacityIdealGasAmountMol({
    ambientPressureKPa,
    ambientTemperatureK,
    vesselVolumeL,
  });
  const thermodynamic = createHeatCapacityThermodynamicStateFromTemperature({
    amountMol: referenceAmountMol * gasAmountRatio,
    gasTemperatureK,
    wallTemperatureK,
    gammaTrue: gamma,
  });
  const releaseStarted = value.releaseStarted === true;
  const legacyReleaseReference = isRecord(value.releaseReference)
    ? value.releaseReference
    : null;
  const openedAtS = isPersistenceFiniteNumber(value.lastStopcockOpenedAtS)
    ? Math.min(value.simulationTimeS as number, Math.max(0, value.lastStopcockOpenedAtS as number))
    : value.simulationTimeS as number;
  const estimatedReleasePressureKPa = ambientPressureKPa * gasAmountRatio *
    gasTemperatureK / ambientTemperatureK;
  const pressureBeforeKPa = isPersistenceFiniteNumber(value.maxPressureKPa)
    ? Math.max(ambientPressureKPa, value.maxPressureKPa as number)
    : Math.max(ambientPressureKPa, estimatedReleasePressureKPa);
  const releaseReference = releaseStarted
    ? legacyReleaseReference ?? {
        pressureBeforeKPa,
        temperatureBeforeK: gasTemperatureK,
        amountBeforeRatio: gasAmountRatio,
        openedAtS,
        reachedAmbientAtS: null,
      }
    : null;
  return {
    ...value,
    amountMol: thermodynamic.amountMol,
    internalEnergyJ: thermodynamic.internalEnergyJ,
    referenceAmountMol,
    releaseReference,
  };
};

const alignLegacy423StopcockTiming = (
  value: Record<string, unknown>,
  stopcockFlowOpen: boolean,
) => {
  const simulationTimeS = value.simulationTimeS;
  const lastStopcockOpenedAtS = value.lastStopcockOpenedAtS;
  if (!isPersistenceFiniteNumber(simulationTimeS)) return value;
  return {
    ...value,
    lastStopcockClosedAtS: stopcockFlowOpen ? null : value.lastStopcockClosedAtS,
    currentStopcockOpenDurationS: stopcockFlowOpen &&
      isPersistenceFiniteNumber(lastStopcockOpenedAtS)
      ? Math.max(0, simulationTimeS - lastStopcockOpenedAtS)
      : 0,
  };
};

const upgradeLegacy423SensorConfig = (value: unknown) => {
  if (!isLegacy423SensorConfig(value) || !isRecord(value)) {
    throw new Error('v4.2.3 heat-capacity sensor config is invalid.');
  }
  return {
    ...value,
    temperatureMvAtAmbient: CURRENT_TEMPERATURE_SIGNAL_MAPPING.baseMv,
    temperatureMvPerK: CURRENT_TEMPERATURE_SIGNAL_MAPPING.sensitivityMvPerK,
  };
};

const upgradeLegacy423SensorState = (
  value: unknown,
  mapping: TemperatureSignalMapping,
  ambientTemperatureK: number,
) => {
  if (!isLegacy423SensorState(value) || !isRecord(value)) {
    throw new Error('v4.2.3 heat-capacity sensor state is invalid.');
  }
  const displayTemperatureMv = value.displayTemperatureMv as number;
  const temperatureSlopeMvPerS = value.temperatureSlopeMvPerS as number;
  const temperatureHistory = value.temperatureHistory as unknown[];
  const sensorTemperatureK = ambientTemperatureK +
    (displayTemperatureMv - mapping.baseMv) / mapping.sensitivityMvPerK;
  return {
    ...value,
    displayTemperatureMv: remapLegacy423TemperatureSignal(displayTemperatureMv, mapping),
    sensorTemperatureK,
    temperatureSlopeMvPerS: scaleLegacy423TemperatureDelta(
      temperatureSlopeMvPerS,
      mapping,
    ),
    temperatureHistory: temperatureHistory.map((sample) => (
      isRecord(sample)
        ? {
            ...sample,
            valueMv: remapLegacy423TemperatureSignal(sample.valueMv, mapping),
          }
        : sample
    )),
  };
};

const upgradeLegacy423CalibrationState = (
  value: unknown,
  mapping: TemperatureSignalMapping,
) => {
  if (!isLegacy423CalibrationState(value) || !isRecord(value) || !Array.isArray(value.zeroEvents)) {
    throw new Error('v4.2.3 heat-capacity calibration state is invalid.');
  }
  return {
    ...value,
    zeroEvents: value.zeroEvents.map((event) => (
      isRecord(event)
        ? {
            ...event,
            displayTemperatureMv: remapLegacy423TemperatureSignal(
              event.displayTemperatureMv,
              mapping,
            ),
          }
        : event
    )),
    automaticU0: upgradeLegacy423TemperatureRecord(value.automaticU0, mapping),
  };
};

const upgradeLegacy423RollbackSnapshot = (
  value: unknown,
  physicsConfig: Record<string, unknown>,
  mapping: TemperatureSignalMapping,
) => {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('v4.2.3 rollback snapshot is invalid.');
  const {
    heatCapacityFreeStopcockFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs,
    heatCapacityFreeStopcockFlowPurpose,
    ...retained
  } = value;
  const controls = {
    stopcockOpen: heatCapacityFreeStopcockFlowOpen === true ||
      heatCapacityFreeStopcockPendingOpenAtMs !== null ||
      (isPersistenceFiniteNumber(value.stopcockAngleDeg) && value.stopcockAngleDeg > 0),
    stopcockFlowOpen: heatCapacityFreeStopcockFlowOpen,
    stopcockFlowPurpose: heatCapacityFreeStopcockFlowPurpose,
  };
  return {
    ...retained,
    temperatureSignalMv: remapLegacy423TemperatureSignal(value.temperatureSignalMv, mapping),
    temperatureSignalTargetMv: remapLegacy423TemperatureSignal(
      value.temperatureSignalTargetMv,
      mapping,
    ),
    heatCapacityFreePhysicsState: upgradeLegacy423ThermodynamicPhysicsState(
      value.heatCapacityFreePhysicsState,
      physicsConfig,
      true,
    ),
    heatCapacityFreeSensorState: upgradeLegacy423SensorState(
      value.heatCapacityFreeSensorState,
      mapping,
      (physicsConfig.environment as Record<string, unknown>).ambientTemperatureK as number,
    ),
    heatCapacityFreeCalibrationState: upgradeLegacy423CalibrationState(
      value.heatCapacityFreeCalibrationState,
      mapping,
    ),
    heatCapacityReleaseState: createLegacy423ReleaseState(value, controls),
  };
};

const upgradeLegacy423RollbackSnapshots = (
  value: unknown,
  physicsConfig: Record<string, unknown>,
  mapping: TemperatureSignalMapping,
) => {
  if (!isRecord(value)) throw new Error('v4.2.3 rollback snapshots are invalid.');
  const upgradedPhysicsConfig = physicsConfig as unknown as HeatCapacityFreePhysicsConfig;
  const retainReachableSnapshot = (snapshotValue: unknown) => {
    const upgraded = upgradeLegacy423RollbackSnapshot(snapshotValue, physicsConfig, mapping);
    return upgraded !== null && isHeatCapacityFreeRollbackSnapshotSemanticallyValid(
      upgraded as unknown as WorkbenchHeatCapacityState['heatCapacityFreeRollbackSnapshots']['afterPowerOn'],
      upgradedPhysicsConfig,
    )
      ? upgraded
      : null;
  };
  return {
    afterPowerOn: retainReachableSnapshot(value.afterPowerOn),
    beforePump: retainReachableSnapshot(value.beforePump),
    beforeRelease: retainReachableSnapshot(value.beforeRelease),
  };
};

const upgradeLegacy423UiReplay = (
  value: unknown,
  mapping: TemperatureSignalMapping,
  sensorState: Record<string, unknown>,
) => {
  if (!isRecord(value)) throw new Error('v4.2.3 heat-capacity UI replay is invalid.');
  const {
    pressureReleaseBurstUntilMs: _pressureReleaseBurstUntilMs,
    heatCapacityFreeStopcockPendingOpenAtMs: _stopcockPendingOpenAtMs,
    heatCapacityFreeEquilibriumSpeedHintShown: _equilibriumSpeedHintShown,
    ...retained
  } = value;
  void _pressureReleaseBurstUntilMs;
  void _stopcockPendingOpenAtMs;
  void _equilibriumSpeedHintShown;
  const processSamples = isRecord(value.heatCapacityProcessSamples)
    ? Object.fromEntries(Object.entries(value.heatCapacityProcessSamples).map(([key, sample]) => [
        key,
        isRecord(sample)
          ? {
              ...sample,
              temperatureSignalMv: remapLegacy423TemperatureSignal(
                sample.temperatureSignalMv,
                mapping,
              ),
            }
          : sample,
      ]))
    : value.heatCapacityProcessSamples;
  return {
    ...retained,
    pressureSignalMvRaw: isPersistenceFiniteNumber(value.pressureSignalRawReadoutMv)
      ? value.pressureSignalRawReadoutMv
      : sensorState.displayPressureMv,
    pressureSignalMvDisplayed: isPersistenceFiniteNumber(value.pressureSignalReadoutMv)
      ? value.pressureSignalReadoutMv
      : sensorState.displayPressureMv,
    temperatureSignalTargetMv: remapLegacy423TemperatureSignal(
      value.temperatureSignalTargetMv,
      mapping,
    ),
    temperatureSignalMv: remapLegacy423TemperatureSignal(value.temperatureSignalMv, mapping),
    temperatureDisplayJitterOffset: scaleLegacy423TemperatureDelta(
      value.temperatureDisplayJitterOffset,
      mapping,
    ),
    heatCapacityProcessSamples: processSamples,
  };
};

const upgradeLegacy423GuideTrial = (value: unknown) => {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('v4.2.3 Guide trial is invalid.');
  return {
    ...value,
    u0: upgradeLegacy423TemperatureRecord(value.u0, LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING),
    u1: upgradeLegacy423TemperatureRecord(value.u1, LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING),
    u2: upgradeLegacy423TemperatureRecord(value.u2, LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING),
  };
};

const LEGACY_423_GUIDE_STEP_ORDER = [
  'powerRequired',
  'preheatRequired',
  'openStopcockForZeroRequired',
  'zeroRequired',
  'recordU0Required',
  'closeStopcockBeforePumpRequired',
  'openPumpValveRequired',
  'pumpRequired',
  'closePumpValveRequired',
  'u1Waiting',
  'recordU1Required',
  'openStopcockForReleaseRequired',
  'closeStopcockAfterReleaseRequired',
  'u2Waiting',
  'recordU2Required',
  'closePowerRequired',
  'completed',
] as const;

const reconcileLegacy423GuideWorkflow = (
  workflowValue: unknown,
  trialValue: unknown,
) => {
  if (!isRecord(workflowValue)) throw new Error('v4.2.3 Guide workflow is invalid.');
  const trial = isRecord(trialValue) ? trialValue : null;
  const recordCount = trial?.u2 !== null && trial?.u2 !== undefined
    ? 3
    : trial?.u1 !== null && trial?.u1 !== undefined
      ? 2
      : trial?.u0 !== null && trial?.u0 !== undefined
        ? 1
        : 0;
  const currentStep = typeof workflowValue.step === 'string'
    ? workflowValue.step
    : 'powerRequired';
  const currentIndex = LEGACY_423_GUIDE_STEP_ORDER.indexOf(
    currentStep as typeof LEGACY_423_GUIDE_STEP_ORDER[number],
  );
  const minimumIndex = recordCount === 0
    ? 0
    : recordCount === 1
      ? LEGACY_423_GUIDE_STEP_ORDER.indexOf('closeStopcockBeforePumpRequired')
      : recordCount === 2
        ? LEGACY_423_GUIDE_STEP_ORDER.indexOf('openStopcockForReleaseRequired')
        : LEGACY_423_GUIDE_STEP_ORDER.indexOf('closePowerRequired');
  const maximumIndex = recordCount === 0
    ? LEGACY_423_GUIDE_STEP_ORDER.indexOf('recordU0Required')
    : recordCount === 1
      ? LEGACY_423_GUIDE_STEP_ORDER.indexOf('recordU1Required')
      : recordCount === 2
        ? LEGACY_423_GUIDE_STEP_ORDER.indexOf('recordU2Required')
        : LEGACY_423_GUIDE_STEP_ORDER.indexOf('completed');
  const step = currentIndex >= minimumIndex && currentIndex <= maximumIndex
    ? LEGACY_423_GUIDE_STEP_ORDER[currentIndex]
    : LEGACY_423_GUIDE_STEP_ORDER[minimumIndex];
  const waitStage = step === 'u1Waiting' || step === 'recordU1Required'
    ? 'u1'
    : step === 'u2Waiting' || step === 'recordU2Required'
      ? 'u2'
      : null;
  const fallbackWaitAtS = waitStage === 'u2'
    ? isRecord(trial?.u1) && isPersistenceFiniteNumber(trial.u1.atS) ? trial.u1.atS : 0
    : waitStage === 'u1'
      ? isRecord(trial?.u0) && isPersistenceFiniteNumber(trial.u0.atS) ? trial.u0.atS : 0
      : null;
  const reminderTarget = step === 'recordU1Required'
    ? 'recordU1'
    : step === 'recordU2Required'
      ? 'recordU2'
      : step === 'closePowerRequired'
        ? 'powerSwitch'
        : null;
  return {
    ...workflowValue,
    step,
    paused: step === 'recordU1Required' ||
      step === 'closeStopcockAfterReleaseRequired' ||
      step === 'recordU2Required' ||
      step === 'closePowerRequired',
    waitStartedAtS: waitStage === null
      ? null
      : isPersistenceFiniteNumber(workflowValue.waitStartedAtS)
        ? Math.max(0, workflowValue.waitStartedAtS)
        : fallbackWaitAtS,
    waitStage,
    strongReminderActive: reminderTarget !== null,
    strongReminderTargetControlId: reminderTarget,
    releaseCloseResumeAtMs: null,
  };
};

const createLegacy423ReleaseState = (
  runtimeSource: Record<string, unknown>,
  controls: Record<string, unknown>,
): HeatCapacityReleaseState => {
  const runtime = isRecord(runtimeSource.runtime)
    ? runtimeSource.runtime
    : isRecord(runtimeSource.physicsState)
      ? runtimeSource.physicsState
      : isRecord(runtimeSource.heatCapacityFreePhysicsState)
        ? runtimeSource.heatCapacityFreePhysicsState
        : null;
  const atS = runtime && isPersistenceFiniteNumber(runtime.simulationTimeS)
    ? Math.max(0, runtime.simulationTimeS)
    : 0;
  const flowOpen = controls.stopcockFlowOpen === true;
  const visualOpen = controls.stopcockOpen === true;
  const releaseReference = runtime && isRecord(runtime.releaseReference)
    ? runtime.releaseReference
    : null;
  const releaseStarted = runtime?.releaseStarted === true || releaseReference !== null;
  const activePurpose = controls.stopcockFlowPurpose === 'release' || releaseStarted
    ? 'release'
    : controls.stopcockFlowPurpose === 'zeroing' || visualOpen
      ? 'zeroing'
      : 'none';
  const phase = flowOpen
    ? activePurpose === 'release' ? 'releasing' : 'open'
    : visualOpen
      ? 'opening'
      : releaseStarted ? 'closedAfterRelease' : 'closed';
  const lastOpenedAtS = runtime && isPersistenceFiniteNumber(runtime.lastStopcockOpenedAtS)
    ? Math.max(0, runtime.lastStopcockOpenedAtS)
    : releaseReference && isPersistenceFiniteNumber(releaseReference.openedAtS)
      ? Math.max(0, releaseReference.openedAtS)
      : null;
  const lastClosedAtS = runtime && isPersistenceFiniteNumber(runtime.lastStopcockClosedAtS)
    ? Math.max(0, runtime.lastStopcockClosedAtS)
    : null;
  const currentOpenDurationS = runtime && isPersistenceFiniteNumber(runtime.currentStopcockOpenDurationS)
    ? Math.max(0, runtime.currentStopcockOpenDurationS)
    : 0;
  const releaseDurationS = flowOpen
    ? currentOpenDurationS
    : releaseStarted && lastOpenedAtS !== null && lastClosedAtS !== null
      ? Math.max(0, lastClosedAtS - lastOpenedAtS)
      : currentOpenDurationS;
  const inferredOpeningCompletedAtS = phase === 'open' || phase === 'releasing' || phase === 'closedAfterRelease'
    ? lastOpenedAtS ?? Math.max(0, (lastClosedAtS ?? atS) - releaseDurationS)
    : null;
  const inferredOpeningStartedAtS = phase === 'opening'
    ? lastOpenedAtS ?? atS
    : inferredOpeningCompletedAtS;
  const purpose = phase === 'closed'
    ? 'none'
    : phase === 'closedAfterRelease'
      ? 'release'
      : activePurpose;
  const formedRelease = phase === 'releasing' || phase === 'closedAfterRelease';
  return {
    phase,
    purpose,
    attemptId: phase === 'closed' ? 0 : 1,
    phaseStartedAtS: phase === 'opening'
      ? inferredOpeningStartedAtS ?? atS
      : phase === 'open' || phase === 'releasing'
        ? inferredOpeningCompletedAtS ?? atS
        : phase === 'closedAfterRelease' && lastClosedAtS !== null
          ? lastClosedAtS
          : atS,
    openingStartedAtS: inferredOpeningStartedAtS,
    openingCompletedAtS: inferredOpeningCompletedAtS,
    closeCommandAtS: phase === 'closedAfterRelease' ? lastClosedAtS : null,
    closingCompletedAtS: phase === 'closedAfterRelease' ? lastClosedAtS : null,
    releaseDurationS: formedRelease ? releaseDurationS : 0,
    formedRelease,
    quickToggle: false,
  };
};

const upgradeLegacy423Domain = (value: unknown) => {
  if (!isRecord(value)) throw new Error('v4.2.3 heat-capacity domain is invalid.');
  const {
    stopcockFlowOpen,
    stopcockPendingOpenAtMs,
    stopcockFlowPurpose,
    ...retained
  } = value;
  const physicsConfig = upgradeLegacy423PhysicsConfig(value.physicsConfig) as Record<string, unknown>;
  const sensorMapping = readLegacy423TemperatureSignalMapping(value.sensorConfig);
  const sensorConfig = upgradeLegacy423SensorConfig(value.sensorConfig);
  const recordConfig = upgradeLegacy423TemperatureRecordConfig(value.recordConfig, sensorMapping);
  const ambientTemperatureK = (physicsConfig.environment as Record<string, unknown>)
    .ambientTemperatureK as number;
  const traceStore = normalizeUpgradedLegacy423TraceStore(
    upgradeLegacy423TraceStore(value.traceStore),
  );
  const gasType = value.gasType === 'helium' ? 'helium' : 'air';
  const controls = {
    stopcockOpen: stopcockFlowOpen === true || stopcockPendingOpenAtMs !== null,
    stopcockFlowOpen,
    stopcockFlowPurpose,
  };
  const physicsState = alignLegacy423StopcockTiming(
    upgradeLegacy423ThermodynamicPhysicsState(value.physicsState, physicsConfig, true),
    stopcockFlowOpen === true,
  );
  const traceStoreWithCompletion = synchronizeUpgradedLegacy423TraceCompletion(
    traceStore,
    value.trials,
  );
  const trials = upgradeLegacy423Trials(
    value.trials,
    traceStoreWithCompletion,
    sensorMapping,
    getHeatCapacityFreeGasTypeGamma(gasType),
  );
  const synchronizedTraceStore = synchronizeUpgradedLegacy423TraceCompletion(
    traceStoreWithCompletion,
    trials,
  );
  return {
    ...retained,
    activeRunConfigSnapshot: alignLegacy423ActiveConfigSnapshot(
      value.activeRunConfigSnapshot,
      physicsConfig,
    ),
    recordConfig,
    physicsConfig,
    physicsState,
    sensorConfig,
    sensorState: upgradeLegacy423SensorState(
      value.sensorState,
      sensorMapping,
      ambientTemperatureK,
    ),
    calibrationState: upgradeLegacy423CalibrationState(value.calibrationState, sensorMapping),
    rollbackSnapshots: upgradeLegacy423RollbackSnapshots(
      value.rollbackSnapshots,
      physicsConfig,
      sensorMapping,
    ),
    traceStore: synchronizedTraceStore,
    trials,
    activeAttempt: null,
    releaseState: createLegacy423ReleaseState(value, controls),
  };
};

const upgradeLegacy423HeatCapacityPayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const common = payload.common as Record<string, unknown>;
  const free = payload.free as Record<string, unknown>;
  const controls = free.controls as Record<string, unknown>;
  const guided = isRecord(payload.guided) ? payload.guided : null;
  const legacyConfig = free.config as Record<string, unknown>;
  const legacyConfigPhysics = legacyConfig.physics as Record<string, unknown>;
  const legacyConfigEnvironment = legacyConfig.environment as Record<string, unknown>;
  const topPhysicsConfig = {
    ...legacyConfigPhysics,
    environment: legacyConfigEnvironment,
  };
  const upgradedTopPhysicsConfig = upgradeLegacy423PhysicsConfig(
    topPhysicsConfig,
  ) as Record<string, unknown>;
  const topSensorMapping = getLegacy423ConfigTemperatureSignalMapping(legacyConfig);
  if (!topSensorMapping) throw new Error('v4.2.3 top-level sensor mapping is invalid.');
  const uiReplaySensorMapping = payload.mode === 'free'
    ? topSensorMapping
    : LEGACY_423_GUIDE_TEMPERATURE_SIGNAL_MAPPING;
  const upgradedConfig = upgradeLegacy423ConfigSnapshot(legacyConfig);
  const topTraceStore = normalizeUpgradedLegacy423TraceStore(
    upgradeLegacy423TraceStore(free.traceStore),
  );
  const topTraceStoreWithCompletion = synchronizeUpgradedLegacy423TraceCompletion(
    topTraceStore,
    free.trials,
  );
  const topTrials = upgradeLegacy423Trials(
    free.trials,
    topTraceStoreWithCompletion,
    topSensorMapping,
    getHeatCapacityFreeGasTypeGamma(free.gasType === 'helium' ? 'helium' : 'air'),
  );
  const synchronizedTopTraceStore = synchronizeUpgradedLegacy423TraceCompletion(
    topTraceStoreWithCompletion,
    topTrials,
  );
  const topSensorState = upgradeLegacy423SensorState(
    free.sensor,
    topSensorMapping,
    legacyConfigEnvironment.ambientTemperatureK as number,
  );
  const topRecordConfig = upgradeLegacy423TemperatureRecordConfig(
    free.recordConfig,
    topSensorMapping,
  );
  const {
    stopcockFlowOpen,
    stopcockFlowPurpose,
    ...retainedControls
  } = controls;
  const topRuntime = alignLegacy423StopcockTiming(
    upgradeLegacy423ThermodynamicPhysicsState(
      free.runtime,
      upgradedTopPhysicsConfig,
      true,
    ),
    stopcockFlowOpen === true,
  );
  const upgradedGuide = guided
    ? (() => {
        const guidePhysicsConfig = upgradeLegacy423GuidePhysicsConfig(guided.physicsConfig);
        const guidePhysicsState = upgradeLegacy423ThermodynamicPhysicsState(
          guided.physicsState,
          guidePhysicsConfig,
          false,
        );
        const guideTrial = upgradeLegacy423GuideTrial(guided.trial);
        return {
          ...guided,
          physicsConfig: guidePhysicsConfig,
          physicsState: guidePhysicsState,
          temperatureSensorState: {
            temperatureK: (guidePhysicsState as Record<string, unknown>).gasTemperatureK as number,
          },
          workflow: reconcileLegacy423GuideWorkflow(guided.workflow, guideTrial),
          trial: guideTrial,
        };
      })()
    : null;
  const useGuidedReleaseState = (
    payload.mode === 'guide' ||
    payload.mode === 'demo'
  ) && guided !== null;
  const guideWorkflowStep = guided && isRecord(guided.workflow) && typeof guided.workflow.step === 'string'
    ? guided.workflow.step
    : null;
  const guideReleaseStarted = isRecord(guided?.physicsState) &&
    guided.physicsState.releaseStarted === true ||
    (guideWorkflowStep !== null && LEGACY_423_GUIDE_RELEASE_STARTED_STEPS.has(guideWorkflowStep));
  const uiReplay = free.uiReplay as Record<string, unknown>;
  const demoReleaseStarted = payload.mode === 'demo' &&
    (uiReplay.heatCapacityPhase === 'releasing' || uiReplay.heatCapacityPhase === 'recovering');
  const releaseRuntimeSource = useGuidedReleaseState
    ? {
        ...guided,
        physicsState: isRecord(guided.physicsState)
          ? { ...guided.physicsState, releaseStarted: guideReleaseStarted }
          : guided.physicsState,
      }
    : payload.mode === 'demo'
      ? {
          physicsState: {
            ...(isRecord(free.runtime) ? free.runtime : {}),
            releaseStarted: demoReleaseStarted,
          },
        }
      : free;
  const releaseControls = useGuidedReleaseState
    ? {
        stopcockOpen: controls.stopcockOpen,
        stopcockFlowOpen: controls.stopcockOpen,
        stopcockFlowPurpose: guideReleaseStarted ? 'release' : 'zeroing',
      }
    : {
        stopcockOpen: controls.stopcockOpen,
        stopcockFlowOpen: payload.mode === 'demo' ? controls.stopcockOpen : stopcockFlowOpen,
        stopcockFlowPurpose: payload.mode === 'demo'
          ? demoReleaseStarted ? 'release' : 'zeroing'
          : stopcockFlowPurpose,
      };
  const upgradedReleaseState = createLegacy423ReleaseState(releaseRuntimeSource, releaseControls);
  const activeGuidedProjection = (
    payload.mode === 'guide' ||
    payload.mode === 'demo'
  ) && upgradedGuide
    ? (() => {
        const guidePhysicsConfig = upgradedGuide.physicsConfig as WorkbenchHeatCapacityState[
          'heatCapacityGuidePhysicsConfig'
        ];
        const guidePhysicsState = upgradedGuide.physicsState as WorkbenchHeatCapacityState[
          'heatCapacityGuidePhysicsState'
        ];
        const guideTemperatureSensorState = upgradedGuide.temperatureSensorState as WorkbenchHeatCapacityState[
          'heatCapacityGuideTemperatureSensorState'
        ];
        const guideWorkflow = upgradedGuide.workflow as WorkbenchHeatCapacityState[
          'heatCapacityGuideWorkflow'
        ];
        const powerOn = guideWorkflow.step !== 'powerRequired' && guideWorkflow.step !== 'completed';
        const projectionBase: WorkbenchHeatCapacityState = {
          ...createDefaultHeatCapacityFile(1),
          heatCapacityMode: payload.mode,
          heatCapacityTeachingStatus: guideWorkflow.step === 'completed' ? 'completed' : 'running',
          powerOn,
          heatCapacityReleaseState: upgradedReleaseState,
          heatCapacityGuidePhysicsConfig: guidePhysicsConfig,
          heatCapacityGuidePhysicsState: guidePhysicsState,
          heatCapacityGuideTemperatureSensorState: guideTemperatureSensorState,
          heatCapacityGuideWorkflow: guideWorkflow,
          heatCapacityGuideTrial: upgradedGuide.trial as WorkbenchHeatCapacityState[
            'heatCapacityGuideTrial'
          ],
        };
        return mergeHeatCapacityGuideRuntimeState(
          projectionBase,
          guidePhysicsState,
          guideWorkflow,
          0,
        );
      })()
    : null;
  const upgradedUiReplay: Record<string, unknown> = upgradeLegacy423UiReplay(
    free.uiReplay,
    uiReplaySensorMapping,
    free.sensor as Record<string, unknown>,
  );
  const activeFreeHeatCapacityPhase = payload.mode === 'free' &&
    retainedControls.powerOn === true &&
    upgradedUiReplay.heatCapacityPhase === 'powerOff'
    ? upgradedReleaseState.purpose === 'release'
      ? upgradedReleaseState.phase === 'releasing'
        ? 'releasing'
        : upgradedReleaseState.phase === 'closing' || upgradedReleaseState.phase === 'closedAfterRelease'
          ? 'recovering'
          : 'sealedStabilizing'
      : 'readyToZero'
    : upgradedUiReplay.heatCapacityPhase;
  return {
    ...payload,
    common: {
      ...common,
      ...(activeGuidedProjection
        ? { teachingStatus: activeGuidedProjection.heatCapacityTeachingStatus }
        : payload.mode === 'free'
          ? { teachingStatus: 'idle' as const }
          : {}),
      experimentProfile: upgradeLegacy423TeachingProfile(common.experimentProfile),
      modeSessions: createDefaultHeatCapacityModeSessionStore(),
    },
    free: {
      ...free,
      traceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      preheatCompleted: true,
      real: upgradeLegacy423Domain(free.real),
      ideal: upgradeLegacy423Domain(free.ideal),
      config: upgradedConfig,
      activeRunConfigSnapshot: alignLegacy423ActiveConfigSnapshot(
        free.activeRunConfigSnapshot,
        upgradedTopPhysicsConfig,
      ),
      parameterDraft: upgradeLegacy423ParameterDraft(free.parameterDraft, topSensorMapping),
      recordConfig: topRecordConfig,
      runtime: topRuntime,
      sensor: topSensorState,
      calibration: upgradeLegacy423CalibrationState(free.calibration, topSensorMapping),
      rollbackSnapshots: upgradeLegacy423RollbackSnapshots(
        free.rollbackSnapshots,
        topPhysicsConfig,
        topSensorMapping,
      ),
      traceStore: synchronizedTopTraceStore,
      trials: topTrials,
      uiReplay: activeGuidedProjection
        ? {
            ...upgradedUiReplay,
            heatCapacityPhase: activeGuidedProjection.heatCapacityPhase,
            vesselPressureReadoutKPa: activeGuidedProjection.vesselPressureReadoutKPa,
            vesselTemperatureReadoutK: activeGuidedProjection.vesselTemperatureReadoutK,
          }
        : {
            ...upgradedUiReplay,
            heatCapacityPhase: activeFreeHeatCapacityPhase,
          },
      controls: {
        ...retainedControls,
        ...(activeGuidedProjection
          ? {
              powerOn: activeGuidedProjection.powerOn,
              stopcockOpen: activeGuidedProjection.glassPistonState === 'open',
            }
          : {}),
        releaseState: upgradedReleaseState,
      },
    },
    guided: upgradedGuide,
  };
};

const readPersistenceRecordIds = (value: unknown) => (
  Array.isArray(value)
    ? value.map((entry) => isRecord(entry) && typeof entry.id === 'string' ? entry.id : null)
    : null
);

const hasHeatCapacityCollectionParity = (
  payload: Record<string, unknown>,
  restored: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const free = isRecord(payload.free) ? payload.free : null;
  if (!free) return false;
  const traceStore = isRecord(free.traceStore) ? free.traceStore : null;
  const real = isRecord(free.real) ? free.real : null;
  const ideal = isRecord(free.ideal) ? free.ideal : null;
  const guided = isRecord(payload.guided) ? payload.guided : null;
  const rawCollections = {
    trace: readPersistenceRecordIds(traceStore?.traceTrials),
    trials: readPersistenceRecordIds(free.trials),
    realTrials: readPersistenceRecordIds(real?.trials),
    idealTrials: readPersistenceRecordIds(ideal?.trials),
    guideTrial: guided && isRecord(guided.trial) && typeof guided.trial.id === 'string'
      ? guided.trial.id
      : null,
  };
  const restoredCollections = {
    trace: restored.heatCapacityFreeTraceStore.traceTrials.map((trial) => trial.id),
    trials: restored.heatCapacityFreeTrials.map((trial) => trial.id),
    realTrials: restored.heatCapacityFreeRealDomain.trials.map((trial) => trial.id),
    idealTrials: restored.heatCapacityFreeIdealDomain.trials.map((trial) => trial.id),
    guideTrial: restored.heatCapacityGuideTrial?.id ?? null,
  };
  return rawCollections.trace !== null &&
    rawCollections.trials !== null &&
    rawCollections.realTrials !== null &&
    rawCollections.idealTrials !== null &&
    areCanonicalPersistenceValuesEqual(rawCollections, restoredCollections);
};

const hasCanonicalHeatCapacityRuntimeShape = (
  payload: unknown,
  fileUpdatedAtMs: unknown = null,
  allowLegacyDemoProjection = false,
) => {
  if (!isRecord(payload) || !isRecord(payload.free)) return false;
  const config = isRecord(payload.free.config) ? payload.free.config : null;
  const sensor = config && isRecord(config.sensor) ? config.sensor : null;
  const common = isRecord(payload.common) ? payload.common : null;
  return isCanonicalHeatCapacityFreePersistenceRuntime(payload.free, {
    mode: payload.mode,
    teachingStatus: common?.teachingStatus,
    controls: payload.free.controls,
    uiReplay: payload.free.uiReplay,
  }) &&
    (
      payload.guided === null ||
      isCanonicalHeatCapacityGuidePersistenceRuntime(
        payload.guided,
        sensor?.pressureMvPerKPa,
        {
          mode: payload.mode,
          teachingStatus: common?.teachingStatus,
          controls: payload.free.controls,
          uiReplay: payload.free.uiReplay,
          modeSessions: common?.modeSessions,
          allowLegacyDemoProjection,
          updatedAtMs: fileUpdatedAtMs,
        },
      )
    );
};

const hasHeatCapacityUiReplayParity = (
  input: unknown,
  canonical: unknown,
) => {
  if (!isRecord(input) || !isRecord(canonical)) return false;
  const inputFree = isRecord(input.free) ? input.free : null;
  const canonicalFree = isRecord(canonical.free) ? canonical.free : null;
  return inputFree !== null && canonicalFree !== null &&
    areCanonicalPersistenceValuesEqual(inputFree.uiReplay, canonicalFree.uiReplay);
};

const GUIDE_STEPS_AFTER_ZERO = new Set([
  'recordU0Required',
  'closeStopcockBeforePumpRequired',
  'openPumpValveRequired',
  'pumpRequired',
  'closePumpValveRequired',
  'u1Waiting',
  'recordU1Required',
  'openStopcockForReleaseRequired',
  'closeStopcockAfterReleaseRequired',
  'u2Waiting',
  'recordU2Required',
  'closePowerRequired',
  'completed',
]);

const createPublicBlankDemoUiProjection = (
  persistedPayload: Record<string, unknown>,
) => {
  const free = isRecord(persistedPayload.free) ? persistedPayload.free : null;
  const uiReplay = free && isRecord(free.uiReplay) ? free.uiReplay : null;
  if (!uiReplay) return {};
  const projection = Object.fromEntries(
    HEAT_CAPACITY_FREE_UI_REPLAY_KEYS
      .filter((key) => Object.prototype.hasOwnProperty.call(uiReplay, key))
      .map((key) => [key, uiReplay[key]]),
  );
  const rawPressureMv = uiReplay.pressureSignalMvRaw;
  const targetPressureMv = uiReplay.pressureSignalTargetMv;
  const zeroOffsetMv = uiReplay.pressureZeroOffset;
  return {
    ...projection,
    ...(
      isPersistenceFiniteNumber(rawPressureMv) &&
      isPersistenceFiniteNumber(targetPressureMv) &&
      isPersistenceFiniteNumber(zeroOffsetMv)
        ? {
            pressureInitialBiasMv:
              targetPressureMv - rawPressureMv - zeroOffsetMv,
          }
        : {}
    ),
  };
};

const seedPublicBlankDemoModeSession = (
  restored: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  persistedPayload: Record<string, unknown>,
  capturedAtMs: number,
) => {
  if (
    restored.heatCapacityMode !== 'demo' ||
    persistedPayload.guided !== null ||
    restored.heatCapacityModeSessions.demo.status !== 'empty'
  ) {
    return restored;
  }
  const commonDefaults = createDefaultHeatCapacityFile(1);
  const persistedFree = isRecord(persistedPayload.free) ? persistedPayload.free : null;
  const persistedControls = persistedFree && isRecord(persistedFree.controls)
    ? persistedFree.controls
    : null;
  const persistedReleaseState = persistedControls &&
    isRecord(persistedControls.releaseState)
    ? persistedControls.releaseState as unknown as HeatCapacityReleaseState
    : commonDefaults.heatCapacityReleaseState;
  const persistedPowerOn = persistedControls?.powerOn === true;
  const persistedPumpValveOpen = persistedControls?.pumpValveOpen === true;
  const persistedStopcockOpen = persistedControls?.stopcockOpen === true;
  const workflow = restored.heatCapacityGuideWorkflow;
  const physicsState = restored.heatCapacityGuidePhysicsState;
  const projection = {
    ...mergeHeatCapacityGuideRuntimeState(
      {
        ...restored,
        heatCapacityMode: 'demo',
        heatCapacityTeachingStatus: 'running',
        runState: 'paused',
        powerOn: persistedPowerOn,
        glassPistonState: persistedStopcockOpen ? 'open' : 'closed',
        stopcockAngleDeg: persistedStopcockOpen ? 90 : 0,
        pumpValveOpen: persistedPumpValveOpen,
        pumpValveState: persistedPumpValveOpen ? 'open' : 'closed',
        pumpBulbState: 'idle',
        heatCapacityReleaseState: persistedReleaseState,
        pressureZeroed: false,
        pressureZeroAdjusted: false,
        displayResponseLastUpdateMs: null,
      },
      physicsState,
      workflow,
      capturedAtMs,
    ),
    ...createPublicBlankDemoUiProjection(persistedPayload),
    heatCapacityExperimentSeed: restored.heatCapacityExperimentSeed,
    heatCapacityExperimentProfile: restored.heatCapacityExperimentProfile,
  };
  const modeSessions = suspendHeatCapacityModeSession(
    projection,
    null,
    capturedAtMs,
  ).heatCapacityModeSessions;
  const normalizedModeSessions = normalizeHeatCapacityModeSessionStore(
    modeSessions,
    restored.id,
  );
  if (!areCanonicalPersistenceValuesEqual(modeSessions, normalizedModeSessions)) {
    throw new Error('Public blank Demo state could not be seeded as a canonical mode session.');
  }
  return {
    ...restored,
    heatCapacityModeSessions: modeSessions,
  };
};

const seedLegacy423ModeSessions = (
  restored: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  legacyPayload: Record<string, unknown>,
  capturedAtMs: number,
) => {
  let modeSessions = createDefaultHeatCapacityModeSessionStore();
  const commonDefaults = createDefaultHeatCapacityFile(1);
  const modeSessionCapturedAtMs = Math.max(
    capturedAtMs,
    restored.heatCapacityGuideTrial?.completedAtMs ?? 0,
    ...restored.heatCapacityFreeRealDomain.trials.map((trial) => trial.completedAtMs ?? 0),
    ...restored.heatCapacityFreeIdealDomain.trials.map((trial) => trial.completedAtMs ?? 0),
  );
  const capture = (file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>) => {
    const suspended = suspendHeatCapacityModeSession(
      { ...file, heatCapacityModeSessions: modeSessions },
      null,
      modeSessionCapturedAtMs,
    );
    modeSessions = suspended.heatCapacityModeSessions;
  };

  const domain = restored.heatCapacityFreeParameterScheme === 'ideal'
    ? restored.heatCapacityFreeIdealDomain
    : restored.heatCapacityFreeRealDomain;
  const releaseOpen = domain.releaseState.phase === 'opening' ||
    domain.releaseState.phase === 'open' || domain.releaseState.phase === 'releasing';
  const freeProjectionBase = restored.heatCapacityMode === 'free'
    ? restored
    : {
        ...createHeatCapacityCommonRuntimeShell(restored, commonDefaults),
        heatCapacityMode: 'free' as const,
        heatCapacityTeachingStatus: 'idle' as const,
        runState: 'paused' as const,
        powerOn: false,
        glassPistonState: releaseOpen ? 'open' as const : 'closed' as const,
        stopcockAngleDeg: releaseOpen ? 90 : 0,
        pumpValveOpen: false,
        pumpValveState: 'closed' as const,
        pumpBulbState: 'idle' as const,
      };
  const freeProjected = applyHeatCapacityFreeDomainToRuntimeFields(
    freeProjectionBase,
    domain,
  );
  capture(mergeHeatCapacityFreeRuntimeState(
    freeProjected,
    domain.physicsState,
    domain.sensorState,
    domain.calibrationState,
    modeSessionCapturedAtMs,
  ));

  const legacyGuided = isRecord(legacyPayload.guided) ? legacyPayload.guided : null;
  if (legacyGuided) {
      const guidedMode = restored.heatCapacityMode === 'demo'
        ? 'demo' as const
        : restored.heatCapacityMode === 'guide'
          ? 'guide' as const
          : restored.heatCapacityGuideTrial?.source === 'demo'
            ? 'demo' as const
            : 'guide' as const;
      const workflow = restored.heatCapacityGuideWorkflow;
      const physicsState = restored.heatCapacityGuidePhysicsState;
      const lastOpenedAtS = physicsState.lastStopcockOpenedAtS;
      const lastClosedAtS = physicsState.lastStopcockClosedAtS;
      const stopcockOpen = lastOpenedAtS !== null &&
        (lastClosedAtS === null || lastOpenedAtS >= lastClosedAtS);
      const pumpValveOpen = physicsState.lastPumpValveOpenedAtS !== null &&
        (
          physicsState.lastPumpValveClosedAtS === null ||
          physicsState.lastPumpValveOpenedAtS >= physicsState.lastPumpValveClosedAtS
        );
      const guideReleaseStarted = physicsState.releaseStarted ||
        LEGACY_423_GUIDE_RELEASE_STARTED_STEPS.has(workflow.step);
      const releaseState = createLegacy423ReleaseState({
        ...legacyGuided,
        physicsState: isRecord(legacyGuided.physicsState)
          ? { ...legacyGuided.physicsState, releaseStarted: guideReleaseStarted }
          : legacyGuided.physicsState,
      }, {
        stopcockOpen,
        stopcockFlowOpen: stopcockOpen,
        stopcockFlowPurpose: guideReleaseStarted ? 'release' : 'zeroing',
      });
      const powerOn = workflow.step !== 'powerRequired' && workflow.step !== 'completed';
      const pressureZeroed = GUIDE_STEPS_AFTER_ZERO.has(workflow.step);
      const guideProjectionBase = restored.heatCapacityMode === guidedMode
        ? {
            ...restored,
            runState: workflow.step === 'completed' ? 'idle' as const : restored.runState,
            heatCapacityTeachingStatus: workflow.step === 'completed'
              ? 'completed' as const
              : 'running' as const,
            heatCapacityReleaseState: releaseState,
          }
        : {
            ...createHeatCapacityCommonRuntimeShell(restored, commonDefaults),
            heatCapacityMode: guidedMode,
            heatCapacityTeachingStatus: workflow.step === 'completed'
              ? 'completed' as const
              : 'running' as const,
            runState: workflow.step === 'completed' ? 'idle' as const : 'paused' as const,
            powerOn,
            glassPistonState: stopcockOpen ? 'open' as const : 'closed' as const,
            pumpValveOpen,
            pumpValveState: pumpValveOpen ? 'open' as const : 'closed' as const,
            pumpBulbState: 'idle' as const,
            heatCapacityReleaseState: releaseState,
            pressureZeroed,
            pressureZeroAdjusted: pressureZeroed,
            displayResponseLastUpdateMs: null,
          };
      const mergedGuideProjection = mergeHeatCapacityGuideRuntimeState(
        guideProjectionBase,
        physicsState,
        workflow,
        modeSessionCapturedAtMs,
      );
      const guideProjection = guidedMode === 'demo'
        ? {
            ...mergedGuideProjection,
            pressureDeltaKPa: Number(Math.max(
              0,
              mergedGuideProjection.gasPressureKPaAbs -
                mergedGuideProjection.ambientPressureKPa,
            ).toFixed(4)),
            pressureKPa: mergedGuideProjection.powerOn
              ? Number(mergedGuideProjection.gasPressureKPaAbs.toFixed(2))
              : null,
          }
        : mergedGuideProjection;
    capture(guideProjection);
  }

  return { ...restored, heatCapacityModeSessions: modeSessions };
};

const isPublic511BlankDemoOmission = (
  payload: Record<string, unknown>,
  sourceAppVersion: string,
) => (
  sourceAppVersion === 'development' &&
  !isLegacy423HeatCapacityPayload(payload) &&
  payload.mode === 'demo' &&
  payload.guided === null
);

const restoreHeatCapacityRuntimeFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  index: number,
  sourceAppVersion: string,
): WorkbenchFileState[] => {
  if (fileEnvelope.kind !== 'heatCapacity') return [];
  const legacy423 = isLegacy423HeatCapacityPayload(fileEnvelope.payload);
  if (legacy423 && !validateLegacy423HeatCapacityPayload(fileEnvelope.payload)) return [];
  const upgradedPayload = legacy423
    ? upgradeLegacy423HeatCapacityPayload(fileEnvelope.payload)
    : fileEnvelope.payload;
  if (!validateHeatCapacityPersistencePayload(upgradedPayload).valid) return [];
  const canonicalRuntimeShapeValid = hasCanonicalHeatCapacityRuntimeShape(
    upgradedPayload,
    fileEnvelope.updatedAt,
    legacy423,
  );
  if (!canonicalRuntimeShapeValid) return [];
  const payload = migrateLegacyHeatCapacityFocusIdentity(upgradedPayload);
  const common = isRecord(payload.common) ? payload.common : null;
  if (!common || !isRecord(common.modeSessions)) return [];
  const normalizedModeSessions = normalizeHeatCapacityModeSessionStore(
    common.modeSessions,
    fileEnvelope.id,
  );
  if (!areCanonicalPersistenceValuesEqual(common.modeSessions, normalizedModeSessions)) return [];
  const publicBlankDemoOmission = isPublic511BlankDemoOmission(
    payload,
    sourceAppVersion,
  );
  const canonicalInput = {
    ...payload,
    common: { ...common, modeSessions: normalizedModeSessions },
  };
  const decodedRestored = restoreHeatCapacityFileFromPersistencePayload(fileEnvelope, canonicalInput, index);
  const restoredWithLegacySessions = legacy423
    ? seedLegacy423ModeSessions(decodedRestored, fileEnvelope.payload, fileEnvelope.updatedAt)
    : decodedRestored;
  const restoredWithSeededSessions = seedPublicBlankDemoModeSession(
    restoredWithLegacySessions,
    payload,
    fileEnvelope.updatedAt,
  );
  const activeEntry = restoredWithSeededSessions
    .heatCapacityModeSessions[restoredWithSeededSessions.heatCapacityMode];
  const restored = !legacy423 &&
    restoredWithSeededSessions.heatCapacityMode === 'demo' &&
    activeEntry.status !== 'empty' &&
    activeEntry.capturedAtMs !== null
      ? restoreHeatCapacityModeSession(
          restoredWithSeededSessions,
          restoredWithSeededSessions.heatCapacityMode,
          Math.max(activeEntry.capturedAtMs, fileEnvelope.updatedAt),
      )
    : restoredWithSeededSessions;
  if (!restored) return [];
  if (!hasHeatCapacityCollectionParity(canonicalInput, restored)) return [];
  const canonicalPayload = createHeatCapacityPersistencePayload(restored, fileEnvelope.updatedAt);
  if (!validateHeatCapacityPersistencePayload(canonicalPayload).valid) return [];
  if (!hasCanonicalHeatCapacityRuntimeShape(
    canonicalPayload,
    fileEnvelope.updatedAt,
    legacy423,
  )) return [];
  if (!hasHeatCapacityUiReplayParity(canonicalInput, canonicalPayload)) return [];
  if (!legacy423) {
    const expectedCurrentPayload = publicBlankDemoOmission
      ? {
          ...canonicalInput,
          common: {
            ...common,
            modeSessions: canonicalPayload.common.modeSessions,
          },
          guided: canonicalPayload.guided,
        }
      : canonicalInput;
    if (!areCanonicalPersistenceValuesEqual(expectedCurrentPayload, canonicalPayload)) return [];
  }
  return [restored];
};

interface DecodedWorkbenchFiles {
  files: WorkbenchFileState[];
  diagnostics: WorkbenchPersistenceDiagnostic[];
  migrationModeCaptureOverrides: WorkbenchMigrationModeCaptureOverride[];
}

const decodeFilesFromEnvelopes = (
  files: WorkbenchExperimentFileEnvelopeV1[],
  sourceAppVersion: string,
): DecodedWorkbenchFiles => files.reduce<DecodedWorkbenchFiles>((decoded, fileEnvelope, index) => {
  try {
    const restoredFiles = fileEnvelope.kind === 'standard'
      ? restoreStandardFile(fileEnvelope, index + 1)
      : fileEnvelope.kind === 'ideal'
        ? restoreIdealGasFile(fileEnvelope, index + 1)
        : restoreHeatCapacityRuntimeFile(fileEnvelope, index + 1, sourceAppVersion);
    if (restoredFiles.length === 0) {
      decoded.diagnostics.push({
        level: 'error',
        code: 'invalid-file',
        message: `Experiment file could not be restored: ${fileEnvelope.name}.`,
        fileId: fileEnvelope.id,
      });
      return decoded;
    }
    decoded.files.push(...restoredFiles);
    if (
      fileEnvelope.kind === 'heatCapacity' &&
      (
        isLegacy423HeatCapacityPayload(fileEnvelope.payload) ||
        isPublic511BlankDemoOmission(fileEnvelope.payload, sourceAppVersion)
      )
    ) {
      const restoredHeatCapacityFile = restoredFiles.find(
        (file): file is WorkbenchHeatCapacityState => file.kind === 'heatCapacity',
      );
      const activeEntry = restoredHeatCapacityFile
        ?.heatCapacityModeSessions[restoredHeatCapacityFile.heatCapacityMode];
      if (
        restoredHeatCapacityFile &&
        activeEntry?.status !== 'empty' &&
        activeEntry.capturedAtMs !== null
      ) {
        decoded.migrationModeCaptureOverrides.push({
          source: isLegacy423HeatCapacityPayload(fileEnvelope.payload)
            ? 'legacy-4.2.3'
            : 'public-5.1.1-blank-demo',
          fileId: restoredHeatCapacityFile.id,
          mode: restoredHeatCapacityFile.heatCapacityMode,
          capturedAtMs: activeEntry.capturedAtMs,
        });
      }
    }
  } catch (error) {
    console.error(`[Workbench] Failed to restore experiment file ${fileEnvelope.id}:`, error);
    decoded.diagnostics.push({
      level: 'error',
      code: 'invalid-file',
      message: `Experiment file could not be restored: ${fileEnvelope.name}.`,
      fileId: fileEnvelope.id,
    });
  }
  return decoded;
}, { files: [], diagnostics: [], migrationModeCaptureOverrides: [] });

const decodeEnvelopeAsRuntimeSession = (
  envelope: WorkbenchSessionEnvelopeV2,
  runtimeFiles = decodeFilesFromEnvelopes(envelope.files, envelope.appVersion).files,
): WorkbenchSessionState => {
  return {
    version: 1,
    files: runtimeFiles,
    activeFileId: runtimeFiles.some((file) => file.id === envelope.activeFileId)
      ? envelope.activeFileId ?? ''
      : runtimeFiles[0]?.id ?? '',
    selectedPanel: envelope.selectedPanel,
  };
};

export const decodeWorkbenchStorageEnvelope = (
  value: unknown,
): DecodeWorkbenchStorageResult => {
  if (isRecord(value) && value.schemaFamily === WORKBENCH_SESSION_SCHEMA_FAMILY) {
    const version = value.schemaVersion;
    if (typeof version === 'number' && version > WORKBENCH_SESSION_SCHEMA_VERSION) {
      return {
        session: fallbackSession(),
        diagnostics: [createUnsupportedFutureDiagnostic(version)],
        handled: true,
        migrationModeCaptureOverrides: [],
      };
    }
    if (isWorkbenchSessionEnvelope(value)) {
      const decodedFiles = decodeFilesFromEnvelopes(value.files, value.appVersion);
      return {
        session: decodeEnvelopeAsRuntimeSession(value, decodedFiles.files),
        diagnostics: decodedFiles.diagnostics,
        handled: true,
        migrationModeCaptureOverrides: decodedFiles.migrationModeCaptureOverrides,
      };
    }
    return {
      session: fallbackSession(),
      diagnostics: [{
        level: 'error',
        code: 'invalid-envelope',
        message: 'Workbench session envelope is invalid.',
      }],
      handled: true,
      migrationModeCaptureOverrides: [],
    };
  }
  return {
    session: fallbackSession(),
    diagnostics: [],
    handled: false,
    migrationModeCaptureOverrides: [],
  };
};

export const decodeWorkbenchClosedFilesStorageEnvelope = (
  value: unknown,
): DecodeWorkbenchClosedFilesStorageResult => {
  if (isRecord(value) && value.schemaFamily === WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY) {
    const version = value.schemaVersion;
    if (typeof version === 'number' && version > WORKBENCH_CLOSED_FILES_SCHEMA_VERSION) {
      return {
        files: [],
        diagnostics: [createUnsupportedFutureDiagnostic(version)],
        handled: true,
        migrationModeCaptureOverrides: [],
      };
    }
    if (isWorkbenchClosedFilesEnvelope(value)) {
      const decodedFiles = decodeFilesFromEnvelopes(value.files, value.appVersion);
      return {
        files: decodedFiles.files,
        diagnostics: decodedFiles.diagnostics,
        handled: true,
        migrationModeCaptureOverrides: decodedFiles.migrationModeCaptureOverrides,
      };
    }
    return {
      files: [],
      diagnostics: [{
        level: 'error',
        code: 'invalid-envelope',
        message: 'Workbench closed-files envelope is invalid.',
      }],
      handled: true,
      migrationModeCaptureOverrides: [],
    };
  }
  return {
    files: [],
    diagnostics: [],
    handled: false,
    migrationModeCaptureOverrides: [],
  };
};
