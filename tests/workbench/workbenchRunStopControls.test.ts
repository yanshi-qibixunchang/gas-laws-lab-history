import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const electronSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');

assert.match(
  source,
  /^\s*Square,\s*$/m,
  'workbench preview controls should import the square stop icon used by IDE run toolbars',
);

assert.match(
  source,
  /const toggleActiveFileRunState = \(\) => \{[\s\S]*?activeFile\.runState === 'running'[\s\S]*?pauseActiveFile\(\);[\s\S]*?runActiveFile\(\);[\s\S]*?\};/,
  'preview should use one toggle control for run and pause',
);

assert.match(
  source,
  /const stopActiveFile = \(\) => \{[\s\S]*?cancelRuntimeFrame\(activeFile\.id\);[\s\S]*?runState: 'idle'/,
  'preview should expose a stop action that terminates the active runtime',
);

assert.match(
  source,
  /const SIMULATION_TICK_INTERVAL_MS = 16;/,
  'simulation runtime should use a fixed foreground-equivalent tick interval',
);

assert.match(
  source,
  /interface StandardEngineRuntime \{[\s\S]*?simulationTimerId: number \| null;[\s\S]*?\}/,
  'simulation runtimes should track a timer handle instead of a render frame handle',
);

for (const schedulerName of ['scheduleStandardFrame', 'scheduleIdealFrame']) {
  const schedulerStart = source.indexOf(`const ${schedulerName} = (fileId: string) => {`);
  assert.notEqual(schedulerStart, -1, `${schedulerName} should exist`);
  const schedulerEnd = source.indexOf('\n  const run', schedulerStart);
  assert.notEqual(schedulerEnd, -1, `${schedulerName} body should be followed by a run function`);
  const schedulerBody = source.slice(schedulerStart, schedulerEnd);

  assert.ok(
    schedulerBody.includes('window.setTimeout') && schedulerBody.includes('SIMULATION_TICK_INTERVAL_MS'),
    `${schedulerName} should schedule physics with a fixed timer so background windows keep running`,
  );
  assert.ok(
    !schedulerBody.includes('requestAnimationFrame'),
    `${schedulerName} should not depend on requestAnimationFrame for physics progression`,
  );
}

assert.match(
  source,
  /const cancelRuntimeFrame = \(fileId: string\) => \{[\s\S]*?window\.clearTimeout\(runtime\.simulationTimerId\);[\s\S]*?runtime\.simulationTimerId = null;/,
  'runtime cancellation should clear the fixed simulation timer',
);

assert.match(
  electronSource,
  /webPreferences:\s*\{[\s\S]*?backgroundThrottling:\s*false/,
  'Electron should disable background throttling for the desktop simulation window',
);

assert.match(
  source,
  /activeFile\.kind === 'heatCapacity' \? renderHeatCapacityModeControl\(\) : \([\s\S]*className=\{`studio-run-control studio-run-control-\$\{activeFile\.runState === 'running' \? 'pause' : 'start'\}`\}/,
  'heat capacity should use the unified mode bar while standard previews keep the compact run/pause button',
);

assert.match(
  source,
  /const heatCapacityActiveMode: HeatCapacityMode = activeFile\.heatCapacityMode;/,
  'heat capacity mode bar should use the active file mode directly because every quality tier supports Demo and Guide',
);

assert.match(
  source,
  /const switchHeatCapacityMode = \(targetMode: HeatCapacityMode\) => \{[\s\S]*?suspendHeatCapacityModeSession\(currentFile, sourceCheckpoint, now\)[\s\S]*?resolveStoredHeatCapacityMode\(suspendedFile, targetMode, now\)/,
  'mode switching should suspend the current mode and prefer restoring the target mode checkpoint',
);

assert.match(
  source,
  /if \(targetMode === 'guide'\) \{[\s\S]*?startHeatCapacityGuideWorkbenchState\(suspendedFile, now\)[\s\S]*?restoreHeatCapacityModeUi\(guideFile, null\)/,
  'Guide mode should create a fresh guide runtime only when no resumable Guide checkpoint exists',
);

const runAutoDemoStart = source.indexOf('const runHeatCapacityAutoDemo = () => {');
assert.notEqual(runAutoDemoStart, -1, 'heat capacity auto demo runner should exist');
const runAutoDemoEnd = source.indexOf('\n  const createEditSnapshot', runAutoDemoStart);
assert.notEqual(runAutoDemoEnd, -1, 'heat capacity auto demo runner should end before edit snapshot helpers');
const runAutoDemoBody = source.slice(runAutoDemoStart, runAutoDemoEnd);

assert.match(
  runAutoDemoBody,
  /if \(autoDemoPaused[\s\S]*?setAutoDemoPhase\('running'\)[\s\S]*?scheduleHeatCapacityAutoDemoTimeline\([\s\S]*?heatCapacityAutoDemoPausedElapsedMsRef\.current/,
  'resuming Demo mode should continue from its stored timeline elapsed value instead of restarting',
);
assert.match(
  runAutoDemoBody,
  /startHeatCapacityAutoDemoUi\(activeFile\.id, activeFile\.name\)/,
  'a Demo mode without a paused checkpoint should use the shared fresh-start helper',
);

const selectFileStart = source.indexOf('const selectFile = (file: WorkbenchFileState) => {');
assert.notEqual(selectFileStart, -1, 'file selection handler should exist');
const selectFileEnd = source.indexOf('\n  const renderIdealControls', selectFileStart);
assert.notEqual(selectFileEnd, -1, 'file selection handler should end before ideal controls');
const selectFileBody = source.slice(selectFileStart, selectFileEnd);
assert.match(
  selectFileBody,
  /activeFile\.kind === 'heatCapacity'[\s\S]*suspendActiveHeatCapacityModeForNavigation\(\)/,
  'switching away from a heat-capacity file should capture and suspend its active mode checkpoint',
);
assert.match(
  selectFileBody,
  /if \(switchingFile && file\.kind === 'heatCapacity'\) \{[\s\S]*activateHeatCapacityFileModeSession\(file\.id\)/,
  'returning to a heat-capacity file should restore its selected mode session',
);

assert.match(
  source,
  /data-heat-capacity-mode="demo"[\s\S]*heatCapacityActiveMode !== 'demo'[\s\S]*switchHeatCapacityMode\('demo'\)/,
  'Demo mode button should route mode entry through the session switcher',
);

assert.match(
  source,
  /data-heat-capacity-mode="free"[\s\S]*heatCapacityActiveMode !== 'free'[\s\S]*autoDemoInteractionLocked[\s\S]*switchHeatCapacityMode\('free'\)/,
  'Free mode button should restore its independent Free session through the shared switcher',
);

const terminateAutoDemoStart = source.indexOf('const terminateHeatCapacityAutoDemo = () => {');
assert.notEqual(terminateAutoDemoStart, -1, 'heat capacity auto-demo termination handler should exist');
const terminateAutoDemoEnd = source.indexOf('\n  const pauseActiveFile', terminateAutoDemoStart);
assert.notEqual(terminateAutoDemoEnd, -1, 'heat capacity auto-demo termination handler should end before pause handling');
const terminateAutoDemoBody = source.slice(terminateAutoDemoStart, terminateAutoDemoEnd);
assert.match(
  terminateAutoDemoBody,
  /stopHeatCapacityTeachingModeToFree\('demo'\)/,
  'terminating auto demo should clear the Demo session and restore the suspended Free session',
);
assert.doesNotMatch(
  terminateAutoDemoBody,
  /heatCapacityMode:\s*'demo'/,
  'terminating auto demo must not leave the active file stuck in Demo mode',
);

const applyAutoDemoActionStart = source.indexOf('const applyHeatCapacityAutoDemoAction = (');
assert.notEqual(applyAutoDemoActionStart, -1, 'heat capacity auto-demo action dispatcher should exist');
const applyAutoDemoActionEnd = source.indexOf('\n  const setHeatCapacityAutoDemoStepState', applyAutoDemoActionStart);
assert.notEqual(applyAutoDemoActionEnd, -1, 'auto-demo action dispatcher should end before step state helpers');
const applyAutoDemoActionBody = source.slice(applyAutoDemoActionStart, applyAutoDemoActionEnd);
assert.match(
  applyAutoDemoActionBody,
  /if \(action === 'completeTeachingMode'\)[\s\S]*const completedFile = completeHeatCapacityTeachingModeWorkbenchState\(file, now\)[\s\S]*heatCapacityMaterialsExpanded:\s*true/,
  'natural auto-demo completion should keep the completed teaching result visible until explicit exit',
);

const clearAutoDemoUiStart = source.indexOf('const clearHeatCapacityAutoDemoUiState = () => {');
assert.notEqual(clearAutoDemoUiStart, -1, 'heat capacity auto-demo UI cleanup helper should exist');
const clearAutoDemoUiEnd = source.indexOf('\n  const isHeatCapacityUserInteractionLocked', clearAutoDemoUiStart);
assert.notEqual(clearAutoDemoUiEnd, -1, 'heat capacity auto-demo UI cleanup helper should end before interaction lock helper');
const clearAutoDemoUiBody = source.slice(clearAutoDemoUiStart, clearAutoDemoUiEnd);
assert.match(
  clearAutoDemoUiBody,
  /setAutoDemoStepTitle\(''\)[\s\S]*setAutoDemoStepDescription\(''\)[\s\S]*setAutoDemoStepTarget\(''\)[\s\S]*setAutoDemoStepNote\(''\)/,
  'auto-demo cleanup should clear stale step panel copy so a newly created heat-capacity file starts clean',
);
assert.match(
  clearAutoDemoUiBody,
  /setAutoDemoStepIndex\(0\)[\s\S]*setAutoDemoStepCount\(0\)[\s\S]*setAutoDemoStepPanelMode\('hidden'\)/,
  'auto-demo cleanup should reset step counters and hide the step panel immediately',
);
assert.match(
  clearAutoDemoUiBody,
  /setAutoDemoCompletionMessage\(null\)/,
  'auto-demo cleanup should remove stale completion toasts before another file is opened or created',
);

assert.doesNotMatch(
  source,
  /showHeatCapacityAutoDemoCompletionToast\('正在启动引导模式'[\s\S]{0,700}window\.setTimeout/,
  'guide mode start notice should not delay activation behind a timer',
);

assert.match(
  source,
  /activeFile\.kind !== 'heatCapacity' && \(activeFile\.runState === 'running' \|\| activeFile\.runState === 'paused'\) \? \([\s\S]*?className="studio-run-control studio-run-control-stop"/,
  'the header stop button should remain for standard previews and heat capacity should stop through its mode bar',
);

assert.doesNotMatch(
  source,
  /studio-heat-mode-action-next-trial/,
  'single guide mode should not keep the old next-trial guide action',
);

assert.match(
  cssSource,
  /\.studio-heat-mode-control[\s\S]*max-width 340ms cubic-bezier\(0\.2, 0, 0, 1\)/,
  'mode control expansion should use a slower 340ms smooth transition',
);

assert.match(
  cssSource,
  /\.studio-heat-mode-actions[\s\S]*max-width 340ms cubic-bezier\(0\.2, 0, 0, 1\)/,
  'mode action reveal should use the same slower 340ms smooth transition',
);

assert.doesNotMatch(
  cssSource,
  /@keyframes studio-heat-next-trial-breathe/,
  'single guide mode should remove the old next-trial breathing animation',
);

assert.doesNotMatch(
  cssSource,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.studio-heat-mode-action-next-trial/,
  'single guide mode should not keep next-trial reduced-motion overrides',
);

assert.match(
  cssSource,
  /\.studio-panel-actions \.studio-run-control[\s\S]*?width:\s*28px;[\s\S]*?height:\s*28px;[\s\S]*?border-radius:\s*4px;/,
  'run controls should be compact rounded-square icon buttons that do not fill the dock header height',
);

assert.match(
  cssSource,
  /\.studio-run-control-start[\s\S]*?background:\s*#3f474f;[\s\S]*?color:\s*#7bb88b;/,
  'start/resume control should use the dark tile and green outline treatment',
);

assert.match(
  cssSource,
  /\.studio-run-control-stop[\s\S]*?background:\s*#c96a6f;[\s\S]*?color:\s*#ffffff;/,
  'stop control should use the red tile and white outline treatment',
);

assert.doesNotMatch(
  source,
  /<Play size=\{13\}[\s\S]*?\}\s*(?:Run|Resume)|<Square size=\{12\}[\s\S]*?\}\s*Stop/,
  'run and stop controls should render as icon-only buttons with labels only in aria/title text',
);

console.log('workbenchRunStopControls tests passed');
