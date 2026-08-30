import assert from 'node:assert/strict';
import {
  getHeatCapacityMaterialsTabOrder,
  getPistonOscillationMaterialsPanelOrder,
} from '../../src/features/workbench/workbenchHeatCapacityTabRegistry.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchState.ts';

const asWorkbenchFile = (value: object) => value as WorkbenchFileState;

assert.deepEqual(
  getHeatCapacityMaterialsTabOrder(asWorkbenchFile({
    kind: 'heatCapacity',
    heatCapacityMode: null,
  })),
  [],
  'Explore state should not expose an experiment-materials group',
);
assert.deepEqual(
  getHeatCapacityMaterialsTabOrder(asWorkbenchFile({
    kind: 'heatCapacity',
    heatCapacityMode: 'demo',
  })),
  [],
  'Demo mode should not expose experiment materials',
);
assert.deepEqual(
  getHeatCapacityMaterialsTabOrder(asWorkbenchFile({
    kind: 'heatCapacity',
    heatCapacityMode: 'guide',
  })),
  ['guide', 'records'],
  'Guide mode should expose the guide and its data/results page',
);
assert.deepEqual(
  getHeatCapacityMaterialsTabOrder(asWorkbenchFile({
    kind: 'heatCapacity',
    heatCapacityMode: 'free',
  })),
  ['guide', 'records', 'review'],
  'Free mode should expose the complete materials set',
);

const pistonFile = ({
  guideStatus = 'idle',
  completionExited = false,
  guideDataProcessing = null,
  freeStatus = 'idle',
  freeDataProcessing = null,
}: {
  guideStatus?: 'idle' | 'active' | 'completed';
  completionExited?: boolean;
  guideDataProcessing?: object | null;
  freeStatus?: 'idle' | 'active' | 'paused';
  freeDataProcessing?: object | null;
}) => asWorkbenchFile({
  kind: 'heatCapacityPistonOscillation',
  pistonOscillationGuideSession: {
    status: guideStatus,
    completionExited,
    dataProcessing: guideDataProcessing,
  },
  pistonOscillationFreeSession: {
    status: freeStatus,
    dataProcessing: freeDataProcessing,
  },
});

assert.deepEqual(
  getPistonOscillationMaterialsPanelOrder(pistonFile({
    guideStatus: 'completed',
    completionExited: true,
    guideDataProcessing: {},
  })),
  [],
  'stored Guide data should stay hidden after Guide mode has been exited',
);
assert.deepEqual(
  getPistonOscillationMaterialsPanelOrder(pistonFile({
    guideStatus: 'active',
    guideDataProcessing: {},
  })),
  ['heatCapacityGuide'],
  'active Guide mode should expose Data processing once it exists',
);
assert.deepEqual(
  getPistonOscillationMaterialsPanelOrder(pistonFile({
    guideStatus: 'active',
    guideDataProcessing: {},
    freeStatus: 'active',
  })),
  [],
  'an active Free session must not leak stale Guide data processing',
);
assert.deepEqual(
  getPistonOscillationMaterialsPanelOrder(pistonFile({
    freeStatus: 'active',
    freeDataProcessing: {},
  })),
  ['heatCapacityGuide'],
  'active Free mode should expose its own Data processing once it exists',
);
assert.deepEqual(
  getPistonOscillationMaterialsPanelOrder(pistonFile({
    freeStatus: 'active',
    freeDataProcessing: { status: 'completed' },
  })),
  ['heatCapacityGuide', 'heatCapacityReview'],
  'completed Free mode should expose both Data processing and Process review & score',
);
assert.deepEqual(
  getPistonOscillationMaterialsPanelOrder(pistonFile({
    freeStatus: 'paused',
    freeDataProcessing: {},
  })),
  [],
  'paused Free mode should retain data without exposing mode-only navigation',
);
