import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const previewSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationPreviewPlaceholder.tsx', import.meta.url),
  'utf8',
);
const realtimeSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationAcquisitionPanel.tsx', import.meta.url),
  'utf8',
);
const styleSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationPlaceholders.css', import.meta.url),
  'utf8',
);
const barrelSource = readFileSync(
  new URL('../../src/features/pistonOscillation/index.ts', import.meta.url),
  'utf8',
);

assert.match(previewSource, /export const PistonOscillationPreviewPlaceholder/);
assert.match(previewSource, /language: PistonOscillationLanguage/);
assert.match(previewSource, /data-piston-oscillation-preview-placeholder="true"/);
assert.match(previewSource, /role="status"/);
assert.match(previewSource, /aria-label=\{copy\.preview\.ariaLabel\}/);
assert.doesNotMatch(previewSource, /<button|onClick=|onPointer|onKeyDown=/);

assert.match(realtimeSource, /export const PistonOscillationAcquisitionPanel/);
assert.match(realtimeSource, /data-piston-acquisition-preview="true"/);
assert.match(realtimeSource, /data-acquisition-phase=\{effectivePhase\}/);
assert.match(realtimeSource, /demoFrame\?: PistonOscillationDemoFrame/);
assert.match(realtimeSource, /findPistonAcquisitionFallingTriggerSeconds/);
assert.match(realtimeSource, /handleStart/);
assert.match(realtimeSource, /handleStop/);

assert.match(styleSource, /\.piston-oscillation-preview-placeholder/);
assert.doesNotMatch(styleSource, /\.piston-oscillation-realtime-unavailable/);
assert.match(styleSource, /\.studio-theme-light \.piston-oscillation-placeholder/);
assert.match(styleSource, /var\(--studio-surface-2,\s*#262d35\)/);
assert.match(styleSource, /width:\s*100%/);
assert.match(styleSource, /height:\s*100%/);

assert.match(barrelSource, /PistonOscillationPreviewPlaceholder/);
assert.match(barrelSource, /PistonOscillationAcquisitionPanel/);
assert.doesNotMatch(barrelSource, /PistonOscillationRealtimeUnavailable/);
assert.match(barrelSource, /getPistonOscillationShellCopy/);

console.log('pistonOscillationPlaceholders tests passed');
