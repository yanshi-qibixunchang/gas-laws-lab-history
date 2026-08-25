import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS,
  PISTON_OSCILLATION_DEMO_DURATION_MS,
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS,
  PISTON_OSCILLATION_DEMO_OBSERVE_MS,
  PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS,
  getPistonOscillationDemoFrame,
} from '../../src/features/pistonOscillation/pistonOscillationDemoTimeline.ts';

const frameInside = (startsAtMs: number, endsAtMs: number, fraction = 0.5) => (
  getPistonOscillationDemoFrame(startsAtMs + (endsAtMs - startsAtMs) * fraction)
);

const initial = getPistonOscillationDemoFrame(0);
assert.equal(initial.equilibriumHeightMm, 0);
assert.equal(initial.hoseState, 'disconnected');
assert.equal(initial.hoseDragging, false);
assert.equal(initial.hoseGhostProgress, 0);
assert.equal(initial.hoseWithinMagneticRange, false);
assert.equal(initial.lockingScrewProgress, 0);
assert.equal(initial.sampleRateInput, '');
assert.equal(initial.triggerInput, '');
assert.equal(initial.stage, 'reset');
assert.equal(initial.highlightControl, null);
assert.equal(initial.highlightElapsedSeconds, 0);
assert.equal(initial.activeControl, null);

const firstHighlight = getPistonOscillationDemoFrame(
  PISTON_OSCILLATION_DEMO_INITIAL_DELAY_MS + 100,
);
assert.equal(firstHighlight.stage, 'highlight');
assert.equal(firstHighlight.highlightControl, 'settings');
assert.equal(firstHighlight.highlightElapsedSeconds, 0.1);
assert.equal(firstHighlight.activeControl, null);
assert.equal(firstHighlight.sampleRateInput, '');
assert.equal(firstHighlight.triggerInput, '');

const firstActionWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS[0].actionWindows[0];
const firstAction = frameInside(firstActionWindow.startsAtMs, firstActionWindow.endsAtMs, 0.1);
assert.equal(firstAction.stage, 'action');
assert.equal(firstAction.highlightControl, null);
assert.equal(firstAction.highlightElapsedSeconds, 0);
assert.equal(firstAction.activeControl, 'settings');

for (const stepWindow of PISTON_OSCILLATION_DEMO_STEP_WINDOWS) {
  for (const highlightWindow of stepWindow.highlightWindows) {
    assert.equal(
      highlightWindow.endsAtMs - highlightWindow.startsAtMs,
      PISTON_OSCILLATION_DEMO_PRE_HIGHLIGHT_MS,
    );
  }
  assert.equal(
    stepWindow.endsAtMs - stepWindow.actionEndsAtMs,
    PISTON_OSCILLATION_DEMO_OBSERVE_MS,
  );
}
assert.equal(PISTON_OSCILLATION_DEMO_STEP_WINDOWS.length, 8);

for (const stepWindow of PISTON_OSCILLATION_DEMO_STEP_WINDOWS.slice(0, -1)) {
  const preview = getPistonOscillationDemoFrame(stepWindow.actionEndsAtMs + 100);
  assert.equal(preview.stage, 'preview');
  assert.equal(preview.stepIndex, stepWindow.stepIndex + 1);
  assert.match(preview.stepDescription, /^下一步：/);
  assert.equal(preview.highlightControl, null);
  assert.equal(preview.highlightElapsedSeconds, 0);
  assert.equal(preview.activeControl, null);
}
const finalWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS.at(-1)!;
const finalObserve = getPistonOscillationDemoFrame(finalWindow.actionEndsAtMs + 100);
assert.equal(finalObserve.stage, 'observe');
assert.equal(finalObserve.stepIndex, 8);
assert.match(finalObserve.stepDescription, /^观察：/);

const sealWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS[2];
assert.deepEqual(
  sealWindow.segments.map(({ stage, control }) => `${stage}:${control}`),
  [
    'highlight:mirrorOutline',
    'highlight:screw',
    'action:screw',
    'preview:null',
    'highlight:hose',
    'highlight:hoseSnap',
    'action:hose',
  ],
);
assert.deepEqual(
  sealWindow.highlightWindows.map(({ control }) => control),
  ['mirrorOutline', 'screw', 'hose', 'hoseSnap'],
);
assert.deepEqual(
  sealWindow.actionWindows.map(({ control }) => control),
  ['screw', 'hose'],
);
assert.deepEqual(
  PISTON_OSCILLATION_DEMO_STEP_WINDOWS[3].highlightWindows.map(({ control }) => control),
  ['screw'],
);

const mirrorHighlight = frameInside(
  sealWindow.highlightWindows[0].startsAtMs,
  sealWindow.highlightWindows[0].endsAtMs,
);
assert.equal(mirrorHighlight.highlightControl, 'mirrorOutline');
assert.equal(mirrorHighlight.focusMode, 'pistonFocus');

const screwHighlight = frameInside(
  sealWindow.highlightWindows[1].startsAtMs,
  sealWindow.highlightWindows[1].endsAtMs,
);
assert.equal(screwHighlight.highlightControl, 'screw');
assert.equal(screwHighlight.focusMode, 'pistonFocus');

const screwLockAction = frameInside(
  sealWindow.actionWindows[0].startsAtMs,
  sealWindow.actionWindows[0].endsAtMs,
);
assert.equal(screwLockAction.stage, 'action');
assert.equal(screwLockAction.activeControl, 'screw');
assert.ok(screwLockAction.lockingScrewProgress > 0);
assert.equal(screwLockAction.hoseState, 'disconnected');

const screwSettledWindow = sealWindow.segments[3];
assert.equal(screwSettledWindow.stage, 'preview');
assert.equal(
  screwSettledWindow.endsAtMs - screwSettledWindow.startsAtMs,
  PISTON_OSCILLATION_DEMO_OBSERVE_MS,
);
const screwSettled = frameInside(
  screwSettledWindow.startsAtMs,
  screwSettledWindow.endsAtMs,
);
assert.equal(screwSettled.stage, 'preview');
assert.equal(screwSettled.stepIndex, 3);
assert.equal(screwSettled.highlightControl, null);
assert.equal(screwSettled.highlightElapsedSeconds, 0);
assert.equal(screwSettled.activeControl, null);
assert.equal(
  screwSettled.stepDescription,
  '下一步：用右手（鼠标左键）将软管接头拖入磁吸范围',
);
assert.match(
  getPistonOscillationDemoFrame(screwSettledWindow.startsAtMs, 'zh-TW').stepDescription,
  /右手（滑鼠左鍵）/,
);
assert.match(
  getPistonOscillationDemoFrame(screwSettledWindow.startsAtMs, 'en').stepDescription,
  /right hand \(left mouse button\)/,
);

const hoseHighlight = frameInside(
  sealWindow.highlightWindows[2].startsAtMs,
  sealWindow.highlightWindows[2].endsAtMs,
);
assert.equal(hoseHighlight.highlightControl, 'hose');
assert.equal(hoseHighlight.focusMode, 'overview');
assert.equal(hoseHighlight.lockingScrewProgress, 1);

const hoseSnapHighlight = frameInside(
  sealWindow.highlightWindows[3].startsAtMs,
  sealWindow.highlightWindows[3].endsAtMs,
);
assert.equal(hoseSnapHighlight.highlightControl, 'hoseSnap');
assert.equal(hoseSnapHighlight.focusMode, 'overview');

const hoseActionWindow = sealWindow.actionWindows[1];
const earlyHoseDrag = frameInside(hoseActionWindow.startsAtMs, hoseActionWindow.endsAtMs, 0.25);
assert.equal(earlyHoseDrag.stage, 'action');
assert.equal(earlyHoseDrag.activeControl, 'hose');
assert.equal(earlyHoseDrag.hoseDragging, true);
assert.equal(earlyHoseDrag.hoseState, 'disconnected');
assert.ok(earlyHoseDrag.hoseGhostProgress > 0);
assert.equal(earlyHoseDrag.hoseWithinMagneticRange, false);

const lateHoseDrag = frameInside(hoseActionWindow.startsAtMs, hoseActionWindow.endsAtMs, 0.85);
assert.equal(lateHoseDrag.hoseDragging, true);
assert.equal(lateHoseDrag.hoseState, 'disconnected');
assert.equal(lateHoseDrag.hoseWithinMagneticRange, true);
assert.ok(lateHoseDrag.hoseGhostProgress < 1);

const connected = getPistonOscillationDemoFrame(hoseActionWindow.endsAtMs);
assert.equal(connected.hoseState, 'connected');
assert.equal(connected.hoseDragging, false);
assert.equal(connected.hoseGhostProgress, 1);
assert.equal(connected.hoseWithinMagneticRange, true);
assert.equal(connected.lockingScrewProgress, 1);

const configured = getPistonOscillationDemoFrame(firstActionWindow.endsAtMs);
assert.equal(configured.sampleRateInput, '1000');
assert.equal(configured.triggerInput, '105');

const heightActionWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS[1].actionWindows[0];
const raised = getPistonOscillationDemoFrame(heightActionWindow.endsAtMs);
assert.equal(raised.equilibriumHeightMm, 80);
assert.equal(raised.hoseState, 'disconnected');
for (const [language, leftHand, rightHand] of [
  ['zh-CN', '左手（Space）', '右手（鼠标左键）'],
  ['zh-TW', '左手（Space）', '右手（滑鼠左鍵）'],
  ['en', 'left hand (Space)', 'right hand (left mouse button)'],
] as const) {
  const localizedFrame = getPistonOscillationDemoFrame(
    heightActionWindow.startsAtMs + 100,
    language,
  );
  assert.match(localizedFrame.stepDescription, new RegExp(leftHand.replace(/[()]/g, '\\$&')));
  assert.match(localizedFrame.stepDescription, new RegExp(rightHand.replace(/[()]/g, '\\$&')));
}

const oscillationActionWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS[5].actionWindows[0];
const recording = getPistonOscillationDemoFrame(oscillationActionWindow.startsAtMs + 2_500);
assert.equal(recording.acquisitionPhase, 'recording');
assert.ok(recording.formalElapsedSeconds > 0);
assert.ok(Math.abs(recording.pistonOffsetMm) < 12);

const frozenRecording = getPistonOscillationDemoFrame(oscillationActionWindow.endsAtMs + 2_500);
assert.equal(frozenRecording.acquisitionPhase, 'recording');
assert.equal(
  frozenRecording.formalElapsedSeconds,
  PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS,
);

const stopActionWindow = PISTON_OSCILLATION_DEMO_STEP_WINDOWS[6].actionWindows[0];
const stopped = getPistonOscillationDemoFrame(stopActionWindow.endsAtMs);
assert.equal(stopped.acquisitionPhase, 'stopped');
assert.equal(stopped.formalElapsedSeconds, PISTON_OSCILLATION_DEMO_CAPTURE_SECONDS);

const completed = getPistonOscillationDemoFrame(PISTON_OSCILLATION_DEMO_DURATION_MS);
assert.equal(completed.completed, true);
assert.equal(completed.stage, 'observe');
assert.equal(completed.retainFeedbackVisible, true);
assert.equal(completed.acquisitionPhase, 'stopped');

console.log('pistonOscillationDemoTimeline tests passed');
