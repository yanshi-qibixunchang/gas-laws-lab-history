import { readFileSync as readHeatArchitectureSource } from 'node:fs';
const heatArchitectureWorkbenchHeatCapacityExperimentProgressSource = readHeatArchitectureSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityExperimentProgress.tsx', import.meta.url), 'utf8');
const pistonPreviewSource = readFileSync(new URL('../../src/features/workbench/WorkbenchPistonOscillationPreview.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchPresentationSource } from 'node:fs';
const presentationWorkbenchExperimentProgressCopySource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchExperimentProgressCopy.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const selectorSource = readFileSync(
  new URL('../../src/components/experiments/ExperimentCountSelector.tsx', import.meta.url),
  'utf8',
);
const selectorStyles = readFileSync(
  new URL('../../src/components/experiments/ExperimentCountSelector.css', import.meta.url),
  'utf8',
);
const progressSource = readFileSync(
  new URL('../../src/components/experiments/FreeExperimentProgress.tsx', import.meta.url),
  'utf8',
);
const progressStyles = readFileSync(
  new URL('../../src/components/experiments/FreeExperimentProgress.css', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(
  selectorSource,
  /parseExperimentCountDraft[\s\S]*\/\^\\d\+\$\/[\s\S]*options\.includes\(count\)/,
  'the shared count field should accept only one of the experiment-specific whole-number options',
);
assert.match(
  selectorSource,
  /role="combobox"[\s\S]*aria-haspopup="listbox"[\s\S]*role="option"/,
  'the shared count field should expose one consistent accessible combobox structure',
);
assert.match(
  selectorSource,
  /handlePointerDown[\s\S]*setMenuOpen\(false\)[\s\S]*event\.key !== 'Escape'[\s\S]*setMenuOpen\(false\)[\s\S]*document\.addEventListener\('pointerdown'/,
  'outside click and Escape should close the shared count menu',
);
assert.match(
  selectorStyles,
  /\.experiment-count-selector\s*\{[\s\S]*min-height:\s*64px;[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 52px;[\s\S]*border-radius:\s*4px;/,
  'the shared selector should restore the older two-line settings-card proportions',
);
assert.match(
  selectorStyles,
  /\.experiment-count-selector-unit\s*\{[\s\S]*padding-left:\s*10px;[\s\S]*padding-right:\s*14px;/,
  'the count unit should retain deliberate whitespace before the menu arrow',
);
assert.match(
  selectorStyles,
  /\.experiment-count-selector-menu button\s*\{[\s\S]*border-top:\s*1px solid var\(--studio-border-soft\);[\s\S]*\.experiment-count-selector-menu button:first-child/,
  'the dropdown should use the older continuous list with row separators',
);

assert.match(
  progressSource,
  /createPortal\([\s\S]*document\.body/,
  'the shared progress menu should render outside preview panes so it cannot be clipped by them',
);
assert.match(
  progressSource,
  /getBoundingClientRect\(\)[\s\S]*spaceBelow[\s\S]*spaceAbove[\s\S]*window\.innerWidth - menuWidth - VIEWPORT_GAP_PX[\s\S]*maxHeight/,
  'the floating menu should choose above or below and remain inside the viewport',
);
assert.match(
  progressSource,
  /rootRef\.current\?\.contains\(target\) \|\| menuRef\.current\?\.contains\(target\)[\s\S]*closeMenu\(\)[\s\S]*event\.key !== 'Escape'[\s\S]*closeMenu\(true\)/,
  'outside click and Escape should close the portal menu without treating its own content as outside',
);
assert.match(
  progressSource,
  /const closeMenu = [\s\S]*setPendingDeleteId\(null\)[\s\S]*setPosition\(null\)/,
  'every menu close should clear temporary deletion state and floating coordinates',
);
assert.match(
  progressSource,
  /pendingDeleteId === detail\.id[\s\S]*detail\.onDelete\?\.\(\)/,
  'deleting a saved run should still require the shared inline confirmation',
);
assert.match(
  progressStyles,
  /\.free-experiment-progress-menu\s*\{[\s\S]*position:\s*fixed;[\s\S]*max-width:\s*min\(300px, calc\(100vw - 16px\)\);[\s\S]*overflow:\s*auto;/,
  'the new floating menu should be scrollable and viewport bounded',
);

assert.ok((heatArchitectureWorkbenchHeatCapacityExperimentProgressSource.match(/<FreeExperimentProgress/g) ?? []).length >= 2,
  'heat groups and empty-group actions must use the shared progress component');
assert.ok((pistonPreviewSource.match(/<FreeExperimentProgress/g) ?? []).length >= 2,
  'piston runs and empty-plan actions must use the shared progress component');
assert.match(
  presentationWorkbenchExperimentProgressCopySource,
  /heatProgress:[\s\S]*第 \$\{current\} \/ \$\{total\} 次实验[\s\S]*pistonProgress:[\s\S]*第 \$\{ordinal\} \/ \$\{total\} 次 · 目标 \$\{heightMm\} mm/,
  'both progress labels should use the approved compact single-line language',
);
assert.match(heatArchitectureWorkbenchHeatCapacityExperimentProgressSource,
  /dataOwner="heat-capacity"[\s\S]*heatFirst[\s\S]*data-heat-capacity-empty-group-start/,
  'heat reset state must expose explicit first-group setup');
assert.match(pistonPreviewSource,
  /dataOwner="piston-oscillation"[\s\S]*pistonSetup[\s\S]*data-piston-free-setup-plan/,
  'piston reset state must expose explicit plan setup');
assert.doesNotMatch(
  workbenchSource,
  /id: 'abandon-group-draft'[\s\S]{0,320}tone: 'danger'/,
  'abandoning a Heat Capacity draft should use the older neutral white menu row',
);
assert.doesNotMatch(
  workbenchSource,
  /id: 'reset-free-mode'[\s\S]{0,260}tone: 'danger'/,
  'resetting Piston Free mode should use the same neutral white menu row',
);

console.log('sharedExperimentControls tests passed');

assert.match(heatArchitectureWorkbenchHeatCapacityExperimentProgressSource, /from '\.\/workbenchExperimentProgressCopy\.ts'/); assert.match(pistonPreviewSource, /from '\.\/workbenchExperimentProgressCopy\.ts'/); assert.match(workbenchSource, /useWorkbenchHeatCapacityController\(\{/); assert.match(workbenchSource, /useWorkbenchPistonController\(\{/);
