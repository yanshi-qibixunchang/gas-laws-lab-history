import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  appSource,
  /const WORKBENCH_FRAME_WIDTH = 1440;/,
  'Workbench desktop frame should use a 1440px logical width',
);

assert.match(
  appSource,
  /const WORKBENCH_FRAME_HEIGHT = 810;/,
  'Workbench desktop frame should use an 810px logical height',
);

assert.match(
  appSource,
  /Math\.min\(\s*viewport\.width \/ WORKBENCH_FRAME_WIDTH,\s*viewport\.height \/ WORKBENCH_FRAME_HEIGHT,\s*\)/,
  'Workbench desktop frame should scale from the current viewport while preserving 16:9',
);

assert.match(
  appSource,
  /display:\s*'grid'[\s\S]*?placeItems:\s*'center'[\s\S]*?transform:\s*`scale\(\$\{scale\}\)`/,
  'Workbench desktop frame should use layout centering and reserve transform for scaling only',
);

assert.match(
  appSource,
  /const scaledFrameWidth = WORKBENCH_FRAME_WIDTH \* scale;[\s\S]*?const scaledFrameHeight = WORKBENCH_FRAME_HEIGHT \* scale;[\s\S]*?width:\s*scaledFrameWidth,[\s\S]*?height:\s*scaledFrameHeight,/,
  'Workbench desktop frame should center an explicit wrapper matching the scaled visual size',
);

assert.match(
  appSource,
  /transformOrigin:\s*'top left'/,
  'Workbench desktop frame should scale the logical canvas from the wrapper origin',
);

assert.match(
  appSource,
  /background:\s*'#0b0f14'/,
  'Workbench desktop frame should use a darker matte backdrop outside the 16:9 stage',
);

assert.match(
  appSource,
  /outline:\s*'1px solid rgba\(148, 163, 184, 0\.42\)'[\s\S]*?boxShadow:/,
  'Workbench desktop frame should render a clear boundary around the 16:9 stage',
);

assert.doesNotMatch(
  appSource,
  /transform:\s*`translate\(-50%, -50%\) scale\(\$\{scale\}\)`/,
  'Workbench desktop frame should not combine translation and scaling for centering',
);

assert.match(
  appSource,
  /visualViewport\.addEventListener\('resize', updateViewport\)/,
  'Workbench desktop frame should react to visual viewport resize events',
);

assert.match(
  appSource,
  /if \(!useFixedFrame\) \{[\s\S]*?<WorkbenchStudioPrototype \/>[\s\S]*?\}/,
  'Workbench should keep a responsive fallback for narrow or touch-like viewports',
);

assert.match(
  appSource,
  /width:\s*'100vw'[\s\S]*?height:\s*'100vh'[\s\S]*?<WorkbenchStudioPrototype \/>/,
  'Responsive fallback should still provide a full viewport parent for the workbench root',
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
