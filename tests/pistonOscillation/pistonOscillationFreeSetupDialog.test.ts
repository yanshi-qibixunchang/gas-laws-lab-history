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
const selectorSource = readFileSync(
  new URL('../../src/components/experiments/ExperimentCountSelector.tsx', import.meta.url),
  'utf8',
);
const selectorStyles = readFileSync(
  new URL('../../src/components/experiments/ExperimentCountSelector.css', import.meta.url),
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
  selectorSource,
  /type="text"[\s\S]*inputMode="numeric"[\s\S]*role="combobox"[\s\S]*aria-haspopup="listbox"/,
  'the count should support direct numeric entry and expose combobox semantics',
);
assert.match(
  dialogSource,
  /<ExperimentCountSelector[\s\S]*options=\{PISTON_OSCILLATION_FREE_COUNT_OPTIONS\}/,
  'Piston Oscillation should use the same shared count control as Heat Capacity',
);
assert.match(
  dialogSource,
  /onValidValueEnter=\{\(\) => \{[\s\S]*customInputRef\.current\?\.focus\(\)/,
  'pressing Enter after a valid experiment count should move to the custom-height input',
);
assert.match(
  dialogSource,
  /countPlaceholder:\s*'请选择实验次数'[\s\S]*countEmptyHint:\s*'可选择 3 至 6 次'/,
  'Piston setup should inherit the older Heat Capacity selector wording and hierarchy',
);
assert.match(
  selectorSource,
  /className="experiment-count-selector-menu"[\s\S]*role="listbox"[\s\S]*options\.map/,
  'the shared count control should offer a dropdown list',
);
assert.match(
  dialogSource,
  /useState\(''\)[\s\S]*nextCount === null \? '' : String\(nextCount\)/,
  'a first-time setup without saved targets should open with no count selected',
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
  /selectedCount === null \|\| \(!selected && selectionLimitReached\)[\s\S]*aria-disabled=\{selectionBlocked\}/,
  'height choices should wait for a valid count and prevent selections beyond that count',
);
assert.match(
  dialogSource,
  /disabled=\{!selectionComplete\}[\s\S]*onConfirm\([\s\S]*selectedHeightsMm[\s\S]*customHeightCandidatesMm/,
  'the dialog must not enter Free mode with an incomplete plan',
);
assert.match(
  dialogSource,
  /customHint:[\s\S]*10 至 80 mm 整数候选[\s\S]*addCustomHeight[\s\S]*isValidPistonOscillationFreeCustomHeightMm/,
  'custom candidates should accept only whole-number heights from 0 to 80 mm',
);
assert.match(
  dialogSource,
  /customHeightCandidatesMm\.map[\s\S]*data-height-source="custom"[\s\S]*data-non-recommended=\{nonRecommended \? 'true' : 'false'\}/,
  'custom candidates should remain independently selectable and mark values below 30 mm',
);

assert.match(
  dialogStyles,
  /\[data-selected='true'\][\s\S]*border-color: var\(--studio-accent-strong\)[\s\S]*box-shadow:/,
  'selected heights should use the outlined fit-row visual language',
);
assert.match(
  selectorStyles,
  /\.experiment-count-selector-menu\s*\{[\s\S]*position:\s*absolute;[\s\S]*overflow:\s*hidden;/,
  'the shared dropdown should render as a bounded overlay below the field',
);
assert.match(
  selectorStyles,
  /\.experiment-count-selector-unit\s*\{[\s\S]*padding-left:\s*10px;[\s\S]*padding-right:\s*14px;/,
  'the count unit should remain visually separated from the dropdown arrow',
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
  /<PistonOscillationFreeSetupDialog[\s\S]*initialTargetHeightsMm=[\s\S]*initialCustomHeightCandidatesMm=[\s\S]*onConfirm=\{\(targetHeightsMm, customHeightCandidatesMm\) => \{[\s\S]*activatePistonOscillationFreeMode\([\s\S]*targetHeightsMm,[\s\S]*customHeightCandidatesMm/,
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
