import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidenceDir = join(rootDir, 'docs/validation/generated');
const summary = JSON.parse(readFileSync(join(evidenceDir, 'evidence-summary.json'), 'utf8')) as {
  rapidRelease: {
    scenarioSummary: Array<Record<string, unknown>>;
    nonidealComparison: Array<Record<string, unknown>>;
    sensorLagSummary: Array<Record<string, unknown>>;
    sensorStaticNonlinearity: Array<Record<string, unknown>>;
    zeroCalibration: Array<Record<string, unknown>>;
    displayResolutionSummary: Array<Record<string, unknown>>;
    measurementNoiseResolutionSummary: Array<Record<string, unknown>>;
    twoStageThermalSummary: Array<Record<string, unknown>>;
    stopcockApertureRamp: Array<Record<string, unknown>>;
    stopcockFlowSensitivity: Array<Record<string, unknown>>;
    evidenceCoverage: Array<Record<string, unknown>>;
  };
  idealGas: { relationSummary: Array<Record<string, unknown>> };
  hardSphere: {
    runSummary: Array<Record<string, unknown>>;
    energyConservationSummaryNu0: Array<Record<string, unknown>>;
  };
};
const metadata = JSON.parse(readFileSync(join(evidenceDir, 'evidence-metadata.json'), 'utf8')) as {
  repository: {
    root: string;
    dirtyAtStart: boolean;
    dirtyEntryCountAtStart: number;
    statusAtStart?: unknown;
  };
  sourceFiles: Array<{ path: string; bytes: number; sha256: string }>;
  generatedFiles: Array<{ path: string; bytes: number; sha256: string }>;
};

assert.equal(metadata.repository.root, '.');
assert.equal(Number.isInteger(metadata.repository.dirtyEntryCountAtStart), true);
assert.equal(metadata.repository.dirtyEntryCountAtStart >= 0, true);
assert.equal(metadata.repository.dirtyAtStart, metadata.repository.dirtyEntryCountAtStart > 0);
assert.equal('statusAtStart' in metadata.repository, false);

const standardHeat = summary.rapidRelease.scenarioSummary.find((row) => (
  row.scenario_id === 'standard-realistic'
));
assert.ok(standardHeat);
assert.equal(standardHeat.configured_runs, 30);
assert.equal(standardHeat.valid_gamma_runs, 30);
assert.equal(summary.rapidRelease.nonidealComparison.length, 8);

assert.equal(summary.rapidRelease.evidenceCoverage.length, 8);
const stopcockCoverage = summary.rapidRelease.evidenceCoverage.find((row) => (
  row.category_id === 'stopcock-aperture-duration'
));
assert.ok(stopcockCoverage);
assert.equal(stopcockCoverage.isolation_status, 'limited-no-static-aperture-control');

assert.equal(summary.rapidRelease.sensorLagSummary.length, 4);
const pressureIdealLag = summary.rapidRelease.sensorLagSummary.find((row) => (
  row.condition_id === 'pressure-idealized-no-lag'
));
const pressureRepresentativeLag = summary.rapidRelease.sensorLagSummary.find((row) => (
  row.condition_id === 'pressure-representative-lag'
));
const temperatureIdealLag = summary.rapidRelease.sensorLagSummary.find((row) => (
  row.condition_id === 'temperature-idealized-no-lag'
));
const temperatureRepresentativeLag = summary.rapidRelease.sensorLagSummary.find((row) => (
  row.condition_id === 'temperature-representative-lag'
));
assert.ok(pressureIdealLag && pressureRepresentativeLag);
assert.ok(temperatureIdealLag && temperatureRepresentativeLag);
assert.equal(
  Number(pressureRepresentativeLag.time_to_90_percent_s) >
    Number(pressureIdealLag.time_to_90_percent_s),
  true,
);
assert.equal(
  Number(temperatureRepresentativeLag.time_to_90_percent_s) >
    Number(temperatureIdealLag.time_to_90_percent_s),
  true,
);
assert.equal(summary.rapidRelease.sensorStaticNonlinearity.length, 15);

assert.equal(summary.rapidRelease.zeroCalibration.length, 15);
assert.equal(
  summary.rapidRelease.zeroCalibration.every((row) => row.automatic_u0_ready === true),
  true,
);
assert.equal(
  new Set(summary.rapidRelease.zeroCalibration.map((row) => (
    row.gamma_after_recorded_u0_subtraction
  ))).size,
  1,
  'a constant zero residual should cancel after correctly recorded U0 subtraction',
);

assert.equal(summary.rapidRelease.displayResolutionSummary.length, 3);
const sensorQuantizedGamma = summary.rapidRelease.displayResolutionSummary.find((row) => (
  row.calculation_stage === 'sensor-quantized-0.01mV'
));
const uiResolutionGamma = summary.rapidRelease.displayResolutionSummary.find((row) => (
  row.calculation_stage === 'ui-record-truncated-0.1mV'
));
assert.ok(sensorQuantizedGamma && uiResolutionGamma);
assert.equal(Math.abs(Number(sensorQuantizedGamma.delta_gamma_vs_raw)) < 0.001, true);
assert.equal(Math.abs(Number(uiResolutionGamma.delta_gamma_vs_raw)) < 0.001, true);

assert.equal(summary.rapidRelease.measurementNoiseResolutionSummary.length, 6);
const allNoiseSamples = summary.rapidRelease.measurementNoiseResolutionSummary.find((row) => (
  row.group === 'all-seeds'
));
assert.ok(allNoiseSamples);
assert.equal(allNoiseSamples.sample_count, 100);
assert.equal(Number(allNoiseSamples.distinct_sensor_values) > 1, true);

assert.equal(summary.rapidRelease.twoStageThermalSummary.length, 3);
const nominalThermal = summary.rapidRelease.twoStageThermalSummary.find((row) => (
  row.condition_id === 'two-stage-nominal'
));
const gasWallDisabled = summary.rapidRelease.twoStageThermalSummary.find((row) => (
  row.condition_id === 'gas-wall-disabled'
));
const wallAmbientDisabled = summary.rapidRelease.twoStageThermalSummary.find((row) => (
  row.condition_id === 'wall-ambient-disabled'
));
assert.ok(nominalThermal && gasWallDisabled && wallAmbientDisabled);
assert.equal(Number(gasWallDisabled.gas_recovery_fraction_at_300s), 0);
assert.equal(
  Number(nominalThermal.gas_recovery_fraction_at_300s) >
    Number(wallAmbientDisabled.gas_recovery_fraction_at_300s),
  true,
);

assert.equal(summary.rapidRelease.stopcockApertureRamp.length, 13);
assert.equal(
  summary.rapidRelease.stopcockApertureRamp.every((row) => (
    row.independently_set_static_aperture === false
  )),
  true,
);
assert.equal(summary.rapidRelease.stopcockFlowSensitivity.length, 4);
assert.equal(
  summary.rapidRelease.stopcockFlowSensitivity.every((row) => (
    row.static_partial_aperture_ratio === null
  )),
  true,
);

assert.equal(summary.idealGas.relationSummary.length, 3);
for (const relation of summary.idealGas.relationSummary) {
  assert.equal(relation.points_per_seed, 6);
  assert.equal(relation.seed_count, 5);
  assert.equal(relation.verdict, 'verified');
}

assert.equal(summary.hardSphere.runSummary.length, 5);
assert.equal(summary.hardSphere.energyConservationSummaryNu0.length, 5);
for (const row of summary.hardSphere.runSummary) {
  assert.equal(row.speed_bin_count, 30);
  assert.equal(row.energy_bin_count, 30);
  assert.equal(typeof row.wall_momentum_mean_pressure, 'number');
  assert.equal(typeof row.ideal_reference_mean_pressure, 'number');
}
for (const row of summary.hardSphere.energyConservationSummaryNu0) {
  assert.equal(row.thermostat_frequency_nu, 0);
  assert.equal(
    typeof row.maximum_absolute_relative_drift_percent === 'number' &&
      row.maximum_absolute_relative_drift_percent <= 1e-9,
    true,
  );
}

for (const file of [...metadata.sourceFiles, ...metadata.generatedFiles]) {
  const absolutePath = join(rootDir, file.path);
  const content = readFileSync(absolutePath);
  const digest = createHash('sha256').update(content).digest('hex');
  assert.equal(content.length, file.bytes, `${file.path} byte count should match metadata`);
  assert.equal(digest, file.sha256, `${file.path} SHA-256 should match metadata`);
}
for (const file of metadata.generatedFiles) {
  assert.equal(/air[-_ ]?vibration/i.test(file.path), false, 'air-vibration evidence remains out of scope');
  assert.equal(
    /\.(?:png|jpe?g|webp|gif|svg|pdf)$/i.test(file.path),
    false,
    'the stable evidence generation scope must not create images or PDFs',
  );
}

console.log('researchReportGeneratedEvidence tests passed');
