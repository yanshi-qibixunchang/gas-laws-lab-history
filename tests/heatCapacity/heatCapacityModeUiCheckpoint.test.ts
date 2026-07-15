import assert from 'node:assert/strict';
import {
  createHeatCapacityModeUiCheckpoint,
  normalizeHeatCapacityModeGuideCheckpoint,
  normalizeHeatCapacityModeUiCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';

const scene = {
  cameraPose: null,
  cameraTransition: null,
  ultraVisualState: null,
  hardSphereVisualCheckpoint: null,
  focusSession: null,
};

const demoCheckpoint = createHeatCapacityModeUiCheckpoint({
  fileId: 'heat-capacity-checkpoint-demo',
  checkpointId: 'demo-checkpoint-1',
  capturedAtMs: 1_000,
  mode: 'demo',
  scene,
  pumpAnimation: null,
  payload: {
    kind: 'demo',
    demo: {
      phase: 'paused',
      elapsedMs: 5_000,
      initialDelayRemainingMs: 0,
      pauseReasons: ['user'],
      timeline: {
        currentItemIndex: 2,
        nextItemIndex: 3,
        currentItemKey: '2:action',
        currentStage: 'action',
        currentStepId: 'pump',
        currentStepIndex: 1,
        currentActionId: 'pump:',
        itemStartedAtElapsedMs: 4_800,
        executedItemKeys: ['0:highlight', '1:preview', '2:action'],
      },
      stepPanel: {
        mode: 'visible',
        stepIndex: 2,
        stepCount: 16,
        title: '打气',
        description: '完成标准打气流程。',
        target: '打气球',
        progressCriterion: '达到目标压力',
        note: '',
      },
      focusControlId: 'pumpBulb',
      focusPulseActive: true,
      cameraMode: 'pump',
      cameraFocusKey: 2,
      completionMessage: null,
      completionMessageRemainingMs: null,
    },
  },
});

assert.deepEqual(
  normalizeHeatCapacityModeUiCheckpoint(demoCheckpoint),
  demoCheckpoint,
  'a canonical Demo checkpoint should round-trip without loss',
);

for (const field of ['currentItemIndex', 'currentStepIndex'] as const) {
  const fractionalCursor = structuredClone(demoCheckpoint);
  if (fractionalCursor.mode !== 'demo') throw new Error('Expected a Demo checkpoint.');
  fractionalCursor.payload.demo.timeline[field] = 0.5;
  assert.equal(
    normalizeHeatCapacityModeUiCheckpoint(fractionalCursor),
    null,
    `${field} must reject fractional timeline cursors`,
  );
}

const demoWithCamera = structuredClone(demoCheckpoint);
demoWithCamera.scene.cameraPose = {
  poseRevision: 'camera-1',
  capturedAtMs: 1_000,
  projection: 'perspective',
  position: [2, 1, 4],
  target: [0, 0.5, 0],
  up: [0, 1, 0],
  quaternion: null,
  fovDeg: 42,
  zoom: 1,
  near: 0.1,
  far: 1_000,
  cameraMode: 'instrument',
  viewport: { widthCssPx: 980, heightCssPx: 620, pixelRatio: 1.5 },
};
assert.notEqual(normalizeHeatCapacityModeUiCheckpoint(demoWithCamera), null);

for (const [label, mutate] of [
  ['zero fov', (camera: NonNullable<typeof demoWithCamera.scene.cameraPose>) => { camera.fovDeg = 0; }],
  ['zero zoom', (camera: NonNullable<typeof demoWithCamera.scene.cameraPose>) => { camera.zoom = 0; }],
  ['zero near plane', (camera: NonNullable<typeof demoWithCamera.scene.cameraPose>) => { camera.near = 0; }],
  ['far plane behind near plane', (camera: NonNullable<typeof demoWithCamera.scene.cameraPose>) => { camera.far = camera.near; }],
  ['zero viewport width', (camera: NonNullable<typeof demoWithCamera.scene.cameraPose>) => {
    if (camera.viewport) camera.viewport.widthCssPx = 0;
  }],
] as const) {
  const malformedCameraCheckpoint = structuredClone(demoWithCamera);
  const camera = malformedCameraCheckpoint.scene.cameraPose;
  if (!camera) throw new Error('Expected a camera checkpoint.');
  mutate(camera);
  assert.equal(
    normalizeHeatCapacityModeUiCheckpoint(malformedCameraCheckpoint),
    null,
    `${label} must not cross the UI checkpoint boundary`,
  );
}

const validGuidePayload = {
  missCount: 1,
  normalReminder: {
    controlId: 'recordU1',
    timer: { state: 'waiting' as const, remainingMs: 900 },
  },
  strongReminder: { active: true, controlId: 'recordU1' },
  lessonDialog: {
    kind: 'step' as const,
    pageIndex: null,
    lessonId: 'quickReleaseState' as const,
  },
  shownLessonIds: ['quickReleaseState'],
  checklistViewedIndex: 12,
  pendingStrongReminder: null,
  baseStrongReminder: {
    controlId: 'recordU1',
    timer: { state: 'due' as const },
  },
};

assert.deepEqual(
  normalizeHeatCapacityModeGuideCheckpoint(validGuidePayload),
  validGuidePayload,
  'a canonical Guide payload should round-trip without loss',
);

const unknownLessonPayload = structuredClone(validGuidePayload) as unknown as {
  lessonDialog: { lessonId: string };
};
unknownLessonPayload.lessonDialog.lessonId = 'unknown-lesson';
assert.equal(
  normalizeHeatCapacityModeGuideCheckpoint(unknownLessonPayload),
  null,
  'an unknown Guide lesson id must be rejected before UI restoration',
);

console.log('heatCapacityModeUiCheckpoint tests passed');
