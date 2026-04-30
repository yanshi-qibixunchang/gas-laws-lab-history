import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../components/workbenchState.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const idealPanelsMatch = source.match(/const idealPanels:[\s\S]*?\n\];/);
assert.ok(idealPanelsMatch, 'idealPanels definition should exist');
const idealPanelsBlock = idealPanelsMatch[0];

assert.ok(
  idealPanelsBlock.includes("key: 'experimentPoints'"),
  'ideal files should expose Points as a Results child window',
);
assert.ok(
  idealPanelsBlock.includes("key: 'verification'"),
  'ideal files should expose Verification as a Results child window',
);
assert.ok(
  !idealPanelsBlock.includes("key: 'history'"),
  'ideal files should no longer expose Success History as a separate panel',
);
assert.ok(
  idealPanelsBlock.includes("key: 'results'"),
  'ideal files should expose Results as the consolidated experiment window',
);

assert.match(
  source,
  /const renderIdealPointsWindow = \(\) =>/,
  'ideal Points child window should have a dedicated renderer',
);
assert.match(
  source,
  /const renderIdealVerificationWindow = \(\) =>/,
  'ideal Verification child window should have a dedicated renderer',
);
assert.match(
  source,
  /panel\.key === 'results' && activeFile\.kind === 'ideal' && !resultsChildrenCollapsed/,
  'Ideal Results tree should render Points and Verification child rows',
);
assert.ok(
  !source.includes('Switch relation without leaving Results.'),
  'ideal Results should not duplicate the relation switch from Current Parameters',
);
assert.ok(
  !source.includes('Next preset point'),
  'ideal scan variable controls should replace the unclear next preset point button',
);
assert.match(
  source,
  /studio-ideal-scan-slider/,
  'ideal scan variable should expose a value-synchronized slider control',
);
assert.match(
  source,
  /studio-ideal-scan-input/,
  'ideal scan variable should also expose a direct numeric input',
);
assert.match(
  source,
  /studio-ideal-preset-select/,
  'ideal sampling preset should render as a select-style dropdown',
);
assert.match(
  source,
  /studio-ideal-preset-menu-overlay/,
  'ideal sampling preset options should render as an overlay instead of pushing lower parameters down',
);
assert.match(
  source,
  /panel\.key === 'preview' \? \(/,
  'Preview Reset should be available for both standard and ideal files',
);
assert.match(
  source,
  /studio-ideal-legend-measured-dot/,
  'measured legend marker should be a scatter dot, not a line swatch',
);
assert.match(
  cssSource,
  /\.studio-ideal-result-window-layer[\s\S]*?position:\s*absolute/,
  'ideal result child windows should render as absolute full-width layers',
);
assert.match(
  cssSource,
  /\.studio-ideal-result-window-back[\s\S]*?z-index:\s*210/,
  'ideal result back layer should sit behind the foreground half-height layer',
);
assert.match(
  cssSource,
  /\.studio-ideal-result-window-front[\s\S]*?z-index:\s*220/,
  'ideal result front layer should cover the lower half of the back layer',
);
assert.match(
  source,
  /studio-realtime-summary-ideal/,
  'ideal realtime summary should use an ideal-only layout class',
);
assert.match(
  cssSource,
  /\.studio-realtime-summary-ideal[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  'ideal realtime summary should use a 3-column grid instead of the standard 6-column strip',
);
assert.match(
  source,
  /studio-realtime-summary-standard/,
  'standard realtime summary should also use a dedicated comfortable layout class',
);
assert.match(
  cssSource,
  /\.studio-realtime-summary-standard[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  'standard realtime summary should use a 3-column grid instead of truncating six metrics in one row',
);
assert.match(
  source,
  /studio-ideal-point-strip/,
  'ideal realtime current point summary should render as a compact strip',
);
assert.match(
  cssSource,
  /\.studio-realtime-panel-ideal\.studio-realtime-panel-compact \.studio-ideal-point-strip[\s\S]*?display:\s*none/,
  'ideal compact realtime mode should hide the current point strip',
);
assert.match(
  stateSource,
  /equilibriumTime:\s*4,[\s\S]*statsDuration:\s*12,/,
  'ideal default sampling preset should be Balanced',
);

console.log('workbenchIdealResultsWindow tests passed');
