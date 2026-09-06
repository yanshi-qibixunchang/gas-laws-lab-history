const heatDesktopExitSource = readHeatRuntimeSource(new URL('../../src/features/workbench/workbenchDesktopExitQuiescence.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatSceneStateSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatSceneState.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatModeRuntimeSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatModeRuntime.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeworkbenchTeachingUiTimingSource = readHeatRuntimeSource(new URL('../../src/features/workbench/workbenchTeachingUiTiming.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatRuntimeRecoverySource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatRuntimeRecovery.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
import { readFileSync as readHeatRuntimeSource } from 'node:fs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createHeatCapacityModeTransitionState,
  reduceHeatCapacityModeTransition,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionModel.ts';
import {
  shouldRunHeatCapacityModeTransitionWatchdog,
} from '../../src/features/workbench/useHeatCapacityModeSessionCoordinator.ts';

const root = process.cwd();
const workbench = readFileSync(join(root, 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'), 'utf8');
const coordinator = readFileSync(join(root, 'src', 'features', 'workbench', 'useHeatCapacityModeSessionCoordinator.ts'), 'utf8');
const scene = readFileSync(join(root, 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx'), 'utf8');

assert.match(coordinator, /HEAT_CAPACITY_MODE_TRANSITION_WATCHDOG_MS = 2_000/);
const pendingTransition = reduceHeatCapacityModeTransition(
  createHeatCapacityModeTransitionState('free'),
  {
    type: 'request',
    intent: {
      requestId: 1,
      sourceMode: 'free',
      targetMode: 'guide',
      reason: 'mode-control',
    },
    sceneMotionReasons: ['camera'],
  },
);
assert.equal(shouldRunHeatCapacityModeTransitionWatchdog(pendingTransition, true), false);
assert.equal(shouldRunHeatCapacityModeTransitionWatchdog(pendingTransition, false), true);
assert.equal(
  shouldRunHeatCapacityModeTransitionWatchdog(createHeatCapacityModeTransitionState('free'), false),
  false,
);
assert.match(
  coordinator,
  /watchdogPaused[\s\S]*shouldRunHeatCapacityModeTransitionWatchdog\(state, watchdogPaused\)[\s\S]*window\.setTimeout/,
  'the watchdog must receive a full fresh timeout only after hydration or desktop quiescence releases its pause gate',
);
assert.match(
  runtimeuseWorkbenchHeatSceneStateSource,
  /watchdogPaused:[\s\S]*?heatCapacityRefreshRestoring[\s\S]*?desktopExitQuiesced[\s\S]*?heatCapacityRuntimeFailureFileId !== null/,
  'scene hydration, desktop exit, and runtime failure must all pause the transition watchdog',
);
assert.match(scene, /settleMotions: \(requestId: number\) => Promise<boolean>/);
assert.match(
  scene,
  /pause: \(requestId\) => \{[\s\S]*heatCapacityModeTransitionPaused = 'true'[\s\S]*resume: \(requestId\) => \{[\s\S]*activeModeTransitionRequestIdRef\.current === requestId[\s\S]*delete root\.dataset\.heatCapacityModeTransitionPaused[\s\S]*return;/,
  'desktop pause must preserve and freeze the existing transition layers so cancel-resume is visually continuous',
);
assert.match(scene, /camera\.position\.copy\(targetPosition\)[\s\S]*transitionRuntimeRef\.current = null/);
assert.match(scene, /setIsOrbitInteracting\(false\)[\s\S]*setMotionSettleRevision/);
assert.match(runtimeuseWorkbenchHeatModeRuntimeSource, /completeHeatCapacityModeSourceMotions[\s\S]*pumpBulbState: 'idle'/);
assert.match(runtimeuseWorkbenchHeatModeRuntimeSource, /zeroAction\.atMs \+ HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS/);
assert.match(runtimeuseWorkbenchHeatModeRuntimeSource, /Promise\.race\(\[[\s\S]*controller\.settleMotions\(requestId\)/);
assert.match(runtimeworkbenchTeachingUiTimingSource, /HEAT_CAPACITY_MODE_TRANSITION_SETTLE_DEADLINE_MS = 250/);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /if \(!settled \|\| remainingReasons\.length > 0\)[\s\S]*abortHeatCapacityModeTransitionToVisibleFile\(requestId\)/,
);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /const pauseHeatCapacityModeTransitionRuntime =[\s\S]*?getHeatCapacityModeTransitionVisualRemainingMs\(transition\)[\s\S]*?\.pause\(transition\.requestId\)[\s\S]*?const resumeHeatCapacityModeTransitionRuntime =[\s\S]*?type: 'animation-clock-rebased'[\s\S]*?durationMs: remainingMs[\s\S]*?\.resume\(transition\.requestId\)[\s\S]*?\}, remainingMs\);/,
  'cancelled exit and scene-ready retry must resume only the frozen visual remainder',
);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /Heat-capacity mode transition watchdog failed\.[\s\S]*abortHeatCapacityModeTransitionToVisibleFile\(requestId\)/,
  'watchdog rejection should share the Demo-aware abort path',
);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /function prepareHeatCapacityModeTarget\(requestId: number\) \{[\s\S]*?desktopExitQuiescedRef\.current[\s\S]*?heatCapacityRefreshRestorePendingRef\.current[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*?\) return;/,
  'late target preparation must not run while hydration, desktop exit, or runtime failure owns the renderer',
);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /heatCapacityModeTransitionWatchdogHandlerRef\.current =[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*?const currentTransition =[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current !== null/,
  'the watchdog handler must reject both an early fire and a late async settle after any pause gate closes',
);
assert.match(heatDesktopExitSource, /const prepareDesktopExitQuiescence =[\s\S]*pauseHeatCapacityModeTransitionRuntime\(\)[\s\S]*const resumeDesktopExitQuiescence =[\s\S]*resumeHeatCapacityModeTransitionRuntime\(\)/, 'desktop close preparation pauses and resumes the transition through its runtime ports');
assert.match(workbench, /prepareDesktopExitQuiescenceRef\.current = prepareDesktopExitQuiescence;[\s\S]*resumeDesktopExitQuiescenceRef\.current = resumeDesktopExitQuiescence;/, 'the desktop coordinator receives the live paired commands');
assert.match(
  runtimeuseWorkbenchHeatRuntimeRecoverySource,
  /const handleHeatCapacitySceneRuntimeFailure =[\s\S]*?pauseHeatCapacityModeTransitionRuntime\(\)[\s\S]*?const handleHeatCapacitySceneRuntimeRecovered =[\s\S]*?const recoveryIntent[\s\S]*?rebaseHeatCapacityFileAfterSuspendedWallClock[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current = null;[\s\S]*?resumeHeatCapacityModeTransitionRuntime\(\);/,
  'authoritative scene-ready recovery must rebase the file before releasing and resuming the paused transition',
);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /const handleHeatCapacitySceneDiscreteMotionChange =[\s\S]*?heatCapacitySceneDiscreteMotionRef\.current = motionState;[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current !== null\) return;/,
  'scene teardown motion reports must refresh the authoritative snapshot without advancing the reducer while the runtime error card owns the scene',
);
const watchdogFailureBranch = workbench.match(
  /if \(!settled \|\| remainingReasons\.length > 0\) \{([\s\S]*?)\n\s*\}/,
)?.[1] ?? '';
assert.doesNotMatch(
  watchdogFailureBranch,
  /heatCapacitySceneDiscreteMotionRef\.current = \{ active: false, reasons: \[\] \}/,
);

console.log('heatCapacityModeTransitionWatchdog tests passed');
