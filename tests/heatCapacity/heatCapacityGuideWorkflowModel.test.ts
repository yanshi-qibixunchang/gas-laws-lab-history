import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
  deriveHeatCapacityGuideExperimentTimer,
} from '../../src/domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import {
  applyGuidePumpStroke,
  createDefaultGuidePhysicsConfig,
  createDefaultGuidePhysicsState,
  deriveGuidePhysicalState,
  stepGuidePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  createDefaultHeatCapacityGuideWorkflow,
  getHeatCapacityGuideActionGuard,
  getHeatCapacityGuideTargetControlId,
  transitionHeatCapacityGuideWorkflow,
} from '../../src/domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
} from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';

{
  const trial0 = createHeatCapacityGuideTrial('guide-trial-1');
  const trial1 = recordGuideU0(trial0, {
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: 1499.04,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  });
  const trial2 = recordGuideU1(trial1, {
    atS: 300,
    displayPressureMv: 120.09,
    displayTemperatureMv: 1499.08,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  });
  const trial3 = recordGuideU2(trial2, {
    atS: 600,
    displayPressureMv: 30.04,
    displayTemperatureMv: 1499.02,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }, 12_345);

  assert.equal(trial3.source, 'guide');
  assert.equal(trial3.u1?.displayPressureMv, 120);
  assert.equal(trial3.u2?.displayPressureMv, 30);
  assert.equal(trial3.completedAtMs, 12_345);
  assert.equal(trial3.correctedSignals?.gamma !== null, true);
  assert.equal(trial3.eventLog.some((entry) => entry.type === 'record'), true);
}

{
  const config = createDefaultGuidePhysicsConfig();
  assert.equal(config.vesselVolumeL, 2);
  assert.equal(config.pumpAmountGainRatio, 0.00345);
  assert.equal(config.pumpPressureLimitKPa, 109);
  assert.equal(config.stopcockFlowRate, 5.25);
  assert.deepEqual(config.thermal, {
    gasWallConductanceWPerK: 0.14,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  });
  const state0 = createDefaultGuidePhysicsState(config);
  const pumpResult = applyGuidePumpStroke(state0, config, {
    powerOn: true,
    pumpValveOpen: true,
    stopcockOpen: false,
  }, {
    atS: 0,
    strength: 1,
  });
  assert.equal(pumpResult.accepted, true);
  assert.equal(pumpResult.state.pumpProcesses.length, 1);

  const midStroke = stepGuidePhysicsState(pumpResult.state, config, {
    dtS: 0.04,
    powerOn: true,
    pumpValveOpen: true,
    stopcockOpen: false,
  });
  const afterStroke = stepGuidePhysicsState(midStroke, config, {
    dtS: 0.08,
    powerOn: true,
    pumpValveOpen: true,
    stopcockOpen: false,
  });
  assert.equal(deriveGuidePhysicalState(midStroke, config).pressureDeltaKPa > 0, true);
  assert.equal(afterStroke.gasAmountRatio > state0.gasAmountRatio, true);
  assert.equal(afterStroke.pumpProcesses.length, 0);

  const recovered = stepGuidePhysicsState({
    ...afterStroke,
    gasTemperatureK: config.environment.ambientTemperatureK + 10,
  }, config, {
    dtS: 60,
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  });
  assert.equal(recovered.gasTemperatureK < config.environment.ambientTemperatureK + 10, true);
}

{
  const source = readFileSync(
    join(process.cwd(), 'src/domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts'),
    'utf8',
  );
  assert.doesNotMatch(source, /Leakage|leakage|EnvironmentDisturbance|environmentDisturbance/);
  assert.doesNotMatch(source, /PressureSensorNonlinearity|pressureNonlinearity/);
  assert.doesNotMatch(source, /PumpValveExchange|pumpValveExchange/);
}

{
  const workflow0 = createDefaultHeatCapacityGuideWorkflow();
  assert.equal(workflow0.step, 'powerRequired');
  assert.equal(getHeatCapacityGuideTargetControlId(workflow0.step), 'powerSwitch');

  const powerGuard = getHeatCapacityGuideActionGuard(workflow0, {
    action: 'togglePower',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 0,
  });
  assert.equal(powerGuard.allowed, true);
  assert.equal(powerGuard.message, '电源已打开。');

  const workflow1 = transitionHeatCapacityGuideWorkflow(workflow0, {
    action: 'togglePower',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 0,
  });
  assert.equal(workflow1.step, 'openStopcockForZeroRequired');

  const wrongGuard = getHeatCapacityGuideActionGuard(workflow1, {
    action: 'recordU0',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 0,
  });
  assert.equal(wrongGuard.allowed, false);
  assert.equal(wrongGuard.message, '请先打开玻璃旋塞。');
  assert.equal(wrongGuard.targetControlId, 'stopcock');
}

{
  const recordedU0 = {
    ...createDefaultHeatCapacityGuideWorkflow(),
    step: 'recordU0Required' as const,
  };
  const afterRecord = transitionHeatCapacityGuideWorkflow(recordedU0, {
    action: 'recordU0',
    powerOn: true,
    stopcockOpen: true,
    pumpValveOpen: false,
    displayPressureMv: 0,
  });
  assert.equal(afterRecord.step, 'closeStopcockBeforePumpRequired');

  const afterClose = transitionHeatCapacityGuideWorkflow(afterRecord, {
    action: 'closeStopcock',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 0,
  });
  assert.equal(afterClose.step, 'openPumpValveRequired');
}

{
  const workflow = {
    ...createDefaultHeatCapacityGuideWorkflow(),
    step: 'pumpRequired' as const,
  };
  const blocked = getHeatCapacityGuideActionGuard(workflow, {
    action: 'closePumpValve',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: true,
    displayPressureMv: 119.9,
  });
  const allowed = getHeatCapacityGuideActionGuard(workflow, {
    action: 'closePumpValve',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: true,
    displayPressureMv: 120,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.message, '请连续打气，直到 Uₚ ≥ 120 mV。');
  assert.equal(allowed.allowed, true);
}

{
  const u1Waiting = {
    ...createDefaultHeatCapacityGuideWorkflow(),
    step: 'u1Waiting' as const,
    waitStage: 'u1' as const,
    waitStartedAtS: 10,
  };
  const timerBefore = deriveHeatCapacityGuideExperimentTimer(u1Waiting, 10 + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S - 1);
  assert.equal(timerBefore.stage, 'u1-wait');
  assert.equal(timerBefore.complete, false);
  const timerReady = deriveHeatCapacityGuideExperimentTimer(u1Waiting, 10 + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S);
  assert.equal(timerReady.stage, 'u1-ready');
  assert.equal(timerReady.complete, true);

  const prematureRecord = getHeatCapacityGuideActionGuard(u1Waiting, {
    action: 'recordU1',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 120,
    simulationTimeS: 10 + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S - 1,
  });
  assert.equal(prematureRecord.allowed, false);
  assert.equal(prematureRecord.message, '请等待计时器达到 5 min。');

  const workflowReady = transitionHeatCapacityGuideWorkflow(u1Waiting, {
    action: 'timerComplete',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 120,
    simulationTimeS: 10 + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
  });
  assert.equal(workflowReady.step, 'recordU1Required');
  assert.equal(workflowReady.paused, true);
  assert.equal(workflowReady.strongReminderTargetControlId, 'recordU1');

  const readyGuard = getHeatCapacityGuideActionGuard(u1Waiting, {
    action: 'timerComplete',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 120,
    simulationTimeS: 10 + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
  });
  assert.equal(readyGuard.allowed, true);
  assert.equal(readyGuard.message, 'U₁ 等待完成。');
}

{
  const workflow = {
    ...createDefaultHeatCapacityGuideWorkflow(),
    step: 'recordU2Required' as const,
    paused: true,
  };
  const afterRecord = transitionHeatCapacityGuideWorkflow(workflow, {
    action: 'recordU2',
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 30,
  });
  assert.equal(afterRecord.step, 'closePowerRequired');
  assert.equal(afterRecord.paused, true);
  assert.equal(afterRecord.strongReminderTargetControlId, 'powerSwitch');

  const completed = transitionHeatCapacityGuideWorkflow(afterRecord, {
    action: 'togglePower',
    powerOn: false,
    stopcockOpen: false,
    pumpValveOpen: false,
    displayPressureMv: 30,
  });
  assert.equal(completed.step, 'completed');
  assert.equal(completed.strongReminderActive, false);
}

console.log('heatCapacityGuideWorkflowModel tests passed');
