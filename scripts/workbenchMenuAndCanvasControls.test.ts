import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/SimulationCanvas.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

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
  /<Maximize size=\{isWorkbench \? 16 : 12\} \/>/,
  'workbench reset icon should render at 16px',
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
  cssSource,
  /@keyframes workbenchToolBreathe/,
  'workbench should define a dedicated rectangular-tool breathing keyframe',
);

console.log('workbenchMenuAndCanvasControls tests passed');
