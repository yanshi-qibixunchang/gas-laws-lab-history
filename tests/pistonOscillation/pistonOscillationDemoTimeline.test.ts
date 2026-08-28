import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_SETTLING_DURATION_S,
  createPistonOscillationLoadedEquilibriumState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS,
  PISTON_OSCILLATION_DEMO_DURATION_MS,
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS,
  PISTON_OSCILLATION_DEMO_OBSERVE_MS,
  PISTON_OSCILLATION_DEMO_ORIENT_MS,
  PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS,
  getPistonOscillationDemoFrame,
  getPistonOscillationDemoTrajectory,
  type PistonOscillationDemoStepKind,
} from '../../src/features/pistonOscillation/pistonOscillationDemoTimeline.ts';

const frameInside = (startsAtMs: number, endsAtMs: number, fraction = 0.5) => (
  getPistonOscillationDemoFrame(startsAtMs + (endsAtMs - startsAtMs) * fraction)
);
const step = (measurementIndex: number, kind: PistonOscillationDemoStepKind) => (
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.find(
    (window) => window.measurementIndex === measurementIndex && window.kind === kind,
  )!
);
const action = (
  measurementIndex: number,
  kind: PistonOscillationDemoStepKind,
  control: string | null,
) => step(measurementIndex, kind).actionWindows.find((window) => window.control === control)!;

const initial = getPistonOscillationDemoFrame(0);
assert.equal(initial.equilibriumHeightMm, 0);
assert.equal(initial.hoseState, 'disconnected');
assert.equal(initial.lockingScrewProgress, 0);
assert.equal(initial.sampleRateInput, '');
assert.equal(initial.triggerInput, '');
assert.equal(initial.virtualKeyboardVisible, false);
assert.equal(initial.measurementIndex, 0);
assert.equal(initial.measurementCount, 3);
assert.equal(initial.savedMeasurementCount, 0);
assert.equal(initial.stage, 'reset');
assert.equal(initial.operationCue, null);
assert.equal(initial.powerOn, false);
assert.equal(initial.powerButtonPressProgress, 0);

const firstOrientation = getPistonOscillationDemoFrame(
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS + 100,
);
assert.equal(firstOrientation.stage, 'orient');
assert.equal(firstOrientation.highlightControl, null);
const firstHighlight = getPistonOscillationDemoFrame(
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS + PISTON_OSCILLATION_DEMO_ORIENT_MS + 100,
);
assert.equal(firstHighlight.stage, 'highlight');
assert.equal(firstHighlight.highlightControl, 'power');
assert.equal(firstHighlight.highlightElapsedSeconds, 0.1);
assert.equal(firstHighlight.virtualKeyboardVisible, false);

const powerOnAction = action(0, 'powerOn', 'power');
const powerOnPressed = getPistonOscillationDemoFrame(powerOnAction.startsAtMs + 165);
assert.equal(powerOnPressed.powerOn, true);
assert.equal(powerOnPressed.powerButtonPressProgress, 1);
assert.deepEqual(powerOnPressed.operationCue, { keys: ['mouseLeft'], mouseAction: 'click' });
assert.equal(getPistonOscillationDemoFrame(powerOnAction.endsAtMs).powerOn, true);

const settingsHighlight = step(0, 'settings').highlightWindows[0]!;
assert.equal(frameInside(settingsHighlight.startsAtMs, settingsHighlight.endsAtMs).highlightControl, 'settings');

const settingsAction = action(0, 'settings', 'settings');
const keyboardStart = frameInside(settingsAction.startsAtMs, settingsAction.endsAtMs, 0.08);
assert.equal(keyboardStart.activeControl, 'settings');
assert.equal(keyboardStart.virtualKeyboardVisible, true);
assert.equal(keyboardStart.virtualKeyboardField, 'sampleRate');
assert.equal(keyboardStart.sampleRateInput, '1');
const keyboardTrigger = frameInside(settingsAction.startsAtMs, settingsAction.endsAtMs, 0.76);
assert.equal(keyboardTrigger.virtualKeyboardField, 'trigger');
assert.equal(keyboardTrigger.sampleRateInput, '1000');
assert.equal(keyboardTrigger.triggerInput, '12');
const configured = getPistonOscillationDemoFrame(settingsAction.endsAtMs);
assert.equal(configured.sampleRateInput, '1000');
assert.equal(configured.triggerInput, '120');
assert.equal(configured.virtualKeyboardVisible, false);

assert.equal(PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length, 31);
assert.equal(PISTON_OSCILLATION_DEMO_DURATION_MS, 276_550);
assert.deepEqual(
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.map(({ kind }) => kind),
  [
    'powerOn',
    'settings',
    'adjustHeight', 'secureHeight', 'reconnectHose', 'restoreFreeMotion', 'startAcquisition',
    'recordOscillation', 'stopAcquisition', 'saveRun',
    'settle', 'disconnect',
    'adjustHeight', 'secureHeight', 'reconnectHose', 'restoreFreeMotion', 'startAcquisition',
    'recordOscillation', 'stopAcquisition', 'saveRun',
    'settle', 'disconnect',
    'adjustHeight', 'secureHeight', 'reconnectHose', 'restoreFreeMotion', 'startAcquisition',
    'recordOscillation', 'stopAcquisition', 'saveRun',
    'powerOff',
  ],
);
assert.deepEqual(
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.map(({ measurementIndex }) => measurementIndex),
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
);

for (const window of PISTON_OSCILLATION_DEMO_STEP_WINDOWS) {
  if (window.kind !== 'settle') {
    assert.equal(window.segments[0]?.stage, 'orient');
    assert.equal(window.segments[0]?.control, null);
    assert.ok(window.segments.some(({ stage }) => stage === 'highlight'));
  }
  for (const highlightWindow of window.highlightWindows) {
    assert.equal(
      highlightWindow.endsAtMs - highlightWindow.startsAtMs,
      PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
    );
  }
  assert.equal(window.endsAtMs - window.actionEndsAtMs, PISTON_OSCILLATION_DEMO_OBSERVE_MS);
  const observed = getPistonOscillationDemoFrame(window.actionEndsAtMs + 100);
  assert.equal(observed.stage, 'observe');
  assert.equal(observed.stepIndex, window.stepIndex);
}

for (const measurementIndex of [0, 1, 2]) {
  const targetHeightMm = [80, 70, 60][measurementIndex];
  const heightAction = action(measurementIndex, 'adjustHeight', 'platform');
  const adjusted = getPistonOscillationDemoFrame(heightAction.endsAtMs);
  assert.equal(adjusted.measurementIndex, measurementIndex);
  assert.equal(adjusted.targetHeightMm, targetHeightMm);
  assert.equal(adjusted.equilibriumHeightMm, targetHeightMm);
  assert.equal(adjusted.nominalHeightMm, targetHeightMm);
  assert.equal(adjusted.thermodynamicState.phase, 'vented');
  assert.equal(adjusted.hoseState, 'disconnected');

  const heightHandoff = frameInside(heightAction.startsAtMs, heightAction.endsAtMs, 0.9);
  assert.equal(heightHandoff.platformAction, 'adjustHeight');
  assert.equal(heightHandoff.leftHandSupporting, true);
  assert.deepEqual(heightHandoff.operationCue, {
    keys: ['space', 'mouseLeft'],
    mouseAction: measurementIndex === 0 ? 'moveUp' : 'moveDown',
  });

  const heightOrientation = step(measurementIndex, 'adjustHeight').segments[0]!;
  assert.equal(heightOrientation.stage, 'orient');
  assert.equal(heightOrientation.operationMirrorView, 'scaleReadingView');
  const heightHighlight = step(measurementIndex, 'adjustHeight').segments[1]!;
  assert.deepEqual(heightHighlight.highlightControls, ['platform', 'mirrorOutline']);

  const seal = step(measurementIndex, 'secureHeight');
  assert.deepEqual(
    seal.segments.map(({ stage, control }) => `${stage}:${control}`),
    ['orient:null', 'highlight:screw', 'action:screw'],
  );
  assert.ok(seal.segments.every(({ operationMirrorView }) => (
    operationMirrorView === 'screwOperationView'
  )));
  assert.deepEqual(seal.segments[1]!.highlightControls, ['screw', 'mirrorOutline']);
  const screwOrientation = getPistonOscillationDemoFrame(seal.segments[0]!.startsAtMs + 100);
  assert.equal(screwOrientation.stage, 'orient');
  assert.equal(screwOrientation.operationMirrorView, 'screwOperationView');
  assert.deepEqual(screwOrientation.highlightControls, []);
  assert.deepEqual(screwOrientation.operationCue, { keys: ['space'] });
  const screwHighlight = getPistonOscillationDemoFrame(seal.segments[1]!.startsAtMs + 100);
  assert.deepEqual(screwHighlight.highlightControls, ['screw', 'mirrorOutline']);
  assert.deepEqual(screwHighlight.operationCue, { keys: ['space'] });
  const screwAction = action(measurementIndex, 'secureHeight', 'screw');
  assert.deepEqual(frameInside(screwAction.startsAtMs, screwAction.endsAtMs).operationCue, {
    keys: ['space', 'mouseLeft'],
    mouseAction: 'rotateClockwise',
  });
  assert.equal(getPistonOscillationDemoFrame(screwAction.endsAtMs).operationCue, null);

  const reconnect = step(measurementIndex, 'reconnectHose');
  assert.deepEqual(
    reconnect.segments.map(({ stage, control }) => `${stage}:${control}`),
    ['orient:null', 'highlight:hose', 'action:hose'],
  );
  assert.ok(reconnect.segments.every(({ focusMode }) => focusMode === 'overview'));
  assert.deepEqual(reconnect.segments[1]!.highlightControls, ['hose', 'hoseSnap']);
  const connectAction = action(measurementIndex, 'reconnectHose', 'hose');
  const connecting = frameInside(connectAction.startsAtMs, connectAction.endsAtMs, 0.5);
  assert.equal(connecting.hoseDragging, true);
  assert.equal(connecting.hoseState, 'disconnected');
  assert.deepEqual(connecting.operationCue, {
    keys: ['mouseLeft'],
    mouseAction: 'click',
  });
  const connected = getPistonOscillationDemoFrame(connectAction.endsAtMs);
  assert.equal(connected.hoseState, 'connected');
  assert.equal(connected.hoseDragging, false);
  assert.equal(connected.thermodynamicState.phase, 'sealed-locked-atmospheric');

  const recordAction = action(measurementIndex, 'recordOscillation', 'platform');
  const restoreStep = step(measurementIndex, 'restoreFreeMotion');
  assert.deepEqual(
    getPistonOscillationDemoFrame(restoreStep.startsAtMs + 100).operationCue,
    { keys: ['space'] },
  );
  const restoreAction = action(measurementIndex, 'restoreFreeMotion', 'screw');
  assert.deepEqual(frameInside(restoreAction.startsAtMs, restoreAction.endsAtMs).operationCue, {
    keys: ['space', 'mouseLeft'],
    mouseAction: 'rotateCounterclockwise',
  });
  const settlingStart = getPistonOscillationDemoFrame(restoreAction.endsAtMs);
  const settlingMiddle = getPistonOscillationDemoFrame(
    restoreAction.endsAtMs + PISTON_OSCILLATION_SETTLING_DURATION_S * 500,
  );
  const settlingEnd = getPistonOscillationDemoFrame(
    restoreAction.endsAtMs + PISTON_OSCILLATION_SETTLING_DURATION_S * 1_000,
  );
  assert.equal(settlingStart.nominalHeightMm, targetHeightMm);
  assert.equal(settlingStart.thermodynamicState.phase, 'settling');
  assert.equal(settlingMiddle.thermodynamicState.phase, 'settling');
  assert.equal(settlingEnd.thermodynamicState.phase, 'sealed-loaded');
  assert.ok(settlingStart.equilibriumHeightMm > settlingMiddle.equilibriumHeightMm);
  assert.ok(settlingMiddle.equilibriumHeightMm > settlingEnd.equilibriumHeightMm);
  assert.equal(settlingStart.pistonOffsetMm, 0);
  assert.equal(settlingMiddle.pistonOffsetMm, 0);
  assert.equal(settlingEnd.pistonOffsetMm, 0);
  const startAction = action(measurementIndex, 'startAcquisition', 'start');
  assert.deepEqual(frameInside(startAction.startsAtMs, startAction.endsAtMs).operationCue, {
    keys: ['space', 'mouseLeft'],
    mouseAction: 'click',
  });
  const pressing = getPistonOscillationDemoFrame(recordAction.startsAtMs + 500);
  assert.equal(pressing.platformAction, 'press');
  assert.equal(pressing.leftHandSupporting, true);
  assert.ok(pressing.pistonOffsetMm < 0);
  assert.deepEqual(pressing.operationCue, {
    keys: ['space', 'mouseLeft'],
    mouseAction: 'moveDown',
  });
  const recording = getPistonOscillationDemoFrame(recordAction.startsAtMs + 1_800);
  assert.equal(recording.acquisitionPhase, 'recording');
  assert.ok(recording.formalElapsedSeconds > 0);
  assert.equal(recording.operationCue, null);

  const stopAction = action(measurementIndex, 'stopAcquisition', 'stop');
  const stopped = getPistonOscillationDemoFrame(stopAction.endsAtMs);
  assert.equal(stopped.acquisitionPhase, 'stopped');
  assert.equal(stopped.formalElapsedSeconds, PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS);

  const retainAction = action(measurementIndex, 'saveRun', 'retain');
  const retained = getPistonOscillationDemoFrame(retainAction.endsAtMs);
  assert.equal(retained.retainFeedbackVisible, true);
  assert.equal(retained.savedMeasurementCount, measurementIndex + 1);
}

for (const nextMeasurementIndex of [1, 2]) {
  const disconnectStep = step(nextMeasurementIndex, 'disconnect');
  assert.ok(disconnectStep.segments.every(({ focusMode }) => focusMode === 'overview'));
  assert.equal(disconnectStep.segments[1]!.control, 'hose');
  const disconnectAction = action(nextMeasurementIndex, 'disconnect', 'hose');
  const disconnecting = frameInside(disconnectAction.startsAtMs, disconnectAction.endsAtMs, 0.5);
  assert.equal(disconnecting.measurementIndex, nextMeasurementIndex);
  assert.equal(disconnecting.leftHandSupporting, true);
  assert.equal(disconnecting.hoseState, 'disconnected');
  assert.equal(disconnecting.hoseDragging, true);
  assert.ok(disconnecting.hoseGhostProgress > 0 && disconnecting.hoseGhostProgress < 1);
  assert.deepEqual(disconnecting.operationCue, {
    keys: ['space', 'mouseLeft'],
    mouseAction: 'click',
  });
  const disconnected = getPistonOscillationDemoFrame(disconnectAction.endsAtMs);
  assert.equal(disconnected.hoseState, 'disconnected');
  assert.equal(disconnected.acquisitionPhase, 'idle');
}

for (const window of PISTON_OSCILLATION_DEMO_STEP_WINDOWS) {
  const sampledTimes = [
    window.startsAtMs + 1,
    ...window.segments.map((segment) => (
      segment.startsAtMs + (segment.endsAtMs - segment.startsAtMs) / 2
    )),
    window.actionEndsAtMs + 1,
  ];
  for (const sampledTime of sampledTimes) {
    assert.equal(
      getPistonOscillationDemoFrame(sampledTime).operationCue?.keys.includes('shift') ?? false,
      false,
      `demo must not present Shift during ${window.kind}`,
    );
  }
}

const trajectories = [0, 1, 2].map(getPistonOscillationDemoTrajectory);
assert.deepEqual(
  trajectories.map((trajectory) => trajectory.equilibrium.equilibriumHeightM * 1_000),
  [80, 70, 60].map((heightMm) => (
    createPistonOscillationLoadedEquilibriumState(heightMm).equilibriumHeightM * 1_000
  )),
);
assert.deepEqual(
  trajectories.map((trajectory) => trajectory.initialDisplacementM * 1_000),
  [-10.5, -9.8, -9],
);
assert.ok(trajectories.every((trajectory) => trajectory.config.gamma === 1.4));
assert.ok(trajectories.every((trajectory) => trajectory.samples[0]!.pressurePa / 1_000 >= 120));
assert.ok(trajectories.every((trajectory) => trajectory.samples[0]!.pressurePa / 1_000 < 127));
assert.ok(new Set(trajectories.map((trajectory) => trajectory.samples[20].pressurePa)).size > 1);

for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
  const setup = getPistonOscillationDemoFrame(settingsAction.startsAtMs + 100, language);
  assert.match(setup.stepDescription, /1000 Hz.*120 kPa/);
  for (const window of PISTON_OSCILLATION_DEMO_STEP_WINDOWS) {
    const frames = [
      ...window.segments.map((segment) => getPistonOscillationDemoFrame(
        segment.startsAtMs + (segment.endsAtMs - segment.startsAtMs) / 2,
        language,
      )),
      getPistonOscillationDemoFrame(window.actionEndsAtMs + 100, language),
    ];
    const copyFields = frames.flatMap((frame) => [
      frame.stepTarget,
      frame.stepProgressCriterion,
      frame.stepNote,
    ]);
    const maximumFieldLength = language === 'en' ? 86 : 38;
    assert.ok(
      copyFields.every((value) => value.length <= maximumFieldLength),
      `${language} Demo copy for step ${window.stepIndex} must remain compact enough for the fixed overlay`,
    );
    const maximumDescriptionLength = language === 'en' ? 100 : 46;
    assert.ok(
      frames.every((frame) => frame.stepDescription.length <= maximumDescriptionLength),
      `${language} Demo descriptions for every stage of step ${window.stepIndex} must remain compact`,
    );
  }
  const last = getPistonOscillationDemoFrame(PISTON_OSCILLATION_DEMO_DURATION_MS, language);
  assert.equal(last.completed, true);
  assert.equal(last.measurementIndex, 2);
  assert.equal(last.savedMeasurementCount, 3);
  assert.match(last.stepDescription, language === 'en' ? /automatic shutdown/ : /演示模式|演示模式/);
}

const completed = getPistonOscillationDemoFrame(PISTON_OSCILLATION_DEMO_DURATION_MS);
assert.equal(completed.stage, 'observe');
assert.equal(completed.acquisitionPhase, 'stopped');
assert.equal(completed.formalElapsedSeconds, PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS);
assert.match(completed.stepTitle, /演示完成/);
assert.equal(completed.powerOn, false);
assert.equal(completed.powerButtonPressProgress, 0);

console.log('pistonOscillationDemoTimeline tests passed');
