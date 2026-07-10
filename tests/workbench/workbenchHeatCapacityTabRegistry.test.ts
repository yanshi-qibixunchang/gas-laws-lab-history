import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_TAB_IDS,
  heatCapacityPanelKeyToTabId,
  heatCapacityTabIdToPanelKey,
  isHeatCapacityPanelKey,
  normalizeWorkbenchHeatCapacityTabIds,
} from '../../src/features/workbench/workbenchHeatCapacityTabRegistry.ts';

assert.deepEqual(HEAT_CAPACITY_TAB_IDS, ['guide', 'records', 'review']);
assert.deepEqual(
  normalizeWorkbenchHeatCapacityTabIds(['guide', 'invalid', 'review'], ['records']),
  ['guide', 'review'],
);
assert.deepEqual(normalizeWorkbenchHeatCapacityTabIds(null, ['records']), ['records']);
for (const tabId of HEAT_CAPACITY_TAB_IDS) {
  assert.equal(heatCapacityPanelKeyToTabId(heatCapacityTabIdToPanelKey(tabId)), tabId);
}
assert.equal(isHeatCapacityPanelKey('heatCapacityGuide'), true);
assert.equal(isHeatCapacityPanelKey('preview'), false);

const sourceRoot = join(process.cwd(), 'src', 'features', 'workbench');
for (const fileName of [
  'WorkbenchStudioPrototype.tsx',
  'workbenchHeatCapacitySessionRestore.ts',
  'workbenchHeatCapacityPersistence.ts',
]) {
  const source = readFileSync(join(sourceRoot, fileName), 'utf8');
  assert.match(source, /from '\.\/workbenchHeatCapacityTabRegistry\.ts'/);
  assert.doesNotMatch(source, /const heatCapacityTabIds\s*=/);
  assert.doesNotMatch(source, /const heatCapacityMaterialsTabOrder\s*=/);
}

console.log('workbenchHeatCapacityTabRegistry tests passed');
