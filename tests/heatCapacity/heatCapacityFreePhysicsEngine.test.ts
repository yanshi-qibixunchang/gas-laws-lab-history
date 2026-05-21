import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';

const baseConfig: HeatCapacityFreePhysicsConfig = {
  environment: {
    ambientTemperatureK: 298.15,
    ambientPressureKPa: 101.3,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.015,
  pumpTemperatureGainK: 0.35,
  stopcockFlowRate: 4,
  releaseCoolingFactor: 1,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
};

const controls: HeatCapacityFreeControls = {
  powerOn: true,
  pumpValveOpen: false,
  stopcockOpen: false,
};

const expectClose = (actual: number, expected: number, tolerance: number, message: string) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const pumpOnce = (
  state: HeatCapacityFreePhysicsState,
  atS: number,
  strength = 1,
) => applyFreePumpStroke(
  state,
  baseConfig,
  {
    ...controls,
    pumpValveOpen: true,
  },
  { atS, strength },
).state;

const createPumpedSequence = () => {
  let state = createDefaultFreePhysicsState(baseConfig);
  for (let index = 0; index < 5; index += 1) {
    state = pumpOnce(state, index + 1);
  }
  const pumpedState = state;
  let settledState = pumpedState;
  for (let index = 0; index < 30; index += 1) {
    settledState = stepFreePhysics(settledState, baseConfig, controls, 1, 10 + index);
  }
  return { pumpedState, settledState };
};

const initial = createDefaultFreePhysicsState(baseConfig);
const initialDerived = deriveFreePhysicalState(initial, baseConfig);
assert.equal(initial.gasAmountRatio, 1);
assert.equal(initial.gasTemperatureK, baseConfig.environment.ambientTemperatureK);
assert.equal(initial.wallTemperatureK, baseConfig.environment.ambientTemperatureK);
assert.equal(initialDerived.gasPressureKPa, baseConfig.environment.ambientPressureKPa);
assert.equal(initialDerived.pressureDeltaKPa, 0);

const modifiedAmount = {
  ...initial,
  gasAmountRatio: 1.12,
};
const modifiedTemperature = {
  ...modifiedAmount,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK + 12,
};
assert.equal(
  deriveFreePhysicalState(modifiedAmount, baseConfig).gasPressureKPa >
    deriveFreePhysicalState(initial, baseConfig).gasPressureKPa,
  true,
  'pressure should be derived from gas amount',
);
assert.equal(
  deriveFreePhysicalState(modifiedTemperature, baseConfig).gasPressureKPa >
    deriveFreePhysicalState(modifiedAmount, baseConfig).gasPressureKPa,
  true,
  'pressure should be derived from gas temperature',
);
assert.equal(
  'gasPressureKPa' in initial,
  false,
  'physical state must not store pressure as independent long-lived truth',
);

const hotSealed = {
  ...initial,
  gasAmountRatio: 1.08,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK + 10,
};
const hotSealedPressure = deriveFreePhysicalState(hotSealed, baseConfig).gasPressureKPa;
const cooledSealed = stepFreePhysics(hotSealed, baseConfig, controls, 2, 12);
assert.equal(cooledSealed.gasAmountRatio, hotSealed.gasAmountRatio, 'closed waiting should preserve amount');
assert.equal(cooledSealed.gasTemperatureK < hotSealed.gasTemperatureK, true);
assert.equal(cooledSealed.wallTemperatureK > hotSealed.wallTemperatureK, true);
assert.equal(
  (cooledSealed.gasTemperatureK - baseConfig.environment.ambientTemperatureK) /
    (hotSealed.gasTemperatureK - baseConfig.environment.ambientTemperatureK) >
    0.7,
  true,
  'closed waiting should cool through vessel-wall inertia instead of snapping back to ambient',
);
assert.equal(
  deriveFreePhysicalState(cooledSealed, baseConfig).gasPressureKPa < hotSealedPressure,
  true,
  'closed waiting pressure should change through temperature relaxation only',
);

const pumped = pumpOnce(initial, 1, 1.25);
assert.equal(pumped.pumpStrokeCount, 1);
assert.equal(pumped.gasAmountRatio > initial.gasAmountRatio, true);
assert.equal(pumped.gasTemperatureK > initial.gasTemperatureK, true);
assert.equal(pumped.wallTemperatureK, initial.wallTemperatureK);
assert.equal(
  deriveFreePhysicalState(pumped, baseConfig).gasPressureKPa > initialDerived.gasPressureKPa,
  true,
);
assert.equal(pumped.maxPressureKPa, deriveFreePhysicalState(pumped, baseConfig).gasPressureKPa);

const accepted = applyFreePumpStroke(
  initial,
  baseConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 2, strength: 1 },
);
assert.equal(accepted.accepted, true);
assert.equal(accepted.reason, 'accepted');
assert.equal(accepted.state.pumpStrokeCount, 1);
expectClose(
  accepted.state.gasTemperatureK,
  baseConfig.environment.ambientTemperatureK + baseConfig.pumpTemperatureGainK,
  0.000000001,
  'pump stroke should heat only gas',
);
assert.equal(accepted.state.wallTemperatureK, initial.wallTemperatureK);
assert.equal(
  accepted.state.maxPressureKPa > initial.maxPressureKPa,
  true,
  'accepted pump stroke should immediately raise max pressure without requiring a continuous step',
);

const rejectCases: Array<[
  string,
  HeatCapacityFreePhysicsState,
  HeatCapacityFreeControls,
]> = [
  ['powerOff', initial, { ...controls, powerOn: false, pumpValveOpen: true }],
  ['pumpValveClosed', initial, controls],
  ['stopcockOpen', initial, { ...controls, pumpValveOpen: true, stopcockOpen: true }],
  [
    'pressureDanger',
    {
      ...initial,
      gasAmountRatio: 1.5,
      maxPressureKPa: deriveFreePhysicalState({ ...initial, gasAmountRatio: 1.5 }, baseConfig).gasPressureKPa,
    },
    { ...controls, pumpValveOpen: true },
  ],
];

for (const [expectedReason, state, caseControls] of rejectCases) {
  const result = applyFreePumpStroke(state, baseConfig, caseControls, { atS: 3, strength: 1 });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, expectedReason);
  assert.deepEqual(result.state, state, `${expectedReason} reject must not mutate physical state`);
}

{
  let state = createDefaultFreePhysicsState(baseConfig);
  for (let index = 0; index < 4; index += 1) {
    state = pumpOnce(state, index * 0.1);
  }
  for (let step = 0; step < 90; step += 1) {
    state = stepFreePhysics(state, baseConfig, controls, 1, step + 1);
  }
  const u1Mv = deriveFreePhysicalState(state, baseConfig).pressureDeltaKPa * 20;
  assert.ok(u1Mv >= 115);
  assert.ok(u1Mv <= 125);
}

const aboveAmbient = {
  ...initial,
  gasAmountRatio: 1.1,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK,
};
const vented = stepFreePhysics(
  aboveAmbient,
  baseConfig,
  { ...controls, stopcockOpen: true },
  0.2,
  20,
);
assert.equal(vented.gasAmountRatio < aboveAmbient.gasAmountRatio, true, 'above-ambient pressure should vent gas out');

const belowAmbient = {
  ...initial,
  gasAmountRatio: 0.92,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK,
};
const filled = stepFreePhysics(
  belowAmbient,
  baseConfig,
  { ...controls, stopcockOpen: true },
  0.2,
  21,
);
assert.equal(filled.gasAmountRatio > belowAmbient.gasAmountRatio, true, 'below-ambient pressure should draw gas in');

const { pumpedState: state1, settledState: settled } = createPumpedSequence();
const settledDerived = deriveFreePhysicalState(settled, baseConfig);
const opened = stepFreePhysics(
  settled,
  baseConfig,
  { ...controls, stopcockOpen: true },
  0.05,
  50,
);
assert.notEqual(opened.releaseReference, null);
assert.equal(opened.releaseReference?.openedAtS, 50);
assert.equal(opened.releaseReference?.pressureBeforeKPa, settledDerived.gasPressureKPa);
assert.equal(opened.releaseReference?.temperatureBeforeK, settled.gasTemperatureK);
assert.equal(opened.releaseReference?.amountBeforeRatio, settled.gasAmountRatio);

const quickReleased = opened;
assert.notEqual(quickReleased.releaseReference?.reachedAmbientAtS, null);
let recovered = quickReleased;
for (let index = 0; index < 50; index += 1) {
  recovered = stepFreePhysics(recovered, baseConfig, controls, 0.5, 51 + index * 0.5);
}
assert.equal(settled.gasAmountRatio > initial.gasAmountRatio, true, 'state 2 amount should remain above initial after pumping');
assert.equal(quickReleased.gasAmountRatio < settled.gasAmountRatio, true, 'state 3 quick release should reduce amount');
assert.equal(quickReleased.gasAmountRatio > initial.gasAmountRatio, true, 'state 3 amount should remain above initial after a good release');
assert.equal(recovered.gasAmountRatio, quickReleased.gasAmountRatio, 'state 4 recovery should preserve state 3 amount');
assert.equal(state1.gasTemperatureK > initial.gasTemperatureK, true, 'state 1 temperature should be above ambient');
assert.equal(settled.gasTemperatureK > initial.gasTemperatureK, true, 'state 2 should retain some wall-mediated heat');
assert.equal(settled.gasTemperatureK < state1.gasTemperatureK, true, 'state 2 should cool from the post-pump state');
assert.equal(quickReleased.gasTemperatureK < initial.gasTemperatureK, true, 'state 3 temperature should drop below ambient');
assert.equal(recovered.gasTemperatureK > quickReleased.gasTemperatureK, true, 'state 4 temperature should recover from release cooling');
assert.equal(recovered.gasTemperatureK < initial.gasTemperatureK, true, 'state 4 should still recover gradually through wall inertia');
assert.equal(
  deriveFreePhysicalState(state1, baseConfig).gasPressureKPa > settledDerived.gasPressureKPa,
  true,
  'P1 should be greater than P2 after sealed settling',
);
assert.equal(
  settledDerived.gasPressureKPa > deriveFreePhysicalState(recovered, baseConfig).gasPressureKPa,
  true,
  'P2 should be greater than P4',
);
assert.equal(
  deriveFreePhysicalState(recovered, baseConfig).gasPressureKPa > deriveFreePhysicalState(quickReleased, baseConfig).gasPressureKPa,
  true,
  'P4 should be greater than P3',
);
expectClose(
  deriveFreePhysicalState(quickReleased, baseConfig).gasPressureKPa,
  baseConfig.environment.ambientPressureKPa,
  0.03,
  'P3 should be ambient immediately after quick release',
);
const deltaPBefore = settledDerived.pressureDeltaKPa;
const deltaPAfter = deriveFreePhysicalState(recovered, baseConfig).pressureDeltaKPa;
expectClose(
  deltaPAfter,
  deltaPBefore * (1 - 1 / baseConfig.gamma),
  0.35,
  'quick-release recovery should follow the locked adiabatic formula',
);

let longOpen = opened;
for (let index = 0; index < 120; index += 1) {
  longOpen = stepFreePhysics(
    longOpen,
    baseConfig,
    { ...controls, stopcockOpen: true },
    0.25,
    60 + index * 0.25,
  );
}
expectClose(
  deriveFreePhysicalState(longOpen, baseConfig).gasPressureKPa,
  baseConfig.environment.ambientPressureKPa,
  0.03,
  'long-open pressure should approach ambient without rebound',
);
expectClose(
  longOpen.gasTemperatureK,
  baseConfig.environment.ambientTemperatureK,
  0.3,
  'long-open temperature should approach ambient without rebound',
);

const afterState4Closed = stepFreePhysics(recovered, baseConfig, controls, 1, 100);
assert.equal(afterState4Closed.gasAmountRatio, recovered.gasAmountRatio, 'state 4 closed wait should preserve amount');
const reopened = stepFreePhysics(
  afterState4Closed,
  baseConfig,
  { ...controls, stopcockOpen: true },
  0.1,
  101,
);
assert.equal(
  reopened.gasAmountRatio < afterState4Closed.gasAmountRatio,
  true,
  'reopening after recovery should vent again while pressure remains above ambient',
);

const deterministicA = stepFreePhysics(opened, baseConfig, { ...controls, stopcockOpen: true }, 0.1, 70);
const deterministicB = stepFreePhysics(opened, baseConfig, { ...controls, stopcockOpen: true }, 0.1, 70);
assert.deepEqual(deterministicA, deterministicB, 'physics stepping should be deterministic from explicit inputs');
assert.deepEqual(
  applyFreePumpStroke(initial, baseConfig, { ...controls, pumpValveOpen: true }, { atS: 5, strength: 0.8 }),
  applyFreePumpStroke(initial, baseConfig, { ...controls, pumpValveOpen: true }, { atS: 5, strength: 0.8 }),
  'pump events should be deterministic from explicit inputs',
);

const physicsSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreePhysicsEngine.ts'),
  'utf8',
);
assert.doesNotMatch(physicsSource, /Date\.now\s*\(/, 'free physics must not depend on Date.now()');
assert.doesNotMatch(physicsSource, /Math\.random\s*\(/, 'free physics must not depend on randomness');

console.log('heatCapacityFreePhysicsEngine tests passed');


