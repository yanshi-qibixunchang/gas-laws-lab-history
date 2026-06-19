import assert from 'node:assert/strict';
import {
  acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState,
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
  prepareNextHeatCapacityFreeExperimentGroupWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchState,
  shouldPromptHeatCapacityFreePowerOffBeforeNextGroup,
} from '../../src/features/workbench/workbenchState.ts';

const defaultFile = createDefaultHeatCapacityFile(1);

assert.equal(defaultFile.heatCapacityMode, 'free');
assert.equal(defaultFile.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(defaultFile.heatCapacityFreeParameterDraft.ambientPressureKPa, 101.3);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.ambientTemperatureK, 298.15);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.gasWallConductanceWPerK, 0.14);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.wallAmbientConductanceWPerK, 0.45);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.leakageEnabled, true);
assert.equal(defaultFile.heatCapacityFreeParameterDraft.instrumentNoiseEnabled, true);
assert.equal(defaultFile.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.equal(defaultFile.heatCapacityFreeAdvancedRiskAccepted, false);
assert.equal(defaultFile.heatCapacityFreeInstrumentNoiseEnabled, true);
assert.equal(defaultFile.heatCapacityFreeRecordConfig.u0ZeroToleranceMv, 0.12);
assert.equal(defaultFile.heatCapacityFreePressureWarningMv, 120);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(defaultFile), true);
assert.equal(getHeatCapacityFreeParameterLockReason(defaultFile), null);

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
assert.match(getHeatCapacityFreeParameterLockReason(frozenFile) ?? '', /已开始|锁定/);
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
  '请先关闭电源，完成本组实验后再调整参数。',
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
assert.equal(preparedAfterPowerOff.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(preparedAfterPowerOff.heatCapacityFreeActiveRunConfigSnapshot, null);
assert.equal(isHeatCapacityFreeParameterEditingAvailable(preparedAfterPowerOff), true);

const gammaEditedFile = applyHeatCapacityFreeParameterDraftWorkbenchState(defaultFile, {
  ...defaultFile.heatCapacityFreeParameterDraft,
  gamma: 1.67,
});
assert.equal(gammaEditedFile.theoreticalGamma, 1.67);
assert.equal(gammaEditedFile.heatCapacityFreePhysicsConfig.gamma, 1.67);

const gammaFrozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(gammaEditedFile);
const gammaNextGroupFile = prepareNextHeatCapacityFreeExperimentGroupWorkbenchState({
  ...gammaFrozenFile,
  heatCapacityFreeTrials: [
    {
      id: 'completed-gamma-lock-marker',
      source: 'free',
      traceTrialId: null,
      branchCount: 0,
      automaticU0: null,
      u0: null,
      u1: null,
      u2: null,
      blockedReason: null,
      correctedSignals: null,
      configSnapshot: gammaFrozenFile.heatCapacityFreeActiveRunConfigSnapshot,
    },
  ],
});
const gammaLockedEdit = applyHeatCapacityFreeParameterDraftWorkbenchState(gammaNextGroupFile, {
  ...gammaNextGroupFile.heatCapacityFreeParameterDraft,
  ambientPressureKPa: 100.1,
  gamma: 1.2,
});
assert.equal(gammaLockedEdit.heatCapacityFreeParameterDraft.ambientPressureKPa, 100.1);
assert.equal(gammaLockedEdit.heatCapacityFreeParameterDraft.gamma, 1.67);
assert.equal(gammaLockedEdit.heatCapacityFreePhysicsConfig.gamma, 1.67);
assert.equal(gammaLockedEdit.theoreticalGamma, 1.67);

const incompleteGammaRun = freezeHeatCapacityFreeParametersForCurrentGroup(gammaEditedFile);
const resetGammaFile = resetHeatCapacityFreeRunWorkbenchState(incompleteGammaRun, 1234);
const resetGammaEdit = applyHeatCapacityFreeParameterDraftWorkbenchState(resetGammaFile, {
  ...resetGammaFile.heatCapacityFreeParameterDraft,
  gamma: 1.33,
});
assert.equal(resetGammaEdit.heatCapacityFreeTrials.length, 0);
assert.equal(resetGammaEdit.heatCapacityFreeParameterDraft.gamma, 1.33);
assert.equal(resetGammaEdit.theoreticalGamma, 1.33);

assert.equal(
  acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState(defaultFile).heatCapacityFreeAdvancedRiskAccepted,
  true,
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
    '只有自由实验模式可以调整参数。',
  );
}

assert.equal(canOpenHeatCapacityParameterSidebar(defaultFile), true);
assert.equal(getHeatCapacityParameterSidebarBlockReason(defaultFile), null);
assert.equal(canOpenHeatCapacityParameterSidebar(null), true);
assert.equal(getHeatCapacityParameterSidebarBlockReason(null), null);

console.log('workbenchHeatCapacityFreeParameters tests passed');
