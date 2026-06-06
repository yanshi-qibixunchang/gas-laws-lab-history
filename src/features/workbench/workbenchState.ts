import type {
  ChartData,
  ExperimentRelation,
  Particle,
  PressureMeasurementSummary,
  SimulationParams,
  SimulationStats,
} from '../../shared/types';
import type {
  PhysicsEngineSnapshotV1,
} from '../../domain/hardSphere/PhysicsEngine.ts';
import {
  createEmptyPointsByRelation,
  type PointsByRelation,
} from '../../domain/idealGas/idealGasExperiment.ts';
import {
  applyHeatCapacityPumpStroke as applyHeatCapacityRuntimePumpStroke,
  captureHeatCapacityProcessSample,
  DEFAULT_HEAT_CAPACITY_MODEL_CONFIG,
  HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA,
  createDefaultHeatCapacityRuntimeState,
  powerHeatCapacityRuntimeState,
  stepHeatCapacityExperiment,
  updateHeatCapacityRuntimeZeroOffset,
  type HeatCapacityProcessSampleKey,
  type HeatCapacityProcessSamplePoint,
  type HeatCapacityProcessSamples,
  type HeatCapacityRuntimePhase,
  type HeatCapacityRuntimeState,
} from '../../domain/heatCapacity/heatCapacityExperimentModel.ts';
import {
  calculateHeatCapacityGamma,
  type HeatCapacityResult,
} from '../../domain/heatCapacity/heatCapacityResultModel.ts';
import type {
  HeatCapacitySample,
} from '../../domain/heatCapacity/heatCapacitySampling.ts';
import {
  applyPressureZero,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
  HEAT_CAPACITY_TEMPERATURE_DISPLAY_RESPONSE,
  HEAT_CAPACITY_VIDEO_PROFILE,
  getHeatCapacityDisplayValue,
  getHeatCapacityRangeMidpoint,
} from '../../domain/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  createDefaultHeatCapacityProcessingResult,
  createHeatCapacityTrials,
  type HeatCapacityProcessingResult,
  type HeatCapacityTrial,
} from '../../domain/heatCapacity/heatCapacityTrialModel.ts';
import {
  createHeatCapacityExperimentProfile,
  createHeatCapacityExperimentSeed,
  type HeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
  applyFreePumpStroke as applyFreeRuntimePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeEnvironmentConfig,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  normalizeFreeThermalConfig,
} from '../../domain/heatCapacity/heatCapacityFreeThermalModel.ts';
import {
  normalizeFreeLeakageConfig,
} from '../../domain/heatCapacity/heatCapacityFreeLeakageModel.ts';
import {
  createDefaultFreeSensorState,
  createSeededFreePressureInitialBiasMv,
  HEAT_CAPACITY_FREE_PUMP_SENSOR_LAG_RATE,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
} from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import type {
  HeatCapacityFreeCalibrationState,
} from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  createHeatCapacityFreeTrial,
  removeHeatCapacityFreeTrialRecord,
  type HeatCapacityFreeRecordRejectReason,
  type HeatCapacityFreeRecordTraceReference,
  type HeatCapacityFreeTrial,
  type HeatCapacityFreeTrialRecordRemovalKind,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  evaluateFreeU0Record,
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  archiveCurrentFreeTraceBranchForRecordInvalidation,
  appendFreeTraceEvent,
  appendFreeTraceSample,
  compactFreeTraceBranch,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  type HeatCapacityFreeEventType,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceSampleInput,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  selectHeatCapacityDisplaySource,
  type HeatCapacityDisplaySource,
} from '../../domain/heatCapacity/heatCapacityDisplaySource.ts';
import type {
  HeatCapacityMode,
} from '../../domain/heatCapacity/heatCapacityFreeModePolicy.ts';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getEffectiveHeatCapacityFreeSensorConfig,
  normalizeHeatCapacityFreeParameterDraft,
  type HeatCapacityFreeExperimentGroupStatus,
  type HeatCapacityFreeParameterApplyResult,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

export type WorkbenchFileKind = 'standard' | 'ideal' | 'heatCapacity';
export type WorkbenchRunState = 'idle' | 'running' | 'paused' | 'finished' | 'needs-reset';
export type WorkbenchExportEnvironmentStatus =
  | 'checking'
  | 'available-system'
  | 'available-bundled'
  | 'unavailable'
  | 'error';
export type WorkbenchPanelKey =
  | 'preview'
  | 'realtime'
  | 'results'
  | 'experimentPoints'
  | 'verification'
  | 'heatCapacityGuide'
  | 'heatCapacityRecords'
  | 'heatCapacityProcessing'
  | 'heatCapacityReview'
  | 'history';
export type WorkbenchIdealResultWindowKey = 'experimentPoints' | 'verification';
export type WorkbenchStandardResultsTab = 'summary' | 'dataTable' | 'figures';
export type WorkbenchHeatCapacityPanelKey =
  | 'heatCapacityGuide'
  | 'heatCapacityRecords'
  | 'heatCapacityProcessing'
  | 'heatCapacityReview';
export type WorkbenchHeatCapacityTabId = 'guide' | 'records' | 'processing' | 'review';

export const IDEAL_RESULT_HEIGHT_RATIO = 0.5;
export const WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO = 0.48;
export const WORKBENCH_LIVE_SPLIT_MIN_RATIO = 0.34;
export const WORKBENCH_LIVE_SPLIT_MAX_RATIO = 0.66;
export const WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO = 0.66;
export const HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG = 0;
export const HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG = 90;

export const clampWorkbenchLiveSplitRatio = (value: unknown) => {
  const ratio = typeof value === 'number' && Number.isFinite(value)
    ? value
    : WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO;
  return Math.min(WORKBENCH_LIVE_SPLIT_MAX_RATIO, Math.max(WORKBENCH_LIVE_SPLIT_MIN_RATIO, ratio));
};

export type WorkbenchHeatCapacityStopcockState = 'closed' | 'open';
export type WorkbenchHeatCapacityPumpValveState = 'closed' | 'open';
export type WorkbenchHeatCapacityPumpBulbState = 'idle' | 'compressing' | 'releasing';
export type WorkbenchHeatCapacityPumpFrequencyStatus = 'idle' | 'tooSlow' | 'suitable';
export type WorkbenchHeatCapacityPressureZeroAdjustMode = 'none' | 'fineWheel' | 'coarseDrag';
export type WorkbenchHeatCapacityPressureSafetyStatus = 'normal' | 'warning' | 'danger';

export const HEAT_CAPACITY_FREE_RUNTIME_VERSION = 5;
export const HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS = 3000;
export const HEAT_CAPACITY_MIN_PUMP_FREQUENCY = 0.5;
export const HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV = 90;
export const HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV = 115;
export const HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV = 140;
export const HEAT_CAPACITY_RELEASE_BURST_DURATION_MS = 1_000;
export const HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV = 3.2;
export const HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 2;
export const HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN = 1;
export const HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS = 420;
export const HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS = [1, 2, 4, 8] as const;
export type WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier =
  typeof HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS[number];
export const HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER:
  WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier = 4;
export const HEAT_CAPACITY_FREE_ACCELERATED_SAMPLE_STEP_S = HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S;
const HEAT_CAPACITY_FREE_ACCELERATED_MAX_SEGMENTS = 600;
export const DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG: HeatCapacityFreeEnvironmentConfig = {
  ambientTemperatureK: 298.15,
  ambientPressureKPa: 101.3,
};
export const DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG: HeatCapacityFreePhysicsConfig = {
  environment: DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG,
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.015,
  pumpPressureLimitKPa: 108.3,
  pumpTemperatureGainK: 0.35,
  stopcockFlowRate: 4,
  releaseCoolingFactor: 1,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
  leakage: {
    enabled: false,
    ratePerS: 0.0005,
  },
};
export const DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG: HeatCapacityFreeSensorConfig = {
  pressureMvPerKPa: DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor.pressureSensitivityMvPerKPa,
  temperatureMvAtAmbient: getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.initialTemperatureMvRange),
  temperatureMvPerK: 2,
  lagRate: 8,
  noiseMv: 0.04,
  quantizationMv: 0.01,
  minSampleIntervalS: 0.08,
  maxSampleIntervalS: 0.12,
  historyWindowS: 2,
};
const normalizeHeatCapacityFreeSensorConfig = (
  config: Partial<HeatCapacityFreeSensorConfig> | null | undefined,
): HeatCapacityFreeSensorConfig => ({
  ...DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  ...config,
  lagRate: clampNumber(
    finiteNumberOr(config?.lagRate, DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.lagRate),
    0.01,
    60,
  ),
  minSampleIntervalS: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.minSampleIntervalS,
  maxSampleIntervalS: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.maxSampleIntervalS,
});
export const normalizeHeatCapacityFreeEquilibriumSpeedMultiplier = (
  value: unknown,
): WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier => (
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS.includes(
    value as WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  )
    ? value as WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier
    : HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER
);

const finiteNumberOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const normalizeHeatCapacityFreePhysicsConfig = (
  value: Partial<HeatCapacityFreePhysicsConfig> | null | undefined,
): HeatCapacityFreePhysicsConfig => {
  const environment = {
    ambientPressureKPa: finiteNumberOr(
      value?.environment?.ambientPressureKPa,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa,
    ),
    ambientTemperatureK: finiteNumberOr(
      value?.environment?.ambientTemperatureK,
      DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientTemperatureK,
    ),
  };
  return {
    environment,
    vesselVolumeL: Math.max(0.001, finiteNumberOr(
      value?.vesselVolumeL,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.vesselVolumeL,
    )),
    gamma: Math.max(1.001, finiteNumberOr(
      value?.gamma,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.gamma,
    )),
    pumpAmountGainRatio: Math.max(0.000001, finiteNumberOr(
      value?.pumpAmountGainRatio,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpAmountGainRatio,
    )),
    pumpPressureLimitKPa: clampNumber(
      Math.max(0.001, finiteNumberOr(
        value?.pumpPressureLimitKPa,
        DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpPressureLimitKPa,
      )),
      0.001,
      HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
    ),
    pumpTemperatureGainK: finiteNumberOr(
      value?.pumpTemperatureGainK,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpTemperatureGainK,
    ),
    stopcockFlowRate: Math.max(0, finiteNumberOr(
      value?.stopcockFlowRate,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.stopcockFlowRate,
    )),
    releaseCoolingFactor: finiteNumberOr(
      value?.releaseCoolingFactor,
      DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.releaseCoolingFactor,
    ),
    thermal: normalizeFreeThermalConfig(value?.thermal),
    leakage: normalizeFreeLeakageConfig(value?.leakage),
  };
};
export const HEAT_CAPACITY_PRESSURE_ZERO_TOTAL_TURNS = 3;
export const HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV = 1.5;
export const HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV = -1.5;
export const HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV = 1.5;
export const HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG = -540;
export const HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG = 540;
export const HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV = 0.1;
export const HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS = 1000;
export const HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT = 5;
export const HEAT_CAPACITY_GAUGE_PRESSURE_MIN_KPA = 0;
export const HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA = 10;
export const HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD = -2.15;
export const HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD = 2.15;
export const HEAT_CAPACITY_GAUGE_DANGER_START_ROTATION_RAD = 0.86;
const HEAT_CAPACITY_GAUGE_DANGER_START_FRACTION = (
  (HEAT_CAPACITY_GAUGE_DANGER_START_ROTATION_RAD - HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD) /
  (HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD - HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD)
);
const radiansToRoundedDegrees = (radians: number) => Math.round((radians * 180 / Math.PI) * 100) / 100;
export const HEAT_CAPACITY_GAUGE_ANGLE_MIN_DEG = radiansToRoundedDegrees(HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD);
export const HEAT_CAPACITY_GAUGE_ANGLE_MAX_DEG = radiansToRoundedDegrees(HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD);
export const HEAT_CAPACITY_GAUGE_RISE_RATE = 3.2;
export const HEAT_CAPACITY_GAUGE_FALL_RATE = 9.5;
export { HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA };

const normalizeDegrees360 = (value: number) => ((value % 360) + 360) % 360;
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const createDefaultHeatCapacityFreeRecordConfig = (): HeatCapacityFreeRecordConfig => ({
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
});
const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const getHeatCapacityPressureThresholdsMv = (
  file: Partial<WorkbenchHeatCapacityState> = {},
) => {
  const freeRecordConfig = file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
    ? file.heatCapacityFreeRecordConfig
    : null;
  const pressureWarningThresholdMv = Number.isFinite(file.heatCapacityFreePressureWarningMv)
    ? Math.max(0, Number(file.heatCapacityFreePressureWarningMv))
    : HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV;
  const pressureDangerThresholdMv = Number.isFinite(freeRecordConfig?.pressureDangerMv)
    ? Math.max(0, Number(freeRecordConfig?.pressureDangerMv))
    : HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV;
  return {
    pressureWarningThresholdMv,
    pressureDangerThresholdMv,
  };
};

const getHeatCapacityGaugeConfig = (file: Partial<WorkbenchHeatCapacityState> = {}) => {
  const freeSensorConfig = file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
    ? file.heatCapacityFreeSensorConfig
    : null;
  const pressureSensitivityMvPerKPa = Number.isFinite(freeSensorConfig?.pressureMvPerKPa)
    ? Math.max(0.001, Number(freeSensorConfig?.pressureMvPerKPa))
    : Number.isFinite(file.pressureSensitivityMvPerKPa)
    ? Math.max(0.001, Number(file.pressureSensitivityMvPerKPa))
    : DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor.pressureSensitivityMvPerKPa;
  const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
  const gaugePressureMinKPa = Number.isFinite(file.gaugePressureMinKPa)
    ? Number(file.gaugePressureMinKPa)
    : HEAT_CAPACITY_GAUGE_PRESSURE_MIN_KPA;
  const pressureDangerThresholdKPa = pressureThresholdsMv.pressureDangerThresholdMv / pressureSensitivityMvPerKPa;
  const dynamicMax = Number.isFinite(pressureDangerThresholdKPa) && pressureDangerThresholdKPa > gaugePressureMinKPa
    ? gaugePressureMinKPa + (pressureDangerThresholdKPa - gaugePressureMinKPa) / HEAT_CAPACITY_GAUGE_DANGER_START_FRACTION
    : HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA;
  const configuredMax = dynamicMax;
  const gaugePressureMaxKPa = Math.max(gaugePressureMinKPa + 1, configuredMax);
  const pressureWarningThresholdKPa = clampNumber(
    pressureThresholdsMv.pressureWarningThresholdMv / pressureSensitivityMvPerKPa,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
  );
  const pressureSafetyThresholdKPa = clampNumber(
    pressureThresholdsMv.pressureDangerThresholdMv / pressureSensitivityMvPerKPa,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
  );
  return {
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
    pressureSensitivityMvPerKPa,
    pressureWarningThresholdKPa,
    pressureSafetyThresholdKPa,
  };
};

const getHeatCapacityGaugeDisplayValue = ({
  current,
  target,
  elapsedS,
  pressureOverLimit,
}: {
  current: number;
  target: number;
  elapsedS: number;
  pressureOverLimit: boolean;
}) => {
  if (!Number.isFinite(current)) return target;
  const displayDt = clampNumber(elapsedS, 0, 0.22);
  const delta = target - current;
  const rate = delta >= 0
    ? (pressureOverLimit ? HEAT_CAPACITY_GAUGE_RISE_RATE * 1.2 : HEAT_CAPACITY_GAUGE_RISE_RATE)
    : HEAT_CAPACITY_GAUGE_FALL_RATE;
  return current + delta * (1 - Math.exp(-rate * displayDt));
};

export const getHeatCapacityGaugePressureState = (
  pressureDeltaKPa: number,
  powerOn: boolean,
  file: Partial<WorkbenchHeatCapacityState> = {},
  displayedGaugePressureKPa?: number,
): ReturnType<typeof getHeatCapacityGaugeConfig> & {
  pressureGaugeTargetValue: number;
  pressureGaugeDisplayValue: number;
  pressureGaugeNeedleAngle: number;
  pressureSafeThresholdKPa: number;
  pressureWarningThresholdKPa: number;
  pressureSafetyStatus: WorkbenchHeatCapacityPressureSafetyStatus;
  pressureSafetyMessage: string | null;
  pressureBlockedPumping: boolean;
  pressureOverLimit: boolean;
} => {
  const gaugeConfig = getHeatCapacityGaugeConfig(file);
  const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
  const pressureForGauge = powerOn && Number.isFinite(pressureDeltaKPa) ? Math.max(0, pressureDeltaKPa) : 0;
  const pressureForSafetyMv = pressureForGauge * gaugeConfig.pressureSensitivityMvPerKPa;
  const pressureGaugeTargetValue = roundNumber(
    clampNumber(pressureForGauge, gaugeConfig.gaugePressureMinKPa, gaugeConfig.gaugePressureMaxKPa),
    2,
  );
  const pressureGaugeDisplayValue = roundNumber(
    clampNumber(
      Number.isFinite(displayedGaugePressureKPa) ? Number(displayedGaugePressureKPa) : pressureGaugeTargetValue,
      gaugeConfig.gaugePressureMinKPa,
      gaugeConfig.gaugePressureMaxKPa,
    ),
    2,
  );
  const pressureGaugeFraction = (
    (pressureGaugeDisplayValue - gaugeConfig.gaugePressureMinKPa) /
    Math.max(0.001, gaugeConfig.gaugePressureMaxKPa - gaugeConfig.gaugePressureMinKPa)
  );
  const pressureSafetyStatus: WorkbenchHeatCapacityPressureSafetyStatus = !powerOn
    ? 'normal'
    : pressureForSafetyMv >= pressureThresholdsMv.pressureDangerThresholdMv
      ? 'danger'
      : pressureForSafetyMv >= pressureThresholdsMv.pressureWarningThresholdMv
        ? 'warning'
        : 'normal';
  const pressureSafetyMessage = pressureSafetyStatus === 'danger'
    ? '压强已超过安全阈值，请停止打气。'
    : pressureSafetyStatus === 'warning'
      ? '压强接近安全阈值，请准备停止打气。'
      : null;
  return {
    ...gaugeConfig,
    pressureGaugeTargetValue,
    pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: radiansToRoundedDegrees(
      HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD +
      pressureGaugeFraction * (HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD - HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD),
    ),
    pressureSafeThresholdKPa: gaugeConfig.pressureSafetyThresholdKPa,
    pressureWarningThresholdKPa: gaugeConfig.pressureWarningThresholdKPa,
    pressureSafetyStatus,
    pressureSafetyMessage,
    pressureBlockedPumping: powerOn && pressureForSafetyMv >= pressureThresholdsMv.pressureDangerThresholdMv,
    pressureOverLimit: powerOn && pressureForSafetyMv >= pressureThresholdsMv.pressureDangerThresholdMv,
  };
};

export const createHeatCapacityInitialPressureBiasMv = () => roundNumber(
  -HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV +
    Math.random() * (HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV * 2),
  2,
);

export const getHeatCapacityStopcockTargetAngle = (
  open: boolean,
) => (open ? HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);

export const normalizeHeatCapacityStopcockAngle = (value: unknown) => {
  const angle = typeof value === 'number' && Number.isFinite(value)
    ? value
    : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG;
  const normalized = normalizeDegrees360(angle);
  const openHalfRangeDeg = 45;
  return normalized <= openHalfRangeDeg || normalized >= (360 - openHalfRangeDeg)
    ? HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG
    : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG;
};

export const getHeatCapacityStopcockState = (angleDeg: unknown): WorkbenchHeatCapacityStopcockState => (
  normalizeHeatCapacityStopcockAngle(angleDeg) === HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG
    ? 'open'
    : 'closed'
);

export const getHeatCapacityPumpFrequencyState = (
  timestamps: number[],
  now = Date.now(),
  windowMs = HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS,
) => {
  const windowStart = now - windowMs;
  const recentTimestamps = timestamps
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp >= windowStart && timestamp <= now)
    .sort((left, right) => left - right);
  const pumpFrequency = recentTimestamps.length >= 2
    ? (recentTimestamps.length - 1) /
      Math.max(0.001, (recentTimestamps[recentTimestamps.length - 1] - recentTimestamps[0]) / 1000)
    : recentTimestamps.length / (windowMs / 1000);
  const pumpFrequencyStatus: WorkbenchHeatCapacityPumpFrequencyStatus = recentTimestamps.length === 0
    ? 'idle'
    : pumpFrequency < HEAT_CAPACITY_MIN_PUMP_FREQUENCY
      ? 'tooSlow'
      : 'suitable';
  return {
    timestamps: recentTimestamps,
    pumpFrequency,
    pumpFrequencyStatus,
  };
};

export interface HeatCapacityPressureZeroDisplayedSample {
  atMs: number;
  valueMv: number;
}

export const applyHeatCapacityPressureZero = (
  rawPressure: number,
  pressureInitialBiasMv: number,
  zeroOffset: number,
) => (
  roundNumber(applyPressureZero(rawPressure, pressureInitialBiasMv, zeroOffset), 2)
);

export const updatePressureZeroDisplayedSamples = (
  samples: HeatCapacityPressureZeroDisplayedSample[] | undefined,
  now: number,
  valueMv: number | null,
  powerOn: boolean,
) => {
  if (!powerOn || valueMv === null || !Number.isFinite(valueMv)) return [];
  const windowStart = now - HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS;
  const recentSamples = (samples ?? [])
    .filter((sample) => Number.isFinite(sample.atMs) && sample.atMs >= windowStart && sample.atMs <= now)
    .map((sample) => ({
      atMs: sample.atMs,
      valueMv: roundNumber(sample.valueMv, 3),
    }));
  return [
    ...recentSamples,
    { atMs: now, valueMv: roundNumber(valueMv, 3) },
  ];
};

export const isHeatCapacityPressureZeroWithinTolerance = (
  samples: HeatCapacityPressureZeroDisplayedSample[] | undefined,
) => (
  (samples?.length ?? 0) >= HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT &&
  (samples ?? []).every((sample) => Math.abs(sample.valueMv) <= HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV)
);

export const clampHeatCapacityPressureZeroKnobAngle = (angleDeg: number) => (
  roundNumber(clampNumber(
    Number.isFinite(angleDeg) ? angleDeg : 0,
    HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
    HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  ), 2)
);

export const getHeatCapacityPressureZeroOffsetForKnobAngle = (angleDeg: number) => {
  const clampedAngle = clampHeatCapacityPressureZeroKnobAngle(angleDeg);
  return roundNumber(
    clampNumber(
      (clampedAngle / 360) * HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
      HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
      HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
    ),
    3,
  );
};

export const getHeatCapacityPressureZeroKnobAngleForOffset = (zeroOffset: number) => {
  const clampedOffset = clampNumber(
    Number.isFinite(zeroOffset) ? zeroOffset : 0,
    HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
    HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  );
  return clampHeatCapacityPressureZeroKnobAngle(
    (clampedOffset / HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN) * 360,
  );
};

const getHeatCapacityPressureZeroDisplayText = (adjusted: boolean, zeroOffset: number) => (
  adjusted ? `零点偏移：${zeroOffset >= 0 ? '+' : ''}${zeroOffset.toFixed(2)} mV` : '未调零'
);

export const setHeatCapacityPressureZeroOffset = (
  file: WorkbenchHeatCapacityState,
  zeroOffset: number,
  adjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode = 'none',
  knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffset),
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const pressureZeroKnobAngle = clampHeatCapacityPressureZeroKnobAngle(knobAngle);
  const pressureZeroOffset = getHeatCapacityPressureZeroOffsetForKnobAngle(pressureZeroKnobAngle);
  const pressureZeroAdjusted = adjustMode !== 'none' || pressureZeroOffset !== 0;
  if (file.heatCapacityMode === 'free') {
    const sourceFile = freezeHeatCapacityFreeParametersForCurrentGroup(file);
    const previousZeroOffset = sourceFile.heatCapacityFreeCalibrationState.zeroOffsetMv;
    const calibrationState = applyFreeZeroCalibration(
      sourceFile.heatCapacityFreeCalibrationState,
      {
        atS: sourceFile.heatCapacityFreePhysicsState.simulationTimeS,
        displayPressureMv: sourceFile.heatCapacityFreeSensorState.displayPressureMv,
        displayTemperatureMv: sourceFile.heatCapacityFreeSensorState.displayTemperatureMv,
        zeroOffsetMv: pressureZeroOffset,
        source: 'user',
      },
    );
    const mergedFile = mergeHeatCapacityFreeRuntimeState(
      {
        ...sourceFile,
        pressureZeroAdjusted,
        pressureZeroed: false,
        pressureZeroKnobAngle,
        pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
        pressureZeroAdjustMode: adjustMode,
        pressureZeroDisplayedSamples: pressureZeroOffset === previousZeroOffset
          ? sourceFile.pressureZeroDisplayedSamples
          : [],
      },
      sourceFile.heatCapacityFreePhysicsState,
      sourceFile.heatCapacityFreeSensorState,
      calibrationState,
      now,
    );
    const latestZeroEvent = mergedFile.heatCapacityFreeCalibrationState.zeroEvents[
      mergedFile.heatCapacityFreeCalibrationState.zeroEvents.length - 1
    ] ?? null;
    return recordHeatCapacityFreeTraceEvent(mergedFile, 'zero-calibration', now, {
      zeroEventId: latestZeroEvent?.id ?? null,
      zeroOffsetMv: latestZeroEvent?.zeroOffsetMv ?? pressureZeroOffset,
    });
  }
  const runtime = updateHeatCapacityRuntimeZeroOffset(
    {
      ...getHeatCapacityRuntimeStateFromFile(file),
      pressureZeroAdjusted,
    },
    pressureZeroOffset,
    now,
  );
  const mergedFile = mergeHeatCapacityRuntimeState({
    ...file,
    pressureZeroAdjusted,
    pressureZeroed: false,
    pressureZeroKnobAngle,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
    pressureZeroAdjustMode: adjustMode,
    pressureZeroDisplayedSamples: pressureZeroOffset === file.pressureZeroOffset
      ? file.pressureZeroDisplayedSamples
      : [],
  }, {
    ...runtime,
    pressureZeroAdjusted,
  }, now);
  const immediatePressureSignalMv = mergedFile.powerOn
    ? roundNumber(runtime.pressureSignalMvDisplayed, 3)
    : null;
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    [],
    now,
    immediatePressureSignalMv,
    mergedFile.powerOn,
  );
  return {
    ...mergedFile,
    pressureSignalMv: immediatePressureSignalMv,
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
    pressureZeroDisplayedSamples,
    pressureZeroed: isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples),
  };
};

export const adjustHeatCapacityPressureZeroFine = (
  file: WorkbenchHeatCapacityState,
  direction: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const stepDirection = direction >= 0 ? 1 : -1;
  const nextKnobAngle = file.pressureZeroKnobAngle + stepDirection * HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG;
  return setHeatCapacityPressureZeroOffset(
    file,
    getHeatCapacityPressureZeroOffsetForKnobAngle(nextKnobAngle),
    'fineWheel',
    nextKnobAngle,
    now,
  );
};

export const adjustHeatCapacityPressureZeroCoarse = (
  file: WorkbenchHeatCapacityState,
  angleDeltaDeg: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => setHeatCapacityPressureZeroOffset(
  file,
  getHeatCapacityPressureZeroOffsetForKnobAngle(file.pressureZeroKnobAngle + angleDeltaDeg),
  'coarseDrag',
  file.pressureZeroKnobAngle + angleDeltaDeg,
  now,
);

export const isHeatCapacityPressureZeroValid = (file: WorkbenchHeatCapacityState) => (
  isHeatCapacityPressureZeroWithinTolerance(file.pressureZeroDisplayedSamples)
);

export interface WorkbenchStandardResultsLayout {
  openTabs: WorkbenchStandardResultsTab[];
  activeTab: WorkbenchStandardResultsTab;
  heightRatio: number;
}

export interface WorkbenchIdealWindowLayout {
  openTabs: WorkbenchIdealResultWindowKey[];
  activeIdealResultTab: WorkbenchIdealResultWindowKey;
  heightRatio: number;
  hasCustomHeight: boolean;
}

export interface WorkbenchParameterRow {
  key: keyof SimulationParams | 'relation';
  label: string;
  value: string;
  unit?: string;
  editable: boolean;
}

export interface WorkbenchValidationResult {
  valid: boolean;
  errors: string[];
}

interface WorkbenchFileBase {
  id: string;
  name: string;
  kind: WorkbenchFileKind;
  visiblePanels: WorkbenchPanelKey[];
  params: SimulationParams;
  appliedParams: SimulationParams;
  runState: WorkbenchRunState;
  stats: SimulationStats;
  chartData: ChartData;
  finalChartData: ChartData | null;
  liveWorkspaceSplitRatio: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
}

export interface WorkbenchStandardState extends WorkbenchFileBase {
  kind: 'standard';
  particles: Particle[];
  hardSphereEngineSnapshot: PhysicsEngineSnapshotV1 | null;
  standardResultsLayout: WorkbenchStandardResultsLayout;
}

export interface WorkbenchIdealState extends WorkbenchFileBase {
  kind: 'ideal';
  relation: ExperimentRelation;
  activeParams: SimulationParams;
  pointsByRelation: PointsByRelation;
  latestPressureSummary: PressureMeasurementSummary | null;
  needsReset: boolean;
  particles: Particle[];
  hardSphereEngineSnapshot: PhysicsEngineSnapshotV1 | null;
  verificationState: 'not-started' | 'collecting' | 'verified' | 'failed';
  historyUnlocked: boolean;
  idealWindowLayout: WorkbenchIdealWindowLayout;
}

export interface WorkbenchHeatCapacityState extends WorkbenchFileBase {
  kind: 'heatCapacity';
  particles: Particle[];
  heatCapacityMode: HeatCapacityMode;
  heatCapacityFreeRuntimeVersion: number;
  heatCapacityFreeExperimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  heatCapacityFreeParameterDraft: HeatCapacityFreeParameterDraft;
  heatCapacityFreeActiveRunConfigSnapshot: HeatCapacityFreeTraceTrial['configSnapshot'] | null;
  heatCapacityFreeAdvancedRiskAccepted: boolean;
  heatCapacityFreeRecordConfig: HeatCapacityFreeRecordConfig;
  heatCapacityFreePressureWarningMv: number;
  heatCapacityFreeInstrumentNoiseEnabled: boolean;
  heatCapacityFreeEnvironmentConfig: HeatCapacityFreeEnvironmentConfig;
  heatCapacityFreePhysicsConfig: HeatCapacityFreePhysicsConfig;
  heatCapacityFreePhysicsState: HeatCapacityFreePhysicsState;
  heatCapacityFreeSensorConfig: HeatCapacityFreeSensorConfig;
  heatCapacityFreeSensorState: HeatCapacityFreeSensorState;
  heatCapacityFreeCalibrationState: HeatCapacityFreeCalibrationState;
  heatCapacityFreeStopcockFlowOpen: boolean;
  heatCapacityFreeStopcockPendingOpenAtMs: number | null;
  heatCapacityFreeEquilibriumSpeedMultiplier: WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier;
  heatCapacityFreeEquilibriumSpeedHintShown: boolean;
  heatCapacityFreeTraceVersion: number;
  heatCapacityFreeTraceStore: HeatCapacityFreeTraceStore;
  heatCapacityFreeTrials: HeatCapacityFreeTrial[];
  selectedHeatCapacityPanel: Extract<WorkbenchPanelKey, 'preview' | 'realtime'> | WorkbenchHeatCapacityPanelKey;
  openHeatCapacityTabs: WorkbenchHeatCapacityTabId[];
  activeHeatCapacityTabId: WorkbenchHeatCapacityTabId | null;
  heatCapacityMaterialsExpanded: boolean;
  heatCapacityTabContainerHeight: number;
  heatCapacityExpectedTrialCount: number;
  heatCapacityExpectedTrialCountMode: '3' | '5' | 'custom';
  heatCapacityTrials: HeatCapacityTrial[];
  heatCapacityActiveTrialIndex: number;
  heatCapacityProcessingCalculated: boolean;
  heatCapacityProcessingResult: HeatCapacityProcessingResult;
  heatCapacityExperimentSeed: number | string | null;
  heatCapacityExperimentProfile: HeatCapacityTeachingProfile | null;
  heatCapacityPhase: HeatCapacityRuntimePhase;
  powerOn: boolean;
  glassPistonState: WorkbenchHeatCapacityStopcockState;
  stopcockAngleDeg: number;
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  gasPressureKPaAbs: number;
  gasTemperatureK: number;
  pressureDeltaKPa: number;
  simulationTimeS: number;
  lastUpdateMs: number | null;
  pressureSignalMvRaw: number;
  pressureSignalMvDisplayed: number;
  pressureInitialBiasMv: number;
  temperatureSignalTargetMv: number;
  pressureSignalTargetMv: number;
  displayResponseLastUpdateMs: number | null;
  pressureZeroDisplayedSamples: HeatCapacityPressureZeroDisplayedSample[];
  pressureDisplayJitterOffset: number;
  pressureDisplayNextJitterAtMs: number;
  pressureReleaseBurstUntilMs: number | null;
  temperatureDisplayJitterOffset: number;
  temperatureDisplayNextJitterAtMs: number;
  pressureZeroed: boolean;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  releaseRecoveryTargetDeltaKPa: number | null;
  pressureRawPlaceholder: number;
  pressureDisplayedPlaceholder: number;
  pressureGaugeTargetValue: number;
  pressureGaugeDisplayValue: number;
  pressureGaugeNeedleAngle: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureWarningThresholdKPa: number;
  pressureSafeThresholdKPa: number;
  pressureSafetyThresholdKPa: number;
  pressureSafetyStatus: WorkbenchHeatCapacityPressureSafetyStatus;
  pressureSafetyMessage: string | null;
  pressureBlockedPumping: boolean;
  pressureOverLimit: boolean;
  pressureZeroMvPerTurn: number;
  pressureZeroAdjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  pressureKPa: number | null;
  pressureLimitKPa: number;
  pumpValveOpen: boolean;
  pumpValveState: WorkbenchHeatCapacityPumpValveState;
  pumpBulbState: WorkbenchHeatCapacityPumpBulbState;
  pumpStrokeTimestamps: number[];
  pumpFrequency: number;
  pumpFrequencyStatus: WorkbenchHeatCapacityPumpFrequencyStatus;
  lastPumpTime: number | null;
  pumpStrokeCount: number;
  pumpHint: string;
  hardSphereViewEnabled: boolean;
  hardSphereParticleMultiplier: number;
  hardSphereSpeedMultiplier: number;
  hardSphereTrailsEnabled: boolean;
  visualizationMode: 'particle';
  calculationModel: 'airHeatCapacityRatio';
  pressureSensitivityMvPerKPa: number;
  pressurePlaceholder: number;
  temperaturePlaceholder: number;
  recordedPressures: {
    p0: number | null;
    p1: number | null;
    p2: number | null;
  };
  heatCapacityProcessSamples: HeatCapacityProcessSamples;
  theoreticalGamma: number;
}

export type WorkbenchFileState = WorkbenchStandardState | WorkbenchIdealState | WorkbenchHeatCapacityState;

export const createDefaultHeatCapacityFreeParameterState = (): HeatCapacityFreeParameterApplyResult => {
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

const getLatestHeatCapacityFreeTrial = (
  file: WorkbenchHeatCapacityState,
) => file.heatCapacityFreeTrials[file.heatCapacityFreeTrials.length - 1] ?? null;

export const hasCompletedHeatCapacityFreeRecordSet = (
  file: WorkbenchFileState | null,
): boolean => {
  if (file?.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return false;
  const latestTrial = getLatestHeatCapacityFreeTrial(file);
  return Boolean(latestTrial?.u0 && latestTrial.u1 && latestTrial.u2);
};

export const isHeatCapacityFreeExperimentGroupComplete = (
  file: WorkbenchFileState | null,
): boolean => (
  file?.kind === 'heatCapacity' &&
  file.heatCapacityMode === 'free' &&
  file.heatCapacityFreeExperimentGroupStatus === 'completed' &&
  hasCompletedHeatCapacityFreeRecordSet(file) &&
  !file.powerOn
);

export const shouldPromptHeatCapacityFreePowerOffBeforeNextGroup = (
  file: WorkbenchFileState | null,
): boolean => (
  file?.kind === 'heatCapacity' &&
  file.heatCapacityMode === 'free' &&
  file.heatCapacityFreeExperimentGroupStatus === 'completed' &&
  hasCompletedHeatCapacityFreeRecordSet(file) &&
  file.powerOn
);

export const isHeatCapacityFreeParameterEditingAvailable = (
  file: WorkbenchFileState | null,
): file is WorkbenchHeatCapacityState => (
  file?.kind === 'heatCapacity' &&
  file.heatCapacityMode === 'free' &&
  (
    file.heatCapacityFreeExperimentGroupStatus === 'draft' ||
    isHeatCapacityFreeExperimentGroupComplete(file)
  ) &&
  file.runState !== 'running' &&
  file.runState !== 'paused'
);

export const isHeatCapacityFreeGammaEditingAvailable = (
  file: WorkbenchFileState | null,
): file is WorkbenchHeatCapacityState => (
  isHeatCapacityFreeParameterEditingAvailable(file) &&
  file.heatCapacityFreeTrials.length === 0
);

export const getHeatCapacityFreeParameterLockReason = (
  file: WorkbenchFileState | null,
) => {
  if (!file || file.kind !== 'heatCapacity') return null;
  if (file.heatCapacityMode !== 'free') return '只有自由实验模式可以调整参数。';
  if (file.runState === 'running' || file.runState === 'paused') {
    return '当前实验正在运行或暂停，参数已锁定。';
  }
  if (shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(file)) {
    return '请先关闭电源，完成本组实验后再调整参数。';
  }
  if (isHeatCapacityFreeExperimentGroupComplete(file)) {
    return null;
  }
  if (file.heatCapacityFreeExperimentGroupStatus !== 'draft') {
    return '当前实验组已开始，参数已锁定。';
  }
  return null;
};

export const canOpenHeatCapacityParameterSidebar = (
  file: WorkbenchFileState | null,
) => (
  file?.kind !== 'heatCapacity' ||
  file.heatCapacityMode === 'free'
);

export const getHeatCapacityParameterSidebarBlockReason = (
  file: WorkbenchFileState | null,
) => (
  file?.kind === 'heatCapacity' && file.heatCapacityMode !== 'free'
    ? '只有自由实验模式可以调整参数。'
    : null
);

export const applyHeatCapacityFreeParameterDraftWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  draft: HeatCapacityFreeParameterDraft,
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeParameterEditingAvailable(file)) return file;
  const gammaEditingAvailable = file.heatCapacityFreeTrials.length === 0;
  const normalizedDraft = normalizeHeatCapacityFreeParameterDraft(
    gammaEditingAvailable
      ? draft
      : {
          ...draft,
          gamma: file.heatCapacityFreePhysicsConfig.gamma,
        },
    file.heatCapacityFreeParameterDraft,
  );
  const parameterState = applyHeatCapacityFreeParameterDraftToConfigs(normalizedDraft);
  const theoreticalGamma = gammaEditingAvailable
    ? parameterState.physicsConfig.gamma
    : file.theoreticalGamma;
  return {
    ...file,
    heatCapacityFreeParameterDraft: normalizedDraft,
    heatCapacityFreeEnvironmentConfig: parameterState.environmentConfig,
    heatCapacityFreePhysicsConfig: parameterState.physicsConfig,
    heatCapacityFreeSensorConfig: parameterState.sensorConfig,
    heatCapacityFreeRecordConfig: parameterState.recordConfig,
    heatCapacityFreePressureWarningMv: parameterState.pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
    theoreticalGamma,
    heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(theoreticalGamma),
  };
};

export const freezeHeatCapacityFreeParametersForCurrentGroup = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  if (file.heatCapacityFreeExperimentGroupStatus !== 'draft') return file;
  const appliedFile = applyHeatCapacityFreeParameterDraftWorkbenchState(
    file,
    file.heatCapacityFreeParameterDraft,
  );
  return {
    ...appliedFile,
    heatCapacityFreeExperimentGroupStatus: 'running',
    heatCapacityFreeActiveRunConfigSnapshot: createHeatCapacityFreeConfigSnapshotFromFile(appliedFile),
  };
};

export const prepareNextHeatCapacityFreeExperimentGroupWorkbenchState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return {
    ...file,
    heatCapacityFreeExperimentGroupStatus: 'draft',
    heatCapacityFreeActiveRunConfigSnapshot: null,
    heatCapacityFreeParameterDraft: createHeatCapacityFreeParameterDraftFromConfigs(
      file.heatCapacityFreePhysicsConfig,
      file.heatCapacityFreeSensorConfig,
      file.heatCapacityFreeRecordConfig,
      file.heatCapacityFreePressureWarningMv,
      file.heatCapacityFreeInstrumentNoiseEnabled,
    ),
  };
};

export const acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeAdvancedRiskAccepted: true,
});

const getHeatCapacityRuntimeStateFromFile = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityRuntimeState => {
  const fallback = createDefaultHeatCapacityRuntimeState(file.lastUpdateMs);
  const experimentProfile = file.heatCapacityExperimentProfile;
  return {
    ...fallback,
    ambientPressureKPa: Number.isFinite(file.ambientPressureKPa) ? file.ambientPressureKPa : fallback.ambientPressureKPa,
    ambientTemperatureK: Number.isFinite(file.ambientTemperatureK) ? file.ambientTemperatureK : fallback.ambientTemperatureK,
    gasPressureKPaAbs: Number.isFinite(file.gasPressureKPaAbs) ? file.gasPressureKPaAbs : fallback.gasPressureKPaAbs,
    gasTemperatureK: Number.isFinite(file.gasTemperatureK) ? file.gasTemperatureK : fallback.gasTemperatureK,
    pressureDeltaKPa: Number.isFinite(file.pressureDeltaKPa) ? file.pressureDeltaKPa : fallback.pressureDeltaKPa,
    simulationTimeS: Number.isFinite(file.simulationTimeS) ? file.simulationTimeS : fallback.simulationTimeS,
    lastUpdateMs: typeof file.lastUpdateMs === 'number' && Number.isFinite(file.lastUpdateMs) ? file.lastUpdateMs : fallback.lastUpdateMs,
    pressureSignalMvRaw: Number.isFinite(file.pressureSignalMvRaw) ? file.pressureSignalMvRaw : fallback.pressureSignalMvRaw,
    pressureSignalMvDisplayed: Number.isFinite(file.pressureSignalMvDisplayed) ? file.pressureSignalMvDisplayed : fallback.pressureSignalMvDisplayed,
    pressureInitialBiasMv: Number.isFinite(file.pressureInitialBiasMv) ? file.pressureInitialBiasMv : fallback.pressureInitialBiasMv,
    temperatureSignalMv: typeof file.temperatureSignalTargetMv === 'number' && Number.isFinite(file.temperatureSignalTargetMv)
      ? file.temperatureSignalTargetMv
      : fallback.temperatureSignalMv,
    pressureZeroOffset: Number.isFinite(file.pressureZeroOffset) ? file.pressureZeroOffset : fallback.pressureZeroOffset,
    pressureZeroAdjusted: file.pressureZeroAdjusted,
    heatCapacityPhase: file.heatCapacityPhase,
    heatCapacityProcessSamples: file.heatCapacityProcessSamples ?? {},
    releaseRecoveryTargetDeltaKPa: Number.isFinite(file.releaseRecoveryTargetDeltaKPa)
      ? file.releaseRecoveryTargetDeltaKPa
      : fallback.releaseRecoveryTargetDeltaKPa,
    modelConfig: {
      ...fallback.modelConfig,
      ambientPressureKPa: Number.isFinite(file.ambientPressureKPa) ? file.ambientPressureKPa : fallback.modelConfig.ambientPressureKPa,
      ambientTemperatureK: Number.isFinite(file.ambientTemperatureK) ? file.ambientTemperatureK : fallback.modelConfig.ambientTemperatureK,
      visualizationMode: file.visualizationMode === 'particle' ? file.visualizationMode : fallback.modelConfig.visualizationMode,
      calculationModel: file.calculationModel === 'airHeatCapacityRatio' ? file.calculationModel : fallback.modelConfig.calculationModel,
      theoreticalGamma: fallback.modelConfig.theoreticalGamma,
      pumpPressurePeakMv: experimentProfile?.pumpPeakPressureMv ?? fallback.modelConfig.pumpPressurePeakMv,
      stablePressureMv: experimentProfile?.stableBeforeReleaseMv ?? fallback.modelConfig.stablePressureMv,
      recoveryPressureMv: experimentProfile?.recoveryPressureMv ?? fallback.modelConfig.recoveryPressureMv,
      stableTemperatureMv: experimentProfile?.stableTemperatureMv ?? fallback.modelConfig.stableTemperatureMv,
      releaseTemperatureMv: experimentProfile?.releaseTemperatureLowMv ?? fallback.modelConfig.releaseTemperatureMv,
      recoveryTemperatureMv: experimentProfile?.recoveryTemperatureMv ?? fallback.modelConfig.recoveryTemperatureMv,
      releaseRate: experimentProfile
        ? fallback.modelConfig.releaseRate * experimentProfile.releaseSpeed
        : fallback.modelConfig.releaseRate,
      recoveryPressureRate: experimentProfile
        ? fallback.modelConfig.recoveryPressureRate * experimentProfile.thermalRecoveryRate
        : fallback.modelConfig.recoveryPressureRate,
      recoveryHeatFollowRate: experimentProfile
        ? fallback.modelConfig.recoveryHeatFollowRate * experimentProfile.thermalRecoveryRate
        : fallback.modelConfig.recoveryHeatFollowRate,
      sensor: {
        ...fallback.modelConfig.sensor,
        pressureSensitivityMvPerKPa: Number.isFinite(file.pressureSensitivityMvPerKPa)
          ? file.pressureSensitivityMvPerKPa
          : fallback.modelConfig.sensor.pressureSensitivityMvPerKPa,
        temperatureBaseMv: experimentProfile?.ambientTemperatureMv ?? experimentProfile?.initialTemperatureMv ?? fallback.modelConfig.sensor.temperatureBaseMv,
        noiseStdDevMv: experimentProfile?.displayNoiseLevel ?? fallback.modelConfig.sensor.noiseStdDevMv,
      },
    },
  };
};

const getStatsPhaseForHeatCapacity = (
  file: WorkbenchHeatCapacityState,
  runtime: HeatCapacityRuntimeState,
): SimulationStats['phase'] => {
  if (runtime.heatCapacityPhase === 'demoComplete') return 'finished';
  if (file.runState === 'running') return 'collecting';
  return 'idle';
};

const getHeatCapacityJitterFraction = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const updateHeatCapacityDisplayJitter = ({
  powerOn,
  now,
  baseValue,
  target,
  currentOffset,
  nextJitterAtMs,
  channelSeed,
  amplitudeMv,
  minIntervalMs,
  maxIntervalMs,
  stableThresholdMv,
}: {
  powerOn: boolean;
  now: number;
  baseValue: number | null;
  target: number;
  currentOffset: number;
  nextJitterAtMs: number;
  channelSeed: number;
  amplitudeMv: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  stableThresholdMv: number;
}) => {
  if (!powerOn || baseValue === null || !Number.isFinite(baseValue)) {
    return { offset: 0, nextJitterAtMs: now + minIntervalMs };
  }

  const stable = Math.abs(baseValue - target) <= stableThresholdMv;
  if (!stable) {
    return { offset: 0, nextJitterAtMs: now + minIntervalMs };
  }

  if (Number.isFinite(nextJitterAtMs) && now < nextJitterAtMs) {
    return {
      offset: Number.isFinite(currentOffset) ? currentOffset : 0,
      nextJitterAtMs,
    };
  }

  const offsetFraction = getHeatCapacityJitterFraction(now * 0.017 + channelSeed);
  const intervalFraction = getHeatCapacityJitterFraction(now * 0.011 + channelSeed * 2.37);
  return {
    offset: (offsetFraction * 2 - 1) * amplitudeMv,
    nextJitterAtMs: now + minIntervalMs + intervalFraction * (maxIntervalMs - minIntervalMs),
  };
};

export const getHeatCapacityPressureReleaseBurstUntilMs = (
  file: Pick<WorkbenchHeatCapacityState, 'powerOn' | 'pressureDeltaKPa' | 'pressureSignalTargetMv' | 'pressureSensitivityMvPerKPa'>,
  nextOpen: boolean,
  now = Date.now(),
) => {
  if (!nextOpen || !file.powerOn) return null;
  const deltaFromSignal = Math.max(0, file.pressureSignalTargetMv) / Math.max(0.001, file.pressureSensitivityMvPerKPa);
  const effectiveDeltaKPa = Math.max(file.pressureDeltaKPa, deltaFromSignal);
  return effectiveDeltaKPa >= HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA
    ? now + HEAT_CAPACITY_RELEASE_BURST_DURATION_MS
    : null;
};

const mergeHeatCapacityRuntimeState = (
  file: WorkbenchHeatCapacityState,
  runtime: HeatCapacityRuntimeState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const powerOn = file.powerOn && runtime.heatCapacityPhase !== 'powerOff';
  const pressureReleaseBurstActive = powerOn &&
    typeof file.pressureReleaseBurstUntilMs === 'number' &&
    Number.isFinite(file.pressureReleaseBurstUntilMs) &&
    now <= file.pressureReleaseBurstUntilMs;
  const elapsedS = file.displayResponseLastUpdateMs === null
    ? 0
    : (now - file.displayResponseLastUpdateMs) / 1000;
  const pressureSignalTargetMv = roundNumber(runtime.pressureSignalMvDisplayed, 3);
  const temperatureSignalTargetMv = roundNumber(runtime.temperatureSignalMv, 3);
  const pressureDisplayValue = powerOn
    ? getHeatCapacityDisplayValue({
        current: file.pressureSignalMv,
        target: pressureSignalTargetMv,
        previousTarget: Number.isFinite(file.pressureSignalTargetMv) ? file.pressureSignalTargetMv : pressureSignalTargetMv,
        elapsedS,
        now,
        config: HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
      })
    : null;
  const temperatureDisplayValue = powerOn
    ? getHeatCapacityDisplayValue({
        current: file.temperatureSignalMv,
        target: temperatureSignalTargetMv,
        previousTarget: Number.isFinite(file.temperatureSignalTargetMv) ? file.temperatureSignalTargetMv : temperatureSignalTargetMv,
        elapsedS,
        now,
        config: HEAT_CAPACITY_TEMPERATURE_DISPLAY_RESPONSE,
      })
    : null;
  const pressureJitterState = updateHeatCapacityDisplayJitter({
    powerOn,
    now,
    baseValue: file.pressureSignalMv === null ? null : pressureDisplayValue,
    target: pressureSignalTargetMv,
    currentOffset: file.pressureDisplayJitterOffset,
    nextJitterAtMs: pressureReleaseBurstActive ? Math.min(file.pressureDisplayNextJitterAtMs, now) : file.pressureDisplayNextJitterAtMs,
    channelSeed: 11.3,
    amplitudeMv: pressureReleaseBurstActive ? 1.8 : 0.055,
    minIntervalMs: pressureReleaseBurstActive ? 20 : 80,
    maxIntervalMs: pressureReleaseBurstActive ? 55 : 250,
    stableThresholdMv: pressureReleaseBurstActive ? 2.6 : 0.09,
  });
  const temperatureJitterState = updateHeatCapacityDisplayJitter({
    powerOn,
    now,
    baseValue: file.temperatureSignalMv === null ? null : temperatureDisplayValue,
    target: temperatureSignalTargetMv,
    currentOffset: file.temperatureDisplayJitterOffset,
    nextJitterAtMs: file.temperatureDisplayNextJitterAtMs,
    channelSeed: 23.7,
    amplitudeMv: 0.12,
    minIntervalMs: 120,
    maxIntervalMs: 350,
    stableThresholdMv: 0.12,
  });
  const pressureSignalDisplayRounded = pressureDisplayValue === null ? null : roundNumber(pressureDisplayValue + pressureJitterState.offset, 1);
  const temperatureSignalDisplayRounded = temperatureDisplayValue === null ? null : roundNumber(temperatureDisplayValue + temperatureJitterState.offset, 1);
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    file.pressureZeroDisplayedSamples,
    now,
    pressureSignalDisplayRounded,
    powerOn,
  );
  const gaugeTargetState = getHeatCapacityGaugePressureState(runtime.pressureDeltaKPa, powerOn, file);
  const pressureGaugeDisplayValue = getHeatCapacityGaugeDisplayValue({
    current: Number.isFinite(file.pressureGaugeDisplayValue) ? file.pressureGaugeDisplayValue : gaugeTargetState.pressureGaugeTargetValue,
    target: gaugeTargetState.pressureGaugeTargetValue,
    elapsedS,
    pressureOverLimit: gaugeTargetState.pressureOverLimit,
  });
  const gaugePressureState = getHeatCapacityGaugePressureState(
    runtime.pressureDeltaKPa,
    powerOn,
    file,
    pressureGaugeDisplayValue,
  );
  const pressureZeroed = isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
  const heatCapacityPhase = runtime.heatCapacityPhase === 'zeroed' && !pressureZeroed
    ? 'readyToZero'
    : runtime.heatCapacityPhase;
  return {
    ...file,
    ambientPressureKPa: runtime.ambientPressureKPa,
    ambientTemperatureK: runtime.ambientTemperatureK,
    gasPressureKPaAbs: runtime.gasPressureKPaAbs,
    gasTemperatureK: runtime.gasTemperatureK,
    pressureDeltaKPa: runtime.pressureDeltaKPa,
    simulationTimeS: runtime.simulationTimeS,
    lastUpdateMs: runtime.lastUpdateMs,
    pressureSignalMvRaw: runtime.pressureSignalMvRaw,
    pressureSignalMvDisplayed: runtime.pressureSignalMvDisplayed,
    pressureInitialBiasMv: roundNumber(runtime.pressureInitialBiasMv, 3),
    temperatureSignalTargetMv,
    pressureSignalTargetMv,
    displayResponseLastUpdateMs: now,
    pressureZeroDisplayedSamples,
    pressureDisplayJitterOffset: roundNumber(pressureJitterState.offset, 4),
    pressureDisplayNextJitterAtMs: pressureJitterState.nextJitterAtMs,
    pressureReleaseBurstUntilMs: pressureReleaseBurstActive ? file.pressureReleaseBurstUntilMs : null,
    temperatureDisplayJitterOffset: roundNumber(temperatureJitterState.offset, 4),
    temperatureDisplayNextJitterAtMs: temperatureJitterState.nextJitterAtMs,
    pressureRawPlaceholder: roundNumber(runtime.pressureSignalMvRaw, 2),
    pressureDisplayedPlaceholder: roundNumber(runtime.pressureSignalMvDisplayed, 2),
    pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
    pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
    pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
    pressureOverLimit: gaugePressureState.pressureOverLimit,
    pressureZeroOffset: roundNumber(runtime.pressureZeroOffset, 3),
    releaseRecoveryTargetDeltaKPa: runtime.releaseRecoveryTargetDeltaKPa === null
      ? null
      : roundNumber(runtime.releaseRecoveryTargetDeltaKPa, 4),
    pressureZeroMvPerTurn: HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
    pressureZeroAdjusted: runtime.pressureZeroAdjusted,
    pressureZeroed,
    temperatureSignalMv: temperatureSignalDisplayRounded,
    pressureSignalMv: pressureSignalDisplayRounded,
    pressureKPa: powerOn ? roundNumber(runtime.gasPressureKPaAbs, 2) : null,
    visualizationMode: runtime.modelConfig.visualizationMode,
    calculationModel: runtime.modelConfig.calculationModel,
    pressureSensitivityMvPerKPa: runtime.modelConfig.sensor.pressureSensitivityMvPerKPa,
    pressurePlaceholder: roundNumber(runtime.gasPressureKPaAbs, 2),
    temperaturePlaceholder: roundNumber(runtime.gasTemperatureK, 3),
    heatCapacityPhase,
    heatCapacityProcessSamples: runtime.heatCapacityProcessSamples,
    stats: {
      ...file.stats,
      time: roundNumber(runtime.simulationTimeS, 3),
      temperature: roundNumber(runtime.gasTemperatureK, 3),
      pressure: roundNumber(runtime.gasPressureKPaAbs, 3),
      phase: getStatsPhaseForHeatCapacity(file, runtime),
    },
    updatedAt: now,
  };
};

const getHeatCapacityFreeRuntimePhase = (
  file: WorkbenchHeatCapacityState,
  physicsState: HeatCapacityFreePhysicsState,
): HeatCapacityRuntimePhase => {
  if (!file.powerOn) return 'powerOff';
  const stopcockOpen = file.heatCapacityFreeStopcockFlowOpen;
  if (stopcockOpen && physicsState.releaseStarted) return 'releasing';
  if (!stopcockOpen && physicsState.releaseStarted) return 'recovering';
  if (physicsState.pumpStrokeCount > 0 && file.pumpValveOpen) return 'pumping';
  if (physicsState.pumpStrokeCount > 0) return 'sealedStabilizing';
  if (stopcockOpen && file.pressureZeroed) return 'zeroed';
  if (stopcockOpen) return 'readyToZero';
  return 'readyToPump';
};

const mergeHeatCapacityFreeRuntimeState = (
  file: WorkbenchHeatCapacityState,
  physicsState: HeatCapacityFreePhysicsState,
  sensorState: HeatCapacityFreeSensorState,
  calibrationState: HeatCapacityFreeCalibrationState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const derived = deriveFreePhysicalState(physicsState, file.heatCapacityFreePhysicsConfig);
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig(file.heatCapacityFreeSensorConfig);
  const effectiveSensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    sensorConfig,
    file.heatCapacityFreeInstrumentNoiseEnabled,
  );
  const display = getFreeSensorDisplay(
    sensorState,
    calibrationState,
    effectiveSensorConfig,
  );
  const powerOn = file.powerOn;
  const pressureSignalMv = powerOn ? roundNumber(display.displayPressureMv, 2) : null;
  const temperatureSignalMv = powerOn ? roundNumber(display.displayTemperatureMv, 2) : null;
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    file.pressureZeroDisplayedSamples,
    now,
    pressureSignalMv,
    powerOn,
  );
  const hasExplicitZeroEvent = calibrationState.zeroEvents.length > 0;
  const pressureZeroed = powerOn &&
    hasExplicitZeroEvent &&
    isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
  const gaugePressureState = getHeatCapacityGaugePressureState(
    derived.pressureDeltaKPa,
    powerOn,
    file,
  );
  const heatCapacityPhase = getHeatCapacityFreeRuntimePhase(
    {
      ...file,
      pressureZeroed,
    },
    physicsState,
  );

  return {
    ...file,
    heatCapacityFreeSensorConfig: sensorConfig,
    heatCapacityFreePhysicsState: physicsState,
    heatCapacityFreeSensorState: sensorState,
    heatCapacityFreeCalibrationState: calibrationState,
    ambientPressureKPa: file.heatCapacityFreeEnvironmentConfig.ambientPressureKPa,
    ambientTemperatureK: file.heatCapacityFreeEnvironmentConfig.ambientTemperatureK,
    gasPressureKPaAbs: roundNumber(derived.gasPressureKPa, 4),
    gasTemperatureK: roundNumber(physicsState.gasTemperatureK, 4),
    pressureDeltaKPa: roundNumber(derived.pressureDeltaKPa, 4),
    simulationTimeS: roundNumber(physicsState.simulationTimeS, 4),
    lastUpdateMs: now,
    pressureSignalMvRaw: roundNumber(sensorState.displayPressureMv, 4),
    pressureSignalMvDisplayed: roundNumber(display.displayPressureMv, 4),
    temperatureSignalTargetMv: roundNumber(display.displayTemperatureMv, 4),
    pressureSignalTargetMv: roundNumber(display.displayPressureMv, 4),
    displayResponseLastUpdateMs: now,
    pressureZeroDisplayedSamples,
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
    pressureReleaseBurstUntilMs: powerOn &&
      typeof file.pressureReleaseBurstUntilMs === 'number' &&
      now <= file.pressureReleaseBurstUntilMs
      ? file.pressureReleaseBurstUntilMs
      : null,
    temperatureDisplayJitterOffset: 0,
    temperatureDisplayNextJitterAtMs: now,
    pressureRawPlaceholder: roundNumber(sensorState.displayPressureMv, 2),
    pressureDisplayedPlaceholder: roundNumber(display.displayPressureMv, 2),
    pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
    pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
    pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
    pressureOverLimit: gaugePressureState.pressureOverLimit,
    pressureZeroOffset: roundNumber(calibrationState.zeroOffsetMv, 3),
    releaseRecoveryTargetDeltaKPa: null,
    pressureZeroMvPerTurn: HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
    pressureZeroed,
    temperatureSignalMv,
    pressureSignalMv,
    pressureKPa: powerOn ? roundNumber(derived.gasPressureKPa, 2) : null,
    visualizationMode: 'particle',
    calculationModel: 'airHeatCapacityRatio',
    pressureSensitivityMvPerKPa: sensorConfig.pressureMvPerKPa,
    pressurePlaceholder: roundNumber(derived.gasPressureKPa, 2),
    temperaturePlaceholder: roundNumber(physicsState.gasTemperatureK, 3),
    heatCapacityPhase,
    heatCapacityProcessSamples: file.heatCapacityProcessSamples,
    stats: {
      ...file.stats,
      time: roundNumber(physicsState.simulationTimeS, 3),
      temperature: roundNumber(physicsState.gasTemperatureK, 3),
      pressure: roundNumber(derived.gasPressureKPa, 3),
      phase: file.runState === 'running' ? 'collecting' : 'idle',
    },
    updatedAt: now,
  };
};

const createHeatCapacityFreeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
) => {
  const fallback = createDefaultFreeConfigSnapshot();
  const sensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    normalizeHeatCapacityFreeSensorConfig(file.heatCapacityFreeSensorConfig),
    file.heatCapacityFreeInstrumentNoiseEnabled,
  );
  const recordConfig = file.heatCapacityFreeRecordConfig ?? createDefaultHeatCapacityFreeRecordConfig();
  return {
    ...fallback,
    environment: { ...file.heatCapacityFreeEnvironmentConfig },
    physics: {
      ...fallback.physics,
      gamma: file.heatCapacityFreePhysicsConfig.gamma,
      vesselVolumeL: file.heatCapacityFreePhysicsConfig.vesselVolumeL,
      pumpAmountGainRatio: file.heatCapacityFreePhysicsConfig.pumpAmountGainRatio,
      pumpPressureLimitKPa: file.heatCapacityFreePhysicsConfig.pumpPressureLimitKPa,
      pumpTemperatureGainK: file.heatCapacityFreePhysicsConfig.pumpTemperatureGainK,
      stopcockFlowRate: file.heatCapacityFreePhysicsConfig.stopcockFlowRate,
      releaseCoolingFactor: file.heatCapacityFreePhysicsConfig.releaseCoolingFactor,
      thermal: { ...file.heatCapacityFreePhysicsConfig.thermal },
      leakage: { ...file.heatCapacityFreePhysicsConfig.leakage },
    },
    sensor: {
      ...fallback.sensor,
      ...sensorConfig,
    },
    record: {
      ...fallback.record,
      u0ZeroToleranceMv: recordConfig.u0ZeroToleranceMv,
      pressureStableSlopeMvPerS: recordConfig.pressureStableSlopeMvPerS,
      temperatureStableSlopeMvPerS: recordConfig.temperatureStableSlopeMvPerS,
      temperatureAmbientToleranceMv: recordConfig.temperatureAmbientToleranceMv,
      minimumUsefulU1CorrectedMv: recordConfig.minimumUsefulU1CorrectedMv,
      overVentedMinimumU2CorrectedMv: recordConfig.overVentedMinimumU2CorrectedMv,
      pressureWarningMv: file.heatCapacityFreePressureWarningMv,
      pressureDangerMv: recordConfig.pressureDangerMv,
    },
    scoring: { ...fallback.scoring },
  };
};

const ensureActiveHeatCapacityFreeTraceTrial = (
  file: WorkbenchHeatCapacityState,
) => {
  const activeTraceTrial = file.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
    traceTrial.id === file.heatCapacityFreeTraceStore.activeTraceTrialId &&
    traceTrial.branches.some((branch) => branch.id === traceTrial.activeBranchId)
  ));
  if (activeTraceTrial) {
    return file;
  }
  const { store } = createFreeTraceTrial(
    file.heatCapacityFreeTraceStore,
    createHeatCapacityFreeConfigSnapshotFromFile(file),
  );
  return {
    ...file,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeTraceStore: store,
  };
};

const updateActiveHeatCapacityFreeTraceBranch = (
  file: WorkbenchHeatCapacityState,
  updateBranch: (branch: HeatCapacityFreeTraceBranch) => HeatCapacityFreeTraceBranch,
) => {
  const ensuredFile = ensureActiveHeatCapacityFreeTraceTrial(file);
  const store = ensuredFile.heatCapacityFreeTraceStore;
  const traceTrialIndex = store.traceTrials.findIndex((traceTrial) => (
    traceTrial.id === store.activeTraceTrialId
  ));
  if (traceTrialIndex < 0) return ensuredFile;
  const traceTrial = store.traceTrials[traceTrialIndex];
  const branchIndex = traceTrial.branches.findIndex((branch) => branch.id === traceTrial.activeBranchId);
  if (branchIndex < 0) return ensuredFile;
  const nextBranch = updateBranch(traceTrial.branches[branchIndex]);
  const nextTraceTrial: HeatCapacityFreeTraceTrial = {
    ...traceTrial,
    branches: traceTrial.branches.map((branch, index) => (
      index === branchIndex ? nextBranch : branch
    )),
  };
  return {
    ...ensuredFile,
    heatCapacityFreeTraceStore: {
      ...store,
      traceTrials: store.traceTrials.map((candidate, index) => (
        index === traceTrialIndex ? nextTraceTrial : candidate
      )),
    },
  };
};

const buildHeatCapacityFreeTraceSampleInput = (
  file: WorkbenchHeatCapacityState,
  reason: HeatCapacityFreeTraceSampleInput['reason'],
): HeatCapacityFreeTraceSampleInput => {
  const derived = deriveFreePhysicalState(
    file.heatCapacityFreePhysicsState,
    file.heatCapacityFreePhysicsConfig,
  );
  const display = getFreeSensorDisplay(
    file.heatCapacityFreeSensorState,
    file.heatCapacityFreeCalibrationState,
    getEffectiveHeatCapacityFreeSensorConfig(
      file.heatCapacityFreeSensorConfig,
      file.heatCapacityFreeInstrumentNoiseEnabled,
    ),
  );
  const latestZeroEventId = file.heatCapacityFreeCalibrationState.zeroEvents[
    file.heatCapacityFreeCalibrationState.zeroEvents.length - 1
  ]?.id ?? null;
  return {
    atS: file.heatCapacityFreePhysicsState.simulationTimeS,
    reason,
    phase: file.heatCapacityPhase,
    controls: {
      powerOn: file.powerOn,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpValveOpen: file.pumpValveOpen,
      pumpBulbState: file.pumpBulbState,
      stopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen,
    },
    physical: {
      gasPressureKPa: derived.gasPressureKPa,
      pressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: file.heatCapacityFreePhysicsState.gasTemperatureK,
      wallTemperatureK: file.heatCapacityFreePhysicsState.wallTemperatureK,
      ambientTemperatureK: file.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK,
      gasAmountRatio: file.heatCapacityFreePhysicsState.gasAmountRatio,
      pumpStrokeCount: file.heatCapacityFreePhysicsState.pumpStrokeCount,
      releaseStarted: file.heatCapacityFreePhysicsState.releaseStarted,
      currentStopcockOpenDurationS: file.heatCapacityFreePhysicsState.currentStopcockOpenDurationS,
    },
    sensor: {
      displayPressureMv: display.displayPressureMv,
      displayTemperatureMv: display.displayTemperatureMv,
      pressureSlopeMvPerS: file.heatCapacityFreeSensorState.pressureSlopeMvPerS,
      temperatureSlopeMvPerS: file.heatCapacityFreeSensorState.temperatureSlopeMvPerS,
    },
    calibration: {
      calibrationVersion: file.heatCapacityFreeCalibrationState.calibrationVersion,
      zeroOffsetMv: file.heatCapacityFreeCalibrationState.zeroOffsetMv,
      zeroEventId: latestZeroEventId,
    },
    stability: {
      pressureStable: Math.abs(file.heatCapacityFreeSensorState.pressureSlopeMvPerS) <= 0.25,
      temperatureStable: Math.abs(file.heatCapacityFreeSensorState.temperatureSlopeMvPerS) <= 0.12,
    },
    safetyStatus: file.pressureSafetyStatus,
  };
};

export const recordHeatCapacityFreeTraceEvent = (
  file: WorkbenchHeatCapacityState,
  type: HeatCapacityFreeEventType,
  now = Date.now(),
  payload?: Record<string, unknown>,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return updateActiveHeatCapacityFreeTraceBranch(file, (branch) => {
    const sampleResult = appendFreeTraceSample(
      branch,
      buildHeatCapacityFreeTraceSampleInput(file, 'event'),
    );
    const eventResult = appendFreeTraceEvent(sampleResult.branch, {
      atS: sampleResult.sample.atS,
      type,
      traceSampleId: sampleResult.sample.id,
      payload: {
        ...(payload ?? {}),
        atMs: now,
      },
    });
    return compactFreeTraceBranch(eventResult.branch);
  });
};

const createEmptyHeatCapacityFreeRecordTraceReference = (
  phaseAtRecord: HeatCapacityRuntimePhase | null,
): HeatCapacityFreeRecordTraceReference => ({
  source: 'user',
  phaseAtRecord,
  traceTrialId: null,
  traceBranchId: null,
  traceSampleId: null,
  eventId: null,
});

const getLatestHeatCapacityFreeRecordTraceReference = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeRecordTraceReference => {
  const store = file.heatCapacityFreeTraceStore;
  const traceTrial = store.traceTrials.find((candidate) => candidate.id === store.activeTraceTrialId);
  const branch = traceTrial?.branches.find((candidate) => candidate.id === traceTrial.activeBranchId);
  const event = branch?.events[branch.events.length - 1] ?? null;
  if (!traceTrial || !branch || !event) {
    return createEmptyHeatCapacityFreeRecordTraceReference(file.heatCapacityPhase);
  }
  return {
    source: 'user',
    phaseAtRecord: file.heatCapacityPhase,
    traceTrialId: traceTrial.id,
    traceBranchId: branch.id,
    traceSampleId: event.traceSampleId,
    eventId: event.id,
  };
};

export const recordHeatCapacityFreeTraceEventWithReference = (
  file: WorkbenchHeatCapacityState,
  type: HeatCapacityFreeEventType,
  now = Date.now(),
  payload?: Record<string, unknown>,
) => {
  const nextFile = recordHeatCapacityFreeTraceEvent(file, type, now, payload);
  return {
    file: nextFile,
    reference: getLatestHeatCapacityFreeRecordTraceReference(nextFile),
  };
};

const getLatestFreeTraceSample = (
  branch: HeatCapacityFreeTraceBranch,
) => branch.samples[branch.samples.length - 1] ?? null;

const shouldKeepFreePeriodicTraceSample = (
  previous: ReturnType<typeof getLatestFreeTraceSample>,
  sample: HeatCapacityFreeTraceSampleInput,
) => {
  if (!previous) return true;
  if (previous.phase !== sample.phase) return true;
  if (
    previous.controls.powerOn !== sample.controls.powerOn ||
    previous.controls.stopcockOpen !== sample.controls.stopcockOpen ||
    previous.controls.pumpValveOpen !== sample.controls.pumpValveOpen ||
    previous.controls.pumpBulbState !== sample.controls.pumpBulbState ||
    previous.controls.stopcockFlowOpen !== sample.controls.stopcockFlowOpen
  ) {
    return true;
  }
  if (previous.safetyStatus !== sample.safetyStatus) return true;
  if (
    previous.stability.pressureStable !== sample.stability.pressureStable ||
    previous.stability.temperatureStable !== sample.stability.temperatureStable
  ) {
    return true;
  }
  const pressureDeltaMv = Math.abs(previous.sensor.displayPressureMv - sample.sensor.displayPressureMv);
  const temperatureDeltaMv = Math.abs(previous.sensor.displayTemperatureMv - sample.sensor.displayTemperatureMv);
  return pressureDeltaMv >= 0.2 || temperatureDeltaMv >= 0.1;
};

const recordHeatCapacityFreePeriodicTraceSample = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (
    file.heatCapacityMode !== 'free' ||
    file.heatCapacityFreeTraceStore.activeTraceTrialId === null
  ) {
    return file;
  }
  return updateActiveHeatCapacityFreeTraceBranch(file, (branch) => {
    const sampleInput = buildHeatCapacityFreeTraceSampleInput(file, 'periodic');
    if (!shouldKeepFreePeriodicTraceSample(getLatestFreeTraceSample(branch), sampleInput)) {
      return branch;
    }
    return compactFreeTraceBranch(appendFreeTraceSample(branch, sampleInput).branch);
  });
};

const recordHeatCapacityFreeAutomaticU0Event = (
  previousFile: WorkbenchHeatCapacityState,
  nextFile: WorkbenchHeatCapacityState,
  now: number,
) => (
  previousFile.heatCapacityFreeCalibrationState.automaticU0 === null &&
  nextFile.heatCapacityFreeCalibrationState.automaticU0 !== null
    ? recordHeatCapacityFreeTraceEvent(nextFile, 'automatic-u0-candidate', now)
    : nextFile
);

const stepFreeSensorAfterPumpStroke = (
  sensorState: HeatCapacityFreeSensorState,
  physicsState: HeatCapacityFreePhysicsState,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  calibrationState: HeatCapacityFreeCalibrationState,
  sensorConfig: HeatCapacityFreeSensorConfig,
) => {
  const physical = deriveFreePhysicalState(physicsState, physicsConfig);
  const lastSensorAtS = sensorState.pressureHistory[sensorState.pressureHistory.length - 1]?.atS ??
    physicsState.simulationTimeS;
  const sensorIntervalS = Math.min(sensorConfig.minSampleIntervalS, sensorConfig.maxSampleIntervalS);
  const sensorAtS = Math.max(
    physicsState.simulationTimeS,
    lastSensorAtS + Math.max(0.001, sensorIntervalS),
  );
  return stepFreeSensor(
    { ...sensorState, nextSampleAtS: Number.NEGATIVE_INFINITY },
    {
      gasPressureKPa: physical.gasPressureKPa,
      pressureDeltaKPa: physical.pressureDeltaKPa,
      gasTemperatureK: physicsState.gasTemperatureK,
      ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
    },
    calibrationState,
    sensorConfig,
    sensorAtS,
  );
};

const recordHeatCapacityFreeSafetyTransitionEvents = (
  previousFile: WorkbenchHeatCapacityState,
  nextFile: WorkbenchHeatCapacityState,
  now: number,
) => {
  if (previousFile.pressureSafetyStatus === nextFile.pressureSafetyStatus) return nextFile;
  if (nextFile.pressureSafetyStatus === 'danger') {
    return recordHeatCapacityFreeTraceEvent(nextFile, 'pressure-danger', now);
  }
  if (nextFile.pressureSafetyStatus === 'warning') {
    return recordHeatCapacityFreeTraceEvent(nextFile, 'pressure-warning', now);
  }
  if (previousFile.pressureSafetyStatus === 'danger') {
    return recordHeatCapacityFreeTraceEvent(nextFile, 'pressure-danger-cleared', now);
  }
  return nextFile;
};

const removeHeatCapacityFreeTraceTrialFromStore = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string | null,
): HeatCapacityFreeTraceStore => {
  if (!traceTrialId) return store;
  const traceTrials = store.traceTrials.filter((traceTrial) => traceTrial.id !== traceTrialId);
  return {
    ...store,
    activeTraceTrialId: traceTrials.some((traceTrial) => traceTrial.id === store.activeTraceTrialId)
      ? store.activeTraceTrialId
      : null,
    traceTrials,
  };
};

const syncFreeTrialBranchReference = (
  trials: HeatCapacityFreeTrial[],
  trialIndex: number,
  traceTrialId: string,
  branchCount: number,
) => trials.map((trial, index) => (
  index === trialIndex
    ? {
        ...trial,
        traceTrialId,
        branchCount,
      }
    : trial
));

const isHeatCapacityFreeTrialComplete = (trial: HeatCapacityFreeTrial) => (
  trial.u0 !== null &&
  trial.u1 !== null &&
  trial.u2 !== null &&
  trial.correctedSignals !== null
);

const hasHeatCapacityFreeTrialProgress = (trial: HeatCapacityFreeTrial) => (
  trial.automaticU0 !== null ||
  trial.u0 !== null ||
  trial.u1 !== null ||
  trial.u2 !== null ||
  trial.blockedReason !== null ||
  trial.correctedSignals !== null ||
  trial.traceTrialId !== null ||
  trial.branchCount > 0
);

const markHeatCapacityFreeTraceTrialCompleted = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string | null,
): HeatCapacityFreeTraceStore => {
  if (!traceTrialId) return store;
  return {
    ...store,
    traceTrials: store.traceTrials.map((traceTrial) => (
      traceTrial.id === traceTrialId
        ? { ...traceTrial, status: 'completed' }
        : traceTrial
    )),
  };
};

export const removeHeatCapacityFreeTrialRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  trialIndex: number,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityFreeTrials.length === 0) return file;
  const boundedIndex = Math.min(file.heatCapacityFreeTrials.length - 1, Math.max(0, trialIndex));
  const removedTrial = file.heatCapacityFreeTrials[boundedIndex];
  const removal = removeHeatCapacityFreeTrialRecord(file.heatCapacityFreeTrials, boundedIndex, kind);
  const resetProcessing = {
    heatCapacityProcessingCalculated: false,
    heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
  };

  if (kind === 'trial') {
    return {
      ...file,
      heatCapacityFreeTrials: removal.trials,
      heatCapacityFreeTraceStore: removeHeatCapacityFreeTraceTrialFromStore(
        file.heatCapacityFreeTraceStore,
        removedTrial.traceTrialId,
      ),
      ...resetProcessing,
      updatedAt: now,
    };
  }

  const traceTrialId = removedTrial.traceTrialId ?? file.heatCapacityFreeTraceStore.activeTraceTrialId;
  if (!traceTrialId) {
    return {
      ...file,
      heatCapacityFreeTrials: removal.trials,
      ...resetProcessing,
      updatedAt: now,
    };
  }

  const hasTraceTrial = file.heatCapacityFreeTraceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialId);
  if (!hasTraceTrial) {
    return {
      ...file,
      heatCapacityFreeTrials: removal.trials,
      ...resetProcessing,
      updatedAt: now,
    };
  }

  let nextFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeTraceStore: {
      ...file.heatCapacityFreeTraceStore,
      activeTraceTrialId: traceTrialId,
    },
    heatCapacityFreeTrials: removal.trials,
    ...resetProcessing,
    updatedAt: now,
  };
  nextFile = recordHeatCapacityFreeTraceEvent(nextFile, 'record-invalidated', now, {
    kind,
    trialIndex: boundedIndex + 1,
  });
  const archive = archiveCurrentFreeTraceBranchForRecordInvalidation(nextFile.heatCapacityFreeTraceStore, traceTrialId);
  nextFile = {
    ...nextFile,
    heatCapacityFreeTraceStore: archive.store,
    heatCapacityFreeTrials: archive.branchCount > 0
      ? syncFreeTrialBranchReference(nextFile.heatCapacityFreeTrials, boundedIndex, traceTrialId, archive.branchCount)
      : nextFile.heatCapacityFreeTrials,
  };
  if (archive.archivedBranchId && archive.newBranchId) {
    nextFile = recordHeatCapacityFreeTraceEvent(nextFile, 'branch-created', now, {
      kind,
      trialIndex: boundedIndex + 1,
      archivedBranchId: archive.archivedBranchId,
      branchId: archive.newBranchId,
    });
  }
  return nextFile;
};

const resolveHeatCapacityFreeResetStructure = (
  file: WorkbenchHeatCapacityState,
) => {
  const lastTrial = file.heatCapacityFreeTrials[file.heatCapacityFreeTrials.length - 1] ?? null;
  const activeTraceTrialId = file.heatCapacityFreeTraceStore.activeTraceTrialId;
  if (!lastTrial) {
    return {
      heatCapacityFreeTrials: file.heatCapacityFreeTrials,
      heatCapacityFreeTraceStore: removeHeatCapacityFreeTraceTrialFromStore(
        file.heatCapacityFreeTraceStore,
        activeTraceTrialId,
      ),
    };
  }

  if (isHeatCapacityFreeTrialComplete(lastTrial)) {
    let traceStore = markHeatCapacityFreeTraceTrialCompleted(
      file.heatCapacityFreeTraceStore,
      lastTrial.traceTrialId,
    );
    traceStore = activeTraceTrialId && activeTraceTrialId !== lastTrial.traceTrialId
      ? removeHeatCapacityFreeTraceTrialFromStore(traceStore, activeTraceTrialId)
      : { ...traceStore, activeTraceTrialId: null };
    return {
      heatCapacityFreeTrials: file.heatCapacityFreeTrials,
      heatCapacityFreeTraceStore: traceStore,
    };
  }

  if (hasHeatCapacityFreeTrialProgress(lastTrial) || activeTraceTrialId !== null) {
    const traceTrialIds = new Set(
      [lastTrial.traceTrialId, activeTraceTrialId].filter((id): id is string => typeof id === 'string'),
    );
    let traceStore = file.heatCapacityFreeTraceStore;
    for (const traceTrialId of traceTrialIds) {
      traceStore = removeHeatCapacityFreeTraceTrialFromStore(traceStore, traceTrialId);
    }
    return {
      heatCapacityFreeTrials: file.heatCapacityFreeTrials.slice(0, -1),
      heatCapacityFreeTraceStore: traceStore,
    };
  }

  return {
    heatCapacityFreeTrials: file.heatCapacityFreeTrials,
    heatCapacityFreeTraceStore: file.heatCapacityFreeTraceStore,
  };
};

export const isHeatCapacityFreeEquilibriumSpeedAvailable = (
  file: WorkbenchHeatCapacityState,
) => (
  file.heatCapacityMode === 'free' &&
  file.powerOn &&
  file.heatCapacityFreeStopcockPendingOpenAtMs === null &&
  !file.pumpValveOpen &&
  (
    file.heatCapacityPhase === 'sealedStabilizing' ||
    file.heatCapacityPhase === 'recovering'
  )
);

export const getHeatCapacityFreeEquilibriumSpeedMultiplier = (
  file: WorkbenchHeatCapacityState,
) => (
  isHeatCapacityFreeEquilibriumSpeedAvailable(file)
    ? normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(file.heatCapacityFreeEquilibriumSpeedMultiplier)
    : 1
);

const stepHeatCapacityFreeWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (
    file.heatCapacityMode === 'free' &&
    file.powerOn &&
    file.heatCapacityFreeExperimentGroupStatus === 'draft'
  ) {
    return stepHeatCapacityFreeWorkbenchFile(
      freezeHeatCapacityFreeParametersForCurrentGroup(file),
      now,
    );
  }
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig(file.heatCapacityFreeSensorConfig);
  const effectiveSensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    sensorConfig,
    file.heatCapacityFreeInstrumentNoiseEnabled,
  );
  const lastUpdateMs = file.lastUpdateMs ?? now;
  const elapsedMs = Math.max(0, now - lastUpdateMs);
  const equilibriumSpeedMultiplier = getHeatCapacityFreeEquilibriumSpeedMultiplier(file);
  const pendingOpenAtMs = file.heatCapacityFreeStopcockPendingOpenAtMs;
  const pendingFlowOpensNow = pendingOpenAtMs !== null && now >= pendingOpenAtMs;
  const stepPhysicsSegment = (
    state: HeatCapacityFreePhysicsState,
    dtS: number,
    stopcockOpen: boolean,
  ) => stepFreePhysics(
    state,
    file.heatCapacityFreePhysicsConfig,
    {
      powerOn: file.powerOn,
      pumpValveOpen: file.pumpValveOpen,
      stopcockOpen,
    },
    dtS,
      state.simulationTimeS + dtS,
    );
  const stepRuntimeSegments = (
    sourceFile: WorkbenchHeatCapacityState,
    sourcePhysicsState: HeatCapacityFreePhysicsState,
    sourceSensorState: HeatCapacityFreeSensorState,
    dtS: number,
    stopcockOpen: boolean,
    nextStopcockFlowOpen: boolean,
    nextStopcockPendingOpenAtMs: number | null,
    recordIntermediateTrace: boolean,
  ) => {
    const totalDtS = Math.max(0, Number.isFinite(dtS) ? dtS : 0);
    const sourceDerived = deriveFreePhysicalState(sourcePhysicsState, sourceFile.heatCapacityFreePhysicsConfig);
    const hasActivePumpProcess = (sourcePhysicsState.pumpProcesses?.length ?? 0) > 0;
    const hasActiveFastPhysicsProcess =
      hasActivePumpProcess ||
      sourcePhysicsState.releaseProcess !== null ||
      (
        stopcockOpen &&
        sourceDerived.gasPressureKPa >
          sourceFile.heatCapacityFreePhysicsConfig.environment.ambientPressureKPa + 0.000001
      );
    const shouldRecordIntermediateTrace = recordIntermediateTrace || hasActiveFastPhysicsProcess;
    const segmentCount = shouldRecordIntermediateTrace
      ? Math.min(
          HEAT_CAPACITY_FREE_ACCELERATED_MAX_SEGMENTS,
          Math.max(1, Math.ceil(totalDtS / HEAT_CAPACITY_FREE_ACCELERATED_SAMPLE_STEP_S)),
        )
      : 1;
    const segmentDtS = segmentCount > 0 ? totalDtS / segmentCount : 0;
    let physicsState = sourcePhysicsState;
    let sensorState = sourceSensorState;
    let workingFile: WorkbenchHeatCapacityState = {
      ...sourceFile,
      heatCapacityFreeSensorConfig: sensorConfig,
      heatCapacityFreeStopcockFlowOpen: nextStopcockFlowOpen,
      heatCapacityFreeStopcockPendingOpenAtMs: nextStopcockPendingOpenAtMs,
    };

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      physicsState = stepPhysicsSegment(physicsState, segmentDtS, stopcockOpen);
      const derived = deriveFreePhysicalState(physicsState, workingFile.heatCapacityFreePhysicsConfig);
      sensorState = stepFreeSensor(
        hasActiveFastPhysicsProcess
          ? {
              ...sensorState,
              nextSampleAtS: Number.NEGATIVE_INFINITY,
            }
          : sensorState,
        {
          gasPressureKPa: derived.gasPressureKPa,
          pressureDeltaKPa: derived.pressureDeltaKPa,
          gasTemperatureK: physicsState.gasTemperatureK,
          ambientTemperatureK: workingFile.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK,
        },
        workingFile.heatCapacityFreeCalibrationState,
        hasActivePumpProcess
          ? {
              ...effectiveSensorConfig,
              lagRate: Math.max(effectiveSensorConfig.lagRate, HEAT_CAPACITY_FREE_PUMP_SENSOR_LAG_RATE),
            }
          : effectiveSensorConfig,
        physicsState.simulationTimeS,
      );
      workingFile = mergeHeatCapacityFreeRuntimeState(
        {
          ...workingFile,
          heatCapacityFreeStopcockFlowOpen: nextStopcockFlowOpen,
          heatCapacityFreeStopcockPendingOpenAtMs: nextStopcockPendingOpenAtMs,
        },
        physicsState,
        sensorState,
        workingFile.heatCapacityFreeCalibrationState,
        now,
      );
      if (shouldRecordIntermediateTrace) {
        workingFile = recordHeatCapacityFreePeriodicTraceSample(workingFile);
      }
    }

    return {
      workingFile,
      physicsState,
      sensorState,
    };
  };
  let physicsState = file.heatCapacityFreePhysicsState;
  let sensorState = file.heatCapacityFreeSensorState;
  let mergedFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeSensorConfig: sensorConfig,
  };
  let heatCapacityFreeStopcockFlowOpen = file.heatCapacityFreeStopcockFlowOpen;
  let heatCapacityFreeStopcockPendingOpenAtMs = pendingOpenAtMs;

  if (
    pendingFlowOpensNow &&
    !file.heatCapacityFreeStopcockFlowOpen &&
    pendingOpenAtMs !== null &&
    pendingOpenAtMs > lastUpdateMs
  ) {
    const closedDtS = Math.max(0, pendingOpenAtMs - lastUpdateMs) / 1000;
    const openDtS = Math.max(0, now - pendingOpenAtMs) / 1000;
    const closedStep = stepRuntimeSegments(
      mergedFile,
      physicsState,
      sensorState,
      closedDtS,
      false,
      false,
      pendingOpenAtMs,
      false,
    );
    mergedFile = closedStep.workingFile;
    physicsState = closedStep.physicsState;
    sensorState = closedStep.sensorState;
    heatCapacityFreeStopcockFlowOpen = true;
    heatCapacityFreeStopcockPendingOpenAtMs = null;
    const openStep = stepRuntimeSegments(
      mergedFile,
      physicsState,
      sensorState,
      openDtS,
      true,
      heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockPendingOpenAtMs,
      false,
    );
    mergedFile = openStep.workingFile;
    physicsState = openStep.physicsState;
    sensorState = openStep.sensorState;
  } else {
    if (pendingFlowOpensNow && !file.heatCapacityFreeStopcockFlowOpen) {
      heatCapacityFreeStopcockFlowOpen = true;
      heatCapacityFreeStopcockPendingOpenAtMs = null;
    }
    const elapsedStep = stepRuntimeSegments(
      mergedFile,
      physicsState,
      sensorState,
      (elapsedMs / 1000) * equilibriumSpeedMultiplier,
      heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockPendingOpenAtMs,
      equilibriumSpeedMultiplier > 1,
    );
    mergedFile = elapsedStep.workingFile;
    physicsState = elapsedStep.physicsState;
    sensorState = elapsedStep.sensorState;
  }
  const latestZeroEventId = mergedFile.heatCapacityFreeCalibrationState.zeroEvents[
    mergedFile.heatCapacityFreeCalibrationState.zeroEvents.length - 1
  ]?.id ?? '';
  const mergedDisplay = getFreeSensorDisplay(
    sensorState,
    mergedFile.heatCapacityFreeCalibrationState,
    getEffectiveHeatCapacityFreeSensorConfig(
      mergedFile.heatCapacityFreeSensorConfig,
      mergedFile.heatCapacityFreeInstrumentNoiseEnabled,
    ),
  );
  const calibrationState = captureAutomaticU0IfReady(
    mergedFile.heatCapacityFreeCalibrationState,
    {
      atS: physicsState.simulationTimeS,
      powerOn: mergedFile.powerOn,
      stopcockOpen: heatCapacityFreeStopcockFlowOpen,
      zeroed: mergedFile.pressureZeroed,
      zeroEventId: latestZeroEventId,
      pressureStable: Math.abs(sensorState.pressureSlopeMvPerS) <= 0.25,
      temperatureStable: Math.abs(sensorState.temperatureSlopeMvPerS) <= 0.12,
      displayPressureMv: mergedDisplay.displayPressureMv,
      displayTemperatureMv: mergedDisplay.displayTemperatureMv,
    },
  );
  const withCalibration = {
    ...mergedFile,
    heatCapacityFreeCalibrationState: calibrationState,
  };
  const withAutomaticEvent = recordHeatCapacityFreeAutomaticU0Event(mergedFile, withCalibration, now);
  return recordHeatCapacityFreePeriodicTraceSample(withAutomaticEvent);
};

export const setHeatCapacityFreeEquilibriumSpeedMultiplier = (
  file: WorkbenchHeatCapacityState,
  multiplier: unknown,
  now = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeEquilibriumSpeedMultiplier: normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(multiplier),
  lastUpdateMs: file.powerOn ? now : file.lastUpdateMs,
  updatedAt: now,
});

export const setHeatCapacityFreeEquilibriumSpeedHintShown = (
  file: WorkbenchHeatCapacityState,
  shown: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeEquilibriumSpeedHintShown: shown,
  updatedAt: now,
});

export const canZeroHeatCapacityPressure = (file: WorkbenchHeatCapacityState) => (
  file.powerOn && getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open'
);

export const registerHeatCapacityPumpStroke = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'free') {
    const currentFile = stepHeatCapacityFreeWorkbenchFile(
      freezeHeatCapacityFreeParametersForCurrentGroup(file),
      now,
    );
    const currentGaugePressureState = getHeatCapacityGaugePressureState(
      currentFile.pressureDeltaKPa,
      currentFile.powerOn,
      currentFile,
    );
    if (
      getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) !== 'open' &&
      currentGaugePressureState.pressureBlockedPumping
    ) {
      return {
        ...currentFile,
        pressureGaugeTargetValue: currentGaugePressureState.pressureGaugeTargetValue,
        pressureWarningThresholdKPa: currentGaugePressureState.pressureWarningThresholdKPa,
        pressureSafeThresholdKPa: currentGaugePressureState.pressureSafeThresholdKPa,
        pressureSafetyThresholdKPa: currentGaugePressureState.pressureSafetyThresholdKPa,
        pressureSafetyStatus: currentGaugePressureState.pressureSafetyStatus,
        pressureSafetyMessage: currentGaugePressureState.pressureSafetyMessage,
        pressureBlockedPumping: currentGaugePressureState.pressureBlockedPumping,
        pressureOverLimit: currentGaugePressureState.pressureOverLimit,
        pumpHint: '压强已超过安全阈值，请停止打气。',
        pumpBulbState: 'releasing',
        updatedAt: now,
      };
    }
    const frequencyState = getHeatCapacityPumpFrequencyState([...currentFile.pumpStrokeTimestamps, now], now);
    const stroke = applyFreeRuntimePumpStroke(
      currentFile.heatCapacityFreePhysicsState,
      currentFile.heatCapacityFreePhysicsConfig,
      {
        powerOn: currentFile.powerOn,
        pumpValveOpen: currentFile.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) === 'open',
      },
      {
        atS: currentFile.heatCapacityFreePhysicsState.simulationTimeS,
        strength: 1,
      },
    );
    if (!stroke.accepted) {
      const pumpHint = stroke.reason === 'powerOff'
        ? '请先打开电源，再执行有效打气'
        : stroke.reason === 'stopcockOpen'
          ? '玻璃旋塞已打开，无法形成有效加压'
          : stroke.reason === 'pressureDanger'
            ? '压强已超过安全阈值，请停止打气。'
            : '打气阀门未打开，无法有效打气';
      return {
        ...currentFile,
        pumpHint,
        pumpBulbState: 'releasing',
        updatedAt: now,
      };
    }
    const postPumpSensorState = stepFreeSensorAfterPumpStroke(
      currentFile.heatCapacityFreeSensorState,
      stroke.state,
      currentFile.heatCapacityFreePhysicsConfig,
      currentFile.heatCapacityFreeCalibrationState,
      getEffectiveHeatCapacityFreeSensorConfig(
        currentFile.heatCapacityFreeSensorConfig,
        currentFile.heatCapacityFreeInstrumentNoiseEnabled,
      ),
    );
    const pumpedFile = mergeHeatCapacityFreeRuntimeState(
      {
        ...currentFile,
        pumpBulbState: 'compressing',
        pumpStrokeTimestamps: frequencyState.timestamps,
        pumpFrequency: frequencyState.pumpFrequency,
        pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
        lastPumpTime: now,
        pumpStrokeCount: stroke.state.pumpStrokeCount,
        pumpHint: frequencyState.pumpFrequencyStatus === 'suitable'
          ? '打气频率合适，可以继续观察压强变化'
          : '打气速率偏低，实验效果可能不明显',
      },
      stroke.state,
      postPumpSensorState,
      currentFile.heatCapacityFreeCalibrationState,
      now,
    );
    const withPumpEvent = recordHeatCapacityFreeTraceEvent(pumpedFile, 'pump-stroke', now, {
      pumpStrokeCount: stroke.state.pumpStrokeCount,
    });
    return recordHeatCapacityFreeSafetyTransitionEvents(currentFile, withPumpEvent, now);
  }
  if (!file.powerOn) {
    return {
      ...file,
      pumpHint: '请先打开电源，再执行有效打气',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }
  if (!file.pumpValveOpen) {
    return {
      ...file,
      pumpHint: '打气阀门未打开，无法有效打气',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }
  const currentGaugePressureState = getHeatCapacityGaugePressureState(file.pressureDeltaKPa, file.powerOn, file);
  if (
    getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open' &&
    currentGaugePressureState.pressureBlockedPumping
  ) {
    return {
      ...file,
      pressureGaugeTargetValue: currentGaugePressureState.pressureGaugeTargetValue,
      pressureWarningThresholdKPa: currentGaugePressureState.pressureWarningThresholdKPa,
      pressureSafeThresholdKPa: currentGaugePressureState.pressureSafeThresholdKPa,
      pressureSafetyThresholdKPa: currentGaugePressureState.pressureSafetyThresholdKPa,
      pressureSafetyStatus: currentGaugePressureState.pressureSafetyStatus,
      pressureSafetyMessage: currentGaugePressureState.pressureSafetyMessage,
      pressureBlockedPumping: currentGaugePressureState.pressureBlockedPumping,
      pressureOverLimit: currentGaugePressureState.pressureOverLimit,
      pumpHint: currentGaugePressureState.pressureSafetyMessage ?? '压强已超过安全阈值，请停止打气。',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }

  const frequencyState = getHeatCapacityPumpFrequencyState([...file.pumpStrokeTimestamps, now], now);
  const pumpStroke = applyHeatCapacityRuntimePumpStroke(
    getHeatCapacityRuntimeStateFromFile(file),
    {
      powerOn: file.powerOn,
      pumpValveOpen: file.pumpValveOpen,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpFrequency: frequencyState.pumpFrequency,
      pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    },
    now,
  );
  if (!pumpStroke.accepted) {
    const pumpHint = pumpStroke.reason === 'powerOff'
      ? '请先打开电源，再执行有效打气'
      : pumpStroke.reason === 'stopcockOpen'
        ? '玻璃旋塞已打开，无法形成有效加压'
        : '打气阀门未打开，无法有效打气';
    return {
      ...file,
      pumpHint,
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }

  return mergeHeatCapacityRuntimeState({
    ...file,
    pumpBulbState: 'compressing',
    pumpStrokeTimestamps: frequencyState.timestamps,
    pumpFrequency: frequencyState.pumpFrequency,
    pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    lastPumpTime: now,
    pumpStrokeCount: file.pumpStrokeCount + 1,
    pumpHint: frequencyState.pumpFrequencyStatus === 'suitable'
      ? '打气频率合适，可以继续观察压强变化'
      : '打气速率偏低，实验效果可能不明显',
  }, pumpStroke.state, now);
};

export const refreshHeatCapacityPumpFrequency = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityPhase === 'demoComplete') {
    return {
      ...file,
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      pumpBulbState: 'idle',
      pumpHint: '自动演示完成，过程采样已生成',
      updatedAt: now,
    };
  }
  const frequencyState = getHeatCapacityPumpFrequencyState(file.pumpStrokeTimestamps, now);
  const pumpHint = frequencyState.pumpFrequencyStatus === 'idle'
    ? '未打气'
    : frequencyState.pumpFrequencyStatus === 'tooSlow'
      ? '打气速率偏低，实验效果可能不明显'
      : '打气频率合适，可以继续观察压强变化';
  return {
    ...file,
    pumpStrokeTimestamps: frequencyState.timestamps,
    pumpFrequency: frequencyState.pumpFrequency,
    pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    pumpBulbState: frequencyState.pumpFrequencyStatus === 'idle' ? 'idle' : file.pumpBulbState,
    pumpHint,
    updatedAt: now,
  };
};

export const powerHeatCapacityWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'free') {
    const sourceFile = nextPowerOn
      ? freezeHeatCapacityFreeParametersForCurrentGroup(file)
      : file;
    const pressureZeroOffset = sourceFile.heatCapacityFreeCalibrationState.zeroOffsetMv;
    const pressureZeroAdjusted = sourceFile.pressureZeroAdjusted || Math.abs(pressureZeroOffset) > 0.0001;
    const poweredFile = mergeHeatCapacityFreeRuntimeState(
      {
        ...sourceFile,
        powerOn: nextPowerOn,
        runState: nextPowerOn ? sourceFile.runState : 'idle',
        pressureZeroed: nextPowerOn ? sourceFile.pressureZeroed : false,
        pressureZeroAdjusted,
        pressureZeroKnobAngle: sourceFile.pressureZeroKnobAngle,
        pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
        pressureZeroAdjustMode: nextPowerOn ? sourceFile.pressureZeroAdjustMode : 'none',
        pressureReleaseBurstUntilMs: null,
      },
      sourceFile.heatCapacityFreePhysicsState,
      sourceFile.heatCapacityFreeSensorState,
      nextPowerOn
        ? sourceFile.heatCapacityFreeCalibrationState
        : {
            ...sourceFile.heatCapacityFreeCalibrationState,
            automaticU0: null,
      },
      now,
    );
    const tracedFile = recordHeatCapacityFreeTraceEvent(
      recordHeatCapacityFreeSafetyTransitionEvents(sourceFile, poweredFile, now),
      nextPowerOn ? 'power-on' : 'power-off',
      now,
    );
    return !nextPowerOn && isHeatCapacityFreeExperimentGroupComplete(tracedFile)
      ? prepareNextHeatCapacityFreeExperimentGroupWorkbenchState(tracedFile)
      : tracedFile;
  }
  const runtime = powerHeatCapacityRuntimeState(
    getHeatCapacityRuntimeStateFromFile(file),
    nextPowerOn,
    now,
  );
  const pressureZeroAdjusted = file.pressureZeroAdjusted || Math.abs(runtime.pressureZeroOffset) > 0.0001;
  return mergeHeatCapacityRuntimeState({
    ...file,
    powerOn: nextPowerOn,
    runState: nextPowerOn ? file.runState : 'idle',
    pressureZeroed: nextPowerOn ? file.pressureZeroed : false,
    pressureZeroAdjusted,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, runtime.pressureZeroOffset),
    pressureReleaseBurstUntilMs: null,
  }, {
    ...runtime,
    pressureZeroAdjusted,
  }, now);
};

export const resetHeatCapacityForManualExperiment = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const runtime = createDefaultHeatCapacityRuntimeState(now, {
    ambientPressureKPa: file.ambientPressureKPa,
    ambientTemperatureK: file.ambientTemperatureK,
    sensor: {
      ...DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.sensor,
      pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
    },
  });
  const pressureInitialBiasMv = createHeatCapacityInitialPressureBiasMv();
  const gaugePressureState = getHeatCapacityGaugePressureState(0, false, file);
  return mergeHeatCapacityRuntimeState(
    {
      ...file,
      heatCapacityMode: 'guide',
      powerOn: false,
      runState: 'idle',
      heatCapacityPhase: 'powerOff',
      glassPistonState: 'closed',
      stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(false),
      gasPressureKPaAbs: file.ambientPressureKPa,
      gasTemperatureK: file.ambientTemperatureK,
      pressureDeltaKPa: 0,
      simulationTimeS: 0,
      lastUpdateMs: null,
      pressureInitialBiasMv,
      pressureZeroed: false,
      pressureZeroAdjusted: false,
      pressureZeroKnobAngle: 0,
      pressureZeroOffset: 0,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
      pressureZeroAdjustMode: 'none',
      pressureRawPlaceholder: 0,
      pressureDisplayedPlaceholder: pressureInitialBiasMv,
      pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
      pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
      pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
      gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
      gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
      pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
      pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
      pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
      pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
      pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
      pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
      pressureOverLimit: gaugePressureState.pressureOverLimit,
      temperatureSignalMv: null,
      pressureSignalMv: null,
      pressureKPa: null,
      pressureZeroDisplayedSamples: [],
      pressureDisplayJitterOffset: 0,
      pressureDisplayNextJitterAtMs: now,
      pressureReleaseBurstUntilMs: null,
      temperatureDisplayJitterOffset: 0,
      temperatureDisplayNextJitterAtMs: now,
      pumpValveOpen: false,
      pumpValveState: 'closed',
      pumpBulbState: 'idle',
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      lastPumpTime: null,
      pumpStrokeCount: 0,
      pumpHint: '未打气',
      recordedPressures: { p0: file.ambientPressureKPa, p1: null, p2: null },
      heatCapacityExpectedTrialCount: 3,
      heatCapacityExpectedTrialCountMode: '3',
      heatCapacityTrials: createHeatCapacityTrials(3),
      heatCapacityActiveTrialIndex: 0,
      heatCapacityProcessingCalculated: false,
      heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
      heatCapacityExperimentSeed: null,
      heatCapacityExperimentProfile: null,
      heatCapacityProcessSamples: {},
      updatedAt: now,
    },
    {
      ...runtime,
      lastUpdateMs: now,
      pressureInitialBiasMv,
      pressureZeroOffset: 0,
      pressureSignalMvDisplayed: pressureInitialBiasMv,
      heatCapacityPhase: 'powerOff',
      heatCapacityProcessSamples: {},
    },
    now,
  );
};

export const prepareHeatCapacityAutoDemoStart = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
  createInitialBiasMv = createHeatCapacityInitialPressureBiasMv,
): WorkbenchHeatCapacityState => {
  const experimentSeed = createHeatCapacityExperimentSeed();
  const experimentProfile = createHeatCapacityExperimentProfile(experimentSeed);
  const pressureInitialBiasMv = roundNumber(clampNumber(
    createInitialBiasMv(),
    -HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
    HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  ), 2);
  const gaugePressureState = getHeatCapacityGaugePressureState(0, true, file);
  const resetFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityMode: 'demo',
    powerOn: false,
    runState: 'running',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    gasPressureKPaAbs: file.ambientPressureKPa,
    gasTemperatureK: file.ambientTemperatureK,
    pressureDeltaKPa: 0,
    simulationTimeS: 0,
    lastUpdateMs: null,
    pressureSignalMvRaw: 0,
    pressureSignalMvDisplayed: pressureInitialBiasMv,
    pressureInitialBiasMv,
    temperatureSignalTargetMv: file.temperatureSignalTargetMv,
    pressureSignalTargetMv: pressureInitialBiasMv,
    displayResponseLastUpdateMs: null,
    pressureZeroDisplayedSamples: [],
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
    pressureReleaseBurstUntilMs: null,
    temperatureDisplayJitterOffset: 0,
    temperatureDisplayNextJitterAtMs: now,
    pressureZeroOffset: 0,
    pressureZeroAdjusted: false,
    pressureZeroed: false,
    pressureZeroKnobAngle: 0,
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureRawPlaceholder: 0,
    pressureDisplayedPlaceholder: pressureInitialBiasMv,
    pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
    pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
    pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
    pressureOverLimit: gaugePressureState.pressureOverLimit,
    temperatureSignalMv: null,
    pressureSignalMv: null,
    pressureKPa: null,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '自动演示已启动',
    visualizationMode: file.visualizationMode,
    calculationModel: file.calculationModel,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
    pressurePlaceholder: file.ambientPressureKPa,
    temperaturePlaceholder: file.ambientTemperatureK,
    recordedPressures: { p0: file.ambientPressureKPa, p1: null, p2: null },
    heatCapacityExpectedTrialCount: 1,
    heatCapacityExpectedTrialCountMode: 'custom',
    heatCapacityTrials: createHeatCapacityTrials(1),
    heatCapacityActiveTrialIndex: 0,
    heatCapacityProcessingCalculated: false,
    heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
    heatCapacityExperimentSeed: experimentSeed,
    heatCapacityExperimentProfile: experimentProfile,
    heatCapacityProcessSamples: {},
    updatedAt: now,
  };

  const poweredFile = powerHeatCapacityWorkbenchFile(resetFile, true, now);
  return {
    ...poweredFile,
    runState: 'running',
    pressureZeroAdjusted: false,
    pressureZeroed: false,
    pumpHint: '自动演示已启动',
  };
};

export const stepHeatCapacityWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'free') {
    return stepHeatCapacityFreeWorkbenchFile(file, now);
  }
  const runtime = getHeatCapacityRuntimeStateFromFile(file);
  const dtS = runtime.lastUpdateMs === null ? 0 : (now - runtime.lastUpdateMs) / 1000;
  const nextRuntime = stepHeatCapacityExperiment(
    runtime,
    {
      powerOn: file.powerOn,
      pumpValveOpen: file.pumpValveOpen,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpFrequency: file.pumpFrequency,
      pumpFrequencyStatus: file.pumpFrequencyStatus,
      demoComplete: file.heatCapacityPhase === 'demoComplete',
    },
    dtS,
    now,
  );
  return mergeHeatCapacityRuntimeState(file, nextRuntime, now);
};

const applyHeatCapacityProfileToProcessSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
): WorkbenchHeatCapacityState => {
  const profile = file.heatCapacityExperimentProfile;
  if (!profile) return file;
  const sample = file.heatCapacityProcessSamples[key];
  if (!sample) return file;
  const ambientTemperatureMv = profile.ambientTemperatureMv ?? profile.initialTemperatureMv;

  const overrides = key === 'zeroedSample'
    ? {
        pressureSignalMv: profile.u0MeasuredMv,
        temperatureSignalMv: ambientTemperatureMv,
      }
    : key === 'stableBeforeReleaseSample' || key === 'beforeReleaseSample' || key === 'pumpPeakSample'
      ? {
          pressureSignalMv: key === 'pumpPeakSample' ? profile.pumpPeakPressureMv : profile.u1MeasuredMv,
          temperatureSignalMv: key === 'pumpPeakSample' ? sample.temperatureSignalMv : ambientTemperatureMv,
        }
      : key === 'releaseLowSample' || key === 'afterReleaseSample'
        ? {
            pressureSignalMv: 0,
            temperatureSignalMv: profile.releaseTemperatureLowMv,
          }
        : key === 'recoverySample'
          ? {
              pressureSignalMv: profile.u2MeasuredMv,
              temperatureSignalMv: profile.recoveryTemperatureMv,
            }
          : null;

  if (!overrides) return file;

  return {
    ...file,
    heatCapacityProcessSamples: {
      ...file.heatCapacityProcessSamples,
      [key]: {
        ...sample,
        pressureSignalMv: roundNumber(overrides.pressureSignalMv, 3),
        temperatureSignalMv: roundNumber(overrides.temperatureSignalMv, 3),
      },
    },
  };
};

export const captureHeatCapacityWorkbenchSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
  now = Date.now(),
  options: { applyProfile?: boolean } = {},
): WorkbenchHeatCapacityState => {
  const sampledFile = mergeHeatCapacityRuntimeState(
    file,
    {
      ...captureHeatCapacityProcessSample(getHeatCapacityRuntimeStateFromFile(file), key, {
        pumpFrequency: file.pumpFrequency,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      }),
      lastUpdateMs: now,
    },
    now,
  );
  return options.applyProfile === false
    ? sampledFile
    : applyHeatCapacityProfileToProcessSample(sampledFile, key);
};

export const markHeatCapacityDemoComplete = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => mergeHeatCapacityRuntimeState(
  {
    ...file,
    powerOn: false,
    runState: 'finished',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pressureReleaseBurstUntilMs: null,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pumpHint: '自动演示完成，过程采样已生成',
  },
  {
    ...getHeatCapacityRuntimeStateFromFile(file),
    heatCapacityPhase: 'demoComplete',
    pressureZeroOffset: 0,
    pressureZeroAdjusted: false,
    lastUpdateMs: now,
  },
  now,
);

export const DEFAULT_STANDARD_PARAMS: SimulationParams = {
  L: 15,
  N: 200,
  r: 0.2,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 1.0,
  equilibriumTime: 10,
  statsDuration: 60,
};

export const DEFAULT_IDEAL_PARAMS: SimulationParams = {
  L: 12,
  N: 128,
  r: 0.16,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 0.8,
  targetTemperature: 0.6,
  equilibriumTime: 4,
  statsDuration: 12,
};

export const DEFAULT_HEAT_CAPACITY_PARAMS: SimulationParams = {
  L: 10,
  N: 160,
  r: 0.18,
  m: 1.0,
  k: 1.0,
  dt: 0.01,
  nu: 0.6,
  targetTemperature: 1,
  equilibriumTime: 6,
  statsDuration: 18,
};

export const createIdleStats = (): SimulationStats => ({
  time: 0,
  temperature: 0,
  pressure: 0,
  meanSpeed: 0,
  rmsSpeed: 0,
  isEquilibrated: false,
  progress: 0,
  phase: 'idle',
});

export const createEmptyChartData = (): ChartData => ({
  speed: [],
  energy: [],
  energyLog: [],
  tempHistory: [],
});

export const cloneParams = (params: SimulationParams): SimulationParams => ({ ...params });

export const createDefaultStandardResultsLayout = (
  defaults?: Partial<Pick<WorkbenchStandardResultsLayout, 'heightRatio'>>,
): WorkbenchStandardResultsLayout => ({
  openTabs: ['summary', 'dataTable', 'figures'],
  activeTab: 'summary',
  heightRatio: defaults?.heightRatio ?? IDEAL_RESULT_HEIGHT_RATIO,
});

export const createDefaultIdealWindowLayout = (
  defaults?: Partial<Pick<WorkbenchIdealWindowLayout, 'heightRatio'>>,
): WorkbenchIdealWindowLayout => ({
  openTabs: ['experimentPoints', 'verification'],
  activeIdealResultTab: 'experimentPoints',
  heightRatio: defaults?.heightRatio ?? IDEAL_RESULT_HEIGHT_RATIO,
  hasCustomHeight: false,
});

const formatNumber = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
};

const createBaseFile = (
  kind: WorkbenchFileKind,
  index: number,
  params: SimulationParams,
  defaults?: Partial<Pick<WorkbenchFileBase, 'liveWorkspaceSplitRatio'>>,
): Omit<WorkbenchFileBase, 'kind'> => {
  const paddedIndex = String(index).padStart(3, '0');
  const now = Date.now();
  const namePrefix = kind === 'standard'
    ? 'Standard Simulation'
    : kind === 'ideal'
      ? 'Ideal Gas Simulation'
      : 'Heat Capacity Ratio';

  return {
    id: `${kind}-${paddedIndex}`,
    name: `${namePrefix} - ${paddedIndex}`,
    visiblePanels: ['preview', 'realtime'],
    params: cloneParams(params),
    appliedParams: cloneParams(params),
    runState: 'idle',
    stats: createIdleStats(),
    chartData: createEmptyChartData(),
    finalChartData: null,
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(defaults?.liveWorkspaceSplitRatio),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
};

export const normalizeHeatCapacityFileName = (name: string) => {
  const match = /^Hard-Sphere Heat Capacity Ratio - (\d{3})$/.exec(name);
  return match ? `Heat Capacity Ratio - ${match[1]}` : name;
};

export interface WorkbenchFileLayoutDefaults {
  resultsHeightRatio?: number;
  liveWorkspaceSplitRatio?: number;
}

export const createDefaultStandardFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchStandardState => ({
  ...createBaseFile('standard', index, DEFAULT_STANDARD_PARAMS, defaults),
  kind: 'standard',
  particles: [],
  hardSphereEngineSnapshot: null,
  standardResultsLayout: createDefaultStandardResultsLayout({ heightRatio: defaults?.resultsHeightRatio }),
});

export const createDefaultIdealFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchIdealState => ({
  ...createBaseFile('ideal', index, DEFAULT_IDEAL_PARAMS, defaults),
  kind: 'ideal',
  relation: 'pt',
  activeParams: cloneParams(DEFAULT_IDEAL_PARAMS),
  pointsByRelation: createEmptyPointsByRelation(),
  latestPressureSummary: null,
  needsReset: false,
  particles: [],
  hardSphereEngineSnapshot: null,
  verificationState: 'not-started',
  historyUnlocked: false,
  idealWindowLayout: createDefaultIdealWindowLayout({ heightRatio: defaults?.resultsHeightRatio }),
});

const createDefaultHeatCapacityFreeCalibrationState = (): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 0,
  zeroOffsetMv: 0,
  zeroEvents: [],
  automaticU0: null,
});

export const createDefaultHeatCapacityFreeRuntimeFields = (
  seed: number | string = 'free-runtime',
  parameterState: HeatCapacityFreeParameterApplyResult = createDefaultHeatCapacityFreeParameterState(),
) => {
  const physicsConfig = normalizeHeatCapacityFreePhysicsConfig(parameterState.physicsConfig);
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig(parameterState.sensorConfig);
  const recordConfig = { ...parameterState.recordConfig };
  const parameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    physicsConfig,
    sensorConfig,
    recordConfig,
    parameterState.pressureWarningMv,
    parameterState.instrumentNoiseEnabled,
  );
  const pressureInitialBiasMv = createSeededFreePressureInitialBiasMv(
    seed,
    HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  );
  return {
    heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
    heatCapacityFreeExperimentGroupStatus: 'draft' as const,
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: null,
    heatCapacityFreeAdvancedRiskAccepted: false,
    heatCapacityFreeRecordConfig: recordConfig,
    heatCapacityFreePressureWarningMv: parameterState.pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
    heatCapacityFreeEnvironmentConfig: { ...physicsConfig.environment },
    heatCapacityFreePhysicsConfig: physicsConfig,
    heatCapacityFreePhysicsState: createDefaultFreePhysicsState(physicsConfig),
    heatCapacityFreeSensorConfig: sensorConfig,
    heatCapacityFreeSensorState: createDefaultFreeSensorState(seed, {
      pressureMv: pressureInitialBiasMv,
      pressureInitialBiasMv,
      temperatureMv: sensorConfig.temperatureMvAtAmbient,
    }),
    heatCapacityFreeCalibrationState: createDefaultHeatCapacityFreeCalibrationState(),
    heatCapacityFreeStopcockFlowOpen: false,
    heatCapacityFreeStopcockPendingOpenAtMs: null,
    heatCapacityFreeEquilibriumSpeedMultiplier: HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
    heatCapacityFreeEquilibriumSpeedHintShown: false,
  };
};

export const createDefaultHeatCapacityFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchHeatCapacityState => {
  const runtime = createDefaultHeatCapacityRuntimeState();
  const gaugePressureState = getHeatCapacityGaugePressureState(runtime.pressureDeltaKPa, false);
  const freeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(`free-runtime-${index}`);
  return {
    ...createBaseFile('heatCapacity', index, DEFAULT_HEAT_CAPACITY_PARAMS, {
      ...defaults,
      liveWorkspaceSplitRatio: defaults?.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
    }),
    kind: 'heatCapacity',
    particles: [],
    heatCapacityMode: 'free',
    ...freeRuntimeFields,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeTraceStore: createDefaultFreeTraceStore(),
    heatCapacityFreeTrials: [],
    selectedHeatCapacityPanel: 'preview',
    openHeatCapacityTabs: [],
    activeHeatCapacityTabId: null,
    heatCapacityMaterialsExpanded: true,
    heatCapacityTabContainerHeight: 0.5,
    heatCapacityExpectedTrialCount: 3,
    heatCapacityExpectedTrialCountMode: '3',
    heatCapacityTrials: createHeatCapacityTrials(3),
    heatCapacityActiveTrialIndex: 0,
    heatCapacityProcessingCalculated: false,
    heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(runtime.modelConfig.theoreticalGamma),
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityPhase: runtime.heatCapacityPhase,
    powerOn: false,
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    ambientPressureKPa: runtime.ambientPressureKPa,
    ambientTemperatureK: runtime.ambientTemperatureK,
    gasPressureKPaAbs: runtime.gasPressureKPaAbs,
    gasTemperatureK: runtime.gasTemperatureK,
    pressureDeltaKPa: runtime.pressureDeltaKPa,
    simulationTimeS: runtime.simulationTimeS,
    lastUpdateMs: runtime.lastUpdateMs,
    pressureSignalMvRaw: runtime.pressureSignalMvRaw,
    pressureSignalMvDisplayed: runtime.pressureSignalMvDisplayed,
    pressureInitialBiasMv: runtime.pressureInitialBiasMv,
    temperatureSignalTargetMv: runtime.temperatureSignalMv,
    pressureSignalTargetMv: runtime.pressureSignalMvDisplayed,
    displayResponseLastUpdateMs: null,
    pressureZeroDisplayedSamples: [],
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: 0,
    pressureReleaseBurstUntilMs: null,
    temperatureDisplayJitterOffset: 0,
    temperatureDisplayNextJitterAtMs: 0,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: '未调零',
    releaseRecoveryTargetDeltaKPa: runtime.releaseRecoveryTargetDeltaKPa,
    pressureRawPlaceholder: roundNumber(runtime.pressureSignalMvRaw, 2),
    pressureDisplayedPlaceholder: roundNumber(runtime.pressureSignalMvDisplayed, 2),
    pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
    pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
    pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
    pressureOverLimit: gaugePressureState.pressureOverLimit,
    pressureZeroMvPerTurn: HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
    pressureZeroAdjustMode: 'none',
    temperatureSignalMv: null,
    pressureSignalMv: null,
    pressureKPa: null,
    pressureLimitKPa: runtime.modelConfig.pressureLimitKPa,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '未打气',
    hardSphereViewEnabled: false,
    hardSphereParticleMultiplier: 1,
    hardSphereSpeedMultiplier: 1,
    hardSphereTrailsEnabled: false,
    pressurePlaceholder: roundNumber(runtime.gasPressureKPaAbs, 2),
    temperaturePlaceholder: roundNumber(runtime.gasTemperatureK, 3),
    recordedPressures: {
      p0: runtime.modelConfig.ambientPressureKPa,
      p1: null,
      p2: null,
    },
    visualizationMode: runtime.modelConfig.visualizationMode,
    calculationModel: runtime.modelConfig.calculationModel,
    pressureSensitivityMvPerKPa: runtime.modelConfig.sensor.pressureSensitivityMvPerKPa,
    heatCapacityProcessSamples: runtime.heatCapacityProcessSamples,
    theoreticalGamma: runtime.modelConfig.theoreticalGamma,
  };
};

export const enterHeatCapacityFreeModeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const resetFile = resetHeatCapacityFreeRunWorkbenchState(file, now);
  return recordHeatCapacityFreeTraceEvent(resetFile, 'enter-free-mode', now);
};

export const resetHeatCapacityFreeTrialsWorkbenchState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeTrials: [],
});

export const resetHeatCapacityFreeRunWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const fallbackDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    file.heatCapacityFreePhysicsConfig,
    file.heatCapacityFreeSensorConfig,
    file.heatCapacityFreeRecordConfig,
    file.heatCapacityFreePressureWarningMv,
    file.heatCapacityFreeInstrumentNoiseEnabled,
  );
  const parameterState = applyHeatCapacityFreeParameterDraftToConfigs(
    normalizeHeatCapacityFreeParameterDraft(file.heatCapacityFreeParameterDraft, fallbackDraft),
  );
  const freeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(
    `free-runtime-${file.id}-${now}`,
    parameterState,
  );
  const resetStructure = resolveHeatCapacityFreeResetStructure(file);
  const resetFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...file,
      ...freeRuntimeFields,
      heatCapacityFreeTraceStore: resetStructure.heatCapacityFreeTraceStore,
      heatCapacityMode: 'free',
      powerOn: false,
      runState: 'idle',
      heatCapacityPhase: 'powerOff',
      glassPistonState: 'closed',
      stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
      pressureZeroed: false,
      pressureZeroAdjusted: false,
      pressureZeroKnobAngle: 0,
      pressureZeroOffset: 0,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
      pressureZeroAdjustMode: 'none',
      pressureZeroDisplayedSamples: [],
      pressureReleaseBurstUntilMs: null,
      pumpValveOpen: false,
      pumpValveState: 'closed',
      pumpBulbState: 'idle',
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      lastPumpTime: null,
      pumpStrokeCount: 0,
      pumpHint: '未打气',
      heatCapacityFreeTrials: resetStructure.heatCapacityFreeTrials,
      heatCapacityProcessSamples: {},
      heatCapacityProcessingCalculated: false,
      heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
      updatedAt: now,
    },
    freeRuntimeFields.heatCapacityFreePhysicsState,
    freeRuntimeFields.heatCapacityFreeSensorState,
    freeRuntimeFields.heatCapacityFreeCalibrationState,
    now,
  );
  return {
    ...resetFile,
    lastUpdateMs: null,
    displayResponseLastUpdateMs: null,
    heatCapacityPhase: 'powerOff',
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayedSamples: [],
    pressureReleaseBurstUntilMs: null,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '未打气',
    heatCapacityFreeStopcockFlowOpen: false,
    heatCapacityFreeStopcockPendingOpenAtMs: null,
    heatCapacityFreeTraceStore: resetStructure.heatCapacityFreeTraceStore,
    heatCapacityFreeTrials: resetStructure.heatCapacityFreeTrials,
    heatCapacityProcessSamples: {},
    heatCapacityProcessingCalculated: false,
    heatCapacityProcessingResult: createDefaultHeatCapacityProcessingResult(file.theoreticalGamma),
    updatedAt: now,
  };
};

export const selectActiveHeatCapacityWorkbenchDisplay = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityDisplaySource => {
  const freeDisplay = getFreeSensorDisplay(
    file.heatCapacityFreeSensorState,
    file.heatCapacityFreeCalibrationState,
    getEffectiveHeatCapacityFreeSensorConfig(
      file.heatCapacityFreeSensorConfig,
      file.heatCapacityFreeInstrumentNoiseEnabled,
    ),
  );
  return selectHeatCapacityDisplaySource(
    file.heatCapacityMode,
    {
      source: 'teaching',
      pressureMv: Number.isFinite(file.pressureSignalMv)
        ? file.pressureSignalMv ?? 0
        : file.pressureSignalMvDisplayed,
      temperatureMv: Number.isFinite(file.temperatureSignalMv)
        ? file.temperatureSignalMv ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient
        : file.temperatureSignalTargetMv,
    },
    {
      source: 'free',
      pressureMv: Number.isFinite(file.pressureSignalMv)
        ? file.pressureSignalMv ?? freeDisplay.displayPressureMv
        : freeDisplay.displayPressureMv,
      temperatureMv: Number.isFinite(file.temperatureSignalMv)
        ? file.temperatureSignalMv ?? freeDisplay.displayTemperatureMv
        : freeDisplay.displayTemperatureMv,
    },
  );
};

export type HeatCapacityFreeWorkbenchRecordKind = 'u0' | 'u1' | 'u2';

export type HeatCapacityFreeWorkbenchRecordAttempt =
  | {
      accepted: true;
      reason: 'accepted';
      kind: HeatCapacityFreeWorkbenchRecordKind;
      trialIndex: number;
      file: WorkbenchHeatCapacityState;
    }
  | {
      accepted: false;
      reason: HeatCapacityFreeRecordRejectReason;
      kind: HeatCapacityFreeWorkbenchRecordKind;
      trialIndex: number;
      file: WorkbenchHeatCapacityState;
    };

export const applyHeatCapacityFreeRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
  now = Date.now(),
): HeatCapacityFreeWorkbenchRecordAttempt => {
  const sourceFile = freezeHeatCapacityFreeParametersForCurrentGroup(file);
  const config = sourceFile.heatCapacityFreeRecordConfig;
  const activeDisplay = selectActiveHeatCapacityWorkbenchDisplay(sourceFile);
  const display = {
    displayPressureMv: activeDisplay.pressureMv,
    displayTemperatureMv: activeDisplay.temperatureMv,
    pressureSlopeMvPerS: sourceFile.heatCapacityFreeSensorState.pressureSlopeMvPerS,
    temperatureSlopeMvPerS: sourceFile.heatCapacityFreeSensorState.temperatureSlopeMvPerS,
  };
  const lastTrial = sourceFile.heatCapacityFreeTrials[sourceFile.heatCapacityFreeTrials.length - 1] ?? null;
  const useLastTrial = lastTrial !== null && (!lastTrial.u0 || !lastTrial.u1 || !lastTrial.u2);
  const trialIndex = useLastTrial ? sourceFile.heatCapacityFreeTrials.length - 1 : sourceFile.heatCapacityFreeTrials.length;
  const trialBase = useLastTrial
    ? lastTrial
    : createHeatCapacityFreeTrial(`free-trial-${sourceFile.heatCapacityFreeTrials.length + 1}`, sourceFile.heatCapacityFreeCalibrationState.automaticU0);
  const trial = !trialBase.u0 && sourceFile.heatCapacityFreeCalibrationState.automaticU0
    ? {
        ...trialBase,
        automaticU0: sourceFile.heatCapacityFreeCalibrationState.automaticU0,
      }
    : trialBase;
  const evaluation = kind === 'u0'
    ? sourceFile.pressureZeroed
      ? evaluateFreeU0Record(
          trial,
          sourceFile.heatCapacityFreeCalibrationState,
          display,
          sourceFile.heatCapacityFreePhysicsState,
          config,
        )
      : { ready: false, reason: 'zero-not-ready' as const }
    : kind === 'u1'
      ? evaluateFreeU1Record(
          trial,
          sourceFile.heatCapacityFreeCalibrationState,
          display,
          sourceFile.heatCapacityFreePhysicsState,
          config,
        )
      : evaluateFreeU2Record(
          trial,
          sourceFile.heatCapacityFreeCalibrationState,
          display,
          sourceFile.heatCapacityFreePhysicsState,
          config,
        );

  if (evaluation.ready === false) {
    const reason = evaluation.reason;
    const blockedFile = recordHeatCapacityFreeTraceEvent(sourceFile, 'record-blocked', now, {
      kind,
      reason,
      trialIndex: trialIndex + 1,
    });
    return {
      accepted: false,
      reason,
      kind,
      trialIndex,
      file: {
        ...blockedFile,
        heatCapacityFreeTrials: useLastTrial
          ? blockedFile.heatCapacityFreeTrials.map((candidate, index) => (
              index === trialIndex ? { ...trial, blockedReason: reason } : candidate
            ))
          : blockedFile.heatCapacityFreeTrials,
        updatedAt: now,
      },
    };
  }

  const latestZeroEventId = file.heatCapacityFreeCalibrationState.zeroEvents[
    sourceFile.heatCapacityFreeCalibrationState.zeroEvents.length - 1
  ]?.id ?? '';
  const recordReference = kind === 'u0' ? null : trial.u0;
  const input = {
    atS: sourceFile.heatCapacityFreePhysicsState.simulationTimeS,
    displayPressureMv: display.displayPressureMv,
    displayTemperatureMv: display.displayTemperatureMv,
    calibrationVersion: recordReference?.calibrationVersion ?? sourceFile.heatCapacityFreeCalibrationState.calibrationVersion,
    zeroEventId: recordReference?.zeroEventId ?? latestZeroEventId,
  };
  const recordResult = kind === 'u0'
    ? recordFreeU0(trial, input)
    : kind === 'u1'
      ? recordFreeU1(trial, input)
      : recordFreeU2(trial, input, {
          atmosphericPressureKPa: sourceFile.heatCapacityFreeEnvironmentConfig.ambientPressureKPa,
          pressureSensitivityMvPerKPa: sourceFile.heatCapacityFreeSensorConfig.pressureMvPerKPa,
          theoreticalGamma: sourceFile.theoreticalGamma,
        });

  if (!recordResult.accepted) {
    const reason = recordResult.reason === 'accepted' ? 'invalid-sequence' : recordResult.reason;
    return {
      accepted: false,
      reason,
      kind,
      trialIndex,
      file: recordHeatCapacityFreeTraceEvent(sourceFile, 'record-blocked', now, {
        kind,
        reason,
        trialIndex: trialIndex + 1,
      }),
    };
  }

  const recordTrace = recordHeatCapacityFreeTraceEventWithReference(
    sourceFile,
    kind === 'u0' ? 'record-u0' : kind === 'u1' ? 'record-u1' : 'record-u2',
    now,
    {
      kind,
      trialIndex: trialIndex + 1,
    },
  );
  const traceTrial = recordTrace.file.heatCapacityFreeTraceStore.traceTrials.find((candidate) => (
    candidate.id === recordTrace.reference.traceTrialId
  ));
  const recordTrial = {
    ...recordResult.trial,
    configSnapshot: kind === 'u2'
      ? sourceFile.heatCapacityFreeActiveRunConfigSnapshot
      : recordResult.trial.configSnapshot,
    traceTrialId: recordTrace.reference.traceTrialId,
    branchCount: traceTrial?.branches.length ?? recordResult.trial.branchCount,
    u0: kind === 'u0' && recordResult.trial.u0
      ? { ...recordResult.trial.u0, ...recordTrace.reference }
      : recordResult.trial.u0,
    u1: kind === 'u1' && recordResult.trial.u1
      ? { ...recordResult.trial.u1, ...recordTrace.reference }
      : recordResult.trial.u1,
    u2: kind === 'u2' && recordResult.trial.u2
      ? { ...recordResult.trial.u2, ...recordTrace.reference }
      : recordResult.trial.u2,
  };
  const heatCapacityFreeTrials = useLastTrial
    ? recordTrace.file.heatCapacityFreeTrials.map((candidate, index) => (
        index === trialIndex ? recordTrial : candidate
      ))
    : [...recordTrace.file.heatCapacityFreeTrials, recordTrial];

  return {
    accepted: true,
    reason: 'accepted',
    kind,
    trialIndex,
    file: {
      ...recordTrace.file,
      heatCapacityFreeExperimentGroupStatus: kind === 'u2'
        ? 'completed'
        : recordTrace.file.heatCapacityFreeExperimentGroupStatus,
      heatCapacityFreeTrials,
      heatCapacityProcessingCalculated: false,
      updatedAt: now,
    },
  };
};

const createHeatCapacitySampleFromProcessPoint = (
  key: HeatCapacitySample['key'],
  label: string,
  note: string,
  point: HeatCapacityProcessSamplePoint | undefined,
): HeatCapacitySample | null => {
  if (!point) return null;
  return {
    key,
    label,
    timeS: point.timeS,
    phase: point.phase,
    pressureSignalMv: point.pressureSignalMv,
    temperatureSignalMv: point.temperatureSignalMv,
    note,
  };
};

export const getHeatCapacityAirGammaResult = (file: WorkbenchHeatCapacityState): HeatCapacityResult => {
  const zeroedSample = file.heatCapacityProcessSamples.zeroedSample;
  const beforeReleaseSample = file.heatCapacityProcessSamples.stableBeforeReleaseSample
    ?? file.heatCapacityProcessSamples.beforeReleaseSample
    ?? file.heatCapacityProcessSamples.pumpPeakSample
    ?? null;
  const recoverySample = file.heatCapacityProcessSamples.recoverySample ?? null;
  const samples = [
    createHeatCapacitySampleFromProcessPoint(
      'zeroed',
      'U0 zeroed pressure signal',
      'Pressure display is zeroed before formal pumping.',
      zeroedSample,
    ),
    createHeatCapacitySampleFromProcessPoint(
      'beforeRelease',
      'U1 before quick release',
      'Bottle is sealed and stable before the quick release.',
      beforeReleaseSample ?? undefined,
    ),
    createHeatCapacitySampleFromProcessPoint(
      'afterRecovery',
      'U2 after thermal recovery',
      'Stopcock is closed and the gas has recovered toward ambient temperature.',
      recoverySample ?? undefined,
    ),
  ].filter((sample): sample is HeatCapacitySample => sample !== null);

  return calculateHeatCapacityGamma(samples, {
    atmosphericPressureKPa: file.ambientPressureKPa,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
    theoreticalGamma: DEFAULT_HEAT_CAPACITY_MODEL_CONFIG.theoreticalGamma,
  });
};

export const createInitialWorkbenchFiles = (): WorkbenchFileState[] => [
  createDefaultStandardFile(1),
  createDefaultIdealFile(1),
];

export const areWorkbenchParamsEqual = (a: SimulationParams, b: SimulationParams) => (
  a.N === b.N &&
  a.L === b.L &&
  a.r === b.r &&
  a.m === b.m &&
  a.k === b.k &&
  a.dt === b.dt &&
  a.nu === b.nu &&
  a.equilibriumTime === b.equilibriumTime &&
  a.statsDuration === b.statsDuration &&
  a.targetTemperature === b.targetTemperature
);

export const getWorkbenchParameterRows = (file: WorkbenchFileState): WorkbenchParameterRow[] => {
  const rows: WorkbenchParameterRow[] = [
    { key: 'N', label: 'N', value: formatNumber(file.params.N), unit: 'particles', editable: true },
    { key: 'r', label: 'r', value: formatNumber(file.params.r), editable: true },
    { key: 'L', label: 'L', value: formatNumber(file.params.L), editable: true },
    { key: 'dt', label: 'dt', value: formatNumber(file.params.dt), editable: true },
    { key: 'nu', label: 'nu', value: formatNumber(file.params.nu), editable: true },
    { key: 'equilibriumTime', label: 'equilibriumTime', value: formatNumber(file.params.equilibriumTime), unit: 's', editable: true },
    { key: 'statsDuration', label: 'statsDuration', value: formatNumber(file.params.statsDuration), unit: 's', editable: true },
  ];

  if (file.kind === 'ideal') {
    rows.push(
      {
        key: 'targetTemperature',
        label: 'targetTemperature',
        value: formatNumber(file.params.targetTemperature),
        unit: 'K*',
        editable: true,
      },
      {
        key: 'relation',
        label: 'verification',
        value: file.relation === 'pt' ? 'P-T relation' : file.relation === 'pv' ? 'P-V relation' : 'P-N relation',
        editable: false,
      },
    );
  }

  return rows;
};

export const validateWorkbenchParams = (params: SimulationParams): WorkbenchValidationResult => {
  const errors: string[] = [];

  if (!Number.isFinite(params.N) || params.N <= 0) errors.push('N must be greater than 0.');
  if (!Number.isFinite(params.L) || params.L <= 0) errors.push('L must be greater than 0.');
  if (!Number.isFinite(params.r) || params.r <= 0) errors.push('r must be greater than 0.');
  if (!Number.isFinite(params.dt) || params.dt <= 0) errors.push('dt must be greater than 0.');
  if (!Number.isFinite(params.equilibriumTime) || params.equilibriumTime < 0) {
    errors.push('equilibriumTime must be 0 or greater.');
  }
  if (!Number.isFinite(params.statsDuration) || params.statsDuration <= 0) {
    errors.push('statsDuration must be greater than 0.');
  }
  if (typeof params.targetTemperature === 'number' && (!Number.isFinite(params.targetTemperature) || params.targetTemperature <= 0)) {
    errors.push('targetTemperature must be greater than 0.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
