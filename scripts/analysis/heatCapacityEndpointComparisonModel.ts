import {
  HEAT_CAPACITY_RELEASE_TIMING, HEAT_CAPACITY_STANDARD_OPERATION,
  createDefaultHeatCapacityFreePhysicsConfig, createDefaultHeatCapacityFreeRecordConfig,
  createDefaultHeatCapacityFreeSensorConfig,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  applyFreePumpStroke, createDefaultFreePhysicsState, deriveFreePhysicalState,
  FREE_PUMP_STROKE_DURATION_S, stepFreePhysics,
  type HeatCapacityFreeControls, type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  applyFreeZeroCalibration, captureAutomaticU0IfReady,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  createDefaultFreeSensorState, getFreeSensorDisplay, stepFreeSensor,
  type HeatCapacityFreeSensorState,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  evaluateFreeU1Record, evaluateFreeU2Record, recordFreeU0, recordFreeU1, recordFreeU2,
} from '../../src/domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import { createHeatCapacityFreeTrial } from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  advanceHeatCapacityReleaseState, beginHeatCapacityReleaseClosing, beginHeatCapacityReleaseOpening,
  createClosedHeatCapacityReleaseState, HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
} from '../../src/domain/heatCapacity/heatCapacityReleaseModel.ts';
import { truncateHeatCapacitySignalMv } from '../../src/domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import { HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  resolveHeatCapacityReleaseSoundFeedback,
} from '../../src/audio/experiments/heatCapacity/heatCapacityAudioPolicy.ts';

// Analysis-only protocol: these settings do not enter the application or its grading.
export const ENDPOINT_PROTOCOL = {
  version: 'heat-capacity-endpoint-comparison-v1',
  seeds: [11, 23, 37, 53, 71],
  reactionDelaysS: [0, 0.15, 0.3],
  stepS: HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
  refinementStepS: HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S / 2,
  observationLimitS: 5,
  fixedDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  preparation: 'preheated, zeroed at ambient; recorded U0 = 0.0 mV',
  pumpFirstToLastStartS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
  waitAfterPumpS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
  waitAfterClosingAnimationS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS,
  gas: 'air', scheme: 'real',
} as const;

export const ENDPOINT_SCENARIOS = [
  { id: 'standard', label: '标准 18 次打气', pumpStrokes: 18, flowCoefficient: 0.79 },
  { id: 'low-pressure', label: '低起始压差：4 次打气', pumpStrokes: 4, flowCoefficient: 0.79 },
  { id: 'slower-flow', label: '较慢流量：18 次打气、系数 0.4', pumpStrokes: 18, flowCoefficient: 0.4 },
] as const;
export type EndpointScenario = typeof ENDPOINT_SCENARIOS[number];
export const ENDPOINT_METHODS = ['sound-stop', 'display-zero', 'fixed-time'] as const;
export type EndpointMethod = typeof ENDPOINT_METHODS[number];

export interface EndpointObservation {
  elapsedS: number;
  flowOpen: boolean;
  pressureSampleElapsedS: number;
  displayedPressureMv: number;
  sound: Pick<ReturnType<typeof resolveHeatCapacityReleaseSoundFeedback>, 'active' | 'intensity' | 'stopReason'>;
}
export interface EndpointObserver {
  sawSound: boolean;
  sawPositivePressure: boolean;
  lastPressureSampleS: number | null;
  cueAtS: number | null;
}
export const createEndpointObserver = (): EndpointObserver => ({
  sawSound: false, sawPositivePressure: false, lastPressureSampleS: null, cueAtS: null,
});

// No physical pressure, future samples, gamma or theoretical target is available here.
export const observeEndpoint = (
  state: EndpointObserver, method: EndpointMethod, sample: EndpointObservation,
): EndpointObserver => {
  if (state.cueAtS !== null || !sample.flowOpen || sample.elapsedS < 0) return state;
  const freshPressure = sample.pressureSampleElapsedS >= 0
    && sample.pressureSampleElapsedS <= sample.elapsedS
    && (state.lastPressureSampleS === null || sample.pressureSampleElapsedS > state.lastPressureSampleS);
  const sawSound = state.sawSound || (sample.sound.active && sample.sound.intensity > 0);
  const sawPositivePressure = state.sawPositivePressure || (freshPressure && sample.displayedPressureMv > 0);
  const triggered = method === 'fixed-time'
    ? sample.elapsedS >= ENDPOINT_PROTOCOL.fixedDurationS
    : method === 'sound-stop'
      ? state.sawSound && !sample.sound.active && sample.sound.stopReason === 'pressure-balanced'
      : state.sawPositivePressure && freshPressure && sample.displayedPressureMv === 0;
  return {
    sawSound, sawPositivePressure,
    lastPressureSampleS: freshPressure ? sample.pressureSampleElapsedS : state.lastPressureSampleS,
    cueAtS: triggered ? sample.elapsedS : null,
  };
};

interface Run {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
}
const time = (value: number) => Number(value.toFixed(9));
const EPS = 1e-8;
const closed: HeatCapacityFreeControls = { pumpValveOpen: false, stopcockOpen: false };
const releasing: HeatCapacityFreeControls = { ...closed, stopcockOpen: true, stopcockFlowPurpose: 'release' };
type Configs = ReturnType<typeof createConfigs>;
const createConfigs = (scenario: EndpointScenario) => ({
  physics: { ...createDefaultHeatCapacityFreePhysicsConfig(), stopcockFlowRate: scenario.flowCoefficient },
  sensor: createDefaultHeatCapacityFreeSensorConfig(),
  record: createDefaultHeatCapacityFreeRecordConfig(),
});
const createCalibration = (configs: Configs) => captureAutomaticU0IfReady(
  applyFreeZeroCalibration({ calibrationVersion: 0, zeroOffsetMv: 0, zeroEvents: [], automaticU0: null }, {
    atS: 0, displayPressureMv: 0, displayTemperatureMv: configs.sensor.temperatureMvAtAmbient,
    zeroOffsetMv: 0, source: 'user',
  }), {
    atS: 0, powerOn: true, stopcockOpen: true, zeroed: true, zeroEventId: 'zero-1',
    pressureStable: true, temperatureStable: true,
    displayPressureMv: 0, displayTemperatureMv: configs.sensor.temperatureMvAtAmbient,
  },
);
type Calibration = ReturnType<typeof createCalibration>;

const advance = (run: Run, configs: Configs, calibration: Calibration, controls: HeatCapacityFreeControls, dtS: number): Run => {
  const timeS = time(run.timeS + dtS);
  const fast = run.physics.pumpProcesses.length > 0
    || (controls.stopcockOpen && deriveFreePhysicalState(run.physics, configs.physics).pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA);
  const physics = stepFreePhysics(run.physics, configs.physics, controls, dtS, timeS);
  const derived = deriveFreePhysicalState(physics, configs.physics);
  const sensor = dtS > 0 ? stepFreeSensor(
    fast ? { ...run.sensor, nextSampleAtS: Number.NEGATIVE_INFINITY } : run.sensor,
    { ...derived, gasTemperatureK: physics.gasTemperatureK, ambientTemperatureK: configs.physics.environment.ambientTemperatureK },
    calibration, configs.sensor, timeS,
  ) : run.sensor;
  return { timeS, physics, sensor };
};

const advanceTo = (run: Run, configs: Configs, calibration: Calibration, controls: HeatCapacityFreeControls,
  targetS: number, stepS: number, onStep: (run: Run) => void = () => {}) => {
  let current = run;
  while (targetS - current.timeS > EPS) {
    current = advance(current, configs, calibration, controls, Math.min(stepS, targetS - current.timeS));
    onStep(current);
  }
  return current;
};
const recordInput = (run: Run, calibration: Calibration, configs: Configs) => ({
  atS: run.timeS, ...getFreeSensorDisplay(run.sensor, calibration, configs.sensor),
  calibrationVersion: calibration.calibrationVersion, zeroEventId: calibration.zeroEvents.at(-1)!.id,
});

export const prepareEndpointComparison = (scenario: EndpointScenario, seed: number) => {
  const configs = createConfigs(scenario);
  const calibration = createCalibration(configs);
  let run: Run = {
    timeS: 0, physics: createDefaultFreePhysicsState(configs.physics, seed),
    sensor: createDefaultFreeSensorState(seed, {
      pressureMv: 0, pressureInitialBiasMv: 0, temperatureMv: configs.sensor.temperatureMvAtAmbient,
      sensorTemperatureK: configs.physics.environment.ambientTemperatureK,
    }),
  };
  let trial = recordFreeU0(createHeatCapacityFreeTrial(`endpoint-${scenario.id}-${seed}`, calibration.automaticU0),
    recordInput(run, calibration, configs)).trial;
  const pumpControls = { ...closed, pumpValveOpen: true };
  run = advance(run, configs, calibration, pumpControls, 0);
  for (let index = 0; index < scenario.pumpStrokes; index++) {
    run = advanceTo(run, configs, calibration, pumpControls,
      time(index * ENDPOINT_PROTOCOL.pumpFirstToLastStartS / (scenario.pumpStrokes - 1)), ENDPOINT_PROTOCOL.stepS);
    const pump = applyFreePumpStroke(run.physics, configs.physics, pumpControls, { atS: run.timeS, strength: 1 });
    if (!pump.accepted) throw new Error(`Preparation rejected pump ${index}: ${pump.reason}`);
    run = { ...run, physics: pump.state };
  }
  run = advanceTo(run, configs, calibration, pumpControls, time(run.timeS + FREE_PUMP_STROKE_DURATION_S), ENDPOINT_PROTOCOL.stepS);
  run = advance(run, configs, calibration, closed, 0);
  run = advanceTo(run, configs, calibration, closed, time(run.timeS + ENDPOINT_PROTOCOL.waitAfterPumpS), ENDPOINT_PROTOCOL.stepS);
  const u1Evaluation = evaluateFreeU1Record(trial, calibration, getFreeSensorDisplay(run.sensor, calibration, configs.sensor), run.physics, configs.record);
  if (!u1Evaluation.ready) throw new Error(`Preparation rejected U1: ${u1Evaluation.reason}`);
  trial = recordFreeU1(trial, recordInput(run, calibration, configs)).trial;
  return { scenario, seed, configs, calibration, run, trial };
};
export type PreparedEndpointComparison = ReturnType<typeof prepareEndpointComparison>;

export const compareEndpoint = (prepared: PreparedEndpointComparison, method: EndpointMethod, reactionDelayS: number,
  options: { stepS?: number; observationLimitS?: number } = {}) => {
  const stepS = options.stepS ?? ENDPOINT_PROTOCOL.stepS;
  const limitS = options.observationLimitS ?? ENDPOINT_PROTOCOL.observationLimitS;
  if (!(stepS >= 0.001 && stepS <= ENDPOINT_PROTOCOL.stepS) || !Number.isFinite(stepS)
    || !(limitS > 0 && limitS <= 30) || !Number.isFinite(limitS)
    || !Number.isFinite(reactionDelayS) || reactionDelayS < 0 || reactionDelayS > 1) {
    throw new Error('Invalid bounded endpoint comparison settings');
  }
  const { configs, calibration } = prepared;
  let run = prepared.run;
  let release = beginHeatCapacityReleaseOpening(createClosedHeatCapacityReleaseState(run.timeS), 'release', run.timeS);
  const flowStartS = time(run.timeS + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs / 1000);
  const inspect = (current: Run, phase: string) => {
    const derived = deriveFreePhysicalState(current.physics, configs.physics);
    const elapsedS = time(current.timeS - flowStartS);
    const display = getFreeSensorDisplay(current.sensor, calibration, configs.sensor);
    const sound = resolveHeatCapacityReleaseSoundFeedback({
      releasePathOpen: phase === 'releasing', paused: false, audioEnabled: true,
      pressureDeltaKPa: derived.pressureDeltaKPa, releaseElapsedS: Math.max(0, elapsedS),
    });
    return {
      atS: current.timeS, elapsedS, phase,
      pressureSampleElapsedS: time((current.sensor.pressureHistory.at(-1)?.atS ?? 0) - flowStartS),
      displayedPressureMv: truncateHeatCapacitySignalMv(display.displayPressureMv),
      sensorPressureMv: display.displayPressureMv,
      physicalPressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: current.physics.gasTemperatureK,
      amountMol: current.physics.amountMol!, internalEnergyJ: current.physics.internalEnergyJ!,
      soundActive: sound.active, soundIntensity: sound.intensity, soundStopReason: sound.stopReason,
    };
  };
  const trace = [inspect(run, 'opening')];
  run = advanceTo(run, configs, calibration, closed, flowStartS, stepS, current => trace.push(inspect(current, 'opening')));
  release = advanceHeatCapacityReleaseState(release, flowStartS).state;
  run = advance(run, configs, calibration, releasing, 0); // exact opening reference, no lost first step
  let observer = createEndpointObserver();
  let closeAtS: number | null = null;
  const observe = () => {
    const sample = inspect(run, 'releasing');
    trace.push(sample);
    observer = observeEndpoint(observer, method, {
      ...sample, flowOpen: true,
      sound: { active: sample.soundActive, intensity: sample.soundIntensity, stopReason: sample.soundStopReason },
    });
    if (observer.cueAtS !== null && closeAtS === null) closeAtS = time(flowStartS + observer.cueAtS + reactionDelayS);
  };
  observe();
  const deadlineS = time(flowStartS + limitS);
  while (run.timeS < deadlineS - EPS && (closeAtS === null || run.timeS < closeAtS - EPS)) {
    let nextAtS = Math.min(time(run.timeS + stepS), deadlineS, closeAtS ?? Infinity);
    const timerAtS = time(flowStartS + ENDPOINT_PROTOCOL.fixedDurationS);
    if (method === 'fixed-time' && observer.cueAtS === null && run.timeS < timerAtS - EPS) nextAtS = Math.min(nextAtS, timerAtS);
    run = advance(run, configs, calibration, releasing, nextAtS - run.timeS);
    observe();
  }
  const didClose = closeAtS !== null && run.timeS >= closeAtS - EPS;
  const lastOpen = inspect(run, 'releasing');
  let trial = prepared.trial;
  let reason = observer.cueAtS === null ? 'no-cue-within-observation' : 'reaction-exceeds-observation';
  let u2Recordable = false;
  if (didClose) {
    release = beginHeatCapacityReleaseClosing(release, run.timeS);
    run = advance(run, configs, calibration, closed, 0); // closes flow at the command, not after the animation
    trace.push(inspect(run, 'closing'));
    run = advanceTo(run, configs, calibration, closed,
      time(run.timeS + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs / 1000), stepS);
    release = advanceHeatCapacityReleaseState(release, run.timeS).state;
    run = advanceTo(run, configs, calibration, closed,
      time(run.timeS + ENDPOINT_PROTOCOL.waitAfterClosingAnimationS), ENDPOINT_PROTOCOL.stepS);
    trace.push(inspect(run, 'recovered'));
    const display = getFreeSensorDisplay(run.sensor, calibration, configs.sensor);
    const evaluated = evaluateFreeU2Record(trial, calibration, display, run.physics, configs.record);
    reason = evaluated.reason;
    u2Recordable = evaluated.ready;
    if (evaluated.ready) {
      trial = recordFreeU2(trial, recordInput(run, calibration, configs), {
        atmosphericPressureKPa: configs.physics.environment.ambientPressureKPa,
        pressureSensitivityMvPerKPa: configs.sensor.pressureMvPerKPa,
        theoreticalGamma: configs.physics.gamma, preheatOutcome: 'completed',
      }).trial;
    }
  }
  const gamma = trial.correctedSignals?.gamma ?? null;
  return {
    row: {
      scenario: prepared.scenario.id, seed: prepared.seed, method, reactionDelayS, stepS,
      status: !didClose ? reason : gamma === null ? 'invalid-record' : 'recorded', reason,
      cueAtS: observer.cueAtS, closeElapsedS: didClose ? time(closeAtS! - flowStartS) : null,
      openCommandAtS: prepared.run.timeS, flowStartAtS: flowStartS,
      closeCommandAtS: didClose ? closeAtS : null, closingCompletedAtS: release.closingCompletedAtS,
      observedUntilS: lastOpen.elapsedS, u2RecordedAtS: trial.u2?.atS ?? null,
      u0Mv: trial.u0!.displayPressureMv, u1Mv: trial.u1!.displayPressureMv,
      u2Mv: trial.u2?.displayPressureMv ?? null, u2Recordable, gamma,
      absoluteGammaError: gamma === null ? null : Math.abs(gamma - configs.physics.gamma),
      relativeErrorPercent: gamma === null ? null : Math.abs(gamma - configs.physics.gamma) / configs.physics.gamma * 100,
      lastOpenDisplayedMv: lastOpen.displayedPressureMv,
      lastOpenPhysicalDeltaKPa: lastOpen.physicalPressureDeltaKPa,
      lastOpenTemperatureK: lastOpen.gasTemperatureK,
      closeDurationFromStateS: didClose ? release.releaseDurationS : null,
    }, trace, trial, finalRun: run, releaseState: release,
  };
};
