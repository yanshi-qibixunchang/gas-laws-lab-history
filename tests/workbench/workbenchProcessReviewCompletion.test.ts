import assert from 'node:assert/strict';
import { getProcessReviewCompletionKey, ProcessReviewCompletionTracker } from '../../src/features/workbench/workbenchProcessReviewCompletion.ts';
import { createDefaultStandardFile, createDefaultIdealFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import { createHeatCapacityFreeExperimentGroupDraft } from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import type { PistonOscillationDataProcessingSession } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';

assert.equal(getProcessReviewCompletionKey(createDefaultStandardFile()), null);
assert.equal(getProcessReviewCompletionKey(createDefaultIdealFile()), null);
for (const gasType of ['air', 'helium'] as const) for (const scheme of ['real', 'ideal'] as const) {
  const heat = createDefaultHeatCapacityFile();
  heat.heatCapacityMode = 'free';
  heat.heatCapacityFreeExperimentGroups = createHeatCapacityFreeExperimentGroupDraft(heat.heatCapacityFreeExperimentGroups,
    { id: `${gasType}-${scheme}`, gasType, scheme, targetExperimentCount: 4, now: 1 });
  const group = heat.heatCapacityFreeExperimentGroups.groups[0];
  group.status = scheme === 'real' ? 'awaiting-real-calculation' : 'awaiting-ideal-calculation';
  const tracker = new ProcessReviewCompletionTracker([heat]);
  assert.deepEqual(tracker.observe([heat]), [], 'acquisition does not open the review');
  group.status = 'completed'; group.completedAtMs = 10;
  assert.deepEqual(tracker.observe([heat]), [heat.id]);
  const before = JSON.stringify(heat);
  assert.deepEqual(tracker.observe([heat]), [], 'closing a review must not reopen it');
  assert.deepEqual(tracker.observe([]), []);
  assert.deepEqual(tracker.observe([JSON.parse(before)]), [], 'reopening a saved file is not a new completion');
  assert.deepEqual(new ProcessReviewCompletionTracker([heat]).observe([heat]), [], 'startup must not interrupt restored work');
  assert.deepEqual(new ProcessReviewCompletionTracker([]).observe([heat]), [], 'imported completed work is not a live completion');
  assert.equal(JSON.stringify(heat), before, 'presentation does not rewrite data');
  group.status = 'collecting';
  tracker.observe([heat]);
  group.status = 'completed'; group.completedAtMs = 20;
  assert.deepEqual(tracker.observe([heat]), [heat.id], 'a repeated experiment opens its new review');
  heat.heatCapacityMode = 'guide';
  assert.equal(getProcessReviewCompletionKey(heat), null, 'no process-review page in guide mode');
}

const piston = createDefaultHeatCapacityPistonOscillationFile();
piston.pistonOscillationFreeSession.status = 'active';
// Only the completion identity is used by this selector; numerical data is tested elsewhere.
const processing = { status: 'calculation-ready', startedAtMs: 5,
  calculationSession: { completedAtMs: 8 } } as PistonOscillationDataProcessingSession;
piston.pistonOscillationFreeSession.dataProcessing = processing;
const tracker = new ProcessReviewCompletionTracker([piston]);
assert.equal(getProcessReviewCompletionKey(piston), null);
processing.status = 'completed';
assert.deepEqual(tracker.observe([piston]), [piston.id]);
piston.updatedAt += 1;
assert.deepEqual(tracker.observe([piston]), [], 'presentation saves do not retrigger completion');
piston.pistonOscillationFreeSession.status = 'paused';
assert.equal(getProcessReviewCompletionKey(piston), null);
tracker.observe([piston]);
piston.pistonOscillationFreeSession.status = 'active';
assert.deepEqual(tracker.observe([piston]), [], 'resuming a completed mode must not reopen its review');
console.log('Process-review completion transitions, repeated runs, imports and restored records passed.');
