const heatControllerSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatCapacityController.ts', import.meta.url), 'utf8');
const heatDemoUiSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatDemoUiActions.ts', import.meta.url), 'utf8');
const heatDemoRuntimeSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatDemoRuntimeActions.ts', import.meta.url), 'utf8');
const heatModeRuntimeSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatModeRuntime.ts', import.meta.url), 'utf8');
const registrySource = readFileSync(new URL('../../src/features/workbench/workbenchHardSphereRuntimeRegistry.ts', import.meta.url), 'utf8');
const frameLoopSource = readFileSync(new URL('../../src/features/workbench/workbenchHardSphereFrameLoop.ts', import.meta.url), 'utf8');
const runActionSource = readFileSync(new URL('../../src/features/workbench/workbenchExperimentRunActions.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchDockHeaderSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchDockHeader.tsx', import.meta.url), 'utf8');
const workbenchHeatCapacityModeControlSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityModeControl.tsx', import.meta.url), 'utf8');
const fileActionSource = readFileSync(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8');
const simulationRuntimeTypeSource = readFileSync(new URL('../../src/features/workbench/workbenchSimulationRuntimeTypes.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const modeActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatCapacityModeActions.ts', import.meta.url), 'utf8');
const modeActivationSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatCapacityModeActivation.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const electronSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');

assert.match(
  workbenchDockHeaderSource,
  /^import\s*\{[^}]*\bSquare\b[^}]*\}\s*from 'lucide-react'/m,
  "workbench preview controls should import the square stop icon used by IDE run toolbars",
);

assert.match(
  runActionSource,
  /const toggleActiveFileRunState = \(\) => \{[\s\S]*?activeFile\.runState === 'running'[\s\S]*?pauseActiveFile\(\);[\s\S]*?runActiveFile\(\);[\s\S]*?\};/,
  'preview should use one toggle control for run and pause',
);

assert.match(
  runActionSource,
  /const stopActiveFile = \(\) => \{[\s\S]*?cancelRuntimeFrame\(activeFile\.id\);[\s\S]*?runState: 'idle'/,
  'preview should expose a stop action that terminates the active runtime',
);

assert.match(
  frameLoopSource,
  /const SIMULATION_TICK_INTERVAL_MS = 16;/,
  'simulation runtime should use a fixed foreground-equivalent tick interval',
);

assert.match(
  simulationRuntimeTypeSource,
  /interface StandardEngineRuntime \{[\s\S]*?simulationTimerId: number \| null;[\s\S]*?\}/,
  'simulation runtimes should track a timer handle instead of a render frame handle',
);

for (const schedulerName of ['scheduleStandardFrame', 'scheduleIdealFrame']) {
  const schedulerStart = frameLoopSource.indexOf(`const ${schedulerName} = (fileId: string) => {`);
  assert.notEqual(schedulerStart, -1, `${schedulerName} should exist`);
  const schedulerEnd = frameLoopSource.indexOf(schedulerName === 'scheduleStandardFrame' ? 'const runStandardFrame =' : 'const runIdealFrame =', schedulerStart);
  assert.notEqual(schedulerEnd, -1, `${schedulerName} body should be followed by a run function`);
  const schedulerBody = frameLoopSource.slice(schedulerStart, schedulerEnd);

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
  registrySource,
  /const cancelRuntimeFrame = \(fileId: string\) => \{[\s\S]*?window\.clearTimeout\(runtime\.simulationTimerId\);[\s\S]*?runtime\.simulationTimerId = null;/,
  'runtime cancellation should clear the fixed simulation timer',
);

assert.match(
  electronSource,
  /webPreferences:\s*\{[\s\S]*?backgroundThrottling:\s*false/,
  'Electron should disable background throttling for the desktop simulation window',
);

assert.match(
  workbenchDockHeaderSource,
  /activeFile\.kind === 'heatCapacity'[\s\S]*?\? renderHeatCapacityModeControl\(\)[\s\S]*?activeFile\.kind === 'heatCapacityPistonOscillation'[\s\S]*?\? renderPistonOscillationModeControl\(\)[\s\S]*?: \([\s\S]*className=\{`studio-run-control studio-run-control-\$\{activeFile\.runState === 'running' \? 'pause' : 'start'\}`\}/,
  'heat capacity and piston experiments should use their mode bars while standard or ideal previews keep the compact run/pause button',
);

assert.match(
  workbenchHeatCapacityModeControlSource,
  /const heatCapacityActiveMode: HeatCapacityMode \| null = activeFile\.heatCapacityMode;/,
  'the heat-capacity mode bar should use the nullable active mode directly so Explore leaves all three formal segments inactive',
);

assert.match(
  heatModeRuntimeSource,
  /switchMode: switchHeatCapacityMode,[\s\S]*request: requestHeatCapacityModeTransition,[\s\S]*schedulePreparation: \(requestId\) => scheduleHeatCapacityModeTargetPreparation\(requestId\)/,
  'mode actions should use the existing transition state and scene preparation owner',
);

assert.match(
  modeActionsSource,
  /const switchMode = \([\s\S]*targetMode: HeatCapacityMode,[\s\S]*reason: HeatCapacityModeTransitionReason[\s\S]*ports\.transition\.request\(\{[\s\S]*sourceMode:[\s\S]*targetMode,[\s\S]*reason,[\s\S]*ports\.transition\.schedulePreparation\(nextState\.requestId\)/,
  'mode switching should submit a strongly typed intent to the shared transition coordinator instead of projecting a target synchronously',
);

assert.match(
  modeActivationSource,
  /const resolveHeatCapacityModeTarget[\s\S]*?if \(targetMode === 'guide'\) \{[\s\S]*?startHeatCapacityGuideWorkbenchState\(suspendedFile, now\)[\s\S]*?activation: 'fresh-guide'/,
  'Guide mode should create a fresh guide runtime only when no resumable Guide checkpoint exists',
);

// Read the actual runner body, independent of unrelated helper declaration order.
const workbenchAst = ts.createSourceFile('workbenchHeatDemoRuntimeActions.ts', heatDemoRuntimeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let runAutoDemoBody: string | null = null;
const findAutoDemoRunner = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
    && node.name.text === 'runHeatCapacityAutoDemo' && node.initializer
    && ts.isArrowFunction(node.initializer)) {
    assert.equal(runAutoDemoBody, null, 'the Demo runner should have one owner');
    runAutoDemoBody = node.initializer.body.getText(workbenchAst);
  }
  ts.forEachChild(node, findAutoDemoRunner);
};
findAutoDemoRunner(workbenchAst);
assert.notEqual(runAutoDemoBody, null, 'heat capacity auto demo runner should exist');

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

const selectFileStart = fileActionSource.indexOf('const selectFile = (file: WorkbenchFileState) => {');
assert.notEqual(selectFileStart, -1, 'file selection handler should exist');
const selectFileEnd = fileActionSource.indexOf('\n  return { createFile,', selectFileStart);
assert.notEqual(selectFileEnd, -1, 'file selection handler should end before ideal controls');
const selectFileBody = fileActionSource.slice(selectFileStart, selectFileEnd);
assert.match(
  selectFileBody,
  /currentActiveFile\.kind === 'heatCapacity'[\s\S]*suspendActiveHeatCapacityModeForNavigation\(\)/,
  'switching away from a heat-capacity file should capture and suspend its active mode checkpoint',
);
assert.match(
  selectFileBody,
  /if \(switchingFile && selectedFile\.kind === 'heatCapacity'\) \{[\s\S]*activeModeCheckpointOverride = activateHeatCapacityFileModeSession\(selectedFile\.id\)/,
  'returning to a heat-capacity file should restore its selected mode session',
);
assert.match(
  selectFileBody,
  /activeModeCheckpointOverride = activateHeatCapacityFileModeSession\(selectedFile\.id\)[\s\S]*flushWorkspacePersistenceRef\.current\(activeModeCheckpointOverride\)/,
  'returning to a heat-capacity file should atomically flush the restored target checkpoint',
);

assert.match(
  workbenchHeatCapacityModeControlSource,
  /data-heat-capacity-mode="demo"[\s\S]*handleHeatCapacityModeSegmentClick\('demo'\)/,
  'Demo mode button should route mode entry through the session switcher',
);

assert.match(heatModeRuntimeSource, /const handleHeatCapacityModeSegmentClick[\s\S]*mode === 'free'[\s\S]*setHeatCapacityBatchSetupRequestedFileId[\s\S]*activateHeatCapacityModeFromExplore\('free'\)/, "the Free mode button should request group setup when needed or restore its independent session from Explore");

let terminateAutoDemoBody = '';
const findAutoDemoTermination = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
    && node.name.text === 'terminateHeatCapacityAutoDemo' && node.initializer
    && ts.isArrowFunction(node.initializer)) {
    assert.equal(terminateAutoDemoBody, '', 'the Demo termination action should have one owner');
    terminateAutoDemoBody = node.initializer.body.getText(workbenchAst);
  }
  ts.forEachChild(node, findAutoDemoTermination);
};
findAutoDemoTermination(workbenchAst);
assert.ok(terminateAutoDemoBody, 'the actual Demo termination action body should exist');
assert.match(
  terminateAutoDemoBody,
  /exitHeatCapacityTeachingModeToExplore\('demo'\)/,
  'terminating auto demo should clear the Demo session and return to a clean Explore base',
);
assert.doesNotMatch(
  terminateAutoDemoBody,
  /heatCapacityMode:\s*'demo'/,
  'terminating auto demo must not leave the active file stuck in Demo mode',
);

const namedActionBody = (owner: string, name: string) => {
  const ast = ts.createSourceFile('action.ts', owner, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bodies: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name
      && node.initializer && ts.isArrowFunction(node.initializer)) bodies.push(node.initializer.body.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(bodies.length, 1, name + ' should have one action owner');
  return bodies[0];
};
const applyAutoDemoActionBody = namedActionBody(heatDemoRuntimeSource, 'applyHeatCapacityAutoDemoAction');
assert.match(
  applyAutoDemoActionBody,
  /if \(action === 'completeTeachingMode'\)[\s\S]*const completedFile = completeHeatCapacityTeachingModeWorkbenchState\(file, now\)[\s\S]*heatCapacityMaterialsExpanded:\s*true/,
  'natural auto-demo completion should keep the completed teaching result visible until explicit exit',
);

const clearAutoDemoUiBody = namedActionBody(heatDemoUiSource, 'clearHeatCapacityAutoDemoUiState');
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
  heatModeRuntimeSource,
  /showHeatCapacityAutoDemoCompletionToast\('正在启动引导模式'[\s\S]{0,700}window\.setTimeout/,
  'guide mode start notice should not delay activation behind a timer',
);

assert.match(
  workbenchDockHeaderSource,
  /\(activeFile\.kind === 'standard' \|\| activeFile\.kind === 'ideal'\) &&[\s\S]*?\(activeFile\.runState === 'running' \|\| activeFile\.runState === 'paused'\) \? \([\s\S]*?className="studio-run-control studio-run-control-stop"/,
  'the header stop button should remain only for standard and ideal previews',
);

assert.doesNotMatch(
  workbenchHeatCapacityModeControlSource,
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
  workbenchDockHeaderSource,
  /<Play size=\{13\}[\s\S]*?\}\s*(?:Run|Resume)|<Square size=\{12\}[\s\S]*?\}\s*Stop/,
  'run and stop controls should render as icon-only buttons with labels only in aria/title text',
);

console.log('workbenchRunStopControls tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchDockHeader \} from '\.\/WorkbenchDockHeader\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityModeControl \} from '\.\/WorkbenchHeatCapacityModeControl\.tsx';/);

assert.match(workbenchHeatCapacityModeControlSource, /data-heat-capacity-mode="free"[\s\S]*handleHeatCapacityModeSegmentClick\('free'\)/);

assert.match(source, /useWorkbenchHeatCapacityController\(\{/);
assert.match(heatControllerSource, /useWorkbenchHeatModeRuntime\(\{/);
assert.match(heatControllerSource, /createWorkbenchHeatDemoRuntimeActions\(\{/);
assert.match(heatControllerSource, /createWorkbenchHeatDemoUiActions\(\{/);
