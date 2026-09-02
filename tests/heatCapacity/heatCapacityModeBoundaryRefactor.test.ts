import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  abortHeatCapacityGuideWorkbenchState,
  applyHeatCapacityGuideRecordWorkbenchState,
  completeHeatCapacityTeachingModeWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  enterHeatCapacityFreeModeWorkbenchState,
  exitHeatCapacityTeachingModeWorkbenchState,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  prepareHeatCapacityAutoDemoStart,
  powerHeatCapacityWorkbenchFile,
  registerHeatCapacityPumpStroke,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityPressureZeroOffset,
  shouldCommitHeatCapacityRealtimeTick,
  startHeatCapacityGuideWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const createBaseFile = (): WorkbenchHeatCapacityState => createDefaultHeatCapacityFile(1);
const workbenchStateSource = readFileSync(
  join(process.cwd(), 'src/features/workbench/workbenchState.ts'),
  'utf8',
);
const instrumentStateSource = readFileSync(
  join(process.cwd(), 'src/features/workbench/workbenchHeatCapacityInstrumentState.ts'),
  'utf8',
);

const stabilizeGuidePressureZero = (
  file: WorkbenchHeatCapacityState,
  startMs: number,
) => {
  let guide = file;
  const zeroOffset = -file.pressureInitialBiasMv;
  const knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffset);
  for (let sampleIndex = 0; sampleIndex < 5; sampleIndex += 1) {
    guide = setHeatCapacityPressureZeroOffset(
      guide,
      zeroOffset,
      'coarseDrag',
      knobAngle,
      startMs + sampleIndex * 200,
    );
  }
  return guide;
};

{
  const demo = prepareHeatCapacityAutoDemoStart(createBaseFile(), 1234);

  assert.equal(demo.heatCapacityMode, 'demo');
  assert.notEqual(demo.heatCapacityExperimentProfile, null);
  assert.deepEqual(demo.heatCapacityFreeRunWorkspace.trials, []);
  assert.equal(demo.heatCapacityGuideTrial, null);
}

{
  const free = enterHeatCapacityFreeModeWorkbenchState(createBaseFile());

  assert.equal(free.heatCapacityMode, 'free');
  assert.equal(free.heatCapacityExperimentProfile, null);
  assert.deepEqual(free.heatCapacityFreeRunWorkspace.trials, []);
  assert.equal(free.heatCapacityGuideTrial, null);
}

{
  const guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), 10_000);

  assert.equal(guide.heatCapacityMode, 'guide');
  assert.deepEqual(guide.heatCapacityFreeRunWorkspace.trials, []);
  assert.equal(guide.heatCapacityExperimentProfile, null);
  assert.notEqual(guide.heatCapacityGuideTrial, null);
  assert.equal(guide.heatCapacityGuideTrial?.source, 'guide');
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'powerRequired');
}

{
  const guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), 10_000);
  const aborted = abortHeatCapacityGuideWorkbenchState(guide, 11_000);

  assert.equal(aborted.heatCapacityMode, 'free');
  assert.equal(aborted.heatCapacityGuideTrial, null);
  assert.deepEqual(aborted.heatCapacityFreeRunWorkspace.trials, []);
}

{
  const guide = {
    ...startHeatCapacityGuideWorkbenchState(createBaseFile(), 10_000),
    powerOn: true,
  };
  const initialized = stepHeatCapacityWorkbenchFile(guide, 10_000);
  const stepped = stepHeatCapacityWorkbenchFile(initialized, 11_000);

  assert.equal(stepped.heatCapacityMode, 'guide');
  assert.equal(stepped.heatCapacityGuidePhysicsState.simulationTimeS > 0, true);
  assert.equal(
    stepped.heatCapacityFreePhysicsState.simulationTimeS,
    guide.heatCapacityFreePhysicsState.simulationTimeS,
    'Guide stepping must not advance the Free runtime state',
  );
}

{
  let now = 20_000;
  let guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), now);
  guide = powerHeatCapacityWorkbenchFile(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'preheatRequired');
  guide = completeHeatCapacityGuidePreheatWorkbenchState(guide, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'openStopcockForZeroRequired');

  guide = setHeatCapacityGuideStopcockOpen(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'zeroRequired');

  guide = stabilizeGuidePressureZero(guide, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'recordU0Required');

  const u0Attempt = applyHeatCapacityGuideRecordWorkbenchState(guide, 'u0', now += 100);
  assert.equal(u0Attempt.accepted, true);
  guide = u0Attempt.file;
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closeStopcockBeforePumpRequired');

  guide = setHeatCapacityGuideStopcockOpen(guide, false, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'openPumpValveRequired');

  guide = setHeatCapacityGuidePumpValveOpen(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'pumpRequired');

  for (let strokeIndex = 0; strokeIndex < 40 && guide.heatCapacityGuideWorkflow.step !== 'closePumpValveRequired'; strokeIndex += 1) {
    guide = registerHeatCapacityPumpStroke(guide, now += 430);
  }
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closePumpValveRequired');
  assert.equal(guide.pressureSignalMvDisplayed >= 120, true);

  guide = setHeatCapacityGuidePumpValveOpen(guide, false, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'u1Waiting');
  const u1WaitStartedAtS = guide.heatCapacityGuideWorkflow.waitStartedAtS ?? Number.NaN;

  guide = setHeatCapacityGuideEquilibriumSpeedMultiplier(guide, 16, now += 100);
  guide = stepHeatCapacityWorkbenchFile(guide, now + Math.ceil((300 / 16) * 1000) + 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'recordU1Required');
  assert.equal(Math.abs(guide.heatCapacityGuidePhysicsState.simulationTimeS - (u1WaitStartedAtS + 300)) < 1e-6, true);

  const u1Attempt = applyHeatCapacityGuideRecordWorkbenchState(guide, 'u1', now += 20_000);
  assert.equal(u1Attempt.accepted, true);
  guide = u1Attempt.file;
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'openStopcockForReleaseRequired');

  const releaseReadyGuide = guide;
  const releaseReadyNow = now;

  let quickToggleNow = releaseReadyNow + 100;
  let quickToggleGuide = setHeatCapacityGuideStopcockOpen(releaseReadyGuide, true, quickToggleNow);
  quickToggleGuide = stepHeatCapacityWorkbenchFile(quickToggleGuide, quickToggleNow += 200);
  quickToggleGuide = setHeatCapacityGuideStopcockOpen(quickToggleGuide, false, quickToggleNow += 1);
  assert.equal(quickToggleGuide.heatCapacityGuideWorkflow.step, 'openStopcockForReleaseRequired');
  assert.equal(quickToggleGuide.heatCapacityGuideWorkflow.paused, false);
  assert.equal(quickToggleGuide.heatCapacityReleaseState.formedRelease, false);
  assert.equal(quickToggleGuide.heatCapacityGuideWorkflow.wrongActionCount, 0);
  quickToggleGuide = stepHeatCapacityWorkbenchFile(
    quickToggleGuide,
    quickToggleNow += HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs,
  );
  assert.equal(quickToggleGuide.heatCapacityGuideWorkflow.step, 'openStopcockForReleaseRequired');

  let userCloseNow = releaseReadyNow + 100;
  let userCloseGuide = setHeatCapacityGuideStopcockOpen(releaseReadyGuide, true, userCloseNow);
  userCloseGuide = stepHeatCapacityWorkbenchFile(
    userCloseGuide,
    userCloseNow += HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs + 150,
  );
  assert.equal(userCloseGuide.heatCapacityReleaseState.formedRelease, true);
  assert.equal(userCloseGuide.heatCapacityGuideWorkflow.step, 'openStopcockForReleaseRequired');
  userCloseGuide = setHeatCapacityGuideStopcockOpen(userCloseGuide, false, userCloseNow += 1);
  assert.equal(userCloseGuide.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  assert.equal(userCloseGuide.heatCapacityGuideWorkflow.paused, true);
  assert.equal(userCloseGuide.heatCapacityReleaseState.phase, 'closing');
  assert.equal(userCloseGuide.heatCapacityGuideWorkflow.wrongActionCount, 0);
  const userCloseBeforeAnimationComplete = stepHeatCapacityWorkbenchFile(
    userCloseGuide,
    userCloseNow += HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs - 1,
  );
  assert.equal(userCloseBeforeAnimationComplete.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  assert.equal(userCloseBeforeAnimationComplete.heatCapacityGuideWorkflow.paused, true);
  userCloseGuide = stepHeatCapacityWorkbenchFile(userCloseBeforeAnimationComplete, userCloseNow += 1);
  assert.equal(userCloseGuide.heatCapacityGuideWorkflow.step, 'u2Waiting');
  assert.equal(userCloseGuide.heatCapacityGuideWorkflow.paused, false);
  assert.equal(
    shouldCommitHeatCapacityRealtimeTick(userCloseBeforeAnimationComplete, userCloseGuide),
    true,
    'The UI tick must commit a pure guide-workflow transition after the close animation finishes',
  );

  let equilibriumBoundaryNow = releaseReadyNow + 100;
  let equilibriumBoundaryGuide = setHeatCapacityGuideStopcockOpen(
    releaseReadyGuide,
    true,
    equilibriumBoundaryNow,
  );
  equilibriumBoundaryNow += HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs;
  equilibriumBoundaryGuide = stepHeatCapacityWorkbenchFile(
    equilibriumBoundaryGuide,
    equilibriumBoundaryNow,
  );
  let equilibriumCrossingAtMs: number | null = null;
  for (let probeIndex = 0; probeIndex < 200; probeIndex += 1) {
    const candidateAtMs = equilibriumBoundaryNow + 5;
    const candidate = stepHeatCapacityWorkbenchFile(equilibriumBoundaryGuide, candidateAtMs);
    if (candidate.heatCapacityGuideWorkflow.step === 'closeStopcockAfterReleaseRequired') {
      equilibriumCrossingAtMs = candidateAtMs;
      break;
    }
    equilibriumBoundaryGuide = candidate;
    equilibriumBoundaryNow = candidateAtMs;
  }
  assert.notEqual(equilibriumCrossingAtMs, null, 'The release should reach equilibrium inside the boundary probe window');
  const boundaryClosedGuide = setHeatCapacityGuideStopcockOpen(
    equilibriumBoundaryGuide,
    false,
    equilibriumCrossingAtMs!,
  );
  assert.equal(boundaryClosedGuide.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  assert.equal(boundaryClosedGuide.heatCapacityGuideWorkflow.paused, true);
  assert.equal(boundaryClosedGuide.heatCapacityReleaseState.phase, 'closing');
  assert.equal(boundaryClosedGuide.heatCapacityGuideWorkflow.wrongActionCount, 0);
  assert.equal(
    boundaryClosedGuide.heatCapacityGuideWorkflow.releaseCloseResumeAtMs,
    equilibriumCrossingAtMs! + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs,
    'A close click on the equilibrium-crossing tick should atomically finish release detection and start closing',
  );
  const boundaryBeforeDeadline = stepHeatCapacityWorkbenchFile(
    boundaryClosedGuide,
    boundaryClosedGuide.heatCapacityGuideWorkflow.releaseCloseResumeAtMs! - 1,
  );
  assert.equal(boundaryBeforeDeadline.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  const boundaryAtDeadline = stepHeatCapacityWorkbenchFile(
    boundaryBeforeDeadline,
    boundaryClosedGuide.heatCapacityGuideWorkflow.releaseCloseResumeAtMs!,
  );
  assert.equal(boundaryAtDeadline.heatCapacityGuideWorkflow.step, 'u2Waiting');
  assert.equal(boundaryAtDeadline.heatCapacityGuideWorkflow.paused, false);
  assert.equal(
    shouldCommitHeatCapacityRealtimeTick(boundaryBeforeDeadline, boundaryAtDeadline),
    true,
    'The exact close-animation deadline must be committed instead of remaining stuck on the close step',
  );
  const throttledBoundaryAtDeadline = stepHeatCapacityWorkbenchFile(
    boundaryClosedGuide,
    boundaryClosedGuide.heatCapacityGuideWorkflow.releaseCloseResumeAtMs! + 60_000,
  );
  assert.equal(throttledBoundaryAtDeadline.heatCapacityGuideWorkflow.step, 'u2Waiting');
  assert.equal(throttledBoundaryAtDeadline.heatCapacityGuideWorkflow.paused, false);
  assert.equal(
    shouldCommitHeatCapacityRealtimeTick(boundaryClosedGuide, throttledBoundaryAtDeadline),
    true,
    'A heavily throttled browser tick must still finish closing and resume the guide workflow',
  );

  guide = setHeatCapacityGuideStopcockOpen(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'openStopcockForReleaseRequired');

  guide = stepHeatCapacityWorkbenchFile(
    guide,
    now += HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
      HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1000,
  );
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  assert.equal(guide.heatCapacityGuideWorkflow.paused, true);
  assert.equal(
    guide.heatCapacityReleaseState.releaseDurationS >= 0.28 &&
      guide.heatCapacityReleaseState.releaseDurationS <= 0.40,
    true,
    'Guide physical release cue should retain its established sub-0.5 s duration instead of matching the scoring window',
  );
  const frozenReleaseState = guide;
  guide = stepHeatCapacityWorkbenchFile(guide, now += 10_000);
  assert.equal(
    guide.heatCapacityGuidePhysicsState.simulationTimeS,
    frozenReleaseState.heatCapacityGuidePhysicsState.simulationTimeS,
    'Guide release equilibrium should freeze simulation time while the user decides when to close',
  );
  assert.equal(guide.heatCapacityGuidePhysicsState.gasAmountRatio, frozenReleaseState.heatCapacityGuidePhysicsState.gasAmountRatio);
  assert.equal(guide.heatCapacityGuidePhysicsState.gasTemperatureK, frozenReleaseState.heatCapacityGuidePhysicsState.gasTemperatureK);
  assert.equal(guide.heatCapacityGuidePhysicsState.wallTemperatureK, frozenReleaseState.heatCapacityGuidePhysicsState.wallTemperatureK);
  assert.equal(guide.heatCapacityGuideTemperatureSensorState.temperatureK, frozenReleaseState.heatCapacityGuideTemperatureSensorState.temperatureK);
  assert.equal(guide.heatCapacityReleaseState.releaseDurationS, frozenReleaseState.heatCapacityReleaseState.releaseDurationS);
  guide = setHeatCapacityGuideStopcockOpen(guide, false, now += 1);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  assert.equal(guide.heatCapacityGuideWorkflow.paused, true);
  const closingFrozenTimeS = guide.heatCapacityGuidePhysicsState.simulationTimeS;
  guide = stepHeatCapacityWorkbenchFile(
    guide,
    now += HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs - 1,
  );
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  assert.equal(guide.heatCapacityGuidePhysicsState.simulationTimeS, closingFrozenTimeS);
  const guideBeforeCloseAnimationComplete = guide;
  guide = stepHeatCapacityWorkbenchFile(
    guide,
    now += 1,
  );
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'u2Waiting');
  const legacyRealtimeFieldsChanged =
    guide.pumpFrequency !== guideBeforeCloseAnimationComplete.pumpFrequency ||
    guide.pumpFrequencyStatus !== guideBeforeCloseAnimationComplete.pumpFrequencyStatus ||
    guide.pumpBulbState !== guideBeforeCloseAnimationComplete.pumpBulbState ||
    guide.pumpHint !== guideBeforeCloseAnimationComplete.pumpHint ||
    guide.pumpStrokeTimestamps.length !== guideBeforeCloseAnimationComplete.pumpStrokeTimestamps.length ||
    guide.simulationTimeS !== guideBeforeCloseAnimationComplete.simulationTimeS ||
    guide.pressureSignalMv !== guideBeforeCloseAnimationComplete.pressureSignalMv ||
    guide.temperatureSignalMv !== guideBeforeCloseAnimationComplete.temperatureSignalMv ||
    guide.heatCapacityPhase !== guideBeforeCloseAnimationComplete.heatCapacityPhase;
  assert.equal(
    shouldCommitHeatCapacityRealtimeTick(guideBeforeCloseAnimationComplete, guide),
    true,
    'The shared comparator must commit the pure paused close-animation transition',
  );
  assert.equal(
    legacyRealtimeFieldsChanged,
    false,
    'The legacy physical-field filter reproduces the stuck close step by discarding the pure workflow transition',
  );
  const u2WaitStartedAtS = guide.heatCapacityGuideWorkflow.waitStartedAtS ?? Number.NaN;

  guide = stepHeatCapacityWorkbenchFile(guide, now + Math.ceil((300 / 16) * 1000) + 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'recordU2Required');
  assert.equal(Math.abs(guide.heatCapacityGuidePhysicsState.simulationTimeS - (u2WaitStartedAtS + 300)) < 1e-6, true);

  const u2Attempt = applyHeatCapacityGuideRecordWorkbenchState(guide, 'u2', now += 20_000);
  assert.equal(u2Attempt.accepted, true);
  guide = u2Attempt.file;
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closePowerRequired');
  assert.notEqual(guide.heatCapacityGuideTrial?.correctedSignals, null);
  assert.equal(guide.heatCapacityFreeRunWorkspace.trials.length, 0);

  guide = powerHeatCapacityWorkbenchFile(guide, false, now += 100);
  assert.equal(guide.heatCapacityMode, 'guide');
  assert.equal(guide.heatCapacityTeachingStatus, 'completed');
  assert.equal(guide.runState, 'idle');
  assert.equal(guide.heatCapacityPhase, 'powerOff');
  assert.equal(guide.powerOn, false);
  assert.notEqual(guide.heatCapacityGuideTrial, null);
  assert.notEqual(guide.heatCapacityGuideTrial?.correctedSignals, null);
  assert.equal(guide.heatCapacityFreeRunWorkspace.trials.length, 0);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'completed');

  const exitedGuide = exitHeatCapacityTeachingModeWorkbenchState(guide, now += 100);
  assert.equal(exitedGuide.heatCapacityMode, 'free');
  assert.equal(exitedGuide.heatCapacityTeachingStatus, 'idle');
  assert.equal(exitedGuide.heatCapacityGuideTrial, null);
  assert.equal(exitedGuide.heatCapacityGuideWorkflow.step, 'powerRequired');

  const poweredFree = powerHeatCapacityWorkbenchFile(
    configureHeatCapacityFreeBatchWorkbenchState(exitedGuide, 3, now += 50),
    true,
    now += 100,
  );
  assert.equal(poweredFree.heatCapacityMode, 'free');
  assert.equal(poweredFree.powerOn, true);
  assert.notEqual(poweredFree.heatCapacityMode, 'guide');
  assert.equal(poweredFree.heatCapacityGuideWorkflow.step, 'powerRequired');
}

{
  const demo = prepareHeatCapacityAutoDemoStart(createBaseFile(), 60_000);
  const completedDemo = completeHeatCapacityTeachingModeWorkbenchState(demo, 61_000);
  assert.equal(completedDemo.heatCapacityMode, 'demo');
  assert.equal(completedDemo.heatCapacityTeachingStatus, 'completed');
  assert.equal(completedDemo.runState, 'idle');
  assert.equal(completedDemo.powerOn, false);
  assert.notEqual(completedDemo.heatCapacityGuideTrial, null);
  assert.equal(completedDemo.heatCapacityGuideTrial?.source, 'demo');
  assert.notEqual(completedDemo.heatCapacityGuideTrial?.correctedSignals, null);

  const exitedDemo = exitHeatCapacityTeachingModeWorkbenchState(completedDemo, 62_000);
  assert.equal(exitedDemo.heatCapacityMode, 'free');
  assert.equal(exitedDemo.heatCapacityTeachingStatus, 'idle');
  assert.equal(exitedDemo.heatCapacityGuideTrial, null);
  assert.equal(exitedDemo.heatCapacityExperimentProfile, null);
  assert.deepEqual(exitedDemo.heatCapacityProcessSamples, {});
}

{
  let now = 30_000;
  let guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), now);
  guide = powerHeatCapacityWorkbenchFile(guide, true, now += 100);
  guide = completeHeatCapacityGuidePreheatWorkbenchState(guide, now += 100);
  guide = setHeatCapacityGuideStopcockOpen(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'zeroRequired');

  guide = setHeatCapacityPressureZeroOffset(guide, 0, 'coarseDrag', 0, now += 100);
  assert.equal(
    guide.heatCapacityGuideWorkflow.step,
    'zeroRequired',
    'Guide U0 should not become recordable from one instantaneous zero sample',
  );
  assert.equal(
    guide.pressureZeroed,
    false,
    'Guide pressure-zero readiness should require the same stable displayed sample window as the UI',
  );

  guide = stabilizeGuidePressureZero(guide, now += 200);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'recordU0Required');
}

{
  let now = 40_000;
  let guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), now);
  guide = powerHeatCapacityWorkbenchFile(guide, true, now += 100);
  guide = completeHeatCapacityGuidePreheatWorkbenchState(guide, now += 100);
  guide = setHeatCapacityGuideStopcockOpen(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'zeroRequired');

  const zeroOffset = -guide.pressureInitialBiasMv;
  const knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffset);
  guide = setHeatCapacityPressureZeroOffset(guide, zeroOffset, 'coarseDrag', knobAngle, now += 100);
  assert.equal(guide.pressureSignalMv, 0);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'zeroRequired');

  guide = stepHeatCapacityWorkbenchFile(guide, now += 1_000);
  assert.equal(
    guide.pressureZeroed,
    true,
    'Guide should continue sampling the top-level displayed U_p after the user stops adjusting',
  );
  assert.equal(
    guide.heatCapacityGuideWorkflow.step,
    'recordU0Required',
    'Guide should release the U0 record button once the displayed U_p stays at zero',
  );
}

assert.doesNotMatch(
  instrumentStateSource,
  /isHeatCapacityPhysicalKernelMode[\s\S]{0,120}mode === 'free' \|\| mode === 'guide'/,
  'Guide and Free must not share one broad physical-kernel mode predicate',
);

assert.doesNotMatch(
  workbenchStateSource,
  /getHeatCapacityFreeStopcockFlowPurpose[\s\S]{0,500}heatCapacityMode === 'guide'/,
  'Free stopcock-flow purpose must not inspect Guide teaching state',
);

assert.doesNotMatch(
  workbenchStateSource,
  /heatCapacityPhase === 'demoComplete'[\s\S]{0,500}resetHeatCapacityForGuideExperiment/,
  'Powering on from a completed teaching flow must not route through the old Guide reset helper',
);
