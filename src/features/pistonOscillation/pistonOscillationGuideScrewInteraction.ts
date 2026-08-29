import type {
  PistonOscillationGuideAction,
  PistonOscillationGuideStep,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  PISTON_LOCKING_SCREW_LOCK_THRESHOLD,
} from './pistonOscillationModelMotion.ts';

export type PistonOscillationGuideScrewDirection = 'clockwise' | 'counterclockwise';

export type PistonOscillationGuideScrewInteractionMode =
  | 'tighten'
  | 'loosen'
  | 'protectLocked'
  | 'protectLoose';

export type PistonOscillationGuideScrewFeedbackKind =
  | 'none'
  | 'wrongDirection'
  | 'boundaryBlocked';

export interface PistonOscillationGuideScrewResolution {
  attemptedDirection: PistonOscillationGuideScrewDirection;
  expectedDirection: PistonOscillationGuideScrewDirection;
  nextProgress: number;
  feedback: PistonOscillationGuideScrewFeedbackKind;
  authorizationAction: Extract<
    PistonOscillationGuideAction,
    'tightenScrew' | 'loosenScrew'
  > | null;
}

export interface PistonOscillationGuideScrewFeedbackState {
  softFeedbackShown: boolean;
  boundaryFeedbackShown: boolean;
}

export interface PistonOscillationGuideScrewFeedbackDecision {
  feedback: PistonOscillationGuideScrewFeedbackKind;
  nextState: PistonOscillationGuideScrewFeedbackState;
}

const PISTON_OSCILLATION_GUIDE_SCREW_LOOSE_BOUNDARY_EPSILON = 0.000001;

const clampScrewProgress = (progress: number) => Math.min(1, Math.max(0, progress));

export const resolvePistonOscillationGuideScrewFeedback = (
  feedback: PistonOscillationGuideScrewFeedbackKind,
  state: PistonOscillationGuideScrewFeedbackState,
): PistonOscillationGuideScrewFeedbackDecision => {
  if (feedback === 'none') return { feedback, nextState: state };

  if (!state.softFeedbackShown) {
    return {
      feedback: 'wrongDirection',
      nextState: {
        ...state,
        softFeedbackShown: true,
      },
    };
  }

  if (feedback === 'boundaryBlocked' && !state.boundaryFeedbackShown) {
    return {
      feedback,
      nextState: {
        ...state,
        boundaryFeedbackShown: true,
      },
    };
  }

  return { feedback: 'none', nextState: state };
};

export const getPistonOscillationGuideScrewInteractionMode = (
  step: PistonOscillationGuideStep,
): PistonOscillationGuideScrewInteractionMode | null => {
  switch (step) {
    case 'acquisitionReady':
    case 'waitingTrigger':
    case 'recording':
    case 'pauseAvailable':
    case 'curveFrozen':
    case 'awaitingSaveOrRedo':
      return 'protectLoose';
    case 'screwLock':
      return 'tighten';
    case 'hoseReconnect':
      return 'protectLocked';
    case 'screwLoosen':
      return 'loosen';
    default:
      return null;
  }
};

export const resolvePistonOscillationGuideScrewDelta = (
  currentProgress: number,
  progressDelta: number,
  mode: PistonOscillationGuideScrewInteractionMode,
): PistonOscillationGuideScrewResolution => {
  const attemptedDirection: PistonOscillationGuideScrewDirection = progressDelta > 0
    ? 'clockwise'
    : 'counterclockwise';
  const expectedDirection: PistonOscillationGuideScrewDirection = (
    mode === 'tighten' || mode === 'protectLocked'
  )
    ? 'clockwise'
    : 'counterclockwise';
  const candidateProgress = clampScrewProgress(currentProgress + progressDelta);
  const directionMatches = attemptedDirection === expectedDirection;

  if (mode === 'tighten' || mode === 'loosen') {
    return {
      attemptedDirection,
      expectedDirection,
      nextProgress: candidateProgress,
      feedback: directionMatches ? 'none' : 'wrongDirection',
      authorizationAction: directionMatches
        ? mode === 'tighten' ? 'tightenScrew' : 'loosenScrew'
        : null,
    };
  }

  if (directionMatches) {
    return {
      attemptedDirection,
      expectedDirection,
      nextProgress: candidateProgress,
      feedback: 'none',
      authorizationAction: null,
    };
  }

  if (
    mode === 'protectLocked'
    && candidateProgress < PISTON_LOCKING_SCREW_LOCK_THRESHOLD
  ) {
    return {
      attemptedDirection,
      expectedDirection,
      nextProgress: PISTON_LOCKING_SCREW_LOCK_THRESHOLD,
      feedback: 'boundaryBlocked',
      authorizationAction: null,
    };
  }

  if (
    mode === 'protectLoose'
    && candidateProgress >= PISTON_LOCKING_SCREW_LOCK_THRESHOLD
  ) {
    return {
      attemptedDirection,
      expectedDirection,
      nextProgress: PISTON_LOCKING_SCREW_LOCK_THRESHOLD
        - PISTON_OSCILLATION_GUIDE_SCREW_LOOSE_BOUNDARY_EPSILON,
      feedback: 'boundaryBlocked',
      authorizationAction: null,
    };
  }

  return {
    attemptedDirection,
    expectedDirection,
    nextProgress: candidateProgress,
    feedback: 'wrongDirection',
    authorizationAction: null,
  };
};
