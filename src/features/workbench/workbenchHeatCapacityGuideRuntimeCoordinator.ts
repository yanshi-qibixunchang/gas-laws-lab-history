import {
  advanceHeatCapacityReleaseState,
  getHeatCapacityReleaseDurationS,
  getHeatCapacityReleaseNextTransitionAtS,
  isHeatCapacityReleaseFlowOpen,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  stepGuidePhysicsState,
  type HeatCapacityGuidePhysicsConfig,
  type HeatCapacityGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV,
  transitionHeatCapacityGuideWorkflow,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
  deriveHeatCapacityGuideExperimentTimer,
} from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import {
  createHeatCapacityTemperatureSensorState,
  stepHeatCapacityTemperatureSensor,
  type HeatCapacityTemperatureSensorState,
} from '../../domain/heatCapacity/heatCapacityTemperatureSensorModel.ts';
import {
  getHeatCapacityStopcockState,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  getHeatCapacityGuideActionContext,
  mergeHeatCapacityGuideRuntimeState,
} from './workbenchHeatCapacityGuideRuntimeState.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const HEAT_CAPACITY_GUIDE_SENSOR_COUPLED_MAX_STEP_S = 0.02;
const HEAT_CAPACITY_GUIDE_RELEASE_COUPLED_MAX_STEP_S = 0.005;

const stepHeatCapacityGuidePhysicsAndTemperatureSensor = (
  physicsState: HeatCapacityGuidePhysicsState,
  sensorState: HeatCapacityTemperatureSensorState,
  config: HeatCapacityGuidePhysicsConfig,
  controls: Omit<Parameters<typeof stepGuidePhysicsState>[2], 'dtS'>,
  dtS: number,
  options: { stopAtReleaseEquilibrium?: boolean } = {},
) => {
  let nextPhysicsState = physicsState;
  let nextSensorState = sensorState;
  let remainingS = Math.max(0, dtS);
  let advancedDtS = 0;
  while (remainingS > 1e-9) {
    const stepS = Math.min(
      remainingS,
      options.stopAtReleaseEquilibrium
        ? HEAT_CAPACITY_GUIDE_RELEASE_COUPLED_MAX_STEP_S
        : HEAT_CAPACITY_GUIDE_SENSOR_COUPLED_MAX_STEP_S,
    );
    nextPhysicsState = stepGuidePhysicsState(
      nextPhysicsState,
      config,
      {
        ...controls,
        dtS: stepS,
      },
    );
    nextSensorState = stepHeatCapacityTemperatureSensor(
      nextSensorState,
      {
        gasTemperatureK: nextPhysicsState.gasTemperatureK,
        dtS: stepS,
      },
    );
    remainingS = Math.max(0, remainingS - stepS);
    advancedDtS += stepS;
    if (
      options.stopAtReleaseEquilibrium &&
      nextPhysicsState.releaseReference?.reachedAmbientAtS !== null &&
      nextPhysicsState.releaseReference?.reachedAmbientAtS !== undefined
    ) {
      break;
    }
  }
  return {
    physicsState: nextPhysicsState,
    sensorState: nextSensorState,
    advancedDtS,
  };
};

export const stepHeatCapacityGuideWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const dtS = file.lastUpdateMs === null ? 0 : Math.max(0, (now - file.lastUpdateMs) / 1000);
  let guidePhysicsState = file.heatCapacityGuidePhysicsState;
  let guideTemperatureSensorState = file.heatCapacityGuideTemperatureSensorState ??
    createHeatCapacityTemperatureSensorState(
      file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    );
  let guideWorkflow = file.heatCapacityGuideWorkflow;
  let releaseState = advanceHeatCapacityReleaseState(
    file.heatCapacityReleaseState,
    guidePhysicsState.simulationTimeS,
  ).state;

  if (guideWorkflow.paused) {
    const releaseCloseReady = guideWorkflow.step === 'closeStopcockAfterReleaseRequired' &&
      guideWorkflow.releaseCloseResumeAtMs !== null &&
      now >= guideWorkflow.releaseCloseResumeAtMs;
    if (releaseCloseReady) {
      if (releaseState.phase === 'closing') {
        releaseState = {
          ...releaseState,
          phase: releaseState.formedRelease ? 'closedAfterRelease' : 'closed',
          phaseStartedAtS: guidePhysicsState.simulationTimeS,
          closingCompletedAtS: guidePhysicsState.simulationTimeS,
        };
      }
      guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
        action: 'releaseCloseAnimationComplete',
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: false,
        displayPressureMv: file.pressureSignalMvDisplayed,
        simulationTimeS: guidePhysicsState.simulationTimeS,
        wallClockMs: now,
      });
    }
    const pausedFile = mergeHeatCapacityGuideRuntimeState(
      {
        ...file,
        heatCapacityReleaseState: releaseState,
        heatCapacityGuideTemperatureSensorState: guideTemperatureSensorState,
      },
      guidePhysicsState,
      guideWorkflow,
      now,
    );
    return {
      ...pausedFile,
      lastUpdateMs: now,
    };
  }

  if (dtS > 0) {
    const isWaitingStep = guideWorkflow.step === 'u1Waiting' || guideWorkflow.step === 'u2Waiting';
    const speed = isWaitingStep ? guideWorkflow.speedMultiplier : 1;
    const targetWaitEndS = isWaitingStep && guideWorkflow.waitStartedAtS !== null
      ? guideWorkflow.waitStartedAtS + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S
      : null;
    const requestedDtS = dtS * speed;
    const boundedDtS = targetWaitEndS === null
      ? requestedDtS
      : Math.max(0, Math.min(requestedDtS, targetWaitEndS - guidePhysicsState.simulationTimeS));
    let remainingDtS = boundedDtS;
    let transitionGuard = 0;
    while (remainingDtS > 1e-9 && transitionGuard < 4) {
      transitionGuard += 1;
      const segmentStartS = guidePhysicsState.simulationTimeS;
      const transitionAtS = getHeatCapacityReleaseNextTransitionAtS(releaseState);
      const segmentDtS = transitionAtS !== null && transitionAtS > segmentStartS + 1e-9
        ? Math.min(remainingDtS, transitionAtS - segmentStartS)
        : transitionAtS !== null
          ? 0
          : remainingDtS;
      if (segmentDtS > 0) {
        const stopAtReleaseEquilibrium = guideWorkflow.step === 'openStopcockForReleaseRequired' &&
          releaseState.phase === 'releasing' &&
          releaseState.purpose === 'release';
        const coupledStep = stepHeatCapacityGuidePhysicsAndTemperatureSensor(
          guidePhysicsState,
          guideTemperatureSensorState,
          file.heatCapacityGuidePhysicsConfig,
          {
            powerOn: file.powerOn,
            pumpValveOpen: file.pumpValveOpen,
            stopcockOpen: isHeatCapacityReleaseFlowOpen(releaseState),
            stopcockFlowPurpose: releaseState.purpose,
          },
          segmentDtS,
          { stopAtReleaseEquilibrium },
        );
        guidePhysicsState = coupledStep.physicsState;
        guideTemperatureSensorState = coupledStep.sensorState;
        remainingDtS = Math.max(0, remainingDtS - coupledStep.advancedDtS);
        const reachedAmbientAtS = guidePhysicsState.releaseReference?.reachedAmbientAtS;
        if (
          stopAtReleaseEquilibrium &&
          reachedAmbientAtS !== null &&
          reachedAmbientAtS !== undefined
        ) {
          releaseState = {
            ...releaseState,
            releaseDurationS: releaseState.openingCompletedAtS === null
              ? 0
              : Math.max(0, reachedAmbientAtS - releaseState.openingCompletedAtS),
          };
          guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
            action: 'releaseComplete',
            powerOn: file.powerOn,
            pumpValveOpen: file.pumpValveOpen,
            stopcockOpen: true,
            displayPressureMv: file.pressureSignalMvDisplayed,
            simulationTimeS: guidePhysicsState.simulationTimeS,
            wallClockMs: now,
          });
          remainingDtS = 0;
          break;
        }
      }
      const transition = advanceHeatCapacityReleaseState(
        releaseState,
        guidePhysicsState.simulationTimeS,
      );
      if (transition.transitions.length === 0) {
        if (segmentDtS <= 0) break;
        continue;
      }
      releaseState = transition.state;
      if (transition.transitions.some((releaseTransition) => (
        releaseTransition.type === 'opening-complete'
      ))) {
        // Materialize the exact flow-open edge before the runtime merge
        // synchronizes persisted valve timing. Otherwise the guide engine sees
        // an already-open valve and never creates its release reference.
        guidePhysicsState = stepGuidePhysicsState(
          guidePhysicsState,
          file.heatCapacityGuidePhysicsConfig,
          {
            powerOn: file.powerOn,
            pumpValveOpen: file.pumpValveOpen,
            stopcockOpen: isHeatCapacityReleaseFlowOpen(releaseState),
            stopcockFlowPurpose: releaseState.purpose,
            dtS: 0,
          },
        );
      }
    }
    if (releaseState.phase === 'releasing') {
      releaseState = {
        ...releaseState,
        releaseDurationS: getHeatCapacityReleaseDurationS(
          releaseState,
          guidePhysicsState.simulationTimeS,
        ),
      };
    }
    const timer = deriveHeatCapacityGuideExperimentTimer(guideWorkflow, guidePhysicsState.simulationTimeS);
    if (timer.complete && (guideWorkflow.step === 'u1Waiting' || guideWorkflow.step === 'u2Waiting')) {
      guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
        action: 'timerComplete',
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
        displayPressureMv: file.pressureSignalMvDisplayed,
        simulationTimeS: guidePhysicsState.simulationTimeS,
      });
    }
  }

  let mergedFile = mergeHeatCapacityGuideRuntimeState(
    {
      ...file,
      heatCapacityReleaseState: releaseState,
      heatCapacityGuideTemperatureSensorState: guideTemperatureSensorState,
    },
    guidePhysicsState,
    guideWorkflow,
    now,
  );
  if (
    mergedFile.heatCapacityGuideWorkflow.step === 'pumpRequired' &&
    (mergedFile.pressureSignalMv ?? Number.NEGATIVE_INFINITY) >= HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV
  ) {
    const pumpTargetWorkflow = transitionHeatCapacityGuideWorkflow(
      mergedFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(mergedFile, 'pressPumpBulb', {
        displayPressureMv: mergedFile.pressureSignalMv ?? mergedFile.pressureSignalTargetMv,
      }),
    );
    if (pumpTargetWorkflow.step !== mergedFile.heatCapacityGuideWorkflow.step) {
      mergedFile = mergeHeatCapacityGuideRuntimeState(
        {
          ...mergedFile,
          pumpHint: '已达到打气标准，请关闭打气阀门。',
        },
        mergedFile.heatCapacityGuidePhysicsState,
        pumpTargetWorkflow,
        now,
      );
    }
  }

  return {
    ...mergedFile,
    lastUpdateMs: now,
  };
};
