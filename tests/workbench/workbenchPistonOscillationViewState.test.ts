const runtimeUseWorkbenchPistonProcessingViewSource = readPistonRuntimeSource(new URL('../../src/features/workbench/useWorkbenchPistonProcessingView.ts', import.meta.url), 'utf8');
import { readFileSync as readPistonRuntimeSource } from 'node:fs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createPistonOscillationCalculationSession,
  createPistonOscillationDataProcessingSession,
  createPistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationFreeExperimentPlan,
  type PistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type {
  PistonOscillationGuideSession,
} from '../../src/domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  createDefaultIdealFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchFileState.ts';
import {
  createDefaultHeatCapacityFile,
} from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import {
  createDefaultHeatCapacityPistonOscillationFile,
} from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import {
  selectWorkbenchPistonOscillationViewState,
  type WorkbenchPistonOscillationViewInput,
} from '../../src/features/workbench/workbenchPistonOscillationViewState.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from '../pistonOscillation/helpers/pistonOscillationCurrentRecordTestFactory.ts';

const baseFile = createDefaultHeatCapacityPistonOscillationFile(1);
const samples = [
  { sampleIndex: 0, timeS: 0, absolutePressureKpa: 110 },
  { sampleIndex: 1, timeS: 0.001, absolutePressureKpa: 109 },
];
const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
  lockedHeightMm: 80, sampleRateHz: 1000, samples,
});
const record = createPistonOscillationRawMeasurementRecord({
  recordId: 'view-state-record',
  capturedAtMs: 100,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: artifacts.confirmedHeightMm,
  sampleRateHz: 1000,
  triggerThresholdKpa: 120,
  recordedDurationS: 0.001,
  recordingPath: 'falling-trigger',
  releaseOffsetS: null,
  samples,
  pressOperationEvidence: artifacts.pressOperationEvidence,
  sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
  physicsSnapshot: artifacts.physicsSnapshot,
});
const calculation = createPistonOscillationCalculationSession([record], 100);
const processing = {
  ...createPistonOscillationDataProcessingSession([record], 100),
  calculationSession: calculation,
};
const completedProcessing = {
  ...processing,
  status: 'completed' as const,
  calculationSession: { ...calculation, status: 'completed' as const },
};
const plan = createPistonOscillationFreeExperimentPlan([80, 70, 60]);
const reacquisition: PistonOscillationFreeSession['reacquisition'] = {
  schemaVersion: 1,
  targetId: 'target-2',
  measurementIndex: 1,
  excludedRecordId: 'old-record',
  returnRunIndex: 1,
  requestedAtMs: 200,
};
const fileWith = (
  guide: Partial<PistonOscillationGuideSession> = {},
  free: Partial<PistonOscillationFreeSession> = {},
) => ({
  ...baseFile,
  pistonOscillationGuideSession: { ...baseFile.pistonOscillationGuideSession, ...guide },
  pistonOscillationFreeSession: { ...baseFile.pistonOscillationFreeSession, ...free },
});
const deepFreeze = (value: object) => {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
};
let checkedViews = 0;
const select = (
  file: WorkbenchPistonOscillationViewInput['file'] = baseFile,
  overrides: Partial<Omit<WorkbenchPistonOscillationViewInput, 'file'>> = {},
) => {
  const input: WorkbenchPistonOscillationViewInput = {
    file,
    demoPlayback: { fileId: null, phase: 'idle' },
    freeSetupRequestedFileId: null,
    dataProcessingReviewRequested: false,
    processReviewRequested: false,
    calculationReviewRequested: false,
    processingSuppressedFileId: null,
    calculationSuppressedFileId: null,
    explorePowerOn: undefined,
    ...overrides,
  };
  deepFreeze(input);
  const before = JSON.stringify(input);
  const view = selectWorkbenchPistonOscillationViewState(input);
  assert.equal(JSON.stringify(input), before, 'deriving the view must not modify authoritative or transient state');
  checkedViews += 1;
  return view;
};

const idle = select();
assert.equal(idle.parameterMode, 'explore');
assert.equal(idle.powerOn, false);
assert.equal(select(baseFile, { explorePowerOn: true }).powerOn, true);
assert.strictEqual(idle.guideSession, baseFile.pistonOscillationGuideSession);
assert.strictEqual(idle.freeSession, baseFile.pistonOscillationFreeSession);

// Stale piston UI requests must not leak into any other experiment model.
for (const file of [createDefaultStandardFile(2), createDefaultIdealFile(2), createDefaultHeatCapacityFile(2)]) {
  const view = select(file, {
    demoPlayback: { fileId: file.id, phase: 'running' },
    freeSetupRequestedFileId: file.id,
    dataProcessingReviewRequested: true,
    processReviewRequested: true,
    calculationReviewRequested: true,
    explorePowerOn: true,
  });
  assert.deepEqual(view, {
    ...idle,
    guideSession: null,
    freeSession: null,
  });
}

// Preserve Demo > Guide > Free > Explore precedence, including completed modes.
const overlappingModes = fileWith(
  { status: 'active', powerOn: true },
  { status: 'active', powerOn: false },
);
for (const phase of ['running', 'paused', 'terminated', 'completed'] as const) {
  const view = select(overlappingModes, { demoPlayback: { fileId: baseFile.id, phase } });
  assert.equal(view.demoPlaybackPhase, phase);
  assert.equal(view.parameterMode, 'demo');
  assert.equal(view.parameterSidebarAvailable, false);
  assert.equal(view.powerOn, false);
  const otherFileView = select(overlappingModes, { demoPlayback: { fileId: 'another-file', phase } });
  assert.equal(otherFileView.demoPlaybackPhase, 'idle');
  assert.equal(otherFileView.parameterMode, 'guide');
  assert.equal(otherFileView.powerOn, true);
}
for (const completionExited of [false, true]) {
  const view = select(fileWith(
    { status: 'completed', completionExited, powerOn: false },
    { status: 'active', powerOn: true },
  ));
  assert.equal(view.guideSelected, !completionExited);
  assert.equal(view.parameterMode, completionExited ? 'free' : 'guide');
  assert.equal(view.parameterSidebarAvailable, completionExited);
  assert.equal(view.powerOn, completionExited);
}

for (const status of ['idle', 'active', 'paused'] as const) {
  for (const experimentPlan of [null, plan]) {
    for (const requestedFileId of [baseFile.id, 'another-file']) {
      const view = select(fileWith({}, { status, experimentPlan, powerOn: true }), {
        freeSetupRequestedFileId: requestedFileId,
      });
      assert.equal(view.freeSetupOpen, requestedFileId === baseFile.id
        && (status === 'idle' || (status === 'active' && experimentPlan === null)));
      assert.equal(view.freeSelected, status === 'active');
      assert.equal(view.parameterSidebarAvailable, status === 'active');
      assert.equal(view.powerOn, status === 'active');
    }
  }
}

// The power-off step restores the instrument; only calculationReady opens C.
for (const [step, expectedProcessing, expectedCalculation] of [
  ['periodProcessing', true, false],
  ['powerOff', false, false],
  ['calculationReady', false, true],
  ['completionReview', true, false],
] as const) {
  const file = fileWith({ status: 'active', step, dataProcessing: processing });
  const view = select(file);
  assert.equal(view.dataProcessingOpen, expectedProcessing, step);
  assert.equal(view.expandedRealtime, expectedProcessing, step);
  assert.equal(view.calculationWindowOpen, expectedCalculation, step);
  assert.strictEqual(view.calculationSession, calculation);
  assert.equal(select(file, { processingSuppressedFileId: file.id }).dataProcessingOpen, false);
  assert.equal(select(file, { calculationSuppressedFileId: file.id }).calculationWindowOpen, false);
  const switched = select(file, {
    processingSuppressedFileId: 'another-file',
    calculationSuppressedFileId: 'another-file',
  });
  assert.equal(switched.dataProcessingOpen, expectedProcessing);
  assert.equal(switched.calculationWindowOpen, expectedCalculation);
}
assert.equal(select(fileWith({ status: 'active', step: 'periodProcessing' })).dataProcessingOpen, false);
assert.equal(select(fileWith({ status: 'active', step: 'calculationReady' })).calculationWindowOpen, false);
assert.equal(select(fileWith({
  status: 'active', step: 'calculationReady', dataProcessing: completedProcessing,
})).calculationWindowOpen, false, 'a completed calculation must not automatically reopen');

const completedGuide = fileWith({
  status: 'completed', step: 'completed', completionExited: true, dataProcessing: completedProcessing,
});
assert.equal(select(completedGuide).dataProcessingOpen, false);
const guideReview = select(completedGuide, { dataProcessingReviewRequested: true, calculationReviewRequested: true });
assert.equal(guideReview.completedDataProcessingReview, true);
assert.equal(guideReview.dataProcessingOpen, true);
assert.equal(guideReview.calculationWindowOpen, true);
assert.equal(guideReview.processReviewOpen, false);
assert.strictEqual(guideReview.calculationSession, completedProcessing.calculationSession);
assert.equal(select(fileWith({ status: 'completed', dataProcessing: processing }), {
  dataProcessingReviewRequested: true,
}).dataProcessingOpen, false, 'an incomplete result is not a completed Guide review');

for (const status of ['period-processing', 'calculation-ready', 'completed'] as const) {
  for (const redo of [null, reacquisition]) {
    const file = fileWith({}, { status: 'active', reacquisition: redo, dataProcessing: { ...processing, status } });
    const view = select(file);
    assert.equal(view.dataProcessingOpen, redo === null && status !== 'completed');
    assert.equal(view.calculationWindowOpen, redo === null && status === 'calculation-ready');
    assert.equal(view.processReviewOpen, false);
  }
}
const completedFree = fileWith({}, { status: 'active', dataProcessing: completedProcessing });
for (const dataProcessingReviewRequested of [false, true]) {
  for (const processReviewRequested of [false, true]) {
    const view = select(completedFree, { dataProcessingReviewRequested, processReviewRequested });
    assert.equal(view.dataProcessingOpen, dataProcessingReviewRequested);
    assert.equal(view.processReviewOpen, processReviewRequested);
    assert.equal(view.expandedRealtime, dataProcessingReviewRequested || processReviewRequested);
  }
}
const suppressedReview = select(completedFree, {
  dataProcessingReviewRequested: true,
  processReviewRequested: true,
  calculationReviewRequested: true,
  processingSuppressedFileId: baseFile.id,
  calculationSuppressedFileId: baseFile.id,
});
assert.equal(suppressedReview.dataProcessingOpen, false);
assert.equal(suppressedReview.calculationWindowOpen, false);
assert.equal(suppressedReview.processReviewOpen, true, 'process review has its own independent display request');
assert.equal(suppressedReview.expandedRealtime, true);
const pausedFree = select(fileWith({}, { status: 'paused', dataProcessing: completedProcessing }), {
  dataProcessingReviewRequested: true, processReviewRequested: true, calculationReviewRequested: true,
});
assert.equal(pausedFree.expandedRealtime, false);
assert.equal(pausedFree.calculationWindowOpen, false);

// No fallback to old Guide answers while an active Free session owns calculation.
const freeWithoutResults = select(fileWith(
  { status: 'completed', dataProcessing: completedProcessing },
  { status: 'active' },
), { calculationReviewRequested: true });
assert.equal(freeWithoutResults.calculationSession, null);
assert.equal(freeWithoutResults.calculationWindowOpen, false);
const freeWithResults = select(fileWith(
  { status: 'completed', dataProcessing: completedProcessing },
  { status: 'active', dataProcessing: processing },
));
assert.strictEqual(freeWithResults.calculationSession, calculation);
assert.strictEqual(freeWithResults.freeSession?.dataProcessing, processing);
assert.strictEqual(freeWithResults.freeSession?.parameterDraft, baseFile.pistonOscillationFreeSession.parameterDraft);

const workbenchSource = readFileSync(new URL(
  '../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url,
), 'utf8');
assert.match(runtimeUseWorkbenchPistonProcessingViewSource, /from '\.\/workbenchPistonOscillationViewState\.ts'/);
assert.match(runtimeUseWorkbenchPistonProcessingViewSource, /calculationWindowOpen: pistonOscillationCalculationWindowOpen[\s\S]*selectWorkbenchPistonOscillationViewState\(\{\s*file: activeFile,/);
assert.doesNotMatch(workbenchSource, /const (pistonOscillationMandatoryDataProcessing|pistonOscillationCalculationAutoOpen) =/);

console.log(`workbenchPistonOscillationViewState tests passed (${checkedViews} frozen input scenarios)`);
