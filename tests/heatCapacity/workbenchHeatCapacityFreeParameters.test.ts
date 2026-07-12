import assert from 'node:assert/strict';
import {
  acknowledgeHeatCapacityFreeFileNoticeWorkbenchState,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  canOpenHeatCapacityParameterSidebar,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityFreeParameterLockReason,
  getHeatCapacityParameterSidebarBlockReason,
  hasCompletedHeatCapacityFreeRecordSet,
  isHeatCapacityFreeExperimentGroupComplete,
  isHeatCapacityFreeParameterEditingAvailable,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityFreeExperimentGroupForUserOperation,
  prepareNextHeatCapacityFreeExperimentGroupWorkbenchState,
  resetHeatCapacityFreeParametersToDefaultWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchState,
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

const defaultFile = createDefaultHeatCapacityFile(1);

assert.equal(defaultFile.heatCapacityMode, 'free');
assert.equal(defaultFile.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(defaultFile.heatCapacityFreeParameterDraft.ambientPressureKPa, 101.3);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.ambientTemperatureK, 298.15);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.gasWallConductanceWPerK, 0.14);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.wallAmbientConductanceWPerK, 0.45);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.leakageEnabled, true);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.instrumentNoiseEnabled, true);
assert.equal(defaultFile.heatCapacityFreeGasType, 'air');
assert.equal(defaultFile.heatCapacityFreeParameterDraft.gasType, 'air');
assert.equal(defaultFile.theoreticalGamma, 1.4);
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.gamma, 1.4);
assert.equal(defaultFile.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.deepEqual(defaultFile.heatCapacityFreeFileAcknowledgements, {
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});
assert.equal(defaultFile.heatCapacityFreeParameterScheme, 'real');
assert.equal(defaultFile.heatCapacityFreeDisplayScheme, 'real');
assert.equal(defaultFile.heatCapacityFreeInstrumentNoiseEnabled, true);
assert.equal(defaultFile.heatCapacityFreeRecordConfig.u0ZeroToleranceMv, 0.12);
assert.equal(defaultFile.heatCapacityFreePressureWarningMv, 120);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(defaultFile), true);
assert.equal(getHeatCapacityFreeParameterLockReason(defaultFile), null);

const contaminatedProjectionFile = {
  ...defaultFile,
  heatCapacityFreePhysicsConfig: {
    ...defaultFile.heatCapacityFreePhysicsConfig,
    thermal: {
      ...defaultFile.heatCapacityFreePhysicsConfig.thermal,
      gasWallConductanceWPerK: 5,
      wallAmbientConductanceWPerK: 5,
    },
  },
  heatCapacityFreeParameterDraft: {
    ...defaultFile.heatCapacityFreeParameterDraft,
    gasWallConductanceWPerK: 5,
    wallAmbientConductanceWPerK: 5,
  },
};
const repairedProjectionFile = stepHeatCapacityWorkbenchFile(contaminatedProjectionFile, 1000);
assert.equal(
  repairedProjectionFile.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK,
  0.14,
  'free-mode runtime hydration should rebuild a polluted real top-level projection from the real domain',
);
assert.equal(
  repairedProjectionFile.heatCapacityFreeRealDomain.physicsConfig.thermal.gasWallConductanceWPerK,
  0.14,
  'free-mode runtime hydration must not write a polluted top-level projection back into the real domain',
);

const editedDraft = {
  ...defaultFile.heatCapacityFreeParameterDraft,
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
assert.equal(editedFile.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(editedFile.heatCapacityFreeParameterDraft.ambientPressureKPa, 99.8);
assert.equal(editedFile.heatCapacityFreeParameterDraft.leakageEnabled, true);
assert.equal(editedFile.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.equal(
  editedFile.heatCapacityFreePhysicsConfig.environment.ambientPressureKPa,
  99.8,
  'draft application should keep the current file config aligned before freezing',
);

const frozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(editedFile);
assert.equal(frozenFile.heatCapacityFreeExperimentGroupStatus, 'running');
assert.equal(isHeatCapacityFreeParameterEditingAvailable(frozenFile), false);
assert.equal(getHeatCapacityFreeParameterLockReason(frozenFile), 'groupStarted');
assert.notEqual(frozenFile.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.equal(
  frozenFile.heatCapacityFreeActiveRunConfigSnapshot?.environment.ambientPressureKPa,
  99.8,
);
assert.equal(
  frozenFile.heatCapacityFreeActiveRunConfigSnapshot?.physics.thermal.gasWallConductanceWPerK,
  0.35,
);
assert.equal(frozenFile.heatCapacityFreeActiveRunConfigSnapshot?.physics.leakage.enabled, true);
assert.equal(frozenFile.heatCapacityFreeActiveRunConfigSnapshot?.sensor.noiseMv, 0);
assert.equal(frozenFile.heatCapacityFreeInstrumentNoiseEnabled, false);
assert.equal(frozenFile.heatCapacityFreePressureWarningMv, 122);
assert.equal(frozenFile.heatCapacityFreeRecordConfig.pressureDangerMv, 150);

const nextGroupFile = prepareNextHeatCapacityFreeExperimentGroupWorkbenchState(frozenFile);
assert.equal(nextGroupFile.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(nextGroupFile.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.equal(nextGroupFile.heatCapacityFreeParameterDraft.ambientPressureKPa, 99.8);
assert.equal(nextGroupFile.heatCapacityFreeParameterDraft.leakageRatePerS, 0.0018);
assert.equal(nextGroupFile.heatCapacityFreeParameterDraft.instrumentNoiseEnabled, false);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(nextGroupFile), true);

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
  correctedSignals: null,
  configSnapshot: frozenFile.heatCapacityFreeActiveRunConfigSnapshot,
} as any;
const completedGroupPowerOnFile = {
  ...frozenFile,
  powerOn: true,
  runState: 'idle' as const,
  heatCapacityFreeExperimentGroupStatus: 'completed' as const,
  heatCapacityFreeTrials: [completedFreeTrial],
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
  heatCapacityFreeExperimentGroupStatus: 'running' as const,
  heatCapacityFreeTrials: [{ ...completedFreeTrial, u2: null }],
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
assert.equal(preparedAfterPowerOff.heatCapacityFreeExperimentGroupStatus, 'completed');
assert.notEqual(preparedAfterPowerOff.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(preparedAfterPowerOff), true);

const snapshotParts = createCompleteProcessReviewFixtureParts();
const completedFileForStandardReferenceSnapshot = {
  ...defaultFile,
  powerOn: true,
  runState: 'idle' as const,
  pressureZeroed: true,
  heatCapacityFreeExperimentGroupStatus: 'completed' as const,
  heatCapacityFreeActiveRunConfigSnapshot: snapshotParts.traceTrial.configSnapshot,
  heatCapacityFreeTraceStore: snapshotParts.traceStore,
  heatCapacityFreeTrials: [{
    ...snapshotParts.trial,
    completedAtMs: null,
    standardReferenceSnapshot: null,
  }],
};
const finalizedFileWithStandardReferenceSnapshot = powerHeatCapacityWorkbenchFile(
  completedFileForStandardReferenceSnapshot,
  false,
  2400,
);
const persistedStandardReferenceSnapshot =
  finalizedFileWithStandardReferenceSnapshot.heatCapacityFreeTrials[0]?.standardReferenceSnapshot ?? null;
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
const preparedForNextUserOperation = prepareHeatCapacityFreeExperimentGroupForUserOperation(preparedAfterPowerOff, 2100);
assert.equal(preparedForNextUserOperation.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(preparedForNextUserOperation.heatCapacityFreeActiveRunConfigSnapshot, null);

const heliumGasFile = applyHeatCapacityFreeParameterDraftWorkbenchState(defaultFile, {
  ...defaultFile.heatCapacityFreeParameterDraft,
  gasType: 'helium',
});
assert.equal(heliumGasFile.heatCapacityFreeGasType, 'helium');
assert.equal(heliumGasFile.heatCapacityFreeParameterDraft.gasType, 'helium');
assert.equal(heliumGasFile.theoreticalGamma, 5 / 3);
assert.equal(heliumGasFile.heatCapacityFreePhysicsConfig.gamma, 5 / 3);
assert.equal(
  heliumGasFile.heatCapacityFreeParameterDraft.gasWallConductanceWPerK,
  0.03,
  'switching to helium should apply the tuned monatomic gas-wall conductance default',
);
assert.equal(
  heliumGasFile.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK,
  0.03,
  'helium physics config should use the tuned monatomic gas-wall conductance',
);
assert.equal(
  heliumGasFile.heatCapacityFreeParameterDraft.leakageRatePerS,
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS.helium.leakageRatePerS,
  'switching to helium should apply the tuned monatomic leakage default',
);
assert.equal(
  heliumGasFile.heatCapacityFreePhysicsConfig.leakage.ratePerS,
  HEAT_CAPACITY_FREE_GAS_TYPE_MODEL_DEFAULTS.helium.leakageRatePerS,
  'helium physics config should use the tuned monatomic leakage rate',
);

const gasTypeFrozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(heliumGasFile);
const gasTypeNextGroupFile = prepareNextHeatCapacityFreeExperimentGroupWorkbenchState({
  ...gasTypeFrozenFile,
  heatCapacityFreeTrials: [
    {
      id: 'completed-gas-type-lock-marker',
      source: 'free',
      parameterScheme: 'real',
      traceTrialId: null,
      branchCount: 0,
      automaticU0: null,
      u0: null,
      u1: null,
      u2: null,
      blockedReason: null,
      correctedSignals: null,
      configSnapshot: gasTypeFrozenFile.heatCapacityFreeActiveRunConfigSnapshot,
      standardReferenceSnapshot: null,
      completedAtMs: null,
    },
  ],
});
const gasTypeLockedEdit = applyHeatCapacityFreeParameterDraftWorkbenchState(gasTypeNextGroupFile, {
  ...gasTypeNextGroupFile.heatCapacityFreeParameterDraft,
  ambientPressureKPa: 100.1,
  gasType: 'air',
});
assert.equal(gasTypeLockedEdit.heatCapacityFreeParameterDraft.ambientPressureKPa, 100.1);
assert.equal(gasTypeLockedEdit.heatCapacityFreeGasType, 'helium');
assert.equal(gasTypeLockedEdit.heatCapacityFreeParameterDraft.gasType, 'helium');
assert.equal(gasTypeLockedEdit.heatCapacityFreePhysicsConfig.gamma, 5 / 3);
assert.equal(gasTypeLockedEdit.theoreticalGamma, 5 / 3);

const incompleteGasTypeRun = freezeHeatCapacityFreeParametersForCurrentGroup(heliumGasFile);
const resetGasTypeFile = resetHeatCapacityFreeRunWorkbenchState(incompleteGasTypeRun, 1234);
const resetGasTypeEdit = applyHeatCapacityFreeParameterDraftWorkbenchState(resetGasTypeFile, {
  ...resetGasTypeFile.heatCapacityFreeParameterDraft,
  gasType: 'air',
});
assert.equal(resetGasTypeEdit.heatCapacityFreeTrials.length, 0);
assert.equal(resetGasTypeEdit.heatCapacityFreeGasType, 'air');
assert.equal(resetGasTypeEdit.heatCapacityFreeParameterDraft.gasType, 'air');
assert.equal(resetGasTypeEdit.theoreticalGamma, 1.4);
assert.equal(resetGasTypeEdit.heatCapacityFreeParameterDraft.gasWallConductanceWPerK, 0.14);
assert.equal(resetGasTypeEdit.heatCapacityFreeParameterDraft.leakageRatePerS, 0.00005);

const allEditableParametersChanged = applyHeatCapacityFreeParameterDraftWorkbenchState(defaultFile, {
  ...defaultFile.heatCapacityFreeParameterDraft,
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
  restoredDefaultParameters.heatCapacityFreeParameterDraft,
  defaultFile.heatCapacityFreeParameterDraft,
  'default reset should restore every exposed Free parameter, including advanced values',
);
assert.equal(restoredDefaultParameters.heatCapacityFreePhysicsConfig.gamma, defaultFile.heatCapacityFreePhysicsConfig.gamma);
assert.equal(restoredDefaultParameters.theoreticalGamma, defaultFile.theoreticalGamma);
assert.equal(restoredDefaultParameters.heatCapacityFreeInstrumentNoiseEnabled, defaultFile.heatCapacityFreeInstrumentNoiseEnabled);
assert.equal(restoredDefaultParameters.heatCapacityFreePressureWarningMv, defaultFile.heatCapacityFreePressureWarningMv);
assert.equal(restoredDefaultParameters.hardSphereViewEnabled, defaultFile.hardSphereViewEnabled);

const lockedDefaultResetAttempt = resetHeatCapacityFreeParametersToDefaultWorkbenchState(
  freezeHeatCapacityFreeParametersForCurrentGroup(allEditableParametersChanged),
);
assert.equal(
  lockedDefaultResetAttempt.heatCapacityFreeParameterDraft.ambientPressureKPa,
  allEditableParametersChanged.heatCapacityFreeParameterDraft.ambientPressureKPa,
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
