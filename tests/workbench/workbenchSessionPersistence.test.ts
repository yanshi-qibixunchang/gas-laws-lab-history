import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  createDefaultFreeConfigSnapshot,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
  encodeWorkbenchSession,
} from '../../src/features/workbench/workbenchSession.ts';
import {
  WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  decodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchStorageEnvelope,
  encodeWorkbenchClosedFilesStorageEnvelope,
  encodeWorkbenchStorageEnvelope,
} from '../../src/features/workbench/workbenchPersistenceMigration.ts';
import {
  STANDARD_SIMULATION_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchStandardPersistence.ts';
import {
  IDEAL_GAS_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchIdealGasPersistence.ts';

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
const savedLegacyCompleteFreeTrial = {
  ...createHeatCapacityFreeTrial('free-session-complete-legacy'),
  u0: {
    atS: 1,
    displayPressureMv: 0,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  },
  u1: {
    atS: 10,
    displayPressureMv: 112,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  },
  u2: {
    atS: 20,
    displayPressureMv: 32,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  },
  correctedSignals: {
    U0DisplayMv: 0,
    U1DisplayMv: 112,
    U2DisplayMv: 32,
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
      visiblePanels: ['preview', 'realtime', 'heatCapacityGuide', 'heatCapacityReview'] as WorkbenchPanelKey[],
      selectedHeatCapacityPanel: 'heatCapacityReview',
      openHeatCapacityTabs: ['guide', 'review'],
      activeHeatCapacityTabId: 'review',
      heatCapacityFreeRuntimeVersion: 0,
      heatCapacityFreeTrials: [savedAutomaticOnlyFreeTrial, savedLegacyCompleteFreeTrial],
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
assert.equal(restored.files[0].kind, 'standard');
if (restored.files[0].kind === 'standard') {
  assert.equal(restored.files[0].hardSphereEngineSnapshot, null, 'legacy standard sessions should normalize missing engine snapshots to null');
}

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
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials.length, 2, 'stale Free runtime normalization must preserve Free trials');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].automaticU0?.zeroEventId, 'zero-1');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].u0, null, 'automatic-only saved Free trials must not be promoted to official manual U0 records');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].correctedSignals, null, 'automatic-only saved Free trials must normalize as incomplete official records');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[1].correctedSignals?.calculationVersion, 'log-pressure-v1');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[1].correctedSignals?.atmosphericPressureKPa, 101.3);
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[1].correctedSignals?.pressureSensitivityMvPerKPa, 20);
  assert.equal(
    calculateFreeHeatCapacityMeanResult([restoredHeatCapacity.heatCapacityFreeTrials[0]]).validTrialCount,
    0,
    'automatic-only saved Free trials must not count as complete official Free trials',
  );
  assert.equal(restoredHeatCapacity.heatCapacityMode, 'free');
  assert.deepEqual(restoredHeatCapacity.openHeatCapacityTabs, ['guide', 'review']);
  assert.equal(restoredHeatCapacity.activeHeatCapacityTabId, 'review');
  assert.equal(restoredHeatCapacity.selectedHeatCapacityPanel, 'heatCapacityReview');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTraceVersion, HEAT_CAPACITY_FREE_TRACE_VERSION);
  assert.deepEqual(
    restoredHeatCapacity.heatCapacityFreeTraceStore.traceTrials,
    [],
    'old heat-capacity sessions should restore with an empty Free trace store',
  );
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

const envelope = encodeWorkbenchStorageEnvelope(restored.files, restored.activeFileId, restored.selectedPanel, 12345);
assert.equal(envelope.schemaFamily, WORKBENCH_SESSION_SCHEMA_FAMILY);
assert.equal(envelope.schemaVersion, WORKBENCH_SESSION_SCHEMA_VERSION);
assert.equal(envelope.files.length, restored.files.length);
assert.equal(envelope.files[0].payload.experimentKind, 'standard');
assert.equal(envelope.files[0].payload.standardSchemaVersion, STANDARD_SIMULATION_SCHEMA_VERSION);
assert.equal('runtimeState' in envelope.files[0].payload, false, 'standard files should use the dedicated schema payload');
assert.equal(envelope.files[1].payload.experimentKind, 'ideal');
assert.equal(envelope.files[1].payload.idealGasSchemaVersion, IDEAL_GAS_SCHEMA_VERSION);
assert.equal('runtimeState' in envelope.files[1].payload, false, 'ideal files should use the dedicated schema payload');
assert.equal(envelope.files[2].payload.experimentKind, 'heatCapacity');
const decodedEnvelope = decodeWorkbenchStorageEnvelope(envelope);
assert.equal(decodedEnvelope.handled, true);
assert.equal(decodedEnvelope.readonly, false);
assert.deepEqual(decodedEnvelope.diagnostics.filter((entry) => entry.level === 'error'), []);
assert.equal(decodedEnvelope.session.files.length, restored.files.length);
assert.equal(decodedEnvelope.session.activeFileId, restored.activeFileId);
const decodedStandard = decodedEnvelope.session.files[0];
assert.equal(decodedStandard.kind, 'standard');
if (decodedStandard.kind === 'standard') {
  assert.equal(decodedStandard.hardSphereEngineSnapshot, null);
}

const heatReplayFile = {
  ...createDefaultHeatCapacityFile(8),
  pressureGaugeNeedleAngle: 33,
  heatCapacityFreeEquilibriumSpeedMultiplier: 8 as const,
  heatCapacityFreeEquilibriumSpeedHintShown: true,
  hardSphereViewEnabled: true,
  hardSphereParticleMultiplier: 1.2,
  hardSphereSpeedMultiplier: 1.1,
  hardSphereTrailsEnabled: true,
};
const replayEnvelope = encodeWorkbenchStorageEnvelope([heatReplayFile], heatReplayFile.id, 'preview', 1000);
const replayDecoded = decodeWorkbenchStorageEnvelope(replayEnvelope).session;
const replayFile = replayDecoded.files[0];
assert.equal(replayFile.kind, 'heatCapacity');
if (replayFile.kind !== 'heatCapacity') throw new Error('expected heat capacity replay file');
assert.equal(replayFile.pressureGaugeNeedleAngle, 33);
assert.equal(replayFile.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.equal(replayFile.heatCapacityFreeEquilibriumSpeedHintShown, true);
assert.equal(replayFile.hardSphereViewEnabled, true);
assert.equal(replayFile.hardSphereParticleMultiplier, 1.2);
assert.equal(replayFile.hardSphereSpeedMultiplier, 1.1);
assert.equal(replayFile.hardSphereTrailsEnabled, true);

const closedEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([heatReplayFile], 1001);
assert.equal(closedEnvelope.schemaFamily, WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY);
assert.equal(closedEnvelope.schemaVersion, WORKBENCH_CLOSED_FILES_SCHEMA_VERSION);
const closedDecoded = decodeWorkbenchClosedFilesStorageEnvelope(closedEnvelope);
assert.equal(closedDecoded.handled, true);
assert.equal(closedDecoded.files.length, 1);
assert.equal(closedDecoded.files[0].id, heatReplayFile.id);

const legacySnapshotWithoutU0 = createDefaultFreeConfigSnapshot();
legacySnapshotWithoutU0.version = 4 as never;
delete (legacySnapshotWithoutU0.record as Partial<typeof legacySnapshotWithoutU0.record>).u0ZeroToleranceMv;
const customFreeSessionFile = {
  ...createDefaultHeatCapacityFile(9),
  heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  heatCapacityFreeExperimentGroupStatus: 'running' as const,
  heatCapacityFreeAdvancedRiskAccepted: true,
  heatCapacityFreeInstrumentNoiseEnabled: false,
  heatCapacityFreePressureWarningMv: 123,
  heatCapacityFreeActiveRunConfigSnapshot: legacySnapshotWithoutU0,
  heatCapacityFreeRecordConfig: {
    ...heatCapacity.heatCapacityFreeRecordConfig,
    pressureDangerMv: 152,
  },
  heatCapacityFreeParameterDraft: {
    ...heatCapacity.heatCapacityFreeParameterDraft,
    ambientPressureKPa: 99.2,
    instrumentNoiseEnabled: false,
    pressureWarningMv: 123,
    pressureDangerMv: 152,
  },
};
const customFreeRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: customFreeSessionFile.id,
  selectedPanel: 'preview',
  files: [customFreeSessionFile],
});
const customFreeFile = customFreeRestored.files[0];
assert.equal(customFreeFile.kind, 'heatCapacity');
if (customFreeFile.kind !== 'heatCapacity') throw new Error('expected heat capacity custom session file');
assert.equal(customFreeFile.heatCapacityFreeExperimentGroupStatus, 'running');
assert.equal(customFreeFile.heatCapacityFreeAdvancedRiskAccepted, true);
assert.equal(customFreeFile.heatCapacityFreeInstrumentNoiseEnabled, false);
assert.equal(customFreeFile.heatCapacityFreePressureWarningMv, 123);
assert.equal(customFreeFile.heatCapacityFreeRecordConfig.pressureDangerMv, 152);
assert.equal(customFreeFile.heatCapacityFreeParameterDraft.ambientPressureKPa, 99.2);
assert.equal(customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.version, 6);
assert.equal(
  customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.physics.releaseVisualMainDurationS,
  0.18,
);
assert.equal(customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.record.u0ZeroToleranceMv, 0.12);

const futureEnvelope = {
  ...envelope,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION + 1,
};
const futureDecoded = decodeWorkbenchStorageEnvelope(futureEnvelope);
assert.equal(futureDecoded.handled, true);
assert.equal(futureDecoded.readonly, false);
assert.equal(futureDecoded.session.files.length, 0);
assert.equal(
  futureDecoded.diagnostics.some((entry) => entry.code === 'unsupported-future-version'),
  true,
);

const sessionSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'workbenchSession.ts'),
  'utf8',
);
assert.match(sessionSource, /decodeWorkbenchStorageEnvelope/);
assert.match(sessionSource, /encodeWorkbenchStorageEnvelope/);
assert.match(sessionSource, /decodeWorkbenchClosedFilesStorageEnvelope/);
assert.match(sessionSource, /encodeWorkbenchClosedFilesStorageEnvelope/);

console.log('workbenchSessionPersistence tests passed');

