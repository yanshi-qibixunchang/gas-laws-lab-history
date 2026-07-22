import type {
  AppExperienceProfile,
  ExperimentLearningMilestone,
} from './experimentLearningModel.ts';
import { EXPERIMENT_LEARNING_REGISTRY } from './experimentLearningRegistry.ts';

export const HEAT_CAPACITY_TUTORIAL_FILE_ID = 'runtime:tutorial:heat-capacity';
export const HEAT_CAPACITY_TUTORIAL_HANDOFF_STORAGE_KEY = 'hsl_heat_capacity_tutorial_handoff_v1';

export interface HeatCapacityTutorialHandoffMarker {
  schemaVersion: 1;
  experiment: 'heatCapacity';
  status: 'profile-unlocked-pending-file';
  targetFileId: string;
  createdAtMs: number;
}

interface TutorialHandoffStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type HeatCapacityTutorialHandoffLoadResult =
  | { status: 'missing'; marker: null }
  | { status: 'loaded'; marker: HeatCapacityTutorialHandoffMarker }
  | { status: 'invalid'; marker: null; error: Error };

const isHandoffMarker = (value: unknown): value is HeatCapacityTutorialHandoffMarker => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 5 &&
    record.schemaVersion === 1 &&
    record.experiment === 'heatCapacity' &&
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

export const loadHeatCapacityTutorialHandoff = (
  storage: Pick<TutorialHandoffStorage, 'getItem'> | null = resolveStorage(),
): HeatCapacityTutorialHandoffLoadResult => {
  if (!storage) return { status: 'missing', marker: null };
  try {
    const raw = storage.getItem(HEAT_CAPACITY_TUTORIAL_HANDOFF_STORAGE_KEY);
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

export const persistHeatCapacityTutorialHandoff = (
  targetFileId: string,
  storage: Pick<TutorialHandoffStorage, 'setItem'> | null = resolveStorage(),
  nowMs = Date.now(),
) => {
  if (!storage) return { ok: false as const, error: new Error('Persistent browser storage is unavailable.') };
  if (targetFileId.trim().length === 0) {
    return { ok: false as const, error: new Error('Tutorial handoff target file identity is invalid.') };
  }
  const marker: HeatCapacityTutorialHandoffMarker = {
    schemaVersion: 1,
    experiment: 'heatCapacity',
    status: 'profile-unlocked-pending-file',
    targetFileId,
    createdAtMs: nowMs,
  };
  try {
    storage.setItem(HEAT_CAPACITY_TUTORIAL_HANDOFF_STORAGE_KEY, JSON.stringify(marker));
    return { ok: true as const, marker };
  } catch (cause) {
    return {
      ok: false as const,
      error: cause instanceof Error ? cause : new Error(String(cause)),
    };
  }
};

export const clearHeatCapacityTutorialHandoff = (
  storage: Pick<TutorialHandoffStorage, 'removeItem'> | null = resolveStorage(),
) => {
  if (!storage) return { ok: false as const, error: new Error('Persistent browser storage is unavailable.') };
  try {
    storage.removeItem(HEAT_CAPACITY_TUTORIAL_HANDOFF_STORAGE_KEY);
    return { ok: true as const };
  } catch (cause) {
    return {
      ok: false as const,
      error: cause instanceof Error ? cause : new Error(String(cause)),
    };
  }
};

export interface HeatCapacityTutorialMilestoneLog {
  id: 'demo-started' | 'guide-unlocked' | 'all-modes-unlocked';
  kind: 'info' | 'success';
}

export const getHeatCapacityTutorialFileName = () => (
  EXPERIMENT_LEARNING_REGISTRY.heatCapacity.tutorialFileName
);

export const isHeatCapacityTutorialFileId = (fileId: string) => (
  fileId === HEAT_CAPACITY_TUTORIAL_FILE_ID
);

export const getHeatCapacityTutorialResumeMode = (
  milestone: ExperimentLearningMilestone,
): 'demo' | 'guide' | null => (
  milestone === 'demo' ? 'demo' : milestone === 'guide' ? 'guide' : null
);

export const getHeatCapacityTutorialMilestoneLogs = (
  milestone: ExperimentLearningMilestone,
): HeatCapacityTutorialMilestoneLog[] => {
  const logs: HeatCapacityTutorialMilestoneLog[] = [{ id: 'demo-started', kind: 'info' }];
  if (milestone === 'guide' || milestone === 'unlocked') {
    logs.push({ id: 'guide-unlocked', kind: 'success' });
  }
  if (milestone === 'unlocked') {
    logs.push({ id: 'all-modes-unlocked', kind: 'success' });
  }
  return logs;
};

export const shouldReconstructHeatCapacityTutorial = (profile: AppExperienceProfile) => (
  profile.activeTutorialExperiment === 'heatCapacity' &&
  profile.learning.heatCapacity !== 'unlocked'
);
