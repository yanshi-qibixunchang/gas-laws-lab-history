import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyProps } from '@react-three/fiber';
import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import {
  getPistonOscillationAutomaticOperationMirrorView,
  getPistonOscillationOperationMirrorRaycast,
  togglePistonOscillationOperationMirrorView,
  type PistonOscillationAutomaticOperationMirrorState,
} from '../../src/features/pistonOscillation/pistonOscillationOperationMirror.ts';

const interactionTarget = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
const pointerRaycaster = new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1));
for (const interactionEnabled of [true, false, true, false, true]) {
  applyProps(interactionTarget, {
    raycast: getPistonOscillationOperationMirrorRaycast(interactionEnabled),
  });
  assert.equal(typeof interactionTarget.raycast, 'function');
  assert.equal(
    pointerRaycaster.intersectObject(interactionTarget).length > 0,
    interactionEnabled,
    'closing a Guide explanation must restore pointer hits after repeated disable/enable transitions',
  );
}
interactionTarget.geometry.dispose();
interactionTarget.material.dispose();

const automaticView = (
  overrides: Partial<PistonOscillationAutomaticOperationMirrorState> = {},
) => getPistonOscillationAutomaticOperationMirrorView({
  hoseConnected: false,
  lockingScrewLocked: false,
  screwDragging: false,
  heightAdjustmentStage: 'readingHeight',
  ...overrides,
});

assert.equal(
  automaticView(),
  'scaleReadingView',
  'an open, unsupported height adjustment must show the scale-reading mirror',
);
assert.equal(
  automaticView({ heightAdjustmentStage: 'readingHeight' }),
  'scaleReadingView',
  'the scale must remain visible throughout the explicit reading-height stage',
);
assert.equal(
  automaticView({ hoseConnected: true }),
  'screwOperationView',
  'a mouse-only press attempt with the hose connected must keep the screw mirror visible',
);
for (const state of [
  { heightAdjustmentStage: 'lockingHeight' as const },
  { lockingScrewLocked: true },
  { hoseConnected: true },
  { screwDragging: true },
]) {
  assert.equal(
    automaticView(state),
    'screwOperationView',
    'confirming the height, locking, connecting, or turning the screw must show the screw mirror',
  );
}
assert.equal(togglePistonOscillationOperationMirrorView('scaleReadingView'), 'screwOperationView');
assert.equal(togglePistonOscillationOperationMirrorView('screwOperationView'), 'scaleReadingView');

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
const sceneSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationInstrumentScene.tsx',
  ),
  'utf8',
);
const acquisitionSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'pistonOscillation',
    'PistonOscillationAcquisitionPanel.tsx',
  ),
  'utf8',
);
const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);

assert.match(
  workspaceSource,
  /formalHeightAdjustmentActive = !demoActive[\s\S]*mode === 'pistonFocus'[\s\S]*hoseState === 'disconnected'[\s\S]*heightFollowingActive = formalHeightAdjustmentActive/,
  'the formal piston focus must continuously follow height only while its hose is disconnected',
);
assert.match(
  workspaceSource,
  /getPistonOscillationAutomaticOperationMirrorView\(\{[\s\S]*hoseConnected: hoseState === 'connected'[\s\S]*lockingScrewLocked[\s\S]*screwDragging[\s\S]*heightAdjustmentStage/,
  'the formal mirror selection must use the explicit height-adjustment stage and instrument state',
);
assert.match(
  workspaceSource,
  /operationMirrorViewOverride\?\.automaticView === automaticOperationMirrorView[\s\S]*demoFrame\?\.operationMirrorView[\s\S]*currentOperationMirrorViewOverride[\s\S]*automaticOperationMirrorView[\s\S]*scaleReadingOperationMirrorActive = operationMirrorView === 'scaleReadingView'[\s\S]*screwOperationMirrorActive = operationMirrorView === 'screwOperationView'/,
  'Demo may stage a deliberate mirror transition while ordinary interaction still follows the current Shift override or automatic instrument state',
);
const shiftShortcutStart = workspaceSource.indexOf('const handleOperationMirrorShortcut');
const shiftShortcutEnd = workspaceSource.indexOf(
  "window.addEventListener('keydown', handleOperationMirrorShortcut);",
  shiftShortcutStart,
);
assert.ok(
  shiftShortcutStart >= 0 && shiftShortcutEnd > shiftShortcutStart,
  'the Shift operation-mirror shortcut should remain independently reviewable',
);
const shiftShortcutSource = workspaceSource.slice(shiftShortcutStart, shiftShortcutEnd);
assert.match(
  shiftShortcutSource,
  /event\.key !== 'Shift'[\s\S]*event\.repeat[\s\S]*event\.ctrlKey[\s\S]*event\.metaKey[\s\S]*event\.altKey[\s\S]*isEditableKeyboardTarget\(event\.target\)[\s\S]*mouseHeldRef\.current[\s\S]*hoseDragging[\s\S]*screwDragging[\s\S]*setOperationMirrorViewOverride[\s\S]*togglePistonOscillationOperationMirrorView\(operationMirrorView\)/,
  'Shift must switch only the operation-mirror presentation while ignoring repeats, modifiers, editors, and active drags',
);
assert.doesNotMatch(
  shiftShortcutSource,
  /spaceHeldRef|onGuideActionAttempt|platformMode|setHeightAdjustmentStage/,
  'Shift mirror switching must not require Space, disable Guide, or mutate the semantic height-adjustment stage',
);
assert.match(
  workspaceSource,
  /handledMeasurementCycleRevisionRef\.current === measurementCycleRevision[\s\S]*setHeightAdjustmentStage\('readingHeight'\)/,
  'a new measurement-cycle revision must restore scale reading as the next height-adjustment stage',
);
assert.match(
  workspaceSource,
  /heightStageActionEnabled = heightStageActionVisible[\s\S]*onGuideActionAttempt \? true : spaceHeld && !mouseHeld[\s\S]*!hoseDragging[\s\S]*!screwDragging[\s\S]*data-piston-height-stage-action="true"[\s\S]*attemptGuideAction\('confirmHeight'\)[\s\S]*interactionCopy\.confirmHeight[\s\S]*interactionCopy\.returnScale/,
  'the focus panel must expose a reversible height action whose Guide path reports invalid handoff attempts instead of disabling feedback',
);
assert.match(
  workspaceSource,
  /screwDragStartProgressRef\.current = lockingScrewProgressRef\.current[\s\S]*loosenedDuringGesture[\s\S]*hoseState === 'disconnected'[\s\S]*setHeightAdjustmentStage\('readingHeight'\)/,
  'loosening the disconnected apparatus must return to scale reading after the screw gesture ends',
);
assert.doesNotMatch(
  workspaceSource,
  /key=\{operationMirrorView\}|orthographic=\{scaleReadingOperationMirrorActive\}/,
  'changing mirror type must not remount the operation-mirror Canvas',
);
assert.match(
  workspaceSource,
  /className="piston-focus-interaction-operation-mirror-canvas"[\s\S]*frameloop="demand"[\s\S]*<group visible=\{screwOperationMirrorActive\}>[\s\S]*operationMirrorView="screwOperationView"[\s\S]*<group visible=\{scaleReadingOperationMirrorActive\}>[\s\S]*scaleReadingVisualEnhancement[\s\S]*operationMirrorView="scaleReadingView"[\s\S]*<PerspectiveCamera[\s\S]*makeDefault=\{screwOperationMirrorActive\}[\s\S]*<OrthographicCamera[\s\S]*makeDefault=\{scaleReadingOperationMirrorActive\}/,
  'one demand-rendered resident Canvas must switch between preloaded normal and scale-enhanced models plus persistent cameras',
);
const screwModelGroup = workspaceSource.match(
  /<group visible=\{screwOperationMirrorActive\}>([\s\S]*?)<\/group>/,
)?.[1] ?? '';
assert.doesNotMatch(
  screwModelGroup,
  /scaleReadingVisualEnhancement/,
  'the preloaded screw-operation model must retain the original non-enhanced materials',
);
assert.match(
  workspaceSource,
  /OperationMirrorFrameReadyBridge[\s\S]*reportedViewRef[\s\S]*onFrameReady\(view\)[\s\S]*operationMirrorModelsReady[\s\S]*operationMirrorRenderedView === operationMirrorView[\s\S]*data-piston-focus-operation-mirror-ready/,
  'the resident mirror should not reveal its first frame before both prepared models and the selected camera have rendered',
);
assert.match(
  workspaceSource,
  /screwOperationMirrorActive \? \([\s\S]*<OperationMirrorScrewControl[\s\S]*interactionEnabled=\{!demoActive && !guideInteractionPaused\}/,
  'the screw center tracker should remain mounted in Demo while its interaction target stays disabled during Demo, Guide pause, or recovery explanation',
);
assert.match(
  workspaceSource,
  /interactionEnabled\?: boolean;[\s\S]*onHitPointReady\(\[projectedCenter\.x, projectedCenter\.y\]\)[\s\S]*raycast=\{getPistonOscillationOperationMirrorRaycast\(interactionEnabled\)\}/,
  'a disabled Demo screw target should still report the projected knob center without intercepting pointer input',
);
assert.match(
  workspaceSource,
  /data-piston-focus-main-camera=[\s\S]*heightFollowingActive \? 'heightAdjustmentFocus' : mode[\s\S]*data-piston-focus-height-adjustment-stage=\{heightAdjustmentStage\}[\s\S]*data-piston-focus-operation-mirror-selection="height-adjustment-stage"/,
  'the formal scene must expose main-camera and mirror-selection state for deterministic review',
);

assert.match(sceneSource, /measurementCycleRevision=\{measurementCycleRevision\}/);
assert.match(
  sceneSource,
  /viewportWarningFeedbackId\?: string \| null[\s\S]*viewportWarningFeedbackId=\{viewportWarningFeedbackId\}/,
  'the formal scene shell must forward the shared warning-feedback identity into the 3D workspace',
);
assert.match(
  workspaceSource,
  /nextWarningFeedbackId = viewportWarningFeedbackId[\s\S]*demoFeedbackMessage\?\.kind === 'warning'[\s\S]*setViewportWarningShakeRevision[\s\S]*data-piston-viewport-warning-shake-revision=\{viewportWarningShakeRevision\}/,
  'every new shared warning must trigger one deterministic 3D-workspace shake revision',
);
assert.match(
  workspaceCss,
  /\.piston-oscillation-interaction-stage\.is-viewport-warning-shaking-0[\s\S]*piston-viewport-warning-shake-a 320ms[\s\S]*\.piston-oscillation-interaction-stage\.is-viewport-warning-shaking-1[\s\S]*piston-viewport-warning-shake-b 320ms/,
  'alternating warning animation names must replay the same viewport shake for consecutive warnings',
);
assert.match(acquisitionSource, /onRunRetained\?: \(\) => void[\s\S]*onRunRetained\?\.\(\)/);
assert.match(
  workbenchSource,
  /pistonOscillationMeasurementCyclesByFileId[\s\S]*measurementCycleRevision=\{[\s\S]*pistonOscillationMeasurementCyclesByFileId\[activeFile\.id\][\s\S]*onRunRetained=\{\(\) => \{[\s\S]*\(current\[activeFile\.id\] \?\? 0\) \+ 1/,
  'retaining a run must advance the formal measurement-cycle revision that clears Shift override',
);
assert.match(
  workbenchSource,
  /viewportWarningFeedbackId=\{[\s\S]*pistonOscillationGuideFeedback\?\.kind === 'warning'[\s\S]*pistonOscillationGuideFeedback\.id/,
  'warning prompts from both 3D and acquisition controls must share the same viewport-shake channel',
);

console.log('pistonOscillationOperationMirror tests passed');
