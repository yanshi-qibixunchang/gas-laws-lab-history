export const HEAT_CAPACITY_FREE_SOFT_GROUP_WARNING_COUNT = 20 as const;
export const HEAT_CAPACITY_FREE_SOFT_SIZE_WARNING_BYTES = 50 * 1024 * 1024;
export const HEAT_CAPACITY_FREE_PERSISTENT_SIZE_WARNING_BYTES = 100 * 1024 * 1024;

export type HeatCapacityFreeCapacityWarningLevel =
  | 'none'
  | 'soft'
  | 'persistent';

export interface HeatCapacityFreeCapacityWarning {
  level: HeatCapacityFreeCapacityWarningLevel;
  groupCount: number;
  estimatedBytes: number;
  triggeredByGroupCount: boolean;
  triggeredBySize: boolean;
}

export const estimateHeatCapacityFreeExperimentGroupCollectionBytes = (
  collection: HeatCapacityFreeExperimentGroupCollection,
) => new TextEncoder().encode(JSON.stringify({
  ...collection,
  capacityEstimate: {
    bytes: 0,
    measuredAtMs: null,
  },
})).byteLength;

export const getHeatCapacityFreeCapacityWarning = (input: {
  groupCount: number;
  estimatedBytes: number;
}): HeatCapacityFreeCapacityWarning => {
  const groupCount = Number.isSafeInteger(input.groupCount) && input.groupCount >= 0
    ? input.groupCount
    : 0;
  const estimatedBytes = Number.isSafeInteger(input.estimatedBytes) && input.estimatedBytes >= 0
    ? input.estimatedBytes
    : 0;
  const persistent = estimatedBytes >= HEAT_CAPACITY_FREE_PERSISTENT_SIZE_WARNING_BYTES;
  const triggeredByGroupCount = groupCount >= HEAT_CAPACITY_FREE_SOFT_GROUP_WARNING_COUNT;
  const triggeredBySize = estimatedBytes >= HEAT_CAPACITY_FREE_SOFT_SIZE_WARNING_BYTES;
  return {
    level: persistent
      ? 'persistent'
      : triggeredByGroupCount || triggeredBySize
        ? 'soft'
        : 'none',
    groupCount,
    estimatedBytes,
    triggeredByGroupCount,
    triggeredBySize,
  };
};
import type {
  HeatCapacityFreeExperimentGroupCollection,
} from './heatCapacityFreeExperimentGroupModel.ts';
