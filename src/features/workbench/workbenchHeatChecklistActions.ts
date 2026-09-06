import { HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS } from './workbenchHeatCapacityGuidePresentation.ts';
import { HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE, HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS, HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS } from './workbenchTeachingUiTiming.ts';
import type React from 'react';

export interface createWorkbenchHeatChecklistActionsPorts {
  HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX: 48;
  heatCapacityGuideChecklistViewedIndexRef: React.MutableRefObject<number>;
  heatCapacityGuideChecklistVisualOffsetRef: React.MutableRefObject<number>;
  setHeatCapacityGuideChecklistViewedIndex: React.Dispatch<React.SetStateAction<number>>;
  heatCapacityGuideChecklistTrackRef: React.MutableRefObject<HTMLDivElement | null>;
  HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX: 42;
  heatCapacityGuideChecklistFrameRef: React.MutableRefObject<number | null>;
  heatCapacityGuideChecklistSnapTimerRef: React.MutableRefObject<number | null>;
  heatCapacityGuideChecklistReturnTimerRef: React.MutableRefObject<number | null>;
  heatCapacityGuideChecklistPendingWheelDeltaRef: React.MutableRefObject<number>;
  heatCapacityGuideChecklistCurrentIndexRef: React.MutableRefObject<number>;
}

export function createWorkbenchHeatChecklistActions({
  HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX,
  heatCapacityGuideChecklistViewedIndexRef,
  heatCapacityGuideChecklistVisualOffsetRef,
  setHeatCapacityGuideChecklistViewedIndex,
  heatCapacityGuideChecklistTrackRef,
  HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX,
  heatCapacityGuideChecklistFrameRef,
  heatCapacityGuideChecklistSnapTimerRef,
  heatCapacityGuideChecklistReturnTimerRef,
  heatCapacityGuideChecklistPendingWheelDeltaRef,
  heatCapacityGuideChecklistCurrentIndexRef,
}: createWorkbenchHeatChecklistActionsPorts) {
const applyHeatCapacityGuideChecklistView = (
    viewedIndex: number,
    visualOffsetPx = 0,
    animate = true,
  ) => {
    const clampedIndex = Math.max(
      0,
      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1, viewedIndex),
    );
    const clampedOffset = Math.max(
      -HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX * 0.48,
      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX * 0.48, visualOffsetPx),
    );
    heatCapacityGuideChecklistViewedIndexRef.current = clampedIndex;
    heatCapacityGuideChecklistVisualOffsetRef.current = clampedOffset;
    setHeatCapacityGuideChecklistViewedIndex((current) => (
      current === clampedIndex ? current : clampedIndex
    ));
    const track = heatCapacityGuideChecklistTrackRef.current;
    if (!track) return;
    const baseOffset = HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX -
      clampedIndex * HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
    track.style.setProperty('--studio-heat-guide-step-base-offset', `${baseOffset}px`);
    track.style.setProperty('--studio-heat-guide-step-visual-offset', `${clampedOffset}px`);
    track.classList.toggle('studio-heat-guide-step-track-snapping', animate);
  };

const clearHeatCapacityGuideChecklistTimers = () => {
    if (heatCapacityGuideChecklistFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityGuideChecklistFrameRef.current);
      heatCapacityGuideChecklistFrameRef.current = null;
    }
    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
      heatCapacityGuideChecklistSnapTimerRef.current = null;
    }
    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
      heatCapacityGuideChecklistReturnTimerRef.current = null;
    }
  };

const returnHeatCapacityGuideChecklistToCurrentStep = () => {
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    applyHeatCapacityGuideChecklistView(heatCapacityGuideChecklistCurrentIndexRef.current, 0, true);
  };

const snapHeatCapacityGuideChecklistView = () => {
    applyHeatCapacityGuideChecklistView(heatCapacityGuideChecklistViewedIndexRef.current, 0, true);
  };

const processHeatCapacityGuideChecklistWheelFrame = () => {
    heatCapacityGuideChecklistFrameRef.current = null;
    const pendingDelta = heatCapacityGuideChecklistPendingWheelDeltaRef.current;
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    if (!pendingDelta) return;

    let nextIndex = heatCapacityGuideChecklistViewedIndexRef.current;
    let nextOffset = heatCapacityGuideChecklistVisualOffsetRef.current -
      pendingDelta * HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE;
    let committedSteps = 0;
    const rowHeight = HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
    const halfRow = rowHeight / 2;
    while (
      nextOffset <= -halfRow &&
      nextIndex < HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1 &&
      committedSteps < HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS
    ) {
      nextIndex += 1;
      nextOffset += rowHeight;
      committedSteps += 1;
    }
    while (
      nextOffset >= halfRow &&
      nextIndex > 0 &&
      committedSteps < HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS
    ) {
      nextIndex -= 1;
      nextOffset -= rowHeight;
      committedSteps += 1;
    }
    if (nextIndex <= 0 && nextOffset > 0) nextOffset = 0;
    if (nextIndex >= HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1 && nextOffset < 0) nextOffset = 0;

    applyHeatCapacityGuideChecklistView(nextIndex, nextOffset, false);

    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
    }
    heatCapacityGuideChecklistSnapTimerRef.current = window.setTimeout(() => {
      heatCapacityGuideChecklistSnapTimerRef.current = null;
      snapHeatCapacityGuideChecklistView();
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS);

    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
    }
    heatCapacityGuideChecklistReturnTimerRef.current = window.setTimeout(() => {
      heatCapacityGuideChecklistReturnTimerRef.current = null;
      returnHeatCapacityGuideChecklistToCurrentStep();
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS);
  };

const handleHeatCapacityGuideChecklistWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const deltaModeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
    const normalizedDelta = Math.max(-180, Math.min(180, event.deltaY * deltaModeScale));
    heatCapacityGuideChecklistPendingWheelDeltaRef.current += normalizedDelta;
    if (heatCapacityGuideChecklistFrameRef.current === null) {
      heatCapacityGuideChecklistFrameRef.current = window.requestAnimationFrame(processHeatCapacityGuideChecklistWheelFrame);
    }
  };

  return { applyHeatCapacityGuideChecklistView, clearHeatCapacityGuideChecklistTimers, handleHeatCapacityGuideChecklistWheel };
}
