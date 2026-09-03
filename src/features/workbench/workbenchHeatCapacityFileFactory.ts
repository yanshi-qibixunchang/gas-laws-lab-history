import {
  createDefaultHeatCapacityRuntimeState,
} from '../../domain/heatCapacity/heatCapacityTeachingRuntimeModel.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createDefaultHeatCapacityModeSessionStore,
} from './workbenchHeatCapacityModeSession.ts';
import {
  DEFAULT_HEAT_CAPACITY_PARAMS,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  createWorkbenchBaseFile,
  type WorkbenchFileLayoutDefaults,
} from './workbenchFileState.ts';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  getHeatCapacityGaugePressureState,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  createDefaultHeatCapacityFreeExperimentDomainState,
  createDefaultHeatCapacityFreeRuntimeFields,
  createDefaultHeatCapacityGuideRuntimeFields,
  normalizeHeatCapacityFreeFileAcknowledgements,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import type {
  HeatCapacityFreeFileNoticeKey,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED = false;

const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

export const normalizeHeatCapacityFileName = (name: string) => {
  const match = /^(?:Hard-Sphere Heat Capacity Ratio|Heat Capacity Ratio) - (\d{3})$/.exec(name);
  return match ? `Adiabatic Expansion - ${match[1]}` : name;
};

export const createDefaultHeatCapacityFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchHeatCapacityState => {
  const runtime = createDefaultHeatCapacityRuntimeState();
  const gaugePressureState = getHeatCapacityGaugePressureState(runtime.pressureDeltaKPa, false);
  const freeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(`free-runtime-${index}`);
  const heatCapacityFreeRealDomain = createDefaultHeatCapacityFreeExperimentDomainState('real', `free-runtime-${index}`);
  // Both parameter schemes are views of the same physical instrument file, so
  // they share one deterministic sensor zero bias.
  const heatCapacityFreeIdealDomain = createDefaultHeatCapacityFreeExperimentDomainState('ideal', `free-runtime-${index}`);
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  return {
    ...createWorkbenchBaseFile('heatCapacity', index, DEFAULT_HEAT_CAPACITY_PARAMS, {
      ...defaults,
      liveWorkspaceSplitRatio: defaults?.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
    }),
    kind: 'heatCapacity',
    particles: [],
    heatCapacityMode: 'free',
    heatCapacityModeSessions: createDefaultHeatCapacityModeSessionStore(),
    heatCapacityTeachingStatus: 'idle',
    heatCapacityLessonIntroAutoShown: false,
    heatCapacityFreePreheatCompleted: false,
    ...freeRuntimeFields,
    heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    ...guideRuntimeFields,
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
    sensorTemperatureK: runtime.sensorTemperatureK,
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
    theoreticalGamma: freeRuntimeFields.heatCapacityFreeInstrumentConfig.physics.gamma,
  };
};

