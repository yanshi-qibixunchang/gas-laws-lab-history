import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createPistonOscillationOperationCueSignature,
} from '../../src/features/pistonOscillation/pistonOscillationOperationVisualizationModel.ts';

const componentSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'pistonOscillation',
  'PistonOscillationOperationVisualization.tsx',
), 'utf8');
const workspaceCss = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'pistonOscillation',
  'PistonOscillationInteractionWorkspace.css',
), 'utf8');

assert.equal(
  createPistonOscillationOperationCueSignature({
    keys: ['space', 'mouseLeft'],
    mouseAction: 'moveDown',
  }),
  'space+mouseLeft:moveDown',
);
assert.equal(createPistonOscillationOperationCueSignature(null), '');

for (const requiredCopy of [
  '操作可视化',
  '操作視覺化',
  'Input Hints',
  'Shift 键',
  'Shift 鍵',
  'Shift key',
]) {
  assert.match(componentSource, new RegExp(requiredCopy));
}

assert.doesNotMatch(
  componentSource,
  /\bCtrl\b|Control key|滾輪左右|滚轮左右/,
  'the 3D operation visualization must not reintroduce removed Ctrl or wheel-tilt cues',
);
assert.match(
  componentSource,
  /data-piston-operation-visualization-toggle="true"[\s\S]*data-piston-operation-visualization-enabled=\{enabled \? 'true' : 'false'\}[\s\S]*aria-pressed=\{enabled\}[\s\S]*aria-disabled=\{disabled \|\| undefined\}[\s\S]*tabIndex=\{disabled \? -1 : undefined\}/,
  'the persisted file-level switch should preserve its visual state while leaving the focus order when unavailable',
);
assert.doesNotMatch(
  componentSource,
  /\sdisabled=\{disabled\}/,
  'focus transitions must not apply native disabled styling that redraws an ON switch as unavailable before it fades',
);
assert.match(
  workspaceCss,
  /\.studio-theme-light \.piston-operation-visualization-cue[\s\S]*@media \(prefers-reduced-motion: reduce\)[\s\S]*\.piston-operation-visualization-cue\.is-visible/,
  'operation cues should include light-theme and reduced-motion adaptations',
);

console.log('pistonOscillationOperationVisualization tests passed');
