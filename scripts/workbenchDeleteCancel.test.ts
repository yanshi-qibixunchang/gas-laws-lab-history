import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const cancelDeleteWorkbenchFile = \(\) => \{[\s\S]*?setPendingDeleteFileId\(null\);[\s\S]*?\};/,
  'workbench file delete confirmation should expose a cancel handler that clears the pending delete state',
);

assert.match(
  source,
  /pendingDelete \? \([\s\S]*?cancelDeleteWorkbenchFile[\s\S]*?Cancel[\s\S]*?\) : null/,
  'the open file menu should show a Cancel button next to Confirm Delete while deletion is pending',
);

assert.match(
  source,
  /aria-label=\{`Cancel deleting \$\{file\.name\}`\}/,
  'the delete cancel button should have an explicit accessible label for the target file',
);

assert.match(
  source,
  /const cancelRemoveIdealPoint = \(\) => \{[\s\S]*?setPendingRemovePointId\(null\);[\s\S]*?\};/,
  'ideal gas point removal should expose a cancel handler that clears the pending remove state',
);

assert.match(
  source,
  /pendingRemovePointId === point\.id \? \([\s\S]*?cancelRemoveIdealPoint[\s\S]*?Cancel[\s\S]*?\) : null/,
  'ideal gas point tables should show a Cancel button next to Confirm Remove while point removal is pending',
);

assert.match(
  source,
  /aria-label=\{`Cancel removing ideal gas point \$\{point\.id\}`\}/,
  'the ideal gas point remove cancel button should have an explicit accessible label for the target point',
);

assert.match(
  source,
  /studio-file-menu-confirm-row-pending/,
  'the file delete confirmation row should mark the two-button pending state for segmented styling',
);

assert.match(
  source,
  /studio-table-action-row-pending/,
  'the ideal gas point remove confirmation row should mark the two-button pending state for segmented styling',
);

assert.match(
  cssSource,
  /\.studio-file-menu-confirm-row-pending[\s\S]*?gap:\s*6px/,
  'file delete confirmation should keep Confirm Delete and Cancel as separate rounded buttons',
);

assert.match(
  cssSource,
  /\.studio-file-menu-confirm-row-pending > button[\s\S]*?border-radius:\s*999px/,
  'file delete confirmation buttons should each use a standalone rounded shape',
);

assert.match(
  cssSource,
  /\.studio-file-menu-confirm[\s\S]*?background:\s*#dc2626[\s\S]*?color:\s*#fff/,
  'file Confirm Delete should use a vivid solid red background with pure white text',
);

assert.match(
  cssSource,
  /\.studio-table-action-row-pending[\s\S]*?gap:\s*6px/,
  'ideal point remove confirmation should keep Confirm Remove and Cancel as separate rounded buttons',
);

assert.match(
  cssSource,
  /\.studio-table-action-row-pending > button[\s\S]*?border-radius:\s*999px/,
  'ideal point confirmation buttons should each use a standalone rounded shape',
);

assert.match(
  cssSource,
  /\.studio-table-action-confirm[\s\S]*?background:\s*#dc2626[\s\S]*?color:\s*#fff/,
  'ideal point Confirm Remove should use a vivid solid red background with pure white text',
);

console.log('workbenchDeleteCancel tests passed');
