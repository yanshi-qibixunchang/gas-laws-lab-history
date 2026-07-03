import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  abortHeatCapacityGuideWorkbenchState,
  applyHeatCapacityGuideRecordWorkbenchState,
  createDefaultHeatCapacityFile,
  enterHeatCapacityFreeModeWorkbenchState,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  prepareHeatCapacityAutoDemoStart,
  powerHeatCapacityWorkbenchFile,
  registerHeatCapacityPumpStroke,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityPressureZeroOffset,
  startHeatCapacityGuideWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';

const createBaseFile = (): WorkbenchHeatCapacityState => createDefaultHeatCapacityFile(1);
const workbenchStateSource = readFileSync(
  join(process.cwd(), 'src/features/workbench/workbenchState.ts'),
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
  assert.deepEqual(demo.heatCapacityFreeTrials, []);
  assert.equal(demo.heatCapacityGuideTrial, null);
}

{
  const free = enterHeatCapacityFreeModeWorkbenchState(createBaseFile());

  assert.equal(free.heatCapacityMode, 'free');
  assert.equal(free.heatCapacityExperimentProfile, null);
  assert.deepEqual(free.heatCapacityFreeTrials, []);
  assert.equal(free.heatCapacityGuideTrial, null);
}

{
  const guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), 10_000);

  assert.equal(guide.heatCapacityMode, 'guide');
  assert.deepEqual(guide.heatCapacityFreeTrials, []);
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
  assert.deepEqual(aborted.heatCapacityFreeTrials, []);
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

  guide = setHeatCapacityGuideStopcockOpen(guide, true, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');

  guide = stepHeatCapacityWorkbenchFile(guide, now += 350);
  guide = setHeatCapacityGuideStopcockOpen(guide, false, now += 1);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'u2Waiting');
  const u2WaitStartedAtS = guide.heatCapacityGuideWorkflow.waitStartedAtS ?? Number.NaN;

  guide = stepHeatCapacityWorkbenchFile(guide, now + Math.ceil((300 / 16) * 1000) + 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'recordU2Required');
  assert.equal(Math.abs(guide.heatCapacityGuidePhysicsState.simulationTimeS - (u2WaitStartedAtS + 300)) < 1e-6, true);

  const u2Attempt = applyHeatCapacityGuideRecordWorkbenchState(guide, 'u2', now += 20_000);
  assert.equal(u2Attempt.accepted, true);
  guide = u2Attempt.file;
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'closePowerRequired');
  assert.notEqual(guide.heatCapacityGuideTrial?.correctedSignals, null);
  assert.equal(guide.heatCapacityFreeTrials.length, 0);

  guide = powerHeatCapacityWorkbenchFile(guide, false, now += 100);
  assert.equal(guide.heatCapacityGuideWorkflow.step, 'completed');
  assert.equal(guide.heatCapacityMode, 'free');
  assert.equal(guide.runState, 'finished');
  assert.notEqual(guide.heatCapacityGuideTrial, null);
  assert.equal(guide.heatCapacityGuideTrial?.source, 'guide');
  assert.equal(guide.heatCapacityFreeTrials.length, 0);
}

{
  let now = 30_000;
  let guide = startHeatCapacityGuideWorkbenchState(createBaseFile(), now);
  guide = powerHeatCapacityWorkbenchFile(guide, true, now += 100);
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
  workbenchStateSource,
  /isHeatCapacityPhysicalKernelMode[\s\S]{0,120}mode === 'free' \|\| mode === 'guide'/,
  'Guide and Free must not share one broad physical-kernel mode predicate',
);

assert.doesNotMatch(
  workbenchStateSource,
  /getHeatCapacityFreeStopcockFlowPurpose[\s\S]{0,500}heatCapacityMode === 'guide'/,
  'Free stopcock-flow purpose must not inspect Guide teaching state',
);
