import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS,
  PISTON_OSCILLATION_DEMO_DURATION_MS,
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS,
  PISTON_OSCILLATION_DEMO_OBSERVE_MS,
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

const firstHighlight = getPistonOscillationDemoFrame(
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS + 100,
);
assert.equal(firstHighlight.stage, 'highlight');
assert.equal(firstHighlight.highlightControl, 'settings');
assert.equal(firstHighlight.highlightElapsedSeconds, 0.1);
assert.equal(firstHighlight.virtualKeyboardVisible, false);

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

assert.equal(PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length, 26);
assert.deepEqual(
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.map(({ kind }) => kind),
  [
    'settings',
    'adjustHeight', 'secureAndReconnect', 'restoreFreeMotion', 'startAcquisition',
    'recordOscillation', 'stopAcquisition', 'saveRun',
    'settle', 'disconnect',
    'adjustHeight', 'secureAndReconnect', 'restoreFreeMotion', 'startAcquisition',
    'recordOscillation', 'stopAcquisition', 'saveRun',
    'settle', 'disconnect',
    'adjustHeight', 'secureAndReconnect', 'restoreFreeMotion', 'startAcquisition',
    'recordOscillation', 'stopAcquisition', 'saveRun',
  ],
);
assert.deepEqual(
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS.map(({ measurementIndex }) => measurementIndex),
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
);

for (const window of PISTON_OSCILLATION_DEMO_STEP_WINDOWS) {
  for (const highlightWindow of window.highlightWindows) {
    assert.equal(
      highlightWindow.endsAtMs - highlightWindow.startsAtMs,
      PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
    );
  }
  assert.equal(window.endsAtMs - window.actionEndsAtMs, PISTON_OSCILLATION_DEMO_OBSERVE_MS);
}

for (const measurementIndex of [0, 1, 2]) {
  const targetHeightMm = [80, 70, 60][measurementIndex];
  const heightAction = action(measurementIndex, 'adjustHeight', 'platform');
  const adjusted = getPistonOscillationDemoFrame(heightAction.endsAtMs);
  assert.equal(adjusted.measurementIndex, measurementIndex);
  assert.equal(adjusted.targetHeightMm, targetHeightMm);
  assert.equal(adjusted.equilibriumHeightMm, targetHeightMm);
  assert.equal(adjusted.hoseState, 'disconnected');

  const heightHandoff = frameInside(heightAction.startsAtMs, heightAction.endsAtMs, 0.9);
  assert.equal(heightHandoff.platformAction, 'adjustHeight');
  assert.equal(heightHandoff.leftHandSupporting, true);

  const seal = step(measurementIndex, 'secureAndReconnect');
  assert.deepEqual(
    seal.segments.map(({ stage, control }) => `${stage}:${control}`),
    [
      'highlight:mirrorOutline', 'highlight:screw', 'action:screw', 'preview:null',
      'highlight:hose', 'highlight:hoseSnap', 'action:hose',
    ],
  );
  const connectAction = action(measurementIndex, 'secureAndReconnect', 'hose');
  const connecting = frameInside(connectAction.startsAtMs, connectAction.endsAtMs, 0.5);
  assert.equal(connecting.hoseDragging, true);
  assert.equal(connecting.hoseState, 'disconnected');
  const connected = getPistonOscillationDemoFrame(connectAction.endsAtMs);
  assert.equal(connected.hoseState, 'connected');
  assert.equal(connected.hoseDragging, false);

  const recordAction = action(measurementIndex, 'recordOscillation', 'platform');
  const pressing = getPistonOscillationDemoFrame(recordAction.startsAtMs + 500);
  assert.equal(pressing.platformAction, 'press');
  assert.equal(pressing.leftHandSupporting, true);
  assert.ok(pressing.pistonOffsetMm < 0);
  const recording = getPistonOscillationDemoFrame(recordAction.startsAtMs + 1_800);
  assert.equal(recording.acquisitionPhase, 'recording');
  assert.ok(recording.formalElapsedSeconds > 0);

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
  const disconnectAction = action(nextMeasurementIndex, 'disconnect', 'hose');
  const disconnecting = frameInside(disconnectAction.startsAtMs, disconnectAction.endsAtMs, 0.5);
  assert.equal(disconnecting.measurementIndex, nextMeasurementIndex);
  assert.equal(disconnecting.leftHandSupporting, true);
  assert.equal(disconnecting.hoseState, 'disconnected');
  assert.equal(disconnecting.hoseDragging, true);
  assert.ok(disconnecting.hoseGhostProgress > 0 && disconnecting.hoseGhostProgress < 1);
  const disconnected = getPistonOscillationDemoFrame(disconnectAction.endsAtMs);
  assert.equal(disconnected.hoseState, 'disconnected');
  assert.equal(disconnected.acquisitionPhase, 'idle');
}

const trajectories = [0, 1, 2].map(getPistonOscillationDemoTrajectory);
assert.deepEqual(trajectories.map((trajectory) => trajectory.equilibrium.equilibriumHeightM * 1_000), [80, 70, 60]);
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
  const last = getPistonOscillationDemoFrame(PISTON_OSCILLATION_DEMO_DURATION_MS, language);
  assert.equal(last.completed, true);
  assert.equal(last.measurementIndex, 2);
  assert.equal(last.savedMeasurementCount, 3);
  assert.match(last.stepDescription, language === 'en' ? /Demo mode ends here/ : /演示模式|演示模式/);
}

const completed = getPistonOscillationDemoFrame(PISTON_OSCILLATION_DEMO_DURATION_MS);
assert.equal(completed.stage, 'observe');
assert.equal(completed.acquisitionPhase, 'stopped');
assert.equal(completed.formalElapsedSeconds, PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS);
assert.match(completed.stepTitle, /演示完成/);

console.log('pistonOscillationDemoTimeline tests passed');
