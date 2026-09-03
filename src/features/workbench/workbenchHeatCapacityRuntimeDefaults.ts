import {
  createDefaultHeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  createEmptyHeatCapacityFreeBatchState,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  type HeatCapacityFreeCalibrationState,
} from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  createEmptyHeatCapacityFreeExperimentGroupCollection,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  createHeatCapacityFreeIdealEffectiveConfigs,
} from '../../domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  createHeatCapacityFreeParameterDraftFromConfigs,
  type HeatCapacityFreeGasType,
  type HeatCapacityFreeParameterApplyResult,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  createDefaultFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  createSeededFreePressureInitialBiasMv,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  createDefaultFreeTraceStore,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS,
  type HeatCapacityFreeAttempt,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
  createDefaultGuidePhysicsConfig,
  createDefaultGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  createDefaultHeatCapacityGuideWorkflow,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  createHeatCapacityTemperatureSensorState,
} from '../../domain/heatCapacity/heatCapacityTemperatureSensorModel.ts';
import {
  createClosedHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  normalizeHeatCapacityFreePhysicsConfig,
  normalizeHeatCapacityFreeSensorConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import type {
  HeatCapacityFreeExperimentDomainState,
  HeatCapacityFreeFileAcknowledgements,
  HeatCapacityFreeParameterScheme,
  HeatCapacityFreeRollbackSnapshots,
  WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
} from './workbenchHeatCapacityStateTypes.ts';

export const HEAT_CAPACITY_FREE_RUNTIME_VERSION = 6;
export const HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS =
  HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS;
export const HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER:
  WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier = 8;

export const normalizeHeatCapacityFreeEquilibriumSpeedMultiplier = (
  value: unknown,
): WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier => (
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS.includes(
    value as WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  )
    ? value as WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier
    : HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER
);

export const createDefaultHeatCapacityFreeFileAcknowledgements = (
): HeatCapacityFreeFileAcknowledgements => ({
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});

const isHeatCapacityFreeAcknowledgementRecord = (
  value: unknown,
): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const normalizeHeatCapacityFreeFileAcknowledgements = (
  value: unknown,
): HeatCapacityFreeFileAcknowledgements => {
  const record = isHeatCapacityFreeAcknowledgementRecord(value) ? value : {};
  return {
    advancedParametersRisk:
      record.advancedParametersRisk === true ||
      record.advancedRiskAccepted === true,
    idealParameterProfileIntro: record.idealParameterProfileIntro === true,
  };
};

export const createDefaultHeatCapacityFreeParameterState = (
): HeatCapacityFreeParameterApplyResult => {
  const recordConfig = createDefaultHeatCapacityFreeRecordConfig();
  const draft = createHeatCapacityFreeParameterDraftFromConfigs(
    DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
    recordConfig,
    HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.noiseMv > 0,
  );
  return applyHeatCapacityFreeParameterDraftToConfigs(draft);
};

export const createHeatCapacityFreeIdealParameterState = (
  gasType: HeatCapacityFreeGasType = 'air',
): HeatCapacityFreeParameterApplyResult => {
  const ideal = createHeatCapacityFreeIdealEffectiveConfigs(
    'thermalEquilibrium',
    gasType,
  );
  return {
    environmentConfig: { ...ideal.environment },
    physicsConfig: ideal.physics,
    sensorConfig: normalizeHeatCapacityFreeSensorConfig(ideal.sensor),
    recordConfig: ideal.record,
    pressureWarningMv: ideal.pressureWarningMv,
    instrumentNoiseEnabled: ideal.instrumentNoiseEnabled,
    gasType,
  };
};

const createDefaultHeatCapacityFreeCalibrationState = (
): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 0,
  zeroOffsetMv: 0,
  zeroEvents: [],
  automaticU0: null,
});

const createDefaultHeatCapacityFreeRollbackSnapshots = (
): HeatCapacityFreeRollbackSnapshots => ({
  afterPowerOn: null,
  beforePump: null,
  beforeRelease: null,
});

export const createDefaultHeatCapacityFreeRuntimeFields = (
  seed: number | string = 'free-runtime',
  parameterState: HeatCapacityFreeParameterApplyResult =
    createDefaultHeatCapacityFreeParameterState(),
  pressureInitialBiasOverrideMv?: number,
) => {
  const physicsConfig = normalizeHeatCapacityFreePhysicsConfig(parameterState.physicsConfig);
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig(parameterState.sensorConfig);
  const recordConfig = { ...parameterState.recordConfig };
  const pressureInitialBiasMv = typeof pressureInitialBiasOverrideMv === 'number' &&
    Number.isFinite(pressureInitialBiasOverrideMv)
    ? pressureInitialBiasOverrideMv
    : createSeededFreePressureInitialBiasMv(
        seed,
        HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
      );
  return {
    heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    heatCapacityFreeRunWorkspace: {
      batch: createEmptyHeatCapacityFreeBatchState(),
      traceStore: createDefaultFreeTraceStore(),
      trials: [],
      activeAttempt: null as HeatCapacityFreeAttempt | null,
      currentExperimentStatus: 'draft' as const,
    },
    heatCapacityFreeFileAcknowledgements: createDefaultHeatCapacityFreeFileAcknowledgements(),
    heatCapacityFreeParameterScheme: 'real' as const,
    heatCapacityFreeDisplayScheme: 'real' as const,
    heatCapacityFreeExperimentGroups: createEmptyHeatCapacityFreeExperimentGroupCollection(),
    heatCapacityFreeInstrumentConfig: {
      record: recordConfig,
      pressureWarningMv: parameterState.pressureWarningMv,
      instrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
      environment: { ...physicsConfig.environment },
      physics: physicsConfig,
      sensor: sensorConfig,
    },
    heatCapacityFreeInstrumentState: {
      physics: createDefaultFreePhysicsState(physicsConfig, seed),
      sensor: createDefaultFreeSensorState(seed, {
        pressureMv: pressureInitialBiasMv,
        pressureInitialBiasMv,
        temperatureMv: sensorConfig.temperatureMvAtAmbient,
        sensorTemperatureK: physicsConfig.environment.ambientTemperatureK,
      }),
      calibration: createDefaultHeatCapacityFreeCalibrationState(),
    },
    heatCapacityReleaseState: createClosedHeatCapacityReleaseState(),
    heatCapacityFreeEquilibriumSpeedMultiplier:
      HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
    heatCapacityFreeRollbackSnapshots: createDefaultHeatCapacityFreeRollbackSnapshots(),
  };
};

export const createDefaultHeatCapacityFreeExperimentDomainState = (
  scheme: HeatCapacityFreeParameterScheme,
  seed: number | string = `${scheme}-free-runtime`,
  gasType: HeatCapacityFreeGasType = 'air',
): HeatCapacityFreeExperimentDomainState => {
  const parameterState = scheme === 'ideal'
    ? createHeatCapacityFreeIdealParameterState(gasType)
    : createDefaultHeatCapacityFreeParameterState();
  const fields = createDefaultHeatCapacityFreeRuntimeFields(
    seed,
    parameterState,
    scheme === 'ideal' ? 0 : undefined,
  );
  return {
    scheme,
    gasType: parameterState.gasType,
    batch: fields.heatCapacityFreeRunWorkspace.batch,
    experimentGroupStatus: fields.heatCapacityFreeRunWorkspace.currentExperimentStatus,
    activeRunConfigSnapshot: null,
    recordConfig: fields.heatCapacityFreeInstrumentConfig.record,
    pressureWarningMv: fields.heatCapacityFreeInstrumentConfig.pressureWarningMv,
    instrumentNoiseEnabled: fields.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
    environmentConfig: fields.heatCapacityFreeInstrumentConfig.environment,
    physicsConfig: fields.heatCapacityFreeInstrumentConfig.physics,
    physicsState: fields.heatCapacityFreeInstrumentState.physics,
    sensorConfig: fields.heatCapacityFreeInstrumentConfig.sensor,
    sensorState: fields.heatCapacityFreeInstrumentState.sensor,
    calibrationState: fields.heatCapacityFreeInstrumentState.calibration,
    releaseState: { ...fields.heatCapacityReleaseState },
    rollbackSnapshots: fields.heatCapacityFreeRollbackSnapshots,
    traceStore: createDefaultFreeTraceStore(),
    trials: [],
    activeAttempt: null,
  };
};

export const createDefaultHeatCapacityGuideRuntimeFields = () => {
  const heatCapacityGuidePhysicsConfig = createDefaultGuidePhysicsConfig();
  return {
    heatCapacityGuidePhysicsConfig,
    heatCapacityGuidePhysicsState: createDefaultGuidePhysicsState(
      heatCapacityGuidePhysicsConfig,
    ),
    heatCapacityGuideTemperatureSensorState: createHeatCapacityTemperatureSensorState(
      heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    ),
    heatCapacityGuideWorkflow: createDefaultHeatCapacityGuideWorkflow(),
    heatCapacityGuideTrial: null,
    heatCapacityGuideCalculationSession: null,
  };
};
