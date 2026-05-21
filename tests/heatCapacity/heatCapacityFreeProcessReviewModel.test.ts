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
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';

const configSnapshot = createDefaultFreeConfigSnapshot();

const createSampleInput = (
  atS: number,
  pressureMv: number,
  temperatureMv: number,
  overrides: Partial<HeatCapacityFreeTraceSampleInput> = {},
): HeatCapacityFreeTraceSampleInput => ({
  atS,
  reason: 'periodic',
  phase: 'sealedStabilizing',
  controls: {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
  },
  physical: {
    gasPressureKPa: 101.3 + pressureMv / 20,
    pressureDeltaKPa: pressureMv / 20,
    gasTemperatureK: 298.15 + (temperatureMv - 1499) / 2,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1,
    pumpStrokeCount: 0,
    releaseStarted: false,
    currentStopcockOpenDurationS: 0,
  },
  sensor: {
    displayPressureMv: pressureMv,
    displayTemperatureMv: temperatureMv,
    pressureSlopeMvPerS: 0.03,
    temperatureSlopeMvPerS: 0.02,
  },
  calibration: {
    calibrationVersion: 1,
    zeroOffsetMv: 0,
    zeroEventId: 'zero-1',
  },
  stability: {
    pressureStable: true,
    temperatureStable: true,
  },
  safetyStatus: 'normal',
  ...overrides,
});

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
assert.equal(review.chart.controls.some((event) => event.kind === 'pumpBulb' && event.label === '打气球 x10'), true);
assert.equal(
  review.chart.controls.filter((event) => event.kind === 'pumpBulb' && event.count === undefined).length,
  10,
  'process review should keep each pump stroke as its own chart control marker instead of only one merged xN label',
);
assert.equal(review.chart.records.map((record) => record.id).join(','), 'u0,u1,u2');
assert.equal(review.chart.systemEvents.some((event) => event.kind === 'warning'), true);
assert.equal(review.chart.referenceTrace.length > 0, true);
assert.equal(review.chart.referenceTrace.some((point) => point.stageId === 'release'), true);
assert.equal(review.chart.operableBestTrace.length > 0, true);
assert.equal(review.chart.operableBestTrace.some((point) => point.stageId === 'release'), true);
assert.notDeepEqual(
  review.chart.operableBestTrace.filter((point) => point.stageId !== 'zero').map((point) => `${point.timeS}:${point.pressureDeltaKPa}`),
  review.chart.referenceTrace.filter((point) => point.stageId !== 'zero').map((point) => `${point.timeS}:${point.pressureDeltaKPa}`),
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

const emptyReview = selectHeatCapacityFreeProcessReview({
  trials: [],
  traceStore: createDefaultFreeTraceStore(),
});

assert.equal(emptyReview.status, 'empty');
assert.equal(emptyReview.selectedTrialId, null);
assert.equal(emptyReview.trialOptions.length, 0);
assert.equal(emptyReview.diagnostics[0]?.status, 'insufficient-data');

console.log('heatCapacityFreeProcessReviewModel tests passed');
