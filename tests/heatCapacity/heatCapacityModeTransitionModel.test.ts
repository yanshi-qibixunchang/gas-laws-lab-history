import assert from 'node:assert/strict';
import {
  createHeatCapacityModeTransitionCheckpoint,
  createHeatCapacityModeTransitionState,
  isHeatCapacityModeTransitionLocked,
  normalizeHeatCapacityModeTransitionCheckpoint,
  reduceHeatCapacityModeTransition,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionModel.ts';

let state = createHeatCapacityModeTransitionState('free');
state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionReasons: ['camera', 'instrument'],
});
assert.equal(state.phase, 'waiting-for-motion');
assert.deepEqual(state.sourceBlockers, ['camera', 'instrument']);
assert.equal(state.sourceMode, 'free');
assert.equal(state.targetMode, 'guide');
assert.equal(isHeatCapacityModeTransitionLocked(state), true);

state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'demo',
  sceneMotionReasons: ['camera'],
});
assert.equal(state.phase, 'waiting-for-motion');
assert.equal(state.targetMode, 'demo', 'the last request must replace an earlier request before switching starts');
assert.deepEqual(state.sourceBlockers, ['camera'], 'the replacement request owns a fresh source barrier');

state = reduceHeatCapacityModeTransition(state, {
  type: 'source-motion-changed',
  sceneMotionReasons: [],
});
assert.equal(state.phase, 'preparing-target');
state = reduceHeatCapacityModeTransition(state, {
  type: 'target-applied',
  targetMode: 'demo',
  startedAtMs: 1_000,
  durationMs: 380,
});
assert.equal(state.phase, 'animating');
assert.equal(state.visibleMode, 'demo');
assert.equal(state.sourceMode, 'free');
assert.equal(state.targetMode, 'demo');

state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionReasons: [],
});
state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'free',
  sceneMotionReasons: [],
});
assert.equal(state.queuedMode, 'free', 'the final click must win while the first transition is animating');
assert.equal(state.visibleMode, 'demo');

const animatingCheckpoint = createHeatCapacityModeTransitionCheckpoint(state, 1_100);
assert.equal(animatingCheckpoint.visualRemainingMs, 280);
const hydratedAnimating = normalizeHeatCapacityModeTransitionCheckpoint(animatingCheckpoint, 'demo', 5_000);
assert.equal(hydratedAnimating.phase, 'animating');
assert.equal(hydratedAnimating.visualStartedAtMs, 5_000);
assert.equal(hydratedAnimating.visualDurationMs, 280);
assert.equal(hydratedAnimating.queuedMode, 'free');

state = reduceHeatCapacityModeTransition(state, {
  type: 'animation-finished',
  sceneMotionReasons: [],
});
assert.equal(state.phase, 'preparing-target');
assert.equal(state.sourceMode, 'demo');
assert.equal(state.targetMode, 'free');

state = reduceHeatCapacityModeTransition(state, {
  type: 'target-applied',
  targetMode: 'free',
  startedAtMs: 2_000,
  durationMs: 380,
});
state = reduceHeatCapacityModeTransition(state, {
  type: 'animation-finished',
  sceneMotionReasons: [],
});
assert.equal(state.phase, 'idle');
assert.equal(state.visibleMode, 'free');
assert.equal(state.sourceMode, null);
assert.equal(isHeatCapacityModeTransitionLocked(state), false);

let preparingState = createHeatCapacityModeTransitionState('free');
preparingState = reduceHeatCapacityModeTransition(preparingState, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionReasons: [],
});
const firstRequestId = preparingState.requestId;
preparingState = reduceHeatCapacityModeTransition(preparingState, {
  type: 'request',
  targetMode: 'demo',
  sceneMotionReasons: [],
});
assert.equal(preparingState.phase, 'preparing-target');
assert.equal(preparingState.targetMode, 'demo');
assert.ok(preparingState.requestId > firstRequestId);

let cancelQueuedState = createHeatCapacityModeTransitionState('free');
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionReasons: [],
});
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'target-applied',
  targetMode: 'guide',
  startedAtMs: 10,
  durationMs: 380,
});
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'request',
  targetMode: 'demo',
  sceneMotionReasons: [],
});
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionReasons: [],
});
assert.equal(cancelQueuedState.queuedMode, null);

const malformed = normalizeHeatCapacityModeTransitionCheckpoint({ phase: 'animating' }, 'guide');
assert.deepEqual(malformed, createHeatCapacityModeTransitionState('guide'));

const coherentWaitingCheckpoint = {
  schemaVersion: 1 as const,
  phase: 'waiting-for-motion' as const,
  visibleMode: 'demo' as const,
  sourceMode: 'demo' as const,
  targetMode: 'guide' as const,
  queuedMode: null,
  requestId: 17,
  sourceBlockers: ['camera'] as const,
  visualRemainingMs: 0,
};
assert.equal(
  normalizeHeatCapacityModeTransitionCheckpoint(coherentWaitingCheckpoint, 'demo').phase,
  'waiting-for-motion',
  'a coherent source-side transaction should remain resumable',
);

const waitingCheckpointWithStaleQueue = normalizeHeatCapacityModeTransitionCheckpoint(
  {
    ...coherentWaitingCheckpoint,
    queuedMode: 'free',
  },
  'demo',
);
assert.equal(
  waitingCheckpointWithStaleQueue.queuedMode,
  null,
  'waiting-for-motion must discard a stale queue because the current target is still replaceable',
);

const preparingCheckpointWithStaleQueue = normalizeHeatCapacityModeTransitionCheckpoint(
  {
    ...coherentWaitingCheckpoint,
    phase: 'preparing-target',
    queuedMode: 'free',
    sourceBlockers: [],
  },
  'demo',
);
assert.equal(
  preparingCheckpointWithStaleQueue.queuedMode,
  null,
  'preparing-target must discard a stale queue because the incoming mode has not been applied yet',
);

const assertTornCheckpointFallsBackToIdle = (
  checkpoint: typeof coherentWaitingCheckpoint | Record<string, unknown>,
  fallbackMode: 'demo' | 'guide' | 'free',
  message: string,
) => {
  const normalized = normalizeHeatCapacityModeTransitionCheckpoint(checkpoint, fallbackMode);
  assert.equal(normalized.phase, 'idle', message);
  assert.equal(normalized.visibleMode, fallbackMode, message);
  assert.equal(isHeatCapacityModeTransitionLocked(normalized), false, message);
};

assertTornCheckpointFallsBackToIdle(
  { ...coherentWaitingCheckpoint, visibleMode: 'guide' },
  'demo',
  'the persisted session mode must own the visible projection',
);
assertTornCheckpointFallsBackToIdle(
  { ...coherentWaitingCheckpoint, sourceMode: 'free' },
  'demo',
  'waiting and preparing transactions must still display their source mode',
);
assertTornCheckpointFallsBackToIdle(
  {
    ...coherentWaitingCheckpoint,
    phase: 'animating',
    visibleMode: 'demo',
    sourceMode: 'free',
    targetMode: 'guide',
    sourceBlockers: [],
    visualRemainingMs: 100,
  },
  'demo',
  'an animating transaction must display its applied target mode',
);
assertTornCheckpointFallsBackToIdle(
  { ...coherentWaitingCheckpoint, targetMode: 'demo' },
  'demo',
  'a transition cannot target the same mode as its source',
);

const orderedModeRoutes = [
  { id: 'demo-guide-demo', kind: 'aba', modes: ['demo', 'guide', 'demo'] },
  { id: 'demo-free-demo', kind: 'aba', modes: ['demo', 'free', 'demo'] },
  { id: 'guide-demo-guide', kind: 'aba', modes: ['guide', 'demo', 'guide'] },
  { id: 'guide-free-guide', kind: 'aba', modes: ['guide', 'free', 'guide'] },
  { id: 'free-demo-free', kind: 'aba', modes: ['free', 'demo', 'free'] },
  { id: 'free-guide-free', kind: 'aba', modes: ['free', 'guide', 'free'] },
  { id: 'demo-guide-free-guide-demo', kind: 'three-mode', modes: ['demo', 'guide', 'free', 'guide', 'demo'] },
  { id: 'demo-free-guide-free-demo', kind: 'three-mode', modes: ['demo', 'free', 'guide', 'free', 'demo'] },
  { id: 'guide-demo-free-demo-guide', kind: 'three-mode', modes: ['guide', 'demo', 'free', 'demo', 'guide'] },
  { id: 'guide-free-demo-free-guide', kind: 'three-mode', modes: ['guide', 'free', 'demo', 'free', 'guide'] },
  { id: 'free-demo-guide-demo-free', kind: 'three-mode', modes: ['free', 'demo', 'guide', 'demo', 'free'] },
  { id: 'free-guide-demo-guide-free', kind: 'three-mode', modes: ['free', 'guide', 'demo', 'guide', 'free'] },
] as const;

const transitionBreakpoints = [
  {
    id: 'u2-recovery-wait',
    sceneMotionReasons: [],
    expectedInitialPhase: 'preparing-target',
  },
  {
    id: 'pump-focus-camera',
    sceneMotionReasons: ['camera'],
    expectedInitialPhase: 'waiting-for-motion',
  },
] as const;

const allModes = ['demo', 'guide', 'free'] as const;

const assertSettledTransition = (
  settledState: ReturnType<typeof createHeatCapacityModeTransitionState>,
  expectedVisibleMode: typeof allModes[number],
  context: string,
) => {
  assert.equal(settledState.phase, 'idle', `${context}: every completed segment must return to idle`);
  assert.equal(settledState.visibleMode, expectedVisibleMode, `${context}: the requested mode must be visible`);
  assert.equal(settledState.sourceMode, null, `${context}: the source mode must not leak past completion`);
  assert.equal(settledState.targetMode, null, `${context}: the target mode must not leak past completion`);
  assert.equal(settledState.queuedMode, null, `${context}: no queued target may survive completion`);
  assert.deepEqual(settledState.sourceBlockers, [], `${context}: no source blocker may survive completion`);
  assert.equal(settledState.visualStartedAtMs, null, `${context}: visual timing must be cleared`);
  assert.equal(settledState.visualDurationMs, 0, `${context}: visual duration must be cleared`);
  assert.equal(isHeatCapacityModeTransitionLocked(settledState), false, `${context}: completion must release the lock`);
};

let matrixCaseCount = 0;
for (const breakpoint of transitionBreakpoints) {
  for (const route of orderedModeRoutes) {
    matrixCaseCount += 1;
    let routeState = createHeatCapacityModeTransitionState(route.modes[0]);

    for (let segmentIndex = 1; segmentIndex < route.modes.length; segmentIndex += 1) {
      const sourceMode = routeState.visibleMode;
      const targetMode = route.modes[segmentIndex];
      const context = `${breakpoint.id}/${route.id}/segment-${segmentIndex}:${sourceMode}->${targetMode}`;
      const supersededTarget = allModes.find((mode) => mode !== sourceMode && mode !== targetMode);
      assert.notEqual(supersededTarget, undefined, `${context}: a three-mode matrix must always have a superseded target`);

      const requestIdBeforeSegment = routeState.requestId;
      routeState = reduceHeatCapacityModeTransition(routeState, {
        type: 'request',
        targetMode: supersededTarget!,
        sceneMotionReasons: breakpoint.sceneMotionReasons,
      });
      routeState = reduceHeatCapacityModeTransition(routeState, {
        type: 'request',
        targetMode,
        sceneMotionReasons: breakpoint.sceneMotionReasons,
      });

      assert.equal(
        routeState.phase,
        breakpoint.expectedInitialPhase,
        `${context}: the breakpoint must select the intended source barrier path`,
      );
      assert.equal(routeState.sourceMode, sourceMode, `${context}: the source mode must remain stable`);
      assert.equal(routeState.targetMode, targetMode, `${context}: the final click must replace the earlier target`);
      assert.equal(routeState.queuedMode, null, `${context}: replacement before target application must not create a queue`);
      assert.equal(
        routeState.requestId,
        requestIdBeforeSegment + 2,
        `${context}: both requests must receive distinct transaction generations`,
      );

      if (breakpoint.sceneMotionReasons.length > 0) {
        assert.deepEqual(
          routeState.sourceBlockers,
          breakpoint.sceneMotionReasons,
          `${context}: the camera barrier must remain registered while focus is moving`,
        );
        routeState = reduceHeatCapacityModeTransition(routeState, {
          type: 'source-motion-changed',
          sceneMotionReasons: breakpoint.sceneMotionReasons,
        });
        assert.equal(routeState.phase, 'waiting-for-motion', `${context}: an active camera must continue blocking`);
        routeState = reduceHeatCapacityModeTransition(routeState, {
          type: 'source-motion-changed',
          sceneMotionReasons: [],
        });
        assert.equal(routeState.phase, 'preparing-target', `${context}: settling the camera must release preparation`);
        assert.deepEqual(routeState.sourceBlockers, [], `${context}: the settled camera blocker must be removed`);
      } else {
        assert.deepEqual(routeState.sourceBlockers, [], `${context}: U2 waiting must not manufacture a blocker`);
      }

      const segmentStartedAtMs = matrixCaseCount * 10_000 + segmentIndex * 1_000;
      routeState = reduceHeatCapacityModeTransition(routeState, {
        type: 'target-applied',
        targetMode,
        startedAtMs: segmentStartedAtMs,
        durationMs: 380,
      });
      assert.equal(routeState.phase, 'animating', `${context}: applying the target must begin the visual transition`);
      assert.equal(routeState.visibleMode, targetMode, `${context}: the incoming mode must own the visible projection`);
      assert.equal(routeState.sourceMode, sourceMode, `${context}: the outgoing mode must remain identified during animation`);
      assert.equal(routeState.targetMode, targetMode, `${context}: the applied target must remain transaction-owned`);
      assert.deepEqual(routeState.sourceBlockers, [], `${context}: target animation must not inherit source blockers`);

      routeState = reduceHeatCapacityModeTransition(routeState, {
        type: 'animation-finished',
        sceneMotionReasons: [],
      });
      assertSettledTransition(routeState, targetMode, context);
    }

    assert.equal(
      routeState.visibleMode,
      route.modes[route.modes.length - 1],
      `${breakpoint.id}/${route.id}: the complete route must finish in its declared final mode`,
    );
  }
}

assert.equal(matrixCaseCount, 24, 'two breakpoints across twelve ordered routes must execute 24 logical cases');

console.log('heatCapacityModeTransitionModel tests passed');
