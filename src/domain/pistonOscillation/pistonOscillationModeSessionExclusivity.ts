import type {
  PistonOscillationGuideSession,
} from './pistonOscillationGuideWorkflowModel.ts';
import {
  transitionPistonOscillationFreeSession,
  type PistonOscillationFreeSession,
} from './pistonOscillationFreeWorkflowModel.ts';

export const repairPistonOscillationModeSessionExclusivity = (
  guideSession: PistonOscillationGuideSession,
  freeSession: PistonOscillationFreeSession,
) => {
  if (guideSession.status !== 'active' || freeSession.status !== 'active') {
    return { guideSession, freeSession, repaired: false as const };
  }
  return {
    guideSession,
    freeSession: transitionPistonOscillationFreeSession(freeSession, {
      type: 'pause',
      nowMs: Math.max(
        0,
        guideSession.updatedAtMs ?? guideSession.startedAtMs ?? 0,
        freeSession.updatedAtMs ?? freeSession.startedAtMs ?? 0,
      ),
    }),
    repaired: true as const,
  };
};
