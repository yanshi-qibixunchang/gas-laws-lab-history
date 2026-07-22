import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityBatchSetupDialog.tsx',
), 'utf8');
const styleSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityBatchSetupDialog.css',
), 'utf8');
const shellSource = readFileSync(join(
  process.cwd(),
  'src',
  'components',
  'prompts',
  'PromptDialogShell.tsx',
), 'utf8');

assert.match(
  componentSource,
  /HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS\s*=\s*\[3,\s*4,\s*5,\s*6,\s*7\]\s*as const/,
  'batch setup should expose exactly the approved 3-to-7 group options',
);
assert.match(
  componentSource,
  /placeholder:\s*'请选择实验组数'/,
  'Simplified Chinese should default to the approved group-count placeholder',
);
assert.match(componentSource, /'zh-CN':[\s\S]*'zh-TW':[\s\S]*en:/, 'all three workbench languages should be provided');
assert.match(componentSource, /<PromptDialogShell[\s\S]*role="dialog"/, 'setup should use the shared task-dialog shell');
assert.match(shellSource, /aria-modal="true"/, 'the shared shell should provide modal semantics');
assert.match(componentSource, /aria-haspopup="listbox"/, 'group selector should expose listbox semantics');
assert.match(componentSource, /role="option"/, 'group selector should expose option semantics');
assert.match(componentSource, /case 'ArrowDown':[\s\S]*case 'ArrowUp':/, 'arrow-key selection should be supported');
assert.match(componentSource, /case 'Enter':[\s\S]*case ' ':/, 'Enter and Space selection should be supported');
assert.match(componentSource, /case 'Escape':[\s\S]*closeMenu[\s\S]*onCancel\(\)/, 'Escape should close the selector first, then cancel the batch dialog');
assert.match(componentSource, /document\.addEventListener\('pointerdown'/, 'outside click should close the selector');
assert.match(
  componentSource,
  /data-heat-capacity-batch-setup-confirm="true"[\s\S]*disabled=\{selectedCount === null\}/,
  'confirmation should stay disabled until a group count is selected',
);
assert.match(
  componentSource,
  /data-heat-capacity-batch-setup-cancel="true"[\s\S]*onClick=\{onCancel\}/,
  'cancel should return an unconfigured Free request to Explore',
);
assert.doesNotMatch(componentSource, /<X\b|onClose/, 'the blocking setup dialog must not expose a close control');
assert.match(
  componentSource,
  /dismiss=\{\{ closeButton: false, escape: false, backdrop: false \}\}/,
  'the setup window should not add ambient close channels beyond its existing explicit keyboard handler',
);
assert.doesNotMatch(
  componentSource,
  /event\.target === event\.currentTarget\)[^{]*onConfirm|onMouseDown=\{onConfirm\}/,
  'clicking the blocking backdrop must not confirm or close the dialog',
);

assert.match(
  styleSource,
  /\.studio-heat-batch-setup-window\s*\{[\s\S]*width:\s*min\(580px,/,
  'setup should use a compact settings-window width',
);
assert.match(
  styleSource,
  /\.studio-heat-batch-setup-menu\s*\{[\s\S]*top:\s*calc\(100% \+ 6px\)/,
  'the language-style menu should open below its trigger',
);
assert.match(
  styleSource,
  /background:\s*var\(--studio-action-primary-bg\)/,
  'confirmation should reuse the workbench primary action token',
);
assert.match(
  styleSource,
  /background:\s*var\(--studio-surface-2\)/,
  'dialog surfaces should reuse the current workbench surface tokens',
);

console.log('heatCapacityBatchSetupDialog tests passed');
