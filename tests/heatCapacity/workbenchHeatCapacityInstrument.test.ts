import assert from 'node:assert/strict';
import {
  adjustHeatCapacityPressureZeroCoarse,
  adjustHeatCapacityPressureZeroFine,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  applyHeatCapacityPressureZero,
  canZeroHeatCapacityPressure,
  captureHeatCapacityWorkbenchSample,
  createDefaultHeatCapacityFile,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
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
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS,
  completeHeatCapacityTeachingModeWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  enterHeatCapacityFreeModeWorkbenchState,
  exitHeatCapacityTeachingModeWorkbenchState,
  getHeatCapacityFreeEquilibriumSpeedMultiplier,
  getActiveHeatCapacityFreeTrialIndex,
  getHeatCapacityFreeRecordDisplayTrialIndex,
  getHeatCapacityFreeRecordButtonState,
  isHeatCapacityPressureZeroWithinTolerance,
  isHeatCapacityFreeEquilibriumSpeedAvailable,
  registerHeatCapacityPumpStroke,
  recordHeatCapacityFreeTraceEventWithReference,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchState,
  restartCurrentHeatCapacityFreeExperimentWorkbenchState,
  normalizeHeatCapacityStopcockAngle,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  selectActiveHeatCapacityFreeDomain,
  selectHeatCapacityFreeDomain,
  selectActiveHeatCapacityWorkbenchDisplay,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityPressureZeroOffset,
  startHeatCapacityGuideWorkbenchState,
  prepareNextHeatCapacityFreeExperimentWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_VIDEO_PROFILE,
} from '../../src/domain/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  createHeatCapacityAutoDemoSteps,
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  calculateHeatCapacityGammaFromDisplayedSignals,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  advanceHeatCapacityReleaseState,
  beginHeatCapacityReleaseOpening,
} from '../../src/domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  getHeatCapacityHardSphereVisualState,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  deriveFreePhysicalState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../src/domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import { mapTemperatureKToSignalMv } from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';
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
const workbenchHeatCapacityStateTypesSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityStateTypes.ts'),
  'utf8',
);
const initialTemperatureMv = DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient;

assert.equal(defaultFile.powerOn, false);
assert.equal(defaultFile.heatCapacityMode, 'free');
assert.equal(defaultFile.heatCapacityFreeRuntimeVersion, HEAT_CAPACITY_FREE_RUNTIME_VERSION);
assert.deepEqual(defaultFile.heatCapacityFreeInstrumentConfig.environment, {
  ambientTemperatureK: 298.15,
  ambientPressureKPa: 101.3,
});
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.vesselVolumeL, 2);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.pumpAmountGainRatio, 0.00334);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.pumpWorkRetention, 0.3);
assert.equal('pumpInflowTemperatureRiseK' in defaultFile.heatCapacityFreeInstrumentConfig.physics, false);
assert.ok(
  Math.abs(
    defaultFile.heatCapacityFreeInstrumentConfig.physics.pumpAmountGainRatio *
      defaultFile.heatCapacityFreeInstrumentConfig.physics.vesselVolumeL *
      1000 -
      6.68,
  ) < 1e-9,
  'Free Mode should model the calibrated 6.68 mL effective gas per pump stroke in a 2 L vessel',
);
assert.equal(defaultFile.heatCapacityFreeInstrumentState.physics.gasAmountRatio, 1);
assert.equal(defaultFile.heatCapacityFreeInstrumentState.physics.gasTemperatureK, 298.15);
assert.equal(defaultFile.heatCapacityFreeInstrumentState.physics.wallTemperatureK, 298.15);
assert.equal(defaultFile.heatCapacityFreeInstrumentState.physics.lastPumpStrokeAtS, null);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.thermal.gasWallConductanceWPerK, 0.08);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.thermal.wallAmbientConductanceWPerK, 0.45);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.physics.thermal.wallHeatCapacityJPerK, 45);
assert.deepEqual(defaultFile.heatCapacityFreeInstrumentConfig.physics.leakage, {
  enabled: true,
  ratePerS: 0.00005,
});
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.sensor.lagRate, 8);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.sensor.minSampleIntervalS, 0.08);
assert.equal(defaultFile.heatCapacityFreeInstrumentConfig.sensor.maxSampleIntervalS, 0.12);
assert.equal(defaultFile.heatCapacityReleaseState.phase, 'closed');
assert.equal(defaultFile.heatCapacityReleaseState.purpose, 'none');
assert.deepEqual(HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS, [2, 4, 8, 16]);
assert.equal(HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER, 8);
assert.equal(defaultFile.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.notEqual(
  defaultFile.heatCapacityFreeInstrumentState.sensor.displayPressureMv,
  0,
  'Free pressure sensor should start with a deterministic non-zero zeroing bias',
);
assert.equal(
  defaultFile.heatCapacityFreeInstrumentState.sensor.displayPressureMv,
  defaultFile.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv,
  'Free sensor display should expose the same initial pressure bias used by its sensor model',
);
assert.equal(
  defaultFile.heatCapacityFreeInstrumentState.sensor.displayTemperatureMv,
  defaultFile.heatCapacityFreeInstrumentConfig.sensor.temperatureMvAtAmbient,
);
assert.equal(defaultFile.heatCapacityFreeInstrumentState.calibration.calibrationVersion, 0);
assert.deepEqual(defaultFile.heatCapacityFreeRunWorkspace.trials, []);
assert.equal(defaultFile.heatCapacityFreeRealDomain.trials.length, 0);
assert.equal(defaultFile.heatCapacityFreeIdealDomain.trials.length, 0);
assert.equal(selectHeatCapacityFreeDomain(defaultFile, 'real').scheme, 'real');
assert.equal(selectHeatCapacityFreeDomain(defaultFile, 'ideal').scheme, 'ideal');
assert.equal(selectActiveHeatCapacityFreeDomain(defaultFile).scheme, 'real');
const idealSelected = setHeatCapacityFreeParameterSchemeWorkbenchState(defaultFile, 'ideal', 1_000);
assert.equal(idealSelected.heatCapacityFreeParameterScheme, 'ideal');
assert.equal(idealSelected.heatCapacityFreeDisplayScheme, 'ideal');
assert.equal(selectActiveHeatCapacityFreeDomain(idealSelected).scheme, 'ideal');
assert.equal(idealSelected.heatCapacityFreeRealDomain.trials.length, 0);
const realSelectedAgain = setHeatCapacityFreeParameterSchemeWorkbenchState(idealSelected, 'real', 1_100);
assert.equal(realSelectedAgain.heatCapacityFreeParameterScheme, 'real');
assert.equal(realSelectedAgain.heatCapacityFreeDisplayScheme, 'real');
assert.equal(selectActiveHeatCapacityFreeDomain(realSelectedAgain).scheme, 'real');
assert.equal(realSelectedAgain.heatCapacityFreeIdealDomain.trials.length, 0);
const poweredIdeal = powerHeatCapacityWorkbenchFile(
  configureHeatCapacityFreeBatchWorkbenchState(idealSelected, 3, 1_190),
  true,
  1_200,
);
assert.equal(poweredIdeal.heatCapacityFreeParameterScheme, 'ideal');
assert.equal(poweredIdeal.heatCapacityFreeRealDomain.physicsState.simulationTimeS, 0);
assert.equal(poweredIdeal.heatCapacityFreeRealDomain.traceStore.traceTrials.length, 0);
assert.equal(poweredIdeal.heatCapacityFreeIdealDomain.traceStore.traceTrials.length > 0, true);
assert.equal(poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.gamma, 1.4);
const idealFastProcessHotState = {
  ...poweredIdeal.heatCapacityFreeIdealDomain.physicsState,
  simulationTimeS: 0,
  gasTemperatureK: poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientTemperatureK + 10,
  internalEnergyJ:
    poweredIdeal.heatCapacityFreeIdealDomain.physicsState.internalEnergyJ! *
    (poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientTemperatureK + 10) /
    poweredIdeal.heatCapacityFreeIdealDomain.physicsState.gasTemperatureK,
  wallTemperatureK: poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientTemperatureK,
  pumpProcesses: [
    {
      startedAtS: 0,
      strength: 0,
      appliedProgress: 0,
    },
  ],
};
const idealFastProcessStep = stepHeatCapacityWorkbenchFile({
  ...poweredIdeal,
  lastUpdateMs: 1_200,
  heatCapacityFreeInstrumentState: {
    ...poweredIdeal.heatCapacityFreeInstrumentState,
    physics: idealFastProcessHotState,
  },
  heatCapacityFreeIdealDomain: {
    ...poweredIdeal.heatCapacityFreeIdealDomain,
    physicsState: idealFastProcessHotState,
  },
}, 1_240);
assert.equal(
  Math.abs(
    idealFastProcessStep.heatCapacityFreeIdealDomain.physicsState.gasTemperatureK -
      idealFastProcessHotState.gasTemperatureK,
  ) < 0.000001,
  true,
  'ideal Free runtime should keep active fast processes adiabatic',
);
const idealReleaseTargetU1Mv = 120;
const idealReleasePressureDeltaKPa = idealReleaseTargetU1Mv /
  poweredIdeal.heatCapacityFreeIdealDomain.sensorConfig.pressureMvPerKPa;
const idealReleaseStartAmountRatio = 1 + idealReleasePressureDeltaKPa /
  poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientPressureKPa;
const idealReleaseStartState = {
  ...poweredIdeal.heatCapacityFreeIdealDomain.physicsState,
  simulationTimeS: 0,
  gasAmountRatio: idealReleaseStartAmountRatio,
  amountMol:
    poweredIdeal.heatCapacityFreeIdealDomain.physicsState.referenceAmountMol! *
    idealReleaseStartAmountRatio,
  internalEnergyJ:
    poweredIdeal.heatCapacityFreeIdealDomain.physicsState.internalEnergyJ! *
    idealReleaseStartAmountRatio,
  gasTemperatureK: poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientTemperatureK,
  wallTemperatureK: poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientTemperatureK,
  lastStopcockOpenedAtS: 0,
  lastStopcockClosedAtS: null,
  releaseStarted: true,
  releaseReference: {
    pressureBeforeKPa:
      poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientPressureKPa +
        idealReleasePressureDeltaKPa,
    temperatureBeforeK: poweredIdeal.heatCapacityFreeIdealDomain.physicsConfig.environment.ambientTemperatureK,
    amountBeforeRatio: idealReleaseStartAmountRatio,
    openedAtS: 0,
    reachedAmbientAtS: null,
  },
};
const idealReleaseTrial = {
  ...createHeatCapacityFreeTrial('ideal-release-trial', null, 'ideal'),
  u0: normalizeHeatCapacityFreeRecordInput({
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: poweredIdeal.heatCapacityFreeIdealDomain.sensorConfig.temperatureMvAtAmbient,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }),
  u1: normalizeHeatCapacityFreeRecordInput({
    atS: 1,
    displayPressureMv: idealReleaseTargetU1Mv,
    displayTemperatureMv: poweredIdeal.heatCapacityFreeIdealDomain.sensorConfig.temperatureMvAtAmbient,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }),
};
const idealReleaseStartedAtMs = 1_200;
const idealReleaseClosedAtMs = idealReleaseStartedAtMs +
  HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000;
const idealReleaseOpen = stepHeatCapacityWorkbenchFile({
  ...poweredIdeal,
  lastUpdateMs: idealReleaseStartedAtMs,
  heatCapacityFreeInstrumentState: {
    ...poweredIdeal.heatCapacityFreeInstrumentState,
    physics: idealReleaseStartState,
  },
  heatCapacityReleaseState: {
    ...poweredIdeal.heatCapacityReleaseState,
    phase: 'releasing',
    purpose: 'release',
    attemptId: 1,
    openingStartedAtS: idealReleaseStartState.simulationTimeS,
    openingCompletedAtS: idealReleaseStartState.simulationTimeS,
    formedRelease: true,
  },
  heatCapacityFreeRunWorkspace: {
    ...poweredIdeal.heatCapacityFreeRunWorkspace,
    trials: [idealReleaseTrial],
  },
  heatCapacityFreeIdealDomain: {
    ...poweredIdeal.heatCapacityFreeIdealDomain,
    physicsState: idealReleaseStartState,
    releaseState: {
      ...poweredIdeal.heatCapacityReleaseState,
      phase: 'releasing',
      purpose: 'release',
      attemptId: 1,
      openingStartedAtS: idealReleaseStartState.simulationTimeS,
      openingCompletedAtS: idealReleaseStartState.simulationTimeS,
      formedRelease: true,
    },
    trials: [idealReleaseTrial],
  },
}, idealReleaseClosedAtMs);
const idealReleaseClosedState = {
  ...idealReleaseOpen.heatCapacityFreeIdealDomain.physicsState,
  lastStopcockClosedAtS: idealReleaseOpen.heatCapacityFreeIdealDomain.physicsState.simulationTimeS,
};
const idealReleaseRecovered = stepHeatCapacityWorkbenchFile({
  ...idealReleaseOpen,
  lastUpdateMs: idealReleaseClosedAtMs,
  heatCapacityFreeInstrumentState: {
    ...idealReleaseOpen.heatCapacityFreeInstrumentState,
    physics: idealReleaseClosedState,
  },
  heatCapacityReleaseState: {
    ...idealReleaseOpen.heatCapacityReleaseState,
    phase: 'closedAfterRelease',
    closeCommandAtS: idealReleaseOpen.heatCapacityFreeIdealDomain.physicsState.simulationTimeS,
    closingCompletedAtS: idealReleaseOpen.heatCapacityFreeIdealDomain.physicsState.simulationTimeS,
  },
  heatCapacityFreeIdealDomain: {
    ...idealReleaseOpen.heatCapacityFreeIdealDomain,
    physicsState: idealReleaseClosedState,
    releaseState: {
      ...idealReleaseOpen.heatCapacityReleaseState,
      phase: 'closedAfterRelease',
      closeCommandAtS: idealReleaseOpen.heatCapacityFreeIdealDomain.physicsState.simulationTimeS,
      closingCompletedAtS: idealReleaseOpen.heatCapacityFreeIdealDomain.physicsState.simulationTimeS,
    },
  },
}, idealReleaseClosedAtMs + 300_000);
const idealRecoveredPhysical = deriveFreePhysicalState(
  idealReleaseRecovered.heatCapacityFreeIdealDomain.physicsState,
  idealReleaseRecovered.heatCapacityFreeIdealDomain.physicsConfig,
);
const idealRecoveredU2Mv = idealRecoveredPhysical.pressureDeltaKPa *
  idealReleaseRecovered.heatCapacityFreeIdealDomain.sensorConfig.pressureMvPerKPa;
assert.equal(
  idealRecoveredU2Mv > 30 && idealRecoveredU2Mv < 36,
  true,
  'ideal release should stay adiabatic until the stopcock closes so recovered U2 remains near the 1.4 result',
);
const switchAfterIdealStart = setHeatCapacityFreeParameterSchemeWorkbenchState(poweredIdeal, 'real', 1_300);
assert.equal(switchAfterIdealStart.heatCapacityFreeParameterScheme, 'ideal');
for (const freeRuntimeState of [
  defaultFile.heatCapacityFreeInstrumentState.physics,
  defaultFile.heatCapacityFreeInstrumentState.sensor,
  defaultFile.heatCapacityFreeInstrumentState.calibration,
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
  workbenchHeatCapacityStateTypesSource,
  /import type \{ HeatCapacityTeachingProfile \}/,
  'the heat-capacity state type boundary should import the teaching-specific profile boundary',
);
assert.match(
  workbenchHeatCapacityStateTypesSource,
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
assert.equal(defaultFile.pressureSignalRawReadoutMv, 0);
assert.equal(defaultFile.pressureSignalReadoutMv, 0);
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
  source: 'guide',
  pressureMv: 12.5,
  temperatureMv: 1499.8,
});
assert.deepEqual(selectActiveHeatCapacityWorkbenchDisplay({
  ...defaultFile,
  heatCapacityMode: 'free',
  pressureSignalMv: 12.5,
  temperatureSignalMv: 1499.8,
  heatCapacityFreeInstrumentState: {
    ...defaultFile.heatCapacityFreeInstrumentState,
    sensor: {
      ...defaultFile.heatCapacityFreeInstrumentState.sensor,
      displayPressureMv: 45.6,
      displayTemperatureMv: 1498.7,
    },
  },
}), {
  source: 'free',
  pressureMv: 45.6,
  temperatureMv: 1498.7,
});
const freeTrial = createHeatCapacityFreeTrial('free-keep');
const enteredFree = enterHeatCapacityFreeModeWorkbenchState({
  ...defaultFile,
  heatCapacityMode: 'guide',
  heatCapacityGuideTrial: startHeatCapacityGuideWorkbenchState(defaultFile, 1_000).heatCapacityGuideTrial,
  heatCapacityFreeRunWorkspace: {
    ...defaultFile.heatCapacityFreeRunWorkspace,
    trials: [freeTrial],
  },
  heatCapacityFreeInstrumentState: {
    ...defaultFile.heatCapacityFreeInstrumentState,
    physics: {
      ...defaultFile.heatCapacityFreeInstrumentState.physics,
      gasAmountRatio: 1.2,
      pumpStrokeCount: 4,
    },
    calibration: {
      ...defaultFile.heatCapacityFreeInstrumentState.calibration,
      calibrationVersion: 3,
      zeroOffsetMv: 0.44,
    },
  },
}, 2_000);
assert.equal(enteredFree.heatCapacityMode, 'free');
assert.equal(enteredFree.heatCapacityFreeInstrumentState.physics.gasAmountRatio, 1, 'entering Free should reset physical runtime');
assert.equal(enteredFree.heatCapacityFreeInstrumentState.calibration.calibrationVersion, 0, 'entering Free should reset calibration runtime');
assert.deepEqual(enteredFree.heatCapacityFreeRunWorkspace.trials, [freeTrial], 'entering Free must preserve existing Free trials');
assert.equal(enteredFree.powerOn, false);
assert.equal(enteredFree.runState, 'idle');
assert.equal(enteredFree.heatCapacityPhase, 'powerOff');
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
  heatCapacityReleaseState: {
    ...defaultFile.heatCapacityReleaseState,
    phase: 'opening',
    purpose: 'release',
    attemptId: 1,
    phaseStartedAtS: 1,
    openingStartedAtS: 1,
  },
  heatCapacityFreeEquilibriumSpeedMultiplier: 8,
  heatCapacityFreeRunWorkspace: {
    ...enteredFree.heatCapacityFreeRunWorkspace,
    trials: [freeTrial],
  },
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
assert.equal(resetFreeRun.heatCapacityReleaseState.phase, 'closed');
assert.equal(resetFreeRun.heatCapacityReleaseState.purpose, 'none');
assert.equal(resetFreeRun.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.deepEqual(resetFreeRun.heatCapacityFreeInstrumentConfig.physics.leakage, {
  enabled: true,
  ratePerS: 0.00005,
});
assert.deepEqual(resetFreeRun.heatCapacityFreeRunWorkspace.trials, []);
assert.deepEqual(
  resetFreeRun.heatCapacityFreeRunWorkspace.traceStore.traceTrials,
  [],
  'Free reset should discard the current incomplete trace when no official group was completed',
);
assert.equal('heatCapacityProcessingCalculated' in resetFreeRun, false);
assert.equal(resetFreeRun.pressureSignalMv, null);
assert.equal(resetFreeRun.temperatureSignalMv, null);
assert.equal(resetFreeRun.pressureKPa, null);
const customAmbientTemperatureK = 303.15;
const customAmbientFile = createDefaultHeatCapacityFile(91);
const configuredCustomAmbientFile = applyHeatCapacityFreeParameterDraftWorkbenchState(
  customAmbientFile,
  {
    ...customAmbientFile.heatCapacityFreeParameterDraft,
    ambientTemperatureK: customAmbientTemperatureK,
  },
);
assert.equal(
  configuredCustomAmbientFile.heatCapacityFreeInstrumentConfig.physics.environment.ambientTemperatureK,
  customAmbientTemperatureK,
  'the public parameter path should install the custom ambient temperature before reset',
);
assert.equal(
  configuredCustomAmbientFile.heatCapacityFreeInstrumentConfig.sensor.temperatureMvAtAmbient,
  mapTemperatureKToSignalMv(customAmbientTemperatureK),
  'the public parameter path should raise the equilibrium voltage with ambient temperature',
);
const resetCustomAmbientFreeRun = resetHeatCapacityFreeRunWorkbenchState(
  configuredCustomAmbientFile,
  3_100,
);
assert.equal(
  resetCustomAmbientFreeRun.heatCapacityFreeInstrumentState.physics.gasTemperatureK,
  customAmbientTemperatureK,
  'Free reset should initialize gas temperature from the active ambient parameter',
);
assert.equal(
  resetCustomAmbientFreeRun.heatCapacityFreeInstrumentState.physics.wallTemperatureK,
  customAmbientTemperatureK,
  'Free reset should initialize wall temperature from the active ambient parameter',
);
assert.equal(
  resetCustomAmbientFreeRun.heatCapacityFreeInstrumentState.sensor.sensorTemperatureK,
  customAmbientTemperatureK,
  'Free reset should explicitly initialize the independent temperature sensor at ambient',
);
assert.equal(
  resetCustomAmbientFreeRun.heatCapacityFreeInstrumentState.sensor.displayTemperatureMv,
  mapTemperatureKToSignalMv(customAmbientTemperatureK),
  'Free reset should expose the higher ambient temperature as a higher equilibrium voltage',
);
const demoModeStep = stepHeatCapacityWorkbenchFile({
  ...defaultFile,
  heatCapacityMode: 'demo',
  powerOn: true,
  lastUpdateMs: 0,
  heatCapacityFreeInstrumentConfig: {
    ...defaultFile.heatCapacityFreeInstrumentConfig,
    physics: {
      ...defaultFile.heatCapacityFreeInstrumentConfig.physics,
      leakage: {
        enabled: true,
        ratePerS: 0.02,
      },
    },
  },
  heatCapacityFreeInstrumentState: {
    ...defaultFile.heatCapacityFreeInstrumentState,
    physics: {
      ...defaultFile.heatCapacityFreeInstrumentState.physics,
      simulationTimeS: 12,
      gasAmountRatio: 1.2,
      gasTemperatureK: 320,
    },
  },
}, 60_000);
assert.equal(
  demoModeStep.heatCapacityFreeInstrumentState.physics.gasAmountRatio,
  1.2,
  'demo mode must not advance Free micro-leak physics',
);
assert.equal(
  demoModeStep.heatCapacityFreeInstrumentState.physics.simulationTimeS,
  12,
  'demo mode must keep Free physics time unchanged',
);
const guideModeReset = startHeatCapacityGuideWorkbenchState(defaultFile, 0);
assert.equal(guideModeReset.heatCapacityGuideTrial?.source, 'guide');
assert.equal(guideModeReset.heatCapacityGuideWorkflow.step, 'powerRequired');
assert.equal(guideModeReset.runState, 'idle', 'a fresh Guide session should remain idle until the allowed power-on action');
const guideModeStep = stepHeatCapacityWorkbenchFile({
  ...guideModeReset,
  powerOn: true,
  lastUpdateMs: 0,
}, 60_000);
assert.equal(
  guideModeStep.heatCapacityGuidePhysicsState.simulationTimeS > guideModeReset.heatCapacityGuidePhysicsState.simulationTimeS,
  true,
  'guide mode should advance the Guide runtime',
);
assert.equal(
  guideModeStep.heatCapacityFreeInstrumentState.physics.simulationTimeS,
  guideModeReset.heatCapacityFreeInstrumentState.physics.simulationTimeS,
  'guide mode must not advance Free runtime',
);
assert.equal(
  guideModeStep.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId,
  null,
  'guide mode should not create Free trace artifacts while stepping Guide runtime',
);
const freePowered = powerHeatCapacityWorkbenchFile(
  configureHeatCapacityFreeBatchWorkbenchState(defaultFile, 3, 990),
  true,
  1_000,
);
const getFreeTraceEventTypes = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeEventType[] => {
  const activeTrace = file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
    traceTrial.id === file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId
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
  const activeTrace = file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
    traceTrial.id === file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId
  ));
  const activeBranch = activeTrace?.branches.find((branch) => branch.id === activeTrace.activeBranchId);
  return activeBranch?.samples.length ?? 0;
};
assert.equal(
  getFreeTraceEventTypes(freePowered).includes('power-on'),
  true,
  'Free power-on should create a hidden trace event',
);
const freePumpReady = setHeatCapacityFreePumpValveOpen(freePowered, true, 1_100);
assert.equal(freePumpReady.heatCapacityFreeInstrumentState.physics.lastPumpValveOpenedAtS, 0.1);
assert.equal(freePumpReady.heatCapacityFreeInstrumentState.physics.lastPumpValveClosedAtS, null);
assert.equal(freePumpReady.heatCapacityFreeInstrumentState.physics.currentPumpValveOpenDurationS, 0);
const freePumped = registerHeatCapacityPumpStroke(freePumpReady, 1_200);
assert.equal(
  getFreeTraceEventTypes(freePumped).includes('pump-stroke'),
  true,
  'Free pump stroke should create a hidden trace event',
);
assert.equal(freePumped.heatCapacityFreeInstrumentState.physics.lastPumpStrokeAtS, 0.2);
assert.equal(freePumped.pumpFrequencyStatus, 'tooSlow');
assert.equal(freePumped.heatCapacityFreeRollbackSnapshots.beforePump?.powerOn, true);
assert.equal(freePumped.heatCapacityFreeRollbackSnapshots.beforePump?.pumpValveOpen, true);
assert.equal(freePumped.heatCapacityFreeRollbackSnapshots.beforePump?.pumpStrokeCount, 0);
assert.equal(
  freePumped.heatCapacityFreeRollbackSnapshots.beforePump?.heatCapacityFreePhysicsState.pumpStrokeCount,
  0,
  'the first accepted Free pump stroke must capture the actual pre-stroke physical state',
);
const migratedFreeSamplingFile = stepHeatCapacityWorkbenchFile({
  ...freePowered,
  heatCapacityFreeInstrumentConfig: {
    ...freePowered.heatCapacityFreeInstrumentConfig,
    sensor: {
      ...freePowered.heatCapacityFreeInstrumentConfig.sensor,
      lagRate: 3,
      minSampleIntervalS: 0.2,
      maxSampleIntervalS: 0.6,
    },
  },
}, 1_260);
assert.equal(
  migratedFreeSamplingFile.heatCapacityFreeInstrumentConfig.sensor.lagRate,
  3,
  'existing Free files should preserve configured sensor lag while migrating denser sampling intervals',
);
assert.equal(
  migratedFreeSamplingFile.heatCapacityFreeInstrumentConfig.sensor.minSampleIntervalS,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.minSampleIntervalS,
);
assert.equal(
  migratedFreeSamplingFile.heatCapacityFreeInstrumentConfig.sensor.maxSampleIntervalS,
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
assert.equal(invalidSpeedFallback.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
const speedOneFallback = setHeatCapacityFreeEquilibriumSpeedMultiplier(freePowered, 1, 1_055);
assert.equal(speedOneFallback.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
const selectedSpeedEight = setHeatCapacityFreeEquilibriumSpeedMultiplier(freePowered, 8, 1_060);
assert.equal(selectedSpeedEight.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.equal(selectedSpeedEight.updatedAt, 1_060);
const selectedSpeedSixteen = setHeatCapacityFreeEquilibriumSpeedMultiplier(freePowered, 16, 1_065);
assert.equal(selectedSpeedSixteen.heatCapacityFreeEquilibriumSpeedMultiplier, 16);
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
const freeRecordTraceTrial = freeRecordTraceEvent.file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
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
const traceTrialIdForBranchTest = freePumped.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId;
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
    u0Source: 'recorded' as const,
    formulaGamma: 1.4,
    preheatBiasGamma: 0,
    gamma: 1.4,
  },
};
const branchRollbackFile = removeHeatCapacityFreeTrialRecordWorkbenchState({
  ...freePumped,
  heatCapacityFreeRunWorkspace: {
    ...freePumped.heatCapacityFreeRunWorkspace,
    trials: [traceLinkedCompleteTrial],
  },
}, 0, 'u1', 1_500);
assert.notEqual(branchRollbackFile.heatCapacityFreeRunWorkspace.trials[0].u0, null);
assert.equal(branchRollbackFile.heatCapacityFreeRunWorkspace.trials[0].u1, null);
assert.equal(branchRollbackFile.heatCapacityFreeRunWorkspace.trials[0].u2, null);
assert.equal(branchRollbackFile.heatCapacityFreeRunWorkspace.trials[0].branchCount, 2);
const branchRollbackTrace = branchRollbackFile.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === traceTrialIdForBranchTest
));
assert.notEqual(branchRollbackTrace, undefined);
assert.equal(branchRollbackTrace!.branches.some((branch) => branch.status === 'archived'), true);
assert.equal(branchRollbackTrace!.branches.some((branch) => branch.status === 'main' && branch.parentBranchId === 'branch-1'), true);
const completedPowerOnReset = resetHeatCapacityFreeRunWorkbenchState({
  ...freePumped,
  heatCapacityFreeRunWorkspace: {
    ...freePumped.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed',
    trials: [traceLinkedCompleteTrial],
  },
}, 1_600);
assert.equal(
  completedPowerOnReset.heatCapacityFreeRunWorkspace.trials.length,
  0,
  'Reset before power-off should discard even a U0/U1/U2-complete Free group because it has not been ended',
);
assert.equal(
  completedPowerOnReset.heatCapacityFreeRunWorkspace.traceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialIdForBranchTest),
  false,
  'Reset before power-off should discard the current complete-but-unended Free trace',
);
assert.equal(
  completedPowerOnReset.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId,
  null,
  'Reset after discarding an unended Free group should leave the next group blank until the next user action',
);
const completedPowerOffPrepared = powerHeatCapacityWorkbenchFile({
  ...freePumped,
  heatCapacityFreeRunWorkspace: {
    ...freePumped.heatCapacityFreeRunWorkspace,
    currentExperimentStatus: 'completed',
    trials: [traceLinkedCompleteTrial],
  },
}, false, 1_650);
assert.equal(completedPowerOffPrepared.powerOn, false);
assert.equal(completedPowerOffPrepared.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'completed');
assert.equal(completedPowerOffPrepared.heatCapacityFreeRunWorkspace.trials.length, 1);
assert.equal(completedPowerOffPrepared.heatCapacityFreeRunWorkspace.trials[0].id, traceLinkedCompleteTrial.id);
assert.equal(
  completedPowerOffPrepared.heatCapacityFreeRunWorkspace.trials[0].completedAtMs,
  1_650,
  'Powering off after U2 should stamp the saved Free group completion time',
);
assert.equal(
  completedPowerOffPrepared.heatCapacityFreeRunWorkspace.traceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialIdForBranchTest),
  true,
  'Powering off after U2 should auto-save the completed Free group trace',
);
assert.equal(completedPowerOffPrepared.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId, null);
assert.equal(getActiveHeatCapacityFreeTrialIndex(completedPowerOffPrepared), -1);
assert.equal(
  getHeatCapacityFreeRecordDisplayTrialIndex(completedPowerOffPrepared),
  0,
  'Powering off after U2 should keep the completed Free group visible for review',
);
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(completedPowerOffPrepared, 'u0'),
  { visible: false, mode: 'record', disabledReason: 'invalid-sequence' },
  'Auto-saved Free history should not remain as a current re-record target',
);
const switchSchemeAfterCompletedHistory = setHeatCapacityFreeParameterSchemeWorkbenchState(
  completedPowerOffPrepared,
  'ideal',
  1_680,
);
assert.equal(
  switchSchemeAfterCompletedHistory.heatCapacityFreeParameterScheme,
  'real',
  'A started batch must keep one parameter scheme across all retained groups',
);
assert.equal(
  switchSchemeAfterCompletedHistory.heatCapacityFreeRealDomain.trials.length,
  1,
  'The retained real-domain group must remain in the active locked batch',
);
assert.equal(
  switchSchemeAfterCompletedHistory.heatCapacityFreeIdealDomain.trials.length,
  0,
  'A locked batch must not silently switch into the ideal-domain run',
);
const completedPowerOnNextSeed = powerHeatCapacityWorkbenchFile(
  prepareNextHeatCapacityFreeExperimentWorkbenchState(completedPowerOffPrepared, 1_690),
  true,
  1_690,
);
assert.equal(getActiveHeatCapacityFreeTrialIndex(completedPowerOnNextSeed), -1);
assert.equal(
  getHeatCapacityFreeRecordDisplayTrialIndex(completedPowerOnNextSeed),
  -1,
  'Opening power for the next Free group should switch the current-record display to the blank new group',
);
assert.equal(completedPowerOnNextSeed.heatCapacityFreeInstrumentState.physics.pumpStrokeCount, 0);
assert.equal(completedPowerOnNextSeed.heatCapacityFreeInstrumentState.physics.releaseStarted, false);
assert.equal(completedPowerOnNextSeed.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(completedPowerOnNextSeed.pumpValveOpen, false);
const completedResetOnce = restartCurrentHeatCapacityFreeExperimentWorkbenchState(completedPowerOffPrepared, 1_700);
const completedResetTwice = restartCurrentHeatCapacityFreeExperimentWorkbenchState(completedResetOnce, 1_700);
assert.equal(completedResetTwice.heatCapacityFreeRunWorkspace.trials.length, 1);
assert.equal(
  completedResetTwice.heatCapacityFreeRunWorkspace.traceStore.traceTrials.length,
  completedResetOnce.heatCapacityFreeRunWorkspace.traceStore.traceTrials.length,
  'Repeated Reset on a blank next group should not create or delete trace trials',
);
const nextIncompleteTraceFile = recordHeatCapacityFreeTraceEventWithReference(
  completedResetOnce,
  'pump-stroke',
  1_800,
  { pumpStrokeCount: 1 },
).file;
const nextIncompleteTraceTrialId = nextIncompleteTraceFile.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId;
assert.notEqual(nextIncompleteTraceTrialId, null);
const incompleteNextTrial = {
  ...createHeatCapacityFreeTrial('free-incomplete-after-complete'),
  traceTrialId: nextIncompleteTraceTrialId,
  branchCount: 1,
  u0: traceLinkedCompleteTrial.u0,
};
const resetIncompleteNext = resetHeatCapacityFreeRunWorkbenchState({
  ...nextIncompleteTraceFile,
  heatCapacityFreeRunWorkspace: {
    ...nextIncompleteTraceFile.heatCapacityFreeRunWorkspace,
    trials: [traceLinkedCompleteTrial, incompleteNextTrial],
  },
}, 1_900);
assert.equal(resetIncompleteNext.heatCapacityFreeRunWorkspace.trials.length, 1);
assert.equal(resetIncompleteNext.heatCapacityFreeRunWorkspace.trials[0].id, traceLinkedCompleteTrial.id);
assert.equal(
  resetIncompleteNext.heatCapacityFreeRunWorkspace.traceStore.traceTrials.some((traceTrial) => traceTrial.id === traceTrialIdForBranchTest),
  true,
  'Reset of an incomplete next group should preserve older completed trace data',
);
assert.equal(
  resetIncompleteNext.heatCapacityFreeRunWorkspace.traceStore.traceTrials.some((traceTrial) => traceTrial.id === nextIncompleteTraceTrialId),
  false,
  'Reset of an incomplete next group should delete only the current incomplete trace',
);
assert.equal(freePumped.heatCapacityMode, 'free');
assert.equal(freePumped.heatCapacityFreeInstrumentState.physics.pumpStrokeCount, 1, 'Free pump bulb should update the Free physical state');
assert.equal(
  Math.abs(
    freePumped.heatCapacityFreeInstrumentState.physics.gasAmountRatio -
      freePowered.heatCapacityFreeInstrumentState.physics.gasAmountRatio,
  ) < 1e-9,
  true,
  'Free pump stroke should queue a short continuous physical process instead of jumping gas amount instantly',
);
assert.equal(freePumped.heatCapacityFreeInstrumentState.physics.pumpProcesses.length, 1);
const freePumpedHalfway = stepHeatCapacityWorkbenchFile(freePumped, 1_240);
assert.equal(
  freePumpedHalfway.heatCapacityFreeInstrumentState.physics.gasAmountRatio > freePumped.heatCapacityFreeInstrumentState.physics.gasAmountRatio,
  true,
  'Free pump process should increase gas amount during the stroke',
);
assert.equal(freePumpedHalfway.heatCapacityFreeInstrumentState.physics.pumpProcesses.length, 1);
const freePumpedSensorSampleCountBeforeCompletion = freePumped.heatCapacityFreeInstrumentState.sensor.pressureHistory.length;
const freePumpedCompleted = stepHeatCapacityWorkbenchFile(freePumped, 1_300);
assert.equal(
  freePumpedCompleted.heatCapacityFreeInstrumentState.physics.gasAmountRatio > freePumpedHalfway.heatCapacityFreeInstrumentState.physics.gasAmountRatio,
  true,
  'Free pump process should continue increasing gas amount until the short stroke completes',
);
assert.equal(freePumpedCompleted.heatCapacityFreeInstrumentState.physics.pumpProcesses.length, 0);
assert.equal(
  freePumpedCompleted.heatCapacityFreeInstrumentState.sensor.pressureHistory.length >
    freePumpedSensorSampleCountBeforeCompletion + 1,
  true,
  'Free continuous pump stepping should keep intermediate display-layer sensor samples instead of one sparse endpoint',
);
assert.equal(
  freePumped.pressureSignalMv,
  truncateHeatCapacitySignalMv(freePumped.heatCapacityFreeInstrumentState.sensor.displayPressureMv),
  'Free display should expose the one-decimal instrument reading while keeping the sensor output precise',
);
const freeInstantZeroSource: typeof freePowered = {
  ...freePowered,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityReleaseState: {
    ...freePowered.heatCapacityReleaseState,
    phase: 'open',
    purpose: 'zeroing',
    openingStartedAtS: freePowered.heatCapacityFreeInstrumentState.physics.simulationTimeS,
    openingCompletedAtS: freePowered.heatCapacityFreeInstrumentState.physics.simulationTimeS,
  },
  heatCapacityFreeInstrumentState: {
    ...freePowered.heatCapacityFreeInstrumentState,
    sensor: {
      ...freePowered.heatCapacityFreeInstrumentState.sensor,
      displayPressureMv: 0.73,
      pressureSlopeMvPerS: 0,
    },
  },
  pressureSignalMv: 0.73,
  pressureSignalTargetMv: 0.73,
  pressureSignalMvDisplayed: 0.73,
  pressureZeroDisplayedSamples: [
    { atMs: 900, valueMv: 0.73 },
    { atMs: 950, valueMv: 0.73 },
  ],
};
const freeInstantZeroStepped = stepHeatCapacityWorkbenchFile(freeInstantZeroSource, 1_050);
const freeInstantZeroKnob = setHeatCapacityPressureZeroOffset(
  freeInstantZeroSource,
  -0.73,
  'coarseDrag',
  getHeatCapacityPressureZeroKnobAngleForOffset(-0.73),
  1_050,
);
assert.equal(
  freeInstantZeroKnob.pressureSignalMv,
  truncateHeatCapacitySignalMv(
    freeInstantZeroKnob.heatCapacityFreeInstrumentState.sensor.displayPressureMv - 0.73,
  ),
  'Free zero knob should update the visible U_p immediately instead of passing through sensor lag',
);
assert.equal(
  freeInstantZeroKnob.heatCapacityFreeInstrumentState.sensor.displayPressureMv,
  freeInstantZeroStepped.heatCapacityFreeInstrumentState.sensor.displayPressureMv,
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
  freeZeroPoweredOff.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv,
  freeInstantZeroKnob.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv,
);
const freeZeroPoweredOnAgain = powerHeatCapacityWorkbenchFile(freeZeroPoweredOff, true, 1_130);
assert.equal(freeZeroPoweredOnAgain.powerOn, true);
assert.equal(freeZeroPoweredOnAgain.pressureZeroAdjusted, true);
assert.equal(freeZeroPoweredOnAgain.pressureZeroKnobAngle, freeInstantZeroKnob.pressureZeroKnobAngle);
assert.equal(freeZeroPoweredOnAgain.pressureZeroOffset, freeInstantZeroKnob.pressureZeroOffset);
assert.equal(
  freeZeroPoweredOnAgain.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv,
  freeInstantZeroKnob.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv,
);
let freeTeachingLikePumpFile: WorkbenchHeatCapacityState = freePumpReady;
for (let strokeIndex = 0; strokeIndex < 4; strokeIndex += 1) {
  freeTeachingLikePumpFile = registerHeatCapacityPumpStroke(freeTeachingLikePumpFile, 1_300 + strokeIndex * 430);
}
assert.equal(
  freeTeachingLikePumpFile.heatCapacityFreeInstrumentState.physics.pumpStrokeCount,
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
const calibratedPumpLastAtMs = 3_000 + 17 * 400;
let stableCalibratedPumpFile = setHeatCapacityFreePumpValveOpen(
  calibratedPumpFile,
  false,
  calibratedPumpLastAtMs,
);
for (let stepIndex = 1; stepIndex <= 30; stepIndex += 1) {
  stableCalibratedPumpFile = stepHeatCapacityWorkbenchFile(
    stableCalibratedPumpFile,
    calibratedPumpLastAtMs + stepIndex * 2_500,
  );
}
const stableCalibratedPumpPressureMv = stableCalibratedPumpFile.pressureDeltaKPa *
  stableCalibratedPumpFile.heatCapacityFreeInstrumentConfig.sensor.pressureMvPerKPa;
assert.equal(
  stableCalibratedPumpPressureMv >= 109 && stableCalibratedPumpPressureMv <= 119,
  true,
  `18 Free pump strokes should relax near 114 mV after pump-valve close and 5 min, received ${stableCalibratedPumpPressureMv.toFixed(2)} mV`,
);
assert.equal(stableCalibratedPumpFile.pressureSafetyStatus, 'normal');
assert.equal(stableCalibratedPumpFile.pressureBlockedPumping, false);
const sealedWaitBase = {
  ...setHeatCapacityFreePumpValveOpen(calibratedPumpFile, false, calibratedPumpLastAtMs),
  pumpBulbState: 'idle' as const,
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
  sealedX2OneSecond.heatCapacityFreeInstrumentState.sensor.pressureHistory.filter((sample) => (
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
  rapidSpeedEightPumpFile.heatCapacityFreeInstrumentState.physics.simulationTimeS < 1,
  true,
  'equilibrium speed multiplier must not accelerate pump-click cadence or active pumping time',
);
let suggestedStopFreeFileStarted = calibratedPumpFile;
for (let strokeIndex = 0; strokeIndex < 2; strokeIndex += 1) {
  suggestedStopFreeFileStarted = registerHeatCapacityPumpStroke(
    suggestedStopFreeFileStarted,
    calibratedPumpLastAtMs + (strokeIndex + 1) * 400,
  );
}
const suggestedStopPumpLastAtMs = calibratedPumpLastAtMs + 2 * 400;
assert.equal(suggestedStopFreeFileStarted.heatCapacityFreeInstrumentState.physics.pumpStrokeCount, 20);
assert.equal(
  suggestedStopFreeFileStarted.pressureSafetyStatus,
  'warning',
  `calibrated Free pumping should enter the suggested-stop region before danger, got ${suggestedStopFreeFileStarted.pressureSignalMv} mV`,
);
assert.equal(suggestedStopFreeFileStarted.pressureBlockedPumping, false);
const fiveStrokeFreeFile = stepHeatCapacityWorkbenchFile(suggestedStopFreeFileStarted, suggestedStopPumpLastAtMs + 240);
assert.equal(fiveStrokeFreeFile.heatCapacityFreeInstrumentState.physics.pumpStrokeCount, 20);
assert.equal(
  fiveStrokeFreeFile.pressureSafetyStatus,
  'danger',
  `completed twentieth stroke should cross the 140 mV danger boundary, got ${fiveStrokeFreeFile.pressureSignalMv} mV`,
);
assert.equal(fiveStrokeFreeFile.pressureBlockedPumping, true);
const hotOverLimitFreeFile = registerHeatCapacityPumpStroke({
  ...freePumpReady,
  lastUpdateMs: 8_000,
  heatCapacityFreeInstrumentState: {
    ...freePumpReady.heatCapacityFreeInstrumentState,
    physics: {
      ...freePumpReady.heatCapacityFreeInstrumentState.physics,
      amountMol: undefined,
      internalEnergyJ: undefined,
      gasAmountRatio: 1,
      gasTemperatureK: 321,
      wallTemperatureK: 321,
      simulationTimeS: 2,
    },
  },
}, 8_000);
assert.equal(
  hotOverLimitFreeFile.heatCapacityFreeInstrumentState.physics.pumpStrokeCount,
  0,
  'Free alarm blocking should follow the current calculated pressure, even when amount ratio alone would look safe',
);
assert.equal(hotOverLimitFreeFile.pressureSafetyStatus, 'danger');
assert.equal(hotOverLimitFreeFile.pressureBlockedPumping, true);
assert.equal(hotOverLimitFreeFile.pressureDeltaKPa > hotOverLimitFreeFile.pressureSafetyThresholdKPa, true);
const fiveStrokeTraceTrial = fiveStrokeFreeFile.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === fiveStrokeFreeFile.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId
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
const rapidPointOneSecondTraceTrial = rapidPointOneSecondPumpFile.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === rapidPointOneSecondPumpFile.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId
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
  heatCapacityFreeInstrumentState: {
    ...freePowered.heatCapacityFreeInstrumentState,
    physics: {
      ...freePowered.heatCapacityFreeInstrumentState.physics,
      amountMol: undefined,
      internalEnergyJ: undefined,
      gasAmountRatio: (freePowered.ambientPressureKPa + freePowered.pressureSafetyThresholdKPa) /
        freePowered.ambientPressureKPa,
      gasTemperatureK: freePowered.ambientTemperatureK,
      pumpStrokeCount: 5,
    },
    sensor: {
      ...freePowered.heatCapacityFreeInstrumentState.sensor,
      displayPressureMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
      displayTemperatureMv: initialTemperatureMv,
      pressureSlopeMvPerS: 0,
      temperatureSlopeMvPerS: 0,
    },
  },
}, 1_000);
assert.equal(
  freeVisibleDangerPumpBlocked.heatCapacityFreeInstrumentState.physics.pumpStrokeCount,
  5,
  'Free Mode should reject further physical pump strokes once the visible danger threshold is reached',
);
assert.equal(freeVisibleDangerPumpBlocked.pumpHint, '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。');
const freeStepped = stepHeatCapacityWorkbenchFile(freePumped, 1_800);
assert.equal(
  freeStepped.pressureSignalMv,
  truncateHeatCapacitySignalMv(freeStepped.heatCapacityFreeInstrumentState.sensor.displayPressureMv),
  'Free stepping should not apply teaching lag/jitter after the Free sensor',
);
assert.equal(
  freeStepped.temperatureSignalMv,
  truncateHeatCapacitySignalMv(freeStepped.heatCapacityFreeInstrumentState.sensor.displayTemperatureMv),
);
const freeReadyForRelease = {
  ...freeStepped,
  heatCapacityFreeRunWorkspace: {
    ...freeStepped.heatCapacityFreeRunWorkspace,
    trials: [
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
  },
};
const freeReleaseOpening = setHeatCapacityFreeStopcockOpen(freeReadyForRelease, true, 2_000);
assert.equal(freeReleaseOpening.heatCapacityReleaseState.phase, 'opening');
assert.equal(freeReleaseOpening.heatCapacityReleaseState.releaseDurationS, 0);
assert.equal(freeReleaseOpening.heatCapacityFreeInstrumentState.physics.releaseStarted, false);
const openingAlmostComplete = stepHeatCapacityWorkbenchFile(
  freeReleaseOpening,
  2_000 + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs - 1,
);
assert.equal(openingAlmostComplete.heatCapacityReleaseState.phase, 'opening');
assert.equal(openingAlmostComplete.heatCapacityReleaseState.releaseDurationS, 0);
const freeReleaseStarted = stepHeatCapacityWorkbenchFile(
  openingAlmostComplete,
  2_000 + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs + 20,
);
assert.equal(freeReleaseStarted.heatCapacityReleaseState.phase, 'releasing');
assert.equal(freeReleaseStarted.heatCapacityReleaseState.purpose, 'release');
assert.equal(freeReleaseStarted.heatCapacityFreeInstrumentState.physics.releaseStarted, true, 'real release should begin only after the opening animation completes');

const freeZeroingOpening = setHeatCapacityFreeStopcockOpen(freePowered, true, 2_000);
const freeZeroingOpen = stepHeatCapacityWorkbenchFile({
  ...freeZeroingOpening,
  heatCapacityFreeInstrumentState: {
    ...freeZeroingOpening.heatCapacityFreeInstrumentState,
    sensor: {
      ...freeZeroingOpening.heatCapacityFreeInstrumentState.sensor,
      displayPressureMv: 0.02,
      displayTemperatureMv: initialTemperatureMv,
      pressureSlopeMvPerS: 0,
      temperatureSlopeMvPerS: 0,
    },
  },
  pressureZeroDisplayedSamples: [
    { atMs: 1_800, valueMv: 0.02 },
    { atMs: 1_900, valueMv: 0.01 },
    { atMs: 2_000, valueMv: 0 },
  ],
}, 2_000 + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs);
assert.equal(
  freeZeroingOpen.heatCapacityFreeInstrumentState.physics.releaseStarted,
  false,
  'opening the stopcock for U0 zeroing must not create a Free release reference',
);
assert.equal(
  freeZeroingOpen.heatCapacityPhase,
  'readyToZero',
  'U0 zeroing flow should stay in the zeroing path instead of jumping to quick release',
);
assert.equal(freeZeroingOpen.heatCapacityReleaseState.purpose, 'zeroing');
const closeCommandAtMs = 2_000 + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs + 40;
const closedFlowImmediately = setHeatCapacityFreeStopcockOpen(freeReleaseStarted, false, closeCommandAtMs);
const frozenReleaseDurationS = closedFlowImmediately.heatCapacityReleaseState.releaseDurationS;
assert.equal(closedFlowImmediately.heatCapacityReleaseState.phase, 'closing');
assert.equal(frozenReleaseDurationS > 0, true);
const closingFinished = stepHeatCapacityWorkbenchFile(
  closedFlowImmediately,
  closeCommandAtMs + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs,
);
assert.equal(closingFinished.heatCapacityReleaseState.releaseDurationS, frozenReleaseDurationS);
assert.equal(closingFinished.heatCapacityReleaseState.phase, 'closedAfterRelease');

const quickOpening = setHeatCapacityFreeStopcockOpen(freeReadyForRelease, true, 3_000);
const quickToggleBeforeFlowOpen = setHeatCapacityFreeStopcockOpen(
  quickOpening,
  false,
  3_000 + Math.floor(HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs / 2),
);
assert.equal(quickToggleBeforeFlowOpen.heatCapacityReleaseState.quickToggle, true);
assert.equal(quickToggleBeforeFlowOpen.heatCapacityReleaseState.releaseDurationS, 0);
assert.equal(quickToggleBeforeFlowOpen.heatCapacityFreeInstrumentState.physics.releaseStarted, false);
const freeZeroed = setHeatCapacityPressureZeroOffset({
  ...freeZeroingOpen,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  heatCapacityFreeInstrumentState: {
    ...freeZeroingOpen.heatCapacityFreeInstrumentState,
    sensor: {
      ...freePowered.heatCapacityFreeInstrumentState.sensor,
      displayPressureMv: 0.02,
      displayTemperatureMv: initialTemperatureMv,
      nextSampleAtS: 10,
      pressureSlopeMvPerS: 0,
      temperatureSlopeMvPerS: 0,
    },
  },
  pressureZeroDisplayedSamples: [
    { atMs: 1_000, valueMv: 0.02 },
    { atMs: 1_100, valueMv: -0.01 },
    { atMs: 1_200, valueMv: 0.01 },
    { atMs: 1_240, valueMv: 0 },
  ],
}, 0, 'fineWheel', 0, 1_250);
assert.equal(freeZeroed.heatCapacityFreeInstrumentState.calibration.calibrationVersion, 1, 'Free zeroing should create a calibration event');
assert.equal(freeZeroed.heatCapacityFreeInstrumentState.calibration.zeroEvents[0].id, 'zero-1');
const freeAutomaticU0 = stepHeatCapacityWorkbenchFile({
  ...freeZeroed,
  pressureZeroed: true,
}, 1_350);
assert.equal(freeAutomaticU0.heatCapacityFreeInstrumentState.calibration.automaticU0?.zeroEventId, 'zero-1', 'Free Mode should capture U0 automatically from a stable zeroed open state');
const poweredOffHardSphereVisual = getHeatCapacityHardSphereVisualState({
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
  temperatureMv: initialTemperatureMv + 8,
  pressureMv: 110,
  pressureDeltaKPa: 5.5,
  gasAmountRatio: 1.02,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
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
assert.deepEqual(HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementTooSlowMvRange, [2, 2]);
assert.deepEqual(HEAT_CAPACITY_VIDEO_PROFILE.pumpPressureIncrementSuitableMvRange, [7, 7]);
assert.equal(HEAT_CAPACITY_VIDEO_PROFILE.pumpPeakPressureMvRange[1] < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo profile peak pressure must stay below the alarm threshold');
assert.equal(HEAT_CAPACITY_VIDEO_PROFILE.stablePressureMvRange[1] < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true, 'auto demo stable pressure must stay below the alarm threshold');
assert.equal(defaultFile.pressureZeroMvPerTurn, HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN);
assert.equal(defaultFile.temperatureSignalMv, null);
assert.equal(defaultFile.pressureSignalMv, null);
assert.equal(
  defaultFile.temperatureSignalTargetMv,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
);
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
assert.equal('hardSphereParticleMultiplier' in defaultFile, false);
assert.equal('hardSphereSpeedMultiplier' in defaultFile, false);
assert.equal(defaultFile.visualizationMode, 'particle');
assert.equal(defaultFile.calculationModel, 'airHeatCapacityRatio');
assert.equal(defaultFile.pressureSensitivityMvPerKPa, 20);
assert.equal(defaultFile.theoreticalGamma, 1.4);
assert.equal(defaultFile.vesselPressureReadoutKPa, 101.3);
assert.equal(defaultFile.vesselTemperatureReadoutK, 298.15);
assert.equal('heatCapacityTrace' in defaultFile, false, 'heatCapacity files should not persist realtime chart trace history');
assert.deepEqual(defaultFile.heatCapacityProcessSamples, {});
assert.equal(canZeroHeatCapacityPressure(defaultFile), false);
assert.equal(HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV, 0.1);
assert.equal(applyHeatCapacityPressureZero(3.2, 0.4, -0.7), 2.9);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(-0.6), -216);
assert.equal(getHeatCapacityPressureZeroKnobAngleForOffset(0.8), 288);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(-216), -0.6);
assert.equal(getHeatCapacityPressureZeroOffsetForKnobAngle(288), 0.8);
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

const poweredBeforePreheat = powerHeatCapacityWorkbenchFile(startHeatCapacityGuideWorkbenchState(defaultFile, 900), true, 1_000);
assert.equal(poweredBeforePreheat.heatCapacityGuideWorkflow.step, 'preheatRequired');
assert.equal(poweredBeforePreheat.runState, 'running', 'an allowed Guide power-on action should start the canonical runtime clock');
const poweredFile = completeHeatCapacityGuidePreheatWorkbenchState(poweredBeforePreheat, 1_001);
assert.equal(poweredFile.powerOn, true);
assert.equal(poweredFile.heatCapacityMode, 'guide');
assert.equal(poweredFile.heatCapacityExperimentProfile, null);
assert.equal(poweredFile.heatCapacityGuideTrial?.source, 'guide');
assert.deepEqual(poweredFile.heatCapacityFreeRunWorkspace.trials, []);
assert.equal(poweredFile.heatCapacityGuideWorkflow.step, 'openStopcockForZeroRequired');
assert.equal(poweredFile.runState, 'running', 'Guide runtime should remain running after preheat completes');
assert.equal(poweredFile.heatCapacityPhase, 'readyToZero');
assert.equal(
  poweredFile.temperatureSignalMv,
  truncateHeatCapacitySignalMv(DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient),
);
assert.equal(Math.abs(poweredFile.pressureInitialBiasMv) >= 0.25, true, 'Guide should start each run with a non-trivial pressure-zero bias');
assert.equal(Math.abs(poweredFile.pressureInitialBiasMv) <= 1.5, true, 'Guide pressure-zero bias should stay inside the same range as Free Mode');
assert.equal(poweredFile.pressureSignalMv, poweredFile.pressureInitialBiasMv);
assert.equal(
  poweredFile.temperatureSignalTargetMv,
  truncateHeatCapacitySignalMv(DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient),
);
assert.equal(poweredFile.pressureSignalTargetMv, poweredFile.pressureInitialBiasMv);
const completedGuidePowerOff = powerHeatCapacityWorkbenchFile({
  ...poweredFile,
  heatCapacityGuideWorkflow: {
    ...poweredFile.heatCapacityGuideWorkflow,
    step: 'closePowerRequired',
  },
}, false, 1_002);
assert.equal(completedGuidePowerOff.heatCapacityGuideWorkflow.step, 'completed');
assert.equal(completedGuidePowerOff.heatCapacityTeachingStatus, 'completed');
assert.equal(completedGuidePowerOff.powerOn, false);
assert.equal(completedGuidePowerOff.runState, 'idle', 'the final allowed Guide power-off action should stop the runtime clock');
const guideDisplayWithStaleFreeSignals = selectActiveHeatCapacityWorkbenchDisplay({
  ...poweredFile,
  heatCapacityFreeInstrumentState: {
    ...poweredFile.heatCapacityFreeInstrumentState,
    sensor: {
      ...poweredFile.heatCapacityFreeInstrumentState.sensor,
      displayPressureMv: 11.1,
      displayTemperatureMv: 1498.8,
    },
  },
});
assert.deepEqual(
  guideDisplayWithStaleFreeSignals,
  {
    source: 'guide',
    pressureMv: poweredFile.pressureInitialBiasMv,
    temperatureMv: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
  },
  'guided mode display should ignore stale Free sensor state and read the Guide display layer',
);
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
assert.equal(stablePressureDisplays.size, 1, 'guide ideal sensor should not add visible random pressure jitter');
assert.equal(stableTemperatureDisplays.size, 1, 'guide ideal sensor should not add visible random temperature jitter');

const pressureLoadedFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
};
const fineZero = adjustHeatCapacityPressureZeroFine({
  ...pressureLoadedFile,
}, 1, 1_080);
assert.equal(fineZero.pressureZeroAdjusted, true);
assert.equal(fineZero.pressureZeroed, false, 'Guide pressure-zero should require a stable displayed window, not one instantaneous sample');
assert.equal(fineZero.pressureZeroAdjustMode, 'fineWheel');
assert.equal(fineZero.pressureZeroKnobAngle, 2);
assert.equal(fineZero.pressureZeroOffset, 0.006);
assert.equal(fineZero.heatCapacityFreeInstrumentState.calibration.calibrationVersion, poweredFile.heatCapacityFreeInstrumentState.calibration.calibrationVersion);
assert.equal(fineZero.heatCapacityFreeInstrumentState.calibration.zeroEvents.length, 0);
assert.equal(fineZero.pressureSignalReadoutMv, fineZero.pressureSignalMv);
assert.equal(
  fineZero.pressureSignalMv,
  truncateHeatCapacitySignalMv(fineZero.pressureSignalTargetMv),
  'guide physical zero knob should update the visible U_p immediately',
);
assert.equal(fineZero.pressureGaugeDisplayValue, fineZero.pressureGaugeTargetValue);
assert.equal(fineZero.pressureOverLimit, false);
assert.equal(fineZero.temperatureSignalMv, pressureLoadedFile.temperatureSignalMv);
assert.equal(fineZero.temperatureSignalTargetMv, pressureLoadedFile.temperatureSignalTargetMv);
assert.equal(fineZero.vesselTemperatureReadoutK, fineZero.gasTemperatureK);

let guideZeroNoAdjustment: WorkbenchHeatCapacityState = powerHeatCapacityWorkbenchFile(
  startHeatCapacityGuideWorkbenchState(defaultFile, 21_000),
  true,
  21_100,
);
guideZeroNoAdjustment = completeHeatCapacityGuidePreheatWorkbenchState(guideZeroNoAdjustment, 21_101);
guideZeroNoAdjustment = {
  ...guideZeroNoAdjustment,
  pressureInitialBiasMv: 0,
  pressureSignalMvRaw: 0,
  pressureSignalMvDisplayed: 0,
  pressureSignalMv: 0,
  pressureSignalTargetMv: 0,
  pressureZeroDisplayedSamples: [],
};
guideZeroNoAdjustment = setHeatCapacityGuideStopcockOpen(guideZeroNoAdjustment, true, 21_200);
assert.equal(guideZeroNoAdjustment.heatCapacityGuideWorkflow.step, 'zeroRequired');
for (let sampleIndex = 1; sampleIndex < 5; sampleIndex += 1) {
  guideZeroNoAdjustment = stepHeatCapacityWorkbenchFile(guideZeroNoAdjustment, 21_200 + sampleIndex * 200);
}
assert.equal(guideZeroNoAdjustment.pressureZeroed, true);
assert.equal(guideZeroNoAdjustment.pressureZeroAdjusted, false);
assert.equal(
  guideZeroNoAdjustment.heatCapacityGuideWorkflow.step,
  'zeroRequired',
  'Guide should not skip the pressure-zero teaching step unless the user has adjusted the zero knob',
);

const guideTargetZeroOffset = -pressureLoadedFile.pressureInitialBiasMv;
const guideTargetZeroKnobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(guideTargetZeroOffset);
let stableFineZero = setHeatCapacityPressureZeroOffset(
  pressureLoadedFile,
  guideTargetZeroOffset,
  'fineWheel',
  guideTargetZeroKnobAngle,
  1_080,
);
for (let sampleIndex = 1; sampleIndex < 5; sampleIndex += 1) {
  stableFineZero = setHeatCapacityPressureZeroOffset(
    stableFineZero,
    guideTargetZeroOffset,
    'fineWheel',
    guideTargetZeroKnobAngle,
    1_080 + sampleIndex * 200,
  );
}
assert.equal(stableFineZero.pressureZeroed, true, 'Guide pressure-zero accepts the display after the stable tolerance window is filled');

const coarseZero = adjustHeatCapacityPressureZeroCoarse({
  ...stableFineZero,
}, 90, 1_900);
assert.equal(coarseZero.pressureZeroAdjustMode, 'coarseDrag');
assert.equal(coarseZero.pressureZeroKnobAngle, stableFineZero.pressureZeroKnobAngle + 90);
assert.equal(coarseZero.pressureZeroOffset > stableFineZero.pressureZeroOffset, true);
assert.equal(coarseZero.pressureSignalReadoutMv, stableFineZero.pressureSignalReadoutMv);
assert.equal(
  coarseZero.pressureZeroOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle(stableFineZero.pressureZeroKnobAngle + 90),
);
assert.equal(coarseZero.temperatureSignalTargetMv, fineZero.temperatureSignalTargetMv);

const coarseZeroPoweredOff = powerHeatCapacityWorkbenchFile(coarseZero, false, 1_120);
assert.equal(coarseZeroPoweredOff.powerOn, true);
assert.equal(coarseZeroPoweredOff.heatCapacityGuideWorkflow.step, coarseZero.heatCapacityGuideWorkflow.step);
assert.equal(coarseZeroPoweredOff.heatCapacityGuideWorkflow.wrongActionCount, coarseZero.heatCapacityGuideWorkflow.wrongActionCount + 1);
assert.notEqual(coarseZeroPoweredOff.pressureSignalMv, null);
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
}, 120, 1_200);
assert.equal(upperLimitedZero.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(upperLimitedZero.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);
const upperLimitedAgain = adjustHeatCapacityPressureZeroFine(upperLimitedZero, 1, 1_220);
assert.equal(upperLimitedAgain.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG);
assert.equal(upperLimitedAgain.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV);

const lowerLimitedZero = adjustHeatCapacityPressureZeroCoarse({
  ...pressureLoadedFile,
  pressureZeroKnobAngle: -530,
  pressureZeroOffset: getHeatCapacityPressureZeroOffsetForKnobAngle(-530),
}, -120, 1_240);
assert.equal(lowerLimitedZero.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(lowerLimitedZero.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);
const lowerLimitedAgain = adjustHeatCapacityPressureZeroFine(lowerLimitedZero, -1, 1_260);
assert.equal(lowerLimitedAgain.pressureZeroKnobAngle, HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG);
assert.equal(lowerLimitedAgain.pressureZeroOffset, HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV);

const demoStart = prepareHeatCapacityAutoDemoStart(defaultFile, 20_000);
assert.equal(demoStart.powerOn, true);
assert.equal(demoStart.runState, 'running');
assert.equal(demoStart.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(demoStart.glassPistonState, 'closed');
assert.equal(demoStart.pressureZeroAdjusted, false);
assert.equal(Math.abs(demoStart.pressureSignalTargetMv), HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV);
assert.equal(demoStart.pressureDeltaKPa, 0);
assert.equal(demoStart.gasPressureKPaAbs, defaultFile.ambientPressureKPa);
assert.equal(demoStart.temperatureSignalTargetMv, demoStart.heatCapacityExperimentProfile?.initialTemperatureMv);
assert.equal(demoStart.temperatureSignalMv, truncateHeatCapacitySignalMv(demoStart.heatCapacityExperimentProfile?.initialTemperatureMv ?? 0));
assert.equal(demoStart.heatCapacityExperimentProfile !== null, true);
const demoTeachingProfile = demoStart.heatCapacityExperimentProfile!;
assert.match(String(demoTeachingProfile.seed), /^auto-demo-\d+$/);
assert.equal(demoTeachingProfile.u1MeasuredMv, HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV);
assert.equal(demoTeachingProfile.gammaTarget >= 1.37 && demoTeachingProfile.gammaTarget <= 1.43, true);
assert.equal(demoTeachingProfile.gammaTarget.toFixed(3).length, 5);
assert.equal(
  Math.abs(demoTeachingProfile.gammaTarget - calculateHeatCapacityGammaFromDisplayedSignals(
    demoTeachingProfile.u0MeasuredMv,
    demoTeachingProfile.u1MeasuredMv,
    demoTeachingProfile.u2MeasuredMv,
  )) < 1e-6,
  true,
);
assert.equal(demoStart.heatCapacityGuideTrial, null);
assert.equal('heatCapacityExpectedTrialCount' in demoStart, false);
assert.equal('heatCapacityTrials' in demoStart, false);
assert.equal('heatCapacityProcessingCalculated' in demoStart, false);
assert.deepEqual(demoStart.heatCapacityProcessSamples, {});

const visualDemoStart = prepareHeatCapacityAutoDemoStart({
  ...defaultFile,
  hardSphereViewEnabled: true,
}, 20_500, () => 0.5);
assert.equal(visualDemoStart.hardSphereViewEnabled, true, 'auto demo start should preserve the hard-sphere teaching toggle');
assert.equal('hardSphereParticleMultiplier' in visualDemoStart, false);
assert.equal('hardSphereSpeedMultiplier' in visualDemoStart, false);

const autoDemoPumpActions = createHeatCapacityAutoDemoSteps()
  .flatMap((step) => step.actions)
  .filter((action) => action.action === 'pumpStroke');
assert.equal(autoDemoPumpActions.length, HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT, 'auto demo should follow the configured teaching pump sequence');
assert.equal(
  autoDemoPumpActions.length,
  HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
  'auto demo should reuse the standard operation pump stroke count',
);
const autoDemoReleaseStep = createHeatCapacityAutoDemoSteps().find((step) => step.id === 'release-and-close-stopcock')!;
const autoDemoCloseAction = autoDemoReleaseStep.actions.find((action) => action.action === 'closeStopcockForRecovery')!;
assert.equal(autoDemoCloseAction.delayMs, HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS);
assert.equal(
  autoDemoCloseAction.delayMs,
  HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
    HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1000,
);
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
assert.equal(autoDemoPressureFile.pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV, true, 'auto demo pumping should reach the useful U1 range instead of stopping at the old low teaching pressure');
assert.equal(autoDemoPressureFile.pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true, 'auto demo standard pumping should reach the guided target region');
assert.equal(autoDemoPressureFile.pressureOverLimit, false, 'auto demo pumping must not set the alarm state');

const completedDemo = completeHeatCapacityTeachingModeWorkbenchState({
  ...demoStart,
  hardSphereViewEnabled: true,
  heatCapacityProcessSamples: {
    zeroedSample: {
      timeS: 10,
      phase: 'zeroed',
      temperatureSignalMv: 1499,
      pressureSignalMv: 0,
      gasTemperatureK: 298.15,
      gasPressureKPaAbs: 101.3,
      pressureDeltaKPa: 0,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: true,
    },
    stableBeforeReleaseSample: {
      timeS: 86.9,
      phase: 'sealedStabilizing',
      temperatureSignalMv: 1499,
      pressureSignalMv: 117.4,
      gasTemperatureK: 298.15,
      gasPressureKPaAbs: 107.3,
      pressureDeltaKPa: 6,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
    recoverySample: {
      timeS: 114.3,
      phase: 'recovering',
      temperatureSignalMv: 1499,
      pressureSignalMv: 31.1,
      gasTemperatureK: 298.15,
      gasPressureKPaAbs: 103,
      pressureDeltaKPa: 1.7,
      pumpFrequency: 0,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
  },
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
assert.equal(completedDemo.heatCapacityMode, 'demo');
assert.equal(completedDemo.heatCapacityTeachingStatus, 'completed');
assert.equal(completedDemo.runState, 'idle');
assert.equal(completedDemo.heatCapacityPhase, 'powerOff');
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
assert.equal(completedDemo.hardSphereViewEnabled, true, 'returning to Free base should preserve the user-facing hard-sphere teaching toggle');
assert.equal('hardSphereParticleMultiplier' in completedDemo, false);
assert.equal('hardSphereSpeedMultiplier' in completedDemo, false);
assert.notEqual(completedDemo.heatCapacityGuideTrial, null);
assert.equal(completedDemo.heatCapacityGuideTrial?.source, 'demo');
assert.notEqual(completedDemo.heatCapacityGuideTrial?.correctedSignals, null);
assert.equal(completedDemo.recordedPressures.p1, null);
assert.equal(completedDemo.recordedPressures.p2, null);
assert.equal('heatCapacityExpectedTrialCount' in completedDemo, false);
assert.equal('heatCapacityTrials' in completedDemo, false);
assert.equal('heatCapacityProcessingCalculated' in completedDemo, false);
assert.notDeepEqual(completedDemo.heatCapacityProcessSamples, {});

const exitedAfterTeachingCompletion = exitHeatCapacityTeachingModeWorkbenchState(completedDemo, 31_000);
assert.equal(exitedAfterTeachingCompletion.heatCapacityMode, 'free');
assert.equal(exitedAfterTeachingCompletion.heatCapacityTeachingStatus, 'idle');
assert.equal(exitedAfterTeachingCompletion.heatCapacityGuideTrial, null);
assert.deepEqual(exitedAfterTeachingCompletion.heatCapacityProcessSamples, {});

const poweredAfterTeachingCompletion = powerHeatCapacityWorkbenchFile(
  configureHeatCapacityFreeBatchWorkbenchState(exitedAfterTeachingCompletion, 3, 31_050),
  true,
  31_100,
);
assert.equal(poweredAfterTeachingCompletion.heatCapacityMode, 'free');
assert.equal(poweredAfterTeachingCompletion.powerOn, true);
assert.equal(poweredAfterTeachingCompletion.pressureDeltaKPa, 0);
assert.equal(poweredAfterTeachingCompletion.gasPressureKPaAbs, poweredAfterTeachingCompletion.ambientPressureKPa);
assert.equal(poweredAfterTeachingCompletion.heatCapacityExperimentProfile, null);

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
assert.equal(
  pumpedTarget.gasTemperatureK > demoStart.gasTemperatureK,
  true,
  'a pump stroke should add heat to the real gas immediately',
);
assert.equal(
  pumpedTarget.sensorTemperatureK,
  demoStart.sensorTemperatureK,
  'the independent temperature sensor must not jump at the zero-duration pump event',
);
assert.equal(
  pumpedTarget.temperatureSignalTargetMv,
  demoStart.temperatureSignalTargetMv,
  'UT should remain continuous until physical time advances through the sensor lag',
);
assert.equal(
  pumpedTarget.temperatureSignalMv,
  pumpedTarget.temperatureSignalTargetMv,
  'Demo must not add a second display-space temperature low-pass',
);
assert.equal(Math.abs(pumpedTarget.pressureGaugeTargetValue - pumpedTarget.pressureDeltaKPa) < 0.01, true);
assert.equal(pumpedTarget.pressureGaugeDisplayValue <= pumpedTarget.pressureGaugeTargetValue, true);

const settledDisplay = stepHeatCapacityWorkbenchFile(pumpedTarget, 22_000);
assert.equal(settledDisplay.pressureSignalMv > pumpedTarget.pressureSignalMv, true);
assert.equal(settledDisplay.temperatureSignalMv > pumpedTarget.temperatureSignalMv, true);
assert.equal(settledDisplay.temperatureSignalTargetMv > pumpedTarget.temperatureSignalTargetMv, true);
assert.equal(Math.abs(settledDisplay.pressureGaugeTargetValue - settledDisplay.pressureDeltaKPa) < 0.01, true);
assert.equal(settledDisplay.pressureGaugeDisplayValue > pumpedTarget.pressureGaugeDisplayValue, true);

assert.equal(HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA, 0.12);
const releaseReadyFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  heatCapacityMode: 'demo',
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
  pressureSignalReadoutMv: 100,
  pressureGaugeTargetValue: 5,
  pressureGaugeDisplayValue: 5,
  lastUpdateMs: 22_000,
  displayResponseLastUpdateMs: 22_000,
  heatCapacityReleaseState: {
    ...poweredFile.heatCapacityReleaseState,
    phase: 'releasing',
    purpose: 'release',
    attemptId: 1,
    phaseStartedAtS: poweredFile.simulationTimeS,
    openingStartedAtS: poweredFile.simulationTimeS - HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs / 1000,
    openingCompletedAtS: poweredFile.simulationTimeS,
    formedRelease: true,
  },
};
const releasedDuringPreset = stepHeatCapacityWorkbenchFile(releaseReadyFile, 22_200);
assert.equal(releasedDuringPreset.heatCapacityReleaseState.phase, 'releasing');
assert.equal(releasedDuringPreset.pressureDeltaKPa < releaseReadyFile.pressureDeltaKPa, true);
const releasedAfterPreset = stepHeatCapacityWorkbenchFile(
  releasedDuringPreset,
  22_000 + HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000 + 100,
);
assert.equal(releasedAfterPreset.heatCapacityReleaseState.phase, 'closing');
assert.equal(
  Math.abs(
    releasedAfterPreset.heatCapacityReleaseState.releaseDurationS -
      HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
  ) < 1e-9,
  true,
  'auto demo should stop main release at the canonical preset duration',
);

const noPressureOpenFile = stepHeatCapacityWorkbenchFile({
  ...poweredFile,
  heatCapacityMode: 'demo',
  powerOn: true,
  pressureZeroAdjusted: true,
  pressureZeroed: true,
  heatCapacityPhase: 'zeroed',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
  gasPressureKPaAbs: poweredFile.ambientPressureKPa,
  pressureDeltaKPa: 0,
  pressureInitialBiasMv: 0,
  pressureSignalTargetMv: 0,
  pressureSignalMv: 0,
  pressureSignalMvDisplayed: 0,
  pressureSignalReadoutMv: 0,
  heatCapacityReleaseState: {
    ...poweredFile.heatCapacityReleaseState,
    phase: 'open',
    purpose: 'zeroing',
    openingStartedAtS: poweredFile.simulationTimeS,
    openingCompletedAtS: poweredFile.simulationTimeS,
  },
  lastUpdateMs: 50_000,
  displayResponseLastUpdateMs: 50_000,
}, 50_600);
assert.equal(noPressureOpenFile.heatCapacityPhase === 'releasing', false, 'opening the stopcock at zero pressure difference should stay a normal open state');
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
  heatCapacityFreeInstrumentConfig: {
    ...defaultFile.heatCapacityFreeInstrumentConfig,
    record: {
      ...defaultFile.heatCapacityFreeInstrumentConfig.record,
      pressureDangerMv: 160,
    },
    pressureWarningMv: 120,
  },
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

const guidePumpReadyFile: WorkbenchHeatCapacityState = {
  ...poweredFile,
  heatCapacityGuideWorkflow: {
    ...poweredFile.heatCapacityGuideWorkflow,
    step: 'pumpRequired',
  },
};

const closedValvePump = registerHeatCapacityPumpStroke(guidePumpReadyFile, 10_000);
assert.equal(closedValvePump.pumpStrokeCount, 0);
assert.deepEqual(closedValvePump.pumpStrokeTimestamps, []);
assert.equal(closedValvePump.pumpFrequency, 0);
assert.equal(closedValvePump.pumpFrequencyStatus, 'idle');
assert.equal(closedValvePump.vesselPressureReadoutKPa, guidePumpReadyFile.vesselPressureReadoutKPa);
assert.equal(closedValvePump.vesselTemperatureReadoutK, guidePumpReadyFile.vesselTemperatureReadoutK);
assert.equal(closedValvePump.pressureKPa, guidePumpReadyFile.pressureKPa);
assert.equal(closedValvePump.lastPumpTime, guidePumpReadyFile.lastPumpTime);
assert.equal(closedValvePump.pumpHint, '打气阀门未打开，无法有效打气');

const openStopcockPump = registerHeatCapacityPumpStroke({
  ...guidePumpReadyFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  glassPistonState: 'open',
}, 10_000);
assert.equal(openStopcockPump.pumpStrokeCount, 0);
assert.deepEqual(openStopcockPump.pumpStrokeTimestamps, []);
assert.equal(openStopcockPump.pumpFrequency, 0);
assert.equal(openStopcockPump.pumpFrequencyStatus, 'idle');
assert.equal(openStopcockPump.vesselPressureReadoutKPa, guidePumpReadyFile.vesselPressureReadoutKPa);
assert.equal(openStopcockPump.vesselTemperatureReadoutK, guidePumpReadyFile.vesselTemperatureReadoutK);
assert.equal(openStopcockPump.pumpHint, '玻璃旋塞已打开，无法形成有效加压');

const openValvePump = registerHeatCapacityPumpStroke({
  ...guidePumpReadyFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
}, 10_000);
assert.equal(openValvePump.pumpStrokeCount, 1);
assert.equal(openValvePump.pumpFrequencyStatus, 'tooSlow');
assert.equal(openValvePump.heatCapacityGuidePhysicsState.pumpStrokeCount, 1);
assert.equal(openValvePump.heatCapacityGuidePhysicsState.pumpProcesses.length, 1, 'Guide pumping should leave the short continuous pump process for later stepping');
assert.equal(openValvePump.pressureSignalMv, guidePumpReadyFile.pressureSignalMv);
assert.equal(openValvePump.temperatureSignalMv, guidePumpReadyFile.temperatureSignalMv);

const guidePumpDuringStroke = stepHeatCapacityWorkbenchFile(openValvePump, 10_040);
assert.equal(guidePumpDuringStroke.heatCapacityGuidePhysicsState.pumpProcesses.length, 1);
assert.equal(guidePumpDuringStroke.pressureSignalTargetMv > openValvePump.pressureSignalTargetMv, true);
assert.equal(guidePumpDuringStroke.temperatureSignalTargetMv >= openValvePump.temperatureSignalTargetMv, true);
assert.equal((guidePumpDuringStroke.pressureSignalMv ?? Number.NaN) < guidePumpDuringStroke.pressureSignalTargetMv, true);
assert.equal((guidePumpDuringStroke.temperatureSignalMv ?? Number.NaN) <= guidePumpDuringStroke.temperatureSignalTargetMv, true);

const guidePumpCompleted = stepHeatCapacityWorkbenchFile(guidePumpDuringStroke, 10_140);
assert.equal(guidePumpCompleted.heatCapacityGuidePhysicsState.pumpProcesses.length, 0);
assert.equal(guidePumpCompleted.pressureSignalTargetMv > guidePumpReadyFile.pressureSignalTargetMv, true);
assert.equal(guidePumpCompleted.vesselTemperatureReadoutK >= guidePumpReadyFile.vesselTemperatureReadoutK, true);
assert.equal((guidePumpCompleted.pressureSignalMv ?? Number.NaN) <= guidePumpCompleted.pressureSignalTargetMv, true);

const guideAcceleratedWaitStart: WorkbenchHeatCapacityState = {
  ...guidePumpCompleted,
  pumpValveOpen: false,
  pumpValveState: 'closed',
  lastUpdateMs: 20_000,
  heatCapacityGuideWorkflow: {
    ...guidePumpCompleted.heatCapacityGuideWorkflow,
    step: 'u1Waiting',
    speedMultiplier: 8,
    waitStartedAtS: guidePumpCompleted.heatCapacityGuidePhysicsState.simulationTimeS,
    waitStage: 'u1',
  },
};
const guideAcceleratedWaitCoarse = stepHeatCapacityWorkbenchFile(
  guideAcceleratedWaitStart,
  20_500,
);
let guideAcceleratedWaitFine = guideAcceleratedWaitStart;
for (let index = 1; index <= 50; index += 1) {
  guideAcceleratedWaitFine = stepHeatCapacityWorkbenchFile(
    guideAcceleratedWaitFine,
    20_000 + index * 10,
  );
}
assert.equal(
  Math.abs(
    guideAcceleratedWaitCoarse.heatCapacityGuidePhysicsState.gasTemperatureK -
      guideAcceleratedWaitFine.heatCapacityGuidePhysicsState.gasTemperatureK,
  ) < 1e-8,
  true,
  'Guide accelerated waiting should produce the same gas trajectory independent of render-frame slicing',
);
assert.equal(
  Math.abs(
    guideAcceleratedWaitCoarse.heatCapacityGuideTemperatureSensorState.temperatureK -
      guideAcceleratedWaitFine.heatCapacityGuideTemperatureSensorState.temperatureK,
  ) < 1e-8,
  true,
  'Guide accelerated waiting must integrate the sensor along the same substeps as gas and wall temperatures',
);

const guideTargetVisibleGatePressureMv = HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV + 5;
const guideTargetVisibleGateDeltaKPa = (
  guideTargetVisibleGatePressureMv - poweredFile.pressureInitialBiasMv
) / poweredFile.pressureSensitivityMvPerKPa;
const guideTargetVisibleGateAmountRatio = (
  poweredFile.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa +
  guideTargetVisibleGateDeltaKPa
) / poweredFile.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa;
const guideTargetVisibleGateAmountMol =
  guidePumpReadyFile.heatCapacityGuidePhysicsState.referenceAmountMol *
  guideTargetVisibleGateAmountRatio;
const guideTargetVisibleGateInternalEnergyJ =
  guidePumpReadyFile.heatCapacityGuidePhysicsState.internalEnergyJ /
  guidePumpReadyFile.heatCapacityGuidePhysicsState.amountMol *
  guideTargetVisibleGateAmountMol;
const guideTargetVisibleGateFile: WorkbenchHeatCapacityState = {
  ...guidePumpReadyFile,
  pumpValveOpen: true,
  pumpValveState: 'open',
  pressureSignalMv: HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV - 2,
  pressureSignalTargetMv: HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV - 2,
  pressureSignalMvDisplayed: HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV - 2,
  temperatureSignalMv: poweredFile.temperatureSignalTargetMv,
  temperatureSignalTargetMv: poweredFile.temperatureSignalTargetMv,
  displayResponseLastUpdateMs: 50_000,
  lastUpdateMs: 50_000,
  heatCapacityGuidePhysicsState: {
    ...guidePumpReadyFile.heatCapacityGuidePhysicsState,
    amountMol: guideTargetVisibleGateAmountMol,
    internalEnergyJ: guideTargetVisibleGateInternalEnergyJ,
    gasAmountRatio: guideTargetVisibleGateAmountRatio,
    gasTemperatureK: poweredFile.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    wallTemperatureK: poweredFile.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    pumpProcesses: [],
  },
};
const guideVisibleStillBelowTarget = stepHeatCapacityWorkbenchFile(guideTargetVisibleGateFile, 50_010);
assert.equal(guideVisibleStillBelowTarget.pressureSignalTargetMv > HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true);
assert.equal((guideVisibleStillBelowTarget.pressureSignalMv ?? Number.NaN) < HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true);
assert.equal(guideVisibleStillBelowTarget.heatCapacityGuideWorkflow.step, 'pumpRequired', 'Guide should not leave pumping until visible U_p reaches the target');
const guideVisibleReachedTarget = stepHeatCapacityWorkbenchFile(guideVisibleStillBelowTarget, 50_260);
assert.equal((guideVisibleReachedTarget.pressureSignalMv ?? Number.NaN) >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true);
assert.equal(guideVisibleReachedTarget.heatCapacityGuideWorkflow.step, 'closePumpValveRequired', 'Guide should advance once the visible U_p reaches the target');

let pumpSequenceFile: WorkbenchHeatCapacityState = {
  ...guidePumpReadyFile,
  pumpValveOpen: true,
  pumpValveState: 'open' as const,
};
const pumpSequence: Array<typeof pumpSequenceFile> = [];
for (let strokeIndex = 0; strokeIndex < 30 && pumpSequenceFile.heatCapacityGuideWorkflow.step !== 'closePumpValveRequired'; strokeIndex += 1) {
  pumpSequenceFile = registerHeatCapacityPumpStroke(pumpSequenceFile, 10_000 + strokeIndex * 430);
  pumpSequence.push(pumpSequenceFile);
}
const targetReachedPump = pumpSequence[pumpSequence.length - 1];
assert.equal(targetReachedPump.heatCapacityGuideWorkflow.step, 'closePumpValveRequired');
assert.equal(targetReachedPump.pressureSignalTargetMv >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, true);
assert.equal(targetReachedPump.pressureSignalTargetMv < HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV, true);
assert.equal(targetReachedPump.pressureSafetyStatus, 'warning');
assert.equal(targetReachedPump.pressureBlockedPumping, false);

const blockedAfterTargetPump = registerHeatCapacityPumpStroke({
  ...targetReachedPump,
  pumpBulbState: 'idle',
}, 10_400);
assert.equal(blockedAfterTargetPump.pumpStrokeCount, targetReachedPump.pumpStrokeCount);
assert.equal(blockedAfterTargetPump.heatCapacityGuideWorkflow.step, 'closePumpValveRequired');
assert.equal(blockedAfterTargetPump.pumpHint, '请关闭打气阀门。');

const sampledWorkbenchFile = captureHeatCapacityWorkbenchSample({
  ...openValvePump,
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  pumpFrequency: 0.67,
}, 'pumpPeakSample', 10_200);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpValveOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.stopcockOpen, true);
assert.equal(sampledWorkbenchFile.heatCapacityProcessSamples.pumpPeakSample?.pumpFrequency, 0.67);

const profiledSampleSource = {
  ...openValvePump,
  heatCapacityMode: 'demo' as const,
  gasPressureKPaAbs: openValvePump.ambientPressureKPa + (
    88 - openValvePump.pressureInitialBiasMv + openValvePump.pressureZeroOffset
  ) / openValvePump.pressureSensitivityMvPerKPa,
  gasTemperatureK: openValvePump.ambientTemperatureK +
    6 / DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvPerK,
  sensorTemperatureK: openValvePump.ambientTemperatureK +
    6 / DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvPerK,
  pressureSignalMv: 88,
  pressureSignalMvRaw: 88,
  pressureSignalMvDisplayed: 88,
  pressureSignalTargetMv: 88,
  pressureDeltaKPa: 4.4,
  temperatureSignalMv: initialTemperatureMv + 6,
  temperatureSignalTargetMv: initialTemperatureMv + 6,
  heatCapacityExperimentProfile: {
    ...demoTeachingProfile,
    gammaTarget: calculateHeatCapacityGammaFromDisplayedSignals(0, 116, 33),
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
  profiledSampleSource,
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
const actualSample = captureHeatCapacityWorkbenchSample(
  profiledSampleSource,
  'stableBeforeReleaseSample',
  profiledSampleSource.lastUpdateMs ?? 10_300,
  { applyProfile: false },
);
assert.equal(actualSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.pressureSignalMv, 88, 'user recording should preserve the current instrument reading instead of the profile U1');
assert.equal(actualSample.heatCapacityProcessSamples.stableBeforeReleaseSample?.temperatureSignalMv, initialTemperatureMv + 6, 'user recording should preserve the current temperature reading so unstable data is rejected upstream');

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
assert.equal(suitablePump.pumpStrokeCount > openValvePump.pumpStrokeCount, true);
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
}), true);

const nearZeroFreeSensorState = {
  ...defaultFile.heatCapacityFreeInstrumentState.sensor,
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
  heatCapacityFreeInstrumentState: {
    ...defaultFile.heatCapacityFreeInstrumentState,
    sensor: nearZeroFreeSensorState,
    calibration: {
      ...defaultFile.heatCapacityFreeInstrumentState.calibration,
      zeroEvents: [],
    },
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
const explicitZeroAdjustedFreeFile = setHeatCapacityPressureZeroOffset(
  passiveNearZeroFreeFile,
  0,
  'fineWheel',
  0,
  10_600,
);
const explicitZeroFreeFile = stepHeatCapacityWorkbenchFile({
  ...explicitZeroAdjustedFreeFile,
  heatCapacityFreeInstrumentState: {
    ...explicitZeroAdjustedFreeFile.heatCapacityFreeInstrumentState,
    sensor: nearZeroFreeSensorState,
  },
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

const restoredDomainOpen = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: freeZeroingOpen.id,
  selectedPanel: 'preview',
  files: [{
    ...freeZeroingOpen,
    stopcockAngleDeg: 359,
    glassPistonState: 'open',
    pressureSignalMv: 0,
  }],
});

const restoredDomainOpenFile = restoredDomainOpen.files[0];
assert.equal(restoredDomainOpenFile.kind, 'heatCapacity');
assert.equal(
  restoredDomainOpenFile.stopcockAngleDeg,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
);
assert.equal(restoredDomainOpenFile.glassPistonState, 'open');
assert.equal(restoredDomainOpenFile.heatCapacityReleaseState.purpose, 'zeroing');
assert.equal(
  selectActiveHeatCapacityFreeDomain(restoredDomainOpenFile).releaseState.phase,
  'open',
  'a valid domain-open fixture must restore the top-level instrument as open',
);

const restoredStaleTopLevel = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [{
    ...defaultFile,
    powerOn: true,
    stopcockAngleDeg: 359,
    glassPistonState: 'open',
    heatCapacityReleaseState: {
      ...defaultFile.heatCapacityReleaseState,
      phase: 'open',
      purpose: 'zeroing',
      attemptId: 1,
      phaseStartedAtS: 0,
      openingStartedAtS: 0,
      openingCompletedAtS: 0,
    },
  }],
});
const restoredStaleTopLevelFile = restoredStaleTopLevel.files[0];
assert.equal(restoredStaleTopLevelFile.kind, 'heatCapacity');
assert.equal(
  restoredStaleTopLevelFile.stopcockAngleDeg,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
);
assert.equal(restoredStaleTopLevelFile.glassPistonState, 'closed');
assert.equal(restoredStaleTopLevelFile.heatCapacityReleaseState.phase, 'closed');
assert.equal(
  selectActiveHeatCapacityFreeDomain(restoredStaleTopLevelFile).releaseState.phase,
  'closed',
  'the active domain must repair a stale top-level open projection',
);

const storedFileMissingInstrumentFields = { ...defaultFile } as Record<string, unknown>;
delete storedFileMissingInstrumentFields.stopcockAngleDeg;
delete storedFileMissingInstrumentFields.pressureZeroed;
delete storedFileMissingInstrumentFields.temperatureSignalMv;
delete storedFileMissingInstrumentFields.pressureSignalMv;

const restoredFromIncompleteFile = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [storedFileMissingInstrumentFields],
});

const restoredIncompleteHeatFile = restoredFromIncompleteFile.files[0];
assert.equal(restoredIncompleteHeatFile.kind, 'heatCapacity');
assert.equal(restoredIncompleteHeatFile.powerOn, false);
assert.equal(restoredIncompleteHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(restoredIncompleteHeatFile.glassPistonState, 'closed');
assert.equal(restoredIncompleteHeatFile.pressureZeroed, false);
assert.equal(restoredIncompleteHeatFile.temperatureSignalMv, null);
assert.equal(restoredIncompleteHeatFile.pressureSignalMv, null);
assert.equal(restoredIncompleteHeatFile.pumpValveOpen, false);
assert.equal(restoredIncompleteHeatFile.pumpFrequencyStatus, 'idle');
assert.deepEqual(restoredIncompleteHeatFile.pumpStrokeTimestamps, []);

const invalidTimerPhysicsFile = {
  ...defaultFile,
  heatCapacityFreeInstrumentState: {
    ...defaultFile.heatCapacityFreeInstrumentState,
    physics: {
      ...defaultFile.heatCapacityFreeInstrumentState.physics,
      lastPumpStrokeAtS: 'bad',
    },
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
  invalidTimerPhysicsRestoredFile.heatCapacityFreeInstrumentState.physics.lastPumpStrokeAtS,
  null,
  'restoring Free physics should discard invalid timer anchors',
);

const storedOpenReleaseState = advanceHeatCapacityReleaseState(
  beginHeatCapacityReleaseOpening(defaultFile.heatCapacityReleaseState, 'zeroing', 0),
  HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs / 1000,
).state;
const storedOpenStopcockFile = {
  ...defaultFile,
  heatCapacityReleaseState: storedOpenReleaseState,
  heatCapacityFreeRealDomain: {
    ...defaultFile.heatCapacityFreeRealDomain,
    releaseState: storedOpenReleaseState,
  },
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  glassPistonState: 'open' as const,
};
const restoredFromOpenStopcockFile = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [storedOpenStopcockFile],
});
const restoredOpenStopcockHeatFile = restoredFromOpenStopcockFile.files[0];
assert.equal(restoredOpenStopcockHeatFile.kind, 'heatCapacity');
assert.equal(restoredOpenStopcockHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
assert.equal(restoredOpenStopcockHeatFile.glassPistonState, 'open');

const storedClosedStopcockFile = { ...defaultFile, stopcockAngleDeg: 90, glassPistonState: 'closed' };
const restoredFromClosedStopcockFile = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: defaultFile.id,
  selectedPanel: 'preview',
  files: [storedClosedStopcockFile],
});
const restoredClosedStopcockHeatFile = restoredFromClosedStopcockFile.files[0];
assert.equal(restoredClosedStopcockHeatFile.kind, 'heatCapacity');
assert.equal(restoredClosedStopcockHeatFile.stopcockAngleDeg, HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);
assert.equal(restoredClosedStopcockHeatFile.glassPistonState, 'closed');

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
  /guideRollbackAnimation=\{guideHeatCapacityRollback\?\.animation \?\? null\}/,
  'guide-mode rollback animation should remain a scene-local visual path rather than a high-frequency Workbench state update',
);

console.log('workbenchHeatCapacityInstrument tests passed');
