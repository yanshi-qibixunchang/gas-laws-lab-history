import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const electronSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');

assert.match(
  source,
  /Square,\s*\n\s*Settings,/,
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
  'heat capacity mode bar should read the explicit file mode instead of deriving Free mode from local UI flags',
);

assert.match(
  source,
  /const enterHeatCapacityFreeMode = \(\) => \{[\s\S]*?enterHeatCapacityFreeModeWorkbenchState\(file, Date\.now\(\)\)/,
  'entering Free mode should reset the persisted Free runtime through the workbench state helper',
);

assert.match(
  source,
  /const startHeatCapacityManualExperiment = \(\) => \{[\s\S]*activateHeatCapacityManualExperiment\(guideFileId, guideFileName\);[\s\S]*showHeatCapacityAutoDemoCompletionToast\('正在启动引导模式', HEAT_CAPACITY_GUIDE_START_NOTICE_MS\);[\s\S]*\};/,
  'guide mode should become active immediately so the exit button appears at the same time as the start notice',
);

const runAutoDemoStart = source.indexOf('const runHeatCapacityAutoDemo = () => {');
assert.notEqual(runAutoDemoStart, -1, 'heat capacity auto demo runner should exist');
const runAutoDemoEnd = source.indexOf('\n  const createEditSnapshot', runAutoDemoStart);
assert.notEqual(runAutoDemoEnd, -1, 'heat capacity auto demo runner should end before edit snapshot helpers');
const runAutoDemoBody = source.slice(runAutoDemoStart, runAutoDemoEnd);

const freshAutoDemoStart = runAutoDemoBody.indexOf('const demoFileId = activeFile.id;');
assert.notEqual(freshAutoDemoStart, -1, 'fresh auto demo start path should exist');
const firstAutoDemoRunningFlag = runAutoDemoBody.indexOf('setAutoDemoRunning(true);', freshAutoDemoStart);
assert.notEqual(firstAutoDemoRunningFlag, -1, 'fresh auto demo start should mark the demo as running');
const immediateModeUpdate = runAutoDemoBody.indexOf("heatCapacityMode: 'demo'", freshAutoDemoStart);
assert.ok(
  immediateModeUpdate !== -1 && immediateModeUpdate < firstAutoDemoRunningFlag,
  'fresh demo start should synchronously switch the active file into demo mode before locking the mode bar',
);
assert.match(
  runAutoDemoBody.slice(freshAutoDemoStart, firstAutoDemoRunningFlag),
  /runState:\s*'running'/,
  'fresh demo start should synchronously mark the heat-capacity file as running before the delayed timeline starts',
);

const selectFileStart = source.indexOf('const selectFile = (file: WorkbenchFileState) => {');
assert.notEqual(selectFileStart, -1, 'file selection handler should exist');
const selectFileEnd = source.indexOf('\n  const renderIdealControls', selectFileStart);
assert.notEqual(selectFileEnd, -1, 'file selection handler should end before ideal controls');
const selectFileBody = source.slice(selectFileStart, selectFileEnd);
assert.match(
  selectFileBody,
  /activeFile\.kind === 'heatCapacity'[\s\S]*releaseHeatCapacityRuntimeState\(activeFile\.id\)/,
  'switching away from a running heat-capacity file should release auto-demo and guide UI state instead of leaking global locks',
);
assert.match(
  selectFileBody,
  /autoDemoRunning[\s\S]*autoDemoPaused[\s\S]*autoDemoInteractionLocked/,
  'file switching should treat heat-capacity auto-demo global state as active even when the persisted run state is not running',
);

assert.match(
  source,
  /data-heat-capacity-mode="demo"[\s\S]*heatCapacityActiveMode !== 'demo' \|\| !heatCapacityDemoActionsVisible[\s\S]*runHeatCapacityAutoDemo\(\)/,
  'demo mode button should restart a stale or completed demo-mode file when no demo action is visible',
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

assert.match(
  source,
  /className="studio-heat-mode-action studio-heat-mode-action-next-trial"/,
  'next-trial guide action should have a dedicated attention class',
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

assert.match(
  cssSource,
  /@keyframes studio-heat-next-trial-breathe/,
  'next-trial guide action should define a restrained breathing animation',
);

assert.match(
  cssSource,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.studio-heat-mode-action-next-trial/,
  'next-trial breathing should be disabled or softened for reduced motion users',
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


