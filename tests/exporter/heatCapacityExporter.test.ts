import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const exporter = join(root, 'tools', 'exporter', 'hsl_exporter.py');
const fixture = join(root, 'tests', 'exporter', 'fixtures', 'heat-capacity-export-payload.json');
const exporterSource = readFileSync(exporter, 'utf8');
const heatReportSource = exporterSource.slice(
  exporterSource.indexOf('def build_heat_capacity_report'),
  exporterSource.indexOf('\ndef build_story', exporterSource.indexOf('def build_heat_capacity_report')),
);
const payload = JSON.parse(readFileSync(fixture, 'utf8')) as {
  data: {
    groups: Array<{
      scheme: 'real' | 'ideal';
      parameterSnapshot: {
        environment: { ambientPressureKPa: number };
        physics: { gamma: number };
        sensor: { pressureMvPerKPa: number };
      };
      calculationAudit: Array<{ symbol: string }>;
      experiments: Array<{
        records: Record<'u0' | 'u1' | 'u2', { displayPressureMv: number }>;
        derivedResult: { U1CorrectedMv: number; U2CorrectedMv: number; gamma: number };
      }>;
      result: {
        meanGamma: number;
        sampleStandardDeviation: number;
        typeAStandardUncertainty: number;
        theoreticalGamma: number;
        relativeErrorPercent: number;
      };
    }>;
  };
};

assert.match(exporterSource, /SimSunHSL/, 'Chinese report text should use the installed SimSun family');
assert.match(exporterSource, /TimesNewRomanHSL/, 'non-Chinese report text should use Times New Roman');
assert.match(heatReportSource, /split_font_runs/, 'mixed-language report text should select fonts per character run');
assert.doesNotMatch(heatReportSource, /cjk_sans/, 'the heat-capacity report must not use Microsoft YaHei');
assert.doesNotMatch(heatReportSource, /formula_table|process_images|get_heat_parameter_rows/, 'the report should omit formulas, parameter snapshots, and process appendices');
assert.match(heatReportSource, /ContinuedCaptionTable/, 'long academic tables should repeat their caption and header when continued');
assert.match(heatReportSource, /theory_comparison[\s\S]*subsection_number \+= 1[\s\S]*result_figure/, 'ideal-group figures should have their own numbered subsection');
assert.match(heatReportSource, /result_figure_heading[\s\S]*KeepTogether\(\[\s*result_figure_heading,[\s\S]*\*make_figure_parts/, 'result-figure headings should stay with their figures instead of being orphaned at a page bottom');
assert.match(heatReportSource, /\("ALIGN", \(0, 0\), \(-1, 0\), "CENTER"\)/, 'table headers should be centered');
assert.match(heatReportSource, /\("ALIGN", \(0, 1\), \(-1, -1\), "LEFT"\)/, 'all table body cells should be left-aligned');
assert.match(exporterSource, /\("LINEABOVE"[\s\S]*?\("LINEBELOW"/, 'academic tables should use three-line rules');
assert.match(exporterSource, /normalize_heat_symbol/, 'scientific symbols should avoid unsupported Unicode subscript glyphs');
assert.match(exporterSource, /include_process=include_public_figures/, 'public figure exports should include available per-experiment process charts');
assert.match(heatReportSource, /is_heat_group_reportable\(group\)/, 'bundle reports should omit blank draft groups while package data remains complete');
assert.doesNotMatch(exporterSource, /[UP][₀₁₂]/u, 'PDF text should use portable ASCII subscripts');

const assertClose = (actual: number, expected: number, label: string, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, received ${actual}`);
};

for (const group of payload.data.groups) {
  const p0 = group.parameterSnapshot.environment.ambientPressureKPa;
  const sensitivity = group.parameterSnapshot.sensor.pressureMvPerKPa;
  const gammaValues = group.experiments.map((experiment, index) => {
    const u0 = experiment.records.u0.displayPressureMv;
    const u1Corrected = experiment.records.u1.displayPressureMv - u0;
    const u2Corrected = experiment.records.u2.displayPressureMv - u0;
    assertClose(experiment.derivedResult.U1CorrectedMv, u1Corrected, `${group.scheme} experiment ${index + 1} U1'`);
    assertClose(experiment.derivedResult.U2CorrectedMv, u2Corrected, `${group.scheme} experiment ${index + 1} U2'`);
    const p1 = p0 + u1Corrected / sensitivity;
    const p2 = p0 + u2Corrected / sensitivity;
    const gamma = Math.log(p1 / p0) / Math.log(p1 / p2);
    assertClose(experiment.derivedResult.gamma, gamma, `${group.scheme} experiment ${index + 1} gamma`);
    return gamma;
  });
  const mean = gammaValues.reduce((sum, value) => sum + value, 0) / gammaValues.length;
  const standardDeviation = Math.sqrt(
    gammaValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (gammaValues.length - 1),
  );
  const uncertainty = standardDeviation / Math.sqrt(gammaValues.length);
  const relativeError = Math.abs(mean - group.result.theoreticalGamma) / group.result.theoreticalGamma * 100;
  assertClose(group.result.meanGamma, mean, `${group.scheme} mean gamma`);
  assertClose(group.result.sampleStandardDeviation, standardDeviation, `${group.scheme} sample standard deviation`);
  assertClose(group.result.typeAStandardUncertainty, uncertainty, `${group.scheme} Type-A uncertainty`);
  assertClose(group.result.relativeErrorPercent, relativeError, `${group.scheme} relative error`);
}
assert.equal(payload.data.groups.find((group) => group.scheme === 'real')?.calculationAudit.length, 19);
assert.equal(payload.data.groups.find((group) => group.scheme === 'ideal')?.calculationAudit.length, 0);
assert.ok(
  payload.data.groups.every((group) => group.calculationAudit.every((record) => !/[₀₁₂′]/u.test(record.symbol))),
  'fixture audit labels should render without missing-glyph boxes',
);

const pythonCheck = spawnSync('python', [exporter, '--self-check'], {
  cwd: root,
  encoding: 'utf8',
});

if (pythonCheck.status !== 0) {
  console.log('heatCapacityExporter test skipped: local Python export dependencies are unavailable');
} else {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'hsl-heat-capacity-exporter-'));
  const output = join(temporaryRoot, 'complete-bundle');
  const pdftotextAvailable = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).status === 0;
  try {
    const result = spawnSync('python', [
      exporter,
      '--input', fixture,
      '--out', output,
      '--formats', 'report,figures,csv,metadata',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const parsed = JSON.parse(result.stdout) as { status: string; files: string[]; metadata: string };
    assert.equal(parsed.status, 'ok');
    assert.ok(parsed.files.length >= 8);
    assert.ok(existsSync(join(output, 'report.pdf')));
    assert.equal(readFileSync(join(output, 'report.pdf')).subarray(0, 4).toString(), '%PDF');
    assert.ok(existsSync(join(output, 'figures', 'all-groups-overview.png')));
    assert.ok(existsSync(join(output, 'figures', 'real-group-01', 'group-results.png')));
    assert.ok(existsSync(join(output, 'figures', 'real-group-01', 'experiment-01-process.png')));
    assert.ok(existsSync(join(output, 'figures', 'ideal-group-01', 'group-results.png')));
    assert.ok(existsSync(join(output, 'data', 'experiment-groups-overview.csv')));
    assert.ok(existsSync(join(output, 'data', 'real-group-01-experiments.csv')));
    const realCsv = readFileSync(join(output, 'data', 'real-group-01-experiments.csv'), 'utf8');
    assert.match(realCsv, /P0KPa,P1KPa,P2KPa/, 'derived pressure columns should be present in CSV output');
    const packageText = readFileSync(join(output, 'data', 'experiment-package.json'), 'utf8');
    assert.ok(packageText.includes('PACKAGE_ONLY_RAW_TRACE'));
    assert.ok(existsSync(parsed.metadata));

    if (pdftotextAvailable) {
      const reportTextPath = join(temporaryRoot, 'report.txt');
      const textResult = spawnSync('pdftotext', [join(output, 'report.pdf'), reportTextPath], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(textResult.status, 0, textResult.stderr || textResult.stdout);
      const reportText = readFileSync(reportTextPath, 'utf8');
      assert.match(reportText, /U0 \(mV\)/);
      assert.match(reportText, /P0 \(kPa\)/);
      assert.match(reportText, /γ/);
      assert.match(reportText, /1 实验文件信息/);
      assert.match(reportText, /2 真实实验结果/);
      assert.match(reportText, /3 理想实验结果/);
      assert.match(reportText, /3\.1 第1组理想实验 · 未完成数据/);
      assert.match(reportText, /3\.1\.4 结果图/);
      assert.doesNotMatch(reportText, /计算方法与公式|已知条件与参数快照|实验过程图附录/);
      assert.doesNotMatch(reportText, /�/u, 'extracted report text should not contain replacement glyphs');
    }

    const pdffontsCheck = spawnSync('pdffonts', [join(output, 'report.pdf')], { encoding: 'utf8' });
    if (pdffontsCheck.status === 0) {
      assert.match(pdffontsCheck.stdout, /SimSun/);
      assert.match(pdffontsCheck.stdout, /TimesNewRoman/);
      assert.doesNotMatch(pdffontsCheck.stdout, /Helvetica|MicrosoftYaHei|SimHei/);
    }

    const reportOnlyOutput = join(temporaryRoot, 'report-only');
    const reportOnlyResult = spawnSync('python', [
      exporter,
      '--input', fixture,
      '--out', reportOnlyOutput,
      '--formats', 'report',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(reportOnlyResult.status, 0, reportOnlyResult.stderr || reportOnlyResult.stdout);
    const reportOnlyParsed = JSON.parse(reportOnlyResult.stdout) as { files: string[]; metadata: null };
    assert.deepEqual(reportOnlyParsed.files, [join(reportOnlyOutput, 'report.pdf')]);
    assert.equal(reportOnlyParsed.metadata, null);
    assert.equal(existsSync(join(reportOnlyOutput, 'figures')), false, 'report-only export should remove intermediate plot images');
    assert.equal(existsSync(join(reportOnlyOutput, 'data')), false, 'report-only export should not expose raw package JSON or CSV files');

    const idealOnlyPayload = JSON.parse(readFileSync(fixture, 'utf8')) as {
      data: {
        groups: typeof payload.data.groups;
        allGroupsOverview: {
          theoreticalGamma: number | null;
          points: Array<{ scheme: 'real' | 'ideal' }>;
        };
        groupSummary: {
          total: number;
          included: number;
          completed: number;
          incomplete: number;
          real: number;
          ideal: number;
        };
      };
    };
    idealOnlyPayload.data.groups = idealOnlyPayload.data.groups.filter((group) => group.scheme === 'ideal');
    idealOnlyPayload.data.allGroupsOverview.points = idealOnlyPayload.data.allGroupsOverview.points.filter((point) => point.scheme === 'ideal');
    idealOnlyPayload.data.groupSummary = {
      total: 1,
      included: 1,
      completed: 0,
      incomplete: 1,
      real: 0,
      ideal: 1,
    };
    const idealOnlyInput = join(temporaryRoot, 'ideal-only.json');
    const idealOnlyOutput = join(temporaryRoot, 'ideal-only-report');
    writeFileSync(idealOnlyInput, JSON.stringify(idealOnlyPayload), 'utf8');
    const idealOnlyResult = spawnSync('python', [
      exporter,
      '--input', idealOnlyInput,
      '--out', idealOnlyOutput,
      '--formats', 'report',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(idealOnlyResult.status, 0, idealOnlyResult.stderr || idealOnlyResult.stdout);
    if (pdftotextAvailable) {
      const idealOnlyTextPath = join(temporaryRoot, 'ideal-only-report.txt');
      const textResult = spawnSync('pdftotext', [join(idealOnlyOutput, 'report.pdf'), idealOnlyTextPath], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(textResult.status, 0, textResult.stderr || textResult.stdout);
      const reportText = readFileSync(idealOnlyTextPath, 'utf8');
      assert.match(reportText, /2 理想实验结果/);
      assert.match(reportText, /2\.1\.4 结果图/);
      assert.doesNotMatch(reportText, /3 理想实验结果/);
    }

    const payloadWithBlankDraft = structuredClone(idealOnlyPayload) as typeof idealOnlyPayload & {
      data: typeof idealOnlyPayload.data & { groups: Array<Record<string, unknown>> };
    };
    payloadWithBlankDraft.data.groups.push({
      id: 'blank-draft-group',
      scheme: 'real',
      schemeGroupNumber: null,
      globalOrder: null,
      status: 'draft',
      completed: false,
      legacyIncomplete: false,
      targetExperimentCount: 3,
      completedExperimentCount: 0,
      experiments: [],
      result: {},
      score: null,
    });
    const blankDraftInput = join(temporaryRoot, 'with-blank-draft.json');
    const blankDraftOutput = join(temporaryRoot, 'with-blank-draft-report');
    writeFileSync(blankDraftInput, JSON.stringify(payloadWithBlankDraft), 'utf8');
    const blankDraftResult = spawnSync('python', [
      exporter,
      '--input', blankDraftInput,
      '--out', blankDraftOutput,
      '--formats', 'report',
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(blankDraftResult.status, 0, blankDraftResult.stderr || blankDraftResult.stdout);
    if (pdftotextAvailable) {
      const blankDraftTextPath = join(temporaryRoot, 'with-blank-draft-report.txt');
      const textResult = spawnSync('pdftotext', [join(blankDraftOutput, 'report.pdf'), blankDraftTextPath], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(textResult.status, 0, textResult.stderr || textResult.stdout);
      const reportText = readFileSync(blankDraftTextPath, 'utf8');
      assert.doesNotMatch(reportText, /未编号真实模拟实验组/);
      assert.match(reportText, /实验组数量\s*1/);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

console.log('heatCapacityExporter tests passed');
