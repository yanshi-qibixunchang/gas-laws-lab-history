import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /const idealPointCount = idealAnalysis\?\.sortedPoints\.length \?\? 0;/,
  'Ideal export readiness should derive from the recorded point count',
);

assert.match(
  source,
  /const isExportModeDataReady = \(mode: WorkbenchExportMode\) => \([\s\S]*?mode === 'pointsCsv'[\s\S]*?idealPointCount > 0[\s\S]*?idealPointCount >= 2[\s\S]*?resultSummary\.ready[\s\S]*?\);/,
  'Export readiness should allow CSV with one point and require two points for fitted ideal reports or figures',
);

for (const [mode, buttonLabel] of [
  ['report', 'Report PDF'],
  ['verificationFigure', 'Verification Figure'],
  ['pointsCsv', 'Points CSV'],
  ['figuresZip', 'Export Figures'],
]) {
  assert.ok(
    source.includes(`disabled={!isExportModeDataReady('${mode}') || exportInProgress}`),
    `${buttonLabel} should use per-export readiness instead of one shared result-ready flag`,
  );
}

assert.doesNotMatch(
  source,
  /disabled=\{!currentResultsReady \|\| exportInProgress\}/,
  'Export buttons should not use one shared readiness flag for every export type',
);

console.log('workbenchExportButtonReadiness tests passed');
