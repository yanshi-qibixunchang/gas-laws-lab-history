import {
  createLegacyUnlockedExperienceProfile,
  parseAppExperienceProfile,
  type AppExperienceProfile,
} from './experimentLearningModel.ts';

export const APP_EXPERIENCE_PROFILE_STORAGE_KEY = 'hsl_experience_profile_v1';

export interface ExperienceProfileStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export type ExperienceProfileLoadResult =
  | {
      status: 'loaded';
      profile: AppExperienceProfile;
      persisted: true;
    }
  | {
      status: 'missing';
      profile: AppExperienceProfile;
      persisted: false;
    }
  | {
      status: 'invalid';
      profile: AppExperienceProfile;
      persisted: false;
      error: Error;
    };

export type ExperienceProfileWriteResult =
  | { ok: true; profile: AppExperienceProfile }
  | { ok: false; error: Error };

const resolveBrowserStorage = (): ExperienceProfileStorage | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const toError = (cause: unknown, fallback: string) => (
  cause instanceof Error ? cause : new Error(cause === undefined ? fallback : String(cause))
);

export const loadAppExperienceProfile = (
  storage: ExperienceProfileStorage | null = resolveBrowserStorage(),
): ExperienceProfileLoadResult => {
  if (!storage) {
    return {
      status: 'missing',
      profile: createLegacyUnlockedExperienceProfile(),
      persisted: false,
    };
  }
  let raw: string | null;
  try {
    raw = storage.getItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY);
  } catch (cause) {
    return {
      status: 'invalid',
      profile: createLegacyUnlockedExperienceProfile(),
      persisted: false,
      error: toError(cause, 'Experience profile could not be read.'),
    };
  }
  if (raw === null) {
    return {
      status: 'missing',
      profile: createLegacyUnlockedExperienceProfile(),
      persisted: false,
    };
  }
  try {
    const parsed = parseAppExperienceProfile(JSON.parse(raw));
    if (parsed.ok === false) {
      return {
        status: 'invalid',
        profile: createLegacyUnlockedExperienceProfile(),
        persisted: false,
        error: new Error(parsed.reason),
      };
    }
    return { status: 'loaded', profile: parsed.value, persisted: true };
  } catch (cause) {
    return {
      status: 'invalid',
      profile: createLegacyUnlockedExperienceProfile(),
      persisted: false,
      error: toError(cause, 'Experience profile contains invalid JSON.'),
    };
  }
};

export const persistAppExperienceProfile = (
  profile: AppExperienceProfile,
  storage: ExperienceProfileStorage | null = resolveBrowserStorage(),
): ExperienceProfileWriteResult => {
  const parsed = parseAppExperienceProfile(profile);
  if (parsed.ok === false) return { ok: false, error: new Error(parsed.reason) };
  if (!storage) return { ok: false, error: new Error('Persistent browser storage is unavailable.') };
  try {
    storage.setItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY, JSON.stringify(parsed.value));
    return { ok: true, profile: parsed.value };
  } catch (cause) {
    return {
      ok: false,
      error: toError(cause, 'Experience profile could not be saved.'),
    };
  }
};
