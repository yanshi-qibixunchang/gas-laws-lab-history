import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../components/workbenchState.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  stateSource,
  /export type WorkbenchStandardResultsTab = 'summary' \| 'dataTable' \| 'figures'/,
  'standard Results tabs should use a shared per-file tab key type',
);

assert.match(
  stateSource,
  /standardResultsLayout:\s*WorkbenchStandardResultsLayout/,
  'standard files should persist their Results tab layout per file',
);

assert.match(
  stateSource,
  /openTabs:\s*\['summary',\s*'dataTable',\s*'figures'\]/,
  'standard Results should default to all result tabs open',
);

assert.match(
  source,
  /const openStandardResultsWindow = \(tab: WorkbenchStandardResultsTab = 'summary',\s*openAllTabs = false,\s*replaceOpenTabs = false\) =>/,
  'standard Results should have a dedicated opener that can reopen a closed child tab',
);

assert.match(
  source,
  /const closeStandardResultsTab = \(tab: WorkbenchStandardResultsTab\) =>/,
  'standard Results should have a dedicated child tab close handler',
);

assert.match(
  source,
  /const pickNextOpenTab = <T extends string>\(tabs: T\[], closingTab: T\)/,
  'closing an active Results tab should use shared right-side-first tab selection',
);

assert.match(
  source,
  /closePanel\('results',\s*false\)/,
  'closing the last standard Results child tab should close the whole Results panel',
);

assert.match(
  source,
  /const openStandardResultTabs = resultsSections\.filter\(\(section\) => standardResultsLayout\.openTabs\.includes\(section\.key\)\)/,
  'standard Results should render only currently open child tabs',
);

assert.match(
  source,
  /aria-label=\{`Close \$\{section\.title\} tab`\}[\s\S]*?closeStandardResultsTab\(section\.key\)/,
  'standard Results tabs should expose a close button inside each open tab',
);

assert.match(
  source,
  /getStandardResultsTabState\(section\.key\)/,
  'standard Results tree should expose active/open/off state for each child tab',
);

assert.match(
  source,
  /toggleWindowStandardResultsTab\(section\.key\)/,
  'standard Results child tabs should be toggleable from the Window menu with a single click',
);

assert.match(
  source,
  /openStandardResultsWindow\(tab,\s*false,\s*replaceOpenTabs\)/,
  'Window menu should open only the selected standard Results child tab from closed state and append to already open tabs',
);

assert.match(
  source,
  /replaceOpenTabs\s*\?\s*\[tab\]\s*:/,
  'standard Results single-child open should replace default open tabs with only the selected tab',
);

assert.match(
  cssSource,
  /\.studio-results-tab-close[\s\S]*?width:\s*18px[\s\S]*?height:\s*18px/,
  'Results tab close buttons should be compact browser-style controls',
);

console.log('workbenchStandardResultsClosableTabs tests passed');
