import assert from 'node:assert/strict';
import { createHeatCapacityModeActions } from '../../src/features/workbench/workbenchHeatCapacityModeActions.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import {
  createHeatCapacityModeTransitionState,
  reduceHeatCapacityModeTransition,
  type HeatCapacityModeTransitionBlocker,
  type HeatCapacityModeTransitionEvent,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionModel.ts';
import {
  enterHeatCapacityFreeModeWorkbenchState,
  prepareHeatCapacityAutoDemoStart,
  startHeatCapacityGuideWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityTeachingLifecycleState.ts';
import { completeHeatCapacityTeachingModeWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityTeachingResultState.ts';
import { configureHeatCapacityFreeBatchWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityFreeExperimentGroupState.ts';
import { resetHeatCapacityFreeRunWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityFreeRunReset.ts';
import {
  enterHeatCapacityExploreModeWorkbenchState,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import type { WorkbenchHeatCapacityState } from '../../src/features/workbench/workbenchHeatCapacityStateTypes.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

const defaults = createDefaultHeatCapacityFile(1);
const base = enterHeatCapacityExploreModeWorkbenchState(defaults, defaults, 0);
const createHarness = (file: WorkbenchHeatCapacityState = base) => {
  const state = {
    file: file as WorkbenchFileState | undefined,
    transition: createHeatCapacityModeTransitionState(file.heatCapacityMode),
    failure: false, exiting: false, demoRunning: true,
    motionReasons: [] as HeatCapacityModeTransitionBlocker[],
    confirmations: [] as (() => void)[], frames: [] as (() => void)[],
    calls: [] as string[], saved: [] as (WorkbenchFileState | undefined)[],
  };
  const dispatch = (event: HeatCapacityModeTransitionEvent) => {
    state.calls.push(`dispatch:${event.type}`);
    state.transition = reduceHeatCapacityModeTransition(state.transition, event);
    return state.transition;
  };
  const actions = createHeatCapacityModeActions({
    now: () => 3_000,
    getActiveFile: () => state.file,
    getFile: (id) => state.file?.id === id ? state.file : undefined,
    commitFile: (next) => { state.calls.push(`commit:${next.heatCapacityMode}`); state.file = next; },
    hasRuntimeFailure: () => state.failure,
    isDesktopExitQuiesced: () => state.exiting,
    transition: {
      getState: () => state.transition,
      dispatch,
      request: (request, sceneMotionReasons) => dispatch({
        type: 'request', intent: { ...request, requestId: state.transition.lastIssuedRequestId + 1 }, sceneMotionReasons,
      }),
      getMotionReasons: () => state.motionReasons,
      schedulePreparation: (id) => { state.calls.push(`prepare:${id}`); },
    },
    persistence: {
      requestFrame: (callback) => { state.calls.push('frame'); state.frames.push(callback); },
      refresh: () => { state.calls.push('refresh'); state.saved.push(state.file); },
      flush: () => { state.calls.push('flush'); },
    },
    ui: {
      applyMode: (next) => { state.calls.push(`ui:${next.heatCapacityMode}`); },
      collapsePanels: () => { state.calls.push('collapse'); },
      expandFiles: () => { state.calls.push('expand'); },
      resetScene: () => { state.calls.push('reset-scene'); },
      startDemo: () => { state.calls.push('start-demo'); },
      showGuideStart: () => { state.calls.push('guide-notice'); },
      requestTeachingReset: (callback) => { state.calls.push('confirm'); state.confirmations.push(callback); },
    },
    demo: {
      isRunning: () => state.demoRunning,
      quiesce: (id) => { state.calls.push(`quiesce:${id}`); },
      resume: (id) => { state.calls.push(`resume:${id}`); },
    },
  });
  const runFrames = () => { for (const callback of state.frames.splice(0)) callback(); };
  const currentHeatFile = () => {
    assert.equal(state.file?.kind, 'heatCapacity');
    return state.file;
  };
  return { state, actions, runFrames, currentHeatFile };
};

for (const mode of ['demo', 'guide', 'free'] as const) {
  const h = createHarness();
  assert.deepEqual(h.state.calls, [], 'constructing the coordinator does no work');
  assert.equal(h.actions.activateFromExplore(mode, mode === 'free' ? 3 : null), true);
  assert.deepEqual(h.state.calls, [
    `commit:${mode}`, `ui:${mode}`, 'dispatch:synchronize', 'frame',
    ...(mode === 'demo' ? ['start-demo'] : mode === 'guide' ? ['guide-notice'] : []), 'collapse',
  ]);
  assert.equal(h.state.saved.length, 0, 'mode/UI commits precede the deferred save');
  h.runFrames();
  assert.deepEqual(h.state.calls.slice(-1), ['refresh'], 'synchronize does not flush');
  h.state.calls.length = 0;
  assert.equal(h.actions.exitToExplore(mode), true);
  assert.deepEqual(h.state.calls, ['reset-scene', 'commit:null', 'ui:null', 'dispatch:synchronize', 'frame', 'expand']);
  assert.equal(h.currentHeatFile().heatCapacityModeSessions[mode].status, mode === 'free' ? 'suspended' : 'empty');
}

{
  const completed = completeHeatCapacityTeachingModeWorkbenchState(startHeatCapacityGuideWorkbenchState(base, 1_000), 1_500);
  const h = createHarness(completed);
  h.actions.exitToExplore('guide');
  assert.equal(h.currentHeatFile().heatCapacityModeSessions.guide.status, 'completed');
  h.state.calls.length = 0;
  h.actions.activateFromExplore('guide');
  assert.equal(h.currentHeatFile().heatCapacityTeachingStatus, 'completed');
  assert.equal(h.state.calls.includes('guide-notice'), false, 'resuming a completed Guide must not restart its tutorial');
}

{
  const h = createHarness(prepareHeatCapacityAutoDemoStart(base, 1_000));
  h.actions.switchMode('guide');
  assert.deepEqual(h.state.calls, ['confirm']);
  assert.equal(h.state.frames.length, 0);
  // A delayed confirmation must read the live file and transition, not a captured source file.
  const nextFile = enterHeatCapacityFreeModeWorkbenchState(createDefaultHeatCapacityFile(2), 2_000);
  h.state.file = nextFile;
  h.state.calls.length = 0;
  h.state.confirmations[0]();
  assert.deepEqual(h.state.calls, ['collapse', 'dispatch:synchronize', 'frame', 'dispatch:request', 'frame', 'prepare:1']);
  assert.equal(h.state.transition.sourceMode, 'free');
  assert.equal(h.state.transition.targetMode, 'guide');
  h.runFrames();
  assert.deepEqual(h.state.calls.slice(-3), ['refresh', 'refresh', 'flush']);
  assert.deepEqual(h.state.saved, [nextFile, nextFile]);
}

{
  const h = createHarness(prepareHeatCapacityAutoDemoStart(base, 1_000));
  h.state.motionReasons = ['camera'];
  h.actions.switchMode('guide', 'mode-control', true);
  assert.equal(h.state.transition.phase, 'waiting-for-motion');
  assert.deepEqual(h.state.calls, ['collapse', `quiesce:${base.id}`, 'dispatch:request', 'frame']);
  h.state.calls.length = 0;
  h.actions.switchMode('demo');
  assert.equal(h.state.transition.phase, 'idle');
  assert.deepEqual(h.state.calls, ['dispatch:request', 'frame', `resume:${base.id}`]);
}

for (const blocker of ['failure', 'exiting'] as const) {
  for (const action of ['event', 'switch'] as const) {
    const h = createHarness(enterHeatCapacityFreeModeWorkbenchState(base, 1_000));
    if (action === 'event') h.actions.applyTransitionEvent({ type: 'synchronize', visibleMode: 'free' });
    else h.actions.switchMode('guide');
    h.state[blocker] = true;
    h.runFrames();
    assert.equal(h.state.calls.includes('refresh'), false, `${blocker} must block a queued ${action} save`);
    assert.equal(h.state.calls.includes('flush'), false);
  }
}

{
  const h = createHarness();
  h.state.failure = true;
  h.actions.switchMode('guide');
  assert.deepEqual(h.state.calls, []);
  h.state.failure = false;
  h.state.file = undefined;
  h.actions.switchMode('free');
  assert.equal(h.actions.activateFromExplore('guide'), false);
  assert.equal(h.actions.exitToExplore('guide'), false);
  assert.equal(h.actions.activateFile('missing'), undefined);
  assert.deepEqual(h.state.calls, []);
}

{
  const h = createHarness(enterHeatCapacityFreeModeWorkbenchState(base, 1_000));
  assert.equal(h.actions.activateFromExplore('guide'), false);
  assert.equal(h.actions.exitToExplore('guide'), false);
  h.actions.switchMode('guide');
  h.state.calls.length = 0;
  assert.equal(h.actions.exitToExplore('free'), false, 'an in-flight transition owns the scene');
  assert.deepEqual(h.state.calls, []);
}

{
  const h = createHarness();
  assert.equal(h.actions.activateFile(base.id), undefined, 'Explore must not override the active-mode checkpoint');
  assert.deepEqual(h.state.calls, ['commit:null', 'ui:null', 'dispatch:synchronize', 'frame']);
  h.state.file = prepareHeatCapacityAutoDemoStart(base, 1_000);
  const fallback = h.actions.activateFile(base.id);
  assert.equal(fallback?.file.heatCapacityMode, 'free');
  assert.equal(fallback?.checkpoint, null, 'invalid Demo returns an explicit null checkpoint for the fallback mode');
}

{
  const free = configureHeatCapacityFreeBatchWorkbenchState(enterHeatCapacityFreeModeWorkbenchState(base, 1_000), 5, 1_100);
  const staleSession = suspendHeatCapacityModeSession({ ...free, powerOn: true, pumpStrokeCount: 4 }, null, 1_500);
  const h = createHarness(resetHeatCapacityFreeRunWorkbenchState(staleSession, 2_000));
  const reset = h.currentHeatFile();
  h.actions.exitToExplore('free');
  h.actions.activateFromExplore('free');
  assert.deepEqual(h.currentHeatFile().heatCapacityFreeExperimentGroups, reset.heatCapacityFreeExperimentGroups);
  assert.equal(h.currentHeatFile().powerOn, false);
  assert.equal(h.currentHeatFile().pumpStrokeCount, 0);
  assert.equal(h.currentHeatFile().heatCapacityFreeRunWorkspace.trials.length, 0, 'returning after a full runtime reset must not resurrect old measurements');
}

console.log('workbenchHeatCapacityModeActions tests passed');
