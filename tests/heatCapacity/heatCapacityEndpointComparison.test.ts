import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  ENDPOINT_METHODS, ENDPOINT_PROTOCOL, ENDPOINT_SCENARIOS,
  compareEndpoint, createEndpointObserver, observeEndpoint, prepareEndpointComparison,
  type EndpointObservation,
} from '../../scripts/analysis/heatCapacityEndpointComparisonModel.ts';
import {
  buildEndpointComparison, pairEndpointRows, renderEndpointComparisonReport, summarizeEndpointRows,
} from '../../scripts/analysis/runHeatCapacityEndpointComparison.ts';

const sample = (overrides: Partial<EndpointObservation> = {}): EndpointObservation => ({
  elapsedS: 0.1, flowOpen: true, pressureSampleElapsedS: 0.1, displayedPressureMv: 10,
  sound: { active: true, intensity: 0.5, stopReason: 'none' }, ...overrides,
});
const balanced = { active: false, intensity: 0, stopReason: 'pressure-balanced' } as const;
const initial = createEndpointObserver();
assert.equal(observeEndpoint(initial, 'sound-stop', sample({ sound: balanced })).cueAtS, null, 'initial silence is not an endpoint');
assert.equal(observeEndpoint(initial, 'display-zero', sample({ displayedPressureMv: 0 })).cueAtS, null, 'initial zero is not an endpoint');
assert.equal(observeEndpoint(initial, 'fixed-time', sample({ elapsedS: 2, flowOpen: false })).cueAtS, null);
assert.equal(observeEndpoint(initial, 'fixed-time', sample({ elapsedS: 0.599 })).cueAtS, null);
assert.equal(observeEndpoint(initial, 'fixed-time', sample({ elapsedS: 0.6 })).cueAtS, 0.6);

const sounding = observeEndpoint(initial, 'sound-stop', sample());
for (const stopReason of ['paused', 'path-closed'] as const) {
  assert.equal(observeEndpoint(sounding, 'sound-stop', sample({ sound: { ...balanced, stopReason } })).cueAtS, null);
}
const sounded = observeEndpoint(sounding, 'sound-stop', sample({ elapsedS: 0.2, sound: balanced }));
assert.equal(sounded.cueAtS, 0.2);
assert.equal(observeEndpoint(sounded, 'sound-stop', sample({ elapsedS: 0.3 })), sounded, 'first stop remains latched if sound restarts');

const positive = observeEndpoint(initial, 'display-zero', sample());
for (const pressureSampleElapsedS of [-0.1, 0.1, 0.4]) {
  assert.equal(observeEndpoint(positive, 'display-zero', sample({ elapsedS: 0.3, pressureSampleElapsedS, displayedPressureMv: 0 })).cueAtS, null,
    'pre-release, stale and future pressure samples cannot trigger');
}
for (const displayedPressureMv of [-0.1, 0.1]) {
  assert.equal(observeEndpoint(positive, 'display-zero', sample({ elapsedS: 0.2, pressureSampleElapsedS: 0.2, displayedPressureMv })).cueAtS, null,
    'nearby displayed values are not zero');
}
assert.equal(observeEndpoint(positive, 'display-zero', sample({ elapsedS: 0.2, pressureSampleElapsedS: 0.2, displayedPressureMv: 0 })).cueAtS, 0.2);

const freeze = (value: unknown) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
};
const prepared = prepareEndpointComparison(ENDPOINT_SCENARIOS[0], 11);
const before = JSON.stringify(prepared);
freeze(prepared);
const fixed = compareEndpoint(prepared, 'fixed-time', 0.15);
assert.deepEqual(fixed, compareEndpoint(prepared, 'fixed-time', 0.15), 'same starting snapshot is deterministic');
assert.equal(JSON.stringify(prepared), before, 'branches cannot mutate the preparation');
assert.equal(fixed.row.cueAtS, 0.6);
assert.equal(fixed.row.closeElapsedS, 0.75);
assert.equal(fixed.row.status, 'recorded');
const nearTime = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
nearTime(fixed.row.flowStartAtS - fixed.row.openCommandAtS, 0.42);
nearTime(fixed.row.closingCompletedAtS! - fixed.row.closeCommandAtS!, 0.42);
nearTime(fixed.row.u2RecordedAtS! - fixed.row.closingCompletedAtS!, 300);
nearTime(fixed.row.closeDurationFromStateS!, 0.75);
assert.equal(fixed.releaseState.phase, 'closedAfterRelease');
const closeIndex = fixed.trace.findIndex(point => point.phase === 'closing');
assert.equal(fixed.trace[closeIndex]!.atS, fixed.trace[closeIndex - 1]!.atS, 'closing command does not add a flow step');
assert.equal(fixed.trace[closeIndex]!.amountMol, fixed.trace[closeIndex - 1]!.amountMol);
assert.equal(fixed.trace[closeIndex]!.internalEnergyJ, fixed.trace[closeIndex - 1]!.internalEnergyJ);
assert.ok(fixed.trace.filter(point => point.phase === 'opening').every(point => !point.soundActive));

const noCue = compareEndpoint(prepared, 'fixed-time', 0, { observationLimitS: 0.1 });
const lateReaction = compareEndpoint(prepared, 'fixed-time', 0.3, { observationLimitS: 0.65 });
assert.equal(noCue.row.status, 'no-cue-within-observation');
assert.equal(lateReaction.row.status, 'reaction-exceeds-observation');
assert.equal(lateReaction.row.cueAtS, 0.6);
for (const result of [noCue, lateReaction]) {
  assert.equal(result.releaseState.phase, 'releasing');
  assert.equal(result.row.closeCommandAtS, null);
  assert.equal(result.row.u2Mv, null);
  assert.equal(result.row.gamma, null);
  assert.equal(result.trial, prepared.trial, 'failed endpoint must not invent a record');
}
for (const stepS of [0, 1e-12, 0.041, NaN, Infinity]) {
  assert.throws(() => compareEndpoint(prepared, 'fixed-time', 0, { stepS }), /bounded/);
}
for (const delay of [-1, NaN, Infinity, 1.1]) assert.throws(() => compareEndpoint(prepared, 'fixed-time', delay), /bounded/);
for (const observationLimitS of [0, NaN, Infinity, 31]) assert.throws(() => compareEndpoint(prepared, 'fixed-time', 0, { observationLimitS }), /bounded/);

const data = buildEndpointComparison();
assert.equal(data.runs.length, 135);
assert.equal(data.refinedRuns.length, 135);
assert.equal(data.groups.length, 27);
assert.equal(data.preparedStates.length, 15);
for (const row of [...data.runs, ...data.refinedRuns]) {
  const start = data.preparedStates.find(item => item.scenario === row.scenario && item.seed === row.seed)!;
  assert.equal(row.u1Mv, start.trial.u1!.displayPressureMv, 'all paired methods share the same recorded U1');
  assert.equal(row.u0Mv, 0);
  if (row.status === 'recorded') {
    const p0 = prepared.configs.physics.environment.ambientPressureKPa;
    const sensitivity = prepared.configs.sensor.pressureMvPerKPa;
    const p1 = p0 + (row.u1Mv - row.u0Mv) / sensitivity;
    const p2 = p0 + (row.u2Mv! - row.u0Mv) / sensitivity;
    assert.equal(row.gamma, Number((Math.log(p1 / p0) / Math.log(p1 / p2)).toFixed(6)),
      'independent recalculation uses only recorded displayed voltages and configured P0/sensitivity');
    nearTime(row.closeElapsedS!, row.cueAtS! + row.reactionDelayS);
    nearTime(row.u2RecordedAtS!, row.closeCommandAtS! + 0.42 + 300);
  } else {
    assert.equal(row.gamma, null);
    assert.equal(row.u2Mv, null);
    assert.equal(row.closeCommandAtS, null);
  }
  assert.match(row.traceSha256, /^[a-f\d]{64}$/);
}
for (const { row, trace, trial } of data.representatives) {
  assert.equal(createHash('sha256').update(JSON.stringify(trace)).digest('hex'), row.traceSha256);
  let observer = createEndpointObserver();
  for (const point of trace.filter(point => point.phase === 'releasing')) {
    observer = observeEndpoint(observer, row.method, { ...point, flowOpen: true,
      sound: { active: point.soundActive, intensity: point.soundIntensity, stopReason: point.soundStopReason } });
  }
  assert.equal(observer.cueAtS, row.cueAtS, 'reported cue is first observable cue in the retained trajectory');
  if (trial.correctedSignals) assert.equal(trial.correctedSignals.preheatBiasGamma, 0);
}
for (const group of data.groups) {
  assert.equal(group.base.total, ENDPOINT_PROTOCOL.seeds.length);
  assert.equal(Object.values(group.base.statuses).reduce((a, b) => a + b), group.base.total);
}
for (const [index, pair] of data.pairs.entries()) {
  assert.deepEqual(pair, pairEndpointRows(data.runs[index]!, data.refinedRuns[index]!));
  if (pair.baseGamma === null || pair.refinedGamma === null) assert.equal(pair.gammaDifference, null);
}
assert.throws(() => pairEndpointRows(data.runs[0]!, { ...data.refinedRuns[0]!, seed: 999 }), /Unpaired/);
const failed = { ...noCue.row, traceSha256: '' };
const summary = summarizeEndpointRows([{ ...fixed.row, traceSha256: '' }, failed]);
assert.equal(summary.total, 2, 'failed rows stay in the denominator');
assert.equal(summary.gamma.count, 1);
assert.equal(summary.statuses['no-cue-within-observation'], 1);
const absentPair = pairEndpointRows({ ...data.runs[0]!, gamma: null, cueAtS: null }, data.refinedRuns[0]!);
assert.equal(absentPair.gammaDifference, null);
assert.equal(absentPair.cueDifferenceS, null);
assert.ok(ENDPOINT_METHODS.every(method => data.runs.some(row => row.method === method)));
assert.match(renderEndpointComparisonReport(data), /不声称积分器收敛/);
console.log('Endpoint strategies, shared starts, exact record recalculation, timing, failures and all 135 step pairs passed.');
