import { useEffect, useState } from 'react';

import { selectWorkbenchPistonOscillationViewState } from './workbenchPistonOscillationViewState.ts';

export interface useWorkbenchPistonProcessingViewPorts {
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  pistonOscillationDemoPlayback: { fileId: string | null; phase: "idle" | "running" | "paused" | "terminated" | "completed"; elapsedMs: number; };
  pistonOscillationPowerOnByFileId: Record<string, boolean>;
}

export const useWorkbenchPistonProcessingView = (ports: useWorkbenchPistonProcessingViewPorts) => {
  const { activeFile, pistonOscillationDemoPlayback, pistonOscillationPowerOnByFileId } = ports;
  const [pistonOscillationFreeSetupRequestedFileId, setPistonOscillationFreeSetupRequestedFileId] =
    useState<string | null>(null);

  const [pistonOscillationCalculationReviewOpen, setPistonOscillationCalculationReviewOpen] =
    useState(false);

  const [pistonOscillationDataProcessingReviewOpen, setPistonOscillationDataProcessingReviewOpen] =
    useState(false);

  const [pistonOscillationProcessReviewOpen, setPistonOscillationProcessReviewOpen] =
    useState(false);

  const [pistonOscillationProcessingSuppressedFileId,
    setPistonOscillationProcessingSuppressedFileId] = useState<string | null>(null);

  const [pistonOscillationCalculationSuppressedFileId,
    setPistonOscillationCalculationSuppressedFileId] = useState<string | null>(null);

  const {
    demoPlaybackPhase: activePistonOscillationDemoPlaybackPhase,
    guideSession: activePistonOscillationGuideSession,
    freeSession: activePistonOscillationFreeSession,
    freeSelected: activePistonOscillationFreeSelected,
    freeSetupOpen: pistonOscillationFreeSetupOpen,
    completedDataProcessingReview: pistonOscillationCompletedDataProcessingReview,
    dataProcessingOpen: activePistonOscillationDataProcessing,
    processReviewOpen: activePistonOscillationProcessReview,
    expandedRealtime: activePistonOscillationExpandedRealtime,
    calculationSession: activePistonOscillationCalculationSession,
    calculationWindowOpen: pistonOscillationCalculationWindowOpen,
    guideSelected: activePistonOscillationGuideSelected,
    parameterMode: activePistonOscillationParameterMode,
    parameterSidebarAvailable: activePistonOscillationParameterSidebarAvailable,
    powerOn: activePistonOscillationPowerOn,
  } = selectWorkbenchPistonOscillationViewState({
    file: activeFile,
    demoPlayback: pistonOscillationDemoPlayback,
    freeSetupRequestedFileId: pistonOscillationFreeSetupRequestedFileId,
    dataProcessingReviewRequested: pistonOscillationDataProcessingReviewOpen,
    processReviewRequested: pistonOscillationProcessReviewOpen,
    calculationReviewRequested: pistonOscillationCalculationReviewOpen,
    processingSuppressedFileId: pistonOscillationProcessingSuppressedFileId,
    calculationSuppressedFileId: pistonOscillationCalculationSuppressedFileId,
    explorePowerOn: pistonOscillationPowerOnByFileId[activeFile.id],
  });

  useEffect(() => {
    setPistonOscillationCalculationReviewOpen(false);
    setPistonOscillationDataProcessingReviewOpen(false);
    setPistonOscillationProcessReviewOpen(false);
    setPistonOscillationProcessingSuppressedFileId(null);
    setPistonOscillationCalculationSuppressedFileId(null);
  }, [
    activeFile.id,
    activePistonOscillationGuideSession?.startedAtMs,
    activePistonOscillationFreeSession?.startedAtMs,
  ]);

  useEffect(() => {
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation'
      || activeFile.pistonOscillationGuideSession.status === 'completed'
    ) return;
    setPistonOscillationDataProcessingReviewOpen(false);
  }, [
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationGuideSession.status
      : null,
  ]);

  useEffect(() => {
    const reviewAvailable = activeFile.kind === 'heatCapacityPistonOscillation'
      && activeFile.pistonOscillationFreeSession.status === 'active'
      && activeFile.pistonOscillationFreeSession.dataProcessing?.status === 'completed';
    if (!reviewAvailable) setPistonOscillationProcessReviewOpen(false);
  }, [
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationFreeSession.status
      : null,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationFreeSession.dataProcessing?.status ?? null
      : null,
  ]);

  useEffect(() => {
    setPistonOscillationFreeSetupRequestedFileId(null);
  }, [activeFile.id]);

  const cancelPistonOscillationFreeSetup = () => setPistonOscillationFreeSetupRequestedFileId(null);

  const requestPistonOscillationFreeSetup = () => setPistonOscillationFreeSetupRequestedFileId(activeFile.id);

  const clearPistonOscillationReviewWindows = () => {
    setPistonOscillationCalculationReviewOpen(false);
    setPistonOscillationDataProcessingReviewOpen(false);
  };
  return { setPistonOscillationFreeSetupRequestedFileId, pistonOscillationCalculationReviewOpen, setPistonOscillationCalculationReviewOpen, pistonOscillationDataProcessingReviewOpen, setPistonOscillationDataProcessingReviewOpen, pistonOscillationProcessReviewOpen, setPistonOscillationProcessReviewOpen, setPistonOscillationProcessingSuppressedFileId, setPistonOscillationCalculationSuppressedFileId, activePistonOscillationDemoPlaybackPhase, activePistonOscillationGuideSession, activePistonOscillationFreeSession, activePistonOscillationFreeSelected, pistonOscillationFreeSetupOpen, pistonOscillationCompletedDataProcessingReview, activePistonOscillationDataProcessing, activePistonOscillationProcessReview, activePistonOscillationExpandedRealtime, activePistonOscillationCalculationSession, pistonOscillationCalculationWindowOpen, activePistonOscillationGuideSelected, activePistonOscillationParameterMode, activePistonOscillationParameterSidebarAvailable, activePistonOscillationPowerOn, cancelPistonOscillationFreeSetup, requestPistonOscillationFreeSetup, clearPistonOscillationReviewWindows };
};
