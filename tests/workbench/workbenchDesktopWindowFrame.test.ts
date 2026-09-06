const lifecycleCheckpointSource = readFileSync(new URL('../../src/features/workbench/workbenchLifecycleCheckpointActions.ts', import.meta.url), 'utf8');
const lifecyclePersistenceSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchLifecyclePersistence.ts', import.meta.url), 'utf8');
const workspacePersistenceCompositionSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchWorkspacePersistence.ts', import.meta.url), 'utf8');
const heatGuideSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatGuideRuntime.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const heatPhysicsSource = readHeatRuntimeSource(new URL('../../src/features/workbench/workbenchHeatPreviewPhysics.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const heatRestoreViewSource = readHeatRuntimeSource(new URL('../../src/features/workbench/workbenchHeatSceneRestoreView.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const heatDemoStateSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatDemoState.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const heatRefreshCaptureSource = readHeatRuntimeSource(new URL('../../src/features/workbench/workbenchHeatRefreshSessionCapture.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const heatLessonsSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatLessons.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatSceneRestoreSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatSceneRestore.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatModeRuntimeSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatModeRuntime.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatRuntimeLifecycleSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatRuntimeLifecycle.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeworkbenchHeatRuntimeCheckpointSource = readHeatRuntimeSource(new URL('../../src/features/workbench/workbenchHeatRuntimeCheckpoint.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatRuntimeRecoverySource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatRuntimeRecovery.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const runtimeuseWorkbenchHeatFeedbackSource = readHeatRuntimeSource(new URL('../../src/features/workbench/useWorkbenchHeatFeedback.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
import { readFileSync as readHeatRuntimeSource } from 'node:fs';
const exitRefreshCaptureSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatRefreshSessionCapture.ts', import.meta.url), 'utf8');
const archWorkbenchDesktopExitQuiescenceSource = readFileSync(new URL('../../src/features/workbench/workbenchDesktopExitQuiescence.ts', import.meta.url), 'utf8');
const fileActionSource = readFileSync(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchMenuBarSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchMenuBar.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const electronMainSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const electronPreloadSource = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const electronTypesSource = readFileSync(new URL('../../electron.d.ts', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const heatCapacityUiCheckpointSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatCapacityUiCheckpoint.ts', import.meta.url), 'utf8');
const windowControlsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchWindowControls.tsx', import.meta.url), 'utf8');
const workbenchCssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  const bodies: string[] = [];
  for (const match of workbenchCssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) bodies.push(match[2]);
  }

  return bodies.join('\n');
};

assert.match(
  electronMainSource,
  /const WORKBENCH_WINDOW_WIDTH = 1440;/,
  'desktop window should keep the approved startup and restore width',
);

assert.match(
  electronMainSource,
  /const WORKBENCH_WINDOW_HEIGHT = 810;/,
  'desktop window height should match a 16:9 1440px-wide frame',
);

assert.match(
  electronMainSource,
  /const WORKBENCH_WINDOW_MIN_WIDTH = 1280;/,
  'desktop window should enforce a useful minimum width',
);

assert.match(
  electronMainSource,
  /const WORKBENCH_WINDOW_MIN_HEIGHT = 720;/,
  'desktop window minimum height should stay 16:9 with the minimum width',
);

assert.match(
  electronMainSource,
  /const WORKBENCH_WINDOW_ASPECT_RATIO = 16 \/ 9;/,
  'desktop window should centralize the 16:9 aspect ratio',
);

assert.match(
  electronMainSource,
  /width:\s*WORKBENCH_WINDOW_WIDTH,[\s\S]*?height:\s*WORKBENCH_WINDOW_HEIGHT,[\s\S]*?minWidth:\s*WORKBENCH_WINDOW_MIN_WIDTH,[\s\S]*?minHeight:\s*WORKBENCH_WINDOW_MIN_HEIGHT,/,
  'BrowserWindow should use the centralized 16:9 dimensions and minimum size',
);

assert.match(
  electronMainSource,
  /frame:\s*false,/,
  'desktop app should hide the native Windows title bar',
);

assert.match(
  electronMainSource,
  /mainWindow\.setAspectRatio\(WORKBENCH_WINDOW_ASPECT_RATIO\);/,
  'manual desktop resizing should be constrained to 16:9',
);

assert.match(
  electronMainSource,
  /mainWindow\.on\('unmaximize',[\s\S]*?mainWindow\.setSize\(WORKBENCH_WINDOW_WIDTH, WORKBENCH_WINDOW_HEIGHT\);/,
  'leaving maximized mode should restore the approved 16:9 default size',
);

for (const channel of ['minimize', 'toggle-maximize', 'close', 'get-state']) {
  assert.match(
    electronMainSource,
    new RegExp(`ipcMain\\.handle\\('hsl-window:${channel}'`),
    `desktop shell should expose hsl-window:${channel}`,
  );
  assert.match(
    electronPreloadSource,
    new RegExp(`${channel.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}: \\(\\) => ipcRenderer\\.invoke\\('hsl-window:${channel}'\\)`),
    `preload should expose hsl-window:${channel} to the renderer`,
  );
}

assert.match(
  electronPreloadSource,
  /onState: \(callback\) => \{[\s\S]*?ipcRenderer\.on\('hsl-window:state', listener\);[\s\S]*?return \(\) => ipcRenderer\.removeListener\('hsl-window:state', listener\);/,
  'preload should expose a removable window-state listener',
);

assert.match(
  electronTypesSource,
  /interface DesktopWindowState/,
  'renderer typings should include the desktop window state shape',
);

assert.match(
  electronTypesSource,
  /hardSphereLabWindow\?: \{[\s\S]*?minimize: \(\) => Promise<DesktopWindowState>;[\s\S]*?toggleMaximize: \(\) => Promise<DesktopWindowState>;[\s\S]*?close: \(\) => Promise<\{ status: 'closed' \| 'cancelled' \| 'discarded' \| 'error' \}>;[\s\S]*?reportPersistenceResult:[\s\S]*?getState: \(\) => Promise<DesktopWindowState>;[\s\S]*?onState: \(callback: \(state: DesktopWindowState\) => void\) => \(\) => void;[\s\S]*?onPrepareExit:/,
  'renderer typings should cover all custom window controls',
);

assert.match(
  electronMainSource,
  /exitPersistenceCoordinator\.bindWindow\(mainWindow, \{[\s\S]*beforeApprovedClose: namespace === WORKBENCH_MAIN_NAMESPACE[\s\S]*workbenchWindowRegistry\.remove\(namespace\)/,
  'every desktop window should install the persistence guard, while only an approved secondary close removes its registry record',
);
assert.match(
  electronMainSource,
  /app\.requestSingleInstanceLock\(\)[\s\S]*app\.on\('second-instance'[\s\S]*existingWindow\.focus\(\)/,
  'desktop startup should enforce one app instance and focus the existing window on a second launch',
);
assert.match(
  electronPreloadSource,
  /onPrepareExit:[\s\S]*hsl-lifecycle:prepare-exit[\s\S]*reportPersistenceResult:[\s\S]*hsl-lifecycle:persistence-result|reportPersistenceResult:[\s\S]*hsl-lifecycle:persistence-result[\s\S]*onPrepareExit:[\s\S]*hsl-lifecycle:prepare-exit/,
  'preload should expose only the correlated exit-persistence request and acknowledgement bridge',
);

const refreshRestoreSource = runtimeuseWorkbenchHeatSceneRestoreSource.slice(runtimeuseWorkbenchHeatSceneRestoreSource.indexOf('const initialSceneRestoreEffect ='), runtimeuseWorkbenchHeatSceneRestoreSource.indexOf('const sceneRestoreAcknowledgementEffect ='));
const persistedTransitionSource = runtimeuseWorkbenchHeatModeRuntimeSource.slice(runtimeuseWorkbenchHeatModeRuntimeSource.indexOf('const modeRuntimeResumeEffect ='));
assert.ok(refreshRestoreSource.length > 0 && persistedTransitionSource.length > 0, 'both restore effects remain explicit domain-owned descriptions');
assert.match(workbenchSource, /useWorkbenchHeatRestoreEffects\(heatCapacityController\.effects\.restore\)[\s\S]*useWorkbenchLifecyclePersistence\(/, 'both restore effects install before workspace lifecycle persistence');
assert.match(
  refreshRestoreSource,
  /if \(desktopExitQuiescedRef\.current\) return;[\s\S]*\}, dependencies: \[activeFileId, desktopExitQuiesced, heatCapacitySceneReadyFileId\]/,
  'scene-ready refresh restoration must defer while desktop exit persistence owns the renderer and retry after cancel-resume',
);
assert.match(
  persistedTransitionSource,
  /if \(desktopExitQuiescedRef\.current\) return undefined;[\s\S]*if \(heatCapacityRuntimeFailureFileIdRef\.current !== null\) return undefined;[\s\S]*desktopExitQuiescedRef\.current[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*\}, dependencies: \[[\s\S]*desktopExitQuiesced,[\s\S]*heatCapacityRefreshRestoring/,
  'persisted transition restoration must neither start nor advance during desktop exit quiescence or runtime failure',
);
assert.match(
  runtimeuseWorkbenchHeatSceneRestoreSource,
  /desktopExitQuiesced \|\|[\s\S]*heatCapacityRefreshRestoreAppliedRef\.current[\s\S]*requestAnimationFrame\(\(\) => \{\s*if \(desktopExitQuiescedRef\.current\) return;[\s\S]*setHeatCapacitySceneRestoreAcknowledged\(true\)/,
  'scene restore acknowledgement must stay pending through prepare-exit and resume after a cancelled close',
);
assert.match(
  runtimeuseWorkbenchHeatModeRuntimeSource,
  /createHeatCapacityModeActions\(\{[\s\S]*hasRuntimeFailure: \(\) => heatCapacityRuntimeFailureFileIdRef\.current !== null,[\s\S]*isDesktopExitQuiesced: \(\) => desktopExitQuiescedRef\.current,[\s\S]*requestFrame: \(callback\) => \{ window\.requestAnimationFrame\(callback\); \},[\s\S]*refresh: \(\) => heatCapacityRefreshPersistRef\.current\(\),[\s\S]*flush: \(\) => flushWorkspacePersistenceRef\.current\(\)/,
  'mode actions must receive live exit/failure guards and live persistence readers for their deferred frames',
);
assert.match(heatGuideSource, /const isHeatCapacityGuideReminderClockRunning =[\s\S]*desktopExitQuiescedRef\.current/, 'guide reminder clock observes live exit ownership');
assert.match(archWorkbenchDesktopExitQuiescenceSource, /const prepareDesktopExitQuiescence =[\s\S]*pauseGuideHeatCapacityReminderTimers\(activeFile\.id\)/, 'desktop exit freezes the shared guide reminder owner');
assert.match(workbenchSource, /resumeDesktopExitQuiescenceRef\.current = resumeDesktopExitQuiescence/, 'native cancellation receives the paired resume coordinator');
assert.match(heatPhysicsSource, /const heatCapacityHardSpherePaused = desktopExitQuiesced \|\|/, 'desktop quiescence pauses the particle projection');
assert.match(heatRestoreViewSource, /restoreAudioMuted: desktopExitQuiesced \|\|/, 'desktop quiescence mutes restored runtime audio');
assert.match(runtimeuseWorkbenchHeatFeedbackSource, /const pauseHeatCapacityPressureAlertTimers = \(fileId: string\) => \{[\s\S]*desktopExitPausedPressureAlarmRef\.current = \{ fileId, remainingMs \}[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current = \{ fileId, remainingMs \}/, 'the feedback owner freezes both pressure clock remainders');
assert.match(archWorkbenchDesktopExitQuiescenceSource, /const prepareDesktopExitQuiescence =[\s\S]*pauseHeatCapacityPressureAlertTimers\(activeFile\.id\)/, 'desktop exit invokes the same feedback resource');
assert.match(
  runtimeuseWorkbenchHeatRuntimeLifecycleSource,
  /const pauseHeatCapacityTransientUiTimers = \(fileId: string\) => \{[\s\S]*heatCapacityToastPausedRef\.current[\s\S]*heatCapacityRecordSuccessPausedRef\.current[\s\S]*heatCapacityAutoDemoCompleteToastPausedRef\.current[\s\S]*heatCapacityAutoDemoStepPanelPausedRef\.current[\s\S]*heatCapacityGuideLessonClosePausedRef\.current[\s\S]*const resumeHeatCapacityTransientUiTimers = \(fileId: string\) => \{[\s\S]*scheduleHeatCapacityToastAdvance\(pausedToast\.remainingMs\)[\s\S]*scheduleHeatCapacityRecordSuccessToastTimers\([\s\S]*scheduleHeatCapacityAutoDemoCompletionToastExpiry\(pausedCompletionToast\.remainingMs\)[\s\S]*scheduleHeatCapacityAutoDemoStepPanelHide\(pausedStepPanel\.remainingMs\)[\s\S]*scheduleHeatCapacityGuideLessonClose\(/,
  'ordinary toasts, success sequences, Demo completion, step-panel exit, and lesson close must all freeze and resume from exact remaining time',
);
assert.match(heatDemoStateSource, /heatCapacityAutoDemoCompleteToastDeadlineAtMsRef = useRef<number \| null>\(null\);[\s\S]*heatCapacityAutoDemoCompleteToastPausedRef = useRef[\s\S]*initialHeatCapacityRefreshSession\.demo\.completionMessageRemainingMs/, 'Demo completion initializes as the saved paused plan');
assert.match(runtimeuseWorkbenchHeatFeedbackSource, /heatCapacityToastPausedRef = useRef[\s\S]*initialHeatCapacityRefreshSession\.guide\.toastQueue\.current\.remainingMs[\s\S]*heatCapacityToastDeadlineAtMsRef = useRef<number \| null>\(null\);/, 'guide toast initializes as the saved paused plan');
assert.match(
  runtimeuseWorkbenchHeatSceneRestoreSource,
  /restoreSession\.demo\.completionMessage &&[\s\S]*completionRemainingMs !== null[\s\S]*scheduleHeatCapacityAutoDemoCompletionToastExpiry\(completionRemainingMs\)/,
  'a completion toast captured exactly at expiry must schedule its zero-delay terminal cleanup after restart',
);
assert.match(
  heatCapacityUiCheckpointSource,
  /export const normalizeHeatCapacityRecordSuccessTimerPlan =[\s\S]*expectedMode !== 'guide'[\s\S]*followUpMessage\.trim\(\)\.length === 0[\s\S]*followUpRemainingMs > releaseRemainingMs/,
  'record-success restart state must be Guide-owned and strictly ordered at the checkpoint boundary',
);
assert.match(heatRefreshCaptureSource, /recordSuccessSequence,/, 'the snapshot serializes the record success plan');
assert.match(runtimeuseWorkbenchHeatSceneRestoreSource, /const restoredRecordSuccess =[\s\S]*scheduleHeatCapacityRecordSuccessToastTimers\(/, 'scene readiness resumes the validated record success plan');
assert.match(
  heatCapacityUiCheckpointSource,
  /export const normalizeHeatCapacityLessonCloseTimerPlan =[\s\S]*!lessonDialogPresent[\s\S]*value\.shouldResumeAutoDemo && expectedMode !== 'demo'/,
  'lesson-close restart state must retain its owner and reject a deferred Demo resume outside Demo mode',
);
assert.match(heatRefreshCaptureSource, /lessonCloseSequence,/, 'the snapshot serializes the lesson close plan');
assert.match(runtimeuseWorkbenchHeatSceneRestoreSource, /const restoredLessonClose =[\s\S]*scheduleHeatCapacityGuideLessonClose\(/, 'scene readiness resumes the validated lesson close plan');
assert.match(
  runtimeworkbenchHeatRuntimeCheckpointSource,
  /stepPanel: \{\s*mode: autoDemoStepPanelMode === 'exiting' \? 'hidden' : autoDemoStepPanelMode/,
  'a true restart should canonicalize a partially exited Demo step panel to its hidden terminal state',
);
assert.match(heatLessonsSource, /const clearHeatCapacityGuideLessonRuntimeForFileExit =[\s\S]*clearHeatCapacityGuideLessonTimers\(\);[\s\S]*heatCapacityLessonPausedFileIdRef\.current = null;[\s\S]*setHeatCapacityGuideLessonDialog\(null\);/, 'lesson file exit releases dialog and timer ownership');
assert.match(runtimeuseWorkbenchHeatRuntimeLifecycleSource, /const releaseHeatCapacityRuntimeForFileExit =[\s\S]*heatCapacityRecordControlsClosingTimerRef\.current[\s\S]*setHeatCapacityRecordControlsClosing\(null\);[\s\S]*heatCapacityResetFeedbackTimerRef\.current[\s\S]*setHeatCapacityResetFeedbackActionId\(null\);[\s\S]*clearHeatCapacityRecordSuccessToastTimers\(\);[\s\S]*clearHeatCapacityToastQueue\(\);[\s\S]*clearHeatCapacityPressureAlertUiState\(\);[\s\S]*clearGuideHeatCapacityStrongReminder\(\);[\s\S]*clearHeatCapacityGuideLessonRuntimeForFileExit\(\);/, 'file exit clears all transient owners after checkpoint capture');
const lessonExitBody = heatLessonsSource.slice(heatLessonsSource.indexOf('const clearHeatCapacityGuideLessonRuntimeForFileExit ='), heatLessonsSource.indexOf('const openHeatCapacityLessonIntro ='));
assert.ok(lessonExitBody.length > 0, 'the actual lesson exit action must be present');
assert.doesNotMatch(lessonExitBody, /resetHeatCapacityLessonResumeClock/, 'lesson exit must not mutate the already captured outgoing file');
assert.match(
  archWorkbenchDesktopExitQuiescenceSource,
  /const prepareDesktopExitQuiescence =[\s\S]*pauseHeatCapacityTransientUiTimers\(activeFile\.id\)[\s\S]*const resumeDesktopExitQuiescence =[\s\S]*resumeHeatCapacityTransientUiTimers\(activeFile\.id\)/,
  'desktop cancel-resume must route transient UI timers through the shared frozen-clock coordinator',
);
assert.match(
  runtimeuseWorkbenchHeatRuntimeRecoverySource,
  /const handleHeatCapacitySceneRuntimeFailure =[\s\S]*?pauseHeatCapacityPressureAlertTimers\(fileId\)[\s\S]*?const handleHeatCapacitySceneRuntimeRecovered =[\s\S]*?const recoveryIntent[\s\S]*?scheduleHeatCapacityPressureAlarmExpiry\(fileId, pausedPressureAlarm\.remainingMs\)[\s\S]*?scheduleHeatCapacityClosePumpValveReminder\(fileId, pausedClosePumpValveReminder\.remainingMs\)/,
  'runtime failure must freeze pressure-alert clocks and authoritative scene-ready recovery must resume their exact remainder',
);
assert.match(
  runtimeuseWorkbenchHeatFeedbackSource,
  /heatCapacityRuntimeFailureFileIdRef\.current === fileId[\s\S]*?desktopExitPausedClosePumpValveReminderRef\.current = \{[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current === fileId[\s\S]*?desktopExitPausedPressureAlarmRef\.current/,
  'late pressure-alert callbacks must retain a zero remainder instead of advancing while runtime failure owns the scene',
);
assert.match(
  archWorkbenchDesktopExitQuiescenceSource,
  /const resumeDesktopExitQuiescence = [\s\S]*scheduleHeatCapacityPressureAlarmExpiry\([\s\S]*scheduleHeatCapacityClosePumpValveReminder\(/,
  'immediate persistence and cancel-resume should both use the frozen pressure-alert remaining times',
);
assert.match(
  runtimeuseWorkbenchHeatFeedbackSource,
  /desktopExitPausedPressureAlarmRef = useRef<[\s\S]*initialHeatCapacityPressureAlarmPlan\);[\s\S]*heatCapacityPressureAlarmDeadlineAtMsRef = useRef<number \| null>\(null\);[\s\S]*desktopExitPausedClosePumpValveReminderRef = useRef<[\s\S]*initialHeatCapacityClosePumpValveReminderPlan\);/,
  'refresh-owned pressure-alert clocks should retain their original checkpoint remainder without ticking during scene hydration',
);
assert.match(
  runtimeuseWorkbenchHeatFeedbackSource,
  /const timerGeneration = \+\+heatCapacityPressureAlarmTimerGenerationRef\.current;[\s\S]*if \(timerGeneration !== heatCapacityPressureAlarmTimerGenerationRef\.current\) return;/,
  'stale pressure-alarm callbacks should be rejected after a desktop-exit freeze or timer replacement',
);
assert.match(
  runtimeuseWorkbenchHeatFeedbackSource,
  /const timerGeneration = \+\+heatCapacityClosePumpValveReminderTimerGenerationRef\.current;[\s\S]*if \(timerGeneration !== heatCapacityClosePumpValveReminderTimerGenerationRef\.current\) return;/,
  'stale close-valve reminder callbacks should be rejected after a desktop-exit freeze or timer replacement',
);
assert.match(
  runtimeuseWorkbenchHeatFeedbackSource,
  /if \(remainingMs !== null && remainingMs <= 0\) \{[\s\S]*heatCapacityPressureAlarmVisibleRef\.current = false;[\s\S]*desktopExitPausedPressureAlarmRef\.current = null;[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current = \{[\s\S]*remainingMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS/,
  'an alarm that expires exactly during desktop-exit preparation should checkpoint the follow-up close-valve stage instead of a zero-duration visible alarm',
);
assert.match(
  archWorkbenchDesktopExitQuiescenceSource,
  /const refreshRestoreOwnedFileId = heatCapacityRefreshRestorePendingRef\.current[\s\S]*file\.id !== refreshRestoreOwnedFileId[\s\S]*const refreshRestoreOwnsActiveFile = activeFile\?\.id === refreshRestoreOwnedFileId;[\s\S]*activeFile\?\.kind === 'heatCapacity' && !refreshRestoreOwnsActiveFile[\s\S]*if \(\s*!refreshRestoreOwnsActiveFile &&\s*heatCapacityRuntimeFailureFileIdRef\.current === null\s*\) \{/,
  'desktop cancel-resume should leave pending-refresh or runtime-failure-owned clocks untouched so each resumes exactly once from its authoritative gate',
);
const workspaceSnapshotSource = readFileSync(new URL('../../src/features/workbench/workbenchWorkspacePersistenceActions.ts', import.meta.url), 'utf8');
assert.match(workbenchSource,
  /useWorkbenchWorkspacePersistence\(\{[\s\S]*readCapturedAtMs: \(\) => desktopExitQuiescedAtMsRef\.current \?\? Date\.now\(\),[\s\S]*readRefreshRestorePending: \(\) => heatCapacityRefreshRestorePendingRef\.current,[\s\S]*buildRefreshSession: \(capturedAtMs\) => buildCurrentHeatCapacityRefreshSession\(null, capturedAtMs\),[\s\S]*buildModeCheckpoint: buildHeatCapacityModeUiCheckpoint/,
  'capture ports retain the frozen clock, pending restore owner and canonical checkpoint builders');
assert.match(workspaceSnapshotSource,
  /selectPendingWorkbenchHeatCapacityRefreshSession\(\{[\s\S]*restorePending: ports\.readRefreshRestorePending\(\),[\s\S]*preserveActiveHeatCapacityModeSession: pendingRefreshSession !== null/,
  'scheduled, pagehide and lifecycle snapshots preserve the original mode session until scene hydration completes');

assert.match(
  fileActionSource,
  /let switchingFromPendingHeatCapacityRefresh = false;[\s\S]*switchingFromPendingHeatCapacityRefresh = suspendActiveHeatCapacityModeForNavigation\(\);[\s\S]*if \(!switchingFromPendingHeatCapacityRefresh\) \{[\s\S]*heatCapacityRefreshPersistRef\.current\(\);[\s\S]*flushWorkspacePersistenceRef\.current\(\);[\s\S]*commitWorkbenchFileCollections/,
  'switching away during scene hydration must preserve the outgoing T0 mode store and skip the pre-switch recapture flush',
);
assert.match(runtimeuseWorkbenchHeatModeRuntimeSource, /const suspendActiveHeatCapacityModeForNavigation =[\s\S]*activeFileOwnsPendingHeatCapacityRefresh\(currentFile\)[\s\S]*cancelPendingHeatCapacityRefreshRestore\(\)[\s\S]*releaseHeatCapacityRuntimeForFileExit\(currentFile\.id\)[\s\S]*return preservePendingRefresh;/, 'all navigation owners share one pending hydration path preserving the canonical mode entry');
assert.match(
  readFileSync(new URL('../../src/features/workbench/workbenchEditHistoryActions.ts', import.meta.url), 'utf8'),
  /const createEditSnapshotFiles =[\s\S]*activeFileOwnsPendingHeatCapacityRefresh\(currentFile\)\) return currentFiles;[\s\S]*suspendHeatCapacityModeSession/,
  'undo snapshots captured during hydration must retain the original T0 mode store',
);
assert.match(lifecycleCheckpointSource,
  /const persistWorkspaceLifecycleCheckpoint = async \(forceFresh = false\)[\s\S]*if \(forceFresh\)[\s\S]*while \(activeFlush\)[\s\S]*await activeFlush[\s\S]*activeFlush = heatCapacityLifecycleFlushPromiseRef\.current;[\s\S]*const flushOperation =/,
  'native prepare-exit must wait for any older lifecycle flush and then force a post-quiescence checkpoint');

assert.match(
  workbenchMenuBarSource,
  /className="studio-titlebar-brand"/,
  'workbench header should render the app icon and name inside the app chrome',
);

assert.match(
  workbenchMenuBarSource,
  /<img src="favicon\.png" alt="" \/>/,
  'titlebar icon should use a relative public asset path that works from packaged file:// pages',
);

assert.doesNotMatch(
  workbenchSource,
  /<img src="\/favicon\.png" alt="" \/>/,
  'titlebar icon should not use an absolute root path because packaged file:// pages resolve it outside dist',
);

assert.match(
  getRuleBody('.studio-brand-mark'),
  /border-radius:\s*5px;/,
  'titlebar app icon container should have a subtle rounded corner instead of a harsh square edge',
);

assert.match(
  getRuleBody('.studio-brand-mark img'),
  /border-radius:\s*inherit;/,
  'titlebar app icon image should inherit the rounded corner clipping from its container',
);

assert.match(
  windowControlsSource,
  /className="studio-window-controls"/,
  'workbench header should render custom minimize, maximize, and close controls',
);

assert.match(
  windowControlsSource,
  /export const hasDesktopWindowControlBridge = \(\) => \(/,
  'workbench should explicitly detect whether desktop-only window controls are available',
);

assert.match(
  windowControlsSource,
  /const available = hasDesktopWindowControlBridge\(\);/,
  'renderer should derive a desktop-only flag before rendering native window controls',
);

assert.match(
  windowControlsSource,
  /if \(!available\) return null;[\s\S]*<div className="studio-window-controls"/,
  'web/browser preview should not render desktop-only minimize, maximize, and close controls',
);

assert.match(
  windowControlsSource,
  /window\.hardSphereLabWindow\?\.minimize\?\.\(\)/,
  'custom minimize button should call the desktop bridge',
);

assert.match(
  windowControlsSource,
  /window\.hardSphereLabWindow\?\.toggleMaximize\?\.\(\)/,
  'custom maximize button should call the desktop bridge',
);

assert.match(
  windowControlsSource,
  /window\.hardSphereLabWindow\?\.close\?\.\(\)/,
  'custom close button should call the desktop bridge',
);

assert.doesNotMatch(
  windowControlsSource,
  /<Maximize2|<Minimize2|<Minus/,
  'custom window controls should not use diagonal expand or generic icon glyphs for Windows maximize and restore states',
);

assert.match(
  windowControlsSource,
  /studio-window-control-glyph-minimize/,
  'minimize should use a CSS-drawn Windows-style horizontal line glyph',
);

assert.match(
  windowControlsSource,
  /maximized[\s\S]*\? 'studio-window-control-glyph-restore'[\s\S]*: 'studio-window-control-glyph-maximize'/,
  'maximize toggle should switch between CSS-drawn Windows-style restore and maximize glyphs',
);

assert.match(
  workbenchMenuBarSource,
  /<WorkbenchWindowControls[\s\S]*language=\{settingsLanguagePreference\}[\s\S]*onClose=\{closeDesktopWindow\}/,
  'the normal workbench should use the shared real window-control component',
);

assert.match(
  getRuleBody('.studio-menu'),
  /-webkit-app-region:\s*drag;/,
  'custom titlebar should be draggable through the menu row',
);

for (const selector of ['.studio-top-commands', '.studio-command-button', '.studio-command-menu', '.studio-window-controls', '.studio-window-control-button']) {
  assert.match(
    getRuleBody(selector),
    /-webkit-app-region:\s*no-drag;/,
    `${selector} should remain clickable inside the draggable titlebar`,
  );
}

assert.match(
  getRuleBody('.studio-window-control-close:hover'),
  /background:\s*#c42b1c;/,
  'custom close button should use the familiar Windows destructive hover treatment',
);

assert.match(
  getRuleBody('.studio-window-control-glyph-minimize'),
  /height:\s*0;/,
  'minimize glyph should have no own height so its border line centers inside the square button',
);

assert.match(
  getRuleBody('.studio-window-control-glyph-minimize'),
  /width:\s*10px;/,
  'minimize glyph should use a compact Windows-style line length',
);

assert.match(
  getRuleBody('.studio-window-control-glyph-minimize'),
  /border-bottom:\s*2px solid currentColor;/,
  'minimize glyph should be a simple Windows-style horizontal line',
);

assert.match(
  getRuleBody('.studio-window-control-glyph-maximize'),
  /width:\s*11px;[\s\S]*height:\s*11px;[\s\S]*border:\s*1\.7px solid currentColor;/,
  'maximize glyph should be a single Windows-style square outline',
);

assert.match(
  getRuleBody('.studio-window-control-glyph-restore::before'),
  /width:\s*9px;[\s\S]*height:\s*9px;[\s\S]*border:\s*1\.7px solid currentColor;/,
  'restore glyph should include a rear Windows-style square outline',
);

assert.match(
  getRuleBody('.studio-window-control-glyph-restore::after'),
  /width:\s*9px;[\s\S]*height:\s*9px;[\s\S]*border:\s*1\.7px solid currentColor;/,
  'restore glyph should include a front Windows-style square outline',
);

assert.match(workbenchViewShellSource, /import \{ WorkbenchMenuBar \} from '\.\/WorkbenchMenuBar\.tsx';/);

assert.match(workbenchSource, /from '\.\/workbenchDesktopExitQuiescence\.ts'/);

assert.match(exitRefreshCaptureSource, /pausedPressureAlarm\?\.remainingMs \?\?[\s\S]*pausedClosePumpValveReminder\?\.remainingMs \?\?/);
assert.match(workbenchSource, /createWorkbenchDesktopExitQuiescence\(\{/);
assert.match(workbenchSource, /prepareDesktopExitQuiescenceRef\.current = prepareDesktopExitQuiescence;[\s\S]*resumeDesktopExitQuiescenceRef\.current = resumeDesktopExitQuiescence;/);

assert.match(lifecyclePersistenceSource,
  /onPrepareExit[\s\S]*prepareDesktopExitQuiescenceRef\.current\(\);[\s\S]*persistWorkspaceLifecycleCheckpointRef\.current\(true\)/,
  'native exit must quiesce the runtime before requesting a fresh lifecycle checkpoint');
assert.match(workspacePersistenceCompositionSource,
  /const lifecycle = createWorkbenchLifecycleCheckpointActions\([\s\S]*persistWorkspaceLifecycleCheckpointRef\.current = lifecycle\.persistWorkspaceLifecycleCheckpoint;/,
  'the lifecycle reference must point to the actual single-flight checkpoint coordinator');
assert.match(workbenchSource,
  /useWorkbenchLifecyclePersistence\(\{[\s\S]*persistWorkspaceLifecycleCheckpointRef, prepareDesktopExitQuiescenceRef, resumeDesktopExitQuiescenceRef/,
  'native lifecycle subscriptions must use the same persistence and exit references as the workspace');
