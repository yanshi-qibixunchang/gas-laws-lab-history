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

assert.match(
  source,
  /No open file/,
  'empty workbench should explain in the right panel that no file is open',
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
  /\.studio-empty-param-actions[\s\S]*?display:\s*grid/,
  'empty current-parameters panel should style its creation actions',
);

console.log('workbenchEmptyFiles tests passed');
