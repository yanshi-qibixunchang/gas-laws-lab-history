import type {
  PistonOscillationGuideHeightReset,
  PistonOscillationGuideSession,
  PistonOscillationGuideStep,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type {
  PistonOscillationThermodynamicState,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import type { PistonOscillationHeightAdjustmentStage } from './pistonOscillationOperationMirror.ts';

export type PistonOscillationGuideFocusMode = 'overview' | 'pistonFocus' | 'powerFocus';

export interface PistonOscillationGuideInstrumentRestoreState {
  focusMode?: 'overview' | 'pistonFocus' | 'hoseFocus' | 'powerFocus';
  hoseState: 'connected' | 'disconnected';
  nominalHeightMm?: number;
  equilibriumHeightMm: number;
  pistonOffsetMm?: number;
  lockingScrewProgress: number;
  powerOn: boolean;
  heightAdjustmentStage?: PistonOscillationHeightAdjustmentStage;
  pistonPhase?: 'idle' | 'ready' | 'pressing' | 'adjustingHeight' | 'holding' | 'falling' | 'rebounding';
  thermodynamicState?: PistonOscillationThermodynamicState;
}

export const PISTON_OSCILLATION_GUIDE_HEIGHT_SNAP_CAPTURE_MM = 2;
export const PISTON_OSCILLATION_GUIDE_HEIGHT_SNAP_RELEASE_MM = 3;

export interface PistonOscillationGuideHeightSnapResult {
  heightMm: number;
  snapped: boolean;
}

export const resolvePistonOscillationGuideHeightSnap = (
  rawHeightMm: number,
  targetHeightMm: number | null,
  wasSnapped: boolean,
): PistonOscillationGuideHeightSnapResult => {
  if (targetHeightMm === null || !Number.isFinite(targetHeightMm)) {
    return { heightMm: rawHeightMm, snapped: false };
  }
  const distanceMm = Math.abs(rawHeightMm - targetHeightMm);
  const snapped = wasSnapped
    ? distanceMm <= PISTON_OSCILLATION_GUIDE_HEIGHT_SNAP_RELEASE_MM
    : distanceMm <= PISTON_OSCILLATION_GUIDE_HEIGHT_SNAP_CAPTURE_MM;
  return {
    heightMm: snapped ? targetHeightMm : rawHeightMm,
    snapped,
  };
};

export const getPistonOscillationGuideInstrumentRestoreState = (
  session: PistonOscillationGuideSession,
): PistonOscillationGuideInstrumentRestoreState | null => {
  if (session.status === 'idle' || session.startedAtMs === null) return null;

  if (session.heightReset !== null) {
    return {
      hoseState: 'disconnected',
      equilibriumHeightMm: session.heightReset.phase === 'resetting'
        ? session.heightReset.startedHeightMm
        : 0,
      lockingScrewProgress: 0,
      powerOn: session.powerOn,
    };
  }

  const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[
    session.measurementIndex
  ];
  const previousTargetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[
    Math.max(0, session.measurementIndex - 1) as 0 | 1 | 2
  ];

  switch (session.step) {
    case 'powerOn':
    case 'parameterSetup':
    case 'firstHeightAdjustment':
    case 'nextHeightAdjustment':
      return {
        hoseState: 'disconnected',
        equilibriumHeightMm: 0,
        lockingScrewProgress: 0,
        powerOn: session.powerOn,
      };
    case 'screwLock':
      return {
        hoseState: 'disconnected',
        equilibriumHeightMm: targetHeightMm,
        lockingScrewProgress: 0,
        powerOn: session.powerOn,
      };
    case 'hoseReconnect':
      return {
        hoseState: 'disconnected',
        equilibriumHeightMm: targetHeightMm,
        lockingScrewProgress: 1,
        powerOn: session.powerOn,
      };
    case 'screwLoosen':
      return {
        hoseState: 'connected',
        equilibriumHeightMm: targetHeightMm,
        lockingScrewProgress: 1,
        powerOn: session.powerOn,
      };
    case 'crossRunStabilizing':
    case 'crossRunDisconnect':
      return {
        hoseState: 'connected',
        equilibriumHeightMm: previousTargetHeightMm,
        lockingScrewProgress: 0,
        powerOn: session.powerOn,
      };
    default:
      return {
        hoseState: 'connected',
        equilibriumHeightMm: targetHeightMm,
        lockingScrewProgress: 0,
        powerOn: session.powerOn,
      };
  }
};

export type PistonOscillationGuideStrongTargetId =
  | 'powerButton'
  | 'settings'
  | 'platform'
  | 'heightStageAction'
  | 'operationMirror'
  | 'hoseDisconnect'
  | 'hoseReconnect'
  | 'primary'
  | 'redo'
  | 'save'
  | 'periodTool'
  | 'periodChart'
  | 'periodEndpoints'
  | 'periodAnswer'
  | 'periodNext';

export const getPistonOscillationGuideRequestedFocusMode = (
  step: PistonOscillationGuideStep,
): PistonOscillationGuideFocusMode => {
  switch (step) {
    case 'powerOn':
    case 'powerOff':
      return 'powerFocus';
    case 'parameterSetup':
    case 'hoseReconnect':
    case 'crossRunStabilizing':
    case 'crossRunDisconnect':
    case 'periodProcessing':
    case 'calculationReady':
    case 'completionReview':
    case 'completed':
      return 'overview';
    default:
      return 'pistonFocus';
  }
};

export const getPistonOscillationGuideStrongTargetId = (
  step: PistonOscillationGuideStep,
  _heightAdjustmentStage: PistonOscillationHeightAdjustmentStage,
  heightHandoffComplete = false,
  session?: PistonOscillationGuideSession | null,
  periodSelectionToolActive = false,
): PistonOscillationGuideStrongTargetId | null => {
  switch (step) {
    case 'powerOn':
    case 'powerOff':
      return 'powerButton';
    case 'parameterSetup':
      return 'settings';
    case 'firstHeightAdjustment':
    case 'nextHeightAdjustment':
      return heightHandoffComplete ? 'heightStageAction' : 'platform';
    case 'waitingTrigger':
      return 'platform';
    case 'screwLock':
      return 'operationMirror';
    case 'screwLoosen':
      return 'operationMirror';
    case 'hoseReconnect':
      return 'hoseReconnect';
    case 'crossRunDisconnect':
      return 'hoseDisconnect';
    case 'acquisitionReady':
    case 'pauseAvailable':
      return 'primary';
    case 'awaitingSaveOrRedo':
      return 'save';
    case 'periodProcessing': {
      const processing = session?.dataProcessing;
      const run = processing?.runs[processing.activeRunIndex ?? 0];
      if (!processing || !run || run.selection === null) {
        return periodSelectionToolActive ? 'periodChart' : 'periodTool';
      }
      if (run.selection.issue !== null) return 'periodChart';
      if (
        run.answers.t1.status === 'unresolved'
        || run.answers.t2.status === 'unresolved'
      ) return 'periodEndpoints';
      if (run.answers.period.status === 'unresolved') return 'periodAnswer';
      return run.result ? 'periodNext' : 'periodAnswer';
    }
    default:
      return null;
  }
};

export type PistonOscillationGuideStrongContextKind =
  | 'scaleMirror'
  | 'mainScrew'
  | null;

export const getPistonOscillationGuideStrongContextKind = (
  targetId: PistonOscillationGuideStrongTargetId,
): PistonOscillationGuideStrongContextKind => {
  switch (targetId) {
    case 'platform':
    case 'heightStageAction':
      return 'scaleMirror';
    case 'operationMirror':
      return 'mainScrew';
    default:
      return null;
  }
};

export const getPistonOscillationGuideHeightResetPresentation = (
  heightReset: PistonOscillationGuideHeightReset | null,
) => heightReset
  ? {
      focusMode: 'pistonFocus' as const,
      heightAdjustmentStage: 'readingHeight' as const,
      strongTargetId: 'platform' as const,
    }
  : null;
