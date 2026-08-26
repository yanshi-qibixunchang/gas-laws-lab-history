import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS,
  PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA,
} from '../../src/features/pistonOscillation/pistonOscillationFocusViews.ts';
import { getPistonOscillationShellCopy } from '../../src/features/pistonOscillation/pistonOscillationCopy.ts';

const appEntrySource = readFileSync(join(process.cwd(), 'src', 'app', 'index.tsx'), 'utf8');
const previewSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationFocusInteractionPreviewPage.tsx',
  ),
  'utf8',
);
const previewCss = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationFocusInteractionPreviewPage.css',
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
  previewSource,
  /cameraPreset === 'overview'[\s\S]*PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA/,
  'the formal default view must use the software-size camera values confirmed by the user',
);
assert.match(
  previewSource,
  /offsetPistonOscillationOverviewPoseForHeight[\s\S]*heightOffsetM = clampPistonEquilibriumHeightMm\(heightMm\) \/ 1000[\s\S]*position: \[pose\.position\[0\], pose\.position\[1\] \+ heightOffsetM[\s\S]*target: \[pose\.target\[0\], pose\.target\[1\] \+ heightOffsetM/,
  'every overview preset must preserve framing by applying a one-to-one vertical height offset',
);
assert.match(
  previewSource,
  /const enterOverview = useCallback[\s\S]*setOverviewFramingHeightMm\(pistonEquilibriumHeightMmRef\.current\)[\s\S]*setOverviewPoseRevision[\s\S]*setMode\('overview'\)/,
  'leaving focus or restoring the overview must snapshot the current piston height and reapply the camera',
);

assert.match(
  appEntrySource,
  /pistonFocusInteractionPreviewEnabled\s*=\s*import\.meta\.env\.DEV[\s\S]*pistonFocusInteractionPreview['"]\) === ['"]1['"]/,
  'the interaction shell must remain behind an explicit development-only query switch',
);
assert.match(previewSource, /data-piston-focus-interaction-preview="true"/);
assert.match(previewSource, /data-piston-focus-operation-mirror="true"/);
assert.match(previewSource, /data-piston-focus-exit-panel="true"/);
assert.match(
  previewSource,
  /createPistonOscillationPointerEvents[\s\S]*getBoundingClientRect\(\)[\s\S]*state\.pointer\.set[\s\S]*state\.raycaster\.setFromCamera[\s\S]*events=\{createPistonOscillationPointerEvents\}/,
  'the piston scene should use the same canvas-relative pointer mapping strategy as the stable heat-capacity scene',
);
assert.match(
  previewSource,
  /usePreviewOverlayMotion[\s\S]*data-preview-overlay-layer="piston-oscillation"[\s\S]*studio-preview-overlay-slot-bottom-left[\s\S]*studio-preview-overlay-slot-bottom-right/,
  'piston hints and focus controls should use the shared responsive overlay layer and corner slots',
);
assert.match(
  previewSource,
  /overlayTopRight\?: ReactNode;[\s\S]*const overlayTopRightPresent = overlayTopRight !== undefined && overlayTopRight !== null;[\s\S]*parentTopRightPanelMode[\s\S]*displayedOverlayTopRightRef[\s\S]*if \(overlayTopRightPresent\)[\s\S]*setParentTopRightPanelMode\('visible'\)[\s\S]*setParentTopRightPanelMode\('exiting'\)[\s\S]*window\.setTimeout\([\s\S]*setParentTopRightPanelMode\('hidden'\)[\s\S]*\}, 160\)/,
  'the parent Guide overlay should enter, remain mounted for its exit class, and unmount after the shared exit duration',
);
assert.match(
  previewSource,
  /layoutRevision:[\s\S]*demoStepPanelMode,[\s\S]*effectiveParentTopRightPanelMode,[\s\S]*studio-preview-overlay-slot-top-right[\s\S]*piston-focus-interaction-parent-top-right-panel-\$\{effectiveParentTopRightPanelMode\}[\s\S]*data-preview-overlay-item="piston-parent-top-right"[\s\S]*displayedOverlayTopRightRef\.current[\s\S]*displayedDemoFrame/,
  'the injected Guide and built-in top-right overlays should share one slot and expose a stable FLIP key',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-parent-top-right-panel-visible\s*\{[\s\S]*studioOverlayEnterRight[\s\S]*\.piston-focus-interaction-parent-top-right-panel-exiting\s*\{[\s\S]*studioOverlayExitRight[\s\S]*\.piston-focus-interaction-parent-top-right-panel \.studio-piston-guide-step-panel\s*\{[\s\S]*animation:\s*none;/,
  'the injected panel should use the shared right-side entry and exit classes without replaying its own panel animation',
);
assert.match(
  previewCss,
  /\[data-piston-demo-step-panel='true'\]\s*\{[\s\S]*width:\s*min\(340px, 100%\);[\s\S]*gap:\s*5px;[\s\S]*padding:\s*9px 12px;[\s\S]*line-height:\s*1\.3;/,
  'the Piston-only Demo panel should use the wider compact layout without resizing shared Heat or Guide panels',
);
assert.match(
  overlayMotionSource,
  /const OVERLAY_MOTION_DURATION_MS = 200;[\s\S]*querySelectorAll<HTMLElement>\('\[data-preview-overlay-item\]'\)[\s\S]*const deltaX = previousRect\.left - nextRect\.left;[\s\S]*const deltaY = previousRect\.top - nextRect\.top;[\s\S]*item\.animate\([\s\S]*translate3d\(\$\{deltaX\}px, \$\{deltaY\}px, 0\)[\s\S]*duration: OVERLAY_MOTION_DURATION_MS/,
  'the shared overlay hook should retain its 200 ms FLIP displacement contract',
);
assert.match(
  previewSource,
  /studio-heat-interaction-hints[\s\S]*studio-heat-focus-panel[\s\S]*studio-heat-focus-title[\s\S]*studio-heat-focus-panel-actions-single/,
  'piston focus UI should reuse the stable experiment panel hierarchy and controls',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-focus-panel\s*\{[\s\S]*width:\s*min\(320px, 100%\);[\s\S]*\.piston-focus-interaction-focus-panel \.studio-heat-focus-grid,[\s\S]*\.piston-focus-interaction-focus-panel \.studio-heat-focus-panel-actions:not\([\s\S]*\.studio-heat-focus-panel-actions-single[\s\S]*\)\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
  'the piston focus panel should be capped at 320 px and keep its data and action layouts in two equal columns',
);
assert.match(
  previewCss,
  /\[data-preview-overlay-item='piston-focus-panel'\]\s*\{[\s\S]*display:\s*flex;[\s\S]*width:\s*100%;[\s\S]*justify-content:\s*flex-end;[\s\S]*pointer-events:\s*none;/,
  'the focus-panel wrapper must keep the panel right-anchored while passing pointer input through to the platform at 60 mm',
);
assert.match(
  previewSource,
  /studio-heat-focus-panel-row studio-piston-focus-hand-status-row[\s\S]*data-piston-focus-piston-status="true"/,
  'the localized two-hand status should expose a dedicated compact panel row',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-focus-panel \.studio-piston-focus-hand-status-row\s*\{[\s\S]*grid-column:\s*1 \/ -1;[\s\S]*\.studio-piston-focus-hand-status-row strong\s*\{[\s\S]*white-space:\s*normal;/,
  'the two-hand status should use the full panel width instead of changing the panel anchor through max-content sizing',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-focus-panel \.studio-heat-focus-panel-row > span,[\s\S]*\.piston-focus-interaction-focus-panel \.studio-heat-focus-panel-actions button\s*\{[\s\S]*min-width:\s*0;[\s\S]*white-space:\s*nowrap;/,
  'focus labels and action buttons should remain on one line inside the compact panel',
);
assert.match(
  previewSource,
  /FOCUS_TRANSITION_DURATION_MS = 360[\s\S]*1 - \(\(1 - progress\) \*\* 3\)/,
  'piston focus transitions should match the stable experiment camera duration and easing',
);
assert.match(
  previewSource,
  /enabled=\{[\s\S]*!transitionActive &&[\s\S]*!focusActive[\s\S]*calibrationActive[\s\S]*cameraCalibrationView !== 'screwOperationView'[\s\S]*cameraCalibrationView !== 'scaleReadingView'[\s\S]*\}/,
  'focus views must remain locked in the formal scene while the development calibration tool can explicitly unlock its selected camera',
);
assert.match(
  previewSource,
  /setMode\('overview'\)/,
  'the lower-right focus panel must be able to return to the free overview',
);
assert.match(
  previewSource,
  /name="HIT_PistonLockingScrew_OperationMirror"[\s\S]*gesture:\s*'circular_drag'[\s\S]*onPointerDown=[\s\S]*setPointerCapture[\s\S]*onPointerMove=[\s\S]*normalizeAngleDelta[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS/,
  'the operation mirror should expose a circular drag target tied to the reviewed screw travel',
);
assert.match(
  interactiveModelSource,
  /PISTON_OSCILLATION_LOCKING_SCREW_TURNS = 6;[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_TRAVEL_M = 0\.004;[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS = 3;/,
  'the locking screw should double visible rotation and axial travel without lengthening the gesture',
);
assert.match(
  interactiveModelSource,
  /pistonPlatform:\s*createBoxHitTarget\([\s\S]*pistonCylinder:\s*createBoxHitTarget\([\s\S]*pistonFrame:\s*createBoxHitTarget\([\s\S]*pistonLockingScrew:\s*createBoxHitTarget\([\s\S]*isPistonFocusHitTarget[\s\S]*onPistonFocusRequest\(\)/,
  'the platform, glass cylinder, protective frame, and locking screw must all enter piston focus',
);
assert.match(
  previewSource,
  /onPistonFocusRequest=\{\(\) => setMode\('pistonFocus'\)\}/,
  'the main model should route its platform entry target into piston focus',
);
assert.match(
  previewSource,
  /const copy = getPistonOscillationShellCopy\(language\);[\s\S]*getInteractionHints\(mode, hoseState, lockingScrewLocked, interactionCopy\)/,
  'focus-entry instructions should come from the shared localized piston copy',
);
assert.ok(
  getPistonOscillationShellCopy('zh-CN').interaction.overviewHints.includes(
    '双击顶部平台、玻璃管、黑色框架或侧面锁紧螺钉：进入活塞操作视角',
  ),
);
assert.match(
  previewSource,
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
assert.doesNotMatch(previewSource, /data-piston-focus-entry="hose"/);
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
  previewSource,
  /onProgressDelta=\{handleLockingScrewProgressDelta\}[\s\S]*data-piston-focus-screw-status="true"/,
  'the inset interaction and both visible model instances should share one screw progress state',
);
assert.match(
  previewSource,
  /screwGuideGesturePendingDeltaRef\.current \+= progressDelta[\s\S]*PISTON_GUIDE_SCREW_DIRECTION_THRESHOLD[\s\S]*attemptGuideAction\(action\)[\s\S]*screwGuideGestureRejectedRef\.current = true[\s\S]*screwGuideGestureAuthorizedActionRef\.current = action/,
  'the screw guard should wait for a meaningful direction, then authorize or reject the whole gesture once',
);
assert.match(
  previewSource,
  /authorizedAction === 'tightenScrew' && !spaceHeldRef\.current[\s\S]*const matchesAuthorizedDirection = authorizedAction === 'tightenScrew'[\s\S]*if \(!matchesAuthorizedDirection\) return;/,
  'an authorized tightening gesture must stop if left-hand support is released, and reverse jitter must not mutate the instrument',
);
assert.match(
  previewSource,
  /const handleScrewDraggingChange = useCallback[\s\S]*screwGuideGestureAuthorizedActionRef\.current = null;[\s\S]*screwGuideGesturePendingDeltaRef\.current = 0;[\s\S]*screwGuideGestureRejectedRef\.current = false;/,
  'a new screw gesture should begin with a fresh transaction-level guard state',
);
assert.match(
  previewSource,
  /data-piston-focus-material-palette="deep-blue-gray-low-gloss"/,
  'the approved blue-gray plastic palette should be the formal focus-interaction model palette',
);
assert.match(
  previewSource,
  /groundColor=\{sceneTheme === 'light' \? '#53636d' : '#182128'\}[\s\S]*position=\{\[-0\.72, 2\.75, 1\.35\]\}[\s\S]*position=\{\[0\.65, 1\.75, -2\.1\]\}/,
  'the focus interaction should use the approved top-biased lighting',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-operation-mirror\s*\{[\s\S]*top:\s*0;[\s\S]*left:\s*0;[\s\S]*height:\s*50%;[\s\S]*aspect-ratio:\s*463\s*\/\s*618;[\s\S]*border-right:[\s\S]*border-bottom:/,
  'the operation mirror should occupy half the stage height, remain flush to the top-left, and preserve the confirmed portrait ratio with only the inner dividers',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-operation-mirror\.is-visible\s*\{[\s\S]*piston-operation-mirror-enter 1\.29s[\s\S]*\.piston-focus-interaction-operation-mirror\.is-exiting\s*\{[\s\S]*piston-operation-mirror-exit 1\.29s/,
  'the operation mirror should use the approved slow cross-dissolve in both directions',
);
assert.match(
  previewCss,
  /is-scale-reading-view[\s\S]*piston-operation-mirror-scale-view-settle 1\.29s[\s\S]*is-screw-operation-view[\s\S]*piston-operation-mirror-screw-view-settle 1\.29s[\s\S]*filter:\s*blur\(2\.5px\)[\s\S]*opacity:\s*0\.18/,
  'switching between scale and screw views should visibly dissolve before the next pulse begins',
);
assert.match(
  previewSource,
  /data-piston-operation-visualization-cue-slot="true"[\s\S]*data-piston-operation-visualization-toggle-shell="true"[\s\S]*PistonOscillationOperationVisualizationToggle/,
  'the file-level operation visualization toggle and stable cue strip should share the instrument workspace',
);
assert.match(
  previewSource,
  /showShiftOperationCue = false[\s\S]*showShiftOperationCue && shiftVisualizationActive[\s\S]*if \(showShiftOperationCue\) \{[\s\S]*setShiftVisualizationActive\(true\)/,
  'Shift should remain an opt-in future free-mode cue and stay hidden in the current demo and guide flows',
);
assert.match(
  previewSource,
  /is-enabled-visual[\s\S]*is-disabled-visual[\s\S]*data-piston-operation-visualization-visual-state=\{[\s\S]*operationVisualizationEnabled \? 'on' : 'off'/,
  'the operation-visualization switch shell should retain its saved ON or OFF appearance throughout focus cross-dissolves',
);
assert.match(
  previewCss,
  /\.piston-operation-visualization-cue-slot\s*\{[\s\S]*top:\s*calc\(50% \+ 14px\);[\s\S]*left:\s*18px;[\s\S]*\.piston-operation-visualization-cue\.is-visible[\s\S]*140ms[\s\S]*\.piston-operation-visualization-cue\.is-exiting[\s\S]*1\.35s/,
  'operation cues should stay in one fixed strip, appear quickly, and fade slowly',
);
assert.match(
  previewSource,
  /hoseInteractionEnabled=\{[\s\S]*!cameraGestureActive \|\| hoseHovered \|\| hoseDragging[\s\S]*mode === 'overview' \|\| mode === 'pistonFocus'[\s\S]*onHoseHoverChange=\{handleHoseHoverChange\}[\s\S]*onHoseDragStart=\{handleHoseDragStart\}[\s\S]*onHoseDragEnd=\{handleHoseDragEnd\}/,
  'the main scene should support direct hose dragging without a dedicated hose focus view',
);
assert.match(
  previewSource,
  /!hoseHovered &&[\s\S]*!hoseDragging &&[\s\S]*enableRotate=\{!hoseHovered && !hoseDragging\}[\s\S]*hoseCameraClaimedRef\.current[\s\S]*setCameraGestureActive\(true\)[\s\S]*onEnd=\{\(\) => setCameraGestureActive\(false\)\}/,
  'left-button hose ownership must remain mutually exclusive with camera rotation',
);
assert.match(
  previewSource,
  /const setHoseCameraClaim = useCallback[\s\S]*controlsRef\.current[\s\S]*controls\.enableRotate = !claimed[\s\S]*const handleHoseHoverChange = useCallback[\s\S]*setHoseCameraClaim\(hovered\)[\s\S]*setHoseHovered\(hovered\)[\s\S]*const handleHoseDragStart[\s\S]*setHoseCameraClaim\(true\)[\s\S]*const handleHoseDragEnd[\s\S]*setHoseCameraClaim\(false\)/,
  'hover and drag must synchronously claim the left button before camera-control state can race the hose gesture',
);
assert.match(
  previewSource,
  /const nextHoseState:[\s\S]*withinMagneticRange[\s\S]*\? 'connected'[\s\S]*: 'disconnected'[\s\S]*setHoseState\(nextHoseState\)/,
  'dropping inside the shared magnetic range should reconnect while dropping outside should disconnect',
);
assert.match(
  previewSource,
  /const handleHoseDragStart = useCallback[\s\S]*attemptGuideAction\(action\)[\s\S]*return false;[\s\S]*setHoseDragging\(true\)/,
  'the hose guard must run before any drag state or ghost is committed',
);
assert.doesNotMatch(
  previewSource,
  /const handleHoseDragEnd = useCallback[\s\S]*hoseState === 'connected'[\s\S]*nextHoseState === 'disconnected'[\s\S]*!spaceHeldRef\.current[\s\S]*attemptGuideAction\('disconnectHose'\)[\s\S]*selectHoseState\('connected'\)/,
  'an authorized hose drag that has crossed the physical disconnect boundary must not be rolled back merely because Space was released mid-gesture',
);
assert.match(
  previewSource,
  /const handleHoseDragStart = useCallback[\s\S]*attemptGuideAction\(action\)[\s\S]*const handleHoseDragEnd = useCallback[\s\S]*const nextHoseState:[\s\S]*withinMagneticRange[\s\S]*setHoseState\(nextHoseState\)/,
  'Space should guard hose pickup, while the final connector boundary should determine whether the physical hose is disconnected and can trigger support-loss recovery',
);
assert.doesNotMatch(
  previewSource,
  /hoseDragStartedWithSpaceHeldRef|hoseSupportTransferUntilMsRef|setSpaceHeld\(true\)[\s\S]*nextHoseState/,
  'hose dragging must not synthesize or time-limit left-hand support',
);
assert.match(
  previewSource,
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
  previewSource,
  /mode === 'pistonFocus' \? 'visible' : 'hidden'[\s\S]*setOperationMirrorMode\('visible'\)[\s\S]*setOperationMirrorMode\('exiting'\)[\s\S]*window\.setTimeout\([\s\S]*\}, 160\)/,
  'the operation mirror shell should enter for piston-height preparation and complete the shared exit motion before becoming hidden',
);
assert.match(
  previewSource,
  /handledGuideSessionRevisionRef\.current === guideSessionRevision[\s\S]*setMode\(guideRequestedFocusMode \?\? 'overview'\)[\s\S]*guideRequestedFocusMode/,
  'a Guide reset should restore the focus required by the current step instead of overwriting an auto-advanced height step with the overview',
);
assert.match(
  previewSource,
  /operationMirrorMotionClass = !operationMirrorInitialFrameReady[\s\S]*'is-preparing'[\s\S]*'is-exiting'[\s\S]*'is-visible'[\s\S]*'is-hidden'[\s\S]*data-piston-focus-operation-mirror="true"[\s\S]*data-piston-focus-operation-mirror-ready=\{operationMirrorViewReady \? 'true' : 'false'\}/,
  'the operation mirror should stay resident and reveal only after its first rendered frame is ready',
);
assert.doesNotMatch(
  previewSource,
  /operationMirrorMotionClass = !operationMirrorViewReady/,
  'a view switch must keep the existing framebuffer visible while the selected camera renders its next frame',
);
assert.doesNotMatch(
  previewSource,
  /\{operationMirrorMode !== 'hidden' \? \(/,
  'hiding the operation mirror must not unmount its WebGL viewport',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-operation-mirror\.is-hidden,[\s\S]*\.is-preparing[\s\S]*visibility:\s*hidden;[\s\S]*pointer-events:\s*none;/,
  'the resident operation mirror should preserve layout while hidden or preparing',
);
assert.doesNotMatch(
  previewCss,
  /piston-operation-mirror-view-swap[\s\S]*opacity:\s*0\.2/,
  'operation-mirror view changes must not fade a newly created canvas over a pale backing surface',
);
assert.doesNotMatch(
  previewSource,
  /piston-demo-focus-halo/,
  'the demonstration must not fall back to screen-space hit-area rings for physical controls',
);
assert.match(
  previewSource,
  /demoHighlightControls[\s\S]*includes\('platform'\)[\s\S]*includes\('hose'\)[\s\S]*demoMirrorFocusTarget[\s\S]*includes\('screw'\)[\s\S]*demoHoseDragProgress[\s\S]*demoFrame\?\.activeControl === 'hose'[\s\S]*demoSnapGuideActive[\s\S]*includes\('hoseSnap'\)/,
  'the formal scene should route each demonstration target, hose ghost, and magnetic guide to its dedicated model behavior',
);
assert.match(
  previewSource,
  /effectiveMainFocusTarget[\s\S]*demoMainFocusTarget[\s\S]*guideFocusTarget[\s\S]*effectiveMirrorFocusTarget[\s\S]*demoMirrorFocusTarget[\s\S]*guideFocusTarget/,
  'demonstration and Guide cues should resolve into separate main-scene and operation-mirror geometry targets',
);
assert.match(
  previewSource,
  /demoFocusTarget=\{effectiveMainFocusTarget\}[\s\S]*demoFocusPulseElapsedSeconds=\{effectiveFocusPulseElapsedSeconds\}[\s\S]*demoHoseDragProgress=\{demoHoseDragProgress\}[\s\S]*demoSnapGuideActive=\{demoSnapGuideActive\}[\s\S]*demoFocusTarget=\{effectiveMirrorFocusTarget\}/,
  'the main scene and operation mirror should render the effective Demo-or-Guide exact-geometry targets',
);
assert.match(
  previewSource,
  /<Canvas[\s\S]*dpr=\{\[1, 1\.5\]\}[\s\S]*frameloop="demand"/,
  'the main instrument scene should stop consuming full-frame GPU work while visually idle',
);
assert.match(
  interactiveModelSource,
  /const invalidate = useThree\(\(state\) => state\.invalidate\)[\s\S]*if \(activeShell \|\| demoSnapGuideActive\) invalidate\(\)/,
  'active geometry cues must keep demand rendering alive without a Workbench-level animation clock',
);
assert.match(
  previewSource,
  /effectiveDemoPlaybackPhase !== 'completed'[\s\S]*effectiveDemoPlaybackPhase !== 'terminated'[\s\S]*setHoseDragging\(false\)[\s\S]*setHoseGhostOffset\(\[0, 0, 0\]\)[\s\S]*setHoseWithinMagneticRange\(false\)/,
  'completion and termination should clear transient hose dragging and magnetic-guide state',
);
assert.match(
  previewSource,
  /data-piston-demo-completed=\{[\s\S]*effectiveDemoPlaybackPhase === 'completed'[\s\S]*\? demoPresentationCopy\.completed[\s\S]*\? demoPresentationCopy\.completedStatus/,
  'the exiting step panel should report localized completion copy from the playback lifecycle rather than a stale running frame',
);
assert.match(
  previewSource,
  /createPromptViewportFeedbackMessage\([\s\S]*demoPresentationCopy\.completed,[\s\S]*'success'[\s\S]*demoPresentationCopy\.terminated,[\s\S]*'warning'/,
  'demonstration completion and termination should use the shared viewport-feedback severity contract',
);
assert.match(
  previewSource,
  /<PromptViewportFeedback[\s\S]*data-piston-demo-feedback[\s\S]*data-prompt-feedback-placement': 'viewport-center'/,
  'demonstration lifecycle feedback should render through the shared viewport-feedback component',
);
assert.doesNotMatch(
  previewSource,
  /演示完成|演示已终止|仪器操作|操作目标|完成判据|观察重点/,
  'the formal preview should not retain hard-coded Simplified Chinese presentation copy',
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
  previewCss,
  /\.piston-focus-interaction-operation-mirror\.is-demo-outline-highlighted::after[\s\S]*border-right:[\s\S]*border-bottom:[\s\S]*piston-demo-operation-mirror-outline-pulse/,
  'the operation-mirror border should pulse together with the control shown inside it',
);
assert.match(
  interactiveModelSource,
  /getPistonAssemblyTargetWorldY[\s\S]*pistonEquilibriumHeightMm[\s\S]*pistonOscillationOffsetMm/,
  'the shared vertical motion rig should drive the piston inside the focus interaction model',
);
assert.match(
  previewSource,
  /name="HIT_PistonPlatform_FocusPreview"[\s\S]*space_plus_vertical_press_drag[\s\S]*onPointerDown=[\s\S]*setPointerCapture[\s\S]*onPointerMove=[\s\S]*if \(!spaceHeld && platformMode !== 'adjustHeight'\) return;[\s\S]*mapPistonDragToOffsetMm/,
  'the top platform should require the mouse hand plus the Space hand before downward motion',
);
assert.match(
  previewSource,
  /PistonPlatformClearanceProbe[\s\S]*platformBounds\.min\.y - topSlabBounds\.max\.y[\s\S]*data-piston-focus-platform-clearance-mm/,
  'the temporary focus review should expose the actual platform-to-top-slab clearance',
);
assert.match(
  previewSource,
  /getPistonLockingScrewClampState\(lockingScrewProgress\)[\s\S]*lockingScrewClampState === 'locked'[\s\S]*hoseState === 'disconnected'[\s\S]*'adjustHeight'/,
  'the platform should use the shared functional lock threshold',
);
assert.match(
  previewSource,
  /const lockingScrewStatus = lockingScrewLocked[\s\S]*interactionCopy\.lockedStatus[\s\S]*interactionCopy\.looseStatus[\s\S]*data-piston-focus-screw-status="true"/,
  'the localized focus panel should report the same functional locking state without endpoint percentages',
);
assert.match(
  previewSource,
  /interactionCopy\.scaleReadingTitle[\s\S]*interactionCopy\.heightAdjustmentTitle[\s\S]*interactionCopy\.pistonFocusTitle[\s\S]*interactionCopy\.hoseFocusTitle[\s\S]*interactionCopy\.hoseLabel/,
  'focus titles and hose labels must come from the shared three-language copy contract',
);
assert.match(
  previewSource,
  /interactionCopy\.scaleReadingMirrorAria[\s\S]*interactionCopy\.lockingScrewMirrorAria/,
  'operation-mirror accessibility labels must follow the active interface language',
);
assert.match(
  previewSource,
  /adjust_piston_height_with_mouse_hand[\s\S]*single_hand_vertical_height_drag[\s\S]*platformMode !== 'adjustHeight'[\s\S]*platformMode === 'adjustHeight'[\s\S]*startEquilibriumHeightMm[\s\S]*PISTON_HEIGHT_DRAG_MM_PER_PX[\s\S]*clampPistonEquilibriumHeightMm/,
  'one mouse hand should be able to lift and adjust the open unlocked platform without Space',
);
assert.match(
  previewSource,
  /if \(!dragRef\.current\.active \|\| dragRef\.current\.movementAuthorized\) return;[\s\S]*dragRef\.current\.movementRejected = false;[\s\S]*\[platformMode, spaceHeld\]/,
  'adding the left hand during an existing right-hand grab should re-arm the guarded movement without requiring a new grab',
);
assert.match(
  previewSource,
  /platformMode === 'screwLocked'\) return;/,
  'a locked screw should hold both equilibrium height and press displacement',
);
const spaceLifecycleEffectStart = previewSource.indexOf(
  "  useEffect(() => {\n    if (demoActive) return undefined;\n    const handleKeyDown = (event: KeyboardEvent) => {",
);
const spaceLifecycleEffectEnd = previewSource.indexOf(
  "\n  useEffect(() => {\n    if (mode === 'pistonFocus') return;",
  spaceLifecycleEffectStart,
);
assert.ok(
  spaceLifecycleEffectStart >= 0 && spaceLifecycleEffectEnd > spaceLifecycleEffectStart,
  'the Space-hand lifecycle effect should remain independently reviewable',
);
const spaceLifecycleEffectSource = previewSource.slice(
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
  previewSource,
  /if \(mode === 'overview' && spaceHeldRef\.current\) \{[\s\S]*cancelUnsupportedDrop\(\);[\s\S]*setMouseHeld\(false\);[\s\S]*setPistonPhase\('holding'\);[\s\S]*return;/,
  'leaving the piston focus for the hose overview must preserve the Space-supported platform',
);
const unsupportedDropEffectStart = previewSource.indexOf(
  "  useEffect(() => {\n    if (calibrationActive || demoActive || guideInteractionPaused) {",
);
const unsupportedDropEffectEnd = previewSource.indexOf(
  '  useEffect(() => () => {',
  unsupportedDropEffectStart,
);
assert.ok(
  unsupportedDropEffectStart >= 0 && unsupportedDropEffectEnd > unsupportedDropEffectStart,
  'the unsupported-drop effect should remain independently reviewable',
);
const unsupportedDropEffectSource = previewSource.slice(
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
  previewSource,
  /cancelUnsupportedDrop[\s\S]*spaceHeld[\s\S]*setPistonPhase\('falling'\)/,
  'Free mode should retain its real catchable unsupported fall',
);
assert.match(
  previewSource,
  /hoseState !== 'disconnected'[\s\S]*lockingScrewClampState !== 'loose'[\s\S]*const elevated =[\s\S]*if \(spaceHeldRef\.current \|\| mouseHeldRef\.current\) return;[\s\S]*if \(guideSupportLossReportedRef\.current\) return;[\s\S]*guideSupportLossReportedRef\.current = true;[\s\S]*onGuideSupportLoss\?\.\(\{[\s\S]*type: 'supportLost'[\s\S]*heightMm: pistonEquilibriumHeightMmRef\.current/,
  'Guide should report one support-loss error whenever an elevated open platform has neither hand supporting it',
);
assert.doesNotMatch(
  previewSource,
  /guidePlatformSupportedAboveMinimumRef/,
  'support loss must not depend on a transient prior-support flag that disappears during fast input or refresh',
);
assert.match(
  previewSource,
  /guideInitialInstrumentState\?: PistonOscillationGuideInstrumentRestoreState \| null;[\s\S]*initialGuideHeightMm = clampPistonEquilibriumHeightMm[\s\S]*guideInitialInstrumentState\?\.hoseState \?\? 'disconnected'[\s\S]*useState\([\s\S]*initialGuideScrewProgress[\s\S]*useRef\(initialGuideHeightMm\)/,
  'a remounted formal scene should initialize all physical controls from the persisted Guide checkpoint',
);
assert.match(
  previewSource,
  /guideHeightReset\?\.phase !== 'resetting'[\s\S]*abortHeldInputs\(\);[\s\S]*setMode\('pistonFocus'\);[\s\S]*setHeightAdjustmentStage\('readingHeight'\);[\s\S]*lockingScrewProgressRef\.current = 0;[\s\S]*setLockingScrewProgress\(0\);[\s\S]*guideHeightReset\.startedHeightMm/,
  'a Guide height error should take exclusive control, clear both hands, restore the loose screw and scale view, and then reset height',
);
assert.match(
  previewSource,
  /const animateReset = \(nowMs: number\) => \{[\s\S]*const easedProgress = progress \* progress;[\s\S]*startedHeightMm \* \(1 - easedProgress\)[\s\S]*PISTON_EQUILIBRIUM_HEIGHT_MIN_MM[\s\S]*onGuideHeightResetCompleteRef\.current\?\.\(\)/,
  'the scripted Guide reset should animate to zero and complete without a catch branch',
);
assert.match(
  previewSource,
  /if \(!guideInteractionPaused\) return;[\s\S]*screwGuideGestureAuthorizedActionRef\.current = null;[\s\S]*const handleLockingScrewProgressDelta[\s\S]*if \(guideInteractionPaused\) return;/,
  'time freeze should revoke an authorized screw gesture so pointer capture cannot mutate the screw behind a lesson card',
);
assert.match(
  previewSource,
  /if \(spaceHeldRef\.current \|\| mouseHeldRef\.current\) return;[\s\S]*startPistonRebound\(trajectory,\s*releaseStartedAtMs\)/,
  'the piston must remain held until both simulated hands have released',
);
assert.match(
  previewSource,
  /const startPistonRebound = useCallback\(\(\s*trajectory: PistonOscillationTrajectory,\s*startedAtMs: number,[\s\S]*accumulatedPauseMsAtStart[\s\S]*const activePauseMs = guidePausedRef\.current[\s\S]*const elapsedMs = Math\.max\([\s\S]*nowMs[\s\S]*- startedAtMs[\s\S]*guideAccumulatedPauseMsRef\.current - accumulatedPauseMsAtStart[\s\S]*- activePauseMs/,
  'formal 3D rebound must use the shared release timestamp while excluding Guide pause time',
);
assert.match(
  previewSource,
  /const initialDisplacementMm = pistonOffsetMmRef\.current;[\s\S]*simulatePistonOscillationRelease\(\{[\s\S]*equilibriumHeightMm: pistonEquilibriumHeightMmRef\.current,[\s\S]*initialDisplacementMm,[\s\S]*\}\)/,
  'formal release must create one nonlinear trajectory from the live height and press depth',
);
assert.match(
  previewSource,
  /const releaseStartedAtMs = performance\.now\(\);[\s\S]*const releaseEvent: PistonOscillationReleaseEvent = \{[\s\S]*startedAtMs: releaseStartedAtMs,[\s\S]*trajectory,[\s\S]*\};[\s\S]*startPistonRebound\(trajectory,\s*releaseStartedAtMs\);/,
  'one release must publish and animate the same trajectory with the same startedAtMs origin',
);
assert.match(
  previewSource,
  /onLivePhysicalStateChange\?\.\(\{[\s\S]*observedAtMs: performance\.now\(\),[\s\S]*equilibriumHeightMm: pistonEquilibriumHeightMm,[\s\S]*displacementMm: pistonOffsetMm,[\s\S]*\}\)/,
  'the formal scene must publish the same live piston height and displacement used by its interaction model',
);
assert.match(
  previewSource,
  /getPistonOscillationTrajectorySampleAt\([\s\S]*trajectory,[\s\S]*elapsedSeconds[\s\S]*\.displacementM \* 1_000/,
  'formal rebound motion must be driven by the shared nonlinear trajectory',
);
assert.match(
  previewSource,
  /data-piston-focus-release-gap="true"/,
  'the shell should expose the final two-hand release gap for later quality modeling',
);
assert.match(
  previewSource,
  /export interface PistonOscillationGuideInstrumentSnapshot \{[\s\S]*hoseDragging: boolean;[\s\S]*lockingScrewState: 'loose' \| 'locked';[\s\S]*heightAdjustmentStage: PistonOscillationHeightAdjustmentStage;[\s\S]*pistonPhase: PistonInteractionPhase;/,
  'Guide snapshots must make the height-reading versus locking stage explicit',
);
assert.match(
  previewSource,
  /onGuideInstrumentSnapshotChangeRef\.current\?\.\(\{[\s\S]*hoseState,[\s\S]*hoseDragging,[\s\S]*lockingScrewState: lockingScrewClampState,[\s\S]*heightAdjustmentStage,[\s\S]*spaceHeld,[\s\S]*mouseHeld,[\s\S]*pistonPhase/,
  'every live instrument snapshot must publish the current height-adjustment stage',
);
assert.match(
  previewSource,
  /guideSnapTargetHeightMm: number \| null;[\s\S]*heightSnapped: false[\s\S]*rawHeightMm = clampPistonEquilibriumHeightMm[\s\S]*resolvePistonOscillationGuideHeightSnap\([\s\S]*rawHeightMm,[\s\S]*guideSnapTargetHeightMm,[\s\S]*dragRef\.current\.heightSnapped[\s\S]*onEquilibriumHeightChange\(snap\.heightMm\)/,
  'Guide height dragging should apply the reviewed hysteretic snap while preserving continuous raw dragging outside it',
);
assert.match(
  previewSource,
  /data-piston-focus-guide-snap-target-mm=\{guideSnapTargetHeightMm \?\? 'none'\}/,
  'the formal preview should expose the active Guide-only snap target for browser acceptance checks',
);
assert.match(
  previewSource,
  /data-piston-height-stage-action="true"[\s\S]*data-piston-guide-target="height-stage-action"[\s\S]*guideVisualCue === 'heightStageAction'[\s\S]*\? 'is-guide-highlighted'[\s\S]*attemptGuideAction\('confirmHeight'\)[\s\S]*interactionCopy\.confirmHeight/,
  'the height confirmation control must be the exact strong Guide target during scale reading',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-focus-panel button\.is-guide-highlighted\s*\{[\s\S]*background:\s*#0b7fc3;[\s\S]*color:\s*#ffffff;[\s\S]*opacity:\s*1;[\s\S]*piston-guide-height-stage-fill-pulse/,
  'the height confirmation target should retain a strong filled cue',
);
assert.match(
  previewCss,
  /\.piston-focus-interaction-focus-panel button\.is-guide-highlighted::after\s*\{[\s\S]*inset:\s*3px;[\s\S]*border:\s*2px solid rgba\(224, 242, 254, 0\.84\);[\s\S]*piston-guide-height-stage-outline-pulse/,
  'the height confirmation target should have its own closed inner outline',
);
assert.match(
  previewCss,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*button\.is-guide-highlighted,[\s\S]*button\.is-guide-highlighted::after \{[\s\S]*animation:\s*none;[\s\S]*button\.is-guide-highlighted::after \{[\s\S]*border-color:\s*#f0f9ff;[\s\S]*opacity:\s*1;/,
  'the exact height-action cue must remain visible while motion is reduced',
);

console.log('pistonOscillationFocusInteractionPreview tests passed');
