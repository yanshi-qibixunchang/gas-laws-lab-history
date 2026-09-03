import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type {
  PistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  createPistonOscillationGasMaterialSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import {
  createPistonOscillationFreeExperimentContextSnapshot,
  createPistonOscillationFreeExperimentGroup,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import {
  createDefaultHeatCapacityPistonOscillationFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createPistonOscillationReportExportPayload,
  isPistonOscillationReportReady,
  PISTON_OSCILLATION_REPORT_EXPORT_KIND,
} from '../../src/features/workbench/workbenchPistonOscillationExport.ts';
import {
  createWorkbenchExportPayload,
} from '../../src/features/workbench/workbenchResults.ts';

const root = resolve(import.meta.dirname, '..', '..');
const exporter = join(root, 'tools', 'exporter', 'hsl_exporter.py');
const workbenchSource = readFileSync(join(
  root,
  'src',
  'features',
  'workbench',
  'WorkbenchStudioPrototype.tsx',
), 'utf8');
const defaultPistonFile = createDefaultHeatCapacityPistonOscillationFile(1);
const exportExperimentGroup = {
  ...defaultPistonFile.pistonOscillationFreeSession.experimentGroup,
  groupId: 'piston-free-group:export',
  createdAtMs: 1_725_079_700_000,
};
const exportExperimentContext = createPistonOscillationFreeExperimentContextSnapshot(
  exportExperimentGroup,
);

const heights = [80, 70, 60];
const slope = 61.19357;
const intercept = -0.008332;
const periods = heights.map((heightMm) => Math.sqrt((heightMm / 1_000 - intercept) / slope));

const records = heights.map((heightMm, measurementIndex) => {
  const periodS = periods[measurementIndex]!;
  const samples = Array.from({ length: 701 }, (_, index) => {
    const timeS = index / 1_000;
    const pressure = 101.3
      + 20 * Math.exp(-timeS * (9.3 - measurementIndex * 0.5))
      * Math.cos(2 * Math.PI * timeS / periodS)
      + (timeS > 0.2 ? 0.08 * Math.sin(timeS * 310 + measurementIndex) : 0);
    return { timeS, absolutePressureKpa: pressure };
  });
  return {
    schemaVersion: 7,
    recordId: `piston-export-${measurementIndex + 1}`,
    capturedAtMs: 1_725_080_000_000 + measurementIndex * 120_000,
    measurementIndex,
    targetHeightMm: heightMm,
    confirmedHeightMm: heightMm + [0, 0.2, -0.2][measurementIndex]!,
    acquisitionSettings: {
      sampleRateHz: 1_000,
      triggerThresholdKpa: 120,
      recordedDurationS: 0.7,
      recordingPath: 'immediate',
      releaseOffsetS: 0,
    },
    samples,
    pressOperationEvidence: {
      signedReleaseGapS: [0.028, -0.041, 0.076][measurementIndex]!,
      releaseOrder: ['space-first', 'mouse-first', 'space-first'][measurementIndex],
    },
    experimentContext: { ...exportExperimentContext },
    sensorObservationSnapshot: {},
    physicsSnapshot: {
      gasMaterial: createPistonOscillationGasMaterialSnapshot(),
    },
  };
});

const runs = records.map((record, measurementIndex) => {
  const periodS = periods[measurementIndex]!;
  const t1S = 0.043 + measurementIndex * 0.0015;
  const periodCount = measurementIndex === 1 ? 3.5 : 4;
  const t2S = t1S + periodS * periodCount;
  const extrema = Array.from({ length: 9 }, (_, extremumIndex) => ({
    ordinal: extremumIndex,
    sampleIndex: Math.round((t1S + extremumIndex * periodS / 2) * 1_000),
    type: extremumIndex % 2 === 0 ? 'peak' : 'trough',
    timeS: t1S + extremumIndex * periodS / 2,
    absolutePressureKpa: 101.3 + (extremumIndex % 2 === 0 ? 1 : -1) * 12 * Math.exp(-extremumIndex / 4),
  }));
  return {
    rawMeasurementRecordId: record.recordId,
    measurementIndex,
    targetHeightMm: record.targetHeightMm,
    sampleRateHz: 1_000,
    selection: {
      algorithmVersion: 'multi-scale-primary-extrema-selection-v1',
      rangeStartTimeS: t1S,
      rangeEndTimeS: t2S,
      extrema,
      leftEndpoint: extrema[0],
      rightEndpoint: extrema.at(-1),
      periodCount,
      issue: null,
      selectedAtMs: record.capturedAtMs + 60_000,
    },
    answers: {
      t1: { resolution: 'first-correct' },
      t2: { resolution: 'first-correct' },
      period: { resolution: measurementIndex === 2 ? 'retry-correct' : 'first-correct' },
    },
    batchAttempts: measurementIndex === 2 ? [{ allCorrect: false }] : [],
    result: {
      resultVersion: 1,
      leftSampleIndex: extrema[0]!.sampleIndex,
      rightSampleIndex: extrema.at(-1)!.sampleIndex,
      leftPhase: 'peak',
      rightPhase: 'peak',
      phaseSpan: 'peak-to-peak',
      t1S,
      t2S,
      periodCount,
      deltaTimeS: t2S - t1S,
      periodS,
      periodSquaredS2: periodS ** 2,
      completedAtMs: record.capturedAtMs + 80_000,
    },
  };
});

const calculationAnswers = {
  area: {
    draftRaw: '0.000830',
    expectedValue: 0.00083,
    status: 'correct',
    feedback: null,
    attempts: [],
    resolution: 'first-correct',
  },
  gamma: {
    draftRaw: '1.3987',
    expectedValue: 1.3987,
    status: 'correct',
    feedback: null,
    attempts: [],
    resolution: 'retry-correct',
  },
  relativeError: {
    draftRaw: '0.11',
    expectedValue: 0.11,
    status: 'correct',
    feedback: null,
    attempts: [],
    resolution: 'first-correct',
  },
};

const session = {
  schemaVersion: 10,
  status: 'active',
  startedAtMs: 1_725_079_700_000,
  updatedAtMs: 1_725_080_540_000,
  experimentGroup: exportExperimentGroup,
  experimentPlan: {
    schemaVersion: 3,
    planId: 'piston-export-plan',
    targetHeightsMm: heights,
    customHeightCandidatesMm: [],
    targets: heights.map((heightMm, index) => ({
      schemaVersion: 1,
      targetId: `target-${index + 1}`,
      heightMm,
      source: 'system',
    })),
  },
  measurementIndex: 3,
  powerOn: true,
  sampleRateHz: 1_000,
  triggerThresholdKpa: 120,
  acquisitionCandidate: null,
  acquisitionCandidateTargetId: null,
  savedMeasurements: records,
  savedMeasurementTargetIds: Object.fromEntries(records.map((record, index) => (
    [record.recordId, `target-${index + 1}`]
  ))),
  excludedAttempts: [],
  primaryCycleEligibilityByRecordId: {},
  reacquisition: null,
  instrumentState: {},
  audit: [
    ...records.map((record, index) => ({
      schemaVersion: 4,
      sequence: index + 1,
      eventId: `measurement-saved-${index + 1}`,
      occurredAtMs: record.capturedAtMs + 30_000,
      type: 'measurement-saved',
      measurementIndex: index,
      targetHeightMm: record.targetHeightMm,
      operation: 'saveMeasurement',
      payload: {},
    })),
  ],
  dataProcessing: {
    schemaVersion: 7,
    processingPolicy: {},
    scoringPolicy: {
      schemaVersion: 1,
      policyVersion: 'piston-oscillation-free-scoring-policy-v1',
      scheme: 'real',
      scoringEligible: true,
    },
    status: 'completed',
    activeRunIndex: 2,
    runs,
    linearFitResult: {
      schemaVersion: 1,
      algorithmVersion: 'ordinary-least-squares-v1',
      slopeMPerS2: slope,
      interceptM: intercept,
      rSquared: 0.9996,
      selectedRunIndices: [0, 1, 2],
      points: runs.map((run, runIndex) => ({
        runIndex,
        measurementIndex: runIndex,
        rawMeasurementRecordId: run.rawMeasurementRecordId,
        periodSquaredS2: run.result.periodSquaredS2,
        heightMm: heights[runIndex],
        heightM: heights[runIndex]! / 1_000,
      })),
      completedAtMs: 1_725_080_500_000,
    },
    calculationSession: {
      schemaVersion: 2,
      status: 'completed',
      knowns: {
        schemaVersion: 2,
        modelVersion: 'piston-slope-calculation-v1',
        gasType: 'air',
        gasMaterialModelVersion: 'piston-oscillation-dry-air-material-v1',
        gasMaterialId: 'dry-air',
        movingMassKg: 0.0485,
        cylinderDiameterM: 0.0325,
        pressurePa: 101_000,
        referenceGamma: 1.4,
      },
      selectedRunIndices: [0, 1, 2],
      activeFieldId: null,
      visibleFieldIds: ['area', 'gamma', 'relativeError'],
      answers: calculationAnswers,
      batchAttempts: [{ allCorrect: false }, { allCorrect: true }],
      startedAtMs: 1_725_080_510_000,
      completedAtMs: 1_725_080_540_000,
    },
    audit: [],
    startedAtMs: 1_725_080_300_000,
    updatedAtMs: 1_725_080_540_000,
  },
} as unknown as PistonOscillationFreeSession;

const file = {
  ...createDefaultHeatCapacityPistonOscillationFile(1),
  id: 'piston-export-file',
  name: 'Piston Oscillation - Export Test',
  createdAt: 1_725_079_600_000,
  updatedAt: 1_725_080_540_000,
  pistonOscillationFreeSession: session,
};

assert.equal(isPistonOscillationReportReady(file), true);
const payload = createPistonOscillationReportExportPayload(file, 'zh-CN');
assert.equal(payload.kind, 'json');
assert.equal(payload.mode, 'report');
assert.equal(payload.data.exportKind, PISTON_OSCILLATION_REPORT_EXPORT_KIND);
assert.equal(payload.data.schemaVersion, 4);
assert.equal(payload.data.experimentGroup.groupId, exportExperimentGroup.groupId);
assert.equal(payload.data.summary.scheme, 'real');
assert.equal(payload.data.summary.gasType, 'air');
assert.equal(payload.data.summary.scoringEligible, true);
assert.equal(
  payload.data.summary.scoringPolicyVersion,
  'piston-oscillation-free-scoring-policy-v1',
);
assert.equal(payload.data.gasMaterial.gasType, 'air');
assert.equal(payload.data.gasMaterial.adiabaticIndex, 1.4);
assert.equal(payload.data.measurements.length, 3);
assert.equal(payload.data.measurements[0].gasMaterial.gasType, 'air');
assert.deepEqual(payload.data.measurements[0].experimentContext, exportExperimentContext);
assert.equal(payload.data.measurements[0].samples.length, 701);
assert.equal(records[0]?.samples.length, 701, 'building a report must not mutate saved samples');
const missingScoringPolicyFile = structuredClone(file) as unknown as Record<string, any>;
delete missingScoringPolicyFile.pistonOscillationFreeSession.dataProcessing.scoringPolicy;
assert.equal(
  isPistonOscillationReportReady(missingScoringPolicyFile as typeof file),
  false,
);
assert.throws(
  () => createPistonOscillationReportExportPayload(
    missingScoringPolicyFile as typeof file,
    'zh-CN',
  ),
  /scoring policy is inconsistent/,
);
const mismatchedContextFile = structuredClone(file);
mismatchedContextFile.pistonOscillationFreeSession.savedMeasurements[0]!.experimentContext = {
  ...exportExperimentContext,
  groupId: 'piston-free-group:other',
};
assert.equal(isPistonOscillationReportReady(mismatchedContextFile), false);
assert.throws(
  () => createPistonOscillationReportExportPayload(mismatchedContextFile, 'zh-CN'),
  /experiment-group context is inconsistent/,
);
const commonPayload = createWorkbenchExportPayload(file, 'report', 'zh-CN');
assert.equal(commonPayload.kind, 'json');
if (commonPayload.kind !== 'json') throw new Error('Expected JSON report payload.');
assert.equal(
  commonPayload.data.exportKind,
  PISTON_OSCILLATION_REPORT_EXPORT_KIND,
  'the common workbench export path must dispatch piston reports to the dedicated payload',
);
assert.match(workbenchSource, /data-piston-oscillation-export-actions="true"/);
assert.match(workbenchSource, /handleExportAction\('report'\)/);

const idealExportGroup = createPistonOscillationFreeExperimentGroup({
  groupId: 'piston-free-group:ideal-export',
  createdAtMs: 1_725_079_700_000,
  scheme: 'ideal',
});
const idealExperimentContext = createPistonOscillationFreeExperimentContextSnapshot(
  idealExportGroup,
);
const idealFile = structuredClone(file);
idealFile.pistonOscillationFreeSession.experimentGroup = idealExportGroup;
idealFile.pistonOscillationFreeSession.savedMeasurements =
  idealFile.pistonOscillationFreeSession.savedMeasurements.map((record) => ({
    ...record,
    experimentContext: { ...idealExperimentContext },
  }));
idealFile.pistonOscillationFreeSession.dataProcessing!.scoringPolicy = {
  schemaVersion: 1,
  policyVersion: 'piston-oscillation-free-scoring-policy-v1',
  scheme: 'ideal',
  scoringEligible: false,
};
assert.equal(isPistonOscillationReportReady(idealFile), true);
const idealPayload = createPistonOscillationReportExportPayload(idealFile, 'zh-CN');
assert.equal(idealPayload.kind, 'json');
if (idealPayload.kind !== 'json') throw new Error('Expected Ideal JSON report payload.');
assert.equal(idealPayload.data.summary.scheme, 'ideal');
assert.equal(idealPayload.data.summary.scoringEligible, false);
assert.equal(idealPayload.data.summary.operationAverageScore, null);
assert.equal(idealPayload.data.summary.operationMaximum, null);
assert.equal(idealPayload.data.summary.calculationScore, null);
assert.equal(idealPayload.data.summary.calculationMaximum, null);
assert.equal(idealPayload.data.summary.totalScore, null);
assert.equal(idealPayload.data.summary.totalMaximum, null);
assert.equal(idealPayload.data.measurements.every((measurement: Record<string, unknown>) => (
  measurement.score === null
)), true);
assert.equal(idealPayload.data.measurements.every((measurement: Record<string, any>) => (
  measurement.processReview.scoreRows.every((row: Record<string, unknown>) => (
    row.score === null && row.maxScore === null
  ))
)), true);

const sixMeasurementPayload = structuredClone(payload) as typeof payload;
if (sixMeasurementPayload.kind !== 'json') throw new Error('Expected JSON report payload.');
const additionalHeights = [50, 40, 30];
for (const [offset, heightMm] of additionalHeights.entries()) {
  const source = structuredClone(sixMeasurementPayload.data.measurements[offset]);
  const number = offset + 4;
  const periodS = Math.sqrt((heightMm / 1_000 - intercept) / slope);
  source.number = number;
  source.measurementIndex = number - 1;
  source.recordId = `piston-export-${number}`;
  source.targetHeightMm = heightMm;
  source.confirmedHeightMm = heightMm + [0.1, -0.3, 0.2][offset]!;
  source.heightSource = offset === 0 ? 'custom' : 'system';
  source.capturedAtMs += number * 120_000;
  source.periodResult.periodS = periodS;
  source.periodResult.periodSquaredS2 = periodS ** 2;
  source.periodResult.deltaTimeS = periodS * source.periodResult.periodCount;
  source.periodResult.t2S = source.periodResult.t1S + source.periodResult.deltaTimeS;
  source.selection.rangeEndTimeS = source.periodResult.t2S;
  source.includedInFit = true;
  source.keyEvidence.heightDeviationMm = source.confirmedHeightMm - heightMm;
  source.keyEvidence.releaseGapMs = [34, 53, 88][offset]!;
  source.keyEvidence.touchdown = offset === 1;
  source.keyEvidence.pressCount = offset === 1 ? 2 : 1;
  source.keyEvidence.resetCount = offset === 1 ? 1 : 0;
  source.score.operation = [75, 72, 66][offset]!;
  source.score.tone = offset === 2 ? 'risk' : offset === 1 ? 'attention' : 'good';
  source.processReview.statusLabel = offset === 2 ? '需复核' : offset === 1 ? '可改进' : '稳定';
  sixMeasurementPayload.data.measurements.push(source);
}
sixMeasurementPayload.data.summary.measurementCount = 6;
sixMeasurementPayload.data.summary.fitPointCount = 6;
sixMeasurementPayload.data.summary.operationAverageScore = 72;
sixMeasurementPayload.data.summary.totalScore = 95;
sixMeasurementPayload.data.linearFitResult.selectedRunIndices = [0, 1, 2, 3, 4, 5];
sixMeasurementPayload.data.linearFitResult.points = sixMeasurementPayload.data.measurements.map(
  (measurement: Record<string, any>, runIndex: number) => ({
    runIndex,
    measurementIndex: runIndex,
    rawMeasurementRecordId: measurement.recordId,
    periodSquaredS2: measurement.periodResult.periodSquaredS2,
    heightMm: measurement.targetHeightMm,
    heightM: measurement.targetHeightMm / 1_000,
  }),
);

const pythonCheck = spawnSync('python', [exporter, '--self-check'], {
  cwd: root,
  encoding: 'utf8',
});

if (pythonCheck.status !== 0) {
  console.log('pistonOscillationExporter test skipped: local Python export dependencies are unavailable');
} else {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'hsl-piston-exporter-'));
  const input = join(temporaryRoot, 'payload.json');
  const output = join(temporaryRoot, 'report');
  writeFileSync(input, JSON.stringify(payload), 'utf8');
  try {
    const result = spawnSync('python', [
      exporter,
      '--input', input,
      '--out', output,
      '--formats', 'report',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout) as { status: string; files: string[] };
    assert.equal(parsed.status, 'ok');
    assert.deepEqual(parsed.files, [join(output, 'report.pdf')]);
    assert.ok(existsSync(join(output, 'report.pdf')));
    assert.equal(readFileSync(join(output, 'report.pdf')).subarray(0, 4).toString(), '%PDF');
    assert.equal(existsSync(join(output, 'figures')), false, 'report-only export must clean intermediate plots');
    const qaReportPath = process.env.HSL_PISTON_QA_REPORT_PATH;
    if (qaReportPath) {
      mkdirSync(dirname(qaReportPath), { recursive: true });
      copyFileSync(join(output, 'report.pdf'), qaReportPath);
    }

    const pdfInfo = spawnSync('pdfinfo', [join(output, 'report.pdf')], { encoding: 'utf8' });
    if (pdfInfo.status === 0) {
      assert.match(pdfInfo.stdout, /Pages:\s+4\b/);
    }
    const reportTextPath = join(temporaryRoot, 'report.txt');
    const textResult = spawnSync('pdftotext', [join(output, 'report.pdf'), reportTextPath], {
      cwd: root,
      encoding: 'utf8',
    });
    if (textResult.status === 0) {
      const reportText = readFileSync(reportTextPath, 'utf8');
      assert.match(reportText, /活塞振动法测空气比热容比/);
      assert.match(reportText, /实验方案\s+真实实验条件/);
      assert.match(reportText, /气体类型\s+空气/);
      assert.match(reportText, /1 实验文件信息/);
      assert.match(reportText, /2 实际记录数据/);
      assert.match(reportText, /3 实验计算结果/);
      assert.match(reportText, /4 过程与评分摘要/);
      assert.match(reportText, /第\s*1\s*次/);
      assert.doesNotMatch(reportText, /实验原理|计算公式/);
      assert.doesNotMatch(reportText, /�/u);
    }

    const idealInput = join(temporaryRoot, 'ideal-payload.json');
    const idealOutput = join(temporaryRoot, 'ideal-report');
    writeFileSync(idealInput, JSON.stringify(idealPayload), 'utf8');
    const idealResult = spawnSync('python', [
      exporter,
      '--input', idealInput,
      '--out', idealOutput,
      '--formats', 'report',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(idealResult.status, 0, idealResult.stderr || idealResult.stdout);
    assert.ok(existsSync(join(idealOutput, 'report.pdf')));
    const idealReportTextPath = join(temporaryRoot, 'ideal-report.txt');
    const idealTextResult = spawnSync(
      'pdftotext',
      [join(idealOutput, 'report.pdf'), idealReportTextPath],
      { cwd: root, encoding: 'utf8' },
    );
    if (idealTextResult.status === 0) {
      const idealReportText = readFileSync(idealReportTextPath, 'utf8');
      assert.match(idealReportText, /实验方案\s+理想实验过程/);
      assert.match(idealReportText, /评分资格\s+不参与评分/);
      assert.match(idealReportText, /4 过程回顾摘要/);
      assert.match(idealReportText, /过程证据诊断/);
      assert.match(idealReportText, /各次实验过程诊断/);
      assert.doesNotMatch(idealReportText, /4 过程与评分摘要/);
      assert.doesNotMatch(idealReportText, /各次实验操作评分/);
      assert.doesNotMatch(idealReportText, /本轮最终评分/);
      assert.doesNotMatch(idealReportText, /100%|80%/);
    }

    const sixInput = join(temporaryRoot, 'payload-6.json');
    const sixOutput = join(temporaryRoot, 'report-6');
    writeFileSync(sixInput, JSON.stringify(sixMeasurementPayload), 'utf8');
    const sixResult = spawnSync('python', [
      exporter,
      '--input', sixInput,
      '--out', sixOutput,
      '--formats', 'report',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(sixResult.status, 0, sixResult.stderr || sixResult.stdout);
    const sixPdfInfo = spawnSync('pdfinfo', [join(sixOutput, 'report.pdf')], { encoding: 'utf8' });
    if (sixPdfInfo.status === 0) {
      assert.match(sixPdfInfo.stdout, /Pages:\s+4\b/);
    }
    const qaSixReportPath = process.env.HSL_PISTON_QA_REPORT_6_PATH;
    if (qaSixReportPath) {
      mkdirSync(dirname(qaSixReportPath), { recursive: true });
      copyFileSync(join(sixOutput, 'report.pdf'), qaSixReportPath);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

console.log('pistonOscillationExporter tests passed');
