import type {
  PistonOscillationGuideAction,
  PistonOscillationGuideSession,
  PistonOscillationGuideStep,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';

export type PistonOscillationGuidePrimaryAction = Extract<
  PistonOscillationGuideAction,
  'startAcquisition' | 'pauseAcquisition'
>;

export interface PistonOscillationGuidePrimaryControlInput {
  status: PistonOscillationGuideSession['status'];
  step: PistonOscillationGuideStep;
  pauseReady: boolean;
  candidateAvailable: boolean;
}

export interface PistonOscillationGuidePrimaryControlState {
  action: PistonOscillationGuidePrimaryAction | null;
  showsPause: boolean;
  allowed: boolean;
}

export const getPistonOscillationGuidePrimaryControlState = ({
  status,
  step,
  pauseReady,
  candidateAvailable,
}: PistonOscillationGuidePrimaryControlInput): PistonOscillationGuidePrimaryControlState => {
  const action: PistonOscillationGuidePrimaryAction | null = step === 'acquisitionReady'
    ? 'startAcquisition'
    : step === 'pauseAvailable'
      ? 'pauseAcquisition'
      : null;
  const showsPause = step === 'waitingTrigger'
    || step === 'recording'
    || step === 'pauseAvailable';
  const allowed = status === 'active'
    && action !== null
    && (
      action === 'startAcquisition'
      || (pauseReady && candidateAvailable)
    );

  return { action, showsPause, allowed };
};
