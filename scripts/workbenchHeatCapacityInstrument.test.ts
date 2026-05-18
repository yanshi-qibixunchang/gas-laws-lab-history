import assert from 'node:assert/strict';
import {
  adjustHeatCapacityPressureZeroCoarse,
  adjustHeatCapacityPressureZeroFine,
  applyHeatCapacityPressureZero,
  canZeroHeatCapacityPressure,
  captureHeatCapacityWorkbenchSample,
  createDefaultHeatCapacityFile,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureReleaseBurstUntilMs,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  getHeatCapacityAirGammaResult,
  getHeatCapacityStopcockTargetAngle,
  getHeatCapacityStopcockState,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
  HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA,
  HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ,
  HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA,
  createHeatCapacityInitialPressureBiasMv,
  isHeatCapacityPressureZeroWithinTolerance,
  markHeatCapacityDemoComplete,
  registerHeatCapacityPumpStroke,
  resetHeatCapacityForManualExperiment,
  normalizeHeatCapacityStopcockAngle,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  stepHeatCapacityWorkbenchFile,
} from '../components/workbenchState.ts';
import {
  HEAT_CAPACITY_VIDEO_PROFILE,
  getHeatCapacityRangeMidpoint,
} from '../components/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  createHeatCapacityAutoDemoSteps,
} from '../components/heatCapacity/heatCapacityAutoDemo.ts';
import {
  getHeatCapacityHardSphereVisualState,
} from '../components/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  removeHeatCapacityTrialRecord,
} from '../components/heatCapacity/heatCapacityTrialModel.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
} from '../components/workbenchSession.ts';

const defaultFile = createDefaultHeatCapacityFile(1);
const initialTemperatureMv = getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.initialTemperatureMvRange);

assert.equal(defaultFile.powerOn, false);
assert.equal(defaultFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(defaultFile.glassPistonState, 'closed');
assert.equal(defaultFile.pressureZeroed, false);
assert.equal(defaultFile.pressureZeroAdjusted, false);
assert.equal(defaultFile.pressureZeroKnobAngle, 0);
assert.equal(defaultFile.pressureZeroOffset, 0);
assert.equal(defaultFile.pressureInitialBiasMv, 0);
assert.deepEqual(defaultFile.pressureZeroDisplayedSamples, []);
assert.equal(defaultFile.pressureZeroAdjustMode, 'none');
assert.equal(defaultFile.heatCapacityPhase, 'powerOff');
assert.equal(defaultFile.ambientPressureKPa, 101.3);
assert.equal(defaultFile.ambientTemperatureK, 298.15);
assert.equal(defaultFile.gasPressureKPaAbs, 101.3);
assert.equal(defaultFile.gasTemperatureK, 298.15);
assert.equal(defaultFile.pressureDeltaKPa, 0);
assert.equal(defaultFile.pressureRawPlaceholder, 0);
assert.equal(defaultFile.pressureDisplayedPlaceholder, 0);
assert.equal(defaultFile.pressureGaugeTargetValue, 0);
assert.equal(defaultFile.pressureGaugeDisplayValue, 0);
assert.equal(defaultFile.pressureGaugeNeedleAngle, -120);
assert.equal(defaultFile.gaugePressureMinKPa, 0);
assert.equal(defaultFile.gaugePressureMaxKPa, HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA);
const poweredOffHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: null,
  pressureMv: null,
  phase: 'powerOff',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
assert.equal(poweredOffHardSphereVisual.targetParticleCount > 0, true, 'hard-sphere teaching layer should remain visible before power is turned on');
assert.equal(poweredOffHardSphereVisual.speedMultiplier > 0, true, 'powered-off hard-sphere teaching layer should still show room-temperature motion');
const poweredOffPressurizedHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: null,
  pressureMv: null,
  pressureDeltaKPa: 5.5,
  phase: 'powerOff',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
assert.equal(
  poweredOffPressurizedHardSphereVisual.targetParticleCount > poweredOffHardSphereVisual.targetParticleCount,
  true,
  'powered-off hard-sphere teaching layer should keep showing the extra pumped gas already inside the bottle',
);
const lowPressurePumpingHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 20,
  pressureDeltaKPa: 1,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
});
const highPressurePumpingHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 110,
  pressureDeltaKPa: 5.5,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
});
assert.equal(
  highPressurePumpingHardSphereVisual.speedMultiplier >= lowPressurePumpingHardSphereVisual.speedMultiplier + 0.18,
  true,
  'hard-sphere speed should visibly increase as pumping raises pressure and gas temperature',
);
const releaseCoolingHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 110,
  pressureDeltaKPa: 5.5,
  phase: 'release',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  releaseBurstActive: true,
});
assert.equal(
  releaseCoolingHardSphereVisual.speedMultiplier <= lowPressurePumpingHardSphereVisual.speedMultiplier - 0.2,
  true,
  'hard-sphere speed should visibly drop during release cooling instead of staying close to the pumping speed',
);
assert.equal(HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV, 90);
assert.equal(HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, 90);
assert.equal(HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, 120);
assert.equal(HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ, 2);
assert.equal(defaultFile.pressureWarningThresholdKPa, HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafeThresholdKPa, HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafetyThresholdKPa, HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafetyStatus, 'normal');
assert.equal(defaultFile.pressureSafetyMessage, null);
assert.equal(defaultFile.pressureBlockedPumping, false);
assert.equal(defaultFile.pressureOverLimit, false);
assert.deepEqual(HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementTooSlowMvRange, [6, 6]);
assert.deepEqual(HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementSuitableMvRange, [14, 14]);
assert.equal(HEAT_CAPACITY_VIDEO_PROFILE.pumpPeakPressureMvRange[1] < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo profile peak pressure must stay below the alarm threshold');
assert.equal(HEAT_CAPACITY_VIDEO_PROFILE.stablePressureMvRange[1] < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo stable pressure must stay below the alarm threshold');
assert.equal(defaultFile.pressureZeroMvPerTurn, HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN);
assert.equal(defaultFile.temperatureSignalMv, null);
assert.equal(defaultFile.pressureSignalMv, null);
assert.equal(defaultFile.temperatureSignalTargetMv, initialTemperatureMv);
assert.equal(defaultFile.pressureSignalTargetMv, 0);
assert.equal(defaultFile.displayResponseLastUpdateMs, null);
assert.equal(defaultFile.pumpValveOpen, false);
assert.equal(defaultFile.pumpValveState, 'closed');
assert.equal(defaultFile.pumpBulbState, 'idle');
assert.deepEqual(defaultFile.pumpStrokeTimestamps, []);
assert.equal(defaultFile.pumpFrequency, 0);
assert.equal(defaultFile.pumpFrequencyStatus, 'idle');
assert.equal(defaultFile.lastPumpTime, null);
assert.equal(defaultFile.pumpStrokeCount, 0);
assert.equal(defaultFile.hardSphereViewEnabled, false);
assert.equal(defaultFile.hardSphereParticleMultiplier, 1);
assert.equal(defaultFile.hardSphereSpeedMultiplier, 1);
assert.equal(defaultFile.pressureReleaseBurstUntilMs, null);
assert.equal(defaultFile.visualizationMode, 'particle');
assert.equal(defaultFile.calculationModel, 'airHeatCapacityRatio');
assert.equal(defaultFile.pressureSensitivityMvPerKPa, 20);
assert.equal(defaultFile.theoreticalGamma, 1.4);
assert.equal(defaultFile.pressurePlaceholder, 101.3);
assert.equal(defaultFile.temperaturePlaceholder, 298.15);
assert.equal('heatCapacityTrace' in defaultFile, false, 'heatCapacity files should not persist realtime chart trace history');
assert.deepEqual(defaultFile.heatCapacityProcessSamples, {});
assert.equal(canZeroHeatCapacityPressure(defaultFile), false);
assert.equal(HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV, 0.1);
assert.equal(applyHeatCapacityPressureZero(3.2, 0.4, -0.7), 2.9);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(-0.6), -216);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(0.8), 288);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(-216), -0.6);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(288), 0.8);
for (let index = 0; index < 40; index += 1) {
  const biasMv = createHeatCapacityInitialPressureBiasMv();
  assert.equal(biasMv >= -1.5 && biasMv <= 1.5, true, 'initial pressure-zero bias should stay in the three-turn correction range');
}
assert.equal(isHeatCapacityPressureZeroWithinTolerance([
  { atMs: 0, valueMv: 0.08 },
  { atMs: 100, valueMv: -0.04 },
  { atMs: 200, valueMv: 0.03 },
  { atMs: 300, valueMv: -0.09 },
  { atMs: 400, valueMv: 0.1 },
]), true);
assert.equal(isHeatCapacityPressureZeroWithinTolerance([
  { atMs: 0, valueMv: 0.08 },
  { atMs: 100, valueMv: -0.04 },
  { atMs: 200, valueMv: 0.11 },
  { atMs: 300, valueMv: -0.09 },
  { atMs: 400, valueMv: 0.04 },
]), false);

const defaultAirGamma = getHeatCapacityAirGammaResult(defaultFile);
assert.equal(defaultAirGamma.status, 'missing-samples');
assert.equal(defaultAirGamma.ready, false);
assert.equal(defaultAirGamma.gamma, null);

const readyAirGamma = getHeatCapacityAirGammaResult({
  ...defaultFile,
  heatCapacityProcessSamples: {
    zeroedSample: {
      timeS: 1,
      phase: 'zeroed',
      temperatureSignalMv: initialTemperatureMv,
      pressureSignalMv: 0,
      gasTemperatureK: 298.15,
      gasPressureKPaAbs: 101.3,
      pressureDeltaKPa: 0,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: true,
    },
    stableBeforeReleaseSample: {
      timeS: 2,
      phase: 'sealedStabilizing',
      temperatureSignalMv: 1526,
      pressureSignalMv: 120,
      gasTemperatureK: 304.9,
      gasPressureKPaAbs: 107.3,
      pressureDeltaKPa: 6,
      pumpFrequency: 0.67,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
    recoverySample: {
      timeS: 3,
      phase: 'recovering',
      temperatureSignalMv: 1522,
        pressureSignalMv: 34.3,
      gasTemperatureK: 303.9,
      gasPressureKPaAbs: 102.9,
      pressureDeltaKPa: 1.6,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
  },
});
assert.equal(readyAirGamma.status, 'ready');
assert.equal(readyAirGamma.U1Mv, 120);
assert.equal(readyAirGamma.U2Mv, 34.3);
assert.equal(readyAirGamma.deltaP1KPa, 6);
assert.equal(Math.abs((readyAirGamma.deltaP2KPa ?? 0) - 1.715) < 1e-9, true);
assert.equal(readyAirGamma.P1KPa, 107.3);
assert.equal(Math.abs((readyAirGamma.P2KPa ?? 0) - 103.015) < 1e-9, true);
assert.equal(readyAirGamma.gamma !== null && readyAirGamma.gamma > 1.39 && readyAirGamma.gamma < 1.41, true);

const poweredFile = powerHeatCapacityWorkbenchFile(defaultFile, true, 1_000);
assert.equal(poweredFile.powerOn, true);
assert.equal(poweredFile.heatCapacityPhase, 'readyToZero');
assert.equal(poweredFile.temperatureSignalMv, 1499.1);
assert.equal(poweredFile.pressureSignalMv, 0);
assert.equal(poweredFile.temperatureSignalTargetMv, initialTemperatureMv);
assert.equal(poweredFile.pressureSignalTargetMv, 0);
assert.equal(poweredFile.hardSphereViewEnabled, false, 'powering on should not automatically enable the teaching visualization');
assert.equal('heatCapacityTrace' in poweredFile, false, 'powering on should not create chart trace history');

let stableDisplayFile = {
  ...poweredFile,
  pressureSignalMv: poweredFile.pressureSignalTargetMv,
  temperatureSignalMv: poweredFile.temperatureSignalTargetMv,
  displayResponseLastUpdateMs: 1_000,
};
const stablePressureTargets = new Set<number>();
const stablePressureDisplays = new Set<number>();
const stableTemperatureTargets = new Set<number>();
const stableTemperatureDisplays = new Set<number>();
for (let index = 0; index < 20; index += 1) {
  stableDisplayFile = stepHeatCapacityWorkbenchFile(stableDisplayFile, 1_100 + index * 180);
  stablePressureTargets.add(stableDisplayFile.pressureSignalTargetMv);
  stablePressureDisplays.add(stableDisplayFile.pressureSignalMv ?? Number.NaN);
  stableTemperatureTargets.add(stableDisplayFile.temperatureSignalTargetMv);
  stableTemperatureDisplays.add(stableDisplayFile.temperatureSignalMv ?? Number.NaN);
}
assert.equal(stablePressureTargets.size, 1, 'display jitter must not change the pressure target value');
assert.equal(stableTemperatureTargets.size, 1, 'display jitter must not change the temperature target value');
assert.equal(stablePressureDisplays.size > 1, true, 'stable pressure display should have small last-digit jitter');
assert.equal(stableTemperatureDisplays.size > 1, true, 'stable temperature display should have small last-digit jitter');

const pressureLoadedFile = {
  ...poweredFile,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 0.16,
  pressureDeltaKPa: 0.16,
  pressureSignalMvRaw: 3.2,
  pressureSignalMvDisplayed: 3.2,
  pressureRawPlaceholder: 3.2,
  pressureDisplayedPlaceholder: 3.2,
  pressureGaugeTargetValue: 0.16,
  pressureGaugeDisplayValue: 0.16,
  pressureGaugeNeedleAngle: -116.16,
  pressureSignalMv: 3.2,
};
const fineZero = adjustHeatCapacityPressureZeroFine({
  ...pressureLoadedFile,
}, 1, 1_080);
assert.equal(fineZero.pressureZeroAdjusted, true);
assert.equal(fineZero.pressureZeroed, false, 'a knob movement alone must not mark pressure zero as valid');
assert.equal(fineZero.pressureZeroAdjustMode, 'fineWheel');
assert.equal(fineZero.pressureZeroKnobAngle, 2);
assert.equal(fineZero.pressureZeroOffset, 0.006);
assert.equal(fineZero.pressureDisplayedPlaceholder, 3.21);
assert.equal(fineZero.pressureSignalTargetMv, 3.206);
assert.equal(fineZero.pressureSignalMv !== fineZero.pressureSignalTargetMv, true);
assert.equal(fineZero.pressureGaugeDisplayValue, pressureLoadedFile.pressureDeltaKPa);
assert.equal(fineZero.pressureOverLimit, false);
assert.equal(fineZero.temperatureSignalMv, pressureLoadedFile.temperatureSignalMv);
assert.equal(fineZero.temperatureSignalTargetMv, pressureLoadedFile.temperatureSignalTargetMv);
assert.equal(fineZero.temperaturePlaceholder, pressureLoadedFile.temperaturePlaceholder);

const coarseZero = adjustHeatCapacityPressureZeroCoarse({
  ...fineZero,
}, 90);
assert.equal(coarseZero.pressureZeroAdjustMode, 'coarseDrag');
assert.equal(coarseZero.pressureZeroKnobAngle, 92);
assert.equal(coarseZero.pressureZeroOffset > fineZero.pressureZeroOffset, true);
assert.equal(coarseZero.pressureDisplayedPlaceholder > fineZero.pressureDisplayedPlaceholder, true);
assert.equal(coarseZero.pressureZeroOffset, 0.256);
assert.equal(coarseZero.temperatureSignalTargetMv, fineZero.temperatureSignalTargetMv);

assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG), HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(0), 0);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG), HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(360), 1);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(180), 0.5);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(90), 0.25);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV), HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(0), 0);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV), HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(1), 360);

const upperLimitedZero = adjustHeatCapacityPressureZeroCoarse({
  ...pressureLoadedFile,
  pressureZeroKnobAngle: 530,
  pressureZeroOffset: getHeatCapacityPressureZeroOffsetForKnobAngle(530),
}, 120);
assert.equal(upperLimitedZero.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(upperLimitedZero.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);
const upperLimitedAgain = adjustHeatCapacityPressureZeroFine(upperLimitedZero, 1);
assert.equal(upperLimitedAgain.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(upperLimitedAgain.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);

const lowerLimitedZero = adjustHeatCapacityPressureZeroCoarse({
  ...pressureLoadedFile,
  pressureZeroKnobAngle: -530,
  pressureZeroOffset: getHeatCapacityPressureZeroOffsetForKnobAngle(-530),
}, -120);
assert.equal(lowerLimitedZero.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(lowerLimitedZero.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);
const lowerLimitedAgain = adjustHeatCapacityPressureZeroFine(lowerLimitedZero, -1);
assert.equal(lowerLimitedAgain.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(lowerLimitedAgain.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);

const demoStart = prepareHeatCapacityAutoDemoStart(defaultFile, 20_000, () => 0.75);
assert.equal(demoStart.powerOn, true);
assert.equal(demoStart.runState, 'running');
assert.equal(demoStart.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(demoStart.glassPistonState, 'closed');
assert.equal(demoStart.pressureZeroAdjusted, false);
assert.equal(Math.abs(demoStart.pressureSignalTargetMv), 0.75);
assert.equal(demoStart.pressureDeltaKPa, 0);
assert.equal(demoStart.gasPressureKPaAbs, defaultFile.ambientPressureKPa);
assert.equal(demoStart.temperatureSignalTargetMv, demoStart.heatCapacityExperimentProfile?.initialTemperatureMv);
assert.equal(demoStart.temperatureSignalMv, Math.round((demoStart.heatCapacityExperimentProfile?.initialTemperatureMv ?? 0) * 10) / 10);
assert.equal(demoStart.heatCapacityExperimentSeed !== null, true);
assert.equal(demoStart.heatCapacityExperimentProfile !== null, true);
assert.equal(demoStart.heatCapacityExpectedTrialCount, 1);
assert.equal(demoStart.heatCapacityExpectedTrialCountMode, 'custom');
assert.equal(demoStart.heatCapacityTrials.length, 1);
assert.equal(demoStart.heatCapacityTrials[0].status, 'waiting');
assert.equal(demoStart.heatCapacityProcessingCalculated, false);
assert.deepEqual(demoStart.heatCapacityProcessSamples, {});

const visualDemoStart = prepareHeatCapacityAutoDemoStart({
  ...defaultFile,
  hardSphereViewEnabled: true,
  hardSphereParticleMultiplier: 1.15,
  hardSphereSpeedMultiplier: 1.2,
}, 20_500, () => 0.5);
assert.equal(visualDemoStart.hardSphereViewEnabled, true, 'auto demo start should preserve the hard-sphere teaching toggle');
assert.equal(visualDemoStart.hardSphereParticleMultiplier, 1.15);
assert.equal(visualDemoStart.hardSphereSpeedMultiplier, 1.2);
assert.equal(visualDemoStart.pressureReleaseBurstUntilMs, null);

const autoDemoPumpActionCount = createHeatCapacityAutoDemoSteps()
  .flatMap((step) => step.actions)
  .filter((action) => action.action === 'pumpStroke').length;
assert.equal(autoDemoPumpActionCount, 7, 'auto demo should keep the teaching pump sequence below the alarm region');
let autoDemoPressureFile = {
  ...demoStart,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed' as const,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
};
for (let strokeIndex = 0; strokeIndex < autoDemoPumpActionCount; strokeIndex += 1) {
  autoDemoPressureFile = registerHeatCapacityPumpStroke(autoDemoPressureFile, 21_000 + strokeIndex * 430);
}
assert.equal(autoDemoPressureFile.pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo pumping must never reach the alarm region');
assert.equal(autoDemoPressureFile.pressureOverLimit, false, 'auto demo pumping must not set the alarm state');

const completedDemo = markHeatCapacityDemoComplete({
  ...demoStart,
  hardSphereViewEnabled: true,
  hardSphereParticleMultiplier: 1.15,
  hardSphereSpeedMultiplier: 1.2,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpBulbState: 'compressing',
  pumpStrokeTimestamps: [20_000, 20_400, 20_800],
  pumpFrequency: 2.5,
  pumpFrequencyStatus: 'suitable',
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  pressureZeroKnobAngle: 44,
  pressureZeroOffset: 1.2,
  pressureZeroAdjustMode: 'coarseDrag',
}, 30_000);
assert.equal(completedDemo.runState, 'finished');
assert.equal(completedDemo.heatCapacityPhase, 'demoComplete');
assert.equal(completedDemo.powerOn, false);
assert.equal(completedDemo.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(completedDemo.glassPistonState, 'closed');
assert.equal(completedDemo.pumpValveOpen, false);
assert.equal(completedDemo.pumpValveState, 'closed');
assert.equal(completedDemo.pumpBulbState, 'idle');
assert.deepEqual(completedDemo.pumpStrokeTimestamps, []);
assert.equal(completedDemo.pumpFrequency, 0);
assert.equal(completedDemo.pumpFrequencyStatus, 'idle');
assert.equal(completedDemo.pressureZeroAdjusted, false);
assert.equal(completedDemo.pressureZeroed, false);
assert.equal(completedDemo.pressureZeroKnobAngle, 0);
assert.equal(completedDemo.pressureZeroOffset, 0);
assert.equal(completedDemo.pressureZeroAdjustMode, 'none');
assert.equal(completedDemo.temperatureSignalMv, null);
assert.equal(completedDemo.pressureSignalMv, null);
assert.equal(completedDemo.hardSphereViewEnabled, true, 'auto demo completion should preserve the hard-sphere teaching toggle');
assert.equal(completedDemo.hardSphereParticleMultiplier, 1.15);
assert.equal(completedDemo.hardSphereSpeedMultiplier, 1.2);
assert.equal(completedDemo.pressureReleaseBurstUntilMs, null);

const manualResetAfterDemo = resetHeatCapacityForManualExperiment({
  ...completedDemo,
  heatCapacityProcessSamples: {
    ...completedDemo.heatCapacityProcessSamples,
    recoverySample: {
      timeS: 114.3,
      phase: 'recovering',
      temperatureSignalMv: 1504.4,
      pressureSignalMv: 31.77,
      gasTemperatureK: 298.6,
      gasPressureKPaAbs: completedDemo.ambientPressureKPa + 1.5885,
      pressureDeltaKPa: 1.5885,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
  },
  pressureSignalMvDisplayed: 31.77,
  pressureDisplayedPlaceholder: 31.77,
  pressureDeltaKPa: 1.5885,
  gasPressureKPaAbs: completedDemo.ambientPressureKPa + 1.5885,
  heatCapacityProcessingCalculated: true,
}, 31_000);
assert.equal(manualResetAfterDemo.powerOn, false);
assert.equal(manualResetAfterDemo.runState, 'idle');
assert.equal(manualResetAfterDemo.heatCapacityPhase, 'powerOff');
assert.equal(manualResetAfterDemo.pressureDeltaKPa, 0);
assert.equal(manualResetAfterDemo.gasPressureKPaAbs, manualResetAfterDemo.ambientPressureKPa);
assert.equal(Math.abs(manualResetAfterDemo.pressureDisplayedPlaceholder) <= 1.5, true);
assert.equal(manualResetAfterDemo.heatCapacityExpectedTrialCount, 3);
assert.equal(manualResetAfterDemo.heatCapacityExpectedTrialCountMode, '3');
assert.equal(manualResetAfterDemo.heatCapacityTrials.length, 3);
assert.equal(manualResetAfterDemo.heatCapacityTrials.every((trial) => trial.status === 'waiting'), true);
assert.equal(manualResetAfterDemo.heatCapacityProcessingCalculated, false);
assert.deepEqual(manualResetAfterDemo.heatCapacityProcessSamples, {});

const poweredAfterManualReset = powerHeatCapacityWorkbenchFile(manualResetAfterDemo, true, 31_100);
assert.equal(poweredAfterManualReset.powerOn, true);
assert.equal(poweredAfterManualReset.heatCapacityPhase, 'readyToZero');
assert.equal(poweredAfterManualReset.pressureDeltaKPa, 0);
assert.equal(poweredAfterManualReset.gasPressureKPaAbs, poweredAfterManualReset.ambientPressureKPa);
assert.equal(Math.abs(poweredAfterManualReset.pressureInitialBiasMv) <= 1.5, true);
assert.equal(Math.abs(poweredAfterManualReset.pressureSignalMv ?? 0) <= 1.6, true);

const pumpedTarget = registerHeatCapacityPumpStroke({
  ...demoStart,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed',
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpStrokeTimestamps: [20_000, 20_600],
}, 21_000);
assert.equal(pumpedTarget.pressureSignalTargetMv > demoStart.pressureSignalTargetMv, true);
assert.equal(pumpedTarget.pressureSignalMv < pumpedTarget.pressureSignalTargetMv, true);
assert.equal(pumpedTarget.temperatureSignalTargetMv > demoStart.temperatureSignalTargetMv, true);
assert.equal(pumpedTarget.temperatureSignalMv < pumpedTarget.temperatureSignalTargetMv, true);
assert.equal(Math.abs(pumpedTarget.pressureGaugeTargetValue - pumpedTarget.pressureDeltaKPa) < 0.01, true);
assert.equal(pumpedTarget.pressureGaugeDisplayValue <= pumpedTarget.pressureGaugeTargetValue, true);

const settledDisplay = stepHeatCapacityWorkbenchFile(pumpedTarget, 22_000);
assert.equal(settledDisplay.pressureSignalMv > pumpedTarget.pressureSignalMv, true);
assert.equal(settledDisplay.temperatureSignalMv > pumpedTarget.temperatureSignalMv, true);
assert.equal(Math.abs(settledDisplay.pressureGaugeTargetValue - settledDisplay.pressureDeltaKPa) < 0.01, true);
assert.equal(settledDisplay.pressureGaugeDisplayValue > pumpedTarget.pressureGaugeDisplayValue, true);

assert.equal(HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, 0.12);
assert.equal(getHeatCapacityPressureReleaseBurstUntilMs({
  ...poweredFile,
  pressureDeltaKPa: HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA - 0.01,
  pressureSignalTargetMv: (HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA - 0.01) * poweredFile.pressureSensitivityMvPerKPa,
}, true, 40_000), null, 'opening the stopcock without a useful pressure difference should not start a release burst');
assert.equal(getHeatCapacityPressureReleaseBurstUntilMs({
  ...poweredFile,
  pressureDeltaKPa: HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA + 0.01,
  pressureSignalTargetMv: (HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA + 0.01) * poweredFile.pressureSensitivityMvPerKPa,
}, true, 40_000), 41_000, 'opening the stopcock with pressure difference should start a one-second release burst');

const releaseReadyFile = {
  ...poweredFile,
  powerOn: true,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  heatCapacityPhase: 'sealedStabilizing',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 5,
  pressureDeltaKPa: 5,
  pressureSignalMvRaw: 100,
  pressureSignalMvDisplayed: 100,
  pressureSignalTargetMv: 100,
  pressureSignalMv: 100,
  pressureDisplayedPlaceholder: 100,
  pressureGaugeTargetValue: 5,
  pressureGaugeDisplayValue: 5,
  lastUpdateMs: 22_000,
  displayResponseLastUpdateMs: 22_000,
  pressureReleaseBurstUntilMs: 23_000,
};
const releasedDuringBurst = stepHeatCapacityWorkbenchFile(releaseReadyFile, 22_700);
assert.equal(releasedDuringBurst.heatCapacityPhase, 'releasing');
assert.equal(releasedDuringBurst.pressureDeltaKPa < HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, true, 'release should rapidly reduce pressure difference toward zero');
assert.equal(releasedDuringBurst.pressureReleaseBurstUntilMs, 23_000);
assert.equal(Math.abs(releasedDuringBurst.pressureSignalMv ?? 0) > 0.2, true, 'release burst should allow a short stronger near-zero display fluctuation');

const releasedAfterBurst = stepHeatCapacityWorkbenchFile({
  ...releasedDuringBurst,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 23_200);
assert.equal(releasedAfterBurst.heatCapacityPhase === 'releasing', false, 'release should not continue after the one-second burst window');
assert.equal(releasedAfterBurst.pressureReleaseBurstUntilMs, null);
assert.equal(releasedAfterBurst.pressureDeltaKPa <= HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, true);
const openStillAfterBurst = stepHeatCapacityWorkbenchFile({
  ...releasedAfterBurst,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 24_200);
assert.equal(openStillAfterBurst.pressureDeltaKPa <= HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, true, 'pressure should not recover while the stopcock remains open');

const noPressureOpenFile = stepHeatCapacityWorkbenchFile({
  ...poweredFile,
  powerOn: true,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  heatCapacityPhase: 'zeroed',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  gasPressureKPaAbs: poweredFile.ambientPressureKPa,
  pressureDeltaKPa: 0,
  pressureSignalTargetMv: 0,
  pressureSignalMv: 0,
  pressureReleaseBurstUntilMs: null,
  lastUpdateMs: 50_000,
  displayResponseLastUpdateMs: 50_000,
}, 50_600);
assert.equal(noPressureOpenFile.heatCapacityPhase === 'releasing', false, 'opening the stopcock at zero pressure difference should stay a normal open state');
assert.equal(noPressureOpenFile.pressureReleaseBurstUntilMs, null);
assert.equal(Math.abs(noPressureOpenFile.pressureSignalMv ?? 0) < 0.2, true, 'zero-pressure stopcock opening should only show ordinary low-amplitude jitter');

assert.deepEqual(getHeatCapacityGaugePressureState(12, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 4.5,
  pressureSafetyThresholdKPa: 6,
  pressureGaugeTargetValue: 10,
  pressureGaugeDisplayValue: 10,
  pressureGaugeNeedleAngle: 120,
  pressureSafeThresholdKPa: 6,
  pressureSafetyStatus: 'danger',
  pressureSafetyMessage: '压强已超过安全阈值，请停止打气。',
  pressureBlockedPumping: true,
  pressureOverLimit: true,
});
assert.deepEqual(getHeatCapacityGaugePressureState(4.49, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 4.5,
  pressureSafetyThresholdKPa: 6,
  pressureGaugeTargetValue: 4.49,
  pressureGaugeDisplayValue: 4.49,
  pressureGaugeNeedleAngle: -12.24,
  pressureSafeThresholdKPa: 6,
  pressureSafetyStatus: 'normal',
  pressureSafetyMessage: null,
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(4.5, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 4.5,
  pressureSafetyThresholdKPa: 6,
  pressureGaugeTargetValue: 4.5,
  pressureGaugeDisplayValue: 4.5,
  pressureGaugeNeedleAngle: -12,
  pressureSafeThresholdKPa: 6,
  pressureSafetyStatus: 'warning',
  pressureSafetyMessage: '压强接近安全阈值，请准备停止打气。',
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(5.99, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 4.5,
  pressureSafetyThresholdKPa: 6,
  pressureGaugeTargetValue: 5.99,
  pressureGaugeDisplayValue: 5.99,
  pressureGaugeNeedleAngle: 23.76,
  pressureSafeThresholdKPa: 6,
  pressureSafetyStatus: 'warning',
  pressureSafetyMessage: '压强接近安全阈值，请准备停止打气。',
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(6, true, defaultFile, 5.98), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 4.5,
  pressureSafetyThresholdKPa: 6,
  pressureGaugeTargetValue: 6,
  pressureGaugeDisplayValue: 5.98,
  pressureGaugeNeedleAngle: 23.52,
  pressureSafeThresholdKPa: 6,
  pressureSafetyStatus: 'danger',
  pressureSafetyMessage: '压强已超过安全阈值，请停止打气。',
  pressureBlockedPumping: true,
  pressureOverLimit: true,
});

assert.deepEqual(getHeatCapacityPumpFrequencyState([], 10_000), {
  timestamps: [],
  pumpFrequency: 0,
  pumpFrequencyStatus: 'idle',
});
assert.equal(getHeatCapacityPumpFrequencyState([8_000], 10_000).pumpFrequencyStatus, 'tooSlow');
assert.equal(getHeatCapacityPumpFrequencyState([7_200, 8_400, 9_600], 10_000).pumpFrequencyStatus, 'suitable');
assert.equal(JSON.stringify(getHeatCapacityPumpFrequencyState([7_200, 8_400, 9_600], 10_000)).includes('tooFast'), false);

const closedValvePump = registerHeatCapacityPumpStroke(poweredFile, 10_000);
assert.equal(closedValvePump.pumpStrokeCount, 0);
assert.deepEqual(closedValvePump.pumpStrokeTimestamps, []);
assert.equal(closedValvePump.pumpFrequency, 0);
assert.equal(closedValvePump.pumpFrequencyStatus, 'idle');
assert.equal(closedValvePump.pressurePlaceholder, poweredFile.pressurePlaceholder);
assert.equal(closedValvePump.temperaturePlaceholder, poweredFile.temperaturePlaceholder);
assert.equal(closedValvePump.pressureKPa, poweredFile.pressureKPa);
assert.equal(closedValvePump.lastPumpTime, poweredFile.lastPumpTime);
assert.equal(closedValvePump.pumpHint, '打气阀门未打开，无法有效打气');

const openStopcockPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 10_000);
assert.equal(openStopcockPump.pumpStrokeCount, 0);
assert.deepEqual(openStopcockPump.pumpStrokeTimestamps, []);
assert.equal(openStopcockPump.pumpFrequency, 0);
assert.equal(openStopcockPump.pumpFrequencyStatus, 'idle');
assert.equal(openStopcockPump.pressurePlaceholder, poweredFile.pressurePlaceholder);
assert.equal(openStopcockPump.temperaturePlaceholder, poweredFile.temperaturePlaceholder);
assert.equal(openStopcockPump.pumpHint, '玻璃旋塞已打开，无法形成有效加压');

const openValvePump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
}, 10_000);
assert.equal(openValvePump.pumpStrokeCount, 1);
assert.equal(openValvePump.pumpFrequencyStatus, 'tooSlow');
assert.equal(openValvePump.pressureSignalTargetMv, 6);
assert.equal(openValvePump.pressurePlaceholder > poweredFile.pressurePlaceholder, true);
assert.equal(openValvePump.temperaturePlaceholder > poweredFile.temperaturePlaceholder, true);

let pumpSequenceFile = {
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
};
const pumpSequence: Array<typeof pumpSequenceFile> = [];
for (let strokeIndex = 0; strokeIndex < 10; strokeIndex += 1) {
  pumpSequenceFile = registerHeatCapacityPumpStroke(pumpSequenceFile, 10_000 + strokeIndex * 430);
  pumpSequence.push(pumpSequenceFile);
}
assert.equal(pumpSequence[5].pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true, 'the sixth pump stroke should remain in the safe region');
assert.equal(pumpSequence[6].pressureSignalTargetMv, HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, 'the seventh pump stroke should enter the warning region');
assert.equal(pumpSequence[6].pressureSafetyStatus, 'warning');
assert.equal(pumpSequence[8].pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'the ninth pump stroke should still give the user warning reaction time');
assert.equal(pumpSequence[9].pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'the tenth pump stroke should enter the alarm region');
assert.equal(pumpSequence[9].pressureSafetyStatus, 'danger');

const warningRegionPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: 5.25,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 5.25,
  pressureSignalMvRaw: 105,
  pressureSignalMvDisplayed: 105,
  pressureSignalTargetMv: 105,
  pressureRawPlaceholder: 105,
  pressureDisplayedPlaceholder: 105,
  pressureGaugeTargetValue: 5.25,
  pressureGaugeDisplayValue: 5.25,
  pressureSafetyStatus: 'warning',
  pumpStrokeTimestamps: [8_800, 9_400],
  pumpFrequency: 0.7,
  pumpFrequencyStatus: 'suitable',
}, 10_000);
assert.equal(warningRegionPump.pumpStrokeCount, 1, 'manual pumping around 105 mV should remain effective');
assert.equal(warningRegionPump.pressureSignalTargetMv > 105, true, 'manual pumping should be able to proceed from warning toward alarm');

const overLimitPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: poweredFile.pressureSafetyThresholdKPa,
  pressureSignalMvRaw: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalMvDisplayed: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalTargetMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureGaugeDisplayValue: poweredFile.pressureSafetyThresholdKPa,
  pressureOverLimit: true,
}, 10_000);
assert.equal(overLimitPump.pumpStrokeCount, 0);
assert.equal(overLimitPump.pressureDeltaKPa, poweredFile.pressureSafetyThresholdKPa);
assert.equal(overLimitPump.pressureOverLimit, true);
assert.equal(overLimitPump.pumpHint, '压强已超过安全阈值，请停止打气。');

const thresholdCrossingPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: 5.9,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 5.9,
  pressureSignalMvRaw: 118,
  pressureSignalMvDisplayed: 118,
  pressureSignalTargetMv: 118,
  pressureRawPlaceholder: 118,
  pressureDisplayedPlaceholder: 118,
  pressureGaugeTargetValue: 5.9,
  pressureGaugeDisplayValue: 5.9,
  pumpStrokeTimestamps: [8_800, 9_400],
  pumpFrequency: 0.7,
  pumpFrequencyStatus: 'suitable',
}, 10_000);
assert.equal(thresholdCrossingPump.pumpStrokeCount, 1);
assert.equal(thresholdCrossingPump.pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true);
assert.equal(thresholdCrossingPump.pressureDeltaKPa > poweredFile.pressureSafeThresholdKPa, true);
assert.equal(thresholdCrossingPump.pressureBlockedPumping, true);
assert.equal(thresholdCrossingPump.pressureOverLimit, true);

const blockedAfterCrossingPump = registerHeatCapacityPumpStroke({
  ...thresholdCrossingPump,
  pumpBulbState: 'idle',
}, 10_400);
assert.equal(blockedAfterCrossingPump.pumpStrokeCount, thresholdCrossingPump.pumpStrokeCount);
assert.equal(blockedAfterCrossingPump.pressureDeltaKPa, thresholdCrossingPump.pressureDeltaKPa);
assert.equal(blockedAfterCrossingPump.pressureSignalTargetMv, thresholdCrossingPump.pressureSignalTargetMv);
assert.equal(blockedAfterCrossingPump.pumpHint, '压强已超过安全阈值，请停止打气。');

const sampledWorkbenchFile = captureHeatCapacityWorkbenchSample({
  ...openValvePump,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  pumpFrequency: 0.67,
}, 'pumpPeakSample', 10_200);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpValveOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.stopcockOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpFrequency, 0.67);

const profiledManualSampleSource = {
  ...openValvePump,
  pressureSignalMv: 88,
  pressureSignalMvRaw: 88,
  pressureSignalMvDisplayed: 88,
  pressureSignalTargetMv: 88,
  pressureDeltaKPa: 4.4,
  temperatureSignalMv: initialTemperatureMv + 6,
  temperatureSignalTargetMv: initialTemperatureMv + 6,
  heatCapacityExperimentProfile: {
    u0MeasuredMv: 0,
    u1MeasuredMv: 116,
    u2MeasuredMv: 33,
    pumpPeakPressureMv: 118,
    ambientTemperatureMv: initialTemperatureMv,
    initialTemperatureMv,
    stableTemperatureMv: initialTemperatureMv,
    releaseTemperatureLowMv: initialTemperatureMv - 12,
    recoveryTemperatureMv: initialTemperatureMv,
  },
};
const profileAdjustedSample = captureHeatCapacityWorkbenchSample(
  profiledManualSampleSource,
  'stableBeforeReleaseSample',
  10_300,
);
assert.equal(profileAdjustedSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.pressureSignalMv, 116);
const manualActualSample = captureHeatCapacityWorkbenchSample(
  profiledManualSampleSource,
  'stableBeforeReleaseSample',
  10_300,
  { applyProfile: false },
);
assert.equal(manualActualSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.pressureSignalMv, 88, 'manual recording should preserve the current instrument reading instead of the profile U1');
assert.equal(manualActualSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.temperatureSignalMv, initialTemperatureMv + 6, 'manual recording should preserve the current temperature reading so unstable data is rejected upstream');

const recordedHeatCapacityTrials = [
  {
    id: 'heat-trial-1',
    trialIndex: 1,
    U1Mv: 106.2,
    U2Mv: 30.4,
    UT1Mv: 1499.1,
    UT2Mv: 1499,
    status: 'complete' as const,
    recordedU1At: 10_000,
    recordedU2At: 12_000,
  },
  {
    id: 'heat-trial-2',
    trialIndex: 2,
    U1Mv: 104.8,
    U2Mv: 31.1,
    UT1Mv: 1499,
    UT2Mv: 1499.1,
    status: 'complete' as const,
    recordedU1At: 20_000,
    recordedU2At: 22_000,
  },
];
const removedU2Record = removeHeatCapacityTrialRecord(recordedHeatCapacityTrials, 0, 'u2');
assert.equal(removedU2Record.nextActiveTrialIndex, 0);
assert.equal(removedU2Record.trials[0].U1Mv, 106.2);
assert.equal(removedU2Record.trials[0].UT1Mv, 1499.1);
assert.equal(removedU2Record.trials[0].U2Mv, null);
assert.equal(removedU2Record.trials[0].UT2Mv, null);
assert.equal(removedU2Record.trials[0].recordedU2At, null);
assert.equal(removedU2Record.trials[0].status, 'partial');
assert.equal(removedU2Record.trials[1].status, 'complete', 'removing one heat-capacity record should not delete later independent trial groups');

const removedU1Record = removeHeatCapacityTrialRecord(recordedHeatCapacityTrials, 0, 'u1');
assert.equal(removedU1Record.nextActiveTrialIndex, 0);
assert.equal(removedU1Record.trials[0].U1Mv, null);
assert.equal(removedU1Record.trials[0].UT1Mv, null);
assert.equal(removedU1Record.trials[0].U2Mv, null);
assert.equal(removedU1Record.trials[0].UT2Mv, null);
assert.equal(removedU1Record.trials[0].recordedU1At, null);
assert.equal(removedU1Record.trials[0].recordedU2At, null);
assert.equal(removedU1Record.trials[0].status, 'waiting');
assert.equal(removedU1Record.trials[1].U1Mv, 104.8, 'removing U1 from one group should keep later groups intact');

const rapidPumpSecondStroke = registerHeatCapacityPumpStroke({
  ...openValvePump,
  pumpBulbState: 'compressing',
}, 10_120);
assert.equal(rapidPumpSecondStroke.pumpStrokeCount, 2);
assert.equal(rapidPumpSecondStroke.pumpStrokeTimestamps.length, 2);
assert.equal(rapidPumpSecondStroke.pumpFrequency > openValvePump.pumpFrequency, true);
assert.equal(rapidPumpSecondStroke.pumpBulbState, 'compressing');

const rapidPumpThirdStroke = registerHeatCapacityPumpStroke({
  ...rapidPumpSecondStroke,
  pumpBulbState: 'releasing',
}, 10_240);
assert.equal(rapidPumpThirdStroke.pumpStrokeCount, 3);
assert.equal(rapidPumpThirdStroke.pumpStrokeTimestamps.length, 3);
assert.equal(rapidPumpThirdStroke.pumpFrequencyStatus, 'suitable');

const suitablePump = registerHeatCapacityPumpStroke({
  ...openValvePump,
  pumpStrokeTimestamps: [7_200, 8_400],
}, 10_000);
assert.equal(suitablePump.pumpFrequencyStatus, 'suitable');
assert.equal(suitablePump.pumpFrequency >= 0.5, true);
assert.equal(suitablePump.pressurePlaceholder > openValvePump.pressurePlaceholder, true);
assert.equal(suitablePump.pumpHint, '打气频率合适，可以继续观察压强变化');

assert.equal(normalizeHeatCapacityStopcockAngle(-90), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(0), 0);
assert.equal(normalizeHeatCapacityStopcockAngle(9), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(44), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(46), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(90), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(135), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(180), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(270), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(315), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(350), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(360), 0);
assert.equal(normalizeHeatCapacityStopcockAngle(450), 90);

assert.equal(getHeatCapacityStopcockTargetAngle(true), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(getHeatCapacityStopcockTargetAngle(false), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(getHeatCapacityStopcockState(0), 'open');
assert.equal(getHeatCapacityStopcockState(44), 'open');
assert.equal(getHeatCapacityStopcockState(46), 'closed');
assert.equal(getHeatCapacityStopcockState(90), 'closed');
assert.equal(getHeatCapacityStopcockState(180), 'closed');
assert.equal(getHeatCapacityStopcockState(270), 'closed');
assert.equal(getHeatCapacityStopcockState(350), 'open');

assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
}), true);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
}), false);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: false,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
}), false);

const restored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [{
    ...defaultFile,
    powerOn: true,
    stopcockAngleDeg: 359,
    glassPistonState: 'open',
    pressureZeroed: true,
    pressureSignalMv: 0,
    pressureReleaseBurstUntilMs: 123_456,
  }],
});

const restoredHeatFile = restored.files[0];
assert.equal(restoredHeatFile.kind, 'heatCapacity');
assert.equal(restoredHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(restoredHeatFile.glassPistonState, 'open');
assert.equal(restoredHeatFile.pressureZeroed, true);
assert.equal(restoredHeatFile.pressureSignalMv, 0);
assert.equal(restoredHeatFile.pressureReleaseBurstUntilMs, 123_456);

const legacyFile = { ...defaultFile } as Record<string, unknown>;
delete legacyFile.stopcockAngleDeg;
delete legacyFile.pressureZeroed;
delete legacyFile.temperatureSignalMv;
delete legacyFile.pressureSignalMv;

const legacyRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [legacyFile],
});

const legacyHeatFile = legacyRestored.files[0];
assert.equal(legacyHeatFile.kind, 'heatCapacity');
assert.equal(legacyHeatFile.powerOn, false);
assert.equal(legacyHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(legacyHeatFile.glassPistonState, 'closed');
assert.equal(legacyHeatFile.pressureZeroed, false);
assert.equal(legacyHeatFile.temperatureSignalMv, null);
assert.equal(legacyHeatFile.pressureSignalMv, null);
assert.equal(legacyHeatFile.pumpValveOpen, false);
assert.equal(legacyHeatFile.pumpFrequencyStatus, 'idle');
assert.deepEqual(legacyHeatFile.pumpStrokeTimestamps, []);
assert.equal(legacyHeatFile.pressureReleaseBurstUntilMs, null);

const legacyOpenFile = { ...defaultFile, stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG, glassPistonState: 'open' };
const legacyOpenRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [legacyOpenFile],
});
const legacyOpenHeatFile = legacyOpenRestored.files[0];
assert.equal(legacyOpenHeatFile.kind, 'heatCapacity');
assert.equal(legacyOpenHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(legacyOpenHeatFile.glassPistonState, 'open');

console.log('workbenchHeatCapacityInstrument tests passed');
