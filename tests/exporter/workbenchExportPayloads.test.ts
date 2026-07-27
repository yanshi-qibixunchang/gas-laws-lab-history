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
import type { HeatCapacityFreeExperimentGroupRecord } from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  isHeatCapacityExportModeReady,
  isHeatCapacityGroupReportable,
} from '../../src/features/workbench/workbenchHeatCapacityExport.ts';

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
assert.equal(idealReport.mode, 'report');
assert.equal(idealReport.filename, formatWorkbenchExportFilename(ideal, 'ideal-verification').replace(/\.pdf$/, '.json'));
assert.equal(idealReport.data.fileName, ideal.name);
assert.equal(idealReport.data.relation, 'pv');
assert.equal(idealReport.data.points.length, 1);
assert.ok(idealReport.data.figureSpecs.some((spec) => spec.figureCode === 'ideal-raw-pv'));

const idealCompleteBundle = createWorkbenchExportPayload(ideal, 'completeBundle');
assert.equal(idealCompleteBundle.kind, 'json');
assert.equal(idealCompleteBundle.mode, 'completeBundle');
assert.equal(idealCompleteBundle.filename, formatWorkbenchExportFilename(ideal, 'ideal-verification').replace(/\.pdf$/, '.bundle.json'));
assert.equal(idealCompleteBundle.data.fileName, ideal.name);

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
assert.equal(standardPayload.mode, 'figuresZip');
assert.ok(standardPayload.data.figureSpecs.length >= 5);
assert.ok(createWorkbenchFigureSpecs(standard).every((spec) => standardPayload.data.figureSpecs.some((payloadSpec) => payloadSpec.id === spec.id)));

const standardCompleteBundle = createWorkbenchExportPayload(standard, 'completeBundle');
assert.equal(standardCompleteBundle.kind, 'json');
assert.equal(standardCompleteBundle.mode, 'completeBundle');
assert.equal(standardCompleteBundle.filename, formatWorkbenchExportFilename(standard, 'speed-distribution').replace(/\.pdf$/, '.bundle.json'));
assert.ok(standardCompleteBundle.data.figureSpecs.length >= 5);

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
assert.equal(heatCapacityReport.mode, 'report');
assert.equal(heatCapacityReport.data.exportKind, 'heat-capacity-adiabatic-expansion');
assert.deepEqual(heatCapacityReport.data.groups, [], 'reports should default to completed experiment groups only');
const heatCapacityReportText = JSON.stringify(heatCapacityReport.data);
assert.equal(heatCapacityReportText.includes('heatCapacityFreeTraceStore'), false);
assert.equal(heatCapacityReportText.includes('gasAmountRatio'), false);
assert.equal(heatCapacityReportText.includes('gasTemperatureK'), false);
assert.equal(heatCapacityReportText.includes('"physical"'), false);

const heatCapacityPackage = createWorkbenchExportPayload(heatCapacityWithTrace, 'completeBundle');
assert.equal(heatCapacityPackage.kind, 'json');
assert.equal(heatCapacityPackage.mode, 'completeBundle');
assert.ok(heatCapacityPackage.data.packageData, 'the experiment package should include restorable file-level state');
assert.ok(
  heatCapacityPackage.data.packageData.experimentGroupCollection,
  'the experiment package should preserve the complete experiment-group collection even before the first group is configured',
);
const heatCapacityPackageText = JSON.stringify(heatCapacityPackage.data);
assert.equal(heatCapacityPackageText.includes('traceTrials'), true);
assert.equal(heatCapacityPackageText.includes('"physical"'), true, 'raw trace samples belong in the experiment package only');

const chineseNamedHeatCapacityPayload = createWorkbenchExportPayload({
  ...createDefaultHeatCapacityFile(2),
  name: '绝热 膨胀 01',
  updatedAt: timestamp,
}, 'completeBundle');
assert.match(
  chineseNamedHeatCapacityPayload.filename,
  /GasLawsLab_绝热-膨胀-01_adiabatic-experiment-package_/,
  'Chinese experiment-file names should remain recognizable in exported filenames',
);

const blankDraftGroup = {
  id: 'blank-draft',
  status: 'draft',
  runSeries: {
    trials: [],
    traceStore: { traceTrials: [] },
  },
} as unknown as HeatCapacityFreeExperimentGroupRecord;
const traceOnlyIncompleteGroup = {
  ...blankDraftGroup,
  id: 'trace-only-incomplete',
  status: 'collecting',
  runSeries: {
    trials: [],
    traceStore: {
      traceTrials: [{ branches: [{ samples: [{}] }] }],
    },
  },
} as unknown as HeatCapacityFreeExperimentGroupRecord;
assert.equal(isHeatCapacityGroupReportable(blankDraftGroup), false, 'blank drafts must not create empty report chapters');
assert.equal(isHeatCapacityGroupReportable(traceOnlyIncompleteGroup), true, 'an incomplete group with process data should be reportable');

const blankDraftFile = {
  ...createDefaultHeatCapacityFile(1),
  heatCapacityFreeExperimentGroups: {
    ...createDefaultHeatCapacityFile(1).heatCapacityFreeExperimentGroups,
    groups: [blankDraftGroup],
  },
};
assert.equal(isHeatCapacityExportModeReady(blankDraftFile, 'report'), false);
assert.equal(isHeatCapacityExportModeReady({
  ...blankDraftFile,
  heatCapacityFreeExperimentGroups: {
    ...blankDraftFile.heatCapacityFreeExperimentGroups,
    groups: [traceOnlyIncompleteGroup],
  },
}, 'report'), true);
const blankDraftReport = createWorkbenchExportPayload(
  blankDraftFile,
  'report',
  'zh-CN',
  { includedGroupIds: [blankDraftGroup.id] },
);
assert.equal(blankDraftReport.kind, 'json');
if (blankDraftReport.kind !== 'json') throw new Error('heat-capacity reports must use JSON payloads');
assert.deepEqual(blankDraftReport.data.groups, [], 'explicit report selections must still exclude blank drafts');

console.log('workbenchExportPayloads tests passed');
