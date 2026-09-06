const archWorkbenchDesktopNavigationActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchDesktopNavigationActions.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/SimulationCanvas.tsx', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const electronMain = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const preload = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const electronTypes = readFileSync(new URL('../../electron.d.ts', import.meta.url), 'utf8');
const tailwindConfigSource = readFileSync(new URL('../../tailwind.config.cjs', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }

  return '';
};

const getZIndex = (selector: string) => {
  const match = getRuleBody(selector).match(/z-index:\s*(\d+)/);
  assert.ok(match, `${selector} should define a numeric z-index`);
  return Number(match[1]);
};

const topMenuZIndex = getZIndex('.studio-command-menu');
assert.ok(
  topMenuZIndex > getZIndex('.studio-results-region'),
  'top command menus should stack above the standard Results window',
);
assert.ok(
  topMenuZIndex > getZIndex('.studio-ideal-results-region'),
  'top command menus should stack above the ideal Results window region',
);
assert.ok(
  topMenuZIndex > getZIndex('.studio-ideal-result-window-layer'),
  'top command menus should stack above the ideal Results window',
);
assert.ok(
  topMenuZIndex > getZIndex('.simulation-canvas-workbench-tools'),
  'top command menus should stack above workbench 3D canvas tools',
);
assert.match(
  getRuleBody('.studio-menu'),
  /z-index:\s*\d+/,
  'top menu bar should define its own stacking level',
);

assert.match(
  tailwindConfigSource,
  /['"]\.\/src\/\*\*\/\*\.{ts,tsx}['"]/,
  'Tailwind should scan the refactored src tree so workbench utility classes are generated',
);
assert.match(
  getRuleBody('.simulation-canvas-workbench'),
  /display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*height:\s*100%;[\s\S]*min-height:\s*0;/,
  'workbench 3D canvas should explicitly lay out status above the canvas instead of relying only on Tailwind utilities',
);
assert.match(
  getRuleBody('.studio-theme-dark .studio-file-tab:not(.studio-file-tab-active)'),
  /background:\s*var\(--studio-surface-2\);[\s\S]*box-shadow:/,
  'inactive dark file tabs should have their own surface and separation shadow so adjacent experiments are distinguishable',
);
assert.match(
  getRuleBody('.studio-theme-dark .studio-file-tab-active'),
  /border-top:\s*1px solid rgba\(125,\s*170,\s*219,\s*0\.[0-9]+\);[\s\S]*box-shadow:[\s\S]*inset 0 2px 0 var\(--studio-accent\)/,
  'active dark file tab should keep a stronger top border and accent stripe',
);
assert.equal(
  getRuleBody('.studio-file-tab:not(.studio-file-tab-active)'),
  '',
  'dark inactive file tab styling should not leak into light mode through an unscoped selector',
);
assert.equal(
  getRuleBody('.studio-file-tab-active'),
  '',
  'dark active file tab styling should not leak into light mode through an unscoped selector',
);
assert.match(
  getRuleBody('.studio-heat-mode-segment-active'),
  /box-shadow:[\s\S]*inset 0 0 0 1px color-mix\(in srgb, var\(--studio-success\) 38%, transparent\)/,
  'active heat-capacity mode segment should have a visible outline in dark mode',
);
assert.match(
  getRuleBody('.studio-heat-mode-button-active'),
  /background:\s*color-mix\(in srgb, var\(--studio-success\) 32%, var\(--studio-surface\)\);[\s\S]*color:\s*color-mix\(in srgb, var\(--studio-success\) 52%, var\(--studio-text\)\);[\s\S]*box-shadow:[\s\S]*0 0 0 1px color-mix\(in srgb, var\(--studio-success\) 30%, transparent\)/,
  'active heat-capacity mode button should have higher contrast than inactive dark buttons',
);
assert.match(
  getRuleBody('.studio-heat-mode-button-active:hover'),
  /background:\s*color-mix\(in srgb, var\(--studio-success\) 40%, var\(--studio-surface\)\);[\s\S]*color:\s*var\(--studio-text\);/,
  'hovering the active heat-capacity mode should not fall back to the low-contrast generic hover style',
);
assert.match(
  getRuleBody('.studio-panel-actions .studio-heat-mode-button-active:hover'),
  /border-color:\s*color-mix\(in srgb, var\(--studio-success\) 82%, var\(--studio-border\)\);[\s\S]*color:\s*var\(--studio-text\);/,
  'active heat-capacity mode hover should override the generic panel action hover rule',
);
assert.match(
  getRuleBody('.simulation-canvas-workbench-tool'),
  /height:\s*30px/,
  'workbench rotate/pan tool should use the compact enlarged 30px button height',
);
assert.match(
  getRuleBody('.simulation-canvas-workbench-reset'),
  /height:\s*30px/,
  'workbench reset tool should use the compact enlarged 30px button height',
);
assert.match(
  source,
  /<Hand size=\{isWorkbench \? 16 : 22\} strokeWidth=\{2\.5\} \/>/,
  'workbench pan icon should render at 16px',
);
assert.match(
  source,
  /<Rotate3d size=\{isWorkbench \? 16 : 22\} strokeWidth=\{2\} \/>/,
  'workbench rotate icon should render at 16px',
);
assert.match(
  source,
  /isWorkbench \? t\.canvas\.workbenchDefaultView : \(/,
  'workbench reset tool should render as the same plain text action as heat capacity',
);
assert.match(
  source,
  /simulation-canvas-workbench-tool-attention/,
  'workbench rotate/pan tool should receive a dedicated attention animation class',
);
assert.match(
  source,
  /window\.setTimeout\(\(\) => \{[\s\S]*?setShowPanHint\(true\);[\s\S]*?\}, 3000\);/,
  '3D rotate/pan breathing hint should start after 3 seconds of focused inactivity',
);
assert.match(
  source,
  /isRunning,[\s\S]*?useEffect\(\(\) => \{\s*draw\(\);\s*\}, \[draw, isRunning\]\);/,
  'standard and ideal particle canvases should redraw once when runtime or view state changes',
);
assert.doesNotMatch(
  source,
  /requestAnimationFrame\(render\)/,
  'paused or unchanged standard and ideal canvases must not keep a permanent redraw loop alive',
);
assert.match(
  cssSource,
  /@keyframes workbenchToolBreathe/,
  'workbench should define a dedicated rectangular-tool breathing keyframe',
);

assert.doesNotMatch(
  workbenchSource,
  /handleAction\('Open user guide'\)/,
  'Help > User Guide should no longer use the placeholder action logger',
);
assert.match(
  archWorkbenchDesktopNavigationActionsSource,
  /window\.hardSphereLabUserGuide\?\.openUserGuide\?\.\(settingsLanguagePreference\)/,
  'Help > User Guide should open the language-specific public README through the desktop bridge',
);
assert.match(
  electronMain,
  /USER_GUIDE_URLS[\s\S]*zh-CN[\s\S]*gas-laws-lab-release#readme[\s\S]*zh-TW[\s\S]*README\.zh-TW\.md[\s\S]*en[\s\S]*README\.en\.md/,
  'desktop main process should keep a fixed whitelist of public user-guide URLs',
);
assert.match(
  electronMain,
  /ipcMain\.handle\('hsl-user-guide:open'/,
  'desktop main process should expose a dedicated user-guide open IPC route',
);
assert.match(
  electronMain,
  /shell\.openExternal\(targetUrl\)/,
  'desktop user-guide route should open only the selected whitelisted URL externally',
);
assert.match(
  preload,
  /contextBridge\.exposeInMainWorld\('hardSphereLabUserGuide'/,
  'preload should expose a dedicated user-guide bridge',
);
assert.match(
  preload,
  /ipcRenderer\.invoke\('hsl-user-guide:open'/,
  'preload user-guide bridge should invoke the dedicated IPC route',
);
assert.match(
  electronTypes,
  /hardSphereLabUserGuide\?: \{/,
  'desktop TypeScript declarations should include the user-guide bridge',
);

console.log('workbenchMenuAndCanvasControls tests passed');

assert.match(workbenchSource, /from '\.\/workbenchDesktopNavigationActions\.ts'/);
