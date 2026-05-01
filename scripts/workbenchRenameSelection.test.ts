import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const renameSelectionModeRef = useRef<'initial' \| 'normal'>\('normal'\);/,
  'rename should track whether the user is still in the initial full-selection mode',
);

assert.match(
  source,
  /renameInputRef\.current\?\.focus\(\);[\s\S]*?renameInputRef\.current\?\.select\(\);/,
  'entering rename should focus the input and select the full file name after render',
);

assert.match(
  source,
  /const selectRenameNumericSuffix = \(input: HTMLInputElement\) => \{[\s\S]*?\.match\(\/\\d\+\$\/\)[\s\S]*?input\.setSelectionRange\(/,
  'rename should provide a helper that selects the trailing numeric suffix such as 001 or 002',
);

assert.match(
  source,
  /if \(event\.key === 'ArrowRight' && renameSelectionModeRef\.current === 'initial'\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?selectRenameNumericSuffix\(event\.currentTarget\);[\s\S]*?renameSelectionModeRef\.current = 'normal';[\s\S]*?\}/,
  'rename input should turn the first ArrowRight keypress into trailing-number selection',
);

assert.match(
  source,
  /onMouseDown=\{\(\) => \{\s*renameSelectionModeRef\.current = 'normal';\s*\}\}/,
  'clicking into the rename input should leave the initial full-selection mode',
);

assert.match(
  source,
  /className=\{`studio-tree-row studio-file-row \$\{file\.id === activeFile\.id \? 'studio-tree-row-active' : ''\} \$\{menuOpen \? 'studio-file-row-menu-open' : ''\} \$\{isRenaming \? 'studio-file-row-renaming' : ''\}`\}/,
  'renaming file rows should receive a dedicated class for stable layout styling',
);

assert.match(
  cssSource,
  /\.studio-file-row-renaming\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/,
  'renaming rows should clip internal content instead of expanding beyond the left sidebar',
);

assert.match(
  cssSource,
  /\.studio-file-row-renaming \.studio-file-menu-button\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  'renaming rows should hide the action menu button to preserve name input width',
);

assert.match(
  cssSource,
  /\.studio-file-row-renaming \.studio-tree-meta\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?\}/,
  'renaming rows should keep the file-kind metadata from being pushed out by the input',
);

assert.match(
  cssSource,
  /\.studio-file-rename-input\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*clip;/,
  'rename input should stay inside the available file-name area and clip long content internally',
);

console.log('workbenchRenameSelection tests passed');
