import assert from 'node:assert/strict';
import {
  createDefaultFreeConfigSnapshot,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  createHeatCapacityFreeStandardReference,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const parts = createCompleteProcessReviewFixtureParts();
const review = selectHeatCapacityFreeProcessReview({
  trials: [parts.trial],
  traceStore: parts.traceStore,
  theoreticalGamma: 1.4,
  selectedTrialId: parts.trial.id,
});

assert.equal(review.status, 'ready');
assert.equal(review.summary?.trialIndex, 1);
assert.equal(review.summary?.trialId, parts.trial.id);
assert.equal(review.summary?.gamma !== null, true);
assert.equal(review.summary?.relativeErrorPercent !== null, true);
assert.equal(review.summary?.upperBoundGamma !== null, true);
assert.equal(review.summary?.upperBoundRelativeErrorPercent !== null, true);
assert.equal(review.summary?.upperBoundGapPercent !== null, true);
assert.equal(review.trialOptions.length, 1);
assert.equal(review.trialOptions[0]?.status, 'complete');
assert.equal(review.selectedTrialId, parts.trial.id);

assert.equal(review.chart.actualTrace.length > 0, true);
assert.equal(review.chart.records.map((record) => record.id).join(','), 'u0,u1,u2');
assert.notEqual(review.chart.standardReference, null);
const standardReference = review.chart.standardReference;
if (!standardReference) throw new Error('ready review should include a standard reference snapshot');
assert.equal(standardReference.trace.length > 0, true);
assert.equal(standardReference.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(standardReference.trace.some((point) => point.stageId === 'release'), true);
assert.equal(standardReference.stages.length > 0, true);
assert.equal(standardReference.recordWindows.length, 3);
assert.deepEqual(standardReference.recordWindows.map((window) => window.source), [
  'standard-operation',
  'standard-operation',
  'standard-operation',
]);
assert.equal(standardReference.summary.feasible, true);
assert.equal(standardReference.summary.assumptions.operationMode, 'standard-operation');
assert.equal(standardReference.summary.assumptions.disturbancesPreserved, true);
assert.equal(standardReference.summary.assumptions.stageAligned, true);
assert.equal(
  review.summary?.upperBoundGamma,
  standardReference.operationUpperBound.gamma === null
    ? null
    : Number(standardReference.operationUpperBound.gamma.toFixed(3)),
);

const idealTrial: HeatCapacityFreeTrial = {
  ...parts.trial,
  id: 'ideal-upper-bound-trial',
  parameterScheme: 'ideal',
  traceTrialId: parts.traceTrial.id,
  correctedSignals: parts.trial.correctedSignals
    ? {
      ...parts.trial.correctedSignals,
      gamma: 1.404,
    }
    : null,
};
const idealReview = selectHeatCapacityFreeProcessReview({
  trials: [idealTrial],
  traceStore: parts.traceStore,
  theoreticalGamma: 1.67,
  selectedTrialId: idealTrial.id,
});
assert.equal(idealReview.status, 'ready');
assert.equal(
  idealReview.summary?.relativeErrorPercent,
  0.29,
  'ideal parameter reviews should calculate result error against the fixed air gamma 1.4',
);
assert.equal(
  idealReview.summary?.upperBoundGamma,
  1.4,
  'ideal parameter reviews should use fixed air gamma 1.4 as the operation upper bound',
);
assert.equal(
  idealReview.summary?.upperBoundRelativeErrorPercent,
  0,
  'ideal operation upper bound should have zero theory error',
);
assert.equal(
  idealReview.summary?.upperBoundGapPercent,
  0.29,
  'ideal operation upper bound gap should still compare the actual result against gamma 1.4',
);
const oldIdealReferenceTraceField = 'ideal' + 'Reference' + 'Trace';
assert.equal(
  oldIdealReferenceTraceField in review.chart,
  false,
  'process review should not expose the old ideal-reference trace field',
);
const oldBestWindowsField = 'best' + 'Windows';
assert.equal(
  oldBestWindowsField in review.chart,
  false,
  'process review should not expose the old actual-trace best-window field',
);
const oldScatteredStandardTraceField = 'standard' + 'Trace';
assert.equal(
  oldScatteredStandardTraceField in review.chart,
  false,
  'process review should keep standard reference data under chart.standardReference',
);
const oldScatteredStandardWindowsField = 'standard' + 'Windows';
assert.equal(
  oldScatteredStandardWindowsField in review.chart,
  false,
  'process review should keep standard record windows under chart.standardReference.recordWindows',
);
const oldScatteredStandardSummaryField = 'standard' + 'Process';
assert.equal(
  oldScatteredStandardSummaryField in review.chart,
  false,
  'process review should keep standard summary under chart.standardReference.summary',
);

assert.equal(review.score.maxScore, 100);
assert.equal(review.score.total !== null, true);
assert.deepEqual(review.score.items.map((item) => item.id), ['pumping', 'release', 'recordChain', 'retake']);
assert.deepEqual(review.diagnostics.map((row) => row.id), ['pumping', 'release', 'recording', 'retake']);

const selectReviewWithSnapshot = (
  id: string,
  snapshot: HeatCapacityFreeConfigSnapshot,
) => {
  const traceTrial: HeatCapacityFreeTraceTrial = {
    ...parts.traceTrial,
    id: `trace-${id}`,
    linkedTrialId: `trial-${id}`,
    configSnapshot: snapshot,
  };
  const trial: HeatCapacityFreeTrial = {
    ...parts.trial,
    id: `trial-${id}`,
    traceTrialId: traceTrial.id,
    configSnapshot: snapshot,
  };
  return selectHeatCapacityFreeProcessReview({
    trials: [trial],
    traceStore: {
      ...parts.traceStore,
      activeTraceTrialId: traceTrial.id,
      traceTrials: [traceTrial],
    },
    theoreticalGamma: 1.4,
  });
};

const standardSignature = (candidate: typeof review) => (
  (candidate.chart.standardReference?.trace ?? [])
    .filter((point) => point.stageId !== 'zero')
    .map((point) => `${point.stageId}:${point.timeS}:${point.pressureDeltaKPa}:${point.temperatureDeltaK}`)
    .join('|')
);

const storedReference = createHeatCapacityFreeStandardReference({
  traceTrial: parts.traceTrial,
  trial: parts.trial,
  theoreticalGamma: 1.4,
});
const storedReview = selectHeatCapacityFreeProcessReview({
  trials: [{
    ...parts.trial,
    id: 'trial-with-stored-standard-reference',
    standardReferenceSnapshot: {
      ...storedReference,
      trace: [
        {
          ...storedReference.trace[0]!,
          sampleId: 'stored-standard-reference-sentinel',
          pressureDeltaKPa: 9.876,
        },
        ...storedReference.trace.slice(1),
      ],
      summary: {
        ...storedReference.summary,
        targetPressureMv: 88.8,
      },
      operationUpperBound: {
        ...storedReference.operationUpperBound,
        gamma: 1.999,
        relativeErrorPercent: 42.79,
        gapFromActualPercent: 31.23,
      },
    },
  }],
  traceStore: parts.traceStore,
  theoreticalGamma: 1.4,
  selectedTrialId: 'trial-with-stored-standard-reference',
});
assert.equal(storedReview.status, 'ready');
assert.equal(
  storedReview.chart.standardReference?.trace[0]?.sampleId,
  'stored-standard-reference-sentinel',
  'process review should read the persisted standard reference snapshot instead of regenerating it',
);
assert.equal(storedReview.chart.standardReference?.summary.targetPressureMv, 88.8);
assert.equal(storedReview.summary?.upperBoundGamma, 1.999);

const baseConfig = createDefaultFreeConfigSnapshot();
const leakyReview = selectReviewWithSnapshot('leaky', {
  ...baseConfig,
  physics: {
    ...baseConfig.physics,
    leakage: {
      ...baseConfig.physics.leakage,
      enabled: true,
      ratePerS: 0.025,
    },
  },
});
assert.notEqual(
  standardSignature(leakyReview),
  standardSignature(review),
  'standard operation should preserve leakage instead of ignoring it',
);

const noisyReview = selectReviewWithSnapshot('noisy', {
  ...baseConfig,
  sensor: {
    ...baseConfig.sensor,
    noiseMv: 0.8,
  },
});
assert.notEqual(
  standardSignature(noisyReview),
  standardSignature(review),
  'standard operation should preserve instrument noise instead of ignoring it',
);

const incompleteReview = selectHeatCapacityFreeProcessReview({
  trials: [{
    ...parts.trial,
    id: 'incomplete',
    u1: null,
    u2: null,
    correctedSignals: null,
  }],
  traceStore: parts.traceStore,
  selectedTrialId: 'incomplete',
});

assert.equal(incompleteReview.status, 'incomplete');
assert.equal(incompleteReview.summary?.gamma, null);
assert.equal(incompleteReview.score.total, null);
assert.equal(incompleteReview.chart.actualTrace.length > 0, true);

const emptyReview = selectHeatCapacityFreeProcessReview({
  trials: [],
  traceStore: {
    activeTraceTrialId: null,
    nextTraceTrialIndex: 1,
    traceTrials: [],
  },
});

assert.equal(emptyReview.status, 'empty');
assert.equal(emptyReview.selectedTrialId, null);
assert.equal(emptyReview.trialOptions.length, 0);
assert.equal(emptyReview.diagnostics[0]?.status, 'insufficient-data');

console.log('heatCapacityFreeProcessReviewModel tests passed');
