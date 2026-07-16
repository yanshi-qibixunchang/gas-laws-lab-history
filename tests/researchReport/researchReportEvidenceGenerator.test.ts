import assert from 'node:assert/strict';

import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import {
  createSeededRandom,
  summarizeNumbers,
  toCsv,
  withSeededMathRandom,
} from '../../scripts/research-report/generate-evidence.ts';

const firstRandom = createSeededRandom('report-seed');
const secondRandom = createSeededRandom('report-seed');
assert.deepEqual(
  Array.from({ length: 8 }, () => firstRandom()),
  Array.from({ length: 8 }, () => secondRandom()),
  'the evidence PRNG should be exactly reproducible for the same string seed',
);

const differentRandom = createSeededRandom('different-seed');
assert.notDeepEqual(
  Array.from({ length: 4 }, () => createSeededRandom('report-seed')()),
  Array.from({ length: 4 }, () => differentRandom()),
  'different evidence seeds should not collapse to the same sequence',
);

assert.deepEqual(summarizeNumbers([1, 2, 3, null]), {
  count: 3,
  mean: 2,
  sampleSd: 1,
  min: 1,
  max: 3,
});
assert.deepEqual(summarizeNumbers([]), {
  count: 0,
  mean: null,
  sampleSd: null,
  min: null,
  max: null,
});

const csv = toCsv([
  { id: 1, label: '普通值', note: '含,逗号' },
  { id: 2, label: '含"引号', note: '两\n行' },
]);
assert.equal(csv.startsWith('\uFEFFid,label,note\r\n'), true);
assert.equal(csv.includes('"含,逗号"'), true);
assert.equal(csv.includes('"含""引号"'), true);
assert.equal(csv.includes('"两\n行"'), true);

const tinyParams = {
  L: 8,
  N: 24,
  r: 0.12,
  m: 1,
  k: 1,
  dt: 0.02,
  nu: 0.5,
  targetTemperature: 1.1,
  equilibriumTime: 0.2,
  statsDuration: 0.4,
};

const runTinyEngine = () => withSeededMathRandom('tiny-engine-seed', () => {
  const engine = new PhysicsEngine(tinyParams);
  while (engine.time < tinyParams.equilibriumTime + tinyParams.statsDuration - 1e-10) {
    engine.step();
    if (
      engine.time >= tinyParams.equilibriumTime &&
      engine.time < tinyParams.equilibriumTime + tinyParams.statsDuration
    ) {
      engine.collectSamples();
    }
  }
  engine.flushPressureMeasurement();
  return {
    stats: engine.getStats(),
    pressure: engine.getPressureMeasurementSummary(),
    histogram: engine.getHistogramData(true),
  };
});

assert.deepEqual(
  runTinyEngine(),
  runTinyEngine(),
  'seed injection should make the production hard-sphere engine reproducible without changing it',
);

console.log('researchReportEvidenceGenerator tests passed');
