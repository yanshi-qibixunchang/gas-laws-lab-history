import assert from 'node:assert/strict';
import {
  calculateHeatCapacityProcessReviewCompressedDurationS,
  createHeatCapacityAlignedReferencePointToX,
  createHeatCapacityProcessReviewStageLayout,
  type HeatCapacityProcessReviewStageScalePoint,
} from '../../src/features/heatCapacity/heatCapacityProcessReviewStageScale.ts';
import type {
  HeatCapacityProcessStageSegment,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts';
import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const actualStages: HeatCapacityProcessStageSegment[] = [
  { id: 'zero', label: 'Zero', startS: 0, endS: 8 },
  { id: 'pump', label: 'Pump', startS: 8, endS: 30, countText: 'x10' },
  { id: 'stabilize', label: 'Stabilize', startS: 30, endS: 61.2 },
  { id: 'release', label: 'Release', startS: 61.2, endS: 62.3, durationText: '1.1 s' },
  { id: 'recover', label: 'Recover', startS: 62.3, endS: 92 },
];

const standardReferenceStages: HeatCapacityProcessStageSegment[] = [
  { id: 'zero', label: 'Zero', startS: 0, endS: 4 },
  { id: 'pump', label: 'Pump', startS: 4, endS: 5.2 },
  { id: 'stabilize', label: 'Stabilize', startS: 5.2, endS: 15.2 },
  {
    id: 'release',
    label: 'Release',
    startS: 15.2,
    endS: 15.2 + HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    durationText: `${HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS.toFixed(3)} s`,
  },
  { id: 'recover', label: 'Recover', startS: 15.2 + HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS, endS: 36 },
];

const sharedCompressedDurationS = Math.max(
  calculateHeatCapacityProcessReviewCompressedDurationS(actualStages),
  calculateHeatCapacityProcessReviewCompressedDurationS(standardReferenceStages),
);

const layout = createHeatCapacityProcessReviewStageLayout({
  stages: actualStages,
  plotLeft: 42,
  plotRight: 1206,
  compressedTotalS: sharedCompressedDurationS,
});

const standardReferenceLayout = createHeatCapacityProcessReviewStageLayout({
  stages: standardReferenceStages,
  plotLeft: 42,
  plotRight: 1206,
  compressedTotalS: sharedCompressedDurationS,
});

const standardPumpPoints: HeatCapacityProcessReviewStageScalePoint[] = [
  { stageId: 'pump', timeS: 4 },
  { stageId: 'pump', timeS: 4.3 },
  { stageId: 'pump', timeS: 4.6 },
  { stageId: 'pump', timeS: 4.9 },
  { stageId: 'pump', timeS: 5.2 },
];

const pumpXs = standardPumpPoints.map((point) => standardReferenceLayout.pointToX(point));
const pumpSpan = Math.max(...pumpXs) - Math.min(...pumpXs);

assert.equal(
  pumpSpan >= 110,
  true,
  `standard pump should occupy a readable visual width, got ${pumpSpan}`,
);
assert.equal(
  pumpXs.every((x, index) => index === 0 || x > pumpXs[index - 1]),
  true,
  'standard pump points should keep increasing x positions inside the pump stage',
);

const stabilizeWidth = layout.stageWidth('stabilize');
const recoverWidth = layout.stageWidth('recover');
const pumpWidth = layout.stageWidth('pump');
const releaseWidth = layout.stageWidth('release');
const standardReferenceEndX = standardReferenceLayout.timeToX(36);
const actualEndX = layout.timeToX(92);
const standardReferenceReleaseX = standardReferenceLayout.timeToX(15.2);
const actualReleaseX = layout.timeToX(61.2);
const alignedStandardPointToX = createHeatCapacityAlignedReferencePointToX({
  actualStages,
  referenceStages: standardReferenceStages,
  actualTimeToX: layout.timeToX,
  referencePointToX: standardReferenceLayout.pointToX,
  actualStageId: 'pump',
  referenceStageId: 'pump',
});
const alignedStandardPumpStartX = alignedStandardPointToX({ stageId: 'pump', timeS: 4 });
const alignedStandardPumpMidX = alignedStandardPointToX({ stageId: 'pump', timeS: 4.6 });
const alignedStandardReleaseX = alignedStandardPointToX({ stageId: 'release', timeS: 15.2 });

assert.equal(
  pumpWidth >= 160,
  true,
  `pump stage should reserve enough width for visible pump steps, got ${pumpWidth}`,
);
assert.equal(
  releaseWidth >= 100,
  true,
  `release stage should reserve enough width for the rapid valve event, got ${releaseWidth}`,
);
assert.equal(
  stabilizeWidth < 380,
  true,
  `long stabilize stage should be compressed, got ${stabilizeWidth}`,
);
assert.equal(
  recoverWidth < 380,
  true,
  `long recover stage should be compressed, got ${recoverWidth}`,
);
assert.equal(
  standardReferenceEndX < actualEndX - 120,
  true,
  'an independently timed standard process trace should be allowed to end before a slower actual trace',
);
assert.equal(
  standardReferenceReleaseX < actualReleaseX - 120,
  true,
  'standard process release should keep its own phase timing instead of aligning to the actual release stage',
);
assert.equal(
  Math.abs(alignedStandardPumpStartX - layout.timeToX(8)) < 0.000001,
  true,
  'aligned standard process pump should start at the actual pump start position',
);
assert.equal(
  alignedStandardPumpMidX > alignedStandardPumpStartX,
  true,
  'aligned standard process pump should preserve its own rising shape after the start-point shift',
);
assert.equal(
  alignedStandardReleaseX < actualReleaseX - 40,
  true,
  'aligning the standard pump start should not force the standard release phase to match the actual release time',
);

assert.deepEqual(
  layout.boundaryTicks.map((tick) => tick.label),
  ['0', '8', '30', '61.2', '62.3', '92'],
  'boundary ticks should preserve actual stage boundary times',
);

assert.equal(
  layout.axisTicks.some((tick) => tick.kind === 'minor' && tick.stageId === 'pump' && tick.label === null),
  true,
  'expanded fast pump stage should expose unlabeled short ticks inside the stage',
);
assert.equal(
  layout.axisTicks.some((tick) => tick.kind === 'minor' && tick.stageId === 'release' && tick.label === null),
  true,
  'expanded fast release stage should expose unlabeled short ticks inside the stage',
);
assert.equal(
  layout.axisTicks.some((tick) => tick.kind === 'minor' && (tick.stageId === 'stabilize' || tick.stageId === 'recover')),
  false,
  'compressed waiting and recovery stages should not add dense minor ticks',
);
assert.equal(
  layout.axisTicks
    .filter((tick) => tick.kind === 'major')
    .every((tick) => typeof tick.label === 'string' && tick.label.length > 0),
  true,
  'major ticks should keep the real-time labels',
);

console.log('heatCapacityProcessReviewStageScale tests passed');
