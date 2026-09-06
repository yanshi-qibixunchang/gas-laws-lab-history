import assert from 'node:assert/strict';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import type { WorkbenchHeatCapacityState } from '../../src/features/workbench/workbenchHeatCapacityStateTypes.ts';
import {
  canProceedAfterPumping,
  getActiveTrialRecordedU1Mv,
  getGuideHeatCapacityDecisionPressureMv,
  getGuideHeatCapacityDisplayedPressureMv,
  getGuideHeatCapacityThresholdPressureMv,
  getHeatCapacityPressureSafetyStatusFromMv,
  getGuideHeatCapacityDecisionTemperatureMv,
  isGuideHeatCapacityTemperatureAtAmbient,
  isGuideU0ZeroAttempted,
  isGuideU0ZeroReady,
  hasActiveTrialU1,
  hasActiveTrialU2,
  hasGuideHeatCapacityWaitElapsed,
  isGuideHeatCapacityReleaseCompleteForU2,
  hasGuideHeatCapacityReachedPumpTarget,
  isGuideU1RecordReady,
  isGuideU2RecordReady,
  getHeatCapacityGuideStep,
} from '../../src/features/workbench/workbenchHeatCapacityGuideDecisions.ts';
import { getGuideStepGuidance } from '../../src/features/workbench/workbenchHeatCapacityGuideGuidance.ts';
import { getHeatCapacityRealtimeCopy } from '../../src/features/workbench/workbenchHeatCapacityRealtimeCopy.ts';
import { getHeatCapacityPressureThresholdsMv } from '../../src/features/workbench/workbenchHeatCapacityInstrumentState.ts';
import { selectActiveHeatCapacityWorkbenchDisplay } from '../../src/features/workbench/workbenchHeatCapacityDisplayState.ts';
import { createHeatCapacityGuideTrial, type HeatCapacityGuideRecord } from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import { HEAT_CAPACITY_TEMPERATURE_BASELINE_MV } from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';
import type { HeatCapacityProcessSamplePoint } from '../../src/domain/heatCapacity/heatCapacityProcessTypes.ts';
import type { HeatCapacityGuideWorkflowStep } from '../../src/domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import type { GuideHeatCapacityStep } from '../../src/features/heatCapacity/heatCapacityGuideStepModel.ts';

const base = createDefaultHeatCapacityFile(1);
const ambient = HEAT_CAPACITY_TEMPERATURE_BASELINE_MV;
const freeze = <T,>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};
const fileWith = (patch: Partial<WorkbenchHeatCapacityState> = {}) => freeze({
  ...base,
  heatCapacityMode: null,
  heatCapacityGuideTrial: createHeatCapacityGuideTrial('current-guide-trial'),
  temperatureSignalTargetMv: ambient,
  ...patch,
} as WorkbenchHeatCapacityState);
const record = (pressure: number): HeatCapacityGuideRecord => ({
  atS: 0, displayPressureMv: pressure, displayTemperatureMv: ambient,
  calibrationVersion: 1, zeroEventId: 'current-zero',
});
const sample = (timeS: number, pressureSignalMv = 120): HeatCapacityProcessSamplePoint => ({
  timeS, phase: 'sealedStabilizing', temperatureSignalMv: ambient, pressureSignalMv,
  gasTemperatureK: 293.15, gasPressureKPaAbs: 107.3, pressureDeltaKPa: 6,
  pumpFrequency: 0, pumpValveOpen: false, stopcockOpen: false,
});

// Reading preference differs intentionally between decisions and the visible value.
for (const [values, decision, displayed] of [
  [[11, 22, 33], 11, 33],
  [[NaN, 22, 33], 22, 33],
  [[11, 22, NaN], 11, 22],
  [[11, NaN, NaN], 11, 11],
  [[NaN, NaN, 33], 33, 33],
  [[NaN, NaN, NaN], 0, 0],
] as const) {
  const file = fileWith({
    pressureSignalTargetMv: values[0], pressureSignalMvDisplayed: values[1], pressureSignalMv: values[2],
  });
  assert.equal(getGuideHeatCapacityDecisionPressureMv(file), decision);
  assert.equal(getGuideHeatCapacityDisplayedPressureMv(file), displayed);
}
for (const [raw, target, displayed, signal, expected] of [
  [9, 30, 40, 50, 9],
  [NaN, 30, 40, 50, 27],
  [NaN, NaN, 40, 50, 37],
  [NaN, NaN, NaN, 50, 47],
  [NaN, 1, 40, 50, 0],
  [NaN, NaN, NaN, NaN, 0],
] as const) {
  const file = fileWith({
    pressureSignalMvRaw: raw, pressureSignalTargetMv: target, pressureSignalMvDisplayed: displayed,
    pressureSignalMv: signal, pressureInitialBiasMv: 1, pressureZeroOffset: 2,
  });
  assert.equal(getGuideHeatCapacityThresholdPressureMv(file), expected);
}
const guideDisplay = fileWith({
  heatCapacityMode: 'guide', pressureSignalMvRaw: 500, pressureSignalTargetMv: 100,
  pressureSignalMv: 119.9, pressureSignalMvDisplayed: 140,
});
assert.equal(getGuideHeatCapacityThresholdPressureMv(guideDisplay), Math.max(0, selectActiveHeatCapacityWorkbenchDisplay(guideDisplay).pressureMv));
assert.equal(hasGuideHeatCapacityReachedPumpTarget(guideDisplay), false, 'Guide pumping uses the visible pressure, not a hidden raw peak');
assert.equal(canProceedAfterPumping(fileWith({ pressureSignalMvRaw: 89.99 })), false);
assert.equal(canProceedAfterPumping(fileWith({ pressureSignalMvRaw: 90 })), true);
const thresholds = getHeatCapacityPressureThresholdsMv(base);
assert.equal(getHeatCapacityPressureSafetyStatusFromMv(thresholds.pressureWarningThresholdMv - 0.01, base), 'normal');
assert.equal(getHeatCapacityPressureSafetyStatusFromMv(thresholds.pressureWarningThresholdMv, base), 'warning');
assert.equal(getHeatCapacityPressureSafetyStatusFromMv(thresholds.pressureDangerThresholdMv, base), 'danger');

assert.equal(getGuideHeatCapacityDecisionTemperatureMv(fileWith({ temperatureSignalTargetMv: NaN, temperatureSignalMv: 1500 })), 1500);
assert.equal(getGuideHeatCapacityDecisionTemperatureMv(fileWith({ temperatureSignalTargetMv: NaN, temperatureSignalMv: NaN })), ambient);
assert.equal(isGuideHeatCapacityTemperatureAtAmbient(fileWith({ temperatureSignalTargetMv: ambient + 0.49 })), true);
assert.equal(isGuideHeatCapacityTemperatureAtAmbient(fileWith({ temperatureSignalTargetMv: ambient + 10 })), false);
assert.equal(isGuideU0ZeroAttempted(fileWith({ pressureZeroAdjusted: false, pressureZeroAdjustMode: 'none', pressureZeroKnobAngle: 0 })), false);
assert.equal(isGuideU0ZeroAttempted(fileWith({ pressureZeroAdjusted: true })), true);
const zeroReady = fileWith({
  powerOn: true, stopcockAngleDeg: 90,
  pressureZeroDisplayedSamples: Array.from({ length: 5 }, (_, index) => ({ atMs: index * 250, valueMv: 0.1 })),
});
assert.equal(isGuideU0ZeroReady(zeroReady), true);
assert.equal(isGuideU0ZeroReady(fileWith({ ...zeroReady, powerOn: false })), false);
assert.equal(isGuideU0ZeroReady(fileWith({ ...zeroReady, stopcockAngleDeg: 0 })), false);
assert.equal(isGuideU0ZeroReady(fileWith({ ...zeroReady, pressureZeroDisplayedSamples: zeroReady.pressureZeroDisplayedSamples.slice(1) })), false);

const u1Ready = fileWith({
  powerOn: true, stopcockAngleDeg: 0, pumpValveOpen: false, pumpStrokeCount: 1,
  pressureSignalMvRaw: 120, pressureSignalTargetMv: 120, pressureSignalMv: 120,
  simulationTimeS: 400, heatCapacityPhase: 'sealedStabilizing',
  heatCapacityProcessSamples: { afterPumpSample: sample(100) },
  heatCapacityGuideTrial: { ...createHeatCapacityGuideTrial('current'), u0: record(0) },
});
assert.equal(isGuideU1RecordReady(u1Ready), true);
assert.equal(hasGuideHeatCapacityWaitElapsed(u1Ready, 'u1'), true);
for (const patch of [
  { stopcockAngleDeg: 90 }, { pumpValveOpen: true }, { pressureSignalMvRaw: 89.9 },
  { temperatureSignalTargetMv: ambient + 10 }, { simulationTimeS: 399.999 },
  { heatCapacityPhase: 'recovering' as const }, { heatCapacityProcessSamples: {} },
]) {
  assert.equal(isGuideU1RecordReady(fileWith({ ...u1Ready, ...patch })), false, JSON.stringify(patch));
}
assert.equal(getHeatCapacityGuideStep(u1Ready, false), 'recordU1Required');
assert.equal(getHeatCapacityGuideStep(u1Ready, true), 'idle', 'non-Guide compatibility flow receives the existing Demo lock explicitly');
assert.equal(getHeatCapacityGuideStep(fileWith({ ...u1Ready, runState: 'finished' }), false), 'idle');
assert.equal(getHeatCapacityGuideStep(fileWith({ ...u1Ready, powerOn: false }), false), 'powerOnRequired');
assert.equal(hasActiveTrialU1(u1Ready), false);
assert.equal(getActiveTrialRecordedU1Mv(u1Ready), null);

const u2Ready = fileWith({
  ...u1Ready, pressureSignalMvRaw: 30, pressureSignalTargetMv: 30,
  heatCapacityPhase: 'recovering', heatCapacityReleaseState: { ...base.heatCapacityReleaseState, formedRelease: true },
  heatCapacityProcessSamples: { releaseLowSample: sample(100, 0), afterReleaseSample: sample(390, 0) },
  heatCapacityGuideTrial: { ...u1Ready.heatCapacityGuideTrial!, u1: record(120) },
});
assert.equal(hasActiveTrialU1(u2Ready), true);
assert.equal(hasActiveTrialU2(u2Ready), false);
assert.equal(isGuideU2RecordReady(u2Ready), true);
assert.equal(hasGuideHeatCapacityWaitElapsed(u2Ready, 'u2'), true, 'release-low sample retains priority over later after-release sample');
assert.equal(getHeatCapacityGuideStep(u2Ready, false), 'recordU2Required');
for (const patch of [
  { stopcockAngleDeg: 90 }, { pressureSignalMvRaw: 0.19 }, { pressureSignalMvRaw: 66.01 },
  { temperatureSignalTargetMv: ambient + 10 }, { simulationTimeS: 399.999 },
  { heatCapacityPhase: 'sealedStabilizing' as const },
  { heatCapacityGuideTrial: createHeatCapacityGuideTrial('new-current') },
]) {
  assert.equal(isGuideU2RecordReady(fileWith({ ...u2Ready, ...patch })), false, JSON.stringify(patch));
}
assert.equal(isGuideHeatCapacityReleaseCompleteForU2(u2Ready, null), false, 'completed historical samples cannot supply another trial U1');
const noSampleRelease = fileWith({
  ...u2Ready, heatCapacityPhase: 'releasing', heatCapacityProcessSamples: {}, pressureSignalTargetMv: 16.8,
});
assert.equal(isGuideHeatCapacityReleaseCompleteForU2(noSampleRelease, 120), true);
assert.equal(isGuideHeatCapacityReleaseCompleteForU2(fileWith({ ...noSampleRelease, pressureSignalTargetMv: 16.81 }), 120), false);
assert.equal(isGuideHeatCapacityReleaseCompleteForU2(fileWith({
  ...noSampleRelease, heatCapacityReleaseState: { ...base.heatCapacityReleaseState, formedRelease: false },
}), 120), false);
const completed = fileWith({ ...u2Ready, heatCapacityGuideTrial: { ...u2Ready.heatCapacityGuideTrial!, u2: record(30) } });
assert.equal(getHeatCapacityGuideStep(completed, false), 'completed');

const guideSteps: Record<HeatCapacityGuideWorkflowStep, GuideHeatCapacityStep> = {
  powerRequired: 'powerOnRequired', preheatRequired: 'preheatRequired',
  openStopcockForZeroRequired: 'openStopcockForZeroRequired', zeroRequired: 'zeroAdjustRequired',
  recordU0Required: 'recordU0Required', closeStopcockBeforePumpRequired: 'closeStopcockRequired',
  openPumpValveRequired: 'openPumpValveRequired', pumpRequired: 'pumpRequired',
  closePumpValveRequired: 'closePumpValveRequired', u1Waiting: 'stabilizeBeforeReleaseRequired',
  recordU1Required: 'recordU1Required', openStopcockForReleaseRequired: 'openStopcockReleaseRequired',
  closeStopcockAfterReleaseRequired: 'closeStopcockAfterReleaseRequired', u2Waiting: 'recoverRequired',
  recordU2Required: 'recordU2Required', closePowerRequired: 'closePowerRequired', completed: 'completed',
};
for (const [step, expected] of Object.entries(guideSteps)) {
  const file = fileWith({
    heatCapacityMode: 'guide', powerOn: false, runState: 'finished',
    heatCapacityGuideWorkflow: { ...base.heatCapacityGuideWorkflow, step: step as HeatCapacityGuideWorkflowStep },
  });
  assert.equal(getHeatCapacityGuideStep(file, true), expected, 'Guide workflow authority precedes generic power, run and Demo-lock hints');
}

for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
  const copy = getHeatCapacityRealtimeCopy(language);
  for (const step of ['idle', ...Object.values(guideSteps)] as const) {
    const result = getGuideStepGuidance(step, u2Ready, language, copy);
    assert.ok(result.message.length > 0, language + ':' + step);
    assert.ok(result.controlId === null || typeof result.controlId === 'string');
  }
  assert.equal(getGuideStepGuidance('openPumpValveRequired', undefined, language, copy).message, copy.guideUsageHints.pumpValve);
  assert.match(getGuideStepGuidance('stabilizeBeforeReleaseRequired', u1Ready, language, copy).message, /5 min/);
  assert.match(getGuideStepGuidance('recoverRequired', u2Ready, language, copy).message, /5 min/);
}
const copy = getHeatCapacityRealtimeCopy('zh-CN');
assert.match(getGuideStepGuidance('zeroAdjustRequired', fileWith({ pressureZeroAdjusted: true }), 'zh-CN', copy).message, /仍未接近 0/);
assert.match(getGuideStepGuidance('openStopcockReleaseRequired', fileWith({ ...noSampleRelease, pressureSignalTargetMv: 50, stopcockAngleDeg: 90 }), 'zh-CN', copy).message, /保持玻璃旋塞打开/);
assert.match(getGuideStepGuidance('openStopcockReleaseRequired', u2Ready, 'zh-CN', copy).message, /关闭玻璃旋塞/);
assert.equal(u2Ready.heatCapacityGuideTrial?.u1?.displayPressureMv, 120);
assert.equal(u2Ready.heatCapacityFreeExperimentGroups, base.heatCapacityFreeExperimentGroups, 'read-only decisions preserve the original experiment-group authority reference');
console.log('workbenchHeatCapacityGuideDecisions tests passed');
