import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchPanelKey,
} from '../../src/features/workbench/workbenchState.ts';
import {
  calculateFreeHeatCapacityMeanResult,
  createHeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
  encodeWorkbenchSession,
} from '../../src/features/workbench/workbenchSession.ts';

const standard = createDefaultStandardFile(1);
const ideal = createDefaultIdealFile(1);
const heatCapacity = createDefaultHeatCapacityFile(1);
const now = 1710000000000;
const savedAutomaticOnlyFreeTrial = {
  ...createHeatCapacityFreeTrial('free-session-automatic-only', {
    displayPressureMv: 0.04,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    atS: 2,
  }),
  u1: {
    atS: 10,
    displayPressureMv: 112.04,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  },
  u2: {
    atS: 20,
    displayPressureMv: 32.04,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  },
  correctedSignals: {
    U0DisplayMv: 0.04,
    U1DisplayMv: 112.04,
    U2DisplayMv: 32.04,
    U1CorrectedMv: 112,
    U2CorrectedMv: 32,
    gamma: 1.4,
  },
};

const restored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: ideal.id,
  selectedPanel: 'verification',
  files: [
    {
      ...standard,
      runState: 'running',
      finalChartData: {
        speed: [{ binStart: 0, binEnd: 1, count: 4, probability: 0.25, theoretical: 0.2 }],
        energy: [],
        energyLog: [],
        tempHistory: [{ time: 1, temperature: 1.01, targetTemperature: 1, error: 0.01, totalEnergy: 10 }],
      },
      updatedAt: now,
    },
    {
      ...ideal,
      relation: 'pv',
      visiblePanels: ['preview', 'realtime', 'results'],
      idealWindowLayout: {
        openTabs: ['verification'],
        activeIdealResultTab: 'verification',
        heightRatio: 0.72,
        hasCustomHeight: true,
      },
      pointsByRelation: {
        ...ideal.pointsByRelation,
        pv: [{
          id: 'pv-1',
          relation: 'pv',
          targetTemperature: 1,
          meanTemperature: 1,
          meanPressure: 0.03,
          idealPressure: 0.031,
          relativeGap: 0.02,
          timestamp: now,
          boxLength: 12,
          volume: 1728,
          inverseVolume: 1 / 1728,
        }],
      },
      latestPressureSummary: {
        latestPressure: 0.03,
        meanPressure: 0.03,
        meanIdealPressure: 0.031,
        meanTemperature: 1,
        relativeGap: 0.02,
        sampleCount: 6,
        history: [{ time: 1, pressure: 0.03, idealPressure: 0.031, temperature: 1 }],
      },
      updatedAt: now,
    },
    {
      ...heatCapacity,
      heatCapacityMode: 'free',
      heatCapacityFreeRuntimeVersion: 0,
      heatCapacityFreeTrials: [savedAutomaticOnlyFreeTrial],
      heatCapacityFreePhysicsState: {
        ...heatCapacity.heatCapacityFreePhysicsState,
        gasAmountRatio: 1.7,
        pumpStrokeCount: 9,
      },
      heatCapacityFreeCalibrationState: {
        ...heatCapacity.heatCapacityFreeCalibrationState,
        calibrationVersion: 5,
        zeroOffsetMv: 1.2,
      },
      updatedAt: now,
    },
  ],
});

assert.equal(restored.version, WORKBENCH_SESSION_VERSION);
assert.equal(restored.activeFileId, ideal.id);
assert.equal(restored.selectedPanel, 'verification' satisfies WorkbenchPanelKey);
assert.equal(restored.files.length, 3);
assert.equal(restored.files[0].runState, 'paused', 'running sessions should restore paused, not auto-run');
assert.equal(restored.files[0].finalChartData?.tempHistory.length, 1, 'standard final result data should persist');

const restoredIdeal = restored.files[1];
assert.equal(restoredIdeal.kind, 'ideal');
if (restoredIdeal.kind === 'ideal') {
  assert.equal(restoredIdeal.relation, 'pv');
  assert.equal(restoredIdeal.pointsByRelation.pv.length, 1);
  assert.equal(restoredIdeal.latestPressureSummary?.sampleCount, 6);
  assert.equal(restoredIdeal.idealWindowLayout.activeIdealResultTab, 'verification');
  assert.equal(restoredIdeal.idealWindowLayout.heightRatio, 0.72);
}

const restoredHeatCapacity = restored.files[2];
assert.equal(restoredHeatCapacity.kind, 'heatCapacity');
if (restoredHeatCapacity.kind === 'heatCapacity') {
  assert.equal(restoredHeatCapacity.heatCapacityFreeRuntimeVersion, HEAT_CAPACITY_FREE_RUNTIME_VERSION);
  assert.equal(restoredHeatCapacity.heatCapacityFreePhysicsState.gasAmountRatio, 1);
  assert.equal(restoredHeatCapacity.heatCapacityFreePhysicsState.pumpStrokeCount, 0);
  assert.equal(restoredHeatCapacity.heatCapacityFreeCalibrationState.calibrationVersion, 0);
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials.length, 1, 'stale Free runtime normalization must preserve Free trials');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].automaticU0?.zeroEventId, 'zero-1');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].u0, null, 'automatic-only saved Free trials must not be promoted to official manual U0 records');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].correctedSignals, null, 'automatic-only saved Free trials must normalize as incomplete official records');
  assert.equal(
    calculateFreeHeatCapacityMeanResult(restoredHeatCapacity.heatCapacityFreeTrials).validTrialCount,
    0,
    'automatic-only saved Free trials must not count as complete official Free trials',
  );
  assert.equal(restoredHeatCapacity.heatCapacityMode, 'free');
}

const encoded = encodeWorkbenchSession(restored.files, restored.activeFileId, restored.selectedPanel);
assert.equal(encoded.version, WORKBENCH_SESSION_VERSION);
assert.equal(encoded.files.length, 3);
assert.equal(encoded.activeFileId, ideal.id);

const fallback = decodeWorkbenchSession({ version: 999, files: [], activeFileId: 'missing', selectedPanel: 'history' });
assert.deepEqual(
  fallback.files.map((file) => file.id),
  [],
  'invalid or unsupported session payloads should fall back to an empty workbench session',
);
assert.equal(fallback.selectedPanel, 'preview');

console.log('workbenchSessionPersistence tests passed');


