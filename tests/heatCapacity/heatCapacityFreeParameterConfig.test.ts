import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  convertSensorLagTimeSToLagRate,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getEffectiveHeatCapacityFreeSensorConfig,
  normalizeHeatCapacityFreeParameterDraft,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreePhysicsConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeSensorConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';

const physicsConfig: HeatCapacityFreePhysicsConfig = {
  environment: {
    ambientPressureKPa: 100.8,
    ambientTemperatureK: 299.25,
  },
  vesselVolumeL: 2.4,
  gamma: 1.37,
  pumpAmountGainRatio: 0.0065,
  pumpPressureLimitKPa: 112,
  pumpInflowTemperatureRiseK: 42,
  stopcockFlowRate: 4.4,
  thermal: {
    gasWallConductanceWPerK: 0.45,
    wallAmbientConductanceWPerK: 1.85,
    wallHeatCapacityJPerK: 52,
    minimumGasHeatCapacityJPerK: 0.1,
  },
  leakage: {
    enabled: true,
    ratePerS: 0.0012,
  },
};

const sensorConfig: HeatCapacityFreeSensorConfig = {
  pressureMvPerKPa: 21.5,
  temperatureMvAtAmbient: 1501.2,
  temperatureMvPerK: 2.2,
  lagRate: 4,
  noiseMv: 0.03,
  quantizationMv: 0.02,
  minSampleIntervalS: 0.08,
  maxSampleIntervalS: 0.12,
  historyWindowS: 2,
};

const recordConfig: HeatCapacityFreeRecordConfig = {
  u0ZeroToleranceMv: 0.12,
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 8,
  pressureDangerMv: 140,
};

const finalDraftKeys = [
  'ambientPressureKPa',
  'ambientTemperatureK',
  'gasWallConductanceWPerK',
  'wallAmbientConductanceWPerK',
  'leakageEnabled',
  'instrumentNoiseEnabled',
  'pressureMvPerKPa',
  'vesselVolumeL',
  'gamma',
  'wallHeatCapacityJPerK',
  'leakageRatePerS',
  'noiseMv',
  'sensorLagTimeS',
  'u0ZeroToleranceMv',
  'pressureStableSlopeMvPerS',
  'temperatureStableSlopeMvPerS',
  'temperatureAmbientToleranceMv',
  'minimumUsefulU1CorrectedMv',
  'overVentedMinimumU2CorrectedMv',
  'pressureWarningMv',
  'pressureDangerMv',
].sort();

const excludedDraftKeys = [
  'stopcockFlowRate',
  'gammaRef',
  'pumpAmountGainRatio',
  'pumpInflowTemperatureRiseK',
  'minimumGasHeatCapacityJPerK',
  'quantizationMv',
  'temperatureMvPerK',
];

const draft = createHeatCapacityFreeParameterDraftFromConfigs(
  physicsConfig,
  sensorConfig,
  recordConfig,
  120,
  true,
);

assert.deepEqual(
  Object.keys(draft).sort(),
  finalDraftKeys,
  'draft should expose exactly the final editable heat-capacity free parameter set',
);

for (const excludedKey of excludedDraftKeys) {
  assert.equal(
    Object.hasOwn(draft, excludedKey),
    false,
    `${excludedKey} should remain excluded from the editable draft`,
  );
}

assert.equal(draft.ambientPressureKPa, 100.8);
assert.equal(draft.ambientTemperatureK, 299.25);
assert.equal(draft.gasWallConductanceWPerK, 0.45);
assert.equal(draft.wallAmbientConductanceWPerK, 1.85);
assert.equal(draft.leakageEnabled, true);
assert.equal(draft.instrumentNoiseEnabled, true);
assert.equal(draft.sensorLagTimeS, 0.25);

const normalizedDraft = normalizeHeatCapacityFreeParameterDraft(
  {
    ...draft,
    ambientPressureKPa: Number.NaN,
    sensorLagTimeS: 0,
    pressureDangerMv: 152,
    instrumentNoiseEnabled: false,
  },
  draft,
);
assert.equal(
  normalizedDraft.ambientPressureKPa,
  draft.ambientPressureKPa,
  'invalid numeric draft values should fall back to the supplied draft',
);
assert.equal(
  normalizedDraft.sensorLagTimeS,
  draft.sensorLagTimeS,
  'non-positive lag time should fall back to the supplied draft',
);
assert.equal(normalizedDraft.pressureDangerMv, 152);
assert.equal(normalizedDraft.instrumentNoiseEnabled, false);

const applied = applyHeatCapacityFreeParameterDraftToConfigs({
  ...draft,
  leakageEnabled: true,
  leakageRatePerS: 0.0025,
  instrumentNoiseEnabled: false,
  noiseMv: 0.055,
  sensorLagTimeS: 0.5,
  pressureWarningMv: 118,
  pressureDangerMv: 145,
});
assert.equal(applied.environmentConfig.ambientPressureKPa, 100.8);
assert.equal(applied.physicsConfig.environment.ambientTemperatureK, 299.25);
assert.equal(applied.physicsConfig.thermal.gasWallConductanceWPerK, 0.45);
assert.equal(applied.physicsConfig.thermal.wallAmbientConductanceWPerK, 1.85);
assert.equal(applied.physicsConfig.leakage.enabled, true);
assert.equal(applied.physicsConfig.leakage.ratePerS, 0.0025);
assert.equal(applied.sensorConfig.noiseMv, 0.055);
assert.equal(applied.sensorConfig.lagRate, convertSensorLagTimeSToLagRate(0.5));
assert.equal(applied.recordConfig.u0ZeroToleranceMv, 0.12);
assert.equal(applied.recordConfig.pressureDangerMv, 145);
assert.equal(applied.pressureWarningMv, 118);
assert.equal(applied.instrumentNoiseEnabled, false);

const effectiveSensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
  applied.sensorConfig,
  applied.instrumentNoiseEnabled,
);
assert.equal(
  effectiveSensorConfig.noiseMv,
  0,
  'disabled instrument noise should make the effective sensor noise zero',
);
assert.equal(
  applied.sensorConfig.noiseMv,
  0.055,
  'disabled instrument noise should not clear the stored sensor noise value',
);

console.log('heatCapacityFreeParameterConfig tests passed');
