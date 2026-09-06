const exportActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchExportActions.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchStandardResultsWindowSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStandardResultsWindow.tsx', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const idealResultsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchIdealResultsWindows.tsx', import.meta.url), 'utf8');
const standardFiguresSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStandardFiguresPanel.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /const idealPointCount = idealAnalysis\?\.sortedPoints\.length \?\? 0;/,
  'Ideal export readiness should derive from the recorded point count',
);

assert.match(
  exportActionsSource,
  /const isExportModeDataReady = \(mode: WorkbenchExportMode\) => \([\s\S]*?mode === 'pointsCsv' \|\| mode === 'completeBundle'[\s\S]*?idealPointCount > 0[\s\S]*?idealPointCount >= 2[\s\S]*?resultSummary\.ready[\s\S]*?\);/,
  'Export readiness should allow CSV or complete bundles with one ideal point and require two points for fitted ideal reports or figures',
);

for (const [mode, buttonLabel] of [
  ['completeBundle', 'Export All'],
  ['report', 'Report PDF'],
  ['verificationFigure', 'Verification Figure'],
  ['pointsCsv', 'Points CSV'],
]) {
  assert.ok(
    idealResultsSource.includes(`disabled={!isExportReady('${mode}') || exportInProgress}`),
    `${buttonLabel} should use per-export readiness instead of one shared result-ready flag`,
  );
}
assert.match(
  workbenchStandardResultsWindowSource,
  /figuresExportReady=\{isExportModeDataReady\('figuresZip'\)\}/,
  'Export Figures should receive its own readiness decision from the coordinator',
);
assert.match(
  standardFiguresSource,
  /disabled=\{!figuresExportReady \|\| exportInProgress\}/,
  'Export Figures should disable from its dedicated readiness property',
);

assert.doesNotMatch(
  source,
  /disabled=\{!currentResultsReady \|\| exportInProgress\}/,
  'Export buttons should not use one shared readiness flag for every export type',
);

assert.match(
  idealResultsSource,
  /onClick=\{\(\) => onExport\('completeBundle'\)\}[\s\S]*?\{workbenchCopy\.results\.exportAll\}[\s\S]*?onClick=\{\(\) => onExport\('report'\)\}[\s\S]*?\{workbenchCopy\.results\.reportPdf\}/,
  'Complete export should render immediately to the left of Report PDF in export action groups',
);

console.log('workbenchExportButtonReadiness tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchStandardResultsWindow \} from '\.\/WorkbenchStandardResultsWindow\.tsx';/);
