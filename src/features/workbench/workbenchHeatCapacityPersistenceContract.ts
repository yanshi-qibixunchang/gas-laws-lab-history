import {
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  type HeatCapacityFreeConfigSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityFreeExperimentGroupStatus,
  HeatCapacityFreeGasType,
  HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type { HeatCapacityFreeRecordConfig } from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  type HeatCapacityFreeDisplayScheme,
  type HeatCapacityFreeExperimentDomainState,
  type HeatCapacityFreeFileAcknowledgements,
  type HeatCapacityFreeParameterScheme,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  clonePersistenceValue,
  isPersistenceFiniteNumber,
  isPersistenceRecord,
} from './workbenchPersistenceValue.ts';

export const HEAT_CAPACITY_SCHEMA_VERSION = 1 as const;

export const HEAT_CAPACITY_FREE_UI_REPLAY_KEYS = [
  'heatCapacityTabContainerHeight',
  'heatCapacityPhase',
  'temperatureSignalTargetMv',
  'pressureSignalTargetMv',
  'displayResponseLastUpdateMs',
  'pressureZeroDisplayedSamples',
  'pressureDisplayJitterOffset',
  'pressureDisplayNextJitterAtMs',
  'pressureReleaseBurstUntilMs',
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
  'pressureGaugeDisplayValue',
  'pressureZeroAdjustMode',
  'temperatureSignalMv',
  'pressureSignalMv',
  'pressureKPa',
  'pressureLimitKPa',
  'pumpStrokeTimestamps',
  'pumpFrequency',
  'pumpFrequencyStatus',
  'lastPumpTime',
  'pumpStrokeCount',
  'pumpHint',
  'heatCapacityFreeStopcockPendingOpenAtMs',
  'heatCapacityFreeEquilibriumSpeedMultiplier',
  'heatCapacityFreeEquilibriumSpeedHintShown',
  'hardSphereViewEnabled',
  'vesselPressureReadoutKPa',
  'vesselTemperatureReadoutK',
  'recordedPressures',
  'heatCapacityProcessSamples',
] as const satisfies readonly (keyof WorkbenchHeatCapacityState)[];

export type HeatCapacityFreeUiReplayV1 = Pick<
  WorkbenchHeatCapacityState,
  typeof HEAT_CAPACITY_FREE_UI_REPLAY_KEYS[number]
>;

export interface HeatCapacityFreePersistenceDataV1 {
  runtimeVersion: typeof HEAT_CAPACITY_FREE_RUNTIME_VERSION;
  traceVersion: typeof HEAT_CAPACITY_FREE_TRACE_VERSION;
  calculationVersion: typeof HEAT_CAPACITY_FREE_CALCULATION_VERSION;
  parameterScheme: HeatCapacityFreeParameterScheme;
  displayScheme: HeatCapacityFreeDisplayScheme;
  gasType: HeatCapacityFreeGasType;
  real: HeatCapacityFreeExperimentDomainState;
  ideal: HeatCapacityFreeExperimentDomainState;
  config: HeatCapacityFreeConfigSnapshot;
  parameterDraft: HeatCapacityFreeParameterDraft;
  experimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  activeRunConfigSnapshot: HeatCapacityFreeConfigSnapshot | null;
  acknowledgements: HeatCapacityFreeFileAcknowledgements;
  recordConfig: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
  instrumentNoiseEnabled: boolean;
  runtime: WorkbenchHeatCapacityState['heatCapacityFreePhysicsState'];
  controls: {
    powerOn: boolean;
    pumpValveOpen: boolean;
    stopcockOpen: boolean;
    pumpBulbState: WorkbenchHeatCapacityState['pumpBulbState'];
    stopcockFlowOpen: boolean;
    stopcockFlowPurpose: WorkbenchHeatCapacityState['heatCapacityFreeStopcockFlowPurpose'];
  };
  sensor: WorkbenchHeatCapacityState['heatCapacityFreeSensorState'];
  calibration: WorkbenchHeatCapacityState['heatCapacityFreeCalibrationState'];
  rollbackSnapshots: WorkbenchHeatCapacityState['heatCapacityFreeRollbackSnapshots'];
  traceStore: WorkbenchHeatCapacityState['heatCapacityFreeTraceStore'];
  trials: WorkbenchHeatCapacityState['heatCapacityFreeTrials'];
  uiReplay: HeatCapacityFreeUiReplayV1;
}

export interface HeatCapacityGuidePersistenceDataV1 {
  physicsConfig: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'];
  physicsState: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'];
  workflow: WorkbenchHeatCapacityState['heatCapacityGuideWorkflow'];
  trial: WorkbenchHeatCapacityState['heatCapacityGuideTrial'];
}

export interface HeatCapacityPersistencePayloadV1 {
  experimentKind: 'heatCapacity';
  heatCapacitySchemaVersion: typeof HEAT_CAPACITY_SCHEMA_VERSION;
  mode: WorkbenchHeatCapacityState['heatCapacityMode'];
  common: {
    materialsExpanded: boolean;
    teachingStatus: WorkbenchHeatCapacityState['heatCapacityTeachingStatus'];
    openHeatCapacityTabs: WorkbenchHeatCapacityState['openHeatCapacityTabs'];
    activeHeatCapacityTabId: WorkbenchHeatCapacityState['activeHeatCapacityTabId'];
    experimentSeed: WorkbenchHeatCapacityState['heatCapacityExperimentSeed'];
    experimentProfile: WorkbenchHeatCapacityState['heatCapacityExperimentProfile'];
    lessonIntroAutoShown: boolean;
  };
  free: HeatCapacityFreePersistenceDataV1 | null;
  guided: HeatCapacityGuidePersistenceDataV1 | null;
  demo: null;
}

export interface HeatCapacityPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

export const createHeatCapacityFreeUiReplay = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeUiReplayV1 => (
  Object.fromEntries(HEAT_CAPACITY_FREE_UI_REPLAY_KEYS.map((key) => [
    key,
    clonePersistenceValue(file[key]),
  ])) as HeatCapacityFreeUiReplayV1
);

export const normalizeHeatCapacityFreeUiReplay = (
  value: unknown,
): Partial<HeatCapacityFreeUiReplayV1> => {
  if (!isPersistenceRecord(value)) return {};
  return Object.fromEntries(HEAT_CAPACITY_FREE_UI_REPLAY_KEYS
    .filter((key) => Object.prototype.hasOwnProperty.call(value, key))
    .map((key) => [key, clonePersistenceValue(value[key])])) as Partial<HeatCapacityFreeUiReplayV1>;
};

export const validateHeatCapacityPersistencePayload = (
  payload: unknown,
): HeatCapacityPayloadValidationResult => {
  const errors: string[] = [];
  if (!isPersistenceRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (payload.experimentKind !== 'heatCapacity') {
    errors.push('experimentKind must be heatCapacity');
  }
  if (payload.heatCapacitySchemaVersion !== HEAT_CAPACITY_SCHEMA_VERSION) {
    errors.push('heatCapacitySchemaVersion is unsupported');
  }
  const free = isPersistenceRecord(payload.free) ? payload.free : null;
  if (!free) {
    errors.push('free payload is required');
    return { valid: false, errors };
  }
  const runtime = isPersistenceRecord(free.runtime) ? free.runtime : null;
  if (!runtime || !isPersistenceFiniteNumber(runtime.gasAmountRatio) || runtime.gasAmountRatio <= 0) {
    errors.push('free.runtime.gasAmountRatio must be > 0');
  }
  const config = isPersistenceRecord(free.config) ? free.config : null;
  const environment = config && isPersistenceRecord(config.environment) ? config.environment : null;
  const physics = config && isPersistenceRecord(config.physics) ? config.physics : null;
  if (!config || config.version !== HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION) {
    errors.push('free.config.version is unsupported');
  }
  if (!isPersistenceRecord(free.parameterDraft)) {
    errors.push('free.parameterDraft is required');
  }
  if (
    free.gasType !== undefined &&
    free.gasType !== 'air' &&
    free.gasType !== 'helium'
  ) {
    errors.push('free.gasType must be air or helium');
  }
  if (!isPersistenceRecord(free.recordConfig)) {
    errors.push('free.recordConfig is required');
  }
  if (!isPersistenceFiniteNumber(free.pressureWarningMv)) {
    errors.push('free.pressureWarningMv must be a finite number');
  }
  if (typeof free.instrumentNoiseEnabled !== 'boolean') {
    errors.push('free.instrumentNoiseEnabled must be a boolean');
  }
  if (
    !environment ||
    !isPersistenceFiniteNumber(environment.ambientTemperatureK) ||
    environment.ambientTemperatureK <= 0
  ) {
    errors.push('free.config.environment.ambientTemperatureK must be > 0');
  }
  if (!physics || !isPersistenceFiniteNumber(physics.gamma) || physics.gamma <= 1) {
    errors.push('free.config.physics.gamma must be > 1');
  }
  if (!isPersistenceRecord(free.traceStore) || !Array.isArray(free.traceStore.traceTrials)) {
    errors.push('free.traceStore.traceTrials must be an array');
  }
  if (!Array.isArray(free.trials)) {
    errors.push('free.trials must be an array');
  }
  return { valid: errors.length === 0, errors };
};
