import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatMaybeMetric,
  formatMetric,
  formatPercent,
  getCompactHistogramBins,
  getLocalizedStatusValue,
} from '../../src/features/workbench/workbenchPresentationFormatting.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';

assert.equal(formatMetric(1.23456, 2), '1.23');
assert.equal(formatMetric(Number.POSITIVE_INFINITY), '--');
assert.equal(formatMaybeMetric(null), '--');
assert.equal(formatMaybeMetric(2.3456, 3), '2.346');
assert.equal(formatPercent(-1), '0%');
assert.equal(formatPercent(0.456), '46%');
assert.equal(formatPercent(2), '100%');
assert.equal(getLocalizedStatusValue('running', workbenchCopies.en), workbenchCopies.en.status.runStates.running);
assert.equal(getLocalizedStatusValue(undefined, workbenchCopies.en), workbenchCopies.en.status.none);

const bins = Array.from({ length: 40 }, (_, index) => ({
  binStart: index,
  binEnd: index + 1,
  count: index,
  probability: index / 100,
  theoretical: index / 200,
}));
const compactBins = getCompactHistogramBins(bins, 10);
assert.equal(compactBins.length, 10);
assert.deepEqual(compactBins[0], {
  binStart: 0,
  binEnd: 4,
  count: 6,
  probability: 0.015,
  theoretical: 0.0075,
});
const smallBins = bins.slice(0, 5);
assert.equal(getCompactHistogramBins(smallBins, 10), smallBins);

const panelSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchSimulationRealtimePanel.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const formattingSource = readFileSync(
  new URL('../../src/features/workbench/workbenchPresentationFormatting.ts', import.meta.url),
  'utf8',
);

assert.match(panelSource, /export const WorkbenchSimulationRealtimePanel/);
assert.match(panelSource, /file: WorkbenchStandardState \| WorkbenchIdealState/);
assert.match(panelSource, /studio-realtime-summary-ideal/);
assert.match(panelSource, /studio-realtime-summary-standard/);
assert.match(panelSource, /studio-live-chart-bars/);
assert.match(panelSource, /studio-ideal-pressure-bars/);
assert.match(panelSource, /studio-ideal-point-strip/);
assert.match(panelSource, /workbenchCopy\.results\.standardRealtimeEmpty/);
assert.match(panelSource, /formatMetric\(activeFile\.latestPressureSummary\.relativeGap, 2\)/);

assert.match(workbenchSource, /from '\.\/WorkbenchSimulationRealtimePanel\.tsx'/);
assert.match(workbenchSource, /<WorkbenchSimulationRealtimePanel/);
assert.doesNotMatch(workbenchSource, /const renderRealtimeHistogram =/);
assert.doesNotMatch(workbenchSource, /const renderIdealPressureTrace =/);
assert.doesNotMatch(workbenchSource, /const renderIdealRelationSnapshot =/);
assert.doesNotMatch(workbenchSource, /const formatMetric =/);
assert.doesNotMatch(workbenchSource, /const getCompactHistogramBins =/);
assert.match(formattingSource, /export const getCompactHistogramBins/);

console.log('workbenchSimulationRealtimePanel tests passed');
