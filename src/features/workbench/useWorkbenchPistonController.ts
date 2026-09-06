import { createWorkbenchPistonFreeActions } from './workbenchPistonFreeActions.ts';
import { useWorkbenchPistonLessons } from './useWorkbenchPistonLessons.ts';
import { useWorkbenchPistonLessonState } from './useWorkbenchPistonLessonState.ts';
import { createWorkbenchPistonAcquisitionProcessingActions } from './workbenchPistonAcquisitionProcessingActions.ts';
import { useWorkbenchPistonProcessingView } from './useWorkbenchPistonProcessingView.ts';
import { useWorkbenchPistonGuideRuntime } from './useWorkbenchPistonGuideRuntime.ts';
import { useWorkbenchPistonDemoRuntime } from './useWorkbenchPistonDemoRuntime.ts';
import { useWorkbenchPistonChecklist } from './useWorkbenchPistonChecklist.ts';
import { useWorkbenchPistonFeedback } from './useWorkbenchPistonFeedback.ts';
import { createWorkbenchPistonParameterActions } from './workbenchPistonParameterActions.ts';
import { useWorkbenchPistonChannels } from './useWorkbenchPistonChannels.ts';
import { createWorkbenchPistonViewActions } from './workbenchPistonViewActions.ts';
import { createWorkbenchPistonModeActions } from './workbenchPistonModeActions.ts';
import { workbenchPromptCopies } from './workbenchPromptCopies.ts';
import React, { useRef, useState } from 'react';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import type { WorkbenchPersistenceReason } from './workbenchPersistenceScheduler.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { PistonOscillationAcquisitionPanelHandle, PistonOscillationPressStartEvent, PistonOscillationReleaseEvent } from "../pistonOscillation/PistonOscillationAcquisitionPanel.tsx";
import type { AppExperienceProfile, ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import type { WorkbenchEditScope, WorkbenchEditSnapshot } from './workbenchEditSnapshot.ts';
export interface WorkbenchPistonControllerOptions {
    activeFile: WorkbenchFileState;
    initialActiveWorkbenchFile: WorkbenchFileState | undefined;
    settingsLanguagePreference: WorkbenchLanguagePreference;
    files: {
        filesRef: React.MutableRefObject<WorkbenchFileState[]>;
        activeFileIdRef: React.MutableRefObject<string>;
        setFiles: React.Dispatch<React.SetStateAction<WorkbenchFileState[]>>;
        setWorkbenchFiles: (updater: (files: WorkbenchFileState[]) => WorkbenchFileState[]) => void;
        updateActiveFile: (updater: (file: WorkbenchFileState) => WorkbenchFileState) => void;
        updateFileById: (fileId: string, updater: (file: WorkbenchFileState) => WorkbenchFileState) => void;
        updateRuntimeFileById: (fileId: string, updater: (file: WorkbenchFileState) => WorkbenchFileState) => void;
    };
    lifecycle: {
        desktopExitQuiescedRef: React.MutableRefObject<boolean>;
        scheduleHeatCapacitySemanticSceneCheckpointRef: React.MutableRefObject<() => void>;
        scheduleWorkspacePersistenceRef: React.MutableRefObject<(reason?: WorkbenchPersistenceReason) => boolean>;
        flushWorkspacePersistenceRef: React.MutableRefObject<() => Promise<boolean>>;
    };
    history: {
        createEditSnapshot: (label: string, scope?: WorkbenchEditScope, fileId?: string) => WorkbenchEditSnapshot;
        pushUndoSnapshot: (snapshot: WorkbenchEditSnapshot) => void;
    };
    ui: {
        liveWorkspaceRef: React.RefObject<HTMLDivElement>;
        requestPromptConfirmation: (request: PromptConfirmationRequest) => void;
        setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
        setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
        setSelectedPanel: React.Dispatch<React.SetStateAction<WorkbenchPanelKey>>;
        showParameterSidebarBlockReason: (getMessage: (language: WorkbenchLanguagePreference) => string | null) => void;
    };
    tutorial: {
        activeTutorialExperiment: ExperimentLearningId | null;
        experienceProfileRef: React.MutableRefObject<AppExperienceProfile>;
    };
}
export const useWorkbenchPistonController = (options: WorkbenchPistonControllerOptions) => {
    const { activeFile, initialActiveWorkbenchFile, settingsLanguagePreference } = options;
    const {
        filesRef,
        activeFileIdRef,
        setFiles,
        setWorkbenchFiles,
        updateActiveFile,
        updateFileById,
        updateRuntimeFileById,
    } = options.files;
    const { desktopExitQuiescedRef, scheduleHeatCapacitySemanticSceneCheckpointRef, scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef } = options.lifecycle;
    const { createEditSnapshot, pushUndoSnapshot } = options.history;
    const { liveWorkspaceRef, requestPromptConfirmation, setLeftCollapsed, setParametersCollapsed, setSelectedPanel, showParameterSidebarBlockReason } = options.ui;
    const { experienceProfileRef } = options.tutorial;
    const [pistonOscillationReleaseEventsByFileId, setPistonOscillationReleaseEventsByFileId] = useState<Record<string, PistonOscillationReleaseEvent>>({});
    const [pistonOscillationPressStartEventsByFileId, setPistonOscillationPressStartEventsByFileId] = useState<Record<string, PistonOscillationPressStartEvent>>({});
    const [pistonOscillationMeasurementCyclesByFileId, setPistonOscillationMeasurementCyclesByFileId] = useState<Record<string, number>>({});
    const [pistonOscillationPowerOnByFileId, setPistonOscillationPowerOnByFileId] = useState<Record<string, boolean>>({});
    const {
        pistonOscillationGuideFeedback,
        pistonOscillationGuideCompletionToast,
        clearPistonOscillationGuideFeedbackRef,
        clearPistonOscillationGuideFeedback,
        showPistonOscillationGuideFeedback,
        clearPistonOscillationGuideCompletionToast,
        showPistonOscillationGuideCompletionToast,
    } = useWorkbenchPistonFeedback({});
    const {
        pistonOscillationGuideLessonDialog,
        setPistonOscillationGuideLessonDialog,
        pistonOscillationGuideLessonOutgoingView,
        setPistonOscillationGuideLessonOutgoingView,
        pistonOscillationGuidePreviousSessionRef,
        pistonOscillationGuideLessonShownRef,
        pistonOscillationGuideLessonCloseTimerRef,
        pistonOscillationGuideLessonTransitionTimerRef,
        pistonOscillationGuideLessonDialogRef,
        pistonOscillationGuideLessonReturnFocusRef,
        pistonOscillationDemoResumeAfterLessonRef,
    } = useWorkbenchPistonLessonState({});
    const { pistonOscillationDemoPlayback, setPistonOscillationDemoPlayback, pistonOscillationDemoPlaybackChannel } = useWorkbenchPistonDemoRuntime({
        activeFile,
        initialActiveWorkbenchFile,
        pistonOscillationGuideLessonDialog,
        setWorkbenchFiles: (...args) => setWorkbenchFiles(...args),
        activeFileIdRef,
        setLeftCollapsed,
        flushWorkspacePersistenceRef,
    });
    const {
        setPistonOscillationFreeSetupRequestedFileId,
        pistonOscillationCalculationReviewOpen,
        setPistonOscillationCalculationReviewOpen,
        pistonOscillationDataProcessingReviewOpen,
        setPistonOscillationDataProcessingReviewOpen,
        pistonOscillationProcessReviewOpen,
        setPistonOscillationProcessReviewOpen,
        setPistonOscillationProcessingSuppressedFileId,
        setPistonOscillationCalculationSuppressedFileId,
        activePistonOscillationDemoPlaybackPhase,
        activePistonOscillationGuideSession,
        activePistonOscillationFreeSession,
        activePistonOscillationFreeSelected,
        pistonOscillationFreeSetupOpen,
        pistonOscillationCompletedDataProcessingReview,
        activePistonOscillationDataProcessing,
        activePistonOscillationProcessReview,
        activePistonOscillationExpandedRealtime,
        activePistonOscillationCalculationSession,
        pistonOscillationCalculationWindowOpen,
        activePistonOscillationGuideSelected,
        activePistonOscillationParameterMode,
        activePistonOscillationParameterSidebarAvailable,
        activePistonOscillationPowerOn,
        cancelPistonOscillationFreeSetup,
        requestPistonOscillationFreeSetup,
        clearPistonOscillationReviewWindows,
    } = useWorkbenchPistonProcessingView({ activeFile, pistonOscillationDemoPlayback, pistonOscillationPowerOnByFileId });
    const { activePistonOscillationEffectiveConfig, activePistonOscillationPhysicsConfig, activePistonOscillationThermalConfig, activePistonOscillationReleaseAsymmetryConfig, activePistonOscillationParameterSignature, pistonOscillationLivePressureChannel } = useWorkbenchPistonChannels({ activeFile });
    const pistonOscillationAcquisitionPanelRef = useRef<PistonOscillationAcquisitionPanelHandle | null>(null);
    const pistonOscillationContentRenderRecoveryHostRef = useRef<HTMLDivElement | null>(null);
    const {
        pistonOscillationGuidePulseElapsedMs,
        setPistonOscillationGuidePulseElapsedMs,
        setPistonOscillationGuideStrongReminderClockContext,
        pistonOscillationGuideStrongMaskLayout,
        pistonOscillationGuidePistonStable,
        pistonOscillationGuideResetFeedback,
        setPistonOscillationGuideResetFeedback,
        pistonOscillationGuideResetFeedbackTimerRef,
        pistonOscillationGuideStrongReminderTimerRef,
        pistonOscillationGuidePressureRangeLessonTimerRef,
        pistonOscillationGuidePressureIssueRef,
        pistonOscillationGuidePressureMissCountRef,
        pistonOscillationGuideStrongTargetContextRef,
        pistonOscillationGuideResumeStrongReminderAfterLessonRef,
        setPistonOscillationGuidePressureIssue,
        setPistonOscillationGuideStrongReminderActive,
        activePistonOscillationGuideTimeFrozen,
        activePistonOscillationGuideInstrumentRestoreState,
        activePistonOscillationGuideSnapTargetHeightMm,
        pistonOscillationCopy,
        pistonGuidePulseActive,
        pistonGuideVisualCue,
        pistonGuideScrewInteractionMode,
        pistonGuideAcquisitionCue,
        pistonGuideRequestedFocusMode,
        pistonGuideExpectedStrongTargetId,
        pistonGuideStrongTargetContext,
        pistonOscillationGuideStrongReminderActive,
        pistonGuideStrongTargetId,
        pistonGuideStrongReminderText,
        applyPistonOscillationGuideEvents,
        handlePistonOscillationPowerToggle,
        handlePistonOscillationGuideActionAttempt,
        handlePistonOscillationGuideScrewDirectionFeedback,
        handlePistonOscillationGuideHeightConfirmed,
        handlePistonOscillationGuideSupportLoss,
        handlePistonOscillationGuideHeightResetComplete,
        handlePistonOscillationGuideInstrumentSnapshot,
        changePistonOscillationPeriodSelectionMode,
    } = useWorkbenchPistonGuideRuntime({
        clearPistonOscillationGuideFeedbackRef,
        activePistonOscillationGuideSession,
        activePistonOscillationFreeSelected,
        activePistonOscillationEffectiveConfig,
        activePistonOscillationFreeSession,
        clearPistonOscillationGuideFeedback: (...args) => clearPistonOscillationGuideFeedback(...args),
        setPistonOscillationCalculationSuppressedFileId,
        activeFile,
        showPistonOscillationGuideFeedback: (...args) => showPistonOscillationGuideFeedback(...args),
        settingsLanguagePreference,
        pistonOscillationGuideLessonDialog,
        liveWorkspaceRef,
        activeFileIdRef,
        filesRef,
        pistonOscillationDemoPlayback,
        updateFileById: (...args) => updateFileById(...args),
        setPistonOscillationPowerOnByFileId,
        updateActiveFile: (...args) => updateActiveFile(...args),
        openPistonOscillationGuideOneTimeLesson: (...args) => openPistonOscillationGuideOneTimeLesson(...args),
    });
    const {
        activatePistonOscillationFreeMode,
        pausePistonOscillationFreeMode,
        deletePistonOscillationFreeMeasurement,
        requestPistonOscillationFreeReset,
        handlePistonOscillationFreeInstrumentSnapshot,
        activatePistonOscillationTutorialMode,
        clearPistonOscillationTutorialPlayback,
    } = createWorkbenchPistonFreeActions({
        desktopExitQuiescedRef,
        activeFileIdRef,
        filesRef,
        clearPistonOscillationGuideCompletionToast: (...args) => clearPistonOscillationGuideCompletionToast(...args),
        setFiles,
        scheduleWorkspacePersistenceRef,
        flushWorkspacePersistenceRef,
        pistonOscillationDemoPlaybackChannel,
        setPistonOscillationDemoPlayback,
        setPistonOscillationPowerOnByFileId,
        setPistonOscillationMeasurementCyclesByFileId,
        setPistonOscillationFreeSetupRequestedFileId,
        setLeftCollapsed,
        setParametersCollapsed,
        pistonOscillationAcquisitionPanelRef,
        updateFileById: (...args) => updateFileById(...args),
        settingsLanguagePreference,
        requestPromptConfirmation: (...args) => requestPromptConfirmation(...args),
        pushUndoSnapshot: (...args) => pushUndoSnapshot(...args),
        createEditSnapshot: (...args) => createEditSnapshot(...args),
        pistonOscillationLivePressureChannel,
        updateRuntimeFileById: (...args) => updateRuntimeFileById(...args),
        experienceProfileRef,
    });
    const { closePistonOscillationGuideLessonDialog, openPistonOscillationGuideLessonIntro, openPistonOscillationGuideOneTimeLesson, getPistonOscillationGuideLessonView, advancePistonOscillationGuideLessonDialog, handlePistonOscillationGuideLessonDialogKeyDown } = useWorkbenchPistonLessons({
        activeFile,
        setPistonOscillationGuideLessonDialog,
        setPistonOscillationGuideLessonOutgoingView,
        updateFileById: (...args) => updateFileById(...args),
        pistonOscillationGuideLessonDialog,
        pistonOscillationGuideLessonTransitionTimerRef,
        pistonOscillationGuideLessonCloseTimerRef,
        pistonOscillationDemoResumeAfterLessonRef,
        filesRef,
        pistonOscillationDemoPlaybackChannel,
        setPistonOscillationDemoPlayback,
        flushWorkspacePersistenceRef,
        applyPistonOscillationGuideEvents: (...args) => applyPistonOscillationGuideEvents(...args),
        pistonOscillationGuideResumeStrongReminderAfterLessonRef,
        setPistonOscillationGuideStrongReminderActive: (...args) => setPistonOscillationGuideStrongReminderActive(...args),
        pistonOscillationGuideStrongTargetContextRef,
        activeFileIdRef,
        setLeftCollapsed,
        showPistonOscillationGuideCompletionToast: (...args) => showPistonOscillationGuideCompletionToast(...args),
        pistonOscillationCopy,
        pistonOscillationGuideLessonShownRef,
        clearPistonOscillationGuideFeedback: (...args) => clearPistonOscillationGuideFeedback(...args),
        setPistonOscillationGuidePulseElapsedMs,
        activePistonOscillationGuideSession,
        pistonOscillationGuideLessonDialogRef,
        pistonOscillationGuideLessonReturnFocusRef,
        pistonOscillationGuidePreviousSessionRef,
    });
    const {
        handlePistonOscillationGuideAcquisitionEvent,
        handlePistonOscillationProcessingEvent,
        handlePistonOscillationFreeUnusableMeasurement,
        completeAndExitPistonOscillationCalculation,
        closePistonOscillationCalculationReview,
        openPistonOscillationDataProcessingReview,
        openPistonOscillationCalculationReview,
        closePistonOscillationDataProcessingReview,
        openPistonOscillationProcessReview,
        closePistonOscillationProcessReview,
        returnToPistonOscillationInstrumentAfterDisplayError,
        handlePistonOscillationGuideProcessingInteractionStart,
        handlePistonOscillationGuideInvalidPeriodSelection,
    } = createWorkbenchPistonAcquisitionProcessingActions({
        desktopExitQuiescedRef,
        filesRef,
        scheduleHeatCapacitySemanticSceneCheckpointRef,
        scheduleWorkspacePersistenceRef,
        setFiles,
        activeFileIdRef,
        setPistonOscillationGuideStrongReminderActive: (...args) => setPistonOscillationGuideStrongReminderActive(...args),
        setPistonOscillationGuideStrongReminderClockContext,
        setPistonOscillationGuidePressureIssue: (...args) => setPistonOscillationGuidePressureIssue(...args),
        setPistonOscillationGuidePulseElapsedMs,
        showPistonOscillationGuideFeedback: (...args) => showPistonOscillationGuideFeedback(...args),
        pistonOscillationCopy,
        pistonOscillationGuidePressureMissCountRef,
        pistonOscillationGuidePressureRangeLessonTimerRef,
        pistonOscillationGuidePressureIssueRef,
        openPistonOscillationGuideOneTimeLesson: (...args) => openPistonOscillationGuideOneTimeLesson(...args),
        pistonOscillationGuideStrongReminderTimerRef,
        pistonOscillationGuideStrongTargetContextRef,
        clearPistonOscillationGuideFeedback: (...args) => clearPistonOscillationGuideFeedback(...args),
        applyPistonOscillationGuideEvents: (...args) => applyPistonOscillationGuideEvents(...args),
        updateFileById: (...args) => updateFileById(...args),
        pistonOscillationLivePressureChannel,
        setPistonOscillationMeasurementCyclesByFileId,
        setPistonOscillationGuideLessonOutgoingView,
        setPistonOscillationGuideLessonDialog,
        updateActiveFile: (...args) => updateActiveFile(...args),
        setPistonOscillationCalculationReviewOpen,
        setPistonOscillationDataProcessingReviewOpen,
        setSelectedPanel,
        setLeftCollapsed,
        flushWorkspacePersistenceRef,
        activePistonOscillationCalculationSession,
        activeFile,
        setPistonOscillationProcessReviewOpen,
        setPistonOscillationCalculationSuppressedFileId,
        setPistonOscillationProcessingSuppressedFileId,
        activePistonOscillationFreeSelected,
    });
    const {
        togglePistonOscillationOperationVisualization,
        setPistonOscillationOperationVisualization,
        updatePistonOscillationFreeParameterDraft,
        setPistonOscillationFreeExperimentScheme,
        setPistonOscillationFreeGasType,
        restorePistonOscillationFreeParameters,
        acknowledgePistonOscillationAdvancedParametersRisk,
        showPistonOscillationParameterLockHint,
    } = createWorkbenchPistonParameterActions({ activeFile, updateActiveFile: (...args) => updateActiveFile(...args), showParameterSidebarBlockReason: (...args) => showParameterSidebarBlockReason(...args) });
    const { pistonOscillationGuideChecklistViewedIndex, pistonOscillationGuideChecklistTrackRef, pistonOscillationGuideChecklistVisualOffsetRef, handlePistonOscillationGuideChecklistWheel, handlePistonOscillationGuideChecklistKeyDown } = useWorkbenchPistonChecklist({ activePistonOscillationGuideSelected, activeFile, activePistonOscillationGuideSession });
    const pistonModeControl = activeFile.kind === 'heatCapacityPistonOscillation'
        ? createWorkbenchPistonModeActions({
        activeFile,
        desktopExitQuiescedRef,
        filesRef,
        setFiles,
        scheduleWorkspacePersistenceRef,
        flushWorkspacePersistenceRef,
        pistonOscillationDemoPlaybackChannel,
        pistonOscillationDemoPlayback,
        setPistonOscillationDemoPlayback,
        requestPromptConfirmation,
        workbenchPromptCopy: workbenchPromptCopies[settingsLanguagePreference],
        pistonOscillationCopy,
        pistonOscillationCalculationWindowOpen,
        clearPistonOscillationGuideCompletionToast,
        setPistonOscillationPowerOnByFileId,
        setLeftCollapsed,
        setParametersCollapsed,
        pistonOscillationGuideResetFeedbackTimerRef,
        setPistonOscillationGuideResetFeedback,
        setPistonOscillationFreeSetupRequestedFileId,
        activatePistonOscillationFreeMode,
        pausePistonOscillationFreeMode,
    })
        : null;
    const {
        handlePistonOscillationReleaseEvent,
        handlePistonOscillationPressStartEvent,
        handlePistonOscillationFreeOperationObserved,
        editPistonOscillationGuideParameter,
        commitPistonOscillationGuideParameter,
        commitPistonOscillationFreeAcquisitionSetting,
        changePistonOscillationFreeCandidate,
        startPistonOscillationFreeAcquisition,
        savePistonOscillationFreeMeasurement,
        retainPistonOscillationRun,
    } = createWorkbenchPistonViewActions({ activeFile, updateActiveFile, setPistonOscillationReleaseEventsByFileId, setPistonOscillationPressStartEventsByFileId, setPistonOscillationMeasurementCyclesByFileId });
    return {
        view: {
        pistonModeControl,
        pistonOscillationReleaseEventsByFileId,
        pistonOscillationPressStartEventsByFileId,
        pistonOscillationMeasurementCyclesByFileId,
        pistonOscillationGuidePulseElapsedMs,
        pistonOscillationGuideFeedback,
        pistonOscillationGuideLessonDialog,
        pistonOscillationGuideLessonOutgoingView,
        pistonOscillationGuideCompletionToast,
        pistonOscillationGuideStrongMaskLayout,
        pistonOscillationGuidePistonStable,
        pistonOscillationGuideResetFeedback,
        pistonOscillationGuideChecklistViewedIndex,
        pistonOscillationDemoPlayback,
        pistonOscillationCalculationReviewOpen,
        pistonOscillationDataProcessingReviewOpen,
        pistonOscillationProcessReviewOpen,
        activePistonOscillationEffectiveConfig,
        activePistonOscillationPhysicsConfig,
        activePistonOscillationThermalConfig,
        activePistonOscillationReleaseAsymmetryConfig,
        activePistonOscillationParameterSignature,
        activePistonOscillationDemoPlaybackPhase,
        activePistonOscillationGuideSession,
        activePistonOscillationFreeSession,
        activePistonOscillationFreeSelected,
        pistonOscillationFreeSetupOpen,
        pistonOscillationCompletedDataProcessingReview,
        activePistonOscillationDataProcessing,
        activePistonOscillationProcessReview,
        activePistonOscillationExpandedRealtime,
        pistonOscillationCalculationWindowOpen,
        activePistonOscillationGuideSelected,
        activePistonOscillationParameterMode,
        activePistonOscillationParameterSidebarAvailable,
        activePistonOscillationPowerOn,
        activePistonOscillationGuideTimeFrozen,
        activePistonOscillationGuideInstrumentRestoreState,
        activePistonOscillationGuideSnapTargetHeightMm,
        pistonOscillationCopy,
        pistonGuidePulseActive,
        pistonGuideVisualCue,
        pistonGuideScrewInteractionMode,
        pistonGuideAcquisitionCue,
        pistonGuideRequestedFocusMode,
        pistonGuideExpectedStrongTargetId,
        pistonGuideStrongTargetContext,
        pistonOscillationGuideStrongReminderActive,
        pistonGuideStrongTargetId,
        pistonGuideStrongReminderText,
        getPistonOscillationGuideLessonView,
    },
        bindings: {
        pistonOscillationGuideLessonDialogRef,
        pistonOscillationGuideChecklistTrackRef,
        pistonOscillationGuideChecklistVisualOffsetRef,
        pistonOscillationDemoPlaybackChannel,
        pistonOscillationLivePressureChannel,
        pistonOscillationAcquisitionPanelRef,
        pistonOscillationContentRenderRecoveryHostRef,
    },
        commands: {
        restorePistonOscillationFreeParameters,
        cancelPistonOscillationFreeSetup,
        requestPistonOscillationFreeSetup,
        changePistonOscillationPeriodSelectionMode,
        clearPistonOscillationTutorialPlayback,
        clearPistonOscillationReviewWindows,
        handlePistonOscillationReleaseEvent,
        handlePistonOscillationPressStartEvent,
        handlePistonOscillationFreeOperationObserved,
        editPistonOscillationGuideParameter,
        commitPistonOscillationGuideParameter,
        commitPistonOscillationFreeAcquisitionSetting,
        changePistonOscillationFreeCandidate,
        startPistonOscillationFreeAcquisition,
        savePistonOscillationFreeMeasurement,
        retainPistonOscillationRun,
        handlePistonOscillationPowerToggle,
        activatePistonOscillationFreeMode,
        deletePistonOscillationFreeMeasurement,
        requestPistonOscillationFreeReset,
        handlePistonOscillationFreeInstrumentSnapshot,
        handlePistonOscillationGuideActionAttempt,
        handlePistonOscillationGuideScrewDirectionFeedback,
        handlePistonOscillationGuideHeightConfirmed,
        handlePistonOscillationGuideSupportLoss,
        handlePistonOscillationGuideHeightResetComplete,
        closePistonOscillationGuideLessonDialog,
        openPistonOscillationGuideLessonIntro,
        advancePistonOscillationGuideLessonDialog,
        handlePistonOscillationGuideLessonDialogKeyDown,
        handlePistonOscillationGuideInstrumentSnapshot,
        handlePistonOscillationGuideAcquisitionEvent,
        handlePistonOscillationProcessingEvent,
        handlePistonOscillationFreeUnusableMeasurement,
        completeAndExitPistonOscillationCalculation,
        closePistonOscillationCalculationReview,
        openPistonOscillationDataProcessingReview,
        openPistonOscillationCalculationReview,
        closePistonOscillationDataProcessingReview,
        openPistonOscillationProcessReview,
        closePistonOscillationProcessReview,
        returnToPistonOscillationInstrumentAfterDisplayError,
        handlePistonOscillationGuideProcessingInteractionStart,
        handlePistonOscillationGuideInvalidPeriodSelection,
        togglePistonOscillationOperationVisualization,
        setPistonOscillationOperationVisualization,
        updatePistonOscillationFreeParameterDraft,
        setPistonOscillationFreeExperimentScheme,
        setPistonOscillationFreeGasType,
        acknowledgePistonOscillationAdvancedParametersRisk,
        showPistonOscillationParameterLockHint,
        handlePistonOscillationGuideChecklistWheel,
        handlePistonOscillationGuideChecklistKeyDown,
        activatePistonOscillationTutorialMode,
    },
    };
};
