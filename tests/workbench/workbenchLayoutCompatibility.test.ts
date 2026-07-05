import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultWorkbenchLayoutDefaults,
  normalizeIdealWindowLayoutState,
  sanitizeIdealResultWindowDefaults,
  sanitizeWorkbenchLayoutDefaults,
} from '../../src/features/workbench/workbenchLayoutCompatibility.ts';

const defaults = createDefaultWorkbenchLayoutDefaults();
assert.equal(defaults.standard.liveWorkspaceSplitRatio > 0, true);
assert.equal(defaults.ideal.resultsHeightRatio > 0, true);
assert.equal(defaults.heatCapacity.liveWorkspaceSplitRatio > defaults.ideal.liveWorkspaceSplitRatio, true);

const normalizedLegacyLayout = normalizeIdealWindowLayoutState({
  openPanels: ['verification'],
  frontHeightRatio: 0.47,
  hasCustomHeights: true,
});

assert.equal(normalizedLegacyLayout.activeIdealResultTab, 'verification');
assert.equal(normalizedLegacyLayout.heightRatio, 0.47);
assert.equal(normalizedLegacyLayout.hasCustomHeight, true);
assert.deepEqual(normalizedLegacyLayout.openTabs, ['experimentPoints', 'verification']);

const normalizedDefaults = sanitizeWorkbenchLayoutDefaults({
  ideal: sanitizeIdealResultWindowDefaults({
    backHeightRatio: 0.41,
  }),
});

assert.equal(normalizedDefaults.ideal.resultsHeightRatio, 0.41);
assert.equal(normalizedDefaults.standard.resultsHeightRatio, defaults.standard.resultsHeightRatio);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src/features/workbench/WorkbenchStudioPrototype.tsx'),
  'utf8',
);
assert.doesNotMatch(workbenchSource, /legacyLayout|legacyDefaults|legacyStored/, 'legacy layout compatibility names should stay outside the main Workbench component');

console.log('workbenchLayoutCompatibility tests passed');
