import fs from 'node:fs';
import assert from 'node:assert/strict';

const workbenchSource = fs.readFileSync('src/features/workbench/WorkbenchStudioPrototype.tsx', 'utf8');

assert.doesNotMatch(
  workbenchSource,
  /relativeGap\s*\*\s*100/,
  'Workbench ideal-gas relativeGap is already stored as percentage points and must not be multiplied by 100 for display.',
);

[
  'formatMetric(summary.relativeGap, 2)',
  'formatMetric(activeFile.latestPressureSummary.relativeGap, 2)',
  'formatMetric(point.relativeGap, 2)',
].forEach((displayExpression) => {
  assert.ok(
    workbenchSource.includes(displayExpression),
    `Workbench ideal-gas relativeGap should be displayed directly: ${displayExpression}`,
  );
});

console.log('workbenchIdealRelativeGapDisplay tests passed');


