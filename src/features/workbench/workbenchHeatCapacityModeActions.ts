import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import type { HeatCapacityFreeBatchGroupCount as HeatCapacityBatchGroupCount } from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import type {
  HeatCapacityModeTransitionBlocker,
  HeatCapacityModeTransitionEvent,
  HeatCapacityModeTransitionIntent,
  HeatCapacityModeTransitionReason,
  HeatCapacityModeTransitionState,
} from '../heatCapacity/heatCapacityModeTransitionModel.ts';
import type { HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import {
  enterHeatCapacityExploreModeWorkbenchState,
  prepareHeatCapacityModeSessionForExit,
} from './workbenchHeatCapacityModeSession.ts';
import {
  resolveHeatCapacityFileModeActivation,
  resolveHeatCapacityModeFromExplore,
  shouldConfirmHeatCapacityTeachingProgressReset,
} from './workbenchHeatCapacityModeActivation.ts';

type HeatCapacityModeActionPorts = {
  now: () => number;
  getActiveFile: () => WorkbenchFileState | undefined;
  getFile: (fileId: string) => WorkbenchFileState | undefined;
  commitFile: (file: WorkbenchHeatCapacityState) => void;
  hasRuntimeFailure: () => boolean;
  isDesktopExitQuiesced: () => boolean;
  transition: {
    getState: () => HeatCapacityModeTransitionState;
    dispatch: (event: HeatCapacityModeTransitionEvent) => HeatCapacityModeTransitionState;
    request: (
      request: Omit<HeatCapacityModeTransitionIntent, 'requestId'>,
      reasons: readonly HeatCapacityModeTransitionBlocker[],
    ) => HeatCapacityModeTransitionState;
    getMotionReasons: () => readonly HeatCapacityModeTransitionBlocker[];
    schedulePreparation: (requestId: number) => void;
  };
  persistence: {
    requestFrame: (callback: () => void) => void;
    refresh: () => void;
    flush: () => unknown;
  };
  ui: {
    applyMode: (file: WorkbenchHeatCapacityState, checkpoint: HeatCapacityModeUiCheckpoint | null) => void;
    collapsePanels: () => void;
    expandFiles: () => void;
    resetScene: () => void;
    startDemo: (file: WorkbenchHeatCapacityState) => void;
    showGuideStart: () => void;
    requestTeachingReset: (onConfirm: () => void) => void;
  };
  demo: {
    isRunning: () => boolean;
    quiesce: (fileId: string) => void;
    resume: (fileId: string) => void;
  };
};

/** Action-time coordination only. Files, transition state, clocks and persistence stay with their owners. */
export const createHeatCapacityModeActions = (ports: HeatCapacityModeActionPorts) => {
  const persistAfterFrame = (flush: boolean) => {
    ports.persistence.requestFrame(() => {
      // These guards and readers must remain live until the queued frame executes.
      if (ports.isDesktopExitQuiesced() || ports.hasRuntimeFailure()) return;
      ports.persistence.refresh();
      if (flush) ports.persistence.flush();
    });
  };

  const applyTransitionEvent = (event: HeatCapacityModeTransitionEvent) => {
    const nextState = ports.transition.dispatch(event);
    persistAfterFrame(false);
    return nextState;
  };

  const activateFromExplore = (
    targetMode: HeatCapacityMode,
    freeBatchGroupCount: HeatCapacityBatchGroupCount | null = null,
  ) => {
    const currentFile = ports.getActiveFile();
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== null) {
      return false;
    }
    const target = resolveHeatCapacityModeFromExplore(currentFile, targetMode, freeBatchGroupCount, ports.now());
    ports.commitFile(target.file);
    ports.ui.applyMode(target.file, target.checkpoint);
    applyTransitionEvent({ type: 'synchronize', visibleMode: targetMode });
    if (target.activation === 'fresh-demo') ports.ui.startDemo(target.file);
    else if (target.activation === 'fresh-guide') ports.ui.showGuideStart();
    ports.ui.collapsePanels();
    return true;
  };

  const exitToExplore = (sourceMode: HeatCapacityMode) => {
    if (ports.transition.getState().phase !== 'idle') return false;
    const currentFile = ports.getActiveFile();
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== sourceMode) {
      return false;
    }
    const now = ports.now();
    const preparedFile = prepareHeatCapacityModeSessionForExit(currentFile, null, now);
    const exploreFile = enterHeatCapacityExploreModeWorkbenchState(preparedFile, createDefaultHeatCapacityFile(1), now);
    ports.ui.resetScene();
    ports.commitFile(exploreFile);
    ports.ui.applyMode(exploreFile, null);
    applyTransitionEvent({ type: 'synchronize', visibleMode: null });
    ports.ui.expandFiles();
    return true;
  };

  const switchMode = (
    targetMode: HeatCapacityMode,
    reason: HeatCapacityModeTransitionReason = 'mode-control',
    teachingResetConfirmed = false,
  ) => {
    if (ports.hasRuntimeFailure()) return;
    const currentFile = ports.getActiveFile();
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (!teachingResetConfirmed && reason === 'mode-control' &&
      shouldConfirmHeatCapacityTeachingProgressReset(currentFile, targetMode)) {
      ports.ui.requestTeachingReset(() => switchMode(targetMode, reason, true));
      return;
    }
    if (reason === 'mode-control' && currentFile.heatCapacityMode !== targetMode) {
      ports.ui.collapsePanels();
    }
    if (currentFile.heatCapacityMode === 'demo' && targetMode !== 'demo' && ports.demo.isRunning()) {
      ports.demo.quiesce(currentFile.id);
    }
    const transition = ports.transition.getState();
    if (transition.phase === 'idle' && transition.visibleMode !== currentFile.heatCapacityMode) {
      applyTransitionEvent({ type: 'synchronize', visibleMode: currentFile.heatCapacityMode });
    }
    const nextState = ports.transition.request({
      sourceMode: ports.transition.getState().visibleMode,
      targetMode,
      reason,
    }, ports.transition.getMotionReasons());
    persistAfterFrame(true);
    if (nextState.phase === 'preparing-target') {
      ports.transition.schedulePreparation(nextState.requestId);
    } else if (nextState.phase === 'idle' && targetMode === currentFile.heatCapacityMode) {
      ports.demo.resume(currentFile.id);
    }
  };

  const activateFile = (fileId: string) => {
    const targetFile = ports.getFile(fileId);
    if (!targetFile || targetFile.kind !== 'heatCapacity') return undefined;
    const target = resolveHeatCapacityFileModeActivation(targetFile, ports.now());
    ports.commitFile(target.file);
    ports.ui.applyMode(target.file, target.checkpoint);
    applyTransitionEvent({ type: 'synchronize', visibleMode: target.file.heatCapacityMode });
    // Explore deliberately supplies no active-mode checkpoint override to persistence.
    return targetFile.heatCapacityMode === null ? undefined : target;
  };

  return { applyTransitionEvent, activateFromExplore, exitToExplore, switchMode, activateFile };
};
