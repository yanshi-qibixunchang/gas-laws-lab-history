import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
  completeHeatCapacityFreePreheatWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  getHeatCapacityFreeBatchProgress,
  powerHeatCapacityWorkbenchFile,
  prepareNextHeatCapacityFreeExperimentWorkbenchState,
  registerHeatCapacityPumpStroke,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  stepHeatCapacityWorkbenchFile,
} from '../../src/features/workbench/workbenchState.ts';
import { getActiveHeatCapacityFreeTrialIndex } from '../../src/features/workbench/workbenchHeatCapacityFreeTrialState.ts';
import { getHeatCapacityFreeRecordedTrialIssue } from '../../src/features/workbench/workbenchHeatCapacityFreeRecordState.ts';
import { finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityFreeTraceState.ts';

let file = configureHeatCapacityFreeBatchWorkbenchState(createDefaultHeatCapacityFile(95), 3, 1);
let now = 100;
for (let i = 0; i < 3; i++) {
  file = powerHeatCapacityWorkbenchFile(file, true, now += 10);
  file = completeHeatCapacityFreePreheatWorkbenchState(file, now += 5_000);
  file = setHeatCapacityFreeStopcockOpen(file, true, now += 10);
  file = stepHeatCapacityWorkbenchFile(file, now += 1_000);
  const zero = applyHeatCapacityFreeRecordWorkbenchState(file, 'u0', now += 10);
  assert.equal(zero.accepted, true, `trial ${i + 1}: U0`);
  file = setHeatCapacityFreeStopcockOpen(zero.file, false, now += 10);
  file = stepHeatCapacityWorkbenchFile(file, now += 1_000);
  file = setHeatCapacityFreePumpValveOpen(file, true, now += 10);
  for (let stroke = 0; stroke < 4; stroke++) {
    file = registerHeatCapacityPumpStroke(file, now += 200);
    file = stepHeatCapacityWorkbenchFile(file, now += 120);
  }
  file = setHeatCapacityFreePumpValveOpen(file, false, now += 10);
  file = stepHeatCapacityWorkbenchFile(file, now += 20_000);
  const u1 = applyHeatCapacityFreeRecordWorkbenchState(file, 'u1', now += 10);
  assert.equal(u1.accepted, true, `trial ${i + 1}: U1`);
  file = setHeatCapacityFreeStopcockOpen(u1.file, true, now += 10);
  file = stepHeatCapacityWorkbenchFile(file, now += 750);
  file = setHeatCapacityFreeStopcockOpen(file, false, now += 10);
  file = stepHeatCapacityWorkbenchFile(file, now += 20_000);
  let u2 = applyHeatCapacityFreeRecordWorkbenchState(file, 'u2', now += 10);
  assert.equal(u2.accepted, true, `trial ${i + 1}: U2`);
  assert.notEqual(u2.file.heatCapacityFreeRunWorkspace.trials[i]?.correctedSignals, null);
  assert.equal(getHeatCapacityFreeRecordedTrialIssue(u2.file), null);
  // A user may inspect the readout and record U2 again before turning off power.
  u2 = applyHeatCapacityFreeRecordWorkbenchState(
    stepHeatCapacityWorkbenchFile(u2.file, now += 100), 'u2', now += 10,
  );
  assert.equal(u2.accepted, true);
  assert.equal(u2.file.heatCapacityFreeRunWorkspace.trials.length, i + 1);
  file = powerHeatCapacityWorkbenchFile(u2.file, false, now += 10);
  assert.equal(getHeatCapacityFreeBatchProgress(file).completedGroupCount, i + 1);
  assert.equal(file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.filter(t => t.status === 'completed').length, i + 1);
  assert.equal(getActiveHeatCapacityFreeTrialIndex({
    ...file,
    powerOn: true,
  }), -1, 'committed history must not become an editable trial when the old completion status is restored');
  assert.strictEqual(finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState(file, now + 5), file,
    'a second completion signal cannot rewrite saved trials or drop traces');
  if (i === 1) {
    // Resume at a power-off checkpoint before the UI prepares the next trial.
    let resumed = powerHeatCapacityWorkbenchFile(file, true, now + 20);
    resumed = setHeatCapacityFreeStopcockOpen(resumed, true, now + 30);
    resumed = stepHeatCapacityWorkbenchFile(resumed, now + 20_000);
    const nextZero = applyHeatCapacityFreeRecordWorkbenchState(resumed, 'u0', now + 20_010);
    assert.equal(nextZero.accepted, true);
    assert.equal(nextZero.trialIndex, 2, 'new U0 must append the third trial, not overwrite the second');
    assert.deepEqual(nextZero.file.heatCapacityFreeRunWorkspace.trials.slice(0, 2),
      file.heatCapacityFreeRunWorkspace.trials, 'both saved experiments must remain intact');
  }
  if (i < 2) file = prepareNextHeatCapacityFreeExperimentWorkbenchState(file, now += 10);
}
assert.notEqual(file.heatCapacityFreeRunWorkspace.batch.calculationSession, null);
assert.equal(file.heatCapacityFreeRunWorkspace.trials.length, 3);
console.log('workbenchHeatCapacityThreeTrialRecording tests passed');
