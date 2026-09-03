import {
  createDefaultPistonOscillationGuideSession,
  transitionPistonOscillationGuideSession,
  type PistonOscillationGuideEvent,
  type PistonOscillationGuideParameterField,
  type PistonOscillationGuideSession,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  createDefaultPistonOscillationDemoSession,
  type PistonOscillationDemoSession,
} from '../../domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';
import {
  createDefaultPistonOscillationFreeSession,
  transitionPistonOscillationFreeSession,
  type PistonOscillationFreeEvent,
  type PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_PARAMS,
  WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
  createWorkbenchBaseFile,
  type WorkbenchFileBase,
  type WorkbenchFileLayoutDefaults,
} from './workbenchFileState.ts';

export const WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION = 1 as const;
export const WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS = [
  'overview',
  'front',
  'side',
  'top',
] as const;

export type WorkbenchPistonOscillationCameraPreset =
  (typeof WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS)[number];

export interface WorkbenchHeatCapacityPistonOscillationState extends WorkbenchFileBase {
  kind: 'heatCapacityPistonOscillation';
  pistonOscillationSchemaVersion: typeof WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION;
  previewCameraPreset: WorkbenchPistonOscillationCameraPreset;
  pistonOscillationOperationVisualizationEnabled: boolean;
  pistonOscillationLessonIntroAutoShown: boolean;
  pistonOscillationDemoSession: PistonOscillationDemoSession;
  pistonOscillationGuideSession: PistonOscillationGuideSession;
  pistonOscillationFreeSession: PistonOscillationFreeSession;
  pistonOscillationMaterialsExpanded: boolean;
}

export const createDefaultHeatCapacityPistonOscillationFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchHeatCapacityPistonOscillationState => ({
  ...createWorkbenchBaseFile(
    'heatCapacityPistonOscillation',
    index,
    DEFAULT_HEAT_CAPACITY_PARAMS,
    {
      ...defaults,
      liveWorkspaceSplitRatio:
        defaults?.liveWorkspaceSplitRatio ?? WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
    },
  ),
  kind: 'heatCapacityPistonOscillation',
  pistonOscillationSchemaVersion: WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
  previewCameraPreset: 'overview',
  pistonOscillationOperationVisualizationEnabled: false,
  pistonOscillationLessonIntroAutoShown: false,
  pistonOscillationDemoSession: createDefaultPistonOscillationDemoSession(),
  pistonOscillationGuideSession: createDefaultPistonOscillationGuideSession(),
  pistonOscillationFreeSession: createDefaultPistonOscillationFreeSession(),
  pistonOscillationMaterialsExpanded: true,
});

export const startPistonOscillationGuideWorkbenchState = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  now = Date.now(),
): WorkbenchHeatCapacityPistonOscillationState => {
  const pistonOscillationFreeSession = file.pistonOscillationFreeSession.status === 'active'
    ? transitionPistonOscillationFreeSession(
        file.pistonOscillationFreeSession,
        { type: 'pause', nowMs: now },
      )
    : file.pistonOscillationFreeSession;
  return {
    ...file,
    updatedAt: now,
    previewCameraPreset: 'overview',
    pistonOscillationGuideSession: transitionPistonOscillationGuideSession(
      file.pistonOscillationGuideSession,
      { type: 'start', nowMs: now },
    ),
    pistonOscillationFreeSession,
  };
};

export const editPistonOscillationGuideParameterWorkbenchState = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  field: PistonOscillationGuideParameterField,
  value: string,
  now = Date.now(),
): WorkbenchHeatCapacityPistonOscillationState => ({
  ...file,
  updatedAt: now,
  pistonOscillationGuideSession: transitionPistonOscillationGuideSession(
    file.pistonOscillationGuideSession,
    { type: 'editParameter', field, value, nowMs: now },
  ),
});

export const commitPistonOscillationGuideParameterWorkbenchState = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  field: PistonOscillationGuideParameterField,
  now = Date.now(),
): WorkbenchHeatCapacityPistonOscillationState => ({
  ...file,
  updatedAt: now,
  pistonOscillationGuideSession: transitionPistonOscillationGuideSession(
    file.pistonOscillationGuideSession,
    { type: 'commitParameter', field, nowMs: now },
  ),
});

export const transitionPistonOscillationGuideWorkbenchState = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  event: PistonOscillationGuideEvent,
): WorkbenchHeatCapacityPistonOscillationState => {
  const pistonOscillationGuideSession = transitionPistonOscillationGuideSession(
    file.pistonOscillationGuideSession,
    event,
  );
  if (pistonOscillationGuideSession === file.pistonOscillationGuideSession) return file;
  return {
    ...file,
    updatedAt: event.nowMs,
    previewCameraPreset: event.type === 'resetSession' ? 'overview' : file.previewCameraPreset,
    pistonOscillationGuideSession,
  };
};

export const startPistonOscillationFreeWorkbenchState = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  now = Date.now(),
): WorkbenchHeatCapacityPistonOscillationState => {
  const guideSessionSelected = file.pistonOscillationGuideSession.status === 'active'
    || (
      file.pistonOscillationGuideSession.status === 'completed'
      && !file.pistonOscillationGuideSession.completionExited
    );
  const pistonOscillationGuideSession = guideSessionSelected
    ? transitionPistonOscillationGuideSession(
        file.pistonOscillationGuideSession,
        { type: 'exitSession', nowMs: now },
      )
    : file.pistonOscillationGuideSession;
  return {
    ...file,
    updatedAt: now,
    previewCameraPreset: 'overview',
    pistonOscillationGuideSession,
    pistonOscillationFreeSession: transitionPistonOscillationFreeSession(
      file.pistonOscillationFreeSession,
      { type: 'start', nowMs: now },
    ),
  };
};

export const transitionPistonOscillationFreeWorkbenchState = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  event: PistonOscillationFreeEvent,
): WorkbenchHeatCapacityPistonOscillationState => {
  const pistonOscillationFreeSession = transitionPistonOscillationFreeSession(
    file.pistonOscillationFreeSession,
    event,
  );
  if (pistonOscillationFreeSession === file.pistonOscillationFreeSession) return file;
  return {
    ...file,
    updatedAt: event.nowMs,
    previewCameraPreset: event.type === 'reset' ? 'overview' : file.previewCameraPreset,
    pistonOscillationOperationVisualizationEnabled: event.type === 'reset'
      ? false
      : file.pistonOscillationOperationVisualizationEnabled,
    pistonOscillationFreeSession,
  };
};
