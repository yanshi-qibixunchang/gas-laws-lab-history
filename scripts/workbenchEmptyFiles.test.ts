import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /files\.length <= 1[\s\S]*?The last open file cannot be deleted\./,
  'workbench file deletion should not block removing the last open file',
);

assert.match(
  source,
  /const isWorkbenchEmpty = files\.length === 0;/,
  'workbench should track an explicit empty-file state',
);

assert.match(
  source,
  /const emptyWorkbenchFile = useMemo\(\(\) => createDefaultStandardFile\(0\), \[\]\);/,
  'workbench should use a stable placeholder file only for empty-state calculations',
);

assert.match(
  source,
  /setActiveFileId\(nextActiveFile\?\.id \?\? ''\);[\s\S]*?activeFileIdRef\.current = nextActiveFile\?\.id \?\? '';/,
  'deleting the active final file should clear the active file id instead of selecting a missing file',
);

assert.match(
  source,
  /const renderEmptyWorkbench = \(\) => \(/,
  'empty workbench should render a dedicated main welcome surface',
);

assert.doesNotMatch(
  source,
  /studio-current-params-empty/,
  'empty workbench should not render a placeholder Current Parameters panel',
);

assert.doesNotMatch(
  source,
  /\{parametersCollapsed \? \([\s\S]*?studio-right-rail[\s\S]*?\) : null\}/,
  'empty workbench should not render the Current Parameters rail unconditionally',
);

assert.match(
  source,
  /!isWorkbenchEmpty \? \([\s\S]*?<aside[\s\S]*?className=\{`studio-current-params/,
  'Current Parameters panel should only render after a study file exists',
);

assert.match(
  source,
  /!isWorkbenchEmpty && parametersCollapsed \? \([\s\S]*?studio-right-rail[\s\S]*?\) : null/,
  'Current Parameters rail should only render after a study file exists',
);

assert.match(
  source,
  /Active file: \{isWorkbenchEmpty \? 'none' : activeFile\.name\}/,
  'empty workbench status bar should show that no file is active',
);

assert.match(
  source,
  /isWorkbenchEmpty \? 'No runtime connected'/,
  'empty workbench status bar should show that no runtime is connected',
);

assert.match(
  source,
  /Create a Standard Simulation Study|Create an Ideal Gas Simulation Study/,
  'empty workbench should offer direct new-study actions',
);

assert.match(
  cssSource,
  /\.studio-empty-workbench[\s\S]*?display:\s*grid/,
  'empty workbench welcome surface should have dedicated layout styling',
);

assert.match(
  cssSource,
  /\.studio-workspace-shell-empty[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  'empty workbench should use a single-column workspace shell',
);

assert.match(
  cssSource,
  /\.studio-empty-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(280px,\s*auto\)\)/,
  'empty workbench action buttons should be wide enough for the ideal-gas label',
);

assert.match(
  cssSource,
  /\.studio-empty-actions button[\s\S]*?white-space:\s*nowrap/,
  'empty workbench action labels should stay on one line',
);

assert.match(
  cssSource,
  /\.studio-center-workspace-active[\s\S]*?animation:\s*studio-main-reveal 160ms/,
  'main workspace should have a fast reveal animation after a file is created',
);

assert.match(
  cssSource,
  /@keyframes studio-main-reveal[\s\S]*?opacity:\s*0[\s\S]*?transform:\s*translateY\(6px\)/,
  'main workspace reveal animation should fade in with a slight upward settle',
);

assert.match(
  cssSource,
  /\.studio-current-params[\s\S]*?animation:\s*studio-params-slide-in 180ms/,
  'Current Parameters panel should slide in quickly from the right',
);

assert.match(
  cssSource,
  /@keyframes studio-params-slide-in[\s\S]*?transform:\s*translateX\(18px\)/,
  'Current Parameters animation should enter from the right',
);

assert.match(
  cssSource,
  /\.studio-rail-button\s*\{[\s\S]*?border:\s*1px solid rgba\(125,\s*170,\s*219,\s*0\.72\)[\s\S]*?color:\s*#d6e8ff/,
  'collapsed rail buttons should use a brighter border and label color',
);

console.log('workbenchEmptyFiles tests passed');
