import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dialogSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationFreeSetupDialog.tsx', import.meta.url),
  'utf8',
);
const dialogStyles = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationFreeSetupDialog.css', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

const sourceSlice = (start: string, end: string) => {
  const startIndex = workbenchSource.indexOf(start);
  const endIndex = workbenchSource.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return workbenchSource.slice(startIndex, endIndex);
};

assert.match(
  dialogSource,
  /PISTON_OSCILLATION_FREE_COUNT_OPTIONS = \[3, 4, 5, 6\] as const/,
  'Free mode should accept only 3–6 planned measurements',
);
assert.match(
  dialogSource,
  /type="text"[\s\S]*inputMode="numeric"[\s\S]*role="combobox"[\s\S]*aria-haspopup="listbox"/,
  'the count should support direct numeric entry and expose combobox semantics',
);
assert.match(
  dialogSource,
  /studio-piston-free-count-menu"[\s\S]*role="listbox"[\s\S]*PISTON_OSCILLATION_FREE_COUNT_OPTIONS\.map/,
  'the same count control should offer a dropdown list',
);
assert.match(
  dialogSource,
  /PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM\.map[\s\S]*aria-pressed=\{selected\}[\s\S]*data-piston-free-height-mm=\{heightMm\}[\s\S]*data-selected=\{selected \? 'true' : 'false'\}/,
  'all six formal heights should be direct pressable selections',
);
assert.match(
  dialogSource,
  /selectedCount - selectedHeightsMm\.length[\s\S]*selectionDelta === 0[\s\S]*isValidPistonOscillationFreeExperimentPlan\(selectedHeightsMm\)/,
  'confirmation should require the selected height total to equal the entered count',
);
assert.match(
  dialogSource,
  /selectedCount === null \|\| \(!selected && selectionLimitReached\)[\s\S]*disabled=\{disabled\}/,
  'height choices should wait for a valid count and prevent selections beyond that count',
);
assert.match(
  dialogSource,
  /disabled=\{!selectionComplete\}[\s\S]*onConfirm\(selectedHeightsMm\)/,
  'the dialog must not enter Free mode with an incomplete plan',
);

assert.match(
  dialogStyles,
  /\[data-selected='true'\][\s\S]*border-color: var\(--studio-accent-strong\)[\s\S]*box-shadow:/,
  'selected heights should use the outlined fit-row visual language',
);
assert.match(
  dialogStyles,
  /studio-piston-free-count-combobox-open \.studio-piston-free-count-menu[\s\S]*pointer-events: auto[\s\S]*visibility: visible/,
  'the dropdown should become interactive only while open',
);
assert.match(
  dialogStyles,
  /\.studio-piston-free-count-combobox > span \{[\s\S]*padding: 0 12px 0 4px;/,
  'the count unit should sit left of the dropdown divider with deliberate right-side whitespace',
);

const modeControlSource = sourceSlice(
  'const renderPistonOscillationModeControl = () => {',
  'const renderPistonOscillationGuideStepPanel = () => {',
);
assert.match(
  modeControlSource,
  /const startFree = \(\) => \{[\s\S]*requestFreeSetup[\s\S]*data-piston-oscillation-mode="free"[\s\S]*onClick=\{startFree\}/,
  'the Piston Free button should now open setup instead of remaining disabled',
);
assert.doesNotMatch(
  modeControlSource,
  /data-piston-oscillation-mode="free"[\s\S]{0,240}(?:disabled|labels\.unavailable)/,
  'the Free button should no longer carry the old unavailable state',
);
assert.match(
  modeControlSource,
  /const exitFree = \(\) => \{[\s\S]*pausePistonOscillationFreeMode\(\)[\s\S]*data-piston-oscillation-mode-action="exit-free"/,
  'an active Free session should remain selected until explicitly exited',
);

assert.match(
  workbenchSource,
  /<PistonOscillationFreeSetupDialog[\s\S]*initialTargetHeightsMm=[\s\S]*onConfirm=\{\(targetHeightsMm\) => \{[\s\S]*activatePistonOscillationFreeMode\(targetHeightsMm\)/,
  'the confirmed plan should be passed into the persisted Free session',
);
assert.match(
  workbenchSource,
  /startPistonOscillationFreeWorkbenchState\(nextFile, nowMs\)[\s\S]*type: 'setPlan'[\s\S]*targetHeightsMm/,
  'Free activation should start the session before storing its selected plan',
);
assert.match(
  workbenchSource,
  /pistonOscillationFreeSession\.status === 'active'[\s\S]*type: 'setPower'/,
  'Free-mode power changes should be persisted and audited',
);

console.log('pistonOscillationFreeSetupDialog tests passed');
