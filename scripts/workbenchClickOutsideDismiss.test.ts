import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /const topMenuRef = useRef<HTMLDivElement \| null>\(null\);/,
  'top command menu should keep a ref so outside pointer events can ignore clicks inside the active top menu',
);

assert.match(
  source,
  /const fileMenuRef = useRef<HTMLDivElement \| null>\(null\);/,
  'file action menu should keep a ref so outside pointer events can ignore clicks inside the active file menu',
);

assert.match(
  source,
  /const renameInputRef = useRef<HTMLInputElement \| null>\(null\);/,
  'rename input should keep a ref so outside pointer events can distinguish internal rename edits from external clicks',
);

assert.match(
  source,
  /const commitRenameFileFromOutside = \(\) => \{[\s\S]*?pushLog\('File name cannot be empty\.', 'error'\);[\s\S]*?setRenamingFileId\(null\);[\s\S]*?setRenameDraft\(''\);[\s\S]*?\};/,
  'outside rename commit should log the existing empty-name error and exit rename mode when the draft is blank',
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*?const handlePointerDown = \(event: PointerEvent\) => \{[\s\S]*?topMenuRef\.current\?\.contains\(target\)[\s\S]*?setOpenTopMenu\(null\);[\s\S]*?document\.addEventListener\('pointerdown', handlePointerDown\);[\s\S]*?document\.removeEventListener\('pointerdown', handlePointerDown\);[\s\S]*?\}, \[openTopMenu\]\);/,
  'top command menu should install document pointerdown outside-dismiss only while a top menu is open',
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*?const handlePointerDown = \(event: PointerEvent\) => \{[\s\S]*?fileMenuRef\.current\?\.contains\(target\)[\s\S]*?setOpenFileMenuId\(null\);[\s\S]*?setPendingDeleteFileId\(null\);[\s\S]*?document\.addEventListener\('pointerdown', handlePointerDown\);[\s\S]*?document\.removeEventListener\('pointerdown', handlePointerDown\);[\s\S]*?\}, \[openFileMenuId\]\);/,
  'file action menu should install document pointerdown outside-dismiss and clear pending delete while a file menu is open',
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*?const handlePointerDown = \(event: PointerEvent\) => \{[\s\S]*?renameInputRef\.current\?\.contains\(target\)[\s\S]*?commitRenameFileFromOutside\(\);[\s\S]*?document\.addEventListener\('pointerdown', handlePointerDown\);[\s\S]*?document\.removeEventListener\('pointerdown', handlePointerDown\);[\s\S]*?\}, \[renamingFileId, renameDraft\]\);/,
  'rename input should commit from a document pointerdown outside the input while rename mode is active',
);

assert.match(
  source,
  /ref=\{topMenuRef\}/,
  'rendered top command menus should attach the outside-dismiss ref',
);

assert.match(
  source,
  /ref=\{fileMenuRef\}/,
  'rendered file action menu should attach the outside-dismiss ref',
);

assert.match(
  source,
  /ref=\{renameInputRef\}[\s\S]*?onBlur=\{\(\) => commitRenameFileFromOutside\(\)\}/,
  'rename input should also commit through the shared outside behavior on blur',
);

console.log('workbenchClickOutsideDismiss tests passed');
