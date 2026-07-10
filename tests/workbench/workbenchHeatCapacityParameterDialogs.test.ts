import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const componentSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchHeatCapacityParameterDialogs.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(componentSource, /interface WorkbenchHeatCapacityDialogCopy/, 'parameter dialogs should share a typed localized copy contract');
assert.match(componentSource, /const WorkbenchHeatCapacityModalDialog/, 'restore and ideal confirmations should share one modal shell');
assert.match(componentSource, /export const WorkbenchHeatCapacityRestoreDefaultDialog/, 'restore-default confirmation should have a named component');
assert.match(componentSource, /export const WorkbenchHeatCapacityIdealProfileIntroDialog/, 'ideal-profile confirmation should have a named component');
assert.match(componentSource, /export const WorkbenchHeatCapacityAdvancedRiskDialog/, 'advanced-risk confirmation should have a named component');
assert.match(componentSource, /role="alertdialog"[\s\S]*aria-modal="true"/, 'confirmation dialogs should preserve modal alert semantics');
assert.match(componentSource, /onMouseDown=\{onCancel\}[\s\S]*event\.stopPropagation\(\)/, 'modal confirmations should close outside while preserving inside interaction');
assert.doesNotMatch(workbenchSource, /const renderHeatCapacityRestoreDefaultDialog|const renderHeatCapacityIdealProfileIntroDialog|const renderHeatCapacityAdvancedRiskDialog/, 'workbench should not retain legacy parameter-confirmation render helpers');

console.log('workbenchHeatCapacityParameterDialogs tests passed');
