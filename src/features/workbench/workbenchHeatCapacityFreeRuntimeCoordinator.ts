import {
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorState,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import { captureAutomaticU0IfReady } from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import { getEffectiveHeatCapacityFreeSensorConfig } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  createHeatCapacityFreeIdealStagePhysicsConfig,
  type HeatCapacityFreeIdealStage,
} from '../../domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts';
import {
  advanceHeatCapacityReleaseState,
  beginHeatCapacityReleaseClosing,
  beginHeatCapacityReleaseOpening,
  getHeatCapacityReleaseDurationS,
  getHeatCapacityReleaseNextTransitionAtS,
  HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  isHeatCapacityReleaseFlowOpen,
  type HeatCapacityReleasePurpose,
  type HeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import { HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S } from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  deriveHeatCapacityFreeWorkbenchAttemptWaitTimer,
  getHeatCapacityReleasePurpose,
  transitionHeatCapacityFreeWorkbenchAttempt,
} from './workbenchHeatCapacityFreeAttemptState.ts';
import {
  getHeatCapacityStopcockTargetAngle,
} from './workbenchHeatCapacityInstrumentState.ts';
import { mergeHeatCapacityFreeRuntimeState } from './workbenchHeatCapacityFreeRuntimeState.ts';
import { normalizeHeatCapacityFreeSensorConfig } from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import {
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  recordHeatCapacityFreeAutomaticU0Event,
  recordHeatCapacityFreePeriodicTraceSample,
  recordHeatCapacityFreeTraceEvent,
} from './workbenchHeatCapacityFreeTraceState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';

export const HEAT_CAPACITY_FREE_ACCELERATED_SAMPLE_STEP_S =
  HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S;
const HEAT_CAPACITY_FREE_ACCELERATED_MAX_SEGMENTS = 600;

const loadActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return transactHeatCapacityFreeAuthority(
    file,
    (authority) => authority,
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
};

const storeActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
  scheme: WorkbenchHeatCapacityState['heatCapacityFreeParameterScheme'],
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free'
    ? commitHeatCapacityFreeRuntimeAuthorityTransaction(file, scheme)
    : file
);

export const isHeatCapacityFreeEquilibriumSpeedAvailable = (
  file: WorkbenchHeatCapacityState,
) => {
  const waitTimer = deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(file);
  return (
    file.heatCapacityMode === 'free' &&
    waitTimer.stage !== 'idle' &&
    !isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState) &&
    file.heatCapacityReleaseState.phase !== 'opening' &&
    file.heatCapacityReleaseState.phase !== 'closing' &&
    !file.pumpValveOpen
  );
};

export const getHeatCapacityFreeEquilibriumSpeedMultiplier = (
  file: WorkbenchHeatCapacityState,
) => (
  isHeatCapacityFreeEquilibriumSpeedAvailable(file)
    ? normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(file.heatCapacityFreeEquilibriumSpeedMultiplier)
    : 1
);

const resolveHeatCapacityFreeIdealStage = (
  file: WorkbenchHeatCapacityState,
  state: HeatCapacityFreePhysicsState,
  stopcockOpen: boolean,
  stopcockFlowPurpose: HeatCapacityReleasePurpose,
): HeatCapacityFreeIdealStage => {
  const hasActivePumpProcess = (state.pumpProcesses?.length ?? 0) > 0;
  if (hasActivePumpProcess) return 'fastAdiabatic';
  if (stopcockOpen && stopcockFlowPurpose === 'release') return 'fastAdiabatic';
  if (stopcockOpen) {
    const derived = deriveFreePhysicalState(state, file.heatCapacityFreeInstrumentConfig.physics);
    if (
      derived.gasPressureKPa >
        file.heatCapacityFreeInstrumentConfig.physics.environment.ambientPressureKPa + 0.000001
    ) return 'fastAdiabatic';
  }
  return 'thermalEquilibrium';
};

const createHeatCapacityFreeEffectivePhysicsConfigForSegment = (
  file: WorkbenchHeatCapacityState,
  state: HeatCapacityFreePhysicsState,
  stopcockOpen: boolean,
  stopcockFlowPurpose: HeatCapacityReleasePurpose,
): HeatCapacityFreePhysicsConfig => (
  file.heatCapacityFreeParameterScheme === 'ideal'
    ? createHeatCapacityFreeIdealStagePhysicsConfig(
        file.heatCapacityFreeInstrumentConfig.physics,
        resolveHeatCapacityFreeIdealStage(file, state, stopcockOpen, stopcockFlowPurpose),
      )
    : file.heatCapacityFreeInstrumentConfig.physics
);

export const stepHeatCapacityFreeWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const sensorConfig = normalizeHeatCapacityFreeSensorConfig(file.heatCapacityFreeInstrumentConfig.sensor);
  const effectiveSensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    sensorConfig,
    file.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
  );
  const lastUpdateMs = file.lastUpdateMs ?? now;
  const elapsedMs = Math.max(0, now - lastUpdateMs);
  const equilibriumSpeedMultiplier = getHeatCapacityFreeEquilibriumSpeedMultiplier(file);
  const stepPhysicsSegment = (
    state: HeatCapacityFreePhysicsState,
    dtS: number,
    releaseState: HeatCapacityReleaseState,
  ) => {
    const stopcockOpen = isHeatCapacityReleaseFlowOpen(releaseState);
    const stopcockFlowPurpose = releaseState.purpose;
    const effectivePhysicsConfig = createHeatCapacityFreeEffectivePhysicsConfigForSegment(
      file,
      state,
      stopcockOpen,
      stopcockFlowPurpose,
    );
    return stepFreePhysics(
      state,
      effectivePhysicsConfig,
      {
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen,
        stopcockFlowPurpose: stopcockOpen && stopcockFlowPurpose !== 'none'
          ? stopcockFlowPurpose
          : undefined,
      },
      dtS,
      state.simulationTimeS + dtS,
    );
  };
  const stepRuntimeSegments = (
    sourceFile: WorkbenchHeatCapacityState,
    sourcePhysicsState: HeatCapacityFreePhysicsState,
    sourceSensorState: HeatCapacityFreeSensorState,
    dtS: number,
    releaseState: HeatCapacityReleaseState,
    recordIntermediateTrace: boolean,
  ) => {
    const totalDtS = Math.max(0, Number.isFinite(dtS) ? dtS : 0);
    const stopcockOpen = isHeatCapacityReleaseFlowOpen(releaseState);
    const sourceDerived = deriveFreePhysicalState(
      sourcePhysicsState,
      sourceFile.heatCapacityFreeInstrumentConfig.physics,
    );
    const hasActivePumpProcess = (sourcePhysicsState.pumpProcesses?.length ?? 0) > 0;
    const hasActiveFastPhysicsProcess = hasActivePumpProcess || (
      stopcockOpen && sourceDerived.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
    );
    const shouldRecordIntermediateTrace = recordIntermediateTrace || hasActiveFastPhysicsProcess;
    const segmentCount = shouldRecordIntermediateTrace
      ? Math.min(
          HEAT_CAPACITY_FREE_ACCELERATED_MAX_SEGMENTS,
          Math.max(1, Math.ceil(totalDtS / HEAT_CAPACITY_FREE_ACCELERATED_SAMPLE_STEP_S)),
        )
      : 1;
    const segmentDtS = segmentCount > 0 ? totalDtS / segmentCount : 0;
    let physicsState = sourcePhysicsState;
    let sensorState = sourceSensorState;
    let workingFile: WorkbenchHeatCapacityState = {
      ...sourceFile,
      heatCapacityFreeInstrumentConfig: {
        ...sourceFile.heatCapacityFreeInstrumentConfig,
        sensor: sensorConfig,
      },
      heatCapacityReleaseState: releaseState,
    };

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      physicsState = stepPhysicsSegment(physicsState, segmentDtS, releaseState);
      const derived = deriveFreePhysicalState(
        physicsState,
        workingFile.heatCapacityFreeInstrumentConfig.physics,
      );
      sensorState = stepFreeSensor(
        hasActiveFastPhysicsProcess
          ? { ...sensorState, nextSampleAtS: Number.NEGATIVE_INFINITY }
          : sensorState,
        {
          gasPressureKPa: derived.gasPressureKPa,
          pressureDeltaKPa: derived.pressureDeltaKPa,
          gasTemperatureK: physicsState.gasTemperatureK,
          ambientTemperatureK: workingFile.heatCapacityFreeInstrumentConfig.physics.environment.ambientTemperatureK,
        },
        workingFile.heatCapacityFreeInstrumentState.calibration,
        effectiveSensorConfig,
        physicsState.simulationTimeS,
      );
      workingFile = mergeHeatCapacityFreeRuntimeState(
        {
          ...workingFile,
          heatCapacityReleaseState: releaseState.phase === 'releasing'
            ? {
                ...releaseState,
                releaseDurationS: getHeatCapacityReleaseDurationS(
                  releaseState,
                  physicsState.simulationTimeS,
                ),
              }
            : releaseState,
        },
        physicsState,
        sensorState,
        workingFile.heatCapacityFreeInstrumentState.calibration,
        now,
      );
      if (shouldRecordIntermediateTrace) {
        workingFile = recordHeatCapacityFreePeriodicTraceSample(workingFile);
      }
    }
    return { workingFile, physicsState, sensorState };
  };

  let physicsState = file.heatCapacityFreeInstrumentState.physics;
  let sensorState = file.heatCapacityFreeInstrumentState.sensor;
  let mergedFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeInstrumentConfig: {
      ...file.heatCapacityFreeInstrumentConfig,
      sensor: sensorConfig,
    },
  };
  let releaseState = file.heatCapacityReleaseState;
  let remainingDtS = (elapsedMs / 1000) * equilibriumSpeedMultiplier;
  let transitionGuard = 0;

  while (remainingDtS > 1e-9 && transitionGuard < 4) {
    transitionGuard += 1;
    const segmentStartS = physicsState.simulationTimeS;
    const transitionAtS = getHeatCapacityReleaseNextTransitionAtS(releaseState);
    const segmentDtS = transitionAtS !== null && transitionAtS > segmentStartS + 1e-9
      ? Math.min(remainingDtS, transitionAtS - segmentStartS)
      : transitionAtS !== null
        ? 0
        : remainingDtS;

    if (segmentDtS > 0) {
      const elapsedStep = stepRuntimeSegments(
        mergedFile,
        physicsState,
        sensorState,
        segmentDtS,
        releaseState,
        equilibriumSpeedMultiplier > 1,
      );
      mergedFile = elapsedStep.workingFile;
      physicsState = elapsedStep.physicsState;
      sensorState = elapsedStep.sensorState;
      remainingDtS = Math.max(0, remainingDtS - segmentDtS);
    }

    if (
      releaseState.phase === 'opening' &&
      releaseState.purpose === 'zeroing' &&
      deriveFreePhysicalState(physicsState, mergedFile.heatCapacityFreeInstrumentConfig.physics).pressureDeltaKPa >
        HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
    ) {
      // A pump stroke may still be completing while the stopcock rotates. If a
      // real pressure difference exists by the first aperture instant, upgrade
      // the opening to a physical release so sound, particles and physics share
      // the same timeline.
      releaseState = { ...releaseState, purpose: 'release' };
      mergedFile = { ...mergedFile, heatCapacityReleaseState: releaseState };
    }

    const transition = advanceHeatCapacityReleaseState(
      releaseState,
      physicsState.simulationTimeS,
    );
    if (transition.transitions.length === 0) {
      if (segmentDtS <= 0) break;
      releaseState = mergedFile.heatCapacityReleaseState;
      continue;
    }

    releaseState = transition.state;
    if (transition.transitions.some((releaseTransition) => releaseTransition.type === 'opening-complete')) {
      // Materialize the exact flow-open boundary in the physical state before
      // advancing the remaining segment. Otherwise the engine observes the
      // end of that segment as the opening instant and loses the authoritative
      // release-start reference.
      physicsState = stepPhysicsSegment(physicsState, 0, releaseState);
    }
    mergedFile = mergeHeatCapacityFreeRuntimeState(
      { ...mergedFile, heatCapacityReleaseState: releaseState },
      physicsState,
      sensorState,
      mergedFile.heatCapacityFreeInstrumentState.calibration,
      now,
    );
    physicsState = mergedFile.heatCapacityFreeInstrumentState.physics;
    sensorState = mergedFile.heatCapacityFreeInstrumentState.sensor;
    for (const releaseTransition of transition.transitions) {
      if (releaseTransition.type === 'opening-complete' && releaseTransition.purpose === 'release') {
        mergedFile = transitionHeatCapacityFreeWorkbenchAttempt(
          mergedFile,
          'release-started',
          now,
        );
        mergedFile = recordHeatCapacityFreeTraceEvent(
          mergedFile,
          'release-start',
          now,
          {
            attemptId: releaseTransition.attemptId,
            formedRelease: true,
            openingCompletedAtS: releaseTransition.atS,
            releaseDurationS: 0,
          },
        );
      } else if (releaseTransition.type === 'closing-complete' && releaseTransition.formedRelease) {
        mergedFile = transitionHeatCapacityFreeWorkbenchAttempt(
          mergedFile,
          'release-closed',
          now,
        );
      }
    }
  }

  if (remainingDtS > 1e-9) {
    const elapsedStep = stepRuntimeSegments(
      mergedFile,
      physicsState,
      sensorState,
      remainingDtS,
      releaseState,
      equilibriumSpeedMultiplier > 1,
    );
    mergedFile = elapsedStep.workingFile;
    physicsState = elapsedStep.physicsState;
    sensorState = elapsedStep.sensorState;
    releaseState = mergedFile.heatCapacityReleaseState;
  }
  if (releaseState.phase === 'releasing') {
    releaseState = {
      ...releaseState,
      releaseDurationS: getHeatCapacityReleaseDurationS(
        releaseState,
        physicsState.simulationTimeS,
      ),
    };
  }
  mergedFile = mergeHeatCapacityFreeRuntimeState(
    { ...mergedFile, heatCapacityReleaseState: releaseState },
    physicsState,
    sensorState,
    mergedFile.heatCapacityFreeInstrumentState.calibration,
    now,
  );
  const latestZeroEventId = mergedFile.heatCapacityFreeInstrumentState.calibration.zeroEvents[
    mergedFile.heatCapacityFreeInstrumentState.calibration.zeroEvents.length - 1
  ]?.id ?? '';
  const mergedDisplay = getFreeSensorDisplay(
    sensorState,
    mergedFile.heatCapacityFreeInstrumentState.calibration,
    getEffectiveHeatCapacityFreeSensorConfig(
      mergedFile.heatCapacityFreeInstrumentConfig.sensor,
      mergedFile.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
    ),
  );
  const calibrationState = captureAutomaticU0IfReady(
    mergedFile.heatCapacityFreeInstrumentState.calibration,
    {
      atS: physicsState.simulationTimeS,
      powerOn: mergedFile.powerOn,
      stopcockOpen: isHeatCapacityReleaseFlowOpen(releaseState),
      zeroed: mergedFile.pressureZeroed,
      zeroEventId: latestZeroEventId,
      pressureStable: Math.abs(sensorState.pressureSlopeMvPerS) <=
        mergedFile.heatCapacityFreeInstrumentConfig.record.pressureStableSlopeMvPerS,
      temperatureStable: Math.abs(sensorState.temperatureSlopeMvPerS) <=
        mergedFile.heatCapacityFreeInstrumentConfig.record.temperatureStableSlopeMvPerS,
      displayPressureMv: mergedDisplay.displayPressureMv,
      displayTemperatureMv: mergedDisplay.displayTemperatureMv,
    },
  );
  const withCalibration = {
    ...mergedFile,
    heatCapacityFreeInstrumentState: {
      ...mergedFile.heatCapacityFreeInstrumentState,
      calibration: calibrationState,
    },
  };
  const withAutomaticEvent = recordHeatCapacityFreeAutomaticU0Event(mergedFile, withCalibration, now);
  return recordHeatCapacityFreePeriodicTraceSample(withAutomaticEvent);
};

export const setHeatCapacityFreeStopcockOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const currentFile = stepHeatCapacityFreeWorkbenchFile(hydratedFile, now);
  if (nextOpen && currentFile.heatCapacityReleaseState.phase === 'closing') {
    return storeActiveHeatCapacityFreeDomainRuntimeFields(currentFile, scheme);
  }
  const atS = currentFile.heatCapacityFreeInstrumentState.physics.simulationTimeS;
  const purpose = getHeatCapacityReleasePurpose(currentFile);
  const releaseState = nextOpen
    ? beginHeatCapacityReleaseOpening(currentFile.heatCapacityReleaseState, purpose, atS)
    : beginHeatCapacityReleaseClosing(currentFile.heatCapacityReleaseState, atS);
  if (releaseState === currentFile.heatCapacityReleaseState) {
    return storeActiveHeatCapacityFreeDomainRuntimeFields(currentFile, scheme);
  }
  const commandedFile: WorkbenchHeatCapacityState = {
    ...currentFile,
    stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(nextOpen),
    glassPistonState: nextOpen ? 'open' : 'closed',
    heatCapacityReleaseState: releaseState,
    updatedAt: now,
  };
  const synchronizedCommandedFile = mergeHeatCapacityFreeRuntimeState(
    commandedFile,
    commandedFile.heatCapacityFreeInstrumentState.physics,
    commandedFile.heatCapacityFreeInstrumentState.sensor,
    commandedFile.heatCapacityFreeInstrumentState.calibration,
    now,
  );
  const attemptedFile = nextOpen
    ? transitionHeatCapacityFreeWorkbenchAttempt(synchronizedCommandedFile, 'stopcock-opened', now)
    : synchronizedCommandedFile;
  const tracedFile = recordHeatCapacityFreeTraceEvent(
    attemptedFile,
    nextOpen ? 'stopcock-open' : 'stopcock-close',
    now,
    {
      attemptId: releaseState.attemptId,
      purpose: releaseState.purpose,
      releasePhase: releaseState.phase,
      formedRelease: releaseState.formedRelease,
      quickToggle: releaseState.quickToggle,
      releaseDurationS: releaseState.releaseDurationS,
      openingCompletedAtS: releaseState.openingCompletedAtS,
      closeCommandAtS: releaseState.closeCommandAtS,
    },
  );
  return storeActiveHeatCapacityFreeDomainRuntimeFields(tracedFile, scheme);
};

export const setHeatCapacityFreePumpValveOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const currentFile = stepHeatCapacityFreeWorkbenchFile(hydratedFile, now);
  if (currentFile.pumpValveOpen === nextOpen) {
    return storeActiveHeatCapacityFreeDomainRuntimeFields(currentFile, scheme);
  }
  const commandedFile: WorkbenchHeatCapacityState = {
    ...currentFile,
    pumpValveOpen: nextOpen,
    pumpValveState: nextOpen ? 'open' : 'closed',
    pumpHint: nextOpen ? '打气阀门已打开' : '打气阀门已关闭',
    updatedAt: now,
  };
  const synchronizedCommandedFile = mergeHeatCapacityFreeRuntimeState(
    commandedFile,
    commandedFile.heatCapacityFreeInstrumentState.physics,
    commandedFile.heatCapacityFreeInstrumentState.sensor,
    commandedFile.heatCapacityFreeInstrumentState.calibration,
    now,
  );
  const transitionedFile = transitionHeatCapacityFreeWorkbenchAttempt(
    synchronizedCommandedFile,
    nextOpen ? 'pump-valve-opened' : 'pump-valve-closed',
    now,
  );
  const tracedFile = recordHeatCapacityFreeTraceEvent(
    transitionedFile,
    nextOpen ? 'pump-valve-open' : 'pump-valve-close',
    now,
  );
  return storeActiveHeatCapacityFreeDomainRuntimeFields(tracedFile, scheme);
};

export const setHeatCapacityFreeEquilibriumSpeedMultiplier = (
  file: WorkbenchHeatCapacityState,
  multiplier: unknown,
  now = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeEquilibriumSpeedMultiplier: normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(multiplier),
  lastUpdateMs: file.powerOn ? now : file.lastUpdateMs,
  updatedAt: now,
});
