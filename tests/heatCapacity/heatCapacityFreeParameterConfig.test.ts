import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  convertSensorLagTimeSToLagRate,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getEffectiveHeatCapacityFreeSensorConfig,
  getHeatCapacityFreeGasTypeGamma,
  normalizeHeatCapacityFreeParameterDraft,
  resolveHeatCapacityFreeGasTypeFromGamma,
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
  pumpWorkRetention: 0.25,
  pumpPressureLimitKPa: 112,
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
  'gasType',
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
  'gamma',
  'gammaRef',
  'pumpAmountGainRatio',
  'vesselVolumeL',
  'pressureMvPerKPa',
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
assert.equal(draft.gasType, 'air');
assert.equal(draft.sensorLagTimeS, 0.25);
assert.equal(getHeatCapacityFreeGasTypeGamma('air'), 1.4);
assert.equal(getHeatCapacityFreeGasTypeGamma('helium'), 5 / 3);
assert.equal(resolveHeatCapacityFreeGasTypeFromGamma(1.53), 'air');
assert.equal(resolveHeatCapacityFreeGasTypeFromGamma(1.6), 'helium');

const normalizedDraft = normalizeHeatCapacityFreeParameterDraft(
  {
    ...draft,
    ambientPressureKPa: Number.NaN,
    sensorLagTimeS: 0,
    gasType: 'argon' as any,
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
assert.equal(
  normalizedDraft.gasType,
  draft.gasType,
  'invalid gas type draft values should fall back to the supplied draft',
);
assert.equal(normalizedDraft.instrumentNoiseEnabled, false);

const applied = applyHeatCapacityFreeParameterDraftToConfigs({
  ...draft,
  leakageEnabled: true,
  leakageRatePerS: 0.0025,
  gasType: 'helium',
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
assert.equal(
  applied.physicsConfig.vesselVolumeL,
  2,
  'applying a Free parameter draft should keep fixed vessel volume at the tuned device default',
);
assert.equal(
  applied.physicsConfig.pumpAmountGainRatio,
  0.00334,
  'applying a Free parameter draft should keep fixed pump amount gain at the tuned device default',
);
assert.equal(applied.physicsConfig.pumpWorkRetention, 0.3);
assert.equal(applied.physicsConfig.leakage.enabled, true);
assert.equal(applied.physicsConfig.leakage.ratePerS, 0.0025);
assert.equal(applied.physicsConfig.gamma, 5 / 3);
assert.equal(applied.sensorConfig.noiseMv, 0.055);
assert.equal(
  applied.sensorConfig.pressureMvPerKPa,
  20,
  'applying a Free parameter draft should keep pressure sensitivity as a fixed instrument constant',
);
assert.equal(applied.sensorConfig.lagRate, convertSensorLagTimeSToLagRate(0.5));
assert.equal(applied.recordConfig.u0ZeroToleranceMv, 0.12);
assert.equal(applied.recordConfig.pressureDangerMv, 145);
assert.equal(applied.pressureWarningMv, 118);
assert.equal(applied.instrumentNoiseEnabled, false);

const clampedThresholds = applyHeatCapacityFreeParameterDraftToConfigs({
  ...draft,
  pressureWarningMv: 160,
  pressureDangerMv: 140,
});
assert.equal(
  clampedThresholds.pressureWarningMv < clampedThresholds.recordConfig.pressureDangerMv,
  true,
  'pressure warning should remain below the danger threshold even when the draft enters them out of order',
);

const clampedMinimumUsefulU1 = applyHeatCapacityFreeParameterDraftToConfigs({
  ...draft,
  minimumUsefulU1CorrectedMv: 130,
  pressureWarningMv: 120,
  pressureDangerMv: 140,
});
assert.equal(
  clampedMinimumUsefulU1.recordConfig.minimumUsefulU1CorrectedMv <=
    Math.min(
      clampedMinimumUsefulU1.pressureWarningMv,
      clampedMinimumUsefulU1.recordConfig.pressureDangerMv * 0.85,
    ) / 1.08,
  true,
  'minimum useful U1 should stay inside the safe target-pressure envelope',
);

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
