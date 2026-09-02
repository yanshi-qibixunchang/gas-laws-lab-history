import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { IdealGasAnalysis } from '../../src/domain/idealGas/idealGasExperiment.ts';
import {
  createIdealVerificationChartModel,
} from '../../src/features/workbench/workbenchIdealVerificationChart.ts';

const ptAnalysis = {
  relation: 'pt',
  sortedPoints: [
    {
      id: 'pt-1',
      relation: 'pt',
      targetTemperature: 1,
      meanTemperature: 1,
      meanPressure: 2,
      idealPressure: 2.2,
      relativeGap: 1,
      timestamp: 1,
    },
    {
      id: 'pt-2',
      relation: 'pt',
      targetTemperature: 2,
      meanTemperature: 2,
      meanPressure: 4,
      idealPressure: 4.1,
      relativeGap: 1,
      timestamp: 2,
    },
  ],
  theoreticalSlope: 2.1,
  regression: {
    slope: 2,
    intercept: 0,
    rSquared: 1,
    slopeError: 4.76,
  },
} as unknown as IdealGasAnalysis;

const linearModel = createIdealVerificationChartModel(ptAnalysis);
assert.ok(linearModel);
assert.equal(linearModel.xLabel, 'T');
assert.equal(linearModel.points.length, 2);
assert.equal(linearModel.points[0]?.x, 1);
assert.equal(linearModel.points[1]?.cx, 358);
assert.notEqual(linearModel.fitPoints, '');
assert.notEqual(linearModel.theoryPoints, linearModel.idealPoints);

const pvAnalysis = {
  ...ptAnalysis,
  relation: 'pv',
  sortedPoints: ptAnalysis.sortedPoints.map((point, index) => ({
    ...point,
    id: `pv-${index}`,
    relation: 'pv' as const,
    volume: 100 + index * 100,
    inverseVolume: 1 / (100 + index * 100),
  })),
} as IdealGasAnalysis;
const rawPvModel = createIdealVerificationChartModel(pvAnalysis, 'pvRaw');
assert.ok(rawPvModel);
assert.equal(rawPvModel.xLabel, 'V');
assert.equal(rawPvModel.fitPoints, '');
assert.equal(rawPvModel.theoryPoints, rawPvModel.idealPoints);

const emptyModel = createIdealVerificationChartModel({
  ...ptAnalysis,
  sortedPoints: [],
} as IdealGasAnalysis);
assert.equal(emptyModel, null);

const panelSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchIdealVerificationPanel.tsx', import.meta.url),
  'utf8',
);
const chartSource = readFileSync(
  new URL('../../src/features/workbench/workbenchIdealVerificationChart.ts', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const idealWindowsSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchIdealResultsWindows.tsx', import.meta.url),
  'utf8',
);

assert.match(panelSource, /export const WorkbenchIdealVerificationPanel/);
assert.match(panelSource, /file: WorkbenchIdealState \| null/);
assert.match(panelSource, /analysis: IdealGasAnalysis \| null/);
assert.match(panelSource, /studio-verification-panel-\$\{file\.relation\}/);
assert.match(panelSource, /studio-verification-layout-pv/);
assert.match(panelSource, /studio-verification-layout-single/);
assert.match(panelSource, /studio-ideal-chart-card/);
assert.match(panelSource, /studio-ideal-diagnosis-card/);
assert.doesNotMatch(panelSource, /useEffect|useState|standardRuntimeRef|updateActiveFile/);

assert.match(chartSource, /export const createIdealVerificationChartModel/);
assert.doesNotMatch(chartSource, /React|document\.|window\./);

assert.match(idealWindowsSource, /from '\.\/WorkbenchIdealVerificationPanel\.tsx'/);
assert.match(idealWindowsSource, /<WorkbenchIdealVerificationPanel/);
assert.match(workbenchSource, /from '\.\/WorkbenchIdealResultsWindows\.tsx'/);
assert.doesNotMatch(workbenchSource, /const renderIdealValidationChart =/);
assert.doesNotMatch(workbenchSource, /const renderVerificationPanel =/);

console.log('workbenchIdealVerificationPanel tests passed');
