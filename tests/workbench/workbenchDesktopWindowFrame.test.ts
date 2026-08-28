import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const electronMainSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const electronPreloadSource = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const electronTypesSource = readFileSync(new URL('../../electron.d.ts', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
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

const refreshRestoreStart = workbenchSource.indexOf('const restoreSession = initialHeatCapacityRefreshSession;');
const persistedTransitionStart = workbenchSource.indexOf("if (!initialHeatCapacityRefreshSession) return undefined;", refreshRestoreStart);
const lifecyclePersistenceStart = workbenchSource.indexOf('const persistLifecycleCheckpointOnce = async () => {', persistedTransitionStart);
assert.ok(refreshRestoreStart >= 0 && persistedTransitionStart > refreshRestoreStart && lifecyclePersistenceStart > persistedTransitionStart);
const refreshRestoreSource = workbenchSource.slice(refreshRestoreStart - 80, persistedTransitionStart);
const persistedTransitionSource = workbenchSource.slice(persistedTransitionStart - 240, lifecyclePersistenceStart);
assert.match(
  refreshRestoreSource,
  /if \(desktopExitQuiescedRef\.current\) return;[\s\S]*\}, \[activeFileId, desktopExitQuiesced, heatCapacitySceneReadyFileId\]\);/,
  'scene-ready refresh restoration must defer while desktop exit persistence owns the renderer and retry after cancel-resume',
);
assert.match(
  persistedTransitionSource,
  /if \(desktopExitQuiescedRef\.current\) return undefined;[\s\S]*if \(heatCapacityRuntimeFailureFileIdRef\.current !== null\) return undefined;[\s\S]*desktopExitQuiescedRef\.current[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*\}, \[[\s\S]*desktopExitQuiesced,[\s\S]*heatCapacityRefreshRestoring/,
  'persisted transition restoration must neither start nor advance during desktop exit quiescence or runtime failure',
);
assert.match(
  workbenchSource,
  /desktopExitQuiesced \|\|[\s\S]*heatCapacityRefreshRestoreAppliedRef\.current[\s\S]*requestAnimationFrame\(\(\) => \{\s*if \(desktopExitQuiescedRef\.current\) return;[\s\S]*setHeatCapacitySceneRestoreAcknowledged\(true\)/,
  'scene restore acknowledgement must stay pending through prepare-exit and resume after a cancelled close',
);
assert.match(
  workbenchSource,
  /const applyHeatCapacityModeTransitionEvent =[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?desktopExitQuiescedRef\.current[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*?const switchHeatCapacityMode =[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?desktopExitQuiescedRef\.current[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current !== null/,
  'both mode-transition persistence frames must stay inert while desktop exit or runtime failure owns the scene',
);
assert.match(
  workbenchSource,
  /const isHeatCapacityGuideReminderClockRunning =[\s\S]*desktopExitQuiescedRef\.current[\s\S]*prepareDesktopExitQuiescenceRef\.current =[\s\S]*pauseGuideHeatCapacityReminderTimers\(activeFile\.id\)[\s\S]*resumeDesktopExitQuiescenceRef\.current/,
  'desktop exit quiescence should synchronously freeze Guide reminder clocks and let the shared gate resume them after cancellation',
);
assert.match(
  workbenchSource,
  /const heatCapacityHardSpherePaused = desktopExitQuiesced \|\|[\s\S]*restoreAudioMuted=\{\s*desktopExitQuiesced \|\|/,
  'desktop exit quiescence should stop particle simulation and mute continuous runtime audio while native close coordination is pending',
);
assert.match(
  workbenchSource,
  /const pauseHeatCapacityPressureAlertTimers = \(fileId: string\) => \{[\s\S]*desktopExitPausedPressureAlarmRef\.current = \{ fileId, remainingMs \}[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current = \{ fileId, remainingMs \}[\s\S]*prepareDesktopExitQuiescenceRef\.current =[\s\S]*pauseHeatCapacityPressureAlertTimers\(activeFile\.id\)/,
  'desktop exit preparation should synchronously freeze pressure-alarm and close-valve reminder deadlines',
);
assert.match(
  workbenchSource,
  /const pauseHeatCapacityTransientUiTimers = \(fileId: string\) => \{[\s\S]*heatCapacityToastPausedRef\.current[\s\S]*heatCapacityRecordSuccessPausedRef\.current[\s\S]*heatCapacityAutoDemoCompleteToastPausedRef\.current[\s\S]*heatCapacityAutoDemoStepPanelPausedRef\.current[\s\S]*heatCapacityGuideLessonClosePausedRef\.current[\s\S]*const resumeHeatCapacityTransientUiTimers = \(fileId: string\) => \{[\s\S]*scheduleHeatCapacityToastAdvance\(pausedToast\.remainingMs\)[\s\S]*scheduleHeatCapacityRecordSuccessToastTimers\([\s\S]*scheduleHeatCapacityAutoDemoCompletionToastExpiry\(pausedCompletionToast\.remainingMs\)[\s\S]*scheduleHeatCapacityAutoDemoStepPanelHide\(pausedStepPanel\.remainingMs\)[\s\S]*scheduleHeatCapacityGuideLessonClose\(/,
  'ordinary toasts, success sequences, Demo completion, step-panel exit, and lesson close must all freeze and resume from exact remaining time',
);
assert.match(
  workbenchSource,
  /heatCapacityAutoDemoCompleteToastDeadlineAtMsRef = useRef<number \| null>\(null\);[\s\S]*heatCapacityAutoDemoCompleteToastPausedRef = useRef[\s\S]*initialHeatCapacityRefreshSession\.demo\.completionMessageRemainingMs[\s\S]*heatCapacityToastPausedRef = useRef[\s\S]*initialHeatCapacityRefreshSession\.guide\.toastQueue\.current\.remainingMs[\s\S]*heatCapacityToastDeadlineAtMsRef = useRef<number \| null>\(null\);/,
  'hydration-owned toast clocks must start as paused plans rather than consuming time before scene readiness',
);
assert.match(
  workbenchSource,
  /restoreSession\.demo\.completionMessage &&[\s\S]*completionRemainingMs !== null[\s\S]*scheduleHeatCapacityAutoDemoCompletionToastExpiry\(completionRemainingMs\)/,
  'a completion toast captured exactly at expiry must schedule its zero-delay terminal cleanup after restart',
);
assert.match(
  workbenchSource,
  /const normalizeHeatCapacityRecordSuccessTimerPlan =[\s\S]*expectedMode !== 'guide'[\s\S]*followUpMessage\.trim\(\)\.length === 0[\s\S]*followUpRemainingMs > releaseRemainingMs[\s\S]*recordSuccessSequence,[\s\S]*const restoredRecordSuccess =[\s\S]*scheduleHeatCapacityRecordSuccessToastTimers\(/,
  'record-success restart state must be Guide-owned, strictly ordered, persisted, and rescheduled',
);
assert.match(
  workbenchSource,
  /const normalizeHeatCapacityLessonCloseTimerPlan =[\s\S]*!lessonDialogPresent[\s\S]*value\.shouldResumeAutoDemo && expectedMode !== 'demo'[\s\S]*lessonCloseSequence,[\s\S]*const restoredLessonClose =[\s\S]*scheduleHeatCapacityGuideLessonClose\(/,
  'lesson-close restart state must retain its owner and deferred Demo resume without creating a ghost dialog',
);
assert.match(
  workbenchSource,
  /stepPanel: \{\s*mode: autoDemoStepPanelMode === 'exiting' \? 'hidden' : autoDemoStepPanelMode/,
  'a true restart should canonicalize a partially exited Demo step panel to its hidden terminal state',
);
assert.match(
  workbenchSource,
  /const clearHeatCapacityGuideLessonRuntimeForFileExit =[\s\S]*clearHeatCapacityGuideLessonTimers\(\);[\s\S]*heatCapacityLessonPausedFileIdRef\.current = null;[\s\S]*setHeatCapacityGuideLessonDialog\(null\);[\s\S]*const releaseHeatCapacityRuntimeForFileExit =[\s\S]*heatCapacityRecordControlsClosingTimerRef\.current[\s\S]*setHeatCapacityRecordControlsClosing\(null\);[\s\S]*heatCapacityResetFeedbackTimerRef\.current[\s\S]*setHeatCapacityResetFeedbackActionId\(null\);[\s\S]*clearHeatCapacityRecordSuccessToastTimers\(\);[\s\S]*clearHeatCapacityToastQueue\(\);[\s\S]*clearHeatCapacityPressureAlertUiState\(\);[\s\S]*clearGuideHeatCapacityStrongReminder\(\);[\s\S]*clearHeatCapacityGuideLessonRuntimeForFileExit\(\);/,
  'leaving a Heat Capacity file must clear toast, pressure, reminder, and lesson ownership after its checkpoint is captured',
);
assert.doesNotMatch(
  workbenchSource.match(/const clearHeatCapacityGuideLessonRuntimeForFileExit =[\s\S]*?\n  };/)?.[0] ?? '',
  /resetHeatCapacityLessonResumeClock/,
  'file-exit lesson cleanup must not mutate the outgoing canonical file after its checkpoint was captured',
);
assert.match(
  workbenchSource,
  /prepareDesktopExitQuiescenceRef\.current =[\s\S]*pauseHeatCapacityTransientUiTimers\(activeFile\.id\)[\s\S]*resumeDesktopExitQuiescenceRef\.current =[\s\S]*resumeHeatCapacityTransientUiTimers\(activeFile\.id\)/,
  'desktop cancel-resume must route transient UI timers through the shared frozen-clock coordinator',
);
assert.match(
  workbenchSource,
  /const handleHeatCapacitySceneRuntimeFailure =[\s\S]*?pauseHeatCapacityPressureAlertTimers\(fileId\)[\s\S]*?const handleHeatCapacitySceneRuntimeRecovered =[\s\S]*?const recoveryIntent[\s\S]*?scheduleHeatCapacityPressureAlarmExpiry\(fileId, pausedPressureAlarm\.remainingMs\)[\s\S]*?scheduleHeatCapacityClosePumpValveReminder\(fileId, pausedClosePumpValveReminder\.remainingMs\)/,
  'runtime failure must freeze pressure-alert clocks and authoritative scene-ready recovery must resume their exact remainder',
);
assert.match(
  workbenchSource,
  /heatCapacityRuntimeFailureFileIdRef\.current === fileId[\s\S]*?desktopExitPausedClosePumpValveReminderRef\.current = \{[\s\S]*?heatCapacityRuntimeFailureFileIdRef\.current === fileId[\s\S]*?desktopExitPausedPressureAlarmRef\.current/,
  'late pressure-alert callbacks must retain a zero remainder instead of advancing while runtime failure owns the scene',
);
assert.match(
  workbenchSource,
  /pausedPressureAlarm\?\.remainingMs \?\?[\s\S]*pausedClosePumpValveReminder\?\.remainingMs \?\?[\s\S]*resumeDesktopExitQuiescenceRef\.current =[\s\S]*scheduleHeatCapacityPressureAlarmExpiry\([\s\S]*scheduleHeatCapacityClosePumpValveReminder\(/,
  'immediate persistence and cancel-resume should both use the frozen pressure-alert remaining times',
);
assert.match(
  workbenchSource,
  /desktopExitPausedPressureAlarmRef = useRef<[\s\S]*initialHeatCapacityPressureAlarmPlan\);[\s\S]*heatCapacityPressureAlarmDeadlineAtMsRef = useRef<number \| null>\(null\);[\s\S]*desktopExitPausedClosePumpValveReminderRef = useRef<[\s\S]*initialHeatCapacityClosePumpValveReminderPlan\);/,
  'refresh-owned pressure-alert clocks should retain their original checkpoint remainder without ticking during scene hydration',
);
assert.match(
  workbenchSource,
  /const timerGeneration = \+\+heatCapacityPressureAlarmTimerGenerationRef\.current;[\s\S]*if \(timerGeneration !== heatCapacityPressureAlarmTimerGenerationRef\.current\) return;/,
  'stale pressure-alarm callbacks should be rejected after a desktop-exit freeze or timer replacement',
);
assert.match(
  workbenchSource,
  /const timerGeneration = \+\+heatCapacityClosePumpValveReminderTimerGenerationRef\.current;[\s\S]*if \(timerGeneration !== heatCapacityClosePumpValveReminderTimerGenerationRef\.current\) return;/,
  'stale close-valve reminder callbacks should be rejected after a desktop-exit freeze or timer replacement',
);
assert.match(
  workbenchSource,
  /if \(remainingMs !== null && remainingMs <= 0\) \{[\s\S]*heatCapacityPressureAlarmVisibleRef\.current = false;[\s\S]*desktopExitPausedPressureAlarmRef\.current = null;[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current = \{[\s\S]*remainingMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS/,
  'an alarm that expires exactly during desktop-exit preparation should checkpoint the follow-up close-valve stage instead of a zero-duration visible alarm',
);
assert.match(
  workbenchSource,
  /const refreshRestoreOwnedFileId = heatCapacityRefreshRestorePendingRef\.current[\s\S]*file\.id !== refreshRestoreOwnedFileId[\s\S]*const refreshRestoreOwnsActiveFile = activeFile\?\.id === refreshRestoreOwnedFileId;[\s\S]*activeFile\?\.kind === 'heatCapacity' && !refreshRestoreOwnsActiveFile[\s\S]*if \(\s*!refreshRestoreOwnsActiveFile &&\s*heatCapacityRuntimeFailureFileIdRef\.current === null\s*\) \{/,
  'desktop cancel-resume should leave pending-refresh or runtime-failure-owned clocks untouched so each resumes exactly once from its authoritative gate',
);
assert.match(
  workbenchSource,
  /const createWorkspacePersistenceSnapshot =[\s\S]*snapshotCapturedAtMs = desktopExitQuiescedAtMsRef\.current \?\? Date\.now\(\)[\s\S]*selectPendingWorkbenchHeatCapacityRefreshSession\(\{[\s\S]*restorePending: heatCapacityRefreshRestorePendingRef\.current,[\s\S]*buildCurrentHeatCapacityRefreshSession\(null, snapshotCapturedAtMs\)[\s\S]*buildHeatCapacityModeUiCheckpoint\(activePersistenceFile, snapshotCapturedAtMs\)[\s\S]*preserveActiveHeatCapacityModeSession: pendingRefreshSession !== null/,
  'scheduled, pagehide, and lifecycle snapshots must retain the original refresh anchor and canonical mode checkpoint until scene hydration applies the restore',
);
assert.match(
  workbenchSource,
  /let switchingFromPendingHeatCapacityRefresh = false;[\s\S]*switchingFromPendingHeatCapacityRefresh = suspendActiveHeatCapacityModeForNavigation\(\);[\s\S]*if \(!switchingFromPendingHeatCapacityRefresh\) \{[\s\S]*heatCapacityRefreshPersistRef\.current\(\);[\s\S]*flushWorkspacePersistenceRef\.current\(\);[\s\S]*commitWorkbenchFileCollections/,
  'switching away during scene hydration must preserve the outgoing T0 mode store and skip the pre-switch recapture flush',
);
assert.match(
  workbenchSource,
  /const suspendActiveHeatCapacityModeForNavigation =[\s\S]*activeFileOwnsPendingHeatCapacityRefresh\(currentFile\)[\s\S]*cancelPendingHeatCapacityRefreshRestore\(\)[\s\S]*releaseHeatCapacityRuntimeForFileExit\(currentFile\.id\)[\s\S]*return true;/,
  'all navigation owners must share one pending-hydration path that preserves the original canonical mode entry',
);
assert.match(
  workbenchSource,
  /const createEditSnapshotFiles =[\s\S]*activeFileOwnsPendingHeatCapacityRefresh\(currentFile\)\) return currentFiles;[\s\S]*suspendHeatCapacityModeSession/,
  'undo snapshots captured during hydration must retain the original T0 mode store',
);
assert.match(
  workbenchSource,
  /persistWorkspaceLifecycleCheckpointRef\.current = async \(forceFresh = false\)[\s\S]*while \(activeFlush\)[\s\S]*await activeFlush[\s\S]*onPrepareExit[\s\S]*persistWorkspaceLifecycleCheckpointRef\.current\(true\)/,
  'native prepare-exit must wait for any older lifecycle flush and then force a post-quiescence checkpoint',
);

assert.match(
  workbenchSource,
  /className="studio-titlebar-brand"/,
  'workbench header should render the app icon and name inside the app chrome',
);

assert.match(
  workbenchSource,
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
  workbenchSource,
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
