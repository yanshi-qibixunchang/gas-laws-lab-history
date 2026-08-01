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
const shellSource = readFileSync(
  new URL('../../src/components/prompts/PromptDialogShell.tsx', import.meta.url),
  'utf8',
);

assert.match(componentSource, /interface WorkbenchHeatCapacityDialogCopy/, 'parameter dialogs should share a typed localized copy contract');
assert.match(componentSource, /const WorkbenchHeatCapacityModalDialog/, 'restore and ideal confirmations should share one modal shell');
assert.match(componentSource, /export const WorkbenchHeatCapacityRestoreDefaultDialog/, 'restore-default confirmation should have a named component');
assert.match(componentSource, /export const WorkbenchHeatCapacityIdealProfileIntroDialog/, 'ideal-profile confirmation should have a named component');
assert.match(componentSource, /export const WorkbenchHeatCapacityAdvancedRiskDialog/, 'advanced-risk confirmation should have a named component');
assert.match(componentSource, /<PromptDialogShell[\s\S]*role="alertdialog"/, 'confirmation dialogs should use the shared alert-dialog shell');
assert.match(shellSource, /aria-modal="true"/, 'the shared shell should preserve modal semantics');
assert.match(componentSource, /dismiss=\{\{ closeButton: false, escape: true, backdrop: true \}\}/, 'parameter confirmations should keep cancel-by-Escape and cancel-by-mask without adding a title-bar close button');
assert.match(
  workbenchSource,
  /onRequestClose=\{cancelHeatCapacityAdvancedParameterDraft\}[\s\S]*overlayClassName="studio-heat-advanced-overlay"/,
  'the advanced parameter task window should route its mask through the shared close contract',
);
assert.match(
  componentSource,
  /overlayClassName="studio-heat-advanced-risk-overlay"[\s\S]*dialogClassName="studio-heat-advanced-risk-window"/,
  'the advanced-risk confirmation should have its own top-layer shared shell',
);
assert.doesNotMatch(workbenchSource, /const renderHeatCapacityRestoreDefaultDialog|const renderHeatCapacityIdealProfileIntroDialog|const renderHeatCapacityAdvancedRiskDialog/, 'workbench should not retain legacy parameter-confirmation render helpers');

console.log('workbenchHeatCapacityParameterDialogs tests passed');
