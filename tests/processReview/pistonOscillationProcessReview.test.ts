import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type {
  PistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  selectPistonOscillationProcessReviewModels,
} from '../../src/features/processReview/pistonOscillationProcessReviewModel.ts';

const processReviewCss = readFileSync(new URL(
  '../../src/features/processReview/ExperimentProcessReviewPanel.css',
  import.meta.url,
), 'utf8');
const processReviewComponent = readFileSync(new URL(
  '../../src/features/processReview/ExperimentProcessReviewPanel.tsx',
  import.meta.url,
), 'utf8');

const samples = Array.from({ length: 1_001 }, (_, index) => ({
  timeS: index / 1_000,
  absolutePressureKpa: 101.3 + Math.exp(-index / 180) * Math.cos(index / 7) * 18,
}));

const createRecord = (recordId: string, measurementIndex: number, heightMm: number) => ({
  recordId,
  measurementIndex,
  targetHeightMm: heightMm,
  confirmedHeightMm: heightMm,
  capturedAtMs: 2_000 + measurementIndex * 1_000,
  samples,
  acquisitionSettings: {
    sampleRateHz: 1_000,
    triggerThresholdKpa: 120,
    recordedDurationS: 1,
    recordingPath: 'immediate',
    releaseOffsetS: 0,
  },
  pressOperationEvidence: {
    signedReleaseGapS: measurementIndex === 0 ? 0.012 : -0.063,
    releaseOrder: measurementIndex === 0 ? 'space-first' : 'mouse-first',
  },
});

const createRun = (recordId: string, measurementIndex: number, heightMm: number) => ({
  measurementIndex,
  targetHeightMm: heightMm,
  rawMeasurementRecordId: recordId,
  selection: {
    rangeStartTimeS: 0.01,
    rangeEndTimeS: 0.19,
    issue: null,
    extrema: [
      { type: 'maximum', timeS: 0.01 },
      { type: 'minimum', timeS: 0.025 },
      { type: 'maximum', timeS: 0.04 },
      { type: 'minimum', timeS: 0.055 },
      { type: 'maximum', timeS: measurementIndex === 0 ? 0.07 : 0.078 },
    ],
  },
  result: { t2S: 0.078, periodS: 0.034 },
  batchAttempts: [],
  answers: {
    t1: { resolution: 'correct' },
    t2: { resolution: 'correct' },
    period: { resolution: 'correct' },
  },
});

const records = [
  createRecord('run-1', 0, 80),
  createRecord('run-2', 1, 70),
];
const session = {
  status: 'active',
  savedMeasurements: records,
  excludedAttempts: [],
  primaryCycleEligibilityByRecordId: {},
  audit: [
    {
      type: 'operation-observed',
      operation: 'bottomImpact',
      measurementIndex: 1,
      eventId: 'impact-run-2',
      occurredAtMs: 2_800,
      sequence: 1,
      payload: { dropDistanceMm: 70 },
    },
    {
      type: 'measurement-saved',
      operation: 'saveMeasurement',
      measurementIndex: 0,
      eventId: 'save-run-1',
      occurredAtMs: 3_000,
      sequence: 2,
      payload: {},
    },
    {
      type: 'measurement-saved',
      operation: 'saveMeasurement',
      measurementIndex: 1,
      eventId: 'save-run-2',
      occurredAtMs: 4_000,
      sequence: 3,
      payload: {},
    },
  ],
  dataProcessing: {
    status: 'completed',
    runs: [
      createRun('run-1', 0, 80),
      createRun('run-2', 1, 70),
    ],
    linearFitResult: {
      selectedRunIndices: [0, 1],
      rSquared: 0.9912,
    },
    calculationSession: {
      batchAttempts: [],
      answers: {
        area: { expectedValue: 0.000113, resolution: 'correct' },
        gamma: { expectedValue: 1.397, resolution: 'correct' },
        relativeError: { expectedValue: 0.214, resolution: 'correct' },
      },
    },
  },
} as unknown as PistonOscillationFreeSession;

const models = selectPistonOscillationProcessReviewModels(session, 'zh-CN');
assert.equal(models.length, 2);
assert.equal(models[0]?.options.length, 2);
assert.equal(models[0]?.selectedOptionId, 'run-1');
assert.equal(models[1]?.selectedOptionId, 'run-2');
assert.notDeepEqual(
  models[0]?.stages.map((stage) => stage.id),
  models[1]?.stages.map((stage) => stage.id),
  'Run 1 and later runs must retain their different instrument workflows',
);
assert.equal(
  models[0]?.events.filter((event) => event.kind === 'record').length,
  1,
  'Save curve is the only hollow record node for a run',
);
assert.equal(
  models[1]?.events.some((event) => event.label === '活塞触底'),
  true,
  'observable bottom impact must remain traceable on the instrument timeline',
);
assert.equal(
  models.some((model) => model.events.some((event) => event.label.includes('暂停'))),
  false,
  'pause is intentionally excluded from the instrument timeline',
);
assert.ok(
  (models[0]?.charts[0]?.series[0]?.points.length ?? Infinity) <= 721,
  'only rendered SVG points should be downsampled',
);
assert.equal(records[0]?.samples.length, 1_001, 'the persisted raw record must remain unchanged');
assert.equal(models[1]?.scoreRows[0]?.tone, 'risk');
assert.equal(models[0]?.scoringEligible, true);
assert.equal(
  JSON.stringify(models[0]).includes('Run'),
  false,
  'Simplified-Chinese review copy must call each experiment 第 N 次 rather than Run N',
);
for (const model of models) {
  for (const row of model.scoreRows) {
    assert.ok((row.details?.length ?? 0) > 0, `${row.id} must expose expandable scoring details`);
    assert.equal(
      row.details?.reduce((sum, detail) => sum + (detail.score ?? 0), 0),
      row.score,
      `${row.id} detail scores must sum to the existing row score`,
    );
    assert.equal(
      row.details?.reduce((sum, detail) => sum + (detail.maxScore ?? 0), 0),
      row.maxScore,
      `${row.id} detail maxima must preserve the existing scoring rule`,
    );
  }
}
const idealSession = structuredClone(session) as unknown as Record<string, any>;
idealSession.experimentGroup = {
  scheme: 'ideal',
  gasMaterialSnapshot: { gasType: 'helium' },
};
idealSession.dataProcessing.scoringPolicy = {
  schemaVersion: 1,
  policyVersion: 'piston-oscillation-free-scoring-policy-v1',
  scheme: 'ideal',
  scoringEligible: false,
};
const idealModels = selectPistonOscillationProcessReviewModels(
  idealSession as unknown as PistonOscillationFreeSession,
  'zh-CN',
);
assert.equal(idealModels.length, models.length);
assert.equal(idealModels[0]?.scoringEligible, false);
assert.match(idealModels[0]?.experimentLabel ?? '', /理想实验过程 · 氦气/);
assert.match(idealModels[0]?.summaryNote ?? '', /理想实验不生成评分/);
assert.equal(idealModels[0]?.metrics[2]?.value, '--');
assert.equal(idealModels[0]?.metrics[3]?.value, '--');
assert.equal(idealModels[0]?.scoreTitle, '过程证据诊断');
assert.match(idealModels[0]?.scoreRule ?? '', /不生成数值评分/);
assert.equal(idealModels.every((model) => model.scoreRows.every((row) => (
  row.score === null
  && row.maxScore === null
  && row.details?.every((detail) => detail.score === null && detail.maxScore === null)
))), true);
assert.match(
  processReviewComponent,
  /row\.score === null \|\| row\.maxScore === null \? '--'/,
  'the shared review panel must render unscored evidence rows without numeric placeholders',
);
assert.match(
  processReviewCss,
  /\.epr-score \.hpr-diagnosis-row,[\s\S]*grid-template-columns: 148px/,
  'the piston scoring table must reserve enough width for an unbroken category label',
);
assert.match(
  processReviewCss,
  /\.epr-score \.hpr-diagnosis-title strong,[\s\S]*white-space: nowrap/,
  'the scoring category label must not leave a single Chinese character on a new line',
);

assert.deepEqual(
  selectPistonOscillationProcessReviewModels({ ...session, status: 'paused' }, 'zh-CN'),
  [],
  'the free-mode-only review must not leak from a paused session',
);

console.log('pistonOscillationProcessReview tests passed');
