import type {
  AppExperienceProfile,
  ExperimentLearningId,
  ExperimentLearningMilestone,
} from './experimentLearningModel.ts';
import { EXPERIMENT_LEARNING_REGISTRY } from './experimentLearningRegistry.ts';

export const EXPERIMENT_TUTORIAL_FILE_IDS: Record<ExperimentLearningId, string> = {
  heatCapacity: 'runtime:tutorial:heat-capacity',
  pistonOscillation: 'runtime:tutorial:piston-oscillation',
};

// Keep the established key so an update cannot strand an in-flight heat-capacity handoff.
export const EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY = 'hsl_heat_capacity_tutorial_handoff_v1';

export interface ExperimentTutorialHandoffMarker {
  schemaVersion: 1;
  experiment: ExperimentLearningId;
  status: 'profile-unlocked-pending-file';
  targetFileId: string;
  createdAtMs: number;
}

interface TutorialHandoffStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type ExperimentTutorialHandoffLoadResult =
  | { status: 'missing'; marker: null }
  | { status: 'loaded'; marker: ExperimentTutorialHandoffMarker }
  | { status: 'invalid'; marker: null; error: Error };

const isExperimentLearningId = (value: unknown): value is ExperimentLearningId => (
  value === 'heatCapacity' || value === 'pistonOscillation'
);

const isHandoffMarker = (value: unknown): value is ExperimentTutorialHandoffMarker => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 5 &&
    record.schemaVersion === 1 &&
    isExperimentLearningId(record.experiment) &&
    record.status === 'profile-unlocked-pending-file' &&
    typeof record.targetFileId === 'string' &&
    record.targetFileId.trim().length > 0 &&
    typeof record.createdAtMs === 'number' &&
    Number.isFinite(record.createdAtMs)
  );
};

const resolveStorage = (): TutorialHandoffStorage | null => (
  typeof window === 'undefined' ? null : window.localStorage
);

export const loadExperimentTutorialHandoff = (
  storage: Pick<TutorialHandoffStorage, 'getItem'> | null = resolveStorage(),
): ExperimentTutorialHandoffLoadResult => {
  if (!storage) return { status: 'missing', marker: null };
  try {
    const raw = storage.getItem(EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY);
    if (raw === null) return { status: 'missing', marker: null };
    const marker: unknown = JSON.parse(raw);
    return isHandoffMarker(marker)
      ? { status: 'loaded', marker }
      : { status: 'invalid', marker: null, error: new Error('Tutorial handoff marker is invalid.') };
  } catch (cause) {
    return {
      status: 'invalid',
      marker: null,
      error: cause instanceof Error ? cause : new Error(String(cause)),
    };
  }
};

export const persistExperimentTutorialHandoff = (
  experiment: ExperimentLearningId,
  targetFileId: string,
  storage: Pick<TutorialHandoffStorage, 'setItem'> | null = resolveStorage(),
  nowMs = Date.now(),
) => {
  if (!storage) return { ok: false as const, error: new Error('Persistent browser storage is unavailable.') };
  if (targetFileId.trim().length === 0) {
    return { ok: false as const, error: new Error('Tutorial handoff target file identity is invalid.') };
  }
  const marker: ExperimentTutorialHandoffMarker = {
    schemaVersion: 1,
    experiment,
    status: 'profile-unlocked-pending-file',
    targetFileId,
    createdAtMs: nowMs,
  };
  try {
    storage.setItem(EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY, JSON.stringify(marker));
    return { ok: true as const, marker };
  } catch (cause) {
    return {
      ok: false as const,
      error: cause instanceof Error ? cause : new Error(String(cause)),
    };
  }
};

export const clearExperimentTutorialHandoff = (
  storage: Pick<TutorialHandoffStorage, 'removeItem'> | null = resolveStorage(),
) => {
  if (!storage) return { ok: false as const, error: new Error('Persistent browser storage is unavailable.') };
  try {
    storage.removeItem(EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY);
    return { ok: true as const };
  } catch (cause) {
    return {
      ok: false as const,
      error: cause instanceof Error ? cause : new Error(String(cause)),
    };
  }
};

export interface ExperimentTutorialMilestoneLog {
  id: 'demo-started' | 'guide-unlocked' | 'all-modes-unlocked';
  kind: 'info' | 'success';
}

export const getExperimentTutorialFileId = (experiment: ExperimentLearningId) => (
  EXPERIMENT_TUTORIAL_FILE_IDS[experiment]
);

export const getExperimentTutorialFileName = (experiment: ExperimentLearningId) => (
  EXPERIMENT_LEARNING_REGISTRY[experiment].tutorialFileName
);

export const isExperimentTutorialFileId = (
  fileId: string,
  experiment?: ExperimentLearningId | null,
) => experiment
  ? fileId === getExperimentTutorialFileId(experiment)
  : Object.values(EXPERIMENT_TUTORIAL_FILE_IDS).includes(fileId);

export const getExperimentTutorialResumeMode = (
  milestone: ExperimentLearningMilestone,
): 'demo' | 'guide' | null => (
  milestone === 'demo' ? 'demo' : milestone === 'guide' ? 'guide' : null
);

export const getExperimentTutorialMilestoneLogs = (
  milestone: ExperimentLearningMilestone,
): ExperimentTutorialMilestoneLog[] => {
  const logs: ExperimentTutorialMilestoneLog[] = [{ id: 'demo-started', kind: 'info' }];
  if (milestone === 'guide' || milestone === 'unlocked') {
    logs.push({ id: 'guide-unlocked', kind: 'success' });
  }
  if (milestone === 'unlocked') {
    logs.push({ id: 'all-modes-unlocked', kind: 'success' });
  }
  return logs;
};

export const shouldReconstructExperimentTutorial = (profile: AppExperienceProfile) => {
  const experiment = profile.activeTutorialExperiment;
  return experiment !== null && profile.learning[experiment] !== 'unlocked';
};
