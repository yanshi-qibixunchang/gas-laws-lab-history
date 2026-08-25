import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultWorkbenchLayoutDefaults,
  isWorkbenchFileLayoutDefault,
  normalizeIdealWindowLayoutState,
  sanitizeIdealResultWindowDefaults,
  sanitizeWorkbenchLayoutDefaults,
} from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
} from '../../src/features/workbench/workbenchState.ts';

const defaults = createDefaultWorkbenchLayoutDefaults();
assert.equal(defaults.standard.liveWorkspaceSplitRatio > 0, true);
assert.equal(defaults.ideal.resultsHeightRatio > 0, true);
assert.equal(defaults.heatCapacity.liveWorkspaceSplitRatio > defaults.ideal.liveWorkspaceSplitRatio, true);
assert.equal(
  defaults.heatCapacityPistonOscillation.liveWorkspaceSplitRatio,
  WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
);
assert.notDeepEqual(defaults.heatCapacityPistonOscillation, defaults.heatCapacity);
assert.notEqual(defaults.heatCapacityPistonOscillation, defaults.heatCapacity);

const normalizedLegacyLayout = normalizeIdealWindowLayoutState({
  openPanels: ['verification'],
  frontHeightRatio: 0.47,
  hasCustomHeights: true,
});

assert.equal(normalizedLegacyLayout.activeIdealResultTab, 'verification');
assert.equal(normalizedLegacyLayout.heightRatio, 0.47);
assert.equal(normalizedLegacyLayout.hasCustomHeight, true);
assert.deepEqual(normalizedLegacyLayout.openTabs, ['experimentPoints', 'verification']);

const malformedIdealLayout = normalizeIdealWindowLayoutState({
  openTabs: 'verification',
  activeIdealResultTab: 'invalid',
  heightRatio: Number.POSITIVE_INFINITY,
});
assert.deepEqual(malformedIdealLayout.openTabs, ['experimentPoints', 'verification']);
assert.equal(malformedIdealLayout.activeIdealResultTab, 'experimentPoints');
assert.equal(malformedIdealLayout.heightRatio, 0.5);

const normalizedDefaults = sanitizeWorkbenchLayoutDefaults({
  ideal: sanitizeIdealResultWindowDefaults({
    backHeightRatio: 0.41,
  }),
  heatCapacityPistonOscillation: {
    resultsHeightRatio: 0.5,
    liveWorkspaceSplitRatio: 0.66,
  },
});

assert.equal(normalizedDefaults.ideal.resultsHeightRatio, 0.41);
assert.equal(normalizedDefaults.standard.resultsHeightRatio, defaults.standard.resultsHeightRatio);
assert.deepEqual(
  normalizedDefaults.heatCapacityPistonOscillation,
  defaults.heatCapacityPistonOscillation,
);

assert.equal(isWorkbenchFileLayoutDefault(createDefaultStandardFile(1), defaults), true);
assert.equal(isWorkbenchFileLayoutDefault(createDefaultIdealFile(1), defaults), true);
assert.equal(isWorkbenchFileLayoutDefault(createDefaultHeatCapacityFile(1), defaults), true);
assert.equal(
  isWorkbenchFileLayoutDefault(createDefaultHeatCapacityPistonOscillationFile(1), defaults),
  true,
);
assert.equal(
  isWorkbenchFileLayoutDefault({
    ...createDefaultHeatCapacityPistonOscillationFile(2),
    liveWorkspaceSplitRatio: 0.5,
  }, defaults),
  false,
);
assert.equal(
  isWorkbenchFileLayoutDefault({
    ...createDefaultStandardFile(2),
    visiblePanels: ['preview', 'realtime'],
    standardResultsLayout: {
      openTabs: [],
      activeTab: 'summary',
      heightRatio: 0.82,
    },
  }, defaults),
  false,
  'closed Results tabs with a custom height should still require layout reset',
);
assert.equal(
  isWorkbenchFileLayoutDefault({
    ...createDefaultHeatCapacityFile(2),
    heatCapacityTabContainerHeight: 0.82,
  }, defaults),
  false,
  'hidden Heat Capacity materials height should still require layout reset',
);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src/features/workbench/WorkbenchStudioPrototype.tsx'),
  'utf8',
);
assert.doesNotMatch(workbenchSource, /legacyLayout|legacyDefaults|legacyStored/, 'legacy layout compatibility names should stay outside the main Workbench component');

console.log('workbenchLayoutCompatibility tests passed');
