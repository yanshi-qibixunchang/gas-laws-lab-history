import {
  createHeatCapacityModeTransitionCheckpoint,
  createHeatCapacityModeTransitionState,
  normalizeHeatCapacityModeTransitionCheckpoint,
  type HeatCapacityModeTransitionCheckpoint,
} from '../heatCapacity/heatCapacityModeTransitionModel.ts';
import type {
  HeatCapacityModeTransitionDemoClock,
} from '../heatCapacity/heatCapacityModeTransitionDemoClock.ts';
import type {
  HeatCapacityModeCameraPoseCheckpoint,
  HeatCapacityModeDemoCheckpoint,
  HeatCapacityModeGuideCheckpoint,
  HeatCapacityModeJsonObject,
  HeatCapacityModeJsonValue,
  HeatCapacityModeLessonDialogCheckpoint,
  HeatCapacityModePauseReason,
  HeatCapacityModeQuaternionTuple,
  HeatCapacityModeVector3Tuple,
} from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  HEAT_CAPACITY_GUIDE_LESSON_STEP_IDS,
  normalizeHeatCapacityModeGuideCheckpoint,
} from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';

export const WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY =
  'hard-sphere-lab/workbench-heat-capacity-refresh-session' as const;
export const WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION = 2 as const;
export const WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY =
  'hsl_workbench_heat_capacity_refresh_session_v2' as const;

export type WorkbenchHeatCapacityRefreshMode = 'demo' | 'guide' | 'free';
export type WorkbenchHeatCapacityDemoRefreshPhase = HeatCapacityModeDemoCheckpoint['phase'];
export type WorkbenchHeatCapacityDemoTimelineStage = NonNullable<
  HeatCapacityModeDemoCheckpoint['timeline']['currentStage']
>;
export type WorkbenchHeatCapacityDemoStepPanelMode = HeatCapacityModeDemoCheckpoint['stepPanel']['mode'];
export type WorkbenchHeatCapacityDemoCameraMode = NonNullable<HeatCapacityModeDemoCheckpoint['cameraMode']>;
export type WorkbenchHeatCapacityRefreshPauseReason = HeatCapacityModePauseReason;
export type WorkbenchHeatCapacityRefreshJsonValue = HeatCapacityModeJsonValue;
export type WorkbenchHeatCapacityRefreshJsonObject = HeatCapacityModeJsonObject;
export type WorkbenchHeatCapacityDemoTimelineCheckpoint = HeatCapacityModeDemoCheckpoint['timeline'];
export type WorkbenchHeatCapacityDemoStepPanelCheckpoint = HeatCapacityModeDemoCheckpoint['stepPanel'];
export type WorkbenchHeatCapacityDemoRefreshCheckpoint = HeatCapacityModeDemoCheckpoint;

export interface WorkbenchHeatCapacityReminderCheckpoint {
  active: boolean;
  controlId: string | null;
  message: string | null;
  remainingMs: number | null;
}

export type WorkbenchHeatCapacityLessonDialogCheckpoint = HeatCapacityModeLessonDialogCheckpoint;

export type WorkbenchHeatCapacityToastLevel = 'info' | 'success' | 'warning' | 'danger';
export type WorkbenchHeatCapacityToastSource =
  | 'guide'
  | 'guide-blocked'
  | 'pressure-warning'
  | 'pressure-close-valve'
  | 'pressure-alarm';

export interface WorkbenchHeatCapacityToastRefreshCheckpoint {
  id: string;
  text: string;
  level: WorkbenchHeatCapacityToastLevel;
  priority: number;
  source: WorkbenchHeatCapacityToastSource;
  createdAtMs: number;
  remainingMs: number;
}

export interface WorkbenchHeatCapacityToastQueueRefreshCheckpoint {
  current: WorkbenchHeatCapacityToastRefreshCheckpoint | null;
  pending: WorkbenchHeatCapacityToastRefreshCheckpoint[];
}

export interface WorkbenchHeatCapacityGuideUiRefreshCheckpoint {
  focusControlId: string | null;
  focusPulseActive: boolean;
  missCount: number;
  pauseReasons: WorkbenchHeatCapacityRefreshPauseReason[];
  normalReminder: WorkbenchHeatCapacityReminderCheckpoint;
  strongReminder: WorkbenchHeatCapacityReminderCheckpoint;
  lessonDialog: WorkbenchHeatCapacityLessonDialogCheckpoint | null;
  shownLessonIds: string[];
  toastQueue: WorkbenchHeatCapacityToastQueueRefreshCheckpoint;
  pressureAlarmVisible: boolean;
  pressureAlarmRemainingMs: number | null;
}

/**
 * UI-only state intentionally remains JSON-shaped so the workbench can add a
 * window or draft without coupling this storage boundary to React-local types.
 * The decoder still deep-validates it and strips non-JSON or unsafe values.
 */
export interface WorkbenchHeatCapacityUiRefreshCheckpoint {
  windows: WorkbenchHeatCapacityRefreshJsonObject;
  drafts: WorkbenchHeatCapacityRefreshJsonObject;
  layout: WorkbenchHeatCapacityRefreshJsonObject;
}

export type WorkbenchHeatCapacityVector3Tuple = HeatCapacityModeVector3Tuple;
export type WorkbenchHeatCapacityQuaternionTuple = HeatCapacityModeQuaternionTuple;
export type WorkbenchHeatCapacityCameraViewportMetadata = NonNullable<
  HeatCapacityModeCameraPoseCheckpoint['viewport']
>;
export type WorkbenchHeatCapacityCameraPoseRefreshCheckpoint = HeatCapacityModeCameraPoseCheckpoint;

export type WorkbenchHeatCapacitySceneSnapshotMimeType = 'image/png' | 'image/webp' | 'image/jpeg';

export interface WorkbenchHeatCapacitySceneSnapshotRefreshCheckpoint {
  snapshotId: string;
  capturedCheckpointId: string;
  sceneRevision: string;
  cameraPoseRevision: string | null;
  capturedAtMs: number;
  mimeType: WorkbenchHeatCapacitySceneSnapshotMimeType;
  imageDataUrl: string;
  widthPx: number;
  heightPx: number;
  widthCssPx: number;
  heightCssPx: number;
  pixelRatio: number;
  themeId: string | null;
  performanceProfileId: string | null;
}

export interface WorkbenchHeatCapacityRefreshSession {
  schemaFamily: typeof WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION;
  activeHeatCapacityFileId: string;
  mode: WorkbenchHeatCapacityRefreshMode;
  checkpointId: string;
  capturedAtMs: number;
  modeTransition: HeatCapacityModeTransitionCheckpoint;
  modeTransitionDemoClock: WorkbenchHeatCapacityModeTransitionDemoClockCheckpoint | null;
  modeTransitionGuideUi: HeatCapacityModeGuideCheckpoint | null;
  demo: WorkbenchHeatCapacityDemoRefreshCheckpoint;
  guide: WorkbenchHeatCapacityGuideUiRefreshCheckpoint;
  ui: WorkbenchHeatCapacityUiRefreshCheckpoint;
  cameraPose: WorkbenchHeatCapacityCameraPoseRefreshCheckpoint | null;
  sceneSnapshot: WorkbenchHeatCapacitySceneSnapshotRefreshCheckpoint | null;
}

export type WorkbenchHeatCapacityModeTransitionDemoClockCheckpoint =
  HeatCapacityModeTransitionDemoClock;

export interface WorkbenchHeatCapacityRefreshSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MAX_SAFE_COUNT = 1_000_000;
const MAX_JSON_DEPTH = 12;
const MAX_JSON_COLLECTION_SIZE = 10_000;
const MAX_TEXT_LENGTH = 1_000_000;
const MAX_IMAGE_DATA_URL_LENGTH = 32 * 1024 * 1024;
const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const normalizeString = (
  value: unknown,
  fallback = '',
  maxLength = MAX_TEXT_LENGTH,
): string => (
  typeof value === 'string' && value.length <= maxLength ? value : fallback
);

const normalizeIdentifier = (value: unknown, maxLength = 512): string | null => {
  if (typeof value !== 'string' || value.length > maxLength) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeFiniteNumber = (
  value: unknown,
  fallback: number,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY,
): number => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback
);

const normalizeInteger = (
  value: unknown,
  fallback: number,
  minimum = 0,
  maximum = MAX_SAFE_COUNT,
): number => Math.round(normalizeFiniteNumber(value, fallback, minimum, maximum));

const normalizeNullableNonNegativeNumber = (value: unknown): number | null => (
  value === null
    ? null
    : typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : null
);

const normalizeNullableIndex = (value: unknown): number | null => (
  value === null
    ? null
    : typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SAFE_COUNT
      ? value
      : null
);

const normalizeIdentifierList = (value: unknown, maximumLength = 2_048): string[] => {
  if (!Array.isArray(value)) return [];
  const identifiers: string[] = [];
  for (const candidate of value.slice(0, maximumLength)) {
    const identifier = normalizeIdentifier(candidate);
    if (identifier && !identifiers.includes(identifier)) identifiers.push(identifier);
  }
  return identifiers;
};

const invalidJsonValue = Symbol('invalid-json-value');

const normalizeJsonValue = (
  value: unknown,
  depth: number,
): WorkbenchHeatCapacityRefreshJsonValue | typeof invalidJsonValue => {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length <= MAX_TEXT_LENGTH ? value : invalidJsonValue;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : invalidJsonValue;
  }
  if (depth >= MAX_JSON_DEPTH) return invalidJsonValue;
  if (Array.isArray(value)) {
    if (value.length > MAX_JSON_COLLECTION_SIZE) return invalidJsonValue;
    const normalizedItems: WorkbenchHeatCapacityRefreshJsonValue[] = [];
    for (const item of value) {
      const normalizedItem = normalizeJsonValue(item, depth + 1);
      if (normalizedItem === invalidJsonValue) return invalidJsonValue;
      normalizedItems.push(normalizedItem);
    }
    return normalizedItems;
  }
  if (!isPlainRecord(value)) return invalidJsonValue;
  const entries = Object.entries(value);
  if (entries.length > MAX_JSON_COLLECTION_SIZE) return invalidJsonValue;
  const normalizedObject: WorkbenchHeatCapacityRefreshJsonObject = {};
  for (const [key, item] of entries) {
    if (UNSAFE_JSON_KEYS.has(key) || key.length > 512) continue;
    const normalizedItem = normalizeJsonValue(item, depth + 1);
    if (normalizedItem !== invalidJsonValue) normalizedObject[key] = normalizedItem;
  }
  return normalizedObject;
};

const normalizeJsonObject = (value: unknown): WorkbenchHeatCapacityRefreshJsonObject => {
  const normalized = normalizeJsonValue(value, 0);
  return normalized !== invalidJsonValue && !Array.isArray(normalized) && normalized !== null && typeof normalized === 'object'
    ? normalized
    : {};
};

const demoPhases = ['idle', 'running', 'paused'] as const;
const demoTimelineStages = ['highlight', 'action', 'observe', 'preview'] as const;
const demoStepPanelModes = ['hidden', 'visible', 'exiting'] as const;
const demoCameraModes = ['instrument', 'pump', 'bottle'] as const;
const pauseReasons = ['user', 'lesson-dialog', 'guide-flow', 'safety'] as const;
const toastLevels = ['info', 'success', 'warning', 'danger'] as const;
const toastSources = [
  'guide',
  'guide-blocked',
  'pressure-warning',
  'pressure-close-valve',
  'pressure-alarm',
] as const;

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T => (
  typeof value === 'string' && values.includes(value as T)
);

const normalizePauseReasons = (value: unknown): WorkbenchHeatCapacityRefreshPauseReason[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is WorkbenchHeatCapacityRefreshPauseReason => (
    isOneOf(item, pauseReasons)
  ))));
};

export const createDefaultWorkbenchHeatCapacityDemoRefreshCheckpoint = (
): WorkbenchHeatCapacityDemoRefreshCheckpoint => ({
  phase: 'idle',
  elapsedMs: 0,
  initialDelayRemainingMs: 0,
  pauseReasons: [],
  timeline: {
    currentItemIndex: null,
    nextItemIndex: 0,
    currentItemKey: null,
    currentStage: null,
    currentStepId: null,
    currentStepIndex: null,
    currentActionId: null,
    itemStartedAtElapsedMs: null,
    executedItemKeys: [],
  },
  stepPanel: {
    mode: 'hidden',
    stepIndex: 0,
    stepCount: 0,
    title: '',
    description: '',
    target: '',
    progressCriterion: '',
    note: '',
  },
  focusControlId: null,
  focusPulseActive: false,
  cameraMode: null,
  cameraFocusKey: 0,
  completionMessage: null,
  completionMessageRemainingMs: null,
});

const normalizeDemoTimeline = (value: unknown): WorkbenchHeatCapacityDemoTimelineCheckpoint => {
  const fallback = createDefaultWorkbenchHeatCapacityDemoRefreshCheckpoint().timeline;
  if (!isRecord(value)) return fallback;
  return {
    currentItemIndex: normalizeNullableIndex(value.currentItemIndex),
    nextItemIndex: normalizeInteger(value.nextItemIndex, 0),
    currentItemKey: normalizeIdentifier(value.currentItemKey),
    currentStage: isOneOf(value.currentStage, demoTimelineStages) ? value.currentStage : null,
    currentStepId: normalizeIdentifier(value.currentStepId),
    currentStepIndex: normalizeNullableIndex(value.currentStepIndex),
    currentActionId: normalizeIdentifier(value.currentActionId),
    itemStartedAtElapsedMs: normalizeNullableNonNegativeNumber(value.itemStartedAtElapsedMs),
    executedItemKeys: normalizeIdentifierList(value.executedItemKeys),
  };
};

const normalizeDemoStepPanel = (value: unknown): WorkbenchHeatCapacityDemoStepPanelCheckpoint => {
  const fallback = createDefaultWorkbenchHeatCapacityDemoRefreshCheckpoint().stepPanel;
  if (!isRecord(value)) return fallback;
  return {
    mode: isOneOf(value.mode, demoStepPanelModes) ? value.mode : 'hidden',
    stepIndex: normalizeInteger(value.stepIndex, 0),
    stepCount: normalizeInteger(value.stepCount, 0),
    title: normalizeString(value.title),
    description: normalizeString(value.description),
    target: normalizeString(value.target),
    progressCriterion: normalizeString(value.progressCriterion),
    note: normalizeString(value.note),
  };
};

const normalizeDemoCheckpoint = (
  value: unknown,
  mode: WorkbenchHeatCapacityRefreshMode,
): WorkbenchHeatCapacityDemoRefreshCheckpoint => {
  const fallback = createDefaultWorkbenchHeatCapacityDemoRefreshCheckpoint();
  if (mode !== 'demo' || !isRecord(value)) return fallback;

  let phase: WorkbenchHeatCapacityDemoRefreshPhase = isOneOf(value.phase, demoPhases)
    ? value.phase
    : 'idle';
  let normalizedPauseReasons = normalizePauseReasons(value.pauseReasons);
  if (phase === 'running' && normalizedPauseReasons.length > 0) phase = 'paused';
  if (phase === 'paused' && normalizedPauseReasons.length === 0) normalizedPauseReasons = ['user'];
  if (phase === 'idle') normalizedPauseReasons = [];

  const focusControlId = normalizeIdentifier(value.focusControlId);
  return {
    phase,
    elapsedMs: normalizeFiniteNumber(value.elapsedMs, 0, 0, Number.MAX_SAFE_INTEGER),
    initialDelayRemainingMs: normalizeFiniteNumber(
      value.initialDelayRemainingMs,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    pauseReasons: normalizedPauseReasons,
    timeline: normalizeDemoTimeline(value.timeline),
    stepPanel: normalizeDemoStepPanel(value.stepPanel),
    focusControlId,
    focusPulseActive: value.focusPulseActive === true && focusControlId !== null && phase !== 'idle',
    cameraMode: isOneOf(value.cameraMode, demoCameraModes) ? value.cameraMode : null,
    cameraFocusKey: normalizeInteger(value.cameraFocusKey, 0, 0, Number.MAX_SAFE_INTEGER),
    completionMessage: typeof value.completionMessage === 'string'
      ? normalizeString(value.completionMessage)
      : null,
    completionMessageRemainingMs: normalizeNullableNonNegativeNumber(value.completionMessageRemainingMs),
  };
};

const createDefaultReminderCheckpoint = (): WorkbenchHeatCapacityReminderCheckpoint => ({
  active: false,
  controlId: null,
  message: null,
  remainingMs: null,
});

const normalizeReminder = (value: unknown): WorkbenchHeatCapacityReminderCheckpoint => {
  if (!isRecord(value)) return createDefaultReminderCheckpoint();
  const controlId = normalizeIdentifier(value.controlId);
  const remainingMs = normalizeNullableNonNegativeNumber(value.remainingMs);
  const active = value.active === true && controlId !== null && remainingMs !== 0;
  return {
    active,
    controlId: active ? controlId : null,
    message: active && typeof value.message === 'string' ? normalizeString(value.message) : null,
    remainingMs: active ? remainingMs : null,
  };
};

const normalizeLessonDialog = (value: unknown): WorkbenchHeatCapacityLessonDialogCheckpoint | null => {
  if (!isRecord(value) || (value.kind !== 'intro' && value.kind !== 'step')) return null;
  if (value.kind === 'intro') {
    return {
      kind: 'intro',
      pageIndex: normalizeInteger(value.pageIndex, 0),
      lessonId: null,
    };
  }
  const lessonId = isOneOf(value.lessonId, HEAT_CAPACITY_GUIDE_LESSON_STEP_IDS)
    ? value.lessonId
    : null;
  if (!lessonId) return null;
  return {
    kind: 'step',
    pageIndex: null,
    lessonId,
  };
};

const normalizeToast = (value: unknown): WorkbenchHeatCapacityToastRefreshCheckpoint | null => {
  if (!isRecord(value)) return null;
  const id = normalizeIdentifier(value.id);
  if (!id || typeof value.text !== 'string' || !isOneOf(value.level, toastLevels) || !isOneOf(value.source, toastSources)) {
    return null;
  }
  const remainingMs = normalizeFiniteNumber(value.remainingMs, 0, 0, Number.MAX_SAFE_INTEGER);
  if (remainingMs <= 0) return null;
  return {
    id,
    text: normalizeString(value.text),
    level: value.level,
    priority: normalizeFiniteNumber(value.priority, 0, -MAX_SAFE_COUNT, MAX_SAFE_COUNT),
    source: value.source,
    createdAtMs: normalizeFiniteNumber(value.createdAtMs, 0, 0, Number.MAX_SAFE_INTEGER),
    remainingMs,
  };
};

export const createDefaultWorkbenchHeatCapacityGuideUiRefreshCheckpoint = (
): WorkbenchHeatCapacityGuideUiRefreshCheckpoint => ({
  focusControlId: null,
  focusPulseActive: false,
  missCount: 0,
  pauseReasons: [],
  normalReminder: createDefaultReminderCheckpoint(),
  strongReminder: createDefaultReminderCheckpoint(),
  lessonDialog: null,
  shownLessonIds: [],
  toastQueue: {
    current: null,
    pending: [],
  },
  pressureAlarmVisible: false,
  pressureAlarmRemainingMs: null,
});

const normalizeGuideCheckpoint = (
  value: unknown,
  mode: WorkbenchHeatCapacityRefreshMode,
): WorkbenchHeatCapacityGuideUiRefreshCheckpoint => {
  const fallback = createDefaultWorkbenchHeatCapacityGuideUiRefreshCheckpoint();
  if (!isRecord(value)) return fallback;
  const guideModeActive = mode === 'guide';
  const focusControlId = guideModeActive ? normalizeIdentifier(value.focusControlId) : null;
  const lessonDialog = normalizeLessonDialog(value.lessonDialog);
  const normalizedPauseReasons = normalizePauseReasons(value.pauseReasons);
  if (lessonDialog && !normalizedPauseReasons.includes('lesson-dialog')) {
    normalizedPauseReasons.push('lesson-dialog');
  }
  const toastQueue = isRecord(value.toastQueue) ? value.toastQueue : {};
  const pending = Array.isArray(toastQueue.pending)
    ? toastQueue.pending.slice(0, 32).map(normalizeToast).filter((toast): toast is WorkbenchHeatCapacityToastRefreshCheckpoint => toast !== null)
    : [];
  const pressureAlarmRemainingMs = normalizeNullableNonNegativeNumber(value.pressureAlarmRemainingMs);
  return {
    focusControlId,
    focusPulseActive: guideModeActive && value.focusPulseActive === true && focusControlId !== null,
    missCount: guideModeActive ? normalizeInteger(value.missCount, 0) : 0,
    pauseReasons: normalizedPauseReasons,
    normalReminder: guideModeActive ? normalizeReminder(value.normalReminder) : createDefaultReminderCheckpoint(),
    strongReminder: guideModeActive ? normalizeReminder(value.strongReminder) : createDefaultReminderCheckpoint(),
    lessonDialog,
    shownLessonIds: normalizeIdentifierList(value.shownLessonIds),
    toastQueue: {
      current: normalizeToast(toastQueue.current),
      pending,
    },
    pressureAlarmVisible: value.pressureAlarmVisible === true && pressureAlarmRemainingMs !== 0,
    pressureAlarmRemainingMs: value.pressureAlarmVisible === true && pressureAlarmRemainingMs !== 0
      ? pressureAlarmRemainingMs
      : null,
  };
};

export const createDefaultWorkbenchHeatCapacityUiRefreshCheckpoint = (
): WorkbenchHeatCapacityUiRefreshCheckpoint => ({
  windows: {},
  drafts: {},
  layout: {},
});

const normalizeUiCheckpoint = (value: unknown): WorkbenchHeatCapacityUiRefreshCheckpoint => {
  if (!isRecord(value)) return createDefaultWorkbenchHeatCapacityUiRefreshCheckpoint();
  return {
    windows: normalizeJsonObject(value.windows),
    drafts: normalizeJsonObject(value.drafts),
    layout: normalizeJsonObject(value.layout),
  };
};

const normalizeNumberTuple = <T extends number[]>(
  value: unknown,
  length: number,
): T | null => {
  if (!Array.isArray(value) || value.length !== length) return null;
  if (!value.every((item) => typeof item === 'number' && Number.isFinite(item))) return null;
  return [...value] as T;
};

const normalizeViewport = (value: unknown): WorkbenchHeatCapacityCameraViewportMetadata | null => {
  if (!isRecord(value)) return null;
  const widthCssPx = normalizeFiniteNumber(value.widthCssPx, 0, 0, 100_000);
  const heightCssPx = normalizeFiniteNumber(value.heightCssPx, 0, 0, 100_000);
  if (widthCssPx <= 0 || heightCssPx <= 0) return null;
  return {
    widthCssPx,
    heightCssPx,
    pixelRatio: normalizeFiniteNumber(value.pixelRatio, 1, 0.1, 16),
  };
};

const normalizeCameraPose = (value: unknown): WorkbenchHeatCapacityCameraPoseRefreshCheckpoint | null => {
  if (!isRecord(value)) return null;
  const position = normalizeNumberTuple<WorkbenchHeatCapacityVector3Tuple>(value.position, 3);
  const target = normalizeNumberTuple<WorkbenchHeatCapacityVector3Tuple>(value.target, 3);
  if (!position || !target) return null;
  const up = normalizeNumberTuple<WorkbenchHeatCapacityVector3Tuple>(value.up, 3) ?? [0, 1, 0];
  const quaternion = normalizeNumberTuple<WorkbenchHeatCapacityQuaternionTuple>(value.quaternion, 4);
  const near = normalizeFiniteNumber(value.near, 0.1, 0.000001, Number.MAX_SAFE_INTEGER);
  const far = normalizeFiniteNumber(value.far, 1_000, near + 0.000001, Number.MAX_SAFE_INTEGER);
  return {
    poseRevision: normalizeIdentifier(value.poseRevision) ?? '',
    capturedAtMs: normalizeFiniteNumber(value.capturedAtMs, 0, 0, Number.MAX_SAFE_INTEGER),
    projection: value.projection === 'orthographic' ? 'orthographic' : 'perspective',
    position,
    target,
    up,
    quaternion,
    fovDeg: normalizeFiniteNumber(value.fovDeg, 45, 1, 179),
    zoom: normalizeFiniteNumber(value.zoom, 1, 0.000001, MAX_SAFE_COUNT),
    near,
    far,
    cameraMode: normalizeIdentifier(value.cameraMode),
    viewport: normalizeViewport(value.viewport),
  };
};

const sceneSnapshotMimeTypes = ['image/png', 'image/webp', 'image/jpeg'] as const;

const getImageDataUrlMimeType = (value: unknown): WorkbenchHeatCapacitySceneSnapshotMimeType | null => {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_DATA_URL_LENGTH) return null;
  const match = /^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length === 0 || match[2].length % 4 !== 0) return null;
  return isOneOf(match[1], sceneSnapshotMimeTypes) ? match[1] : null;
};

const normalizeSceneSnapshot = (
  value: unknown,
): WorkbenchHeatCapacitySceneSnapshotRefreshCheckpoint | null => {
  if (!isRecord(value)) return null;
  const snapshotId = normalizeIdentifier(value.snapshotId);
  const capturedCheckpointId = normalizeIdentifier(value.capturedCheckpointId);
  const sceneRevision = normalizeIdentifier(value.sceneRevision);
  const mimeType = getImageDataUrlMimeType(value.imageDataUrl);
  const widthPx = normalizeInteger(value.widthPx, 0, 1, 100_000);
  const heightPx = normalizeInteger(value.heightPx, 0, 1, 100_000);
  const widthCssPx = normalizeFiniteNumber(value.widthCssPx, 0, 0, 100_000);
  const heightCssPx = normalizeFiniteNumber(value.heightCssPx, 0, 0, 100_000);
  if (
    !snapshotId ||
    !capturedCheckpointId ||
    !sceneRevision ||
    !mimeType ||
    value.mimeType !== mimeType ||
    widthPx <= 0 ||
    heightPx <= 0 ||
    widthCssPx <= 0 ||
    heightCssPx <= 0
  ) {
    return null;
  }
  return {
    snapshotId,
    capturedCheckpointId,
    sceneRevision,
    cameraPoseRevision: normalizeIdentifier(value.cameraPoseRevision),
    capturedAtMs: normalizeFiniteNumber(value.capturedAtMs, 0, 0, Number.MAX_SAFE_INTEGER),
    mimeType,
    imageDataUrl: value.imageDataUrl as string,
    widthPx,
    heightPx,
    widthCssPx,
    heightCssPx,
    pixelRatio: normalizeFiniteNumber(value.pixelRatio, 1, 0.1, 16),
    themeId: normalizeIdentifier(value.themeId),
    performanceProfileId: normalizeIdentifier(value.performanceProfileId),
  };
};

const normalizeModeTransitionDemoClock = (
  value: unknown,
): WorkbenchHeatCapacityModeTransitionDemoClockCheckpoint | null => {
  if (!isRecord(value)) return null;
  const fileId = normalizeIdentifier(value.fileId);
  if (!fileId) return null;
  return {
    fileId,
    elapsedMs: normalizeFiniteNumber(value.elapsedMs, 0, 0, Number.MAX_SAFE_INTEGER),
    initialDelayRemainingMs: normalizeFiniteNumber(
      value.initialDelayRemainingMs,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
};

export const createWorkbenchHeatCapacityRefreshSession = (
  activeHeatCapacityFileId: string,
  mode: WorkbenchHeatCapacityRefreshMode = 'free',
  capturedAtMs = Date.now(),
): WorkbenchHeatCapacityRefreshSession => {
  const normalizedFileId = normalizeIdentifier(activeHeatCapacityFileId);
  if (!normalizedFileId) throw new TypeError('activeHeatCapacityFileId must be a non-empty string.');
  const normalizedCapturedAtMs = normalizeFiniteNumber(capturedAtMs, 0, 0, Number.MAX_SAFE_INTEGER);
  return {
    schemaFamily: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION,
    activeHeatCapacityFileId: normalizedFileId,
    mode,
    checkpointId: `${normalizedFileId}:${normalizedCapturedAtMs}`,
    capturedAtMs: normalizedCapturedAtMs,
    modeTransition: createHeatCapacityModeTransitionCheckpoint(
      createHeatCapacityModeTransitionState(mode),
      normalizedCapturedAtMs,
    ),
    modeTransitionDemoClock: null,
    modeTransitionGuideUi: null,
    demo: createDefaultWorkbenchHeatCapacityDemoRefreshCheckpoint(),
    guide: createDefaultWorkbenchHeatCapacityGuideUiRefreshCheckpoint(),
    ui: createDefaultWorkbenchHeatCapacityUiRefreshCheckpoint(),
    cameraPose: null,
    sceneSnapshot: null,
  };
};

const normalizeWorkbenchHeatCapacityRefreshSessionUnchecked = (
  value: unknown,
): WorkbenchHeatCapacityRefreshSession | null => {
  if (
    !isRecord(value) ||
    value.schemaFamily !== WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY ||
    value.schemaVersion !== WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION
  ) {
    return null;
  }
  const activeHeatCapacityFileId = normalizeIdentifier(value.activeHeatCapacityFileId);
  const checkpointId = normalizeIdentifier(value.checkpointId);
  if (!activeHeatCapacityFileId || !checkpointId || !isOneOf(value.mode, ['demo', 'guide', 'free'] as const)) {
    return null;
  }
  const capturedAtMs = normalizeFiniteNumber(value.capturedAtMs, 0, 0, Number.MAX_SAFE_INTEGER);
  const guide = normalizeGuideCheckpoint(value.guide, value.mode);
  let demo = normalizeDemoCheckpoint(value.demo, value.mode);
  if (value.mode === 'demo' && guide.lessonDialog && demo.phase !== 'idle') {
    demo = {
      ...demo,
      phase: 'paused',
      pauseReasons: demo.pauseReasons.includes('lesson-dialog')
        ? demo.pauseReasons
        : [...demo.pauseReasons, 'lesson-dialog'],
    };
  }
  const normalizedModeTransition = normalizeHeatCapacityModeTransitionCheckpoint(
    value.modeTransition,
    value.mode,
    capturedAtMs,
  );
  const modeTransition = createHeatCapacityModeTransitionCheckpoint(
    normalizedModeTransition,
    capturedAtMs,
  );
  const candidateDemoClock = normalizeModeTransitionDemoClock(value.modeTransitionDemoClock);
  const frozenSourceDemoClockIsValid =
    (normalizedModeTransition.phase === 'waiting-for-motion' ||
      normalizedModeTransition.phase === 'preparing-target') &&
    normalizedModeTransition.visibleMode === 'demo' &&
    normalizedModeTransition.sourceMode === 'demo' &&
    normalizedModeTransition.targetMode !== 'demo';
  const frozenIncomingDemoClockIsValid =
    normalizedModeTransition.phase === 'animating' &&
    normalizedModeTransition.visibleMode === 'demo' &&
    normalizedModeTransition.targetMode === 'demo';
  const modeTransitionDemoClock = candidateDemoClock &&
    candidateDemoClock.fileId === activeHeatCapacityFileId &&
    value.mode === 'demo' &&
    demo.phase === 'running' &&
    (frozenSourceDemoClockIsValid || frozenIncomingDemoClockIsValid)
    ? candidateDemoClock
    : null;
  const candidateGuideUi = normalizeHeatCapacityModeGuideCheckpoint(value.modeTransitionGuideUi);
  const frozenSourceGuideUiIsValid =
    (normalizedModeTransition.phase === 'waiting-for-motion' ||
      normalizedModeTransition.phase === 'preparing-target') &&
    normalizedModeTransition.visibleMode === 'guide' &&
    normalizedModeTransition.sourceMode === 'guide' &&
    normalizedModeTransition.targetMode !== 'guide';
  const frozenIncomingGuideUiIsValid =
    normalizedModeTransition.phase === 'animating' &&
    normalizedModeTransition.visibleMode === 'guide' &&
    normalizedModeTransition.targetMode === 'guide';
  const modeTransitionGuideUi = candidateGuideUi &&
    value.mode === 'guide' &&
    (frozenSourceGuideUiIsValid || frozenIncomingGuideUiIsValid)
    ? candidateGuideUi
    : null;
  return {
    schemaFamily: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION,
    activeHeatCapacityFileId,
    mode: value.mode,
    checkpointId,
    capturedAtMs,
    modeTransition,
    modeTransitionDemoClock,
    modeTransitionGuideUi,
    demo,
    guide,
    ui: normalizeUiCheckpoint(value.ui),
    cameraPose: normalizeCameraPose(value.cameraPose),
    sceneSnapshot: normalizeSceneSnapshot(value.sceneSnapshot),
  };
};

export const normalizeWorkbenchHeatCapacityRefreshSession = (
  value: unknown,
): WorkbenchHeatCapacityRefreshSession | null => {
  try {
    return normalizeWorkbenchHeatCapacityRefreshSessionUnchecked(value);
  } catch {
    return null;
  }
};

const getTabSessionStorage = (): WorkbenchHeatCapacityRefreshSessionStorage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const loadWorkbenchHeatCapacityRefreshSession = (
  storage: WorkbenchHeatCapacityRefreshSessionStorage | null = getTabSessionStorage(),
): WorkbenchHeatCapacityRefreshSession | null => {
  if (!storage) return null;
  try {
    const rawValue = storage.getItem(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY);
    if (!rawValue) return null;
    return normalizeWorkbenchHeatCapacityRefreshSession(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const persistWorkbenchHeatCapacityRefreshSession = (
  value: unknown,
  storage: WorkbenchHeatCapacityRefreshSessionStorage | null = getTabSessionStorage(),
): boolean => {
  if (!storage) return false;
  const normalized = normalizeWorkbenchHeatCapacityRefreshSession(value);
  if (!normalized) return false;
  try {
    storage.setItem(
      WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    return true;
  } catch {
    return false;
  }
};

export const clearWorkbenchHeatCapacityRefreshSession = (
  storage: WorkbenchHeatCapacityRefreshSessionStorage | null = getTabSessionStorage(),
): boolean => {
  if (!storage) return false;
  try {
    storage.removeItem(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};
