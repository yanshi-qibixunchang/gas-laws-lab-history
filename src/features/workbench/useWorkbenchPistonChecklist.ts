import { useEffect } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';

import { HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE, HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS, PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX, PISTON_OSCILLATION_GUIDE_CHECKLIST_CENTER_OFFSET_PX } from './workbenchTeachingUiTiming.ts';

export interface useWorkbenchPistonChecklistPorts {
  activePistonOscillationGuideSelected: boolean;
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  activePistonOscillationGuideSession: import("../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts").PistonOscillationGuideSession | null;
}

export const useWorkbenchPistonChecklist = (ports: useWorkbenchPistonChecklistPorts) => {
  const { activePistonOscillationGuideSelected, activeFile, activePistonOscillationGuideSession } = ports;
  const [pistonOscillationGuideChecklistViewedIndex, setPistonOscillationGuideChecklistViewedIndex] =
    useState(0);

  const pistonOscillationGuideChecklistTrackRef = useRef<HTMLDivElement | null>(null);

  const pistonOscillationGuideChecklistFrameRef = useRef<number | null>(null);

  const pistonOscillationGuideChecklistSnapTimerRef = useRef<number | null>(null);

  const pistonOscillationGuideChecklistReturnTimerRef = useRef<number | null>(null);

  const pistonOscillationGuideChecklistPendingWheelDeltaRef = useRef(0);

  const pistonOscillationGuideChecklistVisualOffsetRef = useRef(0);

  const pistonOscillationGuideChecklistViewedIndexRef = useRef(0);

  const pistonOscillationGuideChecklistCurrentIndexRef = useRef(0);

  const pistonOscillationGuideChecklistPageLengthRef = useRef(1);

  const applyPistonOscillationGuideChecklistView = (
    viewedIndex: number,
    visualOffsetPx = 0,
    animate = true,
  ) => {
    const clampedIndex = Math.max(
      0,
      Math.min(pistonOscillationGuideChecklistPageLengthRef.current - 1, viewedIndex),
    );
    const clampedOffset = Math.max(
      -PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX * 0.48,
      Math.min(
        PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX * 0.48,
        visualOffsetPx,
      ),
    );
    pistonOscillationGuideChecklistViewedIndexRef.current = clampedIndex;
    pistonOscillationGuideChecklistVisualOffsetRef.current = clampedOffset;
    setPistonOscillationGuideChecklistViewedIndex((current) => (
      current === clampedIndex ? current : clampedIndex
    ));
    const track = pistonOscillationGuideChecklistTrackRef.current;
    if (!track) return;
    const baseOffset = PISTON_OSCILLATION_GUIDE_CHECKLIST_CENTER_OFFSET_PX
      - clampedIndex * PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
    track.style.setProperty('--studio-heat-guide-step-base-offset', `${baseOffset}px`);
    track.style.setProperty('--studio-heat-guide-step-visual-offset', `${clampedOffset}px`);
    track.classList.toggle('studio-heat-guide-step-track-snapping', animate);
  };

  const clearPistonOscillationGuideChecklistTimers = () => {
    if (pistonOscillationGuideChecklistFrameRef.current !== null) {
      window.cancelAnimationFrame(pistonOscillationGuideChecklistFrameRef.current);
      pistonOscillationGuideChecklistFrameRef.current = null;
    }
    if (pistonOscillationGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistSnapTimerRef.current);
      pistonOscillationGuideChecklistSnapTimerRef.current = null;
    }
    if (pistonOscillationGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistReturnTimerRef.current);
      pistonOscillationGuideChecklistReturnTimerRef.current = null;
    }
  };

  const returnPistonOscillationGuideChecklistToCurrentStep = () => {
    pistonOscillationGuideChecklistPendingWheelDeltaRef.current = 0;
    applyPistonOscillationGuideChecklistView(
      pistonOscillationGuideChecklistCurrentIndexRef.current,
      0,
      true,
    );
  };

  const processPistonOscillationGuideChecklistWheelFrame = () => {
    pistonOscillationGuideChecklistFrameRef.current = null;
    const pendingDelta = pistonOscillationGuideChecklistPendingWheelDeltaRef.current;
    pistonOscillationGuideChecklistPendingWheelDeltaRef.current = 0;
    if (!pendingDelta) return;

    let nextIndex = pistonOscillationGuideChecklistViewedIndexRef.current;
    let nextOffset = pistonOscillationGuideChecklistVisualOffsetRef.current
      - pendingDelta * HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE;
    let committedSteps = 0;
    const rowHeight = PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
    const halfRow = rowHeight / 2;
    while (
      nextOffset <= -halfRow
      && nextIndex < pistonOscillationGuideChecklistPageLengthRef.current - 1
      && committedSteps < HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS
    ) {
      nextIndex += 1;
      nextOffset += rowHeight;
      committedSteps += 1;
    }
    while (
      nextOffset >= halfRow
      && nextIndex > 0
      && committedSteps < HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS
    ) {
      nextIndex -= 1;
      nextOffset -= rowHeight;
      committedSteps += 1;
    }
    if (nextIndex <= 0 && nextOffset > 0) nextOffset = 0;
    if (
      nextIndex >= pistonOscillationGuideChecklistPageLengthRef.current - 1
      && nextOffset < 0
    ) nextOffset = 0;

    applyPistonOscillationGuideChecklistView(nextIndex, nextOffset, false);
    if (pistonOscillationGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistSnapTimerRef.current);
    }
    pistonOscillationGuideChecklistSnapTimerRef.current = window.setTimeout(() => {
      pistonOscillationGuideChecklistSnapTimerRef.current = null;
      applyPistonOscillationGuideChecklistView(
        pistonOscillationGuideChecklistViewedIndexRef.current,
        0,
        true,
      );
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS);
    if (pistonOscillationGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistReturnTimerRef.current);
    }
    pistonOscillationGuideChecklistReturnTimerRef.current = window.setTimeout(() => {
      pistonOscillationGuideChecklistReturnTimerRef.current = null;
      returnPistonOscillationGuideChecklistToCurrentStep();
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS);
  };

  const handlePistonOscillationGuideChecklistWheel = (
    event: React.WheelEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const deltaModeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
    const normalizedDelta = Math.max(-180, Math.min(180, event.deltaY * deltaModeScale));
    pistonOscillationGuideChecklistPendingWheelDeltaRef.current += normalizedDelta;
    if (pistonOscillationGuideChecklistFrameRef.current === null) {
      pistonOscillationGuideChecklistFrameRef.current = window.requestAnimationFrame(
        processPistonOscillationGuideChecklistWheelFrame,
      );
    }
  };

  const handlePistonOscillationGuideChecklistKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const currentIndex = pistonOscillationGuideChecklistViewedIndexRef.current;
    const lastIndex = Math.max(
      0,
      pistonOscillationGuideChecklistPageLengthRef.current - 1,
    );
    const nextIndex = event.key === 'ArrowDown'
      ? Math.min(lastIndex, currentIndex + 1)
      : event.key === 'ArrowUp'
        ? Math.max(0, currentIndex - 1)
        : event.key === 'PageDown'
          ? Math.min(lastIndex, currentIndex + 3)
          : event.key === 'PageUp'
            ? Math.max(0, currentIndex - 3)
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? lastIndex
                : null;
    if (nextIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    pistonOscillationGuideChecklistPendingWheelDeltaRef.current = 0;
    if (pistonOscillationGuideChecklistFrameRef.current !== null) {
      window.cancelAnimationFrame(pistonOscillationGuideChecklistFrameRef.current);
      pistonOscillationGuideChecklistFrameRef.current = null;
    }
    if (pistonOscillationGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistSnapTimerRef.current);
      pistonOscillationGuideChecklistSnapTimerRef.current = null;
    }
    applyPistonOscillationGuideChecklistView(nextIndex, 0, true);
    if (pistonOscillationGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistReturnTimerRef.current);
    }
    pistonOscillationGuideChecklistReturnTimerRef.current = window.setTimeout(() => {
      pistonOscillationGuideChecklistReturnTimerRef.current = null;
      returnPistonOscillationGuideChecklistToCurrentStep();
    }, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS);
  };

  useLayoutEffect(() => {
    const track = pistonOscillationGuideChecklistTrackRef.current;
    if (!activePistonOscillationGuideSelected || !track) {
      clearPistonOscillationGuideChecklistTimers();
      return;
    }
    const currentIndex = Number(track.dataset.pistonGuideCurrentIndex ?? 0);
    const pageLength = Number(track.dataset.pistonGuidePageLength ?? 1);
    pistonOscillationGuideChecklistPageLengthRef.current = Math.max(1, pageLength);
    pistonOscillationGuideChecklistCurrentIndexRef.current = Math.max(0, currentIndex);
    pistonOscillationGuideChecklistPendingWheelDeltaRef.current = 0;
    if (pistonOscillationGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistSnapTimerRef.current);
      pistonOscillationGuideChecklistSnapTimerRef.current = null;
    }
    if (pistonOscillationGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(pistonOscillationGuideChecklistReturnTimerRef.current);
      pistonOscillationGuideChecklistReturnTimerRef.current = null;
    }
    applyPistonOscillationGuideChecklistView(currentIndex, 0, true);
  }, [
    activeFile.id,
    activePistonOscillationGuideSelected,
    activePistonOscillationGuideSession?.measurementIndex,
    activePistonOscillationGuideSession?.status,
    activePistonOscillationGuideSession?.step,
  ]);
  useEffect(() => () => {
    clearPistonOscillationGuideChecklistTimers();
  }, []);

  return { pistonOscillationGuideChecklistViewedIndex, pistonOscillationGuideChecklistTrackRef, pistonOscillationGuideChecklistVisualOffsetRef, handlePistonOscillationGuideChecklistWheel, handlePistonOscillationGuideChecklistKeyDown };
};
