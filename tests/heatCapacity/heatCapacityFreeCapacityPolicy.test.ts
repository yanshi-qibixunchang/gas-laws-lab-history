import assert from 'node:assert/strict';
import {
  estimateHeatCapacityFreeExperimentGroupCollectionBytes,
  getHeatCapacityFreeCapacityWarning,
  HEAT_CAPACITY_FREE_PERSISTENT_SIZE_WARNING_BYTES,
  HEAT_CAPACITY_FREE_SOFT_SIZE_WARNING_BYTES,
} from '../../src/domain/heatCapacity/heatCapacityFreeCapacityPolicy.ts';
import {
  createEmptyHeatCapacityFreeExperimentGroupCollection,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';

assert.equal(getHeatCapacityFreeCapacityWarning({ groupCount: 19, estimatedBytes: 1 }).level, 'none');
assert.equal(getHeatCapacityFreeCapacityWarning({ groupCount: 20, estimatedBytes: 1 }).level, 'soft');
assert.equal(getHeatCapacityFreeCapacityWarning({
  groupCount: 1,
  estimatedBytes: HEAT_CAPACITY_FREE_SOFT_SIZE_WARNING_BYTES,
}).level, 'soft');
assert.equal(getHeatCapacityFreeCapacityWarning({
  groupCount: 1,
  estimatedBytes: HEAT_CAPACITY_FREE_PERSISTENT_SIZE_WARNING_BYTES,
}).level, 'persistent');
assert.ok(
  estimateHeatCapacityFreeExperimentGroupCollectionBytes(
    createEmptyHeatCapacityFreeExperimentGroupCollection(),
  ) > 0,
);

console.log('heatCapacityFreeCapacityPolicy tests passed');
