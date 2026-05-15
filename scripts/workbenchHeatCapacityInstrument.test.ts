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
assert.equal(HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV, 100);
assert.equal(HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, 120);
assert.equal(HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, 140);
assert.equal(HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ, 2);
assert.equal(defaultFile.pressureWarningThresholdKPa, HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafeThresholdKPa, HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafetyThresholdKPa, HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafetyStatus, 'normal');
assert.equal(defaultFile.pressureSafetyMessage, null);
assert.equal(defaultFile.pressureBlockedPumping, false);
assert.equal(defaultFile.pressureOverLimit, false);
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

const completedDemo = markHeatCapacityDemoComplete({
  ...demoStart,
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

assert.deepEqual(getHeatCapacityGaugePressureState(12, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 10,
  pressureGaugeDisplayValue: 10,
  pressureGaugeNeedleAngle: 120,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'danger',
  pressureSafetyMessage: '压强超过安全阈值，请停止打气',
  pressureBlockedPumping: true,
  pressureOverLimit: true,
});
assert.deepEqual(getHeatCapacityGaugePressureState(6.2, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 6.2,
  pressureGaugeDisplayValue: 6.2,
  pressureGaugeNeedleAngle: 28.8,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'warning',
  pressureSafetyMessage: '压强接近预警值，请注意',
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(7.2, true, defaultFile, 7.1), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 7.2,
  pressureGaugeDisplayValue: 7.1,
  pressureGaugeNeedleAngle: 50.4,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'danger',
  pressureSafetyMessage: '压强超过安全阈值，请停止打气',
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
assert.equal(openValvePump.pressurePlaceholder > poweredFile.pressurePlaceholder, true);
assert.equal(openValvePump.temperaturePlaceholder > poweredFile.temperaturePlaceholder, true);

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
assert.match(overLimitPump.pumpHint, /安全阈值/);

const thresholdCrossingPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: 6.85,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 6.85,
  pressureSignalMvRaw: 137,
  pressureSignalMvDisplayed: 137,
  pressureSignalTargetMv: 137,
  pressureRawPlaceholder: 137,
  pressureDisplayedPlaceholder: 137,
  pressureGaugeTargetValue: 6.85,
  pressureGaugeDisplayValue: 6.85,
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
assert.match(blockedAfterCrossingPump.pumpHint, /安全阈值/);

const sampledWorkbenchFile = captureHeatCapacityWorkbenchSample({
  ...openValvePump,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  pumpFrequency: 0.67,
}, 'pumpPeakSample', 10_200);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpValveOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.stopcockOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpFrequency, 0.67);

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
  }],
});

const restoredHeatFile = restored.files[0];
assert.equal(restoredHeatFile.kind, 'heatCapacity');
assert.equal(restoredHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(restoredHeatFile.glassPistonState, 'open');
assert.equal(restoredHeatFile.pressureZeroed, true);
assert.equal(restoredHeatFile.pressureSignalMv, 0);

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
