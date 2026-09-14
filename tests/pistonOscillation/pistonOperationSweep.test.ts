import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  OPERATION_SWEEP_PROTOCOL, createSweepOperations, fitDisplayedHeightSet,
  observeOperation, operationKey, resolveDisplayedPeriod, sampleSummary,
  selectEarliestTwoCycles, simulateOperation,
} from '../../scripts/analysis/pistonOperationSweepModel.ts';
import { buildOperationSweep, renderOperationSweepReport } from '../../scripts/analysis/runPistonOperationSweep.ts';
import {
  createPistonOscillationPeriodSelection, normalizePistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';

const operations = createSweepOperations();
assert.equal(operations.length, 72);
assert.equal(new Set(operations.map(operationKey)).size, operations.length);
assert.deepEqual(OPERATION_SWEEP_PROTOCOL.heightsMm, [80, 70, 60, 50, 40, 30]);
assert.equal(operations.length * OPERATION_SWEEP_PROTOCOL.heightsMm.length * OPERATION_SWEEP_PROTOCOL.seeds.length, 2160);
assert.deepEqual(sampleSummary([]), { count: 0, min: null, max: null, mean: null, sampleSd: null, cvPercent: null });
assert.equal(sampleSummary([0, 0]).cvPercent, null);
assert.equal(sampleSummary([1, 2, 3]).sampleSd, 1);
assert.equal(sampleSummary([4]).sampleSd, null);
assert.throws(() => sampleSummary([NaN]), RangeError);

const normal = { dragReferencePx: 200, rampDurationS: 1.1, holdDurationS: 0 };
assert.throws(() => simulateOperation(20, normal), RangeError);
assert.throws(() => simulateOperation(80, { ...normal, dragReferencePx: Infinity }), RangeError);
assert.throws(() => simulateOperation(80, { ...normal, rampDurationS: 0.1005 }), RangeError);
assert.throws(() => simulateOperation(80, { ...normal, holdDurationS: -0.1 }), RangeError);

const simulation = simulateOperation(80, normal);
const simulationBefore = JSON.stringify(simulation);
const observation = observeOperation(simulation, 11);
const repeated = observeOperation(simulation, 11);
assert.deepEqual(observation, repeated, 'same operation and seed must reproduce all raw samples and results');
assert.notEqual(observeOperation(simulation, 29).samplesSha256, observation.samplesSha256);
assert.equal(JSON.stringify(simulation), simulationBefore, 'observation must not feed noise into physical motion');
assert.ok(observation.record && observation.selection && observation.run?.result);
assert.equal(observation.record.samples.length, 501);
assert.equal(observation.record.samples[0]!.timeS, 0);
assert.equal(observation.record.samples.at(-1)!.timeS, 0.5);
assert.equal(observation.record.pressOperationEvidence.trace.length, 1101);
assert.equal(observation.record.sensorObservationSnapshot.initialDynamicState?.nextNoiseSampleIndex, 1101,
  'release observation must continue the press sensor session');
assert.equal(observation.record.sensorObservationSnapshot.dynamicConfig?.seed, 11);
assert.deepEqual(normalizePistonOscillationRawMeasurementRecord(observation.record), observation.record,
  'representative records must survive the production normalizer without loss');
for (const sample of observation.record.samples) {
  assert.equal(sample.timeS, sample.sampleIndex / 1000);
  assert.ok(Math.abs(sample.absolutePressureKpa * 100 - Math.round(sample.absolutePressureKpa * 100)) < 1e-8);
}
assert.equal(observation.selection.periodCount, 2);
assert.ok(observation.selection.leftEndpoint!.timeS > 0);
assert.equal(observation.selection.leftEndpoint!.type, observation.selection.rightEndpoint!.type);
assert.equal(observation.run.answers.t1.status, 'correct');
assert.equal(observation.run.answers.t2.status, 'correct');
assert.equal(observation.run.answers.period.status, 'correct');

const insufficient = observeOperation(simulateOperation(80, { ...normal, dragReferencePx: 10 }), 11);
assert.equal(insufficient.triggerTimeS, null);
assert.equal(insufficient.record, null, 'no trigger must not be converted to an immediate record');
assert.equal(insufficient.run, null);

// Controlled observed waveform checks selection and rounding independently of
// physical result quality. Physical metadata is not used to choose the period.
const samples = observation.record.samples.map(sample => ({ ...sample,
  absolutePressureKpa: Math.round((101.3 + 3 * Math.exp(-sample.timeS * 2)
    * Math.cos(2 * Math.PI * (sample.sampleIndex - 10) / 32.5)) * 100) / 100,
}));
const wave = { ...observation.record, samples };
const selected = createPistonOscillationPeriodSelection(wave, 0.0096, 0.0754, 2, 0);
assert.equal(selected.periodCount, 2);
assert.equal(selected.leftEndpoint?.sampleIndex, 10);
assert.equal(selected.rightEndpoint?.sampleIndex, 75);
const rounded = resolveDisplayedPeriod(wave, selected);
assert.equal(rounded.result?.periodS, 0.0325);
assert.equal(rounded.result?.periodSquaredS2, 0.0010562,
  'displayed 0.03250 squared must keep exact decimal half-even rounding');
const alteredTheory = { ...wave, physicsSnapshot: { ...wave.physicsSnapshot,
  config: { ...wave.physicsSnapshot.config, movingMassKg: wave.physicsSnapshot.config.movingMassKg * 2 } } };
assert.deepEqual(selectEarliestTwoCycles(wave), selectEarliestTwoCycles(alteredTheory),
  'selection must not move to match hidden theoretical/model parameters');

const complete = OPERATION_SWEEP_PROTOCOL.heightsMm.map(height => observeOperation(simulateOperation(height, normal), 11));
const fit = fitDisplayedHeightSet(complete, OPERATION_SWEEP_PROTOCOL.heightsMm);
assert.ok(fit);
assert.equal(fit.points.length, 6);
for (const [index, point] of fit.points.entries()) {
  assert.equal(point.periodSquaredS2, complete[index]!.run!.result!.periodSquaredS2);
  assert.equal(point.heightM, OPERATION_SWEEP_PROTOCOL.heightsMm[index]! / 1000);
}
// Independent displayed-operand calculation, using this deterministic fixture's
// non-midpoint values. This is not an acceptance band around theoretical gamma.
const expectedGamma = Number((4 * Math.PI ** 2 * 0.0485 * Number(fit.slope) / (0.0008296 * 101000)).toPrecision(4));
assert.equal(fit.areaM2, 0.0008296);
assert.equal(fit.gamma, expectedGamma);
assert.equal(fit.relativeErrorPercent, Number((Math.abs(expectedGamma - 1.4) / 1.4 * 100).toPrecision(3)));
assert.equal(fitDisplayedHeightSet(complete.slice(1), OPERATION_SWEEP_PROTOCOL.heightsMm), null,
  'missing height must not be dropped to produce a partial fit');
assert.equal(fitDisplayedHeightSet([insufficient, ...complete.slice(1)], OPERATION_SWEEP_PROTOCOL.heightsMm), null);

const sweep = buildOperationSweep([normal, { ...normal, dragReferencePx: 10 }], [11]);
assert.equal(sweep.runs.length, 12);
assert.equal(sweep.fits.length, 4);
assert.equal(sweep.summaries.reduce((sum, item) => sum + item.total, 0), 12);
assert.ok(sweep.runs.some(item => item.status === 'no-falling-trigger'));
assert.ok(sweep.fits.some(item => item.result === null));
assert.ok(renderOperationSweepReport(sweep).includes('12 个观测实例'));
assert.ok(renderOperationSweepReport(sweep).includes('不是实物标定'));

const realData = fs.readFileSync('docs/instrument-modeling/piston-oscillation/references/real-data/capstone-piston-oscillation-4runs-1000hz.csv');
assert.equal(createHash('sha256').update(realData).digest('hex'), '56662ea1f05504643355f6b980696284b2c0f2f10985a5afc06119831428b789');
console.log('pistonOperationSweep tests passed: deterministic observed chain, fixed selection, exact answers, complete-set fits and failure denominators.');
