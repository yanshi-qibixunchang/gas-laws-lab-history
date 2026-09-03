import {
  deriveFreePhysicalState,
  type HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  getEffectiveHeatCapacityFreeSensorConfig,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityRuntimePhase,
} from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  isHeatCapacityMainReleaseFlowOpen,
  isHeatCapacityReleaseFlowOpen,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  getFreeSensorDisplay,
  type HeatCapacityFreeSensorState,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import type {
  HeatCapacityFreeCalibrationState,
} from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
  getHeatCapacityGaugePressureState,
  isHeatCapacityPressureZeroWithinTolerance,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  normalizeHeatCapacityFreeSensorConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const getHeatCapacityFreeRuntimePhase = (
  file: WorkbenchHeatCapacityState,
  physicsState: HeatCapacityFreePhysicsState,
): HeatCapacityRuntimePhase => {
  const stopcockFlowOpen = isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState);
  if (isHeatCapacityMainReleaseFlowOpen(file.heatCapacityReleaseState)) return 'releasing';
  if (!stopcockFlowOpen && physicsState.releaseStarted) return 'recovering';
  if (physicsState.pumpStrokeCount > 0 && file.pumpValveOpen) return 'pumping';
  if (physicsState.pumpStrokeCount > 0) return 'sealedStabilizing';
  if (stopcockFlowOpen && file.pressureZeroed) return 'zeroed';
  if (stopcockFlowOpen) return 'readyToZero';
  return 'readyToPump';
};

type HeatCapacityValveTimingPhysicsState = Pick<
  HeatCapacityFreePhysicsState,
  | 'simulationTimeS'
  | 'lastPumpValveOpenedAtS'
  | 'lastPumpValveClosedAtS'
  | 'currentPumpValveOpenDurationS'
  | 'lastStopcockOpenedAtS'
  | 'lastStopcockClosedAtS'
  | 'currentStopcockOpenDurationS'
>;

const isHeatCapacityPhysicsValveTimingOpen = (
  openedAtS: number | null,
  closedAtS: number | null,
) => openedAtS !== null && (closedAtS === null || openedAtS >= closedAtS);

export const synchronizeHeatCapacityPhysicsControlTiming = <
  State extends HeatCapacityValveTimingPhysicsState,
>(
  state: State,
  pumpValveOpen: boolean,
  stopcockFlowOpen: boolean,
): State => {
  const pumpTimingOpen = isHeatCapacityPhysicsValveTimingOpen(
    state.lastPumpValveOpenedAtS,
    state.lastPumpValveClosedAtS,
  );
  const stopcockTimingOpen = isHeatCapacityPhysicsValveTimingOpen(
    state.lastStopcockOpenedAtS,
    state.lastStopcockClosedAtS,
  );
  return {
    ...state,
    lastPumpValveOpenedAtS: pumpValveOpen && !pumpTimingOpen
      ? state.simulationTimeS
      : state.lastPumpValveOpenedAtS,
    lastPumpValveClosedAtS: pumpValveOpen
      ? null
      : pumpTimingOpen
        ? state.simulationTimeS
        : state.lastPumpValveClosedAtS,
    currentPumpValveOpenDurationS: pumpValveOpen
      ? pumpTimingOpen
        ? state.currentPumpValveOpenDurationS
        : 0
      : 0,
    lastStopcockOpenedAtS: stopcockFlowOpen && !stopcockTimingOpen
      ? state.simulationTimeS
      : state.lastStopcockOpenedAtS,
    lastStopcockClosedAtS: stopcockFlowOpen
      ? null
      : stopcockTimingOpen
        ? state.simulationTimeS
        : state.lastStopcockClosedAtS,
    currentStopcockOpenDurationS: stopcockFlowOpen
      ? stopcockTimingOpen
        ? state.currentStopcockOpenDurationS
        : 0
      : 0,
  };
};

export const mergeHeatCapacityFreeRuntimeState = (
  file: WorkbenchHeatCapacityState,
  physicsState: HeatCapacityFreePhysicsState,
  sensorState: HeatCapacityFreeSensorState,
  calibrationState: HeatCapacityFreeCalibrationState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  physicsState = synchronizeHeatCapacityPhysicsControlTiming(
    physicsState,
    file.pumpValveOpen,
    isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState),
  );
  const derived = deriveFreePhysicalState(
    physicsState,
    file.heatCapacityFreeInstrumentConfig.physics,
  );
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig(
    file.heatCapacityFreeInstrumentConfig.sensor,
  );
  const effectiveSensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    sensorConfig,
    file.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
  );
  const display = getFreeSensorDisplay(
    sensorState,
    calibrationState,
    effectiveSensorConfig,
  );
  const powerOn = file.powerOn;
  const pressureSignalMv = powerOn
    ? truncateHeatCapacitySignalMv(display.displayPressureMv)
    : null;
  const temperatureSignalMv = powerOn
    ? truncateHeatCapacitySignalMv(display.displayTemperatureMv)
    : null;
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
    heatCapacityFreeInstrumentConfig: {
      ...file.heatCapacityFreeInstrumentConfig,
      sensor: sensorConfig,
    },
    heatCapacityFreeInstrumentState: {
      physics: physicsState,
      sensor: sensorState,
      calibration: calibrationState,
    },
    ambientPressureKPa: file.heatCapacityFreeInstrumentConfig.environment.ambientPressureKPa,
    ambientTemperatureK: file.heatCapacityFreeInstrumentConfig.environment.ambientTemperatureK,
    gasPressureKPaAbs: roundNumber(derived.gasPressureKPa, 4),
    gasTemperatureK: roundNumber(physicsState.gasTemperatureK, 4),
    sensorTemperatureK: roundNumber(
      Number.isFinite(sensorState.sensorTemperatureK)
        ? sensorState.sensorTemperatureK as number
        : physicsState.gasTemperatureK,
      4,
    ),
    pressureDeltaKPa: roundNumber(derived.pressureDeltaKPa, 4),
    simulationTimeS: roundNumber(physicsState.simulationTimeS, 4),
    lastUpdateMs: now,
    pressureSignalMvRaw: roundNumber(sensorState.displayPressureMv, 4),
    pressureSignalMvDisplayed: roundNumber(display.displayPressureMv, 4),
    pressureInitialBiasMv: roundNumber(sensorState.pressureInitialBiasMv, 3),
    temperatureSignalTargetMv: roundNumber(display.displayTemperatureMv, 4),
    pressureSignalTargetMv: roundNumber(display.displayPressureMv, 4),
    displayResponseLastUpdateMs: now,
    pressureZeroDisplayedSamples,
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
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
