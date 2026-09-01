import assert from 'node:assert/strict';

import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  advanceHeatCapacityReleaseState,
  beginHeatCapacityReleaseClosing,
  beginHeatCapacityReleaseOpening,
  createClosedHeatCapacityReleaseState,
} from '../../src/domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  quantizeHeatCapacityScore,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts';
import {
  runHeatCapacityFreeParameterAcceptance,
  type HeatCapacityFreeParameterAcceptanceScenarioInput,
} from './heatCapacityFreeParameterAcceptance.ts';

assert.deepEqual(
  [
    HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS,
    HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS,
  ],
  [0.5, 0.6, 0.7],
  'the accepted release window and canonical representative duration are a regression contract',
);
assert.equal(quantizeHeatCapacityScore(22.25), 22, 'half-point ties should round to even');
assert.equal(quantizeHeatCapacityScore(22.75), 23, 'half-point ties should round to even');

const opening = beginHeatCapacityReleaseOpening(
  createClosedHeatCapacityReleaseState(0),
  'release',
  10,
);
const quickClosing = beginHeatCapacityReleaseClosing(opening, 10.1);
assert.equal(quickClosing.quickToggle, true);
assert.equal(quickClosing.formedRelease, false);
assert.equal(quickClosing.releaseDurationS, 0);
const quickClosed = advanceHeatCapacityReleaseState(quickClosing, 11).state;
assert.equal(quickClosed.phase, 'closed');
assert.equal(
  beginHeatCapacityReleaseOpening(quickClosed, 'release', 12).attemptId,
  opening.attemptId + 1,
  'a no-release quick toggle must allow a new real release attempt',
);

const baseScenario: Omit<HeatCapacityFreeParameterAcceptanceScenarioInput, 'id' | 'waitAfterPumpS' | 'openDurationS'> = {
  pumpStrokes: HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
  pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
  waitAfterReleaseS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS,
  leakageEnabled: true,
  instrumentNoiseEnabled: false,
};
const [standard, longU1Wait, shortPhysicalRelease] = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'historical-contract-standard',
      ...baseScenario,
      waitAfterPumpS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    },
    {
      id: 'historical-contract-long-u1-wait',
      ...baseScenario,
      waitAfterPumpS: 1_200,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    },
    {
      id: 'historical-contract-short-real-release',
      ...baseScenario,
      waitAfterPumpS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
      openDurationS: 0.03,
    },
  ],
}).rows;

assert.equal(longU1Wait.u1Recordable, true, 'a long U1 wait should remain recordable for diagnosis');
assert.equal(longU1Wait.u2Recordable, true, 'a long U1 wait should not create an artificial U2 hard block');
assert.equal(typeof longU1Wait.gamma, 'number');
assert.equal(
  longU1Wait.u1CorrectedMv! < standard.u1CorrectedMv!,
  true,
  'a long U1 wait should preserve natural leakage/thermal consequences instead of an artificial result penalty',
);
assert.equal(
  Math.abs(shortPhysicalRelease.gamma! - 1.4) > Math.abs(standard.gamma! - 1.4),
  true,
  'a short real release should deviate naturally from the canonical result',
);

console.log('heatCapacityHistoricalValidationContract tests passed');
