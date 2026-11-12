import { PISTON_TEACHING_HEIGHTS_MM } from '../../domain/pistonOscillation/pistonOscillationHeightLimits.ts';
export const WORKSPACE_TOUR_FILE_STEPS = [
  'top', 'files', 'workspace', 'modes', 'console', 'parameters',
] as const;

export type WorkspaceTourFileStep = typeof WORKSPACE_TOUR_FILE_STEPS[number];
export type WorkspaceTourStep = WorkspaceTourFileStep | 'create' | 'finished' | 'skipped' | 'not-needed';

export const isWorkspaceTourFileStep = (step: unknown): step is WorkspaceTourFileStep =>
  WORKSPACE_TOUR_FILE_STEPS.some((candidate) => candidate === step);

export const isWorkspaceTourStep = (step: unknown): step is WorkspaceTourStep =>
  isWorkspaceTourFileStep(step) || step === 'create' || step === 'finished'
  || step === 'skipped' || step === 'not-needed';

export const WORKSPACE_TOUR_FILE_ID = 'runtime:workspace-tour:piston-oscillation';
export const WORKSPACE_TOUR_HEIGHTS_MM = PISTON_TEACHING_HEIGHTS_MM;
