import assert from 'node:assert/strict';
import {
  calculateLinearRegression,
  createEmptyPointsByRelation,
  createIdealGasExperimentPoint,
  getNextPresetValue,
  getRelationXValue,
  getTheoreticalSlope,
  hasCompletedPresetRound,
} from '../utils/idealGasExperiment.ts';
import type { IdealGasExperimentPoint, PressureMeasurementSummary, SimulationParams } from '../types.ts';

const baseParams: SimulationParams = {
  L: 10,
  N: 100,
  r: 0.1,
  m: 1,
  k: 1,
  dt: 0.01,
  nu: 1,
  targetTemperature: 2,
  equilibriumTime: 4,
  statsDuration: 12,
};

const point = (overrides: Partial<IdealGasExperimentPoint>): IdealGasExperimentPoint => ({
  id: 'point',
  relation: 'pt',
  targetTemperature: 1,
  meanTemperature: 1,
  meanPressure: 2,
  idealPressure: 2,
  relativeGap: 0,
  timestamp: 1,
  ...overrides,
});

const summary: PressureMeasurementSummary = {
  latestPressure: 0.2,
  meanPressure: 0.204,
  meanIdealPressure: 0.2,
  meanTemperature: 2.04,
  relativeGap: 2,
  sampleCount: 14,
  history: [],
};

const pointsByRelation = createEmptyPointsByRelation();
assert.deepEqual(Object.keys(pointsByRelation), ['pt', 'pv', 'pn']);
assert.equal(pointsByRelation.pt.length, 0);
assert.equal(pointsByRelation.pv.length, 0);
assert.equal(pointsByRelation.pn.length, 0);

assert.equal(getRelationXValue('pt', point({ meanTemperature: 1.5, targetTemperature: 1.2 })), 1.5);
assert.equal(getRelationXValue('pv', point({ volume: 8, inverseVolume: 0.125 })), 0.125);
assert.equal(getRelationXValue('pn', point({ particleCount: 260 })), 260);

assert.equal(getTheoreticalSlope('pt', baseParams), 0.1);
assert.equal(getTheoreticalSlope('pv', baseParams), 200);
assert.equal(getTheoreticalSlope('pn', baseParams), 0.002);

const recorded = createIdealGasExperimentPoint('pv', baseParams, summary, 1234);
assert.ok(recorded);
assert.equal(recorded.relation, 'pv');
assert.equal(recorded.boxLength, 10);
assert.equal(recorded.volume, 1000);
assert.equal(recorded.inverseVolume, 0.001);
assert.equal(recorded.meanPressure, 0.204);
assert.equal(recorded.relativeGap, 2);

const regression = calculateLinearRegression(
  [
    point({ meanTemperature: 1, meanPressure: 2 }),
    point({ meanTemperature: 2, meanPressure: 4 }),
    point({ meanTemperature: 3, meanPressure: 6 }),
  ],
  (candidate) => getRelationXValue('pt', candidate),
  (candidate) => candidate.meanPressure,
  2,
);
assert.equal(regression.slope, 2);
assert.equal(regression.intercept, 0);
assert.equal(regression.rSquared, 1);
assert.equal(regression.slopeError, 0);

assert.equal(getNextPresetValue('pt', 1.2), 1.5);
assert.equal(getNextPresetValue('pv', 17), 19);
assert.equal(getNextPresetValue('pn', 320), 320);

assert.equal(
  hasCompletedPresetRound('pn', [80, 120, 160, 200, 260, 320].map((particleCount) => point({ relation: 'pn', particleCount }))),
  true,
);
assert.equal(
  hasCompletedPresetRound('pv', [12, 15, 17].map((boxLength) => point({ relation: 'pv', boxLength }))),
  false,
);

console.log('idealGasExperiment tests passed');
