import type { Particle } from '../../shared/types.ts';
import type {
  HeatCapacityProcessSamples,
  HeatCapacityRuntimePhase,
} from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import type { HeatCapacityTeachingProfile } from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import type {
  HeatCapacityFreeEnvironmentConfig,
  HeatCapacityFreePhysicsConfig,
  HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeSensorConfig,
  HeatCapacityFreeSensorState,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import type { HeatCapacityTemperatureSensorState } from '../../domain/heatCapacity/heatCapacityTemperatureSensorModel.ts';
import type { HeatCapacityFreeCalibrationState } from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import type { HeatCapacityFreeTrial } from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import type { HeatCapacityCalculationWorkflowSession } from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import type { HeatCapacityFreeBatchState } from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import type { HeatCapacityFreeExperimentGroupCollection } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import type {
  HeatCapacityFreeAttempt,
  HeatCapacityFreeWaitSpeedMultiplier,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import type { HeatCapacityFreeRecordConfig } from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeTraceStore,
  HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityFreeExperimentGroupStatus,
  HeatCapacityFreeGasType,
  HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type { HeatCapacityReleaseState } from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import type {
  HeatCapacityGuidePhysicsConfig,
  HeatCapacityGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import type { HeatCapacityGuideWorkflowState } from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import type { HeatCapacityGuideTrial } from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import type { HeatCapacityModeSessionStore } from './workbenchHeatCapacityModeSession.ts';
import type {
  WorkbenchFileBase,
  WorkbenchHeatCapacityTabId,
  WorkbenchRunState,
} from './workbenchFileState.ts';

export type { HeatCapacityMode };

export type WorkbenchHeatCapacityStopcockState = 'closed' | 'open';
export type WorkbenchHeatCapacityPumpValveState = 'closed' | 'open';
export type WorkbenchHeatCapacityPumpBulbState = 'idle' | 'compressing' | 'releasing';
export type WorkbenchHeatCapacityPumpFrequencyStatus = 'idle' | 'tooSlow' | 'suitable';
export type WorkbenchHeatCapacityPressureZeroAdjustMode = 'none' | 'fineWheel' | 'coarseDrag';
export type WorkbenchHeatCapacityPressureSafetyStatus = 'normal' | 'warning' | 'danger';
export type WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier = HeatCapacityFreeWaitSpeedMultiplier;
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

export interface HeatCapacityPressureZeroDisplayedSample {
  atMs: number;
  valueMv: number;
}

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
  heatCapacityReleaseState: HeatCapacityReleaseState;
}

export interface HeatCapacityFreeRollbackSnapshots {
  afterPowerOn: HeatCapacityFreeRollbackSnapshot | null;
  beforePump: HeatCapacityFreeRollbackSnapshot | null;
  beforeRelease: HeatCapacityFreeRollbackSnapshot | null;
}

export type HeatCapacityFreeFileNoticeKey =
  | 'advancedParametersRisk'
  | 'idealParameterProfileIntro';

export interface HeatCapacityFreeFileAcknowledgements {
  advancedParametersRisk: boolean;
  idealParameterProfileIntro: boolean;
}

export type HeatCapacityFreeParameterScheme = 'real' | 'ideal';
export type HeatCapacityFreeDisplayScheme = HeatCapacityFreeParameterScheme;

export interface HeatCapacityFreeExperimentDomainState {
  scheme: HeatCapacityFreeParameterScheme;
  gasType: HeatCapacityFreeGasType;
  batch: HeatCapacityFreeBatchState;
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
  releaseState: HeatCapacityReleaseState;
  rollbackSnapshots: HeatCapacityFreeRollbackSnapshots;
  traceStore: HeatCapacityFreeTraceStore;
  trials: HeatCapacityFreeTrial[];
  activeAttempt: HeatCapacityFreeAttempt | null;
}

export interface WorkbenchHeatCapacityState extends WorkbenchFileBase {
  kind: 'heatCapacity';
  particles: Particle[];
  /** `null` is the non-recording Explore base state. */
  heatCapacityMode: HeatCapacityMode | null;
  heatCapacityModeSessions: HeatCapacityModeSessionStore;
  heatCapacityTeachingStatus: HeatCapacityTeachingStatus;
  heatCapacityLessonIntroAutoShown: boolean;
  heatCapacityFreePreheatCompleted: boolean;
  heatCapacityFreeRuntimeVersion: number;
  /** Current instrument-site projection; experiment-group history is authoritative. */
  heatCapacityFreeBatch: HeatCapacityFreeBatchState;
  heatCapacityFreeExperimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  heatCapacityFreeGasType: HeatCapacityFreeGasType;
  heatCapacityFreeParameterDraft: HeatCapacityFreeParameterDraft;
  heatCapacityFreeActiveRunConfigSnapshot: HeatCapacityFreeTraceTrial['configSnapshot'] | null;
  heatCapacityFreeFileAcknowledgements: HeatCapacityFreeFileAcknowledgements;
  heatCapacityFreeParameterScheme: HeatCapacityFreeParameterScheme;
  heatCapacityFreeDisplayScheme: HeatCapacityFreeDisplayScheme;
  /** Sole authority for Free experiment-group history, progress, calculation, and results. */
  heatCapacityFreeExperimentGroups: HeatCapacityFreeExperimentGroupCollection;
  /** Parameter/instrument domains; group-bound batch, trial, and trace members are mirrors. */
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
  heatCapacityReleaseState: HeatCapacityReleaseState;
  heatCapacityFreeEquilibriumSpeedMultiplier: WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier;
  heatCapacityFreeRollbackSnapshots: HeatCapacityFreeRollbackSnapshots;
  heatCapacityFreeTraceVersion: number;
  /** Current instrument-site projections rebuilt from the current experiment group. */
  heatCapacityFreeTraceStore: HeatCapacityFreeTraceStore;
  heatCapacityFreeTrials: HeatCapacityFreeTrial[];
  heatCapacityFreeActiveAttempt: HeatCapacityFreeAttempt | null;
  heatCapacityGuidePhysicsConfig: HeatCapacityGuidePhysicsConfig;
  heatCapacityGuidePhysicsState: HeatCapacityGuidePhysicsState;
  heatCapacityGuideTemperatureSensorState: HeatCapacityTemperatureSensorState;
  heatCapacityGuideWorkflow: HeatCapacityGuideWorkflowState;
  heatCapacityGuideTrial: HeatCapacityGuideTrial | null;
  heatCapacityGuideCalculationSession: HeatCapacityCalculationWorkflowSession | null;
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
  sensorTemperatureK: number;
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
