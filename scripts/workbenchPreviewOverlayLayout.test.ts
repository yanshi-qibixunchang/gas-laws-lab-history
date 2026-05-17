import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workbenchPath = join(root, 'components', 'WorkbenchStudioPrototype.tsx');
const scenePath = join(root, 'components', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const stylePath = join(root, 'components', 'WorkbenchStudioPrototype.css');
const motionPath = join(root, 'components', 'usePreviewOverlayMotion.ts');
const simulationCanvasPath = join(root, 'components', 'SimulationCanvas.tsx');

for (const path of [workbenchPath, scenePath, stylePath]) {
  assert.equal(existsSync(path), true, `${path} should exist`);
}

const workbenchSource = readFileSync(workbenchPath, 'utf8');
const sceneSource = readFileSync(scenePath, 'utf8');
const styleSource = readFileSync(stylePath, 'utf8');
const simulationCanvasSource = readFileSync(simulationCanvasPath, 'utf8');

const getCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleSource.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `${selector} should have a CSS block`);
  return match[0];
};

assert.match(styleSource, /--studio-preview-overlay-inset:\s*18px/, '3D overlays should use one shared 18px edge inset');
assert.match(styleSource, /--studio-preview-overlay-gap:\s*10px/, '3D overlays should use one shared inter-item gap');
assert.match(styleSource, /\.studio-preview-overlay-layer/, 'heat preview should define one overlay layer');
assert.match(styleSource, /\.studio-preview-overlay-slot-top-left/, 'overlay layer should expose a top-left slot');
assert.match(styleSource, /\.studio-preview-overlay-slot-top-right/, 'overlay layer should expose a top-right slot');
assert.match(styleSource, /\.studio-preview-overlay-slot-bottom-left/, 'overlay layer should expose a bottom-left slot');
assert.match(styleSource, /\.studio-preview-overlay-slot-bottom-right/, 'overlay layer should expose a bottom-right slot');
assert.match(styleSource, /\.studio-preview-overlay-center/, 'overlay layer should expose a center prompt slot');

assert.equal(existsSync(motionPath), true, 'overlay motion hook should exist');
const motionSource = readFileSync(motionPath, 'utf8');
assert.match(motionSource, /usePreviewOverlayMotion/, 'motion hook should be named usePreviewOverlayMotion');
assert.match(motionSource, /data-preview-overlay-item/, 'motion hook should animate stable overlay item keys');
assert.match(motionSource, /prefers-reduced-motion:\s*reduce/, 'motion hook should respect reduced motion preferences');
assert.match(motionSource, /OVERLAY_MOTION_DURATION_MS\s*=\s*200/, 'displaced overlay items should use a short engineering motion duration');
assert.match(motionSource, /cubic-bezier\(0\.2,\s*0,\s*0,\s*1\)/, 'displaced overlay items should avoid elastic easing');
assert.match(motionSource, /activeAnimationsRef/, 'motion hook should track active FLIP animations per overlay item');
assert.match(motionSource, /getOverlayLayoutRect/, 'motion hook should measure stable layout rects instead of animated visual rects');
assert.doesNotMatch(motionSource, /nextRects\.set\(key,\s*item\.getBoundingClientRect\(\)\)/, 'motion hook must not store animated visual rects as the next layout baseline');
assert.match(motionSource, /\.cancel\(\)/, 'motion hook should cancel an old FLIP animation before replacing it');
assert.match(motionSource, /animation\.finished/, 'motion hook should clean up active animation state after FLIP completes');

assert.match(sceneSource, /overlayTopLeft\?:\s*React\.ReactNode/, 'instrument scene should accept top-left overlays from the parent');
assert.match(sceneSource, /overlayTopRight\?:\s*React\.ReactNode/, 'instrument scene should accept top-right overlays from the parent');
assert.match(sceneSource, /overlayBottomRight\?:\s*React\.ReactNode/, 'instrument scene should accept bottom-right overlays from the parent');
assert.match(sceneSource, /overlayCenter\?:\s*React\.ReactNode/, 'instrument scene should accept center overlays from the parent');
assert.match(sceneSource, /overlayBottomCenter\?:\s*React\.ReactNode/, 'instrument scene should accept bottom-center overlays from the parent');
assert.match(sceneSource, /usePreviewOverlayMotion/, 'instrument scene should animate displaced overlay items');
assert.match(sceneSource, /studio-preview-overlay-slot-top-left/, 'instrument scene should render top-left overlay slot');
assert.match(sceneSource, /data-preview-overlay-item="heat-hard-sphere-toggle"/, 'hard-sphere toggle should be a tracked overlay item');
assert.match(sceneSource, /data-heat-capacity-hard-sphere-tooltip="true"/, 'hard-sphere explanation should render as a hover or focus tooltip');
assert.doesNotMatch(sceneSource, /data-heat-capacity-hard-sphere-note="true"/, 'hard-sphere explanation should not render as a persistent overlay note');
assert.match(sceneSource, /data-preview-overlay-item="heat-focus-panel"/, 'focus panel should be a tracked overlay item');
assert.match(sceneSource, /data-preview-overlay-item="heat-view-reset"/, 'reset action should be a tracked overlay item');

assert.match(workbenchSource, /overlayTopLeft=\{heatCapacityTopLeftOverlay\}/, 'workbench should pass top-left overlay content into the heat scene');
assert.match(workbenchSource, /overlayTopRight=\{heatCapacityTopRightOverlay\}/, 'workbench should pass top-right overlay content into the heat scene');
assert.match(workbenchSource, /overlayBottomRight=\{heatCapacityBottomRightOverlay\}/, 'workbench should pass bottom-right overlay content into the heat scene');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}/, 'workbench should pass centered prompts into the heat scene');
assert.match(workbenchSource, /overlayBottomCenter=\{heatCapacityBottomCenterOverlay\}/, 'workbench should pass bottom-centered prompts into the heat scene');
assert.doesNotMatch(workbenchSource, /heatCapacityFocusPanelHeightPx/, 'focus panel height should not be measured as a one-off layout workaround');
assert.doesNotMatch(workbenchSource, /document\.querySelector<HTMLElement>\('\[data-heat-capacity-focus-panel\]'\)/, 'workbench should not query the scene DOM to make sibling overlays move');
assert.doesNotMatch(workbenchSource, /--heat-record-focus-offset/, 'record controls should move through the shared overlay stack, not a focus-only CSS variable');

assert.match(styleSource, /\.simulation-canvas-workbench-frame[\s\S]*--studio-preview-overlay-inset/, 'standard workbench 3D canvas should inherit the shared overlay inset');
assert.doesNotMatch(getCssBlock('.simulation-canvas-workbench-tools'), /top:\s*8px/, 'standard 3D tools should not use the old 8px top inset');
assert.doesNotMatch(getCssBlock('.simulation-canvas-workbench-hint'), /left:\s*8px/, 'standard 3D hint should not use the old 8px left inset');
assert.doesNotMatch(simulationCanvasSource, /cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/, 'standard 3D canvas floating tools should not keep overshooting motion curves');

assert.doesNotMatch(getCssBlock('.studio-heat-hard-sphere-toggle'), /position:\s*absolute/, 'hard-sphere toggle should be positioned by its slot');
assert.match(styleSource, /@keyframes studioOverlayEnterLeft/, 'left-side overlays should have a left-in motion rule');
assert.match(styleSource, /@keyframes studioOverlayExitLeft/, 'left-side overlays should have a left-out motion rule');
assert.match(styleSource, /@keyframes studioOverlayEnterRight/, 'right-side overlays should have a right-in motion rule');
assert.match(styleSource, /@keyframes studioOverlayExitRight/, 'right-side overlays should have a right-out motion rule');
assert.match(styleSource, /@keyframes studioOverlayBottomCenterIn/, 'bottom-centered messages should float in from below');
assert.match(styleSource, /@keyframes studioOverlayBottomCenterOut/, 'bottom-centered messages should fade out downward');
assert.match(styleSource, /@keyframes studioOverlayFadeIn/, 'centered messages should use fade-only entry');
assert.match(styleSource, /@keyframes studioOverlayFadeOut/, 'centered messages should use fade-only exit');
assert.doesNotMatch(getCssBlock('.studio-heat-focus-panel'), /right:\s*14px/, 'focus panel should be positioned by its slot');
assert.doesNotMatch(getCssBlock('.studio-heat-demo-step-panel'), /top:\s*48px/, 'demo step panel should be positioned by its slot');
