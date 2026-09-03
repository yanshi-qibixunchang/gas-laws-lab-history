import {
  createHeatCapacityFreeAttempt,
  deriveHeatCapacityFreeAttemptWaitTimer,
  evaluateHeatCapacityFreeAttemptPowerOffTimeout,
  setHeatCapacityFreeAttemptInvalidPromptDismissed,
  transitionHeatCapacityFreeAttempt,
  type HeatCapacityFreeAttemptEvent,
  type HeatCapacityFreeAttemptPreheatOutcome,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
  HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  type HeatCapacityReleasePurpose,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import type { HeatCapacityRuntimePhase } from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import { freezeHeatCapacityFreeParametersForCurrentGroup } from './workbenchHeatCapacityFreeParameterState.ts';
import { getHeatCapacityStopcockState } from './workbenchHeatCapacityInstrumentState.ts';
import type {
  HeatCapacityFreeWorkflowStage,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

export const isHeatCapacityFreeAttemptInvalid = (
  file: Pick<WorkbenchHeatCapacityState, 'heatCapacityMode' | 'heatCapacityFreeRunWorkspace'>,
) => file.heatCapacityMode === 'free' && file.heatCapacityFreeRunWorkspace.activeAttempt?.status === 'invalid';

export const getHeatCapacityFreeAttemptPreheatOutcome = (
  file: Pick<WorkbenchHeatCapacityState, 'heatCapacityFreePreheatCompleted'>,
): HeatCapacityFreeAttemptPreheatOutcome => (
  file.heatCapacityFreePreheatCompleted ? 'completed' : 'omitted'
);

export const startHeatCapacityFreeWorkbenchAttempt = (
  file: WorkbenchHeatCapacityState,
  startReason: 'u0-recorded' | 'effective-pump',
  now: number,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free' || file.heatCapacityFreeRunWorkspace.activeAttempt !== null) return file;
  const frozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(file);
  return {
    ...frozenFile,
    heatCapacityFreeRunWorkspace: {
      ...frozenFile.heatCapacityFreeRunWorkspace,
      activeAttempt: createHeatCapacityFreeAttempt({
        startReason,
        preheatOutcome: getHeatCapacityFreeAttemptPreheatOutcome(file),
        atS: frozenFile.heatCapacityFreeInstrumentState.physics.simulationTimeS,
        wallClockMs: now,
        powerOn: frozenFile.powerOn,
      }),
    },
  };
};

export const transitionHeatCapacityFreeWorkbenchAttempt = (
  file: WorkbenchHeatCapacityState,
  type: HeatCapacityFreeAttemptEvent['type'],
  now: number,
): WorkbenchHeatCapacityState => {
  const attempt = file.heatCapacityFreeRunWorkspace.activeAttempt;
  if (file.heatCapacityMode !== 'free' || attempt === null) return file;
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      activeAttempt: transitionHeatCapacityFreeAttempt(attempt, {
        type,
        atS: file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
        wallClockMs: now,
      }),
    },
  };
};

export const evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const attempt = file.heatCapacityFreeRunWorkspace.activeAttempt;
  if (file.heatCapacityMode !== 'free' || attempt === null) return file;
  const nextAttempt = evaluateHeatCapacityFreeAttemptPowerOffTimeout(attempt, {
    atS: file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
    wallClockMs: now,
  });
  return nextAttempt === attempt
    ? file
    : {
        ...file,
        heatCapacityFreeRunWorkspace: {
          ...file.heatCapacityFreeRunWorkspace,
          activeAttempt: nextAttempt,
        },
      };
};

export const dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const attempt = file.heatCapacityFreeRunWorkspace.activeAttempt;
  if (file.heatCapacityMode !== 'free' || attempt?.status !== 'invalid') return file;
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      activeAttempt: setHeatCapacityFreeAttemptInvalidPromptDismissed(attempt, true),
    },
    updatedAt: now,
  };
};

export const deriveHeatCapacityFreeWorkbenchAttemptWaitTimer = (
  file: WorkbenchHeatCapacityState,
) => deriveHeatCapacityFreeAttemptWaitTimer(
  file.heatCapacityFreeRunWorkspace.activeAttempt,
  file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
);

export const getHeatCapacityReleasePurpose = (
  file: Pick<WorkbenchHeatCapacityState, 'pressureDeltaKPa'>,
): Exclude<HeatCapacityReleasePurpose, 'none'> => (
  Number.isFinite(file.pressureDeltaKPa) &&
  file.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
    ? 'release'
    : 'zeroing'
);

export const hasHeatCapacityFreeReleaseStarted = (
  file: Pick<WorkbenchHeatCapacityState, 'heatCapacityFreeInstrumentState' | 'heatCapacityReleaseState'>,
) => (
  file.heatCapacityReleaseState.formedRelease ||
  file.heatCapacityFreeInstrumentState.physics.releaseStarted ||
  file.heatCapacityFreeInstrumentState.physics.releaseReference !== null
);

export const deriveHeatCapacityFreeWorkflowStage = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeWorkflowStage => {
  if (!file.powerOn) return 'beforePower';
  const attempt = file.heatCapacityFreeRunWorkspace.activeAttempt;
  if (!attempt) {
    return getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open'
      ? 'zeroing'
      : 'beforePump';
  }
  switch (attempt.stage) {
    case 'preparing':
      return getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open'
        ? 'zeroing'
        : 'beforePump';
    case 'pumping':
    case 'waiting-u1':
      return 'waitingU1';
    case 'u1-recorded':
      return 'beforeRelease';
    case 'releasing':
      return 'releasing';
    case 'waiting-u2':
      return 'waitingU2';
    case 'u2-recorded':
      return 'beforePowerOff';
  }
};

export const getHeatCapacityFreeDisplayPhase = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityRuntimePhase => (
  file.heatCapacityReleaseState.phase === 'opening' && file.heatCapacityReleaseState.purpose === 'release'
    ? 'sealedStabilizing'
    : deriveHeatCapacityFreeWorkflowStage(file) === 'releasing'
    ? 'releasing'
    : file.heatCapacityPhase
);
