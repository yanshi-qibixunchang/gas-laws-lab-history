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
  /const cancelDeleteWorkbenchFile = \(\) => \{\s*setPendingDeleteFileId\(null\);\s*setOpenFileMenuId\(null\);\s*\};/,
  'workbench file delete cancel should close the open file menu after clearing the pending delete state',
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
  /pendingDelete \? 'studio-file-menu studio-file-menu-pending' : 'studio-file-menu'/,
  'the file menu shell should mark pending delete state so it can animate wider for Confirm Delete',
);

assert.match(
  source,
  /studio-table-action-row-pending/,
  'the ideal gas point remove confirmation row should mark the two-button pending state for segmented styling',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-file-menu-confirm-row-pending\s*\{[^}]*?(border-radius|background|padding):/,
  'file delete confirmation row should not use capsule container styling',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-file-menu-confirm-row-pending > button\s*\{[^}]*?border-radius:\s*999px/,
  'file delete confirmation buttons should not use capsule button styling',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-file-menu-confirm\s*\{[^}]*?background:/,
  'file Confirm Delete should not have a default standalone filled background',
);

assert.match(
  cssSource,
  /\.studio-file-menu-confirm:hover,\s*\.studio-file-menu-confirm:focus-visible\s*\{[\s\S]*?background:\s*rgba\(220,\s*38,\s*38,\s*0\.18\)\s*!important;[\s\S]*?color:\s*#fecaca\s*!important;[\s\S]*?box-shadow:\s*none;[\s\S]*?outline:\s*none;/,
  'file Confirm Delete hover and keyboard focus should use segmented row feedback without a button box',
);

assert.match(
  cssSource,
  /\.studio-file-menu-cancel:hover,\s*\.studio-file-menu-cancel:focus-visible\s*\{[\s\S]*?background:\s*rgba\(110,\s*168,\s*254,\s*0\.16\)\s*!important;[\s\S]*?color:\s*#dbeafe\s*!important;[\s\S]*?box-shadow:\s*none;[\s\S]*?outline:\s*none;/,
  'file Cancel hover and keyboard focus should use segmented row feedback without a button box',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-file-menu-(?:confirm|cancel):(?:hover|focus-visible)[^{]*\{[^}]*?transform:\s*translateY\(-1px\);/,
  'file menu Confirm Delete and Cancel hover states should not use capsule lift animation',
);

assert.match(
  cssSource,
  /\.studio-file-menu\s*\{[\s\S]*?width:\s*96px;[\s\S]*?overflow:\s*hidden;[\s\S]*?transition:[^;]*width 160ms ease/,
  'file menu should start narrow, clip row hover to the rounded shell, and animate width changes',
);

assert.match(
  cssSource,
  /\.studio-file-menu-pending\s*\{[\s\S]*?width:\s*136px;/,
  'file menu pending state should expand wide enough for one-line Confirm Delete',
);

assert.match(
  cssSource,
  /\.studio-file-menu button\s*\{[\s\S]*?justify-content:\s*center;/,
  'file menu buttons should center their icon and text within the compact menu',
);

assert.match(
  cssSource,
  /\.studio-file-menu-confirm-row\s*\{[\s\S]*?border-top:\s*1px solid var\(--studio-border-soft\);/,
  'file menu delete area should be separated as a menu row inside the outer rounded rectangle',
);

assert.match(
  cssSource,
  /\.studio-file-menu-confirm-row-pending > button \+ button\s*\{[\s\S]*?border-top:\s*1px solid var\(--studio-border-soft\);/,
  'file menu pending cancel row should be separated inside the same rounded rectangle',
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

assert.match(
  cssSource,
  /\.studio-table-action-confirm:hover,\s*\.studio-table-action-confirm:focus-visible\s*\{[\s\S]*?box-shadow:[^;]+;[\s\S]*?transform:\s*translateY\(-1px\);/,
  'ideal point Confirm Remove hover and keyboard focus should use capsule shadow and lift feedback',
);

assert.match(
  cssSource,
  /\.studio-table-action-cancel:hover,\s*\.studio-table-action-cancel:focus-visible\s*\{[\s\S]*?background:\s*#33465d;[\s\S]*?box-shadow:[^;]+;[\s\S]*?transform:\s*translateY\(-1px\);/,
  'ideal point Cancel hover and keyboard focus should use capsule brightening, shadow, and lift feedback',
);

console.log('workbenchDeleteCancel tests passed');
