import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S,
  normalizeHeatCapacityFreeAttempt,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import { getFreeCorrectedSignals } from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  deriveFreePhysicalState,
  getFreePumpStrokeProgress,
  synchronizeFreePhysicsThermodynamicState,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getEffectiveHeatCapacityFreeSensorConfig,
  getHeatCapacityFreeGasTypeGamma,
  normalizeHeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  createHeatCapacityFreeIdealEffectiveConfigs,
} from '../../domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts';
import {
  calculateFreeSensorHistorySlope,
  getFreeSensorDisplay,
  type HeatCapacityFreeSensorConfig,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityFreeStandardReference,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import { truncateHeatCapacitySignalMv } from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import type {
  HeatCapacityFreeConfigSnapshot,
  HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  calculateGuideHeatCapacityTrialSignals,
  type HeatCapacityGuideTrial,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import { deriveHeatCapacityGuideExperimentTimer } from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import {
  createDefaultGuidePhysicsConfig,
  deriveGuidePhysicalState,
  getGuidePumpStrokeProgress,
  migrateGuidePhysicsState,
  type HeatCapacityGuidePhysicsConfig,
  type HeatCapacityGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import type {
  HeatCapacityGuideWorkflowState,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import { normalizeHeatCapacityTeachingProfile } from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeSensorConfig,
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  isHeatCapacityMainReleaseFlowOpen,
  isHeatCapacityReleaseFlowOpen,
  isHeatCapacityReleaseStateSemanticallyValid,
  type HeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import type {
  HeatCapacityModeUiCheckpoint,
} from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import { normalizeHeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  normalizeHeatCapacityFreePhysicsConfig,
  normalizeHeatCapacityFreeSensorConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import type {
  HeatCapacityFreeExperimentDomainState,
  HeatCapacityFreeRollbackSnapshot,
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

const HEAT_CAPACITY_MODE_OWNED_RUNTIME_KEYS = [
  ...HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS,
  ...HEAT_CAPACITY_FREE_SESSION_KEYS,
  ...HEAT_CAPACITY_GUIDE_SESSION_KEYS,
] as const;

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

export const createHeatCapacityModeRuntimeShell = (
  file: WorkbenchHeatCapacityState,
  defaults: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const modeRuntimeDefaults = Object.fromEntries(
    HEAT_CAPACITY_MODE_OWNED_RUNTIME_KEYS.map((key) => [key, defaults[key]]),
  ) as Partial<WorkbenchHeatCapacityState>;
  return {
    ...file,
    ...modeRuntimeDefaults,
    heatCapacityMode: file.heatCapacityMode,
    heatCapacityModeSessions: createDefaultHeatCapacityModeSessionStore(),
  };
};

export const createHeatCapacityCommonRuntimeShell = (
  file: WorkbenchHeatCapacityState,
  defaults: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => ({
  ...file,
  ...pickHeatCapacitySessionFields(defaults, HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS),
  heatCapacityMode: file.heatCapacityMode,
  heatCapacityModeSessions: file.heatCapacityModeSessions,
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

const createFreeModeSessionDomainFromProjection = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => {
  const scheme = file.heatCapacityFreeParameterScheme;
  return {
    scheme,
    gasType: scheme === 'ideal' ? 'air' : file.heatCapacityFreeGasType,
    experimentGroupStatus: file.heatCapacityFreeExperimentGroupStatus,
    activeRunConfigSnapshot: file.heatCapacityFreeActiveRunConfigSnapshot,
    recordConfig: file.heatCapacityFreeRecordConfig,
    pressureWarningMv: file.heatCapacityFreePressureWarningMv,
    instrumentNoiseEnabled: file.heatCapacityFreeInstrumentNoiseEnabled,
    environmentConfig: file.heatCapacityFreeEnvironmentConfig,
    physicsConfig: file.heatCapacityFreePhysicsConfig,
    physicsState: file.heatCapacityFreePhysicsState,
    sensorConfig: file.heatCapacityFreeSensorConfig,
    sensorState: file.heatCapacityFreeSensorState,
    calibrationState: file.heatCapacityFreeCalibrationState,
    releaseState: file.heatCapacityReleaseState,
    rollbackSnapshots: file.heatCapacityFreeRollbackSnapshots,
    traceStore: file.heatCapacityFreeTraceStore,
    trials: file.heatCapacityFreeTrials.map((trial) => (
      trial.parameterScheme === scheme ? trial : { ...trial, parameterScheme: scheme }
    )),
    activeAttempt: file.heatCapacityFreeActiveAttempt,
  };
};

export const captureHeatCapacityModeRuntimeSnapshot = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityModeRuntimeSnapshot => {
  const common = pickHeatCapacitySessionFields(file, HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS);
  if (file.heatCapacityMode === 'free') {
    const free = pickHeatCapacitySessionFields(file, HEAT_CAPACITY_FREE_SESSION_KEYS);
    const activeDomain = createFreeModeSessionDomainFromProjection(file);
    return {
      schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
      fileId: file.id,
      mode: 'free',
      common,
      free: {
        ...free,
        heatCapacityFreeGasType: activeDomain.gasType,
        heatCapacityFreeExperimentGroupStatus: activeDomain.experimentGroupStatus,
        heatCapacityFreeActiveRunConfigSnapshot: activeDomain.activeRunConfigSnapshot,
        heatCapacityFreeRecordConfig: activeDomain.recordConfig,
        heatCapacityFreePressureWarningMv: activeDomain.pressureWarningMv,
        heatCapacityFreeInstrumentNoiseEnabled: activeDomain.instrumentNoiseEnabled,
        heatCapacityFreeEnvironmentConfig: activeDomain.environmentConfig,
        heatCapacityFreePhysicsConfig: activeDomain.physicsConfig,
        heatCapacityFreePhysicsState: activeDomain.physicsState,
        heatCapacityFreeSensorConfig: activeDomain.sensorConfig,
        heatCapacityFreeSensorState: activeDomain.sensorState,
        heatCapacityFreeCalibrationState: activeDomain.calibrationState,
        heatCapacityFreeRollbackSnapshots: activeDomain.rollbackSnapshots,
        heatCapacityFreeTraceStore: activeDomain.traceStore,
        heatCapacityFreeRealDomain: file.heatCapacityFreeParameterScheme === 'real'
          ? activeDomain
          : free.heatCapacityFreeRealDomain,
        heatCapacityFreeIdealDomain: file.heatCapacityFreeParameterScheme === 'ideal'
          ? activeDomain
          : free.heatCapacityFreeIdealDomain,
        heatCapacityFreeTrials: activeDomain.trials,
        heatCapacityFreeActiveAttempt: activeDomain.activeAttempt,
      },
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

const shiftModeSessionTimestamp = (value: number | null, offsetMs: number) => (
  value === null ? null : value + offsetMs
);

const rebaseFreeRollbackSnapshotWallClock = (
  snapshot: HeatCapacityFreeRollbackSnapshot | null,
  offsetMs: number,
): HeatCapacityFreeRollbackSnapshot | null => snapshot === null
  ? null
  : {
      ...snapshot,
      pressureZeroDisplayedSamples: snapshot.pressureZeroDisplayedSamples.map((sample) => ({
        ...sample,
        atMs: sample.atMs + offsetMs,
      })),
      pumpStrokeTimestamps: snapshot.pumpStrokeTimestamps.map((timestamp) => timestamp + offsetMs),
      lastPumpTime: shiftModeSessionTimestamp(snapshot.lastPumpTime, offsetMs),
    };

const rebaseFreeDomainWallClock = (
  domain: HeatCapacityFreeExperimentDomainState,
  offsetMs: number,
): HeatCapacityFreeExperimentDomainState => ({
  ...domain,
  rollbackSnapshots: {
    afterPowerOn: rebaseFreeRollbackSnapshotWallClock(domain.rollbackSnapshots.afterPowerOn, offsetMs),
    beforePump: rebaseFreeRollbackSnapshotWallClock(domain.rollbackSnapshots.beforePump, offsetMs),
    beforeRelease: rebaseFreeRollbackSnapshotWallClock(domain.rollbackSnapshots.beforeRelease, offsetMs),
  },
  activeAttempt: domain.activeAttempt === null
    ? null
    : {
        ...domain.activeAttempt,
        startedAtWallClockMs: domain.activeAttempt.startedAtWallClockMs + offsetMs,
        powerOffStartedAtWallClockMs: shiftModeSessionTimestamp(
          domain.activeAttempt.powerOffStartedAtWallClockMs,
          offsetMs,
        ),
        invalidatedAtWallClockMs: shiftModeSessionTimestamp(
          domain.activeAttempt.invalidatedAtWallClockMs,
          offsetMs,
        ),
      },
});

const rebaseModeSessionCommonWallClock = (
  common: HeatCapacityModeCommonRuntimeSnapshot,
  offsetMs: number,
): HeatCapacityModeCommonRuntimeSnapshot => ({
  ...common,
  lastUpdateMs: shiftModeSessionTimestamp(common.lastUpdateMs, offsetMs),
  displayResponseLastUpdateMs: shiftModeSessionTimestamp(common.displayResponseLastUpdateMs, offsetMs),
  pressureZeroDisplayedSamples: common.pressureZeroDisplayedSamples.map((sample) => ({
    ...sample,
    atMs: sample.atMs + offsetMs,
  })),
  pressureDisplayNextJitterAtMs: common.pressureDisplayNextJitterAtMs + offsetMs,
  temperatureDisplayNextJitterAtMs: common.temperatureDisplayNextJitterAtMs + offsetMs,
  pumpStrokeTimestamps: common.pumpStrokeTimestamps.map((timestamp) => timestamp + offsetMs),
  lastPumpTime: shiftModeSessionTimestamp(common.lastPumpTime, offsetMs),
});

export const restoreHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  now = Date.now(),
): WorkbenchHeatCapacityState | null => {
  const entry = file.heatCapacityModeSessions[mode];
  const snapshot = entry.snapshot;
  if (!snapshot || snapshot.mode !== mode || snapshot.fileId !== file.id) return null;
  const restoredRunState: WorkbenchRunState = mode === 'demo'
    ? entry.status === 'completed' ? 'idle' : 'paused'
    : entry.resumeRunState;
  const resumesPhysicalClock = mode !== 'demo';
  const offsetMs = entry.capturedAtMs === null ? 0 : Math.max(0, now - entry.capturedAtMs);
  const rebasedCommon = rebaseModeSessionCommonWallClock(snapshot.common, offsetMs);
  const rebasedModeRuntime = snapshot.mode === 'free'
    ? (() => {
        const realDomain = rebaseFreeDomainWallClock(
          snapshot.free.heatCapacityFreeRealDomain,
          offsetMs,
        );
        const idealDomain = rebaseFreeDomainWallClock(
          snapshot.free.heatCapacityFreeIdealDomain,
          offsetMs,
        );
        const activeDomain = snapshot.free.heatCapacityFreeParameterScheme === 'ideal'
          ? idealDomain
          : realDomain;
        return {
          ...snapshot.free,
          heatCapacityFreeRealDomain: realDomain,
          heatCapacityFreeIdealDomain: idealDomain,
          heatCapacityFreeRollbackSnapshots: activeDomain.rollbackSnapshots,
          heatCapacityFreeActiveAttempt: activeDomain.activeAttempt,
        };
      })()
    : {
        ...(snapshot.mode === 'guide' ? snapshot.guide : snapshot.demo),
        heatCapacityGuideWorkflow: {
          ...(snapshot.mode === 'guide'
            ? snapshot.guide.heatCapacityGuideWorkflow
            : snapshot.demo.heatCapacityGuideWorkflow),
          releaseCloseResumeAtMs: shiftModeSessionTimestamp(
            snapshot.mode === 'guide'
              ? snapshot.guide.heatCapacityGuideWorkflow.releaseCloseResumeAtMs
              : snapshot.demo.heatCapacityGuideWorkflow.releaseCloseResumeAtMs,
            offsetMs,
          ),
        },
      };
  return {
    ...file,
    ...rebasedCommon,
    ...rebasedModeRuntime,
    heatCapacityMode: mode,
    runState: restoredRunState,
    lastUpdateMs: resumesPhysicalClock ? now : rebasedCommon.lastUpdateMs,
    displayResponseLastUpdateMs: resumesPhysicalClock ? now : rebasedCommon.displayResponseLastUpdateMs,
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

const areRuntimeValuesStructurallyEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => areRuntimeValuesStructurallyEqual(value, right[index]));
  }
  if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] &&
      areRuntimeValuesStructurallyEqual(left[key], right[key]));
};

const areRuntimeNumbersClose = (left: unknown, right: number, tolerance = 0.000001) => (
  typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) <= tolerance
);

const roundRuntimeNumber = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

const decodeFreePhysicsConfigShape = decodeRecord({
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

const decodeFreePhysicsConfig: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreePhysicsConfigShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const canonical = normalizeHeatCapacityFreePhysicsConfig(decoded);
  return areRuntimeValuesStructurallyEqual(decoded, canonical) &&
    decoded.stopcockFlowRate === createDefaultHeatCapacityFreePhysicsConfig().stopcockFlowRate
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const decodeGuidePhysicsConfigShape = decodeRecord({
  environment: decodeEnvironmentConfig,
  vesselVolumeL: decodePositiveFiniteNumber,
  gamma: decodeGamma,
  pumpAmountGainRatio: decodePositiveFiniteNumber,
  pumpWorkRetention: decodePumpWorkRetention,
  pumpPressureLimitKPa: decodePositiveFiniteNumber,
  stopcockFlowRate: decodeNonNegativeFiniteNumber,
  thermal: decodeThermalConfig,
});

const decodeGuidePhysicsConfig: RuntimeValueDecoder = (value) => {
  const decoded = decodeGuidePhysicsConfigShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const canonical = createDefaultGuidePhysicsConfig();
  const { environment: _decodedEnvironment, ...decodedFixedConfig } = decoded;
  const { environment: _canonicalEnvironment, ...canonicalFixedConfig } = canonical;
  return areRuntimeValuesStructurallyEqual(decodedFixedConfig, canonicalFixedConfig)
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

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

const decodeFreeSensorConfigShape = decodeRecord({
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

const decodeFreeSensorConfig: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeSensorConfigShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const canonical = normalizeHeatCapacityFreeSensorConfig(decoded);
  return areRuntimeValuesStructurallyEqual(decoded, canonical)
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

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

const decodeRecordConfig = decodeRecord({
  u0ZeroToleranceMv: decodeNonNegativeFiniteNumber,
  pressureStableSlopeMvPerS: decodeNonNegativeFiniteNumber,
  temperatureStableSlopeMvPerS: decodeNonNegativeFiniteNumber,
  temperatureAmbientToleranceMv: decodeNonNegativeFiniteNumber,
  minimumUsefulU1CorrectedMv: decodeNonNegativeFiniteNumber,
  overVentedMinimumU2CorrectedMv: decodeNonNegativeFiniteNumber,
  pressureDangerMv: decodeNonNegativeFiniteNumber,
});

const decodeReleaseStateShape = decodeRecord({
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

const decodeReleaseState: RuntimeValueDecoder = (value) => {
  const decoded = decodeReleaseStateShape(value);
  return decoded !== INVALID_RUNTIME_VALUE && isPlainRecord(decoded) &&
    isHeatCapacityReleaseStateSemanticallyValid(decoded as unknown as HeatCapacityReleaseState)
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

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
  waitStartedAtS: decodeNullableNonNegativeFiniteNumber,
  waitStage: decodeNullable(decodeLiteral(['u1', 'u2'])),
  strongReminderActive: decodeBoolean,
  strongReminderTargetControlId: decodeNullableString,
  wrongActionCount: decodeNonNegativeInteger,
  releaseCloseResumeAtMs: decodeNullableNonNegativeFiniteNumber,
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

const decodeFreeConfigSnapshotShape = decodeRecord({
  version: decodeLiteral([9]),
  environment: decodeEnvironmentConfig,
  physics: decodeFreeConfigSnapshotPhysics,
  sensor: decodeFreeConfigSnapshotSensor,
  record: decodeRecord({
    u0ZeroToleranceMv: decodeNonNegativeFiniteNumber,
    pressureStableSlopeMvPerS: decodeNonNegativeFiniteNumber,
    temperatureStableSlopeMvPerS: decodeNonNegativeFiniteNumber,
    temperatureAmbientToleranceMv: decodeNonNegativeFiniteNumber,
    minimumUsefulU1CorrectedMv: decodeNonNegativeFiniteNumber,
    overVentedMinimumU2CorrectedMv: decodeNonNegativeFiniteNumber,
    pressureWarningMv: decodeNonNegativeFiniteNumber,
    pressureDangerMv: decodeNonNegativeFiniteNumber,
  }),
  scoring: decodeRecord({
    processScoringVersion: decodeLiteral(['free-process-score-v3']),
  }),
});

const LEGACY_STANDARD_REFERENCE_TIMING = {
  releaseOptimalMinS: 0.3,
  releaseOptimalMaxS: 0.5,
  autoDemoReleaseDurationS: 0.375,
} as const;

const decodeFreeConfigSnapshot: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeConfigSnapshotShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const snapshot = decoded as unknown as HeatCapacityFreeConfigSnapshot;
  const canonicalPhysicsConfig = normalizeHeatCapacityFreePhysicsConfig({
    ...snapshot.physics,
    environment: snapshot.environment,
  });
  const canonicalSensorConfig = normalizeHeatCapacityFreeSensorConfig(snapshot.sensor);
  const parameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    canonicalPhysicsConfig,
    canonicalSensorConfig,
    snapshot.record,
    snapshot.record.pressureWarningMv,
    canonicalSensorConfig.noiseMv > 0,
  );
  if (!areRuntimeValuesStructurallyEqual(
    parameterDraft,
    normalizeHeatCapacityFreeParameterDraft(parameterDraft),
  )) return INVALID_RUNTIME_VALUE;
  const canonicalSnapshot = createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs({
    environmentConfig: canonicalPhysicsConfig.environment,
    physicsConfig: canonicalPhysicsConfig,
    sensorConfig: canonicalSensorConfig,
    recordConfig: snapshot.record,
    pressureWarningMv: snapshot.record.pressureWarningMv,
  });
  const legacySnapshot = isPlainRecord(decoded.physics) &&
    decoded.physics.releaseOptimalMinS === LEGACY_STANDARD_REFERENCE_TIMING.releaseOptimalMinS &&
    decoded.physics.releaseOptimalMaxS === LEGACY_STANDARD_REFERENCE_TIMING.releaseOptimalMaxS &&
    decoded.physics.autoDemoReleaseDurationS === LEGACY_STANDARD_REFERENCE_TIMING.autoDemoReleaseDurationS &&
    areRuntimeValuesStructurallyEqual({
      ...decoded,
      physics: {
        ...decoded.physics,
        releaseOptimalMinS: canonicalSnapshot.physics.releaseOptimalMinS,
        releaseOptimalMaxS: canonicalSnapshot.physics.releaseOptimalMaxS,
        autoDemoReleaseDurationS: canonicalSnapshot.physics.autoDemoReleaseDurationS,
      },
    }, canonicalSnapshot);
  return areRuntimeValuesStructurallyEqual(decoded, canonicalSnapshot) || legacySnapshot
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

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

const decodeStandardReferenceShape = decodeRecord({
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

const STANDARD_REFERENCE_SUMMARY_KEYS = Object.keys(decodeStandardReferenceSummaryFields);
const STANDARD_REFERENCE_REQUIRED_STAGE_IDS = [
  'zero', 'pump', 'stabilize', 'release', 'recover',
] as const;
const STANDARD_REFERENCE_OPERATION_PRESET_KEYS = [
  'pumpStrokes',
  'pumpTotalDurationS',
  'waitAfterPumpS',
  'releaseDurationS',
  'waitAfterReleaseS',
] as const;

const LEGACY_STANDARD_REFERENCE_OPERATION = {
  pumpStrokes: 18,
  pumpTotalDurationS: 8,
  waitAfterPumpS: 300,
  releaseDurationS: 0.375,
  waitAfterReleaseS: 300,
} as const;

const hasStandardReferenceOperationPreset = (
  operationPreset: Record<string, unknown>,
  expected: Readonly<Record<typeof STANDARD_REFERENCE_OPERATION_PRESET_KEYS[number], number>>,
) => STANDARD_REFERENCE_OPERATION_PRESET_KEYS.every((key) => (
  operationPreset[key] === expected[key]
));

const hasLegacyStandardReferenceTiming = (decoded: Record<string, unknown>) => {
  const configSnapshot = decoded.configSnapshot;
  const physics = isPlainRecord(configSnapshot) ? configSnapshot.physics : null;
  return isPlainRecord(decoded.operationPreset) &&
    hasStandardReferenceOperationPreset(decoded.operationPreset, LEGACY_STANDARD_REFERENCE_OPERATION) &&
    isPlainRecord(physics) &&
    physics.releaseOptimalMinS === LEGACY_STANDARD_REFERENCE_TIMING.releaseOptimalMinS &&
    physics.releaseOptimalMaxS === LEGACY_STANDARD_REFERENCE_TIMING.releaseOptimalMaxS &&
    physics.autoDemoReleaseDurationS === LEGACY_STANDARD_REFERENCE_TIMING.autoDemoReleaseDurationS;
};

const isStandardReferenceWindowSemanticsValid = (
  window: Record<string, unknown>,
  sampleIds: Set<unknown>,
) => {
  if ((window.endS as number) < (window.startS as number)) return false;
  if (window.recommendedSampleId === null) return true;
  if (window.source === 'trace') return sampleIds.has(window.recommendedSampleId);
  if (window.source === 'standard-operation') {
    return window.recommendedSampleId === `standard-${window.recordId}`;
  }
  return true;
};

const decodeStandardReference: RuntimeValueDecoder = (value) => {
  const decoded = decodeStandardReferenceShape(value);
  if (
    decoded === INVALID_RUNTIME_VALUE ||
    !isPlainRecord(decoded) ||
    !isPlainRecord(decoded.operationPreset) ||
    !Array.isArray(decoded.trace) || decoded.trace.length === 0 ||
    !Array.isArray(decoded.stages) || decoded.stages.length === 0 ||
    !Array.isArray(decoded.recordWindows) || decoded.recordWindows.length === 0 ||
    !isPlainRecord(decoded.summary) ||
    !isPlainRecord(decoded.operationUpperBound) ||
    !Array.isArray(decoded.operationUpperBound.windows)
  ) return INVALID_RUNTIME_VALUE;
  const trace = decoded.trace.filter(isPlainRecord);
  const stages = decoded.stages.filter(isPlainRecord);
  const windows = decoded.recordWindows.filter(isPlainRecord);
  const upperBoundWindows = decoded.operationUpperBound.windows.filter(isPlainRecord);
  if (
    trace.length !== decoded.trace.length ||
    stages.length !== decoded.stages.length ||
    windows.length !== decoded.recordWindows.length ||
    upperBoundWindows.length !== decoded.operationUpperBound.windows.length ||
    (decoded.operationPreset.pumpStrokes as number) <= 0 ||
    !(
      hasStandardReferenceOperationPreset(decoded.operationPreset, HEAT_CAPACITY_STANDARD_OPERATION) ||
      hasLegacyStandardReferenceTiming(decoded)
    ) ||
    decoded.releaseDurationS !== decoded.operationPreset.releaseDurationS ||
    decoded.summary.releaseDurationS !== decoded.operationPreset.releaseDurationS
  ) return INVALID_RUNTIME_VALUE;
  const traceSampleIds = trace.map((point) => point.sampleId);
  const stageIds = stages.map((stage) => stage.id);
  const recordIds = windows.map((window) => window.recordId);
  const rootSummary = Object.fromEntries(
    STANDARD_REFERENCE_SUMMARY_KEYS.map((key) => [key, decoded[key]]),
  );
  const sampleIdSet = new Set(traceSampleIds);
  return hasUniqueValues(traceSampleIds) &&
    hasUniqueValues(stageIds) &&
    stageIds.length === STANDARD_REFERENCE_REQUIRED_STAGE_IDS.length &&
    STANDARD_REFERENCE_REQUIRED_STAGE_IDS.every((stageId) => stageIds.includes(stageId)) &&
    trace.every((point) => stageIds.includes(point.stageId)) &&
    hasUniqueValues(recordIds) &&
    recordIds.length === 3 &&
    ['u0', 'u1', 'u2'].every((recordId) => recordIds.includes(recordId)) &&
    stages.every((stage) => (stage.endS as number) >= (stage.startS as number)) &&
    windows.every((window) => isStandardReferenceWindowSemanticsValid(window, sampleIdSet)) &&
    areRuntimeValuesStructurallyEqual(windows, upperBoundWindows) &&
    areRuntimeValuesStructurallyEqual(rootSummary, decoded.summary)
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const decodeNullableStandardReference = decodeNullable(decodeStandardReference);

const decodeFreeParameterDraftShape = decodeRecord({
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

const decodeFreeParameterDraft: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeParameterDraftShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  return areRuntimeValuesStructurallyEqual(
    decoded,
    normalizeHeatCapacityFreeParameterDraft(decoded),
  )
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

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
  atS: decodeNonNegativeFiniteNumber,
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  calibrationVersion: decodeNonNegativeInteger,
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

const decodeFreeCorrectedSignalsShape = decodeRecord({
  calculationVersion: decodeLiteral(['log-pressure-v1']),
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

const areFreeSignalNumbersClose = (left: number, right: number) => (
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.00001
);

const decodeFreeCorrectedSignals: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeCorrectedSignalsShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const corrected = getFreeCorrectedSignals({
    U0DisplayMv: decoded.U0DisplayMv as number,
    U1DisplayMv: decoded.U1DisplayMv as number,
    U2DisplayMv: decoded.U2DisplayMv as number,
  }, {
    atmosphericPressureKPa: decoded.atmosphericPressureKPa as number,
    pressureSensitivityMvPerKPa: decoded.pressureSensitivityMvPerKPa as number,
  });
  const formulaGamma = decoded.formulaGamma as number;
  const preheatBiasGamma = decoded.preheatBiasGamma as number;
  return areFreeSignalNumbersClose(decoded.U1CorrectedMv as number, corrected.U1CorrectedMv) &&
    areFreeSignalNumbersClose(decoded.U2CorrectedMv as number, corrected.U2CorrectedMv) &&
    areFreeSignalNumbersClose(formulaGamma, corrected.gamma) &&
    areFreeSignalNumbersClose(decoded.gamma as number, formulaGamma + preheatBiasGamma)
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const decodeFreeTrialShape = decodeRecord({
  id: decodeString,
  source: decodeLiteral(['free']),
  parameterScheme: decodeLiteral(['real', 'ideal']),
  traceTrialId: decodeNullableString,
  branchCount: decodeNonNegativeInteger,
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

const isLegacyUntracedFreeTrial = (trial: HeatCapacityFreeTrial) => {
  const records = [trial.u0, trial.u1, trial.u2].filter((record) => record !== null);
  const isBlockedBeforeAnyRecord = records.length === 0 &&
    trial.blockedReason !== null &&
    trial.correctedSignals === null;
  return (records.length > 0 || isBlockedBeforeAnyRecord) &&
    trial.traceTrialId === null &&
    trial.branchCount === 0 &&
    trial.configSnapshot === null &&
    trial.standardReferenceSnapshot === null &&
    trial.completedAtMs === null &&
    records.every((record) => (
      record.source === 'user' &&
      record.traceTrialId === null &&
      record.traceBranchId === null &&
      record.traceSampleId === null &&
      record.eventId === null
    ));
};

const isHistoricalArchivedCompletedFreeTrial = (trial: HeatCapacityFreeTrial) => {
  return trial.completedAtMs !== null &&
    typeof trial.traceTrialId === 'string' &&
    trial.traceTrialId.trim().length > 0 &&
    trial.branchCount > 0 &&
    trial.configSnapshot !== null &&
    trial.standardReferenceSnapshot !== null &&
    hasLegacyStandardReferenceTiming(
      trial.standardReferenceSnapshot as unknown as Record<string, unknown>,
    ) &&
    areRuntimeValuesStructurallyEqual(
      trial.standardReferenceSnapshot.configSnapshot,
      trial.configSnapshot,
    );
};

const isFreeTrialSignalSemanticsValid = (trial: HeatCapacityFreeTrial) => {
  const signals = trial.correctedSignals;
  const legacyUntraced = isLegacyUntracedFreeTrial(trial);
  if (
    trial.u2 !== null && (signals === null || (trial.configSnapshot === null && !legacyUntraced)) ||
    trial.completedAtMs !== null && (
      trial.completedAtMs < 0 ||
      trial.standardReferenceSnapshot === null
    )
  ) return false;
  if (signals === null) return trial.completedAtMs === null;
  if (trial.u1 === null || trial.u2 === null) return false;
  if (trial.preheatOutcome === null) return false;
  if (trial.configSnapshot === null && !legacyUntraced) return false;
  if (
    (trial.preheatOutcome === 'completed' && !areFreeSignalNumbersClose(signals.preheatBiasGamma, 0)) ||
    (trial.preheatOutcome === 'omitted' && Math.abs(signals.preheatBiasGamma) > 0.0100001)
  ) return false;
  const expectedAtmosphericPressureKPa = trial.configSnapshot?.environment.ambientPressureKPa ??
    signals.atmosphericPressureKPa;
  const expectedPressureSensitivityMvPerKPa = trial.configSnapshot?.sensor.pressureMvPerKPa ??
    signals.pressureSensitivityMvPerKPa;
  if (
    expectedAtmosphericPressureKPa <= 0 ||
    expectedPressureSensitivityMvPerKPa <= 0 ||
    (trial.configSnapshot !== null && (
      !areFreeSignalNumbersClose(signals.atmosphericPressureKPa, expectedAtmosphericPressureKPa) ||
      !areFreeSignalNumbersClose(signals.pressureSensitivityMvPerKPa, expectedPressureSensitivityMvPerKPa)
    ))
  ) return false;
  const expectedU0DisplayMv = trial.u0?.displayPressureMv ?? 0;
  const corrected = getFreeCorrectedSignals({
    U0DisplayMv: expectedU0DisplayMv,
    U1DisplayMv: trial.u1.displayPressureMv,
    U2DisplayMv: trial.u2.displayPressureMv,
  }, {
    atmosphericPressureKPa: expectedAtmosphericPressureKPa,
    pressureSensitivityMvPerKPa: expectedPressureSensitivityMvPerKPa,
  });
  return signals.u0Source === (trial.u0 === null ? 'assumed-zero' : 'recorded') &&
    areFreeSignalNumbersClose(signals.U0DisplayMv, expectedU0DisplayMv) &&
    areFreeSignalNumbersClose(signals.U1DisplayMv, trial.u1.displayPressureMv) &&
    areFreeSignalNumbersClose(signals.U2DisplayMv, trial.u2.displayPressureMv) &&
    areFreeSignalNumbersClose(signals.U1CorrectedMv, corrected.U1CorrectedMv) &&
    areFreeSignalNumbersClose(signals.U2CorrectedMv, corrected.U2CorrectedMv) &&
    areFreeSignalNumbersClose(signals.formulaGamma, corrected.gamma) &&
    areFreeSignalNumbersClose(signals.gamma, signals.formulaGamma + signals.preheatBiasGamma);
};

const decodeFreeTrial: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeTrialShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const trial = decoded as unknown as HeatCapacityFreeTrial;
  if (trial.u2 !== null && trial.u1 === null) return INVALID_RUNTIME_VALUE;
  const records = [trial.u0, trial.u1, trial.u2].filter((record) => record !== null);
  const firstRecord = records[0];
  if (firstRecord && (
    firstRecord.zeroEventId.trim().length === 0 ||
    records.some((record, index) => (
      record.calibrationVersion !== firstRecord.calibrationVersion ||
      record.zeroEventId !== firstRecord.zeroEventId ||
      (index > 0 && record.atS < records[index - 1]!.atS)
    ))
  )) return INVALID_RUNTIME_VALUE;
  return isFreeTrialSignalSemanticsValid(trial) ? decoded : INVALID_RUNTIME_VALUE;
};

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

const readIndexedId = (value: unknown, prefix: string) => {
  if (typeof value !== 'string') return null;
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(value);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const hasUniqueValues = (values: unknown[]) => new Set(values).size === values.length;

const hasStrictlyIncreasingNumbers = (values: unknown[]) => values.every((value, index) => (
  typeof value === 'number' && (
    index === 0 || value > (values[index - 1] as number)
  )
));

const hasNonDecreasingNumbers = (values: unknown[]) => values.every((value, index) => (
  typeof value === 'number' && (
    index === 0 || value >= (values[index - 1] as number)
  )
));

const isFreeTraceBranchIntegrityValid = (
  branch: Record<string, unknown>,
  branchIds: Set<string>,
  eventIds: Set<string>,
) => {
  if (!Array.isArray(branch.samples) || !Array.isArray(branch.events)) return false;
  const samples = branch.samples.filter(isPlainRecord);
  const events = branch.events.filter(isPlainRecord);
  if (samples.length !== branch.samples.length || events.length !== branch.events.length) return false;
  const sampleIds = samples.map((sample) => sample.id);
  const sampleIndexes = samples.map((sample) => sample.index);
  const sampleTimes = samples.map((sample) => sample.atS);
  const branchEventIds = events.map((event) => event.id);
  const eventIndexes = events.map((event) => event.index);
  const eventTimes = events.map((event) => event.atS);
  if (
    !hasUniqueValues(sampleIds) ||
    !hasUniqueValues(sampleIndexes) ||
    !hasUniqueValues(branchEventIds) ||
    !hasUniqueValues(eventIndexes) ||
    !hasStrictlyIncreasingNumbers(sampleIndexes) ||
    !hasStrictlyIncreasingNumbers(eventIndexes) ||
    !hasNonDecreasingNumbers(sampleTimes) ||
    !hasNonDecreasingNumbers(eventTimes) ||
    samples.some((sample) => sample.id !== `sample-${sample.index}`) ||
    events.some((event) => event.id !== `event-${event.index}`)
  ) return false;
  const sampleIdSet = new Set(sampleIds.filter((id): id is string => typeof id === 'string'));
  const maxSampleIndex = sampleIndexes.reduce<number>((maximum, index) => (
    typeof index === 'number' ? Math.max(maximum, index) : maximum
  ), 0);
  const maxEventIndex = eventIndexes.reduce<number>((maximum, index) => (
    typeof index === 'number' ? Math.max(maximum, index) : maximum
  ), 0);
  const expectedLastKeptSampleId = samples[samples.length - 1]?.id ?? null;
  if (
    typeof branch.nextSampleIndex !== 'number' || branch.nextSampleIndex <= maxSampleIndex ||
    typeof branch.nextEventIndex !== 'number' || branch.nextEventIndex <= maxEventIndex ||
    (branch.nextSampleAtS !== null && (
      typeof branch.nextSampleAtS !== 'number' || branch.nextSampleAtS < 0
    )) ||
    branch.lastKeptSampleId !== expectedLastKeptSampleId ||
    branch.parentBranchId === branch.id ||
    (branch.parentBranchId !== null && !branchIds.has(branch.parentBranchId as string)) ||
    (branch.createdByEventId !== null && !eventIds.has(branch.createdByEventId as string)) ||
    events.some((event) => !sampleIdSet.has(event.traceSampleId as string))
  ) return false;
  return true;
};

const hasFreeTraceBranchParentCycle = (branches: Record<string, unknown>[]) => {
  const branchById = new Map(branches.map((branch) => [branch.id as string, branch]));
  return branches.some((branch) => {
    const visited = new Set<string>();
    let current: Record<string, unknown> | undefined = branch;
    while (current && current.parentBranchId !== null) {
      const currentId = current.id as string;
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      current = branchById.get(current.parentBranchId as string);
    }
    return false;
  });
};

const decodeFreeTraceTrial: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeTraceTrialShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded) || !Array.isArray(decoded.branches)) {
    return INVALID_RUNTIME_VALUE;
  }
  const branches = decoded.branches.filter(isPlainRecord);
  if (branches.length !== decoded.branches.length) return INVALID_RUNTIME_VALUE;
  const branchIdValues = branches.map((branch) => branch.id);
  if (!hasUniqueValues(branchIdValues)) return INVALID_RUNTIME_VALUE;
  const branchIds = new Set(branchIdValues.filter((id): id is string => typeof id === 'string'));
  const eventIds = new Set(branches.flatMap((branch) => (
    Array.isArray(branch.events)
      ? branch.events.filter(isPlainRecord).map((event) => event.id).filter((id): id is string => typeof id === 'string')
      : []
  )));
  const maximumBranchIndex = Math.max(
    branches.length,
    ...branchIdValues.map((id) => readIndexedId(id, 'branch') ?? 0),
  );
  const activeBranch = branches.find((branch) => branch.id === decoded.activeBranchId);
  const mainBranches = branches.filter((branch) => branch.status === 'main');
  return activeBranch?.status === 'main' &&
    mainBranches.length === 1 &&
    mainBranches[0]?.id === decoded.activeBranchId &&
    branches.every((branch) => (
      branch.status === 'main'
        ? branch.hiddenInDefaultChart === false
        : branch.hiddenInDefaultChart === true
    )) &&
    !hasFreeTraceBranchParentCycle(branches) &&
    typeof decoded.nextBranchIndex === 'number' &&
    decoded.nextBranchIndex > maximumBranchIndex &&
    branches.every((branch) => isFreeTraceBranchIntegrityValid(branch, branchIds, eventIds))
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
  const trials = decoded.traceTrials.filter(isPlainRecord);
  if (trials.length !== decoded.traceTrials.length) return INVALID_RUNTIME_VALUE;
  const trialIds = trials.map((trial) => trial.id);
  if (!hasUniqueValues(trialIds)) return INVALID_RUNTIME_VALUE;
  const maximumTrialIndex = Math.max(
    trials.length,
    ...trialIds.map((id) => readIndexedId(id, 'free-trace-trial') ?? 0),
  );
  const activeTraceTrial = trials.find((trial) => trial.id === decoded.activeTraceTrialId);
  const activeTraceTrials = trials.filter((trial) => trial.status === 'active');
  return (
    decoded.activeTraceTrialId === null
      ? activeTraceTrials.length === 0
      : activeTraceTrials.length === 1 && activeTraceTrial?.status === 'active'
  ) && typeof decoded.nextTraceTrialIndex === 'number' &&
    decoded.nextTraceTrialIndex > maximumTrialIndex
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const isFreeRecordTraceReferenceValid = (
  record: Record<string, unknown>,
  expectedTraceTrialId: string | null,
  expectedEventType: 'record-u0' | 'record-u1' | 'record-u2',
  traceTrialById: Map<string, Record<string, unknown>>,
) => {
  const traceTrialId = record.traceTrialId as string | null;
  const traceBranchId = record.traceBranchId as string | null;
  const traceSampleId = record.traceSampleId as string | null;
  const eventId = record.eventId as string | null;
  if (expectedTraceTrialId === null) {
    return traceTrialId === null && traceBranchId === null && traceSampleId === null && eventId === null;
  }
  if (
    traceTrialId !== expectedTraceTrialId ||
    traceBranchId === null ||
    traceSampleId === null ||
    eventId === null
  ) return false;
  const traceTrial = traceTrialById.get(traceTrialId);
  if (!traceTrial || !Array.isArray(traceTrial.branches)) return false;
  const branch = traceTrial.branches.find((candidate) => (
    isPlainRecord(candidate) && candidate.id === traceBranchId
  ));
  if (!isPlainRecord(branch) || !Array.isArray(branch.samples) || !Array.isArray(branch.events)) return false;
  const sample = branch.samples.find((candidate) => (
    isPlainRecord(candidate) && candidate.id === traceSampleId
  ));
  if (
    !isPlainRecord(sample) ||
    !isPlainRecord(sample.sensor) ||
    !isPlainRecord(sample.calibration)
  ) return false;
  const event = branch.events.find((candidate) => (
    isPlainRecord(candidate) && candidate.id === eventId
  ));
  return isPlainRecord(event) &&
    event.type === expectedEventType &&
    event.traceSampleId === traceSampleId &&
    areRuntimeNumbersClose(event.atS, sample.atS as number) &&
    areRuntimeNumbersClose(record.atS, sample.atS as number) &&
    areRuntimeNumbersClose(
      record.displayPressureMv,
      truncateHeatCapacitySignalMv(sample.sensor.displayPressureMv as number),
    ) &&
    areRuntimeNumbersClose(
      record.displayTemperatureMv,
      truncateHeatCapacitySignalMv(sample.sensor.displayTemperatureMv as number),
    ) &&
    record.calibrationVersion === sample.calibration.calibrationVersion &&
    record.zeroEventId === sample.calibration.zeroEventId &&
    record.phaseAtRecord === sample.phase;
};

const findFreeTraceBranch = (
  traceTrial: Record<string, unknown>,
  branchId: unknown,
) => {
  if (typeof branchId !== 'string' || !Array.isArray(traceTrial.branches)) return null;
  const branch = traceTrial.branches.find((candidate) => (
    isPlainRecord(candidate) && candidate.id === branchId
  ));
  return isPlainRecord(branch) ? branch : null;
};

const getFreeTraceBranchEvents = (branch: Record<string, unknown>) => (
  Array.isArray(branch.events) ? branch.events.filter(isPlainRecord) : []
);

const getFreeTraceBranchSamples = (branch: Record<string, unknown>) => (
  Array.isArray(branch.samples) ? branch.samples.filter(isPlainRecord) : []
);

export const HEAT_CAPACITY_LEGACY_423_U1_ANCHOR_PROVENANCE =
  'legacy-4.2.3/u1-pump-stroke-anchor';
const LEGACY_423_FREE_STOPCOCK_FLOW_RATE = 5.25;

const hasLegacy423U1WaitAnchorProvenance = (
  traceTrial: Record<string, unknown>,
  u1RecordEvent: Record<string, unknown> | undefined,
) => (
  isPlainRecord(traceTrial.configSnapshot) &&
  traceTrial.configSnapshot.version === 9 &&
  isPlainRecord(traceTrial.configSnapshot.physics) &&
  traceTrial.configSnapshot.physics.stopcockFlowRate === LEGACY_423_FREE_STOPCOCK_FLOW_RATE &&
  isPlainRecord(u1RecordEvent?.payload) &&
  u1RecordEvent.payload.hslMigrationProvenance ===
    HEAT_CAPACITY_LEGACY_423_U1_ANCHOR_PROVENANCE
);

const isFreeReleaseTraceTimelineValid = (
  trial: Record<string, unknown>,
  traceTrial: Record<string, unknown>,
) => {
  if (!isPlainRecord(trial.u1) || !isPlainRecord(trial.u2)) return false;
  const u1 = trial.u1;
  const u2 = trial.u2;
  const u1AtS = u1.atS;
  const u2AtS = u2.atS;
  if (typeof u1AtS !== 'number' || typeof u2AtS !== 'number') return false;
  const u1Branch = findFreeTraceBranch(traceTrial, u1.traceBranchId);
  const u2Branch = findFreeTraceBranch(traceTrial, u2.traceBranchId);
  if (!u1Branch || !u2Branch) return false;
  const u1Events = getFreeTraceBranchEvents(u1Branch);
  const u1RecordEvent = u1Events.find((event) => (
    event.id === u1.eventId &&
    event.type === 'record-u1' &&
    event.traceSampleId === u1.traceSampleId
  ));
  const u1WaitAnchorEventType = hasLegacy423U1WaitAnchorProvenance(traceTrial, u1RecordEvent)
    ? 'pump-stroke'
    : 'pump-valve-close';

  const u1WaitAnchorEvents = u1Events.filter((event) => (
    event.type === u1WaitAnchorEventType &&
    typeof event.atS === 'number' &&
    event.atS <= u1AtS + 0.000001
  ));
  const u1WaitAnchorEvent = u1WaitAnchorEvents[u1WaitAnchorEvents.length - 1];
  if (
    !u1WaitAnchorEvent ||
    typeof u1WaitAnchorEvent.atS !== 'number' ||
    u1AtS - u1WaitAnchorEvent.atS + 0.000001 < HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S
  ) return false;

  const u2Events = getFreeTraceBranchEvents(u2Branch);
  const releaseStartEvents = u2Events.filter((event) => (
    event.type === 'release-start' &&
    typeof event.atS === 'number' &&
    event.atS >= u1AtS - 0.000001 &&
    event.atS <= u2AtS + 0.000001
  ));
  if (releaseStartEvents.length !== 1) return false;
  const releaseStartEvent = releaseStartEvents[0]!;
  const releaseStartAtS = releaseStartEvent.atS as number;
  const releasePayload = releaseStartEvent.payload;
  const releaseSample = getFreeTraceBranchSamples(u2Branch).find((sample) => (
    sample.id === releaseStartEvent.traceSampleId
  ));
  if (
    releaseStartAtS + 0.000001 < u1AtS ||
    !isPlainRecord(releasePayload) ||
    !Number.isSafeInteger(releasePayload.attemptId) ||
    (releasePayload.attemptId as number) < 1 ||
    releasePayload.formedRelease !== true ||
    !areRuntimeNumbersClose(releasePayload.openingCompletedAtS, releaseStartAtS) ||
    !areRuntimeNumbersClose(releasePayload.releaseDurationS, 0) ||
    !isPlainRecord(releaseSample) ||
    !areRuntimeNumbersClose(releaseSample.atS, releaseStartAtS) ||
    !isPlainRecord(releaseSample.controls) ||
    !isPlainRecord(releaseSample.physical) ||
    releaseSample.controls.releaseFlowOpen !== true ||
    (releaseSample.controls.releasePhase !== 'open' && releaseSample.controls.releasePhase !== 'releasing') ||
    releaseSample.physical.releaseStarted !== true
  ) return false;

  const releaseCloseEvents = u2Events.filter((event) => (
    event.type === 'stopcock-close' &&
    typeof event.atS === 'number' &&
    event.atS >= releaseStartAtS - 0.000001 &&
    event.atS <= u2AtS + 0.000001
  ));
  if (releaseCloseEvents.length !== 1) return false;
  const releaseCloseEvent = releaseCloseEvents[0]!;
  const releaseCloseAtS = releaseCloseEvent.atS as number;
  const releaseClosePayload = releaseCloseEvent.payload;
  if (
    !isPlainRecord(releaseClosePayload) ||
    releaseClosePayload.attemptId !== releasePayload.attemptId ||
    releaseClosePayload.purpose !== 'release' ||
    releaseClosePayload.formedRelease !== true ||
    releaseClosePayload.quickToggle !== false ||
    !areRuntimeNumbersClose(releaseClosePayload.openingCompletedAtS, releaseStartAtS) ||
    !areRuntimeNumbersClose(releaseClosePayload.closeCommandAtS, releaseCloseAtS) ||
    !areRuntimeNumbersClose(
      releaseClosePayload.releaseDurationS,
      releaseCloseAtS - releaseStartAtS,
    )
  ) return false;

  const releaseClosedSample = getFreeTraceBranchSamples(u2Branch).find((sample) => (
    typeof sample.atS === 'number' &&
    sample.atS >= releaseCloseAtS - 0.000001 &&
    isPlainRecord(sample.controls) &&
    sample.controls.releasePhase === 'closedAfterRelease' &&
    isPlainRecord(sample.physical) &&
    sample.physical.releaseStarted === true
  ));
  return isPlainRecord(releaseClosedSample) &&
    typeof releaseClosedSample.atS === 'number' &&
    u2AtS - releaseClosedSample.atS + 0.000001 >= HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S;
};

const isFreeTrialCollectionIntegrityValid = (
  traceStore: Record<string, unknown>,
  trialsValue: unknown[],
) => {
  if (!Array.isArray(traceStore.traceTrials)) return false;
  const traceTrials = traceStore.traceTrials.filter(isPlainRecord);
  const trials = trialsValue.filter(isPlainRecord);
  if (traceTrials.length !== traceStore.traceTrials.length || trials.length !== trialsValue.length) return false;
  const trialIds = trials.map((trial) => trial.id);
  if (!hasUniqueValues(trialIds)) return false;
  const trialIdSet = new Set(trialIds.filter((id): id is string => typeof id === 'string'));
  const traceTrialById = new Map(traceTrials.map((trial) => [trial.id as string, trial]));
  const referencedTraceTrialIds = trials
    .map((trial) => trial.traceTrialId)
    .filter((id): id is string => typeof id === 'string');
  if (!hasUniqueValues(referencedTraceTrialIds)) return false;
  if (traceTrials.some((traceTrial) => (
    traceTrial.linkedTrialId !== null && !trialIdSet.has(traceTrial.linkedTrialId as string)
  ))) return false;
  return trials.every((trial) => {
    const traceTrialId = trial.traceTrialId as string | null;
    const traceTrial = traceTrialId === null ? null : traceTrialById.get(traceTrialId) ?? null;
    const historicalArchivedTrial = isHistoricalArchivedCompletedFreeTrial(
      trial as unknown as HeatCapacityFreeTrial,
    );
    if (
      historicalArchivedTrial &&
      (
        traceTrial === null ||
        (traceTrial.status === 'active' && traceTrial.linkedTrialId === null)
      )
    ) return true;
    if (
      (traceTrialId === null && trial.branchCount !== 0) ||
      (traceTrialId !== null && traceTrial === null) ||
      (traceTrial !== null && (
        !Array.isArray(traceTrial.branches) ||
        trial.branchCount !== traceTrial.branches.length ||
        (traceTrial.linkedTrialId !== null && traceTrial.linkedTrialId !== trial.id)
      ))
    ) return false;
    if (isLegacyUntracedFreeTrial(trial as unknown as HeatCapacityFreeTrial)) return true;
    const standardReference = trial.standardReferenceSnapshot;
    const completed = trial.completedAtMs !== null;
    if (
      (standardReference !== null) !== completed ||
      (completed && (
        traceTrial?.status !== 'completed' ||
        traceTrial.linkedTrialId !== trial.id ||
        traceStore.activeTraceTrialId === traceTrialId
      )) ||
      (!completed && traceTrial !== null && (
        traceTrial.status !== 'active' ||
        traceStore.activeTraceTrialId !== traceTrialId ||
        traceTrial.linkedTrialId !== null
      )) ||
      (trial.u2 !== null && (
        traceTrial === null ||
        !isFreeReleaseTraceTimelineValid(trial, traceTrial)
      ))
    ) return false;
    if (
      trial.configSnapshot !== null && (
        traceTrial === null ||
        !isPlainRecord(traceTrial.configSnapshot) ||
        !areRuntimeValuesStructurallyEqual(trial.configSnapshot, traceTrial.configSnapshot)
      )
    ) return false;
    if (trial.completedAtMs !== null && traceTrial?.status !== 'completed') return false;
    if (standardReference !== null) {
      if (
        traceTrial === null ||
        !isPlainRecord(standardReference) ||
        !isPlainRecord(trial.configSnapshot) ||
        !isPlainRecord(traceTrial.configSnapshot) ||
        !areRuntimeValuesStructurallyEqual(trial.configSnapshot, traceTrial.configSnapshot) ||
        !areRuntimeValuesStructurallyEqual(standardReference.configSnapshot, trial.configSnapshot)
      ) return false;
      const expectedReference = createHeatCapacityFreeStandardReference({
        traceTrial: traceTrial as unknown as HeatCapacityFreeTraceTrial,
        trial: trial as unknown as HeatCapacityFreeTrial,
        theoreticalGamma: (traceTrial as unknown as HeatCapacityFreeTraceTrial).configSnapshot.physics.gamma,
      });
      if (!areRuntimeValuesStructurallyEqual(standardReference, expectedReference)) return false;
    }
    return ([
      ['u0', 'record-u0'],
      ['u1', 'record-u1'],
      ['u2', 'record-u2'],
    ] as const).every(([recordKey, expectedEventType]) => {
      const record = trial[recordKey];
      return record === null || (
        isPlainRecord(record) &&
        isFreeRecordTraceReferenceValid(record, traceTrialId, expectedEventType, traceTrialById)
      );
    });
  });
};

const decodeGuideRecord = decodeRecord({
  atS: decodeNonNegativeFiniteNumber,
  displayPressureMv: decodeFiniteNumber,
  displayTemperatureMv: decodeFiniteNumber,
  calibrationVersion: decodeNonNegativeInteger,
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
  atS: decodeNonNegativeFiniteNumber,
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

const decodeGuideTrialShape = decodeRecord({
  id: decodeString,
  source: decodeLiteral(['guide', 'demo']),
  u0: decodeNullable(decodeGuideRecord),
  u1: decodeNullable(decodeGuideRecord),
  u2: decodeNullable(decodeGuideRecord),
  correctedSignals: decodeNullable(decodeGuideCorrectedSignals),
  completedAtMs: decodeNullableNonNegativeFiniteNumber,
  eventLog: decodeArray(decodeGuideEventLogEntry),
});

const GUIDE_SIGNAL_KEYS = [
  'U0DisplayMv',
  'U1DisplayMv',
  'U2DisplayMv',
  'U1CorrectedMv',
  'U2CorrectedMv',
  'gamma',
] as const;

const decodeGuideTrial: RuntimeValueDecoder = (value) => {
  const decoded = decodeGuideTrialShape(value);
  if (decoded === INVALID_RUNTIME_VALUE || !isPlainRecord(decoded)) return INVALID_RUNTIME_VALUE;
  const trial = decoded as unknown as HeatCapacityGuideTrial;
  const hasU0 = trial.u0 !== null;
  const hasU1 = trial.u1 !== null;
  const hasU2 = trial.u2 !== null;
  if ((!hasU0 && (hasU1 || hasU2)) || (!hasU1 && hasU2)) return INVALID_RUNTIME_VALUE;
  const records = [trial.u0, trial.u1, trial.u2].filter((record) => record !== null);
  const firstRecord = records[0];
  if (firstRecord && (
    firstRecord.zeroEventId.trim().length === 0 ||
    records.some((record, index) => (
      record.calibrationVersion !== firstRecord.calibrationVersion ||
      record.zeroEventId !== firstRecord.zeroEventId ||
      (index > 0 && record.atS < records[index - 1]!.atS)
    ))
  )) return INVALID_RUNTIME_VALUE;
  if (trial.eventLog.some((entry, index) => (
    index > 0 && entry.atS < trial.eventLog[index - 1]!.atS
  ))) return INVALID_RUNTIME_VALUE;
  if (trial.completedAtMs !== null && (!hasU0 || !hasU1 || !hasU2 || trial.correctedSignals === null)) {
    return INVALID_RUNTIME_VALUE;
  }
  return decoded;
};

interface GuideTrialSignalContext {
  atmosphericPressureKPa: number;
  pressureSensitivityMvPerKPa: number;
}

const isGuideTrialSignalSemanticsValid = (
  trial: HeatCapacityGuideTrial | null,
  context: GuideTrialSignalContext,
) => {
  if (trial === null) return true;
  const expectedSignals = calculateGuideHeatCapacityTrialSignals(trial, context);
  return (trial.correctedSignals === null) === (expectedSignals === null) && (
    trial.correctedSignals === null || expectedSignals === null ||
    GUIDE_SIGNAL_KEYS.every((key) => trial.correctedSignals![key] === expectedSignals[key])
  );
};

const decodeNullableGuideTrial = decodeNullable(decodeGuideTrial);

const THERMODYNAMIC_STATE_KEYS = [
  'amountMol',
  'internalEnergyJ',
  'referenceAmountMol',
  'gasAmountRatio',
  'gasTemperatureK',
  'wallTemperatureK',
] as const;

const isSimulationTimelineTimestamp = (
  value: number | null,
  simulationTimeS: number,
) => value === null || (
  Number.isFinite(value) && value >= 0 && value <= simulationTimeS + 0.000001
);

const isReleaseTimelineWithinSimulationTime = (
  releaseState: HeatCapacityReleaseState,
  simulationTimeS: number,
) => [
  releaseState.phaseStartedAtS,
  releaseState.openingStartedAtS,
  releaseState.openingCompletedAtS,
  releaseState.closeCommandAtS,
  releaseState.closingCompletedAtS,
].every((value) => isSimulationTimelineTimestamp(value, simulationTimeS));

const isPumpProcessProjectionConsistent = (
  state: HeatCapacityFreePhysicsState | HeatCapacityGuidePhysicsState,
) => {
  if (state.pumpStrokeCount === 0) {
    return state.lastPumpStrokeAtS === null && state.pumpProcesses.length === 0;
  }
  if (
    state.lastPumpStrokeAtS === null ||
    state.pumpProcesses.length > state.pumpStrokeCount
  ) return false;
  const getProgress = 'environmentDisturbanceSeed' in state
    ? getFreePumpStrokeProgress
    : getGuidePumpStrokeProgress;
  if (state.pumpProcesses.length > 0 && !areRuntimeNumbersClose(
    state.pumpProcesses.at(-1)?.startedAtS,
    state.lastPumpStrokeAtS,
  )) return false;
  return state.pumpProcesses.every((process) => {
    const expectedProgress = getProgress(state.simulationTimeS - process.startedAtS);
    return process.strength === 1 &&
      expectedProgress < 1 &&
      areRuntimeNumbersClose(process.appliedProgress, expectedProgress);
  });
};

const isPhysicsTimelineWithinSimulationTime = (
  state: HeatCapacityFreePhysicsState | HeatCapacityGuidePhysicsState,
) => {
  const simulationTimeS = state.simulationTimeS;
  const pumpProcessTimes = state.pumpProcesses.map((process) => process.startedAtS);
  return hasNonDecreasingNumbers(pumpProcessTimes) && state.pumpProcesses.every((process) => (
    isSimulationTimelineTimestamp(process.startedAtS, simulationTimeS)
  )) && isPumpProcessProjectionConsistent(state) && [
    state.lastPumpStrokeAtS,
    state.lastPumpValveOpenedAtS,
    state.lastPumpValveClosedAtS,
    state.lastStopcockOpenedAtS,
    state.lastStopcockClosedAtS,
  ].every((value) => isSimulationTimelineTimestamp(value, simulationTimeS)) &&
    state.releaseStarted === (state.releaseReference !== null) &&
    (
      state.releaseReference === null ||
      (
        isSimulationTimelineTimestamp(state.releaseReference.openedAtS, simulationTimeS) &&
        isSimulationTimelineTimestamp(state.releaseReference.reachedAmbientAtS, simulationTimeS) &&
        (
          state.releaseReference.reachedAmbientAtS === null ||
          state.releaseReference.reachedAmbientAtS >= state.releaseReference.openedAtS
        )
      )
    );
};

const isPhysicsValveTimingProjectionConsistent = (
  openedAtS: number | null,
  closedAtS: number | null,
  currentOpenDurationS: number,
  controlOpen: boolean,
  simulationTimeS: number,
) => {
  if (
    currentOpenDurationS < 0 ||
    currentOpenDurationS > simulationTimeS + 0.000001
  ) return false;
  if (controlOpen) {
    return openedAtS !== null &&
      closedAtS === null &&
      areRuntimeNumbersClose(currentOpenDurationS, simulationTimeS - openedAtS);
  }
  return areRuntimeNumbersClose(currentOpenDurationS, 0) && (
    openedAtS === null
      ? closedAtS === null
      : closedAtS !== null && closedAtS >= openedAtS
  );
};

const isReleasePhysicsProjectionConsistent = (
  physicsState: HeatCapacityFreePhysicsState | HeatCapacityGuidePhysicsState,
  releaseState: HeatCapacityReleaseState,
) => {
  if (!releaseState.formedRelease) {
    return !physicsState.releaseStarted && physicsState.releaseReference === null;
  }
  return releaseState.purpose === 'release' &&
    releaseState.openingCompletedAtS !== null &&
    physicsState.releaseStarted &&
    physicsState.releaseReference !== null &&
    areRuntimeNumbersClose(
      physicsState.releaseReference.openedAtS,
      releaseState.openingCompletedAtS,
    ) &&
    areRuntimeNumbersClose(
      physicsState.lastStopcockOpenedAtS,
      releaseState.openingCompletedAtS,
    ) &&
    (
      releaseState.closeCommandAtS === null ||
      areRuntimeNumbersClose(
        physicsState.lastStopcockClosedAtS,
        releaseState.closeCommandAtS,
      )
    );
};

const isPhysicsControlTimingProjectionConsistent = (
  state: HeatCapacityFreePhysicsState | HeatCapacityGuidePhysicsState,
  pumpValveOpen: boolean,
  stopcockFlowOpen: boolean,
) => isPhysicsValveTimingProjectionConsistent(
  state.lastPumpValveOpenedAtS,
  state.lastPumpValveClosedAtS,
  state.currentPumpValveOpenDurationS,
  pumpValveOpen,
  state.simulationTimeS,
) && isPhysicsValveTimingProjectionConsistent(
  state.lastStopcockOpenedAtS,
  state.lastStopcockClosedAtS,
  state.currentStopcockOpenDurationS,
  stopcockFlowOpen,
  state.simulationTimeS,
);

const isFreeSensorTimelineWithinSimulationTime = (
  state: HeatCapacityFreeExperimentDomainState['sensorState'],
  simulationTimeS: number,
  config: HeatCapacityFreeSensorConfig,
) => {
  const pressureTimes = state.pressureHistory.map((sample) => sample.atS);
  const temperatureTimes = state.temperatureHistory.map((sample) => sample.atS);
  const latestPressureSample = state.pressureHistory.at(-1) ?? null;
  const latestTemperatureSample = state.temperatureHistory.at(-1) ?? null;
  const initialUnsampledState = simulationTimeS === 0 && state.nextSampleAtS === 0;
  return state.pressureHistory.length > 0 &&
    state.pressureHistory.length === state.temperatureHistory.length &&
    hasNonDecreasingNumbers(pressureTimes) &&
    hasNonDecreasingNumbers(temperatureTimes) &&
    pressureTimes.every((atS, index) => areRuntimeNumbersClose(atS, temperatureTimes[index]!)) &&
    [...pressureTimes, ...temperatureTimes].every((value) => (
      isSimulationTimelineTimestamp(value, simulationTimeS)
    )) &&
    latestPressureSample !== null &&
    latestTemperatureSample !== null &&
    areRuntimeNumbersClose(state.displayPressureMv, latestPressureSample.valueMv) &&
    areRuntimeNumbersClose(state.displayTemperatureMv, latestTemperatureSample.valueMv) &&
    areRuntimeNumbersClose(
      state.pressureSlopeMvPerS,
      calculateFreeSensorHistorySlope(state.pressureHistory),
    ) &&
    areRuntimeNumbersClose(
      state.temperatureSlopeMvPerS,
      calculateFreeSensorHistorySlope(state.temperatureHistory),
    ) &&
    (
      initialUnsampledState || (
        state.nextSampleAtS + 0.000001 >= simulationTimeS &&
        state.nextSampleAtS <= simulationTimeS + config.maxSampleIntervalS + 0.000001
      )
    );
};

const isFreeCalibrationTimelineWithinSimulationTime = (
  state: HeatCapacityFreeExperimentDomainState['calibrationState'],
  simulationTimeS: number,
) => {
  const zeroEventTimes = state.zeroEvents.map((event) => event.atS);
  const latestZeroEvent = state.zeroEvents.at(-1) ?? null;
  const zeroEventsAreCanonical = state.zeroEvents.every((event, index) => (
    event.id === `zero-${index + 1}`
  ));
  const automaticU0IsCanonical = state.automaticU0 === null || (
    latestZeroEvent !== null &&
    state.automaticU0.calibrationVersion === state.calibrationVersion &&
    state.automaticU0.zeroEventId === latestZeroEvent.id &&
    state.automaticU0.atS >= latestZeroEvent.atS
  );
  return state.calibrationVersion === state.zeroEvents.length &&
    zeroEventsAreCanonical &&
    (latestZeroEvent === null
      ? areRuntimeNumbersClose(state.zeroOffsetMv, 0)
      : areRuntimeNumbersClose(state.zeroOffsetMv, latestZeroEvent.zeroOffsetMv)) &&
    automaticU0IsCanonical &&
    hasNonDecreasingNumbers(zeroEventTimes) &&
    [...zeroEventTimes, state.automaticU0?.atS ?? null].every((value) => (
      isSimulationTimelineTimestamp(value, simulationTimeS)
    ));
};

const getExpectedFreePhysicalRuntimePhase = (
  snapshot: Pick<
    HeatCapacityFreeRollbackSnapshot,
    'pumpValveOpen' | 'pressureZeroed' | 'heatCapacityFreePhysicsState' | 'heatCapacityReleaseState'
  >,
) => {
  if (isHeatCapacityMainReleaseFlowOpen(snapshot.heatCapacityReleaseState)) return 'releasing';
  if (
    !isHeatCapacityReleaseFlowOpen(snapshot.heatCapacityReleaseState) &&
    snapshot.heatCapacityFreePhysicsState.releaseStarted
  ) return 'recovering';
  if (snapshot.heatCapacityFreePhysicsState.pumpStrokeCount > 0 && snapshot.pumpValveOpen) return 'pumping';
  if (snapshot.heatCapacityFreePhysicsState.pumpStrokeCount > 0) return 'sealedStabilizing';
  if (isHeatCapacityReleaseFlowOpen(snapshot.heatCapacityReleaseState) && snapshot.pressureZeroed) return 'zeroed';
  if (isHeatCapacityReleaseFlowOpen(snapshot.heatCapacityReleaseState)) return 'readyToZero';
  return 'readyToPump';
};

const isFreeStopcockControlProjectionConsistent = (
  releaseState: HeatCapacityReleaseState,
  glassPistonState: unknown,
  stopcockAngleDeg: unknown,
) => {
  const releaseOpen = releaseState.phase === 'opening' ||
    releaseState.phase === 'open' ||
    releaseState.phase === 'releasing';
  const expectedStopcockAngleDeg = releaseOpen ? 90 : 0;
  return glassPistonState === (releaseOpen ? 'open' : 'closed') &&
    typeof stopcockAngleDeg === 'number' &&
    areRuntimeNumbersClose(stopcockAngleDeg, expectedStopcockAngleDeg);
};

const isFreeRollbackControlProjectionConsistent = (
  snapshot: HeatCapacityFreeRollbackSnapshot,
) => {
  return snapshot.powerOn === true &&
    snapshot.heatCapacityPhase === getExpectedFreePhysicalRuntimePhase(snapshot) &&
    snapshot.pumpValveState === (snapshot.pumpValveOpen ? 'open' : 'closed') &&
    isFreeStopcockControlProjectionConsistent(
      snapshot.heatCapacityReleaseState,
      snapshot.glassPistonState,
      snapshot.stopcockAngleDeg,
    ) &&
    Number.isInteger(snapshot.pumpStrokeCount) &&
    snapshot.pumpStrokeCount === snapshot.heatCapacityFreePhysicsState.pumpStrokeCount &&
    isPhysicsControlTimingProjectionConsistent(
      snapshot.heatCapacityFreePhysicsState,
      snapshot.pumpValveOpen,
      isHeatCapacityReleaseFlowOpen(snapshot.heatCapacityReleaseState),
    ) &&
    hasNonDecreasingNumbers(snapshot.pumpStrokeTimestamps) &&
    snapshot.pumpStrokeTimestamps.every((value) => value >= 0);
};

const isFreeThermodynamicProjectionConsistent = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
) => {
  const synchronized = synchronizeFreePhysicsThermodynamicState(state, config);
  return THERMODYNAMIC_STATE_KEYS.every((key) => (
    areRuntimeNumbersClose(state[key], synchronized[key])
  ));
};

const isGuideThermodynamicProjectionConsistent = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
) => {
  const synchronized = migrateGuidePhysicsState(state, config);
  return THERMODYNAMIC_STATE_KEYS.every((key) => (
    areRuntimeNumbersClose(state[key], synchronized[key])
  ));
};

export const isHeatCapacityFreeRollbackSnapshotSemanticallyValid = (
  snapshot: HeatCapacityFreeRollbackSnapshot,
  config: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig = createDefaultHeatCapacityFreeSensorConfig(),
) => {
  const simulationTimeS = snapshot.heatCapacityFreePhysicsState.simulationTimeS;
  return isFreeThermodynamicProjectionConsistent(snapshot.heatCapacityFreePhysicsState, config) &&
    isPhysicsTimelineWithinSimulationTime(snapshot.heatCapacityFreePhysicsState) &&
    isFreeSensorTimelineWithinSimulationTime(
      snapshot.heatCapacityFreeSensorState,
      simulationTimeS,
      sensorConfig,
    ) &&
    isFreeCalibrationTimelineWithinSimulationTime(snapshot.heatCapacityFreeCalibrationState, simulationTimeS) &&
    isReleaseTimelineWithinSimulationTime(snapshot.heatCapacityReleaseState, simulationTimeS) &&
    isReleasePhysicsProjectionConsistent(
      snapshot.heatCapacityFreePhysicsState,
      snapshot.heatCapacityReleaseState,
    ) &&
    isFreeRollbackControlProjectionConsistent(snapshot);
};

const isFreeDomainTimelineWithinSimulationTime = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  const simulationTimeS = domain.physicsState.simulationTimeS;
  const traceTimelineValid = domain.traceStore.traceTrials.every((traceTrial) => {
    const linkedTrial = traceTrial.status === 'completed'
      ? domain.trials.find((trial) => trial.id === traceTrial.linkedTrialId) ?? null
      : null;
    const traceSimulationTimeS = Math.max(
      simulationTimeS,
      linkedTrial?.u2?.atS ?? simulationTimeS,
    );
    return traceTrial.branches.flatMap((branch) => [
      ...branch.samples.map((sample) => sample.atS),
      ...branch.events.map((event) => event.atS),
      branch.idleState.lastUserActionAtS,
      branch.idleState.dormantSinceS,
      branch.idleState.lastHeartbeatAtS,
    ]).every((value) => isSimulationTimelineTimestamp(value, traceSimulationTimeS));
  });
  const attempt = domain.activeAttempt;
  const attemptTimestamps = attempt === null
    ? []
    : [
        attempt.startedAtS,
        attempt.u1WaitStartedAtS,
        attempt.u1RecordedAtS,
        attempt.releaseStartedAtS,
        attempt.releaseClosedAtS,
        attempt.u2WaitStartedAtS,
        attempt.u2RecordedAtS,
        attempt.invalidatedAtS,
      ];
  return traceTimelineValid &&
    attemptTimestamps.every((value) => isSimulationTimelineTimestamp(value, simulationTimeS)) &&
    isFreeSensorTimelineWithinSimulationTime(
      domain.sensorState,
      simulationTimeS,
      getEffectiveHeatCapacityFreeSensorConfig(domain.sensorConfig, domain.instrumentNoiseEnabled),
    ) &&
    isFreeCalibrationTimelineWithinSimulationTime(domain.calibrationState, simulationTimeS);
};

const isFreeActiveRunConfigSnapshotConsistent = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  if (domain.experimentGroupStatus === 'draft') {
    return domain.activeRunConfigSnapshot === null;
  }
  if (domain.activeRunConfigSnapshot === null) return false;
  const expectedSnapshot = createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs({
    environmentConfig: domain.environmentConfig,
    physicsConfig: domain.physicsConfig,
    sensorConfig: getEffectiveHeatCapacityFreeSensorConfig(
      domain.sensorConfig,
      domain.instrumentNoiseEnabled,
    ),
    recordConfig: domain.recordConfig,
    pressureWarningMv: domain.pressureWarningMv,
  });
  return areRuntimeValuesStructurallyEqual(domain.activeRunConfigSnapshot, expectedSnapshot);
};

const FREE_ATTEMPT_STAGES_WITH_U1_RECORD = new Set([
  'u1-recorded',
  'releasing',
  'waiting-u2',
  'u2-recorded',
]);

const FREE_ATTEMPT_STAGES_WITH_RELEASE_START = new Set([
  'releasing',
  'waiting-u2',
  'u2-recorded',
]);

const isFreeActiveAttemptProjectionConsistent = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  const attempt = domain.activeAttempt;
  if (attempt === null) return true;

  const physicsState = domain.physicsState;
  const releaseState = domain.releaseState;
  const latestTrial = domain.trials.at(-1) ?? null;
  const hasU1Record = FREE_ATTEMPT_STAGES_WITH_U1_RECORD.has(attempt.stage);
  const hasReleaseStart = FREE_ATTEMPT_STAGES_WITH_RELEASE_START.has(attempt.stage);
  const hasReleaseClose = attempt.stage === 'waiting-u2' || attempt.stage === 'u2-recorded';
  const hasU2Record = attempt.stage === 'u2-recorded';

  const attemptPumpCountValid = attempt.status === 'active'
    ? attempt.effectivePumpCount === physicsState.pumpStrokeCount
    : attempt.effectivePumpCount <= physicsState.pumpStrokeCount;
  if (
    !attemptPumpCountValid ||
    (attempt.status === 'active' &&
      domain.experimentGroupStatus !== (hasU2Record ? 'completed' : 'running')) ||
    (
      attempt.powerOffStartedAtWallClockMs === null &&
      attempt.invalidReason === 'power-off-timeout'
    )
  ) return false;

  if (attempt.startReason === 'u0-recorded') {
    if (
      latestTrial?.u0 === null || latestTrial?.u0 === undefined ||
      !areRuntimeNumbersClose(latestTrial.u0.atS, attempt.startedAtS) ||
      latestTrial.preheatOutcome !== attempt.preheatOutcome
    ) return false;
  }

  if (attempt.status === 'active' && attempt.stage === 'pumping' && !isPhysicsValveTimingProjectionConsistent(
    physicsState.lastPumpValveOpenedAtS,
    physicsState.lastPumpValveClosedAtS,
    physicsState.currentPumpValveOpenDurationS,
    true,
    physicsState.simulationTimeS,
  )) return false;

  if (attempt.status === 'active' && attempt.stage === 'waiting-u1' && (
    attempt.u1WaitStartedAtS === null ||
    physicsState.lastPumpValveClosedAtS === null ||
    !areRuntimeNumbersClose(attempt.u1WaitStartedAtS, physicsState.lastPumpValveClosedAtS)
  )) return false;

  if (hasU1Record && (
    latestTrial?.u1 === null || latestTrial?.u1 === undefined ||
    attempt.u1RecordedAtS === null ||
    !areRuntimeNumbersClose(latestTrial.u1.atS, attempt.u1RecordedAtS) ||
    latestTrial.preheatOutcome !== attempt.preheatOutcome ||
    attempt.u1WaitStartedAtS === null ||
    attempt.u1RecordedAtS - attempt.u1WaitStartedAtS + 0.000001 <
      HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S
  )) return false;

  if (attempt.status === 'active' && hasReleaseStart && (
    attempt.releaseStartedAtS === null ||
    releaseState.openingCompletedAtS === null ||
    releaseState.purpose !== 'release' ||
    !releaseState.formedRelease ||
    !areRuntimeNumbersClose(attempt.releaseStartedAtS, releaseState.openingCompletedAtS) ||
    (
      releaseState.phase !== 'releasing' &&
      releaseState.phase !== 'closing' &&
      releaseState.phase !== 'closedAfterRelease'
    )
  )) return false;

  if (attempt.status === 'active' && hasReleaseClose && (
    attempt.releaseClosedAtS === null ||
    attempt.u2WaitStartedAtS === null ||
    releaseState.phase !== 'closedAfterRelease' ||
    releaseState.closingCompletedAtS === null ||
    !areRuntimeNumbersClose(attempt.releaseClosedAtS, releaseState.closingCompletedAtS) ||
    !areRuntimeNumbersClose(attempt.u2WaitStartedAtS, releaseState.closingCompletedAtS)
  )) return false;

  return !hasU2Record || (
    latestTrial?.u2 !== null &&
    latestTrial?.u2 !== undefined &&
    attempt.u2RecordedAtS !== null &&
    attempt.u2WaitStartedAtS !== null &&
    areRuntimeNumbersClose(latestTrial.u2.atS, attempt.u2RecordedAtS) &&
    attempt.u2RecordedAtS - attempt.u2WaitStartedAtS + 0.000001 >=
      HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S
  );
};

const isFreeExperimentDomainSemanticallyValid = (
  decoded: Record<string, unknown>,
) => {
  const domain = decoded as unknown as HeatCapacityFreeExperimentDomainState;
  const simulationTimeS = domain.physicsState.simulationTimeS;
  const environmentValid = areRuntimeValuesStructurallyEqual(
    domain.environmentConfig,
    domain.physicsConfig.environment,
  );
  const gasValid = domain.physicsConfig.gamma === getHeatCapacityFreeGasTypeGamma(domain.gasType) &&
    (domain.scheme !== 'ideal' || domain.gasType === 'air');
  const thermodynamicValid = isFreeThermodynamicProjectionConsistent(domain.physicsState, domain.physicsConfig);
  const physicsTimelineValid = isPhysicsTimelineWithinSimulationTime(domain.physicsState);
  const stopcockTimingValid = isPhysicsValveTimingProjectionConsistent(
    domain.physicsState.lastStopcockOpenedAtS,
    domain.physicsState.lastStopcockClosedAtS,
    domain.physicsState.currentStopcockOpenDurationS,
    isHeatCapacityReleaseFlowOpen(domain.releaseState),
    simulationTimeS,
  );
  const releaseTimelineValid = isReleaseTimelineWithinSimulationTime(domain.releaseState, simulationTimeS);
  const releasePhysicsValid = isReleasePhysicsProjectionConsistent(
    domain.physicsState,
    domain.releaseState,
  );
  const domainTimelineValid = isFreeDomainTimelineWithinSimulationTime(domain);
  const configSnapshotValid = isFreeActiveRunConfigSnapshotConsistent(domain);
  const parameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    domain.physicsConfig,
    domain.sensorConfig,
    domain.recordConfig,
    domain.pressureWarningMv,
    domain.instrumentNoiseEnabled,
  );
  const expectedParameterState = domain.scheme === 'ideal'
    ? (() => {
        const ideal = createHeatCapacityFreeIdealEffectiveConfigs('thermalEquilibrium');
        return {
          environmentConfig: ideal.environment,
          physicsConfig: ideal.physics,
          sensorConfig: normalizeHeatCapacityFreeSensorConfig(ideal.sensor),
          recordConfig: ideal.record,
          pressureWarningMv: ideal.pressureWarningMv,
          instrumentNoiseEnabled: ideal.instrumentNoiseEnabled,
          gasType: 'air' as const,
        };
      })()
    : applyHeatCapacityFreeParameterDraftToConfigs(parameterDraft);
  const parameterConfigValid = areRuntimeValuesStructurallyEqual(
    parameterDraft,
    normalizeHeatCapacityFreeParameterDraft(parameterDraft),
  ) &&
    areRuntimeValuesStructurallyEqual(domain.environmentConfig, expectedParameterState.environmentConfig) &&
    areRuntimeValuesStructurallyEqual(domain.physicsConfig, expectedParameterState.physicsConfig) &&
    areRuntimeValuesStructurallyEqual(domain.sensorConfig, expectedParameterState.sensorConfig) &&
    areRuntimeValuesStructurallyEqual(domain.recordConfig, expectedParameterState.recordConfig) &&
    domain.pressureWarningMv === expectedParameterState.pressureWarningMv &&
    domain.instrumentNoiseEnabled === expectedParameterState.instrumentNoiseEnabled &&
    domain.gasType === expectedParameterState.gasType;
  const activeAttemptValid = isFreeActiveAttemptProjectionConsistent(domain);
  const effectiveSensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    domain.sensorConfig,
    domain.instrumentNoiseEnabled,
  );
  const rollbacksValid = Object.values(domain.rollbackSnapshots).every((snapshot) => (
      snapshot === null || isHeatCapacityFreeRollbackSnapshotSemanticallyValid(
        snapshot,
        domain.physicsConfig,
        effectiveSensorConfig,
      )
    ));
  const checks = {
    environmentValid,
    gasValid,
    thermodynamicValid,
    physicsTimelineValid,
    stopcockTimingValid,
    releaseTimelineValid,
    releasePhysicsValid,
    domainTimelineValid,
    configSnapshotValid,
    parameterConfigValid,
    activeAttemptValid,
    rollbacksValid,
  };
  return Object.values(checks).every(Boolean);
};

const decodeFreeExperimentDomainShape = decodeRecord({
  scheme: decodeLiteral(['real', 'ideal']),
  gasType: decodeLiteral(['air', 'helium']),
  experimentGroupStatus: decodeLiteral(['draft', 'running', 'completed']),
  activeRunConfigSnapshot: decodeNullableFreeConfigSnapshot,
  recordConfig: decodeRecordConfig,
  pressureWarningMv: decodeNonNegativeFiniteNumber,
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

const createFreeExperimentDomainDecoder = (
  expectedScheme: 'real' | 'ideal',
): RuntimeValueDecoder => (value) => {
  const decoded = decodeFreeExperimentDomainShape(value);
  if (
    decoded === INVALID_RUNTIME_VALUE ||
    !isPlainRecord(decoded) ||
    !isPlainRecord(decoded.traceStore) ||
    !Array.isArray(decoded.trials) ||
    decoded.scheme !== expectedScheme ||
    decoded.trials.some((trial) => !isPlainRecord(trial) || trial.parameterScheme !== expectedScheme)
  ) return INVALID_RUNTIME_VALUE;
  return isFreeTrialCollectionIntegrityValid(decoded.traceStore, decoded.trials) &&
    isFreeExperimentDomainSemanticallyValid(decoded)
    ? decoded
    : INVALID_RUNTIME_VALUE;
};

const decodeRealFreeExperimentDomain = createFreeExperimentDomainDecoder('real');
const decodeIdealFreeExperimentDomain = createFreeExperimentDomainDecoder('ideal');

const FREE_RUNTIME_DOMAIN_FIELD_PAIRS = [
  ['heatCapacityFreeGasType', 'gasType'],
  ['heatCapacityFreeExperimentGroupStatus', 'experimentGroupStatus'],
  ['heatCapacityFreeActiveRunConfigSnapshot', 'activeRunConfigSnapshot'],
  ['heatCapacityFreeRecordConfig', 'recordConfig'],
  ['heatCapacityFreePressureWarningMv', 'pressureWarningMv'],
  ['heatCapacityFreeInstrumentNoiseEnabled', 'instrumentNoiseEnabled'],
  ['heatCapacityFreeEnvironmentConfig', 'environmentConfig'],
  ['heatCapacityFreePhysicsConfig', 'physicsConfig'],
  ['heatCapacityFreePhysicsState', 'physicsState'],
  ['heatCapacityFreeSensorConfig', 'sensorConfig'],
  ['heatCapacityFreeSensorState', 'sensorState'],
  ['heatCapacityFreeCalibrationState', 'calibrationState'],
  ['heatCapacityFreeRollbackSnapshots', 'rollbackSnapshots'],
  ['heatCapacityFreeTraceStore', 'traceStore'],
  ['heatCapacityFreeTrials', 'trials'],
  ['heatCapacityFreeActiveAttempt', 'activeAttempt'],
] as const;

const isPristineHeatCapacityReleaseState = (
  releaseState: HeatCapacityReleaseState,
) => (
  releaseState.phase === 'closed' &&
  releaseState.purpose === 'none' &&
  releaseState.attemptId === 0 &&
  releaseState.phaseStartedAtS === 0 &&
  releaseState.openingStartedAtS === null &&
  releaseState.openingCompletedAtS === null &&
  releaseState.closeCommandAtS === null &&
  releaseState.closingCompletedAtS === null &&
  releaseState.releaseDurationS === 0 &&
  releaseState.formedRelease === false &&
  releaseState.quickToggle === false
);

const isPristineUninitializedFreeDomain = (
  domain: HeatCapacityFreeExperimentDomainState,
) => {
  const physicsState = domain.physicsState;
  const sensorState = domain.sensorState;
  const calibrationState = domain.calibrationState;
  const pressureSample = sensorState.pressureHistory[0];
  const temperatureSample = sensorState.temperatureHistory[0];
  return (
    domain.experimentGroupStatus === 'draft' &&
    domain.activeRunConfigSnapshot === null &&
    domain.activeAttempt === null &&
    domain.trials.length === 0 &&
    domain.traceStore.activeTraceTrialId === null &&
    domain.traceStore.nextTraceTrialIndex === 1 &&
    domain.traceStore.traceTrials.length === 0 &&
    physicsState.simulationTimeS === 0 &&
    physicsState.gasAmountRatio === 1 &&
    physicsState.gasTemperatureK === domain.environmentConfig.ambientTemperatureK &&
    physicsState.wallTemperatureK === domain.environmentConfig.ambientTemperatureK &&
    physicsState.pumpProcesses.length === 0 &&
    physicsState.pumpStrokeCount === 0 &&
    physicsState.lastPumpStrokeAtS === null &&
    physicsState.lastPumpValveOpenedAtS === null &&
    physicsState.lastPumpValveClosedAtS === null &&
    physicsState.currentPumpValveOpenDurationS === 0 &&
    physicsState.ambientPressureOffsetKPa === 0 &&
    physicsState.ambientTemperatureOffsetK === 0 &&
    physicsState.effectiveAmbientPressureKPa === domain.environmentConfig.ambientPressureKPa &&
    physicsState.effectiveAmbientTemperatureK === domain.environmentConfig.ambientTemperatureK &&
    physicsState.maxPressureKPa === domain.environmentConfig.ambientPressureKPa &&
    physicsState.releaseStarted === false &&
    physicsState.lastStopcockOpenedAtS === null &&
    physicsState.lastStopcockClosedAtS === null &&
    physicsState.currentStopcockOpenDurationS === 0 &&
    physicsState.releaseReference === null &&
    sensorState.nextSampleAtS === 0 &&
    sensorState.pressureHistory.length === 1 &&
    pressureSample?.atS === 0 &&
    pressureSample.valueMv === sensorState.displayPressureMv &&
    sensorState.temperatureHistory.length === 1 &&
    temperatureSample?.atS === 0 &&
    temperatureSample.valueMv === sensorState.displayTemperatureMv &&
    sensorState.pressureSlopeMvPerS === 0 &&
    sensorState.temperatureSlopeMvPerS === 0 &&
    sensorState.pressureReliability === 1 &&
    sensorState.pressureNonlinearErrorMv === 0 &&
    sensorState.pressureStochasticErrorMv === 0 &&
    calibrationState.calibrationVersion === 0 &&
    calibrationState.zeroOffsetMv === 0 &&
    calibrationState.zeroEvents.length === 0 &&
    calibrationState.automaticU0 === null &&
    isPristineHeatCapacityReleaseState(domain.releaseState) &&
    domain.rollbackSnapshots.afterPowerOn === null &&
    domain.rollbackSnapshots.beforePump === null &&
    domain.rollbackSnapshots.beforeRelease === null
  );
};

const hasPristineUninitializedFreeCommonSensorProjection = ({
  runtime,
  common,
  activeDomain,
  sensorDisplayPressureMv,
}: {
  runtime: Record<string, unknown>;
  common: Record<string, unknown>;
  activeDomain: HeatCapacityFreeExperimentDomainState;
  sensorDisplayPressureMv: number;
}) => {
  const realDomain = runtime.heatCapacityFreeRealDomain as HeatCapacityFreeExperimentDomainState;
  const idealDomain = runtime.heatCapacityFreeIdealDomain as HeatCapacityFreeExperimentDomainState;
  const releaseState = common.heatCapacityReleaseState as HeatCapacityReleaseState;
  const sensorState = activeDomain.sensorState;
  const processSamples = common.heatCapacityProcessSamples;
  const recordedPressures = common.recordedPressures;
  const acknowledgements = runtime.heatCapacityFreeFileAcknowledgements;
  return (
    runtime.heatCapacityFreePreheatCompleted === false &&
    runtime.heatCapacityFreeExperimentGroupStatus === 'draft' &&
    runtime.heatCapacityFreeActiveRunConfigSnapshot === null &&
    runtime.heatCapacityFreeParameterScheme === 'real' &&
    runtime.heatCapacityFreeDisplayScheme === 'real' &&
    runtime.heatCapacityFreeActiveAttempt === null &&
    Array.isArray(runtime.heatCapacityFreeTrials) &&
    runtime.heatCapacityFreeTrials.length === 0 &&
    isPlainRecord(runtime.heatCapacityFreeTraceStore) &&
    runtime.heatCapacityFreeTraceStore.activeTraceTrialId === null &&
    runtime.heatCapacityFreeTraceStore.nextTraceTrialIndex === 1 &&
    Array.isArray(runtime.heatCapacityFreeTraceStore.traceTrials) &&
    runtime.heatCapacityFreeTraceStore.traceTrials.length === 0 &&
    isPlainRecord(acknowledgements) &&
    acknowledgements.advancedParametersRisk === false &&
    acknowledgements.idealParameterProfileIntro === false &&
    isPristineUninitializedFreeDomain(realDomain) &&
    isPristineUninitializedFreeDomain(idealDomain) &&
    sensorState.pressureInitialBiasMv !== 0 &&
    sensorState.displayPressureMv === sensorState.pressureInitialBiasMv &&
    sensorDisplayPressureMv === sensorState.pressureInitialBiasMv &&
    common.runState === 'idle' &&
    common.heatCapacityTeachingStatus === 'idle' &&
    common.heatCapacityExperimentSeed === null &&
    common.heatCapacityExperimentProfile === null &&
    common.powerOn === false &&
    common.heatCapacityPhase === 'powerOff' &&
    common.simulationTimeS === 0 &&
    common.lastUpdateMs === null &&
    common.displayResponseLastUpdateMs === null &&
    common.pressureSignalMv === null &&
    common.temperatureSignalMv === null &&
    common.pressureKPa === null &&
    common.pumpValveOpen === false &&
    common.pumpValveState === 'closed' &&
    common.pumpBulbState === 'idle' &&
    common.pumpStrokeCount === 0 &&
    Array.isArray(common.pumpStrokeTimestamps) &&
    common.pumpStrokeTimestamps.length === 0 &&
    common.lastPumpTime === null &&
    common.pumpFrequency === 0 &&
    common.pumpFrequencyStatus === 'idle' &&
    common.stopcockAngleDeg === 0 &&
    common.glassPistonState === 'closed' &&
    isPristineHeatCapacityReleaseState(releaseState) &&
    common.releaseRecoveryTargetDeltaKPa === null &&
    common.pressureZeroed === false &&
    common.pressureZeroAdjusted === false &&
    common.pressureZeroKnobAngle === 0 &&
    common.pressureZeroOffset === 0 &&
    common.pressureZeroAdjustMode === 'none' &&
    Array.isArray(common.pressureZeroDisplayedSamples) &&
    common.pressureZeroDisplayedSamples.length === 0 &&
    common.pressureDisplayJitterOffset === 0 &&
    common.pressureDisplayNextJitterAtMs === 0 &&
    common.temperatureDisplayJitterOffset === 0 &&
    common.temperatureDisplayNextJitterAtMs === 0 &&
    common.pressureInitialBiasMv === 0 &&
    common.pressureSignalMvRaw === 0 &&
    common.pressureSignalMvDisplayed === 0 &&
    common.pressureSignalTargetMv === 0 &&
    common.pressureSignalRawReadoutMv === 0 &&
    common.pressureSignalReadoutMv === 0 &&
    isPlainRecord(processSamples) &&
    Object.keys(processSamples).length === 0 &&
    isPlainRecord(recordedPressures) &&
    recordedPressures.p0 === common.ambientPressureKPa &&
    recordedPressures.p1 === null &&
    recordedPressures.p2 === null
  );
};

const isFreeRuntimeProjectionConsistent = (
  runtime: Record<string, unknown>,
  common?: Record<string, unknown>,
) => {
  const scheme = runtime.heatCapacityFreeParameterScheme;
  const activeDomain = scheme === 'ideal'
    ? runtime.heatCapacityFreeIdealDomain
    : scheme === 'real'
      ? runtime.heatCapacityFreeRealDomain
      : null;
  if (!isPlainRecord(activeDomain) || activeDomain.scheme !== scheme) return false;
  if (!FREE_RUNTIME_DOMAIN_FIELD_PAIRS.every(([runtimeKey, domainKey]) => (
    areRuntimeValuesStructurallyEqual(runtime[runtimeKey], activeDomain[domainKey])
  ))) return false;
  if (
    !isPlainRecord(activeDomain.environmentConfig) ||
    !isPlainRecord(activeDomain.physicsConfig) ||
    !isPlainRecord(activeDomain.physicsConfig.environment) ||
    !isPlainRecord(activeDomain.physicsState) ||
    !isPlainRecord(activeDomain.sensorConfig) ||
    !isPlainRecord(activeDomain.sensorState) ||
    !areRuntimeValuesStructurallyEqual(activeDomain.environmentConfig, activeDomain.physicsConfig.environment)
  ) return false;
  const typedDomain = activeDomain as unknown as HeatCapacityFreeExperimentDomainState;
  const expectedParameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    typedDomain.physicsConfig,
    typedDomain.sensorConfig,
    typedDomain.recordConfig,
    typedDomain.pressureWarningMv,
    typedDomain.instrumentNoiseEnabled,
  );
  if (!areRuntimeValuesStructurallyEqual(
    runtime.heatCapacityFreeParameterDraft,
    expectedParameterDraft,
  )) return false;
  if (common === undefined) return true;
  const physicsConfig = activeDomain.physicsConfig as unknown as HeatCapacityFreePhysicsConfig;
  const physicsState = synchronizeFreePhysicsThermodynamicState(
    activeDomain.physicsState as unknown as HeatCapacityFreePhysicsState,
    physicsConfig,
  );
  const derived = deriveFreePhysicalState(physicsState, physicsConfig);
  const sensorState = typedDomain.sensorState;
  const calibrationState = typedDomain.calibrationState;
  const sensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    typedDomain.sensorConfig,
    typedDomain.instrumentNoiseEnabled,
  );
  const sensorDisplay = getFreeSensorDisplay(sensorState, calibrationState, sensorConfig);
  const sensorTemperatureK = sensorState.sensorTemperatureK;
  const expectedPhysicalPhase = getExpectedFreePhysicalRuntimePhase({
    pumpValveOpen: common.pumpValveOpen as boolean,
    pressureZeroed: common.pressureZeroed as boolean,
    heatCapacityFreePhysicsState: physicsState,
    heatCapacityReleaseState: activeDomain.releaseState as unknown as HeatCapacityReleaseState,
  });
  const activeAttempt = typedDomain.activeAttempt;
  const activeAttemptPowerValid = activeAttempt === null || activeAttempt.status !== 'active' || (
    common.powerOn === true
      ? activeAttempt.powerOffStartedAtWallClockMs === null
      : activeAttempt.powerOffStartedAtWallClockMs !== null
  );
  const sensorProjectionValid = (
    areRuntimeNumbersClose(common.pressureInitialBiasMv, roundRuntimeNumber(sensorState.pressureInitialBiasMv, 3)) &&
    areRuntimeNumbersClose(common.pressureSignalMvRaw, roundRuntimeNumber(sensorState.displayPressureMv, 4)) &&
    areRuntimeNumbersClose(common.pressureSignalMvDisplayed, roundRuntimeNumber(sensorDisplay.displayPressureMv, 4)) &&
    areRuntimeNumbersClose(common.pressureSignalTargetMv, roundRuntimeNumber(sensorDisplay.displayPressureMv, 4)) &&
    areRuntimeNumbersClose(common.pressureSignalRawReadoutMv, roundRuntimeNumber(sensorState.displayPressureMv, 2)) &&
    areRuntimeNumbersClose(common.pressureSignalReadoutMv, roundRuntimeNumber(sensorDisplay.displayPressureMv, 2))
  ) || hasPristineUninitializedFreeCommonSensorProjection({
    runtime,
    common,
    activeDomain: typedDomain,
    sensorDisplayPressureMv: sensorDisplay.displayPressureMv,
  });
  const commonPhaseValid = common.powerOn === true
    ? common.heatCapacityPhase === expectedPhysicalPhase
    : common.heatCapacityPhase === 'powerOff' || common.heatCapacityPhase === expectedPhysicalPhase;
  return common.heatCapacityTeachingStatus === 'idle' &&
    activeAttemptPowerValid &&
    commonPhaseValid &&
    isPhysicsControlTimingProjectionConsistent(
      physicsState,
      common.pumpValveOpen as boolean,
      isHeatCapacityReleaseFlowOpen(activeDomain.releaseState as unknown as HeatCapacityReleaseState),
    ) &&
    common.pumpValveState === (common.pumpValveOpen === true ? 'open' : 'closed') &&
    common.pumpStrokeCount === physicsState.pumpStrokeCount &&
    areRuntimeValuesStructurallyEqual(common.heatCapacityReleaseState, activeDomain.releaseState) &&
    isFreeStopcockControlProjectionConsistent(
      activeDomain.releaseState as unknown as HeatCapacityReleaseState,
      common.glassPistonState,
      common.stopcockAngleDeg,
    ) &&
    common.ambientPressureKPa === activeDomain.environmentConfig.ambientPressureKPa &&
    common.ambientTemperatureK === activeDomain.environmentConfig.ambientTemperatureK &&
    common.theoreticalGamma === activeDomain.physicsConfig.gamma &&
    common.pressureSensitivityMvPerKPa === activeDomain.sensorConfig.pressureMvPerKPa &&
    sensorProjectionValid &&
    areRuntimeNumbersClose(common.pressureZeroOffset, roundRuntimeNumber(calibrationState.zeroOffsetMv, 3)) &&
    areRuntimeNumbersClose(common.temperatureSignalTargetMv, roundRuntimeNumber(sensorDisplay.displayTemperatureMv, 4)) &&
    areRuntimeNumbersClose(common.gasPressureKPaAbs, roundRuntimeNumber(derived.gasPressureKPa, 4)) &&
    areRuntimeNumbersClose(common.gasTemperatureK, roundRuntimeNumber(physicsState.gasTemperatureK, 4)) &&
    areRuntimeNumbersClose(common.sensorTemperatureK, roundRuntimeNumber(sensorTemperatureK, 4)) &&
    areRuntimeNumbersClose(common.pressureDeltaKPa, roundRuntimeNumber(derived.pressureDeltaKPa, 4)) &&
    areRuntimeNumbersClose(common.simulationTimeS, roundRuntimeNumber(physicsState.simulationTimeS, 4)) &&
    areRuntimeNumbersClose(common.vesselPressureReadoutKPa, roundRuntimeNumber(derived.gasPressureKPa, 2)) &&
    areRuntimeNumbersClose(common.vesselTemperatureReadoutK, roundRuntimeNumber(physicsState.gasTemperatureK, 3));
};

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
  heatCapacityFreeRealDomain: decodeRealFreeExperimentDomain,
  heatCapacityFreeIdealDomain: decodeIdealFreeExperimentDomain,
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

const decodeFreeRuntimeShape = decodeRecord(HEAT_CAPACITY_FREE_RUNTIME_DECODERS);
const decodeFreeRuntime: RuntimeValueDecoder = (value) => {
  const decoded = decodeFreeRuntimeShape(value);
  if (
    decoded === INVALID_RUNTIME_VALUE ||
    !isPlainRecord(decoded) ||
    !isPlainRecord(decoded.heatCapacityFreeTraceStore) ||
    !Array.isArray(decoded.heatCapacityFreeTrials)
  ) {
    return INVALID_RUNTIME_VALUE;
  }
  const collectionIntegrityValid = isFreeTrialCollectionIntegrityValid(
    decoded.heatCapacityFreeTraceStore,
    decoded.heatCapacityFreeTrials,
  );
  const projectionValid = isFreeRuntimeProjectionConsistent(decoded);
  if (!collectionIntegrityValid || !projectionValid) {
    return INVALID_RUNTIME_VALUE;
  }
  return decoded;
};
const decodeGuideRuntime = decodeRecord(HEAT_CAPACITY_GUIDE_RUNTIME_DECODERS);

const isAcceptedRuntimeValue = (value: unknown) => value !== INVALID_RUNTIME_VALUE;

type HeatCapacityFreeActivePersistenceProjection = {
  mode: unknown;
  teachingStatus: unknown;
  controls: unknown;
  uiReplay: unknown;
};

const isFreeActivePersistenceProjectionConsistent = (
  projection: HeatCapacityFreeActivePersistenceProjection,
) => {
  if (projection.mode !== 'free') return true;
  if (!isPlainRecord(projection.controls) || !isPlainRecord(projection.uiReplay)) return false;
  return projection.teachingStatus === 'idle' &&
    (projection.controls.powerOn !== true || projection.uiReplay.heatCapacityPhase !== 'powerOff');
};

export const isCanonicalHeatCapacityFreePersistenceRuntime = (
  value: unknown,
  activeProjection?: HeatCapacityFreeActivePersistenceProjection,
) => {
  if (!isPlainRecord(value)) return false;
  const controls = isPlainRecord(value.controls) ? value.controls : null;
  const decodedTraceStore = decodeFreeTraceStore(value.traceStore);
  const decodedTrials = decodeArray(decodeFreeTrial)(value.trials);
  const realValid = isAcceptedRuntimeValue(decodeRealFreeExperimentDomain(value.real));
  const idealValid = isAcceptedRuntimeValue(decodeIdealFreeExperimentDomain(value.ideal));
  return (
    realValid &&
    idealValid &&
    isAcceptedRuntimeValue(decodeFreeConfigSnapshot(value.config)) &&
    isAcceptedRuntimeValue(decodeNullableFreeConfigSnapshot(value.activeRunConfigSnapshot)) &&
    isAcceptedRuntimeValue(decodeFreeParameterDraft(value.parameterDraft)) &&
    isAcceptedRuntimeValue(decodeFreeFileAcknowledgements(value.acknowledgements)) &&
    isAcceptedRuntimeValue(decodeRecordConfig(value.recordConfig)) &&
    isAcceptedRuntimeValue(decodeFreePhysicsState(value.runtime)) &&
    controls !== null &&
    typeof controls.powerOn === 'boolean' &&
    typeof controls.pumpValveOpen === 'boolean' &&
    typeof controls.stopcockOpen === 'boolean' &&
    isAcceptedRuntimeValue(decodeLiteral(['idle', 'compressing', 'releasing'])(controls.pumpBulbState)) &&
    isAcceptedRuntimeValue(decodeReleaseState(controls.releaseState)) &&
    isAcceptedRuntimeValue(decodeFreeSensorState(value.sensor)) &&
    isAcceptedRuntimeValue(decodeFreeCalibrationState(value.calibration)) &&
    isAcceptedRuntimeValue(decodeFreeRollbackSnapshots(value.rollbackSnapshots)) &&
    isPlainRecord(decodedTraceStore) &&
    Array.isArray(decodedTrials) &&
    isFreeTrialCollectionIntegrityValid(decodedTraceStore, decodedTrials) &&
    (
      activeProjection === undefined ||
      isFreeActivePersistenceProjectionConsistent(activeProjection)
    )
  );
};

const readGuideTrialSignalContext = (
  physicsConfig: unknown,
  pressureSensitivityMvPerKPa: unknown,
): GuideTrialSignalContext | null => {
  if (!isPlainRecord(physicsConfig) || !isPlainRecord(physicsConfig.environment)) return null;
  const atmosphericPressureKPa = physicsConfig.environment.ambientPressureKPa;
  return typeof atmosphericPressureKPa === 'number' && Number.isFinite(atmosphericPressureKPa) &&
    atmosphericPressureKPa > 0 &&
    typeof pressureSensitivityMvPerKPa === 'number' && Number.isFinite(pressureSensitivityMvPerKPa) &&
    pressureSensitivityMvPerKPa > 0
    ? { atmosphericPressureKPa, pressureSensitivityMvPerKPa }
    : null;
};

const GUIDE_WORKFLOW_STEPS: readonly HeatCapacityGuideWorkflowState['step'][] = [
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
];

const GUIDE_PAUSED_WORKFLOW_STEPS = new Set<HeatCapacityGuideWorkflowState['step']>([
  'recordU1Required',
  'closeStopcockAfterReleaseRequired',
  'recordU2Required',
  'closePowerRequired',
]);

const GUIDE_STRONG_REMINDER_TARGET_BY_STEP: Partial<Record<
  HeatCapacityGuideWorkflowState['step'],
  string
>> = {
  recordU1Required: 'recordU1',
  recordU2Required: 'recordU2',
  closePowerRequired: 'powerSwitch',
};

const isGuideStrongReminderSemanticallyValid = (
  workflow: HeatCapacityGuideWorkflowState,
) => workflow.strongReminderActive
  ? workflow.strongReminderTargetControlId === GUIDE_STRONG_REMINDER_TARGET_BY_STEP[workflow.step]
  : workflow.strongReminderTargetControlId === null;

const isGuideWorkflowStateSemanticallyValid = (
  workflow: HeatCapacityGuideWorkflowState,
) => workflow.paused === GUIDE_PAUSED_WORKFLOW_STEPS.has(workflow.step) &&
  (workflow.step === 'closeStopcockAfterReleaseRequired' || workflow.releaseCloseResumeAtMs === null) &&
  isGuideStrongReminderSemanticallyValid(workflow);

const isGuideReleaseCloseResumeProjectionConsistent = (
  workflow: HeatCapacityGuideWorkflowState,
  releaseState: HeatCapacityReleaseState,
  updatedAtMs: unknown,
) => {
  const resumeAtMs = workflow.releaseCloseResumeAtMs;
  if (resumeAtMs === null) return true;
  if (
    releaseState.phase !== 'closing' ||
    releaseState.purpose !== 'release' ||
    !releaseState.formedRelease ||
    releaseState.closeCommandAtS === null ||
    releaseState.closingCompletedAtS !== null ||
    typeof updatedAtMs !== 'number' ||
    !Number.isFinite(updatedAtMs)
  ) return false;
  const deadlineToleranceMs = 1;
  return resumeAtMs + deadlineToleranceMs >= updatedAtMs &&
    resumeAtMs <= updatedAtMs + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs +
      deadlineToleranceMs;
};

const GUIDE_PUMP_MUST_BE_OPEN_STEPS = new Set<HeatCapacityGuideWorkflowState['step']>([
  'pumpRequired',
  'closePumpValveRequired',
]);

const isGuidePumpValveProjectionConsistent = (
  workflow: HeatCapacityGuideWorkflowState,
  pumpValveOpen: unknown,
  pumpValveState: unknown,
) => {
  if (
    typeof pumpValveOpen !== 'boolean' ||
    pumpValveState !== (pumpValveOpen ? 'open' : 'closed')
  ) return false;
  if (GUIDE_PUMP_MUST_BE_OPEN_STEPS.has(workflow.step)) return pumpValveOpen;
  return !pumpValveOpen;
};

const GUIDE_STOPCOCK_CLOSED_ANGLE_DEG = 0;
const GUIDE_STOPCOCK_OPEN_ANGLE_DEG = 90;

const isGuideStopcockProjectionConsistent = (
  releaseState: HeatCapacityReleaseState,
  glassPistonState: unknown,
  stopcockAngleDeg: unknown,
) => {
  const controlOpen = releaseState.phase === 'opening' ||
    releaseState.phase === 'open' ||
    releaseState.phase === 'releasing';
  if (
    glassPistonState !== (controlOpen ? 'open' : 'closed') ||
    typeof stopcockAngleDeg !== 'number' ||
    !Number.isFinite(stopcockAngleDeg) ||
    stopcockAngleDeg < GUIDE_STOPCOCK_CLOSED_ANGLE_DEG ||
    stopcockAngleDeg > GUIDE_STOPCOCK_OPEN_ANGLE_DEG
  ) return false;
  if (releaseState.phase === 'closed' || releaseState.phase === 'closedAfterRelease') {
    return areRuntimeNumbersClose(stopcockAngleDeg, GUIDE_STOPCOCK_CLOSED_ANGLE_DEG);
  }
  if (releaseState.phase === 'open' || releaseState.phase === 'releasing') {
    return areRuntimeNumbersClose(stopcockAngleDeg, GUIDE_STOPCOCK_OPEN_ANGLE_DEG);
  }
  return true;
};

const isCompleteGuideTrial = (trial: HeatCapacityGuideTrial | null) => trial !== null &&
  trial.u0 !== null &&
  trial.u1 !== null &&
  trial.u2 !== null &&
  trial.correctedSignals !== null &&
  trial.completedAtMs !== null;

const isGuideWorkflowTrialSemanticsValid = (
  workflow: HeatCapacityGuideWorkflowState,
  trial: HeatCapacityGuideTrial | null,
  physicsState: HeatCapacityGuidePhysicsState,
  releaseState: HeatCapacityReleaseState,
) => {
  const simulationTimeS = physicsState.simulationTimeS;
  const stepIndex = GUIDE_WORKFLOW_STEPS.indexOf(workflow.step);
  if (
    stepIndex < 0 ||
    trial === null ||
    !isGuideWorkflowStateSemanticallyValid(workflow)
  ) return false;
  const u1WaitingStepIndex = GUIDE_WORKFLOW_STEPS.indexOf('u1Waiting');
  const openForReleaseStepIndex = GUIDE_WORKFLOW_STEPS.indexOf('openStopcockForReleaseRequired');
  const closeAfterReleaseStepIndex = GUIDE_WORKFLOW_STEPS.indexOf('closeStopcockAfterReleaseRequired');
  const u2WaitingStepIndex = GUIDE_WORKFLOW_STEPS.indexOf('u2Waiting');
  const closePowerStepIndex = GUIDE_WORKFLOW_STEPS.indexOf('closePowerRequired');
  if (stepIndex >= u1WaitingStepIndex) {
    if (
      physicsState.pumpStrokeCount <= 0 ||
      physicsState.lastPumpStrokeAtS === null ||
      physicsState.lastPumpValveOpenedAtS === null ||
      physicsState.lastPumpValveClosedAtS === null ||
      physicsState.lastPumpStrokeAtS < physicsState.lastPumpValveOpenedAtS ||
      physicsState.lastPumpStrokeAtS > physicsState.lastPumpValveClosedAtS
    ) return false;
  }
  const u1WaitActive = workflow.step === 'u1Waiting' || workflow.step === 'recordU1Required';
  const u2WaitActive = workflow.step === 'u2Waiting' || workflow.step === 'recordU2Required';
  if (u1WaitActive || u2WaitActive) {
    const expectedStage = u1WaitActive ? 'u1' : 'u2';
    if (
      workflow.waitStage !== expectedStage ||
      workflow.waitStartedAtS === null ||
      workflow.waitStartedAtS < 0 ||
      workflow.waitStartedAtS > simulationTimeS
    ) return false;
    const authoritativeWaitStartedAtS = u1WaitActive
      ? physicsState.lastPumpValveClosedAtS
      : releaseState.closingCompletedAtS;
    if (
      authoritativeWaitStartedAtS === null ||
      !areRuntimeNumbersClose(workflow.waitStartedAtS, authoritativeWaitStartedAtS) ||
      (u2WaitActive && releaseState.phase !== 'closedAfterRelease')
    ) return false;
    const waitTimer = deriveHeatCapacityGuideExperimentTimer(workflow, simulationTimeS);
    const recordRequired = workflow.step === 'recordU1Required' || workflow.step === 'recordU2Required';
    if (waitTimer.complete !== recordRequired) return false;
  } else if (workflow.waitStage !== null || workflow.waitStartedAtS !== null) {
    return false;
  }
  if (stepIndex >= openForReleaseStepIndex) {
    if (
      trial.u1 === null ||
      physicsState.lastPumpValveClosedAtS === null ||
      trial.u1.atS - physicsState.lastPumpValveClosedAtS + 0.000001 <
        HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S
    ) return false;
  }
  if (stepIndex < openForReleaseStepIndex) {
    if (releaseState.formedRelease || physicsState.releaseStarted) return false;
  } else if (stepIndex >= closeAfterReleaseStepIndex) {
    if (!releaseState.formedRelease || !physicsState.releaseStarted) return false;
  }
  if (stepIndex >= u2WaitingStepIndex && (
    releaseState.phase !== 'closedAfterRelease' ||
    releaseState.closingCompletedAtS === null
  )) return false;
  if (stepIndex >= closePowerStepIndex && (
    trial.u2 === null ||
    releaseState.closingCompletedAtS === null ||
    trial.u2.atS - releaseState.closingCompletedAtS + 0.000001 <
      HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S
  )) return false;
  const expectedRecordCount = stepIndex < GUIDE_WORKFLOW_STEPS.indexOf('closeStopcockBeforePumpRequired')
    ? 0
    : stepIndex < GUIDE_WORKFLOW_STEPS.indexOf('openStopcockForReleaseRequired')
      ? 1
      : stepIndex < GUIDE_WORKFLOW_STEPS.indexOf('closePowerRequired')
        ? 2
        : 3;
  const actualRecordCount = trial.u2 !== null
      ? 3
      : trial.u1 !== null
        ? 2
        : trial.u0 !== null
          ? 1
          : 0;
  const trialTimelineIsValid = [
    trial.u0?.atS ?? null,
    trial.u1?.atS ?? null,
    trial.u2?.atS ?? null,
    ...trial.eventLog.map((entry) => entry.atS),
  ].every((value) => isSimulationTimelineTimestamp(value, simulationTimeS));
  return trialTimelineIsValid && actualRecordCount === expectedRecordCount &&
    (expectedRecordCount === 3
      ? trial.correctedSignals !== null && trial.completedAtMs !== null
      : trial.correctedSignals === null && trial.completedAtMs === null);
};

const getPersistedGuideRuntimePhase = (
  powerOn: boolean,
  workflow: HeatCapacityGuideWorkflowState,
  releaseState: HeatCapacityReleaseState,
): HeatCapacityModeCommonRuntimeSnapshot['heatCapacityPhase'] => {
  if (!powerOn) return 'powerOff';
  if (releaseState.purpose === 'release') {
    if (releaseState.phase === 'opening') return 'sealedStabilizing';
    if (releaseState.phase === 'releasing') return 'releasing';
    if (releaseState.phase === 'closing' || releaseState.phase === 'closedAfterRelease') return 'recovering';
  }
  switch (workflow.step) {
    case 'powerRequired':
    case 'preheatRequired':
    case 'openStopcockForZeroRequired':
    case 'zeroRequired':
      return 'readyToZero';
    case 'recordU0Required':
    case 'closeStopcockBeforePumpRequired':
      return 'zeroed';
    case 'openPumpValveRequired':
      return 'readyToPump';
    case 'pumpRequired':
    case 'closePumpValveRequired':
      return 'pumping';
    case 'u1Waiting':
    case 'recordU1Required':
      return 'sealedStabilizing';
    case 'openStopcockForReleaseRequired':
    case 'closeStopcockAfterReleaseRequired':
      return 'releasing';
    case 'u2Waiting':
    case 'recordU2Required':
    case 'closePowerRequired':
      return 'recovering';
    case 'completed':
      return 'powerOff';
  }
};

const isGuideRuntimeProjectionConsistent = (
  runtime: Record<string, unknown>,
  common: Record<string, unknown>,
  expectedMode: Exclude<HeatCapacityMode, 'free'> | null = null,
  allowLegacyDemoProjection = false,
) => {
  const physicsConfig = runtime.heatCapacityGuidePhysicsConfig;
  const physicsState = runtime.heatCapacityGuidePhysicsState;
  const temperatureSensorState = runtime.heatCapacityGuideTemperatureSensorState;
  const workflow = runtime.heatCapacityGuideWorkflow;
  const trial = runtime.heatCapacityGuideTrial;
  const releaseState = common.heatCapacityReleaseState;
  if (
    !isPlainRecord(physicsConfig) || !isPlainRecord(physicsConfig.environment) ||
    !isPlainRecord(physicsState) || !isPlainRecord(temperatureSensorState) ||
    !isPlainRecord(workflow) || !isPlainRecord(releaseState)
  ) return false;
  const typedPhysicsConfig = physicsConfig as unknown as HeatCapacityGuidePhysicsConfig;
  const typedPhysicsState = physicsState as unknown as HeatCapacityGuidePhysicsState;
  const typedWorkflow = workflow as unknown as HeatCapacityGuideWorkflowState;
  const typedTrial = trial as HeatCapacityGuideTrial | null;
  const typedReleaseState = releaseState as unknown as HeatCapacityReleaseState;
  const synchronizedPhysicsState = migrateGuidePhysicsState(typedPhysicsState, typedPhysicsConfig);
  const derived = deriveGuidePhysicalState(synchronizedPhysicsState, typedPhysicsConfig);
  const demoCommonProjectionValid = expectedMode !== 'demo' ||
    allowLegacyDemoProjection || (
    typeof common.ambientPressureKPa === 'number' &&
    typeof common.gasPressureKPaAbs === 'number' &&
    typeof common.gasTemperatureK === 'number' &&
    (
      common.powerOn === true
        ? common.heatCapacityPhase !== 'powerOff' &&
          areRuntimeNumbersClose(
            common.pressureKPa,
            roundRuntimeNumber(common.gasPressureKPaAbs, 2),
          )
        : common.heatCapacityPhase === 'powerOff' && common.pressureKPa === null
    ) &&
    areRuntimeNumbersClose(
      common.pressureDeltaKPa,
      roundRuntimeNumber(Math.max(
        0,
        common.gasPressureKPaAbs - common.ambientPressureKPa,
      ), 4),
    ) &&
    areRuntimeNumbersClose(
      common.vesselPressureReadoutKPa,
      roundRuntimeNumber(common.gasPressureKPaAbs, 2),
    ) &&
    areRuntimeNumbersClose(
      common.vesselTemperatureReadoutK,
      roundRuntimeNumber(common.gasTemperatureK, 3),
    )
  );
  const guideProjectionValid = expectedMode !== 'demo' &&
    common.powerOn === (typedWorkflow.step !== 'powerRequired' && typedWorkflow.step !== 'completed') &&
    isGuideWorkflowTrialSemanticsValid(
      typedWorkflow,
      typedTrial,
      typedPhysicsState,
      typedReleaseState,
    ) &&
    common.heatCapacityPhase === getPersistedGuideRuntimePhase(
      common.powerOn === true,
      typedWorkflow,
      typedReleaseState,
    ) &&
    common.heatCapacityTeachingStatus === (
      typedWorkflow.step === 'completed' ? 'completed' : 'running'
    ) &&
    (typedWorkflow.step !== 'completed' || common.powerOn === false) &&
    isGuidePumpValveProjectionConsistent(
      typedWorkflow,
      common.pumpValveOpen,
      common.pumpValveState,
    ) &&
    isGuideReleaseCloseResumeProjectionConsistent(
      typedWorkflow,
      typedReleaseState,
      common.lastUpdateMs,
    );
  const demoProjectionValid = expectedMode === 'demo' &&
    (common.heatCapacityTeachingStatus === 'running' ||
      common.heatCapacityTeachingStatus === 'completed') &&
    (common.heatCapacityTeachingStatus !== 'completed' || (
      isCompleteGuideTrial(typedTrial) &&
      common.powerOn === false &&
      common.heatCapacityPhase === 'powerOff'
    )) &&
    common.pumpValveState === (common.pumpValveOpen === true ? 'open' : 'closed') &&
    isGuideWorkflowStateSemanticallyValid(typedWorkflow);
  const modeOwnChecks = {
    modeProjection: expectedMode === 'demo' ? demoProjectionValid : guideProjectionValid,
    demoCommonProjection: demoCommonProjectionValid,
    trialSource: typedTrial === null || expectedMode === null || typedTrial.source === expectedMode,
    thermodynamicProjection: isGuideThermodynamicProjectionConsistent(typedPhysicsState, typedPhysicsConfig),
    physicsTimeline: isPhysicsTimelineWithinSimulationTime(typedPhysicsState),
    releaseTimeline: isReleaseTimelineWithinSimulationTime(
      typedReleaseState,
      expectedMode === 'demo'
        ? common.simulationTimeS as number
        : typedPhysicsState.simulationTimeS,
    ),
    stopcockProjection: isGuideStopcockProjectionConsistent(
      typedReleaseState,
      common.glassPistonState,
      common.stopcockAngleDeg,
    ),
  };
  if (expectedMode === 'demo') {
    // Demo is driven by the teaching runtime stored in `common`; the Guide
    // physics engine remains dormant and intentionally keeps its own clock.
    // Validate each engine and Demo's own release projection, but never require
    // the two independent engines to share thermodynamic or timing projections.
    return Object.values(modeOwnChecks).every(Boolean);
  }
  const guideCrossProjectionChecks = {
    releasePhysicsProjection: isReleasePhysicsProjectionConsistent(typedPhysicsState, typedReleaseState),
    physicsControlTiming: isPhysicsControlTimingProjectionConsistent(
      typedPhysicsState,
      common.pumpValveOpen as boolean,
      isHeatCapacityReleaseFlowOpen(typedReleaseState),
    ),
    ambientPressure: common.ambientPressureKPa === physicsConfig.environment.ambientPressureKPa,
    ambientTemperature: common.ambientTemperatureK === physicsConfig.environment.ambientTemperatureK,
    gamma: common.theoreticalGamma === physicsConfig.gamma,
    gasPressure: areRuntimeNumbersClose(common.gasPressureKPaAbs, derived.gasPressureKPa),
    gasTemperature: areRuntimeNumbersClose(common.gasTemperatureK, synchronizedPhysicsState.gasTemperatureK),
    sensorTemperature: areRuntimeNumbersClose(
      common.sensorTemperatureK,
      temperatureSensorState.temperatureK as number,
    ),
    pressureDelta: areRuntimeNumbersClose(common.pressureDeltaKPa, derived.pressureDeltaKPa),
    simulationTime: areRuntimeNumbersClose(common.simulationTimeS, typedPhysicsState.simulationTimeS),
    pressureReadout: areRuntimeNumbersClose(
      common.vesselPressureReadoutKPa,
      roundRuntimeNumber(derived.gasPressureKPa, 2),
    ),
    temperatureReadout: areRuntimeNumbersClose(
      common.vesselTemperatureReadoutK,
      roundRuntimeNumber(synchronizedPhysicsState.gasTemperatureK, 3),
    ),
  };
  return Object.values(modeOwnChecks).every(Boolean) &&
    Object.values(guideCrossProjectionChecks).every(Boolean);
};

type HeatCapacityGuideActivePersistenceProjection = {
  mode: unknown;
  teachingStatus: unknown;
  controls: unknown;
  uiReplay: unknown;
  modeSessions: unknown;
  allowLegacyDemoProjection?: unknown;
  updatedAtMs: unknown;
};

const isGuideActivePersistenceProjectionConsistent = (
  value: Record<string, unknown>,
  projection: HeatCapacityGuideActivePersistenceProjection,
) => {
  if (projection.mode !== 'guide' && projection.mode !== 'demo') return true;
  if (!isPlainRecord(projection.controls) || !isPlainRecord(projection.uiReplay)) return false;
  const physicsConfig = value.physicsConfig as HeatCapacityGuidePhysicsConfig;
  const physicsState = value.physicsState as HeatCapacityGuidePhysicsState;
  const temperatureSensorState = value.temperatureSensorState as { temperatureK: number };
  const workflow = value.workflow as HeatCapacityGuideWorkflowState;
  const releaseState = projection.controls.releaseState as HeatCapacityReleaseState;
  if (!isPlainRecord(releaseState)) return false;
  const synchronizedPhysicsState = migrateGuidePhysicsState(physicsState, physicsConfig);
  const derived = deriveGuidePhysicalState(synchronizedPhysicsState, physicsConfig);
  const runtime = {
    heatCapacityGuidePhysicsConfig: physicsConfig,
    heatCapacityGuidePhysicsState: physicsState,
    heatCapacityGuideTemperatureSensorState: temperatureSensorState,
    heatCapacityGuideWorkflow: workflow,
    heatCapacityGuideTrial: value.trial,
  };
  if (
    projection.mode === 'demo' &&
    projection.allowLegacyDemoProjection !== true
  ) {
    const modeSessions = isPlainRecord(projection.modeSessions)
      ? projection.modeSessions
      : null;
    const demoEntry = modeSessions && isPlainRecord(modeSessions.demo)
      ? modeSessions.demo
      : null;
    const demoSnapshot = demoEntry && isPlainRecord(demoEntry.snapshot)
      ? demoEntry.snapshot
      : null;
    const demoCommon = demoSnapshot && isPlainRecord(demoSnapshot.common)
      ? demoSnapshot.common
      : null;
    const demoRuntime = demoSnapshot && isPlainRecord(demoSnapshot.demo)
      ? demoSnapshot.demo
      : null;
    const hasCanonicalDemoSnapshot = (
      !demoEntry ||
      (demoEntry.status !== 'suspended' && demoEntry.status !== 'completed') ||
      demoSnapshot?.mode !== 'demo' ||
      !demoCommon ||
      !demoRuntime
    ) === false;
    if (!hasCanonicalDemoSnapshot) {
      return false;
    } else if (
      !areRuntimeValuesStructurallyEqual(
        demoRuntime!.heatCapacityGuidePhysicsConfig,
        value.physicsConfig,
      ) ||
      !areRuntimeValuesStructurallyEqual(
        demoRuntime!.heatCapacityGuidePhysicsState,
        value.physicsState,
      ) ||
      !areRuntimeValuesStructurallyEqual(
        demoRuntime!.heatCapacityGuideTemperatureSensorState,
        value.temperatureSensorState,
      ) ||
      !areRuntimeValuesStructurallyEqual(
        demoRuntime!.heatCapacityGuideWorkflow,
        value.workflow,
      ) ||
      !areRuntimeValuesStructurallyEqual(
        demoRuntime!.heatCapacityGuideTrial,
        value.trial,
      ) ||
      !areRuntimeValuesStructurallyEqual(
        demoCommon!.heatCapacityReleaseState,
        releaseState,
      ) ||
      demoCommon!.heatCapacityTeachingStatus !== projection.teachingStatus ||
      demoCommon!.powerOn !== projection.controls.powerOn ||
      demoCommon!.pumpValveOpen !== projection.controls.pumpValveOpen ||
      (demoCommon!.glassPistonState === 'open') !== projection.controls.stopcockOpen ||
      demoCommon!.heatCapacityPhase !== projection.uiReplay.heatCapacityPhase ||
      !areRuntimeValuesStructurallyEqual(
        demoCommon!.pressureKPa,
        projection.uiReplay.pressureKPa,
      ) ||
      typeof projection.uiReplay.vesselPressureReadoutKPa !== 'number' ||
      !areRuntimeNumbersClose(
        demoCommon!.vesselPressureReadoutKPa,
        projection.uiReplay.vesselPressureReadoutKPa,
      ) ||
      typeof projection.uiReplay.vesselTemperatureReadoutK !== 'number' ||
      !areRuntimeNumbersClose(
        demoCommon!.vesselTemperatureReadoutK,
        projection.uiReplay.vesselTemperatureReadoutK,
      )
    ) {
      return false;
    }
    const stopcockShouldBeOpen = releaseState.phase === 'opening' ||
      releaseState.phase === 'open' ||
      releaseState.phase === 'releasing';
    return projection.controls.stopcockOpen === stopcockShouldBeOpen &&
      isGuideRuntimeProjectionConsistent(runtime, demoCommon!, 'demo');
  }
  const common = {
    powerOn: projection.controls.powerOn,
    pumpValveOpen: projection.controls.pumpValveOpen,
    pumpValveState: projection.controls.pumpValveOpen === true ? 'open' : 'closed',
    glassPistonState: projection.controls.stopcockOpen === true ? 'open' : 'closed',
    stopcockAngleDeg: projection.controls.stopcockOpen === true
      ? GUIDE_STOPCOCK_OPEN_ANGLE_DEG
      : GUIDE_STOPCOCK_CLOSED_ANGLE_DEG,
    lastUpdateMs: projection.updatedAtMs,
    heatCapacityReleaseState: releaseState,
    ambientPressureKPa: physicsConfig.environment.ambientPressureKPa,
    ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
    theoreticalGamma: physicsConfig.gamma,
    heatCapacityPhase: projection.uiReplay.heatCapacityPhase,
    heatCapacityTeachingStatus: projection.teachingStatus,
    gasPressureKPaAbs: derived.gasPressureKPa,
    gasTemperatureK: synchronizedPhysicsState.gasTemperatureK,
    sensorTemperatureK: temperatureSensorState.temperatureK,
    pressureDeltaKPa: derived.pressureDeltaKPa,
    simulationTimeS: physicsState.simulationTimeS,
    pressureKPa: projection.uiReplay.pressureKPa,
    vesselPressureReadoutKPa: projection.uiReplay.vesselPressureReadoutKPa,
    vesselTemperatureReadoutK: projection.uiReplay.vesselTemperatureReadoutK,
  };
  const stopcockShouldBeOpen = releaseState.phase === 'opening' ||
    releaseState.phase === 'open' ||
    releaseState.phase === 'releasing';
  return projection.controls.stopcockOpen === stopcockShouldBeOpen &&
    (projection.mode !== 'guide' ||
      isGuideReleaseCloseResumeProjectionConsistent(workflow, releaseState, projection.updatedAtMs)) &&
    isGuideRuntimeProjectionConsistent(
      runtime,
      common,
      projection.mode,
      projection.allowLegacyDemoProjection === true,
    );
};

export const isCanonicalHeatCapacityGuidePersistenceRuntime = (
  value: unknown,
  pressureSensitivityMvPerKPa: unknown,
  activeProjection?: HeatCapacityGuideActivePersistenceProjection,
) => {
  if (!isPlainRecord(value)) return false;
  const decodedPhysicsConfig = decodeGuidePhysicsConfig(value.physicsConfig);
  const decodedTrial = decodeNullableGuideTrial(value.trial);
  const context = readGuideTrialSignalContext(decodedPhysicsConfig, pressureSensitivityMvPerKPa);
  const canonicalRuntimeValid = isAcceptedRuntimeValue(decodedPhysicsConfig) &&
    isAcceptedRuntimeValue(decodeGuidePhysicsState(value.physicsState)) &&
    isAcceptedRuntimeValue(decodeGuideTemperatureSensorState(value.temperatureSensorState)) &&
    isAcceptedRuntimeValue(decodeGuideWorkflow(value.workflow)) &&
    isAcceptedRuntimeValue(decodedTrial) &&
    context !== null &&
    isGuideTrialSignalSemanticsValid(decodedTrial as HeatCapacityGuideTrial | null, context) &&
    isGuideThermodynamicProjectionConsistent(
      value.physicsState as HeatCapacityGuidePhysicsState,
      value.physicsConfig as HeatCapacityGuidePhysicsConfig,
    ) &&
    isPhysicsTimelineWithinSimulationTime(value.physicsState as HeatCapacityGuidePhysicsState);
  return canonicalRuntimeValid && (
    activeProjection === undefined ||
    isGuideActivePersistenceProjectionConsistent(value, activeProjection)
  );
};

const LEGACY_MODE_TIMING_DRIFT_TOLERANCE_S = 0.1;

const repairLegacyFreeStopcockDuration = (
  physicsState: Record<string, unknown>,
  releaseState: Record<string, unknown>,
) => {
  const simulationTimeS = physicsState.simulationTimeS;
  const openedAtS = physicsState.lastStopcockOpenedAtS;
  const closedAtS = physicsState.lastStopcockClosedAtS;
  const currentOpenDurationS = physicsState.currentStopcockOpenDurationS;
  if (
    typeof simulationTimeS !== 'number' || !Number.isFinite(simulationTimeS) || simulationTimeS < 0 ||
    typeof currentOpenDurationS !== 'number' || !Number.isFinite(currentOpenDurationS) ||
    (openedAtS !== null && (typeof openedAtS !== 'number' || !Number.isFinite(openedAtS))) ||
    (closedAtS !== null && (typeof closedAtS !== 'number' || !Number.isFinite(closedAtS)))
  ) return false;
  const flowOpen = releaseState.phase === 'open' || releaseState.phase === 'releasing';
  const expectedDurationS = flowOpen && typeof openedAtS === 'number' && closedAtS === null
    ? simulationTimeS - openedAtS
    : 0;
  if (
    expectedDurationS < 0 ||
    Math.abs(currentOpenDurationS - expectedDurationS) > LEGACY_MODE_TIMING_DRIFT_TOLERANCE_S
  ) return false;
  physicsState.currentStopcockOpenDurationS = expectedDurationS;
  return true;
};

const repairLegacyFreeDomainTiming = (value: unknown) => {
  if (
    !isPlainRecord(value) ||
    !Array.isArray(value.trials) ||
    !isPlainRecord(value.physicsState) ||
    !isPlainRecord(value.releaseState) ||
    !isPlainRecord(value.rollbackSnapshots)
  ) return false;
  const hasHistoricalArchivedTrial = value.trials.some((trialValue) => {
    const decodedTrial = decodeFreeTrial(trialValue);
    return decodedTrial !== INVALID_RUNTIME_VALUE &&
      isPlainRecord(decodedTrial) &&
      isHistoricalArchivedCompletedFreeTrial(decodedTrial as unknown as HeatCapacityFreeTrial);
  });
  if (!hasHistoricalArchivedTrial) return false;
  if (!repairLegacyFreeStopcockDuration(value.physicsState, value.releaseState)) return false;
  for (const snapshot of Object.values(value.rollbackSnapshots)) {
    if (snapshot === null) continue;
    if (
      !isPlainRecord(snapshot) ||
      !isPlainRecord(snapshot.heatCapacityFreePhysicsState) ||
      !isPlainRecord(snapshot.heatCapacityReleaseState) ||
      !repairLegacyFreeStopcockDuration(
        snapshot.heatCapacityFreePhysicsState,
        snapshot.heatCapacityReleaseState,
      )
    ) return false;
  }
  return true;
};

const repairLegacyFreeRuntimeTiming = (value: unknown): Record<string, unknown> | null => {
  const cloned = cloneBoundedRuntimeJson(value);
  if (!isPlainRecord(cloned)) return null;
  let repaired = false;
  for (const key of ['heatCapacityFreeRealDomain', 'heatCapacityFreeIdealDomain'] as const) {
    if (repairLegacyFreeDomainTiming(cloned[key])) repaired = true;
  }
  if (!repaired) return null;
  const activeDomain = cloned.heatCapacityFreeParameterScheme === 'real'
    ? cloned.heatCapacityFreeRealDomain
    : cloned.heatCapacityFreeParameterScheme === 'ideal'
      ? cloned.heatCapacityFreeIdealDomain
      : null;
  if (!isPlainRecord(activeDomain)) return null;
  cloned.heatCapacityFreePhysicsState = activeDomain.physicsState;
  cloned.heatCapacityFreeRollbackSnapshots = activeDomain.rollbackSnapshots;
  return cloned;
};

type RuntimeSnapshotNormalizationOptions = {
  allowLegacyGuideProjection?: boolean;
  repairLegacyFreeTiming?: boolean;
};

const normalizeRuntimeSnapshot = (
  value: unknown,
  expectedMode: HeatCapacityMode,
  expectedFileId: string,
  options: RuntimeSnapshotNormalizationOptions = {},
): HeatCapacityModeRuntimeSnapshot | null => {
  if (
    !isPlainRecord(value) ||
    value.schemaVersion !== HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION ||
    value.fileId !== expectedFileId ||
    value.mode !== expectedMode ||
    !isPlainRecord(value.common)
  ) return null;
  const decodedCommonRuntime = decodeCommonRuntime(value.common);
  if (decodedCommonRuntime === INVALID_RUNTIME_VALUE) {
    return null;
  }
  const modeKey = expectedMode;
  const storedModeRuntime = value[modeKey];
  if (!isPlainRecord(storedModeRuntime)) {
    return null;
  }
  const modeRuntime = expectedMode === 'free' && options.repairLegacyFreeTiming
    ? repairLegacyFreeRuntimeTiming(storedModeRuntime) ?? storedModeRuntime
    : storedModeRuntime;
  const decodedModeRuntime = expectedMode === 'free'
    ? decodeFreeRuntime(modeRuntime)
    : decodeGuideRuntime(modeRuntime);
  if (decodedModeRuntime === INVALID_RUNTIME_VALUE) {
    return null;
  }
  const common = decodedCommonRuntime as HeatCapacityModeCommonRuntimeSnapshot;
  const canonicalModeRuntime = decodedModeRuntime as Record<string, unknown>;
  if (expectedMode === 'free') {
    if (!isFreeRuntimeProjectionConsistent(
      canonicalModeRuntime,
      common as unknown as Record<string, unknown>,
    )) {
      return null;
    }
    return {
      schemaVersion: HEAT_CAPACITY_MODE_RUNTIME_SNAPSHOT_SCHEMA_VERSION,
      fileId: expectedFileId,
      mode: 'free',
      common,
      free: canonicalModeRuntime as HeatCapacityFreeModeRuntimeSnapshot,
    };
  }
  const guideRuntime = canonicalModeRuntime as HeatCapacityGuideModeRuntimeSnapshot;
  const guideSignalContext = readGuideTrialSignalContext(
    guideRuntime.heatCapacityGuidePhysicsConfig,
    common.pressureSensitivityMvPerKPa,
  );
  if (
    guideSignalContext === null
  ) {
    return null;
  }
  if (!isGuideTrialSignalSemanticsValid(guideRuntime.heatCapacityGuideTrial, guideSignalContext)) {
    return null;
  }
  if (!options.allowLegacyGuideProjection && !isGuideRuntimeProjectionConsistent(
      canonicalModeRuntime,
      common as unknown as Record<string, unknown>,
      expectedMode,
    )) {
    return null;
  }
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

const areModeSessionWallClockValuesWithinCapture = (
  snapshot: HeatCapacityModeRuntimeSnapshot,
  capturedAtMs: number,
) => {
  const common = snapshot.common;
  const historicalCommonTimestamps = [
    common.lastUpdateMs,
    common.displayResponseLastUpdateMs,
    common.lastPumpTime,
    ...common.pumpStrokeTimestamps,
    ...common.pressureZeroDisplayedSamples.map((sample) => sample.atMs),
  ];
  if (historicalCommonTimestamps.some((timestamp) => (
    timestamp !== null && timestamp > capturedAtMs
  ))) return false;
  const scheduledCommonTimestamps = [
    common.pressureDisplayNextJitterAtMs,
    common.temperatureDisplayNextJitterAtMs,
  ];
  if (scheduledCommonTimestamps.some((timestamp) => (
    timestamp > capturedAtMs + 350.000001
  ))) return false;

  if (snapshot.mode === 'free') {
    const domains = [
      snapshot.free.heatCapacityFreeRealDomain,
      snapshot.free.heatCapacityFreeIdealDomain,
    ];
    return domains.every((domain) => {
      const attempt = domain.activeAttempt;
      if (attempt !== null && [
        attempt.startedAtWallClockMs,
        attempt.powerOffStartedAtWallClockMs,
        attempt.invalidatedAtWallClockMs,
      ].some((timestamp) => timestamp !== null && timestamp > capturedAtMs)) return false;
      if (domain.trials.some((trial) => (
        trial.completedAtMs !== null && trial.completedAtMs > capturedAtMs
      ))) return false;
      return Object.values(domain.rollbackSnapshots).every((rollback) => (
        rollback === null || [
          rollback.lastPumpTime,
          ...rollback.pumpStrokeTimestamps,
          ...rollback.pressureZeroDisplayedSamples.map((sample) => sample.atMs),
        ].every((timestamp) => timestamp === null || timestamp <= capturedAtMs)
      ));
    });
  }

  const runtime = snapshot.mode === 'guide' ? snapshot.guide : snapshot.demo;
  const trialCompletedAtMs = runtime.heatCapacityGuideTrial?.completedAtMs ?? null;
  const closeResumeAtMs = runtime.heatCapacityGuideWorkflow.releaseCloseResumeAtMs;
  return (trialCompletedAtMs === null || trialCompletedAtMs <= capturedAtMs) &&
    (closeResumeAtMs === null || (
      closeResumeAtMs <= capturedAtMs + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs + 1
    ));
};

const normalizeEntry = (
  value: unknown,
  expectedMode: HeatCapacityMode,
  expectedFileId: string,
  options: RuntimeSnapshotNormalizationOptions = {},
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
  if (
    capturedAtMs === null ||
    capturedAtMs > Date.now() + 1_000
  ) return createEmptyHeatCapacityModeSessionEntry();
  const snapshot = normalizeRuntimeSnapshot(value.snapshot, expectedMode, expectedFileId, options);
  if (!snapshot) return createEmptyHeatCapacityModeSessionEntry();
  if (!areModeSessionWallClockValuesWithinCapture(snapshot, capturedAtMs)) {
    return createEmptyHeatCapacityModeSessionEntry();
  }
  if (
    snapshot.common.runState !== resumeRunState ||
    (value.status === 'completed') !== (snapshot.common.heatCapacityTeachingStatus === 'completed') ||
    (value.status === 'completed' && resumeRunState !== 'idle')
  ) {
    return createEmptyHeatCapacityModeSessionEntry();
  }
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

export const normalizeLegacyHeatCapacityModeSessionEntry = (
  value: unknown,
  expectedMode: HeatCapacityMode,
  expectedFileId: string,
): HeatCapacityModeSessionEntry | null => {
  const normalized = normalizeEntry(value, expectedMode, expectedFileId, {
    allowLegacyGuideProjection: expectedMode !== 'free',
    repairLegacyFreeTiming: expectedMode === 'free',
  });
  return normalized.status === 'empty' ? null : normalized;
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
