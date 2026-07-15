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
  'const pulseGuideHeatCapacityControl = (controlId?: string | null) => {',
  'const clearGuideHeatCapacityGuidancePulseTimer = () => {',
  'guide control pulse',
);
assert.match(
  guidePulseSection,
  /if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return;/,
  'a guide pulse must not begin while a mode transition owns the scene',
);

const guidePulseIntervalSection = sourceBetween(
  workbenchSource,
  'useEffect(() => {\n    clearGuideHeatCapacityGuidancePulseTimer();',
  "useEffect(() => {\n    if (heatCapacityModeTransitionLocked || heatCapacityRefreshRestoring) return;",
  'guide pulse interval',
);
assert.match(
  guidePulseIntervalSection,
  /if \(heatCapacityModeTransitionLocked\) return undefined;/,
  'the periodic guide pulse interval should not be installed until the transition is idle',
);
assert.match(
  guidePulseIntervalSection,
  /window\.setInterval\([\s\S]*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return;[\s\S]*pulseGuideHeatCapacityControl\(guidance\.controlId\)/,
  'an already queued interval callback should re-check the live transition phase before pulsing',
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

const guidePendingReminderSection = sourceBetween(
  workbenchSource,
  'const scheduleGuideHeatCapacityStrongReminderAfterDelay = (',
  'const scheduleGuideHeatCapacityStrongReminderAfterToast = (controlId?: string | null) => {',
  'pending guide strong reminder',
);
assert.match(
  guidePendingReminderSection,
  /if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) {[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current/,
  'pending strong reminders should checkpoint rather than start while a transition is active',
);
assert.match(
  guidePendingReminderSection,
  /window\.setTimeout\([\s\S]*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) {[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current[\s\S]*return;/,
  'a pending reminder callback should re-check the live transition and pause itself instead of leaking into another mode',
);

const guideStrongTimerSection = sourceBetween(
  workbenchSource,
  'useEffect(() => {\n    const previousTimerContext = guideHeatCapacityStrongReminderTimerContextRef.current;',
  'useEffect(() => {\n    if (heatCapacityModeTransitionLocked) {',
  'guide inactivity strong-reminder timer',
);
assert.match(
  guideStrongTimerSection,
  /if \(heatCapacityModeTransitionLocked\) {[\s\S]*guideHeatCapacityRestoredStrongReminderTimerRef\.current[\s\S]*remainingMs: previousRemainingMs/,
  'the inactivity timer should freeze its remaining duration while the transition is non-idle',
);
assert.match(
  guideStrongTimerSection,
  /window\.setTimeout\([\s\S]*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) {[\s\S]*guideHeatCapacityRestoredStrongReminderTimerRef\.current[\s\S]*return;/,
  'a late inactivity callback should re-check the transition before opening the strong reminder',
);

const guidePendingResumeSection = sourceBetween(
  workbenchSource,
  'useEffect(() => {\n    if (heatCapacityModeTransitionLocked) {',
  'const restoreGuideHeatCapacitySession = () => {',
  'paused pending-reminder resume',
);
assert.match(
  guidePendingResumeSection,
  /if \(heatCapacityModeTransitionLocked\) {[\s\S]*guideHeatCapacityPausedPendingStrongReminderRef\.current[\s\S]*return;[\s\S]*scheduleGuideHeatCapacityStrongReminderAfterDelay/,
  'pending reminders should remain paused until the transition lock has been released',
);

const guideRestoreSection = sourceBetween(
  workbenchSource,
  'const restoreGuideHeatCapacitySession = () => {',
  'useEffect(() => {\n    restoreGuideHeatCapacitySession();',
  'guide reminder session restore',
);
assert.match(
  guideRestoreSection,
  /if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return;/,
  'guide reminder restoration should wait for an idle mode transition',
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
  'const switchHeatCapacityMode = (targetMode: HeatCapacityMode) => {',
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
  'function scheduleHeatCapacityModeTargetPreparation(requestId: number) {',
  'prepared target application',
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

console.log('heatCapacityModeTransitionRuntimeGuards tests passed');
