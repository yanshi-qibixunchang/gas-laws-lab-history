import { workbenchPromptCopies } from './workbenchPromptCopies.ts';
import React from 'react';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { startPistonOscillationGuideWorkbenchState, transitionPistonOscillationFreeWorkbenchState, transitionPistonOscillationGuideWorkbenchState } from './workbenchPistonOscillationState.ts';
import type { WorkbenchPersistenceReason } from './workbenchPersistenceScheduler.ts';
import { PISTON_OSCILLATION_DEMO_DURATION_MS } from "../pistonOscillation/pistonOscillationDemoTimeline.ts";
import { createPistonOscillationDemoPlaybackChannel } from "../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts";
import { getPistonOscillationShellCopy } from "../pistonOscillation/pistonOscillationCopy.ts";
import { createDefaultPistonOscillationDemoSession, pausePistonOscillationDemoSession, resumePistonOscillationDemoSession, startPistonOscillationDemoSession } from '../../domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';

export interface WorkbenchPistonModeActionPorts {
  activeFile: Extract<WorkbenchFileState, {kind: 'heatCapacityPistonOscillation'}>;
  desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  filesRef: React.MutableRefObject<WorkbenchFileState[]>;
  setFiles: React.Dispatch<React.SetStateAction<WorkbenchFileState[]>>;
  scheduleWorkspacePersistenceRef: React.MutableRefObject<(reason?: WorkbenchPersistenceReason) => boolean>;
  flushWorkspacePersistenceRef: React.MutableRefObject<() => Promise<boolean>>;
  pistonOscillationDemoPlaybackChannel: ReturnType<typeof createPistonOscillationDemoPlaybackChannel>;
  pistonOscillationDemoPlayback: ReturnType<ReturnType<typeof createPistonOscillationDemoPlaybackChannel>['getSnapshot']>;
  setPistonOscillationDemoPlayback: React.Dispatch<React.SetStateAction<WorkbenchPistonModeActionPorts['pistonOscillationDemoPlayback']>>;
  requestPromptConfirmation: (request: PromptConfirmationRequest) => void;
  workbenchPromptCopy: typeof workbenchPromptCopies[keyof typeof workbenchPromptCopies];
  pistonOscillationCopy: ReturnType<typeof getPistonOscillationShellCopy>;
  pistonOscillationCalculationWindowOpen: boolean;
  clearPistonOscillationGuideCompletionToast: () => void;
  setPistonOscillationPowerOnByFileId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  pistonOscillationGuideResetFeedbackTimerRef: React.MutableRefObject<number | null>;
  setPistonOscillationGuideResetFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setPistonOscillationFreeSetupRequestedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  activatePistonOscillationFreeMode: (targetHeightsMm: readonly number[] | null, customHeightCandidatesMm?: readonly number[]) => void;
  pausePistonOscillationFreeMode: () => void;
}

export const createWorkbenchPistonModeActions = (ports: WorkbenchPistonModeActionPorts) => {
  const { activeFile, desktopExitQuiescedRef, filesRef, setFiles, scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef, pistonOscillationDemoPlaybackChannel, pistonOscillationDemoPlayback, setPistonOscillationDemoPlayback, requestPromptConfirmation, workbenchPromptCopy, pistonOscillationCopy, pistonOscillationCalculationWindowOpen, clearPistonOscillationGuideCompletionToast, setPistonOscillationPowerOnByFileId, setLeftCollapsed, setParametersCollapsed, pistonOscillationGuideResetFeedbackTimerRef, setPistonOscillationGuideResetFeedback, setPistonOscillationFreeSetupRequestedFileId, activatePistonOscillationFreeMode, pausePistonOscillationFreeMode } = ports;
  const demoSelected = pistonOscillationDemoPlayback.fileId === activeFile.id
      && pistonOscillationDemoPlayback.phase !== 'idle';

  const demoRunning = demoSelected && pistonOscillationDemoPlayback.phase === 'running';

  const demoPaused = demoSelected && pistonOscillationDemoPlayback.phase === 'paused';

  const demoCompleted = demoSelected && pistonOscillationDemoPlayback.phase === 'completed';

  const labels = pistonOscillationCopy.modes;

  const guideSessionSelected = activeFile.pistonOscillationGuideSession.status === 'active'
      || (
        activeFile.pistonOscillationGuideSession.status === 'completed'
        && !activeFile.pistonOscillationGuideSession.completionExited
      );

  const guideCompleted = activeFile.pistonOscillationGuideSession.status === 'completed';

  const guideSelected = !demoSelected && guideSessionSelected;

  const freeSelected = !demoSelected
      && !guideSelected
      && activeFile.pistonOscillationFreeSession.status === 'active';

  const interactionLocked = pistonOscillationCalculationWindowOpen;

  const commitPistonTeachingModeFile = (
      updater: (file: WorkbenchFileState) => WorkbenchFileState,
    ) => {
      if (desktopExitQuiescedRef.current) return;
      const fileId = activeFile.id;
      const nextFiles = filesRef.current.map((file) => (
        file.id === fileId ? updater(file) : file
      ));
      filesRef.current = nextFiles;
      setFiles(nextFiles);
      scheduleWorkspacePersistenceRef.current('semantic');
      void flushWorkspacePersistenceRef.current();
    };

  const publishDemoSession = (
      session: ReturnType<typeof createDefaultPistonOscillationDemoSession>,
    ) => {
      const snapshot = {
        fileId: session.status === 'idle' ? null : activeFile.id,
        phase: session.status,
        elapsedMs: session.elapsedMs,
      } as const;
      pistonOscillationDemoPlaybackChannel.publish(snapshot);
      setPistonOscillationDemoPlayback(snapshot);
    };

  const requestPistonTeachingModeSwitch = (onConfirm: () => void) => {
      requestPromptConfirmation({
        id: `switch-piston-teaching-mode:${activeFile.id}`,
        tone: 'warning',
        ...workbenchPromptCopy.switchPistonTeachingMode,
        closeLabel: workbenchPromptCopy.closeLabel,
        onConfirm,
      });
    };

  const activateDemo = () => {
      const nowMs = Date.now();
      const demoSession = startPistonOscillationDemoSession(nowMs);
      clearPistonOscillationGuideCompletionToast();
      commitPistonTeachingModeFile((file) => {
        if (file.kind !== 'heatCapacityPistonOscillation') return file;
        let nextFile = guideSessionSelected
          ? transitionPistonOscillationGuideWorkbenchState(file, {
              type: 'exitSession',
              nowMs,
            })
          : file;
        if (nextFile.pistonOscillationFreeSession.status === 'active') {
          nextFile = transitionPistonOscillationFreeWorkbenchState(nextFile, {
            type: 'pause',
            nowMs,
          });
        }
        return {
          ...nextFile,
          pistonOscillationDemoSession: demoSession,
          updatedAt: nowMs,
        };
      });
      publishDemoSession(demoSession);
      setPistonOscillationPowerOnByFileId((current) => ({
        ...current,
        [activeFile.id]: false,
      }));
      setLeftCollapsed(true);
      setParametersCollapsed(true);
    };

  const startDemo = () => {
      if (demoSelected) return;
      const unfinishedGuide = guideSessionSelected && !guideCompleted;
      if (unfinishedGuide || freeSelected) {
        requestPistonTeachingModeSwitch(activateDemo);
        return;
      }
      activateDemo();
    };

  const pauseDemo = () => {
      if (!demoRunning) return;
      const nowMs = Date.now();
      const liveFile = filesRef.current.find((file) => file.id === activeFile.id);
      if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') return;
      const demoSession = pausePistonOscillationDemoSession(
        liveFile.pistonOscillationDemoSession,
        PISTON_OSCILLATION_DEMO_DURATION_MS,
        nowMs,
      );
      commitPistonTeachingModeFile((file) => file.kind === 'heatCapacityPistonOscillation'
        ? { ...file, pistonOscillationDemoSession: demoSession, updatedAt: nowMs }
        : file);
      publishDemoSession(demoSession);
    };

  const resumeDemo = () => {
      if (!demoPaused) return;
      const nowMs = Date.now();
      const liveFile = filesRef.current.find((file) => file.id === activeFile.id);
      if (!liveFile || liveFile.kind !== 'heatCapacityPistonOscillation') return;
      const demoSession = resumePistonOscillationDemoSession(
        liveFile.pistonOscillationDemoSession,
        nowMs,
      );
      commitPistonTeachingModeFile((file) => file.kind === 'heatCapacityPistonOscillation'
        ? { ...file, pistonOscillationDemoSession: demoSession, updatedAt: nowMs }
        : file);
      publishDemoSession(demoSession);
    };

  const stopDemo = () => {
      if (!demoRunning && !demoPaused) return;
      const nowMs = Date.now();
      const demoSession = createDefaultPistonOscillationDemoSession(nowMs);
      commitPistonTeachingModeFile((file) => file.kind === 'heatCapacityPistonOscillation'
        ? { ...file, pistonOscillationDemoSession: demoSession, updatedAt: nowMs }
        : file);
      publishDemoSession(demoSession);
      setPistonOscillationPowerOnByFileId((current) => ({
        ...current,
        [activeFile.id]: false,
      }));
      setLeftCollapsed(false);
    };

  const exitDemo = () => {
      if (!demoCompleted) return;
      const nowMs = Date.now();
      const demoSession = createDefaultPistonOscillationDemoSession(nowMs);
      commitPistonTeachingModeFile((file) => file.kind === 'heatCapacityPistonOscillation'
        ? { ...file, pistonOscillationDemoSession: demoSession, updatedAt: nowMs }
        : file);
      publishDemoSession(demoSession);
      setPistonOscillationPowerOnByFileId((current) => ({
        ...current,
        [activeFile.id]: false,
      }));
      setLeftCollapsed(false);
    };

  const activateGuide = () => {
      const nowMs = Date.now();
      clearPistonOscillationGuideCompletionToast();
      const demoSession = createDefaultPistonOscillationDemoSession(nowMs);
      commitPistonTeachingModeFile((file) => {
        if (file.kind !== 'heatCapacityPistonOscillation') return file;
        const freePausedFile = file.pistonOscillationFreeSession.status === 'active'
          ? transitionPistonOscillationFreeWorkbenchState(file, {
              type: 'pause',
              nowMs,
            })
          : file;
        const nextFile = freePausedFile.pistonOscillationGuideSession.status === 'completed'
          && freePausedFile.pistonOscillationGuideSession.completionExited
          ? transitionPistonOscillationGuideWorkbenchState(freePausedFile, {
              type: 'reopenCompletedSession',
              nowMs,
            })
          : startPistonOscillationGuideWorkbenchState(freePausedFile);
        return {
          ...nextFile,
          pistonOscillationDemoSession: demoSession,
          updatedAt: nowMs,
        };
      });
      publishDemoSession(demoSession);
      setPistonOscillationPowerOnByFileId((current) => ({
        ...current,
        [activeFile.id]: false,
      }));
      setLeftCollapsed(true);
      setParametersCollapsed(true);
    };

  const startGuide = () => {
      if (guideSelected) return;
      if (demoRunning || demoPaused || freeSelected) {
        requestPistonTeachingModeSwitch(activateGuide);
        return;
      }
      activateGuide();
    };

  const exitGuide = () => {
      clearPistonOscillationGuideCompletionToast();
      commitPistonTeachingModeFile((file) => file.kind === 'heatCapacityPistonOscillation'
        ? transitionPistonOscillationGuideWorkbenchState(file, {
          type: 'exitSession',
          nowMs: Date.now(),
        })
        : file);
      setPistonOscillationPowerOnByFileId((current) => ({
        ...current,
        [activeFile.id]: false,
      }));
      setLeftCollapsed(false);
    };

  const resetGuide = () => {
      clearPistonOscillationGuideCompletionToast();
      if (pistonOscillationGuideResetFeedbackTimerRef.current !== null) {
        window.clearTimeout(pistonOscillationGuideResetFeedbackTimerRef.current);
      }
      setPistonOscillationGuideResetFeedback(true);
      pistonOscillationGuideResetFeedbackTimerRef.current = window.setTimeout(() => {
        setPistonOscillationGuideResetFeedback(false);
        pistonOscillationGuideResetFeedbackTimerRef.current = null;
      }, 650);
      commitPistonTeachingModeFile((file) => file.kind === 'heatCapacityPistonOscillation'
        ? transitionPistonOscillationGuideWorkbenchState(file, {
          type: 'resetSession',
          nowMs: Date.now(),
        })
        : file);
      setPistonOscillationPowerOnByFileId((current) => ({
        ...current,
        [activeFile.id]: false,
      }));
    };

  const requestFreeSetup = () => {
      setPistonOscillationFreeSetupRequestedFileId(activeFile.id);
    };

  const startFree = () => {
      if (freeSelected) return;
      const resumeOrConfigure = activeFile.pistonOscillationFreeSession.status === 'paused'
        ? () => activatePistonOscillationFreeMode(null)
        : requestFreeSetup;
      const unfinishedGuide = guideSessionSelected && !guideCompleted;
      if (demoRunning || demoPaused || unfinishedGuide) {
        requestPistonTeachingModeSwitch(resumeOrConfigure);
        return;
      }
      resumeOrConfigure();
    };

  const exitFree = () => {
      if (!freeSelected) return;
      pausePistonOscillationFreeMode();
    };

  const pistonModeExpanded = demoSelected || guideSelected || freeSelected;

  const pistonModeName = demoSelected
      ? 'demo'
      : guideSelected
        ? 'guide'
        : freeSelected
          ? 'free'
          : 'explore';
  return { view: { demoSelected, demoRunning, demoPaused, demoCompleted, labels, guideSessionSelected, guideCompleted, guideSelected, freeSelected, interactionLocked, pistonModeExpanded, pistonModeName }, commands: { startDemo, pauseDemo, resumeDemo, stopDemo, exitDemo, startGuide, exitGuide, resetGuide, startFree, exitFree, requestFreeSetup } };
};
