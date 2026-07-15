import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import { normalizeHeatCapacityFreeAttempt } from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import { normalizeHeatCapacityTeachingProfile } from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import type {
  HeatCapacityModeUiCheckpoint,
} from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import { normalizeHeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import type {
  WorkbenchHeatCapacityState,
  WorkbenchRunState,
} from './workbenchState.ts';

export const HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION = 2 as const;
export const HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION = 1 as const;

const MAX_RUNTIME_JSON_KEY_LENGTH = 512;
const MAX_RUNTIME_JSON_TEXT_LENGTH = 1_000_000;
const MAX_RUNTIME_JSON_COLLECTION_SIZE = 10_000;
const MAX_RUNTIME_JSON_DEPTH = 12;
const UNSAFE_RUNTIME_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type HeatCapacityModeSessionStatus = 'empty' | 'suspended' | 'completed';

const HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS = [
  'runState',
  'heatCapacityTeachingStatus',
  'heatCapacityExperimentSeed',
  'heatCapacityExperimentProfile',
  'heatCapacityPhase',
  'powerOn',
  'glassPistonState',
  'stopcockAngleDeg',
  'ambientPressureKPa',
  'ambientTemperatureK',
  'gasPressureKPaAbs',
  'gasTemperatureK',
  'sensorTemperatureK',
  'pressureDeltaKPa',
  'simulationTimeS',
  'lastUpdateMs',
  'pressureSignalMvRaw',
  'pressureSignalMvDisplayed',
  'pressureInitialBiasMv',
  'temperatureSignalTargetMv',
  'pressureSignalTargetMv',
  'displayResponseLastUpdateMs',
  'pressureZeroDisplayedSamples',
  'pressureDisplayJitterOffset',
  'pressureDisplayNextJitterAtMs',
  'temperatureDisplayJitterOffset',
  'temperatureDisplayNextJitterAtMs',
  'pressureZeroed',
  'pressureZeroAdjusted',
  'pressureZeroKnobAngle',
  'pressureZeroOffset',
  'pressureZeroDisplayText',
  'releaseRecoveryTargetDeltaKPa',
  'pressureSignalRawReadoutMv',
  'pressureSignalReadoutMv',
  'pressureGaugeTargetValue',
  'pressureGaugeDisplayValue',
  'pressureGaugeNeedleAngle',
  'gaugePressureMinKPa',
  'gaugePressureMaxKPa',
  'pressureWarningThresholdKPa',
  'pressureSafeThresholdKPa',
  'pressureSafetyThresholdKPa',
  'pressureSafetyStatus',
  'pressureSafetyMessage',
  'pressureBlockedPumping',
  'pressureOverLimit',
  'pressureZeroMvPerTurn',
  'pressureZeroAdjustMode',
  'temperatureSignalMv',
  'pressureSignalMv',
  'pressureKPa',
  'pressureLimitKPa',
  'pumpValveOpen',
  'pumpValveState',
  'pumpBulbState',
  'pumpStrokeTimestamps',
  'pumpFrequency',
  'pumpFrequencyStatus',
  'lastPumpTime',
  'pumpStrokeCount',
  'pumpHint',
  'heatCapacityReleaseState',
  'hardSphereViewEnabled',
  'visualizationMode',
  'calculationModel',
  'pressureSensitivityMvPerKPa',
  'vesselPressureReadoutKPa',
  'vesselTemperatureReadoutK',
  'recordedPressures',
  'heatCapacityProcessSamples',
  'theoreticalGamma',
] as const satisfies readonly (keyof WorkbenchHeatCapacityState)[];

const HEAT_CAPACITY_FREE_SESSION_KEYS = [
  'heatCapacityFreePreheatCompleted',
  'heatCapacityFreeRuntimeVersion',
  'heatCapacityFreeExperimentGroupStatus',
  'heatCapacityFreeGasType',
  'heatCapacityFreeParameterDraft',
  'heatCapacityFreeActiveRunConfigSnapshot',
  'heatCapacityFreeFileAcknowledgements',
  'heatCapacityFreeParameterScheme',
  'heatCapacityFreeDisplayScheme',
  'heatCapacityFreeRealDomain',
  'heatCapacityFreeIdealDomain',
  'heatCapacityFreeRecordConfig',
  'heatCapacityFreePressureWarningMv',
  'heatCapacityFreeInstrumentNoiseEnabled',
  'heatCapacityFreeEnvironmentConfig',
  'heatCapacityFreePhysicsConfig',
  'heatCapacityFreePhysicsState',
  'heatCapacityFreeSensorConfig',
  'heatCapacityFreeSensorState',
  'heatCapacityFreeCalibrationState',
  'heatCapacityFreeEquilibriumSpeedMultiplier',
  'heatCapacityFreeRollbackSnapshots',
  'heatCapacityFreeTraceVersion',
  'heatCapacityFreeTraceStore',
  'heatCapacityFreeTrials',
  'heatCapacityFreeActiveAttempt',
] as const satisfies readonly (keyof WorkbenchHeatCapacityState)[];

const HEAT_CAPACITY_GUIDE_SESSION_KEYS = [
  'heatCapacityGuidePhysicsConfig',
  'heatCapacityGuidePhysicsState',
  'heatCapacityGuideTemperatureSensorState',
  'heatCapacityGuideWorkflow',
  'heatCapacityGuideTrial',
] as const satisfies readonly (keyof WorkbenchHeatCapacityState)[];

export type HeatCapacityModeCommonRuntimeSnapshot = Pick<
  WorkbenchHeatCapacityState,
  typeof HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS[number]
>;

export type HeatCapacityFreeModeRuntimeSnapshot = Pick<
  WorkbenchHeatCapacityState,
  typeof HEAT_CAPACITY_FREE_SESSION_KEYS[number]
>;

export type HeatCapacityGuideModeRuntimeSnapshot = Pick<
  WorkbenchHeatCapacityState,
  typeof HEAT_CAPACITY_GUIDE_SESSION_KEYS[number]
>;

export type HeatCapacityModeRuntimeSnapshot =
  | {
      schemaVersion: typeof HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION;
      fileId: string;
      mode: 'free';
      common: HeatCapacityModeCommonRuntimeSnapshot;
      free: HeatCapacityFreeModeRuntimeSnapshot;
    }
  | {
      schemaVersion: typeof HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION;
      fileId: string;
      mode: 'guide';
      common: HeatCapacityModeCommonRuntimeSnapshot;
      guide: HeatCapacityGuideModeRuntimeSnapshot;
    }
  | {
      schemaVersion: typeof HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION;
      fileId: string;
      mode: 'demo';
      common: HeatCapacityModeCommonRuntimeSnapshot;
      demo: HeatCapacityGuideModeRuntimeSnapshot;
    };

export interface HeatCapacityModeSessionEntry {
  status: HeatCapacityModeSessionStatus;
  resumeRunState: WorkbenchRunState;
  capturedAtMs: number | null;
  snapshot: HeatCapacityModeRuntimeSnapshot | null;
  uiCheckpoint: HeatCapacityModeUiCheckpoint | null;
}

export interface HeatCapacityModeSessionStore {
  schemaVersion: typeof HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION;
  demo: HeatCapacityModeSessionEntry;
  guide: HeatCapacityModeSessionEntry;
  free: HeatCapacityModeSessionEntry;
}

const createEmptyHeatCapacityModeSessionEntry = (): HeatCapacityModeSessionEntry => ({
  status: 'empty',
  resumeRunState: 'idle',
  capturedAtMs: null,
  snapshot: null,
  uiCheckpoint: null,
});

export const createDefaultHeatCapacityModeSessionStore = (): HeatCapacityModeSessionStore => ({
  schemaVersion: HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
  demo: createEmptyHeatCapacityModeSessionEntry(),
  guide: createEmptyHeatCapacityModeSessionEntry(),
  free: createEmptyHeatCapacityModeSessionEntry(),
});

const pickHeatCapacitySessionFields = <
  Keys extends readonly (keyof WorkbenchHeatCapacityState)[],
>(
  file: WorkbenchHeatCapacityState,
  keys: Keys,
): Pick<WorkbenchHeatCapacityState, Keys[number]> => (
  Object.fromEntries(keys.map((key) => [key, file[key]])) as
    Pick<WorkbenchHeatCapacityState, Keys[number]>
);

export const captureHeatCapacityModeRuntimeSnapshot = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityModeRuntimeSnapshot => {
  const common = pickHeatCapacitySessionFields(file, HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS);
  if (file.heatCapacityMode === 'free') {
    return {
      schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
      fileId: file.id,
      mode: 'free',
      common,
      free: pickHeatCapacitySessionFields(file, HEAT_CAPACITY_FREE_SESSION_KEYS),
    };
  }
  if (file.heatCapacityMode === 'guide') {
    return {
      schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
      fileId: file.id,
      mode: 'guide',
      common,
      guide: pickHeatCapacitySessionFields(file, HEAT_CAPACITY_GUIDE_SESSION_KEYS),
    };
  }
  return {
    schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
    fileId: file.id,
    mode: 'demo',
    common,
    demo: pickHeatCapacitySessionFields(file, HEAT_CAPACITY_GUIDE_SESSION_KEYS),
  };
};

export const suspendHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  uiCheckpoint: HeatCapacityModeUiCheckpoint | null,
  capturedAtMs = Date.now(),
): WorkbenchHeatCapacityState => {
  const mode = file.heatCapacityMode;
  if (
    uiCheckpoint !== null &&
    (uiCheckpoint.fileId !== file.id || uiCheckpoint.mode !== mode)
  ) {
    throw new TypeError(
      `Heat-capacity mode checkpoint mismatch: expected ${file.id}/${mode}, received ${uiCheckpoint.fileId}/${uiCheckpoint.mode}.`,
    );
  }
  const status: HeatCapacityModeSessionStatus = file.heatCapacityTeachingStatus === 'completed'
    ? 'completed'
    : 'suspended';
  return {
    ...file,
    heatCapacityModeSessions: {
      ...file.heatCapacityModeSessions,
      [mode]: {
        status,
        resumeRunState: file.runState,
        capturedAtMs,
        snapshot: captureHeatCapacityModeRuntimeSnapshot(file),
        uiCheckpoint,
      },
    },
  };
};

export const hasHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
) => {
  const entry = file.heatCapacityModeSessions[mode];
  return entry.status !== 'empty' &&
    entry.snapshot?.mode === mode &&
    entry.snapshot.fileId === file.id;
};

export const restoreHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  now = Date.now(),
): WorkbenchHeatCapacityState | null => {
  const entry = file.heatCapacityModeSessions[mode];
  const snapshot = entry.snapshot;
  if (!snapshot || snapshot.mode !== mode || snapshot.fileId !== file.id) return null;
  const modeRuntime = snapshot.mode === 'free'
    ? snapshot.free
    : snapshot.mode === 'guide'
      ? snapshot.guide
      : snapshot.demo;
  const restoredRunState: WorkbenchRunState = mode === 'demo'
    ? 'paused'
    : entry.resumeRunState;
  const resumesPhysicalClock = mode !== 'demo';
  return {
    ...file,
    ...snapshot.common,
    ...modeRuntime,
    heatCapacityMode: mode,
    runState: restoredRunState,
    lastUpdateMs: resumesPhysicalClock ? now : snapshot.common.lastUpdateMs,
    displayResponseLastUpdateMs: resumesPhysicalClock ? now : snapshot.common.displayResponseLastUpdateMs,
    heatCapacityModeSessions: file.heatCapacityModeSessions,
    updatedAt: now,
  };
};

export const clearHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityModeSessions: {
    ...file.heatCapacityModeSessions,
    [mode]: createEmptyHeatCapacityModeSessionEntry(),
  },
});

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const INVALID_RUNTIME_VALUE = Symbol('invalid-heat-capacity-mode-runtime-value');
type RuntimeValueDecoder = (value: unknown) => unknown | typeof INVALID_RUNTIME_VALUE;

const decodeFiniteNumber: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodePositiveFiniteNumber: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodeNonNegativeFiniteNumber: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodeNonNegativeInteger: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodeGamma: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value > 1
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodeUnitInterval: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodePumpWorkRetention: RuntimeValueDecoder = (value) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodeNullableFiniteNumber: RuntimeValueDecoder = (value) => (
  value === null ? null : decodeFiniteNumber(value)
);

const decodeNullableNonNegativeFiniteNumber: RuntimeValueDecoder = (value) => (
  value === null ? null : decodeNonNegativeFiniteNumber(value)
);

const decodeBoolean: RuntimeValueDecoder = (value) => (
  typeof value === 'boolean' ? value : INVALID_RUNTIME_VALUE
);

const decodeTrue: RuntimeValueDecoder = (value) => (
  value === true ? true : INVALID_RUNTIME_VALUE
);

const decodeString: RuntimeValueDecoder = (value) => (
  typeof value === 'string' ? value : INVALID_RUNTIME_VALUE
);

const decodeNullableString: RuntimeValueDecoder = (value) => (
  value === null ? null : decodeString(value)
);

const decodeStringOrNumber: RuntimeValueDecoder = (value) => (
  typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    ? value
    : INVALID_RUNTIME_VALUE
);

const decodeLiteral = <Value extends string | number>(
  values: readonly Value[],
): RuntimeValueDecoder => (value) => (
  values.includes(value as Value) ? value : INVALID_RUNTIME_VALUE
);

const decodeNullable = (decoder: RuntimeValueDecoder): RuntimeValueDecoder => (value) => (
  value === null ? null : decoder(value)
);

const decodeOptional = (decoder: RuntimeValueDecoder): RuntimeValueDecoder => (value) => (
  value === undefined ? undefined : decoder(value)
);

const decodeTeachingProfile: RuntimeValueDecoder = (value) => {
  if (value === null) return null;
  return normalizeHeatCapacityTeachingProfile(value) ?? INVALID_RUNTIME_VALUE;
};

const decodeArray = (decoder: RuntimeValueDecoder): RuntimeValueDecoder => (value) => {
  if (!Array.isArray(value)) return INVALID_RUNTIME_VALUE;
  const decoded = value.map(decoder);
  return decoded.some((item) => item === INVALID_RUNTIME_VALUE)
    ? INVALID_RUNTIME_VALUE
    : decoded;
};

const decodeNonEmptyArray = (decoder: RuntimeValueDecoder): RuntimeValueDecoder => (value) => {
  const decoded = decodeArray(decoder)(value);
  return decoded === INVALID_RUNTIME_VALUE || !Array.isArray(decoded) || decoded.length === 0
    ? INVALID_RUNTIME_VALUE
    : decoded;
};

const decodeRecord = (
  fields: Readonly<Record<string, RuntimeValueDecoder>>,
): RuntimeValueDecoder => (value) => {
  if (!isPlainRecord(value)) return INVALID_RUNTIME_VALUE;
  const decoded: Record<string, unknown> = {};
  for (const [key, decoder] of Object.entries(fields)) {
    const fieldValue = decoder(value[key]);
    if (fieldValue === INVALID_RUNTIME_VALUE) return INVALID_RUNTIME_VALUE;
    if (fieldValue !== undefined) decoded[key] = fieldValue;
  }
  return decoded;
};

const decodeFiniteNumberRecord = (
  keys: readonly string[],
): RuntimeValueDecoder => decodeRecord(Object.fromEntries(
  keys.map((key) => [key, decodeFiniteNumber]),
));

const decodeEnvironmentConfig = decodeRecord({
  ambientPressureKPa: decodePositiveFiniteNumber,
  ambientTemperatureK: decodePositiveFiniteNumber,
});

const decodeThermalConfig = decodeRecord({
  gasWallConductanceWPerK: decodeNonNegativeFiniteNumber,
  wallAmbientConductanceWPerK: decodeNonNegativeFiniteNumber,
  wallHeatCapacityJPerK: decodePositiveFiniteNumber,
  minimumGasHeatCapacityJPerK: decodePositiveFiniteNumber,
});

const decodePumpValveExchangeConfig = decodeRecord({
  enabled: decodeBoolean,
  gasExchangeRatePerS: decodeFiniteNumber,
  thermalConductanceWPerK: decodeFiniteNumber,
  openingDelayS: decodeFiniteNumber,
});

const decodeEnvironmentDisturbanceConfig = decodeRecord({
  enabled: decodeBoolean,
  pressureAmplitudeKPa: decodeFiniteNumber,
  temperatureAmplitudeK: decodeFiniteNumber,
  timeScaleS: decodeFiniteNumber,
});

const decodeLeakageConfig = decodeRecord({
  enabled: decodeBoolean,
  ratePerS: decodeFiniteNumber,
});

const decodeFreePhysicsConfig = decodeRecord({
  environment: decodeEnvironmentConfig,
  vesselVolumeL: decodePositiveFiniteNumber,
  gamma: decodeGamma,
  pumpAmountGainRatio: decodePositiveFiniteNumber,
  pumpWorkRetention: decodePumpWorkRetention,
  pumpPressureLimitKPa: decodePositiveFiniteNumber,
  stopcockFlowRate: decodeNonNegativeFiniteNumber,
  thermal: decodeThermalConfig,
  pumpValveExchange: decodeOptional(decodePumpValveExchangeConfig),
  environmentDisturbance: decodeOptional(decodeEnvironmentDisturbanceConfig),
  leakage: decodeLeakageConfig,
});

const decodeGuidePhysicsConfig = decodeRecord({
  environment: decodeEnvironmentConfig,
  vesselVolumeL: decodePositiveFiniteNumber,
  gamma: decodeGamma,
  pumpAmountGainRatio: decodePositiveFiniteNumber,
  pumpWorkRetention: decodePumpWorkRetention,
  pumpPressureLimitKPa: decodePositiveFiniteNumber,
  stopcockFlowRate: decodeNonNegativeFiniteNumber,
  thermal: decodeThermalConfig,
});

const decodePumpProcess = decodeRecord({
  startedAtS: decodeNonNegativeFiniteNumber,
  strength: decodeFiniteNumber,
  appliedProgress: decodeUnitInterval,
});

const decodeReleaseReference = decodeNullable(decodeRecord({
  pressureBeforeKPa: decodePositiveFiniteNumber,
  temperatureBeforeK: decodePositiveFiniteNumber,
  amountBeforeRatio: decodePositiveFiniteNumber,
  openedAtS: decodeNonNegativeFiniteNumber,
  reachedAmbientAtS: decodeNullableNonNegativeFiniteNumber,
}));

const decodeFreePhysicsState = decodeRecord({
  simulationTimeS: decodeNonNegativeFiniteNumber,
  amountMol: decodePositiveFiniteNumber,
  internalEnergyJ: decodePositiveFiniteNumber,
  referenceAmountMol: decodePositiveFiniteNumber,
  gasAmountRatio: decodePositiveFiniteNumber,
  gasTemperatureK: decodePositiveFiniteNumber,
  wallTemperatureK: decodePositiveFiniteNumber,
  pumpProcesses: decodeArray(decodePumpProcess),
  pumpStrokeCount: decodeNonNegativeInteger,
  lastPumpStrokeAtS: decodeNullableNonNegativeFiniteNumber,
  lastPumpValveOpenedAtS: decodeNullableNonNegativeFiniteNumber,
  lastPumpValveClosedAtS: decodeNullableNonNegativeFiniteNumber,
  currentPumpValveOpenDurationS: decodeNonNegativeFiniteNumber,
  environmentDisturbanceSeed: decodeStringOrNumber,
  ambientPressureOffsetKPa: decodeFiniteNumber,
  ambientTemperatureOffsetK: decodeFiniteNumber,
  effectiveAmbientPressureKPa: decodeFiniteNumber,
  effectiveAmbientTemperatureK: decodeFiniteNumber,
  maxPressureKPa: decodePositiveFiniteNumber,
  releaseStarted: decodeBoolean,
  lastStopcockOpenedAtS: decodeNullableNonNegativeFiniteNumber,
  lastStopcockClosedAtS: decodeNullableNonNegativeFiniteNumber,
  currentStopcockOpenDurationS: decodeNonNegativeFiniteNumber,
  releaseReference: decodeReleaseReference,
});

const decodeGuidePhysicsState = decodeRecord({
  simulationTimeS: decodeNonNegativeFiniteNumber,
  amountMol: decodePositiveFiniteNumber,
  internalEnergyJ: decodePositiveFiniteNumber,
  referenceAmountMol: decodePositiveFiniteNumber,
  gasAmountRatio: decodePositiveFiniteNumber,
  gasTemperatureK: decodePositiveFiniteNumber,
  wallTemperatureK: decodePositiveFiniteNumber,
  pumpProcesses: decodeArray(decodePumpProcess),
  pumpStrokeCount: decodeNonNegativeInteger,
  lastPumpStrokeAtS: decodeNullableNonNegativeFiniteNumber,
  lastPumpValveOpenedAtS: decodeNullableNonNegativeFiniteNumber,
  lastPumpValveClosedAtS: decodeNullableNonNegativeFiniteNumber,
  currentPumpValveOpenDurationS: decodeNonNegativeFiniteNumber,
  releaseStarted: decodeBoolean,
  lastStopcockOpenedAtS: decodeNullableNonNegativeFiniteNumber,
  lastStopcockClosedAtS: decodeNullableNonNegativeFiniteNumber,
  currentStopcockOpenDurationS: decodeNonNegativeFiniteNumber,
  releaseReference: decodeReleaseReference,
});

const decodeDisplaySample = decodeRecord({
  atS: decodeFiniteNumber,
  valueMv: decodeFiniteNumber,
});

const decodePressureNonlinearityConfig = decodeRecord({
  enabled: decodeBoolean,
  kneeMv: decodeFiniteNumber,
  minGain: decodeFiniteNumber,
  exponent: decodeFiniteNumber,
  extraNoiseMv: decodeFiniteNumber,
});

const decodeFreeSensorConfig = decodeRecord({
  pressureMvPerKPa: decodePositiveFiniteNumber,
  temperatureMvAtAmbient: decodeFiniteNumber,
  temperatureMvPerK: decodePositiveFiniteNumber,
  lagRate: decodePositiveFiniteNumber,
  noiseMv: decodeNonNegativeFiniteNumber,
  quantizationMv: decodeNonNegativeFiniteNumber,
  minSampleIntervalS: decodePositiveFiniteNumber,
  maxSampleIntervalS: decodePositiveFiniteNumber,
  historyWindowS: decodePositiveFiniteNumber,
  pressureNonlinearity: decodeOptional(decodePressureNonlinearityConfig),
});

const decodeFreeSensorState = decodeRecord({
  seed: decodeStringOrNumber,
  pressureInitialBiasMv: decodeFiniteNumber,
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  sensorTemperatureK: decodePositiveFiniteNumber,
  nextSampleAtS: decodeNonNegativeFiniteNumber,
  pressureHistory: decodeArray(decodeDisplaySample),
  temperatureHistory: decodeArray(decodeDisplaySample),
  pressureSlopeMvPerS: decodeFiniteNumber,
  temperatureSlopeMvPerS: decodeFiniteNumber,
  pressureReliability: decodeUnitInterval,
  pressureNonlinearErrorMv: decodeFiniteNumber,
  pressureStochasticErrorMv: decodeFiniteNumber,
});

const decodeZeroEvent = decodeRecord({
  id: decodeString,
  atS: decodeFiniteNumber,
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  zeroOffsetMv: decodeFiniteNumber,
  source: decodeLiteral(['user', 'auto']),
});

const decodeAutomaticU0 = decodeNullable(decodeRecord({
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  calibrationVersion: decodeFiniteNumber,
  zeroEventId: decodeString,
  atS: decodeFiniteNumber,
}));

const decodeFreeCalibrationState = decodeRecord({
  calibrationVersion: decodeNonNegativeInteger,
  zeroOffsetMv: decodeFiniteNumber,
  zeroEvents: decodeArray(decodeZeroEvent),
  automaticU0: decodeAutomaticU0,
});

const decodeRecordConfig = decodeFiniteNumberRecord([
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureDangerMv',
]);

const decodeReleaseState = decodeRecord({
  phase: decodeLiteral(['closed', 'opening', 'open', 'releasing', 'closing', 'closedAfterRelease']),
  purpose: decodeLiteral(['none', 'zeroing', 'release']),
  attemptId: decodeNonNegativeInteger,
  phaseStartedAtS: decodeNonNegativeFiniteNumber,
  openingStartedAtS: decodeNullableNonNegativeFiniteNumber,
  openingCompletedAtS: decodeNullableNonNegativeFiniteNumber,
  closeCommandAtS: decodeNullableNonNegativeFiniteNumber,
  closingCompletedAtS: decodeNullableNonNegativeFiniteNumber,
  releaseDurationS: decodeNonNegativeFiniteNumber,
  formedRelease: decodeBoolean,
  quickToggle: decodeBoolean,
});

const decodeRecordedPressures = decodeRecord({
  p0: decodeNullableFiniteNumber,
  p1: decodeNullableFiniteNumber,
  p2: decodeNullableFiniteNumber,
});

const HEAT_CAPACITY_PROCESS_SAMPLE_KEYS = [
  'startSample',
  'zeroedSample',
  'afterPumpSample',
  'pumpPeakSample',
  'beforeReleaseSample',
  'stableBeforeReleaseSample',
  'afterReleaseSample',
  'releaseLowSample',
  'recoverySample',
] as const;

const decodeProcessSample = decodeRecord({
  timeS: decodeFiniteNumber,
  phase: decodeLiteral([
    'powerOff',
    'readyToZero',
    'zeroed',
    'readyToPump',
    'pumping',
    'sealedStabilizing',
    'releasing',
    'recovering',
  ]),
  temperatureSignalMv: decodeFiniteNumber,
  pressureSignalMv: decodeFiniteNumber,
  gasTemperatureK: decodeFiniteNumber,
  gasPressureKPaAbs: decodeFiniteNumber,
  pressureDeltaKPa: decodeFiniteNumber,
  pumpFrequency: decodeFiniteNumber,
  pumpValveOpen: decodeBoolean,
  stopcockOpen: decodeBoolean,
});

const decodeProcessSamples: RuntimeValueDecoder = (value) => {
  if (!isPlainRecord(value)) return INVALID_RUNTIME_VALUE;
  const result: Record<string, unknown> = {};
  for (const key of HEAT_CAPACITY_PROCESS_SAMPLE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const sample = decodeProcessSample(value[key]);
    if (sample === INVALID_RUNTIME_VALUE) return INVALID_RUNTIME_VALUE;
    result[key] = sample;
  }
  return result;
};

const decodeGuideWorkflow = decodeRecord({
  step: decodeLiteral([
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
  ]),
  speedMultiplier: decodeLiteral([2, 4, 8, 16]),
  paused: decodeBoolean,
  waitStartedAtS: decodeNullableFiniteNumber,
  waitStage: decodeNullable(decodeLiteral(['u1', 'u2'])),
  strongReminderActive: decodeBoolean,
  strongReminderTargetControlId: decodeNullableString,
  wrongActionCount: decodeFiniteNumber,
  releaseCloseResumeAtMs: decodeNullableFiniteNumber,
});

const decodeGuideTemperatureSensorState = decodeRecord({
  temperatureK: decodeFiniteNumber,
});

const cloneBoundedRuntimeJson = (
  value: unknown,
  depth = 0,
): unknown | undefined => {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    return value.length <= MAX_RUNTIME_JSON_TEXT_LENGTH ? value : undefined;
  }
  if (depth >= MAX_RUNTIME_JSON_DEPTH) return undefined;
  if (Array.isArray(value)) {
    if (value.length > MAX_RUNTIME_JSON_COLLECTION_SIZE) return undefined;
    const result: unknown[] = [];
    for (const item of value) {
      const cloned = cloneBoundedRuntimeJson(item, depth + 1);
      if (cloned === undefined) return undefined;
      result.push(cloned);
    }
    return result;
  }
  if (!isPlainRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > MAX_RUNTIME_JSON_COLLECTION_SIZE) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, item] of entries) {
    if (key.length > MAX_RUNTIME_JSON_KEY_LENGTH || UNSAFE_RUNTIME_JSON_KEYS.has(key)) continue;
    const cloned = cloneBoundedRuntimeJson(item, depth + 1);
    if (cloned === undefined) return undefined;
    result[key] = cloned;
  }
  return result;
};

const decodeOpaqueRecord: RuntimeValueDecoder = (value) => {
  const cloned = cloneBoundedRuntimeJson(value);
  return isPlainRecord(cloned) ? cloned : INVALID_RUNTIME_VALUE;
};

const decodeFreeConfigSnapshotPhysics = decodeRecord({
  gamma: decodeGamma,
  vesselVolumeL: decodePositiveFiniteNumber,
  pumpAmountGainRatio: decodePositiveFiniteNumber,
  pumpWorkRetention: decodePumpWorkRetention,
  pumpPressureLimitKPa: decodePositiveFiniteNumber,
  pumpStrokeDurationS: decodePositiveFiniteNumber,
  recommendedPumpIntervalS: decodePositiveFiniteNumber,
  stopcockFlowRate: decodeNonNegativeFiniteNumber,
  openingAnimationDurationMs: decodeNonNegativeFiniteNumber,
  closingAnimationDurationMs: decodeNonNegativeFiniteNumber,
  releaseApertureRampS: decodeNonNegativeFiniteNumber,
  releaseOptimalMinS: decodeNonNegativeFiniteNumber,
  releaseOptimalMaxS: decodeNonNegativeFiniteNumber,
  autoDemoReleaseDurationS: decodeNonNegativeFiniteNumber,
  thermal: decodeThermalConfig,
  pumpValveExchange: decodeOptional(decodePumpValveExchangeConfig),
  environmentDisturbance: decodeOptional(decodeEnvironmentDisturbanceConfig),
  leakage: decodeLeakageConfig,
});

const decodeFreeConfigSnapshotSensor = decodeRecord({
  pressureMvPerKPa: decodePositiveFiniteNumber,
  temperatureMvAtAmbient: decodeFiniteNumber,
  temperatureMvPerK: decodePositiveFiniteNumber,
  lagRate: decodePositiveFiniteNumber,
  noiseMv: decodeNonNegativeFiniteNumber,
  quantizationMv: decodeNonNegativeFiniteNumber,
  minSampleIntervalS: decodePositiveFiniteNumber,
  maxSampleIntervalS: decodePositiveFiniteNumber,
  fastProcessSampleStepS: decodePositiveFiniteNumber,
  historyWindowS: decodePositiveFiniteNumber,
  pressureNonlinearity: decodeOptional(decodePressureNonlinearityConfig),
});

const decodeFreeConfigSnapshot = decodeRecord({
  version: decodeLiteral([9]),
  environment: decodeEnvironmentConfig,
  physics: decodeFreeConfigSnapshotPhysics,
  sensor: decodeFreeConfigSnapshotSensor,
  record: decodeFiniteNumberRecord([
    'u0ZeroToleranceMv',
    'pressureStableSlopeMvPerS',
    'temperatureStableSlopeMvPerS',
    'temperatureAmbientToleranceMv',
    'minimumUsefulU1CorrectedMv',
    'overVentedMinimumU2CorrectedMv',
    'pressureWarningMv',
    'pressureDangerMv',
  ]),
  scoring: decodeRecord({
    processScoringVersion: decodeLiteral(['free-process-score-v3']),
  }),
});

const decodeNullableFreeConfigSnapshot = decodeNullable(decodeFreeConfigSnapshot);

const decodeStandardReferenceAssumptions = decodeRecord({
  operationMode: decodeLiteral(['standard-operation']),
  disturbancesPreserved: decodeTrue,
  stageAligned: decodeTrue,
});

const decodeStandardReferenceExplanation = decodeRecord({
  operation: decodeString,
  windows: decodeString,
});

const decodeStandardReferenceSummaryFields: Readonly<Record<string, RuntimeValueDecoder>> = {
  feasible: decodeBoolean,
  seed: decodeFiniteNumber,
  gamma: decodeNullableFiniteNumber,
  relativeErrorPercent: decodeNullableFiniteNumber,
  targetPressureMv: decodeNullableFiniteNumber,
  targetPressureDeltaKPa: decodeNullableFiniteNumber,
  releaseDurationS: decodeNullableNonNegativeFiniteNumber,
  u1TimeS: decodeNullableNonNegativeFiniteNumber,
  u2TimeS: decodeNullableNonNegativeFiniteNumber,
  assumptions: decodeStandardReferenceAssumptions,
  explanation: decodeStandardReferenceExplanation,
};

const decodeStandardReferencePoint = decodeRecord({
  sampleId: decodeString,
  stageId: decodeLiteral(['zero', 'fill', 'pump', 'stabilize', 'release', 'recover']),
  timeS: decodeNonNegativeFiniteNumber,
  pressureDeltaKPa: decodeFiniteNumber,
  temperatureDeltaK: decodeFiniteNumber,
});

const decodeStandardReferenceStage = decodeRecord({
  id: decodeLiteral(['zero', 'fill', 'pump', 'stabilize', 'release', 'recover']),
  label: decodeString,
  startS: decodeNonNegativeFiniteNumber,
  endS: decodeNonNegativeFiniteNumber,
  countText: decodeOptional(decodeString),
  durationText: decodeOptional(decodeString),
});

const decodeStandardReferenceWindow = decodeRecord({
  recordId: decodeLiteral(['u0', 'u1', 'u2']),
  startS: decodeNonNegativeFiniteNumber,
  endS: decodeNonNegativeFiniteNumber,
  recommendedSampleId: decodeNullableString,
  recommendedTimeS: decodeNullableNonNegativeFiniteNumber,
  displayPressureMv: decodeNullableFiniteNumber,
  displayTemperatureMv: decodeNullableFiniteNumber,
  pressureDeltaKPa: decodeNullableFiniteNumber,
  temperatureDeltaK: decodeNullableFiniteNumber,
  qualityScore: decodeFiniteNumber,
  source: decodeLiteral(['standard-operation', 'actual-record', 'trace', 'automatic-u0']),
  reason: decodeString,
});

const decodeStandardReferenceSummary = decodeRecord(decodeStandardReferenceSummaryFields);

const decodeStandardReference = decodeRecord({
  generatorVersion: decodeLiteral(['free-standard-reference-v3']),
  operationPreset: decodeRecord({
    pumpStrokes: decodeNonNegativeInteger,
    pumpTotalDurationS: decodeNonNegativeFiniteNumber,
    waitAfterPumpS: decodeNonNegativeFiniteNumber,
    releaseDurationS: decodeNonNegativeFiniteNumber,
    waitAfterReleaseS: decodeNonNegativeFiniteNumber,
  }),
  configSnapshot: decodeFreeConfigSnapshot,
  trace: decodeArray(decodeStandardReferencePoint),
  stages: decodeArray(decodeStandardReferenceStage),
  recordWindows: decodeArray(decodeStandardReferenceWindow),
  summary: decodeStandardReferenceSummary,
  operationUpperBound: decodeRecord({
    gamma: decodeNullableFiniteNumber,
    relativeErrorPercent: decodeNullableFiniteNumber,
    gapFromActualPercent: decodeNullableFiniteNumber,
    windows: decodeArray(decodeStandardReferenceWindow),
  }),
  ...decodeStandardReferenceSummaryFields,
});

const decodeNullableStandardReference = decodeNullable(decodeStandardReference);

const decodeFreeParameterDraft = decodeRecord({
  ambientPressureKPa: decodeFiniteNumber,
  ambientTemperatureK: decodeFiniteNumber,
  gasWallConductanceWPerK: decodeFiniteNumber,
  wallAmbientConductanceWPerK: decodeFiniteNumber,
  leakageEnabled: decodeBoolean,
  instrumentNoiseEnabled: decodeBoolean,
  gasType: decodeLiteral(['air', 'helium']),
  wallHeatCapacityJPerK: decodeFiniteNumber,
  leakageRatePerS: decodeFiniteNumber,
  noiseMv: decodeFiniteNumber,
  sensorLagTimeS: decodeFiniteNumber,
  u0ZeroToleranceMv: decodeFiniteNumber,
  pressureStableSlopeMvPerS: decodeFiniteNumber,
  temperatureStableSlopeMvPerS: decodeFiniteNumber,
  temperatureAmbientToleranceMv: decodeFiniteNumber,
  minimumUsefulU1CorrectedMv: decodeFiniteNumber,
  overVentedMinimumU2CorrectedMv: decodeFiniteNumber,
  pressureWarningMv: decodeFiniteNumber,
  pressureDangerMv: decodeFiniteNumber,
});

const decodeFreeFileAcknowledgements = decodeRecord({
  advancedParametersRisk: decodeBoolean,
  idealParameterProfileIntro: decodeBoolean,
});

const decodePressureZeroDisplayedSample = decodeRecord({
  atMs: decodeFiniteNumber,
  valueMv: decodeFiniteNumber,
});

const decodeNullableStringOrNumber = decodeNullable(decodeStringOrNumber);

const decodeFreeRollbackSnapshot = decodeRecord({
  powerOn: decodeBoolean,
  runState: decodeLiteral(['idle', 'running', 'paused', 'finished', 'needs-reset']),
  heatCapacityPhase: decodeLiteral([
    'powerOff',
    'readyToZero',
    'zeroed',
    'readyToPump',
    'pumping',
    'sealedStabilizing',
    'releasing',
    'recovering',
  ]),
  glassPistonState: decodeLiteral(['closed', 'open']),
  stopcockAngleDeg: decodeFiniteNumber,
  pressureSignalMv: decodeNullableFiniteNumber,
  temperatureSignalMv: decodeNullableFiniteNumber,
  pressureSignalTargetMv: decodeFiniteNumber,
  temperatureSignalTargetMv: decodeFiniteNumber,
  pressureInitialBiasMv: decodeFiniteNumber,
  pressureZeroed: decodeBoolean,
  pressureZeroAdjusted: decodeBoolean,
  pressureZeroKnobAngle: decodeFiniteNumber,
  pressureZeroOffset: decodeFiniteNumber,
  pressureZeroDisplayText: decodeString,
  pressureZeroAdjustMode: decodeLiteral(['none', 'fineWheel', 'coarseDrag']),
  pressureZeroDisplayedSamples: decodeArray(decodePressureZeroDisplayedSample),
  pumpValveOpen: decodeBoolean,
  pumpValveState: decodeLiteral(['closed', 'open']),
  pumpBulbState: decodeLiteral(['idle', 'compressing', 'releasing']),
  pumpStrokeTimestamps: decodeArray(decodeFiniteNumber),
  pumpFrequency: decodeFiniteNumber,
  pumpFrequencyStatus: decodeLiteral(['idle', 'tooSlow', 'suitable']),
  lastPumpTime: decodeNullableFiniteNumber,
  pumpStrokeCount: decodeFiniteNumber,
  pumpHint: decodeString,
  heatCapacityFreePhysicsState: decodeFreePhysicsState,
  heatCapacityFreeSensorState: decodeFreeSensorState,
  heatCapacityFreeCalibrationState: decodeFreeCalibrationState,
  heatCapacityReleaseState: decodeReleaseState,
});

const decodeFreeRollbackSnapshots = decodeRecord({
  afterPowerOn: decodeNullable(decodeFreeRollbackSnapshot),
  beforePump: decodeNullable(decodeFreeRollbackSnapshot),
  beforeRelease: decodeNullable(decodeFreeRollbackSnapshot),
});

const decodeFreeAttempt: RuntimeValueDecoder = (value) => {
  const normalized = normalizeHeatCapacityFreeAttempt(value);
  return normalized ?? INVALID_RUNTIME_VALUE;
};

const decodeNullableFreeAttempt = decodeNullable(decodeFreeAttempt);

const decodeFreeTrialRecord = decodeRecord({
  atS: decodeFiniteNumber,
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  calibrationVersion: decodeFiniteNumber,
  zeroEventId: decodeString,
  source: decodeLiteral(['user']),
  phaseAtRecord: decodeNullable(decodeLiteral([
    'powerOff',
    'readyToZero',
    'zeroed',
    'readyToPump',
    'pumping',
    'sealedStabilizing',
    'releasing',
    'recovering',
  ])),
  traceTrialId: decodeNullableString,
  traceBranchId: decodeNullableString,
  traceSampleId: decodeNullableString,
  eventId: decodeNullableString,
});

const decodeFreeCorrectedSignals = decodeRecord({
  calculationVersion: decodeString,
  atmosphericPressureKPa: decodeFiniteNumber,
  pressureSensitivityMvPerKPa: decodeFiniteNumber,
  U0DisplayMv: decodeFiniteNumber,
  U1DisplayMv: decodeFiniteNumber,
  U2DisplayMv: decodeFiniteNumber,
  U1CorrectedMv: decodeFiniteNumber,
  U2CorrectedMv: decodeFiniteNumber,
  u0Source: decodeLiteral(['recorded', 'assumed-zero']),
  formulaGamma: decodeFiniteNumber,
  preheatBiasGamma: decodeFiniteNumber,
  gamma: decodeFiniteNumber,
});

const decodeFreeTrial = decodeRecord({
  id: decodeString,
  source: decodeLiteral(['free']),
  parameterScheme: decodeLiteral(['real', 'ideal']),
  traceTrialId: decodeNullableString,
  branchCount: decodeFiniteNumber,
  automaticU0: decodeAutomaticU0,
  preheatOutcome: decodeNullable(decodeLiteral(['completed', 'omitted'])),
  u0: decodeNullable(decodeFreeTrialRecord),
  u1: decodeNullable(decodeFreeTrialRecord),
  u2: decodeNullable(decodeFreeTrialRecord),
  blockedReason: decodeNullable(decodeLiteral([
    'zero-not-ready',
    'calibration-changed',
    'unstable-pressure',
    'unstable-temperature',
    'insufficient-u1',
    'release-not-started',
    'over-vented',
    'pressure-danger',
    'invalid-sequence',
  ])),
  correctedSignals: decodeNullable(decodeFreeCorrectedSignals),
  configSnapshot: decodeNullableFreeConfigSnapshot,
  standardReferenceSnapshot: decodeNullableStandardReference,
  completedAtMs: decodeNullableFiniteNumber,
});

const decodeTraceIdleState = decodeRecord({
  lastUserActionAtS: decodeNullableNonNegativeFiniteNumber,
  dormantSinceS: decodeNullableNonNegativeFiniteNumber,
  lastHeartbeatAtS: decodeNullableNonNegativeFiniteNumber,
});

const decodeFreeTraceSample = decodeRecord({
  id: decodeString,
  index: decodeNonNegativeInteger,
  atS: decodeNonNegativeFiniteNumber,
  reason: decodeLiteral([
    'periodic',
    'event',
    'record',
    'record-blocked',
    'phase-change',
    'reset',
    'heartbeat',
  ]),
  phase: decodeLiteral([
    'powerOff',
    'readyToZero',
    'zeroed',
    'readyToPump',
    'pumping',
    'sealedStabilizing',
    'releasing',
    'recovering',
  ]),
  controls: decodeRecord({
    powerOn: decodeBoolean,
    stopcockOpen: decodeBoolean,
    pumpValveOpen: decodeBoolean,
    pumpBulbState: decodeLiteral(['idle', 'compressing', 'releasing']),
    releaseFlowOpen: decodeBoolean,
    releasePhase: decodeLiteral(['closed', 'opening', 'open', 'releasing', 'closing', 'closedAfterRelease']),
    releaseDurationS: decodeNonNegativeFiniteNumber,
  }),
  physical: decodeRecord({
    gasPressureKPa: decodePositiveFiniteNumber,
    pressureDeltaKPa: decodeFiniteNumber,
    gasTemperatureK: decodePositiveFiniteNumber,
    wallTemperatureK: decodePositiveFiniteNumber,
    ambientTemperatureK: decodePositiveFiniteNumber,
    gasAmountRatio: decodePositiveFiniteNumber,
    pumpStrokeCount: decodeNonNegativeInteger,
    releaseStarted: decodeBoolean,
    currentStopcockOpenDurationS: decodeNonNegativeFiniteNumber,
    ambientPressureOffsetKPa: decodeOptional(decodeFiniteNumber),
    ambientTemperatureOffsetK: decodeOptional(decodeFiniteNumber),
    effectiveAmbientPressureKPa: decodeOptional(decodePositiveFiniteNumber),
    effectiveAmbientTemperatureK: decodeOptional(decodePositiveFiniteNumber),
  }),
  sensor: decodeRecord({
    displayPressureMv: decodeFiniteNumber,
    displayTemperatureMv: decodeFiniteNumber,
    pressureSlopeMvPerS: decodeFiniteNumber,
    temperatureSlopeMvPerS: decodeFiniteNumber,
    pressureReliability: decodeOptional(decodeUnitInterval),
    pressureNonlinearErrorMv: decodeOptional(decodeFiniteNumber),
    pressureStochasticErrorMv: decodeOptional(decodeFiniteNumber),
  }),
  calibration: decodeRecord({
    calibrationVersion: decodeNonNegativeInteger,
    zeroOffsetMv: decodeFiniteNumber,
    zeroEventId: decodeNullableString,
  }),
  stability: decodeRecord({
    pressureStable: decodeBoolean,
    temperatureStable: decodeBoolean,
  }),
  safetyStatus: decodeLiteral(['normal', 'warning', 'danger']),
});

const decodeFreeTraceEvent = decodeRecord({
  id: decodeString,
  index: decodeNonNegativeInteger,
  atS: decodeNonNegativeFiniteNumber,
  type: decodeLiteral([
    'enter-free-mode',
    'reset-free-run',
    'power-on',
    'power-off',
    'zero-calibration',
    'automatic-u0-candidate',
    'pump-valve-open',
    'pump-valve-close',
    'pump-stroke',
    'stopcock-open',
    'release-start',
    'stopcock-close',
    'record-u0',
    'record-u1',
    'record-u2',
    'record-blocked',
    'record-invalidated',
    'branch-created',
    'pressure-warning',
    'pressure-danger',
    'pressure-danger-cleared',
  ]),
  traceSampleId: decodeString,
  payload: decodeOptional(decodeOpaqueRecord),
});

const decodeFreeTraceBranch = decodeRecord({
  id: decodeString,
  parentBranchId: decodeNullableString,
  createdByEventId: decodeNullableString,
  status: decodeLiteral(['main', 'archived']),
  hiddenInDefaultChart: decodeBoolean,
  nextSampleIndex: decodeNonNegativeInteger,
  nextEventIndex: decodeNonNegativeInteger,
  nextSampleAtS: decodeNullableFiniteNumber,
  lastKeptSampleId: decodeNullableString,
  idleState: decodeTraceIdleState,
  samples: decodeArray(decodeFreeTraceSample),
  events: decodeArray(decodeFreeTraceEvent),
});

const decodeFreeTraceTrialShape = decodeRecord({
  id: decodeString,
  linkedTrialId: decodeNullableString,
  status: decodeLiteral(['active', 'completed', 'discarded']),
  activeBranchId: decodeString,
  nextBranchIndex: decodeNonNegativeInteger,
  branches: decodeNonEmptyArray(decodeFreeTraceBranch),
  configSnapshot: decodeFreeConfigSnapshot,
});

const decodeFreeTraceTrial: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeTraceTrialShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded) || !Array.isArray(decoded.branches)) {
    return INVALID_RUNTIME_VALUE;
  }
  return decoded.branches.some((branch) => (
    isPlainRecord(branch) && branch.id === decoded.activeBranchId
  ))
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const decodeFreeTraceStoreShape = decodeRecord({
  activeTraceTrialId: decodeNullableString,
  nextTraceTrialIndex: decodeNonNegativeInteger,
  traceTrials: decodeArray(decodeFreeTraceTrial),
});

const decodeFreeTraceStore: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeTraceStoreShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded) || !Array.isArray(decoded.traceTrials)) {
    return INVALID_RUNTIME_VALUE;
  }
  return decoded.activeTraceTrialId === null || decoded.traceTrials.some((trial) => (
    isPlainRecord(trial) && trial.id === decoded.activeTraceTrialId
  ))
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const decodeGuideRecord = decodeRecord({
  atS: decodeFiniteNumber,
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  calibrationVersion: decodeFiniteNumber,
  zeroEventId: decodeString,
});

const decodeGuideCorrectedSignals = decodeRecord({
  U0DisplayMv: decodeFiniteNumber,
  U1DisplayMv: decodeFiniteNumber,
  U2DisplayMv: decodeFiniteNumber,
  U1CorrectedMv: decodeFiniteNumber,
  U2CorrectedMv: decodeFiniteNumber,
  gamma: decodeFiniteNumber,
});

const decodeGuideEventLogEntry = decodeRecord({
  atS: decodeFiniteNumber,
  type: decodeLiteral([
    'workflow',
    'blocked-action',
    'record',
    'pump',
    'release',
    'timer',
    'abort',
    'complete',
  ]),
  message: decodeString,
  data: decodeOptional(decodeOpaqueRecord),
});

const decodeGuideTrial = decodeRecord({
  id: decodeString,
  source: decodeLiteral(['guide', 'demo']),
  u0: decodeNullable(decodeGuideRecord),
  u1: decodeNullable(decodeGuideRecord),
  u2: decodeNullable(decodeGuideRecord),
  correctedSignals: decodeNullable(decodeGuideCorrectedSignals),
  completedAtMs: decodeNullableFiniteNumber,
  eventLog: decodeArray(decodeGuideEventLogEntry),
});

const decodeNullableGuideTrial = decodeNullable(decodeGuideTrial);

const decodeFreeExperimentDomain = decodeRecord({
  scheme: decodeLiteral(['real', 'ideal']),
  gasType: decodeLiteral(['air', 'helium']),
  experimentGroupStatus: decodeLiteral(['draft', 'running', 'completed']),
  activeRunConfigSnapshot: decodeNullableFreeConfigSnapshot,
  recordConfig: decodeRecordConfig,
  pressureWarningMv: decodeFiniteNumber,
  instrumentNoiseEnabled: decodeBoolean,
  environmentConfig: decodeEnvironmentConfig,
  physicsConfig: decodeFreePhysicsConfig,
  physicsState: decodeFreePhysicsState,
  sensorConfig: decodeFreeSensorConfig,
  sensorState: decodeFreeSensorState,
  calibrationState: decodeFreeCalibrationState,
  releaseState: decodeReleaseState,
  rollbackSnapshots: decodeFreeRollbackSnapshots,
  traceStore: decodeFreeTraceStore,
  trials: decodeArray(decodeFreeTrial),
  activeAttempt: decodeNullableFreeAttempt,
});

const HEAT_CAPACITY_MODE_COMMON_RUNTIME_DECODERS = {
  runState: decodeLiteral(['idle', 'running', 'paused', 'finished', 'needs-reset']),
  heatCapacityTeachingStatus: decodeLiteral(['idle', 'running', 'completed']),
  heatCapacityExperimentSeed: decodeNullableStringOrNumber,
  heatCapacityExperimentProfile: decodeTeachingProfile,
  heatCapacityPhase: decodeLiteral([
    'powerOff',
    'readyToZero',
    'zeroed',
    'readyToPump',
    'pumping',
    'sealedStabilizing',
    'releasing',
    'recovering',
  ]),
  powerOn: decodeBoolean,
  glassPistonState: decodeLiteral(['closed', 'open']),
  stopcockAngleDeg: decodeFiniteNumber,
  ambientPressureKPa: decodePositiveFiniteNumber,
  ambientTemperatureK: decodePositiveFiniteNumber,
  gasPressureKPaAbs: decodePositiveFiniteNumber,
  gasTemperatureK: decodePositiveFiniteNumber,
  sensorTemperatureK: decodePositiveFiniteNumber,
  pressureDeltaKPa: decodeFiniteNumber,
  simulationTimeS: decodeNonNegativeFiniteNumber,
  lastUpdateMs: decodeNullableNonNegativeFiniteNumber,
  pressureSignalMvRaw: decodeFiniteNumber,
  pressureSignalMvDisplayed: decodeFiniteNumber,
  pressureInitialBiasMv: decodeFiniteNumber,
  temperatureSignalTargetMv: decodeFiniteNumber,
  pressureSignalTargetMv: decodeFiniteNumber,
  displayResponseLastUpdateMs: decodeNullableNonNegativeFiniteNumber,
  pressureZeroDisplayedSamples: decodeArray(decodePressureZeroDisplayedSample),
  pressureDisplayJitterOffset: decodeFiniteNumber,
  pressureDisplayNextJitterAtMs: decodeNonNegativeFiniteNumber,
  temperatureDisplayJitterOffset: decodeFiniteNumber,
  temperatureDisplayNextJitterAtMs: decodeNonNegativeFiniteNumber,
  pressureZeroed: decodeBoolean,
  pressureZeroAdjusted: decodeBoolean,
  pressureZeroKnobAngle: decodeFiniteNumber,
  pressureZeroOffset: decodeFiniteNumber,
  pressureZeroDisplayText: decodeString,
  releaseRecoveryTargetDeltaKPa: decodeNullableFiniteNumber,
  pressureSignalRawReadoutMv: decodeFiniteNumber,
  pressureSignalReadoutMv: decodeFiniteNumber,
  pressureGaugeTargetValue: decodeNonNegativeFiniteNumber,
  pressureGaugeDisplayValue: decodeNonNegativeFiniteNumber,
  pressureGaugeNeedleAngle: decodeFiniteNumber,
  gaugePressureMinKPa: decodeNonNegativeFiniteNumber,
  gaugePressureMaxKPa: decodePositiveFiniteNumber,
  pressureWarningThresholdKPa: decodeNonNegativeFiniteNumber,
  pressureSafeThresholdKPa: decodeNonNegativeFiniteNumber,
  pressureSafetyThresholdKPa: decodeNonNegativeFiniteNumber,
  pressureSafetyStatus: decodeLiteral(['normal', 'warning', 'danger']),
  pressureSafetyMessage: decodeNullableString,
  pressureBlockedPumping: decodeBoolean,
  pressureOverLimit: decodeBoolean,
  pressureZeroMvPerTurn: decodePositiveFiniteNumber,
  pressureZeroAdjustMode: decodeLiteral(['none', 'fineWheel', 'coarseDrag']),
  temperatureSignalMv: decodeNullableFiniteNumber,
  pressureSignalMv: decodeNullableFiniteNumber,
  pressureKPa: decodeNullableFiniteNumber,
  pressureLimitKPa: decodePositiveFiniteNumber,
  pumpValveOpen: decodeBoolean,
  pumpValveState: decodeLiteral(['closed', 'open']),
  pumpBulbState: decodeLiteral(['idle', 'compressing', 'releasing']),
  pumpStrokeTimestamps: decodeArray(decodeNonNegativeFiniteNumber),
  pumpFrequency: decodeNonNegativeFiniteNumber,
  pumpFrequencyStatus: decodeLiteral(['idle', 'tooSlow', 'suitable']),
  lastPumpTime: decodeNullableNonNegativeFiniteNumber,
  pumpStrokeCount: decodeNonNegativeInteger,
  pumpHint: decodeString,
  heatCapacityReleaseState: decodeReleaseState,
  hardSphereViewEnabled: decodeBoolean,
  visualizationMode: decodeLiteral(['particle']),
  calculationModel: decodeLiteral(['airHeatCapacityRatio']),
  pressureSensitivityMvPerKPa: decodePositiveFiniteNumber,
  vesselPressureReadoutKPa: decodePositiveFiniteNumber,
  vesselTemperatureReadoutK: decodePositiveFiniteNumber,
  recordedPressures: decodeRecordedPressures,
  heatCapacityProcessSamples: decodeProcessSamples,
  theoreticalGamma: decodePositiveFiniteNumber,
} satisfies Record<
  typeof HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS[number],
  RuntimeValueDecoder
>;

const decodeCommonRuntime = decodeRecord(HEAT_CAPACITY_MODE_COMMON_RUNTIME_DECODERS);

const HEAT_CAPACITY_FREE_RUNTIME_DECODERS = {
  heatCapacityFreePreheatCompleted: decodeBoolean,
  heatCapacityFreeRuntimeVersion: decodeLiteral([5]),
  heatCapacityFreeExperimentGroupStatus: decodeLiteral(['draft', 'running', 'completed']),
  heatCapacityFreeGasType: decodeLiteral(['air', 'helium']),
  heatCapacityFreeParameterDraft: decodeFreeParameterDraft,
  heatCapacityFreeActiveRunConfigSnapshot: decodeNullableFreeConfigSnapshot,
  heatCapacityFreeFileAcknowledgements: decodeFreeFileAcknowledgements,
  heatCapacityFreeParameterScheme: decodeLiteral(['real', 'ideal']),
  heatCapacityFreeDisplayScheme: decodeLiteral(['real', 'ideal']),
  heatCapacityFreeRealDomain: decodeFreeExperimentDomain,
  heatCapacityFreeIdealDomain: decodeFreeExperimentDomain,
  heatCapacityFreeRecordConfig: decodeRecordConfig,
  heatCapacityFreePressureWarningMv: decodeNonNegativeFiniteNumber,
  heatCapacityFreeInstrumentNoiseEnabled: decodeBoolean,
  heatCapacityFreeEnvironmentConfig: decodeEnvironmentConfig,
  heatCapacityFreePhysicsConfig: decodeFreePhysicsConfig,
  heatCapacityFreePhysicsState: decodeFreePhysicsState,
  heatCapacityFreeSensorConfig: decodeFreeSensorConfig,
  heatCapacityFreeSensorState: decodeFreeSensorState,
  heatCapacityFreeCalibrationState: decodeFreeCalibrationState,
  heatCapacityFreeEquilibriumSpeedMultiplier: decodeLiteral([2, 4, 8, 16]),
  heatCapacityFreeRollbackSnapshots: decodeFreeRollbackSnapshots,
  heatCapacityFreeTraceVersion: decodeLiteral([5]),
  heatCapacityFreeTraceStore: decodeFreeTraceStore,
  heatCapacityFreeTrials: decodeArray(decodeFreeTrial),
  heatCapacityFreeActiveAttempt: decodeNullableFreeAttempt,
} satisfies Record<
  typeof HEAT_CAPACITY_FREE_SESSION_KEYS[number],
  RuntimeValueDecoder
>;

const HEAT_CAPACITY_GUIDE_RUNTIME_DECODERS = {
  heatCapacityGuidePhysicsConfig: decodeGuidePhysicsConfig,
  heatCapacityGuidePhysicsState: decodeGuidePhysicsState,
  heatCapacityGuideTemperatureSensorState: decodeGuideTemperatureSensorState,
  heatCapacityGuideWorkflow: decodeGuideWorkflow,
  heatCapacityGuideTrial: decodeNullableGuideTrial,
} satisfies Record<
  typeof HEAT_CAPACITY_GUIDE_SESSION_KEYS[number],
  RuntimeValueDecoder
>;

const decodeFreeRuntime = decodeRecord(HEAT_CAPACITY_FREE_RUNTIME_DECODERS);
const decodeGuideRuntime = decodeRecord(HEAT_CAPACITY_GUIDE_RUNTIME_DECODERS);

const normalizeRuntimeSnapshot = (
  value: unknown,
  expectedMode: HeatCapacityMode,
  expectedFileId: string,
): HeatCapacityModeRuntimeSnapshot | null => {
  if (
    !isPlainRecord(value) ||
    value.schemaVersion !== HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION ||
    value.fileId !== expectedFileId ||
    value.mode !== expectedMode ||
    !isPlainRecord(value.common)
  ) return null;
  const decodedCommonRuntime = decodeCommonRuntime(value.common);
  if (decodedCommonRuntime === INVALID_RUNTIME_VALUE) return null;
  const modeKey = expectedMode;
  const modeRuntime = value[modeKey];
  if (!isPlainRecord(modeRuntime)) return null;
  const decodedModeRuntime = expectedMode === 'free'
    ? decodeFreeRuntime(modeRuntime)
    : decodeGuideRuntime(modeRuntime);
  if (decodedModeRuntime === INVALID_RUNTIME_VALUE) return null;
  const common = decodedCommonRuntime as HeatCapacityModeCommonRuntimeSnapshot;
  const canonicalModeRuntime = decodedModeRuntime as Record<string, unknown>;
  if (expectedMode === 'free') {
    return {
      schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
      fileId: expectedFileId,
      mode: 'free',
      common,
      free: canonicalModeRuntime as HeatCapacityFreeModeRuntimeSnapshot,
    };
  }
  const guideRuntime = canonicalModeRuntime as HeatCapacityGuideModeRuntimeSnapshot;
  return expectedMode === 'guide'
    ? {
        schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
        fileId: expectedFileId,
        mode: 'guide',
        common,
        guide: guideRuntime,
      }
    : {
        schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
        fileId: expectedFileId,
        mode: 'demo',
        common,
        demo: guideRuntime,
      };
};

const normalizeEntry = (
  value: unknown,
  expectedMode: HeatCapacityMode,
  expectedFileId: string,
): HeatCapacityModeSessionEntry => {
  if (!isPlainRecord(value)) return createEmptyHeatCapacityModeSessionEntry();
  if (value.status === 'empty') return createEmptyHeatCapacityModeSessionEntry();
  if (value.status !== 'suspended' && value.status !== 'completed') {
    return createEmptyHeatCapacityModeSessionEntry();
  }
  const resumeRunState = value.resumeRunState;
  if (
    resumeRunState !== 'idle' &&
    resumeRunState !== 'running' &&
    resumeRunState !== 'paused' &&
    resumeRunState !== 'finished' &&
    resumeRunState !== 'needs-reset'
  ) return createEmptyHeatCapacityModeSessionEntry();
  const capturedAtMs = typeof value.capturedAtMs === 'number' &&
    Number.isFinite(value.capturedAtMs) &&
    value.capturedAtMs >= 0
    ? value.capturedAtMs
    : null;
  if (capturedAtMs === null) return createEmptyHeatCapacityModeSessionEntry();
  const snapshot = normalizeRuntimeSnapshot(value.snapshot, expectedMode, expectedFileId);
  if (!snapshot) return createEmptyHeatCapacityModeSessionEntry();
  const uiCheckpoint = value.uiCheckpoint === null
    ? null
    : normalizeHeatCapacityModeUiCheckpoint(value.uiCheckpoint, {
        expectedFileId,
        expectedMode,
      });
  if (value.uiCheckpoint !== null && !uiCheckpoint) {
    return createEmptyHeatCapacityModeSessionEntry();
  }
  return {
    status: value.status,
    resumeRunState: resumeRunState as WorkbenchRunState,
    capturedAtMs,
    snapshot,
    uiCheckpoint,
  };
};

export const normalizeHeatCapacityModeSessionStore = (
  value: unknown,
  expectedFileId: string,
): HeatCapacityModeSessionStore => {
  try {
    if (
      !isPlainRecord(value) ||
      value.schemaVersion !== HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION ||
      typeof expectedFileId !== 'string' ||
      expectedFileId.trim().length === 0
    ) {
      return createDefaultHeatCapacityModeSessionStore();
    }
    return {
      schemaVersion: HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
      demo: normalizeEntry(value.demo, 'demo', expectedFileId),
      guide: normalizeEntry(value.guide, 'guide', expectedFileId),
      free: normalizeEntry(value.free, 'free', expectedFileId),
    };
  } catch {
    return createDefaultHeatCapacityModeSessionStore();
  }
};
