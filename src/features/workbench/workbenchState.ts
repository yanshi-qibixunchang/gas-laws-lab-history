import type { SimulationParams } from '../../shared/types';
import {
  validateHardSphereSimulationParams,
} from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  getWorkbenchAdvancedParameterDefinitions,
  type WorkbenchAdvancedParameterKey,
} from './workbenchParameterRegistry.ts';
import {
  HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA,
  createDefaultHeatCapacityRuntimeState,
  updateHeatCapacityRuntimeZeroOffset,
} from '../../domain/heatCapacity/heatCapacityTeachingRuntimeModel.ts';
import {
  createDefaultHeatCapacityFreeRecordConfig as createDefaultHeatCapacityFreeRecordConfigFromDomain,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  createDefaultHeatCapacityModeSessionStore,
} from './workbenchHeatCapacityModeSession.ts';
import {
  restartCurrentHeatCapacityFreeExperimentGroup,
  selectCurrentHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
export {
  applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields,
  applyHeatCapacityFreeDomainToRuntimeFields,
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  createHeatCapacityFreeExperimentDomainStateFromFile,
  hasHeatCapacityFreeIdealThermalBoundaryContamination,
  hydrateHeatCapacityFreeAuthorityProjection,
  normalizeHeatCapacityFreeExperimentDomainBoundary,
  projectHeatCapacityFreeExperimentGroupToDomain,
  selectActiveHeatCapacityFreeDomain,
  selectHeatCapacityFreeAppliedParameterDraft,
  selectHeatCapacityFreeActiveRunConfigSnapshot,
  selectHeatCapacityFreeDomain,
  selectHeatCapacityFreeGasType,
  setHeatCapacityFreeActiveGasTypeAuthority,
  storeHeatCapacityFreeRuntimeFieldsInDomain,
  transactHeatCapacityFreeAuthority,
  withHeatCapacityFreeTrialParameterScheme,
  type HeatCapacityFreeAuthorityState,
  type HeatCapacityFreeAuthorityTransactionOptions,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
export {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  normalizeHeatCapacityFreePhysicsConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_PARAMS,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  createWorkbenchBaseFile,
  type WorkbenchFileLayoutDefaults,
  type WorkbenchIdealState,
  type WorkbenchStandardState,
} from './workbenchFileState.ts';
import type {
  WorkbenchHeatCapacityPistonOscillationState,
} from './workbenchPistonOscillationState.ts';
import type {
  HeatCapacityFreeFileNoticeKey,
  HeatCapacityFreeParameterScheme,
  WorkbenchHeatCapacityPressureZeroAdjustMode,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  clampHeatCapacityPressureZeroKnobAngle,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureZeroDisplayText,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  isHeatCapacityPhysicalKernelMode,
  isHeatCapacityPressureZeroWithinTolerance,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  isHeatCapacityFreeExperimentGroupComplete,
} from './workbenchHeatCapacityFreeParameterState.ts';
import {
  removeHeatCapacityFreeTraceTrialFromStore,
} from './workbenchHeatCapacityFreeTraceState.ts';
import {
  createDefaultHeatCapacityFreeExperimentDomainState,
  createDefaultHeatCapacityFreeRuntimeFields,
  createDefaultHeatCapacityGuideRuntimeFields,
  normalizeHeatCapacityFreeFileAcknowledgements,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  resetHeatCapacityFreeRunWorkbenchStateCore,
} from './workbenchHeatCapacityFreeRunReset.ts';
import {
  getHeatCapacityFreeBatchProgress,
} from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import {
  setHeatCapacityFreePressureZeroOffsetCore,
} from './workbenchHeatCapacityFreeControlState.ts';
import {
  setHeatCapacityGuidePressureZeroOffsetCore,
} from './workbenchHeatCapacityGuideControlState.ts';
import {
  getHeatCapacityRuntimeStateFromFile,
  mergeHeatCapacityRuntimeState,
} from './workbenchHeatCapacityTeachingRuntimeState.ts';
export {
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  canOpenHeatCapacityParameterSidebar,
  createDefaultHeatCapacityFreeParameterState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityFreeParameterLockReason,
  getHeatCapacityParameterSidebarBlockReason,
  hasCompletedHeatCapacityFreeRecordSet,
  isHeatCapacityFreeExperimentGroupComplete,
  isHeatCapacityFreeGasTypeEditingAvailable,
  isHeatCapacityFreeParameterEditingAvailable,
  resetHeatCapacityFreeParametersToDefaultWorkbenchState,
  shouldPromptHeatCapacityFreePowerOffBeforeNextGroup,
} from './workbenchHeatCapacityFreeParameterState.ts';
export {
  getActiveHeatCapacityFreeTrialIndex,
  getHeatCapacityFreeRecordDisplayTrialIndex,
} from './workbenchHeatCapacityFreeTrialState.ts';
export {
  mergeHeatCapacityFreeRuntimeState,
} from './workbenchHeatCapacityFreeRuntimeState.ts';
export {
  HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  createDefaultHeatCapacityFreeExperimentDomainState,
  createDefaultHeatCapacityFreeFileAcknowledgements,
  createDefaultHeatCapacityFreeRuntimeFields,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  normalizeHeatCapacityFreeFileAcknowledgements,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
export {
  resetHeatCapacityFreeRunWorkbenchState,
} from './workbenchHeatCapacityFreeRunReset.ts';
export {
  completeHeatCapacityCalculationWorkflowWorkbenchState,
  continueHeatCapacityCalculationAnswerWorkbenchState,
  ensureHeatCapacityCalculationSessionWorkbenchState,
  getHeatCapacityCalculationSession,
  revealHeatCapacityCalculationAnswerWorkbenchState,
  selectHeatCapacityCalculationAggregateWorkbenchState,
  selectHeatCapacityCalculationGroupWorkbenchState,
  submitHeatCapacityCalculationStepWorkbenchState,
  updateHeatCapacityCalculationDraftWorkbenchState,
} from './workbenchHeatCapacityCalculationCoordinator.ts';
export {
  abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  getHeatCapacityFreeBatchProgress,
  getHeatCapacityFreeDisplayTheoreticalGamma,
  isHeatCapacityFreeExperimentStarted,
  selectDisplayedHeatCapacityFreeDomain,
  selectHeatCapacityFreeViewedExperimentGroupWorkbenchState,
  selectHeatCapacityFreeViewedTrialWorkbenchState,
  setHeatCapacityFreeDisplaySchemeWorkbenchState,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
} from './workbenchHeatCapacityFreeExperimentGroupState.ts';
export {
  deriveHeatCapacityFreeWorkbenchAttemptWaitTimer,
  deriveHeatCapacityFreeWorkflowStage,
  dismissHeatCapacityFreeInvalidAttemptPromptWorkbenchState,
  evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState,
  getHeatCapacityFreeDisplayPhase,
  getHeatCapacityReleasePurpose,
  isHeatCapacityFreeAttemptInvalid,
} from './workbenchHeatCapacityFreeAttemptState.ts';
export {
  recordHeatCapacityFreeTraceEvent,
  recordHeatCapacityFreeTraceEventWithReference,
} from './workbenchHeatCapacityFreeTraceState.ts';
export {
  captureHeatCapacityFreeRollbackSnapshot,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
} from './workbenchHeatCapacityFreeRollbackState.ts';
export {
  applyHeatCapacityFreeRecordWorkbenchState,
  getHeatCapacityFreeRecordBlockReason,
  getHeatCapacityFreeRecordButtonState,
  type HeatCapacityFreeRecordButtonState,
  type HeatCapacityFreeWorkbenchRecordAttempt,
  type HeatCapacityFreeWorkbenchRecordKind,
  type HeatCapacityFreeWorkbenchRecordOptions,
} from './workbenchHeatCapacityFreeRecordState.ts';
export {
  selectActiveHeatCapacityWorkbenchDisplay,
} from './workbenchHeatCapacityDisplayState.ts';
export {
  HEAT_CAPACITY_FREE_ACCELERATED_SAMPLE_STEP_S,
  getHeatCapacityFreeEquilibriumSpeedMultiplier,
  isHeatCapacityFreeEquilibriumSpeedAvailable,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
} from './workbenchHeatCapacityFreeRuntimeCoordinator.ts';
export {
  mergeHeatCapacityGuideRuntimeState,
} from './workbenchHeatCapacityGuideRuntimeState.ts';
export {
  stepHeatCapacityGuideWorkbenchFile,
} from './workbenchHeatCapacityGuideRuntimeCoordinator.ts';
export {
  applyHeatCapacityGuideRecordWorkbenchState,
  getHeatCapacityGuideRecordButtonState,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  type HeatCapacityGuideRecordButtonState,
  type HeatCapacityGuideWorkbenchRecordAttempt,
  type HeatCapacityGuideWorkbenchRecordKind,
} from './workbenchHeatCapacityGuideControlState.ts';
export {
  completeHeatCapacityTeachingModeWorkbenchState,
  exitHeatCapacityTeachingModeWorkbenchState,
} from './workbenchHeatCapacityTeachingResultState.ts';
export {
  captureHeatCapacityWorkbenchSample,
  powerHeatCapacityWorkbenchFile,
  refreshHeatCapacityPumpFrequency,
  registerHeatCapacityPumpStroke,
  setHeatCapacityScriptedPumpValveOpen,
  setHeatCapacityScriptedStopcockOpen,
  shouldCommitHeatCapacityRealtimeTick,
  stepHeatCapacityWorkbenchFile,
} from './workbenchHeatCapacityRuntimeCoordinator.ts';
export {
  abortHeatCapacityGuideWorkbenchState,
  completeHeatCapacityFreePreheatWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  enterHeatCapacityFreeModeWorkbenchState,
  isHeatCapacityFreePreheatRequired,
  prepareHeatCapacityAutoDemoReset,
  prepareHeatCapacityAutoDemoStart,
  startHeatCapacityGuideWorkbenchState,
} from './workbenchHeatCapacityTeachingLifecycleState.ts';

export {
  DEFAULT_HEAT_CAPACITY_PARAMS,
  DEFAULT_IDEAL_PARAMS,
  DEFAULT_STANDARD_PARAMS,
  IDEAL_RESULT_HEIGHT_RATIO,
  WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
  WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO,
  WORKBENCH_LIVE_SPLIT_MAX_RATIO,
  WORKBENCH_LIVE_SPLIT_MIN_RATIO,
  WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
  clampWorkbenchLiveSplitRatio,
  cloneParams,
  createDefaultIdealFile,
  createDefaultIdealWindowLayout,
  createDefaultStandardFile,
  createDefaultStandardResultsLayout,
  createEmptyChartData,
  createIdleStats,
  type WorkbenchExportEnvironmentStatus,
  type WorkbenchFileLayoutDefaults,
  type WorkbenchHeatCapacityPanelKey,
  type WorkbenchHeatCapacityTabId,
  type WorkbenchIdealResultWindowKey,
  type WorkbenchIdealState,
  type WorkbenchIdealWindowLayout,
  type WorkbenchPanelKey,
  type WorkbenchRunState,
  type WorkbenchStandardResultsLayout,
  type WorkbenchStandardResultsTab,
  type WorkbenchStandardState,
} from './workbenchFileState.ts';
export {
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
  WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
  commitPistonOscillationGuideParameterWorkbenchState,
  createDefaultHeatCapacityPistonOscillationFile,
  editPistonOscillationGuideParameterWorkbenchState,
  startPistonOscillationFreeWorkbenchState,
  startPistonOscillationGuideWorkbenchState,
  transitionPistonOscillationFreeWorkbenchState,
  transitionPistonOscillationGuideWorkbenchState,
  type WorkbenchHeatCapacityPistonOscillationState,
  type WorkbenchPistonOscillationCameraPreset,
} from './workbenchPistonOscillationState.ts';
export type {
  HeatCapacityFreeDisplayScheme,
  HeatCapacityFreeExperimentDomainState,
  HeatCapacityFreeFileAcknowledgements,
  HeatCapacityFreeFileNoticeKey,
  HeatCapacityFreeParameterScheme,
  HeatCapacityFreeRollbackSnapshot,
  HeatCapacityFreeRollbackSnapshots,
  HeatCapacityFreeWorkflowStage,
  HeatCapacityMode,
  HeatCapacityPressureZeroDisplayedSample,
  HeatCapacityTeachingStatus,
  WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  WorkbenchHeatCapacityPressureSafetyStatus,
  WorkbenchHeatCapacityPressureZeroAdjustMode,
  WorkbenchHeatCapacityPumpBulbState,
  WorkbenchHeatCapacityPumpFrequencyStatus,
  WorkbenchHeatCapacityPumpValveState,
  WorkbenchHeatCapacityState,
  WorkbenchHeatCapacityStopcockState,
} from './workbenchHeatCapacityStateTypes.ts';
export {
  HEAT_CAPACITY_GAUGE_DANGER_START_ROTATION_RAD,
  HEAT_CAPACITY_GAUGE_FALL_RATE,
  HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA,
  HEAT_CAPACITY_GAUGE_PRESSURE_MIN_KPA,
  HEAT_CAPACITY_GAUGE_RISE_RATE,
  HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD,
  HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD,
  HEAT_CAPACITY_MIN_PUMP_FREQUENCY,
  HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT,
  HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS,
  HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV,
  HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  applyHeatCapacityPressureZero,
  canZeroHeatCapacityPressure,
  clampHeatCapacityPressureZeroKnobAngle,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureThresholdsMv,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityStopcockState,
  getHeatCapacityStopcockTargetAngle,
  isHeatCapacityPhysicalKernelMode,
  isHeatCapacityPressureZeroWithinTolerance,
  normalizeHeatCapacityStopcockAngle,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';

export type { WorkbenchFileKind } from './workbenchFileKind.ts';
export { HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA };
export const createDefaultHeatCapacityFreeRecordConfig =
  createDefaultHeatCapacityFreeRecordConfigFromDomain;
const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const setHeatCapacityPressureZeroOffset = (
  file: WorkbenchHeatCapacityState,
  zeroOffset: number,
  adjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode = 'none',
  knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffset),
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const pressureZeroKnobAngle = clampHeatCapacityPressureZeroKnobAngle(knobAngle);
  const pressureZeroOffset = getHeatCapacityPressureZeroOffsetForKnobAngle(pressureZeroKnobAngle);
  const pressureZeroAdjusted = adjustMode !== 'none' || pressureZeroOffset !== 0;
  if (file.heatCapacityMode === 'guide') {
    return setHeatCapacityGuidePressureZeroOffsetCore(
      file,
      pressureZeroOffset,
      pressureZeroAdjusted,
      pressureZeroKnobAngle,
      adjustMode,
      now,
    );
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    // Turning the calibration knob is a measurement-layer operation. It must
    // work before power-on and must not by itself start/freeze an experiment.
    return setHeatCapacityFreePressureZeroOffsetCore(
      file,
      pressureZeroOffset,
      pressureZeroAdjusted,
      pressureZeroKnobAngle,
      adjustMode,
      now,
    );
  }
  const runtime = updateHeatCapacityRuntimeZeroOffset(
    {
      ...getHeatCapacityRuntimeStateFromFile(file),
      pressureZeroAdjusted,
    },
    pressureZeroOffset,
    now,
  );
  const mergedFile = mergeHeatCapacityRuntimeState({
    ...file,
    pressureZeroAdjusted,
    pressureZeroed: false,
    pressureZeroKnobAngle,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
    pressureZeroAdjustMode: adjustMode,
    pressureZeroDisplayedSamples: pressureZeroOffset === file.pressureZeroOffset
      ? file.pressureZeroDisplayedSamples
      : [],
  }, {
    ...runtime,
    pressureZeroAdjusted,
  }, now);
  const immediatePressureSignalMv = mergedFile.powerOn
    ? truncateHeatCapacitySignalMv(runtime.pressureSignalMvDisplayed)
    : null;
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    [],
    now,
    immediatePressureSignalMv,
    mergedFile.powerOn,
  );
  return {
    ...mergedFile,
    pressureSignalMv: immediatePressureSignalMv,
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
    pressureZeroDisplayedSamples,
    pressureZeroed: isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples),
  };
};

export const adjustHeatCapacityPressureZeroFine = (
  file: WorkbenchHeatCapacityState,
  direction: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const stepDirection = direction >= 0 ? 1 : -1;
  const nextKnobAngle = file.pressureZeroKnobAngle + stepDirection * HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG;
  return setHeatCapacityPressureZeroOffset(
    file,
    getHeatCapacityPressureZeroOffsetForKnobAngle(nextKnobAngle),
    'fineWheel',
    nextKnobAngle,
    now,
  );
};

export const adjustHeatCapacityPressureZeroCoarse = (
  file: WorkbenchHeatCapacityState,
  angleDeltaDeg: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => setHeatCapacityPressureZeroOffset(
  file,
  getHeatCapacityPressureZeroOffsetForKnobAngle(file.pressureZeroKnobAngle + angleDeltaDeg),
  'coarseDrag',
  file.pressureZeroKnobAngle + angleDeltaDeg,
  now,
);

export interface WorkbenchParameterRow {
  key: WorkbenchAdvancedParameterKey;
  label: string;
  value: string;
  unit?: string;
  editable: boolean;
}

export interface WorkbenchValidationResult {
  valid: boolean;
  errors: string[];
}

export type WorkbenchFileState =
  | WorkbenchStandardState
  | WorkbenchIdealState
  | WorkbenchHeatCapacityState
  | WorkbenchHeatCapacityPistonOscillationState;

const HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED = false;

export const acknowledgeHeatCapacityFreeFileNoticeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  notice: HeatCapacityFreeFileNoticeKey,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeFileAcknowledgements: {
    ...normalizeHeatCapacityFreeFileAcknowledgements(file.heatCapacityFreeFileAcknowledgements),
    [notice]: true,
  },
});

const formatNumber = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
};

export const normalizeHeatCapacityFileName = (name: string) => {
  const match = /^(?:Hard-Sphere Heat Capacity Ratio|Heat Capacity Ratio) - (\d{3})$/.exec(name);
  return match ? `Adiabatic Expansion - ${match[1]}` : name;
};

const loadActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return transactHeatCapacityFreeAuthority(
    file,
    (authority) => authority,
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
};

const storeActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free'
    ? commitHeatCapacityFreeRuntimeAuthorityTransaction(file, scheme)
    : file
);

export const createDefaultHeatCapacityFile = (
  index = 1,
  defaults?: WorkbenchFileLayoutDefaults,
): WorkbenchHeatCapacityState => {
  const runtime = createDefaultHeatCapacityRuntimeState();
  const gaugePressureState = getHeatCapacityGaugePressureState(runtime.pressureDeltaKPa, false);
  const freeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(`free-runtime-${index}`);
  const heatCapacityFreeRealDomain = createDefaultHeatCapacityFreeExperimentDomainState('real', `free-runtime-${index}`);
  // Both parameter schemes are views of the same physical instrument file, so
  // they share one deterministic sensor zero bias.
  const heatCapacityFreeIdealDomain = createDefaultHeatCapacityFreeExperimentDomainState('ideal', `free-runtime-${index}`);
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  return {
    ...createWorkbenchBaseFile('heatCapacity', index, DEFAULT_HEAT_CAPACITY_PARAMS, {
      ...defaults,
      liveWorkspaceSplitRatio: defaults?.liveWorkspaceSplitRatio ?? WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO,
    }),
    kind: 'heatCapacity',
    particles: [],
    heatCapacityMode: 'free',
    heatCapacityModeSessions: createDefaultHeatCapacityModeSessionStore(),
    heatCapacityTeachingStatus: 'idle',
    heatCapacityLessonIntroAutoShown: false,
    heatCapacityFreePreheatCompleted: false,
    ...freeRuntimeFields,
    heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    ...guideRuntimeFields,
    openHeatCapacityTabs: [],
    activeHeatCapacityTabId: null,
    heatCapacityMaterialsExpanded: true,
    heatCapacityTabContainerHeight: 0.5,
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityPhase: runtime.heatCapacityPhase,
    powerOn: false,
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    ambientPressureKPa: runtime.ambientPressureKPa,
    ambientTemperatureK: runtime.ambientTemperatureK,
    gasPressureKPaAbs: runtime.gasPressureKPaAbs,
    gasTemperatureK: runtime.gasTemperatureK,
    sensorTemperatureK: runtime.sensorTemperatureK,
    pressureDeltaKPa: runtime.pressureDeltaKPa,
    simulationTimeS: runtime.simulationTimeS,
    lastUpdateMs: runtime.lastUpdateMs,
    pressureSignalMvRaw: runtime.pressureSignalMvRaw,
    pressureSignalMvDisplayed: runtime.pressureSignalMvDisplayed,
    pressureInitialBiasMv: runtime.pressureInitialBiasMv,
    temperatureSignalTargetMv: runtime.temperatureSignalMv,
    pressureSignalTargetMv: runtime.pressureSignalMvDisplayed,
    displayResponseLastUpdateMs: null,
    pressureZeroDisplayedSamples: [],
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: 0,
    temperatureDisplayJitterOffset: 0,
    temperatureDisplayNextJitterAtMs: 0,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: '未调零',
    releaseRecoveryTargetDeltaKPa: runtime.releaseRecoveryTargetDeltaKPa,
    pressureSignalRawReadoutMv: roundNumber(runtime.pressureSignalMvRaw, 2),
    pressureSignalReadoutMv: roundNumber(runtime.pressureSignalMvDisplayed, 2),
    pressureGaugeTargetValue: gaugePressureState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugePressureState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugePressureState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugePressureState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugePressureState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugePressureState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugePressureState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugePressureState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugePressureState.pressureSafetyStatus,
    pressureSafetyMessage: gaugePressureState.pressureSafetyMessage,
    pressureBlockedPumping: gaugePressureState.pressureBlockedPumping,
    pressureOverLimit: gaugePressureState.pressureOverLimit,
    pressureZeroMvPerTurn: HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
    pressureZeroAdjustMode: 'none',
    temperatureSignalMv: null,
    pressureSignalMv: null,
    pressureKPa: null,
    pressureLimitKPa: runtime.modelConfig.pressureLimitKPa,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '未打气',
    hardSphereViewEnabled: HEAT_CAPACITY_FREE_DEFAULT_HARD_SPHERE_VIEW_ENABLED,
    vesselPressureReadoutKPa: roundNumber(runtime.gasPressureKPaAbs, 2),
    vesselTemperatureReadoutK: roundNumber(runtime.gasTemperatureK, 3),
    recordedPressures: {
      p0: runtime.modelConfig.ambientPressureKPa,
      p1: null,
      p2: null,
    },
    visualizationMode: runtime.modelConfig.visualizationMode,
    calculationModel: runtime.modelConfig.calculationModel,
    pressureSensitivityMvPerKPa: runtime.modelConfig.sensor.pressureSensitivityMvPerKPa,
    heatCapacityProcessSamples: runtime.heatCapacityProcessSamples,
    theoreticalGamma: freeRuntimeFields.heatCapacityFreeInstrumentConfig.physics.gamma,
  };
};

const discardCurrentHeatCapacityFreeExperimentRuntime = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const lastTrial = file.heatCapacityFreeRunWorkspace.trials[file.heatCapacityFreeRunWorkspace.trials.length - 1] ?? null;
  const shouldDiscardLastTrial = lastTrial?.completedAtMs === null;
  const traceTrialIds = new Set(
    [
      shouldDiscardLastTrial ? lastTrial?.traceTrialId ?? null : null,
      file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId,
    ].filter((id): id is string => typeof id === 'string'),
  );
  let traceStore = file.heatCapacityFreeRunWorkspace.traceStore;
  for (const traceTrialId of traceTrialIds) {
    traceStore = removeHeatCapacityFreeTraceTrialFromStore(traceStore, traceTrialId);
  }
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      trials: shouldDiscardLastTrial
        ? file.heatCapacityFreeRunWorkspace.trials.slice(0, -1)
        : file.heatCapacityFreeRunWorkspace.trials,
      traceStore,
      activeAttempt: null,
    },
  };
};

const resetHeatCapacityFreeExperimentWithinCurrentGroup = (
  file: WorkbenchHeatCapacityState,
  now: number,
  discardCurrentExperiment: boolean,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    hydratedFile.heatCapacityFreeExperimentGroups,
  );
  if (currentGroup?.status !== 'collecting') return file;

  const scheme = hydratedFile.heatCapacityFreeParameterScheme;
  const batch = hydratedFile.heatCapacityFreeRunWorkspace.batch;
  const resetSourceFile = discardCurrentExperiment
    ? discardCurrentHeatCapacityFreeExperimentRuntime(hydratedFile)
    : hydratedFile;
  const resetFile = resetHeatCapacityFreeRunWorkbenchStateCore(resetSourceFile, now);
  const groups = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    hydratedFile.heatCapacityFreeExperimentGroups,
    {
      batch,
      trials: resetFile.heatCapacityFreeRunWorkspace.trials,
      traceStore: resetFile.heatCapacityFreeRunWorkspace.traceStore,
    },
  );
  return storeActiveHeatCapacityFreeDomainRuntimeFields(
    {
      ...resetFile,
      heatCapacityFreeExperimentGroups: groups,
      heatCapacityFreeRunWorkspace: {
        ...resetFile.heatCapacityFreeRunWorkspace,
        batch,
        activeAttempt: null,
        currentExperimentStatus: 'draft',
      },
      heatCapacityFreeParameterScheme: scheme,
      heatCapacityFreeDisplayScheme: scheme,
      updatedAt: now,
    },
    scheme,
  );
};

export const restartHeatCapacityFreeBatchWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const groups = restartCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (groups === file.heatCapacityFreeExperimentGroups) return file;
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = transactHeatCapacityFreeAuthority(
    file,
    (authority) => ({
      ...authority,
      heatCapacityFreeExperimentGroups: groups,
    }),
    { commitRuntimeScheme: scheme },
  );
  const openHeatCapacityTabs = hydratedFile.openHeatCapacityTabs.filter(
    (tabId) => tabId !== 'review',
  );
  const activeHeatCapacityTabId = hydratedFile.activeHeatCapacityTabId === 'review'
    ? openHeatCapacityTabs[0] ?? null
    : hydratedFile.activeHeatCapacityTabId;
  const clearedFile: WorkbenchHeatCapacityState = {
    ...hydratedFile,
    visiblePanels: hydratedFile.visiblePanels.filter(
      (panelKey) => panelKey !== 'heatCapacityReview',
    ),
    openHeatCapacityTabs,
    activeHeatCapacityTabId,
    heatCapacityFreeRunWorkspace: {
      ...hydratedFile.heatCapacityFreeRunWorkspace,
      activeAttempt: null,
    },
  };
  const resetFile = resetHeatCapacityFreeRunWorkbenchStateCore(clearedFile, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields({
    ...resetFile,
    heatCapacityFreeExperimentGroups: groups,
    heatCapacityFreeRunWorkspace: {
      batch: hydratedFile.heatCapacityFreeRunWorkspace.batch,
      traceStore: hydratedFile.heatCapacityFreeRunWorkspace.traceStore,
      trials: hydratedFile.heatCapacityFreeRunWorkspace.trials,
      activeAttempt: null,
      currentExperimentStatus: 'running',
    },
    updatedAt: now,
  }, scheme);
};

export const restartCurrentHeatCapacityFreeExperimentWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => resetHeatCapacityFreeExperimentWithinCurrentGroup(
  file,
  now,
  true,
);

export const prepareNextHeatCapacityFreeExperimentWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (!isHeatCapacityFreeExperimentGroupComplete(file)) return file;
  const progress = getHeatCapacityFreeBatchProgress(file);
  if (
    progress.targetGroupCount !== null &&
    progress.completedGroupCount >= progress.targetGroupCount
  ) {
    return file;
  }
  return resetHeatCapacityFreeExperimentWithinCurrentGroup(
    file,
    now,
    false,
  );
};

export const areWorkbenchParamsEqual = (a: SimulationParams, b: SimulationParams) => (
  a.N === b.N &&
  a.L === b.L &&
  a.r === b.r &&
  a.m === b.m &&
  a.k === b.k &&
  a.dt === b.dt &&
  a.nu === b.nu &&
  a.equilibriumTime === b.equilibriumTime &&
  a.statsDuration === b.statsDuration &&
  a.targetTemperature === b.targetTemperature
);

export const getWorkbenchParameterRows = (file: WorkbenchFileState): WorkbenchParameterRow[] => {
  if (
    file.kind === 'heatCapacity' ||
    file.kind === 'heatCapacityPistonOscillation'
  ) {
    return [];
  }
  return getWorkbenchAdvancedParameterDefinitions(file.kind).map((definition) => ({
    key: definition.key,
    label: definition.label,
    value: formatNumber(file.params[definition.key]),
    unit: definition.unit,
    editable: definition.editable,
  }));
};

export const validateWorkbenchParams = (params: SimulationParams): WorkbenchValidationResult => {
  return validateHardSphereSimulationParams(params);
};
