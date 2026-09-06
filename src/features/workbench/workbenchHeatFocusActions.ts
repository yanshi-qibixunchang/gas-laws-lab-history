import React from 'react';

import { freezeHeatCapacityFreeParametersForCurrentGroup, hasCompletedHeatCapacityFreeRecordSet } from './workbenchHeatCapacityFreeParameterState.ts';
import { getHeatCapacityStopcockState } from './workbenchHeatCapacityInstrumentState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { hasGuideHeatCapacityReachedPumpTarget } from './workbenchHeatCapacityGuideDecisions.ts';


import { type HeatCapacityFocusControlSnapshot, type HeatCapacityFocusMode, type HeatCapacityFocusSession } from './workbenchHeatCapacityUiCheckpoint.ts';

export interface createWorkbenchHeatFocusActionsPorts {
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
  heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
  heatCapacitySceneFocusModeRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusMode>;
  updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setHeatCapacityFocusResetKey: React.Dispatch<React.SetStateAction<number>>;
  activeFileIdRef: React.MutableRefObject<string>;
  parametersCollapsed: boolean;
  setHeatCapacityAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPinnedHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHeatCapacityParamHelpPopoverStyle: React.Dispatch<React.SetStateAction<React.CSSProperties | undefined>>;
  guideHeatCapacityActiveFileIdRef: React.MutableRefObject<string | null>;
  getGuideStepGuidance: (step: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep, file?: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState | undefined) => { message: string; controlId: string | null; };
  showGuideHeatCapacityGuidance: (message: string, controlId?: string | null | undefined, level?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastLevel, source?: "guide" | "guide-blocked") => void;
}

export const createWorkbenchHeatFocusActions = (ports: createWorkbenchHeatFocusActionsPorts) => {
  const { filesRef, heatCapacityFocusSessionRef, heatCapacitySceneFocusModeRef, updateFileById, setParametersCollapsed, setHeatCapacityFocusResetKey, activeFileIdRef, parametersCollapsed, setHeatCapacityAdvancedOpen, setPinnedHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId, setHeatCapacityParamHelpPopoverStyle, guideHeatCapacityActiveFileIdRef, getGuideStepGuidance, showGuideHeatCapacityGuidance } = ports;
  const getHeatCapacityFocusControlSnapshot = (
    file: WorkbenchHeatCapacityState,
  ): HeatCapacityFocusControlSnapshot => ({
    powerOn: file.powerOn,
    stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
    pumpValveOpen: file.pumpValveOpen,
    pressureZeroAdjusted: file.pressureZeroAdjusted,
    pressureZeroOffset: file.pressureZeroOffset,
  });

  const isHeatCapacityFocusSessionMeaningful = (
    session: HeatCapacityFocusSession,
  ) => {
    if (session.nonReversibleAction) return true;
    const currentFile = filesRef.current.find((file) => file.id === session.fileId);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return true;
    const currentSnapshot = getHeatCapacityFocusControlSnapshot(currentFile);
    return (
      currentSnapshot.powerOn !== session.baseline.powerOn ||
      currentSnapshot.stopcockOpen !== session.baseline.stopcockOpen ||
      currentSnapshot.pumpValveOpen !== session.baseline.pumpValveOpen ||
      currentSnapshot.pressureZeroAdjusted !== session.baseline.pressureZeroAdjusted ||
      currentSnapshot.pressureZeroOffset !== session.baseline.pressureZeroOffset
    );
  };

  const markHeatCapacityFocusSessionNonReversible = () => {
    const session = heatCapacityFocusSessionRef.current;
    if (!session) return;
    heatCapacityFocusSessionRef.current = {
      ...session,
      nonReversibleAction: true,
    };
  };

  const exitHeatCapacityFocusMode = () => {
    heatCapacitySceneFocusModeRef.current = 'none';
    const session = heatCapacityFocusSessionRef.current;
    if (session) {
      const meaningfulSession = isHeatCapacityFocusSessionMeaningful(session);
      updateFileById(session.fileId, (file) => {
        if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
        if (!meaningfulSession) return file;
        if (
          file.heatCapacityFreeRunWorkspace.currentExperimentStatus === 'draft' &&
          !hasCompletedHeatCapacityFreeRecordSet(file)
        ) {
          return freezeHeatCapacityFreeParametersForCurrentGroup(file);
        }
        return file;
      });
      if (!meaningfulSession && !session.parametersCollapsedBeforeFocus) {
        setParametersCollapsed(false);
      }
      heatCapacityFocusSessionRef.current = null;
    }
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const updateHeatCapacityFocusMode = (mode: HeatCapacityFocusMode) => {
    heatCapacitySceneFocusModeRef.current = mode;
    if (mode === 'none') {
      exitHeatCapacityFocusMode();
      return;
    }
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (currentFile?.kind === 'heatCapacity') {
      const currentSession = heatCapacityFocusSessionRef.current;
      heatCapacityFocusSessionRef.current = currentSession?.fileId === currentFile.id
        ? {
            ...currentSession,
            mode,
          }
        : {
            fileId: currentFile.id,
            mode,
            parametersCollapsedBeforeFocus: parametersCollapsed,
            baseline: getHeatCapacityFocusControlSnapshot(currentFile),
            nonReversibleAction: false,
          };
      setParametersCollapsed(true);
      setHeatCapacityAdvancedOpen(false);
      setPinnedHeatCapacityParamHelpId(null);
      setHoveredHeatCapacityParamHelpId(null);
      setHeatCapacityParamHelpPopoverStyle(undefined);
    }
  };

  const handleHeatCapacityFocusExitRequest = (mode: HeatCapacityFocusMode) => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      mode === 'pump' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide' &&
      guideHeatCapacityActiveFileIdRef.current === currentFile.id &&
      currentFile.heatCapacityGuideWorkflow.step === 'pumpRequired' &&
      !hasGuideHeatCapacityReachedPumpTarget(currentFile)
    ) {
      const guidance = getGuideStepGuidance('pumpRequired', currentFile);
      showGuideHeatCapacityGuidance(guidance.message, guidance.controlId, 'warning', 'guide-blocked');
      return false;
    }
    return true;
  };
  return { markHeatCapacityFocusSessionNonReversible, exitHeatCapacityFocusMode, updateHeatCapacityFocusMode, handleHeatCapacityFocusExitRequest };
};
