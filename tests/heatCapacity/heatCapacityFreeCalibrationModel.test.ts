import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FREE_U0_ZERO_TOLERANCE_MV,
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
  getFreeCorrectedSignals,
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';

const createCalibrationState = (): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 0,
  zeroOffsetMv: 0,
  zeroEvents: [],
  automaticU0: null,
});

const zeroEventInput = {
  atS: 4,
  displayPressureMv: 0.18,
  displayTemperatureMv: 1499.1,
  zeroOffsetMv: 0.18,
  source: 'user' as const,
};

const zeroed = applyFreeZeroCalibration(createCalibrationState(), zeroEventInput);
assert.equal(zeroed.calibrationVersion, 1);
assert.equal(zeroed.zeroOffsetMv, zeroEventInput.zeroOffsetMv);
assert.deepEqual(zeroed.zeroEvents, [
  {
    id: 'zero-1',
    ...zeroEventInput,
  },
]);
assert.equal(zeroed.automaticU0, null);

const captured = captureAutomaticU0IfReady(zeroed, {
  atS: 6,
  powerOn: true,
  stopcockOpen: true,
  zeroed: true,
  zeroEventId: 'zero-1',
  pressureStable: true,
  temperatureStable: true,
  displayPressureMv: 0.02,
  displayTemperatureMv: 1499.05,
});
assert.deepEqual(captured.automaticU0, {
  displayPressureMv: 0.02,
  displayTemperatureMv: 1499.05,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
  atS: 6,
});

const notReadyCases = [
  ['power off', { powerOn: false }],
  ['stopcock closed', { stopcockOpen: false }],
  ['not zeroed', { zeroed: false }],
  ['pressure drifting', { pressureStable: false }],
  ['temperature drifting', { temperatureStable: false }],
] as const;

for (const [label, override] of notReadyCases) {
  const result = captureAutomaticU0IfReady(zeroed, {
    atS: 7,
    powerOn: true,
    stopcockOpen: true,
    zeroed: true,
    zeroEventId: 'zero-1',
    pressureStable: true,
    temperatureStable: true,
    displayPressureMv: 0,
    displayTemperatureMv: 1499,
    ...override,
  });
  assert.equal(result.automaticU0, null, `automatic U0 should not capture when ${label}`);
}

const pressureOutsideTolerance = captureAutomaticU0IfReady(zeroed, {
  atS: 8,
  powerOn: true,
  stopcockOpen: true,
  zeroed: true,
  zeroEventId: 'zero-1',
  pressureStable: true,
  temperatureStable: true,
  displayPressureMv: FREE_U0_ZERO_TOLERANCE_MV + 0.01,
  displayTemperatureMv: 1499,
});
assert.equal(pressureOutsideTolerance.automaticU0, null);

const staleZeroEvent = captureAutomaticU0IfReady(zeroed, {
  atS: 8,
  powerOn: true,
  stopcockOpen: true,
  zeroed: true,
  zeroEventId: 'zero-0',
  pressureStable: true,
  temperatureStable: true,
  displayPressureMv: 0,
  displayTemperatureMv: 1499,
});
assert.equal(staleZeroEvent.automaticU0, null);

const reZeroed = applyFreeZeroCalibration(captured, {
  ...zeroEventInput,
  atS: 10,
  displayPressureMv: -0.11,
  zeroOffsetMv: -0.11,
});
assert.equal(reZeroed.calibrationVersion, 2);
assert.equal(reZeroed.zeroEvents.at(-1)?.id, 'zero-2');
assert.equal(reZeroed.automaticU0, null, 'later zero event should invalidate prior automatic U0');
assert.equal(
  captureAutomaticU0IfReady(reZeroed, {
    atS: 11,
    powerOn: true,
    stopcockOpen: true,
    zeroed: true,
    zeroEventId: 'zero-1',
    pressureStable: true,
    temperatureStable: true,
    displayPressureMv: 0,
    displayTemperatureMv: 1499,
  }).automaticU0,
  null,
  'old zero event id must not be reused after re-zeroing',
);

const corrected = getFreeCorrectedSignals({
  U0DisplayMv: 0.25,
  U1DisplayMv: 112.25,
  U2DisplayMv: 32.25,
});
assert.equal(corrected.U1CorrectedMv, 112);
assert.equal(corrected.U2CorrectedMv, 32);
assert.equal(
  corrected.gamma,
  Math.log((101.3 + 112 / 20) / 101.3) /
    Math.log((101.3 + 112 / 20) / (101.3 + 32 / 20)),
);

const physicsState = {
  simulationTimeS: 3,
  gasAmountRatio: 1.08,
  gasTemperatureK: 299,
  pumpStrokeCount: 3,
};
const physicsBefore = structuredClone(physicsState);
applyFreeZeroCalibration(createCalibrationState(), zeroEventInput);
assert.deepEqual(physicsState, physicsBefore, 'zero calibration should be separate from physical state');

const source = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreeCalibrationModel.ts'),
  'utf8',
);
assert.doesNotMatch(source, /Date\.now\s*\(/, 'zero event ids must not use Date.now()');
assert.doesNotMatch(source, /Math\.random\s*\(/, 'zero event ids must not use randomness');
assert.doesNotMatch(source, /gasAmountRatio|gasTemperatureK|pumpStrokeCount/, 'calibration model must not write physical state fields');

console.log('heatCapacityFreeCalibrationModel tests passed');


