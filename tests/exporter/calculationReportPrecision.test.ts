import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
  LEGACY_HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
  formatHeatCapacityCalculationReference,
} from '../../src/domain/heatCapacity/heatCapacityCalculationValidation.ts';
import {
  PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS,
  formatPistonOscillationCalculationAnswer,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  formatDecimalPlacesHalfEven,
  formatSignificantFiguresHalfEven,
} from '../../src/domain/calculation/decimalHalfEven.ts';

// Compare the actual report formatter with the actual student-facing rules,
// including values for which decimal places and significant figures differ.
const values = [0, 1.379, 1.4, 41, 0.0008296, 0.000008296, 0.00000008296,
  0.0325, 0.00105625, 1.2345, 1.2355, 9.9995, -1.2345, 0.00010005, 123456];
const cases: Array<{ function: string; args: unknown[]; expected: unknown }> = [];
for (const [kind, spec] of Object.entries(HEAT_CAPACITY_CALCULATION_ANSWER_SPECS)) {
  for (const value of values) {
    cases.push({
      function: 'format_heat_calculation_reference',
      args: [value, kind, true],
      expected: formatHeatCapacityCalculationReference(value, spec)
        + (kind === 'relativeErrorPercent' ? '%' : ''),
    });
  }
}
for (const [kind, spec] of Object.entries(LEGACY_HEAT_CAPACITY_CALCULATION_ANSWER_SPECS)) {
  for (const value of values) {
    cases.push({ function: 'format_heat_calculation_reference', args: [value, kind],
      expected: formatHeatCapacityCalculationReference(value, spec)
        + (kind === 'relativeErrorPercent' ? '%' : '') });
  }
}
cases.push(
  { function: 'get_heat_report_half_even', args: [{ calculation: { session: { answerRule: 'strict-half-even-v2' } } }], expected: true },
  { function: 'get_heat_report_half_even', args: [{ calculation: { session: {} } }], expected: false },
);
for (const kind of Object.keys(PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS)) {
  for (const value of values) {
    cases.push({
      function: 'format_piston_calculation_reference',
      args: [value, kind],
      expected: formatPistonOscillationCalculationAnswer(
        kind as keyof typeof PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS, value,
      ) + (kind === 'relativeError' ? '%' : kind === 'area' ? ' m^2' : ''),
    });
  }
}
for (const value of values) {
  for (const digits of [3, 4, 5]) {
    cases.push({ function: 'format_piston_significant', args: [value, digits],
      expected: formatSignificantFiguresHalfEven(value, digits) });
    cases.push({ function: 'format_piston_number', args: [value, digits],
      expected: formatDecimalPlacesHalfEven(value, digits) });
  }
}
cases.push(
  { function: 'format_heat_calculation_reference', args: [null, 'gamma'], expected: '-' },
  { function: 'format_piston_calculation_reference', args: [null, 'gamma'], expected: '--' },
);
const rawResult = { meanGamma: 1.3887517299451917, typeAStandardUncertainty: 0.0049122347 };
const teachingResult = { meanGamma: 1.389, typeAStandardUncertainty: 0.00493 };
const rawExperiment = { id: 'trial-1', derivedResult: { gamma: 1.377777, p1KPa: 106.66666 } };
const interactiveGroup = {
  id: 'group-1',
  result: rawResult,
  calculation: {
    kind: 'real-interactive',
    session: {
      theoreticalGamma: 1.4,
      aggregate: { reference: teachingResult },
      groups: [{ trialId: 'trial-1', reference: { formulaGamma: 1.378, p1KPa: 106.667 } }],
    },
  },
};
cases.push(
  { function: 'get_heat_report_result', args: [interactiveGroup],
    expected: { ...teachingResult, theoreticalGamma: 1.4 } },
  { function: 'get_heat_report_result', args: [{ result: rawResult }], expected: rawResult },
  { function: 'get_heat_report_derived', args: [interactiveGroup, rawExperiment],
    expected: { gamma: 1.378, p1KPa: 106.667 } },
  { function: 'get_heat_report_derived', args: [interactiveGroup, { ...rawExperiment, id: 'other' }],
    expected: rawExperiment.derivedResult },
);

// A normal unpreheated run can have raw chart results that differ from the
// learner's calculation. Exported graphs and tables must use the same values.
const rawChart = {
  status: 'completed', theoreticalGamma: 1.4,
  meanGamma: 1.372485, typeAStandardUncertainty: 0.003333,
  points: [1.379152, 1.369152, 1.369152].map((gamma, index) => ({
    trialId: `trial-${index + 1}`, experimentNumber: index + 1, gamma,
  })),
};
const unpreheatedGroup = {
  ...interactiveGroup,
  lollipopChart: rawChart,
  calculation: {
    ...interactiveGroup.calculation,
    session: {
      theoreticalGamma: 1.4,
      aggregate: { reference: { meanGamma: 1.379, typeAStandardUncertainty: 0 } },
      groups: rawChart.points.map((point) => ({
        trialId: point.trialId, reference: { formulaGamma: 1.379152 },
      })),
    },
  },
};
const overview = {
  theoreticalGamma: 1.4,
  points: [
    { groupId: 'group-1', meanGamma: 1.372485, typeAStandardUncertainty: 0.003333 },
    { groupId: 'legacy', meanGamma: 1.4, typeAStandardUncertainty: null },
  ],
};
cases.push(
  { function: 'get_heat_report_lollipop', args: [unpreheatedGroup], expected: {
    ...rawChart, meanGamma: 1.379, typeAStandardUncertainty: 0,
    points: rawChart.points.map((point) => ({ ...point, gamma: 1.379152 })),
  } },
  { function: 'get_heat_report_lollipop', args: [{ lollipopChart: rawChart }], expected: rawChart },
  { function: 'get_heat_report_overview', args: [{
    allGroupsOverview: overview, groups: [unpreheatedGroup],
  }], expected: {
    ...overview, points: [
      { ...overview.points[0], meanGamma: 1.379, typeAStandardUncertainty: 0 },
      overview.points[1],
    ],
  } },
  { function: 'get_heat_report_overview', args: [{ allGroupsOverview: overview }], expected: overview },
);

const result = spawnSync('python', ['-B', '-c', [
  'import copy, json, sys',
  'sys.path.insert(0, "tools/exporter")',
  'import hsl_exporter as exporter',
  'cases = json.load(sys.stdin)',
  'original = copy.deepcopy(cases)',
  'print(json.dumps([getattr(exporter, case["function"])(*case["args"]) for case in cases]))',
  'assert cases == original, "Report formatting must not mutate raw data or saved calculations"',
].join('\n')], {
  cwd: resolve(import.meta.dirname, '../..'),
  input: JSON.stringify(cases),
  encoding: 'utf8',
  timeout: 30_000,
});
assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
const actual = JSON.parse(result.stdout) as unknown[];
cases.forEach((testCase, index) => {
  assert.deepEqual(actual[index], testCase.expected,
    `${testCase.function}(${testCase.args.join(', ')}) must match the calculation UI`);
});
console.log(`calculationReportPrecision: ${cases.length} report/UI comparisons passed`);
