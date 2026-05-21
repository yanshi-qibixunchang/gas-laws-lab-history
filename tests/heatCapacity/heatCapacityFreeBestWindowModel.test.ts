import assert from 'node:assert/strict';
import {
  createDefaultFreeConfigSnapshot,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  selectHeatCapacityBestRecordWindows,
} from '../../src/domain/heatCapacity/heatCapacityFreeBestWindowModel.ts';
import {
  createSampleInputForProcessReviewTest,
  createTraceTrialForProcessReviewTest,
  createTrialForProcessReviewTest,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const config = createDefaultFreeConfigSnapshot();
const setup = createTraceTrialForProcessReviewTest(config, [
  createSampleInputForProcessReviewTest(5, 0, 1499, {
    phase: 'zeroed',
    controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
  }),
  createSampleInputForProcessReviewTest(30, 112, 1499.05, { phase: 'sealedStabilizing' }),
  createSampleInputForProcessReviewTest(60, 35, 1498.98, { phase: 'recovering' }),
]);
const trial = createTrialForProcessReviewTest(setup);
const windows = selectHeatCapacityBestRecordWindows(setup.traceTrial, setup.branch, trial, 1.4);

assert.equal(windows.windows.length, 3);
assert.equal(windows.windows.every((window) => window.qualityScore > 0), true);
assert.equal(windows.gamma !== null, true);
assert.equal(windows.gapFromActualPercent !== null, true);
assert.equal(windows.windows.find((window) => window.recordId === 'u1')?.recommendedSampleId !== null, true);

const actualBeatsStandaloneQualitySetup = createTraceTrialForProcessReviewTest(config, [
  createSampleInputForProcessReviewTest(5, 0, 1499, {
    phase: 'zeroed',
    controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
  }),
  createSampleInputForProcessReviewTest(30, 91.2, 1499.04, { phase: 'sealedStabilizing' }),
  createSampleInputForProcessReviewTest(60, 24.4, 1498.99, { phase: 'recovering' }),
  createSampleInputForProcessReviewTest(29, 100, 1499, { phase: 'sealedStabilizing' }),
  createSampleInputForProcessReviewTest(61, 28.08, 1499, { phase: 'recovering' }),
]);
const actualBeatsStandaloneQualityTrial = createTrialForProcessReviewTest(actualBeatsStandaloneQualitySetup);
const actualBeatsStandaloneQualityWindows = selectHeatCapacityBestRecordWindows(
  actualBeatsStandaloneQualitySetup.traceTrial,
  actualBeatsStandaloneQualitySetup.branch,
  actualBeatsStandaloneQualityTrial,
  1.4,
);
assert.equal(actualBeatsStandaloneQualityWindows.gamma !== null, true);
assert.equal(actualBeatsStandaloneQualityTrial.correctedSignals?.gamma !== null, true);
assert.equal(
  Math.abs((actualBeatsStandaloneQualityWindows.gamma ?? 0) - 1.4) <=
    Math.abs((actualBeatsStandaloneQualityTrial.correctedSignals?.gamma ?? 0) - 1.4),
  true,
  'operation upper-bound record selection should optimize gamma as a combination, not choose independently high-quality windows that are worse than the actual record',
);
assert.equal(
  (actualBeatsStandaloneQualityWindows.gamma ?? 0) >=
    (actualBeatsStandaloneQualityTrial.correctedSignals?.gamma ?? Number.POSITIVE_INFINITY),
  true,
  'operation upper-bound gamma should not be lower than the actual gamma when the actual result is below the theoretical target',
);
assert.notEqual(
  actualBeatsStandaloneQualityWindows.windows.find((window) => window.recordId === 'u1')?.recommendedSampleId,
  actualBeatsStandaloneQualityTrial.u1?.traceSampleId,
  'operation upper-bound should use an independent U1 trace candidate when that candidate improves the actual result',
);
assert.notEqual(
  actualBeatsStandaloneQualityWindows.windows.find((window) => window.recordId === 'u2')?.recommendedSampleId,
  actualBeatsStandaloneQualityTrial.u2?.traceSampleId,
  'operation upper-bound should use an independent U2 trace candidate when that candidate improves the actual result',
);

const officialRecordReuseSetup = createTraceTrialForProcessReviewTest(config, [
  createSampleInputForProcessReviewTest(5, 0, 1499, {
    phase: 'zeroed',
    controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
  }),
  createSampleInputForProcessReviewTest(30, 100, 1499.04, { phase: 'sealedStabilizing' }),
  createSampleInputForProcessReviewTest(60, 28.08, 1498.99, { phase: 'recovering' }),
  createSampleInputForProcessReviewTest(29, 104, 1499, { phase: 'sealedStabilizing' }),
  createSampleInputForProcessReviewTest(61, 28.9, 1499, { phase: 'recovering' }),
]);
const officialRecordReuseTrial = createTrialForProcessReviewTest(officialRecordReuseSetup);
const officialRecordReuseWindows = selectHeatCapacityBestRecordWindows(
  officialRecordReuseSetup.traceTrial,
  officialRecordReuseSetup.branch,
  officialRecordReuseTrial,
  1.4,
);
assert.equal(
  (officialRecordReuseWindows.gamma ?? 0) >=
    (officialRecordReuseTrial.correctedSignals?.gamma ?? Number.POSITIVE_INFINITY),
  true,
  'operation upper-bound should fall back to the actual result instead of selecting independent candidates that lower the gamma',
);

console.log('heatCapacityFreeBestWindowModel tests passed');
