import assert from 'node:assert/strict';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import { sanitizeHardSphereSimulationParams } from '../../src/domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  createDefaultIdealFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultStandardFile,
  validateWorkbenchParams,
} from '../../src/features/workbench/workbenchState.ts';
import { repairMissingHardSphereEngineSnapshot } from '../../src/features/workbench/workbenchHardSphereProjection.ts';
import {
  normalizeHardSphereEngineSnapshot,
  normalizeSimulationParamsSnapshot,
  upgradeLegacyHardSphereEngineSnapshotV1,
} from '../../src/features/workbench/workbenchHardSpherePersistence.ts';
import {
  isCanonicalPistonOscillationWorkspaceFile,
  isCanonicalStandardOrIdealWorkspaceFile,
} from '../../src/features/workbench/workbenchWorkspaceFileValidation.ts';

const clone = <Value>(value: Value): Value => structuredClone(value);

const standard = createDefaultStandardFile(1);
const ideal = createDefaultIdealFile(1);
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(standard), true);
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(ideal), true);
const pistonOscillation = createDefaultHeatCapacityPistonOscillationFile(1);
assert.equal(isCanonicalPistonOscillationWorkspaceFile(pistonOscillation), true);
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(pistonOscillation), false);
[
  { ...pistonOscillation, pistonOscillationSchemaVersion: 2 },
  { ...pistonOscillation, previewCameraPreset: 'rear' },
  { ...pistonOscillation, runState: 'running' },
  { ...pistonOscillation, visiblePanels: ['preview', 'heatCapacityGuide'] },
  { ...pistonOscillation, unexpected: true },
].forEach((candidate) => {
  assert.equal(isCanonicalPistonOscillationWorkspaceFile(candidate), false);
});

const invalidParamCandidates = [
  { ...standard.params, N: 1.5 },
  { ...standard.params, N: 1001 },
  { ...standard.params, r: standard.params.L / 2 },
  { ...standard.params, dt: 0.2 },
  { ...standard.params, dt: 0.1, nu: 11 },
  { ...standard.params, targetTemperature: Number.MAX_VALUE },
  { ...standard.params, m: Number.MIN_VALUE },
  { ...standard.params, equilibriumTime: Number.MAX_VALUE, statsDuration: Number.MAX_VALUE },
];
invalidParamCandidates.forEach((params) => {
  assert.equal(validateWorkbenchParams(params).valid, false);
  assert.notEqual(
    normalizeSimulationParamsSnapshot(params),
    null,
    'the v1 structural decoder must retain legacy drafts that now need reset',
  );
  assert.equal(
    validateWorkbenchParams(sanitizeHardSphereSimulationParams(params)).valid,
    true,
    'every retained legacy draft must have a safe runnable migration projection',
  );
});
[
  { ...standard.params, m: 0 },
  { ...standard.params, k: -1 },
].forEach((params) => {
  assert.equal(validateWorkbenchParams(params).valid, false);
  assert.equal(
    normalizeSimulationParamsSnapshot(params),
    null,
    'values rejected by the v1 structural decoder are corruption, not legacy drafts',
  );
});

const invalidVisiblePanels = clone(standard) as unknown as Record<string, unknown>;
invalidVisiblePanels.visiblePanels = 'preview';
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(invalidVisiblePanels), false);

const invalidParams = clone(ideal) as unknown as Record<string, unknown>;
invalidParams.activeParams = null;
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(invalidParams), false);

const missingRequiredField = clone(standard) as unknown as Record<string, unknown>;
delete missingRequiredField.stats;
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(missingRequiredField), false);

const invalidNestedStats = clone(standard) as unknown as {
  stats: { progress: unknown };
};
invalidNestedStats.stats.progress = 'complete';
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(invalidNestedStats), false);

const invalidParticle = clone(standard) as unknown as {
  particles: Array<Record<string, unknown>>;
};
invalidParticle.particles.push({ x: 0 });
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(invalidParticle), false);

const invalidIdealPoint = clone(ideal) as unknown as {
  pointsByRelation: { pt: Array<Record<string, unknown>> };
};
invalidIdealPoint.pointsByRelation.pt.push({ id: 'corrupt-point', relation: 'pt' });
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(invalidIdealPoint), false);

const standardEngine = new PhysicsEngine(standard.appliedParams);
const standardEngineSnapshot = standardEngine.createSnapshot();
const standardWithSnapshot = {
  ...standard,
  stats: standardEngine.getStats(),
  chartData: standardEngine.getHistogramData(false),
  particles: standardEngineSnapshot.particles,
  hardSphereEngineSnapshot: standardEngineSnapshot,
};
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(standardWithSnapshot), true);
const overlappingStandardSnapshot = clone(standardWithSnapshot);
const duplicatedParticle = { ...overlappingStandardSnapshot.hardSphereEngineSnapshot!.particles[0]! };
overlappingStandardSnapshot.hardSphereEngineSnapshot!.particles[1] = duplicatedParticle;
overlappingStandardSnapshot.particles[1] = { ...duplicatedParticle };
assert.equal(
  normalizeHardSphereEngineSnapshot(overlappingStandardSnapshot.hardSphereEngineSnapshot),
  null,
  'coincident particles must be rejected before a persisted engine can be restored',
);
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(overlappingStandardSnapshot), false);
const inconsistentParticleEnergy = clone(standardWithSnapshot.hardSphereEngineSnapshot!);
inconsistentParticleEnergy.particles[0]!.energy += 1;
assert.equal(
  normalizeHardSphereEngineSnapshot(inconsistentParticleEnergy),
  null,
  'persisted particle energy must match its velocity and mass',
);
const outOfBoundsParticle = clone(standardWithSnapshot.hardSphereEngineSnapshot!);
outOfBoundsParticle.particles[0]!.x = 0;
assert.equal(
  normalizeHardSphereEngineSnapshot(outOfBoundsParticle),
  null,
  'persisted particles must stay within the hard-sphere wall bounds',
);
const oversizedSampleCollection = clone(standardWithSnapshot.hardSphereEngineSnapshot!);
oversizedSampleCollection.collectedSpeeds = Array.from({ length: 2001 }, () => 0);
assert.equal(
  normalizeHardSphereEngineSnapshot(oversizedSampleCollection),
  null,
  'persisted sample collections must respect the runtime memory bound',
);
const stalePressureCursor = clone(standardWithSnapshot.hardSphereEngineSnapshot!);
stalePressureCursor.time = 1;
assert.equal(
  normalizeHardSphereEngineSnapshot(stalePressureCursor),
  null,
  'an empty pressure history must not restore a cursor that would replay many missed windows',
);
const clockEngine = new PhysicsEngine(standard.appliedParams);
for (let index = 0; index < 5; index += 1) clockEngine.step();
clockEngine.flushPressureMeasurement();
const forgedPressureCollectionWindow = clockEngine.createSnapshot();
forgedPressureCollectionWindow.pressureHistory.at(-1)!.isCollectionWindow = true;
assert.equal(
  normalizeHardSphereEngineSnapshot(forgedPressureCollectionWindow),
  null,
  'pressure windows outside the statistics interval must not be relabeled as collected data',
);
const legacyClockSnapshot = clone(clockEngine.createSnapshot()) as unknown as Record<string, unknown>;
legacyClockSnapshot.schemaVersion = 1;
delete legacyClockSnapshot.targetMode;
assert.notEqual(
  upgradeLegacyHardSphereEngineSnapshotV1(legacyClockSnapshot),
  null,
  'a real v1 pressure cursor must remain upgradeable after strict v2 timeline validation',
);
const nonAdvancingClockSnapshot = clockEngine.createSnapshot();
nonAdvancingClockSnapshot.time = Number.MAX_SAFE_INTEGER;
nonAdvancingClockSnapshot.pressureWindowStartTime = Number.MAX_SAFE_INTEGER;
nonAdvancingClockSnapshot.pressureHistory.at(-1)!.time = Number.MAX_SAFE_INTEGER;
assert.equal(
  normalizeHardSphereEngineSnapshot(nonAdvancingClockSnapshot),
  null,
  'a persisted engine clock must remain bounded and advance by its configured time step',
);
const mismatchedStandardParams = clone(standardWithSnapshot);
mismatchedStandardParams.appliedParams = {
  ...mismatchedStandardParams.appliedParams,
  L: mismatchedStandardParams.appliedParams.L + 1,
};
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(mismatchedStandardParams),
  false,
  'standard appliedParams must match the engine snapshot params',
);
const mismatchedStandardParticles = clone(standardWithSnapshot);
mismatchedStandardParticles.particles = mismatchedStandardParticles.particles.map((particle, index) => (
  index === 0 ? { ...particle, vx: particle.vx + 1 } : particle
));
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(mismatchedStandardParticles),
  false,
  'standard top-level particles must match the engine snapshot particles',
);
const missingStandardSnapshotWithParticles = clone(standardWithSnapshot);
missingStandardSnapshotWithParticles.hardSphereEngineSnapshot = null;
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(missingStandardSnapshotWithParticles),
  false,
  'a missing standard engine snapshot must not preserve an unrelated particle projection',
);
const repairedMissingStandardSnapshot = repairMissingHardSphereEngineSnapshot(
  missingStandardSnapshotWithParticles,
);
assert.equal(
  repairedMissingStandardSnapshot.hardSphereEngineSnapshot,
  null,
  'a missing engine snapshot must not be replaced with a new random simulation',
);
assert.deepEqual(repairedMissingStandardSnapshot.particles, []);
assert.equal(repairedMissingStandardSnapshot.stats.phase, 'idle');
assert.equal(repairedMissingStandardSnapshot.runState, 'needs-reset');
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(repairedMissingStandardSnapshot),
  true,
  'legacy files with particles but no engine snapshot must clear every live projection together',
);
const mismatchedStandardStats = clone(standardWithSnapshot);
mismatchedStandardStats.stats = {
  ...mismatchedStandardStats.stats,
  temperature: mismatchedStandardStats.stats.temperature + 1,
};
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(mismatchedStandardStats),
  false,
  'standard live statistics must be derived from the engine snapshot',
);
const mismatchedStandardChart = clone(standardWithSnapshot);
mismatchedStandardChart.chartData = {
  ...mismatchedStandardChart.chartData,
  tempHistory: [{ time: 0, error: 1, totalEnergy: 1 }],
};
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(mismatchedStandardChart),
  false,
  'standard live chart data must be derived from the engine snapshot',
);

const idealEngine = new PhysicsEngine(ideal.activeParams);
const idealEngineSnapshot = idealEngine.createSnapshot();
const idealWithSnapshot = {
  ...ideal,
  stats: idealEngine.getStats(),
  chartData: idealEngine.getHistogramData(false),
  latestPressureSummary: idealEngine.getPressureMeasurementSummary(),
  particles: idealEngineSnapshot.particles,
  hardSphereEngineSnapshot: idealEngineSnapshot,
};
assert.equal(isCanonicalStandardOrIdealWorkspaceFile(idealWithSnapshot), true);
const mismatchedIdealParams = clone(idealWithSnapshot);
mismatchedIdealParams.activeParams = {
  ...mismatchedIdealParams.activeParams,
  targetTemperature: (mismatchedIdealParams.activeParams.targetTemperature ?? 1) + 0.1,
};
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(mismatchedIdealParams),
  false,
  'ideal activeParams must match the engine snapshot params',
);
const mismatchedIdealSummary = clone(idealWithSnapshot);
mismatchedIdealSummary.latestPressureSummary = {
  ...mismatchedIdealSummary.latestPressureSummary,
  latestPressure: (mismatchedIdealSummary.latestPressureSummary?.latestPressure ?? 0) + 1,
};
assert.equal(
  isCanonicalStandardOrIdealWorkspaceFile(mismatchedIdealSummary),
  false,
  'ideal pressure summaries must be derived from the engine snapshot',
);

console.log('workbenchWorkspaceFileValidation tests passed');
