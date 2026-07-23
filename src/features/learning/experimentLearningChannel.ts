import {
  parseAppExperienceProfile,
  type AppExperienceProfile,
} from './experimentLearningModel.ts';
import { APP_EXPERIENCE_PROFILE_STORAGE_KEY } from './experimentLearningStore.ts';

export const EXPERIMENT_LEARNING_CHANNEL_NAME = 'hsl-experiment-learning-v1';
export const EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY = 'hsl_experiment_tutorial_owner_v1';
export const EXPERIMENT_TUTORIAL_OWNER_TTL_MS = 15_000;

export interface ExperimentTutorialOwnerRecord {
  instanceId: string;
  experiment: 'heatCapacity';
  updatedAtMs: number;
}

interface TutorialOwnerStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type ExperimentLearningChannelMessage = {
  type: 'profile-updated';
  sourceId: string;
  profile: AppExperienceProfile;
};

interface LearningChannelOptions {
  channelFactory?: (name: string) => BroadcastChannel;
  targetWindow?: Window | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const parseExperimentLearningChannelMessage = (
  value: unknown,
): ExperimentLearningChannelMessage | null => {
  if (!isRecord(value) || value.type !== 'profile-updated' || typeof value.sourceId !== 'string') return null;
  const parsed = parseAppExperienceProfile(value.profile);
  return parsed.ok
    ? { type: 'profile-updated', sourceId: value.sourceId, profile: parsed.value }
    : null;
};

export const createExperimentLearningChannel = (
  sourceId: string,
  onMessage: (message: ExperimentLearningChannelMessage) => void,
  options: LearningChannelOptions = {},
) => {
  const targetWindow = options.targetWindow === undefined
    ? (typeof window === 'undefined' ? null : window)
    : options.targetWindow;
  const channelFactory = options.channelFactory ?? (
    typeof BroadcastChannel === 'undefined' ? undefined : (name: string) => new BroadcastChannel(name)
  );
  let channel: BroadcastChannel | null = null;
  try {
    channel = channelFactory?.(EXPERIMENT_LEARNING_CHANNEL_NAME) ?? null;
  } catch {
    channel = null;
  }

  const receive = (value: unknown) => {
    const message = parseExperimentLearningChannelMessage(value);
    if (message && message.sourceId !== sourceId) onMessage(message);
  };
  if (channel) channel.onmessage = (event) => receive(event.data);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== APP_EXPERIENCE_PROFILE_STORAGE_KEY || event.newValue === null) return;
    try {
      const profile = parseAppExperienceProfile(JSON.parse(event.newValue));
      if (profile.ok) onMessage({ type: 'profile-updated', sourceId: 'storage-event', profile: profile.value });
    } catch {
      // A malformed external write is ignored; the strict store reports it on direct reads.
    }
  };
  targetWindow?.addEventListener('storage', handleStorage);

  return {
    publish(profile: AppExperienceProfile) {
      const message: ExperimentLearningChannelMessage = { type: 'profile-updated', sourceId, profile };
      channel?.postMessage(message);
    },
    close() {
      targetWindow?.removeEventListener('storage', handleStorage);
      channel?.close();
    },
  };
};

const parseOwnerRecord = (value: string | null): ExperimentTutorialOwnerRecord | null => {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      typeof parsed.instanceId !== 'string' ||
      parsed.experiment !== 'heatCapacity' ||
      typeof parsed.updatedAtMs !== 'number' ||
      !Number.isFinite(parsed.updatedAtMs)
    ) return null;
    return parsed as unknown as ExperimentTutorialOwnerRecord;
  } catch {
    return null;
  }
};

export const claimHeatCapacityTutorialOwnership = (
  instanceId: string,
  storage: Pick<TutorialOwnerStorage, 'getItem' | 'setItem'>,
  nowMs = Date.now(),
) => {
  const current = parseOwnerRecord(storage.getItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY));
  if (
    current &&
    current.instanceId !== instanceId &&
    nowMs - current.updatedAtMs < EXPERIMENT_TUTORIAL_OWNER_TTL_MS
  ) return false;
  return takeOverHeatCapacityTutorialOwnership(instanceId, storage, nowMs);
};

export const takeOverHeatCapacityTutorialOwnership = (
  instanceId: string,
  storage: Pick<TutorialOwnerStorage, 'getItem' | 'setItem'>,
  nowMs = Date.now(),
) => {
  const next: ExperimentTutorialOwnerRecord = {
    instanceId,
    experiment: 'heatCapacity',
    updatedAtMs: nowMs,
  };
  storage.setItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY, JSON.stringify(next));
  return parseOwnerRecord(storage.getItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY))?.instanceId === instanceId;
};

export const releaseHeatCapacityTutorialOwnership = (
  instanceId: string,
  storage: Pick<TutorialOwnerStorage, 'getItem' | 'removeItem'>,
) => {
  const current = parseOwnerRecord(storage.getItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY));
  if (current?.instanceId !== instanceId) return false;
  storage.removeItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY);
  return true;
};
