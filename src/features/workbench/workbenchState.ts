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
  HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA,
  createDefaultHeatCapacityRuntimeState,
  powerHeatCapacityRuntimeState,
  stepHeatCapacityExperiment,
  updateHeatCapacityRuntimeZeroOffset,
  type HeatCapacityRuntimeState,
} from '../../domain/heatCapacity/heatCapacityTeachingRuntimeModel.ts';
import type {
  HeatCapacityProcessSampleKey,
  HeatCapacityProcessSamplePoint,
  HeatCapacityProcessSamples,
  HeatCapacityRuntimePhase,
} from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  applyPressureZero,
  DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
  HEAT_CAPACITY_TEMPERATURE_DISPLAY_RESPONSE,
  getHeatCapacityDisplayValue,
} from '../../domain/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
  createDefaultHeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import type {
  HeatCapacityMode,
} from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  createHeatCapacityAutoDemoProfile,
  type HeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  applyFreePumpStroke as applyFreeRuntimePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeEnvironmentConfig,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  normalizeFreePumpValveExchangeConfig,
} from '../../domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import {
  normalizeFreeEnvironmentDisturbanceConfig,
} from '../../domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';
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
  type HeatCapacityFreeTrialParameterScheme,
  type HeatCapacityFreeTrialRecordRemovalKind,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityFreeStandardReference,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  evaluateFreeU0Record,
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordConfig,
  type HeatCapacityFreeRecordEvaluation,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  archiveCurrentFreeTraceBranchForRecordInvalidation,
  appendFreeTraceEvent,
  appendFreeTraceSample,
  compactFreeTraceBranch,
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
  createHeatCapacityFreeConfigSnapshotFromFile,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  normalizeHeatCapacityFreePhysicsConfig,
  normalizeHeatCapacityFreeSensorConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
export {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  normalizeHeatCapacityFreePhysicsConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import {
  selectHeatCapacityDisplaySource,
  type HeatCapacityDisplaySource,
} from '../../domain/heatCapacity/heatCapacityDisplaySource.ts';
import {
  formatHeatCapacitySignalMv,
  truncateHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  applyHeatCapacityFreeGasTypeModelDefaultsToDraft,
  applyHeatCapacityFreeParameterDraftToConfigs,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getHeatCapacityFreeGasTypeGamma,
  getHeatCapacityFreeGasTypeModelDefaults,
  getHeatCapacityFreeIdealTheoreticalGamma,
  getEffectiveHeatCapacityFreeSensorConfig,
  normalizeHeatCapacityFreeParameterDraft,
  normalizeHeatCapacityFreeGasType,
  resolveHeatCapacityFreeGasTypeFromGamma,
  type HeatCapacityFreeExperimentGroupStatus,
  type HeatCapacityFreeGasType,
  type HeatCapacityFreeParameterApplyResult,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeParameterLockReasonId,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import {
  createHeatCapacityFreeIdealEffectiveConfigs,
  createHeatCapacityFreeIdealStagePhysicsConfig,
  type HeatCapacityFreeIdealStage,
} from '../../domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts';
import {
  applyGuidePumpStroke,
  createDefaultGuidePhysicsConfig,
  createDefaultGuidePhysicsState,
  deriveGuidePhysicalState,
  stepGuidePhysicsState,
  type HeatCapacityGuidePhysicsConfig,
  type HeatCapacityGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  createDefaultHeatCapacityGuideWorkflow,
  HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV,
  getHeatCapacityGuideActionGuard,
  transitionHeatCapacityGuideWorkflow,
  type HeatCapacityGuideAction,
  type HeatCapacityGuideWorkflowState,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
  type HeatCapacityGuideTrial,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
  deriveHeatCapacityGuideExperimentTimer,
  normalizeHeatCapacityGuideSpeedMultiplier,
} from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';

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
  | 'heatCapacityReview'
  | 'history';
export type WorkbenchIdealResultWindowKey = 'experimentPoints' | 'verification';
export type WorkbenchStandardResultsTab = 'summary' | 'dataTable' | 'figures';
export type WorkbenchHeatCapacityPanelKey =
  | 'heatCapacityGuide'
  | 'heatCapacityRecords'
  | 'heatCapacityReview';
export type WorkbenchHeatCapacityTabId = 'guide' | 'records' | 'review';

export const IDEAL_RESULT_HEIGHT_RATIO = 0.5;
export const WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO = 0.48;
export const WORKBENCH_LIVE_SPLIT_MIN_RATIO = 0.34;
export const WORKBENCH_LIVE_SPLIT_MAX_RATIO = 0.66;
export const WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO = 0.66;
export const HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG = 0;
export const HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG = 90;

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
export type WorkbenchHeatCapacityFreeStopcockFlowPurpose = 'none' | 'zeroing' | 'release';
export type { HeatCapacityMode };
export type HeatCapacityTeachingStatus = 'idle' | 'running' | 'completed';
export type HeatCapacityFreeWorkflowStage =
  | 'beforePower'
  | 'zeroing'
  | 'beforePump'
  | 'waitingU1'
  | 'beforeRelease'
  | 'releasing'
  | 'waitingU2'
  | 'beforePowerOff'
  | 'finished';

export interface HeatCapacityFreeRollbackSnapshot {
  powerOn: boolean;
  runState: WorkbenchRunState;
  heatCapacityPhase: HeatCapacityRuntimePhase;
  glassPistonState: WorkbenchHeatCapacityStopcockState;
  stopcockAngleDeg: number;
  pressureSignalMv: number | null;
  temperatureSignalMv: number | null;
  pressureSignalTargetMv: number;
  temperatureSignalTargetMv: number;
  pressureInitialBiasMv: number;
  pressureZeroed: boolean;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  pressureZeroAdjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode;
  pressureZeroDisplayedSamples: HeatCapacityPressureZeroDisplayedSample[];
  pumpValveOpen: boolean;
  pumpValveState: WorkbenchHeatCapacityPumpValveState;
  pumpBulbState: WorkbenchHeatCapacityPumpBulbState;
  pumpStrokeTimestamps: number[];
  pumpFrequency: number;
  pumpFrequencyStatus: WorkbenchHeatCapacityPumpFrequencyStatus;
  lastPumpTime: number | null;
  pumpStrokeCount: number;
  pumpHint: string;
  heatCapacityFreePhysicsState: HeatCapacityFreePhysicsState;
  heatCapacityFreeSensorState: HeatCapacityFreeSensorState;
  heatCapacityFreeCalibrationState: HeatCapacityFreeCalibrationState;
  heatCapacityFreeStopcockFlowOpen: boolean;
  heatCapacityFreeStopcockPendingOpenAtMs: number | null;
  heatCapacityFreeStopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose;
}

export interface HeatCapacityFreeRollbackSnapshots {
  afterPowerOn: HeatCapacityFreeRollbackSnapshot | null;
  beforePump: HeatCapacityFreeRollbackSnapshot | null;
  beforeRelease: HeatCapacityFreeRollbackSnapshot | null;
}

export const HEAT_CAPACITY_FREE_RUNTIME_VERSION = 5;
export const HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS = 3000;
export const HEAT_CAPACITY_MIN_PUMP_FREQUENCY = 0.5;
export const HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV = 90;
export const HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV = 120;
export const HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV = 140;
export const HEAT_CAPACITY_RELEASE_BURST_DURATION_MS = 1_000;
export const HEAT_CAPACITY_PRESSURE_RAW_PLACEHOLDER_MV = 3.2;
export const HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 2;
export const HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN = 1;
export const HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS = 420;
export const HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS = [2, 4, 8, 16] as const;
export type WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier =
  typeof HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS[number];
export const HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER:
  WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier = 8;
export const HEAT_CAPACITY_FREE_ACCELERATED_SAMPLE_STEP_S = HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S;
const HEAT_CAPACITY_FREE_ACCELERATED_MAX_SEGMENTS = 600;
const HEAT_CAPACITY_GUIDE_RELEASE_TARGET_S = 0.35;
export const normalizeHeatCapacityFreeEquilibriumSpeedMultiplier = (
  value: unknown,
): WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier => (
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS.includes(
    value as WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  )
    ? value as WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier
    : HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER
);

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

export const isHeatCapacityPhysicalKernelMode = (mode: HeatCapacityMode | null | undefined) => (
  mode === 'free'
);

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
  const freeRecordConfig = file.kind === 'heatCapacity' && isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)
    ? file.heatCapacityFreeRecordConfig
    : null;
  const pressureDangerThresholdMv = Number.isFinite(freeRecordConfig?.pressureDangerMv)
    ? Math.max(0, Number(freeRecordConfig?.pressureDangerMv))
    : HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV;
  const rawPressureWarningThresholdMv = Number.isFinite(file.heatCapacityFreePressureWarningMv)
    ? Math.max(0, Number(file.heatCapacityFreePressureWarningMv))
    : HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV;
  const pressureWarningThresholdMv = Math.min(
    rawPressureWarningThresholdMv,
    Math.max(0, pressureDangerThresholdMv - 0.01),
  );
  return {
    pressureWarningThresholdMv,
    pressureDangerThresholdMv,
  };
};

const getHeatCapacityGaugeConfig = (file: Partial<WorkbenchHeatCapacityState> = {}) => {
  const freeSensorConfig = file.kind === 'heatCapacity' && isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)
    ? file.heatCapacityFreeSensorConfig
    : null;
  const pressureSensitivityMvPerKPa = Number.isFinite(freeSensorConfig?.pressureMvPerKPa)
    ? Math.max(0.001, Number(freeSensorConfig?.pressureMvPerKPa))
    : Number.isFinite(file.pressureSensitivityMvPerKPa)
    ? Math.max(0.001, Number(file.pressureSensitivityMvPerKPa))
    : DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.pressureSensitivityMvPerKPa;
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
    ? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。'
    : pressureSafetyStatus === 'warning'
      ? '压强已达到建议打气范围，请停止打气并等待回温。'
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
  const openHalfRangeDeg = 5;
  const distanceToOpen = Math.abs(normalized - HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
  return distanceToOpen <= openHalfRangeDeg
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
  const roundedValue = roundNumber(valueMv, 3);
  const windowStart = now - HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS;
  const recentSamples = (samples ?? [])
    .filter((sample) => Number.isFinite(sample.atMs) && sample.atMs >= windowStart && sample.atMs < now)
    .map((sample) => ({
      atMs: sample.atMs,
      valueMv: roundNumber(sample.valueMv, 3),
    }));
  const filledSamples = [...recentSamples];
  const lastSample = filledSamples[filledSamples.length - 1];
  if (
    lastSample &&
    Math.abs(lastSample.valueMv) <= HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV &&
    Math.abs(roundedValue) <= HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV
  ) {
    const sampleIntervalMs = HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS /
      Math.max(1, HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT - 1);
    for (
      let sampleAtMs = lastSample.atMs + sampleIntervalMs;
      sampleAtMs < now;
      sampleAtMs += sampleIntervalMs
    ) {
      if (sampleAtMs >= windowStart) {
        filledSamples.push({ atMs: sampleAtMs, valueMv: roundedValue });
      }
    }
  }
  return [
    ...filledSamples,
    { atMs: now, valueMv: roundedValue },
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
  adjusted ? `零点偏移：${zeroOffset >= 0 ? '+' : ''}${formatHeatCapacitySignalMv(zeroOffset)} mV` : '未调零'
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
  if (file.heatCapacityMode === 'guide') {
    const steppedFile = stepHeatCapacityGuideWorkbenchFile(file, now);
    const displayPressureMv = truncateHeatCapacitySignalMv(applyHeatCapacityPressureZero(
      steppedFile.pressureSignalMvRaw,
      steppedFile.pressureInitialBiasMv,
      pressureZeroOffset,
    ));
    const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
      pressureZeroOffset === steppedFile.pressureZeroOffset
        ? steppedFile.pressureZeroDisplayedSamples
        : [],
      now,
      displayPressureMv,
      steppedFile.powerOn,
    );
    const pressureZeroed = steppedFile.powerOn &&
      isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
    const baseFile = {
      ...steppedFile,
      pressureZeroAdjusted,
      pressureZeroed,
      pressureZeroKnobAngle,
      pressureZeroOffset,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
      pressureZeroAdjustMode: adjustMode,
      pressureZeroDisplayedSamples,
    };
    const workflow = transitionHeatCapacityGuideWorkflow(
      baseFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(baseFile, 'adjustZero', {
        pressureZeroReady: pressureZeroed,
      }),
    );
    const isZeroAdjustmentStep = !steppedFile.pressureZeroed && (
      steppedFile.heatCapacityGuideWorkflow.step === 'zeroRequired' ||
      (
        steppedFile.heatCapacityGuideWorkflow.step === 'openStopcockForZeroRequired' &&
        getHeatCapacityStopcockState(steppedFile.stopcockAngleDeg) === 'open'
      )
    );
    const mergedFile = mergeHeatCapacityGuideRuntimeState(
      baseFile,
      baseFile.heatCapacityGuidePhysicsState,
      workflow,
      now,
      { immediatePressureDisplay: isZeroAdjustmentStep },
    );
    return isZeroAdjustmentStep
      ? mergedFile
      : {
        ...mergedFile,
        pressureSignalMv: steppedFile.pressureSignalMv,
        pressureSignalReadoutMv: steppedFile.pressureSignalReadoutMv,
        pressureZeroDisplayedSamples: steppedFile.pressureZeroDisplayedSamples,
        pressureZeroed: steppedFile.pressureZeroed,
      };
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    const sourceFile = file.heatCapacityMode === 'free'
      ? freezeHeatCapacityFreeParametersForCurrentGroup(file)
      : file;
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
    const tracedFile = recordHeatCapacityFreeTraceEvent(mergedFile, 'zero-calibration', now, {
      zeroEventId: latestZeroEvent?.id ?? null,
      zeroOffsetMv: latestZeroEvent?.zeroOffsetMv ?? pressureZeroOffset,
    });
    return file.heatCapacityMode === 'free' ? tracedFile : mergedFile;
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
    ? truncateHeatCapacitySignalMv(runtime.pressureSignalMvDisplayed)
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

export type HeatCapacityFreeFileNoticeKey =
  | 'advancedParametersRisk'
  | 'idealParameterProfileIntro';

export interface HeatCapacityFreeFileAcknowledgements {
  advancedParametersRisk: boolean;
  idealParameterProfileIntro: boolean;
}

export const createDefaultHeatCapacityFreeFileAcknowledgements = (): HeatCapacityFreeFileAcknowledgements => ({
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});

const isHeatCapacityFreeAcknowledgementRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

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

export type HeatCapacityFreeParameterScheme = 'real' | 'ideal';
export type HeatCapacityFreeDisplayScheme = HeatCapacityFreeParameterScheme;

export interface HeatCapacityFreeExperimentDomainState {
  scheme: HeatCapacityFreeParameterScheme;
  experimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  activeRunConfigSnapshot: HeatCapacityFreeTraceTrial['configSnapshot'] | null;
  recordConfig: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
  instrumentNoiseEnabled: boolean;
  environmentConfig: HeatCapacityFreeEnvironmentConfig;
  physicsConfig: HeatCapacityFreePhysicsConfig;
  physicsState: HeatCapacityFreePhysicsState;
  sensorConfig: HeatCapacityFreeSensorConfig;
  sensorState: HeatCapacityFreeSensorState;
  calibrationState: HeatCapacityFreeCalibrationState;
  stopcockFlowOpen: boolean;
  stopcockPendingOpenAtMs: number | null;
  stopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose;
  rollbackSnapshots: HeatCapacityFreeRollbackSnapshots;
  traceStore: HeatCapacityFreeTraceStore;
  trials: HeatCapacityFreeTrial[];
}

export interface WorkbenchHeatCapacityState extends WorkbenchFileBase {
  kind: 'heatCapacity';
  particles: Particle[];
  heatCapacityMode: HeatCapacityMode;
  heatCapacityTeachingStatus: HeatCapacityTeachingStatus;
  heatCapacityLessonIntroAutoShown: boolean;
  heatCapacityFreeRuntimeVersion: number;
  heatCapacityFreeExperimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  heatCapacityFreeGasType: HeatCapacityFreeGasType;
  heatCapacityFreeParameterDraft: HeatCapacityFreeParameterDraft;
  heatCapacityFreeActiveRunConfigSnapshot: HeatCapacityFreeTraceTrial['configSnapshot'] | null;
  heatCapacityFreeFileAcknowledgements: HeatCapacityFreeFileAcknowledgements;
  heatCapacityFreeParameterScheme: HeatCapacityFreeParameterScheme;
  heatCapacityFreeDisplayScheme: HeatCapacityFreeDisplayScheme;
  heatCapacityFreeRealDomain: HeatCapacityFreeExperimentDomainState;
  heatCapacityFreeIdealDomain: HeatCapacityFreeExperimentDomainState;
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
  heatCapacityFreeStopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose;
  heatCapacityFreeEquilibriumSpeedMultiplier: WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier;
  heatCapacityFreeEquilibriumSpeedHintShown: boolean;
  heatCapacityFreeRollbackSnapshots: HeatCapacityFreeRollbackSnapshots;
  heatCapacityFreeTraceVersion: number;
  heatCapacityFreeTraceStore: HeatCapacityFreeTraceStore;
  heatCapacityFreeTrials: HeatCapacityFreeTrial[];
  heatCapacityGuidePhysicsConfig: HeatCapacityGuidePhysicsConfig;
  heatCapacityGuidePhysicsState: HeatCapacityGuidePhysicsState;
  heatCapacityGuideWorkflow: HeatCapacityGuideWorkflowState;
  heatCapacityGuideTrial: HeatCapacityGuideTrial | null;
  selectedHeatCapacityPanel: Extract<WorkbenchPanelKey, 'preview' | 'realtime'> | WorkbenchHeatCapacityPanelKey;
  openHeatCapacityTabs: WorkbenchHeatCapacityTabId[];
  activeHeatCapacityTabId: WorkbenchHeatCapacityTabId | null;
  heatCapacityMaterialsExpanded: boolean;
  heatCapacityTabContainerHeight: number;
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
  pressureSignalRawReadoutMv: number;
  pressureSignalReadoutMv: number;
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
  visualizationMode: 'particle';
  calculationModel: 'airHeatCapacityRatio';
  pressureSensitivityMvPerKPa: number;
  vesselPressureReadoutKPa: number;
  vesselTemperatureReadoutK: number;
  recordedPressures: {
    p0: number | null;
    p1: number | null;
    p2: number | null;
  };
  heatCapacityProcessSamples: HeatCapacityProcessSamples;
  theoreticalGamma: number;
}

export type WorkbenchFileState = WorkbenchStandardState | WorkbenchIdealState | WorkbenchHeatCapacityState;

const HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED = false;

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
  file: Pick<WorkbenchHeatCapacityState, 'heatCapacityFreeTrials'>,
) => file.heatCapacityFreeTrials[file.heatCapacityFreeTrials.length - 1] ?? null;

const isHeatCapacityFreeTrialRecordComplete = (
  trial: Pick<HeatCapacityFreeTrial, 'u0' | 'u1' | 'u2' | 'correctedSignals'>,
) => (
  trial.u0 !== null &&
  trial.u1 !== null &&
  trial.u2 !== null &&
  trial.correctedSignals !== null
);

type HeatCapacityFreeActiveTrialSource =
  Pick<WorkbenchHeatCapacityState, 'heatCapacityFreeTrials'> &
  Partial<Pick<WorkbenchHeatCapacityState, 'powerOn' | 'heatCapacityFreeExperimentGroupStatus'>>;

export const getActiveHeatCapacityFreeTrialIndex = (
  file: HeatCapacityFreeActiveTrialSource,
) => {
  const incompleteIndex = file.heatCapacityFreeTrials.findIndex((trial) => (
    !isHeatCapacityFreeTrialRecordComplete(trial)
  ));
  if (incompleteIndex >= 0) return incompleteIndex;
  if (
    file.powerOn === true &&
    file.heatCapacityFreeExperimentGroupStatus === 'completed' &&
    file.heatCapacityFreeTrials.length > 0
  ) {
    return file.heatCapacityFreeTrials.length - 1;
  }
  return -1;
};

export const getHeatCapacityFreeRecordDisplayTrialIndex = (
  file: HeatCapacityFreeActiveTrialSource,
) => {
  const activeIndex = getActiveHeatCapacityFreeTrialIndex(file);
  if (activeIndex >= 0) return activeIndex;
  const lastIndex = file.heatCapacityFreeTrials.length - 1;
  const lastTrial = file.heatCapacityFreeTrials[lastIndex] ?? null;
  if (
    file.powerOn === false &&
    (
      file.heatCapacityFreeExperimentGroupStatus === 'draft' ||
      file.heatCapacityFreeExperimentGroupStatus === 'completed'
    ) &&
    lastTrial !== null &&
    isHeatCapacityFreeTrialRecordComplete(lastTrial)
  ) {
    return lastIndex;
  }
  return -1;
};

const getActiveHeatCapacityFreeTrial = (
  file: HeatCapacityFreeActiveTrialSource,
) => {
  const activeIndex = getActiveHeatCapacityFreeTrialIndex(file);
  return activeIndex >= 0 ? file.heatCapacityFreeTrials[activeIndex] ?? null : null;
};

export const getHeatCapacityFreeStopcockFlowPurpose = (
  file: HeatCapacityFreeActiveTrialSource,
  stopcockOpen: boolean,
): WorkbenchHeatCapacityFreeStopcockFlowPurpose => {
  if (!stopcockOpen) return 'none';
  const activeTrial = getActiveHeatCapacityFreeTrial(file);
  return activeTrial?.u1 && !activeTrial.u2 ? 'release' : 'zeroing';
};

export const normalizeHeatCapacityFreeStopcockFlowPurpose = (
  value: unknown,
  file: HeatCapacityFreeActiveTrialSource,
  stopcockOpen: boolean,
): WorkbenchHeatCapacityFreeStopcockFlowPurpose => {
  if (!stopcockOpen) return 'none';
  const derivedPurpose = getHeatCapacityFreeStopcockFlowPurpose(file, true);
  if (value === 'release') return derivedPurpose === 'release' ? 'release' : 'zeroing';
  if (value === 'zeroing') return 'zeroing';
  return derivedPurpose;
};

const hasHeatCapacityFreeReleaseStarted = (
  file: Pick<WorkbenchHeatCapacityState, 'heatCapacityFreePhysicsState'>,
) => (
  file.heatCapacityFreePhysicsState.releaseStarted ||
  file.heatCapacityFreePhysicsState.releaseReference !== null
);

export const deriveHeatCapacityFreeWorkflowStage = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeWorkflowStage => {
  const activeTrial = getActiveHeatCapacityFreeTrial(file);
  const visualStopcockOpen = getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open';
  const releaseHasStarted = hasHeatCapacityFreeReleaseStarted(file);
  const releaseStopcockOpeningOrOpen = (
    file.heatCapacityFreeStopcockFlowPurpose === 'release' ||
    releaseHasStarted
  ) && (
    visualStopcockOpen ||
    file.heatCapacityFreeStopcockFlowOpen ||
    file.heatCapacityFreeStopcockPendingOpenAtMs !== null
  );
  if (!file.powerOn) {
    return 'beforePower';
  }
  if (!activeTrial?.u0) return 'zeroing';

  if (
    visualStopcockOpen &&
    file.heatCapacityFreeStopcockFlowPurpose !== 'release' &&
    !releaseHasStarted
  ) {
    return 'zeroing';
  }
  if (!activeTrial.u1) {
    if (visualStopcockOpen && !releaseHasStarted) return 'zeroing';
    return file.heatCapacityFreePhysicsState.pumpStrokeCount > 0 || file.pumpStrokeCount > 0
      ? 'waitingU1'
      : 'beforePump';
  }
  if (!releaseHasStarted) {
    return releaseStopcockOpeningOrOpen ? 'releasing' : 'beforeRelease';
  }
  if (
    releaseStopcockOpeningOrOpen ||
    file.heatCapacityFreePhysicsState.lastStopcockClosedAtS === null
  ) {
    return 'releasing';
  }
  if (!activeTrial.u2) return 'waitingU2';
  return 'beforePowerOff';
};

export const getHeatCapacityFreeDisplayPhase = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityRuntimePhase => (
  deriveHeatCapacityFreeWorkflowStage(file) === 'releasing'
    ? 'releasing'
    : file.heatCapacityPhase
);

export interface HeatCapacityFreeRecordButtonState {
  visible: boolean;
  mode: 'record' | 'rerecord';
  disabledReason: HeatCapacityFreeRecordRejectReason | null;
}

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

export const isHeatCapacityFreeGasTypeEditingAvailable = (
  file: WorkbenchFileState | null,
): boolean => (
  isHeatCapacityFreeParameterEditingAvailable(file) &&
  file.heatCapacityFreeTrials.length === 0
);

export const getHeatCapacityFreeParameterLockReason = (
  file: WorkbenchFileState | null,
): HeatCapacityFreeParameterLockReasonId | null => {
  if (!file || file.kind !== 'heatCapacity') return null;
  if (file.heatCapacityMode !== 'free') return 'freeModeOnly';
  if (file.runState === 'running' || file.runState === 'paused') {
    return 'runningOrPaused';
  }
  if (shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(file)) {
    return 'powerOffBeforeNextGroup';
  }
  if (isHeatCapacityFreeExperimentGroupComplete(file)) {
    return null;
  }
  if (file.heatCapacityFreeExperimentGroupStatus !== 'draft') {
    return 'groupStarted';
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
): HeatCapacityFreeParameterLockReasonId | null => (
  file?.kind === 'heatCapacity' && file.heatCapacityMode !== 'free'
    ? 'freeModeOnly'
    : null
);

export const applyHeatCapacityFreeParameterDraftWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  draft: HeatCapacityFreeParameterDraft,
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeParameterEditingAvailable(file)) return file;
  const gasTypeEditingAvailable = isHeatCapacityFreeGasTypeEditingAvailable(file);
  const lockedGasType = normalizeHeatCapacityFreeGasType(
    file.heatCapacityFreeGasType,
    resolveHeatCapacityFreeGasTypeFromGamma(file.heatCapacityFreePhysicsConfig.gamma),
  );
  const requestedGasType = normalizeHeatCapacityFreeGasType(draft.gasType, lockedGasType);
  const gasTypeChanged = gasTypeEditingAvailable && requestedGasType !== lockedGasType;
  const shouldApplyGasTypeModelDefaults = gasTypeChanged &&
    draft.gasWallConductanceWPerK === file.heatCapacityFreeParameterDraft.gasWallConductanceWPerK &&
    draft.leakageRatePerS === file.heatCapacityFreeParameterDraft.leakageRatePerS;
  const requestedDraft = shouldApplyGasTypeModelDefaults
    ? applyHeatCapacityFreeGasTypeModelDefaultsToDraft(draft, requestedGasType)
    : draft;
  const normalizedDraft = normalizeHeatCapacityFreeParameterDraft(
    gasTypeEditingAvailable
      ? requestedDraft
      : {
          ...requestedDraft,
          gasType: lockedGasType,
        },
    file.heatCapacityFreeParameterDraft,
  );
  const parameterState = applyHeatCapacityFreeParameterDraftToConfigs(normalizedDraft);
  const theoreticalGamma = gasTypeEditingAvailable
    ? parameterState.physicsConfig.gamma
    : file.theoreticalGamma;
  return {
    ...file,
    heatCapacityFreeGasType: parameterState.gasType,
    heatCapacityFreeParameterDraft: normalizedDraft,
    heatCapacityFreeEnvironmentConfig: parameterState.environmentConfig,
    heatCapacityFreePhysicsConfig: parameterState.physicsConfig,
    heatCapacityFreeSensorConfig: parameterState.sensorConfig,
    heatCapacityFreeRecordConfig: parameterState.recordConfig,
    heatCapacityFreePressureWarningMv: parameterState.pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
    theoreticalGamma,
  };
};

export const resetHeatCapacityFreeParametersToDefaultWorkbenchState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeParameterEditingAvailable(file)) return file;
  const defaultParameterState = createDefaultHeatCapacityFreeParameterState();
  const defaultDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    defaultParameterState.physicsConfig,
    defaultParameterState.sensorConfig,
    defaultParameterState.recordConfig,
    defaultParameterState.pressureWarningMv,
    defaultParameterState.instrumentNoiseEnabled,
  );
  const resetFile = applyHeatCapacityFreeParameterDraftWorkbenchState(file, defaultDraft);
  return {
    ...resetFile,
    hardSphereViewEnabled: HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED,
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
    heatCapacityFreeActiveRunConfigSnapshot: createHeatCapacityFreeRuntimeConfigSnapshotFromFile(appliedFile),
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

export const acknowledgeHeatCapacityFreeFileNoticeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  notice: HeatCapacityFreeFileNoticeKey,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeFileAcknowledgements: {
    ...normalizeHeatCapacityFreeFileAcknowledgements(file.heatCapacityFreeFileAcknowledgements),
    [notice]: true,
  },
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
  _runtime: HeatCapacityRuntimeState,
): SimulationStats['phase'] => {
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
  const pressureSignalDisplayRounded = pressureDisplayValue === null ? null : truncateHeatCapacitySignalMv(pressureDisplayValue + pressureJitterState.offset);
  const temperatureSignalDisplayRounded = temperatureDisplayValue === null ? null : truncateHeatCapacitySignalMv(temperatureDisplayValue + temperatureJitterState.offset);
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
    pressureSignalRawReadoutMv: roundNumber(runtime.pressureSignalMvRaw, 2),
    pressureSignalReadoutMv: roundNumber(runtime.pressureSignalMvDisplayed, 2),
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
    vesselPressureReadoutKPa: roundNumber(runtime.gasPressureKPaAbs, 2),
    vesselTemperatureReadoutK: roundNumber(runtime.gasTemperatureK, 3),
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
  const pressureSignalMv = powerOn ? truncateHeatCapacitySignalMv(display.displayPressureMv) : null;
  const temperatureSignalMv = powerOn ? truncateHeatCapacitySignalMv(display.displayTemperatureMv) : null;
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
    pressureSignalRawReadoutMv: roundNumber(sensorState.displayPressureMv, 2),
    pressureSignalReadoutMv: roundNumber(display.displayPressureMv, 2),
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
    vesselPressureReadoutKPa: roundNumber(derived.gasPressureKPa, 2),
    vesselTemperatureReadoutK: roundNumber(physicsState.gasTemperatureK, 3),
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

const createHeatCapacityFreeRuntimeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
) => {
  const sensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    normalizeHeatCapacityFreeSensorConfig(file.heatCapacityFreeSensorConfig),
    file.heatCapacityFreeInstrumentNoiseEnabled,
  );
  const recordConfig = file.heatCapacityFreeRecordConfig ?? createDefaultHeatCapacityFreeRecordConfig();
  return createHeatCapacityFreeConfigSnapshotFromFile(file, {
    environmentConfig: file.heatCapacityFreeEnvironmentConfig,
    sensorConfig,
    recordConfig,
  });
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
    createHeatCapacityFreeRuntimeConfigSnapshotFromFile(file),
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
      ambientPressureOffsetKPa: file.heatCapacityFreePhysicsState.ambientPressureOffsetKPa,
      ambientTemperatureOffsetK: file.heatCapacityFreePhysicsState.ambientTemperatureOffsetK,
      effectiveAmbientPressureKPa: file.heatCapacityFreePhysicsState.effectiveAmbientPressureKPa,
      effectiveAmbientTemperatureK: file.heatCapacityFreePhysicsState.effectiveAmbientTemperatureK,
    },
    sensor: {
      displayPressureMv: display.displayPressureMv,
      displayTemperatureMv: display.displayTemperatureMv,
      pressureSlopeMvPerS: file.heatCapacityFreeSensorState.pressureSlopeMvPerS,
      temperatureSlopeMvPerS: file.heatCapacityFreeSensorState.temperatureSlopeMvPerS,
      pressureReliability: file.heatCapacityFreeSensorState.pressureReliability,
      pressureNonlinearErrorMv: file.heatCapacityFreeSensorState.pressureNonlinearErrorMv,
      pressureStochasticErrorMv: file.heatCapacityFreeSensorState.pressureStochasticErrorMv,
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
  const nextFile = updateActiveHeatCapacityFreeTraceBranch(file, (branch) => {
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
  return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, nextFile.heatCapacityFreeParameterScheme);
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
  isHeatCapacityFreeTrialRecordComplete(trial)
);

const findHeatCapacityFreeTraceTrialForTrial = (
  store: HeatCapacityFreeTraceStore,
  trial: HeatCapacityFreeTrial,
) => store.traceTrials.find((candidate) => (
  candidate.id === trial.traceTrialId ||
  candidate.linkedTrialId === trial.id
)) ?? null;

const getHeatCapacityFreeReviewTheoreticalGamma = (
  file: WorkbenchHeatCapacityState,
  trial: HeatCapacityFreeTrial,
) => (
  trial.parameterScheme === 'ideal' ? getHeatCapacityFreeIdealTheoreticalGamma() : file.theoreticalGamma
);

const createStandardReferenceSnapshotForCompletedFreeTrial = (
  file: WorkbenchHeatCapacityState,
  trial: HeatCapacityFreeTrial,
) => {
  if (trial.standardReferenceSnapshot || !isHeatCapacityFreeTrialComplete(trial)) {
    return trial.standardReferenceSnapshot;
  }
  const traceTrial = findHeatCapacityFreeTraceTrialForTrial(file.heatCapacityFreeTraceStore, trial);
  if (!traceTrial) return null;
  return createHeatCapacityFreeStandardReference({
    traceTrial,
    trial,
    theoreticalGamma: getHeatCapacityFreeReviewTheoreticalGamma(file, trial),
  });
};

const stampLatestCompletedHeatCapacityFreeTrial = (
  file: WorkbenchHeatCapacityState,
  completedAtMs: number,
): WorkbenchHeatCapacityState => {
  const trialIndex = file.heatCapacityFreeTrials.length - 1;
  const latestTrial = file.heatCapacityFreeTrials[trialIndex] ?? null;
  if (!latestTrial || !isHeatCapacityFreeTrialComplete(latestTrial)) return file;
  return {
    ...file,
    heatCapacityFreeTrials: file.heatCapacityFreeTrials.map((trial, index) => (
      index === trialIndex
        ? {
            ...trial,
            completedAtMs,
            standardReferenceSnapshot: createStandardReferenceSnapshotForCompletedFreeTrial(file, trial),
          }
        : trial
    )),
  };
};

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

const finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now: number,
): WorkbenchHeatCapacityState => {
  const stampedFile = stampLatestCompletedHeatCapacityFreeTrial(file, now);
  const latestTrial = stampedFile.heatCapacityFreeTrials[stampedFile.heatCapacityFreeTrials.length - 1] ?? null;
  if (!latestTrial || !isHeatCapacityFreeTrialComplete(latestTrial)) return stampedFile;

  const activeTraceTrialId = stampedFile.heatCapacityFreeTraceStore.activeTraceTrialId;
  let traceStore = markHeatCapacityFreeTraceTrialCompleted(
    stampedFile.heatCapacityFreeTraceStore,
    latestTrial.traceTrialId,
  );
  traceStore = activeTraceTrialId && activeTraceTrialId !== latestTrial.traceTrialId
    ? removeHeatCapacityFreeTraceTrialFromStore(traceStore, activeTraceTrialId)
    : { ...traceStore, activeTraceTrialId: null };

  return {
    ...stampedFile,
    heatCapacityFreeTraceStore: traceStore,
  };
};

const cloneHeatCapacityFreePhysicsState = (
  state: HeatCapacityFreePhysicsState,
): HeatCapacityFreePhysicsState => ({
  ...state,
  pumpProcesses: state.pumpProcesses.map((process) => ({ ...process })),
  releaseReference: state.releaseReference
    ? { ...state.releaseReference }
    : null,
});

const cloneHeatCapacityFreeSensorState = (
  state: HeatCapacityFreeSensorState,
): HeatCapacityFreeSensorState => ({
  ...state,
  pressureHistory: state.pressureHistory.map((sample) => ({ ...sample })),
  temperatureHistory: state.temperatureHistory.map((sample) => ({ ...sample })),
});

const cloneHeatCapacityFreeCalibrationState = (
  state: HeatCapacityFreeCalibrationState,
): HeatCapacityFreeCalibrationState => ({
  ...state,
  zeroEvents: state.zeroEvents.map((event) => ({ ...event })),
  automaticU0: state.automaticU0 ? { ...state.automaticU0 } : null,
});

const cloneHeatCapacityFreeRollbackSnapshot = (
  snapshot: HeatCapacityFreeRollbackSnapshot,
): HeatCapacityFreeRollbackSnapshot => ({
  ...snapshot,
  pressureZeroDisplayedSamples: snapshot.pressureZeroDisplayedSamples.map((sample) => ({ ...sample })),
  pumpStrokeTimestamps: [...snapshot.pumpStrokeTimestamps],
  heatCapacityFreePhysicsState: cloneHeatCapacityFreePhysicsState(snapshot.heatCapacityFreePhysicsState),
  heatCapacityFreeSensorState: cloneHeatCapacityFreeSensorState(snapshot.heatCapacityFreeSensorState),
  heatCapacityFreeCalibrationState: cloneHeatCapacityFreeCalibrationState(snapshot.heatCapacityFreeCalibrationState),
});

export const captureHeatCapacityFreeRollbackSnapshot = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeRollbackSnapshot => ({
  powerOn: file.powerOn,
  runState: file.runState,
  heatCapacityPhase: file.heatCapacityPhase,
  glassPistonState: file.glassPistonState,
  stopcockAngleDeg: file.stopcockAngleDeg,
  pressureSignalMv: file.pressureSignalMv,
  temperatureSignalMv: file.temperatureSignalMv,
  pressureSignalTargetMv: file.pressureSignalTargetMv,
  temperatureSignalTargetMv: file.temperatureSignalTargetMv,
  pressureInitialBiasMv: file.pressureInitialBiasMv,
  pressureZeroed: file.pressureZeroed,
  pressureZeroAdjusted: file.pressureZeroAdjusted,
  pressureZeroKnobAngle: file.pressureZeroKnobAngle,
  pressureZeroOffset: file.pressureZeroOffset,
  pressureZeroDisplayText: file.pressureZeroDisplayText,
  pressureZeroAdjustMode: file.pressureZeroAdjustMode,
  pressureZeroDisplayedSamples: file.pressureZeroDisplayedSamples.map((sample) => ({ ...sample })),
  pumpValveOpen: file.pumpValveOpen,
  pumpValveState: file.pumpValveState,
  pumpBulbState: file.pumpBulbState,
  pumpStrokeTimestamps: [...file.pumpStrokeTimestamps],
  pumpFrequency: file.pumpFrequency,
  pumpFrequencyStatus: file.pumpFrequencyStatus,
  lastPumpTime: file.lastPumpTime,
  pumpStrokeCount: file.pumpStrokeCount,
  pumpHint: file.pumpHint,
  heatCapacityFreePhysicsState: cloneHeatCapacityFreePhysicsState(file.heatCapacityFreePhysicsState),
  heatCapacityFreeSensorState: cloneHeatCapacityFreeSensorState(file.heatCapacityFreeSensorState),
  heatCapacityFreeCalibrationState: cloneHeatCapacityFreeCalibrationState(file.heatCapacityFreeCalibrationState),
  heatCapacityFreeStopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen,
  heatCapacityFreeStopcockPendingOpenAtMs: file.heatCapacityFreeStopcockPendingOpenAtMs,
  heatCapacityFreeStopcockFlowPurpose: file.heatCapacityFreeStopcockFlowPurpose,
});

const restoreHeatCapacityFreeRollbackSnapshot = (
  file: WorkbenchHeatCapacityState,
  snapshot: HeatCapacityFreeRollbackSnapshot,
  now: number,
): WorkbenchHeatCapacityState => {
  const clonedSnapshot = cloneHeatCapacityFreeRollbackSnapshot(snapshot);
  const restoredFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...file,
      powerOn: clonedSnapshot.powerOn,
      runState: clonedSnapshot.runState,
      heatCapacityPhase: clonedSnapshot.heatCapacityPhase,
      glassPistonState: clonedSnapshot.glassPistonState,
      stopcockAngleDeg: clonedSnapshot.stopcockAngleDeg,
      pressureSignalMv: clonedSnapshot.pressureSignalMv,
      temperatureSignalMv: clonedSnapshot.temperatureSignalMv,
      pressureSignalTargetMv: clonedSnapshot.pressureSignalTargetMv,
      temperatureSignalTargetMv: clonedSnapshot.temperatureSignalTargetMv,
      pressureInitialBiasMv: clonedSnapshot.pressureInitialBiasMv,
      pressureZeroed: clonedSnapshot.pressureZeroed,
      pressureZeroAdjusted: clonedSnapshot.pressureZeroAdjusted,
      pressureZeroKnobAngle: clonedSnapshot.pressureZeroKnobAngle,
      pressureZeroOffset: clonedSnapshot.pressureZeroOffset,
      pressureZeroDisplayText: clonedSnapshot.pressureZeroDisplayText,
      pressureZeroAdjustMode: clonedSnapshot.pressureZeroAdjustMode,
      pressureZeroDisplayedSamples: clonedSnapshot.pressureZeroDisplayedSamples,
      pumpValveOpen: clonedSnapshot.pumpValveOpen,
      pumpValveState: clonedSnapshot.pumpValveState,
      pumpBulbState: clonedSnapshot.pumpBulbState,
      pumpStrokeTimestamps: clonedSnapshot.pumpStrokeTimestamps,
      pumpFrequency: clonedSnapshot.pumpFrequency,
      pumpFrequencyStatus: clonedSnapshot.pumpFrequencyStatus,
      lastPumpTime: clonedSnapshot.lastPumpTime,
      pumpStrokeCount: clonedSnapshot.pumpStrokeCount,
      pumpHint: clonedSnapshot.pumpHint,
      heatCapacityFreeStopcockFlowOpen: clonedSnapshot.heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockPendingOpenAtMs: clonedSnapshot.heatCapacityFreeStopcockPendingOpenAtMs,
      heatCapacityFreeStopcockFlowPurpose: clonedSnapshot.heatCapacityFreeStopcockFlowPurpose,
      updatedAt: now,
    },
    clonedSnapshot.heatCapacityFreePhysicsState,
    clonedSnapshot.heatCapacityFreeSensorState,
    clonedSnapshot.heatCapacityFreeCalibrationState,
    now,
  );
  return {
    ...restoredFile,
    pressureZeroAdjusted: clonedSnapshot.pressureZeroAdjusted,
    pressureZeroKnobAngle: clonedSnapshot.pressureZeroKnobAngle,
    pressureZeroDisplayText: clonedSnapshot.pressureZeroDisplayText,
    pressureZeroAdjustMode: clonedSnapshot.pressureZeroAdjustMode,
    pumpValveOpen: clonedSnapshot.pumpValveOpen,
    pumpValveState: clonedSnapshot.pumpValveState,
    pumpBulbState: clonedSnapshot.pumpBulbState,
    pumpStrokeTimestamps: clonedSnapshot.pumpStrokeTimestamps,
    pumpFrequency: clonedSnapshot.pumpFrequency,
    pumpFrequencyStatus: clonedSnapshot.pumpFrequencyStatus,
    lastPumpTime: clonedSnapshot.lastPumpTime,
    pumpStrokeCount: clonedSnapshot.pumpStrokeCount,
    pumpHint: clonedSnapshot.pumpHint,
    heatCapacityFreeStopcockFlowOpen: clonedSnapshot.heatCapacityFreeStopcockFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs: clonedSnapshot.heatCapacityFreeStopcockPendingOpenAtMs,
    heatCapacityFreeStopcockFlowPurpose: clonedSnapshot.heatCapacityFreeStopcockFlowPurpose,
    updatedAt: now,
  };
};

const createHeatCapacityFreeRollbackPressureBiasMv = (
  seed: number | string,
) => createSeededFreePressureInitialBiasMv(seed, HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV);

const createHeatCapacityGuidePressureInitialBiasMv = (
  seed: number | string,
) => createSeededFreePressureInitialBiasMv(seed, HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV);

const rollbackHeatCapacityFreeToFreshZeroing = (
  file: WorkbenchHeatCapacityState,
  now: number,
): WorkbenchHeatCapacityState => {
  const seed = `free-u0-rollback-${file.id}-${now}`;
  const pressureInitialBiasMv = createHeatCapacityFreeRollbackPressureBiasMv(seed);
  const physicsState = {
    ...createDefaultFreePhysicsState(file.heatCapacityFreePhysicsConfig, seed),
    simulationTimeS: file.heatCapacityFreePhysicsState.simulationTimeS,
    lastStopcockOpenedAtS: file.heatCapacityFreePhysicsState.simulationTimeS,
    lastStopcockClosedAtS: null,
  };
  const sensorState = createDefaultFreeSensorState(seed, {
    pressureMv: pressureInitialBiasMv,
    pressureInitialBiasMv,
    temperatureMv: file.heatCapacityFreeSensorConfig.temperatureMvAtAmbient,
  });
  const calibrationState = createDefaultHeatCapacityFreeCalibrationState();
  const restoredFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...file,
      powerOn: true,
      runState: 'running',
      glassPistonState: 'open',
      stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
      pressureInitialBiasMv,
      pressureZeroed: false,
      pressureZeroAdjusted: false,
      pressureZeroKnobAngle: 0,
      pressureZeroOffset: 0,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
      pressureZeroAdjustMode: 'none',
      pressureZeroDisplayedSamples: [],
      pumpValveOpen: false,
      pumpValveState: 'closed',
      pumpBulbState: 'idle',
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      lastPumpTime: null,
      pumpStrokeCount: 0,
      pumpHint: '未打气',
      heatCapacityFreeStopcockFlowOpen: true,
      heatCapacityFreeStopcockPendingOpenAtMs: null,
      heatCapacityFreeStopcockFlowPurpose: 'zeroing',
      heatCapacityFreeRollbackSnapshots: {
        afterPowerOn: file.heatCapacityFreeRollbackSnapshots.afterPowerOn,
        beforePump: null,
        beforeRelease: null,
      },
      updatedAt: now,
    },
    physicsState,
    sensorState,
    calibrationState,
    now,
  );
  return {
    ...restoredFile,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    heatCapacityFreeStopcockFlowOpen: true,
    heatCapacityFreeStopcockPendingOpenAtMs: null,
    heatCapacityFreeStopcockFlowPurpose: 'zeroing',
    updatedAt: now,
  };
};

const applyHeatCapacityFreeRemovalRollback = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now: number,
): WorkbenchHeatCapacityState => {
  if (kind === 'u0') {
    return rollbackHeatCapacityFreeToFreshZeroing(file, now);
  }
  if (kind === 'u1') {
    const snapshot = file.heatCapacityFreeRollbackSnapshots.beforePump;
    if (snapshot) {
      return restoreHeatCapacityFreeRollbackSnapshot(file, snapshot, now);
    }
    return {
      ...file,
      pumpValveOpen: true,
      pumpValveState: 'open',
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      lastPumpTime: null,
      pumpStrokeCount: 0,
      pumpHint: '打气阀门已打开',
      heatCapacityFreePhysicsState: {
        ...file.heatCapacityFreePhysicsState,
        pumpStrokeCount: 0,
        pumpProcesses: [],
        lastPumpStrokeAtS: null,
        releaseStarted: false,
        releaseReference: null,
      },
      heatCapacityFreeRollbackSnapshots: {
        ...file.heatCapacityFreeRollbackSnapshots,
        beforeRelease: null,
      },
      heatCapacityFreeExperimentGroupStatus: 'running',
      updatedAt: now,
    };
  }
  if (kind === 'u2') {
    const snapshot = file.heatCapacityFreeRollbackSnapshots.beforeRelease;
    if (snapshot) {
      return restoreHeatCapacityFreeRollbackSnapshot(file, snapshot, now);
    }
    return {
      ...file,
      glassPistonState: 'closed',
      stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
      heatCapacityFreeStopcockFlowOpen: false,
      heatCapacityFreeStopcockPendingOpenAtMs: null,
      heatCapacityFreeStopcockFlowPurpose: 'none',
      heatCapacityFreePhysicsState: {
        ...file.heatCapacityFreePhysicsState,
        releaseStarted: false,
        releaseReference: null,
        lastStopcockClosedAtS: file.heatCapacityFreePhysicsState.simulationTimeS,
      },
      heatCapacityFreeExperimentGroupStatus: 'running',
      updatedAt: now,
    };
  }
  return file;
};

const removeHeatCapacityFreeTrialRecordWorkbenchStateCore = (
  file: WorkbenchHeatCapacityState,
  trialIndex: number,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityFreeTrials.length === 0) return file;
  const boundedIndex = Math.min(file.heatCapacityFreeTrials.length - 1, Math.max(0, trialIndex));
  const removedTrial = file.heatCapacityFreeTrials[boundedIndex];
  const removal = removeHeatCapacityFreeTrialRecord(file.heatCapacityFreeTrials, boundedIndex, kind);

  if (kind === 'trial') {
    return {
      ...file,
      heatCapacityFreeTrials: removal.trials,
      heatCapacityFreeTraceStore: removeHeatCapacityFreeTraceTrialFromStore(
        file.heatCapacityFreeTraceStore,
        removedTrial.traceTrialId,
      ),
      updatedAt: now,
    };
  }

  const traceTrialId = removedTrial.traceTrialId ?? file.heatCapacityFreeTraceStore.activeTraceTrialId;
  if (!traceTrialId) {
    return applyHeatCapacityFreeRemovalRollback({
      ...file,
      heatCapacityFreeTrials: removal.trials,
      heatCapacityFreeExperimentGroupStatus: kind === 'u2' || kind === 'u1' || kind === 'u0'
        ? 'running'
        : file.heatCapacityFreeExperimentGroupStatus,
      updatedAt: now,
    }, kind, now);
  }

  const hasTraceTrial = file.heatCapacityFreeTraceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialId);
  if (!hasTraceTrial) {
    return applyHeatCapacityFreeRemovalRollback({
      ...file,
      heatCapacityFreeTrials: removal.trials,
      heatCapacityFreeExperimentGroupStatus: kind === 'u2' || kind === 'u1' || kind === 'u0'
        ? 'running'
        : file.heatCapacityFreeExperimentGroupStatus,
      updatedAt: now,
    }, kind, now);
  }

  let nextFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeTraceStore: {
      ...file.heatCapacityFreeTraceStore,
      activeTraceTrialId: traceTrialId,
    },
    heatCapacityFreeTrials: removal.trials,
    heatCapacityFreeExperimentGroupStatus: kind === 'u2' || kind === 'u1' || kind === 'u0'
      ? 'running'
      : file.heatCapacityFreeExperimentGroupStatus,
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
  return applyHeatCapacityFreeRemovalRollback(nextFile, kind, now);
};

export const removeHeatCapacityFreeTrialRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  trialIndex: number,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
  now = Date.now(),
  scheme = file.heatCapacityMode === 'free' ? file.heatCapacityFreeParameterScheme : 'real',
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return removeHeatCapacityFreeTrialRecordWorkbenchStateCore(file, trialIndex, kind, now);
  }
  const storedActiveFile = storeHeatCapacityFreeRuntimeFieldsInDomain(
    file,
    file.heatCapacityFreeParameterScheme,
  );
  const hydratedFile = applyHeatCapacityFreeDomainToRuntimeFields(
    storedActiveFile,
    selectHeatCapacityFreeDomain(storedActiveFile, scheme),
  );
  const nextFile = removeHeatCapacityFreeTrialRecordWorkbenchStateCore(
    hydratedFile,
    trialIndex,
    kind,
    now,
  );
  const nextStoredFile = storeHeatCapacityFreeRuntimeFieldsInDomain(nextFile, scheme);
  return applyHeatCapacityFreeDomainToRuntimeFields(
    nextStoredFile,
    selectActiveHeatCapacityFreeDomain(nextStoredFile),
  );
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

  if (
    isHeatCapacityFreeTrialComplete(lastTrial) &&
    (
      !file.powerOn ||
      file.heatCapacityFreeExperimentGroupStatus !== 'completed'
    )
  ) {
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

  const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex(file);
  const activeTrial = activeTrialIndex >= 0 ? file.heatCapacityFreeTrials[activeTrialIndex] ?? null : null;
  if (activeTrial && (hasHeatCapacityFreeTrialProgress(activeTrial) || activeTraceTrialId !== null)) {
    const traceTrialIds = new Set(
      [activeTrial.traceTrialId, activeTraceTrialId].filter((id): id is string => typeof id === 'string'),
    );
    let traceStore = file.heatCapacityFreeTraceStore;
    for (const traceTrialId of traceTrialIds) {
      traceStore = removeHeatCapacityFreeTraceTrialFromStore(traceStore, traceTrialId);
    }
    return {
      heatCapacityFreeTrials: activeTrialIndex >= 0
        ? file.heatCapacityFreeTrials.filter((_, index) => index !== activeTrialIndex)
        : file.heatCapacityFreeTrials.slice(0, -1),
      heatCapacityFreeTraceStore: traceStore,
    };
  }

  if (activeTraceTrialId !== null) {
    return {
      heatCapacityFreeTrials: file.heatCapacityFreeTrials,
      heatCapacityFreeTraceStore: removeHeatCapacityFreeTraceTrialFromStore(
        file.heatCapacityFreeTraceStore,
        activeTraceTrialId,
      ),
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

const resolveHeatCapacityFreeIdealStage = (
  file: WorkbenchHeatCapacityState,
  state: HeatCapacityFreePhysicsState,
  stopcockOpen: boolean,
  stopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose,
): HeatCapacityFreeIdealStage => {
  const hasActivePumpProcess = (state.pumpProcesses?.length ?? 0) > 0;
  if (hasActivePumpProcess) return 'fastAdiabatic';
  if (stopcockOpen && stopcockFlowPurpose === 'release') return 'fastAdiabatic';
  if (stopcockOpen) {
    const derived = deriveFreePhysicalState(state, file.heatCapacityFreePhysicsConfig);
    if (
      derived.gasPressureKPa >
        file.heatCapacityFreePhysicsConfig.environment.ambientPressureKPa + 0.000001
    ) {
      return 'fastAdiabatic';
    }
  }
  return 'thermalEquilibrium';
};

const createHeatCapacityFreeEffectivePhysicsConfigForSegment = (
  file: WorkbenchHeatCapacityState,
  state: HeatCapacityFreePhysicsState,
  stopcockOpen: boolean,
  stopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose,
): HeatCapacityFreePhysicsConfig => (
  file.heatCapacityFreeParameterScheme === 'ideal'
    ? createHeatCapacityFreeIdealStagePhysicsConfig(
        file.heatCapacityFreePhysicsConfig,
        resolveHeatCapacityFreeIdealStage(file, state, stopcockOpen, stopcockFlowPurpose),
      )
    : file.heatCapacityFreePhysicsConfig
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
    stopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose,
  ) => {
    const effectivePhysicsConfig = createHeatCapacityFreeEffectivePhysicsConfigForSegment(
      file,
      state,
      stopcockOpen,
      stopcockFlowPurpose,
    );
    return stepFreePhysics(
      state,
      effectivePhysicsConfig,
      {
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen,
        stopcockFlowPurpose: stopcockOpen && stopcockFlowPurpose !== 'none'
          ? stopcockFlowPurpose
          : undefined,
      },
      dtS,
      state.simulationTimeS + dtS,
    );
  };
  const stepRuntimeSegments = (
    sourceFile: WorkbenchHeatCapacityState,
    sourcePhysicsState: HeatCapacityFreePhysicsState,
    sourceSensorState: HeatCapacityFreeSensorState,
    dtS: number,
    stopcockOpen: boolean,
    nextStopcockFlowOpen: boolean,
    nextStopcockPendingOpenAtMs: number | null,
    nextStopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose,
    recordIntermediateTrace: boolean,
  ) => {
    const totalDtS = Math.max(0, Number.isFinite(dtS) ? dtS : 0);
    const sourceDerived = deriveFreePhysicalState(sourcePhysicsState, sourceFile.heatCapacityFreePhysicsConfig);
    const hasActivePumpProcess = (sourcePhysicsState.pumpProcesses?.length ?? 0) > 0;
    const hasActiveFastPhysicsProcess =
      hasActivePumpProcess ||
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
      heatCapacityFreeStopcockFlowPurpose: nextStopcockFlowPurpose,
    };

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      physicsState = stepPhysicsSegment(physicsState, segmentDtS, stopcockOpen, nextStopcockFlowPurpose);
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
          heatCapacityFreeStopcockFlowPurpose: nextStopcockFlowPurpose,
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
  let heatCapacityFreeStopcockFlowPurpose = normalizeHeatCapacityFreeStopcockFlowPurpose(
    file.heatCapacityFreeStopcockFlowPurpose,
    file,
    file.heatCapacityFreeStopcockFlowOpen || pendingOpenAtMs !== null,
  );

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
      heatCapacityFreeStopcockFlowPurpose,
      false,
    );
    mergedFile = closedStep.workingFile;
    physicsState = closedStep.physicsState;
    sensorState = closedStep.sensorState;
    heatCapacityFreeStopcockFlowOpen = true;
    heatCapacityFreeStopcockPendingOpenAtMs = null;
    heatCapacityFreeStopcockFlowPurpose = normalizeHeatCapacityFreeStopcockFlowPurpose(
      heatCapacityFreeStopcockFlowPurpose,
      mergedFile,
      true,
    );
    const openStep = stepRuntimeSegments(
      mergedFile,
      physicsState,
      sensorState,
      openDtS,
      true,
      heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockPendingOpenAtMs,
      heatCapacityFreeStopcockFlowPurpose,
      false,
    );
    mergedFile = openStep.workingFile;
    physicsState = openStep.physicsState;
    sensorState = openStep.sensorState;
  } else {
    if (pendingFlowOpensNow && !file.heatCapacityFreeStopcockFlowOpen) {
      heatCapacityFreeStopcockFlowOpen = true;
      heatCapacityFreeStopcockPendingOpenAtMs = null;
      heatCapacityFreeStopcockFlowPurpose = normalizeHeatCapacityFreeStopcockFlowPurpose(
        heatCapacityFreeStopcockFlowPurpose,
        mergedFile,
        true,
      );
    }
    if (!heatCapacityFreeStopcockFlowOpen && heatCapacityFreeStopcockPendingOpenAtMs === null) {
      heatCapacityFreeStopcockFlowPurpose = 'none';
    }
    const elapsedStep = stepRuntimeSegments(
      mergedFile,
      physicsState,
      sensorState,
      (elapsedMs / 1000) * equilibriumSpeedMultiplier,
      heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockFlowOpen,
      heatCapacityFreeStopcockPendingOpenAtMs,
      heatCapacityFreeStopcockFlowPurpose,
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

const registerHeatCapacityPumpStrokeCore = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
    const workflowContext = getHeatCapacityGuideActionContext(currentFile, 'pressPumpBulb');
    const workflowGuard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, workflowContext);
    if (!workflowGuard.allowed) {
      const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, workflowContext);
      return mergeHeatCapacityGuideRuntimeState(
        {
          ...currentFile,
          pumpHint: workflowGuard.message,
          pumpBulbState: 'releasing',
        },
        currentFile.heatCapacityGuidePhysicsState,
        workflow,
        now,
      );
    }
    const frequencyState = getHeatCapacityPumpFrequencyState([...currentFile.pumpStrokeTimestamps, now], now);
    const stroke = applyGuidePumpStroke(
      currentFile.heatCapacityGuidePhysicsState,
      currentFile.heatCapacityGuidePhysicsConfig,
      {
        powerOn: currentFile.powerOn,
        pumpValveOpen: currentFile.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) === 'open',
      },
      {
        atS: currentFile.heatCapacityGuidePhysicsState.simulationTimeS,
        strength: 1,
      },
    );
    if (!stroke.accepted) {
      const pumpHint = stroke.reason === 'powerOff'
        ? '请先打开电源，再执行有效打气'
        : stroke.reason === 'stopcockOpen'
          ? '玻璃旋塞已打开，无法形成有效加压'
          : stroke.reason === 'pressureDanger'
            ? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。'
            : '打气阀门未打开，无法有效打气';
      const workflow = transitionHeatCapacityGuideWorkflow(
        currentFile.heatCapacityGuideWorkflow,
        getHeatCapacityGuideActionContext(currentFile, 'pressPumpBulb'),
      );
      return mergeHeatCapacityGuideRuntimeState(
        {
          ...currentFile,
          pumpHint,
          pumpBulbState: 'releasing',
        },
        stroke.state,
        workflow,
        now,
      );
    }
    const workflow = transitionHeatCapacityGuideWorkflow(
      currentFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(currentFile, 'pressPumpBulb'),
    );
    const guidePumpTargetReached = workflow.step === 'closePumpValveRequired';
    return mergeHeatCapacityGuideRuntimeState(
      {
        ...currentFile,
        pumpBulbState: 'compressing',
        pumpStrokeTimestamps: frequencyState.timestamps,
        pumpFrequency: frequencyState.pumpFrequency,
        pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
        lastPumpTime: now,
        pumpStrokeCount: stroke.state.pumpStrokeCount,
        pumpHint: guidePumpTargetReached
          ? '已达到打气标准，请关闭打气阀门。'
          : frequencyState.pumpFrequencyStatus === 'suitable'
          ? '打气频率合适，可以继续观察压强变化'
          : '打气速率偏低，实验效果可能不明显',
      },
      stroke.state,
      workflow,
      now,
    );
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    const sourceFile = file.heatCapacityMode === 'free'
      ? freezeHeatCapacityFreeParametersForCurrentGroup(file)
      : file;
    const currentFile = stepHeatCapacityFreeWorkbenchFile(
      sourceFile,
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
        pumpHint: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
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
            ? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。'
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
      pumpHint: currentGaugePressureState.pressureSafetyMessage ?? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
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

export const registerHeatCapacityPumpStroke = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return registerHeatCapacityPumpStrokeCore(file, now);
  }
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const nextFile = registerHeatCapacityPumpStrokeCore(hydratedFile, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, scheme);
};

export const refreshHeatCapacityPumpFrequency = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
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

const createHeatCapacityAutoDemoResultTrial = (
  file: WorkbenchHeatCapacityState,
  now: number,
): HeatCapacityGuideTrial => {
  const profile = file.heatCapacityExperimentProfile ?? createHeatCapacityAutoDemoProfile();
  const samples = file.heatCapacityProcessSamples;
  const baseTrial: HeatCapacityGuideTrial = {
    ...createHeatCapacityGuideTrial('demo-trial-1'),
    source: 'demo',
  };
  const u0Recorded = recordGuideU0(baseTrial, {
    atS: samples.zeroedSample?.timeS ?? 10,
    displayPressureMv: profile.u0MeasuredMv,
    displayTemperatureMv: samples.zeroedSample?.temperatureSignalMv ?? profile.initialTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-u0',
  });
  const u1Recorded = recordGuideU1(u0Recorded, {
    atS: samples.stableBeforeReleaseSample?.timeS ?? 86.9,
    displayPressureMv: profile.u1MeasuredMv,
    displayTemperatureMv: samples.stableBeforeReleaseSample?.temperatureSignalMv ?? profile.stableTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-u1',
  });
  return recordGuideU2(u1Recorded, {
    atS: samples.recoverySample?.timeS ?? 114.3,
    displayPressureMv: profile.u2MeasuredMv,
    displayTemperatureMv: samples.recoverySample?.temperatureSignalMv ?? profile.recoveryTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-u2',
  }, now, {
    atmosphericPressureKPa: file.ambientPressureKPa,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
  });
};

export function completeHeatCapacityTeachingModeWorkbenchState(
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState {
  const heatCapacityGuideTrial = file.heatCapacityMode === 'demo'
    ? createHeatCapacityAutoDemoResultTrial(file, now)
    : file.heatCapacityGuideTrial;
  return {
    ...file,
    heatCapacityTeachingStatus: 'completed',
    heatCapacityGuideTrial,
    powerOn: false,
    runState: 'idle',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    pressureSignalMv: null,
    temperatureSignalMv: null,
    pressureKPa: null,
    pressureReleaseBurstUntilMs: null,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayedSamples: [],
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '教学流程已完成',
    heatCapacityFreeStopcockFlowOpen: false,
    heatCapacityFreeStopcockPendingOpenAtMs: null,
    heatCapacityFreeStopcockFlowPurpose: 'none',
    updatedAt: now,
  };
}

export function exitHeatCapacityTeachingModeWorkbenchState(
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState {
  return resetHeatCapacityFreeRunWorkbenchState({
    ...file,
    heatCapacityTeachingStatus: 'idle',
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityGuideTrial: null,
    heatCapacityProcessSamples: {},
  }, now);
}

const powerHeatCapacityWorkbenchFileCore = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
    const proposedFile = {
      ...currentFile,
      powerOn: nextPowerOn,
      runState: nextPowerOn ? currentFile.runState : 'idle',
      pressureZeroed: nextPowerOn ? currentFile.pressureZeroed : false,
      pressureReleaseBurstUntilMs: null,
    };
    const context = getHeatCapacityGuideActionContext(proposedFile, 'togglePower');
    const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
    const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
    const baseFile = guard.allowed
      ? proposedFile
      : currentFile;
    const mergedGuideFile = mergeHeatCapacityGuideRuntimeState(
      {
        ...baseFile,
        runState: workflow.step === 'completed'
          ? 'finished'
          : baseFile.powerOn
            ? baseFile.runState
            : 'idle',
        pressureReleaseBurstUntilMs: null,
      },
      currentFile.heatCapacityGuidePhysicsState,
      workflow,
      now,
    );
    return workflow.step === 'completed'
      ? completeHeatCapacityTeachingModeWorkbenchState(mergedGuideFile, now)
      : mergedGuideFile;
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    const sourceFile = file.heatCapacityMode === 'free' && nextPowerOn
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
    const poweredFileWithSnapshot = nextPowerOn
      ? {
          ...poweredFile,
          heatCapacityFreeRollbackSnapshots: {
            ...poweredFile.heatCapacityFreeRollbackSnapshots,
            afterPowerOn: captureHeatCapacityFreeRollbackSnapshot(poweredFile),
            beforePump: null,
            beforeRelease: null,
          },
        }
      : poweredFile;
    if (file.heatCapacityMode !== 'free') {
      return poweredFileWithSnapshot;
    }
    const tracedFile = recordHeatCapacityFreeTraceEvent(
      recordHeatCapacityFreeSafetyTransitionEvents(sourceFile, poweredFileWithSnapshot, now),
      nextPowerOn ? 'power-on' : 'power-off',
      now,
    );
    if (!nextPowerOn && isHeatCapacityFreeExperimentGroupComplete(tracedFile)) {
      return finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState(tracedFile, now);
    }
    return tracedFile;
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

export const powerHeatCapacityWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return powerHeatCapacityWorkbenchFileCore(file, nextPowerOn, now);
  }
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const nextFile = powerHeatCapacityWorkbenchFileCore(hydratedFile, nextPowerOn, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, scheme);
};

export const prepareHeatCapacityAutoDemoStart = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
  createInitialBiasMv = () => HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
): WorkbenchHeatCapacityState => {
  const experimentProfile = createHeatCapacityAutoDemoProfile();
  const pressureInitialBiasMv = roundNumber(clampNumber(
    createInitialBiasMv(),
    -HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
    HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  ), 2);
  const gaugePressureState = getHeatCapacityGaugePressureState(0, true, file);
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  const resetFile: WorkbenchHeatCapacityState = {
    ...file,
    ...guideRuntimeFields,
    heatCapacityMode: 'demo',
    heatCapacityTeachingStatus: 'running',
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
    pressureSignalRawReadoutMv: 0,
    pressureSignalReadoutMv: pressureInitialBiasMv,
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
    vesselPressureReadoutKPa: file.ambientPressureKPa,
    vesselTemperatureReadoutK: file.ambientTemperatureK,
    recordedPressures: { p0: file.ambientPressureKPa, p1: null, p2: null },
    heatCapacityGuideTrial: null,
    heatCapacityExperimentSeed: experimentProfile.seed,
    heatCapacityExperimentProfile: experimentProfile,
    heatCapacityProcessSamples: {},
    updatedAt: now,
  };

  const poweredFile = powerHeatCapacityWorkbenchFile(resetFile, true, now);
  return {
    ...poweredFile,
    heatCapacityTeachingStatus: 'running',
    runState: 'running',
    pressureZeroAdjusted: false,
    pressureZeroed: false,
    pumpHint: '自动演示已启动',
  };
};

interface HeatCapacityGuideRuntimeMergeOptions {
  immediatePressureDisplay?: boolean;
  immediateTemperatureDisplay?: boolean;
}

const mergeHeatCapacityGuideRuntimeState = (
  file: WorkbenchHeatCapacityState,
  guidePhysicsState: HeatCapacityGuidePhysicsState,
  guideWorkflow: HeatCapacityGuideWorkflowState,
  now: number,
  options: HeatCapacityGuideRuntimeMergeOptions = {},
): WorkbenchHeatCapacityState => {
  let nextGuideWorkflow = guideWorkflow;
  const derived = deriveGuidePhysicalState(guidePhysicsState, file.heatCapacityGuidePhysicsConfig);
  const pressureDeltaKPa = derived.pressureDeltaKPa;
  const rawPressureMv = pressureDeltaKPa * file.pressureSensitivityMvPerKPa;
  const pressureSignalTargetMv = truncateHeatCapacitySignalMv(applyHeatCapacityPressureZero(
    rawPressureMv,
    file.pressureInitialBiasMv,
    file.pressureZeroOffset,
  ));
  const temperatureSignalTargetMv = truncateHeatCapacitySignalMv(
    DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient +
    (guidePhysicsState.gasTemperatureK - file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK) *
      DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvPerK,
  );
  const powerOn = file.powerOn;
  const elapsedS = file.displayResponseLastUpdateMs === null
    ? 0
    : Math.max(0, (now - file.displayResponseLastUpdateMs) / 1000);
  const pressureDisplayValue = powerOn
    ? options.immediatePressureDisplay
      ? pressureSignalTargetMv
      : getHeatCapacityDisplayValue({
        current: file.pressureSignalMv,
        target: pressureSignalTargetMv,
        previousTarget: Number.isFinite(file.pressureSignalTargetMv)
          ? file.pressureSignalTargetMv
          : pressureSignalTargetMv,
        elapsedS,
        now,
        config: HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
      })
    : null;
  const temperatureDisplayValue = powerOn
    ? options.immediateTemperatureDisplay
      ? temperatureSignalTargetMv
      : getHeatCapacityDisplayValue({
        current: file.temperatureSignalMv,
        target: temperatureSignalTargetMv,
        previousTarget: Number.isFinite(file.temperatureSignalTargetMv)
          ? file.temperatureSignalTargetMv
          : temperatureSignalTargetMv,
        elapsedS,
        now,
        config: HEAT_CAPACITY_TEMPERATURE_DISPLAY_RESPONSE,
      })
    : null;
  const pressureSignalMv = pressureDisplayValue === null
    ? null
    : truncateHeatCapacitySignalMv(pressureDisplayValue);
  const temperatureSignalMv = temperatureDisplayValue === null
    ? null
    : truncateHeatCapacitySignalMv(temperatureDisplayValue);
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    file.pressureZeroDisplayedSamples,
    now,
    pressureSignalMv,
    powerOn,
  );
  const pressureZeroed = isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
  if (nextGuideWorkflow.step === 'zeroRequired' && pressureZeroed && file.pressureZeroAdjusted) {
    nextGuideWorkflow = transitionHeatCapacityGuideWorkflow(nextGuideWorkflow, {
      action: 'adjustZero',
      powerOn: file.powerOn,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpValveOpen: file.pumpValveOpen,
      displayPressureMv: pressureSignalMv ?? pressureSignalTargetMv,
      pressureZeroReady: true,
      releaseDurationReady: getHeatCapacityGuideReleaseDurationReady(file),
      simulationTimeS: guidePhysicsState.simulationTimeS,
    });
  }
  const gaugeState = getHeatCapacityGaugePressureState(
    pressureDeltaKPa,
    file.powerOn,
    file,
    file.pressureGaugeDisplayValue,
  );
  return {
    ...file,
    heatCapacityGuidePhysicsState: guidePhysicsState,
    heatCapacityGuideWorkflow: nextGuideWorkflow,
    heatCapacityPhase: getHeatCapacityGuideRuntimePhase(file.powerOn, nextGuideWorkflow.step),
    gasPressureKPaAbs: derived.gasPressureKPa,
    gasTemperatureK: guidePhysicsState.gasTemperatureK,
    pressureDeltaKPa,
    simulationTimeS: guidePhysicsState.simulationTimeS,
    pressureSignalMvRaw: rawPressureMv,
    pressureSignalMvDisplayed: pressureSignalTargetMv,
    pressureSignalTargetMv,
    temperatureSignalTargetMv,
    displayResponseLastUpdateMs: now,
    pressureZeroDisplayedSamples,
    pressureZeroed,
    pressureSignalMv,
    temperatureSignalMv,
    pressureKPa: powerOn ? derived.gasPressureKPa : null,
    pressureGaugeTargetValue: gaugeState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugeState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugeState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugeState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugeState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugeState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugeState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugeState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugeState.pressureSafetyStatus,
    pressureSafetyMessage: gaugeState.pressureSafetyMessage,
    pressureBlockedPumping: gaugeState.pressureBlockedPumping,
    pressureOverLimit: gaugeState.pressureOverLimit,
    vesselPressureReadoutKPa: roundNumber(derived.gasPressureKPa, 2),
    pressureSignalReadoutMv: roundNumber(pressureSignalMv ?? pressureSignalTargetMv, 2),
    vesselTemperatureReadoutK: roundNumber(guidePhysicsState.gasTemperatureK, 3),
    updatedAt: now,
  };
};

const getHeatCapacityGuideReleaseDurationReady = (
  file: Pick<WorkbenchHeatCapacityState, 'heatCapacityGuidePhysicsState'>,
) => file.heatCapacityGuidePhysicsState.currentStopcockOpenDurationS >= HEAT_CAPACITY_GUIDE_RELEASE_TARGET_S;

const getHeatCapacityGuideRuntimePhase = (
  powerOn: boolean,
  step: HeatCapacityGuideWorkflowState['step'],
): HeatCapacityRuntimePhase => {
  if (!powerOn) return 'powerOff';
  switch (step) {
    case 'powerRequired':
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

const getHeatCapacityGuideActionContext = (
  file: WorkbenchHeatCapacityState,
  action: HeatCapacityGuideAction,
  overrides: Partial<ReturnType<typeof buildHeatCapacityGuideActionContextBase>> = {},
) => ({
  ...buildHeatCapacityGuideActionContextBase(file, action),
  ...overrides,
});

const buildHeatCapacityGuideActionContextBase = (
  file: WorkbenchHeatCapacityState,
  action: HeatCapacityGuideAction,
) => ({
  action,
  powerOn: file.powerOn,
  stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
  pumpValveOpen: file.pumpValveOpen,
  displayPressureMv: Number.isFinite(file.pressureSignalMv)
    ? file.pressureSignalMv ?? 0
    : truncateHeatCapacitySignalMv(file.pressureSignalMvDisplayed),
  pressureZeroReady: file.pressureZeroed,
  releaseDurationReady: getHeatCapacityGuideReleaseDurationReady(file),
  simulationTimeS: file.heatCapacityGuidePhysicsState.simulationTimeS,
});

export const setHeatCapacityGuideStopcockOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const action: HeatCapacityGuideAction = nextOpen ? 'openStopcock' : 'closeStopcock';
  const proposedFile = {
    ...currentFile,
    stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(nextOpen),
    glassPistonState: nextOpen ? 'open' as const : 'closed' as const,
  };
  const context = getHeatCapacityGuideActionContext(proposedFile, action);
  const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  const baseFile = guard.allowed ? proposedFile : currentFile;
  return mergeHeatCapacityGuideRuntimeState(
    baseFile,
    currentFile.heatCapacityGuidePhysicsState,
    workflow,
    now,
  );
};

export const setHeatCapacityGuidePumpValveOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const action: HeatCapacityGuideAction = nextOpen ? 'openPumpValve' : 'closePumpValve';
  const proposedFile = {
    ...currentFile,
    pumpValveOpen: nextOpen,
    pumpValveState: nextOpen ? 'open' as const : 'closed' as const,
    pumpHint: nextOpen ? '打气阀门已打开' : '打气阀门已关闭',
  };
  const context = getHeatCapacityGuideActionContext(proposedFile, action);
  const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  const baseFile = guard.allowed ? proposedFile : currentFile;
  return mergeHeatCapacityGuideRuntimeState(
    baseFile,
    currentFile.heatCapacityGuidePhysicsState,
    workflow,
    now,
  );
};

export const setHeatCapacityGuideEquilibriumSpeedMultiplier = (
  file: WorkbenchHeatCapacityState,
  multiplier: unknown,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
  return {
    ...file,
    heatCapacityGuideWorkflow: {
      ...file.heatCapacityGuideWorkflow,
      speedMultiplier: normalizeHeatCapacityGuideSpeedMultiplier(multiplier),
    },
    lastUpdateMs: file.powerOn ? now : file.lastUpdateMs,
    updatedAt: now,
  };
};

export type HeatCapacityGuideWorkbenchRecordKind = 'u0' | 'u1' | 'u2';

export interface HeatCapacityGuideRecordButtonState {
  visible: boolean;
  disabledReason: string | null;
}

export const getHeatCapacityGuideRecordButtonState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityGuideWorkbenchRecordKind,
): HeatCapacityGuideRecordButtonState => {
  const step = file.heatCapacityGuideWorkflow.step;
  const visible = (
    (kind === 'u0' && step === 'recordU0Required') ||
    (kind === 'u1' && step === 'recordU1Required') ||
    (kind === 'u2' && step === 'recordU2Required')
  );
  return {
    visible,
    disabledReason: visible ? null : 'guide-step-not-ready',
  };
};

export type HeatCapacityGuideWorkbenchRecordAttempt =
  | {
      accepted: true;
      reason: 'accepted';
      kind: HeatCapacityGuideWorkbenchRecordKind;
      file: WorkbenchHeatCapacityState;
    }
  | {
      accepted: false;
      reason: string;
      kind: HeatCapacityGuideWorkbenchRecordKind;
      file: WorkbenchHeatCapacityState;
    };

export const applyHeatCapacityGuideRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityGuideWorkbenchRecordKind,
  now = Date.now(),
): HeatCapacityGuideWorkbenchRecordAttempt => {
  if (file.heatCapacityMode !== 'guide' || !file.heatCapacityGuideTrial) {
    return { accepted: false, reason: 'not-guide', kind, file };
  }
  const action: HeatCapacityGuideAction = kind === 'u0'
    ? 'recordU0'
    : kind === 'u1'
      ? 'recordU1'
      : 'recordU2';
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const context = getHeatCapacityGuideActionContext(currentFile, action);
  const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  if (!guard.allowed) {
    return {
      accepted: false,
      reason: guard.message,
      kind,
      file: mergeHeatCapacityGuideRuntimeState(
        currentFile,
        currentFile.heatCapacityGuidePhysicsState,
        workflow,
        now,
      ),
    };
  }
  const activeDisplay = selectActiveHeatCapacityWorkbenchDisplay(currentFile);
  const recordInput = {
    atS: currentFile.heatCapacityGuidePhysicsState.simulationTimeS,
    displayPressureMv: activeDisplay.pressureMv,
    displayTemperatureMv: activeDisplay.temperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'guide-zero',
  };
  const trial = kind === 'u0'
    ? recordGuideU0(currentFile.heatCapacityGuideTrial, recordInput)
    : kind === 'u1'
      ? recordGuideU1(currentFile.heatCapacityGuideTrial, recordInput)
      : recordGuideU2(currentFile.heatCapacityGuideTrial, recordInput, now, {
          atmosphericPressureKPa: currentFile.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa,
          pressureSensitivityMvPerKPa: currentFile.pressureSensitivityMvPerKPa,
        });
  return {
    accepted: true,
    reason: 'accepted',
    kind,
    file: mergeHeatCapacityGuideRuntimeState(
      {
        ...currentFile,
        heatCapacityGuideTrial: trial,
        recordedPressures: {
          ...currentFile.recordedPressures,
          ...(kind === 'u0' ? { p0: currentFile.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa } : {}),
          ...(kind === 'u1' ? { p1: activeDisplay.pressureMv } : {}),
          ...(kind === 'u2' ? { p2: activeDisplay.pressureMv } : {}),
        },
      },
      currentFile.heatCapacityGuidePhysicsState,
      workflow,
      now,
    ),
  };
};

export const stepHeatCapacityGuideWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const dtS = file.lastUpdateMs === null ? 0 : Math.max(0, (now - file.lastUpdateMs) / 1000);
  let guidePhysicsState = file.heatCapacityGuidePhysicsState;
  let guideWorkflow = file.heatCapacityGuideWorkflow;

  if (!guideWorkflow.paused && dtS > 0) {
    const isWaitingStep = guideWorkflow.step === 'u1Waiting' || guideWorkflow.step === 'u2Waiting';
    const speed = isWaitingStep ? guideWorkflow.speedMultiplier : 1;
    const targetWaitEndS = isWaitingStep && guideWorkflow.waitStartedAtS !== null
      ? guideWorkflow.waitStartedAtS + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S
      : null;
    const requestedDtS = dtS * speed;
    const boundedDtS = targetWaitEndS === null
      ? requestedDtS
      : Math.max(0, Math.min(requestedDtS, targetWaitEndS - guidePhysicsState.simulationTimeS));
    guidePhysicsState = stepGuidePhysicsState(
      guidePhysicsState,
      file.heatCapacityGuidePhysicsConfig,
      {
        dtS: boundedDtS,
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      },
    );
    const timer = deriveHeatCapacityGuideExperimentTimer(guideWorkflow, guidePhysicsState.simulationTimeS);
    if (timer.complete && (guideWorkflow.step === 'u1Waiting' || guideWorkflow.step === 'u2Waiting')) {
      guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
        action: 'timerComplete',
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
        displayPressureMv: file.pressureSignalMvDisplayed,
        simulationTimeS: guidePhysicsState.simulationTimeS,
      });
    }
  }

  let mergedFile = mergeHeatCapacityGuideRuntimeState(file, guidePhysicsState, guideWorkflow, now);
  if (
    mergedFile.heatCapacityGuideWorkflow.step === 'pumpRequired' &&
    (mergedFile.pressureSignalMv ?? Number.NEGATIVE_INFINITY) >= HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV
  ) {
    const pumpTargetWorkflow = transitionHeatCapacityGuideWorkflow(
      mergedFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(mergedFile, 'pressPumpBulb', {
        displayPressureMv: mergedFile.pressureSignalMv ?? mergedFile.pressureSignalTargetMv,
      }),
    );
    if (pumpTargetWorkflow.step !== mergedFile.heatCapacityGuideWorkflow.step) {
      mergedFile = mergeHeatCapacityGuideRuntimeState(
        {
          ...mergedFile,
          pumpHint: '已达到打气标准，请关闭打气阀门。',
        },
        mergedFile.heatCapacityGuidePhysicsState,
        pumpTargetWorkflow,
        now,
      );
    }
  }

  return {
    ...mergedFile,
    lastUpdateMs: now,
  };
};

export const stepHeatCapacityWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'free') {
    const scheme = file.heatCapacityFreeParameterScheme;
    const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
    const nextFile = stepHeatCapacityFreeWorkbenchFile(hydratedFile, now);
    return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, scheme);
  }
  if (file.heatCapacityMode === 'guide') {
    return stepHeatCapacityGuideWorkbenchFile(file, now);
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
        pressureSignalMv: truncateHeatCapacitySignalMv(overrides.pressureSignalMv),
        temperatureSignalMv: truncateHeatCapacitySignalMv(overrides.temperatureSignalMv),
      },
    },
  };
};

const captureHeatCapacityPhysicalKernelProcessSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const display = getFreeSensorDisplay(
    file.heatCapacityFreeSensorState,
    file.heatCapacityFreeCalibrationState,
    getEffectiveHeatCapacityFreeSensorConfig(
      file.heatCapacityFreeSensorConfig,
      file.heatCapacityFreeInstrumentNoiseEnabled,
    ),
  );
  const derived = deriveFreePhysicalState(file.heatCapacityFreePhysicsState, file.heatCapacityFreePhysicsConfig);
  const point: HeatCapacityProcessSamplePoint = {
    timeS: roundNumber(file.heatCapacityFreePhysicsState.simulationTimeS, 3),
    phase: file.heatCapacityPhase,
    temperatureSignalMv: roundNumber(truncateHeatCapacitySignalMv(display.displayTemperatureMv), 3),
    pressureSignalMv: roundNumber(truncateHeatCapacitySignalMv(display.displayPressureMv), 3),
    gasTemperatureK: roundNumber(file.heatCapacityFreePhysicsState.gasTemperatureK, 3),
    gasPressureKPaAbs: roundNumber(derived.gasPressureKPa, 3),
    pressureDeltaKPa: roundNumber(derived.pressureDeltaKPa, 3),
    pumpFrequency: roundNumber(file.pumpFrequency, 3),
    pumpValveOpen: file.pumpValveOpen,
    stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
  };
  return {
    ...file,
    heatCapacityProcessSamples: {
      ...file.heatCapacityProcessSamples,
      [key]: point,
    },
    updatedAt: now,
  };
};

export const captureHeatCapacityWorkbenchSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
  now = Date.now(),
  options: { applyProfile?: boolean } = {},
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    return captureHeatCapacityPhysicalKernelProcessSample(file, key, now);
  }
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

const createDefaultHeatCapacityFreeRollbackSnapshots = (): HeatCapacityFreeRollbackSnapshots => ({
  afterPowerOn: null,
  beforePump: null,
  beforeRelease: null,
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
    heatCapacityFreeGasType: parameterDraft.gasType,
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: null,
    heatCapacityFreeFileAcknowledgements: createDefaultHeatCapacityFreeFileAcknowledgements(),
    heatCapacityFreeParameterScheme: 'real' as const,
    heatCapacityFreeDisplayScheme: 'real' as const,
    heatCapacityFreeRecordConfig: recordConfig,
    heatCapacityFreePressureWarningMv: parameterState.pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: parameterState.instrumentNoiseEnabled,
    heatCapacityFreeEnvironmentConfig: { ...physicsConfig.environment },
    heatCapacityFreePhysicsConfig: physicsConfig,
    heatCapacityFreePhysicsState: createDefaultFreePhysicsState(physicsConfig, seed),
    heatCapacityFreeSensorConfig: sensorConfig,
    heatCapacityFreeSensorState: createDefaultFreeSensorState(seed, {
      pressureMv: pressureInitialBiasMv,
      pressureInitialBiasMv,
      temperatureMv: sensorConfig.temperatureMvAtAmbient,
    }),
    heatCapacityFreeCalibrationState: createDefaultHeatCapacityFreeCalibrationState(),
    heatCapacityFreeStopcockFlowOpen: false,
    heatCapacityFreeStopcockPendingOpenAtMs: null,
    heatCapacityFreeStopcockFlowPurpose: 'none' as const,
    heatCapacityFreeEquilibriumSpeedMultiplier: HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
    heatCapacityFreeEquilibriumSpeedHintShown: false,
    heatCapacityFreeRollbackSnapshots: createDefaultHeatCapacityFreeRollbackSnapshots(),
  };
};

const createHeatCapacityFreeIdealParameterState = (): HeatCapacityFreeParameterApplyResult => {
  const ideal = createHeatCapacityFreeIdealEffectiveConfigs('thermalEquilibrium');
  return {
    environmentConfig: { ...ideal.environment },
    physicsConfig: ideal.physics,
    sensorConfig: ideal.sensor,
    recordConfig: ideal.record,
    pressureWarningMv: ideal.pressureWarningMv,
    instrumentNoiseEnabled: ideal.instrumentNoiseEnabled,
    gasType: resolveHeatCapacityFreeGasTypeFromGamma(ideal.physics.gamma),
  };
};

export const createDefaultHeatCapacityFreeExperimentDomainState = (
  scheme: HeatCapacityFreeParameterScheme,
  seed: number | string = `${scheme}-free-runtime`,
): HeatCapacityFreeExperimentDomainState => {
  const parameterState = scheme === 'ideal'
    ? createHeatCapacityFreeIdealParameterState()
    : createDefaultHeatCapacityFreeParameterState();
  const fields = createDefaultHeatCapacityFreeRuntimeFields(seed, parameterState);
  return {
    scheme,
    experimentGroupStatus: fields.heatCapacityFreeExperimentGroupStatus,
    activeRunConfigSnapshot: fields.heatCapacityFreeActiveRunConfigSnapshot,
    recordConfig: fields.heatCapacityFreeRecordConfig,
    pressureWarningMv: fields.heatCapacityFreePressureWarningMv,
    instrumentNoiseEnabled: fields.heatCapacityFreeInstrumentNoiseEnabled,
    environmentConfig: fields.heatCapacityFreeEnvironmentConfig,
    physicsConfig: fields.heatCapacityFreePhysicsConfig,
    physicsState: fields.heatCapacityFreePhysicsState,
    sensorConfig: fields.heatCapacityFreeSensorConfig,
    sensorState: fields.heatCapacityFreeSensorState,
    calibrationState: fields.heatCapacityFreeCalibrationState,
    stopcockFlowOpen: fields.heatCapacityFreeStopcockFlowOpen,
    stopcockPendingOpenAtMs: fields.heatCapacityFreeStopcockPendingOpenAtMs,
    stopcockFlowPurpose: fields.heatCapacityFreeStopcockFlowPurpose,
    rollbackSnapshots: fields.heatCapacityFreeRollbackSnapshots,
    traceStore: createDefaultFreeTraceStore(),
    trials: [],
  };
};

const normalizeHeatCapacityFreeTrialParameterScheme = (
  value: unknown,
): HeatCapacityFreeTrialParameterScheme => (
  value === 'ideal' ? 'ideal' : 'real'
);

export const withHeatCapacityFreeTrialParameterScheme = (
  trial: HeatCapacityFreeTrial,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeTrial => {
  const standardReferenceSnapshot = trial.standardReferenceSnapshot &&
    !hasHeatCapacityFreeIdealThermalBoundaryContamination(trial.standardReferenceSnapshot.configSnapshot.physics)
    ? trial.standardReferenceSnapshot
    : null;
  if (trial.parameterScheme === scheme && trial.standardReferenceSnapshot === standardReferenceSnapshot) return trial;
  return {
    ...trial,
    parameterScheme: scheme,
    standardReferenceSnapshot,
  };
};

const withHeatCapacityFreeTrialsParameterScheme = (
  trials: HeatCapacityFreeTrial[],
  scheme: HeatCapacityFreeParameterScheme,
) => trials.map((trial) => withHeatCapacityFreeTrialParameterScheme(trial, scheme));

export const createHeatCapacityFreeExperimentDomainStateFromFile = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeExperimentDomainState => ({
  scheme,
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
  stopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen,
  stopcockPendingOpenAtMs: file.heatCapacityFreeStopcockPendingOpenAtMs,
  stopcockFlowPurpose: file.heatCapacityFreeStopcockFlowPurpose,
  rollbackSnapshots: file.heatCapacityFreeRollbackSnapshots,
  traceStore: file.heatCapacityFreeTraceStore,
  trials: withHeatCapacityFreeTrialsParameterScheme(file.heatCapacityFreeTrials, scheme),
});

export const selectHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeExperimentDomainState => (
  scheme === 'ideal'
    ? normalizeHeatCapacityFreeExperimentDomainBoundary(file.heatCapacityFreeIdealDomain, 'ideal', 'air')
    : normalizeHeatCapacityFreeExperimentDomainBoundary(
        file.heatCapacityFreeRealDomain,
        'real',
        file.heatCapacityFreeGasType,
      )
);

export const selectActiveHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => (
  selectHeatCapacityFreeDomain(file, file.heatCapacityFreeParameterScheme)
);

export const selectDisplayedHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => (
  selectHeatCapacityFreeDomain(file, file.heatCapacityFreeDisplayScheme)
);

export const getHeatCapacityFreeDisplayTheoreticalGamma = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeDisplayScheme = file.heatCapacityFreeDisplayScheme,
) => (
  scheme === 'ideal' ? getHeatCapacityFreeIdealTheoreticalGamma() : file.theoreticalGamma
);

export const getHeatCapacityFreeTrialsForAverage = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeTrial[] => (
  selectHeatCapacityFreeDomain(file, 'real').trials.filter((trial) => (
    normalizeHeatCapacityFreeTrialParameterScheme(trial.parameterScheme) === 'real'
  ))
);

const REAL_DOMAIN_IDEAL_THERMAL_CONTAMINATION_THRESHOLD_W_PER_K = 4;

export const hasHeatCapacityFreeIdealThermalBoundaryContamination = (
  physicsConfig: Partial<HeatCapacityFreePhysicsConfig> | null | undefined,
): boolean => {
  const normalizedPhysicsConfig = normalizeHeatCapacityFreePhysicsConfig(physicsConfig);
  return normalizedPhysicsConfig.thermal.gasWallConductanceWPerK >=
    REAL_DOMAIN_IDEAL_THERMAL_CONTAMINATION_THRESHOLD_W_PER_K &&
    normalizedPhysicsConfig.thermal.wallAmbientConductanceWPerK >=
    REAL_DOMAIN_IDEAL_THERMAL_CONTAMINATION_THRESHOLD_W_PER_K;
};

export const normalizeHeatCapacityFreeExperimentDomainBoundary = (
  domain: HeatCapacityFreeExperimentDomainState,
  scheme: HeatCapacityFreeParameterScheme,
  gasType: HeatCapacityFreeGasType,
): HeatCapacityFreeExperimentDomainState => {
  const physicsConfig = normalizeHeatCapacityFreePhysicsConfig(domain.physicsConfig);
  if (scheme === 'ideal') {
    return {
      ...domain,
      scheme: 'ideal',
      physicsConfig: {
        ...physicsConfig,
        gamma: getHeatCapacityFreeIdealTheoreticalGamma(),
      },
      trials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, 'ideal'),
    };
  }

  if (!hasHeatCapacityFreeIdealThermalBoundaryContamination(physicsConfig)) {
    return {
      ...domain,
      scheme: 'real',
      physicsConfig: {
        ...physicsConfig,
        gamma: getHeatCapacityFreeGasTypeGamma(gasType),
      },
      trials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, 'real'),
    };
  }

  const realDefaults = createDefaultHeatCapacityFreePhysicsConfig();
  const gasDefaults = getHeatCapacityFreeGasTypeModelDefaults(gasType);
  return {
    ...domain,
    scheme: 'real',
    physicsConfig: {
      ...physicsConfig,
      gamma: getHeatCapacityFreeGasTypeGamma(gasType),
      thermal: {
        ...realDefaults.thermal,
        gasWallConductanceWPerK: gasDefaults.gasWallConductanceWPerK,
      },
      pumpValveExchange: normalizeFreePumpValveExchangeConfig(realDefaults.pumpValveExchange),
      environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig(realDefaults.environmentDisturbance),
      leakage: {
        ...realDefaults.leakage,
        ratePerS: gasDefaults.leakageRatePerS,
      },
    },
    trials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, 'real'),
  };
};

const applyHeatCapacityFreeDomainToRuntimeFields = (
  file: WorkbenchHeatCapacityState,
  domain: HeatCapacityFreeExperimentDomainState,
): WorkbenchHeatCapacityState => {
  const parameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    domain.physicsConfig,
    domain.sensorConfig,
    domain.recordConfig,
    domain.pressureWarningMv,
    domain.instrumentNoiseEnabled,
  );
  const gasTypeGamma = getHeatCapacityFreeGasTypeGamma(parameterDraft.gasType);
  return {
    ...file,
    heatCapacityFreeExperimentGroupStatus: domain.experimentGroupStatus,
    heatCapacityFreeGasType: parameterDraft.gasType,
    heatCapacityFreeParameterDraft: parameterDraft,
    heatCapacityFreeActiveRunConfigSnapshot: domain.activeRunConfigSnapshot,
    heatCapacityFreeRecordConfig: domain.recordConfig,
    heatCapacityFreePressureWarningMv: domain.pressureWarningMv,
    heatCapacityFreeInstrumentNoiseEnabled: domain.instrumentNoiseEnabled,
    heatCapacityFreeEnvironmentConfig: domain.environmentConfig,
    heatCapacityFreePhysicsConfig: {
      ...domain.physicsConfig,
      gamma: gasTypeGamma,
    },
    heatCapacityFreePhysicsState: domain.physicsState,
    heatCapacityFreeSensorConfig: domain.sensorConfig,
    heatCapacityFreeSensorState: domain.sensorState,
    heatCapacityFreeCalibrationState: domain.calibrationState,
    heatCapacityFreeStopcockFlowOpen: domain.stopcockFlowOpen,
    heatCapacityFreeStopcockPendingOpenAtMs: domain.stopcockPendingOpenAtMs,
    heatCapacityFreeStopcockFlowPurpose: domain.stopcockFlowPurpose,
    heatCapacityFreeRollbackSnapshots: domain.rollbackSnapshots,
    heatCapacityFreeTraceStore: domain.traceStore,
    heatCapacityFreeTrials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, domain.scheme),
    theoreticalGamma: gasTypeGamma,
  };
};

export const storeHeatCapacityFreeRuntimeFieldsInDomain = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): WorkbenchHeatCapacityState => {
  const activeDomain = selectHeatCapacityFreeDomain(file, scheme);
  const shouldUseExistingDomain =
    scheme === 'real' &&
    hasHeatCapacityFreeIdealThermalBoundaryContamination(file.heatCapacityFreePhysicsConfig);
  const sourceFile = shouldUseExistingDomain
    ? applyHeatCapacityFreeDomainToRuntimeFields(file, activeDomain)
    : file;
  const domain = normalizeHeatCapacityFreeExperimentDomainBoundary(
    createHeatCapacityFreeExperimentDomainStateFromFile(sourceFile, scheme),
    scheme,
    sourceFile.heatCapacityFreeGasType,
  );
  const fileWithNormalizedRuntime = {
    ...sourceFile,
    heatCapacityFreeTrials: domain.trials,
  };
  return scheme === 'ideal'
    ? { ...fileWithNormalizedRuntime, heatCapacityFreeIdealDomain: domain }
    : { ...fileWithNormalizedRuntime, heatCapacityFreeRealDomain: domain };
};

export const setHeatCapacityFreeDisplaySchemeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeDisplayScheme,
  now = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeDisplayScheme: scheme,
  updatedAt: now,
});

export const isHeatCapacityFreeExperimentStarted = (
  file: WorkbenchHeatCapacityState,
): boolean => {
  const domain = selectActiveHeatCapacityFreeDomain(file);
  if (domain.experimentGroupStatus === 'completed' && !file.powerOn) {
    return false;
  }
  const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex({
    heatCapacityFreeTrials: domain.trials,
    powerOn: file.powerOn,
    heatCapacityFreeExperimentGroupStatus: domain.experimentGroupStatus,
  });
  const activeTrial = activeTrialIndex >= 0 ? domain.trials[activeTrialIndex] ?? null : null;
  return file.powerOn ||
    file.pumpValveOpen ||
    file.glassPistonState === 'open' ||
    file.pressureZeroed ||
    file.pumpBulbState !== 'idle' ||
    domain.experimentGroupStatus === 'running' ||
    domain.traceStore.activeTraceTrialId !== null ||
    (activeTrial !== null && hasHeatCapacityFreeTrialProgress(activeTrial)) ||
    domain.physicsState.pumpStrokeCount > 0;
};

export const setHeatCapacityFreeParameterSchemeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  if (isHeatCapacityFreeExperimentStarted(file)) return file;
  const storedCurrent = storeHeatCapacityFreeRuntimeFieldsInDomain(file, file.heatCapacityFreeParameterScheme);
  const nextDomain = selectHeatCapacityFreeDomain(storedCurrent, scheme);
  return {
    ...applyHeatCapacityFreeDomainToRuntimeFields(storedCurrent, nextDomain),
    heatCapacityFreeParameterScheme: scheme,
    heatCapacityFreeDisplayScheme: scheme,
    updatedAt: now,
  };
};

const loadActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const synchronizedFile = storeHeatCapacityFreeRuntimeFieldsInDomain(
    file,
    file.heatCapacityFreeParameterScheme,
  );
  return applyHeatCapacityFreeDomainToRuntimeFields(
    synchronizedFile,
    selectActiveHeatCapacityFreeDomain(synchronizedFile),
  );
};

const storeActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free'
    ? storeHeatCapacityFreeRuntimeFieldsInDomain(file, scheme)
    : file
);

const createDefaultHeatCapacityGuideRuntimeFields = () => {
  const heatCapacityGuidePhysicsConfig = createDefaultGuidePhysicsConfig();
  return {
    heatCapacityGuidePhysicsConfig,
    heatCapacityGuidePhysicsState: createDefaultGuidePhysicsState(heatCapacityGuidePhysicsConfig),
    heatCapacityGuideWorkflow: createDefaultHeatCapacityGuideWorkflow(),
    heatCapacityGuideTrial: null,
  };
};

export const createDefaultHeatCapacityFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchHeatCapacityState => {
  const runtime = createDefaultHeatCapacityRuntimeState();
  const gaugePressureState = getHeatCapacityGaugePressureState(runtime.pressureDeltaKPa, false);
  const freeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(`free-runtime-${index}`);
  const heatCapacityFreeRealDomain = createDefaultHeatCapacityFreeExperimentDomainState('real', `free-runtime-${index}`);
  const heatCapacityFreeIdealDomain = createDefaultHeatCapacityFreeExperimentDomainState('ideal', `free-ideal-runtime-${index}`);
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  return {
    ...createBaseFile('heatCapacity', index, DEFAULT_HEAT_CAPACITY_PARAMS, {
      ...defaults,
      liveWorkspaceSplitRatio: defaults?.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
    }),
    kind: 'heatCapacity',
    particles: [],
    heatCapacityMode: 'free',
    heatCapacityTeachingStatus: 'idle',
    heatCapacityLessonIntroAutoShown: false,
    ...freeRuntimeFields,
    heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeTraceStore: createDefaultFreeTraceStore(),
    heatCapacityFreeTrials: [],
    ...guideRuntimeFields,
    selectedHeatCapacityPanel: 'preview',
    openHeatCapacityTabs: [],
    activeHeatCapacityTabId: null,
    heatCapacityMaterialsExpanded: true,
    heatCapacityTabContainerHeight: 0.5,
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
    pressureSignalRawReadoutMv: roundNumber(runtime.pressureSignalMvRaw, 2),
    pressureSignalReadoutMv: roundNumber(runtime.pressureSignalMvDisplayed, 2),
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
    hardSphereViewEnabled: HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED,
    vesselPressureReadoutKPa: roundNumber(runtime.gasPressureKPaAbs, 2),
    vesselTemperatureReadoutK: roundNumber(runtime.gasTemperatureK, 3),
    recordedPressures: {
      p0: runtime.modelConfig.ambientPressureKPa,
      p1: null,
      p2: null,
    },
    visualizationMode: runtime.modelConfig.visualizationMode,
    calculationModel: runtime.modelConfig.calculationModel,
    pressureSensitivityMvPerKPa: runtime.modelConfig.sensor.pressureSensitivityMvPerKPa,
    heatCapacityProcessSamples: runtime.heatCapacityProcessSamples,
    theoreticalGamma: getHeatCapacityFreeGasTypeGamma(freeRuntimeFields.heatCapacityFreeGasType),
  };
};

export const startHeatCapacityGuideWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  const guideConfig = guideRuntimeFields.heatCapacityGuidePhysicsConfig;
  const pressureInitialBiasMv = createHeatCapacityGuidePressureInitialBiasMv(`guide-${file.id}-${now}`);
  return {
    ...file,
    ...guideRuntimeFields,
    heatCapacityMode: 'guide',
    heatCapacityTeachingStatus: 'running',
    heatCapacityGuideTrial: createHeatCapacityGuideTrial('guide-trial-1'),
    powerOn: false,
    runState: 'idle',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    gasPressureKPaAbs: guideConfig.environment.ambientPressureKPa,
    gasTemperatureK: guideConfig.environment.ambientTemperatureK,
    pressureDeltaKPa: 0,
    simulationTimeS: 0,
    lastUpdateMs: null,
    pressureSignalMvRaw: 0,
    pressureSignalMvDisplayed: pressureInitialBiasMv,
    pressureInitialBiasMv,
    pressureSignalTargetMv: pressureInitialBiasMv,
    temperatureSignalTargetMv: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
    displayResponseLastUpdateMs: null,
    pressureZeroDisplayedSamples: [],
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureSignalRawReadoutMv: 0,
    pressureSignalReadoutMv: pressureInitialBiasMv,
    pressureReleaseBurstUntilMs: null,
    pressureSafetyStatus: 'normal',
    pressureSafetyMessage: null,
    pressureBlockedPumping: false,
    pressureOverLimit: false,
    temperatureSignalMv: null,
    pressureSignalMv: null,
    pressureKPa: null,
    pressureLimitKPa: guideConfig.pumpPressureLimitKPa,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '未打气',
    recordedPressures: { p0: guideConfig.environment.ambientPressureKPa, p1: null, p2: null },
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityProcessSamples: {},
    theoreticalGamma: guideConfig.gamma,
    updatedAt: now,
  };
};

export const resetHeatCapacityGuideWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => startHeatCapacityGuideWorkbenchState(file, now);

export const abortHeatCapacityGuideWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const resetGuideFile = {
    ...file,
    ...createDefaultHeatCapacityGuideRuntimeFields(),
  };
  return resetHeatCapacityFreeRunWorkbenchState(resetGuideFile, now);
};

export const enterHeatCapacityFreeModeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const resetFile = resetHeatCapacityFreeRunWorkbenchState(file, now);
  return recordHeatCapacityFreeTraceEvent(resetFile, 'enter-free-mode', now);
};

const resetHeatCapacityFreeRunWorkbenchStateCore = (
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
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  const resetStructure = resolveHeatCapacityFreeResetStructure(file);
  const resetFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...file,
      ...freeRuntimeFields,
      ...guideRuntimeFields,
      heatCapacityFreeTraceStore: resetStructure.heatCapacityFreeTraceStore,
      heatCapacityFreeFileAcknowledgements: file.heatCapacityFreeFileAcknowledgements,
      heatCapacityMode: 'free',
      heatCapacityTeachingStatus: 'idle',
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
    heatCapacityFreeStopcockFlowPurpose: 'none',
    heatCapacityFreeTraceStore: resetStructure.heatCapacityFreeTraceStore,
    heatCapacityFreeTrials: resetStructure.heatCapacityFreeTrials,
    heatCapacityProcessSamples: {},
    updatedAt: now,
  };
};

export const resetHeatCapacityFreeRunWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return resetHeatCapacityFreeRunWorkbenchStateCore(file, now);
  }
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const nextFile = resetHeatCapacityFreeRunWorkbenchStateCore(hydratedFile, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields(
    {
      ...nextFile,
      heatCapacityFreeParameterScheme: scheme,
      heatCapacityFreeDisplayScheme: scheme,
    },
    scheme,
  );
};

export const prepareHeatCapacityFreeExperimentGroupForUserOperation = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => (
  isHeatCapacityFreeExperimentGroupComplete(file)
    ? resetHeatCapacityFreeRunWorkbenchState(file, now)
    : file
);

export const selectActiveHeatCapacityWorkbenchDisplay = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityDisplaySource => {
  const usesPhysicalKernel = isHeatCapacityPhysicalKernelMode(file.heatCapacityMode);
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
        ? truncateHeatCapacitySignalMv(file.pressureSignalMv ?? 0)
        : truncateHeatCapacitySignalMv(file.pressureSignalMvDisplayed),
      temperatureMv: Number.isFinite(file.temperatureSignalMv)
        ? truncateHeatCapacitySignalMv(file.temperatureSignalMv ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient)
        : truncateHeatCapacitySignalMv(file.temperatureSignalTargetMv),
    },
    {
      source: 'free',
      pressureMv: usesPhysicalKernel
        ? truncateHeatCapacitySignalMv(freeDisplay.displayPressureMv)
        : Number.isFinite(file.pressureSignalMv)
        ? truncateHeatCapacitySignalMv(file.pressureSignalMv ?? freeDisplay.displayPressureMv)
        : truncateHeatCapacitySignalMv(freeDisplay.displayPressureMv),
      temperatureMv: usesPhysicalKernel
        ? truncateHeatCapacitySignalMv(freeDisplay.displayTemperatureMv)
        : Number.isFinite(file.temperatureSignalMv)
        ? truncateHeatCapacitySignalMv(file.temperatureSignalMv ?? freeDisplay.displayTemperatureMv)
        : truncateHeatCapacitySignalMv(freeDisplay.displayTemperatureMv),
    },
    {
      source: 'guide',
      pressureMv: Number.isFinite(file.pressureSignalMv)
        ? truncateHeatCapacitySignalMv(file.pressureSignalMv ?? 0)
        : truncateHeatCapacitySignalMv(file.pressureSignalMvDisplayed),
      temperatureMv: Number.isFinite(file.temperatureSignalMv)
        ? truncateHeatCapacitySignalMv(file.temperatureSignalMv ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient)
        : truncateHeatCapacitySignalMv(file.temperatureSignalTargetMv),
    },
  );
};

export type HeatCapacityFreeWorkbenchRecordKind = 'u0' | 'u1' | 'u2';

export const getHeatCapacityFreeRecordBlockReason = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
): HeatCapacityFreeRecordRejectReason | null => {
  const activeTrial = getActiveHeatCapacityFreeTrial(file);
  const releaseHasStarted = hasHeatCapacityFreeReleaseStarted(file);
  const workflowStage = deriveHeatCapacityFreeWorkflowStage(file);

  if (kind === 'u0') {
    if (!file.powerOn) return 'zero-not-ready';
    if (workflowStage !== 'zeroing') return 'invalid-sequence';
    if (
      getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open' ||
      !file.heatCapacityFreeStopcockFlowOpen
    ) {
      return 'zero-not-ready';
    }
    return null;
  }

  if (kind === 'u1') {
    if (!activeTrial?.u0) return 'missing-u0';
    if (workflowStage !== 'waitingU1' && workflowStage !== 'beforeRelease') return 'invalid-sequence';
    if (file.pumpValveOpen) return 'invalid-sequence';
    if (releaseHasStarted) return 'invalid-sequence';
    return null;
  }

  if (!activeTrial?.u0) return 'missing-u0';
  if (!activeTrial.u1) return 'invalid-sequence';
  if (!releaseHasStarted) return 'release-not-started';
  if (workflowStage !== 'waitingU2' && workflowStage !== 'beforePowerOff') return 'invalid-sequence';
  return null;
};

export const getHeatCapacityFreeRecordButtonState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
): HeatCapacityFreeRecordButtonState => {
  const activeTrial = getActiveHeatCapacityFreeTrial(file);
  const disabledReason = getHeatCapacityFreeRecordBlockReason(file, kind);
  const currentRecord = kind === 'u0'
    ? activeTrial?.u0
    : kind === 'u1'
      ? activeTrial?.u1
      : activeTrial?.u2;
  return {
    visible: disabledReason === null,
    mode: currentRecord ? 'rerecord' : 'record',
    disabledReason,
  };
};

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

export interface HeatCapacityFreeWorkbenchRecordOptions {
  enforceRecordReadiness?: boolean;
}

const applyHeatCapacityFreeRecordWorkbenchStateCore = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
  now = Date.now(),
  options: HeatCapacityFreeWorkbenchRecordOptions = {},
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
  const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex(sourceFile);
  const activeTrial = activeTrialIndex >= 0
    ? sourceFile.heatCapacityFreeTrials[activeTrialIndex] ?? null
    : null;
  const releaseHasStarted = sourceFile.heatCapacityFreePhysicsState.releaseStarted ||
    sourceFile.heatCapacityFreePhysicsState.releaseReference !== null;
  const recordBlockReason = getHeatCapacityFreeRecordBlockReason(sourceFile, kind);
  const workflowStage = deriveHeatCapacityFreeWorkflowStage(sourceFile);
  const useLastTrial = recordBlockReason === null &&
    activeTrial !== null &&
    (
      (kind === 'u0' && workflowStage === 'zeroing') ||
      (kind === 'u1' && activeTrial.u0 !== null && !releaseHasStarted) ||
      (kind === 'u2' && activeTrial.u1 !== null && releaseHasStarted)
    );
  const trialIndex = useLastTrial
    ? activeTrialIndex
    : sourceFile.heatCapacityFreeTrials.length;
  const trialBase = useLastTrial
    ? activeTrial
    : createHeatCapacityFreeTrial(`free-trial-${sourceFile.heatCapacityFreeTrials.length + 1}`, sourceFile.heatCapacityFreeCalibrationState.automaticU0);
  const trial = !trialBase.u0 && sourceFile.heatCapacityFreeCalibrationState.automaticU0
    ? {
        ...trialBase,
        automaticU0: sourceFile.heatCapacityFreeCalibrationState.automaticU0,
      }
    : trialBase;
  const looseFreeU0BlockedReason: HeatCapacityFreeRecordRejectReason | null = (
    options.enforceRecordReadiness !== true &&
    kind === 'u0' &&
    (
      !sourceFile.powerOn ||
      getHeatCapacityStopcockState(sourceFile.stopcockAngleDeg) !== 'open' ||
      !sourceFile.heatCapacityFreeStopcockFlowOpen
    )
  )
    ? 'zero-not-ready'
    : null;
  const evaluation: HeatCapacityFreeRecordEvaluation = recordBlockReason === null &&
    options.enforceRecordReadiness === true
    ? kind === 'u0'
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
          )
    : { ready: true, reason: 'ready' as const };
  const resolvedEvaluation: HeatCapacityFreeRecordEvaluation = recordBlockReason !== null
    ? { ready: false, reason: recordBlockReason }
    : looseFreeU0BlockedReason === null
      ? evaluation
      : { ready: false, reason: looseFreeU0BlockedReason };

  if (resolvedEvaluation.ready === false) {
    const reason = resolvedEvaluation.reason;
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

  const latestZeroEventId = sourceFile.heatCapacityFreeCalibrationState.zeroEvents[
    sourceFile.heatCapacityFreeCalibrationState.zeroEvents.length - 1
  ]?.id ?? (
    options.enforceRecordReadiness === true
      ? ''
      : `free-unzeroed-${sourceFile.heatCapacityFreeCalibrationState.calibrationVersion}`
  );
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
  const acceptedFile: WorkbenchHeatCapacityState = {
    ...recordTrace.file,
    heatCapacityFreeExperimentGroupStatus: kind === 'u2'
      ? 'completed'
      : recordTrace.file.heatCapacityFreeExperimentGroupStatus,
    heatCapacityFreeTrials,
    updatedAt: now,
  };
  const fileWithRollbackSnapshot = kind === 'u1'
    ? {
        ...acceptedFile,
        heatCapacityFreeRollbackSnapshots: {
          ...acceptedFile.heatCapacityFreeRollbackSnapshots,
          beforeRelease: captureHeatCapacityFreeRollbackSnapshot(acceptedFile),
        },
      }
    : acceptedFile;

  return {
    accepted: true,
    reason: 'accepted',
    kind,
    trialIndex,
    file: fileWithRollbackSnapshot,
  };
};

export const applyHeatCapacityFreeRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityFreeWorkbenchRecordKind,
  now = Date.now(),
  options: HeatCapacityFreeWorkbenchRecordOptions = {},
): HeatCapacityFreeWorkbenchRecordAttempt => {
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const attempt = applyHeatCapacityFreeRecordWorkbenchStateCore(hydratedFile, kind, now, options);
  return {
    ...attempt,
    file: storeActiveHeatCapacityFreeDomainRuntimeFields(attempt.file, scheme),
  };
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
