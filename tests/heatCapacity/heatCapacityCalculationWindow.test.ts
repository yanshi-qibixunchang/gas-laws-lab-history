import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityCalculationWindow.tsx',
), 'utf8');
const styleSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityCalculationWindow.css',
), 'utf8');

assert.match(
  componentSource,
  /session:\s*HeatCapacityCalculationWorkflowSession \| null/,
  'the calculation window should be driven by the persisted workflow session',
);
for (const callback of [
  'onDraftChange',
  'onSubmitStep',
  'onContinueAnswer',
  'onRevealAnswer',
  'onSelectGroup',
  'onSelectAggregate',
  'onCompleteAndExit',
  'onClose',
]) {
  assert.match(componentSource, new RegExp(`${callback}:`), `${callback} should be exposed as a prop`);
}

assert.match(componentSource, /role="dialog"[\s\S]*aria-modal="true"/, 'the window should be modal');
assert.match(
  componentSource,
  /const canDismiss = \([\s\S]*session\.status !== 'in-progress'[\s\S]*session\.presentation !== 'interactive'/,
  'interactive in-progress calculation should be non-dismissible',
);
assert.match(
  componentSource,
  /\{canDismiss \? \([\s\S]*className="studio-settings-close"/,
  'the close icon should only render after dismissal is unlocked',
);
assert.match(
  componentSource,
  /event\.target === event\.currentTarget\) handleDismiss\(\)/,
  'the backdrop should only route through the guarded dismiss behavior',
);
assert.match(componentSource, /判定说明：答案同时检查数值与规定精度/, 'the tolerance note should be shown at the top');

assert.match(componentSource, /session\.mode === 'free' \? \([\s\S]*studio-heat-calculation-tabs/, 'free mode should render group tabs');
assert.match(componentSource, /onClick=\{\(\) => onSelectGroup\(index\)\}/, 'group tabs should be selectable');
assert.match(componentSource, /onClick=\{onSelectAggregate\}/, 'the aggregate tab should be selectable');
assert.match(
  componentSource,
  /disabled=\{session\.status === 'in-progress' && !session\.aggregateSelected\}/,
  'the aggregate tab should remain locked until the workflow reaches it',
);

assert.match(styleSource, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/, 'known values should use four equal strips');
assert.match(
  componentSource,
  /const placeholderCount = 4 - row\.length[\s\S]*studio-heat-calculation-known-placeholder/,
  'a short known-value row should be padded on the left and therefore right-aligned',
);
assert.match(
  componentSource,
  /buildGuideKnownData[\s\S]*key: 'p0'[\s\S]*key: 's'/,
  'guide mode should expose only P0 and S in the rightmost two strips',
);
assert.match(
  styleSource,
  /--studio-heat-calculation-value-width[\s\S]*justify-content:\s*center/,
  'numeric cells should share the longest calculated width and center their values',
);
assert.match(styleSource, /\.studio-heat-calculation-known-label[\s\S]*justify-content:\s*flex-start/, 'variable labels should be left-aligned');

assert.match(
  componentSource,
  /getHeatCapacityCalculationWorkflowVisibleSteps\(session\)/,
  'calculation steps should progressively unfold from the workflow model',
);
assert.match(
  componentSource,
  /data-two-input-row=\{fields\.length === 2 \? 'true'/,
  'two-answer steps should remain in one explicit row',
);
assert.match(
  styleSource,
  /\.studio-heat-calculation-step-fields-two\s*\{\s*grid-template-columns:\s*repeat\(2,/,
  'two-answer formulas should use two same-row columns',
);
assert.match(styleSource, /\.studio-heat-calculation-formula\s*\{[\s\S]*white-space:\s*nowrap/, 'formula text must not wrap');
assert.doesNotMatch(
  styleSource,
  /@media[^{]*\{[\s\S]*studio-heat-calculation-step-fields-two[\s\S]*grid-template-columns:\s*1fr/,
  'responsive rules must not silently stack the approved two-formula row',
);
assert.match(
  styleSource,
  /\.studio-heat-calculation-steps\s*\{[\s\S]*overflow-y:\s*auto/,
  'the lower calculation area should scroll only when its content overflows',
);

assert.match(componentSource, /continueAnswer:\s*'继续作答'/, 'wrong answers should offer a concise retry action');
assert.match(componentSource, /revealAnswer:\s*'查看并继续'/, 'wrong answers should offer a concise reveal action');
assert.match(
  styleSource,
  /\.studio-heat-calculation-field-feedback\s*\{[\s\S]*min-height:[\s\S]*grid-template-columns:/,
  'each answer should reserve fixed status and reference space from first render',
);
assert.match(componentSource, /studio-heat-calculation-reference-success/, 'correct references should use success styling');
assert.match(componentSource, /studio-heat-calculation-reference-danger/, 'revealed references should use danger styling');
assert.match(styleSource, /\.studio-heat-calculation-field-danger input\s*\{[\s\S]*var\(--studio-danger\)/, 'wrong input should remain red');
assert.match(
  componentSource,
  /disabled=\{!interactive \|\| resolved \|\| field\.feedback !== null\}/,
  'resolved and read-only inputs should be non-editable',
);
assert.match(styleSource, /input:disabled\s*\{[\s\S]*background:\s*var\(--studio-surface-3\)/, 'read-only inputs should look gray');
assert.match(componentSource, /completeAndExit:\s*'完成并退出'/, 'the final action should require explicit completion');

console.log('heatCapacityCalculationWindow tests passed');
