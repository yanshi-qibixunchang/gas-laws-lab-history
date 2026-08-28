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
const selectorSource = readFileSync(join(
  process.cwd(),
  'src',
  'components',
  'experiments',
  'ExperimentCountSelector.tsx',
), 'utf8');
const selectorStyleSource = readFileSync(join(
  process.cwd(),
  'src',
  'components',
  'experiments',
  'ExperimentCountSelector.css',
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
  'group setup should expose exactly the approved 3-to-7 experiment-count options',
);
assert.match(
  componentSource,
  /inputAria:\s*'输入本组实验次数'/,
  'Simplified Chinese should use the approved direct-entry experiment-count terminology',
);
assert.match(
  componentSource,
  /placeholder:\s*'请选择实验次数'[\s\S]*emptyHint:\s*'可选择 3 至 7 次'/,
  'the empty selector should restore the older Heat Capacity label and helper line',
);
assert.match(
  componentSource,
  /useState\(''\)[\s\S]*selectedCount === null \? '' : String\(selectedCount\)/,
  'a newly opened setup should preserve the approved blank, unselected count state',
);
assert.match(
  componentSource,
  /schemeTitle:[\s\S]*下一组方案[\s\S]*data-heat-capacity-batch-setup-scheme="true"[\s\S]*scheme === 'ideal'/,
  'the confirmation dialog should identify the selected scheme for the next group',
);
assert.match(
  componentSource,
  /当前实验组将保留为只读记录[\s\S]*数据、计算、过程回顾和图像将切换到暂无数据的新组/,
  'the next-group confirmation should explain the exact history and result-context transition',
);
assert.match(componentSource, /'zh-CN':[\s\S]*'zh-TW':[\s\S]*en:/, 'all three workbench languages should be provided');
assert.match(componentSource, /<PromptDialogShell[\s\S]*role="dialog"/, 'setup should use the shared task-dialog shell');
assert.match(shellSource, /aria-modal="true"/, 'the shared shell should provide modal semantics');
assert.match(componentSource, /<ExperimentCountSelector/, 'Heat Capacity should use the shared count selector');
assert.match(selectorSource, /aria-haspopup="listbox"/, 'the shared selector should expose listbox semantics');
assert.match(selectorSource, /role="option"/, 'the shared selector should expose option semantics');
assert.match(selectorSource, /event\.key === 'ArrowDown' \|\| event\.key === 'ArrowUp'/, 'arrow-key selection should be supported');
assert.match(selectorSource, /event\.key === 'Enter'/, 'Enter selection should be supported');
assert.match(selectorSource, /event\.key === 'Escape'[\s\S]*setMenuOpen\(false\)/, 'Escape should close the shared selector first');
assert.match(selectorSource, /document\.addEventListener\('pointerdown'/, 'outside click should close the selector');
assert.match(
  componentSource,
  /data-heat-capacity-batch-setup-confirm="true"[\s\S]*disabled=\{resolvedCount === null\}/,
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
  selectorStyleSource,
  /\.experiment-count-selector-menu\s*\{[\s\S]*top:\s*calc\(100% \+ 6px\)/,
  'the shared language-style menu should open below its trigger',
);
assert.match(
  selectorStyleSource,
  /\.experiment-count-selector\s*\{[\s\S]*min-height:\s*64px;[\s\S]*border-radius:\s*4px;/,
  'the shared selector should use the older Heat Capacity settings-card silhouette',
);
assert.match(
  selectorStyleSource,
  /\.experiment-count-selector-menu button\s*\{[\s\S]*border-top:\s*1px solid var\(--studio-border-soft\);/,
  'the count menu should restore the older continuous row list',
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
