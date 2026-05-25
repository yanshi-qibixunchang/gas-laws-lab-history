import assert from 'node:assert/strict';
import {
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  recordHeatCapacityFreeTraceEventWithReference,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createWorkbenchExportPayload,
  createWorkbenchFigureSpecs,
  formatWorkbenchExportFilename,
} from '../../src/features/workbench/workbenchResults.ts';

const timestamp = 1710000000000;
const ideal = {
  ...createDefaultIdealFile(1),
  relation: 'pv' as const,
  updatedAt: timestamp,
  pointsByRelation: {
    pt: [],
    pv: [
      {
        id: 'pv-a',
        relation: 'pv' as const,
        targetTemperature: 1,
        meanTemperature: 1.01,
        meanPressure: 0.034,
        idealPressure: 0.033,
        relativeGap: 0.03,
        timestamp,
        boxLength: 12,
        volume: 1728,
        inverseVolume: 1 / 1728,
      },
    ],
    pn: [],
  },
};

const csvPayload = createWorkbenchExportPayload(ideal, 'pointsCsv');
assert.equal(csvPayload.kind, 'csv');
assert.equal(csvPayload.filename, formatWorkbenchExportFilename(ideal, 'ideal-points'));
assert.ok(csvPayload.content.includes('relation,scanValue,meanTemperature,measuredPressure,idealPressure,relativeGap,timestamp,boxLength,volume,inverseVolume,particleCount'));
assert.ok(csvPayload.content.includes('pv,0.0005787'));

const idealReport = createWorkbenchExportPayload(ideal, 'report');
assert.equal(idealReport.kind, 'json');
assert.equal(idealReport.filename, formatWorkbenchExportFilename(ideal, 'ideal-verification').replace(/\.pdf$/, '.json'));
assert.equal(idealReport.data.fileName, ideal.name);
assert.equal(idealReport.data.relation, 'pv');
assert.equal(idealReport.data.points.length, 1);
assert.ok(idealReport.data.figureSpecs.some((spec) => spec.figureCode === 'ideal-raw-pv'));

const standard = {
  ...createDefaultStandardFile(1),
  updatedAt: timestamp,
  finalChartData: {
    speed: [{ binStart: 0, binEnd: 1, count: 2, probability: 0.5, theoretical: 0.45 }],
    energy: [{ binStart: 0, binEnd: 1, count: 2, probability: 0.5, theoretical: 0.45 }],
    energyLog: [{ energy: 0.5, logProb: -0.69, theoreticalLog: -0.8 }],
    tempHistory: [{ time: 1, temperature: 1.02, targetTemperature: 1, error: 0.02, totalEnergy: 20 }],
  },
};

const standardPayload = createWorkbenchExportPayload(standard, 'figuresZip');
assert.equal(standardPayload.kind, 'json');
assert.ok(standardPayload.data.figureSpecs.length >= 5);
assert.ok(createWorkbenchFigureSpecs(standard).every((spec) => standardPayload.data.figureSpecs.some((payloadSpec) => payloadSpec.id === spec.id)));

const heatCapacityWithTrace = recordHeatCapacityFreeTraceEventWithReference(
  {
    ...createDefaultHeatCapacityFile(1),
    updatedAt: timestamp,
  },
  'power-on',
  timestamp,
).file;
assert.equal(heatCapacityWithTrace.heatCapacityFreeTraceStore.traceTrials.length, 1);
const heatCapacityReport = createWorkbenchExportPayload(heatCapacityWithTrace, 'report');
assert.equal(heatCapacityReport.kind, 'json');
const heatCapacityReportText = JSON.stringify(heatCapacityReport.data);
assert.equal(heatCapacityReportText.includes('heatCapacityFreeTraceStore'), false);
assert.equal(heatCapacityReportText.includes('gasAmountRatio'), false);
assert.equal(heatCapacityReportText.includes('gasTemperatureK'), false);
assert.equal(heatCapacityReportText.includes('"physical"'), false);

console.log('workbenchExportPayloads tests passed');


