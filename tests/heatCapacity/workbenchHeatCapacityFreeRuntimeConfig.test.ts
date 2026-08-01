import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA } from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  normalizeHeatCapacityFreePhysicsConfig,
  normalizeHeatCapacityFreeSensorConfig,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRuntimeConfig.ts';

const normalizedPhysics = normalizeHeatCapacityFreePhysicsConfig({
  gamma: 0,
  pumpPressureLimitKPa: Number.POSITIVE_INFINITY,
  stopcockFlowRate: -2,
});
assert.ok(normalizedPhysics.gamma > 1);
assert.ok(normalizedPhysics.pumpPressureLimitKPa <= HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA);
assert.equal(normalizedPhysics.stopcockFlowRate, 0);

const normalizedSensor = normalizeHeatCapacityFreeSensorConfig({
  temperatureMvAtAmbient: 1523.7,
  lagRate: 1000,
  minSampleIntervalS: 99,
  maxSampleIntervalS: 100,
});
assert.equal(normalizedSensor.lagRate, 60);
assert.equal(
  normalizedSensor.temperatureMvAtAmbient,
  1523.7,
  'runtime normalization should preserve the calibrated equilibrium voltage for the selected ambient temperature',
);
assert.equal(normalizedSensor.minSampleIntervalS, DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.minSampleIntervalS);
assert.equal(normalizedSensor.maxSampleIntervalS, DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.maxSampleIntervalS);

const workbenchRoot = join(process.cwd(), 'src', 'features', 'workbench');
const stateSource = readFileSync(join(workbenchRoot, 'workbenchState.ts'), 'utf8');
assert.match(stateSource, /from '\.\/workbenchHeatCapacityFreeRuntimeConfig\.ts'/);
assert.doesNotMatch(stateSource, /export const normalizeHeatCapacityFreePhysicsConfig\s*=/);
assert.doesNotMatch(stateSource, /const normalizeHeatCapacityFreeSensorConfig\s*=/);
for (const fileName of [
  'workbenchHeatCapacityPersistence.ts',
  'workbenchHeatCapacitySessionRestore.ts',
]) {
  const source = readFileSync(join(workbenchRoot, fileName), 'utf8');
  assert.match(source, /from '\.\/workbenchHeatCapacityFreeRuntimeConfig\.ts'/);
}
const restoreNormalizationSource = readFileSync(
  join(workbenchRoot, 'workbenchHeatCapacityFreeRestoreNormalization.ts'),
  'utf8',
);
assert.match(
  restoreNormalizationSource,
  /export \* from '\.\/workbenchHeatCapacityFreeAggregateCodec\.ts'/,
  'the restore-normalization compatibility barrel must delegate to the aggregate codec',
);
const aggregateCodecSource = readFileSync(
  join(workbenchRoot, 'workbenchHeatCapacityFreeAggregateCodec.ts'),
  'utf8',
);
assert.match(
  aggregateCodecSource,
  /from '\.\/workbenchHeatCapacityFreeRuntimeConfig\.ts'/,
  'RestoreNormalization -> AggregateCodec must retain the RuntimeConfig dependency',
);

console.log('workbenchHeatCapacityFreeRuntimeConfig tests passed');
