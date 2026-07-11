import assert from 'node:assert/strict';
import {
  calculateHeatCapacityRelativeErrorPercent,
  findHeatCapacityStopcockFlowStartTime,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessMetrics.ts';
import type {
  HeatCapacityFreeTraceSample,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';

assert.equal(calculateHeatCapacityRelativeErrorPercent(1.37, 1.4), 2.14);
assert.equal(calculateHeatCapacityRelativeErrorPercent(null, 1.4), null);
assert.equal(calculateHeatCapacityRelativeErrorPercent(1.4, 0), null);

const sample = (
  atS: number,
  stopcockOpen: boolean,
  stopcockFlowOpen: boolean,
  releaseStarted: boolean,
) => ({
  atS,
  controls: { stopcockOpen, stopcockFlowOpen },
  physical: { releaseStarted },
}) as HeatCapacityFreeTraceSample;

assert.equal(
  findHeatCapacityStopcockFlowStartTime([
    sample(1.1, true, false, true),
    sample(1.2, true, true, true),
  ], 1),
  1.2,
  'confirmed flow should take precedence over the earlier physical release fallback',
);
assert.equal(
  findHeatCapacityStopcockFlowStartTime([sample(1.1, true, false, true)], 1),
  1.1,
  'physical release should be used when no confirmed flow sample exists',
);
assert.equal(findHeatCapacityStopcockFlowStartTime([], 1), 1);

console.log('heatCapacityFreeProcessMetrics tests passed');
