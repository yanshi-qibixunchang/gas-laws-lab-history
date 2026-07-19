import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileArchive,
  FlaskConical,
  Folder,
  FolderOpen,
  Gauge,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  PanelTopOpen,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Table2,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ExperimentRelation, HistogramBin, IdealGasExperimentPoint, Particle, SimulationParams, SimulationStats } from '../../shared/types';
import { PhysicsEngine, type PhysicsEngineSnapshotV2 } from '../../domain/hardSphere/PhysicsEngine';
import { translations } from '../../i18n/translations';
import SimulationCanvas from '../../components/SimulationCanvas';
import {
  areWorkbenchParamsEqual,
  adjustHeatCapacityPressureZeroCoarse,
  adjustHeatCapacityPressureZeroFine,
  canZeroHeatCapacityPressure,
  cloneParams,
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultIdealWindowLayout,
  createDefaultStandardFile,
  createDefaultStandardResultsLayout,
  acknowledgeHeatCapacityFreeFileNoticeWorkbenchState,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  applyHeatCapacityGuideRecordWorkbenchState,
  canOpenHeatCapacityParameterSidebar,
  completeHeatCapacityFreePreheatWorkbenchState,
  completeHeatCapacityCalculationWorkflowWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  completeHeatCapacityTeachingModeWorkbenchState,
  deriveHeatCapacityFreeWorkbenchAttemptWaitTimer,
  dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  continueHeatCapacityCalculationAnswerWorkbenchState,
  enterHeatCapacityFreeModeWorkbenchState,
  ensureHeatCapacityCalculationSessionWorkbenchState,
  evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getActiveHeatCapacityFreeTrialIndex,
  getHeatCapacityFreeDisplayPhase,
  getHeatCapacityCalculationSession,
  getHeatCapacityFreeBatchProgress,
  getHeatCapacityFreeParameterLockReason,
  getHeatCapacityFreeRecordButtonState,
  getHeatCapacityGuideRecordButtonState,
  getHeatCapacityParameterSidebarBlockReason,
  hasCompletedHeatCapacityFreeRecordSet,
  isHeatCapacityFreeGasTypeEditingAvailable,
  getHeatCapacityStopcockTargetAngle,
  getHeatCapacityStopcockState,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureThresholdsMv,
  getHeatCapacityPumpFrequencyState,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  isHeatCapacityFreeExperimentStarted,
  isHeatCapacityFreeExperimentGroupComplete,
  isHeatCapacityFreePreheatRequired,
  isHeatCapacityPhysicalKernelMode,
  isHeatCapacityPressureZeroWithinTolerance,
  getWorkbenchParameterRows,
  normalizeHeatCapacityFileName,
  captureHeatCapacityWorkbenchSample,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoReset,
  prepareHeatCapacityAutoDemoStart,
  applyHeatCapacityFreeRecordWorkbenchState,
  refreshHeatCapacityPumpFrequency,
  registerHeatCapacityPumpStroke,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  restartHeatCapacityFreeBatchWorkbenchState,
  resetHeatCapacityFreeParametersToDefaultWorkbenchState,
  resetCurrentHeatCapacityFreeExperimentGroupWorkbenchState,
  selectActiveHeatCapacityWorkbenchDisplay,
  selectHeatCapacityCalculationAggregateWorkbenchState,
  selectHeatCapacityCalculationGroupWorkbenchState,
  selectDisplayedHeatCapacityFreeDomain,
  setHeatCapacityFreeDisplaySchemeWorkbenchState,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  setHeatCapacityScriptedStopcockOpen,
  setHeatCapacityScriptedPumpValveOpen,
  setHeatCapacityPressureZeroOffset,
  shouldPromptHeatCapacityFreePowerOffBeforeNextGroup,
  shouldCommitHeatCapacityRealtimeTick,
  startHeatCapacityGuideWorkbenchState,
  startNextHeatCapacityFreeExperimentGroupWorkbenchState,
  submitHeatCapacityCalculationStepWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  updateHeatCapacityCalculationDraftWorkbenchState,
  revealHeatCapacityCalculationAnswerWorkbenchState,
  WORKBENCH_LIVE_SPLIT_MIN_RATIO,
  WORKBENCH_LIVE_SPLIT_MAX_RATIO,
  clampWorkbenchLiveSplitRatio,
  validateWorkbenchParams,
  type WorkbenchExportEnvironmentStatus,
  type WorkbenchFileKind,
  type WorkbenchFileState,
  type HeatCapacityMode,
  type WorkbenchHeatCapacityState,
  type WorkbenchIdealState,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchHeatCapacityTabId,
  type HeatCapacityFreeDisplayScheme,
  type WorkbenchPanelKey,
  type WorkbenchParameterRow,
  type WorkbenchRunState,
  type WorkbenchStandardResultsTab,
} from './workbenchState';
import {
  WORKBENCH_TRACKED_PARAMETER_KEYS,
  assignWorkbenchParameterValue,
  type WorkbenchAdvancedParameterKey,
} from './workbenchParameterRegistry.ts';
import { projectWorkbenchRunStateForRuntimeFailure } from './workbenchRuntimePersistence.ts';
import HeatCapacityInstrumentScene, {
  normalizeHeatCapacityCameraTransitionState,
  type HeatCapacityCameraPose,
  type HeatCapacityCameraTransitionState,
  type HeatCapacitySceneDiscreteMotionState,
  type HeatCapacitySceneCheckpointMetadata,
  type HeatCapacitySceneCheckpointProvider,
  type HeatCapacitySceneModeRestoreRequest,
  type HeatCapacitySceneModeTransitionController,
} from '../heatCapacity/HeatCapacityInstrumentScene';
import {
  normalizeHeatCapacityHardSphereVisualCheckpoint,
  type HeatCapacityHardSphereVisualCheckpoint,
} from '../heatCapacity/HeatCapacityHardSphereLayer.tsx';
import {
  normalizeHeatCapacityUltraVisualState,
  type HeatCapacityUltraVisualState,
} from '../heatCapacity/HeatCapacityUltraInstrumentModel.tsx';
import { HeatCapacityLeftPanel } from '../heatCapacity/HeatCapacityLeftPanel.tsx';
import HeatCapacityBatchSetupDialog, {
  type HeatCapacityBatchGroupCount,
} from '../heatCapacity/HeatCapacityBatchSetupDialog.tsx';
import { HeatCapacityBatchProgress } from '../heatCapacity/HeatCapacityBatchProgress.tsx';
import HeatCapacityCalculationWindow from '../heatCapacity/HeatCapacityCalculationWindow.tsx';
import { HeatCapacityFreeDisplaySchemeMenu } from '../heatCapacity/HeatCapacityFreeDisplaySchemeMenu.tsx';
import HeatCapacityPreheatOverlay from '../heatCapacity/HeatCapacityPreheatOverlay.tsx';
import HeatCapacityInvalidAttemptDialog from '../heatCapacity/HeatCapacityInvalidAttemptDialog.tsx';
import { HeatCapacityWaitController } from '../heatCapacity/HeatCapacityWaitController.tsx';
import HeatCapacityProcessReviewPanel from '../heatCapacity/HeatCapacityProcessReviewPanel.tsx';
import {
  createHeatCapacityModeTransitionCheckpoint,
  getHeatCapacityModeTransitionVisualRemainingMs,
  normalizeHeatCapacityModeTransitionCheckpoint,
  type HeatCapacityModeTransitionEvent,
  type HeatCapacityModeTransitionReason,
} from '../heatCapacity/heatCapacityModeTransitionModel.ts';
import {
  captureHeatCapacityModeTransitionDemoClock,
  resolveHeatCapacityModeTransitionDemoResume,
} from '../heatCapacity/heatCapacityModeTransitionDemoClock.ts';
import {
  resolveHeatCapacityGuidePulseRestore,
} from '../heatCapacity/heatCapacityGuidePulseClock.ts';
import {
  normalizeHeatCapacityAutoDemoResumeCursor,
} from '../heatCapacity/heatCapacityAutoDemoPreheatResume.ts';
import {
  useHeatCapacityModeSessionCoordinator,
  type HeatCapacityModeTransitionWatchdogEvent,
} from './useHeatCapacityModeSessionCoordinator.ts';
import {
  formatHeatCapacityFreeParameterValue,
  getHeatCapacityFreeParameterDraftValue,
  getHeatCapacityFreeParameterInputValue,
  heatCapacityFreeAdvancedNumberParameters,
  heatCapacityFreeAdvancedParameterGroups,
  heatCapacityFreeBasicCheckboxes,
  heatCapacityFreeBasicNumberParameters,
  heatCapacityFreeGasTypeOptions,
  heatCapacityFreeParameterLockText,
  heatCapacityFreeSharedText,
  type HeatCapacityFreeBasicCheckboxKey,
  type HeatCapacityFreeCheckboxDefinition,
  type HeatCapacityFreeDraftNumberKey,
  type HeatCapacityFreeGasTypeOptionDefinition,
  type HeatCapacityFreeNumberParameterDefinition,
  type HeatCapacityFreeParameterLockReasonId,
  type HeatCapacityFreeParameterSymbolPart,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import type {
  HeatCapacityFreeGasType,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  createHeatCapacityToastMessage,
  HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
  isHeatCapacityGuideToast,
  isHeatCapacityPressureToast,
  resolveHeatCapacityToastAdvance,
  resolveHeatCapacityToastClear,
  resolveHeatCapacityToastShow,
  type HeatCapacityToastLevel,
  type HeatCapacityToastMessage,
  type HeatCapacityToastSource,
} from '../heatCapacity/heatCapacityToastController.ts';
import {
  getHeatCapacityToastPolicySpec,
  type HeatCapacityToastPolicy,
} from '../heatCapacity/heatCapacityToastPolicy.ts';
import {
  selectHeatCapacityModeControlState,
  type HeatCapacityAutoDemoPhase,
  type HeatCapacityModeControlAction,
} from '../heatCapacity/heatCapacityModeControlModel.ts';
import {
  getHeatCapacityGuideAllowedActions,
  getHeatCapacityGuideRollbackAnimation,
  getHeatCapacityGuideStepControlId,
  isGuideHeatCapacityPauseStep,
  isHeatCapacityGuideRecordStep,
  type GuideHeatCapacityAction,
  type GuideHeatCapacityStep,
} from '../heatCapacity/heatCapacityGuideStepModel.ts';
import {
  getHeatCapacityGuideRollbackAnimationForControl,
  type HeatCapacityGuideRollbackAnimation,
  type HeatCapacityInstrumentControl,
} from '../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts';
import {
  HeatCapacityRejectedInteractionTracker,
  type HeatCapacityControlInteractionId,
} from '../heatCapacity/heatCapacityControlInteraction.ts';
import {
  createHeatCapacityAutoDemoSteps,
  deriveHeatCapacityAutoDemoZeroKnobMotion,
  deriveHeatCapacityAutoDemoWaitTimer,
  getHeatCapacityAutoDemoTimelineItemKey,
  getHeatCapacityAutoDemoTimeline,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
  HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS,
  type HeatCapacityAutoDemoAction,
  type HeatCapacityAutoDemoStep,
  type HeatCapacityAutoDemoTimelineItem,
} from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  formatHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import type {
  HeatCapacityFreeRecordRejectReason,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreeTrialRecordRemovalKind,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  deriveHeatCapacityGuideExperimentTimer,
} from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import type {
  HeatCapacityGuideRecordKind,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  getHeatCapacityReleaseDurationS,
  HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  isHeatCapacityReleaseFlowOpen,
  isHeatCapacityMainReleaseFlowOpen,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
  clampNumber as clampHeatCapacityHardSphereNumber,
  type HeatCapacityHardSphereReleaseTimeline,
} from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  getHeatCapacityFreePressureDangerUpperLimitMv,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  createHeatCapacityAutoDemoProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  createWorkbenchExportPayload,
  createWorkbenchFigureSpecs,
  createWorkbenchResultSummary,
  type WorkbenchExportMode,
} from './workbenchResults';
import {
  loadClosedWorkbenchFiles,
  loadWorkbenchSession,
} from './workbenchSession.ts';
import {
  createWorkbenchActiveModeCheckpointOverride,
  resolveWorkbenchActiveModeCheckpointOverride,
  saveWorkbenchWorkspaceToIndexedDb,
  type WorkbenchActiveModeCheckpointOverride,
  type WorkbenchWorkspacePersistenceSnapshot,
} from './workbenchIndexedDbPersistence.ts';
import {
  createWorkbenchPersistenceScheduler,
  type WorkbenchPersistenceScheduler,
  type WorkbenchPersistenceStatus,
} from './workbenchPersistenceScheduler.ts';
import {
  assertUniqueWorkbenchFileCollections,
  createUniqueWorkbenchFileId,
  getNextWorkbenchFileDisplayIndex,
} from './workbenchFileIdentity.ts';
import { assertNeverWorkbenchFileKind } from './workbenchFileKind.ts';
import { trimWorkbenchEditHistory } from './workbenchEditHistory.ts';
import {
  IDEAL_RESULT_MAX_HEIGHT_RATIO,
  IDEAL_RESULT_MIN_HEIGHT_RATIO,
  clampIdealResultHeightRatio,
  idealResultWindowKeys,
  isWorkbenchFileLayoutDefault,
  isIdealResultWindowKey,
  loadWorkbenchLayoutDefaults,
  normalizeIdealWindowLayoutState,
  normalizeStandardResultsLayout,
  persistWorkbenchLayoutDefaults,
  sanitizeWorkbenchLayoutDefaultState,
  sanitizeWorkbenchLayoutDefaults,
  standardResultsTabKeys,
  type WorkbenchLayoutDefaults,
} from './workbenchLayoutCompatibility.ts';
import {
  createIdealGasExperimentPoint,
  getIdealFailureReasonText,
  getIdealGasAnalysis,
  getIdealHistoryContent,
  getIdealRecommendationText,
  getPresetSequence,
  getRelationLabel,
  getRelationVariableKey,
  getRelationVariableNumericValue,
  getRelationXValue,
  isVariableKeyForRelation,
  type ExperimentParamKey,
  type IdealGasAnalysis,
  type IdealExperimentLanguageCode,
} from '../../domain/idealGas/idealGasExperiment';
import {
  HEAT_CAPACITY_QUALITY_PROFILES,
} from '../heatCapacity/heatCapacityQualityProfiles';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import {
  getSystemWorkbenchTheme,
  loadWorkbenchGeneralSettings,
  persistWorkbenchGeneralSettings,
  type WorkbenchLanguagePreference,
  type WorkbenchPerformanceMode,
  type WorkbenchResolvedTheme,
  type WorkbenchThemePreference,
} from './workbenchGeneralSettings.ts';
import { getWorkbenchAppBrandName } from './workbenchBrand.ts';
import { clampAudioVolume } from '../../audio/core/audioSettings.ts';
import { useAudioEngine } from '../../audio/react/useAudioEngine.ts';
import {
  createWorkbenchConsoleMessageTranslations,
  materializeWorkbenchConsoleMessage,
  normalizeWorkbenchConsoleMessageTranslations,
  resolveWorkbenchConsoleMessage,
  type WorkbenchConsoleMessageFactory,
  type WorkbenchConsoleMessageInput,
  type WorkbenchLocalizedConsoleMessage,
} from './workbenchConsoleLocalization.ts';
import {
  WORKBENCH_IGNORED_UPDATE_VERSION_KEY,
  getAboutUpdateStatusLabel,
  isWorkbenchUpdateCheckFailure,
  mergeWorkbenchUpdateState,
  type WorkbenchUpdateState,
} from './workbenchDesktopUpdater.ts';
import { WorkbenchUpdateDialog } from './WorkbenchUpdateDialog.tsx';
import { WorkbenchEmptyWorkspace } from './WorkbenchEmptyWorkspace.tsx';
import { WorkbenchGeneralSettingsWindow } from './WorkbenchGeneralSettingsWindow.tsx';
import { WorkbenchAboutWindow } from './WorkbenchAboutWindow.tsx';
import {
  PistonOscillationInstrumentScene,
  PistonOscillationRealtimeUnavailable,
  getPistonOscillationShellCopy,
} from '../pistonOscillation/index.ts';
import {
  WorkbenchTopCommands,
  type WorkbenchTopMenuId,
  type WorkbenchTopMenuResultChild,
} from './WorkbenchTopCommands.tsx';
import {
  WorkbenchHeatCapacityAdvancedRiskDialog,
  WorkbenchHeatCapacityIdealProfileIntroDialog,
  WorkbenchHeatCapacityRestoreDefaultDialog,
} from './WorkbenchHeatCapacityParameterDialogs.tsx';
import {
  WorkbenchBuildNoticeWindow,
} from './WorkbenchBuildNoticeWindow.tsx';
import type {
  WorkbenchBuildNoticeFilePreview,
  WorkbenchLegalMaterialId,
} from './workbenchBuildNoticeContract.ts';
import {
  buildNoticeLegalMaterialFiles,
  buildNoticeSections,
} from './workbenchBuildNoticeContent.ts';
import {
  getWorkbenchFileKindLabel,
  getWorkbenchSessionCacheSummary,
} from './workbenchFilePresentation.ts';
import {
  IDEAL_SCAN_SNAP_THRESHOLD,
  IDEAL_SCAN_THUMB_HIT_RADIUS,
  IDEAL_SCAN_THUMB_SIZE,
  getIdealScanDecimals,
  getIdealScanInputLabel,
  getIdealScanPositionPercent,
  getIdealScanStep,
  getIdealScanStepLabel,
  idealRelationOptions,
  idealSamplingPresets,
  isIdealScanValueOnStep,
  type IdealSamplingPreset,
  type IdealSamplingPresetKey,
} from './workbenchIdealControls.ts';
import {
  getHeatCapacityMaterialsTabOrder,
  heatCapacityPanelKeyToTabId,
  heatCapacityTabIdToPanelKey,
  isHeatCapacityPanelKey,
} from './workbenchHeatCapacityTabRegistry.ts';
import {
  createWorkbenchHeatCapacityRefreshSession,
  loadWorkbenchHeatCapacityRefreshSession,
  resolveWorkbenchHeatCapacityPressureAlertRefreshProjection,
  selectPendingWorkbenchHeatCapacityRefreshSession,
  type WorkbenchHeatCapacityRefreshJsonObject,
  type WorkbenchHeatCapacityRefreshSession,
} from './workbenchHeatCapacityRefreshSession.ts';
import {
  clearHeatCapacityModeSession,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from './workbenchHeatCapacityModeSession.ts';
import {
  hasSameHeatCapacityRuntimeRecoveryState,
  rebaseHeatCapacityFileAfterSuspendedWallClock,
} from './workbenchHeatCapacityTimeRebase.ts';
import {
  createHeatCapacityModeDeferredTimer,
  createHeatCapacityModeUiCheckpoint,
  getHeatCapacityModeDeferredTimerRemainingMs,
  type HeatCapacityGuideLessonStepId,
  type HeatCapacityModeCameraPoseCheckpoint,
  type HeatCapacityModeDemoCheckpoint,
  type HeatCapacityModeGuideCheckpoint,
  type HeatCapacityModeJsonObject,
  type HeatCapacityModeLessonDialogCheckpoint,
  type HeatCapacityModePauseReason,
  type HeatCapacityModePumpAnimationCheckpoint,
  type HeatCapacityModeSceneCheckpoint,
  type HeatCapacityModeUiCheckpoint,
} from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import './WorkbenchStudioPrototype.css';

type LogKind = 'info' | 'warning' | 'success' | 'error';
type ConsoleTab = 'logs' | 'warnings' | 'summary';
type ResultsSectionKey = WorkbenchStandardResultsTab;

const HEAT_CAPACITY_REFRESH_SCENE_REVISION = 'heat-capacity-instrument-scene-v1';
const HEAT_CAPACITY_LIFECYCLE_DUPLICATE_FLUSH_WINDOW_MS = 250;
const HEAT_CAPACITY_SEMANTIC_CHECKPOINT_DEBOUNCE_MS = 120;
const HEAT_CAPACITY_SEMANTIC_CHECKPOINT_MAX_WAIT_MS = 600;

const isHeatCapacityRefreshRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getHeatCapacityRefreshString = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
  fallback: string | null = null,
) => typeof record[key] === 'string' ? record[key] as string : fallback;

const getHeatCapacityRefreshBoolean = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
  fallback = false,
) => typeof record[key] === 'boolean' ? record[key] as boolean : fallback;

const getHeatCapacityRefreshNumber = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
  fallback: number,
) => typeof record[key] === 'number' && Number.isFinite(record[key])
  ? record[key] as number
  : fallback;

const getHeatCapacityRefreshOptionalNumber = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
): number | null => typeof record[key] === 'number' && Number.isFinite(record[key])
  ? record[key] as number
  : null;

const getHeatCapacityRefreshObject = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
): Record<string, unknown> | null => {
  const value = record[key];
  return isHeatCapacityRefreshRecord(value) ? value : null;
};

const getHeatCapacityRefreshStringMap = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
): Record<string, string> => {
  const value = getHeatCapacityRefreshObject(record, key);
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => (
    typeof entry[1] === 'string'
  )));
};

const asWorkbenchHeatCapacityRefreshJsonObject = (
  value: unknown,
): WorkbenchHeatCapacityRefreshJsonObject => value as WorkbenchHeatCapacityRefreshJsonObject;

const getHeatCapacityRefreshRunState = (
  value: unknown,
  fallback: WorkbenchRunState,
): WorkbenchRunState => (
  value === 'idle' || value === 'running' || value === 'paused' || value === 'finished' || value === 'needs-reset'
    ? value
    : fallback
);

type HeatCapacityRecordSuccessTimerPlan = {
  fileId: string;
  followUpMessage: string | null;
  followUpRemainingMs: number | null;
  releaseRemainingMs: number;
};

type HeatCapacityLessonCloseTimerPlan = {
  fileId: string;
  remainingMs: number;
  shouldResumeAutoDemo: boolean;
};

const normalizeHeatCapacityRecordSuccessTimerPlan = (
  layout: WorkbenchHeatCapacityRefreshJsonObject,
  expectedFileId: string,
  expectedMode: HeatCapacityMode,
): HeatCapacityRecordSuccessTimerPlan | null => {
  if (expectedMode !== 'guide') return null;
  const value = getHeatCapacityRefreshObject(layout, 'recordSuccessSequence');
  if (!value || value.fileId !== expectedFileId) return null;
  const rawFollowUpMessage = value.followUpMessage;
  if (rawFollowUpMessage !== null && typeof rawFollowUpMessage !== 'string') return null;
  const followUpMessage = rawFollowUpMessage as string | null;
  const rawFollowUpRemainingMs = value.followUpRemainingMs;
  if (
    rawFollowUpRemainingMs !== null &&
    (
      typeof rawFollowUpRemainingMs !== 'number' ||
      !Number.isFinite(rawFollowUpRemainingMs) ||
      rawFollowUpRemainingMs < 0
    )
  ) return null;
  const followUpRemainingMs = rawFollowUpRemainingMs as number | null;
  const releaseRemainingMs = value.releaseRemainingMs;
  if (
    typeof releaseRemainingMs !== 'number' ||
    !Number.isFinite(releaseRemainingMs) ||
    releaseRemainingMs < 0 ||
    (followUpMessage !== null && followUpMessage.trim().length === 0) ||
    (followUpRemainingMs !== null && followUpRemainingMs > releaseRemainingMs) ||
    (followUpMessage === null) !== (followUpRemainingMs === null)
  ) return null;
  return {
    fileId: expectedFileId,
    followUpMessage,
    followUpRemainingMs,
    releaseRemainingMs,
  };
};

const normalizeHeatCapacityLessonCloseTimerPlan = (
  layout: WorkbenchHeatCapacityRefreshJsonObject,
  expectedFileId: string,
  expectedMode: HeatCapacityMode,
  lessonDialogPresent: boolean,
): HeatCapacityLessonCloseTimerPlan | null => {
  const value = getHeatCapacityRefreshObject(layout, 'lessonCloseSequence');
  if (
    !value ||
    value.fileId !== expectedFileId ||
    typeof value.remainingMs !== 'number' ||
    !Number.isFinite(value.remainingMs) ||
    value.remainingMs < 0 ||
    typeof value.shouldResumeAutoDemo !== 'boolean' ||
    !lessonDialogPresent ||
    (value.shouldResumeAutoDemo && expectedMode !== 'demo')
  ) return null;
  return {
    fileId: expectedFileId,
    remainingMs: value.remainingMs,
    shouldResumeAutoDemo: value.shouldResumeAutoDemo,
  };
};

const getHeatCapacityFreeParameterLockMessage = (
  reason: HeatCapacityFreeParameterLockReasonId | null,
  language: WorkbenchLanguagePreference,
) => (reason ? heatCapacityFreeParameterLockText[reason][language] : null);
const WORKBENCH_USER_GUIDE_URLS: Record<WorkbenchLanguagePreference, string> = {
  'zh-CN': 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release#readme',
  'zh-TW': 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/blob/main/README.zh-TW.md',
  en: 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/blob/main/README.en.md',
};
const WORKBENCH_WINDOW_CONTROL_COPY: Record<WorkbenchLanguagePreference, {
  controls: string;
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
}> = {
  ['zh-CN']: {
    controls: '窗口控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原窗口',
    close: '关闭',
  },
  ['zh-TW']: {
    controls: '視窗控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '還原視窗',
    close: '關閉',
  },
  ['en']: {
    controls: 'Window controls',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },
};
type WorkbenchParameterSymbolPart = string | { sub: string };

type HeatCapacityFocusMode = 'none' | 'instrument' | 'pump' | 'bottle';
type HeatCapacityFocusControlSnapshot = {
  powerOn: boolean;
  stopcockOpen: boolean;
  pumpValveOpen: boolean;
  pressureZeroAdjusted: boolean;
  pressureZeroOffset: number;
};
type HeatCapacityFocusSession = {
  fileId: string;
  mode: Exclude<HeatCapacityFocusMode, 'none'>;
  parametersCollapsedBeforeFocus: boolean;
  baseline: HeatCapacityFocusControlSnapshot;
  nonReversibleAction: boolean;
};

const normalizeHeatCapacityFocusSession = (value: unknown): HeatCapacityFocusSession | null => {
  if (!isHeatCapacityRefreshRecord(value) || typeof value.fileId !== 'string') return null;
  if (value.mode !== 'instrument' && value.mode !== 'pump' && value.mode !== 'bottle') return null;
  if (typeof value.parametersCollapsedBeforeFocus !== 'boolean' || typeof value.nonReversibleAction !== 'boolean') {
    return null;
  }
  if (!isHeatCapacityRefreshRecord(value.baseline)) return null;
  const baseline = value.baseline;
  if (
    typeof baseline.powerOn !== 'boolean' ||
    typeof baseline.stopcockOpen !== 'boolean' ||
    typeof baseline.pumpValveOpen !== 'boolean' ||
    typeof baseline.pressureZeroAdjusted !== 'boolean' ||
    typeof baseline.pressureZeroOffset !== 'number' ||
    !Number.isFinite(baseline.pressureZeroOffset)
  ) return null;
  return {
    fileId: value.fileId,
    mode: value.mode,
    parametersCollapsedBeforeFocus: value.parametersCollapsedBeforeFocus,
    baseline: {
      powerOn: baseline.powerOn,
      stopcockOpen: baseline.stopcockOpen,
      pumpValveOpen: baseline.pumpValveOpen,
      pressureZeroAdjusted: baseline.pressureZeroAdjusted,
      pressureZeroOffset: baseline.pressureZeroOffset,
    },
    nonReversibleAction: value.nonReversibleAction,
  };
};

const mapHeatCapacityAutoDemoCameraFocusMode = (
  cameraFocusMode: HeatCapacityAutoDemoTimelineItem['cameraFocusMode'],
): Exclude<HeatCapacityFocusMode, 'none'> | null => {
  if (cameraFocusMode === 'instrument' || cameraFocusMode === 'pump' || cameraFocusMode === 'bottle') {
    return cameraFocusMode;
  }
  return null;
};

type HeatCapacityGuideStrongCutout =
  | {
      id: string;
      shape: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    }
  | {
      id: string;
      shape: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
    };

type HeatCapacityGuideStrongDomCutout = {
  id: string;
  selector: string;
  padding?: number;
  rx?: number;
  optional?: boolean;
};

type HeatCapacityGuideStrongTargetSpec = {
  id: string;
  focusMode: HeatCapacityFocusMode | null;
  sceneHoleIds: string[];
  domHoles?: HeatCapacityGuideStrongDomCutout[];
  reminderCopyKey?: 'guideStrongReminder' | 'guideStrongReminderPressureZero';
};

const WORKBENCH_PARAMETER_DETAILS: Record<WorkbenchAdvancedParameterKey, {
  symbol: WorkbenchParameterSymbolPart[];
  help: Record<WorkbenchLanguagePreference, string>;
}> = {
  N: {
    symbol: ['N'],
    help: {
      'zh-CN': '控制容器内参与碰撞和压强统计的粒子数量。',
      'zh-TW': '控制容器內參與碰撞和壓強統計的粒子數量。',
      en: 'Sets the number of particles used for collisions and pressure statistics.',
    },
  },
  r: {
    symbol: ['r'],
    help: {
      'zh-CN': '决定硬球半径，影响碰撞截面和可占据空间。',
      'zh-TW': '決定硬球半徑，影響碰撞截面和可佔據空間。',
      en: 'Sets the hard-sphere radius, affecting collision size and available space.',
    },
  },
  L: {
    symbol: ['L'],
    help: {
      'zh-CN': '决定立方容器边长，改变体积和压强换算基准。',
      'zh-TW': '決定立方容器邊長，改變體積和壓強換算基準。',
      en: 'Sets the cubic container side length, changing volume and pressure scaling.',
    },
  },
  dt: {
    symbol: ['dt'],
    help: {
      'zh-CN': '决定每一步积分时间间隔，影响模拟推进精度和速度。',
      'zh-TW': '決定每一步積分時間間隔，影響模擬推進精度和速度。',
      en: 'Sets the integration time step, affecting simulation precision and pace.',
    },
  },
  nu: {
    symbol: ['ν'],
    help: {
      'zh-CN': '控制 Andersen 热浴碰撞频率，影响达到目标温度的速度。',
      'zh-TW': '控制 Andersen 熱浴碰撞頻率，影響達到目標溫度的速度。',
      en: 'Sets the Andersen thermostat collision frequency and equilibration speed.',
    },
  },
  equilibriumTime: {
    symbol: ['t', { sub: 'eq' }],
    help: {
      'zh-CN': '决定开始统计前等待热平衡的时间。',
      'zh-TW': '決定開始統計前等待熱平衡的時間。',
      en: 'Sets how long the run equilibrates before statistics are collected.',
    },
  },
  statsDuration: {
    symbol: ['t', { sub: 'stat' }],
    help: {
      'zh-CN': '决定用于结果统计的采样持续时间。',
      'zh-TW': '決定用於結果統計的採樣持續時間。',
      en: 'Sets the duration of the statistics collection window.',
    },
  },
};

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

const GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS = 10_000;
const GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS = 4000;
const HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS = 250;
const HEAT_CAPACITY_AUTO_DEMO_LOCKED_POINTER_FALLBACK_MS = 320;
const HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS = 5 * 60 * 1000;
const HEAT_CAPACITY_GUIDE_WAIT_DURATION_S = HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS / 1000;
const HEAT_CAPACITY_GUIDE_START_NOTICE_MS = 1000;
const HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS = 2000;
const HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS = 220;
const HEAT_CAPACITY_RESET_FEEDBACK_MS = 650;
const HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS = 380;
const HEAT_CAPACITY_MODE_TRANSITION_SETTLE_DEADLINE_MS = 250;
const HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX = 48;
const HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX = 42;
const HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS = 120;
const HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS = 5000;
const HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE = 0.72;
const HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS = 2;
const HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS = 180 as const;

interface HeatCapacityGuideChecklistStepDefinition {
  id: string;
  guideStep: GuideHeatCapacityStep;
  title: Record<WorkbenchLanguagePreference, string>;
}

type HeatCapacityGuideLessonDialogState =
  | { kind: 'intro'; pageIndex: number }
  | { kind: 'step'; lessonId: HeatCapacityGuideLessonStepId };
type HeatCapacityGuideLessonView = {
  key: string;
  title: string;
  body: string;
};

const HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS: HeatCapacityGuideChecklistStepDefinition[] = [
  {
    id: 'power-on',
    guideStep: 'powerOnRequired',
    title: { 'zh-CN': '打开电源', 'zh-TW': '打開電源', en: 'Turn on power' },
  },
  {
    id: 'sensor-preheat',
    guideStep: 'preheatRequired',
    title: { 'zh-CN': '传感器预热', 'zh-TW': '感測器預熱', en: 'Sensor warm-up' },
  },
  {
    id: 'open-stopcock-zero',
    guideStep: 'openStopcockForZeroRequired',
    title: { 'zh-CN': '打开玻璃旋塞', 'zh-TW': '打開玻璃旋塞', en: 'Open stopcock' },
  },
  {
    id: 'zero-adjust',
    guideStep: 'zeroAdjustRequired',
    title: { 'zh-CN': '调整压力调零', 'zh-TW': '調整壓強調零', en: 'Zero pressure' },
  },
  {
    id: 'record-u0',
    guideStep: 'recordU0Required',
    title: { 'zh-CN': '记录 U₀', 'zh-TW': '記錄 U₀', en: 'Record U₀' },
  },
  {
    id: 'close-stopcock-before-pump',
    guideStep: 'closeStopcockRequired',
    title: { 'zh-CN': '关闭玻璃旋塞', 'zh-TW': '關閉玻璃旋塞', en: 'Close stopcock' },
  },
  {
    id: 'open-pump-valve',
    guideStep: 'openPumpValveRequired',
    title: { 'zh-CN': '打开打气阀门', 'zh-TW': '打開打氣閥門', en: 'Open pump valve' },
  },
  {
    id: 'pump',
    guideStep: 'pumpRequired',
    title: { 'zh-CN': '打气至 120 mV', 'zh-TW': '打氣至 120 mV', en: 'Pump to 120 mV' },
  },
  {
    id: 'close-pump-valve',
    guideStep: 'closePumpValveRequired',
    title: { 'zh-CN': '关闭打气阀门', 'zh-TW': '關閉打氣閥門', en: 'Close pump valve' },
  },
  {
    id: 'wait-u1',
    guideStep: 'stabilizeBeforeReleaseRequired',
    title: { 'zh-CN': '封闭等待 5 min', 'zh-TW': '封閉等待 5 min', en: 'Wait sealed 5 min' },
  },
  {
    id: 'record-u1',
    guideStep: 'recordU1Required',
    title: { 'zh-CN': '记录 U₁', 'zh-TW': '記錄 U₁', en: 'Record U₁' },
  },
  {
    id: 'open-release-stopcock',
    guideStep: 'openStopcockReleaseRequired',
    title: { 'zh-CN': '打开放气旋塞', 'zh-TW': '打開放氣旋塞', en: 'Open release stopcock' },
  },
  {
    id: 'close-release-stopcock',
    guideStep: 'closeStopcockAfterReleaseRequired',
    title: { 'zh-CN': '关闭放气旋塞', 'zh-TW': '關閉放氣旋塞', en: 'Close release stopcock' },
  },
  {
    id: 'wait-u2',
    guideStep: 'recoverRequired',
    title: { 'zh-CN': '回温等待 5 min', 'zh-TW': '回溫等待 5 min', en: 'Recover 5 min' },
  },
  {
    id: 'record-u2',
    guideStep: 'recordU2Required',
    title: { 'zh-CN': '记录 U₂', 'zh-TW': '記錄 U₂', en: 'Record U₂' },
  },
  {
    id: 'close-power',
    guideStep: 'closePowerRequired',
    title: { 'zh-CN': '关闭电源', 'zh-TW': '關閉電源', en: 'Turn off power' },
  },
];

const HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP: Partial<Record<GuideHeatCapacityStep, HeatCapacityGuideLessonStepId>> = {
  openStopcockForZeroRequired: 'pressureZeroBaseline',
  closeStopcockRequired: 'sealedInitialState',
  pumpRequired: 'pressureTarget',
  stabilizeBeforeReleaseRequired: 'preReleaseStability',
  closeStopcockAfterReleaseRequired: 'quickReleaseState',
  recoverRequired: 'thermalRecovery',
};

const getHeatCapacityGuideChecklistIndex = (step: GuideHeatCapacityStep): number => {
  const exactIndex = HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.findIndex((item) => item.guideStep === step);
  if (exactIndex >= 0) return exactIndex;
  if (step === 'completed') return HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1;
  return 0;
};

const HEAT_CAPACITY_GUIDE_STRONG_TARGET_CONFIGS: Record<string, HeatCapacityGuideStrongTargetSpec> = {
  powerSwitch: {
    id: 'powerSwitch',
    focusMode: 'none',
    sceneHoleIds: ['powerSwitch'],
  },
  pressureZero: {
    id: 'pressureZero',
    focusMode: 'instrument',
    sceneHoleIds: ['pressureZero', 'instrumentDisplay'],
    reminderCopyKey: 'guideStrongReminderPressureZero',
  },
  pumpBulb: {
    id: 'pumpBulb',
    focusMode: 'pump',
    sceneHoleIds: ['pumpBulb', 'instrumentDisplay'],
  },
  pumpValve: {
    id: 'pumpValve',
    focusMode: 'bottle',
    sceneHoleIds: ['bottleControls'],
  },
  stopcock: {
    id: 'stopcock',
    focusMode: 'bottle',
    sceneHoleIds: ['bottleControls'],
  },
  instrumentPressureDisplay: {
    id: 'instrumentPressureDisplay',
    focusMode: 'instrument',
    sceneHoleIds: ['instrumentDisplay'],
  },
  instrumentTemperatureDisplay: {
    id: 'instrumentTemperatureDisplay',
    focusMode: 'instrument',
    sceneHoleIds: ['instrumentDisplay'],
  },
  recordU0: {
    id: 'recordU0',
    focusMode: 'instrument',
    sceneHoleIds: ['instrumentDisplay'],
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u0"], [data-heat-capacity-free-record="u0"]', padding: 10, rx: 12 },
    ],
  },
  recordU1: {
    id: 'recordU1',
    focusMode: 'instrument',
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u1"], [data-heat-capacity-free-record="u1"]', padding: 10, rx: 12 },
      { id: 'guideTimer', selector: '[data-heat-capacity-wait-timer="true"]', padding: 8, rx: 12, optional: true },
    ],
    sceneHoleIds: ['instrumentDisplay'],
  },
  recordU2: {
    id: 'recordU2',
    focusMode: 'instrument',
    domHoles: [
      { id: 'recordButton', selector: '[data-heat-capacity-guided-record="u2"], [data-heat-capacity-free-record="u2"]', padding: 10, rx: 12 },
      { id: 'guideTimer', selector: '[data-heat-capacity-wait-timer="true"]', padding: 8, rx: 12, optional: true },
    ],
    sceneHoleIds: ['instrumentDisplay'],
  },
};

const HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK: HeatCapacityGuideStrongTargetSpec = {
  id: 'fallback',
  focusMode: null,
  sceneHoleIds: [],
};

const getHeatCapacityGuideStrongTargetSpec = (controlId: string | null): HeatCapacityGuideStrongTargetSpec => (
  controlId ? HEAT_CAPACITY_GUIDE_STRONG_TARGET_CONFIGS[controlId] ?? HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK : HEAT_CAPACITY_GUIDE_STRONG_TARGET_FALLBACK
);

const getHeatCapacityGuideDomCutout = (
  maskRoot: HTMLElement | null,
  domHole: HeatCapacityGuideStrongDomCutout,
  bounds: { width: number; height: number },
): HeatCapacityGuideStrongCutout | null => {
  if (!maskRoot || bounds.width <= 0 || bounds.height <= 0) return null;
  const sceneRoot = maskRoot.closest('[data-heat-capacity-instrument-scene="true"]') as HTMLElement | null;
  const element = sceneRoot?.querySelector(domHole.selector) as HTMLElement | null;
  if (!element) return null;
  const rootRect = maskRoot.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const padding = domHole.padding ?? 8;
  const x = Math.max(0, elementRect.left - rootRect.left - padding);
  const y = Math.max(0, elementRect.top - rootRect.top - padding);
  const right = Math.min(bounds.width, elementRect.right - rootRect.left + padding);
  const bottom = Math.min(bounds.height, elementRect.bottom - rootRect.top + padding);
  const width = Math.max(1, right - x);
  const height = Math.max(1, bottom - y);
  return {
    id: domHole.id,
    shape: 'rect',
    x,
    y,
    width,
    height,
    rx: domHole.rx ?? 8,
  };
};

const getHeatCapacityGuideStrongCutouts = (
  targetSpec: HeatCapacityGuideStrongTargetSpec,
  projectedHoles: Record<string, HeatCapacityGuideStrongCutout>,
  maskRoot: HTMLElement | null,
  bounds: { width: number; height: number },
): HeatCapacityGuideStrongCutout[] => {
  const cutouts: HeatCapacityGuideStrongCutout[] = [];
  targetSpec.sceneHoleIds.forEach((holeId) => {
    const projectedHole = projectedHoles[holeId];
    if (projectedHole) cutouts.push(projectedHole);
  });
  targetSpec.domHoles?.forEach((domHole) => {
    const cutout = getHeatCapacityGuideDomCutout(maskRoot, domHole, bounds);
    if (cutout) cutouts.push(cutout);
  });
  if (cutouts.length > 0) return cutouts;
  return [
    {
      id: 'centerViewport',
      shape: 'rect',
      x: bounds.width * 0.33,
      y: bounds.height * 0.32,
      width: bounds.width * 0.34,
      height: bounds.height * 0.26,
      rx: 14,
    },
  ];
};

const renderHeatCapacityGuideStrongCutoutOutline = (
  cutout: HeatCapacityGuideStrongCutout,
) => {
  const commonProps = {
    fill: 'rgba(56, 189, 248, 0.1)',
    stroke: 'rgba(125, 211, 252, 0.95)',
    strokeWidth: 0.55,
    className: 'studio-heat-guide-strong-cutout-outline',
    vectorEffect: 'non-scaling-stroke' as const,
  };
  if (cutout.shape === 'rect') {
    return (
      <rect
        key={`outline-${cutout.id}`}
        {...commonProps}
        x={cutout.x}
        y={cutout.y}
        width={cutout.width}
        height={cutout.height}
        rx={cutout.rx ?? 2}
      />
    );
  }
  return (
    <ellipse
      key={`outline-${cutout.id}`}
      {...commonProps}
      cx={cutout.cx}
      cy={cutout.cy}
      rx={cutout.rx}
      ry={cutout.ry}
    />
  );
};

const createHeatCapacityGuideStrongRectPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0,
) => {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const radius = Math.max(0, Math.min(rx, safeWidth / 2, safeHeight / 2));
  if (safeWidth <= 0 || safeHeight <= 0) return '';
  if (radius <= 0) {
    return `M${x} ${y}H${x + safeWidth}V${y + safeHeight}H${x}Z`;
  }
  return [
    `M${x + radius} ${y}`,
    `H${x + safeWidth - radius}`,
    `Q${x + safeWidth} ${y} ${x + safeWidth} ${y + radius}`,
    `V${y + safeHeight - radius}`,
    `Q${x + safeWidth} ${y + safeHeight} ${x + safeWidth - radius} ${y + safeHeight}`,
    `H${x + radius}`,
    `Q${x} ${y + safeHeight} ${x} ${y + safeHeight - radius}`,
    `V${y + radius}`,
    `Q${x} ${y} ${x + radius} ${y}`,
    'Z',
  ].join('');
};

const createHeatCapacityGuideStrongCutoutPath = (
  cutout: HeatCapacityGuideStrongCutout,
) => {
  if (cutout.shape === 'rect') {
    return createHeatCapacityGuideStrongRectPath(
      cutout.x,
      cutout.y,
      cutout.width,
      cutout.height,
      cutout.rx ?? 2,
    );
  }
  const rx = Math.max(0, cutout.rx);
  const ry = Math.max(0, cutout.ry);
  if (rx <= 0 || ry <= 0) return '';
  return [
    `M${cutout.cx + rx} ${cutout.cy}`,
    `A${rx} ${ry} 0 1 0 ${cutout.cx - rx} ${cutout.cy}`,
    `A${rx} ${ry} 0 1 0 ${cutout.cx + rx} ${cutout.cy}`,
    'Z',
  ].join('');
};

const createHeatCapacityGuideStrongDimPath = (
  bounds: { width: number; height: number },
  cutouts: HeatCapacityGuideStrongCutout[],
) => [
  createHeatCapacityGuideStrongRectPath(0, 0, bounds.width, bounds.height),
  ...cutouts.map(createHeatCapacityGuideStrongCutoutPath),
].filter(Boolean).join('');

const renderHeatCapacityParameterSymbol = (
  parts: HeatCapacityFreeParameterSymbolPart[],
) => {
  const hasParts = parts.length > 0;
  return (
    <span
      className={`studio-param-symbol ${hasParts ? '' : 'studio-param-symbol-empty'}`}
      aria-hidden={hasParts ? undefined : true}
    >
      {parts.map((part, index) => (
        typeof part === 'string'
          ? <span key={index}>{part}</span>
          : <sub key={index}>{part.sub}</sub>
      ))}
    </span>
  );
};

interface ConsoleLog extends WorkbenchLocalizedConsoleMessage {
  id: number;
  time: string;
  kind: LogKind;
}

type WorkbenchFilePresentationSnapshot =
  | {
      kind: 'standard';
      state: Pick<Extract<WorkbenchFileState, { kind: 'standard' }>,
        'visiblePanels' | 'liveWorkspaceSplitRatio' | 'standardResultsLayout'>;
    }
  | {
      kind: 'ideal';
      state: Pick<Extract<WorkbenchFileState, { kind: 'ideal' }>,
        'visiblePanels' | 'liveWorkspaceSplitRatio' | 'idealWindowLayout'>;
    }
  | {
      kind: 'heatCapacity';
      state: Pick<Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
        | 'visiblePanels'
        | 'liveWorkspaceSplitRatio'
        | 'openHeatCapacityTabs'
        | 'activeHeatCapacityTabId'
        | 'heatCapacityTabContainerHeight'
        | 'heatCapacityMaterialsExpanded'>;
    }
  | {
      kind: 'heatCapacityPistonOscillation';
      state: Pick<Extract<WorkbenchFileState, { kind: 'heatCapacityPistonOscillation' }>,
        'visiblePanels' | 'liveWorkspaceSplitRatio' | 'previewCameraPreset'>;
    };

interface WorkbenchWorkspaceEditSnapshot {
  kind: 'workspace';
  label: string;
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

interface WorkbenchFileEditSnapshot {
  kind: 'file';
  label: string;
  fileId: string;
  file: WorkbenchFileState;
  selectedPanel: WorkbenchPanelKey;
}

interface WorkbenchPresentationEditSnapshot {
  kind: 'presentation';
  label: string;
  fileId: string;
  presentation: WorkbenchFilePresentationSnapshot;
  selectedPanel: WorkbenchPanelKey;
}

type WorkbenchEditSnapshot =
  | WorkbenchWorkspaceEditSnapshot
  | WorkbenchFileEditSnapshot
  | WorkbenchPresentationEditSnapshot;

type WorkbenchEditScope = WorkbenchEditSnapshot['kind'];

interface PanelDefinition {
  key: WorkbenchPanelKey;
  title: string;
  hint: string;
  icon: React.ReactNode;
  defaultVisible?: boolean;
}

interface StandardEngineRuntime {
  engine: PhysicsEngine;
  frameCount: number;
  simulationTimerId: number | null;
}

interface ApplyActiveFileParamsOptions {
  silent?: boolean;
  forceReset?: boolean;
}

interface UpdateIdealScanVariableOptions {
  snap?: boolean;
}

interface WorkbenchCopy {
  menus: {
    experimentFiles: string;
    newWindow: string;
    newExperiment: string;
    openExperiment: string;
    noCachedExperiments: string;
    edit: string;
    window: string;
    settings: string;
    help: string;
    general: string;
    standardStudy: string;
    idealStudy: string;
    heatCapacityStudy: string;
    heatCapacityPistonOscillationStudy: string;
    undo: string;
    redo: string;
    empty: string;
    clearEditHistory: string;
    panelsFor: (name: string) => string;
    resetDefaultLayout: string;
    default: string;
    saveWorkbenchLayoutDefault: string;
    userGuide: string;
    about: string;
    topCommandsAria: string;
  };
  settings: {
    title: string;
    subtitle: string;
    closeAria: string;
    theme: string;
    themeHint: string;
    themeOptions: Record<WorkbenchThemePreference, { label: string; hint: string }>;
    language: string;
    languageHint: string;
    languageOptions: Record<WorkbenchLanguagePreference, { label: string; hint: string }>;
    performanceMode: string;
    performanceModeHint: string;
    performanceModeSummary: Record<WorkbenchPerformanceMode, string>;
    audio: string;
    audioHint: string;
    audioMuteAria: string;
    audioUnmuteAria: string;
    audioVolumeAria: string;
  };
  about: {
    title: string;
    subtitle: string;
    closeAria: string;
    currentVersion: string;
    checkUpdates: string;
    localDataExportEnvironment: string;
    workspaceSessionCache: string;
    buildNotes: string;
    openBuildNotice: string;
    closeBuildNotice: string;
    buildNoticeTitle: string;
    buildNoticeSubtitle: string;
    buildNoticeNavToggle: string;
    buildNoticeNavTitle: string;
    buildNoticeBack: string;
    buildNoticeOpenLocalFile: string;
    buildNoticeOpenInBrowser: string;
    buildNoticeLargeFileBody: string;
    buildNoticePreviewUnavailable: string;
    buildNoticeOpenUnavailable: string;
    checking: string;
    available: string;
    unavailable: string;
    error: string;
    environmentResultTitle: string;
    environmentResultAvailable: string;
    environmentResultUnavailable: string;
    environmentResultError: string;
    updateResultTitle: string;
    updateAvailableTitle: string;
    updateCheckFailedTitle: string;
    updateAvailableBody: string;
    updateCheckFailedBody: string;
    updateReadyTitle: string;
    updateReadyBody: string;
    currentVersionLabel: string;
    latestVersionLabel: string;
    releaseDateLabel: string;
    releaseNotesLabel: string;
    noReleaseNotes: string;
    ignoreThisVersion: string;
    updateNow: string;
    restartAndInstall: string;
    retryCheck: string;
    later: string;
    ignoredVersionTitle: string;
    ignoredVersionBody: (version: string) => string;
    updateAvailableStatus: (version: string) => string;
    upToDateStatus: string;
    unsupportedUpdateStatus: string;
    downloadingUpdateStatus: (percent: number | null) => string;
    retryingUpdateStatus: (attempt: number | null, maxAttempts: number | null) => string;
    updateReadyStatus: string;
    updateErrorStatus: string;
    updateDownloadFailedStatus: (attempt: number | null, maxAttempts: number | null) => string;
    retryDownload: string;
    manualDownload: string;
    sessionCacheSummary: (total: number) => string;
    sessionCacheBreakdown: (ideal: number, heat: number, standard: number) => string;
  };
  files: {
    openFiles: string;
    files: string;
    panels: string;
    noOpenFiles: string;
    noOpenFileState: string;
    noOpenPanelState: string;
    emptyHint: string;
    noOpenStudy: string;
    emptyTitle: string;
    emptyBody: string;
    createStandard: string;
    createIdeal: string;
    createHeatCapacity: string;
    createHeatCapacityPistonOscillation: string;
    rename: string;
    delete: string;
    confirmDelete: string;
    closeExperiment: string;
    confirmCloseRunningExperiment: (name: string) => string;
    cancel: string;
    locked: string;
    shown: string;
    open: string;
    active: string;
    off: string;
    std: string;
    ideal: string;
    heat: string;
    workspaceAria: string;
    usageHintAria: string;
    clickSelectHint: string;
    doubleClickOpenHint: string;
    openActions: (name: string) => string;
  };
  panels: {
    previewTitle: string;
    previewHint: string;
    realtimeTitle: string;
    heatRealtimeTitle: string;
    standardRealtimeHint: string;
    idealRealtimeHint: string;
    heatRealtimeHint: string;
    standardResultsTitle: string;
    standardResultsHint: string;
    idealResultsTitle: string;
    idealResultsHint: string;
    pointsTitle: string;
    pointsHint: string;
    verificationTitle: string;
    verificationHint: string;
    summaryTitle: string;
    dataTableTitle: string;
    figuresTitle: string;
    liveWorkspaceResizeAria: string;
  };
  parameters: {
    title: string;
    currentFileValues: string;
    lockedUntilStopped: string;
    standardSimulation: string;
    idealSimulation: string;
    heatCapacityExperiment: string;
    savedChangesOnStart: string;
    idealRuntimeOnStart: string;
    applied: string;
    relation: string;
    scanVariable: string;
    samplingPreset: string;
    targetTemperature: string;
    boxLength: string;
    particleCount: string;
    customPreset: string;
    setSamplingPrecision: string;
    relationHints: Record<ExperimentRelation, string>;
    setScanValue: (title: string) => string;
    adjustScanValue: (title: string) => string;
    recommendedValues: (title: string) => string;
    parameterLabels: Record<ExperimentParamKey | 'relation', string>;
    samplingPresets: Record<IdealSamplingPresetKey, string>;
    samplingDuration: (equilibriumTime: number, statsDuration: number) => string;
    advancedSettings: string;
    advancedShow: string;
    advancedHide: string;
    edit: string;
    standardReadonlyNote: string;
    idealReadonlyNote: string;
    heatCapacityReadonlyNote: string;
    controlledLockHint: string;
  };
  results: {
    title: string;
    experimentStatus: string;
    scan: string;
    temperature: string;
    pressure: string;
    measuredPressure: string;
    idealPressure: string;
    gap: string;
    pointsTitle: (relation: string) => string;
    pointsShort: (count: number) => string;
    recordedPoints: (count: number) => string;
    clearRelation: string;
    confirmClear: string;
    remove: string;
    confirmRemove: string;
    cancel: string;
    noPoints: string;
    runToRecord: string;
    tableAction: string;
    tableTime: string;
    finalState: string;
    meanSpeed: string;
    measuredBars: string;
    idealLine: string;
    samples: (count: number) => string;
    sampleWindows: (count: number) => string;
    waiting: string;
    finalSpeedSamples: string;
    finalEnergySamples: string;
    tempHistorySamples: string;
    finalDataReady: string;
    energyDrift: string;
    meanAbsTempError: string;
    tempSamples: string;
    resultsReady: (relation: string) => string;
    waitingForRecordedPoints: (relation: string) => string;
    metric: string;
    value: string;
    status: string;
    ready: string;
    notReady: string;
    yes: string;
    no: string;
    diagnostic: string;
    export: string;
    exportAll: string;
    exportFigures: string;
    reportPdf: string;
    verificationFigure: string;
    pointsCsv: string;
    verification: string;
    rawPv: string;
    history: string;
    resultReadyStatus: string;
    resultNotReadyStatus: string;
    resultReadyDetail: string;
    resultNotReadyDetail: string;
    finalTime: string;
    finalTemperature: string;
    finalPressure: string;
    rmsSpeed: string;
    speedBins: string;
    energyBins: string;
    notReadyPreview: string;
    figuresHint: string;
    noIdealPointsTitle: string;
    noIdealPointsBody: string;
    activeRelation: string;
    noIdealVerificationTitle: string;
    noIdealVerificationBody: string;
    historyLockedFor: (relation: string) => string;
    historyUnlocked: string;
    historyUnlockHint: string;
    historicalContext: string;
    workbenchInterpretation: string;
    keyFigures: string;
    keyFiguresValue: (rSquared: string, slopeError: string) => string;
    whyLocked: string;
    whyItHappened: string;
    recommendedNextStep: string;
    exportFilesHint: string;
    pvLinearizedValidation: string;
    relationValidation: (relation: string) => string;
    measuredScatterHint: string;
    originalPvPhysicalView: string;
    originalPvPhysicalHint: string;
    verdictLabel: (relation: string, verdict: string) => string;
    pointsMetric: string;
    rSquared: string;
    slope: string;
    theorySlope: string;
    slopeError: string;
    failureReason: string;
    noneValue: string;
    currentVerification: (rSquared: string, slopeError: string) => string;
    currentVerdictRecommendation: (verdict: string, recommendation: string) => string;
    noIdealHistoryTitle: string;
    noIdealHistoryBody: string;
    noVerificationChartTitle: string;
    noVerificationChartBody: string;
    panelNotConnectedTitle: string;
    panelNotConnectedBody: string;
    measuredLegend: string;
    fitLegend: string;
    theoryLegend: string;
    idealPressureTrace: (relation: string) => string;
    currentIdealPressureHint: string;
    meanTemperature: string;
    relativeGap: string;
    samplingProgress: string;
    speedDistribution: string;
    energyDistribution: string;
    standardRealtimeEmpty: string;
    phase: string;
    phaseStates: Record<SimulationStats['phase'], string>;
    probabilityDensity: string;
    experimentPointTableTitle: string;
    experimentPointTableBody: string;
    idealResultsSectionsAria: string;
    openIdealResultsTabTitle: string;
    verificationChartAria: (relation: string) => string;
    resultsTreeExpandAria: string;
    resultsTreeCollapseAria: string;
    resultsOpenHint: string;
    resultsJumpHint: string;
    figureStatus: Record<'ready' | 'not-ready' | 'not-applicable', string>;
  };
  actions: {
    start: string;
    pause: string;
    stop: string;
    close: string;
    resetView: string;
    hide: string;
    cancel: string;
  };
  shortcuts: {
    title: string;
    hint: string;
    undo: string;
    redo: string;
    closeSettings: string;
  };
  console: {
    title: string;
    tabs: Record<ConsoleTab, string>;
    total: string;
    info: string;
    success: string;
    warnings: string;
    errors: string;
    latest: string;
    runtime: string;
    noLogs: string;
    noWarnings: string;
  };
  status: {
    activeFile: (name: string) => string;
    selectedBlock: (name: string) => string;
    none: string;
    noRuntime: string;
    standardRuntime: string;
    idealRuntime: (relation: string, verdict: string) => string;
    runStates: Record<WorkbenchFileState['runState'], string>;
    verdictStates: Record<string, string>;
  };
  exportEnvironment: Record<WorkbenchExportEnvironmentStatus, { label: string; detail: string }>;
  logs: {
    initialized: string;
    defaultLayout: string;
    standardConnected: string;
    exportBridgeRequired: string;
    autoPausedSingleRuntime: (name: string) => string;
    autoPausedCreateFile: (name: string) => string;
    autoPausedSwitchFile: (name: string) => string;
    fileCreated: (name: string) => string;
    lockedPanel: (title: string) => string;
    layoutReset: (name: string) => string;
    idealResultsOpened: (name: string, tab: string) => string;
    standardResultsOpened: (name: string, tab: string) => string;
    idealResultsClosed: (name: string) => string;
    fileSelected: (name: string) => string;
    confirmClear: (name: string, relation: string) => string;
    clearedRelation: (name: string, relation: string) => string;
    exportLabels: Record<WorkbenchExportMode, string>;
    exportNotReady: (name: string) => string;
    exportNeedsTwoPoints: (name: string) => string;
    exportPayloadPrepared: (name: string, label: string, filename: string, detail: string) => string;
    exportPreparing: (name: string, label: string) => string;
    exportCancelled: (name: string, label: string) => string;
    exportFailed: (name: string, label: string, message: string) => string;
    exportCsvSaved: (name: string, target: string) => string;
    exportCompleted: (name: string, label: string, outDir: string, fileCount: number, figureHint: string) => string;
    exportFigureHint: string;
    unknownExporterError: string;
    selectedLocation: string;
    selectedFolder: string;
    fileNameCannotBeEmpty: string;
    fileNameUnchanged: (name: string) => string;
    fileRenamed: (name: string) => string;
    fileRemoved: (name: string) => string;
    fileClosed: (name: string) => string;
    fileOpenedFromCache: (name: string) => string;
    confirmDeleteFile: (name: string) => string;
    layoutAlreadyDefault: (name: string) => string;
    undoAction: (label: string) => string;
    redoAction: (label: string) => string;
    editHistoryCleared: string;
    layoutSaveNeedsFile: string;
    layoutDefaultSaved: (name: string) => string;
    standardFinished: (name: string) => string;
    standardResultsReady: (name: string) => string;
    idealPointRecorded: (name: string, relation: string, value: string) => string;
    idealPointMissingSummary: (name: string) => string;
    controlledVariablesLocked: (name: string, relation: string, keys: string) => string;
    pauseBeforeEditingParameters: (name: string) => string;
    invalidParameter: (name: string, label: string, value: string) => string;
    pauseBeforeApplyingParameters: (name: string) => string;
    idealRuntimeAlreadyApplied: (name: string) => string;
    noSavedParameterChanges: (name: string) => string;
    idealRuntimeApplied: (name: string, relation: string, keys: string) => string;
    standardParametersApplied: (name: string, action: string) => string;
    parametersSavedAndApplied: string;
    parametersApplied: string;
    runtimeCreateFailed: (name: string, kind: string) => string;
    standardStarted: (name: string) => string;
    idealStarted: (name: string, relation: string) => string;
    simulationPaused: (name: string, kind: string) => string;
    standardTerminated: (name: string) => string;
    idealTerminated: (name: string) => string;
    panelOpened: (name: string, panel: string) => string;
    panelClosed: (name: string, panel: string) => string;
    pauseBeforeSwitchingRelation: (name: string) => string;
    relationAlreadyActive: (name: string, relation: string) => string;
    relationSwitched: (name: string, relation: string) => string;
    pauseBeforeChangingSamplingPreset: (name: string) => string;
    pauseBeforeChangingScanVariable: (name: string) => string;
    confirmRemoveIdealPoint: (name: string, relation: string) => string;
    idealPointRemoved: (name: string) => string;
    relationHasNoPoints: (name: string, relation: string) => string;
    scanInputRequired: (key: string, format: string) => string;
    scanInputIntegerOnly: string;
    scanInputDecimalOnly: (key: string) => string;
    scanInputGreaterThanZero: (key: string) => string;
    scanInputStep: (label: string, step: string) => string;
    scanInputRange: (key: string, min: string, max: string) => string;
    formatPositiveInteger: string;
    formatDecimalNumber: string;
  };
}

type WorkbenchExperimentLogCopy = Pick<WorkbenchCopy['logs'],
  | 'undoAction'
  | 'redoAction'
  | 'editHistoryCleared'
  | 'layoutSaveNeedsFile'
  | 'layoutDefaultSaved'
  | 'standardFinished'
  | 'standardResultsReady'
  | 'idealPointRecorded'
  | 'idealPointMissingSummary'
  | 'controlledVariablesLocked'
  | 'pauseBeforeEditingParameters'
  | 'invalidParameter'
  | 'pauseBeforeApplyingParameters'
  | 'idealRuntimeAlreadyApplied'
  | 'noSavedParameterChanges'
  | 'idealRuntimeApplied'
  | 'standardParametersApplied'
  | 'parametersSavedAndApplied'
  | 'parametersApplied'
  | 'runtimeCreateFailed'
  | 'standardStarted'
  | 'idealStarted'
  | 'simulationPaused'
  | 'standardTerminated'
  | 'idealTerminated'
  | 'panelOpened'
  | 'panelClosed'
  | 'pauseBeforeSwitchingRelation'
  | 'relationAlreadyActive'
  | 'relationSwitched'
  | 'pauseBeforeChangingSamplingPreset'
  | 'pauseBeforeChangingScanVariable'
  | 'confirmRemoveIdealPoint'
  | 'idealPointRemoved'
  | 'relationHasNoPoints'
  | 'scanInputRequired'
  | 'scanInputIntegerOnly'
  | 'scanInputDecimalOnly'
  | 'scanInputGreaterThanZero'
  | 'scanInputStep'
  | 'scanInputRange'
  | 'formatPositiveInteger'
  | 'formatDecimalNumber'
>;

const experimentLogCopies = {
  'zh-CN': {
    undoAction: (label) => '撤销：' + label,
    redoAction: (label) => '重做：' + label,
    editHistoryCleared: '编辑历史已清空。',
    layoutSaveNeedsFile: '请先创建或打开工作台文件，再保存布局默认值。',
    layoutDefaultSaved: (name) => name + '：当前窗口布局已保存为默认布局。',
    standardFinished: (name) => name + '：标准模拟已完成，最终图表数据已就绪。',
    standardResultsReady: (name) => name + '：结果已就绪。可从面板列表打开结果，查看摘要、数据和图像。',
    idealPointRecorded: (name, relation, value) => name + '：已记录 ' + relation + ' 点，扫描值 ' + value + '。',
    idealPointMissingSummary: (name) => name + '：理想气体运行已结束，但压强摘要尚未就绪，未记录实验点。',
    controlledVariablesLocked: (name, relation, keys) => name + '：' + relation + ' 数据表已有记录，受控变量已锁定。清空表格后才能修改 ' + keys + '。',
    pauseBeforeEditingParameters: (name) => name + '：请先暂停模拟，再编辑参数。',
    invalidParameter: (name, label, value) => name + '：参数 ' + label + '="' + value + '" 无效。',
    pauseBeforeApplyingParameters: (name) => name + '：请先暂停模拟，再应用已保存参数。',
    idealRuntimeAlreadyApplied: (name) => name + '：理想运行时已使用当前保存参数，无需重新应用。',
    noSavedParameterChanges: (name) => name + '：没有需要应用的已保存参数变更。',
    idealRuntimeApplied: (name, relation, keys) => name + '：已为 ' + relation + ' 应用理想运行时；变更参数：' + keys + '。',
    standardParametersApplied: (name, action) => name + '：参数已' + action + '；运行时已重建，可开始运行。',
    parametersSavedAndApplied: '保存并应用',
    parametersApplied: '应用',
    runtimeCreateFailed: (name, kind) => name + '：未能创建' + kind + '运行时。',
    standardStarted: (name) => name + '：标准模拟已启动，3D 预览正在实时更新。',
    idealStarted: (name, relation) => name + '：' + relation + ' 采样运行已启动。',
    simulationPaused: (name, kind) => name + '：' + kind + '已暂停。',
    standardTerminated: (name) => name + '：标准模拟已终止并返回初始状态。',
    idealTerminated: (name) => name + '：理想气体模拟已终止并返回初始状态。',
    panelOpened: (name, panel) => name + '：已打开面板 ' + panel + '。',
    panelClosed: (name, panel) => name + '：已关闭面板 ' + panel + '。',
    pauseBeforeSwitchingRelation: (name) => name + '：请先暂停当前理想气体运行，再切换关系。',
    relationAlreadyActive: (name, relation) => name + '：' + relation + ' 已是当前关系。',
    relationSwitched: (name, relation) => name + '：已切换到 ' + relation + ' 关系。',
    pauseBeforeChangingSamplingPreset: (name) => name + '：请先暂停当前理想气体运行，再更改采样预设。',
    pauseBeforeChangingScanVariable: (name) => name + '：请先暂停当前理想气体运行，再更改扫描变量。',
    confirmRemoveIdealPoint: (name, relation) => name + '：点击确认移除以删除此 ' + relation + ' 点。',
    idealPointRemoved: (name) => name + '：已移除理想气体实验点。',
    relationHasNoPoints: (name, relation) => name + '：' + relation + ' 没有可清空的点。',
    scanInputRequired: (key, format) => key + ' 需要输入' + format + '。',
    scanInputIntegerOnly: 'N 只支持正整数输入。N 的最小步长为 1。',
    scanInputDecimalOnly: (key) => key + ' 只支持普通小数输入。',
    scanInputGreaterThanZero: (key) => key + ' 必须大于 0。',
    scanInputStep: (label, step) => label + ' 的最小步长为 ' + step + '。',
    scanInputRange: (key, min, max) => key + ' 必须保持在 ' + min + ' 到 ' + max + ' 之间。',
    formatPositiveInteger: '正整数',
    formatDecimalNumber: '小数',
  },
  'zh-TW': {
    undoAction: (label) => '復原：' + label,
    redoAction: (label) => '重做：' + label,
    editHistoryCleared: '編輯歷史已清空。',
    layoutSaveNeedsFile: '請先建立或開啟工作台檔案，再儲存版面預設值。',
    layoutDefaultSaved: (name) => name + '：目前視窗版面已儲存為預設版面。',
    standardFinished: (name) => name + '：標準模擬已完成，最終圖表資料已就緒。',
    standardResultsReady: (name) => name + '：結果已就緒。可從面板列表開啟結果，查看摘要、資料和圖像。',
    idealPointRecorded: (name, relation, value) => name + '：已記錄 ' + relation + ' 點，掃描值 ' + value + '。',
    idealPointMissingSummary: (name) => name + '：理想氣體執行已結束，但壓強摘要尚未就緒，未記錄實驗點。',
    controlledVariablesLocked: (name, relation, keys) => name + '：' + relation + ' 資料表已有記錄，受控變量已鎖定。清空表格後才能修改 ' + keys + '。',
    pauseBeforeEditingParameters: (name) => name + '：請先暫停模擬，再編輯參數。',
    invalidParameter: (name, label, value) => name + '：參數 ' + label + '="' + value + '" 無效。',
    pauseBeforeApplyingParameters: (name) => name + '：請先暫停模擬，再套用已儲存參數。',
    idealRuntimeAlreadyApplied: (name) => name + '：理想執行階段已使用目前儲存參數，無需重新套用。',
    noSavedParameterChanges: (name) => name + '：沒有需要套用的已儲存參數變更。',
    idealRuntimeApplied: (name, relation, keys) => name + '：已為 ' + relation + ' 套用理想執行階段；變更參數：' + keys + '。',
    standardParametersApplied: (name, action) => name + '：參數已' + action + '；執行階段已重建，可開始執行。',
    parametersSavedAndApplied: '儲存並套用',
    parametersApplied: '套用',
    runtimeCreateFailed: (name, kind) => name + '：未能建立' + kind + '執行階段。',
    standardStarted: (name) => name + '：標準模擬已啟動，3D 預覽正在即時更新。',
    idealStarted: (name, relation) => name + '：' + relation + ' 採樣執行已啟動。',
    simulationPaused: (name, kind) => name + '：' + kind + '已暫停。',
    standardTerminated: (name) => name + '：標準模擬已終止並返回初始狀態。',
    idealTerminated: (name) => name + '：理想氣體模擬已終止並返回初始狀態。',
    panelOpened: (name, panel) => name + '：已開啟面板 ' + panel + '。',
    panelClosed: (name, panel) => name + '：已關閉面板 ' + panel + '。',
    pauseBeforeSwitchingRelation: (name) => name + '：請先暫停目前理想氣體執行，再切換關係。',
    relationAlreadyActive: (name, relation) => name + '：' + relation + ' 已是目前關係。',
    relationSwitched: (name, relation) => name + '：已切換到 ' + relation + ' 關係。',
    pauseBeforeChangingSamplingPreset: (name) => name + '：請先暫停目前理想氣體執行，再更改採樣預設。',
    pauseBeforeChangingScanVariable: (name) => name + '：請先暫停目前理想氣體執行，再更改掃描變量。',
    confirmRemoveIdealPoint: (name, relation) => name + '：點擊確認移除以刪除此 ' + relation + ' 點。',
    idealPointRemoved: (name) => name + '：已移除理想氣體實驗點。',
    relationHasNoPoints: (name, relation) => name + '：' + relation + ' 沒有可清空的點。',
    scanInputRequired: (key, format) => key + ' 需要輸入' + format + '。',
    scanInputIntegerOnly: 'N 只支援正整數輸入。N 的最小步長為 1。',
    scanInputDecimalOnly: (key) => key + ' 只支援普通小數輸入。',
    scanInputGreaterThanZero: (key) => key + ' 必須大於 0。',
    scanInputStep: (label, step) => label + ' 的最小步長為 ' + step + '。',
    scanInputRange: (key, min, max) => key + ' 必須保持在 ' + min + ' 到 ' + max + ' 之間。',
    formatPositiveInteger: '正整數',
    formatDecimalNumber: '小數',
  },
  en: {
    undoAction: (label) => 'Undo: ' + label,
    redoAction: (label) => 'Redo: ' + label,
    editHistoryCleared: 'Edit history cleared.',
    layoutSaveNeedsFile: 'Create or open a workbench file before saving layout defaults.',
    layoutDefaultSaved: (name) => name + ': current window layout saved as the default.',
    standardFinished: (name) => name + ': standard simulation finished and final chart data is ready.',
    standardResultsReady: (name) => name + ': results are ready. Open Results from the Panels list to review summary, data, and figures.',
    idealPointRecorded: (name, relation, value) => name + ': recorded ' + relation + ' point at ' + value + '.',
    idealPointMissingSummary: (name) => name + ': ideal-gas run finished, but pressure summary was not ready for a point.',
    controlledVariablesLocked: (name, relation, keys) => name + ': controlled variables are locked while the ' + relation + ' data table has rows. Clear the table before changing ' + keys + '.',
    pauseBeforeEditingParameters: (name) => name + ': pause the simulation before editing parameters.',
    invalidParameter: (name, label, value) => name + ': invalid parameter ' + label + '="' + value + '".',
    pauseBeforeApplyingParameters: (name) => name + ': pause the simulation before applying saved parameters.',
    idealRuntimeAlreadyApplied: (name) => name + ': ideal runtime is already applied for the saved parameters.',
    noSavedParameterChanges: (name) => name + ': no saved parameter changes to apply.',
    idealRuntimeApplied: (name, relation, keys) => name + ': ideal runtime applied for ' + relation + '; changed keys: ' + keys + '.',
    standardParametersApplied: (name, action) => name + ': parameters ' + action + '; runtime rebuilt and ready to run.',
    parametersSavedAndApplied: 'saved and applied',
    parametersApplied: 'applied',
    runtimeCreateFailed: (name, kind) => name + ': failed to create a ' + kind + ' runtime.',
    standardStarted: (name) => name + ': standard simulation started with live 3D preview.',
    idealStarted: (name, relation) => name + ': ' + relation + ' sample run started.',
    simulationPaused: (name, kind) => name + ': ' + kind + ' paused.',
    standardTerminated: (name) => name + ': standard simulation terminated and returned to its start state.',
    idealTerminated: (name) => name + ': ideal-gas simulation terminated and returned to its start state.',
    panelOpened: (name, panel) => name + ': opened panel ' + panel + '.',
    panelClosed: (name, panel) => name + ': closed panel ' + panel + '.',
    pauseBeforeSwitchingRelation: (name) => name + ': pause the current ideal run before switching relation.',
    relationAlreadyActive: (name, relation) => name + ': ' + relation + ' is already active.',
    relationSwitched: (name, relation) => name + ': switched to ' + relation + ' relation.',
    pauseBeforeChangingSamplingPreset: (name) => name + ': pause the current ideal run before changing sampling preset.',
    pauseBeforeChangingScanVariable: (name) => name + ': pause the current ideal run before changing the scan variable.',
    confirmRemoveIdealPoint: (name, relation) => name + ': click Confirm Remove to remove this ' + relation + ' point.',
    idealPointRemoved: (name) => name + ': ideal experiment point removed.',
    relationHasNoPoints: (name, relation) => name + ': ' + relation + ' has no points to clear.',
    scanInputRequired: (key, format) => key + ' requires a ' + format + '.',
    scanInputIntegerOnly: 'N only supports positive integer input. N minimum step is 1.',
    scanInputDecimalOnly: (key) => key + ' only supports ordinary decimal input.',
    scanInputGreaterThanZero: (key) => key + ' must be greater than 0.',
    scanInputStep: (label, step) => label + ' minimum step is ' + step + '.',
    scanInputRange: (key, min, max) => key + ' must stay between ' + min + ' and ' + max + '.',
    formatPositiveInteger: 'positive integer',
    formatDecimalNumber: 'decimal number',
  },
} satisfies Record<WorkbenchLanguagePreference, WorkbenchExperimentLogCopy>;

const LOCKED_PANEL_KEYS: WorkbenchPanelKey[] = ['preview', 'realtime'];
const isPistonOscillationDevelopmentPanelKey = (
  file: WorkbenchFileState,
  panel: WorkbenchPanelKey,
) => (
  file.kind === 'heatCapacityPistonOscillation' &&
  isHeatCapacityPanelKey(panel)
);
const shouldCollapseWorkbenchParameterSidebar = (
  file: WorkbenchFileState | undefined,
) => (
  file?.kind === 'heatCapacity' ||
  file?.kind === 'heatCapacityPistonOscillation'
);
const LEFT_SIDEBAR_MIN = 220;
const LEFT_SIDEBAR_MAX = 420;
const PARAM_SIDEBAR_MIN = 240;
const PARAM_SIDEBAR_MAX = 420;
const SIMULATION_TICK_INTERVAL_MS = 16;
const IDEAL_ADVANCED_SCROLL_DURATION_MS = 420;
const HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO = IDEAL_RESULT_MIN_HEIGHT_RATIO;
const STANDARD_RESULTS_BOTTOM_INSET = 10;
const RESIZER_GRAB_SAFE_SPACE = 14;
const HEAT_CAPACITY_AUTO_DEMO_RESET_MS = 1_800;
const HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS = 560;

const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = {
  'zh-CN': {
    menus: {
      experimentFiles: '实验文件', newWindow: '新窗口', newExperiment: '新建实验', openExperiment: '打开实验', noCachedExperiments: '没有可打开的缓存实验', edit: '编辑', window: '窗口', settings: '设置', help: '帮助', general: '通用',
      standardStudy: '标准模拟研究', idealStudy: '理想气体模拟研究', heatCapacityStudy: '空气热容比（绝热膨胀法）', heatCapacityPistonOscillationStudy: '空气热容比（活塞振动法）', undo: '撤销', redo: '重做', empty: '空',
      clearEditHistory: '清空编辑历史', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '恢复默认布局', default: '默认',
      saveWorkbenchLayoutDefault: '保存当前窗口布局为默认',
      userGuide: '用户指南', about: '关于气律实验室', topCommandsAria: '顶部命令',
    },
    settings: {
      title: '通用设置', subtitle: '主题、语言、音效、快捷键和布局偏好', closeAria: '关闭通用设置', theme: '主题', themeHint: '使用系统、亮色或暗色模式',
      themeOptions: { system: { label: '跟随系统', hint: '遵循系统偏好' }, light: { label: '亮色', hint: '亮色工作区预览' }, dark: { label: '暗色', hint: '暗色工作区预览' } },
      language: '语言', languageHint: '选择界面语言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '简体中文界面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D 性能模式',
      performanceModeHint: '用四档模式控制 Heat Capacity 小球数量、速率和运行负载',
      performanceModeSummary: { lowLoad: '低负载', balanced: '均衡', highPerformance: '高性能', ultra: '极致画质' },
      audio: '音效',
      audioHint: '增强仪器操作反馈，仅调节软件内音量',
      audioMuteAria: '静音软件音效',
      audioUnmuteAria: '取消静音软件音效',
      audioVolumeAria: '软件音效音量',
    },
    about: {
      title: '关于气律实验室',
      subtitle: '气律实验室',
      closeAria: '关闭关于窗口',
      currentVersion: '当前版本',
      checkUpdates: '检查更新',
      localDataExportEnvironment: '本地数据导出环境',
      workspaceSessionCache: '工作区会话缓存',
      buildNotes: '构建说明',
      openBuildNotice: '打开权限说明与第三方开源许可',
      closeBuildNotice: '关闭权限说明与第三方开源许可',
      buildNoticeTitle: '权限说明与第三方开源许可',
      buildNoticeSubtitle: '本机权限、本地数据、网络访问和第三方许可',
      buildNoticeNavToggle: '打开或收起声明目录',
      buildNoticeNavTitle: '声明目录',
      buildNoticeBack: '返回权限说明',
      buildNoticeOpenLocalFile: '打开完整本地文件',
      buildNoticeOpenInBrowser: '在浏览器中打开',
      buildNoticeLargeFileBody: '该许可材料内容较长，已随软件安装包完整提供。请使用下方按钮在系统浏览器或默认查看器中打开完整本地文件。',
      buildNoticePreviewUnavailable: '当前环境无法直接预览该材料，请打开完整本地文件查看。',
      buildNoticeOpenUnavailable: '当前环境无法打开本地文件。',
      checking: '正在检查',
      available: '可用',
      unavailable: '不可用',
      error: '检查失败',
      environmentResultTitle: '本地环境检查完成',
      environmentResultAvailable: '本地数据导出环境可用。',
      environmentResultUnavailable: '本地数据导出环境不可用，当前环境不能直接导出 PDF / 图像。',
      environmentResultError: '本地数据导出环境检查失败。模拟、实时图表和结果预览仍可使用。',
      updateResultTitle: '更新检查完成',
      updateAvailableTitle: '发现可用更新',
      updateCheckFailedTitle: '更新检查失败',
      updateAvailableBody: '新版本已发布，可以立即下载并准备安装。',
      updateCheckFailedBody: '尚未取得最新版本信息。请重新检查，或打开受信任的最新发布页手动安装。',
      updateReadyTitle: '更新已下载',
      updateReadyBody: '重启应用后会安装新版本。',
      currentVersionLabel: '当前版本',
      latestVersionLabel: '最新版本',
      releaseDateLabel: '发布时间',
      releaseNotesLabel: '更新说明',
      noReleaseNotes: '该版本没有附加更新说明。',
      ignoreThisVersion: '忽略此版本',
      updateNow: '立即更新',
      restartAndInstall: '重启并安装',
      retryCheck: '重新检查',
      later: '稍后',
      ignoredVersionTitle: '已忽略此版本',
      ignoredVersionBody: (version) => '版本 ' + version + ' 不会再主动提醒。',
      updateAvailableStatus: (version) => '发现 ' + version,
      upToDateStatus: '已是最新版本',
      unsupportedUpdateStatus: '仅桌面安装版可用',
      downloadingUpdateStatus: (percent) => '正在下载' + (percent === null ? '' : ' ' + Math.round(percent) + '%'),
      retryingUpdateStatus: (attempt, maxAttempts) => '网络波动，正在重试下载' + (attempt && maxAttempts ? '（' + attempt + '/' + maxAttempts + '）' : '') + '...',
      updateReadyStatus: '更新已准备好',
      updateErrorStatus: '检查失败',
      updateDownloadFailedStatus: (attempt, maxAttempts) => '自动更新失败' + (attempt && maxAttempts ? '，已重试 ' + attempt + '/' + maxAttempts + ' 次' : '') + '。可以稍后重试或手动下载安装包。',
      retryDownload: '重试下载',
      manualDownload: '手动下载',
      sessionCacheSummary: (total) => '当前会话包含 ' + total + ' 个实验文件',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/比热/标准：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '打开文件', files: '文件', panels: '面板', noOpenFiles: '没有打开的文件', noOpenFileState: '当前没有打开的实验文件', noOpenPanelState: '打开实验后显示可用面板。', emptyHint: '在主工作区新建或打开实验。',
      noOpenStudy: '没有打开的研究', emptyTitle: '开始新的实验工作区', emptyBody: '创建标准模拟、理想气体关系研究或空气比热容比实验，以恢复预览、图表、结果和参数面板。',
      createStandard: '创建标准模拟研究', createIdeal: '创建理想气体模拟研究', createHeatCapacity: '创建空气热容比（绝热膨胀法）', createHeatCapacityPistonOscillation: '创建空气热容比（活塞振动法）', rename: '重命名', delete: '删除', confirmDelete: '确认删除', closeExperiment: '关闭实验', confirmCloseRunningExperiment: (name) => '实验正在运行。确认关闭 ' + name + ' 吗？', cancel: '取消',
      locked: '锁定', shown: '显示', open: '打开', active: '活动', off: '关闭', std: '标准', ideal: '理想', heat: '热容', workspaceAria: '文件工作区', usageHintAria: '文件树操作提示', clickSelectHint: '单击选中', doubleClickOpenHint: '双击打开', openActions: (name) => '打开 ' + name + ' 的操作菜单',
    },
    panels: {
      previewTitle: '3D 预览', previewHint: '实时分子视口', realtimeTitle: '实时数据 / 图表', heatRealtimeTitle: '实时数据', standardRealtimeHint: '实时温度、压力和图表轨迹', idealRealtimeHint: '实时 T、P、关系和图表轨迹', heatRealtimeHint: 'Uₜ / Uₚ、压强和过程采样',
      standardResultsTitle: '结果', standardResultsHint: '实验状态、数据表和图像', idealResultsTitle: '结果', idealResultsHint: '验证图、历史解锁和导出详情',
      pointsTitle: '实验数据记录', pointsHint: '已记录的关系实验点', verificationTitle: '关系验证分析', verificationHint: '验证图、诊断和导出详情',
      summaryTitle: '摘要', dataTableTitle: '数据表', figuresTitle: '图像', liveWorkspaceResizeAria: '调整视图预览和实时数据区域大小',
    },
    parameters: {
      title: '当前参数', currentFileValues: '当前文件值', lockedUntilStopped: '停止或完成前锁定',
      standardSimulation: '标准模拟', idealSimulation: '理想气体模拟', heatCapacityExperiment: '空气比热容比实验', savedChangesOnStart: '启动时已保存参数', idealRuntimeOnStart: '理想运行时将在开始时连接', applied: '参数已应用',
      relation: '关系', scanVariable: '扫描变量', samplingPreset: '采样预设', targetTemperature: '目标温度', boxLength: '盒长 L', particleCount: '粒子数 N', customPreset: '自定义', setSamplingPrecision: '设置采样精度', relationHints: { pt: '固定 N 和 V 扫描温度', pv: '通过盒长 L 扫描体积', pn: '固定 T 和 V 扫描粒子数' }, setScanValue: (title) => '设置' + title, adjustScanValue: (title) => '调整' + title, recommendedValues: (title) => title + '推荐值',
      parameterLabels: { N: '粒子数量', r: '粒子半径', L: '容器边长', m: '粒子质量', k: '玻尔兹曼常数', dt: '时间步长', nu: '碰撞频率', targetTemperature: '目标温度', equilibriumTime: '平衡时间', statsDuration: '统计时长', relation: '关系' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '稳定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 统计',
      advancedSettings: '高级设置', advancedShow: '显示模型常数和采样值', advancedHide: '隐藏模型常数和采样值', edit: '编辑',
      standardReadonlyNote: '标准模拟参数在这里直接显示。', idealReadonlyNote: '关系、扫描变量和采样预设在上方控制。', heatCapacityReadonlyNote: '粒子动画仅用于可视化气体分子运动状态；最终比热容比按空气比热容比实验模型计算。', controlledLockHint: '当前关系已有数据，受控变量已锁定。',
    },
    results: {
      title: '结果', experimentStatus: '实验状态', scan: '扫描', temperature: '温度', pressure: '压强', measuredPressure: '实测 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 点', pointsShort: (count) => count + ' 点', recordedPoints: (count) => count + ' 个记录点',
      clearRelation: '清空关系', confirmClear: '确认清空', remove: '移除', confirmRemove: '确认移除', cancel: '取消', noPoints: '没有点', runToRecord: '运行实验以记录点。', tableAction: '操作', tableTime: '时间',
      finalState: '最终状态', meanSpeed: '平均速度', measuredBars: '实测柱', idealLine: '理想线', samples: (count) => count + ' 个样本', sampleWindows: (count) => count + ' 次采样', waiting: '等待中', finalSpeedSamples: '最终速度样本', finalEnergySamples: '最终能量样本', tempHistorySamples: '温度历史样本', finalDataReady: '最终数据就绪', energyDrift: '能量漂移', meanAbsTempError: '平均绝对温度误差', tempSamples: '温度样本', resultsReady: (relation) => relation + ' 实验结果已就绪', waitingForRecordedPoints: (relation) => relation + ' 等待记录点',
      metric: '指标', value: '值', status: '状态', ready: '就绪', notReady: '未就绪', yes: '是', no: '否', diagnostic: '诊断', export: '导出', exportAll: '总导出', exportFigures: '导出图像', reportPdf: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', verification: '验证', rawPv: '原始 P-V', history: '历史',
      resultReadyStatus: '结果就绪', resultNotReadyStatus: '结果未就绪', resultReadyDetail: '最终数据已捕获，可用于摘要、表格、图像和后续报告导出。', resultNotReadyDetail: '运行标准模拟，直到采集阶段结束后生成最终结果数据。', finalTime: '最终时间', finalTemperature: '最终温度', finalPressure: '最终压力', rmsSpeed: '均方根速度', speedBins: '速度分箱', energyBins: '能量分箱', notReadyPreview: '未就绪', figuresHint: '图像就绪状态、推荐文件名和预览。', noIdealPointsTitle: '没有理想气体点', noIdealPointsBody: '选择理想气体文件以查看实验点。', activeRelation: '当前关系', noIdealVerificationTitle: '没有验证图', noIdealVerificationBody: '验证图仅适用于理想气体文件。', historyLockedFor: (relation) => relation + ' 的历史内容已锁定', historyUnlocked: '已由验证通过的实验数据解锁。', historyUnlockHint: '通过一次成功验证后解锁。', historicalContext: '历史背景', workbenchInterpretation: '工作台解释', keyFigures: '关键数值', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / 斜率误差 ' + slopeError, whyLocked: '为什么锁定', whyItHappened: '原因说明', recommendedNextStep: '建议下一步', exportFilesHint: '导出环境和推荐文件。', pvLinearizedValidation: 'P - 1/V 线性化验证', relationValidation: (relation) => relation + ' 验证', measuredScatterHint: '实测散点、拟合线与理论参考。', originalPvPhysicalView: '原始 P - V 物理视图', originalPvPhysicalHint: '直接显示反比关系，判定仍使用线性化视图。', verdictLabel: (relation, verdict) => relation + ' 判定：' + verdict, pointsMetric: '点数', rSquared: 'R2', slope: '拟合斜率', theorySlope: '理论斜率', slopeError: '斜率误差', failureReason: '未通过原因', noneValue: '无', currentVerification: (rSquared, slopeError) => '当前验证：R2 ' + rSquared + '，斜率误差 ' + slopeError + '。', currentVerdictRecommendation: (verdict, recommendation) => '当前判定：' + verdict + '。建议：' + recommendation, noIdealHistoryTitle: '没有理想气体历史内容', noIdealHistoryBody: '理想气体验证通过后会解锁历史内容。', noVerificationChartTitle: '没有验证图', noVerificationChartBody: '验证图仅适用于理想气体文件。', panelNotConnectedTitle: '面板尚未连接', panelNotConnectedBody: '该面板将在后续工作台集成批次中接入。', measuredLegend: '实测', fitLegend: '拟合', theoryLegend: '理论', idealPressureTrace: (relation) => relation + ' 压强轨迹', currentIdealPressureHint: '运行当前理想气体点以采集压强窗口。', meanTemperature: '平均温度', relativeGap: '相对差值', samplingProgress: '采样进度', speedDistribution: '速度分布', energyDistribution: '能量分布', standardRealtimeEmpty: '运行标准模拟以生成实时图表数据。', phase: '阶段', phaseStates: { idle: '空闲', equilibrating: '热平衡中', collecting: '采集中', finished: '已完成' }, probabilityDensity: '概率密度', experimentPointTableTitle: '没有实验点表', experimentPointTableBody: '实验点表仅适用于理想气体文件。', idealResultsSectionsAria: '理想气体结果分页', openIdealResultsTabTitle: '打开此理想气体结果分页。', verificationChartAria: (relation) => relation + ' 验证图', resultsTreeExpandAria: '展开结果分区', resultsTreeCollapseAria: '折叠结果分区', resultsOpenHint: '点击选择，双击打开。', resultsJumpHint: '双击打开结果并跳转到此分区。', figureStatus: { ready: '就绪', 'not-ready': '未就绪', 'not-applicable': '不适用' },
    },
    actions: { start: '开始', pause: '暂停', stop: '停止', close: '关闭', resetView: '默认视角', hide: '隐藏', cancel: '取消' },
    shortcuts: { title: '快捷键', hint: '常用工作台快捷键', undo: '撤销', redo: '重做', closeSettings: '关闭设置' },
    console: { title: '控制台 / 输出', tabs: { logs: '日志', warnings: '警告', summary: '摘要' }, total: '总计', info: '信息', success: '成功', warnings: '警告', errors: '错误', latest: '最新', runtime: '运行时', noLogs: '暂无日志。', noWarnings: '暂无警告或错误。' },
    status: { activeFile: (name) => '当前文件：' + name, selectedBlock: (name) => '选中板块：' + name, none: '无', noRuntime: '未连接运行时', standardRuntime: '标准运行时已连接', idealRuntime: (relation, verdict) => '理想运行时已连接 / ' + relation + ' / ' + verdict, runStates: { idle: '空闲', running: '运行中', paused: '已暂停', finished: '已完成', 'needs-reset': '需要重置' }, verdictStates: { insufficient: '数据不足', collecting: '采集中', verified: '已验证', failed: '未通过', preliminary: '初步成立', notYet: '尚未成立', 'not-started': '尚未开始' } },
    exportEnvironment: {
      checking: { label: '正在检查导出环境', detail: '正在检查本机 Python/Matplotlib 和内置导出器是否可用。' },
      'available-system': { label: '系统 Python 导出器可用', detail: '科学报告和图像导出将使用本机 Python/Matplotlib 环境。' },
      'available-bundled': { label: '内置导出器可用', detail: '科学报告和图像导出将使用桌面程序随附的导出器。' },
      unavailable: { label: '桌面导出桥接不可用', detail: '当前环境不能直接导出 PDF/图像。请在气律实验室桌面程序中使用本地导出。' },
      error: { label: '导出环境异常', detail: '导出器检测失败。模拟、实时图表和结果预览仍可使用。' },
    },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '默认布局：3D 预览、实时数据 / 图表、当前参数。', standardConnected: '标准模拟运行时、3D 预览和实时图表数据已连接。', exportBridgeRequired: '科学 PDF 导出需要桌面运行时桥接。', autoPausedSingleRuntime: (name) => name + '：由于一次只能运行一个工作台运行时，已自动暂停。', autoPausedCreateFile: (name) => name + '：创建新文件时已自动暂停。', autoPausedSwitchFile: (name) => name + '：切换文件时已自动暂停。', fileCreated: (name) => '已创建工作台文件：' + name, lockedPanel: (title) => title + ' 是默认工作区的一部分，不能隐藏。', layoutReset: (name) => name + '：布局已恢复为 3D 预览 + 实时数据 / 图表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 打开理想结果窗口。', standardResultsOpened: (name, tab) => name + '：已打开结果窗口并切换到 ' + tab + '。', idealResultsClosed: (name) => name + '：已关闭理想结果窗口。', fileSelected: (name) => '已选择文件标签：' + name, confirmClear: (name, relation) => name + '：点击确认清空以删除全部 ' + relation + ' 点。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 点。', exportLabels: { completeBundle: '总导出', report: '报告 PDF', verificationFigure: '验证图', pointsCsv: '点 CSV', figuresZip: '结果图像' }, exportNotReady: (name) => name + '：结果数据尚未满足导出条件。', exportNeedsTwoPoints: (name) => name + '：拟合报告或验证图至少需要 2 个记录点。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 载荷已准备为 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在准备导出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消导出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 导出失败：' + message, exportCsvSaved: (name, target) => name + '：点 CSV 已保存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已导出到 ' + outDir + '（' + fileCount + ' 个文件）。' + figureHint, exportFigureHint: '图像文件位于 figures 子文件夹内。', unknownExporterError: '未知导出器错误', selectedLocation: '选定位置', selectedFolder: '选定文件夹', fileNameCannotBeEmpty: '文件名不能为空。', fileNameUnchanged: (name) => name + '：名称未改变。', fileRenamed: (name) => '工作台文件已重命名为 ' + name + '。', fileRemoved: (name) => name + '：已从当前工作台会话移除。', fileClosed: (name) => name + '：已关闭并保留在本地缓存。', fileOpenedFromCache: (name) => '已从本地缓存打开实验：' + name, confirmDeleteFile: (name) => name + '：点击确认删除以从工作台会话移除此打开文件。', layoutAlreadyDefault: (name) => name + '：布局已经使用默认面板。', ...experimentLogCopies['zh-CN'] },
  },
  'zh-TW': {
    menus: {
      experimentFiles: '實驗檔案', newWindow: '新視窗', newExperiment: '新增實驗', openExperiment: '開啟實驗', noCachedExperiments: '沒有可開啟的快取實驗', edit: '編輯', window: '視窗', settings: '設定', help: '說明', general: '一般',
      standardStudy: '標準模擬研究', idealStudy: '理想氣體模擬研究', heatCapacityStudy: '空氣熱容比（絕熱膨脹法）', heatCapacityPistonOscillationStudy: '空氣熱容比（活塞振動法）', undo: '復原', redo: '重做', empty: '空',
      clearEditHistory: '清除編輯記錄', panelsFor: (name) => name + ' 的面板', resetDefaultLayout: '還原預設版面', default: '預設',
      saveWorkbenchLayoutDefault: '將目前視窗版面存為預設',
      userGuide: '使用指南', about: '關於氣律實驗室', topCommandsAria: '頂部命令',
    },
    settings: {
      title: '一般設定', subtitle: '主題、語言、音效、快捷鍵與版面偏好', closeAria: '關閉一般設定', theme: '主題', themeHint: '使用系統、亮色或暗色模式',
      themeOptions: { system: { label: '跟隨系統', hint: '依照系統偏好' }, light: { label: '亮色', hint: '亮色工作區預覽' }, dark: { label: '暗色', hint: '暗色工作區預覽' } },
      language: '語言', languageHint: '選擇介面語言',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: '簡體中文介面' }, 'zh-TW': { label: '繁體中文', hint: '繁體中文介面' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D 效能模式',
      performanceModeHint: '用四檔模式控制 Heat Capacity 小球數量、速率和運行負載',
      performanceModeSummary: { lowLoad: '低負載', balanced: '均衡', highPerformance: '高效能', ultra: '極致畫質' },
      audio: '音效',
      audioHint: '增強儀器操作回饋，僅調整軟體內音量',
      audioMuteAria: '將軟體音效靜音',
      audioUnmuteAria: '取消軟體音效靜音',
      audioVolumeAria: '軟體音效音量',
    },
    about: {
      title: '關於氣律實驗室',
      subtitle: '氣律實驗室',
      closeAria: '關閉關於視窗',
      currentVersion: '目前版本',
      checkUpdates: '檢查更新',
      localDataExportEnvironment: '本地資料匯出環境',
      workspaceSessionCache: '工作區工作階段快取',
      buildNotes: '建置說明',
      openBuildNotice: '打開權限說明與第三方開源授權',
      closeBuildNotice: '關閉權限說明與第三方開源授權',
      buildNoticeTitle: '權限說明與第三方開源授權',
      buildNoticeSubtitle: '本機權限、本機資料、網路存取和第三方授權',
      buildNoticeNavToggle: '打開或收起聲明目錄',
      buildNoticeNavTitle: '聲明目錄',
      buildNoticeBack: '返回權限說明',
      buildNoticeOpenLocalFile: '開啟完整本機文件',
      buildNoticeOpenInBrowser: '在瀏覽器中開啟',
      buildNoticeLargeFileBody: '該授權材料內容較長，已隨軟體安裝包完整提供。請使用下方按鈕在系統瀏覽器或預設檢視器中開啟完整本機文件。',
      buildNoticePreviewUnavailable: '目前環境無法直接預覽該材料，請開啟完整本機文件查看。',
      buildNoticeOpenUnavailable: '目前環境無法開啟本機文件。',
      checking: '正在檢查',
      available: '可用',
      unavailable: '不可用',
      error: '檢查失敗',
      environmentResultTitle: '本地環境檢查完成',
      environmentResultAvailable: '本地資料匯出環境可用。',
      environmentResultUnavailable: '本地資料匯出環境不可用，目前環境不能直接匯出 PDF / 圖像。',
      environmentResultError: '本地資料匯出環境檢查失敗。模擬、即時圖表和結果預覽仍可使用。',
      updateResultTitle: '更新檢查完成',
      updateAvailableTitle: '發現可用更新',
      updateCheckFailedTitle: '更新檢查失敗',
      updateAvailableBody: '新版本已發布，可以立即下載並準備安裝。',
      updateCheckFailedBody: '尚未取得最新版本資訊。請重新檢查，或開啟受信任的最新發布頁手動安裝。',
      updateReadyTitle: '更新已下載',
      updateReadyBody: '重新啟動應用程式後會安裝新版本。',
      currentVersionLabel: '目前版本',
      latestVersionLabel: '最新版本',
      releaseDateLabel: '發布時間',
      releaseNotesLabel: '更新說明',
      noReleaseNotes: '此版本沒有附加更新說明。',
      ignoreThisVersion: '忽略此版本',
      updateNow: '立即更新',
      restartAndInstall: '重新啟動並安裝',
      retryCheck: '重新檢查',
      later: '稍後',
      ignoredVersionTitle: '已忽略此版本',
      ignoredVersionBody: (version) => '版本 ' + version + ' 不會再主動提醒。',
      updateAvailableStatus: (version) => '發現 ' + version,
      upToDateStatus: '已是最新版本',
      unsupportedUpdateStatus: '僅桌面安裝版可用',
      downloadingUpdateStatus: (percent) => '正在下載' + (percent === null ? '' : ' ' + Math.round(percent) + '%'),
      retryingUpdateStatus: (attempt, maxAttempts) => '網路波動，正在重試下載' + (attempt && maxAttempts ? '（' + attempt + '/' + maxAttempts + '）' : '') + '...',
      updateReadyStatus: '更新已準備好',
      updateErrorStatus: '檢查失敗',
      updateDownloadFailedStatus: (attempt, maxAttempts) => '自動更新失敗' + (attempt && maxAttempts ? '，已重試 ' + attempt + '/' + maxAttempts + ' 次' : '') + '。可以稍後重試或手動下載安裝程式。',
      retryDownload: '重試下載',
      manualDownload: '手動下載',
      sessionCacheSummary: (total) => '目前工作階段包含 ' + total + ' 個實驗檔案',
      sessionCacheBreakdown: (ideal, heat, standard) => '理想/熱容比/標準：' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: '開啟檔案', files: '檔案', panels: '面板', noOpenFiles: '沒有開啟的檔案', noOpenFileState: '目前沒有開啟的實驗檔案', noOpenPanelState: '開啟實驗後顯示可用面板。', emptyHint: '在主工作區建立或開啟實驗。',
      noOpenStudy: '沒有開啟的研究', emptyTitle: '開始新的實驗工作區', emptyBody: '建立標準模擬、理想氣體關係研究或空氣比熱容比實驗，以恢復預覽、圖表、結果和參數面板。',
      createStandard: '建立標準模擬研究', createIdeal: '建立理想氣體模擬研究', createHeatCapacity: '建立空氣熱容比（絕熱膨脹法）', createHeatCapacityPistonOscillation: '建立空氣熱容比（活塞振動法）', rename: '重新命名', delete: '刪除', confirmDelete: '確認刪除', closeExperiment: '關閉實驗', confirmCloseRunningExperiment: (name) => '實驗正在執行。確認關閉 ' + name + ' 嗎？', cancel: '取消',
      locked: '鎖定', shown: '顯示', open: '開啟', active: '作用中', off: '關閉', std: '標準', ideal: '理想', heat: '熱容', workspaceAria: '檔案工作區', usageHintAria: '檔案樹操作提示', clickSelectHint: '單擊選取', doubleClickOpenHint: '雙擊開啟', openActions: (name) => '開啟 ' + name + ' 的操作選單',
    },
    panels: {
      previewTitle: '3D 預覽', previewHint: '即時分子視口', realtimeTitle: '即時資料 / 圖表', heatRealtimeTitle: '即時資料', standardRealtimeHint: '即時溫度、壓力和圖表軌跡', idealRealtimeHint: '即時 T、P、關係和圖表軌跡', heatRealtimeHint: 'Uₜ / Uₚ、壓強和過程採樣',
      standardResultsTitle: '結果', standardResultsHint: '實驗狀態、資料表和圖像', idealResultsTitle: '結果', idealResultsHint: '驗證圖、歷史解鎖和匯出詳情',
      pointsTitle: '實驗資料記錄', pointsHint: '已記錄的關係實驗點', verificationTitle: '關係驗證分析', verificationHint: '驗證圖、診斷和匯出詳情',
      summaryTitle: '摘要', dataTableTitle: '資料表', figuresTitle: '圖像', liveWorkspaceResizeAria: '調整視圖預覽和即時資料區域大小',
    },
    parameters: {
      title: '目前參數', currentFileValues: '目前檔案值', lockedUntilStopped: '停止或完成前鎖定',
      standardSimulation: '標準模擬', idealSimulation: '理想氣體模擬', heatCapacityExperiment: '空氣比熱容比實驗', savedChangesOnStart: '啟動時已儲存參數', idealRuntimeOnStart: '理想執行階段將在開始時連接', applied: '參數已套用',
      relation: '關係', scanVariable: '掃描變量', samplingPreset: '採樣預設', targetTemperature: '目標溫度', boxLength: '盒長 L', particleCount: '粒子數 N', customPreset: '自訂', setSamplingPrecision: '設定採樣精度', relationHints: { pt: '固定 N 和 V 掃描溫度', pv: '透過盒長 L 掃描體積', pn: '固定 T 和 V 掃描粒子數' }, setScanValue: (title) => '設定' + title, adjustScanValue: (title) => '調整' + title, recommendedValues: (title) => title + '建議值',
      parameterLabels: { N: '粒子數量', r: '粒子半徑', L: '容器邊長', m: '粒子質量', k: '波茲曼常數', dt: '時間步長', nu: '碰撞頻率', targetTemperature: '目標溫度', equilibriumTime: '平衡時間', statsDuration: '統計時長', relation: '關係' },
      samplingPresets: { fast: '快速', balanced: '平衡', stable: '穩定' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's 平衡 / ' + statsDuration + 's 統計',
      advancedSettings: '進階設定', advancedShow: '顯示模型常數和採樣值', advancedHide: '隱藏模型常數和採樣值', edit: '編輯',
      standardReadonlyNote: '標準模擬參數在這裡直接顯示。', idealReadonlyNote: '關係、掃描變量和採樣預設在上方控制。', heatCapacityReadonlyNote: '粒子動畫僅用於視覺化氣體分子運動狀態；最終比熱容比按空氣比熱容比實驗模型計算。', controlledLockHint: '目前關係已有資料，受控變量已鎖定。',
    },
    results: {
      title: '結果', experimentStatus: '實驗狀態', scan: '掃描', temperature: '溫度', pressure: '壓強', measuredPressure: '實測 P', idealPressure: '理想 P', gap: '差值', pointsTitle: (relation) => relation + ' 點', pointsShort: (count) => count + ' 點', recordedPoints: (count) => count + ' 個記錄點',
      clearRelation: '清空關係', confirmClear: '確認清空', remove: '移除', confirmRemove: '確認移除', cancel: '取消', noPoints: '沒有點', runToRecord: '執行實驗以記錄點。', tableAction: '操作', tableTime: '時間',
      finalState: '最終狀態', meanSpeed: '平均速度', measuredBars: '實測柱', idealLine: '理想線', samples: (count) => count + ' 個樣本', sampleWindows: (count) => count + ' 次採樣', waiting: '等待中', finalSpeedSamples: '最終速度樣本', finalEnergySamples: '最終能量樣本', tempHistorySamples: '溫度歷史樣本', finalDataReady: '最終資料就緒', energyDrift: '能量漂移', meanAbsTempError: '平均絕對溫度誤差', tempSamples: '溫度樣本', resultsReady: (relation) => relation + ' 實驗結果已就緒', waitingForRecordedPoints: (relation) => relation + ' 等待記錄點',
      metric: '指標', value: '值', status: '狀態', ready: '就緒', notReady: '未就緒', yes: '是', no: '否', diagnostic: '診斷', export: '匯出', exportAll: '總匯出', exportFigures: '匯出圖像', reportPdf: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', verification: '驗證', rawPv: '原始 P-V', history: '歷史',
      resultReadyStatus: '結果就緒', resultNotReadyStatus: '結果未就緒', resultReadyDetail: '最終資料已擷取，可用於摘要、表格、圖像和後續報告匯出。', resultNotReadyDetail: '執行標準模擬，直到採集階段結束後產生最終結果資料。', finalTime: '最終時間', finalTemperature: '最終溫度', finalPressure: '最終壓力', rmsSpeed: '均方根速度', speedBins: '速度分箱', energyBins: '能量分箱', notReadyPreview: '未就緒', figuresHint: '圖像就緒狀態、建議檔名和預覽。', noIdealPointsTitle: '沒有理想氣體點', noIdealPointsBody: '選擇理想氣體檔案以查看實驗點。', activeRelation: '目前關係', noIdealVerificationTitle: '沒有驗證圖', noIdealVerificationBody: '驗證圖僅適用於理想氣體檔案。', historyLockedFor: (relation) => relation + ' 的歷史內容已鎖定', historyUnlocked: '已由驗證通過的實驗資料解鎖。', historyUnlockHint: '通過一次成功驗證後解鎖。', historicalContext: '歷史背景', workbenchInterpretation: '工作台解釋', keyFigures: '關鍵數值', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / 斜率誤差 ' + slopeError, whyLocked: '為什麼鎖定', whyItHappened: '原因說明', recommendedNextStep: '建議下一步', exportFilesHint: '匯出環境和建議檔案。', pvLinearizedValidation: 'P - 1/V 線性化驗證', relationValidation: (relation) => relation + ' 驗證', measuredScatterHint: '實測散點、擬合線與理論參考。', originalPvPhysicalView: '原始 P - V 物理視圖', originalPvPhysicalHint: '直接顯示反比關係，判定仍使用線性化視圖。', verdictLabel: (relation, verdict) => relation + ' 判定：' + verdict, pointsMetric: '點數', rSquared: 'R2', slope: '擬合斜率', theorySlope: '理論斜率', slopeError: '斜率誤差', failureReason: '未通過原因', noneValue: '無', currentVerification: (rSquared, slopeError) => '目前驗證：R2 ' + rSquared + '，斜率誤差 ' + slopeError + '。', currentVerdictRecommendation: (verdict, recommendation) => '目前判定：' + verdict + '。建議：' + recommendation, noIdealHistoryTitle: '沒有理想氣體歷史內容', noIdealHistoryBody: '理想氣體驗證通過後會解鎖歷史內容。', noVerificationChartTitle: '沒有驗證圖', noVerificationChartBody: '驗證圖僅適用於理想氣體檔案。', panelNotConnectedTitle: '面板尚未連接', panelNotConnectedBody: '該面板將在後續工作台整合批次中接入。', measuredLegend: '實測', fitLegend: '擬合', theoryLegend: '理論', idealPressureTrace: (relation) => relation + '壓強軌跡', currentIdealPressureHint: '執行目前理想氣體點以採集壓強窗口。', meanTemperature: '平均溫度', relativeGap: '相對差值', samplingProgress: '採樣進度', speedDistribution: '速度分布', energyDistribution: '能量分布', standardRealtimeEmpty: '執行標準模擬以產生即時圖表資料。', phase: '階段', phaseStates: { idle: '閒置', equilibrating: '熱平衡中', collecting: '採集中', finished: '已完成' }, probabilityDensity: '機率密度', experimentPointTableTitle: '沒有實驗點表', experimentPointTableBody: '實驗點表僅適用於理想氣體檔案。', idealResultsSectionsAria: '理想氣體結果分頁', openIdealResultsTabTitle: '開啟此理想氣體結果分頁。', verificationChartAria: (relation) => relation + ' 驗證圖', resultsTreeExpandAria: '展開結果分區', resultsTreeCollapseAria: '摺疊結果分區', resultsOpenHint: '點選選取，雙擊開啟。', resultsJumpHint: '雙擊開啟結果並跳至此分區。', figureStatus: { ready: '就緒', 'not-ready': '未就緒', 'not-applicable': '不適用' },
    },
    actions: { start: '開始', pause: '暫停', stop: '停止', close: '關閉', resetView: '預設視角', hide: '隱藏', cancel: '取消' },
    shortcuts: { title: '快捷鍵', hint: '常用工作台快捷鍵', undo: '復原', redo: '重做', closeSettings: '關閉設定' },
    console: { title: '控制台 / 輸出', tabs: { logs: '日誌', warnings: '警告', summary: '摘要' }, total: '總計', info: '資訊', success: '成功', warnings: '警告', errors: '錯誤', latest: '最新', runtime: '執行階段', noLogs: '暫無日誌。', noWarnings: '暫無警告或錯誤。' },
    status: { activeFile: (name) => '目前檔案：' + name, selectedBlock: (name) => '選取區塊：' + name, none: '無', noRuntime: '未連接執行階段', standardRuntime: '標準執行階段已連接', idealRuntime: (relation, verdict) => '理想執行階段已連接 / ' + relation + ' / ' + verdict, runStates: { idle: '閒置', running: '執行中', paused: '已暫停', finished: '已完成', 'needs-reset': '需要重置' }, verdictStates: { insufficient: '資料不足', collecting: '採集中', verified: '已驗證', failed: '未通過', preliminary: '初步成立', notYet: '尚未成立', 'not-started': '尚未開始' } },
    exportEnvironment: {
      checking: { label: '正在檢查匯出環境', detail: '正在檢查本機 Python/Matplotlib 和內建匯出器是否可用。' },
      'available-system': { label: '系統 Python 匯出器可用', detail: '科學報告和圖像匯出將使用本機 Python/Matplotlib 環境。' },
      'available-bundled': { label: '內建匯出器可用', detail: '科學報告和圖像匯出將使用桌面程式隨附的匯出器。' },
      unavailable: { label: '桌面匯出橋接不可用', detail: '目前環境不能直接匯出 PDF/圖像。請在氣律實驗室桌面程式中使用本地匯出。' },
      error: { label: '匯出環境異常', detail: '匯出器偵測失敗。模擬、即時圖表和結果預覽仍可使用。' },
    },
    logs: { initialized: 'Workbench 工作台原型已初始化。', defaultLayout: '預設版面：3D 預覽、即時資料 / 圖表、目前參數。', standardConnected: '標準模擬執行階段、3D 預覽和即時圖表資料已連接。', exportBridgeRequired: '科學 PDF 匯出需要桌面執行階段橋接。', autoPausedSingleRuntime: (name) => name + '：由於一次只能執行一個工作台執行階段，已自動暫停。', autoPausedCreateFile: (name) => name + '：建立新檔案時已自動暫停。', autoPausedSwitchFile: (name) => name + '：切換檔案時已自動暫停。', fileCreated: (name) => '已建立工作台檔案：' + name, lockedPanel: (title) => title + ' 是預設工作區的一部分，不能隱藏。', layoutReset: (name) => name + '：版面已還原為 3D 預覽 + 即時資料 / 圖表', idealResultsOpened: (name, tab) => name + '：已在 ' + tab + ' 開啟理想結果視窗。', standardResultsOpened: (name, tab) => name + '：已開啟結果視窗並切換到 ' + tab + '。', idealResultsClosed: (name) => name + '：已關閉理想結果視窗。', fileSelected: (name) => '已選擇檔案分頁：' + name, confirmClear: (name, relation) => name + '：點擊確認清空以刪除全部 ' + relation + ' 點。', clearedRelation: (name, relation) => name + '：已清空 ' + relation + ' 點。', exportLabels: { completeBundle: '總匯出', report: '報告 PDF', verificationFigure: '驗證圖', pointsCsv: '點 CSV', figuresZip: '結果圖像' }, exportNotReady: (name) => name + '：結果資料尚未滿足匯出條件。', exportNeedsTwoPoints: (name) => name + '：擬合報告或驗證圖至少需要 2 個記錄點。', exportPayloadPrepared: (name, label, filename, detail) => name + '：' + label + ' 載荷已準備為 ' + filename + '；' + detail, exportPreparing: (name, label) => name + '：正在準備匯出 ' + label + '。', exportCancelled: (name, label) => name + '：已取消匯出 ' + label + '。', exportFailed: (name, label, message) => name + '：' + label + ' 匯出失敗：' + message, exportCsvSaved: (name, target) => name + '：點 CSV 已儲存到 ' + target + '。', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + '：' + label + ' 已匯出到 ' + outDir + '（' + fileCount + ' 個檔案）。' + figureHint, exportFigureHint: '圖像檔案位於 figures 子資料夾內。', unknownExporterError: '未知匯出器錯誤', selectedLocation: '選定位置', selectedFolder: '選定資料夾', fileNameCannotBeEmpty: '檔案名稱不能為空。', fileNameUnchanged: (name) => name + '：名稱未改變。', fileRenamed: (name) => '工作台檔案已重新命名為 ' + name + '。', fileRemoved: (name) => name + '：已從目前工作台工作階段移除。', fileClosed: (name) => name + '：已關閉並保留在本機快取。', fileOpenedFromCache: (name) => '已從本機快取開啟實驗：' + name, confirmDeleteFile: (name) => name + '：點擊確認刪除以從工作台工作階段移除此開啟檔案。', layoutAlreadyDefault: (name) => name + '：版面已經使用預設面板。', ...experimentLogCopies['zh-TW'] },
  },
  en: {
    menus: {
      experimentFiles: 'Experiment Files', newWindow: 'New Window', newExperiment: 'New Experiment', openExperiment: 'Open Experiment', noCachedExperiments: 'No cached experiments to open', edit: 'Edit', window: 'Window', settings: 'Settings', help: 'Help', general: 'General',
      standardStudy: 'Standard Simulation Study', idealStudy: 'Ideal Gas Simulation Study', heatCapacityStudy: 'Heat Capacity Ratio (Adiabatic)', heatCapacityPistonOscillationStudy: 'Heat Capacity Ratio (Piston)', undo: 'Undo', redo: 'Redo', empty: 'empty',
      clearEditHistory: 'Clear Edit History', panelsFor: (name) => 'Panels for ' + name, resetDefaultLayout: 'Reset Default Layout', default: 'default',
      saveWorkbenchLayoutDefault: 'Save Current Window Layout as Default',
      userGuide: 'User Guide', about: 'About Gas Laws Lab', topCommandsAria: 'Top commands',
    },
    settings: {
      title: 'General Settings', subtitle: 'Theme, language, sound, shortcuts, and layout preferences', closeAria: 'Close General Settings', theme: 'Theme', themeHint: 'Use system, light, or dark mode',
      themeOptions: { system: { label: 'System', hint: 'Follow OS preference' }, light: { label: 'Light', hint: 'Bright workspace preview' }, dark: { label: 'Dark', hint: 'Dark workspace preview' } },
      language: 'Language', languageHint: 'Choose the interface language',
      languageOptions: { 'zh-CN': { label: '简体中文', hint: 'Simplified Chinese interface' }, 'zh-TW': { label: '繁體中文', hint: 'Traditional Chinese interface' }, en: { label: 'English', hint: 'English interface' } },
      performanceMode: '3D performance mode',
      performanceModeHint: 'Use four modes to control Heat Capacity particle count, speed, and runtime load',
      performanceModeSummary: { lowLoad: 'Low load', balanced: 'Balanced', highPerformance: 'High performance', ultra: 'Ultra' },
      audio: 'Sound effects',
      audioHint: 'Enhances instrument feedback and only changes in-app volume',
      audioMuteAria: 'Mute in-app sound effects',
      audioUnmuteAria: 'Unmute in-app sound effects',
      audioVolumeAria: 'In-app sound-effect volume',
    },
    about: {
      title: 'About Gas Laws Lab',
      subtitle: 'Gas Laws Lab',
      closeAria: 'Close About window',
      currentVersion: 'Current Version',
      checkUpdates: 'Check for Updates',
      localDataExportEnvironment: 'Local Data Export Environment',
      workspaceSessionCache: 'Workspace Session Cache',
      buildNotes: 'Build Notes',
      openBuildNotice: 'Open permissions and third-party open-source licenses',
      closeBuildNotice: 'Close permissions and third-party open-source licenses',
      buildNoticeTitle: 'Permissions and Third-Party Open-Source Licenses',
      buildNoticeSubtitle: 'Local permissions, local data, network access, and third-party licenses',
      buildNoticeNavToggle: 'Open or collapse notice table of contents',
      buildNoticeNavTitle: 'Notice Contents',
      buildNoticeBack: 'Back to permissions notice',
      buildNoticeOpenLocalFile: 'Open full local file',
      buildNoticeOpenInBrowser: 'Open in browser',
      buildNoticeLargeFileBody: 'This license material is large and is provided in full with the installed software. Use the button below to open the complete local file in the system browser or default viewer.',
      buildNoticePreviewUnavailable: 'This material cannot be previewed directly in the current environment. Open the complete local file to view it.',
      buildNoticeOpenUnavailable: 'The current environment cannot open local files.',
      checking: 'Checking',
      available: 'Available',
      unavailable: 'Unavailable',
      error: 'Check failed',
      environmentResultTitle: 'Local Environment Check Complete',
      environmentResultAvailable: 'Local data export environment is available.',
      environmentResultUnavailable: 'Local data export environment is unavailable. This environment cannot directly export PDF / image files.',
      environmentResultError: 'Local data export environment check failed. Simulation, live charts, and result previews remain available.',
      updateResultTitle: 'Update Check Complete',
      updateAvailableTitle: 'Update Available',
      updateCheckFailedTitle: 'Update Check Failed',
      updateAvailableBody: 'A newer version is available and can be downloaded now.',
      updateCheckFailedBody: 'Latest-version information is not available yet. Check again, or open the trusted latest-release page for a manual install.',
      updateReadyTitle: 'Update Downloaded',
      updateReadyBody: 'Restart the app to install the new version.',
      currentVersionLabel: 'Current Version',
      latestVersionLabel: 'Latest Version',
      releaseDateLabel: 'Release Date',
      releaseNotesLabel: 'Release Notes',
      noReleaseNotes: 'No release notes were provided for this version.',
      ignoreThisVersion: 'Ignore This Version',
      updateNow: 'Update Now',
      restartAndInstall: 'Restart and Install',
      retryCheck: 'Check Again',
      later: 'Later',
      ignoredVersionTitle: 'Version Ignored',
      ignoredVersionBody: (version) => 'Version ' + version + ' will not prompt again.',
      updateAvailableStatus: (version) => 'Found ' + version,
      upToDateStatus: 'Up to date',
      unsupportedUpdateStatus: 'Desktop installer only',
      downloadingUpdateStatus: (percent) => 'Downloading' + (percent === null ? '' : ' ' + Math.round(percent) + '%'),
      retryingUpdateStatus: (attempt, maxAttempts) => 'Network fluctuation, retrying download' + (attempt && maxAttempts ? ' (' + attempt + '/' + maxAttempts + ')' : '') + '...',
      updateReadyStatus: 'Update ready',
      updateErrorStatus: 'Check failed',
      updateDownloadFailedStatus: (attempt, maxAttempts) => 'Automatic update failed' + (attempt && maxAttempts ? ' after ' + attempt + '/' + maxAttempts + ' attempts' : '') + '. You can retry later or download the installer manually.',
      retryDownload: 'Retry Download',
      manualDownload: 'Manual Download',
      sessionCacheSummary: (total) => 'Current session contains ' + total + ' experiment files',
      sessionCacheBreakdown: (ideal, heat, standard) => 'Ideal / Heat / Standard: ' + ideal + '/' + heat + '/' + standard,
    },
    files: {
      openFiles: 'Open Files', files: 'Files', panels: 'Panels', noOpenFiles: 'No open files', noOpenFileState: 'No experiment file is currently open', noOpenPanelState: 'Available panels appear after an experiment is opened.', emptyHint: 'Create or open an experiment from the main workspace.',
      noOpenStudy: 'No open study', emptyTitle: 'Start a new Gas Laws Lab file', emptyBody: 'Create an ideal gas study, heat capacity ratio experiment, or standard simulation to restore previews, charts, results, and parameter panels.',
      createStandard: 'Create Standard Simulation Study', createIdeal: 'Create Ideal Gas Simulation Study', createHeatCapacity: 'Create Heat Capacity Ratio (Adiabatic)', createHeatCapacityPistonOscillation: 'Create Heat Capacity Ratio (Piston)', rename: 'Rename', delete: 'Delete', confirmDelete: 'Confirm Delete', closeExperiment: 'Close Experiment', confirmCloseRunningExperiment: (name) => 'The experiment is running. Close ' + name + '?', cancel: 'Cancel',
      locked: 'locked', shown: 'shown', open: 'open', active: 'active', off: 'off', std: 'Standard', ideal: 'Ideal', heat: 'Heat', workspaceAria: 'File workspace', usageHintAria: 'File tree usage hint', clickSelectHint: 'Click to select', doubleClickOpenHint: 'Double-click to open', openActions: (name) => 'Open actions for ' + name,
    },
    panels: {
      previewTitle: '3D Preview', previewHint: 'Realtime molecular viewport', realtimeTitle: 'Realtime Data / Charts', heatRealtimeTitle: 'Realtime Data', standardRealtimeHint: 'Live temperature, pressure, and chart traces', idealRealtimeHint: 'Live T, P, relation, and chart traces', heatRealtimeHint: 'Uₜ / Uₚ, pressure, and process samples',
      standardResultsTitle: 'Results', standardResultsHint: 'Experiment status, data table, and figures', idealResultsTitle: 'Results', idealResultsHint: 'Verification chart, history unlock, and export details',
      pointsTitle: 'Experiment Data', pointsHint: 'Recorded relation experiment points', verificationTitle: 'Relation Verification', verificationHint: 'Verification chart, diagnostics, and export details',
      summaryTitle: 'Summary', dataTableTitle: 'Data Table', figuresTitle: 'Figures', liveWorkspaceResizeAria: 'Resize view preview and realtime data',
    },
    parameters: {
      title: 'Current Parameters', currentFileValues: 'current file values', lockedUntilStopped: 'locked until stopped or finished',
      standardSimulation: 'Standard Simulation', idealSimulation: 'Ideal Gas Simulation', heatCapacityExperiment: 'Heat Capacity Ratio Experiment', savedChangesOnStart: 'parameters saved on start', idealRuntimeOnStart: 'ideal runtime will connect on start', applied: 'parameters applied',
      relation: 'Relation', scanVariable: 'Scan Variable', samplingPreset: 'Sampling Preset', targetTemperature: 'Target Temperature', boxLength: 'Box Length L', particleCount: 'Particle Count N', customPreset: 'Custom', setSamplingPrecision: 'Set sampling precision', relationHints: { pt: 'Scan temperature at fixed N and V', pv: 'Scan volume through box length L', pn: 'Scan particle count at fixed T and V' }, setScanValue: (title) => 'Set ' + title, adjustScanValue: (title) => 'Adjust ' + title, recommendedValues: (title) => title + ' recommended values',
      parameterLabels: { N: 'Particle count', r: 'Particle radius', L: 'Box length', m: 'Particle mass', k: 'Boltzmann constant', dt: 'Time step', nu: 'Collision frequency', targetTemperature: 'Target temperature', equilibriumTime: 'Equilibration time', statsDuration: 'Sampling duration', relation: 'Relation' },
      samplingPresets: { fast: 'Fast', balanced: 'Balanced', stable: 'Stable' }, samplingDuration: (equilibriumTime, statsDuration) => equilibriumTime + 's eq / ' + statsDuration + 's stats',
      advancedSettings: 'Advanced settings', advancedShow: 'Show model constants and sampling values', advancedHide: 'Hide model constants and sampling values', edit: 'Edit',
      standardReadonlyNote: 'Standard simulation parameters are shown directly here.', idealReadonlyNote: 'Relation, scan variable, and sampling preset are controlled above.', heatCapacityReadonlyNote: 'The particle animation only visualizes molecular motion; the heat capacity ratio is calculated by the air heat-capacity-ratio experiment model.', controlledLockHint: 'This relation already has data, so controlled variables are locked.',
    },
    results: {
      title: 'Results', experimentStatus: 'Experiment status', scan: 'Scan', temperature: 'Temperature', pressure: 'Pressure', measuredPressure: 'Measured P', idealPressure: 'Ideal P', gap: 'Gap', pointsTitle: (relation) => relation + ' points', pointsShort: (count) => count + ' pts', recordedPoints: (count) => count + ' recorded points',
      clearRelation: 'Clear Relation', confirmClear: 'Confirm Clear', remove: 'Remove', confirmRemove: 'Confirm Remove', cancel: 'Cancel', noPoints: 'no points', runToRecord: 'Run the experiment to record points.', tableAction: 'Action', tableTime: 'Time',
      finalState: 'Final state', meanSpeed: 'Mean speed', measuredBars: 'measured bars', idealLine: 'ideal line', samples: (count) => count + ' samples', sampleWindows: (count) => count + ' sampling windows', waiting: 'waiting', finalSpeedSamples: 'final speed samples', finalEnergySamples: 'final energy samples', tempHistorySamples: 'temp history samples', finalDataReady: 'final data ready', energyDrift: 'energy drift', meanAbsTempError: 'mean abs temp error', tempSamples: 'Temp samples', resultsReady: (relation) => relation + ' experiment result ready', waitingForRecordedPoints: (relation) => relation + ' waiting for recorded points',
      metric: 'Metric', value: 'Value', status: 'Status', ready: 'ready', notReady: 'not-ready', yes: 'yes', no: 'no', diagnostic: 'Diagnostic', export: 'Export', exportAll: 'Export All', exportFigures: 'Export Figures', reportPdf: 'Report PDF', verificationFigure: 'Verification Figure', pointsCsv: 'Points CSV', verification: 'Verification', rawPv: 'Raw P-V', history: 'History',
      resultReadyStatus: 'Results ready', resultNotReadyStatus: 'Results not ready', resultReadyDetail: 'Final data has been captured for summary, tables, figures, and future report export.', resultNotReadyDetail: 'Run the standard simulation until the collecting phase finishes to prepare final result data.', finalTime: 'Final time', finalTemperature: 'Final temperature', finalPressure: 'Final pressure', rmsSpeed: 'RMS speed', speedBins: 'Speed bins', energyBins: 'Energy bins', notReadyPreview: 'not ready', figuresHint: 'Figure readiness, recommended filenames, and preview.', noIdealPointsTitle: 'No ideal-gas points', noIdealPointsBody: 'Select an ideal-gas file to review experiment points.', activeRelation: 'Active', noIdealVerificationTitle: 'No ideal-gas verification', noIdealVerificationBody: 'Select an ideal-gas file to review verification results.', historyLockedFor: (relation) => 'History locked for ' + relation, historyUnlocked: 'Unlocked by verified experiment data.', historyUnlockHint: 'Unlocks after a successful verification.', historicalContext: 'Historical context', workbenchInterpretation: 'Workbench interpretation', keyFigures: 'Key figures', keyFiguresValue: (rSquared, slopeError) => 'R2 ' + rSquared + ' / slope error ' + slopeError, whyLocked: 'Why it is locked', whyItHappened: 'Why it happened', recommendedNextStep: 'Recommended next step', exportFilesHint: 'Export environment and recommended files.', pvLinearizedValidation: 'P - 1/V linearized validation', relationValidation: (relation) => relation + ' validation', measuredScatterHint: 'Measured scatter with fit and theoretical reference.', originalPvPhysicalView: 'Original P - V physical view', originalPvPhysicalHint: 'Shows the inverse relation directly while verdict uses the linearized view.', verdictLabel: (relation, verdict) => relation + ' verdict: ' + verdict, pointsMetric: 'Points', rSquared: 'R2', slope: 'Slope', theorySlope: 'Theory slope', slopeError: 'Slope error', failureReason: 'Failure reason', noneValue: 'none', currentVerification: (rSquared, slopeError) => 'Current verification: R2 ' + rSquared + ', slope error ' + slopeError + '.', currentVerdictRecommendation: (verdict, recommendation) => 'Current verdict: ' + verdict + '. Recommendation: ' + recommendation, noIdealHistoryTitle: 'No ideal-gas history', noIdealHistoryBody: 'History unlocks after ideal-gas verification.', noVerificationChartTitle: 'No verification chart', noVerificationChartBody: 'Verification charts are available for ideal-gas files.', panelNotConnectedTitle: 'Panel not connected', panelNotConnectedBody: 'This panel will be wired in a later Workbench integration batch.', measuredLegend: 'measured', fitLegend: 'fit', theoryLegend: 'theory', idealPressureTrace: (relation) => relation + ' pressure trace', currentIdealPressureHint: 'Run the current ideal point to collect pressure windows.', meanTemperature: 'Mean temperature', relativeGap: 'Relative gap', samplingProgress: 'Sampling progress', speedDistribution: 'Speed distribution', energyDistribution: 'Energy distribution', standardRealtimeEmpty: 'Run the standard simulation to populate realtime chart data.', phase: 'Phase', phaseStates: { idle: 'idle', equilibrating: 'equilibrating', collecting: 'collecting', finished: 'finished' }, probabilityDensity: 'probability density', experimentPointTableTitle: 'No experiment point table', experimentPointTableBody: 'Experiment points are available for ideal-gas files.', idealResultsSectionsAria: 'Ideal Results sections', openIdealResultsTabTitle: 'Open this ideal Results tab.', verificationChartAria: (relation) => relation + ' verification chart', resultsTreeExpandAria: 'Expand Results sections', resultsTreeCollapseAria: 'Collapse Results sections', resultsOpenHint: 'Click to select, double-click to open.', resultsJumpHint: 'Double-click to open Results and jump to this section.', figureStatus: { ready: 'ready', 'not-ready': 'not-ready', 'not-applicable': 'not applicable' },
    },
    actions: { start: 'Start', pause: 'Pause', stop: 'Stop', close: 'Close', resetView: 'Default view', hide: 'Hide', cancel: 'Cancel' },
    shortcuts: { title: 'Shortcuts', hint: 'Common workbench shortcuts', undo: 'Undo', redo: 'Redo', closeSettings: 'Close settings' },
    console: { title: 'Console / Output', tabs: { logs: 'Logs', warnings: 'Warnings', summary: 'Summary' }, total: 'Total', info: 'Info', success: 'Success', warnings: 'Warnings', errors: 'Errors', latest: 'Latest', runtime: 'Runtime', noLogs: 'No log entries yet.', noWarnings: 'No warnings or errors yet.' },
    status: { activeFile: (name) => 'Active file: ' + name, selectedBlock: (name) => 'Selected block: ' + name, none: 'none', noRuntime: 'No runtime connected', standardRuntime: 'Standard runtime connected', idealRuntime: (relation, verdict) => 'Ideal runtime connected / ' + relation + ' / ' + verdict, runStates: { idle: 'idle', running: 'running', paused: 'paused', finished: 'finished', 'needs-reset': 'runtime refresh needed' }, verdictStates: { insufficient: 'insufficient', collecting: 'collecting', verified: 'verified', failed: 'failed', preliminary: 'preliminary', notYet: 'not yet', 'not-started': 'not started' } },
    exportEnvironment: {
      checking: { label: 'Checking export environment', detail: 'Desktop runtime is checking local Python/Matplotlib and bundled exporter availability.' },
      'available-system': { label: 'System Python exporter available', detail: 'Scientific report and figure export will use this computer\'s Python/Matplotlib environment.' },
      'available-bundled': { label: 'Bundled exporter available', detail: 'Scientific report and figure export will use the exporter packaged with the desktop app.' },
      unavailable: { label: 'Desktop export bridge unavailable', detail: 'This environment cannot export PDF or figures directly. Use local export in the Gas Laws Lab desktop app.' },
      error: { label: 'Export environment error', detail: 'Exporter detection failed. Simulation, realtime charts, and result previews remain available.' },
    },
    logs: { initialized: 'Workbench studio prototype initialized.', defaultLayout: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.', standardConnected: 'Standard Simulation runtime, 3D preview, and realtime chart data are connected.', exportBridgeRequired: 'Scientific PDF export requires the desktop runtime bridge.', autoPausedSingleRuntime: (name) => name + ': auto-paused because only one workbench runtime can run at a time.', autoPausedCreateFile: (name) => name + ': auto-paused when creating a new file.', autoPausedSwitchFile: (name) => name + ': auto-paused when switching files.', fileCreated: (name) => 'Workbench file created: ' + name, lockedPanel: (title) => title + ' is locked as part of the default workspace and cannot be hidden.', layoutReset: (name) => name + ': layout reset to 3D Preview + Realtime Data / Charts', idealResultsOpened: (name, tab) => name + ': opened ideal Results window on ' + tab + '.', standardResultsOpened: (name, tab) => name + ': opened Results window on ' + tab + '.', idealResultsClosed: (name) => name + ': closed ideal Results window.', fileSelected: (name) => 'File tab selected: ' + name, confirmClear: (name, relation) => name + ': click Confirm Clear to clear all ' + relation + ' points.', clearedRelation: (name, relation) => name + ': cleared ' + relation + ' points.', exportLabels: { completeBundle: 'complete export', report: 'report PDF', verificationFigure: 'verification figure', pointsCsv: 'points CSV', figuresZip: 'result figures' }, exportNotReady: (name) => name + ': result data does not meet export requirements yet.', exportNeedsTwoPoints: (name) => name + ': at least 2 recorded points are required for a fitted report or verification figure.', exportPayloadPrepared: (name, label, filename, detail) => name + ': ' + label + ' payload prepared as ' + filename + '; ' + detail, exportPreparing: (name, label) => name + ': preparing ' + label + ' export.', exportCancelled: (name, label) => name + ': ' + label + ' export cancelled.', exportFailed: (name, label, message) => name + ': ' + label + ' export failed: ' + message, exportCsvSaved: (name, target) => name + ': points CSV saved to ' + target + '.', exportCompleted: (name, label, outDir, fileCount, figureHint) => name + ': ' + label + ' exported to ' + outDir + ' (' + fileCount + ' files).' + figureHint, exportFigureHint: 'Figure files are inside the figures subfolders.', unknownExporterError: 'unknown exporter error', selectedLocation: 'selected location', selectedFolder: 'selected folder', fileNameCannotBeEmpty: 'File name cannot be empty.', fileNameUnchanged: (name) => name + ': name unchanged.', fileRenamed: (name) => 'Workbench file renamed to ' + name + '.', fileRemoved: (name) => name + ': removed from the current workbench session.', fileClosed: (name) => name + ': closed and kept in local cache.', fileOpenedFromCache: (name) => 'Experiment opened from local cache: ' + name, confirmDeleteFile: (name) => name + ': click Confirm Delete to remove this open file from the workbench session.', layoutAlreadyDefault: (name) => name + ': layout is already using the default panels.', ...experimentLogCopies.en },
  },
};

const heatCapacityRealtimeCopies = {
  'zh-CN': {
    guideTitle: '实验指引',
    guideHint: '空气比热容比实验步骤与说明',
    recordsTitle: '数据与结果',
    recordsHint: 'U₀ / U₁ / U₂ 与空气比热容比计算',
    dataResultsTitle: '数据与结果',
    dataResultsHint: '记录值、单组 γ 与平均结果',
    reviewTitle: '过程回顾',
    reviewHint: '自由模式 trace 与操作诊断',
    materialsTitle: '实验资料与结果',
    materialsHint: 'U₁ / U₂ 与空气比热容比计算',
    closeMaterialsAria: '关闭实验资料与结果',
    materialsGroupAria: '展开或收起实验资料与结果',
    materialsFolderTitle: '点击文件夹展开/收起；单击文字选中；双击文字打开全部子标签页',
    materialsTabTitle: '单击选中；双击打开标签页',
    materialsTabsAria: '空气比热容比实验资料分页',
    previewMountAria: '空气比热容比视图预览区域',
    realtimePanelTitle: '实时数据',
    realtimeKicker: '实时数据',
    realtimeSubtitle: 'Uₜ / Uₚ、压强和过程采样',
    realtimeTitle: '空气比热容比实验',
    stagePrefix: '阶段：',
    demoPaused: '自动演示暂停',
    demoRunning: '自动演示',
    demoReady: '自动演示准备',
    autoDemoStart: '自动演示',
    autoDemoPause: '暂停演示',
    autoDemoResume: '继续演示',
    autoDemoStop: '终止演示',
    modeDemo: '演示模式',
    modeGuide: '引导模式',
    modeFree: '自由模式',
    guideLessonButtonLabel: '实验说明',
    guideLessonDialogAria: '热容比实验说明',
    guideLessonContinueHint: '点击空白区域来继续',
    guideChecklistLabel: '引导清单',
    guideStepLabel: '步骤',
    guideLessonIntroPages: [
      {
        title: '实验目标',
        body: '本实验通过一次“加压、快速放气、回温”的过程，记录 U₀、U₁、U₂，并换算为对应的压强状态，用来计算气体比热容比 γ。后续每一步操作都服务于获得可靠的这三个读数。',
      },
      {
        title: '压强与电压',
        body: 'Uₚ 是压强传感器输出的电压信号，不是压强本身。调零后，Uₚ 的变化代表瓶内外压强差。默认换算系数为 20 mV/kPa，所以 Uₚ = 120 mV 约对应 6 kPa 压强差，瓶内绝对压强约为大气压加 6 kPa。',
      },
      {
        title: '重新查看',
        body: '如果后续忘记这些内容，可以点击右上角、演示 / 引导 / 自由模式按钮右侧的扳手图标，重新查看刚刚的实验说明。',
      },
    ],
    guideLessonStepExplanations: {
      pressureZeroBaseline: {
        title: '压强差基准',
        body: '气瓶与外界连通时，瓶内压强与大气压相同，真实压强差应为 0。此时进行压强差调零才有明确基准；把传感器读数校正到这个状态，后面的 Uₚ 变化才代表瓶内相对外界的压强差，而不是仪器本身的零点偏移。',
      },
      sealedInitialState: {
        title: '封闭气瓶',
        body: '玻璃旋塞关闭后，气瓶与外界隔离，打入的气体会保留在瓶内，使瓶内绝对压强升高。这个封闭状态是形成放气前稳定高压状态的基础。',
      },
      pressureTarget: {
        title: '加压范围',
        body: 'Uₚ 约 120 mV 对应约 6 kPa 压强差，既能让后续放气造成足够明显的读数变化，也不会让压差过大。压差太小时，信号变化容易被波动、噪声和传感器响应影响；压差过高时，阀口流动更剧烈，过程更难接近理想的短促绝热放气，同时也更接近安全预警范围。',
      },
      preReleaseStability: {
        title: '放气前稳定',
        body: '打气后瓶内气体被压缩，压强和温度都会经历短时间变化，传感器显示也需要回稳。等待 5 min 是把这一状态视为接近热平衡，使 U₁ 代表放气前稳定高压状态，而不是刚打气后的瞬态读数。',
      },
      quickReleaseState: {
        title: '快速放气状态',
        body: '真实实验中，主要通过放气声音判断玻璃旋塞的关闭时机。听到“咻”的一声后，应等待这声“咻”完整结束；此时气体快速释放完毕，请立即点击玻璃旋塞将其关闭。关闭过早或过晚，都会成为比热容比测量的重要误差来源。软件左上角设有“微观可视化”开关，开启后可观察瓶内分子动画：当分子不再持续朝瓶口定向运动并出现大量反弹时，说明内外压强已经趋于平衡，可用来辅助判断关闭时机。微观可视化仅作为辅助，实际操作仍应以“咻”声结束作为主要判断依据。短时间放气使瓶内气体迅速膨胀并降温，这一阶段近似绝热过程；关闭旋塞后，瓶内保留下放气后的低温、低压状态。',
      },
      thermalRecovery: {
        title: '回温后的读数',
        body: '放气后瓶内气体温度低于环境。关闭旋塞后，气瓶近似保持定容，气体从环境吸热回温。等待 5 min 后记录 U₂，取的是回温稳定后的压强状态；刚放气瞬间的最低读数属于快速过程，不作为最终计算读数。',
      },
    },
    resetFreeMode: '重置自由模式',
    resetGuideMode: '重置引导模式',
    nextFreeGroup: '下一组实验',
    freeSpeedLabelCode: 'WAIT RATE',
    freeSpeedLabel: '等待倍速',
    freeSpeedAria: '等待倍速',
    freeWaitTimerLabel: { u1: 'U₁ 等待', u2: 'U₂ 等待' },
    freeWaitRecordStatus: { pending: '未记录', rerecord: '可重记' },
    exitGuideMode: '退出引导',
    exitTeachingMode: '退出教学模式',
    singleTrialBadge: '本次实验',
    trialBadge: (trialIndex: number) => `第 ${trialIndex} 组实验`,
    autoDemoFinishedLabel: '演示完成',
    demoPausedLabel: '已暂停',
    demoDoneLabel: '已完成',
    demoTargetLabel: '目标控件',
    demoProgressLabel: '推进标准',
    demoObservationLabel: '观察要点',
    autoDemoFinishedTitle: '演示完成',
    autoDemoFinishedDescription: '演示完成，可重新开始或进入引导 / 自由操作。',
    demoFallbackNote: '过程采样已保留。',
    startGuideExperiment: '引导模式',
    skipRecoveryWait: '真实实验中需要等待系统稳定；程序已省略该等待过程。',
    recordU0: '记录 U₀',
    recordU1: '记录 U₁ / Uₜ₁',
    recordU2: '记录 U₂ / Uₜ₂',
    recordDialogConfirm: '确认记录',
    recordDialogCancel: '取消',
    recordDialogCurrentPhase: '当前阶段',
    recordDialogPressure: '当前 Uₚ',
    recordDialogTemperature: '当前 Uₜ',
    recordDialogStopcock: '玻璃旋塞',
    recordDialogPumpValve: '打气阀门',
    recordDialogReady: '当前状态适合记录。',
    recordU0Warning: '请先完成压强差调零，使 Uₚ 接近 0。',
    recordU1Warning: '当前尚未达到放气前稳定状态，不建议记录 U₁。',
    recordU2Warning: '当前尚未完成回温稳定，不建议记录 U₂。',
    guideStrongReminder: '请点击目标控件，继续实验。',
    guideStrongReminderPressureZero: '请调节压强调零旋钮，继续实验。',
    guidePumpInsufficientReminder: 'Uₚ 未达到 120 mV，请继续打气。',
    guideRecordBlockedMessages: {
      u0NeedPower: '当前还不能记录 U₀。请先打开电源。',
      u0NeedStopcock: '当前还不能记录 U₀。请先打开玻璃旋塞。',
      u0NeedZero: '当前还不能记录 U₀。请先完成压力调零。',
      u0NeedCurrentStep: '当前还不能记录 U₀。请按当前步骤继续。',
      u1NeedPump: '当前还不能记录 U₁。请先完成打气。',
      u1NeedClosePumpValve: '当前还不能记录 U₁。请先关闭打气阀门。',
      u1NeedWait: '当前还不能记录 U₁。请等待计时达到 5 min。',
      u1NeedCurrentStep: '当前还不能记录 U₁。请按当前步骤继续。',
      u2NeedRelease: '当前还不能记录 U₂。请先完成快速放气。',
      u2NeedCloseStopcock: '当前还不能记录 U₂。请先关闭玻璃旋塞。',
      u2NeedWait: '当前还不能记录 U₂。请等待计时达到 5 min。',
      u2NeedCurrentStep: '当前还不能记录 U₂。请按当前步骤继续。',
    },
    guideUsageHints: {
      zeroFocus: '请双击仪表进入聚焦模式，开始压力调零。',
      zeroAdjust: '拖拽旋钮进行粗调，使用滚轮进行细调。',
      pumpValve: '请打开打气阀门。',
      pumpFocus: '请双击打气球进入聚焦模式。',
      pumpAction: '双击聚焦打气球，快速点按打气球，按压至 Uₚ ≥ 120 mV 后自动退出。',
      waitU1Ready: '5 min 到了，记录 U₁ / Uₜ₁。',
      releaseReady: '等待“咻”声结束，气体释放完毕，请立即关闭玻璃旋塞。',
      waitU2Ready: '5 min 到了，记录 U₂ / Uₜ₂。',
    },
    recordU0Success: 'U₀ 已记录。',
    recordU0SuccessToast: 'U₀ 记录成功。',
    recordU1SuccessToast: 'U₁ 和 Uₜ 记录成功。',
    recordU2SuccessToast: 'U₂ 和 Uₜ 记录成功。',
    finalTrialCompleteToast: '本次实验已完成。',
    freeGroupCompleteToast: '本组实验完成。',
    freePowerOffBeforeNextGroup: '请先关闭电源，完成本组实验后再调整参数。',
    freeRecordSuccessLog: {
      u0: '自由模式已记录 U₀ 显示值。',
      u1: '自由模式已记录 U₁ 显示值。',
      u2: '自由模式已记录 U₂ 显示值。',
    },
    freeModeActiveLog: (name: string) => `${name}：自由模式已启用。`,
    freeRunResetLog: (name: string) => `${name}：自由模式运行已重置。`,
    freeRecordRejectMessages: {
      'zero-not-ready': '请先打开电源并打开玻璃旋塞，再记录 U₀。',
      'calibration-changed': '调零状态已改变，请重新记录 U₀ 后再继续。',
      'unstable-pressure': '压强读数仍在变化，请等待稳定后再记录。',
      'unstable-temperature': '温度读数仍在变化，请等待回到稳定环境值后再记录。',
      'insufficient-u1': 'U₁ 压强差不足，请关闭旋塞并继续打气到有效范围。',
      'release-not-started': '请先完成快速放气并关闭旋塞，再记录 U₂。',
      'over-vented': '放气过度，U₂ 已低于有效范围；请重新开始本组 Free trial。',
      'pressure-danger': '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
      'invalid-sequence': '当前操作顺序不能记录该数据点，请按 U₀、U₁、U₂ 的顺序进行。',
    } satisfies Record<HeatCapacityFreeRecordRejectReason, string>,
    pumpFrequencySlowToast: '打气太慢，请加快打气频率。',
    pressureWarningMessage: '压强已达到建议打气范围，请停止打气并等待回温。',
    pressureAlarmMessage: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
    closePumpValveReminder: '请关闭打气阀门。',
    pumpHints: {
      idle: '未打气',
      pumpValveOpen: '打气阀门已打开',
      pumpValveClosed: '打气阀门已关闭',
      needPower: '请先打开电源，再执行有效打气',
      stopcockOpenBlocksPump: '玻璃旋塞已打开，无法形成有效加压',
      needPumpValve: '打气阀门未打开，无法有效打气',
      pressureDanger: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
      pressureWarning: '压强已达到建议打气范围，请停止打气并等待回温。',
      pumpTargetReached: '已达到打气标准，请关闭打气阀门。',
      pumpRateGood: '打气频率合适，可以继续观察压强变化',
      pumpRateSlow: '打气速率偏低，实验效果可能不明显',
      teachingComplete: '教学流程已完成',
      autoDemoStarted: '自动演示已启动',
      observeInitialPressure: '观察初始压强差示数是否为零',
    },
    pressureAlarmLog: (name: string) => `${name}：压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。`,
    toastSystemKicker: '系统',
    autoDemoLockedToast: '演示中无法操作',
    autoDemoCompletedLockedToast: '演示已完成，请退出后进入自由模式操作。',
    guideCompletedLockedToast: '引导内容已完成，请退出后进入自由模式操作。',
    autoDemoCompletionToast: '演示完成',
    guideModeStartingToast: '正在启动引导模式',
    guideModeExitedToast: '引导模式已终止',
    teachingModeExitedToast: '已退出教学模式',
    guideModeExitedLog: (name: string) => `${name}：引导模式已终止。`,
    autoDemoPreparingHint: '系统正在自动恢复默认状态，稍后开始演示',
    autoDemoReadyToCompleteHint: '自动演示即将完成，过程采样已保留',
    autoDemoImportedCompleteLog: (name: string) => `${name}：自动演示数据已导入并完成计算。`,
    autoDemoResumedLog: (name: string) => `${name}：自动演示已继续。`,
    autoDemoRunningLog: (name: string) => `${name}：自动演示正在运行。`,
    autoDemoPreparingTitle: '准备演示',
    autoDemoInitializingDescription: '正在初始化自动演示',
    autoDemoPreparingTarget: '自动演示准备',
    autoDemoPreparingProgress: '完成复位后从开启电源步骤开始。',
    autoDemoPreparingNote: '系统正在自动复位控件、视角和演示数据；完成后将从开启电源步骤开始。',
    autoDemoInitializingToast: '正在初始化自动演示',
    autoDemoStartedLog: (name: string) => `${name}：自动演示已启动。`,
    autoDemoPausedHint: '自动演示已暂停',
    autoDemoPausedLog: (name: string) => `${name}：自动演示已暂停。`,
    autoDemoTerminatedHint: '自动演示已终止',
    autoDemoTerminatedTitle: '演示已终止',
    autoDemoTerminatedDescription: '自动演示已停止，当前曲线和读数保留。',
    autoDemoTerminatedTarget: '自动演示流程',
    autoDemoTerminatedProgress: '演示已停止，用户可重新选择模式。',
    autoDemoTerminatedNote: '用户交互已恢复，可重新开始或进入引导 / 自由操作。',
    autoDemoTerminatedToast: '演示已终止',
    autoDemoTerminatedLog: (name: string) => `${name}：自动演示已终止。`,
    safetyLimit: '安全上限',
    safetyActive: '激活',
    pressureAlarmTitle: '报警',
    pressureWarningFallback: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
    pressureWarningObserve: '聚焦模式已退出，请立即停止打气。',
    operationLocked: '操作锁定',
    phaseLabels: {
      powerOff: '未开机',
      readyToZero: '等待调零',
      zeroed: '已调零',
      readyToPump: '准备打气',
      pumping: '打气中',
      sealedStabilizing: '封闭等待稳定',
      releasing: '快速放气',
      recovering: '等待回温',
      fallback: '实验准备',
    },
    stopcock: { open: '打开', closed: '关闭' },
    safety: {
      danger: '危险',
      warning: '建议停止',
      normal: '安全',
      dangerNote: '停止打气',
      warningNote: '等待回温',
      normalNote: '可继续观察',
    },
    zeroStatus: {
      completed: '已完成',
      adjustable: '可调零',
      notReady: '未就绪',
    },
    hints: {
      powerOff: '请先打开电源。',
      readyToZero: '请观察 Uₚ，并进行压强调零。',
      readyToPump: '请关闭玻璃旋塞并准备打气。',
      pumping: '连续打气至 Uₚ ≥ 120 mV，达到后停止加压。',
      sealedStabilizing: '真实实验需封闭等待 5 min，稳定后记录 U₁。',
      releasing: '关闭玻璃旋塞，并等待回温稳定。',
      recovering: '关闭玻璃旋塞后等待 5 min，回温稳定后记录 U₂。',
      fallback: '观察实时读数变化。',
    },
    readings: {
      temperature: '温度信号',
      pressure: '压强差电压',
      delta: '由当前 Uₚ 换算',
      safety: '压力状态',
      pumpValve: '打气阀门',
      stopcock: '玻璃旋塞',
      zero: '压强调零',
      currentHint: '当前提示',
      opened: '已打开',
      closed: '已关闭',
    },
  },
  'zh-TW': {
    guideTitle: '實驗指引',
    guideHint: '空氣比熱容比實驗步驟與說明',
    recordsTitle: '資料與結果',
    recordsHint: 'U₀ / U₁ / U₂ 與空氣比熱容比計算',
    dataResultsTitle: '資料與結果',
    dataResultsHint: '記錄值、單組 γ 與平均結果',
    reviewTitle: '過程回顧',
    reviewHint: '自由模式 trace 與操作診斷',
    materialsTitle: '實驗資料與結果',
    materialsHint: 'U₁ / U₂ 與空氣比熱容比計算',
    closeMaterialsAria: '關閉實驗資料與結果',
    materialsGroupAria: '展開或收起實驗資料與結果',
    materialsFolderTitle: '點擊資料夾展開/收起；單擊文字選取；雙擊文字開啟全部子分頁',
    materialsTabTitle: '單擊選取；雙擊開啟分頁',
    materialsTabsAria: '空氣比熱容比實驗資料分頁',
    previewMountAria: '空氣比熱容比視圖預覽區域',
    realtimePanelTitle: '即時資料',
    realtimeKicker: '即時資料',
    realtimeSubtitle: 'Uₜ / Uₚ、壓強和過程採樣',
    realtimeTitle: '空氣比熱容比實驗',
    stagePrefix: '階段：',
    demoPaused: '自動演示暫停',
    demoRunning: '自動演示',
    demoReady: '自動演示準備',
    autoDemoStart: '自動演示',
    autoDemoPause: '暫停演示',
    autoDemoResume: '繼續演示',
    autoDemoStop: '終止演示',
    modeDemo: '演示模式',
    modeGuide: '引導模式',
    modeFree: '自由模式',
    guideLessonButtonLabel: '實驗說明',
    guideLessonDialogAria: '熱容比實驗說明',
    guideLessonContinueHint: '點擊空白區域繼續',
    guideChecklistLabel: '引導清單',
    guideStepLabel: '步驟',
    guideLessonIntroPages: [
      {
        title: '實驗目標',
        body: '本實驗通過一次「加壓、快速放氣、回溫」的過程，記錄 U₀、U₁、U₂，並換算為對應的壓強狀態，用來計算氣體比熱容比 γ。後續每一步操作都服務於獲得可靠的這三個讀數。',
      },
      {
        title: '壓強與電壓',
        body: 'Uₚ 是壓強感測器輸出的電壓信號，不是壓強本身。調零後，Uₚ 的變化代表瓶內外壓強差。預設換算係數為 20 mV/kPa，所以 Uₚ = 120 mV 約對應 6 kPa 壓強差，瓶內絕對壓強約為大氣壓加 6 kPa。',
      },
      {
        title: '重新查看',
        body: '如果後續忘記這些內容，可以點擊右上角、演示 / 引導 / 自由模式按鈕右側的扳手圖標，重新查看剛剛的實驗說明。',
      },
    ],
    guideLessonStepExplanations: {
      pressureZeroBaseline: {
        title: '壓強差基準',
        body: '氣瓶與外界連通時，瓶內壓強與大氣壓相同，真實壓強差應為 0。把感測器讀數校正到這個狀態，後面的 Uₚ 變化才代表瓶內相對外界的壓強差，而不是儀器本身的零點偏移。',
      },
      sealedInitialState: {
        title: '封閉氣瓶',
        body: '玻璃旋塞關閉後，氣瓶與外界隔離，打入的氣體會保留在瓶內，使瓶內絕對壓強升高。這個封閉狀態是形成放氣前穩定高壓狀態的基礎。',
      },
      pressureTarget: {
        title: '加壓範圍',
        body: 'Uₚ 約 120 mV 對應約 6 kPa 壓強差，既能讓後續放氣造成足夠明顯的讀數變化，也不會讓壓差過大。壓差太小時，信號變化容易被波動、噪聲和感測器響應影響；壓差過高時，閥口流動更劇烈，過程更難接近理想的短促絕熱放氣，同時也更接近安全預警範圍。',
      },
      preReleaseStability: {
        title: '放氣前穩定',
        body: '打氣後瓶內氣體被壓縮，壓強和溫度都會經歷短時間變化，感測器顯示也需要回穩。等待 5 min 是把這一狀態視為接近熱平衡，使 U₁ 代表放氣前穩定高壓狀態，而不是剛打氣後的瞬態讀數。',
      },
      quickReleaseState: {
        title: '快速放氣狀態',
        body: '真實實驗中，主要通過放氣聲音判斷玻璃旋塞的關閉時機。聽到「咻」的一聲後，應等待這聲「咻」完整結束；此時氣體快速釋放完畢，請立即點擊玻璃旋塞將其關閉。關閉過早或過晚，都會成為比熱容比測量的重要誤差來源。軟件左上角設有「微觀可視化」開關，開啟後可觀察瓶內分子動畫：當分子不再持續朝瓶口定向運動並出現大量反彈時，說明內外壓強已經趨於平衡，可用來輔助判斷關閉時機。微觀可視化僅作為輔助，實際操作仍應以「咻」聲結束作為主要判斷依據。短時間放氣使瓶內氣體迅速膨脹並降溫，這一階段近似絕熱過程；關閉旋塞後，瓶內保留下放氣後的低溫、低壓狀態。',
      },
      thermalRecovery: {
        title: '回溫後的讀數',
        body: '放氣後瓶內氣體溫度低於環境。關閉旋塞後，氣瓶近似保持定容，氣體從環境吸熱回溫。等待 5 min 後記錄 U₂，取的是回溫穩定後的壓強狀態；剛放氣瞬間的最低讀數屬於快速過程，不作為最終計算讀數。',
      },
    },
    resetFreeMode: '重置自由模式',
    resetGuideMode: '重置引導模式',
    nextFreeGroup: '下一組實驗',
    freeSpeedLabelCode: 'WAIT RATE',
    freeSpeedLabel: '等待倍速',
    freeSpeedAria: '等待倍速',
    freeWaitTimerLabel: { u1: 'U₁ 等待', u2: 'U₂ 等待' },
    freeWaitRecordStatus: { pending: '未記錄', rerecord: '可重記' },
    exitGuideMode: '退出引導',
    exitTeachingMode: '退出教學模式',
    singleTrialBadge: '本次實驗',
    trialBadge: (trialIndex: number) => `第 ${trialIndex} 組實驗`,
    autoDemoFinishedLabel: '演示完成',
    demoPausedLabel: '已暫停',
    demoDoneLabel: '已完成',
    demoTargetLabel: '目標控件',
    demoProgressLabel: '推進標準',
    demoObservationLabel: '觀察要點',
    autoDemoFinishedTitle: '演示完成',
    autoDemoFinishedDescription: '演示完成，可重新開始或進入引導 / 自由操作。',
    demoFallbackNote: '過程採樣已保留。',
    startGuideExperiment: '引導模式',
    skipRecoveryWait: '真實實驗中需要等待系統穩定；程序已省略該等待過程。',
    recordU0: '記錄 U₀',
    recordU1: '記錄 U₁ / Uₜ₁',
    recordU2: '記錄 U₂ / Uₜ₂',
    recordDialogConfirm: '確認記錄',
    recordDialogCancel: '取消',
    recordDialogCurrentPhase: '目前階段',
    recordDialogPressure: '目前 Uₚ',
    recordDialogTemperature: '目前 Uₜ',
    recordDialogStopcock: '玻璃旋塞',
    recordDialogPumpValve: '打氣閥門',
    recordDialogReady: '目前狀態適合記錄。',
    recordU0Warning: '請先完成壓強差調零，使 Uₚ 接近 0。',
    recordU1Warning: '目前尚未達到放氣前穩定狀態，不建議記錄 U₁。',
    recordU2Warning: '目前尚未完成回溫穩定，不建議記錄 U₂。',
    guideStrongReminder: '請點擊目標控件，繼續實驗。',
    guideStrongReminderPressureZero: '請調節壓強調零旋鈕，繼續實驗。',
    guidePumpInsufficientReminder: 'Uₚ 未達到 120 mV，請繼續打氣。',
    guideRecordBlockedMessages: {
      u0NeedPower: '目前還不能記錄 U₀。請先打開電源。',
      u0NeedStopcock: '目前還不能記錄 U₀。請先打開玻璃旋塞。',
      u0NeedZero: '目前還不能記錄 U₀。請先完成壓強調零。',
      u0NeedCurrentStep: '目前還不能記錄 U₀。請按目前步驟繼續。',
      u1NeedPump: '目前還不能記錄 U₁。請先完成打氣。',
      u1NeedClosePumpValve: '目前還不能記錄 U₁。請先關閉打氣閥門。',
      u1NeedWait: '目前還不能記錄 U₁。請等待計時達到 5 min。',
      u1NeedCurrentStep: '目前還不能記錄 U₁。請按目前步驟繼續。',
      u2NeedRelease: '目前還不能記錄 U₂。請先完成快速放氣。',
      u2NeedCloseStopcock: '目前還不能記錄 U₂。請先關閉玻璃旋塞。',
      u2NeedWait: '目前還不能記錄 U₂。請等待計時達到 5 min。',
      u2NeedCurrentStep: '目前還不能記錄 U₂。請按目前步驟繼續。',
    },
    guideUsageHints: {
      zeroFocus: '請雙擊儀表進入聚焦模式，開始壓強調零。',
      zeroAdjust: '拖曳旋鈕進行粗調，使用滾輪進行細調。',
      pumpValve: '請打開打氣閥門。',
      pumpFocus: '請雙擊打氣球進入聚焦模式。',
      pumpAction: '雙擊聚焦打氣球，快速點按打氣球，按壓至 Uₚ ≥ 120 mV 後自動退出。',
      waitU1Ready: '5 min 到了，記錄 U₁ / Uₜ₁。',
      releaseReady: '等待「咻」聲結束，氣體釋放完畢，請立即關閉玻璃旋塞。',
      waitU2Ready: '5 min 到了，記錄 U₂ / Uₜ₂。',
    },
    recordU0Success: 'U₀ 已記錄。',
    recordU0SuccessToast: 'U₀ 記錄成功。',
    recordU1SuccessToast: 'U₁ 和 Uₜ 記錄成功。',
    recordU2SuccessToast: 'U₂ 和 Uₜ 記錄成功。',
    finalTrialCompleteToast: '本次實驗已完成。',
    freeGroupCompleteToast: '本組實驗完成。',
    freePowerOffBeforeNextGroup: '請先關閉電源，完成本組實驗後再調整參數。',
    freeRecordSuccessLog: {
      u0: '自由模式已記錄 U₀ 顯示值。',
      u1: '自由模式已記錄 U₁ 顯示值。',
      u2: '自由模式已記錄 U₂ 顯示值。',
    },
    freeModeActiveLog: (name: string) => `${name}：自由模式已啟用。`,
    freeRunResetLog: (name: string) => `${name}：自由模式執行已重置。`,
    freeRecordRejectMessages: {
      'zero-not-ready': '請先打開電源並打開玻璃旋塞，再記錄 U₀。',
      'calibration-changed': '調零狀態已改變，請重新記錄 U₀ 後再繼續。',
      'unstable-pressure': '壓強讀數仍在變化，請等待穩定後再記錄。',
      'unstable-temperature': '溫度讀數仍在變化，請等待回到穩定環境值後再記錄。',
      'insufficient-u1': 'U₁ 壓強差不足，請關閉旋塞並繼續打氣到有效範圍。',
      'release-not-started': '請先完成快速放氣並關閉旋塞，再記錄 U₂。',
      'over-vented': '放氣過度，U₂ 已低於有效範圍；請重新開始本組 Free trial。',
      'pressure-danger': '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
      'invalid-sequence': '目前操作順序不能記錄該資料點，請按 U₀、U₁、U₂ 的順序進行。',
    } satisfies Record<HeatCapacityFreeRecordRejectReason, string>,
    pumpFrequencySlowToast: '打氣太慢，請加快打氣頻率。',
    pressureWarningMessage: '壓強已達到建議打氣範圍，請停止打氣並等待回溫。',
    pressureAlarmMessage: '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
    closePumpValveReminder: '請關閉打氣閥門。',
    pumpHints: {
      idle: '未打氣',
      pumpValveOpen: '打氣閥門已打開',
      pumpValveClosed: '打氣閥門已關閉',
      needPower: '請先打開電源，再執行有效打氣',
      stopcockOpenBlocksPump: '玻璃旋塞已打開，無法形成有效加壓',
      needPumpValve: '打氣閥門未打開，無法有效打氣',
      pressureDanger: '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
      pressureWarning: '壓強已達到建議打氣範圍，請停止打氣並等待回溫。',
      pumpTargetReached: '已達到打氣標準，請關閉打氣閥門。',
      pumpRateGood: '打氣頻率合適，可以繼續觀察壓強變化',
      pumpRateSlow: '打氣速率偏低，實驗效果可能不明顯',
      teachingComplete: '教學流程已完成',
      autoDemoStarted: '自動演示已啟動',
      observeInitialPressure: '觀察初始壓強差示數是否為零',
    },
    pressureAlarmLog: (name: string) => `${name}：壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。`,
    toastSystemKicker: '系統',
    autoDemoLockedToast: '演示中無法操作',
    autoDemoCompletedLockedToast: '演示已完成，請退出後進入自由模式操作。',
    guideCompletedLockedToast: '引導內容已完成，請退出後進入自由模式操作。',
    autoDemoCompletionToast: '演示完成',
    guideModeStartingToast: '正在啟動引導模式',
    guideModeExitedToast: '引導模式已終止',
    teachingModeExitedToast: '已退出教學模式',
    guideModeExitedLog: (name: string) => `${name}：引導模式已終止。`,
    autoDemoPreparingHint: '系統正在自動恢復預設狀態，稍後開始演示',
    autoDemoReadyToCompleteHint: '自動演示即將完成，過程採樣已保留',
    autoDemoImportedCompleteLog: (name: string) => `${name}：自動演示資料已匯入並完成計算。`,
    autoDemoResumedLog: (name: string) => `${name}：自動演示已繼續。`,
    autoDemoRunningLog: (name: string) => `${name}：自動演示正在執行。`,
    autoDemoPreparingTitle: '準備演示',
    autoDemoInitializingDescription: '正在初始化自動演示',
    autoDemoPreparingTarget: '自動演示準備',
    autoDemoPreparingProgress: '完成復位後從開啟電源步驟開始。',
    autoDemoPreparingNote: '系統正在自動復位控件、視角和演示資料；完成後將從開啟電源步驟開始。',
    autoDemoInitializingToast: '正在初始化自動演示',
    autoDemoStartedLog: (name: string) => `${name}：自動演示已啟動。`,
    autoDemoPausedHint: '自動演示已暫停',
    autoDemoPausedLog: (name: string) => `${name}：自動演示已暫停。`,
    autoDemoTerminatedHint: '自動演示已終止',
    autoDemoTerminatedTitle: '演示已終止',
    autoDemoTerminatedDescription: '自動演示已停止，目前曲線和讀數保留。',
    autoDemoTerminatedTarget: '自動演示流程',
    autoDemoTerminatedProgress: '演示已停止，使用者可重新選擇模式。',
    autoDemoTerminatedNote: '使用者互動已恢復，可重新開始或進入引導 / 自由操作。',
    autoDemoTerminatedToast: '演示已終止',
    autoDemoTerminatedLog: (name: string) => `${name}：自動演示已終止。`,
    safetyLimit: '安全上限',
    safetyActive: '啟用',
    pressureAlarmTitle: '警報',
    pressureWarningFallback: '壓強已超過安全閾值，瓶塞可能被頂開，請立即停止打氣。',
    pressureWarningObserve: '聚焦模式已退出，請立即停止打氣。',
    operationLocked: '操作鎖定',
    phaseLabels: {
      powerOff: '未開機',
      readyToZero: '等待調零',
      zeroed: '已調零',
      readyToPump: '準備打氣',
      pumping: '打氣中',
      sealedStabilizing: '封閉等待穩定',
      releasing: '快速放氣',
      recovering: '等待回溫',
      fallback: '實驗準備',
    },
    stopcock: { open: '打開', closed: '關閉' },
    safety: {
      danger: '危險',
      warning: '接近閾值',
      normal: '安全',
      dangerNote: '停止打氣',
      warningNote: '準備停止打氣',
      normalNote: '可繼續觀察',
    },
    zeroStatus: {
      completed: '已完成',
      adjustable: '可調零',
      notReady: '未就緒',
    },
    hints: {
      powerOff: '請先打開電源。',
      readyToZero: '請觀察 Uₚ，並進行壓強調零。',
      readyToPump: '請關閉玻璃旋塞並準備打氣。',
      pumping: '連續打氣至 Uₚ ≥ 120 mV，達到後停止加壓。',
      sealedStabilizing: '真實實驗需封閉等待 5 min，穩定後記錄 U₁。',
      releasing: '關閉玻璃旋塞，並等待回溫穩定。',
      recovering: '關閉玻璃旋塞後等待 5 min，回溫穩定後記錄 U₂。',
      fallback: '觀察即時讀數變化。',
    },
    readings: {
      temperature: '溫度信號',
      pressure: '壓強差電壓',
      delta: '由目前 Uₚ 換算',
      safety: '壓力狀態',
      pumpValve: '打氣閥門',
      stopcock: '玻璃旋塞',
      zero: '壓強調零',
      currentHint: '目前提示',
      opened: '已打開',
      closed: '已關閉',
    },
  },
  en: {
    guideTitle: 'Experiment Guide',
    guideHint: 'Procedure and notes for the air heat capacity ratio experiment',
    recordsTitle: 'Data & Results',
    recordsHint: 'U₀ / U₁ / U₂ and heat capacity ratio calculation',
    dataResultsTitle: 'Data & Results',
    dataResultsHint: 'Recorded values, trial γ, and mean result',
    reviewTitle: 'Process Review',
    reviewHint: 'Free Mode trace and operation diagnosis',
    materialsTitle: 'Experiment Notes & Results',
    materialsHint: 'U₁ / U₂ and air heat capacity ratio calculation',
    closeMaterialsAria: 'Close experiment notes and results',
    materialsGroupAria: 'Expand or collapse experiment notes and results',
    materialsFolderTitle: 'Click the folder to expand or collapse; click text to select; double-click text to open all child tabs',
    materialsTabTitle: 'Click to select; double-click to open the tab',
    materialsTabsAria: 'Heat Capacity experiment notes tabs',
    previewMountAria: 'Heat capacity ratio view preview mount',
    realtimePanelTitle: 'Realtime Data',
    realtimeKicker: 'Realtime Data',
    realtimeSubtitle: 'Uₜ / Uₚ, pressure, and process samples',
    realtimeTitle: 'Air Heat Capacity Ratio Experiment',
    stagePrefix: 'Stage: ',
    demoPaused: 'Auto demo paused',
    demoRunning: 'Auto demo',
    demoReady: 'Auto demo ready',
    autoDemoStart: 'Auto demo',
    autoDemoPause: 'Pause demo',
    autoDemoResume: 'Resume demo',
    autoDemoStop: 'Stop demo',
    modeDemo: 'Demo mode',
    modeGuide: 'Guide mode',
    modeFree: 'Free mode',
    guideLessonButtonLabel: 'Experiment notes',
    guideLessonDialogAria: 'Heat capacity experiment notes',
    guideLessonContinueHint: 'Click blank area to continue',
    guideChecklistLabel: 'Guide checklist',
    guideStepLabel: 'Step',
    guideLessonIntroPages: [
      {
        title: 'Experiment goal',
        body: 'This experiment records U₀, U₁, and U₂ through one pressurizing, quick-release, and thermal-recovery sequence. Those readings are converted into pressure states and used to calculate the gas heat capacity ratio γ. Each experiment step supports reliable values for these three readings.',
      },
      {
        title: 'Pressure and voltage',
        body: 'Uₚ is the pressure-sensor voltage signal, not pressure itself. After zeroing, changes in Uₚ represent the pressure difference between the vessel and the outside air. The default conversion is 20 mV/kPa, so Uₚ = 120 mV corresponds to about 6 kPa pressure difference, and the vessel absolute pressure is roughly atmospheric pressure plus 6 kPa.',
      },
      {
        title: 'Review later',
        body: 'If you forget this explanation later, click the wrench in the upper-right corner, just to the right of the Demo / Guide / Free mode buttons, to rewatch these experiment notes.',
      },
    ],
    guideLessonStepExplanations: {
      pressureZeroBaseline: {
        title: 'Pressure-difference baseline',
        body: 'When the vessel is connected to the outside air, the internal pressure matches atmospheric pressure, so the true pressure difference is 0. Calibrating the sensor at this state makes later Uₚ changes represent the vessel pressure difference instead of the instrument zero offset.',
      },
      sealedInitialState: {
        title: 'Sealed vessel',
        body: 'After the glass stopcock closes, the vessel is isolated from the outside air. Pumped gas remains in the vessel and raises its absolute pressure. This sealed state is the basis for the stable high-pressure state before release.',
      },
      pressureTarget: {
        title: 'Pressurizing range',
        body: 'Uₚ around 120 mV corresponds to about 6 kPa pressure difference. That range gives the quick release a clear signal change without making the pressure difference too large. If the pressure difference is too small, noise, fluctuation, and sensor response dominate the data; if it is too high, the valve flow becomes more violent, the short adiabatic-release approximation is harder to keep, and the system approaches the safety-warning region.',
      },
      preReleaseStability: {
        title: 'Stable state before release',
        body: 'After pumping, the gas has been compressed, and both pressure and temperature go through a short transient while the sensor display also settles. The 5 min wait treats this state as near thermal equilibrium, so U₁ represents the stable high-pressure state before release rather than the immediate transient after pumping.',
      },
      quickReleaseState: {
        title: 'Quick-release state',
        body: 'In the real experiment, the release sound is the primary cue for closing the glass stopcock. After you hear the “whoosh,” wait for that sound to finish completely; the rapid gas release is then complete, so click the glass stopcock immediately to close it. Closing too early or too late is an important source of error in the measured heat-capacity ratio. A “Microscopic visualization” switch is available in the upper-left corner. When enabled, its molecular animation can assist your judgment: the internal and external pressures are approaching balance when molecules stop moving persistently toward the bottle opening and many of them rebound. This visualization is only an auxiliary cue; the end of the “whoosh” remains the primary operating criterion. The short release makes the gas expand and cool rapidly in an approximately adiabatic process, leaving a low-temperature, lower-pressure state after the stopcock closes.',
      },
      thermalRecovery: {
        title: 'Recovered U₂ reading',
        body: 'After release, the gas temperature in the vessel is lower than the environment. With the stopcock closed, the vessel is treated as nearly constant-volume while the gas absorbs heat and recovers. U₂ is recorded after the 5 min recovery wait; the minimum reading immediately after release belongs to the fast transient and is not used as the final calculation reading.',
      },
    },
    resetFreeMode: 'Reset Free mode',
    resetGuideMode: 'Reset Guide mode',
    nextFreeGroup: 'Next trial',
    freeSpeedLabelCode: 'WAIT RATE',
    freeSpeedLabel: 'Wait speed',
    freeSpeedAria: 'Wait speed multiplier',
    freeWaitTimerLabel: { u1: 'U1 wait', u2: 'U2 wait' },
    freeWaitRecordStatus: { pending: 'Not recorded', rerecord: 'Can re-record' },
    exitGuideMode: 'Exit guide',
    exitTeachingMode: 'Exit teaching mode',
    singleTrialBadge: 'This experiment',
    trialBadge: (trialIndex: number) => `Trial ${trialIndex}`,
    autoDemoFinishedLabel: 'Demo complete',
    demoPausedLabel: 'Paused',
    demoDoneLabel: 'Complete',
    demoTargetLabel: 'Target control',
    demoProgressLabel: 'Standard',
    demoObservationLabel: 'Observation',
    autoDemoFinishedTitle: 'Demo complete',
    autoDemoFinishedDescription: 'Demo complete. You can restart or use guide / free mode.',
    demoFallbackNote: 'Process samples are retained.',
    startGuideExperiment: 'Guide mode',
    skipRecoveryWait: 'The real experiment would wait for the system to stabilize; this program omits that wait.',
    recordU0: 'Record U₀',
    recordU1: 'Record U₁ / Uₜ₁',
    recordU2: 'Record U₂ / Uₜ₂',
    recordDialogConfirm: 'Confirm record',
    recordDialogCancel: 'Cancel',
    recordDialogCurrentPhase: 'Current phase',
    recordDialogPressure: 'Current Uₚ',
    recordDialogTemperature: 'Current Uₜ',
    recordDialogStopcock: 'Glass stopcock',
    recordDialogPumpValve: 'Pump valve',
    recordDialogReady: 'Current state is suitable for recording.',
    recordU0Warning: 'Complete pressure zeroing first so Uₚ is close to 0.',
    recordU1Warning: 'The pre-release stable state has not been reached. U₁ recording is not recommended.',
    recordU2Warning: 'Thermal recovery is not complete. U₂ recording is not recommended.',
    guideStrongReminder: 'Click the target control to continue the experiment.',
    guideStrongReminderPressureZero: 'Adjust the pressure-zero knob to continue the experiment.',
    guidePumpInsufficientReminder: 'Uₚ has not reached 120 mV. Continue pumping.',
    guideRecordBlockedMessages: {
      u0NeedPower: 'U₀ cannot be recorded yet. Turn on the power first.',
      u0NeedStopcock: 'U₀ cannot be recorded yet. Open the glass stopcock first.',
      u0NeedZero: 'U₀ cannot be recorded yet. Complete pressure zeroing first.',
      u0NeedCurrentStep: 'U₀ cannot be recorded yet. Continue the current step.',
      u1NeedPump: 'U₁ cannot be recorded yet. Complete pumping first.',
      u1NeedClosePumpValve: 'U₁ cannot be recorded yet. Close the pump valve first.',
      u1NeedWait: 'U₁ cannot be recorded yet. Wait until the timer reaches 5 min.',
      u1NeedCurrentStep: 'U₁ cannot be recorded yet. Continue the current step.',
      u2NeedRelease: 'U₂ cannot be recorded yet. Complete quick release first.',
      u2NeedCloseStopcock: 'U₂ cannot be recorded yet. Close the glass stopcock first.',
      u2NeedWait: 'U₂ cannot be recorded yet. Wait until the timer reaches 5 min.',
      u2NeedCurrentStep: 'U₂ cannot be recorded yet. Continue the current step.',
    },
    guideUsageHints: {
      zeroFocus: 'Double-click the instrument to enter focus mode and start pressure zeroing.',
      zeroAdjust: 'Drag the knob for coarse adjustment and use the wheel for fine adjustment.',
      pumpValve: 'Open the pump valve.',
      pumpFocus: 'Double-click the pump bulb to enter focus mode.',
      pumpAction: 'Double-click the pump bulb to focus, then click rapidly until Uₚ ≥ 120 mV; focus exits automatically.',
      waitU1Ready: '5 min has elapsed. Record U₁ / Uₜ₁.',
      releaseReady: 'Wait for the “whoosh” to end; once the gas release is complete, close the glass stopcock immediately.',
      waitU2Ready: '5 min has elapsed. Record U₂ / Uₜ₂.',
    },
    recordU0Success: 'U₀ recorded.',
    recordU0SuccessToast: 'U₀ recorded successfully.',
    recordU1SuccessToast: 'U₁ and Uₜ recorded successfully.',
    recordU2SuccessToast: 'U₂ and Uₜ recorded successfully.',
    finalTrialCompleteToast: 'The experiment is complete.',
    freeGroupCompleteToast: 'This free-mode group is complete.',
    freePowerOffBeforeNextGroup: 'Turn off the power to complete this trial before adjusting parameters.',
    freeRecordSuccessLog: {
      u0: 'Free Mode recorded the U₀ display value.',
      u1: 'Free Mode recorded the U₁ display value.',
      u2: 'Free Mode recorded the U₂ display value.',
    },
    freeModeActiveLog: (name: string) => `${name}: Free Mode active.`,
    freeRunResetLog: (name: string) => `${name}: Free Mode run reset.`,
    freeRecordRejectMessages: {
      'zero-not-ready': 'Turn on power and open the glass stopcock before recording U₀.',
      'calibration-changed': 'The zeroing state changed. Record U₀ again before continuing.',
      'unstable-pressure': 'The pressure reading is still changing. Wait until it is stable.',
      'unstable-temperature': 'The temperature reading is still changing. Wait until it returns to a stable ambient value.',
      'insufficient-u1': 'U₁ pressure difference is too small. Close the stopcock and keep pumping into the effective range.',
      'release-not-started': 'Complete the quick release and close the stopcock before recording U₂.',
      'over-vented': 'The release was excessive and U₂ is below the effective range. Restart this Free trial.',
      'pressure-danger': 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
      'invalid-sequence': 'This point cannot be recorded in the current sequence. Record in U₀, U₁, U₂ order.',
    } satisfies Record<HeatCapacityFreeRecordRejectReason, string>,
    pumpFrequencySlowToast: 'Pumping is too slow. Increase the pumping rate.',
    pressureWarningMessage: 'Pressure has reached the recommended pumping range. Stop pumping and wait for thermal recovery.',
    pressureAlarmMessage: 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
    closePumpValveReminder: 'Close the pump valve.',
    pumpHints: {
      idle: 'Not pumped',
      pumpValveOpen: 'Pump valve is open',
      pumpValveClosed: 'Pump valve is closed',
      needPower: 'Turn on the power before effective pumping',
      stopcockOpenBlocksPump: 'The glass stopcock is open, so pressure cannot build effectively',
      needPumpValve: 'Open the pump valve before effective pumping',
      pressureDanger: 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
      pressureWarning: 'Pressure has reached the recommended pumping range. Stop pumping and wait for thermal recovery.',
      pumpTargetReached: 'Pumping target reached. Close the pump valve.',
      pumpRateGood: 'Pumping rate is suitable. Continue watching the pressure change',
      pumpRateSlow: 'Pumping rate is low, so the experiment may be less visible',
      teachingComplete: 'Teaching flow complete',
      autoDemoStarted: 'Auto demo started',
      observeInitialPressure: 'Observe whether the initial pressure-difference reading is zero',
    },
    pressureAlarmLog: (name: string) => `${name}: Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.`,
    toastSystemKicker: 'SYSTEM',
    autoDemoLockedToast: 'Cannot operate during the demo',
    autoDemoCompletedLockedToast: 'Demo is complete. Exit before operating in Free Mode.',
    guideCompletedLockedToast: 'Guide is complete. Exit before operating in Free Mode.',
    autoDemoCompletionToast: 'Demo complete',
    guideModeStartingToast: 'Starting guide mode',
    guideModeExitedToast: 'Guide mode stopped',
    teachingModeExitedToast: 'Teaching mode exited',
    guideModeExitedLog: (name: string) => `${name}: guide mode stopped.`,
    autoDemoPreparingHint: 'The system is restoring default state and will start the demo shortly',
    autoDemoReadyToCompleteHint: 'Auto demo is about to finish; process samples are retained',
    autoDemoImportedCompleteLog: (name: string) => `${name}: auto-demo data imported and calculated.`,
    autoDemoResumedLog: (name: string) => `${name}: auto demo resumed.`,
    autoDemoRunningLog: (name: string) => `${name}: auto demo is already running.`,
    autoDemoPreparingTitle: 'Preparing demo',
    autoDemoInitializingDescription: 'Initializing auto demo',
    autoDemoPreparingTarget: 'Auto demo setup',
    autoDemoPreparingProgress: 'After reset, the demo starts from power-on.',
    autoDemoPreparingNote: 'The system is resetting controls, view, and demo data. After that it starts from power on.',
    autoDemoInitializingToast: 'Initializing auto demo',
    autoDemoStartedLog: (name: string) => `${name}: auto demo started.`,
    autoDemoPausedHint: 'Auto demo paused',
    autoDemoPausedLog: (name: string) => `${name}: auto demo paused.`,
    autoDemoTerminatedHint: 'Auto demo stopped',
    autoDemoTerminatedTitle: 'Demo stopped',
    autoDemoTerminatedDescription: 'Auto demo has stopped. Current curves and readings are retained.',
    autoDemoTerminatedTarget: 'Auto demo flow',
    autoDemoTerminatedProgress: 'The demo is stopped. Choose a mode to continue.',
    autoDemoTerminatedNote: 'User interaction is restored. You can restart or enter guide / free mode.',
    autoDemoTerminatedToast: 'Demo stopped',
    autoDemoTerminatedLog: (name: string) => `${name}: auto demo stopped.`,
    safetyLimit: 'Safety limit',
    safetyActive: 'Active',
    pressureAlarmTitle: 'Alarm',
    pressureWarningFallback: 'Pressure exceeds the safety threshold. The stopper may be forced open. Stop pumping immediately.',
    pressureWarningObserve: 'Focus mode has exited. Stop pumping immediately.',
    operationLocked: 'Operation locked',
    phaseLabels: {
      powerOff: 'Power off',
      readyToZero: 'Waiting to zero',
      zeroed: 'Zeroed',
      readyToPump: 'Ready to pump',
      pumping: 'Pumping',
      sealedStabilizing: 'Sealed stabilization',
      releasing: 'Quick release',
      recovering: 'Thermal recovery',
      fallback: 'Experiment ready',
    },
    stopcock: { open: 'Open', closed: 'Closed' },
    safety: {
      danger: 'Danger',
      warning: 'Approaching threshold',
      normal: 'Safe',
      dangerNote: 'Stop pumping',
      warningNote: 'Prepare to stop',
      normalNote: 'Continue observing',
    },
    zeroStatus: {
      completed: 'Complete',
      adjustable: 'Adjustable',
      notReady: 'Not ready',
    },
    hints: {
      powerOff: 'Turn on the power first.',
      readyToZero: 'Observe Uₚ and zero the pressure signal.',
      readyToPump: 'Close the glass stopcock and prepare to pump.',
      pumping: 'Pump continuously until Uₚ ≥ 120 mV, then stop pressurizing.',
      sealedStabilizing: 'In the real procedure, wait sealed for 5 min, then record U₁.',
      releasing: 'Close the glass stopcock and wait for thermal recovery.',
      recovering: 'After closing the stopcock, wait 5 min and record U₂ after recovery.',
      fallback: 'Observe live readings.',
    },
    readings: {
      temperature: 'Temperature signal',
      pressure: 'Pressure-difference voltage',
      delta: 'Converted from current Uₚ',
      safety: 'Pressure status',
      pumpValve: 'Pump valve',
      stopcock: 'Glass stopcock',
      zero: 'Pressure zero',
      currentHint: 'Current hint',
      opened: 'Open',
      closed: 'Closed',
    },
  },
} as const;

const getHeatCapacityRealtimeCopy = (language: WorkbenchLanguagePreference) => (
  heatCapacityRealtimeCopies[language] ?? heatCapacityRealtimeCopies['zh-CN']
);

type HeatCapacityRealtimeCopy = (typeof heatCapacityRealtimeCopies)[WorkbenchLanguagePreference];

const getLocalizedHeatCapacityGuideRecordFailure = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityGuideRecordKind,
  language: WorkbenchLanguagePreference,
  fallback: string,
) => {
  if (file.heatCapacityMode !== 'guide') return fallback;
  const messages = getHeatCapacityRealtimeCopy(language).guideRecordBlockedMessages;
  const step = file.heatCapacityGuideWorkflow.step;
  if (kind === 'u0') {
    if (step === 'powerRequired') return messages.u0NeedPower;
    if (step === 'openStopcockForZeroRequired') return messages.u0NeedStopcock;
    if (step === 'zeroRequired') return messages.u0NeedZero;
    return messages.u0NeedCurrentStep;
  }
  if (kind === 'u1') {
    if (step === 'closePumpValveRequired') return messages.u1NeedClosePumpValve;
    if (step === 'u1Waiting') return messages.u1NeedWait;
    if (step === 'closeStopcockBeforePumpRequired' || step === 'openPumpValveRequired' || step === 'pumpRequired') {
      return messages.u1NeedPump;
    }
    return messages.u1NeedCurrentStep;
  }
  if (step === 'closeStopcockAfterReleaseRequired') return messages.u2NeedCloseStopcock;
  if (step === 'u2Waiting') return messages.u2NeedWait;
  if (step === 'openStopcockForReleaseRequired') return messages.u2NeedRelease;
  return messages.u2NeedCurrentStep;
};

const knownLocalizedConsoleMessageFactories: WorkbenchConsoleMessageFactory[] = [
  (language) => workbenchCopies[language].logs.initialized,
  (language) => workbenchCopies[language].logs.defaultLayout,
  (language) => workbenchCopies[language].logs.standardConnected,
  (language) => workbenchCopies[language].logs.exportBridgeRequired,
  (language) => workbenchCopies[language].logs.editHistoryCleared,
  (language) => workbenchCopies[language].logs.layoutSaveNeedsFile,
  (language) => workbenchCopies[language].logs.fileNameCannotBeEmpty,
  ...(['checking', 'available-system', 'available-bundled', 'unavailable', 'error'] as const).map(
    (status): WorkbenchConsoleMessageFactory => (
      (language) => workbenchCopies[language].exportEnvironment[status].detail
    ),
  ),
  (language) => getHeatCapacityRealtimeCopy(language).recordU0SuccessToast,
  (language) => getHeatCapacityRealtimeCopy(language).recordU1SuccessToast,
  (language) => getHeatCapacityRealtimeCopy(language).recordU2SuccessToast,
  (language) => getHeatCapacityRealtimeCopy(language).finalTrialCompleteToast,
  (language) => getHeatCapacityRealtimeCopy(language).freeGroupCompleteToast,
  (language) => getHeatCapacityRealtimeCopy(language).freeRecordSuccessLog.u0,
  (language) => getHeatCapacityRealtimeCopy(language).freeRecordSuccessLog.u1,
  (language) => getHeatCapacityRealtimeCopy(language).freeRecordSuccessLog.u2,
];

const findKnownConsoleMessageTranslations = (message: string) => {
  for (const factory of knownLocalizedConsoleMessageFactories) {
    const messages = createWorkbenchConsoleMessageTranslations(factory);
    if (Object.values(messages).includes(message)) return messages;
  }
  return null;
};
type HeatCapacityPumpHintKey = keyof HeatCapacityRealtimeCopy['pumpHints'];

const HEAT_CAPACITY_REALTIME_STATE_HINT_FIELDS = [
  'autoDemoPreparingHint',
  'autoDemoReadyToCompleteHint',
  'autoDemoPausedHint',
  'autoDemoTerminatedHint',
] as const satisfies readonly (keyof HeatCapacityRealtimeCopy)[];

const getLocalizedHeatCapacityPumpHint = (
  value: string | null | undefined,
  language: WorkbenchLanguagePreference,
) => {
  if (!value) return '';
  const targetCopy = getHeatCapacityRealtimeCopy(language);
  const allCopies = Object.values(heatCapacityRealtimeCopies) as HeatCapacityRealtimeCopy[];
  for (const sourceCopy of allCopies) {
    for (const key of Object.keys(sourceCopy.pumpHints) as HeatCapacityPumpHintKey[]) {
      if (sourceCopy.pumpHints[key] === value) return targetCopy.pumpHints[key];
    }
    for (const key of HEAT_CAPACITY_REALTIME_STATE_HINT_FIELDS) {
      if (sourceCopy[key] === value) return targetCopy[key];
    }
  }
  return value;
};

const getHeatCapacityFreeRecordRejectMessage = (
  reason: HeatCapacityFreeRecordRejectReason,
  copy: ReturnType<typeof getHeatCapacityRealtimeCopy>,
) => copy.freeRecordRejectMessages[reason];

const hasDesktopExportBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabExporter)
);

const hasDesktopUpdaterBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabUpdater)
);

const hasDesktopWindowControlBridge = () => (
  typeof window !== 'undefined' &&
  Boolean(
    window.hardSphereLabWindow?.minimize &&
    window.hardSphereLabWindow?.toggleMaximize &&
    window.hardSphereLabWindow?.close,
  )
);

const hasDesktopLegalBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabLegal?.openLegalFile)
);

const hasDesktopLegalReadBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabLegal?.readLegalFile)
);

const getFreshWorkbenchWindowUrl = () => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('hslFreshWindow', '1');
  return url.toString();
};

const isExportEnvironmentAvailableStatus = (status: WorkbenchExportEnvironmentStatus) => (
  status === 'available-system' || status === 'available-bundled'
);

const getAboutEnvironmentStatusLabel = (
  status: WorkbenchExportEnvironmentStatus,
  copy: WorkbenchCopy,
) => {
  if (status === 'checking') return copy.about.checking;
  if (isExportEnvironmentAvailableStatus(status)) return copy.about.available;
  if (status === 'error') return copy.about.error;
  return copy.about.unavailable;
};

const getAboutEnvironmentResultBody = (
  status: WorkbenchExportEnvironmentStatus,
  copy: WorkbenchCopy,
) => {
  if (isExportEnvironmentAvailableStatus(status)) return copy.about.environmentResultAvailable;
  if (status === 'error') return copy.about.environmentResultError;
  return copy.about.environmentResultUnavailable;
};

const WORKBENCH_VALIDATION_ERROR_COPIES: Record<WorkbenchLanguagePreference, Record<string, string>> = {
  'zh-CN': {
    'N must be greater than 0.': 'N 必须大于 0。',
    'N must be a safe integer.': 'N 必须是安全整数。',
    'N must be 1000 or less.': 'N 必须小于或等于 1000。',
    'L must be greater than 0.': 'L 必须大于 0。',
    'r must be greater than 0.': 'r 必须大于 0。',
    'm must be greater than 0.': 'm 必须大于 0。',
    'k must be greater than 0.': 'k 必须大于 0。',
    'dt must be greater than 0.': 'dt 必须大于 0。',
    'dt must be 0.1 or less.': 'dt 必须小于或等于 0.1。',
    'nu must be 0 or greater.': 'nu 必须大于或等于 0。',
    'dt * nu must be 1 or less.': 'dt 与 nu 的乘积必须小于或等于 1。',
    'L must be greater than 2 * r.': 'L 必须大于 2r。',
    'Particle packing fraction must be 0.5 or less.': '粒子填充率必须小于或等于 0.5。',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime 必须大于或等于 0。',
    'statsDuration must be greater than 0.': 'statsDuration 必须大于 0。',
    'targetTemperature must be greater than 0.': 'targetTemperature 必须大于 0。',
  },
  'zh-TW': {
    'N must be greater than 0.': 'N 必須大於 0。',
    'N must be a safe integer.': 'N 必須是安全整數。',
    'N must be 1000 or less.': 'N 必須小於或等於 1000。',
    'L must be greater than 0.': 'L 必須大於 0。',
    'r must be greater than 0.': 'r 必須大於 0。',
    'm must be greater than 0.': 'm 必須大於 0。',
    'k must be greater than 0.': 'k 必須大於 0。',
    'dt must be greater than 0.': 'dt 必須大於 0。',
    'dt must be 0.1 or less.': 'dt 必須小於或等於 0.1。',
    'nu must be 0 or greater.': 'nu 必須大於或等於 0。',
    'dt * nu must be 1 or less.': 'dt 與 nu 的乘積必須小於或等於 1。',
    'L must be greater than 2 * r.': 'L 必須大於 2r。',
    'Particle packing fraction must be 0.5 or less.': '粒子填充率必須小於或等於 0.5。',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime 必須大於或等於 0。',
    'statsDuration must be greater than 0.': 'statsDuration 必須大於 0。',
    'targetTemperature must be greater than 0.': 'targetTemperature 必須大於 0。',
  },
  en: {
    'N must be greater than 0.': 'N must be greater than 0.',
    'N must be a safe integer.': 'N must be a safe integer.',
    'N must be 1000 or less.': 'N must be 1000 or less.',
    'L must be greater than 0.': 'L must be greater than 0.',
    'r must be greater than 0.': 'r must be greater than 0.',
    'm must be greater than 0.': 'm must be greater than 0.',
    'k must be greater than 0.': 'k must be greater than 0.',
    'dt must be greater than 0.': 'dt must be greater than 0.',
    'dt must be 0.1 or less.': 'dt must be 0.1 or less.',
    'nu must be 0 or greater.': 'nu must be 0 or greater.',
    'dt * nu must be 1 or less.': 'dt * nu must be 1 or less.',
    'L must be greater than 2 * r.': 'L must be greater than 2 * r.',
    'Particle packing fraction must be 0.5 or less.': 'Particle packing fraction must be 0.5 or less.',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime must be 0 or greater.',
    'statsDuration must be greater than 0.': 'statsDuration must be greater than 0.',
    'targetTemperature must be greater than 0.': 'targetTemperature must be greater than 0.',
  },
};

const getLocalizedWorkbenchValidationErrors = (
  errors: string[],
  language: WorkbenchLanguagePreference,
) => {
  const copy = WORKBENCH_VALIDATION_ERROR_COPIES[language] ?? WORKBENCH_VALIDATION_ERROR_COPIES['zh-CN'];
  return errors.map((error) => copy[error] ?? error);
};

const snapshotParticles = (engine: PhysicsEngine): Particle[] => (
  engine.particles.map((particle) => ({ ...particle }))
);

const formatMetric = (value: number, digits = 3) => {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(digits);
};

const formatMaybeMetric = (value: number | null | undefined, digits = 3) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const renderScientificText = (text: string): React.ReactNode => {
  const parts = text.split(/(Uₜ₁|Uₜ₂|Uₜ|Uₚ)/g);
  return parts.map((part, index) => {
    if (part === 'Uₜ₁') return <React.Fragment key={`${part}-${index}`}>U<sub>T1</sub></React.Fragment>;
    if (part === 'Uₜ₂') return <React.Fragment key={`${part}-${index}`}>U<sub>T2</sub></React.Fragment>;
    if (part === 'Uₜ') return <React.Fragment key={`${part}-${index}`}>U<sub>T</sub></React.Fragment>;
    if (part === 'Uₚ') return <React.Fragment key={`${part}-${index}`}>U<sub>p</sub></React.Fragment>;
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getCompactHistogramBins = (bins: HistogramBin[], maxBars = 36) => {
  if (bins.length <= maxBars) return bins;
  const stride = Math.ceil(bins.length / maxBars);
  const compactBins: HistogramBin[] = [];

  for (let index = 0; index < bins.length; index += stride) {
    const group = bins.slice(index, index + stride);
    const count = group.reduce((sum, bin) => sum + bin.count, 0);
    const probability = group.reduce((sum, bin) => sum + bin.probability, 0) / group.length;
    const theoretical = group.reduce((sum, bin) => sum + (bin.theoretical ?? 0), 0) / group.length;
    compactBins.push({
      binStart: group[0].binStart,
      binEnd: group[group.length - 1].binEnd,
      count,
      probability,
      theoretical,
    });
  }

  return compactBins;
};

const FINAL_CHART_VIEWBOX_WIDTH = 100;
const FINAL_CHART_VIEWBOX_HEIGHT = 64;
const FINAL_CHART_LEFT = 10;
const FINAL_CHART_RIGHT = 94;
const FINAL_CHART_TOP = 8;
const FINAL_CHART_BOTTOM = 54;
const FINAL_CHART_PLOT_WIDTH = FINAL_CHART_RIGHT - FINAL_CHART_LEFT;
const FINAL_CHART_PLOT_HEIGHT = FINAL_CHART_BOTTOM - FINAL_CHART_TOP;
type FinalChartLegendPosition = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
type FinalChartLegendItem = {
  kind: 'bar' | 'line' | 'point' | 'boundary';
  label: string;
  className?: string;
};

const getIdealExperimentLanguageCode = (
  language: WorkbenchLanguagePreference,
): IdealExperimentLanguageCode => (
  language === 'en' ? 'en-GB' : language
);

const getChangedIdealParamKeys = (
  previousParams: SimulationParams,
  nextParams: SimulationParams,
): ExperimentParamKey[] => (
  WORKBENCH_TRACKED_PARAMETER_KEYS.filter((key) => {
    const previousValue = previousParams[key as keyof SimulationParams];
    const nextValue = nextParams[key as keyof SimulationParams];
    return previousValue !== nextValue;
  })
);

const getIdealVerificationState = (
  analysis: IdealGasAnalysis,
): WorkbenchIdealState['verificationState'] => {
  if (analysis.isVerified) return 'verified';
  if (analysis.verdictState === 'insufficient') return 'collecting';
  return analysis.sortedPoints.length === 0 ? 'not-started' : 'failed';
};

const createStandardPanels = (copy: WorkbenchCopy): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.realtimeTitle, hint: copy.panels.standardRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'results', title: copy.panels.standardResultsTitle, hint: copy.panels.standardResultsHint, icon: <Gauge size={13} /> },
];

const createIdealPanels = (copy: WorkbenchCopy): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.realtimeTitle, hint: copy.panels.idealRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'results', title: copy.panels.idealResultsTitle, hint: copy.panels.idealResultsHint, icon: <Gauge size={13} /> },
  { key: 'experimentPoints', title: copy.panels.pointsTitle, hint: copy.panels.pointsHint, icon: <Table2 size={13} /> },
  { key: 'verification', title: copy.panels.verificationTitle, hint: copy.panels.verificationHint, icon: <BarChart3 size={13} /> },
];

const createHeatCapacityPanels = (
  copy: WorkbenchCopy,
  heatCopy: ReturnType<typeof getHeatCapacityRealtimeCopy>,
): PanelDefinition[] => [
  { key: 'preview', title: copy.panels.previewTitle, hint: copy.panels.previewHint, icon: <Gauge size={13} />, defaultVisible: true },
  { key: 'realtime', title: copy.panels.heatRealtimeTitle, hint: copy.panels.heatRealtimeHint, icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'heatCapacityGuide', title: heatCopy.guideTitle, hint: heatCopy.guideHint, icon: <BookOpen size={13} /> },
  { key: 'heatCapacityRecords', title: heatCopy.recordsTitle, hint: heatCopy.recordsHint, icon: <Table2 size={13} /> },
  { key: 'heatCapacityReview', title: heatCopy.reviewTitle, hint: heatCopy.reviewHint, icon: <PanelTopOpen size={13} /> },
];

const createResultsSections = (copy: WorkbenchCopy): Array<{ key: ResultsSectionKey; title: string; icon: React.ReactNode }> => [
  { key: 'summary', title: copy.panels.summaryTitle, icon: <Gauge size={12} /> },
  { key: 'dataTable', title: copy.panels.dataTableTitle, icon: <Table2 size={12} /> },
  { key: 'figures', title: copy.panels.figuresTitle, icon: <BarChart3 size={12} /> },
];

const getLocalizedWorkbenchPanelTitle = (
  title: string,
  language: WorkbenchLanguagePreference,
) => {
  const getPanelGroups = (nextLanguage: WorkbenchLanguagePreference) => [
    createStandardPanels(workbenchCopies[nextLanguage]),
    createIdealPanels(workbenchCopies[nextLanguage]),
    createHeatCapacityPanels(workbenchCopies[nextLanguage], getHeatCapacityRealtimeCopy(nextLanguage)),
  ];
  for (const sourceLanguage of Object.keys(workbenchCopies) as WorkbenchLanguagePreference[]) {
    const sourceGroups = getPanelGroups(sourceLanguage);
    for (let groupIndex = 0; groupIndex < sourceGroups.length; groupIndex += 1) {
      const sourcePanel = sourceGroups[groupIndex].find((panel) => panel.title === title);
      if (!sourcePanel) continue;
      return getPanelGroups(language)[groupIndex]
        .find((panel) => panel.key === sourcePanel.key)?.title ?? title;
    }
  }
  return title;
};

const getLocalizedWorkbenchTabTitle = (
  title: string,
  language: WorkbenchLanguagePreference,
) => {
  const getTabGroups = (nextLanguage: WorkbenchLanguagePreference) => [
    createResultsSections(workbenchCopies[nextLanguage]),
    createIdealPanels(workbenchCopies[nextLanguage]).filter((panel) => isIdealResultWindowKey(panel.key)),
    createHeatCapacityPanels(workbenchCopies[nextLanguage], getHeatCapacityRealtimeCopy(nextLanguage)),
  ];
  for (const sourceLanguage of Object.keys(workbenchCopies) as WorkbenchLanguagePreference[]) {
    const sourceGroups = getTabGroups(sourceLanguage);
    for (let groupIndex = 0; groupIndex < sourceGroups.length; groupIndex += 1) {
      const sourceTab = sourceGroups[groupIndex].find((tab) => tab.title === title || tab.key === title);
      if (!sourceTab) continue;
      return getTabGroups(language)[groupIndex]
        .find((tab) => tab.key === sourceTab.key)?.title ?? title;
    }
  }
  return getLocalizedWorkbenchPanelTitle(title, language);
};

const getLocalizedWorkbenchEditLabel = (
  label: string,
  language: WorkbenchLanguagePreference,
) => {
  const exactCopies: Record<WorkbenchLanguagePreference, Record<string, string>> = {
    'zh-CN': {
      'reset heat-capacity free run': '重置热容比自由模式运行',
      'saved heat capacity parameters': '保存热容比参数',
      'applied heat capacity parameters': '应用热容比参数',
      'saved parameters': '保存参数',
      'saved and applied ideal parameters': '保存并应用理想气体参数',
      'applied ideal parameters': '应用理想气体参数',
      'saved and applied parameters': '保存并应用参数',
      'applied parameters': '应用参数',
      'opened ideal Results window': '打开理想气体结果窗口',
      'closed ideal Results window': '关闭理想气体结果窗口',
      'opened Results panel': '打开结果面板',
      'opened heat-capacity materials tabs': '打开热容比实验资料标签页',
      'changed ideal relation': '更改理想气体关系',
      'changed ideal scan variable': '更改理想气体扫描变量',
      'removed ideal experiment point': '移除理想气体实验点',
      'cleared ideal relation points': '清空理想气体关系点',
      'renamed file': '重命名文件',
      'closed file': '关闭文件',
      'reopened file': '重新打开文件',
      'deleted file': '删除文件',
      'reset layout': '重置布局',
    },
    'zh-TW': {
      'reset heat-capacity free run': '重設熱容比自由模式執行',
      'saved heat capacity parameters': '儲存熱容比參數',
      'applied heat capacity parameters': '套用熱容比參數',
      'saved parameters': '儲存參數',
      'saved and applied ideal parameters': '儲存並套用理想氣體參數',
      'applied ideal parameters': '套用理想氣體參數',
      'saved and applied parameters': '儲存並套用參數',
      'applied parameters': '套用參數',
      'opened ideal Results window': '開啟理想氣體結果視窗',
      'closed ideal Results window': '關閉理想氣體結果視窗',
      'opened Results panel': '開啟結果面板',
      'opened heat-capacity materials tabs': '開啟熱容比實驗資料分頁',
      'changed ideal relation': '變更理想氣體關係',
      'changed ideal scan variable': '變更理想氣體掃描變量',
      'removed ideal experiment point': '移除理想氣體實驗點',
      'cleared ideal relation points': '清空理想氣體關係點',
      'renamed file': '重新命名檔案',
      'closed file': '關閉檔案',
      'reopened file': '重新開啟檔案',
      'deleted file': '刪除檔案',
      'reset layout': '重設版面',
    },
    en: {},
  };
  const exactCopy = exactCopies[language][label];
  if (exactCopy) return exactCopy;

  const createdFileMatch = /^created (standard|ideal|heatCapacity|heatCapacityPistonOscillation) file$/.exec(label);
  if (createdFileMatch) {
    const kind = createdFileMatch[1] as WorkbenchFileKind;
    if (language === 'zh-CN') {
      const kindLabel = kind === 'standard' ? '标准模拟' : kind === 'ideal' ? '理想气体' : '热容比实验';
      return `创建${kindLabel}文件`;
    }
    if (language === 'zh-TW') {
      const kindLabel = kind === 'standard' ? '標準模擬' : kind === 'ideal' ? '理想氣體' : '熱容比實驗';
      return `建立${kindLabel}檔案`;
    }
  }

  const removedRecordMatch = /^removed heat-capacity (u0|u1|u2|trial) record$/.exec(label);
  if (removedRecordMatch && language !== 'en') {
    const recordLabel = removedRecordMatch[1] === 'trial'
      ? language === 'zh-CN' ? '整组' : '整組'
      : removedRecordMatch[1].toUpperCase();
    return language === 'zh-CN'
      ? `删除热容比 ${recordLabel} 记录`
      : `刪除熱容比 ${recordLabel} 記錄`;
  }

  const localizedContainerLabel = (
    pattern: RegExp,
    container: 'tab' | 'heat-capacity tab' | 'panel',
  ) => {
    const match = pattern.exec(label);
    if (!match || language === 'en') return null;
    const action = match[1] === 'opened'
      ? language === 'zh-CN' ? '打开' : '開啟'
      : language === 'zh-CN' ? '关闭' : '關閉';
    const title = container === 'panel'
      ? getLocalizedWorkbenchPanelTitle(match[2], language)
      : getLocalizedWorkbenchTabTitle(match[2], language);
    if (container === 'panel') return `${action}${title}面板`;
    if (container === 'heat-capacity tab') {
      return language === 'zh-CN' ? `${action}${title}热容比标签页` : `${action}${title}熱容比分頁`;
    }
    return language === 'zh-CN' ? `${action}${title}标签页` : `${action}${title}分頁`;
  };
  const containerCopy = localizedContainerLabel(/^(opened|closed) (.+) heat-capacity tab$/, 'heat-capacity tab')
    ?? localizedContainerLabel(/^(opened|closed) (.+) panel$/, 'panel')
    ?? localizedContainerLabel(/^(opened|closed) (.+) tab$/, 'tab');
  if (containerCopy) return containerCopy;

  if (language === 'zh-CN') return '工作台操作';
  if (language === 'zh-TW') return '工作台操作';
  return label;
};

const pickNextOpenTab = <T extends string>(tabs: T[], closingTab: T) => {
  const closingIndex = tabs.indexOf(closingTab);
  if (closingIndex < 0) return tabs[0] ?? null;
  return tabs[closingIndex + 1] ?? tabs[closingIndex - 1] ?? null;
};

const formatTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const createConsoleLog = (
  id: number,
  kind: LogKind,
  input: WorkbenchConsoleMessageInput,
  language: WorkbenchLanguagePreference,
): ConsoleLog => ({
  id,
  time: formatTime(),
  kind,
  ...materializeWorkbenchConsoleMessage(input, language),
});

const createInitialLogs = (language: WorkbenchLanguagePreference): ConsoleLog[] => [
  createConsoleLog(1, 'info', (nextLanguage) => workbenchCopies[nextLanguage].logs.initialized, language),
  createConsoleLog(2, 'success', (nextLanguage) => workbenchCopies[nextLanguage].logs.defaultLayout, language),
  createConsoleLog(3, 'success', (nextLanguage) => workbenchCopies[nextLanguage].logs.standardConnected, language),
  createConsoleLog(4, 'warning', (nextLanguage) => workbenchCopies[nextLanguage].logs.exportBridgeRequired, language),
];

const getWorkbenchParameterDisplayLabel = (
  param: WorkbenchParameterRow,
  copy: WorkbenchCopy,
) => copy.parameters.parameterLabels[param.key] ?? (param.unit ? `${param.label} (${param.unit})` : param.label);

const getWorkbenchParameterDisplayUnit = (
  param: WorkbenchParameterRow,
  language: WorkbenchLanguagePreference,
) => {
  if (!param.unit) return '';
  if (param.key === 'N' && param.unit === 'particles') {
    if (language === 'zh-CN') return '个';
    if (language === 'zh-TW') return '個';
  }
  return param.unit;
};

const getWorkbenchParameterDetail = (param: WorkbenchParameterRow) => (
  WORKBENCH_PARAMETER_DETAILS[param.key]
);

const getLocalizedStatusValue = (value: string | undefined, copy: WorkbenchCopy) => (
  value ? copy.status.verdictStates[value] ?? copy.status.runStates[value as WorkbenchFileState['runState']] ?? value : copy.status.none
);

const isEditableElement = (element: EventTarget | Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    element.isContentEditable
  );
};

const WorkbenchStudioPrototype: React.FC = () => {
  const { settings: audioSettings, updateSettings: updateAudioSettings } = useAudioEngine();
  const [initialSession] = useState(() => loadWorkbenchSession());
  const [loadedHeatCapacityRefreshSession] = useState(() => loadWorkbenchHeatCapacityRefreshSession());
  const initialHeatCapacityRefreshSession = useMemo(() => {
    if (!loadedHeatCapacityRefreshSession) return null;
    if (initialSession.activeFileId !== loadedHeatCapacityRefreshSession.activeHeatCapacityFileId) return null;
    const heatCapacityFile = initialSession.files.find((file) => (
      file.id === loadedHeatCapacityRefreshSession.activeHeatCapacityFileId
    ));
    if (
      !heatCapacityFile ||
      heatCapacityFile.kind !== 'heatCapacity' ||
      heatCapacityFile.heatCapacityMode !== loadedHeatCapacityRefreshSession.mode
    ) {
      return null;
    }
    return loadedHeatCapacityRefreshSession;
  }, [initialSession, loadedHeatCapacityRefreshSession]);
  const initialHeatCapacityRefreshWindows = initialHeatCapacityRefreshSession?.ui.windows ?? {};
  const initialHeatCapacityRefreshDrafts = initialHeatCapacityRefreshSession?.ui.drafts ?? {};
  const initialHeatCapacityRefreshLayout = initialHeatCapacityRefreshSession?.ui.layout ?? {};
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
        priority: initialHeatCapacityRefreshSession.guide.toastQueue.current.priority,
        source: initialHeatCapacityRefreshSession.guide.toastQueue.current.source,
        createdAt: initialHeatCapacityRefreshSession.guide.toastQueue.current.createdAtMs,
      } satisfies HeatCapacityToastMessage
    : null;
  const initialHeatCapacityRefreshPendingToast = initialHeatCapacityRefreshSession?.guide.toastQueue.pending[0]
    ? {
        id: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].id,
        text: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].text,
        level: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].level,
        priority: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].priority,
        source: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].source,
        createdAt: initialHeatCapacityRefreshSession.guide.toastQueue.pending[0].createdAtMs,
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
  const [files, setFiles] = useState<WorkbenchFileState[]>(() => {
    const defaults = loadWorkbenchLayoutDefaults();
    return initialSession.files.map((file) => {
      if (file.kind === 'ideal') {
        return {
          ...file,
          liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
          idealWindowLayout: normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults.ideal),
        };
      }
      if (file.kind === 'heatCapacity') {
        const heatCapacityTabOrder = getHeatCapacityMaterialsTabOrder(file);
        const openHeatCapacityTabs = file.openHeatCapacityTabs.filter((tab) => (
          tab !== 'records' && heatCapacityTabOrder.includes(tab)
        ));
        const activeHeatCapacityTabId = file.activeHeatCapacityTabId && openHeatCapacityTabs.includes(file.activeHeatCapacityTabId)
          ? file.activeHeatCapacityTabId
          : openHeatCapacityTabs[0] ?? null;
        const normalizedFile: WorkbenchHeatCapacityState = {
          ...file,
          name: normalizeHeatCapacityFileName(file.name),
          visiblePanels: ['preview', 'realtime', ...openHeatCapacityTabs.map(heatCapacityTabIdToPanelKey)] as WorkbenchPanelKey[],
          openHeatCapacityTabs,
          activeHeatCapacityTabId,
          heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded !== false,
          heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight || 0.5,
          liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio ?? defaults.heatCapacity.liveWorkspaceSplitRatio),
        };
        if (file.id !== initialHeatCapacityRefreshSession?.activeHeatCapacityFileId) return normalizedFile;
        const restoredRunState = getHeatCapacityRefreshRunState(
          initialHeatCapacityRefreshLayout.runState,
          initialHeatCapacityRefreshSession.mode === 'demo'
            ? initialHeatCapacityRefreshSession.demo.phase === 'running'
              ? 'running'
              : initialHeatCapacityRefreshSession.demo.phase === 'paused'
                ? 'paused'
                : normalizedFile.runState
            : normalizedFile.runState,
        );
        return {
          ...normalizedFile,
          runState: restoredRunState,
        };
      }
      if (file.kind === 'heatCapacityPistonOscillation') {
        return {
          ...file,
          runState: 'idle' as const,
          liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
            file.liveWorkspaceSplitRatio ??
              defaults.heatCapacityPistonOscillation.liveWorkspaceSplitRatio,
          ),
        };
      }
      return {
        ...file,
        liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
        standardResultsLayout: normalizeStandardResultsLayout(file.standardResultsLayout, defaults.standard),
      };
    });
  });
  const [closedFiles, setClosedFiles] = useState<WorkbenchFileState[]>(() => loadClosedWorkbenchFiles());
  const initialGeneralSettings = useMemo(() => loadWorkbenchGeneralSettings(), []);
  const [activeFileId, setActiveFileId] = useState(initialSession.activeFileId);
  const [selectedFileId, setSelectedFileId] = useState(() => {
    const restoredSelectedFileId = getHeatCapacityRefreshString(initialHeatCapacityRefreshLayout, 'selectedFileId');
    return restoredSelectedFileId && initialSession.files.some((file) => file.id === restoredSelectedFileId)
      ? restoredSelectedFileId
      : initialSession.activeFileId;
  });
  const [selectedPanel, setSelectedPanel] = useState<WorkbenchPanelKey>(initialSession.selectedPanel);
  const [workspacePersistenceStatus, setWorkspacePersistenceStatus] = useState<WorkbenchPersistenceStatus>({
    state: 'idle',
    savedAtMs: null,
  });
  const workspacePersistenceSchedulerRef = useRef<WorkbenchPersistenceScheduler<
    WorkbenchWorkspacePersistenceSnapshot
  > | null>(null);
  useEffect(() => {
    const scheduler = createWorkbenchPersistenceScheduler<WorkbenchWorkspacePersistenceSnapshot>({
      save: saveWorkbenchWorkspaceToIndexedDb,
      onStatus: setWorkspacePersistenceStatus,
    });
    workspacePersistenceSchedulerRef.current = scheduler;
    return () => {
      if (workspacePersistenceSchedulerRef.current === scheduler) {
        workspacePersistenceSchedulerRef.current = null;
      }
      scheduler.dispose();
    };
  }, []);
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
    return normalizedLogs.length > 0 ? normalizedLogs : createInitialLogs(initialGeneralSettings.language);
  });
  const [exportEnvironmentStatus, setExportEnvironmentStatus] = useState<WorkbenchExportEnvironmentStatus>(() => (
    hasDesktopExportBridge() ? 'checking' : 'unavailable'
  ));
  const [exportInProgress, setExportInProgress] = useState(false);
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
  const [settingsGeneralOpen, setSettingsGeneralOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'settingsGeneralOpen')
  ));
  const [aboutWindowOpen, setAboutWindowOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'aboutWindowOpen')
  ));
  const [buildNoticeWindowOpen, setBuildNoticeWindowOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'buildNoticeWindowOpen')
  ));
  const [buildNoticeNavOpen, setBuildNoticeNavOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'buildNoticeNavOpen')
  ));
  const [activeBuildNoticeMaterialId, setActiveBuildNoticeMaterialId] = useState<WorkbenchLegalMaterialId | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'activeBuildNoticeMaterialId') as WorkbenchLegalMaterialId | null
  ));
  const [buildNoticeFilePreview, setBuildNoticeFilePreview] = useState<WorkbenchBuildNoticeFilePreview | null>(() => (
    getHeatCapacityRefreshObject(initialHeatCapacityRefreshWindows, 'buildNoticeFilePreview') as unknown as WorkbenchBuildNoticeFilePreview | null
  ));
  const [buildNoticeOpenError, setBuildNoticeOpenError] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'buildNoticeOpenError')
  ));
  const [aboutResultNotice, setAboutResultNotice] = useState<{ title: string; body: string } | null>(() => (
    getHeatCapacityRefreshObject(initialHeatCapacityRefreshWindows, 'aboutResultNotice') as { title: string; body: string } | null
  ));
  const [updaterState, setUpdaterState] = useState<WorkbenchUpdateState>(() => ({
    status: hasDesktopUpdaterBridge() ? 'idle' : 'unsupported',
    currentVersion: WORKBENCH_APP_VERSION,
    latestVersion: null,
    releaseName: null,
    releaseDate: null,
    releaseNotes: null,
    releaseSummary: null,
    releaseSections: null,
    releasePageUrl: null,
    manualDownloadUrl: null,
    downloadAttempt: null,
    maxDownloadAttempts: null,
    retrying: false,
    errorKind: null,
    percent: null,
    message: '',
  }));
  const [updateDialogOpen, setUpdateDialogOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'updateDialogOpen')
  ));
  const aboutUpdateChecking = updaterState.status === 'checking';
  const updateDialogState = updateDialogOpen ? updaterState : null;
  const [desktopWindowMaximized, setDesktopWindowMaximized] = useState(false);
  const [settingsThemePreference, setSettingsThemePreference] = useState<WorkbenchThemePreference>(() => initialGeneralSettings.theme);
  const [systemWorkbenchTheme, setSystemWorkbenchTheme] = useState<WorkbenchResolvedTheme>(() => getSystemWorkbenchTheme());
  const [settingsLanguagePreference, setSettingsLanguagePreference] = useState<WorkbenchLanguagePreference>(() => initialGeneralSettings.language);
  const [settingsPerformanceMode, setSettingsPerformanceMode] = useState<WorkbenchPerformanceMode>(() => initialGeneralSettings.performanceMode);
  const [settingsLanguageMenuOpen, setSettingsLanguageMenuOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'settingsLanguageMenuOpen')
  ));
  const settingsLanguageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const workbenchCopy = workbenchCopies[settingsLanguagePreference];
  const windowControlCopy = WORKBENCH_WINDOW_CONTROL_COPY[settingsLanguagePreference];
  const desktopWindowControlsAvailable = hasDesktopWindowControlBridge();
  const heatCapacityQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES[settingsPerformanceMode];
  useEffect(() => {
    document.documentElement.lang = settingsLanguagePreference;
    document.title = getWorkbenchAppBrandName(settingsLanguagePreference);
  }, [settingsLanguagePreference]);
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
  const [leftCollapsed, setLeftCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'leftCollapsed')
  ));
  const [parametersCollapsed, setParametersCollapsed] = useState(() => (
    typeof initialHeatCapacityRefreshLayout.parametersCollapsed === 'boolean'
      ? initialHeatCapacityRefreshLayout.parametersCollapsed
      : shouldCollapseWorkbenchParameterSidebar(
          initialSession.files.find((file) => file.id === initialSession.activeFileId),
        )
  ));
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
  const issuedWorkbenchFileIdsRef = useRef(new Set(
    [
      ...files.map((file) => file.id),
      ...closedFiles.map((file) => file.id),
    ],
  ));
  const activeFileIdRef = useRef(initialSession.activeFileId);
  const selectedPanelRef = useRef<WorkbenchPanelKey>(initialSession.selectedPanel);
  const scheduleWorkspacePersistenceRef = useRef<() => void>(() => undefined);
  const flushWorkspacePersistenceRef = useRef<(
    activeModeCheckpointOverride?: WorkbenchActiveModeCheckpointOverride,
  ) => Promise<boolean>>(async () => false);
  const persistWorkspaceLifecycleCheckpointRef = useRef<(forceFresh?: boolean) => Promise<boolean>>(async () => false);
  const desktopExitQuiescedRef = useRef(false);
  const prepareDesktopExitQuiescenceRef = useRef<() => void>(() => undefined);
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
  const buildNoticeReturnScrollTopRef = useRef(0);
  const buildNoticeRestoreScrollOnReturnRef = useRef(false);
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
  const aboutResultNoticeTimerRef = useRef<number | null>(null);
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
    'reset-guide' | 'reset-free' | null
  >(null);
  const [heatCapacityReviewSelectionByFileId, setHeatCapacityReviewSelectionByFileId] = useState<Record<string, {
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

  useLayoutEffect(() => {
    const container = document.querySelector<HTMLDivElement>('.studio-build-notice-body');
    if (!container) return;

    if (activeBuildNoticeMaterialId) {
      container.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (buildNoticeRestoreScrollOnReturnRef.current) {
      const restoredScrollTop = buildNoticeReturnScrollTopRef.current;
      buildNoticeRestoreScrollOnReturnRef.current = false;
      container.scrollTo({ top: restoredScrollTop, behavior: 'auto' });
    }
  }, [activeBuildNoticeMaterialId]);

  useEffect(() => {
    if (!activeBuildNoticeMaterialId) {
      setBuildNoticeFilePreview(null);
      return;
    }

    const fileConfig = buildNoticeLegalMaterialFiles[activeBuildNoticeMaterialId];
    const previewKind = fileConfig.previewKind;
    if (!previewKind || fileConfig.largeFile || !fileConfig.previewPath) {
      setBuildNoticeFilePreview(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      if (hasDesktopLegalReadBridge()) {
        const result = await window.hardSphereLabLegal!.readLegalFile(activeBuildNoticeMaterialId);
        if (!cancelled && result.status === 'ok' && typeof result.content === 'string') {
          setBuildNoticeFilePreview({ id: activeBuildNoticeMaterialId, kind: previewKind, content: result.content });
        } else if (!cancelled) {
          setBuildNoticeFilePreview(null);
        }
        return;
      }

      const response = await fetch(fileConfig.previewPath!);
      if (!response.ok) throw new Error(response.statusText);
      const content = await response.text();
      if (!cancelled) {
        setBuildNoticeFilePreview({ id: activeBuildNoticeMaterialId, kind: previewKind, content });
      }
    };

    loadPreview().catch(() => {
      if (!cancelled) setBuildNoticeFilePreview(null);
    });

    return () => {
      cancelled = true;
    };
  }, [activeBuildNoticeMaterialId]);

  const emptyWorkbenchFile = useMemo(() => createDefaultStandardFile(0), []);
  const isWorkbenchEmpty = files.length === 0;
  const activeFile = files.find((file) => file.id === activeFileId) ?? emptyWorkbenchFile;
  const activeHeatCapacityFreeBatchProgress = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free'
    ? getHeatCapacityFreeBatchProgress(activeFile)
    : null;
  const activeHeatCapacityCalculationSession = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityCalculationSession(activeFile)
    : null;
  const heatCapacityBatchSetupOpen = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
    activeHeatCapacityFreeBatchProgress?.configured === false &&
    activeFile.heatCapacityFreeTrials.length === 0 &&
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
    setHeatCapacityBatchSetupSelection(
      activeHeatCapacityFreeBatchProgress?.targetGroupCount ?? null,
    );
  }, [
    activeFile.id,
    activeFile.kind === 'heatCapacity'
      ? activeFile.heatCapacityFreeParameterScheme
      : null,
    activeHeatCapacityFreeBatchProgress?.targetGroupCount,
  ]);
  useEffect(() => {
    setHeatCapacityCalculationReviewOpen(false);
  }, [
    activeFile.id,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
  ]);
  const effectiveParametersCollapsed = (
    parametersCollapsed ||
    activeFile.kind === 'heatCapacityPistonOscillation'
  );
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
    activeFile.heatCapacityFreeParameterScheme === 'ideal';
  const activeHeatCapacityFreeSchemeLocked = activeFile.kind === 'heatCapacity' &&
    activeFile.heatCapacityMode === 'free' &&
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
  const pistonOscillationCopy = getPistonOscillationShellCopy(settingsLanguagePreference);
  const heatCapacityPanels = useMemo(
    () => createHeatCapacityPanels(workbenchCopy, heatCapacityRealtimeCopy),
    [heatCapacityRealtimeCopy, workbenchCopy],
  );
  const pistonOscillationPanels = useMemo(
    () => createHeatCapacityPanels(workbenchCopy, heatCapacityRealtimeCopy),
    [heatCapacityRealtimeCopy, workbenchCopy],
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
    ? true
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

  const animateCurrentParametersScroll = (
    targetTop: number,
    onComplete?: () => void,
    duration = IDEAL_ADVANCED_SCROLL_DURATION_MS,
  ) => {
    const container = currentParametersBodyRef.current;

    if (!container) {
      onComplete?.();
      return;
    }

    if (idealAdvancedScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(idealAdvancedScrollFrameRef.current);
    }

    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    const startTime = window.performance.now();
    const easeInOut = (value: number) => (
      value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2
    );

    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      container.scrollTop = startTop + distance * easeInOut(progress);

      if (progress < 1) {
        idealAdvancedScrollFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      idealAdvancedScrollFrameRef.current = null;
      container.scrollTop = targetTop;
      onComplete?.();
    };

    idealAdvancedScrollFrameRef.current = window.requestAnimationFrame(step);
  };

  const toggleIdealAdvancedSettings = () => {
    setIdealAdvancedSettingsOpen((current) => {
      if (!current) {
        idealAdvancedSettingsPreviousScrollTopRef.current = currentParametersBodyRef.current?.scrollTop ?? 0;
        setIdealAdvancedSettingsBodyVisible(true);
      }
      return !current;
    });
  };

  const closeGeneralSettings = () => {
    setSettingsGeneralOpen(false);
    setSettingsLanguageMenuOpen(false);
  };

  const openGeneralSettings = () => {
    setOpenTopMenu(null);
    setAboutWindowOpen(false);
    setSettingsLanguageMenuOpen(false);
    setSettingsGeneralOpen(true);
  };

  const showAboutResultNotice = (title: string, body: string) => {
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
    }
    setAboutResultNotice({ title, body });
    aboutResultNoticeTimerRef.current = window.setTimeout(() => {
      setAboutResultNotice(null);
      aboutResultNoticeTimerRef.current = null;
    }, 1800);
  };

  const closeAboutWindow = () => {
    setAboutWindowOpen(false);
    setBuildNoticeWindowOpen(false);
    resetBuildNoticeTransientState();
    setAboutResultNotice(null);
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
      aboutResultNoticeTimerRef.current = null;
    }
  };

  const openAboutWindow = () => {
    setOpenTopMenu(null);
    setSettingsGeneralOpen(false);
    setSettingsLanguageMenuOpen(false);
    setBuildNoticeWindowOpen(false);
    resetBuildNoticeTransientState();
    setAboutWindowOpen(true);
  };

  const resetBuildNoticeTransientState = () => {
    setBuildNoticeNavOpen(false);
    setActiveBuildNoticeMaterialId(null);
    setBuildNoticeFilePreview(null);
    setBuildNoticeOpenError(null);
    buildNoticeReturnScrollTopRef.current = 0;
    buildNoticeRestoreScrollOnReturnRef.current = false;
  };

  const openBuildNoticeWindow = () => {
    setBuildNoticeWindowOpen(true);
    resetBuildNoticeTransientState();
  };

  const closeBuildNoticeWindow = () => {
    setBuildNoticeWindowOpen(false);
    resetBuildNoticeTransientState();
  };

  const jumpToBuildNoticeSection = (sectionId: string) => {
    setActiveBuildNoticeMaterialId(null);
    setBuildNoticeOpenError(null);
    setBuildNoticeNavOpen(false);
    window.setTimeout(() => {
      const container = document.querySelector<HTMLDivElement>('.studio-build-notice-body');
      const target = document.getElementById(`studio-build-notice-section-${sectionId}`);
      if (!container || !target) return;

      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const nextScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, container.scrollTop + targetTop - containerTop - scrollMarginTop),
      );
      container.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
    }, 90);
  };

  const openBuildNoticeMaterial = (materialId: WorkbenchLegalMaterialId) => {
    const container = document.querySelector<HTMLDivElement>('.studio-build-notice-body');
    buildNoticeReturnScrollTopRef.current = container?.scrollTop ?? 0;
    buildNoticeRestoreScrollOnReturnRef.current = false;
    setActiveBuildNoticeMaterialId(materialId);
    setBuildNoticeNavOpen(false);
    setBuildNoticeOpenError(null);
  };

  const closeBuildNoticeMaterial = () => {
    buildNoticeRestoreScrollOnReturnRef.current = true;
    setActiveBuildNoticeMaterialId(null);
    setBuildNoticeFilePreview(null);
    setBuildNoticeOpenError(null);
  };

  const openBuildNoticeLegalFile = async (materialId: WorkbenchLegalMaterialId) => {
    setBuildNoticeOpenError(null);
    const fileConfig = buildNoticeLegalMaterialFiles[materialId];

    if (hasDesktopLegalBridge()) {
      const result = await window.hardSphereLabLegal!.openLegalFile(materialId);
      if (result.status === 'error') {
        console.error('[Workbench] Failed to open legal material:', result.message);
        setBuildNoticeOpenError(workbenchCopy.about.buildNoticeOpenUnavailable);
      }
      return;
    }

    if (fileConfig.previewPath) {
      window.open(fileConfig.previewPath, '_blank', 'noopener,noreferrer');
      return;
    }

    setBuildNoticeOpenError(workbenchCopy.about.buildNoticeOpenUnavailable);
  };

  const getIgnoredUpdateVersion = () => (
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(WORKBENCH_IGNORED_UPDATE_VERSION_KEY)
  );

  const rememberIgnoredUpdateVersion = (version: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKBENCH_IGNORED_UPDATE_VERSION_KEY, version);
    }
  };

  const applyUpdaterState = (nextState: WorkbenchUpdateState, options: { manual?: boolean } = {}) => {
    setUpdaterState((currentState) => mergeWorkbenchUpdateState(nextState, currentState));

    if (nextState.status === 'available') {
      const latestVersion = nextState.latestVersion || '';
      if (latestVersion && getIgnoredUpdateVersion() === latestVersion) {
        setUpdateDialogOpen(false);
        if (options.manual) {
          showAboutResultNotice(workbenchCopy.about.ignoredVersionTitle, workbenchCopy.about.ignoredVersionBody(latestVersion));
        }
        return;
      }
      setUpdateDialogOpen(true);
      return;
    }

    if (
      nextState.status === 'downloading'
      || nextState.status === 'retrying'
      || nextState.status === 'downloaded'
      || nextState.status === 'installing'
      || (nextState.status === 'error' && hasDesktopUpdaterBridge())
    ) {
      setUpdateDialogOpen(true);
      return;
    }

    setUpdateDialogOpen(false);

    if (nextState.status === 'not-available' && options.manual) {
      showAboutResultNotice(workbenchCopy.about.updateResultTitle, workbenchCopy.about.upToDateStatus);
      return;
    }

    if ((nextState.status === 'unsupported' || nextState.status === 'error') && options.manual) {
      showAboutResultNotice(
        workbenchCopy.about.updateResultTitle,
        getAboutUpdateStatusLabel(nextState, workbenchCopy.about, hasDesktopUpdaterBridge()),
      );
    }
  };

  const runAboutUpdateCheck = () => {
    if (aboutUpdateChecking) return;
    const updateCheckRequest = window.hardSphereLabUpdater?.checkForUpdates?.();
    if (!updateCheckRequest) {
      const unsupportedState: WorkbenchUpdateState = {
        ...updaterState,
        status: 'unsupported',
        currentVersion: WORKBENCH_APP_VERSION,
        message: workbenchCopy.about.unsupportedUpdateStatus,
      };
      applyUpdaterState(unsupportedState, { manual: true });
      return;
    }
    setUpdaterState((currentState) => ({
      ...currentState,
      status: 'checking',
      message: '',
      errorStage: null,
    }));
    void updateCheckRequest
      .then((result) => applyUpdaterState(result, { manual: true }))
      .catch((error) => {
        console.error('[Workbench] Update check failed:', error);
        applyUpdaterState({
          ...updaterState,
          status: 'error',
          currentVersion: WORKBENCH_APP_VERSION,
          message: workbenchCopy.about.updateErrorStatus,
          errorStage: 'check',
        }, { manual: true });
      });
  };

  const ignoreUpdateDialogVersion = () => {
    const version = updaterState.latestVersion;
    if (version) {
      rememberIgnoredUpdateVersion(version);
      showAboutResultNotice(workbenchCopy.about.ignoredVersionTitle, workbenchCopy.about.ignoredVersionBody(version));
    }
    setUpdateDialogOpen(false);
  };

  const startUpdateDownload = () => {
    if (!updateDialogState) return;
    if (isWorkbenchUpdateCheckFailure(updateDialogState)) {
      setUpdateDialogOpen(false);
      runAboutUpdateCheck();
      return;
    }
    const downloadRequest = window.hardSphereLabUpdater?.downloadUpdate?.();
    if (!downloadRequest) return;
    setUpdaterState((currentState) => ({
      ...currentState,
      status: 'downloading',
      percent: 0,
      errorStage: null,
    }));
    void downloadRequest
      .then((result) => applyUpdaterState(result))
      .catch((error) => {
        console.error('[Workbench] Update download failed:', error);
        applyUpdaterState({
          ...updaterState,
          status: 'error',
          currentVersion: WORKBENCH_APP_VERSION,
          message: workbenchCopy.about.updateErrorStatus,
          errorStage: 'download',
        }, { manual: true });
      });
  };

  const restartAndInstallUpdate = () => {
    if (!updateDialogState) return;
    const installRequest = window.hardSphereLabUpdater?.quitAndInstall?.();
    if (!installRequest) return;
    setUpdaterState((currentState) => ({ ...currentState, status: 'installing', percent: 100 }));
    void installRequest
      .then((result) => applyUpdaterState(result))
      .catch((error) => {
        console.error('[Workbench] Restart and install failed:', error);
        setUpdaterState((currentState) => ({
          ...currentState,
          status: 'error',
          message: workbenchCopy.about.updateErrorStatus,
        }));
      });
  };

  const updateSettingsThemePreference = (theme: WorkbenchThemePreference) => {
    setSettingsThemePreference(theme);
    persistWorkbenchGeneralSettings({
      theme,
      language: settingsLanguagePreference,
      performanceMode: settingsPerformanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume: audioSettings.volume,
    });
  };

  const updateSettingsLanguagePreference = (language: WorkbenchLanguagePreference) => {
    setSettingsLanguagePreference(language);
    setSettingsLanguageMenuOpen(false);
    persistWorkbenchGeneralSettings({
      theme: settingsThemePreference,
      language,
      performanceMode: settingsPerformanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume: audioSettings.volume,
    });
    window.setTimeout(() => settingsLanguageTriggerRef.current?.focus(), 0);
  };

  const updateSettingsPerformanceMode = (performanceMode: WorkbenchPerformanceMode) => {
    setSettingsPerformanceMode(performanceMode);
    persistWorkbenchGeneralSettings({
      theme: settingsThemePreference,
      language: settingsLanguagePreference,
      performanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume: audioSettings.volume,
    });
  };

  const updateSettingsAudioEnabled = (audioEnabled: boolean) => {
    updateAudioSettings({ enabled: audioEnabled, volume: audioSettings.volume });
    persistWorkbenchGeneralSettings({
      theme: settingsThemePreference,
      language: settingsLanguagePreference,
      performanceMode: settingsPerformanceMode,
      audioEnabled,
      audioVolume: audioSettings.volume,
    });
  };

  const updateSettingsAudioVolume = (volume: number) => {
    const audioVolume = clampAudioVolume(volume);
    updateAudioSettings({ enabled: audioSettings.enabled, volume: audioVolume });
    persistWorkbenchGeneralSettings({
      theme: settingsThemePreference,
      language: settingsLanguagePreference,
      performanceMode: settingsPerformanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume,
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemWorkbenchTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);

  useEffect(() => {
    if (!hasDesktopWindowControlBridge()) return undefined;
    const desktopWindowBridge = window.hardSphereLabWindow;
    let mounted = true;

    void desktopWindowBridge?.getState?.()
      .then((state) => {
        if (mounted) setDesktopWindowMaximized(Boolean(state?.maximized));
      })
      .catch(() => undefined);

    const unsubscribe = desktopWindowBridge?.onState?.((state) => {
      setDesktopWindowMaximized(Boolean(state.maximized));
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.hardSphereLabUpdater?.onStatus?.((state) => {
      applyUpdaterState(state);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [workbenchCopy]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

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

  useEffect(() => {
    closedFilesRef.current = closedFiles;
    selectedPanelRef.current = selectedPanel;
    const activePersistenceFile = files.find((file) => file.id === activeFileId);
    if (activePersistenceFile?.kind === 'heatCapacity') {
      scheduleHeatCapacitySemanticSceneCheckpointRef.current();
    }
    scheduleWorkspacePersistenceRef.current();
    const nextLocation = {
      fileId: activeFileId,
      mode: activePersistenceFile?.kind === 'heatCapacity'
        ? activePersistenceFile.heatCapacityMode
        : null,
    };
    const previousLocation = workspacePersistenceLocationRef.current;
    workspacePersistenceLocationRef.current = nextLocation;
    if (
      previousLocation.fileId !== nextLocation.fileId ||
      previousLocation.mode !== nextLocation.mode
    ) {
      flushWorkspacePersistenceRef.current();
    }
  }, [activeFileId, closedFiles, files, selectedPanel]);

  useEffect(() => {
    renamingFileIdRef.current = renamingFileId;
  }, [renamingFileId]);

  useEffect(() => {
    if (!settingsGeneralOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGeneralSettings();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsGeneralOpen]);

  useEffect(() => {
    if (activeFile.kind !== 'ideal') return undefined;
    if (!idealAdvancedSettingsOpen && !idealAdvancedSettingsBodyVisible) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      if (idealAdvancedSettingsOpen) {
        const container = currentParametersBodyRef.current;
        const body = idealAdvancedSettingsBodyRef.current;
        if (!container || !body) return;

        const containerRect = container.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const targetTop = clamp(container.scrollTop + bodyRect.top - containerRect.top, 0, maxScrollTop);
        animateCurrentParametersScroll(targetTop);
        return;
      }

      animateCurrentParametersScroll(
        idealAdvancedSettingsPreviousScrollTopRef.current,
        () => setIdealAdvancedSettingsBodyVisible(false),
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (idealAdvancedScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(idealAdvancedScrollFrameRef.current);
        idealAdvancedScrollFrameRef.current = null;
      }
    };
  }, [idealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible, activeFile.kind]);

  useEffect(() => {
    if (!renamingFileId) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [renamingFileId]);

  const activeIdealRelation = activeFile.kind === 'ideal' ? activeFile.relation : null;

  useEffect(() => {
    if (activeFile.kind !== 'ideal' || scanInputFocused) return;
    const value = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    setScanInputDraft(formatMetric(value, getIdealScanDecimals(activeFile.relation)));
    setScanInputError(null);
  }, [activeFile.kind, activeIdealRelation, activeFile.params, scanInputFocused]);

  useEffect(() => {
    if (!scanInputToast) return undefined;
    const timeoutId = window.setTimeout(() => setScanInputToast(null), 2600);
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
      setParametersCollapsed(true);
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
  }, [activeFile.kind, activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null]);

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
    Object.values(standardRuntimeRef.current).forEach((runtime) => {
      if (runtime.simulationTimerId !== null) {
        window.clearTimeout(runtime.simulationTimerId);
      }
    });
    Object.values(idealRuntimeRef.current).forEach((runtime) => {
      if (runtime.simulationTimerId !== null) {
        window.clearTimeout(runtime.simulationTimerId);
      }
    });
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
    if (aboutResultNoticeTimerRef.current !== null) {
      window.clearTimeout(aboutResultNoticeTimerRef.current);
      aboutResultNoticeTimerRef.current = null;
    }
  }, []);

  const pushLog = (message: WorkbenchConsoleMessageInput, kind: LogKind = 'info') => {
    setLogs((current) => [
      ...current,
      createConsoleLog(current.length + 1, kind, message, settingsLanguagePreference),
    ]);
  };

  const showWorkbenchValidationErrors = (validation: { errors: string[] }) => {
    const localizedErrors = getLocalizedWorkbenchValidationErrors(validation.errors, settingsLanguagePreference);
    setParameterErrors(localizedErrors);
    validation.errors.forEach((error) => pushLog(
      (language) => `${activeFile.name}: ${getLocalizedWorkbenchValidationErrors([error], language)[0] ?? error}`,
      'error',
    ));
  };

  useEffect(() => {
    const bridge = window.hardSphereLabExporter;
    if (!bridge) {
      setExportEnvironmentStatus('unavailable');
      return;
    }

    let cancelled = false;
    setExportEnvironmentStatus('checking');

    bridge.checkExportEnvironment()
      .then((result) => {
        if (cancelled) return;
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        setExportEnvironmentStatus(nextStatus);
        setLogs((current) => [
          ...current,
          createConsoleLog(
            current.length + 1,
            nextStatus === 'available-system' || nextStatus === 'available-bundled' ? 'success' : 'warning',
            (language) => workbenchCopies[language].exportEnvironment[nextStatus].detail,
            settingsLanguagePreference,
          ),
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        setExportEnvironmentStatus('error');
        setLogs((current) => [
          ...current,
          createConsoleLog(
            current.length + 1,
            'error',
            (language) => workbenchCopies[language].exportEnvironment.error.detail,
            settingsLanguagePreference,
          ),
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const runAboutEnvironmentCheck = () => {
    const bridge = window.hardSphereLabExporter;
    setExportEnvironmentStatus('checking');

    if (!bridge) {
      window.setTimeout(() => {
        const nextStatus: WorkbenchExportEnvironmentStatus = 'unavailable';
        setExportEnvironmentStatus(nextStatus);
        showAboutResultNotice(workbenchCopy.about.environmentResultTitle, getAboutEnvironmentResultBody(nextStatus, workbenchCopy));
      }, 650);
      return;
    }

    bridge.checkExportEnvironment()
      .then((result) => {
        const nextStatus = result.status === 'available-bundled' ? 'available-bundled' : result.status;
        setExportEnvironmentStatus(nextStatus);
        pushLog(
          (language) => workbenchCopies[language].exportEnvironment[nextStatus].detail,
          isExportEnvironmentAvailableStatus(nextStatus) ? 'success' : 'warning',
        );
        showAboutResultNotice(workbenchCopy.about.environmentResultTitle, getAboutEnvironmentResultBody(nextStatus, workbenchCopy));
      })
      .catch(() => {
        const nextStatus: WorkbenchExportEnvironmentStatus = 'error';
        setExportEnvironmentStatus(nextStatus);
        pushLog((language) => workbenchCopies[language].exportEnvironment[nextStatus].detail, 'error');
        showAboutResultNotice(workbenchCopy.about.environmentResultTitle, getAboutEnvironmentResultBody(nextStatus, workbenchCopy));
      });
  };

  const openManualUpdateDownload = () => {
    const manualDownloadRequest = window.hardSphereLabUpdater?.openManualDownload?.();
    if (!manualDownloadRequest) return;
    void manualDownloadRequest.then((result) => {
      if (result.status === 'error') {
        console.error('[Workbench] Manual update page failed to open:', result.message);
        showAboutResultNotice(workbenchCopy.about.updateResultTitle, workbenchCopy.about.updateErrorStatus);
      }
    }).catch((error) => {
      console.error('[Workbench] Manual update page failed to open:', error);
      showAboutResultNotice(workbenchCopy.about.updateResultTitle, workbenchCopy.about.updateErrorStatus);
    });
  };

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

  const setWorkbenchFiles = (updater: (current: WorkbenchFileState[]) => WorkbenchFileState[]) => {
    if (desktopExitQuiescedRef.current) return;
    setFiles((current) => {
      const next = updater(current);
      filesRef.current = next;
      return next;
    });
  };

  const commitWorkbenchFileCollections = (
    nextFiles: WorkbenchFileState[],
    nextClosedFiles: WorkbenchFileState[],
    nextActiveFileId: string,
  ) => {
    assertUniqueWorkbenchFileCollections(nextFiles, nextClosedFiles, nextActiveFileId);
    [...nextFiles, ...nextClosedFiles].forEach((file) => {
      issuedWorkbenchFileIdsRef.current.add(file.id);
    });
    filesRef.current = nextFiles;
    closedFilesRef.current = nextClosedFiles;
    activeFileIdRef.current = nextActiveFileId;
    setFiles(nextFiles);
    setClosedFiles(nextClosedFiles);
    setActiveFileId(nextActiveFileId);
  };

  const updateFileById = (fileId: string, updater: (file: WorkbenchFileState) => WorkbenchFileState) => {
    setWorkbenchFiles((current) => current.map((file) => (file.id === fileId ? updater(file) : file)));
  };

  const updateActiveFile = (updater: (file: WorkbenchFileState) => WorkbenchFileState) => {
    updateFileById(activeFileIdRef.current, updater);
  };

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

  const showPistonOscillationDevelopmentNotice = (
    target: keyof typeof pistonOscillationCopy.unavailable,
  ) => {
    const message = pistonOscillationCopy.unavailable[target];
    setScanInputToast(message);
    pushLog(
      (language) => (
        `${activeFile.name}: ${getPistonOscillationShellCopy(language).unavailable[target]}`
      ),
      'warning',
    );
  };

  const openParameterSidebarFromRail = () => {
    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      showPistonOscillationDevelopmentNotice('rightSidebar');
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
    if (isHeatCapacityFreeExperimentStarted(currentFile)) {
      showHeatCapacityFreeSchemeLockHint();
      return;
    }
    if (currentFile.heatCapacityFreeParameterScheme === 'ideal') {
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
    if (currentFile?.kind === 'heatCapacity' && currentFile.heatCapacityMode === 'free' && isHeatCapacityFreeExperimentStarted(currentFile)) {
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
      activeFile.heatCapacityFreeParameterDraft,
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
          ...file.heatCapacityFreeParameterDraft,
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
          ...file.heatCapacityFreeParameterDraft,
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
    if (currentFile.heatCapacityFreeParameterDraft.gasType === gasType) return;
    if (currentFile.heatCapacityFreeParameterScheme === 'ideal') {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
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
          ...file.heatCapacityFreeParameterDraft,
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
      ? { ...activeFile.heatCapacityFreeParameterDraft }
      : null
  );

  const openHeatCapacityAdvancedSettings = () => {
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

  const getGuideHeatCapacityDecisionPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
    if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
    return 0;
  };

  const getGuideHeatCapacityDisplayedPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.pressureSignalMv)) return file.pressureSignalMv;
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return file.pressureSignalMvDisplayed;
    if (Number.isFinite(file.pressureSignalTargetMv)) return file.pressureSignalTargetMv;
    return 0;
  };

  const getGuideHeatCapacityThresholdPressureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (file.heatCapacityMode === 'guide') {
      return Math.max(0, selectActiveHeatCapacityWorkbenchDisplay(file).pressureMv);
    }
    if (Number.isFinite(file.pressureSignalMvRaw)) return file.pressureSignalMvRaw;
    if (Number.isFinite(file.pressureSignalTargetMv)) return Math.max(0, file.pressureSignalTargetMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
    if (Number.isFinite(file.pressureSignalMvDisplayed)) return Math.max(0, file.pressureSignalMvDisplayed - file.pressureInitialBiasMv - file.pressureZeroOffset);
    if (Number.isFinite(file.pressureSignalMv)) return Math.max(0, file.pressureSignalMv - file.pressureInitialBiasMv - file.pressureZeroOffset);
    return 0;
  };

  const canProceedAfterPumping = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => getGuideHeatCapacityThresholdPressureMv(file) >= HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;

  const getHeatCapacityPressureSafetyStatusFromMv = (
    pressureMv: number,
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): 'normal' | 'warning' | 'danger' => {
    const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
    return pressureMv >= pressureThresholdsMv.pressureDangerThresholdMv
      ? 'danger'
      : pressureMv >= pressureThresholdsMv.pressureWarningThresholdMv
      ? 'warning'
      : 'normal';
  };

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

  const getGuideHeatCapacityAmbientTemperatureMv = (
    _file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    return HEAT_CAPACITY_TEMPERATURE_BASELINE_MV;
  };

  const getGuideHeatCapacityDecisionTemperatureMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (Number.isFinite(file.temperatureSignalTargetMv)) return file.temperatureSignalTargetMv;
    if (Number.isFinite(file.temperatureSignalMv)) return file.temperatureSignalMv;
    return getGuideHeatCapacityAmbientTemperatureMv(file);
  };

  const isGuideHeatCapacityTemperatureAtAmbient = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const ambientTemperatureMv = getGuideHeatCapacityAmbientTemperatureMv(file);
    const targetTemperatureMv = getGuideHeatCapacityDecisionTemperatureMv(file);
    const toleranceMv = Math.max(0.5, (file.heatCapacityExperimentProfile?.displayNoiseLevel ?? 0.08) * 6);
    return Math.abs(targetTemperatureMv - ambientTemperatureMv) <= toleranceMv;
  };

  const isGuideU0ZeroAttempted = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => (
    file.pressureZeroAdjusted ||
    file.pressureZeroAdjustMode !== 'none' ||
    Math.abs(file.pressureZeroKnobAngle) > 0.01
  );

  const isGuideU0ZeroReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    return file.powerOn &&
      stopcockState === 'open' &&
      isHeatCapacityPressureZeroWithinTolerance(file.pressureZeroDisplayedSamples);
  };

  const hasActiveTrialU1 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityGuideTrial?.u1 !== null && file.heatCapacityGuideTrial?.u1 !== undefined;

  const hasActiveTrialU2 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityGuideTrial?.u2 !== null && file.heatCapacityGuideTrial?.u2 !== undefined;

  const getActiveTrialRecordedU1Mv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityGuideTrial?.u1?.displayPressureMv ?? null;

  const getGuideHeatCapacityExpectedU1Mv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const profile = file.heatCapacityExperimentProfile;
    if (profile && Number.isFinite(profile.stableBeforeReleaseMv)) return profile.stableBeforeReleaseMv;
    if (profile && Number.isFinite(profile.u1MeasuredMv)) return profile.u1MeasuredMv;
    const stableSample = file.heatCapacityProcessSamples.stableBeforeReleaseSample;
    if (stableSample && Number.isFinite(stableSample.pressureSignalMv)) return stableSample.pressureSignalMv;
    const peakSample = file.heatCapacityProcessSamples.pumpPeakSample;
    if (peakSample && Number.isFinite(peakSample.pressureSignalMv)) return peakSample.pressureSignalMv;
    return null;
  };

  const hasGuideHeatCapacityWaitElapsed = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    kind: 'u1' | 'u2',
  ) => {
    const referenceSample = kind === 'u1'
      ? file.heatCapacityProcessSamples.afterPumpSample
      : file.heatCapacityProcessSamples.releaseLowSample ?? file.heatCapacityProcessSamples.afterReleaseSample;
    if (!referenceSample) return false;
    return Math.max(0, file.simulationTimeS - referenceSample.timeS) >= HEAT_CAPACITY_GUIDE_WAIT_DURATION_S;
  };

  const hasGuideHeatCapacityFormedRelease = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => file.heatCapacityReleaseState.formedRelease;

  const hasGuideHeatCapacityEnteredRecovery = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    if (file.heatCapacityPhase === 'recovering') return true;
    return false;
  };

  const isGuideHeatCapacityReleaseCompleteForU2 = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    recordedU1Mv: number | null,
  ) => {
    if (recordedU1Mv === null) return false;
    if (file.heatCapacityProcessSamples.releaseLowSample || file.heatCapacityProcessSamples.afterReleaseSample) {
      return true;
    }
    if (hasGuideHeatCapacityEnteredRecovery(file) && hasGuideHeatCapacityFormedRelease(file)) return true;
    const pressureTarget = getGuideHeatCapacityDecisionPressureMv(file);
    return pressureTarget <= Math.max(5, recordedU1Mv * 0.14) && hasGuideHeatCapacityFormedRelease(file);
  };

  const getGuideHeatCapacityMinimumU1PlatformMv = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const expectedU1 = getGuideHeatCapacityExpectedU1Mv(file);
    return Math.max(HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV, (expectedU1 ?? 110) * 0.45);
  };

  const hasGuideHeatCapacityReachedPumpTarget = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const targetMv = getGuideHeatCapacityMinimumU1PlatformMv(file);
    if (file.heatCapacityMode === 'guide') {
      return getGuideHeatCapacityDisplayedPressureMv(file) >= targetMv;
    }
    if (getGuideHeatCapacityThresholdPressureMv(file) >= targetMv) return true;
    const pumpSamples = [
      file.heatCapacityProcessSamples.afterPumpSample,
      file.heatCapacityProcessSamples.pumpPeakSample,
      file.heatCapacityProcessSamples.stableBeforeReleaseSample,
    ];
    return pumpSamples.some((sample) => (
      sample !== undefined &&
      Number.isFinite(sample.pressureSignalMv) &&
      sample.pressureSignalMv >= targetMv
    ));
  };

  const isGuideU1RecordReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const pressureForGate = getGuideHeatCapacityThresholdPressureMv(file);
    const minimumPlatformMv = HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV;
    const temperatureReady = isGuideHeatCapacityTemperatureAtAmbient(file);
    const hasEffectivePumping = file.pumpStrokeCount > 0 ||
      Boolean(file.heatCapacityProcessSamples.pumpPeakSample) ||
      pressureForGate >= minimumPlatformMv;

    return stopcockState === 'closed' &&
      !file.pumpValveOpen &&
      hasEffectivePumping &&
      canProceedAfterPumping(file) &&
      temperatureReady &&
      hasGuideHeatCapacityWaitElapsed(file, 'u1') &&
      file.heatCapacityPhase === 'sealedStabilizing';
  };

  const isGuideU2RecordReady = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => {
    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
    if (recordedU1Mv === null) return false;
    const pressureForGate = getGuideHeatCapacityThresholdPressureMv(file);
    const lowerBound = 0.2;
    const upperBound = Math.max(5, recordedU1Mv * 0.55);
    const releaseHasStarted = pressureForGate < Math.max(10, recordedU1Mv * 0.75);
    const releaseComplete = isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
    const temperatureReady = isGuideHeatCapacityTemperatureAtAmbient(file);

    return stopcockState === 'closed' &&
      releaseHasStarted &&
      releaseComplete &&
      pressureForGate >= lowerBound &&
      pressureForGate <= upperBound &&
      temperatureReady &&
      hasGuideHeatCapacityWaitElapsed(file, 'u2') &&
      file.heatCapacityPhase === 'recovering';
  };

  const getHeatCapacityGuideStep = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): GuideHeatCapacityStep => {
    if (file.heatCapacityMode === 'guide') {
      switch (file.heatCapacityGuideWorkflow.step) {
        case 'powerRequired':
          return 'powerOnRequired';
        case 'preheatRequired':
          return 'preheatRequired';
        case 'openStopcockForZeroRequired':
          return 'openStopcockForZeroRequired';
        case 'zeroRequired':
          return 'zeroAdjustRequired';
        case 'recordU0Required':
          return 'recordU0Required';
        case 'closeStopcockBeforePumpRequired':
          return 'closeStopcockRequired';
        case 'openPumpValveRequired':
          return 'openPumpValveRequired';
        case 'pumpRequired':
          return 'pumpRequired';
        case 'closePumpValveRequired':
          return 'closePumpValveRequired';
        case 'u1Waiting':
          return 'stabilizeBeforeReleaseRequired';
        case 'recordU1Required':
          return 'recordU1Required';
        case 'openStopcockForReleaseRequired':
          return 'openStopcockReleaseRequired';
        case 'closeStopcockAfterReleaseRequired':
          return 'closeStopcockAfterReleaseRequired';
        case 'u2Waiting':
          return 'recoverRequired';
        case 'recordU2Required':
          return 'recordU2Required';
        case 'closePowerRequired':
          return 'closePowerRequired';
        case 'completed':
          return 'completed';
      }
    }
    if (autoDemoInteractionLocked) return 'idle';
    if (file.runState === 'finished') return 'idle';
    if (!file.powerOn) return 'powerOnRequired';

    const stopcockState = getHeatCapacityStopcockState(file.stopcockAngleDeg);
    const pressureValue = getGuideHeatCapacityThresholdPressureMv(file);
    const hasU0 = file.heatCapacityGuideTrial?.u0 !== null && file.heatCapacityGuideTrial?.u0 !== undefined;
    const hasU1 = hasActiveTrialU1(file);
    const hasU2 = hasActiveTrialU2(file);
    const recordedU1Mv = getActiveTrialRecordedU1Mv(file);
    const releaseComplete = recordedU1Mv !== null && isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv);
    const u1Ready = isGuideU1RecordReady(file);
    const u2Ready = isGuideU2RecordReady(file);

    if (!hasU0) {
      if (stopcockState !== 'open') return 'openStopcockForZeroRequired';
      if (!isGuideU0ZeroReady(file)) return 'zeroAdjustRequired';
      return 'recordU0Required';
    }
    if (!hasU1) {
      if (stopcockState !== 'closed') return 'closeStopcockRequired';
      const pumpTargetReached = hasGuideHeatCapacityReachedPumpTarget(file);
      if (!file.pumpValveOpen && pressureValue < 8 && file.pumpStrokeCount === 0) return 'openPumpValveRequired';
      if (!file.pumpValveOpen && !pumpTargetReached) return 'openPumpValveRequired';
      if (file.pumpValveOpen && !pumpTargetReached) return 'pumpRequired';
      if (file.pumpValveOpen && pumpTargetReached) return 'closePumpValveRequired';
      return u1Ready ? 'recordU1Required' : 'stabilizeBeforeReleaseRequired';
    }
    if (!hasU2) {
      if (u2Ready) return 'recordU2Required';
      if (!releaseComplete) return 'openStopcockReleaseRequired';
      if (stopcockState === 'open') return 'closeStopcockAfterReleaseRequired';
      return 'recoverRequired';
    }
    return 'completed';
  };

  const getGuideStepGuidance = (
    step: GuideHeatCapacityStep,
    file?: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): { message: string; controlId: string | null } => {
    const isEn = settingsLanguagePreference === 'en';
    const isTw = settingsLanguagePreference === 'zh-TW';
    const zeroAdjustMessage = file && isGuideU0ZeroAttempted(file)
      ? isEn
        ? 'Uₚ is still not close to 0. Continue adjusting the pressure-zero knob.'
        : isTw
          ? '目前 Uₚ 仍未接近 0，請繼續調整壓強調零旋鈕。'
          : '当前 Uₚ 仍未接近 0，请继续调整压力调零旋钮。'
      : `${heatCapacityRealtimeCopy.guideUsageHints.zeroFocus}${heatCapacityRealtimeCopy.guideUsageHints.zeroAdjust}`;
    const temperatureReady = file ? isGuideHeatCapacityTemperatureAtAmbient(file) : false;
    const waitBeforeU1Message = isEn
      ? 'Keep the vessel sealed for 5 min; when the timer completes, record U₁ / Uₜ₁.'
      : isTw
        ? '請保持氣瓶封閉等待 5 min；計時到達後記錄 U₁ / Uₜ₁。'
        : '请保持气瓶封闭等待 5 min；计时到达后记录 U₁ / Uₜ₁。';
    const recordedU1Mv = file ? getActiveTrialRecordedU1Mv(file) : null;
    const releaseComplete = file ? isGuideHeatCapacityReleaseCompleteForU2(file, recordedU1Mv) : false;
    const stopcockState = file ? getHeatCapacityStopcockState(file.stopcockAngleDeg) : 'closed';
    const openReleaseMessage = releaseComplete
      ? isEn
        ? 'Close the glass stopcock after quick release.'
        : isTw
          ? '放氣完成，請關閉玻璃旋塞。'
          : '放气完成，请关闭玻璃旋塞。'
      : stopcockState === 'open'
        ? isEn
          ? 'Keep the glass stopcock open and wait for the release process to finish.'
          : isTw
            ? '請保持玻璃旋塞打開，等待放氣過程完成。'
            : '请保持玻璃旋塞打开，等待放气过程完成。'
        : isEn
          ? 'Open the glass stopcock for quick release.'
          : isTw
            ? '請打開玻璃旋塞進行快速放氣。'
            : '请打开玻璃旋塞进行快速放气。';
    const recoverMessage = isEn
      ? 'After closing the glass stopcock, wait 5 min; after thermal recovery, record U₂ / Uₜ₂.'
      : isTw
        ? '請關閉玻璃旋塞後等待 5 min；回溫穩定後記錄 U₂ / Uₜ₂。'
        : '请关闭玻璃旋塞后等待 5 min；回温稳定后记录 U₂ / Uₜ₂。';
    const releaseStateMessage = isEn
      ? 'Wait for the “whoosh” to end; once the gas release is complete, close the glass stopcock immediately.'
      : isTw
        ? '等待「咻」聲結束，氣體釋放完畢，請立即關閉玻璃旋塞。'
        : '等待“咻”声结束，气体释放完毕，请立即关闭玻璃旋塞。';
    const messages: Record<GuideHeatCapacityStep, string> = {
      idle: isEn ? 'Start guide mode when ready.' : isTw ? '需要時開始引導模式。' : '需要时开始引导模式。',
      powerOnRequired: isEn ? 'Turn on the power first.' : isTw ? '請先打開電源。' : '请先打开电源。',
      preheatRequired: isEn
        ? 'Keep the instrument powered while the sensor warm-up completes.'
        : isTw
          ? '請保持儀器通電，等待感測器預熱完成。'
          : '请保持仪器通电，等待传感器预热完成。',
      openStopcockForZeroRequired: isEn ? 'Open the glass stopcock before pressure zeroing.' : isTw ? '請先打開玻璃旋塞，再進行壓強差調零。' : '请先打开玻璃旋塞，再进行压强差调零。',
      zeroAdjustRequired: zeroAdjustMessage,
      recordU0Required: isEn ? 'Record U₀ before pressurizing.' : isTw ? '請先記錄 U₀，再開始加壓。' : '请先记录 U₀，再开始加压。',
      closeStopcockRequired: isEn ? 'Close the glass stopcock before pumping.' : isTw ? '請先關閉玻璃旋塞。' : '请先关闭玻璃旋塞。',
      openPumpValveRequired: heatCapacityRealtimeCopy.guideUsageHints.pumpValve,
      pumpRequired: heatCapacityRealtimeCopy.guideUsageHints.pumpAction,
      closePumpValveRequired: isEn ? 'Close the pump valve to start the sealed 5 min wait.' : isTw ? '請關閉打氣閥門，進入封閉 5 min 等待。' : '请关闭打气阀门，进入封闭 5 min 等待。',
      stabilizeBeforeReleaseRequired: waitBeforeU1Message,
      recordU1Required: heatCapacityRealtimeCopy.guideUsageHints.waitU1Ready,
      openStopcockReleaseRequired: openReleaseMessage,
      closeStopcockAfterReleaseRequired: releaseStateMessage,
      recoverRequired: recoverMessage,
      recordU2Required: heatCapacityRealtimeCopy.guideUsageHints.waitU2Ready,
      closePowerRequired: isEn ? 'Turn off the power to finish this guided experiment.' : isTw ? '請關閉電源，完成本次引導實驗。' : '请关闭电源，完成本次引导实验。',
      completed: isEn ? 'Guide experiment complete.' : isTw ? '引導實驗已完成。' : '引导实验已完成。',
    };
    return {
      message: messages[step],
      controlId: getHeatCapacityGuideStepControlId(step, { temperatureReady }),
    };
  };

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

  const showHeatCapacityFreeGroupCompletionToast = () => {
    showHeatCapacitySuccessToastSequence({
      primaryMessage: heatCapacityRealtimeCopy.freeGroupCompleteToast,
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
          file.heatCapacityFreeExperimentGroupStatus === 'draft' &&
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
    activeFile.heatCapacityFreeActiveAttempt?.status === 'invalid' &&
    !activeFile.heatCapacityFreeActiveAttempt.invalidPromptDismissed;
  const activeHeatCapacityModalLocked = activeHeatCapacityPreheatLocked ||
    activeHeatCapacityInvalidAttemptPrompt ||
    heatCapacityBatchSetupOpen ||
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
    const lessonView = getHeatCapacityGuideLessonView(heatCapacityGuideLessonDialog);
    return (
      <div
        className={`studio-heat-guide-lesson-layer studio-heat-guide-lesson-layer-${heatCapacityGuideLessonClosing ? 'closing' : 'open'}`}
        data-heat-capacity-guide-lesson-layer="true"
        role="presentation"
        onMouseDown={handleHeatCapacityGuideLessonDialogAdvance}
      >
        <section
          ref={heatCapacityGuideLessonDialogRef}
          className={`studio-heat-guide-lesson-card studio-heat-guide-lesson-card-${heatCapacityGuideLessonDialog.kind}`}
          data-heat-capacity-guide-lesson-dialog="true"
          role="dialog"
          aria-label={heatCapacityRealtimeCopy.guideLessonDialogAria}
          aria-modal="true"
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={handleHeatCapacityGuideLessonDialogKeyDown}
        >
          <button
            type="button"
            className="studio-heat-guide-lesson-close"
            data-heat-capacity-guide-lesson-close="true"
            aria-label={windowControlCopy.close}
            onMouseDown={handleHeatCapacityGuideLessonCloseButtonMouseDown}
            onClick={handleHeatCapacityGuideLessonCloseButtonClick}
          >
            <X size={13} strokeWidth={2.7} />
          </button>
          <div className="studio-heat-guide-lesson-kicker">
            <span>{heatCapacityRealtimeCopy.guideLessonButtonLabel}</span>
          </div>
          <div className="studio-heat-guide-lesson-content-stack">
            {heatCapacityGuideLessonOutgoingView ? (
              <div
                key={`outgoing-${heatCapacityGuideLessonOutgoingView.key}`}
                className="studio-heat-guide-lesson-content studio-heat-guide-lesson-content-outgoing"
              >
                <strong>{renderScientificText(heatCapacityGuideLessonOutgoingView.title)}</strong>
                <p>{renderScientificText(heatCapacityGuideLessonOutgoingView.body)}</p>
              </div>
            ) : null}
            <div
              key={`current-${lessonView.key}`}
              className="studio-heat-guide-lesson-content studio-heat-guide-lesson-content-current"
            >
              <strong>{renderScientificText(lessonView.title)}</strong>
              <p>{renderScientificText(lessonView.body)}</p>
            </div>
          </div>
          <div className="studio-heat-guide-lesson-hint" data-heat-capacity-guide-lesson-hint="true">
            {heatCapacityRealtimeCopy.guideLessonContinueHint}
          </div>
        </section>
      </div>
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
          return `${activeFile.name}: 再次点击确认删除第 ${displayTrialIndex} 组${recordSuffix}记录。`;
        }
        if (language === 'zh-TW') {
          return `${activeFile.name}: 再次點擊確認刪除第 ${displayTrialIndex} 組${recordSuffix}記錄。`;
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
      if (language === 'zh-CN') return `${activeFile.name}: 已删除第 ${displayTrialIndex} 组${recordSuffix}记录。`;
      if (language === 'zh-TW') return `${activeFile.name}: 已刪除第 ${displayTrialIndex} 組${recordSuffix}記錄。`;
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
    if (source === 'user') collapseHeatCapacityFreeParameterSidebarForExperimentAction();
    const now = Date.now();
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const resolvedPowerOn = nextPowerOn ?? !file.powerOn;
      if (resolvedPowerOn && file.heatCapacityMode === 'demo' && !file.heatCapacityExperimentProfile) {
        const experimentProfile = createHeatCapacityAutoDemoProfile();
        return powerHeatCapacityWorkbenchFile({
          ...file,
          heatCapacityExperimentSeed: experimentProfile.seed,
          heatCapacityExperimentProfile: experimentProfile,
        }, resolvedPowerOn, now);
      }
      return powerHeatCapacityWorkbenchFile(file, resolvedPowerOn, now);
    });
    if (shouldShowGuidePowerOffCompletionToast) {
      showHeatCapacityGuidePowerOffCompletionToast();
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).finalTrialCompleteToast,
        'success',
      );
    }
    if (shouldShowFreePowerOffCompletionToast) {
      showHeatCapacityFreeGroupCompletionToast();
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).freeGroupCompleteToast,
        'success',
      );
    }
  };

  const showHeatCapacityResetFeedback = (actionId: 'reset-guide' | 'reset-free') => {
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
    stopHeatCapacityTeachingModeToFree('guide');
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
      stopHeatCapacityTeachingModeToFree(activeFile.heatCapacityMode, 'teaching-completed');
    }
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.teachingModeExitedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).freeModeActiveLog(activeFile.name),
      'info',
    );
  };

  const resetHeatCapacityFreeRun = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (!activeFile || activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const now = Date.now();
    showHeatCapacityResetFeedback('reset-free');
    resetHeatCapacityGroupUiRuntime();
    captureUndoSnapshot('reset heat-capacity free run');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? resetCurrentHeatCapacityFreeExperimentGroupWorkbenchState(file, now)
      : file);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).freeRunResetLog(activeFile.name),
      'warning',
    );
  };

  const confirmHeatCapacityFreeBatchSetup = () => {
    if (
      heatCapacityBatchSetupSelection === null ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free'
    ) {
      return;
    }
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
  };

  const restartHeatCapacityFreeBatch = () => {
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityCalculationWindowOpen
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
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? completeHeatCapacityCalculationWorkflowWorkbenchState(file, Date.now())
        : file
    ));
    setHeatCapacityCalculationReviewOpen(false);
    window.setTimeout(() => {
      void flushWorkspacePersistenceRef.current();
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

  const startNextHeatCapacityFreeExperimentGroup = () => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      !isHeatCapacityFreeExperimentGroupComplete(activeFile)
    ) return;
    const now = Date.now();
    resetHeatCapacityGroupUiRuntime();
    captureUndoSnapshot('start next heat-capacity free group');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? startNextHeatCapacityFreeExperimentGroupWorkbenchState(file, now)
      : file);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).freeModeActiveLog(activeFile.name),
      'success',
    );
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
      if (file.heatCapacityMode === 'demo') {
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
      switchHeatCapacityMode('demo', 'mode-control', false);
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
    if (!currentFile || currentFile.kind !== 'heatCapacity') return null;
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

  const applyHeatCapacityModeTransitionEvent = (
    event: HeatCapacityModeTransitionEvent,
  ) => {
    const nextState = dispatchHeatCapacityModeTransition(event);
    window.requestAnimationFrame(() => {
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) return;
      heatCapacityRefreshPersistRef.current();
    });
    return nextState;
  };

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

  const isValidHeatCapacityDemoSessionCheckpoint = (
    checkpoint: HeatCapacityModeUiCheckpoint | null,
  ) => Boolean(
    checkpoint &&
    checkpoint.mode === 'demo' &&
    checkpoint.payload.demo.phase !== 'idle' &&
    Number.isFinite(checkpoint.payload.demo.elapsedMs) &&
    checkpoint.payload.demo.elapsedMs >= 0,
  );

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

  const resolveStoredHeatCapacityMode = (
    file: WorkbenchHeatCapacityState,
    mode: HeatCapacityMode,
    now = Date.now(),
  ): { file: WorkbenchHeatCapacityState; checkpoint: HeatCapacityModeUiCheckpoint | null } | null => {
    const restoredFile = restoreHeatCapacityModeSession(file, mode, now);
    if (!restoredFile) return null;
    const checkpoint = restoredFile.heatCapacityModeSessions[mode].uiCheckpoint;
    if (mode === 'demo' && !isValidHeatCapacityDemoSessionCheckpoint(checkpoint)) return null;
    return { file: restoredFile, checkpoint };
  };

  const resolveHeatCapacityFreeFallback = (
    file: WorkbenchHeatCapacityState,
    now = Date.now(),
  ) => {
    const storedFree = resolveStoredHeatCapacityMode(file, 'free', now);
    if (storedFree) return storedFree;
    return {
      file: enterHeatCapacityFreeModeWorkbenchState(file, now),
      checkpoint: null,
    };
  };

  const resolveHeatCapacityModeTarget = (
    suspendedFile: WorkbenchHeatCapacityState,
    targetMode: HeatCapacityMode,
    now: number,
  ): {
    file: WorkbenchHeatCapacityState;
    checkpoint: HeatCapacityModeUiCheckpoint | null;
    activation: 'resume' | 'fresh-demo' | 'fresh-guide' | 'fresh-free';
  } => {
    const storedTarget = resolveStoredHeatCapacityMode(suspendedFile, targetMode, now);
    if (storedTarget) {
      const resumeRunningDemo = targetMode === 'demo' &&
        storedTarget.checkpoint?.mode === 'demo' &&
        storedTarget.checkpoint.payload.demo.phase === 'running';
      return {
        file: resumeRunningDemo
          ? {
              ...storedTarget.file,
              runState: 'running' as const,
              lastUpdateMs: now,
              displayResponseLastUpdateMs: now,
              updatedAt: now,
            }
          : storedTarget.file,
        checkpoint: storedTarget.checkpoint,
        activation: 'resume' as const,
      };
    }
    if (targetMode === 'demo') {
      const resetDemo = prepareHeatCapacityAutoDemoReset(suspendedFile, now);
      return {
        file: {
          ...resetDemo,
          runState: 'idle',
          updatedAt: now,
        },
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
    const freeTarget = resolveHeatCapacityFreeFallback(suspendedFile, now);
    return { ...freeTarget, activation: 'fresh-free' };
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
      const sourceCheckpoint = buildHeatCapacityModeUiCheckpoint(currentFile, now, deferredGuideCheckpoint);
      const suspendedFile = transition.activeIntent?.discardSource
        ? clearHeatCapacityModeSession(currentFile, currentFile.heatCapacityMode)
        : suspendHeatCapacityModeSession(currentFile, sourceCheckpoint, now);
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

  const switchHeatCapacityMode = (
    targetMode: HeatCapacityMode,
    reason: HeatCapacityModeTransitionReason = 'mode-control',
    discardSource = false,
  ) => {
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (currentFile.heatCapacityMode === 'demo' && targetMode !== 'demo' && autoDemoRunning) {
      quiesceHeatCapacityAutoDemoForModeTransition(currentFile.id);
    }
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'idle' && transition.visibleMode !== currentFile.heatCapacityMode) {
      applyHeatCapacityModeTransitionEvent({
        type: 'synchronize',
        visibleMode: currentFile.heatCapacityMode,
      });
    }
    const nextState = requestHeatCapacityModeTransition({
      sourceMode: heatCapacityModeTransitionStateRef.current.visibleMode,
      targetMode,
      reason,
      discardSource,
    }, heatCapacitySceneDiscreteMotionRef.current.reasons);
    window.requestAnimationFrame(() => {
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) return;
      heatCapacityRefreshPersistRef.current();
      flushWorkspacePersistenceRef.current();
    });
    if (nextState.phase === 'preparing-target') {
      scheduleHeatCapacityModeTargetPreparation(nextState.requestId);
    } else if (nextState.phase === 'idle' && targetMode === currentFile.heatCapacityMode) {
      resumeQuiescedHeatCapacityAutoDemo(currentFile.id);
    }
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

  const cancelHeatCapacityModeTransitionForNavigation = (visibleMode: HeatCapacityMode) => {
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
    const deferredGuideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
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
      const checkpoint = buildHeatCapacityModeUiCheckpoint(currentFile, now, deferredGuideCheckpoint);
      const suspendedFile = suspendHeatCapacityModeSession(currentFile, checkpoint, now);
      commitHeatCapacityFileProjection(suspendedFile);
    }
    releaseHeatCapacityRuntimeForFileExit(currentFile.id);
    return preservePendingRefresh;
  };

  const activateHeatCapacityFileModeSession = (fileId: string) => {
    const targetFile = filesRef.current.find((file) => file.id === fileId);
    if (!targetFile || targetFile.kind !== 'heatCapacity') return undefined;
    const now = Date.now();
    const storedMode = resolveStoredHeatCapacityMode(targetFile, targetFile.heatCapacityMode, now);
    if (storedMode) {
      commitHeatCapacityFileProjection(storedMode.file);
      applyHeatCapacityModeUiProjection(storedMode.file, storedMode.checkpoint);
      applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: storedMode.file.heatCapacityMode });
      return createWorkbenchActiveModeCheckpointOverride(
        storedMode.file.id,
        storedMode.file.heatCapacityMode,
        storedMode.checkpoint,
      );
    }
    if (targetFile.heatCapacityMode === 'demo') {
      const clearedFile = clearHeatCapacityModeSession(targetFile, 'demo');
      const freeTarget = resolveHeatCapacityFreeFallback(clearedFile, now);
      commitHeatCapacityFileProjection(freeTarget.file);
      applyHeatCapacityModeUiProjection(freeTarget.file, freeTarget.checkpoint);
      applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: freeTarget.file.heatCapacityMode });
      return createWorkbenchActiveModeCheckpointOverride(
        freeTarget.file.id,
        freeTarget.file.heatCapacityMode,
        freeTarget.checkpoint,
      );
    }
    const rebasedFile = targetFile.runState === 'running'
      ? {
          ...targetFile,
          lastUpdateMs: now,
          displayResponseLastUpdateMs: now,
          updatedAt: now,
        }
      : targetFile;
    commitHeatCapacityFileProjection(rebasedFile);
    applyHeatCapacityModeUiProjection(rebasedFile, null);
    applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: rebasedFile.heatCapacityMode });
    return createWorkbenchActiveModeCheckpointOverride(
      rebasedFile.id,
      rebasedFile.heatCapacityMode,
      null,
    );
  };

  const stopHeatCapacityTeachingModeToFree = (
    sourceMode: 'demo' | 'guide',
    reason: HeatCapacityModeTransitionReason = sourceMode === 'demo'
      ? 'demo-terminated'
      : 'guide-exited',
  ) => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== sourceMode) return;
    switchHeatCapacityMode(
      'free',
      reason,
      true,
    );
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
      switchHeatCapacityMode('free', 'demo-error-fallback', true);
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

  const createWorkspacePersistenceSnapshot = (
    activeModeCheckpointOverride?: WorkbenchActiveModeCheckpointOverride,
  ): WorkbenchWorkspacePersistenceSnapshot => {
    const snapshotCapturedAtMs = desktopExitQuiescedAtMsRef.current ?? Date.now();
    const activePersistenceFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const pendingRefreshSession = selectPendingWorkbenchHeatCapacityRefreshSession({
      restorePending: heatCapacityRefreshRestorePendingRef.current,
      initialRefreshSession: initialHeatCapacityRefreshSession,
      activeFileId: activePersistenceFile?.kind === 'heatCapacity' ? activePersistenceFile.id : null,
      activeMode: activePersistenceFile?.kind === 'heatCapacity'
        ? activePersistenceFile.heatCapacityMode
        : null,
    });
    const checkpointOverride = activePersistenceFile?.kind === 'heatCapacity'
      ? resolveWorkbenchActiveModeCheckpointOverride(
          activePersistenceFile.id,
          activePersistenceFile.heatCapacityMode,
          activeModeCheckpointOverride,
        )
      : { provided: false, checkpoint: null };
    const refreshSession = activePersistenceFile?.kind === 'heatCapacity'
      ? pendingRefreshSession ?? (checkpointOverride.provided
        ? null
        : buildCurrentHeatCapacityRefreshSession(null, snapshotCapturedAtMs))
      : null;
    const activeModeCheckpoint = activePersistenceFile?.kind === 'heatCapacity'
      ? pendingRefreshSession
        ? null
        : checkpointOverride.provided
        ? checkpointOverride.checkpoint
        : buildHeatCapacityModeUiCheckpoint(activePersistenceFile, snapshotCapturedAtMs)
      : null;
    return {
      files: filesRef.current,
      closedFiles: closedFilesRef.current,
      activeFileId: activeFileIdRef.current,
      selectedPanel: selectedPanelRef.current,
      refreshSession,
      activeModeCheckpoint,
      preserveActiveHeatCapacityModeSession: pendingRefreshSession !== null,
    };
  };
  scheduleWorkspacePersistenceRef.current = () => {
    workspacePersistenceSchedulerRef.current?.schedule(createWorkspacePersistenceSnapshot);
  };
  flushWorkspacePersistenceRef.current = async (activeModeCheckpointOverride) => {
    const snapshot = createWorkspacePersistenceSnapshot(activeModeCheckpointOverride);
    const scheduler = workspacePersistenceSchedulerRef.current;
    if (!scheduler) return false;
    scheduler.schedule(() => snapshot);
    return scheduler.flush();
  };
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
      if (!desktopExitQuiescedRef.current) return;
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

  const createEditSnapshotFiles = () => {
    const currentFiles = filesRef.current;
    const currentFile = currentFiles.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return currentFiles;
    if (activeFileOwnsPendingHeatCapacityRefresh(currentFile)) return currentFiles;
    const deferredGuideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
    captureHeatCapacityModeSceneMetadata(currentFile.id);
    const now = Date.now();
    const checkpoint = buildHeatCapacityModeUiCheckpoint(currentFile, now, deferredGuideCheckpoint);
    const suspendedFile = suspendHeatCapacityModeSession(currentFile, checkpoint, now);
    return currentFiles.map((file) => file.id === suspendedFile.id ? suspendedFile : file);
  };

  const createFilePresentationSnapshot = (
    file: WorkbenchFileState,
  ): WorkbenchFilePresentationSnapshot => {
    if (file.kind === 'standard') {
      return {
        kind: 'standard',
        state: structuredClone({
          visiblePanels: file.visiblePanels,
          liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
          standardResultsLayout: file.standardResultsLayout,
        }),
      };
    }
    if (file.kind === 'ideal') {
      return {
        kind: 'ideal',
        state: structuredClone({
          visiblePanels: file.visiblePanels,
          liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
          idealWindowLayout: file.idealWindowLayout,
        }),
      };
    }
    if (file.kind === 'heatCapacity') {
      return {
        kind: 'heatCapacity',
        state: structuredClone({
          visiblePanels: file.visiblePanels,
          liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
          openHeatCapacityTabs: file.openHeatCapacityTabs,
          activeHeatCapacityTabId: file.activeHeatCapacityTabId,
          heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight,
          heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded,
        }),
      };
    }
    return {
      kind: 'heatCapacityPistonOscillation',
      state: structuredClone({
        visiblePanels: file.visiblePanels,
        liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
        previewCameraPreset: file.previewCameraPreset,
      }),
    };
  };

  const createEditSnapshot = (
    label: string,
    scope: WorkbenchEditScope = 'file',
    fileId = activeFileIdRef.current,
  ): WorkbenchEditSnapshot => {
    if (scope === 'presentation') {
      const targetFile = filesRef.current.find((file) => file.id === fileId);
      if (!targetFile) throw new Error(`Cannot snapshot missing workbench file: ${fileId}.`);
      return {
        kind: 'presentation',
        label,
        fileId,
        presentation: createFilePresentationSnapshot(targetFile),
        selectedPanel: selectedPanelRef.current,
      };
    }
    const sourceFiles = scope === 'workspace' || fileId === activeFileIdRef.current
      ? createEditSnapshotFiles()
      : filesRef.current;
    if (scope === 'workspace') {
      return {
        kind: 'workspace',
        label,
        files: cloneWorkbenchFiles(sourceFiles),
        closedFiles: cloneWorkbenchFiles(closedFilesRef.current),
        activeFileId: activeFileIdRef.current,
        selectedPanel: selectedPanelRef.current,
      };
    }
    const targetFile = sourceFiles.find((file) => file.id === fileId);
    if (!targetFile) throw new Error(`Cannot snapshot missing workbench file: ${fileId}.`);
    return {
      kind: 'file',
      label,
      fileId,
      file: cloneWorkbenchFiles([targetFile])[0]!,
      selectedPanel: selectedPanelRef.current,
    };
  };

  const reconcileRuntimesAfterRestore = (restoredFiles: WorkbenchFileState[]) => {
    Object.keys(standardRuntimeRef.current).forEach((fileId) => {
      cancelRuntimeFrame(fileId);
    });
    Object.keys(idealRuntimeRef.current).forEach((fileId) => {
      cancelRuntimeFrame(fileId);
    });
    standardRuntimeRef.current = {};
    idealRuntimeRef.current = {};

    restoredFiles.forEach((file) => {
      if (file.kind === 'standard') {
        const runtime = createStandardRuntime(file);
        if (runtime) {
          standardRuntimeRef.current[file.id] = runtime;
        }
        return;
      }

      if (file.kind !== 'ideal') return;
      const runtime = createIdealRuntime(file);
      if (runtime) idealRuntimeRef.current[file.id] = runtime;
    });
  };

  const reconcileRuntimeAfterFileRestore = (file: WorkbenchFileState) => {
    cancelRuntimeFrame(file.id);
    delete standardRuntimeRef.current[file.id];
    delete idealRuntimeRef.current[file.id];
    if (file.kind !== 'standard' && file.kind !== 'ideal') return;
    const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
    if (!runtime) return;
    if (file.kind === 'standard') {
      standardRuntimeRef.current[file.id] = runtime;
    } else {
      idealRuntimeRef.current[file.id] = runtime;
    }
  };

  const clearEditRestoreTransientUi = () => {
    setParameterInputDrafts({});
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setRenameDraft('');
    setOpenTopMenu(null);
  };

  const restorePresentationSnapshot = (snapshot: WorkbenchPresentationEditSnapshot) => {
    setWorkbenchFiles((current) => current.map((file) => {
      if (file.id !== snapshot.fileId || file.kind !== snapshot.presentation.kind) return file;
      return {
        ...file,
        ...structuredClone(snapshot.presentation.state),
      } as WorkbenchFileState;
    }));
    if (activeFileIdRef.current === snapshot.fileId) {
      selectedPanelRef.current = snapshot.selectedPanel;
      setSelectedPanel(snapshot.selectedPanel);
    }
    scheduleWorkspacePersistenceRef.current();
  };

  const restoreFileSnapshot = (snapshot: WorkbenchFileEditSnapshot) => {
    const restoringActiveFile = activeFileIdRef.current === snapshot.fileId;
    const currentFile = filesRef.current.find((file) => file.id === snapshot.fileId);
    if (!currentFile) return;
    if (restoringActiveFile && currentFile.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    const clonedFile = cloneWorkbenchFiles([snapshot.file])[0]!;
    const restoredFile = clonedFile.kind !== 'heatCapacity' && clonedFile.runState === 'running'
      ? { ...clonedFile, runState: 'paused' as const }
      : clonedFile;
    const restoredFiles = filesRef.current.map((file) => file.id === snapshot.fileId ? restoredFile : file);
    commitWorkbenchFileCollections(restoredFiles, closedFilesRef.current, activeFileIdRef.current);
    reconcileRuntimeAfterFileRestore(restoredFile);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (restoringActiveFile && restoredFile.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(restoredFile.id);
    }
    if (restoringActiveFile) {
      selectedPanelRef.current = snapshot.selectedPanel;
      setSelectedPanel(snapshot.selectedPanel);
      setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(restoredFile));
    }
    clearEditRestoreTransientUi();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
  };

  const restoreWorkspaceSnapshot = (snapshot: WorkbenchWorkspaceEditSnapshot) => {
    const currentActiveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (currentActiveFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    const restoredFiles = cloneWorkbenchFiles(snapshot.files).map((file) => (
      file.kind !== 'heatCapacity' && file.runState === 'running'
        ? { ...file, runState: 'paused' as const }
        : file
    ));
    const activeExists = restoredFiles.some((file) => file.id === snapshot.activeFileId);
    const nextActiveFileId = activeExists ? snapshot.activeFileId : restoredFiles[0]?.id ?? '';
    const restoredClosedFiles = cloneWorkbenchFiles(snapshot.closedFiles);
    selectedPanelRef.current = snapshot.selectedPanel;
    commitWorkbenchFileCollections(restoredFiles, restoredClosedFiles, nextActiveFileId);
    reconcileRuntimesAfterRestore(restoredFiles);
    const nextActiveFile = restoredFiles.find((file) => file.id === nextActiveFileId);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (nextActiveFile?.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(nextActiveFile.id);
    }
    setSelectedPanel(snapshot.selectedPanel);
    setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(nextActiveFile));
    clearEditRestoreTransientUi();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
  };

  const restoreSnapshot = (snapshot: WorkbenchEditSnapshot) => {
    if (snapshot.kind === 'presentation') {
      restorePresentationSnapshot(snapshot);
      return;
    }
    if (snapshot.kind === 'file') {
      restoreFileSnapshot(snapshot);
      return;
    }
    restoreWorkspaceSnapshot(snapshot);
  };

  const pushUndoSnapshot = (snapshot: WorkbenchEditSnapshot) => {
    const nextUndoStack = trimWorkbenchEditHistory([...undoStackRef.current, snapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = [];
    setUndoStack(nextUndoStack);
    setRedoStack([]);
  };

  const captureUndoSnapshot = (
    label: string,
    scope: WorkbenchEditScope = 'file',
    fileId = activeFileIdRef.current,
  ) => {
    pushUndoSnapshot(createEditSnapshot(label, scope, fileId));
  };

  const undoLastEdit = () => {
    const snapshot = undoStackRef.current[undoStackRef.current.length - 1];
    if (!snapshot) return;
    if (
      snapshot.kind !== 'workspace' &&
      !filesRef.current.some((file) => file.id === snapshot.fileId)
    ) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setUndoStack([]);
      setRedoStack([]);
      return;
    }

    const currentSnapshot = createEditSnapshot(
      snapshot.label,
      snapshot.kind,
      snapshot.kind === 'workspace' ? activeFileIdRef.current : snapshot.fileId,
    );
    const nextUndoStack = undoStackRef.current.slice(0, -1);
    const nextRedoStack = trimWorkbenchEditHistory([...redoStackRef.current, currentSnapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = nextRedoStack;
    setUndoStack(nextUndoStack);
    setRedoStack(nextRedoStack);
    restoreSnapshot(snapshot);
    pushLog(
      (language) => workbenchCopies[language].logs.undoAction(
        getLocalizedWorkbenchEditLabel(snapshot.label, language),
      ),
      'warning',
    );
  };

  const redoLastEdit = () => {
    const snapshot = redoStackRef.current[redoStackRef.current.length - 1];
    if (!snapshot) return;
    if (
      snapshot.kind !== 'workspace' &&
      !filesRef.current.some((file) => file.id === snapshot.fileId)
    ) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setUndoStack([]);
      setRedoStack([]);
      return;
    }

    const currentSnapshot = createEditSnapshot(
      snapshot.label,
      snapshot.kind,
      snapshot.kind === 'workspace' ? activeFileIdRef.current : snapshot.fileId,
    );
    const nextRedoStack = redoStackRef.current.slice(0, -1);
    const nextUndoStack = trimWorkbenchEditHistory([...undoStackRef.current, currentSnapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = nextRedoStack;
    setUndoStack(nextUndoStack);
    setRedoStack(nextRedoStack);
    restoreSnapshot(snapshot);
    pushLog(
      (language) => workbenchCopies[language].logs.redoAction(
        getLocalizedWorkbenchEditLabel(snapshot.label, language),
      ),
      'success',
    );
  };

  const clearEditHistory = () => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
    setOpenTopMenu(null);
    pushLog((language) => workbenchCopies[language].logs.editHistoryCleared, 'warning');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeHeatCapacityModalLocked) return;
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

  const startSidebarResize = (side: 'left' | 'params', event: React.MouseEvent) => {
    if (openTopMenu) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = side === 'left' ? leftSidebarWidth : parameterSidebarWidth;
    const workspaceShellWidth = workspaceShellRef.current?.getBoundingClientRect().width ?? 0;
    let pendingSidebarWidth = startWidth;
    let didResize = false;

    const updateSidebarGhost = () => {
      if (side === 'left') {
        sidebarResizeGhostRef.current?.style.setProperty('--studio-left-resize-ghost-x', `${pendingSidebarWidth}px`);
        return;
      }
      parameterSidebarResizeGhostRef.current?.style.setProperty(
        '--studio-params-resize-ghost-x',
        `${Math.max(0, workspaceShellWidth - pendingSidebarWidth)}px`,
      );
    };
    updateSidebarGhost();

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      pendingSidebarWidth = side === 'left'
        ? clamp(startWidth + delta, LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX)
        : clamp(startWidth - delta, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX);
      didResize = true;
      scheduleResizeGhostUpdate(updateSidebarGhost);
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      document.body.classList.remove('studio-resizing');
      workbenchBodyRef.current?.classList.remove('studio-left-sidebar-resizing');
      workspaceShellRef.current?.classList.remove('studio-params-sidebar-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (commit && didResize) {
        if (side === 'left') {
          setLeftSidebarWidth(pendingSidebarWidth);
        } else {
          setParameterSidebarWidth(pendingSidebarWidth);
        }
      }
    };

    const handleUp = () => finishResize(true);

    document.body.classList.add('studio-resizing');
    if (side === 'left') {
      workbenchBodyRef.current?.classList.add('studio-left-sidebar-resizing');
    } else {
      workspaceShellRef.current?.classList.add('studio-params-sidebar-resizing');
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startIdealResultWindowResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'ideal') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = idealResultWindowRegionRef.current?.getBoundingClientRect().height
      ?? centerWorkspaceRef.current?.getBoundingClientRect().height
      ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized ideal result window', 'presentation');
    const startY = event.clientY;
    const startRatio = activeFile.idealWindowLayout.heightRatio;
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = startRatio + deltaRatio;
      const clampedRatio = clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, IDEAL_RESULT_MAX_HEIGHT_RATIO);
      didResize = true;
      updateActiveFile((file) => {
        if (file.kind !== 'ideal') return file;
        return {
          ...file,
          idealWindowLayout: {
            ...file.idealWindowLayout,
            heightRatio: clampedRatio,
            hasCustomHeight: true,
          },
          updatedAt: Date.now(),
        };
      });
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) {
        pushUndoSnapshot(snapshot);
      }
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const getStandardResultsMaxHeightRatio = () => {
    const workspaceRect = centerWorkspaceRef.current?.getBoundingClientRect();
    const fileTabsRect = fileTabsRef.current?.getBoundingClientRect();
    if (!workspaceRect || workspaceRect.height <= 0) return IDEAL_RESULT_MAX_HEIGHT_RATIO;

    const fileTabOverlap = fileTabsRect
      ? Math.max(0, fileTabsRect.bottom - workspaceRect.top)
      : 0;
    const reservedTopSpace = Math.max(RESIZER_GRAB_SAFE_SPACE, fileTabOverlap + RESIZER_GRAB_SAFE_SPACE);
    const availableHeight = workspaceRect.height - STANDARD_RESULTS_BOTTOM_INSET - reservedTopSpace;
    return clamp(
      availableHeight / workspaceRect.height,
      IDEAL_RESULT_MIN_HEIGHT_RATIO,
      IDEAL_RESULT_MAX_HEIGHT_RATIO,
    );
  };

  const getHeatCapacityMaterialsMaxHeightRatio = () => {
    const workspaceRect = centerWorkspaceRef.current?.getBoundingClientRect();
    if (!workspaceRect || workspaceRect.height <= 0) return IDEAL_RESULT_MAX_HEIGHT_RATIO;

    const liveWorkspaceRect = liveWorkspaceRef.current?.getBoundingClientRect();
    if (liveWorkspaceRect && liveWorkspaceRect.height > 0) {
      const liveWorkspaceCoverageHeight = liveWorkspaceRect.height;
      return clamp(
        liveWorkspaceCoverageHeight / workspaceRect.height,
        HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
        IDEAL_RESULT_MAX_HEIGHT_RATIO,
      );
    }

    const fileTabsRect = fileTabsRef.current?.getBoundingClientRect();
    const fileTabOverlap = fileTabsRect
      ? Math.max(0, fileTabsRect.bottom - workspaceRect.top)
      : 0;
    const reservedTopSpace = Math.max(RESIZER_GRAB_SAFE_SPACE, fileTabOverlap + RESIZER_GRAB_SAFE_SPACE);
    const availableHeight = workspaceRect.height - STANDARD_RESULTS_BOTTOM_INSET - reservedTopSpace;
    return clamp(
      availableHeight / workspaceRect.height,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      IDEAL_RESULT_MAX_HEIGHT_RATIO,
    );
  };

  const startStandardResultsResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'standard') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized standard Results window', 'presentation');
    const startY = event.clientY;
    const startRatio = normalizeStandardResultsLayout(activeFile.standardResultsLayout).heightRatio;
    const maxHeightRatio = getStandardResultsMaxHeightRatio();
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = startRatio + deltaRatio;
      didResize = true;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          standardResultsLayout: {
            ...normalizeStandardResultsLayout(file.standardResultsLayout),
            heightRatio: clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, maxHeightRatio),
          },
          updatedAt: Date.now(),
        };
      });
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) {
        pushUndoSnapshot(snapshot);
      }
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startHeatCapacityMaterialsResize = (event: React.MouseEvent) => {
    if (activeFile.kind !== 'heatCapacity') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized heat-capacity materials window', 'presentation');
    const startY = event.clientY;
    const maxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio();
    const startRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      maxHeightRatio,
    );
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = clamp(
        startRatio + deltaRatio,
        HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
        maxHeightRatio,
      );
      didResize = true;
      updateActiveFile((file) => (
        file.kind === 'heatCapacity'
          ? { ...file, heatCapacityTabContainerHeight: nextRatio, updatedAt: Date.now() }
          : file
      ));
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) pushUndoSnapshot(snapshot);
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const cancelResizeGhostFrame = () => {
    if (resizeGhostFrameRef.current === null) return;
    window.cancelAnimationFrame(resizeGhostFrameRef.current);
    resizeGhostFrameRef.current = null;
  };

  const scheduleResizeGhostUpdate = (updateGhost: () => void) => {
    cancelResizeGhostFrame();
    resizeGhostFrameRef.current = window.requestAnimationFrame(() => {
      resizeGhostFrameRef.current = null;
      updateGhost();
    });
  };

  const startLiveWorkspaceResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (isWorkbenchEmpty) return;
    const workspace = liveWorkspaceRef.current ?? event.currentTarget.parentElement;
    if (!workspace) return;

    event.preventDefault();
    event.stopPropagation();

    const initialWorkspaceRect = workspace.getBoundingClientRect();
    const resizerWidth = event.currentTarget.getBoundingClientRect().width || 8;
    if (initialWorkspaceRect.width <= resizerWidth) return;

    const getNextRatio = (clientX: number) => {
      const workspaceRect = workspace.getBoundingClientRect();
      const availableWidth = workspaceRect.width - resizerWidth;
      if (availableWidth <= 0) return clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
      return clamp(
        (clientX - workspaceRect.left - resizerWidth / 2) / availableWidth,
        WORKBENCH_LIVE_SPLIT_MIN_RATIO,
        WORKBENCH_LIVE_SPLIT_MAX_RATIO,
      );
    };

    let pendingLiveWorkspaceSplitRatio = liveWorkspaceSplitRatio;
    let didResize = false;
    liveWorkspaceResizeGhostRef.current?.style.setProperty(
      '--studio-live-resize-ghost-x',
      `${(pendingLiveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    );

    const handleMove = (moveEvent: PointerEvent) => {
      pendingLiveWorkspaceSplitRatio = getNextRatio(moveEvent.clientX);
      didResize = true;
      scheduleResizeGhostUpdate(() => {
        liveWorkspaceResizeGhostRef.current?.style.setProperty(
          '--studio-live-resize-ghost-x',
          `${(pendingLiveWorkspaceSplitRatio * 100).toFixed(3)}%`,
        );
      });
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      setLiveWorkspaceResizing(false);
      document.body.classList.remove('studio-horizontal-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (commit && didResize) {
        updateActiveFile((file) => ({
          ...file,
          liveWorkspaceSplitRatio: pendingLiveWorkspaceSplitRatio,
          updatedAt: Date.now(),
        }));
      }
    };
    const handleUp = () => finishResize(true);
    const handleCancel = () => finishResize(false);

    setLiveWorkspaceResizing(true);
    document.body.classList.add('studio-horizontal-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const startConsoleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (consoleCollapsed) return;
    event.preventDefault();
    event.stopPropagation();
    const shellRect = shellRef.current?.getBoundingClientRect();
    const consoleRect = event.currentTarget.parentElement?.getBoundingClientRect();
    const shellHeight = shellRect?.height ?? window.innerHeight;
    const footerHeight = shellRect && consoleRect ? Math.max(0, shellRect.bottom - consoleRect.bottom) : 24;
    consoleResizeRef.current = {
      startY: event.clientY,
      startHeight: consoleHeightPx,
      shellHeight,
      footerHeight,
    };
    let pendingConsoleHeightPx = consoleHeightPx;
    let didResize = false;
    shellRef.current?.classList.add('studio-console-resizing');
    consoleResizeGhostRef.current?.style.setProperty(
      '--studio-console-resize-ghost-y',
      `${shellHeight - footerHeight - pendingConsoleHeightPx}px`,
    );

    const handleMove = (moveEvent: PointerEvent) => {
      const resizeState = consoleResizeRef.current;
      if (!resizeState) return;
      const maxHeight = Math.max(180, Math.min(420, Math.round(window.innerHeight * 0.48)));
      pendingConsoleHeightPx = clamp(resizeState.startHeight + resizeState.startY - moveEvent.clientY, 96, maxHeight);
      didResize = true;
      scheduleResizeGhostUpdate(() => {
        consoleResizeGhostRef.current?.style.setProperty(
          '--studio-console-resize-ghost-y',
          `${resizeState.shellHeight - resizeState.footerHeight - pendingConsoleHeightPx}px`,
        );
      });
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      consoleResizeRef.current = null;
      shellRef.current?.classList.remove('studio-console-resizing');
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (commit && didResize) {
        setConsoleHeightPx(pendingConsoleHeightPx);
      }
    };
    const handleUp = () => finishResize(true);
    const handleCancel = () => finishResize(false);

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const saveCurrentWorkbenchLayoutAsDefault = () => {
    if (isWorkbenchEmpty) {
      pushLog((language) => workbenchCopies[language].logs.layoutSaveNeedsFile, 'warning');
      return;
    }

    const nextFileDefaults = sanitizeWorkbenchLayoutDefaultState({
      resultsHeightRatio: activeFile.kind === 'ideal'
        ? normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal).heightRatio
        : activeFile.kind === 'standard'
          ? normalizeStandardResultsLayout(activeFile.standardResultsLayout, workbenchLayoutDefaults.standard).heightRatio
          : activeFile.kind === 'heatCapacity'
            ? workbenchLayoutDefaults.heatCapacity.resultsHeightRatio
            : workbenchLayoutDefaults.heatCapacityPistonOscillation.resultsHeightRatio,
      liveWorkspaceSplitRatio: activeFile.liveWorkspaceSplitRatio,
    });
    const nextDefaults = sanitizeWorkbenchLayoutDefaults({
      ...workbenchLayoutDefaults,
      [activeFile.kind]: nextFileDefaults,
    });

    setWorkbenchLayoutDefaults(nextDefaults);
    persistWorkbenchLayoutDefaults(nextDefaults);
    setOpenTopMenu(null);
    pushLog(
      (language) => workbenchCopies[language].logs.layoutDefaultSaved(activeFile.name),
      'success',
    );
  };

  const cancelRuntimeFrame = (fileId: string) => {
    const runtime = standardRuntimeRef.current[fileId] ?? idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId === null) return;

    window.clearTimeout(runtime.simulationTimerId);
    runtime.simulationTimerId = null;
  };

  const createHardSphereEngine = (
    params: SimulationParams,
    snapshot: PhysicsEngineSnapshotV2 | null,
  ): PhysicsEngine => (
    snapshot && areWorkbenchParamsEqual(snapshot.params, params)
      ? PhysicsEngine.fromSnapshot(snapshot)
      : new PhysicsEngine(cloneParams(params))
  );

  const createStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;
    return {
      engine: createHardSphereEngine(file.appliedParams, file.hardSphereEngineSnapshot),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const createIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    return {
      engine: createHardSphereEngine(file.activeParams, file.hardSphereEngineSnapshot),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const prepareReopenedWorkbenchFile = (file: WorkbenchFileState): WorkbenchFileState => {
    const baseFile = {
      ...file,
      runState: file.kind === 'heatCapacity'
        ? file.runState
        : file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    if (baseFile.kind !== 'standard' && baseFile.kind !== 'ideal') {
      return baseFile;
    }

    const runtime = baseFile.kind === 'standard'
      ? createStandardRuntime(baseFile)
      : createIdealRuntime(baseFile);
    if (!runtime) return baseFile;

    if (baseFile.kind === 'standard') {
      standardRuntimeRef.current[baseFile.id] = runtime;
    } else {
      idealRuntimeRef.current[baseFile.id] = runtime;
    }

    return {
      ...baseFile,
      stats: runtime.engine.getStats(),
      chartData: runtime.engine.getHistogramData(false),
      particles: snapshotParticles(runtime.engine),
      hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
      ...(baseFile.kind === 'ideal' ? { latestPressureSummary: runtime.engine.getPressureMeasurementSummary() } : {}),
    };
  };

  const getStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;

    const existingRuntime = standardRuntimeRef.current[file.id];
    if (existingRuntime && areWorkbenchParamsEqual(existingRuntime.engine.params, file.appliedParams)) {
      return existingRuntime;
    }

    cancelRuntimeFrame(file.id);
    const nextRuntime = createStandardRuntime(file);
    if (nextRuntime) {
      standardRuntimeRef.current[file.id] = nextRuntime;
    }
    return nextRuntime;
  };

  const getIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    const existingRuntime = idealRuntimeRef.current[file.id];
    if (existingRuntime && areWorkbenchParamsEqual(existingRuntime.engine.params, file.activeParams)) {
      return existingRuntime;
    }

    cancelRuntimeFrame(file.id);
    const nextRuntime = createIdealRuntime(file);
    if (nextRuntime) {
      idealRuntimeRef.current[file.id] = nextRuntime;
    }
    return nextRuntime;
  };

  const pauseRunningFilesExcept = (fileId: string) => {
    const runningFiles = filesRef.current.filter(
      (file) => file.id !== fileId && file.runState === 'running',
    );

    runningFiles.forEach((file) => {
      cancelRuntimeFrame(file.id);
      updateFileById(file.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
        pushLog(
          (language) => workbenchCopies[language].logs.autoPausedSingleRuntime(file.name),
          'warning',
        );
    });
  };

  const scheduleStandardFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const runtime = standardRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId !== null) return;

    runtime.simulationTimerId = window.setTimeout(() => {
      runtime.simulationTimerId = null;
      runStandardFrame(fileId);
    }, SIMULATION_TICK_INTERVAL_MS);
  };

  const runStandardFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    const runtime = file ? standardRuntimeRef.current[file.id] : null;
    if (!file || file.kind !== 'standard' || !runtime || file.runState !== 'running') return;

    for (let stepIndex = 0; stepIndex < 5; stepIndex += 1) {
      runtime.engine.step();
      if (
        runtime.engine.time >= runtime.engine.params.equilibriumTime &&
        runtime.engine.time < runtime.engine.params.equilibriumTime + runtime.engine.params.statsDuration
      ) {
        runtime.engine.collectSamples();
      }
    }

    const stats = runtime.engine.getStats();
    const particles = snapshotParticles(runtime.engine);
    runtime.frameCount += 1;
    const shouldRefreshChart = runtime.frameCount % 5 === 0 || stats.phase === 'finished';
    const chartData = shouldRefreshChart ? runtime.engine.getHistogramData(false) : file.chartData;
    const finished = stats.phase === 'finished';
    const finalChartData = finished ? runtime.engine.getHistogramData(true) : file.finalChartData;

    updateFileById(file.id, (currentFile) => {
      if (currentFile.kind !== 'standard') return currentFile;
      return {
        ...currentFile,
        runState: finished ? 'finished' : 'running',
        stats,
        chartData,
        finalChartData,
        particles,
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        updatedAt: Date.now(),
      };
    });

    if (finished) {
      cancelRuntimeFrame(file.id);
      pushLog(
        (language) => workbenchCopies[language].logs.standardFinished(file.name),
        'success',
      );
      pushLog(
        (language) => workbenchCopies[language].logs.standardResultsReady(file.name),
        'success',
      );
      return;
    }

    scheduleStandardFrame(file.id);
  };

  const scheduleIdealFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const runtime = idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId !== null) return;

    runtime.simulationTimerId = window.setTimeout(() => {
      runtime.simulationTimerId = null;
      runIdealFrame(fileId);
    }, SIMULATION_TICK_INTERVAL_MS);
  };

  const runIdealFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    const runtime = file ? idealRuntimeRef.current[file.id] : null;
    if (!file || file.kind !== 'ideal' || !runtime || file.runState !== 'running') return;

    for (let stepIndex = 0; stepIndex < 5; stepIndex += 1) {
      runtime.engine.step();
      if (
        runtime.engine.time >= runtime.engine.params.equilibriumTime &&
        runtime.engine.time < runtime.engine.params.equilibriumTime + runtime.engine.params.statsDuration
      ) {
        runtime.engine.collectSamples();
      }
    }

    const stats = runtime.engine.getStats();
    const particles = snapshotParticles(runtime.engine);
    runtime.frameCount += 1;
    const shouldRefreshChart = runtime.frameCount % 5 === 0 || stats.phase === 'finished';
    const chartData = shouldRefreshChart ? runtime.engine.getHistogramData(false) : file.chartData;
    const finished = stats.phase === 'finished';

    if (!finished) {
      const latestPressureSummary = runtime.engine.getPressureMeasurementSummary();
      updateFileById(file.id, (currentFile) => {
        if (currentFile.kind !== 'ideal') return currentFile;
        return {
          ...currentFile,
          runState: 'running',
          stats,
          chartData,
          latestPressureSummary,
          particles,
          hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
          verificationState: 'collecting',
          updatedAt: Date.now(),
        };
      });
      scheduleIdealFrame(file.id);
      return;
    }

    runtime.engine.flushPressureMeasurement();
    const latestPressureSummary = runtime.engine.getPressureMeasurementSummary();
    const recordedPoint = createIdealGasExperimentPoint(file.relation, file.activeParams, latestPressureSummary);

    updateFileById(file.id, (currentFile) => {
      if (currentFile.kind !== 'ideal') return currentFile;

      const nextPointsByRelation = recordedPoint
        ? {
            ...currentFile.pointsByRelation,
            [currentFile.relation]: [...currentFile.pointsByRelation[currentFile.relation], recordedPoint],
          }
        : currentFile.pointsByRelation;
      const analysis = getIdealGasAnalysis(currentFile.relation, nextPointsByRelation, currentFile.activeParams);
      const verificationState = getIdealVerificationState(analysis);

      return {
        ...currentFile,
        runState: 'finished',
        stats,
        chartData: runtime.engine.getHistogramData(false),
        latestPressureSummary,
        particles,
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        pointsByRelation: nextPointsByRelation,
        verificationState,
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });

    cancelRuntimeFrame(file.id);
    pushLog(
      (language) => recordedPoint
        ? workbenchCopies[language].logs.idealPointRecorded(file.name, getRelationLabel(file.relation), formatMetric(getRelationVariableNumericValue(file.relation, file.activeParams), 3))
        : workbenchCopies[language].logs.idealPointMissingSummary(file.name),
      recordedPoint ? 'success' : 'warning',
    );
  };

  prepareDesktopExitQuiescenceRef.current = () => {
    if (desktopExitQuiescedRef.current) return;
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

  const rejectLockedIdealControlledVariables = (nextParams: SimulationParams) => {
    if (activeFile.kind !== 'ideal') return false;
    const lockedKeys = getLockedIdealControlledVariableKeys(nextParams);
    if (lockedKeys.length === 0) return false;

    const message = workbenchCopy.logs.controlledVariablesLocked(activeFile.name, getRelationLabel(activeFile.relation), lockedKeys.join(', '));
    setParameterErrors([message]);
    pushLog(
      (language) => workbenchCopies[language].logs.controlledVariablesLocked(activeFile.name, getRelationLabel(activeFile.relation), lockedKeys.join(', ')),
      'warning',
    );
    return true;
  };

  const clearWorkbenchParameterInputDraft = (paramKey: string) => {
    setParameterInputDrafts((current) => {
      const { [paramKey]: _removed, ...rest } = current;
      return rest;
    });
  };

  const revertWorkbenchParameterInput = (paramKey: string) => {
    clearWorkbenchParameterInputDraft(paramKey);
    setParameterErrors([]);
  };

  const commitWorkbenchParameterInput = (
    param: WorkbenchParameterRow,
    rawValue: string,
  ) => {
    if (parameterControlsLocked) {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeEditingParameters(activeFile.name),
        'warning',
      );
      return;
    }

    if (!param.editable) {
      clearWorkbenchParameterInputDraft(param.key);
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      setParameterErrors([workbenchCopy.logs.invalidParameter(activeFile.name, param.label, rawValue)]);
      pushLog(
        (language) => workbenchCopies[language].logs.invalidParameter(
          activeFile.name,
          getWorkbenchParameterDisplayLabel(param, workbenchCopies[language]),
          rawValue,
        ),
        'error',
      );
      return;
    }

    const nextParams = cloneParams(activeFile.params);
    assignWorkbenchParameterValue(nextParams, param.key, parsedValue);

    if (areWorkbenchParamsEqual(nextParams, activeFile.params)) {
      clearWorkbenchParameterInputDraft(param.key);
      setParameterErrors([]);
      return;
    }

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      showWorkbenchValidationErrors(validation);
      return;
    }

    if (rejectLockedIdealControlledVariables(nextParams)) return;

    const appliedRuntime = applyActiveFileParams(nextParams);
    if (appliedRuntime || activeFile.kind !== 'standard') {
      clearWorkbenchParameterInputDraft(param.key);
    }
  };

  const applyActiveFileParams = (
    paramsOverride?: SimulationParams,
    options: ApplyActiveFileParamsOptions = {},
  ): StandardEngineRuntime | null => {
    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      setParameterErrors([]);
      return null;
    }
    if (activeFile.runState === 'running') {
      if (!options.silent) pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeApplyingParameters(activeFile.name),
        'warning',
      );
      return null;
    }

    const nextParams = paramsOverride ? cloneParams(paramsOverride) : cloneParams(activeFile.params);
    if (rejectLockedIdealControlledVariables(nextParams)) return null;
    const parameterValidation = validateWorkbenchParams(nextParams);
    if (!parameterValidation.valid) {
      showWorkbenchValidationErrors(parameterValidation);
      return null;
    }

    const hasOverride = Boolean(paramsOverride);
    const nextParamsAlreadyApplied = areWorkbenchParamsEqual(nextParams, activeFile.appliedParams);
    const willChangeSavedParams = !areWorkbenchParamsEqual(nextParams, activeFile.params);
    const willChangeAppliedParams = !nextParamsAlreadyApplied;
    const forceReset = options.forceReset === true;

    if (activeFile.kind === 'ideal' && !forceReset && !hasOverride && !parametersDirty && !activeFile.needsReset) {
      if (!options.silent) pushLog(
        (language) => workbenchCopies[language].logs.idealRuntimeAlreadyApplied(activeFile.name),
      );
      return getIdealRuntime(activeFile);
    }

    if (activeFile.kind === 'standard' && !forceReset && !hasOverride && !parametersDirty) {
      if (!options.silent) pushLog(
        (language) => workbenchCopies[language].logs.noSavedParameterChanges(activeFile.name),
      );
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'heatCapacity') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        showWorkbenchValidationErrors(validation);
        return null;
      }

      if (willChangeSavedParams || willChangeAppliedParams) {
        captureUndoSnapshot(hasOverride ? 'saved heat capacity parameters' : 'applied heat capacity parameters');
      }
      updateActiveFile((file) => {
        if (file.kind !== 'heatCapacity') return file;
        return {
          ...file,
          params: nextParams,
          appliedParams: cloneParams(nextParams),
          updatedAt: Date.now(),
        };
      });
      setParameterErrors([]);
      if (!options.silent) {
        pushLog((language) => {
          if (language === 'zh-CN') return `${activeFile.name}：热容比界面参数已保存；未启动模拟运行时。`;
          if (language === 'zh-TW') return `${activeFile.name}：熱容比介面參數已儲存；未啟動模擬執行階段。`;
          return `${activeFile.name}: heat-capacity UI parameters saved; no simulation runtime started.`;
        }, 'success');
      }
      return null;
    }

    if (activeFile.kind === 'standard' && !forceReset && hasOverride && nextParamsAlreadyApplied) {
      if (willChangeSavedParams) {
        captureUndoSnapshot('saved parameters');
      }
      updateActiveFile((file) => ({
        ...file,
        params: nextParams,
        updatedAt: Date.now(),
      }));
      setParameterErrors([]);
      if (!options.silent) pushLog((language) => {
        if (language === 'zh-CN') return `${activeFile.name}：编辑后的参数与已应用运行时一致，无需重建。`;
        if (language === 'zh-TW') return `${activeFile.name}：編輯後的參數與已套用執行階段一致，無需重建。`;
        return `${activeFile.name}: edited parameters match the applied runtime. No rebuild needed.`;
      });
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'ideal') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        showWorkbenchValidationErrors(validation);
        return null;
      }

      const changedKeys = getChangedIdealParamKeys(activeFile.activeParams, nextParams);
      const nextActiveParams = cloneParams(nextParams);
      const nextRuntime: StandardEngineRuntime = {
        engine: new PhysicsEngine(nextActiveParams),
        frameCount: 0,
        simulationTimerId: null,
      };
      const nextPointsByRelation = activeFile.pointsByRelation;
      const analysis = getIdealGasAnalysis(activeFile.relation, nextPointsByRelation, nextActiveParams);

      if (willChangeSavedParams || willChangeAppliedParams || activeFile.needsReset || forceReset) {
        captureUndoSnapshot(hasOverride ? 'saved and applied ideal parameters' : 'applied ideal parameters');
      }

      cancelRuntimeFrame(activeFile.id);
      idealRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'ideal') return file;
        return {
          ...file,
          params: nextParams,
          appliedParams: cloneParams(nextActiveParams),
          activeParams: nextActiveParams,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
          needsReset: false,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          pointsByRelation: nextPointsByRelation,
          verificationState: getIdealVerificationState(analysis),
          historyUnlocked: analysis.isVerified,
          updatedAt: Date.now(),
        };
      });
      setParameterErrors([]);
      if (!options.silent) {
        pushLog(
          (language) => workbenchCopies[language].logs.idealRuntimeApplied(
            activeFile.name,
            getRelationLabel(activeFile.relation),
            changedKeys.length > 0 ? changedKeys.join(', ') : workbenchCopies[language].results.noneValue,
          ),
          'success',
        );
      }
      return nextRuntime;
    }

    const nextAppliedParams = cloneParams(nextParams);
    const nextRuntime: StandardEngineRuntime = {
      engine: new PhysicsEngine(nextAppliedParams),
      frameCount: 0,
      simulationTimerId: null,
    };

    if (willChangeSavedParams || willChangeAppliedParams || forceReset) {
      captureUndoSnapshot(hasOverride ? 'saved and applied parameters' : 'applied parameters');
    }
    cancelRuntimeFrame(activeFile.id);
    standardRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => ({
      ...file,
      params: nextParams,
      appliedParams: nextAppliedParams,
      runState: 'idle',
      stats: nextRuntime.engine.getStats(),
      chartData: nextRuntime.engine.getHistogramData(false),
      finalChartData: null,
      particles: snapshotParticles(nextRuntime.engine),
      hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
      updatedAt: Date.now(),
    }));
    setParameterErrors([]);
    if (!options.silent) {
      pushLog(
        (language) => workbenchCopies[language].logs.standardParametersApplied(
          activeFile.name,
          hasOverride
            ? workbenchCopies[language].logs.parametersSavedAndApplied
            : workbenchCopies[language].logs.parametersApplied,
        ),
        'success',
      );
    }
    return nextRuntime;
  };

  const prepareActiveFileForRun = (): boolean => {
    if (activeFile.runState === 'paused') return true;

    if (parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset) || activeFile.runState === 'finished') {
      const appliedRuntime = applyActiveFileParams(undefined, { silent: true, forceReset: activeFile.runState === 'finished' });
      if (!appliedRuntime) return false;
      return true;
    }

    return true;
  };

  const runActiveFile = () => {
    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      setParameterErrors([]);
      setSamplingPresetMenuOpen(false);
      return;
    }
    if (activeFile.kind === 'heatCapacity') {
      if (parametersDirty) {
        applyActiveFileParams(undefined, { silent: true });
      }
      setParameterErrors([]);
      setSamplingPresetMenuOpen(false);
      runHeatCapacityAutoDemo();
      return;
    }

    if (!prepareActiveFileForRun()) {
      return;
    }

    setParameterErrors([]);
    setSamplingPresetMenuOpen(false);
    pauseRunningFilesExcept(activeFile.id);
    const runtime = activeFile.kind === 'standard'
      ? standardRuntimeRef.current[activeFile.id] ?? getStandardRuntime(activeFile)
      : idealRuntimeRef.current[activeFile.id] ?? getIdealRuntime(activeFile);
    if (!runtime) {
      pushLog(
        (language) => workbenchCopies[language].logs.runtimeCreateFailed(
          activeFile.name,
          activeFile.kind === 'standard'
            ? workbenchCopies[language].parameters.standardSimulation
            : workbenchCopies[language].parameters.idealSimulation,
        ),
        'error',
      );
      return;
    }

    updateActiveFile((file) => {
      const baseFile = {
        ...file,
        runState: 'running' as const,
        stats: runtime.engine.getStats(),
        chartData: runtime.engine.getHistogramData(false),
        particles: snapshotParticles(runtime.engine),
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        updatedAt: Date.now(),
      };

      if (file.kind !== 'ideal') return baseFile;
      return {
        ...baseFile,
        latestPressureSummary: runtime.engine.getPressureMeasurementSummary(),
        verificationState: 'collecting' as const,
      };
    });
    pushLog(
      (language) => activeFile.kind === 'standard'
        ? workbenchCopies[language].logs.standardStarted(activeFile.name)
        : workbenchCopies[language].logs.idealStarted(activeFile.name, getRelationLabel(activeFile.relation)),
      'success',
    );
    if (activeFile.kind === 'standard') {
      scheduleStandardFrame(activeFile.id);
    } else {
      scheduleIdealFrame(activeFile.id);
    }
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
    stopHeatCapacityTeachingModeToFree('demo');
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

  const pauseActiveFile = () => {
    if (activeFile.kind === 'heatCapacityPistonOscillation') return;
    if (activeFile.kind === 'heatCapacity') {
      pauseHeatCapacityAutoDemo();
      return;
    }

    cancelRuntimeFrame(activeFile.id);
    updateActiveFile((file) => ({
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
    }));
    pushLog(
      (language) => workbenchCopies[language].logs.simulationPaused(
        activeFile.name,
        activeFile.kind === 'standard'
          ? workbenchCopies[language].parameters.standardSimulation
          : workbenchCopies[language].parameters.idealSimulation,
      ),
      'warning',
    );
  };

  const toggleActiveFileRunState = () => {
    if (activeFile.runState === 'running') {
      pauseActiveFile();
      return;
    }

    runActiveFile();
  };

  const stopActiveFile = () => {
    cancelRuntimeFrame(activeFile.id);

    if (activeFile.kind === 'heatCapacityPistonOscillation') return;

    if (activeFile.kind === 'heatCapacity') {
      terminateHeatCapacityAutoDemo();
      return;
    }

    if (activeFile.kind === 'standard') {
      const nextRuntime = createStandardRuntime(activeFile);
      if (!nextRuntime) return;

      standardRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          updatedAt: Date.now(),
        };
      });
      pushLog(
        (language) => workbenchCopies[language].logs.standardTerminated(activeFile.name),
        'warning',
      );
      return;
    }

    const nextRuntime = createIdealRuntime(activeFile);
    if (!nextRuntime) return;

    idealRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        runState: 'idle',
        stats: nextRuntime.engine.getStats(),
        chartData: nextRuntime.engine.getHistogramData(false),
        finalChartData: null,
        latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
        needsReset: false,
        particles: snapshotParticles(nextRuntime.engine),
        hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    pushLog(
      (language) => workbenchCopies[language].logs.idealTerminated(activeFile.name),
      'warning',
    );
  };

  useEffect(() => {
    filesRef.current
      .forEach((file) => {
        if (file.kind !== 'standard' && file.kind !== 'ideal') return;
        const runtimeExists = file.kind === 'standard'
          ? Boolean(standardRuntimeRef.current[file.id])
          : Boolean(idealRuntimeRef.current[file.id]);
        if (runtimeExists) return;

        const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
        if (!runtime) return;

        if (file.kind === 'standard') {
          standardRuntimeRef.current[file.id] = runtime;
        } else {
          idealRuntimeRef.current[file.id] = runtime;
        }
        if (file.hardSphereEngineSnapshot !== null && file.particles.length > 0) return;

        updateFileById(file.id, (currentFile) => {
          const initializedFile = {
            ...currentFile,
            stats: runtime.engine.getStats(),
            chartData: runtime.engine.getHistogramData(false),
            particles: snapshotParticles(runtime.engine),
            hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
            updatedAt: Date.now(),
          };

          if (currentFile.kind !== 'ideal') return initializedFile;
          return {
            ...initializedFile,
            latestPressureSummary: runtime.engine.getPressureMeasurementSummary(),
          };
        });
      });
  }, []);

  const createFile = (kind: WorkbenchFileKind) => {
    captureUndoSnapshot(`created ${kind} file`, 'workspace');
    const currentFiles = [...filesRef.current, ...closedFilesRef.current];
    const index = getNextWorkbenchFileDisplayIndex(kind, currentFiles);
    const fileId = createUniqueWorkbenchFileId(kind, issuedWorkbenchFileIdsRef.current);
    issuedWorkbenchFileIdsRef.current.add(fileId);
    let file: WorkbenchFileState;
    switch (kind) {
      case 'standard':
        file = createDefaultStandardFile(index, workbenchLayoutDefaults.standard);
        break;
      case 'ideal':
        file = createDefaultIdealFile(index, workbenchLayoutDefaults.ideal);
        break;
      case 'heatCapacity':
        file = createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity);
        break;
      case 'heatCapacityPistonOscillation':
        file = createDefaultHeatCapacityPistonOscillationFile(
          index,
          workbenchLayoutDefaults.heatCapacityPistonOscillation,
        );
        break;
      default:
        file = assertNeverWorkbenchFileKind(kind);
    }
    file = {
      ...file,
      id: fileId,
    };

    if (file.kind === 'standard' || file.kind === 'ideal') {
      const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
      if (runtime) {
        if (file.kind === 'standard') {
          standardRuntimeRef.current[file.id] = runtime;
        } else {
          idealRuntimeRef.current[file.id] = runtime;
        }
        file = {
          ...file,
          stats: runtime.engine.getStats(),
          chartData: runtime.engine.getHistogramData(false),
          particles: snapshotParticles(runtime.engine),
          hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
          ...(file.kind === 'ideal' ? { latestPressureSummary: runtime.engine.getPressureMeasurementSummary() } : {}),
        };
      }
    }

    const currentActiveFile = filesRef.current.find(
      (candidate) => candidate.id === activeFileIdRef.current,
    );
    if (currentActiveFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    } else if (currentActiveFile?.runState === 'running') {
      cancelRuntimeFrame(currentActiveFile.id);
      const pausedFiles = filesRef.current.map((candidate) => candidate.id === currentActiveFile.id
        ? {
            ...candidate,
            runState: 'paused' as const,
            updatedAt: Date.now(),
          }
        : candidate);
      filesRef.current = pausedFiles;
      setFiles(pausedFiles);
      pushLog(
        (language) => workbenchCopies[language].logs.autoPausedCreateFile(currentActiveFile.name),
        'warning',
      );
    }

    const nextFiles = [...filesRef.current, file];
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(nextFiles, closedFilesRef.current, file.id);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (file.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(file.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setSelectedPanel('preview');
    setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(file));
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    pushLog(
      (language) => workbenchCopies[language].logs.fileCreated(file.name),
      'success',
    );
  };

  const openNewWorkbenchWindow = () => {
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

  const minimizeDesktopWindow = () => {
    void window.hardSphereLabWindow?.minimize?.()
      .then((state) => {
        if (state) setDesktopWindowMaximized(Boolean(state.maximized));
      })
      .catch(() => undefined);
  };

  const toggleDesktopWindowMaximize = () => {
    void window.hardSphereLabWindow?.toggleMaximize?.()
      .then((state) => {
        if (state) setDesktopWindowMaximized(Boolean(state.maximized));
      })
      .catch(() => undefined);
  };

  const closeDesktopWindow = () => {
    void window.hardSphereLabWindow?.close?.();
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

  const handleLockedPanel = (title: string) => {
    pushLog(
      (language) => workbenchCopies[language].logs.lockedPanel(
        getLocalizedWorkbenchPanelTitle(title, language),
      ),
      'warning',
    );
  };

  const normalizeIdealResultLayout = (
    file: WorkbenchIdealState,
    visible: boolean,
    tab: WorkbenchIdealResultWindowKey = file.idealWindowLayout.activeIdealResultTab,
    openAllTabs = false,
    replaceOpenTabs = false,
    defaults = workbenchLayoutDefaults.ideal,
  ): WorkbenchIdealState => {
    const currentLayout = normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults);
    const openTabs = openAllTabs
      ? idealResultWindowKeys
      : replaceOpenTabs
        ? [tab]
        : currentLayout.openTabs.includes(tab)
        ? currentLayout.openTabs
        : [...currentLayout.openTabs, tab];
    return {
      ...file,
      visiblePanels: visible
        ? [
            ...file.visiblePanels.filter((panel) => !isIdealResultWindowKey(panel) && panel !== 'results'),
            'results',
          ]
        : file.visiblePanels.filter((panel) => !isIdealResultWindowKey(panel) && panel !== 'results'),
      idealWindowLayout: {
        ...currentLayout,
        openTabs,
        activeIdealResultTab: tab,
        heightRatio: clampIdealResultHeightRatio(currentLayout.heightRatio),
      },
      updatedAt: Date.now(),
    };
  };

  const setActiveIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    if (activeFile.kind !== 'ideal') return;
    setSelectedPanel(tab);
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        idealWindowLayout: {
          ...normalizeIdealWindowLayoutState(file.idealWindowLayout, workbenchLayoutDefaults.ideal),
          activeIdealResultTab: tab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const openIdealResultTab = (tab: WorkbenchIdealResultWindowKey, options: { openAllTabs?: boolean; replaceOpenTabs?: boolean } = {}) => {
    if (activeFile.kind !== 'ideal') return;
    setResultsChildrenCollapsed(false);
    setSelectedPanel(tab);

    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    const nextOpenTabs = options.openAllTabs
      ? idealResultWindowKeys
      : options.replaceOpenTabs
        ? [tab]
        : layout.openTabs.includes(tab)
        ? layout.openTabs
        : [...layout.openTabs, tab];
    const isLayoutChange = !activeFile.visiblePanels.includes('results')
      || nextOpenTabs.length !== layout.openTabs.length
      || nextOpenTabs.some((item) => !layout.openTabs.includes(item));

    if (!isLayoutChange) {
      setActiveIdealResultTab(tab);
      return;
    }

    captureUndoSnapshot(
      activeFile.visiblePanels.includes('results') ? `opened ${tab} tab` : 'opened ideal Results window',
      'presentation',
    );
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return normalizeIdealResultLayout(file, true, tab, Boolean(options.openAllTabs), Boolean(options.replaceOpenTabs));
    });
    pushLog(
      (language) => workbenchCopies[language].logs.idealResultsOpened(
        activeFile.name,
        createIdealPanels(workbenchCopies[language]).find((panel) => panel.key === tab)?.title ?? tab,
      ),
    );
  };

  const openIdealResultsWindow = (tab: WorkbenchIdealResultWindowKey = 'experimentPoints', openAllTabs = false, replaceOpenTabs = false) => {
    openIdealResultTab(tab, { openAllTabs, replaceOpenTabs });
  };

  const openIdealResultWindow = (panel: WorkbenchIdealResultWindowKey) => {
    const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
    openIdealResultsWindow(panel, false, replaceOpenTabs);
  };

  const closeIdealResultsWindow = (recordUndo = true) => {
    if (activeFile.kind !== 'ideal') return;
    if (!activeFile.visiblePanels.includes('results')) return;

    if (recordUndo) captureUndoSnapshot('closed ideal Results window', 'presentation');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return normalizeIdealResultLayout(file, false);
    });
    if (isIdealResultWindowKey(selectedPanel)) setSelectedPanel('preview');
    pushLog(
      (language) => workbenchCopies[language].logs.idealResultsClosed(activeFile.name),
    );
  };

  const closeIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    if (activeFile.kind !== 'ideal') return;
    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    if (!layout.openTabs.includes(tab)) return;

    captureUndoSnapshot(
      `closed ${idealResultWindowPanels.find((panel) => panel.key === tab)?.title ?? tab} tab`,
      'presentation',
    );
    if (layout.openTabs.length <= 1) {
      closeIdealResultsWindow(false);
      return;
    }

    const nextOpenTabs = layout.openTabs.filter((item) => item !== tab);
    const nextActiveTab = layout.activeIdealResultTab === tab
      ? pickNextOpenTab(layout.openTabs, tab) ?? nextOpenTabs[0]
      : layout.activeIdealResultTab;
    setSelectedPanel(nextActiveTab);
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        idealWindowLayout: {
          ...normalizeIdealWindowLayoutState(file.idealWindowLayout, workbenchLayoutDefaults.ideal),
          openTabs: nextOpenTabs,
          activeIdealResultTab: nextActiveTab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const setActiveStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    if (activeFile.kind !== 'standard') return;
    setSelectedPanel('results');
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return {
        ...file,
        standardResultsLayout: {
          ...normalizeStandardResultsLayout(file.standardResultsLayout),
          activeTab: tab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const openStandardResultsWindow = (tab: WorkbenchStandardResultsTab = 'summary', openAllTabs = false, replaceOpenTabs = false) => {
    if (activeFile.kind !== 'standard') return;
    setResultsChildrenCollapsed(false);
    setSelectedPanel('results');

    const layout = normalizeStandardResultsLayout(activeFile.standardResultsLayout);
    const nextOpenTabs = openAllTabs
      ? standardResultsTabKeys
      : replaceOpenTabs
        ? [tab]
        : layout.openTabs.includes(tab)
        ? layout.openTabs
        : [...layout.openTabs, tab];
    const isLayoutChange = !activeFile.visiblePanels.includes('results')
      || nextOpenTabs.length !== layout.openTabs.length
      || nextOpenTabs.some((item) => !layout.openTabs.includes(item));

    if (!isLayoutChange) {
      setActiveStandardResultsTab(tab);
      return;
    }

    captureUndoSnapshot(
      activeFile.visiblePanels.includes('results') ? `opened ${tab} tab` : 'opened Results panel',
      'presentation',
    );
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return {
        ...file,
        visiblePanels: file.visiblePanels.includes('results') ? file.visiblePanels : [...file.visiblePanels, 'results'],
        standardResultsLayout: {
          ...normalizeStandardResultsLayout(file.standardResultsLayout),
          openTabs: nextOpenTabs,
          activeTab: tab,
        },
        updatedAt: Date.now(),
      };
    });
    pushLog(
      (language) => workbenchCopies[language].logs.standardResultsOpened(
        activeFile.name,
        createResultsSections(workbenchCopies[language]).find((section) => section.key === tab)?.title ?? tab,
      ),
    );
  };

  const closeStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    if (activeFile.kind !== 'standard') return;
    const layout = normalizeStandardResultsLayout(activeFile.standardResultsLayout);
    if (!layout.openTabs.includes(tab)) return;

    captureUndoSnapshot(
      `closed ${resultsSections.find((section) => section.key === tab)?.title ?? tab} tab`,
      'presentation',
    );
    if (layout.openTabs.length <= 1) {
      closePanel('results', false);
      return;
    }

    const nextOpenTabs = layout.openTabs.filter((item) => item !== tab);
    const nextActiveTab = layout.activeTab === tab
      ? pickNextOpenTab(layout.openTabs, tab) ?? nextOpenTabs[0]
      : layout.activeTab;
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return {
        ...file,
        standardResultsLayout: {
          ...normalizeStandardResultsLayout(file.standardResultsLayout),
          openTabs: nextOpenTabs,
          activeTab: nextActiveTab,
        },
        updatedAt: Date.now(),
      };
    });
  };

  const getHeatCapacityPanelDisplayDefinition = (tabId: WorkbenchHeatCapacityTabId, panel: PanelDefinition): PanelDefinition => {
    if (
      activeFile.kind === 'heatCapacity' &&
      (activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide') &&
      tabId === 'records'
    ) {
      return {
        ...panel,
        title: heatCapacityRealtimeCopy.dataResultsTitle,
        hint: heatCapacityRealtimeCopy.dataResultsHint,
      };
    }
    return panel;
  };

  const getHeatCapacityTabDefinition = (tabId: WorkbenchHeatCapacityTabId) => {
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    const panel = availablePanels.find((item) => item.key === panelKey) ?? availablePanels[0];
    return getHeatCapacityPanelDisplayDefinition(tabId, panel);
  };

  const getHeatCapacityTabState = (tabId: WorkbenchHeatCapacityTabId) => {
    if (activeFile.kind !== 'heatCapacity') return 'off';
    if (tabId === 'records') {
      return heatCapacityCalculationWindowOpen ? 'active' : 'off';
    }
    if (activeFile.activeHeatCapacityTabId === tabId && activeFile.openHeatCapacityTabs.includes(tabId)) return 'active';
    return activeFile.openHeatCapacityTabs.includes(tabId) ? 'open' : 'off';
  };

  const activateHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId) => {
    const tabId = requestedTabId;
    if (activeFile.kind !== 'heatCapacity' || !activeFile.openHeatCapacityTabs.includes(tabId)) return;
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    setSelectedPanel(panelKey);
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? { ...file, activeHeatCapacityTabId: tabId, updatedAt: Date.now() }
        : file
    ));
  };

  const openHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    const tabId = requestedTabId;
    if (activeFile.kind !== 'heatCapacity') return;
    const allowedTabs = getHeatCapacityMaterialsTabOrder(activeFile);
    if (!allowedTabs.includes(tabId)) return;
    if (tabId === 'records') {
      const ensuredFile = ensureHeatCapacityCalculationSessionWorkbenchState(
        activeFile,
        Date.now(),
      );
      if (!getHeatCapacityCalculationSession(ensuredFile)) return;
      updateActiveFile((file) => (
        file.kind === 'heatCapacity' && file.id === ensuredFile.id
          ? ensureHeatCapacityCalculationSessionWorkbenchState(file, Date.now())
          : file
      ));
      setSelectedPanel('heatCapacityRecords');
      setHeatCapacityCalculationReviewOpen(true);
      return;
    }
    if (
      tabId === 'review' &&
      activeFile.heatCapacityMode === 'free' &&
      activeHeatCapacityCalculationSession?.status !== 'completed'
    ) {
      return;
    }
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    const alreadyOpen = activeFile.openHeatCapacityTabs.includes(tabId);
    setSelectedPanel(panelKey);
    if (recordUndo && !alreadyOpen) {
      captureUndoSnapshot(
        `opened ${getHeatCapacityTabDefinition(tabId)?.title ?? tabId} heat-capacity tab`,
        'presentation',
      );
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const openHeatCapacityTabs = file.openHeatCapacityTabs.includes(tabId)
        ? file.openHeatCapacityTabs
        : [...file.openHeatCapacityTabs, tabId];
      const visiblePanels = file.visiblePanels.includes(panelKey)
        ? file.visiblePanels
        : [...file.visiblePanels, panelKey];
      return {
        ...file,
        visiblePanels,
        openHeatCapacityTabs,
        activeHeatCapacityTabId: tabId,
        heatCapacityMaterialsExpanded: true,
        updatedAt: Date.now(),
      };
    });
  };

  const openAllHeatCapacityMaterialsTabs = () => {
    if (activeFile.kind !== 'heatCapacity') return;
    const heatCapacityTabOrder = getHeatCapacityMaterialsTabOrder(activeFile)
      .filter((tabId) => tabId !== 'records')
      .filter((tabId) => (
        tabId !== 'review' ||
        activeFile.heatCapacityMode !== 'free' ||
        activeHeatCapacityCalculationSession?.status === 'completed'
      ));
    const firstTabId = heatCapacityTabOrder[0] ?? 'guide';
    const firstPanelKey = heatCapacityTabIdToPanelKey(firstTabId);
    captureUndoSnapshot('opened heat-capacity materials tabs', 'presentation');
    setSelectedPanel(firstPanelKey);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const calculationSession = getHeatCapacityCalculationSession(file);
      const materialTabOrder = getHeatCapacityMaterialsTabOrder(file)
        .filter((tabId) => tabId !== 'records')
        .filter((tabId) => (
          tabId !== 'review' ||
          file.heatCapacityMode !== 'free' ||
          calculationSession?.status === 'completed'
        ));
      const panelKeys = materialTabOrder.map(heatCapacityTabIdToPanelKey);
      const activeTabId = materialTabOrder[0] ?? 'guide';
      return {
        ...file,
        visiblePanels: Array.from(new Set([...file.visiblePanels, ...panelKeys])),
        openHeatCapacityTabs: [...materialTabOrder],
        activeHeatCapacityTabId: activeTabId,
        heatCapacityMaterialsExpanded: true,
        updatedAt: Date.now(),
      };
    });
  };

  const closeHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    const tabId = requestedTabId;
    if (activeFile.kind !== 'heatCapacity' || !activeFile.openHeatCapacityTabs.includes(tabId)) return;
    const tabIndex = activeFile.openHeatCapacityTabs.indexOf(tabId);
    const nextOpenTabs = activeFile.openHeatCapacityTabs.filter((tab) => tab !== tabId);
    const nextActiveTab = activeFile.activeHeatCapacityTabId === tabId
      ? nextOpenTabs[tabIndex] ?? nextOpenTabs[tabIndex - 1] ?? null
      : activeFile.activeHeatCapacityTabId;
    const nextSelectedPanel = nextActiveTab ? heatCapacityTabIdToPanelKey(nextActiveTab) : 'preview';
    if (recordUndo) {
      captureUndoSnapshot(
        `closed ${getHeatCapacityTabDefinition(tabId)?.title ?? tabId} heat-capacity tab`,
        'presentation',
      );
    }
    setSelectedPanel(nextSelectedPanel);
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity') return file;
      const panelKey = heatCapacityTabIdToPanelKey(tabId);
      return {
        ...file,
        visiblePanels: file.visiblePanels.filter((panel) => panel !== panelKey),
        openHeatCapacityTabs: file.openHeatCapacityTabs.filter((tab) => tab !== tabId),
        activeHeatCapacityTabId: nextActiveTab,
        updatedAt: Date.now(),
      };
    });
  };

  const toggleWindowHeatCapacityTab = (tabId: WorkbenchHeatCapacityTabId) => {
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.openHeatCapacityTabs.includes(tabId)) {
      closeHeatCapacityTab(tabId);
    } else {
      openHeatCapacityTab(tabId);
    }
  };

  const openPanel = (panel: WorkbenchPanelKey) => {
    if (isPistonOscillationDevelopmentPanelKey(activeFile, panel)) {
      showPistonOscillationDevelopmentNotice('navigationItem');
      return;
    }
    setSelectedPanel(panel);
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal') {
      if (panel === 'results') {
        openIdealResultsWindow('experimentPoints', true);
        return;
      }
      if (isIdealResultWindowKey(panel)) {
        openIdealResultsWindow(panel);
        return;
      }
    }

    if (activeFile.kind === 'standard' && panel === 'results') {
      openStandardResultsWindow('summary', true);
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) openHeatCapacityTab(tabId);
      return;
    }

    if (activeFile.visiblePanels.includes(panel)) return;

    captureUndoSnapshot(
      `opened ${availablePanels.find((item) => item.key === panel)?.title ?? panel} panel`,
      'presentation',
    );
    setWorkbenchFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        return {
          ...file,
          visiblePanels: [...file.visiblePanels, panel],
        };
      }),
    );
    const panelTitle = availablePanels.find((item) => item.key === panel)?.title ?? panel;
    pushLog(
      (language) => workbenchCopies[language].logs.panelOpened(
        activeFile.name,
        getLocalizedWorkbenchPanelTitle(panelTitle, language),
      ),
    );
  };

  const closePanel = (panel: WorkbenchPanelKey, recordUndo = true) => {
    if (isPistonOscillationDevelopmentPanelKey(activeFile, panel)) {
      showPistonOscillationDevelopmentNotice('navigationItem');
      return;
    }
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal' && isIdealResultWindowKey(panel)) {
      closeIdealResultsWindow();
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) closeHeatCapacityTab(tabId, recordUndo);
      return;
    }

    if (!activeFile.visiblePanels.includes(panel)) return;

    if (recordUndo) {
      captureUndoSnapshot(
        `closed ${availablePanels.find((item) => item.key === panel)?.title ?? panel} panel`,
        'presentation',
      );
    }
    setWorkbenchFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        return {
          ...file,
          visiblePanels: file.visiblePanels.filter((item) => item !== panel),
        };
      }),
    );
    if (selectedPanel === panel) setSelectedPanel('preview');
    const panelTitle = availablePanels.find((item) => item.key === panel)?.title ?? panel;
    pushLog(
      (language) => workbenchCopies[language].logs.panelClosed(
        activeFile.name,
        getLocalizedWorkbenchPanelTitle(panelTitle, language),
      ),
    );
  };

  const togglePanel = (panel: WorkbenchPanelKey) => {
    if (isPistonOscillationDevelopmentPanelKey(activeFile, panel)) {
      showPistonOscillationDevelopmentNotice('navigationItem');
      return;
    }
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      setSelectedPanel(panel);
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.visiblePanels.includes(panel)) {
      closePanel(panel);
    } else {
      openPanel(panel);
    }
  };

  const isWindowPanelVisible = (panel: WorkbenchPanelKey) => (
    activeFile.visiblePanels.includes(panel)
  );

  const toggleWindowPanel = (panel: WorkbenchPanelKey) => {
    if (isPistonOscillationDevelopmentPanelKey(activeFile, panel)) {
      showPistonOscillationDevelopmentNotice('navigationItem');
      return;
    }
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      setSelectedPanel(panel);
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal' && panel === 'results') {
      if (isWindowPanelVisible(panel)) {
        closeIdealResultsWindow();
      } else {
        openIdealResultsWindow('experimentPoints', true);
      }
      return;
    }

    if (activeFile.kind === 'standard' && panel === 'results') {
      if (isWindowPanelVisible(panel)) {
        closePanel('results');
      } else {
        openStandardResultsWindow('summary', true);
      }
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) toggleWindowHeatCapacityTab(tabId);
      return;
    }

    togglePanel(panel);
  };

  const toggleWindowIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    const state = getIdealResultTabState(tab);
    if (state === 'off') {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openIdealResultsWindow(tab, false, replaceOpenTabs);
    } else {
      closeIdealResultTab(tab);
    }
  };

  const toggleWindowStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    const state = getStandardResultsTabState(tab);
    if (state === 'off') {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openStandardResultsWindow(tab, false, replaceOpenTabs);
    } else {
      closeStandardResultsTab(tab);
    }
  };

  const runWindowMenuSwitch = (action: () => void) => {
    action();
    setOpenTopMenu(null);
  };

  const selectResultsSection = (section: ResultsSectionKey, openResults = false) => {
    setSelectedPanel('results');
    if (activeFile.kind !== 'standard') return;
    if (openResults) {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openStandardResultsWindow(section, false, replaceOpenTabs);
    }
  };

  const getIdealResultTabState = (tab: WorkbenchIdealResultWindowKey) => {
    if (activeFile.kind !== 'ideal' || !activeFile.visiblePanels.includes('results')) return 'off';
    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    if (layout.activeIdealResultTab === tab) return 'active';
    return layout.openTabs.includes(tab) ? 'open' : 'off';
  };

  const getStandardResultsTabState = (tab: WorkbenchStandardResultsTab) => {
    if (activeFile.kind !== 'standard' || !activeFile.visiblePanels.includes('results')) return 'off';
    const layout = normalizeStandardResultsLayout(activeFile.standardResultsLayout);
    if (layout.activeTab === tab) return 'active';
    return layout.openTabs.includes(tab) ? 'open' : 'off';
  };

  const getLocalizedTreeState = (state: 'locked' | 'shown' | 'open' | 'active' | 'off') => workbenchCopy.files[state];

  const changeIdealRelation = (nextRelation: ExperimentRelation) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeSwitchingRelation(activeFile.name),
        'warning',
      );
      return;
    }
    if (activeFile.relation === nextRelation) {
      pushLog(
        (language) => workbenchCopies[language].logs.relationAlreadyActive(activeFile.name, getRelationLabel(nextRelation)),
      );
      return;
    }

    captureUndoSnapshot('changed ideal relation');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(nextRelation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        relation: nextRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    setSamplingPresetMenuOpen(false);
    pushLog(
      (language) => workbenchCopies[language].logs.relationSwitched(activeFile.name, getRelationLabel(nextRelation)),
      'success',
    );
  };

  const applyIdealSamplingPreset = (preset: IdealSamplingPreset) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeChangingSamplingPreset(activeFile.name),
        'warning',
      );
      return;
    }

    applyActiveFileParams({
      ...activeFile.params,
      equilibriumTime: preset.equilibriumTime,
      statsDuration: preset.statsDuration,
    });
  };

  const getSnappedIdealScanValue = (relation: ExperimentRelation, rawValue: number) => {
    const presetSequence = getPresetSequence(relation);
    const threshold = IDEAL_SCAN_SNAP_THRESHOLD[relation];
    const closest = presetSequence.reduce(
      (best, preset) => {
        const distance = Math.abs(preset - rawValue);
        return distance < best.distance ? { value: preset, distance } : best;
      },
      { value: rawValue, distance: Number.POSITIVE_INFINITY },
    );

    return closest.distance <= threshold ? closest.value : rawValue;
  };

  const showScanInputError = (
    message: string,
    getMessage: WorkbenchConsoleMessageFactory,
    options: { refocus?: boolean; rawValue?: string } = {},
  ) => {
    setScanInputError(message);
    setParameterErrors([message]);
    setScanInputToast(message);
    const errorKey = `${message}\n${options.rawValue ?? ''}`;
    if (lastScanInputErrorRef.current !== errorKey) {
      lastScanInputErrorRef.current = errorKey;
      pushLog((language) => `${activeFile.name}: ${getMessage(language)}`, 'error');
    }
    if (options.refocus) {
      window.setTimeout(() => {
        scanInputRef.current?.focus();
        scanInputRef.current?.select();
      }, 0);
    }
  };

  const clearScanInputError = () => {
    lastScanInputErrorRef.current = null;
    setScanInputError(null);
    setParameterErrors([]);
  };

  const parseIdealScanInput = (
    rawValue: string,
    relation: ExperimentRelation,
    scanMin: number,
    scanMax: number,
  ): { valid: true; value: number } | { valid: false; message: string; getMessage: WorkbenchConsoleMessageFactory } => {
    const trimmedValue = rawValue.trim();
    const relationKey = getRelationVariableKey(relation);
    const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
    const integerPattern = /^\d+$/;
    const decimals = getIdealScanDecimals(relation);
    const invalid = (getMessage: WorkbenchConsoleMessageFactory) => ({
      valid: false as const,
      message: getMessage(settingsLanguagePreference),
      getMessage,
    });

    if (!trimmedValue) {
      return invalid((language) => workbenchCopies[language].logs.scanInputRequired(
        String(relationKey),
        relationKey === 'N'
          ? workbenchCopies[language].logs.formatPositiveInteger
          : workbenchCopies[language].logs.formatDecimalNumber,
      ));
    }

    if (relationKey === 'N' && !integerPattern.test(trimmedValue)) {
      return invalid((language) => workbenchCopies[language].logs.scanInputIntegerOnly);
    }

    if (relationKey !== 'N' && !decimalPattern.test(trimmedValue)) {
      return invalid((language) => workbenchCopies[language].logs.scanInputDecimalOnly(String(relationKey)));
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return invalid((language) => workbenchCopies[language].logs.scanInputGreaterThanZero(String(relationKey)));
    }

    if (!isIdealScanValueOnStep(trimmedValue, relation)) {
      return invalid((language) => workbenchCopies[language].logs.scanInputStep(
        getIdealScanInputLabel(relation),
        getIdealScanStepLabel(relation),
      ));
    }

    if (parsedValue < scanMin || parsedValue > scanMax) {
      return invalid((language) => workbenchCopies[language].logs.scanInputRange(
        String(relationKey),
        formatMetric(scanMin, decimals),
        formatMetric(scanMax, decimals),
      ));
    }

    return { valid: true, value: relationKey === 'N' ? Math.round(parsedValue) : parsedValue };
  };

  const validateIdealScanDraft = (rawValue: string) => {
    if (activeFile.kind !== 'ideal') return true;
    const presetSequence = getPresetSequence(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const parsed = parseIdealScanInput(rawValue, activeFile.relation, scanMin, scanMax);

    if (parsed.valid === false) {
      showScanInputError(parsed.message, parsed.getMessage, { rawValue });
      return false;
    }

    clearScanInputError();
    return true;
  };

  const updateIdealScanVariable = (rawValue: number, options: UpdateIdealScanVariableOptions = {}) => {
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeChangingScanVariable(activeFile.name),
        'warning',
      );
      return;
    }

    const relationKey = getRelationVariableKey(activeFile.relation);
    const nextParams = cloneParams(activeFile.params);
    const snappedValue = options.snap === false ? rawValue : getSnappedIdealScanValue(activeFile.relation, rawValue);
    const nextValue = relationKey === 'N' ? Math.round(snappedValue) : snappedValue;
    const currentValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);

    if (Math.abs(nextValue - currentValue) <= 1e-6) return;

    if (relationKey === 'targetTemperature') nextParams.targetTemperature = nextValue;
    if (relationKey === 'L') nextParams.L = nextValue;
    if (relationKey === 'N') nextParams.N = Math.round(nextValue);

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      showWorkbenchValidationErrors(validation);
      return;
    }

    captureUndoSnapshot('changed ideal scan variable');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        params: nextParams,
        needsReset: true,
        updatedAt: Date.now(),
      };
    });
    setParameterErrors([]);
    setScanInputError(null);
    setScanInputDraft(formatMetric(nextValue, getIdealScanDecimals(activeFile.relation)));
  };

  const commitIdealScanInput = () => {
    if (activeFile.kind !== 'ideal') return;
    if (parameterControlsLocked) return;

    const presetSequence = getPresetSequence(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const parsed = parseIdealScanInput(scanInputDraft, activeFile.relation, scanMin, scanMax);

    if (parsed.valid === false) {
      showScanInputError(parsed.message, parsed.getMessage, { refocus: true, rawValue: scanInputDraft });
      return;
    }

    updateIdealScanVariable(parsed.value, { snap: false });
    scanInputRef.current?.blur();
    setScanInputFocused(false);
    clearScanInputError();
  };

  const isPointerOnIdealScanThumb = (
    event: React.PointerEvent<HTMLInputElement>,
    scanProgressPercent: number,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const thumbCenterX = rect.left
      + (IDEAL_SCAN_THUMB_SIZE / 2)
      + ((rect.width - IDEAL_SCAN_THUMB_SIZE) * scanProgressPercent) / 100;
    return Math.abs(event.clientX - thumbCenterX) <= IDEAL_SCAN_THUMB_HIT_RADIUS;
  };

  const requestRemoveIdealPoint = (point: IdealGasExperimentPoint) => {
    if (activeFile.kind !== 'ideal') return;

    if (pendingRemovePointId !== point.id) {
      setPendingRemovePointId(point.id);
      pushLog(
        (language) => workbenchCopies[language].logs.confirmRemoveIdealPoint(activeFile.name, getRelationLabel(point.relation)),
        'warning',
      );
      return;
    }

    captureUndoSnapshot('removed ideal experiment point');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPointsByRelation = {
        ...file.pointsByRelation,
        [point.relation]: file.pointsByRelation[point.relation].filter((candidate) => candidate.id !== point.id),
      };
      const analysis = getIdealGasAnalysis(file.relation, nextPointsByRelation, file.activeParams);
      return {
        ...file,
        pointsByRelation: nextPointsByRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingRemovePointId(null);
    pushLog(
      (language) => workbenchCopies[language].logs.idealPointRemoved(activeFile.name),
      'warning',
    );
  };

  const cancelRemoveIdealPoint = () => {
    setPendingRemovePointId(null);
  };

  const cancelClearIdealRelation = () => {
    setPendingClearRelationKey(null);
  };

  const renderIdealPointRemoveAction = (point: IdealGasExperimentPoint) => (
    <div className={`studio-table-action-row ${pendingRemovePointId === point.id ? 'studio-table-action-row-pending' : ''}`}>
      <button
        type="button"
        className={`studio-table-action ${pendingRemovePointId === point.id ? 'studio-table-action-confirm' : ''}`}
        onClick={() => requestRemoveIdealPoint(point)}
      >
        {pendingRemovePointId === point.id ? workbenchCopy.results.confirmRemove : workbenchCopy.results.remove}
      </button>
      {pendingRemovePointId === point.id ? (
        <button
          type="button"
          className="studio-table-action studio-table-action-cancel"
          aria-label={`${workbenchCopy.results.cancel} ${point.id}`}
          onClick={cancelRemoveIdealPoint}
        >
          {workbenchCopy.results.cancel}
        </button>
      ) : null}
    </div>
  );

  const requestClearIdealRelation = () => {
    if (activeFile.kind !== 'ideal') return;

    const points = activeFile.pointsByRelation[activeFile.relation];
    if (points.length === 0) {
      pushLog(
        (language) => workbenchCopies[language].logs.relationHasNoPoints(activeFile.name, getRelationLabel(activeFile.relation)),
      );
      return;
    }

    const clearKey = `${activeFile.id}:${activeFile.relation}`;
    if (pendingClearRelationKey !== clearKey) {
      setPendingClearRelationKey(clearKey);
      pushLog(
        (language) => workbenchCopies[language].logs.confirmClear(activeFile.name, getRelationLabel(activeFile.relation)),
        'warning',
      );
      return;
    }

    captureUndoSnapshot('cleared ideal relation points');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPointsByRelation = {
        ...file.pointsByRelation,
        [file.relation]: [],
      };
      const analysis = getIdealGasAnalysis(file.relation, nextPointsByRelation, file.activeParams);
      return {
        ...file,
        pointsByRelation: nextPointsByRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingClearRelationKey(null);
    setPendingRemovePointId(null);
    pushLog(
      (language) => workbenchCopies[language].logs.clearedRelation(activeFile.name, getRelationLabel(activeFile.relation)),
      'warning',
    );
  };

  const beginRenameFile = (file: WorkbenchFileState) => {
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    renamingFileIdRef.current = file.id;
    renameSelectionModeRef.current = 'initial';
    setRenamingFileId(file.id);
    setRenameDraft(file.name);
  };

  const selectRenameNumericSuffix = (input: HTMLInputElement) => {
    const numericSuffix = input.value.match(/\d+$/);
    if (!numericSuffix || numericSuffix.index === undefined) {
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    input.setSelectionRange(numericSuffix.index, input.value.length);
  };

  const commitRenameFile = (fileId: string) => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      pushLog((language) => workbenchCopies[language].logs.fileNameCannotBeEmpty, 'error');
      return;
    }

    const targetFile = files.find((file) => file.id === fileId);
    if (targetFile && targetFile.name === nextName) {
      cancelRenameFile();
      pushLog((language) => workbenchCopies[language].logs.fileNameUnchanged(nextName));
      return;
    }

    captureUndoSnapshot('renamed file', 'file', fileId);
    updateFileById(fileId, (file) => ({
      ...file,
      name: nextName,
      updatedAt: Date.now(),
    }));
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
    pushLog((language) => workbenchCopies[language].logs.fileRenamed(nextName), 'success');
  };

  const cancelRenameFile = () => {
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
  };

  const commitRenameFileFromOutside = () => {
    const fileId = renamingFileIdRef.current;
    if (!fileId) return;

    const nextName = renameDraft.trim();
    if (!nextName) {
      pushLog((language) => workbenchCopies[language].logs.fileNameCannotBeEmpty, 'error');
      renamingFileIdRef.current = null;
      renameSelectionModeRef.current = 'normal';
      setRenamingFileId(null);
      setRenameDraft('');
      return;
    }

    const targetFile = filesRef.current.find((file) => file.id === fileId);
    if (targetFile && targetFile.name === nextName) {
      cancelRenameFile();
      pushLog((language) => workbenchCopies[language].logs.fileNameUnchanged(nextName));
      return;
    }

    captureUndoSnapshot('renamed file', 'file', fileId);
    updateFileById(fileId, (file) => ({
      ...file,
      name: nextName,
      updatedAt: Date.now(),
    }));
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
    pushLog((language) => workbenchCopies[language].logs.fileRenamed(nextName), 'success');
  };

  useEffect(() => {
    if (!openTopMenu) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (topMenuRef.current?.contains(target) || topCommandsRef.current?.contains(target)) return;
      setOpenTopMenu(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openTopMenu]);

  useEffect(() => {
    if (!openFileMenuId) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (fileMenuRef.current?.contains(target) || fileMenuButtonRef.current?.contains(target)) return;
      setOpenFileMenuId(null);
      setPendingDeleteFileId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openFileMenuId]);

  useEffect(() => {
    if (!renamingFileId) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (renameInputRef.current?.contains(target)) return;
      commitRenameFileFromOutside();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [renamingFileId, renameDraft]);

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

  const closeWorkbenchFile = (fileId: string) => {
    const openFiles = filesRef.current;
    const index = openFiles.findIndex((file) => file.id === fileId);
    let file = openFiles[index];
    if (!file) return;
    captureUndoSnapshot('closed file', 'workspace');

    const isClosingActiveFile = fileId === activeFileIdRef.current;
    if (isClosingActiveFile && file.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
      file = filesRef.current.find((candidate) => candidate.id === fileId) ?? file;
    }

    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];
    if (file.kind === 'heatCapacity' && !isClosingActiveFile) releaseHeatCapacityRuntimeForFileExit(fileId);

    const cachedFile: WorkbenchFileState = {
      ...file,
      runState: file.kind === 'heatCapacity'
        ? file.runState
        : file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
    };
    const remainingFiles = filesRef.current.filter((candidate) => candidate.id !== fileId);
    const nextClosedFiles = [
      cachedFile,
      ...closedFilesRef.current.filter((candidate) => candidate.id !== fileId),
    ];
    const nextActiveFile = isClosingActiveFile
      ? remainingFiles[Math.min(index, remainingFiles.length - 1)]
      : remainingFiles.find((candidate) => candidate.id === activeFileIdRef.current);
    const nextActiveFileId = nextActiveFile?.id ?? '';

    if (isClosingActiveFile) selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(remainingFiles, nextClosedFiles, nextActiveFileId);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (isClosingActiveFile && nextActiveFile?.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(nextActiveFile.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    if (isClosingActiveFile) {
      setSelectedPanel('preview');
      setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(nextActiveFile));
      setPendingRemovePointId(null);
      setPendingClearRelationKey(null);
      renamingFileIdRef.current = null;
      setRenamingFileId(null);
      setParameterErrors([]);
      setIdealAdvancedSettingsOpen(false);
      setIdealAdvancedSettingsBodyVisible(false);
    }
    pushLog((language) => workbenchCopies[language].logs.fileClosed(file.name), 'warning');
  };

  const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {
    if (file.runState === 'running' && !window.confirm(workbenchCopy.files.confirmCloseRunningExperiment(file.name))) {
      return;
    }

    closeWorkbenchFile(file.id);
  };

  const openClosedWorkbenchFile = (fileId: string) => {
    const file = closedFilesRef.current.find((candidate) => candidate.id === fileId);
    if (!file || filesRef.current.some((candidate) => candidate.id === fileId)) return;
    captureUndoSnapshot('reopened file', 'workspace');

    const currentActiveFile = filesRef.current.find(
      (candidate) => candidate.id === activeFileIdRef.current,
    );
    if (currentActiveFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    } else if (currentActiveFile?.runState === 'running') {
      cancelRuntimeFrame(currentActiveFile.id);
      const pausedFiles = filesRef.current.map((candidate) => candidate.id === currentActiveFile.id
        ? {
            ...candidate,
            runState: 'paused' as const,
            updatedAt: Date.now(),
          }
        : candidate);
      filesRef.current = pausedFiles;
      setFiles(pausedFiles);
      pushLog(
        (language) => workbenchCopies[language].logs.autoPausedSwitchFile(currentActiveFile.name),
        'warning',
      );
    }

    const reopenedFile = prepareReopenedWorkbenchFile(file);
    const nextClosedFiles = closedFilesRef.current.filter((candidate) => candidate.id !== fileId);
    const reopenedFiles = filesRef.current.some((candidate) => candidate.id === reopenedFile.id)
      ? filesRef.current
      : [...filesRef.current, reopenedFile];
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(reopenedFiles, nextClosedFiles, reopenedFile.id);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (reopenedFile.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(reopenedFile.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setSelectedPanel('preview');
    setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(reopenedFile));
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    pushLog(
      (language) => workbenchCopies[language].logs.fileOpenedFromCache(reopenedFile.name),
      'success',
    );
  };

  const deleteWorkbenchFile = (fileId: string) => {
    const openFiles = filesRef.current;
    const index = openFiles.findIndex((file) => file.id === fileId);
    const file = openFiles[index];
    if (!file) return;
    const deletingActiveFile = fileId === activeFileIdRef.current;

    captureUndoSnapshot('deleted file', 'workspace');
    if (deletingActiveFile && file.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];
    if (file.kind === 'heatCapacity' && !deletingActiveFile) {
      releaseHeatCapacityRuntimeForFileExit(fileId);
    }
    const remainingFiles = openFiles.filter((candidate) => candidate.id !== fileId);
    const nextClosedFiles = closedFilesRef.current.filter((candidate) => candidate.id !== fileId);
    const nextActiveFile = deletingActiveFile
      ? remainingFiles[Math.min(index, remainingFiles.length - 1)]
      : remainingFiles.find((candidate) => candidate.id === activeFileIdRef.current);
    const nextActiveFileId = nextActiveFile?.id ?? '';

    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(remainingFiles, nextClosedFiles, nextActiveFileId);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (deletingActiveFile && nextActiveFile?.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(nextActiveFile.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setSelectedPanel('preview');
    setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(nextActiveFile));
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    pushLog((language) => workbenchCopies[language].logs.fileRemoved(file.name), 'warning');
  };

  const requestDeleteWorkbenchFile = (file: WorkbenchFileState) => {
    if (pendingDeleteFileId === file.id) {
      deleteWorkbenchFile(file.id);
      return;
    }

    setPendingDeleteFileId(file.id);
    pushLog((language) => workbenchCopies[language].logs.confirmDeleteFile(file.name), 'warning');
  };

  const cancelDeleteWorkbenchFile = () => {
    setPendingDeleteFileId(null);
    setOpenFileMenuId(null);
  };

  const resetLayout = () => {
    if (isWorkbenchFileLayoutDefault(activeFile, workbenchLayoutDefaults)) {
      setOpenTopMenu(null);
      pushLog((language) => workbenchCopies[language].logs.layoutAlreadyDefault(activeFile.name));
      return;
    }

    captureUndoSnapshot('reset layout', 'presentation');
    setWorkbenchFiles((current) =>
      current.map((file) =>
        file.id === activeFile.id
          ? {
              ...file,
              visiblePanels: ['preview', 'realtime'],
              ...(file.kind === 'heatCapacity'
                ? {
                    openHeatCapacityTabs: [] as WorkbenchHeatCapacityTabId[],
                    activeHeatCapacityTabId: null,
                    heatCapacityMaterialsExpanded: true,
                    heatCapacityTabContainerHeight: 0.5,
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.heatCapacity.liveWorkspaceSplitRatio,
                  }
                : file.kind === 'ideal'
                ? {
                    idealWindowLayout: createDefaultIdealWindowLayout({ heightRatio: workbenchLayoutDefaults.ideal.resultsHeightRatio }),
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.ideal.liveWorkspaceSplitRatio,
                  }
                : file.kind === 'heatCapacityPistonOscillation'
                ? {
                    liveWorkspaceSplitRatio:
                      workbenchLayoutDefaults.heatCapacityPistonOscillation.liveWorkspaceSplitRatio,
                  }
                : {
                    standardResultsLayout: createDefaultStandardResultsLayout({ heightRatio: workbenchLayoutDefaults.standard.resultsHeightRatio }),
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.standard.liveWorkspaceSplitRatio,
                  }),
            }
          : file,
      ),
    );
    setOpenTopMenu(null);
    pushLog((language) => workbenchCopies[language].logs.layoutReset(activeFile.name), 'warning');
  };

  const selectFile = (file: WorkbenchFileState) => {
    setSelectedFileId(file.id);
    const currentActiveFile = filesRef.current.find((candidate) => (
      candidate.id === activeFileIdRef.current
    )) ?? activeFile;
    const switchingFile = file.id !== activeFileIdRef.current;
    let switchingFromPendingHeatCapacityRefresh = false;
    if (switchingFile && currentActiveFile.kind === 'heatCapacity') {
      switchingFromPendingHeatCapacityRefresh = suspendActiveHeatCapacityModeForNavigation();
    } else if (switchingFile && currentActiveFile.runState === 'running') {
      cancelRuntimeFrame(currentActiveFile.id);
      const pausedFiles = filesRef.current.map((candidate) => candidate.id === currentActiveFile.id
        ? {
            ...candidate,
            runState: 'paused' as const,
            updatedAt: Date.now(),
          }
        : candidate);
      filesRef.current = pausedFiles;
      setFiles(pausedFiles);
      pushLog(
        (language) => workbenchCopies[language].logs.autoPausedSwitchFile(currentActiveFile.name),
        'warning',
      );
    }

    if (switchingFile) {
      const openedAt = Date.now();
      const nextFiles = filesRef.current.map((candidate) => candidate.id === file.id
        ? { ...candidate, lastOpenedAt: openedAt }
        : candidate);
      filesRef.current = nextFiles;
      setFiles(nextFiles);
      if (!switchingFromPendingHeatCapacityRefresh) {
        heatCapacityRefreshPersistRef.current();
        void flushWorkspacePersistenceRef.current();
      }
      commitWorkbenchFileCollections(nextFiles, closedFilesRef.current, file.id);
    }
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (switchingFile && file.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(file.id);
    }
    selectedPanelRef.current = 'preview';
    if (switchingFile) {
      void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    }
    setSelectedPanel('preview');
    setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(file));
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setSamplingPresetMenuOpen(false);
    pushLog((language) => workbenchCopies[language].logs.fileSelected(file.name));
  };

  const renderWorkbenchParameterSymbol = (parts: WorkbenchParameterSymbolPart[]) => (
    <span className="studio-param-symbol">
      {parts.map((part, index) => (
        typeof part === 'string'
          ? <span key={index}>{part}</span>
          : <sub key={index}>{part.sub}</sub>
      ))}
    </span>
  );

  const renderWorkbenchParameterHelpButton = (
    parameterId: string,
    modelEffect: string,
  ) => {
    const workbenchHelpId = `workbench-${parameterId}`;
    const helpVisible = visibleHeatCapacityParamHelpId === workbenchHelpId;
    const helpPopover = helpVisible
      ? renderHeatCapacityTooltipPopover(workbenchHelpId, modelEffect, {
        onMouseEnter: () => setHoveredHeatCapacityParamHelpId(workbenchHelpId),
        onMouseLeave: hideHeatCapacityHoverTooltip,
      })
      : null;
    return (
      <span
        className="studio-param-help-anchor"
        onMouseLeave={() => {
          if (pinnedHeatCapacityParamHelpId === null) {
            setHoveredHeatCapacityParamHelpId(null);
            setHeatCapacityParamHelpPopoverStyle(undefined);
          }
        }}
      >
        <button
          type="button"
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === workbenchHelpId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-workbench-param-help-button="true"
          data-workbench-param-help-id={parameterId}
          aria-label={modelEffect}
          onMouseEnter={(event) => {
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setHoveredHeatCapacityParamHelpId(workbenchHelpId);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setPinnedHeatCapacityParamHelpId(workbenchHelpId);
            setHoveredHeatCapacityParamHelpId(workbenchHelpId);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };

  const renderWorkbenchParameterInputRow = (param: WorkbenchParameterRow) => {
    const detail = getWorkbenchParameterDetail(param);
    const displayLabel = getWorkbenchParameterDisplayLabel(param, workbenchCopy);
    const isParamLocked = parameterControlsLocked || isIdealControlledVariableLocked(param.key);
    const paramLockHint = isIdealControlledVariableLocked(param.key) ? controlledVariableLockHint : undefined;
    const parameterValue = parameterInputDrafts[param.key] ?? param.value;
    const displayUnit = getWorkbenchParameterDisplayUnit(param, settingsLanguagePreference);

    return (
      <div
        className={`studio-param-input-row ${isParamLocked ? 'studio-param-input-row-locked' : ''}`}
        key={param.label}
        title={paramLockHint}
        aria-disabled={isParamLocked}
      >
        <span className="studio-param-input-label">
          <span className="studio-param-input-title">
            <span>{displayLabel}</span>
            {detail ? renderWorkbenchParameterSymbol(detail.symbol) : null}
          </span>
          {detail ? renderWorkbenchParameterHelpButton(param.key, detail.help[settingsLanguagePreference]) : null}
        </span>
        <span className="studio-param-input-cell">
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${workbenchCopy.parameters.edit} ${displayLabel}`}
            value={parameterValue}
            disabled={isParamLocked || !param.editable}
            onChange={(event) => {
              const nextValue = event.target.value;
              setParameterInputDrafts((current) => ({ ...current, [param.key]: nextValue }));
              setParameterErrors([]);
            }}
            onBlur={() => commitWorkbenchParameterInput(param, parameterValue)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitWorkbenchParameterInput(param, parameterValue);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                revertWorkbenchParameterInput(param.key);
              }
            }}
          />
          {displayUnit ? <span className="studio-param-input-unit">{displayUnit}</span> : null}
        </span>
      </div>
    );
  };

  const renderHeatCapacityParameterHelpButton = (
    parameterId: string,
    modelEffect: string,
  ) => {
    const helpVisible = visibleHeatCapacityParamHelpId === parameterId;
    const helpPopover = helpVisible
      ? renderHeatCapacityTooltipPopover(parameterId, modelEffect, {
        onMouseEnter: () => setHoveredHeatCapacityParamHelpId(parameterId),
        onMouseLeave: hideHeatCapacityHoverTooltip,
      })
      : null;
    return (
      <span
        className="studio-param-help-anchor"
        onMouseLeave={() => {
          if (pinnedHeatCapacityParamHelpId === null) {
            setHoveredHeatCapacityParamHelpId(null);
            setHeatCapacityParamHelpPopoverStyle(undefined);
          }
        }}
      >
        <button
          type="button"
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === parameterId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-heat-capacity-param-help-id={parameterId}
          aria-label={`${modelEffect}`}
          onMouseEnter={(event) => {
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setHoveredHeatCapacityParamHelpId(parameterId);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setPinnedHeatCapacityParamHelpId(parameterId);
            setHoveredHeatCapacityParamHelpId(parameterId);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };

  const renderHeatCapacityParameterLabel = (
    parameterId: string,
    label: string,
    parts: HeatCapacityFreeParameterSymbolPart[],
    modelEffect: string,
  ) => {
    const symbolLayoutClass = parts.length > 0
      ? 'studio-heat-free-param-label-with-symbol'
      : 'studio-heat-free-param-label-no-symbol';
    return (
      <span className={`studio-heat-free-param-label ${symbolLayoutClass}`}>
        <span className="studio-heat-free-param-name">{label}</span>
        {renderHeatCapacityParameterSymbol(parts)}
        {renderHeatCapacityParameterHelpButton(parameterId, modelEffect)}
      </span>
    );
  };

  const renderHeatCapacityFreeNumberInputRow = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    draft: HeatCapacityFreeParameterDraft,
    scope: 'basic' | 'advanced',
    disabled: boolean,
  ) => {
    const inputDrafts = scope === 'basic' ? heatCapacityBasicInputDrafts : heatCapacityAdvancedInputDrafts;
    const inputErrors = scope === 'basic' ? heatCapacityBasicInputErrors : heatCapacityAdvancedInputErrors;
    const setInputDrafts = scope === 'basic' ? setHeatCapacityBasicInputDrafts : setHeatCapacityAdvancedInputDrafts;
    const error = inputErrors[definition.id] ?? null;
    const displayValue = getHeatCapacityFreeParameterInputValue(
      definition,
      draft[definition.id],
    );
    const value = inputDrafts[definition.id] ?? formatHeatCapacityFreeParameterValue(
      displayValue,
      definition.precision,
    );
    const parameterId = definition.id;
    const label = definition.label[settingsLanguagePreference];
    const modelEffect = definition.effect[settingsLanguagePreference];

    return (
      <div
        key={`${scope}-${definition.id}`}
        className={`studio-heat-free-param-row ${disabled ? 'studio-heat-free-param-row-locked' : ''} ${error ? 'studio-heat-free-param-row-error' : ''}`}
        data-heat-capacity-free-param-id={definition.id}
      >
        {renderHeatCapacityParameterLabel(parameterId, label, definition.parts, modelEffect)}
        <span className="studio-heat-free-input-cell">
          <span className="studio-heat-free-input-shell">
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              aria-label={`${label} ${definition.unit}`.trim()}
              aria-invalid={error ? true : undefined}
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value;
                setInputDrafts((current) => ({
                  ...current,
                  [definition.id]: nextValue,
                }));
                if (scope === 'basic') {
                  setHeatCapacityBasicInputErrors((current) => {
                    const { [definition.id]: _removed, ...rest } = current;
                    return rest;
                  });
                } else {
                  setHeatCapacityAdvancedInputErrors((current) => {
                    const { [definition.id]: _removed, ...rest } = current;
                    return rest;
                  });
                }
              }}
              onBlur={() => {
                if (scope === 'basic') {
                  commitHeatCapacityBasicParameterInput(definition.id, value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && scope === 'basic') {
                  commitHeatCapacityBasicParameterInput(definition.id, value);
                }
              }}
            />
            {definition.unit ? <span className="studio-heat-free-unit">{definition.unit}</span> : null}
          </span>
          {error ? <small className="studio-heat-free-inline-error">{error}</small> : null}
        </span>
      </div>
    );
  };

  const renderHeatCapacityFreeCheckboxRow = (
    definition: HeatCapacityFreeCheckboxDefinition,
    checked: boolean,
    disabled: boolean,
  ) => {
    const label = definition.label[settingsLanguagePreference];
    const modelEffect = definition.effect[settingsLanguagePreference];
    return (
      <div
        key={definition.id}
        className={`studio-heat-free-param-row studio-heat-free-check-row ${disabled ? 'studio-heat-free-param-row-locked' : ''}`}
        data-heat-capacity-free-param-id={definition.id}
      >
        {renderHeatCapacityParameterLabel(definition.id, label, definition.parts, modelEffect)}
        <label className="studio-heat-free-check-control">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            data-heat-capacity-basic-checkbox={definition.id}
            onChange={(event) => setHeatCapacityBasicCheckbox(definition.id, event.target.checked)}
          />
          <span>{checked ? definition.onText[settingsLanguagePreference] : definition.offText[settingsLanguagePreference]}</span>
        </label>
      </div>
    );
  };

  const renderHeatCapacityFreeGasTypeRow = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    const selectedGasType = activeFile.heatCapacityFreeParameterDraft.gasType;
    const gasTypeLocked = !isHeatCapacityFreeGasTypeEditingAvailable(activeFile);
    const disabled = activeHeatCapacityFreeIdealReadonly || gasTypeLocked;
    const nativeDisabled = activeHeatCapacityFreeIdealReadonly;
    const renderOption = (option: HeatCapacityFreeGasTypeOptionDefinition) => {
      const selected = selectedGasType === option.id;
      const gasTypeHelp = (
        <span
          className="studio-heat-free-gas-type-help"
          aria-label={option.help[settingsLanguagePreference]}
        >
          ?
        </span>
      );
      return (
        <button
          key={option.id}
          type="button"
          className="studio-heat-free-gas-type-option"
          data-heat-capacity-gas-type-option={option.id}
          aria-pressed={selected}
          aria-disabled={disabled}
          disabled={nativeDisabled}
          onClick={() => {
            if (disabled) {
              if (activeHeatCapacityFreeIdealReadonly) {
                showHeatCapacityFreeIdealReadonlyHint();
              } else {
                const message = heatCapacityFreeSharedText.gasTypeLocked[settingsLanguagePreference];
                setScanInputToast(message);
                pushLog(
                  (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.gasTypeLocked[language]}`,
                  'warning',
                );
              }
              return;
            }
            setHeatCapacityFreeGasType(option.id);
          }}
        >
          <span>{option.label[settingsLanguagePreference]}</span>
          {renderHeatCapacityTooltipAnchor(
            `gasType-${option.id}`,
            option.help[settingsLanguagePreference],
            gasTypeHelp,
            {
              className: 'studio-heat-free-gas-type-help-anchor',
              target: `gasType-${option.id}`,
            },
          )}
        </button>
      );
    };
    return (
      <div
        className={`studio-heat-free-param-row studio-heat-free-gas-type-row ${disabled ? 'studio-heat-free-param-row-locked' : ''}`}
        data-heat-capacity-free-param-id="gasType"
      >
        <span className="studio-heat-free-param-label studio-heat-free-param-label-no-symbol">
          <span className="studio-heat-free-param-name">
            {heatCapacityFreeSharedText.gasTypeLabel[settingsLanguagePreference]}
          </span>
        </span>
        <span
          className={`studio-heat-free-gas-type-control studio-heat-free-gas-type-control-${selectedGasType}`}
          role="group"
          aria-label={heatCapacityFreeSharedText.gasTypeLabel[settingsLanguagePreference]}
        >
          <span className="studio-heat-free-gas-type-thumb" aria-hidden="true" />
          {heatCapacityFreeGasTypeOptions.map(renderOption)}
        </span>
      </div>
    );
  };

  const renderHeatCapacityBasicParameterRows = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    const draft = activeFile.heatCapacityFreeParameterDraft;
    const checkboxValue = (id: HeatCapacityFreeBasicCheckboxKey) => (
      id === 'hardSphereViewEnabled'
        ? activeFile.hardSphereViewEnabled
        : Boolean(draft[id])
    );
    const schemeIsIdeal = activeFile.heatCapacityFreeParameterScheme === 'ideal';
    const schemeButtonText = schemeIsIdeal
      ? heatCapacityFreeSharedText.idealProfile[settingsLanguagePreference]
      : heatCapacityFreeSharedText.realSimulation[settingsLanguagePreference];
    const schemeButtonTooltip = activeHeatCapacityFreeSchemeLocked
      ? heatCapacityFreeSharedText.idealProfileLockedHint[settingsLanguagePreference]
      : heatCapacityFreeSharedText.idealProfileIntroBody[settingsLanguagePreference];
    const restoreDefaultTooltip = activeHeatCapacityFreeIdealReadonly
      ? heatCapacityFreeSharedText.idealProfileReadonlyNote[settingsLanguagePreference]
      : activeHeatCapacityFreeParameterLockMessage ?? heatCapacityFreeSharedText.restoreDefault[settingsLanguagePreference];
    return (
      <>
        <div className={`studio-heat-free-default-row ${activeHeatCapacityFreeParameterLocked ? 'studio-heat-free-default-row-locked' : ''}`}>
          {renderHeatCapacityTooltipAnchor(
            'heatCapacityFreeParameterScheme',
            schemeButtonTooltip,
            <button
              type="button"
              className={`studio-heat-free-scheme-button ${schemeIsIdeal ? 'studio-heat-free-scheme-button-active' : ''} ${activeHeatCapacityFreeSchemeLocked ? 'studio-heat-free-scheme-button-locked' : ''}`}
              disabled={activeHeatCapacityFreeSchemeLocked}
              aria-disabled={activeHeatCapacityFreeSchemeLocked}
              aria-pressed={schemeIsIdeal}
              onClick={requestToggleHeatCapacityFreeParameterScheme}
            >
              <span>{schemeButtonText}</span>
            </button>,
            {
              className: 'studio-heat-free-scheme-tooltip-anchor',
              target: 'scheme',
              focusable: activeHeatCapacityFreeSchemeLocked,
            },
          )}
          {renderHeatCapacityTooltipAnchor(
            'heatCapacityRestoreDefault',
            restoreDefaultTooltip,
            <button
              type="button"
              className="studio-heat-free-default-button"
              disabled={activeHeatCapacityFreeParameterInputDisabled}
              onClick={openHeatCapacityRestoreDefaultConfirm}
            >
              <RotateCcw size={13} />
              <span>{heatCapacityFreeSharedText.restoreDefault[settingsLanguagePreference]}</span>
            </button>,
            {
              className: 'studio-heat-free-default-tooltip-anchor',
              target: 'restore-default',
              focusable: activeHeatCapacityFreeParameterInputDisabled,
            },
          )}
        </div>
        {renderHeatCapacityFreeGasTypeRow()}
        {heatCapacityFreeBasicNumberParameters.map((definition) => (
          renderHeatCapacityFreeNumberInputRow(
            definition,
            draft,
            'basic',
            activeHeatCapacityFreeParameterInputDisabled,
          )
        ))}
        {heatCapacityFreeBasicCheckboxes.map((definition) => (
          renderHeatCapacityFreeCheckboxRow(
            definition,
            checkboxValue(definition.id),
            definition.id === 'hardSphereViewEnabled'
              ? false
              : activeHeatCapacityFreeParameterLocked
                ? true
                : activeHeatCapacityFreeIdealReadonly,
          )
        ))}
      </>
    );
  };

  const renderHeatCapacityFreeParameterPanel = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    return (
      <section
        className={`studio-heat-free-params ${activeHeatCapacityFreeParameterLocked ? 'is-locked' : ''} ${activeHeatCapacityFreeIdealReadonly ? 'is-ideal-readonly' : ''}`}
        data-heat-capacity-free-parameter-panel="true"
        aria-disabled={activeHeatCapacityFreeParameterInputDisabled}
        onPointerDownCapture={(event) => {
          if (!activeHeatCapacityFreeParameterLocked) return;
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest('[data-heat-capacity-param-help-button="true"]')) return;
          if (target?.closest('.studio-param-help-popover')) return;
          if (target?.closest('[data-heat-capacity-free-param-id="hardSphereViewEnabled"]')) return;
          event.preventDefault();
          showHeatCapacityFreeParameterLockHint();
        }}
      >
        {renderHeatCapacityBasicParameterRows()}
        <div className={`studio-heat-free-advanced-entry ${activeHeatCapacityFreeParameterLocked ? 'studio-heat-free-advanced-entry-locked' : ''}`}>
          {renderHeatCapacityTooltipAnchor(
            'heatCapacityAdvancedSettings',
            activeHeatCapacityFreeParameterLockMessage ?? heatCapacityFreeSharedText.advancedOpen[settingsLanguagePreference],
            <button
              type="button"
              className="studio-heat-free-advanced-button"
              disabled={activeHeatCapacityFreeParameterLocked}
              onClick={openHeatCapacityAdvancedSettings}
              onPointerDownCapture={() => {
                if (activeHeatCapacityFreeParameterLocked) showHeatCapacityFreeParameterLockHint();
              }}
            >
              <Wrench size={14} />
              <span>{heatCapacityFreeSharedText.advancedOpen[settingsLanguagePreference]}</span>
            </button>,
            {
              className: 'studio-heat-free-advanced-tooltip-anchor',
              target: 'advanced-settings',
              focusable: activeHeatCapacityFreeParameterLocked,
            },
          )}
        </div>
      </section>
    );
  };

  const renderHeatCapacityAdvancedParameterDialog = () => {
    if (
      !heatCapacityAdvancedOpen ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityAdvancedDraft === null
    ) {
      return null;
    }
    const riskPending = !activeFile.heatCapacityFreeFileAcknowledgements.advancedParametersRisk;
    return (
      <div
        className="studio-heat-advanced-overlay"
        role="presentation"
        onMouseDown={cancelHeatCapacityAdvancedParameterDraft}
      >
        <section
          className={`studio-heat-advanced-window ${riskPending ? 'studio-heat-advanced-window-blocked' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={heatCapacityFreeSharedText.advancedTitle[settingsLanguagePreference]}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="studio-heat-advanced-header">
            <div>
              <strong>{heatCapacityFreeSharedText.advancedTitle[settingsLanguagePreference]}</strong>
              {activeHeatCapacityFreeIdealReadonly ? (
                <span className="studio-heat-advanced-readonly-note">
                  {heatCapacityFreeSharedText.idealProfileReadonlyNote[settingsLanguagePreference]}
                </span>
              ) : null}
            </div>
            <button type="button" onClick={cancelHeatCapacityAdvancedParameterDraft} aria-label={workbenchCopy.actions.close}>
              <X size={15} />
            </button>
          </header>
          <div className="studio-heat-advanced-groups" aria-disabled={riskPending || activeHeatCapacityFreeIdealReadonly}>
            {heatCapacityFreeAdvancedParameterGroups.map((group) => (
              <section className="studio-heat-advanced-group" key={group.id} data-heat-capacity-advanced-group-section={group.id}>
                <h3 className="studio-heat-advanced-group-title">{group.title[settingsLanguagePreference]}</h3>
                <div className="studio-heat-advanced-grid">
                  {heatCapacityFreeAdvancedNumberParameters.filter((definition) => definition.group === group.id)
                    .map((definition) => {
                      return (
                        <div className="studio-heat-advanced-grid-item" key={definition.id} data-heat-capacity-advanced-group={group.id}>
                          {renderHeatCapacityFreeNumberInputRow(
                            definition,
                            heatCapacityAdvancedDraft,
                            'advanced',
                            riskPending || activeHeatCapacityFreeIdealReadonly,
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
          <footer className="studio-heat-advanced-actions">
            <button type="button" onClick={cancelHeatCapacityAdvancedParameterDraft}>
              {heatCapacityFreeSharedText.cancel[settingsLanguagePreference]}
            </button>
            <button
              type="button"
              className="studio-heat-advanced-primary"
              disabled={riskPending || activeHeatCapacityFreeIdealReadonly}
              onClick={() => saveHeatCapacityAdvancedParameterDraft(heatCapacityAdvancedDraft)}
            >
              {heatCapacityFreeSharedText.save[settingsLanguagePreference]}
            </button>
          </footer>
        </section>
        <WorkbenchHeatCapacityAdvancedRiskDialog
          open={riskPending}
          copy={{
            title: heatCapacityFreeSharedText.riskTitle[settingsLanguagePreference],
            body: heatCapacityFreeSharedText.riskBody[settingsLanguagePreference],
            cancel: heatCapacityFreeSharedText.cancel[settingsLanguagePreference],
            confirm: heatCapacityFreeSharedText.confirm[settingsLanguagePreference],
          }}
          onCancel={cancelHeatCapacityAdvancedParameterDraft}
          onConfirm={acknowledgeHeatCapacityFreeAdvancedRisk}
        />
      </div>
    );
  };

  const renderIdealControls = () => {
    if (activeFile.kind !== 'ideal') return null;

    const relationVariableKey = getRelationVariableKey(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const presetSequence = getPresetSequence(activeFile.relation);
    const volume = Math.pow(activeFile.params.L, 3);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const scanStep = getIdealScanStep(activeFile.relation);
    const scanDecimals = getIdealScanDecimals(activeFile.relation);
    const scanRange = scanMax - scanMin;
    const scanProgressPercent = getIdealScanPositionPercent(relationVariableValue, scanMin, scanRange);
    const scanDisplayValue = scanInputFocused
      ? scanInputDraft
      : formatMetric(relationVariableValue, scanDecimals);
    const scanTitle =
      relationVariableKey === 'targetTemperature'
        ? workbenchCopy.parameters.targetTemperature
        : relationVariableKey === 'L'
          ? workbenchCopy.parameters.boxLength
          : workbenchCopy.parameters.particleCount;
    const scanKeyLabel = relationVariableKey === 'targetTemperature' ? 'T' : relationVariableKey;
    const scanSliderClass = [
      'studio-ideal-scan-slider',
      scanSliderThumbHover ? 'studio-ideal-scan-slider-thumb-hover' : '',
      scanSliderDragging ? 'studio-ideal-scan-slider-dragging' : '',
    ].filter(Boolean).join(' ');
    const scanInputClass = [
      'studio-ideal-scan-input',
      scanInputError ? 'studio-ideal-scan-input-error' : '',
    ].filter(Boolean).join(' ');
    const activeSamplingPreset = idealSamplingPresets.find(
      (preset) =>
        preset.equilibriumTime === activeFile.params.equilibriumTime &&
        preset.statsDuration === activeFile.params.statsDuration,
    );
    const samplingPresetLabel = activeSamplingPreset
      ? workbenchCopy.parameters.samplingPresets[activeSamplingPreset.key]
      : workbenchCopy.parameters.customPreset;
    const samplingPresetDescription = activeSamplingPreset
      ? workbenchCopy.parameters.samplingDuration(activeSamplingPreset.equilibriumTime, activeSamplingPreset.statsDuration)
      : workbenchCopy.parameters.samplingDuration(
          Number(formatMetric(activeFile.params.equilibriumTime, 1)),
          Number(formatMetric(activeFile.params.statsDuration, 1)),
        );

    return (
      <div className="studio-ideal-controls" aria-disabled={parameterControlsLocked}>
        <section>
          <h4>{workbenchCopy.parameters.relation}</h4>
          <div className="studio-ideal-relation-buttons" role="tablist" aria-label={workbenchCopy.parameters.relation}>
            {idealRelationOptions.map((option) => (
              <button
                type="button"
                key={option.key}
                className={activeFile.relation === option.key ? 'studio-ideal-control-active' : ''}
                disabled={parameterControlsLocked}
                onClick={() => changeIdealRelation(option.key)}
                title={workbenchCopy.parameters.relationHints[option.key]}
              >
                <strong>{option.label}</strong>
                <span>{workbenchCopy.results.pointsShort(activeFile.pointsByRelation[option.key].length)}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>{workbenchCopy.parameters.scanVariable}</h4>
          <div className="studio-ideal-variable-card studio-ideal-scan-control">
            <div className="studio-ideal-scan-value-row">
              <div>
                <span>{scanTitle}</span>
                <input
                  className={scanInputClass}
                  type="text"
                  inputMode={activeFile.relation === 'pn' ? 'numeric' : 'decimal'}
                  value={scanDisplayValue}
                  disabled={parameterControlsLocked}
                  aria-label={workbenchCopy.parameters.setScanValue(scanTitle)}
                  aria-invalid={scanInputError ? true : undefined}
                  ref={scanInputRef}
                  onFocus={() => {
                    setScanInputFocused(true);
                    if (!scanInputFocused) {
                      setScanInputDraft(formatMetric(relationVariableValue, scanDecimals));
                    }
                  }}
                  onChange={(event) => {
                    setScanInputDraft(event.target.value);
                    validateIdealScanDraft(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitIdealScanInput();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setScanInputDraft(formatMetric(relationVariableValue, scanDecimals));
                      setScanInputFocused(false);
                      clearScanInputError();
                    }
                  }}
                  onBlur={() => commitIdealScanInput()}
                />
              </div>
              <span className="studio-ideal-scan-key">{scanKeyLabel}</span>
            </div>
            <input
              className={scanSliderClass}
              type="range"
              min={scanMin}
              max={scanMax}
              step={scanStep}
              value={relationVariableValue}
              disabled={parameterControlsLocked}
              aria-label={workbenchCopy.parameters.adjustScanValue(scanTitle)}
              style={{ '--studio-ideal-scan-progress': `${scanProgressPercent}%` } as React.CSSProperties}
              onPointerMove={(event) => {
                if (parameterControlsLocked) return;
                setScanSliderThumbHover(scanSliderDragging || isPointerOnIdealScanThumb(event, scanProgressPercent));
              }}
              onPointerLeave={() => {
                if (!scanSliderDragging) setScanSliderThumbHover(false);
              }}
              onPointerDown={(event) => {
                if (parameterControlsLocked) return;
                const pointerOnThumb = isPointerOnIdealScanThumb(event, scanProgressPercent);
                setScanSliderThumbHover(pointerOnThumb);
                setScanSliderDragging(pointerOnThumb);
                if (pointerOnThumb) {
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setScanSliderDragging(false);
                setScanSliderThumbHover(isPointerOnIdealScanThumb(event, scanProgressPercent));
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setScanSliderDragging(false);
                setScanSliderThumbHover(false);
              }}
              onBlur={() => {
                setScanSliderDragging(false);
                setScanSliderThumbHover(false);
              }}
              onChange={(event) => updateIdealScanVariable(Number(event.target.value))}
            />
            <div className="studio-ideal-scan-ticks" aria-label={workbenchCopy.parameters.recommendedValues(scanTitle)}>
              {presetSequence.map((value) => (
                <button
                  type="button"
                  key={`${activeFile.relation}-${value}`}
                  className={`studio-ideal-scan-tick-button ${Math.abs(value - relationVariableValue) <= 1e-6 ? 'studio-ideal-scan-tick-active' : ''}`}
                  disabled={parameterControlsLocked}
                  onClick={() => updateIdealScanVariable(value)}
                  style={{
                    '--studio-ideal-scan-tick-position': `${getIdealScanPositionPercent(value, scanMin, scanRange)}%`,
                  } as React.CSSProperties}
                >
                  {formatMetric(value, scanDecimals)}
                </button>
              ))}
            </div>
            {activeFile.relation === 'pv' ? (
              <div className="studio-ideal-scan-derived">
                <small>V = {formatMetric(volume, 1)}</small>
                <small>1/V = {formatMetric(volume > 0 ? 1 / volume : 0, 6)}</small>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <h4>{workbenchCopy.parameters.samplingPreset}</h4>
          <div
            ref={samplingPresetSelectRef}
            className={`studio-ideal-preset-select ${samplingPresetMenuOpen ? 'studio-ideal-preset-select-open' : ''}`}
          >
            <button
              type="button"
              className="studio-ideal-preset-trigger"
              aria-haspopup="listbox"
              aria-expanded={samplingPresetMenuOpen}
              disabled={parameterControlsLocked}
              onClick={() => setSamplingPresetMenuOpen((current) => !current)}
            >
              <span>
                <strong>{samplingPresetLabel}</strong>
                <small>{samplingPresetDescription}</small>
              </span>
              <ChevronDown
                size={15}
                className={`studio-ideal-preset-chevron ${samplingPresetMenuOpen ? 'studio-ideal-preset-chevron-open' : ''}`}
              />
            </button>
            <span className="studio-ideal-preset-tooltip" role="tooltip">{workbenchCopy.parameters.setSamplingPrecision}</span>
            <div
              className="studio-ideal-preset-menu studio-ideal-preset-menu-overlay"
              role="listbox"
              aria-label={workbenchCopy.parameters.samplingPreset}
              aria-hidden={!samplingPresetMenuOpen}
            >
              {idealSamplingPresets.map((preset) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={activeSamplingPreset?.key === preset.key}
                  tabIndex={parameterControlsLocked || !samplingPresetMenuOpen ? -1 : 0}
                  key={preset.key}
                  className={activeSamplingPreset?.key === preset.key ? 'studio-ideal-control-active' : ''}
                  disabled={parameterControlsLocked}
                  onClick={() => {
                    setSamplingPresetMenuOpen(false);
                    applyIdealSamplingPreset(preset);
                  }}
                >
                  <strong>{workbenchCopy.parameters.samplingPresets[preset.key]}</strong>
                  <span>{workbenchCopy.parameters.samplingDuration(preset.equilibriumTime, preset.statsDuration)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const toggleTopCommandMenu = (menu: Exclude<WorkbenchTopMenuId, null>, left: number) => {
    setTopMenuLeft(left);
    setOpenTopMenu((current) => (current === menu ? null : menu));
  };

  const renderHeatCapacityModeControl = () => {
    if (activeFile.kind !== 'heatCapacity') return null;
    const heatCapacityActiveMode: HeatCapacityMode = activeFile.heatCapacityMode;
    const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
    const heatCapacityModeControlState = selectHeatCapacityModeControlState({
      activeMode: heatCapacityActiveMode,
      autoDemoPhase,
      teachingCompleted: heatCapacityTeachingCompleted,
      canAdvanceFreeGroup: isHeatCapacityFreeExperimentGroupComplete(activeFile),
    });
    const heatCapacityDemoActionsVisible = heatCapacityModeControlState.demo.actionsVisible;
    const heatCapacityGuideActionsVisible = heatCapacityModeControlState.guide.actionsVisible;
    const heatCapacityFreeActionsVisible = heatCapacityModeControlState.free.actionsVisible;
    const heatCapacityModeSegmentClassName = (mode: HeatCapacityMode) => `studio-heat-mode-segment studio-heat-mode-segment-${mode} ${heatCapacityActiveMode === mode ? 'studio-heat-mode-segment-active' : ''}`;
    const handleHeatCapacityModeSegmentClick = (mode: HeatCapacityMode) => {
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
        switchHeatCapacityMode(mode);
        return;
      }
      if (heatCapacityTeachingCompleted && heatCapacityActiveMode === mode) {
        showHeatCapacityTeachingCompletedLockedInteraction();
        return;
      }
      if (mode === 'free') {
        if (heatCapacityActiveMode !== 'free' || autoDemoInteractionLocked) {
          switchHeatCapacityMode('free');
        }
        return;
      }
      if (heatCapacityActiveMode !== mode) switchHeatCapacityMode(mode);
    };
    const heatCapacityModeActionClassName = (action: HeatCapacityModeControlAction) => {
      const resetFeedbackClass = action.id === heatCapacityResetFeedbackActionId
        ? ' studio-heat-mode-action-feedback'
        : '';
      const toneClass = action.tone === 'danger' ? ' studio-heat-mode-action-danger' : '';
      const disabledClass = action.disabled || heatCapacityModeTransitionLocked
        ? ' studio-heat-mode-action-disabled'
        : '';
      return `studio-heat-mode-action studio-heat-mode-action-icon${toneClass}${resetFeedbackClass}${disabledClass}`;
    };
    const renderHeatCapacityModeAction = (action: HeatCapacityModeControlAction) => {
      if (action.id === 'exit-teaching') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="exit-teaching"
            title={heatCapacityRealtimeCopy.exitTeachingMode}
            aria-label={heatCapacityRealtimeCopy.exitTeachingMode}
            disabled={heatCapacityModeTransitionLocked}
            onClick={heatCapacityActiveMode === 'guide' ? exitHeatCapacityGuideMode : exitCompletedHeatCapacityTeachingMode}
          >
            <LogOut size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'resume-demo') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="resume-demo"
            title={heatCapacityRealtimeCopy.autoDemoResume}
            aria-label={heatCapacityRealtimeCopy.autoDemoResume}
            disabled={heatCapacityModeTransitionLocked}
            onClick={runHeatCapacityAutoDemo}
          >
            <Play size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'pause-demo') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="pause-demo"
            title={heatCapacityRealtimeCopy.autoDemoPause}
            aria-label={heatCapacityRealtimeCopy.autoDemoPause}
            disabled={heatCapacityModeTransitionLocked}
            onClick={() => pauseHeatCapacityAutoDemo()}
          >
            <Pause size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'stop-demo') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="stop-demo"
            title={heatCapacityRealtimeCopy.autoDemoStop}
            aria-label={heatCapacityRealtimeCopy.autoDemoStop}
            disabled={heatCapacityModeTransitionLocked}
            onClick={terminateHeatCapacityAutoDemo}
          >
            <Square size={12} strokeWidth={2.8} />
          </button>
        );
      }
      if (action.id === 'exit-guide') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="exit-guide"
            title={heatCapacityRealtimeCopy.exitGuideMode}
            aria-label={heatCapacityRealtimeCopy.exitGuideMode}
            disabled={heatCapacityModeTransitionLocked}
            onClick={exitHeatCapacityGuideMode}
          >
            <Square size={12} strokeWidth={2.8} />
          </button>
        );
      }
      if (action.id === 'reset-guide') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="reset-guide"
            title={heatCapacityRealtimeCopy.resetGuideMode}
            aria-label={heatCapacityRealtimeCopy.resetGuideMode}
            disabled={heatCapacityModeTransitionLocked}
            onClick={resetHeatCapacityGuideExperiment}
          >
            <RotateCcw size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'next-free-group') {
        if (
          activeHeatCapacityFreeBatchProgress?.targetGroupCount !== null &&
          activeHeatCapacityFreeBatchProgress?.completedGroupCount >=
            activeHeatCapacityFreeBatchProgress.targetGroupCount
        ) {
          return null;
        }
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="next-free-group"
            title={heatCapacityRealtimeCopy.nextFreeGroup}
            aria-label={heatCapacityRealtimeCopy.nextFreeGroup}
            disabled={action.disabled || heatCapacityModeTransitionLocked}
            onClick={startNextHeatCapacityFreeExperimentGroup}
          >
            <SkipForward size={13} strokeWidth={2.7} />
          </button>
        );
      }
      return (
        <button
          key={action.id}
          type="button"
          className={heatCapacityModeActionClassName(action)}
          data-heat-capacity-mode-action="reset-free"
          title={heatCapacityRealtimeCopy.resetFreeMode}
          aria-label={heatCapacityRealtimeCopy.resetFreeMode}
          disabled={heatCapacityModeTransitionLocked}
          onClick={resetHeatCapacityFreeRun}
        >
          <RotateCcw size={13} strokeWidth={2.7} />
        </button>
      );
    };

    return (
      <div className="studio-heat-mode-control-row">
        <div
           className={`studio-heat-mode-control studio-heat-mode-control-${heatCapacityActiveMode} ${heatCapacityModeControlState.expanded ? 'studio-heat-mode-control-expanded' : ''}`}
           data-heat-capacity-mode-control="true"
           data-heat-capacity-mode-transition-phase={heatCapacityModeTransitionState.phase}
           data-heat-capacity-visible-mode={heatCapacityModeTransitionState.visibleMode}
           data-heat-capacity-source-mode={heatCapacityModeTransitionState.sourceMode ?? ''}
           data-heat-capacity-target-mode={heatCapacityModeTransitionState.targetMode ?? ''}
           data-heat-capacity-queued-mode={heatCapacityModeTransitionState.queuedMode ?? ''}
           data-heat-capacity-transition-request-id={heatCapacityModeTransitionState.requestId}
           data-heat-capacity-transition-blockers={heatCapacityModeTransitionState.sourceBlockers.join(',')}
           aria-busy={heatCapacityModeTransitionLocked}
        >
          <div
            className={heatCapacityModeSegmentClassName('demo')}
            data-heat-capacity-mode-segment="demo"
          >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'demo' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="demo"
            aria-pressed={heatCapacityActiveMode === 'demo'}
            onClick={() => handleHeatCapacityModeSegmentClick('demo')}
          >
            {heatCapacityRealtimeCopy.modeDemo}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-demo" aria-hidden={!heatCapacityDemoActionsVisible}>
            {heatCapacityModeControlState.demo.actions.map(renderHeatCapacityModeAction)}
          </div>
        </div>
        <div
          className={heatCapacityModeSegmentClassName('guide')}
          data-heat-capacity-mode-segment="guide"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'guide' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="guide"
            aria-pressed={heatCapacityActiveMode === 'guide'}
            onClick={() => handleHeatCapacityModeSegmentClick('guide')}
          >
            {heatCapacityRealtimeCopy.modeGuide}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-guide" aria-hidden={!heatCapacityGuideActionsVisible}>
            {heatCapacityModeControlState.guide.actions.map(renderHeatCapacityModeAction)}
          </div>
        </div>
        <div
          className={heatCapacityModeSegmentClassName('free')}
          data-heat-capacity-mode-segment="free"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'free' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="free"
            aria-pressed={heatCapacityActiveMode === 'free'}
            onClick={() => handleHeatCapacityModeSegmentClick('free')}
          >
            {heatCapacityRealtimeCopy.modeFree}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-free" aria-hidden={!heatCapacityFreeActionsVisible}>
            {heatCapacityModeControlState.free.actions.map(renderHeatCapacityModeAction)}
          </div>
        </div>
        </div>
        <button
          type="button"
          className="studio-heat-guide-lesson-button"
          data-heat-capacity-guide-lesson-button="true"
          title={heatCapacityRealtimeCopy.guideLessonButtonLabel}
          aria-label={heatCapacityRealtimeCopy.guideLessonButtonLabel}
          onClick={() => openHeatCapacityLessonIntro(activeFile.id)}
        >
          <Wrench size={18} strokeWidth={2.1} />
        </button>
      </div>
    );
  };

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
            aria-label={heatCapacityRealtimeCopy.previewMountAria}
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
                <div
                  className={`studio-heat-demo-step-panel studio-heat-demo-step-panel-${autoDemoStepPanelMode}`}
                  data-heat-capacity-demo-step-panel="true"
                >
                  <div className="studio-heat-demo-step-kicker">
                    <span>{autoDemoRunning || autoDemoPaused ? `Step ${autoDemoStepIndex} / ${autoDemoStepCount}` : heatCapacityRealtimeCopy.autoDemoFinishedLabel}</span>
                    <i>{autoDemoPaused ? heatCapacityRealtimeCopy.demoPausedLabel : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoDoneLabel}</i>
                  </div>
                  <strong>{renderScientificText(autoDemoStepTitle || heatCapacityRealtimeCopy.autoDemoFinishedTitle)}</strong>
                  <p>{renderScientificText(autoDemoStepDescription || heatCapacityRealtimeCopy.autoDemoFinishedDescription)}</p>
                  <div><span>{heatCapacityRealtimeCopy.demoTargetLabel}</span><em>{renderScientificText(autoDemoStepTarget || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoProgressLabel}</span><em>{renderScientificText(autoDemoStepProgressCriterion || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoObservationLabel}</span><em>{renderScientificText(autoDemoStepNote || heatCapacityRealtimeCopy.demoFallbackNote)}</em></div>
                </div>
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
                  ? (() => {
                    const heatCapacityGuideCurrentStepIndex = getHeatCapacityGuideChecklistIndex(activeHeatCapacityGuideStep);
                    const heatCapacityGuideViewedStepIndex = Math.max(
                      0,
                      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1, heatCapacityGuideChecklistViewedIndex),
                    );
                    const heatCapacityGuideSteps = HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.map((step, index) => {
                      const detail = getGuideStepGuidance(step.guideStep, activeFile).message;
                      const status = index < heatCapacityGuideCurrentStepIndex
                        ? 'done'
                        : index === heatCapacityGuideCurrentStepIndex
                          ? 'current'
                          : 'pending';
                      return {
                        ...step,
                        detail,
                        index,
                        status,
                        centerDistance: Math.abs(index - heatCapacityGuideViewedStepIndex),
                        signedDistance: index - heatCapacityGuideViewedStepIndex,
                      };
                    });
                    const viewedStep = heatCapacityGuideSteps[heatCapacityGuideViewedStepIndex] ?? heatCapacityGuideSteps[0];
                    const baseOffset = HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX -
                      heatCapacityGuideViewedStepIndex * HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
                    const trackStyle = {
                      '--studio-heat-guide-step-base-offset': `${baseOffset}px`,
                      '--studio-heat-guide-step-visual-offset': `${heatCapacityGuideChecklistVisualOffsetRef.current}px`,
                    } as React.CSSProperties;
                    return (
                      <section
                        className="studio-heat-guide-step-panel"
                        data-heat-capacity-guide-step-panel="true"
                        aria-label={heatCapacityRealtimeCopy.guideChecklistLabel}
                      >
                        <div className="studio-heat-guide-step-header">
                          <span>{heatCapacityRealtimeCopy.guideChecklistLabel}</span>
                          <em>
                            {heatCapacityRealtimeCopy.guideStepLabel}
                            {' '}
                            {heatCapacityGuideViewedStepIndex + 1}
                            {' / '}
                            {heatCapacityGuideSteps.length}
                          </em>
                          <strong>{renderScientificText(viewedStep.title[settingsLanguagePreference])}</strong>
                        </div>
                        <div
                          className="studio-heat-guide-step-list"
                          data-heat-capacity-guide-step-list="true"
                          onWheel={handleHeatCapacityGuideChecklistWheel}
                        >
                          <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-top" aria-hidden="true" />
                          <div className="studio-heat-guide-step-center-rail" aria-hidden="true" />
                          <div
                            ref={heatCapacityGuideChecklistTrackRef}
                            className="studio-heat-guide-step-track studio-heat-guide-step-track-snapping"
                            style={trackStyle}
                          >
                            {heatCapacityGuideSteps.map((step) => {
                              const isCentered = step.index === heatCapacityGuideViewedStepIndex;
                              const requiredRecordKind: HeatCapacityGuideRecordKind | null =
                                step.guideStep === 'recordU0Required'
                                  ? 'u0'
                                  : step.guideStep === 'recordU1Required'
                                    ? 'u1'
                                    : step.guideStep === 'recordU2Required'
                                      ? 'u2'
                                      : null;
                              const stepRecordKind = step.status === 'current' && isCentered && requiredRecordKind === activeGuideRecordKind
                                ? requiredRecordKind
                                : null;
                              return (
                                <div
                                  key={step.id}
                                  className={`studio-heat-guide-step-row studio-heat-guide-step-row-${step.status} ${isCentered ? 'studio-heat-guide-step-row-centered' : ''} ${stepRecordKind ? 'studio-heat-guide-step-row-with-record' : ''}`}
                                  data-heat-capacity-guide-step-row={step.id}
                                  data-heat-capacity-guide-step-status={step.status}
                                  data-heat-capacity-guide-step-centered={isCentered ? 'true' : 'false'}
                                  style={{
                                    '--studio-heat-guide-step-distance': step.centerDistance,
                                    '--studio-heat-guide-step-signed-distance': step.signedDistance,
                                  } as React.CSSProperties}
                                >
                                  <span className="studio-heat-guide-step-marker" aria-hidden="true">
                                    <i />
                                  </span>
                                  <span className="studio-heat-guide-step-text">
                                    <strong>{renderScientificText(step.title[settingsLanguagePreference])}</strong>
                                    <em>{renderScientificText(step.detail)}</em>
                                  </span>
                                  {stepRecordKind ? (
                                    <span
                                      className={`studio-heat-guide-step-record-action studio-heat-record-controls ${guideHeatCapacityPulseActive && guideHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''}`}
                                      data-heat-capacity-guide-step-record-action="true"
                                      data-heat-capacity-record-controls="true"
                                    >
                                      <button
                                        type="button"
                                        data-heat-capacity-guided-record={stepRecordKind}
                                        onClick={() => recordHeatCapacityGuideSample(stepRecordKind)}
                                      >
                                        {renderScientificText(getGuideRecordLabel(stepRecordKind))}
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                          <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-bottom" aria-hidden="true" />
                        </div>
                      </section>
                    );
                  })()
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
                ? activeFile.heatCapacityFreeTrials[heatCapacityFreeActiveTrialIndex] ?? null
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
                    <div
                      className={`studio-heat-wait-overlay${
                        heatCapacityAutoDemoWaitTimer?.phase === 'exiting'
                          ? ' studio-heat-wait-overlay-exiting'
                          : ''
                      }`}
                      data-heat-capacity-wait-overlay="true"
                      data-heat-capacity-wait-mode={activeFile.heatCapacityMode}
                    >
                      <HeatCapacityWaitController
                        elapsedS={heatCapacityWaitTimer.elapsedS}
                        targetS={heatCapacityWaitTimer.targetS}
                        phaseLabel={heatCapacityWaitTimerDisplay.label}
                        statusText={heatCapacityWaitTimerDisplay.statusText}
                        speedMultiplier={heatCapacityActiveSpeedMultiplier}
                        speedLabelCode={heatCapacityRealtimeCopy.freeSpeedLabelCode}
                        speedLabel={heatCapacityRealtimeCopy.freeSpeedLabel}
                        speedAriaLabel={heatCapacityRealtimeCopy.freeSpeedAria}
                        speedOptionsDisabled={heatCapacitySpeedOptionsDisabled}
                        onSpeedMultiplierChange={updateHeatCapacityFreeEquilibriumSpeedMultiplier}
                      />
                    </div>
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
                <div className="studio-heat-preview-control-stack" data-heat-capacity-preview-control-stack="true">
                  {activeFile.heatCapacityMode === 'free' && freeRecordControlsVisible ? (
                    <div
                      className="studio-heat-record-controls studio-heat-free-record-controls"
                      data-heat-capacity-free-record-controls="true"
                    >
                      {freeRecordU0ButtonState ? renderFreeRecordButton('u0', freeRecordU0ButtonState) : null}
                      {freeRecordU1ButtonState ? renderFreeRecordButton('u1', freeRecordU1ButtonState) : null}
                      {freeRecordU2ButtonState ? renderFreeRecordButton('u2', freeRecordU2ButtonState) : null}
                    </div>
                  ) : null}
                  {(() => {
                    const guideStep = getHeatCapacityGuideStep(activeFile);
                    const activeRecordKind = guideHeatCapacityActiveFileId === activeFile.id && !autoDemoInteractionLocked
                      ? activeFile.heatCapacityMode !== 'guide'
                        ? guideStep === 'recordU0Required'
                          ? 'u0'
                          : guideStep === 'recordU1Required'
                            ? 'u1'
                            : guideStep === 'recordU2Required'
                              ? 'u2'
                              : null
                        : null
                      : null;
                    const visibleRecordKind = activeFile.heatCapacityMode === 'guide'
                      ? null
                      : activeRecordKind ?? heatCapacityRecordControlsClosing;
                    if (!visibleRecordKind) return null;
                    const label = visibleRecordKind === 'u0'
                      ? heatCapacityRealtimeCopy.recordU0
                      : visibleRecordKind === 'u1'
                        ? heatCapacityRealtimeCopy.recordU1
                        : heatCapacityRealtimeCopy.recordU2;
                    return (
                      <div
                        className={`studio-heat-record-controls ${guideHeatCapacityPulseActive && guideHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''} ${!activeRecordKind ? 'studio-heat-record-controls-exiting' : ''}`}
                        data-heat-capacity-record-controls="true"
                      >
                        <button
                          type="button"
                          data-heat-capacity-guided-record={visibleRecordKind}
                          disabled={!activeRecordKind}
                          onClick={() => recordHeatCapacityGuideSample(visibleRecordKind)}
                        >
                          {renderScientificText(label)}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
              const heatCapacityCenterOverlay = (
                <>
                  {activeHeatCapacityPreheatLocked ? (
                    <HeatCapacityPreheatOverlay
                      key={`${activeFile.id}:${activeHeatCapacityPreheatMode}`}
                      language={settingsLanguagePreference}
                      paused={heatCapacityRefreshRestoring || heatCapacityModeTransitionLocked || (
                        activeHeatCapacityPreheatMode === 'demo' && autoDemoPaused
                      )}
                      onComplete={completeActiveHeatCapacityPreheat}
                    />
                  ) : null}
                  {activeHeatCapacityInvalidAttemptPrompt ? (
                    <HeatCapacityInvalidAttemptDialog
                      language={settingsLanguagePreference}
                      onReset={resetHeatCapacityFreeRun}
                      onContinue={continueHeatCapacityInvalidAttempt}
                    />
                  ) : null}
                  {!activeHeatCapacityModalLocked && activeHeatCapacityPressureAlarmVisible ? (
                    <div className="studio-heat-pressure-warning" data-heat-capacity-pressure-warning="true" role="alert">
                      <div className="studio-heat-pressure-warning-kicker">
                        <span>{heatCapacityRealtimeCopy.safetyLimit}</span>
                        <em>{heatCapacityRealtimeCopy.safetyActive}</em>
                      </div>
                      <strong>{heatCapacityRealtimeCopy.pressureAlarmTitle}</strong>
                      <span>{heatCapacityRealtimeCopy.pressureWarningFallback}</span>
                      <em>{heatCapacityRealtimeCopy.pressureWarningObserve}</em>
                    </div>
                  ) : null}
                  {!activeHeatCapacityModalLocked && autoDemoCompletionMessage ? (
                    <div className="studio-heat-demo-complete-toast" data-heat-capacity-demo-complete-toast="true">
                      <span className="studio-heat-toast-kicker">{heatCapacityRealtimeCopy.toastSystemKicker}</span>
                      <strong>{autoDemoCompletionMessage}</strong>
                    </div>
                  ) : null}
                  {!activeHeatCapacityModalLocked && heatCapacityToastCurrent ? (
                    <div
                      key={heatCapacityToastCurrent.id}
                      className={`studio-heat-guide-step-hint studio-heat-guide-step-hint-${heatCapacityToastCurrent.level}`}
                      data-heat-capacity-guide-step-hint="true"
                      data-heat-capacity-toast="true"
                      data-heat-capacity-toast-level={heatCapacityToastCurrent.level}
                    >
                      <span className="studio-heat-toast-kicker">{heatCapacityToastCurrent.level}</span>
                      <strong>{renderScientificText(heatCapacityToastCurrent.text)}</strong>
                    </div>
                  ) : null}
                </>
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
                <div
                  ref={heatCapacityGuideMaskRef}
                  className={`studio-heat-guide-strong-mask studio-heat-guide-strong-mask-${heatCapacityGuideStrongTargetSpec.id}`}
                  data-heat-capacity-guide-strong-mask="true"
                  data-heat-capacity-guide-mask-target={heatCapacityGuideStrongTargetSpec.id}
                >
                  <svg
                    className="studio-heat-guide-strong-cutout-svg"
                    viewBox={`0 0 ${heatCapacityGuideMaskBounds.width} ${heatCapacityGuideMaskBounds.height}`}
                    aria-hidden="true"
                  >
                    <path
                      className="studio-heat-guide-strong-dim"
                      d={heatCapacityGuideDimPath}
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                    <g>
                      {heatCapacityGuideCutouts.map(renderHeatCapacityGuideStrongCutoutOutline)}
                    </g>
                  </svg>
                  <div className="studio-heat-guide-strong-card">
                    <strong>{renderScientificText(heatCapacityGuideStrongReminderText)}</strong>
                  </div>
                </div>
              ) : null;
              const heatCapacityGuideLessonOverlay = renderHeatCapacityGuideLessonOverlay();
              const heatCapacityPreheatLockOverlay = activeHeatCapacityModalLocked ? (
                <div
                  className="studio-heat-preheat-lock-layer"
                  data-heat-capacity-modal-lock="true"
                  data-heat-capacity-preheat-lock={activeHeatCapacityPreheatLocked ? 'true' : undefined}
                />
              ) : null;
              const heatCapacityGuideMaskOverlay = heatCapacityPreheatLockOverlay || heatCapacityGuideStrongMaskOverlay || heatCapacityGuideLessonOverlay ? (
                <>
                  {heatCapacityPreheatLockOverlay}
                  {heatCapacityGuideStrongMaskOverlay}
                  {heatCapacityGuideLessonOverlay}
                </>
              ) : null;
              const heatCapacityHardSphereGasTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsState.gasTemperatureK
                  : activeFile.gasTemperatureK;
              const heatCapacityHardSphereAmbientTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK
                  : activeFile.ambientTemperatureK;
              const heatCapacityHardSphereGasAmountRatio = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasAmountRatio
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreePhysicsState.gasAmountRatio
                  : clampHeatCapacityHardSphereNumber(
                      (Math.max(0.001, activeFile.gasPressureKPaAbs) / Math.max(0.001, activeFile.ambientPressureKPa)) *
                        (Math.max(1, heatCapacityHardSphereAmbientTemperatureK) / Math.max(1, heatCapacityHardSphereGasTemperatureK)),
                      0.05,
                      2.5,
                    );
              const activeHeatCapacityUsesVisualPhysics = activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide';
              const heatCapacityPhysicalReleaseReference = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.releaseReference
                : activeFile.heatCapacityFreePhysicsState.releaseReference;
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
                      : activeFile.heatCapacityFreePhysicsState;
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
                  ? activeFile.heatCapacityFreePhysicsState.pumpProcesses ?? []
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
                  interactionLocked={autoDemoInteractionLocked || activeHeatCapacityModalLocked || heatCapacityTeachingCompleted || heatCapacityModeTransitionLocked}
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
                    activeHeatCapacityFreeBatchProgress?.targetGroupCount !== null &&
                    activeHeatCapacityFreeBatchProgress?.currentGroupNumber !== null
                      ? (
                          <HeatCapacityBatchProgress
                            currentGroup={activeHeatCapacityFreeBatchProgress.currentGroupNumber}
                            targetGroupCount={activeHeatCapacityFreeBatchProgress.targetGroupCount}
                            language={settingsLanguagePreference}
                            restartDisabled={heatCapacityCalculationWindowOpen}
                            onRestartBatch={restartHeatCapacityFreeBatch}
                          />
                        )
                      : null
                  }
                  overlayBottomRight={heatCapacityBottomRightOverlay}
                  overlayCenter={heatCapacityCenterOverlay}
                  overlayCenterAboveGuideMask={
                    activeHeatCapacityModalLocked || guideHeatCapacityStrongReminderActive
                  }
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
          <PistonOscillationInstrumentScene
            key={activeFile.id}
            language={settingsLanguagePreference}
            sceneTheme={resolvedWorkbenchTheme}
            cameraPreset={activeFile.previewCameraPreset}
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

  const renderRealtimeHistogram = (title: string, bins: HistogramBin[], accent: 'blue' | 'violet') => {
    const compactBins = getCompactHistogramBins(bins);
    const maxProbability = Math.max(0.0001, ...compactBins.map((bin) => bin.probability), ...compactBins.map((bin) => bin.theoretical ?? 0));
    const runtime = activeFile.kind === 'standard' ? standardRuntimeRef.current[activeFile.id] : null;
    const sampleCount = activeFile.kind === 'standard' ? runtime?.engine.getCollectedSampleCount() ?? 0 : 0;

    return (
      <div className={`studio-live-chart studio-live-chart-${accent}`}>
        <div className="studio-live-chart-header">
          <span>{title}</span>
            <strong>{sampleCount > 0 ? workbenchCopy.results.sampleWindows(sampleCount) : workbenchCopy.results.waiting}</strong>
        </div>
        <div className="studio-live-chart-bars">
          {compactBins.length > 0 ? (
            compactBins.map((bin, index) => {
              const simulationHeight = Math.max(2, (bin.probability / maxProbability) * 100);
              const theoryHeight = bin.theoretical ? Math.max(2, (bin.theoretical / maxProbability) * 100) : 0;
              const label = `${bin.binStart.toFixed(2)}-${bin.binEnd.toFixed(2)}: ${bin.probability.toFixed(4)}`;

              return (
                <span className="studio-live-chart-bin" key={`${title}-${index}`} title={label}>
                  <i style={{ height: `${simulationHeight}%` }} />
                  {theoryHeight > 0 ? <em style={{ bottom: `${theoryHeight}%` }} /> : null}
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">{workbenchCopy.results.standardRealtimeEmpty}</div>
          )}
        </div>
        <div className="studio-live-chart-axis">
          <span>{compactBins[0]?.binStart.toFixed(2) ?? '0.00'}</span>
          <span>{workbenchCopy.results.probabilityDensity}</span>
          <span>{compactBins[compactBins.length - 1]?.binEnd.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>
    );
  };

  const renderIdealPressureTrace = () => {
    if (activeFile.kind !== 'ideal') return null;

    const summary = activeFile.latestPressureSummary;
    const history = summary?.history.slice(-42) ?? [];
    const maxPressure = Math.max(
      0.0001,
      ...history.map((point) => point.measuredPressure),
      ...history.map((point) => point.idealPressure),
    );

    return (
      <div className="studio-live-chart studio-ideal-pressure-chart">
        <div className="studio-live-chart-header">
          <span>{workbenchCopy.results.idealPressureTrace(getRelationLabel(activeFile.relation))}</span>
            <strong>{summary ? workbenchCopy.results.samples(summary.sampleCount) : workbenchCopy.results.waiting}</strong>
        </div>
        <div className="studio-ideal-pressure-bars">
          {history.length > 0 ? (
            history.map((point, index) => {
              const measuredHeight = Math.max(2, (point.measuredPressure / maxPressure) * 100);
              const idealHeight = Math.max(2, (point.idealPressure / maxPressure) * 100);
              return (
                <span
                  key={`${point.time}-${index}`}
                  title={`t=${point.time.toFixed(2)} ${workbenchCopy.results.measuredPressure}=${point.measuredPressure.toFixed(4)} ${workbenchCopy.results.idealPressure}=${point.idealPressure.toFixed(4)}`}
                >
                  <i style={{ height: `${measuredHeight}%` }} />
                  <em style={{ bottom: `${idealHeight}%` }} />
                </span>
              );
            })
          ) : (
            <div className="studio-live-chart-empty">{workbenchCopy.results.currentIdealPressureHint}</div>
          )}
        </div>
        <div className="studio-live-chart-axis">
          <span>{workbenchCopy.results.measuredBars}</span>
          <span>{workbenchCopy.results.idealLine}</span>
          <span>{getRelationLabel(activeFile.relation)}</span>
        </div>
      </div>
    );
  };

  const renderIdealRelationSnapshot = () => {
    if (activeFile.kind !== 'ideal') return null;

    const analysis = idealAnalysis;
    const summary = activeFile.latestPressureSummary;
    const relationValue = getRelationVariableNumericValue(activeFile.relation, activeFile.activeParams);

    return (
      <div className="studio-ideal-point-strip">
        <div><span>{workbenchCopy.results.scan}</span><strong>{formatMetric(relationValue, activeFile.relation === 'pn' ? 0 : 3)}</strong></div>
        <div><span>{workbenchCopy.results.measuredPressure}</span><strong>{formatMaybeMetric(summary?.meanPressure, 4)}</strong></div>
        <div><span>{workbenchCopy.results.idealPressure}</span><strong>{formatMaybeMetric(summary?.meanIdealPressure, 4)}</strong></div>
        <div><span>{workbenchCopy.results.gap}</span><strong>{summary?.relativeGap === null || summary?.relativeGap === undefined ? '--' : `${formatMetric(summary.relativeGap, 2)}%`}</strong></div>
        <div><span>{workbenchCopy.results.status}</span><strong>{getLocalizedStatusValue(analysis?.verdictState ?? 'insufficient', workbenchCopy)}</strong></div>
        <div><span>{workbenchCopy.results.finalState}</span><strong>{activeFile.needsReset ? workbenchCopy.parameters.idealRuntimeOnStart : getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>
    );
  };

  const renderHeatCapacityRealtimePanel = () => {
    if (activeFile.kind !== 'heatCapacity') return null;

    const getHeatCapacityPhaseLabel = (phase: typeof activeFile.heatCapacityPhase) => {
      if (phase === 'powerOff') return heatCapacityRealtimeCopy.phaseLabels.powerOff;
      if (phase === 'readyToZero') return heatCapacityRealtimeCopy.phaseLabels.readyToZero;
      if (phase === 'zeroed') return heatCapacityRealtimeCopy.phaseLabels.zeroed;
      if (phase === 'readyToPump') return heatCapacityRealtimeCopy.phaseLabels.readyToPump;
      if (phase === 'pumping') return heatCapacityRealtimeCopy.phaseLabels.pumping;
      if (phase === 'sealedStabilizing') return heatCapacityRealtimeCopy.phaseLabels.sealedStabilizing;
      if (phase === 'releasing') return heatCapacityRealtimeCopy.phaseLabels.releasing;
      if (phase === 'recovering') return heatCapacityRealtimeCopy.phaseLabels.recovering;
      return heatCapacityRealtimeCopy.phaseLabels.fallback;
    };
    const heatCapacityDisplayPhase = isHeatCapacityPhysicalKernelMode(activeFile.heatCapacityMode)
      ? getHeatCapacityFreeDisplayPhase(activeFile)
      : activeFile.heatCapacityPhase;
    const phaseLabel = getHeatCapacityPhaseLabel(heatCapacityDisplayPhase);
    const stopcockState = getHeatCapacityStopcockState(activeFile.stopcockAngleDeg);
    const stopcockStateLabel = stopcockState === 'open' ? heatCapacityRealtimeCopy.stopcock.open : heatCapacityRealtimeCopy.stopcock.closed;
    const heatCapacityRunBadge = activeFile.heatCapacityMode === 'free'
      ? heatCapacityRealtimeCopy.trialBadge(getActiveHeatCapacityFreeTrialIndex(activeFile) + 1)
      : heatCapacityRealtimeCopy.singleTrialBadge;
    const heatCapacityHeaderBadges = [
      {
        key: 'stage',
        label: `${heatCapacityRealtimeCopy.stagePrefix}${phaseLabel}`,
        className: 'studio-heat-status-badge-stage',
      },
      {
        key: 'trial',
        label: heatCapacityRunBadge,
        className: 'studio-heat-status-badge-trial',
        dataAttr: true,
      },
      ...(autoDemoInteractionLocked
        ? [{
            key: 'demo',
            label: autoDemoPaused ? heatCapacityRealtimeCopy.demoPaused : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoReady,
            className: 'studio-heat-status-badge-mode',
          }]
        : []),
      ...(autoDemoInteractionLocked
        ? [{
            key: 'lock',
            label: heatCapacityRealtimeCopy.operationLocked,
            className: 'studio-heat-status-badge-warning',
          }]
        : []),
    ];
    const temperatureSignalValue = activeFile.powerOn && typeof activeFile.temperatureSignalMv === 'number'
      ? formatHeatCapacitySignalMv(activeFile.temperatureSignalMv)
      : '--.-';
    const pressureSignalValue = activeFile.powerOn && typeof activeFile.pressureSignalMv === 'number'
      ? formatHeatCapacitySignalMv(activeFile.pressureSignalMv)
      : '--.-';
    const currentDeltaPKPa = activeFile.powerOn &&
      typeof activeFile.pressureSignalMv === 'number' &&
      Number.isFinite(activeFile.pressureSensitivityMvPerKPa) &&
      activeFile.pressureSensitivityMvPerKPa > 0
      ? Math.max(0, activeFile.pressureSignalMv / activeFile.pressureSensitivityMvPerKPa)
      : null;
    const currentDeltaPValue = currentDeltaPKPa === null ? '--' : formatMetric(currentDeltaPKPa, 2);
    const effectivePressureSafetyStatus = activeHeatCapacityPressureAlarmVisible ? 'danger' : activeFile.pressureSafetyStatus;
    const pressureSafetyStatusLabel = effectivePressureSafetyStatus === 'danger'
      ? heatCapacityRealtimeCopy.safety.danger
      : effectivePressureSafetyStatus === 'warning'
        ? heatCapacityRealtimeCopy.safety.warning
        : heatCapacityRealtimeCopy.safety.normal;
    const pressureSafetyNote = effectivePressureSafetyStatus === 'danger'
      ? heatCapacityRealtimeCopy.safety.dangerNote
      : effectivePressureSafetyStatus === 'warning'
        ? heatCapacityRealtimeCopy.safety.warningNote
        : heatCapacityRealtimeCopy.safety.normalNote;
    const zeroStatusLabel = activeFile.pressureZeroAdjusted
      ? heatCapacityRealtimeCopy.zeroStatus.completed
      : canZeroHeatCapacityPressure(activeFile)
        ? heatCapacityRealtimeCopy.zeroStatus.adjustable
        : heatCapacityRealtimeCopy.zeroStatus.notReady;
    const localizedHeatCapacityPumpHint = getLocalizedHeatCapacityPumpHint(
      activeFile.pumpHint,
      settingsLanguagePreference,
    );
    const currentHint = (() => {
      if (guideHeatCapacityActiveFileId === activeFile.id && !autoDemoInteractionLocked) {
        const guideStep = getHeatCapacityGuideStep(activeFile);
        if (guideStep !== 'idle' && guideStep !== 'completed') {
          return getGuideStepGuidance(guideStep, activeFile).message;
        }
      }
      if (!activeFile.powerOn || heatCapacityDisplayPhase === 'powerOff') return heatCapacityRealtimeCopy.hints.powerOff;
      if (heatCapacityDisplayPhase === 'readyToZero') return heatCapacityRealtimeCopy.hints.readyToZero;
      if (heatCapacityDisplayPhase === 'zeroed' || heatCapacityDisplayPhase === 'readyToPump') return heatCapacityRealtimeCopy.hints.readyToPump;
      if (heatCapacityDisplayPhase === 'pumping') return heatCapacityRealtimeCopy.hints.pumping;
      if (heatCapacityDisplayPhase === 'sealedStabilizing') return heatCapacityRealtimeCopy.hints.sealedStabilizing;
      if (heatCapacityDisplayPhase === 'releasing') return heatCapacityRealtimeCopy.hints.releasing;
      if (heatCapacityDisplayPhase === 'recovering') return heatCapacityRealtimeCopy.hints.recovering;
      return localizedHeatCapacityPumpHint || heatCapacityRealtimeCopy.hints.fallback;
    })();
    return (
      <div className="studio-realtime-panel studio-realtime-panel-heat">
        <div className="studio-heat-monitor-header" data-heat-capacity-realtime-header="true">
          <div className="studio-heat-monitor-title">
            <span>{heatCapacityRealtimeCopy.realtimeKicker}</span>
            <strong>{heatCapacityRealtimeCopy.realtimeTitle}</strong>
            <small>{renderScientificText(heatCapacityRealtimeCopy.realtimeSubtitle)}</small>
          </div>
          <div className="studio-heat-status-badges">
            {heatCapacityHeaderBadges.map((badge) => (
              <span
                key={badge.key}
                className={`studio-heat-status-badge ${badge.className}`}
                data-heat-capacity-trial-badge={badge.key === 'trial' ? 'true' : undefined}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
        <div className="studio-heat-live-readings" data-heat-capacity-live-readings="true">
          <div className="studio-heat-reading-card studio-heat-reading-card-primary">
            <span>{renderScientificText('Uₜ / mV')}</span>
            <strong>{temperatureSignalValue}</strong>
            <em>{heatCapacityRealtimeCopy.readings.temperature}</em>
          </div>
          <div className="studio-heat-reading-card studio-heat-reading-card-primary">
            <span>{renderScientificText('Uₚ / mV')}</span>
            <strong>{pressureSignalValue}</strong>
            <em>{heatCapacityRealtimeCopy.readings.pressure}</em>
          </div>
          <div className="studio-heat-reading-card">
            <span>{renderScientificText('ΔP / kPa')}</span>
            <strong>{currentDeltaPValue}</strong>
            <em>{renderScientificText(heatCapacityRealtimeCopy.readings.delta)}</em>
          </div>
          <div className={`studio-heat-reading-card studio-heat-safety-card studio-heat-safety-${effectivePressureSafetyStatus}`}>
            <span>{heatCapacityRealtimeCopy.readings.safety}</span>
            <strong>{pressureSafetyStatusLabel}</strong>
            <em>{pressureSafetyNote}</em>
          </div>
        </div>
        <div className="studio-heat-operation-status" data-heat-capacity-operation-status="true">
          <div><span>{heatCapacityRealtimeCopy.readings.pumpValve}</span><strong>{activeFile.pumpValveOpen ? heatCapacityRealtimeCopy.readings.opened : heatCapacityRealtimeCopy.readings.closed}</strong></div>
          <div><span>{heatCapacityRealtimeCopy.readings.stopcock}</span><strong>{stopcockStateLabel}</strong></div>
          <div><span>{heatCapacityRealtimeCopy.readings.zero}</span><strong>{zeroStatusLabel}</strong></div>
        </div>
        <div className="studio-heat-current-hint" data-heat-capacity-current-hint="true">
          <span>{heatCapacityRealtimeCopy.readings.currentHint}</span>
          <strong>{renderScientificText(currentHint)}</strong>
        </div>
      </div>
    );
  };

  const renderRealtimePanel = () => (
    activeFile.kind === 'heatCapacityPistonOscillation' ? (
      <div
        className="studio-realtime-panel studio-realtime-panel-piston-oscillation"
        data-piston-oscillation-realtime="placeholder"
      >
        <PistonOscillationRealtimeUnavailable language={settingsLanguagePreference} />
      </div>
    ) : activeFile.kind === 'heatCapacity' ? renderHeatCapacityRealtimePanel() : (
    <div className={`studio-realtime-panel ${activeFile.kind === 'ideal' ? 'studio-realtime-panel-ideal' : 'studio-realtime-panel-standard'}`}>
      <div className={`studio-realtime-summary ${activeFile.kind === 'ideal' ? 'studio-realtime-summary-ideal' : 'studio-realtime-summary-standard'}`}>
        {activeFile.kind === 'ideal' ? (
          <>
            <div title={workbenchCopy.results.meanTemperature}><span>{workbenchCopy.results.meanTemperature}</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanTemperature ?? activeFile.stats.temperature)}</strong></div>
            <div title={workbenchCopy.results.measuredPressure}><span>{workbenchCopy.results.measuredPressure}</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanPressure ?? activeFile.stats.pressure, 4)}</strong></div>
            <div title={workbenchCopy.results.idealPressure}><span>{workbenchCopy.results.idealPressure}</span><strong>{formatMaybeMetric(activeFile.latestPressureSummary?.meanIdealPressure, 4)}</strong></div>
            <div title={workbenchCopy.results.relativeGap}><span>{workbenchCopy.results.gap}</span><strong>{activeFile.latestPressureSummary?.relativeGap === null || activeFile.latestPressureSummary?.relativeGap === undefined ? '--' : `${formatMetric(activeFile.latestPressureSummary.relativeGap, 2)}%`}</strong></div>
            <div title={workbenchCopy.results.activeRelation}><span>{workbenchCopy.parameters.relation}</span><strong>{getRelationLabel(activeFile.relation)}</strong></div>
            <div title={workbenchCopy.results.samplingProgress}><span>{workbenchCopy.results.samplingProgress}</span><strong>{formatPercent(activeFile.stats.progress)}</strong></div>
          </>
        ) : (
          <>
            <div><span>{workbenchCopy.results.temperature}</span><strong>{formatMetric(activeFile.stats.temperature)}</strong></div>
            <div><span>{workbenchCopy.results.pressure}</span><strong>{formatMetric(activeFile.stats.pressure, 4)}</strong></div>
            <div><span>{workbenchCopy.results.meanSpeed}</span><strong>{formatMetric(activeFile.stats.meanSpeed)}</strong></div>
            <div><span>{workbenchCopy.results.rmsSpeed}</span><strong>{formatMetric(activeFile.stats.rmsSpeed)}</strong></div>
            <div><span>{workbenchCopy.results.phase}</span><strong>{workbenchCopy.results.phaseStates[activeFile.stats.phase]}</strong></div>
            <div><span>{workbenchCopy.results.samplingProgress}</span><strong>{formatPercent(activeFile.stats.progress)}</strong></div>
          </>
        )}
      </div>
      <div className={`studio-live-charts ${activeFile.kind === 'ideal' ? 'studio-live-charts-ideal' : ''}`}>
        {activeFile.kind === 'standard' ? (
          <>
            {renderRealtimeHistogram(workbenchCopy.results.speedDistribution, activeFile.chartData.speed, 'blue')}
            {renderRealtimeHistogram(workbenchCopy.results.energyDistribution, activeFile.chartData.energy, 'violet')}
          </>
        ) : (
          <>
            {renderIdealPressureTrace()}
            {renderIdealRelationSnapshot()}
          </>
        )}
      </div>
    </div>
    )
  );

  const renderExperimentPointsPanel = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.experimentPointTableTitle}</strong>
            <p>{workbenchCopy.results.experimentPointTableBody}</p>
          </div>
        </div>
      );
    }

    const clearKey = `${activeFile.id}:${activeFile.relation}`;
    const points = idealAnalysis.sortedPoints;

    return (
      <div className="studio-data-table-panel">
        <section className="studio-data-table-section">
          <div className="studio-results-subheader">
            <div>
              <strong>{workbenchCopy.results.pointsTitle(getRelationLabel(activeFile.relation))}</strong>
              <span>{workbenchCopy.results.recordedPoints(points.length)}</span>
            </div>
            <div className={`studio-results-clear-actions ${pendingClearRelationKey === clearKey ? 'studio-results-clear-actions-pending' : ''}`}>
              <button
                type="button"
                className={`studio-results-clear-button ${pendingClearRelationKey === clearKey ? 'studio-results-clear-confirm' : ''}`}
                onClick={requestClearIdealRelation}
                disabled={points.length === 0}
              >
                <Trash2 size={13} />
                {pendingClearRelationKey === clearKey ? workbenchCopy.results.confirmClear : workbenchCopy.results.clearRelation}
              </button>
              {pendingClearRelationKey === clearKey ? (
                <button
                  type="button"
                  className="studio-results-clear-button studio-results-clear-cancel"
                  onClick={cancelClearIdealRelation}
                >
                  {workbenchCopy.results.cancel}
                </button>
              ) : null}
            </div>
          </div>
          {points.length === 0 ? (
            <div className="studio-panel-note">
              {workbenchCopy.results.runToRecord}
            </div>
          ) : (
            <table className="studio-table studio-ideal-points-table">
              <thead>
                <tr>
                  <th>#</th>
                  {activeFile.relation === 'pt' ? <th>{workbenchCopy.parameters.targetTemperature}</th> : null}
                  {activeFile.relation === 'pv' ? <><th>L</th><th>V</th><th>1/V</th></> : null}
                  {activeFile.relation === 'pn' ? <th>N</th> : null}
                  <th>{workbenchCopy.results.meanTemperature}</th>
                  <th>{workbenchCopy.results.measuredPressure}</th>
                  <th>{workbenchCopy.results.idealPressure}</th>
                  <th>{workbenchCopy.results.relativeGap}</th>
                  <th>{workbenchCopy.results.tableTime}</th>
                  <th>{workbenchCopy.results.tableAction}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr key={point.id}>
                    <td>{index + 1}</td>
                    {activeFile.relation === 'pt' ? <td>{formatMetric(point.targetTemperature, 2)}</td> : null}
                    {activeFile.relation === 'pv' ? (
                      <>
                        <td>{formatMaybeMetric(point.boxLength, 2)}</td>
                        <td>{formatMaybeMetric(point.volume, 1)}</td>
                        <td>{formatMaybeMetric(point.inverseVolume, 6)}</td>
                      </>
                    ) : null}
                    {activeFile.relation === 'pn' ? <td>{formatMaybeMetric(point.particleCount, 0)}</td> : null}
                    <td>{formatMetric(point.meanTemperature, 3)}</td>
                    <td>{formatMetric(point.meanPressure, 5)}</td>
                    <td>{formatMetric(point.idealPressure, 5)}</td>
                    <td>{formatMetric(point.relativeGap, 2)}%</td>
                    <td>{new Date(point.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</td>
                    <td>{renderIdealPointRemoveAction(point)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    );
  };

  const renderIdealValidationChart = (
    analysis: IdealGasAnalysis,
    variant: 'linear' | 'pvRaw' = 'linear',
  ) => {
    if (activeFile.kind !== 'ideal') return null;

    const points = analysis.sortedPoints
      .map((point) => ({
        point,
        x: variant === 'pvRaw' ? point.volume ?? 0 : getRelationXValue(analysis.relation, point),
        measured: point.meanPressure,
        ideal: point.idealPressure,
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.measured) && point.x > 0);

    if (points.length === 0) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
    }

    const xValues = points.map((point) => point.x);
    const yValues = points.flatMap((point) => [point.measured, point.ideal]);
    if (variant === 'linear' && analysis.regression.slope !== null && analysis.regression.intercept !== null) {
      xValues.forEach((x) => yValues.push((analysis.regression.slope ?? 0) * x + (analysis.regression.intercept ?? 0)));
    }

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(0, ...yValues);
    const maxY = Math.max(0.0001, ...yValues);
    const xSpan = Math.max(0.0001, maxX - minX);
    const ySpan = Math.max(0.0001, maxY - minY);
    const xTo = (value: number) => 34 + ((value - minX) / xSpan) * 324;
    const yTo = (value: number) => 146 - ((value - minY) / ySpan) * 112;
    const measuredPoints = points.map((point) => `${xTo(point.x)},${yTo(point.measured)}`).join(' ');
    const idealPoints = points.map((point) => `${xTo(point.x)},${yTo(point.ideal)}`).join(' ');
    const fitPoints =
      variant === 'linear' && analysis.regression.slope !== null && analysis.regression.intercept !== null
        ? [minX, maxX]
            .map((x) => `${xTo(x)},${yTo(analysis.regression.slope * x + analysis.regression.intercept)}`)
            .join(' ')
        : '';
    const theoryPoints =
      variant === 'linear' && analysis.theoreticalSlope !== null
        ? [minX, maxX].map((x) => `${xTo(x)},${yTo(analysis.theoreticalSlope * x)}`).join(' ')
        : idealPoints;
    const xLabel = variant === 'pvRaw'
      ? 'V'
      : analysis.relation === 'pv'
        ? '1/V'
        : analysis.relation === 'pn'
          ? 'N'
          : 'T';

    return (
      <div className="studio-ideal-chart-card">
        <svg viewBox="0 0 392 176" role="img" aria-label={workbenchCopy.results.verificationChartAria(getRelationLabel(analysis.relation))}>
          <line x1="34" y1="146" x2="358" y2="146" />
          <line x1="34" y1="34" x2="34" y2="146" />
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={`grid-${ratio}`}
              className="studio-ideal-chart-grid"
              x1="34"
              y1={146 - ratio * 112}
              x2="358"
              y2={146 - ratio * 112}
            />
          ))}
          {theoryPoints ? <polyline className="studio-ideal-chart-theory" points={theoryPoints} /> : null}
          {fitPoints ? <polyline className="studio-ideal-chart-fit" points={fitPoints} /> : null}
          <polyline className="studio-ideal-chart-measured" points={measuredPoints} />
          {points.map((point) => (
            <circle
              key={`${variant}-${point.point.id}`}
              cx={xTo(point.x)}
              cy={yTo(point.measured)}
              r="3.4"
            />
          ))}
          <text x="196" y="169">{xLabel}</text>
          <text x="8" y="25">P</text>
        </svg>
        <div className="studio-ideal-chart-legend">
          <span><i className="studio-ideal-legend-measured-dot" />{workbenchCopy.results.measuredLegend}</span>
          <span><i className="studio-ideal-legend-fit" />{workbenchCopy.results.fitLegend}</span>
          <span><i className="studio-ideal-legend-theory" />{workbenchCopy.results.theoryLegend}</span>
        </div>
      </div>
    );
  };

  const renderResultsDataTable = () => {
    return (
      <div className="studio-data-table-panel">
        <section className="studio-data-table-section">
          <h4>{workbenchCopy.results.finalState}</h4>
          <table className="studio-table">
            <tbody>
              <tr><th>{workbenchCopy.results.metric}</th><th>{workbenchCopy.results.value}</th><th>{workbenchCopy.results.status}</th></tr>
              <tr><td>{workbenchCopy.results.finalSpeedSamples}</td><td>{resultSummary.speedSampleCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
              <tr><td>{workbenchCopy.results.finalEnergySamples}</td><td>{resultSummary.energySampleCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
              <tr><td>{workbenchCopy.results.tempHistorySamples}</td><td>{resultSummary.tempHistoryCount}</td><td>{resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}</td></tr>
                <tr><td>{workbenchCopy.results.finalDataReady}</td><td>{resultSummary.ready ? workbenchCopy.results.yes : workbenchCopy.results.no}</td><td>{getLocalizedStatusValue(resultSummary.runState, workbenchCopy)}</td></tr>
              <tr><td>{workbenchCopy.results.energyDrift}</td><td>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</td><td>{workbenchCopy.results.diagnostic}</td></tr>
              <tr><td>{workbenchCopy.results.meanAbsTempError}</td><td>{resultSummary.temperatureErrorMeanAbs === null ? '--' : formatMetric(resultSummary.temperatureErrorMeanAbs, 5)}</td><td>{workbenchCopy.results.diagnostic}</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  };

  const exportAvailable = isExportEnvironmentAvailableStatus(exportEnvironmentStatus);
  const exportCopy = workbenchCopy.exportEnvironment[exportEnvironmentStatus];
  const idealPointCount = idealAnalysis?.sortedPoints.length ?? 0;
  const isExportModeDataReady = (mode: WorkbenchExportMode) => (
    activeFile.kind === 'ideal'
      ? mode === 'pointsCsv' || mode === 'completeBundle'
        ? idealPointCount > 0
        : idealPointCount >= 2
      : resultSummary.ready
  );

  const handleExportAction = async (mode: WorkbenchExportMode) => {
    if (!isExportModeDataReady(mode)) {
      pushLog(
        (language) => activeFile.kind === 'ideal' && mode !== 'pointsCsv' && idealPointCount > 0
          ? workbenchCopies[language].logs.exportNeedsTwoPoints(activeFile.name)
          : workbenchCopies[language].logs.exportNotReady(activeFile.name),
        'warning',
      );
      return;
    }

    const payload = createWorkbenchExportPayload(activeFile, mode, settingsLanguagePreference);
    const bridge = window.hardSphereLabExporter;

    if (!exportAvailable) {
      pushLog(
        (language) => workbenchCopies[language].logs.exportPayloadPrepared(
          activeFile.name,
          workbenchCopies[language].logs.exportLabels[mode],
          payload.filename,
          workbenchCopies[language].exportEnvironment[exportEnvironmentStatus].detail,
        ),
        'warning',
      );
      return;
    }

    if (!bridge) {
      pushLog(
        (language) => workbenchCopies[language].logs.exportPayloadPrepared(
          activeFile.name,
          workbenchCopies[language].logs.exportLabels[mode],
          payload.filename,
          workbenchCopies[language].exportEnvironment.unavailable.detail,
        ),
        'warning',
      );
      return;
    }

    setExportInProgress(true);
    pushLog(
      (language) => workbenchCopies[language].logs.exportPreparing(
        activeFile.name,
        workbenchCopies[language].logs.exportLabels[mode],
      ),
      'info',
    );

    try {
      const result = await bridge.exportWorkbenchPayload(payload, {
        mode,
        fileName: activeFile.name,
        defaultDirName: `${activeFile.name} ${mode === 'completeBundle' ? workbenchCopy.results.exportAll : mode === 'figuresZip' || mode === 'verificationFigure' ? workbenchCopy.results.exportFigures : 'Export'}`,
      });

      if (result.status === 'cancelled') {
        pushLog(
          (language) => workbenchCopies[language].logs.exportCancelled(
            activeFile.name,
            workbenchCopies[language].logs.exportLabels[mode],
          ),
          'warning',
        );
        return;
      }

      if (result.status !== 'ok') {
        pushLog(
          (language) => workbenchCopies[language].logs.exportFailed(
            activeFile.name,
            workbenchCopies[language].logs.exportLabels[mode],
            result.message ?? workbenchCopies[language].logs.unknownExporterError,
          ),
          'error',
        );
        return;
      }

      const fileCount = result.files?.length ?? 0;
      if (mode === 'pointsCsv') {
        pushLog(
          (language) => workbenchCopies[language].logs.exportCsvSaved(
            activeFile.name,
            result.files?.[0] ?? result.outDir ?? workbenchCopies[language].logs.selectedLocation,
          ),
          'success',
        );
        return;
      }

      pushLog(
        (language) => workbenchCopies[language].logs.exportCompleted(
          activeFile.name,
          workbenchCopies[language].logs.exportLabels[mode],
          result.outDir ?? workbenchCopies[language].logs.selectedFolder,
          fileCount,
          mode === 'verificationFigure' || mode === 'figuresZip'
            ? ` ${workbenchCopies[language].logs.exportFigureHint}`
            : '',
        ),
        'success',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      pushLog(
        (language) => workbenchCopies[language].logs.exportFailed(
          activeFile.name,
          workbenchCopies[language].logs.exportLabels[mode],
          message ?? workbenchCopies[language].logs.unknownExporterError,
        ),
        'error',
      );
    } finally {
      setExportInProgress(false);
    }
  };

  const renderResultsSummary = () => {
    return (
      <div className="studio-results-section">
        <div className={`studio-result-status ${resultSummary.ready ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
          <strong>{resultSummary.ready ? workbenchCopy.results.resultReadyStatus : workbenchCopy.results.resultNotReadyStatus}</strong>
          <span>
            {resultSummary.ready
              ? workbenchCopy.results.resultReadyDetail
              : workbenchCopy.results.resultNotReadyDetail}
          </span>
        </div>

        <div className="studio-analysis-grid">
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalTime}</span><strong>{formatMetric(resultSummary.finalTime, 2)} s</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalTemperature}</span><strong>{formatMetric(resultSummary.temperature)}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.finalPressure}</span><strong>{formatMetric(resultSummary.pressure, 4)}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.meanSpeed}</span><strong>{formatMetric(resultSummary.meanSpeed)}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.rmsSpeed}</span><strong>{formatMetric(resultSummary.rmsSpeed)}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyDrift}</span><strong>{resultSummary.energyDriftPercent === null ? '--' : `${formatMetric(resultSummary.energyDriftPercent, 4)}%`}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.speedBins}</span><strong>{resultSummary.speedBinCount}</strong></div>
          <div className="studio-analysis-cell"><span>{workbenchCopy.results.energyBins}</span><strong>{resultSummary.energyBinCount}</strong></div>
            <div className="studio-analysis-cell"><span>{workbenchCopy.results.tempSamples}</span><strong>{resultSummary.tempHistoryCount}</strong></div>
        </div>
      </div>
    );
  };

  const getFinalChartAxisCopy = (figureId: string): { xLabel: string; yLabel: string } => {
    const finalChartCopy = settingsLanguagePreference === 'en'
      ? {
          speed: 'Speed v',
          energy: 'Energy E',
          time: 'Time t',
          logDensity: 'Log density',
          temperatureError: 'Temperature error',
          totalEnergy: 'Total energy',
        }
      : settingsLanguagePreference === 'zh-TW'
        ? {
            speed: '速度 v',
            energy: '能量 E',
            time: '時間 t',
            logDensity: '對數密度',
            temperatureError: '溫度誤差',
            totalEnergy: '總能量',
          }
        : {
            speed: '速度 v',
            energy: '能量 E',
            time: '时间 t',
            logDensity: '对数密度',
            temperatureError: '温度误差',
            totalEnergy: '总能量',
          };

    switch (figureId) {
      case 'speed-distribution':
        return { xLabel: finalChartCopy.speed, yLabel: workbenchCopy.results.probabilityDensity };
      case 'energy-distribution':
        return { xLabel: finalChartCopy.energy, yLabel: workbenchCopy.results.probabilityDensity };
      case 'semilog-energy':
        return { xLabel: finalChartCopy.energy, yLabel: finalChartCopy.logDensity };
      case 'temperature-error':
        return { xLabel: finalChartCopy.time, yLabel: finalChartCopy.temperatureError };
      case 'total-energy':
        return { xLabel: finalChartCopy.time, yLabel: finalChartCopy.totalEnergy };
      default:
        return { xLabel: '', yLabel: '' };
    }
  };

  const getFinalChartSparseLegendPosition = (
    points: Array<{ x: number; y: number }>,
  ): FinalChartLegendPosition => {
    const candidates: Array<{
      position: FinalChartLegendPosition;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
    }> = [
      { position: 'upper-right', xMin: 0.58, xMax: 1, yMin: 0, yMax: 0.42 },
      { position: 'upper-left', xMin: 0, xMax: 0.42, yMin: 0, yMax: 0.42 },
      { position: 'lower-right', xMin: 0.58, xMax: 1, yMin: 0.58, yMax: 1 },
      { position: 'lower-left', xMin: 0, xMax: 0.42, yMin: 0.58, yMax: 1 },
    ];

    return candidates.reduce((best, candidate) => {
      const hits = points.filter((point) => {
        const normalizedX = (point.x - FINAL_CHART_LEFT) / FINAL_CHART_PLOT_WIDTH;
        const normalizedY = (point.y - FINAL_CHART_TOP) / FINAL_CHART_PLOT_HEIGHT;
        return (
          normalizedX >= candidate.xMin &&
          normalizedX <= candidate.xMax &&
          normalizedY >= candidate.yMin &&
          normalizedY <= candidate.yMax
        );
      }).length;
      return hits < best.hits ? { position: candidate.position, hits } : best;
    }, { position: 'upper-right' as FinalChartLegendPosition, hits: Number.POSITIVE_INFINITY }).position;
  };

  const getFinalChartLegendWidth = (items: FinalChartLegendItem[]) => {
    const estimateLabelWidth = (label: string) => Array.from(label).reduce((sum, char) => {
      if (/[\u3400-\u9fff]/.test(char)) return sum + 2.55;
      if (char === ' ') return sum + 0.78;
      if (/[A-Z0-9]/.test(char)) return sum + 1.55;
      if (/[il.,:;]/.test(char)) return sum + 0.72;
      return sum + 1.28;
    }, 0);
    const longestLabelWidth = Math.max(0, ...items.map((item) => estimateLabelWidth(item.label)));
    return Math.min(34, Math.max(13.5, longestLabelWidth + 8.9));
  };

  const renderFinalChartLegend = (
    items: FinalChartLegendItem[],
    position: FinalChartLegendPosition = 'upper-right',
    width?: number,
  ) => {
    const panelWidth = width ?? getFinalChartLegendWidth(items);
    const panelLeft = -2.1;
    const panelTop = -2.5;
    const itemGap = 4.35;
    const height = Math.max(6.3, items.length * itemGap + 1.15);
    const positions: Record<FinalChartLegendPosition, { x: number; y: number }> = {
      'upper-left': { x: FINAL_CHART_LEFT + 4.2, y: FINAL_CHART_TOP + 4.7 },
      'upper-right': { x: FINAL_CHART_RIGHT + 0.9 - panelWidth, y: FINAL_CHART_TOP + 4.7 },
      'lower-left': { x: FINAL_CHART_LEFT + 4.2, y: FINAL_CHART_BOTTOM - height - 2.4 },
      'lower-right': { x: FINAL_CHART_RIGHT + 0.9 - panelWidth, y: FINAL_CHART_BOTTOM - height - 2.4 },
    };
    const origin = positions[position];

    return (
      <g className="studio-final-chart-legend" transform={`translate(${origin.x} ${origin.y})`}>
        <rect className="studio-final-chart-legend-panel" x={panelLeft} y={panelTop} width={panelWidth} height={height} />
        {items.map((item, index) => {
          const itemY = index * itemGap;
          const textX = 3.45;
          return (
            <g key={`${item.kind}-${item.label}`} className="studio-final-chart-legend-item">
              {item.kind === 'bar' && (
                <rect className="studio-final-chart-bar studio-final-chart-legend-bar" x="-1.35" y={itemY - 1.25} width="2.65" height="2.35" />
              )}
              {item.kind === 'point' && (
                <circle className={item.className} cx="-0.2" cy={itemY} r="1.1" />
              )}
              {item.kind === 'line' && (
                <line className={item.className} x1="-1.55" y1={itemY} x2="1.45" y2={itemY} />
              )}
              {item.kind === 'boundary' && (
                <line className="studio-final-chart-legend-line" x1="-1.55" y1={itemY} x2="1.45" y2={itemY} />
              )}
              <text className="studio-final-chart-legend-text" x={textX} y={itemY + 0.82}>{item.label}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderFinalChartFrame = (
    figureId: string,
    variant: 'bars' | 'line' | 'semilog',
    children: React.ReactNode,
  ) => {
    const horizontalGrid = [0, 0.25, 0.5, 0.75, 1];
    const verticalGrid = [0, 0.25, 0.5, 0.75, 1];
    const { xLabel, yLabel } = getFinalChartAxisCopy(figureId);

    return (
      <svg
        className={`studio-final-chart studio-final-chart-${variant} studio-final-chart-${figureId}`}
        viewBox={`0 0 ${FINAL_CHART_VIEWBOX_WIDTH} ${FINAL_CHART_VIEWBOX_HEIGHT}`}
        aria-hidden="true"
        focusable="false"
      >
        <rect className="studio-final-chart-panel" x="5.5" y="5" width="91" height="52" />
        <g className="studio-final-chart-grid">
          {horizontalGrid.map((ratio) => {
            const y = FINAL_CHART_TOP + FINAL_CHART_PLOT_HEIGHT * ratio;
            return <line key={`h-${ratio}`} x1={FINAL_CHART_LEFT} y1={y} x2={FINAL_CHART_RIGHT} y2={y} />;
          })}
          {verticalGrid.map((ratio) => {
            const x = FINAL_CHART_LEFT + FINAL_CHART_PLOT_WIDTH * ratio;
            return <line key={`v-${ratio}`} x1={x} y1={FINAL_CHART_TOP} x2={x} y2={FINAL_CHART_BOTTOM} />;
          })}
        </g>
        <line className="studio-final-chart-axis" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_BOTTOM} x2={FINAL_CHART_RIGHT} y2={FINAL_CHART_BOTTOM} />
        <line className="studio-final-chart-axis" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_TOP} x2={FINAL_CHART_LEFT} y2={FINAL_CHART_BOTTOM} />
        <g className="studio-final-chart-ticks">
          {verticalGrid.map((ratio) => {
            const x = FINAL_CHART_LEFT + FINAL_CHART_PLOT_WIDTH * ratio;
            return <line key={`xt-${ratio}`} className="studio-final-chart-tick" x1={x} y1={FINAL_CHART_BOTTOM} x2={x} y2={FINAL_CHART_BOTTOM - 2.4} />;
          })}
          {horizontalGrid.map((ratio) => {
            const y = FINAL_CHART_TOP + FINAL_CHART_PLOT_HEIGHT * ratio;
            return <line key={`yt-${ratio}`} className="studio-final-chart-tick" x1={FINAL_CHART_LEFT} y1={y} x2={FINAL_CHART_LEFT + 2.4} y2={y} />;
          })}
        </g>
        {xLabel && (
          <text className="studio-final-chart-axis-label studio-final-chart-x-label" x={(FINAL_CHART_LEFT + FINAL_CHART_RIGHT) / 2} y="61.2">{xLabel}</text>
        )}
        {yLabel && (
          <text className="studio-final-chart-axis-label studio-final-chart-y-label" transform={`translate(3.2 ${(FINAL_CHART_TOP + FINAL_CHART_BOTTOM) / 2}) rotate(-90)`}>{yLabel}</text>
        )}
        {children}
      </svg>
    );
  };

  const renderFinalFigurePreview = (figureId: string) => {
    if (!resultSummary.ready || !activeFile.finalChartData) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.notReadyPreview}</div>;
    }

    if (figureId === 'temperature-error' || figureId === 'total-energy') {
      const history = activeFile.finalChartData.tempHistory;
      const values = history.map((point) => (figureId === 'temperature-error' ? Math.abs(point.error) : point.totalEnergy));
      const stride = Math.max(1, Math.ceil(values.length / 72));
      const sampledValues = values.filter((_, index) => index % stride === 0).slice(0, 72);
      if (!sampledValues.length) {
        return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
      }

      const rawMinY = figureId === 'temperature-error' ? 0 : Math.min(...sampledValues);
      const rawMaxY = Math.max(...sampledValues);
      const yPadding = rawMaxY === rawMinY ? Math.max(0.0001, Math.abs(rawMaxY) * 0.04) : 0;
      const minY = rawMinY - yPadding;
      const maxY = rawMaxY + yPadding;
      const ySpan = Math.max(0.0001, maxY - minY);
      const toX = (index: number) => FINAL_CHART_LEFT + (sampledValues.length === 1 ? 0.5 : index / (sampledValues.length - 1)) * FINAL_CHART_PLOT_WIDTH;
      const toY = (value: number) => FINAL_CHART_BOTTOM - ((value - minY) / ySpan) * FINAL_CHART_PLOT_HEIGHT;
      const historyPolyline = sampledValues.map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(' ');
      const historyPoints = sampledValues.map((value, index) => ({ x: toX(index), y: toY(value) }));
      const historyLegendPosition = getFinalChartSparseLegendPosition(historyPoints);
      const historyLegendCopy = settingsLanguagePreference === 'en'
        ? { temperatureErrorTrace: 'Temperature error', totalEnergyTrace: 'Total energy', zeroReference: 'Zero reference' }
        : settingsLanguagePreference === 'zh-TW'
          ? { temperatureErrorTrace: '溫度誤差', totalEnergyTrace: '總能量', zeroReference: '零參考線' }
          : { temperatureErrorTrace: '温度误差', totalEnergyTrace: '总能量', zeroReference: '零参考线' };

      return renderFinalChartFrame(
        figureId,
        'line',
        <>
          {figureId === 'temperature-error' && (
            <line className="studio-final-chart-reference" x1={FINAL_CHART_LEFT} y1={FINAL_CHART_BOTTOM} x2={FINAL_CHART_RIGHT} y2={FINAL_CHART_BOTTOM} />
          )}
          <polyline className="studio-final-chart-history" points={historyPolyline} />
          {renderFinalChartLegend([
            {
              kind: 'line',
              className: 'studio-final-chart-history',
              label: figureId === 'temperature-error' ? historyLegendCopy.temperatureErrorTrace : historyLegendCopy.totalEnergyTrace,
            },
            ...(figureId === 'temperature-error'
              ? [{
                  kind: 'line' as const,
                  className: 'studio-final-chart-reference',
                  label: historyLegendCopy.zeroReference,
                }]
              : []),
          ], historyLegendPosition)}
        </>,
      );
    }

    if (figureId === 'semilog-energy') {
      const measuredPoints = activeFile.finalChartData.energy
        .map((bin) => ({
          energy: (bin.binStart + bin.binEnd) / 2,
          logProb: Math.log(bin.probability),
          probability: bin.probability,
        }))
        .filter((point) => Number.isFinite(point.energy) && Number.isFinite(point.logProb) && point.probability > 0);
      if (!measuredPoints.length) {
        return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
      }

      const selectionStartIndex = measuredPoints.length > 4
        ? Math.max(1, Math.floor(measuredPoints.length * 0.18))
        : 0;
      const selectionEndIndex = measuredPoints.length > 4
        ? Math.min(measuredPoints.length - 2, Math.ceil(measuredPoints.length * 0.82) - 1)
        : measuredPoints.length - 1;
      const selectedPoints = measuredPoints.filter((_, index) => index >= selectionStartIndex && index <= selectionEndIndex);
      const excludedPoints = measuredPoints.filter((_, index) => index < selectionStartIndex || index > selectionEndIndex);
      const selectionStartEnergy = selectedPoints[0]?.energy ?? measuredPoints[0].energy;
      const selectionEndEnergy = selectedPoints[selectedPoints.length - 1]?.energy ?? measuredPoints[measuredPoints.length - 1].energy;
      const semilogLegendCopy = settingsLanguagePreference === 'en'
        ? { selected: 'Selected bins', excluded: 'Excluded bins', window: 'Fit window', theory: workbenchCopy.results.theoryLegend }
        : settingsLanguagePreference === 'zh-TW'
          ? { selected: '選中點', excluded: '未選點', window: '選中區間', theory: workbenchCopy.results.theoryLegend }
          : { selected: '选中点', excluded: '未选点', window: '选中区间', theory: workbenchCopy.results.theoryLegend };
      const formatEnergyTick = (value: number) => value.toFixed(value >= 10 ? 1 : 2);
      const theoryPoints = activeFile.finalChartData.energy
        .map((bin) => ({
          energy: (bin.binStart + bin.binEnd) / 2,
          logDensity: bin.theoretical && bin.theoretical > 0 ? Math.log(bin.theoretical) : Number.NaN,
        }))
        .filter((point) => (
          Number.isFinite(point.energy) &&
          Number.isFinite(point.logDensity) &&
          point.energy >= measuredPoints[0].energy &&
          point.energy <= measuredPoints[measuredPoints.length - 1].energy
        ));
      const xValues = [
        ...measuredPoints.map((point) => point.energy),
        ...theoryPoints.map((point) => point.energy),
      ];
      const yValues = [
        ...measuredPoints.map((point) => point.logProb),
        ...theoryPoints.map((point) => point.logDensity),
      ];
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const rawMinY = Math.min(...yValues);
      const rawMaxY = Math.max(...yValues);
      const xSpan = Math.max(0.0001, maxX - minX);
      const rawYSpan = Math.max(0.0001, rawMaxY - rawMinY);
      const minY = rawMinY - rawYSpan * 0.08;
      const maxY = rawMaxY + rawYSpan * 0.16;
      const ySpan = Math.max(0.0001, maxY - minY);
      const toX = (value: number) => FINAL_CHART_LEFT + ((value - minX) / xSpan) * FINAL_CHART_PLOT_WIDTH;
      const toY = (value: number) => FINAL_CHART_BOTTOM - ((value - minY) / ySpan) * FINAL_CHART_PLOT_HEIGHT;
      const theoryPolyline = theoryPoints.map((point) => `${toX(point.energy).toFixed(2)},${toY(point.logDensity).toFixed(2)}`).join(' ');
      const selectionStartX = toX(selectionStartEnergy);
      const selectionEndX = toX(selectionEndEnergy);

      return renderFinalChartFrame(
        figureId,
        'semilog',
        <>
          {theoryPolyline && <polyline className="studio-final-chart-theory studio-final-semilog-theory" points={theoryPolyline} />}
          <line className="studio-final-chart-selection-boundary" x1={selectionStartX} y1={FINAL_CHART_TOP} x2={selectionStartX} y2={FINAL_CHART_BOTTOM} />
          <line className="studio-final-chart-selection-boundary" x1={selectionEndX} y1={FINAL_CHART_TOP} x2={selectionEndX} y2={FINAL_CHART_BOTTOM} />
          <text className="studio-final-chart-boundary-label" x={selectionStartX} y="6.4">{formatEnergyTick(selectionStartEnergy)}</text>
          <text className="studio-final-chart-boundary-label" x={selectionEndX} y="6.4">{formatEnergyTick(selectionEndEnergy)}</text>
          {excludedPoints.map((point, index) => (
            <circle
              className="studio-final-chart-point studio-final-chart-excluded-point studio-final-semilog-point"
              key={`semilog-energy-excluded-${index}`}
              cx={toX(point.energy)}
              cy={toY(point.logProb)}
              r="1.05"
            />
          ))}
          {selectedPoints.map((point, index) => (
            <circle
              className="studio-final-chart-point studio-final-chart-selected-point studio-final-semilog-point"
              key={`semilog-energy-selected-${index}`}
              cx={toX(point.energy)}
              cy={toY(point.logProb)}
              r="1.15"
            />
          ))}
          {renderFinalChartLegend([
            { kind: 'point', className: 'studio-final-chart-selected-point', label: semilogLegendCopy.selected },
            { kind: 'point', className: 'studio-final-chart-excluded-point', label: semilogLegendCopy.excluded },
            { kind: 'boundary', label: semilogLegendCopy.window },
            { kind: 'line', className: 'studio-final-chart-theory', label: semilogLegendCopy.theory },
          ], 'upper-right')}
        </>,
      );
    }

    const bins = figureId === 'speed-distribution'
      ? activeFile.finalChartData.speed
      : activeFile.finalChartData.energy;
    const compactBins = getCompactHistogramBins(bins, 30)
      .filter((bin) => Number.isFinite(bin.binStart) && Number.isFinite(bin.binEnd) && Number.isFinite(bin.probability));
    if (!compactBins.length) {
      return <div className="studio-final-figure-empty">{workbenchCopy.results.noPoints}</div>;
    }

    const minX = Math.min(...compactBins.map((bin) => bin.binStart));
    const maxX = Math.max(...compactBins.map((bin) => bin.binEnd));
    const xSpan = Math.max(0.0001, maxX - minX);
    const maxProbability = Math.max(
      0.0001,
      ...compactBins.map((bin) => bin.probability),
      ...compactBins.map((bin) => bin.theoretical ?? 0),
    );
    const toX = (value: number) => FINAL_CHART_LEFT + ((value - minX) / xSpan) * FINAL_CHART_PLOT_WIDTH;
    const toY = (value: number) => FINAL_CHART_BOTTOM - (Math.max(0, value) / maxProbability) * FINAL_CHART_PLOT_HEIGHT;
    const theoryPolyline = compactBins
      .filter((bin) => Number.isFinite(bin.theoretical))
      .map((bin) => `${toX((bin.binStart + bin.binEnd) / 2).toFixed(2)},${toY(bin.theoretical ?? 0).toFixed(2)}`)
      .join(' ');

    return renderFinalChartFrame(
      figureId,
      'bars',
      <>
        {compactBins.map((bin, index) => {
          const barX = toX(bin.binStart);
          const barRight = toX(bin.binEnd);
          const barWidth = Math.max(0.8, (barRight - barX) * 0.72);
          const barHeight = bin.probability <= 0 ? 0 : Math.max(0.8, FINAL_CHART_BOTTOM - toY(bin.probability));
          return (
            <rect
              className="studio-final-chart-bar"
              key={`${figureId}-${index}`}
              x={barX + ((barRight - barX) - barWidth) / 2}
              y={FINAL_CHART_BOTTOM - barHeight}
              width={barWidth}
              height={barHeight}
            />
          );
        })}
        {theoryPolyline && <polyline className="studio-final-chart-theory" points={theoryPolyline} />}
        {renderFinalChartLegend([
          { kind: 'bar', label: workbenchCopy.results.measuredBars },
          ...(theoryPolyline
            ? [{
                kind: 'line' as const,
                className: 'studio-final-chart-theory',
                label: workbenchCopy.results.theoryLegend,
              }]
            : []),
        ], 'upper-right')}
      </>,
    );
  };

  const renderResultsFigures = () => {
    return (
      <div className="studio-results-section">
        <div className="studio-results-subheader">
          <div>
            <strong>{workbenchCopy.panels.figuresTitle}</strong>
            <span>{workbenchCopy.results.figuresHint}</span>
          </div>
          <button
            type="button"
            disabled={!isExportModeDataReady('figuresZip') || exportInProgress}
            onClick={() => handleExportAction('figuresZip')}
          >
            <FileArchive size={13} />
            {workbenchCopy.results.exportFigures}
          </button>
        </div>

        <div className="studio-figure-list">
          <div className="studio-figure-list-header">
            <strong>{workbenchCopy.panels.figuresTitle}</strong>
            <span>{workbenchCopy.results.exportFilesHint}</span>
          </div>
          {figureSpecs.map((figure) => (
            <div className="studio-figure-row" key={figure.id}>
              <div>
                <strong>{figure.title}</strong>
                <small>{figure.recommendedFilename}</small>
              </div>
              <span>{figure.dataCount}</span>
              <em className={`studio-figure-status-${figure.status}`}>{workbenchCopy.results.figureStatus[figure.status]}</em>
            </div>
          ))}
        </div>

        <div className="studio-final-figures-grid">
          {figureSpecs.map((figure) => (
            <section className="studio-final-figure-card" key={`preview-${figure.id}`}>
              <div>
                <strong>{figure.title}</strong>
                <span>{workbenchCopy.results.figureStatus[figure.status]}</span>
              </div>
              {renderFinalFigurePreview(figure.id)}
            </section>
          ))}
        </div>
      </div>
    );
  };

  const renderIdealPointsWindow = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.noIdealPointsTitle}</strong>
            <p>{workbenchCopy.results.noIdealPointsBody}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="studio-ideal-child-window-body">
        <div className="studio-ideal-results-card">
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>{workbenchCopy.results.experimentStatus}</strong>
              <span>
                {idealPointCount > 0
                  ? workbenchCopy.results.resultsReady(getRelationLabel(activeFile.relation))
                  : workbenchCopy.results.waitingForRecordedPoints(getRelationLabel(activeFile.relation))}
                {' / '}
                {workbenchCopy.results.recordedPoints(idealAnalysis.sortedPoints.length)}
                {' / '}
                {getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy)}
              </span>
            </div>
          </div>
          <div className="studio-ideal-results-status-grid">
            <div><span>{workbenchCopy.results.activeRelation}</span><strong>{getRelationLabel(activeFile.relation)}</strong></div>
            <div><span>{workbenchCopy.results.pointsMetric}</span><strong>{idealAnalysis.sortedPoints.length}</strong></div>
            <div><span>{workbenchCopy.results.status}</span><strong>{getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy)}</strong></div>
            <div><span>{workbenchCopy.results.finalState}</span><strong>{activeFile.needsReset ? workbenchCopy.parameters.idealRuntimeOnStart : getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
          </div>
        </div>
        {renderExperimentPointsPanel()}
      </div>
    );
  };

  const renderIdealVerificationWindow = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.noIdealVerificationTitle}</strong>
            <p>{workbenchCopy.results.noIdealVerificationBody}</p>
          </div>
        </div>
      );
    }

    const verificationSpec = figureSpecs.find((figure) => figure.id === 'ideal-verification');
    const rawPvSpec = figureSpecs.find((figure) => figure.id === 'ideal-raw-pv');
    const pointsSpec = figureSpecs.find((figure) => figure.id === 'ideal-points');
    const historySpec = figureSpecs.find((figure) => figure.id === 'ideal-history');
    const idealLanguage = getIdealExperimentLanguageCode(settingsLanguagePreference);
    const historyContent = getIdealHistoryContent(idealLanguage, activeFile.relation);
    const failureReasonText = getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, idealLanguage);
    const recommendationText = getIdealRecommendationText(
      idealAnalysis.diagnosis.failureReason,
      idealAnalysis.verdictState,
      activeFile.relation,
      idealLanguage,
    );
    const exportSpecs = figureSpecs.filter((figure) => (
      figure.id === 'ideal-verification' ||
      figure.id === 'ideal-raw-pv' ||
      figure.id === 'ideal-points' ||
      figure.id === 'ideal-history'
    ));

    return (
      <div className="studio-ideal-child-window-body">
        {renderVerificationPanel()}
        <div className={`studio-ideal-results-card ${idealAnalysis.isVerified ? 'studio-ideal-history-unlocked' : 'studio-ideal-history-locked'}`}>
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>{idealAnalysis.isVerified ? historyContent.title : workbenchCopy.results.historyLockedFor(getRelationLabel(activeFile.relation))}</strong>
              <span>{idealAnalysis.isVerified ? workbenchCopy.results.historyUnlocked : workbenchCopy.results.historyUnlockHint}</span>
            </div>
          </div>
          {idealAnalysis.isVerified ? (
            <div className="studio-ideal-history-grid">
              <div>
                <span>{workbenchCopy.results.historicalContext}</span>
                <strong>{historyContent.discovery}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.workbenchInterpretation}</span>
                <strong>{historyContent.simulation}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.keyFigures}</span>
                <strong>{workbenchCopy.results.keyFiguresValue(formatMaybeMetric(idealAnalysis.regression.rSquared, 5), idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`)}</strong>
              </div>
            </div>
          ) : (
            <div className="studio-ideal-history-grid">
              <div>
                <span>{workbenchCopy.results.whyLocked}</span>
                <strong>{failureReasonText}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.recommendedNextStep}</span>
                <strong>{recommendationText}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="studio-ideal-results-card">
          <div className="studio-ideal-results-card-header">
            <div>
              <strong>{workbenchCopy.results.export}</strong>
              <span>{workbenchCopy.results.exportFilesHint} {exportCopy.label}</span>
            </div>
          </div>
          <div className="studio-ideal-export-actions">
            <button type="button" disabled={!isExportModeDataReady('completeBundle') || exportInProgress} onClick={() => handleExportAction('completeBundle')}>
              <FileArchive size={13} />
              {workbenchCopy.results.exportAll}
            </button>
            <button type="button" disabled={!isExportModeDataReady('report') || exportInProgress} onClick={() => handleExportAction('report')}>
              <Download size={13} />
              {workbenchCopy.results.reportPdf}
            </button>
            <button type="button" disabled={!isExportModeDataReady('verificationFigure') || exportInProgress} onClick={() => handleExportAction('verificationFigure')}>
              <BarChart3 size={13} />
              {workbenchCopy.results.verificationFigure}
            </button>
            <button type="button" disabled={!isExportModeDataReady('pointsCsv') || exportInProgress} onClick={() => handleExportAction('pointsCsv')}>
              <Table2 size={13} />
              {workbenchCopy.results.pointsCsv}
            </button>
          </div>
          <div className="studio-ideal-export-files">
            {verificationSpec ? <div><span>{workbenchCopy.results.verification}</span><strong>{verificationSpec.recommendedFilename}</strong></div> : null}
            {rawPvSpec ? <div><span>{workbenchCopy.results.rawPv}</span><strong>{rawPvSpec.recommendedFilename}</strong></div> : null}
            {pointsSpec ? <div><span>{workbenchCopy.results.pointsCsv}</span><strong>{pointsSpec.recommendedFilename}</strong></div> : null}
            {historySpec ? <div><span>{workbenchCopy.results.history}</span><strong>{historySpec.recommendedFilename}</strong></div> : null}
          </div>
          <div className="studio-figure-list studio-ideal-export-specs">
            {exportSpecs.map((figure) => (
              <div className="studio-figure-row" key={`ideal-export-${figure.id}`}>
                <div>
                  <strong>{figure.title}</strong>
                  <small>{figure.recommendedFilename}</small>
                </div>
                <span>{figure.dataCount}</span>
                <em className={`studio-figure-status-${figure.status}`}>{workbenchCopy.results.figureStatus[figure.status]}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderResultsPanel = () => {
    if (activeFile.kind === 'ideal') {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.title}</strong>
            <p>{workbenchCopy.panels.pointsTitle} / {workbenchCopy.panels.verificationTitle}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="studio-results-panel">
        <div className="studio-results-toolbar">
          <div className="studio-results-title">
            <strong>{workbenchCopy.results.title}</strong>
            <span>
              {resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}
            </span>
          </div>
          <div className="studio-results-actions">
            <button
              type="button"
              disabled={!isExportModeDataReady('completeBundle') || exportInProgress}
              onClick={() => handleExportAction('completeBundle')}
            >
              <FileArchive size={13} />
              {workbenchCopy.results.exportAll}
            </button>
            <button
              type="button"
              disabled={!isExportModeDataReady('report') || exportInProgress}
              onClick={() => handleExportAction('report')}
            >
              <Download size={13} />
              {workbenchCopy.results.reportPdf}
            </button>
            <button
              type="button"
              aria-label={`${workbenchCopy.actions.close} ${workbenchCopy.results.title}`}
              onClick={(event) => {
                event.stopPropagation();
                closePanel('results');
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="studio-results-tabs" role="tablist" aria-label={workbenchCopy.results.title}>
          {(() => {
            const openStandardResultTabs = resultsSections.filter((section) => standardResultsLayout.openTabs.includes(section.key));
            return openStandardResultTabs.map((section) => (
              <button
              type="button"
              key={section.key}
              className={standardResultsLayout.activeTab === section.key ? 'studio-results-tab-active' : ''}
              onClick={() => setActiveStandardResultsTab(section.key)}
              role="tab"
              aria-selected={standardResultsLayout.activeTab === section.key}
            >
              {section.icon}
              <span>{section.title}</span>
              <span
                role="button"
                tabIndex={0}
                className="studio-results-tab-close"
                aria-label={`${workbenchCopy.actions.close} ${section.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeStandardResultsTab(section.key);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    closeStandardResultsTab(section.key);
                  }
                }}
              >
                <X size={12} />
              </span>
            </button>
            ));
          })()}
        </div>

        <div className="studio-results-body">
          {standardResultsLayout.activeTab === 'summary' ? renderResultsSummary() : null}
          {standardResultsLayout.activeTab === 'dataTable' ? renderResultsDataTable() : null}
          {standardResultsLayout.activeTab === 'figures' ? renderResultsFigures() : null}
        </div>
      </div>
    );
  };

  const renderVerificationPanel = () => {
    if (activeFile.kind !== 'ideal' || !idealAnalysis) {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.noVerificationChartTitle}</strong>
            <p>{workbenchCopy.results.noVerificationChartBody}</p>
          </div>
        </div>
      );
    }

    const idealLanguage = getIdealExperimentLanguageCode(settingsLanguagePreference);
    const failureReasonText = getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, idealLanguage);
    const recommendationText = getIdealRecommendationText(
      idealAnalysis.diagnosis.failureReason,
      idealAnalysis.verdictState,
      activeFile.relation,
      idealLanguage,
    );
    const isPvVerification = activeFile.relation === 'pv';

    return (
      <div className={`studio-verification-panel studio-verification-panel-${activeFile.relation}`}>
        <div className={`studio-verification-main-layout ${isPvVerification ? 'studio-verification-layout-pv' : 'studio-verification-layout-single'}`}>
          <div className="studio-verification-chart-column">
            <section className="studio-verification-chart-section studio-verification-chart-primary">
              <div className="studio-results-subheader">
                <div>
                  <strong>{isPvVerification ? workbenchCopy.results.pvLinearizedValidation : workbenchCopy.results.relationValidation(getRelationLabel(activeFile.relation))}</strong>
                  <span>{workbenchCopy.results.measuredScatterHint}</span>
                </div>
              </div>
              {renderIdealValidationChart(idealAnalysis)}
            </section>

            {isPvVerification ? (
              <section className="studio-verification-chart-section studio-verification-chart-secondary">
                <div className="studio-results-subheader">
                  <div>
                    <strong>{workbenchCopy.results.originalPvPhysicalView}</strong>
                    <span>{workbenchCopy.results.originalPvPhysicalHint}</span>
                  </div>
                </div>
                {renderIdealValidationChart(idealAnalysis, 'pvRaw')}
              </section>
            ) : null}
          </div>

          <div className="studio-verification-side">
            <div className={`studio-result-status ${idealAnalysis.isVerified ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
              <strong>{workbenchCopy.results.verdictLabel(getRelationLabel(activeFile.relation), getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy))}</strong>
              <span>{recommendationText}</span>
            </div>

            <div className="studio-analysis-grid">
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.pointsMetric}</span><strong>{idealAnalysis.sortedPoints.length}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.rSquared}</span><strong>{formatMaybeMetric(idealAnalysis.regression.rSquared, 5)}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.slope}</span><strong>{formatMaybeMetric(idealAnalysis.regression.slope, 6)}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.theorySlope}</span><strong>{formatMaybeMetric(idealAnalysis.theoreticalSlope, 6)}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.slopeError}</span><strong>{idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`}</strong></div>
              <div className="studio-analysis-cell"><span>{workbenchCopy.results.failureReason}</span><strong>{idealAnalysis.diagnosis.failureReason ? failureReasonText : workbenchCopy.results.noneValue}</strong></div>
            </div>

            <div className="studio-ideal-diagnosis-card">
              <div>
                <span>{workbenchCopy.results.whyItHappened}</span>
                <strong>{failureReasonText}</strong>
              </div>
              <div>
                <span>{workbenchCopy.results.recommendedNextStep}</span>
                <strong>{recommendationText}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryPanel = () => (
    activeFile.kind === 'ideal' && idealAnalysis ? (
      <div className="studio-history">
        {idealAnalysis.isVerified ? (
          <>
            <p><strong>{getIdealHistoryContent(getIdealExperimentLanguageCode(settingsLanguagePreference), activeFile.relation).title}</strong></p>
            <p>{getIdealHistoryContent(getIdealExperimentLanguageCode(settingsLanguagePreference), activeFile.relation).discovery}</p>
            <p>{getIdealHistoryContent(getIdealExperimentLanguageCode(settingsLanguagePreference), activeFile.relation).simulation}</p>
            <p>{workbenchCopy.results.currentVerification(formatMaybeMetric(idealAnalysis.regression.rSquared, 5), idealAnalysis.regression.slopeError === null ? '--' : `${formatMetric(idealAnalysis.regression.slopeError, 2)}%`)}</p>
          </>
        ) : (
          <>
            <p><strong>{workbenchCopy.results.historyLockedFor(getRelationLabel(activeFile.relation))}</strong></p>
            <p>{getIdealFailureReasonText(idealAnalysis.diagnosis.failureReason, getIdealExperimentLanguageCode(settingsLanguagePreference))}</p>
            <p>{workbenchCopy.results.currentVerdictRecommendation(getLocalizedStatusValue(idealAnalysis.verdictState, workbenchCopy), getIdealRecommendationText(idealAnalysis.diagnosis.failureReason, idealAnalysis.verdictState, activeFile.relation, getIdealExperimentLanguageCode(settingsLanguagePreference)))}</p>
          </>
        )}
      </div>
    ) : (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.noIdealHistoryTitle}</strong>
          <p>{workbenchCopy.results.noIdealHistoryBody}</p>
        </div>
      </div>
    )
  );

  const renderPanelContent = (panel: PanelDefinition) => {
    if (panel.key === 'preview') return renderPreviewPanel();
    if (panel.key === 'realtime') return renderRealtimePanel();
    if (panel.key === 'verification') return activeFile.kind === 'ideal' ? renderIdealVerificationWindow() : renderVerificationPanel();
    if (panel.key === 'results') return renderResultsPanel();
    if (panel.key === 'experimentPoints') return renderIdealPointsWindow();
    if (activeFile.kind === 'heatCapacity' && panel.key === 'heatCapacityReview') {
      const displayedDomain = selectDisplayedHeatCapacityFreeDomain(activeFile);
      const reviewSelectionKey = `${activeFile.id}:${activeFile.heatCapacityFreeDisplayScheme}`;
      const reviewSelection = heatCapacityReviewSelectionByFileId[reviewSelectionKey] ?? null;
      const reviewOptionIds = new Set(displayedDomain.trials.map((trial) => trial.id));
      const requestedReviewTrialId =
        reviewSelection?.userSelected && reviewSelection.selectedTrialId && reviewOptionIds.has(reviewSelection.selectedTrialId)
          ? reviewSelection.selectedTrialId
          : null;
      const review = selectHeatCapacityFreeProcessReview({
        trials: displayedDomain.trials,
        traceStore: displayedDomain.traceStore,
        theoreticalGamma: activeFile.theoreticalGamma,
        selectedTrialId: requestedReviewTrialId,
      });
      return (
        <div className="studio-heat-review-with-scheme">
          <div className="studio-heat-review-scheme-row">
            <HeatCapacityFreeDisplaySchemeMenu
              value={activeFile.heatCapacityFreeDisplayScheme}
              label={`${heatCapacityFreeSharedText.realSimulation[settingsLanguagePreference]} / ${heatCapacityFreeSharedText.idealProfile[settingsLanguagePreference]}`}
              realLabel={heatCapacityFreeSharedText.realSimulation[settingsLanguagePreference]}
              idealLabel={heatCapacityFreeSharedText.idealProfile[settingsLanguagePreference]}
              onChange={(scheme) => {
                updateActiveFile((file) => (
                  file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
                    ? setHeatCapacityFreeDisplaySchemeWorkbenchState(file, scheme, Date.now())
                    : file
                ));
              }}
            />
          </div>
          <HeatCapacityProcessReviewPanel
            mode={activeFile.heatCapacityMode}
            review={review}
            selectedTrialId={review.selectedTrialId}
            language={settingsLanguagePreference}
            isIdealExperimentReview={activeFile.heatCapacityFreeDisplayScheme === 'ideal'}
            onSelectedTrialChange={(trialId) => {
              setHeatCapacityReviewSelectionByFileId((previous) => ({
                ...previous,
                [reviewSelectionKey]: { selectedTrialId: trialId, userSelected: true },
              }));
            }}
          />
        </div>
      );
    }
    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel.key)) {
      return (
        <HeatCapacityLeftPanel
          file={activeFile}
          language={settingsLanguagePreference}
          panelKey={panel.key}
          pendingRemoveTrialRecord={pendingRemoveHeatCapacityTrialRecord}
          onRemoveTrialRecord={requestRemoveHeatCapacityTrialRecord}
          onCancelRemoveTrialRecord={() => setPendingRemoveHeatCapacityTrialRecord(null)}
          heatCapacityFreeDisplayScheme={activeFile.heatCapacityFreeDisplayScheme}
          onHeatCapacityFreeDisplaySchemeChange={(scheme) => {
            updateActiveFile((file) => (
              file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
                ? setHeatCapacityFreeDisplaySchemeWorkbenchState(file, scheme, Date.now())
                : file
            ));
          }}
        />
      );
    }
    if (panel.key === 'history') return renderHistoryPanel();
    return (
      <div className="studio-empty">
        <div>
          <strong>{workbenchCopy.results.panelNotConnectedTitle}</strong>
          <p>{workbenchCopy.results.panelNotConnectedBody}</p>
        </div>
      </div>
    );
  };

  const renderDockHeader = (panel: PanelDefinition) => (
    <div className="studio-dock-header">
      <div>
        <span>{panel.title}</span>
        <small>{renderScientificText(panel.hint)}</small>
      </div>
      {panel.key === 'preview' ? (
        <div className="studio-panel-actions">
          {activeFile.kind === 'heatCapacity'
            ? renderHeatCapacityModeControl()
            : activeFile.kind === 'heatCapacityPistonOscillation'
              ? null
              : (
            <button
              type="button"
              className={`studio-run-control studio-run-control-${activeFile.runState === 'running' ? 'pause' : 'start'}`}
              onClick={toggleActiveFileRunState}
              title={activeFile.runState === 'running' ? workbenchCopy.actions.pause : workbenchCopy.actions.start}
              aria-label={activeFile.runState === 'running' ? workbenchCopy.actions.pause : workbenchCopy.actions.start}
            >
              {activeFile.runState === 'running' ? (
                <Pause size={14} strokeWidth={2.5} />
              ) : (
                <Play size={15} strokeWidth={2.5} />
              )}
            </button>
          )}
          {(activeFile.kind === 'standard' || activeFile.kind === 'ideal') &&
          (activeFile.runState === 'running' || activeFile.runState === 'paused') ? (
            <button
              type="button"
              className="studio-run-control studio-run-control-stop"
              onClick={stopActiveFile}
              title={workbenchCopy.actions.stop}
              aria-label={workbenchCopy.actions.stop}
            >
              <Square size={13} strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const renderDockPanel = (panel: PanelDefinition, optional = false) => (
    <section
      className={`studio-dock-panel ${optional ? 'studio-optional-panel' : 'studio-fixed-panel'} ${panel.key === 'results' ? 'studio-results-window' : ''}`}
      key={panel.key}
      onClick={() => setSelectedPanel(panel.key)}
    >
      {panel.key === 'results' ? null : renderDockHeader(panel)}
      {renderPanelContent(panel)}
    </section>
  );

  const renderIdealResultWindows = () => {
    if (activeFile.kind !== 'ideal') return null;

    if (!activeFile.visiblePanels.includes('results')) return null;

    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    const activePanel = idealResultWindowPanels.find((panel) => panel.key === layout.activeIdealResultTab)
      ?? idealResultWindowPanels[0];
    const openIdealResultTabs = idealResultWindowPanels.filter((panel) => layout.openTabs.includes(panel.key));

    return (
      <div
        className="studio-ideal-results-region"
        ref={idealResultWindowRegionRef}
        aria-label={workbenchCopy.results.title}
      >
        <section
          className={`studio-ideal-result-window-layer ${selectedPanel === activePanel.key ? 'studio-ideal-result-window-selected' : ''}`}
          style={{ height: `${clampIdealResultHeightRatio(layout.heightRatio) * 100}%` }}
          aria-label={workbenchCopy.results.title}
        >
          <div
            className="studio-ideal-result-window-resizer"
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={startIdealResultWindowResize}
          />
          <div className="studio-results-toolbar studio-ideal-result-window-toolbar">
            <div className="studio-results-title">
              <strong>{workbenchCopy.results.title}</strong>
              <span>{activePanel.hint}</span>
            </div>
            <div className="studio-results-actions">
              <button
                type="button"
                aria-label={`${workbenchCopy.actions.close} ${workbenchCopy.results.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeIdealResultsWindow();
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-ideal-results-tabs" role="tablist" aria-label={workbenchCopy.results.idealResultsSectionsAria}>
            {openIdealResultTabs.map((panel) => (
              <button
                type="button"
                key={panel.key}
                role="tab"
                aria-selected={layout.activeIdealResultTab === panel.key}
                className={layout.activeIdealResultTab === panel.key ? 'studio-results-tab-active' : ''}
                onClick={() => setActiveIdealResultTab(panel.key)}
              >
                {panel.icon}
                <span>{panel.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="studio-results-tab-close"
                  aria-label={`${workbenchCopy.actions.close} ${panel.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeIdealResultTab(panel.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeIdealResultTab(panel.key);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
          <div className="studio-results-body">
            {renderPanelContent(activePanel)}
          </div>
        </section>
      </div>
    );
  };

  const renderHeatCapacityMaterialsWindow = () => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.openHeatCapacityTabs.length === 0) return null;
    const materialTabOrder = getHeatCapacityMaterialsTabOrder(activeFile);
    const openTabs = activeFile.openHeatCapacityTabs
      .filter((tabId) => tabId !== 'records' && materialTabOrder.includes(tabId))
      .map((tabId) => {
        const panel = getHeatCapacityTabDefinition(tabId);
        return panel ? { tabId, panel } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => item !== null);
    if (openTabs.length === 0) return null;
    const activeTabId = activeFile.activeHeatCapacityTabId && openTabs.some((item) => item.tabId === activeFile.activeHeatCapacityTabId)
      ? activeFile.activeHeatCapacityTabId
      : openTabs[0].tabId;
    const activePanel = openTabs.find((item) => item.tabId === activeTabId)?.panel ?? openTabs[0].panel;
    const materialsMaxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio();
    const materialsHeightRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      materialsMaxHeightRatio,
    );

    return (
      <div
        className="studio-results-region studio-heat-materials-region"
        style={{ height: `${materialsHeightRatio * 100}%` }}
        data-heat-capacity-materials-window="true"
      >
        <div
          className="studio-results-window-resizer"
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={startHeatCapacityMaterialsResize}
        />
        <section className="studio-dock-panel studio-optional-panel studio-results-window studio-heat-materials-window">
        <div className="studio-results-toolbar studio-heat-materials-toolbar">
          <div className="studio-results-title">
              <strong>{heatCapacityRealtimeCopy.materialsTitle}</strong>
              <span>{heatCapacityRealtimeCopy.materialsHint}</span>
            </div>
            <div className="studio-results-actions">
              <button
                type="button"
                aria-label={heatCapacityRealtimeCopy.closeMaterialsAria}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedPanel('preview');
                  updateActiveFile((file) => (
                    file.kind === 'heatCapacity'
                      ? {
                          ...file,
                          visiblePanels: file.visiblePanels.filter((panel) => !isHeatCapacityPanelKey(panel)),
                          openHeatCapacityTabs: [],
                          activeHeatCapacityTabId: null,
                          updatedAt: Date.now(),
                        }
                      : file
                  ));
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-heat-materials-tabs" role="tablist" aria-label={heatCapacityRealtimeCopy.materialsTabsAria}>
            {openTabs.map(({ tabId, panel }) => (
              <button
                type="button"
                key={tabId}
                role="tab"
                aria-selected={tabId === activeTabId}
                className={tabId === activeTabId ? 'studio-results-tab-active' : ''}
                onClick={() => activateHeatCapacityTab(tabId)}
              >
                {panel.icon}
                <span>{panel.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="studio-results-tab-close"
                  aria-label={`${workbenchCopy.actions.close} ${panel.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeHeatCapacityTab(tabId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeHeatCapacityTab(tabId);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
          <div className="studio-results-body studio-heat-materials-body">
            {renderPanelContent(activePanel)}
          </div>
        </section>
      </div>
    );
  };

  const handleSectionKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderSectionTitle = (
    label: string,
    collapsed: boolean,
    onToggle: () => void,
    kind: 'files' | 'panels' = 'files',
  ) => (
    <button
      type="button"
      className={`studio-tree-title-button studio-tree-title-button-${kind} ${collapsed ? 'studio-tree-title-collapsed' : ''}`}
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      {kind === 'panels' ? <PanelLeft size={14} /> : (
        <span className="studio-tree-folder-icon">
          <Folder size={14} className="studio-folder-closed" />
          <FolderOpen size={14} className="studio-folder-open" />
        </span>
      )}
      <span>{label}</span>
    </button>
  );

  const renderHeatCapacityPanelTree = () => {
    const previewPanel = availablePanels.find((panel) => panel.key === 'preview');
    const realtimePanel = availablePanels.find((panel) => panel.key === 'realtime');
    const materialPanels = getHeatCapacityMaterialsTabOrder(activeFile)
      .map((tabId) => {
        const panel = availablePanels.find((item) => item.key === heatCapacityTabIdToPanelKey(tabId));
        return panel ? { tabId, panel: getHeatCapacityPanelDisplayDefinition(tabId, panel) } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => Boolean(item.panel));
    const materialsSelected = selectedPanel === 'results';
    const materialsOpen = activeFile.kind === 'heatCapacity' && activeFile.openHeatCapacityTabs.length > 0;
    const topPanels = [previewPanel, realtimePanel].filter((panel): panel is PanelDefinition => Boolean(panel));

    return (
      <>
        {topPanels.map((panel) => {
          const locked = LOCKED_PANEL_KEYS.includes(panel.key);
          return (
            <div
              role="button"
              tabIndex={panelsSectionCollapsed ? -1 : 0}
              key={panel.key}
              className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-panel-row-active' : ''}`}
              onClick={() => {
                if (panelsSectionCollapsed) return;
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              }}
              onDoubleClick={() => {
                if (panelsSectionCollapsed) return;
                handleLockedPanel(panel.title);
              }}
              onKeyDown={(event) => handleSectionKeyDown(event, () => {
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              })}
              title={panel.hint}
            >
              {panel.icon}
              <span>{panel.title}</span>
              {locked ? (
                <button
                  type="button"
                  className="studio-panel-lock-button"
                  aria-label={`${panel.title} ${workbenchCopy.files.locked}`}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleLockedPanel(panel.title);
                  }}
                >
                  <LockKeyhole size={12} />
                  {workbenchCopy.files.locked}
                </button>
              ) : null}
            </div>
          );
        })}
        <div
          role="button"
          tabIndex={panelsSectionCollapsed ? -1 : 0}
          className={`studio-tree-row studio-tree-row-child studio-heat-materials-group ${materialsSelected ? 'studio-panel-row-active' : ''}`}
          onClick={() => {
            if (panelsSectionCollapsed) return;
            setSelectedPanel('results');
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            openAllHeatCapacityMaterialsTabs();
          }}
          onKeyDown={(event) => handleSectionKeyDown(event, () => {
            setSelectedPanel('results');
          })}
          title={heatCapacityRealtimeCopy.materialsFolderTitle}
        >
          <button
            type="button"
            className={`studio-results-folder-button ${activeFile.kind === 'heatCapacity' && !activeFile.heatCapacityMaterialsExpanded ? 'studio-tree-title-collapsed' : ''}`}
            aria-expanded={activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMaterialsExpanded : true}
            aria-label={heatCapacityRealtimeCopy.materialsGroupAria}
            onClick={(event) => {
              event.stopPropagation();
              if (activeFile.kind !== 'heatCapacity') return;
              updateActiveFile((file) => (
                file.kind === 'heatCapacity'
                  ? { ...file, heatCapacityMaterialsExpanded: !file.heatCapacityMaterialsExpanded, updatedAt: Date.now() }
                  : file
              ));
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            <span className="studio-results-expander-icon">
              <ChevronRight size={13} />
            </span>
          </button>
          <span
            className="studio-results-folder-label"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPanel('results');
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            {heatCapacityRealtimeCopy.materialsTitle}
          </span>
          <span className="studio-tree-meta">{materialsOpen ? workbenchCopy.files.active : workbenchCopy.files.off}</span>
        </div>
        {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMaterialsExpanded ? (
          <div className="studio-results-nav studio-heat-materials-nav">
            {materialPanels.map(({ tabId, panel }) => {
              const state = getHeatCapacityTabState(tabId);
              return (
                <button
                  type="button"
                  key={tabId}
                  className={selectedPanel === panel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPanel(panel.key);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    openHeatCapacityTab(tabId);
                  }}
                  title={heatCapacityRealtimeCopy.materialsTabTitle}
                >
                  {panel.icon}
                  <span>{panel.title}</span>
                  <span className="studio-tree-meta">{getLocalizedTreeState(state)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </>
    );
  };

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
      !isPistonOscillationDevelopmentPanelKey(activeFile, panel.key)
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

  return (
    <div
      className={`studio-workbench studio-theme-${resolvedWorkbenchTheme}`}
      data-workbench-language={settingsLanguagePreference}
      data-desktop-exit-quiesced={desktopExitQuiesced ? 'true' : 'false'}
      aria-busy={desktopExitQuiesced}
    >
      {desktopExitQuiesced ? (
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
      {scanInputToast ? (
        <div className="studio-scan-input-toast" role="status">
          {scanInputToast}
        </div>
      ) : null}
      {workspacePersistenceStatus.state === 'retrying' || workspacePersistenceStatus.state === 'failed' ? (
        <div
          className="studio-scan-input-toast"
          role={workspacePersistenceStatus.state === 'failed' ? 'alert' : 'status'}
          data-workbench-persistence-status={workspacePersistenceStatus.state}
        >
          {settingsLanguagePreference === 'en'
            ? `Workspace save ${workspacePersistenceStatus.state === 'failed' ? 'failed' : 'will retry'}: ${workspacePersistenceStatus.error.message}`
            : settingsLanguagePreference === 'zh-TW'
              ? `工作區儲存${workspacePersistenceStatus.state === 'failed' ? '失敗' : '將重試'}：${workspacePersistenceStatus.error.message}`
              : `工作区保存${workspacePersistenceStatus.state === 'failed' ? '失败' : '将重试'}：${workspacePersistenceStatus.error.message}`}
        </div>
      ) : null}
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
        selectedCount={heatCapacityBatchSetupSelection}
        onSelectedCountChange={setHeatCapacityBatchSetupSelection}
        onConfirm={confirmHeatCapacityFreeBatchSetup}
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
        <header className="studio-menu">
          <div className="studio-titlebar-brand" aria-label={workbenchCopy.about.subtitle}>
            <span className="studio-brand-mark" aria-hidden="true">
              <img src="favicon.png" alt="" />
            </span>
            <span>{workbenchCopy.about.subtitle}</span>
          </div>
          <WorkbenchTopCommands
            openMenu={openTopMenu}
            menuLeft={topMenuLeft}
            copy={workbenchCopy}
            commandsRef={topCommandsRef}
            menuRef={topMenuRef}
            closedFiles={openableClosedFiles.map((file) => ({
              id: file.id,
              name: file.name,
              kind: file.kind,
              kindLabel: getWorkbenchFileKindLabel(file.kind, workbenchCopy.files),
            }))}
            undoLabel={undoStack[undoStack.length - 1]?.label ?? null}
            redoLabel={redoStack[redoStack.length - 1]?.label ?? null}
            undoCount={undoStack.length}
            redoCount={redoStack.length}
            activeFileName={activeFile.name}
            windowPanels={topMenuWindowPanels}
            settingsSummary={`${workbenchCopy.settings.themeOptions[settingsThemePreference].label} / ${workbenchCopy.settings.languageOptions[settingsLanguagePreference].label} / ${workbenchCopy.settings.performanceModeSummary[settingsPerformanceMode]}`}
            layoutSummary={topMenuLayoutSummary}
            onToggleMenu={toggleTopCommandMenu}
            onOpenNewWindow={openNewWorkbenchWindow}
            onCreateFile={createFile}
            onOpenClosedFile={openClosedWorkbenchFile}
            onUndo={undoLastEdit}
            onRedo={redoLastEdit}
            onClearHistory={clearEditHistory}
            onToggleWindowPanel={(panelKey) => runWindowMenuSwitch(() => toggleWindowPanel(panelKey))}
            onToggleWindowResultChild={(child) => runWindowMenuSwitch(() => {
              if (child.kind === 'ideal') {
                toggleWindowIdealResultTab(child.key);
              } else {
                toggleWindowStandardResultsTab(child.key);
              }
            })}
            onResetLayout={resetLayout}
            onOpenGeneralSettings={openGeneralSettings}
            onSaveLayoutDefault={saveCurrentWorkbenchLayoutAsDefault}
            onOpenUserGuide={openUserGuide}
            onOpenAbout={openAboutWindow}
          />
          <div className="studio-titlebar-drag-fill" aria-hidden="true" />
          {desktopWindowControlsAvailable ? (
            <div className="studio-window-controls" aria-label={windowControlCopy.controls}>
              <button
                type="button"
                className="studio-window-control-button"
                aria-label={windowControlCopy.minimize}
                title={windowControlCopy.minimize}
                onClick={minimizeDesktopWindow}
              >
                <span className="studio-window-control-glyph studio-window-control-glyph-minimize" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="studio-window-control-button"
                aria-label={desktopWindowMaximized ? windowControlCopy.restore : windowControlCopy.maximize}
                title={desktopWindowMaximized ? windowControlCopy.restore : windowControlCopy.maximize}
                onClick={toggleDesktopWindowMaximize}
              >
                <span
                  className={`studio-window-control-glyph ${desktopWindowMaximized ? 'studio-window-control-glyph-restore' : 'studio-window-control-glyph-maximize'}`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="studio-window-control-button studio-window-control-close"
                aria-label={windowControlCopy.close}
                title={windowControlCopy.close}
                onClick={closeDesktopWindow}
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          ) : null}
        </header>
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
          resultNotice={aboutResultNotice}
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
          onNavOpenChange={setBuildNoticeNavOpen}
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
          onClose={() => setUpdateDialogOpen(false)}
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
          onClose={closeGeneralSettings}
          onThemeChange={updateSettingsThemePreference}
          onLanguageChange={updateSettingsLanguagePreference}
          onPerformanceModeChange={updateSettingsPerformanceMode}
          onAudioEnabledChange={updateSettingsAudioEnabled}
          onAudioVolumeChange={updateSettingsAudioVolume}
          onLanguageMenuOpenChange={setSettingsLanguageMenuOpen}
        />

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
          <aside className="studio-sidebar" aria-label={`${workbenchCopy.files.openFiles} ${workbenchCopy.files.panels}`}>
            <div className="studio-panel-header">
              <span>{workbenchCopy.files.openFiles}</span>
              <button
                type="button"
                className="studio-panel-collapse"
                aria-label={`${workbenchCopy.actions.hide} ${workbenchCopy.files.openFiles}`}
                onClick={() => setLeftCollapsed(true)}
              >
                {workbenchCopy.actions.hide}
              </button>
            </div>
            <div className="studio-sidebar-body">
              <section className={`studio-tree-section ${openFileMenuId ? 'studio-tree-section-menu-open' : ''}`}>
                {renderSectionTitle(workbenchCopy.files.files, filesSectionCollapsed, () => setFilesSectionCollapsed((current) => !current))}
                <div className={`studio-tree-section-content ${filesSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={filesSectionCollapsed}>
                  {isWorkbenchEmpty ? (
                    <div className="studio-empty-files">
                      <strong>{workbenchCopy.files.noOpenFileState}</strong>
                      <span>{workbenchCopy.files.emptyHint}</span>
                    </div>
                  ) : files.map((file) => {
                    const isRenaming = renamingFileId === file.id;
                    const menuOpen = openFileMenuId === file.id;
                    const pendingDelete = pendingDeleteFileId === file.id;
                    const fileKindLabel = getWorkbenchFileKindLabel(file.kind, workbenchCopy.files);

                    return (
                      <div
                        role="button"
                        tabIndex={filesSectionCollapsed ? -1 : 0}
                        key={file.id}
                        className={`studio-tree-row studio-file-row ${file.id === selectedFileId ? 'studio-file-row-selected' : ''} ${file.id === activeFile.id ? 'studio-file-row-active' : ''} ${menuOpen ? 'studio-file-row-menu-open' : ''} ${isRenaming ? 'studio-file-row-renaming' : ''}`}
                        onClick={() => {
                          if (!isRenaming && !filesSectionCollapsed) setSelectedFileId(file.id);
                        }}
                        onDoubleClick={() => {
                          if (!isRenaming && !filesSectionCollapsed) selectFile(file);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (isRenaming || filesSectionCollapsed) return;
                          setOpenFileMenuId(file.id);
                          setPendingDeleteFileId(null);
                        }}
                        onKeyDown={(event) => handleSectionKeyDown(event, () => selectFile(file))}
                      >
                        {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                        {isRenaming ? (
                          <input
                            className="studio-file-rename-input"
                            ref={renameInputRef}
                            value={renameDraft}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={() => {
                              renameSelectionModeRef.current = 'normal';
                            }}
                            onChange={(event) => {
                              renameSelectionModeRef.current = 'normal';
                              setRenameDraft(event.target.value);
                            }}
                            onBlur={() => commitRenameFileFromOutside()}
                            onKeyDown={(event) => {
                              event.stopPropagation();
                              if (event.key === 'ArrowRight' && renameSelectionModeRef.current === 'initial') {
                                event.preventDefault();
                                selectRenameNumericSuffix(event.currentTarget);
                                renameSelectionModeRef.current = 'normal';
                                return;
                              }
                              if (event.key === 'Enter') {
                                renameSelectionModeRef.current = 'normal';
                                commitRenameFile(file.id);
                                return;
                              }
                              if (event.key === 'Escape') {
                                renameSelectionModeRef.current = 'normal';
                                cancelRenameFile();
                                return;
                              }
                              if (
                                event.key === 'ArrowLeft'
                                || event.key === 'Home'
                                || event.key === 'End'
                                || event.key === 'Delete'
                                || event.key === 'Backspace'
                                || event.key.length === 1
                              ) {
                                renameSelectionModeRef.current = 'normal';
                              }
                            }}
                          />
                        ) : (
                          <span>{file.name}</span>
                        )}
                        <span className="studio-tree-meta">{fileKindLabel}</span>
                        <button
                          type="button"
                          className="studio-file-menu-button"
                          aria-label={workbenchCopy.files.openActions(file.name)}
                          tabIndex={filesSectionCollapsed ? -1 : 0}
                          ref={menuOpen ? fileMenuButtonRef : undefined}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenFileMenuId((current) => (current === file.id ? null : file.id));
                            setPendingDeleteFileId(null);
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen ? (
                          <div
                            className={pendingDelete ? 'studio-file-menu studio-file-menu-pending' : 'studio-file-menu'}
                            ref={fileMenuRef}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button type="button" onClick={() => beginRenameFile(file)}>
                              <Pencil size={13} />
                              {workbenchCopy.files.rename}
                            </button>
                            <button type="button" onClick={() => requestCloseWorkbenchFile(file)}>
                              <X size={13} />
                              {workbenchCopy.files.closeExperiment}
                            </button>
                            <div className={`studio-file-menu-confirm-row ${pendingDelete ? 'studio-file-menu-confirm-row-pending' : ''}`}>
                              <button
                                type="button"
                                className={pendingDelete ? 'studio-file-menu-danger studio-file-menu-confirm' : 'studio-file-menu-danger'}
                                onClick={() => requestDeleteWorkbenchFile(file)}
                              >
                                <Trash2 size={13} />
                                {pendingDelete ? workbenchCopy.files.confirmDelete : workbenchCopy.files.delete}
                              </button>
                              {pendingDelete ? (
                                <button
                                  type="button"
                                  className="studio-file-menu-cancel"
                                  aria-label={`${workbenchCopy.files.cancel} ${file.name}`}
                                  onClick={cancelDeleteWorkbenchFile}
                                >
                                  {workbenchCopy.files.cancel}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="studio-tree-section">
                {renderSectionTitle(isWorkbenchEmpty ? workbenchCopy.files.panels : activeFile.kind === 'heatCapacity' ? `${activeFile.name.toUpperCase()} / PANELS` : `${activeFile.name} / ${workbenchCopy.files.panels}`, panelsSectionCollapsed, () => setPanelsSectionCollapsed((current) => !current), 'panels')}
                <div className={`studio-tree-section-content ${panelsSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={panelsSectionCollapsed}>
                {isWorkbenchEmpty ? (
                  <div className="studio-empty-panel-tree">
                    <span>{workbenchCopy.files.noOpenPanelState}</span>
                  </div>
                ) : activeFile.kind === 'heatCapacity' ? (
                  renderHeatCapacityPanelTree()
                ) : availablePanels.filter((panel) => !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key))).map((panel) => {
                  const visible = activeFile.visiblePanels.includes(panel.key);
                  const locked = LOCKED_PANEL_KEYS.includes(panel.key);
                  const developmentUnavailable = isPistonOscillationDevelopmentPanelKey(activeFile, panel.key);
                  return (
                    <React.Fragment key={panel.key}>
                      <div
                        role="button"
                        tabIndex={panelsSectionCollapsed ? -1 : 0}
                        data-development-unavailable={developmentUnavailable || undefined}
                        className={`studio-tree-row studio-tree-row-child ${
                          developmentUnavailable ? 'studio-panel-row-development' : ''
                        } ${selectedPanel === panel.key ? 'studio-panel-row-active' : ''}`}
                        onClick={() => {
                          if (panelsSectionCollapsed) return;
                          if (developmentUnavailable) return;
                          setSelectedPanel(panel.key);
                          if (locked) handleLockedPanel(panel.title);
                        }}
                        onDoubleClick={() => {
                          if (panelsSectionCollapsed) return;
                          if (developmentUnavailable) {
                            showPistonOscillationDevelopmentNotice('navigationItem');
                          } else if (locked) {
                            handleLockedPanel(panel.title);
                          } else if (panel.key === 'results' && activeFile.kind === 'ideal') {
                            openIdealResultsWindow('experimentPoints', true);
                          } else {
                            openPanel(panel.key);
                          }
                        }}
                        onKeyDown={(event) => handleSectionKeyDown(event, () => {
                          if (developmentUnavailable) {
                            showPistonOscillationDevelopmentNotice('navigationItem');
                          } else if (locked) {
                            setSelectedPanel(panel.key);
                            handleLockedPanel(panel.title);
                          } else if (panel.key === 'results') {
                            if (activeFile.kind === 'ideal') {
                              openIdealResultsWindow('experimentPoints', true);
                            } else {
                              openStandardResultsWindow('summary', true);
                            }
                          } else {
                            openPanel(panel.key);
                          }
                        })}
                        title={
                          developmentUnavailable
                            ? pistonOscillationCopy.unavailable.navigationItem
                            : locked
                              ? panel.hint
                              : panel.key === 'results'
                                ? `${panel.hint}. ${workbenchCopy.results.resultsOpenHint}`
                                : `${panel.hint}. ${workbenchCopy.results.resultsJumpHint}`
                        }
                      >
                        {panel.key === 'results' ? (
                          <button
                            type="button"
                            className={`studio-results-folder-button ${resultsChildrenCollapsed ? 'studio-tree-title-collapsed' : ''}`}
                            aria-label={resultsChildrenCollapsed ? workbenchCopy.results.resultsTreeExpandAria : workbenchCopy.results.resultsTreeCollapseAria}
                            aria-expanded={!resultsChildrenCollapsed}
                            tabIndex={panelsSectionCollapsed ? -1 : 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setResultsChildrenCollapsed((current) => !current);
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              if (activeFile.kind === 'ideal') {
                                openIdealResultsWindow('experimentPoints', true);
                              } else {
                                openStandardResultsWindow('summary', true);
                              }
                            }}
                          >
                            <span className="studio-results-expander-icon">
                              <ChevronRight size={13} />
                            </span>
                            <span className="studio-results-folder-label">{panel.title}</span>
                          </button>
                        ) : (
                          <>
                            {panel.icon}
                            <span>{panel.title}</span>
                          </>
                        )}
                        {developmentUnavailable ? (
                          <span className="studio-tree-meta">{pistonOscillationCopy.developmentBadge}</span>
                        ) : locked ? (
                          <button
                            type="button"
                            className="studio-panel-lock-button"
                            aria-label={`${panel.title} ${workbenchCopy.files.locked}`}
                            tabIndex={panelsSectionCollapsed ? -1 : 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleLockedPanel(panel.title);
                            }}
                          >
                            <LockKeyhole size={12} />
                            {workbenchCopy.files.locked}
                          </button>
                        ) : (
                          <span className="studio-tree-meta">{visible ? workbenchCopy.files.shown : workbenchCopy.files.off}</span>
                        )}
                      </div>
                      {panel.key === 'results' && activeFile.kind === 'ideal' && !resultsChildrenCollapsed ? (
                        <div className="studio-results-nav studio-results-child-nav studio-ideal-results-nav">
                          {idealResultWindowPanels.map((childPanel) => (
                            <button
                              type="button"
                              key={childPanel.key}
                              className={selectedPanel === childPanel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                              tabIndex={panelsSectionCollapsed ? -1 : 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPanel(childPanel.key);
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                openIdealResultWindow(childPanel.key);
                              }}
                              title={workbenchCopy.results.openIdealResultsTabTitle}
                            >
                              {childPanel.icon}
                              <span>{childPanel.title}</span>
                              <span className="studio-tree-meta">
                                {getLocalizedTreeState(getIdealResultTabState(childPanel.key))}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {panel.key === 'results' && activeFile.kind === 'standard' && !resultsChildrenCollapsed ? (
                        <div className="studio-results-nav studio-results-child-nav">
                          {resultsSections.map((section) => (
                            <button
                              type="button"
                              key={section.key}
                              className={getStandardResultsTabState(section.key) === 'active' && selectedPanel === 'results' ? 'studio-results-nav-active studio-panel-row-active' : ''}
                              tabIndex={panelsSectionCollapsed ? -1 : 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPanel('results');
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                selectResultsSection(section.key, true);
                              }}
                              title={workbenchCopy.results.resultsJumpHint}
                            >
                              {section.icon}
                              <span>{section.title}</span>
                              <span className="studio-tree-meta">{getLocalizedTreeState(getStandardResultsTabState(section.key))}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                </div>
              </section>
            </div>
            <div className="studio-sidebar-usage-hint" aria-label={workbenchCopy.files.usageHintAria}>
              <span>{workbenchCopy.files.clickSelectHint}</span>
              <span>{workbenchCopy.files.doubleClickOpenHint}</span>
            </div>
            <div
              className="studio-sidebar-resizer"
              role="separator"
              aria-orientation="vertical"
              onMouseDown={(event) => startSidebarResize('left', event)}
            />
          </aside>

          {leftCollapsed ? (
            <button type="button" className="studio-rail-button studio-left-rail" onClick={() => setLeftCollapsed(false)}>
              {workbenchCopy.files.openFiles}
            </button>
          ) : null}

          <section className="studio-layout" aria-label={workbenchCopy.files.workspaceAria}>
            <div className="studio-file-tabs" ref={fileTabsRef}>
              {isWorkbenchEmpty ? (
                <div className="studio-file-tabs-empty">{workbenchCopy.files.noOpenFiles}</div>
              ) : files.map((file) => (
                <div
                  key={file.id}
                  className={`studio-file-tab ${file.id === selectedFileId ? 'studio-file-tab-selected' : ''} ${file.id === activeFile.id ? 'studio-file-tab-active' : ''}`}
                >
                  <button
                    type="button"
                    className="studio-file-tab-select"
                    onClick={() => setSelectedFileId(file.id)}
                    onDoubleClick={() => selectFile(file)}
                    title={file.name}
                  >
                    {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                    <span className="studio-file-tab-name">{file.name}</span>
                    <span className="studio-file-kind">{getWorkbenchFileKindLabel(file.kind, workbenchCopy.files)}</span>
                  </button>
                  <button
                    type="button"
                    className="studio-file-tab-close"
                    aria-label={`${workbenchCopy.files.closeExperiment} ${file.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestCloseWorkbenchFile(file);
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className={`studio-workspace-shell ${isWorkbenchEmpty ? 'studio-workspace-shell-empty' : 'studio-workspace-shell-active'} ${!isWorkbenchEmpty && effectiveParametersCollapsed ? 'studio-params-collapsed' : ''}`} ref={workspaceShellRef}>
              <div
                ref={parameterSidebarResizeGhostRef}
                className="studio-resize-ghost-divider studio-params-sidebar-resize-ghost"
                aria-hidden="true"
              />
              <div
                className={`studio-center-workspace ${!isWorkbenchEmpty ? 'studio-center-workspace-active' : ''} ${!isWorkbenchEmpty && (resultsPanel || idealResultPanels.length > 0 || (activeFile.kind === 'heatCapacity' && activeFile.openHeatCapacityTabs.length > 0)) ? 'studio-results-open' : ''} ${isWorkbenchEmpty ? 'studio-center-workspace-empty' : ''}`}
                ref={centerWorkspaceRef}
              >
                {isWorkbenchEmpty ? (
                  <WorkbenchEmptyWorkspace
                    openableClosedFiles={openableClosedFiles}
                    language={settingsLanguagePreference}
                    copy={workbenchCopy}
                    onCreateFile={createFile}
                    onOpenFile={openClosedWorkbenchFile}
                  />
                ) : (
                  <>
                    <div
                      className={`studio-live-workspace ${liveWorkspaceResizing ? 'studio-live-workspace-resizing' : ''}`}
                      style={liveWorkspaceStyle}
                      ref={liveWorkspaceRef}
                    >
                      {primaryPanels[0] ? renderDockPanel(primaryPanels[0]) : null}
                      <button
                        type="button"
                        className="studio-live-workspace-resizer"
                        aria-label={workbenchCopy.panels.liveWorkspaceResizeAria}
                        onPointerDown={startLiveWorkspaceResize}
                      />
                      <div
                        ref={liveWorkspaceResizeGhostRef}
                        className="studio-resize-ghost-divider studio-live-workspace-resize-ghost"
                        aria-hidden="true"
                      />
                      {primaryPanels[1] ? renderDockPanel(primaryPanels[1]) : null}
                      {auxiliaryPanels.length > 0 ? (
                        <div className="studio-optional-panels">
                          {auxiliaryPanels.map((panel) => renderDockPanel(panel, true))}
                        </div>
                      ) : null}
                    </div>
                    {resultsPanel && activeFile.kind === 'standard' ? (
                      <div
                        className="studio-results-region"
                        style={{ height: `${clampIdealResultHeightRatio(standardResultsLayout.heightRatio) * 100}%` }}
                      >
                        <div
                          className="studio-results-window-resizer"
                          role="separator"
                          aria-orientation="horizontal"
                          onMouseDown={startStandardResultsResize}
                        />
                        {renderDockPanel(resultsPanel, true)}
                      </div>
                    ) : null}
                    {renderIdealResultWindows()}
                    {renderHeatCapacityMaterialsWindow()}
                  </>
                )}
              </div>

              {!isWorkbenchEmpty && activeFile.kind !== 'heatCapacityPistonOscillation' ? (
              <aside
                className={`studio-current-params ${currentParameterControlsLocked ? 'studio-current-params-locked' : ''}`}
                aria-label={workbenchCopy.parameters.title}
                aria-disabled={currentParameterControlsLocked}
              >
                <div
                  className="studio-params-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  onMouseDown={(event) => startSidebarResize('params', event)}
                />
                <div className="studio-current-params-header">
                  <div>
                    <span>{workbenchCopy.parameters.title}</span>
                    <small>{currentParameterControlsLocked ? workbenchCopy.parameters.lockedUntilStopped : workbenchCopy.parameters.currentFileValues}</small>
                  </div>
                  <button
                    type="button"
                    className="studio-panel-collapse"
                    aria-label={`${workbenchCopy.actions.hide} ${workbenchCopy.parameters.title}`}
                    onClick={() => setParametersCollapsed(true)}
                  >
                    {workbenchCopy.actions.hide}
                  </button>
                </div>
                <div className="studio-current-params-body" ref={currentParametersBodyRef}>
                  <div className="studio-param-file">
                    <strong>{activeFile.kind === 'standard' ? workbenchCopy.parameters.standardSimulation : activeFile.kind === 'ideal' ? workbenchCopy.parameters.idealSimulation : workbenchCopy.parameters.heatCapacityExperiment}</strong>
                    <span>{activeFile.name}</span>
                    <span className={`studio-param-state ${parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset) ? 'studio-param-state-pending' : ''}`}>
                      {parametersDirty
                        ? workbenchCopy.parameters.savedChangesOnStart
                        : activeFile.kind === 'ideal' && activeFile.needsReset
                          ? workbenchCopy.parameters.idealRuntimeOnStart
                          : workbenchCopy.parameters.applied}
                    </span>
                  </div>
                  {renderIdealControls()}
                  {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free' ? (
                    renderHeatCapacityFreeParameterPanel()
                  ) : activeFile.kind === 'heatCapacity' ? (
                    <>
                      <div className="studio-panel-note">{workbenchCopy.parameters.heatCapacityReadonlyNote}</div>
                    </>
                  ) : null}
                  {activeFile.kind === 'ideal' ? (
                    <section className={`studio-param-advanced ${idealAdvancedSettingsOpen ? 'studio-param-advanced-open' : ''}`}>
                      <button
                        type="button"
                        className="studio-param-advanced-toggle"
                        aria-expanded={idealAdvancedSettingsOpen}
                        onClick={toggleIdealAdvancedSettings}
                      >
                        <span>
                          <strong>{workbenchCopy.parameters.advancedSettings}</strong>
                          <small>{idealAdvancedSettingsOpen ? workbenchCopy.parameters.advancedHide : workbenchCopy.parameters.advancedShow}</small>
                        </span>
                        <ChevronDown
                          size={15}
                          className={`studio-param-advanced-chevron ${idealAdvancedSettingsOpen ? 'studio-param-advanced-chevron-open' : ''}`}
                        />
                      </button>
                      {idealAdvancedSettingsBodyVisible ? (
                        <div className="studio-param-advanced-body" ref={idealAdvancedSettingsBodyRef} aria-hidden={!idealAdvancedSettingsOpen}>
                          {editableCurrentParameters.map((param) => renderWorkbenchParameterInputRow(param))}
                        </div>
                      ) : null}
                    </section>
                  ) : activeFile.kind === 'heatCapacity' ? null : (
                    <>
                      {editableCurrentParameters.map((param) => renderWorkbenchParameterInputRow(param))}
                    </>
                  )}
                  {parameterErrors.length > 0 ? (
                    <div className="studio-param-errors">
                      {parameterErrors.map((error) => (
                        <span key={error}>{error}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="studio-readonly-note">
                    {activeFile.kind === 'standard'
                        ? workbenchCopy.parameters.standardReadonlyNote
                        : activeFile.kind === 'heatCapacity'
                          ? workbenchCopy.parameters.heatCapacityReadonlyNote
                          : workbenchCopy.parameters.idealReadonlyNote}
                  </div>
                </div>
              </aside>
              ) : null}

              {!isWorkbenchEmpty && effectiveParametersCollapsed ? (
                <button type="button" className="studio-rail-button studio-right-rail" onClick={openParameterSidebarFromRail}>
                  {workbenchCopy.parameters.title}
                </button>
              ) : null}
            </div>
          </section>
        </main>

        <section className={`studio-console ${consoleCollapsed ? 'studio-console-collapsed' : ''}`} aria-label={workbenchCopy.console.title}>
          <div
            className="studio-console-resizer"
            role="separator"
            aria-orientation="horizontal"
            aria-label={workbenchCopy.console.title}
            onPointerDown={startConsoleResize}
          />
          <div className="studio-console-header">
            <button
              type="button"
              className="studio-console-toggle"
              aria-expanded={!consoleCollapsed}
              aria-label={workbenchCopy.console.title}
              onClick={() => setConsoleCollapsed((current) => !current)}
            >
              <ChevronDown size={13} />
            </button>
            <span>{workbenchCopy.console.title}</span>
            <div className="studio-console-tabs">
              {(['logs', 'warnings', 'summary'] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  className={consoleTab === tab ? 'studio-console-tab-active' : undefined}
                  onClick={() => setConsoleTab(tab)}
                >
                  {workbenchCopy.console.tabs[tab]}
                </button>
              ))}
            </div>
          </div>
          <div className="studio-console-body" ref={consoleBodyRef}>
            {consoleTab === 'summary' ? (
              <div className="studio-console-summary">
                <div><span>{workbenchCopy.console.total}</span><strong>{logs.length}</strong></div>
                <div><span>{workbenchCopy.console.info}</span><strong>{consoleSummary.counts.info}</strong></div>
                <div><span>{workbenchCopy.console.success}</span><strong>{consoleSummary.counts.success}</strong></div>
                <div><span>{workbenchCopy.console.warnings}</span><strong>{consoleSummary.counts.warning}</strong></div>
                <div><span>{workbenchCopy.console.errors}</span><strong>{consoleSummary.counts.error}</strong></div>
                <div className="studio-console-summary-wide">
                  <span>{workbenchCopy.console.latest}</span>
                  <strong>{consoleSummary.latest ? `${consoleSummary.latest.time} ${resolveWorkbenchConsoleMessage(consoleSummary.latest, settingsLanguagePreference)}` : workbenchCopy.console.noLogs}</strong>
                </div>
                <div className="studio-console-summary-wide">
                  <span>{workbenchCopy.console.runtime}</span>
                  <strong>{consoleSummary.runtime}</strong>
                </div>
              </div>
            ) : displayedLogs.length > 0 ? (
              displayedLogs.map((log) => (
                <div className="studio-log" key={log.id}>
                  <span className="studio-log-time">{log.time}</span>
                  <span className={`studio-log-kind-${log.kind}`}>
                    {log.kind === 'info'
                      ? workbenchCopy.console.info
                      : log.kind === 'success'
                        ? workbenchCopy.console.success
                        : log.kind === 'warning'
                          ? workbenchCopy.console.warnings
                          : workbenchCopy.console.errors}
                  </span>
                  <span>{resolveWorkbenchConsoleMessage(log, settingsLanguagePreference)}</span>
                </div>
              ))
            ) : (
              <div className="studio-console-empty">
                {consoleTab === 'warnings' ? workbenchCopy.console.noWarnings : workbenchCopy.console.noLogs}
              </div>
            )}
          </div>
        </section>

        <footer className="studio-status">
          <div className="studio-status-group">
            <span>{workbenchCopy.status.activeFile(isWorkbenchEmpty ? workbenchCopy.status.none : activeFile.name)}</span>
            <span>{workbenchCopy.status.selectedBlock(isWorkbenchEmpty ? workbenchCopy.status.none : activePanelTitle)}</span>
          </div>
          <div className="studio-status-group">
            <span>
              {consoleSummary.runtime}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WorkbenchStudioPrototype;
