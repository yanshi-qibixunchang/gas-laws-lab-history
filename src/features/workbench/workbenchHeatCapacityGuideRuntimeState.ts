import { mapGasTemperatureToSignalMv } from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
  getHeatCapacityDisplayValue,
} from '../../domain/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  isHeatCapacityReleaseFlowOpen,
  type HeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  deriveGuidePhysicalState,
  type HeatCapacityGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  transitionHeatCapacityGuideWorkflow,
  type HeatCapacityGuideAction,
  type HeatCapacityGuideActionContext,
  type HeatCapacityGuideWorkflowState,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import type {
  HeatCapacityRuntimePhase,
} from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  applyHeatCapacityPressureZero,
  getHeatCapacityGaugePressureState,
  getHeatCapacityStopcockState,
  isHeatCapacityPressureZeroWithinTolerance,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  synchronizeHeatCapacityPhysicsControlTiming,
} from './workbenchHeatCapacityFreeRuntimeState.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';
import { truncateHeatCapacitySignalMv } from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';

const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

interface HeatCapacityGuideRuntimeMergeOptions {
  immediatePressureDisplay?: boolean;
}

export const mergeHeatCapacityGuideRuntimeState = (
  file: WorkbenchHeatCapacityState,
  guidePhysicsState: HeatCapacityGuidePhysicsState,
  guideWorkflow: HeatCapacityGuideWorkflowState,
  now: number,
  options: HeatCapacityGuideRuntimeMergeOptions = {},
): WorkbenchHeatCapacityState => {
  guidePhysicsState = synchronizeHeatCapacityPhysicsControlTiming(
    guidePhysicsState,
    file.pumpValveOpen,
    isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState),
  );
  let nextGuideWorkflow = guideWorkflow;
  const derived = deriveGuidePhysicalState(guidePhysicsState, file.heatCapacityGuidePhysicsConfig);
  const pressureDeltaKPa = derived.pressureDeltaKPa;
  const rawPressureMv = pressureDeltaKPa * file.pressureSensitivityMvPerKPa;
  const pressureSignalTargetMv = truncateHeatCapacitySignalMv(applyHeatCapacityPressureZero(
    rawPressureMv,
    file.pressureInitialBiasMv,
    file.pressureZeroOffset,
  ));
  const guideSensorTemperatureK = Number.isFinite(
    file.heatCapacityGuideTemperatureSensorState?.temperatureK,
  )
    ? file.heatCapacityGuideTemperatureSensorState.temperatureK
    : file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK;
  const temperatureSignalTargetMv = truncateHeatCapacitySignalMv(
    mapGasTemperatureToSignalMv(
      guideSensorTemperatureK,
      file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    ),
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
  const temperatureDisplayValue = powerOn ? temperatureSignalTargetMv : null;
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
    heatCapacityPhase: getHeatCapacityGuideRuntimePhase(
      file.powerOn,
      nextGuideWorkflow.step,
      file.heatCapacityReleaseState,
    ),
    gasPressureKPaAbs: derived.gasPressureKPa,
    gasTemperatureK: guidePhysicsState.gasTemperatureK,
    sensorTemperatureK: guideSensorTemperatureK,
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

const getHeatCapacityGuideRuntimePhase = (
  powerOn: boolean,
  step: HeatCapacityGuideWorkflowState['step'],
  releaseState: HeatCapacityReleaseState,
): HeatCapacityRuntimePhase => {
  if (!powerOn) return 'powerOff';
  if (releaseState.purpose === 'release') {
    if (releaseState.phase === 'opening') return 'sealedStabilizing';
    if (releaseState.phase === 'releasing') return 'releasing';
    if (releaseState.phase === 'closing' || releaseState.phase === 'closedAfterRelease') return 'recovering';
  }
  switch (step) {
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

export const getHeatCapacityGuideActionContext = (
  file: WorkbenchHeatCapacityState,
  action: HeatCapacityGuideAction,
  overrides: Partial<ReturnType<typeof buildHeatCapacityGuideActionContextBase> &
    Pick<HeatCapacityGuideActionContext, 'wallClockMs'>> = {},
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
  simulationTimeS: file.heatCapacityGuidePhysicsState.simulationTimeS,
  releaseFormed: file.heatCapacityReleaseState.formedRelease,
});
