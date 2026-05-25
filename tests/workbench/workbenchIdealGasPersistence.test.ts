import assert from 'node:assert/strict';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  createDefaultIdealFile,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchPanelKey,
} from '../../src/features/workbench/workbenchState.ts';
import {
  IDEAL_GAS_SCHEMA_VERSION,
  createIdealGasPersistencePayload,
  restoreIdealGasFileFromPersistencePayload,
  validateIdealGasPersistencePayload,
} from '../../src/features/workbench/workbenchIdealGasPersistence.ts';

const file = createDefaultIdealFile(4);
const activeParams = { ...file.activeParams, targetTemperature: 1.4 };
const engine = new PhysicsEngine(activeParams);
for (let index = 0; index < 80; index += 1) {
  engine.step();
  if (engine.time >= activeParams.equilibriumTime) engine.collectSamples();
}
engine.flushPressureMeasurement();

const snapshot = engine.createSnapshot();
const summary = engine.getPressureMeasurementSummary();
const sourceFile = {
  ...file,
  relation: 'pv' as const,
  activeParams,
  visiblePanels: ['preview', 'realtime', 'results'] as WorkbenchPanelKey[],
  runState: 'paused' as const,
  stats: engine.getStats(),
  chartData: engine.getHistogramData(false),
  finalChartData: engine.getHistogramData(true),
  particles: engine.particles.map((particle) => ({ ...particle })),
  hardSphereEngineSnapshot: snapshot,
  latestPressureSummary: summary,
  pointsByRelation: {
    ...file.pointsByRelation,
    pv: [{
      id: 'pv-point-1',
      relation: 'pv' as const,
      targetTemperature: 1.4,
      meanTemperature: summary.meanTemperature ?? 1.4,
      meanPressure: summary.meanPressure ?? 0.01,
      idealPressure: summary.meanIdealPressure ?? 0.01,
      relativeGap: summary.relativeGap ?? 0,
      timestamp: 1710000000000,
      boxLength: activeParams.L,
      volume: activeParams.L ** 3,
      inverseVolume: 1 / (activeParams.L ** 3),
      particleCount: null,
    }],
  },
  needsReset: true,
  verificationState: 'verified' as const,
  historyUnlocked: true,
  idealWindowLayout: {
    openTabs: ['verification'] as WorkbenchIdealResultWindowKey[],
    activeIdealResultTab: 'verification' as const,
    heightRatio: 0.7,
    hasCustomHeight: true,
  },
};

const payload = createIdealGasPersistencePayload(sourceFile, 1710000000000);
assert.equal(payload.experimentKind, 'ideal');
assert.equal(payload.idealGasSchemaVersion, IDEAL_GAS_SCHEMA_VERSION);
assert.equal(validateIdealGasPersistencePayload(payload).valid, true);

const restored = restoreIdealGasFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: sourceFile.id,
  kind: 'ideal',
  name: sourceFile.name,
  createdAt: sourceFile.createdAt,
  updatedAt: sourceFile.updatedAt,
  lastOpenedAt: sourceFile.lastOpenedAt,
  layout: {
    visiblePanels: sourceFile.visiblePanels,
    liveWorkspaceSplitRatio: sourceFile.liveWorkspaceSplitRatio,
    idealWindowLayout: sourceFile.idealWindowLayout,
  },
  payload: payload as unknown as Record<string, unknown>,
}, payload, 4);

assert.equal(restored.kind, 'ideal');
assert.equal(restored.relation, 'pv');
assert.equal(restored.pointsByRelation.pv.length, 1);
assert.equal(restored.latestPressureSummary?.sampleCount, summary.sampleCount);
assert.equal(restored.verificationState, 'verified');
assert.equal(restored.historyUnlocked, true);
assert.equal(restored.idealWindowLayout.activeIdealResultTab, 'verification');
assert.equal(restored.hardSphereEngineSnapshot?.pressureHistory.length, snapshot.pressureHistory.length);

console.log('workbenchIdealGasPersistence tests passed');
