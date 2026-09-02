import assert from 'node:assert/strict';
import {
  runHeatCapacityFreeParameterAcceptance,
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG,
} from './heatCapacityFreeParameterAcceptance.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createDefaultHeatCapacityFile,
  recordHeatCapacityFreeTraceEventWithReference,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { getHeatCapacityFreeGasTypeModelDefaults } from '../../src/domain/heatCapacity/heatCapacityGasTheory.ts';
import { DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG } from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';

const HELIUM_THEORETICAL_GAMMA = 5 / 3;
const GAMMA_SUITABLE_OPERATION_TOLERANCE = 0.06;
const AIR_MODEL_DEFAULTS = getHeatCapacityFreeGasTypeModelDefaults('air');
const acceptanceHelperSource = readFileSync(
  join(process.cwd(), 'tests', 'heatCapacity', 'heatCapacityFreeParameterAcceptance.ts'),
  'utf8',
);

assert.doesNotMatch(
  acceptanceHelperSource,
  /theoreticalGamma\??:/,
  'parameter acceptance scenarios should not keep an arbitrary theoretical-gamma override',
);
assert.doesNotMatch(
  acceptanceHelperSource,
  /input\.theoreticalGamma/,
  'parameter acceptance should derive gamma from the selected gas type instead of an arbitrary override',
);

const lowSignalDiagnosticReport = runHeatCapacityFreeParameterAcceptance({
  pumpStrokes: [2, 3, 4, 5],
  openDurationsS: [
    HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS / 2,
    HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.5,
  ],
});

const targetedReport = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'C1-absolute-ideal',
      label: 'absolute ideal instant pump and instant adiabatic release',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-adiabatic-to-ambient',
      pumpStrokes: 18,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'T0-ideal-experiment',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'B0-best-realistic-smoke',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: true,
    },
    {
      id: 'R1-u1-280',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 280,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R1-u1-320',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 320,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R2-u2-280',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 280,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R2-u2-320',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 320,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R3-open-0.4',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 0.4,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R3-open-0.8',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 0.8,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E1-u1-too-early',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 0,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E2-u2-too-early',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 0,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E3-open-0.05-known-gap',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 0.05,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E4-open-2.5',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 2.5,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E5-open-10',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 10,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E6-u2-10min',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 600,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E7-u2-20min',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 1200,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E8-u2-30min-known-gap',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 1800,
      leakageEnabled: true,
      leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'C2-instant-current-equivalent-core',
      label: 'single instant pump step and current-model-equivalent instant release',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-current-model-equivalent',
      pumpStrokes: 18,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      instrumentNoiseEnabled: false,
    },
  ],
});

assert.deepEqual(
  targetedReport.rows.map((row) => row.id),
  [
    'C1-absolute-ideal',
    'T0-ideal-experiment',
    'B0-best-realistic-smoke',
    'R1-u1-280',
    'R1-u1-320',
    'R2-u2-280',
    'R2-u2-320',
    'R3-open-0.4',
    'R3-open-0.8',
    'E1-u1-too-early',
    'E2-u2-too-early',
    'E3-open-0.05-known-gap',
    'E4-open-2.5',
    'E5-open-10',
    'E6-u2-10min',
    'E7-u2-20min',
    'E8-u2-30min-known-gap',
    'C2-instant-current-equivalent-core',
  ],
  'acceptance script should support named physical validation scenarios',
);

for (const row of targetedReport.rows) {
  assert.equal(typeof row.releaseMode, 'string', `${row.id} should report release mode`);
  assert.equal(typeof row.pumpTotalDurationS, 'number', `${row.id} should report pump cadence`);
  assert.equal(typeof row.waitAfterPumpS, 'number', `${row.id} should report U1 wait time`);
  assert.equal(typeof row.waitAfterReleaseS, 'number', `${row.id} should report U2 wait time`);
  assert.equal(typeof row.leakageEnabled, 'boolean', `${row.id} should report leakage status`);
  assert.equal(typeof row.leakageRatePerS, 'number', `${row.id} should report leakage rate`);
  assert.equal(typeof row.pressureKPa, 'number', `${row.id} should report final pressure`);
  assert.equal(typeof row.gasTemperatureK, 'number', `${row.id} should report final gas temperature`);
  assert.equal(typeof row.gasAmountRatio, 'number', `${row.id} should report final gas amount`);
}

const targetedById = new Map(targetedReport.rows.map((row) => [row.id, row]));
const absoluteIdeal = targetedById.get('C1-absolute-ideal');
const idealExperiment = targetedById.get('T0-ideal-experiment');
const bestRealisticSmoke = targetedById.get('B0-best-realistic-smoke');
const u1TooEarly = targetedById.get('E1-u1-too-early');
const u2TooEarly = targetedById.get('E2-u2-too-early');
const openVeryLong = targetedById.get('E4-open-2.5');
const openExtremeLong = targetedById.get('E5-open-10');
const u2TenMinute = targetedById.get('E6-u2-10min');
const u2TwentyMinute = targetedById.get('E7-u2-20min');
const u2ThirtyMinuteKnownGap = targetedById.get('E8-u2-30min-known-gap');
const instantCurrentEquivalentReleaseCore = targetedById.get('C2-instant-current-equivalent-core');
const shortOpenExact = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'short-open-0.03-exact',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 0.03,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'short-open-0.05-exact',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 0.05,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  ],
}).rows;
const zeroDurationRelease = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'zero-duration-no-release',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 0,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  ],
}).rows[0];
const canonicalReleaseDurationsS = [
  HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS / 2,
  HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS,
  HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS,
  HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.5,
];
const airCanonicalReleaseWindow = runHeatCapacityFreeParameterAcceptance({
  scenarios: canonicalReleaseDurationsS.map((openDurationS) => ({
    id: `R3-open-canonical-${openDurationS}`,
    pumpStrokes: 18,
    pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
    waitAfterPumpS: 300,
    openDurationS,
    waitAfterReleaseS: 300,
    leakageEnabled: true,
    leakageRatePerS: AIR_MODEL_DEFAULTS.leakageRatePerS,
    instrumentNoiseEnabled: false,
  })),
}).rows;

assert.equal(
  shortOpenExact[0].u2CorrectedMv! > shortOpenExact[1].u2CorrectedMv!,
  true,
  '0.03s should remain physically shorter than 0.05s instead of being swallowed by a 0.05s click step',
);
assert.equal(zeroDurationRelease.openDurationS, 0);
assert.equal(zeroDurationRelease.u2Recordable, false);
assert.equal(zeroDurationRelease.gamma, null);
assert.equal(
  zeroDurationRelease.u2Reason,
  'release-not-started',
  'a zero-duration release must stay a true no-op without synthesized release time',
);
assert.equal(
  airCanonicalReleaseWindow
    .filter((row) => (
      row.openDurationS >= HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS &&
      row.openDurationS <= HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS
    ))
    .every((row) => row.gamma !== null && row.gamma >= 1.35),
  true,
  'the canonical 0.5-0.7s release window should stay above gamma 1.35 in the clean real model',
);
const canonicalStandardRelease = airCanonicalReleaseWindow.find((row) => (
  row.openDurationS === HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS
));
const canonicalTooShortRelease = airCanonicalReleaseWindow[0];
const canonicalTooLongRelease = airCanonicalReleaseWindow.at(-1)!;
assert.notEqual(canonicalStandardRelease?.gamma, null);
assert.notEqual(canonicalStandardRelease?.gamma, undefined);
assert.equal(
  Math.abs(canonicalTooShortRelease.gamma! - 1.4) > Math.abs(canonicalStandardRelease!.gamma! - 1.4),
  true,
  'a too-short physical release should have larger absolute gamma error than the canonical demo duration',
);
assert.equal(
  Math.abs(canonicalTooLongRelease.gamma! - 1.4) > Math.abs(canonicalStandardRelease!.gamma! - 1.4),
  true,
  'a too-long physical release should have larger absolute gamma error than the canonical demo duration',
);
assert.notEqual(absoluteIdeal, undefined, 'absolute ideal scenario should exist in targeted acceptance report');
assert.notEqual(idealExperiment, undefined, 'ideal experiment scenario should exist in targeted acceptance report');
assert.notEqual(bestRealisticSmoke, undefined, 'best realistic smoke scenario should exist in targeted acceptance report');
assert.notEqual(u1TooEarly, undefined, 'U1-too-early scenario should exist in targeted acceptance report');
assert.notEqual(u2TooEarly, undefined, 'U2-too-early scenario should exist in targeted acceptance report');
assert.notEqual(openVeryLong, undefined, '2.5s open scenario should exist in targeted acceptance report');
assert.notEqual(openExtremeLong, undefined, '10s open scenario should exist in targeted acceptance report');
assert.notEqual(u2TenMinute, undefined, '10min U2 wait scenario should exist in targeted acceptance report');
assert.notEqual(u2TwentyMinute, undefined, '20min U2 wait scenario should exist in targeted acceptance report');
assert.notEqual(u2ThirtyMinuteKnownGap, undefined, '30min U2 known-gap scenario should exist in targeted acceptance report');
assert.notEqual(instantCurrentEquivalentReleaseCore, undefined, 'instant current-equivalent release core calibration should exist');
assert.equal(
  absoluteIdeal!.gamma !== null &&
    absoluteIdeal!.gamma >= 1.395 &&
    absoluteIdeal!.gamma <= 1.405,
  true,
  'absolute ideal operation should stay inside the six-class 1.395-1.405 target',
);
assert.equal(
  idealExperiment!.gamma !== null &&
    idealExperiment!.gamma >= 1.39 &&
    idealExperiment!.gamma <= 1.41,
  true,
  'ideal experimental operation should stay inside the six-class 1.39-1.41 target',
);
assert.equal(
  bestRealisticSmoke!.gamma !== null &&
    bestRealisticSmoke!.gamma >= 1.37 &&
    bestRealisticSmoke!.gamma <= 1.43,
  true,
  'best realistic smoke run should remain inside 1.37-1.43; the full plan still requires 30 fixed-seed runs',
);
assert.equal(
  u1TooEarly!.gamma !== null &&
    bestRealisticSmoke!.gamma !== null &&
    Math.abs(u1TooEarly!.gamma - bestRealisticSmoke!.gamma) > 0.02 &&
    Math.abs(u1TooEarly!.gamma - 1.4) > GAMMA_SUITABLE_OPERATION_TOLERANCE,
  true,
  'recording U1 immediately should remain a severe error without prescribing its direction',
);
assert.equal(
  u2TooEarly!.gamma !== null &&
    (u2TooEarly!.gamma < 1.3 || u2TooEarly!.gamma > 1.5),
  true,
  'recording U2 immediately should be an extreme wrong operation in the current smoke suite',
);
assert.equal(
  openVeryLong!.gamma !== null &&
    (openVeryLong!.gamma < 1.34 || openVeryLong!.gamma > 1.46),
  true,
  '2.5s open duration should be outside the suitable-operation 1.34-1.46 band',
);
assert.equal(
  openExtremeLong!.gamma !== null &&
    (openExtremeLong!.gamma < 1.3 || openExtremeLong!.gamma > 1.5),
  true,
  '10s open duration should be an extreme wrong operation',
);
assert.equal(
  u2TenMinute!.gamma !== null &&
    (u2TenMinute!.gamma < 1.37 || u2TenMinute!.gamma > 1.43),
  true,
  '10min U2 wait should leave the 1.37-1.43 best-operation band',
);
assert.equal(
  u2TwentyMinute!.gamma !== null &&
    (u2TwentyMinute!.gamma < 1.34 || u2TwentyMinute!.gamma > 1.46),
  true,
  '20min U2 wait should leave the 1.34-1.46 suitable-operation band',
);
assert.equal(
  u2ThirtyMinuteKnownGap!.u1Recordable && u2ThirtyMinuteKnownGap!.u2Recordable,
  true,
  '30min U2 known-gap scenario should remain recordable so the full validation plan can report the current gap',
);
assert.equal(
  instantCurrentEquivalentReleaseCore!.releaseMode,
  'instant-current-model-equivalent',
  'current-equivalent core calibration should report the model-equivalent instant release mode',
);
assert.equal(
  instantCurrentEquivalentReleaseCore!.u1Recordable && instantCurrentEquivalentReleaseCore!.u2Recordable,
  true,
  'current-equivalent instant release core calibration should be recordable',
);
assert.equal(
  absoluteIdeal!.gamma !== null &&
    instantCurrentEquivalentReleaseCore!.gamma !== null &&
    Math.abs(instantCurrentEquivalentReleaseCore!.gamma - absoluteIdeal!.gamma) <= 0.006,
  true,
  'current-model-equivalent instant release should stay close to the ideal instant release core result',
);

const heliumTargetedReport = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'H-C1-absolute-ideal',
      label: 'helium absolute ideal instant pump and instant adiabatic release',
      gasType: 'helium',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-adiabatic-to-ambient',
      pumpStrokes: 18,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'H-B0-best-realistic-smoke',
      gasType: 'helium',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      instrumentNoiseEnabled: true,
    },
    {
      id: 'H-E1-u1-too-early',
      gasType: 'helium',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 0,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'H-E2-u2-too-early',
      gasType: 'helium',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 0,
      leakageEnabled: true,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'H-E4-open-2.5',
      gasType: 'helium',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: 2.5,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'H-E6-u2-wait-12m',
      gasType: 'helium',
      pumpStrokes: 18,
      pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
      waitAfterPumpS: 300,
      openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
      waitAfterReleaseS: 720,
      leakageEnabled: true,
      instrumentNoiseEnabled: false,
    },
  ],
});
const heliumById = new Map(heliumTargetedReport.rows.map((row) => [row.id, row]));
const heliumAbsoluteIdeal = heliumById.get('H-C1-absolute-ideal');
const heliumBestRealisticSmoke = heliumById.get('H-B0-best-realistic-smoke');
const heliumU1TooEarly = heliumById.get('H-E1-u1-too-early');
const heliumU2TooEarly = heliumById.get('H-E2-u2-too-early');
const heliumOpenVeryLong = heliumById.get('H-E4-open-2.5');
const heliumU2TwelveMinute = heliumById.get('H-E6-u2-wait-12m');

// The production numeric calibration is scoped to air (gammaTrue = 1.4).
// Helium keeps only the ideal-core gammaTrue check plus relative error trends.
assert.equal(
  heliumAbsoluteIdeal?.gamma !== null &&
    heliumAbsoluteIdeal?.gamma !== undefined &&
    Math.abs(heliumAbsoluteIdeal.gamma - HELIUM_THEORETICAL_GAMMA) <= 0.006,
  true,
  `helium absolute ideal operation should calculate around the helium theoretical gamma instead of the air center, got ${heliumAbsoluteIdeal?.gamma}`,
);
assert.equal(
  heliumBestRealisticSmoke?.gamma !== null &&
    heliumBestRealisticSmoke?.gamma !== undefined,
  true,
  'helium best realistic smoke run should remain finite without inheriting the air calibration band',
);
assert.equal(
  heliumU1TooEarly?.gamma !== null &&
    heliumU1TooEarly?.gamma !== undefined &&
    heliumBestRealisticSmoke?.gamma !== null &&
    heliumBestRealisticSmoke?.gamma !== undefined &&
    Math.abs(heliumU1TooEarly.gamma - HELIUM_THEORETICAL_GAMMA) >
      Math.abs(heliumBestRealisticSmoke.gamma - HELIUM_THEORETICAL_GAMMA),
  true,
  'helium U1-too-early should degrade relative to its own realistic baseline without an air-derived cutoff',
);
assert.equal(
  heliumU2TooEarly?.gamma !== null &&
    heliumU2TooEarly?.gamma !== undefined &&
    heliumBestRealisticSmoke?.gamma !== null &&
    heliumBestRealisticSmoke?.gamma !== undefined &&
    Math.abs(heliumU2TooEarly.gamma - HELIUM_THEORETICAL_GAMMA) >
      Math.abs(heliumBestRealisticSmoke.gamma - HELIUM_THEORETICAL_GAMMA),
  true,
  'helium U2-too-early should degrade relative to its own realistic baseline without an air-derived cutoff',
);
assert.equal(
  heliumOpenVeryLong?.gamma !== null &&
    heliumOpenVeryLong?.gamma !== undefined &&
    heliumBestRealisticSmoke?.gamma !== null &&
    heliumBestRealisticSmoke?.gamma !== undefined &&
    Math.abs(heliumOpenVeryLong.gamma - HELIUM_THEORETICAL_GAMMA) >
      Math.abs(heliumBestRealisticSmoke.gamma - HELIUM_THEORETICAL_GAMMA),
  true,
  'helium 2.5s long-open should degrade relative to its own realistic baseline without an air-derived cutoff',
);
assert.equal(
  heliumU2TwelveMinute?.gamma !== null &&
    heliumU2TwelveMinute?.gamma !== undefined &&
    heliumBestRealisticSmoke?.gamma !== null &&
    heliumBestRealisticSmoke?.gamma !== undefined &&
    Math.abs(heliumU2TwelveMinute.gamma - HELIUM_THEORETICAL_GAMMA) >
      Math.abs(heliumBestRealisticSmoke.gamma - HELIUM_THEORETICAL_GAMMA),
  true,
  'helium 12min U2 wait should degrade relative to its own realistic baseline without an air-derived cutoff',
);

assert.equal(
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
  90,
  'parameter acceptance should preserve the 90 mV Free U1 diagnostic threshold',
);

const configuredFile = createDefaultHeatCapacityFile(91);
const tracedConfiguredFile = recordHeatCapacityFreeTraceEventWithReference({
  ...configuredFile,
  heatCapacityFreeInstrumentConfig: {
    ...configuredFile.heatCapacityFreeInstrumentConfig,
    environment: {
      ambientPressureKPa: 100.8,
      ambientTemperatureK: 299.25,
    },
    physics: {
      ...configuredFile.heatCapacityFreeInstrumentConfig.physics,
      gamma: 1.37,
      vesselVolumeL: 2.4,
      pumpAmountGainRatio: 0.0065,
      pumpPressureLimitKPa: 112,
      stopcockFlowRate: 4.4,
      thermal: {
        gasWallConductanceWPerK: 0.45,
        wallAmbientConductanceWPerK: 1.85,
        wallHeatCapacityJPerK: 45,
        minimumGasHeatCapacityJPerK: 0.1,
      },
    },
    sensor: {
      ...configuredFile.heatCapacityFreeInstrumentConfig.sensor,
      pressureMvPerKPa: 21.5,
      temperatureMvAtAmbient: 1501.2,
      temperatureMvPerK: 2.2,
      lagRate: 4.5,
      noiseMv: 0.03,
      quantizationMv: 0.02,
    },
  },
}, 'power-on', 100).file;
const configuredTraceTrial = tracedConfiguredFile.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === tracedConfiguredFile.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId
));
assert.notEqual(configuredTraceTrial, undefined, 'Free trace trial should exist after a traced event');
assert.equal(configuredTraceTrial!.configSnapshot.environment.ambientPressureKPa, 100.8);
assert.equal(configuredTraceTrial!.configSnapshot.environment.ambientTemperatureK, 299.25);
assert.equal(configuredTraceTrial!.configSnapshot.physics.gamma, 1.37);
assert.equal(
  configuredTraceTrial!.configSnapshot.physics.vesselVolumeL,
  2,
  'new Free trace snapshots should keep vessel volume fixed even if a stale file config carries a custom value',
);
assert.equal(
  configuredTraceTrial!.configSnapshot.physics.pumpAmountGainRatio,
  0.00334,
  'new Free trace snapshots should keep pump amount gain fixed even if a stale file config carries a custom value',
);
assert.equal(configuredTraceTrial!.configSnapshot.physics.thermal.gasWallConductanceWPerK, 0.45);
assert.equal(configuredTraceTrial!.configSnapshot.physics.thermal.wallAmbientConductanceWPerK, 1.85);
assert.equal(configuredTraceTrial!.configSnapshot.sensor.pressureMvPerKPa, 21.5);
assert.equal(
  configuredTraceTrial!.configSnapshot.sensor.temperatureMvAtAmbient,
  1501.2,
  'Free trace snapshots should preserve an existing ambient baseline for legacy-file compatibility',
);
assert.equal(
  configuredTraceTrial!.configSnapshot.sensor.temperatureMvPerK,
  DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.temperatureSensitivityMvPerK,
  'new Free trace snapshots should replace stale mode-specific temperature sensitivities',
);
assert.equal(configuredTraceTrial!.configSnapshot.record.minimumUsefulU1CorrectedMv, 90);
assert.equal(configuredTraceTrial!.configSnapshot.record.pressureDangerMv, 140);
const changedAfterTrace = {
  ...tracedConfiguredFile,
  heatCapacityFreeInstrumentConfig: {
    ...tracedConfiguredFile.heatCapacityFreeInstrumentConfig,
    environment: {
      ...tracedConfiguredFile.heatCapacityFreeInstrumentConfig.environment,
      ambientPressureKPa: 120,
    },
  },
};
assert.equal(
  changedAfterTrace.heatCapacityFreeRunWorkspace.traceStore.traceTrials[0].configSnapshot.environment.ambientPressureKPa,
  100.8,
  'Free config snapshot should be copied at trace creation instead of reading later file config changes',
);

const standardReleaseRows = lowSignalDiagnosticReport.rows.filter((row) => (
  row.openDurationS === HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS
));
assert.deepEqual(
  standardReleaseRows.map((row) => row.pumpStrokes),
  [2, 3, 4, 5],
  'low-signal diagnostic smoke should still cover 2-5 pump strokes',
);

for (const strokes of [3, 4]) {
  const row = standardReleaseRows.find((candidate) => candidate.pumpStrokes === strokes);
  assert.notEqual(row, undefined, `${strokes} pump strokes should be represented`);
  assert.equal(row?.u1Recordable, true, `${strokes} pump strokes should be recordable as U1`);
  assert.equal(row?.u2Recordable, true, `${strokes} pump strokes should be recordable as U2 after the standard release`);
  assert.equal(
    row !== undefined &&
      row.u1CorrectedMv !== null &&
      row.u1CorrectedMv < HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
    true,
    `${strokes} pump strokes should remain a low-signal diagnostic row instead of being treated as a normal-pressure experiment`,
  );
}

const twoStroke = standardReleaseRows.find((row) => row.pumpStrokes === 2);
assert.equal(twoStroke?.u1Recordable, true, '2 pump strokes should be recordable after minimum U1 is downgraded to diagnostics');
assert.equal(twoStroke?.u2Recordable, true, '2 pump strokes should remain recordable through U2 for later diagnosis');
assert.equal(
  twoStroke !== undefined &&
    twoStroke.u1CorrectedMv !== null &&
    twoStroke.u1CorrectedMv < HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
  true,
  '2 pump strokes should stay below the diagnostic U1 threshold even though recording is allowed',
);
assert.equal(twoStroke?.safetyStatus, 'normal', '2 pump strokes should remain below the warning line');

const fourStroke = standardReleaseRows.find((row) => row.pumpStrokes === 4);
assert.equal(fourStroke?.safetyStatus, 'normal', '4-pump low-signal diagnostic row should remain below the suggested stop line');

const fiveStroke = standardReleaseRows.find((row) => row.pumpStrokes === 5);
assert.equal(fiveStroke?.safetyStatus, 'normal', '5-pump low-signal diagnostic row should remain below the suggested stop line');
assert.equal(
  fiveStroke?.u1Recordable,
  true,
  '5 requested pump strokes should remain recordable for low-pressure diagnostic review',
);

const slowClose = lowSignalDiagnosticReport.rows.find((row) => (
  row.pumpStrokes === 4 &&
  row.openDurationS === HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.5
));
assert.equal(slowClose?.u2Recordable, true, 'moderately slow close should still produce a recordable U2 row');
assert.equal(
  slowClose !== undefined &&
    slowClose.gamma !== null &&
    Number.isFinite(slowClose.gamma),
  true,
  'a release beyond the canonical window should remain diagnosable without prescribing a gamma direction in the low-signal nonlinear region',
);

console.log('heatCapacityFreeParameterAcceptance tests passed');
