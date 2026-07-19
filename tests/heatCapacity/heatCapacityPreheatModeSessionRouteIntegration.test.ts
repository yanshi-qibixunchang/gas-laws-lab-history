import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimelineItemKey,
  getHeatCapacityAutoDemoTimeline,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import type { HeatCapacityMode } from '../../src/domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  getHeatCapacityPreheatProgress,
  getHeatCapacityPreheatTotalPresentationMs,
} from '../../src/domain/heatCapacity/heatCapacityPreheatModel.ts';
import {
  normalizeHeatCapacityAutoDemoResumeCursor,
} from '../../src/features/heatCapacity/heatCapacityAutoDemoPreheatResume.ts';
import {
  hasHeatCapacityModeSession,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  createHeatCapacityModeUiCheckpoint,
  type HeatCapacityModeUiCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  createWorkbenchHeatCapacityRefreshSession,
  type WorkbenchHeatCapacityRefreshSession,
} from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import {
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  enterHeatCapacityFreeModeWorkbenchState,
  isHeatCapacityFreePreheatRequired,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  startHeatCapacityGuideWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';

type Route = readonly [HeatCapacityMode, HeatCapacityMode, HeatCapacityMode] |
  readonly [HeatCapacityMode, HeatCapacityMode, HeatCapacityMode, HeatCapacityMode, HeatCapacityMode];

interface TestClock {
  nowMs: number;
}

interface SuspendedPreheatSnapshot {
  simulationTimeS: number;
  powerOn: boolean;
}

const createModeUiCheckpointFromRefreshFixture = (
  session: WorkbenchHeatCapacityRefreshSession,
): HeatCapacityModeUiCheckpoint => {
  const base = {
    fileId: session.activeHeatCapacityFileId,
    checkpointId: session.checkpointId,
    capturedAtMs: session.capturedAtMs,
    scene: {
      focusMode: session.focusMode,
      cameraPose: session.cameraPose,
      cameraTransition: null,
      ultraVisualState: null,
      hardSphereVisualCheckpoint: null,
      focusSession: null,
    },
    pumpAnimation: null,
  };
  if (session.mode === 'demo') {
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'demo',
      payload: { kind: 'demo', demo: session.demo },
    });
  }
  if (session.mode === 'guide') {
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'guide',
      payload: {
        kind: 'guide',
        guide: {
          missCount: session.guide.missCount,
          normalReminder: null,
          strongReminder: {
            active: session.guide.strongReminder.active,
            controlId: session.guide.strongReminder.controlId,
          },
          lessonDialog: session.guide.lessonDialog,
          shownLessonIds: session.guide.shownLessonIds,
          checklistViewedIndex: 0,
          pendingStrongReminder: null,
          baseStrongReminder: null,
        },
      },
    });
  }
  return createHeatCapacityModeUiCheckpoint({
    ...base,
    mode: 'free',
    payload: { kind: 'free' },
  });
};

const PREHEAT_TEN_MINUTES_WALL_CLOCK_MS = 2_500;
const timeline = getHeatCapacityAutoDemoTimeline(createHeatCapacityAutoDemoSteps());
const preheatStartIndex = timeline.findIndex((item) => (
  item.step.id === 'sensor-preheat' && item.stage === 'highlight'
));
const preheatStartElapsedMs = timeline[preheatStartIndex]?.atMs ?? -1;
const preheatTenMinuteElapsedMs = preheatStartElapsedMs + PREHEAT_TEN_MINUTES_WALL_CLOCK_MS;
let preheatTenMinuteItemIndex = -1;
timeline.forEach((item, index) => {
  if (item.atMs <= preheatTenMinuteElapsedMs) preheatTenMinuteItemIndex = index;
});

assert.notEqual(preheatStartIndex, -1);
assert.notEqual(preheatTenMinuteItemIndex, -1);
assert.equal(
  getHeatCapacityPreheatProgress(PREHEAT_TEN_MINUTES_WALL_CLOCK_MS).equivalentMinutes,
  10,
);

const advanceClock = (clock: TestClock, deltaMs: number) => {
  clock.nowMs += deltaMs;
  return clock.nowMs;
};

const activateFreshPreheat = (
  source: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  clock: TestClock,
) => {
  const activatedBase = mode === 'demo'
    ? prepareHeatCapacityAutoDemoStart(source, advanceClock(clock, 100))
    : mode === 'guide'
      ? startHeatCapacityGuideWorkbenchState(source, advanceClock(clock, 100))
      : enterHeatCapacityFreeModeWorkbenchState(source, advanceClock(clock, 100));
  const activated = mode === 'free'
    ? configureHeatCapacityFreeBatchWorkbenchState(
        activatedBase,
        3,
        advanceClock(clock, 1),
      )
    : activatedBase;
  return powerHeatCapacityWorkbenchFile(activated, true, advanceClock(clock, 100));
};

const assertPreheatPending = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
) => {
  assert.equal(file.heatCapacityMode, mode);
  assert.equal(file.powerOn, true, `${mode} must remain powered while preheat is interrupted`);
  if (mode === 'guide') {
    assert.equal(file.heatCapacityGuideWorkflow.step, 'preheatRequired');
  } else if (mode === 'free') {
    assert.equal(isHeatCapacityFreePreheatRequired(file), true);
    assert.equal(file.heatCapacityFreePreheatCompleted, false);
  } else {
    assert.equal(file.heatCapacityTeachingStatus, 'running');
  }
};

const createPreheatTenMinuteCheckpoint = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  nowMs: number,
): HeatCapacityModeUiCheckpoint => {
  const checkpoint = createWorkbenchHeatCapacityRefreshSession(file.id, mode, nowMs);
  if (mode !== 'demo') return createModeUiCheckpointFromRefreshFixture(checkpoint);
  const currentItem = timeline[preheatTenMinuteItemIndex]!;
  return createModeUiCheckpointFromRefreshFixture({
    ...checkpoint,
    demo: {
      ...checkpoint.demo,
      phase: 'running',
      elapsedMs: preheatTenMinuteElapsedMs,
      timeline: {
        ...checkpoint.demo.timeline,
        currentItemIndex: preheatTenMinuteItemIndex,
        nextItemIndex: preheatTenMinuteItemIndex + 1,
        currentItemKey: getHeatCapacityAutoDemoTimelineItemKey(
          currentItem,
          preheatTenMinuteItemIndex,
        ),
        currentStage: currentItem.stage,
        currentStepId: currentItem.step.id,
        currentStepIndex: currentItem.stepIndex,
        currentActionId: currentItem.action?.action ?? null,
        itemStartedAtElapsedMs: currentItem.atMs,
        executedItemKeys: timeline
          .slice(0, preheatTenMinuteItemIndex + 1)
          .map(getHeatCapacityAutoDemoTimelineItemKey),
      },
      stepPanel: {
        mode: 'visible',
        stepIndex: currentItem.stepIndex + 1,
        stepCount: createHeatCapacityAutoDemoSteps().length,
        title: currentItem.step.title,
        description: currentItem.step.description,
        target: currentItem.step.target,
        progressCriterion: currentItem.step.progressCriterion,
        note: currentItem.step.note,
      },
    },
  });
};

const assertPresentationRestartsAtZero = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
) => {
  assertPreheatPending(file, mode);
  const checkpoint = file.heatCapacityModeSessions[mode].uiCheckpoint;
  assert.notEqual(checkpoint, null);
  assert.equal(checkpoint?.mode, mode);
  if (mode !== 'demo') {
    assert.equal(
      checkpoint?.payload.kind,
      mode,
      `${mode} must have only its own mode-scoped payload`,
    );
    return;
  }
  if (checkpoint?.mode !== 'demo') throw new Error('Expected a Demo UI checkpoint.');
  const resumeCursor = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
    elapsedMs: checkpoint.payload.demo.elapsedMs,
    currentItemIndex: checkpoint.payload.demo.timeline.currentItemIndex,
    currentStepId: checkpoint.payload.demo.timeline.currentStepId,
    executedItemKeys: checkpoint.payload.demo.timeline.executedItemKeys,
  });
  assert.equal(resumeCursor.restartedInterruptedPreheat, true);
  assert.equal(resumeCursor.elapsedMs, preheatStartElapsedMs);
  assert.equal(
    (timeline.find((item) => (
      item.stage === 'preview' && item.step.id === 'open-stopcock-for-zero'
    ))?.atMs ?? 0) - resumeCursor.elapsedMs,
    getHeatCapacityPreheatTotalPresentationMs(),
    'Demo must replay the entire shared preheat presentation before advancing',
  );
};

const allModes: readonly HeatCapacityMode[] = ['demo', 'guide', 'free'];
const routes: Route[] = [
  ...allModes.flatMap((first) => allModes
    .filter((second) => second !== first)
    .map((second) => [first, second, first] as const)),
  ...allModes.flatMap((first) => allModes
    .filter((second) => second !== first)
    .flatMap((second) => allModes
      .filter((third) => third !== first && third !== second)
      .map((third) => [first, second, third, second, first] as const))),
];

let interruptionCount = 0;
let restoredPreheatCount = 0;

routes.forEach((route, routeIndex) => {
  const clock: TestClock = { nowMs: 50_000_000 + routeIndex * 1_000_000 };
  let file = createDefaultHeatCapacityFile(5_000 + routeIndex);
  const suspendedSnapshots = new Map<HeatCapacityMode, SuspendedPreheatSnapshot>();

  route.forEach((mode, visitIndex) => {
    const returning = hasHeatCapacityModeSession(file, mode);
    if (returning) {
      const restored = restoreHeatCapacityModeSession(file, mode, advanceClock(clock, 100));
      assert.notEqual(restored, null);
      file = restored!;
      assertPresentationRestartsAtZero(file, mode);
      const suspendedSnapshot = suspendedSnapshots.get(mode);
      assert.notEqual(suspendedSnapshot, undefined);
      assert.equal(
        file.simulationTimeS,
        suspendedSnapshot?.simulationTimeS,
        `${mode} preheat must not advance in the background`,
      );
      assert.equal(file.powerOn, suspendedSnapshot?.powerOn);
      restoredPreheatCount += 1;
    } else {
      file = activateFreshPreheat(file, mode, clock);
      assertPreheatPending(file, mode);
    }

    const isFinalVisit = visitIndex === route.length - 1;
    if (isFinalVisit) return;

    // Every departure follows the exact user path: power on, let the shared
    // presentation reach displayed 10 min, then request the next mode.
    file = stepHeatCapacityWorkbenchFile(
      file,
      advanceClock(clock, PREHEAT_TEN_MINUTES_WALL_CLOCK_MS),
    );
    assertPreheatPending(file, mode);
    const checkpoint = createPreheatTenMinuteCheckpoint(file, mode, clock.nowMs);
    if (mode === 'demo') {
      if (checkpoint.mode !== 'demo') throw new Error('Expected a Demo UI checkpoint.');
      assert.equal(
        checkpoint.payload.demo.elapsedMs - preheatStartElapsedMs,
        PREHEAT_TEN_MINUTES_WALL_CLOCK_MS,
      );
    }
    suspendedSnapshots.set(mode, {
      simulationTimeS: file.simulationTimeS,
      powerOn: file.powerOn,
    });
    file = suspendHeatCapacityModeSession(file, checkpoint, advanceClock(clock, 1));
    interruptionCount += 1;
  });
});

assert.equal(routes.length, 12);
assert.equal(interruptionCount, 36, 'all 36 departures must occur at displayed 10 min');
assert.equal(restoredPreheatCount, 18, 'all repeated mode visits must restart their preheat');

console.log(
  `heatCapacityPreheatModeSessionRouteIntegration tests passed ` +
  `(${routes.length} routes, ${interruptionCount} ten-minute interruptions, ` +
  `${restoredPreheatCount} zero-minute restores)`,
);
