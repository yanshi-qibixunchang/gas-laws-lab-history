import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultPistonOscillationGuideSession,
  type PistonOscillationGuideStep,
} from '../../src/domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  getPistonOscillationGuideHeightResetPresentation,
  getPistonOscillationGuideInstrumentRestoreState,
  getPistonOscillationGuideRequestedFocusMode,
  resolvePistonOscillationGuideHeightSnap,
  getPistonOscillationGuideStrongContextKind,
  getPistonOscillationGuideStrongTargetId,
} from '../../src/features/pistonOscillation/pistonOscillationGuidePresentation.ts';

assert.deepEqual(
  resolvePistonOscillationGuideHeightSnap(71.9, 70, false),
  { heightMm: 70, snapped: true },
  'Guide height drag should capture within ±2 mm',
);
assert.deepEqual(
  resolvePistonOscillationGuideHeightSnap(72.01, 70, false),
  { heightMm: 72.01, snapped: false },
  'Guide height drag should remain continuous outside the capture range',
);
assert.deepEqual(
  resolvePistonOscillationGuideHeightSnap(72.9, 70, true),
  { heightMm: 70, snapped: true },
  'an acquired Guide height should remain snapped through the ±3 mm release range',
);
assert.deepEqual(
  resolvePistonOscillationGuideHeightSnap(73.01, 70, true),
  { heightMm: 73.01, snapped: false },
  'dragging beyond ±3 mm should release the Guide-only snap',
);
assert.deepEqual(
  resolvePistonOscillationGuideHeightSnap(69.4, null, false),
  { heightMm: 69.4, snapped: false },
  'free or non-height steps should retain the continuous physical height',
);

for (const step of [
  'parameterSetup',
  'hoseReconnect',
  'crossRunDisconnect',
  'completed',
] satisfies PistonOscillationGuideStep[]) {
  assert.equal(
    getPistonOscillationGuideRequestedFocusMode(step),
    'overview',
    `${step} should automatically use the overview`,
  );
}

for (const step of ['powerOn', 'powerOff'] satisfies PistonOscillationGuideStep[]) {
  assert.equal(getPistonOscillationGuideRequestedFocusMode(step), 'powerFocus');
  assert.equal(getPistonOscillationGuideStrongTargetId(step, 'readingHeight'), 'powerButton');
}

for (const step of [
  'firstHeightAdjustment',
  'screwLock',
  'screwLoosen',
  'acquisitionReady',
  'waitingTrigger',
  'recording',
  'pauseAvailable',
  'curveFrozen',
  'awaitingSaveOrRedo',
  'nextHeightAdjustment',
] satisfies PistonOscillationGuideStep[]) {
  assert.equal(
    getPistonOscillationGuideRequestedFocusMode(step),
    'pistonFocus',
    `${step} should automatically use piston focus`,
  );
}

assert.equal(
  getPistonOscillationGuideStrongTargetId('firstHeightAdjustment', 'readingHeight', false),
  'platform',
);
assert.equal(
  getPistonOscillationGuideStrongTargetId('firstHeightAdjustment', 'readingHeight', true),
  'heightStageAction',
);
assert.equal(
  getPistonOscillationGuideStrongTargetId('screwLock', 'readingHeight'),
  'operationMirror',
);
assert.equal(
  getPistonOscillationGuideStrongTargetId('hoseReconnect', 'readingHeight'),
  'hoseReconnect',
);
assert.equal(
  getPistonOscillationGuideStrongTargetId('crossRunDisconnect', 'readingHeight'),
  'hoseDisconnect',
);
assert.equal(getPistonOscillationGuideStrongTargetId('acquisitionReady', 'readingHeight'), 'primary');
assert.equal(getPistonOscillationGuideStrongTargetId('pauseAvailable', 'readingHeight'), 'primary');
assert.equal(getPistonOscillationGuideStrongTargetId('awaitingSaveOrRedo', 'readingHeight'), 'save');
assert.equal(getPistonOscillationGuideStrongTargetId('recording', 'readingHeight'), null);
assert.equal(getPistonOscillationGuideStrongContextKind('platform'), 'scaleMirror');
assert.equal(getPistonOscillationGuideStrongContextKind('heightStageAction'), 'scaleMirror');
assert.equal(getPistonOscillationGuideStrongContextKind('operationMirror'), 'mainScrew');
assert.equal(getPistonOscillationGuideStrongContextKind('hoseDisconnect'), null);
assert.equal(getPistonOscillationGuideStrongContextKind('hoseReconnect'), null);
assert.equal(getPistonOscillationGuideStrongContextKind('primary'), null);
assert.deepEqual(
  getPistonOscillationGuideHeightResetPresentation({
    reason: 'supportLost',
    phase: 'resetting',
    targetHeightMm: 80,
    startedHeightMm: 74,
  }),
  {
    focusMode: 'pistonFocus',
    heightAdjustmentStage: 'readingHeight',
    strongTargetId: 'platform',
  },
);

const activeSession = {
  ...createDefaultPistonOscillationGuideSession(),
  status: 'active' as const,
  startedAtMs: 1,
  updatedAtMs: 1,
};
assert.equal(
  getPistonOscillationGuideStrongTargetId(
    'periodProcessing',
    'readingHeight',
    false,
    activeSession,
    false,
  ),
  'periodTool',
);
assert.equal(
  getPistonOscillationGuideStrongTargetId(
    'periodProcessing',
    'readingHeight',
    false,
    activeSession,
    true,
  ),
  'periodChart',
);
assert.deepEqual(
  getPistonOscillationGuideInstrumentRestoreState({
    ...activeSession,
    step: 'crossRunDisconnect',
    measurementIndex: 1,
  }),
  {
    hoseState: 'connected',
    equilibriumHeightMm: 80,
    lockingScrewProgress: 0,
    powerOn: false,
  },
  'refreshing Run 2 disconnect should restore the connected hose and saved 80 mm checkpoint',
);
assert.deepEqual(
  getPistonOscillationGuideInstrumentRestoreState({
    ...activeSession,
    step: 'nextHeightAdjustment',
    measurementIndex: 1,
  }),
  {
    hoseState: 'disconnected',
    equilibriumHeightMm: 0,
    lockingScrewProgress: 0,
    powerOn: false,
  },
  'refreshing a cross-Run height adjustment should restore a safe zero-height retry without inventing another support-loss event',
);
assert.deepEqual(
  getPistonOscillationGuideInstrumentRestoreState({
    ...activeSession,
    step: 'hoseReconnect',
    measurementIndex: 1,
  }),
  {
    hoseState: 'disconnected',
    equilibriumHeightMm: 70,
    lockingScrewProgress: 1,
    powerOn: false,
  },
  'refreshing after screw lock should preserve the functionally locked checkpoint',
);
assert.deepEqual(
  getPistonOscillationGuideInstrumentRestoreState({
    ...activeSession,
    step: 'nextHeightAdjustment',
    measurementIndex: 2,
    heightReset: {
      reason: 'supportLost',
      phase: 'explaining',
      targetHeightMm: 60,
      startedHeightMm: 46,
    },
  }),
  {
    hoseState: 'disconnected',
    equilibriumHeightMm: 0,
    lockingScrewProgress: 0,
    powerOn: false,
  },
  'refreshing a frozen recovery explanation should keep the platform at its completed reset position',
);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);
const workbenchCss = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.css'),
  'utf8',
);
const sceneSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationInstrumentScene.tsx'),
  'utf8',
);
const workspaceSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationInteractionWorkspace.tsx',
  ),
  'utf8',
);
const workspaceCss = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationInteractionWorkspace.css',
  ),
  'utf8',
);

assert.match(workbenchSource, /PISTON_OSCILLATION_GUIDE_STRONG_REMINDER_DELAY_MS\s*=\s*\n?\s*GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS/);
assert.match(workbenchSource, /data-piston-guide-strong-mask-blocking="true"/);
assert.match(workbenchSource, /guideRequestedFocusMode=\{pistonGuideRequestedFocusMode\}/);
assert.match(sceneSource, /guideRequestedFocusMode=\{guideRequestedFocusMode\}/);
assert.match(
  workspaceSource,
  /if \(!guideRequestedFocusMode \|\| demoActive \|\| screwDragging\) return/,
  'the Guide camera should follow the current step without interrupting an active screw gesture',
);
assert.doesNotMatch(
  workspaceSource,
  /if \(!guideRequestedFocusMode[^\n]*guideInteractionPaused/,
  'time-frozen Guide interactions must not block restoration of the current step camera and operation mirror',
);
assert.doesNotMatch(workbenchCss, /\.studio-piston-guide-strong-mask \* \{[\s\S]*pointer-events: none !important;/);
assert.match(workbenchCss, /\.studio-piston-guide-strong-mask \.studio-heat-guide-strong-dim \{\s*\n\s*pointer-events: auto;/);
assert.match(
  workbenchSource,
  /const scaleX = rootRect\.width \/ localWidth;[\s\S]*const scaleY = rootRect\.height \/ localHeight;[\s\S]*querySelectorAll<HTMLElement>\('\.studio-dock-header'\)[\s\S]*const dockHeaderBottom = Math\.max[\s\S]*root\.classList\.contains\('studio-live-workspace-piston-processing'\)[\s\S]*\? 0[\s\S]*: dockHeaderBottom[\s\S]*contextCutouts[\s\S]*getPistonOscillationGuideStrongContextKind/,
  'the strong mask should convert scaled workspace coordinates, cover the complete processing workspace, preserve instrument mode headers, and retain target context cutouts',
);
assert.doesNotMatch(
  workbenchSource,
  /operationVisualizationToggleCutout/,
  'the operation-visualization switch must sit above the Guide wall instead of becoming an SVG hole',
);
assert.match(
  workbenchSource,
  /targetId === 'hoseDisconnect' \|\| targetId === 'hoseReconnect'[\s\S]*pistonFocusHoseConnectedHandle[\s\S]*pistonFocusHoseDetachedHandle[\s\S]*projectedBoundsCutout/,
  'hose reminders should use one projected connector-plus-near-hose handle for the step-specific endpoint',
);
assert.doesNotMatch(
  workbenchSource,
  /contextKind === 'hosePath'|pistonFocusHoseConnectedX|pistonFocusHoseDetachedX/,
  'hose reminders must not restore the old two-endpoint bounding rectangle context',
);
assert.doesNotMatch(
  workbenchSource,
  /protectedContextSelectors|contextCutouts\.push\(protectedCutout\)/,
  'overlay panels should sit above the reminder wall instead of becoming SVG holes',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-overlay-layer\s*\{\s*z-index:\s*auto;[\s\S]*\.studio-preview-overlay-slot-top-left,[\s\S]*\.studio-preview-overlay-slot-top-right,[\s\S]*\.studio-preview-overlay-slot-bottom-left[\s\S]*z-index:\s*36;[\s\S]*\.studio-preview-overlay-slot-bottom-right\s*\{\s*z-index:\s*34;/,
  'presentation panels should sit above the z-index 35 Guide wall while the focus action panel remains gated below it',
);
assert.match(
  workbenchCss,
  /\.studio-piston-guide-strong-mask\s*\{[\s\S]*z-index:\s*auto;[\s\S]*> \.studio-heat-guide-strong-cutout-svg\s*\{[\s\S]*z-index:\s*35;[\s\S]*> \.studio-heat-guide-strong-card\s*\{[\s\S]*z-index:\s*37;[\s\S]*\.studio-live-workspace\[data-piston-guide-strong-active='true'\][\s\S]*\.studio-dock-panel-realtime,[\s\S]*\.studio-live-workspace-resizer,[\s\S]*\.studio-optional-panels[\s\S]*z-index:\s*36;/,
  'the strong wall should gate only the instrument and focus controls while main workspace panels and its reminder card remain above it',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-overlay-layer[\s\S]*\.studio-preview-overlay-slot\s*> \*\s*\{\s*pointer-events:\s*none;[\s\S]*\.piston-operation-visualization-toggle-shell\.is-visible,[\s\S]*\.piston-focus-interaction-parent-top-right-panel[\s\S]*> \*,[\s\S]*\.piston-oscillation-view-reset,[\s\S]*\.piston-focus-interaction-focus-panel\s*\{\s*pointer-events:\s*auto;/,
  'piston overlays should explicitly opt interactive surfaces in so CSS bundle order cannot create transparent pointer blockers',
);
assert.match(
  workbenchSource,
  /getPistonOscillationGuideStrongDimPath[\s\S]*contextCutouts\.map\(getPistonOscillationGuideRoundedRectPath\)[\s\S]*data-piston-guide-strong-mask-blocking="true"[\s\S]*fillRule="evenodd"[\s\S]*studio-piston-guide-strong-card-compact/,
  'the reminder should block the dimmed region while adapting its card around all protected context regions',
);
assert.match(
  workbenchSource,
  /renderedStrongCard[\s\S]*renderedStrongCardHeight = renderedStrongCard\?\.offsetHeight[\s\S]*cardWidth = Math\.min\(compact \? 232 : 340[\s\S]*estimatedCardHeight = compact \? 168 : 112[\s\S]*Math\.max\(estimatedCardHeight, renderedStrongCardHeight\)/,
  'strong-reminder placement should reserve a conservative card height and then honor the actual rendered copy height',
);
assert.match(
  workbenchSource,
  /const protectedObstacles = obstacleSelectors[\s\S]*const obstacles = \[\.\.\.protectedObstacles\][\s\S]*chooseCard\(true, protectedObstacles\)/,
  'when no fully empty slot exists, the compact reminder may yield to its scene target but must still preserve every panel obstacle',
);
assert.match(
  workbenchCss,
  /\.studio-piston-guide-lesson-layer\s*\{[\s\S]*--studio-overlay-enter-duration:\s*180ms;[\s\S]*--studio-overlay-motion-ease:\s*cubic-bezier\(0\.2, 0, 0, 1\);[\s\S]*top:\s*36px;[\s\S]*z-index:\s*37;/,
  'the piston lesson layer should remain above viewport feedback while leaving the top mode controls outside its blocking backdrop',
);

console.log('pistonOscillationGuidePresentation.test.ts passed');
