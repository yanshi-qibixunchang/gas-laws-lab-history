import assert from 'node:assert/strict';
import {
  createDefaultIdealFile,
  createDefaultStandardFile,
  createInitialWorkbenchFiles,
  type WorkbenchPanelKey,
} from '../components/workbenchState.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
  encodeWorkbenchSession,
} from '../components/workbenchSession.ts';

const standard = createDefaultStandardFile(1);
const ideal = createDefaultIdealFile(1);
const now = 1710000000000;

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
  ],
});

assert.equal(restored.version, WORKBENCH_SESSION_VERSION);
assert.equal(restored.activeFileId, ideal.id);
assert.equal(restored.selectedPanel, 'verification' satisfies WorkbenchPanelKey);
assert.equal(restored.files.length, 2);
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

const encoded = encodeWorkbenchSession(restored.files, restored.activeFileId, restored.selectedPanel);
assert.equal(encoded.version, WORKBENCH_SESSION_VERSION);
assert.equal(encoded.files.length, 2);
assert.equal(encoded.activeFileId, ideal.id);

const fallback = decodeWorkbenchSession({ version: 999, files: [], activeFileId: 'missing', selectedPanel: 'history' });
assert.deepEqual(
  fallback.files.map((file) => file.id),
  createInitialWorkbenchFiles().map((file) => file.id),
  'invalid or unsupported session payloads should fall back to default workbench files',
);
assert.equal(fallback.selectedPanel, 'preview');

const standardOnlyRestore = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: standard.id,
  selectedPanel: 'verification',
  files: [{ ...standard, updatedAt: now }],
});
assert.equal(
  standardOnlyRestore.selectedPanel,
  'preview',
  'standard-file sessions should not restore ideal-only panels such as Verification',
);

console.log('workbenchSessionPersistence tests passed');
