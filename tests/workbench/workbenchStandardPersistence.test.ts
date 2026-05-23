import assert from 'node:assert/strict';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  createDefaultStandardFile,
  type WorkbenchPanelKey,
  type WorkbenchStandardResultsTab,
} from '../../src/features/workbench/workbenchState.ts';
import {
  STANDARD_SIMULATION_SCHEMA_VERSION,
  createStandardPersistencePayload,
  restoreStandardFileFromPersistencePayload,
  validateStandardPersistencePayload,
} from '../../src/features/workbench/workbenchStandardPersistence.ts';

const file = createDefaultStandardFile(3);
const engine = new PhysicsEngine(file.appliedParams);
for (let index = 0; index < 30; index += 1) {
  engine.step();
  if (engine.time >= file.appliedParams.equilibriumTime) engine.collectSamples();
}

const snapshot = engine.createSnapshot();
const sourceFile = {
  ...file,
  visiblePanels: ['preview', 'realtime', 'results'] as WorkbenchPanelKey[],
  runState: 'paused' as const,
  stats: engine.getStats(),
  chartData: engine.getHistogramData(false),
  finalChartData: engine.getHistogramData(true),
  particles: engine.particles.map((particle) => ({ ...particle })),
  hardSphereEngineSnapshot: snapshot,
  standardResultsLayout: {
    openTabs: ['summary', 'figures'] as WorkbenchStandardResultsTab[],
    activeTab: 'figures' as const,
    heightRatio: 0.63,
  },
};

const payload = createStandardPersistencePayload(sourceFile, 1710000000000);
assert.equal(payload.experimentKind, 'standard');
assert.equal(payload.standardSchemaVersion, STANDARD_SIMULATION_SCHEMA_VERSION);
assert.equal(payload.runtime.engineSnapshot?.time, snapshot.time);
assert.equal(validateStandardPersistencePayload(payload).valid, true);

const restored = restoreStandardFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: sourceFile.id,
  kind: 'standard',
  name: sourceFile.name,
  createdAt: sourceFile.createdAt,
  updatedAt: sourceFile.updatedAt,
  lastOpenedAt: sourceFile.lastOpenedAt,
  layout: {
    visiblePanels: sourceFile.visiblePanels,
    liveWorkspaceSplitRatio: sourceFile.liveWorkspaceSplitRatio,
    standardResultsLayout: sourceFile.standardResultsLayout,
  },
  payload: payload as unknown as Record<string, unknown>,
}, payload, 3);

assert.equal(restored.kind, 'standard');
assert.equal(restored.finalChartData?.speed.length, sourceFile.finalChartData.speed.length);
assert.equal(restored.standardResultsLayout.activeTab, 'figures');
assert.equal(restored.hardSphereEngineSnapshot?.collectedSampleWindowTotal, snapshot.collectedSampleWindowTotal);

console.log('workbenchStandardPersistence tests passed');
