import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../components/workbenchState.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }

  return '';
};

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
  'ideal result window should render as an absolute full-width layer',
);
assert.match(
  source,
  /activeIdealResultTab/,
  'ideal result state should store a single active tab instead of deriving foreground order from stacked windows',
);
assert.match(
  stateSource,
  /openTabs:\s*WorkbenchIdealResultWindowKey\[\]/,
  'ideal result layout should remember which browser-style child tabs are open',
);
assert.match(
  stateSource,
  /openTabs:\s*\['experimentPoints',\s*'verification'\]/,
  'new and legacy ideal Results windows should default to both child tabs open',
);
assert.match(
  source,
  /const openIdealResultTabs = idealResultWindowPanels\.filter\(\(panel\) => layout\.openTabs\.includes\(panel\.key\)\)/,
  'ideal Results should render tab buttons only for child tabs that are currently open',
);
assert.match(
  source,
  /aria-label=\{`Close \$\{panel\.title\} tab`\}[\s\S]*?closeIdealResultTab\(panel\.key\)/,
  'ideal Results tabs should expose a close button inside each open tab',
);
assert.match(
  source,
  /getIdealResultTabState\(panel\.key\)/,
  'Window menu should show active/open/off state for ideal Results child tabs',
);
assert.match(
  source,
  /toggleWindowIdealResultTab\(panel\.key\)/,
  'ideal Results child tabs should be toggleable from the Window menu with a single click',
);
assert.match(
  source,
  /replaceOpenTabs\s*\?\s*\[tab\]\s*:/,
  'ideal Results single-child open should replace default open tabs with only the selected tab',
);
assert.match(
  source,
  /openIdealResultsWindow\(tab,\s*false,\s*replaceOpenTabs\)/,
  'ideal Results child switches should single-open from closed state and append to already open tabs',
);
assert.doesNotMatch(
  source,
  /studio-ideal-result-tabs/,
  'ideal Results should not use a separate centered capsule tab component',
);
assert.match(
  source,
  /className="studio-results-tabs studio-ideal-results-tabs"/,
  'ideal Results should reuse the standard Results tab strip styling',
);
assert.doesNotMatch(
  cssSource,
  /\.studio-ideal-result-window-back/,
  'ideal Results should no longer render a back result layer',
);
assert.doesNotMatch(
  cssSource,
  /\.studio-ideal-result-window-front/,
  'ideal Results should no longer render a front result layer',
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
  getRuleBody('.studio-ideal-child-window-body'),
  /align-content:\s*start/,
  'ideal Results child content should stay top-aligned when the result window is stretched taller',
);
assert.match(
  getRuleBody('.studio-ideal-results-card'),
  /align-self:\s*start/,
  'ideal Results cards should keep content-driven height instead of stretching to fill free space',
);
assert.match(
  getRuleBody('.studio-ideal-results-status-grid div'),
  /min-height:\s*\d+px/,
  'ideal Results metric blocks should use stable compact heights',
);
assert.match(
  getRuleBody('.studio-ideal-scan-derived'),
  /justify-content:\s*space-between/,
  'P-V derived V and 1/V value chips should sit at the left and right edges under the scan slider',
);
assert.match(
  stateSource,
  /equilibriumTime:\s*4,[\s\S]*statsDuration:\s*12,/,
  'ideal default sampling preset should be Balanced',
);

console.log('workbenchIdealResultsWindow tests passed');
