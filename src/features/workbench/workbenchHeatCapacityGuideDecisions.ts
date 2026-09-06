import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import {
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  getHeatCapacityPressureThresholdsMv,
  getHeatCapacityStopcockState,
  isHeatCapacityPressureZeroWithinTolerance,
} from './workbenchHeatCapacityInstrumentState.ts';
import { selectActiveHeatCapacityWorkbenchDisplay } from './workbenchHeatCapacityDisplayState.ts';
import { HEAT_CAPACITY_TEMPERATURE_BASELINE_MV } from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import type { GuideHeatCapacityStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';

const HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS = 5 * 60 * 1000;
const HEAT_CAPACITY_GUIDE_WAIT_DURATION_S = HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS / 1000;

export const getGuideHeatCapacityDecisionPressureMv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
  if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
  if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
  return 0;
};

export const getGuideHeatCapacityDisplayedPressureMv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
  if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
  if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
  return 0;
};

export const getGuideHeatCapacityThresholdPressureMv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  if (file.heatCapacityMode === 'guide') {
    return Math.max(0, selectActiveHeatCapacityWorkbenchDisplay(file).pressureMv);
  }
  if (Number.isFinite(file.pressureSignalMvRaw)) return file.pressureSignalMvRaw;
  if (Number.isFinite(file.pressureSignalTargetMv)) return Math.max(0, file.pressureSignalTargetMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
  if (Number.isFinite(file.pressureSignalMvDisplayed)) return Math.max(0, file.pressureSignalMvDisplayed - file.pressureInitialBiasMv - file.pressureZeroOffset);
  if (Number.isFinite(file.pressureSignalMv)) return Math.max(0, file.pressureSignalMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
  return 0;
};

export const canProceedAfterPumping = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => getGuideHeatCapacityThresholdPressureMv(file) >= HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;

export const getHeatCapacityPressureSafetyStatusFromMv = (
  pressureMv: number,
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
): 'normal' | 'warning' | 'danger' => {
  const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
  return pressureMv >= pressureThresholdsMv.pressureDangerThresholdMv
    ? 'danger'
    : pressureMv >= pressureThresholdsMv.pressureWarningThresholdMv
    ? 'warning'
    : 'normal';
};

export const getGuideHeatCapacityAmbientTemperatureMv = (
  _file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  return HEAT_CAPACITY_TEMPERATURE_BASELINE_MV;
};

export const getGuideHeatCapacityDecisionTemperatureMv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  if (Number.isFinite(file.temperatureSignalTargetMv)) return file.temperatureSignalTargetMv;
  if (Number.isFinite(file.temperatureSignalMv)) return file.temperatureSignalMv;
  return getGuideHeatCapacityAmbientTemperatureMv(file);
};

export const isGuideHeatCapacityTemperatureAtAmbient = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const ambientTemperatureMv = getGuideHeatCapacityAmbientTemperatureMv(file);
  const targetTemperatureMv = getGuideHeatCapacityDecisionTemperatureMv(file);
  const toleranceMv = Math.max(0.5, (file.heatCapacityExperimentProfile?.displayNoiseLevel ?? 0.08) * 6);
  return Math.abs(targetTemperatureMv - ambientTemperatureMv) <= toleranceMv;
};

export const isGuideU0ZeroAttempted = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => (
  file.pressureZeroAdjusted ||
  file.pressureZeroAdjustMode !== 'none' ||
  Math.abs(file.pressureZeroKnobAngle) > 0.01
);

export const isGuideU0ZeroReady = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
  return file.powerOn &&
    stopcockState === 'open' &&
    isHeatCapacityPressureZeroWithinTolerance(file.pressureZeroDisplayedSamples);
};

export const hasActiveTrialU1 = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => file.heatCapacityGuideTrial?.u1 !== null && file.heatCapacityGuideTrial?.u1 !== undefined;

export const hasActiveTrialU2 = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => file.heatCapacityGuideTrial?.u2 !== null && file.heatCapacityGuideTrial?.u2 !== undefined;

export const getActiveTrialRecordedU1Mv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => file.heatCapacityGuideTrial?.u1?.displayPressureMv ?? null;

export const getGuideHeatCapacityExpectedU1Mv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const profile = file.heatCapacityExperimentProfile;
  if (profile && Number.isFinite(profile.stableBeforeReleaseMv)) return profile.stableBeforeReleaseMv;
  if (profile && Number.isFinite(profile.u1MeasuredMv)) return profile.u1MeasuredMv;
  const stableSample = file.heatCapacityProcessSamples.stableBeforeReleaseSample;
  if (stableSample && Number.isFinite(stableSample.pressureSignalMv)) return stableSample.pressureSignalMv;
  const peakSample = file.heatCapacityProcessSamples.pumpPeakSample;
  if (peakSample && Number.isFinite(peakSample.pressureSignalMv)) return peakSample.pressureSignalMv;
  return null;
};

export const hasGuideHeatCapacityWaitElapsed = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  kind: 'u1' | 'u2',
) => {
  const referenceSample = kind === 'u1'
    ? file.heatCapacityProcessSamples.afterPumpSample
    : file.heatCapacityProcessSamples.releaseLowSample ?? file.heatCapacityProcessSamples.afterReleaseSample;
  if (!referenceSample) return false;
  return Math.max(0, file.simulationTimeS - referenceSample.timeS) >= HEAT_CAPACITY_GUIDE_WAIT_DURATION_S;
};

export const hasGuideHeatCapacityFormedRelease = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => file.heatCapacityReleaseState.formedRelease;

export const hasGuideHeatCapacityEnteredRecovery = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  if (file.heatCapacityPhase === 'recovering') return true;
  return false;
};

export const isGuideHeatCapacityReleaseCompleteForU2 = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  recordedU1Mv: number | null,
) => {
  if (recordedU1Mv === null) return false;
  if (file.heatCapacityProcessSamples.releaseLowSample || file.heatCapacityProcessSamples.afterReleaseSample) {
    return true;
  }
  if (hasGuideHeatCapacityEnteredRecovery(file) && hasGuideHeatCapacityFormedRelease(file)) return true;
  const pressureTarget = getGuideHeatCapacityDecisionPressureMv(file);
  return pressureTarget <= Math.max(5, recordedU1Mv * 0.14) && hasGuideHeatCapacityFormedRelease(file);
};

export const getGuideHeatCapacityMinimumU1PlatformMv = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const expectedU1 = getGuideHeatCapacityExpectedU1Mv(file);
  return Math.max(HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, (expectedU1 ?? 110) * 0.45);
};

export const hasGuideHeatCapacityReachedPumpTarget = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const targetMv = getGuideHeatCapacityMinimumU1PlatformMv(file);
  if (file.heatCapacityMode === 'guide') {
    return getGuideHeatCapacityDisplayedPressureMv(file) >= targetMv;
  }
  if (getGuideHeatCapacityThresholdPressureMv(file) >= targetMv) return true;
  const pumpSamples = [
    file.heatCapacityProcessSamples.afterPumpSample,
    file.heatCapacityProcessSamples.pumpPeakSample,
    file.heatCapacityProcessSamples.stableBeforeReleaseSample,
  ];
  return pumpSamples.some((sample) => (
    sample !== undefined &&
    Number.isFinite(sample.pressureSignalMv) &&
    sample.pressureSignalMv >= targetMv
  ));
};

export const isGuideU1RecordReady = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
  const pressureForGate = getGuideHeatCapacityThresholdPressureMv(file);
  const minimumPlatformMv = HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;
  const temperatureReady = isGuideHeatCapacityTemperatureAtAmbient(file);
  const hasEffectivePumping = file.pumpStrokeCount > 0 ||
    Boolean(file.heatCapacityProcessSamples.pumpPeakSample) ||
    pressureForGate >= minimumPlatformMv;

  return stopcockState === 'closed' &&
    !file.pumpValveOpen &&
    hasEffectivePumping &&
    canProceedAfterPumping(file) &&
    temperatureReady &&
    hasGuideHeatCapacityWaitElapsed(file, 'u1') &&
    file.heatCapacityPhase === 'sealedStabilizing';
};

export const isGuideU2RecordReady = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
) => {
  const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
  const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
  if (recordedU1Mv === null) return false;
  const pressureForGate = getGuideHeatCapacityThresholdPressureMv(file);
  const lowerBound = 0.2;
  const upperBound = Math.max(5, recordedU1Mv * 0.55);
  const releaseHasStarted = pressureForGate < Math.max(10, recordedU1Mv * 0.75);
  const releaseComplete = isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
  const temperatureReady = isGuideHeatCapacityTemperatureAtAmbient(file);

  return stopcockState === 'closed' &&
    releaseHasStarted &&
    releaseComplete &&
    pressureForGate >= lowerBound &&
    pressureForGate <= upperBound &&
    temperatureReady &&
    hasGuideHeatCapacityWaitElapsed(file, 'u2') &&
    file.heatCapacityPhase === 'recovering';
};

export const getHeatCapacityGuideStep = (
  file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  autoDemoInteractionLocked: boolean,
): GuideHeatCapacityStep => {
  if (file.heatCapacityMode === 'guide') {
    switch (file.heatCapacityGuideWorkflow.step) {
      case 'powerRequired':
        return 'powerOnRequired';
      case 'preheatRequired':
        return 'preheatRequired';
      case 'openStopcockForZeroRequired':
        return 'openStopcockForZeroRequired';
      case 'zeroRequired':
        return 'zeroAdjustRequired';
      case 'recordU0Required':
        return 'recordU0Required';
      case 'closeStopcockBeforePumpRequired':
        return 'closeStopcockRequired';
      case 'openPumpValveRequired':
        return 'openPumpValveRequired';
      case 'pumpRequired':
        return 'pumpRequired';
      case 'closePumpValveRequired':
        return 'closePumpValveRequired';
      case 'u1Waiting':
        return 'stabilizeBeforeReleaseRequired';
      case 'recordU1Required':
        return 'recordU1Required';
      case 'openStopcockForReleaseRequired':
        return 'openStopcockReleaseRequired';
      case 'closeStopcockAfterReleaseRequired':
        return 'closeStopcockAfterReleaseRequired';
      case 'u2Waiting':
        return 'recoverRequired';
      case 'recordU2Required':
        return 'recordU2Required';
      case 'closePowerRequired':
        return 'closePowerRequired';
      case 'completed':
        return 'completed';
    }
  }
  if (autoDemoInteractionLocked) return 'idle';
  if (file.runState === 'finished') return 'idle';
  if (!file.powerOn) return 'powerOnRequired';

  const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
  const pressureValue = getGuideHeatCapacityThresholdPressureMv(file);
  const hasU0 = file.heatCapacityGuideTrial?.u0 !== null && file.heatCapacityGuideTrial?.u0 !== undefined;
  const hasU1 = hasActiveTrialU1(file);
  const hasU2 = hasActiveTrialU2(file);
  const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
  const releaseComplete = recordedU1Mv !== null && isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
  const u1Ready = isGuideU1RecordReady(file);
  const u2Ready = isGuideU2RecordReady(file);

  if (!hasU0) {
    if (stopcockState !== 'open') return 'openStopcockForZeroRequired';
    if (!isGuideU0ZeroReady(file)) return 'zeroAdjustRequired';
    return 'recordU0Required';
  }
  if (!hasU1) {
    if (stopcockState !== 'closed') return 'closeStopcockRequired';
    const pumpTargetReached = hasGuideHeatCapacityReachedPumpTarget(file);
    if (!file.pumpValveOpen && pressureValue < 8 && file.pumpStrokeCount === 0) return 'openPumpValveRequired';
    if (!file.pumpValveOpen && !pumpTargetReached) return 'openPumpValveRequired';
    if (file.pumpValveOpen && !pumpTargetReached) return 'pumpRequired';
    if (file.pumpValveOpen && pumpTargetReached) return 'closePumpValveRequired';
    return u1Ready ? 'recordU1Required' : 'stabilizeBeforeReleaseRequired';
  }
  if (!hasU2) {
    if (u2Ready) return 'recordU2Required';
    if (!releaseComplete) return 'openStopcockReleaseRequired';
    if (stopcockState === 'open') return 'closeStopcockAfterReleaseRequired';
    return 'recoverRequired';
  }
  return 'completed';
};

