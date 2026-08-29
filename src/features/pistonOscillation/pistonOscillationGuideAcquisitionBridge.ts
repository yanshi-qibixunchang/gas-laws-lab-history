import {
  transitionPistonOscillationGuideSession,
  type PistonOscillationGuideEvent,
  type PistonOscillationGuideSavedMeasurement,
  type PistonOscillationGuideSession,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';

export type PistonOscillationGuideAcquisitionEvent =
  | { type: 'startAcquisition' }
  | { type: 'restoreInterruptedAcquisition' }
  | {
      type: 'pressureAttemptRejected';
      reason: 'underpressure' | 'overpressure';
      peakPressureKpa: number;
    }
  | { type: 'pressureAttemptAccepted'; peakPressureKpa: number }
  | { type: 'redoOverpressureAttempt' }
  | { type: 'triggered' }
  | {
      type: 'recordingReady';
      candidate: PistonOscillationGuideSavedMeasurement;
    }
  | {
      type: 'curvePaused';
      candidate: PistonOscillationGuideSavedMeasurement;
    }
  | { type: 'saveMeasurement' };

export type PistonOscillationGuideWorkflowAcquisitionEvent = Exclude<
  PistonOscillationGuideAcquisitionEvent,
  { type: 'pressureAttemptRejected' | 'pressureAttemptAccepted' }
>;

const applyRequiredGuideEvents = (
  session: PistonOscillationGuideSession,
  events: readonly PistonOscillationGuideEvent[],
) => {
  let nextSession = session;
  for (const event of events) {
    const transitioned = transitionPistonOscillationGuideSession(nextSession, event);
    if (transitioned === nextSession) return null;
    nextSession = transitioned;
  }
  return nextSession;
};

export const transitionPistonOscillationGuideAcquisitionSession = (
  session: PistonOscillationGuideSession,
  event: PistonOscillationGuideWorkflowAcquisitionEvent,
  nowMs: number,
): PistonOscillationGuideSession | null => {
  if (session.status !== 'active') return null;

  switch (event.type) {
    case 'startAcquisition':
      if (session.step !== 'acquisitionReady') return null;
      return applyRequiredGuideEvents(session, [{ type: 'startAcquisition', nowMs }]);
    case 'restoreInterruptedAcquisition':
      if (session.step !== 'recording' || session.acquisitionCandidate !== null) return null;
      return applyRequiredGuideEvents(session, [{ type: 'discardAcquisitionAttempt', nowMs }]);
    case 'redoOverpressureAttempt':
      if (session.step !== 'recording' && session.step !== 'pauseAvailable') return null;
      return applyRequiredGuideEvents(session, [{ type: 'discardAcquisitionAttempt', nowMs }]);
    case 'triggered':
      if (session.step !== 'waitingTrigger') return null;
      return applyRequiredGuideEvents(session, [{
        type: 'releasePiston',
        bothHandsReleased: true,
        nowMs,
      }]);
    case 'recordingReady':
      if (session.step !== 'recording') return null;
      return applyRequiredGuideEvents(session, [{
        type: 'updateRecording',
        recordedDurationS: event.candidate.acquisitionSettings.recordedDurationS,
        samples: event.candidate.samples,
        candidate: event.candidate,
        nowMs,
      }]);
    case 'curvePaused':
      if (session.step !== 'pauseAvailable') return null;
      return applyRequiredGuideEvents(session, [
        {
          type: 'updateRecording',
          recordedDurationS: event.candidate.acquisitionSettings.recordedDurationS,
          samples: event.candidate.samples,
          candidate: event.candidate,
          nowMs,
        },
        { type: 'pauseRecording', nowMs },
        { type: 'curveFreezeComplete', nowMs },
      ]);
    case 'saveMeasurement':
      if (session.step !== 'awaitingSaveOrRedo') return null;
      return applyRequiredGuideEvents(session, [{ type: 'saveMeasurement', nowMs }]);
  }
};
