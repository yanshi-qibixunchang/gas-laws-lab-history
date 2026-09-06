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
import { LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX } from './workbenchLayoutConstants.ts';
import { useWorkbenchPersistenceProjection } from './useWorkbenchPersistenceProjection.ts';
import { createWorkbenchIdealExperimentActions } from './workbenchIdealExperimentActions.ts';
import { useWorkbenchWorkspacePersistenceScheduler } from './useWorkbenchWorkspacePersistenceScheduler.ts';
import { createWorkbenchParameterActions } from './workbenchParameterActions.ts';
import { getChangedIdealParamKeys } from './workbenchIdealParameterState.ts';
import { WorkbenchHeatCapacityPanelTree } from './WorkbenchHeatCapacityPanelTree.tsx';
import { WorkbenchPistonOscillationPanelTree } from './WorkbenchPistonOscillationPanelTree.tsx';
import { createWorkbenchFileCollectionActions } from './workbenchFileCollectionActions.ts';
import { useWorkbenchPistonController } from './useWorkbenchPistonController.ts';
import { GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS, GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE, HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS, HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS } from './workbenchTeachingUiTiming.ts';
import { useWorkbenchFileMenuInteractions, useWorkbenchRenameFocus } from './useWorkbenchFileMenuInteractions.ts';
import { WorkbenchConsole } from './WorkbenchConsole.tsx';
import { WorkbenchStatusBar } from './WorkbenchStatusBar.tsx';
import { createWorkbenchFileActions } from './workbenchFileActions.ts';
import { createWorkbenchFileRenameActions } from './workbenchFileRenameActions.ts';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
import { WorkbenchDockHeader } from './WorkbenchDockHeader.tsx';
import { WorkbenchDockPanel } from './WorkbenchDockPanel.tsx';
import { WorkbenchIdealResultsRegion } from './WorkbenchIdealResultsRegion.tsx';
import { WorkbenchHeatCapacityMaterialsWindow } from './WorkbenchHeatCapacityMaterialsWindow.tsx';
import { WorkbenchSectionTitle } from './WorkbenchSectionTitle.tsx';
import { useWorkbenchInitialWorkspace } from './useWorkbenchInitialWorkspace.ts';
import { normalizeWorkbenchInitialFiles } from './workbenchInitialFilePresentation.ts';
import { createWorkbenchWorkspaceSnapshotCapture, createWorkbenchWorkspacePersistenceRequests } from './workbenchWorkspacePersistenceActions.ts';
import { createWorkbenchWindowActions } from './workbenchWindowActions.ts';
import { createExperimentTutorialRuntimeFile, type TutorialOrdinaryWorkspace, mergeArchivedNamespacesIntoTutorialWorkspace } from './workbenchExperimentTutorialWorkspace.ts';
import { type HeatCapacityGuideLessonDialogState, type HeatCapacityGuideLessonView, HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS, getHeatCapacityGuideChecklistIndex, HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP, getHeatCapacityGuideStrongTargetSpec } from './workbenchHeatCapacityGuidePresentation.ts';
import { type ConsoleLog, createInitialLogs, type ConsoleTab, type LogKind, createConsoleLog } from './workbenchConsolePresentation.ts';
import { createExperimentTutorialLogs, type ExperimentTutorialNoticeKind, EXPERIMENT_TUTORIAL_COPY } from './workbenchExperimentTutorialPresentation.ts';
import { hasDesktopUpdaterBridge, hasDesktopLegalReadBridge, hasDesktopLegalBridge, isExportEnvironmentAvailableStatus, getFreshWorkbenchWindowUrl, WORKBENCH_USER_GUIDE_URLS, getAboutEnvironmentStatusLabel } from './workbenchDesktopCapabilities.ts';


import { type HeatCapacityGuideStrongCutout, createHeatCapacityGuideStrongDimPath } from './workbenchHeatCapacityGuideMaskGeometry.ts';
import { getHeatCapacityFreeParameterLockMessage, getLocalizedWorkbenchValidationErrors, type WorkbenchParameterSymbolPart } from './workbenchParameterPresentation.ts';
import { createStandardPanels, createIdealPanels, createHeatCapacityPanels, createPistonOscillationPanels, createResultsSections, type PanelDefinition, getLocalizedWorkbenchPanelTitle } from './workbenchPanelDefinitions.tsx';

import { renderScientificText } from './WorkbenchScientificText.tsx';
import { LOCKED_PANEL_KEYS } from './workbenchPanelAvailability.ts';
import { getLocalizedWorkbenchEditLabel } from './workbenchEditLabelLocalization.ts';
import { isEditableElement } from './workbenchEditableTarget.ts';
import { getHeatCapacityGuideStrongCutouts } from './workbenchHeatCapacityGuideMaskDom.ts';

import { SHARED_EXPERIMENT_PROGRESS_COPY } from './workbenchExperimentProgressCopy.ts';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import type { SimulationParams } from '../../shared/types';

import { translations } from '../../i18n/translations';
import SimulationCanvas from '../../components/SimulationCanvas';
import { PromptConfirmDialog, type PromptConfirmationRequest, usePromptConfirmation } from '../../components/prompts/PromptConfirmDialog.tsx';

import { PromptForcedNoticeDialog, PromptNoticeDialog, type PromptForcedNoticeRequest, type PromptNoticeRequest } from '../../components/prompts/PromptNoticeDialog.tsx';
import { PromptToastRegion, type PromptToastMessage } from '../../components/prompts/PromptFeedback.tsx';

import { PROMPT_FEEDBACK_COPY } from '../../components/prompts/promptFeedbackCopy.ts';
import { PROMPT_TOAST_DURATION_MS } from '../../components/prompts/promptFeedbackPolicy.ts';
import { adjustHeatCapacityPressureZeroCoarse, adjustHeatCapacityPressureZeroFine, setHeatCapacityPressureZeroOffset } from './workbenchHeatCapacityCalibrationCoordinator.ts';
import { acknowledgeHeatCapacityFreeFileNoticeWorkbenchState, createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { restartHeatCapacityFreeBatchWorkbenchState, restartCurrentHeatCapacityFreeExperimentWorkbenchState, prepareNextHeatCapacityFreeExperimentWorkbenchState } from './workbenchHeatCapacityFreeGroupLifecycle.ts';
import { selectHeatCapacityFreeAppliedParameterDraft, selectHeatCapacityFreeGasType } from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { areWorkbenchParamsEqual, getWorkbenchParameterRows, type WorkbenchParameterRow } from './workbenchParameterState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

import { applyHeatCapacityGuideRecordWorkbenchState, getHeatCapacityGuideRecordButtonState, setHeatCapacityGuideEquilibriumSpeedMultiplier, setHeatCapacityGuidePumpValveOpen, setHeatCapacityGuideStopcockOpen } from './workbenchHeatCapacityGuideControlState.ts';
import { completeHeatCapacityTeachingModeWorkbenchState } from './workbenchHeatCapacityTeachingResultState.ts';
import { completeHeatCapacityFreePreheatWorkbenchState, completeHeatCapacityGuidePreheatWorkbenchState, isHeatCapacityFreePreheatRequired, prepareHeatCapacityAutoDemoReset, prepareHeatCapacityAutoDemoStart, startHeatCapacityGuideWorkbenchState } from './workbenchHeatCapacityTeachingLifecycleState.ts';
import { captureHeatCapacityWorkbenchSample, powerHeatCapacityWorkbenchFile, refreshHeatCapacityPumpFrequency, registerHeatCapacityPumpStroke, setHeatCapacityScriptedPumpValveOpen, setHeatCapacityScriptedStopcockOpen, shouldCommitHeatCapacityRealtimeTick, stepHeatCapacityWorkbenchFile } from './workbenchHeatCapacityRuntimeCoordinator.ts';
import { deriveHeatCapacityFreeWorkbenchAttemptWaitTimer, dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState, evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState, getHeatCapacityFreeDisplayPhase } from './workbenchHeatCapacityFreeAttemptState.ts';
import { applyHeatCapacityFreeRecordWorkbenchState, getHeatCapacityFreeRecordButtonState } from './workbenchHeatCapacityFreeRecordState.ts';
import { removeHeatCapacityFreeTrialRecordWorkbenchState } from './workbenchHeatCapacityFreeRollbackState.ts';
import { selectActiveHeatCapacityWorkbenchDisplay } from './workbenchHeatCapacityDisplayState.ts';
import { setHeatCapacityFreeEquilibriumSpeedMultiplier, setHeatCapacityFreePumpValveOpen, setHeatCapacityFreeStopcockOpen } from './workbenchHeatCapacityFreeRuntimeCoordinator.ts';
import { completeHeatCapacityCalculationWorkflowWorkbenchState, continueHeatCapacityCalculationAnswerWorkbenchState, getHeatCapacityCalculationSession, revealHeatCapacityCalculationAnswerWorkbenchState, selectHeatCapacityCalculationAggregateWorkbenchState, selectHeatCapacityCalculationGroupWorkbenchState, submitHeatCapacityCalculationStepWorkbenchState, updateHeatCapacityCalculationDraftWorkbenchState } from './workbenchHeatCapacityCalculationCoordinator.ts';
import { applyHeatCapacityFreeParameterDraftWorkbenchState, canOpenHeatCapacityParameterSidebar, freezeHeatCapacityFreeParametersForCurrentGroup, getHeatCapacityFreeParameterLockReason, getHeatCapacityParameterSidebarBlockReason, hasCompletedHeatCapacityFreeRecordSet, isHeatCapacityFreeGasTypeEditingAvailable, resetHeatCapacityFreeParametersToDefaultWorkbenchState, shouldPromptHeatCapacityFreePowerOffBeforeNextGroup } from './workbenchHeatCapacityFreeParameterState.ts';
import { getActiveHeatCapacityFreeTrialIndex } from './workbenchHeatCapacityFreeTrialState.ts';
import { abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState, configureHeatCapacityFreeBatchWorkbenchState, getHeatCapacityFreeBatchProgress, isHeatCapacityFreeExperimentStarted, selectHeatCapacityFreeViewedExperimentGroupWorkbenchState, selectHeatCapacityFreeViewedTrialWorkbenchState, setHeatCapacityFreeParameterSchemeWorkbenchState } from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import { HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, getHeatCapacityPressureThresholdsMv, getHeatCapacityPressureZeroKnobAngleForOffset, getHeatCapacityPumpFrequencyState, getHeatCapacityStopcockState, getHeatCapacityStopcockTargetAngle, isHeatCapacityPhysicalKernelMode, isHeatCapacityPressureZeroWithinTolerance } from './workbenchHeatCapacityInstrumentState.ts';
import type { HeatCapacityFreeDisplayScheme, HeatCapacityMode, WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import type { WorkbenchFileKind } from './workbenchFileKind.ts';
import { clampWorkbenchLiveSplitRatio, createDefaultStandardFile, type WorkbenchIdealResultWindowKey, type WorkbenchPanelKey, type WorkbenchRunState } from './workbenchFileState.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from './workbenchPistonOscillationState.ts';

import { projectWorkbenchRunStateForRuntimeFailure } from './workbenchRuntimePersistence.ts';
import HeatCapacityInstrumentScene, { normalizeHeatCapacityCameraTransitionState, type HeatCapacityCameraPose, type HeatCapacityCameraTransitionState, type HeatCapacitySceneDiscreteMotionState, type HeatCapacitySceneCheckpointMetadata, type HeatCapacitySceneCheckpointProvider, type HeatCapacitySceneModeRestoreRequest, type HeatCapacitySceneModeTransitionController } from '../heatCapacity/HeatCapacityInstrumentScene';
import { normalizeHeatCapacityHardSphereVisualCheckpoint, type HeatCapacityHardSphereVisualCheckpoint } from '../heatCapacity/HeatCapacityHardSphereLayer.tsx';
import { normalizeHeatCapacityUltraVisualState, type HeatCapacityUltraVisualState } from '../heatCapacity/HeatCapacityUltraInstrumentModel.tsx';

import HeatCapacityBatchSetupDialog, { type HeatCapacityBatchGroupCount } from '../heatCapacity/HeatCapacityBatchSetupDialog.tsx';
import { FreeExperimentProgress } from '../../components/experiments/FreeExperimentProgress.tsx';
import HeatCapacityCalculationWindow from '../heatCapacity/HeatCapacityCalculationWindow.tsx';


import HeatCapacityReportExportDialog from '../heatCapacity/HeatCapacityReportExportDialog.tsx';




import { createHeatCapacityModeTransitionCheckpoint, getHeatCapacityModeTransitionVisualRemainingMs, normalizeHeatCapacityModeTransitionCheckpoint } from '../heatCapacity/heatCapacityModeTransitionModel.ts';
import { captureHeatCapacityModeTransitionDemoClock, resolveHeatCapacityModeTransitionDemoResume } from '../heatCapacity/heatCapacityModeTransitionDemoClock.ts';
import { resolveHeatCapacityGuidePulseRestore } from '../heatCapacity/heatCapacityGuidePulseClock.ts';
import { normalizeHeatCapacityAutoDemoResumeCursor } from '../heatCapacity/heatCapacityAutoDemoPreheatResume.ts';
import { useHeatCapacityModeSessionCoordinator, type HeatCapacityModeTransitionWatchdogEvent } from './useHeatCapacityModeSessionCoordinator.ts';
import { formatHeatCapacityFreeParameterValue, getHeatCapacityFreeParameterDraftValue, getHeatCapacityFreeParameterInputValue, heatCapacityFreeAdvancedNumberParameters, heatCapacityFreeBasicNumberParameters, heatCapacityFreeGasTypeOptions, heatCapacityFreeSharedText, type HeatCapacityFreeBasicCheckboxKey, type HeatCapacityFreeCheckboxDefinition, type HeatCapacityFreeDraftNumberKey, type HeatCapacityFreeNumberParameterDefinition, type HeatCapacityFreeParameterSymbolPart } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import type { HeatCapacityFreeGasType } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import { canProceedAfterPumping, getGuideHeatCapacityDisplayedPressureMv, getGuideHeatCapacityThresholdPressureMv, getHeatCapacityGuideStep as selectHeatCapacityGuideStep, getHeatCapacityPressureSafetyStatusFromMv, hasGuideHeatCapacityReachedPumpTarget, isGuideU0ZeroReady } from './workbenchHeatCapacityGuideDecisions.ts';
import { getGuideStepGuidance as selectGuideStepGuidance } from './workbenchHeatCapacityGuideGuidance.ts';
import { createHeatCapacityToastMessage, HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS, isHeatCapacityGuideToast, isHeatCapacityPressureToast, resolveHeatCapacityToastAdvance, resolveHeatCapacityToastClear, resolveHeatCapacityToastShow, type HeatCapacityToastLevel, type HeatCapacityToastMessage, type HeatCapacityToastSource } from '../heatCapacity/heatCapacityToastController.ts';
import { getHeatCapacityToastPolicySpec, type HeatCapacityToastPolicy } from '../heatCapacity/heatCapacityToastPolicy.ts';
import { type HeatCapacityAutoDemoPhase } from '../heatCapacity/heatCapacityModeControlModel.ts';
import { getHeatCapacityGuideAllowedActions, getHeatCapacityGuideRollbackAnimation, isGuideHeatCapacityPauseStep, isHeatCapacityGuideRecordStep, type GuideHeatCapacityAction, type GuideHeatCapacityStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';
import { getHeatCapacityGuideRollbackAnimationForControl, type HeatCapacityGuideRollbackAnimation, type HeatCapacityInstrumentControl } from '../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts';
import { HeatCapacityRejectedInteractionTracker, type HeatCapacityControlInteractionId } from '../heatCapacity/heatCapacityControlInteraction.ts';
import { createHeatCapacityAutoDemoSteps, deriveHeatCapacityAutoDemoZeroKnobMotion, deriveHeatCapacityAutoDemoWaitTimer, getHeatCapacityAutoDemoTimelineItemKey, getHeatCapacityAutoDemoTimeline, HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER, HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS, type HeatCapacityAutoDemoAction, type HeatCapacityAutoDemoStep, type HeatCapacityAutoDemoTimelineItem } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';

import type { HeatCapacityFreeRecordRejectReason } from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type { HeatCapacityFreeTrialRecordRemovalKind } from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { deriveHeatCapacityGuideExperimentTimer } from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import type { HeatCapacityGuideRecordKind } from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import { HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA } from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import { HEAT_CAPACITY_RELEASE_TIMING } from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { getHeatCapacityReleaseDurationS, HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA, isHeatCapacityReleaseFlowOpen, isHeatCapacityMainReleaseFlowOpen } from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import { HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE, clampNumber as clampHeatCapacityHardSphereNumber, type HeatCapacityHardSphereReleaseTimeline } from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import { getHeatCapacityFreePressureDangerUpperLimitMv, type HeatCapacityFreeParameterDraft } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

import { selectCurrentHeatCapacityFreeExperimentGroup } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import { createHeatCapacityAutoDemoProfile } from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import { createWorkbenchFigureSpecs, createWorkbenchResultSummary } from './workbenchResults';


import { loadClosedWorkbenchFiles, loadWorkbenchSession } from './workbenchSession.ts';
import { createWorkbenchActiveModeCheckpointOverride, initializeWorkbenchIndexedDbPersistence, type WorkbenchActiveModeCheckpointOverride } from './workbenchIndexedDbPersistence.ts';
import { type WorkbenchPersistenceReason } from './workbenchPersistenceScheduler.ts';
import { loadWorkbenchSidebarRefreshState, persistWorkbenchSidebarRefreshState } from './workbenchSidebarRefreshState.ts';
import { createUniqueWorkbenchFileId, getNextWorkbenchFileDisplayIndex } from './workbenchFileIdentity.ts';



import { createWorkbenchEditHistoryActions } from './workbenchEditHistoryActions.ts';
import type { WorkbenchEditSnapshot } from './workbenchEditSnapshot.ts';
import { isIdealResultWindowKey, loadWorkbenchLayoutDefaults, normalizeStandardResultsLayout, type WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';

import { getIdealGasAnalysis, getRelationLabel, getRelationVariableNumericValue, isVariableKeyForRelation, type ExperimentParamKey, type IdealGasAnalysis } from '../../domain/idealGas/idealGasExperiment';
import { HEAT_CAPACITY_QUALITY_PROFILES } from '../heatCapacity/heatCapacityQualityProfiles';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { loadWorkbenchGeneralSettings, type WorkbenchGeneralSettings, type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import { workbenchPromptCopies } from './workbenchPromptCopies.ts';


import { useAudioEngine } from '../../audio/react/useAudioEngine.ts';
import { normalizeWorkbenchConsoleMessageTranslations, type WorkbenchConsoleMessageFactory, type WorkbenchConsoleMessageInput } from './workbenchConsoleLocalization.ts';
import { findKnownConsoleMessageTranslations, getHeatCapacityFreeRecordRejectMessage, getHeatCapacityRealtimeCopy, getLocalizedHeatCapacityGuideRecordFailure, getLocalizedHeatCapacityPumpHint } from './workbenchHeatCapacityRealtimeCopy.ts';
import { getAboutUpdateStatusLabel } from './workbenchDesktopUpdater.ts';
import { WorkbenchUpdateDialog } from './WorkbenchUpdateDialog.tsx';

import { WorkbenchGeneralSettingsWindow } from './WorkbenchGeneralSettingsWindow.tsx';
import { WorkbenchAboutWindow } from './WorkbenchAboutWindow.tsx';

import { WorkbenchSimulationRealtimePanel } from './WorkbenchSimulationRealtimePanel.tsx';


import { formatMetric, getLocalizedStatusValue } from './workbenchPresentationFormatting.ts';
import { PistonOscillationCalculationWindow, PistonOscillationFreeSetupDialog } from '../pistonOscillation/index.ts';







import { getPistonOscillationParameterSidebarFreeOnlyMessage } from '../pistonOscillation/PistonOscillationParameterPanel.tsx';
import { type WorkbenchTopMenuId, type WorkbenchTopMenuResultChild } from './WorkbenchTopCommands.tsx';
import { WorkbenchHeatCapacityIdealProfileIntroDialog, WorkbenchHeatCapacityRestoreDefaultDialog } from './WorkbenchHeatCapacityParameterDialogs.tsx';
import { WorkbenchBuildNoticeWindow } from './WorkbenchBuildNoticeWindow.tsx';

import { buildNoticeSections } from './workbenchBuildNoticeContent.ts';
import { getWorkbenchSessionCacheSummary } from './workbenchFilePresentation.ts';
import { getIdealScanDecimals } from './workbenchIdealControls.ts';
import { getHeatCapacityMaterialsTabOrder, getPistonOscillationMaterialsPanelOrder, heatCapacityTabIdToPanelKey, isHeatCapacityPanelKey } from './workbenchHeatCapacityTabRegistry.ts';

import { createWorkbenchHeatCapacityRefreshSession, resolveWorkbenchHeatCapacityPressureAlertRefreshProjection, type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { asWorkbenchHeatCapacityRefreshJsonObject, getHeatCapacityRefreshBoolean, getHeatCapacityRefreshNumber, getHeatCapacityRefreshObject, getHeatCapacityRefreshOptionalNumber, getHeatCapacityRefreshString, getHeatCapacityRefreshStringMap, isHeatCapacityRefreshRecord, mapHeatCapacityAutoDemoCameraFocusMode, normalizeHeatCapacityFocusSession, normalizeHeatCapacityLessonCloseTimerPlan, normalizeHeatCapacityRecordSuccessTimerPlan, type HeatCapacityFocusControlSnapshot, type HeatCapacityFocusMode, type HeatCapacityFocusSession, type HeatCapacityLessonCloseTimerPlan, type HeatCapacityRecordSuccessTimerPlan } from './workbenchHeatCapacityUiCheckpoint.ts';
import { createHeatCapacityModeActions } from './workbenchHeatCapacityModeActions.ts';
import { resolveHeatCapacityModeTarget, shouldConfirmHeatCapacityTeachingProgressReset } from './workbenchHeatCapacityModeActivation.ts';
import { clearHeatCapacityModeSession, enterHeatCapacityExploreModeWorkbenchState, prepareHeatCapacityFileForExploreOnOpen, prepareHeatCapacityModeSessionForExit } from './workbenchHeatCapacityModeSession.ts';
import { completeExperimentTutorialProfile, EXPERIMENT_LEARNING_ORDER, isExperimentTutorialActive, skipExperimentTutorialProfile, startExperimentTutorialProfile, unlockExperimentGuideProfile, type AppExperienceProfile, type ExperimentLearningId, type ExperimentLearningMilestone } from '../learning/experimentLearningModel.ts';
import { APP_EXPERIENCE_PROFILE_STORAGE_KEY, persistAppExperienceProfile } from '../learning/experimentLearningStore.ts';
import { claimExperimentTutorialOwnership, createExperimentLearningChannel, EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY, releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership } from '../learning/experimentLearningChannel.ts';
import { evaluateWorkbenchTutorialAccess, isExperimentTutorialModeUnlocked, type WorkbenchTutorialAccessAction } from '../learning/workbenchTutorialAccessPolicy.ts';
import { clearExperimentTutorialHandoff, isExperimentTutorialFileId, persistExperimentTutorialHandoff } from '../learning/workbenchTutorialCoordinator.ts';
import { hasSameHeatCapacityRuntimeRecoveryState, rebaseHeatCapacityFileAfterSuspendedWallClock } from './workbenchHeatCapacityTimeRebase.ts';
import { WelcomeProductIntroFlow } from '../onboarding/WelcomeProductIntroFlow.tsx';
import { LearningNeedsPage } from '../onboarding/LearningNeedsPage.tsx';
import { firstRunCopies } from '../onboarding/firstRunCopy.ts';
import { useReducedMotionPreference } from '../onboarding/useReducedMotionPreference.ts';
import type { ExperimentFamiliarityAnswer } from '../onboarding/firstRunExperienceModel.ts';
import { RecoverableRenderErrorBoundary } from '../../components/errors/RecoverableRenderErrorBoundary.tsx';
import { WORKBENCH_WINDOW_CONTROL_COPY } from './WorkbenchWindowControls.tsx';
import { WorkbenchContentRenderErrorFallback } from './WorkbenchRenderErrorFallback.tsx';

import { createHeatCapacityModeDeferredTimer, createHeatCapacityModeUiCheckpoint, getHeatCapacityModeDeferredTimerRemainingMs, type HeatCapacityModeCameraPoseCheckpoint, type HeatCapacityModeDemoCheckpoint, type HeatCapacityModeGuideCheckpoint, type HeatCapacityModeJsonObject, type HeatCapacityModeLessonDialogCheckpoint, type HeatCapacityModePauseReason, type HeatCapacityModePumpAnimationCheckpoint, type HeatCapacityModeSceneCheckpoint, type HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import './WorkbenchStudioPrototype.css';


const HEAT_CAPACITY_REFRESH_SCENE_REVISION = 'heat-capacity-instrument-scene-v1';
const HEAT_CAPACITY_LIFECYCLE_DUPLICATE_FLUSH_WINDOW_MS = 250;
const HEAT_CAPACITY_SEMANTIC_CHECKPOINT_DEBOUNCE_MS = 120;
const HEAT_CAPACITY_SEMANTIC_CHECKPOINT_MAX_WAIT_MS = 600;
const EXPERIMENT_TUTORIAL_INSTANCE_ID = typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `tutorial-window-${Date.now()}-${Math.random().toString(36).slice(2)}`;


const WORKBENCH_APP_VERSION = __APP_VERSION__;

interface GuideHeatCapacityGuardResult {
  allowed: boolean;
  expectedControlId?: string;
  expectedMessage?: string;
  expectedLevel?: HeatCapacityToastLevel;
  rollbackAnimation?: HeatCapacityGuideRollbackAnimation;
  suppressGuidance?: boolean;
  suppressStrongReminder?: boolean;
}




const HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS = 250;
const HEAT_CAPACITY_AUTO_DEMO_LOCKED_POINTER_FALLBACK_MS = 320;
const HEAT_CAPACITY_GUIDE_START_NOTICE_MS = 1000;
const HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS = 2000;
const HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS = 220;
const HEAT_CAPACITY_RESET_FEEDBACK_MS = 650;
const HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS = 380;
const HEAT_CAPACITY_MODE_TRANSITION_SETTLE_DEADLINE_MS = 250;
const HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX = 48;
const HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX = 42;




























const HEAT_CAPACITY_AUTO_DEMO_RESET_MS = 1_800;
const HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS = 560;





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
  const [experienceProfile, setExperienceProfile] = useState<AppExperienceProfile>(
    initialExperienceProfileLoad.profile,
  );
  const initialHeatCapacityRefreshWindows = initialHeatCapacityRefreshSession?.ui.windows ?? {};
  const initialHeatCapacityRefreshDrafts = initialHeatCapacityRefreshSession?.ui.drafts ?? {};
  const initialHeatCapacityRefreshLayout = initialHeatCapacityRefreshSession?.ui.layout ?? {};
  const [initialWorkbenchSidebarRefreshState] = useState(() => (
    loadWorkbenchSidebarRefreshState()
  ));
  const initialHeatCapacityRecordSuccessTimerPlan = initialHeatCapacityRefreshSession
    ? normalizeHeatCapacityRecordSuccessTimerPlan(
        initialHeatCapacityRefreshLayout,
        initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
        initialHeatCapacityRefreshSession.mode,
      )
    : null;
  const initialHeatCapacityPressureAlarmPlan =
    initialHeatCapacityRefreshSession?.guide.pressureAlarmVisible &&
    initialHeatCapacityRefreshSession.guide.pressureAlarmRemainingMs !== null
      ? {
          fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
          remainingMs: initialHeatCapacityRefreshSession.guide.pressureAlarmRemainingMs,
        }
      : null;
  const initialHeatCapacityClosePumpValveReminderPlan = (() => {
    if (!initialHeatCapacityRefreshSession || initialHeatCapacityPressureAlarmPlan) return null;
    const fileId = getHeatCapacityRefreshString(
      initialHeatCapacityRefreshLayout,
      'closePumpValveReminderFileId',
    );
    const remainingMs = getHeatCapacityRefreshOptionalNumber(
      initialHeatCapacityRefreshLayout,
      'closePumpValveReminderRemainingMs',
    );
    return fileId === initialHeatCapacityRefreshSession.activeHeatCapacityFileId && remainingMs !== null
      ? { fileId, remainingMs }
      : null;
  })();
  const initialHeatCapacityRefreshToast = initialHeatCapacityRefreshSession?.guide.toastQueue.current
    ? {
        id: initialHeatCapacityRefreshSession.guide.toastQueue.current.id,
        text: initialHeatCapacityRefreshSession.guide.toastQueue.current.text,
        level: initialHeatCapacityRefreshSession.guide.toastQueue.current.level,
        kind: initialHeatCapacityRefreshSession.guide.toastQueue.current.level,
        priority: initialHeatCapacityRefreshSession.guide.toastQueue.current.priority,
        source: initialHeatCapacityRefreshSession.guide.toastQueue.current.source,
        createdAt: initialHeatCapacityRefreshSession.guide.toastQueue.current.createdAtMs,
        durationMs: HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
      } satisfies HeatCapacityToastMessage
    : null;
  const initialHeatCapacityRefreshPendingToast = initialHeatCapacityRefreshSession?.guide.toastQueue.pending[0]
    ? {
        id: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].id,
        text: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].text,
        level: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].level,
        kind: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].level,
        priority: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].priority,
        source: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].source,
        createdAt: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].createdAtMs,
        durationMs: HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
      } satisfies HeatCapacityToastMessage
    : null;
  const initialHeatCapacityRefreshLessonDialog: HeatCapacityGuideLessonDialogState | null = (() => {
    const restoredDialog = initialHeatCapacityRefreshSession?.guide.lessonDialog;
    if (!restoredDialog) return null;
    if (restoredDialog.kind === 'intro') return { kind: 'intro', pageIndex: restoredDialog.pageIndex };
    return {
      kind: 'step',
      lessonId: restoredDialog.lessonId,
    };
  })();
  const initialHeatCapacityLessonCloseTimerPlan = initialHeatCapacityRefreshSession
    ? normalizeHeatCapacityLessonCloseTimerPlan(
        initialHeatCapacityRefreshLayout,
        initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
        initialHeatCapacityRefreshSession.mode,
        initialHeatCapacityRefreshLessonDialog !== null,
      )
    : null;
  const initialHeatCapacityCameraPose: HeatCapacityCameraPose | null = initialHeatCapacityRefreshSession?.cameraPose
    ? {
        position: initialHeatCapacityRefreshSession.cameraPose.position,
        target: initialHeatCapacityRefreshSession.cameraPose.target,
        fov: initialHeatCapacityRefreshSession.cameraPose.fovDeg,
      }
    : null;
  const initialHeatCapacityFocusMode: HeatCapacityFocusMode =
    initialHeatCapacityRefreshSession?.focusMode ?? 'none';
  const initialHeatCapacityFocusSession = normalizeHeatCapacityFocusSession(
    getHeatCapacityRefreshObject(initialHeatCapacityRefreshLayout, 'heatCapacityFocusSession'),
  );
  const initialHeatCapacityGuidePulsePlan = resolveHeatCapacityGuidePulseRestore({
    fileId: initialHeatCapacityRefreshSession?.activeHeatCapacityFileId,
    controlId: initialHeatCapacityRefreshSession?.guide.normalReminder.controlId,
    remainingMs: initialHeatCapacityRefreshSession?.guide.normalReminder.remainingMs,
    clockRunning: false,
  });
  const initialHeatCapacityAutoDemoTimeline = useMemo(() => (
    initialHeatCapacityRefreshSession?.mode === 'demo' && initialHeatCapacityRefreshSession.demo.phase !== 'idle'
      ? getHeatCapacityAutoDemoTimeline(createHeatCapacityAutoDemoSteps())
      : []
  ), [initialHeatCapacityRefreshSession]);
  const [workbenchLayoutDefaults, setWorkbenchLayoutDefaults] = useState<WorkbenchLayoutDefaults>(() => loadWorkbenchLayoutDefaults());
  const [files, setFiles] = useState<WorkbenchFileState[]>(() => normalizeWorkbenchInitialFiles(
    initialSession.files,
    loadWorkbenchLayoutDefaults(),
    initialHeatCapacityRefreshSession,
  ));
  const [closedFiles, setClosedFiles] = useState<WorkbenchFileState[]>(() => (
    initialTutorialReconstruction
      ? []
      : initialTutorialHandoffRecovery
        ? [...initialOrdinarySession.files, ...initialOrdinaryClosedFiles].filter((file) => (
            initialTutorialHandoff.status !== 'loaded' ||
            file.id !== initialTutorialHandoff.marker.targetFileId
          ))
        : initialOrdinaryClosedFiles
  ));
  const initialGeneralSettings = useMemo(
    () => initialGeneralSettingsOverride ?? loadWorkbenchGeneralSettings(),
    [initialGeneralSettingsOverride],
  );
  const [activeFileId, setActiveFileId] = useState(initialSession.activeFileId);
  const [selectedFileId, setSelectedFileId] = useState(() => {
    const restoredSelectedFileId = getHeatCapacityRefreshString(initialHeatCapacityRefreshLayout, 'selectedFileId');
    return restoredSelectedFileId && initialSession.files.some((file) => file.id === restoredSelectedFileId)
      ? restoredSelectedFileId
      : initialSession.activeFileId;
  });
  const [selectedPanel, setSelectedPanel] = useState<WorkbenchPanelKey>(initialSession.selectedPanel);
  const { workspacePersistenceStatus, workspacePersistenceSchedulerRef } = useWorkbenchWorkspacePersistenceScheduler();
  const [logs, setLogs] = useState<ConsoleLog[]>(() => {
    const restoredLogs = initialHeatCapacityRefreshLayout.logs;
    if (!Array.isArray(restoredLogs)) return createInitialLogs(initialGeneralSettings.language);
    const normalizedLogs: ConsoleLog[] = restoredLogs.flatMap((entry) => {
      if (
        !isHeatCapacityRefreshRecord(entry) ||
        typeof entry.id !== 'number' ||
        typeof entry.time !== 'string' ||
        (entry.kind !== 'info' && entry.kind !== 'warning' && entry.kind !== 'success' && entry.kind !== 'error') ||
        typeof entry.message !== 'string'
      ) return [];
      const messages = normalizeWorkbenchConsoleMessageTranslations(entry.messages)
        ?? findKnownConsoleMessageTranslations(entry.message);
      return [{
        id: entry.id,
        time: entry.time,
        kind: entry.kind,
        message: entry.message,
        ...(messages ? { messages } : {}),
      }];
    });
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
    return normalizedLogs.length > 0 ? normalizedLogs : createInitialLogs(initialGeneralSettings.language);
  });


  const [consoleTab, setConsoleTab] = useState<ConsoleTab>(() => {
    const restored = getHeatCapacityRefreshString(initialHeatCapacityRefreshLayout, 'consoleTab');
    return restored === 'warnings' || restored === 'summary' ? restored : 'logs';
  });
  const [consoleCollapsed, setConsoleCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'consoleCollapsed')
  ));
  const [consoleHeightPx, setConsoleHeightPx] = useState(() => (
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'consoleHeightPx', 156)
  ));
  const [openTopMenu, setOpenTopMenu] = useState<WorkbenchTopMenuId>(() => {
    const restored = getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'openTopMenu');
    return restored === 'new' || restored === 'edit' || restored === 'window' || restored === 'settings' || restored === 'help'
      ? restored
      : null;
  });
  const [topMenuLeft, setTopMenuLeft] = useState(() => (
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshWindows, 'topMenuLeft', 10)
  ));


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
  const [tutorialNoticeKind, setTutorialNoticeKind] = useState<ExperimentTutorialNoticeKind | null>(() => {
    if (initialTutorialHandoffRecovery) return null;
    if (!initialTutorialReconstruction) return null;
    if (window.hardSphereLabTutorial) return null;
    if (
      initialTutorialEntryKind === 'start' &&
      initialActiveTutorialExperiment !== null &&
      initialExperienceProfileLoad.profile.learning[initialActiveTutorialExperiment] === 'demo'
    ) return 'start-demo';
    return initialActiveTutorialExperiment !== null &&
      initialExperienceProfileLoad.profile.learning[initialActiveTutorialExperiment] === 'guide'
      ? 'resume-guide'
      : 'resume-demo';
  });
  const tutorialNoticeKindRef = useRef<ExperimentTutorialNoticeKind | null>(tutorialNoticeKind);
  const [tutorialBlockedNoticeOpen, setTutorialBlockedNoticeOpen] = useState(false);
  const [remoteTutorialOwnerActive, setRemoteTutorialOwnerActive] = useState(false);
  const [productIntroReplayPhase, setProductIntroReplayPhase] = useState<'welcome' | 'product' | null>(null);
  const [learningNeedsReselectOpen, setLearningNeedsReselectOpen] = useState(false);
  const [learningNeedsDraft, setLearningNeedsDraft] = useState<Record<ExperimentLearningId, ExperimentFamiliarityAnswer | null>>({
    heatCapacity: null,
    pistonOscillation: null,
  });
  const onboardingReducedMotion = useReducedMotionPreference();
  const [tutorialOperationError, setTutorialOperationError] = useState<{
    message: string;
    retry: (() => void) | null;
  } | null>(null);
  const tutorialGuideUnlockPendingRef = useRef(false);
  const experienceProfileRef = useRef(experienceProfile);
  const experienceProfilePersistedRef = useRef(initialExperienceProfileLoad.persisted);
  const activeTutorialExperiment = experienceProfile.activeTutorialExperiment;
  const tutorialActive = isExperimentTutorialActive(experienceProfile);
  const tutorialActiveRef = useRef(tutorialActive);

  const workbenchCopy = workbenchCopies[settingsLanguagePreference];
  const auxiliaryWindows = useWorkbenchAuxiliaryWindows({
    initialHeatCapacityRefreshWindows, aboutCopy: workbenchCopy.about, setSettingsLanguageMenuOpen, setOpenTopMenu,
  });
  const { settingsGeneralOpen, aboutWindowOpen, buildNoticeWindowOpen, buildNoticeNavOpen, activeBuildNoticeMaterialId, buildNoticeFilePreview, buildNoticeOpenError, aboutResultNotice } = auxiliaryWindows.view;
  const { closeGeneralSettings, openGeneralSettings, showAboutResultNotice, closeAboutWindow, openAboutWindow, openBuildNoticeWindow, closeBuildNoticeWindow, jumpToBuildNoticeSection, openBuildNoticeMaterial, closeBuildNoticeMaterial, openBuildNoticeLegalFile, hideGeneralSettings, setBuildNoticeNavigationOpen, dismissAboutResultNotice } = auxiliaryWindows.actions;

  const workbenchPromptCopy = workbenchPromptCopies[settingsLanguagePreference];
  const windowControlCopy = WORKBENCH_WINDOW_CONTROL_COPY[settingsLanguagePreference];
  const heatCapacityQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES[settingsPerformanceMode];

  const [initialHeatCapacityCameraTransition] = useState<HeatCapacityCameraTransitionState | null>(() => (
    normalizeHeatCapacityCameraTransitionState(initialHeatCapacityRefreshLayout.cameraTransition)
  ));
  const [initialHeatCapacityUltraVisualState] = useState<HeatCapacityUltraVisualState | null>(() => (
    normalizeHeatCapacityUltraVisualState(initialHeatCapacityRefreshLayout.ultraVisualState)
  ));
  const [initialHeatCapacityHardSphereVisualCheckpoint] = useState<HeatCapacityHardSphereVisualCheckpoint | null>(() => (
    normalizeHeatCapacityHardSphereVisualCheckpoint(
      initialHeatCapacityRefreshLayout.hardSphereVisualCheckpoint,
      heatCapacityQualityProfile.renderModel === 'ultraGlb' ? 'ultra-cylinder' : 'skeleton-box',
    )
  ));
  const [heatCapacitySceneRestoreAcknowledged, setHeatCapacitySceneRestoreAcknowledged] = useState(
    initialHeatCapacityRefreshSession === null,
  );
  const [heatCapacityInitialSceneRestoreEnabled, setHeatCapacityInitialSceneRestoreEnabled] = useState(
    initialHeatCapacityRefreshSession !== null,
  );
  const [heatCapacityModeSceneRestoreSession, setHeatCapacityModeSceneRestoreSession] = useState<
    HeatCapacityModeUiCheckpoint | null
  >(null);
  const [heatCapacityModeSceneRestoreRequest, setHeatCapacityModeSceneRestoreRequest] = useState<
    HeatCapacitySceneModeRestoreRequest | null
  >(null);
  const [heatCapacityRefreshRestoring, setHeatCapacityRefreshRestoring] = useState(
    initialHeatCapacityRefreshSession !== null,
  );
  const [desktopExitQuiesced, setDesktopExitQuiesced] = useState(false);
  const [desktopExitInputBlocked, setDesktopExitInputBlocked] = useState(false);
  const heatCapacityRuntimeFailureFileIdRef = useRef<string | null>(null);
  const [heatCapacityRuntimeFailureFileId, setHeatCapacityRuntimeFailureFileId] = useState<string | null>(null);
  const heatCapacityRuntimeRecoveryIntentRef = useRef<{
    fileId: string;
    expectedFile: WorkbenchHeatCapacityState | null;
    suspendedAtMs: number;
    projectedRunState: WorkbenchRunState;
    resumeGuideRunState: boolean;
    pauseDemoOnRecovery: boolean;
  } | null>(null);
  const [initialHeatCapacityModeTransitionState] = useState(() => {
    const initialFile = initialSession.files.find((file) => file.id === initialSession.activeFileId);
    const initialMode = initialFile?.kind === 'heatCapacity' ? initialFile.heatCapacityMode : 'free';
    return normalizeHeatCapacityModeTransitionCheckpoint(
      initialHeatCapacityRefreshSession?.modeTransition,
      initialMode,
    );
  });
  const heatCapacityModeTransitionWatchdogHandlerRef = useRef<(
    event: HeatCapacityModeTransitionWatchdogEvent,
  ) => void>(() => undefined);
  const {
    state: heatCapacityModeTransitionState,
    stateRef: heatCapacityModeTransitionStateRef,
    dispatch: dispatchHeatCapacityModeTransition,
    requestTransition: requestHeatCapacityModeTransition,
    locked: heatCapacityModeTransitionLocked,
  } = useHeatCapacityModeSessionCoordinator({
    initialState: initialHeatCapacityModeTransitionState,
    onWatchdog: (event) => heatCapacityModeTransitionWatchdogHandlerRef.current(event),
    watchdogPaused:
      heatCapacityRefreshRestoring ||
      desktopExitQuiesced ||
      heatCapacityRuntimeFailureFileId !== null,
  });
  const pendingHeatCapacityGuideUiRestoreRef = useRef<{
    requestId: number;
    fileId: string;
    checkpoint: HeatCapacityModeGuideCheckpoint;
  } | null>(initialHeatCapacityRefreshSession?.modeTransitionGuideUi
    ? {
        requestId: heatCapacityModeTransitionState.requestId,
        fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
        checkpoint: initialHeatCapacityRefreshSession.modeTransitionGuideUi,
      }
    : null);
  const heatCapacitySceneDiscreteMotionRef = useRef<HeatCapacitySceneDiscreteMotionState>({
    active: false,
    reasons: [],
  });
  const heatCapacitySceneModeTransitionControllerRef = useRef<
    HeatCapacitySceneModeTransitionController | null
  >(null);
  const heatCapacityModeTransitionPrepareFrameRef = useRef<number | null>(null);
  const heatCapacityModeTransitionVisualTimerRef = useRef<number | null>(null);
  const heatCapacityModeTransitionPausedVisualClockRef = useRef<{
    requestId: number;
    remainingMs: number;
  } | null>(null);
  const heatCapacityModeTransitionRefreshResumedRef = useRef(false);
  const scheduleHeatCapacityModeTargetPreparationRef = useRef<(requestId: number) => void>(() => undefined);
  const workbenchTranslation = translations[settingsLanguagePreference === 'en' ? 'en-GB' : settingsLanguagePreference];
  const initialActiveWorkbenchFile = initialSession.files.find(
    (file) => file.id === initialSession.activeFileId,
  );
  const [leftCollapsed, setLeftCollapsed] = useState(() => (
    typeof initialHeatCapacityRefreshLayout.leftCollapsed === 'boolean'
      ? initialHeatCapacityRefreshLayout.leftCollapsed
      : initialWorkbenchSidebarRefreshState.leftCollapsed
  ));
  const [parametersCollapsed, setParametersCollapsed] = useState(() => (
    typeof initialHeatCapacityRefreshLayout.parametersCollapsed === 'boolean'
      ? initialHeatCapacityRefreshLayout.parametersCollapsed
      : initialWorkbenchSidebarRefreshState.parametersCollapsed
  ));
  useLayoutEffect(() => {
    persistWorkbenchSidebarRefreshState({
      schemaVersion: 1,
      leftCollapsed,
      parametersCollapsed,
    });
  }, [leftCollapsed, parametersCollapsed]);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => clamp(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'leftSidebarWidth', 286),
    LEFT_SIDEBAR_MIN,
    LEFT_SIDEBAR_MAX,
  ));
  const [parameterSidebarWidth, setParameterSidebarWidth] = useState(() => clamp(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'parameterSidebarWidth', 300),
    PARAM_SIDEBAR_MIN,
    PARAM_SIDEBAR_MAX,
  ));
  const [filesSectionCollapsed, setFilesSectionCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'filesSectionCollapsed')
  ));
  const [panelsSectionCollapsed, setPanelsSectionCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'panelsSectionCollapsed')
  ));
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'openFileMenuId')
  ));
  const [renamingFileId, setRenamingFileId] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'renamingFileId')
  ));
  const [renameDraft, setRenameDraft] = useState(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshDrafts, 'renameDraft', '') ?? ''
  ));
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [pendingRemovePointId, setPendingRemovePointId] = useState<string | null>(null);
  const [pendingRemoveHeatCapacityTrialRecord, setPendingRemoveHeatCapacityTrialRecord] = useState<{
    trialIndex: number;
    kind: HeatCapacityFreeTrialRecordRemovalKind;
    scheme: HeatCapacityFreeDisplayScheme;
  } | null>(null);
  const [pendingClearRelationKey, setPendingClearRelationKey] = useState<string | null>(null);
  const [resultsChildrenCollapsed, setResultsChildrenCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'resultsChildrenCollapsed')
  ));
  const [samplingPresetMenuOpen, setSamplingPresetMenuOpen] = useState(false);
  const [idealAdvancedSettingsOpen, setIdealAdvancedSettingsOpen] = useState(false);
  const [idealAdvancedSettingsBodyVisible, setIdealAdvancedSettingsBodyVisible] = useState(false);
  const [parameterInputDrafts, setParameterInputDrafts] = useState<Record<string, string>>({});







































































  const [parameterErrors, setParameterErrors] = useState<string[]>([]);
  const [heatCapacityBasicInputDrafts, setHeatCapacityBasicInputDrafts] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityBasicInputDrafts')
  ));
  const [heatCapacityBasicInputErrors, setHeatCapacityBasicInputErrors] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityBasicInputErrors')
  ));
  const [heatCapacityAdvancedOpen, setHeatCapacityAdvancedOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'heatCapacityAdvancedOpen')
  ));
  const [heatCapacityAdvancedDraft, setHeatCapacityAdvancedDraft] = useState<HeatCapacityFreeParameterDraft | null>(() => {
    const restored = getHeatCapacityRefreshObject(initialHeatCapacityRefreshDrafts, 'heatCapacityAdvancedDraft');
    return restored as unknown as HeatCapacityFreeParameterDraft | null;
  });
  const [heatCapacityAdvancedInputDrafts, setHeatCapacityAdvancedInputDrafts] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityAdvancedInputDrafts')
  ));
  const [heatCapacityAdvancedInputErrors, setHeatCapacityAdvancedInputErrors] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityAdvancedInputErrors')
  ));
  const [heatCapacityRestoreDefaultConfirmOpen, setHeatCapacityRestoreDefaultConfirmOpen] = useState(false);
  const [heatCapacityIdealIntroOpen, setHeatCapacityIdealIntroOpen] = useState(false);
  const [heatCapacityBatchSetupSelection, setHeatCapacityBatchSetupSelection] =
    useState<HeatCapacityBatchGroupCount | null>(null);
  const [heatCapacityBatchSetupRequestedFileId, setHeatCapacityBatchSetupRequestedFileId] =
    useState<string | null>(null);

  const [heatCapacityCalculationReviewOpen, setHeatCapacityCalculationReviewOpen] =
    useState(false);







  const [hoveredHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId] = useState<string | null>(null);
  const [pinnedHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'pinnedHeatCapacityParamHelpId')
  ));
  const [heatCapacityParamHelpPopoverStyle, setHeatCapacityParamHelpPopoverStyle] = useState<
    React.CSSProperties | undefined
  >(undefined);
  const [scanInputDraft, setScanInputDraft] = useState('');
  const [scanInputFocused, setScanInputFocused] = useState(false);
  const [scanInputError, setScanInputError] = useState<string | null>(null);
  const [scanInputToast, setScanInputToast] = useState<string | null>(null);
  const [scanSliderThumbHover, setScanSliderThumbHover] = useState(false);
  const [scanSliderDragging, setScanSliderDragging] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [liveWorkspaceResizing, setLiveWorkspaceResizing] = useState(false);
  const [undoStack, setUndoStack] = useState<WorkbenchEditSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<WorkbenchEditSnapshot[]>([]);
  const undoStackRef = useRef<WorkbenchEditSnapshot[]>(undoStack);
  const redoStackRef = useRef<WorkbenchEditSnapshot[]>(redoStack);
  const standardRuntimeRef = useRef<Record<string, StandardEngineRuntime>>({});
  const idealRuntimeRef = useRef<Record<string, StandardEngineRuntime>>({});
  const filesRef = useRef<WorkbenchFileState[]>(files);
  const closedFilesRef = useRef<WorkbenchFileState[]>(closedFiles);
  const tutorialOrdinaryWorkspaceRef = useRef<TutorialOrdinaryWorkspace | null>(
    initialTutorialReconstruction
      ? {
          files: initialOrdinarySession.files,
          closedFiles: initialOrdinaryClosedFiles,
          activeFileId: initialOrdinarySession.activeFileId,
          selectedPanel: initialOrdinarySession.selectedPanel,
        }
      : null,
  );
  const experimentLearningChannelRef = useRef<ReturnType<typeof createExperimentLearningChannel> | null>(null);
  const tutorialOwnershipAdoptionPendingRef = useRef(false);
  const tutorialOwnershipAdoptionRef = useRef<() => Promise<void>>(async () => undefined);
  const tutorialOwnershipClaimRef = useRef<(force?: boolean) => void>(() => undefined);
  const tutorialOrdinaryWorkspaceRefreshRef = useRef<Promise<TutorialOrdinaryWorkspace> | null>(null);
  const refreshTutorialOrdinaryWorkspaceFromPersistence = () => {
    if (tutorialOrdinaryWorkspaceRefreshRef.current) {
      return tutorialOrdinaryWorkspaceRefreshRef.current;
    }
    const refresh = initializeWorkbenchIndexedDbPersistence()
      .then(() => {
        const session = loadWorkbenchSession();
        const now = Date.now();
        const normalizeFile = (file: WorkbenchFileState, index: number) => (
          file.kind === 'heatCapacity'
            ? prepareHeatCapacityFileForExploreOnOpen(
                file,
                createDefaultHeatCapacityFile(index + 1),
                now,
              )
            : file
        );
        const workspace: TutorialOrdinaryWorkspace = {
          files: cloneWorkbenchFiles(session.files).map(normalizeFile),
          closedFiles: cloneWorkbenchFiles(loadClosedWorkbenchFiles()).map(normalizeFile),
          activeFileId: session.activeFileId,
          selectedPanel: session.selectedPanel,
        };
        tutorialOrdinaryWorkspaceRef.current = workspace;
        return workspace;
      })
      .finally(() => {
        if (tutorialOrdinaryWorkspaceRefreshRef.current === refresh) {
          tutorialOrdinaryWorkspaceRefreshRef.current = null;
        }
      });
    tutorialOrdinaryWorkspaceRefreshRef.current = refresh;
    return refresh;
  };
  const issuedWorkbenchFileIdsRef = useRef(new Set(
    [
      ...files.map((file) => file.id),
      ...closedFiles.map((file) => file.id),
    ],
  ));
  const activeFileIdRef = useRef(initialSession.activeFileId);
  const selectedPanelRef = useRef<WorkbenchPanelKey>(initialSession.selectedPanel);
  const scheduleWorkspacePersistenceRef = useRef<(
    reason?: WorkbenchPersistenceReason,
  ) => boolean>(() => false);
  const flushWorkspacePersistenceRef = useRef<(
    activeModeCheckpointOverride?: WorkbenchActiveModeCheckpointOverride,
  ) => Promise<boolean>>(async () => false);
  const persistWorkspaceLifecycleCheckpointRef = useRef<(forceFresh?: boolean) => Promise<boolean>>(async () => false);
  const desktopExitQuiescedRef = useRef(false);
  const desktopExitInputBlockedRef = useRef(false);
  const prepareDesktopExitQuiescenceRef = useRef<(blockInput?: boolean) => void>(() => undefined);
  const resumeDesktopExitQuiescenceRef = useRef<() => void>(() => undefined);
  const desktopExitAutoDemoClockRef = useRef<
    WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock']
  >(null);
  const desktopExitQuiescedAtMsRef = useRef<number | null>(null);
  const workspacePersistenceLocationRef = useRef({
    fileId: initialSession.activeFileId,
    mode: initialSession.files.find((file) => file.id === initialSession.activeFileId)?.kind === 'heatCapacity'
      ? (initialSession.files.find((file) => file.id === initialSession.activeFileId) as WorkbenchHeatCapacityState).heatCapacityMode
      : null,
  });
  const renamingFileIdRef = useRef<string | null>(renamingFileId);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const topCommandsRef = useRef<HTMLElement | null>(null);
  const topMenuRef = useRef<HTMLDivElement | null>(null);
  const workbenchBodyRef = useRef<HTMLElement | null>(null);
  const workspaceShellRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const liveWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const parameterSidebarResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const liveWorkspaceResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const consoleResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const resizeGhostFrameRef = useRef<number | null>(null);
  const consoleResizeRef = useRef<{ startY: number; startHeight: number; shellHeight: number; footerHeight: number } | null>(null);
  const fileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameSelectionModeRef = useRef<'initial' | 'normal'>('normal');
  const lastScanInputErrorRef = useRef<string | null>(null);
  const samplingPresetSelectRef = useRef<HTMLDivElement | null>(null);
  const consoleBodyRef = useRef<HTMLDivElement | null>(null);
  const currentParametersBodyRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityParamHelpSuppressClickRef = useRef(false);


  const idealAdvancedSettingsBodyRef = useRef<HTMLDivElement | null>(null);
  const idealAdvancedSettingsPreviousScrollTopRef = useRef(0);
  const idealAdvancedScrollFrameRef = useRef<number | null>(null);
  const centerWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const fileTabsRef = useRef<HTMLDivElement | null>(null);
  const idealResultWindowRegionRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityPumpAnimationRef = useRef<{
    fileId: string | null;
    releaseTimerId: number | null;
    idleTimerId: number | null;
    releaseDeadlineAtMs: number | null;
    idleDeadlineAtMs: number | null;
    pausedReleaseRemainingMs: number | null;
    pausedIdleRemainingMs: number | null;
  }>({
    fileId: null,
    releaseTimerId: null,
    idleTimerId: null,
    releaseDeadlineAtMs: null,
    idleDeadlineAtMs: null,
    pausedReleaseRemainingMs: null,
    pausedIdleRemainingMs: null,
  });
  const heatCapacityAutoDemoTimersRef = useRef<number[]>([]);
  const heatCapacityModeTransitionDemoClockRef = useRef<
    WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock']
  >(initialHeatCapacityRefreshSession?.modeTransitionDemoClock ?? null);
  const heatCapacityAutoDemoFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'demo' && initialHeatCapacityRefreshSession.demo.phase !== 'idle'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );
  const heatCapacityAutoDemoTimelineRef = useRef<HeatCapacityAutoDemoTimelineItem[]>(
    initialHeatCapacityAutoDemoTimeline,
  );
  const heatCapacityAutoDemoStartedAtMsRef = useRef(0);
  const heatCapacityAutoDemoPausedElapsedMsRef = useRef(
    initialHeatCapacityRefreshSession?.demo.elapsedMs ?? 0,
  );
  const heatCapacityAutoDemoInitialDelayRemainingMsRef = useRef(
    initialHeatCapacityRefreshSession?.demo.initialDelayRemainingMs ?? 0,
  );
  const heatCapacityAutoDemoPausedFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'demo' && initialHeatCapacityRefreshSession.demo.phase === 'paused'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );
  const heatCapacityAutoDemoLastProcessedTimelineIndexRef = useRef(
    initialHeatCapacityRefreshSession?.demo.timeline.currentItemIndex ?? -1,
  );
  const heatCapacityAutoDemoExecutedItemKeysRef = useRef<Set<string>>(new Set(
    initialHeatCapacityRefreshSession?.demo.timeline.executedItemKeys.length
      ? initialHeatCapacityRefreshSession.demo.timeline.executedItemKeys
      : initialHeatCapacityRefreshSession?.demo.timeline.currentItemIndex !== null &&
          initialHeatCapacityRefreshSession?.demo.timeline.currentItemIndex !== undefined
        ? initialHeatCapacityAutoDemoTimeline
            .slice(0, initialHeatCapacityRefreshSession.demo.timeline.currentItemIndex + 1)
            .map(getHeatCapacityAutoDemoTimelineItemKey)
        : [],
  ));
  const demoCameraFocusModeRef = useRef<Exclude<HeatCapacityFocusMode, 'none'> | null>(
    initialHeatCapacityRefreshSession?.demo.cameraMode ?? null,
  );
  const heatCapacityAutoDemoCompleteToastTimerRef = useRef<number | null>(null);
  const heatCapacityAutoDemoCompleteToastTimerGenerationRef = useRef(0);
  const heatCapacityAutoDemoCompleteToastDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityAutoDemoCompleteToastPausedRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(
    initialHeatCapacityRefreshSession?.demo.completionMessageRemainingMs !== null &&
    initialHeatCapacityRefreshSession?.demo.completionMessageRemainingMs !== undefined
      ? {
          fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
          remainingMs: initialHeatCapacityRefreshSession.demo.completionMessageRemainingMs,
        }
      : null,
  );
  const heatCapacityAutoDemoStepPanelTimerRef = useRef<number | null>(null);
  const heatCapacityAutoDemoStepPanelTimerGenerationRef = useRef(0);
  const heatCapacityAutoDemoStepPanelDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityAutoDemoStepPanelPausedRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(null);
  const heatCapacityGuideStartTimerRef = useRef<number | null>(null);
  const heatCapacityRecordSuccessToastTimersRef = useRef<number[]>([]);
  const heatCapacityRecordSuccessFollowUpDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityRecordSuccessReleaseDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityRecordSuccessFollowUpMessageRef = useRef<string | null>(null);
  const heatCapacityRecordSuccessTimerGenerationRef = useRef(0);
  const heatCapacityRecordSuccessPausedRef = useRef<HeatCapacityRecordSuccessTimerPlan | null>(
    initialHeatCapacityRecordSuccessTimerPlan,
  );
  const heatCapacityPressureAlarmTimerRef = useRef<number | null>(null);
  const heatCapacityPressureAlarmTimerGenerationRef = useRef(0);
  const desktopExitPausedPressureAlarmRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(initialHeatCapacityPressureAlarmPlan);
  const heatCapacityPressureAlarmDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityPressureAlarmFileIdRef = useRef<string | null>(
    initialHeatCapacityPressureAlarmPlan?.fileId ?? null,
  );
  const heatCapacityClosePumpValveReminderTimerRef = useRef<number | null>(null);
  const heatCapacityClosePumpValveReminderTimerGenerationRef = useRef(0);
  const desktopExitPausedClosePumpValveReminderRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(initialHeatCapacityClosePumpValveReminderPlan);
  const heatCapacityClosePumpValveReminderDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityClosePumpValveReminderFileIdRef = useRef<string | null>(
    initialHeatCapacityClosePumpValveReminderPlan?.fileId ?? null,
  );
  const heatCapacityFocusSessionRef = useRef<HeatCapacityFocusSession | null>(initialHeatCapacityFocusSession);
  const heatCapacitySceneFocusModeRef = useRef<HeatCapacityFocusMode>(initialHeatCapacityFocusMode);
  const guidePassivePumpTargetNoticeKeyRef = useRef<string | null>(null);
  const heatCapacityPressureAlarmVisibleRef = useRef(
    initialHeatCapacityPressureAlarmPlan !== null,
  );
  const heatCapacityToastTimerRef = useRef<number | null>(null);
  const heatCapacityToastTimerGenerationRef = useRef(0);
  const heatCapacityToastPausedRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(
    initialHeatCapacityRefreshSession?.guide.toastQueue.current
      ? {
          fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
          remainingMs: initialHeatCapacityRefreshSession.guide.toastQueue.current.remainingMs,
        }
      : null,
  );
  const heatCapacityToastDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityToastCurrentRef = useRef<HeatCapacityToastMessage | null>(initialHeatCapacityRefreshToast);
  const heatCapacityToastPendingRef = useRef<HeatCapacityToastMessage | null>(initialHeatCapacityRefreshPendingToast);
  const guideHeatCapacityPulseTimerRef = useRef<number | null>(null);
  const guideHeatCapacityPulseDeadlineAtMsRef = useRef<number | null>(null);
  const guideHeatCapacityPausedPulseRef = useRef<{
    fileId: string;
    controlId: string | null;
    remainingMs: number;
  } | null>(initialHeatCapacityGuidePulsePlan.state === 'paused'
    ? {
        fileId: initialHeatCapacityGuidePulsePlan.fileId,
        controlId: initialHeatCapacityGuidePulsePlan.controlId,
        remainingMs: initialHeatCapacityGuidePulsePlan.remainingMs,
      }
    : null);
  const guideHeatCapacityGuidancePulseTimerRef = useRef<number | null>(null);
  const guideHeatCapacityStrongReminderTimerRef = useRef<number | null>(null);
  const guideHeatCapacityStrongReminderDeadlineAtMsRef = useRef<number | null>(null);
  const guideHeatCapacityStrongReminderTimerContextRef = useRef<{
    fileId: string;
    step: GuideHeatCapacityStep;
    controlId: string | null;
  } | null>(null);
  const guideHeatCapacityRestoredStrongReminderTimerRef = useRef<{
    fileId: string;
    controlId: string | null;
    remainingMs: number;
  } | null>((() => {
    const remainingMs = getHeatCapacityRefreshOptionalNumber(
      initialHeatCapacityRefreshLayout,
      'baseStrongReminderRemainingMs',
    );
    const fileId = getHeatCapacityRefreshString(
      initialHeatCapacityRefreshLayout,
      'baseStrongReminderFileId',
    );
    if (!fileId || remainingMs === null) return null;
    return {
      fileId,
      controlId: getHeatCapacityRefreshString(
        initialHeatCapacityRefreshLayout,
        'baseStrongReminderControlId',
      ),
      remainingMs,
    };
  })());
  const guideHeatCapacityPendingStrongReminderTimerRef = useRef<number | null>(null);
  const guideHeatCapacityPendingStrongReminderDeadlineAtMsRef = useRef<number | null>(null);
  const guideHeatCapacityPendingStrongReminderControlIdRef = useRef<string | null>(null);
  const guideHeatCapacityPausedPendingStrongReminderRef = useRef<{
    controlId: string | null;
    remainingMs: number;
  } | null>(null);
  const guideHeatCapacityMissCountRef = useRef(initialHeatCapacityRefreshSession?.guide.missCount ?? 0);
  const guideHeatCapacityRejectedInteractionRef = useRef(new HeatCapacityRejectedInteractionTracker());
  const guideHeatCapacityActiveFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'guide'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );
  const heatCapacityGuideChecklistTrackRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityGuideChecklistFrameRef = useRef<number | null>(null);
  const heatCapacityGuideChecklistSnapTimerRef = useRef<number | null>(null);
  const heatCapacityGuideChecklistReturnTimerRef = useRef<number | null>(null);
  const heatCapacityGuideChecklistPendingWheelDeltaRef = useRef(0);
  const heatCapacityGuideChecklistVisualOffsetRef = useRef(0);
  const heatCapacityGuideChecklistViewedIndexRef = useRef(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'guideChecklistViewedIndex', 0),
  );
  const heatCapacityGuideChecklistCurrentIndexRef = useRef(0);
  const heatCapacityAutoDemoLockedToastLastShownRef = useRef<{ message: string; at: number } | null>(null);
  const heatCapacityAutoDemoLockedPointerToastTimerRef = useRef<number | null>(null);
  const heatCapacityRecordControlsClosingTimerRef = useRef<number | null>(null);
  const heatCapacityResetFeedbackTimerRef = useRef<number | null>(null);
  const heatCapacityGuideMaskRef = useRef<HTMLDivElement | null>(null);
  const heatCapacityGuideLessonShownRef = useRef<Set<string>>(
    new Set(initialHeatCapacityRefreshSession?.guide.shownLessonIds ?? []),
  );
  const heatCapacityGuideLessonStepRef = useRef<{ fileId: string | null; step: GuideHeatCapacityStep }>({
    fileId: null,
    step: 'idle',
  });
  const heatCapacityLessonDialogActiveRef = useRef(initialHeatCapacityRefreshLessonDialog !== null);
  const heatCapacityLessonPausedFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshLessonDialog ? initialHeatCapacityRefreshSession?.activeHeatCapacityFileId ?? null : null,
  );
  const heatCapacityLessonAutoResumeDemoRef = useRef(
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'lessonAutoResumeDemo'),
  );
  const heatCapacityGuideLessonTransitionTimerRef = useRef<number | null>(null);
  const heatCapacityGuideLessonCloseTimerRef = useRef<number | null>(null);
  const heatCapacityGuideLessonCloseTimerGenerationRef = useRef(0);
  const heatCapacityGuideLessonCloseDeadlineAtMsRef = useRef<number | null>(null);
  const heatCapacityGuideLessonCloseShouldResumeDemoRef = useRef(false);
  const heatCapacityGuideLessonClosePausedRef = useRef<HeatCapacityLessonCloseTimerPlan | null>(
    initialHeatCapacityLessonCloseTimerPlan,
  );
  const heatCapacityGuideLessonDialogRef = useRef<HTMLElement | null>(null);
  const heatCapacityRefreshCheckpointIdRef = useRef(
    initialHeatCapacityRefreshSession?.checkpointId ?? `${initialSession.activeFileId}:${Date.now()}`,
  );
  const heatCapacityRefreshActiveFileIdRef = useRef(
    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId ?? null,
  );
  const heatCapacityRefreshModeRef = useRef<HeatCapacityMode | null>(
    initialHeatCapacityRefreshSession?.mode ?? null,
  );
  const heatCapacityCameraPoseRef = useRef<HeatCapacityCameraPose | null>(initialHeatCapacityCameraPose);
  const heatCapacityCameraTransitionRef = useRef<HeatCapacityCameraTransitionState | null>(
    initialHeatCapacityCameraTransition,
  );
  const heatCapacityUltraVisualStateRef = useRef<HeatCapacityUltraVisualState | null>(
    initialHeatCapacityUltraVisualState,
  );
  const heatCapacityHardSphereVisualCheckpointRef = useRef<HeatCapacityHardSphereVisualCheckpoint | null>(
    initialHeatCapacityHardSphereVisualCheckpoint,
  );
  const heatCapacityRefreshRestorePendingRef = useRef(initialHeatCapacityRefreshSession !== null);
  const heatCapacityRefreshRestoreAppliedRef = useRef(false);
  const heatCapacityRefreshPersistRef = useRef<() => void>(() => undefined);
  const heatCapacitySceneCheckpointProviderRef = useRef<{
    fileId: string;
    provider: HeatCapacitySceneCheckpointProvider;
  } | null>(null);
  const heatCapacitySceneCheckpointSuppressPersistenceRef = useRef(false);
  const heatCapacitySemanticCheckpointDebounceTimerRef = useRef<number | null>(null);
  const heatCapacitySemanticCheckpointMaxWaitTimerRef = useRef<number | null>(null);
  const scheduleHeatCapacitySemanticSceneCheckpointRef = useRef<() => void>(() => undefined);
  const heatCapacityLifecycleFlushInProgressRef = useRef(false);
  const heatCapacityLifecycleFlushPromiseRef = useRef<Promise<boolean> | null>(null);
  const heatCapacityLifecycleLastCompletedFlushAtMsRef = useRef<number | null>(null);
  const skipInitialConsoleScrollRef = useRef(initialHeatCapacityRefreshSession !== null);

  const [heatCapacitySceneReadyFileId, setHeatCapacitySceneReadyFileId] = useState<string | null>(null);
  const heatCapacitySceneReadyFileIdRef = useRef<string | null>(null);
  const recoverHeatCapacityRuntimeIfReadyRef = useRef<(fileId: string) => void>(() => undefined);
  const [heatCapacityPumpPulseId, setHeatCapacityPumpPulseId] = useState(0);
  const [heatCapacityRecordPulseId, setHeatCapacityRecordPulseId] = useState(0);
  const [autoDemoPhase, setAutoDemoPhase] = useState<HeatCapacityAutoDemoPhase>(() => (
    initialHeatCapacityRefreshSession?.mode === 'demo'
      ? initialHeatCapacityRefreshSession.demo.phase
      : 'idle'
  ));
  const autoDemoPhaseRef = useRef(autoDemoPhase);
  autoDemoPhaseRef.current = autoDemoPhase;
  const autoDemoRunning = autoDemoPhase === 'running';
  const autoDemoPaused = autoDemoPhase === 'paused';
  const autoDemoInteractionLocked = autoDemoPhase !== 'idle';
  const [autoDemoTimelineClockMs, setAutoDemoTimelineClockMs] = useState(0);
  const [heatCapacityToastCurrent, setHeatCapacityToastCurrent] = useState<HeatCapacityToastMessage | null>(
    initialHeatCapacityRefreshToast,
  );
  const [heatCapacityPressureAlarmVisible, setHeatCapacityPressureAlarmVisible] = useState(
    initialHeatCapacityPressureAlarmPlan !== null,
  );
  const [autoDemoCompletionMessage, setAutoDemoCompletionMessage] = useState<string | null>(
    initialHeatCapacityRefreshSession?.demo.completionMessage ?? null,
  );
  const [demoFocusControlId, setDemoFocusControlId] = useState<string | null>(
    heatCapacityModeTransitionLocked ? null : initialHeatCapacityRefreshSession?.demo.focusControlId ?? null,
  );
  const [demoFocusPulseActive, setDemoFocusPulseActive] = useState(
    heatCapacityModeTransitionLocked ? false : initialHeatCapacityRefreshSession?.demo.focusPulseActive ?? false,
  );
  const [demoCameraFocusMode, setDemoCameraFocusMode] = useState<Exclude<HeatCapacityFocusMode, 'none'> | null>(
    heatCapacityModeTransitionLocked ? null : initialHeatCapacityRefreshSession?.demo.cameraMode ?? null,
  );
  const [demoCameraFocusKey, setDemoCameraFocusKey] = useState(
    initialHeatCapacityRefreshSession?.demo.cameraFocusKey ?? 0,
  );
  const [heatCapacityFocusResetKey, setHeatCapacityFocusResetKey] = useState(0);
  const [heatCapacityHardSphereVisualResetKey, setHeatCapacityHardSphereVisualResetKey] = useState(0);
  const [heatCapacityRecordControlsClosing, setHeatCapacityRecordControlsClosing] = useState<HeatCapacityGuideRecordKind | null>(null);
  const [guideHeatCapacityActiveFileId, setGuideHeatCapacityActiveFileId] = useState<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'guide'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );
  const [guideHeatCapacityFocusControlId, setGuideHeatCapacityFocusControlId] = useState<string | null>(
    null,
  );
  const [guideHeatCapacityPulseActive, setGuideHeatCapacityPulseActive] = useState(
    false,
  );
  const [guideHeatCapacityStrongReminderActive, setGuideHeatCapacityStrongReminderActive] = useState(
    heatCapacityModeTransitionLocked ? false : initialHeatCapacityRefreshSession?.guide.strongReminder.active ?? false,
  );
  const [guideHeatCapacityStrongReminderControlId, setGuideHeatCapacityStrongReminderControlId] = useState<string | null>(
    heatCapacityModeTransitionLocked ? null : initialHeatCapacityRefreshSession?.guide.strongReminder.controlId ?? null,
  );
  const [guideHeatCapacityStrongReminderFocusKey, setGuideHeatCapacityStrongReminderFocusKey] = useState(0);
  const [heatCapacityGuideMaskBounds, setHeatCapacityGuideMaskBounds] = useState({ width: 1, height: 1 });
  const [heatCapacityGuideProjectedHoles, setHeatCapacityGuideProjectedHoles] = useState<Record<string, HeatCapacityGuideStrongCutout>>({});
  const [heatCapacityGuideChecklistViewedIndex, setHeatCapacityGuideChecklistViewedIndex] = useState(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'guideChecklistViewedIndex', 0),
  );
  const [heatCapacityGuideLessonDialog, setHeatCapacityGuideLessonDialog] = useState<HeatCapacityGuideLessonDialogState | null>(
    initialHeatCapacityRefreshLessonDialog,
  );
  const [heatCapacityGuideLessonOutgoingView, setHeatCapacityGuideLessonOutgoingView] = useState<HeatCapacityGuideLessonView | null>(null);
  const [heatCapacityGuideLessonClosing, setHeatCapacityGuideLessonClosing] = useState(
    initialHeatCapacityLessonCloseTimerPlan !== null,
  );
  const heatCapacityLessonDialogActive = heatCapacityGuideLessonDialog !== null || heatCapacityGuideLessonClosing;
  const [heatCapacityRecordToastSequenceActive, setHeatCapacityRecordToastSequenceActive] = useState(
    initialHeatCapacityRecordSuccessTimerPlan !== null,
  );
  const [heatCapacityResetFeedbackActionId, setHeatCapacityResetFeedbackActionId] = useState<
    'reset-guide' | null
  >(null);
  const [heatCapacityReviewSelectionByFileId] = useState<Record<string, {
    selectedTrialId: string | null;
    userSelected: boolean;
  }>>(() => {
    const restored = getHeatCapacityRefreshObject(initialHeatCapacityRefreshLayout, 'reviewSelectionByFileId');
    return restored as Record<string, { selectedTrialId: string | null; userSelected: boolean }> | null ?? {};
  });
  const [guideHeatCapacityRollback, setGuideHeatCapacityRollback] = useState<{
    animation: HeatCapacityGuideRollbackAnimation;
    key: number;
  } | null>(null);
  const [autoDemoStepIndex, setAutoDemoStepIndex] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.stepIndex ?? 0,
  );
  const [autoDemoStepCount, setAutoDemoStepCount] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.stepCount ?? 0,
  );
  const [autoDemoStepTitle, setAutoDemoStepTitle] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.title ?? '',
  );
  const [autoDemoStepDescription, setAutoDemoStepDescription] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.description ?? '',
  );
  const [autoDemoStepTarget, setAutoDemoStepTarget] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.target ?? '',
  );
  const [autoDemoStepProgressCriterion, setAutoDemoStepProgressCriterion] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.progressCriterion ?? '',
  );
  const [autoDemoStepNote, setAutoDemoStepNote] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.note ?? '',
  );
  const [autoDemoStepPanelMode, setAutoDemoStepPanelMode] = useState<'hidden' | 'visible' | 'exiting'>(
    initialHeatCapacityRefreshSession?.demo.stepPanel.mode ?? 'hidden',
  );

  useEffect(() => {
    if (
      !autoDemoRunning ||
      heatCapacityRefreshRestoring ||
      desktopExitQuiesced ||
      heatCapacityRuntimeFailureFileId !== null
    ) return undefined;
    const refreshClock = () => setAutoDemoTimelineClockMs(performance.now());
    refreshClock();
    const intervalId = window.setInterval(refreshClock, 50);
    return () => window.clearInterval(intervalId);
  }, [
    autoDemoRunning,
    desktopExitQuiesced,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ]);

  useLayoutEffect(() => {
    if (!initialHeatCapacityRefreshSession) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (consoleBodyRef.current) {
        consoleBodyRef.current.scrollTop = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'consoleScrollTop',
          0,
        );
      }
      if (currentParametersBodyRef.current) {
        currentParametersBodyRef.current.scrollTop = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'currentParametersScrollTop',
          0,
        );
      }
      if (renameInputRef.current && renamingFileId) {
        const selectionStart = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'renameSelectionStart',
          renameInputRef.current.value.length,
        );
        const selectionEnd = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'renameSelectionEnd',
          selectionStart,
        );
        renameInputRef.current.focus();
        renameInputRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    heatCapacityPressureAlarmVisibleRef.current = heatCapacityPressureAlarmVisible;
  }, [heatCapacityPressureAlarmVisible]);

  useEffect(() => {
    guideHeatCapacityActiveFileIdRef.current = guideHeatCapacityActiveFileId;
  }, [guideHeatCapacityActiveFileId]);

  useEffect(() => {
    heatCapacityLessonDialogActiveRef.current = heatCapacityLessonDialogActive;
  }, [heatCapacityLessonDialogActive]);

  useEffect(() => {
    if (!heatCapacityGuideLessonDialog) return;
    heatCapacityGuideLessonDialogRef.current?.focus();
  }, [heatCapacityGuideLessonDialog]);

  useEffect(() => {
    if (!guideHeatCapacityStrongReminderActive) return undefined;
    const maskRoot = heatCapacityGuideMaskRef.current;
    if (!maskRoot) return undefined;
    const updateBounds = () => {
      const rect = maskRoot.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setHeatCapacityGuideMaskBounds((previous) => (
        previous.width === width && previous.height === height ? previous : { width, height }
      ));
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(maskRoot);
    window.addEventListener('resize', updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [guideHeatCapacityStrongReminderActive]);

  useEffect(() => () => {
    if (heatCapacityResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityResetFeedbackTimerRef.current);
    }
  }, []);





  const emptyWorkbenchFile = useMemo(() => createDefaultStandardFile(0), []);
  const isWorkbenchEmpty = files.length === 0;
  const activeFile = files.find((file) => file.id === activeFileId) ?? emptyWorkbenchFile;
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

  const activeTeachingCompletionKey = activeFile.kind === 'heatCapacity'
    && activeFile.heatCapacityMode !== null
    && activeFile.heatCapacityTeachingStatus === 'completed'
    ? `${activeFile.id}:${activeFile.heatCapacityMode}:completed`
    : activeFile.kind === 'heatCapacityPistonOscillation'
      && activeFile.pistonOscillationDemoSession.status === 'completed'
      ? `${activeFile.id}:piston-demo:completed`
      : activeFile.kind === 'heatCapacityPistonOscillation'
        && activeFile.pistonOscillationGuideSession.status === 'completed'
        && !activeFile.pistonOscillationGuideSession.completionExited
        ? `${activeFile.id}:piston-guide:completed`
      : null;
  const previousActiveTeachingCompletionKeyRef = useRef(activeTeachingCompletionKey);
  useEffect(() => {
    if (
      activeTeachingCompletionKey !== null
      && activeTeachingCompletionKey !== previousActiveTeachingCompletionKeyRef.current
    ) {
      setLeftCollapsed(false);
  }
  previousActiveTeachingCompletionKeyRef.current = activeTeachingCompletionKey;
  }, [activeTeachingCompletionKey]);












  const activeExperimentMaterialsPanelKeys = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityMaterialsTabOrder(activeFile).map(heatCapacityTabIdToPanelKey)
    : activeFile.kind === 'heatCapacityPistonOscillation'
      ? getPistonOscillationMaterialsPanelOrder(activeFile)
      : [];
  const activeExperimentMaterialsPanelSignature = activeExperimentMaterialsPanelKeys.join('|');
  const activeHeatCapacityMaterialsWindowOpen = activeFile.kind === 'heatCapacity'
    && activeFile.openHeatCapacityTabs.some((tabId) => (
      activeExperimentMaterialsPanelKeys.includes(heatCapacityTabIdToPanelKey(tabId))
    ));
  useEffect(() => {
    const selectedMaterialUnavailable = isHeatCapacityPanelKey(selectedPanel)
      && !activeExperimentMaterialsPanelKeys.includes(selectedPanel);
    const hiddenHeatCapacityMaterialsGroupSelected = activeFile.kind === 'heatCapacity'
      && selectedPanel === 'results'
      && activeExperimentMaterialsPanelKeys.length === 0;
    if (selectedMaterialUnavailable || hiddenHeatCapacityMaterialsGroupSelected) {
      setSelectedPanel('preview');
    }
  }, [
    activeExperimentMaterialsPanelSignature,
    activeFile.id,
    activeFile.kind,
    selectedPanel,
  ]);












  const activeHeatCapacityFreeBatchProgress = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityFreeBatchProgress(activeFile)
    : null;
  const activeHeatCapacityFreeGroupCollection = activeFile.kind === 'heatCapacity'
    ? activeFile.heatCapacityFreeExperimentGroups
    : null;
  const activeHeatCapacityCurrentGroup = activeHeatCapacityFreeGroupCollection
    ? selectCurrentHeatCapacityFreeExperimentGroup(activeHeatCapacityFreeGroupCollection)
    : null;
  const activeHeatCapacityCurrentGroupTerminal =
    activeHeatCapacityCurrentGroup?.status === 'completed' ||
    activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly';
  const activeHeatCapacityRuntimeScheme = activeFile.kind === 'heatCapacity'
    ? activeFile.heatCapacityFreeParameterScheme
    : 'real';
  const activeHeatCapacityNextScheme = activeHeatCapacityCurrentGroup?.status === 'completed' ||
    activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly'
    ? activeHeatCapacityFreeGroupCollection?.pendingNextScheme ?? activeHeatCapacityRuntimeScheme
    : activeHeatCapacityRuntimeScheme;
  const activeHeatCapacityGroupProgressStatus = activeHeatCapacityCurrentGroup?.status === 'draft'
    ? 'draft' as const
    : activeHeatCapacityCurrentGroup?.status === 'collecting'
      ? 'collecting' as const
      : activeHeatCapacityCurrentGroup?.status === 'completed' ||
          activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly'
        ? 'completed' as const
        : 'awaiting-calculation' as const;
  const heatCapacityBatchSetupPurpose = activeHeatCapacityCurrentGroup?.status === 'completed' ||
    activeHeatCapacityCurrentGroup?.status === 'legacy-incomplete-readonly'
    ? 'next' as const
    : 'first' as const;
  const activeHeatCapacityCalculationSession = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityCalculationSession(activeFile)
    : null;
  const heatCapacityBatchSetupOpen = activeFile.kind === 'heatCapacity' &&
    heatCapacityBatchSetupRequestedFileId === activeFile.id &&
    (
      activeFile.heatCapacityMode === null ||
      (
        activeFile.heatCapacityMode === 'free' &&
        (
          activeHeatCapacityCurrentGroup === null ||
          activeHeatCapacityCurrentGroup.status === 'draft' ||
          activeHeatCapacityCurrentGroup.status === 'completed' ||
          activeHeatCapacityCurrentGroup.status === 'legacy-incomplete-readonly'
        )
      )
    ) &&
    heatCapacityModeTransitionState.phase === 'idle';
  const heatCapacityCalculationAutoOpen =
    activeHeatCapacityCalculationSession?.presentation === 'interactive' &&
    (
      activeHeatCapacityCalculationSession.status === 'in-progress' ||
      activeHeatCapacityCalculationSession.status === 'ready-to-exit'
    );
  const heatCapacityCalculationWindowOpen =
    heatCapacityCalculationAutoOpen || heatCapacityCalculationReviewOpen;
  useEffect(() => {
    setHeatCapacityBatchSetupSelection(null);
    setHeatCapacityBatchSetupRequestedFileId(null);
  }, [
    activeFile.id,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
  ]);
  useEffect(() => {
    setHeatCapacityCalculationReviewOpen(false);
  }, [
    activeFile.id,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
  ]);

  const effectiveParametersCollapsed = parametersCollapsed;
  const activeHeatCapacityPressureAlarmVisible = heatCapacityPressureAlarmVisible &&
    activeFile.kind === 'heatCapacity' &&
    heatCapacityPressureAlarmFileIdRef.current === activeFile.id;
  const activeHeatCapacityFreeParameterLockReason = getHeatCapacityFreeParameterLockReason(activeFile);
  const activeHeatCapacityFreeParameterLockMessage = getHeatCapacityFreeParameterLockMessage(
    activeHeatCapacityFreeParameterLockReason,
    settingsLanguagePreference,
  );
  const activeHeatCapacityFreeParameterLocked = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeHeatCapacityFreeParameterLockReason !== null;
  const activeHeatCapacityFreeIdealReadonly = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeHeatCapacityNextScheme === 'ideal';
  const activeHeatCapacityFreeSchemeLocked = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    !activeHeatCapacityCurrentGroupTerminal &&
    isHeatCapacityFreeExperimentStarted(activeFile);
  const activeHeatCapacityFreeParameterInputDisabled =
    activeHeatCapacityFreeParameterLocked || activeHeatCapacityFreeIdealReadonly;
  const visibleHeatCapacityParamHelpId =
    pinnedHeatCapacityParamHelpId ?? hoveredHeatCapacityParamHelpId;
  const openableClosedFiles = closedFiles.filter((file) => !files.some((openFile) => openFile.id === file.id));
  const standardPanels = useMemo(() => createStandardPanels(workbenchCopy), [workbenchCopy]);
  const idealPanels = useMemo(() => createIdealPanels(workbenchCopy), [workbenchCopy]);
  const heatCapacityRealtimeCopy = useMemo(
    () => getHeatCapacityRealtimeCopy(settingsLanguagePreference),
    [settingsLanguagePreference],
  );
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
  const parametersDirty = !areWorkbenchParamsEqual(activeFile.params, activeFile.appliedParams);
  const parameterControlsLocked = activeFile.runState === 'running' || activeFile.runState === 'paused';
  const currentParameterControlsLocked = activeFile.kind === 'heatCapacityPistonOscillation'
    ? false
    : activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'
      ? false
      : parameterControlsLocked;
  const controlledVariableLockHint = workbenchCopy.parameters.controlledLockHint;
  const currentIdealRelationHasPoints = activeFile.kind === 'ideal' && activeFile.pointsByRelation[activeFile.relation].length > 0;
  const isIdealControlledVariableLocked = (
    key: keyof SimulationParams | 'relation',
  ) => (
    activeFile.kind === 'ideal'
    && currentIdealRelationHasPoints
    && key !== 'relation'
    && !isVariableKeyForRelation(activeFile.relation, key as ExperimentParamKey)
  );
  const getLockedIdealControlledVariableKeys = (nextParams: SimulationParams): ExperimentParamKey[] => (
    activeFile.kind === 'ideal' && currentIdealRelationHasPoints
      ? getChangedIdealParamKeys(activeFile.params, nextParams).filter((key) => !isVariableKeyForRelation(activeFile.relation, key))
      : []
  );
  const workbenchStyle = {
    '--studio-left-width': `${leftSidebarWidth}px`,
    '--studio-params-width': `${parameterSidebarWidth}px`,
    '--studio-left-resize-ghost-x': `${leftSidebarWidth}px`,
    '--studio-params-resize-ghost-x': `calc(100% - ${parameterSidebarWidth}px)`,
  } as React.CSSProperties & Record<
    '--studio-left-width' | '--studio-params-width' | '--studio-left-resize-ghost-x' | '--studio-params-resize-ghost-x',
    string
  >;
  const shellStyle = {
    '--studio-console-height': consoleCollapsed ? '32px' : `${consoleHeightPx}px`,
    '--studio-console-resize-ghost-y': `calc(100% - ${consoleCollapsed ? '32px' : `${consoleHeightPx}px`} - 24px)`,
  } as React.CSSProperties & Record<'--studio-console-height' | '--studio-console-resize-ghost-y', string>;
  const liveWorkspaceSplitRatio = clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
  const liveWorkspaceStyle = {
    '--studio-live-preview-ratio': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    '--studio-live-realtime-ratio': `${((1 - liveWorkspaceSplitRatio) * 100).toFixed(3)}%`,
    '--studio-live-resize-ghost-x': `${(liveWorkspaceSplitRatio * 100).toFixed(3)}%`,
  } as React.CSSProperties & Record<'--studio-live-preview-ratio' | '--studio-live-realtime-ratio' | '--studio-live-resize-ghost-x', string>;
  const displayedLogs = useMemo(
    () => (
      consoleTab === 'warnings'
        ? logs.filter((log) => log.kind === 'warning' || log.kind === 'error')
        : logs
    ),
    [consoleTab, logs],
  );
  const consoleSummary = useMemo(() => {
    const counts = logs.reduce<Record<LogKind, number>>(
      (nextCounts, log) => ({
        ...nextCounts,
        [log.kind]: nextCounts[log.kind] + 1,
      }),
      { info: 0, warning: 0, success: 0, error: 0 },
    );
    return {
      counts,
      latest: logs[logs.length - 1] ?? null,
      runtime: isWorkbenchEmpty
        ? workbenchCopy.status.noRuntime
        : activeFile.kind === 'standard'
          ? workbenchCopy.status.standardRuntime
          : activeFile.kind === 'ideal'
            ? workbenchCopy.status.idealRuntime(
                getRelationLabel(activeFile.relation),
                getLocalizedStatusValue(idealAnalysis?.verdictState ?? 'insufficient', workbenchCopy),
              )
            : workbenchCopy.status.noRuntime,
    };
  }, [activeFile, idealAnalysis?.verdictState, isWorkbenchEmpty, logs, workbenchCopy]);

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

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    experienceProfileRef.current = experienceProfile;
    tutorialActiveRef.current = isExperimentTutorialActive(experienceProfile);
  }, [experienceProfile]);

  useEffect(() => {
    tutorialNoticeKindRef.current = tutorialNoticeKind;
  }, [tutorialNoticeKind]);

  useEffect(() => {
    if (!tutorialActive || window.hardSphereLabWindow) return undefined;
    const confirmBrowserExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', confirmBrowserExit);
    return () => window.removeEventListener('beforeunload', confirmBrowserExit);
  }, [tutorialActive]);

  useEffect(() => {
    const browserOwnership = !window.hardSphereLabWindow;
    const releaseOwnership = () => {
      try {
        releaseExperimentTutorialOwnership(
          EXPERIMENT_TUTORIAL_INSTANCE_ID,
          window.localStorage,
        );
      } catch {
        // Ownership expires automatically if the page terminates abruptly.
      }
    };
    const claimCurrentTutorial = (force = false) => {
      if (!tutorialActiveRef.current) {
        setRemoteTutorialOwnerActive(false);
        return;
      }
      const tutorialExperiment = experienceProfileRef.current.activeTutorialExperiment;
      if (!tutorialExperiment) return;
      const ownsVisibleTutorial = filesRef.current.some((file) => (
        isExperimentTutorialFileId(file.id, tutorialExperiment)
      ));
      if (!browserOwnership && !ownsVisibleTutorial) return;
      try {
        const claimed = force
          ? takeOverExperimentTutorialOwnership(
              EXPERIMENT_TUTORIAL_INSTANCE_ID,
              tutorialExperiment,
              window.localStorage,
            )
          : claimExperimentTutorialOwnership(
              EXPERIMENT_TUTORIAL_INSTANCE_ID,
              tutorialExperiment,
              window.localStorage,
            );
        if (!claimed) {
          setRemoteTutorialOwnerActive(true);
          return;
        }
        if (browserOwnership) {
          void tutorialOwnershipAdoptionRef.current();
        } else {
          setRemoteTutorialOwnerActive(false);
        }
      } catch (cause) {
        setTutorialOperationError({
          message: cause instanceof Error ? cause.message : String(cause),
          retry: () => claimCurrentTutorial(force),
        });
      }
    };
    tutorialOwnershipClaimRef.current = claimCurrentTutorial;

    const channel = createExperimentLearningChannel(
      EXPERIMENT_TUTORIAL_INSTANCE_ID,
      ({ profile }) => {
        const externalTutorialActive = isExperimentTutorialActive(profile);
        const ownsVisibleTutorial = filesRef.current.some((file) => (
          isExperimentTutorialFileId(file.id, profile.activeTutorialExperiment)
        ));
        experienceProfileRef.current = profile;
        tutorialActiveRef.current = externalTutorialActive;
        if (
          browserOwnership &&
          externalTutorialActive &&
          !ownsVisibleTutorial &&
          !tutorialOrdinaryWorkspaceRef.current
        ) {
          tutorialOrdinaryWorkspaceRef.current = {
            files: cloneWorkbenchFiles(filesRef.current),
            closedFiles: cloneWorkbenchFiles(closedFilesRef.current),
            activeFileId: activeFileIdRef.current,
            selectedPanel: selectedPanelRef.current,
          };
          void refreshTutorialOrdinaryWorkspaceFromPersistence().catch(() => {
            // A takeover retries this authoritative read and reports any failure then.
          });
        }
        setExperienceProfile(profile);
        if (externalTutorialActive && !ownsVisibleTutorial) {
          setRemoteTutorialOwnerActive(true);
          claimCurrentTutorial();
        } else if (!externalTutorialActive) {
          setRemoteTutorialOwnerActive(false);
        }
      },
    );
    experimentLearningChannelRef.current = channel;
    claimCurrentTutorial();
    if (
      tutorialActiveRef.current &&
      filesRef.current.some((file) => (
        isExperimentTutorialFileId(
          file.id,
          experienceProfileRef.current.activeTutorialExperiment,
        )
      ))
    ) {
      void window.hardSphereLabTutorial?.activate?.()
        .then(async (result) => {
          if (result.status === 'ok') {
            const archivedNamespaces = result.archivedNamespaces ?? [];
            try {
              const ordinaryWorkspace = tutorialOrdinaryWorkspaceRef.current;
              if (!ordinaryWorkspace) {
                throw new Error('The tutorial-safe workspace cache is unavailable.');
              }
              tutorialOrdinaryWorkspaceRef.current =
                await mergeArchivedNamespacesIntoTutorialWorkspace(
                  ordinaryWorkspace,
                  archivedNamespaces,
                );
              const saved = await flushWorkspacePersistenceRef.current();
              if (!saved) {
                throw new Error('The saved experiment files could not be moved into the tutorial-safe cache.');
              }
              const finalized = await window.hardSphereLabTutorial?.finalizeActivation?.(
                archivedNamespaces,
              );
              if (finalized && finalized.status !== 'ok') {
                throw new Error(finalized.message ?? 'Desktop tutorial archive could not be finalized.');
              }
              setTutorialNoticeKind(
                initialTutorialEntryKind === 'start' &&
                experienceProfileRef.current.activeTutorialExperiment !== null &&
                experienceProfileRef.current.learning[
                  experienceProfileRef.current.activeTutorialExperiment
                ] === 'demo'
                  ? 'start-demo'
                  : experienceProfileRef.current.activeTutorialExperiment !== null &&
                    experienceProfileRef.current.learning[
                      experienceProfileRef.current.activeTutorialExperiment
                    ] === 'guide'
                    ? 'resume-guide'
                    : 'resume-demo',
              );
            } catch (cause) {
              setTutorialOperationError({
                message: cause instanceof Error ? cause.message : String(cause),
                retry: () => window.location.reload(),
              });
            }
            return;
          }
          if (result.status === 'blocked') {
            setRemoteTutorialOwnerActive(true);
            return;
          }
          setTutorialOperationError({
            message: result.message ?? 'Desktop tutorial lock could not be restored.',
            retry: () => window.location.reload(),
          });
        })
        .catch((cause) => {
          setTutorialOperationError({
            message: cause instanceof Error ? cause.message : String(cause),
            retry: () => window.location.reload(),
          });
        });
    }
    const heartbeatId = window.setInterval(claimCurrentTutorial, 5_000);
    const handleOwnerStorage = (event: StorageEvent) => {
      if (event.key !== EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY) return;
      claimCurrentTutorial();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') claimCurrentTutorial();
    };
    const handlePageShow = () => claimCurrentTutorial();
    if (browserOwnership) {
      window.addEventListener('storage', handleOwnerStorage);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pageshow', handlePageShow);
    }
    window.addEventListener('pagehide', releaseOwnership);
    return () => {
      window.clearInterval(heartbeatId);
      if (browserOwnership) {
        window.removeEventListener('storage', handleOwnerStorage);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pageshow', handlePageShow);
      }
      window.removeEventListener('pagehide', releaseOwnership);
      releaseOwnership();
      channel.close();
      if (tutorialOwnershipClaimRef.current === claimCurrentTutorial) {
        tutorialOwnershipClaimRef.current = () => undefined;
      }
      if (experimentLearningChannelRef.current === channel) {
        experimentLearningChannelRef.current = null;
      }
    };
  }, [initialTutorialEntryKind]);

  useEffect(() => {
    if (!initialTutorialHandoffRecovery) return undefined;
    let cancelled = false;
    const finalizeRecoveredHandoff = async () => {
      const saved = await flushWorkspacePersistenceRef.current();
      if (cancelled) return;
      if (!saved) {
        setTutorialOperationError({
          message: settingsLanguagePreference === 'en'
            ? 'The unlocked experiment file could not be saved yet.'
            : settingsLanguagePreference === 'zh-TW'
              ? '解鎖後的新實驗檔案尚未能安全儲存。'
              : '解锁后的新实验文件尚未能安全保存。',
          retry: () => { void finalizeRecoveredHandoff(); },
        });
        return;
      }
      const cleared = clearExperimentTutorialHandoff();
      if (!cleared.ok) {
        setTutorialOperationError({
          message: cleared.error.message,
          retry: () => { void finalizeRecoveredHandoff(); },
        });
        return;
      }
      setTutorialOperationError(null);
      void window.hardSphereLabTutorial?.deactivate?.();
      setTutorialNoticeKind('all-unlocked');
    };
    const timerId = window.setTimeout(() => {
      void finalizeRecoveredHandoff();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [initialTutorialHandoffRecovery]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
    if (
      initialHeatCapacityRefreshSession &&
      activeFileId !== initialHeatCapacityRefreshSession.activeHeatCapacityFileId
    ) {
      setHeatCapacityInitialSceneRestoreEnabled(false);
    }
    if (heatCapacityRefreshRestorePendingRef.current) return;
    setSelectedFileId(activeFileId);
  }, [activeFileId]);

  useEffect(() => {
    if (!selectedFileId || files.some((file) => file.id === selectedFileId)) return;
    setSelectedFileId(activeFileId);
  }, [activeFileId, files, selectedFileId]);

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

  useEffect(() => {
    renamingFileIdRef.current = renamingFileId;
  }, [renamingFileId]);

  useWorkbenchParameterScroll({
    activeFileKind: activeFile.kind, idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible,
    currentParametersBodyRef, idealAdvancedSettingsBodyRef, idealAdvancedSettingsPreviousScrollTopRef,
    idealAdvancedScrollFrameRef, animateCurrentParametersScroll, setIdealAdvancedSettingsBodyVisible,
  });



  useWorkbenchRenameFocus(renamingFileId, renameInputRef);

  const activeIdealRelation = activeFile.kind === 'ideal' ? activeFile.relation : null;

  useEffect(() => {
    if (activeFile.kind !== 'ideal' || scanInputFocused) return;
    const value = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    setScanInputDraft(formatMetric(value, getIdealScanDecimals(activeFile.relation)));
    setScanInputError(null);
  }, [activeFile.kind, activeIdealRelation, activeFile.params, scanInputFocused]);

  useEffect(() => {
    if (!scanInputToast) return undefined;
    const timeoutId = window.setTimeout(
      () => setScanInputToast(null),
      PROMPT_TOAST_DURATION_MS.standard,
    );
    return () => window.clearTimeout(timeoutId);
  }, [scanInputToast]);

  useEffect(() => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    setHeatCapacityBasicInputDrafts({});
    setHeatCapacityBasicInputErrors({});
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityRestoreDefaultConfirmOpen(false);
    setHeatCapacityIdealIntroOpen(false);
    setParameterInputDrafts({});
    setHoveredHeatCapacityParamHelpId(null);
    setPinnedHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  }, [activeFile.id]);

  useEffect(() => {
    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      if (!activePistonOscillationParameterSidebarAvailable) {
        setParametersCollapsed(true);
      }
      setIdealAdvancedSettingsOpen(false);
      setIdealAdvancedSettingsBodyVisible(false);
      return;
    }
    if (!canOpenHeatCapacityParameterSidebar(activeFile)) {
      setParametersCollapsed(true);
      setHeatCapacityAdvancedOpen(false);
      setHeatCapacityRestoreDefaultConfirmOpen(false);
      setHeatCapacityIdealIntroOpen(false);
      setPinnedHeatCapacityParamHelpId(null);
      setHoveredHeatCapacityParamHelpId(null);
      setHeatCapacityParamHelpPopoverStyle(undefined);
    }
  }, [
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activePistonOscillationParameterSidebarAvailable,
  ]);

  useEffect(() => {
    if (pinnedHeatCapacityParamHelpId === null) return undefined;
    const handleHeatCapacityParamHelpPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('[data-heat-capacity-param-help-button="true"]')) return;
      const activePopover = document.querySelector(
        `[data-heat-capacity-param-help-popover-id="${pinnedHeatCapacityParamHelpId}"]`,
      );
      if (activePopover?.contains(target)) return;
      heatCapacityParamHelpSuppressClickRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closePinnedHeatCapacityParameterHelp();
    };
    document.addEventListener('pointerdown', handleHeatCapacityParamHelpPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleHeatCapacityParamHelpPointerDown, true);
    };
  }, [pinnedHeatCapacityParamHelpId]);

  useEffect(() => {
    const handleHeatCapacityParamHelpClick = (event: MouseEvent) => {
      if (!heatCapacityParamHelpSuppressClickRef.current) return;
      heatCapacityParamHelpSuppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    document.addEventListener('click', handleHeatCapacityParamHelpClick, true);
    return () => {
      document.removeEventListener('click', handleHeatCapacityParamHelpClick, true);
    };
  }, []);

  useEffect(() => {
    if (!samplingPresetMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (samplingPresetSelectRef.current?.contains(event.target as Node)) return;
      setSamplingPresetMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [samplingPresetMenuOpen]);

  useEffect(() => () => {
    disposeHardSphereRuntimeTimers();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
    }
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
      heatCapacityPressureAlarmTimerRef.current = null;
    }
    heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
    heatCapacityPressureAlarmFileIdRef.current = null;
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      heatCapacityClosePumpValveReminderTimerGenerationRef.current += 1;
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
    heatCapacityClosePumpValveReminderFileIdRef.current = null;
    if (heatCapacityGuideStartTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideStartTimerRef.current);
      heatCapacityGuideStartTimerRef.current = null;
    }
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
  }, []);

  const pushLog = (message: WorkbenchConsoleMessageInput, kind: LogKind = 'info') => {
    if (tutorialActiveRef.current) return;
    setLogs((current) => [
      ...current,
      createConsoleLog(current.length + 1, kind, message, settingsLanguagePreference),
    ]);
  };

  const guardWorkbenchTutorialAction = (action: WorkbenchTutorialAccessAction) => {
    const decision = evaluateWorkbenchTutorialAccess(experienceProfileRef.current, action);
    if (decision.allowed) return true;
    setOpenTopMenu(null);
    setTutorialBlockedNoticeOpen(true);
    return false;
  };

  const showWorkbenchValidationErrors = (validation: { errors: string[] }) => {
    const localizedErrors = getLocalizedWorkbenchValidationErrors(validation.errors, settingsLanguagePreference);
    setParameterErrors(localizedErrors);
    validation.errors.forEach((error) => pushLog(
      (language) => `${activeFile.name}: ${getLocalizedWorkbenchValidationErrors([error], language)[0] ?? error}`,
      'error',
    ));
  };

  const { exportEnvironmentStatus, runAboutEnvironmentCheck } = useWorkbenchExportEnvironment({
    tutorialActiveRef, settingsLanguagePreference, workbenchCopy, setLogs, pushLog, showAboutResultNotice,
  });
  const idealPointCount = idealAnalysis?.sortedPoints.length ?? 0;
  const { exportInProgress, heatCapacityReportExportOpen, heatCapacityReportSelectedGroupIds, isExportModeDataReady, handleExportAction, openHeatCapacityReportExport, confirmHeatCapacityReportExport, closeHeatCapacityReportExport, selectHeatCapacityReportGroups } = useWorkbenchExportController({
    activeFile, idealPointCount, resultSummary, settingsLanguagePreference, workbenchCopy, exportEnvironmentStatus, guardWorkbenchTutorialAction, pushLog,
  });





  useEffect(() => {
    if (consoleTab === 'summary') return;
    if (skipInitialConsoleScrollRef.current) return;
    const body = consoleBodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [consoleTab, displayedLogs.length, logs.length]);

  useEffect(() => {
    if (
      desktopExitQuiesced ||
      heatCapacityRefreshRestoring ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileId !== null
    ) return undefined;
    const intervalId = window.setInterval(() => {
      if (desktopExitQuiescedRef.current) return;
      const now = Date.now();
      setFiles((current) => {
        const activeId = activeFileIdRef.current;
        let changed = false;
        const nextFiles = current.map((file) => {
          if (file.id !== activeId || file.kind !== 'heatCapacity') return file;
          if (
            heatCapacityRefreshRestorePendingRef.current &&
            heatCapacityRefreshActiveFileIdRef.current === file.id
          ) {
            return file;
          }
          if (heatCapacityRuntimeFailureFileIdRef.current === file.id) return file;
          if (file.runState === 'paused') return file;
          if (
            heatCapacityLessonPausedFileIdRef.current === file.id ||
            heatCapacityLessonDialogActiveRef.current
          ) {
            return file;
          }
          const refreshedFile = refreshHeatCapacityPumpFrequency(file, now);
          const physicallySteppedFile = refreshedFile.powerOn || refreshedFile.heatCapacityMode === 'free'
            ? stepHeatCapacityWorkbenchFile(refreshedFile, now)
            : refreshedFile;
          const steppedFile = evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState(
            physicallySteppedFile,
            now,
          );
          if (!shouldCommitHeatCapacityRealtimeTick(file, steppedFile)) {
            return file;
          }
          changed = true;
          return steppedFile;
        });
        if (!changed) return current;
        filesRef.current = nextFiles;
        return nextFiles;
      });
    }, heatCapacityQualityProfile.tickIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [
    desktopExitQuiesced,
    heatCapacityQualityProfile.tickIntervalMs,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ]);

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





































































  const updateHeatCapacityFreeEquilibriumSpeedMultiplier = (multiplier: number) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const now = Date.now();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? file.heatCapacityMode === 'guide'
        ? setHeatCapacityGuideEquilibriumSpeedMultiplier(file, multiplier, now)
        : file.heatCapacityMode === 'free'
          ? setHeatCapacityFreeEquilibriumSpeedMultiplier(file, multiplier, now)
          : file
      : file);
  };

  const toggleHeatCapacityHardSphereView = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (activeFile.kind !== 'heatCapacity') return;
    setHeatCapacityHardSphereViewEnabled(!activeFile.hardSphereViewEnabled);
  };















  const showParameterSidebarBlockReason = (
    getMessage: (language: WorkbenchLanguagePreference) => string | null,
  ) => {
    const message = getMessage(settingsLanguagePreference);
    if (!message) return;
    setScanInputToast(message);
    pushLog((language) => `${activeFile.name}: ${getMessage(language) ?? message}`, 'warning');
  };

  const openParameterSidebarFromRail = () => {
    if (
      activeFile.kind === 'heatCapacityPistonOscillation'
      && !activePistonOscillationParameterSidebarAvailable
    ) {
      showParameterSidebarBlockReason(
        getPistonOscillationParameterSidebarFreeOnlyMessage,
      );
      return;
    }
    if (shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(activeFile)) {
      showParameterSidebarBlockReason(
        (language) => getHeatCapacityRealtimeCopy(language).freePowerOffBeforeNextGroup,
      );
      return;
    }
    if (!canOpenHeatCapacityParameterSidebar(activeFile)) {
      const blockReason = getHeatCapacityParameterSidebarBlockReason(activeFile);
      showParameterSidebarBlockReason(
        (language) => getHeatCapacityFreeParameterLockMessage(blockReason, language),
      );
      return;
    }
    setParametersCollapsed(false);
  };



  const collapseHeatCapacityFreeParameterSidebarForExperimentAction = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    setParametersCollapsed(true);
    setHeatCapacityAdvancedOpen(false);
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  const showHeatCapacityFreeParameterLockHint = () => {
    const lockReason = getHeatCapacityFreeParameterLockReason(activeFile);
    const message = getHeatCapacityFreeParameterLockMessage(lockReason, settingsLanguagePreference);
    if (!message) return;
    setScanInputToast(message);
    pushLog(
      (language) => `${activeFile.name}: ${getHeatCapacityFreeParameterLockMessage(lockReason, language) ?? message}`,
      'warning',
    );
  };

  const showHeatCapacityFreeIdealReadonlyHint = () => {
    const message = heatCapacityFreeSharedText.idealProfileReadonlyToast[settingsLanguagePreference];
    setScanInputToast(message);
    pushLog(
      (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.idealProfileReadonlyToast[language]}`,
      'warning',
    );
  };

  const showHeatCapacityFreeSchemeLockHint = () => {
    const message = heatCapacityFreeSharedText.idealProfileLockedHint[settingsLanguagePreference];
    setScanInputToast(message);
    pushLog(
      (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.idealProfileLockedHint[language]}`,
      'warning',
    );
  };

  const requestToggleHeatCapacityFreeParameterScheme = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
      currentFile.heatCapacityFreeExperimentGroups,
    );
    const currentGroupTerminal = currentGroup?.status === 'completed' ||
      currentGroup?.status === 'legacy-incomplete-readonly';
    if (!currentGroupTerminal && isHeatCapacityFreeExperimentStarted(currentFile)) {
      showHeatCapacityFreeSchemeLockHint();
      return;
    }
    const selectedScheme = currentGroup?.status === 'completed' ||
      currentGroup?.status === 'legacy-incomplete-readonly'
      ? currentFile.heatCapacityFreeExperimentGroups.pendingNextScheme
      : currentFile.heatCapacityFreeParameterScheme;
    if (selectedScheme === 'ideal') {
      updateActiveFile((file) => (
        file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
          ? setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'real', Date.now())
        : file
      ));
      return;
    }
    if (!currentFile.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro) {
      updateActiveFile((file) => (
        file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
          ? {
              ...acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'idealParameterProfileIntro'),
              updatedAt: Date.now(),
            }
          : file
      ));
      setHeatCapacityIdealIntroOpen(true);
      return;
    }
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'ideal', Date.now())
        : file
    ));
  };

  const cancelHeatCapacityIdealProfileIntro = () => {
    setHeatCapacityIdealIntroOpen(false);
  };

  const confirmHeatCapacityIdealProfileIntro = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const currentGroup = currentFile?.kind === 'heatCapacity'
      ? selectCurrentHeatCapacityFreeExperimentGroup(currentFile.heatCapacityFreeExperimentGroups)
      : null;
    const currentGroupTerminal = currentGroup?.status === 'completed' ||
      currentGroup?.status === 'legacy-incomplete-readonly';
    if (
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'free' &&
      !currentGroupTerminal &&
      isHeatCapacityFreeExperimentStarted(currentFile)
    ) {
      setHeatCapacityIdealIntroOpen(false);
      showHeatCapacityFreeSchemeLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      const acknowledgedFile = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'idealParameterProfileIntro');
      return setHeatCapacityFreeParameterSchemeWorkbenchState(acknowledgedFile, 'ideal', Date.now());
    });
    setHeatCapacityIdealIntroOpen(false);
  };

  const setHeatCapacityHardSphereViewEnabled = (checked: boolean) => {
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          hardSphereViewEnabled: checked,
          updatedAt: Date.now(),
        }
        : file);
  };

  const getHeatCapacityFreeParameterMaximum = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    draft: HeatCapacityFreeParameterDraft,
  ) => (
    definition.id === 'pressureDangerMv'
      ? getHeatCapacityFreePressureDangerUpperLimitMv(draft)
      : definition.max ?? null
  );

  const getHeatCapacityFreeValueTooSmallMessage = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    language: WorkbenchLanguagePreference = settingsLanguagePreference,
  ) => {
    const label = definition.label[language];
    const formattedMin = formatHeatCapacityFreeParameterValue(
      definition.min,
      definition.precision,
    );
    const limitText = `${formattedMin} ${definition.unit}`.trim();
    return `${label}${heatCapacityFreeSharedText.valueTooSmall[language]} ${limitText}`;
  };

  const getHeatCapacityFreeValueTooLargeMessage = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    maxValue: number,
    language: WorkbenchLanguagePreference = settingsLanguagePreference,
  ) => {
    const label = definition.label[language];
    const formattedMax = formatHeatCapacityFreeParameterValue(
      getHeatCapacityFreeParameterInputValue(definition, maxValue),
      definition.precision,
    );
    const limitText = definition.id === 'pressureDangerMv'
      ? `${formattedMax} ${definition.unit} / ${HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA} kPa`
      : `${formattedMax} ${definition.unit}`.trim();
    return `${label}${heatCapacityFreeSharedText.valueTooLarge[language]} ${limitText}`;
  };

  const showHeatCapacityFreeParameterInputError = (
    message: string,
    getMessage?: WorkbenchConsoleMessageFactory,
  ) => {
    setScanInputToast(message);
    pushLog((language) => `${activeFile.name}: ${getMessage?.(language) ?? message}`, 'warning');
  };

  const validateHeatCapacityFreeNumberValue = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    valueText: string,
    draft: HeatCapacityFreeParameterDraft,
    options: { checkMax?: boolean } = {},
  ): { valid: true; value: number } | { valid: false; message: string; getMessage: WorkbenchConsoleMessageFactory } => {
    const invalid = (getMessage: WorkbenchConsoleMessageFactory) => ({
      valid: false as const,
      message: getMessage(settingsLanguagePreference),
      getMessage,
    });
    if (valueText.trim() === '') {
      return invalid((language) => heatCapacityFreeSharedText.invalidNumber[language]);
    }
    const parsedValue = Number(valueText.trim());
    if (!Number.isFinite(parsedValue)) {
      return invalid((language) => heatCapacityFreeSharedText.invalidNumber[language]);
    }
    if (parsedValue < definition.min) {
      return invalid((language) => getHeatCapacityFreeValueTooSmallMessage(definition, language));
    }
    const draftValue = getHeatCapacityFreeParameterDraftValue(definition, parsedValue);
    if (options.checkMax !== false) {
      const maxValue = getHeatCapacityFreeParameterMaximum(definition, {
        ...draft,
        [definition.id]: draftValue,
      });
      if (maxValue !== null && draftValue > maxValue) {
        return invalid((language) => getHeatCapacityFreeValueTooLargeMessage(definition, maxValue, language));
      }
    }
    return { valid: true, value: draftValue };
  };

  const commitHeatCapacityBasicParameterInput = (
    parameterId: HeatCapacityFreeDraftNumberKey,
    valueText: string,
  ) => {
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const definition = heatCapacityFreeBasicNumberParameters.find((param) => param.id === parameterId);
    if (!definition) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const validation = validateHeatCapacityFreeNumberValue(
      definition,
      valueText,
      selectHeatCapacityFreeAppliedParameterDraft(activeFile),
    );
    if (validation.valid === false) {
      setHeatCapacityBasicInputErrors((current) => ({
        ...current,
        [parameterId]: validation.message,
      }));
      if (
        validation.message.includes(heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference]) ||
        validation.message.includes(heatCapacityFreeSharedText.valueTooSmall[settingsLanguagePreference])
      ) {
        showHeatCapacityFreeParameterInputError(validation.message, validation.getMessage);
      }
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...selectHeatCapacityFreeAppliedParameterDraft(file),
          [parameterId]: validation.value,
        }),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityBasicInputDrafts((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
    setHeatCapacityBasicInputErrors((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const setHeatCapacityBasicCheckbox = (
    parameterId: HeatCapacityFreeBasicCheckboxKey,
    checked: boolean,
  ) => {
    if (parameterId === 'hardSphereViewEnabled') {
      setHeatCapacityHardSphereViewEnabled(checked);
      return;
    }
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...selectHeatCapacityFreeAppliedParameterDraft(file),
          [parameterId]: checked,
        }),
        updatedAt: Date.now(),
      };
    });
  };

  const setHeatCapacityFreeGasType = (
    gasType: HeatCapacityFreeGasType,
  ) => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    if (selectHeatCapacityFreeGasType(currentFile) === gasType) return;
    const parameterLockReason = getHeatCapacityFreeParameterLockReason(currentFile);
    if (parameterLockReason) {
      const message = getHeatCapacityFreeParameterLockMessage(parameterLockReason, settingsLanguagePreference);
      if (message) {
        setScanInputToast(message);
        pushLog(
          (language) => `${currentFile.name}: ${getHeatCapacityFreeParameterLockMessage(parameterLockReason, language) ?? message}`,
          'warning',
        );
      }
      return;
    }
    if (!isHeatCapacityFreeGasTypeEditingAvailable(currentFile)) {
      const message = heatCapacityFreeSharedText.gasTypeLocked[settingsLanguagePreference];
      setScanInputToast(message);
      pushLog(
        (language) => `${currentFile.name}: ${heatCapacityFreeSharedText.gasTypeLocked[language]}`,
        'warning',
      );
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...selectHeatCapacityFreeAppliedParameterDraft(file),
          gasType,
        }),
        updatedAt: Date.now(),
      };
    });
  };

  const openHeatCapacityRestoreDefaultConfirm = () => {
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    setHeatCapacityRestoreDefaultConfirmOpen(true);
  };

  const cancelHeatCapacityRestoreDefault = () => {
    setHeatCapacityRestoreDefaultConfirmOpen(false);
  };

  const confirmHeatCapacityRestoreDefault = () => {
    if (activeHeatCapacityFreeIdealReadonly) {
      setHeatCapacityRestoreDefaultConfirmOpen(false);
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      setHeatCapacityRestoreDefaultConfirmOpen(false);
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...resetHeatCapacityFreeParametersToDefaultWorkbenchState(file),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityBasicInputDrafts({});
    setHeatCapacityBasicInputErrors({});
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityRestoreDefaultConfirmOpen(false);
  };

  const createHeatCapacityAdvancedDraftFromFile = (): HeatCapacityFreeParameterDraft | null => (
    activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'
      ? { ...selectHeatCapacityFreeAppliedParameterDraft(activeFile) }
      : null
  );

  const openHeatCapacityAdvancedSettings = () => {
    if (!guardWorkbenchTutorialAction('open-parameter-window')) return;
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const draft = createHeatCapacityAdvancedDraftFromFile();
    if (!draft) return;
    setHeatCapacityAdvancedDraft(draft);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityAdvancedOpen(true);
  };

  const cancelHeatCapacityAdvancedParameterDraft = () => {
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
  };

  const saveHeatCapacityAdvancedParameterDraft = (
    draft: HeatCapacityFreeParameterDraft,
  ) => {
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const nextDraft = { ...draft };
    const nextErrors: Record<string, string> = {};
    const nextErrorMessages: Record<string, WorkbenchConsoleMessageFactory> = {};
    const parsedValues: Partial<Record<HeatCapacityFreeDraftNumberKey, number>> = {};
    heatCapacityFreeAdvancedNumberParameters.forEach((definition) => {
      const rawValue = heatCapacityAdvancedInputDrafts[definition.id];
      if (rawValue === undefined) return;
      const validation = validateHeatCapacityFreeNumberValue(
        definition,
        rawValue,
        nextDraft,
        { checkMax: false },
      );
      if (validation.valid === false) {
        nextErrors[definition.id] = validation.message;
        nextErrorMessages[definition.id] = validation.getMessage;
        return;
      }
      parsedValues[definition.id] = validation.value;
    });
    Object.entries(parsedValues).forEach(([id, value]) => {
      nextDraft[id as HeatCapacityFreeDraftNumberKey] = value;
    });
    heatCapacityFreeAdvancedNumberParameters.forEach((definition) => {
      const maxValue = getHeatCapacityFreeParameterMaximum(definition, nextDraft);
      if (maxValue !== null && nextDraft[definition.id] > maxValue) {
        nextErrors[definition.id] = getHeatCapacityFreeValueTooLargeMessage(definition, maxValue);
        nextErrorMessages[definition.id] = (language) => getHeatCapacityFreeValueTooLargeMessage(
          definition,
          maxValue,
          language,
        );
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setHeatCapacityAdvancedInputErrors(nextErrors);
      const firstErrorId = Object.keys(nextErrors)[0];
      const firstError = nextErrors[firstErrorId];
      if (
        firstError.includes(heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference]) ||
        firstError.includes(heatCapacityFreeSharedText.valueTooSmall[settingsLanguagePreference])
      ) {
        showHeatCapacityFreeParameterInputError(firstError, nextErrorMessages[firstErrorId]);
      }
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, nextDraft),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
  };

  const acknowledgeHeatCapacityFreeAdvancedRisk = () => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? {
            ...acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'advancedParametersRisk'),
            updatedAt: Date.now(),
          }
        : file
    ));
  };

  const closePinnedHeatCapacityParameterHelp = () => {
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  const updateHeatCapacityParamHelpPopoverStyle = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const gap = 7;
    const width = Math.min(260, Math.max(180, viewportWidth - margin * 2));
    const maxHeight = Math.min(220, Math.max(96, viewportHeight - margin * 2));
    const estimatedHeight = Math.min(136, maxHeight);
    const maxLeft = Math.max(margin, viewportWidth - width - margin);
    const left = Math.min(Math.max(margin, rect.right - width), maxLeft);
    const belowTop = rect.bottom + gap;
    const aboveTop = rect.top - gap - estimatedHeight;
    const preferredTop = belowTop + estimatedHeight <= viewportHeight - margin ? belowTop : aboveTop;
    const maxTop = Math.max(margin, viewportHeight - estimatedHeight - margin);
    const top = Math.min(Math.max(margin, preferredTop), maxTop);
    setHeatCapacityParamHelpPopoverStyle({ left, top, width, maxHeight });
  };

  const renderHeatCapacityTooltipPopover = (
    tooltipId: string,
    message: string,
    handlers?: {
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
    },
  ) => (
    visibleHeatCapacityParamHelpId === tooltipId
      ? createPortal(
        <span
          className={`studio-param-help-popover studio-heat-unified-tooltip studio-param-help-popover-${resolvedWorkbenchTheme}`}
          data-heat-capacity-param-help-popover-id={tooltipId}
          data-heat-capacity-tooltip-popover-id={tooltipId}
          role="tooltip"
          style={heatCapacityParamHelpPopoverStyle}
          onMouseEnter={handlers?.onMouseEnter}
          onMouseLeave={handlers?.onMouseLeave}
        >
          {message}
        </span>,
        document.body,
      )
      : null
  );

  const hideHeatCapacityHoverTooltip = () => {
    if (pinnedHeatCapacityParamHelpId !== null) return;
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  const renderHeatCapacityTooltipAnchor = (
    tooltipId: string,
    message: string,
    children: React.ReactNode,
    options?: {
      className?: string;
      target?: string;
      focusable?: boolean;
    },
  ) => (
    <span
      className={`studio-heat-tooltip-anchor ${options?.className ?? ''}`.trim()}
      data-heat-capacity-tooltip-target={options?.target ?? tooltipId}
      tabIndex={options?.focusable ? 0 : undefined}
      aria-label={options?.focusable ? message : undefined}
      onMouseEnter={(event) => {
        updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
        setHoveredHeatCapacityParamHelpId(tooltipId);
      }}
      onMouseLeave={hideHeatCapacityHoverTooltip}
      onFocus={(event) => {
        updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
        setHoveredHeatCapacityParamHelpId(tooltipId);
      }}
      onBlur={hideHeatCapacityHoverTooltip}
    >
      {children}
      {renderHeatCapacityTooltipPopover(tooltipId, message)}
    </span>
  );

  const showHeatCapacityPressureThresholdToast = (
    pressureMv: number,
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
    if (pressureMv >= pressureThresholdsMv.pressureDangerThresholdMv) {
      showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureAlarmMessage, 'pressureAlarm');
      return;
    }
    if (pressureMv >= pressureThresholdsMv.pressureWarningThresholdMv) {
      showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureWarningMessage, 'pressureWarning');
    }
  };

  const getHeatCapacityGuideStep = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): GuideHeatCapacityStep => selectHeatCapacityGuideStep(file, autoDemoInteractionLocked);

  const getGuideStepGuidance = (
    step: GuideHeatCapacityStep,
    file?: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => selectGuideStepGuidance(step, file, settingsLanguagePreference, heatCapacityRealtimeCopy);

  const setHeatCapacityToastCurrentState = (message: HeatCapacityToastMessage | null) => {
    heatCapacityToastCurrentRef.current = message;
    setHeatCapacityToastCurrent(message);
  };

  const setPendingHeatCapacityToast = (message: HeatCapacityToastMessage | null) => {
    heatCapacityToastPendingRef.current = message;
  };

  const scheduleHeatCapacityToastAdvance = (delayMs = HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS) => {
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    const timerGeneration = ++heatCapacityToastTimerGenerationRef.current;
    heatCapacityToastPausedRef.current = null;
    heatCapacityToastDeadlineAtMsRef.current = Date.now() + Math.max(0, delayMs);
    heatCapacityToastTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityToastTimerGenerationRef.current) return;
      heatCapacityToastTimerRef.current = null;
      heatCapacityToastDeadlineAtMsRef.current = null;
      const nextState = resolveHeatCapacityToastAdvance({
        current: heatCapacityToastCurrentRef.current,
        pending: heatCapacityToastPendingRef.current,
      }, Date.now());
      setPendingHeatCapacityToast(nextState.pending);
      setHeatCapacityToastCurrentState(nextState.current);
      if (nextState.shouldContinueTimer) {
        scheduleHeatCapacityToastAdvance();
      }
    }, Math.max(0, delayMs));
  };

  const isHeatCapacityPressureAlertActive = () => (
    (
      heatCapacityPressureAlarmFileIdRef.current === activeFileIdRef.current &&
      (
        heatCapacityPressureAlarmVisibleRef.current ||
        heatCapacityPressureAlarmTimerRef.current !== null
      )
    ) ||
    (
      heatCapacityClosePumpValveReminderTimerRef.current !== null &&
      heatCapacityClosePumpValveReminderFileIdRef.current === activeFileIdRef.current
    ) ||
    isHeatCapacityPressureToast(heatCapacityToastCurrentRef.current) ||
    isHeatCapacityPressureToast(heatCapacityToastPendingRef.current)
  );

  const showHeatCapacityToast = (
    text: string,
    level: HeatCapacityToastLevel = 'info',
    options: { interrupt?: boolean; priority?: number; source?: HeatCapacityToastSource } = {},
  ) => {
    const nextMessage = createHeatCapacityToastMessage(text, level, {
      priority: options.priority,
      source: options.source ?? 'guide',
    });
    const nextState = resolveHeatCapacityToastShow({
      current: heatCapacityToastCurrentRef.current,
      pending: heatCapacityToastPendingRef.current,
      pressureAlertActive: isHeatCapacityPressureAlertActive(),
    }, nextMessage, { interrupt: options.interrupt });
    if (!nextState.changed) return;
    if (nextState.shouldRestartTimer && heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    setHeatCapacityToastCurrentState(nextState.current);
    setPendingHeatCapacityToast(nextState.pending);
    if (nextState.shouldRestartTimer) scheduleHeatCapacityToastAdvance();
  };

  const showHeatCapacityPolicyToast = (
    text: string,
    policy: HeatCapacityToastPolicy,
    levelOverride?: HeatCapacityToastLevel,
  ) => {
    const spec = getHeatCapacityToastPolicySpec(policy);
    showHeatCapacityToast(text, levelOverride ?? spec.level, spec.options);
  };

  const clearHeatCapacityClosePumpValveReminder = () => {
    heatCapacityClosePumpValveReminderTimerGenerationRef.current += 1;
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
    heatCapacityClosePumpValveReminderFileIdRef.current = null;
    desktopExitPausedClosePumpValveReminderRef.current = null;
  };

  const scheduleHeatCapacityClosePumpValveReminder = (fileId: string, delayMs: number) => {
    clearHeatCapacityClosePumpValveReminder();
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityClosePumpValveReminderTimerGenerationRef.current;
    heatCapacityClosePumpValveReminderFileIdRef.current = fileId;
    heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityClosePumpValveReminderTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityClosePumpValveReminderTimerGenerationRef.current) return;
      heatCapacityClosePumpValveReminderTimerRef.current = null;
      heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current === fileId
      ) {
        desktopExitPausedClosePumpValveReminderRef.current = {
          fileId,
          remainingMs: 0,
        };
        return;
      }
      heatCapacityClosePumpValveReminderFileIdRef.current = null;
      if (activeFileIdRef.current !== fileId) return;
      const currentFile = filesRef.current.find((file) => file.id === fileId);
      if (currentFile?.kind !== 'heatCapacity' || !currentFile.pumpValveOpen) return;
      if (!currentFile.powerOn) return;
      if (currentFile.heatCapacityMode === 'free' && !currentFile.heatCapacityFreePreheatCompleted) return;
      if (currentFile.pressureSafetyStatus !== 'danger' && !currentFile.pressureOverLimit) return;
      showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.closePumpValveReminder, 'pressureCloseValve');
    }, normalizedDelayMs);
  };

  const clearHeatCapacityToastBySource = (
    predicate: (message: HeatCapacityToastMessage | null) => boolean,
  ) => {
    const nextState = resolveHeatCapacityToastClear({
      current: heatCapacityToastCurrentRef.current,
      pending: heatCapacityToastPendingRef.current,
    }, predicate, Date.now());
    if (!nextState.changed) return;
    if (heatCapacityToastTimerRef.current !== null) {
      heatCapacityToastTimerGenerationRef.current += 1;
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    heatCapacityToastDeadlineAtMsRef.current = null;
    heatCapacityToastPausedRef.current = null;
    setHeatCapacityToastCurrentState(nextState.current);
    setPendingHeatCapacityToast(nextState.pending);
    if (nextState.shouldRestartTimer) scheduleHeatCapacityToastAdvance();
  };

  const clearHeatCapacityToastQueue = () => {
    heatCapacityToastTimerGenerationRef.current += 1;
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    heatCapacityToastDeadlineAtMsRef.current = null;
    heatCapacityToastPausedRef.current = null;
    setHeatCapacityToastCurrentState(null);
    setPendingHeatCapacityToast(null);
  };

  const clearHeatCapacityPressureAlertUiState = () => {
    if (
      heatCapacityPressureAlarmFileIdRef.current === null ||
      heatCapacityPressureAlarmFileIdRef.current === activeFileIdRef.current
    ) {
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      if (heatCapacityPressureAlarmTimerRef.current !== null) {
        window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
        heatCapacityPressureAlarmTimerRef.current = null;
      }
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
      heatCapacityPressureAlarmFileIdRef.current = null;
      desktopExitPausedPressureAlarmRef.current = null;
      heatCapacityPressureAlarmVisibleRef.current = false;
      setHeatCapacityPressureAlarmVisible(false);
    }
    if (
      heatCapacityClosePumpValveReminderFileIdRef.current === null ||
      heatCapacityClosePumpValveReminderFileIdRef.current === activeFileIdRef.current
    ) {
      clearHeatCapacityClosePumpValveReminder();
    }
    clearHeatCapacityToastBySource(isHeatCapacityPressureToast);
  };

  const clearHeatCapacityGuideStartTimer = () => {
    if (heatCapacityGuideStartTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideStartTimerRef.current);
      heatCapacityGuideStartTimerRef.current = null;
    }
  };

  const clearHeatCapacityRecordSuccessToastTimers = () => {
    heatCapacityRecordSuccessTimerGenerationRef.current += 1;
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
    heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
    heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = null;
    heatCapacityRecordSuccessFollowUpMessageRef.current = null;
    heatCapacityRecordSuccessPausedRef.current = null;
    setHeatCapacityRecordToastSequenceActive(false);
  };

  const scheduleHeatCapacityRecordSuccessToastTimers = (
    followUpMessage: string | null,
    followUpDelayMs: number | null,
    releaseDelayMs: number,
  ) => {
    const timerGeneration = ++heatCapacityRecordSuccessTimerGenerationRef.current;
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
    heatCapacityRecordSuccessPausedRef.current = null;
    heatCapacityRecordSuccessFollowUpMessageRef.current = followUpMessage;
    if (followUpMessage && followUpDelayMs !== null) {
      const normalizedFollowUpDelayMs = Math.max(0, followUpDelayMs);
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = Date.now() + normalizedFollowUpDelayMs;
      const followUpTimerId = window.setTimeout(() => {
        if (timerGeneration !== heatCapacityRecordSuccessTimerGenerationRef.current) return;
        heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
        heatCapacityRecordSuccessFollowUpMessageRef.current = null;
        showHeatCapacityPolicyToast(followUpMessage, 'success');
      }, normalizedFollowUpDelayMs);
      heatCapacityRecordSuccessToastTimersRef.current.push(followUpTimerId);
    } else {
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
    }

    const normalizedReleaseDelayMs = Math.max(0, releaseDelayMs);
    heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = Date.now() + normalizedReleaseDelayMs;
    const releaseTimerId = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityRecordSuccessTimerGenerationRef.current) return;
      heatCapacityRecordSuccessToastTimersRef.current = [];
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = null;
      heatCapacityRecordSuccessFollowUpMessageRef.current = null;
      setHeatCapacityRecordToastSequenceActive(false);
    }, normalizedReleaseDelayMs);
    heatCapacityRecordSuccessToastTimersRef.current.push(releaseTimerId);
  };

  const getHeatCapacityRecordSuccessToast = (kind: HeatCapacityGuideRecordKind) => (
    kind === 'u0'
      ? heatCapacityRealtimeCopy.recordU0SuccessToast
      : kind === 'u1'
        ? heatCapacityRealtimeCopy.recordU1SuccessToast
        : heatCapacityRealtimeCopy.recordU2SuccessToast
  );

  const showHeatCapacitySuccessToastSequence = ({
    primaryMessage,
    followUpMessage,
  }: {
    primaryMessage: string;
    followUpMessage: string | null;
  }) => {
    clearHeatCapacityRecordSuccessToastTimers();
    setHeatCapacityRecordToastSequenceActive(true);
    showHeatCapacityPolicyToast(primaryMessage, 'success');
    const releaseDelay = followUpMessage
      ? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS * 2
      : HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS;
    scheduleHeatCapacityRecordSuccessToastTimers(
      followUpMessage,
      followUpMessage ? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS : null,
      releaseDelay,
    );
  };

  const showHeatCapacityRecordSuccessSequence = ({
    recordMessage,
    trialCompleteMessage,
  }: {
    recordMessage: string;
    trialCompleteMessage: string | null;
  }) => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: recordMessage,
      followUpMessage: trialCompleteMessage,
    });
  };

  const showHeatCapacityGuidePowerOffCompletionToast = () => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: heatCapacityRealtimeCopy.finalTrialCompleteToast,
      followUpMessage: null,
    });
  };

  const showHeatCapacityFreeGroupCompletionToast = (message: string = heatCapacityRealtimeCopy.freeGroupCompleteToast) => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: message,
      followUpMessage: null,
    });
  };

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

  const scheduleHeatCapacityPressureAlarmExpiry = (fileId: string, delayMs: number) => {
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
    }
    const timerGeneration = ++heatCapacityPressureAlarmTimerGenerationRef.current;
    desktopExitPausedPressureAlarmRef.current = null;
    const normalizedDelayMs = Math.max(0, delayMs);
    heatCapacityPressureAlarmDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityPressureAlarmTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityPressureAlarmTimerGenerationRef.current) return;
      heatCapacityPressureAlarmTimerRef.current = null;
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current === fileId
      ) {
        heatCapacityPressureAlarmTimerGenerationRef.current += 1;
        heatCapacityPressureAlarmFileIdRef.current = null;
        heatCapacityPressureAlarmVisibleRef.current = false;
        setHeatCapacityPressureAlarmVisible(false);
        desktopExitPausedPressureAlarmRef.current = null;
        clearHeatCapacityClosePumpValveReminder();
        heatCapacityClosePumpValveReminderFileIdRef.current = fileId;
        desktopExitPausedClosePumpValveReminderRef.current = {
          fileId,
          remainingMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
        };
        return;
      }
      heatCapacityPressureAlarmFileIdRef.current = null;
      heatCapacityPressureAlarmVisibleRef.current = false;
      setHeatCapacityPressureAlarmVisible(false);
      scheduleHeatCapacityClosePumpValveReminder(
        fileId,
        HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
      );
    }, normalizedDelayMs);
  };

  const showHeatCapacityPressureAlarm = (fileId: string, fileName: string) => {
    clearHeatCapacityToastQueue();
    heatCapacityPressureAlarmFileIdRef.current = fileId;
    heatCapacityPressureAlarmVisibleRef.current = true;
    setHeatCapacityPressureAlarmVisible(true);
    exitHeatCapacityFocusMode();
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).pressureAlarmLog(fileName),
      'warning',
    );
    clearHeatCapacityClosePumpValveReminder();
    scheduleHeatCapacityPressureAlarmExpiry(fileId, HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS);
  };

  const pauseHeatCapacityPressureAlertTimers = (fileId: string) => {
    if (
      heatCapacityPressureAlarmFileIdRef.current === fileId &&
      heatCapacityPressureAlarmVisibleRef.current
    ) {
      const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current?.fileId === fileId
        ? desktopExitPausedPressureAlarmRef.current
        : null;
      const remainingMs = getHeatCapacityRefreshRemainingMs(
        heatCapacityPressureAlarmDeadlineAtMsRef.current,
      ) ?? pausedPressureAlarm?.remainingMs ?? null;
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      if (remainingMs !== null && remainingMs <= 0) {
        heatCapacityPressureAlarmFileIdRef.current = null;
        heatCapacityPressureAlarmVisibleRef.current = false;
        setHeatCapacityPressureAlarmVisible(false);
        desktopExitPausedPressureAlarmRef.current = null;
        clearHeatCapacityClosePumpValveReminder();
        heatCapacityClosePumpValveReminderFileIdRef.current = fileId;
        desktopExitPausedClosePumpValveReminderRef.current = {
          fileId,
          remainingMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
        };
      } else if (remainingMs !== null) {
        desktopExitPausedPressureAlarmRef.current = { fileId, remainingMs };
      }
      if (heatCapacityPressureAlarmTimerRef.current !== null) {
        window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
        heatCapacityPressureAlarmTimerRef.current = null;
      }
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
    }

    if (heatCapacityClosePumpValveReminderFileIdRef.current === fileId) {
      const pausedClosePumpValveReminder =
        desktopExitPausedClosePumpValveReminderRef.current?.fileId === fileId
          ? desktopExitPausedClosePumpValveReminderRef.current
          : null;
      const remainingMs = getHeatCapacityRefreshRemainingMs(
        heatCapacityClosePumpValveReminderDeadlineAtMsRef.current,
      ) ?? pausedClosePumpValveReminder?.remainingMs ?? null;
      if (remainingMs !== null) {
        desktopExitPausedClosePumpValveReminderRef.current = { fileId, remainingMs };
      }
      heatCapacityClosePumpValveReminderTimerGenerationRef.current += 1;
      if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
        window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
        heatCapacityClosePumpValveReminderTimerRef.current = null;
      }
      heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
    }
  };

  const isHeatCapacityGuideReminderClockRunning = (fileId = activeFileIdRef.current) => {
    if (desktopExitQuiescedRef.current) return false;
    if (tutorialNoticeKindRef.current !== null) return false;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return false;
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return false;
    if (heatCapacityRefreshRestorePendingRef.current) return false;
    if (activeFileIdRef.current !== fileId) return false;
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    return Boolean(
      file?.kind === 'heatCapacity' &&
      file.heatCapacityMode === 'guide' &&
      file.runState === 'running',
    );
  };

  const pauseGuideHeatCapacityPulse = (fileId: string) => {
    const existingPausedPulse = guideHeatCapacityPausedPulseRef.current?.fileId === fileId
      ? guideHeatCapacityPausedPulseRef.current
      : null;
    const hadRunningPulse = guideHeatCapacityPulseTimerRef.current !== null ||
      guideHeatCapacityPulseDeadlineAtMsRef.current !== null ||
      guideHeatCapacityPulseActive ||
      guideHeatCapacityFocusControlId !== null ||
      existingPausedPulse !== null;
    const remainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityPulseDeadlineAtMsRef.current,
    ) ?? existingPausedPulse?.remainingMs ?? null;
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
    if (hadRunningPulse) {
      const plan = resolveHeatCapacityGuidePulseRestore({
        fileId,
        controlId: guideHeatCapacityFocusControlId ?? existingPausedPulse?.controlId ?? null,
        remainingMs,
        clockRunning: false,
      });
      guideHeatCapacityPausedPulseRef.current = plan.state === 'paused'
        ? {
            fileId: plan.fileId,
            controlId: plan.controlId,
            remainingMs: plan.remainingMs,
          }
        : null;
    }
    guideHeatCapacityPulseDeadlineAtMsRef.current = null;
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
  };

  const restoreGuideHeatCapacityPulse = (
    fileId: string,
    controlId: string | null | undefined,
    remainingMs: number | null | undefined,
  ) => {
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
    guideHeatCapacityPulseDeadlineAtMsRef.current = null;
    guideHeatCapacityPausedPulseRef.current = null;
    const plan = resolveHeatCapacityGuidePulseRestore({
      fileId,
      controlId,
      remainingMs,
      clockRunning: isHeatCapacityGuideReminderClockRunning(fileId),
    });
    if (plan.state === 'cleared') {
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
      return;
    }
    if (plan.state === 'paused') {
      guideHeatCapacityPausedPulseRef.current = {
        fileId: plan.fileId,
        controlId: plan.controlId,
        remainingMs: plan.remainingMs,
      };
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
      return;
    }
    setGuideHeatCapacityFocusControlId(plan.controlId);
    setGuideHeatCapacityPulseActive(true);
    guideHeatCapacityPulseDeadlineAtMsRef.current = Date.now() + plan.remainingMs;
    guideHeatCapacityPulseTimerRef.current = window.setTimeout(() => {
      if (!isHeatCapacityGuideReminderClockRunning(plan.fileId)) {
        pauseGuideHeatCapacityPulse(plan.fileId);
        return;
      }
      guideHeatCapacityPulseTimerRef.current = null;
      guideHeatCapacityPulseDeadlineAtMsRef.current = null;
      guideHeatCapacityPausedPulseRef.current = null;
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
    }, plan.remainingMs);
  };

  const pulseGuideHeatCapacityControl = (
    controlId?: string | null,
    durationMs = 2200,
  ) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (!isHeatCapacityGuideReminderClockRunning()) return;
    const safeDurationMs = Math.max(0, durationMs);
    restoreGuideHeatCapacityPulse(activeFileIdRef.current, controlId, safeDurationMs);
  };

  const clearGuideHeatCapacityGuidancePulseTimer = () => {
    if (guideHeatCapacityGuidancePulseTimerRef.current !== null) {
      window.clearInterval(guideHeatCapacityGuidancePulseTimerRef.current);
      guideHeatCapacityGuidancePulseTimerRef.current = null;
    }
  };

  const showGuideHeatCapacityGuidance = (
    message: string,
    controlId?: string | null,
    level: HeatCapacityToastLevel = 'info',
    source: Extract<HeatCapacityToastSource, 'guide' | 'guide-blocked'> = 'guide',
  ) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (!isHeatCapacityGuideReminderClockRunning()) return;
    if (isHeatCapacityPressureAlertActive()) return;
    showHeatCapacityPolicyToast(message, source === 'guide-blocked' ? 'guideBlocked' : 'guide', level);
    pulseGuideHeatCapacityControl(controlId);
  };

  const clearGuideHeatCapacityGuidance = () => {
    clearHeatCapacityToastBySource(isHeatCapacityGuideToast);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
    guideHeatCapacityPulseDeadlineAtMsRef.current = null;
  };

  const clearGuideHeatCapacityPendingStrongReminderTimer = () => {
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
    guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
    guideHeatCapacityPausedPendingStrongReminderRef.current = null;
  };

  const pauseGuideHeatCapacityReminderTimers = (fileId: string) => {
    clearGuideHeatCapacityGuidancePulseTimer();
    pauseGuideHeatCapacityPulse(fileId);

    const strongTimerContext = guideHeatCapacityStrongReminderTimerContextRef.current;
    const strongRemainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current,
    );
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    if (strongTimerContext?.fileId === fileId) {
      if (strongRemainingMs !== null) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId,
          controlId: strongTimerContext.controlId,
          remainingMs: strongRemainingMs,
        };
      }
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityStrongReminderTimerContextRef.current = null;
    }

    const pendingRemainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current,
    );
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
    if (pendingRemainingMs !== null) {
      guideHeatCapacityPausedPendingStrongReminderRef.current = {
        controlId: guideHeatCapacityPendingStrongReminderControlIdRef.current,
        remainingMs: pendingRemainingMs,
      };
    }
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
    guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
  };

  const isHeatCapacityLessonQueueBlocked = () => heatCapacityLessonDialogActiveRef.current;

  const activateGuideHeatCapacityStrongReminder = (controlId?: string | null) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return false;
    if (heatCapacityRefreshRestorePendingRef.current) return false;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return false;
    if (!isHeatCapacityGuideReminderClockRunning()) return false;
    if (isHeatCapacityPressureAlertActive()) return false;
    if (isHeatCapacityLessonQueueBlocked()) return false;
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    clearGuideHeatCapacityPendingStrongReminderTimer();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityStrongReminderControlId(controlId ?? null);
    setGuideHeatCapacityStrongReminderFocusKey((key) => key + 1);
    pulseGuideHeatCapacityControl(controlId ?? null);
    setGuideHeatCapacityStrongReminderActive(true);
    return true;
  };

  const scheduleGuideHeatCapacityStrongReminderAfterDelay = (
    controlId: string | null | undefined,
    delayMs: number,
  ) => {
    clearGuideHeatCapacityPendingStrongReminderTimer();
    const safeDelayMs = Math.max(0, delayMs);
    if (
      heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
      heatCapacityRuntimeFailureFileIdRef.current !== null ||
      !isHeatCapacityGuideReminderClockRunning()
    ) {
      guideHeatCapacityPausedPendingStrongReminderRef.current = {
        controlId: controlId ?? null,
        remainingMs: safeDelayMs,
      };
      return;
    }
    guideHeatCapacityPendingStrongReminderControlIdRef.current = controlId ?? null;
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = Date.now() + safeDelayMs;
    guideHeatCapacityPendingStrongReminderTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
      if (
        heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
        heatCapacityRuntimeFailureFileIdRef.current !== null ||
        !isHeatCapacityGuideReminderClockRunning()
      ) {
        guideHeatCapacityPausedPendingStrongReminderRef.current = {
          controlId: controlId ?? null,
          remainingMs: 0,
        };
        return;
      }
      if (isHeatCapacityLessonQueueBlocked()) return;
      activateGuideHeatCapacityStrongReminder(controlId ?? null);
    }, safeDelayMs);
  };

  const scheduleGuideHeatCapacityStrongReminderAfterToast = (controlId?: string | null) => {
    scheduleGuideHeatCapacityStrongReminderAfterDelay(
      controlId,
      HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
    );
  };

  const clearGuideHeatCapacityStrongReminder = () => {
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
    guideHeatCapacityStrongReminderTimerContextRef.current = null;
    guideHeatCapacityRestoredStrongReminderTimerRef.current = null;
    clearGuideHeatCapacityPendingStrongReminderTimer();
    guideHeatCapacityMissCountRef.current = 0;
    guideHeatCapacityRejectedInteractionRef.current.reset();
    setGuideHeatCapacityStrongReminderActive(false);
    setGuideHeatCapacityStrongReminderControlId(null);
  };

  const clearGuideHeatCapacityStrongReminderFocus = () => {
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const resetHeatCapacityLessonResumeClock = (fileId: string | null = heatCapacityLessonPausedFileIdRef.current) => {
    if (!fileId) return;
    const now = Date.now();
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return {
        ...file,
        heatCapacityGuideWorkflow: file.heatCapacityMode === 'guide'
          ? {
              ...file.heatCapacityGuideWorkflow,
              strongReminderActive: false,
              strongReminderTargetControlId: null,
            }
          : file.heatCapacityGuideWorkflow,
        lastUpdateMs: file.powerOn ? now : file.lastUpdateMs,
        displayResponseLastUpdateMs: file.powerOn ? now : file.displayResponseLastUpdateMs,
        updatedAt: now,
      };
    });
    heatCapacityLessonPausedFileIdRef.current = null;
  };

  const clearHeatCapacityGuideLessonTimers = () => {
    if (heatCapacityGuideLessonTransitionTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideLessonTransitionTimerRef.current);
      heatCapacityGuideLessonTransitionTimerRef.current = null;
    }
    if (heatCapacityGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideLessonCloseTimerRef.current);
      heatCapacityGuideLessonCloseTimerRef.current = null;
    }
    heatCapacityGuideLessonCloseTimerGenerationRef.current += 1;
    heatCapacityGuideLessonCloseDeadlineAtMsRef.current = null;
    heatCapacityGuideLessonCloseShouldResumeDemoRef.current = false;
    heatCapacityGuideLessonClosePausedRef.current = null;
  };

  const scheduleHeatCapacityGuideLessonClose = (
    fileId: string,
    shouldResumeAutoDemo: boolean,
    delayMs: number,
  ) => {
    if (heatCapacityGuideLessonCloseTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideLessonCloseTimerRef.current);
    }
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityGuideLessonCloseTimerGenerationRef.current;
    heatCapacityGuideLessonClosePausedRef.current = null;
    heatCapacityGuideLessonCloseShouldResumeDemoRef.current = shouldResumeAutoDemo;
    heatCapacityGuideLessonCloseDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityGuideLessonCloseTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityGuideLessonCloseTimerGenerationRef.current) return;
      heatCapacityGuideLessonCloseTimerRef.current = null;
      heatCapacityGuideLessonCloseDeadlineAtMsRef.current = null;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) {
        heatCapacityGuideLessonClosePausedRef.current = {
          fileId,
          remainingMs: 0,
          shouldResumeAutoDemo,
        };
        return;
      }
      heatCapacityGuideLessonCloseShouldResumeDemoRef.current = false;
      resetHeatCapacityLessonResumeClock(fileId);
      setHeatCapacityGuideLessonDialog(null);
      setHeatCapacityGuideLessonClosing(false);
      heatCapacityLessonDialogActiveRef.current = false;
      if (shouldResumeAutoDemo) runHeatCapacityAutoDemo();
    }, normalizedDelayMs);
  };

  const clearHeatCapacityGuideLessonState = () => {
    resetHeatCapacityLessonResumeClock(heatCapacityLessonPausedFileIdRef.current);
    clearHeatCapacityGuideLessonTimers();
    heatCapacityGuideLessonShownRef.current.clear();
    heatCapacityGuideLessonStepRef.current = { fileId: null, step: 'idle' };
    heatCapacityLessonDialogActiveRef.current = false;
    heatCapacityLessonPausedFileIdRef.current = null;
    heatCapacityLessonAutoResumeDemoRef.current = false;
    setHeatCapacityGuideLessonDialog(null);
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(false);
  };

  const clearHeatCapacityGuideLessonRuntimeForFileExit = () => {
    clearHeatCapacityGuideLessonTimers();
    heatCapacityGuideLessonShownRef.current.clear();
    heatCapacityGuideLessonStepRef.current = { fileId: null, step: 'idle' };
    heatCapacityLessonDialogActiveRef.current = false;
    heatCapacityLessonPausedFileIdRef.current = null;
    heatCapacityLessonAutoResumeDemoRef.current = false;
    setHeatCapacityGuideLessonDialog(null);
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(false);
  };

  const shouldResetStrongFocusAfterAllowedAction = (
    controlId: string | null,
    action: GuideHeatCapacityAction,
  ) => (
    (controlId === 'stopcock' && (action === 'openStopcock' || action === 'closeStopcock')) ||
    (controlId === 'pumpValve' && (action === 'openPumpValve' || action === 'closePumpValve'))
  );

  const clearHeatCapacityGuideTransientUiState = () => {
    clearGuideHeatCapacityGuidance();
    clearGuideHeatCapacityStrongReminder();
    clearGuideHeatCapacityGuidancePulseTimer();
    guideHeatCapacityPausedPulseRef.current = null;
    setGuideHeatCapacityActiveFileId(null);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
    setGuideHeatCapacityRollback(null);
    setHeatCapacityGuideProjectedHoles({});
    clearHeatCapacityGuideLessonState();
  };

  const resetHeatCapacitySceneUiState = () => {
    setHeatCapacityFocusResetKey((key) => key + 1);
    setHeatCapacityHardSphereVisualResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const clearHeatCapacityModeTransientUiRuntime = () => {
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityToastQueue();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearHeatCapacityPressureAlertUiState();
    clearHeatCapacityGuideTransientUiState();
    setPendingRemoveHeatCapacityTrialRecord(null);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    setAutoDemoCompletionMessage(null);
  };

  const resetHeatCapacityGroupUiRuntime = () => {
    clearHeatCapacityModeTransientUiRuntime();
    resetHeatCapacitySceneUiState();
  };

  const registerGuideHeatCapacityMiss = (_guard: GuideHeatCapacityGuardResult) => {
    const missCount = guideHeatCapacityMissCountRef.current + 1;
    guideHeatCapacityMissCountRef.current = missCount;
    return missCount >= 2;
  };

  useEffect(() => () => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
      heatCapacityRecordControlsClosingTimerRef.current = null;
    }
    clearHeatCapacityGuideLessonTimers();
    clearGuideHeatCapacityGuidancePulseTimer();
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
  }, []);

  const getGuideHeatCapacityGuard = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    action: GuideHeatCapacityAction,
  ): GuideHeatCapacityGuardResult => {
    const step = getHeatCapacityGuideStep(file);
    const guidance = getGuideStepGuidance(step, file);
    const rollbackAnimation = getHeatCapacityGuideRollbackAnimation(action);
    const allowedActions = getHeatCapacityGuideAllowedActions(step);
    if (
      action === 'closePumpValve' &&
      (step === 'pumpRequired' || step === 'closePumpValveRequired') &&
      !canProceedAfterPumping(file)
    ) {
      return {
        allowed: false,
        expectedControlId: 'pumpBulb',
        expectedMessage: heatCapacityRealtimeCopy.guidePumpInsufficientReminder,
        expectedLevel: 'warning',
        rollbackAnimation: 'valveBounce',
      };
    }
    if (step === 'stabilizeBeforeReleaseRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU1',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
        rollbackAnimation,
        suppressStrongReminder: true,
      };
    }
    if (step === 'recoverRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU2',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
        rollbackAnimation,
        suppressStrongReminder: true,
      };
    }
    if (allowedActions.includes(action)) return { allowed: true };
    if (isHeatCapacityGuideRecordStep(step)) {
      return {
        allowed: false,
        expectedControlId: guidance.controlId ?? undefined,
        rollbackAnimation,
        suppressGuidance: true,
      };
    }
    return {
      allowed: false,
      expectedControlId: guidance.controlId ?? undefined,
      expectedMessage: guidance.message,
      expectedLevel: 'warning',
      rollbackAnimation,
    };
  };

  const applyGuideHeatCapacityGuardFailure = (guard: GuideHeatCapacityGuardResult) => {
    if (guard.rollbackAnimation) {
      setGuideHeatCapacityRollback((previous) => ({
        animation: guard.rollbackAnimation!,
        key: Math.max(Date.now(), (previous?.key ?? 0) + 1),
      }));
    }
    const shouldOpenStrongReminder = guard.suppressStrongReminder ? false : registerGuideHeatCapacityMiss(guard);
    if (guard.suppressGuidance) {
      if (shouldOpenStrongReminder) scheduleGuideHeatCapacityStrongReminderAfterToast(guard.expectedControlId ?? null);
      return;
    }
    showGuideHeatCapacityGuidance(guard.expectedMessage ?? '', guard.expectedControlId, guard.expectedLevel ?? 'warning', 'guide-blocked');
    if (shouldOpenStrongReminder) {
      scheduleGuideHeatCapacityStrongReminderAfterToast(guard.expectedControlId ?? null);
    }
  };

  const guardGuideHeatCapacityAction = (
    action: GuideHeatCapacityAction,
    source: 'user' | 'autoDemo' = 'user',
    interactionId?: HeatCapacityControlInteractionId,
  ) => {
    if (source === 'autoDemo') return true;
    if (!activeFile || activeFile.kind !== 'heatCapacity') return true;
    if (guideHeatCapacityActiveFileId !== activeFile.id) return true;
    const guard = getGuideHeatCapacityGuard(activeFile, action);
    if (guard.allowed) {
      const activeStrongReminderControlId = guideHeatCapacityStrongReminderActive
        ? guideHeatCapacityStrongReminderControlId
        : null;
      clearGuideHeatCapacityStrongReminder();
      clearGuideHeatCapacityGuidance();
      clearGuideHeatCapacityPendingStrongReminderTimer();
      if (shouldResetStrongFocusAfterAllowedAction(activeStrongReminderControlId, action)) {
        clearGuideHeatCapacityStrongReminderFocus();
      }
      return true;
    }
    if (!guideHeatCapacityRejectedInteractionRef.current.shouldApplyFailure(
      activeFile.id,
      action,
      interactionId,
    )) return false;
    applyGuideHeatCapacityGuardFailure(guard);
    return false;
  };

  const activeHeatCapacityGuideFileId = activeFile.kind === 'heatCapacity' ? activeFile.id : null;
  const activeHeatCapacityGuideStep: GuideHeatCapacityStep = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityGuideStep(activeFile)
    : 'idle';
  const activeHeatCapacityDemoStep = autoDemoStepIndex > 0
    ? createHeatCapacityAutoDemoSteps()[autoDemoStepIndex - 1] ?? null
    : null;
  const activeHeatCapacityPreheatMode: 'demo' | 'guide' | 'free' | null = activeFile.kind !== 'heatCapacity'
    ? null
    : activeFile.heatCapacityMode === 'demo' &&
        autoDemoInteractionLocked &&
        activeHeatCapacityDemoStep?.id === 'sensor-preheat'
      ? 'demo'
      : activeFile.heatCapacityMode === 'guide' &&
          activeFile.heatCapacityGuideWorkflow.step === 'preheatRequired'
        ? 'guide'
        : isHeatCapacityFreePreheatRequired(activeFile)
          ? 'free'
          : null;
  const activeHeatCapacityPreheatLocked = activeHeatCapacityPreheatMode !== null;
  const activeHeatCapacityInvalidAttemptPrompt = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeFile.heatCapacityFreeRunWorkspace.activeAttempt?.status === 'invalid' &&
    !activeFile.heatCapacityFreeRunWorkspace.activeAttempt.invalidPromptDismissed;
  const activeHeatCapacityModalLocked = activeHeatCapacityPreheatLocked ||
    activeHeatCapacityInvalidAttemptPrompt ||
    heatCapacityBatchSetupOpen ||
    heatCapacityReportExportOpen ||
    heatCapacityCalculationWindowOpen;

  const completeActiveHeatCapacityPreheat = () => {
    if (activeFile.kind !== 'heatCapacity' || activeHeatCapacityPreheatMode === 'demo') return;
    const fileId = activeFile.id;
    const mode = activeHeatCapacityPreheatMode;
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return mode === 'guide'
        ? completeHeatCapacityGuidePreheatWorkbenchState(file, Date.now())
        : completeHeatCapacityFreePreheatWorkbenchState(file, Date.now());
    });
  };

  const openHeatCapacityLessonIntro = (fileId: string | null = activeFileIdRef.current) => {
    const targetFile = filesRef.current.find((file) => file.id === fileId);
    if (!targetFile || targetFile.kind !== 'heatCapacity') return;
    const shouldResumeAutoDemo = targetFile.id === activeFileIdRef.current && autoDemoRunning;
    heatCapacityLessonAutoResumeDemoRef.current = shouldResumeAutoDemo;
    if (shouldResumeAutoDemo) pauseHeatCapacityAutoDemo();
    heatCapacityLessonPausedFileIdRef.current = targetFile.id;
    clearHeatCapacityGuideLessonTimers();
    clearGuideHeatCapacityStrongReminder();
    heatCapacityLessonDialogActiveRef.current = true;
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(false);
    setHeatCapacityGuideLessonDialog({ kind: 'intro', pageIndex: 0 });
  };

  const closeHeatCapacityGuideLessonDialog = () => {
    if (!heatCapacityGuideLessonDialog) return;
    const pausedFileId = heatCapacityLessonPausedFileIdRef.current;
    const shouldResumeAutoDemo = heatCapacityLessonAutoResumeDemoRef.current;
    heatCapacityLessonAutoResumeDemoRef.current = false;
    clearHeatCapacityGuideLessonTimers();
    setHeatCapacityGuideLessonOutgoingView(null);
    setHeatCapacityGuideLessonClosing(true);
    scheduleHeatCapacityGuideLessonClose(
      pausedFileId ?? activeFileIdRef.current,
      shouldResumeAutoDemo,
      HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS,
    );
  };

  useEffect(() => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityLessonIntroAutoShown) return;
    openHeatCapacityLessonIntro(activeFile.id);
    updateFileById(activeFile.id, (file) => (
      file.kind === 'heatCapacity'
        ? {
            ...file,
            heatCapacityLessonIntroAutoShown: true,
            updatedAt: Date.now(),
          }
        : file
    ));
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityLessonIntroAutoShown : null,
  ]);

  const getHeatCapacityGuideLessonView = (
    dialog: HeatCapacityGuideLessonDialogState,
  ): HeatCapacityGuideLessonView => {
    if (dialog.kind === 'intro') {
      const introPageCount = heatCapacityRealtimeCopy.guideLessonIntroPages.length;
      const pageIndex = Math.max(0, Math.min(introPageCount - 1, dialog.pageIndex));
      const introCopy = heatCapacityRealtimeCopy.guideLessonIntroPages[pageIndex];
      return {
        key: `intro-${pageIndex}`,
        title: introCopy.title,
        body: introCopy.body,
      };
    }
    const stepCopy = heatCapacityRealtimeCopy.guideLessonStepExplanations[dialog.lessonId];
    return {
      key: `step-${dialog.lessonId}`,
      title: stepCopy.title,
      body: stepCopy.body,
    };
  };

  const handleHeatCapacityGuideLessonDialogAdvance = () => {
    if (!heatCapacityGuideLessonDialog) return;
    if (heatCapacityGuideLessonDialog.kind === 'intro') {
      const pageIndex = heatCapacityGuideLessonDialog.pageIndex;
      const pageCount = heatCapacityRealtimeCopy.guideLessonIntroPages.length;
      if (pageIndex < pageCount - 1) {
        clearHeatCapacityGuideLessonTimers();
        setHeatCapacityGuideLessonClosing(false);
        setHeatCapacityGuideLessonOutgoingView(getHeatCapacityGuideLessonView(heatCapacityGuideLessonDialog));
        setHeatCapacityGuideLessonDialog({ kind: 'intro', pageIndex: pageIndex + 1 });
        heatCapacityGuideLessonTransitionTimerRef.current = window.setTimeout(() => {
          heatCapacityGuideLessonTransitionTimerRef.current = null;
          setHeatCapacityGuideLessonOutgoingView(null);
        }, HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS);
        return;
      }
      closeHeatCapacityGuideLessonDialog();
      return;
    }
    if (heatCapacityGuideLessonDialog.kind === 'step') {
      closeHeatCapacityGuideLessonDialog();
    }
  };

  const handleHeatCapacityGuideLessonDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeHeatCapacityGuideLessonDialog();
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleHeatCapacityGuideLessonDialogAdvance();
    }
  };

  const handleHeatCapacityGuideLessonCloseButtonMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
  };

  const handleHeatCapacityGuideLessonCloseButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    closeHeatCapacityGuideLessonDialog();
  };

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

  useEffect(() => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    const nextIndex = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'guide'
      ? getHeatCapacityGuideChecklistIndex(activeHeatCapacityGuideStep)
      : 0;
    heatCapacityGuideChecklistCurrentIndexRef.current = nextIndex;
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
      heatCapacityGuideChecklistSnapTimerRef.current = null;
    }
    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
      heatCapacityGuideChecklistReturnTimerRef.current = null;
    }
    applyHeatCapacityGuideChecklistView(nextIndex, 0, true);
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeHeatCapacityGuideStep,
  ]);



















  useEffect(() => {
    const activeGuideLessonFile = activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      guideHeatCapacityActiveFileId === activeFile.id;
    const previousGuideLessonStep = heatCapacityGuideLessonStepRef.current;

    if (!activeGuideLessonFile) {
      heatCapacityGuideLessonStepRef.current = {
        fileId: activeHeatCapacityGuideFileId,
        step: activeHeatCapacityGuideStep,
      };
      if (heatCapacityGuideLessonDialog?.kind === 'step') {
        clearHeatCapacityGuideLessonState();
      }
      return;
    }

    const previousGuideStep = previousGuideLessonStep.step;
    if (
      previousGuideLessonStep.fileId === activeFile.id &&
      previousGuideStep !== activeHeatCapacityGuideStep
    ) {
      const lessonId = HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP[previousGuideStep];
      const lessonKey = lessonId ? `${activeFile.id}:${previousGuideStep}:${lessonId}` : null;
      if (
        lessonId &&
        lessonKey &&
        activeHeatCapacityGuideStep !== 'idle' &&
        activeHeatCapacityGuideStep !== 'completed' &&
        !heatCapacityGuideLessonShownRef.current.has(lessonKey)
      ) {
        heatCapacityGuideLessonShownRef.current.add(lessonKey);
        heatCapacityLessonPausedFileIdRef.current = activeFile.id;
        clearHeatCapacityGuideLessonTimers();
        clearGuideHeatCapacityStrongReminder();
        heatCapacityLessonDialogActiveRef.current = true;
        setHeatCapacityGuideLessonOutgoingView(null);
        setHeatCapacityGuideLessonClosing(false);
        setHeatCapacityGuideLessonDialog({ kind: 'step', lessonId });
      }
    }

    heatCapacityGuideLessonStepRef.current = {
      fileId: activeFile.id,
      step: activeHeatCapacityGuideStep,
    };
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    guideHeatCapacityActiveFileId,
    heatCapacityGuideLessonDialog?.kind,
  ]);

  useEffect(() => () => {
    clearHeatCapacityGuideChecklistTimers();
  }, []);

  useEffect(() => {
    if (
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.heatCapacityGuideWorkflow.step === 'pumpRequired'
    ) {
      guidePassivePumpTargetNoticeKeyRef.current = null;
    }
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.step : null,
  ]);

  useEffect(() => {
    const runtimeFailureOwnsActiveGuide = Boolean(
      heatCapacityRuntimeFailureFileId &&
      heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId,
    );
    const reminderOwnsActiveGuide = Boolean(
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.id === guideHeatCapacityActiveFileId,
    );
    const guideReminderClockStopped = reminderOwnsActiveGuide && (
      runtimeFailureOwnsActiveGuide || !isHeatCapacityGuideReminderClockRunning(activeFile.id)
    );
    if (guideReminderClockStopped) {
      pauseGuideHeatCapacityPulse(activeFile.id);
      clearGuideHeatCapacityGuidancePulseTimer();
      return;
    }
    const pausedPulse = guideHeatCapacityPausedPulseRef.current;
    if (!pausedPulse) return;
    if (
      heatCapacityRefreshRestoring ||
      heatCapacityModeTransitionLocked ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.id !== pausedPulse.fileId ||
      activeFile.heatCapacityMode !== 'guide' ||
      activeFile.runState !== 'running' ||
      guideHeatCapacityActiveFileId !== pausedPulse.fileId
    ) return;
    guideHeatCapacityPausedPulseRef.current = null;
    restoreGuideHeatCapacityPulse(
      pausedPulse.fileId,
      pausedPulse.controlId,
      pausedPulse.remainingMs,
    );
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    activeHeatCapacityGuideFileId,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityFocusControlId,
    guideHeatCapacityPulseActive,
    desktopExitQuiesced,
    heatCapacityModeTransitionLocked,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ]);

  useEffect(() => {
    if (desktopExitQuiesced) return;
    if (heatCapacityRefreshRestoring) return;
    if (heatCapacityModeTransitionLocked) return;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return;
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
    if (activeFile.runState !== 'running') return;
    if (activeHeatCapacityGuideStep !== 'closePumpValveRequired') return;
    const focusSession = heatCapacityFocusSessionRef.current;
    if (focusSession?.fileId === activeFile.id && focusSession.mode === 'pump') {
      exitHeatCapacityFocusMode();
    }
    const noticeKey = `${activeFile.id}:${activeFile.pumpStrokeCount}:close-pump-valve`;
    if (guidePassivePumpTargetNoticeKeyRef.current === noticeKey) return;
    guidePassivePumpTargetNoticeKeyRef.current = noticeKey;
    const guidance = getGuideStepGuidance('closePumpValveRequired', activeFile);
    showGuideHeatCapacityGuidance(guidance.message, guidance.controlId, 'info', 'guide');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    activeFile.kind === 'heatCapacity' ? activeFile.pumpStrokeCount : null,
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    desktopExitQuiesced,
    guideHeatCapacityActiveFileId,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
  ]);

  useEffect(() => {
    if (desktopExitQuiesced) return;
    if (heatCapacityRefreshRestoring) return;
    if (heatCapacityModeTransitionLocked) return;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return;
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.runState !== 'running') return;
    if (!isGuideHeatCapacityPauseStep(activeHeatCapacityGuideStep)) return;
    if (heatCapacityRecordToastSequenceActive) return;
    if (heatCapacityLessonDialogActive) return;
    if (isHeatCapacityGuideRecordStep(activeHeatCapacityGuideStep)) {
      clearGuideHeatCapacityGuidance();
    }
    const latestFile = filesRef.current.find((file) => file.id === activeHeatCapacityGuideFileId);
    if (!latestFile || latestFile.kind !== 'heatCapacity') return;
    const guidance = getGuideStepGuidance(activeHeatCapacityGuideStep, latestFile);
    if (
      guideHeatCapacityPulseDeadlineAtMsRef.current !== null &&
      guideHeatCapacityPulseActive &&
      guideHeatCapacityFocusControlId === guidance.controlId
    ) {
      return;
    }
    pulseGuideHeatCapacityControl(guidance.controlId);
  }, [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityFocusControlId,
    guideHeatCapacityPulseActive,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
    settingsLanguagePreference,
  ]);

  useEffect(() => {
    clearGuideHeatCapacityGuidancePulseTimer();
    if (desktopExitQuiesced) return undefined;
    if (heatCapacityRefreshRestoring) return undefined;
    if (heatCapacityModeTransitionLocked) return undefined;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return undefined;
    if (!activeHeatCapacityGuideFileId) return undefined;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return undefined;
    if (activeFile.kind !== 'heatCapacity' || activeFile.runState !== 'running') return undefined;
    if (autoDemoInteractionLocked) return undefined;
    if (heatCapacityRecordToastSequenceActive) return undefined;
    if (heatCapacityLessonDialogActive) return undefined;
    if (
      activeHeatCapacityGuideStep === 'idle' ||
      activeHeatCapacityGuideStep === 'preheatRequired' ||
      activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' ||
      activeHeatCapacityGuideStep === 'recoverRequired' ||
      activeHeatCapacityGuideStep === 'completed'
    ) return undefined;
    const guideSessionFileId = activeHeatCapacityGuideFileId;
    guideHeatCapacityGuidancePulseTimerRef.current = window.setInterval(() => {
      const latestFile = filesRef.current.find((file) => file.id === guideSessionFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (latestFile.runState !== 'running') return;
      if (guideHeatCapacityActiveFileIdRef.current !== guideSessionFileId) return;
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
      if (desktopExitQuiescedRef.current) return;
      if (heatCapacityRuntimeFailureFileIdRef.current === guideSessionFileId) return;
      if (autoDemoInteractionLocked) return;
      if (heatCapacityRecordToastSequenceActive) return;
      if (isHeatCapacityLessonQueueBlocked()) return;
      const latestStep = getHeatCapacityGuideStep(latestFile);
      if (latestStep === 'idle' || latestStep === 'preheatRequired' || latestStep === 'completed') return;
      const guidance = getGuideStepGuidance(latestStep, latestFile);
      pulseGuideHeatCapacityControl(guidance.controlId);
    }, GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS);
    return () => {
      clearGuideHeatCapacityGuidancePulseTimer();
    };
  }, [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    autoDemoInteractionLocked,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
    settingsLanguagePreference,
  ]);

  useEffect(() => {
    if (desktopExitQuiesced) return;
    if (heatCapacityModeTransitionLocked || heatCapacityRefreshRestoring) return;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return;
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.id !== activeHeatCapacityGuideFileId) return;
    if (activeFile.heatCapacityMode !== 'guide') return;
    if (activeFile.runState !== 'running') return;
    const workflow = activeFile.heatCapacityGuideWorkflow;
    if (!workflow.strongReminderActive || !workflow.strongReminderTargetControlId) return;
    if (heatCapacityRecordToastSequenceActive) return;
    if (heatCapacityLessonDialogActive) return;
    if (
      guideHeatCapacityStrongReminderActive &&
      guideHeatCapacityStrongReminderControlId === workflow.strongReminderTargetControlId
    ) {
      return;
    }
    activateGuideHeatCapacityStrongReminder(workflow.strongReminderTargetControlId);
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.step : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.strongReminderActive : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.strongReminderTargetControlId : null,
    activeHeatCapacityGuideFileId,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
    heatCapacityModeTransitionLocked,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ]);

  useEffect(() => {
    const previousTimerContext = guideHeatCapacityStrongReminderTimerContextRef.current;
    const previousRemainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current,
    );
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    const runtimeFailureOwnsActiveGuide = Boolean(
      heatCapacityRuntimeFailureFileId &&
      heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId,
    );
    const guideReminderClockStopped = Boolean(
      activeFile.kind === 'heatCapacity' &&
      activeFile.id === activeHeatCapacityGuideFileId &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.runState !== 'running',
    );
    if (desktopExitQuiesced || heatCapacityModeTransitionLocked || runtimeFailureOwnsActiveGuide || guideReminderClockStopped) {
      if (previousTimerContext && previousRemainingMs !== null) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: previousTimerContext.fileId,
          controlId: previousTimerContext.controlId,
          remainingMs: previousRemainingMs,
        };
        guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
        guideHeatCapacityStrongReminderTimerContextRef.current = null;
      }
      return undefined;
    }
    if (heatCapacityRefreshRestoring) return undefined;
    const clearStaleStrongReminder = () => {
      setGuideHeatCapacityStrongReminderActive(false);
      setGuideHeatCapacityStrongReminderControlId(null);
      guideHeatCapacityMissCountRef.current = 0;
    };
    const clearStrongReminderTimerCheckpoint = () => {
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityStrongReminderTimerContextRef.current = null;
      guideHeatCapacityRestoredStrongReminderTimerRef.current = null;
    };
    if (!activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (autoDemoInteractionLocked) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (heatCapacityRecordToastSequenceActive) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (heatCapacityLessonDialogActive) {
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (activeFile.kind !== 'heatCapacity' || activeFile.id !== activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (
      activeHeatCapacityGuideStep === 'idle' ||
      activeHeatCapacityGuideStep === 'preheatRequired' ||
      activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' ||
      activeHeatCapacityGuideStep === 'recoverRequired' ||
      activeHeatCapacityGuideStep === 'completed'
    ) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    const guidance = getGuideStepGuidance(activeHeatCapacityGuideStep, activeFile);
    if (
      guideHeatCapacityStrongReminderActive &&
      guideHeatCapacityStrongReminderControlId === guidance.controlId
    ) {
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    clearStaleStrongReminder();
    const guideSessionFileId = activeHeatCapacityGuideFileId;
    const nextTimerContext = {
      fileId: guideSessionFileId,
      step: activeHeatCapacityGuideStep,
      controlId: guidance.controlId ?? null,
    };
    const restoredTimer = guideHeatCapacityRestoredStrongReminderTimerRef.current;
    const matchesPreviousTimer = previousTimerContext?.fileId === nextTimerContext.fileId &&
      previousTimerContext.step === nextTimerContext.step &&
      previousTimerContext.controlId === nextTimerContext.controlId;
    const matchesRestoredTimer = restoredTimer?.fileId === nextTimerContext.fileId &&
      restoredTimer.controlId === nextTimerContext.controlId;
    const delayMs = matchesPreviousTimer && previousRemainingMs !== null
      ? previousRemainingMs
      : matchesRestoredTimer
        ? restoredTimer.remainingMs
        : GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS;
    guideHeatCapacityRestoredStrongReminderTimerRef.current = null;
    guideHeatCapacityStrongReminderTimerContextRef.current = nextTimerContext;
    guideHeatCapacityStrongReminderDeadlineAtMsRef.current = Date.now() + delayMs;
    guideHeatCapacityStrongReminderTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityStrongReminderTimerRef.current = null;
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityStrongReminderTimerContextRef.current = null;
      const latestFile = filesRef.current.find((file) => file.id === guideSessionFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (desktopExitQuiescedRef.current) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (heatCapacityRuntimeFailureFileIdRef.current === guideSessionFileId) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (latestFile.runState !== 'running') {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (guideHeatCapacityActiveFileIdRef.current !== guideSessionFileId) return;
      if (autoDemoInteractionLocked) return;
      if (heatCapacityRecordToastSequenceActive) return;
      if (isHeatCapacityLessonQueueBlocked()) return;
      const latestStep = getHeatCapacityGuideStep(latestFile);
      if (latestStep === 'idle' || latestStep === 'completed') return;
      if (latestStep === 'stabilizeBeforeReleaseRequired' || latestStep === 'recoverRequired') return;
      if (isHeatCapacityGuideRecordStep(latestStep) && latestStep !== activeHeatCapacityGuideStep) return;
      const guidance = getGuideStepGuidance(latestStep, latestFile);
      activateGuideHeatCapacityStrongReminder(guidance.controlId);
    }, delayMs);
    return () => {
      if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
        window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
        guideHeatCapacityStrongReminderTimerRef.current = null;
      }
    };
  }, [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    autoDemoInteractionLocked,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
    settingsLanguagePreference,
  ]);

  useEffect(() => {
    const runtimeFailureOwnsActiveGuide = Boolean(
      heatCapacityRuntimeFailureFileId &&
      heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId,
    );
    const guideReminderClockStopped = Boolean(
      activeFile.kind === 'heatCapacity' &&
      activeFile.id === activeHeatCapacityGuideFileId &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.runState !== 'running',
    );
    if (desktopExitQuiesced || heatCapacityModeTransitionLocked || runtimeFailureOwnsActiveGuide || guideReminderClockStopped) {
      const remainingMs = getHeatCapacityRefreshRemainingMs(
        guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current,
      );
      if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
        window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
        guideHeatCapacityPendingStrongReminderTimerRef.current = null;
      }
      if (remainingMs !== null) {
        guideHeatCapacityPausedPendingStrongReminderRef.current = {
          controlId: guideHeatCapacityPendingStrongReminderControlIdRef.current,
          remainingMs,
        };
      }
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
      return;
    }
    if (heatCapacityRefreshRestoring) return;
    const pausedReminder = guideHeatCapacityPausedPendingStrongReminderRef.current;
    if (!pausedReminder) return;
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'guide' ||
      activeFile.runState !== 'running' ||
      guideHeatCapacityActiveFileId !== activeFile.id
    ) return;
    guideHeatCapacityPausedPendingStrongReminderRef.current = null;
    scheduleGuideHeatCapacityStrongReminderAfterDelay(
      pausedReminder.controlId,
      pausedReminder.remainingMs,
    );
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    desktopExitQuiesced,
    guideHeatCapacityActiveFileId,
    heatCapacityModeTransitionLocked,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ]);

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

  const showHeatCapacityRecordButtonExit = (kind: HeatCapacityGuideRecordKind) => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
    }
    setHeatCapacityRecordControlsClosing(kind);
    heatCapacityRecordControlsClosingTimerRef.current = window.setTimeout(() => {
      heatCapacityRecordControlsClosingTimerRef.current = null;
      setHeatCapacityRecordControlsClosing(null);
    }, 220);
  };

  const recordHeatCapacityGuideSample = (kind: HeatCapacityGuideRecordKind) => {
    if (activeHeatCapacityModalLocked || heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (!activeFile || activeFile.kind !== 'heatCapacity') return;
    const action = kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2';
    if (!guardGuideHeatCapacityAction(action)) return;
    setHeatCapacityRecordPulseId((pulseId) => pulseId + 1);
    const now = Date.now();
    const currentFile = filesRef.current.find((file) => file.id === activeFile.id);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (currentFile.heatCapacityMode === 'guide') {
      const attempt = applyHeatCapacityGuideRecordWorkbenchState(currentFile, kind, now);
      const message = attempt.accepted
        ? getHeatCapacityRecordSuccessToast(kind)
        : attempt.reason;
      updateFileById(currentFile.id, (file) => (
        file.kind === 'heatCapacity' && file.id === currentFile.id
          ? {
              ...attempt.file,
              pumpHint: attempt.accepted ? attempt.file.pumpHint : message,
              updatedAt: now,
            }
          : file
      ));
      if (attempt.accepted) {
        showHeatCapacityRecordButtonExit(kind);
        setHeatCapacityFocusResetKey((key) => key + 1);
        heatCapacityFocusSessionRef.current = null;
        showHeatCapacityRecordSuccessSequence({
          recordMessage: message,
          trialCompleteMessage: null,
        });
        pushLog(
          (language) => {
            const copy = getHeatCapacityRealtimeCopy(language);
            return kind === 'u0'
              ? copy.recordU0SuccessToast
              : kind === 'u1'
                ? copy.recordU1SuccessToast
                : copy.recordU2SuccessToast;
          },
          'success',
        );
        return;
      }
      showGuideHeatCapacityGuidance(
        message,
        kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2',
        'warning',
        'guide-blocked',
      );
      pushLog(
        (language) => getLocalizedHeatCapacityGuideRecordFailure(currentFile, kind, language, message),
        'warning',
      );
      return;
    }
  };

  const recordFreeHeatCapacitySample = (kind: HeatCapacityGuideRecordKind) => {
    if (activeHeatCapacityModalLocked || heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    setHeatCapacityRecordPulseId((pulseId) => pulseId + 1);
    const now = Date.now();
    const currentFile = filesRef.current.find((file) => file.id === activeFile.id);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    const attempt = applyHeatCapacityFreeRecordWorkbenchState(
      currentFile,
      kind,
      now,
    );
    const message = attempt.accepted
      ? heatCapacityRealtimeCopy.freeRecordSuccessLog[kind]
      : getHeatCapacityFreeRecordRejectMessage(attempt.reason as HeatCapacityFreeRecordRejectReason, heatCapacityRealtimeCopy);
    collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateFileById(currentFile.id, (file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? {
            ...attempt.file,
            pumpHint: attempt.accepted ? attempt.file.pumpHint : message,
            updatedAt: now,
          }
        : file
    ));
    if (attempt.accepted) {
      markHeatCapacityFocusSessionNonReversible();
      clearGuideHeatCapacityGuidance();
      showGuideHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'success');
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).freeRecordSuccessLog[kind],
        'success',
      );
      return;
    }
    clearGuideHeatCapacityGuidance();
    showGuideHeatCapacityGuidance(message, kind === 'u0' ? 'recordU0' : kind === 'u1' ? 'recordU1' : 'recordU2', 'warning', 'guide-blocked');
    pushLog(
      (language) => getHeatCapacityFreeRecordRejectMessage(
        attempt.reason as HeatCapacityFreeRecordRejectReason,
        getHeatCapacityRealtimeCopy(language),
      ),
      'warning',
    );
  };

  const requestRemoveHeatCapacityTrialRecord = (
    trialIndex: number,
    kind: HeatCapacityFreeTrialRecordRemovalKind,
    scheme: HeatCapacityFreeDisplayScheme,
  ) => {
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
      activeFile.heatCapacityFreeExperimentGroups,
    );
    if (
      currentGroup?.status !== 'collecting' ||
      currentGroup.scheme !== scheme ||
      activeFile.heatCapacityFreeExperimentGroups.viewedGroupId !== currentGroup.id
    ) return;
    const pendingMatches = pendingRemoveHeatCapacityTrialRecord?.trialIndex === trialIndex &&
      pendingRemoveHeatCapacityTrialRecord.kind === kind &&
      pendingRemoveHeatCapacityTrialRecord.scheme === scheme;
    const recordLabel = kind === 'u0' ? 'U₀' : kind === 'u1' ? 'U₁' : kind === 'u2' ? 'U₂' : '本组';
    const displayTrialIndex = trialIndex + 1;
    if (!pendingMatches) {
      setPendingRemoveHeatCapacityTrialRecord({ trialIndex, kind, scheme });
      pushLog((language) => {
        const recordSuffix = kind === 'trial' ? '' : ` ${recordLabel}`;
        if (language === 'zh-CN') {
          return `${activeFile.name}: 再次点击确认删除第 ${displayTrialIndex} 次实验的${recordSuffix}记录。`;
        }
        if (language === 'zh-TW') {
          return `${activeFile.name}: 再次點擊確認刪除第 ${displayTrialIndex} 次實驗的${recordSuffix}記錄。`;
        }
        return `${activeFile.name}: Click Confirm Delete again to delete the${recordSuffix} record from trial ${displayTrialIndex}.`;
      }, 'warning');
      return;
    }

    captureUndoSnapshot(`removed heat-capacity ${kind} record`);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      if (file.heatCapacityMode === 'free') {
        return removeHeatCapacityFreeTrialRecordWorkbenchState(file, trialIndex, kind, Date.now(), scheme);
      }
      return file;
    });
    setPendingRemoveHeatCapacityTrialRecord(null);
    pushLog((language) => {
      const recordSuffix = kind === 'trial' ? '' : ` ${recordLabel}`;
      if (language === 'zh-CN') return `${activeFile.name}: 已删除第 ${displayTrialIndex} 次实验的${recordSuffix}记录。`;
      if (language === 'zh-TW') return `${activeFile.name}: 已刪除第 ${displayTrialIndex} 次實驗的${recordSuffix}記錄。`;
      return `${activeFile.name}: Deleted the${recordSuffix} record from trial ${displayTrialIndex}.`;
    });
  };

  const updateHeatCapacityPower = (nextPowerOn?: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const guardedPowerOn = nextPowerOn ?? (currentFile?.kind === 'heatCapacity' ? !currentFile.powerOn : true);
    if (!guardGuideHeatCapacityAction(guardedPowerOn ? 'turnPowerOn' : 'turnPowerOff', source)) return;
    const shouldShowGuidePowerOffCompletionToast = source === 'user' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide' &&
      currentFile.heatCapacityGuideWorkflow.step === 'closePowerRequired' &&
      currentFile.powerOn &&
      guardedPowerOn === false &&
      guideHeatCapacityActiveFileIdRef.current === currentFile.id;
    const shouldShowFreePowerOffCompletionToast = source === 'user' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'free' &&
      shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(currentFile) &&
      currentFile.powerOn &&
      guardedPowerOn === false;
    const freeProgressBeforePowerOff = shouldShowFreePowerOffCompletionToast &&
      currentFile?.kind === 'heatCapacity'
      ? getHeatCapacityFreeBatchProgress(currentFile)
      : null;
    const completedGroupAfterPowerOff = freeProgressBeforePowerOff
      ? freeProgressBeforePowerOff.completedGroupCount + 1
      : null;
    const advancedFreeGroup =
      completedGroupAfterPowerOff !== null &&
      freeProgressBeforePowerOff?.targetGroupCount !== null &&
      completedGroupAfterPowerOff < freeProgressBeforePowerOff.targetGroupCount
        ? { completed: completedGroupAfterPowerOff, next: completedGroupAfterPowerOff + 1 }
        : null;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const resolvedPowerOn = nextPowerOn ?? !file.powerOn;
      let nextFile: WorkbenchHeatCapacityState;
      if (resolvedPowerOn && file.heatCapacityMode === 'demo' && !file.heatCapacityExperimentProfile) {
        const experimentProfile = createHeatCapacityAutoDemoProfile();
        nextFile = powerHeatCapacityWorkbenchFile({
          ...file,
          heatCapacityExperimentSeed: experimentProfile.seed,
          heatCapacityExperimentProfile: experimentProfile,
        }, resolvedPowerOn, now);
      } else {
        nextFile = powerHeatCapacityWorkbenchFile(file, resolvedPowerOn, now);
      }
      if (
        source === 'user' &&
        file.heatCapacityMode === 'free' &&
        shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(file) &&
        file.powerOn &&
        !resolvedPowerOn
      ) {
        const progress = getHeatCapacityFreeBatchProgress(nextFile);
        if (!progress.allGroupsRecorded) {
          nextFile = prepareNextHeatCapacityFreeExperimentWorkbenchState(nextFile, now);
        }
      }
      return nextFile;
    });
    if (advancedFreeGroup) resetHeatCapacityGroupUiRuntime();
    if (shouldShowGuidePowerOffCompletionToast) {
      showHeatCapacityGuidePowerOffCompletionToast();
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).finalTrialCompleteToast,
        'success',
      );
    }
    if (shouldShowFreePowerOffCompletionToast) {
      const completionMessage = advancedFreeGroup
        ? settingsLanguagePreference === 'en'
          ? `Experiment ${advancedFreeGroup.completed} complete. Experiment ${advancedFreeGroup.next} is ready.`
          : settingsLanguagePreference === 'zh-TW'
            ? `第 ${advancedFreeGroup.completed} 次實驗已完成，已進入第 ${advancedFreeGroup.next} 次實驗。`
            : `第 ${advancedFreeGroup.completed} 次实验已完成，已进入第 ${advancedFreeGroup.next} 次实验。`
        : settingsLanguagePreference === 'en'
          ? 'All experiments in this group are complete. Opening data processing.'
          : settingsLanguagePreference === 'zh-TW'
            ? '本組全部實驗已完成，正在進入資料處理。'
            : '本组全部实验已完成，正在进入数据处理。';
      showHeatCapacityFreeGroupCompletionToast(completionMessage);
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).freeGroupCompleteToast,
        'success',
      );
    }
  };

  const showHeatCapacityResetFeedback = (actionId: 'reset-guide') => {
    if (heatCapacityResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityResetFeedbackTimerRef.current);
    }
    setHeatCapacityResetFeedbackActionId(actionId);
    heatCapacityResetFeedbackTimerRef.current = window.setTimeout(() => {
      heatCapacityResetFeedbackTimerRef.current = null;
      setHeatCapacityResetFeedbackActionId(null);
    }, HEAT_CAPACITY_RESET_FEEDBACK_MS);
  };

  const resetHeatCapacityGuideExperiment = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
    showHeatCapacityResetFeedback('reset-guide');
    const now = Date.now();
    const resetFile = startHeatCapacityGuideWorkbenchState(
      clearHeatCapacityModeSession(activeFile, 'guide'),
      now,
    );
    resetHeatCapacitySceneUiState();
    commitHeatCapacityFileProjection(resetFile);
    applyHeatCapacityModeUiProjection(resetFile, null);
    showHeatCapacityAutoDemoCompletionToast(
      heatCapacityRealtimeCopy.guideModeStartingToast,
      HEAT_CAPACITY_GUIDE_START_NOTICE_MS,
    );
  };

  const exitHeatCapacityGuideMode = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const guideCompleted = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityTeachingStatus === 'completed';
    exitHeatCapacityTeachingModeToExplore('guide');
    showHeatCapacityAutoDemoCompletionToast(guideCompleted
      ? heatCapacityRealtimeCopy.teachingModeExitedToast
      : heatCapacityRealtimeCopy.guideModeExitedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).guideModeExitedLog(activeFile.name),
      'warning',
    );
  };

  const exitCompletedHeatCapacityTeachingMode = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.heatCapacityMode === 'demo' || activeFile.heatCapacityMode === 'guide') {
      exitHeatCapacityTeachingModeToExplore(activeFile.heatCapacityMode);
    }
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.teachingModeExitedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).freeModeActiveLog(activeFile.name),
      'info',
    );
  };

  const confirmHeatCapacityFreeBatchSetup = () => {
    if (
      heatCapacityBatchSetupSelection === null ||
      activeFile.kind !== 'heatCapacity'
    ) {
      return;
    }
    if (activeFile.heatCapacityMode === null) {
      if (activateHeatCapacityModeFromExplore('free', heatCapacityBatchSetupSelection)) {
        setHeatCapacityBatchSetupRequestedFileId(null);
      }
      return;
    }
    if (activeFile.heatCapacityMode !== 'free') return;
    const now = Date.now();
    captureUndoSnapshot('configure heat-capacity free batch');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? configureHeatCapacityFreeBatchWorkbenchState(
            file,
            heatCapacityBatchSetupSelection,
            now,
          )
        : file
    ));
    setHeatCapacityBatchSetupRequestedFileId(null);
  };

  const cancelHeatCapacityFreeBatchSetup = () => {
    setHeatCapacityBatchSetupRequestedFileId(null);
    setHeatCapacityBatchSetupSelection(null);
    if (heatCapacityBatchSetupPurpose === 'next') return;
    if (activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free') {
      exitHeatCapacityFormalModeToExplore('free');
    }
  };

  const restartHeatCapacityFreeExperiment = () => {
    if (
      heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'collecting' ||
      heatCapacityCalculationWindowOpen
    ) return;
    const currentExperiment = getHeatCapacityFreeBatchProgress(activeFile).currentGroupNumber;
    if (currentExperiment === null) return;
    const now = Date.now();
    resetHeatCapacityGroupUiRuntime();
    captureUndoSnapshot('restart current heat-capacity experiment');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? restartCurrentHeatCapacityFreeExperimentWorkbenchState(file, now)
        : file
    ));
    pushLog((language) => {
      if (language === 'zh-CN') return `${activeFile.name}：已重新开始第 ${currentExperiment} 次实验。`;
      if (language === 'zh-TW') return `${activeFile.name}：已重新開始第 ${currentExperiment} 次實驗。`;
      return `${activeFile.name}: Restarted experiment ${currentExperiment}.`;
    }, 'warning');
  };

  const requestRestartHeatCapacityFreeExperiment = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'collecting' ||
      heatCapacityCalculationWindowOpen
    ) return;
    const currentExperiment = getHeatCapacityFreeBatchProgress(activeFile).currentGroupNumber;
    if (currentExperiment === null) return;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: `Restart experiment ${currentExperiment}?`,
          body: `Records, traces, and instrument state from experiment ${currentExperiment} will be cleared.`,
          consequence: 'Earlier completed experiments, group parameters, and the target experiment count are preserved. This action can be undone from the Edit menu.',
          cancel: 'Cancel',
          confirm: `Restart experiment ${currentExperiment}`,
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: `重新開始第 ${currentExperiment} 次實驗？`,
            body: `第 ${currentExperiment} 次實驗的記錄、曲線與儀器狀態都會清空。`,
            consequence: '此前已完成的實驗、本組參數與實驗總次數都會保留；可透過「編輯」選單撤銷。',
            cancel: '取消',
            confirm: `重新開始第 ${currentExperiment} 次實驗`,
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: `重新开始第 ${currentExperiment} 次实验？`,
            body: `第 ${currentExperiment} 次实验的记录、曲线和仪器状态都会被清空。`,
            consequence: '此前已完成的实验、本组参数与实验总次数都会保留；可通过“编辑”菜单撤销。',
            cancel: '取消',
            confirm: `重新开始第 ${currentExperiment} 次实验`,
            close: '关闭',
          };
    requestPromptConfirmation({
      id: 'restart-heat-capacity-experiment',
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: restartHeatCapacityFreeExperiment,
    });
  };

  const restartHeatCapacityFreeBatch = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityCalculationWindowOpen ||
      getHeatCapacityFreeBatchProgress(activeFile).allGroupsRecorded
    ) {
      return;
    }
    const now = Date.now();
    resetHeatCapacityGroupUiRuntime();
    if (selectedPanel === 'heatCapacityReview') {
      const nextOpenTab = activeFile.openHeatCapacityTabs.find((tabId) => tabId !== 'review');
      setSelectedPanel(nextOpenTab ? heatCapacityTabIdToPanelKey(nextOpenTab) : 'preview');
    }
    captureUndoSnapshot('restart heat-capacity free batch');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? restartHeatCapacityFreeBatchWorkbenchState(file, now)
        : file
    ));
    setHeatCapacityBatchSetupSelection(null);
  };

  const requestRestartHeatCapacityFreeGroup = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'collecting'
    ) return;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: 'Restart this experiment group?',
          body: 'All recorded experiments and traces in the current group will be cleared.',
          consequence: 'Completed historical groups are preserved. This action can be undone from the Edit menu.',
          cancel: 'Cancel',
          confirm: 'Restart group',
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: '重新開始本組實驗？',
            body: '目前組內已記錄的全部實驗與曲線都會清空。',
            consequence: '已完成的歷史實驗組不受影響；可透過「編輯」選單撤銷。',
            cancel: '取消',
            confirm: '重新開始本組',
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: '重新开始本组实验？',
            body: '当前组内已记录的全部实验与曲线都会被清空。',
            consequence: '已经完成的历史实验组不受影响；可通过“编辑”菜单撤销。',
            cancel: '取消',
            confirm: '重新开始本组',
            close: '关闭',
          };
    requestPromptConfirmation({
      id: 'restart-heat-capacity-experiment-group',
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: restartHeatCapacityFreeBatch,
    });
  };

  const requestAbandonHeatCapacityFreeGroupDraft = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup?.status !== 'draft'
    ) return;
    const copy = settingsLanguagePreference === 'en'
      ? {
          eyebrow: 'Free mode',
          title: 'Abandon this group draft?',
          body: 'The unstarted group draft will be removed.',
          consequence: 'No completed historical group or experiment data will be deleted.',
          cancel: 'Cancel',
          confirm: 'Abandon draft',
          close: 'Close',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            eyebrow: '自由模式',
            title: '放棄本組草稿？',
            body: '這個尚未開始的實驗組草稿將被移除。',
            consequence: '已完成的歷史實驗組與實驗資料都不會被刪除。',
            cancel: '取消',
            confirm: '放棄草稿',
            close: '關閉',
          }
        : {
            eyebrow: '自由模式',
            title: '放弃本组草稿？',
            body: '这个尚未开始的实验组草稿将被移除。',
            consequence: '已完成的历史实验组和实验数据都不会被删除。',
            cancel: '取消',
            confirm: '放弃草稿',
            close: '关闭',
          };
    requestPromptConfirmation({
      id: 'abandon-heat-capacity-experiment-group-draft',
      tone: 'warning',
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      consequence: copy.consequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirm,
      closeLabel: copy.close,
      onConfirm: () => {
        const now = Date.now();
        resetHeatCapacityGroupUiRuntime();
        captureUndoSnapshot('abandon heat-capacity experiment group draft');
        updateActiveFile((file) => (
          file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
            ? abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState(file, now)
            : file
        ));
        setHeatCapacityBatchSetupSelection(null);
      },
    });
  };

  const openNextHeatCapacityFreeExperimentGroupSetup = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityCalculationWindowOpen ||
      (
        activeHeatCapacityCurrentGroup?.status !== 'completed' &&
        activeHeatCapacityCurrentGroup?.status !== 'legacy-incomplete-readonly'
      )
    ) return;
    setHeatCapacityBatchSetupSelection(null);
    setHeatCapacityBatchSetupRequestedFileId(activeFile.id);
  };

  const openFirstHeatCapacityFreeExperimentGroupSetup = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      activeHeatCapacityCurrentGroup !== null ||
      heatCapacityCalculationWindowOpen
    ) return;
    setHeatCapacityBatchSetupSelection(null);
    setHeatCapacityBatchSetupRequestedFileId(activeFile.id);
  };

  const updateHeatCapacityCalculationDraft = (
    fieldId: string,
    draftRaw: string,
  ) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? updateHeatCapacityCalculationDraftWorkbenchState(
            file,
            fieldId,
            draftRaw,
            Date.now(),
          )
        : file
    ));
  };

  const submitHeatCapacityCalculationStep = (stepId: string) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? submitHeatCapacityCalculationStepWorkbenchState(file, stepId, Date.now())
        : file
    ));
  };

  const continueHeatCapacityCalculationAnswer = (fieldId: string) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? continueHeatCapacityCalculationAnswerWorkbenchState(
            file,
            fieldId,
            Date.now(),
          )
        : file
    ));
  };

  const revealHeatCapacityCalculationAnswer = (fieldId: string) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? revealHeatCapacityCalculationAnswerWorkbenchState(
            file,
            fieldId,
            Date.now(),
          )
        : file
    ));
  };

  const selectHeatCapacityCalculationGroup = (groupIndex: number) => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? selectHeatCapacityCalculationGroupWorkbenchState(
            file,
            groupIndex,
            Date.now(),
          )
        : file
    ));
  };

  const selectHeatCapacityCalculationAggregate = () => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? selectHeatCapacityCalculationAggregateWorkbenchState(file, Date.now())
        : file
    ));
  };

  const completeAndExitHeatCapacityCalculation = () => {
    const activeCalculationSession = activeFile.kind === 'heatCapacity'
      ? getHeatCapacityCalculationSession(activeFile)
      : null;
    const completesTutorialGuide = Boolean(
      tutorialActiveRef.current &&
      experienceProfileRef.current.activeTutorialExperiment === 'heatCapacity' &&
      isExperimentTutorialFileId(activeFile.id, 'heatCapacity') &&
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeCalculationSession?.mode === 'guide' &&
      activeCalculationSession.status === 'ready-to-exit',
    );
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? completeHeatCapacityCalculationWorkflowWorkbenchState(file, Date.now())
        : file
    ));
    setHeatCapacityCalculationReviewOpen(false);
    window.setTimeout(() => {
      if (completesTutorialGuide) {
        void completeExperimentLearningTutorial('heatCapacity');
      } else {
        void flushWorkspacePersistenceRef.current();
      }
    }, 0);
  };

  const closeHeatCapacityCalculationReview = () => {
    const session = activeFile.kind === 'heatCapacity'
      ? getHeatCapacityCalculationSession(activeFile)
      : null;
    if (
      session?.status === 'in-progress' &&
      session.presentation === 'interactive'
    ) {
      return;
    }
    setHeatCapacityCalculationReviewOpen(false);
  };

  const continueHeatCapacityInvalidAttempt = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const now = Date.now();
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState(file, now)
      : file);
  };

  const updateHeatCapacityStopcockOpen = (nextOpen?: boolean, source: 'user' | 'autoDemo' = 'user') => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const guardedOpen = nextOpen ?? (
      currentFile?.kind === 'heatCapacity'
        ? getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) !== 'open'
        : true
    );
    const stopcockAction = guardedOpen ? 'openStopcock' : 'closeStopcock';
    if (!guardGuideHeatCapacityAction(stopcockAction, source)) return;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const resolvedOpen = nextOpen ?? getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open';
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuideStopcockOpen(file, resolvedOpen, now);
      }
      if (file.heatCapacityMode === 'free') {
        return setHeatCapacityFreeStopcockOpen(file, resolvedOpen, now);
      }
      if (file.heatCapacityMode === 'demo' || file.heatCapacityMode === null) {
        return setHeatCapacityScriptedStopcockOpen(file, resolvedOpen, now);
      }
      return file;
    });
  };

  const adjustHeatCapacityPressureZeroFineFromScene = (
    direction: number,
    interactionId?: HeatCapacityControlInteractionId,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (rejectHeatCapacityUserInteraction(source)) return false;
    if (!guardGuideHeatCapacityAction('adjustPressureZero', source, interactionId)) return false;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroFine(file, direction, now);
    });
    return true;
  };

  const adjustHeatCapacityPressureZeroCoarseFromScene = (
    angleDeltaDeg: number,
    interactionId?: HeatCapacityControlInteractionId,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (rejectHeatCapacityUserInteraction(source)) return false;
    if (!guardGuideHeatCapacityAction('adjustPressureZero', source, interactionId)) return false;
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      return adjustHeatCapacityPressureZeroCoarse(file, angleDeltaDeg, now);
    });
    return true;
  };

  const updateHeatCapacityPumpValve = (source: 'user' | 'autoDemo' = 'user') => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const nextAction = currentFile?.kind === 'heatCapacity' && currentFile.pumpValveOpen ? 'closePumpValve' : 'openPumpValve';
    if (!guardGuideHeatCapacityAction(nextAction, source)) return;
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const pumpValveOpen = !file.pumpValveOpen;
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuidePumpValveOpen(file, pumpValveOpen, now);
      }
      if (file.heatCapacityMode === 'free') {
        return setHeatCapacityFreePumpValveOpen(file, pumpValveOpen, now);
      }
      const nextFileBase: WorkbenchHeatCapacityState = {
        ...file,
        pumpValveOpen,
        pumpValveState: pumpValveOpen ? 'open' : 'closed',
        pumpHint: pumpValveOpen
          ? heatCapacityRealtimeCopy.pumpHints.pumpValveOpen
          : heatCapacityRealtimeCopy.pumpHints.pumpValveClosed,
        updatedAt: now,
      };
      return nextFileBase;
    });
    if (nextAction === 'closePumpValve') {
      if (heatCapacityClosePumpValveReminderFileIdRef.current === currentFile?.id) {
        clearHeatCapacityClosePumpValveReminder();
      }
      clearHeatCapacityToastBySource(isHeatCapacityPressureToast);
    }
  };

  const clearHeatCapacityPumpAnimationTimers = () => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.releaseTimerId !== null) {
      window.clearTimeout(animationTimers.releaseTimerId);
      animationTimers.releaseTimerId = null;
    }
    if (animationTimers.idleTimerId !== null) {
      window.clearTimeout(animationTimers.idleTimerId);
      animationTimers.idleTimerId = null;
    }
    animationTimers.fileId = null;
    animationTimers.releaseDeadlineAtMs = null;
    animationTimers.idleDeadlineAtMs = null;
    animationTimers.pausedReleaseRemainingMs = null;
    animationTimers.pausedIdleRemainingMs = null;
  };

  const pauseHeatCapacityPumpAnimation = (fileId: string) => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.fileId !== fileId) return;
    const now = Date.now();
    animationTimers.pausedReleaseRemainingMs = animationTimers.releaseDeadlineAtMs === null
      ? animationTimers.pausedReleaseRemainingMs
      : Math.max(0, animationTimers.releaseDeadlineAtMs - now);
    animationTimers.pausedIdleRemainingMs = animationTimers.idleDeadlineAtMs === null
      ? animationTimers.pausedIdleRemainingMs
      : Math.max(0, animationTimers.idleDeadlineAtMs - now);
    if (animationTimers.releaseTimerId !== null) {
      window.clearTimeout(animationTimers.releaseTimerId);
      animationTimers.releaseTimerId = null;
    }
    if (animationTimers.idleTimerId !== null) {
      window.clearTimeout(animationTimers.idleTimerId);
      animationTimers.idleTimerId = null;
    }
    animationTimers.releaseDeadlineAtMs = null;
    animationTimers.idleDeadlineAtMs = null;
  };

  const restorePausedHeatCapacityPumpAnimation = (
    fileId: string,
    releaseRemainingMs: number | null,
    idleRemainingMs: number | null,
  ) => {
    clearHeatCapacityPumpAnimationTimers();
    const animationTimers = heatCapacityPumpAnimationRef.current;
    animationTimers.fileId = fileId;
    animationTimers.pausedReleaseRemainingMs = releaseRemainingMs;
    animationTimers.pausedIdleRemainingMs = idleRemainingMs;
  };

  const scheduleHeatCapacityPumpAnimation = (
    fileId: string,
    releaseDelayMs: number | null,
    idleDelayMs: number | null,
  ) => {
    clearHeatCapacityPumpAnimationTimers();
    const animationTimers = heatCapacityPumpAnimationRef.current;
    animationTimers.fileId = fileId;
    animationTimers.pausedReleaseRemainingMs = null;
    animationTimers.pausedIdleRemainingMs = null;
    if (releaseDelayMs !== null) {
      const normalizedReleaseDelayMs = Math.max(0, releaseDelayMs);
      animationTimers.releaseDeadlineAtMs = Date.now() + normalizedReleaseDelayMs;
      animationTimers.releaseTimerId = window.setTimeout(() => {
        animationTimers.releaseTimerId = null;
        animationTimers.releaseDeadlineAtMs = null;
        if (
          desktopExitQuiescedRef.current ||
          heatCapacityRefreshRestorePendingRef.current ||
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          activeFileIdRef.current !== fileId ||
          animationTimers.fileId !== fileId
        ) return;
        updateFileById(fileId, (file) => file.kind === 'heatCapacity'
          ? { ...file, pumpBulbState: 'releasing', updatedAt: Date.now() }
          : file);
      }, normalizedReleaseDelayMs);
    }
    if (idleDelayMs !== null) {
      const normalizedIdleDelayMs = Math.max(0, idleDelayMs);
      animationTimers.idleDeadlineAtMs = Date.now() + normalizedIdleDelayMs;
      animationTimers.idleTimerId = window.setTimeout(() => {
        animationTimers.idleTimerId = null;
        animationTimers.idleDeadlineAtMs = null;
        if (
          desktopExitQuiescedRef.current ||
          heatCapacityRefreshRestorePendingRef.current ||
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          activeFileIdRef.current !== fileId ||
          animationTimers.fileId !== fileId
        ) return;
        animationTimers.fileId = null;
        updateFileById(fileId, (file) => file.kind === 'heatCapacity'
          ? refreshHeatCapacityPumpFrequency({ ...file, pumpBulbState: 'idle' }, Date.now())
          : file);
      }, normalizedIdleDelayMs);
    }
  };

  const resumeHeatCapacityPumpAnimation = (fileId: string) => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.fileId !== fileId) return;
    const releaseRemainingMs = animationTimers.pausedReleaseRemainingMs;
    const idleRemainingMs = animationTimers.pausedIdleRemainingMs;
    if (releaseRemainingMs === null && idleRemainingMs === null) return;
    scheduleHeatCapacityPumpAnimation(fileId, releaseRemainingMs, idleRemainingMs);
  };

  useEffect(() => {
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.pumpBulbState === 'idle') {
      if (heatCapacityPumpAnimationRef.current.fileId === activeFile.id) {
        clearHeatCapacityPumpAnimationTimers();
      }
      return;
    }
    const timeFrozen = heatCapacityRefreshRestoring ||
      activeFile.runState === 'paused' ||
      heatCapacityLessonDialogActive ||
      autoDemoPaused ||
      (activeFile.heatCapacityMode === 'guide' && activeFile.heatCapacityGuideWorkflow.paused);
    if (timeFrozen) {
      pauseHeatCapacityPumpAnimation(activeFile.id);
      return;
    }
    resumeHeatCapacityPumpAnimation(activeFile.id);
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.paused : false,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.pumpBulbState : null,
    activeFile.runState,
    autoDemoPaused,
    heatCapacityLessonDialogActive,
    heatCapacityRefreshRestoring,
  ]);

  const cancelHeatCapacityAutoDemoLockedPointerToast = () => {
    if (heatCapacityAutoDemoLockedPointerToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoLockedPointerToastTimerRef.current);
      heatCapacityAutoDemoLockedPointerToastTimerRef.current = null;
    }
  };

  const clearHeatCapacityAutoDemoTimers = () => {
    heatCapacityAutoDemoTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityAutoDemoTimersRef.current = [];
    cancelHeatCapacityAutoDemoLockedPointerToast();
  };

  const showHeatCapacityAutoDemoLockedToast = (message: string = heatCapacityRealtimeCopy.autoDemoLockedToast) => {
    if (activeHeatCapacityModalLocked) return;
    cancelHeatCapacityAutoDemoLockedPointerToast();
    const now = Date.now();
    const lastShown = heatCapacityAutoDemoLockedToastLastShownRef.current;
    if (
      lastShown &&
      lastShown.message === message &&
      now - lastShown.at < HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS
    ) {
      return;
    }
    heatCapacityAutoDemoLockedToastLastShownRef.current = { message, at: now };
    showHeatCapacityToast(message, 'warning');
  };

  const scheduleHeatCapacityAutoDemoLockedPointerToast = () => {
    cancelHeatCapacityAutoDemoLockedPointerToast();
    heatCapacityAutoDemoLockedPointerToastTimerRef.current = window.setTimeout(() => {
      heatCapacityAutoDemoLockedPointerToastTimerRef.current = null;
      showHeatCapacityAutoDemoLockedToast();
    }, HEAT_CAPACITY_AUTO_DEMO_LOCKED_POINTER_FALLBACK_MS);
  };

  const showHeatCapacityTeachingCompletedLockedInteraction = (
    message?: string,
    control?: HeatCapacityInstrumentControl,
  ) => {
    const fallbackMessage = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'guide'
      ? heatCapacityRealtimeCopy.guideCompletedLockedToast
      : heatCapacityRealtimeCopy.autoDemoCompletedLockedToast;
    const rollbackAnimation = control
      ? getHeatCapacityGuideRollbackAnimationForControl(control)
      : null;
    if (rollbackAnimation) {
      setGuideHeatCapacityRollback((previous) => ({
        animation: rollbackAnimation,
        key: Math.max(Date.now(), (previous?.key ?? 0) + 1),
      }));
    }
    showHeatCapacityAutoDemoLockedToast(message ?? fallbackMessage);
  };

  const scheduleHeatCapacityAutoDemoCompletionToastExpiry = (delayMs: number) => {
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
    }
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityAutoDemoCompleteToastTimerGenerationRef.current;
    heatCapacityAutoDemoCompleteToastPausedRef.current = null;
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityAutoDemoCompleteToastTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityAutoDemoCompleteToastTimerGenerationRef.current) return;
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
      heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
      setAutoDemoCompletionMessage(null);
    }, normalizedDelayMs);
  };

  const showHeatCapacityAutoDemoCompletionToast = (message: string = heatCapacityRealtimeCopy.autoDemoCompletionToast, durationMs = 3000) => {
    setAutoDemoCompletionMessage(message);
    scheduleHeatCapacityAutoDemoCompletionToastExpiry(durationMs);
  };

  const scheduleHeatCapacityAutoDemoStepPanelHide = (delayMs: number) => {
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
    }
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityAutoDemoStepPanelTimerGenerationRef.current;
    heatCapacityAutoDemoStepPanelPausedRef.current = null;
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityAutoDemoStepPanelTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityAutoDemoStepPanelTimerGenerationRef.current) return;
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
      heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
      setAutoDemoStepPanelMode('hidden');
    }, normalizedDelayMs);
  };

  const showHeatCapacityAutoDemoStepPanel = () => {
    heatCapacityAutoDemoStepPanelTimerGenerationRef.current += 1;
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
    heatCapacityAutoDemoStepPanelPausedRef.current = null;
    setAutoDemoStepPanelMode('visible');
  };

  const hideHeatCapacityAutoDemoStepPanel = () => {
    setAutoDemoStepPanelMode((currentMode) => (currentMode === 'hidden' ? 'hidden' : 'exiting'));
    scheduleHeatCapacityAutoDemoStepPanelHide(HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS);
  };

  const setHeatCapacityAutoDemoCameraFocus = (mode: Exclude<HeatCapacityFocusMode, 'none'> | null) => {
    if (demoCameraFocusModeRef.current === mode) return;
    demoCameraFocusModeRef.current = mode;
    setDemoCameraFocusMode(mode);
    if (mode) {
      setDemoCameraFocusKey((key) => key + 1);
      return;
    }
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const clearHeatCapacityAutoDemoUiState = () => {
    cancelHeatCapacityAutoDemoLockedPointerToast();
    heatCapacityAutoDemoCompleteToastTimerGenerationRef.current += 1;
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
    }
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
    heatCapacityAutoDemoCompleteToastPausedRef.current = null;
    heatCapacityAutoDemoStepPanelTimerGenerationRef.current += 1;
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
    heatCapacityAutoDemoStepPanelPausedRef.current = null;
    setAutoDemoPhase('idle');
    setAutoDemoCompletionMessage(null);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    setHeatCapacityAutoDemoCameraFocus(null);
    setAutoDemoStepIndex(0);
    setAutoDemoStepCount(0);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    heatCapacityAutoDemoFileIdRef.current = null;
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = 0;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = -1;
    heatCapacityAutoDemoExecutedItemKeysRef.current.clear();
    heatCapacityAutoDemoTimelineRef.current = [];
  };

  const pauseHeatCapacityTransientUiTimers = (fileId: string) => {
    const toastRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityToastDeadlineAtMsRef.current,
    );
    if (heatCapacityToastCurrentRef.current && toastRemainingMs !== null) {
      heatCapacityToastPausedRef.current = { fileId, remainingMs: toastRemainingMs };
      heatCapacityToastTimerGenerationRef.current += 1;
      if (heatCapacityToastTimerRef.current !== null) {
        window.clearTimeout(heatCapacityToastTimerRef.current);
        heatCapacityToastTimerRef.current = null;
      }
      heatCapacityToastDeadlineAtMsRef.current = null;
    }

    const recordReleaseRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current,
    );
    if (recordReleaseRemainingMs !== null) {
      heatCapacityRecordSuccessPausedRef.current = {
        fileId,
        followUpMessage: heatCapacityRecordSuccessFollowUpMessageRef.current,
        followUpRemainingMs: getHeatCapacityRefreshRemainingMs(
          heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current,
        ),
        releaseRemainingMs: recordReleaseRemainingMs,
      };
      heatCapacityRecordSuccessTimerGenerationRef.current += 1;
      heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      heatCapacityRecordSuccessToastTimersRef.current = [];
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = null;
    }

    const completionRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current,
    );
    if (completionRemainingMs !== null) {
      heatCapacityAutoDemoCompleteToastPausedRef.current = {
        fileId,
        remainingMs: completionRemainingMs,
      };
      heatCapacityAutoDemoCompleteToastTimerGenerationRef.current += 1;
      if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
        window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
        heatCapacityAutoDemoCompleteToastTimerRef.current = null;
      }
      heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
    }

    const stepPanelRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current,
    );
    if (stepPanelRemainingMs !== null) {
      heatCapacityAutoDemoStepPanelPausedRef.current = {
        fileId,
        remainingMs: stepPanelRemainingMs,
      };
      heatCapacityAutoDemoStepPanelTimerGenerationRef.current += 1;
      if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
        window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
        heatCapacityAutoDemoStepPanelTimerRef.current = null;
      }
      heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
    }

    const lessonCloseRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityGuideLessonCloseDeadlineAtMsRef.current,
    );
    if (lessonCloseRemainingMs !== null) {
      heatCapacityGuideLessonClosePausedRef.current = {
        fileId,
        remainingMs: lessonCloseRemainingMs,
        shouldResumeAutoDemo: heatCapacityGuideLessonCloseShouldResumeDemoRef.current,
      };
      heatCapacityGuideLessonCloseTimerGenerationRef.current += 1;
      if (heatCapacityGuideLessonCloseTimerRef.current !== null) {
        window.clearTimeout(heatCapacityGuideLessonCloseTimerRef.current);
        heatCapacityGuideLessonCloseTimerRef.current = null;
      }
      heatCapacityGuideLessonCloseDeadlineAtMsRef.current = null;
    }
  };

  const resumeHeatCapacityTransientUiTimers = (fileId: string) => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null ||
      activeFileIdRef.current !== fileId
    ) return;

    const pausedToast = heatCapacityToastPausedRef.current;
    if (pausedToast?.fileId === fileId && heatCapacityToastCurrentRef.current) {
      scheduleHeatCapacityToastAdvance(pausedToast.remainingMs);
    }

    const pausedRecordSequence = heatCapacityRecordSuccessPausedRef.current;
    if (pausedRecordSequence?.fileId === fileId) {
      scheduleHeatCapacityRecordSuccessToastTimers(
        pausedRecordSequence.followUpMessage,
        pausedRecordSequence.followUpRemainingMs,
        pausedRecordSequence.releaseRemainingMs,
      );
    }

    const pausedCompletionToast = heatCapacityAutoDemoCompleteToastPausedRef.current;
    if (pausedCompletionToast?.fileId === fileId && autoDemoCompletionMessage) {
      scheduleHeatCapacityAutoDemoCompletionToastExpiry(pausedCompletionToast.remainingMs);
    }

    const pausedStepPanel = heatCapacityAutoDemoStepPanelPausedRef.current;
    if (pausedStepPanel?.fileId === fileId) {
      scheduleHeatCapacityAutoDemoStepPanelHide(pausedStepPanel.remainingMs);
    }

    const pausedLessonClose = heatCapacityGuideLessonClosePausedRef.current;
    if (pausedLessonClose?.fileId === fileId) {
      scheduleHeatCapacityGuideLessonClose(
        fileId,
        pausedLessonClose.shouldResumeAutoDemo,
        pausedLessonClose.remainingMs,
      );
    }
  };

  const isHeatCapacityUserInteractionLocked = (source: 'user' | 'autoDemo' = 'user') => (
    source !== 'autoDemo' && (
      autoDemoInteractionLocked ||
      activeHeatCapacityModalLocked ||
      heatCapacityRuntimeFailureFileIdRef.current === activeFileIdRef.current ||
      heatCapacityModeTransitionStateRef.current.phase !== 'idle'
    )
  );

  const rejectHeatCapacityUserInteraction = (source: 'user' | 'autoDemo' = 'user') => {
    if (!isHeatCapacityUserInteractionLocked(source)) return false;
    if (heatCapacityModeTransitionStateRef.current.phase === 'idle') {
      showHeatCapacityAutoDemoLockedToast();
    }
    return true;
  };

  const pressHeatCapacityPumpBulb = (
    fileId = activeFileIdRef.current,
    source: 'user' | 'autoDemo' = 'user',
  ) => {
    if (rejectHeatCapacityUserInteraction(source)) return;
    if (source !== 'autoDemo' && heatCapacitySceneFocusModeRef.current !== 'pump') return;
    const fileBeforePump = filesRef.current.find((file) => file.id === fileId);
    if (source !== 'autoDemo' && fileId === activeFileIdRef.current && !guardGuideHeatCapacityAction('pumpBulb', source)) return;
    const now = Date.now();
    let nextHeatCapacityFile = fileBeforePump?.kind === 'heatCapacity'
      ? registerHeatCapacityPumpStroke(fileBeforePump, now)
      : null;
    const guidePumpTargetReached = Boolean(
      source !== 'autoDemo' &&
      nextHeatCapacityFile?.kind === 'heatCapacity' &&
      nextHeatCapacityFile.heatCapacityMode === 'guide' &&
      nextHeatCapacityFile.heatCapacityGuideWorkflow.step === 'closePumpValveRequired' &&
      getGuideHeatCapacityDisplayedPressureMv(nextHeatCapacityFile) >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
    );
    if (source === 'user' && nextHeatCapacityFile) {
      collapseHeatCapacityFreeParameterSidebarForExperimentAction();
      markHeatCapacityFocusSessionNonReversible();
    }
    const pressureStatusBeforePump = fileBeforePump?.kind === 'heatCapacity'
      ? getHeatCapacityPressureSafetyStatusFromMv(getGuideHeatCapacityThresholdPressureMv(fileBeforePump), fileBeforePump)
      : 'normal';
    if (
      source === 'autoDemo' &&
      nextHeatCapacityFile &&
      getGuideHeatCapacityThresholdPressureMv(nextHeatCapacityFile) >= (
        getHeatCapacityPressureThresholdsMv(nextHeatCapacityFile).pressureDangerThresholdMv
      )
    ) {
      return;
    }
    const electronicPressureFeedbackReady = fileBeforePump?.kind === 'heatCapacity' &&
      fileBeforePump.powerOn &&
      (fileBeforePump.heatCapacityMode !== 'free' || fileBeforePump.heatCapacityFreePreheatCompleted);
    if (source !== 'autoDemo' && fileBeforePump?.kind === 'heatCapacity' && electronicPressureFeedbackReady) {
      const pressureBeforePumpMv = getGuideHeatCapacityThresholdPressureMv(fileBeforePump);
      if (
        pressureBeforePumpMv >= getHeatCapacityPressureThresholdsMv(fileBeforePump).pressureDangerThresholdMv
      ) {
        showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureAlarmMessage, 'pressureAlarm');
      }
      const nextFrequencyState = getHeatCapacityPumpFrequencyState(
        [...fileBeforePump.pumpStrokeTimestamps, now],
        now,
      );
      if (
        fileBeforePump.heatCapacityPhase === 'pumping' &&
        nextFrequencyState.timestamps.length >= 2 &&
        nextFrequencyState.pumpFrequencyStatus === 'tooSlow'
      ) {
        showHeatCapacityToast(heatCapacityRealtimeCopy.pumpFrequencySlowToast, 'warning');
      }
    }
    setHeatCapacityPumpPulseId((pulseId) => pulseId + 1);
    clearHeatCapacityPumpAnimationTimers();
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      return nextHeatCapacityFile;
    });
    if (
      source !== 'autoDemo' &&
      nextHeatCapacityFile &&
      !guidePumpTargetReached &&
      nextHeatCapacityFile.powerOn &&
      (nextHeatCapacityFile.heatCapacityMode !== 'free' || nextHeatCapacityFile.heatCapacityFreePreheatCompleted)
    ) {
      const pressureAfterPumpMv = getGuideHeatCapacityThresholdPressureMv(nextHeatCapacityFile);
      const pressureStatusAfterPump = getHeatCapacityPressureSafetyStatusFromMv(pressureAfterPumpMv, nextHeatCapacityFile);
      if (pressureStatusAfterPump === 'danger' && pressureStatusBeforePump !== 'danger') {
        showHeatCapacityPressureAlarm(nextHeatCapacityFile.id, nextHeatCapacityFile.name);
      } else if (pressureStatusAfterPump === 'warning') {
        showHeatCapacityPolicyToast(heatCapacityRealtimeCopy.pressureWarningMessage, 'pressureWarning');
      } else if (pressureStatusAfterPump === 'danger') {
        showHeatCapacityPressureThresholdToast(pressureAfterPumpMv, nextHeatCapacityFile);
      }
    }
    if (guidePumpTargetReached && nextHeatCapacityFile) {
      exitHeatCapacityFocusMode();
      const guidance = getGuideStepGuidance('closePumpValveRequired', nextHeatCapacityFile);
      showGuideHeatCapacityGuidance(guidance.message, 'pumpValve', 'info', 'guide');
    }
    scheduleHeatCapacityPumpAnimation(fileId, 120, 360);
  };

  const setHeatCapacityStopcockOpenByFileId = (
    fileId: string,
    nextOpen: boolean,
  ) => {
    const now = Date.now();
    const stopcockAngleDeg = getHeatCapacityStopcockTargetAngle(nextOpen);
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      if (file.heatCapacityMode === 'guide') {
        return setHeatCapacityGuideStopcockOpen(file, nextOpen, now);
      }
      if (file.heatCapacityMode === 'free') {
        return setHeatCapacityFreeStopcockOpen(file, nextOpen, now);
      }
      if (file.heatCapacityMode === 'demo') {
        return setHeatCapacityScriptedStopcockOpen(file, nextOpen, now);
      }
      return stepHeatCapacityWorkbenchFile({
        ...file,
        stopcockAngleDeg,
        glassPistonState: nextOpen ? 'open' : 'closed',
        updatedAt: now,
      }, now);
    });
  };

  const commitHeatCapacityAutoDemoPressureZero = (fileId: string) => {
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const targetOffset = -(file.pressureSignalMvRaw + file.pressureInitialBiasMv);
      const targetKnobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(targetOffset);
      const zeroedFile = setHeatCapacityPressureZeroOffset(file, targetOffset, 'fineWheel', targetKnobAngle, now);
      const zeroPressureValue = zeroedFile.pressureSignalMv ?? 0;
      const pressureZeroDisplayedSamples = Array.from({ length: 5 }, (_item, index) => ({
        atMs: now - (4 - index) * 100,
        valueMv: zeroPressureValue,
      }));
      return {
        ...zeroedFile,
        pressureZeroDisplayedSamples,
        pressureZeroed: isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples),
      };
    });
  };

  const commitHeatCapacityAutoDemoDefaultReset = (fileId: string) => {
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      return {
        ...prepareHeatCapacityAutoDemoReset(file, now),
        pumpHint: heatCapacityRealtimeCopy.autoDemoPreparingHint,
      };
    });
  };

  const applyHeatCapacityAutoDemoAction = (
    fileId: string,
    action: HeatCapacityAutoDemoAction,
    sampleKey?: Parameters<typeof captureHeatCapacityWorkbenchSample>[1],
    onDeferredComplete?: () => void,
  ): boolean => {
    const now = Date.now();
    if (action === 'pumpStroke') {
      pressHeatCapacityPumpBulb(fileId, 'autoDemo');
      return true;
    }

    if (action === 'closeStopcockForPumping' || action === 'closeStopcockForRecovery') {
      setHeatCapacityStopcockOpenByFileId(fileId, false);
      return true;
    }

    if (action === 'openStopcockForRelease' || action === 'openStopcockForZero') {
      setHeatCapacityStopcockOpenByFileId(fileId, true);
      return true;
    }

    if (action === 'zeroPressure') {
      commitHeatCapacityAutoDemoPressureZero(fileId);
      return true;
    }

    if (action === 'captureSample' && sampleKey === 'zeroedSample') {
      const latestFile = filesRef.current.find((file) => file.id === fileId);
      if (
        !latestFile ||
        latestFile.kind !== 'heatCapacity' ||
        heatCapacityAutoDemoFileIdRef.current !== fileId
      ) {
        return false;
      }
      if (!isGuideU0ZeroReady(latestFile)) {
        const retryTimer = window.setTimeout(() => {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== retryTimer);
          if (applyHeatCapacityAutoDemoAction(fileId, 'captureSample', 'zeroedSample', onDeferredComplete)) {
            onDeferredComplete?.();
          }
        }, 180);
        heatCapacityAutoDemoTimersRef.current.push(retryTimer);
        return false;
      }
    }

    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;

      if (action === 'powerOn') {
        return prepareHeatCapacityAutoDemoStart(file, now);
      }

      if (action === 'openPumpValve') {
        return {
          ...setHeatCapacityScriptedPumpValveOpen(file, true, now),
          pumpHint: heatCapacityRealtimeCopy.pumpHints.pumpValveOpen,
        };
      }

      if (action === 'closePumpValve') {
        return {
          ...setHeatCapacityScriptedPumpValveOpen(file, false, now),
          pumpHint: heatCapacityRealtimeCopy.pumpHints.pumpValveClosed,
        };
      }

      if (action === 'captureSample' && sampleKey) {
        return captureHeatCapacityWorkbenchSample(file, sampleKey, now);
      }

      if (action === 'observeInitialPressure') {
        return {
          ...file,
          pumpHint: heatCapacityRealtimeCopy.pumpHints.observeInitialPressure,
          updatedAt: now,
        };
      }

      if (action === 'powerOff') {
        return {
          ...powerHeatCapacityWorkbenchFile(file, false, now),
          runState: 'running' as const,
          pumpHint: heatCapacityRealtimeCopy.autoDemoReadyToCompleteHint,
        };
      }

      if (action === 'completeTeachingMode') {
        const completedFile = completeHeatCapacityTeachingModeWorkbenchState(file, now);
        window.setTimeout(() => {
          pushLog(
            (language) => getHeatCapacityRealtimeCopy(language).autoDemoImportedCompleteLog(completedFile.name),
            'success',
          );
        }, 0);
        return {
          ...completedFile,
          heatCapacityMaterialsExpanded: true,
          updatedAt: now,
        };
      }

      return file;
    });
    return true;
  };

  const setHeatCapacityAutoDemoStepState = (
    step: HeatCapacityAutoDemoStep,
    stepIndex: number,
    stage: HeatCapacityAutoDemoTimelineItem['stage'],
    focusControlId?: HeatCapacityAutoDemoTimelineItem['focusControlId'],
    cameraFocusMode?: HeatCapacityAutoDemoTimelineItem['cameraFocusMode'],
  ) => {
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoStepIndex(stepIndex + 1);
    setAutoDemoStepTitle(step.title);
    setAutoDemoStepDescription(stage === 'preview'
      ? `下一步：${step.description}`
      : stage === 'highlight'
      ? `即将操作：${step.description}`
      : stage === 'action'
        ? step.description
        : `观察：${step.note}`);
    setAutoDemoStepTarget(step.target);
    setAutoDemoStepProgressCriterion(step.progressCriterion);
    setAutoDemoStepNote(step.note);
    const nextFocusControlId = focusControlId ?? step.targetControlId ?? null;
    setDemoFocusControlId(stage === 'highlight' ? nextFocusControlId : null);
    setDemoFocusPulseActive(stage === 'highlight' && Boolean(nextFocusControlId));
    if (stage === 'highlight' || stage === 'action') {
      const nextDemoCameraFocusMode = mapHeatCapacityAutoDemoCameraFocusMode(cameraFocusMode);
      if (nextDemoCameraFocusMode) {
        setHeatCapacityAutoDemoCameraFocus(nextDemoCameraFocusMode);
      }
    }
  };

  const finishHeatCapacityAutoDemoUi = (message: string = heatCapacityRealtimeCopy.autoDemoCompletionToast) => {
    clearHeatCapacityAutoDemoTimers();
    setAutoDemoPhase('idle');
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    setHeatCapacityAutoDemoCameraFocus(null);
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast(message);
  };

  const scheduleHeatCapacityAutoDemoTimeline = (
    demoFileId: string,
    timeline: HeatCapacityAutoDemoTimelineItem[],
    startFromElapsedMs = 0,
    initialDelayMs = 0,
  ) => {
    heatCapacityAutoDemoStartedAtMsRef.current = performance.now() + initialDelayMs - startFromElapsedMs;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = Math.max(0, initialDelayMs);
    heatCapacityAutoDemoFileIdRef.current = demoFileId;
    heatCapacityAutoDemoTimelineRef.current = timeline;

    timeline.forEach((timelineItem, timelineIndex) => {
      const timelineItemKey = getHeatCapacityAutoDemoTimelineItemKey(timelineItem, timelineIndex);
      if (heatCapacityAutoDemoExecutedItemKeysRef.current.has(timelineItemKey)) return;
      const timerId = window.setTimeout(() => {
        if (
          desktopExitQuiescedRef.current ||
          heatCapacityRefreshRestorePendingRef.current ||
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          activeFileIdRef.current !== demoFileId ||
          heatCapacityAutoDemoFileIdRef.current !== demoFileId
        ) {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
          return;
        }
        if (heatCapacityAutoDemoExecutedItemKeysRef.current.has(timelineItemKey)) {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
          return;
        }
        heatCapacityAutoDemoInitialDelayRemainingMsRef.current = 0;
        const markTimelineItemExecuted = () => {
          heatCapacityAutoDemoExecutedItemKeysRef.current.add(timelineItemKey);
          heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = Math.max(
            heatCapacityAutoDemoLastProcessedTimelineIndexRef.current,
            timelineIndex,
          );
        };
        const shouldApplyTimelineUi = timelineIndex >= heatCapacityAutoDemoLastProcessedTimelineIndexRef.current;
        if (shouldApplyTimelineUi) {
          setHeatCapacityAutoDemoStepState(
            timelineItem.step,
            timelineItem.stepIndex,
            timelineItem.stage,
            timelineItem.focusControlId,
            timelineItem.cameraFocusMode,
          );
          if (timelineItem.stage === 'preview') {
            setDemoFocusPulseActive(false);
          }
        }
        let actionCompleted = true;
        if (timelineItem.stage === 'action' && timelineItem.action) {
          actionCompleted = applyHeatCapacityAutoDemoAction(
            demoFileId,
            timelineItem.action.action,
            timelineItem.action.sampleKey,
            markTimelineItemExecuted,
          );
          if (actionCompleted && timelineItem.action.action === 'completeTeachingMode') {
            markTimelineItemExecuted();
            setSelectedPanel('heatCapacityRecords');
            finishHeatCapacityAutoDemoUi();
          }
        }
        if (actionCompleted) markTimelineItemExecuted();
        if (shouldApplyTimelineUi && timelineItem.stage !== 'highlight') setDemoFocusPulseActive(false);
        heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
      }, Math.max(0, initialDelayMs + timelineItem.atMs - startFromElapsedMs));
      heatCapacityAutoDemoTimersRef.current.push(timerId);
    });
  };

  const startHeatCapacityAutoDemoUi = (
    demoFileId: string,
    demoFileName: string,
    deferTimelineUntilModeTransitionCommit = false,
  ) => {
    clearHeatCapacityAutoDemoTimers();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityActiveFileId(null);
    setHeatCapacityAutoDemoCameraFocus(null);
    clearHeatCapacityPressureAlertUiState();
    const steps = createHeatCapacityAutoDemoSteps();
    const timeline = getHeatCapacityAutoDemoTimeline(steps);
    setHeatCapacityFocusResetKey((key) => key + 1);
    setHeatCapacityHardSphereVisualResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = HEAT_CAPACITY_AUTO_DEMO_RESET_MS;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = -1;
    heatCapacityAutoDemoExecutedItemKeysRef.current.clear();
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    const now = Date.now();
    updateFileById(demoFileId, (file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          powerOn: false,
          runState: 'running',
          pumpValveOpen: false,
          pumpValveState: 'closed',
          pumpBulbState: 'idle',
          pumpHint: heatCapacityRealtimeCopy.autoDemoPreparingHint,
          updatedAt: now,
        }
      : file);
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoPhase('running');
    setAutoDemoStepCount(steps.length);
    setAutoDemoStepIndex(0);
    setAutoDemoStepTitle(heatCapacityRealtimeCopy.autoDemoPreparingTitle);
    setAutoDemoStepDescription(heatCapacityRealtimeCopy.autoDemoInitializingDescription);
    setAutoDemoStepTarget(heatCapacityRealtimeCopy.autoDemoPreparingTarget);
    setAutoDemoStepProgressCriterion(heatCapacityRealtimeCopy.autoDemoPreparingProgress);
    setAutoDemoStepNote(heatCapacityRealtimeCopy.autoDemoPreparingNote);
    clearHeatCapacityToastQueue();
    setAutoDemoCompletionMessage(null);
    setSelectedPanel('preview');
    showHeatCapacityAutoDemoCompletionToast(
      heatCapacityRealtimeCopy.autoDemoInitializingToast,
      HEAT_CAPACITY_AUTO_DEMO_RESET_MS,
    );
    commitHeatCapacityAutoDemoDefaultReset(demoFileId);
    if (deferTimelineUntilModeTransitionCommit) {
      heatCapacityAutoDemoFileIdRef.current = demoFileId;
      heatCapacityAutoDemoTimelineRef.current = timeline;
      heatCapacityAutoDemoStartedAtMsRef.current = performance.now() + HEAT_CAPACITY_AUTO_DEMO_RESET_MS;
      heatCapacityModeTransitionDemoClockRef.current = {
        fileId: demoFileId,
        elapsedMs: 0,
        initialDelayRemainingMs: HEAT_CAPACITY_AUTO_DEMO_RESET_MS,
      };
    } else {
      heatCapacityModeTransitionDemoClockRef.current = null;
      scheduleHeatCapacityAutoDemoTimeline(demoFileId, timeline, 0, HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    }
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).autoDemoStartedLog(demoFileName),
      'success',
    );
  };

  const runHeatCapacityAutoDemo = () => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    if (activeFile.kind !== 'heatCapacity') return;
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();

    if (autoDemoPaused && activeFile.runState === 'paused' && heatCapacityAutoDemoPausedFileIdRef.current === activeFile.id) {
      clearHeatCapacityAutoDemoTimers();
      showHeatCapacityAutoDemoStepPanel();
      setAutoDemoPhase('running');
      updateActiveFile((file) => file.kind === 'heatCapacity'
        ? {
            ...file,
            runState: 'running',
            lastUpdateMs: Date.now(),
            displayResponseLastUpdateMs: Date.now(),
            updatedAt: Date.now(),
          }
        : file);
      scheduleHeatCapacityAutoDemoTimeline(
        activeFile.id,
        heatCapacityAutoDemoTimelineRef.current,
        heatCapacityAutoDemoPausedElapsedMsRef.current,
        heatCapacityAutoDemoInitialDelayRemainingMsRef.current,
      );
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).autoDemoResumedLog(activeFile.name),
        'success',
      );
      return;
    }

    if (autoDemoInteractionLocked || activeFile.runState === 'running') {
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).autoDemoRunningLog(activeFile.name),
        'warning',
      );
      return;
    }

    if (activeFile.heatCapacityMode !== 'demo') {
      if (activeFile.heatCapacityMode === null) {
        activateHeatCapacityModeFromExplore('demo');
      } else {
        switchHeatCapacityMode(
          'demo',
          'mode-control',
        );
      }
      return;
    }

    startHeatCapacityAutoDemoUi(activeFile.id, activeFile.name);
  };

  const getHeatCapacityRefreshRemainingMs = (deadlineAtMs: number | null) => (
    deadlineAtMs === null ? null : Math.max(0, deadlineAtMs - Date.now())
  );

  const resolveDeferredHeatCapacityGuideUiCheckpoint = (
    file: WorkbenchHeatCapacityState,
  ): HeatCapacityModeGuideCheckpoint | null => {
    if (file.heatCapacityMode !== 'guide') return null;
    const pendingRestore = pendingHeatCapacityGuideUiRestoreRef.current;
    if (pendingRestore?.fileId === file.id) return pendingRestore.checkpoint;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase !== 'animating' || transition.visibleMode !== 'guide') return null;
    const storedCheckpoint = file.heatCapacityModeSessions.guide.uiCheckpoint;
    return storedCheckpoint?.fileId === file.id && storedCheckpoint.mode === 'guide'
      ? storedCheckpoint.payload.guide
      : null;
  };

  const captureHeatCapacityDemoUiCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
  ): {
    demo: HeatCapacityModeDemoCheckpoint;
    modeTransitionDemoClock: WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock'];
  } => {
    const timeline = heatCapacityAutoDemoTimelineRef.current;
    const lastProcessedTimelineIndex = Math.min(
      timeline.length - 1,
      heatCapacityAutoDemoLastProcessedTimelineIndexRef.current,
    );
    const currentTimelineItem = lastProcessedTimelineIndex >= 0
      ? timeline[lastProcessedTimelineIndex] ?? null
      : null;
    const modeTransitionDemoClock = heatCapacityModeTransitionDemoClockRef.current?.fileId === currentFile.id
      ? heatCapacityModeTransitionDemoClockRef.current
      : null;
    const desktopExitDemoClock = desktopExitQuiescedRef.current &&
      desktopExitAutoDemoClockRef.current?.fileId === currentFile.id
      ? desktopExitAutoDemoClockRef.current
      : null;
    const restoringDemo = heatCapacityRefreshRestorePendingRef.current &&
      initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === currentFile.id &&
      initialHeatCapacityRefreshSession.mode === 'demo';
    const initialDelayRemainingMs = desktopExitDemoClock
      ? desktopExitDemoClock.initialDelayRemainingMs
      : modeTransitionDemoClock
        ? modeTransitionDemoClock.initialDelayRemainingMs
      : restoringDemo
        ? initialHeatCapacityRefreshSession.demo.initialDelayRemainingMs
        : autoDemoPhase === 'running'
          ? Math.max(0, heatCapacityAutoDemoStartedAtMsRef.current - performance.now())
          : heatCapacityAutoDemoInitialDelayRemainingMsRef.current;
    const elapsedMs = desktopExitDemoClock
      ? desktopExitDemoClock.elapsedMs
      : modeTransitionDemoClock
        ? modeTransitionDemoClock.elapsedMs
      : restoringDemo
        ? initialHeatCapacityRefreshSession.demo.elapsedMs
        : autoDemoPhase === 'running'
          ? initialDelayRemainingMs > 0
            ? 0
            : Math.max(0, performance.now() - heatCapacityAutoDemoStartedAtMsRef.current)
          : heatCapacityAutoDemoPausedElapsedMsRef.current;
    const pauseReasons: HeatCapacityModePauseReason[] = [];
    if (autoDemoPhase === 'paused') {
      pauseReasons.push(
        heatCapacityGuideLessonDialog && heatCapacityLessonAutoResumeDemoRef.current
          ? 'lesson-dialog'
          : 'user',
      );
    }
    return {
      modeTransitionDemoClock,
      demo: {
        phase: currentFile.heatCapacityMode === 'demo' ? autoDemoPhase : 'idle',
        elapsedMs: currentFile.heatCapacityMode === 'demo' ? elapsedMs : 0,
        initialDelayRemainingMs: currentFile.heatCapacityMode === 'demo' ? initialDelayRemainingMs : 0,
        pauseReasons: currentFile.heatCapacityMode === 'demo' ? pauseReasons : [],
        timeline: {
          currentItemIndex: currentTimelineItem ? lastProcessedTimelineIndex : null,
          nextItemIndex: Math.max(0, lastProcessedTimelineIndex + 1),
          currentItemKey: currentTimelineItem
            ? getHeatCapacityAutoDemoTimelineItemKey(currentTimelineItem, lastProcessedTimelineIndex)
            : null,
          currentStage: currentTimelineItem?.stage ?? null,
          currentStepId: currentTimelineItem?.step.id ?? null,
          currentStepIndex: currentTimelineItem?.stepIndex ?? null,
          currentActionId: currentTimelineItem?.action
            ? `${currentTimelineItem.action.action}:${currentTimelineItem.action.sampleKey ?? ''}`
            : null,
          itemStartedAtElapsedMs: currentTimelineItem?.atMs ?? null,
          executedItemKeys: timeline
            .map(getHeatCapacityAutoDemoTimelineItemKey)
            .filter((itemKey) => heatCapacityAutoDemoExecutedItemKeysRef.current.has(itemKey)),
        },
        stepPanel: {
          mode: autoDemoStepPanelMode === 'exiting' ? 'hidden' : autoDemoStepPanelMode,
          stepIndex: autoDemoStepIndex,
          stepCount: autoDemoStepCount,
          title: autoDemoStepTitle,
          description: autoDemoStepDescription,
          target: autoDemoStepTarget,
          progressCriterion: autoDemoStepProgressCriterion,
          note: autoDemoStepNote,
        },
        focusControlId: demoFocusControlId,
        focusPulseActive: demoFocusPulseActive,
        cameraMode: demoCameraFocusMode,
        cameraFocusKey: demoCameraFocusKey,
        completionMessage: autoDemoCompletionMessage,
        completionMessageRemainingMs:
          heatCapacityAutoDemoCompleteToastPausedRef.current?.fileId === currentFile.id
            ? heatCapacityAutoDemoCompleteToastPausedRef.current.remainingMs
            : getHeatCapacityRefreshRemainingMs(
                heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current,
              ),
      },
    };
  };

  const captureHeatCapacityLessonDialogCheckpoint = (): HeatCapacityModeLessonDialogCheckpoint | null => (
    heatCapacityGuideLessonDialog?.kind === 'intro'
      ? {
          kind: 'intro',
          pageIndex: heatCapacityGuideLessonDialog.pageIndex,
          lessonId: null,
        }
      : heatCapacityGuideLessonDialog?.kind === 'step'
        ? {
            kind: 'step',
            pageIndex: null,
            lessonId: heatCapacityGuideLessonDialog.lessonId,
          }
        : null
  );

  const captureHeatCapacityGuideUiCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
    override: HeatCapacityModeGuideCheckpoint | null = null,
  ): HeatCapacityModeGuideCheckpoint => {
    if (override) return override;
    const pausedNormalReminder = guideHeatCapacityPausedPulseRef.current?.fileId === currentFile.id
      ? guideHeatCapacityPausedPulseRef.current
      : null;
    const normalReminderControlId = pausedNormalReminder?.controlId ?? (
      guideHeatCapacityPulseActive ? guideHeatCapacityFocusControlId : null
    );
    const normalReminderRemainingMs = pausedNormalReminder
      ? pausedNormalReminder.remainingMs
      : guideHeatCapacityPulseActive
        ? getHeatCapacityRefreshRemainingMs(guideHeatCapacityPulseDeadlineAtMsRef.current)
        : null;
    const normalReminderTimer = normalReminderControlId
      ? createHeatCapacityModeDeferredTimer(normalReminderRemainingMs)
      : null;
    const pendingTimer = createHeatCapacityModeDeferredTimer(
      getHeatCapacityRefreshRemainingMs(guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current) ??
        guideHeatCapacityPausedPendingStrongReminderRef.current?.remainingMs,
    );
    const baseTimerFileId = guideHeatCapacityStrongReminderTimerContextRef.current?.fileId ??
      guideHeatCapacityRestoredStrongReminderTimerRef.current?.fileId ?? null;
    const baseTimer = baseTimerFileId === currentFile.id
      ? createHeatCapacityModeDeferredTimer(
          getHeatCapacityRefreshRemainingMs(guideHeatCapacityStrongReminderDeadlineAtMsRef.current) ??
            guideHeatCapacityRestoredStrongReminderTimerRef.current?.remainingMs,
        )
      : null;
    return {
      missCount: guideHeatCapacityMissCountRef.current,
      normalReminder: normalReminderTimer && normalReminderControlId
        ? { controlId: normalReminderControlId, timer: normalReminderTimer }
        : null,
      strongReminder: {
        active: guideHeatCapacityStrongReminderActive,
        controlId: guideHeatCapacityStrongReminderControlId,
      },
      lessonDialog: captureHeatCapacityLessonDialogCheckpoint(),
      shownLessonIds: Array.from(heatCapacityGuideLessonShownRef.current),
      checklistViewedIndex: heatCapacityGuideChecklistViewedIndexRef.current,
      pendingStrongReminder: pendingTimer
        ? {
            controlId: guideHeatCapacityPendingStrongReminderControlIdRef.current ??
              guideHeatCapacityPausedPendingStrongReminderRef.current?.controlId ?? null,
            timer: pendingTimer,
          }
        : null,
      baseStrongReminder: baseTimer
        ? {
            controlId: guideHeatCapacityStrongReminderTimerContextRef.current?.controlId ??
              guideHeatCapacityRestoredStrongReminderTimerRef.current?.controlId ?? null,
            timer: baseTimer,
          }
        : null,
    };
  };

  const captureHeatCapacityPumpAnimationCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
  ): {
    fileId: string | null;
    releaseRemainingMs: number | null;
    idleRemainingMs: number | null;
    checkpoint: HeatCapacityModePumpAnimationCheckpoint | null;
  } => {
    const fileId = heatCapacityPumpAnimationRef.current.fileId;
    const releaseRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityPumpAnimationRef.current.releaseDeadlineAtMs,
    ) ?? heatCapacityPumpAnimationRef.current.pausedReleaseRemainingMs;
    const idleRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityPumpAnimationRef.current.idleDeadlineAtMs,
    ) ?? heatCapacityPumpAnimationRef.current.pausedIdleRemainingMs;
    const release = createHeatCapacityModeDeferredTimer(releaseRemainingMs);
    const idle = createHeatCapacityModeDeferredTimer(idleRemainingMs);
    return {
      fileId,
      releaseRemainingMs,
      idleRemainingMs,
      checkpoint: fileId === currentFile.id && (release || idle) ? { release, idle } : null,
    };
  };

  const captureHeatCapacitySceneCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
    capturedAtMs: number,
  ): {
    cameraPose: HeatCapacityModeCameraPoseCheckpoint | null;
    scene: HeatCapacityModeSceneCheckpoint;
  } => {
    const cameraPose = heatCapacityCameraPoseRef.current;
    const cameraCheckpoint: HeatCapacityModeCameraPoseCheckpoint | null = cameraPose ? {
      poseRevision: `${currentFile.id}:${capturedAtMs}`,
      capturedAtMs,
      projection: 'perspective',
      position: cameraPose.position,
      target: cameraPose.target,
      up: [0, 1, 0],
      quaternion: null,
      fovDeg: cameraPose.fov,
      zoom: 1,
      near: 0.1,
      far: 1000,
      cameraMode: null,
      viewport: null,
    } : null;
    return {
      cameraPose: cameraCheckpoint,
      scene: {
        focusMode: heatCapacitySceneFocusModeRef.current,
        cameraPose: cameraCheckpoint,
        cameraTransition: heatCapacityCameraTransitionRef.current as unknown as HeatCapacityModeJsonObject | null,
        ultraVisualState: heatCapacityUltraVisualStateRef.current as unknown as HeatCapacityModeJsonObject | null,
        hardSphereVisualCheckpoint:
          heatCapacityHardSphereVisualCheckpointRef.current as unknown as HeatCapacityModeJsonObject | null,
        focusSession: heatCapacityFocusSessionRef.current as unknown as HeatCapacityModeJsonObject | null,
      },
    };
  };

  const buildCurrentHeatCapacityRefreshSession = (
    activeModeCheckpointOverride: HeatCapacityModeUiCheckpoint | null = null,
    capturedAtMs = Date.now(),
  ): WorkbenchHeatCapacityRefreshSession | null => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      !currentFile ||
      currentFile.kind !== 'heatCapacity' ||
      currentFile.heatCapacityMode === null
    ) return null;
    const checkpointOverride = activeModeCheckpointOverride?.fileId === currentFile.id &&
      activeModeCheckpointOverride.mode === currentFile.heatCapacityMode
      ? activeModeCheckpointOverride
      : null;

    if (
      heatCapacityRefreshActiveFileIdRef.current !== currentFile.id ||
      heatCapacityRefreshModeRef.current !== currentFile.heatCapacityMode
    ) {
      heatCapacityRefreshActiveFileIdRef.current = currentFile.id;
      heatCapacityRefreshModeRef.current = currentFile.heatCapacityMode;
      heatCapacityRefreshCheckpointIdRef.current = `${currentFile.id}:${capturedAtMs}`;
      heatCapacityCameraPoseRef.current = null;
      heatCapacityCameraTransitionRef.current = null;
      heatCapacityUltraVisualStateRef.current = null;
      heatCapacityHardSphereVisualCheckpointRef.current = null;
    }

    const session = createWorkbenchHeatCapacityRefreshSession(
      currentFile.id,
      currentFile.heatCapacityMode,
      capturedAtMs,
    );
    session.checkpointId = heatCapacityRefreshCheckpointIdRef.current;
    const modeTransitionCheckpoint = createHeatCapacityModeTransitionCheckpoint(
      heatCapacityModeTransitionStateRef.current,
      capturedAtMs,
    );
    const pausedVisualClock = heatCapacityModeTransitionPausedVisualClockRef.current;
    if (
      pausedVisualClock?.requestId === modeTransitionCheckpoint.requestId &&
      modeTransitionCheckpoint.phase === 'animating'
    ) {
      modeTransitionCheckpoint.visualRemainingMs = pausedVisualClock.remainingMs;
    }
    session.modeTransition = modeTransitionCheckpoint;
    session.modeTransitionGuideUi = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
    const demoCapture = checkpointOverride?.mode === 'demo'
      ? {
          demo: checkpointOverride.payload.demo,
          modeTransitionDemoClock: heatCapacityModeTransitionDemoClockRef.current?.fileId === currentFile.id
            ? heatCapacityModeTransitionDemoClockRef.current
            : null,
        }
      : captureHeatCapacityDemoUiCheckpoint(currentFile);
    const guideCapture = checkpointOverride?.mode === 'guide'
      ? checkpointOverride.payload.guide
      : captureHeatCapacityGuideUiCheckpoint(currentFile);
    const pumpCapture = checkpointOverride
      ? {
          fileId: checkpointOverride.pumpAnimation ? currentFile.id : null,
          releaseRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
            checkpointOverride.pumpAnimation?.release,
          ),
          idleRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
            checkpointOverride.pumpAnimation?.idle,
          ),
          checkpoint: checkpointOverride.pumpAnimation,
        }
      : captureHeatCapacityPumpAnimationCheckpoint(currentFile);
    const sceneCapture = checkpointOverride
      ? {
          cameraPose: checkpointOverride.scene.cameraPose,
          scene: checkpointOverride.scene,
        }
      : captureHeatCapacitySceneCheckpoint(currentFile, capturedAtMs);
    session.demo = demoCapture.demo;
    session.modeTransitionDemoClock = demoCapture.modeTransitionDemoClock;

    const toastRemainingMs = heatCapacityToastPausedRef.current?.fileId === currentFile.id
      ? heatCapacityToastPausedRef.current.remainingMs
      : getHeatCapacityRefreshRemainingMs(heatCapacityToastDeadlineAtMsRef.current);
    const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current?.fileId === currentFile.id
      ? desktopExitPausedPressureAlarmRef.current
      : null;
    const pressureAlarmRemainingMs = pausedPressureAlarm?.remainingMs ?? (
      heatCapacityPressureAlarmFileIdRef.current === currentFile.id
        ? getHeatCapacityRefreshRemainingMs(heatCapacityPressureAlarmDeadlineAtMsRef.current)
        : null
    );
    const pausedClosePumpValveReminder =
      desktopExitPausedClosePumpValveReminderRef.current?.fileId === currentFile.id
        ? desktopExitPausedClosePumpValveReminderRef.current
        : null;
    const closePumpValveReminderRemainingMs = pausedClosePumpValveReminder?.remainingMs ?? (
      heatCapacityClosePumpValveReminderFileIdRef.current === currentFile.id
        ? getHeatCapacityRefreshRemainingMs(heatCapacityClosePumpValveReminderDeadlineAtMsRef.current)
        : null
    );
    const pressureAlertRefreshProjection = resolveWorkbenchHeatCapacityPressureAlertRefreshProjection({
      activeFileId: currentFile.id,
      pressureAlarmVisible: heatCapacityPressureAlarmFileIdRef.current === currentFile.id &&
        heatCapacityPressureAlarmVisibleRef.current,
      pressureAlarmRemainingMs,
      closePumpValveReminderRemainingMs,
      closePumpValveReminderAfterAlarmMs: HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS,
    });
    const pausedRecordSuccess = heatCapacityRecordSuccessPausedRef.current?.fileId === currentFile.id
      ? heatCapacityRecordSuccessPausedRef.current
      : null;
    const recordSuccessReleaseRemainingMs = pausedRecordSuccess?.releaseRemainingMs ??
      getHeatCapacityRefreshRemainingMs(heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current);
    const recordSuccessSequence: HeatCapacityRecordSuccessTimerPlan | null =
      currentFile.heatCapacityMode === 'guide' && recordSuccessReleaseRemainingMs !== null
        ? {
            fileId: currentFile.id,
            followUpMessage: pausedRecordSuccess?.followUpMessage ??
              heatCapacityRecordSuccessFollowUpMessageRef.current,
            followUpRemainingMs: pausedRecordSuccess?.followUpRemainingMs ??
              getHeatCapacityRefreshRemainingMs(
                heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current,
              ),
            releaseRemainingMs: recordSuccessReleaseRemainingMs,
          }
        : null;
    const pausedLessonClose = heatCapacityGuideLessonClosePausedRef.current?.fileId === currentFile.id
      ? heatCapacityGuideLessonClosePausedRef.current
      : null;
    const lessonCloseRemainingMs = pausedLessonClose?.remainingMs ??
      getHeatCapacityRefreshRemainingMs(heatCapacityGuideLessonCloseDeadlineAtMsRef.current);
    const lessonCloseSequence: HeatCapacityLessonCloseTimerPlan | null =
      lessonCloseRemainingMs !== null && heatCapacityGuideLessonDialog !== null
        ? {
            fileId: currentFile.id,
            remainingMs: lessonCloseRemainingMs,
            shouldResumeAutoDemo: pausedLessonClose?.shouldResumeAutoDemo ??
              heatCapacityGuideLessonCloseShouldResumeDemoRef.current,
          }
        : null;
    const createToastCheckpoint = (
      message: HeatCapacityToastMessage | null,
      remainingMs: number | null,
    ) => message && remainingMs !== 0 ? {
      id: message.id,
      text: message.text,
      level: message.level,
      priority: message.priority,
      source: message.source,
      createdAtMs: message.createdAt,
      remainingMs: remainingMs ?? HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
    } : null;
    session.guide = {
      focusControlId: guideCapture.normalReminder?.controlId ?? null,
      focusPulseActive: guideCapture.normalReminder !== null,
      missCount: guideCapture.missCount,
      pauseReasons: guideCapture.lessonDialog ? ['lesson-dialog'] : [],
      normalReminder: {
        active: guideCapture.normalReminder !== null,
        controlId: guideCapture.normalReminder?.controlId ?? null,
        message: heatCapacityToastCurrentRef.current?.text ?? null,
        remainingMs: getHeatCapacityModeDeferredTimerRemainingMs(guideCapture.normalReminder?.timer),
      },
      strongReminder: {
        active: guideCapture.strongReminder.active && guideCapture.strongReminder.controlId !== null,
        controlId: guideCapture.strongReminder.controlId,
        message: null,
        remainingMs: null,
      },
      lessonDialog: guideCapture.lessonDialog,
      shownLessonIds: guideCapture.shownLessonIds,
      toastQueue: {
        current: createToastCheckpoint(heatCapacityToastCurrentRef.current, toastRemainingMs),
        pending: heatCapacityToastPendingRef.current
          ? [createToastCheckpoint(
              heatCapacityToastPendingRef.current,
              HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
            )].filter((message): message is NonNullable<typeof message> => message !== null)
          : [],
      },
      pressureAlarmVisible: pressureAlertRefreshProjection.pressureAlarmVisible,
      pressureAlarmRemainingMs: pressureAlertRefreshProjection.pressureAlarmRemainingMs,
    };

    session.ui = {
      windows: asWorkbenchHeatCapacityRefreshJsonObject({
        openTopMenu,
        topMenuLeft,
        settingsGeneralOpen,
        aboutWindowOpen,
        buildNoticeWindowOpen,
        buildNoticeNavOpen,
        activeBuildNoticeMaterialId,
        buildNoticeFilePreview,
        buildNoticeOpenError,
        aboutResultNotice,
        updateDialogOpen,
        settingsLanguageMenuOpen,
        openFileMenuId,
        renamingFileId,
        samplingPresetMenuOpen,
        idealAdvancedSettingsOpen,
        idealAdvancedSettingsBodyVisible,
        heatCapacityAdvancedOpen,
        pinnedHeatCapacityParamHelpId,
        lessonAutoResumeDemo: heatCapacityLessonAutoResumeDemoRef.current,
      }),
      drafts: asWorkbenchHeatCapacityRefreshJsonObject({
        renameDraft,
        parameterInputDrafts,
        parameterErrors,
        heatCapacityBasicInputDrafts,
        heatCapacityBasicInputErrors,
        heatCapacityAdvancedDraft,
        heatCapacityAdvancedInputDrafts,
        heatCapacityAdvancedInputErrors,
        scanInputDraft,
        scanInputError,
        scanInputToast,
      }),
      layout: asWorkbenchHeatCapacityRefreshJsonObject({
        runState: currentFile.runState,
        selectedFileId,
        selectedPanel,
        logs,
        consoleTab,
        consoleCollapsed,
        consoleHeightPx,
        consoleScrollTop: consoleBodyRef.current?.scrollTop ?? 0,
        currentParametersScrollTop: currentParametersBodyRef.current?.scrollTop ?? 0,
        leftCollapsed,
        parametersCollapsed,
        leftSidebarWidth,
        parameterSidebarWidth,
        filesSectionCollapsed,
        panelsSectionCollapsed,
        resultsChildrenCollapsed,
        guideChecklistViewedIndex: guideCapture.checklistViewedIndex,
        reviewSelectionByFileId: heatCapacityReviewSelectionByFileId,
        renameSelectionStart: renameInputRef.current?.selectionStart ?? null,
        renameSelectionEnd: renameInputRef.current?.selectionEnd ?? null,
        closePumpValveReminderFileId: pressureAlertRefreshProjection.closePumpValveReminderFileId,
        closePumpValveReminderRemainingMs:
          pressureAlertRefreshProjection.closePumpValveReminderRemainingMs,
        pendingStrongReminderControlId: guideCapture.pendingStrongReminder?.controlId ?? null,
        pendingStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
          guideCapture.pendingStrongReminder?.timer,
        ),
        baseStrongReminderFileId: guideCapture.baseStrongReminder ? currentFile.id : null,
        baseStrongReminderControlId: guideCapture.baseStrongReminder?.controlId ?? null,
        baseStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs(
          guideCapture.baseStrongReminder?.timer,
        ),
        pumpAnimationFileId: pumpCapture.fileId,
        pumpAnimationReleaseRemainingMs: pumpCapture.releaseRemainingMs,
        pumpAnimationIdleRemainingMs: pumpCapture.idleRemainingMs,
        cameraTransition: sceneCapture.scene.cameraTransition,
        ultraVisualState: sceneCapture.scene.ultraVisualState,
        hardSphereVisualCheckpoint: sceneCapture.scene.hardSphereVisualCheckpoint,
        heatCapacityFocusSession: sceneCapture.scene.focusSession,
        recordSuccessSequence,
        lessonCloseSequence,
      }),
    };

    session.focusMode = sceneCapture.scene.focusMode;
    session.cameraPose = sceneCapture.cameraPose;
    // Legacy pixel snapshots remain readable for one-time restore, but canonical saves are semantic-only.
    session.sceneSnapshot = null;
    return session;
  };

  const buildHeatCapacityModeUiCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
    capturedAtMs = Date.now(),
    guidePayloadOverride: HeatCapacityModeGuideCheckpoint | null = null,
  ): HeatCapacityModeUiCheckpoint => {
    const demoCapture = captureHeatCapacityDemoUiCheckpoint(currentFile);
    const guideCapture = captureHeatCapacityGuideUiCheckpoint(currentFile, guidePayloadOverride);
    const pumpCapture = captureHeatCapacityPumpAnimationCheckpoint(currentFile);
    const sceneCapture = captureHeatCapacitySceneCheckpoint(currentFile, capturedAtMs);
    const base = {
      fileId: currentFile.id,
      checkpointId: `${currentFile.id}:${capturedAtMs}:mode`,
      capturedAtMs,
      scene: sceneCapture.scene,
      pumpAnimation: pumpCapture.checkpoint,
    };
    if (currentFile.heatCapacityMode === 'demo') {
      return createHeatCapacityModeUiCheckpoint({
        ...base,
        mode: 'demo',
        payload: { kind: 'demo', demo: demoCapture.demo },
      });
    }
    if (currentFile.heatCapacityMode === 'guide') {
      return createHeatCapacityModeUiCheckpoint({
        ...base,
        mode: 'guide',
        payload: { kind: 'guide', guide: guideCapture },
      });
    }
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'free',
      payload: { kind: 'free' },
    });
  };

  const {
    applyTransitionEvent: applyHeatCapacityModeTransitionEvent,
    activateFromExplore: activateHeatCapacityModeFromExplore,
    exitToExplore: exitHeatCapacityFormalModeToExplore,
    switchMode: switchHeatCapacityMode,
    activateFile: activateHeatCapacityFileMode,
  } = createHeatCapacityModeActions({
    now: Date.now,
    getActiveFile: () => filesRef.current.find((file) => file.id === activeFileIdRef.current),
    getFile: (fileId) => filesRef.current.find((file) => file.id === fileId),
    commitFile: (file) => commitHeatCapacityFileProjection(file),
    hasRuntimeFailure: () => heatCapacityRuntimeFailureFileIdRef.current !== null,
    isDesktopExitQuiesced: () => desktopExitQuiescedRef.current,
    transition: {
      getState: () => heatCapacityModeTransitionStateRef.current,
      dispatch: dispatchHeatCapacityModeTransition,
      request: requestHeatCapacityModeTransition,
      getMotionReasons: () => heatCapacitySceneDiscreteMotionRef.current.reasons,
      schedulePreparation: (requestId) => scheduleHeatCapacityModeTargetPreparation(requestId),
    },
    persistence: {
      requestFrame: (callback) => { window.requestAnimationFrame(callback); },
      refresh: () => heatCapacityRefreshPersistRef.current(),
      flush: () => flushWorkspacePersistenceRef.current(),
    },
    ui: {
      applyMode: (file, checkpoint) => applyHeatCapacityModeUiProjection(file, checkpoint),
      collapsePanels: () => { setLeftCollapsed(true); setParametersCollapsed(true); },
      expandFiles: () => setLeftCollapsed(false),
      resetScene: () => resetHeatCapacitySceneUiState(),
      startDemo: (file) => startHeatCapacityAutoDemoUi(file.id, file.name),
      showGuideStart: () => showHeatCapacityAutoDemoCompletionToast(
        heatCapacityRealtimeCopy.guideModeStartingToast,
        HEAT_CAPACITY_GUIDE_START_NOTICE_MS,
      ),
      requestTeachingReset: (onConfirm) => requestHeatCapacityTeachingProgressReset(onConfirm),
    },
    demo: {
      isRunning: () => autoDemoRunning,
      quiesce: (fileId) => quiesceHeatCapacityAutoDemoForModeTransition(fileId),
      resume: (fileId) => resumeQuiescedHeatCapacityAutoDemo(fileId),
    },
  });

  const setHeatCapacityModeSceneCheckpoint = (
    checkpoint: HeatCapacityModeUiCheckpoint | null,
    modeTransitionRequestId: number | null = null,
  ) => {
    const cameraPose: HeatCapacityCameraPose | null = checkpoint?.scene.cameraPose
      ? {
          position: checkpoint.scene.cameraPose.position,
          target: checkpoint.scene.cameraPose.target,
          fov: checkpoint.scene.cameraPose.fovDeg,
        }
      : null;
    const focusMode: HeatCapacityFocusMode = checkpoint?.scene.focusMode ?? 'none';
    const cameraTransition = normalizeHeatCapacityCameraTransitionState(
      checkpoint?.scene.cameraTransition,
    );
    const ultraVisualState = normalizeHeatCapacityUltraVisualState(
      checkpoint?.scene.ultraVisualState,
    );
    const hardSphereVisualCheckpoint = normalizeHeatCapacityHardSphereVisualCheckpoint(
      checkpoint?.scene.hardSphereVisualCheckpoint,
      heatCapacityQualityProfile.renderModel === 'ultraGlb' ? 'ultra-cylinder' : 'skeleton-box',
    );
    heatCapacityCameraPoseRef.current = cameraPose;
    heatCapacityCameraTransitionRef.current = cameraTransition;
    heatCapacityUltraVisualStateRef.current = ultraVisualState;
    heatCapacityHardSphereVisualCheckpointRef.current = hardSphereVisualCheckpoint;
    heatCapacitySceneFocusModeRef.current = focusMode;
    const focusSession = normalizeHeatCapacityFocusSession(checkpoint?.scene.focusSession);
    heatCapacityFocusSessionRef.current = focusSession?.fileId === checkpoint?.fileId ? focusSession : null;
    setHeatCapacityModeSceneRestoreSession(checkpoint);
    setHeatCapacityModeSceneRestoreRequest(modeTransitionRequestId === null ? null : {
      requestId: modeTransitionRequestId,
      cameraPose,
      focusMode,
      ultraVisualState,
      hardSphereVisualCheckpoint,
    });
    if (modeTransitionRequestId === null) setHeatCapacitySceneReadyFileId(null);
    setHeatCapacitySceneRestoreAcknowledged(true);
  };

  const restoreHeatCapacityGuideUiCheckpoint = (
    fileId: string,
    guideCheckpoint: HeatCapacityModeGuideCheckpoint,
  ) => {
    const normalReminder = guideCheckpoint.normalReminder;
    const normalReminderRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
      normalReminder?.timer,
    );
    restoreGuideHeatCapacityPulse(
      fileId,
      normalReminder?.controlId,
      normalReminderRemainingMs,
    );
    setGuideHeatCapacityStrongReminderActive(guideCheckpoint.strongReminder.active);
    setGuideHeatCapacityStrongReminderControlId(guideCheckpoint.strongReminder.controlId);
    guideHeatCapacityMissCountRef.current = guideCheckpoint.missCount;
    const baseStrongReminderRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
      guideCheckpoint.baseStrongReminder?.timer,
    );
    guideHeatCapacityRestoredStrongReminderTimerRef.current = baseStrongReminderRemainingMs !== null
      ? {
          fileId,
          controlId: guideCheckpoint.baseStrongReminder?.controlId ?? null,
          remainingMs: baseStrongReminderRemainingMs,
        }
      : null;
    const pendingStrongReminderRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
      guideCheckpoint.pendingStrongReminder?.timer,
    );
    guideHeatCapacityPausedPendingStrongReminderRef.current = pendingStrongReminderRemainingMs !== null
      ? {
          controlId: guideCheckpoint.pendingStrongReminder?.controlId ?? null,
          remainingMs: pendingStrongReminderRemainingMs,
        }
      : null;
    heatCapacityGuideLessonShownRef.current = new Set(guideCheckpoint.shownLessonIds);
    heatCapacityGuideChecklistViewedIndexRef.current = guideCheckpoint.checklistViewedIndex;
    setHeatCapacityGuideChecklistViewedIndex(guideCheckpoint.checklistViewedIndex);
    const lessonDialog = guideCheckpoint.lessonDialog;
    if (lessonDialog?.kind === 'intro') {
      heatCapacityLessonDialogActiveRef.current = true;
      heatCapacityLessonPausedFileIdRef.current = fileId;
      setHeatCapacityGuideLessonDialog({ kind: 'intro', pageIndex: lessonDialog.pageIndex });
    } else if (lessonDialog?.kind === 'step') {
      heatCapacityLessonDialogActiveRef.current = true;
      heatCapacityLessonPausedFileIdRef.current = fileId;
      setHeatCapacityGuideLessonDialog({
        kind: 'step',
          lessonId: lessonDialog.lessonId,
      });
    }
  };

  const applyHeatCapacityModeUiProjection = (
    file: WorkbenchHeatCapacityState,
    checkpoint: HeatCapacityModeUiCheckpoint | null,
    modeTransitionRequestId: number | null = null,
  ) => {
    clearHeatCapacityModeTransientUiRuntime();
    setHeatCapacityModeSceneCheckpoint(checkpoint, modeTransitionRequestId);
    heatCapacityRefreshActiveFileIdRef.current = file.id;
    heatCapacityRefreshModeRef.current = file.heatCapacityMode;
    heatCapacityRefreshCheckpointIdRef.current = checkpoint?.checkpointId ?? `${file.id}:${Date.now()}`;

    if (checkpoint?.pumpAnimation) {
      const storedReleaseRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation.release,
      );
      const storedIdleRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation.idle,
      );
      const releaseRemainingMs = file.pumpBulbState === 'compressing'
        ? storedReleaseRemainingMs ?? 0
        : null;
      const idleRemainingMs = Math.max(storedIdleRemainingMs ?? 0, releaseRemainingMs ?? 0);
      const restorePaused = file.runState === 'paused' ||
        (checkpoint.mode === 'demo' && checkpoint.payload.demo.phase === 'paused') ||
        (checkpoint.mode === 'guide' && checkpoint.payload.guide.lessonDialog !== null);
      if (restorePaused) {
        restorePausedHeatCapacityPumpAnimation(file.id, releaseRemainingMs, idleRemainingMs);
      } else {
        scheduleHeatCapacityPumpAnimation(file.id, releaseRemainingMs, idleRemainingMs);
      }
    }

    if (file.heatCapacityMode === 'demo' && checkpoint?.mode === 'demo') {
      const demoCheckpoint = checkpoint.payload.demo;
      const steps = createHeatCapacityAutoDemoSteps();
      const timeline = getHeatCapacityAutoDemoTimeline(steps);
      const resumeCursor = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
        elapsedMs: demoCheckpoint.elapsedMs,
        currentItemIndex: demoCheckpoint.timeline.currentItemIndex,
        currentStepId: demoCheckpoint.timeline.currentStepId,
        executedItemKeys: demoCheckpoint.timeline.executedItemKeys,
      });
      heatCapacityAutoDemoFileIdRef.current = file.id;
      heatCapacityAutoDemoPausedFileIdRef.current = file.id;
      heatCapacityAutoDemoTimelineRef.current = timeline;
      heatCapacityAutoDemoPausedElapsedMsRef.current = resumeCursor.elapsedMs;
      heatCapacityAutoDemoInitialDelayRemainingMsRef.current = demoCheckpoint.initialDelayRemainingMs;
      heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = resumeCursor.lastProcessedTimelineIndex;
      heatCapacityAutoDemoExecutedItemKeysRef.current = new Set(resumeCursor.executedItemKeys);
      heatCapacityAutoDemoStartedAtMsRef.current = performance.now() - resumeCursor.elapsedMs;
      const resumeAfterModeTransition = modeTransitionRequestId !== null && demoCheckpoint.phase === 'running';
      setAutoDemoPhase(resumeAfterModeTransition ? 'running' : 'paused');
      heatCapacityModeTransitionDemoClockRef.current = resumeAfterModeTransition
        ? {
            fileId: file.id,
            elapsedMs: resumeCursor.elapsedMs,
            initialDelayRemainingMs: demoCheckpoint.initialDelayRemainingMs,
          }
        : null;
      setAutoDemoStepPanelMode(
        demoCheckpoint.stepPanel.mode === 'hidden'
          ? 'hidden'
          : demoCheckpoint.stepPanel.mode,
      );
      setAutoDemoStepIndex(demoCheckpoint.stepPanel.stepIndex);
      setAutoDemoStepCount(demoCheckpoint.stepPanel.stepCount || steps.length);
      setAutoDemoStepTitle(demoCheckpoint.stepPanel.title);
      setAutoDemoStepDescription(demoCheckpoint.stepPanel.description);
      setAutoDemoStepTarget(demoCheckpoint.stepPanel.target);
      setAutoDemoStepProgressCriterion(demoCheckpoint.stepPanel.progressCriterion);
      setAutoDemoStepNote(demoCheckpoint.stepPanel.note);
      setDemoFocusControlId(demoCheckpoint.focusControlId);
      setDemoFocusPulseActive(demoCheckpoint.focusPulseActive);
      demoCameraFocusModeRef.current = demoCheckpoint.cameraMode;
      setDemoCameraFocusMode(demoCheckpoint.cameraMode);
      setDemoCameraFocusKey(demoCheckpoint.cameraFocusKey);
      if (
        demoCheckpoint.completionMessage &&
        demoCheckpoint.completionMessageRemainingMs !== null
      ) {
        showHeatCapacityAutoDemoCompletionToast(
          demoCheckpoint.completionMessage,
          demoCheckpoint.completionMessageRemainingMs,
        );
      } else {
        setAutoDemoCompletionMessage(demoCheckpoint.completionMessage);
      }
      return;
    }

    if (file.heatCapacityMode === 'guide') {
      guideHeatCapacityActiveFileIdRef.current = file.id;
      setGuideHeatCapacityActiveFileId(file.id);
      const guideCheckpoint = checkpoint?.mode === 'guide' ? checkpoint.payload.guide : null;
      if (guideCheckpoint && modeTransitionRequestId !== null) {
        pendingHeatCapacityGuideUiRestoreRef.current = {
          requestId: modeTransitionRequestId,
          fileId: file.id,
          checkpoint: guideCheckpoint,
        };
      } else if (guideCheckpoint) {
        restoreHeatCapacityGuideUiCheckpoint(file.id, guideCheckpoint);
      }
      return;
    }

    pendingHeatCapacityGuideUiRestoreRef.current = null;
    guideHeatCapacityActiveFileIdRef.current = null;
    setGuideHeatCapacityActiveFileId(null);
  };

  const commitHeatCapacityFileProjection = (nextFile: WorkbenchHeatCapacityState) => {
    if (desktopExitQuiescedRef.current) return;
    const nextFiles = filesRef.current.map((file) => file.id === nextFile.id ? nextFile : file);
    filesRef.current = nextFiles;
    setFiles(nextFiles);
  };

  function finishHeatCapacityModeTransitionAnimation() {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase !== 'animating') return;
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(transition.requestId);
    setHeatCapacityModeSceneRestoreRequest(null);
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      transition.visibleMode === 'guide' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide'
    ) {
      const guideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
      if (guideCheckpoint && transition.queuedMode) {
        pendingHeatCapacityGuideUiRestoreRef.current = {
          requestId: transition.requestId,
          fileId: currentFile.id,
          checkpoint: guideCheckpoint,
        };
      } else {
        if (guideCheckpoint) {
          restoreHeatCapacityGuideUiCheckpoint(currentFile.id, guideCheckpoint);
        }
        pendingHeatCapacityGuideUiRestoreRef.current = null;
      }
    } else {
      pendingHeatCapacityGuideUiRestoreRef.current = null;
    }
    const nextState = applyHeatCapacityModeTransitionEvent({
      type: 'animation-finished',
      sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
    });
    if (nextState.phase === 'preparing-target') {
      scheduleHeatCapacityModeTargetPreparationRef.current(nextState.requestId);
    } else if (nextState.phase === 'idle') {
      if (currentFile?.kind === 'heatCapacity' && currentFile.heatCapacityMode === 'demo') {
        resumeQuiescedHeatCapacityAutoDemo(currentFile.id);
      }
    }
  }

  function applyPreparedHeatCapacityModeTarget(
    requestId: number,
    targetMode: HeatCapacityMode,
    target: ReturnType<typeof resolveHeatCapacityModeTarget>,
  ) {
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    if (targetMode !== 'demo') {
      heatCapacityModeTransitionDemoClockRef.current = null;
    }
    commitHeatCapacityFileProjection(target.file);
    applyHeatCapacityModeUiProjection(target.file, target.checkpoint, requestId);
    if (target.activation === 'fresh-demo') {
      startHeatCapacityAutoDemoUi(target.file.id, target.file.name, true);
    } else if (target.activation === 'fresh-guide') {
      showHeatCapacityAutoDemoCompletionToast(
        heatCapacityRealtimeCopy.guideModeStartingToast,
        HEAT_CAPACITY_GUIDE_START_NOTICE_MS,
      );
    }
    applyHeatCapacityModeTransitionEvent({
      type: 'target-applied',
      requestId,
      targetMode,
      startedAtMs: Date.now(),
      durationMs: HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS,
    });
    heatCapacityModeTransitionPrepareFrameRef.current = window.requestAnimationFrame(() => {
      heatCapacityModeTransitionPrepareFrameRef.current = null;
      if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
      const activeTransition = heatCapacityModeTransitionStateRef.current;
      if (activeTransition.phase !== 'animating' || activeTransition.requestId !== requestId) return;
      heatCapacitySceneModeTransitionControllerRef.current?.start(requestId);
      if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
        window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      }
      heatCapacityModeTransitionVisualTimerRef.current = window.setTimeout(() => {
        heatCapacityModeTransitionVisualTimerRef.current = null;
        if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
        const currentTransition = heatCapacityModeTransitionStateRef.current;
        if (currentTransition.phase !== 'animating' || currentTransition.requestId !== requestId) return;
        finishHeatCapacityModeTransitionAnimation();
      }, HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS);
    });
  }

  const captureHeatCapacityModeSceneMetadata = (fileId: string) => {
    const checkpointRegistration = heatCapacitySceneCheckpointProviderRef.current;
    if (checkpointRegistration?.fileId !== fileId) return;
    heatCapacitySceneCheckpointSuppressPersistenceRef.current = true;
    try {
      checkpointRegistration.provider();
    } finally {
      heatCapacitySceneCheckpointSuppressPersistenceRef.current = false;
    }
  };

  function abortHeatCapacityModeTransitionToVisibleFile(requestId: number) {
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(requestId);
    setHeatCapacityModeSceneRestoreRequest(null);
    const visibleFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const visibleMode = visibleFile?.kind === 'heatCapacity'
      ? visibleFile.heatCapacityMode
      : heatCapacityModeTransitionStateRef.current.visibleMode;
    applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode });
    if (visibleFile?.kind === 'heatCapacity' && visibleFile.heatCapacityMode === 'demo') {
      resumeQuiescedHeatCapacityAutoDemo(visibleFile.id);
    } else {
      heatCapacityModeTransitionDemoClockRef.current = null;
    }
  }

  function prepareHeatCapacityModeTarget(requestId: number) {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    try {
      const transition = heatCapacityModeTransitionStateRef.current;
      if (
        transition.phase !== 'preparing-target' ||
        transition.requestId !== requestId ||
        !transition.targetMode
      ) return;
      if (heatCapacitySceneDiscreteMotionRef.current.reasons.length > 0) {
        applyHeatCapacityModeTransitionEvent({
          type: 'source-motion-changed',
          sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
        });
        return;
      }
      const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      if (!currentFile || currentFile.kind !== 'heatCapacity') {
        applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: 'free' });
        return;
      }
      captureHeatCapacityModeSceneMetadata(currentFile.id);
      const now = Date.now();
      const deferredGuideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
      const sourceCheckpoint = currentFile.heatCapacityMode === 'free'
        ? null
        : buildHeatCapacityModeUiCheckpoint(currentFile, now, deferredGuideCheckpoint);
      const suspendedFile = prepareHeatCapacityModeSessionForExit(
        currentFile,
        sourceCheckpoint,
        now,
      );
      pendingHeatCapacityGuideUiRestoreRef.current = null;
      const target = resolveHeatCapacityModeTarget(suspendedFile, transition.targetMode, now);
      heatCapacitySceneModeTransitionControllerRef.current?.prepare(requestId, null);
      applyPreparedHeatCapacityModeTarget(requestId, transition.targetMode, target);
    } catch (error) {
      console.error('[Workbench] Heat-capacity mode target preparation failed:', error);
      abortHeatCapacityModeTransitionToVisibleFile(requestId);
    }
  }

  function scheduleHeatCapacityModeTargetPreparation(requestId: number) {
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
    }
    heatCapacityModeTransitionPrepareFrameRef.current = window.requestAnimationFrame(() => {
      heatCapacityModeTransitionPrepareFrameRef.current = null;
      prepareHeatCapacityModeTarget(requestId);
    });
  }

  scheduleHeatCapacityModeTargetPreparationRef.current = scheduleHeatCapacityModeTargetPreparation;

  const completeHeatCapacityModeSourceMotions = (
    fileId: string,
    reasons: readonly HeatCapacitySceneDiscreteMotionState['reasons'][number][],
  ) => {
    if (reasons.includes('pump')) {
      clearHeatCapacityPumpAnimationTimers();
      updateFileById(fileId, (file) => file.kind === 'heatCapacity'
        ? refreshHeatCapacityPumpFrequency({ ...file, pumpBulbState: 'idle' }, Date.now())
        : file);
    }
    const demoClock = heatCapacityModeTransitionDemoClockRef.current;
    if (reasons.includes('scripted-zero') && demoClock?.fileId === fileId) {
      const zeroAction = heatCapacityAutoDemoTimelineRef.current.find((item) => (
        item.stage === 'action' && item.action?.action === 'zeroPressure'
      ));
      if (zeroAction) {
        const settledElapsedMs = Math.max(
          demoClock.elapsedMs,
          zeroAction.atMs + HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS,
        );
        const now = performance.now();
        demoClock.elapsedMs = settledElapsedMs;
        demoClock.initialDelayRemainingMs = 0;
        heatCapacityAutoDemoPausedElapsedMsRef.current = settledElapsedMs;
        heatCapacityAutoDemoInitialDelayRemainingMsRef.current = 0;
        heatCapacityAutoDemoStartedAtMsRef.current = now - settledElapsedMs;
        setAutoDemoTimelineClockMs(now);
      }
    }
  };

  heatCapacityModeTransitionWatchdogHandlerRef.current = ({
    phase,
    requestId,
  }) => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
      heatCapacityModeTransitionPrepareFrameRef.current = null;
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      heatCapacityModeTransitionVisualTimerRef.current = null;
    }
    void (async () => {
      const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      const motionReasons = heatCapacitySceneDiscreteMotionRef.current.reasons;
      if (currentFile?.kind === 'heatCapacity') {
        completeHeatCapacityModeSourceMotions(currentFile.id, motionReasons);
      }
      const controller = heatCapacitySceneModeTransitionControllerRef.current;
      let settleDeadlineId: number | null = null;
      const settled = controller
        ? await Promise.race([
            controller.settleMotions(requestId),
            new Promise<boolean>((resolve) => {
              settleDeadlineId = window.setTimeout(
                () => resolve(false),
                HEAT_CAPACITY_MODE_TRANSITION_SETTLE_DEADLINE_MS,
              );
            }),
          ]).finally(() => {
            if (settleDeadlineId !== null) window.clearTimeout(settleDeadlineId);
          })
        : motionReasons.length === 0;
      const currentTransition = heatCapacityModeTransitionStateRef.current;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) return;
      if (currentTransition.phase !== phase || currentTransition.requestId !== requestId) return;
      const remainingReasons = heatCapacitySceneDiscreteMotionRef.current.reasons;
      if (!settled || remainingReasons.length > 0) {
        abortHeatCapacityModeTransitionToVisibleFile(requestId);
        console.error('[Workbench] Heat-capacity mode transition watchdog could not settle scene motion.', {
          requestId,
          phase,
          remainingReasons,
        });
        return;
      }
      if (phase === 'animating') {
        finishHeatCapacityModeTransitionAnimation();
        return;
      }
      if (phase === 'waiting-for-motion') {
        const nextState = applyHeatCapacityModeTransitionEvent({
          type: 'source-motion-changed',
          sceneMotionReasons: [],
        });
        if (nextState.phase === 'preparing-target') {
          prepareHeatCapacityModeTarget(nextState.requestId);
        }
        return;
      }
      prepareHeatCapacityModeTarget(requestId);
    })().catch((error) => {
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) return;
      console.error('[Workbench] Heat-capacity mode transition watchdog failed.', error);
      abortHeatCapacityModeTransitionToVisibleFile(requestId);
    });
  };

  const quiesceHeatCapacityAutoDemoForModeTransition = (fileId: string) => {
    if (autoDemoPhaseRef.current !== 'running' || heatCapacityModeTransitionDemoClockRef.current?.fileId === fileId) return;
    const now = performance.now();
    const demoClock = captureHeatCapacityModeTransitionDemoClock({
      fileId,
      nowMs: now,
      timelineStartedAtMs: heatCapacityAutoDemoStartedAtMsRef.current,
    });
    clearHeatCapacityAutoDemoTimers();
    heatCapacityAutoDemoPausedElapsedMsRef.current = demoClock.elapsedMs;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = demoClock.initialDelayRemainingMs;
    heatCapacityModeTransitionDemoClockRef.current = demoClock;
  };

  const resumeQuiescedHeatCapacityAutoDemo = (fileId: string) => {
    const resume = resolveHeatCapacityModeTransitionDemoResume(
      heatCapacityModeTransitionDemoClockRef.current,
      fileId,
      autoDemoPhaseRef.current,
    );
    if (!resume) return;
    scheduleHeatCapacityAutoDemoTimeline(
      fileId,
      heatCapacityAutoDemoTimelineRef.current,
      resume.elapsedMs,
      resume.initialDelayRemainingMs,
    );
    heatCapacityModeTransitionDemoClockRef.current = null;
  };

  const requestHeatCapacityTeachingProgressReset = (onConfirm: () => void) => {
    requestPromptConfirmation({
      id: 'switch-heat-capacity-teaching-mode',
      tone: 'warning',
      ...workbenchPromptCopy.switchTeachingMode,
      closeLabel: workbenchPromptCopy.closeLabel,
      onConfirm,
    });
  };

  const handleHeatCapacitySceneDiscreteMotionChange = useCallback((
    motionState: HeatCapacitySceneDiscreteMotionState,
  ) => {
    heatCapacitySceneDiscreteMotionRef.current = motionState;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (heatCapacityRefreshRestorePendingRef.current) return;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'waiting-for-motion') {
      const nextState = applyHeatCapacityModeTransitionEvent({
        type: 'source-motion-changed',
        sceneMotionReasons: motionState.reasons,
      });
      if (nextState.phase === 'preparing-target') {
        scheduleHeatCapacityModeTargetPreparationRef.current(nextState.requestId);
      }
    }
  }, []);

  const handleHeatCapacitySceneModeTransitionControllerChange = useCallback((
    controller: HeatCapacitySceneModeTransitionController | null,
  ) => {
    heatCapacitySceneModeTransitionControllerRef.current = controller;
  }, []);

  useEffect(() => () => {
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
    }
    pendingHeatCapacityGuideUiRestoreRef.current = null;
    const transition = heatCapacityModeTransitionStateRef.current;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(transition.requestId);
  }, []);

  const cancelHeatCapacityModeTransitionForNavigation = (visibleMode: HeatCapacityMode | null) => {
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
      heatCapacityModeTransitionPrepareFrameRef.current = null;
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      heatCapacityModeTransitionVisualTimerRef.current = null;
    }
    const transition = heatCapacityModeTransitionStateRef.current;
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(transition.requestId);
    heatCapacitySceneDiscreteMotionRef.current = { active: false, reasons: [] };
    setHeatCapacityModeSceneRestoreRequest(null);
    applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode });
  };

  const pauseHeatCapacityModeTransitionRuntime = () => {
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
      heatCapacityModeTransitionPrepareFrameRef.current = null;
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      heatCapacityModeTransitionVisualTimerRef.current = null;
    }
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'animating') {
      const pausedVisualClock = heatCapacityModeTransitionPausedVisualClockRef.current;
      if (pausedVisualClock?.requestId !== transition.requestId) {
        heatCapacityModeTransitionPausedVisualClockRef.current = {
          requestId: transition.requestId,
          remainingMs: getHeatCapacityModeTransitionVisualRemainingMs(transition),
        };
      }
    } else {
      heatCapacityModeTransitionPausedVisualClockRef.current = null;
    }
    heatCapacitySceneModeTransitionControllerRef.current?.pause(transition.requestId);
  };

  const resumeHeatCapacityModeTransitionRuntime = () => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'idle') return;
    if (transition.phase === 'waiting-for-motion') {
      const nextState = applyHeatCapacityModeTransitionEvent({
        type: 'source-motion-changed',
        sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
      });
      if (nextState.phase === 'preparing-target') {
        scheduleHeatCapacityModeTargetPreparation(nextState.requestId);
      }
      return;
    }
    if (transition.phase === 'preparing-target') {
      heatCapacityModeTransitionPausedVisualClockRef.current = null;
      scheduleHeatCapacityModeTargetPreparation(transition.requestId);
      return;
    }
    const pausedVisualClock = heatCapacityModeTransitionPausedVisualClockRef.current;
    const remainingMs = pausedVisualClock?.requestId === transition.requestId
      ? pausedVisualClock.remainingMs
      : getHeatCapacityModeTransitionVisualRemainingMs(transition);
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    applyHeatCapacityModeTransitionEvent({
      type: 'animation-clock-rebased',
      requestId: transition.requestId,
      startedAtMs: Date.now(),
      durationMs: remainingMs,
    });
    heatCapacitySceneModeTransitionControllerRef.current?.resume(transition.requestId);
    heatCapacityModeTransitionVisualTimerRef.current = window.setTimeout(() => {
      heatCapacityModeTransitionVisualTimerRef.current = null;
      const currentTransition = heatCapacityModeTransitionStateRef.current;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null ||
        currentTransition.phase !== 'animating' ||
        currentTransition.requestId !== transition.requestId
      ) return;
      finishHeatCapacityModeTransitionAnimation();
    }, remainingMs);
  };

  const activeFileOwnsPendingHeatCapacityRefresh = (file: WorkbenchHeatCapacityState) => (
    heatCapacityRefreshRestorePendingRef.current &&
    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === file.id &&
    initialHeatCapacityRefreshSession.mode === file.heatCapacityMode
  );

  const cancelPendingHeatCapacityRefreshRestore = () => {
    const restoreSession = initialHeatCapacityRefreshSession;
    if (!restoreSession || !heatCapacityRefreshRestorePendingRef.current) return false;
    if (heatCapacityPressureAlarmFileIdRef.current === restoreSession.activeHeatCapacityFileId) {
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      if (heatCapacityPressureAlarmTimerRef.current !== null) {
        window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
        heatCapacityPressureAlarmTimerRef.current = null;
      }
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
      heatCapacityPressureAlarmFileIdRef.current = null;
      desktopExitPausedPressureAlarmRef.current = null;
      heatCapacityPressureAlarmVisibleRef.current = false;
      setHeatCapacityPressureAlarmVisible(false);
    }
    if (
      heatCapacityClosePumpValveReminderFileIdRef.current === restoreSession.activeHeatCapacityFileId
    ) {
      clearHeatCapacityClosePumpValveReminder();
    }
    clearHeatCapacityToastQueue();
    heatCapacityRefreshRestorePendingRef.current = false;
    heatCapacityRefreshRestoreAppliedRef.current = true;
    skipInitialConsoleScrollRef.current = false;
    setHeatCapacityInitialSceneRestoreEnabled(false);
    setHeatCapacityRefreshRestoring(false);
    setHeatCapacitySceneRestoreAcknowledged(true);
    return true;
  };

  const suspendActiveHeatCapacityModeForNavigation = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return false;
    const preservePendingRefresh = activeFileOwnsPendingHeatCapacityRefresh(currentFile);
    cancelHeatCapacityModeTransitionForNavigation(currentFile.heatCapacityMode);
    pendingHeatCapacityGuideUiRestoreRef.current = null;
    if (heatCapacityModeTransitionDemoClockRef.current?.fileId === currentFile.id) {
      heatCapacityModeTransitionDemoClockRef.current = null;
    }
    if (preservePendingRefresh) {
      cancelPendingHeatCapacityRefreshRestore();
    } else {
      captureHeatCapacityModeSceneMetadata(currentFile.id);
      const now = Date.now();
      const preparedFile = prepareHeatCapacityModeSessionForExit(currentFile, null, now);
      const exploreFile = enterHeatCapacityExploreModeWorkbenchState(
        preparedFile,
        createDefaultHeatCapacityFile(1),
        now,
      );
      commitHeatCapacityFileProjection(exploreFile);
    }
    releaseHeatCapacityRuntimeForFileExit(currentFile.id);
    return preservePendingRefresh;
  };

  const activateHeatCapacityFileModeSession = (fileId: string) => {
    const target = activateHeatCapacityFileMode(fileId);
    return target ? createWorkbenchActiveModeCheckpointOverride(
      target.file.id,
      target.file.heatCapacityMode,
      target.checkpoint,
    ) : undefined;
  };

  const exitHeatCapacityTeachingModeToExplore = (
    sourceMode: 'demo' | 'guide',
  ) => {
    exitHeatCapacityFormalModeToExplore(sourceMode);
  };

  useEffect(() => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (
      currentFile.heatCapacityMode === 'demo' &&
      currentFile.heatCapacityTeachingStatus !== 'completed' &&
      autoDemoPhase === 'idle'
    ) {
      exitHeatCapacityFormalModeToExplore('demo');
      return;
    }
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityTeachingStatus : null,
    autoDemoPhase,
    heatCapacityModeTransitionState.phase,
  ]);

  const persistCurrentHeatCapacityRefreshSession = () => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    scheduleWorkspacePersistenceRef.current();
  };
  heatCapacityRefreshPersistRef.current = persistCurrentHeatCapacityRefreshSession;

  const createWorkspacePersistenceSnapshot = createWorkbenchWorkspaceSnapshotCapture({
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
  });
  const workspacePersistenceRequests = createWorkbenchWorkspacePersistenceRequests({
    capture: createWorkspacePersistenceSnapshot,
    readScheduler: () => workspacePersistenceSchedulerRef.current,
  });
  scheduleWorkspacePersistenceRef.current = workspacePersistenceRequests.schedule;
  flushWorkspacePersistenceRef.current = workspacePersistenceRequests.flush;
  const clearHeatCapacitySemanticCheckpointTimers = () => {
    if (heatCapacitySemanticCheckpointDebounceTimerRef.current !== null) {
      window.clearTimeout(heatCapacitySemanticCheckpointDebounceTimerRef.current);
      heatCapacitySemanticCheckpointDebounceTimerRef.current = null;
    }
    if (heatCapacitySemanticCheckpointMaxWaitTimerRef.current !== null) {
      window.clearTimeout(heatCapacitySemanticCheckpointMaxWaitTimerRef.current);
      heatCapacitySemanticCheckpointMaxWaitTimerRef.current = null;
    }
  };
  const captureActiveHeatCapacitySemanticSceneCheckpoint = () => {
    clearHeatCapacitySemanticCheckpointTimers();
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return false;
    const activeSceneFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const registration = heatCapacitySceneCheckpointProviderRef.current;
    if (
      activeSceneFile?.kind !== 'heatCapacity' ||
      registration?.fileId !== activeSceneFile.id
    ) return false;
    return registration.provider() !== null;
  };
  scheduleHeatCapacitySemanticSceneCheckpointRef.current = () => {
    if (heatCapacitySemanticCheckpointDebounceTimerRef.current !== null) {
      window.clearTimeout(heatCapacitySemanticCheckpointDebounceTimerRef.current);
    }
    heatCapacitySemanticCheckpointDebounceTimerRef.current = window.setTimeout(
      captureActiveHeatCapacitySemanticSceneCheckpoint,
      HEAT_CAPACITY_SEMANTIC_CHECKPOINT_DEBOUNCE_MS,
    );
    if (heatCapacitySemanticCheckpointMaxWaitTimerRef.current === null) {
      heatCapacitySemanticCheckpointMaxWaitTimerRef.current = window.setTimeout(
        captureActiveHeatCapacitySemanticSceneCheckpoint,
        HEAT_CAPACITY_SEMANTIC_CHECKPOINT_MAX_WAIT_MS,
      );
    }
  };
  persistWorkspaceLifecycleCheckpointRef.current = async (forceFresh = false) => {
    if (forceFresh) {
      let activeFlush = heatCapacityLifecycleFlushPromiseRef.current;
      while (activeFlush) {
        try {
          await activeFlush;
        } catch {
          // A native exit must still attempt one post-quiescence checkpoint after an older flush fails.
        }
        activeFlush = heatCapacityLifecycleFlushPromiseRef.current;
      }
    } else {
      const activeFlush = heatCapacityLifecycleFlushPromiseRef.current;
      if (activeFlush) return activeFlush;
    }
    const flushOperation = (async () => {
      clearHeatCapacitySemanticCheckpointTimers();
      const activeSceneFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      const sceneCheckpointRegistration = heatCapacitySceneCheckpointProviderRef.current;
      const sceneCheckpointProvider = activeSceneFile?.kind === 'heatCapacity' &&
        sceneCheckpointRegistration?.fileId === activeSceneFile.id
        ? sceneCheckpointRegistration.provider
        : null;
      let sceneCheckpointCompleted = activeSceneFile?.kind !== 'heatCapacity';
      heatCapacityLifecycleFlushInProgressRef.current = true;
      try {
        if (sceneCheckpointProvider) {
          sceneCheckpointCompleted = sceneCheckpointProvider() !== null;
        }
      } finally {
        heatCapacityLifecycleFlushInProgressRef.current = false;
      }
      heatCapacityRefreshPersistRef.current();
      const saved = await flushWorkspacePersistenceRef.current();
      return sceneCheckpointCompleted && saved;
    })();
    heatCapacityLifecycleFlushPromiseRef.current = flushOperation;
    void flushOperation.then(
      () => {
        if (heatCapacityLifecycleFlushPromiseRef.current === flushOperation) {
          heatCapacityLifecycleFlushPromiseRef.current = null;
        }
      },
      () => {
        if (heatCapacityLifecycleFlushPromiseRef.current === flushOperation) {
          heatCapacityLifecycleFlushPromiseRef.current = null;
        }
      },
    );
    return flushOperation;
  };

  const handleHeatCapacityCameraPoseChange = (sceneFileId: string, cameraPose: HeatCapacityCameraPose) => {
    if (sceneFileId !== activeFileIdRef.current) return;
    heatCapacityCameraPoseRef.current = cameraPose;
  };

  const handleHeatCapacitySceneCheckpointProviderChange = useCallback((
    sceneFileId: string,
    provider: HeatCapacitySceneCheckpointProvider | null,
  ) => {
    if (provider) {
      heatCapacitySceneCheckpointProviderRef.current = { fileId: sceneFileId, provider };
      if (sceneFileId === activeFileIdRef.current) {
        scheduleHeatCapacitySemanticSceneCheckpointRef.current();
      }
      return;
    }
    if (heatCapacitySceneCheckpointProviderRef.current?.fileId === sceneFileId) {
      heatCapacitySceneCheckpointProviderRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearHeatCapacitySemanticCheckpointTimers();
  }, []);

  const handleHeatCapacitySceneRestoreRevealComplete = useCallback((sceneFileId: string) => {
    if (sceneFileId !== activeFileIdRef.current) return;
    setHeatCapacityInitialSceneRestoreEnabled(false);
  }, []);

  const handleHeatCapacitySceneCheckpoint = (
    sceneFileId: string,
    cameraPose: HeatCapacityCameraPose,
    metadata: HeatCapacitySceneCheckpointMetadata,
  ) => {
    if (sceneFileId !== activeFileIdRef.current) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.id !== sceneFileId) return;
    if (
      heatCapacityRefreshActiveFileIdRef.current !== currentFile.id ||
      heatCapacityRefreshModeRef.current !== currentFile.heatCapacityMode
    ) {
      heatCapacityRefreshActiveFileIdRef.current = currentFile.id;
      heatCapacityRefreshModeRef.current = currentFile.heatCapacityMode;
      heatCapacityRefreshCheckpointIdRef.current = `${currentFile.id}:${metadata.capturedAtMs}`;
    }
    heatCapacityCameraPoseRef.current = cameraPose;
    heatCapacityCameraTransitionRef.current = metadata.cameraTransition;
    heatCapacityUltraVisualStateRef.current = metadata.ultraVisualState;
    heatCapacityHardSphereVisualCheckpointRef.current = metadata.hardSphereVisualCheckpoint;
    if (
      !heatCapacityLifecycleFlushInProgressRef.current &&
      !heatCapacitySceneCheckpointSuppressPersistenceRef.current
    ) {
      heatCapacityRefreshPersistRef.current();
    }
  };

  const rebaseHeatCapacityFileForAutomaticSuspension = (
    file: WorkbenchHeatCapacityState,
    suspendedAtMs: number,
    resumedAtMs: number,
  ) => {
    const recoveryIntent = heatCapacityRuntimeRecoveryIntentRef.current;
    const recoveryRevisionMatches = recoveryIntent?.fileId === file.id &&
      recoveryIntent.expectedFile !== null &&
      hasSameHeatCapacityRuntimeRecoveryState(file, recoveryIntent.expectedFile);
    const rebasedFile = rebaseHeatCapacityFileAfterSuspendedWallClock(
      file,
      suspendedAtMs,
      resumedAtMs,
    );
    if (
      recoveryRevisionMatches &&
      recoveryIntent &&
      heatCapacityRuntimeRecoveryIntentRef.current === recoveryIntent
    ) {
      const runtimeIntervalCoveredMs = Math.max(
        0,
        resumedAtMs - Math.max(suspendedAtMs, recoveryIntent.suspendedAtMs),
      );
      heatCapacityRuntimeRecoveryIntentRef.current = {
        ...recoveryIntent,
        expectedFile: rebasedFile,
        suspendedAtMs: recoveryIntent.suspendedAtMs + runtimeIntervalCoveredMs,
      };
    }
    return rebasedFile;
  };

  useEffect(() => {
    if (desktopExitQuiescedRef.current) return;
    const restoreSession = initialHeatCapacityRefreshSession;
    if (!restoreSession || heatCapacityRefreshRestoreAppliedRef.current) return;
    const cancelPendingRestore = () => {
      cancelPendingHeatCapacityRefreshRestore();
      scheduleWorkspacePersistenceRef.current();
    };
    if (activeFileId !== restoreSession.activeHeatCapacityFileId) {
      cancelPendingRestore();
      return;
    }
    if (heatCapacitySceneReadyFileId !== restoreSession.activeHeatCapacityFileId) return;
    const restoredFile = filesRef.current.find((file) => file.id === restoreSession.activeHeatCapacityFileId);
    if (!restoredFile || restoredFile.kind !== 'heatCapacity' || restoredFile.heatCapacityMode !== restoreSession.mode) {
      cancelPendingRestore();
      return;
    }

    heatCapacityRefreshRestoreAppliedRef.current = true;
    const resumedAtMs = Date.now();
    const rebasedFiles = filesRef.current.map((file) => {
      if (file.id !== restoreSession.activeHeatCapacityFileId || file.kind !== 'heatCapacity') return file;
      return rebaseHeatCapacityFileForAutomaticSuspension(
        file,
        restoreSession.capturedAtMs,
        resumedAtMs,
      );
    });
    filesRef.current = rebasedFiles;
    setFiles(rebasedFiles);

    const resumedHeatCapacityFile = rebasedFiles.find(
      (file) => file.id === restoreSession.activeHeatCapacityFileId,
    );
    const restoreRuntimePaused = heatCapacityRuntimeFailureFileIdRef.current !== null;
    if (
      resumedHeatCapacityFile?.kind === 'heatCapacity' &&
      resumedHeatCapacityFile.pumpBulbState !== 'idle'
    ) {
      const storedPumpAnimationFileId = getHeatCapacityRefreshString(
        restoreSession.ui.layout,
        'pumpAnimationFileId',
      );
      const storedReleaseRemainingMs = getHeatCapacityRefreshNumber(
        restoreSession.ui.layout,
        'pumpAnimationReleaseRemainingMs',
        -1,
      );
      const storedIdleRemainingMs = getHeatCapacityRefreshNumber(
        restoreSession.ui.layout,
        'pumpAnimationIdleRemainingMs',
        -1,
      );
      const releaseRemainingMs = resumedHeatCapacityFile.pumpBulbState === 'compressing'
        ? storedPumpAnimationFileId === resumedHeatCapacityFile.id && storedReleaseRemainingMs >= 0
          ? storedReleaseRemainingMs
          : 0
        : null;
      const idleRemainingMs = storedPumpAnimationFileId === resumedHeatCapacityFile.id && storedIdleRemainingMs >= 0
        ? Math.max(storedIdleRemainingMs, releaseRemainingMs ?? 0)
        : releaseRemainingMs ?? 0;
      const restorePumpAnimationPaused = resumedHeatCapacityFile.runState === 'paused' ||
        restoreRuntimePaused ||
        restoreSession.demo.phase === 'paused' ||
        restoreSession.guide.lessonDialog !== null ||
        (
          restoreSession.mode === 'guide' &&
          isGuideHeatCapacityPauseStep(getHeatCapacityGuideStep(resumedHeatCapacityFile))
        );
      if (restorePumpAnimationPaused) {
        restorePausedHeatCapacityPumpAnimation(
          resumedHeatCapacityFile.id,
          releaseRemainingMs,
          idleRemainingMs,
        );
      } else {
        scheduleHeatCapacityPumpAnimation(
          resumedHeatCapacityFile.id,
          releaseRemainingMs,
          idleRemainingMs,
        );
      }
    }

    if (restoreSession.mode === 'demo' && restoreSession.demo.phase !== 'idle') {
      const steps = createHeatCapacityAutoDemoSteps();
      const timeline = getHeatCapacityAutoDemoTimeline(steps);
      const resumeCursor = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
        elapsedMs: restoreSession.demo.elapsedMs,
        currentItemIndex: restoreSession.demo.timeline.currentItemIndex,
        currentStepId: restoreSession.demo.timeline.currentStepId,
        executedItemKeys: restoreSession.demo.timeline.executedItemKeys,
      });
      heatCapacityAutoDemoFileIdRef.current = restoreSession.activeHeatCapacityFileId;
      heatCapacityAutoDemoTimelineRef.current = timeline;
      heatCapacityAutoDemoPausedElapsedMsRef.current = resumeCursor.elapsedMs;
      heatCapacityAutoDemoInitialDelayRemainingMsRef.current = restoreSession.demo.initialDelayRemainingMs;
      heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = resumeCursor.lastProcessedTimelineIndex;
      heatCapacityAutoDemoExecutedItemKeysRef.current = new Set(resumeCursor.executedItemKeys);
      heatCapacityModeTransitionDemoClockRef.current = null;
      const restoredModeTransitionDemoClock = restoreSession.modeTransitionDemoClock?.fileId ===
        restoreSession.activeHeatCapacityFileId
        ? {
            ...restoreSession.modeTransitionDemoClock,
            elapsedMs: resumeCursor.elapsedMs,
            initialDelayRemainingMs: restoreSession.demo.initialDelayRemainingMs,
          }
        : null;
      if (restoreSession.demo.phase === 'running' && restoredModeTransitionDemoClock) {
        clearHeatCapacityAutoDemoTimers();
        heatCapacityModeTransitionDemoClockRef.current = restoredModeTransitionDemoClock;
        heatCapacityAutoDemoStartedAtMsRef.current = performance.now() - resumeCursor.elapsedMs;
      } else if (
        restoreSession.demo.phase === 'running' &&
        heatCapacityRuntimeFailureFileIdRef.current === null
      ) {
        scheduleHeatCapacityAutoDemoTimeline(
          restoreSession.activeHeatCapacityFileId,
          timeline,
          resumeCursor.elapsedMs,
          restoreSession.demo.initialDelayRemainingMs,
        );
      } else {
        heatCapacityAutoDemoStartedAtMsRef.current = performance.now() +
          restoreSession.demo.initialDelayRemainingMs -
          resumeCursor.elapsedMs;
        heatCapacityAutoDemoPausedFileIdRef.current = restoreSession.activeHeatCapacityFileId;
      }
    }

    const toastRemainingMs = restoreSession.guide.toastQueue.current?.remainingMs ?? null;
    if (heatCapacityToastCurrentRef.current && toastRemainingMs !== null && toastRemainingMs > 0) {
      if (restoreRuntimePaused) {
        heatCapacityToastTimerGenerationRef.current += 1;
        heatCapacityToastDeadlineAtMsRef.current = null;
        heatCapacityToastPausedRef.current = {
          fileId: restoreSession.activeHeatCapacityFileId,
          remainingMs: toastRemainingMs,
        };
      } else {
        scheduleHeatCapacityToastAdvance(toastRemainingMs);
      }
    }

    const restoredRecordSuccess = heatCapacityRecordSuccessPausedRef.current;
    if (
      restoredRecordSuccess?.fileId === restoreSession.activeHeatCapacityFileId &&
      heatCapacityRuntimeFailureFileIdRef.current === null
    ) {
      scheduleHeatCapacityRecordSuccessToastTimers(
        restoredRecordSuccess.followUpMessage,
        restoredRecordSuccess.followUpRemainingMs,
        restoredRecordSuccess.releaseRemainingMs,
      );
    }

    const completionRemainingMs = restoreSession.demo.completionMessageRemainingMs;
    if (
      restoreSession.demo.completionMessage &&
      completionRemainingMs !== null
    ) {
      if (restoreRuntimePaused) {
        heatCapacityAutoDemoCompleteToastTimerGenerationRef.current += 1;
        heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
        heatCapacityAutoDemoCompleteToastPausedRef.current = {
          fileId: restoreSession.activeHeatCapacityFileId,
          remainingMs: completionRemainingMs,
        };
      } else {
        scheduleHeatCapacityAutoDemoCompletionToastExpiry(completionRemainingMs);
      }
    }

    const pressureAlarmRemainingMs = restoreSession.guide.pressureAlarmRemainingMs;
    if (restoreSession.guide.pressureAlarmVisible && pressureAlarmRemainingMs !== null && pressureAlarmRemainingMs > 0) {
      heatCapacityPressureAlarmFileIdRef.current = restoreSession.activeHeatCapacityFileId;
      if (restoreRuntimePaused) {
        desktopExitPausedPressureAlarmRef.current = {
          fileId: restoreSession.activeHeatCapacityFileId,
          remainingMs: pressureAlarmRemainingMs,
        };
      } else {
        scheduleHeatCapacityPressureAlarmExpiry(
          restoreSession.activeHeatCapacityFileId,
          pressureAlarmRemainingMs,
        );
      }
    } else {
      const closePumpValveReminderFileId = getHeatCapacityRefreshString(
        restoreSession.ui.layout,
        'closePumpValveReminderFileId',
      );
      const closePumpValveReminderRemainingMs = getHeatCapacityRefreshOptionalNumber(
        restoreSession.ui.layout,
        'closePumpValveReminderRemainingMs',
      );
      if (
        closePumpValveReminderFileId === restoreSession.activeHeatCapacityFileId &&
        closePumpValveReminderRemainingMs !== null
      ) {
        if (restoreRuntimePaused) {
          desktopExitPausedClosePumpValveReminderRef.current = {
            fileId: closePumpValveReminderFileId,
            remainingMs: closePumpValveReminderRemainingMs,
          };
        } else {
          scheduleHeatCapacityClosePumpValveReminder(
            closePumpValveReminderFileId,
            closePumpValveReminderRemainingMs,
          );
        }
      }
    }

    const pendingStrongReminderRemainingMs = getHeatCapacityRefreshOptionalNumber(
      restoreSession.ui.layout,
      'pendingStrongReminderRemainingMs',
    );
    const pendingStrongReminderControlId = getHeatCapacityRefreshString(
      restoreSession.ui.layout,
      'pendingStrongReminderControlId',
    );
    if (pendingStrongReminderRemainingMs !== null) {
      guideHeatCapacityPausedPendingStrongReminderRef.current = {
        controlId: pendingStrongReminderControlId,
        remainingMs: pendingStrongReminderRemainingMs,
      };
    }

    heatCapacityRefreshRestorePendingRef.current = false;
    setHeatCapacityRefreshRestoring(false);
    const restoredLessonClose = heatCapacityGuideLessonClosePausedRef.current;
    if (
      restoredLessonClose?.fileId === restoreSession.activeHeatCapacityFileId &&
      heatCapacityRuntimeFailureFileIdRef.current === null
    ) {
      scheduleHeatCapacityGuideLessonClose(
        restoredLessonClose.fileId,
        restoredLessonClose.shouldResumeAutoDemo,
        restoredLessonClose.remainingMs,
      );
    }
    heatCapacityRefreshPersistRef.current();
  }, [activeFileId, desktopExitQuiesced, heatCapacitySceneReadyFileId]);

  useEffect(() => {
    if (
      desktopExitQuiesced ||
      heatCapacityRefreshRestoring ||
      heatCapacityRefreshRestorePendingRef.current ||
      !heatCapacityRefreshRestoreAppliedRef.current ||
      heatCapacitySceneRestoreAcknowledged
    ) return undefined;

    const acknowledgementFrameId = window.requestAnimationFrame(() => {
      if (desktopExitQuiescedRef.current) return;
      skipInitialConsoleScrollRef.current = false;
      setHeatCapacitySceneRestoreAcknowledged(true);
    });
    return () => window.cancelAnimationFrame(acknowledgementFrameId);
  }, [
    desktopExitQuiesced,
    heatCapacityRefreshRestoring,
    heatCapacitySceneRestoreAcknowledged,
  ]);

  useEffect(() => {
    if (desktopExitQuiescedRef.current) return undefined;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return undefined;
    if (!initialHeatCapacityRefreshSession) return undefined;
    if (heatCapacityRefreshRestoring || heatCapacityRefreshRestorePendingRef.current) return undefined;
    if (heatCapacityModeTransitionRefreshResumedRef.current) return undefined;
    if (heatCapacitySceneReadyFileId !== initialHeatCapacityRefreshSession.activeHeatCapacityFileId) {
      return undefined;
    }

    let cancelled = false;
    let resumeFrameId: number | null = null;
    const resumePersistedTransition = () => {
      if (
        cancelled ||
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null ||
        heatCapacityModeTransitionRefreshResumedRef.current
      ) return;
      const transition = heatCapacityModeTransitionStateRef.current;
      if (
        transition.phase === 'animating' &&
        heatCapacitySceneModeTransitionControllerRef.current === null
      ) {
        resumeFrameId = window.requestAnimationFrame(resumePersistedTransition);
        return;
      }

      heatCapacityModeTransitionRefreshResumedRef.current = true;
      if (transition.phase === 'idle') return;
      if (transition.phase === 'waiting-for-motion') {
        const nextState = applyHeatCapacityModeTransitionEvent({
          type: 'source-motion-changed',
          sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
        });
        if (nextState.phase === 'preparing-target') {
          scheduleHeatCapacityModeTargetPreparationRef.current(nextState.requestId);
        }
        return;
      }
      if (transition.phase === 'preparing-target') {
        scheduleHeatCapacityModeTargetPreparationRef.current(transition.requestId);
        return;
      }

      heatCapacityModeTransitionPausedVisualClockRef.current = null;
      heatCapacitySceneModeTransitionControllerRef.current?.resume(transition.requestId);
      const remainingMs = Math.max(0, transition.visualDurationMs);
      if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
        window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      }
      heatCapacityModeTransitionVisualTimerRef.current = window.setTimeout(() => {
        heatCapacityModeTransitionVisualTimerRef.current = null;
        const currentTransition = heatCapacityModeTransitionStateRef.current;
        if (
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          currentTransition.phase !== 'animating' ||
          currentTransition.requestId !== transition.requestId
        ) return;
        finishHeatCapacityModeTransitionAnimation();
      }, remainingMs);
    };

    resumeFrameId = window.requestAnimationFrame(resumePersistedTransition);
    return () => {
      cancelled = true;
      if (resumeFrameId !== null) window.cancelAnimationFrame(resumeFrameId);
    };
  }, [
    desktopExitQuiesced,
    heatCapacityRefreshRestoring,
    heatCapacitySceneReadyFileId,
    initialHeatCapacityRefreshSession,
  ]);

  useEffect(() => {
    const persistLifecycleCheckpointOnce = async () => {
      const now = performance.now();
      const lastCompletedAtMs = heatCapacityLifecycleLastCompletedFlushAtMsRef.current;
      if (
        lastCompletedAtMs !== null &&
        now - lastCompletedAtMs < HEAT_CAPACITY_LIFECYCLE_DUPLICATE_FLUSH_WINDOW_MS
      ) {
        return true;
      }
      const persisted = await persistWorkspaceLifecycleCheckpointRef.current();
      if (persisted) {
        heatCapacityLifecycleLastCompletedFlushAtMsRef.current = performance.now();
      }
      return persisted;
    };
    const persistBeforePageHide = () => {
      void persistLifecycleCheckpointOnce();
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        void persistLifecycleCheckpointOnce();
        return;
      }
      heatCapacityLifecycleLastCompletedFlushAtMsRef.current = null;
    };
    const resetLifecycleFlushAfterPageShow = () => {
      heatCapacityLifecycleLastCompletedFlushAtMsRef.current = null;
    };
    const desktopWindowBridge = window.hardSphereLabWindow;
    const unsubscribePrepareExit = desktopWindowBridge?.onPrepareExit?.((request) => {
      void (async () => {
        let saved = false;
        let message = '';
        try {
          prepareDesktopExitQuiescenceRef.current();
          saved = await persistWorkspaceLifecycleCheckpointRef.current(true);
          if (!saved) message = 'Workspace persistence or scene checkpoint capture did not complete.';
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }
        await desktopWindowBridge.reportPersistenceResult({
          requestId: request.requestId,
          saved,
          message,
        });
      })();
    });
    const unsubscribeResumeAfterExitCancel = desktopWindowBridge?.onResumeAfterExitCancel?.(() => {
      resumeDesktopExitQuiescenceRef.current();
    });
    window.addEventListener('pagehide', persistBeforePageHide);
    window.addEventListener('pageshow', resetLifecycleFlushAfterPageShow);
    document.addEventListener('visibilitychange', persistWhenHidden);
    return () => {
      window.removeEventListener('pagehide', persistBeforePageHide);
      window.removeEventListener('pageshow', resetLifecycleFlushAfterPageShow);
      document.removeEventListener('visibilitychange', persistWhenHidden);
      unsubscribePrepareExit?.();
      unsubscribeResumeAfterExitCancel?.();
    };
  }, [
    selectedPanel,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
  ]);

  useEffect(() => {
    const blockInputWhileExitIsPrepared = (event: Event) => {
      if (!desktopExitInputBlockedRef.current) return;
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    };
    const blockedEventTypes = [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'click',
      'dblclick',
      'wheel',
      'keydown',
      'keyup',
      'input',
      'change',
      'submit',
    ] as const;
    blockedEventTypes.forEach((eventType) => {
      window.addEventListener(eventType, blockInputWhileExitIsPrepared, true);
    });
    return () => {
      blockedEventTypes.forEach((eventType) => {
        window.removeEventListener(eventType, blockInputWhileExitIsPrepared, true);
      });
    };
  }, []);

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



  const clearEditRestoreTransientUi = () => {
    setParameterInputDrafts({});
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    cancelPistonOscillationFreeSetup();
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setRenameDraft('');
    setOpenTopMenu(null);
  };


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeHeatCapacityModalLocked) return;
      if (tutorialActiveRef.current) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditableElement(event.target) || isEditableElement(document.activeElement)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey && undoStack.length > 0) {
        event.preventDefault();
        undoLastEdit();
        return;
      }

      if ((key === 'y' || (key === 'z' && event.shiftKey)) && redoStack.length > 0) {
        event.preventDefault();
        redoLastEdit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack, selectedPanel, activeHeatCapacityModalLocked]);

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









  prepareDesktopExitQuiescenceRef.current = (blockInput = true) => {
    if (desktopExitQuiescedRef.current) {
      if (blockInput && !desktopExitInputBlockedRef.current) {
        desktopExitInputBlockedRef.current = true;
        setDesktopExitInputBlocked(true);
      }
      return;
    }
    desktopExitInputBlockedRef.current = blockInput;
    setDesktopExitInputBlocked(blockInput);
    const activeFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (activeFile?.kind === 'heatCapacity') {
      const existingDemoClock = heatCapacityModeTransitionDemoClockRef.current?.fileId === activeFile.id
        ? heatCapacityModeTransitionDemoClockRef.current
        : null;
      desktopExitAutoDemoClockRef.current = autoDemoPhaseRef.current === 'running'
        ? existingDemoClock ?? captureHeatCapacityModeTransitionDemoClock({
            fileId: activeFile.id,
            nowMs: performance.now(),
            timelineStartedAtMs: heatCapacityAutoDemoStartedAtMsRef.current,
          })
        : null;
      heatCapacityModeTransitionDemoClockRef.current = null;
      pauseHeatCapacityModeTransitionRuntime();
    } else {
      desktopExitAutoDemoClockRef.current = null;
    }

    desktopExitQuiescedAtMsRef.current = Date.now();
    desktopExitQuiescedRef.current = true;
    setDesktopExitQuiesced(true);
    Object.keys(standardRuntimeRef.current).forEach(cancelRuntimeFrame);
    Object.keys(idealRuntimeRef.current).forEach(cancelRuntimeFrame);
    clearHeatCapacityAutoDemoTimers();
    if (activeFile?.kind === 'heatCapacity') {
      pauseHeatCapacityTransientUiTimers(activeFile.id);
      pauseHeatCapacityPressureAlertTimers(activeFile.id);
      if (activeFile.heatCapacityMode === 'guide') {
        pauseGuideHeatCapacityReminderTimers(activeFile.id);
      }
      pauseHeatCapacityPumpAnimation(activeFile.id);
    }
  };

  resumeDesktopExitQuiescenceRef.current = () => {
    if (!desktopExitQuiescedRef.current) return;
    const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current;
    const pausedClosePumpValveReminder = desktopExitPausedClosePumpValveReminderRef.current;
    const refreshRestoreOwnedFileId = heatCapacityRefreshRestorePendingRef.current
      ? initialHeatCapacityRefreshSession?.activeHeatCapacityFileId ?? null
      : null;
    const resumedAtMs = Date.now();
    const quiescedAtMs = desktopExitQuiescedAtMsRef.current ?? resumedAtMs;
    desktopExitQuiescedAtMsRef.current = null;
    desktopExitQuiescedRef.current = false;
    desktopExitInputBlockedRef.current = false;
    setDesktopExitInputBlocked(false);
    setDesktopExitQuiesced(false);

    const rebasedFiles = filesRef.current.map((file) => (
      file.kind === 'heatCapacity' &&
      file.id !== refreshRestoreOwnedFileId
      ? rebaseHeatCapacityFileForAutomaticSuspension(file, quiescedAtMs, resumedAtMs)
      : file
    ));
    filesRef.current = rebasedFiles;
    setFiles(rebasedFiles);

    const activeFile = rebasedFiles.find((file) => file.id === activeFileIdRef.current);
    const refreshRestoreOwnsActiveFile = activeFile?.id === refreshRestoreOwnedFileId;
    if (activeFile?.kind === 'heatCapacity' && !refreshRestoreOwnsActiveFile) {
      if (heatCapacityRuntimeFailureFileIdRef.current === null) {
        if (
          pausedPressureAlarm?.fileId === activeFile.id &&
          heatCapacityPressureAlarmVisibleRef.current
        ) {
          scheduleHeatCapacityPressureAlarmExpiry(
            activeFile.id,
            pausedPressureAlarm.remainingMs,
          );
        } else if (pausedClosePumpValveReminder?.fileId === activeFile.id) {
          scheduleHeatCapacityClosePumpValveReminder(
            activeFile.id,
            pausedClosePumpValveReminder.remainingMs,
          );
        }
        resumeHeatCapacityPumpAnimation(activeFile.id);
        resumeHeatCapacityTransientUiTimers(activeFile.id);
      }
      const demoClock = desktopExitAutoDemoClockRef.current;
      if (
        heatCapacityRuntimeFailureFileIdRef.current === null &&
        demoClock?.fileId === activeFile.id &&
        activeFile.heatCapacityMode === 'demo' &&
        autoDemoPhaseRef.current === 'running'
      ) {
        if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
          heatCapacityModeTransitionDemoClockRef.current = demoClock;
        } else {
          scheduleHeatCapacityAutoDemoTimeline(
            activeFile.id,
            heatCapacityAutoDemoTimelineRef.current,
            demoClock.elapsedMs,
            demoClock.initialDelayRemainingMs,
          );
        }
      }
    }
    if (
      !refreshRestoreOwnsActiveFile &&
      heatCapacityRuntimeFailureFileIdRef.current === null
    ) {
      desktopExitPausedPressureAlarmRef.current = null;
      desktopExitPausedClosePumpValveReminderRef.current = null;
    }
    desktopExitAutoDemoClockRef.current = null;
    resumeHeatCapacityModeTransitionRuntime();
    const pendingRuntimeRecoveryFileId = heatCapacityRuntimeFailureFileIdRef.current;
    if (
      pendingRuntimeRecoveryFileId !== null &&
      heatCapacitySceneReadyFileIdRef.current === pendingRuntimeRecoveryFileId
    ) {
      recoverHeatCapacityRuntimeIfReadyRef.current(pendingRuntimeRecoveryFileId);
    }

    rebasedFiles.forEach((file) => {
      if (file.runState !== 'running') return;
      if (file.kind === 'standard') scheduleStandardFrame(file.id);
      if (file.kind === 'ideal') scheduleIdealFrame(file.id);
    });
    scheduleWorkspacePersistenceRef.current();
  };

  const { revertWorkbenchParameterInput, commitWorkbenchParameterInput, applyActiveFileParams, prepareActiveFileForRun } = createWorkbenchParameterActions({
    getActiveFile: () => activeFile,
    getParameterControlsLocked: () => parameterControlsLocked,
    getParametersDirty: () => parametersDirty,
    workbenchCopy, getLockedIdealControlledVariableKeys, showWorkbenchValidationErrors,
    captureUndoSnapshot, updateActiveFile: (update) => updateActiveFile(update),
    standardRuntimeRef, idealRuntimeRef, cancelRuntimeFrame, getStandardRuntime, getIdealRuntime,
    snapshotParticles, setParameterInputDrafts, setParameterErrors, pushLog,
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

  const flushWorkspaceAfterRunStateCommit = () => {
    window.setTimeout(() => {
      void persistWorkspaceLifecycleCheckpointRef.current();
    }, 0);
  };

  const pauseHeatCapacityAutoDemo = () => {
    if (!autoDemoRunning) return;
    heatCapacityModeTransitionDemoClockRef.current = null;
    const now = performance.now();
    const initialDelayRemainingMs = Math.max(0, heatCapacityAutoDemoStartedAtMsRef.current - now);
    const elapsedMs = initialDelayRemainingMs > 0
      ? 0
      : Math.max(0, now - heatCapacityAutoDemoStartedAtMsRef.current);
    heatCapacityAutoDemoPausedElapsedMsRef.current = elapsedMs;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = initialDelayRemainingMs;
    heatCapacityAutoDemoPausedFileIdRef.current = activeFile.id;
    clearHeatCapacityAutoDemoTimers();
    setAutoDemoPhase('paused');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? { ...file, runState: 'paused', updatedAt: Date.now() }
      : file);
    flushWorkspaceAfterRunStateCommit();
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).autoDemoPausedLog(activeFile.name),
      'warning',
    );
  };

  const freezeHeatCapacityAutoDemoForRuntimeFailure = (
    fileId: string,
    failureProjectionDeferred: boolean,
  ) => {
    const shouldPauseDemoOnRecovery = activeFileIdRef.current === fileId &&
      autoDemoPhaseRef.current === 'running';
    if (!shouldPauseDemoOnRecovery) {
      clearHeatCapacityAutoDemoTimers();
      return false;
    }

    const now = performance.now();
    const frozenClock = desktopExitAutoDemoClockRef.current?.fileId === fileId
      ? desktopExitAutoDemoClockRef.current
      : heatCapacityModeTransitionDemoClockRef.current?.fileId === fileId
        ? heatCapacityModeTransitionDemoClockRef.current
        : heatCapacityRefreshRestorePendingRef.current
          ? null
          : captureHeatCapacityModeTransitionDemoClock({
              fileId,
              nowMs: now,
              timelineStartedAtMs: heatCapacityAutoDemoStartedAtMsRef.current,
            });
    if (frozenClock) {
      heatCapacityAutoDemoPausedElapsedMsRef.current = frozenClock.elapsedMs;
      heatCapacityAutoDemoInitialDelayRemainingMsRef.current = frozenClock.initialDelayRemainingMs;
      heatCapacityAutoDemoPausedFileIdRef.current = fileId;
    }
    clearHeatCapacityAutoDemoTimers();
    if (!failureProjectionDeferred) {
      autoDemoPhaseRef.current = 'paused';
      setAutoDemoPhase('paused');
    }
    return true;
  };

  const handleHeatCapacitySceneRuntimeFailure = (fileId: string, error: unknown) => {
    if (heatCapacityRuntimeFailureFileIdRef.current === fileId) return;
    const failedFile = filesRef.current.find((file) => file.id === fileId);
    const failureObservedAt = Date.now();
    const failureProjectionDeferred = desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current;
    const failureUpdatedAt = failureProjectionDeferred && failedFile?.kind === 'heatCapacity'
      ? failedFile.updatedAt
      : failureObservedAt;
    heatCapacityRuntimeFailureFileIdRef.current = fileId;
    setHeatCapacityRuntimeFailureFileId(fileId);
    pauseHeatCapacityModeTransitionRuntime();
    pauseHeatCapacityPressureAlertTimers(fileId);
    pauseHeatCapacityTransientUiTimers(fileId);
    heatCapacitySceneReadyFileIdRef.current = null;
    setHeatCapacitySceneReadyFileId((current) => current === fileId ? null : current);
    clearHeatCapacityGuideStartTimer();
    if (failedFile?.kind === 'heatCapacity' && failedFile.heatCapacityMode === 'guide') {
      pauseGuideHeatCapacityReminderTimers(fileId);
    } else {
      clearGuideHeatCapacityGuidancePulseTimer();
    }
    if (failureProjectionDeferred) {
      pauseHeatCapacityPumpAnimation(fileId);
    } else {
      clearHeatCapacityPumpAnimationTimers();
    }
    const pauseDemoOnRecovery = freezeHeatCapacityAutoDemoForRuntimeFailure(
      fileId,
      failureProjectionDeferred,
    );
    const resumeGuideRunState = Boolean(
      failedFile?.kind === 'heatCapacity' &&
      failedFile.heatCapacityMode === 'guide' &&
      failedFile.runState === 'running',
    );
    const projectedRunState = failedFile?.kind === 'heatCapacity'
      ? projectWorkbenchRunStateForRuntimeFailure(failedFile.runState)
      : 'paused';
    let expectedRecoveryFile = failedFile?.kind === 'heatCapacity' ? failedFile : null;
    if (!failureProjectionDeferred) {
      const failedFiles = filesRef.current.map((file) => file.id === fileId && file.kind === 'heatCapacity'
        ? refreshHeatCapacityPumpFrequency({
            ...file,
            runState: projectedRunState,
            pumpBulbState: 'idle',
            updatedAt: failureUpdatedAt,
          }, failureObservedAt)
        : file);
      filesRef.current = failedFiles;
      setFiles(failedFiles);
      const projectedFailureFile = failedFiles.find((file) => file.id === fileId);
      expectedRecoveryFile = projectedFailureFile?.kind === 'heatCapacity'
        ? projectedFailureFile
        : null;
    }
    heatCapacityRuntimeRecoveryIntentRef.current = {
      fileId,
      expectedFile: expectedRecoveryFile,
      suspendedAtMs: failureObservedAt,
      projectedRunState,
      resumeGuideRunState,
      pauseDemoOnRecovery,
    };
    if (!desktopExitQuiescedRef.current) {
      pushLog((language) => {
        const name = failedFile?.name ?? fileId;
        if (language === 'zh-TW') return `${name}：3D 執行階段發生錯誤，計時、音訊與模擬已暫停。`;
        if (language === 'en') return `${name}: A 3D runtime error paused timing, audio, and simulation.`;
        return `${name}：3D 运行时发生错误，计时、音频和模拟已暂停。`;
      }, 'error');
    }
    console.error('[Workbench] Heat-capacity scene runtime failed.', error);
  };

  const handleHeatCapacitySceneRuntimeRecovered = (fileId: string) => {
    if (
      heatCapacityRuntimeFailureFileIdRef.current !== fileId ||
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current
    ) return;
    const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current?.fileId === fileId
      ? desktopExitPausedPressureAlarmRef.current
      : null;
    const pausedClosePumpValveReminder =
      desktopExitPausedClosePumpValveReminderRef.current?.fileId === fileId
        ? desktopExitPausedClosePumpValveReminderRef.current
        : null;
    const recoveryIntent = heatCapacityRuntimeRecoveryIntentRef.current;
    let recoveryApplied = false;
    let recoveredMode: HeatCapacityMode | null = null;
    if (
      recoveryIntent?.fileId === fileId &&
      activeFileIdRef.current === fileId
    ) {
      const currentFile = filesRef.current.find((file) => file.id === fileId);
      if (currentFile?.kind === 'heatCapacity') {
        const recoveredAt = Date.now();
        const recoveryStateMatches = recoveryIntent.expectedFile !== null &&
          hasSameHeatCapacityRuntimeRecoveryState(currentFile, recoveryIntent.expectedFile);
        const recoveryRebaseStartMs = recoveryStateMatches
          ? recoveryIntent.suspendedAtMs
          : Math.max(
              recoveryIntent.suspendedAtMs,
              Math.min(recoveredAt, currentFile.updatedAt),
            );
        const recoveredFiles = filesRef.current.map((file) => {
          if (
            file.id !== fileId ||
            file.kind !== 'heatCapacity'
          ) return file;
          const rebasedFile = rebaseHeatCapacityFileAfterSuspendedWallClock(
            file,
            recoveryRebaseStartMs,
            recoveredAt,
          );
          const recoveredRunState = recoveryStateMatches
            ? recoveryIntent.projectedRunState
            : projectWorkbenchRunStateForRuntimeFailure(file.runState);
          const recoveredFile = refreshHeatCapacityPumpFrequency({
            ...rebasedFile,
            runState: recoveredRunState,
            pumpBulbState: 'idle' as const,
            updatedAt: recoveredAt,
          }, recoveredAt);
          return recoveryStateMatches &&
            recoveryIntent.resumeGuideRunState &&
            recoveredFile.heatCapacityMode === 'guide'
            ? {
                ...recoveredFile,
                runState: 'running' as const,
                lastUpdateMs: recoveredAt,
                displayResponseLastUpdateMs: recoveredAt,
              }
            : recoveredFile;
        });
        filesRef.current = recoveredFiles;
        setFiles(recoveredFiles);
        recoveryApplied = true;
        recoveredMode = currentFile.heatCapacityMode;
      }
    }
    if (
      recoveryApplied &&
      recoveredMode === 'demo' &&
      recoveryIntent?.pauseDemoOnRecovery
    ) {
      clearHeatCapacityAutoDemoTimers();
      heatCapacityModeTransitionDemoClockRef.current = null;
      heatCapacityAutoDemoPausedFileIdRef.current = fileId;
      autoDemoPhaseRef.current = 'paused';
      setAutoDemoPhase('paused');
    }
    if (recoveryApplied) {
      clearHeatCapacityPumpAnimationTimers();
    }
    heatCapacityRuntimeRecoveryIntentRef.current = null;
    heatCapacityRuntimeFailureFileIdRef.current = null;
    setHeatCapacityRuntimeFailureFileId((current) => current === fileId ? null : current);
    if (
      !desktopExitQuiescedRef.current &&
      !heatCapacityRefreshRestorePendingRef.current &&
      activeFileIdRef.current === fileId
    ) {
      if (pausedPressureAlarm && heatCapacityPressureAlarmVisibleRef.current) {
        desktopExitPausedClosePumpValveReminderRef.current = null;
        scheduleHeatCapacityPressureAlarmExpiry(fileId, pausedPressureAlarm.remainingMs);
      } else if (pausedClosePumpValveReminder) {
        desktopExitPausedPressureAlarmRef.current = null;
        scheduleHeatCapacityClosePumpValveReminder(fileId, pausedClosePumpValveReminder.remainingMs);
      } else {
        desktopExitPausedPressureAlarmRef.current = null;
        desktopExitPausedClosePumpValveReminderRef.current = null;
      }
    }
    resumeHeatCapacityModeTransitionRuntime();
    resumeHeatCapacityTransientUiTimers(fileId);
  };
  recoverHeatCapacityRuntimeIfReadyRef.current = handleHeatCapacitySceneRuntimeRecovered;

  const handleHeatCapacitySceneReady = (fileId: string) => {
    heatCapacitySceneReadyFileIdRef.current = fileId;
    setHeatCapacitySceneReadyFileId(fileId);
    handleHeatCapacitySceneRuntimeRecovered(fileId);
  };

  useEffect(() => {
    if (
      desktopExitQuiesced ||
      heatCapacityRefreshRestoring ||
      heatCapacityRefreshRestorePendingRef.current
    ) return;
    const pendingRuntimeRecoveryFileId = heatCapacityRuntimeFailureFileIdRef.current;
    if (
      pendingRuntimeRecoveryFileId !== null &&
      heatCapacitySceneReadyFileIdRef.current === pendingRuntimeRecoveryFileId
    ) {
      recoverHeatCapacityRuntimeIfReadyRef.current(pendingRuntimeRecoveryFileId);
    }
  }, [desktopExitQuiesced, heatCapacityRefreshRestoring, heatCapacitySceneReadyFileId]);

  const terminateHeatCapacityAutoDemo = () => {
    exitHeatCapacityTeachingModeToExplore('demo');
    setAutoDemoStepTitle(heatCapacityRealtimeCopy.autoDemoTerminatedTitle);
    setAutoDemoStepDescription(heatCapacityRealtimeCopy.autoDemoTerminatedDescription);
    setAutoDemoStepTarget(heatCapacityRealtimeCopy.autoDemoTerminatedTarget);
    setAutoDemoStepProgressCriterion(heatCapacityRealtimeCopy.autoDemoTerminatedProgress);
    setAutoDemoStepNote(heatCapacityRealtimeCopy.autoDemoTerminatedNote);
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.autoDemoTerminatedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).autoDemoTerminatedLog(activeFile.name),
      'warning',
    );
  };







  useWorkbenchHardSphereRuntimeInitialization(initializeExistingRuntimes);

  const commitExperienceProfile = (nextProfile: AppExperienceProfile) => {
    const result = persistAppExperienceProfile(nextProfile);
    if (result.ok === false) {
      setTutorialOperationError({
        message: result.error.message,
        retry: null,
      });
      return false;
    }
    experienceProfilePersistedRef.current = true;
    experienceProfileRef.current = result.profile;
    tutorialActiveRef.current = isExperimentTutorialActive(result.profile);
    setExperienceProfile(result.profile);
    experimentLearningChannelRef.current?.publish(result.profile);
    return true;
  };

  const replaceVisibleWorkspaceWithExperimentTutorial = (
    experiment: ExperimentLearningId,
    milestone: ExperimentLearningMilestone,
  ) => {
    const tutorialFile = createExperimentTutorialRuntimeFile(
      experiment,
      workbenchLayoutDefaults,
    );
    [...filesRef.current].forEach((file) => {
      cancelRuntimeFrame(file.id);
      delete standardRuntimeRef.current[file.id];
      delete idealRuntimeRef.current[file.id];
    });
    if (experiment === 'heatCapacity') {
      resetHeatCapacitySceneUiState();
    } else {
      clearPistonOscillationTutorialPlayback();
    }
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections([tutorialFile], [], tutorialFile.id);
    if (experiment === 'heatCapacity') {
      applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: null });
    }
    setSelectedPanel('preview');
    setSelectedFileId(tutorialFile.id);
    setParametersCollapsed(false);
    setUndoStack([]);
    setRedoStack([]);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setHeatCapacityCalculationReviewOpen(false);
    clearPistonOscillationReviewWindows();
    setHeatCapacityBatchSetupRequestedFileId(null);
    setLogs(createExperimentTutorialLogs(milestone, settingsLanguagePreference));
  };

  tutorialOwnershipAdoptionRef.current = async () => {
    if (window.hardSphereLabWindow || tutorialOwnershipAdoptionPendingRef.current) return;
    if (!tutorialActiveRef.current) {
      setRemoteTutorialOwnerActive(false);
      return;
    }
    const tutorialExperiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!tutorialExperiment) return;
    if (filesRef.current.some((file) => isExperimentTutorialFileId(file.id, tutorialExperiment))) {
      setRemoteTutorialOwnerActive(false);
      return;
    }

    tutorialOwnershipAdoptionPendingRef.current = true;
    try {
      const ordinaryWorkspace = await refreshTutorialOrdinaryWorkspaceFromPersistence();
      if (document.visibilityState === 'hidden') return;
      if (!tutorialActiveRef.current) {
        setRemoteTutorialOwnerActive(false);
        return;
      }
      const stillOwnsTutorial = claimExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        tutorialExperiment,
        window.localStorage,
      );
      if (!stillOwnsTutorial) {
        setRemoteTutorialOwnerActive(true);
        return;
      }

      const currentOrdinaryFile = filesRef.current.find((file) => (
        file.id === activeFileIdRef.current
      ));
      if (currentOrdinaryFile?.kind === 'heatCapacity') {
        suspendActiveHeatCapacityModeForNavigation();
      }
      tutorialOrdinaryWorkspaceRef.current = ordinaryWorkspace;
      const milestone = experienceProfileRef.current.learning[tutorialExperiment];
      replaceVisibleWorkspaceWithExperimentTutorial(tutorialExperiment, milestone);
      const nextNoticeKind: ExperimentTutorialNoticeKind = milestone === 'guide'
        ? 'resume-guide'
        : 'resume-demo';
      tutorialNoticeKindRef.current = nextNoticeKind;
      setTutorialNoticeKind(nextNoticeKind);
      setTutorialOperationError(null);
      setRemoteTutorialOwnerActive(false);
    } catch (cause) {
      try {
        releaseExperimentTutorialOwnership(
          EXPERIMENT_TUTORIAL_INSTANCE_ID,
          window.localStorage,
        );
      } catch {
        // The lease still expires automatically if browser storage is unavailable.
      }
      setRemoteTutorialOwnerActive(false);
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => tutorialOwnershipClaimRef.current(true),
      });
    } finally {
      tutorialOwnershipAdoptionPendingRef.current = false;
    }
  };

  const finalizeExperimentTutorialActivation = async (
    archivedNamespaces: string[],
  ) => {
    const saved = await flushWorkspacePersistenceRef.current();
    if (!saved) {
      setTutorialOperationError({
        message: settingsLanguagePreference === 'en'
          ? 'The saved experiment files could not be moved into the tutorial-safe cache yet.'
          : settingsLanguagePreference === 'zh-TW'
            ? '已儲存的實驗檔案尚未能移入教學安全快取。'
            : '已保存的实验文件尚未能移入教程安全缓存。',
        retry: () => { void finalizeExperimentTutorialActivation(archivedNamespaces); },
      });
      return false;
    }
    const finalizeActivation = window.hardSphereLabTutorial?.finalizeActivation;
    if (finalizeActivation) {
      const result = await finalizeActivation(archivedNamespaces).catch((cause) => ({
        status: 'error' as const,
        message: cause instanceof Error ? cause.message : String(cause),
      }));
      if (result.status !== 'ok') {
        setTutorialOperationError({
          message: result.message ?? 'Desktop tutorial archive could not be finalized.',
          retry: () => { void finalizeExperimentTutorialActivation(archivedNamespaces); },
        });
        return false;
      }
    }
    setTutorialOperationError(null);
    setTutorialNoticeKind('start-demo');
    return true;
  };

  const startExperimentLearningTutorial = async (
    experiment: ExperimentLearningId,
    sourceProfile: AppExperienceProfile = experienceProfileRef.current,
  ) => {
    if (tutorialActiveRef.current) return;
    const saved = await flushWorkspacePersistenceRef.current();
    if (!saved) {
      setTutorialOperationError({
        message: settingsLanguagePreference === 'en'
          ? 'The current workspace could not be saved. No learning progress was changed.'
          : settingsLanguagePreference === 'zh-TW'
            ? '目前工作區無法安全儲存，學習進度尚未變更。'
            : '当前工作区无法安全保存，学习进度尚未变更。',
        retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
      });
      return;
    }

    try {
      const claimed = claimExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        experiment,
        window.localStorage,
      );
      if (!claimed) {
        setRemoteTutorialOwnerActive(true);
        return;
      }
    } catch (cause) {
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
      });
      return;
    }

    let archivedNamespaces: string[] = [];
    const desktopTutorialActivation = window.hardSphereLabTutorial?.activate?.();
    if (desktopTutorialActivation) {
      const activationResult = await desktopTutorialActivation.catch((cause) => ({
        status: 'error' as const,
        message: cause instanceof Error ? cause.message : String(cause),
      }));
      if (activationResult.status !== 'ok') {
        releaseExperimentTutorialOwnership(EXPERIMENT_TUTORIAL_INSTANCE_ID, window.localStorage);
        setTutorialOperationError({
          message: activationResult.message ?? 'Desktop tutorial lock could not be acquired.',
          retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
        });
        return;
      }
      archivedNamespaces = activationResult.archivedNamespaces ?? [];
    }

    const currentOrdinaryFile = filesRef.current.find((file) => (
      file.id === activeFileIdRef.current
    ));
    if (currentOrdinaryFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    const ordinaryWorkspace: TutorialOrdinaryWorkspace = {
      files: cloneWorkbenchFiles(filesRef.current),
      closedFiles: cloneWorkbenchFiles(closedFilesRef.current),
      activeFileId: activeFileIdRef.current,
      selectedPanel: selectedPanelRef.current,
    };
    let mergedOrdinaryWorkspace: TutorialOrdinaryWorkspace;
    try {
      mergedOrdinaryWorkspace = await mergeArchivedNamespacesIntoTutorialWorkspace(
        ordinaryWorkspace,
        archivedNamespaces,
      );
    } catch (cause) {
      void window.hardSphereLabTutorial?.deactivate?.();
      releaseExperimentTutorialOwnership(EXPERIMENT_TUTORIAL_INSTANCE_ID, window.localStorage);
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
      });
      return;
    }

    const nextProfile = startExperimentTutorialProfile(sourceProfile, experiment);
    if (!commitExperienceProfile(nextProfile)) {
      setTutorialOperationError((current) => current
        ? { ...current, retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); } }
        : current);
      void window.hardSphereLabTutorial?.deactivate?.();
      releaseExperimentTutorialOwnership(EXPERIMENT_TUTORIAL_INSTANCE_ID, window.localStorage);
      return;
    }

    tutorialOrdinaryWorkspaceRef.current = mergedOrdinaryWorkspace;
    setTutorialOperationError(null);
    setRemoteTutorialOwnerActive(false);
    hideGeneralSettings();
    replaceVisibleWorkspaceWithExperimentTutorial(experiment, 'demo');
    await finalizeExperimentTutorialActivation(archivedNamespaces);
  };

  const requestResetExperimentLearning = (experiment: ExperimentLearningId) => {
    if (!guardWorkbenchTutorialAction('reset-learning')) return;
    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    const experimentName = firstRunCopies[settingsLanguagePreference].needs.experimentNames[experiment];
    requestPromptConfirmation({
      id: `reset-${experiment}-learning-progress`,
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: settingsLanguagePreference === 'en'
        ? `Restart the ${experimentName} learning flow?`
        : settingsLanguagePreference === 'zh-TW'
          ? `重新開始「${experimentName}」學習流程？`
          : `重新开始“${experimentName}”学习流程？`,
      body: copy.resetBody,
      consequence: copy.resetConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirmReset,
      closeLabel: copy.cancel,
      onConfirm: () => { void startExperimentLearningTutorial(experiment); },
    });
  };

  const closeLearningExperienceOverlay = () => {
    setProductIntroReplayPhase(null);
    setLearningNeedsReselectOpen(false);
    setLearningNeedsDraft({ heatCapacity: null, pistonOscillation: null });
    resumeDesktopExitQuiescenceRef.current();
  };

  const openProductIntroReplay = () => {
    if (!guardWorkbenchTutorialAction('replay-product-intro')) return;
    prepareDesktopExitQuiescenceRef.current(false);
    hideGeneralSettings();
    setLearningNeedsReselectOpen(false);
    setProductIntroReplayPhase('welcome');
  };

  const openLearningNeedsReselect = () => {
    if (!guardWorkbenchTutorialAction('reselect-learning-needs')) return;
    prepareDesktopExitQuiescenceRef.current(false);
    hideGeneralSettings();
    setProductIntroReplayPhase(null);
    const profile = experienceProfileRef.current;
    setLearningNeedsDraft({
      heatCapacity: profile.needs.heatCapacity,
      pistonOscillation: profile.needs.pistonOscillation,
    });
    setLearningNeedsReselectOpen(true);
  };

  const submitLearningNeedsReselect = () => {
    if (Object.values(learningNeedsDraft).some((answer) => answer === null)) return;
    const current = experienceProfileRef.current;
    const nextProfile: AppExperienceProfile = {
      ...current,
      needs: {
        ...current.needs,
        heatCapacity: learningNeedsDraft.heatCapacity,
        pistonOscillation: learningNeedsDraft.pistonOscillation,
      },
      learning: {
        heatCapacity: learningNeedsDraft.heatCapacity === 'known' ? 'unlocked' : 'demo',
        pistonOscillation: learningNeedsDraft.pistonOscillation === 'known' ? 'unlocked' : 'demo',
      },
      activeTutorialExperiment: null,
    };
    const firstTutorialExperiment = EXPERIMENT_LEARNING_ORDER.find((experiment) => (
      nextProfile.needs[experiment] === 'needs-guidance'
    )) ?? null;
    if (!firstTutorialExperiment) {
      if (commitExperienceProfile(nextProfile)) closeLearningExperienceOverlay();
      return;
    }

    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    requestPromptConfirmation({
      id: 'reselect-experiment-learning-needs',
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: settingsLanguagePreference === 'en'
        ? 'Start the selected learning flows?'
        : settingsLanguagePreference === 'zh-TW'
          ? '開始所選的學習流程？'
          : '开始所选的学习流程？',
      body: copy.resetBody,
      consequence: copy.resetConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirmReset,
      closeLabel: copy.cancel,
      onConfirm: () => {
        closeLearningExperienceOverlay();
        void startExperimentLearningTutorial(firstTutorialExperiment, nextProfile);
      },
    });
  };

  const requestSimulateFirstRun = () => {
    if (!import.meta.env.DEV || !guardWorkbenchTutorialAction('reset-learning')) return;
    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    requestPromptConfirmation({
      id: 'simulate-first-run-experience',
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: copy.simulateFirstRunTitle,
      body: copy.simulateFirstRunBody,
      consequence: copy.resetConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirmSimulateFirstRun,
      closeLabel: copy.cancel,
      onConfirm: () => {
        const simulate = async () => {
          hideGeneralSettings();
          prepareDesktopExitQuiescenceRef.current();
          const saved = await flushWorkspacePersistenceRef.current();
          if (!saved) {
            resumeDesktopExitQuiescenceRef.current();
            setTutorialOperationError({
              message: settingsLanguagePreference === 'en'
                ? 'The current workspace could not be saved. First-run state was not changed.'
                : settingsLanguagePreference === 'zh-TW'
                  ? '目前工作區無法安全儲存，首次啟動狀態尚未變更。'
                  : '当前工作区无法安全保存，首次启动状态尚未变更。',
              retry: () => { void simulate(); },
            });
            return;
          }
          try {
            window.localStorage.removeItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY);
            const handoffClear = clearExperimentTutorialHandoff(window.localStorage);
            if (handoffClear.ok === false) throw handoffClear.error;
            window.location.reload();
          } catch (cause) {
            resumeDesktopExitQuiescenceRef.current();
            setTutorialOperationError({
              message: cause instanceof Error ? cause.message : String(cause),
              retry: () => { void simulate(); },
            });
          }
        };
        void simulate();
      },
    });
  };



  const handleExperimentTutorialNoticeAction = () => {
    const noticeKind = tutorialNoticeKindRef.current;
    if (!noticeKind) return;
    tutorialNoticeKindRef.current = null;
    setTutorialNoticeKind(null);
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!experiment) return;
    if (noticeKind === 'start-demo' || noticeKind === 'resume-demo') {
      window.requestAnimationFrame(() => {
        if (experiment === 'heatCapacity') activateHeatCapacityModeFromExplore('demo');
        else activatePistonOscillationTutorialMode('demo');
      });
      return;
    }
    if (noticeKind === 'resume-guide') {
      window.requestAnimationFrame(() => {
        if (experiment === 'heatCapacity') activateHeatCapacityModeFromExplore('guide');
        else activatePistonOscillationTutorialMode('guide');
      });
    }
  };

  const advanceExperimentTutorialToGuide = (experiment: ExperimentLearningId) => {
    const currentProfile = experienceProfileRef.current;
    const guideProfile = unlockExperimentGuideProfile(currentProfile, experiment);
    if (!guideProfile) return;
    if (!commitExperienceProfile(guideProfile)) {
      setTutorialOperationError((current) => current
        ? { ...current, retry: () => advanceExperimentTutorialToGuide(experiment) }
        : current);
      return;
    }
    setLogs(createExperimentTutorialLogs('guide', settingsLanguagePreference));
    tutorialGuideUnlockPendingRef.current = true;
    if (experiment === 'heatCapacity') {
      switchHeatCapacityMode('guide', 'mode-control', true);
    } else {
      activatePistonOscillationTutorialMode('guide');
    }
  };

  useEffect(() => {
    if (!tutorialActive) return;
    if (activeTutorialExperiment !== 'heatCapacity') return;
    if (experienceProfile.learning.heatCapacity !== 'demo') return;
    if (!isExperimentTutorialFileId(activeFile.id, 'heatCapacity')) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'demo') return;
    if (activeFile.heatCapacityTeachingStatus !== 'completed') return;
    advanceExperimentTutorialToGuide('heatCapacity');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityTeachingStatus : null,
    experienceProfile.learning.heatCapacity,
    activeTutorialExperiment,
    tutorialActive,
  ]);

  useEffect(() => {
    if (!tutorialActive || activeTutorialExperiment !== 'pistonOscillation') return;
    if (experienceProfile.learning.pistonOscillation !== 'demo') return;
    if (!isExperimentTutorialFileId(activeFile.id, 'pistonOscillation')) return;
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation' ||
      activeFile.pistonOscillationDemoSession.status !== 'completed'
    ) return;
    advanceExperimentTutorialToGuide('pistonOscillation');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationDemoSession.status
      : null,
    activeTutorialExperiment,
    experienceProfile.learning.pistonOscillation,
    tutorialActive,
  ]);

  useEffect(() => {
    if (!tutorialGuideUnlockPendingRef.current) return;
    if (!tutorialActive || activeTutorialExperiment === null) return;
    if (experienceProfile.learning[activeTutorialExperiment] !== 'guide') return;
    if (activeTutorialExperiment === 'heatCapacity') {
      if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
      if (heatCapacityModeTransitionState.phase !== 'idle') return;
    } else if (
      activeFile.kind !== 'heatCapacityPistonOscillation' ||
      activeFile.pistonOscillationGuideSession.status !== 'active'
    ) return;
    tutorialGuideUnlockPendingRef.current = false;
    tutorialNoticeKindRef.current = 'guide-unlocked';
    setTutorialNoticeKind('guide-unlocked');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationGuideSession.status
      : null,
    activeTutorialExperiment,
    experienceProfile.learning.heatCapacity,
    experienceProfile.learning.pistonOscillation,
    heatCapacityModeTransitionState.phase,
    tutorialActive,
  ]);

  const finalizeCompletedExperimentTutorialHandoff = async () => {
    const saved = await flushWorkspacePersistenceRef.current();
    if (!saved) {
      setTutorialOperationError({
        message: settingsLanguagePreference === 'en'
          ? 'The unlocked experiment file could not be saved yet.'
          : settingsLanguagePreference === 'zh-TW'
            ? '解鎖後的新實驗檔案尚未能安全儲存。'
            : '解锁后的新实验文件尚未能安全保存。',
        retry: () => { void finalizeCompletedExperimentTutorialHandoff(); },
      });
      return false;
    }
    const cleared = clearExperimentTutorialHandoff();
    if (cleared.ok === false) {
      setTutorialOperationError({
        message: cleared.error.message,
        retry: () => { void finalizeCompletedExperimentTutorialHandoff(); },
      });
      return false;
    }
    try {
      releaseExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        window.localStorage,
      );
    } catch {
      // The persistent milestone and ordinary file are already safe.
    }
    void window.hardSphereLabTutorial?.deactivate?.();
    setTutorialOperationError(null);
    setTutorialNoticeKind('all-unlocked');
    return true;
  };

  const handoffUnlockedExperimentTutorial = async (
    completedExperiment: ExperimentLearningId,
    unlockedProfile: AppExperienceProfile,
    retry: () => void,
  ) => {
    const nextTutorialExperiment = unlockedProfile.activeTutorialExperiment;
    if (nextTutorialExperiment) {
      try {
        const ownershipTransferred = takeOverExperimentTutorialOwnership(
          EXPERIMENT_TUTORIAL_INSTANCE_ID,
          nextTutorialExperiment,
          window.localStorage,
        );
        if (!ownershipTransferred) {
          throw new Error('Tutorial ownership could not be transferred to the next experiment.');
        }
      } catch (cause) {
        setTutorialOperationError({
          message: cause instanceof Error ? cause.message : String(cause),
          retry,
        });
        return false;
      }
      if (!commitExperienceProfile(unlockedProfile)) {
        setTutorialOperationError((current) => current ? { ...current, retry } : current);
        return false;
      }
      replaceVisibleWorkspaceWithExperimentTutorial(nextTutorialExperiment, 'demo');
      tutorialNoticeKindRef.current = 'start-demo';
      setTutorialNoticeKind('start-demo');
      setTutorialOperationError(null);
      return true;
    }

    const ordinaryWorkspace = tutorialOrdinaryWorkspaceRef.current ?? {
      files: [] as WorkbenchFileState[],
      closedFiles: [] as WorkbenchFileState[],
      activeFileId: '',
      selectedPanel: 'preview' as WorkbenchPanelKey,
    };
    const ordinaryFiles = cloneWorkbenchFiles([
      ...ordinaryWorkspace.files,
      ...ordinaryWorkspace.closedFiles,
    ]).map((file) => (
      file.kind === 'heatCapacity'
        ? prepareHeatCapacityFileForExploreOnOpen(
            file,
            createDefaultHeatCapacityFile(1),
            Date.now(),
          )
        : file.runState === 'running'
          ? { ...file, runState: 'paused' as const, updatedAt: Date.now() }
          : file
    ));
    const uniqueOrdinaryFiles = ordinaryFiles.filter((file, index, collection) => (
      collection.findIndex((candidate) => candidate.id === file.id) === index &&
      !isExperimentTutorialFileId(file.id)
    ));
    const completedFileKind: WorkbenchFileKind = completedExperiment === 'heatCapacity'
      ? 'heatCapacity'
      : 'heatCapacityPistonOscillation';
    const index = getNextWorkbenchFileDisplayIndex(completedFileKind, uniqueOrdinaryFiles);
    const freshFileId = createUniqueWorkbenchFileId(
      completedFileKind,
      issuedWorkbenchFileIdsRef.current,
    );
    issuedWorkbenchFileIdsRef.current.add(freshFileId);
    const freshFile: WorkbenchFileState = completedExperiment === 'heatCapacity'
      ? enterHeatCapacityExploreModeWorkbenchState({
          ...createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity),
          id: freshFileId,
        }, createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity))
      : {
          ...createDefaultHeatCapacityPistonOscillationFile(
            index,
            workbenchLayoutDefaults.heatCapacityPistonOscillation,
          ),
          id: freshFileId,
        };

    const handoffResult = persistExperimentTutorialHandoff(completedExperiment, freshFileId);
    if (handoffResult.ok === false) {
      setTutorialOperationError({
        message: handoffResult.error.message,
        retry,
      });
      return false;
    }
    const persistResult = persistAppExperienceProfile(unlockedProfile);
    if (persistResult.ok === false) {
      clearExperimentTutorialHandoff();
      setTutorialOperationError({
        message: persistResult.error.message,
        retry,
      });
      return false;
    }

    if (completedExperiment === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
      resetHeatCapacitySceneUiState();
    } else {
      clearPistonOscillationTutorialPlayback();
    }
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections([freshFile], uniqueOrdinaryFiles, freshFile.id);
    if (completedExperiment === 'heatCapacity') {
      applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: null });
    }
    setSelectedPanel('preview');
    setSelectedFileId(freshFile.id);
    setParametersCollapsed(false);
    setLogs(createExperimentTutorialLogs('unlocked', settingsLanguagePreference));

    tutorialOrdinaryWorkspaceRef.current = null;
    experienceProfilePersistedRef.current = true;
    experienceProfileRef.current = persistResult.profile;
    tutorialActiveRef.current = false;
    setExperienceProfile(persistResult.profile);
    experimentLearningChannelRef.current?.publish(persistResult.profile);
    await finalizeCompletedExperimentTutorialHandoff();
    return true;
  };

  const completeExperimentLearningTutorial = async (experiment: ExperimentLearningId) => {
    const completedProfile = completeExperimentTutorialProfile(
      experienceProfileRef.current,
      experiment,
    );
    if (!completedProfile) return false;
    return handoffUnlockedExperimentTutorial(
      experiment,
      completedProfile,
      () => { void completeExperimentLearningTutorial(experiment); },
    );
  };

  const exitExperimentLearningTutorial = async () => {
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!experiment) return false;
    const skippedProfile = skipExperimentTutorialProfile(experienceProfileRef.current, experiment);
    if (!skippedProfile) return false;
    hideGeneralSettings();
    return handoffUnlockedExperimentTutorial(
      experiment,
      skippedProfile,
      () => { void exitExperimentLearningTutorial(); },
    );
  };

  const requestExitExperimentLearningTutorial = () => {
    if (!guardWorkbenchTutorialAction('exit-tutorial')) return;
    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    const experimentName = experiment
      ? firstRunCopies[settingsLanguagePreference].needs.experimentNames[experiment]
      : '';
    const exitPreview = experiment
      ? skipExperimentTutorialProfile(experienceProfileRef.current, experiment)
      : null;
    const nextTutorialExperiment = exitPreview?.activeTutorialExperiment ?? null;
    const nextExperimentName = nextTutorialExperiment
      ? firstRunCopies[settingsLanguagePreference].needs.experimentNames[nextTutorialExperiment]
      : null;
    requestPromptConfirmation({
      id: 'exit-experiment-learning-tutorial',
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: settingsLanguagePreference === 'en'
        ? `Exit the ${experimentName} learning flow?`
        : settingsLanguagePreference === 'zh-TW'
          ? `退出「${experimentName}」學習流程？`
          : `退出“${experimentName}”学习流程？`,
      body: nextExperimentName
        ? settingsLanguagePreference === 'en'
          ? `This tutorial will end and all ${experimentName} modes will unlock. The ${nextExperimentName} tutorial will begin next.`
          : settingsLanguagePreference === 'zh-TW'
            ? `目前教學將結束並解鎖「${experimentName}」的全部模式，接著開始「${nextExperimentName}」教學。`
            : `当前教程将结束并解锁“${experimentName}”的全部模式，随后开始“${nextExperimentName}”教程。`
        : copy.exitTutorialBody,
      consequence: nextExperimentName
        ? settingsLanguagePreference === 'en'
          ? 'Existing files remain safe and will become available after the remaining learning flow ends.'
          : settingsLanguagePreference === 'zh-TW'
            ? '現有檔案不會遺失，完成剩餘學習流程後即可重新開啟。'
            : '现有文件不会丢失，完成剩余学习流程后即可重新打开。'
        : copy.exitTutorialConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: nextExperimentName
        ? settingsLanguagePreference === 'en'
          ? 'Exit and continue'
          : settingsLanguagePreference === 'zh-TW'
            ? '退出並繼續'
            : '退出并继续'
        : copy.confirmExitTutorial,
      closeLabel: copy.cancel,
      onConfirm: () => { void exitExperimentLearningTutorial(); },
    });
  };

  useEffect(() => {
    if (!tutorialActive || activeTutorialExperiment !== 'pistonOscillation') return;
    if (experienceProfile.learning.pistonOscillation !== 'guide') return;
    if (!isExperimentTutorialFileId(activeFile.id, 'pistonOscillation')) return;
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation' ||
      activeFile.pistonOscillationGuideSession.status !== 'completed'
    ) return;
    void completeExperimentLearningTutorial('pistonOscillation');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationGuideSession.status
      : null,
    activeTutorialExperiment,
    experienceProfile.learning.pistonOscillation,
    tutorialActive,
  ]);

  const { createFile, requestCloseWorkbenchFile, openClosedWorkbenchFile, requestDeleteWorkbenchFile, cancelDeleteWorkbenchFile, selectFile } = createWorkbenchFileActions({
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
  });

  const openNewWorkbenchWindow = () => {
    if (!guardWorkbenchTutorialAction('new-window')) return;
    setOpenTopMenu(null);
    const desktopNewWindowRequest = window.hardSphereLabWindow?.newWindow?.();

    if (desktopNewWindowRequest) {
      void desktopNewWindowRequest.then((result) => {
        if (result?.status !== 'ok') {
          window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
        }
      }).catch(() => {
        window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
      });
      return;
    }

    window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
  };

  const closeDesktopWindow = () => {
    const performClose = () => {
      const desktopClose = window.hardSphereLabWindow?.close?.();
      if (!desktopClose) window.close();
    };
    if (!tutorialActiveRef.current) {
      performClose();
      return;
    }
    const isEnglish = settingsLanguagePreference === 'en';
    const isTraditional = settingsLanguagePreference === 'zh-TW';
    requestPromptConfirmation({
      id: 'exit-unfinished-experiment-tutorial',
      tone: 'warning',
      eyebrow: isEnglish ? 'Learning flow active' : isTraditional ? '學習流程進行中' : '学习流程进行中',
      title: isEnglish ? 'Exit the app before finishing this mode?' : isTraditional ? '要在本模式完成前退出軟體嗎？' : '要在本模式完成前退出软件吗？',
      body: isEnglish
        ? 'This mode is not complete. The next launch will restart it from the first step.'
        : isTraditional
          ? '本模式尚未完成，下次進入將從本模式第一步重新開始。'
          : '本模式尚未完成，下次进入将从本模式第一步重新开始。',
      consequence: isEnglish
        ? 'Completed unlock milestones are retained.'
        : isTraditional
          ? '已完成的解鎖節點會保留。'
          : '已完成的解锁节点会保留。',
      cancelLabel: isEnglish ? 'Continue tutorial' : isTraditional ? '繼續教程' : '继续教程',
      confirmLabel: isEnglish ? 'Exit app' : isTraditional ? '退出軟體' : '退出软件',
      closeLabel: isEnglish ? 'Continue tutorial' : isTraditional ? '繼續教程' : '继续教程',
      onConfirm: performClose,
    });
  };

  const openUserGuide = () => {
    setOpenTopMenu(null);
    const desktopUserGuideRequest = window.hardSphereLabUserGuide?.openUserGuide?.(settingsLanguagePreference);

    if (desktopUserGuideRequest) {
      void desktopUserGuideRequest.catch(() => {
        window.open(WORKBENCH_USER_GUIDE_URLS[settingsLanguagePreference], '_blank', 'noopener,noreferrer');
      });
      return;
    }

    window.open(WORKBENCH_USER_GUIDE_URLS[settingsLanguagePreference], '_blank', 'noopener,noreferrer');
  };



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

  const { changeIdealRelation, applyIdealSamplingPreset, clearScanInputError, validateIdealScanDraft, updateIdealScanVariable, commitIdealScanInput, isPointerOnIdealScanThumb, requestRemoveIdealPoint, cancelRemoveIdealPoint, cancelClearIdealRelation, requestClearIdealRelation } = createWorkbenchIdealExperimentActions({
    getActiveFile: () => activeFile, getParameterControlsLocked: () => parameterControlsLocked,
    getScanInputDraft: () => scanInputDraft, getPendingRemovePointId: () => pendingRemovePointId,
    getPendingClearRelationKey: () => pendingClearRelationKey,
    settingsLanguagePreference, captureUndoSnapshot,
    updateActiveFile: (update) => updateActiveFile(update),
    applyActiveFileParams: (params) => applyActiveFileParams(params), showWorkbenchValidationErrors,
    scanInputRef, lastScanInputErrorRef, deferInputFocus: (callback) => { window.setTimeout(callback, 0); },
    setPendingRemovePointId, setPendingClearRelationKey, setSamplingPresetMenuOpen,
    setScanInputError, setParameterErrors, setScanInputToast, setScanInputDraft, setScanInputFocused, pushLog,
  });



























  const { beginRenameFile, selectRenameNumericSuffix, commitRenameFile, cancelRenameFile, commitRenameFileFromOutside } = createWorkbenchFileRenameActions({
    getFiles: () => files, getRenameDraft: () => renameDraft,
    filesRef, renamingFileIdRef, renameSelectionModeRef, guardWorkbenchTutorialAction,
    captureUndoSnapshot, updateFileById: (fileId, update) => updateFileById(fileId, update),
    setOpenFileMenuId, setPendingDeleteFileId, setRenamingFileId, setRenameDraft, pushLog,
  });















  useWorkbenchFileMenuInteractions({
    openTopMenu, openFileMenuId, renamingFileId, renameDraft,
    topMenuRef, topCommandsRef, fileMenuRef, fileMenuButtonRef, renameInputRef,
    setOpenTopMenu, setOpenFileMenuId, setPendingDeleteFileId,
    commitRenameFileFromOutside: () => commitRenameFileFromOutside(),
  });

  const releaseHeatCapacityRuntimeForFileExit = (fileId: string) => {
    if (heatCapacityRuntimeFailureFileIdRef.current === fileId) {
      heatCapacityRuntimeFailureFileIdRef.current = null;
      setHeatCapacityRuntimeFailureFileId((current) => current === fileId ? null : current);
    }
    if (heatCapacityRuntimeRecoveryIntentRef.current?.fileId === fileId) {
      heatCapacityRuntimeRecoveryIntentRef.current = null;
    }
    if (guideHeatCapacityPausedPulseRef.current?.fileId === fileId) {
      guideHeatCapacityPausedPulseRef.current = null;
    }
    const ownsAutoDemo = heatCapacityAutoDemoFileIdRef.current === fileId || heatCapacityAutoDemoPausedFileIdRef.current === fileId;
    const ownsGuideSession = guideHeatCapacityActiveFileId === fileId;
    if (!ownsAutoDemo && !ownsGuideSession && activeFileIdRef.current !== fileId) return;

    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
      heatCapacityRecordControlsClosingTimerRef.current = null;
    }
    setHeatCapacityRecordControlsClosing(null);
    if (heatCapacityResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityResetFeedbackTimerRef.current);
      heatCapacityResetFeedbackTimerRef.current = null;
    }
    setHeatCapacityResetFeedbackActionId(null);
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityToastQueue();
    clearHeatCapacityPressureAlertUiState();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearGuideHeatCapacityGuidance();
    clearGuideHeatCapacityStrongReminder();
    clearGuideHeatCapacityGuidancePulseTimer();
    guideHeatCapacityPausedPulseRef.current = null;
    clearHeatCapacityGuideLessonRuntimeForFileExit();
    setGuideHeatCapacityActiveFileId(null);
    setGuideHeatCapacityFocusControlId(null);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityRollback(null);
    heatCapacityFocusSessionRef.current = null;
  };

















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
      setHoveredHeatCapacityParamHelpId={setHoveredHeatCapacityParamHelpId}
      hideHeatCapacityHoverTooltip={hideHeatCapacityHoverTooltip}
      pinnedHeatCapacityParamHelpId={pinnedHeatCapacityParamHelpId}
      setHeatCapacityParamHelpPopoverStyle={setHeatCapacityParamHelpPopoverStyle}
      updateHeatCapacityParamHelpPopoverStyle={updateHeatCapacityParamHelpPopoverStyle}
      setPinnedHeatCapacityParamHelpId={setPinnedHeatCapacityParamHelpId}
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
      setHoveredHeatCapacityParamHelpId={setHoveredHeatCapacityParamHelpId}
      hideHeatCapacityHoverTooltip={hideHeatCapacityHoverTooltip}
      pinnedHeatCapacityParamHelpId={pinnedHeatCapacityParamHelpId}
      setHeatCapacityParamHelpPopoverStyle={setHeatCapacityParamHelpPopoverStyle}
      updateHeatCapacityParamHelpPopoverStyle={updateHeatCapacityParamHelpPopoverStyle}
      setPinnedHeatCapacityParamHelpId={setPinnedHeatCapacityParamHelpId}
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
      setHeatCapacityBasicInputDrafts={setHeatCapacityBasicInputDrafts}
      setHeatCapacityAdvancedInputDrafts={setHeatCapacityAdvancedInputDrafts}
      settingsLanguagePreference={settingsLanguagePreference}
      renderHeatCapacityParameterLabel={renderHeatCapacityParameterLabel}
      setHeatCapacityBasicInputErrors={setHeatCapacityBasicInputErrors}
      setHeatCapacityAdvancedInputErrors={setHeatCapacityAdvancedInputErrors}
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

  const showHeatCapacityGasTypeLockHint = () => {
              const message = heatCapacityFreeSharedText.gasTypeLocked[settingsLanguagePreference];
              setScanInputToast(message);
              pushLog(
                (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.gasTypeLocked[language]}`,
                'warning',
              );
              return;
            };

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

  const toggleTopCommandMenu = (menu: Exclude<WorkbenchTopMenuId, null>, left: number) => {
    setTopMenuLeft(left);
    setOpenTopMenu((current) => (current === menu ? null : menu));
  };

  const handleHeatCapacityModeSegmentClick = (mode: HeatCapacityMode) => {
    if (activeFile.kind !== 'heatCapacity') return;
    const heatCapacityActiveMode = activeFile.heatCapacityMode;
    const tutorialMilestone = experienceProfile.learning.heatCapacity;
    const heatCapacityTutorialActive = tutorialActive && activeTutorialExperiment === 'heatCapacity';
    const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
      if (
        heatCapacityTutorialActive &&
        !isExperimentTutorialModeUnlocked(tutorialMilestone, mode)
      ) {
        setTutorialBlockedNoticeOpen(true);
        return;
      }
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
        switchHeatCapacityMode(mode);
        return;
      }
      if (heatCapacityTeachingCompleted && heatCapacityActiveMode === mode) {
        showHeatCapacityTeachingCompletedLockedInteraction();
        return;
      }
      if (mode === 'free') {
        if (!activeHeatCapacityFreeBatchProgress?.configured) {
          const openFreeBatchSetup = () => {
            if (
              heatCapacityActiveMode !== null &&
              !exitHeatCapacityFormalModeToExplore(heatCapacityActiveMode)
            ) return;
            setHeatCapacityBatchSetupSelection(null);
            setHeatCapacityBatchSetupRequestedFileId(activeFile.id);
          };
          if (
            heatCapacityActiveMode !== null &&
            shouldConfirmHeatCapacityTeachingProgressReset(activeFile, 'free')
          ) {
            requestHeatCapacityTeachingProgressReset(openFreeBatchSetup);
            return;
          }
          openFreeBatchSetup();
        } else if (heatCapacityActiveMode === null) {
          if (activeHeatCapacityFreeBatchProgress.configured) {
            activateHeatCapacityModeFromExplore('free');
          }
        } else if (heatCapacityActiveMode !== 'free' || autoDemoInteractionLocked) {
          switchHeatCapacityMode('free', 'mode-control');
        }
        return;
      }
      if (heatCapacityActiveMode === null) {
        activateHeatCapacityModeFromExplore(mode);
        return;
      }
      if (heatCapacityActiveMode !== mode) {
        switchHeatCapacityMode(mode, 'mode-control');
      }
    };

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

  const renderPreviewPanel = () => (
    <div
      className={`studio-preview ${
        activeFile.kind === 'heatCapacity'
          ? 'studio-preview-heat-capacity'
          : activeFile.kind === 'heatCapacityPistonOscillation'
            ? 'studio-preview-piston-oscillation'
            : ''
      }`}
    >
      <div
        className={`studio-preview-stage ${
          activeFile.kind === 'heatCapacity'
            ? 'studio-heat-preview-stage'
            : activeFile.kind === 'heatCapacityPistonOscillation'
              ? 'studio-piston-oscillation-preview-stage'
              : ''
        }`}
      >
        {activeFile.kind === 'heatCapacity' ? (
          <div
            className="studio-heat-preview-mount"
            aria-label={activeHeatCapacityPreviewMountAria}
            data-heat-capacity-preview-mount="true"
            onPointerDownCapture={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              if (target?.closest('[data-heat-capacity-hard-sphere-toggle="true"]')) return;
              if (autoDemoInteractionLocked) scheduleHeatCapacityAutoDemoLockedPointerToast();
            }}
            onWheelCapture={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              if (target?.closest('[data-heat-capacity-hard-sphere-toggle="true"]')) return;
              if (autoDemoInteractionLocked) scheduleHeatCapacityAutoDemoLockedPointerToast();
            }}
          >
            {(() => {
              const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
              const activeHeatCapacityDisplay = selectActiveHeatCapacityWorkbenchDisplay(activeFile);
              const activeHeatCapacityUsesPhysicalKernel = isHeatCapacityPhysicalKernelMode(activeFile.heatCapacityMode);
              const heatCapacityDisplayPhase = activeHeatCapacityUsesPhysicalKernel
                ? getHeatCapacityFreeDisplayPhase(activeFile)
                : activeFile.heatCapacityPhase;
              const guideRecordU0ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u0')
                : null;
              const guideRecordU1ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u1')
                : null;
              const guideRecordU2ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u2')
                : null;
              const activeGuideRecordKind: HeatCapacityGuideRecordKind | null =
                guideHeatCapacityActiveFileId === activeFile.id &&
                activeFile.heatCapacityMode === 'guide' &&
                !autoDemoInteractionLocked
                  ? guideRecordU0ButtonState?.visible
                    ? 'u0'
                    : guideRecordU1ButtonState?.visible
                      ? 'u1'
                      : guideRecordU2ButtonState?.visible
                        ? 'u2'
                        : null
                  : null;
              const getGuideRecordLabel = (kind: HeatCapacityGuideRecordKind) => (
                kind === 'u0'
                  ? heatCapacityRealtimeCopy.recordU0
                  : kind === 'u1'
                    ? heatCapacityRealtimeCopy.recordU1
                    : heatCapacityRealtimeCopy.recordU2
              );
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
              const heatCapacityActiveSpeedMultiplier = activeFile.heatCapacityMode === 'demo'
                ? HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER
                : activeFile.heatCapacityMode === 'guide'
                  ? activeFile.heatCapacityGuideWorkflow.speedMultiplier
                  : activeFile.heatCapacityFreeEquilibriumSpeedMultiplier;
              const heatCapacityFreeActiveTrialIndex = activeFile.heatCapacityMode === 'free'
                ? getActiveHeatCapacityFreeTrialIndex(activeFile)
                : -1;
              const heatCapacityFreeActiveTrial = heatCapacityFreeActiveTrialIndex >= 0
                ? activeFile.heatCapacityFreeRunWorkspace.trials[heatCapacityFreeActiveTrialIndex] ?? null
                : null;
              const heatCapacityAutoDemoElapsedMs = activeFile.heatCapacityMode === 'demo'
                ? autoDemoRunning
                  ? heatCapacityRefreshRestoring &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id &&
                    initialHeatCapacityRefreshSession.mode === 'demo'
                    ? initialHeatCapacityRefreshSession.demo.elapsedMs
                    : desktopExitQuiesced && desktopExitAutoDemoClockRef.current?.fileId === activeFile.id
                      ? desktopExitAutoDemoClockRef.current.elapsedMs
                      : Math.max(0, autoDemoTimelineClockMs - heatCapacityAutoDemoStartedAtMsRef.current)
                  : autoDemoPaused
                    ? heatCapacityAutoDemoPausedElapsedMsRef.current
                    : 0
                : 0;
              const heatCapacityAutoDemoZeroKnobMotion = activeFile.heatCapacityMode === 'demo'
                ? deriveHeatCapacityAutoDemoZeroKnobMotion(
                    heatCapacityAutoDemoTimelineRef.current,
                    heatCapacityAutoDemoElapsedMs,
                    activeFile.pressureZeroKnobAngle,
                  )
                : {
                    angleDeg: activeFile.pressureZeroKnobAngle,
                    progress: 1,
                    timelineDriven: false,
                  };
              const heatCapacityAutoDemoWaitTimer = activeFile.heatCapacityMode === 'demo'
                ? deriveHeatCapacityAutoDemoWaitTimer(
                    heatCapacityAutoDemoTimelineRef.current,
                    heatCapacityAutoDemoElapsedMs,
                  )
                : null;
              const heatCapacityWorkflowWaitTimer = activeFile.heatCapacityMode === 'guide'
                ? deriveHeatCapacityGuideExperimentTimer(
                    activeFile.heatCapacityGuideWorkflow,
                    activeFile.heatCapacityGuidePhysicsState.simulationTimeS,
                  )
                : activeFile.heatCapacityMode === 'free'
                  ? deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(activeFile)
                  : null;
              const heatCapacityWaitTimer = heatCapacityAutoDemoWaitTimer
                ? {
                    stage: heatCapacityAutoDemoWaitTimer.stage === 'u1' ? 'u1-wait' as const : 'u2-wait' as const,
                    elapsedS: heatCapacityAutoDemoWaitTimer.elapsedS,
                    targetS: heatCapacityAutoDemoWaitTimer.targetS,
                  }
                : heatCapacityWorkflowWaitTimer;
              const heatCapacityWaitTimerDisplay =
                heatCapacityWaitTimer?.stage === 'u1-wait' ||
                heatCapacityWaitTimer?.stage === 'u2-wait' ||
                heatCapacityWaitTimer?.stage === 'u1-ready' ||
                heatCapacityWaitTimer?.stage === 'u2-ready'
                  ? {
                      label: heatCapacityWaitTimer.stage === 'u1-wait' || heatCapacityWaitTimer.stage === 'u1-ready'
                        ? heatCapacityRealtimeCopy.freeWaitTimerLabel.u1
                        : heatCapacityRealtimeCopy.freeWaitTimerLabel.u2,
                      statusText: heatCapacityWaitTimer.stage === 'u1-wait' || heatCapacityWaitTimer.stage === 'u1-ready'
                        ? activeFile.heatCapacityMode !== 'free'
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                          : heatCapacityFreeActiveTrial?.u1
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.rerecord
                          : heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                        : activeFile.heatCapacityMode !== 'free'
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                          : heatCapacityFreeActiveTrial?.u2
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.rerecord
                          : heatCapacityRealtimeCopy.freeWaitRecordStatus.pending,
                    }
                  : null;
              const heatCapacitySpeedOptionsDisabled = activeFile.heatCapacityMode === 'demo' || (
                activeFile.heatCapacityMode === 'guide' &&
                (heatCapacityWaitTimer?.stage === 'u1-ready' || heatCapacityWaitTimer?.stage === 'u2-ready')
              );
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
              const freeRecordU0ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u0')
                : null;
              const freeRecordU1ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u1')
                : null;
              const freeRecordU2ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u2')
                : null;
              const freeRecordControlsVisible = [
                freeRecordU0ButtonState,
                freeRecordU1ButtonState,
                freeRecordU2ButtonState,
              ].some((state) => state?.visible === true);
              const renderFreeRecordButton = (
                kind: 'u0' | 'u1' | 'u2',
                state: NonNullable<typeof freeRecordU0ButtonState>,
              ) => {
                if (!state.visible) return null;
                const suffix = kind === 'u0' ? 'U₀' : kind === 'u1' ? 'U₁' : 'U₂';
                const label = `${state.mode === 'rerecord' ? '重新记录' : '记录'} ${suffix}`;
                return (
                  <button
                    type="button"
                    data-heat-capacity-free-record={kind}
                    onClick={() => recordFreeHeatCapacitySample(kind)}
                  >
                    {renderScientificText(label)}
                  </button>
                );
              };
              const heatCapacityBottomRightOverlay = activeHeatCapacityModalLocked ? null : (
                <WorkbenchHeatCapacityRecordControls
      activeFile={activeFile}
      freeRecordControlsVisible={freeRecordControlsVisible}
      freeRecordU0ButtonState={freeRecordU0ButtonState}
      renderFreeRecordButton={renderFreeRecordButton}
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
              const heatCapacityGuideStrongTargetSpec = guideHeatCapacityStrongReminderActive
                ? getHeatCapacityGuideStrongTargetSpec(guideHeatCapacityStrongReminderControlId)
                : null;
              const heatCapacityGuideFocusMode = heatCapacityGuideStrongTargetSpec?.focusMode ?? null;
              const heatCapacityGuideCutouts = heatCapacityGuideStrongTargetSpec
                ? getHeatCapacityGuideStrongCutouts(
                  heatCapacityGuideStrongTargetSpec,
                  heatCapacityGuideProjectedHoles,
                  heatCapacityGuideMaskRef.current,
                  heatCapacityGuideMaskBounds,
                )
                : [];
              const heatCapacityGuideDimPath = createHeatCapacityGuideStrongDimPath(
                heatCapacityGuideMaskBounds,
                heatCapacityGuideCutouts,
              );
              const heatCapacityGuideStrongReminderText = heatCapacityGuideStrongTargetSpec
                ? heatCapacityRealtimeCopy[heatCapacityGuideStrongTargetSpec.reminderCopyKey ?? 'guideStrongReminder']
                : heatCapacityRealtimeCopy.guideStrongReminder;
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
              const heatCapacityHardSphereGasTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentState.physics.gasTemperatureK
                  : activeFile.gasTemperatureK;
              const heatCapacityHardSphereAmbientTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentConfig.physics.environment.ambientTemperatureK
                  : activeFile.ambientTemperatureK;
              const heatCapacityHardSphereGasAmountRatio = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasAmountRatio
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentState.physics.gasAmountRatio
                  : clampHeatCapacityHardSphereNumber(
                      (Math.max(0.001, activeFile.gasPressureKPaAbs) / Math.max(0.001, activeFile.ambientPressureKPa)) *
                        (Math.max(1, heatCapacityHardSphereAmbientTemperatureK) / Math.max(1, heatCapacityHardSphereGasTemperatureK)),
                      0.05,
                      2.5,
                    );
              const activeHeatCapacityUsesVisualPhysics = activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide';
              const heatCapacityPhysicalReleaseReference = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.releaseReference
                : activeFile.heatCapacityFreeInstrumentState.physics.releaseReference;
              const heatCapacityPhysicalStopcockFlowOpen =
                isHeatCapacityMainReleaseFlowOpen(activeFile.heatCapacityReleaseState);
              const physicalReleaseFlowActive = activeHeatCapacityUsesVisualPhysics &&
                heatCapacityPhysicalStopcockFlowOpen &&
                heatCapacityPhysicalReleaseReference !== null &&
                activeFile.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA;
              const teachingStopcockFlowOpen = isHeatCapacityReleaseFlowOpen(activeFile.heatCapacityReleaseState);
              const teachingReleaseElapsedS = getHeatCapacityReleaseDurationS(
                activeFile.heatCapacityReleaseState,
                activeFile.simulationTimeS,
              );
              const teachingReleaseFlowActive = !activeHeatCapacityUsesVisualPhysics &&
                isHeatCapacityMainReleaseFlowOpen(activeFile.heatCapacityReleaseState);
              const teachingReleaseProgress = teachingReleaseFlowActive
                ? Math.min(1, Math.max(
                    0,
                    teachingReleaseElapsedS / HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                  ))
                : 0;
              const releaseFlowActive = physicalReleaseFlowActive || teachingReleaseFlowActive;
              const releaseAudioPathOpen = isHeatCapacityReleaseFlowOpen(activeFile.heatCapacityReleaseState);
              const stopcockFlowOpen = activeHeatCapacityUsesVisualPhysics
                ? heatCapacityPhysicalStopcockFlowOpen
                : teachingStopcockFlowOpen;
              const heatCapacityHardSphereReleaseTimeline: HeatCapacityHardSphereReleaseTimeline = (() => {
                const gasAmountRatio = heatCapacityHardSphereGasAmountRatio;
                const pressureFactor = clampHeatCapacityHardSphereNumber(activeFile.pressureDeltaKPa / 6, 0, 1);
                const idleTimeline = {
                  ...HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
                  amountBeforeRatio: gasAmountRatio,
                  amountCurrentRatio: gasAmountRatio,
                  amountTargetRatio: gasAmountRatio,
                  pressureFactor,
                };

                if (activeHeatCapacityUsesVisualPhysics) {
                  const releaseReference = heatCapacityPhysicalReleaseReference;
                  if (
                    heatCapacityPhysicalStopcockFlowOpen &&
                    releaseReference
                  ) {
                    const physicalState = activeFile.heatCapacityMode === 'guide'
                      ? activeFile.heatCapacityGuidePhysicsState
                      : activeFile.heatCapacityFreeInstrumentState.physics;
                    const elapsedS = getHeatCapacityReleaseDurationS(
                      activeFile.heatCapacityReleaseState,
                      physicalState.simulationTimeS,
                    );
                    const progress = releaseReference.reachedAmbientAtS === null
                      ? Math.min(1, Math.max(
                          0,
                          elapsedS / HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                        ))
                      : 1;
                    const gasTemperatureK = Math.max(1, heatCapacityHardSphereGasTemperatureK);
                    const ambientPressureAmountRatio =
                      heatCapacityHardSphereAmbientTemperatureK / gasTemperatureK;
                    return {
                      phase: releaseReference.reachedAmbientAtS === null
                        ? 'main-release'
                        : 'post-release-exchange',
                      elapsedS,
                      responseDelayS: 0,
                      mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                      progress,
                      pressureFactor,
                      amountBeforeRatio: releaseReference.amountBeforeRatio,
                      amountCurrentRatio: gasAmountRatio,
                      amountTargetRatio: ambientPressureAmountRatio,
                    };
                  }

                  if (!heatCapacityPhysicalStopcockFlowOpen && releaseReference?.reachedAmbientAtS === null) {
                    return {
                      ...idleTimeline,
                      phase: 'partial-stopped',
                      responseDelayS: 0,
                      mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                    };
                  }

                  return idleTimeline;
                }

                if (teachingReleaseFlowActive) {
                  const teachingReleaseAmountDelta = 0.018 + pressureFactor * 0.042;
                  return {
                    phase: 'main-release',
                    elapsedS: teachingReleaseElapsedS,
                    responseDelayS: 0,
                    mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                    progress: teachingReleaseProgress,
                    pressureFactor,
                    amountBeforeRatio: gasAmountRatio + teachingReleaseAmountDelta,
                    amountCurrentRatio: gasAmountRatio + teachingReleaseAmountDelta * (1 - teachingReleaseProgress),
                    amountTargetRatio: gasAmountRatio,
                  };
                }

                if (stopcockFlowOpen && activeFile.pressureDeltaKPa <= HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA) {
                  return {
                    ...idleTimeline,
                    phase: 'post-release-exchange',
                    responseDelayS: 0,
                    mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                    progress: 1,
                  };
                }

                return idleTimeline;
              })();
              const activePumpProcesses = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.pumpProcesses
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentState.physics.pumpProcesses ?? []
                  : [];
              const pumpFlowIntensity = Math.min(1.6, activePumpProcesses.reduce((total, process) => (
                total + Math.max(0, 1 - process.appliedProgress)
              ), 0));
              const pumpFlowActive = pumpFlowIntensity > 0 ||
                (!activeHeatCapacityUsesVisualPhysics && activeFile.pumpValveOpen && activeFile.pumpBulbState === 'compressing');
              const heatCapacityHardSpherePaused = desktopExitQuiesced ||
                heatCapacityRefreshRestoring ||
                heatCapacityRuntimeFailureFileId === activeFile.id ||
                activeFile.runState === 'paused' ||
                heatCapacityLessonDialogActive ||
                autoDemoPaused ||
                (activeFile.heatCapacityMode === 'guide' && activeFile.heatCapacityGuideWorkflow.paused);
              const handleHeatCapacitySceneLockedInteraction = (
                message?: string,
                control?: HeatCapacityInstrumentControl,
              ) => {
                cancelHeatCapacityAutoDemoLockedPointerToast();
                if (heatCapacityModeTransitionLocked) return;
                if (activeHeatCapacityModalLocked) return;
                if (heatCapacityTeachingCompleted) {
                  showHeatCapacityTeachingCompletedLockedInteraction(message, control);
                  return;
                }
                showHeatCapacityAutoDemoLockedToast(message);
              };
              const localizedHeatCapacityPumpHint = getLocalizedHeatCapacityPumpHint(
                activeFile.pumpHint,
                settingsLanguagePreference,
              );
              const modeSceneRestoreSession = heatCapacityModeSceneRestoreSession?.fileId === activeFile.id &&
                heatCapacityModeSceneRestoreSession.mode === activeFile.heatCapacityMode
                ? heatCapacityModeSceneRestoreSession
                : null;
              const modeSceneCameraPose: HeatCapacityCameraPose | null = modeSceneRestoreSession?.scene.cameraPose
                ? {
                    position: modeSceneRestoreSession.scene.cameraPose.position,
                    target: modeSceneRestoreSession.scene.cameraPose.target,
                    fov: modeSceneRestoreSession.scene.cameraPose.fovDeg,
                  }
                : null;
              const modeSceneFocusMode: HeatCapacityFocusMode | null = modeSceneRestoreSession
                ? modeSceneRestoreSession.scene.focusMode
                : null;
              const modeSceneCameraTransition = modeSceneRestoreSession
                ? normalizeHeatCapacityCameraTransitionState(modeSceneRestoreSession.scene.cameraTransition)
                : null;
              const modeSceneUltraVisualState = modeSceneRestoreSession
                ? normalizeHeatCapacityUltraVisualState(modeSceneRestoreSession.scene.ultraVisualState)
                : null;
              const modeSceneHardSphereCheckpoint = modeSceneRestoreSession
                ? normalizeHeatCapacityHardSphereVisualCheckpoint(
                    modeSceneRestoreSession.scene.hardSphereVisualCheckpoint,
                    heatCapacityQualityProfile.renderModel === 'ultraGlb' ? 'ultra-cylinder' : 'skeleton-box',
                  )
                : null;
              return (
                <HeatCapacityInstrumentScene
                  key={activeFile.id}
                  sceneFileId={activeFile.id}
                  experimentMode={activeFile.heatCapacityMode}
                  performanceMode={settingsPerformanceMode}
                  sceneTheme={resolvedWorkbenchTheme}
                  language={settingsLanguagePreference}
                  autoDemoActive={autoDemoInteractionLocked}
                  powerOn={activeFile.powerOn}
                  stopcockAngleDeg={activeFile.stopcockAngleDeg}
                  pressureZeroAdjusted={activeFile.pressureZeroAdjusted}
                  pressureZeroKnobAngle={heatCapacityAutoDemoZeroKnobMotion.angleDeg}
                  pressureZeroTimelineDriven={heatCapacityAutoDemoZeroKnobMotion.timelineDriven}
                  pressureZeroTimelineMotionActive={
                    heatCapacityAutoDemoZeroKnobMotion.timelineDriven &&
                    heatCapacityAutoDemoZeroKnobMotion.progress < 1
                  }
                  pressureZeroOffset={activeFile.pressureZeroOffset}
                  pressureZeroDisplayText={activeFile.pressureZeroDisplayText}
                  pressureSignalRawReadoutMv={activeFile.pressureSignalRawReadoutMv}
                  pressureSignalReadoutMv={activeFile.pressureSignalReadoutMv}
                  pressureGaugeDisplayValue={activeFile.pressureGaugeDisplayValue}
                  gaugePressureMinKPa={activeFile.gaugePressureMinKPa}
                  gaugePressureMaxKPa={activeFile.gaugePressureMaxKPa}
                  pressureSafetyThresholdKPa={activeFile.pressureSafetyThresholdKPa}
                  pressureOverLimit={activeFile.pressureOverLimit}
                  pressureZeroAdjustMode={activeFile.pressureZeroAdjustMode}
                  pressureKPa={activeFile.pressureKPa}
                  pressureDeltaKPa={activeFile.pressureDeltaKPa}
                  gasAmountRatio={heatCapacityHardSphereGasAmountRatio}
                  gasTemperatureK={heatCapacityHardSphereGasTemperatureK}
                  ambientTemperatureK={heatCapacityHardSphereAmbientTemperatureK}
                  pressureLimitKPa={activeFile.pressureLimitKPa}
                  pumpValveOpen={activeFile.pumpValveOpen}
                  pumpValveState={activeFile.pumpValveState}
                  pumpBulbState={activeFile.pumpBulbState}
                  pumpPulseId={heatCapacityPumpPulseId}
                  recordPulseId={heatCapacityRecordPulseId}
                  pumpFrequency={activeFile.pumpFrequency}
                  pumpFrequencyStatus={activeFile.pumpFrequencyStatus}
                  pumpHint={localizedHeatCapacityPumpHint}
                  vesselPressureReadoutKPa={activeFile.vesselPressureReadoutKPa}
                  vesselTemperatureReadoutK={activeFile.vesselTemperatureReadoutK}
                  phase={heatCapacityDisplayPhase}
                  temperatureSignalMv={activeFile.powerOn && !activeHeatCapacityPreheatLocked ? activeHeatCapacityDisplay.temperatureMv : null}
                  pressureSignalMv={activeFile.powerOn && !activeHeatCapacityPreheatLocked ? activeHeatCapacityDisplay.pressureMv : null}
                  pressureReleaseBurstActive={releaseFlowActive}
                  releaseFlowActive={releaseFlowActive}
                  releaseAudioPathOpen={releaseAudioPathOpen}
                  releaseTimeline={heatCapacityHardSphereReleaseTimeline}
                  pumpFlowActive={pumpFlowActive}
                  pumpFlowIntensity={pumpFlowIntensity}
                  hardSphereViewEnabled={activeFile.hardSphereViewEnabled}
                  hardSphereViewLocked={heatCapacityModeTransitionLocked}
                  particleMultiplier={heatCapacityQualityProfile.particleMultiplier}
                  speedMultiplier={heatCapacityQualityProfile.speedMultiplier}
                  hardSphereVisualResetKey={heatCapacityHardSphereVisualResetKey}
                  hardSpherePaused={heatCapacityHardSpherePaused}
                  interactionLocked={
                    autoDemoInteractionLocked ||
                    activeHeatCapacityModalLocked ||
                    heatCapacityTeachingCompleted ||
                    heatCapacityModeTransitionLocked ||
                    (
                      activeFile.heatCapacityMode === 'free' &&
                      (
                        activeHeatCapacityCurrentGroup === null ||
                        (
                          activeHeatCapacityCurrentGroup.status !== 'draft' &&
                          activeHeatCapacityCurrentGroup.status !== 'collecting'
                        )
                      )
                    )
                  }
                  cameraInteractionLocked={autoDemoInteractionLocked || heatCapacityModeTransitionLocked}
                  demoFocusControlId={guideHeatCapacityFocusControlId ?? demoFocusControlId}
                  demoFocusPulseActive={demoFocusPulseActive || guideHeatCapacityPulseActive}
                  demoCameraFocusMode={demoCameraFocusMode}
                  demoCameraFocusKey={demoCameraFocusKey}
                  guideRollbackAnimation={guideHeatCapacityRollback?.animation ?? null}
                  guideRollbackKey={guideHeatCapacityRollback?.key ?? 0}
                  focusResetKey={heatCapacityFocusResetKey}
                  overlayTopCenter={heatCapacityTopCenterOverlay}
                  overlayTopRight={heatCapacityTopRightOverlay}
                  overlayBelowDefaultView={
                    activeFile.heatCapacityMode === 'free' &&
                    activeHeatCapacityCurrentGroup !== null &&
                    activeHeatCapacityFreeBatchProgress?.currentGroupNumber !== null
                      ? (
                          <FreeExperimentProgress
                            dataOwner="heat-capacity"
                            label={SHARED_EXPERIMENT_PROGRESS_COPY[
                              settingsLanguagePreference
                            ].heatProgress(
                              activeHeatCapacityFreeBatchProgress.currentGroupNumber,
                              activeHeatCapacityCurrentGroup.targetExperimentCount,
                            )}
                            openMenuLabel={SHARED_EXPERIMENT_PROGRESS_COPY[
                              settingsLanguagePreference
                            ].heatMenu}
                            menuLabel={SHARED_EXPERIMENT_PROGRESS_COPY[
                              settingsLanguagePreference
                            ].heatMenu}
                            disabled={
                              heatCapacityCalculationWindowOpen
                              || activeHeatCapacityGroupProgressStatus === 'awaiting-calculation'
                            }
                            actions={activeHeatCapacityGroupProgressStatus === 'draft'
                              ? [{
                                  id: 'abandon-group-draft',
                                  label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                    settingsLanguagePreference
                                  ].heatAbandon,
                                  icon: 'trash',
                                  onSelect: requestAbandonHeatCapacityFreeGroupDraft,
                                  dataAttribute: {
                                    name: 'data-heat-capacity-group-action',
                                    value: 'abandon',
                                  },
                                }]
                              : activeHeatCapacityGroupProgressStatus === 'collecting'
                                ? [{
                                    id: 'restart-current-experiment',
                                    label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                      settingsLanguagePreference
                                    ].heatRestartRun(
                                      activeHeatCapacityFreeBatchProgress.currentGroupNumber,
                                    ),
                                    icon: 'restart',
                                    onSelect: requestRestartHeatCapacityFreeExperiment,
                                    dataAttribute: {
                                      name: 'data-heat-capacity-group-action',
                                      value: 'restart-experiment',
                                    },
                                  }, {
                                    id: 'restart-experiment-group',
                                    label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                      settingsLanguagePreference
                                    ].heatRestartGroup,
                                    icon: 'restart',
                                    separatorBefore: true,
                                    onSelect: requestRestartHeatCapacityFreeGroup,
                                    dataAttribute: {
                                      name: 'data-heat-capacity-group-action',
                                      value: 'restart-group',
                                    },
                                  }]
                                : []}
                            primaryAction={activeHeatCapacityGroupProgressStatus === 'completed'
                              ? {
                                  id: 'start-next-experiment-group',
                                  label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                    settingsLanguagePreference
                                  ].heatNext,
                                  icon: 'plus',
                                  tone: 'primary',
                                  onSelect: openNextHeatCapacityFreeExperimentGroupSetup,
                                  dataAttribute: {
                                    name: 'data-heat-capacity-next-experiment-group',
                                    value: 'true',
                                  },
                                }
                              : undefined}
                          />
                        )
                      : activeFile.heatCapacityMode === 'free' && activeHeatCapacityCurrentGroup === null
                        ? (
                            <FreeExperimentProgress
                              dataOwner="heat-capacity"
                              primaryAction={{
                                id: 'start-first-experiment-group',
                                label: SHARED_EXPERIMENT_PROGRESS_COPY[
                                  settingsLanguagePreference
                                ].heatFirst,
                                icon: 'plus',
                                tone: 'primary',
                                onSelect: openFirstHeatCapacityFreeExperimentGroupSetup,
                                dataAttribute: {
                                  name: 'data-heat-capacity-empty-group-start',
                                  value: 'true',
                                },
                              }}
                            />
                          )
                        : null
                  }
                  overlayBottomRight={heatCapacityBottomRightOverlay}
                  overlayCenter={heatCapacityCenterOverlay}
                  overlayCenterAboveGuideMask
                  overlayBottomCenter={heatCapacityBottomCenterOverlay}
                  overlayGuideMask={heatCapacityGuideMaskOverlay}
                  guideFocusMode={heatCapacityGuideFocusMode}
                  guideFocusKey={guideHeatCapacityStrongReminderFocusKey}
                  initialCameraPose={
                    modeSceneRestoreSession
                      ? modeSceneCameraPose
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityCameraPose
                      : null
                  }
                  initialFocusMode={
                    modeSceneRestoreSession
                      ? modeSceneFocusMode
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityFocusMode
                      : null
                  }
                  initialCameraTransition={
                    modeSceneRestoreSession
                      ? modeSceneCameraTransition
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityCameraTransition
                      : null
                  }
                  initialUltraVisualState={
                    modeSceneRestoreSession
                      ? modeSceneUltraVisualState
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityUltraVisualState
                      : null
                  }
                  initialHardSphereVisualCheckpoint={
                    modeSceneRestoreSession
                      ? modeSceneHardSphereCheckpoint
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityHardSphereVisualCheckpoint
                      : null
                  }
                  sceneRestoreAcknowledged={heatCapacitySceneRestoreAcknowledged}
                  modeRestoreRequest={heatCapacityModeSceneRestoreRequest}
                  modeTransitionActive={heatCapacityModeTransitionLocked}
                  modeTransitionDurationMs={HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS}
                  restoreAudioMuted={
                    desktopExitQuiesced ||
                    heatCapacityModeTransitionState.phase === 'preparing-target' ||
                    heatCapacityModeTransitionState.phase === 'animating'
                  }
                  restoredSceneFrameDataUrl={
                    heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id &&
                    initialHeatCapacityRefreshSession.sceneSnapshot?.sceneRevision === HEAT_CAPACITY_REFRESH_SCENE_REVISION &&
                    initialHeatCapacityRefreshSession.sceneSnapshot.themeId === resolvedWorkbenchTheme &&
                    initialHeatCapacityRefreshSession.sceneSnapshot.performanceProfileId === settingsPerformanceMode
                      ? initialHeatCapacityRefreshSession.sceneSnapshot.imageDataUrl
                      : null
                  }
                  onCameraPoseChange={handleHeatCapacityCameraPoseChange}
                  onSceneCheckpoint={handleHeatCapacitySceneCheckpoint}
                  onSceneCheckpointProviderChange={handleHeatCapacitySceneCheckpointProviderChange}
                  onSceneReady={() => handleHeatCapacitySceneReady(activeFile.id)}
                  onSceneRestoreRevealComplete={handleHeatCapacitySceneRestoreRevealComplete}
                  onDiscreteMotionChange={handleHeatCapacitySceneDiscreteMotionChange}
                  onModeTransitionControllerChange={handleHeatCapacitySceneModeTransitionControllerChange}
                  onRuntimeFailure={(error) => handleHeatCapacitySceneRuntimeFailure(activeFile.id, error)}
                  guideProjectionEnabled={Boolean(heatCapacityGuideStrongTargetSpec)}
                  onGuideTargetHolesChange={setHeatCapacityGuideProjectedHoles}
                  onFocusModeChange={updateHeatCapacityFocusMode}
                  onFocusExitRequest={handleHeatCapacityFocusExitRequest}
                  onLockedInteraction={handleHeatCapacitySceneLockedInteraction}
                  onPowerToggle={updateHeatCapacityPower}
                  onStopcockOpenChange={updateHeatCapacityStopcockOpen}
                  onPressureZeroFineAdjust={adjustHeatCapacityPressureZeroFineFromScene}
                  onPressureZeroCoarseAdjust={adjustHeatCapacityPressureZeroCoarseFromScene}
                  onPumpValveToggle={updateHeatCapacityPumpValve}
                  onPumpBulbPress={pressHeatCapacityPumpBulb}
                  onHardSphereViewToggle={toggleHeatCapacityHardSphereView}
                />
              );
            })()}
          </div>
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
        <div className="studio-canvas-host">
          <SimulationCanvas
            particles={activeFile.particles}
            L={activeFile.kind === 'ideal' ? activeFile.activeParams.L : activeFile.appliedParams.L}
            r={activeFile.kind === 'ideal' ? activeFile.activeParams.r : activeFile.appliedParams.r}
            isRunning={activeFile.runState === 'running'}
            t={workbenchTranslation}
            isFocused={isCanvasFocused}
            onFocusChange={setIsCanvasFocused}
            showNotification={(text) => {
              const messageKey = (['locked', 'autoExit', 'switchedToPan', 'switchedToRotate'] as const)
                .find((key) => workbenchTranslation.canvas[key] === text);
              pushLog((language) => {
                const translation = translations[language === 'en' ? 'en-GB' : language];
                return `${workbenchCopies[language].panels.previewTitle}: ${messageKey ? translation.canvas[messageKey] : text}`;
              });
            }}
            supportsHover
            touchLike={false}
            isCompactLandscape={false}
            variant="workbench"
          />
        </div>
        )}
      </div>
      {activeFile.kind === 'heatCapacity' || activeFile.kind === 'heatCapacityPistonOscillation' ? null : (
      <div className="studio-preview-metrics">
        <div className="studio-metric"><span>{workbenchCopy.results.temperature}</span><strong>{activeFile.stats.temperature.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.pressure}</span><strong>{activeFile.stats.pressure.toFixed(4)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.meanSpeed}</span><strong>{activeFile.stats.meanSpeed.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.finalState}</span><strong>{getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>
      )}
    </div>
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

  const selectHeatCapacityViewedGroup = (groupId: string) => {
            setPendingRemoveHeatCapacityTrialRecord(null);
            updateActiveFile((file) => (
              file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
                ? selectHeatCapacityFreeViewedExperimentGroupWorkbenchState(file, groupId, Date.now())
                : file
            ));
          };

  const selectHeatCapacityViewedTrial = (groupId: string, trialId: string) => {
            updateActiveFile((file) => (
              file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
                ? selectHeatCapacityFreeViewedTrialWorkbenchState(file, groupId, trialId, Date.now())
                : file
            ));
          };

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
  const tutorialMilestoneNoticeRequest: PromptNoticeRequest | null = tutorialNoticeKind
    ? {
        id: `experiment-tutorial:${activeTutorialExperiment ?? 'completed'}:${tutorialNoticeKind}`,
        tone: 'standard',
        eyebrow: activeTutorialExperimentName
          ? `${experimentTutorialCopy.resetEyebrow} · ${activeTutorialExperimentName}`
          : experimentTutorialCopy.resetEyebrow,
        title: tutorialNoticeKind === 'start-demo'
          ? experimentTutorialCopy.startDemoTitle
          : tutorialNoticeKind === 'resume-demo'
            ? experimentTutorialCopy.resumeDemoTitle
            : tutorialNoticeKind === 'guide-unlocked'
              ? experimentTutorialCopy.guideUnlockedTitle
              : tutorialNoticeKind === 'resume-guide'
                ? experimentTutorialCopy.resumeGuideTitle
                : experimentTutorialCopy.allUnlockedTitle,
        body: tutorialNoticeKind === 'start-demo'
          ? experimentTutorialCopy.startDemoBody
          : tutorialNoticeKind === 'resume-demo'
            ? experimentTutorialCopy.resumeDemoBody
            : tutorialNoticeKind === 'guide-unlocked'
              ? experimentTutorialCopy.guideUnlockedBody
              : tutorialNoticeKind === 'resume-guide'
                ? experimentTutorialCopy.resumeGuideBody
                : experimentTutorialCopy.allUnlockedBody,
        actionLabel: experimentTutorialCopy.acknowledge,
        closeLabel: experimentTutorialCopy.acknowledge,
        dismiss: { closeButton: false, escape: false, backdrop: true },
      }
    : null;
  const tutorialBlockedNoticeRequest: PromptNoticeRequest | null = tutorialBlockedNoticeOpen
    ? {
        id: 'experiment-tutorial:blocked-action',
        tone: 'warning',
        eyebrow: experimentTutorialCopy.blockedEyebrow,
        title: experimentTutorialCopy.blockedTitle,
        body: experimentTutorialCopy.blockedBody,
        actionLabel: experimentTutorialCopy.acknowledge,
        closeLabel: experimentTutorialCopy.acknowledge,
        dismiss: { closeButton: true, escape: true, backdrop: true },
      }
    : null;
  const remoteTutorialNoticeRequest: PromptForcedNoticeRequest | null = remoteTutorialOwnerActive
    ? {
        id: 'experiment-tutorial:remote-owner',
        tone: 'warning',
        eyebrow: experimentTutorialCopy.blockedEyebrow,
        title: experimentTutorialCopy.remoteTitle,
        body: window.hardSphereLabWindow
          ? experimentTutorialCopy.remoteBody
          : experimentTutorialCopy.browserRemoteBody,
        actionLabel: window.hardSphereLabWindow
          ? experimentTutorialCopy.recheck
          : experimentTutorialCopy.continueHere,
      }
    : null;
  const tutorialFailureConfirmation: PromptConfirmationRequest | null = tutorialOperationError
    ? {
        id: 'experiment-tutorial:operation-failed',
        tone: 'warning',
        eyebrow: experimentTutorialCopy.blockedEyebrow,
        title: experimentTutorialCopy.operationFailedTitle,
        body: tutorialOperationError.message,
        consequence: settingsLanguagePreference === 'en'
          ? 'The app has not skipped or unlocked any unfinished learning milestone.'
          : settingsLanguagePreference === 'zh-TW'
            ? '軟體沒有跳過或解鎖任何尚未完成的學習節點。'
            : '软件没有跳过或解锁任何尚未完成的学习节点。',
        cancelLabel: settingsLanguagePreference === 'en' ? 'Exit app' : settingsLanguagePreference === 'zh-TW' ? '退出軟體' : '退出软件',
        confirmLabel: experimentTutorialCopy.retry,
        closeLabel: settingsLanguagePreference === 'en' ? 'Exit app' : settingsLanguagePreference === 'zh-TW' ? '退出軟體' : '退出软件',
        onConfirm: tutorialOperationError.retry ?? (() => window.location.reload()),
      }
    : null;

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
      <PromptConfirmDialog
        request={tutorialFailureConfirmation}
        onCancel={() => {
          const tutorialExit = window.hardSphereLabTutorial?.exitApplication?.();
          if (tutorialExit) return;
          const desktopClose = window.hardSphereLabWindow?.close?.();
          if (!desktopClose) window.close();
        }}
        onConfirm={() => {
          const retry = tutorialOperationError?.retry;
          setTutorialOperationError(null);
          if (retry) retry();
          else window.location.reload();
        }}
      />
      <PromptNoticeDialog
        request={tutorialMilestoneNoticeRequest}
        onDismiss={handleExperimentTutorialNoticeAction}
        onAction={handleExperimentTutorialNoticeAction}
      />
      <PromptNoticeDialog
        request={tutorialBlockedNoticeRequest}
        onDismiss={() => setTutorialBlockedNoticeOpen(false)}
        onAction={() => setTutorialBlockedNoticeOpen(false)}
      />
      <PromptForcedNoticeDialog
        request={remoteTutorialNoticeRequest}
        onAction={() => {
          if (window.hardSphereLabWindow) {
            window.location.reload();
            return;
          }
          tutorialOwnershipClaimRef.current(true);
        }}
      />
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
        onSelectedCountChange={setHeatCapacityBatchSetupSelection}
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

        {productIntroReplayPhase ? (
          <div
            className="first-run-experience first-run-replay-overlay"
            data-first-run-language={settingsLanguagePreference}
            data-learning-overlay="product-intro"
          >
            <WelcomeProductIntroFlow
              phase={productIntroReplayPhase}
              language={settingsLanguagePreference}
              copy={firstRunCopies[settingsLanguagePreference]}
              theme={resolvedWorkbenchTheme}
              reducedMotion={onboardingReducedMotion}
              showPrevious={false}
              nextLabel={firstRunCopies[settingsLanguagePreference].common.finish}
              onPhaseChange={setProductIntroReplayPhase}
              onPrevious={closeLearningExperienceOverlay}
              onNext={closeLearningExperienceOverlay}
            />
          </div>
        ) : null}

        {learningNeedsReselectOpen ? (
          <div className="first-run-experience first-run-replay-overlay" data-learning-overlay="reselect-needs">
            <LearningNeedsPage
              copy={firstRunCopies[settingsLanguagePreference]}
              answers={learningNeedsDraft}
              onAnswerChange={(experiment, answer) => {
                setLearningNeedsDraft((current) => ({ ...current, [experiment]: answer }));
              }}
              onPrevious={closeLearningExperienceOverlay}
              onNext={submitLearningNeedsReselect}
            />
          </div>
        ) : null}

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
