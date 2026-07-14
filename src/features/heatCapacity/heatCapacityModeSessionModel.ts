import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import type {
  WorkbenchHeatCapacityRefreshSession,
} from '../workbench/workbenchHeatCapacityRefreshSession.ts';
import {
  clonePersistenceValue,
  isPersistenceRecord,
} from '../workbench/workbenchPersistenceValue.ts';
import type {
  WorkbenchHeatCapacityState,
  WorkbenchRunState,
} from '../workbench/workbenchState.ts';

export const HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION = 1 as const;

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
      mode: 'free';
      common: HeatCapacityModeCommonRuntimeSnapshot;
      free: HeatCapacityFreeModeRuntimeSnapshot;
    }
  | {
      mode: 'guide';
      common: HeatCapacityModeCommonRuntimeSnapshot;
      guide: HeatCapacityGuideModeRuntimeSnapshot;
    }
  | {
      mode: 'demo';
      common: HeatCapacityModeCommonRuntimeSnapshot;
      demo: HeatCapacityGuideModeRuntimeSnapshot;
    };

export interface HeatCapacityModeSessionEntry {
  status: HeatCapacityModeSessionStatus;
  resumeRunState: WorkbenchRunState;
  capturedAtMs: number | null;
  snapshot: HeatCapacityModeRuntimeSnapshot | null;
  uiCheckpoint: WorkbenchHeatCapacityRefreshSession | null;
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
      mode: 'free',
      common,
      free: pickHeatCapacitySessionFields(file, HEAT_CAPACITY_FREE_SESSION_KEYS),
    };
  }
  if (file.heatCapacityMode === 'guide') {
    return {
      mode: 'guide',
      common,
      guide: pickHeatCapacitySessionFields(file, HEAT_CAPACITY_GUIDE_SESSION_KEYS),
    };
  }
  return {
    mode: 'demo',
    common,
    demo: pickHeatCapacitySessionFields(file, HEAT_CAPACITY_GUIDE_SESSION_KEYS),
  };
};

const withoutSceneFrame = (
  checkpoint: WorkbenchHeatCapacityRefreshSession | null,
): WorkbenchHeatCapacityRefreshSession | null => checkpoint
  ? {
      ...checkpoint,
      ui: {
        windows: {},
        drafts: {},
        layout: {
          guideChecklistViewedIndex: checkpoint.ui.layout.guideChecklistViewedIndex,
          pumpAnimationFileId: checkpoint.ui.layout.pumpAnimationFileId,
          pumpAnimationReleaseRemainingMs: checkpoint.ui.layout.pumpAnimationReleaseRemainingMs,
          pumpAnimationIdleRemainingMs: checkpoint.ui.layout.pumpAnimationIdleRemainingMs,
          cameraTransition: checkpoint.ui.layout.cameraTransition,
          ultraVisualState: checkpoint.ui.layout.ultraVisualState,
          hardSphereVisualCheckpoint: checkpoint.ui.layout.hardSphereVisualCheckpoint,
          heatCapacityFocusSession: checkpoint.ui.layout.heatCapacityFocusSession,
        },
      },
      sceneSnapshot: null,
    }
  : null;

export const suspendHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  uiCheckpoint: WorkbenchHeatCapacityRefreshSession | null,
  capturedAtMs = Date.now(),
): WorkbenchHeatCapacityState => {
  const mode = file.heatCapacityMode;
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
        uiCheckpoint: withoutSceneFrame(uiCheckpoint),
      },
    },
  };
};

export const hasHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
) => file.heatCapacityModeSessions[mode].snapshot?.mode === mode;

export const restoreHeatCapacityModeSession = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  now = Date.now(),
): WorkbenchHeatCapacityState | null => {
  const entry = file.heatCapacityModeSessions[mode];
  const snapshot = entry.snapshot;
  if (!snapshot || snapshot.mode !== mode) return null;
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

const normalizeEntry = (value: unknown): HeatCapacityModeSessionEntry => {
  if (!isPersistenceRecord(value)) return createEmptyHeatCapacityModeSessionEntry();
  const status: HeatCapacityModeSessionStatus = value.status === 'suspended' || value.status === 'completed'
    ? value.status
    : 'empty';
  const resumeRunState: WorkbenchRunState = value.resumeRunState === 'running' || value.resumeRunState === 'paused'
    ? value.resumeRunState
    : 'idle';
  const capturedAtMs = typeof value.capturedAtMs === 'number' && Number.isFinite(value.capturedAtMs)
    ? value.capturedAtMs
    : null;
  const snapshot = isPersistenceRecord(value.snapshot)
    ? clonePersistenceValue(value.snapshot) as unknown as HeatCapacityModeRuntimeSnapshot
    : null;
  const uiCheckpoint = isPersistenceRecord(value.uiCheckpoint)
    ? clonePersistenceValue(value.uiCheckpoint) as unknown as WorkbenchHeatCapacityRefreshSession
    : null;
  return {
    status,
    resumeRunState,
    capturedAtMs,
    snapshot,
    uiCheckpoint,
  };
};

export const normalizeHeatCapacityModeSessionStore = (
  value: unknown,
): HeatCapacityModeSessionStore => {
  if (!isPersistenceRecord(value) || value.schemaVersion !== HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION) {
    return createDefaultHeatCapacityModeSessionStore();
  }
  return {
    schemaVersion: HEAT_CAPACITY_MODE_SESSION_SCHEMA_VERSION,
    demo: normalizeEntry(value.demo),
    guide: normalizeEntry(value.guide),
    free: normalizeEntry(value.free),
  };
};
