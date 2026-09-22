import assert from 'node:assert/strict';
import { applyPistonUncertaintyAction, type PistonOscillationDataProcessingSession } from '../../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { calculatePistonUncertainty, PISTON_UNCERTAINTY_PHASES, PISTON_UNCERTAINTY_FIELDS, pistonUncertaintyReference } from '../../../src/domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';

export const completeUncertaintyExercises = (processing: PistonOscillationDataProcessingSession) => {
  if (!processing.calculationSession?.uncertainty) return processing;
  const analysis = calculatePistonUncertainty(processing.calculationSession.knowns, processing.linearFitResult!, processing.runs, processing.calculationSession.uncertainty.profile);
  assert.ok(analysis, 'Uncertainty requires the unified calculation chain');
  assert.equal(analysis.issue, null, `Uncertainty prerequisites: ${analysis.issue}`);
  let next = processing;
  for (const phase of PISTON_UNCERTAINTY_PHASES) {
    next = applyPistonUncertaintyAction(next, { kind: 'read', phase }, 4000);
    for (const id of PISTON_UNCERTAINTY_FIELDS[phase]) {
      next = applyPistonUncertaintyAction(next, { kind: 'edit', field: id, value: pistonUncertaintyReference(id, analysis) }, 4001);
      next = applyPistonUncertaintyAction(next, { kind: 'check', field: id }, 4002);
      assert.equal(next.calculationSession!.uncertainty!.answers[id].status, 'correct', id);
    }
  }
  return next;
};
