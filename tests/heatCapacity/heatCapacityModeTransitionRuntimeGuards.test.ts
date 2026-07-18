import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..', '..');
const readSource = (relativePath: string) => fs
  .readFileSync(path.join(projectRoot, relativePath), 'utf8')
  .replace(/\r\n/g, '\n');

const workbenchSource = readSource('src/features/workbench/WorkbenchStudioPrototype.tsx');
const sceneSource = readSource('src/features/heatCapacity/HeatCapacityInstrumentScene.tsx');
const runtimeGuardSource = readSource('src/features/heatCapacity/heatCapacityRuntimeGuard.ts');
const hardSphereSource = readSource('src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx');
const ultraModelSource = readSource('src/features/heatCapacity/HeatCapacityUltraInstrumentModel.tsx');

const sourceBetween = (
  source: string,
  startMarker: string,
  endMarker: string,
  description: string,
) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `${description} should remain an explicit, inspectable section`);
  return source.slice(start, end);
};

const refreshResumeSection = sourceBetween(
  workbenchSource,
  'const resumePersistedTransition = () => {',
  '};\n\n    resumeFrameId = window.requestAnimationFrame(resumePersistedTransition);',
  'persisted mode-transition refresh resume',
);
assert.match(
  refreshResumeSection,
  /if \(transition\.phase === 'idle'\) return;[\s\S]*transition\.phase === 'waiting-for-motion'[\s\S]*type: 'source-motion-changed'[\s\S]*scheduleHeatCapacityModeTargetPreparationRef\.current\(nextState\.requestId\)[\s\S]*return;/,
  'refresh resume should continue a waiting transition through the live source-motion gate',
);
assert.match(
  refreshResumeSection,
  /transition\.phase === 'preparing-target'[\s\S]*scheduleHeatCapacityModeTargetPreparationRef\.current\(transition\.requestId\)[\s\S]*return;/,
  'refresh resume should continue target preparation without restarting the switch request',
);
assert.match(
  refreshResumeSection,
  /transition\.phase === 'waiting-for-motion'[\s\S]*return;[\s\S]*transition\.phase === 'preparing-target'[\s\S]*return;[\s\S]*heatCapacitySceneModeTransitionControllerRef\.current\?\.resume\(transition\.requestId\)/,
  'after the waiting and preparing branches return, the persisted animating phase should resume its scene controller',
);

const guidePulseSection = sourceBetween(
  workbenchSource,
  'const pulseGuideHeatCapacityControl = (\n    controlId?: string | null,',
  'const clearGuideHeatCapacityGuidancePulseTimer = () => {',
  'guide control pulse',
);
assert.match(
  guidePulseSection,
  /if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return;/,
  'a guide pulse must not begin while a mode transition owns the scene',
);
assert.match(
  guidePulseSection,
  /if \(heatCapacityRuntimeFailureFileIdRef\.current !== null\) return;/,
  'a guide pulse must not begin while the active 3D runtime is failed',
);

const guidePulseIntervalSection = sourceBetween(
  workbenchSource,
  'useEffect(() => {\n    clearGuideHeatCapacityGuidancePulseTimer();',
  "useEffect(() => {\n    if (desktopExitQuiesced) return;\n    if (heatCapacityModeTransitionLocked || heatCapacityRefreshRestoring) return;",
  'guide pulse interval',
);
assert.match(
  guidePulseIntervalSection,
  /if \(heatCapacityModeTransitionLocked\) return undefined;/,
  'the periodic guide pulse interval should not be installed until the transition is idle',
);
assert.match(
  guidePulseIntervalSection,
  /window\.setInterval\([\s\S]*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return;[\s\S]*if \(desktopExitQuiescedRef\.current\) return;[\s\S]*if \(heatCapacityRuntimeFailureFileIdRef\.current === guideSessionFileId\) return;[\s\S]*pulseGuideHeatCapacityControl\(guidance\.controlId\)/,
  'an already queued interval callback should re-check live exit, transition, and runtime-failure gates before pulsing',
);

const guideStrongActivationSection = sourceBetween(
  workbenchSource,
  'const activateGuideHeatCapacityStrongReminder = (controlId?: string | null) => {',
  'const scheduleGuideHeatCapacityStrongReminderAfterDelay = (',
  'guide strong-reminder activation',
);
assert.match(
  guideStrongActivationSection,
  /if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return false;/,
  'strong-reminder projection and its camera focus should require an idle transition',
);
assert.match(
  guideStrongActivationSection,
  /if \(heatCapacityRuntimeFailureFileIdRef\.current !== null\) return false;/,
  'strong-reminder projection must remain disabled while the 3D runtime is failed',
);

const guidePendingReminderSection = sourceBetween(
  workbenchSource,
  'const scheduleGuideHeatCapacityStrongReminderAfterDelay = (',
  'const scheduleGuideHeatCapacityStrongReminderAfterToast = (controlId?: string | null) => {',
  'pending guide strong reminder',
);
assert.match(
  guidePendingReminderSection,
  /if \([\s\S]*heatCapacityModeTransitionStateRef\.current\.phase !== 'idle' \|\|[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*\) {[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current/,
  'pending strong reminders should checkpoint rather than start while a transition or runtime failure is active',
);
assert.match(
  guidePendingReminderSection,
  /window\.setTimeout\([\s\S]*if \([\s\S]*heatCapacityModeTransitionStateRef\.current\.phase !== 'idle' \|\|[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current[\s\S]*return;/,
  'a pending reminder callback should re-check the live transition and runtime failure before escalating',
);

const pendingRuntimeFreezeMarker = "if (desktopExitQuiesced || heatCapacityModeTransitionLocked || runtimeFailureOwnsActiveGuide || guideReminderClockStopped) {\n      const remainingMs = getHeatCapacityRefreshRemainingMs(\n        guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current,";

const guideStrongTimerSection = sourceBetween(
  workbenchSource,
  'useEffect(() => {\n    const previousTimerContext = guideHeatCapacityStrongReminderTimerContextRef.current;',
  pendingRuntimeFreezeMarker,
  'guide inactivity strong-reminder timer',
);
assert.match(
  guideStrongTimerSection,
  /if \(desktopExitQuiesced \|\| heatCapacityModeTransitionLocked \|\| runtimeFailureOwnsActiveGuide \|\| guideReminderClockStopped\) {[\s\S]*guideHeatCapacityRestoredStrongReminderTimerRef\.current[\s\S]*remainingMs: previousRemainingMs/,
  'the inactivity timer should freeze its remaining duration during desktop exit, transition, runtime failure, or paused Guide',
);
assert.match(
  guideStrongTimerSection,
  /window\.setTimeout\([\s\S]*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) {[\s\S]*guideHeatCapacityRestoredStrongReminderTimerRef\.current[\s\S]*return;[\s\S]*if \(heatCapacityRuntimeFailureFileIdRef\.current === guideSessionFileId\) {[\s\S]*guideHeatCapacityRestoredStrongReminderTimerRef\.current[\s\S]*return;/,
  'a late inactivity callback should re-check both transition and runtime-failure gates before opening the strong reminder',
);

const guidePendingResumeSection = sourceBetween(
  workbenchSource,
  pendingRuntimeFreezeMarker,
  'const renderHeatCapacityGuideLessonOverlay = () => {',
  'paused pending-reminder resume',
);
assert.match(
  guidePendingResumeSection,
  /if \(desktopExitQuiesced \|\| heatCapacityModeTransitionLocked \|\| runtimeFailureOwnsActiveGuide \|\| guideReminderClockStopped\) {[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current[\s\S]*return;[\s\S]*activeFile\.runState !== 'running'[\s\S]*scheduleGuideHeatCapacityStrongReminderAfterDelay/,
  'pending reminders should remain paused until desktop exit, transition, runtime failure, and Guide run-state gates all allow time',
);

assert.match(
  workbenchSource,
  /const isHeatCapacityGuideReminderClockRunning = [\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*activeFileIdRef\.current !== fileId[\s\S]*file\.heatCapacityMode === 'guide'[\s\S]*file\.runState === 'running'/,
  'all Guide reminder entry points should share one active running-Guide clock gate',
);
assert.match(
  workbenchSource,
  /const clearHeatCapacityGuideTransientUiState = \(\) => {[\s\S]*guideHeatCapacityPausedPulseRef\.current = null;/,
  'leaving or resetting Guide should discard a pulse frozen for an obsolete step',
);

const guideRestoreSection = sourceBetween(
  workbenchSource,
  'const restoreHeatCapacityGuideUiCheckpoint = (',
  'const applyHeatCapacityModeUiProjection = (',
  'guide checkpoint UI restore',
);
assert.match(
  guideRestoreSection,
  /getHeatCapacityModeDeferredTimerRemainingMs\([\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current/,
  'guide checkpoint restoration should keep pending reminder time in the mode-owned checkpoint path',
);
assert.match(
  guideRestoreSection,
  /restoreGuideHeatCapacityPulse\([\s\S]*normalReminderRemainingMs/,
  'Guide mode-session restoration should route its ordinary pulse through the shared running-clock gate',
);
assert.match(
  workbenchSource,
  /const pauseGuideHeatCapacityPulse = \(fileId: string\) => \{[\s\S]*existingPausedPulse = guideHeatCapacityPausedPulseRef\.current\?\.fileId === fileId[\s\S]*existingPausedPulse\?\.remainingMs[\s\S]*guideHeatCapacityFocusControlId \?\? existingPausedPulse\?\.controlId[\s\S]*const guideReminderClockStopped = reminderOwnsActiveGuide[\s\S]*pauseGuideHeatCapacityPulse\(activeFile\.id\)[\s\S]*restoreGuideHeatCapacityPulse\(/,
  'ordinary Guide pulses should freeze while the Guide clock is stopped and resume only through the shared policy',
);
assert.match(
  workbenchSource,
  /guideHeatCapacityPulseTimerRef\.current = window\.setTimeout\(\(\) => \{\s*if \(!isHeatCapacityGuideReminderClockRunning\(plan\.fileId\)\) \{\s*pauseGuideHeatCapacityPulse\(plan\.fileId\);/,
  'the ordinary pulse deadline callback must recheck the shared clock gate before expiring state',
);
assert.match(
  workbenchSource,
  /const captureHeatCapacityGuideUiCheckpoint = \([\s\S]*guideHeatCapacityPausedPulseRef\.current\?\.fileId === currentFile\.id[\s\S]*normalReminderControlId = pausedNormalReminder\?\.controlId[\s\S]*normalReminderRemainingMs = pausedNormalReminder[\s\S]*pausedNormalReminder\.remainingMs[\s\S]*normalReminder: normalReminderTimer && normalReminderControlId/,
  'a synchronously frozen Guide pulse for the current file should take priority over stale React state in autosave and mode-session checkpoints',
);

const transitionFinishSection = sourceBetween(
  workbenchSource,
  'function finishHeatCapacityModeTransitionAnimation() {',
  'function applyPreparedHeatCapacityModeTarget(',
  'mode transition animation completion',
);
assert.match(
  transitionFinishSection,
  /transition\.phase !== 'animating'[\s\S]*restoreHeatCapacityGuideUiCheckpoint\(/,
  'guide UI checkpoints should only project from the coordinated animation completion path',
);

assert.doesNotMatch(
  sceneSource,
  /Boolean\(props\.guideRollbackAnimation\)|instrumentMotionActive:\s*[^\n]*guideRollbackAnimation/,
  'a retained rollback descriptor must not act as a static scene-motion blocker',
);
assert.match(
  sceneSource,
  /instrumentMotionActive:\s*ultraDiscreteMotionActive \|\| proceduralDiscreteMotionActive/,
  'instrument transition blocking should come from the real Ultra/procedural animation lifecycle',
);
assert.match(
  sceneSource,
  /updateHeatCapacitySceneMotionSources\([\s\S]*proceduralMotionSourcesRef\.current[\s\S]*setProceduralDiscreteMotionActive\(update\.active\)/,
  'procedural blocking should be aggregated by real source ownership instead of one shared boolean timer',
);

const demoQuiesceSection = sourceBetween(
  workbenchSource,
  'const quiesceHeatCapacityAutoDemoForModeTransition = (fileId: string) => {',
  'const resumeQuiescedHeatCapacityAutoDemo = (fileId: string) => {',
  'Demo transaction clock capture',
);
assert.match(
  demoQuiesceSection,
  /autoDemoPhaseRef\.current !== 'running'[\s\S]*captureHeatCapacityModeTransitionDemoClock\([\s\S]*clearHeatCapacityAutoDemoTimers\(\)[\s\S]*heatCapacityModeTransitionDemoClockRef\.current = demoClock/,
  'leaving a running Demo should capture its exact clock before freezing all timeline timers',
);

const demoResumeSection = sourceBetween(
  workbenchSource,
  'const resumeQuiescedHeatCapacityAutoDemo = (fileId: string) => {',
  'const switchHeatCapacityMode = (',
  'Demo transaction clock resume',
);
assert.match(
  demoResumeSection,
  /resolveHeatCapacityModeTransitionDemoResume\([\s\S]*if \(!resume\) return;[\s\S]*scheduleHeatCapacityAutoDemoTimeline\([\s\S]*heatCapacityModeTransitionDemoClockRef\.current = null/,
  'the frozen Demo clock must be validated and scheduled before it is consumed',
);

const preparedTargetSection = sourceBetween(
  workbenchSource,
  'function applyPreparedHeatCapacityModeTarget(',
  'function prepareHeatCapacityModeTarget(requestId: number) {',
  'prepared target application',
);
assert.match(
  preparedTargetSection,
  /if \(targetMode !== 'demo'\) \{[\s\S]*heatCapacityModeTransitionDemoClockRef\.current = null/,
  'the source Demo clock should be consumed only once a non-Demo target is ready to commit',
);
assert.doesNotMatch(
  preparedTargetSection,
  /releaseHeatCapacityRuntimeForFileExit/,
  'same-file mode projection must not reuse the old file-exit cleanup path',
);
assert.match(
  preparedTargetSection,
  /startHeatCapacityAutoDemoUi\(target\.file\.id, target\.file\.name, true\)/,
  'a fresh Demo timeline must remain frozen until the incoming transition commits',
);

const transitionAbortSection = sourceBetween(
  workbenchSource,
  'function abortHeatCapacityModeTransitionToVisibleFile(requestId: number) {',
  'function prepareHeatCapacityModeTarget(requestId: number) {',
  'mode transition abort recovery',
);
assert.match(
  transitionAbortSection,
  /type: 'synchronize'[\s\S]*visibleFile\.heatCapacityMode === 'demo'[\s\S]*resumeQuiescedHeatCapacityAutoDemo\(visibleFile\.id\)/,
  'aborting a failed transition should resume the preserved Demo clock when Demo remains visible',
);
assert.match(
  workbenchSource,
  /Heat-capacity mode target preparation failed:[\s\S]*abortHeatCapacityModeTransitionToVisibleFile\(requestId\)/,
  'target preparation failures should use the shared abort-and-resume path',
);
assert.match(
  workbenchSource,
  /if \(deferTimelineUntilModeTransitionCommit\) \{[\s\S]*heatCapacityAutoDemoFileIdRef\.current = demoFileId;[\s\S]*heatCapacityAutoDemoTimelineRef\.current = timeline;[\s\S]*heatCapacityModeTransitionDemoClockRef\.current = \{/,
  'the deferred fresh-Demo transaction must register its timeline and clock as one commit resource',
);

assert.equal(
  [...workbenchSource.matchAll(/releaseHeatCapacityRuntimeForFileExit\(/g)].length,
  3,
  'file-exit cleanup should remain owned only by navigation, close, and delete call sites',
);
const navigationSuspendSection = sourceBetween(
  workbenchSource,
  'const suspendActiveHeatCapacityModeForNavigation = () => {',
  'const activateHeatCapacityFileModeSession = (fileId: string) => {',
  'file navigation suspension',
);
assert.match(
  navigationSuspendSection,
  /preservePendingRefresh[\s\S]*cancelPendingHeatCapacityRefreshRestore\(\)[\s\S]*else \{[\s\S]*suspendHeatCapacityModeSession[\s\S]*releaseHeatCapacityRuntimeForFileExit\(currentFile\.id\)[\s\S]*return preservePendingRefresh/,
  'pending hydration must skip recapture while both pending and ordinary navigation still share one runtime cleanup owner',
);

assert.match(
  sceneSource,
  /const pending = new Set<HeatCapacityExactRestoreConsumer>\(\['camera'\]\);[\s\S]*pending\.add\('ultra'\)[\s\S]*pending\.add\('hard-sphere'\)[\s\S]*exactRestorePendingConsumersRef\.current = \{ requestId: request\.requestId, pending \}/,
  'exact mode restoration should explicitly register every scene consumer that must acknowledge the checkpoint',
);
assert.match(
  sceneSource,
  /const acknowledgeExactRestoreConsumer = useCallback[\s\S]*completion\.pending\.delete\(consumer\)[\s\S]*completion\.pending\.size > 0[\s\S]*type: 'release-exact-restore'/,
  'the exact restore command should release only after all registered consumers acknowledge completion',
);
assert.doesNotMatch(
  sceneSource,
  /if \(!request\) \{[\s\S]{0,500}release-exact-restore/,
  'clearing the parent overlay request must not release a locally pending exact restore before scene consumers are ready',
);
assert.match(
  sceneSource,
  /const cameraPose = normalizeHeatCapacityCameraPose\(request\.cameraPose\);[\s\S]*runtimeRecoveryCameraPoseRef\.current = cameraPose;[\s\S]*checkpoint: \{[\s\S]*cameraPose,/,
  'an exact target camera pose should survive a slow scene load or Canvas retry after the overlay finishes',
);
assert.match(
  sceneSource,
  /qualityProfile\.renderModel !== 'ultraGlb'[\s\S]*acknowledgeExactRestoreConsumer\(completion\.requestId, 'ultra'\)[\s\S]*!props\.hardSphereViewEnabled[\s\S]*acknowledgeExactRestoreConsumer\(completion\.requestId, 'hard-sphere'\)/,
  'consumers removed while a scene is slow or failed must release their exact-restore ownership',
);
assert.doesNotMatch(
  sceneSource,
  /modeTransitionActive === false[\s\S]{0,240}release-exact-restore/,
  'ending the overlay transition must not release a still-pending exact scene restore',
);
const cameraRigSection = sourceBetween(
  sceneSource,
  'function CameraRig({',
  'function HeatCapacityGuideProjectionBridge({',
  'camera rig exact restore lifecycle',
);
assert.match(
  cameraRigSection,
  /useEffect\(\(\) => \{[\s\S]*runtimeFailedRef\.current = false;[\s\S]*handledModeRestoreRequestIdRef\.current = null;[\s\S]*\}, \[modeRestoreRequest, runtimeRevision\]\);/,
  'runtime retry should make the same exact camera restore request eligible for a fresh completion acknowledgement',
);
assert.match(
  cameraRigSection,
  /onModeRestoreComplete\(modeRestoreRequest\.requestId\)[\s\S]*activeModeRestoreTransitionRequestIdRef[\s\S]*onModeRestoreComplete\(completedRestoreRequestId\)/,
  'camera restore completion should acknowledge both immediate and animated exact poses',
);
assert.match(
  sceneSource,
  /<HeatCapacityHardSphereLayer[\s\S]*key=\{`procedural-hard-sphere:\$\{props\.runtimeRevision\}`\}/,
  'procedural runtime retry should remount the HardSphere layer and clear its local failed-frame latch',
);
assert.match(
  sceneSource,
  /<HeatCapacityRuntimeGuardProvider[\s\S]*revision=\{ultraRuntimeGuardRevision\}[\s\S]*onError=\{\(error\) => handleUltraSceneError\('runtime', error\)\}/,
  'all scene callbacks and frames should share a retryable runtime error boundary',
);
assert.match(
  sceneSource,
  /function HeatCapacityWebGLContextLossGuard[\s\S]*addEventListener\('webglcontextlost', handleContextLost\)[\s\S]*addEventListener\('webglcontextrestored', handleContextRestored\)[\s\S]*removeEventListener\('webglcontextlost', handleContextLost\)[\s\S]*removeEventListener\('webglcontextrestored', handleContextRestored\)/,
  'the scene should subscribe to and clean up the browser WebGL context-loss and restoration signals',
);
assert.match(
  sceneSource,
  /event\.preventDefault\(\);[\s\S]*onContextLostRef\.current\(\);[\s\S]*reportRuntimeFailure\(new Error\('The WebGL rendering context was lost\.'\)\);[\s\S]*<HeatCapacityWebGLContextLossGuard[\s\S]*onContextLost=\{handleWebGLContextLost\}/,
  'a real WebGL context loss should enter the same retryable runtime failure path',
);
assert.doesNotMatch(
  sceneSource,
  /forceContextRestore|extensions\.has\('WEBGL_lose_context'\)/,
  'production recovery must wait for the browser context-restored event instead of issuing an extension-only synthetic restore',
);
assert.match(
  sceneSource,
  /const onContextLostRef = useRef\(onContextLost\);[\s\S]*const onContextRestoredRef = useRef\(onContextRestored\);[\s\S]*onContextLostRef\.current = onContextLost;[\s\S]*onContextRestoredRef\.current = onContextRestored;[\s\S]*\}, \[gl, reportRuntimeFailure\]\);/,
  'the native context lifecycle listeners should remain stable across realtime parent renders while using the latest callbacks',
);
assert.match(
  sceneSource,
  /const handleWebGLContextLost = useCallback\(\(\) => \{\s*setRetainLostContextCanvas\(true\);\s*setLostContextRestored\(false\);/,
  'all real context losses should retain the old Canvas until the browser reports restoration',
);
assert.match(
  sceneSource,
  /const retryUltraScene = useCallback\(\(\) => \{[\s\S]*if \(retainLostContextCanvas && !lostContextRestored\) return;[\s\S]*setUltraRuntimeGuardRevision\(\(revision\) => revision \+ 1\);[\s\S]*if \(!retainLostContextCanvas\) \{\s*setUltraRuntimeRetryAttempt[\s\S]*ultraSceneError === null \|\| retainLostContextCanvas[\s\S]*disabled=\{retainLostContextCanvas && !lostContextRestored\}/,
  'a restored lost Canvas should reset only the guard epoch in place, while other runtime failures retain the full remount path',
);
assert.match(
  workbenchSource,
  /useEffect\(\(\) => \{\s*if \(\s*desktopExitQuiesced \|\|[\s\S]*heatCapacityRefreshRestoring \|\|[\s\S]*heatCapacityRuntimeFailureFileId !== null[\s\S]*window\.setInterval\(\(\) => \{/,
  'the real-time heat-capacity tick must not keep a background interval during exit, restore, or runtime failure',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraErrorBoundary[\s\S]*key=\{`scene-runtime-\$\{ultraRuntimeRetryAttempt\}`\}[\s\S]*errorKind="runtime"[\s\S]*<Canvas[\s\S]*<HeatCapacityRuntimeGuardProvider/,
  'the full Canvas must sit inside a retry-keyed runtime boundary so procedural render and layout-effect failures reach the runtime error card',
);
assert.match(
  sceneSource,
  /handleUltraSceneError = useCallback[\s\S]*proceduralMotionSourcesRef\.current = new Set\(\);[\s\S]*setProceduralDiscreteMotionActive\(false\);[\s\S]*setUltraDiscreteMotionActive\(false\);[\s\S]*setCameraTransitionActive\(false\);/,
  'runtime failures must synchronously release every scene-motion blocker before retry',
);
assert.match(
  runtimeGuardSource,
  /reportHeatCapacityRuntimeFailure =[\s\S]*state\.revision !== sourceRevision \|\| state\.failed[\s\S]*state\.failed = true;[\s\S]*runHeatCapacityRuntimeGuarded =[\s\S]*if \(stateRef\.current\.revision !== revision \|\| stateRef\.current\.failed\) return null;[\s\S]*const stateRef = useRef\(\{ revision, failed: false \}\);/,
  'every guarded callback in one Canvas should share the same failure epoch',
);
assert.match(
  runtimeGuardSource,
  /useHeatCapacityRuntimeFailureReporter[\s\S]*report\(error, revision\)/,
  'inner cleanup catches should have a revision-bound route into the shared failure epoch',
);
assert.match(
  hardSphereSource,
  /catch \(error\) \{\s*runtimeFailedRef\.current = true;\s*reportRuntimeFailure\(error\);/,
  'Hard Sphere frame cleanup must report into the shared failure epoch',
);
assert.match(
  sceneSource,
  /catch \(error\) \{[\s\S]*transitionRuntimeRef\.current = null;[\s\S]*reportRuntimeFailure\(error\);/,
  'camera frame cleanup must report into the shared failure epoch',
);
assert.match(
  ultraModelSource,
  /const reportRuntimeError = useCallback\(\(error: unknown\) => \{[\s\S]*reportSharedRuntimeFailure\(error\);/,
  'Ultra frame and rAF cleanup must report into the shared failure epoch',
);
assert.match(
  runtimeGuardSource,
  /return useCallback\(<Result,>[\s\S]*runHeatCapacityRuntimeGuarded\(stateRef, revision, report, run\)[\s\S]*\), \[report, revision, stateRef\]\);/,
  'runtime retry must replace the guarded callback so interrupted rAF effects restart even when their semantic inputs did not change',
);

const sceneRetrySection = sourceBetween(
  sceneSource,
  'const retryUltraScene = useCallback(() => {',
  'const handleSceneRevealReady = useCallback(() => {',
  'scene runtime retry and readiness',
);
assert.doesNotMatch(
  sceneRetrySection,
  /onRuntimeRecovered/,
  'clicking Retry must only rebuild the scene and must not claim recovery before readiness is reported',
);
assert.match(
  sceneRetrySection,
  /setUltraSceneError\(null\);[\s\S]*setSceneReady\(false\);[\s\S]*const handleSceneReady = useCallback[\s\S]*props\.onSceneReady\?\.\(\)/,
  'the parent recovery signal must remain coupled to the rebuilt scene ready bridge',
);
assert.doesNotMatch(
  sceneSource,
  /onRuntimeRecovered/,
  'the scene contract should expose one authoritative ready signal instead of a premature retry signal',
);

const workbenchRuntimeRecoverySection = sourceBetween(
  workbenchSource,
  'const handleHeatCapacitySceneRuntimeFailure = (fileId: string, error: unknown) => {',
  'const terminateHeatCapacityAutoDemo = () => {',
  'workbench runtime recovery policy',
);
assert.match(
  workbenchRuntimeRecoverySection,
  /const resumeGuideRunState = Boolean\([\s\S]*failedFile\.heatCapacityMode === 'guide'[\s\S]*failedFile\.runState === 'running'/,
  'runtime failure should remember auto-resume intent only for a Guide file that was actually running',
);
assert.match(
  workbenchSource,
  /const freezeHeatCapacityAutoDemoForRuntimeFailure = \([\s\S]*desktopExitAutoDemoClockRef\.current\?\.fileId === fileId[\s\S]*heatCapacityRefreshRestorePendingRef\.current[\s\S]*\? null[\s\S]*clearHeatCapacityAutoDemoTimers\(\);[\s\S]*if \(!failureProjectionDeferred\) \{[\s\S]*setAutoDemoPhase\('paused'\)/,
  'a deferred runtime failure must freeze Demo resources without projecting post-anchor phase or file state',
);
assert.doesNotMatch(
  workbenchRuntimeRecoverySection,
  /pauseHeatCapacityAutoDemo\(\)/,
  'runtime failure must not route through the user pause command that mutates canonical state and logs',
);
assert.match(
  workbenchSource,
  /const projectedRunState = failedFile\?\.kind === 'heatCapacity'[\s\S]*projectWorkbenchRunStateForRuntimeFailure\(failedFile\.runState\)[\s\S]*projectedFailureFile[\s\S]*expectedFile: expectedRecoveryFile,[\s\S]*projectedRunState,[\s\S]*hasSameHeatCapacityRuntimeRecoveryState\(currentFile, recoveryIntent\.expectedFile\)/,
  'runtime recovery must carry a collision-safe state token through the failure projection and true-ready callback',
);
assert.match(
  workbenchSource,
  /const handleHeatCapacitySceneRuntimeRecovered = \(fileId: string\) => \{[\s\S]*desktopExitQuiescedRef\.current[\s\S]*heatCapacityRefreshRestorePendingRef\.current[\s\S]*recoverHeatCapacityRuntimeIfReadyRef\.current = handleHeatCapacitySceneRuntimeRecovered[\s\S]*useEffect\(\(\) => \{[\s\S]*heatCapacitySceneReadyFileIdRef\.current === pendingRuntimeRecoveryFileId[\s\S]*recoverHeatCapacityRuntimeIfReadyRef\.current\(pendingRuntimeRecoveryFileId\)/,
  'scene readiness during desktop or hydration quiescence must preserve the recovery intent and retry it only after the owning gate opens',
);
assert.match(
  workbenchRuntimeRecoverySection,
  /const recoveryStateMatches =[\s\S]*const recoveryRebaseStartMs = recoveryStateMatches[\s\S]*Math\.min\(recoveredAt, currentFile\.updatedAt\)[\s\S]*rebaseHeatCapacityFileAfterSuspendedWallClock\([\s\S]*recoveryRebaseStartMs,[\s\S]*const recoveredRunState = recoveryStateMatches[\s\S]*recoveryIntent\.projectedRunState[\s\S]*projectWorkbenchRunStateForRuntimeFailure\(file\.runState\)[\s\S]*return recoveryStateMatches &&[\s\S]*recoveryIntent\.resumeGuideRunState[\s\S]*runState: 'running'(?: as const)?/,
  'runtime recovery must fully rebase a matching token and conservatively pause a changed runtime state',
);
assert.match(
  workbenchRuntimeRecoverySection,
  /const recoveredFile = refreshHeatCapacityPumpFrequency\(\{[\s\S]*runState: recoveredRunState,[\s\S]*pumpBulbState: 'idle'(?: as const)?[\s\S]*recoveryApplied = true[\s\S]*recoveryIntent\?\.pauseDemoOnRecovery[\s\S]*autoDemoPhaseRef\.current = 'paused';[\s\S]*setAutoDemoPhase\('paused'\)/,
  'deferred failures must pause active work while preserving already-stable canonical run states after the owning gate releases',
);
assert.match(
  workbenchSource,
  /const rebaseHeatCapacityFileForAutomaticSuspension = \([\s\S]*hasSameHeatCapacityRuntimeRecoveryState\(file, recoveryIntent\.expectedFile\)[\s\S]*runtimeIntervalCoveredMs = Math\.max\([\s\S]*resumedAtMs - Math\.max\(suspendedAtMs, recoveryIntent\.suspendedAtMs\)[\s\S]*expectedFile: rebasedFile,[\s\S]*suspendedAtMs: recoveryIntent\.suspendedAtMs \+ runtimeIntervalCoveredMs/,
  'automatic desktop or hydration rebases must advance only the runtime-failure interval they actually covered',
);
assert.match(
  workbenchSource,
  /const isHeatCapacityUserInteractionLocked =[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current === activeFileIdRef\.current/,
  'scene failure must lock physical user mutations while metadata-only rename remains independently recoverable',
);
assert.match(
  workbenchRuntimeRecoverySection,
  /const failureProjectionDeferred = desktopExitQuiescedRef\.current \|\|[\s\S]*heatCapacityRefreshRestorePendingRef\.current;[\s\S]*failureProjectionDeferred[\s\S]*failedFile\.updatedAt[\s\S]*const projectedRunState[\s\S]*if \(!failureProjectionDeferred\) \{[\s\S]*runState: projectedRunState,[\s\S]*updatedAt: failureUpdatedAt/,
  'a post-anchor runtime failure must preserve desktop or hydration canonical state while an unowned failure pauses only active work',
);
assert.match(
  workbenchRuntimeRecoverySection,
  /const handleHeatCapacitySceneReady = \(fileId: string\) => {[\s\S]*setHeatCapacitySceneReadyFileId\(fileId\);[\s\S]*handleHeatCapacitySceneRuntimeRecovered\(fileId\)/,
  'Workbench should restore Guide run state only from the authoritative scene-ready callback',
);
assert.match(
  workbenchSource,
  /onSceneReady=\{\(\) => handleHeatCapacitySceneReady\(activeFile\.id\)\}/,
  'the keyed scene should route its exact file id through the ready-gated recovery policy',
);
assert.match(
  workbenchSource,
  /const scheduleHeatCapacityAutoDemoTimeline = \([\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*desktopExitQuiescedRef\.current[\s\S]*heatCapacityRefreshRestorePendingRef\.current[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*activeFileIdRef\.current !== demoFileId[\s\S]*heatCapacityAutoDemoFileIdRef\.current !== demoFileId/,
  'every late Demo timeline callback must re-check desktop, hydration, runtime, and file ownership gates',
);
assert.match(
  workbenchSource,
  /restoreSession\.demo\.phase === 'running' &&[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current === null[\s\S]*scheduleHeatCapacityAutoDemoTimeline\(/,
  'hydration must never restart a running Demo timeline while a runtime failure owns the scene',
);
assert.match(
  workbenchSource,
  /const scheduleHeatCapacityPumpAnimation = \([\s\S]*releaseTimerId = window\.setTimeout\(\(\) => \{[\s\S]*desktopExitQuiescedRef\.current[\s\S]*heatCapacityRefreshRestorePendingRef\.current[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null[\s\S]*activeFileIdRef\.current !== fileId[\s\S]*idleTimerId = window\.setTimeout\(\(\) => \{[\s\S]*heatCapacityRuntimeFailureFileIdRef\.current !== null/,
  'late pump release and idle callbacks must re-check every automatic-suspension owner before mutating a file revision',
);
assert.match(
  workbenchSource,
  /const restoreRuntimePaused = heatCapacityRuntimeFailureFileIdRef\.current !== null;[\s\S]*restorePumpAnimationPaused = [\s\S]*restoreRuntimePaused[\s\S]*heatCapacityToastPausedRef\.current = \{[\s\S]*heatCapacityAutoDemoCompleteToastPausedRef\.current = \{[\s\S]*desktopExitPausedPressureAlarmRef\.current = \{[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current = \{/,
  'hydration during runtime failure must rebuild pump, toast, completion, and pressure clocks as paused plans only',
);
assert.match(
  workbenchRuntimeRecoverySection,
  /if \(failureProjectionDeferred\) \{[\s\S]*pauseHeatCapacityPumpAnimation\(fileId\);[\s\S]*else \{[\s\S]*clearHeatCapacityPumpAnimationTimers\(\);[\s\S]*if \(recoveryApplied\) \{[\s\S]*clearHeatCapacityPumpAnimationTimers\(\);/,
  'a post-Tq failure must preserve the frozen pump checkpoint until successful recovery projects pump idle',
);
assert.match(
  workbenchSource,
  /const pauseGuideHeatCapacityReminderTimers = \(fileId: string\) => \{[\s\S]*pauseGuideHeatCapacityPulse\(fileId\)[\s\S]*guideHeatCapacityStrongReminderDeadlineAtMsRef[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef[\s\S]*handleHeatCapacitySceneRuntimeFailure[\s\S]*pauseGuideHeatCapacityReminderTimers\(fileId\)/,
  'Guide pulse, base reminder, and pending reminder clocks should all retain explicit runtime-error freeze paths',
);

console.log('heatCapacityModeTransitionRuntimeGuards tests passed');
