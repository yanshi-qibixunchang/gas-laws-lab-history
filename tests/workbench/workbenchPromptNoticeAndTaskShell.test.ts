import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shellSource = readFileSync(
  new URL('../../src/components/prompts/PromptDialogShell.tsx', import.meta.url),
  'utf8',
);
const shellStyles = readFileSync(
  new URL('../../src/components/prompts/PromptDialogShell.css', import.meta.url),
  'utf8',
);
const noticeSource = readFileSync(
  new URL('../../src/components/prompts/PromptNoticeDialog.tsx', import.meta.url),
  'utf8',
);
const noticeStyles = readFileSync(
  new URL('../../src/components/prompts/PromptNoticeDialog.css', import.meta.url),
  'utf8',
);

assert.match(shellSource, /export const PromptDialogShell/, 'the shared prompt/task shell should be reusable');
assert.match(shellSource, /role=\{role\}[\s\S]*aria-modal="true"/, 'the shell should own modal semantics');
assert.match(shellSource, /dismissPolicy\.closeButton[\s\S]*data-prompt-action="close"/, 'the title-bar close control should follow the declared policy');
assert.match(shellSource, /event\.key === 'Escape'[\s\S]*dismissPolicy\.escape/, 'Escape should follow the declared policy');
assert.match(shellSource, /event\.target !== event\.currentTarget[\s\S]*dismissPolicy\.backdrop/, 'mask dismissal should only run for a direct mask press');
assert.match(shellSource, /getFocusableElements[\s\S]*last\.focus\(\)[\s\S]*first\.focus\(\)/, 'Tab and Shift+Tab should stay inside the active shell');
assert.match(shellSource, /document\.addEventListener\('focusin'[\s\S]*getTopPromptShell/, 'programmatic focus should be returned to the topmost shell');
assert.match(shellSource, /returnTarget\?\.isConnected[\s\S]*returnTarget\.focus\(\)/, 'focus should return to the connected opener');
assert.match(shellSource, /returnFocusSelector[\s\S]*document\.querySelector<HTMLElement>/, 'windows opened from a disappearing menu item should support a persistent focus-return target');
assert.match(shellSource, /priority: layer === 'decision' \? 2 : 1/, 'decision prompts should remain above task windows');

assert.match(noticeSource, /export const PromptNoticeDialog/, 'normal notices should have a named reusable component');
assert.match(noticeSource, /export const PromptForcedNoticeDialog/, 'forced notices should have a named reusable component');
assert.match(
  noticeSource,
  /forced \? \{ closeButton: false, escape: false, backdrop: false \} : dismiss/,
  'forced notices must disable title-bar, Escape, and mask dismissal together',
);
assert.match(noticeSource, /interface PromptForcedNoticeRequest[\s\S]*actionLabel: string;/, 'forced notices should require an explicit action');
assert.match(noticeSource, /initialFocusRef=\{actionButtonRef\}/, 'notice focus should begin on its explicit acknowledgement action');

for (const token of [
  '--prompt-overlay',
  '--prompt-dialog-window-shadow',
  '--prompt-dialog-radius-window',
  '--prompt-dialog-window-padding',
  '--prompt-dialog-header-height',
  '--prompt-dialog-icon-size',
  '--prompt-dialog-status-rule-width',
  '--prompt-motion-normal',
  '--prompt-focus',
]) {
  assert.ok(shellStyles.includes(token), `shared shell styles should expose ${token}`);
}
assert.match(shellStyles, /\.studio-workbench\.studio-theme-light/, 'the shell should support the light theme through shared tokens');
assert.match(shellStyles, /@media \(max-width: 520px\)/, 'the shell should stay usable in a small window');
assert.match(shellStyles, /@media \(prefers-reduced-motion: reduce\)/, 'the shell should respect reduced motion');
assert.match(noticeStyles, /overflow-wrap: anywhere/, 'long localized notice copy should wrap instead of clipping');
assert.match(shellStyles, /--prompt-dialog-radius-control: 3px/);
assert.match(shellStyles, /--prompt-dialog-radius-window: 4px/);
assert.match(shellStyles, /--prompt-dialog-window-padding: 12px/);
assert.match(shellStyles, /--prompt-dialog-header-height: 42px/);
assert.match(shellStyles, /--prompt-dialog-icon-size: 22px/);
assert.match(shellStyles, /--prompt-dialog-status-rule-width: 0px/);
assert.match(shellStyles, /--prompt-dialog-window-shadow: 0 8px 18px rgba\(0, 0, 0, 0\.18\)/);
assert.match(noticeStyles, /padding: var\(--prompt-dialog-window-padding\)/, 'A notices should use compact window padding');
assert.doesNotMatch(`${shellStyles}\n${noticeStyles}`, /backdrop-filter|linear-gradient|radial-gradient/, 'the A shell should stay traditional and avoid glass or gradient treatments');

const migratedTaskWindows = [
  '../../src/features/workbench/WorkbenchGeneralSettingsWindow.tsx',
  '../../src/features/workbench/WorkbenchAboutWindow.tsx',
  '../../src/features/workbench/WorkbenchBuildNoticeWindow.tsx',
  '../../src/features/workbench/WorkbenchUpdateDialog.tsx',
  '../../src/features/heatCapacity/HeatCapacityBatchSetupDialog.tsx',
  '../../src/features/heatCapacity/HeatCapacityCalculationWindow.tsx',
];

for (const relativePath of migratedTaskWindows) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  assert.match(source, /<PromptDialogShell/, `${relativePath} should reuse the shared task shell`);
}

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(workbenchSource, /<PromptDialogShell[\s\S]*dialogClassName=\{`studio-heat-advanced-window/, 'the advanced parameter window should reuse the shared task shell');

console.log('workbenchPromptNoticeAndTaskShell tests passed');
