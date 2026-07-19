import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  captureHeatCapacityFreeRollbackSnapshot,
  completeHeatCapacityTeachingModeWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityGaugePressureState,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  setHeatCapacityScriptedStopcockOpen,
  stepHeatCapacityWorkbenchFile,
  startHeatCapacityGuideWorkbenchState,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  type WorkbenchPanelKey,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  calculateFreeHeatCapacityMeanResult,
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityFreeStandardReference,
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
} from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  appendFreeTraceEvent,
  appendFreeTraceSample,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
  decodeWorkbenchSessionWithDiagnostics,
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
import {
  createDefaultHeatCapacityFreePhysicsConfig,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  getHeatCapacityFreeGasTypeModelDefaults,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
} from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  createHeatCapacityAutoDemoProfile,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  createPersistenceRecords,
} from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';
import {
  createWorkbenchHeatCapacityRefreshSession,
} from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import {
  createHeatCapacityModeUiCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  createSampleInputForProcessReviewTest,
} from '../heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  HEAT_CAPACITY_LEGACY_423_DISPLAY_EVENT_SAMPLE_RELATION_PROVENANCE,
} from '../../src/domain/heatCapacity/heatCapacityLegacyTraceCompatibility.ts';

(globalThis as typeof globalThis & { __APP_VERSION__: string }).__APP_VERSION__ = '5.1.2';

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
const legacyBatchSeed = storeHeatCapacityFreeRuntimeFieldsInDomain(
  freezeHeatCapacityFreeParametersForCurrentGroup(
    configureHeatCapacityFreeBatchWorkbenchState(
      heatCapacity,
      3,
      now - 2,
    ),
    now - 1,
  ),
  'real',
);
const {
  nextTrialSequence: discardedLegacyBatchSequence,
  ...legacyBatchFields
} = legacyBatchSeed.heatCapacityFreeBatch;
void discardedLegacyBatchSequence;
const savedLegacyFreeDomain = {
  ...legacyBatchSeed.heatCapacityFreeRealDomain,
  batch: {
    ...legacyBatchFields,
    version: HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  },
  traceStore: {
    ...createDefaultFreeTraceStore(),
    nextTraceTrialIndex: 3,
  },
  trials: [savedAutomaticOnlyFreeTrial, savedLegacyCompleteFreeTrial],
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
      heatCapacityFreeRealDomain: savedLegacyFreeDomain,
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
  assert.equal(
    restoredIdeal.latestPressureSummary,
    null,
    'a legacy live pressure summary without its engine snapshot must not survive as a mixed projection',
  );
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
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials.length, 2, 'stale top-level runtime normalization must preserve migrated domain trials');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].automaticU0?.zeroEventId, 'zero-1');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].u0, null, 'automatic-only saved Free trials must not be promoted to official manual U0 records');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].correctedSignals?.u0Source, 'assumed-zero', 'restored U1/U2 records without formal U0 must use U0 = 0');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[0].correctedSignals?.U0DisplayMv, 0);
  assert.equal(
    restoredHeatCapacity.heatCapacityFreeTrials[0].configSnapshot,
    null,
    'legacy Free records without trace evidence must remain explicitly untraced archives',
  );
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[1].correctedSignals?.calculationVersion, 'log-pressure-v1');
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[1].correctedSignals?.atmosphericPressureKPa, 101.3);
  assert.equal(restoredHeatCapacity.heatCapacityFreeTrials[1].correctedSignals?.pressureSensitivityMvPerKPa, 20);
  assert.equal(
    calculateFreeHeatCapacityMeanResult([restoredHeatCapacity.heatCapacityFreeTrials[0]]).validTrialCount,
    0,
    'untraced legacy records must remain visible without counting as formally completed results',
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
    ? startHeatCapacityGuideWorkbenchState(file, now)
    : file
));
const encoded = encodeWorkbenchSession(guideSessionFiles, restored.activeFileId, restored.selectedPanel);
assert.equal(encoded.version, WORKBENCH_SESSION_VERSION);
assert.equal(encoded.files.length, 3);
assert.equal(encoded.activeFileId, ideal.id);
assert.equal(
  'heatCapacityGuideSession' in encoded,
  false,
  'guide UI ownership belongs to the canonical mode checkpoint, not workspace metadata',
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
assert.equal('heatCapacityGuideSession' in invalidGuideSession, false);

const fallback = decodeWorkbenchSession({ version: 999, files: [], activeFileId: 'missing', selectedPanel: 'history' });
assert.deepEqual(
  fallback.files.map((file) => file.id),
  [],
  'invalid or unsupported session payloads should fall back to an empty workbench session',
);
assert.equal(fallback.selectedPanel, 'preview');

const envelope = encodeWorkbenchStorageEnvelope(guideSessionFiles, restored.activeFileId, restored.selectedPanel, 12345);
assert.equal(envelope.schemaFamily, WORKBENCH_SESSION_SCHEMA_FAMILY);
assert.equal(envelope.schemaVersion, WORKBENCH_SESSION_SCHEMA_VERSION);
assert.equal('heatCapacityGuideSession' in envelope, false);
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
assert.deepEqual(decodedEnvelope.diagnostics.filter((entry) => entry.level === 'error'), []);
assert.equal(decodedEnvelope.session.files.length, restored.files.length);
assert.equal(decodedEnvelope.session.activeFileId, restored.activeFileId);
assert.equal('heatCapacityGuideSession' in decodedEnvelope.session, false);
const decodedStandard = decodedEnvelope.session.files[0];
assert.equal(decodedStandard.kind, 'standard');
if (decodedStandard.kind === 'standard') {
  assert.equal(decodedStandard.hardSphereEngineSnapshot, null);
}

const heatReplayBaseFile = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(8),
  3,
  999,
);
const heatReplayPoweredFile = powerHeatCapacityWorkbenchFile(
  heatReplayBaseFile,
  true,
  1000,
);
const heatReplayRuntimeFile = stepHeatCapacityWorkbenchFile(
  heatReplayPoweredFile,
  2000,
);
const replayTraceStart = createFreeTraceTrial(
  createDefaultFreeTraceStore(),
  createDefaultFreeConfigSnapshot(),
);
const replayTraceBranch = appendFreeTraceSample(replayTraceStart.traceTrial.branches[0], {
  atS: 1,
  reason: 'event',
  phase: 'sealedStabilizing',
  controls: {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    pumpBulbState: 'idle',
    releaseFlowOpen: false,
    releasePhase: 'closed',
    releaseDurationS: 0,
  },
  physical: {
    gasPressureKPa: 106,
    pressureDeltaKPa: 4.7,
    gasTemperatureK: 298.15,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1.04,
    pumpStrokeCount: 4,
    releaseStarted: false,
    currentStopcockOpenDurationS: 0,
  },
  sensor: {
    displayPressureMv: 94,
    displayTemperatureMv: 1499,
    pressureSlopeMvPerS: 0.02,
    temperatureSlopeMvPerS: 0.01,
  },
  calibration: {
    calibrationVersion: 1,
    zeroOffsetMv: 0,
    zeroEventId: 'zero-1',
  },
  stability: { pressureStable: true, temperatureStable: true },
  safetyStatus: 'normal',
}).branch;
const replayTraceStore = {
  ...replayTraceStart.store,
  traceTrials: [{ ...replayTraceStart.traceTrial, branches: [replayTraceBranch] }],
};
const heatReplayFile = storeHeatCapacityFreeRuntimeFieldsInDomain({
  ...heatReplayRuntimeFile,
  pressureGaugeNeedleAngle: 33,
  heatCapacityFreeEquilibriumSpeedMultiplier: 8 as const,
  hardSphereViewEnabled: true,
  heatCapacityFreeTraceStore: replayTraceStore,
  heatCapacityFreeRollbackSnapshots: {
    ...heatReplayBaseFile.heatCapacityFreeRollbackSnapshots,
    afterPowerOn: heatReplayPoweredFile.heatCapacityFreeRollbackSnapshots.afterPowerOn,
  },
}, 'real');
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
assert.equal(replayFile.hardSphereViewEnabled, true);
assert.notEqual(replayFile.heatCapacityFreeRollbackSnapshots.afterPowerOn, null);
assert.ok(Array.isArray(replayFile.heatCapacityFreeRollbackSnapshots.afterPowerOn?.heatCapacityFreePhysicsState.pumpProcesses));
assert.ok(Array.isArray(replayFile.heatCapacityFreeRollbackSnapshots.afterPowerOn?.heatCapacityFreeSensorState.pressureHistory));
assert.equal('hardSphereParticleMultiplier' in replayFile, false);
assert.equal('hardSphereSpeedMultiplier' in replayFile, false);
assert.equal('hardSphereTrailsEnabled' in replayFile, false);

const convertHeatEnvelopeToLegacy423 = <T extends ReturnType<typeof encodeWorkbenchStorageEnvelope>>(
  currentEnvelope: T,
) => {
  const legacyEnvelope = JSON.parse(JSON.stringify(currentEnvelope)) as T;
  const payload = legacyEnvelope.files[0].payload as any;
  const currentTemperatureBaseMv = 1498.7;
  const currentTemperatureSensitivityMvPerK = 5;
  const legacyFreeTemperatureBaseMv = 1499.05;
  const legacyFreeTemperatureSensitivityMvPerK = 2;
  const legacyGuideTemperatureBaseMv = 1499.05;
  const legacyGuideTemperatureSensitivityMvPerK = 4;
  const legacyPumpAmountGainRatio = 0.00345;
  const legacyStopcockFlowRate = 5.25;
  const downgradeTemperatureSignal = (
    value: unknown,
    legacyBaseMv = legacyFreeTemperatureBaseMv,
    legacySensitivityMvPerK = legacyFreeTemperatureSensitivityMvPerK,
  ) => typeof value === 'number'
    ? legacyBaseMv + (value - currentTemperatureBaseMv) *
      legacySensitivityMvPerK / currentTemperatureSensitivityMvPerK
    : value;
  const downgradeTemperatureDelta = (
    value: unknown,
    legacySensitivityMvPerK = legacyFreeTemperatureSensitivityMvPerK,
  ) => typeof value === 'number'
    ? value * legacySensitivityMvPerK / currentTemperatureSensitivityMvPerK
    : value;
  const downgradeTemperatureRecordConfig = (config: any) => {
    if (!config) return config;
    config.temperatureStableSlopeMvPerS = downgradeTemperatureDelta(
      config.temperatureStableSlopeMvPerS,
    );
    config.temperatureAmbientToleranceMv = downgradeTemperatureDelta(
      config.temperatureAmbientToleranceMv,
    );
    return config;
  };
  const downgradeParameterDraft = (draft: any) => {
    if (!draft) return draft;
    downgradeTemperatureRecordConfig(draft);
    return draft;
  };
  const downgradeConfigSnapshot = (snapshot: any) => {
    if (!snapshot) return snapshot;
    snapshot.version = 7;
    snapshot.physics.pumpAmountGainRatio = legacyPumpAmountGainRatio;
    snapshot.physics.stopcockFlowRate = legacyStopcockFlowRate;
    delete snapshot.physics.pumpWorkRetention;
    delete snapshot.physics.openingAnimationDurationMs;
    delete snapshot.physics.closingAnimationDurationMs;
    delete snapshot.physics.releaseApertureRampS;
    delete snapshot.physics.releaseOptimalMinS;
    delete snapshot.physics.releaseOptimalMaxS;
    delete snapshot.physics.autoDemoReleaseDurationS;
    snapshot.physics.pumpStrokeDurationS = 0.08;
    snapshot.physics.recommendedPumpIntervalS = 0.1;
    snapshot.physics.releaseVisualResponseDelayS = 0.02;
    snapshot.physics.releaseVisualMainDurationS = 0.18;
    snapshot.sensor.temperatureMvAtAmbient = legacyFreeTemperatureBaseMv;
    snapshot.sensor.temperatureMvPerK = legacyFreeTemperatureSensitivityMvPerK;
    snapshot.sensor.pumpLagRate = 36;
    snapshot.sensor.fastProcessSampleStepS = 0.04;
    downgradeTemperatureRecordConfig(snapshot.record);
    snapshot.scoring.processScoringVersion = 'free-process-score-v1';
    return snapshot;
  };
  const downgradePhysicsConfig = (config: any) => {
    if (!config) return config;
    config.pumpAmountGainRatio = legacyPumpAmountGainRatio;
    config.stopcockFlowRate = legacyStopcockFlowRate;
    delete config.pumpWorkRetention;
    return config;
  };
  const downgradePhysicsState = (state: any) => {
    if (!state) return state;
    delete state.amountMol;
    delete state.internalEnergyJ;
    delete state.referenceAmountMol;
    return state;
  };
  const downgradeSensorConfig = (config: any) => {
    if (!config) return config;
    config.temperatureMvAtAmbient = legacyFreeTemperatureBaseMv;
    config.temperatureMvPerK = legacyFreeTemperatureSensitivityMvPerK;
    return config;
  };
  const downgradeSensorState = (state: any) => {
    if (!state) return state;
    state.displayTemperatureMv = downgradeTemperatureSignal(state.displayTemperatureMv);
    state.temperatureSlopeMvPerS = downgradeTemperatureDelta(state.temperatureSlopeMvPerS);
    state.temperatureHistory = state.temperatureHistory.map((sample: any) => ({
      ...sample,
      valueMv: downgradeTemperatureSignal(sample.valueMv),
    }));
    delete state.sensorTemperatureK;
    return state;
  };
  const downgradeCalibrationState = (state: any) => {
    if (!state) return state;
    state.zeroEvents = state.zeroEvents.map((event: any) => ({
      ...event,
      displayTemperatureMv: downgradeTemperatureSignal(event.displayTemperatureMv),
    }));
    if (state.automaticU0) {
      state.automaticU0.displayTemperatureMv = downgradeTemperatureSignal(
        state.automaticU0.displayTemperatureMv,
      );
    }
    return state;
  };
  const downgradeRecord = (record: any) => {
    if (!record) return record;
    record.displayTemperatureMv = downgradeTemperatureSignal(record.displayTemperatureMv);
    return record;
  };
  const downgradeTrial = (trial: any) => {
    if (!trial) return trial;
    delete trial.preheatOutcome;
    downgradeRecord(trial.automaticU0);
    downgradeRecord(trial.u0);
    downgradeRecord(trial.u1);
    downgradeRecord(trial.u2);
    if (trial.correctedSignals) {
      delete trial.correctedSignals.u0Source;
      delete trial.correctedSignals.formulaGamma;
      delete trial.correctedSignals.preheatBiasGamma;
    }
    downgradeConfigSnapshot(trial.configSnapshot);
    if (trial.standardReferenceSnapshot) {
      trial.standardReferenceSnapshot.generatorVersion = 'free-standard-reference-v1';
      trial.standardReferenceSnapshot.operationPreset.pumpStrokes = 18;
      trial.standardReferenceSnapshot.operationPreset.pumpTotalDurationS = 12;
      trial.standardReferenceSnapshot.operationPreset.waitAfterPumpS = 300;
      trial.standardReferenceSnapshot.operationPreset.openDurationS = 0.35;
      trial.standardReferenceSnapshot.operationPreset.waitAfterReleaseS = 300;
      delete trial.standardReferenceSnapshot.operationPreset.releaseDurationS;
      trial.standardReferenceSnapshot.releaseDurationS = 0.35;
      trial.standardReferenceSnapshot.summary.releaseDurationS = 0.35;
      downgradeConfigSnapshot(trial.standardReferenceSnapshot.configSnapshot);
    }
    return trial;
  };
  const downgradeTraceStore = (traceStore: any) => {
    for (const trial of traceStore.traceTrials) {
      downgradeConfigSnapshot(trial.configSnapshot);
      for (const branch of trial.branches) {
        for (const sample of branch.samples) {
          // This fixture is a synthetic legacy-contract exercise, not a
          // byte-accurate public v4.2.3 record. Keep the current release
          // authority alongside the old alias; genuinely pre-batch traces
          // without those fields are quarantined by the strict V3 boundary.
          sample.controls.stopcockFlowOpen = sample.controls.releaseFlowOpen;
          sample.sensor.displayTemperatureMv = downgradeTemperatureSignal(
            sample.sensor.displayTemperatureMv,
          );
          sample.sensor.temperatureSlopeMvPerS = downgradeTemperatureDelta(
            sample.sensor.temperatureSlopeMvPerS,
          );
        }
      }
    }
    return traceStore;
  };
  const downgradeRollbackSnapshot = (snapshot: any) => {
    if (!snapshot) return snapshot;
    const releaseState = snapshot.heatCapacityReleaseState;
    snapshot.heatCapacityFreeStopcockFlowOpen = releaseState.phase === 'open' ||
      releaseState.phase === 'releasing';
    snapshot.heatCapacityFreeStopcockPendingOpenAtMs = releaseState.phase === 'opening' ? 0 : null;
    snapshot.heatCapacityFreeStopcockFlowPurpose = releaseState.purpose;
    snapshot.temperatureSignalMv = downgradeTemperatureSignal(snapshot.temperatureSignalMv);
    snapshot.temperatureSignalTargetMv = downgradeTemperatureSignal(snapshot.temperatureSignalTargetMv);
    downgradePhysicsState(snapshot.heatCapacityFreePhysicsState);
    downgradeSensorState(snapshot.heatCapacityFreeSensorState);
    downgradeCalibrationState(snapshot.heatCapacityFreeCalibrationState);
    delete snapshot.heatCapacityReleaseState;
    return snapshot;
  };
  const downgradeRollbackSnapshots = (snapshots: any) => {
    if (!snapshots) return snapshots;
    downgradeRollbackSnapshot(snapshots.afterPowerOn);
    downgradeRollbackSnapshot(snapshots.beforePump);
    downgradeRollbackSnapshot(snapshots.beforeRelease);
    return snapshots;
  };
  const downgradeUiReplay = (uiReplay: any) => {
    const legacyBaseMv = payload.mode === 'free'
      ? legacyFreeTemperatureBaseMv
      : legacyGuideTemperatureBaseMv;
    const legacySensitivityMvPerK = payload.mode === 'free'
      ? legacyFreeTemperatureSensitivityMvPerK
      : legacyGuideTemperatureSensitivityMvPerK;
    const mapSignal = (value: unknown) => downgradeTemperatureSignal(
      value,
      legacyBaseMv,
      legacySensitivityMvPerK,
    );
    uiReplay.temperatureSignalTargetMv = mapSignal(uiReplay.temperatureSignalTargetMv);
    uiReplay.temperatureSignalMv = mapSignal(uiReplay.temperatureSignalMv);
    uiReplay.temperatureDisplayJitterOffset = downgradeTemperatureDelta(
      uiReplay.temperatureDisplayJitterOffset,
      legacySensitivityMvPerK,
    );
    for (const sample of Object.values(uiReplay.heatCapacityProcessSamples ?? {}) as any[]) {
      sample.temperatureSignalMv = mapSignal(sample.temperatureSignalMv);
    }
    uiReplay.pressureReleaseBurstUntilMs = null;
    uiReplay.heatCapacityFreeStopcockPendingOpenAtMs = null;
    uiReplay.heatCapacityFreeEquilibriumSpeedHintShown = false;
    delete uiReplay.pressureSignalMvRaw;
    delete uiReplay.pressureSignalMvDisplayed;
    return uiReplay;
  };
  const downgradeTeachingProfile = (profile: any) => {
    if (!profile) return profile;
    for (const key of [
      'ambientTemperatureMv',
      'initialTemperatureMv',
      'stableTemperatureMv',
      'releaseTemperatureLowMv',
      'recoveryTemperatureMv',
    ]) {
      profile[key] = downgradeTemperatureSignal(
        profile[key],
        legacyGuideTemperatureBaseMv,
        legacyGuideTemperatureSensitivityMvPerK,
      );
    }
    return profile;
  };
  delete payload.common.modeSessions;
  downgradeTeachingProfile(payload.common.experimentProfile);
  delete payload.free.preheatCompleted;
  payload.free.traceVersion = 4;
  downgradeConfigSnapshot(payload.free.config);
  downgradeConfigSnapshot(payload.free.activeRunConfigSnapshot);
  downgradeParameterDraft(payload.free.parameterDraft);
  downgradeTemperatureRecordConfig(payload.free.recordConfig);
  downgradePhysicsState(payload.free.runtime);
  downgradeSensorState(payload.free.sensor);
  downgradeCalibrationState(payload.free.calibration);
  downgradeRollbackSnapshots(payload.free.rollbackSnapshots);
  downgradeTraceStore(payload.free.traceStore);
  payload.free.trials.forEach(downgradeTrial);
  downgradeUiReplay(payload.free.uiReplay);
  for (const domain of [payload.free.real, payload.free.ideal]) {
    const domainReleaseState = domain.releaseState;
    domain.stopcockFlowOpen = domainReleaseState.phase === 'open' || domainReleaseState.phase === 'releasing';
    domain.stopcockPendingOpenAtMs = domainReleaseState.phase === 'opening' ? 0 : null;
    domain.stopcockFlowPurpose = domainReleaseState.purpose;
    downgradeConfigSnapshot(domain.activeRunConfigSnapshot);
    downgradeTemperatureRecordConfig(domain.recordConfig);
    downgradePhysicsConfig(domain.physicsConfig);
    downgradePhysicsState(domain.physicsState);
    downgradeSensorConfig(domain.sensorConfig);
    downgradeSensorState(domain.sensorState);
    downgradeCalibrationState(domain.calibrationState);
    downgradeRollbackSnapshots(domain.rollbackSnapshots);
    downgradeTraceStore(domain.traceStore);
    domain.trials.forEach(downgradeTrial);
    delete domain.activeAttempt;
    delete domain.releaseState;
  }
  const releaseState = payload.free.controls.releaseState;
  payload.free.controls.stopcockFlowOpen = releaseState.phase === 'open' || releaseState.phase === 'releasing';
  payload.free.controls.stopcockFlowPurpose = releaseState.purpose;
  delete payload.free.controls.releaseState;
  if (payload.guided) {
    downgradePhysicsConfig(payload.guided.physicsConfig);
    payload.guided.physicsConfig.thermal = {
      gasWallConductanceWPerK: 0.14,
      wallAmbientConductanceWPerK: 0.45,
      wallHeatCapacityJPerK: 45,
      minimumGasHeatCapacityJPerK: 0.1,
    };
    downgradePhysicsState(payload.guided.physicsState);
    if (payload.guided.workflow.step === 'preheatRequired') {
      payload.guided.workflow.step = 'powerRequired';
    }
    delete payload.guided.workflow.releaseCloseResumeAtMs;
    if (payload.guided.trial) {
      const downgradeGuideRecord = (record: any) => {
        if (record) {
          record.displayTemperatureMv = downgradeTemperatureSignal(
            record.displayTemperatureMv,
            legacyGuideTemperatureBaseMv,
            legacyGuideTemperatureSensitivityMvPerK,
          );
        }
      };
      downgradeGuideRecord(payload.guided.trial.u0);
      downgradeGuideRecord(payload.guided.trial.u1);
      downgradeGuideRecord(payload.guided.trial.u2);
    }
    delete payload.guided.temperatureSensorState;
  }
  return legacyEnvelope;
};

const assertClose = (actual: number, expected: number, message?: string) => {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    message ?? `expected ${actual} to be within 1e-9 of ${expected}`,
  );
};

const createLegacyReferenceFixtureParts = () => {
  const configSnapshot = createDefaultFreeConfigSnapshot();
  const created = createFreeTraceTrial(
    createDefaultFreeTraceStore(),
    configSnapshot,
    'free-trial-1',
  );
  let branch = created.traceTrial.branches[0];
  const sampleInputs = [
    createSampleInputForProcessReviewTest(5, 0, 1499, {
      phase: 'zeroed',
      controls: { powerOn: true, stopcockOpen: true },
    }),
    createSampleInputForProcessReviewTest(330, 112, 1499.05, {
      phase: 'sealedStabilizing',
      physical: { pumpStrokeCount: HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes },
    }),
    createSampleInputForProcessReviewTest(330.72, 80, 1498.6, {
      phase: 'releasing',
      controls: {
        powerOn: true,
        stopcockOpen: true,
        releaseFlowOpen: true,
        releasePhase: 'releasing',
      },
      physical: {
        pumpStrokeCount: HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
        releaseStarted: true,
        currentStopcockOpenDurationS: 0,
      },
    }),
    createSampleInputForProcessReviewTest(331.32, 45, 1498.75, {
      phase: 'recovering',
      controls: {
        powerOn: true,
        releasePhase: 'closedAfterRelease',
        releaseDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      },
      physical: {
        pumpStrokeCount: HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
        releaseStarted: true,
      },
    }),
    createSampleInputForProcessReviewTest(631.32, 31.4, 1498.98, {
      phase: 'recovering',
      controls: {
        powerOn: true,
        releasePhase: 'closedAfterRelease',
        releaseDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      },
      physical: {
        pumpStrokeCount: HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
        releaseStarted: true,
      },
    }),
  ];
  const samples = sampleInputs.map((input) => {
    const appended = appendFreeTraceSample(branch, input);
    branch = appended.branch;
    return appended.sample;
  });
  const [u0Sample, u1Sample, releaseSample, closedSample, u2Sample] = samples;
  const appendEvent = (
    atS: number,
    type: Parameters<typeof appendFreeTraceEvent>[1]['type'],
    traceSampleId: string,
    payload?: Record<string, unknown>,
  ) => {
    branch = appendFreeTraceEvent(branch, { atS, type, traceSampleId, payload }).branch;
  };
  appendEvent(5, 'power-on', u0Sample!.id);
  appendEvent(5, 'stopcock-open', u0Sample!.id);
  appendEvent(5, 'zero-calibration', u0Sample!.id);
  appendEvent(5, 'record-u0', u0Sample!.id);
  appendEvent(18, 'pump-valve-open', u1Sample!.id);
  appendEvent(19, 'pump-stroke', u1Sample!.id, { pumpStrokeCount: 1 });
  appendEvent(30, 'pump-valve-close', u1Sample!.id);
  appendEvent(330, 'record-u1', u1Sample!.id);
  appendEvent(330.3, 'stopcock-open', releaseSample!.id, { attemptId: 1, purpose: 'release' });
  appendEvent(330.72, 'release-start', releaseSample!.id, {
    attemptId: 1,
    formedRelease: true,
    openingCompletedAtS: 330.72,
    releaseDurationS: 0,
  });
  appendEvent(331.32, 'stopcock-close', closedSample!.id, {
    attemptId: 1,
    purpose: 'release',
    formedRelease: true,
    quickToggle: false,
    openingCompletedAtS: 330.72,
    closeCommandAtS: 331.32,
    releaseDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  });
  appendEvent(631.32, 'record-u2', u2Sample!.id);

  const traceTrial = {
    ...created.traceTrial,
    activeBranchId: branch.id,
    branches: [branch],
  };
  const traceStore = {
    ...created.store,
    traceTrials: [traceTrial],
  };
  const createRecord = (
    sample: NonNullable<typeof u0Sample>,
    type: 'record-u0' | 'record-u1' | 'record-u2',
  ) => normalizeHeatCapacityFreeRecordInput({
    atS: sample.atS,
    displayPressureMv: sample.sensor.displayPressureMv,
    displayTemperatureMv: sample.sensor.displayTemperatureMv,
    calibrationVersion: sample.calibration.calibrationVersion,
    zeroEventId: sample.calibration.zeroEventId ?? 'zero-1',
    phaseAtRecord: sample.phase,
    traceTrialId: traceTrial.id,
    traceBranchId: branch.id,
    traceSampleId: sample.id,
    eventId: branch.events.find((event) => (
      event.type === type && event.traceSampleId === sample.id
    ))?.id ?? null,
  });
  const baseTrial = {
    ...createHeatCapacityFreeTrial('free-trial-1'),
    parameterScheme: 'real' as const,
    traceTrialId: traceTrial.id,
    branchCount: 1,
    preheatOutcome: 'completed' as const,
    u0: createRecord(u0Sample!, 'record-u0'),
    u1: createRecord(u1Sample!, 'record-u1'),
    u2: createRecord(u2Sample!, 'record-u2'),
    configSnapshot,
  };
  const trial = {
    ...baseTrial,
    correctedSignals: calculateFreeHeatCapacityTrialSignals(baseTrial, {
      atmosphericPressureKPa: configSnapshot.environment.ambientPressureKPa,
      pressureSensitivityMvPerKPa: configSnapshot.sensor.pressureMvPerKPa,
    }),
  };
  return { traceStore, traceTrial, branch, trial };
};

const legacyReferenceParts = createLegacyReferenceFixtureParts();
const legacyReferenceTrial = {
  ...legacyReferenceParts.trial,
  standardReferenceSnapshot: createHeatCapacityFreeStandardReference({
    traceTrial: legacyReferenceParts.traceTrial,
    trial: legacyReferenceParts.trial,
    theoreticalGamma: 1.4,
  }),
  completedAtMs: now,
};
const legacyBlockedTrial = {
  ...createHeatCapacityFreeTrial('legacy-missing-u0'),
  preheatOutcome: 'completed' as const,
  blockedReason: 'invalid-sequence' as const,
};
const legacyGuideTrial = recordGuideU2(
  recordGuideU1(
    recordGuideU0(createHeatCapacityGuideTrial('legacy-guide-trial'), {
      atS: 8,
      displayPressureMv: 0.25,
      displayTemperatureMv: 1500.2,
      calibrationVersion: 2,
      zeroEventId: 'guide-zero-2',
    }),
    {
      atS: 345,
      displayPressureMv: 120.25,
      displayTemperatureMv: 1501.45,
      calibrationVersion: 2,
      zeroEventId: 'guide-zero-2',
    },
  ),
  {
    atS: 646.65,
    displayPressureMv: 34.75,
    displayTemperatureMv: 1497.95,
    calibrationVersion: 2,
    zeroEventId: 'guide-zero-2',
  },
  now,
);
const legacyMigrationBase = storeHeatCapacityFreeRuntimeFieldsInDomain(
  freezeHeatCapacityFreeParametersForCurrentGroup(
    configureHeatCapacityFreeBatchWorkbenchState(
      createDefaultHeatCapacityFile(11),
      3,
      now - 2,
    ),
    now - 1,
  ),
  'real',
);
const legacyMigrationBatchId = legacyMigrationBase.heatCapacityFreeBatch.id;
if (legacyMigrationBatchId === null) {
  throw new Error('Expected the legacy migration fixture batch to have an ID.');
}
const legacyTeachingProfile = {
  ...createHeatCapacityAutoDemoProfile(() => 0.5),
  ambientTemperatureMv: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  initialTemperatureMv: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  stableTemperatureMv: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV + 0.15,
  releaseTemperatureLowMv: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV - 0.85,
  recoveryTemperatureMv: HEAT_CAPACITY_TEMPERATURE_BASELINE_MV - 0.1,
};
const rollbackSeed = captureHeatCapacityFreeRollbackSnapshot(legacyMigrationBase);
const legacyOpeningRollback = {
  ...rollbackSeed,
  stopcockAngleDeg: 0,
  temperatureSignalMv: 1500.2,
  temperatureSignalTargetMv: 1501.45,
  heatCapacityFreePhysicsState: {
    ...rollbackSeed.heatCapacityFreePhysicsState,
    simulationTimeS: 12,
    releaseStarted: false,
    lastStopcockOpenedAtS: null,
    lastStopcockClosedAtS: null,
    currentStopcockOpenDurationS: 0,
    releaseReference: null,
  },
  heatCapacityFreeSensorState: {
    ...rollbackSeed.heatCapacityFreeSensorState,
    displayTemperatureMv: 1500.2,
    sensorTemperatureK: 298.45,
    temperatureSlopeMvPerS: 0.35,
    temperatureHistory: [{ atS: 11, valueMv: 1499.95 }, { atS: 12, valueMv: 1500.2 }],
  },
  heatCapacityReleaseState: {
    phase: 'opening' as const,
    purpose: 'zeroing' as const,
    attemptId: 1,
    phaseStartedAtS: 12,
    openingStartedAtS: 12,
    openingCompletedAtS: null,
    closeCommandAtS: null,
    closingCompletedAtS: null,
    releaseDurationS: 0,
    formedRelease: false,
    quickToggle: false,
  },
};
const legacyReleasingRollback = {
  ...rollbackSeed,
  glassPistonState: 'open' as const,
  stopcockAngleDeg: 90,
  temperatureSignalMv: 1497.95,
  temperatureSignalTargetMv: 1498.45,
  heatCapacityFreePhysicsState: {
    ...rollbackSeed.heatCapacityFreePhysicsState,
    simulationTimeS: 20.6,
    releaseStarted: true,
    lastStopcockOpenedAtS: 20,
    lastStopcockClosedAtS: null,
    currentStopcockOpenDurationS: 0.6,
    releaseReference: {
      pressureBeforeKPa: 106.2,
      temperatureBeforeK: 298.65,
      amountBeforeRatio: 1.05,
      openedAtS: 20,
      reachedAmbientAtS: null,
    },
  },
  heatCapacityReleaseState: {
    phase: 'releasing' as const,
    purpose: 'release' as const,
    attemptId: 2,
    phaseStartedAtS: 20,
    openingStartedAtS: 19.58,
    openingCompletedAtS: 20,
    closeCommandAtS: null,
    closingCompletedAtS: null,
    releaseDurationS: 0.6,
    formedRelease: true,
    quickToggle: false,
  },
};
const legacyClosedAfterReleaseRollback = {
  ...rollbackSeed,
  glassPistonState: 'closed' as const,
  stopcockAngleDeg: 0,
  temperatureSignalMv: 1498.45,
  temperatureSignalTargetMv: 1498.7,
  heatCapacityFreePhysicsState: {
    ...rollbackSeed.heatCapacityFreePhysicsState,
    simulationTimeS: 21.1,
    releaseStarted: true,
    lastStopcockOpenedAtS: 20,
    lastStopcockClosedAtS: 20.65,
    currentStopcockOpenDurationS: 0,
    releaseReference: {
      pressureBeforeKPa: 106.2,
      temperatureBeforeK: 298.65,
      amountBeforeRatio: 1.05,
      openedAtS: 20,
      reachedAmbientAtS: 20.42,
    },
  },
  heatCapacityReleaseState: {
    phase: 'closedAfterRelease' as const,
    purpose: 'release' as const,
    attemptId: 2,
    phaseStartedAtS: 20.65,
    openingStartedAtS: 19.58,
    openingCompletedAtS: 20,
    closeCommandAtS: 20.65,
    closingCompletedAtS: 20.65,
    releaseDurationS: 0.65,
    formedRelease: true,
    quickToggle: false,
  },
};
const legacyMigrationSource = {
  ...legacyMigrationBase,
  heatCapacityMode: 'free' as const,
  heatCapacityTeachingStatus: 'running' as const,
  heatCapacityExperimentProfile: legacyTeachingProfile,
  runState: 'paused' as const,
  powerOn: true,
  glassPistonState: 'open' as const,
  stopcockAngleDeg: 90,
  simulationTimeS: 42,
  pressureSignalMvRaw: 37.125,
  pressureSignalMvDisplayed: 36.875,
  pressureSignalRawReadoutMv: 37.12,
  pressureSignalReadoutMv: 36.87,
  temperatureSignalMv: 1501.45,
  temperatureSignalTargetMv: 1497.95,
  temperatureDisplayJitterOffset: 0.35,
  heatCapacityProcessSamples: {
    stableBeforeReleaseSample: {
      timeS: 39,
      phase: 'sealedStabilizing' as const,
      temperatureSignalMv: 1500.2,
      pressureSignalMv: 120.25,
      gasTemperatureK: 298.45,
      gasPressureKPaAbs: 107.3125,
      pressureDeltaKPa: 6.0125,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
  },
  heatCapacityFreeParameterDraft: {
    ...legacyMigrationBase.heatCapacityFreeParameterDraft,
    temperatureStableSlopeMvPerS: 0.375,
    temperatureAmbientToleranceMv: 1.625,
  },
  heatCapacityFreeRecordConfig: {
    ...legacyMigrationBase.heatCapacityFreeRecordConfig,
    temperatureStableSlopeMvPerS: 0.375,
    temperatureAmbientToleranceMv: 1.625,
  },
  heatCapacityFreePhysicsState: {
    ...legacyMigrationBase.heatCapacityFreePhysicsState,
    simulationTimeS: 42,
    releaseStarted: true,
    lastStopcockOpenedAtS: 41.4,
    lastStopcockClosedAtS: null,
    currentStopcockOpenDurationS: 0.6,
    releaseReference: {
      pressureBeforeKPa: 107.3,
      temperatureBeforeK: 298.45,
      amountBeforeRatio: 1.06,
      openedAtS: 41.4,
      reachedAmbientAtS: null,
    },
  },
  heatCapacityFreeSensorState: {
    ...legacyMigrationBase.heatCapacityFreeSensorState,
    displayPressureMv: 37.125,
    displayTemperatureMv: 1501.45,
    sensorTemperatureK: 298.7,
    nextSampleAtS: 42.1,
    pressureHistory: [
      { atS: 40, valueMv: 37 },
      { atS: 41, valueMv: 37.0625 },
      { atS: 42, valueMv: 37.125 },
    ],
    pressureSlopeMvPerS: 0.0625,
    temperatureSlopeMvPerS: -0.25,
    temperatureHistory: [
      { atS: 40, valueMv: 1501.95 },
      { atS: 41, valueMv: 1501.7 },
      { atS: 42, valueMv: 1501.45 },
    ],
  },
  heatCapacityReleaseState: {
    phase: 'releasing' as const,
    purpose: 'release' as const,
    attemptId: 3,
    phaseStartedAtS: 41.4,
    openingStartedAtS: 40.98,
    openingCompletedAtS: 41.4,
    closeCommandAtS: null,
    closingCompletedAtS: null,
    releaseDurationS: 0.6,
    formedRelease: true,
    quickToggle: false,
  },
  heatCapacityFreeRollbackSnapshots: {
    afterPowerOn: legacyOpeningRollback,
    beforePump: legacyReleasingRollback,
    beforeRelease: legacyClosedAfterReleaseRollback,
  },
  heatCapacityFreeBatch: {
    ...legacyMigrationBase.heatCapacityFreeBatch,
    nextTrialSequence: 3,
  },
  heatCapacityFreeTraceStore: legacyReferenceParts.traceStore,
  heatCapacityFreeTrials: [
    {
      ...legacyReferenceTrial,
      batchMembership: {
        version: 1 as const,
        batchId: legacyMigrationBatchId,
        sequence: 1,
      },
    },
    {
      ...legacyBlockedTrial,
      batchMembership: {
        version: 1 as const,
        batchId: legacyMigrationBatchId,
        sequence: 2,
      },
    },
  ],
  heatCapacityGuidePhysicsState: {
    ...legacyMigrationBase.heatCapacityGuidePhysicsState,
    simulationTimeS: 650,
    gasAmountRatio: 1.08,
    gasTemperatureK: 299.45,
    wallTemperatureK: 298.8,
    pumpStrokeCount: 4,
    lastPumpStrokeAtS: 44,
    lastPumpValveOpenedAtS: 40,
    lastPumpValveClosedAtS: 45,
    releaseStarted: true,
    lastStopcockOpenedAtS: 346,
    lastStopcockClosedAtS: 346.65,
    currentStopcockOpenDurationS: 0,
  },
  heatCapacityGuideTemperatureSensorState: { temperatureK: 299.45 },
  heatCapacityGuideWorkflow: {
    ...legacyMigrationBase.heatCapacityGuideWorkflow,
    step: 'u2Waiting' as const,
    speedMultiplier: 4 as const,
    paused: true,
    waitStartedAtS: 346.65,
    waitStage: 'u2' as const,
    strongReminderActive: true,
    strongReminderTargetControlId: 'recordU2',
    wrongActionCount: 3,
  },
  heatCapacityGuideTrial: legacyGuideTrial,
};

const prepareLegacy423MigrationFixture = (legacyEnvelope: ReturnType<typeof convertHeatEnvelopeToLegacy423>) => {
  const payload = legacyEnvelope.files[0].payload as any;
  payload.free.uiReplay.pressureSignalRawReadoutMv = 37.125;
  payload.free.uiReplay.pressureSignalReadoutMv = 36.875;
  payload.free.experimentGroupStatus = 'running';
  payload.free.real.experimentGroupStatus = 'running';
  payload.free.activeRunConfigSnapshot = structuredClone(payload.free.config);
  payload.free.real.activeRunConfigSnapshot = structuredClone(payload.free.config);
  const alignLegacyOpenStopcockFixture = (
    state: any,
    stopcockFlowOpen: unknown,
  ) => {
    if (!state || stopcockFlowOpen !== true) return;
    state.lastStopcockClosedAtS = state.lastStopcockOpenedAtS - 0.3;
    state.currentStopcockOpenDurationS += 0.028;
  };
  alignLegacyOpenStopcockFixture(
    payload.free.runtime,
    payload.free.controls.stopcockFlowOpen,
  );
  alignLegacyOpenStopcockFixture(
    payload.free.real.physicsState,
    payload.free.real.stopcockFlowOpen,
  );
  const mutateLegacyDomain = (domain: any) => {
    domain.trials[1].blockedReason = 'missing-u0';
    const branch = domain.traceStore.traceTrials[0].branches[0];
    // Keep the release-start event: deleting authoritative trace linkage is
    // now a quarantine case, not a repairable legacy-cache migration.
    const releaseSample = branch.samples.find((sample: any) => (
      sample.physical.releaseStarted === true && sample.controls.stopcockFlowOpen === true
    ));
    releaseSample.physical.releaseStarted = true;
    releaseSample.physical.currentStopcockOpenDurationS = 0;
    releaseSample.controls.stopcockFlowOpen = true;
    releaseSample.controls.stopcockOpen = true;
  };
  mutateLegacyDomain(payload.free);
  mutateLegacyDomain(payload.free.real);
  return legacyEnvelope;
};

const legacy423FreeEnvelope = prepareLegacy423MigrationFixture(convertHeatEnvelopeToLegacy423(
  encodeWorkbenchStorageEnvelope([legacyMigrationSource], legacyMigrationSource.id, 'preview', 1001),
));
const legacy423FreePayload = legacy423FreeEnvelope.files[0].payload as any;
assertClose(legacy423FreePayload.common.experimentProfile.stableTemperatureMv, 1499.17);
assertClose(legacy423FreePayload.common.experimentProfile.releaseTemperatureLowMv, 1498.37);
assertClose(legacy423FreePayload.common.experimentProfile.recoveryTemperatureMv, 1498.97);
assert.equal(legacy423FreePayload.free.uiReplay.pressureSignalRawReadoutMv, 37.125);
assert.equal(legacy423FreePayload.free.uiReplay.pressureSignalReadoutMv, 36.875);
assert.notEqual(
  legacy423FreePayload.free.uiReplay.pressureSignalRawReadoutMv,
  legacy423FreePayload.free.uiReplay.pressureSignalReadoutMv,
  'the legacy fixture must distinguish raw and displayed pressure signals',
);
const legacy423FreeDecoded = decodeWorkbenchStorageEnvelope(legacy423FreeEnvelope);
assert.deepEqual(legacy423FreeDecoded.diagnostics, []);
assert.equal(legacy423FreeDecoded.session.files.length, 1);
const legacy423FreeFile = legacy423FreeDecoded.session.files[0];
assert.equal(legacy423FreeFile.kind, 'heatCapacity');
if (legacy423FreeFile.kind !== 'heatCapacity') throw new Error('expected migrated v4.2.3 Free file');
assert.equal(legacy423FreeFile.heatCapacityFreePreheatCompleted, true);
assert.equal(legacy423FreeFile.heatCapacityModeSessions.schemaVersion, 2);
assertClose(
  legacy423FreeFile.heatCapacityExperimentProfile?.stableTemperatureMv ?? NaN,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV + 0.15,
);
assertClose(
  legacy423FreeFile.heatCapacityExperimentProfile?.releaseTemperatureLowMv ?? NaN,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV - 0.85,
);
assertClose(
  legacy423FreeFile.heatCapacityExperimentProfile?.recoveryTemperatureMv ?? NaN,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV - 0.1,
);
assert.equal(legacy423FreeFile.heatCapacityReleaseState.phase, 'releasing');
assert.equal(legacy423FreeFile.heatCapacityReleaseState.purpose, 'release');
assert.equal(legacy423FreeFile.heatCapacityFreeRealDomain.releaseState.phase, 'releasing');
assert.equal(legacy423FreeFile.heatCapacityFreeRealDomain.releaseState.purpose, 'release');
const currentFreePhysicsConfig = createDefaultHeatCapacityFreePhysicsConfig();
assert.equal(
  legacy423FreeFile.heatCapacityFreePhysicsConfig.pumpAmountGainRatio,
  currentFreePhysicsConfig.pumpAmountGainRatio,
  'the v4.2.3 fixed pump gain must migrate to the current runtime constant',
);
assert.equal(
  legacy423FreeFile.heatCapacityFreePhysicsConfig.stopcockFlowRate,
  currentFreePhysicsConfig.stopcockFlowRate,
  'the v4.2.3 fixed stopcock flow rate must migrate to the current runtime constant',
);
assert.equal(
  legacy423FreeFile.heatCapacityFreeActiveRunConfigSnapshot?.physics.stopcockFlowRate,
  currentFreePhysicsConfig.stopcockFlowRate,
  'the active config snapshot must stay aligned with the migrated live physics config',
);
assert.equal(legacy423FreeFile.heatCapacityFreePhysicsState.lastStopcockClosedAtS, null);
assertClose(
  legacy423FreeFile.heatCapacityFreePhysicsState.currentStopcockOpenDurationS,
  legacy423FreeFile.heatCapacityFreePhysicsState.simulationTimeS -
    (legacy423FreeFile.heatCapacityFreePhysicsState.lastStopcockOpenedAtS ?? 0),
  'an open v4.2.3 stopcock must receive a canonical timing projection',
);
assert.equal(
  legacy423FreeFile.heatCapacityFreeRealDomain.physicsState.lastStopcockClosedAtS,
  null,
);
assert.equal(legacy423FreeFile.heatCapacityFreeTraceVersion, HEAT_CAPACITY_FREE_TRACE_VERSION);
assert.equal(legacy423FreeFile.heatCapacityFreeTraceStore.traceTrials.length, 1);
assert.equal(
  legacy423FreeFile.heatCapacityFreeTraceStore.traceTrials[0]?.configSnapshot.version,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
);
assert.equal(
  legacy423FreeFile.heatCapacityFreeTraceStore.traceTrials[0]?.configSnapshot.physics.stopcockFlowRate,
  5.25,
  'completed v4.2.3 trace snapshots must retain their historical flow-rate identity',
);
assert.equal(
  legacy423FreeFile.heatCapacityFreeSensorConfig.temperatureMvAtAmbient,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
);
assert.equal(
  legacy423FreeFile.heatCapacityFreeSensorConfig.temperatureMvPerK,
  HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
);
assertClose(legacy423FreeFile.temperatureSignalMv, 1501.45);
assertClose(legacy423FreeFile.temperatureSignalTargetMv, 1497.95);
assertClose(legacy423FreeFile.temperatureDisplayJitterOffset, 0.35);
assertClose(legacy423FreeFile.pressureSignalMvRaw, 37.125);
assertClose(legacy423FreeFile.pressureSignalMvDisplayed, 36.875);
assert.notEqual(legacy423FreeFile.pressureSignalMvRaw, legacy423FreeFile.pressureSignalMvDisplayed);
assertClose(legacy423FreeFile.heatCapacityFreeSensorState.displayTemperatureMv, 1501.45);
assertClose(legacy423FreeFile.heatCapacityFreeSensorState.sensorTemperatureK, 298.7);
assertClose(legacy423FreeFile.heatCapacityFreeSensorState.temperatureSlopeMvPerS, -0.25);
[1501.95, 1501.7, 1501.45].forEach((expected, index) => {
  assertClose(
    legacy423FreeFile.heatCapacityFreeSensorState.temperatureHistory[index]?.valueMv ?? NaN,
    expected,
  );
});
assertClose(legacy423FreeFile.heatCapacityFreeRecordConfig.temperatureStableSlopeMvPerS, 0.375);
assertClose(legacy423FreeFile.heatCapacityFreeRecordConfig.temperatureAmbientToleranceMv, 1.625);
assertClose(legacy423FreeFile.heatCapacityFreeParameterDraft.temperatureStableSlopeMvPerS, 0.375);
assertClose(legacy423FreeFile.heatCapacityFreeParameterDraft.temperatureAmbientToleranceMv, 1.625);
assertClose(
  legacy423FreeFile.heatCapacityProcessSamples.stableBeforeReleaseSample?.temperatureSignalMv ?? NaN,
  1500.2,
);
const migratedLegacyTraceBranch = legacy423FreeFile.heatCapacityFreeTraceStore
  .traceTrials[0]?.branches[0];
const migratedLegacyTraceFirstControls = migratedLegacyTraceBranch?.samples[0]?.controls;
const migratedReleaseStartEvents = migratedLegacyTraceBranch?.events.filter((event) => (
  event.type === 'release-start'
)) ?? [];
const migratedLegacyTraceReleaseSample = migratedLegacyTraceBranch?.samples.find((sample) => (
  sample.id === migratedReleaseStartEvents[0]?.traceSampleId
));
assert.equal(migratedLegacyTraceFirstControls?.releaseFlowOpen, false);
assert.equal(migratedLegacyTraceFirstControls?.releasePhase, 'opening');
assert.equal('stopcockFlowOpen' in (migratedLegacyTraceFirstControls ?? {}), false);
assert.equal(migratedLegacyTraceReleaseSample?.controls.releaseFlowOpen, true);
assert.equal(migratedLegacyTraceReleaseSample?.controls.releasePhase, 'releasing');
assertClose(migratedLegacyTraceReleaseSample?.sensor.displayTemperatureMv ?? NaN, 1498.6);
assertClose(migratedLegacyTraceReleaseSample?.sensor.temperatureSlopeMvPerS ?? NaN, 0.02);
assert.equal(migratedReleaseStartEvents.length, 1, 'the first legacy physical release sample should synthesize one release-start event');
assert.equal(migratedReleaseStartEvents[0]?.traceSampleId, migratedLegacyTraceReleaseSample?.id);
const migratedLegacyTraceSampleById = new Map(
  migratedLegacyTraceBranch?.samples.map((sample) => [sample.id, sample]) ?? [],
);
const legacy423SourceTraceSamples =
  legacy423FreePayload.free.traceStore.traceTrials[0].branches[0].samples;
assert.equal(
  migratedLegacyTraceBranch?.samples.length,
  legacy423SourceTraceSamples.length,
  'sparse legacy event references must not synthesize samples into the authoritative trace',
);
const migratedLegacyDisplayRelations = migratedLegacyTraceBranch?.events.filter((event) => (
  event.payload?.hslLegacyDisplayRelationProvenance ===
    HEAT_CAPACITY_LEGACY_423_DISPLAY_EVENT_SAMPLE_RELATION_PROVENANCE
)) ?? [];
assert.ok(
  migratedLegacyDisplayRelations.length > 0,
  'sparse v4.2.3 event references must retain an explicit display-only legacy relation',
);
assert.equal(
  migratedLegacyDisplayRelations.every((event) => (
    event.payload?.hslLegacyRelationUsage === 'display-only' &&
    event.payload?.hslLegacySourceEventAtS === event.atS &&
    typeof event.payload?.hslLegacySourceTraceSampleId === 'string' &&
    typeof event.payload?.hslLegacySourceTraceSampleAtS === 'number' &&
    event.payload?.hslLegacyLinkedTraceSampleId === event.traceSampleId &&
    event.payload?.hslLegacySourceTraceSampleAtS ===
      migratedLegacyTraceSampleById.get(event.traceSampleId)?.atS
  )),
  true,
  'each legacy display relation must preserve source event/sample identity, time, and provenance',
);
const migratedLegacyReview = selectHeatCapacityFreeProcessReview({
  trials: legacy423FreeFile.heatCapacityFreeTrials,
  traceStore: legacy423FreeFile.heatCapacityFreeTraceStore,
  selectedTrialId: legacy423FreeFile.heatCapacityFreeTrials[0]?.id,
});
assert.equal(
  migratedLegacyDisplayRelations.some((event) => (
    migratedLegacyReview.chart.actualTrace.some((point) => (
      Math.abs(point.timeS - event.atS) <= 0.000001
    ))
  )),
  false,
  'display-only legacy event relations must not inject synthetic points into the process-review curve',
);
const migratedLegacyCalculationTrial = legacy423FreeFile.heatCapacityFreeTrials[0];
assert.ok(migratedLegacyCalculationTrial?.configSnapshot);
const recalculatedLegacySignals = calculateFreeHeatCapacityTrialSignals(
  migratedLegacyCalculationTrial,
  {
    atmosphericPressureKPa:
      migratedLegacyCalculationTrial.configSnapshot.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa:
      migratedLegacyCalculationTrial.configSnapshot.sensor.pressureMvPerKPa,
  },
);
assert.equal(
  recalculatedLegacySignals?.gamma,
  migratedLegacyCalculationTrial.correctedSignals?.gamma,
  'authoritative heat-capacity calculation must remain record-based and ignore display-only relations',
);
assert.deepEqual(
  migratedLegacyTraceBranch?.events.map((event) => event.index),
  migratedLegacyTraceBranch?.events.map((_, index) => index + 1),
  'synthesizing release-start must preserve a strictly increasing canonical event index order',
);
assert.deepEqual(
  migratedLegacyTraceBranch?.events.map((event) => event.atS),
  [...(migratedLegacyTraceBranch?.events.map((event) => event.atS) ?? [])]
    .sort((left, right) => left - right),
  'synthesizing release-start must preserve chronological event order',
);

const applyLegacy423PumpStrokeAnchor = (domain: any) => {
  const traceTrial = domain.traceStore.traceTrials[0];
  const branch = traceTrial.branches[0];
  const trial = domain.trials[0];
  const shiftRecord = (
    eventType: 'record-u1' | 'record-u2',
    recordKey: 'u1' | 'u2',
    atS: number,
  ) => {
    const event = branch.events.find((entry: any) => entry.type === eventType);
    const sample = branch.samples.find((entry: any) => entry.id === event.traceSampleId);
    event.atS = atS;
    sample.atS = atS;
    trial[recordKey].atS = atS;
  };
  shiftRecord('record-u1', 'u1', 319);
};

const legacy423PumpStrokeAnchorEnvelope = structuredClone(legacy423FreeEnvelope);
const legacy423PumpStrokeAnchorPayload = legacy423PumpStrokeAnchorEnvelope.files[0].payload as any;
applyLegacy423PumpStrokeAnchor(legacy423PumpStrokeAnchorPayload.free);
applyLegacy423PumpStrokeAnchor(legacy423PumpStrokeAnchorPayload.free.real);
const legacy423PumpStrokeAnchorDecoded = decodeWorkbenchStorageEnvelope(legacy423PumpStrokeAnchorEnvelope);
assert.deepEqual(
  legacy423PumpStrokeAnchorDecoded.diagnostics,
  [],
  'a v4.2.3 U1 record timed from the last pump stroke must preserve the historical experiment',
);
assert.equal(legacy423PumpStrokeAnchorDecoded.session.files.length, 1);
const legacy423PumpStrokeAnchorFile = legacy423PumpStrokeAnchorDecoded.session.files[0];
const legacy423PumpStrokeAnchorRoundTrip = encodeWorkbenchStorageEnvelope(
  [legacy423PumpStrokeAnchorFile],
  legacy423PumpStrokeAnchorFile.id,
  'preview',
  Date.now(),
);
const legacy423PumpStrokeAnchorRoundTripPayload =
  legacy423PumpStrokeAnchorRoundTrip.files[0].payload as any;
for (const domain of [
  legacy423PumpStrokeAnchorRoundTripPayload.free,
  legacy423PumpStrokeAnchorRoundTripPayload.free.real,
]) {
  const recordU1Events = domain.traceStore.traceTrials.flatMap((traceTrial: any) => (
    traceTrial.branches.flatMap((branch: any) => (
      branch.events.filter((event: any) => event.type === 'record-u1')
    ))
  ));
  assert.ok(recordU1Events.length > 0);
  assert.equal(
    recordU1Events.every((event: any) => (
      event.payload?.hslMigrationProvenance ===
        'legacy-4.2.3/u1-pump-stroke-anchor'
    )),
    true,
    'the explicit migration provenance must survive the first canonical current-format write',
  );
}
const unmarkedLegacy423PumpStrokeAnchorRoundTrip =
  structuredClone(legacy423PumpStrokeAnchorRoundTrip);
const unmarkedLegacy423PumpStrokeAnchorPayload =
  unmarkedLegacy423PumpStrokeAnchorRoundTrip.files[0].payload as any;
for (const domain of [
  unmarkedLegacy423PumpStrokeAnchorPayload.free,
  unmarkedLegacy423PumpStrokeAnchorPayload.free.real,
]) {
  for (const traceTrial of domain.traceStore.traceTrials) {
    for (const branch of traceTrial.branches) {
      for (const event of branch.events) {
        if (event.type === 'record-u1' && event.payload) {
          delete event.payload.hslMigrationProvenance;
        }
      }
    }
  }
}
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(
    unmarkedLegacy423PumpStrokeAnchorRoundTrip,
  ).diagnostics.map((diagnostic) => diagnostic.code),
  [],
  'an early Free U1 record remains a quality result even when optional legacy wait-anchor provenance is absent',
);

assert.equal(legacy423FreeFile.heatCapacityFreeTrials[1]?.blockedReason, 'invalid-sequence');
assert.equal(
  legacy423FreeFile.heatCapacityFreeTrials[0]?.standardReferenceSnapshot?.generatorVersion,
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
  'a valid v1 standard reference should be rebuilt as the current deterministic v3 snapshot',
);
assert.deepEqual(
  legacy423FreeFile.heatCapacityFreeRollbackSnapshots,
  { afterPowerOn: null, beforePump: null, beforeRelease: null },
  'unreachable legacy rollback checkpoints must be discarded without losing the experiment file',
);
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.step, 'closePowerRequired');
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.paused, true);
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.waitStartedAtS, null);
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.waitStage, null);
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.strongReminderActive, true);
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.strongReminderTargetControlId, 'powerSwitch');
assert.equal(legacy423FreeFile.heatCapacityGuideWorkflow.wrongActionCount, 3);
assert.equal(legacy423FreeFile.heatCapacityGuidePhysicsState.simulationTimeS, 650);
assert.equal(legacy423FreeFile.heatCapacityGuidePhysicsState.gasAmountRatio, 1.08);
assert.equal(legacy423FreeFile.heatCapacityGuidePhysicsState.gasTemperatureK, 299.45);
assert.equal(legacy423FreeFile.heatCapacityGuidePhysicsState.wallTemperatureK, 298.8);
assert.equal(legacy423FreeFile.heatCapacityGuidePhysicsState.pumpStrokeCount, 4);
assert.notEqual(
  legacy423FreeFile.heatCapacityGuidePhysicsState.releaseReference,
  null,
  'legacy releaseStarted state must receive a bounded release reference during migration',
);
assert.ok((legacy423FreeFile.heatCapacityGuidePhysicsState.amountMol ?? 0) > 0);
assert.ok((legacy423FreeFile.heatCapacityGuidePhysicsState.internalEnergyJ ?? 0) > 0);
assert.ok((legacy423FreeFile.heatCapacityGuidePhysicsState.referenceAmountMol ?? 0) > 0);
assert.equal(legacy423FreeFile.heatCapacityGuideTemperatureSensorState.temperatureK, 299.45);
assert.equal(legacy423FreeFile.heatCapacityGuideTrial?.id, 'legacy-guide-trial');
assertClose(legacy423FreeFile.heatCapacityGuideTrial?.u0?.displayTemperatureMv ?? NaN, 1500.2);
assertClose(legacy423FreeFile.heatCapacityGuideTrial?.u1?.displayTemperatureMv ?? NaN, 1501.4);
assertClose(legacy423FreeFile.heatCapacityGuideTrial?.u2?.displayTemperatureMv ?? NaN, 1497.9);
const migratedFreeSession = legacy423FreeFile.heatCapacityModeSessions.free;
const migratedGuideSession = legacy423FreeFile.heatCapacityModeSessions.guide;
assert.equal(migratedFreeSession.status, 'suspended');
assert.equal(migratedFreeSession.snapshot?.mode, 'free');
if (migratedFreeSession.snapshot?.mode !== 'free') throw new Error('expected migrated Free mode snapshot');
assert.equal(migratedFreeSession.snapshot.free.heatCapacityFreeTrials.length, 2);
assert.equal(migratedFreeSession.snapshot.free.heatCapacityFreeTraceStore.traceTrials.length, 1);
assert.equal('uiReplay' in migratedFreeSession.snapshot, false);
assert.equal('heatCapacityModeSessions' in migratedFreeSession.snapshot.common, false);
assert.equal(migratedGuideSession.status, 'suspended');
assert.equal(migratedGuideSession.snapshot?.mode, 'guide');
if (migratedGuideSession.snapshot?.mode !== 'guide') throw new Error('expected migrated Guide mode snapshot');
assert.equal(migratedGuideSession.snapshot.guide.heatCapacityGuideTrial?.id, 'legacy-guide-trial');
assert.equal(migratedGuideSession.snapshot.guide.heatCapacityGuideWorkflow.step, 'closePowerRequired');
assert.equal('uiReplay' in migratedGuideSession.snapshot, false);
assert.equal('heatCapacityModeSessions' in migratedGuideSession.snapshot.common, false);
const renormalizedLegacy423ModeSessions = normalizeHeatCapacityModeSessionStore(
  structuredClone(legacy423FreeFile.heatCapacityModeSessions),
  legacy423FreeFile.id,
);
assert.equal(
  renormalizedLegacy423ModeSessions.guide.status,
  legacy423FreeFile.heatCapacityModeSessions.guide.status,
  'the migrated Guide mode session must survive canonical normalization',
);
const findFirstPersistenceDifference = (
  left: unknown,
  right: unknown,
  path = 'modeSessions',
): string | null => {
  if (Object.is(left, right)) return null;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return `${path}.length`;
    }
    for (let index = 0; index < left.length; index += 1) {
      const difference = findFirstPersistenceDifference(left[index], right[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return path;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  if (leftKeys.join('\0') !== rightKeys.join('\0')) return `${path}.keys`;
  for (const key of leftKeys) {
    const difference = findFirstPersistenceDifference(
      leftRecord[key],
      rightRecord[key],
      `${path}.${key}`,
    );
    if (difference) return difference;
  }
  return null;
};
assert.equal(
  findFirstPersistenceDifference(
    renormalizedLegacy423ModeSessions,
    legacy423FreeFile.heatCapacityModeSessions,
  ),
  null,
  'a migrated v4.2.3 mode-session store must already be canonical before its first IndexedDB save',
);
const legacy423ActiveFreeCapturedAtMs =
  legacy423FreeFile.heatCapacityModeSessions.free.capturedAtMs;
assert.notEqual(legacy423ActiveFreeCapturedAtMs, null);
const legacy423FreeIndexedDbRecords = createPersistenceRecords(
  'legacy-423-active-free',
  {
    files: [legacy423FreeFile],
    closedFiles: [],
    activeFileId: legacy423FreeFile.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
    migrationModeCaptureOverrides: legacy423FreeDecoded.migrationModeCaptureOverrides,
  },
  'pending-verification',
);
const legacy423FreeIndexedDbModeStore = {
  schemaVersion: 2 as const,
  demo: legacy423FreeIndexedDbRecords.modeRecords.find((record) => record.mode === 'demo')!.entry,
  guide: legacy423FreeIndexedDbRecords.modeRecords.find((record) => record.mode === 'guide')!.entry,
  free: legacy423FreeIndexedDbRecords.modeRecords.find((record) => record.mode === 'free')!.entry,
};
assert.deepEqual(
  normalizeHeatCapacityModeSessionStore(
    structuredClone(legacy423FreeIndexedDbModeStore),
    legacy423FreeFile.id,
  ),
  legacy423FreeIndexedDbModeStore,
  'recapturing the active migrated v4.2.3 Free file for IndexedDB must not overwrite its canonical mode session with stale top-level common runtime fields',
);
assert.equal(
  legacy423FreeIndexedDbModeStore.free.snapshot?.common.simulationTimeS,
  legacy423FreeFile.heatCapacityFreePhysicsState.simulationTimeS,
  'the active migrated v4.2.3 Free projection must carry the domain simulation clock before IndexedDB capture',
);
assert.deepEqual(legacy423FreeIndexedDbRecords.meta.openFileIds, [legacy423FreeFile.id]);
assert.deepEqual(legacy423FreeIndexedDbRecords.meta.closedFileIds, []);
assert.throws(
  () => createPersistenceRecords(
    'legacy-423-active-free-ready',
    {
      files: [legacy423FreeFile],
      closedFiles: [],
      activeFileId: legacy423FreeFile.id,
      selectedPanel: 'preview',
      refreshSession: null,
      activeModeCheckpoint: null,
      preserveActiveHeatCapacityModeSession: false,
      migrationModeCaptureOverrides: legacy423FreeDecoded.migrationModeCaptureOverrides,
    },
    'ready',
  ),
  /only valid during pending migration verification/,
  'a current ready write must not be able to opt into the v4.2.3 migration-only capture override',
);

const legacy423FreeRefreshCapturedAtMs = legacy423ActiveFreeCapturedAtMs! + 500;
const legacy423FreeRefreshSession = createWorkbenchHeatCapacityRefreshSession(
  legacy423FreeFile.id,
  'free',
  legacy423FreeRefreshCapturedAtMs,
);
const legacy423FreeRefreshCheckpoint = createHeatCapacityModeUiCheckpoint({
  fileId: legacy423FreeFile.id,
  checkpointId: legacy423FreeRefreshSession.checkpointId,
  capturedAtMs: legacy423FreeRefreshCapturedAtMs,
  mode: 'free',
  scene: {
    focusMode: 'none',
    cameraPose: null,
    cameraTransition: null,
    ultraVisualState: null,
    hardSphereVisualCheckpoint: null,
    focusSession: null,
  },
  pumpAnimation: null,
  payload: { kind: 'free' },
});
const legacy423FreeRefreshIndexedDbRecords = createPersistenceRecords(
  'legacy-423-active-free-refresh',
  {
    files: [legacy423FreeFile],
    closedFiles: [],
    activeFileId: legacy423FreeFile.id,
    selectedPanel: 'preview',
    refreshSession: legacy423FreeRefreshSession,
    activeModeCheckpoint: legacy423FreeRefreshCheckpoint,
    preserveActiveHeatCapacityModeSession: false,
    migrationModeCaptureOverrides: legacy423FreeDecoded.migrationModeCaptureOverrides,
  },
  'pending-verification',
);
const legacy423FreeRefreshModeRecord = legacy423FreeRefreshIndexedDbRecords.modeRecords.find(
  (record) => record.mode === 'free',
);
assert.equal(
  legacy423FreeRefreshModeRecord?.entry.capturedAtMs,
  legacy423FreeRefreshCapturedAtMs,
);
assert.deepEqual(
  legacy423FreeRefreshModeRecord?.entry.uiCheckpoint,
  legacy423FreeRefreshCheckpoint,
);
assert.equal(
  legacy423FreeRefreshIndexedDbRecords.meta.refreshMetadata?.capturedAtMs,
  legacy423FreeRefreshCapturedAtMs,
);
const legacy423FreeRoundTrip = encodeWorkbenchStorageEnvelope(
  [legacy423FreeFile],
  legacy423FreeFile.id,
  'preview',
  1003,
);
const legacy423FreeRoundTripUi = (legacy423FreeRoundTrip.files[0].payload as any).free.uiReplay;
assertClose(legacy423FreeRoundTripUi.pressureSignalMvRaw, 37.125);
assertClose(legacy423FreeRoundTripUi.pressureSignalMvDisplayed, 36.875);
const legacy423FreeSecondStartup = decodeWorkbenchStorageEnvelope(legacy423FreeRoundTrip);
assert.deepEqual(
  legacy423FreeSecondStartup.diagnostics,
  [],
  'a migrated v4.2.3 workspace must remain readable on its second startup',
);
assert.equal(legacy423FreeSecondStartup.session.files.length, 1);
const legacy423FreeSecondStartupFile = legacy423FreeSecondStartup.session.files[0];
assert.equal(legacy423FreeSecondStartupFile.kind, 'heatCapacity');
if (legacy423FreeSecondStartupFile.kind !== 'heatCapacity') {
  throw new Error('expected the second startup to retain the migrated v4.2.3 Free file');
}
assert.equal(legacy423FreeSecondStartupFile.heatCapacityModeSessions.free.status, 'suspended');
assert.equal(
  legacy423FreeSecondStartupFile.heatCapacityModeSessions.free.snapshot?.mode === 'free'
    ? legacy423FreeSecondStartupFile.heatCapacityModeSessions.free.snapshot.free.heatCapacityFreeTrials.length
    : -1,
  2,
  'the second startup must retain both migrated Free trials',
);

const legacy423GuideSource = {
  ...storeHeatCapacityFreeRuntimeFieldsInDomain(legacyMigrationSource, 'real'),
  heatCapacityMode: 'guide' as const,
  heatCapacityTeachingStatus: 'running' as const,
  glassPistonState: 'closed' as const,
  stopcockAngleDeg: 0,
};
const legacy423GuideEnvelope = prepareLegacy423MigrationFixture(convertHeatEnvelopeToLegacy423(
  encodeWorkbenchStorageEnvelope([legacy423GuideSource], legacy423GuideSource.id, 'preview', 1002),
));
const legacy423GuideDecoded = decodeWorkbenchStorageEnvelope(legacy423GuideEnvelope);
assert.deepEqual(legacy423GuideDecoded.diagnostics, []);
const legacy423GuideFile = legacy423GuideDecoded.session.files[0];
assert.equal(legacy423GuideFile.kind, 'heatCapacity');
if (legacy423GuideFile.kind !== 'heatCapacity') throw new Error('expected migrated v4.2.3 Guide file');
assert.ok(Number.isFinite(legacy423GuideFile.heatCapacityGuideTemperatureSensorState.temperatureK));
assert.equal(legacy423GuideFile.heatCapacityMode, 'guide');
assert.equal(legacy423GuideFile.heatCapacityReleaseState.phase, 'closedAfterRelease');
assert.equal(legacy423GuideFile.heatCapacityGuideWorkflow.step, 'closePowerRequired');
assert.equal(legacy423GuideFile.heatCapacityGuideTrial?.id, 'legacy-guide-trial');
assert.equal(legacy423GuideFile.heatCapacityModeSessions.free.status, 'suspended');
assert.equal(
  legacy423GuideFile.heatCapacityModeSessions.free.snapshot?.mode === 'free'
    ? legacy423GuideFile.heatCapacityModeSessions.free.snapshot.free.heatCapacityFreeTrials.length
    : -1,
  2,
  'an active Guide migration must retain the full suspended Free history',
);
assert.equal(legacy423GuideFile.heatCapacityModeSessions.guide.status, 'suspended');
assert.equal(
  legacy423GuideFile.heatCapacityModeSessions.guide.snapshot?.mode === 'guide'
    ? legacy423GuideFile.heatCapacityModeSessions.guide.snapshot.guide.heatCapacityGuideTrial?.id
    : null,
  'legacy-guide-trial',
  'an active Guide migration must retain its canonical Guide history',
);
const legacy423GuideIndexedDbRecords = createPersistenceRecords(
  'legacy-423-active-guide',
  {
    files: [legacy423GuideFile],
    closedFiles: [],
    activeFileId: legacy423GuideFile.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
    migrationModeCaptureOverrides: legacy423GuideDecoded.migrationModeCaptureOverrides,
  },
  'pending-verification',
);
const legacy423GuideIndexedDbModeStore = {
  schemaVersion: 2 as const,
  demo: legacy423GuideIndexedDbRecords.modeRecords.find((record) => record.mode === 'demo')!.entry,
  guide: legacy423GuideIndexedDbRecords.modeRecords.find((record) => record.mode === 'guide')!.entry,
  free: legacy423GuideIndexedDbRecords.modeRecords.find((record) => record.mode === 'free')!.entry,
};
assert.deepEqual(
  normalizeHeatCapacityModeSessionStore(
    structuredClone(legacy423GuideIndexedDbModeStore),
    legacy423GuideFile.id,
  ),
  legacy423GuideIndexedDbModeStore,
  'the active v4.2.3 Guide capture override must produce three canonical split mode records',
);
assert.notEqual(legacy423GuideIndexedDbModeStore.guide.status, 'empty');

const legacy423GuideSourceCapturedAtMs =
  legacy423GuideFile.heatCapacityModeSessions.guide.capturedAtMs!;
const legacy423GuideCapturedAtMs = legacy423GuideSourceCapturedAtMs + 500;
const legacy423GuideRefreshSession = createWorkbenchHeatCapacityRefreshSession(
  legacy423GuideFile.id,
  'guide',
  legacy423GuideCapturedAtMs,
);
const legacy423GuideRefreshCheckpoint = createHeatCapacityModeUiCheckpoint({
  fileId: legacy423GuideFile.id,
  checkpointId: legacy423GuideRefreshSession.checkpointId,
  capturedAtMs: legacy423GuideCapturedAtMs,
  mode: 'guide',
  scene: {
    focusMode: 'none',
    cameraPose: null,
    cameraTransition: null,
    ultraVisualState: null,
    hardSphereVisualCheckpoint: null,
    focusSession: null,
  },
  pumpAnimation: null,
  payload: {
    kind: 'guide',
    guide: {
      missCount: 0,
      normalReminder: null,
      strongReminder: { active: false, controlId: null },
      lessonDialog: null,
      shownLessonIds: [],
      checklistViewedIndex: 0,
      pendingStrongReminder: null,
      baseStrongReminder: null,
    },
  },
});
const legacy423GuideRefreshIndexedDbRecords = createPersistenceRecords(
  'legacy-423-active-guide-refresh',
  {
    files: [legacy423GuideFile],
    closedFiles: [],
    activeFileId: legacy423GuideFile.id,
    selectedPanel: 'preview',
    refreshSession: legacy423GuideRefreshSession,
    activeModeCheckpoint: legacy423GuideRefreshCheckpoint,
    preserveActiveHeatCapacityModeSession: false,
    migrationModeCaptureOverrides: legacy423GuideDecoded.migrationModeCaptureOverrides,
  },
  'pending-verification',
);
const legacy423GuideRefreshModeRecord = legacy423GuideRefreshIndexedDbRecords.modeRecords.find(
  (record) => record.mode === 'guide',
);
assert.equal(legacy423GuideRefreshModeRecord?.entry.capturedAtMs, legacy423GuideCapturedAtMs);
assert.deepEqual(
  legacy423GuideRefreshModeRecord?.entry.uiCheckpoint,
  legacy423GuideRefreshCheckpoint,
);
assert.equal(
  legacy423GuideRefreshIndexedDbRecords.meta.refreshMetadata?.capturedAtMs,
  legacy423GuideCapturedAtMs,
);

const currentGuideEnvelope = encodeWorkbenchStorageEnvelope(
  [legacy423GuideFile],
  legacy423GuideFile.id,
  'preview',
  1004,
);
assert.equal(
  decodeWorkbenchStorageEnvelope(currentGuideEnvelope).session.files.length,
  1,
  'the migrated Guide fixture must form a valid current-schema baseline',
);

const legacy423CompletedGuideSource = completeHeatCapacityTeachingModeWorkbenchState({
  ...legacy423GuideFile,
  heatCapacityGuideWorkflow: {
    ...legacy423GuideFile.heatCapacityGuideWorkflow,
    step: 'completed' as const,
    paused: false,
    waitStartedAtS: null,
    waitStage: null,
    strongReminderActive: false,
    strongReminderTargetControlId: null,
    releaseCloseResumeAtMs: null,
  },
}, 1005);
const legacy423CompletedGuideEnvelope = prepareLegacy423MigrationFixture(convertHeatEnvelopeToLegacy423(
  encodeWorkbenchStorageEnvelope(
    [legacy423CompletedGuideSource],
    legacy423CompletedGuideSource.id,
    'preview',
    1005,
  ),
));
const legacy423CompletedGuideDecoded = decodeWorkbenchStorageEnvelope(legacy423CompletedGuideEnvelope);
assert.deepEqual(legacy423CompletedGuideDecoded.diagnostics, []);
const legacy423CompletedGuideFile = legacy423CompletedGuideDecoded.session.files[0];
assert.equal(legacy423CompletedGuideFile.kind, 'heatCapacity');
if (legacy423CompletedGuideFile.kind !== 'heatCapacity') {
  throw new Error('expected migrated v4.2.3 completed Guide file');
}
assert.equal(legacy423CompletedGuideFile.heatCapacityModeSessions.guide.status, 'completed');
assert.deepEqual(
  normalizeHeatCapacityModeSessionStore(
    structuredClone(legacy423CompletedGuideFile.heatCapacityModeSessions),
    legacy423CompletedGuideFile.id,
  ),
  legacy423CompletedGuideFile.heatCapacityModeSessions,
  'a migrated completed Guide session must be canonical before its first IndexedDB save',
);
const legacy423CompletedGuideSecondStartup = decodeWorkbenchStorageEnvelope(
  encodeWorkbenchStorageEnvelope(
    [legacy423CompletedGuideFile],
    legacy423CompletedGuideFile.id,
    'preview',
    1006,
  ),
);
assert.deepEqual(legacy423CompletedGuideSecondStartup.diagnostics, []);
assert.equal(legacy423CompletedGuideSecondStartup.session.files.length, 1);
const legacy423CompletedGuideSecondStartupFile = legacy423CompletedGuideSecondStartup.session.files[0];
assert.equal(legacy423CompletedGuideSecondStartupFile.kind, 'heatCapacity');
if (legacy423CompletedGuideSecondStartupFile.kind !== 'heatCapacity') {
  throw new Error('expected the second startup to retain the completed Guide file');
}
assert.equal(
  legacy423CompletedGuideSecondStartupFile.heatCapacityModeSessions.guide.status,
  'completed',
  'the second startup must retain the completed Guide mode session',
);

const assertLegacy423FileRejected = (
  candidate: typeof legacy423FreeEnvelope,
  message: string,
) => {
  const decoded = decodeWorkbenchStorageEnvelope(candidate);
  assert.equal(decoded.session.files.length, 0, message);
  assert.equal(
    decoded.diagnostics.some((entry) => (
      entry.code === 'invalid-file' && entry.fileId === candidate.files[0].id
    )),
    true,
    `${message} and produce a file-specific diagnostic`,
  );
};

const assertCurrentFileRejected = (
  candidate: ReturnType<typeof encodeWorkbenchStorageEnvelope>,
  message: string,
) => {
  const decoded = decodeWorkbenchStorageEnvelope(candidate);
  assert.equal(decoded.session.files.length, 0, message);
  assert.equal(
    decoded.diagnostics.some((entry) => (
      entry.code === 'invalid-file' && entry.fileId === candidate.files[0].id
    )),
    true,
    `${message} and produce a file-specific diagnostic`,
  );
};

const corruptedLegacyFixedFreeConfigEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyFixedFreeConfigPayload =
  corruptedLegacyFixedFreeConfigEnvelope.files[0].payload as any;
corruptedLegacyFixedFreeConfigPayload.free.real.physicsConfig.pumpAmountGainRatio = 0.004;
assertLegacy423FileRejected(
  corruptedLegacyFixedFreeConfigEnvelope,
  'a forged v4.2.3 fixed Free physics constant must not be replaced with a current default',
);

const corruptedLegacyFixedSnapshotEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyFixedSnapshotPayload =
  corruptedLegacyFixedSnapshotEnvelope.files[0].payload as any;
for (const domain of [
  corruptedLegacyFixedSnapshotPayload.free,
  corruptedLegacyFixedSnapshotPayload.free.real,
]) {
  domain.traceStore.traceTrials[0].configSnapshot.physics.recommendedPumpIntervalS = 0.2;
}
assertLegacy423FileRejected(
  corruptedLegacyFixedSnapshotEnvelope,
  'a forged v4.2.3 fixed trace-snapshot constant must not be silently canonicalized',
);

const corruptedLegacyFixedGuideConfigEnvelope = structuredClone(legacy423GuideEnvelope);
const corruptedLegacyFixedGuideConfigPayload =
  corruptedLegacyFixedGuideConfigEnvelope.files[0].payload as any;
corruptedLegacyFixedGuideConfigPayload.guided.physicsConfig.gamma = 1.67;
assertLegacy423FileRejected(
  corruptedLegacyFixedGuideConfigEnvelope,
  'a forged v4.2.3 fixed Guide physics constant must not be replaced with current defaults',
);

const createFocusModeCompatibilityEnvelope = () => {
  const candidate = structuredClone(legacy423FreeRoundTrip);
  const entry = (candidate.files[0].payload as any).common.modeSessions.free;
  entry.uiCheckpoint = {
    schemaFamily: 'hard-sphere-lab/heat-capacity-mode-ui-checkpoint',
    schemaVersion: 1,
    fileId: candidate.files[0].id,
    checkpointId: `${candidate.files[0].id}:focus-compatibility`,
    capturedAtMs: 1001,
    interruptedPreheatPolicy: 'restart-from-zero',
    mode: 'free',
    scene: {
      focusMode: 'none',
      cameraPose: null,
      cameraTransition: null,
      ultraVisualState: null,
      hardSphereVisualCheckpoint: null,
      focusSession: null,
    },
    pumpAnimation: null,
    payload: { kind: 'free' },
  };
  return candidate;
};

const missingFocusModeEnvelope = createFocusModeCompatibilityEnvelope();
const missingFocusModeScene = (missingFocusModeEnvelope.files[0].payload as any)
  .common.modeSessions.free.uiCheckpoint.scene;
delete missingFocusModeScene.focusMode;
assert.equal(
  decodeWorkbenchStorageEnvelope(missingFocusModeEnvelope).session.files.length,
  1,
  'a historical current-schema payload with no focusMode field should receive the narrow compatibility migration',
);

const corruptFocusModeEnvelope = createFocusModeCompatibilityEnvelope();
(corruptFocusModeEnvelope.files[0].payload as any)
  .common.modeSessions.free.uiCheckpoint.scene.focusMode = 'corrupt-focus-mode';
assertCurrentFileRejected(
  corruptFocusModeEnvelope,
  'an explicitly corrupt current focusMode must not use the missing-field compatibility migration',
);

const poweredCurrentFreePowerOffPhaseEnvelope = structuredClone(legacy423FreeRoundTrip);
const poweredCurrentFreePowerOffPhasePayload =
  poweredCurrentFreePowerOffPhaseEnvelope.files[0].payload as any;
poweredCurrentFreePowerOffPhasePayload.free.controls.powerOn = true;
poweredCurrentFreePowerOffPhasePayload.free.uiReplay.heatCapacityPhase = 'powerOff';
assertCurrentFileRejected(
  poweredCurrentFreePowerOffPhaseEnvelope,
  'an active powered Free payload must not claim the power-off runtime phase',
);

const runningTeachingCurrentFreeEnvelope = structuredClone(legacy423FreeRoundTrip);
const runningTeachingCurrentFreePayload = runningTeachingCurrentFreeEnvelope.files[0].payload as any;
runningTeachingCurrentFreePayload.common.teachingStatus = 'running';
assertCurrentFileRejected(
  runningTeachingCurrentFreeEnvelope,
  'an active Free payload must retain the idle teaching status',
);

const openPumpLateGuideEnvelope = structuredClone(currentGuideEnvelope);
const openPumpLateGuidePayload = openPumpLateGuideEnvelope.files[0].payload as any;
openPumpLateGuidePayload.free.controls.pumpValveOpen = true;
assertCurrentFileRejected(
  openPumpLateGuideEnvelope,
  'a late active Guide workflow must not restore with the pump valve open',
);

const openStopcockClosedGuideEnvelope = structuredClone(currentGuideEnvelope);
const openStopcockClosedGuidePayload = openStopcockClosedGuideEnvelope.files[0].payload as any;
openStopcockClosedGuidePayload.free.controls.stopcockOpen = true;
assertCurrentFileRejected(
  openStopcockClosedGuideEnvelope,
  'an active closed Guide release must not restore with an open stopcock control',
);

const idleTeachingCurrentGuideEnvelope = structuredClone(currentGuideEnvelope);
const idleTeachingCurrentGuidePayload = idleTeachingCurrentGuideEnvelope.files[0].payload as any;
idleTeachingCurrentGuidePayload.common.teachingStatus = 'idle';
assertCurrentFileRejected(
  idleTeachingCurrentGuideEnvelope,
  'an incomplete active Guide payload must retain the running teaching status',
);

const mismatchedCurrentGuideTrialSourceEnvelope = structuredClone(currentGuideEnvelope);
const mismatchedCurrentGuideTrialSourcePayload =
  mismatchedCurrentGuideTrialSourceEnvelope.files[0].payload as any;
mismatchedCurrentGuideTrialSourcePayload.guided.trial.source = 'demo';
assertCurrentFileRejected(
  mismatchedCurrentGuideTrialSourceEnvelope,
  'an active Guide payload must not restore a Demo-owned trial',
);

const currentDemoStartedAtMs = 1712000000000;
const currentDemoFirstTick = stepHeatCapacityWorkbenchFile(
  prepareHeatCapacityAutoDemoStart(
    createDefaultHeatCapacityFile(400),
    currentDemoStartedAtMs,
  ),
  currentDemoStartedAtMs + 16,
);
const currentDemoOpening = setHeatCapacityScriptedStopcockOpen(
  currentDemoFirstTick,
  true,
  currentDemoStartedAtMs + 20,
);
const currentDemoEnvelope = encodeWorkbenchStorageEnvelope(
  [currentDemoOpening],
  currentDemoOpening.id,
  'preview',
  currentDemoStartedAtMs + 24,
);
const currentDemoDecoded = decodeWorkbenchStorageEnvelope(currentDemoEnvelope);
assert.equal(
  currentDemoDecoded.session.files.length,
  1,
  'Demo persistence must validate its own timeline without inheriting Guide step controls',
);
assert.deepEqual(currentDemoDecoded.diagnostics, []);
const currentDemoRestored = currentDemoDecoded.session.files[0];
assert.equal(currentDemoRestored.kind, 'heatCapacity');
if (currentDemoRestored.kind !== 'heatCapacity') {
  throw new Error('expected a restored current Demo file');
}
assert.equal(currentDemoRestored.heatCapacityMode, 'demo');
assert.equal(currentDemoRestored.runState, 'paused');
assert.equal(currentDemoRestored.simulationTimeS, currentDemoOpening.simulationTimeS);
assert.equal(currentDemoRestored.heatCapacityGuidePhysicsState.simulationTimeS, 0);
assert.equal(currentDemoRestored.heatCapacityReleaseState.phase, 'opening');
const currentDemoResuspended = suspendHeatCapacityModeSession(
  currentDemoRestored,
  null,
  currentDemoStartedAtMs + 1_024,
);
const currentDemoSecondEnvelope = encodeWorkbenchStorageEnvelope(
  [currentDemoResuspended],
  currentDemoResuspended.id,
  'preview',
  currentDemoStartedAtMs + 1_025,
);
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(currentDemoSecondEnvelope).diagnostics,
  [],
  'a restored Demo opening state must remain canonical after a second save',
);

const liveDemoSaveStartedAtMs = Date.now() - 1_000;
const liveDemoFirstTick = stepHeatCapacityWorkbenchFile(
  prepareHeatCapacityAutoDemoStart(
    createDefaultHeatCapacityFile(401),
    liveDemoSaveStartedAtMs,
  ),
  liveDemoSaveStartedAtMs + 16,
);
const liveDemoSaveFile = setHeatCapacityScriptedStopcockOpen(
  liveDemoFirstTick,
  true,
  liveDemoSaveStartedAtMs + 20,
);
const liveGuideSaveFile = suspendHeatCapacityModeSession(
  startHeatCapacityGuideWorkbenchState(
    createDefaultHeatCapacityFile(402),
    liveDemoSaveStartedAtMs + 20,
  ),
  null,
  liveDemoSaveStartedAtMs + 30,
);
const liveFreeSaveFile = suspendHeatCapacityModeSession(
  createDefaultHeatCapacityFile(403),
  null,
  liveDemoSaveStartedAtMs + 40,
);
const liveThreeModeRecords = createPersistenceRecords('live-three-mode-save', {
  files: [liveDemoSaveFile, liveGuideSaveFile, liveFreeSaveFile],
  closedFiles: [],
  activeFileId: liveDemoSaveFile.id,
  selectedPanel: 'preview',
  refreshSession: null,
  activeModeCheckpoint: null,
  preserveActiveHeatCapacityModeSession: false,
});
assert.equal(liveThreeModeRecords.modeRecords.length, 9);
for (const [file, mode] of [
  [liveDemoSaveFile, 'demo'],
  [liveGuideSaveFile, 'guide'],
  [liveFreeSaveFile, 'free'],
] as const) {
  assert.equal(
    liveThreeModeRecords.modeRecords.find((record) => (
      record.fileId === file.id && record.mode === mode
    ))?.entry.status,
    'suspended',
    `a normal ${mode} record must not block the workspace-wide save`,
  );
}
const liveDemoModeRecord = liveThreeModeRecords.modeRecords.find((record) => (
  record.fileId === liveDemoSaveFile.id && record.mode === 'demo'
));
assert.equal(liveDemoModeRecord?.entry.snapshot?.common.simulationTimeS, 0.02);
assert.equal(
  liveDemoModeRecord?.entry.snapshot?.mode === 'demo'
    ? liveDemoModeRecord.entry.snapshot.demo.heatCapacityGuidePhysicsState.simulationTimeS
    : null,
  0,
  'the writer must retain the dormant Guide clock without confusing it with the authoritative Demo clock',
);
for (const corruptedDemoFile of [
  {
    ...liveDemoFirstTick,
    heatCapacityPhase: 'powerOff' as const,
  },
  {
    ...liveDemoFirstTick,
    powerOn: false,
  },
]) {
  assert.throws(
    () => createPersistenceRecords('corrupted-demo-common-projection', {
      files: [corruptedDemoFile],
      closedFiles: [],
      activeFileId: corruptedDemoFile.id,
      selectedPanel: 'preview',
      refreshSession: null,
      activeModeCheckpoint: null,
      preserveActiveHeatCapacityModeSession: false,
    }),
    /non-canonical heat-capacity mode session/,
    'the writer must reject an internally contradictory Demo power/phase projection',
  );
}

const publicDemoTeachingProfile = createHeatCapacityAutoDemoProfile(() => 0.0278);
const publicBlankDemoSource = {
  ...prepareHeatCapacityAutoDemoStart(
    createDefaultHeatCapacityFile(12),
    1712000000000,
    () => 0.7,
  ),
  id: 'heat-capacity-public-blank-demo',
  heatCapacityExperimentSeed: publicDemoTeachingProfile.seed,
  heatCapacityExperimentProfile: publicDemoTeachingProfile,
};
const publicBlankDemoEnvelope = encodeWorkbenchStorageEnvelope(
  [publicBlankDemoSource],
  publicBlankDemoSource.id,
  'preview',
  Date.now(),
);
assert.equal(publicBlankDemoEnvelope.appVersion, '5.1.2');
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(publicBlankDemoEnvelope).diagnostics,
  [],
  'a current blank Demo with a formerly drifting displayed profile must round-trip exactly',
);
assert.notEqual(
  (publicBlankDemoEnvelope.files[0].payload as any).guided,
  null,
  'the current encoder must retain a blank active Demo runtime before it has produced a trial',
);
const completedDemoSource = completeHeatCapacityTeachingModeWorkbenchState(
  publicBlankDemoSource,
  1712000005000,
);
const completedDemoEnvelope = encodeWorkbenchStorageEnvelope(
  [completedDemoSource],
  completedDemoSource.id,
  'preview',
  1712000006000,
);
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(completedDemoEnvelope).diagnostics,
  [],
  'a current completed Demo with a formerly drifting displayed profile must round-trip exactly',
);
const public511CompletedDemoEnvelope = structuredClone(completedDemoEnvelope);
public511CompletedDemoEnvelope.appVersion = 'development';
const public511CompletedDemoDecoded =
  decodeWorkbenchStorageEnvelope(public511CompletedDemoEnvelope);
assert.deepEqual(
  public511CompletedDemoDecoded.diagnostics,
  [],
  'a public v5.1.1 completed Demo with a displayed teaching profile must remain recoverable',
);
const public511CompletedDemoFile = public511CompletedDemoDecoded.session.files[0];
assert.equal(public511CompletedDemoFile.kind, 'heatCapacity');
if (public511CompletedDemoFile.kind !== 'heatCapacity') {
  throw new Error('expected recovered public v5.1.1 completed Demo file');
}
assert.deepEqual(
  public511CompletedDemoFile.heatCapacityExperimentProfile,
  publicDemoTeachingProfile,
  'the public v5.1.1 completed Demo recovery must preserve its displayed result triplet',
);
const corruptedCurrentBlankDemoEnvelope = structuredClone(publicBlankDemoEnvelope);
(corruptedCurrentBlankDemoEnvelope.files[0].payload as any).guided = null;
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(
    corruptedCurrentBlankDemoEnvelope,
  ).diagnostics.map((diagnostic) => diagnostic.code),
  ['invalid-file'],
  'a 5.1.2 current-format blank Demo must not silently repair a missing guided payload',
);
const public511BlankDemoEnvelope = structuredClone(corruptedCurrentBlankDemoEnvelope);
public511BlankDemoEnvelope.appVersion = 'development';
const public511BlankDemoDecoded = decodeWorkbenchStorageEnvelope(public511BlankDemoEnvelope);
assert.deepEqual(
  public511BlankDemoDecoded.diagnostics,
  [],
  'the exact public v5.1.1 blank Demo omission must remain recoverable',
);
const public511BlankDemoFile = public511BlankDemoDecoded.session.files[0];
assert.equal(public511BlankDemoFile.kind, 'heatCapacity');
if (public511BlankDemoFile.kind !== 'heatCapacity') {
  throw new Error('expected recovered public v5.1.1 blank Demo file');
}
assert.equal(public511BlankDemoFile.heatCapacityMode, 'demo');
assert.notEqual(public511BlankDemoFile.heatCapacityModeSessions.demo.status, 'empty');
assert.equal(
  public511BlankDemoFile.heatCapacityModeSessions.demo.snapshot?.common.pressureInitialBiasMv,
  0.7,
  'the public v5.1.1 active blank Demo recovery must retain observable non-default common state',
);
assert.equal(
  public511BlankDemoDecoded.migrationModeCaptureOverrides.some((override) => (
    override.source === 'public-5.1.1-blank-demo' &&
    override.fileId === public511BlankDemoFile.id &&
    override.mode === 'demo' &&
    override.capturedAtMs === public511BlankDemoFile.heatCapacityModeSessions.demo.capturedAtMs
  )),
  true,
  'the public v5.1.1 omission must carry provenance into its active split-record capture',
);

const publicBlankDemoCapturedAtMs = Date.now() - 500;
const publicBlankDemoSuspended = suspendHeatCapacityModeSession(
  publicBlankDemoSource,
  null,
  publicBlankDemoCapturedAtMs,
);
const publicBlankDemoRestored = restoreHeatCapacityModeSession(
  publicBlankDemoSuspended,
  'demo',
  publicBlankDemoCapturedAtMs + 100,
);
assert.ok(publicBlankDemoRestored);
assert.equal(publicBlankDemoRestored.heatCapacityGuideTrial, null);
assert.equal(publicBlankDemoRestored.heatCapacityModeSessions.demo.status, 'suspended');
const publicBlankDemoSuspendedEnvelope = encodeWorkbenchStorageEnvelope(
  [publicBlankDemoRestored],
  publicBlankDemoRestored.id,
  'preview',
  Date.now(),
);
const corruptedCurrentSuspendedDemoEnvelope =
  structuredClone(publicBlankDemoSuspendedEnvelope);
(corruptedCurrentSuspendedDemoEnvelope.files[0].payload as any).guided = null;
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(
    corruptedCurrentSuspendedDemoEnvelope,
  ).diagnostics.map((diagnostic) => diagnostic.code),
  ['invalid-file'],
  'a 5.1.2 current-format suspended Demo must not silently repair a missing guided payload',
);
const public511SuspendedDemoEnvelope =
  structuredClone(corruptedCurrentSuspendedDemoEnvelope);
public511SuspendedDemoEnvelope.appVersion = 'development';
const public511SuspendedDemoDecoded =
  decodeWorkbenchStorageEnvelope(public511SuspendedDemoEnvelope);
assert.deepEqual(public511SuspendedDemoDecoded.diagnostics, []);
const public511SuspendedDemoFile = public511SuspendedDemoDecoded.session.files[0];
assert.equal(public511SuspendedDemoFile.kind, 'heatCapacity');
if (public511SuspendedDemoFile.kind !== 'heatCapacity') {
  throw new Error('expected recovered public v5.1.1 suspended blank Demo file');
}
assert.equal(public511SuspendedDemoFile.heatCapacityModeSessions.demo.status, 'suspended');
assert.equal(
  public511SuspendedDemoFile.heatCapacityModeSessions.demo.capturedAtMs,
  publicBlankDemoCapturedAtMs,
  'the known public omission must retain its existing canonical Demo capture',
);
assert.equal(
  public511SuspendedDemoFile.heatCapacityModeSessions.demo.snapshot?.common.pressureInitialBiasMv,
  0.7,
  'the known public omission must retain the captured Demo common state',
);
assert.equal(
  public511SuspendedDemoDecoded.migrationModeCaptureOverrides.some((override) => (
    override.source === 'public-5.1.1-blank-demo' &&
    override.fileId === public511SuspendedDemoFile.id &&
    override.capturedAtMs === publicBlankDemoCapturedAtMs
  )),
  true,
);
for (const scenario of [
  {
    name: 'active',
    files: [public511SuspendedDemoFile],
    closedFiles: [],
    activeFileId: public511SuspendedDemoFile.id,
  },
  {
    name: 'inactive-open',
    files: [standard, public511SuspendedDemoFile],
    closedFiles: [],
    activeFileId: standard.id,
  },
  {
    name: 'closed',
    files: [standard],
    closedFiles: [public511SuspendedDemoFile],
    activeFileId: standard.id,
  },
]) {
  const records = createPersistenceRecords(
    `public-511-suspended-blank-demo-${scenario.name}`,
    {
      files: scenario.files,
      closedFiles: scenario.closedFiles,
      activeFileId: scenario.activeFileId,
      selectedPanel: 'preview',
      refreshSession: null,
      activeModeCheckpoint: null,
      preserveActiveHeatCapacityModeSession: false,
      migrationModeCaptureOverrides:
        public511SuspendedDemoDecoded.migrationModeCaptureOverrides,
    },
    'pending-verification',
  );
  const demoRecord = records.modeRecords.find((record) => (
    record.fileId === public511SuspendedDemoFile.id && record.mode === 'demo'
  ));
  assert.ok(demoRecord);
  assert.equal(demoRecord.entry.status, 'suspended');
  assert.equal(
    demoRecord.entry.snapshot?.mode === 'demo'
      ? demoRecord.entry.snapshot.demo.heatCapacityGuideTrial
      : undefined,
    null,
  );
  assert.equal(
    demoRecord.entry.snapshot?.common.pressureInitialBiasMv,
    0.7,
    `the ${scenario.name} public v5.1.1 Demo split record must retain non-default common state`,
  );
  assert.deepEqual(
    normalizeHeatCapacityModeSessionStore({
      schemaVersion: 2,
      demo: demoRecord.entry,
      guide: records.modeRecords.find((record) => (
        record.fileId === public511SuspendedDemoFile.id && record.mode === 'guide'
      ))!.entry,
      free: records.modeRecords.find((record) => (
        record.fileId === public511SuspendedDemoFile.id && record.mode === 'free'
      ))!.entry,
    }, public511SuspendedDemoFile.id).demo,
    demoRecord.entry,
    `the ${scenario.name} public v5.1.1 Demo capture must remain canonical`,
  );
}

const publicBlankDemoClosedEnvelope = encodeWorkbenchClosedFilesStorageEnvelope(
  [publicBlankDemoRestored],
  Date.now(),
);
const corruptedCurrentClosedDemoEnvelope = structuredClone(publicBlankDemoClosedEnvelope);
(corruptedCurrentClosedDemoEnvelope.files[0].payload as any).guided = null;
assert.deepEqual(
  decodeWorkbenchClosedFilesStorageEnvelope(
    corruptedCurrentClosedDemoEnvelope,
  ).diagnostics.map((diagnostic) => diagnostic.code),
  ['invalid-file'],
  'a 5.1.2 current-format closed blank Demo must not silently repair a missing guided payload',
);
const public511ClosedDemoEnvelope = structuredClone(corruptedCurrentClosedDemoEnvelope);
public511ClosedDemoEnvelope.appVersion = 'development';
const public511ClosedDemoDecoded =
  decodeWorkbenchClosedFilesStorageEnvelope(public511ClosedDemoEnvelope);
assert.deepEqual(
  public511ClosedDemoDecoded.diagnostics,
  [],
  'the exact public v5.1.1 blank Demo omission must remain recoverable for closed files',
);
assert.equal(public511ClosedDemoDecoded.files.length, 1);
assert.equal(
  public511ClosedDemoDecoded.migrationModeCaptureOverrides.some((override) => (
    override.source === 'public-5.1.1-blank-demo' &&
    override.fileId === publicBlankDemoRestored.id &&
    override.mode === 'demo' &&
    override.capturedAtMs === publicBlankDemoCapturedAtMs
  )),
  true,
  'closed-file migrations must propagate their provenance-bound split-record override',
);

const legacy423BlankDemoEnvelope = convertHeatEnvelopeToLegacy423(
  structuredClone(publicBlankDemoEnvelope),
);
(legacy423BlankDemoEnvelope.files[0].payload as any).guided = null;
const legacy423BlankDemoDecoded = decodeWorkbenchStorageEnvelope(legacy423BlankDemoEnvelope);
assert.deepEqual(
  legacy423BlankDemoDecoded.diagnostics,
  [],
  'an exact public v4.2.3 blank Demo omission must remain recoverable',
);
const legacy423BlankDemoFile = legacy423BlankDemoDecoded.session.files[0];
assert.equal(legacy423BlankDemoFile.kind, 'heatCapacity');
if (legacy423BlankDemoFile.kind !== 'heatCapacity') {
  throw new Error('expected migrated public v4.2.3 blank Demo file');
}
assert.equal(legacy423BlankDemoFile.heatCapacityMode, 'demo');
assert.notEqual(legacy423BlankDemoFile.heatCapacityModeSessions.demo.status, 'empty');
assert.equal(
  legacy423BlankDemoDecoded.migrationModeCaptureOverrides.some((override) => (
    override.fileId === legacy423BlankDemoFile.id &&
    override.mode === 'demo' &&
    override.capturedAtMs === legacy423BlankDemoFile.heatCapacityModeSessions.demo.capturedAtMs
  )),
  true,
);

for (const scenario of [
  {
    name: 'active',
    files: [legacy423BlankDemoFile],
    closedFiles: [],
    activeFileId: legacy423BlankDemoFile.id,
  },
  {
    name: 'inactive-open',
    files: [standard, legacy423BlankDemoFile],
    closedFiles: [],
    activeFileId: standard.id,
  },
  {
    name: 'closed',
    files: [standard],
    closedFiles: [legacy423BlankDemoFile],
    activeFileId: standard.id,
  },
]) {
  const records = createPersistenceRecords(
    `legacy-423-blank-demo-${scenario.name}`,
    {
      files: scenario.files,
      closedFiles: scenario.closedFiles,
      activeFileId: scenario.activeFileId,
      selectedPanel: 'preview',
      refreshSession: null,
      activeModeCheckpoint: null,
      preserveActiveHeatCapacityModeSession: false,
      migrationModeCaptureOverrides:
        legacy423BlankDemoDecoded.migrationModeCaptureOverrides,
    },
    'pending-verification',
  );
  const modeStore = {
    schemaVersion: 2 as const,
    demo: records.modeRecords.find((record) => (
      record.fileId === legacy423BlankDemoFile.id && record.mode === 'demo'
    ))!.entry,
    guide: records.modeRecords.find((record) => (
      record.fileId === legacy423BlankDemoFile.id && record.mode === 'guide'
    ))!.entry,
    free: records.modeRecords.find((record) => (
      record.fileId === legacy423BlankDemoFile.id && record.mode === 'free'
    ))!.entry,
  };
  assert.deepEqual(
    normalizeHeatCapacityModeSessionStore(
      structuredClone(modeStore),
      legacy423BlankDemoFile.id,
    ),
    modeStore,
    `the ${scenario.name} v4.2.3 blank Demo split records must remain canonical`,
  );
  assert.notEqual(modeStore.demo.status, 'empty');
}

const legacy423DemoSource = {
  ...legacy423GuideSource,
  heatCapacityMode: 'demo' as const,
  heatCapacityGuideTrial: legacy423GuideSource.heatCapacityGuideTrial
    ? { ...legacy423GuideSource.heatCapacityGuideTrial, source: 'demo' as const }
    : null,
};
const legacy423DemoEnvelope = prepareLegacy423MigrationFixture(convertHeatEnvelopeToLegacy423(
  encodeWorkbenchStorageEnvelope(
    [legacy423DemoSource],
    legacy423DemoSource.id,
    'preview',
    1007,
  ),
));
const legacy423DemoDecoded = decodeWorkbenchStorageEnvelope(legacy423DemoEnvelope);
assert.deepEqual(
  legacy423DemoDecoded.diagnostics,
  [],
  'a public v4.2.3 Demo file must migrate instead of producing an empty current-mode session',
);
const legacy423DemoFile = legacy423DemoDecoded.session.files[0];
assert.equal(legacy423DemoFile.kind, 'heatCapacity');
if (legacy423DemoFile.kind !== 'heatCapacity') {
  throw new Error('expected migrated v4.2.3 Demo file');
}
assert.equal(legacy423DemoFile.heatCapacityMode, 'demo');
assert.notEqual(legacy423DemoFile.heatCapacityModeSessions.demo.status, 'empty');
assert.equal(
  legacy423DemoDecoded.migrationModeCaptureOverrides.some((override) => (
    override.fileId === legacy423DemoFile.id &&
    override.mode === 'demo' &&
    override.capturedAtMs === legacy423DemoFile.heatCapacityModeSessions.demo.capturedAtMs
  )),
  true,
  'the v4.2.3 decoder must preserve exact provenance for an active Demo capture',
);
const legacy423DemoIndexedDbRecords = createPersistenceRecords(
  'legacy-423-active-demo',
  {
    files: [legacy423DemoFile],
    closedFiles: [],
    activeFileId: legacy423DemoFile.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
    migrationModeCaptureOverrides: legacy423DemoDecoded.migrationModeCaptureOverrides,
  },
  'pending-verification',
);
const legacy423DemoIndexedDbModeStore = {
  schemaVersion: 2 as const,
  demo: legacy423DemoIndexedDbRecords.modeRecords.find((record) => record.mode === 'demo')!.entry,
  guide: legacy423DemoIndexedDbRecords.modeRecords.find((record) => record.mode === 'guide')!.entry,
  free: legacy423DemoIndexedDbRecords.modeRecords.find((record) => record.mode === 'free')!.entry,
};
assert.deepEqual(
  normalizeHeatCapacityModeSessionStore(
    structuredClone(legacy423DemoIndexedDbModeStore),
    legacy423DemoFile.id,
  ),
  legacy423DemoIndexedDbModeStore,
  'the active v4.2.3 Demo override must produce canonical split mode records',
);
assert.notEqual(legacy423DemoIndexedDbModeStore.demo.status, 'empty');
const currentDemoWithTrialFile = restoreHeatCapacityModeSession(
  {
    ...legacy423DemoFile,
    heatCapacityModeSessions: legacy423DemoIndexedDbModeStore,
  },
  'demo',
  legacy423DemoIndexedDbModeStore.demo.capturedAtMs!,
);
assert.ok(currentDemoWithTrialFile);
const currentDemoWithTrialEnvelope = encodeWorkbenchStorageEnvelope(
  [currentDemoWithTrialFile!],
  currentDemoWithTrialFile!.id,
  'preview',
  Date.now(),
);
assert.deepEqual(
  decodeWorkbenchStorageEnvelope(currentDemoWithTrialEnvelope).diagnostics,
  [],
  'a migrated Demo trial must form a valid current-schema baseline',
);
const mismatchedCurrentDemoTrialSourceEnvelope =
  structuredClone(currentDemoWithTrialEnvelope);
const mismatchedCurrentDemoTrialSourcePayload =
  mismatchedCurrentDemoTrialSourceEnvelope.files[0].payload as any;
assert.notEqual(mismatchedCurrentDemoTrialSourcePayload.guided.trial, null);
mismatchedCurrentDemoTrialSourcePayload.guided.trial.source = 'guide';
assertCurrentFileRejected(
  mismatchedCurrentDemoTrialSourceEnvelope,
  'an active Demo payload must not restore a Guide-owned trial',
);

const corruptedLegacyTraceEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyTracePayload = corruptedLegacyTraceEnvelope.files[0].payload as any;
corruptedLegacyTracePayload.free.traceStore.traceTrials[0]
  .branches[0].events[0].traceSampleId = 'missing-trace-sample';
assertLegacy423FileRejected(
  corruptedLegacyTraceEnvelope,
  'a legacy trace event with an orphaned sample reference must be rejected',
);

const corruptedLegacyGuideTrialEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyGuideTrialPayload = corruptedLegacyGuideTrialEnvelope.files[0].payload as any;
corruptedLegacyGuideTrialPayload.guided.trial.correctedSignals.gamma = 999;
assertLegacy423FileRejected(
  corruptedLegacyGuideTrialEnvelope,
  'a legacy Guide trial with forged corrected signals must be rejected',
);

const corruptedLegacyStandardReferenceEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyStandardReferencePayload = corruptedLegacyStandardReferenceEnvelope.files[0].payload as any;
corruptedLegacyStandardReferencePayload.free.trials[0].standardReferenceSnapshot = {};
assertLegacy423FileRejected(
  corruptedLegacyStandardReferenceEnvelope,
  'a malformed legacy standard reference must be rejected instead of silently regenerated',
);

const corruptedLegacyStandardReferenceSummaryEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyStandardReferenceSummaryPayload =
  corruptedLegacyStandardReferenceSummaryEnvelope.files[0].payload as any;
corruptedLegacyStandardReferenceSummaryPayload.free.trials[0]
  .standardReferenceSnapshot.summary.gamma = 'forged-gamma';
assertLegacy423FileRejected(
  corruptedLegacyStandardReferenceSummaryEnvelope,
  'a legacy standard reference with a corrupted nested summary must be rejected',
);

const inconsistentLegacyStandardReferenceSummaryEnvelope = structuredClone(legacy423FreeEnvelope);
const inconsistentLegacyStandardReferenceSummaryPayload =
  inconsistentLegacyStandardReferenceSummaryEnvelope.files[0].payload as any;
inconsistentLegacyStandardReferenceSummaryPayload.free.trials[0]
  .standardReferenceSnapshot.summary.gamma += 0.01;
assertLegacy423FileRejected(
  inconsistentLegacyStandardReferenceSummaryEnvelope,
  'finite but inconsistent root and nested legacy standard-reference summaries must be rejected',
);

const inconsistentLegacyStandardReferenceWindowsEnvelope = structuredClone(legacy423FreeEnvelope);
const inconsistentLegacyStandardReferenceWindowsPayload =
  inconsistentLegacyStandardReferenceWindowsEnvelope.files[0].payload as any;
inconsistentLegacyStandardReferenceWindowsPayload.free.trials[0]
  .standardReferenceSnapshot.operationUpperBound.windows[0].qualityScore -= 1;
assertLegacy423FileRejected(
  inconsistentLegacyStandardReferenceWindowsEnvelope,
  'finite but inconsistent legacy standard-reference windows must be rejected',
);

const inconsistentLegacyStandardReferencePresetEnvelope = structuredClone(legacy423FreeEnvelope);
const inconsistentLegacyStandardReferencePresetPayload =
  inconsistentLegacyStandardReferencePresetEnvelope.files[0].payload as any;
inconsistentLegacyStandardReferencePresetPayload.free.trials[0]
  .standardReferenceSnapshot.operationPreset.openDurationS = 0.4;
assertLegacy423FileRejected(
  inconsistentLegacyStandardReferencePresetEnvelope,
  'a legacy standard reference with a non-v4.2.3 operation preset must be rejected',
);

const corruptedLegacyTeachingProfileEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyTeachingProfilePayload = corruptedLegacyTeachingProfileEnvelope.files[0].payload as any;
corruptedLegacyTeachingProfilePayload.common.experimentProfile = { forged: true };
assertLegacy423FileRejected(
  corruptedLegacyTeachingProfileEnvelope,
  'a malformed legacy teaching profile must be rejected instead of silently cleared',
);

const corruptedLegacyRollbackEnvelope = structuredClone(legacy423FreeEnvelope);
const corruptedLegacyRollbackPayload = corruptedLegacyRollbackEnvelope.files[0].payload as any;
delete corruptedLegacyRollbackPayload.free.rollbackSnapshots.afterPowerOn
  .heatCapacityFreeStopcockPendingOpenAtMs;
assertLegacy423FileRejected(
  corruptedLegacyRollbackEnvelope,
  'a legacy rollback snapshot missing its pending-open field must not be inferred as open',
);

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
assert.equal(
  malformedHeatDecoded.session.files.length,
  0,
  'severely malformed heat-capacity physics and trial data must not be silently replaced with defaults',
);
assert.equal(
  malformedHeatDecoded.diagnostics.some((entry) => (
    entry.code === 'invalid-file' && entry.fileId === malformedHeatEnvelope.files[0].id
  )),
  true,
  'rejected heat-capacity data should produce a file-specific migration diagnostic',
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

const customFreeSessionBase = createDefaultHeatCapacityFile(9);
const customFreeSessionConfigured = applyHeatCapacityFreeParameterDraftWorkbenchState(
  customFreeSessionBase,
  {
    ...customFreeSessionBase.heatCapacityFreeParameterDraft,
    ambientPressureKPa: 99.2,
    instrumentNoiseEnabled: false,
    pressureWarningMv: 123,
    pressureDangerMv: 152,
  },
);
const customFreeSessionStarted = freezeHeatCapacityFreeParametersForCurrentGroup(
  configureHeatCapacityFreeBatchWorkbenchState(
    customFreeSessionConfigured,
    3,
    now - 1,
  ),
  now,
);
const customFreeSessionFile = storeHeatCapacityFreeRuntimeFieldsInDomain({
  ...customFreeSessionStarted,
  heatCapacityFreeFileAcknowledgements: {
    advancedParametersRisk: true,
    idealParameterProfileIntro: true,
  },
}, 'real');
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
assert.equal(
  customFreeFile.heatCapacityFreeActiveRunConfigSnapshot?.version,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
);
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
    pressureWarningMv: 111,
  },
};
const contaminatedDomainSessionRestore = decodeWorkbenchSessionWithDiagnostics({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: contaminatedDomainSessionFile.id,
  selectedPanel: 'preview',
  files: [contaminatedDomainSessionFile],
});
const contaminatedDomainSessionRestored = contaminatedDomainSessionRestore.session;
assert.equal(contaminatedDomainSessionRestore.diagnostics.length, 1);
assert.deepEqual(
  contaminatedDomainSessionRestore.diagnostics[0],
  {
    fileId: contaminatedDomainSessionFile.id,
    domain: 'real',
    scope: 'free-domain',
    status: 'unsupported-future',
    sourceVersion: 999,
    reason: 'Free trace-trial configuration snapshot requires a newer application.',
    fieldPath: 'traceStore.traceTrials[0].configSnapshot.version',
    recovery: 'use-safe-default-domain',
    raw: contaminatedDomainSessionFile.heatCapacityFreeRealDomain,
  },
  'future-domain isolation must retain the complete raw domain and an actionable diagnostic',
);
assert.throws(
  () => encodeWorkbenchSession(
    [contaminatedDomainSessionFile as any],
    contaminatedDomainSessionFile.id,
    'preview',
  ),
  /cannot encode 1 isolated recovery diagnostic/,
  'an isolated future domain must not be silently overwritten by a normalized runtime save',
);
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
assert.equal(
  contaminatedDomainFile.heatCapacityFreeRealDomain.trials.length,
  0,
  'an unsupported future real domain must be isolated instead of normalized as current authority',
);
assert.equal(contaminatedDomainFile.heatCapacityFreeTrials.length, 0);
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
assert.equal(contaminatedDomainFile.heatCapacityFreeTraceStore.traceTrials.length, 0);
assert.equal(
  contaminatedDomainFile.heatCapacityFreeIdealDomain.pressureWarningMv,
  111,
  'the healthy sibling domain must remain available when the active domain is isolated',
);

const malformedDomainSessionFile = structuredClone(createDefaultHeatCapacityFile(12));
(malformedDomainSessionFile.heatCapacityFreeRealDomain.batch as unknown as Record<string, unknown>)
  .unexpectedAuthority = true;
const healthySiblingFile = createDefaultStandardFile(12);
const malformedDomainSessionRestore = decodeWorkbenchSessionWithDiagnostics({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: malformedDomainSessionFile.id,
  selectedPanel: 'preview',
  files: [malformedDomainSessionFile, healthySiblingFile],
});
assert.equal(
  malformedDomainSessionRestore.session.files.length,
  2,
  'a malformed domain must not block its file or healthy sibling files from opening',
);
assert.equal(malformedDomainSessionRestore.diagnostics.length, 1);
assert.equal(malformedDomainSessionRestore.diagnostics[0]?.scope, 'free-domain');
assert.equal(malformedDomainSessionRestore.diagnostics[0]?.status, 'quarantined');
assert.equal(
  malformedDomainSessionRestore.diagnostics[0]?.recovery,
  'use-safe-default-domain',
);
assert.deepEqual(
  malformedDomainSessionRestore.diagnostics[0]?.raw,
  malformedDomainSessionFile.heatCapacityFreeRealDomain,
  'malformed-domain isolation must preserve the complete raw domain',
);
const malformedDomainRestoredFile = malformedDomainSessionRestore.session.files.find(
  (file) => file.id === malformedDomainSessionFile.id,
);
assert.equal(malformedDomainRestoredFile?.kind, 'heatCapacity');
if (malformedDomainRestoredFile?.kind !== 'heatCapacity') {
  throw new Error('expected isolated malformed heat-capacity domain file');
}
assert.equal(malformedDomainRestoredFile.heatCapacityFreeRealDomain.trials.length, 0);
assert.equal(
  malformedDomainSessionRestore.session.files.some(
    (file) => file.id === healthySiblingFile.id,
  ),
  true,
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
const indexedDbPersistenceSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'workbenchIndexedDbPersistence.ts'),
  'utf8',
);
assert.doesNotMatch(sessionSource, /localStorage|sessionStorage/);
assert.match(indexedDbPersistenceSource, /decodeWorkbenchStorageEnvelope/);
assert.match(indexedDbPersistenceSource, /decodeWorkbenchClosedFilesStorageEnvelope/);
assert.match(indexedDbPersistenceSource, /decodeWorkbenchSessionWithDiagnostics/);
assert.match(indexedDbPersistenceSource, /legacy-runtime-recovery/);
assert.match(indexedDbPersistenceSource, /removeAfterVerifiedWrite/);
assert.match(indexedDbPersistenceSource, /WORKBENCH_HEAT_CAPACITY_MODE_SESSIONS_STORE/);
assert.match(sessionSource, /normalizeHeatCapacitySessionRuntimeState/);
assert.doesNotMatch(sessionSource, /normalizeHeatCapacityFreeRestoreTraceStore/);
assert.doesNotMatch(sessionSource, /createDefaultHeatCapacityFreeRuntimeFields/);
assert.match(
  heatCapacitySessionRestoreSource,
  /export const normalizeHeatCapacitySessionRuntimeState/,
);

console.log('workbenchSessionPersistence tests passed');
