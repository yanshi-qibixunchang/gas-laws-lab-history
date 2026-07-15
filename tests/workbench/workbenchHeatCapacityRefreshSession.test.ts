import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionModel.ts';
import {
  WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION,
  WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY,
  clearWorkbenchHeatCapacityRefreshSession,
  createWorkbenchHeatCapacityRefreshSession,
  loadWorkbenchHeatCapacityRefreshSession,
  normalizeWorkbenchHeatCapacityRefreshSession,
  persistWorkbenchHeatCapacityRefreshSession,
  type WorkbenchHeatCapacityRefreshSessionStorage,
} from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';

const createMemorySessionStorage = (): WorkbenchHeatCapacityRefreshSessionStorage & {
  values: Map<string, string>;
} => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

assert.equal(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION, 2);
assert.equal(
  WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY,
  'hsl_workbench_heat_capacity_refresh_session_v2',
);
assert.equal(
  WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY,
  'hard-sphere-lab/workbench-heat-capacity-refresh-session',
);

const demoSession = createWorkbenchHeatCapacityRefreshSession('heat-capacity-1', 'demo', 1_720_000_000_000);
assert.deepEqual(demoSession.modeTransition, {
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: 'idle',
  visibleMode: 'demo',
  sourceMode: null,
  targetMode: null,
  queuedMode: null,
  requestId: 0,
  sourceBlockers: [],
  visualRemainingMs: 0,
});
demoSession.checkpointId = 'checkpoint-42';
demoSession.demo = {
  phase: 'running',
  elapsedMs: 12_345,
  initialDelayRemainingMs: 0,
  pauseReasons: [],
  timeline: {
    currentItemIndex: 7,
    nextItemIndex: 8,
    currentItemKey: '7:highlight',
    currentStage: 'highlight',
    currentStepId: 'zero-pressure',
    currentStepIndex: 2,
    currentActionId: null,
    itemStartedAtElapsedMs: 12_000,
    executedItemKeys: ['0:highlight', '1:action'],
  },
  stepPanel: {
    mode: 'visible',
    stepIndex: 3,
    stepCount: 11,
    title: '压力差调零',
    description: '即将操作',
    target: '压力旋钮',
    progressCriterion: '接近 0 mV',
    note: '观察读数',
  },
  focusControlId: 'pressureZero',
  focusPulseActive: true,
  cameraMode: 'instrument',
  cameraFocusKey: 4,
  completionMessage: null,
  completionMessageRemainingMs: null,
};
demoSession.ui = {
  windows: {
    settingsGeneralOpen: true,
    heatCapacityAdvancedOpen: true,
    lessonDialogLayer: { zIndex: 3 },
  },
  drafts: {
    advancedInputDrafts: { ambientPressureKPa: '99.2' },
    rename: { fileId: 'heat-capacity-1', text: '热容比实验', selectionStart: 2, selectionEnd: 2 },
  },
  layout: {
    leftCollapsed: false,
    parametersCollapsed: false,
    scrollPositions: { parameters: 184, console: 72 },
  },
};
demoSession.cameraPose = {
  poseRevision: 'camera-9',
  capturedAtMs: 1_720_000_000_000,
  projection: 'perspective',
  position: [2.5, 1.75, 4.25],
  target: [0.1, 0.7, -0.2],
  up: [0, 1, 0],
  quaternion: [0, 0.2, 0, 0.98],
  fovDeg: 42,
  zoom: 1.1,
  near: 0.01,
  far: 500,
  cameraMode: 'user',
  viewport: {
    widthCssPx: 980,
    heightCssPx: 620,
    pixelRatio: 1.5,
  },
};
demoSession.sceneSnapshot = {
  snapshotId: 'snapshot-37',
  capturedCheckpointId: 'checkpoint-41',
  sceneRevision: 'scene-18',
  cameraPoseRevision: 'camera-9',
  capturedAtMs: 1_720_000_000_000,
  mimeType: 'image/png',
  imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  widthPx: 1470,
  heightPx: 930,
  widthCssPx: 980,
  heightCssPx: 620,
  pixelRatio: 1.5,
  themeId: 'dark',
  performanceProfileId: 'balanced',
};

const normalizedDemoSession = normalizeWorkbenchHeatCapacityRefreshSession(demoSession);
assert.deepEqual(normalizedDemoSession, demoSession, 'a legal demo checkpoint should round-trip without loss');

const animatingTransitionSession = createWorkbenchHeatCapacityRefreshSession(
  'heat-capacity-transition',
  'guide',
  1_720_000_000_050,
);
animatingTransitionSession.modeTransition = {
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: 'animating',
  visibleMode: 'guide',
  sourceMode: 'free',
  targetMode: 'guide',
  queuedMode: 'demo',
  requestId: 9,
  sourceBlockers: [],
  visualRemainingMs: 217,
};
animatingTransitionSession.modeTransitionDemoClock = {
  fileId: 'heat-capacity-transition',
  elapsedMs: 18_750,
  initialDelayRemainingMs: 0,
};
animatingTransitionSession.modeTransitionGuideUi = {
  missCount: 2,
  normalReminder: {
    controlId: 'pressureZero',
    timer: { state: 'waiting', remainingMs: 1_400 },
  },
  strongReminder: { active: true, controlId: 'pressureZero' },
  lessonDialog: {
    kind: 'step',
    pageIndex: null,
    lessonId: 'pressureZeroBaseline',
  },
  shownLessonIds: ['pressureZeroBaseline'],
  checklistViewedIndex: 3,
  pendingStrongReminder: {
    controlId: 'pressureZero',
    timer: { state: 'due' },
  },
  baseStrongReminder: null,
};
const normalizedAnimatingTransitionSession = normalizeWorkbenchHeatCapacityRefreshSession(
  animatingTransitionSession,
);
assert.deepEqual(
  normalizedAnimatingTransitionSession?.modeTransition,
  animatingTransitionSession.modeTransition,
  'an in-flight target animation should round-trip its visual progress',
);
assert.equal(
  normalizedAnimatingTransitionSession?.modeTransitionDemoClock,
  null,
  'a frozen Demo source clock must not survive after another target mode has already been applied',
);
assert.deepEqual(
  normalizedAnimatingTransitionSession?.modeTransitionGuideUi,
  animatingTransitionSession.modeTransitionGuideUi,
  'an incoming Guide animation must persist its deferred reminder and lesson payload across refresh',
);

for (const phase of ['preparing-target', 'waiting-for-motion'] as const) {
  const queuedGuideTransitionSession = structuredClone(animatingTransitionSession);
  queuedGuideTransitionSession.modeTransition = {
    schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
    phase,
    visibleMode: 'guide',
    sourceMode: 'guide',
    targetMode: 'demo',
    queuedMode: null,
    requestId: phase === 'preparing-target' ? 10 : 11,
    sourceBlockers: phase === 'waiting-for-motion' ? ['camera'] : [],
    visualRemainingMs: 0,
  };
  assert.deepEqual(
    normalizeWorkbenchHeatCapacityRefreshSession(queuedGuideTransitionSession)?.modeTransitionGuideUi,
    queuedGuideTransitionSession.modeTransitionGuideUi,
    `a deferred Guide payload must survive refresh during ${phase}`,
  );
}

const settledGuideWithStaleDeferredUi = structuredClone(animatingTransitionSession);
settledGuideWithStaleDeferredUi.modeTransition = {
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: 'idle',
  visibleMode: 'guide',
  sourceMode: null,
  targetMode: null,
  queuedMode: null,
  requestId: 12,
  sourceBlockers: [],
  visualRemainingMs: 0,
};
assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession(settledGuideWithStaleDeferredUi)?.modeTransitionGuideUi,
  null,
  'a settled Guide session must discard stale deferred UI instead of overriding current live UI',
);

const invalidDeferredGuideLesson = structuredClone(animatingTransitionSession);
if (invalidDeferredGuideLesson.modeTransitionGuideUi?.lessonDialog?.kind === 'step') {
  (invalidDeferredGuideLesson.modeTransitionGuideUi.lessonDialog as unknown as { lessonId: string }).lessonId =
    'unknown-lesson';
}
assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession(invalidDeferredGuideLesson)?.modeTransitionGuideUi,
  null,
  'an unknown Guide lesson id must not cross the refresh boundary',
);

const waitingDemoTransitionSession = createWorkbenchHeatCapacityRefreshSession(
  'heat-capacity-demo-transition',
  'demo',
  1_720_000_000_075,
);
waitingDemoTransitionSession.demo.phase = 'running';
waitingDemoTransitionSession.demo.elapsedMs = 18_750;
waitingDemoTransitionSession.modeTransition = {
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: 'waiting-for-motion',
  visibleMode: 'demo',
  sourceMode: 'demo',
  targetMode: 'guide',
  queuedMode: null,
  requestId: 10,
  sourceBlockers: ['camera', 'instrument'],
  visualRemainingMs: 0,
};
waitingDemoTransitionSession.modeTransitionDemoClock = {
  fileId: 'heat-capacity-demo-transition',
  elapsedMs: 18_750,
  initialDelayRemainingMs: 0,
};
assert.deepEqual(
  normalizeWorkbenchHeatCapacityRefreshSession(waitingDemoTransitionSession),
  waitingDemoTransitionSession,
  'a running Demo source should round-trip its frozen clock while real source motion blocks the switch',
);

const incomingDemoTransitionSession = structuredClone(waitingDemoTransitionSession);
incomingDemoTransitionSession.modeTransition = {
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: 'animating',
  visibleMode: 'demo',
  sourceMode: 'free',
  targetMode: 'demo',
  queuedMode: null,
  requestId: 11,
  sourceBlockers: [],
  visualRemainingMs: 190,
};
assert.deepEqual(
  normalizeWorkbenchHeatCapacityRefreshSession(incomingDemoTransitionSession),
  incomingDemoTransitionSession,
  'an incoming Demo timeline should remain frozen if the page refreshes before its visual commit',
);

const stalePausedDemoClock = structuredClone(waitingDemoTransitionSession);
stalePausedDemoClock.demo.phase = 'paused';
assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession(stalePausedDemoClock)?.modeTransitionDemoClock,
  null,
  'a stale frozen clock must be discarded when Demo is user-paused',
);

const wrongFileDemoClock = structuredClone(waitingDemoTransitionSession);
wrongFileDemoClock.modeTransitionDemoClock!.fileId = 'another-file';
assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession(wrongFileDemoClock)?.modeTransitionDemoClock,
  null,
  'a frozen clock must be discarded when it belongs to another file',
);

const malformedTransitionSession = normalizeWorkbenchHeatCapacityRefreshSession({
  ...animatingTransitionSession,
  mode: 'free',
  modeTransition: {
    schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
    phase: 'waiting-for-motion',
    visibleMode: 'not-a-mode',
    sourceMode: 'guide',
    targetMode: 'free',
    requestId: 4,
  },
});
assert.deepEqual(
  malformedTransitionSession?.modeTransition,
  {
    schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
    phase: 'idle',
    visibleMode: 'free',
    sourceMode: null,
    targetMode: null,
    queuedMode: null,
    requestId: 0,
    sourceBlockers: [],
    visualRemainingMs: 0,
  },
  'an invalid transition checkpoint should fall back to an idle checkpoint for the persisted session mode',
);

const splitSessionModeTransition = normalizeWorkbenchHeatCapacityRefreshSession({
  ...waitingDemoTransitionSession,
  mode: 'free',
});
assert.deepEqual(
  splitSessionModeTransition?.modeTransition,
  {
    schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
    phase: 'idle',
    visibleMode: 'free',
    sourceMode: null,
    targetMode: null,
    queuedMode: null,
    requestId: 10,
    sourceBlockers: [],
    visualRemainingMs: 0,
  },
  'a transition whose visible mode disagrees with the persisted file mode must fail closed',
);
assert.equal(
  splitSessionModeTransition?.modeTransitionDemoClock,
  null,
  'a torn cross-mode checkpoint must not retain a frozen Demo clock',
);

const splitAnimatingTransition = normalizeWorkbenchHeatCapacityRefreshSession({
  ...incomingDemoTransitionSession,
  modeTransition: {
    ...incomingDemoTransitionSession.modeTransition,
    visibleMode: 'demo',
    targetMode: 'guide',
  },
});
assert.deepEqual(
  splitAnimatingTransition?.modeTransition,
  {
    schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
    phase: 'idle',
    visibleMode: 'demo',
    sourceMode: null,
    targetMode: null,
    queuedMode: null,
    requestId: 11,
    sourceBlockers: [],
    visualRemainingMs: 0,
  },
  'an animating checkpoint that does not display its applied target must fail closed',
);
assert.equal(splitAnimatingTransition?.modeTransitionDemoClock, null);

const demoWithLessonDialog = structuredClone(demoSession);
demoWithLessonDialog.guide.lessonDialog = {
  kind: 'step',
  pageIndex: null,
  lessonId: 'pressureZeroBaseline',
};
demoWithLessonDialog.guide.shownLessonIds = ['pressureZeroBaseline'];
demoWithLessonDialog.guide.toastQueue.current = {
  id: 'demo-lesson-toast',
  text: '演示已暂停',
  level: 'info',
  priority: 0,
  source: 'guide',
  createdAtMs: 1_720_000_000_000,
  remainingMs: 600,
};
demoWithLessonDialog.guide.pressureAlarmVisible = true;
demoWithLessonDialog.guide.pressureAlarmRemainingMs = 500;
demoWithLessonDialog.guide.focusControlId = 'guide-only-focus';
demoWithLessonDialog.guide.focusPulseActive = true;
demoWithLessonDialog.guide.missCount = 4;
demoWithLessonDialog.guide.strongReminder = {
  active: true,
  controlId: 'guide-only-focus',
  message: 'guide only',
  remainingMs: null,
};
const normalizedDemoWithLessonDialog = normalizeWorkbenchHeatCapacityRefreshSession(demoWithLessonDialog);
assert.ok(normalizedDemoWithLessonDialog);
assert.equal(normalizedDemoWithLessonDialog.guide.lessonDialog?.kind, 'step');
assert.equal(normalizedDemoWithLessonDialog.guide.toastQueue.current?.remainingMs, 600);
assert.equal(normalizedDemoWithLessonDialog.guide.pressureAlarmVisible, true);
assert.equal(normalizedDemoWithLessonDialog.demo.phase, 'paused');
assert.deepEqual(normalizedDemoWithLessonDialog.demo.pauseReasons, ['lesson-dialog']);
assert.equal(normalizedDemoWithLessonDialog.guide.focusControlId, null);
assert.equal(normalizedDemoWithLessonDialog.guide.focusPulseActive, false);
assert.equal(normalizedDemoWithLessonDialog.guide.missCount, 0);
assert.equal(normalizedDemoWithLessonDialog.guide.strongReminder.active, false);

const storage = createMemorySessionStorage();
assert.equal(persistWorkbenchHeatCapacityRefreshSession(demoSession, storage), true);
assert.equal(storage.values.has(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY), true);
assert.deepEqual(loadWorkbenchHeatCapacityRefreshSession(storage), demoSession);
assert.equal(clearWorkbenchHeatCapacityRefreshSession(storage), true);
assert.equal(loadWorkbenchHeatCapacityRefreshSession(storage), null);

const guideSession = createWorkbenchHeatCapacityRefreshSession('heat-capacity-guide', 'guide', 1_720_000_000_100);
guideSession.guide = {
  focusControlId: 'recordU1',
  focusPulseActive: true,
  missCount: 2,
  pauseReasons: ['lesson-dialog'],
  normalReminder: {
    active: true,
    controlId: 'recordU1',
    message: '请记录 U1',
    remainingMs: 1_400,
  },
  strongReminder: {
    active: true,
    controlId: 'recordU1',
    message: '请先完成当前步骤',
    remainingMs: null,
  },
  lessonDialog: {
    kind: 'intro',
    pageIndex: 1,
    lessonId: null,
  },
  shownLessonIds: ['intro', 'pressureZeroBaseline'],
  toastQueue: {
    current: {
      id: 'toast-current',
      text: '请记录 U1',
      level: 'warning',
      priority: 1,
      source: 'guide',
      createdAtMs: 1_720_000_000_000,
      remainingMs: 800,
    },
    pending: [{
      id: 'toast-pending',
      text: '压力偏高',
      level: 'danger',
      priority: 4,
      source: 'pressure-alarm',
      createdAtMs: 1_720_000_000_010,
      remainingMs: 2_000,
    }],
  },
  pressureAlarmVisible: true,
  pressureAlarmRemainingMs: 1_200,
};
assert.deepEqual(
  normalizeWorkbenchHeatCapacityRefreshSession(guideSession),
  guideSession,
  'guide reminders, lesson dialog, and toast remaining times should round-trip',
);

const freeSessionWithPressureToast = createWorkbenchHeatCapacityRefreshSession('heat-capacity-free', 'free', 123);
freeSessionWithPressureToast.guide.toastQueue.current = {
  id: 'free-pressure-toast',
  text: '压力过高',
  level: 'danger',
  priority: 4,
  source: 'pressure-alarm',
  createdAtMs: 100,
  remainingMs: 900,
};
freeSessionWithPressureToast.guide.pressureAlarmVisible = true;
freeSessionWithPressureToast.guide.pressureAlarmRemainingMs = 900;
const normalizedFreeSession = normalizeWorkbenchHeatCapacityRefreshSession(freeSessionWithPressureToast);
assert.equal(normalizedFreeSession?.guide.toastQueue.current?.id, 'free-pressure-toast');
assert.equal(normalizedFreeSession?.guide.pressureAlarmRemainingMs, 900);

const malformedSession = normalizeWorkbenchHeatCapacityRefreshSession({
  ...demoSession,
  demo: {
    phase: 'paused',
    elapsedMs: Number.NaN,
    initialDelayRemainingMs: -40,
    pauseReasons: ['not-a-reason'],
    timeline: {
      currentItemIndex: -1,
      nextItemIndex: '8',
      currentStage: 'unknown',
      executedItemKeys: ['kept', '', 'kept', 12],
    },
    stepPanel: {
      mode: 'unknown',
      stepIndex: -3,
      title: 42,
    },
    focusControlId: 5,
    focusPulseActive: true,
    cameraMode: 'side',
  },
  ui: {
    windows: {
      settingsGeneralOpen: true,
      invalidFunction: () => undefined,
      nested: { valid: 3, invalid: Number.POSITIVE_INFINITY },
    },
    drafts: new Date(),
    layout: null,
  },
  cameraPose: {
    position: [0, 1],
    target: [0, 0, 0],
  },
  sceneSnapshot: {
    ...demoSession.sceneSnapshot,
    mimeType: 'image/webp',
  },
});
assert.ok(malformedSession);
assert.equal(malformedSession.demo.phase, 'paused');
assert.deepEqual(malformedSession.demo.pauseReasons, ['user'], 'a paused demo must retain a semantic pause reason');
assert.equal(malformedSession.demo.elapsedMs, 0);
assert.equal(malformedSession.demo.initialDelayRemainingMs, 0);
assert.equal(malformedSession.demo.timeline.currentItemIndex, null);
assert.equal(malformedSession.demo.timeline.nextItemIndex, 0);
assert.equal(malformedSession.demo.timeline.currentStage, null);
assert.deepEqual(malformedSession.demo.timeline.executedItemKeys, ['kept']);
assert.equal(malformedSession.demo.stepPanel.mode, 'hidden');
assert.equal(malformedSession.demo.focusPulseActive, false);
assert.equal(malformedSession.cameraPose, null);
assert.equal(malformedSession.sceneSnapshot, null, 'snapshot MIME metadata must match the data URL');
assert.deepEqual(malformedSession.ui.windows, {
  settingsGeneralOpen: true,
  nested: { valid: 3 },
});
assert.deepEqual(malformedSession.ui.drafts, {});
assert.deepEqual(malformedSession.ui.layout, {});

assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession({
    ...demoSession,
    schemaVersion: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION + 1,
  }),
  null,
  'future schema versions must not be guessed',
);
assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession({
    ...demoSession,
    schemaVersion: 1,
  }),
  null,
  'the obsolete v1 refresh-session schema must not be restored through the v2 transition boundary',
);
assert.equal(
  normalizeWorkbenchHeatCapacityRefreshSession({
    schemaFamily: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_SCHEMA_VERSION,
    activeFileId: 'standard-1',
    experimentKind: 'standard',
    checkpointId: 'standard-checkpoint',
    mode: 'free',
  }),
  null,
  'a generic standard/ideal active file id must never be accepted as a heat-capacity refresh checkpoint',
);

const heatSessionWithUnrelatedActiveIds = normalizeWorkbenchHeatCapacityRefreshSession({
  ...demoSession,
  activeFileId: 'standard-1',
  standardActiveFileId: 'standard-1',
  idealActiveFileId: 'ideal-1',
  experimentKind: 'standard',
});
assert.ok(heatSessionWithUnrelatedActiveIds);
assert.equal(heatSessionWithUnrelatedActiveIds.activeHeatCapacityFileId, 'heat-capacity-1');
assert.equal('activeFileId' in heatSessionWithUnrelatedActiveIds, false);
assert.equal('standardActiveFileId' in heatSessionWithUnrelatedActiveIds, false);
assert.equal('idealActiveFileId' in heatSessionWithUnrelatedActiveIds, false);
assert.equal('experimentKind' in heatSessionWithUnrelatedActiveIds, false);

const invalidStorage = createMemorySessionStorage();
invalidStorage.values.set(WORKBENCH_HEAT_CAPACITY_REFRESH_SESSION_STORAGE_KEY, '{not-json');
assert.equal(loadWorkbenchHeatCapacityRefreshSession(invalidStorage), null);
assert.equal(persistWorkbenchHeatCapacityRefreshSession({ activeFileId: 'standard-1' }, invalidStorage), false);

console.log('workbenchHeatCapacityRefreshSession tests passed');
