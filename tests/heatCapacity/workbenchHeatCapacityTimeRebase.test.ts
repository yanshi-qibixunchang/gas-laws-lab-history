import assert from 'node:assert/strict';
import { createHeatCapacityFreeAttempt } from '../../src/domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchState.ts';
import {
  hasSameHeatCapacityRuntimeRecoveryState,
  rebaseHeatCapacityFileAfterSuspendedWallClock,
} from '../../src/features/workbench/workbenchHeatCapacityTimeRebase.ts';

const base = createDefaultHeatCapacityFile(1);
const attempt = {
  ...createHeatCapacityFreeAttempt({
    startReason: 'u0-recorded',
    preheatOutcome: 'completed',
    atS: 5,
    wallClockMs: 1_000,
    powerOn: false,
  }),
  invalidatedAtWallClockMs: 1_500,
};
const suspended = {
  ...base,
  heatCapacityFreeRealDomain: {
    ...base.heatCapacityFreeRealDomain,
    activeAttempt: attempt,
  },
  heatCapacityFreeActiveAttempt: attempt,
  heatCapacityGuideWorkflow: {
    ...base.heatCapacityGuideWorkflow,
    releaseCloseResumeAtMs: 2_000,
  },
};

const resumed = rebaseHeatCapacityFileAfterSuspendedWallClock(suspended, 10_000, 80_000);
const resumedAttempt = resumed.heatCapacityFreeRealDomain.activeAttempt;

assert.ok(resumedAttempt);
assert.equal(resumedAttempt.startedAtWallClockMs, 71_000);
assert.equal(resumedAttempt.powerOffStartedAtWallClockMs, 71_000);
assert.equal(resumedAttempt.invalidatedAtWallClockMs, 71_500);
assert.equal(resumed.heatCapacityFreeActiveAttempt, resumedAttempt, 'the direct active-attempt projection must retain domain identity');
assert.equal(resumed.heatCapacityGuideWorkflow.releaseCloseResumeAtMs, 72_000);
assert.equal(
  resumedAttempt.powerOffStartedAtWallClockMs! - resumedAttempt.startedAtWallClockMs,
  attempt.powerOffStartedAtWallClockMs! - attempt.startedAtWallClockMs,
  'desktop cancellation must preserve active-attempt wall-clock invariants',
);
assert.equal(attempt.powerOffStartedAtWallClockMs, 1_000, 'rebasing must not mutate the suspended checkpoint');

const renamedDuringRecovery = {
  ...suspended,
  name: 'Renamed while the scene was rebuilding',
  updatedAt: suspended.updatedAt + 1,
};
assert.equal(
  hasSameHeatCapacityRuntimeRecoveryState(renamedDuringRecovery, suspended),
  true,
  'file metadata edits must not invalidate a runtime recovery token',
);

const presentationEditedDuringRecovery = {
  ...suspended,
  openHeatCapacityTabs: ['records' as const],
  activeHeatCapacityTabId: 'records' as const,
  heatCapacityMaterialsExpanded: !suspended.heatCapacityMaterialsExpanded,
  heatCapacityTabContainerHeight: suspended.heatCapacityTabContainerHeight + 24,
  hardSphereViewEnabled: !suspended.hardSphereViewEnabled,
  updatedAt: suspended.updatedAt + 2,
};
assert.equal(
  hasSameHeatCapacityRuntimeRecoveryState(presentationEditedDuringRecovery, suspended),
  true,
  'presentation-only tabs, sizing, and visual toggles must not shorten the runtime suspension interval',
);

const sameMillisecondRuntimeMutation = {
  ...suspended,
  runState: 'running' as const,
  updatedAt: suspended.updatedAt,
};
assert.equal(
  hasSameHeatCapacityRuntimeRecoveryState(sameMillisecondRuntimeMutation, suspended),
  false,
  'a runtime mutation must invalidate the token even when updatedAt collides in the same millisecond',
);

console.log('workbenchHeatCapacityTimeRebase tests passed');
