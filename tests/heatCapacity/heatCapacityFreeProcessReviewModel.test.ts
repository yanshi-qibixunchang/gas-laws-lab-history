import assert from 'node:assert/strict';
import {
  calculateFreeHeatCapacityTrialSignals,
  type HeatCapacityFreeRecord,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  appendFreeTraceEvent,
  appendFreeTraceSample,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceSample,
  type HeatCapacityFreeTraceSampleInput,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
  type HeatCapacityFreeProcessReview,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';

const configSnapshot = createDefaultFreeConfigSnapshot();

type HeatCapacityTraceSampleInputOverrides = Omit<
  Partial<HeatCapacityFreeTraceSampleInput>,
  'controls' | 'physical' | 'sensor' | 'calibration' | 'stability'
> & {
  controls?: Partial<HeatCapacityFreeTraceSampleInput['controls']>;
  physical?: Partial<HeatCapacityFreeTraceSampleInput['physical']>;
  sensor?: Partial<HeatCapacityFreeTraceSampleInput['sensor']>;
  calibration?: Partial<HeatCapacityFreeTraceSampleInput['calibration']>;
  stability?: Partial<HeatCapacityFreeTraceSampleInput['stability']>;
};

const createSampleInput = (
  atS: number,
  pressureMv: number,
  temperatureMv: number,
  overrides: HeatCapacityTraceSampleInputOverrides = {},
): HeatCapacityFreeTraceSampleInput => {
  const {
    controls: controlOverrides,
    physical: physicalOverrides,
    sensor: sensorOverrides,
    calibration: calibrationOverrides,
    stability: stabilityOverrides,
    ...restOverrides
  } = overrides;
  const controls: HeatCapacityFreeTraceSampleInput['controls'] = {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    pumpBulbState: 'idle',
    stopcockFlowOpen: false,
    ...controlOverrides,
  };
  const physical: HeatCapacityFreeTraceSampleInput['physical'] = {
    gasPressureKPa: 101.3 + pressureMv / 20,
    pressureDeltaKPa: pressureMv / 20,
    gasTemperatureK: 298.15 + (temperatureMv - 1499) / 2,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1,
    pumpStrokeCount: 0,
    releaseStarted: false,
    currentStopcockOpenDurationS: 0,
    ...physicalOverrides,
  };
  return {
    atS,
    reason: 'periodic',
    phase: 'sealedStabilizing',
    sensor: {
      displayPressureMv: pressureMv,
      displayTemperatureMv: temperatureMv,
      pressureSlopeMvPerS: 0.03,
      temperatureSlopeMvPerS: 0.02,
      ...sensorOverrides,
    },
    calibration: {
      calibrationVersion: 1,
      zeroOffsetMv: 0,
      zeroEventId: 'zero-1',
      ...calibrationOverrides,
    },
    stability: {
      pressureStable: true,
      temperatureStable: true,
      ...stabilityOverrides,
    },
    safetyStatus: 'normal',
    ...restOverrides,
    controls,
    physical,
  };
};

const addSample = (
  branch: HeatCapacityFreeTraceBranch,
  input: HeatCapacityFreeTraceSampleInput,
) => appendFreeTraceSample(branch, input);

const addEvent = (
  branch: HeatCapacityFreeTraceBranch,
  type: Parameters<typeof appendFreeTraceEvent>[1]['type'],
  sample: HeatCapacityFreeTraceSample,
  payload?: Record<string, unknown>,
) => appendFreeTraceEvent(branch, {
  atS: sample.atS,
  type,
  traceSampleId: sample.id,
  payload,
});

const createRecord = (
  sample: HeatCapacityFreeTraceSample,
  eventId: string,
  traceTrialId: string,
  traceBranchId: string,
): HeatCapacityFreeRecord => ({
  atS: sample.atS,
  displayPressureMv: sample.sensor.displayPressureMv,
  displayTemperatureMv: sample.sensor.displayTemperatureMv,
  calibrationVersion: sample.calibration.calibrationVersion,
  zeroEventId: sample.calibration.zeroEventId ?? 'zero-1',
  source: 'user',
  phaseAtRecord: sample.phase,
  traceTrialId,
  traceBranchId,
  traceSampleId: sample.id,
  eventId,
});

const replaceTraceTrial = (
  store: HeatCapacityFreeTraceStore,
  traceTrial: HeatCapacityFreeTraceTrial,
): HeatCapacityFreeTraceStore => ({
  ...store,
  activeTraceTrialId: traceTrial.id,
  traceTrials: store.traceTrials.map((candidate) => (
    candidate.id === traceTrial.id ? traceTrial : candidate
  )),
});

let store = createDefaultFreeTraceStore();
const created = createFreeTraceTrial(store, configSnapshot, 'free-trial-1');
store = created.store;
let activeBranch = created.traceTrial.branches[0];

let sampleResult = addSample(activeBranch, createSampleInput(0, 0, 1499, { phase: 'readyToZero' }));
activeBranch = sampleResult.branch;

sampleResult = addSample(activeBranch, createSampleInput(2, 0, 1499, { phase: 'readyToZero' }));
activeBranch = addEvent(sampleResult.branch, 'power-on', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(4, 0, 1499, {
  phase: 'readyToZero',
  controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
}));
activeBranch = addEvent(sampleResult.branch, 'stopcock-open', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(6, 0.2, 1499.02, {
  reason: 'record',
  phase: 'zeroed',
  controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
}));
const u0Event = addEvent(sampleResult.branch, 'record-u0', sampleResult.sample);
activeBranch = u0Event.branch;
const u0 = createRecord(sampleResult.sample, u0Event.event.id, created.traceTrial.id, activeBranch.id);

sampleResult = addSample(activeBranch, createSampleInput(8, 0.2, 1499.02, {
  phase: 'pumping',
  controls: { powerOn: true, stopcockOpen: false, pumpValveOpen: true },
}));
activeBranch = addEvent(sampleResult.branch, 'pump-valve-open', sampleResult.sample).branch;

for (let index = 1; index <= 10; index += 1) {
  const atS = 9 + index * 1.6;
  sampleResult = addSample(activeBranch, createSampleInput(atS, index * 11.2, 1499 + index * 0.7, {
    phase: 'pumping',
    controls: { powerOn: true, stopcockOpen: false, pumpValveOpen: true },
    physical: {
      gasPressureKPa: 101.3 + (index * 11.2) / 20,
      pressureDeltaKPa: (index * 11.2) / 20,
      gasTemperatureK: 298.15 + (index * 0.7) / 2,
      wallTemperatureK: 298.15,
      ambientTemperatureK: 298.15,
      gasAmountRatio: 1 + index * 0.018,
      pumpStrokeCount: index,
      releaseStarted: false,
      currentStopcockOpenDurationS: 0,
    },
    sensor: {
      displayPressureMv: index * 11.2,
      displayTemperatureMv: 1499 + index * 0.7,
      pressureSlopeMvPerS: 1.8,
      temperatureSlopeMvPerS: 0.9,
    },
    stability: { pressureStable: false, temperatureStable: false },
  }));
  activeBranch = addEvent(sampleResult.branch, 'pump-stroke', sampleResult.sample, {
    pumpStrokeCount: index,
  }).branch;
}

sampleResult = addSample(activeBranch, createSampleInput(27, 112.2, 1505.8, {
  phase: 'pumping',
  controls: { powerOn: true, stopcockOpen: false, pumpValveOpen: true },
  safetyStatus: 'warning',
}));
activeBranch = addEvent(sampleResult.branch, 'pressure-warning', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(30, 112.2, 1503.2, {
  phase: 'sealedStabilizing',
}));
activeBranch = addEvent(sampleResult.branch, 'pump-valve-close', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(60, 112.2, 1499.08, {
  reason: 'record',
  phase: 'sealedStabilizing',
}));
const u1Event = addEvent(sampleResult.branch, 'record-u1', sampleResult.sample);
activeBranch = u1Event.branch;
const u1 = createRecord(sampleResult.sample, u1Event.event.id, created.traceTrial.id, activeBranch.id);

sampleResult = addSample(activeBranch, createSampleInput(61.2, 112.2, 1499.08, {
  phase: 'releasing',
  controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
}));
activeBranch = addEvent(sampleResult.branch, 'stopcock-open', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(61.7, 112.2, 1499.08, {
  phase: 'releasing',
  controls: {
    powerOn: true,
    stopcockOpen: true,
    pumpValveOpen: false,
    stopcockFlowOpen: true,
  },
  physical: {
    releaseStarted: true,
    currentStopcockOpenDurationS: 0,
  },
}));
activeBranch = sampleResult.branch;

sampleResult = addSample(activeBranch, createSampleInput(62.3, 35, 1497.6, {
  phase: 'recovering',
  controls: { powerOn: true, stopcockOpen: false, pumpValveOpen: false },
  physical: {
    gasPressureKPa: 101.3 + 35 / 20,
    pressureDeltaKPa: 35 / 20,
    gasTemperatureK: 298.15 - 0.7,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1.04,
    pumpStrokeCount: 10,
    releaseStarted: true,
    currentStopcockOpenDurationS: 1.1,
  },
}));
activeBranch = addEvent(sampleResult.branch, 'stopcock-close', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(88, 35, 1498.98, {
  reason: 'record',
  phase: 'recovering',
  physical: {
    gasPressureKPa: 101.3 + 35 / 20,
    pressureDeltaKPa: 35 / 20,
    gasTemperatureK: 298.14,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1.04,
    pumpStrokeCount: 10,
    releaseStarted: true,
    currentStopcockOpenDurationS: 0,
  },
}));
const u2Event = addEvent(sampleResult.branch, 'record-u2', sampleResult.sample);
activeBranch = u2Event.branch;
const u2 = createRecord(sampleResult.sample, u2Event.event.id, created.traceTrial.id, activeBranch.id);

sampleResult = addSample(activeBranch, createSampleInput(92, 34.8, 1499, {
  phase: 'recovering',
  controls: { powerOn: false, stopcockOpen: false, pumpValveOpen: false },
}));
activeBranch = addEvent(sampleResult.branch, 'power-off', sampleResult.sample).branch;

sampleResult = addSample(activeBranch, createSampleInput(18000, 34.8, 1499, {
  phase: 'recovering',
  controls: { powerOn: false, stopcockOpen: false, pumpValveOpen: false },
}));
activeBranch = sampleResult.branch;

const archivedBranch: HeatCapacityFreeTraceBranch = {
  ...created.traceTrial.branches[0],
  id: 'branch-archived',
  status: 'archived',
  hiddenInDefaultChart: true,
};
const traceTrial: HeatCapacityFreeTraceTrial = {
  ...created.traceTrial,
  activeBranchId: activeBranch.id,
  branches: [archivedBranch, activeBranch],
};
store = replaceTraceTrial(store, traceTrial);

const baseTrial: HeatCapacityFreeTrial = {
  id: 'free-trial-1',
  source: 'free',
  traceTrialId: traceTrial.id,
  branchCount: 2,
  automaticU0: null,
  u0,
  u1,
  u2,
  blockedReason: null,
  correctedSignals: null,
  configSnapshot: traceTrial.configSnapshot,
};
const trial: HeatCapacityFreeTrial = {
  ...baseTrial,
  correctedSignals: calculateFreeHeatCapacityTrialSignals(baseTrial, {
    atmosphericPressureKPa: configSnapshot.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: configSnapshot.sensor.pressureMvPerKPa,
  }),
};

const review = selectHeatCapacityFreeProcessReview({
  trials: [trial],
  traceStore: store,
  theoreticalGamma: 1.4,
});
const reviewChart = review.chart as typeof review.chart & {
  referenceTrace?: unknown;
  operableBestTrace?: unknown;
  idealReferenceTrace?: Array<{
    sampleId: string;
    stageId: string;
    timeS: number;
    pressureDeltaKPa: number;
    temperatureDeltaK: number;
  }>;
  idealReferenceStages?: Array<{
    id: string;
    label: string;
    startS: number;
    endS: number;
  }>;
  idealReference?: {
    feasible: boolean;
    fillDurationS: number | null;
    targetPressureMv: number | null;
    targetPressureDeltaKPa: number | null;
    releaseDurationS: number | null;
    gamma: number | null;
    relativeErrorPercent: number | null;
    u1TimeS: number | null;
    u2TimeS: number | null;
    assumptions: {
      fillMode: 'continuous-fast';
      noiseIgnored: true;
      sensorLagIgnored: true;
      leakageIgnored: true;
    };
    explanation: {
      fill: string;
      u1: string;
      release: string;
      u2: string;
    };
  };
};

assert.equal(review.status, 'ready');
assert.equal(review.summary?.trialIndex, 1);
assert.equal(review.summary?.retakeCount, 1);
assert.equal(review.summary?.u1?.pressureDeltaKPa, 5.6);
assert.equal(review.summary?.u2?.pressureDeltaKPa, 1.74);
assert.equal(review.summary?.u1?.temperatureDeltaK, 0.03);
assert.equal(review.summary?.u2?.temperatureDeltaK, -0.02);
assert.equal(review.summary?.upperBoundGamma !== null, true);
assert.equal(review.summary?.upperBoundGapPercent !== null, true);
assert.equal(review.trialOptions.length, 1);
assert.deepEqual(review.trialOptions[0], {
  trialId: trial.id,
  traceTrialId: traceTrial.id,
  trialIndex: 1,
  status: 'complete',
  gamma: review.summary?.gamma ?? null,
  retakeCount: 1,
});
assert.equal(review.selectedTrialId, trial.id);
assert.equal(review.chart.stages.some((stage) => stage.id === 'pump' && stage.countText === 'x10'), true);
const actualPumpStageForTiming = review.chart.stages.find((stage) => stage.id === 'pump');
const actualStabilizeStageForTiming = review.chart.stages.find((stage) => stage.id === 'stabilize');
const actualReleaseStageForTiming = review.chart.stages.find((stage) => stage.id === 'release');
assert.equal(actualPumpStageForTiming?.startS, 10.6);
assert.equal(
  actualPumpStageForTiming?.endS,
  27,
  'pump stage should end at the post-stroke pressure peak sample instead of the later valve-close preparation point',
);
assert.equal(actualStabilizeStageForTiming?.startS, 27);
assert.equal(actualStabilizeStageForTiming?.endS, 61.7);
assert.equal(
  actualReleaseStageForTiming?.startS,
  61.7,
  'release stage should start when stopcock flow is confirmed instead of the earlier visual-open animation event',
);
assert.equal(actualReleaseStageForTiming?.endS, 62.3);
assert.equal(actualReleaseStageForTiming?.durationText, '0.6 s');
assert.equal(
  review.chart.controls.some((event) => event.id === 'pump-bulb-merged' || event.count !== undefined),
  false,
  'process review should not add a merged pump hover marker now that individual pump strokes remain readable',
);
assert.equal(
  review.chart.controls.filter((event) => event.kind === 'pumpBulb' && event.count === undefined).length,
  10,
  'process review should keep each pump stroke as its own chart control marker instead of only one merged xN label',
);
assert.equal(review.chart.records.map((record) => record.id).join(','), 'u0,u1,u2');
assert.equal(review.chart.systemEvents.some((event) => event.kind === 'warning'), true);
const latestActualProcessTime = Math.max(
  ...review.chart.stages.map((stage) => stage.endS),
  ...review.chart.trace.map((point) => point.timeS),
  ...review.chart.records.map((record) => record.timeS),
  ...review.chart.controls.map((event) => event.timeS),
  ...review.chart.systemEvents.map((event) => event.timeS),
);
assert.equal(
  latestActualProcessTime < 100,
  true,
  'process review should crop post-completion idle trace samples instead of stretching the x axis',
);
assert.equal(
  review.chart.trace.some((point) => point.timeS > 1000),
  false,
  'process review trace should not include long idle samples after the completed trial',
);
assert.equal('referenceTrace' in reviewChart, false, 'standard baseline trace should be removed from process review data');
assert.equal('operableBestTrace' in reviewChart, false, 'old operable-best trace field should stay removed');
const removedOrangeCurveFields = [
  `recommend${'edTrace'}`,
  `recommend${'edStages'}`,
  `recommend${'edReference'}`,
];
for (const fieldName of removedOrangeCurveFields) {
  assert.equal(fieldName in reviewChart, false, `old orange-curve field ${fieldName} should be removed`);
}
assert.equal(Array.isArray(reviewChart.idealReferenceTrace), true);
assert.equal(Array.isArray(reviewChart.idealReferenceStages), true);
assert.equal(reviewChart.idealReferenceTrace!.length > 0, true);
assert.equal(reviewChart.idealReferenceTrace!.some((point) => point.stageId === 'fill'), true);
assert.equal(reviewChart.idealReferenceTrace!.some((point) => point.stageId === 'release'), true);
assert.equal(reviewChart.idealReference?.assumptions.fillMode, 'continuous-fast');
assert.equal(reviewChart.idealReference?.assumptions.noiseIgnored, true);
assert.equal(reviewChart.idealReference?.assumptions.sensorLagIgnored, true);
assert.equal(reviewChart.idealReference?.assumptions.leakageIgnored, true);
assert.equal(reviewChart.idealReference?.feasible, true);
assert.equal((reviewChart.idealReference?.fillDurationS ?? 0) > 0, true);
assert.equal((reviewChart.idealReference?.fillDurationS ?? Number.POSITIVE_INFINITY) <= 1.2, true);
assert.equal(reviewChart.idealReference?.targetPressureMv !== null, true);
assert.equal(reviewChart.idealReference?.targetPressureDeltaKPa !== null, true);
assert.equal(reviewChart.idealReference?.releaseDurationS !== null, true);
assert.equal(reviewChart.idealReference?.gamma !== null, true);
assert.equal(reviewChart.idealReference?.relativeErrorPercent !== null, true);
assert.equal(reviewChart.idealReference?.u1TimeS !== null, true);
assert.equal(reviewChart.idealReference?.u2TimeS !== null, true);
const idealFillStage = reviewChart.idealReferenceStages!.find((stage) => stage.id === 'fill');
const idealFillPoints = reviewChart.idealReferenceTrace!.filter((point) => point.stageId === 'fill');
assert.equal(idealFillStage !== undefined, true);
assert.equal(
  idealFillPoints.length >= 3,
  true,
  'ideal fill should be rendered as a short continuous ramp',
);
assert.equal(
  idealFillPoints.every((point, index) => (
    index === 0 ||
    point.pressureDeltaKPa >= idealFillPoints[index - 1].pressureDeltaKPa - 0.001
  )),
  true,
  'ideal fill should be monotonic instead of a manual pump staircase',
);
assert.equal(
  idealFillPoints.every((point, index) => (
    index === 0 ||
    point.timeS > idealFillPoints[index - 1].timeS
  )),
  true,
  'ideal fill should use continuous time samples instead of duplicate-time pump steps',
);
const idealFillPressureGains = idealFillPoints
  .slice(1)
  .map((point, index) => point.pressureDeltaKPa - idealFillPoints[index].pressureDeltaKPa);
const strongestIdealFillPressureGain = Math.max(...idealFillPressureGains);
const finalIdealFillPressureGain = idealFillPressureGains.at(-1) ?? Number.POSITIVE_INFINITY;
assert.equal(
  finalIdealFillPressureGain < strongestIdealFillPressureGain * 0.65,
  true,
  'ideal fill should ease out before stabilization so the reference line does not form a hard point',
);
const actualReleaseStage = review.chart.stages.find((stage) => stage.id === 'release');
const idealReleaseStage = reviewChart.idealReferenceStages!.find((stage) => stage.id === 'release');
const actualPumpStage = review.chart.stages.find((stage) => stage.id === 'pump');
assert.equal(actualReleaseStage !== undefined, true);
assert.equal(idealReleaseStage !== undefined, true);
assert.equal(actualPumpStage !== undefined, true);
assert.equal(
  (idealFillStage?.startS ?? Number.POSITIVE_INFINITY) < (actualPumpStage?.startS ?? 0) - 1,
  true,
  'ideal reference should keep its own fast fill timing instead of being anchored to the actual pump stage',
);
assert.equal(
  (idealReleaseStage?.startS ?? Number.POSITIVE_INFINITY) < (actualReleaseStage?.startS ?? 0) - 5,
  true,
  'ideal reference release should keep its own optimized timing instead of being displayed at the actual release operation time',
);
const firstIdealReleasePoint = reviewChart.idealReferenceTrace!.find((point) => point.stageId === 'release');
assert.equal(firstIdealReleasePoint !== undefined, true);
assert.equal(
  Math.abs((firstIdealReleasePoint?.timeS ?? 0) - (idealReleaseStage?.startS ?? 0)) <= 0.1,
  true,
  'ideal reference curve should anchor its first release point to its own optimized release window',
);
const idealReleasePoints = reviewChart.idealReferenceTrace!.filter((point) => point.stageId === 'release');
const lastIdealStabilizePoint = reviewChart.idealReferenceTrace!
  .filter((point) => point.stageId === 'stabilize')
  .at(-1);
assert.equal(lastIdealStabilizePoint !== undefined, true);
assert.equal(
  idealReleasePoints[0].pressureDeltaKPa < (lastIdealStabilizePoint?.pressureDeltaKPa ?? 0) - 0.001,
  true,
  'ideal release should start changing immediately instead of keeping a mechanical-response plateau',
);
assert.equal(
  idealReleasePoints.every((point, index) => (
    index === 0 ||
    point.timeS > idealReleasePoints[index - 1].timeS
  )),
  true,
  'ideal release samples should keep increasing time instead of drawing a backward cusp',
);
assert.equal(
  idealReleasePoints.every((point) => point.timeS <= (idealReleaseStage?.endS ?? Number.POSITIVE_INFINITY) + 0.000001),
  true,
  'ideal release samples should not overshoot the optimized release window',
);
const idealReleasePressureDrops = idealReleasePoints
  .slice(1)
  .map((point, index) => Math.abs(point.pressureDeltaKPa - idealReleasePoints[index].pressureDeltaKPa));
const strongestIdealReleasePressureDrop = Math.max(...idealReleasePressureDrops);
const finalIdealReleasePressureDrop = idealReleasePressureDrops.at(-1) ?? Number.POSITIVE_INFINITY;
assert.equal(
  finalIdealReleasePressureDrop < strongestIdealReleasePressureDrop * 0.65,
  true,
  'ideal release should ease out before recovery so the reference line does not form a hard point',
);
const actualProcessEndS = Math.max(...review.chart.stages.map((stage) => stage.endS));
const latestIdealTime = Math.max(
  ...reviewChart.idealReferenceTrace!.map((point) => point.timeS),
  ...reviewChart.idealReferenceStages!.map((stage) => stage.endS),
);
assert.equal(
  latestIdealTime < actualProcessEndS - 10,
  true,
  'ideal reference display should be allowed to end on its own optimized timeline instead of being stretched to the actual experiment window',
);
assert.equal(review.chart.bestWindows.length, 3);
assert.equal(review.chart.stages.some((stage) => stage.id === 'release' && stage.label === '开阀放气'), true);
assert.equal(review.chart.stages.some((stage) => stage.id === 'recover' && stage.label === '关阀回温'), true);
assert.equal(review.score.maxScore, 100);
assert.equal(review.score.total !== null, true);
assert.equal(review.diagnostics.map((row) => row.id).join(','), 'pumping,release,recording,retake');
for (const row of review.diagnostics) {
  assert.equal(Array.isArray(row.details), true, `${row.id} should expose expandable score details`);
  assert.equal((row.details ?? []).length > 0, true, `${row.id} should have at least one detail row`);
  assert.equal(
    (row.details ?? []).reduce((sum, detail) => sum + detail.maxScore, 0),
    row.maxScore,
    `${row.id} detail max score should match row max score`,
  );
  assert.equal(
    (row.details ?? []).reduce((sum, detail) => sum + detail.score, 0),
    row.score,
    `${row.id} detail score should match row score`,
  );
  assert.equal(
    (row.details ?? []).some((detail) => detail.reason.length > 0 && detail.recommendation.length > 0),
    true,
    `${row.id} details should explain reason and recommendation`,
  );
  const rowCopy = [
    row.evidence,
    row.relation,
    row.recommendation,
    ...(row.details ?? []).flatMap((detail) => [
      detail.evidence,
      detail.reason,
      detail.recommendation,
    ]),
  ].join('\n');
  assert.doesNotMatch(rowCopy, /共同决定|不按理论答案反推|主要扣分来源|分支只作为过程参考/);
}
assert.equal(review.diagnostics.find((row) => row.id === 'pumping')?.status, 'reasonable');
assert.equal(review.diagnostics.find((row) => row.id === 'pumping')?.score !== null, true);
assert.equal(typeof review.diagnostics.find((row) => row.id === 'pumping')?.relation, 'string');
assert.equal(review.diagnostics.find((row) => row.id === 'release')?.status, 'reasonable');
assert.equal(review.diagnostics.find((row) => row.id === 'recording')?.status, 'reasonable');
assert.equal(review.diagnostics.find((row) => row.id === 'retake')?.status, 'retaken');
const recordingDiagnosis = review.diagnostics.find((row) => row.id === 'recording');
const recordingDiagnosisCopy = [
  recordingDiagnosis?.evidence,
  recordingDiagnosis?.relation,
  recordingDiagnosis?.recommendation,
].filter(Boolean).join('\n');
assert.match(recordingDiagnosis?.evidence ?? '', /U0/);
assert.match(recordingDiagnosis?.evidence ?? '', /U1/);
assert.match(recordingDiagnosis?.evidence ?? '', /U2/);
assert.doesNotMatch(recordingDiagnosisCopy, /。；|；。|trace|样本/);
assert.doesNotMatch(recordingDiagnosisCopy, /最佳窗口/);

const secondTrial: HeatCapacityFreeTrial = {
  ...trial,
  id: 'free-trial-2',
  traceTrialId: traceTrial.id,
  branchCount: 1,
};

const selectedFirstReview = selectHeatCapacityFreeProcessReview({
  trials: [trial, secondTrial],
  traceStore: store,
  theoreticalGamma: 1.4,
  selectedTrialId: 'free-trial-1',
});

assert.equal(selectedFirstReview.summary?.trialId, 'free-trial-1');
assert.equal(selectedFirstReview.selectedTrialId, 'free-trial-1');
assert.equal(selectedFirstReview.trialOptions.length, 2);

const incompleteTrial: HeatCapacityFreeTrial = {
  ...trial,
  id: 'free-trial-incomplete',
  u1: null,
  u2: null,
  correctedSignals: null,
};

const incompleteReview = selectHeatCapacityFreeProcessReview({
  trials: [incompleteTrial],
  traceStore: store,
  selectedTrialId: incompleteTrial.id,
});

assert.equal(incompleteReview.status, 'incomplete');
assert.equal(incompleteReview.summary?.gamma, null);
assert.equal(incompleteReview.score.total, null);
assert.equal(incompleteReview.chart.trace.length > 0, true);

const selectReviewWithSnapshot = (
  id: string,
  snapshot: typeof configSnapshot,
) => {
  const nextTraceTrial: HeatCapacityFreeTraceTrial = {
    ...traceTrial,
    id: `trace-${id}`,
    linkedTrialId: `trial-${id}`,
    configSnapshot: snapshot,
  };
  const nextTrial: HeatCapacityFreeTrial = {
    ...trial,
    id: `trial-${id}`,
    traceTrialId: nextTraceTrial.id,
    configSnapshot: snapshot,
  };
  return selectHeatCapacityFreeProcessReview({
    trials: [nextTrial],
    traceStore: {
      ...store,
      activeTraceTrialId: nextTraceTrial.id,
      traceTrials: [nextTraceTrial],
    },
    theoreticalGamma: 1.4,
  });
};

const idealSignature = (
  chart: HeatCapacityFreeProcessReview['chart'] & {
    idealReferenceTrace?: NonNullable<typeof reviewChart.idealReferenceTrace>;
  },
) => (chart.idealReferenceTrace ?? [])
  .filter((point) => point.stageId !== 'zero')
  .slice(0, 36)
  .map((point) => `${point.stageId}:${point.timeS}:${point.pressureDeltaKPa}:${point.temperatureDeltaK}`)
  .join('|');

const leakySnapshot = {
  ...configSnapshot,
  physics: {
    ...configSnapshot.physics,
    leakage: {
      ...configSnapshot.physics.leakage,
      enabled: true,
      ratePerS: 0.025,
    },
  },
};
const leakyReview = selectReviewWithSnapshot('leaky', leakySnapshot);
const leakyChart = leakyReview.chart as typeof leakyReview.chart & {
  idealReferenceTrace?: NonNullable<typeof reviewChart.idealReferenceTrace>;
};
assert.equal(
  idealSignature(leakyChart),
  idealSignature(reviewChart),
  'ideal reference should ignore leakage by definition',
);

const noisySnapshot = {
  ...configSnapshot,
  sensor: {
    ...configSnapshot.sensor,
    noiseMv: 0.8,
  },
};
const noisyReview = selectReviewWithSnapshot('noisy', noisySnapshot);
const noisyChart = noisyReview.chart as typeof noisyReview.chart & {
  idealReferenceTrace?: NonNullable<typeof reviewChart.idealReferenceTrace>;
};
assert.equal(
  idealSignature(noisyChart),
  idealSignature(reviewChart),
  'ideal reference should ignore instrument noise by definition',
);

const laggySnapshot = {
  ...configSnapshot,
  sensor: {
    ...configSnapshot.sensor,
    lagRate: 1.4,
    pumpLagRate: 1.2,
  },
};
const laggyReview = selectReviewWithSnapshot('laggy', laggySnapshot);
const laggyChart = laggyReview.chart as typeof laggyReview.chart & {
  idealReferenceTrace?: NonNullable<typeof reviewChart.idealReferenceTrace>;
};
assert.equal(
  idealSignature(laggyChart),
  idealSignature(reviewChart),
  'ideal reference should ignore sensor lag by definition',
);

const gammaSnapshot = {
  ...configSnapshot,
  physics: {
    ...configSnapshot.physics,
    gamma: 1.67,
  },
};
const gammaReview = selectReviewWithSnapshot('gamma', gammaSnapshot);
const gammaChart = gammaReview.chart as typeof gammaReview.chart & {
  idealReferenceTrace?: NonNullable<typeof reviewChart.idealReferenceTrace>;
};
assert.notEqual(
  idealSignature(gammaChart),
  idealSignature(reviewChart),
  'ideal reference should change when gamma changes',
);

const thermalSnapshot = {
  ...configSnapshot,
  physics: {
    ...configSnapshot.physics,
    thermal: {
      ...configSnapshot.physics.thermal,
      gasWallConductanceWPerK: configSnapshot.physics.thermal.gasWallConductanceWPerK * 1.8,
    },
  },
};
const thermalReview = selectReviewWithSnapshot('thermal', thermalSnapshot);
const thermalChart = thermalReview.chart as typeof thermalReview.chart & {
  idealReferenceTrace?: NonNullable<typeof reviewChart.idealReferenceTrace>;
};
assert.notEqual(
  idealSignature(thermalChart),
  idealSignature(reviewChart),
  'ideal reference should change when thermal conductance changes',
);

const emptyReview = selectHeatCapacityFreeProcessReview({
  trials: [],
  traceStore: createDefaultFreeTraceStore(),
});

assert.equal(emptyReview.status, 'empty');
assert.equal(emptyReview.selectedTrialId, null);
assert.equal(emptyReview.trialOptions.length, 0);
assert.equal(emptyReview.diagnostics[0]?.status, 'insufficient-data');

console.log('heatCapacityFreeProcessReviewModel tests passed');
