import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_PREHEAT_COMPLETION_HOLD_MS,
  HEAT_CAPACITY_REAL_PREHEAT_MINUTES,
  HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS,
  getHeatCapacityPreheatProgress,
  getHeatCapacityPreheatTotalPresentationMs,
} from '../../src/domain/heatCapacity/heatCapacityPreheatModel.ts';
import {
  completeHeatCapacityFreePreheatWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  createDefaultHeatCapacityFile,
  isHeatCapacityFreePreheatRequired,
  powerHeatCapacityWorkbenchFile,
  resetHeatCapacityFreeRunWorkbenchState,
  startHeatCapacityGuideWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';

assert.deepEqual(getHeatCapacityPreheatProgress(0), {
  elapsedMs: 0,
  progressRatio: 0,
  equivalentMinutes: 0,
  phase: 'warming',
});
assert.equal(getHeatCapacityPreheatProgress(4_000).equivalentMinutes, 16);
assert.equal(getHeatCapacityPreheatProgress(4_000).phase, 'nearly-ready');
assert.equal(getHeatCapacityPreheatProgress(5_000).equivalentMinutes, HEAT_CAPACITY_REAL_PREHEAT_MINUTES);
assert.equal(getHeatCapacityPreheatProgress(5_000).phase, 'complete');
assert.equal(
  getHeatCapacityPreheatTotalPresentationMs(),
  HEAT_CAPACITY_SIMULATED_PREHEAT_DURATION_MS + HEAT_CAPACITY_PREHEAT_COMPLETION_HOLD_MS,
);

const newFile = createDefaultHeatCapacityFile(1);
assert.equal(newFile.heatCapacityFreePreheatCompleted, false);
assert.equal(isHeatCapacityFreePreheatRequired(newFile), false, 'preheat starts only after power-on');
const poweredFreeFile = powerHeatCapacityWorkbenchFile(newFile, true, 10);
assert.equal(isHeatCapacityFreePreheatRequired(poweredFreeFile), true);
const preheatedFreeFile = completeHeatCapacityFreePreheatWorkbenchState(poweredFreeFile, 20);
assert.equal(preheatedFreeFile.heatCapacityFreePreheatCompleted, true);
assert.equal(isHeatCapacityFreePreheatRequired(preheatedFreeFile), false);
assert.equal(
  resetHeatCapacityFreeRunWorkbenchState(preheatedFreeFile, 30).heatCapacityFreePreheatCompleted,
  true,
  'resetting trials must not consume or reset the file-level preheat marker',
);

const guideFile = powerHeatCapacityWorkbenchFile(startHeatCapacityGuideWorkbenchState(newFile, 40), true, 50);
assert.equal(guideFile.heatCapacityGuideWorkflow.step, 'preheatRequired');
const guideAfterPreheat = completeHeatCapacityGuidePreheatWorkbenchState(guideFile, 60);
assert.equal(guideAfterPreheat.heatCapacityGuideWorkflow.step, 'openStopcockForZeroRequired');
assert.equal(
  guideAfterPreheat.heatCapacityFreePreheatCompleted,
  false,
  'guided preheat must not consume the first free-mode preheat marker',
);
