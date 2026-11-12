import { normalizePistonOscillationRawMeasurementRecord, type PistonOscillationRawMeasurementRecord } from '../../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import type { PistonOscillationPressOperationEvidence } from '../../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';

export const historicalUnreleasedPressEvidence = (
  evidence: PistonOscillationPressOperationEvidence,
): PistonOscillationPressOperationEvidence => ({
  ...evidence,
  completion: 'not-released',
  releaseVelocityMPerS: null,
  spaceReleaseOffsetS: null,
  mouseReleaseOffsetS: null,
  signedReleaseGapS: null,
  releaseOrder: 'unknown',
  releaseState: null,
});

export const restoreHistoricalImmediateRecord = (
  template: PistonOscillationRawMeasurementRecord,
  releaseOffsetS: number | null,
) => normalizePistonOscillationRawMeasurementRecord({
  ...template,
  acquisitionSettings: { ...template.acquisitionSettings, recordingPath: 'immediate', releaseOffsetS },
  physicsSnapshot: {
    ...template.physicsSnapshot,
    triggerTimeS: null,
    ...(releaseOffsetS === null ? { captureKind: 'incomplete-press', integrationSubstepsPerSample: 1 } : {}),
  },
  pressOperationEvidence: releaseOffsetS === null
    ? historicalUnreleasedPressEvidence(template.pressOperationEvidence)
    : template.pressOperationEvidence,
});
