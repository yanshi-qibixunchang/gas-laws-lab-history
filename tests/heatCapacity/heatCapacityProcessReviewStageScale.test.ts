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

const actualStages: HeatCapacityProcessStageSegment[] = [
  { id: 'zero', label: 'Zero', startS: 0, endS: 8 },
  { id: 'pump', label: 'Pump', startS: 8, endS: 30, countText: 'x10' },
  { id: 'stabilize', label: 'Stabilize', startS: 30, endS: 61.2 },
  { id: 'release', label: 'Release', startS: 61.2, endS: 62.3, durationText: '1.1 s' },
  { id: 'recover', label: 'Recover', startS: 62.3, endS: 92 },
];

const idealReferenceStages: HeatCapacityProcessStageSegment[] = [
  { id: 'zero', label: 'Zero', startS: 0, endS: 4 },
  { id: 'fill', label: 'Fill', startS: 4, endS: 4.4 },
  { id: 'stabilize', label: 'Stabilize', startS: 4.4, endS: 14.4 },
  { id: 'release', label: 'Release', startS: 14.4, endS: 14.75, durationText: '0.35 s' },
  { id: 'recover', label: 'Recover', startS: 14.75, endS: 36 },
];

const sharedCompressedDurationS = Math.max(
  calculateHeatCapacityProcessReviewCompressedDurationS(actualStages),
  calculateHeatCapacityProcessReviewCompressedDurationS(idealReferenceStages),
);

const layout = createHeatCapacityProcessReviewStageLayout({
  stages: actualStages,
  plotLeft: 42,
  plotRight: 1206,
  compressedTotalS: sharedCompressedDurationS,
});

const idealReferenceLayout = createHeatCapacityProcessReviewStageLayout({
  stages: idealReferenceStages,
  plotLeft: 42,
  plotRight: 1206,
  compressedTotalS: sharedCompressedDurationS,
});

const idealFillPoints: HeatCapacityProcessReviewStageScalePoint[] = [
  { stageId: 'fill', timeS: 4 },
  { stageId: 'fill', timeS: 4.1 },
  { stageId: 'fill', timeS: 4.2 },
  { stageId: 'fill', timeS: 4.3 },
  { stageId: 'fill', timeS: 4.4 },
];

const fillXs = idealFillPoints.map((point) => idealReferenceLayout.pointToX(point));
const fillSpan = Math.max(...fillXs) - Math.min(...fillXs);

assert.equal(
  fillSpan >= 110,
  true,
  `ideal continuous fill should occupy a readable visual width, got ${fillSpan}`,
);
assert.equal(
  fillXs.every((x, index) => index === 0 || x > fillXs[index - 1]),
  true,
  'ideal fill points should keep increasing x positions inside the fill stage',
);

const stabilizeWidth = layout.stageWidth('stabilize');
const recoverWidth = layout.stageWidth('recover');
const pumpWidth = layout.stageWidth('pump');
const releaseWidth = layout.stageWidth('release');
const idealReferenceEndX = idealReferenceLayout.timeToX(36);
const actualEndX = layout.timeToX(92);
const idealReferenceReleaseX = idealReferenceLayout.timeToX(14.4);
const actualReleaseX = layout.timeToX(61.2);
const alignedIdealReferencePointToX = createHeatCapacityAlignedReferencePointToX({
  actualStages,
  referenceStages: idealReferenceStages,
  actualTimeToX: layout.timeToX,
  referencePointToX: idealReferenceLayout.pointToX,
  actualStageId: 'pump',
  referenceStageId: 'fill',
});
const alignedIdealFillStartX = alignedIdealReferencePointToX({ stageId: 'fill', timeS: 4 });
const alignedIdealFillMidX = alignedIdealReferencePointToX({ stageId: 'fill', timeS: 4.2 });
const alignedIdealReleaseX = alignedIdealReferencePointToX({ stageId: 'release', timeS: 14.4 });

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
  idealReferenceEndX < actualEndX - 120,
  true,
  'an independently optimized ideal reference trace should be allowed to end before a slower actual trace',
);
assert.equal(
  idealReferenceReleaseX < actualReleaseX - 120,
  true,
  'ideal reference release should keep its own optimized phase timing instead of aligning to the actual release stage',
);
assert.equal(
  Math.abs(alignedIdealFillStartX - layout.timeToX(8)) < 0.000001,
  true,
  'aligned ideal reference fill should start at the actual pump start position',
);
assert.equal(
  alignedIdealFillMidX > alignedIdealFillStartX,
  true,
  'aligned ideal reference fill should preserve its own rising shape after the start-point shift',
);
assert.equal(
  alignedIdealReleaseX < actualReleaseX - 40,
  true,
  'aligning the ideal fill start should not force the optimized release phase to match the actual release time',
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
