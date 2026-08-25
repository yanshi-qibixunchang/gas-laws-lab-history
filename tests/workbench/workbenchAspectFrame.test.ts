import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const frameSource = readFileSync(new URL('../../src/app/WorkbenchAspectFrame.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  frameSource,
  /export const WORKBENCH_FRAME_WIDTH = 1440;/,
  'Workbench desktop frame should use a 1440px logical width',
);

assert.match(
  frameSource,
  /export const WORKBENCH_FRAME_HEIGHT = 810;/,
  'Workbench desktop frame should use an 810px logical height',
);

assert.match(
  frameSource,
  /Math\.min\(\s*viewport\.width \/ WORKBENCH_FRAME_WIDTH,\s*viewport\.height \/ WORKBENCH_FRAME_HEIGHT,\s*\)/,
  'Workbench desktop frame should scale from the current viewport while preserving 16:9',
);

assert.match(
  frameSource,
  /display:\s*'grid'[\s\S]*?placeItems:\s*'center'[\s\S]*?transform:\s*useFixedFrame \? `scale\(\$\{scale\}\)` : 'none'/,
  'Workbench desktop frame should use layout centering and reserve transform for scaling only',
);

assert.match(
  frameSource,
  /const scaledFrameWidth = WORKBENCH_FRAME_WIDTH \* scale;[\s\S]*?const scaledFrameHeight = WORKBENCH_FRAME_HEIGHT \* scale;[\s\S]*?width:\s*useFixedFrame \? scaledFrameWidth : '100vw',[\s\S]*?height:\s*useFixedFrame \? scaledFrameHeight : '100vh',/,
  'Workbench desktop frame should center an explicit wrapper matching the scaled visual size',
);

assert.match(
  frameSource,
  /transformOrigin:\s*'top left'/,
  'Workbench desktop frame should scale the logical canvas from the wrapper origin',
);

assert.match(
  frameSource,
  /background:\s*useFixedFrame \? '#11161b' : '#1a1f25'/,
  'Workbench desktop frame should use a darker matte backdrop outside the 16:9 stage',
);

assert.match(
  frameSource,
  /outline:\s*useFixedFrame \? '1px solid rgba\(127, 139, 152, 0\.38\)' : 'none'[\s\S]*?boxShadow:\s*useFixedFrame/,
  'Workbench desktop frame should render a clear boundary around the 16:9 stage',
);

assert.doesNotMatch(
  frameSource,
  /transform:\s*`translate\(-50%, -50%\) scale\(\$\{scale\}\)`/,
  'Workbench desktop frame should not combine translation and scaling for centering',
);

assert.match(
  frameSource,
  /visualViewport\.addEventListener\('resize', updateViewport\)/,
  'Workbench desktop frame should react to visual viewport resize events',
);

assert.match(
  frameSource,
  /data-workbench-aspect-frame=\{useFixedFrame \? 'fixed' : 'responsive'\}[\s\S]*?width:\s*useFixedFrame \? scaledFrameWidth : '100vw'[\s\S]*?height:\s*useFixedFrame \? scaledFrameHeight : '100vh'/,
  'Responsive fallback should still provide a full viewport parent for the workbench root',
);

assert.equal(
  (appSource.match(/<WorkbenchStudioPrototype\b/g) ?? []).length,
  1,
  'fixed and responsive layouts must share one Workbench component identity even when startup props are supplied',
);

assert.doesNotMatch(
  frameSource,
  /if \(!useFixedFrame\) \{[\s\S]*?return \(/,
  'crossing the desktop frame threshold must not switch to a different React subtree',
);

assert.match(
  cssSource,
  /\.studio-workbench\s*\{[\s\S]*?height:\s*100%;[\s\S]*?width:\s*100%;/,
  'Workbench root should fill the 16:9 stage instead of directly using the browser viewport',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-workbench\s*\{[\s\S]*?height:\s*100vh;[\s\S]*?width:\s*100vw;/,
  'Workbench root should not size itself directly to 100vw/100vh in desktop framed mode',
);

console.log('workbenchAspectFrame tests passed');
