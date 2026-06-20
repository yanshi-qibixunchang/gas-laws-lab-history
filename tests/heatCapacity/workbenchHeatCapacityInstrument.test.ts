import assert from 'node:assert/strict';
import {
  adjustHeatCapacityPressureZeroCoarse,
  adjustHeatCapacityPressureZeroFine,
  applyHeatCapacityPressureZero,
  canZeroHeatCapacityPressure,
  captureHeatCapacityWorkbenchSample,
  createDefaultHeatCapacityFile,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureReleaseBurstUntilMs,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  getHeatCapacityAirGammaResult,
  getHeatCapacityStopcockTargetAngle,
  getHeatCapacityStopcockState,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
  HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA,
  HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS,
  createHeatCapacityInitialPressureBiasMv,
  enterHeatCapacityFreeModeWorkbenchState,
  getHeatCapacityFreeEquilibriumSpeedMultiplier,
  getActiveHeatCapacityFreeTrialIndex,
  getHeatCapacityFreeRecordDisplayTrialIndex,
  getHeatCapacityFreeRecordButtonState,
  isHeatCapacityPressureZeroWithinTolerance,
  isHeatCapacityFreeEquilibriumSpeedAvailable,
  markHeatCapacityDemoComplete,
  registerHeatCapacityPumpStroke,
  recordHeatCapacityFreeTraceEventWithReference,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  resetHeatCapacityForManualExperiment,
  resetHeatCapacityFreeRunWorkbenchState,
  resetHeatCapacityFreeTrialsWorkbenchState,
  normalizeHeatCapacityStopcockAngle,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  selectActiveHeatCapacityWorkbenchDisplay,
  setHeatCapacityFreeEquilibriumSpeedHintShown,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityPressureZeroOffset,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_VIDEO_PROFILE,
  getHeatCapacityRangeMidpoint,
} from '../../src/domain/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  calculateAirHeatCapacityTargets,
} from '../../src/domain/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  createHeatCapacityAutoDemoSteps,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  getHeatCapacityHardSphereVisualState,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  removeHeatCapacityTrialRecord,
} from '../../src/domain/heatCapacity/heatCapacityTrialModel.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../src/domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import type {
  HeatCapacityFreeEventType,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  WORKBENCH_SESSION_VERSION,
  decodeWorkbenchSession,
} from '../../src/features/workbench/workbenchSession.ts';

const pressureGaugeRadToDeg = (radians: number) => Math.round((radians * 180 / Math.PI) * 100) / 100;
const GLB_PRESSURE_GAUGE_DANGER_BOUNDARY_DEG = pressureGaugeRadToDeg(0.86);

const defaultFile = createDefaultHeatCapacityFile(1);
const workbenchStateSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'workbenchState.ts'),
  'utf8',
);
const initialTemperatureMv = getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.initialTemperatureMvRange);

assert.equal(defaultFile.powerOn, false);
assert.equal(defaultFile.heatCapacityMode, 'free');
assert.equal(defaultFile.heatCapacityFreeRuntimeVersion, HEAT_CAPACITY_FREE_RUNTIME_VERSION);
assert.deepEqual(defaultFile.heatCapacityFreeEnvironmentConfig, {
  ambientTemperatureK: 298.15,
  ambientPressureKPa: 101.3,
});
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.vesselVolumeL, 2);
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.pumpAmountGainRatio, 0.00345);
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.pumpInflowTemperatureRiseK, 42);
assert.ok(
  Math.abs(
    defaultFile.heatCapacityFreePhysicsConfig.pumpAmountGainRatio *
      defaultFile.heatCapacityFreePhysicsConfig.vesselVolumeL *
      1000 -
      6.9,
  ) < 1e-9,
  'Free Mode should model 6.9 mL effective gas per pump stroke in a 2 L vessel',
);
assert.equal(defaultFile.heatCapacityFreePhysicsState.gasAmountRatio, 1);
assert.equal(defaultFile.heatCapacityFreePhysicsState.gasTemperatureK, 298.15);
assert.equal(defaultFile.heatCapacityFreePhysicsState.wallTemperatureK, 298.15);
assert.equal(defaultFile.heatCapacityFreePhysicsState.lastPumpStrokeAtS, null);
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK, 0.14);
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.thermal.wallAmbientConductanceWPerK, 0.45);
assert.equal(defaultFile.heatCapacityFreePhysicsConfig.thermal.wallHeatCapacityJPerK, 45);
assert.deepEqual(defaultFile.heatCapacityFreePhysicsConfig.leakage, {
  enabled: true,
  ratePerS: 0.00005,
});
assert.equal(defaultFile.heatCapacityFreeSensorConfig.lagRate, 8);
assert.equal(defaultFile.heatCapacityFreeSensorConfig.minSampleIntervalS, 0.08);
assert.equal(defaultFile.heatCapacityFreeSensorConfig.maxSampleIntervalS, 0.12);
assert.equal(defaultFile.heatCapacityFreeStopcockFlowOpen, false);
assert.equal(defaultFile.heatCapacityFreeStopcockPendingOpenAtMs, null);
assert.equal(defaultFile.heatCapacityFreeStopcockFlowPurpose, 'none');
assert.deepEqual(HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS, [2, 4, 8, 16]);
assert.equal(HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER, 4);
assert.equal(defaultFile.heatCapacityFreeEquilibriumSpeedMultiplier, 4);
assert.equal(defaultFile.heatCapacityFreeEquilibriumSpeedHintShown, false);
assert.notEqual(
  defaultFile.heatCapacityFreeSensorState.displayPressureMv,
  0,
  'Free pressure sensor should start with a deterministic non-zero zeroing bias',
);
assert.equal(
  defaultFile.heatCapacityFreeSensorState.displayPressureMv,
  defaultFile.heatCapacityFreeSensorState.pressureInitialBiasMv,
  'Free sensor display should expose the same initial pressure bias used by its sensor model',
);
assert.equal(defaultFile.heatCapacityFreeSensorState.displayTemperatureMv, initialTemperatureMv);
assert.equal(defaultFile.heatCapacityFreeCalibrationState.calibrationVersion, 0);
assert.deepEqual(defaultFile.heatCapacityFreeTrials, []);
for (const freeRuntimeState of [
  defaultFile.heatCapacityFreePhysicsState,
  defaultFile.heatCapacityFreeSensorState,
  defaultFile.heatCapacityFreeCalibrationState,
]) {
  for (const teachingTargetField of [
    'u0MeasuredMv',
    'u1MeasuredMv',
    'u2MeasuredMv',
    'stableBeforeReleaseMv',
    'recoveryPressureMv',
    'releaseTemperatureLowMv',
    'thermalRecoveryRate',
  ]) {
    assert.equal(
      teachingTargetField in freeRuntimeState,
      false,
      `Free Mode runtime state must not include teaching target field ${teachingTargetField}`,
    );
  }
}
assert.equal(defaultFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(defaultFile.glassPistonState, 'closed');
assert.equal(defaultFile.pressureZeroed, false);
assert.equal(defaultFile.pressureZeroAdjusted, false);
assert.equal(defaultFile.pressureZeroKnobAngle, 0);
assert.equal(defaultFile.pressureZeroOffset, 0);
assert.equal(
  defaultFile.pressureInitialBiasMv,
  0,
  'Free sensor bias must not contaminate the top-level teaching pressure bias field',
);
assert.deepEqual(defaultFile.pressureZeroDisplayedSamples, []);
assert.equal(defaultFile.pressureZeroAdjustMode, 'none');
assert.match(
  workbenchStateSource,
  /type HeatCapacityTeachingProfile/,
  'workbench heat-capacity state should import the teaching-specific profile boundary',
);
assert.match(
  workbenchStateSource,
  /heatCapacityExperimentProfile:\s*HeatCapacityTeachingProfile \| null/,
  'workbench should store scripted target fields only inside the teaching profile object',
);
for (const teachingTargetField of [
  'u0MeasuredMv',
  'u1MeasuredMv',
  'u2MeasuredMv',
  'stableBeforeReleaseMv',
  'recoveryPressureMv',
  'releaseTemperatureLowMv',
  'thermalRecoveryRate',
]) {
  assert.equal(
    teachingTargetField in defaultFile,
    false,
    `heat-capacity file state must not expose ${teachingTargetField} as a global runtime field`,
  );
}
assert.equal(defaultFile.heatCapacityPhase, 'powerOff');
assert.equal(defaultFile.ambientPressureKPa, 101.3);
assert.equal(defaultFile.ambientTemperatureK, 298.15);
assert.equal(defaultFile.gasPressureKPaAbs, 101.3);
assert.equal(defaultFile.gasTemperatureK, 298.15);
assert.equal(defaultFile.pressureDeltaKPa, 0);
assert.equal(defaultFile.pressureRawPlaceholder, 0);
assert.equal(defaultFile.pressureDisplayedPlaceholder, 0);
assert.equal(defaultFile.pressureGaugeTargetValue, 0);
assert.equal(defaultFile.pressureGaugeDisplayValue, 0);
assert.equal(defaultFile.pressureGaugeNeedleAngle, -123.19);
assert.equal(defaultFile.gaugePressureMinKPa, 0);
assert.equal(defaultFile.gaugePressureMaxKPa, HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA);
assert.deepEqual(selectActiveHeatCapacityWorkbenchDisplay({
  ...defaultFile,
  heatCapacityMode: 'guide',
  pressureSignalMv: 12.5,
  temperatureSignalMv: 1499.8,
}), {
  source: 'teaching',
  pressureMv: 12.5,
  temperatureMv: 1499.8,
});
assert.deepEqual(selectActiveHeatCapacityWorkbenchDisplay({
  ...defaultFile,
  heatCapacityMode: 'free',
  pressureSignalMv: 12.5,
  temperatureSignalMv: 1499.8,
  heatCapacityFreeSensorState: {
    ...defaultFile.heatCapacityFreeSensorState,
    displayPressureMv: 45.6,
    displayTemperatureMv: 1498.7,
  },
}), {
  source: 'free',
  pressureMv: 12.5,
  temperatureMv: 1499.8,
});
const freeTrial = createHeatCapacityFreeTrial('free-keep');
const enteredFree = enterHeatCapacityFreeModeWorkbenchState({
  ...defaultFile,
  heatCapacityMode: 'guide',
  heatCapacityTrials: [
    {
      ...defaultFile.heatCapacityTrials[0],
      U1Mv: 111,
      status: 'partial',
    },
  ],
  heatCapacityFreeTrials: [freeTrial],
  heatCapacityFreePhysicsState: {
    ...defaultFile.heatCapacityFreePhysicsState,
    gasAmountRatio: 1.2,
    pumpStrokeCount: 4,
  },
  heatCapacityFreeCalibrationState: {
    ...defaultFile.heatCapacityFreeCalibrationState,
    calibrationVersion: 3,
    zeroOffsetMv: 0.44,
  },
}, 2_000);
assert.equal(enteredFree.heatCapacityMode, 'free');
assert.equal(enteredFree.heatCapacityFreePhysicsState.gasAmountRatio, 1, 'entering Free should reset physical runtime');
assert.equal(enteredFree.heatCapacityFreeCalibrationState.calibrationVersion, 0, 'entering Free should reset calibration runtime');
assert.deepEqual(enteredFree.heatCapacityFreeTrials, [freeTrial], 'entering Free must preserve existing Free trials');
assert.equal(enteredFree.powerOn, false);
assert.equal(enteredFree.runState, 'idle');
assert.equal(enteredFree.heatCapacityPhase, 'powerOff');
const resetOnlyFreeTrials = resetHeatCapacityFreeTrialsWorkbenchState(enteredFree);
assert.deepEqual(resetOnlyFreeTrials.heatCapacityFreeTrials, []);
assert.equal(resetOnlyFreeTrials.heatCapacityTrials[0].U1Mv, 111);
const resetFreeRun = resetHeatCapacityFreeRunWorkbenchState({
  ...enteredFree,
  powerOn: true,
  runState: 'running',
  heatCapacityPhase: 'pumping',
  glassPistonState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpBulbState: 'compressing',
  pumpStrokeTimestamps: [1000, 1200],
  pumpFrequency: 2,
  pumpFrequencyStatus: 'suitable',
  lastPumpTime: 1200,
  pumpStrokeCount: 2,
  pumpHint: 'dirty',
  pressureZeroed: true,
  pressureZeroAdjusted: true,
  pressureZeroKnobAngle: 90,
  pressureZeroOffset: 0.8,
  pressureZeroDisplayText: 'dirty zero',
  pressureZeroAdjustMode: 'coarseDrag',
  pressureReleaseBurstUntilMs: 3200,
  heatCapacityFreeStopcockFlowOpen: true,
  heatCapacityFreeStopcockPendingOpenAtMs: 3100,
  heatCapacityFreeStopcockFlowPurpose: 'release',
  heatCapacityFreeEquilibriumSpeedMultiplier: 8,
  heatCapacityFreeEquilibriumSpeedHintShown: true,
  heatCapacityFreeTrials: [freeTrial],
  heatCapacityProcessingCalculated: true,
}, 3_000);
assert.equal(resetFreeRun.powerOn, false, 'Free reset should turn the instrument power off');
assert.equal(resetFreeRun.runState, 'idle');
assert.equal(resetFreeRun.heatCapacityPhase, 'powerOff');
assert.equal(resetFreeRun.glassPistonState, 'closed');
assert.equal(resetFreeRun.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(resetFreeRun.pumpValveOpen, false);
assert.equal(resetFreeRun.pumpValveState, 'closed');
assert.equal(resetFreeRun.pumpBulbState, 'idle');
assert.deepEqual(resetFreeRun.pumpStrokeTimestamps, []);
assert.equal(resetFreeRun.pumpFrequency, 0);
assert.equal(resetFreeRun.pumpFrequencyStatus, 'idle');
assert.equal(resetFreeRun.lastPumpTime, null);
assert.equal(resetFreeRun.pumpStrokeCount, 0);
assert.equal(resetFreeRun.pumpHint, '未打气');
assert.equal(resetFreeRun.pressureZeroed, false);
assert.equal(resetFreeRun.pressureZeroAdjusted, false);
assert.equal(resetFreeRun.pressureZeroKnobAngle, 0);
assert.equal(resetFreeRun.pressureZeroOffset, 0);
assert.equal(resetFreeRun.pressureZeroDisplayText, '未调零');
assert.equal(resetFreeRun.pressureZeroAdjustMode, 'none');
assert.equal(resetFreeRun.pressureReleaseBurstUntilMs, null);
assert.equal(resetFreeRun.heatCapacityFreeStopcockFlowOpen, false);
assert.equal(resetFreeRun.heatCapacityFreeStopcockPendingOpenAtMs, null);
assert.equal(resetFreeRun.heatCapacityFreeStopcockFlowPurpose, 'none');
assert.equal(resetFreeRun.heatCapacityFreeEquilibriumSpeedMultiplier, 4);
assert.equal(resetFreeRun.heatCapacityFreeEquilibriumSpeedHintShown, false);
assert.deepEqual(resetFreeRun.heatCapacityFreePhysicsConfig.leakage, {
  enabled: true,
  ratePerS: 0.00005,
});
assert.deepEqual(resetFreeRun.heatCapacityFreeTrials, []);
assert.deepEqual(
  resetFreeRun.heatCapacityFreeTraceStore.traceTrials,
  [],
  'Free reset should discard the current incomplete trace when no official group was completed',
);
assert.equal(resetFreeRun.heatCapacityProcessingCalculated, false);
assert.equal(resetFreeRun.pressureSignalMv, null);
assert.equal(resetFreeRun.temperatureSignalMv, null);
assert.equal(resetFreeRun.pressureKPa, null);
for (const heatCapacityMode of ['demo', 'guide'] as const) {
  const teachingModeStep = stepHeatCapacityWorkbenchFile({
    ...defaultFile,
    heatCapacityMode,
    powerOn: true,
    lastUpdateMs: 0,
    heatCapacityFreePhysicsConfig: {
      ...defaultFile.heatCapacityFreePhysicsConfig,
      leakage: {
        enabled: true,
        ratePerS: 0.02,
      },
    },
    heatCapacityFreePhysicsState: {
      ...defaultFile.heatCapacityFreePhysicsState,
      simulationTimeS: 12,
      gasAmountRatio: 1.2,
      gasTemperatureK: 320,
    },
  }, 60_000);
  assert.equal(
    teachingModeStep.heatCapacityFreePhysicsState.gasAmountRatio,
    1.2,
    `${heatCapacityMode} mode must not advance Free micro-leak physics`,
  );
  assert.equal(
    teachingModeStep.heatCapacityFreePhysicsState.simulationTimeS,
    12,
    `${heatCapacityMode} mode must keep Free physics time unchanged`,
  );
}
const freePowered = powerHeatCapacityWorkbenchFile(defaultFile, true, 1_000);
const getFreeTraceEventTypes = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeEventType[] => {
  const activeTrace = file.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
    traceTrial.id === file.heatCapacityFreeTraceStore.activeTraceTrialId
  ));
  const activeBranch = activeTrace?.branches.find((branch) => branch.id === activeTrace.activeBranchId);
  assert.notEqual(activeBranch, undefined, 'Free trace should have an active branch');
  const sampleIds = new Set(activeBranch!.samples.map((sample) => sample.id));
  for (const event of activeBranch!.events) {
    assert.equal(
      sampleIds.has(event.traceSampleId),
      true,
      `Free trace event ${event.type} should reference an existing sample`,
    );
  }
  return activeBranch!.events.map((event) => event.type);
};
const getActiveFreeTraceSampleCount = (file: WorkbenchHeatCapacityState) => {
  const activeTrace = file.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
    traceTrial.id === file.heatCapacityFreeTraceStore.activeTraceTrialId
  ));
  const activeBranch = activeTrace?.branches.find((branch) => branch.id === activeTrace.activeBranchId);
  return activeBranch?.samples.length ?? 0;
};
assert.equal(
  getFreeTraceEventTypes(freePowered).includes('power-on'),
  true,
  'Free power-on should create a hidden trace event',
);
const freePumpReady = {
  ...freePowered,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
};
const freePumped = registerHeatCapacityPumpStroke(freePumpReady, 1_200);
assert.equal(
  getFreeTraceEventTypes(freePumped).includes('pump-stroke'),
  true,
  'Free pump stroke should create a hidden trace event',
);
assert.equal(freePumped.heatCapacityFreePhysicsState.lastPumpStrokeAtS, 0.2);
assert.equal(freePumped.pumpFrequencyStatus, 'tooSlow');
const migratedFreeSamplingFile = stepHeatCapacityWorkbenchFile({
  ...freePowered,
  heatCapacityFreeSensorConfig: {
    ...freePowered.heatCapacityFreeSensorConfig,
    lagRate: 3,
    minSampleIntervalS: 0.2,
    maxSampleIntervalS: 0.6,
  },
}, 1_260);
assert.equal(
  migratedFreeSamplingFile.heatCapacityFreeSensorConfig.lagRate,
  3,
  'existing Free files should preserve configured sensor lag while migrating denser sampling intervals',
);
assert.equal(
  migratedFreeSamplingFile.heatCapacityFreeSensorConfig.minSampleIntervalS,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.minSampleIntervalS,
);
assert.equal(
  migratedFreeSamplingFile.heatCapacityFreeSensorConfig.maxSampleIntervalS,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.maxSampleIntervalS,
);
const freeRapidSecondStroke = registerHeatCapacityPumpStroke(freePumped, 1_320);
const freeRapidThirdStroke = registerHeatCapacityPumpStroke(freeRapidSecondStroke, 1_440);
assert.equal(freeRapidThirdStroke.pumpStrokeCount, 3);
assert.equal(freeRapidThirdStroke.pumpFrequencyStatus, 'suitable');
const invalidSpeedFallback = setHeatCapacityFreeEquilibriumSpeedMultiplier(
  freePowered,
  99,
  1_050,
);
assert.equal(invalidSpeedFallback.heatCapacityFreeEquilibriumSpeedMultiplier, 4);
const legacySpeedOneFallback = setHeatCapacityFreeEquilibriumSpeedMultiplier(freePowered, 1, 1_055);
assert.equal(legacySpeedOneFallback.heatCapacityFreeEquilibriumSpeedMultiplier, 4);
const selectedSpeedEight = setHeatCapacityFreeEquilibriumSpeedMultiplier(freePowered, 8, 1_060);
assert.equal(selectedSpeedEight.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.equal(selectedSpeedEight.updatedAt, 1_060);
const selectedSpeedSixteen = setHeatCapacityFreeEquilibriumSpeedMultiplier(freePowered, 16, 1_065);
assert.equal(selectedSpeedSixteen.heatCapacityFreeEquilibriumSpeedMultiplier, 16);
const markedSpeedHintShown = setHeatCapacityFreeEquilibriumSpeedHintShown(freePowered, true, 1_070);
assert.equal(markedSpeedHintShown.heatCapacityFreeEquilibriumSpeedHintShown, true);
assert.equal(markedSpeedHintShown.updatedAt, 1_070);
const freeRecordTraceEvent = recordHeatCapacityFreeTraceEventWithReference(freePumped, 'record-u1', 1_300, {
  kind: 'u1',
  trialIndex: 1,
});
assert.equal(freeRecordTraceEvent.reference.source, 'user');
assert.equal(freeRecordTraceEvent.reference.phaseAtRecord, freeRecordTraceEvent.file.heatCapacityPhase);
assert.notEqual(freeRecordTraceEvent.reference.traceTrialId, null);
assert.notEqual(freeRecordTraceEvent.reference.traceBranchId, null);
assert.notEqual(freeRecordTraceEvent.reference.traceSampleId, null);
assert.notEqual(freeRecordTraceEvent.reference.eventId, null);
const freeRecordTraceTrial = freeRecordTraceEvent.file.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === freeRecordTraceEvent.reference.traceTrialId
));
assert.notEqual(freeRecordTraceTrial, undefined);
const freeRecordTraceBranch = freeRecordTraceTrial!.branches.find((branch) => (
  branch.id === freeRecordTraceEvent.reference.traceBranchId
));
assert.notEqual(freeRecordTraceBranch, undefined);
assert.equal(
  freeRecordTraceBranch!.events.some((event) => (
    event.id === freeRecordTraceEvent.reference.eventId &&
    event.type === 'record-u1' &&
    event.traceSampleId === freeRecordTraceEvent.reference.traceSampleId
  )),
  true,
  'official Free record trace references should point to the saved event sample',
);
const traceTrialIdForBranchTest = freePumped.heatCapacityFreeTraceStore.activeTraceTrialId;
assert.notEqual(traceTrialIdForBranchTest, null, 'branch rollback fixture requires an active trace trial');
const traceLinkedCompleteTrial = {
  ...createHeatCapacityFreeTrial('free-branch-trial'),
  traceTrialId: traceTrialIdForBranchTest,
  branchCount: 1,
  u0: {
    atS: 1,
    displayPressureMv: 0,
    displayTemperatureMv: initialTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    source: 'user' as const,
    phaseAtRecord: 'zeroed' as const,
    traceTrialId: traceTrialIdForBranchTest,
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-1',
    eventId: 'event-1',
  },
  u1: {
    atS: 2,
    displayPressureMv: 112,
    displayTemperatureMv: initialTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    source: 'user' as const,
    phaseAtRecord: 'sealedStabilizing' as const,
    traceTrialId: traceTrialIdForBranchTest,
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-2',
    eventId: 'event-2',
  },
  u2: {
    atS: 3,
    displayPressureMv: 32,
    displayTemperatureMv: initialTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    source: 'user' as const,
    phaseAtRecord: 'recovering' as const,
    traceTrialId: traceTrialIdForBranchTest,
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-3',
    eventId: 'event-3',
  },
  correctedSignals: {
    calculationVersion: 'log-pressure-v1' as const,
    atmosphericPressureKPa: 101.3,
    pressureSensitivityMvPerKPa: 20,
    U0DisplayMv: 0,
    U1DisplayMv: 112,
    U2DisplayMv: 32,
    U1CorrectedMv: 112,
    U2CorrectedMv: 32,
    gamma: 1.4,
  },
};
const branchRollbackFile = removeHeatCapacityFreeTrialRecordWorkbenchState({
  ...freePumped,
  heatCapacityFreeTrials: [traceLinkedCompleteTrial],
}, 0, 'u1', 1_500);
assert.notEqual(branchRollbackFile.heatCapacityFreeTrials[0].u0, null);
assert.equal(branchRollbackFile.heatCapacityFreeTrials[0].u1, null);
assert.equal(branchRollbackFile.heatCapacityFreeTrials[0].u2, null);
assert.equal(branchRollbackFile.heatCapacityFreeTrials[0].branchCount, 2);
const branchRollbackTrace = branchRollbackFile.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === traceTrialIdForBranchTest
));
assert.notEqual(branchRollbackTrace, undefined);
assert.equal(branchRollbackTrace!.branches.some((branch) => branch.status === 'archived'), true);
assert.equal(branchRollbackTrace!.branches.some((branch) => branch.status === 'main' && branch.parentBranchId === 'branch-1'), true);
const completedPowerOnReset = resetHeatCapacityFreeRunWorkbenchState({
  ...freePumped,
  heatCapacityFreeExperimentGroupStatus: 'completed',
  heatCapacityFreeTrials: [traceLinkedCompleteTrial],
  heatCapacityProcessingCalculated: true,
}, 1_600);
assert.equal(
  completedPowerOnReset.heatCapacityFreeTrials.length,
  0,
  'Reset before power-off should discard even a U0/U1/U2-complete Free group because it has not been ended',
);
assert.equal(
  completedPowerOnReset.heatCapacityFreeTraceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialIdForBranchTest),
  false,
  'Reset before power-off should discard the current complete-but-unended Free trace',
);
assert.equal(
  completedPowerOnReset.heatCapacityFreeTraceStore.activeTraceTrialId,
  null,
  'Reset after discarding an unended Free group should leave the next group blank until the next user action',
);
const completedPowerOffPrepared = powerHeatCapacityWorkbenchFile({
  ...freePumped,
  heatCapacityFreeExperimentGroupStatus: 'completed',
  heatCapacityFreeTrials: [traceLinkedCompleteTrial],
  heatCapacityProcessingCalculated: true,
}, false, 1_650);
assert.equal(completedPowerOffPrepared.powerOn, false);
assert.equal(completedPowerOffPrepared.heatCapacityFreeExperimentGroupStatus, 'draft');
assert.equal(completedPowerOffPrepared.heatCapacityFreeTrials.length, 1);
assert.equal(completedPowerOffPrepared.heatCapacityFreeTrials[0].id, traceLinkedCompleteTrial.id);
assert.equal(
  completedPowerOffPrepared.heatCapacityFreeTrials[0].completedAtMs,
  1_650,
  'Powering off after U2 should stamp the saved Free group completion time',
);
assert.equal(
  completedPowerOffPrepared.heatCapacityFreeTraceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialIdForBranchTest),
  true,
  'Powering off after U2 should auto-save the completed Free group trace',
);
assert.equal(completedPowerOffPrepared.heatCapacityFreeTraceStore.activeTraceTrialId, null);
assert.equal(completedPowerOffPrepared.heatCapacityFreePhysicsState.pumpStrokeCount, 0);
assert.equal(completedPowerOffPrepared.heatCapacityFreePhysicsState.releaseStarted, false);
assert.equal(completedPowerOffPrepared.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(completedPowerOffPrepared.pumpValveOpen, false);
assert.equal(getActiveHeatCapacityFreeTrialIndex(completedPowerOffPrepared), -1);
assert.equal(
  getHeatCapacityFreeRecordDisplayTrialIndex(completedPowerOffPrepared),
  0,
  'Powering off after U2 should keep the completed Free group visible for review',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(completedPowerOffPrepared, 'u0'),
  { visible: false, mode: 'record', disabledReason: 'zero-not-ready' },
  'Auto-saved Free history should not remain as a current re-record target',
);
const completedPowerOnNextSeed = powerHeatCapacityWorkbenchFile(completedPowerOffPrepared, true, 1_690);
assert.equal(getActiveHeatCapacityFreeTrialIndex(completedPowerOnNextSeed), -1);
assert.equal(
  getHeatCapacityFreeRecordDisplayTrialIndex(completedPowerOnNextSeed),
  -1,
  'Opening power for the next Free group should switch the current-record display to the blank new group',
);
const completedResetOnce = resetHeatCapacityFreeRunWorkbenchState(completedPowerOffPrepared, 1_700);
const completedResetTwice = resetHeatCapacityFreeRunWorkbenchState(completedResetOnce, 1_700);
assert.equal(completedResetTwice.heatCapacityFreeTrials.length, 1);
assert.equal(
  completedResetTwice.heatCapacityFreeTraceStore.traceTrials.length,
  completedResetOnce.heatCapacityFreeTraceStore.traceTrials.length,
  'Repeated Reset on a blank next group should not create or delete trace trials',
);
const nextIncompleteTraceFile = recordHeatCapacityFreeTraceEventWithReference(
  completedResetOnce,
  'pump-stroke',
  1_800,
  { pumpStrokeCount: 1 },
).file;
const nextIncompleteTraceTrialId = nextIncompleteTraceFile.heatCapacityFreeTraceStore.activeTraceTrialId;
assert.notEqual(nextIncompleteTraceTrialId, null);
const incompleteNextTrial = {
  ...createHeatCapacityFreeTrial('free-incomplete-after-complete'),
  traceTrialId: nextIncompleteTraceTrialId,
  branchCount: 1,
  u0: traceLinkedCompleteTrial.u0,
};
const resetIncompleteNext = resetHeatCapacityFreeRunWorkbenchState({
  ...nextIncompleteTraceFile,
  heatCapacityFreeTrials: [traceLinkedCompleteTrial, incompleteNextTrial],
}, 1_900);
assert.equal(resetIncompleteNext.heatCapacityFreeTrials.length, 1);
assert.equal(resetIncompleteNext.heatCapacityFreeTrials[0].id, traceLinkedCompleteTrial.id);
assert.equal(
  resetIncompleteNext.heatCapacityFreeTraceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialIdForBranchTest),
  true,
  'Reset of an incomplete next group should preserve older completed trace data',
);
assert.equal(
  resetIncompleteNext.heatCapacityFreeTraceStore.traceTrials.some((traceTrial) => traceTrial.id === nextIncompleteTraceTrialId),
  false,
  'Reset of an incomplete next group should delete only the current incomplete trace',
);
assert.equal(freePumped.heatCapacityMode, 'free');
assert.equal(freePumped.heatCapacityFreePhysicsState.pumpStrokeCount, 1, 'Free pump bulb should update the Free physical state');
assert.equal(
  Math.abs(
    freePumped.heatCapacityFreePhysicsState.gasAmountRatio -
      freePowered.heatCapacityFreePhysicsState.gasAmountRatio,
  ) < 1e-9,
  true,
  'Free pump stroke should queue a short continuous physical process instead of jumping gas amount instantly',
);
assert.equal(freePumped.heatCapacityFreePhysicsState.pumpProcesses.length, 1);
const freePumpedHalfway = stepHeatCapacityWorkbenchFile(freePumped, 1_240);
assert.equal(
  freePumpedHalfway.heatCapacityFreePhysicsState.gasAmountRatio > freePumped.heatCapacityFreePhysicsState.gasAmountRatio,
  true,
  'Free pump process should increase gas amount during the stroke',
);
assert.equal(freePumpedHalfway.heatCapacityFreePhysicsState.pumpProcesses.length, 1);
const freePumpedSensorSampleCountBeforeCompletion = freePumped.heatCapacityFreeSensorState.pressureHistory.length;
const freePumpedCompleted = stepHeatCapacityWorkbenchFile(freePumped, 1_300);
assert.equal(
  freePumpedCompleted.heatCapacityFreePhysicsState.gasAmountRatio > freePumpedHalfway.heatCapacityFreePhysicsState.gasAmountRatio,
  true,
  'Free pump process should continue increasing gas amount until the short stroke completes',
);
assert.equal(freePumpedCompleted.heatCapacityFreePhysicsState.pumpProcesses.length, 0);
assert.equal(
  freePumpedCompleted.heatCapacityFreeSensorState.pressureHistory.length >
    freePumpedSensorSampleCountBeforeCompletion + 1,
  true,
  'Free continuous pump stepping should keep intermediate display-layer sensor samples instead of one sparse endpoint',
);
assert.equal(
  freePumped.pressureSignalMv,
  truncateHeatCapacitySignalMv(freePumped.heatCapacityFreeSensorState.displayPressureMv),
  'Free display should expose the one-decimal instrument reading while keeping the sensor output precise',
);
const freeInstantZeroKnob = setHeatCapacityPressureZeroOffset({
  ...freePowered,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeStopcockFlowOpen: true,
  heatCapacityFreeSensorState: {
    ...freePowered.heatCapacityFreeSensorState,
    displayPressureMv: 0.73,
    pressureSlopeMvPerS: 0,
  },
  pressureSignalMv: 0.73,
  pressureSignalTargetMv: 0.73,
  pressureSignalMvDisplayed: 0.73,
  pressureZeroDisplayedSamples: [
    { atMs: 900, valueMv: 0.73 },
    { atMs: 950, valueMv: 0.73 },
  ],
}, -0.73, 'coarseDrag', getHeatCapacityPressureZeroKnobAngleForOffset(-0.73), 1_050);
assert.equal(
  Math.abs((freeInstantZeroKnob.pressureSignalMv ?? Number.NaN)) < 0.001,
  true,
  'Free zero knob should update the visible U_p immediately instead of passing through sensor lag',
);
assert.equal(
  freeInstantZeroKnob.heatCapacityFreeSensorState.displayPressureMv,
  0.73,
  'Free zero knob should not mutate the raw sensor measurement layer',
);
assert.equal(
  freeInstantZeroKnob.pressureZeroed,
  false,
  'instant zero display still needs a fresh stable sample window before it is accepted as zeroed',
);
const freeZeroPoweredOff = powerHeatCapacityWorkbenchFile(freeInstantZeroKnob, false, 1_090);
assert.equal(freeZeroPoweredOff.powerOn, false);
assert.equal(freeZeroPoweredOff.pressureSignalMv, null);
assert.equal(freeZeroPoweredOff.pressureZeroAdjusted, true);
assert.equal(freeZeroPoweredOff.pressureZeroKnobAngle, freeInstantZeroKnob.pressureZeroKnobAngle);
assert.equal(freeZeroPoweredOff.pressureZeroOffset, freeInstantZeroKnob.pressureZeroOffset);
assert.equal(
  freeZeroPoweredOff.heatCapacityFreeCalibrationState.zeroOffsetMv,
  freeInstantZeroKnob.heatCapacityFreeCalibrationState.zeroOffsetMv,
);
const freeZeroPoweredOnAgain = powerHeatCapacityWorkbenchFile(freeZeroPoweredOff, true, 1_130);
assert.equal(freeZeroPoweredOnAgain.powerOn, true);
assert.equal(freeZeroPoweredOnAgain.pressureZeroAdjusted, true);
assert.equal(freeZeroPoweredOnAgain.pressureZeroKnobAngle, freeInstantZeroKnob.pressureZeroKnobAngle);
assert.equal(freeZeroPoweredOnAgain.pressureZeroOffset, freeInstantZeroKnob.pressureZeroOffset);
assert.equal(
  freeZeroPoweredOnAgain.heatCapacityFreeCalibrationState.zeroOffsetMv,
  freeInstantZeroKnob.heatCapacityFreeCalibrationState.zeroOffsetMv,
);
let freeTeachingLikePumpFile: WorkbenchHeatCapacityState = freePumpReady;
for (let strokeIndex = 0; strokeIndex < 4; strokeIndex += 1) {
  freeTeachingLikePumpFile = registerHeatCapacityPumpStroke(freeTeachingLikePumpFile, 1_300 + strokeIndex * 430);
}
assert.equal(
  freeTeachingLikePumpFile.heatCapacityFreePhysicsState.pumpStrokeCount,
  4,
  'Free Mode should allow four effective pump strokes before alarm blocking',
);
assert.notEqual(
  freeTeachingLikePumpFile.pressureSafetyStatus,
  'danger',
  'four effective Free Mode pump strokes should stay below the alarm threshold',
);
let calibratedPumpFile: WorkbenchHeatCapacityState = freePumpReady;
for (let strokeIndex = 0; strokeIndex < 18; strokeIndex += 1) {
  calibratedPumpFile = registerHeatCapacityPumpStroke(calibratedPumpFile, 3_000 + strokeIndex * 400);
}
let stableCalibratedPumpFile = calibratedPumpFile;
const calibratedPumpLastAtMs = 3_000 + 17 * 400;
stableCalibratedPumpFile = {
  ...stableCalibratedPumpFile,
  pumpValveOpen: false,
  pumpValveState: 'closed',
};
for (let stepIndex = 1; stepIndex <= 30; stepIndex += 1) {
  stableCalibratedPumpFile = stepHeatCapacityWorkbenchFile(
    stableCalibratedPumpFile,
    calibratedPumpLastAtMs + stepIndex * 2_500,
  );
}
const stableCalibratedPumpPressureMv = stableCalibratedPumpFile.pressureDeltaKPa *
  stableCalibratedPumpFile.heatCapacityFreeSensorConfig.pressureMvPerKPa;
assert.equal(
  stableCalibratedPumpPressureMv >= 109 && stableCalibratedPumpPressureMv <= 119,
  true,
  `18 Free pump strokes should relax near 114 mV after pump-valve close and 5 min, received ${stableCalibratedPumpPressureMv.toFixed(2)} mV`,
);
assert.equal(stableCalibratedPumpFile.pressureSafetyStatus, 'normal');
assert.equal(stableCalibratedPumpFile.pressureBlockedPumping, false);
const sealedWaitBase = {
  ...calibratedPumpFile,
  pumpValveOpen: false,
  pumpValveState: 'closed' as const,
  pumpBulbState: 'idle' as const,
  heatCapacityPhase: 'sealedStabilizing' as const,
  heatCapacityFreeEquilibriumSpeedMultiplier: 4 as const,
  lastUpdateMs: calibratedPumpLastAtMs,
  updatedAt: calibratedPumpLastAtMs,
};
assert.equal(isHeatCapacityFreeEquilibriumSpeedAvailable(sealedWaitBase), true);
assert.equal(getHeatCapacityFreeEquilibriumSpeedMultiplier(sealedWaitBase), 4);
assert.equal(getHeatCapacityFreeEquilibriumSpeedMultiplier({
  ...sealedWaitBase,
  heatCapacityPhase: 'pumping',
  pumpValveOpen: true,
}), 1);
const sealedX2Start = setHeatCapacityFreeEquilibriumSpeedMultiplier(sealedWaitBase, 2, calibratedPumpLastAtMs);
const sealedX4Start = setHeatCapacityFreeEquilibriumSpeedMultiplier(sealedWaitBase, 4, calibratedPumpLastAtMs);
const sealedX16Start = setHeatCapacityFreeEquilibriumSpeedMultiplier(sealedWaitBase, 16, calibratedPumpLastAtMs);
const sealedX2OneSecond = stepHeatCapacityWorkbenchFile(sealedX2Start, calibratedPumpLastAtMs + 1_000);
const sealedX4OneSecond = stepHeatCapacityWorkbenchFile(sealedX4Start, calibratedPumpLastAtMs + 1_000);
const sealedX16OneSecond = stepHeatCapacityWorkbenchFile(sealedX16Start, calibratedPumpLastAtMs + 1_000);
assert.equal(
  Math.abs(sealedX2OneSecond.simulationTimeS - (sealedWaitBase.simulationTimeS + 2)) < 0.001,
  true,
  'x2 Free wait should advance two simulated seconds per one real second',
);
assert.equal(
  Math.abs(sealedX4OneSecond.simulationTimeS - (sealedWaitBase.simulationTimeS + 4)) < 0.001,
  true,
  'x4 Free wait should advance four simulated seconds per one real second',
);
assert.equal(
  Math.abs(sealedX16OneSecond.simulationTimeS - (sealedWaitBase.simulationTimeS + 16)) < 0.001,
  true,
  'x16 Free wait should advance sixteen simulated seconds per one real second',
);
assert.equal(
  sealedX2OneSecond.heatCapacityFreeSensorState.pressureHistory.filter((sample) => (
    sample.atS > sealedX2Start.simulationTimeS
  )).length > 1,
  true,
  'accelerated Free waiting should preserve intermediate sensor samples instead of taking one sparse sample per UI tick',
);
assert.equal(
  getActiveFreeTraceSampleCount(sealedX4OneSecond) > getActiveFreeTraceSampleCount(sealedX4Start) + 1,
  true,
  'accelerated Free waiting should append multiple trace display points inside one real-time tick',
);
let rapidSpeedEightPumpFile: WorkbenchHeatCapacityState = {
  ...setHeatCapacityFreeEquilibriumSpeedMultiplier(freePumpReady, 8, 7_900),
  heatCapacityPhase: 'pumping',
};
for (let strokeIndex = 0; strokeIndex < 3; strokeIndex += 1) {
  rapidSpeedEightPumpFile = registerHeatCapacityPumpStroke(
    rapidSpeedEightPumpFile,
    8_000 + strokeIndex * 100,
  );
}
assert.equal(rapidSpeedEightPumpFile.pumpFrequencyStatus, 'suitable');
assert.equal(
  rapidSpeedEightPumpFile.heatCapacityFreePhysicsState.simulationTimeS < 1,
  true,
  'equilibrium speed multiplier must not accelerate pump-click cadence or active pumping time',
);
const fiveStrokeFreeFileStarted = calibratedPumpFile;
assert.equal(fiveStrokeFreeFileStarted.heatCapacityFreePhysicsState.pumpStrokeCount, 18);
assert.equal(
  fiveStrokeFreeFileStarted.pressureSafetyStatus,
  'warning',
  'calibrated Free pumping should enter the suggested-stop region before danger',
);
assert.equal(fiveStrokeFreeFileStarted.pressureBlockedPumping, false);
const fiveStrokeFreeFile = stepHeatCapacityWorkbenchFile(fiveStrokeFreeFileStarted, calibratedPumpLastAtMs + 240);
assert.equal(fiveStrokeFreeFile.heatCapacityFreePhysicsState.pumpStrokeCount, 18);
assert.equal(fiveStrokeFreeFile.pressureSafetyStatus, 'warning');
assert.equal(fiveStrokeFreeFile.pressureBlockedPumping, false);
const hotOverLimitFreeFile = registerHeatCapacityPumpStroke({
  ...freePumpReady,
  lastUpdateMs: 8_000,
  heatCapacityFreePhysicsState: {
    ...freePumpReady.heatCapacityFreePhysicsState,
    gasAmountRatio: 1,
    gasTemperatureK: 321,
    wallTemperatureK: 321,
    simulationTimeS: 2,
  },
}, 8_000);
assert.equal(
  hotOverLimitFreeFile.heatCapacityFreePhysicsState.pumpStrokeCount,
  0,
  'Free alarm blocking should follow the current calculated pressure, even when amount ratio alone would look safe',
);
assert.equal(hotOverLimitFreeFile.pressureSafetyStatus, 'danger');
assert.equal(hotOverLimitFreeFile.pressureBlockedPumping, true);
assert.equal(hotOverLimitFreeFile.pressureDeltaKPa > hotOverLimitFreeFile.pressureSafetyThresholdKPa, true);
const fiveStrokeTraceTrial = fiveStrokeFreeFile.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === fiveStrokeFreeFile.heatCapacityFreeTraceStore.activeTraceTrialId
));
const fiveStrokeBranch = fiveStrokeTraceTrial?.branches.find((branch) => (
  branch.id === fiveStrokeTraceTrial.activeBranchId
));
assert.notEqual(fiveStrokeBranch, undefined);
const fiveStrokePumpDisplayLevels = new Set(
  fiveStrokeBranch!.samples
    .filter((sample) => sample.phase === 'pumping')
    .map((sample) => Math.round(sample.sensor.displayPressureMv / 5) * 5),
);
assert.equal(
  fiveStrokePumpDisplayLevels.size >= 5,
  true,
  'Free process trace should keep enough display-layer samples to show each rapid pump step instead of collapsing into a few plateaus',
);
let rapidPointOneSecondPumpFile: WorkbenchHeatCapacityState = freePumpReady;
for (let strokeIndex = 0; strokeIndex < 5; strokeIndex += 1) {
  rapidPointOneSecondPumpFile = registerHeatCapacityPumpStroke(
    rapidPointOneSecondPumpFile,
    6_000 + strokeIndex * 100,
  );
}
const rapidPointOneSecondTraceTrial = rapidPointOneSecondPumpFile.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === rapidPointOneSecondPumpFile.heatCapacityFreeTraceStore.activeTraceTrialId
));
const rapidPointOneSecondBranch = rapidPointOneSecondTraceTrial?.branches.find((branch) => (
  branch.id === rapidPointOneSecondTraceTrial.activeBranchId
));
assert.notEqual(rapidPointOneSecondBranch, undefined);
const rapidPumpEvents = rapidPointOneSecondBranch!.events.filter((event) => event.type === 'pump-stroke');
const rapidPumpEventSamples = rapidPumpEvents.flatMap((event) => (
  rapidPointOneSecondBranch!.samples.filter((sample) => sample.id === event.traceSampleId)
));
assert.equal(rapidPumpEvents.length, 5);
assert.equal(rapidPumpEventSamples.length, 5);
assert.equal(
  new Set(rapidPumpEventSamples.map((sample) => (
    Math.round(sample.sensor.displayPressureMv / 5) * 5
  ))).size >= 4,
  true,
  '0.1 s Free pump strokes should keep distinct event-linked display levels while accepted',
);
assert.equal(
  fiveStrokeFreeFile.pressureDeltaKPa > fiveStrokeFreeFile.pressureWarningThresholdKPa,
  true,
  'Free pressure value should remain above the warning threshold after calibrated pumping instead of being clamped by warning state',
);
assert.equal(
  fiveStrokeFreeFile.pressureGaugeTargetValue > fiveStrokeFreeFile.pressureWarningThresholdKPa,
  true,
  'Free pressure gauge target should keep reflecting over-warning pressure',
);
assert.equal(
  Math.abs(fiveStrokeFreeFile.pressureGaugeTargetValue - fiveStrokeFreeFile.pressureDeltaKPa) < 0.01,
  true,
  'Free pressure gauge target should be bound to the current pressure value, not the alarm decision value',
);
assert.equal(
  fiveStrokeFreeFile.pressureGaugeDisplayValue,
  fiveStrokeFreeFile.pressureGaugeTargetValue,
  'Free pressure gauge needle should follow the pressure value directly instead of being held by the lagged display layer',
);
const freeVisibleDangerPumpBlocked = registerHeatCapacityPumpStroke({
  ...freePowered,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: freePowered.pressureSafetyThresholdKPa,
  pressureSignalMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalTargetMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalMvDisplayed: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalMvRaw: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSafetyStatus: 'danger',
  pressureBlockedPumping: true,
  pressureOverLimit: true,
  heatCapacityFreePhysicsState: {
    ...freePowered.heatCapacityFreePhysicsState,
    gasAmountRatio: (freePowered.ambientPressureKPa + freePowered.pressureSafetyThresholdKPa) /
      freePowered.ambientPressureKPa,
    gasTemperatureK: freePowered.ambientTemperatureK,
    pumpStrokeCount: 5,
  },
  heatCapacityFreeSensorState: {
    ...freePowered.heatCapacityFreeSensorState,
    displayPressureMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
    displayTemperatureMv: initialTemperatureMv,
    pressureSlopeMvPerS: 0,
    temperatureSlopeMvPerS: 0,
  },
}, 1_000);
assert.equal(
  freeVisibleDangerPumpBlocked.heatCapacityFreePhysicsState.pumpStrokeCount,
  5,
  'Free Mode should reject further physical pump strokes once the visible danger threshold is reached',
);
assert.equal(freeVisibleDangerPumpBlocked.pumpHint, '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。');
const freeStepped = stepHeatCapacityWorkbenchFile(freePumped, 1_800);
assert.equal(
  freeStepped.pressureSignalMv,
  truncateHeatCapacitySignalMv(freeStepped.heatCapacityFreeSensorState.displayPressureMv),
  'Free stepping should not apply teaching lag/jitter after the Free sensor',
);
assert.equal(
  freeStepped.temperatureSignalMv,
  truncateHeatCapacitySignalMv(freeStepped.heatCapacityFreeSensorState.displayTemperatureMv),
);
const freeReadyForRelease = {
  ...freeStepped,
  heatCapacityFreeTrials: [
    {
      ...createHeatCapacityFreeTrial('free-ready-release'),
      u0: normalizeHeatCapacityFreeRecordInput({
        atS: 1,
        displayPressureMv: 0,
        displayTemperatureMv: initialTemperatureMv,
        calibrationVersion: 1,
        zeroEventId: 'zero-1',
        phaseAtRecord: 'readyToPump',
      }),
      u1: normalizeHeatCapacityFreeRecordInput({
        atS: 300,
        displayPressureMv: 25,
        displayTemperatureMv: initialTemperatureMv,
        calibrationVersion: 1,
        zeroEventId: 'zero-1',
        phaseAtRecord: 'sealedStabilizing',
      }),
    },
  ],
};
const freeReleaseStarted = stepHeatCapacityWorkbenchFile({
  ...freeReadyForRelease,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeStopcockFlowOpen: true,
  heatCapacityFreeStopcockFlowPurpose: 'release',
}, 2_000);
assert.equal(freeReleaseStarted.heatCapacityFreePhysicsState.releaseStarted, true, 'opening the stopcock in Free Mode should enter the Free release path');
assert.equal(freeReleaseStarted.heatCapacityFreeStopcockFlowPurpose, 'release');
const freeZeroingOpen = stepHeatCapacityWorkbenchFile({
  ...freePowered,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeStopcockFlowOpen: true,
  heatCapacityFreeStopcockFlowPurpose: 'zeroing',
  heatCapacityFreeSensorState: {
    ...freePowered.heatCapacityFreeSensorState,
    displayPressureMv: 0.02,
    displayTemperatureMv: initialTemperatureMv,
    pressureSlopeMvPerS: 0,
    temperatureSlopeMvPerS: 0,
  },
  pressureZeroDisplayedSamples: [
    { atMs: 1_800, valueMv: 0.02 },
    { atMs: 1_900, valueMv: 0.01 },
    { atMs: 2_000, valueMv: 0 },
  ],
}, 2_000);
assert.equal(
  freeZeroingOpen.heatCapacityFreePhysicsState.releaseStarted,
  false,
  'opening the stopcock for U0 zeroing must not create a Free release reference',
);
assert.equal(
  freeZeroingOpen.heatCapacityPhase,
  'readyToZero',
  'U0 zeroing flow should stay in the zeroing path instead of jumping to quick release',
);
assert.equal(freeZeroingOpen.heatCapacityFreeStopcockFlowPurpose, 'zeroing');
const delayedFlowOpening = stepHeatCapacityWorkbenchFile({
  ...freeReadyForRelease,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeStopcockFlowOpen: false,
  heatCapacityFreeStopcockPendingOpenAtMs: 2_000 + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS,
  heatCapacityFreeStopcockFlowPurpose: 'release',
}, 2_000 + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS - 1);
assert.equal(
  delayedFlowOpening.heatCapacityFreeStopcockFlowOpen,
  false,
  'Free physical stopcock flow should stay closed during the visual opening animation',
);
assert.equal(
  delayedFlowOpening.heatCapacityFreePhysicsState.releaseStarted,
  false,
  'Free release must not start before the physical flow path opens',
);
const flowOpenedAfterDelay = stepHeatCapacityWorkbenchFile(delayedFlowOpening, 2_000 + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS + 20);
assert.equal(flowOpenedAfterDelay.heatCapacityFreeStopcockFlowOpen, true);
assert.equal(flowOpenedAfterDelay.heatCapacityFreeStopcockPendingOpenAtMs, null);
assert.equal(flowOpenedAfterDelay.heatCapacityFreePhysicsState.releaseStarted, true);
const closedFlowImmediately = stepHeatCapacityWorkbenchFile({
  ...flowOpenedAfterDelay,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed',
  heatCapacityFreeStopcockFlowOpen: false,
  heatCapacityFreeStopcockPendingOpenAtMs: null,
}, 2_000 + HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS + 40);
assert.equal(
  closedFlowImmediately.heatCapacityFreeStopcockFlowOpen,
  false,
  'Free physical stopcock flow should close immediately when the user starts closing the stopcock',
);
assert.equal(
  closedFlowImmediately.heatCapacityFreePhysicsState.currentStopcockOpenDurationS,
  0,
  'closing the visual stopcock should not continue accumulating Free release time during the closing animation',
);
const quickToggleBeforeFlowOpen = stepHeatCapacityWorkbenchFile({
  ...freeReadyForRelease,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed',
  heatCapacityFreeStopcockFlowOpen: false,
  heatCapacityFreeStopcockPendingOpenAtMs: null,
}, 2_000 + Math.floor(HEAT_CAPACITY_FREE_STOPCOCK_OPEN_FLOW_DELAY_MS / 2));
assert.equal(
  quickToggleBeforeFlowOpen.heatCapacityFreePhysicsState.releaseStarted,
  false,
  'a quick open-close before the flow delay expires should not count as a physical Free release',
);
const freeZeroed = setHeatCapacityPressureZeroOffset({
  ...freePowered,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeStopcockFlowOpen: true,
  heatCapacityFreeStopcockPendingOpenAtMs: null,
  heatCapacityFreeSensorState: {
    ...freePowered.heatCapacityFreeSensorState,
    displayPressureMv: 0.02,
    displayTemperatureMv: initialTemperatureMv,
    nextSampleAtS: 10,
    pressureSlopeMvPerS: 0,
    temperatureSlopeMvPerS: 0,
  },
  pressureZeroDisplayedSamples: [
    { atMs: 1_000, valueMv: 0.02 },
    { atMs: 1_100, valueMv: -0.01 },
    { atMs: 1_200, valueMv: 0.01 },
    { atMs: 1_240, valueMv: 0 },
  ],
}, 0, 'fineWheel', 0, 1_250);
assert.equal(freeZeroed.heatCapacityFreeCalibrationState.calibrationVersion, 1, 'Free zeroing should create a calibration event');
assert.equal(freeZeroed.heatCapacityFreeCalibrationState.zeroEvents[0].id, 'zero-1');
const freeAutomaticU0 = stepHeatCapacityWorkbenchFile({
  ...freeZeroed,
  pressureZeroed: true,
}, 1_350);
assert.equal(freeAutomaticU0.heatCapacityFreeCalibrationState.automaticU0?.zeroEventId, 'zero-1', 'Free Mode should capture U0 automatically from a stable zeroed open state');
const poweredOffHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: null,
  pressureMv: null,
  phase: 'powerOff',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
assert.equal(poweredOffHardSphereVisual.targetParticleCount > 0, true, 'hard-sphere teaching layer should remain visible before power is turned on');
assert.equal(poweredOffHardSphereVisual.thermalSpeedMultiplier > 0, true, 'powered-off hard-sphere teaching layer should still show room-temperature motion');
const poweredOffPressurizedHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: null,
  pressureMv: null,
  pressureDeltaKPa: 5.5,
  gasAmountRatio: 1.06,
  phase: 'powerOff',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
assert.equal(
  poweredOffPressurizedHardSphereVisual.targetParticleCount > poweredOffHardSphereVisual.targetParticleCount,
  true,
  'powered-off hard-sphere teaching layer should keep showing the extra pumped gas already inside the bottle',
);
const lowPressurePumpingHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 20,
  pressureDeltaKPa: 1,
  gasAmountRatio: 1.01,
  gasTemperatureK: 298.65,
  ambientTemperatureK: 298.15,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
});
const highPressurePumpingHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 110,
  pressureDeltaKPa: 5.5,
  gasAmountRatio: 1.06,
  gasTemperatureK: 301.15,
  ambientTemperatureK: 298.15,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
});
assert.equal(
  highPressurePumpingHardSphereVisual.thermalSpeedMultiplier >= lowPressurePumpingHardSphereVisual.thermalSpeedMultiplier + 0.18,
  true,
  'hard-sphere random thermal speed should visibly increase as gas temperature rises',
);
const releaseCoolingHardSphereVisual = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 110,
  pressureDeltaKPa: 5.5,
  gasAmountRatio: 1.02,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  stopcockFlowOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  releaseFlowActive: true,
});
assert.equal(
  releaseCoolingHardSphereVisual.outflowDriftSpeed > 0,
  true,
  'confirmed release should create directed release drift instead of changing random thermal speed',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(releaseCoolingHardSphereVisual, 'exitSelectionRate'),
  false,
  'confirmed release should leave particle-count selection to the release timeline',
);
assert.equal(
  releaseCoolingHardSphereVisual.thermalSpeedMultiplier < poweredOffHardSphereVisual.thermalSpeedMultiplier,
  true,
  'release cooling should slow random thermal motion through temperature, not through pressure',
);
assert.equal(HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV, 90);
assert.equal(HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, 120);
assert.equal(HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, 140);
assert.equal(defaultFile.pressureWarningThresholdKPa, HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafeThresholdKPa, HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafetyThresholdKPa, HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / defaultFile.pressureSensitivityMvPerKPa);
assert.equal(defaultFile.pressureSafetyStatus, 'normal');
assert.equal(defaultFile.pressureSafetyMessage, null);
assert.equal(defaultFile.pressureBlockedPumping, false);
assert.equal(defaultFile.pressureOverLimit, false);
assert.deepEqual(HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementTooSlowMvRange, [8, 8]);
assert.deepEqual(HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementSuitableMvRange, [36, 36]);
assert.equal(HEAT_CAPACITY_VIDEO_PROFILE.pumpPeakPressureMvRange[1] < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo profile peak pressure must stay below the alarm threshold');
assert.equal(HEAT_CAPACITY_VIDEO_PROFILE.stablePressureMvRange[1] < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo stable pressure must stay below the alarm threshold');
assert.equal(defaultFile.pressureZeroMvPerTurn, HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN);
assert.equal(defaultFile.temperatureSignalMv, null);
assert.equal(defaultFile.pressureSignalMv, null);
assert.equal(defaultFile.temperatureSignalTargetMv, initialTemperatureMv);
assert.equal(defaultFile.pressureSignalTargetMv, 0);
assert.equal(defaultFile.displayResponseLastUpdateMs, null);
assert.equal(defaultFile.pumpValveOpen, false);
assert.equal(defaultFile.pumpValveState, 'closed');
assert.equal(defaultFile.pumpBulbState, 'idle');
assert.deepEqual(defaultFile.pumpStrokeTimestamps, []);
assert.equal(defaultFile.pumpFrequency, 0);
assert.equal(defaultFile.pumpFrequencyStatus, 'idle');
assert.equal(defaultFile.lastPumpTime, null);
assert.equal(defaultFile.pumpStrokeCount, 0);
assert.equal(defaultFile.hardSphereViewEnabled, false);
assert.equal(defaultFile.hardSphereParticleMultiplier, 1);
assert.equal(defaultFile.hardSphereSpeedMultiplier, 1);
assert.equal(defaultFile.pressureReleaseBurstUntilMs, null);
assert.equal(defaultFile.visualizationMode, 'particle');
assert.equal(defaultFile.calculationModel, 'airHeatCapacityRatio');
assert.equal(defaultFile.pressureSensitivityMvPerKPa, 20);
assert.equal(defaultFile.theoreticalGamma, 1.4);
assert.equal(defaultFile.pressurePlaceholder, 101.3);
assert.equal(defaultFile.temperaturePlaceholder, 298.15);
assert.equal('heatCapacityTrace' in defaultFile, false, 'heatCapacity files should not persist realtime chart trace history');
assert.deepEqual(defaultFile.heatCapacityProcessSamples, {});
assert.equal(canZeroHeatCapacityPressure(defaultFile), false);
assert.equal(HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV, 0.1);
assert.equal(applyHeatCapacityPressureZero(3.2, 0.4, -0.7), 2.9);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(-0.6), -216);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(0.8), 288);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(-216), -0.6);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(288), 0.8);
for (let index = 0; index < 40; index += 1) {
  const biasMv = createHeatCapacityInitialPressureBiasMv();
  assert.equal(biasMv >= -1.5 && biasMv <= 1.5, true, 'initial pressure-zero bias should stay in the three-turn correction range');
}
assert.equal(isHeatCapacityPressureZeroWithinTolerance([
  { atMs: 0, valueMv: 0.08 },
  { atMs: 100, valueMv: -0.04 },
  { atMs: 200, valueMv: 0.03 },
  { atMs: 300, valueMv: -0.09 },
  { atMs: 400, valueMv: 0.1 },
]), true);
assert.equal(isHeatCapacityPressureZeroWithinTolerance([
  { atMs: 0, valueMv: 0.08 },
  { atMs: 100, valueMv: -0.04 },
  { atMs: 200, valueMv: 0.11 },
  { atMs: 300, valueMv: -0.09 },
  { atMs: 400, valueMv: 0.04 },
]), false);

const defaultAirGamma = getHeatCapacityAirGammaResult(defaultFile);
assert.equal(defaultAirGamma.status, 'missing-samples');
assert.equal(defaultAirGamma.ready, false);
assert.equal(defaultAirGamma.gamma, null);

const readyAirGamma = getHeatCapacityAirGammaResult({
  ...defaultFile,
  heatCapacityProcessSamples: {
    zeroedSample: {
      timeS: 1,
      phase: 'zeroed',
      temperatureSignalMv: initialTemperatureMv,
      pressureSignalMv: 0,
      gasTemperatureK: 298.15,
      gasPressureKPaAbs: 101.3,
      pressureDeltaKPa: 0,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: true,
    },
    stableBeforeReleaseSample: {
      timeS: 2,
      phase: 'sealedStabilizing',
      temperatureSignalMv: 1526,
      pressureSignalMv: 120,
      gasTemperatureK: 304.9,
      gasPressureKPaAbs: 107.3,
      pressureDeltaKPa: 6,
      pumpFrequency: 0.67,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
    recoverySample: {
      timeS: 3,
      phase: 'recovering',
      temperatureSignalMv: 1522,
        pressureSignalMv: 34.3,
      gasTemperatureK: 303.9,
      gasPressureKPaAbs: 102.9,
      pressureDeltaKPa: 1.6,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
  },
});
assert.equal(readyAirGamma.status, 'ready');
assert.equal(readyAirGamma.U1Mv, 120);
assert.equal(readyAirGamma.U2Mv, 34.3);
assert.equal(readyAirGamma.deltaP1KPa, 6);
assert.equal(Math.abs((readyAirGamma.deltaP2KPa ?? 0) - 1.715) < 1e-9, true);
assert.equal(readyAirGamma.P1KPa, 107.3);
assert.equal(Math.abs((readyAirGamma.P2KPa ?? 0) - 103.015) < 1e-9, true);
assert.equal(readyAirGamma.gamma !== null && readyAirGamma.gamma > 1.39 && readyAirGamma.gamma < 1.41, true);

const poweredFile = powerHeatCapacityWorkbenchFile({
  ...defaultFile,
  heatCapacityMode: 'guide' as const,
}, true, 1_000);
assert.equal(poweredFile.powerOn, true);
assert.equal(poweredFile.heatCapacityPhase, 'readyToZero');
assert.equal(poweredFile.temperatureSignalMv, 1499);
assert.equal(poweredFile.pressureSignalMv, 0);
assert.equal(poweredFile.temperatureSignalTargetMv, initialTemperatureMv);
assert.equal(poweredFile.pressureSignalTargetMv, 0);
assert.equal(poweredFile.hardSphereViewEnabled, false, 'powering on should not automatically enable the teaching visualization');
assert.equal('heatCapacityTrace' in poweredFile, false, 'powering on should not create chart trace history');

let stableDisplayFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  pressureSignalMv: poweredFile.pressureSignalTargetMv,
  temperatureSignalMv: poweredFile.temperatureSignalTargetMv,
  displayResponseLastUpdateMs: 1_000,
};
const stablePressureTargets = new Set<number>();
const stablePressureDisplays = new Set<number>();
const stableTemperatureTargets = new Set<number>();
const stableTemperatureDisplays = new Set<number>();
for (let index = 0; index < 20; index += 1) {
  stableDisplayFile = stepHeatCapacityWorkbenchFile(stableDisplayFile, 1_100 + index * 180);
  stablePressureTargets.add(stableDisplayFile.pressureSignalTargetMv);
  stablePressureDisplays.add(stableDisplayFile.pressureSignalMv ?? Number.NaN);
  stableTemperatureTargets.add(stableDisplayFile.temperatureSignalTargetMv);
  stableTemperatureDisplays.add(stableDisplayFile.temperatureSignalMv ?? Number.NaN);
}
assert.equal(stablePressureTargets.size, 1, 'display jitter must not change the pressure target value');
assert.equal(stableTemperatureTargets.size, 1, 'display jitter must not change the temperature target value');
assert.equal(stablePressureDisplays.size, 1, 'sub-0.1 mV pressure jitter should not create visible instrument digits');
assert.equal(stableTemperatureDisplays.size > 1, true, 'temperature jitter can still cross one-decimal instrument digits');

const pressureLoadedFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 0.16,
  pressureDeltaKPa: 0.16,
  pressureSignalMvRaw: 3.2,
  pressureSignalMvDisplayed: 3.2,
  pressureRawPlaceholder: 3.2,
  pressureDisplayedPlaceholder: 3.2,
  pressureGaugeTargetValue: 0.16,
  pressureGaugeDisplayValue: 0.16,
  pressureGaugeNeedleAngle: -119.25,
  pressureSignalMv: 3.2,
};
const fineZero = adjustHeatCapacityPressureZeroFine({
  ...pressureLoadedFile,
}, 1, 1_080);
assert.equal(fineZero.pressureZeroAdjusted, true);
assert.equal(fineZero.pressureZeroed, false, 'a knob movement alone must not mark pressure zero as valid');
assert.equal(fineZero.pressureZeroAdjustMode, 'fineWheel');
assert.equal(fineZero.pressureZeroKnobAngle, 2);
assert.equal(fineZero.pressureZeroOffset, 0.006);
assert.equal(fineZero.pressureDisplayedPlaceholder, 3.21);
assert.equal(fineZero.pressureSignalTargetMv, 3.206);
assert.equal(
  fineZero.pressureSignalMv,
  truncateHeatCapacitySignalMv(fineZero.pressureSignalTargetMv),
  'teaching zero knob should update the visible U_p immediately',
);
assert.equal(fineZero.pressureGaugeDisplayValue, pressureLoadedFile.pressureDeltaKPa);
assert.equal(fineZero.pressureOverLimit, false);
assert.equal(fineZero.temperatureSignalMv, pressureLoadedFile.temperatureSignalMv);
assert.equal(fineZero.temperatureSignalTargetMv, pressureLoadedFile.temperatureSignalTargetMv);
assert.equal(fineZero.temperaturePlaceholder, pressureLoadedFile.temperaturePlaceholder);

const coarseZero = adjustHeatCapacityPressureZeroCoarse({
  ...fineZero,
}, 90);
assert.equal(coarseZero.pressureZeroAdjustMode, 'coarseDrag');
assert.equal(coarseZero.pressureZeroKnobAngle, 92);
assert.equal(coarseZero.pressureZeroOffset > fineZero.pressureZeroOffset, true);
assert.equal(coarseZero.pressureDisplayedPlaceholder > fineZero.pressureDisplayedPlaceholder, true);
assert.equal(coarseZero.pressureZeroOffset, 0.256);
assert.equal(coarseZero.temperatureSignalTargetMv, fineZero.temperatureSignalTargetMv);

const coarseZeroPoweredOff = powerHeatCapacityWorkbenchFile(coarseZero, false, 1_120);
assert.equal(coarseZeroPoweredOff.powerOn, false);
assert.equal(coarseZeroPoweredOff.pressureSignalMv, null);
assert.equal(coarseZeroPoweredOff.pressureZeroAdjusted, true);
assert.equal(coarseZeroPoweredOff.pressureZeroKnobAngle, coarseZero.pressureZeroKnobAngle);
assert.equal(coarseZeroPoweredOff.pressureZeroOffset, coarseZero.pressureZeroOffset);
assert.equal(coarseZeroPoweredOff.pressureZeroDisplayText, coarseZero.pressureZeroDisplayText);
const coarseZeroPoweredOnAgain = powerHeatCapacityWorkbenchFile(coarseZeroPoweredOff, true, 1_180);
assert.equal(coarseZeroPoweredOnAgain.powerOn, true);
assert.equal(coarseZeroPoweredOnAgain.pressureZeroAdjusted, true);
assert.equal(coarseZeroPoweredOnAgain.pressureZeroKnobAngle, coarseZero.pressureZeroKnobAngle);
assert.equal(coarseZeroPoweredOnAgain.pressureZeroOffset, coarseZero.pressureZeroOffset);
assert.equal(coarseZeroPoweredOnAgain.pressureSignalTargetMv, coarseZero.pressureSignalTargetMv);

assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG), HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(0), 0);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG), HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(360), 1);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(180), 0.5);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(90), 0.25);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV), HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(0), 0);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV), HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(1), 360);

const upperLimitedZero = adjustHeatCapacityPressureZeroCoarse({
  ...pressureLoadedFile,
  pressureZeroKnobAngle: 530,
  pressureZeroOffset: getHeatCapacityPressureZeroOffsetForKnobAngle(530),
}, 120);
assert.equal(upperLimitedZero.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(upperLimitedZero.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);
const upperLimitedAgain = adjustHeatCapacityPressureZeroFine(upperLimitedZero, 1);
assert.equal(upperLimitedAgain.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(upperLimitedAgain.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);

const lowerLimitedZero = adjustHeatCapacityPressureZeroCoarse({
  ...pressureLoadedFile,
  pressureZeroKnobAngle: -530,
  pressureZeroOffset: getHeatCapacityPressureZeroOffsetForKnobAngle(-530),
}, -120);
assert.equal(lowerLimitedZero.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(lowerLimitedZero.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);
const lowerLimitedAgain = adjustHeatCapacityPressureZeroFine(lowerLimitedZero, -1);
assert.equal(lowerLimitedAgain.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(lowerLimitedAgain.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);

const demoStart = prepareHeatCapacityAutoDemoStart(defaultFile, 20_000, () => 0.75);
assert.equal(demoStart.powerOn, true);
assert.equal(demoStart.runState, 'running');
assert.equal(demoStart.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(demoStart.glassPistonState, 'closed');
assert.equal(demoStart.pressureZeroAdjusted, false);
assert.equal(Math.abs(demoStart.pressureSignalTargetMv), 0.75);
assert.equal(demoStart.pressureDeltaKPa, 0);
assert.equal(demoStart.gasPressureKPaAbs, defaultFile.ambientPressureKPa);
assert.equal(demoStart.temperatureSignalTargetMv, demoStart.heatCapacityExperimentProfile?.initialTemperatureMv);
assert.equal(demoStart.temperatureSignalMv, truncateHeatCapacitySignalMv(demoStart.heatCapacityExperimentProfile?.initialTemperatureMv ?? 0));
assert.equal(demoStart.heatCapacityExperimentSeed !== null, true);
assert.equal(demoStart.heatCapacityExperimentProfile !== null, true);
const demoTeachingProfile = demoStart.heatCapacityExperimentProfile!;
assert.equal(demoTeachingProfile.u1MeasuredMv >= 105 && demoTeachingProfile.u1MeasuredMv <= 130, true, 'auto demo teaching U1 should stay in the 105-130 mV baseline range');
assert.equal(
  Math.abs(demoTeachingProfile.u2MeasuredMv - demoTeachingProfile.u1MeasuredMv * (1 - 1 / demoTeachingProfile.gammaTarget)) <= 1,
  true,
  'auto demo teaching U2 should stay near U1 * (1 - 1 / gamma)',
);
const demoTeachingTargets = calculateAirHeatCapacityTargets(demoTeachingProfile);
assert.equal(demoTeachingTargets.gamma >= 1.35 && demoTeachingTargets.gamma <= 1.45, true, 'auto demo teaching gamma should stay near the air baseline');
assert.equal(demoStart.heatCapacityExpectedTrialCount, 1);
assert.equal(demoStart.heatCapacityExpectedTrialCountMode, 'custom');
assert.equal(demoStart.heatCapacityTrials.length, 1);
assert.equal(demoStart.heatCapacityTrials[0].status, 'waiting');
assert.equal(demoStart.heatCapacityProcessingCalculated, false);
assert.deepEqual(demoStart.heatCapacityProcessSamples, {});

const visualDemoStart = prepareHeatCapacityAutoDemoStart({
  ...defaultFile,
  hardSphereViewEnabled: true,
  hardSphereParticleMultiplier: 1.15,
  hardSphereSpeedMultiplier: 1.2,
}, 20_500, () => 0.5);
assert.equal(visualDemoStart.hardSphereViewEnabled, true, 'auto demo start should preserve the hard-sphere teaching toggle');
assert.equal(visualDemoStart.hardSphereParticleMultiplier, 1.15);
assert.equal(visualDemoStart.hardSphereSpeedMultiplier, 1.2);
assert.equal(visualDemoStart.pressureReleaseBurstUntilMs, null);

const autoDemoPumpActions = createHeatCapacityAutoDemoSteps()
  .flatMap((step) => step.actions)
  .filter((action) => action.action === 'pumpStroke');
assert.equal(autoDemoPumpActions.length, HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT, 'auto demo should keep the four-stroke teaching pump sequence');
let autoDemoPressureFile: WorkbenchHeatCapacityState = {
  ...demoStart,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed' as const,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
};
for (const action of autoDemoPumpActions) {
  autoDemoPressureFile = registerHeatCapacityPumpStroke(autoDemoPressureFile, 21_000 + (action.delayMs ?? 0));
}
assert.equal(autoDemoPressureFile.pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo pumping must never reach the alarm region');
assert.equal(autoDemoPressureFile.pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true, 'auto demo four-stroke pumping should stay below the Free Mode suggested-stop line');
assert.equal(autoDemoPressureFile.pressureOverLimit, false, 'auto demo pumping must not set the alarm state');

const completedDemo = markHeatCapacityDemoComplete({
  ...demoStart,
  hardSphereViewEnabled: true,
  hardSphereParticleMultiplier: 1.15,
  hardSphereSpeedMultiplier: 1.2,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpBulbState: 'compressing',
  pumpStrokeTimestamps: [20_000, 20_400, 20_800],
  pumpFrequency: 2.5,
  pumpFrequencyStatus: 'suitable',
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  pressureZeroKnobAngle: 44,
  pressureZeroOffset: 1.2,
  pressureZeroAdjustMode: 'coarseDrag',
}, 30_000);
assert.equal(completedDemo.runState, 'finished');
assert.equal(completedDemo.heatCapacityPhase, 'demoComplete');
assert.equal(completedDemo.powerOn, false);
assert.equal(completedDemo.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(completedDemo.glassPistonState, 'closed');
assert.equal(completedDemo.pumpValveOpen, false);
assert.equal(completedDemo.pumpValveState, 'closed');
assert.equal(completedDemo.pumpBulbState, 'idle');
assert.deepEqual(completedDemo.pumpStrokeTimestamps, []);
assert.equal(completedDemo.pumpFrequency, 0);
assert.equal(completedDemo.pumpFrequencyStatus, 'idle');
assert.equal(completedDemo.pressureZeroAdjusted, false);
assert.equal(completedDemo.pressureZeroed, false);
assert.equal(completedDemo.pressureZeroKnobAngle, 0);
assert.equal(completedDemo.pressureZeroOffset, 0);
assert.equal(completedDemo.pressureZeroAdjustMode, 'none');
assert.equal(completedDemo.temperatureSignalMv, null);
assert.equal(completedDemo.pressureSignalMv, null);
assert.equal(completedDemo.hardSphereViewEnabled, true, 'auto demo completion should preserve the hard-sphere teaching toggle');
assert.equal(completedDemo.hardSphereParticleMultiplier, 1.15);
assert.equal(completedDemo.hardSphereSpeedMultiplier, 1.2);
assert.equal(completedDemo.pressureReleaseBurstUntilMs, null);

const returnedFreeAfterDemo = enterHeatCapacityFreeModeWorkbenchState(completedDemo, 30_500);
assert.equal(returnedFreeAfterDemo.heatCapacityMode, 'free');
assert.equal(returnedFreeAfterDemo.runState, 'idle');
assert.equal(returnedFreeAfterDemo.heatCapacityPhase, 'powerOff');
assert.equal(returnedFreeAfterDemo.powerOn, false);
assert.equal(returnedFreeAfterDemo.pumpValveOpen, false);

const manualResetAfterDemo = resetHeatCapacityForManualExperiment({
  ...completedDemo,
  heatCapacityProcessSamples: {
    ...completedDemo.heatCapacityProcessSamples,
    recoverySample: {
      timeS: 114.3,
      phase: 'recovering',
      temperatureSignalMv: 1504.4,
      pressureSignalMv: 31.77,
      gasTemperatureK: 298.6,
      gasPressureKPaAbs: completedDemo.ambientPressureKPa + 1.5885,
      pressureDeltaKPa: 1.5885,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
  },
  pressureSignalMvDisplayed: 31.77,
  pressureDisplayedPlaceholder: 31.77,
  pressureDeltaKPa: 1.5885,
  gasPressureKPaAbs: completedDemo.ambientPressureKPa + 1.5885,
  heatCapacityProcessingCalculated: true,
}, 31_000);
assert.equal(manualResetAfterDemo.powerOn, false);
assert.equal(manualResetAfterDemo.runState, 'idle');
assert.equal(manualResetAfterDemo.heatCapacityPhase, 'powerOff');
assert.equal(manualResetAfterDemo.pressureDeltaKPa, 0);
assert.equal(manualResetAfterDemo.gasPressureKPaAbs, manualResetAfterDemo.ambientPressureKPa);
assert.equal(Math.abs(manualResetAfterDemo.pressureDisplayedPlaceholder) <= 1.5, true);
assert.equal(manualResetAfterDemo.heatCapacityExpectedTrialCount, 3);
assert.equal(manualResetAfterDemo.heatCapacityExpectedTrialCountMode, '3');
assert.equal(manualResetAfterDemo.heatCapacityTrials.length, 3);
assert.equal(manualResetAfterDemo.heatCapacityTrials.every((trial) => trial.status === 'waiting'), true);
assert.equal(manualResetAfterDemo.heatCapacityProcessingCalculated, false);
assert.deepEqual(manualResetAfterDemo.heatCapacityProcessSamples, {});

const poweredAfterManualReset = powerHeatCapacityWorkbenchFile(manualResetAfterDemo, true, 31_100);
assert.equal(poweredAfterManualReset.powerOn, true);
assert.equal(poweredAfterManualReset.heatCapacityPhase, 'readyToZero');
assert.equal(poweredAfterManualReset.pressureDeltaKPa, 0);
assert.equal(poweredAfterManualReset.gasPressureKPaAbs, poweredAfterManualReset.ambientPressureKPa);
assert.equal(Math.abs(poweredAfterManualReset.pressureInitialBiasMv) <= 1.5, true);
assert.equal(Math.abs(poweredAfterManualReset.pressureSignalMv ?? 0) <= 1.6, true);

const pumpedTarget = registerHeatCapacityPumpStroke({
  ...demoStart,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'closed',
  pumpValveOpen: true,
  pumpValveState: 'open',
  pumpStrokeTimestamps: [20_000, 20_600],
}, 21_000);
assert.equal(pumpedTarget.pressureSignalTargetMv > demoStart.pressureSignalTargetMv, true);
assert.equal(pumpedTarget.pressureSignalMv < pumpedTarget.pressureSignalTargetMv, true);
assert.equal(pumpedTarget.temperatureSignalTargetMv > demoStart.temperatureSignalTargetMv, true);
assert.equal(pumpedTarget.temperatureSignalMv < pumpedTarget.temperatureSignalTargetMv, true);
assert.equal(Math.abs(pumpedTarget.pressureGaugeTargetValue - pumpedTarget.pressureDeltaKPa) < 0.01, true);
assert.equal(pumpedTarget.pressureGaugeDisplayValue <= pumpedTarget.pressureGaugeTargetValue, true);

const settledDisplay = stepHeatCapacityWorkbenchFile(pumpedTarget, 22_000);
assert.equal(settledDisplay.pressureSignalMv > pumpedTarget.pressureSignalMv, true);
assert.equal(settledDisplay.temperatureSignalMv > pumpedTarget.temperatureSignalMv, true);
assert.equal(Math.abs(settledDisplay.pressureGaugeTargetValue - settledDisplay.pressureDeltaKPa) < 0.01, true);
assert.equal(settledDisplay.pressureGaugeDisplayValue > pumpedTarget.pressureGaugeDisplayValue, true);

assert.equal(HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, 0.12);
assert.equal(getHeatCapacityPressureReleaseBurstUntilMs({
  ...poweredFile,
  pressureDeltaKPa: HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA - 0.01,
  pressureSignalTargetMv: (HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA - 0.01) * poweredFile.pressureSensitivityMvPerKPa,
}, true, 40_000), null, 'opening the stopcock without a useful pressure difference should not start a release burst');
assert.equal(getHeatCapacityPressureReleaseBurstUntilMs({
  ...poweredFile,
  pressureDeltaKPa: HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA + 0.01,
  pressureSignalTargetMv: (HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA + 0.01) * poweredFile.pressureSensitivityMvPerKPa,
}, true, 40_000), 41_000, 'opening the stopcock with pressure difference should start a one-second release burst');

const releaseReadyFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  powerOn: true,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  heatCapacityPhase: 'sealedStabilizing',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 5,
  pressureDeltaKPa: 5,
  pressureSignalMvRaw: 100,
  pressureSignalMvDisplayed: 100,
  pressureSignalTargetMv: 100,
  pressureSignalMv: 100,
  pressureDisplayedPlaceholder: 100,
  pressureGaugeTargetValue: 5,
  pressureGaugeDisplayValue: 5,
  lastUpdateMs: 22_000,
  displayResponseLastUpdateMs: 22_000,
  pressureReleaseBurstUntilMs: 23_000,
};
const releasedDuringBurst = stepHeatCapacityWorkbenchFile(releaseReadyFile, 22_700);
assert.equal(releasedDuringBurst.heatCapacityPhase, 'releasing');
assert.equal(releasedDuringBurst.pressureDeltaKPa < HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, true, 'release should rapidly reduce pressure difference toward zero');
assert.equal(releasedDuringBurst.pressureReleaseBurstUntilMs, 23_000);
assert.equal(Math.abs(releasedDuringBurst.pressureSignalMv ?? 0) > 0.2, true, 'release burst should allow a short stronger near-zero display fluctuation');

const releasedAfterBurst = stepHeatCapacityWorkbenchFile({
  ...releasedDuringBurst,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 23_200);
assert.equal(releasedAfterBurst.heatCapacityPhase === 'releasing', false, 'release should not continue after the one-second burst window');
assert.equal(releasedAfterBurst.pressureReleaseBurstUntilMs, null);
assert.equal(releasedAfterBurst.pressureDeltaKPa <= HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, true);
const openStillAfterBurst = stepHeatCapacityWorkbenchFile({
  ...releasedAfterBurst,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 24_200);
assert.equal(openStillAfterBurst.pressureDeltaKPa <= HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, true, 'pressure should not recover while the stopcock remains open');

const noPressureOpenFile = stepHeatCapacityWorkbenchFile({
  ...poweredFile,
  powerOn: true,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  heatCapacityPhase: 'zeroed',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  gasPressureKPaAbs: poweredFile.ambientPressureKPa,
  pressureDeltaKPa: 0,
  pressureSignalTargetMv: 0,
  pressureSignalMv: 0,
  pressureReleaseBurstUntilMs: null,
  lastUpdateMs: 50_000,
  displayResponseLastUpdateMs: 50_000,
}, 50_600);
assert.equal(noPressureOpenFile.heatCapacityPhase === 'releasing', false, 'opening the stopcock at zero pressure difference should stay a normal open state');
assert.equal(noPressureOpenFile.pressureReleaseBurstUntilMs, null);
assert.equal(Math.abs(noPressureOpenFile.pressureSignalMv ?? 0) < 0.2, true, 'zero-pressure stopcock opening should only show ordinary low-amplitude jitter');

assert.deepEqual(getHeatCapacityGaugePressureState(12, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 10,
  pressureGaugeDisplayValue: 10,
  pressureGaugeNeedleAngle: 123.19,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'danger',
  pressureSafetyMessage: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
  pressureBlockedPumping: true,
  pressureOverLimit: true,
});
assert.deepEqual(getHeatCapacityGaugePressureState(5.99, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 5.99,
  pressureGaugeDisplayValue: 5.99,
  pressureGaugeNeedleAngle: 24.39,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'normal',
  pressureSafetyMessage: null,
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(6, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 6,
  pressureGaugeDisplayValue: 6,
  pressureGaugeNeedleAngle: 24.64,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'warning',
  pressureSafetyMessage: '压强已达到建议打气范围，请停止打气并等待回温。',
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(6.99, true, defaultFile), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 6.99,
  pressureGaugeDisplayValue: 6.99,
  pressureGaugeNeedleAngle: 49.03,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'warning',
  pressureSafetyMessage: '压强已达到建议打气范围，请停止打气并等待回温。',
  pressureBlockedPumping: false,
  pressureOverLimit: false,
});
assert.deepEqual(getHeatCapacityGaugePressureState(7, true, defaultFile, 6.98), {
  gaugePressureMinKPa: 0,
  gaugePressureMaxKPa: 10,
  pressureSensitivityMvPerKPa: 20,
  pressureWarningThresholdKPa: 6,
  pressureSafetyThresholdKPa: 7,
  pressureGaugeTargetValue: 7,
  pressureGaugeDisplayValue: 6.98,
  pressureGaugeNeedleAngle: 48.78,
  pressureSafeThresholdKPa: 7,
  pressureSafetyStatus: 'danger',
  pressureSafetyMessage: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
  pressureBlockedPumping: true,
  pressureOverLimit: true,
});

const customPressureSafetyFile: WorkbenchHeatCapacityState = {
  ...defaultFile,
  heatCapacityFreeRecordConfig: {
    ...defaultFile.heatCapacityFreeRecordConfig,
    pressureDangerMv: 160,
  },
  heatCapacityFreePressureWarningMv: 120,
};
const customDangerBoundaryGauge = getHeatCapacityGaugePressureState(8, true, customPressureSafetyFile);
assert.equal(customDangerBoundaryGauge.pressureSafetyThresholdKPa, 8);
assert.equal(customDangerBoundaryGauge.pressureSafetyStatus, 'danger');
assert.equal(customDangerBoundaryGauge.pressureGaugeNeedleAngle, GLB_PRESSURE_GAUGE_DANGER_BOUNDARY_DEG);
assert.equal(
  Math.abs(customDangerBoundaryGauge.gaugePressureMaxKPa - (8 / 0.7)) < 1e-9,
  true,
  'dynamic gauge range should keep the current danger threshold on the GLB fixed red-zone boundary',
);
const customWarningGauge = getHeatCapacityGaugePressureState(6, true, customPressureSafetyFile);
assert.equal(customWarningGauge.pressureSafetyStatus, 'warning');
assert.equal(customWarningGauge.pressureGaugeNeedleAngle < GLB_PRESSURE_GAUGE_DANGER_BOUNDARY_DEG, true);
const customDangerGauge = getHeatCapacityGaugePressureState(8.5, true, customPressureSafetyFile);
assert.equal(customDangerGauge.pressureSafetyStatus, 'danger');
assert.equal(customDangerGauge.pressureGaugeNeedleAngle > GLB_PRESSURE_GAUGE_DANGER_BOUNDARY_DEG, true);

assert.deepEqual(getHeatCapacityPumpFrequencyState([], 10_000), {
  timestamps: [],
  pumpFrequency: 0,
  pumpFrequencyStatus: 'idle',
});
assert.equal(getHeatCapacityPumpFrequencyState([8_000], 10_000).pumpFrequencyStatus, 'tooSlow');
assert.equal(getHeatCapacityPumpFrequencyState([7_200, 8_400, 9_600], 10_000).pumpFrequencyStatus, 'suitable');
assert.equal(JSON.stringify(getHeatCapacityPumpFrequencyState([7_200, 8_400, 9_600], 10_000)).includes('tooFast'), false);
const rapidPointOneSecondFrequency = getHeatCapacityPumpFrequencyState([0, 100, 200, 300], 300);
assert.equal(rapidPointOneSecondFrequency.pumpFrequency, 10);
assert.equal(rapidPointOneSecondFrequency.pumpFrequencyStatus, 'suitable');

const closedValvePump = registerHeatCapacityPumpStroke(poweredFile, 10_000);
assert.equal(closedValvePump.pumpStrokeCount, 0);
assert.deepEqual(closedValvePump.pumpStrokeTimestamps, []);
assert.equal(closedValvePump.pumpFrequency, 0);
assert.equal(closedValvePump.pumpFrequencyStatus, 'idle');
assert.equal(closedValvePump.pressurePlaceholder, poweredFile.pressurePlaceholder);
assert.equal(closedValvePump.temperaturePlaceholder, poweredFile.temperaturePlaceholder);
assert.equal(closedValvePump.pressureKPa, poweredFile.pressureKPa);
assert.equal(closedValvePump.lastPumpTime, poweredFile.lastPumpTime);
assert.equal(closedValvePump.pumpHint, '打气阀门未打开，无法有效打气');

const openStopcockPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 10_000);
assert.equal(openStopcockPump.pumpStrokeCount, 0);
assert.deepEqual(openStopcockPump.pumpStrokeTimestamps, []);
assert.equal(openStopcockPump.pumpFrequency, 0);
assert.equal(openStopcockPump.pumpFrequencyStatus, 'idle');
assert.equal(openStopcockPump.pressurePlaceholder, poweredFile.pressurePlaceholder);
assert.equal(openStopcockPump.temperaturePlaceholder, poweredFile.temperaturePlaceholder);
assert.equal(openStopcockPump.pumpHint, '玻璃旋塞已打开，无法形成有效加压');

const openValvePump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
}, 10_000);
assert.equal(openValvePump.pumpStrokeCount, 1);
assert.equal(openValvePump.pumpFrequencyStatus, 'tooSlow');
assert.equal(openValvePump.pressureSignalTargetMv, 8);
assert.equal(openValvePump.pressurePlaceholder > poweredFile.pressurePlaceholder, true);
assert.equal(openValvePump.temperaturePlaceholder > poweredFile.temperaturePlaceholder, true);

let pumpSequenceFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
};
const pumpSequence: Array<typeof pumpSequenceFile> = [];
for (let strokeIndex = 0; strokeIndex < 11; strokeIndex += 1) {
  pumpSequenceFile = registerHeatCapacityPumpStroke(pumpSequenceFile, 10_000 + strokeIndex * 430);
  pumpSequence.push(pumpSequenceFile);
}
assert.equal(pumpSequence[2].pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true, 'the third guide pump stroke should remain in the safe region');
assert.equal(pumpSequence[3].pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true, 'the fourth guide pump stroke should remain just below the suggested stop line');
assert.equal(pumpSequence[3].pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'the fourth guide pump stroke should remain below the alarm line');
assert.equal(pumpSequence[3].pressureSafetyStatus, 'normal');
assert.equal(pumpSequence[4].pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'the fifth guide pump stroke should enter the alarm region');
assert.equal(pumpSequence[4].pressureSafetyStatus, 'danger');
assert.equal(pumpSequence[4].pressureBlockedPumping, true);

const warningRegionPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: 6,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 6,
  pressureSignalMvRaw: 120,
  pressureSignalMvDisplayed: 120,
  pressureSignalTargetMv: 120,
  pressureRawPlaceholder: 120,
  pressureDisplayedPlaceholder: 120,
  pressureGaugeTargetValue: 6,
  pressureGaugeDisplayValue: 6,
  pressureSafetyStatus: 'warning',
  pumpStrokeTimestamps: [8_800, 9_400],
  pumpFrequency: 0.7,
  pumpFrequencyStatus: 'suitable',
}, 10_000);
assert.equal(warningRegionPump.pumpStrokeCount, 1, 'manual pumping around 120 mV should remain effective');
assert.equal(warningRegionPump.pressureSignalTargetMv > 120, true, 'manual pumping should be able to proceed from warning toward alarm');

const overLimitPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: poweredFile.pressureSafetyThresholdKPa,
  pressureSignalMvRaw: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalMvDisplayed: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureSignalTargetMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  pressureGaugeDisplayValue: poweredFile.pressureSafetyThresholdKPa,
  pressureOverLimit: true,
}, 10_000);
assert.equal(overLimitPump.pumpStrokeCount, 0);
assert.equal(overLimitPump.pressureDeltaKPa, poweredFile.pressureSafetyThresholdKPa);
assert.equal(overLimitPump.pressureOverLimit, true);
assert.equal(overLimitPump.pumpHint, '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。');

const thresholdCrossingPump = registerHeatCapacityPumpStroke({
  ...poweredFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureDeltaKPa: 6.5,
  gasPressureKPaAbs: poweredFile.ambientPressureKPa + 6.5,
  pressureSignalMvRaw: 130,
  pressureSignalMvDisplayed: 130,
  pressureSignalTargetMv: 130,
  pressureRawPlaceholder: 130,
  pressureDisplayedPlaceholder: 130,
  pressureGaugeTargetValue: 6.5,
  pressureGaugeDisplayValue: 6.5,
  pumpStrokeTimestamps: [8_800, 9_400],
  pumpFrequency: 0.7,
  pumpFrequencyStatus: 'suitable',
}, 10_000);
assert.equal(thresholdCrossingPump.pumpStrokeCount, 1);
assert.equal(thresholdCrossingPump.pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true);
assert.equal(thresholdCrossingPump.pressureDeltaKPa > poweredFile.pressureSafeThresholdKPa, true);
assert.equal(thresholdCrossingPump.pressureBlockedPumping, true);
assert.equal(thresholdCrossingPump.pressureOverLimit, true);

const blockedAfterCrossingPump = registerHeatCapacityPumpStroke({
  ...thresholdCrossingPump,
  pumpBulbState: 'idle',
}, 10_400);
assert.equal(blockedAfterCrossingPump.pumpStrokeCount, thresholdCrossingPump.pumpStrokeCount);
assert.equal(blockedAfterCrossingPump.pressureDeltaKPa, thresholdCrossingPump.pressureDeltaKPa);
assert.equal(blockedAfterCrossingPump.pressureSignalTargetMv, thresholdCrossingPump.pressureSignalTargetMv);
assert.equal(blockedAfterCrossingPump.pumpHint, '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。');

const sampledWorkbenchFile = captureHeatCapacityWorkbenchSample({
  ...openValvePump,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  pumpFrequency: 0.67,
}, 'pumpPeakSample', 10_200);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpValveOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.stopcockOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpFrequency, 0.67);

const profiledManualSampleSource = {
  ...openValvePump,
  pressureSignalMv: 88,
  pressureSignalMvRaw: 88,
  pressureSignalMvDisplayed: 88,
  pressureSignalTargetMv: 88,
  pressureDeltaKPa: 4.4,
  temperatureSignalMv: initialTemperatureMv + 6,
  temperatureSignalTargetMv: initialTemperatureMv + 6,
  heatCapacityExperimentProfile: {
    ...demoTeachingProfile,
    u0MeasuredMv: 0,
    u1MeasuredMv: 116,
    u2MeasuredMv: 33,
    pumpPeakPressureMv: 118,
    ambientTemperatureMv: initialTemperatureMv,
    initialTemperatureMv,
    stableTemperatureMv: initialTemperatureMv,
    releaseTemperatureLowMv: initialTemperatureMv - 12,
    recoveryTemperatureMv: initialTemperatureMv,
  },
};
const profileAdjustedSample = captureHeatCapacityWorkbenchSample(
  profiledManualSampleSource,
  'stableBeforeReleaseSample',
  10_300,
);
assert.equal(profileAdjustedSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.pressureSignalMv, 116);
const profileAdjustedRecoverySample = captureHeatCapacityWorkbenchSample(
  {
    ...profileAdjustedSample,
    pressureSignalMv: 12,
    pressureSignalMvRaw: 12,
    pressureSignalMvDisplayed: 12,
    pressureSignalTargetMv: 12,
    temperatureSignalMv: initialTemperatureMv - 3,
    temperatureSignalTargetMv: initialTemperatureMv - 3,
  },
  'recoverySample',
  10_500,
);
assert.equal(profileAdjustedRecoverySample.heatCapacityProcessSamples.recoverySample?.pressureSignalMv, 33);
const guideDemoTeachingU1 = profileAdjustedSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.pressureSignalMv ?? Number.NaN;
const guideDemoTeachingU2 = profileAdjustedRecoverySample.heatCapacityProcessSamples.recoverySample?.pressureSignalMv ?? Number.NaN;
const guideDemoTeachingGamma = guideDemoTeachingU1 / (guideDemoTeachingU1 - guideDemoTeachingU2);
assert.equal(guideDemoTeachingU1 >= 105 && guideDemoTeachingU1 <= 130, true);
assert.equal(guideDemoTeachingGamma >= 1.36 && guideDemoTeachingGamma <= 1.44, true);
assert.equal(
  Math.abs(guideDemoTeachingU2 - guideDemoTeachingU1 * (1 - 1 / guideDemoTeachingGamma)) < 1e-9,
  true,
  'guide/demo teaching U2 fixture should preserve the same U1/U2 gamma relationship',
);
const manualActualSample = captureHeatCapacityWorkbenchSample(
  profiledManualSampleSource,
  'stableBeforeReleaseSample',
  10_300,
  { applyProfile: false },
);
assert.equal(manualActualSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.pressureSignalMv, 88, 'manual recording should preserve the current instrument reading instead of the profile U1');
assert.equal(manualActualSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.temperatureSignalMv, initialTemperatureMv + 6, 'manual recording should preserve the current temperature reading so unstable data is rejected upstream');

const recordedHeatCapacityTrials = [
  {
    id: 'heat-trial-1',
    trialIndex: 1,
    U1Mv: 106.2,
    U2Mv: 30.4,
    UT1Mv: 1499.1,
    UT2Mv: 1499,
    status: 'complete' as const,
    recordedU1At: 10_000,
    recordedU2At: 12_000,
  },
  {
    id: 'heat-trial-2',
    trialIndex: 2,
    U1Mv: 104.8,
    U2Mv: 31.1,
    UT1Mv: 1499,
    UT2Mv: 1499.1,
    status: 'complete' as const,
    recordedU1At: 20_000,
    recordedU2At: 22_000,
  },
];
const removedU2Record = removeHeatCapacityTrialRecord(recordedHeatCapacityTrials, 0, 'u2');
assert.equal(removedU2Record.nextActiveTrialIndex, 0);
assert.equal(removedU2Record.trials[0].U1Mv, 106.2);
assert.equal(removedU2Record.trials[0].UT1Mv, 1499.1);
assert.equal(removedU2Record.trials[0].U2Mv, null);
assert.equal(removedU2Record.trials[0].UT2Mv, null);
assert.equal(removedU2Record.trials[0].recordedU2At, null);
assert.equal(removedU2Record.trials[0].status, 'partial');
assert.equal(removedU2Record.trials[1].status, 'complete', 'removing one heat-capacity record should not delete later independent trial groups');

const removedU1Record = removeHeatCapacityTrialRecord(recordedHeatCapacityTrials, 0, 'u1');
assert.equal(removedU1Record.nextActiveTrialIndex, 0);
assert.equal(removedU1Record.trials[0].U1Mv, null);
assert.equal(removedU1Record.trials[0].UT1Mv, null);
assert.equal(removedU1Record.trials[0].U2Mv, null);
assert.equal(removedU1Record.trials[0].UT2Mv, null);
assert.equal(removedU1Record.trials[0].recordedU1At, null);
assert.equal(removedU1Record.trials[0].recordedU2At, null);
assert.equal(removedU1Record.trials[0].status, 'waiting');
assert.equal(removedU1Record.trials[1].U1Mv, 104.8, 'removing U1 from one group should keep later groups intact');

const rapidPumpSecondStroke = registerHeatCapacityPumpStroke({
  ...openValvePump,
  pumpBulbState: 'compressing',
}, 10_120);
assert.equal(rapidPumpSecondStroke.pumpStrokeCount, 2);
assert.equal(rapidPumpSecondStroke.pumpStrokeTimestamps.length, 2);
assert.equal(rapidPumpSecondStroke.pumpFrequency > openValvePump.pumpFrequency, true);
assert.equal(rapidPumpSecondStroke.pumpBulbState, 'compressing');

const rapidPumpThirdStroke = registerHeatCapacityPumpStroke({
  ...rapidPumpSecondStroke,
  pumpBulbState: 'releasing',
}, 10_240);
assert.equal(rapidPumpThirdStroke.pumpStrokeCount, 3);
assert.equal(rapidPumpThirdStroke.pumpStrokeTimestamps.length, 3);
assert.equal(rapidPumpThirdStroke.pumpFrequencyStatus, 'suitable');

const suitablePump = registerHeatCapacityPumpStroke({
  ...openValvePump,
  pumpStrokeTimestamps: [7_200, 8_400],
}, 10_000);
assert.equal(suitablePump.pumpFrequencyStatus, 'suitable');
assert.equal(suitablePump.pumpFrequency >= 0.5, true);
assert.equal(suitablePump.pressurePlaceholder > openValvePump.pressurePlaceholder, true);
assert.equal(suitablePump.pumpHint, '打气频率合适，可以继续观察压强变化');

assert.equal(HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG, 0);
assert.equal(HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG, 90);
assert.equal(normalizeHeatCapacityStopcockAngle(-90), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(0), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(9), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(44), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(45), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(84), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(85), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(90), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(95), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(96), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(134), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(135), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(180), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(270), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(315), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(350), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(360), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(normalizeHeatCapacityStopcockAngle(450), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);

assert.equal(getHeatCapacityStopcockTargetAngle(true), HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(getHeatCapacityStopcockTargetAngle(false), HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(getHeatCapacityStopcockState(0), 'closed');
assert.equal(getHeatCapacityStopcockState(44), 'closed');
assert.equal(getHeatCapacityStopcockState(84), 'closed');
assert.equal(getHeatCapacityStopcockState(85), 'open');
assert.equal(getHeatCapacityStopcockState(90), 'open');
assert.equal(getHeatCapacityStopcockState(95), 'open');
assert.equal(getHeatCapacityStopcockState(96), 'closed');
assert.equal(getHeatCapacityStopcockState(134), 'closed');
assert.equal(getHeatCapacityStopcockState(135), 'closed');
assert.equal(getHeatCapacityStopcockState(180), 'closed');
assert.equal(getHeatCapacityStopcockState(270), 'closed');
assert.equal(getHeatCapacityStopcockState(350), 'closed');

assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
}), true);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
}), false);
assert.equal(canZeroHeatCapacityPressure({
  ...defaultFile,
  powerOn: false,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
}), false);

const nearZeroFreeSensorState = {
  ...defaultFile.heatCapacityFreeSensorState,
  displayPressureMv: 0,
  pressureSlopeMvPerS: 0,
  pressureHistory: [
    { atS: 0, valueMv: 0 },
    { atS: 0.2, valueMv: 0 },
    { atS: 0.4, valueMv: 0 },
    { atS: 0.6, valueMv: 0 },
    { atS: 0.8, valueMv: 0 },
  ],
};
const passiveNearZeroFreeFile = stepHeatCapacityWorkbenchFile({
  ...defaultFile,
  powerOn: true,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeSensorState: nearZeroFreeSensorState,
  heatCapacityFreeCalibrationState: {
    ...defaultFile.heatCapacityFreeCalibrationState,
    zeroEvents: [],
  },
  pressureZeroDisplayedSamples: [
    { atMs: 10_000, valueMv: 0 },
    { atMs: 10_100, valueMv: 0 },
    { atMs: 10_200, valueMv: 0 },
    { atMs: 10_300, valueMv: 0 },
    { atMs: 10_400, valueMv: 0 },
  ],
  lastUpdateMs: 10_400,
}, 10_500);
assert.equal(
  passiveNearZeroFreeFile.pressureZeroed,
  false,
  'Free Mode must not enter zeroed state from near-zero passive samples without a user zero event',
);
const explicitZeroFreeFile = stepHeatCapacityWorkbenchFile({
  ...setHeatCapacityPressureZeroOffset(passiveNearZeroFreeFile, 0, 'fineWheel', 0, 10_600),
  heatCapacityFreeSensorState: nearZeroFreeSensorState,
  pressureZeroDisplayedSamples: [
    { atMs: 10_600, valueMv: 0 },
    { atMs: 10_700, valueMv: 0 },
    { atMs: 10_800, valueMv: 0 },
    { atMs: 10_900, valueMv: 0 },
    { atMs: 11_000, valueMv: 0 },
  ],
  lastUpdateMs: 11_000,
}, 11_100);
assert.equal(
  explicitZeroFreeFile.pressureZeroed,
  true,
  'Free Mode should enter zeroed state when near-zero samples belong to an explicit user zero event',
);

const restored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [{
    ...defaultFile,
    powerOn: true,
    stopcockAngleDeg: 359,
    glassPistonState: 'open',
    pressureZeroed: true,
    pressureSignalMv: 0,
    pressureReleaseBurstUntilMs: 123_456,
  }],
});

const restoredHeatFile = restored.files[0];
assert.equal(restoredHeatFile.kind, 'heatCapacity');
assert.equal(restoredHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(restoredHeatFile.glassPistonState, 'open');
assert.equal(restoredHeatFile.pressureZeroed, true);
assert.equal(restoredHeatFile.pressureSignalMv, 0);
assert.equal(restoredHeatFile.pressureReleaseBurstUntilMs, 123_456);
assert.equal(restoredHeatFile.heatCapacityFreeStopcockFlowPurpose, 'none');

const zeroingFlowRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [{
    ...defaultFile,
    heatCapacityFreeStopcockFlowOpen: true,
    heatCapacityFreeStopcockFlowPurpose: undefined,
  }],
});
const zeroingFlowHeatFile = zeroingFlowRestored.files[0];
assert.equal(zeroingFlowHeatFile.kind, 'heatCapacity');
assert.equal(
  zeroingFlowHeatFile.heatCapacityFreeStopcockFlowPurpose,
  'zeroing',
  'legacy Free session files with open stopcock flow and no U1 record should restore as zeroing flow',
);

const releaseFlowRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [{
    ...defaultFile,
    heatCapacityFreeStopcockFlowOpen: true,
    heatCapacityFreeStopcockFlowPurpose: undefined,
    heatCapacityFreeTrials: [{
      ...createHeatCapacityFreeTrial('session-release'),
      u1: normalizeHeatCapacityFreeRecordInput({
        atS: 300,
        displayPressureMv: 25,
        displayTemperatureMv: initialTemperatureMv,
        calibrationVersion: 1,
        zeroEventId: 'zero-1',
        phaseAtRecord: 'sealedStabilizing',
      }),
    }],
  }],
});
const releaseFlowHeatFile = releaseFlowRestored.files[0];
assert.equal(releaseFlowHeatFile.kind, 'heatCapacity');
assert.equal(
  releaseFlowHeatFile.heatCapacityFreeStopcockFlowPurpose,
  'release',
  'legacy Free session files with U1 but no U2 should restore open stopcock flow as release',
);

const legacyFile = { ...defaultFile } as Record<string, unknown>;
delete legacyFile.stopcockAngleDeg;
delete legacyFile.pressureZeroed;
delete legacyFile.temperatureSignalMv;
delete legacyFile.pressureSignalMv;

const legacyRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [legacyFile],
});

const legacyHeatFile = legacyRestored.files[0];
assert.equal(legacyHeatFile.kind, 'heatCapacity');
assert.equal(legacyHeatFile.powerOn, false);
assert.equal(legacyHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(legacyHeatFile.glassPistonState, 'closed');
assert.equal(legacyHeatFile.pressureZeroed, false);
assert.equal(legacyHeatFile.temperatureSignalMv, null);
assert.equal(legacyHeatFile.pressureSignalMv, null);
assert.equal(legacyHeatFile.pumpValveOpen, false);
assert.equal(legacyHeatFile.pumpFrequencyStatus, 'idle');
assert.deepEqual(legacyHeatFile.pumpStrokeTimestamps, []);
assert.equal(legacyHeatFile.pressureReleaseBurstUntilMs, null);

const invalidTimerPhysicsFile = {
  ...defaultFile,
  heatCapacityFreePhysicsState: {
    ...defaultFile.heatCapacityFreePhysicsState,
    lastPumpStrokeAtS: 'bad',
  },
};
const invalidTimerPhysicsRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [invalidTimerPhysicsFile],
});
const invalidTimerPhysicsRestoredFile = invalidTimerPhysicsRestored.files[0];
assert.equal(invalidTimerPhysicsRestoredFile.kind, 'heatCapacity');
assert.equal(
  invalidTimerPhysicsRestoredFile.heatCapacityFreePhysicsState.lastPumpStrokeAtS,
  null,
  'restoring Free physics should discard invalid timer anchors',
);

const legacyOpenFile = { ...defaultFile, stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG, glassPistonState: 'open' };
const legacyOpenRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [legacyOpenFile],
});
const legacyOpenHeatFile = legacyOpenRestored.files[0];
assert.equal(legacyOpenHeatFile.kind, 'heatCapacity');
assert.equal(legacyOpenHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(legacyOpenHeatFile.glassPistonState, 'open');

const legacyClosedFile = { ...defaultFile, stopcockAngleDeg: 90, glassPistonState: 'closed' };
const legacyClosedRestored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [legacyClosedFile],
});
const legacyClosedHeatFile = legacyClosedRestored.files[0];
assert.equal(legacyClosedHeatFile.kind, 'heatCapacity');
assert.equal(legacyClosedHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(legacyClosedHeatFile.glassPistonState, 'closed');

const workbenchSource = readFileSync(join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'), 'utf8');
assert.doesNotMatch(
  workbenchSource,
  /heatCapacityAutoDemoAnimationFrameRef|shouldCommitHeatCapacityAutoDemoAnimationFrame|heatCapacityAutoDemoAnimation\.ts/,
  'auto-demo reset and zero animations must not keep a Workbench-owned animation-frame state-write path',
);
assert.doesNotMatch(
  workbenchSource,
  /animateHeatCapacity(?:PressureZero|DefaultReset)[\s\S]*window\.requestAnimationFrame/,
  'auto-demo pressure-zero and reset actions should commit logical state once instead of driving Workbench state through RAF',
);
assert.match(
  workbenchSource,
  /manualRollbackAnimation=\{manualHeatCapacityRollback\?\.animation \?\? null\}/,
  'guide-mode rollback animation should remain a scene-local visual path rather than a high-frequency Workbench state update',
);

console.log('workbenchHeatCapacityInstrument tests passed');
