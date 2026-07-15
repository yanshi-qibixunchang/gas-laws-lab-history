import assert from 'node:assert/strict';
import {
  createHeatCapacityModeTransitionCheckpoint,
  normalizeHeatCapacityModeTransitionCheckpoint,
  type HeatCapacityModeTransitionCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionModel.ts';
import {
  createWorkbenchHeatCapacityRefreshSession,
  normalizeWorkbenchHeatCapacityRefreshSession,
} from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';

const capturedAtMs = 1_720_000_000_000;

const assertRefreshUsesCanonicalTransitionNormalization = (
  checkpoint: HeatCapacityModeTransitionCheckpoint,
  mode: 'demo' | 'guide' | 'free',
  message: string,
) => {
  const session = createWorkbenchHeatCapacityRefreshSession(`heat-capacity-${mode}`, mode, capturedAtMs);
  session.modeTransition = checkpoint;

  const normalizedSession = normalizeWorkbenchHeatCapacityRefreshSession(session);
  const expectedCheckpoint = createHeatCapacityModeTransitionCheckpoint(
    normalizeHeatCapacityModeTransitionCheckpoint(checkpoint, mode, capturedAtMs),
    capturedAtMs,
  );

  assert.deepEqual(normalizedSession?.modeTransition, expectedCheckpoint, message);
};

assertRefreshUsesCanonicalTransitionNormalization(
  {
    schemaVersion: 1,
    phase: 'waiting-for-motion',
    visibleMode: 'demo',
    sourceMode: 'demo',
    targetMode: 'guide',
    queuedMode: 'free',
    requestId: 31,
    sourceBlockers: ['camera'],
    visualRemainingMs: 0,
  },
  'demo',
  'refresh normalization must use the transition model result and remove a stale waiting queue',
);

assertRefreshUsesCanonicalTransitionNormalization(
  {
    schemaVersion: 1,
    phase: 'preparing-target',
    visibleMode: 'free',
    sourceMode: 'free',
    targetMode: 'demo',
    queuedMode: 'guide',
    requestId: 32,
    sourceBlockers: [],
    visualRemainingMs: 0,
  },
  'free',
  'refresh normalization must use the transition model result and remove a stale preparation queue',
);

assertRefreshUsesCanonicalTransitionNormalization(
  {
    schemaVersion: 1,
    phase: 'animating',
    visibleMode: 'guide',
    sourceMode: 'demo',
    targetMode: 'guide',
    queuedMode: 'free',
    requestId: 33,
    sourceBlockers: [],
    visualRemainingMs: 180,
  },
  'guide',
  'refresh normalization must preserve the final legal queue while target animation is active',
);

const guideReminderDueSession = createWorkbenchHeatCapacityRefreshSession(
  'heat-capacity-guide-reminder-due',
  'guide',
  capturedAtMs,
);
guideReminderDueSession.ui.layout = {
  pendingStrongReminderControlId: 'recordU1',
  pendingStrongReminderRemainingMs: 0,
};

const normalizedGuideReminderDueSession = normalizeWorkbenchHeatCapacityRefreshSession(
  guideReminderDueSession,
);
assert.equal(
  normalizedGuideReminderDueSession?.ui.layout.pendingStrongReminderRemainingMs,
  0,
  'a due-but-paused strong reminder must retain its explicit zero-millisecond deadline',
);
assert.equal(
  normalizedGuideReminderDueSession?.ui.layout.pendingStrongReminderControlId,
  'recordU1',
  'the due reminder must retain the control it belongs to',
);

console.log('workbenchHeatCapacityRefreshNormalization tests passed');
