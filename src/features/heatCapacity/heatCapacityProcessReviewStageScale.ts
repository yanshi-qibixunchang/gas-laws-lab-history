import type {
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityProcessReviewStageScalePoint {
  stageId?: HeatCapacityProcessStageId;
  timeS: number;
}

export interface HeatCapacityProcessReviewStageLayoutOptions {
  stages: HeatCapacityProcessStageSegment[];
  plotLeft: number;
  plotRight: number;
  compressedTotalS?: number;
}

export interface HeatCapacityProcessReviewStageBoundaryTick {
  timeS: number;
  x: number;
  label: string;
}

export interface HeatCapacityProcessReviewStageAxisTick {
  stageId: HeatCapacityProcessStageId;
  timeS: number;
  x: number;
  label: string | null;
  kind: 'major' | 'minor';
}

export interface HeatCapacityAlignedReferencePointToXOptions {
  actualStages: HeatCapacityProcessStageSegment[];
  referenceStages: HeatCapacityProcessStageSegment[];
  actualTimeToX: (timeS: number) => number;
  referencePointToX: (point: HeatCapacityProcessReviewStageScalePoint) => number;
  actualStageId: HeatCapacityProcessStageId;
  referenceStageId: HeatCapacityProcessStageId;
}

const MIN_COMPRESSED_STAGE_DURATION_BY_ID: Record<HeatCapacityProcessStageId, number> = {
  zero: 4,
  fill: 12,
  pump: 16,
  stabilize: 14,
  release: 10,
  recover: 16,
};

const MAX_COMPRESSED_STAGE_DURATION_BY_ID: Record<HeatCapacityProcessStageId, number> = {
  zero: 10,
  fill: 18,
  pump: 24,
  stabilize: 34,
  release: 16,
  recover: 38,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const formatTickLabel = (timeS: number) => (
  Number.isInteger(timeS) ? `${timeS}` : `${roundNumber(timeS, 1)}`
);

const shouldShowMinorTicks = (stage: HeatCapacityProcessStageSegment) => (
  stage.id === 'pump' || stage.id === 'release'
);

const getDuration = (stage: HeatCapacityProcessStageSegment) => Math.max(0.001, stage.endS - stage.startS);

const compressWaitingDuration = (
  durationS: number,
  minS: number,
  maxS: number,
) => {
  if (durationS <= minS) return minS;
  return Math.min(maxS, minS + Math.log1p(durationS - minS) * 5);
};

const getCompressedStageDurationS = (stage: HeatCapacityProcessStageSegment) => {
  const durationS = getDuration(stage);
  const minS = MIN_COMPRESSED_STAGE_DURATION_BY_ID[stage.id];
  const maxS = MAX_COMPRESSED_STAGE_DURATION_BY_ID[stage.id];
  if (stage.id === 'fill') {
    return clamp(durationS * 14, minS, maxS);
  }
  if (stage.id === 'pump') {
    return clamp(durationS * 2.5, minS, maxS);
  }
  if (stage.id === 'release') {
    return clamp(durationS * 8, minS, maxS);
  }
  if (stage.id === 'stabilize' || stage.id === 'recover') {
    return compressWaitingDuration(durationS, minS, maxS);
  }
  return clamp(durationS, minS, maxS);
};

export const calculateHeatCapacityProcessReviewCompressedDurationS = (
  stages: HeatCapacityProcessStageSegment[],
) => stages
  .filter((stage) => stage.endS > stage.startS)
  .reduce((sum, stage) => sum + getCompressedStageDurationS(stage), 0);

const findStage = (
  stages: HeatCapacityProcessStageSegment[],
  id: HeatCapacityProcessStageId,
) => stages.find((stage) => stage.id === id) ?? null;

export const createHeatCapacityAlignedReferencePointToX = ({
  actualStages,
  referenceStages,
  actualTimeToX,
  referencePointToX,
  actualStageId,
  referenceStageId,
}: HeatCapacityAlignedReferencePointToXOptions) => {
  const actualStage = findStage(actualStages, actualStageId);
  const referenceStage = findStage(referenceStages, referenceStageId);
  if (!actualStage || !referenceStage) {
    return referencePointToX;
  }

  const actualAnchorX = actualTimeToX(actualStage.startS);
  const referenceAnchorX = referencePointToX({
    stageId: referenceStage.id,
    timeS: referenceStage.startS,
  });
  const offsetX = actualAnchorX - referenceAnchorX;

  return (point: HeatCapacityProcessReviewStageScalePoint) => referencePointToX(point) + offsetX;
};

const findStageForTime = (
  stages: HeatCapacityProcessStageSegment[],
  timeS: number,
) => {
  const exact = stages.find((stage) => timeS >= stage.startS && timeS <= stage.endS);
  if (exact) return exact;
  return stages.find((stage) => timeS < stage.startS) ?? stages[stages.length - 1] ?? null;
};

export const createHeatCapacityProcessReviewStageLayout = ({
  stages,
  plotLeft,
  plotRight,
  compressedTotalS,
}: HeatCapacityProcessReviewStageLayoutOptions) => {
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const validStages = stages.filter((stage) => stage.endS > stage.startS);
  const compressedDurations = validStages.map(getCompressedStageDurationS);
  const ownCompressedTotalS = compressedDurations.reduce((sum, durationS) => sum + durationS, 0);
  const sharedCompressedTotalS = Math.max(0.001, compressedTotalS ?? ownCompressedTotalS);
  const pixelsPerCompressedSecond = plotWidth / sharedCompressedTotalS;
  const stageWidths = new Map<HeatCapacityProcessStageId, number>();
  const stageStarts = new Map<HeatCapacityProcessStageId, number>();
  let cursorX = plotLeft;

  for (const [index, stage] of validStages.entries()) {
    const width = compressedDurations[index] * pixelsPerCompressedSecond;
    stageStarts.set(stage.id, cursorX);
    stageWidths.set(stage.id, width);
    cursorX += width;
  }

  const fallbackTimeToX = (timeS: number) => {
    if (validStages.length === 0) return plotLeft;
    const startS = Math.min(...validStages.map((stage) => stage.startS));
    const endS = Math.max(...validStages.map((stage) => stage.endS));
    const ratio = (clamp(timeS, startS, endS) - startS) / Math.max(0.001, endS - startS);
    return plotLeft + ratio * ownCompressedTotalS * pixelsPerCompressedSecond;
  };

  const pointToX = (
    point: HeatCapacityProcessReviewStageScalePoint,
    sourceStages = validStages,
  ) => {
    const sourceStage = point.stageId
      ? findStage(sourceStages, point.stageId)
      : findStageForTime(sourceStages, point.timeS);
    const targetStage = sourceStage ? findStage(validStages, sourceStage.id) : null;
    if (!sourceStage || !targetStage) return fallbackTimeToX(point.timeS);
    const startX = stageStarts.get(targetStage.id) ?? plotLeft;
    const width = stageWidths.get(targetStage.id) ?? plotWidth;
    const progress = clamp((point.timeS - sourceStage.startS) / getDuration(sourceStage), 0, 1);
    return startX + progress * width;
  };

  const timeToX = (timeS: number) => pointToX({ timeS }, validStages);

  const rangeToXRange = (
    startS: number,
    endS: number,
    sourceStages = validStages,
  ) => {
    const startX = pointToX({ timeS: startS }, sourceStages);
    const endX = pointToX({ timeS: endS }, sourceStages);
    return {
      x: Math.min(startX, endX),
      width: Math.max(0, Math.abs(endX - startX)),
    };
  };

  const boundaryTicks: HeatCapacityProcessReviewStageBoundaryTick[] = [];
  const axisTicks: HeatCapacityProcessReviewStageAxisTick[] = [];
  for (const stage of validStages) {
    if (!boundaryTicks.some((tick) => Math.abs(tick.timeS - stage.startS) < 0.000001)) {
      boundaryTicks.push({
        timeS: stage.startS,
        x: timeToX(stage.startS),
        label: formatTickLabel(stage.startS),
      });
      axisTicks.push({
        stageId: stage.id,
        timeS: stage.startS,
        x: timeToX(stage.startS),
        label: formatTickLabel(stage.startS),
        kind: 'major',
      });
    }
    if (shouldShowMinorTicks(stage)) {
      for (const ratio of [0.25, 0.5, 0.75]) {
        const timeS = roundNumber(stage.startS + getDuration(stage) * ratio, 2);
        axisTicks.push({
          stageId: stage.id,
          timeS,
          x: timeToX(timeS),
          label: null,
          kind: 'minor',
        });
      }
    }
  }
  const finalStage = validStages[validStages.length - 1] ?? null;
  if (finalStage) {
    const finalTimeS = finalStage.endS;
    boundaryTicks.push({
      timeS: finalTimeS,
      x: timeToX(finalTimeS),
      label: formatTickLabel(finalTimeS),
    });
    axisTicks.push({
      stageId: finalStage.id,
      timeS: finalTimeS,
      x: timeToX(finalTimeS),
      label: formatTickLabel(finalTimeS),
      kind: 'major',
    });
  }
  axisTicks.sort((left, right) => left.x - right.x || left.timeS - right.timeS);

  return {
    axisTicks,
    boundaryTicks,
    pointToX,
    rangeToXRange,
    stageWidth: (stageId: HeatCapacityProcessStageId) => stageWidths.get(stageId) ?? 0,
    timeToX,
  };
};
