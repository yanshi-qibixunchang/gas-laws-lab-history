import assert from 'node:assert/strict';
import {
  acknowledgeHeatCapacityFreeFileNoticeWorkbenchState,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  captureHeatCapacityFreeRollbackSnapshot,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  createDefaultHeatCapacityFile,
  getHeatCapacityFreeTrialsForAverage,
  recordHeatCapacityFreeTraceEvent,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createDefaultHeatCapacityFreePhysicsConfig,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  getHeatCapacityFreeGasTypeModelDefaults,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityFreeStandardReference,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  createHeatCapacityPersistencePayload,
  getHeatCapacityPersistenceReplayFields,
  restoreHeatCapacityFileFromPersistencePayload,
  validateHeatCapacityPersistencePayload,
} from '../../src/features/workbench/workbenchHeatCapacityPersistence.ts';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  type WorkbenchExperimentFileEnvelopeV1,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const file = createDefaultHeatCapacityFile(1);
const payload = createHeatCapacityPersistencePayload(file, 12345);

assert.equal(payload.experimentKind, 'heatCapacity');
assert.equal(payload.heatCapacitySchemaVersion, 1);
assert.equal(payload.mode, 'free');
assert.equal(file.heatCapacityLessonIntroAutoShown, false);
assert.equal(payload.common.lessonIntroAutoShown, false);
assert.equal(payload.free?.runtimeVersion, file.heatCapacityFreeRuntimeVersion);
assert.equal(payload.free?.traceVersion, file.heatCapacityFreeTraceVersion);
assert.equal(payload.free?.parameterScheme, 'real');
assert.equal(payload.free?.displayScheme, 'real');
assert.equal(payload.free?.real?.scheme, 'real');
assert.equal(payload.free?.ideal?.scheme, 'ideal');
assert.equal(payload.free?.real?.trials.length, 0);
assert.equal(payload.free?.ideal?.trials.length, 0);
assert.equal(payload.free?.gasType, 'air');
assert.equal(payload.free?.config.version, 7);
assert.equal(payload.free?.parameterDraft?.ambientPressureKPa, 101.3);
assert.equal(payload.free?.parameterDraft?.gasType, 'air');
assert.equal(payload.free?.recordConfig?.u0ZeroToleranceMv, 0.12);
assert.equal(payload.free?.pressureWarningMv, 120);
assert.equal(payload.free?.instrumentNoiseEnabled, true);
assert.deepEqual(payload.free?.acknowledgements, {
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});
assert.equal('advancedRiskAccepted' in (payload.free ?? {}), false);
assert.equal(payload.free?.config.physics.pumpAmountGainRatio, 0.00345);
assert.equal('pumpInflowTemperatureRiseK' in payload.free!.config.physics, false);
assert.equal(payload.free?.config.physics.pumpStrokeDurationS, 0.08);
assert.equal(payload.free?.config.physics.releaseVisualMainDurationS, 0.18);
assert.equal('releaseMainDurationS' in payload.free!.config.physics, false);
assert.equal('chamberTemperatureRiseK' in payload.free!.config.physics.pumpValveExchange!, false);
assert.equal(payload.free?.config.sensor.pumpLagRate, 36);
assert.equal(payload.free?.config.sensor.fastProcessSampleStepS, 0.04);
assert.equal(payload.free?.config.scoring.processScoringVersion, 'free-process-score-v1');
assert.equal(payload.free?.config.record.u0ZeroToleranceMv, 0.12);
assert.equal(payload.free?.runtime.gasAmountRatio, 1);
assert.equal(payload.free?.controls.powerOn, false);
assert.equal(payload.free?.controls.stopcockFlowOpen, false);
assert.equal(payload.free?.controls.stopcockFlowPurpose, 'none');
assert.equal(payload.free?.uiReplay.heatCapacityMaterialsExpanded, true);
assert.equal(payload.free?.uiReplay.pressureGaugeNeedleAngle, file.pressureGaugeNeedleAngle);
assert.equal(payload.free?.uiReplay.stopcockAngleDeg, file.stopcockAngleDeg);
assert.equal(payload.free?.uiReplay.hardSphereViewEnabled, file.hardSphereViewEnabled);
assert.equal(payload.free?.uiReplay.heatCapacityFreeStopcockFlowPurpose, 'none');
assert.equal('references' in payload.free!, false);

const acknowledgedIntroPayload = createHeatCapacityPersistencePayload({
  ...file,
  heatCapacityLessonIntroAutoShown: true,
}, 12346);
assert.equal(acknowledgedIntroPayload.common.lessonIntroAutoShown, true);

const replay = getHeatCapacityPersistenceReplayFields(payload);
assert.equal(replay.pressureGaugeNeedleAngle, file.pressureGaugeNeedleAngle);
assert.equal(replay.heatCapacityFreeEquilibriumSpeedMultiplier, 8);

const validation = validateHeatCapacityPersistencePayload(payload);
assert.deepEqual(validation.errors, []);
assert.equal(validation.valid, true);

const invalid = validateHeatCapacityPersistencePayload({
  ...payload,
  free: {
    ...payload.free!,
    runtime: {
      ...payload.free!.runtime,
      gasAmountRatio: 0,
    },
  },
});
assert.equal(invalid.valid, false);
assert.equal(invalid.errors.includes('free.runtime.gasAmountRatio must be > 0'), true);

const missingCurrentParameterPayload = validateHeatCapacityPersistencePayload({
  ...payload,
  free: {
    ...payload.free!,
    parameterDraft: undefined,
  },
});
assert.equal(missingCurrentParameterPayload.valid, false);
assert.equal(missingCurrentParameterPayload.errors.includes('free.parameterDraft is required'), true);

const tracedFile = recordHeatCapacityFreeTraceEvent({
  ...file,
  powerOn: true,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  glassPistonState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  heatCapacityFreeStopcockFlowOpen: true,
}, 'pump-stroke', 123);
const tracedTrial = tracedFile.heatCapacityFreeTraceStore.traceTrials[0];
const tracedSample = tracedTrial.branches[0].samples[0];
assert.equal(tracedSample.controls.stopcockOpen, true);
assert.equal(tracedSample.controls.stopcockFlowOpen, true);
assert.equal(tracedSample.controls.pumpBulbState, 'compressing');

const recordedTrial = {
  ...createHeatCapacityFreeTrial('trial-1'),
  traceTrialId: 'free-trace-trial-1',
  branchCount: 1,
  completedAtMs: 12_345,
  u0: normalizeHeatCapacityFreeRecordInput({
    atS: 1,
    displayPressureMv: 0.12,
    displayTemperatureMv: 1499.01,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    phaseAtRecord: 'readyToZero',
    traceTrialId: 'free-trace-trial-1',
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-1',
    eventId: 'event-1',
  }),
  u1: normalizeHeatCapacityFreeRecordInput({
    atS: 12,
    displayPressureMv: 119.8,
    displayTemperatureMv: 1499.2,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    phaseAtRecord: 'sealedStabilizing',
    traceTrialId: 'free-trace-trial-1',
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-2',
    eventId: 'event-2',
  }),
  u2: normalizeHeatCapacityFreeRecordInput({
    atS: 20,
    displayPressureMv: 35.4,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    phaseAtRecord: 'recovering',
    traceTrialId: 'free-trace-trial-1',
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-3',
    eventId: 'event-3',
  }),
  correctedSignals: {
    calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
    atmosphericPressureKPa: 101.3,
    pressureSensitivityMvPerKPa: 20,
    U0DisplayMv: 0.12,
    U1DisplayMv: 119.8,
    U2DisplayMv: 35.4,
    U1CorrectedMv: 119.68,
    U2CorrectedMv: 35.28,
    gamma: 1.39,
  },
};
const recordedPayload = createHeatCapacityPersistencePayload({
  ...file,
  heatCapacityFreeTrials: [recordedTrial],
}, 555);
assert.equal(recordedPayload.free?.trials[0].u1?.displayPressureMv, 119.8);
assert.equal(recordedPayload.free?.trials[0].correctedSignals?.gamma, 1.39);
assert.equal(recordedPayload.free?.trials[0].completedAtMs, 12_345);
assert.equal(recordedPayload.free?.trials[0].parameterScheme, 'real');
assert.equal(recordedPayload.free?.real?.trials[0].parameterScheme, 'real');
const recordedPayloadRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-recorded-trial-restore',
  kind: 'heatCapacity',
  name: 'Recorded Trial Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: recordedPayload as unknown as Record<string, unknown>,
}, recordedPayload, 2);
assert.equal(recordedPayloadRestored.heatCapacityFreeTrials[0].completedAtMs, 12_345);
assert.equal(recordedPayloadRestored.heatCapacityFreeTrials[0].parameterScheme, 'real');

const standardReferenceFixture = createCompleteProcessReviewFixtureParts();
const contaminatedStandardReference = createHeatCapacityFreeStandardReference({
  traceTrial: standardReferenceFixture.traceTrial,
  trial: standardReferenceFixture.trial,
  theoreticalGamma: 1.4,
});
contaminatedStandardReference.configSnapshot.physics.thermal.gasWallConductanceWPerK = 5;
contaminatedStandardReference.configSnapshot.physics.thermal.wallAmbientConductanceWPerK = 5;
contaminatedStandardReference.summary.gamma = 1.154;
contaminatedStandardReference.operationUpperBound.gamma = 1.154;
const contaminatedSnapshotPayload = structuredClone(recordedPayload);
contaminatedSnapshotPayload.free!.trials[0].standardReferenceSnapshot = contaminatedStandardReference;
contaminatedSnapshotPayload.free!.real.trials[0].standardReferenceSnapshot = contaminatedStandardReference;
const contaminatedSnapshotRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-contaminated-standard-reference-restore',
  kind: 'heatCapacity',
  name: 'Contaminated Standard Reference Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: contaminatedSnapshotPayload as unknown as Record<string, unknown>,
}, contaminatedSnapshotPayload, 8);
assert.equal(
  contaminatedSnapshotRestored.heatCapacityFreeTrials[0].standardReferenceSnapshot,
  null,
  'restoring Free Mode trials should drop standard reference snapshots generated from contaminated ideal thermal parameters',
);

const idealPersistedTrial = createHeatCapacityFreeTrial('ideal-persisted-trial', null, 'ideal');
const idealPersistedFile = {
  ...setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'ideal', 556),
  heatCapacityFreeTrials: [idealPersistedTrial],
};
const idealPersistedPayload = createHeatCapacityPersistencePayload(idealPersistedFile, 557);
assert.equal(idealPersistedPayload.free?.parameterScheme, 'ideal');
assert.equal(idealPersistedPayload.free?.trials[0].parameterScheme, 'ideal');
assert.equal(idealPersistedPayload.free?.ideal?.trials[0].parameterScheme, 'ideal');
const idealPersistedRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-ideal-trial-restore',
  kind: 'heatCapacity',
  name: 'Ideal Trial Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: idealPersistedPayload as unknown as Record<string, unknown>,
}, idealPersistedPayload, 2);
assert.equal(idealPersistedRestored.heatCapacityFreeTrials[0].parameterScheme, 'ideal');
assert.deepEqual(
  getHeatCapacityFreeTrialsForAverage(idealPersistedRestored),
  [],
  'ideal-domain trials restored from disk should not enter the real Free Mode average',
);

const rollbackSnapshotFile = {
  ...file,
  powerOn: true,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
  heatCapacityFreeRollbackSnapshots: {
    ...file.heatCapacityFreeRollbackSnapshots,
    beforePump: captureHeatCapacityFreeRollbackSnapshot({
      ...file,
      powerOn: true,
      pumpValveOpen: true,
      pumpValveState: 'open',
    }),
  },
};
const rollbackSnapshotPayload = createHeatCapacityPersistencePayload(rollbackSnapshotFile, 777);
assert.equal(rollbackSnapshotPayload.free?.rollbackSnapshots.beforePump?.powerOn, true);
assert.equal(rollbackSnapshotPayload.free?.rollbackSnapshots.beforePump?.pumpValveOpen, true);
const rollbackSnapshotRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-rollback-restore',
  kind: 'heatCapacity',
  name: 'Rollback Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: rollbackSnapshotPayload as unknown as Record<string, unknown>,
}, rollbackSnapshotPayload, 2);
assert.equal(rollbackSnapshotRestored.heatCapacityFreeRollbackSnapshots.beforePump?.pumpValveOpen, true);
assert.equal(rollbackSnapshotRestored.heatCapacityFreeRollbackSnapshots.beforePump?.powerOn, true);

const editedFile = applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
  ...file.heatCapacityFreeParameterDraft,
  gasType: 'helium',
  ambientPressureKPa: 99.4,
  ambientTemperatureK: 300.2,
  leakageEnabled: true,
  leakageRatePerS: 0.0017,
  instrumentNoiseEnabled: false,
  noiseMv: 0.066,
  pressureWarningMv: 121,
  pressureDangerMv: 151,
});
const acceptedRiskFile = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(editedFile, 'advancedParametersRisk'),
  'idealParameterProfileIntro',
);
const editedPayload = createHeatCapacityPersistencePayload(acceptedRiskFile, 999);
assert.equal(editedPayload.free?.gasType, 'helium');
assert.equal(editedPayload.free?.parameterDraft?.ambientPressureKPa, 99.4);
assert.equal(editedPayload.free?.parameterDraft?.gasType, 'helium');
assert.equal(editedPayload.free?.recordConfig?.pressureDangerMv, 151);
assert.equal(editedPayload.free?.pressureWarningMv, 121);
assert.equal(editedPayload.free?.instrumentNoiseEnabled, false);
assert.deepEqual(editedPayload.free?.acknowledgements, {
  advancedParametersRisk: true,
  idealParameterProfileIntro: true,
});
assert.equal('advancedRiskAccepted' in (editedPayload.free ?? {}), false);

const envelope: WorkbenchExperimentFileEnvelopeV1 = {
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-restore',
  kind: 'heatCapacity',
  name: 'Restored Heat',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: editedPayload as unknown as Record<string, unknown>,
};
const restored = restoreHeatCapacityFileFromPersistencePayload(envelope, editedPayload, 1);
assert.equal(restored.heatCapacityFreeParameterDraft.ambientPressureKPa, 99.4);
assert.equal(restored.heatCapacityFreeGasType, 'helium');
assert.equal(restored.heatCapacityFreeParameterDraft.gasType, 'helium');
assert.equal(restored.heatCapacityFreePhysicsConfig.gamma, 5 / 3);
assert.equal(restored.theoreticalGamma, 5 / 3);
assert.equal(restored.heatCapacityFreeParameterDraft.instrumentNoiseEnabled, false);
assert.equal(restored.heatCapacityFreeRecordConfig.pressureDangerMv, 151);
assert.equal(restored.heatCapacityFreePressureWarningMv, 121);
assert.equal(restored.heatCapacityFreeInstrumentNoiseEnabled, false);
assert.deepEqual(restored.heatCapacityFreeFileAcknowledgements, {
  advancedParametersRisk: true,
  idealParameterProfileIntro: true,
});
assert.equal(restored.heatCapacityFreeParameterScheme, 'real');
assert.equal(restored.heatCapacityFreeDisplayScheme, 'real');
assert.equal(restored.heatCapacityFreeRealDomain.scheme, 'real');
assert.equal(restored.heatCapacityFreeIdealDomain.scheme, 'ideal');
assert.equal(restored.heatCapacityFreeStopcockFlowPurpose, 'none');

const legacyIntroPayload = structuredClone(payload) as typeof payload;
delete (legacyIntroPayload.common as any).lessonIntroAutoShown;
const legacyIntroRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-legacy-intro-restore',
  kind: 'heatCapacity',
  name: 'Legacy Intro Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: legacyIntroPayload as unknown as Record<string, unknown>,
}, legacyIntroPayload, 4);
assert.equal(legacyIntroRestored.heatCapacityLessonIntroAutoShown, true);

const legacyGammaOnlyPayload = structuredClone(payload) as typeof payload;
delete (legacyGammaOnlyPayload.free as any).gasType;
delete (legacyGammaOnlyPayload.free?.parameterDraft as any).gasType;
(legacyGammaOnlyPayload.free!.parameterDraft as any).gamma = 1.6;
legacyGammaOnlyPayload.free!.config.physics.gamma = 1.6;
const legacyGammaRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-legacy-gamma-restore',
  kind: 'heatCapacity',
  name: 'Legacy Gamma Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: legacyGammaOnlyPayload as unknown as Record<string, unknown>,
}, legacyGammaOnlyPayload, 5);
assert.equal(legacyGammaRestored.heatCapacityFreeGasType, 'helium');
assert.equal(legacyGammaRestored.heatCapacityFreeParameterDraft.gasType, 'helium');
assert.equal(legacyGammaRestored.heatCapacityFreePhysicsConfig.gamma, 5 / 3);
assert.equal(legacyGammaRestored.theoreticalGamma, 5 / 3);

const newFile = createDefaultHeatCapacityFile(2);
assert.deepEqual(newFile.heatCapacityFreeFileAcknowledgements, {
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});

const idealSchemeFile = setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'ideal', 444);
const idealSchemePayload = createHeatCapacityPersistencePayload(idealSchemeFile, 445);
assert.equal(idealSchemePayload.free?.parameterScheme, 'ideal');
assert.equal(idealSchemePayload.free?.displayScheme, 'ideal');
const idealSchemeRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-ideal-scheme-restore',
  kind: 'heatCapacity',
  name: 'Ideal Scheme Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: idealSchemePayload as unknown as Record<string, unknown>,
}, idealSchemePayload, 4);
assert.equal(idealSchemeRestored.heatCapacityFreeParameterScheme, 'ideal');
assert.equal(idealSchemeRestored.heatCapacityFreeDisplayScheme, 'ideal');
assert.equal(idealSchemeRestored.heatCapacityFreePhysicsConfig.gamma, 1.4);
assert.equal(idealSchemeRestored.heatCapacityFreeInstrumentNoiseEnabled, false);

const realPhysicsDefaults = createDefaultHeatCapacityFreePhysicsConfig();
const airModelDefaults = getHeatCapacityFreeGasTypeModelDefaults('air');
const staleTopLevelRealFile = {
  ...file,
  heatCapacityFreeParameterScheme: 'real' as const,
  heatCapacityFreeDisplayScheme: 'real' as const,
  heatCapacityFreePhysicsConfig: {
    ...file.heatCapacityFreePhysicsConfig,
    thermal: {
      ...file.heatCapacityFreePhysicsConfig.thermal,
      gasWallConductanceWPerK: 5,
      wallAmbientConductanceWPerK: 5,
    },
    pumpValveExchange: {
      ...file.heatCapacityFreePhysicsConfig.pumpValveExchange!,
      enabled: false,
      gasExchangeRatePerS: 0,
      thermalConductanceWPerK: 0,
    },
    environmentDisturbance: {
      ...file.heatCapacityFreePhysicsConfig.environmentDisturbance!,
      enabled: false,
      pressureAmplitudeKPa: 0,
      temperatureAmplitudeK: 0,
    },
    leakage: {
      enabled: false,
      ratePerS: 0,
    },
  },
  heatCapacityFreeParameterDraft: {
    ...file.heatCapacityFreeParameterDraft,
    gasWallConductanceWPerK: 5,
    wallAmbientConductanceWPerK: 5,
    leakageEnabled: false,
    leakageRatePerS: 0,
  },
  heatCapacityFreeRealDomain: {
    ...file.heatCapacityFreeRealDomain,
    physicsConfig: {
      ...file.heatCapacityFreeRealDomain.physicsConfig,
      thermal: {
        ...file.heatCapacityFreeRealDomain.physicsConfig.thermal,
        gasWallConductanceWPerK: airModelDefaults.gasWallConductanceWPerK,
        wallAmbientConductanceWPerK: realPhysicsDefaults.thermal.wallAmbientConductanceWPerK,
      },
    },
  },
};
const staleTopLevelRealFilePayload = createHeatCapacityPersistencePayload(staleTopLevelRealFile, 446);
assert.equal(
  staleTopLevelRealFilePayload.free?.config.physics.thermal.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);
assert.equal(
  staleTopLevelRealFilePayload.free?.parameterDraft.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);
assert.equal(
  staleTopLevelRealFilePayload.free?.real.physicsConfig.thermal.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);

const staleTopLevelRealPayload = structuredClone(payload) as typeof payload;
staleTopLevelRealPayload.free!.parameterScheme = 'real';
staleTopLevelRealPayload.free!.displayScheme = 'real';
staleTopLevelRealPayload.free!.gasType = 'air';
staleTopLevelRealPayload.free!.config.physics.thermal.gasWallConductanceWPerK = 5;
staleTopLevelRealPayload.free!.config.physics.thermal.wallAmbientConductanceWPerK = 5;
staleTopLevelRealPayload.free!.parameterDraft.gasWallConductanceWPerK = 5;
staleTopLevelRealPayload.free!.real.physicsConfig.thermal.gasWallConductanceWPerK =
  airModelDefaults.gasWallConductanceWPerK;
staleTopLevelRealPayload.free!.real.physicsConfig.thermal.wallAmbientConductanceWPerK =
  realPhysicsDefaults.thermal.wallAmbientConductanceWPerK;
const staleTopLevelRealRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-stale-top-level-real-restore',
  kind: 'heatCapacity',
  name: 'Stale Top-level Real Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: staleTopLevelRealPayload as unknown as Record<string, unknown>,
}, staleTopLevelRealPayload, 6);
assert.equal(
  staleTopLevelRealRestored.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);
assert.equal(
  staleTopLevelRealRestored.heatCapacityFreeParameterDraft.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);

const contaminatedRealDomainPayload = structuredClone(payload) as typeof payload;
contaminatedRealDomainPayload.free!.parameterScheme = 'real';
contaminatedRealDomainPayload.free!.displayScheme = 'real';
contaminatedRealDomainPayload.free!.gasType = 'air';
contaminatedRealDomainPayload.free!.real.physicsConfig.thermal.gasWallConductanceWPerK = 5;
contaminatedRealDomainPayload.free!.real.physicsConfig.thermal.wallAmbientConductanceWPerK = 5;
contaminatedRealDomainPayload.free!.real.physicsConfig.pumpValveExchange = {
  ...contaminatedRealDomainPayload.free!.real.physicsConfig.pumpValveExchange!,
  enabled: false,
  gasExchangeRatePerS: 0,
  thermalConductanceWPerK: 0,
};
contaminatedRealDomainPayload.free!.real.physicsConfig.environmentDisturbance = {
  ...contaminatedRealDomainPayload.free!.real.physicsConfig.environmentDisturbance!,
  enabled: false,
  pressureAmplitudeKPa: 0,
  temperatureAmplitudeK: 0,
};
contaminatedRealDomainPayload.free!.real.physicsConfig.leakage = {
  enabled: false,
  ratePerS: 0,
};
contaminatedRealDomainPayload.free!.real.scheme = 'ideal';
contaminatedRealDomainPayload.free!.ideal.scheme = 'real';
contaminatedRealDomainPayload.free!.real.trials = [
  createHeatCapacityFreeTrial('real-domain-boundary-trial', null, 'ideal'),
];
contaminatedRealDomainPayload.free!.ideal.trials = [
  createHeatCapacityFreeTrial('ideal-domain-boundary-trial', null, 'real'),
];
const contaminatedRealDomainRestored = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heat-file-contaminated-real-domain-restore',
  kind: 'heatCapacity',
  name: 'Contaminated Real Domain Restore',
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: contaminatedRealDomainPayload as unknown as Record<string, unknown>,
}, contaminatedRealDomainPayload, 7);
assert.equal(
  contaminatedRealDomainRestored.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);
assert.equal(
  contaminatedRealDomainRestored.heatCapacityFreePhysicsConfig.thermal.wallAmbientConductanceWPerK,
  realPhysicsDefaults.thermal.wallAmbientConductanceWPerK,
);
assert.equal(contaminatedRealDomainRestored.heatCapacityFreePhysicsConfig.leakage.enabled, true);
assert.equal(
  contaminatedRealDomainRestored.heatCapacityFreePhysicsConfig.leakage.ratePerS,
  airModelDefaults.leakageRatePerS,
);
assert.equal(contaminatedRealDomainRestored.heatCapacityFreePhysicsConfig.pumpValveExchange?.enabled, true);
assert.equal(contaminatedRealDomainRestored.heatCapacityFreePhysicsConfig.environmentDisturbance?.enabled, true);
assert.equal(
  contaminatedRealDomainRestored.heatCapacityFreeRealDomain.physicsConfig.thermal.gasWallConductanceWPerK,
  airModelDefaults.gasWallConductanceWPerK,
);
assert.equal(contaminatedRealDomainRestored.heatCapacityFreeRealDomain.scheme, 'real');
assert.equal(contaminatedRealDomainRestored.heatCapacityFreeIdealDomain.scheme, 'ideal');
assert.equal(contaminatedRealDomainRestored.heatCapacityFreeRealDomain.trials[0].parameterScheme, 'real');
assert.equal(contaminatedRealDomainRestored.heatCapacityFreeIdealDomain.trials[0].parameterScheme, 'ideal');
assert.equal(contaminatedRealDomainRestored.heatCapacityFreeTrials[0].parameterScheme, 'real');

const incompletePayload = structuredClone(editedPayload);
delete incompletePayload.free!.parameterDraft;
delete incompletePayload.free!.recordConfig;
delete incompletePayload.free!.pressureWarningMv;
delete incompletePayload.free!.instrumentNoiseEnabled;
const incompleteRestored = restoreHeatCapacityFileFromPersistencePayload(envelope, incompletePayload, 3);
const defaultFreeFile = createDefaultHeatCapacityFile(3);
assert.equal(incompleteRestored.heatCapacityFreeParameterDraft.ambientPressureKPa, defaultFreeFile.heatCapacityFreeParameterDraft.ambientPressureKPa);
assert.equal(incompleteRestored.heatCapacityFreeRecordConfig.pressureDangerMv, defaultFreeFile.heatCapacityFreeRecordConfig.pressureDangerMv);
assert.equal(incompleteRestored.heatCapacityFreePressureWarningMv, defaultFreeFile.heatCapacityFreePressureWarningMv);
assert.equal(incompleteRestored.heatCapacityFreeInstrumentNoiseEnabled, defaultFreeFile.heatCapacityFreeInstrumentNoiseEnabled);
assert.equal(incompleteRestored.heatCapacityFreeActiveRunConfigSnapshot, null);

console.log('heatCapacityFreePersistence tests passed');
