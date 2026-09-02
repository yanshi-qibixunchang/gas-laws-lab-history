import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panelSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStandardResultsContent.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(panelSource, /export const WorkbenchStandardResultsSummary/);
assert.match(panelSource, /export const WorkbenchStandardResultsDataTable/);
assert.match(panelSource, /resultSummary: WorkbenchResultSummary/);
assert.match(panelSource, /studio-result-status-ready/);
assert.match(panelSource, /studio-analysis-grid/);
assert.match(panelSource, /studio-data-table-section/);
assert.match(panelSource, /getLocalizedStatusValue\(resultSummary\.runState/);
assert.doesNotMatch(panelSource, /useEffect|useState|updateActiveFile|handleExportAction/);

assert.match(workbenchSource, /from '\.\/WorkbenchStandardResultsContent\.tsx'/);
assert.match(workbenchSource, /<WorkbenchStandardResultsSummary/);
assert.match(workbenchSource, /<WorkbenchStandardResultsDataTable/);
assert.doesNotMatch(workbenchSource, /const renderResultsSummary =/);
assert.doesNotMatch(workbenchSource, /const renderResultsDataTable =/);

console.log('workbenchStandardResultsContent tests passed');
