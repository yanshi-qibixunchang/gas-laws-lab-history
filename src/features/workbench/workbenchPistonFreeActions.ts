import React from 'react';

import { startPistonOscillationFreeWorkbenchState, startPistonOscillationGuideWorkbenchState, transitionPistonOscillationFreeWorkbenchState, transitionPistonOscillationGuideWorkbenchState } from './workbenchPistonOscillationState.ts';

import type { PistonOscillationGuideInstrumentSnapshot } from "../pistonOscillation/PistonOscillationInteractionWorkspace.tsx";
import { createDefaultPistonOscillationDemoSession, startPistonOscillationDemoSession } from '../../domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';

import { isExperimentTutorialFileId } from '../learning/workbenchTutorialCoordinator.ts';

export interface createWorkbenchPistonFreeActionsPorts {
  desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  activeFileIdRef: React.MutableRefObject<string>;
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
  clearPistonOscillationGuideCompletionToast: () => void;
  setFiles: React.Dispatch<React.SetStateAction<import("./workbenchFileUnion.ts").WorkbenchFileState[]>>;
  scheduleWorkspacePersistenceRef: React.MutableRefObject<(reason?: import("./workbenchPersistenceScheduler.ts").WorkbenchPersistenceReason | undefined) => boolean>;
  flushWorkspacePersistenceRef: React.MutableRefObject<() => Promise<boolean>>;
  pistonOscillationDemoPlaybackChannel: import("../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts").PistonOscillationDemoPlaybackChannel;
  setPistonOscillationDemoPlayback: React.Dispatch<React.SetStateAction<{ fileId: string | null; phase: "idle" | "running" | "paused" | "terminated" | "completed"; elapsedMs: number; }>>;
  setPistonOscillationPowerOnByFileId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPistonOscillationMeasurementCyclesByFileId: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPistonOscillationFreeSetupRequestedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  pistonOscillationAcquisitionPanelRef: React.MutableRefObject<import("../pistonOscillation/PistonOscillationAcquisitionPanel.tsx").PistonOscillationAcquisitionPanelHandle | null>;
  updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  requestPromptConfirmation: (request: import("../../components/prompts/PromptConfirmDialog.tsx").PromptConfirmationRequest) => void;
  pushUndoSnapshot: (snapshot: import("./workbenchEditSnapshot.ts").WorkbenchEditSnapshot) => void;
  createEditSnapshot: (label: string, scope?: "file" | "workspace" | "presentation" | undefined, fileId?: string | undefined) => import("./workbenchEditSnapshot.ts").WorkbenchEditSnapshot;
  pistonOscillationLivePressureChannel: import("../pistonOscillation/pistonOscillationLivePressureChannel.ts").PistonOscillationLivePressureChannel;
  updateRuntimeFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  experienceProfileRef: React.MutableRefObject<import("../learning/experimentLearningModel.ts").AppExperienceProfile>;
}

export const createWorkbenchPistonFreeActions = (ports: createWorkbenchPistonFreeActionsPorts) => {
  const { desktopExitQuiescedRef, activeFileIdRef, filesRef, clearPistonOscillationGuideCompletionToast, setFiles, scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef, pistonOscillationDemoPlaybackChannel, setPistonOscillationDemoPlayback, setPistonOscillationPowerOnByFileId, setPistonOscillationMeasurementCyclesByFileId, setPistonOscillationFreeSetupRequestedFileId, setLeftCollapsed, setParametersCollapsed, pistonOscillationAcquisitionPanelRef, updateFileById, settingsLanguagePreference, requestPromptConfirmation, pushUndoSnapshot, createEditSnapshot, pistonOscillationLivePressureChannel, updateRuntimeFileById, experienceProfileRef } = ports;
  const activatePistonOscillationFreeMode = (
    targetHeightsMm: readonly number[] | null,
    customHeightCandidatesMm: readonly number[] = [],
  ) => {
    if (desktopExitQuiescedRef.current) return;
    const fileId = activeFileIdRef.current;
    const liveFile = filesRef.current.find((file) => file.id === fileId);
    if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') return;
    const nowMs = Date.now();
    const demoSession = createDefaultPistonOscillationDemoSession(nowMs);
    const nextFiles = filesRef.current.map((file) => {
      if (file.id !== fileId || file.kind !== 'heatCapacityPistonOscillation') return file;
      const guideSelected = file.pistonOscillationGuideSession.status === 'active'
        || (
          file.pistonOscillationGuideSession.status === 'completed'
          && !file.pistonOscillationGuideSession.completionExited
        );
      let nextFile = guideSelected
        ? transitionPistonOscillationGuideWorkbenchState(file, {
            type: 'exitSession',
            nowMs,
          })
        : file;
      nextFile = startPistonOscillationFreeWorkbenchState(nextFile, nowMs);
      if (targetHeightsMm !== null) {
        nextFile = transitionPistonOscillationFreeWorkbenchState(nextFile, {
          type: 'setPlan',
          targetHeightsMm,
          customHeightCandidatesMm,
          nowMs,
        });
      }
      return {
        ...nextFile,
        pistonOscillationDemoSession: demoSession,
        updatedAt: nowMs,
      };
    });
    clearPistonOscillationGuideCompletionToast();
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    scheduleWorkspacePersistenceRef.current('semantic');
    void flushWorkspacePersistenceRef.current();
    pistonOscillationDemoPlaybackChannel.publish({
      fileId: null,
      phase: 'idle',
      elapsedMs: 0,
    });
    setPistonOscillationDemoPlayback({ fileId: null, phase: 'idle', elapsedMs: 0 });
    setPistonOscillationPowerOnByFileId((current) => ({
      ...current,
      [fileId]: false,
    }));
    setPistonOscillationMeasurementCyclesByFileId((current) => ({
      ...current,
      [fileId]: (current[fileId] ?? 0) + 1,
    }));
    setPistonOscillationFreeSetupRequestedFileId(null);
    setLeftCollapsed(true);
    setParametersCollapsed(true);
  };

  const pausePistonOscillationFreeMode = () => {
    const fileId = activeFileIdRef.current;
    const nowMs = Date.now();
    const acquisitionCandidate = pistonOscillationAcquisitionPanelRef.current
      ?.pauseAndCaptureFreeRun() ?? null;
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacityPistonOscillation') return file;
      const withFrozenAcquisition = acquisitionCandidate
        ? transitionPistonOscillationFreeWorkbenchState(file, {
            type: 'freezeAcquisition',
            measurement: acquisitionCandidate,
            nowMs,
          })
        : file;
      return transitionPistonOscillationFreeWorkbenchState(withFrozenAcquisition, {
        type: 'pause',
        nowMs,
      });
    });
    setPistonOscillationPowerOnByFileId((current) => ({
      ...current,
      [fileId]: false,
    }));
    setLeftCollapsed(false);
  };

  const deletePistonOscillationFreeMeasurement = (measurementIndex: number) => {
    const fileId = activeFileIdRef.current;
    updateFileById(fileId, (file) => file.kind === 'heatCapacityPistonOscillation'
      ? transitionPistonOscillationFreeWorkbenchState(file, {
          type: 'deleteMeasurement',
          measurementIndex,
          nowMs: Date.now(),
        })
      : file);
    setPistonOscillationMeasurementCyclesByFileId((current) => ({
      ...current,
      [fileId]: (current[fileId] ?? 0) + 1,
    }));
  };

  const requestPistonOscillationFreeReset = () => {
    const fileId = activeFileIdRef.current;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: 'Reset the entire Free-mode experiment?',
          body: 'The current plan, custom candidates, saved and unsaved curves, processing progress, and instrument state will be cleared.',
          consequence: 'The current parameter profile is retained and unlocked. Demo mode, Guide mode, and global settings are not affected. You can undo this reset from the Edit menu.',
          cancel: 'Cancel',
          confirm: 'Reset Free mode',
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: '重設整個自由模式實驗？',
            body: '目前計畫、自訂候選、已儲存與未儲存曲線、資料處理進度和儀器狀態都會被清空。',
            consequence: '目前參數組會保留並解除鎖定；演示模式、引導模式和軟體全域設定不受影響。可從「編輯」選單復原本次重設。',
            cancel: '取消',
            confirm: '重設自由模式',
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: '重置整个自由模式实验？',
            body: '当前计划、自定义候选、已保存与未保存曲线、数据处理进度和仪器状态都会被清空。',
            consequence: '当前参数组会保留并解除锁定；演示模式、引导模式和软件全局设置不受影响。可以从“编辑”菜单撤销本次重置。',
            cancel: '取消',
            confirm: '重置自由模式',
            close: '关闭',
          };
    requestPromptConfirmation({
      id: `reset-piston-oscillation-free-session:${fileId}`,
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: () => {
        const liveFile = filesRef.current.find((file) => file.id === fileId);
        if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') return;
        pushUndoSnapshot(createEditSnapshot(
          'reset piston-oscillation free session',
          'file',
          fileId,
        ));
        updateFileById(fileId, (file) => file.kind === 'heatCapacityPistonOscillation'
          ? transitionPistonOscillationFreeWorkbenchState(file, {
              type: 'reset',
              nowMs: Date.now(),
            })
          : file);
        pistonOscillationLivePressureChannel.clear();
        setPistonOscillationPowerOnByFileId((current) => ({
          ...current,
          [fileId]: false,
        }));
        setPistonOscillationMeasurementCyclesByFileId((current) => ({
          ...current,
          [fileId]: (current[fileId] ?? 0) + 1,
        }));
        setPistonOscillationFreeSetupRequestedFileId(null);
      },
    });
  };

  const handlePistonOscillationFreeInstrumentSnapshot = (
    snapshot: PistonOscillationGuideInstrumentSnapshot,
  ) => {
    // Press, hold, fall, and rebound are transient actions. Persisting every
    // animation frame forced the entire workbench to render and serialize at
    // pointer frequency. The final idle snapshot contains the stable physical
    // state that free-mode restore is designed to retain.
    if (snapshot.pistonPhase !== 'idle') return;
    const fileId = activeFileIdRef.current;
    updateRuntimeFileById(fileId, (file) => {
      if (
        file.kind !== 'heatCapacityPistonOscillation'
        || file.pistonOscillationFreeSession.status !== 'active'
      ) return file;
      return transitionPistonOscillationFreeWorkbenchState(file, {
        type: 'setInstrumentState',
        instrumentState: {
          focusMode: snapshot.focusMode,
          hoseState: snapshot.hoseState,
          nominalHeightMm: snapshot.nominalHeightMm,
          equilibriumHeightMm: snapshot.equilibriumHeightMm,
          pistonOffsetMm: snapshot.pistonOffsetMm,
          lockingScrewProgress: snapshot.lockingScrewProgress,
          heightAdjustmentStage: snapshot.heightAdjustmentStage,
          pistonPhase: snapshot.pistonPhase,
          thermodynamicState: snapshot.thermodynamicState,
        },
        nowMs: Date.now(),
      });
    });
    scheduleWorkspacePersistenceRef.current('semantic');
  };

  const activatePistonOscillationTutorialMode = (mode: 'demo' | 'guide') => {
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    const fileId = activeFileIdRef.current;
    const liveFile = filesRef.current.find((file) => file.id === fileId);
    if (
      experiment !== 'pistonOscillation' ||
      !liveFile ||
      liveFile.kind !== 'heatCapacityPistonOscillation' ||
      !isExperimentTutorialFileId(fileId, experiment)
    ) return;
    const nowMs = Date.now();
    const demoSession = mode === 'demo'
      ? startPistonOscillationDemoSession(nowMs)
      : createDefaultPistonOscillationDemoSession(nowMs);
    const nextFile = mode === 'guide'
      ? startPistonOscillationGuideWorkbenchState({
          ...liveFile,
          pistonOscillationDemoSession: demoSession,
        }, nowMs)
      : {
          ...liveFile,
          pistonOscillationDemoSession: demoSession,
          updatedAt: nowMs,
        };
    updateFileById(fileId, () => nextFile);
    const playback = {
      fileId: mode === 'demo' ? fileId : null,
      phase: demoSession.status,
      elapsedMs: demoSession.elapsedMs,
    } as const;
    pistonOscillationDemoPlaybackChannel.publish(playback);
    setPistonOscillationDemoPlayback(playback);
    setPistonOscillationPowerOnByFileId((current) => ({ ...current, [fileId]: false }));
    setLeftCollapsed(true);
    setParametersCollapsed(true);
  };

  const clearPistonOscillationTutorialPlayback = () => {
    clearPistonOscillationGuideCompletionToast();
    pistonOscillationDemoPlaybackChannel.publish({ fileId: null, phase: 'idle', elapsedMs: 0 });
    setPistonOscillationDemoPlayback({ fileId: null, phase: 'idle', elapsedMs: 0 });
  };
  return { activatePistonOscillationFreeMode, pausePistonOscillationFreeMode, deletePistonOscillationFreeMeasurement, requestPistonOscillationFreeReset, handlePistonOscillationFreeInstrumentSnapshot, activatePistonOscillationTutorialMode, clearPistonOscillationTutorialPlayback };
};
