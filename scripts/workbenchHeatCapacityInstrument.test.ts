import assert from 'node:assert/strict';
import {
  adjustHeatCapacityPressureZeroCoarse,
  adjustHeatCapacityPressureZeroFine,
  applyHeatCapacityPressureZero,
  canZeroHeatCapacityPressure,
  createDefaultHeatCapacityFile,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityStopcockState,
  registerHeatCapacityPumpStroke,
  normalizeHeatCapacityStopcockAngle,
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
assert.equal(defaultFile.pressureRawPlaceholder, 3.2);
assert.equal(defaultFile.pressureDisplayedPlaceholder, 3.2);
assert.equal(defaultFile.pressureGaugeDisplayValue, 3.2);
assert.equal(defaultFile.temperatureSignalMv, null);
assert.equal(defaultFile.pressureSignalMv, null);
assert.equal(defaultFile.pumpValveOpen, false);
assert.equal(defaultFile.pumpValveState, 'closed');
assert.equal(defaultFile.pumpBulbState, 'idle');
assert.deepEqual(defaultFile.pumpStrokeTimestamps, []);
assert.equal(defaultFile.pumpFrequency, 0);
assert.equal(defaultFile.pumpFrequencyStatus, 'idle');
assert.equal(defaultFile.lastPumpTime, null);
assert.equal(defaultFile.pumpStrokeCount, 0);
assert.equal(defaultFile.pressurePlaceholder, 101.33);
assert.equal(defaultFile.temperaturePlaceholder, 1);
assert.equal(canZeroHeatCapacityPressure(defaultFile), false);
assert.equal(applyHeatCapacityPressureZero(3.2, 0.7), 2.5);

const fineZero = adjustHeatCapacityPressureZeroFine({
  ...defaultFile,
  powerOn: true,
  pressureSignalMv: 3.2,
  temperatureSignalMv: 2.4,
}, 1);
assert.equal(fineZero.pressureZeroAdjusted, true);
assert.equal(fineZero.pressureZeroed, true);
assert.equal(fineZero.pressureZeroAdjustMode, 'fineWheel');
assert.equal(fineZero.pressureZeroKnobAngle, 2);
assert.equal(fineZero.pressureZeroOffset, 0.05);
assert.equal(fineZero.pressureDisplayedPlaceholder, 3.15);
assert.equal(fineZero.pressureSignalMv, 3.15);
assert.equal(fineZero.pressureGaugeDisplayValue, 3.15);
assert.equal(fineZero.temperatureSignalMv, 2.4);
assert.equal(fineZero.temperaturePlaceholder, defaultFile.temperaturePlaceholder);

const coarseZero = adjustHeatCapacityPressureZeroCoarse({
  ...fineZero,
  temperatureSignalMv: 2.4,
}, 90);
assert.equal(coarseZero.pressureZeroAdjustMode, 'coarseDrag');
assert.equal(coarseZero.pressureZeroKnobAngle, 92);
assert.equal(coarseZero.pressureZeroOffset > fineZero.pressureZeroOffset, true);
assert.equal(coarseZero.pressureDisplayedPlaceholder < fineZero.pressureDisplayedPlaceholder, true);
assert.equal(coarseZero.temperatureSignalMv, 2.4);

assert.deepEqual(getHeatCapacityPumpFrequencyState([], 10_000), {
  timestamps: [],
  pumpFrequency: 0,
  pumpFrequencyStatus: 'idle',
});
assert.equal(getHeatCapacityPumpFrequencyState([8_000], 10_000).pumpFrequencyStatus, 'tooSlow');
assert.equal(getHeatCapacityPumpFrequencyState([7_200, 8_400, 9_600], 10_000).pumpFrequencyStatus, 'suitable');
assert.equal(JSON.stringify(getHeatCapacityPumpFrequencyState([7_200, 8_400, 9_600], 10_000)).includes('tooFast'), false);

const closedValvePump = registerHeatCapacityPumpStroke(defaultFile, 10_000);
assert.equal(closedValvePump.pumpStrokeCount, 0);
assert.deepEqual(closedValvePump.pumpStrokeTimestamps, []);
assert.equal(closedValvePump.pumpFrequency, 0);
assert.equal(closedValvePump.pumpFrequencyStatus, 'idle');
assert.equal(closedValvePump.pressurePlaceholder, defaultFile.pressurePlaceholder);
assert.equal(closedValvePump.temperaturePlaceholder, defaultFile.temperaturePlaceholder);
assert.equal(closedValvePump.pressureKPa, defaultFile.pressureKPa);
assert.equal(closedValvePump.lastPumpTime, defaultFile.lastPumpTime);
assert.equal(closedValvePump.pumpHint, '打气阀门未打开，无法有效打气');

const openValvePump = registerHeatCapacityPumpStroke({
  ...defaultFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
}, 10_000);
assert.equal(openValvePump.pumpStrokeCount, 1);
assert.equal(openValvePump.pumpFrequencyStatus, 'tooSlow');
assert.equal(openValvePump.pressurePlaceholder > defaultFile.pressurePlaceholder, true);
assert.equal(openValvePump.temperaturePlaceholder > defaultFile.temperaturePlaceholder, true);

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
