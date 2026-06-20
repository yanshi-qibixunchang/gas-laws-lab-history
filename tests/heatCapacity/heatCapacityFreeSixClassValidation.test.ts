import assert from 'node:assert/strict';

import {
  runHeatCapacityFreeParameterAcceptance,
  type HeatCapacityFreeParameterAcceptanceRow,
  type HeatCapacityFreeParameterAcceptanceScenarioInput,
} from './heatCapacityFreeParameterAcceptance.ts';

type ScenarioInput = HeatCapacityFreeParameterAcceptanceScenarioInput;

const baseScenario = (
  id: string,
  overrides: Partial<ScenarioInput> = {},
): ScenarioInput => ({
  id,
  pumpStrokes: 18,
  pumpTotalDurationS: 12,
  waitAfterPumpS: 300,
  openDurationS: 0.35,
  waitAfterReleaseS: 300,
  leakageEnabled: true,
  leakageRatePerS: 0.00005,
  instrumentNoiseEnabled: true,
  ...overrides,
});

const runSingle = (scenario: ScenarioInput) => (
  runHeatCapacityFreeParameterAcceptance({ scenarios: [scenario] }).rows[0]
);

const runRepeated = (
  prefix: string,
  scenario: ScenarioInput,
  count = 30,
) => (
  Array.from({ length: count }, (_, index) => runSingle({
    ...scenario,
    id: `${prefix}-${index + 1}`,
  }))
);

const gammaValues = (rows: HeatCapacityFreeParameterAcceptanceRow[]) => (
  rows
    .map((row) => row.gamma)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
);

const mean = (values: number[]) => (
  values.reduce((sum, value) => sum + value, 0) / values.length
);

const meanAbsoluteGammaError = (values: number[]) => (
  mean(values.map((value) => Math.abs(value - 1.4)))
);

const slidingMeans = (values: number[], windowSize: number) => (
  Array.from(
    { length: Math.max(0, values.length - windowSize + 1) },
    (_, index) => mean(values.slice(index, index + windowSize)),
  )
);

const assertInRange = (
  value: number | null,
  min: number,
  max: number,
  message: string,
) => {
  assert.equal(
    value !== null && value >= min && value <= max,
    true,
    `${message}: expected ${value} in [${min}, ${max}]`,
  );
};

const assertRecordableSeries = (
  rows: HeatCapacityFreeParameterAcceptanceRow[],
  label: string,
) => {
  const failed = rows.filter((row) => !row.u1Recordable || !row.u2Recordable || row.gamma === null);
  assert.deepEqual(
    failed.map((row) => `${row.id}:${row.u1Reason}/${row.u2Reason}`),
    [],
    `${label} should keep all repeated runs recordable`,
  );
};

const assertSlidingMeanRange = (
  rows: HeatCapacityFreeParameterAcceptanceRow[],
  min: number,
  max: number,
  label: string,
) => {
  assertRecordableSeries(rows, label);
  const gammas = gammaValues(rows);
  assert.equal(gammas.length, rows.length, `${label} should produce gamma for every run`);
  const windows = slidingMeans(gammas, 3);
  for (const [index, value] of windows.entries()) {
    assert.equal(
      value >= min && value <= max,
      true,
      `${label} sliding mean ${index + 1} should be in [${min}, ${max}], got ${value}`,
    );
  }
};

const assertMeanRange = (
  rows: HeatCapacityFreeParameterAcceptanceRow[],
  min: number,
  max: number,
  label: string,
) => {
  assertRecordableSeries(rows, label);
  const gammas = gammaValues(rows);
  const value = mean(gammas);
  assert.equal(
    value >= min && value <= max,
    true,
    `${label} 30-run mean should be in [${min}, ${max}], got ${value}`,
  );
};

{
  const absoluteIdeal = runSingle(baseScenario('absolute-ideal', {
    pumpMode: 'instant-equivalent',
    releaseMode: 'instant-adiabatic-to-ambient',
    pumpTotalDurationS: 0,
    leakageEnabled: false,
    leakageRatePerS: 0,
    pumpValveExchangeEnabled: false,
    environmentDisturbanceEnabled: false,
    instrumentNoiseEnabled: false,
  }));
  assertInRange(absoluteIdeal.gamma, 1.395, 1.405, 'absolute ideal gamma');

  const idealExperiment = runSingle(baseScenario('ideal-experiment', {
    leakageEnabled: false,
    leakageRatePerS: 0,
    pumpValveExchangeEnabled: false,
    environmentDisturbanceEnabled: false,
    instrumentNoiseEnabled: false,
  }));
  assertInRange(idealExperiment.gamma, 1.39, 1.41, 'ideal experiment gamma');
}

assertSlidingMeanRange(
  runRepeated('best-realistic', baseScenario('best-realistic')),
  1.37,
  1.43,
  'best realistic operation',
);

const suitableScenarios = [
  ['low-extreme', baseScenario('low-extreme', {
    pumpStrokes: 17,
    pumpTotalDurationS: 12,
    waitAfterPumpS: 280,
    openDurationS: 0.25,
    waitAfterReleaseS: 280,
  })],
  ['high-extreme', baseScenario('high-extreme', {
    pumpStrokes: 19,
    pumpTotalDurationS: 12,
    waitAfterPumpS: 320,
    openDurationS: 0.45,
    waitAfterReleaseS: 320,
  })],
  ['sample-a', baseScenario('sample-a', {
    pumpStrokes: 17,
    pumpTotalDurationS: 0,
    waitAfterPumpS: 320,
    openDurationS: 0.35,
    waitAfterReleaseS: 280,
  })],
  ['sample-b', baseScenario('sample-b', {
    pumpStrokes: 18,
    pumpTotalDurationS: 6,
    waitAfterPumpS: 300,
    openDurationS: 0.45,
    waitAfterReleaseS: 300,
  })],
  ['sample-c', baseScenario('sample-c', {
    pumpStrokes: 19,
    pumpTotalDurationS: 0,
    waitAfterPumpS: 280,
    openDurationS: 0.25,
    waitAfterReleaseS: 320,
  })],
] as const;

for (const [label, scenario] of suitableScenarios) {
  assertMeanRange(
    runRepeated(label, scenario),
    1.34,
    1.46,
    `suitable operation ${label}`,
  );
}

{
  const openShort003 = runSingle(baseScenario('open-0.03s-no-noise', {
    openDurationS: 0.03,
    leakageEnabled: false,
    leakageRatePerS: 0,
    pumpValveExchangeEnabled: false,
    environmentDisturbanceEnabled: false,
    instrumentNoiseEnabled: false,
  }));
  const openShort005 = runSingle(baseScenario('open-0.05s-no-noise', {
    openDurationS: 0.05,
    leakageEnabled: false,
    leakageRatePerS: 0,
    pumpValveExchangeEnabled: false,
    environmentDisturbanceEnabled: false,
    instrumentNoiseEnabled: false,
  }));
  const openStandard035 = runSingle(baseScenario('open-0.35s-no-noise', {
    openDurationS: 0.35,
    leakageEnabled: false,
    leakageRatePerS: 0,
    pumpValveExchangeEnabled: false,
    environmentDisturbanceEnabled: false,
    instrumentNoiseEnabled: false,
  }));
  assertRecordableSeries(
    [openShort003, openShort005, openStandard035],
    'short open no-noise diagnostic',
  );
  assert.equal(
    openShort003.u2CorrectedMv! - openStandard035.u2CorrectedMv! > 1.2,
    true,
    `0.03s should have a larger U2 gap than the old model: got ${openShort003.u2CorrectedMv} vs ${openStandard035.u2CorrectedMv}`,
  );
  assert.equal(
    openShort003.gamma! - openStandard035.gamma! > 0.05,
    true,
    `0.03s gamma should deviate by more than 0.05 from standard 0.35s release: got ${openShort003.gamma} vs ${openStandard035.gamma}`,
  );
  assert.equal(
    openShort005.u2CorrectedMv! - openStandard035.u2CorrectedMv! > 1.0,
    true,
    `0.05s should have a larger U2 gap than the old model: got ${openShort005.u2CorrectedMv} vs ${openStandard035.u2CorrectedMv}`,
  );
}

{
  const lowPressureStats = [4, 8, 12, 16, 18].map((pumpStrokes) => {
    const rows = runRepeated(
      `low-pressure-${pumpStrokes}`,
      baseScenario(`low-pressure-${pumpStrokes}`, { pumpStrokes }),
    );
    assertRecordableSeries(rows, `${pumpStrokes} low-pressure diagnostic strokes`);
    return {
      pumpStrokes,
      mae: meanAbsoluteGammaError(gammaValues(rows)),
    };
  });
  for (let index = 1; index < lowPressureStats.length; index += 1) {
    const previous = lowPressureStats[index - 1];
    const current = lowPressureStats[index];
    assert.equal(
      previous.mae > current.mae,
      true,
      `low-pressure MAE should improve as strokes approach 18: ${previous.pumpStrokes}=${previous.mae}, ${current.pumpStrokes}=${current.mae}`,
    );
  }
  assert.equal(
    lowPressureStats[0].mae - lowPressureStats[1].mae >
      lowPressureStats[3].mae - lowPressureStats[4].mae,
    true,
    'low-pressure MAE improvement should slow down near the target stroke count',
  );
}

{
  const standardPump = runSingle(baseScenario('pump-duration-standard', {
    pumpTotalDurationS: 12,
  }));
  const slowPump = runSingle(baseScenario('pump-duration-50s', {
    pumpTotalDurationS: 50,
  }));
  const verySlowPump = runSingle(baseScenario('pump-duration-120s', {
    pumpTotalDurationS: 120,
  }));
  assertRecordableSeries([standardPump, slowPump, verySlowPump], 'slow pump diagnostic');
  assert.equal(
    Math.abs(slowPump.gamma! - 1.4) > Math.abs(standardPump.gamma! - 1.4) + 0.004,
    true,
    `50s pump should be measurably worse than 12s pump: 12s=${standardPump.gamma}, 50s=${slowPump.gamma}`,
  );
  assert.equal(
    slowPump.gamma! >= 1.355 && slowPump.gamma! < 1.37,
    true,
    `50s pump should round into the visibly worse 1.36 band: got ${slowPump.gamma}`,
  );
  assert.equal(
    Math.abs(verySlowPump.gamma! - 1.4) > Math.abs(slowPump.gamma! - 1.4) + 0.006,
    true,
    `120s pump should be worse than 50s pump: 50s=${slowPump.gamma}, 120s=${verySlowPump.gamma}`,
  );
  assert.equal(
    verySlowPump.u1CorrectedMv !== null &&
      slowPump.u1CorrectedMv !== null &&
      standardPump.u1CorrectedMv !== null &&
      verySlowPump.u1CorrectedMv < slowPump.u1CorrectedMv &&
      slowPump.u1CorrectedMv < standardPump.u1CorrectedMv,
    true,
    'pump-valve exchange should explain slow pumping through reduced U1 signal',
  );
}

const u1TooEarly = runSingle(baseScenario('u1-too-early', {
  waitAfterPumpS: 0,
  instrumentNoiseEnabled: false,
}));
assert.equal(
  u1TooEarly.gamma !== null && (u1TooEarly.gamma < 1.3 || u1TooEarly.gamma > 1.5),
  true,
  `U1 immediate record should leave [1.3, 1.5], got ${u1TooEarly.gamma}`,
);

const u2TooEarly = runSingle(baseScenario('u2-too-early', {
  waitAfterReleaseS: 0,
  instrumentNoiseEnabled: false,
}));
assert.equal(
  u2TooEarly.gamma !== null && (u2TooEarly.gamma < 1.3 || u2TooEarly.gamma > 1.5),
  true,
  `U2 immediate record should leave [1.3, 1.5], got ${u2TooEarly.gamma}`,
);

const openVeryLong = runSingle(baseScenario('open-2.5s', {
  openDurationS: 2.5,
  instrumentNoiseEnabled: false,
}));
assert.equal(
  openVeryLong.gamma !== null && (openVeryLong.gamma < 1.34 || openVeryLong.gamma > 1.46),
  true,
  `2.5s open duration should leave [1.34, 1.46], got ${openVeryLong.gamma}`,
);

const openExtremeLong = runSingle(baseScenario('open-10s', {
  openDurationS: 10,
  instrumentNoiseEnabled: false,
}));
assert.equal(
  openExtremeLong.gamma !== null && (openExtremeLong.gamma < 1.3 || openExtremeLong.gamma > 1.5),
  true,
  `10s open duration should leave [1.3, 1.5], got ${openExtremeLong.gamma}`,
);

const u2TenMinutes = runSingle(baseScenario('u2-10min', {
  waitAfterReleaseS: 600,
  instrumentNoiseEnabled: false,
}));
assert.equal(
  u2TenMinutes.gamma !== null && (u2TenMinutes.gamma < 1.37 || u2TenMinutes.gamma > 1.43),
  true,
  `10min U2 wait should leave [1.37, 1.43], got ${u2TenMinutes.gamma}`,
);

const u2TwentyMinutes = runSingle(baseScenario('u2-20min', {
  waitAfterReleaseS: 1200,
  instrumentNoiseEnabled: false,
}));
assert.equal(
  u2TwentyMinutes.gamma !== null && (u2TwentyMinutes.gamma < 1.34 || u2TwentyMinutes.gamma > 1.46),
  true,
  `20min U2 wait should leave [1.34, 1.46], got ${u2TwentyMinutes.gamma}`,
);

console.log('heatCapacityFreeSixClassValidation tests passed');
