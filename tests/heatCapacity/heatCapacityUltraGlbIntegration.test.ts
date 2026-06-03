import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const scenePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const ultraModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx');
const runtimeGlbPath = join(process.cwd(), 'public', 'models', 'heat-capacity', 'fd-ncd-c-ultra.glb');
const workbenchPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx');

assert.equal(existsSync(runtimeGlbPath), true, 'Ultra GLB runtime asset should be available under public/models');
assert.equal(existsSync(ultraModelPath), true, 'Ultra GLB adapter component should exist');

const sceneSource = readFileSync(scenePath, 'utf8');
const ultraModelSource = readFileSync(ultraModelPath, 'utf8');
const workbenchSource = readFileSync(workbenchPath, 'utf8');

assert.match(
  sceneSource,
  /import HeatCapacityUltraInstrumentModel from '\.\/HeatCapacityUltraInstrumentModel';/,
  'Heat Capacity scene should import the Ultra GLB adapter',
);
assert.match(
  sceneSource,
  /const proceduralSceneContent = \([\s\S]*<InstrumentSceneContent[\s\S]*const instrumentSceneContent = props\.performanceMode === 'ultra'[\s\S]*<HeatCapacityUltraInstrumentModel[\s\S]*: proceduralSceneContent/,
  'Heat Capacity scene should render the Ultra GLB adapter only for the ultra performance mode and keep the procedural fallback for other modes',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraModelErrorBoundary fallback=\{proceduralSceneContent\}>[\s\S]*<Suspense fallback=\{proceduralSceneContent\}>/,
  'Ultra GLB should retain the procedural fallback when the model fails or is still loading',
);

[
  'fd-ncd-c-ultra.glb',
  'FD_NCD_C_PowerSwitch_Base',
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_ZeroAdjustKnob',
  'Stopcock_Pivot',
  'InletValue_Pivot',
  'Pump_Bulb',
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_PressureGauge_NeedlePivot',
  'HSL_Stopcock_OpenPath_Glow',
  'HSL_Stopcock_ClosedBlocker_Mark',
].forEach((requiredToken) => {
  assert.match(
    ultraModelSource,
    new RegExp(requiredToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB display adapter should bind ${requiredToken}`,
  );
});

assert.match(
  ultraModelSource,
  /getPressureGaugeNeedleRotation[\s\S]*modelPressureGaugeAngleToVisualAngle/,
  'Ultra pressure gauge needle should reuse the shared pressure gauge contract mapping',
);
assert.match(
  ultraModelSource,
  /props\.powerOn \? formatSignal\(props\.temperatureSignalMv\) : ''[\s\S]*props\.powerOn \? formatSignal\(props\.pressureSignalMv\) : ''/,
  'Ultra digital display should blank dynamic signal values when power is off while keeping the fixed nameplate in the model',
);
assert.match(
  ultraModelSource,
  /STOPCOCK_VISUAL_SMOOTHING_RATE[\s\S]*PUMP_VALVE_VISUAL_SMOOTHING_RATE[\s\S]*POWER_SWITCH_VISUAL_SMOOTHING_RATE/,
  'Ultra visual state may keep model-side smoothing for read-only state updates',
);
assert.match(
  ultraModelSource,
  /POWER_SWITCH_OFF_ROTATION_RAD[\s\S]*POWER_SWITCH_ON_ROTATION_RAD[\s\S]*applyLocalAxisRotation\([\s\S]*'FD_NCD_C_PowerSwitch_Button'[\s\S]*new THREE\.Vector3\(1, 0, 0\)[\s\S]*powerSwitchDisplayedRotationRef\.current/,
  'Ultra power switch should remain a rendered vertical rocker state, even while user control is deferred',
);
assert.match(
  ultraModelSource,
  /HSL_Stopcock_OpenPath_Glow'[\s\S]*HSL_Stopcock_ClosedBlocker_Mark'[\s\S]*openPathGlow\.visible = stopcockOpen[\s\S]*closedBlockerMark\.visible = !stopcockOpen/,
  'Ultra stopcock open/check and closed/cross markers should be mutually exclusive and tied to the actual stopcock state',
);

[
  'UltraPointerControl',
  'PointerLikeEvent',
  'ValveFocusControl',
  'UltraPointerHitCandidate',
  'UltraRollbackOffsets',
  'createInteractiveBox',
  'resolveUltraPointerControlHit',
  'getPointerControlHit',
  'raycasterRef',
  'pointerNdcRef',
  'hitPointRef',
  'rollbackOffsetsRef',
  'NATIVE_CONTROL_SINGLE_CLICK_DELAY_MS',
  'PUMP_VALVE_OVERLAP_PRIORITY_DISTANCE_EPSILON',
  'ULTRA_ROLLBACK_ANIMATION_MS',
  'gl.domElement.addEventListener',
  'HSL_UltraMeshHitbox_',
].forEach((forbiddenToken) => {
  assert.doesNotMatch(
    ultraModelSource,
    new RegExp(forbiddenToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB display adapter should not keep deferred interaction token ${forbiddenToken}`,
  );
});

[
  'interactionLocked',
  'demoFocusControlId',
  'demoFocusPulseActive',
  'manualRollbackAnimation',
  'manualRollbackKey',
  'focusMode',
  'hoveredControl',
  'setHoveredControl',
  'onFocus',
  'onValveFocusAnchor',
  'onPowerToggle',
  'onStopcockOpenChange',
  'onPressureZeroFineAdjust',
  'onPressureZeroCoarseAdjust',
  'onPumpValveToggle',
  'onPumpBulbPress',
  'onLockedInteraction',
].forEach((forbiddenProp) => {
  assert.doesNotMatch(
    ultraModelSource,
    new RegExp(`${forbiddenProp}[?:]`),
    `Ultra GLB props should not expose ${forbiddenProp} until the interaction contract is rebuilt`,
  );
});

assert.doesNotMatch(
  sceneSource,
  /ULTRA_FOCUS_VIEWS/,
  'Ultra mode should not keep dedicated focus camera views while focus integration is deferred',
);
assert.doesNotMatch(
  sceneSource,
  /focusViews=\{props\.performanceMode === 'ultra'\s*\?\s*ULTRA_FOCUS_VIEWS\s*:\s*PROCEDURAL_FOCUS_VIEWS\}/,
  'Camera rig should not switch to Ultra-specific focus views while focus integration is deferred',
);
assert.match(
  sceneSource,
  /const orbitControlsEnabled = props\.performanceMode === 'ultra'\s*\?\s*true\s*:\s*focusMode === 'none' && !props\.interactionLocked;/,
  'Ultra mode should keep orbit controls available while demo, guide, and focus integration are deferred',
);
assert.match(
  workbenchSource,
  /const heatCapacityUltraModelIntegrationReady = false;/,
  'Workbench should keep an explicit gate for temporarily disabling Demo and Guide while Ultra GLB model integration is incomplete',
);
assert.match(
  workbenchSource,
  /const heatCapacityTeachingModesAvailable = settingsPerformanceMode !== 'ultra' \|\| heatCapacityUltraModelIntegrationReady;/,
  'Workbench should keep Demo and Guide available for procedural skeleton modes while Ultra GLB integration is incomplete',
);
assert.match(
  workbenchSource,
  /heatCapacityTeachingModesAvailable \? runHeatCapacityAutoDemo\(\) : enterHeatCapacityFreeMode\(\)/,
  'Demo mode should run for procedural skeleton modes and route back to Free mode for deferred Ultra GLB mode',
);
assert.match(
  workbenchSource,
  /heatCapacityTeachingModesAvailable \? startHeatCapacityManualExperiment\(\) : enterHeatCapacityFreeMode\(\)/,
  'Guide mode should run for procedural skeleton modes and route back to Free mode for deferred Ultra GLB mode',
);
assert.match(
  workbenchSource,
  /if \(heatCapacityTeachingModesAvailable\) return;[\s\S]*activeFile\.kind !== 'heatCapacity' \|\| activeFile\.heatCapacityMode === 'free'[\s\S]*enterHeatCapacityFreeMode\(\);/,
  'Workbench should normalize stale Demo or Guide heat-capacity files back to Free mode only while the active model cannot support those modes',
);
assert.match(
  workbenchSource,
  /const heatCapacityDeferredModeDisabled = !heatCapacityTeachingModesAvailable;/,
  'Mode buttons should only be disabled when the active heat-capacity model cannot support Demo or Guide',
);
assert.doesNotMatch(
  workbenchSource,
  /const heatCapacityDeferredModeDisabled = !heatCapacityUltraModelIntegrationReady;/,
  'Mode buttons should not stay globally disabled just because Ultra GLB mode is still deferred',
);

console.log('heatCapacityUltraGlbIntegration tests passed');
