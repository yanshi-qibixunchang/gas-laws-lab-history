import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';

export const HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_FAMILY =
  'hard-sphere-lab/heat-capacity-mode-ui-checkpoint' as const;
export const HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_VERSION = 1 as const;

const MAX_IDENTIFIER_LENGTH = 512;
const MAX_TEXT_LENGTH = 1_000_000;
const MAX_COLLECTION_SIZE = 10_000;
const MAX_JSON_DEPTH = 12;
const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type HeatCapacityModeJsonValue =
  | null
  | boolean
  | number
  | string
  | HeatCapacityModeJsonValue[]
  | HeatCapacityModeJsonObject;

export interface HeatCapacityModeJsonObject {
  [key: string]: HeatCapacityModeJsonValue;
}

export type HeatCapacityModeVector3Tuple = [number, number, number];
export type HeatCapacityModeQuaternionTuple = [number, number, number, number];

export interface HeatCapacityModeCameraPoseCheckpoint {
  poseRevision: string;
  capturedAtMs: number;
  projection: 'perspective' | 'orthographic';
  position: HeatCapacityModeVector3Tuple;
  target: HeatCapacityModeVector3Tuple;
  up: HeatCapacityModeVector3Tuple;
  quaternion: HeatCapacityModeQuaternionTuple | null;
  fovDeg: number;
  zoom: number;
  near: number;
  far: number;
  cameraMode: string | null;
  viewport: {
    widthCssPx: number;
    heightCssPx: number;
    pixelRatio: number;
  } | null;
}

export type HeatCapacityModeDeferredTimer =
  | { state: 'waiting'; remainingMs: number }
  | { state: 'due' };

export interface HeatCapacityModeSceneCheckpoint {
  cameraPose: HeatCapacityModeCameraPoseCheckpoint | null;
  cameraTransition: HeatCapacityModeJsonObject | null;
  ultraVisualState: HeatCapacityModeJsonObject | null;
  hardSphereVisualCheckpoint: HeatCapacityModeJsonObject | null;
  focusSession: HeatCapacityModeJsonObject | null;
}

export interface HeatCapacityModePumpAnimationCheckpoint {
  release: HeatCapacityModeDeferredTimer | null;
  idle: HeatCapacityModeDeferredTimer | null;
}

export type HeatCapacityModeDemoPhase = 'idle' | 'running' | 'paused';
export type HeatCapacityModeDemoTimelineStage = 'highlight' | 'action' | 'observe' | 'preview';
export type HeatCapacityModeDemoStepPanelMode = 'hidden' | 'visible' | 'exiting';
export type HeatCapacityModeDemoCameraMode = 'instrument' | 'pump' | 'bottle';
export type HeatCapacityModePauseReason = 'user' | 'lesson-dialog' | 'guide-flow' | 'safety';

export const HEAT_CAPACITY_GUIDE_LESSON_STEP_IDS = [
  'pressureZeroBaseline',
  'sealedInitialState',
  'pressureTarget',
  'preReleaseStability',
  'quickReleaseState',
  'thermalRecovery',
] as const;

export type HeatCapacityGuideLessonStepId = typeof HEAT_CAPACITY_GUIDE_LESSON_STEP_IDS[number];

export interface HeatCapacityModeDemoCheckpoint {
  phase: HeatCapacityModeDemoPhase;
  elapsedMs: number;
  initialDelayRemainingMs: number;
  pauseReasons: HeatCapacityModePauseReason[];
  timeline: {
    currentItemIndex: number | null;
    nextItemIndex: number;
    currentItemKey: string | null;
    currentStage: HeatCapacityModeDemoTimelineStage | null;
    currentStepId: string | null;
    currentStepIndex: number | null;
    currentActionId: string | null;
    itemStartedAtElapsedMs: number | null;
    executedItemKeys: string[];
  };
  stepPanel: {
    mode: HeatCapacityModeDemoStepPanelMode;
    stepIndex: number;
    stepCount: number;
    title: string;
    description: string;
    target: string;
    progressCriterion: string;
    note: string;
  };
  focusControlId: string | null;
  focusPulseActive: boolean;
  cameraMode: HeatCapacityModeDemoCameraMode | null;
  cameraFocusKey: number;
  completionMessage: string | null;
  completionMessageRemainingMs: number | null;
}

export type HeatCapacityModeLessonDialogCheckpoint =
  | {
      kind: 'intro';
      pageIndex: number;
      lessonId: null;
    }
  | {
      kind: 'step';
      pageIndex: null;
      lessonId: HeatCapacityGuideLessonStepId;
    };

export interface HeatCapacityModeGuideCheckpoint {
  missCount: number;
  normalReminder: {
    controlId: string;
    timer: HeatCapacityModeDeferredTimer;
  } | null;
  strongReminder: {
    active: boolean;
    controlId: string | null;
  };
  lessonDialog: HeatCapacityModeLessonDialogCheckpoint | null;
  shownLessonIds: string[];
  checklistViewedIndex: number;
  pendingStrongReminder: {
    controlId: string | null;
    timer: HeatCapacityModeDeferredTimer;
  } | null;
  baseStrongReminder: {
    controlId: string | null;
    timer: HeatCapacityModeDeferredTimer;
  } | null;
}

interface HeatCapacityModeUiCheckpointBase {
  schemaFamily: typeof HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_FAMILY;
  schemaVersion: typeof HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_VERSION;
  fileId: string;
  checkpointId: string;
  capturedAtMs: number;
  interruptedPreheatPolicy: 'restart-from-zero';
  scene: HeatCapacityModeSceneCheckpoint;
  pumpAnimation: HeatCapacityModePumpAnimationCheckpoint | null;
}

export type HeatCapacityModeUiCheckpoint = HeatCapacityModeUiCheckpointBase & (
  | { mode: 'demo'; payload: { kind: 'demo'; demo: HeatCapacityModeDemoCheckpoint } }
  | { mode: 'guide'; payload: { kind: 'guide'; guide: HeatCapacityModeGuideCheckpoint } }
  | { mode: 'free'; payload: { kind: 'free' } }
);

type OmitCheckpointEnvelope<Value> = Value extends unknown
  ? Omit<Value, 'schemaFamily' | 'schemaVersion' | 'interruptedPreheatPolicy'>
  : never;

export type HeatCapacityModeUiCheckpointDraft = OmitCheckpointEnvelope<HeatCapacityModeUiCheckpoint>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isFiniteNumber = (value: unknown, minimum = Number.NEGATIVE_INFINITY): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= minimum
);

const isIdentifier = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_IDENTIFIER_LENGTH
);

const isBoundedText = (value: unknown): value is string => (
  typeof value === 'string' && value.length <= MAX_TEXT_LENGTH
);

const isNullableIdentifier = (value: unknown): value is string | null => (
  value === null || isIdentifier(value)
);

const isNullableNonNegativeNumber = (value: unknown): value is number | null => (
  value === null || isFiniteNumber(value, 0)
);

const isNonNegativeInteger = (value: unknown): value is number => (
  Number.isInteger(value) && isFiniteNumber(value, 0)
);

const isNullableNonNegativeInteger = (value: unknown): value is number | null => (
  value === null || isNonNegativeInteger(value)
);

const hasOwn = (value: Record<string, unknown>, key: string) => (
  Object.prototype.hasOwnProperty.call(value, key)
);

const cloneJsonValue = (
  value: unknown,
  depth = 0,
): HeatCapacityModeJsonValue | undefined => {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.length <= MAX_TEXT_LENGTH ? value : undefined;
  if (depth >= MAX_JSON_DEPTH) return undefined;
  if (Array.isArray(value)) {
    if (value.length > MAX_COLLECTION_SIZE) return undefined;
    const items: HeatCapacityModeJsonValue[] = [];
    for (const item of value) {
      const cloned = cloneJsonValue(item, depth + 1);
      if (cloned === undefined) return undefined;
      items.push(cloned);
    }
    return items;
  }
  if (!isPlainRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > MAX_COLLECTION_SIZE) return undefined;
  const result: HeatCapacityModeJsonObject = {};
  for (const [key, item] of entries) {
    if (UNSAFE_JSON_KEYS.has(key) || key.length > MAX_IDENTIFIER_LENGTH) continue;
    const cloned = cloneJsonValue(item, depth + 1);
    if (cloned === undefined) return undefined;
    result[key] = cloned;
  }
  return result;
};

const normalizeJsonObject = (value: unknown): HeatCapacityModeJsonObject | null => {
  if (value === null) return null;
  const cloned = cloneJsonValue(value);
  return isPlainRecord(cloned) ? cloned as HeatCapacityModeJsonObject : null;
};

export const createHeatCapacityModeDeferredTimer = (
  remainingMs: number | null | undefined,
): HeatCapacityModeDeferredTimer | null => {
  if (remainingMs === null || remainingMs === undefined || !Number.isFinite(remainingMs)) return null;
  return remainingMs <= 0
    ? { state: 'due' }
    : { state: 'waiting', remainingMs };
};

export const getHeatCapacityModeDeferredTimerRemainingMs = (
  timer: HeatCapacityModeDeferredTimer | null | undefined,
): number | null => {
  if (!timer) return null;
  return timer.state === 'due' ? 0 : timer.remainingMs;
};

const normalizeDeferredTimer = (value: unknown): HeatCapacityModeDeferredTimer | null => {
  if (!isPlainRecord(value)) return null;
  if (value.state === 'due') return { state: 'due' };
  if (value.state === 'waiting' && isFiniteNumber(value.remainingMs, Number.MIN_VALUE)) {
    return { state: 'waiting', remainingMs: value.remainingMs };
  }
  return null;
};

const normalizeVector = (value: unknown, size: 3 | 4): number[] | null => (
  Array.isArray(value) && value.length === size && value.every((item) => isFiniteNumber(item))
    ? [...value]
    : null
);

const normalizeCameraPose = (value: unknown): HeatCapacityModeCameraPoseCheckpoint | null => {
  if (value === null) return null;
  if (!isPlainRecord(value)) return null;
  const position = normalizeVector(value.position, 3);
  const target = normalizeVector(value.target, 3);
  const up = normalizeVector(value.up, 3);
  const quaternion = value.quaternion === null ? null : normalizeVector(value.quaternion, 4);
  const viewport = value.viewport === null
    ? null
    : isPlainRecord(value.viewport) &&
      isFiniteNumber(value.viewport.widthCssPx, Number.MIN_VALUE) &&
      value.viewport.widthCssPx <= 100_000 &&
      isFiniteNumber(value.viewport.heightCssPx, Number.MIN_VALUE) &&
      value.viewport.heightCssPx <= 100_000 &&
      isFiniteNumber(value.viewport.pixelRatio, Number.MIN_VALUE) &&
      value.viewport.pixelRatio <= 16
      ? {
          widthCssPx: value.viewport.widthCssPx,
          heightCssPx: value.viewport.heightCssPx,
          pixelRatio: value.viewport.pixelRatio,
        }
      : null;
  if (
    !isIdentifier(value.poseRevision) ||
    !isFiniteNumber(value.capturedAtMs, 0) ||
    (value.projection !== 'perspective' && value.projection !== 'orthographic') ||
    !position || !target || !up ||
    (value.quaternion !== null && !quaternion) ||
    !isFiniteNumber(value.fovDeg, Number.MIN_VALUE) || value.fovDeg >= 180 ||
    !isFiniteNumber(value.zoom, Number.MIN_VALUE) || value.zoom > 10_000 ||
    !isFiniteNumber(value.near, Number.MIN_VALUE) || value.near > 1_000_000 ||
    !isFiniteNumber(value.far, Number.MIN_VALUE) || value.far > 1_000_000_000 || value.far <= value.near ||
    !isNullableIdentifier(value.cameraMode) ||
    (value.viewport !== null && !viewport)
  ) return null;
  return {
    poseRevision: value.poseRevision,
    capturedAtMs: value.capturedAtMs,
    projection: value.projection,
    position: position as HeatCapacityModeVector3Tuple,
    target: target as HeatCapacityModeVector3Tuple,
    up: up as HeatCapacityModeVector3Tuple,
    quaternion: quaternion as HeatCapacityModeQuaternionTuple | null,
    fovDeg: value.fovDeg,
    zoom: value.zoom,
    near: value.near,
    far: value.far,
    cameraMode: value.cameraMode,
    viewport,
  };
};

const normalizeScene = (value: unknown): HeatCapacityModeSceneCheckpoint | null => {
  if (!isPlainRecord(value)) return null;
  const cameraPose = normalizeCameraPose(value.cameraPose);
  if (value.cameraPose !== null && cameraPose === null) return null;
  const visualKeys = [
    'cameraTransition',
    'ultraVisualState',
    'hardSphereVisualCheckpoint',
    'focusSession',
  ] as const;
  const visuals = Object.fromEntries(visualKeys.map((key) => [key, normalizeJsonObject(value[key])])) as {
    [Key in typeof visualKeys[number]]: HeatCapacityModeJsonObject | null;
  };
  for (const key of visualKeys) {
    if (value[key] !== null && visuals[key] === null) return null;
  }
  return { cameraPose, ...visuals };
};

const normalizePumpAnimation = (value: unknown): HeatCapacityModePumpAnimationCheckpoint | null => {
  if (value === null) return null;
  if (!isPlainRecord(value)) return null;
  const release = value.release === null ? null : normalizeDeferredTimer(value.release);
  const idle = value.idle === null ? null : normalizeDeferredTimer(value.idle);
  if ((value.release !== null && !release) || (value.idle !== null && !idle)) return null;
  return { release, idle };
};

const demoPhases = ['idle', 'running', 'paused'] as const;
const timelineStages = ['highlight', 'action', 'observe', 'preview'] as const;
const stepPanelModes = ['hidden', 'visible', 'exiting'] as const;
const cameraModes = ['instrument', 'pump', 'bottle'] as const;
const pauseReasons = ['user', 'lesson-dialog', 'guide-flow', 'safety'] as const;

const isOneOf = <Value extends string>(
  value: unknown,
  values: readonly Value[],
): value is Value => typeof value === 'string' && values.includes(value as Value);

const normalizeNullableOneOf = <Value extends string>(
  value: unknown,
  values: readonly Value[],
): Value | null | undefined => (
  value === null ? null : isOneOf(value, values) ? value : undefined
);

const normalizeNullableText = (value: unknown): string | null | undefined => (
  value === null ? null : isBoundedText(value) ? value : undefined
);

const normalizeDemo = (value: unknown): HeatCapacityModeDemoCheckpoint | null => {
  if (!isPlainRecord(value) || !isPlainRecord(value.timeline) || !isPlainRecord(value.stepPanel)) return null;
  const timeline = value.timeline;
  const stepPanel = value.stepPanel;
  const requiredDemoKeys = [
    'phase', 'elapsedMs', 'initialDelayRemainingMs', 'pauseReasons', 'timeline', 'stepPanel',
    'focusControlId', 'focusPulseActive', 'cameraMode', 'cameraFocusKey',
    'completionMessage', 'completionMessageRemainingMs',
  ];
  if (!requiredDemoKeys.every((key) => hasOwn(value, key))) return null;
  if (
    !isOneOf(value.phase, demoPhases) ||
    !isFiniteNumber(value.elapsedMs, 0) ||
    !isFiniteNumber(value.initialDelayRemainingMs, 0) ||
    !Array.isArray(value.pauseReasons) ||
    !value.pauseReasons.every((reason) => isOneOf(reason, pauseReasons)) ||
    !isNullableIdentifier(value.focusControlId) ||
    typeof value.focusPulseActive !== 'boolean' ||
    !(value.cameraMode === null || isOneOf(value.cameraMode, cameraModes)) ||
    !isNonNegativeInteger(value.cameraFocusKey) ||
    !(value.completionMessage === null || typeof value.completionMessage === 'string') ||
    !isNullableNonNegativeNumber(value.completionMessageRemainingMs)
  ) return null;
  const currentStage = normalizeNullableOneOf(timeline.currentStage, timelineStages);
  if (currentStage === undefined) return null;
  if (
    !isNullableNonNegativeInteger(timeline.currentItemIndex) ||
    !isNonNegativeInteger(timeline.nextItemIndex) ||
    !isNullableIdentifier(timeline.currentItemKey) ||
    !isNullableIdentifier(timeline.currentStepId) ||
    !isNullableNonNegativeInteger(timeline.currentStepIndex) ||
    !isNullableIdentifier(timeline.currentActionId) ||
    !isNullableNonNegativeNumber(timeline.itemStartedAtElapsedMs) ||
    !Array.isArray(timeline.executedItemKeys) ||
    !timeline.executedItemKeys.every(isIdentifier)
  ) return null;
  const stepPanelMode = stepPanel.mode;
  const stepPanelTitle = stepPanel.title;
  const stepPanelDescription = stepPanel.description;
  const stepPanelTarget = stepPanel.target;
  const stepPanelProgressCriterion = stepPanel.progressCriterion;
  const stepPanelNote = stepPanel.note;
  if (
    !isOneOf(stepPanelMode, stepPanelModes) ||
    !isNonNegativeInteger(stepPanel.stepIndex) ||
    !isNonNegativeInteger(stepPanel.stepCount) ||
    !isBoundedText(stepPanelTitle) ||
    !isBoundedText(stepPanelDescription) ||
    !isBoundedText(stepPanelTarget) ||
    !isBoundedText(stepPanelProgressCriterion) ||
    !isBoundedText(stepPanelNote)
  ) return null;
  const cameraMode = normalizeNullableOneOf(value.cameraMode, cameraModes);
  if (cameraMode === undefined) return null;
  const completionMessage = normalizeNullableText(value.completionMessage);
  if (completionMessage === undefined) return null;
  return {
    phase: value.phase,
    elapsedMs: value.elapsedMs,
    initialDelayRemainingMs: value.initialDelayRemainingMs,
    pauseReasons: [...value.pauseReasons],
    timeline: {
      currentItemIndex: timeline.currentItemIndex,
      nextItemIndex: timeline.nextItemIndex,
      currentItemKey: timeline.currentItemKey,
      currentStage,
      currentStepId: timeline.currentStepId,
      currentStepIndex: timeline.currentStepIndex,
      currentActionId: timeline.currentActionId,
      itemStartedAtElapsedMs: timeline.itemStartedAtElapsedMs,
      executedItemKeys: [...timeline.executedItemKeys],
    },
    stepPanel: {
      mode: stepPanelMode,
      stepIndex: stepPanel.stepIndex,
      stepCount: stepPanel.stepCount,
      title: stepPanelTitle,
      description: stepPanelDescription,
      target: stepPanelTarget,
      progressCriterion: stepPanelProgressCriterion,
      note: stepPanelNote,
    },
    focusControlId: value.focusControlId,
    focusPulseActive: value.focusPulseActive,
    cameraMode,
    cameraFocusKey: value.cameraFocusKey,
    completionMessage,
    completionMessageRemainingMs: value.completionMessageRemainingMs,
  };
};

const normalizeLessonDialog = (value: unknown): HeatCapacityModeLessonDialogCheckpoint | null => {
  if (value === null) return null;
  if (!isPlainRecord(value)) return null;
  if (value.kind === 'intro' && isNonNegativeInteger(value.pageIndex) && value.lessonId === null) {
    return {
      kind: 'intro',
      pageIndex: value.pageIndex,
      lessonId: null,
    };
  }
  if (
    value.kind === 'step' &&
    value.pageIndex === null &&
    isOneOf(value.lessonId, HEAT_CAPACITY_GUIDE_LESSON_STEP_IDS)
  ) {
    return {
      kind: 'step',
      pageIndex: null,
      lessonId: value.lessonId,
    };
  }
  return null;
};

const normalizeGuideReminder = (
  value: unknown,
): { controlId: string | null; timer: HeatCapacityModeDeferredTimer } | null => {
  if (value === null) return null;
  if (!isPlainRecord(value) || !isNullableIdentifier(value.controlId)) return null;
  const timer = normalizeDeferredTimer(value.timer);
  return timer ? { controlId: value.controlId, timer } : null;
};

const normalizeGuide = (value: unknown): HeatCapacityModeGuideCheckpoint | null => {
  if (!isPlainRecord(value) || !isPlainRecord(value.strongReminder)) return null;
  const requiredKeys = [
    'missCount', 'normalReminder', 'strongReminder', 'lessonDialog',
    'shownLessonIds', 'checklistViewedIndex', 'pendingStrongReminder', 'baseStrongReminder',
  ];
  if (!requiredKeys.every((key) => hasOwn(value, key))) return null;
  if (
    !isNonNegativeInteger(value.missCount) ||
    typeof value.strongReminder.active !== 'boolean' ||
    !isNullableIdentifier(value.strongReminder.controlId) ||
    !Array.isArray(value.shownLessonIds) ||
    !value.shownLessonIds.every(isIdentifier) ||
    !isNonNegativeInteger(value.checklistViewedIndex)
  ) return null;
  const lessonDialog = normalizeLessonDialog(value.lessonDialog);
  if (value.lessonDialog !== null && !lessonDialog) return null;
  const normalReminder = normalizeGuideReminder(value.normalReminder);
  const pendingStrongReminder = normalizeGuideReminder(value.pendingStrongReminder);
  const baseStrongReminder = normalizeGuideReminder(value.baseStrongReminder);
  if (
    (value.normalReminder !== null && (!normalReminder || normalReminder.controlId === null)) ||
    (value.pendingStrongReminder !== null && !pendingStrongReminder) ||
    (value.baseStrongReminder !== null && !baseStrongReminder)
  ) return null;
  return {
    missCount: value.missCount,
    normalReminder: normalReminder?.controlId
      ? { controlId: normalReminder.controlId, timer: normalReminder.timer }
      : null,
    strongReminder: {
      active: value.strongReminder.active,
      controlId: value.strongReminder.controlId,
    },
    lessonDialog,
    shownLessonIds: [...value.shownLessonIds],
    checklistViewedIndex: value.checklistViewedIndex,
    pendingStrongReminder,
    baseStrongReminder,
  };
};

export const normalizeHeatCapacityModeGuideCheckpoint = (
  value: unknown,
): HeatCapacityModeGuideCheckpoint | null => normalizeGuide(value);

const normalizeCheckpointUnchecked = (
  value: unknown,
  expectedFileId?: string,
  expectedMode?: HeatCapacityMode,
): HeatCapacityModeUiCheckpoint | null => {
  if (
    !isPlainRecord(value) ||
    value.schemaFamily !== HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_FAMILY ||
    value.schemaVersion !== HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_VERSION ||
    value.interruptedPreheatPolicy !== 'restart-from-zero' ||
    !isIdentifier(value.fileId) ||
    !isIdentifier(value.checkpointId) ||
    !isFiniteNumber(value.capturedAtMs, 0) ||
    !isOneOf(value.mode, ['demo', 'guide', 'free'] as const) ||
    (expectedFileId !== undefined && value.fileId !== expectedFileId) ||
    (expectedMode !== undefined && value.mode !== expectedMode) ||
    !isPlainRecord(value.payload)
  ) return null;
  const scene = normalizeScene(value.scene);
  if (!scene) return null;
  const pumpAnimation = normalizePumpAnimation(value.pumpAnimation);
  if (value.pumpAnimation !== null && !pumpAnimation) return null;
  const base = {
    schemaFamily: HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_FAMILY,
    schemaVersion: HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_VERSION,
    fileId: value.fileId,
    checkpointId: value.checkpointId,
    capturedAtMs: value.capturedAtMs,
    interruptedPreheatPolicy: 'restart-from-zero' as const,
    scene,
    pumpAnimation,
  };
  if (value.mode === 'demo' && value.payload.kind === 'demo') {
    const demo = normalizeDemo(value.payload.demo);
    return demo ? { ...base, mode: 'demo', payload: { kind: 'demo', demo } } : null;
  }
  if (value.mode === 'guide' && value.payload.kind === 'guide') {
    const guide = normalizeGuide(value.payload.guide);
    return guide ? { ...base, mode: 'guide', payload: { kind: 'guide', guide } } : null;
  }
  if (value.mode === 'free' && value.payload.kind === 'free') {
    return { ...base, mode: 'free', payload: { kind: 'free' } };
  }
  return null;
};

export const normalizeHeatCapacityModeUiCheckpoint = (
  value: unknown,
  options: { expectedFileId?: string; expectedMode?: HeatCapacityMode } = {},
): HeatCapacityModeUiCheckpoint | null => {
  try {
    return normalizeCheckpointUnchecked(value, options.expectedFileId, options.expectedMode);
  } catch {
    return null;
  }
};

export const createHeatCapacityModeUiCheckpoint = (
  draft: HeatCapacityModeUiCheckpointDraft,
): HeatCapacityModeUiCheckpoint => {
  const checkpoint = normalizeHeatCapacityModeUiCheckpoint({
    ...draft,
    schemaFamily: HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_FAMILY,
    schemaVersion: HEAT_CAPACITY_MODE_UI_CHECKPOINT_SCHEMA_VERSION,
    interruptedPreheatPolicy: 'restart-from-zero',
  }, {
    expectedFileId: draft.fileId,
    expectedMode: draft.mode,
  });
  if (!checkpoint) throw new TypeError('Invalid heat-capacity mode UI checkpoint draft.');
  return checkpoint;
};
