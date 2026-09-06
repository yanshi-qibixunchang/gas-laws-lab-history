import {
  HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  createClosedHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  createHeatCapacityAutoDemoProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  createSeededFreePressureInitialBiasMv,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  createHeatCapacityGuideTrial,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  transitionHeatCapacityGuideWorkflow,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import {
  createDefaultHeatCapacityGuideRuntimeFields,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureZeroDisplayText,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  stepHeatCapacityGuideWorkbenchFile,
} from './workbenchHeatCapacityGuideRuntimeCoordinator.ts';
import {
  getHeatCapacityGuideActionContext,
  mergeHeatCapacityGuideRuntimeState,
} from './workbenchHeatCapacityGuideRuntimeState.ts';
import {
  powerHeatCapacityWorkbenchFile,
} from './workbenchHeatCapacityRuntimeCoordinator.ts';
import {
  resetHeatCapacityFreeRunWorkbenchState,
} from './workbenchHeatCapacityFreeRunReset.ts';
import {
  recordHeatCapacityFreeTraceEvent,
} from './workbenchHeatCapacityFreeTraceState.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const createHeatCapacityGuidePressureInitialBiasMv = (
  seed: number | string,
) => createSeededFreePressureInitialBiasMv(seed, HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV);

export const prepareHeatCapacityAutoDemoReset = (
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
    heatCapacityReleaseState: createClosedHeatCapacityReleaseState(),
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

  return resetFile;
};

export const prepareHeatCapacityAutoDemoStart = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
  createInitialBiasMv = () => HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
): WorkbenchHeatCapacityState => {
  const resetFile = prepareHeatCapacityAutoDemoReset(file, now, createInitialBiasMv);
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

export const isHeatCapacityFreePreheatRequired = (
  file: Pick<
    WorkbenchHeatCapacityState,
    'heatCapacityMode' | 'powerOn' | 'heatCapacityFreePreheatCompleted' | 'heatCapacityFreeRunWorkspace'
  >,
) => (
  file.heatCapacityMode === 'free' &&
  file.powerOn &&
  !file.heatCapacityFreePreheatCompleted &&
  file.heatCapacityFreeRunWorkspace.activeAttempt?.preheatOutcome !== 'omitted'
);

export const completeHeatCapacityFreePreheatWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free' && file.powerOn && !file.heatCapacityFreePreheatCompleted
    ? {
        ...file,
        heatCapacityFreePreheatCompleted: true,
        updatedAt: now,
        lastOpenedAt: now,
      }
    : file
);

export const completeHeatCapacityGuidePreheatWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide' || file.heatCapacityGuideWorkflow.step !== 'preheatRequired') {
    return file;
  }
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const context = getHeatCapacityGuideActionContext(currentFile, 'preheatComplete');
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  return mergeHeatCapacityGuideRuntimeState(
    currentFile,
    currentFile.heatCapacityGuidePhysicsState,
    workflow,
    now,
  );
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
    ambientPressureKPa: guideConfig.environment.ambientPressureKPa,
    ambientTemperatureK: guideConfig.environment.ambientTemperatureK,
    gasPressureKPaAbs: guideConfig.environment.ambientPressureKPa,
    gasTemperatureK: guideConfig.environment.ambientTemperatureK,
    sensorTemperatureK: guideConfig.environment.ambientTemperatureK,
    pressureDeltaKPa: 0,
    simulationTimeS: 0,
    heatCapacityReleaseState: createClosedHeatCapacityReleaseState(),
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
    vesselPressureReadoutKPa: roundNumber(guideConfig.environment.ambientPressureKPa, 2),
    vesselTemperatureReadoutK: roundNumber(guideConfig.environment.ambientTemperatureK, 3),
    recordedPressures: { p0: guideConfig.environment.ambientPressureKPa, p1: null, p2: null },
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityProcessSamples: {},
    theoreticalGamma: guideConfig.gamma,
    updatedAt: now,
  };
};

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
