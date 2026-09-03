import {
  createHeatCapacityAutoDemoProfile,
  normalizeHeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
  type HeatCapacityGuideTrial,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  createClosedHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  getHeatCapacityPressureZeroDisplayText,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  ensureHeatCapacityCalculationSessionWorkbenchState,
} from './workbenchHeatCapacityCalculationCoordinator.ts';
import {
  resetHeatCapacityFreeRunWorkbenchState,
} from './workbenchHeatCapacityFreeRunReset.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';

const createHeatCapacityAutoDemoResultTrial = (
  file: WorkbenchHeatCapacityState,
  now: number,
): HeatCapacityGuideTrial => {
  const profile = normalizeHeatCapacityTeachingProfile(file.heatCapacityExperimentProfile) ??
    createHeatCapacityAutoDemoProfile();
  const samples = file.heatCapacityProcessSamples;
  const baseTrial: HeatCapacityGuideTrial = {
    ...createHeatCapacityGuideTrial('demo-trial-1'),
    source: 'demo',
  };
  const u0Recorded = recordGuideU0(baseTrial, {
    atS: samples.zeroedSample?.timeS ?? 10,
    displayPressureMv: profile.u0MeasuredMv,
    displayTemperatureMv: samples.zeroedSample?.temperatureSignalMv ?? profile.initialTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-zero-1',
  });
  const u1Recorded = recordGuideU1(u0Recorded, {
    atS: samples.stableBeforeReleaseSample?.timeS ?? 86.9,
    displayPressureMv: profile.u1MeasuredMv,
    displayTemperatureMv: samples.stableBeforeReleaseSample?.temperatureSignalMv ?? profile.stableTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-zero-1',
  });
  return recordGuideU2(u1Recorded, {
    atS: samples.recoverySample?.timeS ?? 114.3,
    displayPressureMv: profile.u2MeasuredMv,
    displayTemperatureMv: samples.recoverySample?.temperatureSignalMv ?? profile.recoveryTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-zero-1',
  }, now, {
    atmosphericPressureKPa: file.ambientPressureKPa,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
  });
};

export function completeHeatCapacityTeachingModeWorkbenchState(
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState {
  const heatCapacityGuideTrial = file.heatCapacityMode === 'demo'
    ? createHeatCapacityAutoDemoResultTrial(file, now)
    : file.heatCapacityGuideTrial;
  const completedReleaseState = file.heatCapacityReleaseState.formedRelease &&
    file.heatCapacityReleaseState.phase === 'closedAfterRelease'
    ? file.heatCapacityReleaseState
    : createClosedHeatCapacityReleaseState(file.simulationTimeS);
  const completedFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityTeachingStatus: 'completed',
    heatCapacityGuideTrial,
    powerOn: false,
    runState: 'idle',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    pressureSignalMv: null,
    temperatureSignalMv: null,
    pressureKPa: null,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayedSamples: [],
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '教学流程已完成',
    heatCapacityReleaseState: completedReleaseState,
    updatedAt: now,
  };
  return ensureHeatCapacityCalculationSessionWorkbenchState(completedFile, now);
}

export function exitHeatCapacityTeachingModeWorkbenchState(
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState {
  return resetHeatCapacityFreeRunWorkbenchState({
    ...file,
    heatCapacityTeachingStatus: 'idle',
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityGuideTrial: null,
    heatCapacityProcessSamples: {},
  }, now);
}
