import assert from 'node:assert/strict';
import {
  runHeatCapacityFreeParameterAcceptance,
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG,
} from './heatCapacityFreeParameterAcceptance.ts';

const report = runHeatCapacityFreeParameterAcceptance({
  pumpStrokes: [6, 7, 8, 9, 10, 11, 12],
  openDurationsS: [0, 0.3, 0.7],
});

assert.equal(
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
  90,
  'parameter acceptance should preserve the 90 mV Free U1 record threshold',
);

const quickRows = report.rows.filter((row) => row.openDurationS === 0);
assert.deepEqual(
  quickRows.map((row) => row.pumpStrokes),
  [6, 7, 8, 9, 10, 11, 12],
  'acceptance script should cover 6-12 pump strokes for quick-release operation',
);

for (const strokes of [9, 10, 11]) {
  const row = quickRows.find((candidate) => candidate.pumpStrokes === strokes);
  assert.notEqual(row, undefined, `${strokes} pump strokes should be represented`);
  assert.equal(row?.safetyStatus, 'normal', `${strokes} pump strokes should stay inside the normal safety band`);
  assert.equal(row?.u1Recordable, true, `${strokes} pump strokes should be recordable as U1`);
  assert.equal(row?.u2Recordable, true, `${strokes} pump strokes should be recordable as U2 after quick release`);
  assert.equal(
    row !== undefined && row.gamma !== null && row.gamma >= 1.395 && row.gamma <= 1.405,
    true,
    `${strokes} pump strokes should produce an accurate gamma with the exact pressure formula`,
  );
}

const sixStroke = quickRows.find((row) => row.pumpStrokes === 6);
assert.equal(sixStroke?.u1Recordable, false, '6 pump strokes should remain below the unchanged U1 recording threshold');

const twelveStroke = quickRows.find((row) => row.pumpStrokes === 12);
assert.equal(twelveStroke?.safetyStatus, 'warning', '12 pump strokes should enter warning before the danger line');

const slowClose = report.rows.find((row) => row.pumpStrokes === 10 && row.openDurationS === 0.7);
assert.equal(slowClose?.u2Recordable, true, 'moderately slow close should still produce a recordable U2 row');
assert.equal(
  slowClose !== undefined && slowClose.gamma !== null && slowClose.gamma < 1.25,
  true,
  'moderately slow close should visibly degrade gamma in the acceptance report',
);

console.log('heatCapacityFreeParameterAcceptance tests passed');
