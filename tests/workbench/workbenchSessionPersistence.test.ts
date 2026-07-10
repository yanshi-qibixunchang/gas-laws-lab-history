import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  captureHeatCapacityFreeRollbackSnapshot,
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  getHeatCapacityGaugePressureState,
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
  getRestorableHeatCapacityGuideSessionFileId,
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
import {
  createDefaultHeatCapacityFreePhysicsConfig,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  getHeatCapacityFreeGasTypeModelDefaults,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

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
  assert.equal('selectedHeatCapacityPanel' in restoredHeatCapacity, false);
  assert.equal(restoredHeatCapacity.heatCapacityFreeTraceVersion, HEAT_CAPACITY_FREE_TRACE_VERSION);
  assert.deepEqual(
    restoredHeatCapacity.heatCapacityFreeTraceStore.traceTrials,
    [],
    'old heat-capacity sessions should restore with an empty Free trace store',
  );
}

const guideSessionFiles = restored.files.map((file) => (
  file.kind === 'heatCapacity'
    ? { ...file, heatCapacityMode: 'guide' as const }
    : file
));
const encoded = encodeWorkbenchSession(guideSessionFiles, restored.activeFileId, restored.selectedPanel, {
  fileId: restoredHeatCapacity.id,
  strongReminderActive: true,
  strongReminderControlId: 'recordU1',
});
assert.equal(encoded.version, WORKBENCH_SESSION_VERSION);
assert.equal(encoded.files.length, 3);
assert.equal(encoded.activeFileId, ideal.id);
assert.deepEqual(encoded.heatCapacityGuideSession, {
  fileId: restoredHeatCapacity.id,
  strongReminderActive: true,
  strongReminderControlId: 'recordU1',
});
assert.equal(
  getRestorableHeatCapacityGuideSessionFileId(encoded),
  restoredHeatCapacity.id,
  'the session boundary should identify the guided file that can resume after refresh',
);

const invalidGuideSession = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files: guideSessionFiles,
  activeFileId: restored.activeFileId,
  selectedPanel: restored.selectedPanel,
  heatCapacityGuideSession: {
    fileId: standard.id,
    strongReminderActive: true,
    strongReminderControlId: 'recordU1',
  },
});
assert.equal(invalidGuideSession.heatCapacityGuideSession.fileId, null);
assert.equal(invalidGuideSession.heatCapacityGuideSession.strongReminderActive, false);
assert.equal(invalidGuideSession.heatCapacityGuideSession.strongReminderControlId, null);
assert.equal(getRestorableHeatCapacityGuideSessionFileId(invalidGuideSession), null);

const fallback = decodeWorkbenchSession({ version: 999, files: [], activeFileId: 'missing', selectedPanel: 'history' });
assert.deepEqual(
  fallback.files.map((file) => file.id),
  [],
  'invalid or unsupported session payloads should fall back to an empty workbench session',
);
assert.equal(fallback.selectedPanel, 'preview');

const envelope = encodeWorkbenchStorageEnvelope(guideSessionFiles, restored.activeFileId, restored.selectedPanel, 12345, {
  fileId: restoredHeatCapacity.id,
  strongReminderActive: true,
  strongReminderControlId: 'recordU1',
});
assert.equal(envelope.schemaFamily, WORKBENCH_SESSION_SCHEMA_FAMILY);
assert.equal(envelope.schemaVersion, WORKBENCH_SESSION_SCHEMA_VERSION);
assert.deepEqual(envelope.heatCapacityGuideSession, {
  fileId: restoredHeatCapacity.id,
  strongReminderActive: true,
  strongReminderControlId: 'recordU1',
});
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
assert.deepEqual(decodedEnvelope.session.heatCapacityGuideSession, {
  fileId: restoredHeatCapacity.id,
  strongReminderActive: true,
  strongReminderControlId: 'recordU1',
});
const decodedStandard = decodedEnvelope.session.files[0];
assert.equal(decodedStandard.kind, 'standard');
if (decodedStandard.kind === 'standard') {
  assert.equal(decodedStandard.hardSphereEngineSnapshot, null);
}

const heatReplayBaseFile = createDefaultHeatCapacityFile(8);
const heatReplayFile = {
  ...heatReplayBaseFile,
  pressureGaugeNeedleAngle: 33,
  heatCapacityFreeEquilibriumSpeedMultiplier: 8 as const,
  heatCapacityFreeEquilibriumSpeedHintShown: true,
  hardSphereViewEnabled: true,
  heatCapacityFreeRollbackSnapshots: {
    ...heatReplayBaseFile.heatCapacityFreeRollbackSnapshots,
    afterPowerOn: captureHeatCapacityFreeRollbackSnapshot(heatReplayBaseFile),
  },
};
const replayEnvelope = encodeWorkbenchStorageEnvelope([heatReplayFile], heatReplayFile.id, 'preview', 1000);
const replayDecoded = decodeWorkbenchStorageEnvelope(replayEnvelope).session;
const replayFile = replayDecoded.files[0];
assert.equal(replayFile.kind, 'heatCapacity');
if (replayFile.kind !== 'heatCapacity') throw new Error('expected heat capacity replay file');
assert.equal(
  replayFile.pressureGaugeNeedleAngle,
  getHeatCapacityGaugePressureState(
    replayFile.pressureDeltaKPa,
    replayFile.powerOn,
    replayFile,
    replayFile.pressureGaugeDisplayValue,
  ).pressureGaugeNeedleAngle,
  'restored gauge geometry should be derived from the current gauge model instead of replaying an obsolete angle',
);
assert.equal(replayFile.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.equal(replayFile.heatCapacityFreeEquilibriumSpeedHintShown, true);
assert.equal(replayFile.hardSphereViewEnabled, true);
assert.notEqual(replayFile.heatCapacityFreeRollbackSnapshots.afterPowerOn, null);
assert.ok(Array.isArray(replayFile.heatCapacityFreeRollbackSnapshots.afterPowerOn?.heatCapacityFreePhysicsState.pumpProcesses));
assert.ok(Array.isArray(replayFile.heatCapacityFreeRollbackSnapshots.afterPowerOn?.heatCapacityFreeSensorState.pressureHistory));
assert.equal('hardSphereParticleMultiplier' in replayFile, false);
assert.equal('hardSphereSpeedMultiplier' in replayFile, false);
assert.equal('hardSphereTrailsEnabled' in replayFile, false);

const malformedHeatEnvelope = structuredClone(replayEnvelope);
const malformedHeatPayload = malformedHeatEnvelope.files[0].payload as any;
malformedHeatPayload.free.real = {
  physicsConfig: [],
  physicsState: { gasAmountRatio: 0, gasTemperatureK: 'invalid', pumpProcesses: 'invalid' },
  sensorState: { pressureHistory: 'invalid', pressureReliability: 9 },
  calibrationState: { zeroEvents: 'invalid', calibrationVersion: -4 },
  trials: 'invalid',
};
malformedHeatPayload.free.uiReplay = {
  selectedHeatCapacityPanel: 'summary',
  openHeatCapacityTabs: ['bogus'],
  activeHeatCapacityTabId: 'bogus',
  heatCapacityPhase: 'bogus',
  pressureGaugeDisplayValue: 'invalid',
  pressureGaugeNeedleAngle: Number.POSITIVE_INFINITY,
  recordedPressures: { p0: 'invalid', p1: [], p2: {} },
};
const malformedHeatDecoded = decodeWorkbenchStorageEnvelope(malformedHeatEnvelope);
assert.equal(malformedHeatDecoded.session.files.length, 1, 'a malformed persisted Free domain should fall back without dropping the experiment');
const malformedHeatFile = malformedHeatDecoded.session.files[0];
assert.equal(malformedHeatFile.kind, 'heatCapacity');
if (malformedHeatFile.kind !== 'heatCapacity') throw new Error('expected normalized malformed heat-capacity file');
assert.equal(malformedHeatFile.heatCapacityFreeRealDomain.scheme, 'real');
assert.ok(Array.isArray(malformedHeatFile.heatCapacityFreeRealDomain.trials));
assert.ok(malformedHeatFile.heatCapacityFreeRealDomain.physicsState.gasAmountRatio > 0);
assert.ok(Number.isFinite(malformedHeatFile.heatCapacityFreeRealDomain.physicsState.gasTemperatureK));
assert.ok(Array.isArray(malformedHeatFile.heatCapacityFreeRealDomain.physicsState.pumpProcesses));
assert.ok(Array.isArray(malformedHeatFile.heatCapacityFreeRealDomain.sensorState.pressureHistory));
assert.ok(malformedHeatFile.heatCapacityFreeRealDomain.sensorState.pressureReliability <= 1);
assert.ok(Array.isArray(malformedHeatFile.heatCapacityFreeRealDomain.calibrationState.zeroEvents));
assert.ok(malformedHeatFile.heatCapacityFreeRealDomain.calibrationState.calibrationVersion >= 0);
assert.equal('selectedHeatCapacityPanel' in malformedHeatFile, false);
assert.deepEqual(malformedHeatFile.openHeatCapacityTabs, []);
assert.equal(malformedHeatFile.activeHeatCapacityTabId, null);
assert.equal(malformedHeatFile.heatCapacityPhase, 'powerOff');
assert.ok(Number.isFinite(malformedHeatFile.pressureGaugeDisplayValue));
assert.ok(Number.isFinite(malformedHeatFile.pressureGaugeNeedleAngle));
assert.deepEqual(
  malformedHeatFile.recordedPressures,
  createDefaultHeatCapacityFile(1).recordedPressures,
  'invalid recorded-pressure replay values should fall back field by field',
);

const isolatedInvalidFileEnvelope = structuredClone(envelope);
isolatedInvalidFileEnvelope.files[1].payload = {};
const isolatedInvalidFileDecoded = decodeWorkbenchStorageEnvelope(isolatedInvalidFileEnvelope);
assert.equal(
  isolatedInvalidFileDecoded.session.files.length,
  envelope.files.length - 1,
  'one invalid experiment file should not discard the other files in the session',
);
assert.equal(
  isolatedInvalidFileDecoded.diagnostics.some((entry) => entry.code === 'invalid-file' && entry.fileId === envelope.files[1].id),
  true,
  'an isolated file restore failure should produce a file-specific diagnostic',
);

const closedEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([heatReplayFile], 1001);
assert.equal(closedEnvelope.schemaFamily, WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY);
assert.equal(closedEnvelope.schemaVersion, WORKBENCH_CLOSED_FILES_SCHEMA_VERSION);
const closedDecoded = decodeWorkbenchClosedFilesStorageEnvelope(closedEnvelope);
assert.equal(closedDecoded.handled, true);
assert.equal(closedDecoded.files.length, 1);
assert.equal(closedDecoded.files[0].id, heatReplayFile.id);

const currentActiveRunSnapshot = createDefaultFreeConfigSnapshot();
currentActiveRunSnapshot.environment.ambientPressureKPa = 99.2;
currentActiveRunSnapshot.record.pressureDangerMv = 152;
const customFreeSessionFile = {
  ...createDefaultHeatCapacityFile(9),
  heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  heatCapacityFreeExperimentGroupStatus: 'running' as const,
  heatCapacityFreeFileAcknowledgements: {
    advancedParametersRisk: true,
    idealParameterProfileIntro: true,
  },
  heatCapacityFreeInstrumentNoiseEnabled: false,
  heatCapacityFreePressureWarningMv: 123,
  heatCapacityFreeActiveRunConfigSnapshot: currentActiveRunSnapshot,
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
assert.deepEqual(customFreeFile.heatCapacityFreeFileAcknowledgements, {
  advancedParametersRisk: true,
  idealParameterProfileIntro: true,
});
assert.equal(customFreeFile.heatCapacityFreeInstrumentNoiseEnabled, false);
assert.equal(customFreeFile.heatCapacityFreePressureWarningMv, 123);
assert.equal(customFreeFile.heatCapacityFreeRecordConfig.pressureDangerMv, 152);
assert.equal(customFreeFile.heatCapacityFreeParameterDraft.ambientPressureKPa, 99.2);
assert.equal(customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.version, 7);
assert.equal(
  customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.environment.ambientPressureKPa,
  99.2,
);
assert.equal(customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.record.pressureDangerMv, 152);

const airModelDefaults = getHeatCapacityFreeGasTypeModelDefaults('air');
const realPhysicsDefaults = createDefaultHeatCapacityFreePhysicsConfig();
const contaminatedSessionPhysicsConfig = {
  ...heatCapacity.heatCapacityFreePhysicsConfig,
  thermal: {
    ...heatCapacity.heatCapacityFreePhysicsConfig.thermal,
    gasWallConductanceWPerK: 5,
    wallAmbientConductanceWPerK: 5,
  },
  pumpValveExchange: {
    ...heatCapacity.heatCapacityFreePhysicsConfig.pumpValveExchange!,
    enabled: false,
    gasExchangeRatePerS: 0,
    thermalConductanceWPerK: 0,
  },
  environmentDisturbance: {
    ...heatCapacity.heatCapacityFreePhysicsConfig.environmentDisturbance!,
    enabled: false,
    pressureAmplitudeKPa: 0,
    temperatureAmplitudeK: 0,
  },
  leakage: {
    enabled: false,
    ratePerS: 0,
  },
};
const contaminatedDomainSessionFile = {
  ...heatCapacity,
  heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
  heatCapacityFreeParameterScheme: 'stale-real' as any,
  heatCapacityFreeDisplayScheme: 'stale-ideal' as any,
  heatCapacityFreePhysicsConfig: contaminatedSessionPhysicsConfig,
  heatCapacityFreeParameterDraft: {
    ...heatCapacity.heatCapacityFreeParameterDraft,
    gasType: 'air',
    gasWallConductanceWPerK: 5,
    wallAmbientConductanceWPerK: 5,
    leakageEnabled: false,
    leakageRatePerS: 0,
  },
  heatCapacityFreeTrials: [
    createHeatCapacityFreeTrial('session-top-level-domain-trial', null, 'ideal'),
  ],
  heatCapacityFreeTraceStore: {
    activeTraceTrialId: 'session-contaminated-trace',
    nextTraceTrialIndex: 2,
    traceTrials: [
      {
        id: 'session-contaminated-trace',
        linkedTrialId: 'session-top-level-domain-trial',
        status: 'active',
        activeBranchId: 'session-contaminated-branch',
        nextBranchIndex: 2,
        branches: [
          {
            id: 'session-contaminated-branch',
            parentBranchId: null,
            createdByEventId: null,
            status: 'main',
            hiddenInDefaultChart: false,
            nextSampleIndex: 1,
            nextEventIndex: 1,
            nextSampleAtS: null,
            lastKeptSampleId: null,
            idleState: {
              lastUserActionAtS: null,
              dormantSinceS: null,
              lastHeartbeatAtS: null,
            },
            samples: [],
            events: [],
          },
        ],
        configSnapshot: {
          ...createDefaultFreeConfigSnapshot(),
          version: 999,
          record: {
            ...createDefaultFreeConfigSnapshot().record,
            u0ZeroToleranceMv: 'bad',
          },
        },
      },
    ],
  },
  heatCapacityFreeRealDomain: {
    ...heatCapacity.heatCapacityFreeRealDomain,
    scheme: 'ideal' as any,
    physicsConfig: contaminatedSessionPhysicsConfig,
    traceStore: {
      activeTraceTrialId: 'session-contaminated-trace',
      nextTraceTrialIndex: 2,
      traceTrials: [
        {
          id: 'session-contaminated-trace',
          linkedTrialId: 'session-real-domain-trial',
          status: 'active',
          activeBranchId: 'session-contaminated-branch',
          nextBranchIndex: 2,
          branches: [
            {
              id: 'session-contaminated-branch',
              parentBranchId: null,
              createdByEventId: null,
              status: 'main',
              hiddenInDefaultChart: false,
              nextSampleIndex: 1,
              nextEventIndex: 1,
              nextSampleAtS: null,
              lastKeptSampleId: null,
              idleState: {
                lastUserActionAtS: null,
                dormantSinceS: null,
                lastHeartbeatAtS: null,
              },
              samples: [],
              events: [],
            },
          ],
          configSnapshot: {
            ...createDefaultFreeConfigSnapshot(),
            version: 999,
            record: {
              ...createDefaultFreeConfigSnapshot().record,
              u0ZeroToleranceMv: 'bad',
            },
          },
        },
      ],
    },
    trials: [
      createHeatCapacityFreeTrial('session-real-domain-trial', null, 'ideal'),
    ],
  },
  heatCapacityFreeIdealDomain: {
    ...heatCapacity.heatCapacityFreeIdealDomain,
    scheme: 'real' as any,
    trials: [
      createHeatCapacityFreeTrial('session-ideal-domain-trial', null, 'real'),
    ],
  },
};
const contaminatedDomainSessionRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: contaminatedDomainSessionFile.id,
  selectedPanel: 'preview',
  files: [contaminatedDomainSessionFile],
});
const contaminatedDomainFile = contaminatedDomainSessionRestored.files[0];
assert.equal(contaminatedDomainFile.kind, 'heatCapacity');
if (contaminatedDomainFile.kind !== 'heatCapacity') throw new Error('expected heat capacity contaminated domain file');
assert.equal(
  contaminatedDomainFile.heatCapacityFreeParameterScheme,
  'real',
  'raw heat-capacity sessions should normalize an invalid active parameter scheme to real',
);
assert.equal(
  contaminatedDomainFile.heatCapacityFreeDisplayScheme,
  'real',
  'raw heat-capacity sessions should normalize an invalid display scheme to the active scheme',
);
assert.equal(contaminatedDomainFile.heatCapacityFreeRealDomain.scheme, 'real');
assert.equal(contaminatedDomainFile.heatCapacityFreeIdealDomain.scheme, 'ideal');
assert.equal(contaminatedDomainFile.heatCapacityFreeRealDomain.trials[0]?.parameterScheme, 'real');
assert.equal(contaminatedDomainFile.heatCapacityFreeIdealDomain.trials[0]?.parameterScheme, 'ideal');
assert.equal(contaminatedDomainFile.heatCapacityFreeTrials[0]?.parameterScheme, 'real');
assert.equal(
  contaminatedDomainFile.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
  'raw session restore should not keep ideal thermal settings in the active real runtime',
);
assert.equal(
  contaminatedDomainFile.heatCapacityFreePhysicsConfig.thermal.wallAmbientConductanceWPerK,
  realPhysicsDefaults.thermal.wallAmbientConductanceWPerK,
);
assert.equal(contaminatedDomainFile.heatCapacityFreePhysicsConfig.leakage.enabled, true);
assert.equal(
  contaminatedDomainFile.heatCapacityFreePhysicsConfig.leakage.ratePerS,
  airModelDefaults.leakageRatePerS,
);
assert.equal(contaminatedDomainFile.heatCapacityFreeTraceStore.traceTrials.length, 1);
assert.equal(
  contaminatedDomainFile.heatCapacityFreeTraceStore.traceTrials[0]?.configSnapshot.version,
  createDefaultFreeConfigSnapshot().version,
  'raw session trace trial snapshots should use the current normalized config snapshot version',
);
assert.equal(
  contaminatedDomainFile.heatCapacityFreeTraceStore.traceTrials[0]?.configSnapshot.record.u0ZeroToleranceMv,
  createDefaultFreeConfigSnapshot().record.u0ZeroToleranceMv,
  'raw session trace trial snapshots should normalize contaminated record fields',
);

const legacyHeatSessionFile = {
  ...createDefaultHeatCapacityFile(10),
  heatCapacityFreeRuntimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  heatCapacityFreeFileAcknowledgements: {
    advancedParametersRisk: 'false',
    idealParameterProfileIntro: true,
    staleNoticeKey: true,
  },
};
delete (legacyHeatSessionFile as Partial<typeof legacyHeatSessionFile>).heatCapacityLessonIntroAutoShown;
const legacyHeatRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: legacyHeatSessionFile.id,
  selectedPanel: 'preview',
  files: [legacyHeatSessionFile],
});
const legacyHeatFile = legacyHeatRestored.files[0];
assert.equal(legacyHeatFile.kind, 'heatCapacity');
if (legacyHeatFile.kind !== 'heatCapacity') throw new Error('expected legacy heat-capacity session file');
assert.equal(
  legacyHeatFile.heatCapacityLessonIntroAutoShown,
  true,
  'legacy raw heat-capacity sessions missing the intro flag should restore as already shown',
);
assert.deepEqual(
  legacyHeatFile.heatCapacityFreeFileAcknowledgements,
  {
    advancedParametersRisk: false,
    idealParameterProfileIntro: true,
  },
  'Free file acknowledgements restored from raw sessions should accept only known strict boolean keys',
);
assert.equal(
  'staleNoticeKey' in legacyHeatFile.heatCapacityFreeFileAcknowledgements,
  false,
  'unknown acknowledgement keys should not survive raw session normalization',
);

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
const heatCapacitySessionRestoreSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacitySessionRestore.ts'),
  'utf8',
);
assert.match(sessionSource, /decodeWorkbenchStorageEnvelope/);
assert.match(sessionSource, /encodeWorkbenchStorageEnvelope/);
assert.match(sessionSource, /decodeWorkbenchClosedFilesStorageEnvelope/);
assert.match(sessionSource, /encodeWorkbenchClosedFilesStorageEnvelope/);
assert.match(sessionSource, /normalizeHeatCapacitySessionRuntimeState/);
assert.doesNotMatch(sessionSource, /normalizeHeatCapacityFreeRestoreTraceStore/);
assert.doesNotMatch(sessionSource, /createDefaultHeatCapacityFreeRuntimeFields/);
assert.match(
  heatCapacitySessionRestoreSource,
  /export const normalizeHeatCapacitySessionRuntimeState/,
);

console.log('workbenchSessionPersistence tests passed');
