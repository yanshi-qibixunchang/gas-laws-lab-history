import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
} from '../components/workbenchState.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
} from '../components/workbenchSession.ts';

const heatOne = createDefaultHeatCapacityFile(1);
const heatTwo = createDefaultHeatCapacityFile(2);

assert.equal(heatOne.kind, 'heatCapacity');
assert.equal(heatOne.id, 'heatCapacity-001');
assert.equal(heatOne.name, 'Heat Capacity Ratio - 001');
assert.equal(heatTwo.id, 'heatCapacity-002');
assert.equal(heatTwo.name, 'Heat Capacity Ratio - 002');
assert.deepEqual(heatOne.visiblePanels, ['preview', 'realtime']);
assert.equal(heatOne.selectedHeatCapacityPanel, 'preview');
assert.ok(
  heatOne.liveWorkspaceSplitRatio > 0.5,
  'heatCapacity preview area should be wider than realtime data by default',
);
assert.equal(heatOne.liveWorkspaceSplitRatio, WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO);
assert.equal('standardResultsLayout' in heatOne, false, 'heatCapacity must not carry standard Results layout state');
assert.equal('idealWindowLayout' in heatOne, false, 'heatCapacity must not carry ideal Results layout state');
assert.equal(heatOne.theoreticalGamma, 1.4);
assert.equal(heatOne.calculationModel, 'airHeatCapacityRatio');
assert.equal(heatOne.visualizationMode, 'particle');
assert.equal('heatCapacityTrace' in heatOne, false, 'heatCapacity files should not persist realtime chart trace history');
assert.deepEqual(heatOne.openHeatCapacityTabs, []);
assert.equal(heatOne.activeHeatCapacityTabId, null);
assert.equal(heatOne.heatCapacityMaterialsExpanded, true);
assert.equal(heatOne.heatCapacityTabContainerHeight, 0.5);
assert.equal(heatOne.heatCapacityExpectedTrialCount, 3);
assert.equal(heatOne.heatCapacityTrials.length, 3);
assert.equal(heatOne.heatCapacityProcessingCalculated, false);

const migrated = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'realtime',
  files: [
    {
      ...heatOne,
      name: 'Hard-Sphere Heat Capacity Ratio - 007',
      id: 'heatCapacity-007',
      liveWorkspaceSplitRatio: 0.62,
      selectedHeatCapacityPanel: 'realtime',
    },
  ],
});

assert.equal(migrated.files.length, 1);
assert.equal(migrated.files[0].kind, 'heatCapacity');
assert.equal(migrated.files[0].name, 'Heat Capacity Ratio - 007');
assert.equal(migrated.files[0].liveWorkspaceSplitRatio, 0.62);
assert.equal(migrated.selectedPanel, 'realtime');

const legacyHardSphereGamma = 1 + 2 / 3;
const oldHardSphereRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'heatCapacityProcessing',
  files: [
    {
      ...heatOne,
      theoreticalGamma: legacyHardSphereGamma,
      heatCapacityProcessingCalculated: true,
      heatCapacityProcessingResult: {
        ...heatOne.heatCapacityProcessingResult,
        calculated: true,
        theoreticalGamma: legacyHardSphereGamma,
        meanGamma: legacyHardSphereGamma,
        relativeErrorPercent: 0,
      },
    },
  ],
});

const restoredHeatFile = oldHardSphereRestored.files[0];
assert.equal(restoredHeatFile.kind, 'heatCapacity');
if (restoredHeatFile.kind !== 'heatCapacity') throw new Error('expected heat capacity file');
assert.equal(restoredHeatFile.theoreticalGamma, 1.4, 'restored heat-capacity files must use air gamma');
assert.equal(restoredHeatFile.heatCapacityProcessingCalculated, false, 'old hard-sphere processing results must be recalculated');
assert.equal(restoredHeatFile.heatCapacityProcessingResult.theoreticalGamma, 1.4);

const customName = 'My Manual Heat Capacity Study';
const customRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'preview',
  files: [{ ...heatOne, name: customName }],
});

assert.equal(customRestored.files[0].name, customName);

const standard = createDefaultStandardFile(1);
const ideal = createDefaultIdealFile(1);
assert.equal(standard.name, 'Standard Simulation - 001');
assert.equal(ideal.name, 'Ideal Gas Simulation - 001');
assert.equal(standard.liveWorkspaceSplitRatio < heatOne.liveWorkspaceSplitRatio, true);
assert.equal(ideal.liveWorkspaceSplitRatio < heatOne.liveWorkspaceSplitRatio, true);

const workbenchSource = readFileSync(
  join(process.cwd(), 'components', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);

assert.match(workbenchSource, /heatCapacityStudy:\s*'空气比热容比实验'/);
assert.match(workbenchSource, /heatCapacityStudy:\s*'Heat Capacity Ratio Experiment'/);
assert.doesNotMatch(workbenchSource, /data-heat-capacity-air-result/, 'this batch must not render a formal heat capacity result panel');
assert.match(workbenchSource, /createHeatCapacityPanels/);
assert.match(workbenchSource, /setParametersCollapsed\(file\.kind === 'heatCapacity'\)/);
assert.match(workbenchSource, /workbenchLayoutDefaults\.heatCapacity\.liveWorkspaceSplitRatio/);
assert.doesNotMatch(workbenchSource, /heatCapacity[\s\S]{0,120}standardResultsLayout/);

console.log('workbenchHeatCapacityFile tests passed');
