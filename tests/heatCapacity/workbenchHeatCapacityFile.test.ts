import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
} from '../../src/features/workbench/workbenchSession.ts';

const heatOne = createDefaultHeatCapacityFile(1);
const heatTwo = createDefaultHeatCapacityFile(2);

assert.equal(heatOne.kind, 'heatCapacity');
assert.equal(heatOne.id, 'heatCapacity-001');
assert.equal(heatOne.name, 'Adiabatic Expansion - 001');
assert.equal(heatTwo.id, 'heatCapacity-002');
assert.equal(heatTwo.name, 'Adiabatic Expansion - 002');
assert.deepEqual(heatOne.visiblePanels, ['preview', 'realtime']);
assert.equal('selectedHeatCapacityPanel' in heatOne, false, 'Heat Capacity should not keep the removed duplicate selected-panel state');
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
assert.equal('heatCapacityExpectedTrialCount' in heatOne, false);
assert.equal('heatCapacityTrials' in heatOne, false);
assert.equal('heatCapacityProcessingCalculated' in heatOne, false);
assert.equal('heatCapacityProcessingResult' in heatOne, false);
assert.equal(heatOne.heatCapacityFreeRuntimeVersion, HEAT_CAPACITY_FREE_RUNTIME_VERSION);
assert.equal(heatOne.heatCapacityFreeTraceVersion, HEAT_CAPACITY_FREE_TRACE_VERSION);
assert.equal(heatOne.heatCapacityFreePhysicsState.wallTemperatureK, 298.15);
assert.equal(heatOne.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK, 0.08);
assert.equal(heatOne.heatCapacityFreePhysicsConfig.thermal.wallAmbientConductanceWPerK, 0.45);
assert.deepEqual(heatOne.heatCapacityFreePhysicsConfig.leakage, {
  enabled: true,
  ratePerS: 0.00005,
});

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
assert.equal(migrated.files[0].name, 'Adiabatic Expansion - 007');
assert.equal(migrated.files[0].liveWorkspaceSplitRatio, 0.62);
assert.equal('selectedHeatCapacityPanel' in migrated.files[0], false, 'legacy selected-panel state should be discarded');
assert.equal(migrated.selectedPanel, 'realtime');

const hardSphereDefaultGamma = 1 + 2 / 3;
const oldHardSphereRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'heatCapacityRecords',
  files: [
    {
      ...heatOne,
      theoreticalGamma: hardSphereDefaultGamma,
    },
  ],
});

const restoredHeatFile = oldHardSphereRestored.files[0];
assert.equal(restoredHeatFile.kind, 'heatCapacity');
if (restoredHeatFile.kind !== 'heatCapacity') throw new Error('expected heat capacity file');
assert.equal(restoredHeatFile.theoreticalGamma, 1.4, 'restored heat-capacity files must use air gamma');
assert.equal('heatCapacityProcessingCalculated' in restoredHeatFile, false);
assert.equal('heatCapacityProcessingResult' in restoredHeatFile, false);

const customName = 'My Custom Heat Capacity Study';
const customRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'preview',
  files: [{ ...heatOne, name: customName }],
});

assert.equal(customRestored.files[0].name, customName);

const outdatedRuntimeRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'preview',
  files: [{
    ...heatOne,
    heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION - 1,
    heatCapacityFreePhysicsConfig: {
      ...heatOne.heatCapacityFreePhysicsConfig,
      pumpAmountGainRatio: 0.5,
    },
    heatCapacityFreePhysicsState: {
      ...heatOne.heatCapacityFreePhysicsState,
      gasAmountRatio: 2,
      gasTemperatureK: 360,
      wallTemperatureK: 340,
    },
  }],
});
const outdatedRuntimeHeatFile = outdatedRuntimeRestored.files[0];
assert.equal(outdatedRuntimeHeatFile.kind, 'heatCapacity');
if (outdatedRuntimeHeatFile.kind !== 'heatCapacity') throw new Error('expected heat capacity file');
assert.equal(outdatedRuntimeHeatFile.heatCapacityFreeRuntimeVersion, HEAT_CAPACITY_FREE_RUNTIME_VERSION);
assert.equal(outdatedRuntimeHeatFile.heatCapacityFreePhysicsConfig.pumpAmountGainRatio, 0.00334);
assert.equal(outdatedRuntimeHeatFile.heatCapacityFreePhysicsState.gasAmountRatio, 1);
assert.equal(outdatedRuntimeHeatFile.heatCapacityFreePhysicsState.gasTemperatureK, 298.15);
assert.equal(outdatedRuntimeHeatFile.heatCapacityFreePhysicsState.wallTemperatureK, 298.15);

const outdatedTraceRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: heatOne.id,
  selectedPanel: 'preview',
  files: [{
    ...heatOne,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION - 1,
    heatCapacityFreeTraceStore: {
      activeTraceTrialId: 'old-trace',
      nextTraceTrialIndex: 99,
      traceTrials: [{ id: 'old-trace' }],
    } as unknown as typeof heatOne.heatCapacityFreeTraceStore,
  }],
});
const outdatedTraceHeatFile = outdatedTraceRestored.files[0];
assert.equal(outdatedTraceHeatFile.kind, 'heatCapacity');
if (outdatedTraceHeatFile.kind !== 'heatCapacity') throw new Error('expected heat capacity file');
assert.equal(outdatedTraceHeatFile.heatCapacityFreeTraceVersion, HEAT_CAPACITY_FREE_TRACE_VERSION);
assert.deepEqual(outdatedTraceHeatFile.heatCapacityFreeTraceStore.traceTrials, []);
assert.equal(outdatedTraceHeatFile.heatCapacityFreeTraceStore.activeTraceTrialId, null);

const standard = createDefaultStandardFile(1);
const ideal = createDefaultIdealFile(1);
assert.equal(standard.name, 'Standard Simulation - 001');
assert.equal(ideal.name, 'Ideal Gas Simulation - 001');
assert.equal(standard.liveWorkspaceSplitRatio < heatOne.liveWorkspaceSplitRatio, true);
assert.equal(ideal.liveWorkspaceSplitRatio < heatOne.liveWorkspaceSplitRatio, true);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);

assert.match(workbenchSource, /heatCapacityStudy:\s*'空气热容比（绝热膨胀法）'/);
assert.match(workbenchSource, /heatCapacityPistonOscillationStudy:\s*'空气热容比（活塞振动法）'/);
assert.match(workbenchSource, /heatCapacityStudy:\s*'Heat Capacity Ratio \(Adiabatic\)'/);
assert.match(workbenchSource, /heatCapacityPistonOscillationStudy:\s*'Heat Capacity Ratio \(Piston\)'/);
assert.doesNotMatch(workbenchSource, /data-heat-capacity-air-result/, 'this batch must not render a formal heat capacity result panel');
assert.match(workbenchSource, /createHeatCapacityPanels/);
assert.match(
  workbenchSource,
  /const selectFile = \(file: WorkbenchFileState\) => \{[\s\S]*setLeftCollapsed\(false\);[\s\S]*setParametersCollapsed\(true\);/,
  'all experiment files should share the same activation layout: left open and right collapsed',
);
assert.match(
  workbenchSource,
  /file\?\.kind === 'heatCapacity'[\s\S]*file\?\.kind === 'heatCapacityPistonOscillation'/,
);
assert.match(workbenchSource, /workbenchLayoutDefaults\.heatCapacity\.liveWorkspaceSplitRatio/);

console.log('workbenchHeatCapacityFile tests passed');
