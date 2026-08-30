import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS,
  PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA,
} from '../../src/features/pistonOscillation/pistonOscillationFocusViews.ts';
import { getPistonOscillationShellCopy } from '../../src/features/pistonOscillation/pistonOscillationCopy.ts';
import {
  getPistonOscillationGuideScrewInteractionMode,
  resolvePistonOscillationGuideScrewDelta,
  resolvePistonOscillationGuideScrewFeedback,
} from '../../src/features/pistonOscillation/pistonOscillationGuideScrewInteraction.ts';
import { PISTON_LOCKING_SCREW_LOCK_THRESHOLD } from '../../src/features/pistonOscillation/pistonOscillationModelMotion.ts';

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
const overlayMotionSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'usePreviewOverlayMotion.ts'),
  'utf8',
);
const interactiveModelSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationInteractiveModel.tsx',
  ),
  'utf8',
);
const instrumentSceneSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationInstrumentScene.tsx',
  ),
  'utf8',
);
const workbenchSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'workbench',
    'WorkbenchStudioPrototype.tsx',
  ),
  'utf8',
);

const getSourceSection = (
  source: string,
  startMarker: string,
  endMarker: string,
) => {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  assert.notEqual(startIndex, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${endMarker}`);
  return source.slice(startIndex, endIndex);
};

assert.deepEqual(PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA, {
  viewport: { width: 796, height: 500 },
  position: [0.4494, 0.3765, 0.7484],
  target: [0.0669, 0.1044, -0.0182],
  fov: 38,
  zoom: 1,
  near: 0.001,
  far: 20,
});
assert.deepEqual(PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS.pistonFocus, {
  viewport: { width: 796, height: 500 },
  position: [0.3316, 0.4623, 0.3395],
  target: [0.1474, 0.3517, 0.0657],
  fov: 38,
  zoom: 1,
  near: 0.001,
  far: 20,
});
assert.deepEqual(PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS.hoseFocus, {
  viewport: { width: 796, height: 500 },
  position: [0.4445, 0.437, 0.6353],
  target: [0.2192, 0.126, 0.099],
  fov: 38,
  zoom: 1,
  near: 0.001,
  far: 20,
});
assert.deepEqual(PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS.screwOperationView, {
  viewport: { width: 186, height: 249 },
  position: [0.3238, 0.308, 0.0752],
  target: [0.1594, 0.3044, 0.0746],
  fov: 32,
  zoom: 1,
  near: 0.001,
  far: 20,
});
assert.match(
  workspaceSource,
  /cameraPreset === 'overview'[\s\S]*PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA/,
  'the formal default view must use the software-size camera values confirmed by the user',
);
assert.match(
  workspaceSource,
  /offsetPistonOscillationOverviewPoseForHeight[\s\S]*heightOffsetM = clampPistonEquilibriumHeightMm\(heightMm\) \/ 1000[\s\S]*position: \[pose\.position\[0\], pose\.position\[1\] \+ heightOffsetM[\s\S]*target: \[pose\.target\[0\], pose\.target\[1\] \+ heightOffsetM/,
  'every overview preset must preserve framing by applying a one-to-one vertical height offset',
);
assert.match(
  workspaceSource,
  /const enterOverview = useCallback[\s\S]*setOverviewFramingHeightMm\(pistonEquilibriumHeightMmRef\.current\)[\s\S]*setOverviewPoseRevision[\s\S]*setMode\('overview'\)/,
  'leaving focus or restoring the overview must snapshot the current piston height and reapply the camera',
);

assert.match(workspaceSource, /data-piston-oscillation-interaction-workspace="true"/);
assert.doesNotMatch(
  workspaceSource,
  /virtualHandReferenceDragPxRef\.current = normalizedReferenceDragPx;[\s\S]{0,180}advanceVirtualHandPressTo\(observedAtMs\)/,
  'pointer events should only update the hand target; the animation clock owns the single physical advance',
);
assert.equal(
  (workspaceSource.match(/onLivePhysicalStateChange\(\{/g) ?? []).length,
  1,
  'the live sensor should publish once per animation clock rather than once again after each React commit',
);
assert.match(
  workspaceSource,
  /const PISTON_LIVE_PRESENTATION_INTERVAL_MS = 1_000 \/ 60;[\s\S]*const publishSensorClock[\s\S]*observedAtMs - lastPublishedAtMs[\s\S]*PISTON_LIVE_PRESENTATION_INTERVAL_MS[\s\S]*const advancePressThermalClock[\s\S]*observedAtMs - previousUpdatedAtMs[\s\S]*PISTON_LIVE_PRESENTATION_INTERVAL_MS/,
  'high-refresh displays must not make the interaction and pressure UI render faster than 60 Hz',
);
assert.match(workspaceSource, /data-piston-focus-operation-mirror="true"/);
assert.match(workspaceSource, /data-piston-focus-exit-panel="true"/);
assert.match(
  workspaceSource,
  /createPistonOscillationPointerEvents[\s\S]*getBoundingClientRect\(\)[\s\S]*state\.pointer\.set[\s\S]*state\.raycaster\.setFromCamera[\s\S]*events=\{createPistonOscillationPointerEvents\}/,
  'the piston scene should use the same canvas-relative pointer mapping strategy as the stable heat-capacity scene',
);
assert.match(
  workspaceSource,
  /usePreviewOverlayMotion[\s\S]*data-preview-overlay-layer="piston-oscillation"[\s\S]*studio-preview-overlay-slot-bottom-left[\s\S]*studio-preview-overlay-slot-bottom-right/,
  'piston hints and focus controls should use the shared responsive overlay layer and corner slots',
);
assert.match(
  workspaceSource,
  /overlayTopRight\?: ReactNode;[\s\S]*const overlayTopRightPresent = overlayTopRight !== undefined && overlayTopRight !== null;[\s\S]*parentTopRightPanelMode[\s\S]*displayedOverlayTopRightRef[\s\S]*if \(overlayTopRightPresent\)[\s\S]*setParentTopRightPanelMode\('visible'\)[\s\S]*setParentTopRightPanelMode\('exiting'\)[\s\S]*window\.setTimeout\([\s\S]*setParentTopRightPanelMode\('hidden'\)[\s\S]*\}, 160\)/,
  'the parent Guide overlay should enter, remain mounted for its exit class, and unmount after the shared exit duration',
);
assert.match(
  workspaceSource,
  /layoutRevision:[\s\S]*demoStepPanelMode,[\s\S]*effectiveParentTopRightPanelMode,[\s\S]*studio-preview-overlay-slot-top-right[\s\S]*piston-focus-interaction-parent-top-right-panel-\$\{effectiveParentTopRightPanelMode\}[\s\S]*data-preview-overlay-item="piston-parent-top-right"[\s\S]*displayedOverlayTopRightRef\.current[\s\S]*displayedDemoFrame/,
  'the injected Guide and built-in top-right overlays should share one slot and expose a stable FLIP key',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-parent-top-right-panel-visible\s*\{[\s\S]*studioOverlayEnterRight[\s\S]*\.piston-focus-interaction-parent-top-right-panel-exiting\s*\{[\s\S]*studioOverlayExitRight[\s\S]*\.piston-focus-interaction-parent-top-right-panel \.studio-piston-guide-step-panel\s*\{[\s\S]*animation:\s*none;/,
  'the injected panel should use the shared right-side entry and exit classes without replaying its own panel animation',
);
assert.match(
  workspaceCss,
  /\[data-piston-demo-step-panel='true'\]\s*\{[\s\S]*width:\s*min\(340px, 100%\);[\s\S]*gap:\s*5px;[\s\S]*padding:\s*9px 12px;[\s\S]*line-height:\s*1\.3;/,
  'the Piston-only Demo panel should use the wider compact layout without resizing shared Heat or Guide panels',
);
assert.match(
  overlayMotionSource,
  /const OVERLAY_MOTION_DURATION_MS = 200;[\s\S]*querySelectorAll<HTMLElement>\('\[data-preview-overlay-item\]'\)[\s\S]*const deltaX = previousRect\.left - nextRect\.left;[\s\S]*const deltaY = previousRect\.top - nextRect\.top;[\s\S]*item\.animate\([\s\S]*translate3d\(\$\{deltaX\}px, \$\{deltaY\}px, 0\)[\s\S]*duration: OVERLAY_MOTION_DURATION_MS/,
  'the shared overlay hook should retain its 200 ms FLIP displacement contract',
);
assert.match(
  workspaceSource,
  /studio-heat-interaction-hints[\s\S]*studio-heat-focus-panel[\s\S]*studio-heat-focus-title[\s\S]*studio-heat-focus-panel-actions-single/,
  'piston focus UI should reuse the stable experiment panel hierarchy and controls',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-focus-panel\s*\{[\s\S]*width:\s*min\(320px, 100%\);[\s\S]*\.piston-focus-interaction-focus-panel \.studio-heat-focus-grid,[\s\S]*\.piston-focus-interaction-focus-panel \.studio-heat-focus-panel-actions:not\([\s\S]*\.studio-heat-focus-panel-actions-single[\s\S]*\)\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
  'the piston focus panel should be capped at 320 px and keep its data and action layouts in two equal columns',
);
assert.match(
  workspaceCss,
  /\[data-preview-overlay-item='piston-focus-panel'\]\s*\{[\s\S]*display:\s*flex;[\s\S]*width:\s*100%;[\s\S]*justify-content:\s*flex-end;[\s\S]*pointer-events:\s*none;/,
  'the focus-panel wrapper must keep the panel right-anchored while passing pointer input through to the platform at 60 mm',
);
assert.match(
  workspaceSource,
  /studio-heat-focus-panel-row studio-piston-focus-hand-status-row[\s\S]*data-piston-focus-piston-status="true"/,
  'the localized two-hand status should expose a dedicated compact panel row',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-focus-panel \.studio-piston-focus-hand-status-row\s*\{[\s\S]*grid-column:\s*1 \/ -1;[\s\S]*\.studio-piston-focus-hand-status-row strong\s*\{[\s\S]*white-space:\s*normal;/,
  'the two-hand status should use the full panel width instead of changing the panel anchor through max-content sizing',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-focus-panel \.studio-heat-focus-panel-row > span,[\s\S]*\.piston-focus-interaction-focus-panel \.studio-heat-focus-panel-actions button\s*\{[\s\S]*min-width:\s*0;[\s\S]*white-space:\s*nowrap;/,
  'focus labels and action buttons should remain on one line inside the compact panel',
);
assert.match(
  workspaceSource,
  /FOCUS_TRANSITION_DURATION_MS = 360[\s\S]*1 - \(\(1 - progress\) \*\* 3\)/,
  'piston focus transitions should match the stable experiment camera duration and easing',
);
assert.match(
  workspaceSource,
  /enabled=\{[\s\S]*!transitionActive &&[\s\S]*!demoActive &&[\s\S]*!guideInteractionPaused &&[\s\S]*!hoseHovered &&[\s\S]*!hoseDragging &&[\s\S]*!focusActive[\s\S]*\}/,
  'focus views must keep the main camera locked while the overview remains freely inspectable',
);
assert.match(
  workspaceSource,
  /setMode\('overview'\)/,
  'the lower-right focus panel must be able to return to the free overview',
);
assert.match(
  workspaceSource,
  /name="HIT_PistonLockingScrew_OperationMirror"[\s\S]*gesture:\s*'circular_drag'[\s\S]*onPointerDown=[\s\S]*setPointerCapture[\s\S]*onPointerMove=[\s\S]*normalizeAngleDelta[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS/,
  'the operation mirror should expose a circular drag target tied to the reviewed screw travel',
);
assert.match(
  interactiveModelSource,
  /PISTON_OSCILLATION_LOCKING_SCREW_TURNS = 3;[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_TRAVEL_M = 0\.004;[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS = 3;/,
  'the locking screw should double only axial travel while preserving visible rotation and gesture turns',
);
assert.match(
  interactiveModelSource,
  /pistonPlatform:\s*createBoxHitTarget\([\s\S]*pistonCylinder:\s*createBoxHitTarget\([\s\S]*pistonFrame:\s*createBoxHitTarget\([\s\S]*pistonLockingScrew:\s*createBoxHitTarget\([\s\S]*isPistonFocusHitTarget[\s\S]*onPistonFocusRequest\(\)/,
  'the platform, glass cylinder, protective frame, and locking screw must all enter piston focus',
);
assert.match(
  workspaceSource,
  /onPistonFocusRequest=\{\(\) => setMode\('pistonFocus'\)\}/,
  'the main model should route its platform entry target into piston focus',
);
assert.match(
  workspaceSource,
  /const copy = getPistonOscillationShellCopy\(language\);[\s\S]*getInteractionHints\(mode, hoseState, lockingScrewLocked, interactionCopy\)/,
  'focus-entry instructions should come from the shared localized piston copy',
);
assert.ok(
  getPistonOscillationShellCopy('zh-CN').interaction.overviewHints.includes(
    '双击顶部平台、玻璃管、黑色框架或侧面锁紧螺钉：进入活塞操作视角',
  ),
);
assert.match(
  workspaceSource,
  /data-piston-focus-entry="piston"[\s\S]*aria-label=\{interactionCopy\.focusEntryAria\}[\s\S]*onDoubleClick=\{\(\) => setMode\('pistonFocus'\)\}/,
  'the formal overview should provide a screen-aligned double-click target for piston focus',
);
assert.equal(
  getPistonOscillationShellCopy('zh-TW').interaction.focusEntryAria,
  '雙擊進入活塞操作視角',
);
assert.equal(
  getPistonOscillationShellCopy('en').interaction.focusEntryAria,
  'Double-click to enter the piston operation view',
);
assert.doesNotMatch(workspaceSource, /data-piston-focus-entry="hose"/);
assert.match(
  interactiveModelSource,
  /connectedMovableConnector[\s\S]*Connector_Main_White[\s\S]*connectedInternalConnector[\s\S]*Connector_Main_ThreadedStem/,
  'the movable white plug and connected-only internal stem must be controlled independently',
);
assert.match(
  interactiveModelSource,
  /connectedConnectorGhost = connectedMovableConnector\.clone\(true\)[\s\S]*Connector_Main_DragGhost/,
  'the connected drag ghost should carry only the movable plug rather than the fixed socket collar',
);
assert.match(
  workspaceSource,
  /onProgressDelta=\{handleLockingScrewProgressDelta\}[\s\S]*data-piston-focus-screw-status="true"/,
  'the inset interaction and both visible model instances should share one screw progress state',
);

const expectedGuideScrewModes = [
  ['screwLock', 'tighten'],
  ['hoseReconnect', 'protectLocked'],
  ['screwLoosen', 'loosen'],
  ['acquisitionReady', 'protectLoose'],
  ['waitingTrigger', 'protectLoose'],
  ['recording', 'protectLoose'],
  ['pauseAvailable', 'protectLoose'],
  ['curveFrozen', 'protectLoose'],
  ['awaitingSaveOrRedo', 'protectLoose'],
  ['firstHeightAdjustment', null],
  ['crossRunDisconnect', null],
] as const;
for (const [step, expectedMode] of expectedGuideScrewModes) {
  assert.equal(
    getPistonOscillationGuideScrewInteractionMode(step),
    expectedMode,
    `${step} should use the reviewed screw interaction mode`,
  );
}

const tighteningResolution = resolvePistonOscillationGuideScrewDelta(0.55, 0.1, 'tighten');
assert.equal(tighteningResolution.attemptedDirection, 'clockwise');
assert.equal(tighteningResolution.expectedDirection, 'clockwise');
assert.equal(tighteningResolution.feedback, 'none');
assert.equal(tighteningResolution.authorizationAction, 'tightenScrew');
assert.ok(Math.abs(tighteningResolution.nextProgress - 0.65) < 1e-12);

const wrongTighteningResolution = resolvePistonOscillationGuideScrewDelta(
  0.5,
  -0.1,
  'tighten',
);
assert.equal(wrongTighteningResolution.attemptedDirection, 'counterclockwise');
assert.equal(wrongTighteningResolution.expectedDirection, 'clockwise');
assert.equal(wrongTighteningResolution.feedback, 'wrongDirection');
assert.equal(wrongTighteningResolution.authorizationAction, null);
assert.ok(Math.abs(wrongTighteningResolution.nextProgress - 0.4) < 1e-12);

const looseningResolution = resolvePistonOscillationGuideScrewDelta(0.65, -0.1, 'loosen');
assert.equal(looseningResolution.attemptedDirection, 'counterclockwise');
assert.equal(looseningResolution.expectedDirection, 'counterclockwise');
assert.equal(looseningResolution.feedback, 'none');
assert.equal(looseningResolution.authorizationAction, 'loosenScrew');
assert.ok(Math.abs(looseningResolution.nextProgress - 0.55) < 1e-12);

const harmlessLockedContinuation = resolvePistonOscillationGuideScrewDelta(
  PISTON_LOCKING_SCREW_LOCK_THRESHOLD,
  0.8,
  'protectLocked',
);
assert.equal(harmlessLockedContinuation.nextProgress, 1);
assert.equal(harmlessLockedContinuation.feedback, 'none');
assert.equal(harmlessLockedContinuation.authorizationAction, null);

const lockedBandReverse = resolvePistonOscillationGuideScrewDelta(
  0.8,
  -0.1,
  'protectLocked',
);
assert.equal(lockedBandReverse.feedback, 'wrongDirection');
assert.ok(Math.abs(lockedBandReverse.nextProgress - 0.7) < 1e-12);

const lockedBoundaryReverse = resolvePistonOscillationGuideScrewDelta(
  0.61,
  -0.02,
  'protectLocked',
);
assert.equal(lockedBoundaryReverse.feedback, 'boundaryBlocked');
assert.equal(lockedBoundaryReverse.nextProgress, PISTON_LOCKING_SCREW_LOCK_THRESHOLD);

const harmlessLooseContinuation = resolvePistonOscillationGuideScrewDelta(
  PISTON_LOCKING_SCREW_LOCK_THRESHOLD - 0.01,
  -0.8,
  'protectLoose',
);
assert.equal(harmlessLooseContinuation.nextProgress, 0);
assert.equal(harmlessLooseContinuation.feedback, 'none');
assert.equal(harmlessLooseContinuation.authorizationAction, null);

const looseBandReverse = resolvePistonOscillationGuideScrewDelta(0.2, 0.1, 'protectLoose');
assert.equal(looseBandReverse.feedback, 'wrongDirection');
assert.ok(Math.abs(looseBandReverse.nextProgress - 0.3) < 1e-12);

const looseBoundaryReverse = resolvePistonOscillationGuideScrewDelta(0.59, 0.02, 'protectLoose');
assert.equal(looseBoundaryReverse.feedback, 'boundaryBlocked');
assert.ok(looseBoundaryReverse.nextProgress < PISTON_LOCKING_SCREW_LOCK_THRESHOLD);
assert.ok(
  looseBoundaryReverse.nextProgress
    > PISTON_LOCKING_SCREW_LOCK_THRESHOLD - 0.00001,
);

assert.match(
  workspaceSource,
  /const progressDelta = -delta \/[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS[\s\S]*progressDelta > 0[\s\S]*\? 'clockwise'[\s\S]*: 'counterclockwise'/,
  'screen-clockwise dragging must increase progress and mean tightening, while counterclockwise dragging must decrease progress and mean loosening',
);
assert.match(
  workspaceSource,
  /screwGuideGesturePendingDeltaRef\.current \+= progressDelta[\s\S]*PISTON_GUIDE_SCREW_DIRECTION_THRESHOLD[\s\S]*screwGuideGestureDirectionRef\.current = committedDelta > 0[\s\S]*\? 'clockwise'[\s\S]*: 'counterclockwise'/,
  'Guide screw direction should be committed only after meaningful accumulated motion',
);
assert.match(
  workspaceSource,
  /screwGuideGestureProtectedModeRef\.current \?\? guideScrewInteractionMode[\s\S]*effectiveGuideScrewInteractionMode === 'tighten'[\s\S]*resolution\.nextProgress >= PISTON_LOCKING_SCREW_LOCK_THRESHOLD[\s\S]*screwGuideGestureProtectedModeRef\.current = 'protectLocked'[\s\S]*effectiveGuideScrewInteractionMode === 'loosen'[\s\S]*resolution\.nextProgress < PISTON_LOCKING_SCREW_LOCK_THRESHOLD[\s\S]*screwGuideGestureProtectedModeRef\.current = 'protectLoose'/,
  'crossing the functional threshold must latch protection locally before the parent Guide step rerenders',
);
assert.match(
  workspaceSource,
  /resolution\.authorizationAction !== null[\s\S]*attemptGuideAction\(resolution\.authorizationAction\)[\s\S]*screwGuideGestureRejectedRef\.current = true[\s\S]*screwGuideGestureAuthorizedActionRef\.current = resolution\.authorizationAction/,
  'only the expected completion direction should enter the ordinary Guide action guard',
);
const firstBoundaryFeedback = resolvePistonOscillationGuideScrewFeedback(
  'boundaryBlocked',
  { softFeedbackShown: false, boundaryFeedbackShown: false },
);
assert.deepEqual(firstBoundaryFeedback, {
  feedback: 'wrongDirection',
  nextState: { softFeedbackShown: true, boundaryFeedbackShown: false },
});
const continuedBoundaryFeedback = resolvePistonOscillationGuideScrewFeedback(
  'boundaryBlocked',
  firstBoundaryFeedback.nextState,
);
assert.deepEqual(continuedBoundaryFeedback, {
  feedback: 'boundaryBlocked',
  nextState: { softFeedbackShown: true, boundaryFeedbackShown: true },
});
assert.deepEqual(
  resolvePistonOscillationGuideScrewFeedback(
    'boundaryBlocked',
    continuedBoundaryFeedback.nextState,
  ),
  {
    feedback: 'none',
    nextState: { softFeedbackShown: true, boundaryFeedbackShown: true },
  },
  'continued pressure at the same boundary should not spam warning feedback',
);
const ordinaryWrongDirectionFeedback = resolvePistonOscillationGuideScrewFeedback(
  'wrongDirection',
  { softFeedbackShown: false, boundaryFeedbackShown: false },
);
assert.equal(ordinaryWrongDirectionFeedback.feedback, 'wrongDirection');
assert.equal(
  resolvePistonOscillationGuideScrewFeedback(
    'wrongDirection',
    ordinaryWrongDirectionFeedback.nextState,
  ).feedback,
  'none',
);
assert.match(
  workspaceSource,
  /const feedbackDecision = resolvePistonOscillationGuideScrewFeedback\([\s\S]*resolution\.feedback,[\s\S]*softFeedbackShown: screwGuideSoftFeedbackShownRef\.current,[\s\S]*boundaryFeedbackShown: screwGuideBoundaryFeedbackShownRef\.current[\s\S]*feedbackDecision\.nextState\.softFeedbackShown[\s\S]*feedbackDecision\.nextState\.boundaryFeedbackShown[\s\S]*feedbackDecision\.feedback !== 'none'[\s\S]*kind: feedbackDecision\.feedback/,
  'the workspace must apply the stateful two-level decision after clamping: first wrong input is soft even at the boundary, continued wrong input warns once',
);
assert.match(
  workspaceSource,
  /const handleScrewDraggingChange = useCallback[\s\S]*screwGuideGestureAuthorizedActionRef\.current = null;[\s\S]*screwGuideGestureDirectionRef\.current = null;[\s\S]*screwGuideGesturePendingDeltaRef\.current = 0;[\s\S]*screwGuideGestureRejectedRef\.current = false;[\s\S]*screwGuideSoftFeedbackShownRef\.current = false;[\s\S]*screwGuideBoundaryFeedbackShownRef\.current = false;/,
  'a new screw gesture should begin with fresh authorization, direction hysteresis, and feedback dedupe state',
);
assert.match(
  workspaceSource,
  /if \(!guideRequestedFocusMode \|\| demoActive \|\| screwDragging\) return;[\s\S]*guideRequestedFocusMode,[\s\S]*screwDragging,/,
  'the Guide-requested camera change must wait until the current screw drag ends',
);
assert.match(
  workbenchSource,
  /currentStep === 'screwLoosen'[\s\S]*snapshot\.lockingScrewState === 'loose'[\s\S]*!snapshot\.lockingScrewDragging[\s\S]*currentStep === 'acquisitionReady'[\s\S]*previousSnapshot\?\.lockingScrewDragging === true[\s\S]*!snapshot\.lockingScrewDragging[\s\S]*openPistonOscillationGuideOneTimeLesson\('lockingScrew'\)/,
  'the one-time locking-screw lesson must also wait for pointer release after the loosen threshold advances the Guide step',
);

assert.match(
  instrumentSceneSource,
  /guideScrewInteractionMode\?: PistonOscillationGuideScrewInteractionMode \| null;[\s\S]*onGuideScrewDirectionFeedback\?:[\s\S]*guideScrewInteractionMode=\{guideScrewInteractionMode\}[\s\S]*onGuideScrewDirectionFeedback=\{onGuideScrewDirectionFeedback\}/,
  'the instrument scene must forward the Guide screw policy and dedicated feedback channel to the workspace',
);
assert.match(
  workbenchSource,
  /const pistonGuideScrewInteractionMode =[\s\S]*getPistonOscillationGuideScrewInteractionMode\([\s\S]*activePistonOscillationGuideSession\.step[\s\S]*guideScrewInteractionMode=\{pistonGuideScrewInteractionMode\}[\s\S]*onGuideScrewDirectionFeedback=\{[\s\S]*handlePistonOscillationGuideScrewDirectionFeedback/,
  'the Workbench must derive the policy from the live Guide step and wire the dedicated feedback callback',
);
const screwFeedbackHandlerSource = getSourceSection(
  workbenchSource,
  'const handlePistonOscillationGuideScrewDirectionFeedback =',
  'const handlePistonOscillationGuideHeightConfirmed =',
);
assert.match(
  screwFeedbackHandlerSource,
  /feedback\.kind === 'boundaryBlocked' \? 'warning' : 'info'/,
  'wrong direction should be info-level, while continued pressure at the protected boundary should be warning-level',
);
assert.doesNotMatch(
  screwFeedbackHandlerSource,
  /GuideActionAttempt|MissCount|StrongReminder|PulseElapsed/,
  'dedicated screw feedback must not enter the ordinary miss counter, strong-reminder scheduler, or reset the next Guide pulse',
);
assert.match(
  workbenchSource,
  /viewportWarningFeedbackId=\{[\s\S]*pistonOscillationGuideFeedback\?\.kind === 'warning'[\s\S]*pistonOscillationGuideFeedback\?\.kind === 'danger'[\s\S]*\? pistonOscillationGuideFeedback\.id[\s\S]*: null/,
  'info-level direction hints must not produce the viewport shake ID, while boundary warnings must retain it',
);

assert.match(
  workspaceSource,
  /guideScrewInteractionMode === 'tighten'[\s\S]*\? 'clockwise'[\s\S]*guideScrewInteractionMode === 'loosen'[\s\S]*\? 'counterclockwise'[\s\S]*guideVisualCue === 'screw' \? guideScrewCueDirection : null[\s\S]*data-piston-screw-direction=\{displayedScrewCueDirection\}[\s\S]*interactionCopy\.screwTightenDirectionAria[\s\S]*interactionCopy\.screwLoosenDirectionAria[\s\S]*interactionCopy\.screwTightenDirectionLabel[\s\S]*interactionCopy\.screwLoosenDirectionLabel/,
  'the breathing screw cue must add a localized clockwise or counterclockwise arc arrow for the active Guide step',
);

assert.match(
  workspaceSource,
  /demoFrame\?\.activeControl === 'screw'[\s\S]*rotateCounterclockwise[\s\S]*\? 'counterclockwise'[\s\S]*: 'clockwise'[\s\S]*demoHighlightControls\.includes\('screw'\)[\s\S]*lockingScrewLocked[\s\S]*data-piston-screw-direction-mode=\{[\s\S]*demoScrewCueDirection === null \? 'guide' : 'demo'/,
  'Demo screw highlight and action stages should expose the same explicit direction arrow as Guide mode',
);
assert.match(
  workspaceSource,
  /displayedScrewCueDirection !== null && screwHitPoint !== null[\s\S]*left: `\$\{\(screwHitPoint\[0\] \+ 1\) \* 50\}%`[\s\S]*top: `\$\{\(1 - screwHitPoint\[1\]\) \* 50\}%`/,
  'the direction cue should render only after the real projected screw center is available',
);
assert.doesNotMatch(
  workspaceSource,
  /screwHitPoint === null \? '50%'/,
  'the removed operation-mirror-center fallback must not return',
);
assert.match(
  workspaceSource,
  /piston-screw-direction-outline[\s\S]*piston-screw-direction-arc[\s\S]*piston-screw-direction-head[\s\S]*M 85 57 L 73 38 L 97 38 Z/,
  'the shortened arc must use a separate high-contrast outline and an unmistakable solid arrowhead',
);
assert.match(
  workspaceCss,
  /\.piston-screw-direction-cue\s*\{[\s\S]*width:\s*clamp\(110px, 48%, 160px\);[\s\S]*filter:\s*none;[\s\S]*opacity:\s*1;[\s\S]*pointer-events:\s*none;[\s\S]*animation:\s*none;[\s\S]*\.piston-screw-direction-cue\.is-counterclockwise svg\s*\{[\s\S]*transform:\s*scaleX\(-1\);/,
  'the crisp direction arrow must not breathe or intercept dragging and must mirror deterministically for counterclockwise operation',
);
assert.match(
  workspaceCss,
  /\.piston-screw-direction-outline\s*\{[\s\S]*stroke:\s*rgba\(255, 255, 255, 0\.96\);[\s\S]*stroke-width:\s*10;[\s\S]*\.piston-screw-direction-head\s*\{[\s\S]*stroke:\s*rgba\(255, 255, 255, 0\.98\);[\s\S]*stroke-width:\s*4;[\s\S]*paint-order:\s*stroke fill;/,
  'the arc and its enlarged solid head must retain a crisp white edge over both light and dark instrument surfaces',
);
assert.match(
  workspaceSource,
  /data-piston-focus-material-palette="deep-blue-gray-low-gloss"/,
  'the approved blue-gray plastic palette should be the formal focus-interaction model palette',
);
assert.match(
  workspaceSource,
  /groundColor=\{sceneTheme === 'light' \? '#53636d' : '#182128'\}[\s\S]*position=\{\[-0\.72, 2\.75, 1\.35\]\}[\s\S]*position=\{\[0\.65, 1\.75, -2\.1\]\}/,
  'the focus interaction should use the approved top-biased lighting',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-operation-mirror\s*\{[\s\S]*top:\s*0;[\s\S]*left:\s*0;[\s\S]*height:\s*50%;[\s\S]*aspect-ratio:\s*463\s*\/\s*618;[\s\S]*border-right:[\s\S]*border-bottom:/,
  'the operation mirror should occupy half the stage height, remain flush to the top-left, and preserve the confirmed portrait ratio with only the inner dividers',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-operation-mirror\.is-visible\s*\{[\s\S]*piston-operation-mirror-enter 1\.29s[\s\S]*\.piston-focus-interaction-operation-mirror\.is-exiting\s*\{[\s\S]*piston-operation-mirror-exit 1\.29s/,
  'the operation mirror should use the approved slow cross-dissolve in both directions',
);
assert.match(
  workspaceCss,
  /is-scale-reading-view[\s\S]*piston-operation-mirror-scale-view-settle 1\.29s[\s\S]*is-screw-operation-view[\s\S]*piston-operation-mirror-screw-view-settle 1\.29s[\s\S]*filter:\s*blur\(2\.5px\)[\s\S]*opacity:\s*0\.18/,
  'switching between scale and screw views should visibly dissolve before the next pulse begins',
);
assert.match(
  workspaceSource,
  /data-piston-operation-visualization-cue-slot="true"[\s\S]*data-piston-operation-visualization-toggle-shell="true"[\s\S]*PistonOscillationOperationVisualizationToggle/,
  'the file-level operation visualization toggle and stable cue strip should share the instrument workspace',
);
assert.doesNotMatch(
  workspaceSource,
  /mode === 'pistonFocus' \? 'is-hidden'|aria-hidden=\{mode === 'pistonFocus'\}|disabled=\{mode === 'pistonFocus'\}/,
  'the independent operation-visualization switch must remain available in the piston focus view',
);
assert.match(
  workspaceSource,
  /showShiftOperationCue = false[\s\S]*showShiftOperationCue && shiftVisualizationActive[\s\S]*if \(showShiftOperationCue\) \{[\s\S]*setShiftVisualizationActive\(true\)/,
  'Shift should remain an opt-in future free-mode cue and stay hidden in the current demo and guide flows',
);
assert.match(
  workspaceSource,
  /is-enabled-visual[\s\S]*is-disabled-visual[\s\S]*data-piston-operation-visualization-visual-state=\{[\s\S]*operationVisualizationEnabled \? 'on' : 'off'/,
  'the operation-visualization switch shell should retain its saved ON or OFF appearance throughout focus cross-dissolves',
);
assert.match(
  workspaceCss,
  /\.piston-operation-visualization-cue-slot\s*\{[\s\S]*top:\s*calc\(50% \+ 14px\);[\s\S]*left:\s*18px;[\s\S]*\.piston-operation-visualization-cue\.is-visible[\s\S]*140ms[\s\S]*\.piston-operation-visualization-cue\.is-exiting[\s\S]*1\.35s/,
  'operation cues should stay in one fixed strip, appear quickly, and fade slowly',
);
assert.match(
  workspaceSource,
  /hoseInteractionEnabled=\{[\s\S]*!cameraGestureActive \|\| hoseHovered \|\| hoseDragging[\s\S]*mode === 'overview' \|\| mode === 'pistonFocus'[\s\S]*onHoseHoverChange=\{handleHoseHoverChange\}[\s\S]*onHoseDragStart=\{handleHoseDragStart\}[\s\S]*onHoseDragEnd=\{handleHoseDragEnd\}/,
  'the main scene should support direct hose dragging without a dedicated hose focus view',
);
assert.match(
  workspaceSource,
  /!hoseHovered &&[\s\S]*!hoseDragging &&[\s\S]*enableRotate=\{!hoseHovered && !hoseDragging\}[\s\S]*hoseCameraClaimedRef\.current[\s\S]*setCameraGestureActive\(true\)[\s\S]*onEnd=\{\(\) => setCameraGestureActive\(false\)\}/,
  'left-button hose ownership must remain mutually exclusive with camera rotation',
);
assert.match(
  workspaceSource,
  /const setHoseCameraClaim = useCallback[\s\S]*controlsRef\.current[\s\S]*controls\.enableRotate = !claimed[\s\S]*const handleHoseHoverChange = useCallback[\s\S]*setHoseCameraClaim\(hovered\)[\s\S]*setHoseHovered\(hovered\)[\s\S]*const handleHoseDragStart[\s\S]*setHoseCameraClaim\(true\)[\s\S]*const handleHoseDragEnd[\s\S]*setHoseCameraClaim\(false\)/,
  'hover and drag must synchronously claim the left button before camera-control state can race the hose gesture',
);
assert.match(
  workspaceSource,
  /const nextHoseState:[\s\S]*withinMagneticRange[\s\S]*\? 'connected'[\s\S]*: 'disconnected'[\s\S]*setHoseState\(nextHoseState\)/,
  'dropping inside the shared magnetic range should reconnect while dropping outside should disconnect',
);
assert.match(
  workspaceSource,
  /const handleHoseDragStart = useCallback[\s\S]*attemptGuideAction\(action\)[\s\S]*return false;[\s\S]*setHoseDragging\(true\)/,
  'the hose guard must run before any drag state or ghost is committed',
);
assert.doesNotMatch(
  workspaceSource,
  /const handleHoseDragEnd = useCallback[\s\S]*hoseState === 'connected'[\s\S]*nextHoseState === 'disconnected'[\s\S]*!spaceHeldRef\.current[\s\S]*attemptGuideAction\('disconnectHose'\)[\s\S]*selectHoseState\('connected'\)/,
  'an authorized hose drag that has crossed the physical disconnect boundary must not be rolled back merely because Space was released mid-gesture',
);
assert.match(
  workspaceSource,
  /const handleHoseDragStart = useCallback[\s\S]*attemptGuideAction\(action\)[\s\S]*const handleHoseDragEnd = useCallback[\s\S]*const nextHoseState:[\s\S]*withinMagneticRange[\s\S]*setHoseState\(nextHoseState\)/,
  'Space should guard hose pickup, while the final connector boundary should determine whether the physical hose is disconnected and can trigger support-loss recovery',
);
assert.match(
  workspaceSource,
  /const requestPowerPress = useCallback[\s\S]*const powerToggleAllowed = attemptGuideAction\('togglePower'\);[\s\S]*setManualPowerPressProgress\(nextProgress\);[\s\S]*if \(powerToggleAllowed\) onPowerToggle\?\.\(!powerOnRef\.current\);/,
  'an out-of-step Guide power press should still animate while leaving the underlying power state unchanged',
);
assert.doesNotMatch(
  workspaceSource,
  /hoseDragStartedWithSpaceHeldRef|hoseSupportTransferUntilMsRef|setSpaceHeld\(true\)[\s\S]*nextHoseState/,
  'hose dragging must not synthesize or time-limit left-hand support',
);
assert.match(
  workspaceSource,
  /commitGuideHoseSupportLossDuringDrag[\s\S]*hoseState !== 'connected'[\s\S]*setHoseState\('disconnected'\)[\s\S]*hoseDragging[\s\S]*!hoseWithinMagneticRange[\s\S]*!spaceHeld[\s\S]*commitGuideHoseSupportLossDuringDrag\(\)/,
  'once an authorized disconnect has crossed the boundary, releasing Space should commit the physical disconnection and enter the shared support-loss recovery',
);
assert.match(
  interactiveModelSource,
  /connectedConnector:[\s\S]*connectedHandle:[\s\S]*connectedBody:[\s\S]*detachedConnector:[\s\S]*detachedHandle:[\s\S]*detachedBody:/,
  'both physical hose states should expose one enlarged handle plus connector and full-hose drag targets',
);
assert.match(
  interactiveModelSource,
  /PISTON_OSCILLATION_HOSE_CONNECTOR_HIT_RADIUS_M = 0\.048[\s\S]*PISTON_OSCILLATION_HOSE_BODY_HIT_RADIUS_SCALE = 3\.2[\s\S]*PISTON_OSCILLATION_HOSE_HANDLE_ARC_LENGTH_M = 0\.11[\s\S]*createHoseHandleHitTarget[\s\S]*connectorRingIndex[\s\S]*travelled > PISTON_OSCILLATION_HOSE_HANDLE_ARC_LENGTH_M[\s\S]*new THREE\.Group\(\)[\s\S]*sampledWorldCenters[\s\S]*connectedHoseHandle[\s\S]*detachedHoseHandle/,
  'the connector and its first nearby hose section should share one generous handle hit target',
);
assert.match(
  interactiveModelSource,
  /const isObjectOrDescendantOf[\s\S]*isHoseHitTarget[\s\S]*model\.connectedHose[\s\S]*model\.connectedMovableConnector[\s\S]*model\.detachedHose[\s\S]*model\.detachedConnector/,
  'visible hose and connector geometry should claim the same drag gesture as the enlarged invisible targets',
);
assert.match(
  interactiveModelSource,
  /dragSourceStateRef[\s\S]*getWithinMagneticRange[\s\S]*ghostConnectorNdc[\s\S]*snapEdgeNdc/,
  'the magnetic decision should follow the visible ghost connector even when dragging from the hose body',
);
assert.match(
  interactiveModelSource,
  /!hoseInteractionEnabled[\s\S]*event\.button !== 0[\s\S]*event\.intersections\.some\(\(\{ object \}\) => isHoseHitTarget\(object\)\)[\s\S]*event\.stopPropagation\(\)[\s\S]*event\.nativeEvent\.stopImmediatePropagation\(\)/,
  'the left-button hose hit must claim the complete native pointerdown before OrbitControls can rotate the camera',
);
assert.match(
  interactiveModelSource,
  /getBoundingClientRect\(\)[\s\S]*setFromCamera[\s\S]*gl\.domElement\.setPointerCapture[\s\S]*window\.addEventListener\('pointermove'[\s\S]*window\.addEventListener\('pointerup'[\s\S]*window\.addEventListener\('pointercancel'/,
  'hose dragging should remain aligned after resizing and retain capture until the gesture finishes',
);
assert.match(
  interactiveModelSource,
  /const applyGhostMaterial[\s\S]*renderOrder\s*=\s*60[\s\S]*ghostMaterial[\s\S]*depthTest:\s*false/,
  'the drag ghost should remain visibly in front of the apparatus during reconnection',
);
assert.match(
  workspaceSource,
  /mode === 'pistonFocus' \? 'visible' : 'hidden'[\s\S]*setOperationMirrorMode\('visible'\)[\s\S]*setOperationMirrorMode\('exiting'\)[\s\S]*window\.setTimeout\([\s\S]*\}, 160\)/,
  'the operation mirror shell should enter for piston-height preparation and complete the shared exit motion before becoming hidden',
);
assert.match(
  workspaceSource,
  /handledGuideSessionRevisionRef\.current === guideSessionRevision[\s\S]*setMode\([\s\S]*guideRequestedFocusMode[\s\S]*\?\? guideInitialInstrumentState\?\.focusMode[\s\S]*\?\? 'overview'[\s\S]*guideRequestedFocusMode/,
  'a Guide reset should restore the focus required by the current step instead of overwriting an auto-advanced height step with the overview',
);
assert.match(
  workspaceSource,
  /operationMirrorMotionClass = !operationMirrorInitialFrameReady[\s\S]*'is-preparing'[\s\S]*'is-exiting'[\s\S]*'is-visible'[\s\S]*'is-hidden'[\s\S]*data-piston-focus-operation-mirror="true"[\s\S]*data-piston-focus-operation-mirror-ready=\{operationMirrorViewReady \? 'true' : 'false'\}/,
  'the operation mirror should stay resident and reveal only after its first rendered frame is ready',
);
assert.doesNotMatch(
  workspaceSource,
  /operationMirrorMotionClass = !operationMirrorViewReady/,
  'a view switch must keep the existing framebuffer visible while the selected camera renders its next frame',
);
assert.doesNotMatch(
  workspaceSource,
  /\{operationMirrorMode !== 'hidden' \? \(/,
  'hiding the operation mirror must not unmount its WebGL viewport',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-operation-mirror\.is-hidden,[\s\S]*\.is-preparing[\s\S]*visibility:\s*hidden;[\s\S]*pointer-events:\s*none;/,
  'the resident operation mirror should preserve layout while hidden or preparing',
);
assert.doesNotMatch(
  workspaceCss,
  /piston-operation-mirror-view-swap[\s\S]*opacity:\s*0\.2/,
  'operation-mirror view changes must not fade a newly created canvas over a pale backing surface',
);
assert.doesNotMatch(
  workspaceSource,
  /piston-demo-focus-halo/,
  'the demonstration must not fall back to screen-space hit-area rings for physical controls',
);
assert.match(
  workspaceSource,
  /demoHighlightControls[\s\S]*includes\('platform'\)[\s\S]*includes\('hose'\)[\s\S]*demoMirrorFocusTarget[\s\S]*includes\('screw'\)[\s\S]*demoHoseDragProgress[\s\S]*demoFrame\?\.activeControl === 'hose'[\s\S]*demoSnapGuideActive[\s\S]*includes\('hoseSnap'\)/,
  'the formal scene should route each demonstration target, hose ghost, and magnetic guide to its dedicated model behavior',
);
assert.match(
  workspaceSource,
  /effectiveMainFocusTarget[\s\S]*demoMainFocusTarget[\s\S]*guideFocusTarget[\s\S]*effectiveMirrorFocusTarget[\s\S]*demoMirrorFocusTarget[\s\S]*guideFocusTarget/,
  'demonstration and Guide cues should resolve into separate main-scene and operation-mirror geometry targets',
);
assert.match(
  workspaceSource,
  /demoFocusTarget=\{effectiveMainFocusTarget\}[\s\S]*demoFocusPulseElapsedSeconds=\{effectiveFocusPulseElapsedSeconds\}[\s\S]*demoHoseDragProgress=\{demoHoseDragProgress\}[\s\S]*demoSnapGuideActive=\{demoSnapGuideActive\}[\s\S]*demoFocusTarget=\{effectiveMirrorFocusTarget\}/,
  'the main scene and operation mirror should render the effective Demo-or-Guide exact-geometry targets',
);
assert.match(
  workspaceSource,
  /<Canvas[\s\S]*dpr=\{\[1, 1\.5\]\}[\s\S]*frameloop="demand"/,
  'the main instrument scene should stop consuming full-frame GPU work while visually idle',
);
assert.match(
  interactiveModelSource,
  /const invalidate = useThree\(\(state\) => state\.invalidate\)[\s\S]*if \(activeShell \|\| demoSnapGuideActive\) invalidate\(\)/,
  'active geometry cues must keep demand rendering alive without a Workbench-level animation clock',
);
assert.match(
  workspaceSource,
  /effectiveDemoPlaybackPhase !== 'completed'[\s\S]*effectiveDemoPlaybackPhase !== 'terminated'[\s\S]*setHoseDragging\(false\)[\s\S]*setHoseGhostOffset\(\[0, 0, 0\]\)[\s\S]*setHoseWithinMagneticRange\(false\)/,
  'completion and termination should clear transient hose dragging and magnetic-guide state',
);
assert.match(
  workspaceSource,
  /data-piston-demo-completed=\{[\s\S]*effectiveDemoPlaybackPhase === 'completed'[\s\S]*\? demoPresentationCopy\.completed[\s\S]*\? demoPresentationCopy\.completedStatus/,
  'the exiting step panel should report localized completion copy from the playback lifecycle rather than a stale running frame',
);
assert.match(
  workspaceSource,
  /createPromptViewportFeedbackMessage\([\s\S]*demoPresentationCopy\.completed,[\s\S]*'success'[\s\S]*demoPresentationCopy\.terminated,[\s\S]*'warning'/,
  'demonstration completion and termination should use the shared viewport-feedback severity contract',
);
assert.match(
  workspaceSource,
  /<PromptViewportFeedback[\s\S]*data-piston-demo-feedback[\s\S]*data-prompt-feedback-placement': 'viewport-center'/,
  'demonstration lifecycle feedback should render through the shared viewport-feedback component',
);
assert.doesNotMatch(
  workspaceSource,
  /演示完成|演示已终止|仪器操作|操作目标|完成判据|观察重点/,
  'the formal workspace should not retain hard-coded Simplified Chinese presentation copy',
);
assert.match(
  interactiveModelSource,
  /createFocusShellMaterial[\s\S]*depthWrite:\s*false[\s\S]*side:\s*THREE\.BackSide[\s\S]*PistonDemoFocusShellBreath_[\s\S]*PistonDemoFocusShellPulse_[\s\S]*raycast\s*=\s*\(\)\s*=>\s*undefined/,
  'physical focus breathing should be built from non-interactive outward shells of the actual model geometry',
);
assert.match(
  interactiveModelSource,
  /platform:\s*createFocusShellInstance\([\s\S]*\[massPlatform\][\s\S]*screw:\s*createFocusShellInstance\([\s\S]*\[lockingScrewMovingPart\][\s\S]*connectedHoseHandle:\s*createFocusShellInstance\([\s\S]*\[connectedHose, quickDisconnect\][\s\S]*detachedHoseHandle:\s*createFocusShellInstance\([\s\S]*\[detachedHose, detachedConnector\]/,
  'hose guidance should pulse the connected or detached hose assembly instead of only its connector',
);
assert.match(
  interactiveModelSource,
  /PISTON_FOCUS_SHELL_PULSE_PEAK_SCALE[\s\S]*platform:\s*1\.11[\s\S]*screw:\s*1\.34[\s\S]*hose:\s*1\.11[\s\S]*PISTON_FOCUS_SHELL_PULSE_PEAK_SCALE\[demoFocusTarget!\]/,
  'large platform and hose targets should use the restrained baseline expansion while the compact screw keeps the stronger knob cue',
);
assert.match(
  interactiveModelSource,
  /demoHoseDragProgress[\s\S]*normalizedDemoDragProgress[\s\S]*detachedToConnectedLocalOffset\.clone\(\)\.multiplyScalar\(normalizedDemoDragProgress\)[\s\S]*model\.ghostAssembly\.position\.copy[\s\S]*model\.snapRing\.visible = effectiveHoseDragging \|\| demoSnapGuideActive/,
  'the hose demonstration should visibly carry its ghost from the detached endpoint into the fixed magnetic guide',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-operation-mirror\.is-demo-outline-highlighted::after[\s\S]*border-right:[\s\S]*border-bottom:[\s\S]*piston-demo-operation-mirror-outline-pulse/,
  'the operation-mirror border should pulse together with the control shown inside it',
);
assert.match(
  interactiveModelSource,
  /getPistonAssemblyTargetWorldY[\s\S]*pistonEquilibriumHeightMm[\s\S]*pistonOscillationOffsetMm/,
  'the shared vertical motion rig should drive the piston inside the focus interaction model',
);
assert.match(
  workspaceSource,
  /name="HIT_PistonPlatform_InteractionWorkspace"[\s\S]*space_plus_vertical_press_drag[\s\S]*onPointerDown=[\s\S]*setPointerCapture[\s\S]*sceneHeightPx:[\s\S]*getBoundingClientRect\(\)\.height[\s\S]*onPointerMove=[\s\S]*if \(!spaceHeld && platformMode !== 'adjustHeight'\) return;[\s\S]*scalePistonOscillationVirtualHandDragToReferencePx[\s\S]*onPressReferenceDragChange/,
  'the top platform should require both hands and scale its force gesture by the current 3D scene height',
);
assert.doesNotMatch(
  workspaceSource,
  /PISTON_PRESS_DEFAULT_MAX_OFFSET_MM|PISTON_PRESS_DRAG_RANGE_PX|mapPistonDragToOffsetMm/,
  'the reviewed virtual hand must replace the fixed 12 mm prescribed-position wall',
);
assert.doesNotMatch(
  workspaceSource,
  /simulatePistonOscillationIdealAdiabaticRelease|createPistonOscillationIdealAdiabaticLoadedGasState|createPistonOscillationIdealSensorReferenceSeries|pistonOscillationLegacyCompatibility/,
  'the live interaction workspace must stay on the current thermal chain and outside legacy compatibility',
);
assert.match(
  workspaceSource,
  /const advanceVirtualHandPressTo = useCallback[\s\S]*advancePistonOscillationVirtualHandThermodynamicState\(\{[\s\S]*targetDownwardDisplacementMm:[\s\S]*getPistonOscillationVirtualHandTargetDisplacementMm[\s\S]*\}, physicsConfig, thermalConfig\)/,
  'the mouse must set only the virtual hand target while the active experiment profile drives force integration',
);
assert.match(
  workspaceSource,
  /preventUpwardMotion:[\s\S]*observedAtMs <= virtualHandDownwardCommandUntilMsRef\.current/,
  'continued downward input must temporarily prevent thermal force feedback from pushing through the advancing hands',
);
assert.match(
  workspaceSource,
  /referenceDragDeltaPx[\s\S]*PISTON_OSCILLATION_VIRTUAL_HAND_DOWNWARD_COMMAND_THRESHOLD_PX[\s\S]*virtualHandReferenceDragPxRef\.current = normalizedReferenceDragPx;[\s\S]*advanceVirtualHandPressTo\(observedAtMs\)/,
  'the latest hand target must be committed before physics advances, while a pause or micro-movement restores ordinary feedback',
);
assert.match(
  workspaceSource,
  /const nextOffsetMm = nextState\.pistonHeightM \* 1_000[\s\S]*setPistonOffsetMm\(nextOffsetMm\);[\s\S]*commitThermodynamicState\(nextState\);/,
  'the integrated force state must drive both the visible offset and the shared thermodynamic state',
);
assert.match(
  workspaceSource,
  /PistonPlatformClearanceProbe[\s\S]*platformBounds\.min\.y - topSlabBounds\.max\.y[\s\S]*data-piston-focus-platform-clearance-mm/,
  'the interaction workspace should expose the actual platform-to-top-slab clearance',
);
assert.match(
  workspaceSource,
  /getPistonLockingScrewClampState\(lockingScrewProgress\)[\s\S]*lockingScrewClampState === 'locked'[\s\S]*hoseState === 'disconnected'[\s\S]*'adjustHeight'/,
  'the platform should use the shared functional lock threshold',
);
assert.match(
  workspaceSource,
  /const lockingScrewStatus = lockingScrewLocked[\s\S]*interactionCopy\.lockedStatus[\s\S]*interactionCopy\.looseStatus[\s\S]*data-piston-focus-screw-status="true"/,
  'the localized focus panel should report the same functional locking state without endpoint percentages',
);
assert.match(
  workspaceSource,
  /interactionCopy\.pistonFocusTitle[\s\S]*interactionCopy\.hoseFocusTitle[\s\S]*interactionCopy\.hoseLabel/,
  'focus titles and hose labels must come from the shared three-language copy contract',
);
assert.match(
  workspaceSource,
  /interactionCopy\.scaleReadingMirrorAria[\s\S]*interactionCopy\.lockingScrewMirrorAria/,
  'operation-mirror accessibility labels must follow the active interface language',
);
assert.match(
  workspaceSource,
  /adjust_piston_height_with_mouse_hand[\s\S]*single_hand_vertical_height_drag[\s\S]*platformMode !== 'adjustHeight'[\s\S]*platformMode === 'adjustHeight'[\s\S]*startEquilibriumHeightMm[\s\S]*PISTON_HEIGHT_DRAG_MM_PER_PX[\s\S]*clampPistonEquilibriumHeightMm/,
  'one mouse hand should be able to lift and adjust the open unlocked platform without Space',
);
assert.match(
  workspaceSource,
  /if \(!dragRef\.current\.active \|\| dragRef\.current\.movementAuthorized\) return;[\s\S]*dragRef\.current\.movementRejected = false;[\s\S]*\[platformMode, spaceHeld\]/,
  'adding the left hand during an existing right-hand grab should re-arm the guarded movement without requiring a new grab',
);
assert.match(
  workspaceSource,
  /platformMode === 'screwLocked'\) return;/,
  'a locked screw should hold both equilibrium height and press displacement',
);
const spaceLifecycleEffectStart = workspaceSource.indexOf(
  "  useEffect(() => {\n    if (demoActive) return undefined;\n    const handleKeyDown = (event: KeyboardEvent) => {",
);
const spaceLifecycleEffectEnd = workspaceSource.indexOf(
  "\n  useEffect(() => {\n    if (mode === 'pistonFocus') return;",
  spaceLifecycleEffectStart,
);
assert.ok(
  spaceLifecycleEffectStart >= 0 && spaceLifecycleEffectEnd > spaceLifecycleEffectStart,
  'the Space-hand lifecycle effect should remain independently reviewable',
);
const spaceLifecycleEffectSource = workspaceSource.slice(
  spaceLifecycleEffectStart,
  spaceLifecycleEffectEnd,
);
assert.match(
  spaceLifecycleEffectSource,
  /window\.addEventListener\('keydown', handleKeyDown\);[\s\S]*window\.addEventListener\('keyup', handleKeyUp\);[\s\S]*document\.addEventListener\('visibilitychange', handleVisibilityChange\);[\s\S]*window\.removeEventListener\('keyup', handleKeyUp\);[\s\S]*document\.removeEventListener\('visibilitychange', handleVisibilityChange\);/,
  'Space should release on its real keyup and on document visibility loss, with matching cleanup',
);
assert.match(
  spaceLifecycleEffectSource,
  /const handleVisibilityChange = \(\) => \{[\s\S]*document\.visibilityState === 'hidden'[\s\S]*abortHeldInputs\(\);/,
  'a hidden document should abort held input state without synthesizing a physical release',
);
assert.match(
  spaceLifecycleEffectSource,
  /const handleKeyDown[\s\S]*guideInteractionPaused[\s\S]*const handleKeyUp[\s\S]*releaseSpaceHand\(\);/,
  'time-freezing should block a new Space press without losing the real keyup needed to clear left-hand support',
);
assert.match(
  spaceLifecycleEffectSource,
  /mode !== 'pistonFocus' && mode !== 'overview'/,
  'Space support should remain available in the overview where the hose is directly manipulated',
);
assert.doesNotMatch(
  spaceLifecycleEffectSource,
  /(?:addEventListener|removeEventListener)\('blur'/,
  'rotating the screw must not release the held Space hand through a window blur shortcut',
);
assert.match(
  workspaceSource,
  /if \(mode === 'overview' && spaceHeldRef\.current\) \{[\s\S]*cancelUnsupportedDrop\(\);[\s\S]*setMouseHeld\(false\);[\s\S]*setPistonPhase\('holding'\);[\s\S]*return;/,
  'leaving the piston focus for the hose overview must preserve the Space-supported platform',
);
const unsupportedDropEffectStart = workspaceSource.indexOf(
  "  useEffect(() => {\n    if (demoActive || guideInteractionPaused) {",
);
const unsupportedDropEffectEnd = workspaceSource.indexOf(
  '  useEffect(() => () => {',
  unsupportedDropEffectStart,
);
assert.ok(
  unsupportedDropEffectStart >= 0 && unsupportedDropEffectEnd > unsupportedDropEffectStart,
  'the unsupported-drop effect should remain independently reviewable',
);
const unsupportedDropEffectSource = workspaceSource.slice(
  unsupportedDropEffectStart,
  unsupportedDropEffectEnd,
);
assert.match(
  unsupportedDropEffectSource,
  /const unsupported = !onGuideActionAttempt[\s\S]*hoseState === 'disconnected'[\s\S]*lockingScrewClampState === 'loose'[\s\S]*!spaceHeld[\s\S]*!mouseHeld/,
  'only Free mode should use the catchable physical fall, and only when neither simulated hand supports it',
);
assert.match(
  unsupportedDropEffectSource,
  /getPistonLockingScrewClampState\(lockingScrewProgressRef\.current\) === 'locked'[\s\S]*spaceHeldRef\.current[\s\S]*mouseHeldRef\.current[\s\S]*unsupportedDropVelocityMmPerSRef\.current = 0/,
  'the live hand and screw refs should stop the unsupported fall immediately',
);
assert.match(
  unsupportedDropEffectSource,
  /const accelerationMmPerS2 = PISTON_UNSUPPORTED_DROP_ACCELERATION_MM_PER_S2[\s\S]*getPistonUnsupportedDropAccelerationScale\(lockingScrewProgressRef\.current\)[\s\S]*unsupportedDropVelocityMmPerSRef\.current \* elapsedSeconds[\s\S]*unsupportedDropVelocityMmPerSRef\.current \+= accelerationMmPerS2 \* elapsedSeconds[\s\S]*PISTON_EQUILIBRIUM_HEIGHT_MIN_MM/,
  'an open, unlocked cylinder should preserve velocity while its drop acceleration follows screw pressure',
);
assert.match(
  workspaceSource,
  /cancelUnsupportedDrop[\s\S]*spaceHeld[\s\S]*setPistonPhase\('falling'\)/,
  'Free mode should retain its real catchable unsupported fall',
);
assert.match(
  workspaceSource,
  /hoseState !== 'disconnected'[\s\S]*lockingScrewClampState !== 'loose'[\s\S]*const elevated =[\s\S]*if \(spaceHeldRef\.current \|\| mouseHeldRef\.current\) return;[\s\S]*if \(guideSupportLossReportedRef\.current\) return;[\s\S]*guideSupportLossReportedRef\.current = true;[\s\S]*onGuideSupportLoss\?\.\(\{[\s\S]*type: 'supportLost'[\s\S]*heightMm: pistonEquilibriumHeightMmRef\.current/,
  'Guide should report one support-loss error whenever an elevated open platform has neither hand supporting it',
);
assert.doesNotMatch(
  workspaceSource,
  /guidePlatformSupportedAboveMinimumRef/,
  'support loss must not depend on a transient prior-support flag that disappears during fast input or refresh',
);
assert.match(
  workspaceSource,
  /guideInitialInstrumentState\?: PistonOscillationGuideInstrumentRestoreState \| null;[\s\S]*initialGuideHeightMm = clampPistonEquilibriumHeightMm[\s\S]*initialNominalHeightMm = clampPistonEquilibriumHeightMm[\s\S]*initialThermodynamicState = createInitialPistonThermodynamicState[\s\S]*initialPhysicalBaseHeightMm[\s\S]*useRef\(initialPhysicalBaseHeightMm\)[\s\S]*useRef\(initialThermodynamicState\)/,
  'a remounted formal scene should restore both visible controls and the persisted physical gas state',
);
assert.match(
  workspaceSource,
  /guideHeightReset\?\.phase !== 'resetting'[\s\S]*abortHeldInputs\(\);[\s\S]*setMode\('pistonFocus'\);[\s\S]*setHeightAdjustmentStage\('readingHeight'\);[\s\S]*lockingScrewProgressRef\.current = 0;[\s\S]*setLockingScrewProgress\(0\);[\s\S]*guideHeightReset\.startedHeightMm/,
  'a Guide height error should take exclusive control, clear both hands, restore the loose screw and scale view, and then reset height',
);
assert.match(
  workspaceSource,
  /const animateReset = \(nowMs: number\) => \{[\s\S]*const easedProgress = progress \* progress;[\s\S]*startedHeightMm \* \(1 - easedProgress\)[\s\S]*PISTON_EQUILIBRIUM_HEIGHT_MIN_MM[\s\S]*onGuideHeightResetCompleteRef\.current\?\.\(\)/,
  'the scripted Guide reset should animate to zero and complete without a catch branch',
);
assert.match(
  workspaceSource,
  /const emitBottomImpactAudio = useCallback\([\s\S]*const normalizedDropDistanceMm = Math\.max\(0, dropDistanceMm\)[\s\S]*setBottomImpactAudioEvent\([\s\S]*dropDistanceMm: normalizedDropDistanceMm[\s\S]*const animateReset = \(nowMs: number\) => \{[\s\S]*emitBottomImpactAudio\([\s\S]*startedHeightMm - PISTON_EQUILIBRIUM_HEIGHT_MIN_MM[\s\S]*continuousDropStartedHeightMm - PISTON_EQUILIBRIUM_HEIGHT_MIN_MM/,
  'Guide height reset and Free unsupported drop should share the same distance-scaled bottom-impact audio event',
);
assert.match(
  workspaceSource,
  /restoreMuted: \(guideInteractionPaused && guideHeightReset === null\)/,
  'Guide time freeze should remain muted except while a height-reset impact is still being delivered',
);
assert.match(
  workspaceSource,
  /if \(!guideInteractionPaused\) return;[\s\S]*screwGuideGestureAuthorizedActionRef\.current = null;[\s\S]*const handleLockingScrewProgressDelta[\s\S]*if \(guideInteractionPaused\) return;/,
  'time freeze should revoke an authorized screw gesture so pointer capture cannot mutate the screw behind a lesson card',
);
assert.match(
  workspaceSource,
  /if \(spaceHeldRef\.current \|\| mouseHeldRef\.current\) return;[\s\S]*startPistonRebound\(trajectory,\s*releaseStartedAtMs\)/,
  'the piston must remain held until both simulated hands have released',
);
assert.match(
  workspaceSource,
  /setReleaseControlLock\(true\);[\s\S]*simulatePistonOscillationThermalRelease\(\{[\s\S]*initialVelocityMmPerS: \(pressOperationEvidence\.releaseVelocityMPerS \?\? 0\) \* 1_000,[\s\S]*referenceThermodynamicState: thermodynamicStateRef\.current[\s\S]*pressOperationEvidence,[\s\S]*startPistonRebound\(trajectory, releaseStartedAtMs\)/,
  'the second-hand release must atomically lock control, preserve release velocity and publish the operation evidence with the shared trajectory',
);
assert.match(
  workspaceSource,
  /if \(held && releaseControlLockedRef\.current\) return;[\s\S]*if \(releaseControlLockedRef\.current\) \{[\s\S]*spaceRearmRequiredRef\.current = true;[\s\S]*if \(spaceRearmRequiredRef\.current\) return;/,
  'mouse and Space input must not take control while the released piston is moving',
);
assert.match(
  workspaceSource,
  /if \(spaceRearmRequiredRef\.current\) \{[\s\S]*spaceRearmRequiredRef\.current = false;[\s\S]*return;[\s\S]*releaseSpaceHand\(\);/,
  'a Space key held through the lock must be released before it can start a new press',
);
assert.match(
  workspaceSource,
  /const releaseSpaceHand = \(\) => \{[\s\S]*const releasedAtMs = performance\.now\(\);[\s\S]*advanceVirtualHandPressTo\(releasedAtMs\);[\s\S]*capturePressTracePoint\(releasedAtMs\);[\s\S]*spaceHeldRef\.current = false;/,
  'the physical press state must advance to the exact Space release boundary before that hand stops supporting it',
);
assert.match(
  workspaceSource,
  /elapsedMs >= PISTON_REBOUND_VISIBLE_DURATION_MS[\s\S]*setPistonPhase\('idle'\);[\s\S]*completeReleaseMotion\(\)/,
  'the visible animation must mark physical release motion complete before control can unlock',
);
assert.match(
  workspaceSource,
  /const completeReleaseMotion = useCallback\(\(\) => \{[\s\S]*setReleaseControlLock\(false\);[\s\S]*\}, \[setReleaseControlLock\]\)/,
  'physical motion completion must immediately restore platform control',
);
assert.match(
  workspaceSource,
  /const advancePressThermalClock = \(observedAtMs: number\) => \{[\s\S]*!pressTraceActiveRef\.current \|\| releaseControlLockedRef\.current[\s\S]*animationFrame = null;[\s\S]*return;/,
  'the press thermal clock must stop synchronously at the atomic release boundary',
);
assert.match(
  workspaceSource,
  /const capturePressTracePoint = useCallback[\s\S]*const monotonicObservedAtMs = Math\.max\([\s\S]*thermodynamicUpdatedAtMsRef\.current \?\? observedAtMs,[\s\S]*pressTraceRef\.current\.at\(-1\)\?\.observedAtMs \?\? observedAtMs[\s\S]*observedAtMs: monotonicObservedAtMs/,
  'press samples must preserve monotonic time when pointer events and animation frames share one browser frame',
);
assert.equal(
  workspaceSource.match(/thermodynamicUpdatedAtMsRef\.current = monotonicObservedAtMs;/g)?.length,
  2,
  'both prescribed motion and virtual-hand motion must keep the thermodynamic clock monotonic',
);
assert.doesNotMatch(
  workspaceSource,
  /releaseControlExternallyHeld|releaseMotionCompleteRef/,
  'recording duration must not extend the physical-motion input lock',
);
assert.match(
  workspaceSource,
  /const beginPressTrace = useCallback[\s\S]*pressStartEventIdRef\.current \+= 1;[\s\S]*onPressStartEvent\(\{[\s\S]*startedAtMs: observedAtMs/,
  'each later two-hand press must publish its start time so the active Free record can capture it',
);
assert.match(
  workspaceSource,
  /enabled=\{[\s\S]*!releaseControlLocked[\s\S]*\}/,
  'the platform pointer control must also be disabled for the complete release transaction',
);
assert.match(
  workspaceSource,
  /const startPistonRebound = useCallback\(\(\s*trajectory: PistonOscillationTrajectory,\s*startedAtMs: number,[\s\S]*accumulatedPauseMsAtStart[\s\S]*const activePauseMs = guidePausedRef\.current[\s\S]*const elapsedMs = Math\.max\([\s\S]*nowMs[\s\S]*- startedAtMs[\s\S]*guideAccumulatedPauseMsRef\.current - accumulatedPauseMsAtStart[\s\S]*- activePauseMs/,
  'formal 3D rebound must use the shared release timestamp while excluding Guide pause time',
);
assert.match(
  workspaceSource,
  /const visibleHeightMm = pistonEquilibriumHeightMmRef\.current[\s\S]*const initialDisplacementMm = visibleHeightMm - equilibriumHeightMm[\s\S]*simulatePistonOscillationThermalRelease\(\{[\s\S]*lockedHeightMm: pistonNominalHeightMmRef\.current,[\s\S]*initialDisplacementMm/,
  'formal release must create one nonlinear trajectory from the nominal lock height and true live position',
);
assert.match(
  workspaceSource,
  /const oneHandHoldingAfterPress = pressTraceActiveRef\.current[\s\S]*!spaceHeldRef\.current \|\| !mouseHeldRef\.current[\s\S]*advancePistonOscillationPrescribedThermodynamicState\(\{[\s\S]*pistonHeightMm: thermodynamicStateRef\.current\.pistonHeightM \* 1_000,[\s\S]*velocityMmPerS: 0,[\s\S]*elapsedS/,
  'after the first hand leaves, the piston must stay fixed while the thermal state keeps advancing',
);
assert.match(
  workspaceSource,
  /handleVirtualHandReferenceDragChange[\s\S]*pressTraceActiveRef\.current[\s\S]*!spaceHeldRef\.current \|\| !mouseHeldRef\.current[\s\S]*return;/,
  'mouse motion must not move the held piston after either hand has been released',
);
assert.match(
  workspaceSource,
  /simulatePistonOscillationThermalRelease\(\{[\s\S]*releaseAsymmetry: \{[\s\S]*signedReleaseGapS: pressOperationEvidence\.signedReleaseGapS/,
  'the captured two-hand release gap must drive the current release-asymmetry model',
);
assert.match(
  workspaceSource,
  /const initialDisplacementMm = visibleHeightMm - equilibriumHeightMm;[\s\S]*if \(initialDisplacementMm >= -0\.02\) \{[\s\S]*setPistonOffset\(0\);[\s\S]*setPistonPhase\('idle'\);[\s\S]*return;[\s\S]*\}[\s\S]*simulatePistonOscillationThermalRelease/,
  'releasing without a real downward press should stay idle instead of integrating across the 0 mm stop',
);
assert.match(
  workspaceSource,
  /const releaseStartedAtMs = performance\.now\(\);[\s\S]*const releaseEvent: PistonOscillationReleaseEvent = \{[\s\S]*startedAtMs: releaseStartedAtMs,[\s\S]*trajectory,[\s\S]*\};[\s\S]*startPistonRebound\(trajectory,\s*releaseStartedAtMs\);/,
  'one release must publish and animate the same trajectory with the same startedAtMs origin',
);
assert.match(
  workspaceSource,
  /const publishSensorClock = \(observedAtMs: number\) => \{[\s\S]*onLivePhysicalStateChange\(\{[\s\S]*equilibriumHeightMm: pistonEquilibriumHeightMmRef\.current,[\s\S]*displacementMm: pistonOffsetMmRef\.current,[\s\S]*thermodynamicState: thermodynamicStateRef\.current/,
  'the formal scene must publish the live piston position and physical gas state once per sensor animation clock',
);
assert.match(
  workspaceSource,
  /trajectorySample = getPistonOscillationTrajectorySampleAt\([\s\S]*trajectory,[\s\S]*elapsedSeconds[\s\S]*trajectorySample\.displacementM \* 1_000/,
  'formal rebound motion must be driven by the shared nonlinear trajectory',
);
assert.match(
  workspaceSource,
  /const recoverPistonMotionFailure = useCallback[\s\S]*cancelPistonRebound\(\);[\s\S]*cancelSettlingAnimation\(\);[\s\S]*cancelUnsupportedDrop\(\);[\s\S]*cancelGuideHeightReset\(\);[\s\S]*resolvePistonOscillationStablePhysicalState[\s\S]*setPistonPhase\('idle'\)/,
  'a software failure must stop every piston timeline and silently restore a stable physical state',
);
assert.match(
  workspaceSource,
  /try \{[\s\S]*getPistonOscillationTrajectorySampleAt[\s\S]*\} catch \(cause\) \{[\s\S]*recoverPistonMotionFailure\(cause, 'rebound-animation'\)/,
  'rebound rendering failures must never leave the instrument stuck in rebounding',
);
assert.match(
  workspaceSource,
  /try \{[\s\S]*simulatePistonOscillationThermalRelease[\s\S]*startPistonRebound\(trajectory, releaseStartedAtMs\);[\s\S]*\} catch \(cause\) \{[\s\S]*recoverPistonMotionFailure\(cause, 'release-calculation'\)/,
  'release calculation failures must use the same silent stable-state recovery',
);
assert.doesNotMatch(
  workspaceSource,
  /recoverPistonMotionFailure[\s\S]{0,800}(?:PromptViewportFeedback|createPromptViewportFeedbackMessage)/,
  'automatic piston recovery must not surface a user-facing prompt',
);
assert.match(
  workspaceSource,
  /data-piston-focus-release-gap="true"/,
  'the shell should expose the final two-hand release gap for later quality modeling',
);
assert.match(
  workspaceSource,
  /export interface PistonOscillationGuideInstrumentSnapshot \{[\s\S]*hoseDragging: boolean;[\s\S]*lockingScrewState: 'loose' \| 'locked';[\s\S]*lockingScrewDragging: boolean;[\s\S]*heightAdjustmentStage: PistonOscillationHeightAdjustmentStage;[\s\S]*pistonPhase: PistonInteractionPhase;/,
  'Guide snapshots must expose screw-drag ownership as well as the height-reading versus locking stage',
);
assert.match(
  workspaceSource,
  /onGuideInstrumentSnapshotChangeRef\.current\?\.\(\{[\s\S]*hoseState,[\s\S]*hoseDragging,[\s\S]*lockingScrewState: lockingScrewClampState,[\s\S]*lockingScrewDragging: screwDragging,[\s\S]*heightAdjustmentStage,[\s\S]*spaceHeld,[\s\S]*mouseHeld,[\s\S]*pistonPhase/,
  'every live instrument snapshot must publish screw dragging so step advancement cannot interrupt the gesture',
);
assert.match(
  workspaceSource,
  /guideSnapTargetHeightMm: number \| null;[\s\S]*heightSnapped: false[\s\S]*rawHeightMm = clampPistonEquilibriumHeightMm[\s\S]*resolvePistonOscillationGuideHeightSnap\([\s\S]*rawHeightMm,[\s\S]*guideSnapTargetHeightMm,[\s\S]*dragRef\.current\.heightSnapped[\s\S]*onEquilibriumHeightChange\(snap\.heightMm\)/,
  'Guide height dragging should apply the reviewed hysteretic snap while preserving continuous raw dragging outside it',
);
assert.match(
  workspaceSource,
  /data-piston-focus-guide-snap-target-mm=\{guideSnapTargetHeightMm \?\? 'none'\}/,
  'the formal workspace should expose the active Guide-only snap target for browser acceptance checks',
);
assert.match(
  workspaceSource,
  /data-piston-height-stage-action="true"[\s\S]*data-piston-guide-target="height-stage-action"[\s\S]*guideVisualCue === 'heightStageAction'[\s\S]*\? 'is-guide-highlighted'[\s\S]*attemptGuideAction\('confirmHeight'\)[\s\S]*interactionCopy\.confirmHeight/,
  'the height confirmation control must be the exact strong Guide target during scale reading',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-focus-panel button\.is-guide-highlighted\s*\{[\s\S]*background:\s*#0b7fc3;[\s\S]*color:\s*#ffffff;[\s\S]*opacity:\s*1;[\s\S]*piston-guide-height-stage-fill-pulse/,
  'the height confirmation target should retain a strong filled cue',
);
assert.match(
  workspaceCss,
  /\.piston-focus-interaction-focus-panel button\.is-guide-highlighted::after\s*\{[\s\S]*inset:\s*3px;[\s\S]*border:\s*2px solid rgba\(224, 242, 254, 0\.84\);[\s\S]*piston-guide-height-stage-outline-pulse/,
  'the height confirmation target should have its own closed inner outline',
);
assert.match(
  workspaceCss,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*button\.is-guide-highlighted,[\s\S]*button\.is-guide-highlighted::after \{[\s\S]*animation:\s*none;[\s\S]*button\.is-guide-highlighted::after \{[\s\S]*border-color:\s*#f0f9ff;[\s\S]*opacity:\s*1;/,
  'the exact height-action cue must remain visible while motion is reduced',
);

console.log('pistonOscillationInteractionWorkspace tests passed');
