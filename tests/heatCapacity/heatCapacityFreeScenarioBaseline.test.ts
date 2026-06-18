import assert from 'node:assert/strict';

import {
  formatHeatCapacityFreeScenarioBaseline,
  runHeatCapacityFreeScenarioBaseline,
} from './helpers/heatCapacityFreeScenarioHarness.ts';

const baseline = runHeatCapacityFreeScenarioBaseline();
const scenarioById = new Map(baseline.map((scenario) => [scenario.id, scenario]));

if (process.env.HSL_PRINT_HEAT_BASELINE === '1') {
  console.table(formatHeatCapacityFreeScenarioBaseline(baseline));
}

const good = scenarioById.get('good-operation');
assert.ok(good, 'baseline should include a good-operation scenario');
assert.equal(good.u1Evaluation.ready, true);
assert.equal(good.u2Evaluation.ready, true);
assert.ok(
  good.correctedSignals !== null &&
    good.correctedSignals.gamma > 1.35 &&
    good.correctedSignals.gamma < 1.45,
  'current good operation should stay close to the built-in air gamma',
);

const insufficient = scenarioById.get('insufficient-pump');
assert.ok(insufficient, 'baseline should include an insufficient-pump scenario');
assert.equal(insufficient.u1Evaluation.ready, true);
assert.equal(insufficient.u2Evaluation.ready, true);
assert.ok(
  good.correctedSignals !== null &&
    insufficient.correctedSignals !== null &&
    insufficient.correctedSignals.U1CorrectedMv < good.correctedSignals.U1CorrectedMv,
  'insufficient pumping should remain recordable with a much smaller U1 signal',
);

const slowClose = scenarioById.get('slow-close');
assert.ok(slowClose, 'baseline should include a slow-close scenario');
assert.ok(
  good.correctedSignals !== null &&
    slowClose.correctedSignals !== null &&
    slowClose.correctedSignals.U2CorrectedMv < good.correctedSignals.U2CorrectedMv,
  'current slow close should lower U2 relative to the good operation',
);

const longOpen = scenarioById.get('long-open');
assert.ok(longOpen, 'baseline should include a long-open scenario');
assert.ok(
  slowClose.correctedSignals !== null &&
    longOpen.correctedSignals !== null &&
    longOpen.correctedSignals.gamma < slowClose.correctedSignals.gamma,
  'current long-open operation should degrade gamma further than slow close',
);

const earlyU2 = scenarioById.get('early-u2-record');
assert.ok(earlyU2, 'baseline should include an early-u2-record scenario');
assert.equal(
  earlyU2.u2Evaluation.ready,
  true,
  'relaxed record rules should allow U2 before the display is stable',
);
assert.ok(
  good.correctedSignals !== null &&
    earlyU2.correctedSignals !== null &&
    earlyU2.correctedSignals.gamma < good.correctedSignals.gamma,
  'early U2 recording should remain visible as a degraded result',
);

console.log('heatCapacityFreeScenarioBaseline tests passed');
