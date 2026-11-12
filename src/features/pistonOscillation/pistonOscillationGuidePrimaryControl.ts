import type {
  PistonOscillationGuideSession,
  PistonOscillationGuideStep,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';

export interface PistonOscillationGuidePrimaryControlInput {
  status: PistonOscillationGuideSession['status'];
  step: PistonOscillationGuideStep;
}

export interface PistonOscillationGuidePrimaryControlState {
  action: 'startAcquisition' | null;
  allowed: boolean;
}

export const getPistonOscillationGuidePrimaryControlState = ({
  status,
  step,
}: PistonOscillationGuidePrimaryControlInput): PistonOscillationGuidePrimaryControlState => ({
  action: step === 'acquisitionReady' ? 'startAcquisition' : null,
  allowed: status === 'active' && step === 'acquisitionReady',
});
