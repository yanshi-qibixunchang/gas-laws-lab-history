import assert from 'node:assert/strict';
import {
  acknowledgeHeatCapacityFreeFileNoticeWorkbenchState,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  canOpenHeatCapacityParameterSidebar,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityFreeParameterLockReason,
  getHeatCapacityParameterSidebarBlockReason,
  hasCompletedHeatCapacityFreeRecordSet,
  isHeatCapacityFreeExperimentGroupComplete,
  isHeatCapacityFreeParameterEditingAvailable,
  powerHeatCapacityWorkbenchFile,
  resetHeatCapacityFreeParametersToDefaultWorkbenchState,
  restartCurrentHeatCapacityFreeExperimentWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchState,
  restartHeatCapacityFreeBatchWorkbenchState,
  prepareNextHeatCapacityFreeExperimentWorkbenchState,
  selectHeatCapacityFreeAppliedParameterDraft,
  selectHeatCapacityFreeActiveRunConfigSnapshot,
  selectHeatCapacityFreeGasType,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  shouldPromptHeatCapacityFreePowerOffBeforeNextGroup,
  stepHeatCapacityWorkbenchFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';
import {
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS,
} from '../../src/domain/heatCapacity/heatCapacityGasTheory.ts';
import {
  mapTemperatureKToSignalMv,
} from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';

const defaultFile = createDefaultHeatCapacityFile(1);

assert.equal(defaultFile.heatCapacityMode, 'free');
assert.equal(defaultFile.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'draft');
assert.equal('heatCapacityFreeGasType' in defaultFile, false);
assert.equal('heatCapacityFreeParameterDraft' in defaultFile, false);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).ambientPressureKPa, 101.3);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).ambientTemperatureK, 298.15);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).gasWallConductanceWPerK, 0.08);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).wallAmbientConductanceWPerK, 0.45);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).leakageEnabled, true);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).instrumentNoiseEnabled, true);
assert.equal(selectHeatCapacityFreeGasType(defaultFile), 'air');
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(defaultFile).gasType, 'air');
assert.equal(defaultFile.theoreticalGamma, 1.4);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.gamma, 1.4);
assert.equal(selectHeatCapacityFreeActiveRunConfigSnapshot(defaultFile), null);
assert.equal(
  Object.prototype.hasOwnProperty.call(defaultFile, 'heatCapacityFreeActiveRunConfigSnapshot'),
  false,
  'the current workbench state must not recreate the retired active-config mirror',
);
assert.deepEqual(defaultFile.heatCapacityFreeFileAcknowledgements, {
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});
assert.equal(defaultFile.heatCapacityFreeParameterScheme, 'real');
assert.equal(defaultFile.heatCapacityFreeDisplayScheme, 'real');
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled, true);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.record.u0ZeroToleranceMv, 0.12);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.pressureWarningMv, 120);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(defaultFile), true);
assert.equal(getHeatCapacityFreeParameterLockReason(defaultFile), null);

const contaminatedProjectionFile = {
  ...defaultFile,
  heatCapacityFreeInstrumentConfig: {
    ...defaultFile.heatCapacityFreeInstrumentConfig,
    physics: {
      ...defaultFile.heatCapacityFreeInstrumentConfig.physics,
      thermal: {
        ...defaultFile.heatCapacityFreeInstrumentConfig.physics.thermal,
        gasWallConductanceWPerK: 5,
        wallAmbientConductanceWPerK: 5,
      },
    },
  },
};
const repairedProjectionFile = stepHeatCapacityWorkbenchFile(contaminatedProjectionFile, 1000);
assert.equal(
  repairedProjectionFile.heatCapacityFreeInstrumentConfig.physics.thermal.gasWallConductanceWPerK,
  0.08,
  'free-mode runtime hydration should rebuild a polluted real top-level projection from the real domain',
);
assert.equal(
  repairedProjectionFile.heatCapacityFreeRealDomain.physicsConfig.thermal.gasWallConductanceWPerK,
  0.08,
  'free-mode runtime hydration must not write a polluted top-level projection back into the real domain',
);

const editedDraft = {
  ...selectHeatCapacityFreeAppliedParameterDraft(defaultFile),
  ambientPressureKPa: 99.8,
  ambientTemperatureK: 301.2,
  gasWallConductanceWPerK: 0.35,
  wallAmbientConductanceWPerK: 0.7,
  leakageEnabled: true,
  leakageRatePerS: 0.0018,
  instrumentNoiseEnabled: false,
  noiseMv: 0.061,
  sensorLagTimeS: 0.5,
  pressureWarningMv: 122,
  pressureDangerMv: 150,
};
const editedFile = applyHeatCapacityFreeParameterDraftWorkbenchState(defaultFile, editedDraft);
assert.equal(editedFile.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'draft');
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(editedFile).ambientPressureKPa, 99.8);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(editedFile).leakageEnabled, true);
assert.equal(selectHeatCapacityFreeActiveRunConfigSnapshot(editedFile), null);
assert.equal(
  editedFile.heatCapacityFreeInstrumentConfig.physics.environment.ambientPressureKPa,
  99.8,
  'draft application should keep the current file config aligned before freezing',
);
assert.equal(
  editedFile.heatCapacityFreeInstrumentState.physics.gasTemperatureK,
  editedDraft.ambientTemperatureK,
  'editing an unstarted file should rebuild the gas at the selected ambient temperature',
);
assert.equal(
  editedFile.heatCapacityFreeInstrumentState.physics.wallTemperatureK,
  editedDraft.ambientTemperatureK,
  'editing an unstarted file should rebuild the wall at the selected ambient temperature',
);
assert.equal(
  editedFile.heatCapacityFreeInstrumentState.sensor.sensorTemperatureK,
  editedDraft.ambientTemperatureK,
  'editing an unstarted file should rebuild the temperature sensor at ambient',
);
assert.equal(
  editedFile.heatCapacityFreeInstrumentState.sensor.displayTemperatureMv,
  mapTemperatureKToSignalMv(editedDraft.ambientTemperatureK),
  'editing an unstarted file should immediately expose the selected equilibrium voltage',
);

const configuredUnstartedBatch = configureHeatCapacityFreeBatchWorkbenchState(
  defaultFile,
  3,
  900,
);
const warmConfiguredBatch = applyHeatCapacityFreeParameterDraftWorkbenchState(
  configuredUnstartedBatch,
  {
    ...selectHeatCapacityFreeAppliedParameterDraft(configuredUnstartedBatch),
    ambientTemperatureK: 303.15,
  },
  901,
);
assert.equal(warmConfiguredBatch.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 3);
assert.equal(warmConfiguredBatch.heatCapacityFreeRunWorkspace.batch.startedAtMs, null);
assert.equal(warmConfiguredBatch.heatCapacityFreeInstrumentState.physics.gasTemperatureK, 303.15);
assert.equal(warmConfiguredBatch.heatCapacityFreeInstrumentState.sensor.sensorTemperatureK, 303.15);
assert.equal(
  warmConfiguredBatch.heatCapacityFreeInstrumentState.sensor.displayTemperatureMv,
  1523.7,
  'the real setup-batch -> edit-temperature path should not retain the old 25 degree runtime',
);

const frozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(
  configureHeatCapacityFreeBatchWorkbenchState(editedFile, 3, 1000),
);
assert.equal(frozenFile.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'running');
assert.equal(isHeatCapacityFreeParameterEditingAvailable(frozenFile), false);
assert.equal(getHeatCapacityFreeParameterLockReason(frozenFile), 'groupStarted');
const frozenConfigSnapshot = selectHeatCapacityFreeActiveRunConfigSnapshot(frozenFile);
assert.notEqual(frozenConfigSnapshot, null);
assert.equal(
  Object.prototype.hasOwnProperty.call(frozenFile, 'heatCapacityFreeActiveRunConfigSnapshot'),
  false,
);
assert.equal(
  frozenConfigSnapshot?.environment.ambientPressureKPa,
  99.8,
);
assert.equal(
  frozenConfigSnapshot?.physics.thermal.gasWallConductanceWPerK,
  0.35,
);
assert.equal(frozenConfigSnapshot?.physics.leakage.enabled, true);
assert.equal(frozenConfigSnapshot?.sensor.noiseMv, 0);
assert.equal(frozenFile.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled, false);
assert.equal(frozenFile.heatCapacityFreeInstrumentConfig.pressureWarningMv, 120);
assert.equal(frozenFile.heatCapacityFreeInstrumentConfig.record.pressureDangerMv, 140);

const blockedNextGroupFile = prepareNextHeatCapacityFreeExperimentWorkbenchState(frozenFile);
assert.equal(blockedNextGroupFile, frozenFile, 'Next Group must stay disabled until a valid group is complete and powered off');

const completedFreeTrial = {
  id: 'completed-free-group',
  source: 'free',
  traceTrialId: null,
  branchCount: 0,
  automaticU0: null,
  u0: { displayPressureMv: 0 },
  u1: { displayPressureMv: 72.5 },
  u2: { displayPressureMv: 51.2 },
  blockedReason: null,
  correctedSignals: { gamma: 1.4 },
  configSnapshot: frozenConfigSnapshot,
} as any;
const activeBatchId = frozenFile.heatCapacityFreeRunWorkspace.batch.id;
assert.notEqual(activeBatchId, null);
const completedExperimentBeforeRestart = {
  ...completedFreeTrial,
  id: `${activeBatchId}:trial:1`,
  completedAtMs: 1_500,
  batchMembership: {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: activeBatchId,
    sequence: 1,
  },
};
const partialCurrentExperiment = {
  ...completedFreeTrial,
  id: `${activeBatchId}:trial:2`,
  u1: null,
  u2: null,
  correctedSignals: null,
  completedAtMs: null,
  batchMembership: {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: activeBatchId,
    sequence: 2,
  },
};
const currentGroupIdBeforeExperimentRestart = frozenFile.heatCapacityFreeExperimentGroups.currentGroupId;
const restartedCurrentExperiment = restartCurrentHeatCapacityFreeExperimentWorkbenchState({
  ...frozenFile,
  powerOn: true,
  heatCapacityFreeRunWorkspace: {
    ...frozenFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'running',
    batch: {
      ...frozenFile.heatCapacityFreeRunWorkspace.batch,
      nextTrialSequence: 3,
    },
    trials: [completedExperimentBeforeRestart, partialCurrentExperiment],
  },
}, 1_600);
assert.equal(restartedCurrentExperiment.powerOn, false);
assert.equal(restartedCurrentExperiment.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'draft');
assert.equal(
  restartedCurrentExperiment.heatCapacityFreeExperimentGroups.currentGroupId,
  currentGroupIdBeforeExperimentRestart,
  'current-experiment restart must not detach the active experiment group',
);
assert.deepEqual(
  restartedCurrentExperiment.heatCapacityFreeRunWorkspace.trials.map((trial) => trial.id),
  [completedExperimentBeforeRestart.id],
  'current-experiment restart must remove only the unfinished experiment',
);
assert.equal(
  restartedCurrentExperiment.heatCapacityFreeRunWorkspace.batch.nextTrialSequence,
  3,
  'current-experiment restart must retain the monotonic trial identity sequence',
);
const currentGroupAfterExperimentRestart = restartedCurrentExperiment.heatCapacityFreeExperimentGroups.groups.find(
  (group) => group.id === currentGroupIdBeforeExperimentRestart,
);
// Rerecording/restarting after U2, but before power-off, must not also remove
// the preceding saved experiment when resetting the instrument.
const restartedAfterU2 = restartCurrentHeatCapacityFreeExperimentWorkbenchState({
  ...frozenFile,
  powerOn: true,
  heatCapacityFreeRunWorkspace: {
    ...frozenFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed',
    batch: { ...frozenFile.heatCapacityFreeRunWorkspace.batch, nextTrialSequence: 3 },
    trials: [completedExperimentBeforeRestart, {
      ...completedFreeTrial,
      id: partialCurrentExperiment.id,
      batchMembership: partialCurrentExperiment.batchMembership,
      completedAtMs: null,
    }],
  },
}, 1_650);
assert.deepEqual(restartedAfterU2.heatCapacityFreeRunWorkspace.trials.map(trial => trial.id),
  [completedExperimentBeforeRestart.id], 'restart after U2 must preserve the earlier saved experiment');
assert.deepEqual(
  currentGroupAfterExperimentRestart?.runSeries.trials.map((trial) => trial.id),
  [completedExperimentBeforeRestart.id],
  'the current experiment group aggregate must stay synchronized after an experiment restart',
);
const completedGroupPowerOnFile = {
  ...frozenFile,
  powerOn: true,
  runState: 'idle' as const,
  heatCapacityFreeRunWorkspace: {
    ...frozenFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed' as const,
    trials: [completedFreeTrial],
  },
};
assert.equal(hasCompletedHeatCapacityFreeRecordSet(completedGroupPowerOnFile), true);
assert.equal(isHeatCapacityFreeExperimentGroupComplete(completedGroupPowerOnFile), false);
assert.equal(shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(completedGroupPowerOnFile), true);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(completedGroupPowerOnFile), false);
assert.equal(
  getHeatCapacityFreeParameterLockReason(completedGroupPowerOnFile),
  'powerOffBeforeNextGroup',
);

const incompleteGroupPowerOnFile = {
  ...completedGroupPowerOnFile,
  heatCapacityFreeRunWorkspace: {
    ...completedGroupPowerOnFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'running' as const,
    trials: [{ ...completedFreeTrial, u2: null }],
  },
};
assert.equal(hasCompletedHeatCapacityFreeRecordSet(incompleteGroupPowerOnFile), false);
assert.equal(shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(incompleteGroupPowerOnFile), false);

const completedGroupPowerOffFile = {
  ...completedGroupPowerOnFile,
  powerOn: false,
};
assert.equal(isHeatCapacityFreeExperimentGroupComplete(completedGroupPowerOffFile), true);
assert.equal(shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(completedGroupPowerOffFile), false);

const preparedAfterPowerOff = powerHeatCapacityWorkbenchFile(completedGroupPowerOnFile, false, 2000);
assert.equal(preparedAfterPowerOff.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'completed');
assert.notEqual(selectHeatCapacityFreeActiveRunConfigSnapshot(preparedAfterPowerOff), null);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(preparedAfterPowerOff), false);
assert.equal(getHeatCapacityFreeParameterLockReason(preparedAfterPowerOff), 'batchStarted');

const snapshotParts = createCompleteProcessReviewFixtureParts();
const completedFileForStandardReferenceSnapshot = {
  ...defaultFile,
  powerOn: true,
  runState: 'idle' as const,
  pressureZeroed: true,
  heatCapacityFreeRealDomain: {
    ...defaultFile.heatCapacityFreeRealDomain,
    activeRunConfigSnapshot: snapshotParts.traceTrial.configSnapshot,
  },
  heatCapacityFreeRunWorkspace: {
    ...defaultFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed' as const,
    traceStore: snapshotParts.traceStore,
    trials: [{
      ...snapshotParts.trial,
      completedAtMs: null,
      standardReferenceSnapshot: null,
    }],
  },
};
const finalizedFileWithStandardReferenceSnapshot = powerHeatCapacityWorkbenchFile(
  completedFileForStandardReferenceSnapshot,
  false,
  2400,
);
const persistedStandardReferenceSnapshot =
  finalizedFileWithStandardReferenceSnapshot.heatCapacityFreeRunWorkspace.trials[0]?.standardReferenceSnapshot ?? null;
assert.notEqual(
  persistedStandardReferenceSnapshot,
  null,
  'closing power after a complete Free Mode group should persist the standard reference snapshot on the trial',
);
assert.equal(
  persistedStandardReferenceSnapshot?.generatorVersion,
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
);
assert.equal(persistedStandardReferenceSnapshot?.operationPreset.pumpStrokes, 18);
assert.equal((persistedStandardReferenceSnapshot?.trace.length ?? 0) > 0, true);
const restartedBlankNextExperiment = restartCurrentHeatCapacityFreeExperimentWorkbenchState(
  preparedAfterPowerOff,
  2050,
);
assert.equal(restartedBlankNextExperiment.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'draft');
assert.equal(
  restartedBlankNextExperiment.heatCapacityFreeExperimentGroups.currentGroupId,
  preparedAfterPowerOff.heatCapacityFreeExperimentGroups.currentGroupId,
  'restarting the current experiment must preserve the owning experiment group',
);
assert.equal(
  restartedBlankNextExperiment.heatCapacityFreeRunWorkspace.trials.length,
  preparedAfterPowerOff.heatCapacityFreeRunWorkspace.trials.length,
  'restarting a blank next experiment must preserve already completed experiments',
);
assert.notEqual(selectHeatCapacityFreeActiveRunConfigSnapshot(restartedBlankNextExperiment), null);
const preparedForNextGroup = prepareNextHeatCapacityFreeExperimentWorkbenchState(preparedAfterPowerOff, 2100);
assert.equal(preparedForNextGroup.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'draft');
assert.equal(
  preparedForNextGroup.heatCapacityFreeExperimentGroups.currentGroupId,
  preparedAfterPowerOff.heatCapacityFreeExperimentGroups.currentGroupId,
  'automatic experiment advance must preserve the current experiment group',
);
assert.deepEqual(
  selectHeatCapacityFreeActiveRunConfigSnapshot(preparedForNextGroup),
  selectHeatCapacityFreeActiveRunConfigSnapshot(preparedAfterPowerOff),
);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(preparedForNextGroup).ambientPressureKPa, 99.8);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(preparedForNextGroup).leakageRatePerS, 0.0018);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(preparedForNextGroup).instrumentNoiseEnabled, false);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(preparedForNextGroup), false);
assert.equal(getHeatCapacityFreeParameterLockReason(preparedForNextGroup), 'batchStarted');

const heliumGasFile = applyHeatCapacityFreeParameterDraftWorkbenchState(defaultFile, {
  ...selectHeatCapacityFreeAppliedParameterDraft(defaultFile),
  gasType: 'helium',
});
assert.equal(selectHeatCapacityFreeGasType(heliumGasFile), 'helium');
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(heliumGasFile).gasType, 'helium');
assert.equal(heliumGasFile.theoreticalGamma, 5 / 3);
assert.equal(heliumGasFile.heatCapacityFreeInstrumentConfig.physics.gamma, 5 / 3);
assert.equal(
  selectHeatCapacityFreeAppliedParameterDraft(heliumGasFile).gasWallConductanceWPerK,
  0.03,
  'switching to helium should apply the tuned monatomic gas-wall conductance default',
);
assert.equal(
  heliumGasFile.heatCapacityFreeInstrumentConfig.physics.thermal.gasWallConductanceWPerK,
  0.03,
  'helium physics config should use the tuned monatomic gas-wall conductance',
);
assert.equal(
  selectHeatCapacityFreeAppliedParameterDraft(heliumGasFile).leakageRatePerS,
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS.helium.leakageRatePerS,
  'switching to helium should apply the tuned monatomic leakage default',
);
assert.equal(
  heliumGasFile.heatCapacityFreeInstrumentConfig.physics.leakage.ratePerS,
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS.helium.leakageRatePerS,
  'helium physics config should use the tuned monatomic leakage rate',
);

const idealHeliumFile = applyHeatCapacityFreeParameterDraftWorkbenchState(
  setHeatCapacityFreeParameterSchemeWorkbenchState(defaultFile, 'ideal', 2900),
  {
    ...selectHeatCapacityFreeAppliedParameterDraft(defaultFile),
    gasType: 'helium',
  },
  2901,
);
assert.equal(idealHeliumFile.heatCapacityFreeParameterScheme, 'ideal');
assert.equal(selectHeatCapacityFreeGasType(idealHeliumFile), 'helium');
assert.equal(idealHeliumFile.heatCapacityFreeIdealDomain.gasType, 'helium');
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.physics.gamma, 5 / 3);
assert.equal(idealHeliumFile.theoreticalGamma, 5 / 3);
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled, false);
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.sensor.quantizationMv, 0);
assert.equal(
  idealHeliumFile.heatCapacityFreeInstrumentConfig.sensor.minSampleIntervalS,
  idealHeliumFile.heatCapacityFreeInstrumentConfig.sensor.maxSampleIntervalS,
);
assert.equal(
  idealHeliumFile.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv,
  0,
);
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.physics.leakage.enabled, false);
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.physics.leakage.ratePerS, 0);
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.physics.environmentDisturbance?.enabled, false);
assert.equal(idealHeliumFile.heatCapacityFreeInstrumentConfig.physics.pumpValveExchange?.enabled, false);
assert.equal(
  idealHeliumFile.heatCapacityFreeRealDomain.gasType,
  'air',
  'changing Ideal gas must not overwrite the independent Real parameter domain',
);

const gasTypeFrozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(
  configureHeatCapacityFreeBatchWorkbenchState(heliumGasFile, 3, 3000),
);
const gasTypeNextGroupFile = prepareNextHeatCapacityFreeExperimentWorkbenchState({
  ...gasTypeFrozenFile,
  powerOn: false,
  heatCapacityFreeRunWorkspace: {
    ...gasTypeFrozenFile.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed',
    trials: [
      {
        ...completedFreeTrial,
        id: 'completed-gas-type-lock-marker',
        configSnapshot: selectHeatCapacityFreeActiveRunConfigSnapshot(gasTypeFrozenFile),
        completedAtMs: 3000,
      },
    ],
  },
});
const gasTypeLockedEdit = applyHeatCapacityFreeParameterDraftWorkbenchState(gasTypeNextGroupFile, {
  ...selectHeatCapacityFreeAppliedParameterDraft(gasTypeNextGroupFile),
  ambientPressureKPa: 100.1,
  gasType: 'air',
});
assert.equal(
  selectHeatCapacityFreeAppliedParameterDraft(gasTypeLockedEdit).ambientPressureKPa,
  selectHeatCapacityFreeAppliedParameterDraft(gasTypeNextGroupFile).ambientPressureKPa,
);
assert.equal(selectHeatCapacityFreeGasType(gasTypeLockedEdit), 'helium');
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(gasTypeLockedEdit).gasType, 'helium');
assert.equal(gasTypeLockedEdit.heatCapacityFreeInstrumentConfig.physics.gamma, 5 / 3);
assert.equal(gasTypeLockedEdit.theoreticalGamma, 5 / 3);

const incompleteGasTypeRun = freezeHeatCapacityFreeParametersForCurrentGroup(
  configureHeatCapacityFreeBatchWorkbenchState(heliumGasFile, 3, 1233),
);
const resetGasTypeFile = restartHeatCapacityFreeBatchWorkbenchState(incompleteGasTypeRun, 1234);
const resetGasTypeEdit = applyHeatCapacityFreeParameterDraftWorkbenchState(resetGasTypeFile, {
  ...selectHeatCapacityFreeAppliedParameterDraft(resetGasTypeFile),
  gasType: 'air',
});
assert.equal(resetGasTypeEdit.heatCapacityFreeRunWorkspace.trials.length, 0);
assert.equal(selectHeatCapacityFreeGasType(resetGasTypeEdit), 'helium');
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(resetGasTypeEdit).gasType, 'helium');
assert.equal(resetGasTypeEdit.theoreticalGamma, 5 / 3);
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(resetGasTypeEdit).gasWallConductanceWPerK, 0.03);
assert.equal(
  selectHeatCapacityFreeAppliedParameterDraft(resetGasTypeEdit).leakageRatePerS,
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS.helium.leakageRatePerS,
);

const allEditableParametersChanged = applyHeatCapacityFreeParameterDraftWorkbenchState(defaultFile, {
  ...selectHeatCapacityFreeAppliedParameterDraft(defaultFile),
  ambientPressureKPa: 99.1,
  ambientTemperatureK: 302.4,
  leakageEnabled: false,
  instrumentNoiseEnabled: false,
  gasType: 'helium',
  gasWallConductanceWPerK: 0.31,
  wallAmbientConductanceWPerK: 0.82,
  wallHeatCapacityJPerK: 72,
  leakageRatePerS: 0.0002,
  noiseMv: 0.11,
  sensorLagTimeS: 0.42,
  u0ZeroToleranceMv: 0.2,
  pressureStableSlopeMvPerS: 0.4,
  temperatureStableSlopeMvPerS: 0.3,
  temperatureAmbientToleranceMv: 0.6,
  minimumUsefulU1CorrectedMv: 80,
  overVentedMinimumU2CorrectedMv: 1.5,
  pressureWarningMv: 118,
  pressureDangerMv: 148,
});
const restoredDefaultParameters = resetHeatCapacityFreeParametersToDefaultWorkbenchState(
  {
    ...allEditableParametersChanged,
    hardSphereViewEnabled: true,
  },
);
assert.deepEqual(
  selectHeatCapacityFreeAppliedParameterDraft(restoredDefaultParameters),
  selectHeatCapacityFreeAppliedParameterDraft(defaultFile),
  'default reset should restore every exposed Free parameter, including advanced values',
);
assert.equal(restoredDefaultParameters.heatCapacityFreeInstrumentConfig.physics.gamma, defaultFile.heatCapacityFreeInstrumentConfig.physics.gamma);
assert.equal(restoredDefaultParameters.theoreticalGamma, defaultFile.theoreticalGamma);
assert.equal(restoredDefaultParameters.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled, defaultFile.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled);
assert.equal(restoredDefaultParameters.heatCapacityFreeInstrumentConfig.pressureWarningMv, defaultFile.heatCapacityFreeInstrumentConfig.pressureWarningMv);
assert.equal(restoredDefaultParameters.hardSphereViewEnabled, defaultFile.hardSphereViewEnabled);

const lockedDefaultResetAttempt = resetHeatCapacityFreeParametersToDefaultWorkbenchState(
  freezeHeatCapacityFreeParametersForCurrentGroup(
    configureHeatCapacityFreeBatchWorkbenchState(allEditableParametersChanged, 3, 4000),
  ),
);
assert.equal(
  selectHeatCapacityFreeAppliedParameterDraft(lockedDefaultResetAttempt).ambientPressureKPa,
  selectHeatCapacityFreeAppliedParameterDraft(allEditableParametersChanged).ambientPressureKPa,
  'default reset should respect the same lock as manual parameter edits',
);

const acknowledgedAdvanced = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  defaultFile,
  'advancedParametersRisk',
);
assert.equal(acknowledgedAdvanced.heatCapacityFreeFileAcknowledgements.advancedParametersRisk, true);
assert.equal(acknowledgedAdvanced.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro, false);
const acknowledgedFromContaminatedState = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  {
    ...defaultFile,
    heatCapacityFreeFileAcknowledgements: {
      advancedParametersRisk: 'false',
      idealParameterProfileIntro: true,
      staleNoticeKey: true,
    } as any,
  },
  'advancedParametersRisk',
);
assert.deepEqual(
  acknowledgedFromContaminatedState.heatCapacityFreeFileAcknowledgements,
  {
    advancedParametersRisk: true,
    idealParameterProfileIntro: true,
  },
  'acknowledging a Free notice should keep only strict known acknowledgement flags',
);

const acknowledgedIdeal = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  defaultFile,
  'idealParameterProfileIntro',
);
assert.equal(acknowledgedIdeal.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro, true);
assert.equal(acknowledgedIdeal.heatCapacityFreeFileAcknowledgements.advancedParametersRisk, false);
const resetAfterIdealAcknowledgement = resetHeatCapacityFreeRunWorkbenchState(acknowledgedIdeal, 42_000);
assert.equal(
  resetAfterIdealAcknowledgement.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro,
  true,
  'resetting a Free run should preserve file-level ideal-profile acknowledgement',
);

assert.equal(
  isHeatCapacityFreeParameterEditingAvailable({
    ...defaultFile,
    heatCapacityMode: 'demo',
  }),
  false,
);
assert.equal(
  isHeatCapacityFreeParameterEditingAvailable({
    ...defaultFile,
    runState: 'running',
  }),
  false,
);
assert.equal(
  isHeatCapacityFreeParameterEditingAvailable({
    ...defaultFile,
    runState: 'paused',
  }),
  false,
);

for (const heatCapacityMode of ['demo', 'guide'] as const) {
  const teachingFile = {
    ...defaultFile,
    heatCapacityMode,
  };
  assert.equal(canOpenHeatCapacityParameterSidebar(teachingFile), false);
  assert.equal(
    getHeatCapacityParameterSidebarBlockReason(teachingFile),
    'freeModeOnly',
  );
}

assert.equal(canOpenHeatCapacityParameterSidebar(defaultFile), true);
assert.equal(getHeatCapacityParameterSidebarBlockReason(defaultFile), null);
assert.equal(canOpenHeatCapacityParameterSidebar(null), true);
assert.equal(getHeatCapacityParameterSidebarBlockReason(null), null);

console.log('workbenchHeatCapacityFreeParameters tests passed');
