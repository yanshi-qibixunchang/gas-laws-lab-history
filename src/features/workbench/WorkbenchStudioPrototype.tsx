import { useWorkbenchHeatInitialDemoEffects, useWorkbenchHeatPresentationEffects, useWorkbenchHeatFreeWorkspaceEffects, useWorkbenchHeatParameterProjectionEffects, useWorkbenchHeatParameterHelpEffects, useWorkbenchHeatRealtimeEffects, useWorkbenchHeatTeachingEffects, useWorkbenchHeatRestoreEffects, useWorkbenchHeatRecoveryEffects } from './useWorkbenchHeatEffectPhases.ts';
import { useWorkbenchRefreshPresentationRestore } from './useWorkbenchRefreshPresentationRestore';
import { useWorkbenchTeachingPanelProjection } from './useWorkbenchTeachingPanelProjection';
import { WorkbenchLearningExperienceOverlays } from './WorkbenchLearningExperienceOverlays';
import { WorkbenchPreviewFrame } from './WorkbenchPreviewFrame.tsx';
import { WorkbenchTutorialPrompts } from './WorkbenchTutorialPrompts';
import { createWorkbenchTutorialPromptActions } from './workbenchTutorialPromptActions.ts';
import { WorkbenchSimulationPreview } from './WorkbenchSimulationPreview.tsx';
import { WorkbenchSimulationMetrics } from './WorkbenchSimulationMetrics.tsx';
import { createWorkbenchSimulationPreviewNotification } from './workbenchSimulationPreviewNotifications.ts';
import { deriveWorkbenchTutorialPromptModel } from './workbenchTutorialPromptModel.ts';
import { deriveWorkbenchHeatPreviewGuideMask } from './workbenchHeatPreviewGuideMask.ts';
import { WorkbenchHeatCapacityTooltipPopover } from './WorkbenchHeatCapacityTooltipPopover.tsx';
import { WorkbenchHeatCapacityTooltipAnchor } from './WorkbenchHeatCapacityTooltipAnchor.tsx';
import { useWorkbenchFilesRefProjection, useWorkbenchActiveFileProjection } from './useWorkbenchFileCollectionProjection.ts';
import { useWorkbenchRuntimeResourceCleanup } from './useWorkbenchRuntimeResourceCleanup.ts';
import { createWorkbenchDesktopExitQuiescence } from './workbenchDesktopExitQuiescence.ts';
import { WorkbenchHeatCapacityPreview } from './WorkbenchHeatCapacityPreview.tsx';
import { createWorkbenchDesktopNavigationActions } from './workbenchDesktopNavigationActions.ts';
import { createWorkbenchEditRestoreCleanup } from './workbenchEditRestoreCleanup.ts';
import { useWorkbenchSemanticCheckpointCleanup } from './useWorkbenchSemanticCheckpointCleanup.ts';
import { useWorkbenchDesktopExitInputBlock } from './useWorkbenchDesktopExitInputBlock.ts';
import { useWorkbenchLifecyclePersistence } from './useWorkbenchLifecyclePersistence.ts';
import { useWorkbenchHeatCapacityController } from './useWorkbenchHeatCapacityController.ts';
import { useWorkbenchWorkspacePersistence } from './useWorkbenchWorkspacePersistence.ts';
import { useWorkbenchDesktopExitState } from './useWorkbenchDesktopExitState.ts';
import { useWorkbenchWorkspacePersistenceResources } from './useWorkbenchWorkspacePersistenceResources.ts';
import { useWorkbenchHardSphereRuntimeResources } from './useWorkbenchHardSphereRuntimeResources.ts';
import { useWorkbenchWorkspaceCollectionState } from './useWorkbenchWorkspaceCollectionState.ts';
import { WorkbenchHeatCapacityInstrumentView } from './WorkbenchHeatCapacityInstrumentView.tsx';
import { HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS } from './workbenchTeachingUiTiming.ts';
import { createWorkbenchRefreshPresentationCapture } from './workbenchRefreshPresentationCapture.ts';
import { WorkbenchHeatCapacityExperimentProgress } from './WorkbenchHeatCapacityExperimentProgress.tsx';
import { selectWorkbenchParameterInteractionPresentation } from './workbenchParameterInteractionPresentation.ts';
import { createWorkbenchParameterValidationActions } from './workbenchParameterValidationActions.ts';

import { deriveWorkbenchHeatSceneRestoreView } from './workbenchHeatSceneRestoreView.ts';

import { deriveWorkbenchHeatSceneVisuals } from './workbenchHeatSceneVisuals.ts';

import { deriveWorkbenchHeatSceneReadings } from './workbenchHeatSceneReadings.ts';

import { useWorkbenchParameterSidebarAvailability } from './useWorkbenchParameterSidebarAvailability.ts';
import { createWorkbenchParameterSidebarActions } from './workbenchParameterSidebarActions.ts';

import { useWorkbenchTutorialProgress } from './useWorkbenchTutorialProgress.ts';

import { createWorkbenchConsoleActions } from './workbenchConsoleState.ts';
import { useWorkbenchEditHistoryState } from './useWorkbenchEditHistoryState.ts';
import { useWorkbenchExperimentParameterActions } from './useWorkbenchExperimentParameterActions.ts';
import { useWorkbenchFileActions } from './useWorkbenchFileActions.ts';
import { createWorkbenchTutorialHandoffActions } from './workbenchTutorialHandoffActions.ts';

import { deriveWorkbenchHeatPreviewPhysics } from './workbenchHeatPreviewPhysics.ts';

import { deriveWorkbenchHeatPreviewWait } from './workbenchHeatPreviewWait.ts';
import { useWorkbenchConsoleState } from './useWorkbenchConsoleState.ts';
import { useWorkbenchParameterInteractionState } from './useWorkbenchParameterInteractionState.ts';
import { useWorkbenchFileTreeState } from './useWorkbenchFileTreeState.ts';
import { useWorkbenchLayoutState } from './useWorkbenchLayoutState.ts';
import { deriveWorkbenchHeatPreviewRecords } from './workbenchHeatPreviewRecords.ts';

import { createWorkbenchTutorialWorkspaceActions } from './workbenchTutorialWorkspaceActions.ts';
import { createWorkbenchTutorialActivationActions } from './workbenchTutorialActivationActions.ts';
import { EXPERIMENT_TUTORIAL_INSTANCE_ID } from './workbenchTutorialIdentity.ts';

import { useWorkbenchConsoleProjection } from './useWorkbenchConsoleProjection.ts';
import { selectWorkbenchLayoutPresentation } from './workbenchLayoutPresentation.ts';
import { useWorkbenchSidebarRefreshPersistence } from './useWorkbenchSidebarRefreshPersistence.ts';
import { useWorkbenchConsoleScroll } from './useWorkbenchConsoleScroll.ts';
import { useWorkbenchFileTreeSelectionProjection, useWorkbenchRenameRefProjection } from './useWorkbenchFileTreeProjection.ts';
import { useWorkbenchIdealInputEffects } from './useWorkbenchIdealInputEffects.ts';
import { useWorkbenchSamplingPresetDismiss } from './useWorkbenchSamplingPresetDismiss.ts';
import { useWorkbenchEditKeyboard } from './useWorkbenchEditKeyboard.ts';

import { useWorkbenchTutorialLifecycle } from './useWorkbenchTutorialLifecycle.ts';

import { createWorkbenchTutorialOverlayActions } from './workbenchTutorialOverlayActions.ts';

import { createWorkbenchTutorialProfileActions } from './workbenchTutorialProfileActions.ts';
import { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
import { buildNoticeLegalMaterialFiles } from './workbenchBuildNoticeContent.ts';
import { useWorkbenchExportEnvironment } from './useWorkbenchExportEnvironment.ts';
import { useWorkbenchExportController } from './useWorkbenchExportController.ts';
import { createWorkbenchHardSphereRuntimeRegistry, snapshotParticles } from './workbenchHardSphereRuntimeRegistry.ts';
import { createWorkbenchHardSphereFrameLoop } from './workbenchHardSphereFrameLoop.ts';
import { createWorkbenchExperimentRunActions } from './workbenchExperimentRunActions.ts';
import { useWorkbenchHardSphereRuntimeInitialization } from './useWorkbenchHardSphereRuntimeInitialization.ts';
import { useWorkbenchAuxiliaryWindows } from './useWorkbenchAuxiliaryWindows.ts';
import { WorkbenchMenuBar } from './WorkbenchMenuBar.tsx';
import { WorkbenchPanelContent } from './WorkbenchPanelContent.tsx';
import { WorkbenchRealtimeBoundary } from './WorkbenchRealtimeBoundary.tsx';
import { WorkbenchCurrentParameters } from './WorkbenchCurrentParameters.tsx';
import { WorkbenchCenterWorkspace } from './WorkbenchCenterWorkspace.tsx';
import { WorkbenchFileSidebar } from './WorkbenchFileSidebar.tsx';
import { WorkbenchHeatCapacityModeControl } from './WorkbenchHeatCapacityModeControl.tsx';
import { useWorkbenchUpdaterController } from './useWorkbenchUpdaterController.ts';
import { WorkbenchPistonOscillationPreview } from './WorkbenchPistonOscillationPreview.tsx';
import { WorkbenchPistonOscillationRealtime } from './WorkbenchPistonOscillationRealtime.tsx';
import { WorkbenchHeatCapacityDemoSteps } from './WorkbenchHeatCapacityDemoSteps.tsx';
import { WorkbenchHeatCapacityGuideSteps } from './WorkbenchHeatCapacityGuideSteps.tsx';
import { WorkbenchHeatCapacityWaitOverlay } from './WorkbenchHeatCapacityWaitOverlay.tsx';
import { WorkbenchHeatCapacityRecordControls } from './WorkbenchHeatCapacityRecordControls.tsx';
import { WorkbenchHeatCapacityCenterFeedback } from './WorkbenchHeatCapacityCenterFeedback.tsx';
import { WorkbenchHeatCapacityPreheatLock } from './WorkbenchHeatCapacityPreheatLock.tsx';
import { WorkbenchHeatCapacityStrongMask } from './WorkbenchHeatCapacityStrongMask.tsx';
import { WorkbenchHeatCapacityGuideMask } from './WorkbenchHeatCapacityGuideMask.tsx';
import { WorkbenchHeatCapacityGuideLesson } from './WorkbenchHeatCapacityGuideLesson.tsx';
import { WorkbenchPistonOscillationModeControl } from './WorkbenchPistonOscillationModeControl.tsx';
import { WorkbenchPistonOscillationGuideSteps } from './WorkbenchPistonOscillationGuideSteps.tsx';
import { WorkbenchPistonOscillationGuideLesson } from './WorkbenchPistonOscillationGuideLesson.tsx';
import { WorkbenchHeatCapacityRealtimeReadings } from './WorkbenchHeatCapacityRealtimeReadings.tsx';
import { WorkbenchStandardResultsWindow } from './WorkbenchStandardResultsWindow.tsx';
import { WorkbenchFileTree } from './WorkbenchFileTree.tsx';
import { WorkbenchPanelNavigation } from './WorkbenchPanelNavigation.tsx';
import { WorkbenchFileTabs } from './WorkbenchFileTabs.tsx';
import { useWorkbenchSettingsPreferences } from './useWorkbenchSettingsPreferences.ts';
import { WorkbenchParameterSymbol } from './WorkbenchParameterSymbol.tsx';
import { WorkbenchSimulationParameterHelp } from './WorkbenchSimulationParameterHelp.tsx';
import { WorkbenchSimulationParameterRow } from './WorkbenchSimulationParameterRow.tsx';
import { WorkbenchHeatCapacityParameterHelp } from './WorkbenchHeatCapacityParameterHelp.tsx';
import { WorkbenchHeatCapacityParameterLabel } from './WorkbenchHeatCapacityParameterLabel.tsx';
import { WorkbenchHeatCapacityNumberParameterRow } from './WorkbenchHeatCapacityNumberParameterRow.tsx';
import { WorkbenchHeatCapacityCheckboxParameterRow } from './WorkbenchHeatCapacityCheckboxParameterRow.tsx';
import { WorkbenchHeatCapacityGasParameterRow } from './WorkbenchHeatCapacityGasParameterRow.tsx';
import { WorkbenchHeatCapacityBasicParameters } from './WorkbenchHeatCapacityBasicParameters.tsx';
import { WorkbenchHeatCapacityParameters } from './WorkbenchHeatCapacityParameters.tsx';
import { WorkbenchHeatCapacityAdvancedParameters } from './WorkbenchHeatCapacityAdvancedParameters.tsx';
import { WorkbenchIdealControls } from './WorkbenchIdealControls.tsx';
import { createWorkbenchLayoutActions } from './workbenchLayoutActions.ts';
import { createWorkbenchParameterScrollActions, useWorkbenchParameterScroll } from './useWorkbenchParameterScroll.ts';

import { useWorkbenchPersistenceProjection } from './useWorkbenchPersistenceProjection.ts';

import { useWorkbenchWorkspacePersistenceScheduler } from './useWorkbenchWorkspacePersistenceScheduler.ts';

import { WorkbenchHeatCapacityPanelTree } from './WorkbenchHeatCapacityPanelTree.tsx';
import { WorkbenchPistonOscillationPanelTree } from './WorkbenchPistonOscillationPanelTree.tsx';
import { createWorkbenchFileCollectionActions } from './workbenchFileCollectionActions.ts';
import { useWorkbenchPistonController } from './useWorkbenchPistonController.ts';

import { useWorkbenchFileMenuInteractions, useWorkbenchRenameFocus } from './useWorkbenchFileMenuInteractions.ts';
import { WorkbenchConsole } from './WorkbenchConsole.tsx';
import { WorkbenchStatusBar } from './WorkbenchStatusBar.tsx';

import { WorkbenchDockHeader } from './WorkbenchDockHeader.tsx';
import { WorkbenchDockPanel } from './WorkbenchDockPanel.tsx';
import { WorkbenchIdealResultsRegion } from './WorkbenchIdealResultsRegion.tsx';
import { WorkbenchHeatCapacityMaterialsWindow } from './WorkbenchHeatCapacityMaterialsWindow.tsx';
import { WorkbenchSectionTitle } from './WorkbenchSectionTitle.tsx';
import { useWorkbenchInitialWorkspace } from './useWorkbenchInitialWorkspace.ts';

import { createWorkbenchWindowActions } from './workbenchWindowActions.ts';

import { createExperimentTutorialLogs, EXPERIMENT_TUTORIAL_COPY } from './workbenchExperimentTutorialPresentation.ts';
import { hasDesktopUpdaterBridge, hasDesktopLegalReadBridge, hasDesktopLegalBridge, isExportEnvironmentAvailableStatus, getFreshWorkbenchWindowUrl, getAboutEnvironmentStatusLabel } from './workbenchDesktopCapabilities.ts';

import { type WorkbenchParameterSymbolPart } from './workbenchParameterPresentation.ts';
import { createStandardPanels, createIdealPanels, createHeatCapacityPanels, createPistonOscillationPanels, createResultsSections, type PanelDefinition, getLocalizedWorkbenchPanelTitle } from './workbenchPanelDefinitions.tsx';

import { LOCKED_PANEL_KEYS } from './workbenchPanelAvailability.ts';
import { getLocalizedWorkbenchEditLabel } from './workbenchEditLabelLocalization.ts';

import React, { useMemo } from 'react';

import { createPortal } from 'react-dom';

import { translations } from '../../i18n/translations';

import { PromptConfirmDialog, usePromptConfirmation } from '../../components/prompts/PromptConfirmDialog.tsx';

import { PromptToastRegion, type PromptToastMessage } from '../../components/prompts/PromptFeedback.tsx';

import { PROMPT_FEEDBACK_COPY } from '../../components/prompts/promptFeedbackCopy.ts';

import { selectHeatCapacityFreeGasType } from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { getWorkbenchParameterRows, type WorkbenchParameterRow } from './workbenchParameterState.ts';

import { createDefaultStandardFile, type WorkbenchIdealResultWindowKey } from './workbenchFileState.ts';

import { normalizeHeatCapacityCameraTransitionState } from '../heatCapacity/HeatCapacityInstrumentScene';
import { normalizeHeatCapacityHardSphereVisualCheckpoint } from '../heatCapacity/HeatCapacityHardSphereLayer.tsx';
import { normalizeHeatCapacityUltraVisualState } from '../heatCapacity/HeatCapacityUltraInstrumentModel.tsx';

import HeatCapacityBatchSetupDialog from '../heatCapacity/HeatCapacityBatchSetupDialog.tsx';

import HeatCapacityCalculationWindow from '../heatCapacity/HeatCapacityCalculationWindow.tsx';

import HeatCapacityReportExportDialog from '../heatCapacity/HeatCapacityReportExportDialog.tsx';

import { heatCapacityFreeGasTypeOptions, heatCapacityFreeSharedText, type HeatCapacityFreeCheckboxDefinition, type HeatCapacityFreeNumberParameterDefinition, type HeatCapacityFreeParameterSymbolPart } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';

import { type HeatCapacityFreeParameterDraft } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

import { createWorkbenchFigureSpecs, createWorkbenchResultSummary } from './workbenchResults';

import { createWorkbenchEditHistoryActions } from './workbenchEditHistoryActions.ts';

import { isIdealResultWindowKey, normalizeStandardResultsLayout } from './workbenchLayoutCompatibility.ts';

import { getIdealGasAnalysis, type IdealGasAnalysis } from '../../domain/idealGas/idealGasExperiment';

import { loadWorkbenchGeneralSettings, type WorkbenchGeneralSettings } from './workbenchGeneralSettings.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import { workbenchPromptCopies } from './workbenchPromptCopies.ts';

import { useAudioEngine } from '../../audio/react/useAudioEngine.ts';

import { getAboutUpdateStatusLabel } from './workbenchDesktopUpdater.ts';
import { WorkbenchUpdateDialog } from './WorkbenchUpdateDialog.tsx';

import { WorkbenchGeneralSettingsWindow } from './WorkbenchGeneralSettingsWindow.tsx';
import { WorkbenchAboutWindow } from './WorkbenchAboutWindow.tsx';

import { WorkbenchSimulationRealtimePanel } from './WorkbenchSimulationRealtimePanel.tsx';

import { PistonOscillationCalculationWindow, PistonOscillationFreeSetupDialog } from '../pistonOscillation/index.ts';

import { getPistonOscillationParameterSidebarFreeOnlyMessage } from '../pistonOscillation/PistonOscillationParameterPanel.tsx';
import { type WorkbenchTopMenuResultChild } from './WorkbenchTopCommands.tsx';
import { WorkbenchHeatCapacityIdealProfileIntroDialog, WorkbenchHeatCapacityRestoreDefaultDialog } from './WorkbenchHeatCapacityParameterDialogs.tsx';
import { WorkbenchBuildNoticeWindow } from './WorkbenchBuildNoticeWindow.tsx';

import { buildNoticeSections } from './workbenchBuildNoticeContent.ts';
import { getWorkbenchSessionCacheSummary } from './workbenchFilePresentation.ts';

import { isHeatCapacityPanelKey } from './workbenchHeatCapacityTabRegistry.ts';

import { persistAppExperienceProfile } from '../learning/experimentLearningStore.ts';

import { firstRunCopies } from '../onboarding/firstRunCopy.ts';
import { useReducedMotionPreference } from '../onboarding/useReducedMotionPreference.ts';

import { RecoverableRenderErrorBoundary } from '../../components/errors/RecoverableRenderErrorBoundary.tsx';
import { WORKBENCH_WINDOW_CONTROL_COPY } from './WorkbenchWindowControls.tsx';
import { WorkbenchContentRenderErrorFallback } from './WorkbenchRenderErrorFallback.tsx';

import './WorkbenchStudioPrototype.css';

const HEAT_CAPACITY_REFRESH_SCENE_REVISION = 'heat-capacity-instrument-scene-v1';

const WORKBENCH_APP_VERSION = __APP_VERSION__;

const HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX = 48;
const HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX = 42;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface WorkbenchStudioPrototypeProps {
  initialGeneralSettings?: WorkbenchGeneralSettings;
  initialTutorialEntryKind?: 'start' | 'resume';
}

const WorkbenchStudioPrototype: React.FC<WorkbenchStudioPrototypeProps> = ({
  initialGeneralSettings: initialGeneralSettingsOverride,
  initialTutorialEntryKind = 'resume',
}) => {
  const { settings: audioSettings, updateSettings: updateAudioSettings } = useAudioEngine();
  const {
    initialExperienceProfileLoad,
    initialTutorialHandoff,
    initialActiveTutorialExperiment,
    initialTutorialReconstruction,
    initialTutorialHandoffRecovery,
    initialOrdinarySession,
    initialOrdinaryClosedFiles,
    initialSession,
    initialHeatCapacityRefreshSession,
  } = useWorkbenchInitialWorkspace();
  const {
    experienceProfile,
    setExperienceProfile,
    tutorialNoticeKind,
    setTutorialNoticeKind,
    tutorialNoticeKindRef,
    tutorialBlockedNoticeOpen,
    setTutorialBlockedNoticeOpen,
    remoteTutorialOwnerActive,
    setRemoteTutorialOwnerActive,
    productIntroReplayPhase,
    setProductIntroReplayPhase,
    learningNeedsReselectOpen,
    setLearningNeedsReselectOpen,
    learningNeedsDraft,
    setLearningNeedsDraft,
    tutorialOperationError,
    setTutorialOperationError,
    tutorialGuideUnlockPendingRef,
    experienceProfileRef,
    experienceProfilePersistedRef,
    activeTutorialExperiment,
    tutorialActive,
    tutorialActiveRef,
    tutorialOrdinaryWorkspaceRef,
    experimentLearningChannelRef,
    tutorialOwnershipAdoptionPendingRef,
    tutorialOwnershipAdoptionRef,
    tutorialOwnershipClaimRef,
    refreshTutorialOrdinaryWorkspaceFromPersistence
  } = useWorkbenchTutorialState({ initialExperienceProfileLoad, initialTutorialReconstruction, initialTutorialHandoffRecovery, initialActiveTutorialExperiment, initialOrdinarySession, initialOrdinaryClosedFiles, initialTutorialEntryKind });
  const initialHeatCapacityRefreshWindows = initialHeatCapacityRefreshSession?.ui.windows ?? {};
  const initialHeatCapacityRefreshDrafts = initialHeatCapacityRefreshSession?.ui.drafts ?? {};
  const initialHeatCapacityRefreshLayout = initialHeatCapacityRefreshSession?.ui.layout ?? {};

  const { workbenchLayoutDefaults, setWorkbenchLayoutDefaults, openTopMenu, setOpenTopMenu, topMenuLeft, leftCollapsed, setLeftCollapsed, parametersCollapsed, setParametersCollapsed, leftSidebarWidth, setLeftSidebarWidth, parameterSidebarWidth, setParameterSidebarWidth, isCanvasFocused, setIsCanvasFocused, liveWorkspaceResizing, setLiveWorkspaceResizing, topCommandsRef, topMenuRef, workbenchBodyRef, workspaceShellRef, shellRef, liveWorkspaceRef, sidebarResizeGhostRef, parameterSidebarResizeGhostRef, liveWorkspaceResizeGhostRef, consoleResizeGhostRef, resizeGhostFrameRef, consoleResizeRef, centerWorkspaceRef, fileTabsRef, idealResultWindowRegionRef, toggleTopCommandMenu } = useWorkbenchLayoutState({ initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshWindows });
  const { files, setFiles, closedFiles, setClosedFiles, activeFileId, setActiveFileId, selectedPanel, setSelectedPanel, filesRef, closedFilesRef, issuedWorkbenchFileIdsRef, activeFileIdRef, selectedPanelRef, workspacePersistenceLocationRef } = useWorkbenchWorkspaceCollectionState({ initialSession, initialHeatCapacityRefreshSession, getInitialClosedFiles: () => (
    initialTutorialReconstruction
      ? []
      : initialTutorialHandoffRecovery
        ? [...initialOrdinarySession.files, ...initialOrdinaryClosedFiles].filter((file) => (
            initialTutorialHandoff.status !== 'loaded' ||
            file.id !== initialTutorialHandoff.marker.targetFileId
          ))
        : initialOrdinaryClosedFiles
  ) });

  const initialGeneralSettings = useMemo(
    () => initialGeneralSettingsOverride ?? loadWorkbenchGeneralSettings(),
    [initialGeneralSettingsOverride],
  );

  const { selectedFileId, setSelectedFileId, filesSectionCollapsed, setFilesSectionCollapsed, panelsSectionCollapsed, setPanelsSectionCollapsed, openFileMenuId, setOpenFileMenuId, renamingFileId, setRenamingFileId, renameDraft, setRenameDraft, pendingDeleteFileId, setPendingDeleteFileId, resultsChildrenCollapsed, setResultsChildrenCollapsed, renamingFileIdRef, fileMenuButtonRef, fileMenuRef, renameInputRef, renameSelectionModeRef } = useWorkbenchFileTreeState({ initialSession, initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshWindows, initialHeatCapacityRefreshDrafts });

  const { workspacePersistenceStatus, workspacePersistenceSchedulerRef } = useWorkbenchWorkspacePersistenceScheduler();
  const { logs, setLogs, consoleTab, setConsoleTab, consoleCollapsed, setConsoleCollapsed, consoleHeightPx, setConsoleHeightPx, consoleBodyRef } = useWorkbenchConsoleState({ initialHeatCapacityRefreshLayout, initialLanguage: initialGeneralSettings.language, getTutorialLogs: () => {
    if (initialTutorialReconstruction || initialTutorialHandoffRecovery) {
      const tutorialExperiment = initialTutorialHandoffRecovery && initialTutorialHandoff.status === 'loaded'
        ? initialTutorialHandoff.marker.experiment
        : initialActiveTutorialExperiment ?? 'heatCapacity';
      return createExperimentTutorialLogs(
        initialTutorialHandoffRecovery
          ? 'unlocked'
          : initialExperienceProfileLoad.profile.learning[tutorialExperiment],
        initialGeneralSettings.language,
      );
    }
    return null;
  } });

  const {
    settingsThemePreference,
    systemWorkbenchTheme,
    settingsLanguagePreference,
    settingsPerformanceMode,
    settingsLanguageMenuOpen,
    setSettingsLanguageMenuOpen,
    settingsLanguageTriggerRef,
    updateSettingsThemePreference,
    updateSettingsLanguagePreference,
    updateSettingsPerformanceMode,
    updateSettingsAudioEnabled,
    updateSettingsAudioVolume,
  } = useWorkbenchSettingsPreferences({
    initialGeneralSettings, initialHeatCapacityRefreshWindows, audioSettings, updateAudioSettings,
    readExperienceProfile: () => experienceProfileRef.current,
    commitExperienceProfile: (profile) => commitExperienceProfile(profile),
  });
  const {
    activeRequest: activePromptConfirmation,
    requestConfirmation: requestPromptConfirmation,
    cancelConfirmation: cancelPromptConfirmation,
    confirmConfirmation: confirmPromptConfirmation,
  } = usePromptConfirmation();

  const onboardingReducedMotion = useReducedMotionPreference();

  const workbenchCopy = workbenchCopies[settingsLanguagePreference];
  const auxiliaryWindows = useWorkbenchAuxiliaryWindows({
    initialHeatCapacityRefreshWindows, aboutCopy: workbenchCopy.about, setSettingsLanguageMenuOpen, setOpenTopMenu,
  });
  const { settingsGeneralOpen, aboutWindowOpen, buildNoticeWindowOpen, buildNoticeNavOpen, activeBuildNoticeMaterialId, buildNoticeFilePreview, buildNoticeOpenError, aboutResultNotice } = auxiliaryWindows.view;
  const { closeGeneralSettings, openGeneralSettings, showAboutResultNotice, closeAboutWindow, openAboutWindow, openBuildNoticeWindow, closeBuildNoticeWindow, jumpToBuildNoticeSection, openBuildNoticeMaterial, closeBuildNoticeMaterial, openBuildNoticeLegalFile, hideGeneralSettings, setBuildNoticeNavigationOpen, dismissAboutResultNotice } = auxiliaryWindows.actions;

  const workbenchPromptCopy = workbenchPromptCopies[settingsLanguagePreference];
  const windowControlCopy = WORKBENCH_WINDOW_CONTROL_COPY[settingsLanguagePreference];

  const { desktopExitQuiesced, setDesktopExitQuiesced, desktopExitInputBlocked, setDesktopExitInputBlocked, desktopExitQuiescedRef, desktopExitInputBlockedRef, prepareDesktopExitQuiescenceRef, resumeDesktopExitQuiescenceRef, desktopExitAutoDemoClockRef, desktopExitQuiescedAtMsRef } = useWorkbenchDesktopExitState();

  const workbenchTranslation = translations[settingsLanguagePreference === 'en' ? 'en-GB' : settingsLanguagePreference];
  const initialActiveWorkbenchFile = initialSession.files.find(
    (file) => file.id === initialSession.activeFileId,
  );

  useWorkbenchSidebarRefreshPersistence(leftCollapsed, parametersCollapsed);

  const { pendingRemovePointId, setPendingRemovePointId, pendingClearRelationKey, setPendingClearRelationKey, samplingPresetMenuOpen, setSamplingPresetMenuOpen, idealAdvancedSettingsOpen, setIdealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible, setIdealAdvancedSettingsBodyVisible, parameterInputDrafts, setParameterInputDrafts, parameterErrors, setParameterErrors, scanInputDraft, setScanInputDraft, scanInputFocused, setScanInputFocused, scanInputError, setScanInputError, scanInputToast, setScanInputToast, scanSliderThumbHover, setScanSliderThumbHover, scanSliderDragging, setScanSliderDragging, scanInputRef, lastScanInputErrorRef, samplingPresetSelectRef, currentParametersBodyRef, idealAdvancedSettingsBodyRef, idealAdvancedSettingsPreviousScrollTopRef, idealAdvancedScrollFrameRef } = useWorkbenchParameterInteractionState();

  const { undoStack, setUndoStack, redoStack, setRedoStack, undoStackRef, redoStackRef } = useWorkbenchEditHistoryState();

  const { standardRuntimeRef, idealRuntimeRef } = useWorkbenchHardSphereRuntimeResources();

  const { scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef, persistWorkspaceLifecycleCheckpointRef, heatCapacityRefreshPersistRef, heatCapacitySemanticCheckpointDebounceTimerRef, heatCapacitySemanticCheckpointMaxWaitTimerRef, scheduleHeatCapacitySemanticSceneCheckpointRef, heatCapacityLifecycleFlushInProgressRef, heatCapacityLifecycleFlushPromiseRef, heatCapacityLifecycleLastCompletedFlushAtMsRef, skipInitialConsoleScrollRef } = useWorkbenchWorkspacePersistenceResources(initialHeatCapacityRefreshSession);

  const emptyWorkbenchFile = useMemo(() => createDefaultStandardFile(0), []);
  const isWorkbenchEmpty = files.length === 0;
  const activeFile = files.find((file) => file.id === activeFileId) ?? emptyWorkbenchFile;
  const isHeatCapacityModalLocked = () => activeHeatCapacityModalLocked;

  const heatCapacityController = useWorkbenchHeatCapacityController({
    initial: {
      initialHeatCapacityRefreshDrafts,
      initialHeatCapacityRefreshWindows,
      initialHeatCapacityRefreshLayout,
      initialHeatCapacityRefreshSession,
      initialSession,
    },
    workspace: {
      activeFile,
      activeFileId,
      filesRef,
      activeFileIdRef,
      setFiles,
      updateFileById: (...args) => updateFileById(...args),
      updateActiveFile: (...args) => updateActiveFile(...args),
    },
    preferences: {
      settingsPerformanceMode,
      settingsLanguagePreference,
      workbenchPromptCopy,
    },
    lifecycle: {
      desktopExitQuiesced,
      desktopExitQuiescedRef,
      flushWorkspacePersistenceRef,
      flushWorkspaceAfterRunStateCommit: (...args) => flushWorkspaceAfterRunStateCommit(...args),
      desktopExitAutoDemoClockRef,
      captureWorkbenchRefreshPresentation: (...args) => captureWorkbenchRefreshPresentation(...args),
      heatCapacityRefreshPersistRef,
      skipInitialConsoleScrollRef,
      scheduleHeatCapacitySemanticSceneCheckpointRef,
      heatCapacityLifecycleFlushInProgressRef,
      scheduleWorkspacePersistenceRef,
    },
    ui: {
      HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX,
      HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX,
      setParametersCollapsed,
      parametersCollapsed,
      selectedPanel,
      setSelectedPanel,
      setParameterInputDrafts,
      setScanInputToast,
      isHeatCapacityModalLocked: (...args) => isHeatCapacityModalLocked(...args),
      setLeftCollapsed,
      pushLog: (...args) => pushLog(...args),
      requestPromptConfirmation: (...args) => requestPromptConfirmation(...args),
    },
    history: {
      captureUndoSnapshot: (...args) => captureUndoSnapshot(...args),
    },
    tutorial: {
      tutorialNoticeKindRef,
      tutorialActiveRef,
      experienceProfileRef,
      completeExperimentLearningTutorial: (...args) => completeExperimentLearningTutorial(...args),
      guardWorkbenchTutorialAction: (...args) => guardWorkbenchTutorialAction(...args),
      experienceProfile,
      tutorialActive,
      activeTutorialExperiment,
      setTutorialBlockedNoticeOpen,
    },
  });
  const {
    heatCapacityBasicInputDrafts,
    heatCapacityBasicInputErrors,
    heatCapacityAdvancedOpen,
    heatCapacityAdvancedDraft,
    heatCapacityAdvancedInputDrafts,
    heatCapacityAdvancedInputErrors,
    heatCapacityRestoreDefaultConfirmOpen,
    heatCapacityIdealIntroOpen,
    heatCapacityParamHelpPopoverStyle,
    activeHeatCapacityFreeParameterLockMessage,
    activeHeatCapacityFreeParameterLocked,
    activeHeatCapacityFreeIdealReadonly,
    activeHeatCapacityFreeSchemeLocked,
    activeHeatCapacityFreeParameterInputDisabled,
    visibleHeatCapacityParamHelpId,
  } = heatCapacityController.view.parameters;
  const {
    heatCapacityGuideChecklistViewedIndex,
    heatCapacityGuideLessonDialog,
    heatCapacityGuideLessonOutgoingView,
    heatCapacityGuideLessonClosing,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityFocusControlId,
    guideHeatCapacityPulseActive,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
    guideHeatCapacityStrongReminderFocusKey,
    heatCapacityGuideMaskBounds,
    heatCapacityGuideProjectedHoles,
    guideHeatCapacityRollback,
    getHeatCapacityGuideStep,
    activeHeatCapacityGuideStep,
    activeHeatCapacityPreheatMode,
    activeHeatCapacityPreheatLocked,
    getGuideStepGuidance,
    getHeatCapacityGuideLessonView,
  } = heatCapacityController.view.guide;
  const {
    heatCapacityModeTransitionState,
    heatCapacityModeTransitionLocked,
    initialHeatCapacityCameraPose,
    initialHeatCapacityFocusMode,
    heatCapacityQualityProfile,
    initialHeatCapacityCameraTransition,
    initialHeatCapacityUltraVisualState,
    initialHeatCapacityHardSphereVisualCheckpoint,
    heatCapacitySceneRestoreAcknowledged,
    heatCapacityInitialSceneRestoreEnabled,
    heatCapacityModeSceneRestoreSession,
    heatCapacityModeSceneRestoreRequest,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
    heatCapacityFocusResetKey,
    heatCapacityHardSphereVisualResetKey,
  } = heatCapacityController.view.scene;
  const {
    autoDemoPhase,
    autoDemoRunning,
    autoDemoPaused,
    autoDemoInteractionLocked,
    autoDemoTimelineClockMs,
    autoDemoCompletionMessage,
    demoFocusControlId,
    demoFocusPulseActive,
    demoCameraFocusMode,
    demoCameraFocusKey,
    autoDemoStepIndex,
    autoDemoStepCount,
    autoDemoStepTitle,
    autoDemoStepDescription,
    autoDemoStepTarget,
    autoDemoStepProgressCriterion,
    autoDemoStepNote,
    autoDemoStepPanelMode,
  } = heatCapacityController.view.demo;
  const {
    heatCapacityToastCurrent,
    activeHeatCapacityPressureAlarmVisible,
    heatCapacityRealtimeCopy,
  } = heatCapacityController.view.feedback;
  const {
    heatCapacityPumpPulseId,
    heatCapacityRecordPulseId,
    heatCapacityRecordControlsClosing,
    heatCapacityResetFeedbackActionId,
  } = heatCapacityController.view.instrument;
  const {
    pendingRemoveHeatCapacityTrialRecord,
    heatCapacityBatchSetupSelection,
    activeHeatCapacityFreeBatchProgress,
    activeHeatCapacityCurrentGroup,
    activeHeatCapacityNextScheme,
    activeHeatCapacityGroupProgressStatus,
    heatCapacityBatchSetupPurpose,
    activeHeatCapacityCalculationSession,
    heatCapacityBatchSetupOpen,
    heatCapacityCalculationWindowOpen,
    activeHeatCapacityInvalidAttemptPrompt,
  } = heatCapacityController.view.free;
  const {
    heatCapacityGuideChecklistTrackRef,
    heatCapacityGuideChecklistVisualOffsetRef,
    heatCapacityGuideLessonDialogRef,
    heatCapacityGuideMaskRef,
  } = heatCapacityController.bindings.guide;
  const {
    heatCapacityAutoDemoTimelineRef,
    heatCapacityAutoDemoStartedAtMsRef,
    heatCapacityAutoDemoPausedElapsedMsRef,
  } = heatCapacityController.bindings.demo;
  const {
    pinnedHeatCapacityParamHelpId,
    hoverHeatCapacityParameterHelp,
    pinHeatCapacityParameterHelp,
    hideHeatCapacityHoverTooltip,
    changeHeatCapacityParameterInputDraft,
    showHeatCapacityFreeParameterLockHint,
    commitHeatCapacityBasicParameterInput,
    setHeatCapacityBasicCheckbox,
    setHeatCapacityFreeGasType,
    openHeatCapacityRestoreDefaultConfirm,
    cancelHeatCapacityRestoreDefault,
    confirmHeatCapacityRestoreDefault,
    openHeatCapacityAdvancedSettings,
    cancelHeatCapacityAdvancedParameterDraft,
    saveHeatCapacityAdvancedParameterDraft,
    acknowledgeHeatCapacityFreeAdvancedRisk,
    showHeatCapacityGasTypeLockHint,
    requestToggleHeatCapacityFreeParameterScheme,
    cancelHeatCapacityIdealProfileIntro,
    confirmHeatCapacityIdealProfileIntro,
  } = heatCapacityController.commands.parameters;
  const {
    handleHeatCapacityGuideChecklistWheel,
    handleHeatCapacityGuideTargetHolesChange,
    openHeatCapacityLessonIntro,
    handleHeatCapacityGuideLessonDialogAdvance,
    handleHeatCapacityGuideLessonDialogKeyDown,
    handleHeatCapacityGuideLessonCloseButtonMouseDown,
    handleHeatCapacityGuideLessonCloseButtonClick,
  } = heatCapacityController.commands.guide;
  const {
    updateHeatCapacityFocusMode,
    handleHeatCapacityFocusExitRequest,
    updateHeatCapacityFreeEquilibriumSpeedMultiplier,
    toggleHeatCapacityHardSphereView,
    completeActiveHeatCapacityPreheat,
    recordHeatCapacityGuideSample,
    recordFreeHeatCapacitySample,
    updateHeatCapacityPower,
    resetHeatCapacityGuideExperiment,
    exitHeatCapacityGuideMode,
    exitCompletedHeatCapacityTeachingMode,
    updateHeatCapacityStopcockOpen,
    adjustHeatCapacityPressureZeroFineFromScene,
    adjustHeatCapacityPressureZeroCoarseFromScene,
    updateHeatCapacityPumpValve,
    pressHeatCapacityPumpBulb,
  } = heatCapacityController.commands.instrument;
  const {
    setPendingRemoveHeatCapacityTrialRecord,
    selectHeatCapacityBatchGroupCount,
    setHeatCapacityBatchSetupRequestedFileId,
    setHeatCapacityCalculationReviewOpen,
    requestRemoveHeatCapacityTrialRecord,
    confirmHeatCapacityFreeBatchSetup,
    cancelHeatCapacityFreeBatchSetup,
    restartHeatCapacityFreeExperiment,
    requestRestartHeatCapacityFreeExperiment,
    requestRestartHeatCapacityFreeGroup,
    requestAbandonHeatCapacityFreeGroupDraft,
    openNextHeatCapacityFreeExperimentGroupSetup,
    openFirstHeatCapacityFreeExperimentGroupSetup,
    updateHeatCapacityCalculationDraft,
    submitHeatCapacityCalculationStep,
    continueHeatCapacityCalculationAnswer,
    revealHeatCapacityCalculationAnswer,
    selectHeatCapacityCalculationGroup,
    selectHeatCapacityCalculationAggregate,
    completeAndExitHeatCapacityCalculation,
    closeHeatCapacityCalculationReview,
    continueHeatCapacityInvalidAttempt,
    selectHeatCapacityViewedGroup,
    selectHeatCapacityViewedTrial,
  } = heatCapacityController.commands.free;
  const {
    handleHeatCapacitySceneLockedInteraction,
    scheduleHeatCapacityAutoDemoLockedPointerToast,
    runHeatCapacityAutoDemo,
    pauseHeatCapacityAutoDemo,
    terminateHeatCapacityAutoDemo,
  } = heatCapacityController.commands.demo;
  const {
    applyHeatCapacityModeTransitionEvent,
    activateHeatCapacityModeFromExplore,
    exitHeatCapacityFormalModeToExplore,
    switchHeatCapacityMode,
    handleHeatCapacitySceneDiscreteMotionChange,
    handleHeatCapacitySceneModeTransitionControllerChange,
    handleHeatCapacityModeSegmentClick,
  } = heatCapacityController.commands.mode;
  const {
    handleHeatCapacityCameraPoseChange,
    handleHeatCapacitySceneCheckpointProviderChange,
    handleHeatCapacitySceneRestoreRevealComplete,
    handleHeatCapacitySceneCheckpoint,
    handleHeatCapacitySceneRuntimeFailure,
    handleHeatCapacitySceneReady,
  } = heatCapacityController.commands.scene;
  const { closeHeatCapacityParameterWindows, heatCapacityModeTransitionStateRef, heatCapacityRuntimeFailureFileIdRef, heatCapacityRefreshRestorePendingRef, heatCapacitySceneCheckpointProviderRef, heatCapacitySceneReadyFileIdRef, recoverHeatCapacityRuntimeIfReadyRef, heatCapacityModeTransitionDemoClockRef, autoDemoPhaseRef, desktopExitPausedPressureAlarmRef, desktopExitPausedClosePumpValveReminderRef, heatCapacityPressureAlarmVisibleRef, scheduleHeatCapacityClosePumpValveReminder, scheduleHeatCapacityPressureAlarmExpiry, pauseHeatCapacityPressureAlertTimers, pauseHeatCapacityPumpAnimation, resumeHeatCapacityPumpAnimation, pauseGuideHeatCapacityReminderTimers, disposeHeatCapacityRuntimeResources, resetHeatCapacitySceneUiState, pauseHeatCapacityTransientUiTimers, resumeHeatCapacityTransientUiTimers, releaseHeatCapacityRuntimeForFileExit, clearHeatCapacityAutoDemoTimers, scheduleHeatCapacityAutoDemoTimeline, resolveDeferredHeatCapacityGuideUiCheckpoint, buildHeatCapacityModeUiCheckpoint, buildCurrentHeatCapacityRefreshSession, captureHeatCapacityModeSceneMetadata, pauseHeatCapacityModeTransitionRuntime, resumeHeatCapacityModeTransitionRuntime, suspendActiveHeatCapacityModeForNavigation, activateHeatCapacityFileModeSession, activeFileOwnsPendingHeatCapacityRefresh, rebaseHeatCapacityFileForAutomaticSuspension } = heatCapacityController.lifecycle;

  useWorkbenchHeatInitialDemoEffects(heatCapacityController.effects.initialDemo);

  useWorkbenchRefreshPresentationRestore({ initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, consoleBodyRef, currentParametersBodyRef, renameInputRef, renamingFileId, window });

  useWorkbenchHeatPresentationEffects(heatCapacityController.effects.presentation);

  const pistonController = useWorkbenchPistonController({
    activeFile, initialActiveWorkbenchFile, settingsLanguagePreference,
    files: { filesRef, activeFileIdRef, setFiles, setWorkbenchFiles: (...args) => setWorkbenchFiles(...args), updateActiveFile: (...args) => updateActiveFile(...args), updateFileById: (...args) => updateFileById(...args), updateRuntimeFileById: (...args) => updateRuntimeFileById(...args) },
    lifecycle: { desktopExitQuiescedRef, scheduleHeatCapacitySemanticSceneCheckpointRef, scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef },
    history: { createEditSnapshot: (...args) => createEditSnapshot(...args), pushUndoSnapshot: (...args) => pushUndoSnapshot(...args) },
    ui: { liveWorkspaceRef, requestPromptConfirmation, setLeftCollapsed, setParametersCollapsed, setSelectedPanel, showParameterSidebarBlockReason: (...args) => showParameterSidebarBlockReason(...args) },
    tutorial: { activeTutorialExperiment, experienceProfileRef },
  });
  const { pistonModeControl, pistonOscillationReleaseEventsByFileId, pistonOscillationPressStartEventsByFileId, pistonOscillationMeasurementCyclesByFileId, pistonOscillationGuidePulseElapsedMs, pistonOscillationGuideFeedback, pistonOscillationGuideLessonDialog, pistonOscillationGuideLessonOutgoingView, pistonOscillationGuideCompletionToast, pistonOscillationGuideStrongMaskLayout, pistonOscillationGuidePistonStable, pistonOscillationGuideResetFeedback, pistonOscillationGuideChecklistViewedIndex, pistonOscillationDemoPlayback, pistonOscillationCalculationReviewOpen, pistonOscillationDataProcessingReviewOpen, pistonOscillationProcessReviewOpen, activePistonOscillationEffectiveConfig, activePistonOscillationPhysicsConfig, activePistonOscillationThermalConfig, activePistonOscillationReleaseAsymmetryConfig, activePistonOscillationParameterSignature, activePistonOscillationDemoPlaybackPhase, activePistonOscillationGuideSession, activePistonOscillationFreeSession, activePistonOscillationFreeSelected, pistonOscillationFreeSetupOpen, pistonOscillationCompletedDataProcessingReview, activePistonOscillationDataProcessing, activePistonOscillationProcessReview, activePistonOscillationExpandedRealtime, pistonOscillationCalculationWindowOpen, activePistonOscillationGuideSelected, activePistonOscillationParameterMode, activePistonOscillationParameterSidebarAvailable, activePistonOscillationPowerOn, activePistonOscillationGuideTimeFrozen, activePistonOscillationGuideInstrumentRestoreState, activePistonOscillationGuideSnapTargetHeightMm, pistonOscillationCopy, pistonGuidePulseActive, pistonGuideVisualCue, pistonGuideScrewInteractionMode, pistonGuideAcquisitionCue, pistonGuideRequestedFocusMode, pistonGuideExpectedStrongTargetId, pistonGuideStrongTargetContext, pistonOscillationGuideStrongReminderActive, pistonGuideStrongTargetId, pistonGuideStrongReminderText, getPistonOscillationGuideLessonView,  } = pistonController.view;
  const { pistonOscillationGuideLessonDialogRef, pistonOscillationGuideChecklistTrackRef, pistonOscillationGuideChecklistVisualOffsetRef, pistonOscillationDemoPlaybackChannel, pistonOscillationLivePressureChannel, pistonOscillationAcquisitionPanelRef, pistonOscillationContentRenderRecoveryHostRef } = pistonController.bindings;
  const { restorePistonOscillationFreeParameters, cancelPistonOscillationFreeSetup, requestPistonOscillationFreeSetup, changePistonOscillationPeriodSelectionMode, clearPistonOscillationTutorialPlayback, clearPistonOscillationReviewWindows, handlePistonOscillationReleaseEvent, handlePistonOscillationPressStartEvent, handlePistonOscillationFreeOperationObserved, editPistonOscillationGuideParameter, commitPistonOscillationGuideParameter, commitPistonOscillationFreeAcquisitionSetting, changePistonOscillationFreeCandidate, startPistonOscillationFreeAcquisition, savePistonOscillationFreeMeasurement, retainPistonOscillationRun, handlePistonOscillationPowerToggle, activatePistonOscillationFreeMode, deletePistonOscillationFreeMeasurement, requestPistonOscillationFreeReset, handlePistonOscillationFreeInstrumentSnapshot, handlePistonOscillationGuideActionAttempt, handlePistonOscillationGuideScrewDirectionFeedback, handlePistonOscillationGuideHeightConfirmed, handlePistonOscillationGuideSupportLoss, handlePistonOscillationGuideHeightResetComplete, closePistonOscillationGuideLessonDialog, openPistonOscillationGuideLessonIntro, advancePistonOscillationGuideLessonDialog, handlePistonOscillationGuideLessonDialogKeyDown, handlePistonOscillationGuideInstrumentSnapshot, handlePistonOscillationGuideAcquisitionEvent, handlePistonOscillationProcessingEvent, handlePistonOscillationFreeUnusableMeasurement, completeAndExitPistonOscillationCalculation, closePistonOscillationCalculationReview, openPistonOscillationDataProcessingReview, openPistonOscillationCalculationReview, closePistonOscillationDataProcessingReview, openPistonOscillationProcessReview, closePistonOscillationProcessReview, returnToPistonOscillationInstrumentAfterDisplayError, handlePistonOscillationGuideProcessingInteractionStart, handlePistonOscillationGuideInvalidPeriodSelection, togglePistonOscillationOperationVisualization, setPistonOscillationOperationVisualization, updatePistonOscillationFreeParameterDraft, setPistonOscillationFreeExperimentScheme, setPistonOscillationFreeGasType, acknowledgePistonOscillationAdvancedParametersRisk, showPistonOscillationParameterLockHint, handlePistonOscillationGuideChecklistWheel, handlePistonOscillationGuideChecklistKeyDown, activatePistonOscillationTutorialMode,  } = pistonController.commands;

  const { activeHeatCapacityMaterialsWindowOpen, activeExperimentMaterialsPanelKeys } = useWorkbenchTeachingPanelProjection({ activeFile, selectedPanel, setSelectedPanel, setLeftCollapsed });

  useWorkbenchHeatFreeWorkspaceEffects(heatCapacityController.effects.freeWorkspace);

  const effectiveParametersCollapsed = parametersCollapsed;

  const openableClosedFiles = closedFiles.filter((file) => !files.some((openFile) => openFile.id === file.id));
  const standardPanels = useMemo(() => createStandardPanels(workbenchCopy), [workbenchCopy]);
  const idealPanels = useMemo(() => createIdealPanels(workbenchCopy), [workbenchCopy]);

  const activeHeatCapacityGasLabel = activeFile.kind === 'heatCapacity'
    ? heatCapacityFreeGasTypeOptions.find((option) => (
        option.id === selectHeatCapacityFreeGasType(activeFile)
      ))?.label[settingsLanguagePreference] ??
      heatCapacityFreeGasTypeOptions[0].label[settingsLanguagePreference]
    : heatCapacityFreeGasTypeOptions[0].label[settingsLanguagePreference];
  const activeHeatCapacityUsesSelectableGas = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free';
  const activeHeatCapacityExperimentTitle = activeHeatCapacityUsesSelectableGas
    ? heatCapacityRealtimeCopy.gasExperimentTitle(activeHeatCapacityGasLabel)
    : heatCapacityRealtimeCopy.realtimeTitle;
  const activeHeatCapacityCalculationHint = activeHeatCapacityUsesSelectableGas
    ? heatCapacityRealtimeCopy.gasCalculationHint(activeHeatCapacityGasLabel)
    : heatCapacityRealtimeCopy.materialsHint;
  const activeHeatCapacityMaterialsTabsAria = activeHeatCapacityUsesSelectableGas
    ? heatCapacityRealtimeCopy.gasMaterialsTabsAria(activeHeatCapacityGasLabel)
    : heatCapacityRealtimeCopy.materialsTabsAria;
  const activeHeatCapacityPreviewMountAria = activeHeatCapacityUsesSelectableGas
    ? heatCapacityRealtimeCopy.gasPreviewMountAria(activeHeatCapacityGasLabel)
    : heatCapacityRealtimeCopy.previewMountAria;

  const heatCapacityPanels = useMemo(
    () => createHeatCapacityPanels(workbenchCopy, heatCapacityRealtimeCopy),
    [heatCapacityRealtimeCopy, workbenchCopy],
  );
  const pistonOscillationPanels = useMemo(
    () => createPistonOscillationPanels(
      workbenchCopy,
      pistonOscillationCopy,
      heatCapacityRealtimeCopy,
    ),
    [heatCapacityRealtimeCopy, pistonOscillationCopy, workbenchCopy],
  );
  const resultsSections = useMemo(() => createResultsSections(workbenchCopy), [workbenchCopy]);
  const idealResultWindowPanels = useMemo(
    () => idealPanels.filter(
      (panel): panel is PanelDefinition & { key: WorkbenchIdealResultWindowKey } => (
        panel.key === 'experimentPoints' || panel.key === 'verification'
      ),
    ),
    [idealPanels],
  );
  const standardResultsLayout = activeFile.kind === 'standard'
    ? normalizeStandardResultsLayout(activeFile.standardResultsLayout)
    : normalizeStandardResultsLayout(null);
  const availablePanels = activeFile.kind === 'standard'
    ? standardPanels
    : activeFile.kind === 'ideal'
      ? idealPanels
      : activeFile.kind === 'heatCapacity'
        ? heatCapacityPanels
        : pistonOscillationPanels;
  const activePanelTitle = activeFile.kind === 'heatCapacity' && selectedPanel === 'results'
    ? heatCapacityRealtimeCopy.materialsTitle
    : availablePanels.find((panel) => panel.key === selectedPanel)?.title ?? '3D Preview';
  const primaryPanels = availablePanels.filter((panel) => panel.key === 'preview' || panel.key === 'realtime');
  const optionalPanels = availablePanels.filter(
    (panel) => (
      panel.key !== 'preview' &&
      panel.key !== 'realtime' &&
      !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key)) &&
      !(activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel.key)) &&
      !(activeFile.kind === 'heatCapacityPistonOscillation' && isHeatCapacityPanelKey(panel.key)) &&
      activeFile.visiblePanels.includes(panel.key)
    ),
  );
  const resultsPanel = optionalPanels.find((panel) => panel.key === 'results');
  const auxiliaryPanels = optionalPanels.filter((panel) => panel.key !== 'results');
  const idealResultPanels = activeFile.kind === 'ideal'
    ? idealResultWindowPanels.filter((panel) => activeFile.visiblePanels.includes(panel.key))
    : [];

  const editableCurrentParameters = useMemo(() => getWorkbenchParameterRows(activeFile), [activeFile]);
  const sessionCacheSummary = useMemo(() => getWorkbenchSessionCacheSummary(files, workbenchCopy), [files, workbenchCopy]);
  const resultSummary = useMemo(() => createWorkbenchResultSummary(activeFile), [activeFile]);
  const figureSpecs = useMemo(
    () => createWorkbenchFigureSpecs(activeFile, settingsLanguagePreference),
    [activeFile, settingsLanguagePreference],
  );
  const idealAnalysis: IdealGasAnalysis | null = useMemo(
    () => (
      activeFile.kind === 'ideal'
        ? getIdealGasAnalysis(activeFile.relation, activeFile.pointsByRelation, activeFile.activeParams)
        : null
    ),
    [activeFile],
  );
  const { parametersDirty, parameterControlsLocked, currentParameterControlsLocked, controlledVariableLockHint, isIdealControlledVariableLocked, getLockedIdealControlledVariableKeys } = selectWorkbenchParameterInteractionPresentation(activeFile, workbenchCopy);

  const { workbenchStyle, shellStyle, liveWorkspaceSplitRatio, liveWorkspaceStyle } = selectWorkbenchLayoutPresentation({ activeFile, leftSidebarWidth, parameterSidebarWidth, consoleCollapsed, consoleHeightPx });

  const { displayedLogs, consoleSummary } = useWorkbenchConsoleProjection({ logs, consoleTab, activeFile, idealAnalysis, isWorkbenchEmpty, workbenchCopy });

  const { animateCurrentParametersScroll, toggleIdealAdvancedSettings } = createWorkbenchParameterScrollActions({
    window, currentParametersBodyRef, idealAdvancedScrollFrameRef,
    idealAdvancedSettingsPreviousScrollTopRef, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible,
  });

  const {
    updaterState, updateDialogOpen, updateDialogState, aboutUpdateChecking, closeUpdateDialog, openManualUpdateDownload,
    runAboutUpdateCheck, ignoreUpdateDialogVersion, startUpdateDownload, restartAndInstallUpdate,
  } = useWorkbenchUpdaterController({
    appVersion: WORKBENCH_APP_VERSION, initialHeatCapacityRefreshWindows, aboutCopy: workbenchCopy.about,
    showAboutResultNotice: (title, body, kind) => showAboutResultNotice(title, body, kind),
  });

  useWorkbenchFilesRefProjection(files, filesRef);

  useWorkbenchTutorialLifecycle({ tutorialActiveRef, experienceProfileRef, setRemoteTutorialOwnerActive, tutorialOwnershipAdoptionRef, setTutorialOperationError, tutorialOwnershipClaimRef, tutorialOrdinaryWorkspaceRef, setExperienceProfile, experimentLearningChannelRef, setTutorialNoticeKind, filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, refreshTutorialOrdinaryWorkspaceFromPersistence, flushWorkspacePersistenceRef, initialTutorialEntryKind, EXPERIMENT_TUTORIAL_INSTANCE_ID, window, document, experienceProfile, tutorialNoticeKind, tutorialActive, initialTutorialHandoffRecovery, settingsLanguagePreference, tutorialNoticeKindRef });

  useWorkbenchActiveFileProjection({ activeFileId, activeFileIdRef, initialHeatCapacityRefreshSession, disableHeatCapacityInitialSceneRestore: heatCapacityController.lifecycle.disableHeatCapacityInitialSceneRestore, heatCapacityRefreshRestorePendingRef, setSelectedFileId });

  useWorkbenchFileTreeSelectionProjection({ activeFileId, files, selectedFileId, setSelectedFileId });

  useWorkbenchPersistenceProjection({
    activeFileId,
    files,
    closedFiles,
    selectedPanel,
    closedFilesRef,
    selectedPanelRef,
    scheduleWorkspacePersistenceRef,
    scheduleHeatCapacitySemanticSceneCheckpointRef,
    workspacePersistenceLocationRef,
    flushWorkspacePersistenceRef,
  });

  useWorkbenchRenameRefProjection(renamingFileId, renamingFileIdRef);

  useWorkbenchParameterScroll({
    activeFileKind: activeFile.kind, idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible,
    currentParametersBodyRef, idealAdvancedSettingsBodyRef, idealAdvancedSettingsPreviousScrollTopRef,
    idealAdvancedScrollFrameRef, animateCurrentParametersScroll, setIdealAdvancedSettingsBodyVisible,
  });

  useWorkbenchRenameFocus(renamingFileId, renameInputRef);

  useWorkbenchIdealInputEffects({ activeFile, scanInputFocused, scanInputToast, setScanInputDraft, setScanInputError, setScanInputToast });

  useWorkbenchHeatParameterProjectionEffects(heatCapacityController.effects.parameterProjection);

  useWorkbenchParameterSidebarAvailability({ activeFile, activePistonOscillationParameterSidebarAvailable, setParametersCollapsed, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible, closeHeatCapacityParameterWindows });

  useWorkbenchHeatParameterHelpEffects(heatCapacityController.effects.parameterHelp);

  useWorkbenchSamplingPresetDismiss(samplingPresetMenuOpen, samplingPresetSelectRef, setSamplingPresetMenuOpen);

  useWorkbenchRuntimeResourceCleanup(() => disposeHardSphereRuntimeTimers(), () => disposeHeatCapacityRuntimeResources());

  const { pushLog } = createWorkbenchConsoleActions({ tutorialActiveRef, setLogs, settingsLanguagePreference });

  const { guardWorkbenchTutorialAction, commitExperienceProfile } = createWorkbenchTutorialProfileActions({
    experienceProfileRef, experienceProfilePersistedRef, tutorialActiveRef, setExperienceProfile, experimentLearningChannelRef, setTutorialOperationError, setTutorialBlockedNoticeOpen, persistAppExperienceProfile, setOpenTopMenu,
  });

  const { showWorkbenchValidationErrors } = createWorkbenchParameterValidationActions({ activeFile, settingsLanguagePreference, setParameterErrors, pushLog });

  const { exportEnvironmentStatus, runAboutEnvironmentCheck } = useWorkbenchExportEnvironment({
    tutorialActiveRef, settingsLanguagePreference, workbenchCopy, setLogs, pushLog, showAboutResultNotice,
  });
  const idealPointCount = idealAnalysis?.sortedPoints.length ?? 0;
  const { exportInProgress, heatCapacityReportExportOpen, heatCapacityReportSelectedGroupIds, isExportModeDataReady, handleExportAction, openHeatCapacityReportExport, confirmHeatCapacityReportExport, closeHeatCapacityReportExport, selectHeatCapacityReportGroups } = useWorkbenchExportController({
    activeFile, idealPointCount, resultSummary, settingsLanguagePreference, workbenchCopy, exportEnvironmentStatus, guardWorkbenchTutorialAction, pushLog,
  });

  useWorkbenchConsoleScroll({ consoleTab, displayedLogs, logs, consoleBodyRef, skipInitialConsoleScrollRef });

  useWorkbenchHeatRealtimeEffects(heatCapacityController.effects.realtime);

  const { setWorkbenchFiles, commitWorkbenchFileCollections, updateFileById, updateRuntimeFileById, updateActiveFile } = createWorkbenchFileCollectionActions({
    desktopExitQuiescedRef,
    scheduleHeatCapacitySemanticSceneCheckpointRef,
    scheduleWorkspacePersistenceRef,
    setFiles,
    filesRef,
    closedFilesRef,
    activeFileIdRef,
    setClosedFiles,
    setActiveFileId,
    issuedWorkbenchFileIdsRef,
  });

  const { showParameterSidebarBlockReason, openParameterSidebarFromRail } = createWorkbenchParameterSidebarActions({ activeFile, activePistonOscillationParameterSidebarAvailable, settingsLanguagePreference, setScanInputToast, pushLog: (...args) => pushLog(...args), setParametersCollapsed, getPistonOscillationParameterSidebarFreeOnlyMessage });

  const renderHeatCapacityTooltipPopover = (tooltipId: string, message: string, handlers?: {
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
    }) => visibleHeatCapacityParamHelpId === tooltipId ? (
    <WorkbenchHeatCapacityTooltipPopover
      tooltipId={tooltipId}
      message={message}
      handlers={handlers}
      visibleHeatCapacityParamHelpId={visibleHeatCapacityParamHelpId}
      resolvedWorkbenchTheme={resolvedWorkbenchTheme}
      heatCapacityParamHelpPopoverStyle={heatCapacityParamHelpPopoverStyle}
    />
  ) : null;

  const renderHeatCapacityTooltipAnchor = (tooltipId: string, message: string, children: React.ReactNode, options?: {
      className?: string;
      target?: string;
      focusable?: boolean;
    }) => (
    <WorkbenchHeatCapacityTooltipAnchor
      tooltipId={tooltipId}
      message={message}
      children={children}
      options={options}
      hoverHeatCapacityParameterHelp={hoverHeatCapacityParameterHelp}
      hideHeatCapacityHoverTooltip={hideHeatCapacityHoverTooltip}
      renderHeatCapacityTooltipPopover={renderHeatCapacityTooltipPopover}
    />
  );

  const activeHeatCapacityModalLocked = activeHeatCapacityPreheatLocked ||
    activeHeatCapacityInvalidAttemptPrompt ||
    heatCapacityBatchSetupOpen ||
    heatCapacityReportExportOpen ||
    heatCapacityCalculationWindowOpen;

  const renderHeatCapacityGuideLessonOverlay = () => {
    if (!heatCapacityGuideLessonDialog) return null;
    return (
    <WorkbenchHeatCapacityGuideLesson
      heatCapacityGuideLessonDialog={heatCapacityGuideLessonDialog}
      getHeatCapacityGuideLessonView={getHeatCapacityGuideLessonView}
      heatCapacityGuideLessonClosing={heatCapacityGuideLessonClosing}
      handleHeatCapacityGuideLessonDialogAdvance={handleHeatCapacityGuideLessonDialogAdvance}
      heatCapacityGuideLessonDialogRef={heatCapacityGuideLessonDialogRef}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      handleHeatCapacityGuideLessonDialogKeyDown={handleHeatCapacityGuideLessonDialogKeyDown}
      windowControlCopy={windowControlCopy}
      handleHeatCapacityGuideLessonCloseButtonMouseDown={handleHeatCapacityGuideLessonCloseButtonMouseDown}
      handleHeatCapacityGuideLessonCloseButtonClick={handleHeatCapacityGuideLessonCloseButtonClick}
      heatCapacityGuideLessonOutgoingView={heatCapacityGuideLessonOutgoingView}
    />
  );
  };

  const captureWorkbenchRefreshPresentation = createWorkbenchRefreshPresentationCapture({
    windows: { openTopMenu, topMenuLeft, settingsGeneralOpen, aboutWindowOpen, buildNoticeWindowOpen, buildNoticeNavOpen, activeBuildNoticeMaterialId, buildNoticeFilePreview, buildNoticeOpenError, aboutResultNotice, updateDialogOpen, settingsLanguageMenuOpen, openFileMenuId, renamingFileId, samplingPresetMenuOpen, idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible },
    drafts: { renameDraft, parameterInputDrafts, parameterErrors, scanInputDraft, scanInputError, scanInputToast },
    layout: { selectedFileId, selectedPanel, logs, consoleTab, consoleCollapsed, consoleHeightPx, leftCollapsed, parametersCollapsed, leftSidebarWidth, parameterSidebarWidth, filesSectionCollapsed, panelsSectionCollapsed, resultsChildrenCollapsed },
    consoleBodyRef, currentParametersBodyRef, renameInputRef,
  });

  const { clearHeatCapacitySemanticCheckpointTimers, flushWorkspaceAfterRunStateCommit } = useWorkbenchWorkspacePersistence({
 snapshot: {
    readTutorialWorkspace: () => tutorialActiveRef.current ? tutorialOrdinaryWorkspaceRef.current : null,
    readFiles: () => filesRef.current,
    readClosedFiles: () => closedFilesRef.current,
    readActiveFileId: () => activeFileIdRef.current,
    readSelectedPanel: () => selectedPanelRef.current,
    readCapturedAtMs: () => desktopExitQuiescedAtMsRef.current ?? Date.now(),
    readRefreshRestorePending: () => heatCapacityRefreshRestorePendingRef.current,
    initialRefreshSession: initialHeatCapacityRefreshSession,
    buildRefreshSession: (capturedAtMs) => buildCurrentHeatCapacityRefreshSession(null, capturedAtMs),
    buildModeCheckpoint: buildHeatCapacityModeUiCheckpoint,
  },
 readScheduler: () => workspacePersistenceSchedulerRef.current,
 resources: { scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef, heatCapacityRefreshPersistRef, scheduleHeatCapacitySemanticSceneCheckpointRef, persistWorkspaceLifecycleCheckpointRef },
 semantic: { window, heatCapacitySemanticCheckpointDebounceTimerRef, heatCapacitySemanticCheckpointMaxWaitTimerRef, desktopExitQuiescedRef, heatCapacityRefreshRestorePendingRef, heatCapacityModeTransitionStateRef, heatCapacityRuntimeFailureFileIdRef, filesRef, activeFileIdRef, heatCapacitySceneCheckpointProviderRef },
 lifecycle: { heatCapacityLifecycleFlushInProgressRef, heatCapacityLifecycleFlushPromiseRef, heatCapacityRefreshPersistRef, flushWorkspacePersistenceRef, filesRef, activeFileIdRef, heatCapacitySceneCheckpointProviderRef },
 });

  useWorkbenchHeatTeachingEffects(heatCapacityController.effects.teaching);

  useWorkbenchSemanticCheckpointCleanup(clearHeatCapacitySemanticCheckpointTimers);

  useWorkbenchHeatRestoreEffects(heatCapacityController.effects.restore);

  useWorkbenchLifecyclePersistence({ window, document, performance, heatCapacityLifecycleLastCompletedFlushAtMsRef, persistWorkspaceLifecycleCheckpointRef, prepareDesktopExitQuiescenceRef, resumeDesktopExitQuiescenceRef, selectedPanel, guideHeatCapacityStrongReminderActive, guideHeatCapacityStrongReminderControlId });

  useWorkbenchDesktopExitInputBlock(window, desktopExitInputBlockedRef);

  const {
    createEditSnapshot, pushUndoSnapshot, captureUndoSnapshot, undoLastEdit, redoLastEdit, clearEditHistory,
  } = createWorkbenchEditHistoryActions({
    filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, undoStackRef, redoStackRef,
    tutorialActiveRef, scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef,
    activeFileOwnsPendingHeatCapacityRefresh: (file) => activeFileOwnsPendingHeatCapacityRefresh(file),
    resolveDeferredHeatCapacityGuideUiCheckpoint: (file) => resolveDeferredHeatCapacityGuideUiCheckpoint(file),
    captureHeatCapacityModeSceneMetadata: (fileId) => captureHeatCapacityModeSceneMetadata(fileId),
    buildHeatCapacityModeUiCheckpoint: (file, now, guide) => buildHeatCapacityModeUiCheckpoint(file, now, guide),
    suspendActiveHeatCapacityModeForNavigation: () => suspendActiveHeatCapacityModeForNavigation(),
    activateHeatCapacityFileModeSession: (fileId) => activateHeatCapacityFileModeSession(fileId),
    commitWorkbenchFileCollections: (nextFiles, nextClosedFiles, nextActiveId) => commitWorkbenchFileCollections(nextFiles, nextClosedFiles, nextActiveId),
    setWorkbenchFiles: (update) => setWorkbenchFiles(update),
    reconcileRuntimeAfterFileRestore: (file) => reconcileRuntimeAfterFileRestore(file),
    reconcileRuntimesAfterRestore: (nextFiles) => reconcileRuntimesAfterRestore(nextFiles),
    clearEditRestoreTransientUi: () => clearEditRestoreTransientUi(),
    setSelectedPanel, setParametersCollapsed, setUndoStack, setRedoStack, setOpenTopMenu,
    guardWorkbenchTutorialAction: (action) => guardWorkbenchTutorialAction(action),
    pushLog, getLocalizedWorkbenchEditLabel,
  });

  const { cancelRuntimeFrame, createStandardRuntime, createIdealRuntime, prepareReopenedWorkbenchFile,
    getStandardRuntime, getIdealRuntime, reconcileRuntimesAfterRestore, reconcileRuntimeAfterFileRestore,
    initializeExistingRuntimes, disposeHardSphereRuntimeTimers } = createWorkbenchHardSphereRuntimeRegistry({
    window, filesRef, standardRuntimeRef, idealRuntimeRef,
    updateFileById: (fileId, update) => updateFileById(fileId, update),
  });

  const { clearEditRestoreTransientUi } = createWorkbenchEditRestoreCleanup({ setParameterInputDrafts, setParameterErrors, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible, setOpenFileMenuId, setPendingDeleteFileId, setPendingRemovePointId, setPendingClearRelationKey, cancelPistonOscillationFreeSetup, renamingFileIdRef, setRenamingFileId, setRenameDraft, setOpenTopMenu });

  useWorkbenchEditKeyboard({ activeHeatCapacityModalLocked, tutorialActiveRef, undoStack, redoStack, selectedPanel, undoLastEdit, redoLastEdit });

  const { startSidebarResize, startIdealResultWindowResize, getHeatCapacityMaterialsMaxHeightRatio, startStandardResultsResize, startHeatCapacityMaterialsResize, startLiveWorkspaceResize, startConsoleResize, saveCurrentWorkbenchLayoutAsDefault, resetLayout } = createWorkbenchLayoutActions({
    getView: () => ({ activeFile, workbenchLayoutDefaults, openTopMenu, leftSidebarWidth,
      parameterSidebarWidth, isWorkbenchEmpty, liveWorkspaceSplitRatio, consoleCollapsed, consoleHeightPx }),
    window, document, workspaceShellRef, workbenchBodyRef, sidebarResizeGhostRef,
    parameterSidebarResizeGhostRef, idealResultWindowRegionRef, centerWorkspaceRef, fileTabsRef,
    liveWorkspaceRef, liveWorkspaceResizeGhostRef, shellRef, consoleResizeGhostRef, resizeGhostFrameRef,
    consoleResizeRef, createEditSnapshot, pushUndoSnapshot, captureUndoSnapshot,
    updateActiveFile: (update) => updateActiveFile(update), setWorkbenchFiles: (update) => setWorkbenchFiles(update),
    setLeftSidebarWidth, setParameterSidebarWidth, setLiveWorkspaceResizing,
    setConsoleHeightPx, setWorkbenchLayoutDefaults, setOpenTopMenu, pushLog,
  });

  const { pauseRunningFilesExcept, scheduleStandardFrame, scheduleIdealFrame } = createWorkbenchHardSphereFrameLoop({
    window, desktopExitQuiescedRef, filesRef, standardRuntimeRef, idealRuntimeRef,
    updateFileById: (fileId, update) => updateFileById(fileId, update),
    updateRuntimeFileById: (fileId, update) => updateRuntimeFileById(fileId, update),
    cancelRuntimeFrame, pushLog,
  });

  const { prepareDesktopExitQuiescence, resumeDesktopExitQuiescence } = createWorkbenchDesktopExitQuiescence({ desktopExitQuiescedRef, desktopExitInputBlockedRef, setDesktopExitInputBlocked, filesRef, activeFileIdRef, heatCapacityModeTransitionDemoClockRef, desktopExitAutoDemoClockRef, autoDemoPhaseRef, heatCapacityAutoDemoStartedAtMsRef, pauseHeatCapacityModeTransitionRuntime, desktopExitQuiescedAtMsRef, setDesktopExitQuiesced, standardRuntimeRef, cancelRuntimeFrame, idealRuntimeRef, clearHeatCapacityAutoDemoTimers, pauseHeatCapacityTransientUiTimers, pauseHeatCapacityPressureAlertTimers, pauseGuideHeatCapacityReminderTimers, pauseHeatCapacityPumpAnimation, desktopExitPausedPressureAlarmRef, desktopExitPausedClosePumpValveReminderRef, heatCapacityRefreshRestorePendingRef, initialHeatCapacityRefreshSession, rebaseHeatCapacityFileForAutomaticSuspension, setFiles, heatCapacityRuntimeFailureFileIdRef, heatCapacityPressureAlarmVisibleRef, scheduleHeatCapacityPressureAlarmExpiry, scheduleHeatCapacityClosePumpValveReminder, resumeHeatCapacityPumpAnimation, resumeHeatCapacityTransientUiTimers, heatCapacityModeTransitionStateRef, scheduleHeatCapacityAutoDemoTimeline, heatCapacityAutoDemoTimelineRef, resumeHeatCapacityModeTransitionRuntime, heatCapacitySceneReadyFileIdRef, recoverHeatCapacityRuntimeIfReadyRef, scheduleStandardFrame, scheduleIdealFrame, scheduleWorkspacePersistenceRef, performance, Date });
  prepareDesktopExitQuiescenceRef.current = prepareDesktopExitQuiescence;
  resumeDesktopExitQuiescenceRef.current = resumeDesktopExitQuiescence;

  const { revertWorkbenchParameterInput, commitWorkbenchParameterInput, applyActiveFileParams, prepareActiveFileForRun, changeIdealRelation, applyIdealSamplingPreset, clearScanInputError, validateIdealScanDraft, updateIdealScanVariable, commitIdealScanInput, isPointerOnIdealScanThumb, requestRemoveIdealPoint, cancelRemoveIdealPoint, cancelClearIdealRelation, requestClearIdealRelation } = useWorkbenchExperimentParameterActions({
    parameters: {
    getActiveFile: () => activeFile,
    getParameterControlsLocked: () => parameterControlsLocked,
    getParametersDirty: () => parametersDirty,
    workbenchCopy, getLockedIdealControlledVariableKeys, showWorkbenchValidationErrors,
    captureUndoSnapshot, updateActiveFile: (update) => updateActiveFile(update),
    standardRuntimeRef, idealRuntimeRef, cancelRuntimeFrame, getStandardRuntime, getIdealRuntime,
    snapshotParticles, setParameterInputDrafts, setParameterErrors, pushLog,
  },
    ideal: {
    getActiveFile: () => activeFile, getParameterControlsLocked: () => parameterControlsLocked,
    getScanInputDraft: () => scanInputDraft, getPendingRemovePointId: () => pendingRemovePointId,
    getPendingClearRelationKey: () => pendingClearRelationKey,
    settingsLanguagePreference, captureUndoSnapshot,
    updateActiveFile: (update) => updateActiveFile(update),
     showWorkbenchValidationErrors,
    scanInputRef, lastScanInputErrorRef, deferInputFocus: (callback) => { window.setTimeout(callback, 0); },
    setPendingRemovePointId, setPendingClearRelationKey, setSamplingPresetMenuOpen,
    setScanInputError, setParameterErrors, setScanInputToast, setScanInputDraft, setScanInputFocused, pushLog,
  }
  });

  const { toggleActiveFileRunState, stopActiveFile } = createWorkbenchExperimentRunActions({
    getActiveFile: () => activeFile, getParametersDirty: () => parametersDirty,
    standardRuntimeRef, idealRuntimeRef, createStandardRuntime, createIdealRuntime, getStandardRuntime, getIdealRuntime,
    cancelRuntimeFrame, pauseRunningFilesExcept, scheduleStandardFrame, scheduleIdealFrame,
    prepareActiveFileForRun, applyActiveFileParams,
    updateActiveFile: (update) => updateActiveFile(update),
    flushWorkspaceAfterRunStateCommit: () => flushWorkspaceAfterRunStateCommit(),
    runHeatCapacityAutoDemo: () => runHeatCapacityAutoDemo(),
    pauseHeatCapacityAutoDemo: () => pauseHeatCapacityAutoDemo(),
    terminateHeatCapacityAutoDemo: () => terminateHeatCapacityAutoDemo(),
    setParameterErrors, setSamplingPresetMenuOpen, pushLog,
  });

  useWorkbenchHeatRecoveryEffects(heatCapacityController.effects.recovery);

  useWorkbenchHardSphereRuntimeInitialization(initializeExistingRuntimes);

  const { replaceVisibleWorkspaceWithExperimentTutorial } = createWorkbenchTutorialWorkspaceActions({
    workbenchLayoutDefaults,
    filesRef,
    cancelRuntimeFrame,
    standardRuntimeRef,
    idealRuntimeRef,
    resetHeatCapacitySceneUiState,
    clearPistonOscillationTutorialPlayback,
    selectedPanelRef,
    commitWorkbenchFileCollections,
    applyHeatCapacityModeTransitionEvent,
    setSelectedPanel,
    setSelectedFileId,
    setParametersCollapsed,
    setUndoStack,
    setRedoStack,
    undoStackRef,
    redoStackRef,
    setOpenFileMenuId,
    setPendingDeleteFileId,
    setHeatCapacityCalculationReviewOpen,
    clearPistonOscillationReviewWindows,
    setHeatCapacityBatchSetupRequestedFileId,
    setLogs,
    settingsLanguagePreference
  });

  const {
    startExperimentLearningTutorial,
    adoptWorkbenchTutorialOwnership
  } = createWorkbenchTutorialActivationActions({
    setTutorialOperationError,
    setTutorialNoticeKind,
    experienceProfileRef,
    tutorialActiveRef,
    setRemoteTutorialOwnerActive,
    tutorialOrdinaryWorkspaceRef,
    flushWorkspacePersistenceRef,
    settingsLanguagePreference,
    filesRef,
    activeFileIdRef,
    suspendActiveHeatCapacityModeForNavigation,
    closedFilesRef,
    selectedPanelRef,
    commitExperienceProfile,
    hideGeneralSettings,
    replaceVisibleWorkspaceWithExperimentTutorial,
    window,
    tutorialOwnershipAdoptionPendingRef,
  tutorialOwnershipClaimRef,
  tutorialNoticeKindRef,
  refreshTutorialOrdinaryWorkspaceFromPersistence,
  document,
  });
  tutorialOwnershipAdoptionRef.current = adoptWorkbenchTutorialOwnership;

  const { updateLearningNeedsAnswer, requestResetExperimentLearning, closeLearningExperienceOverlay, openProductIntroReplay, openLearningNeedsReselect, submitLearningNeedsReselect, requestSimulateFirstRun, requestExitExperimentLearningTutorial } = createWorkbenchTutorialOverlayActions({
    experienceProfileRef, learningNeedsDraft, setProductIntroReplayPhase, setLearningNeedsReselectOpen, setLearningNeedsDraft, setTutorialOperationError, settingsLanguagePreference, guardWorkbenchTutorialAction, requestPromptConfirmation,
    startExperimentLearningTutorial: (...args) => startExperimentLearningTutorial(...args),
    exitExperimentLearningTutorial: () => exitExperimentLearningTutorial(),
    commitExperienceProfile, prepareDesktopExitQuiescenceRef, resumeDesktopExitQuiescenceRef, flushWorkspacePersistenceRef, hideGeneralSettings, window, isDevelopment: import.meta.env.DEV,
  });

  const { handleExperimentTutorialNoticeAction } = useWorkbenchTutorialProgress({
    tutorialNoticeKindRef,
    setTutorialNoticeKind,
    experienceProfileRef,
    setTutorialOperationError,
    tutorialGuideUnlockPendingRef,
    tutorialActive,
    activeTutorialExperiment,
    experienceProfile,
    commitExperienceProfile,
    setLogs,
    settingsLanguagePreference,
    activateHeatCapacityModeFromExplore,
    activatePistonOscillationTutorialMode,
    switchHeatCapacityMode,
    activeFile,
    heatCapacityModeTransitionState,
    window,
    completeExperimentLearningTutorial: (experiment) => completeExperimentLearningTutorial(experiment),
  });

  const { completeExperimentLearningTutorial, exitExperimentLearningTutorial } = createWorkbenchTutorialHandoffActions({
    setTutorialOperationError,
    setTutorialNoticeKind,
    tutorialNoticeKindRef,
    tutorialOrdinaryWorkspaceRef,
    experienceProfilePersistedRef,
    experienceProfileRef,
    tutorialActiveRef,
    setExperienceProfile,
    experimentLearningChannelRef,
    workbenchLayoutDefaults,
    resetHeatCapacitySceneUiState,
    clearPistonOscillationTutorialPlayback,
    selectedPanelRef,
    commitWorkbenchFileCollections,
    applyHeatCapacityModeTransitionEvent,
    setSelectedPanel,
    setSelectedFileId,
    setParametersCollapsed,
    setLogs,
    settingsLanguagePreference,
    flushWorkspacePersistenceRef,
    commitExperienceProfile,
    replaceVisibleWorkspaceWithExperimentTutorial,
    issuedWorkbenchFileIdsRef,
    suspendActiveHeatCapacityModeForNavigation,
    hideGeneralSettings,
    window
  });

  const { createFile, requestCloseWorkbenchFile, openClosedWorkbenchFile, requestDeleteWorkbenchFile, cancelDeleteWorkbenchFile, selectFile, beginRenameFile, selectRenameNumericSuffix, commitRenameFile, cancelRenameFile, commitRenameFileFromOutside } = useWorkbenchFileActions({
    lifecycle: {
    getActiveFile: () => activeFile, getPendingDeleteFileId: () => pendingDeleteFileId,
    filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, issuedWorkbenchFileIdsRef,
    renamingFileIdRef, standardRuntimeRef, idealRuntimeRef, workbenchLayoutDefaults, workbenchPromptCopy,
    captureUndoSnapshot, guardWorkbenchTutorialAction, createStandardRuntime, createIdealRuntime,
    snapshotParticles, cancelRuntimeFrame, prepareReopenedWorkbenchFile,
    suspendActiveHeatCapacityModeForNavigation: () => suspendActiveHeatCapacityModeForNavigation(),
    releaseHeatCapacityRuntimeForFileExit: (fileId) => releaseHeatCapacityRuntimeForFileExit(fileId),
    activateHeatCapacityFileModeSession: (fileId) => activateHeatCapacityFileModeSession(fileId),
    commitWorkbenchFileCollections: (nextFiles, nextClosedFiles, nextActiveId) => commitWorkbenchFileCollections(nextFiles, nextClosedFiles, nextActiveId),
    heatCapacityRefreshPersistRef, flushWorkspacePersistenceRef, requestPromptConfirmation,
    setFiles, setSelectedFileId, setSelectedPanel, setLeftCollapsed, setParametersCollapsed,
    setParameterErrors, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible,
    setOpenTopMenu, setOpenFileMenuId, setPendingDeleteFileId, setPendingRemovePointId,
    setPendingClearRelationKey, setRenamingFileId, setSamplingPresetMenuOpen, pushLog,
  },
    rename: {
    getFiles: () => files, getRenameDraft: () => renameDraft,
    filesRef, renamingFileIdRef, renameSelectionModeRef, guardWorkbenchTutorialAction,
    captureUndoSnapshot, updateFileById: (fileId, update) => updateFileById(fileId, update),
    setOpenFileMenuId, setPendingDeleteFileId, setRenamingFileId, setRenameDraft, pushLog,
  }
  });

  const { openNewWorkbenchWindow, closeDesktopWindow, openUserGuide } = createWorkbenchDesktopNavigationActions({ window, guardWorkbenchTutorialAction, setOpenTopMenu, getFreshWorkbenchWindowUrl, tutorialActiveRef, settingsLanguagePreference, requestPromptConfirmation });

  const getLocalizedTreeState = (state: 'locked' | 'shown' | 'open' | 'active' | 'off') => workbenchCopy.files[state];

  const {
    handleLockedPanel,
    setActiveIdealResultTab,
    openIdealResultsWindow,
    openIdealResultWindow,
    closeIdealResultsWindow,
    closeIdealResultTab,
    setActiveStandardResultsTab,
    openStandardResultsWindow,
    closeStandardResultsTab,
    getHeatCapacityPanelDisplayDefinition,
    getHeatCapacityTabDefinition,
    getHeatCapacityTabState,
    activateHeatCapacityTab,
    openHeatCapacityTab,
    openAllHeatCapacityMaterialsTabs,
    closeHeatCapacityTab,
    closeHeatCapacityMaterialsWindow,
    openPanel,
    closePanel,
    isWindowPanelVisible,
    toggleWindowPanel,
    toggleWindowIdealResultTab,
    toggleWindowStandardResultsTab,
    runWindowMenuSwitch,
    selectResultsSection,
    getIdealResultTabState,
    getStandardResultsTabState,
    toggleHeatCapacityMaterialsExpanded, togglePistonOscillationMaterialsExpanded,
  } = createWorkbenchWindowActions({
    getActiveFile: () => activeFile,
    getSelectedPanel: () => selectedPanel,
    workbenchLayoutDefaults, availablePanels, idealResultWindowPanels, resultsSections,
    heatCapacityRealtimeCopy, setSelectedPanel, setResultsChildrenCollapsed, setOpenTopMenu,
    updateActiveFile: (update) => updateActiveFile(update),
    setWorkbenchFiles: (update) => setWorkbenchFiles(update),
    captureUndoSnapshot: (label, scope) => captureUndoSnapshot(label, scope),
    guardWorkbenchTutorialAction: (action) => guardWorkbenchTutorialAction(action),
    pushLog, getLocalizedWorkbenchPanelTitle, createIdealPanels, createResultsSections,
  });

  useWorkbenchFileMenuInteractions({
    openTopMenu, openFileMenuId, renamingFileId, renameDraft,
    topMenuRef, topCommandsRef, fileMenuRef, fileMenuButtonRef, renameInputRef,
    setOpenTopMenu, setOpenFileMenuId, setPendingDeleteFileId,
    commitRenameFileFromOutside: () => commitRenameFileFromOutside(),
  });

  const renderWorkbenchParameterSymbol = (parts: WorkbenchParameterSymbolPart[]) => (
    <WorkbenchParameterSymbol
      parts={parts}
    />
  );

  const renderWorkbenchParameterHelpButton = (parameterId: string, modelEffect: string) => (
    <WorkbenchSimulationParameterHelp
      parameterId={parameterId}
      modelEffect={modelEffect}
      visibleHeatCapacityParamHelpId={visibleHeatCapacityParamHelpId}
      renderHeatCapacityTooltipPopover={renderHeatCapacityTooltipPopover}
      hoverHeatCapacityParameterHelp={hoverHeatCapacityParameterHelp}
      pinHeatCapacityParameterHelp={pinHeatCapacityParameterHelp}
      hideHeatCapacityHoverTooltip={hideHeatCapacityHoverTooltip}
      pinnedHeatCapacityParamHelpId={pinnedHeatCapacityParamHelpId}
    />
  );

  const renderWorkbenchParameterInputRow = (param: WorkbenchParameterRow) => (
    <WorkbenchSimulationParameterRow
      key={param.label}
      param={param}
      workbenchCopy={workbenchCopy}
      parameterControlsLocked={parameterControlsLocked}
      isIdealControlledVariableLocked={isIdealControlledVariableLocked}
      controlledVariableLockHint={controlledVariableLockHint}
      parameterInputDrafts={parameterInputDrafts}
      settingsLanguagePreference={settingsLanguagePreference}
      renderWorkbenchParameterSymbol={renderWorkbenchParameterSymbol}
      renderWorkbenchParameterHelpButton={renderWorkbenchParameterHelpButton}
      setParameterInputDrafts={setParameterInputDrafts}
      setParameterErrors={setParameterErrors}
      commitWorkbenchParameterInput={commitWorkbenchParameterInput}
      revertWorkbenchParameterInput={revertWorkbenchParameterInput}
    />
  );

  const renderHeatCapacityParameterHelpButton = (parameterId: string, modelEffect: string) => (
    <WorkbenchHeatCapacityParameterHelp
      parameterId={parameterId}
      modelEffect={modelEffect}
      visibleHeatCapacityParamHelpId={visibleHeatCapacityParamHelpId}
      renderHeatCapacityTooltipPopover={renderHeatCapacityTooltipPopover}
      hoverHeatCapacityParameterHelp={hoverHeatCapacityParameterHelp}
      pinHeatCapacityParameterHelp={pinHeatCapacityParameterHelp}
      hideHeatCapacityHoverTooltip={hideHeatCapacityHoverTooltip}
      pinnedHeatCapacityParamHelpId={pinnedHeatCapacityParamHelpId}
    />
  );

  const renderHeatCapacityParameterLabel = (parameterId: string, label: string, parts: HeatCapacityFreeParameterSymbolPart[], modelEffect: string) => (
    <WorkbenchHeatCapacityParameterLabel
      parameterId={parameterId}
      label={label}
      parts={parts}
      modelEffect={modelEffect}
      renderHeatCapacityParameterHelpButton={renderHeatCapacityParameterHelpButton}
    />
  );

  const renderHeatCapacityFreeNumberInputRow = (definition: HeatCapacityFreeNumberParameterDefinition, draft: HeatCapacityFreeParameterDraft, scope: 'basic' | 'advanced', disabled: boolean) => (
    <WorkbenchHeatCapacityNumberParameterRow
      key={`${scope}-${definition.id}`}
      definition={definition}
      draft={draft}
      scope={scope}
      disabled={disabled}
      heatCapacityBasicInputDrafts={heatCapacityBasicInputDrafts}
      heatCapacityAdvancedInputDrafts={heatCapacityAdvancedInputDrafts}
      heatCapacityBasicInputErrors={heatCapacityBasicInputErrors}
      heatCapacityAdvancedInputErrors={heatCapacityAdvancedInputErrors}
      settingsLanguagePreference={settingsLanguagePreference}
      renderHeatCapacityParameterLabel={renderHeatCapacityParameterLabel}
      changeHeatCapacityParameterInputDraft={changeHeatCapacityParameterInputDraft}
      commitHeatCapacityBasicParameterInput={commitHeatCapacityBasicParameterInput}
    />
  );

  const renderHeatCapacityFreeCheckboxRow = (definition: HeatCapacityFreeCheckboxDefinition, checked: boolean, disabled: boolean) => (
    <WorkbenchHeatCapacityCheckboxParameterRow
      key={definition.id}
      definition={definition}
      checked={checked}
      disabled={disabled}
      settingsLanguagePreference={settingsLanguagePreference}
      renderHeatCapacityParameterLabel={renderHeatCapacityParameterLabel}
      setHeatCapacityBasicCheckbox={setHeatCapacityBasicCheckbox}
    />
  );

  const renderHeatCapacityFreeGasTypeRow = () => (
    <WorkbenchHeatCapacityGasParameterRow
      activeFile={activeFile}
      settingsLanguagePreference={settingsLanguagePreference}
      showHeatCapacityGasTypeLockHint={showHeatCapacityGasTypeLockHint}
      setHeatCapacityFreeGasType={setHeatCapacityFreeGasType}
      renderHeatCapacityTooltipAnchor={renderHeatCapacityTooltipAnchor}
    />
  );

  const renderHeatCapacityBasicParameterRows = () => (
    <WorkbenchHeatCapacityBasicParameters
      activeFile={activeFile}
      activeHeatCapacityNextScheme={activeHeatCapacityNextScheme}
      settingsLanguagePreference={settingsLanguagePreference}
      activeHeatCapacityFreeSchemeLocked={activeHeatCapacityFreeSchemeLocked}
      activeHeatCapacityFreeIdealReadonly={activeHeatCapacityFreeIdealReadonly}
      activeHeatCapacityFreeParameterLockMessage={activeHeatCapacityFreeParameterLockMessage}
      activeHeatCapacityFreeParameterLocked={activeHeatCapacityFreeParameterLocked}
      renderHeatCapacityTooltipAnchor={renderHeatCapacityTooltipAnchor}
      requestToggleHeatCapacityFreeParameterScheme={requestToggleHeatCapacityFreeParameterScheme}
      activeHeatCapacityFreeParameterInputDisabled={activeHeatCapacityFreeParameterInputDisabled}
      openHeatCapacityRestoreDefaultConfirm={openHeatCapacityRestoreDefaultConfirm}
      renderHeatCapacityFreeGasTypeRow={renderHeatCapacityFreeGasTypeRow}
      renderHeatCapacityFreeNumberInputRow={renderHeatCapacityFreeNumberInputRow}
      renderHeatCapacityFreeCheckboxRow={renderHeatCapacityFreeCheckboxRow}
    />
  );

  const renderHeatCapacityFreeParameterPanel = () => (
    <WorkbenchHeatCapacityParameters
      activeFile={activeFile}
      activeHeatCapacityFreeParameterLocked={activeHeatCapacityFreeParameterLocked}
      activeHeatCapacityFreeIdealReadonly={activeHeatCapacityFreeIdealReadonly}
      showHeatCapacityFreeParameterLockHint={showHeatCapacityFreeParameterLockHint}
      renderHeatCapacityBasicParameterRows={renderHeatCapacityBasicParameterRows}
      renderHeatCapacityTooltipAnchor={renderHeatCapacityTooltipAnchor}
      activeHeatCapacityFreeParameterLockMessage={activeHeatCapacityFreeParameterLockMessage}
      settingsLanguagePreference={settingsLanguagePreference}
      openHeatCapacityAdvancedSettings={openHeatCapacityAdvancedSettings}
    />
  );

  const renderHeatCapacityAdvancedParameterDialog = () => (
    <WorkbenchHeatCapacityAdvancedParameters
      heatCapacityAdvancedOpen={heatCapacityAdvancedOpen}
      activeFile={activeFile}
      heatCapacityAdvancedDraft={heatCapacityAdvancedDraft}
      settingsLanguagePreference={settingsLanguagePreference}
      activeHeatCapacityFreeIdealReadonly={activeHeatCapacityFreeIdealReadonly}
      workbenchCopy={workbenchCopy}
      cancelHeatCapacityAdvancedParameterDraft={cancelHeatCapacityAdvancedParameterDraft}
      renderHeatCapacityFreeNumberInputRow={renderHeatCapacityFreeNumberInputRow}
      saveHeatCapacityAdvancedParameterDraft={saveHeatCapacityAdvancedParameterDraft}
      acknowledgeHeatCapacityFreeAdvancedRisk={acknowledgeHeatCapacityFreeAdvancedRisk}
    />
  );

  const renderIdealControls = () => (
    <WorkbenchIdealControls
      activeFile={activeFile}
      scanInputFocused={scanInputFocused}
      scanInputDraft={scanInputDraft}
      workbenchCopy={workbenchCopy}
      scanSliderThumbHover={scanSliderThumbHover}
      scanSliderDragging={scanSliderDragging}
      scanInputError={scanInputError}
      parameterControlsLocked={parameterControlsLocked}
      changeIdealRelation={changeIdealRelation}
      scanInputRef={scanInputRef}
      setScanInputFocused={setScanInputFocused}
      setScanInputDraft={setScanInputDraft}
      validateIdealScanDraft={validateIdealScanDraft}
      commitIdealScanInput={commitIdealScanInput}
      clearScanInputError={clearScanInputError}
      setScanSliderThumbHover={setScanSliderThumbHover}
      isPointerOnIdealScanThumb={isPointerOnIdealScanThumb}
      setScanSliderDragging={setScanSliderDragging}
      updateIdealScanVariable={updateIdealScanVariable}
      samplingPresetSelectRef={samplingPresetSelectRef}
      samplingPresetMenuOpen={samplingPresetMenuOpen}
      setSamplingPresetMenuOpen={setSamplingPresetMenuOpen}
      applyIdealSamplingPreset={applyIdealSamplingPreset}
    />
  );

  const renderHeatCapacityModeControl = () => (
    <WorkbenchHeatCapacityModeControl
      autoDemoPhase={autoDemoPhase}
      activeFile={activeFile}
      experienceProfile={experienceProfile}
      tutorialActive={tutorialActive}
      activeTutorialExperiment={activeTutorialExperiment}
      heatCapacityResetFeedbackActionId={heatCapacityResetFeedbackActionId}
      heatCapacityModeTransitionLocked={heatCapacityModeTransitionLocked}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      exitHeatCapacityGuideMode={exitHeatCapacityGuideMode}
      exitCompletedHeatCapacityTeachingMode={exitCompletedHeatCapacityTeachingMode}
      runHeatCapacityAutoDemo={runHeatCapacityAutoDemo}
      pauseHeatCapacityAutoDemo={pauseHeatCapacityAutoDemo}
      terminateHeatCapacityAutoDemo={terminateHeatCapacityAutoDemo}
      resetHeatCapacityGuideExperiment={resetHeatCapacityGuideExperiment}
      settingsLanguagePreference={settingsLanguagePreference}
      exitHeatCapacityFormalModeToExplore={exitHeatCapacityFormalModeToExplore}
      heatCapacityModeTransitionState={heatCapacityModeTransitionState}
      handleHeatCapacityModeSegmentClick={handleHeatCapacityModeSegmentClick}
      openHeatCapacityLessonIntro={openHeatCapacityLessonIntro}
    />
  );

  const renderPistonOscillationModeControl = () => (
    <WorkbenchPistonOscillationModeControl
      activeFile={activeFile}
      tutorialActive={tutorialActive}
      activeTutorialExperiment={activeTutorialExperiment}
      experienceProfile={experienceProfile}
      pistonModeControl={pistonModeControl}
      pistonOscillationDemoPlayback={pistonOscillationDemoPlayback}
      pistonOscillationGuideResetFeedback={pistonOscillationGuideResetFeedback}
      pistonOscillationCopy={pistonOscillationCopy}
      openPistonOscillationGuideLessonIntro={openPistonOscillationGuideLessonIntro}
    />
  );

  const renderPistonOscillationGuideStepPanel = () => {
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation'
      || (
        activeFile.pistonOscillationGuideSession.status !== 'active'
        && activeFile.pistonOscillationGuideSession.status !== 'completed'
      )
      || !activePistonOscillationGuideSelected
      || activePistonOscillationDemoPlaybackPhase !== 'idle'
    ) return null;
    const guideSession = activeFile.pistonOscillationGuideSession;
    if (
      guideSession.step === 'periodProcessing'
      || guideSession.step === 'calculationReady'
      || guideSession.step === 'completionReview'
    ) return null;
    return (
    <WorkbenchPistonOscillationGuideSteps
      activeFile={activeFile}
      activePistonOscillationGuideSelected={activePistonOscillationGuideSelected}
      activePistonOscillationDemoPlaybackPhase={activePistonOscillationDemoPlaybackPhase}
      pistonOscillationCopy={pistonOscillationCopy}
      pistonOscillationGuideChecklistViewedIndex={pistonOscillationGuideChecklistViewedIndex}
      handlePistonOscillationGuideChecklistWheel={handlePistonOscillationGuideChecklistWheel}
      handlePistonOscillationGuideChecklistKeyDown={handlePistonOscillationGuideChecklistKeyDown}
      pistonOscillationGuideChecklistTrackRef={pistonOscillationGuideChecklistTrackRef}
      pistonOscillationGuideChecklistVisualOffsetRef={pistonOscillationGuideChecklistVisualOffsetRef}
    />
  );
  };

  const renderPistonOscillationGuideLessonOverlay = () => {
    if (
      !pistonOscillationGuideLessonDialog
      || pistonOscillationGuideLessonDialog.fileId !== activeFile.id
    ) return null;
    const lessonView = getPistonOscillationGuideLessonView(
      pistonOscillationGuideLessonDialog,
    );
    if (!lessonView) return null;
    return (
    <WorkbenchPistonOscillationGuideLesson
      pistonOscillationGuideLessonDialog={pistonOscillationGuideLessonDialog}
      activeFile={activeFile}
      getPistonOscillationGuideLessonView={getPistonOscillationGuideLessonView}
      advancePistonOscillationGuideLessonDialog={advancePistonOscillationGuideLessonDialog}
      pistonOscillationGuideLessonDialogRef={pistonOscillationGuideLessonDialogRef}
      pistonOscillationCopy={pistonOscillationCopy}
      handlePistonOscillationGuideLessonDialogKeyDown={handlePistonOscillationGuideLessonDialogKeyDown}
      closePistonOscillationGuideLessonDialog={closePistonOscillationGuideLessonDialog}
      pistonOscillationGuideLessonOutgoingView={pistonOscillationGuideLessonOutgoingView}
    />
  );
  };

  const pistonOscillationGuideStepPanel = renderPistonOscillationGuideStepPanel();
  const pistonOscillationGuideLessonOverlay = renderPistonOscillationGuideLessonOverlay();

  const showWorkbenchSimulationPreviewNotification = createWorkbenchSimulationPreviewNotification(workbenchTranslation, (...args) => pushLog(...args));

  const renderPreviewPanel = () => (
    <WorkbenchPreviewFrame kind={activeFile.kind} metrics={activeFile.kind === 'heatCapacity' || activeFile.kind === 'heatCapacityPistonOscillation' ? null : (
      <WorkbenchSimulationMetrics
      workbenchCopy={workbenchCopy}
      activeFile={activeFile}
    />
      )}>

        {activeFile.kind === 'heatCapacity' ? (
          <WorkbenchHeatCapacityPreview
            mountAria={activeHeatCapacityPreviewMountAria}
            interactionLocked={autoDemoInteractionLocked}
            onLockedPointer={scheduleHeatCapacityAutoDemoLockedPointerToast}
          >
            {(() => {
              const { heatCapacityTeachingCompleted, activeHeatCapacityDisplay, heatCapacityDisplayPhase, activeGuideRecordKind, getGuideRecordLabel, freeRecordU0ButtonState, freeRecordU1ButtonState, freeRecordU2ButtonState, freeRecordControlsVisible } = deriveWorkbenchHeatPreviewRecords({ activeFile, guideHeatCapacityActiveFileId, autoDemoInteractionLocked, heatCapacityRealtimeCopy });

              const heatCapacityDemoStepPanel = !activeHeatCapacityModalLocked && autoDemoStepPanelMode !== 'hidden' && (autoDemoRunning || autoDemoPaused || autoDemoStepTitle) ? (
                <WorkbenchHeatCapacityDemoSteps
      autoDemoStepPanelMode={autoDemoStepPanelMode}
      autoDemoRunning={autoDemoRunning}
      autoDemoPaused={autoDemoPaused}
      autoDemoStepIndex={autoDemoStepIndex}
      autoDemoStepCount={autoDemoStepCount}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      autoDemoStepTitle={autoDemoStepTitle}
      autoDemoStepDescription={autoDemoStepDescription}
      autoDemoStepTarget={autoDemoStepTarget}
      autoDemoStepProgressCriterion={autoDemoStepProgressCriterion}
      autoDemoStepNote={autoDemoStepNote}
    />
              ) : null;
              const heatCapacityGuideProcessPromptBlocked = activeHeatCapacityPressureAlarmVisible ||
                autoDemoCompletionMessage ||
                autoDemoInteractionLocked ||
                activeHeatCapacityModalLocked;
              const heatCapacityGuideStepPanel = heatCapacityGuideProcessPromptBlocked
                ? null
                : (
                  guideHeatCapacityActiveFileId === activeFile.id &&
                  activeFile.heatCapacityMode === 'guide' &&
                  activeHeatCapacityGuideStep !== 'idle' &&
                  activeHeatCapacityGuideStep !== 'completed'
                )
                  ? <WorkbenchHeatCapacityGuideSteps
      activeHeatCapacityGuideStep={activeHeatCapacityGuideStep}
      heatCapacityGuideChecklistViewedIndex={heatCapacityGuideChecklistViewedIndex}
      getGuideStepGuidance={getGuideStepGuidance}
      activeFile={activeFile}
      HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX={HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX}
      HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX={HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX}
      heatCapacityGuideChecklistVisualOffsetRef={heatCapacityGuideChecklistVisualOffsetRef}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      settingsLanguagePreference={settingsLanguagePreference}
      handleHeatCapacityGuideChecklistWheel={handleHeatCapacityGuideChecklistWheel}
      heatCapacityGuideChecklistTrackRef={heatCapacityGuideChecklistTrackRef}
      activeGuideRecordKind={activeGuideRecordKind}
      guideHeatCapacityPulseActive={guideHeatCapacityPulseActive}
      guideHeatCapacityFocusControlId={guideHeatCapacityFocusControlId}
      recordHeatCapacityGuideSample={recordHeatCapacityGuideSample}
      getGuideRecordLabel={getGuideRecordLabel}
    />
                  : null;
              const heatCapacityTopRightOverlay = heatCapacityDemoStepPanel || heatCapacityGuideStepPanel ? (
                <div className="studio-heat-top-right-stack" data-heat-capacity-top-right-stack="true">
                  {heatCapacityDemoStepPanel}
                  {!heatCapacityDemoStepPanel ? heatCapacityGuideStepPanel : null}
                </div>
              ) : null;
              const { heatCapacityActiveSpeedMultiplier, heatCapacityAutoDemoZeroKnobMotion, heatCapacityAutoDemoWaitTimer, heatCapacityWaitTimer, heatCapacityWaitTimerDisplay, heatCapacitySpeedOptionsDisabled } = deriveWorkbenchHeatPreviewWait({ activeFile, autoDemoRunning, heatCapacityRefreshRestoring, initialHeatCapacityRefreshSession, desktopExitQuiesced, desktopExitAutoDemoClockRef, autoDemoTimelineClockMs, heatCapacityAutoDemoStartedAtMsRef, autoDemoPaused, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoTimelineRef, heatCapacityRealtimeCopy });

              const heatCapacityTopCenterOverlay = !activeHeatCapacityModalLocked &&
                heatCapacityWaitTimerDisplay &&
                heatCapacityWaitTimer
                ? (
                    <WorkbenchHeatCapacityWaitOverlay
      heatCapacityAutoDemoWaitTimer={heatCapacityAutoDemoWaitTimer}
      activeFile={activeFile}
      heatCapacityWaitTimer={heatCapacityWaitTimer}
      heatCapacityWaitTimerDisplay={heatCapacityWaitTimerDisplay}
      heatCapacityActiveSpeedMultiplier={heatCapacityActiveSpeedMultiplier}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      heatCapacitySpeedOptionsDisabled={heatCapacitySpeedOptionsDisabled}
      updateHeatCapacityFreeEquilibriumSpeedMultiplier={updateHeatCapacityFreeEquilibriumSpeedMultiplier}
    />
                  )
                : null;

              const heatCapacityBottomRightOverlay = activeHeatCapacityModalLocked ? null : (
                <WorkbenchHeatCapacityRecordControls
      activeFile={activeFile}
      freeRecordControlsVisible={freeRecordControlsVisible}
      freeRecordU0ButtonState={freeRecordU0ButtonState}
      recordFreeHeatCapacitySample={recordFreeHeatCapacitySample}
      freeRecordU1ButtonState={freeRecordU1ButtonState}
      freeRecordU2ButtonState={freeRecordU2ButtonState}
      getHeatCapacityGuideStep={getHeatCapacityGuideStep}
      guideHeatCapacityActiveFileId={guideHeatCapacityActiveFileId}
      autoDemoInteractionLocked={autoDemoInteractionLocked}
      heatCapacityRecordControlsClosing={heatCapacityRecordControlsClosing}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      guideHeatCapacityPulseActive={guideHeatCapacityPulseActive}
      guideHeatCapacityFocusControlId={guideHeatCapacityFocusControlId}
      recordHeatCapacityGuideSample={recordHeatCapacityGuideSample}
    />
              );
              const heatCapacityCenterOverlay = (
                <WorkbenchHeatCapacityCenterFeedback
      activeHeatCapacityPreheatLocked={activeHeatCapacityPreheatLocked}
      activeFile={activeFile}
      activeHeatCapacityPreheatMode={activeHeatCapacityPreheatMode}
      settingsLanguagePreference={settingsLanguagePreference}
      heatCapacityRefreshRestoring={heatCapacityRefreshRestoring}
      heatCapacityModeTransitionLocked={heatCapacityModeTransitionLocked}
      autoDemoPaused={autoDemoPaused}
      completeActiveHeatCapacityPreheat={completeActiveHeatCapacityPreheat}
      activeHeatCapacityInvalidAttemptPrompt={activeHeatCapacityInvalidAttemptPrompt}
      restartHeatCapacityFreeExperiment={restartHeatCapacityFreeExperiment}
      continueHeatCapacityInvalidAttempt={continueHeatCapacityInvalidAttempt}
      activeHeatCapacityModalLocked={activeHeatCapacityModalLocked}
      activeHeatCapacityPressureAlarmVisible={activeHeatCapacityPressureAlarmVisible}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      autoDemoCompletionMessage={autoDemoCompletionMessage}
      heatCapacityToastCurrent={heatCapacityToastCurrent}
    />
              );
              const heatCapacityBottomCenterOverlay = null;
              const { heatCapacityGuideStrongTargetSpec, heatCapacityGuideFocusMode, heatCapacityGuideCutouts, heatCapacityGuideDimPath, heatCapacityGuideStrongReminderText } = deriveWorkbenchHeatPreviewGuideMask({ guideHeatCapacityStrongReminderActive, guideHeatCapacityStrongReminderControlId, heatCapacityGuideProjectedHoles, heatCapacityGuideMaskRef, heatCapacityGuideMaskBounds, heatCapacityRealtimeCopy });

              const heatCapacityGuideStrongMaskOverlay = heatCapacityGuideStrongTargetSpec ? (
                <WorkbenchHeatCapacityStrongMask
      heatCapacityGuideMaskRef={heatCapacityGuideMaskRef}
      heatCapacityGuideStrongTargetSpec={heatCapacityGuideStrongTargetSpec}
      heatCapacityGuideMaskBounds={heatCapacityGuideMaskBounds}
      heatCapacityGuideDimPath={heatCapacityGuideDimPath}
      heatCapacityGuideCutouts={heatCapacityGuideCutouts}
      heatCapacityGuideStrongReminderText={heatCapacityGuideStrongReminderText}
    />
              ) : null;
              const heatCapacityGuideLessonOverlay = renderHeatCapacityGuideLessonOverlay();
              const heatCapacityPreheatLockOverlay = activeHeatCapacityModalLocked ? (
                <WorkbenchHeatCapacityPreheatLock
      activeHeatCapacityPreheatLocked={activeHeatCapacityPreheatLocked}
    />
              ) : null;
              const heatCapacityGuideMaskOverlay = heatCapacityPreheatLockOverlay || heatCapacityGuideStrongMaskOverlay || heatCapacityGuideLessonOverlay ? (
                <WorkbenchHeatCapacityGuideMask
      heatCapacityPreheatLockOverlay={heatCapacityPreheatLockOverlay}
      heatCapacityGuideStrongMaskOverlay={heatCapacityGuideStrongMaskOverlay}
      heatCapacityGuideLessonOverlay={heatCapacityGuideLessonOverlay}
    />
              ) : null;
              const { heatCapacityHardSphereGasTemperatureK, heatCapacityHardSphereAmbientTemperatureK, heatCapacityHardSphereGasAmountRatio, releaseFlowActive, releaseAudioPathOpen, heatCapacityHardSphereReleaseTimeline, pumpFlowIntensity, pumpFlowActive, heatCapacityHardSpherePaused, localizedHeatCapacityPumpHint, modeSceneRestoreSession, modeSceneCameraPose, modeSceneFocusMode, modeSceneCameraTransition, modeSceneUltraVisualState, modeSceneHardSphereCheckpoint } = deriveWorkbenchHeatPreviewPhysics({ normalizeHeatCapacityCameraTransitionState, normalizeHeatCapacityUltraVisualState, normalizeHeatCapacityHardSphereVisualCheckpoint, activeFile, desktopExitQuiesced, heatCapacityRefreshRestoring, heatCapacityRuntimeFailureFileId, heatCapacityLessonDialogActive, autoDemoPaused, settingsLanguagePreference, heatCapacityModeSceneRestoreSession, heatCapacityQualityProfile });

              return (
                <WorkbenchHeatCapacityInstrumentView
                    key={activeFile.id}
                    readings={deriveWorkbenchHeatSceneReadings({ activeFile, heatCapacityAutoDemoZeroKnobMotion, heatCapacityHardSphereGasAmountRatio, heatCapacityHardSphereGasTemperatureK, heatCapacityHardSphereAmbientTemperatureK, heatCapacityPumpPulseId, heatCapacityRecordPulseId, localizedHeatCapacityPumpHint, heatCapacityDisplayPhase, activeHeatCapacityPreheatLocked, activeHeatCapacityDisplay })}
                    visuals={deriveWorkbenchHeatSceneVisuals({ settingsPerformanceMode, resolvedWorkbenchTheme, settingsLanguagePreference, autoDemoInteractionLocked, releaseFlowActive, releaseAudioPathOpen, heatCapacityHardSphereReleaseTimeline, pumpFlowActive, pumpFlowIntensity, activeFile, heatCapacityModeTransitionLocked, heatCapacityQualityProfile, heatCapacityHardSphereVisualResetKey, heatCapacityHardSpherePaused, activeHeatCapacityModalLocked, heatCapacityTeachingCompleted, activeHeatCapacityCurrentGroup, guideHeatCapacityFocusControlId, demoFocusControlId, demoFocusPulseActive, guideHeatCapacityPulseActive, demoCameraFocusMode, demoCameraFocusKey, guideHeatCapacityRollback, heatCapacityFocusResetKey, heatCapacityGuideFocusMode, guideHeatCapacityStrongReminderFocusKey, heatCapacityGuideStrongTargetSpec })}
                    restoration={deriveWorkbenchHeatSceneRestoreView({ modeSceneRestoreSession, modeSceneCameraPose, heatCapacityInitialSceneRestoreEnabled, initialHeatCapacityRefreshSession, activeFile, initialHeatCapacityCameraPose, modeSceneFocusMode, initialHeatCapacityFocusMode, modeSceneCameraTransition, initialHeatCapacityCameraTransition, modeSceneUltraVisualState, initialHeatCapacityUltraVisualState, modeSceneHardSphereCheckpoint, initialHeatCapacityHardSphereVisualCheckpoint, heatCapacitySceneRestoreAcknowledged, heatCapacityModeSceneRestoreRequest, heatCapacityModeTransitionLocked, HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS, desktopExitQuiesced, heatCapacityModeTransitionState, HEAT_CAPACITY_REFRESH_SCENE_REVISION, resolvedWorkbenchTheme, settingsPerformanceMode })}
                    overlays={{
        overlayTopCenter: heatCapacityTopCenterOverlay,
        overlayTopRight: heatCapacityTopRightOverlay,
        overlayBelowDefaultView: activeFile.heatCapacityMode === 'free' && (activeHeatCapacityCurrentGroup === null || activeHeatCapacityFreeBatchProgress?.currentGroupNumber !== null) ? (<WorkbenchHeatCapacityExperimentProgress
      activeFile={activeFile}
      activeHeatCapacityCurrentGroup={activeHeatCapacityCurrentGroup}
      activeHeatCapacityFreeBatchProgress={activeHeatCapacityFreeBatchProgress}
      settingsLanguagePreference={settingsLanguagePreference}
      heatCapacityCalculationWindowOpen={heatCapacityCalculationWindowOpen}
      activeHeatCapacityGroupProgressStatus={activeHeatCapacityGroupProgressStatus}
      requestAbandonHeatCapacityFreeGroupDraft={requestAbandonHeatCapacityFreeGroupDraft}
      requestRestartHeatCapacityFreeExperiment={requestRestartHeatCapacityFreeExperiment}
      requestRestartHeatCapacityFreeGroup={requestRestartHeatCapacityFreeGroup}
      openNextHeatCapacityFreeExperimentGroupSetup={openNextHeatCapacityFreeExperimentGroupSetup}
      openFirstHeatCapacityFreeExperimentGroupSetup={openFirstHeatCapacityFreeExperimentGroupSetup}
    />) : null,
        overlayBottomRight: heatCapacityBottomRightOverlay,
        overlayCenter: heatCapacityCenterOverlay,
        overlayCenterAboveGuideMask: true,
        overlayBottomCenter: heatCapacityBottomCenterOverlay,
        overlayGuideMask: heatCapacityGuideMaskOverlay
                    }}
                    bindings={{
        onCameraPoseChange: handleHeatCapacityCameraPoseChange,
        onSceneCheckpoint: handleHeatCapacitySceneCheckpoint,
        onSceneCheckpointProviderChange: handleHeatCapacitySceneCheckpointProviderChange,
        onSceneReady: () => handleHeatCapacitySceneReady(activeFile.id),
        onSceneRestoreRevealComplete: handleHeatCapacitySceneRestoreRevealComplete,
        onDiscreteMotionChange: handleHeatCapacitySceneDiscreteMotionChange,
        onModeTransitionControllerChange: handleHeatCapacitySceneModeTransitionControllerChange,
        onRuntimeFailure: (error) => handleHeatCapacitySceneRuntimeFailure(activeFile.id, error),
        onGuideTargetHolesChange: handleHeatCapacityGuideTargetHolesChange,
        onFocusModeChange: updateHeatCapacityFocusMode,
        onFocusExitRequest: handleHeatCapacityFocusExitRequest,
        onLockedInteraction: handleHeatCapacitySceneLockedInteraction,
        onPowerToggle: updateHeatCapacityPower,
        onStopcockOpenChange: updateHeatCapacityStopcockOpen,
        onPressureZeroFineAdjust: adjustHeatCapacityPressureZeroFineFromScene,
        onPressureZeroCoarseAdjust: adjustHeatCapacityPressureZeroCoarseFromScene,
        onPumpValveToggle: updateHeatCapacityPumpValve,
        onPumpBulbPress: pressHeatCapacityPumpBulb,
        onHardSphereViewToggle: toggleHeatCapacityHardSphereView
                    }}
                  />
              );
            })()}
          </WorkbenchHeatCapacityPreview>
        ) : activeFile.kind === 'heatCapacityPistonOscillation' ? (
          <WorkbenchPistonOscillationPreview
      activeFile={activeFile}
      activePistonOscillationParameterSignature={activePistonOscillationParameterSignature}
      settingsLanguagePreference={settingsLanguagePreference}
      activePistonOscillationPowerOn={activePistonOscillationPowerOn}
      handlePistonOscillationPowerToggle={handlePistonOscillationPowerToggle}
      activePistonOscillationFreeSelected={activePistonOscillationFreeSelected}
      activePistonOscillationPhysicsConfig={activePistonOscillationPhysicsConfig}
      activePistonOscillationThermalConfig={activePistonOscillationThermalConfig}
      activePistonOscillationEffectiveConfig={activePistonOscillationEffectiveConfig}
      activePistonOscillationReleaseAsymmetryConfig={activePistonOscillationReleaseAsymmetryConfig}
      resolvedWorkbenchTheme={resolvedWorkbenchTheme}
      togglePistonOscillationOperationVisualization={togglePistonOscillationOperationVisualization}
      activePistonOscillationGuideSelected={activePistonOscillationGuideSelected}
      pistonOscillationMeasurementCyclesByFileId={pistonOscillationMeasurementCyclesByFileId}
      activePistonOscillationDemoPlaybackPhase={activePistonOscillationDemoPlaybackPhase}
      pistonOscillationDemoPlaybackChannel={pistonOscillationDemoPlaybackChannel}
      activePistonOscillationGuideTimeFrozen={activePistonOscillationGuideTimeFrozen}
      pistonOscillationGuideLessonDialog={pistonOscillationGuideLessonDialog}
      pistonOscillationFreeSetupOpen={pistonOscillationFreeSetupOpen}
      pistonGuideVisualCue={pistonGuideVisualCue}
      pistonGuideScrewInteractionMode={pistonGuideScrewInteractionMode}
      pistonGuideRequestedFocusMode={pistonGuideRequestedFocusMode}
      activePistonOscillationGuideSnapTargetHeightMm={activePistonOscillationGuideSnapTargetHeightMm}
      activePistonOscillationGuideInstrumentRestoreState={activePistonOscillationGuideInstrumentRestoreState}
      activePistonOscillationGuideSession={activePistonOscillationGuideSession}
      pistonOscillationGuideFeedback={pistonOscillationGuideFeedback}
      pistonOscillationGuideStepPanel={pistonOscillationGuideStepPanel}
      requestPistonOscillationFreeSetup={requestPistonOscillationFreeSetup}
      deletePistonOscillationFreeMeasurement={deletePistonOscillationFreeMeasurement}
      requestPistonOscillationFreeReset={requestPistonOscillationFreeReset}
      pistonOscillationGuideCompletionToast={pistonOscillationGuideCompletionToast}
      handlePistonOscillationGuideActionAttempt={handlePistonOscillationGuideActionAttempt}
      handlePistonOscillationGuideScrewDirectionFeedback={handlePistonOscillationGuideScrewDirectionFeedback}
      handlePistonOscillationGuideHeightConfirmed={handlePistonOscillationGuideHeightConfirmed}
      handlePistonOscillationGuideSupportLoss={handlePistonOscillationGuideSupportLoss}
      handlePistonOscillationGuideHeightResetComplete={handlePistonOscillationGuideHeightResetComplete}
      handlePistonOscillationGuideInstrumentSnapshot={handlePistonOscillationGuideInstrumentSnapshot}
      handlePistonOscillationFreeInstrumentSnapshot={handlePistonOscillationFreeInstrumentSnapshot}
      handlePistonOscillationReleaseEvent={handlePistonOscillationReleaseEvent}
      handlePistonOscillationPressStartEvent={handlePistonOscillationPressStartEvent}
      handlePistonOscillationFreeOperationObserved={handlePistonOscillationFreeOperationObserved}
      pistonOscillationLivePressureChannel={pistonOscillationLivePressureChannel}
    />
        ) : (
        <WorkbenchSimulationPreview
      activeFile={activeFile}
      workbenchTranslation={workbenchTranslation}
      isCanvasFocused={isCanvasFocused}
      setIsCanvasFocused={setIsCanvasFocused}
      showWorkbenchSimulationPreviewNotification={showWorkbenchSimulationPreviewNotification}
    />
        )}

    </WorkbenchPreviewFrame>
  );

  const renderHeatCapacityRealtimePanel = () => (
    <WorkbenchHeatCapacityRealtimeReadings
      activeFile={activeFile}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      activeHeatCapacityFreeBatchProgress={activeHeatCapacityFreeBatchProgress}
      autoDemoInteractionLocked={autoDemoInteractionLocked}
      autoDemoPaused={autoDemoPaused}
      autoDemoRunning={autoDemoRunning}
      activeHeatCapacityPressureAlarmVisible={activeHeatCapacityPressureAlarmVisible}
      settingsLanguagePreference={settingsLanguagePreference}
      guideHeatCapacityActiveFileId={guideHeatCapacityActiveFileId}
      getHeatCapacityGuideStep={getHeatCapacityGuideStep}
      getGuideStepGuidance={getGuideStepGuidance}
      activeHeatCapacityExperimentTitle={activeHeatCapacityExperimentTitle}
    />
  );

  const renderRealtimePanelContent = () => (
    activeFile.kind === 'heatCapacityPistonOscillation' ? (
      <WorkbenchPistonOscillationRealtime
      pistonOscillationContentRenderRecoveryHostRef={pistonOscillationContentRenderRecoveryHostRef}
      activePistonOscillationProcessReview={activePistonOscillationProcessReview}
      activePistonOscillationDataProcessing={activePistonOscillationDataProcessing}
      activeFile={activeFile}
      settingsLanguagePreference={settingsLanguagePreference}
      returnToPistonOscillationInstrumentAfterDisplayError={returnToPistonOscillationInstrumentAfterDisplayError}
      isExportModeDataReady={isExportModeDataReady}
      exportInProgress={exportInProgress}
      handleExportAction={handleExportAction}
      activePistonOscillationFreeSelected={activePistonOscillationFreeSelected}
      pistonGuidePulseActive={pistonGuidePulseActive}
      pistonGuideExpectedStrongTargetId={pistonGuideExpectedStrongTargetId}
      handlePistonOscillationProcessingEvent={handlePistonOscillationProcessingEvent}
      handlePistonOscillationGuideProcessingInteractionStart={handlePistonOscillationGuideProcessingInteractionStart}
      changePistonOscillationPeriodSelectionMode={changePistonOscillationPeriodSelectionMode}
      handlePistonOscillationGuideInvalidPeriodSelection={handlePistonOscillationGuideInvalidPeriodSelection}
      handlePistonOscillationFreeUnusableMeasurement={handlePistonOscillationFreeUnusableMeasurement}
      pistonOscillationCompletedDataProcessingReview={pistonOscillationCompletedDataProcessingReview}
      openPistonOscillationCalculationReview={openPistonOscillationCalculationReview}
      closePistonOscillationDataProcessingReview={closePistonOscillationDataProcessingReview}
      pistonOscillationAcquisitionPanelRef={pistonOscillationAcquisitionPanelRef}
      activePistonOscillationGuideSession={activePistonOscillationGuideSession}
      activePistonOscillationFreeSession={activePistonOscillationFreeSession}
      activePistonOscillationPowerOn={activePistonOscillationPowerOn}
      pistonOscillationReleaseEventsByFileId={pistonOscillationReleaseEventsByFileId}
      pistonOscillationPressStartEventsByFileId={pistonOscillationPressStartEventsByFileId}
      pistonOscillationLivePressureChannel={pistonOscillationLivePressureChannel}
      activePistonOscillationDemoPlaybackPhase={activePistonOscillationDemoPlaybackPhase}
      pistonOscillationDemoPlaybackChannel={pistonOscillationDemoPlaybackChannel}
      activePistonOscillationGuideSelected={activePistonOscillationGuideSelected}
      pistonOscillationGuidePistonStable={pistonOscillationGuidePistonStable}
      activePistonOscillationGuideTimeFrozen={activePistonOscillationGuideTimeFrozen}
      pistonOscillationGuideLessonDialog={pistonOscillationGuideLessonDialog}
      pistonGuideAcquisitionCue={pistonGuideAcquisitionCue}
      handlePistonOscillationGuideAcquisitionEvent={handlePistonOscillationGuideAcquisitionEvent}
      handlePistonOscillationGuideActionAttempt={handlePistonOscillationGuideActionAttempt}
      editPistonOscillationGuideParameter={editPistonOscillationGuideParameter}
      commitPistonOscillationGuideParameter={commitPistonOscillationGuideParameter}
      commitPistonOscillationFreeAcquisitionSetting={commitPistonOscillationFreeAcquisitionSetting}
      changePistonOscillationFreeCandidate={changePistonOscillationFreeCandidate}
      startPistonOscillationFreeAcquisition={startPistonOscillationFreeAcquisition}
      savePistonOscillationFreeMeasurement={savePistonOscillationFreeMeasurement}
      retainPistonOscillationRun={retainPistonOscillationRun}
    />
    ) : activeFile.kind === 'heatCapacity' ? renderHeatCapacityRealtimePanel() : (
      <WorkbenchSimulationRealtimePanel
        file={activeFile}
        idealAnalysis={idealAnalysis}
        standardSampleCount={
          activeFile.kind === 'standard'
            ? standardRuntimeRef.current[activeFile.id]?.engine.getCollectedSampleCount() ?? 0
            : 0
        }
        workbenchCopy={workbenchCopy}
      />
    )
  );

  const renderRealtimePanel = () => (
    <WorkbenchRealtimeBoundary
      activeFile={activeFile}
      settingsLanguagePreference={settingsLanguagePreference}
      returnToPistonOscillationInstrumentAfterDisplayError={returnToPistonOscillationInstrumentAfterDisplayError}
      renderRealtimePanelContent={renderRealtimePanelContent}
    />
  );

  const exportCopy = workbenchCopy.exportEnvironment[exportEnvironmentStatus];

  const renderResultsPanel = () => (
    <WorkbenchStandardResultsWindow
      activeFile={activeFile}
      workbenchCopy={workbenchCopy}
      resultSummary={resultSummary}
      isExportModeDataReady={isExportModeDataReady}
      exportInProgress={exportInProgress}
      handleExportAction={handleExportAction}
      closePanel={closePanel}
      resultsSections={resultsSections}
      standardResultsLayout={standardResultsLayout}
      setActiveStandardResultsTab={setActiveStandardResultsTab}
      closeStandardResultsTab={closeStandardResultsTab}
      figureSpecs={figureSpecs}
      settingsLanguagePreference={settingsLanguagePreference}
    />
  );

  const renderPanelContent = (panel: PanelDefinition) => (
    <WorkbenchPanelContent
      panel={panel}
      renderPreviewPanel={renderPreviewPanel}
      renderRealtimePanel={renderRealtimePanel}
      activeFile={activeFile}
      idealAnalysis={idealAnalysis}
      figureSpecs={figureSpecs}
      settingsLanguagePreference={settingsLanguagePreference}
      workbenchCopy={workbenchCopy}
      exportCopy={exportCopy}
      exportInProgress={exportInProgress}
      isExportModeDataReady={isExportModeDataReady}
      handleExportAction={handleExportAction}
      renderResultsPanel={renderResultsPanel}
      pendingClearRelationKey={pendingClearRelationKey}
      pendingRemovePointId={pendingRemovePointId}
      requestClearIdealRelation={requestClearIdealRelation}
      cancelClearIdealRelation={cancelClearIdealRelation}
      requestRemoveIdealPoint={requestRemoveIdealPoint}
      cancelRemoveIdealPoint={cancelRemoveIdealPoint}
      selectHeatCapacityViewedGroup={selectHeatCapacityViewedGroup}
      selectHeatCapacityViewedTrial={selectHeatCapacityViewedTrial}
      pendingRemoveHeatCapacityTrialRecord={pendingRemoveHeatCapacityTrialRecord}
      requestRemoveHeatCapacityTrialRecord={requestRemoveHeatCapacityTrialRecord}
      setPendingRemoveHeatCapacityTrialRecord={setPendingRemoveHeatCapacityTrialRecord}
      openHeatCapacityReportExport={openHeatCapacityReportExport}
    />
  );

  const renderDockHeader = (panel: PanelDefinition) => (
    <WorkbenchDockHeader
      panel={panel}
      activePistonOscillationDataProcessing={activePistonOscillationDataProcessing}
      activePistonOscillationProcessReview={activePistonOscillationProcessReview}
      pistonOscillationCopy={pistonOscillationCopy}
      activePistonOscillationExpandedRealtime={activePistonOscillationExpandedRealtime}
      activeFile={activeFile}
      renderHeatCapacityModeControl={renderHeatCapacityModeControl}
      renderPistonOscillationModeControl={renderPistonOscillationModeControl}
      toggleActiveFileRunState={toggleActiveFileRunState}
      workbenchCopy={workbenchCopy}
      stopActiveFile={stopActiveFile}
      closePistonOscillationProcessReview={closePistonOscillationProcessReview}
    />
  );

  const renderDockPanel = (panel: PanelDefinition, optional = false) => (
    <WorkbenchDockPanel
      key={panel.key}
      panel={panel}
      optional={optional}
      setSelectedPanel={setSelectedPanel}
      renderDockHeader={renderDockHeader}
      renderPanelContent={renderPanelContent}
    />
  );

  const renderIdealResultWindows = () => (
    <WorkbenchIdealResultsRegion
      activeFile={activeFile}
      workbenchLayoutDefaults={workbenchLayoutDefaults}
      idealResultWindowPanels={idealResultWindowPanels}
      idealResultWindowRegionRef={idealResultWindowRegionRef}
      workbenchCopy={workbenchCopy}
      selectedPanel={selectedPanel}
      startIdealResultWindowResize={startIdealResultWindowResize}
      closeIdealResultsWindow={closeIdealResultsWindow}
      setActiveIdealResultTab={setActiveIdealResultTab}
      closeIdealResultTab={closeIdealResultTab}
      renderPanelContent={renderPanelContent}
    />
  );

  const renderHeatCapacityMaterialsWindow = () => (
    <WorkbenchHeatCapacityMaterialsWindow
      activeFile={activeFile}
      getHeatCapacityTabDefinition={getHeatCapacityTabDefinition}
      getHeatCapacityMaterialsMaxHeightRatio={getHeatCapacityMaterialsMaxHeightRatio}
      clamp={clamp}
      startHeatCapacityMaterialsResize={startHeatCapacityMaterialsResize}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      activeHeatCapacityCalculationHint={activeHeatCapacityCalculationHint}
      closeHeatCapacityMaterialsWindow={closeHeatCapacityMaterialsWindow}
      activeHeatCapacityMaterialsTabsAria={activeHeatCapacityMaterialsTabsAria}
      activateHeatCapacityTab={activateHeatCapacityTab}
      workbenchCopy={workbenchCopy}
      closeHeatCapacityTab={closeHeatCapacityTab}
      renderPanelContent={renderPanelContent}
    />
  );

  const handleSectionKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderSectionTitle = (label: string, collapsed: boolean, onToggle: () => void, kind: 'files' | 'panels' = 'files') => (
    <WorkbenchSectionTitle
      label={label}
      collapsed={collapsed}
      onToggle={onToggle}
      kind={kind}
    />
  );

  const renderHeatCapacityPanelTree = () => (
    <WorkbenchHeatCapacityPanelTree
      toggleHeatCapacityMaterialsExpanded={toggleHeatCapacityMaterialsExpanded}
      availablePanels={availablePanels}
      activeFile={activeFile}
      getHeatCapacityPanelDisplayDefinition={getHeatCapacityPanelDisplayDefinition}
      selectedPanel={selectedPanel}
      panelsSectionCollapsed={panelsSectionCollapsed}
      setSelectedPanel={setSelectedPanel}
      handleLockedPanel={handleLockedPanel}
      handleSectionKeyDown={handleSectionKeyDown}
      workbenchCopy={workbenchCopy}
      openAllHeatCapacityMaterialsTabs={openAllHeatCapacityMaterialsTabs}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      getHeatCapacityTabState={getHeatCapacityTabState}
      openHeatCapacityTab={openHeatCapacityTab}
      getLocalizedTreeState={getLocalizedTreeState}
    />
  );

  const renderPistonOscillationPanelTree = () => (
    <WorkbenchPistonOscillationPanelTree
      togglePistonOscillationMaterialsExpanded={togglePistonOscillationMaterialsExpanded}
      activeFile={activeFile}
      availablePanels={availablePanels}
      selectedPanel={selectedPanel}
      pistonOscillationDataProcessingReviewOpen={pistonOscillationDataProcessingReviewOpen}
      pistonOscillationCalculationReviewOpen={pistonOscillationCalculationReviewOpen}
      pistonOscillationProcessReviewOpen={pistonOscillationProcessReviewOpen}
      panelsSectionCollapsed={panelsSectionCollapsed}
      setSelectedPanel={setSelectedPanel}
      handleLockedPanel={handleLockedPanel}
      handleSectionKeyDown={handleSectionKeyDown}
      workbenchCopy={workbenchCopy}
      heatCapacityRealtimeCopy={heatCapacityRealtimeCopy}
      isWindowPanelVisible={isWindowPanelVisible}
      openPistonOscillationDataProcessingReview={openPistonOscillationDataProcessingReview}
      openPistonOscillationProcessReview={openPistonOscillationProcessReview}
      openPanel={openPanel}
    />
  );

  const topMenuResultChildren: WorkbenchTopMenuResultChild[] = activeFile.kind === 'ideal'
    ? idealResultWindowPanels.map((panel) => {
        const state = getIdealResultTabState(panel.key);
        return {
          kind: 'ideal' as const,
          key: panel.key,
          title: panel.title,
          icon: panel.icon,
          visible: state !== 'off',
          status: getLocalizedTreeState(state),
        };
      })
    : activeFile.kind === 'standard'
      ? resultsSections.map((section) => {
          const state = getStandardResultsTabState(section.key);
          return {
            kind: 'standard' as const,
            key: section.key,
            title: section.title,
            icon: section.icon,
            visible: state !== 'off',
            status: getLocalizedTreeState(state),
          };
        })
      : [];
  const topMenuWindowPanels = availablePanels
    .filter((panel) => (
      !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key)) &&
      (
        !isHeatCapacityPanelKey(panel.key)
        || activeExperimentMaterialsPanelKeys.includes(panel.key)
      )
    ))
    .map((panel) => {
      const locked = LOCKED_PANEL_KEYS.includes(panel.key);
      const visible = isWindowPanelVisible(panel.key);
      return {
        key: panel.key,
        title: panel.title,
        icon: panel.icon,
        locked,
        visible,
        status: locked ? workbenchCopy.files.locked : visible ? workbenchCopy.files.shown : workbenchCopy.files.off,
        children: panel.key === 'results' ? topMenuResultChildren : [],
      };
    });
  const activeLayoutDefaults = activeFile.kind === 'ideal'
    ? workbenchLayoutDefaults.ideal
    : activeFile.kind === 'standard'
      ? workbenchLayoutDefaults.standard
      : activeFile.kind === 'heatCapacity'
        ? workbenchLayoutDefaults.heatCapacity
        : workbenchLayoutDefaults.heatCapacityPistonOscillation;
  const topMenuLayoutSummary = `${Math.round(activeLayoutDefaults.resultsHeightRatio * 100)}% / ${Math.round(activeLayoutDefaults.liveWorkspaceSplitRatio * 100)}%`;
  const resolvedWorkbenchTheme = settingsThemePreference === 'system' ? systemWorkbenchTheme : settingsThemePreference;
  const promptFeedbackCopy = PROMPT_FEEDBACK_COPY[settingsLanguagePreference];
  const promptToastMessages: PromptToastMessage[] = [];
  if (scanInputToast) {
    promptToastMessages.push({
      id: 'scan-input-error',
      kind: 'danger',
      label: promptFeedbackCopy.kindLabels.danger,
      title: promptFeedbackCopy.inputErrorTitle,
      body: scanInputToast,
      closeLabel: promptFeedbackCopy.closeLabel,
      onDismiss: () => setScanInputToast(null),
    });
  }
  if (aboutResultNotice) {
    promptToastMessages.push({
      id: 'about-result',
      kind: aboutResultNotice.kind,
      label: promptFeedbackCopy.kindLabels[aboutResultNotice.kind],
      title: aboutResultNotice.title,
      body: aboutResultNotice.body,
      closeLabel: promptFeedbackCopy.closeLabel,
      onDismiss: dismissAboutResultNotice,
    });
  }
  if (workspacePersistenceStatus.state === 'retrying' || workspacePersistenceStatus.state === 'failed') {
    const persistenceFailed = workspacePersistenceStatus.state === 'failed';
    promptToastMessages.push({
      id: 'workspace-persistence',
      kind: persistenceFailed ? 'danger' : 'warning',
      label: promptFeedbackCopy.kindLabels[persistenceFailed ? 'danger' : 'warning'],
      title: persistenceFailed
        ? promptFeedbackCopy.persistenceFailedTitle
        : promptFeedbackCopy.persistenceRetryingTitle,
      body: workspacePersistenceStatus.error.message,
      persistent: true,
      dataAttributes: {
        'data-workbench-persistence-status': workspacePersistenceStatus.state,
      },
    });
  }
  const experimentTutorialCopy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
  const activeTutorialExperimentName = activeTutorialExperiment
    ? firstRunCopies[settingsLanguagePreference].needs.experimentNames[activeTutorialExperiment]
    : null;
  const tutorialPromptModel = deriveWorkbenchTutorialPromptModel({ tutorialNoticeKind, tutorialBlockedNoticeOpen, remoteTutorialOwnerActive, tutorialOperationError, activeTutorialExperiment, activeTutorialExperimentName, experimentTutorialCopy, settingsLanguagePreference, desktopWindowAvailable: Boolean(window.hardSphereLabWindow), reload: () => window.location.reload() });
  const tutorialPromptActions = createWorkbenchTutorialPromptActions({ tutorialOperationError, setTutorialOperationError, setTutorialBlockedNoticeOpen, tutorialOwnershipClaimRef, window });

  return (
    <div
      className={`studio-workbench studio-theme-${resolvedWorkbenchTheme}`}
      data-workbench-language={settingsLanguagePreference}
      data-experiment-tutorial-active={tutorialActive ? 'true' : 'false'}
      data-experiment-tutorial-id={tutorialActive ? activeTutorialExperiment ?? undefined : undefined}
      data-experiment-tutorial-milestone={
        tutorialActive && activeTutorialExperiment
          ? experienceProfile.learning[activeTutorialExperiment]
          : undefined
      }
      data-desktop-exit-quiesced={desktopExitQuiesced ? 'true' : 'false'}
      aria-busy={desktopExitInputBlocked}
    >
      {desktopExitInputBlocked ? (
        <div className="studio-exit-persistence-shield" role="status" aria-live="polite">
          <span className="studio-exit-persistence-spinner" aria-hidden="true" />
          <span>
            {settingsLanguagePreference === 'en'
              ? 'Saving the workspace before exit…'
              : settingsLanguagePreference === 'zh-TW'
                ? '正在儲存工作區，準備結束…'
                : '正在保存工作区，准备退出…'}
          </span>
        </div>
      ) : null}
      <PromptToastRegion
        ariaLabel={promptFeedbackCopy.regionLabel}
        messages={promptToastMessages}
      />
      <PromptConfirmDialog
        request={activePromptConfirmation}
        onCancel={cancelPromptConfirmation}
        onConfirm={confirmPromptConfirmation}
      />
      <WorkbenchTutorialPrompts model={tutorialPromptModel} actions={tutorialPromptActions} handleExperimentTutorialNoticeAction={handleExperimentTutorialNoticeAction} />

      <WorkbenchHeatCapacityRestoreDefaultDialog
        open={
          heatCapacityRestoreDefaultConfirmOpen &&
          activeFile.kind === 'heatCapacity' &&
          activeFile.heatCapacityMode === 'free'
        }
        copy={{
          title: heatCapacityFreeSharedText.restoreDefaultTitle[settingsLanguagePreference],
          body: heatCapacityFreeSharedText.restoreDefaultBody[settingsLanguagePreference],
          cancel: heatCapacityFreeSharedText.cancel[settingsLanguagePreference],
          confirm: heatCapacityFreeSharedText.confirmRestoreDefault[settingsLanguagePreference],
        }}
        onCancel={cancelHeatCapacityRestoreDefault}
        onConfirm={confirmHeatCapacityRestoreDefault}
      />
      <WorkbenchHeatCapacityIdealProfileIntroDialog
        open={
          heatCapacityIdealIntroOpen &&
          activeFile.kind === 'heatCapacity' &&
          activeFile.heatCapacityMode === 'free'
        }
        copy={{
          title: heatCapacityFreeSharedText.idealProfileIntroTitle[settingsLanguagePreference],
          body: heatCapacityFreeSharedText.idealProfileIntroBody[settingsLanguagePreference],
          cancel: heatCapacityFreeSharedText.cancel[settingsLanguagePreference],
          confirm: heatCapacityFreeSharedText.confirmEnableIdealProfile[settingsLanguagePreference],
        }}
        onCancel={cancelHeatCapacityIdealProfileIntro}
        onConfirm={confirmHeatCapacityIdealProfileIntro}
      />
      <HeatCapacityBatchSetupDialog
        open={heatCapacityBatchSetupOpen}
        language={settingsLanguagePreference}
        purpose={heatCapacityBatchSetupPurpose}
        scheme={activeHeatCapacityNextScheme}
        selectedCount={heatCapacityBatchSetupSelection}
        onSelectedCountChange={selectHeatCapacityBatchGroupCount}
        onCancel={cancelHeatCapacityFreeBatchSetup}
        onConfirm={confirmHeatCapacityFreeBatchSetup}
      />
      <PistonOscillationFreeSetupDialog
        open={pistonOscillationFreeSetupOpen}
        language={settingsLanguagePreference}
        initialTargetHeightsMm={activeFile.kind === 'heatCapacityPistonOscillation'
          ? activeFile.pistonOscillationFreeSession.experimentPlan?.targetHeightsMm
          : undefined}
        initialCustomHeightCandidatesMm={
          activeFile.kind === 'heatCapacityPistonOscillation'
            ? activeFile.pistonOscillationFreeSession.experimentPlan
                ?.customHeightCandidatesMm
            : undefined
        }
        onCancel={() => cancelPistonOscillationFreeSetup()}
        onConfirm={(targetHeightsMm, customHeightCandidatesMm) => {
          activatePistonOscillationFreeMode(
            targetHeightsMm,
            customHeightCandidatesMm,
          );
        }}
      />
      <HeatCapacityReportExportDialog
        open={heatCapacityReportExportOpen && activeFile.kind === 'heatCapacity'}
        groups={activeFile.kind === 'heatCapacity'
          ? activeFile.heatCapacityFreeExperimentGroups.groups
          : []}
        selectedGroupIds={heatCapacityReportSelectedGroupIds}
        language={settingsLanguagePreference}
        onSelectionChange={selectHeatCapacityReportGroups}
        onCancel={closeHeatCapacityReportExport}
        onConfirm={confirmHeatCapacityReportExport}
      />
      <HeatCapacityCalculationWindow
        open={heatCapacityCalculationWindowOpen}
        language={settingsLanguagePreference}
        session={activeHeatCapacityCalculationSession}
        onDraftChange={updateHeatCapacityCalculationDraft}
        onSubmitStep={submitHeatCapacityCalculationStep}
        onContinueAnswer={continueHeatCapacityCalculationAnswer}
        onRevealAnswer={revealHeatCapacityCalculationAnswer}
        onSelectGroup={selectHeatCapacityCalculationGroup}
        onSelectAggregate={selectHeatCapacityCalculationAggregate}
        onCompleteAndExit={completeAndExitHeatCapacityCalculation}
        onClose={closeHeatCapacityCalculationReview}
      />
      <RecoverableRenderErrorBoundary
        resetKeys={[activeFile.id]}
        fallback={({ error, retry }) => createPortal(
          <WorkbenchContentRenderErrorFallback
            area="calculation"
            language={settingsLanguagePreference}
            error={error}
            onRetry={retry}
            onReturnToInstrument={() => {
              returnToPistonOscillationInstrumentAfterDisplayError();
              retry();
            }}
          />,
          pistonOscillationContentRenderRecoveryHostRef.current
            ?? centerWorkspaceRef.current
            ?? document.body,
        )}
      >
        <PistonOscillationCalculationWindow
          open={pistonOscillationCalculationWindowOpen}
          language={settingsLanguagePreference}
          guideSession={activePistonOscillationGuideSession}
          freeSession={activePistonOscillationFreeSelected
            ? activePistonOscillationFreeSession
            : undefined}
          onCalculationEvent={handlePistonOscillationProcessingEvent}
          onCompleteAndExit={completeAndExitPistonOscillationCalculation}
          onClose={closePistonOscillationCalculationReview}
        />
      </RecoverableRenderErrorBoundary>
      {renderHeatCapacityAdvancedParameterDialog()}
      <div
        className={`studio-shell ${consoleCollapsed ? 'studio-shell-console-collapsed' : ''}`}
        style={shellStyle}
        ref={shellRef}
      >
        <div
          ref={consoleResizeGhostRef}
          className="studio-resize-ghost-divider studio-console-resize-ghost"
          aria-hidden="true"
        />
        <WorkbenchMenuBar
      workbenchCopy={workbenchCopy}
      openTopMenu={openTopMenu}
      topMenuLeft={topMenuLeft}
      topCommandsRef={topCommandsRef}
      topMenuRef={topMenuRef}
      openableClosedFiles={openableClosedFiles}
      undoStack={undoStack}
      redoStack={redoStack}
      tutorialActive={tutorialActive}
      activeFile={activeFile}
      topMenuWindowPanels={topMenuWindowPanels}
      settingsThemePreference={settingsThemePreference}
      settingsLanguagePreference={settingsLanguagePreference}
      settingsPerformanceMode={settingsPerformanceMode}
      topMenuLayoutSummary={topMenuLayoutSummary}
      toggleTopCommandMenu={toggleTopCommandMenu}
      openNewWorkbenchWindow={openNewWorkbenchWindow}
      createFile={createFile}
      openClosedWorkbenchFile={openClosedWorkbenchFile}
      undoLastEdit={undoLastEdit}
      redoLastEdit={redoLastEdit}
      clearEditHistory={clearEditHistory}
      runWindowMenuSwitch={runWindowMenuSwitch}
      toggleWindowPanel={toggleWindowPanel}
      guardWorkbenchTutorialAction={guardWorkbenchTutorialAction}
      toggleWindowIdealResultTab={toggleWindowIdealResultTab}
      toggleWindowStandardResultsTab={toggleWindowStandardResultsTab}
      resetLayout={resetLayout}
      openGeneralSettings={openGeneralSettings}
      saveCurrentWorkbenchLayoutAsDefault={saveCurrentWorkbenchLayoutAsDefault}
      openUserGuide={openUserGuide}
      openAboutWindow={openAboutWindow}
      closeDesktopWindow={closeDesktopWindow}
    />
        <WorkbenchAboutWindow
          open={aboutWindowOpen}
          copy={workbenchCopy.about}
          appVersion={WORKBENCH_APP_VERSION}
          updateChecking={aboutUpdateChecking}
          updateStatusLabel={getAboutUpdateStatusLabel(updaterState, workbenchCopy.about, hasDesktopUpdaterBridge())}
          environmentChecking={exportEnvironmentStatus === 'checking'}
          environmentAvailable={isExportEnvironmentAvailableStatus(exportEnvironmentStatus)}
          environmentStatusLabel={getAboutEnvironmentStatusLabel(exportEnvironmentStatus, workbenchCopy)}
          sessionCacheSummary={sessionCacheSummary}
          onClose={closeAboutWindow}
          onCheckUpdates={runAboutUpdateCheck}
          onCheckEnvironment={runAboutEnvironmentCheck}
          onOpenBuildNotice={openBuildNoticeWindow}
        />
        <WorkbenchBuildNoticeWindow
          open={buildNoticeWindowOpen}
          copy={workbenchCopy.about}
          sections={buildNoticeSections[settingsLanguagePreference]}
          legalMaterialFiles={buildNoticeLegalMaterialFiles}
          navOpen={buildNoticeNavOpen}
          activeMaterialId={activeBuildNoticeMaterialId}
          filePreview={buildNoticeFilePreview}
          openError={buildNoticeOpenError}
          desktopLegalBridgeAvailable={hasDesktopLegalBridge()}
          desktopLegalReadAvailable={hasDesktopLegalReadBridge()}
          onClose={closeBuildNoticeWindow}
          onNavOpenChange={setBuildNoticeNavigationOpen}
          onJumpToSection={jumpToBuildNoticeSection}
          onOpenMaterial={openBuildNoticeMaterial}
          onCloseMaterial={closeBuildNoticeMaterial}
          onOpenLegalFile={openBuildNoticeLegalFile}
        />
        <WorkbenchUpdateDialog
          state={updateDialogState}
          appVersion={WORKBENCH_APP_VERSION}
          language={settingsLanguagePreference}
          copy={workbenchCopy.about}
          onClose={closeUpdateDialog}
          onIgnoreVersion={ignoreUpdateDialogVersion}
          onDownload={startUpdateDownload}
          onRestartAndInstall={restartAndInstallUpdate}
          onManualDownload={openManualUpdateDownload}
        />
        <WorkbenchGeneralSettingsWindow
          open={settingsGeneralOpen}
          copy={workbenchCopy}
          themePreference={settingsThemePreference}
          languagePreference={settingsLanguagePreference}
          performanceMode={settingsPerformanceMode}
          audioEnabled={audioSettings.enabled}
          audioVolume={audioSettings.volume}
          languageMenuOpen={settingsLanguageMenuOpen}
          languageTriggerRef={settingsLanguageTriggerRef}
          learningCopy={{
            title: experimentTutorialCopy.settingsTitle,
            hint: experimentTutorialCopy.settingsHint,
            replayIntroLabel: experimentTutorialCopy.replayIntroLabel,
            replayIntroHint: experimentTutorialCopy.replayIntroHint,
            reselectNeedsLabel: experimentTutorialCopy.reselectNeedsLabel,
            reselectNeedsHint: experimentTutorialCopy.reselectNeedsHint,
            simulateFirstRunLabel: experimentTutorialCopy.simulateFirstRunLabel,
            simulateFirstRunHint: experimentTutorialCopy.simulateFirstRunHint,
            resetDisabledHint: experimentTutorialCopy.resetDisabledHint,
            exitTutorialLabel: experimentTutorialCopy.exitTutorialLabel,
            exitTutorialHint: experimentTutorialCopy.exitTutorialHint,
          }}
          tutorialActive={tutorialActive}
          resetLearningActions={[
            {
              id: 'heatCapacity',
              label: experimentTutorialCopy.resetLabel,
              hint: experimentTutorialCopy.resetHint,
              onReset: () => requestResetExperimentLearning('heatCapacity'),
            },
            {
              id: 'pistonOscillation',
              label: settingsLanguagePreference === 'en'
                ? 'Reset piston-oscillation learning progress'
                : settingsLanguagePreference === 'zh-TW'
                  ? '重設活塞振動學習進度'
                  : '重置活塞振动学习进度',
              hint: experimentTutorialCopy.resetHint,
              onReset: () => requestResetExperimentLearning('pistonOscillation'),
            },
          ]}
          showSimulateFirstRun={import.meta.env.DEV}
          onClose={closeGeneralSettings}
          onThemeChange={updateSettingsThemePreference}
          onLanguageChange={updateSettingsLanguagePreference}
          onPerformanceModeChange={updateSettingsPerformanceMode}
          onAudioEnabledChange={updateSettingsAudioEnabled}
          onAudioVolumeChange={updateSettingsAudioVolume}
          onLanguageMenuOpenChange={setSettingsLanguageMenuOpen}
          onReplayProductIntro={openProductIntroReplay}
          onReselectLearningNeeds={openLearningNeedsReselect}
          onExitTutorial={requestExitExperimentLearningTutorial}
          onSimulateFirstRun={requestSimulateFirstRun}
        />

        <WorkbenchLearningExperienceOverlays productIntroReplayPhase={productIntroReplayPhase} learningNeedsReselectOpen={learningNeedsReselectOpen} learningNeedsDraft={learningNeedsDraft} setProductIntroReplayPhase={setProductIntroReplayPhase} closeLearningExperienceOverlay={closeLearningExperienceOverlay} submitLearningNeedsReselect={submitLearningNeedsReselect} updateLearningNeedsAnswer={updateLearningNeedsAnswer} settingsLanguagePreference={settingsLanguagePreference} resolvedWorkbenchTheme={resolvedWorkbenchTheme} onboardingReducedMotion={onboardingReducedMotion} />

        <main
          className={`studio-body ${leftCollapsed ? 'studio-left-collapsed' : ''}`}
          style={workbenchStyle}
          ref={workbenchBodyRef}
        >
          <div
            ref={sidebarResizeGhostRef}
            className="studio-resize-ghost-divider studio-sidebar-resize-ghost"
            aria-hidden="true"
          />
          <WorkbenchFileSidebar
            workbenchCopy={workbenchCopy}
            setLeftCollapsed={setLeftCollapsed}
            startSidebarResize={startSidebarResize}
          >
              <WorkbenchFileTree
      openFileMenuId={openFileMenuId}
      renderSectionTitle={renderSectionTitle}
      workbenchCopy={workbenchCopy}
      filesSectionCollapsed={filesSectionCollapsed}
      setFilesSectionCollapsed={setFilesSectionCollapsed}
      isWorkbenchEmpty={isWorkbenchEmpty}
      files={files}
      renamingFileId={renamingFileId}
      pendingDeleteFileId={pendingDeleteFileId}
      selectedFileId={selectedFileId}
      activeFile={activeFile}
      setSelectedFileId={setSelectedFileId}
      selectFile={selectFile}
      setTutorialBlockedNoticeOpen={setTutorialBlockedNoticeOpen}
      setOpenFileMenuId={setOpenFileMenuId}
      setPendingDeleteFileId={setPendingDeleteFileId}
      handleSectionKeyDown={handleSectionKeyDown}
      renameInputRef={renameInputRef}
      renameDraft={renameDraft}
      renameSelectionModeRef={renameSelectionModeRef}
      setRenameDraft={setRenameDraft}
      commitRenameFileFromOutside={commitRenameFileFromOutside}
      selectRenameNumericSuffix={selectRenameNumericSuffix}
      commitRenameFile={commitRenameFile}
      cancelRenameFile={cancelRenameFile}
      fileMenuButtonRef={fileMenuButtonRef}
      fileMenuRef={fileMenuRef}
      beginRenameFile={beginRenameFile}
      requestCloseWorkbenchFile={requestCloseWorkbenchFile}
      requestDeleteWorkbenchFile={requestDeleteWorkbenchFile}
      cancelDeleteWorkbenchFile={cancelDeleteWorkbenchFile}
    />

              <WorkbenchPanelNavigation
      renderSectionTitle={renderSectionTitle}
      isWorkbenchEmpty={isWorkbenchEmpty}
      workbenchCopy={workbenchCopy}
      activeFile={activeFile}
      panelsSectionCollapsed={panelsSectionCollapsed}
      setPanelsSectionCollapsed={setPanelsSectionCollapsed}
      renderHeatCapacityPanelTree={renderHeatCapacityPanelTree}
      renderPistonOscillationPanelTree={renderPistonOscillationPanelTree}
      availablePanels={availablePanels}
      isWindowPanelVisible={isWindowPanelVisible}
      selectedPanel={selectedPanel}
      setSelectedPanel={setSelectedPanel}
      handleLockedPanel={handleLockedPanel}
      openIdealResultsWindow={openIdealResultsWindow}
      openPanel={openPanel}
      handleSectionKeyDown={handleSectionKeyDown}
      openStandardResultsWindow={openStandardResultsWindow}
      resultsChildrenCollapsed={resultsChildrenCollapsed}
      setResultsChildrenCollapsed={setResultsChildrenCollapsed}
      idealResultWindowPanels={idealResultWindowPanels}
      openIdealResultWindow={openIdealResultWindow}
      getLocalizedTreeState={getLocalizedTreeState}
      getIdealResultTabState={getIdealResultTabState}
      resultsSections={resultsSections}
      getStandardResultsTabState={getStandardResultsTabState}
      selectResultsSection={selectResultsSection}
    />
            </WorkbenchFileSidebar>

          {leftCollapsed ? (
            <button type="button" className="studio-rail-button studio-left-rail" onClick={() => setLeftCollapsed(false)}>
              {workbenchCopy.files.openFiles}
            </button>
          ) : null}

          <section className="studio-layout" aria-label={workbenchCopy.files.workspaceAria}>
            <WorkbenchFileTabs
      fileTabsRef={fileTabsRef}
      isWorkbenchEmpty={isWorkbenchEmpty}
      workbenchCopy={workbenchCopy}
      files={files}
      selectedFileId={selectedFileId}
      activeFile={activeFile}
      selectFile={selectFile}
      requestCloseWorkbenchFile={requestCloseWorkbenchFile}
    />

            <div className={`studio-workspace-shell ${isWorkbenchEmpty ? 'studio-workspace-shell-empty' : 'studio-workspace-shell-active'} ${!isWorkbenchEmpty && effectiveParametersCollapsed ? 'studio-params-collapsed' : ''}`} ref={workspaceShellRef}>
              <div
                ref={parameterSidebarResizeGhostRef}
                className="studio-resize-ghost-divider studio-params-sidebar-resize-ghost"
                aria-hidden="true"
              />
              <WorkbenchCenterWorkspace
      isWorkbenchEmpty={isWorkbenchEmpty}
      activePistonOscillationExpandedRealtime={activePistonOscillationExpandedRealtime}
      resultsPanel={resultsPanel}
      idealResultPanels={idealResultPanels}
      activeHeatCapacityMaterialsWindowOpen={activeHeatCapacityMaterialsWindowOpen}
      centerWorkspaceRef={centerWorkspaceRef}
      openableClosedFiles={openableClosedFiles}
      settingsLanguagePreference={settingsLanguagePreference}
      workbenchCopy={workbenchCopy}
      createFile={createFile}
      openClosedWorkbenchFile={openClosedWorkbenchFile}
      liveWorkspaceResizing={liveWorkspaceResizing}
      liveWorkspaceStyle={liveWorkspaceStyle}
      liveWorkspaceRef={liveWorkspaceRef}
      pistonOscillationGuideStrongReminderActive={pistonOscillationGuideStrongReminderActive}
      pistonGuideExpectedStrongTargetId={pistonGuideExpectedStrongTargetId}
      pistonGuideStrongTargetContext={pistonGuideStrongTargetContext}
      pistonOscillationGuidePulseElapsedMs={pistonOscillationGuidePulseElapsedMs}
      primaryPanels={primaryPanels}
      renderDockPanel={renderDockPanel}
      startLiveWorkspaceResize={startLiveWorkspaceResize}
      liveWorkspaceResizeGhostRef={liveWorkspaceResizeGhostRef}
      auxiliaryPanels={auxiliaryPanels}
      activeFile={activeFile}
      pistonGuideStrongTargetId={pistonGuideStrongTargetId}
      pistonOscillationGuideStrongMaskLayout={pistonOscillationGuideStrongMaskLayout}
      pistonGuideStrongReminderText={pistonGuideStrongReminderText}
      pistonOscillationGuideLessonOverlay={pistonOscillationGuideLessonOverlay}
      standardResultsLayout={standardResultsLayout}
      startStandardResultsResize={startStandardResultsResize}
      renderIdealResultWindows={renderIdealResultWindows}
      renderHeatCapacityMaterialsWindow={renderHeatCapacityMaterialsWindow}
    />

              {!isWorkbenchEmpty ? (
              <WorkbenchCurrentParameters
      currentParameterControlsLocked={currentParameterControlsLocked}
      workbenchCopy={workbenchCopy}
      startSidebarResize={startSidebarResize}
      setParametersCollapsed={setParametersCollapsed}
      currentParametersBodyRef={currentParametersBodyRef}
      activeFile={activeFile}
      pistonOscillationCopy={pistonOscillationCopy}
      activeHeatCapacityExperimentTitle={activeHeatCapacityExperimentTitle}
      parametersDirty={parametersDirty}
      renderIdealControls={renderIdealControls}
      renderHeatCapacityFreeParameterPanel={renderHeatCapacityFreeParameterPanel}
      settingsLanguagePreference={settingsLanguagePreference}
      activePistonOscillationParameterMode={activePistonOscillationParameterMode}
      renderHeatCapacityParameterHelpButton={renderHeatCapacityParameterHelpButton}
      updatePistonOscillationFreeParameterDraft={updatePistonOscillationFreeParameterDraft}
      setPistonOscillationOperationVisualization={setPistonOscillationOperationVisualization}
      acknowledgePistonOscillationAdvancedParametersRisk={acknowledgePistonOscillationAdvancedParametersRisk}
      restorePistonOscillationFreeParameters={restorePistonOscillationFreeParameters}
      setPistonOscillationFreeExperimentScheme={setPistonOscillationFreeExperimentScheme}
      setPistonOscillationFreeGasType={setPistonOscillationFreeGasType}
      showPistonOscillationParameterLockHint={showPistonOscillationParameterLockHint}
      idealAdvancedSettingsOpen={idealAdvancedSettingsOpen}
      toggleIdealAdvancedSettings={toggleIdealAdvancedSettings}
      idealAdvancedSettingsBodyVisible={idealAdvancedSettingsBodyVisible}
      idealAdvancedSettingsBodyRef={idealAdvancedSettingsBodyRef}
      editableCurrentParameters={editableCurrentParameters}
      renderWorkbenchParameterInputRow={renderWorkbenchParameterInputRow}
      parameterErrors={parameterErrors}
      activeHeatCapacityCalculationHint={activeHeatCapacityCalculationHint}
    />
              ) : null}

              {!isWorkbenchEmpty && effectiveParametersCollapsed ? (
                <button type="button" className="studio-rail-button studio-right-rail" onClick={openParameterSidebarFromRail}>
                  {workbenchCopy.parameters.title}
                </button>
              ) : null}
            </div>
          </section>
        </main>

        <WorkbenchConsole
      consoleCollapsed={consoleCollapsed}
      workbenchCopy={workbenchCopy}
      startConsoleResize={startConsoleResize}
      setConsoleCollapsed={setConsoleCollapsed}
      consoleTab={consoleTab}
      setConsoleTab={setConsoleTab}
      consoleBodyRef={consoleBodyRef}
      logs={logs}
      consoleSummary={consoleSummary}
      settingsLanguagePreference={settingsLanguagePreference}
      displayedLogs={displayedLogs}
    />

        <WorkbenchStatusBar
      workbenchCopy={workbenchCopy}
      isWorkbenchEmpty={isWorkbenchEmpty}
      activeFile={activeFile}
      activePanelTitle={activePanelTitle}
      consoleSummary={consoleSummary}
    />
      </div>
    </div>
  );
};

export default WorkbenchStudioPrototype;
