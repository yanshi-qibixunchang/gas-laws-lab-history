import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { useRef, useState } from 'react';
import { getHeatCapacityRefreshNumber } from './workbenchHeatCapacityUiCheckpoint.ts';
import { createWorkbenchHeatChecklistActions } from './workbenchHeatChecklistActions.ts';

export interface useWorkbenchHeatChecklistPorts {
  initialHeatCapacityRefreshLayout: import('../heatCapacity/heatCapacityModeUiCheckpoint.ts').HeatCapacityModeJsonObject;
  HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX: 48;
  HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX: 42;
}

export function useWorkbenchHeatChecklist({
  initialHeatCapacityRefreshLayout,
  HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX,
  HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX,
}: useWorkbenchHeatChecklistPorts) {
const heatCapacityGuideChecklistTrackRef = useRef<HTMLDivElement | null>(null);

const heatCapacityGuideChecklistFrameRef = useRef<number | null>(null);

const heatCapacityGuideChecklistSnapTimerRef = useRef<number | null>(null);

const heatCapacityGuideChecklistReturnTimerRef = useRef<number | null>(null);

const heatCapacityGuideChecklistPendingWheelDeltaRef = useRef(0);

const heatCapacityGuideChecklistVisualOffsetRef = useRef(0);

const heatCapacityGuideChecklistViewedIndexRef = useRef(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'guideChecklistViewedIndex', 0),
  );

const heatCapacityGuideChecklistCurrentIndexRef = useRef(0);

const [heatCapacityGuideChecklistViewedIndex, setHeatCapacityGuideChecklistViewedIndex] = useState(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'guideChecklistViewedIndex', 0),
  );

const { applyHeatCapacityGuideChecklistView, clearHeatCapacityGuideChecklistTimers, handleHeatCapacityGuideChecklistWheel } = createWorkbenchHeatChecklistActions({ HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX, heatCapacityGuideChecklistViewedIndexRef, heatCapacityGuideChecklistVisualOffsetRef, setHeatCapacityGuideChecklistViewedIndex, heatCapacityGuideChecklistTrackRef, HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX, heatCapacityGuideChecklistFrameRef, heatCapacityGuideChecklistSnapTimerRef, heatCapacityGuideChecklistReturnTimerRef, heatCapacityGuideChecklistPendingWheelDeltaRef, heatCapacityGuideChecklistCurrentIndexRef });

const checklistCleanupEffect = { run: () => () => {
    clearHeatCapacityGuideChecklistTimers();
  }, dependencies: [] } satisfies WorkbenchHeatEffect;

  return {
    effects: { checklistCleanup: checklistCleanupEffect }, heatCapacityGuideChecklistTrackRef, heatCapacityGuideChecklistVisualOffsetRef, heatCapacityGuideChecklistViewedIndexRef, heatCapacityGuideChecklistCurrentIndexRef, heatCapacityGuideChecklistPendingWheelDeltaRef, heatCapacityGuideChecklistSnapTimerRef, heatCapacityGuideChecklistReturnTimerRef, heatCapacityGuideChecklistViewedIndex, setHeatCapacityGuideChecklistViewedIndex, applyHeatCapacityGuideChecklistView, handleHeatCapacityGuideChecklistWheel };
}
