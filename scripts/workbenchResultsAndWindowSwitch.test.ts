import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const openIdealResultsWindow = \(tab: WorkbenchIdealResultWindowKey = 'experimentPoints',\s*openAllTabs = false,\s*replaceOpenTabs = false\) =>/,
  'ideal Results should expose a dedicated helper for opening the single tabbed result window',
);

assert.match(
  source,
  /openIdealResultTab\(tab,\s*\{ openAllTabs,\s*replaceOpenTabs \}\)/,
  'opening the ideal Results window should set the requested active tab and optionally restore all tabs',
);

assert.match(
  source,
  /panel\.key === 'results'[\s\S]*?activeFile\.kind === 'ideal'[\s\S]*?openIdealResultsWindow\('experimentPoints',\s*true\)/,
  'double-clicking ideal Results should open the tabbed Results window with all child tabs',
);

assert.match(
  source,
  /className=\{`studio-results-folder-button[\s\S]*?onDoubleClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?activeFile\.kind === 'ideal'[\s\S]*?openIdealResultsWindow\('experimentPoints',\s*true\)/,
  'double-clicking the ideal Results folder button should also open the tabbed Results window with all child tabs',
);

assert.match(
  source,
  /onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?setSelectedPanel\(childPanel\.key\);[\s\S]*?\}\}[\s\S]*?onDoubleClick=\{\(event\) => \{[\s\S]*?openIdealResultWindow\(childPanel\.key\)/,
  'clicking ideal Results child rows should only select them; double-click should open the single child tab',
);

assert.match(
  source,
  /const openIdealResultWindow = \(panel: WorkbenchIdealResultWindowKey\) => \{[\s\S]*?const replaceOpenTabs = !activeFile\.visiblePanels\.includes\('results'\)[\s\S]*?openIdealResultsWindow\(panel,\s*false,\s*replaceOpenTabs\)/,
  'left-tree ideal child double-click should single-open from closed Results and append to existing open tabs',
);

assert.doesNotMatch(
  source,
  /onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?openIdealResultsWindow\(childPanel\.key\)/,
  'single-clicking ideal Results child rows should not open content',
);

assert.match(
  source,
  /onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?setSelectedPanel\('results'\);[\s\S]*?\}\}[\s\S]*?onDoubleClick=\{\(event\) => \{[\s\S]*?selectResultsSection\(section\.key,\s*true\)/,
  'clicking standard Results child rows should only select them; double-click should open the single child tab',
);

assert.match(
  source,
  /selectResultsSection[\s\S]*?const replaceOpenTabs = !activeFile\.visiblePanels\.includes\('results'\)[\s\S]*?openStandardResultsWindow\(section,\s*false,\s*replaceOpenTabs\)/,
  'left-tree standard child double-click should single-open from closed Results and append to existing open tabs',
);

assert.match(
  source,
  /className="studio-window-panel-row"/,
  'Window menu panel entries should render as rows, not full-row toggle buttons',
);

assert.match(
  source,
  /className=\{`studio-window-switch \$\{visible \? 'studio-window-switch-on' : 'studio-window-switch-off'\}\$\{locked \? ' studio-window-switch-locked' : ''\}`\}/,
  'Window menu should render a stateful capsule switch for each panel',
);

assert.match(
  source,
  /onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?toggleWindowPanel\(panel\.key\)/,
  'only the capsule switch click handler should toggle Window menu panels',
);

assert.match(
  source,
  /const isWindowPanelVisible = \(panel: WorkbenchPanelKey\) => \([\s\S]*?activeFile\.visiblePanels\.includes\(panel\)/,
  'Window menu should treat ideal Results as on only when the single Results window is open',
);

assert.match(
  source,
  /const toggleWindowPanel = \(panel: WorkbenchPanelKey\) => \{[\s\S]*?activeFile\.kind === 'ideal' && panel === 'results'[\s\S]*?isWindowPanelVisible\(panel\)[\s\S]*?closeIdealResultsWindow\(\)[\s\S]*?openIdealResultsWindow\('experimentPoints',\s*true\)/,
  'Window menu Results switch should open or close the single ideal Results window',
);

assert.match(
  source,
  /activeFile\.kind === 'standard' && panel === 'results'[\s\S]*?openStandardResultsWindow\('summary',\s*true\)/,
  'Window menu Results switch should open standard Results with all child tabs',
);

assert.match(
  source,
  /renderWindowResultsChildRows\(\)/,
  'Window menu should render dedicated Results child tab switches under the Results row',
);

assert.match(
  source,
  /const toggleWindowIdealResultTab = \(tab: WorkbenchIdealResultWindowKey\) =>/,
  'Window menu should expose a single-click ideal Results child tab switch handler',
);

assert.match(
  source,
  /const openIdealResultTab = \(tab: WorkbenchIdealResultWindowKey,\s*options: \{ openAllTabs\?: boolean; replaceOpenTabs\?: boolean \} = \{\}\) =>/,
  'ideal Results should support replacing all open tabs with the selected child tab',
);

assert.match(
  source,
  /toggleWindowIdealResultTab[\s\S]*?const replaceOpenTabs = !activeFile\.visiblePanels\.includes\('results'\)[\s\S]*?openIdealResultsWindow\(tab,\s*false,\s*replaceOpenTabs\)/,
  'Window ideal child switches should single-open from a closed Results window and append when another child tab is already open',
);

assert.match(
  source,
  /const toggleWindowStandardResultsTab = \(tab: WorkbenchStandardResultsTab\) =>/,
  'Window menu should expose a single-click standard Results child tab switch handler',
);

assert.match(
  source,
  /const openStandardResultsWindow = \(tab: WorkbenchStandardResultsTab = 'summary',\s*openAllTabs = false,\s*replaceOpenTabs = false\) =>/,
  'standard Results should support replacing all open tabs with the selected child tab',
);

assert.match(
  source,
  /toggleWindowStandardResultsTab[\s\S]*?const replaceOpenTabs = !activeFile\.visiblePanels\.includes\('results'\)[\s\S]*?openStandardResultsWindow\(tab,\s*false,\s*replaceOpenTabs\)/,
  'Window standard child switches should single-open from a closed Results window and append when another child tab is already open',
);

assert.match(
  source,
  /const closeIdealResultTab = \(tab: WorkbenchIdealResultWindowKey\) =>[\s\S]*?captureUndoSnapshot\(`closed \$\{[\s\S]*? tab`\)[\s\S]*?closeIdealResultsWindow\(\)/,
  'closing the last ideal Results child tab should close the whole Results window with undo history',
);

assert.match(
  source,
  /className=\{`studio-window-switch \$\{visible \? 'studio-window-switch-on' : 'studio-window-switch-off'\}\$\{locked \? ' studio-window-switch-locked' : ''\}`\}/,
  'locked visible panels should still render the capsule switch in the on position',
);

assert.match(
  cssSource,
  /\.studio-window-switch[\s\S]*?border-radius:\s*999px[\s\S]*?transition:/,
  'Window menu capsule switch should have pill geometry and smooth transitions',
);

assert.match(
  cssSource,
  /\.studio-window-switch-on[\s\S]*?background:/,
  'Window menu capsule switch should define a distinct on color',
);

assert.match(
  cssSource,
  /\.studio-window-switch-on:hover[\s\S]*?background:\s*linear-gradient/,
  'Window menu capsule switch on state should keep its on color while hovered',
);

assert.match(
  cssSource,
  /\.studio-window-switch-off[\s\S]*?background:/,
  'Window menu capsule switch should define a distinct off color',
);

assert.match(
  cssSource,
  /\.studio-window-switch-off[\s\S]*?box-shadow:\s*inset 0 0 0 1px/,
  'Window menu capsule switch off state should keep a visible capsule outline',
);

assert.match(
  cssSource,
  /\.studio-window-switch-locked[\s\S]*?opacity:/,
  'Window menu capsule switch should define a locked disabled appearance',
);

assert.match(
  cssSource,
  /\.studio-window-switch-on \.studio-window-switch-thumb[\s\S]*?transform:\s*translateX/,
  'Window menu capsule switch thumb should slide when enabled',
);

console.log('workbenchResultsAndWindowSwitch tests passed');
