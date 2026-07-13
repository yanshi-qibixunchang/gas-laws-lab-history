import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityInvalidAttemptDialog.tsx',
), 'utf8');
const styleSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityInvalidAttemptDialog.css',
), 'utf8');
const workbenchStyleSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'WorkbenchStudioPrototype.css',
), 'utf8');

assert.match(componentSource, /AlertTriangle/, 'invalid attempt dialog should use one standard warning icon');
assert.match(componentSource, /studio-heat-invalid-attempt-header/, 'dialog should use one compact title bar');
assert.match(
  componentSource,
  /data-heat-capacity-invalid-continue="true"[\s\S]*data-heat-capacity-invalid-reset="true"/,
  'secondary continue action should precede the recommended reset action',
);
assert.doesNotMatch(componentSource, /kicker|status/, 'removed duplicate status headings must not return');

assert.match(styleSource, /width:\s*min\(480px,/, 'engineering alert dialog should use the approved compact width');
assert.match(styleSource, /font-size:\s*15px;[\s\S]*font-weight:\s*600;/, 'dialog title should use the compact engineering hierarchy');
assert.match(styleSource, /font-size:\s*12px;[\s\S]*font-weight:\s*400;/, 'dialog body should use normal-weight desktop UI text');
assert.match(styleSource, /min-height:\s*30px;/, 'dialog actions should use compact desktop button height');
assert.match(styleSource, /\.studio-heat-invalid-attempt-primary[\s\S]*background:\s*var\(--studio-heat-focus-action-bg\)/, 'recommended reset should share the focus-exit action color');
assert.match(
  workbenchStyleSource,
  /\.studio-heat-focus-panel-actions button\s*\{[\s\S]*background:\s*var\(--studio-heat-focus-action-bg\)/,
  'focus-exit control should consume the same shared action color token',
);
assert.doesNotMatch(
  styleSource.match(/\.studio-heat-invalid-attempt-actions\s*\{[\s\S]*?\}/)?.[0] ?? '',
  /min-height|border-top|background/,
  'action row should not keep the removed fixed-height gray footer or divider',
);
assert.doesNotMatch(
  styleSource,
  /JetBrains Mono|Consolas|text-transform|letter-spacing|backdrop-filter|font-weight:\s*(800|900)/,
  'legacy instrument-panel typography and warning-card effects must be physically absent',
);

console.log('heatCapacityInvalidAttemptDialog tests passed');
