import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const electronSource = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');

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
  /className=\{`studio-run-control studio-run-control-\$\{activeFile\.kind === 'heatCapacity'[\s\S]*?activeFile\.runState === 'running' \? 'pause' : 'start'\} \$\{activeFile\.kind === 'heatCapacity' \? 'studio-heat-auto-demo-control' : ''\}`\}/,
  'the combined run/pause button should carry state-specific green styling hooks',
);

assert.match(
  source,
  /\{\(activeFile\.runState === 'running' \|\| activeFile\.runState === 'paused' \|\| \(activeFile\.kind === 'heatCapacity' && \(autoDemoRunning \|\| autoDemoPaused\)\)\) \? \([\s\S]*?className="studio-run-control studio-run-control-stop"/,
  'the stop button should only render after a simulation has started',
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
