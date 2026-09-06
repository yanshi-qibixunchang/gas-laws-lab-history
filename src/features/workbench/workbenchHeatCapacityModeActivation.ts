import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import type { HeatCapacityFreeBatchGroupCount as HeatCapacityBatchGroupCount } from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import type { HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { configureHeatCapacityFreeBatchWorkbenchState } from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import {
  clearHeatCapacityModeSession,
  enterHeatCapacityExploreModeWorkbenchState,
  restoreHeatCapacityModeSession,
} from './workbenchHeatCapacityModeSession.ts';
import {
  enterHeatCapacityFreeModeWorkbenchState,
  prepareHeatCapacityAutoDemoReset,
  startHeatCapacityGuideWorkbenchState,
} from './workbenchHeatCapacityTeachingLifecycleState.ts';

type HeatCapacityModeProjection = {
  file: WorkbenchHeatCapacityState;
  checkpoint: HeatCapacityModeUiCheckpoint | null;
};

export type HeatCapacityModeTarget = HeatCapacityModeProjection & {
  activation: 'resume' | 'fresh-demo' | 'fresh-guide' | 'fresh-free';
};

const isValidHeatCapacityDemoSessionCheckpoint = (
  checkpoint: HeatCapacityModeUiCheckpoint | null,
) => Boolean(
  checkpoint &&
  checkpoint.mode === 'demo' &&
  checkpoint.payload.demo.phase !== 'idle' &&
  Number.isFinite(checkpoint.payload.demo.elapsedMs) &&
  checkpoint.payload.demo.elapsedMs >= 0,
);

const resolveStoredHeatCapacityMode = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  now: number,
): HeatCapacityModeProjection | null => {
  const restoredFile = restoreHeatCapacityModeSession(file, mode, now);
  if (!restoredFile) return null;
  const checkpoint = restoredFile.heatCapacityModeSessions[mode].uiCheckpoint;
  if (mode === 'demo' && !isValidHeatCapacityDemoSessionCheckpoint(checkpoint)) return null;
  return { file: restoredFile, checkpoint };
};

const resolveHeatCapacityFreeFallback = (
  file: WorkbenchHeatCapacityState,
  now: number,
): HeatCapacityModeProjection => {
  const storedFree = resolveStoredHeatCapacityMode(file, 'free', now);
  if (storedFree) return storedFree;
  return {
    file: enterHeatCapacityFreeModeWorkbenchState(file, now),
    checkpoint: null,
  };
};

export const resolveHeatCapacityModeTarget = (
  suspendedFile: WorkbenchHeatCapacityState,
  targetMode: HeatCapacityMode,
  now: number,
): HeatCapacityModeTarget => {
  const storedTarget = resolveStoredHeatCapacityMode(suspendedFile, targetMode, now);
  if (storedTarget) {
    const resumeRunningDemo = targetMode === 'demo' &&
      storedTarget.checkpoint?.mode === 'demo' &&
      storedTarget.checkpoint.payload.demo.phase === 'running';
    return {
      file: resumeRunningDemo
        ? {
            ...storedTarget.file,
            runState: 'running',
            lastUpdateMs: now,
            displayResponseLastUpdateMs: now,
            updatedAt: now,
          }
        : storedTarget.file,
      checkpoint: storedTarget.checkpoint,
      activation: 'resume',
    };
  }
  if (targetMode === 'demo') {
    const resetDemo = prepareHeatCapacityAutoDemoReset(suspendedFile, now);
    return {
      file: { ...resetDemo, runState: 'idle', updatedAt: now },
      checkpoint: null,
      activation: 'fresh-demo',
    };
  }
  if (targetMode === 'guide') {
    return {
      file: startHeatCapacityGuideWorkbenchState(suspendedFile, now),
      checkpoint: null,
      activation: 'fresh-guide',
    };
  }
  return { ...resolveHeatCapacityFreeFallback(suspendedFile, now), activation: 'fresh-free' };
};

export const resolveHeatCapacityModeFromExplore = (
  file: WorkbenchHeatCapacityState,
  targetMode: HeatCapacityMode,
  freeBatchGroupCount: HeatCapacityBatchGroupCount | null,
  now: number,
): HeatCapacityModeTarget => {
  const sourceFile = targetMode === 'free' || (
    targetMode === 'guide' && file.heatCapacityModeSessions.guide.status === 'completed'
  )
    ? file
    : clearHeatCapacityModeSession(file, targetMode);
  const target = resolveHeatCapacityModeTarget(sourceFile, targetMode, now);
  return {
    ...target,
    file: targetMode === 'free' && freeBatchGroupCount !== null
      ? configureHeatCapacityFreeBatchWorkbenchState(target.file, freeBatchGroupCount, now)
      : target.file,
  };
};

export const resolveHeatCapacityFileModeActivation = (
  file: WorkbenchHeatCapacityState,
  now: number,
): HeatCapacityModeProjection => {
  if (file.heatCapacityMode === null) {
    return {
      file: enterHeatCapacityExploreModeWorkbenchState(file, createDefaultHeatCapacityFile(1), now),
      checkpoint: null,
    };
  }
  const storedMode = resolveStoredHeatCapacityMode(file, file.heatCapacityMode, now);
  if (storedMode) return storedMode;
  if (file.heatCapacityMode === 'demo') {
    return resolveHeatCapacityFreeFallback(clearHeatCapacityModeSession(file, 'demo'), now);
  }
  return {
    file: file.runState === 'running'
      ? { ...file, lastUpdateMs: now, displayResponseLastUpdateMs: now, updatedAt: now }
      : file,
    checkpoint: null,
  };
};

export const shouldConfirmHeatCapacityTeachingProgressReset = (
  file: WorkbenchHeatCapacityState,
  targetMode: HeatCapacityMode,
) => {
  if (file.heatCapacityMode !== 'demo' && file.heatCapacityMode !== 'guide') return false;
  if (file.heatCapacityMode === targetMode || file.heatCapacityTeachingStatus === 'completed') return false;
  return true;
};
