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
  getHeatCapacityStopcockState,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
  markHeatCapacityDemoComplete,
  registerHeatCapacityPumpStroke,
  normalizeHeatCapacityStopcockAngle,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  stepHeatCapacityWorkbenchFile,
} from '../components/workbenchState.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
} from '../components/workbenchSession.ts';

const defaultFile = createDefaultHeatCapacityFile(1);

assert.equal(defaultFile.powerOn, false);
assert.equal(defaultFile.stopcockAngleDeg, 0);
assert.equal(defaultFile.glassPistonState, 'closed');
assert.equal(defaultFile.pressureZeroed, false);
assert.equal(defaultFile.pressureZeroAdjusted, false);
assert.equal(defaultFile.pressureZeroKnobAngle, 0);
assert.equal(defaultFile.pressureZeroOffset, 0);
assert.equal(defaultFile.pressureZeroAdjustMode, 'none');
assert.equal(defaultFile.heatCapacityPhase, 'powerOff');
assert.equal(defaultFile.ambientPressureKPa, 101.33);
assert.equal(defaultFile.ambientTemperatureK, 298.15);
assert.equal(defaultFile.gasPressureKPaAbs, 101.33);
assert.equal(defaultFile.gasTemperatureK, 298.15);
assert.equal(defaultFile.pressureDeltaKPa, 0);
assert.equal(defaultFile.pressureRawPlaceholder, 0);
assert.equal(defaultFile.pressureDisplayedPlaceholder, 0);
assert.equal(defaultFile.pressureGaugeDisplayValue, 0);
assert.equal(defaultFile.gaugePressureMinKPa, 0);
assert.equal(defaultFile.gaugePressureMaxKPa, 30);
assert.equal(defaultFile.pressureSafetyThresholdKPa, 24);
assert.equal(defaultFile.pressureOverLimit, false);
assert.equal(defaultFile.temperatureSignalMv, null);
assert.equal(defaultFile.pressureSignalMv, null);
assert.equal(defaultFile.temperatureSignalTargetMv, 1500);
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
assert.equal(defaultFile.pressurePlaceholder, 101.33);
assert.equal(defaultFile.temperaturePlaceholder, 298.15);
assert.deepEqual(defaultFile.heatCapacityTrace, []);
assert.deepEqual(defaultFile.heatCapacityProcessSamples, {});
assert.equal(canZeroHeatCapacityPressure(defaultFile), false);
assert.equal(applyHeatCapacityPressureZero(3.2, 0.7), 2.5);

const poweredFile = powerHeatCapacityWorkbenchFile(defaultFile, true, 1_000);
assert.equal(poweredFile.powerOn, true);
assert.equal(poweredFile.heatCapacityPhase, 'readyToZero');
assert.equal(poweredFile.temperatureSignalMv, 1500);
assert.equal(poweredFile.pressureSignalMv, 0);
assert.equal(poweredFile.temperatureSignalTargetMv, 1500);
assert.equal(poweredFile.pressureSignalTargetMv, 0);
assert.equal(poweredFile.heatCapacityTrace.length, 1);

const pressureLoadedFile = {
  ...poweredFile,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 0.16,
  pressureDeltaKPa: 0.16,
  pressureSignalMvRaw: 3.2,
  pressureSignalMvDisplayed: 3.2,
  pressureRawPlaceholder: 3.2,
  pressureDisplayedPlaceholder: 3.2,
  pressureGaugeDisplayValue: 3.2,
  pressureSignalMv: 3.2,
};
const fineZero = adjustHeatCapacityPressureZeroFine({
  ...pressureLoadedFile,
}, 1, 1_080);
assert.equal(fineZero.pressureZeroAdjusted, true);
assert.equal(fineZero.pressureZeroed, true);
assert.equal(fineZero.pressureZeroAdjustMode, 'fineWheel');
assert.equal(fineZero.pressureZeroKnobAngle, 2);
assert.equal(fineZero.pressureZeroOffset, 0.02);
assert.equal(fineZero.pressureDisplayedPlaceholder, 3.18);
assert.equal(fineZero.pressureSignalTargetMv, 3.18);
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
assert.equal(coarseZero.pressureDisplayedPlaceholder < fineZero.pressureDisplayedPlaceholder, true);
assert.equal(coarseZero.temperatureSignalMv, fineZero.temperatureSignalMv);

assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG), HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(0), 0);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG), HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV), HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(0), 0);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV), HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);

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
assert.equal(demoStart.stopcockAngleDeg, 0);
assert.equal(demoStart.glassPistonState, 'closed');
assert.equal(demoStart.pressureZeroAdjusted, false);
assert.equal(Math.abs(demoStart.pressureSignalTargetMv), 0.75);
assert.equal(demoStart.pressureDeltaKPa, 0);
assert.equal(demoStart.gasPressureKPaAbs, defaultFile.ambientPressureKPa);
assert.equal(demoStart.temperatureSignalTargetMv, 1500);
assert.equal(demoStart.temperatureSignalMv, 1500);

const completedDemo = markHeatCapacityDemoComplete({
  ...demoStart,
  powerOn: true,
  stopcockAngleDeg: 90,
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
assert.equal(completedDemo.stopcockAngleDeg, 0);
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

const pumpedTarget = registerHeatCapacityPumpStroke({
  ...demoStart,
  stopcockAngleDeg: 0,
  glassPistonState: 'closed',
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpStrokeTimestamps: [20_000, 20_600],
}, 21_000);
assert.equal(pumpedTarget.pressureSignalTargetMv > demoStart.pressureSignalTargetMv, true);
assert.equal(pumpedTarget.pressureSignalMv < pumpedTarget.pressureSignalTargetMv, true);
assert.equal(pumpedTarget.temperatureSignalTargetMv > demoStart.temperatureSignalTargetMv, true);
assert.equal(pumpedTarget.temperatureSignalMv < pumpedTarget.temperatureSignalTargetMv, true);
assert.equal(pumpedTarget.pressureGaugeDisplayValue, pumpedTarget.pressureDeltaKPa);

const settledDisplay = stepHeatCapacityWorkbenchFile(pumpedTarget, 22_000);
assert.equal(settledDisplay.pressureSignalMv > pumpedTarget.pressureSignalMv, true);
assert.equal(settledDisplay.temperatureSignalMv > pumpedTarget.temperatureSignalMv, true);
assert.equal(settledDisplay.pressureGaugeDisplayValue, settledDisplay.pressureDeltaKPa);

assert.deepEqual(getHeatCapacityGaugePressureState(12, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 30,
  pressureSafetyThresholdKPa: 24,
  pressureGaugeDisplayValue: 12,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(32, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 30,
  pressureSafetyThresholdKPa: 24,
  pressureGaugeDisplayValue: 30,
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
assert.equal(openStopcockPump.pumpHint, '玻璃旋塞已接通，无法形成有效加压');

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
  pressureGaugeDisplayValue: poweredFile.pressureSafetyThresholdKPa,
  pressureOverLimit: true,
}, 10_000);
assert.equal(overLimitPump.pumpStrokeCount, 0);
assert.equal(overLimitPump.pressureDeltaKPa, poweredFile.pressureSafetyThresholdKPa);
assert.equal(overLimitPump.pressureOverLimit, true);
assert.match(overLimitPump.pumpHint, /安全阈值/);

const sampledWorkbenchFile = captureHeatCapacityWorkbenchSample({
  ...openValvePump,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  pumpFrequency: 0.67,
}, 'afterPumpSample', 10_200);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.afterPumpSample?.pumpValveOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.afterPumpSample?.stopcockOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.afterPumpSample?.pumpFrequency, 0.67);

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

assert.equal(normalizeHeatCapacityStopcockAngle(-90), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(0), 0);
assert.equal(normalizeHeatCapacityStopcockAngle(79), 79);
assert.equal(normalizeHeatCapacityStopcockAngle(80), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(85), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(86), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(90), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(94), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(95), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(100), 90);
assert.equal(normalizeHeatCapacityStopcockAngle(101), 101);
assert.equal(normalizeHeatCapacityStopcockAngle(180), 180);
assert.equal(normalizeHeatCapacityStopcockAngle(259), 259);
assert.equal(normalizeHeatCapacityStopcockAngle(260), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(265), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(266), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(270), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(274), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(275), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(280), 270);
assert.equal(normalizeHeatCapacityStopcockAngle(281), 281);
assert.equal(normalizeHeatCapacityStopcockAngle(360), 0);
assert.equal(normalizeHeatCapacityStopcockAngle(450), 90);

assert.equal(getHeatCapacityStopcockState(0), 'closed');
assert.equal(getHeatCapacityStopcockState(79), 'closed');
assert.equal(getHeatCapacityStopcockState(80), 'open');
assert.equal(getHeatCapacityStopcockState(85), 'open');
assert.equal(getHeatCapacityStopcockState(86), 'open');
assert.equal(getHeatCapacityStopcockState(90), 'open');
assert.equal(getHeatCapacityStopcockState(94), 'open');
assert.equal(getHeatCapacityStopcockState(95), 'open');
assert.equal(getHeatCapacityStopcockState(101), 'closed');
assert.equal(getHeatCapacityStopcockState(180), 'closed');
assert.equal(getHeatCapacityStopcockState(259), 'closed');
assert.equal(getHeatCapacityStopcockState(265), 'open');
assert.equal(getHeatCapacityStopcockState(266), 'open');
assert.equal(getHeatCapacityStopcockState(270), 'open');
assert.equal(getHeatCapacityStopcockState(274), 'open');
assert.equal(getHeatCapacityStopcockState(275), 'open');
assert.equal(getHeatCapacityStopcockState(281), 'closed');

assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: 90,
}), true);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: 270,
}), true);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: 79,
}), false);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: false,
  stopcockAngleDeg: 90,
}), false);

const restored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [{
    ...defaultFile,
    powerOn: true,
    stopcockAngleDeg: 89,
    glassPistonState: 'open',
    pressureZeroed: true,
    pressureSignalMv: 0,
  }],
});

const restoredHeatFile = restored.files[0];
assert.equal(restoredHeatFile.kind, 'heatCapacity');
assert.equal(restoredHeatFile.stopcockAngleDeg, 90);
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
assert.equal(legacyHeatFile.stopcockAngleDeg, 0);
assert.equal(legacyHeatFile.glassPistonState, 'closed');
assert.equal(legacyHeatFile.pressureZeroed, false);
assert.equal(legacyHeatFile.temperatureSignalMv, null);
assert.equal(legacyHeatFile.pressureSignalMv, null);
assert.equal(legacyHeatFile.pumpValveOpen, false);
assert.equal(legacyHeatFile.pumpFrequencyStatus, 'idle');
assert.deepEqual(legacyHeatFile.pumpStrokeTimestamps, []);

const legacyOpenFile = { ...defaultFile, stopcockAngleDeg: 0, glassPistonState: 'open' };
const legacyOpenRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [legacyOpenFile],
});
const legacyOpenHeatFile = legacyOpenRestored.files[0];
assert.equal(legacyOpenHeatFile.kind, 'heatCapacity');
assert.equal(legacyOpenHeatFile.stopcockAngleDeg, 90);
assert.equal(legacyOpenHeatFile.glassPistonState, 'open');

console.log('workbenchHeatCapacityInstrument tests passed');
