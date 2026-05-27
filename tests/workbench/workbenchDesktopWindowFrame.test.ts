import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const electronMainSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const electronPreloadSource = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const electronTypesSource = readFileSync(new URL('../../electron.d.ts', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
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
  /hardSphereLabWindow\?: \{[\s\S]*?minimize: \(\) => Promise<DesktopWindowState>;[\s\S]*?toggleMaximize: \(\) => Promise<DesktopWindowState>;[\s\S]*?close: \(\) => Promise<\{ status: 'closed' \}>;[\s\S]*?getState: \(\) => Promise<DesktopWindowState>;[\s\S]*?onState: \(callback: \(state: DesktopWindowState\) => void\) => \(\) => void;/,
  'renderer typings should cover all custom window controls',
);

assert.match(
  workbenchSource,
  /className="studio-titlebar-brand"/,
  'workbench header should render the app icon and name inside the app chrome',
);

assert.match(
  workbenchSource,
  /className="studio-window-controls"/,
  'workbench header should render custom minimize, maximize, and close controls',
);

assert.match(
  workbenchSource,
  /window\.hardSphereLabWindow\?\.minimize\?\.\(\)/,
  'custom minimize button should call the desktop bridge',
);

assert.match(
  workbenchSource,
  /window\.hardSphereLabWindow\?\.toggleMaximize\?\.\(\)/,
  'custom maximize button should call the desktop bridge',
);

assert.match(
  workbenchSource,
  /window\.hardSphereLabWindow\?\.close\?\.\(\)/,
  'custom close button should call the desktop bridge',
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
