import type {
  SimulationParams,
  SimulationStats,
} from '../../shared/types';
import {
  validateHardSphereSimulationParams,
} from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  getWorkbenchAdvancedParameterDefinitions,
  type WorkbenchAdvancedParameterKey,
} from './workbenchParameterRegistry.ts';
import {
  applyHeatCapacityPumpStroke as applyHeatCapacityRuntimePumpStroke,
  captureHeatCapacityProcessSample,
  HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA,
  createDefaultHeatCapacityRuntimeState,
  powerHeatCapacityRuntimeState,
  stepHeatCapacityExperiment,
  updateHeatCapacityRuntimeZeroOffset,
  type HeatCapacityRuntimeState,
} from '../../domain/heatCapacity/heatCapacityTeachingRuntimeModel.ts';
import type {
  HeatCapacityProcessSampleKey,
  HeatCapacityProcessSamplePoint,
  HeatCapacityRuntimePhase,
} from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  mapGasTemperatureToSignalMv,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
  getHeatCapacityDisplayValue,
} from '../../domain/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
  HEAT_CAPACITY_RELEASE_TIMING,
  createDefaultHeatCapacityFreeRecordConfig as createDefaultHeatCapacityFreeRecordConfigFromDomain,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  advanceHeatCapacityReleaseState,
  beginHeatCapacityReleaseClosing,
  beginHeatCapacityReleaseOpening,
  createClosedHeatCapacityReleaseState,
  getHeatCapacityReleaseDurationS,
  getHeatCapacityReleaseNextTransitionAtS,
  isHeatCapacityReleaseFlowOpen,
  type HeatCapacityReleasePurpose,
  type HeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  createDefaultHeatCapacityModeSessionStore,
} from './workbenchHeatCapacityModeSession.ts';
import {
  createHeatCapacityAutoDemoProfile,
  normalizeHeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  deriveFreePhysicalState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createSeededFreePressureInitialBiasMv,
  getFreeSensorDisplay,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  createHeatCapacityTemperatureSensorState,
  stepHeatCapacityTemperatureSensor,
  type HeatCapacityTemperatureSensorState,
} from '../../domain/heatCapacity/heatCapacityTemperatureSensorModel.ts';
import {
  restartCurrentHeatCapacityFreeExperimentGroup,
  selectCurrentHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
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
  getEffectiveHeatCapacityFreeSensorConfig,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  applyGuidePumpStroke,
  deriveGuidePhysicalState,
  stepGuidePhysicsState,
  type HeatCapacityGuidePhysicsConfig,
  type HeatCapacityGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV,
  getHeatCapacityGuideActionGuard,
  transitionHeatCapacityGuideWorkflow,
  type HeatCapacityGuideAction,
  type HeatCapacityGuideActionContext,
  type HeatCapacityGuideWorkflowState,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
  type HeatCapacityGuideTrial,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  HEAT_CAPACITY_GUIDE_WAIT_TARGET_S,
  deriveHeatCapacityGuideExperimentTimer,
  normalizeHeatCapacityGuideSpeedMultiplier,
} from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
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
  HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  applyHeatCapacityPressureZero,
  clampHeatCapacityPressureZeroKnobAngle,
  getHeatCapacityGaugeDisplayValue,
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureZeroDisplayText,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityStopcockState,
  getHeatCapacityStopcockTargetAngle,
  isHeatCapacityPhysicalKernelMode,
  isHeatCapacityPressureZeroWithinTolerance,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  isHeatCapacityFreeExperimentGroupComplete,
} from './workbenchHeatCapacityFreeParameterState.ts';
import {
  synchronizeHeatCapacityPhysicsControlTiming,
} from './workbenchHeatCapacityFreeRuntimeState.ts';
import {
  recordHeatCapacityFreeTraceEvent,
  removeHeatCapacityFreeTraceTrialFromStore,
} from './workbenchHeatCapacityFreeTraceState.ts';
import {
  createDefaultHeatCapacityFreeExperimentDomainState,
  createDefaultHeatCapacityFreeRuntimeFields,
  createDefaultHeatCapacityGuideRuntimeFields,
  normalizeHeatCapacityFreeFileAcknowledgements,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  resetHeatCapacityFreeRunWorkbenchState,
  resetHeatCapacityFreeRunWorkbenchStateCore,
} from './workbenchHeatCapacityFreeRunReset.ts';
import {
  ensureHeatCapacityCalculationSessionWorkbenchState,
} from './workbenchHeatCapacityCalculationCoordinator.ts';
import {
  getHeatCapacityFreeBatchProgress,
} from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import {
  selectActiveHeatCapacityWorkbenchDisplay,
} from './workbenchHeatCapacityDisplayState.ts';
import {
  stepHeatCapacityFreeWorkbenchFile,
} from './workbenchHeatCapacityFreeRuntimeCoordinator.ts';
import {
  powerHeatCapacityFreeWorkbenchFileCore,
  registerHeatCapacityFreePumpStrokeCore,
  setHeatCapacityFreePressureZeroOffsetCore,
} from './workbenchHeatCapacityFreeControlState.ts';
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
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
    const steppedFile = stepHeatCapacityGuideWorkbenchFile(file, now);
    const displayPressureMv = truncateHeatCapacitySignalMv(applyHeatCapacityPressureZero(
      steppedFile.pressureSignalMvRaw,
      steppedFile.pressureInitialBiasMv,
      pressureZeroOffset,
    ));
    const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
      pressureZeroOffset === steppedFile.pressureZeroOffset
        ? steppedFile.pressureZeroDisplayedSamples
        : [],
      now,
      displayPressureMv,
      steppedFile.powerOn,
    );
    const pressureZeroed = steppedFile.powerOn &&
      isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
    const baseFile = {
      ...steppedFile,
      pressureZeroAdjusted,
      pressureZeroed,
      pressureZeroKnobAngle,
      pressureZeroOffset,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
      pressureZeroAdjustMode: adjustMode,
      pressureZeroDisplayedSamples,
    };
    const workflow = transitionHeatCapacityGuideWorkflow(
      baseFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(baseFile, 'adjustZero', {
        pressureZeroReady: pressureZeroed,
      }),
    );
    const isZeroAdjustmentStep = !steppedFile.pressureZeroed && (
      steppedFile.heatCapacityGuideWorkflow.step === 'zeroRequired' ||
      (
        steppedFile.heatCapacityGuideWorkflow.step === 'openStopcockForZeroRequired' &&
        getHeatCapacityStopcockState(steppedFile.stopcockAngleDeg) === 'open'
      )
    );
    const mergedFile = mergeHeatCapacityGuideRuntimeState(
      baseFile,
      baseFile.heatCapacityGuidePhysicsState,
      workflow,
      now,
      { immediatePressureDisplay: isZeroAdjustmentStep },
    );
    return isZeroAdjustmentStep
      ? mergedFile
      : {
        ...mergedFile,
        pressureSignalMv: steppedFile.pressureSignalMv,
        pressureSignalReadoutMv: steppedFile.pressureSignalReadoutMv,
        pressureZeroDisplayedSamples: steppedFile.pressureZeroDisplayedSamples,
        pressureZeroed: steppedFile.pressureZeroed,
      };
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

const getHeatCapacityRuntimeStateFromFile = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityRuntimeState => {
  const fallback = createDefaultHeatCapacityRuntimeState(file.lastUpdateMs);
  const experimentProfile = normalizeHeatCapacityTeachingProfile(
    file.heatCapacityExperimentProfile,
  );
  return {
    ...fallback,
    ambientPressureKPa: Number.isFinite(file.ambientPressureKPa) ? file.ambientPressureKPa : fallback.ambientPressureKPa,
    ambientTemperatureK: Number.isFinite(file.ambientTemperatureK) ? file.ambientTemperatureK : fallback.ambientTemperatureK,
    gasPressureKPaAbs: Number.isFinite(file.gasPressureKPaAbs) ? file.gasPressureKPaAbs : fallback.gasPressureKPaAbs,
    gasTemperatureK: Number.isFinite(file.gasTemperatureK) ? file.gasTemperatureK : fallback.gasTemperatureK,
    sensorTemperatureK: Number.isFinite(file.sensorTemperatureK)
      ? file.sensorTemperatureK
      : Number.isFinite(file.gasTemperatureK)
        ? file.gasTemperatureK
        : fallback.sensorTemperatureK,
    pressureDeltaKPa: Number.isFinite(file.pressureDeltaKPa) ? file.pressureDeltaKPa : fallback.pressureDeltaKPa,
    simulationTimeS: Number.isFinite(file.simulationTimeS) ? file.simulationTimeS : fallback.simulationTimeS,
    lastUpdateMs: typeof file.lastUpdateMs === 'number' && Number.isFinite(file.lastUpdateMs) ? file.lastUpdateMs : fallback.lastUpdateMs,
    pressureSignalMvRaw: Number.isFinite(file.pressureSignalMvRaw) ? file.pressureSignalMvRaw : fallback.pressureSignalMvRaw,
    pressureSignalMvDisplayed: Number.isFinite(file.pressureSignalMvDisplayed) ? file.pressureSignalMvDisplayed : fallback.pressureSignalMvDisplayed,
    pressureInitialBiasMv: Number.isFinite(file.pressureInitialBiasMv) ? file.pressureInitialBiasMv : fallback.pressureInitialBiasMv,
    temperatureSignalMv: typeof file.temperatureSignalTargetMv === 'number' && Number.isFinite(file.temperatureSignalTargetMv)
      ? file.temperatureSignalTargetMv
      : fallback.temperatureSignalMv,
    pressureZeroOffset: Number.isFinite(file.pressureZeroOffset) ? file.pressureZeroOffset : fallback.pressureZeroOffset,
    pressureZeroAdjusted: file.pressureZeroAdjusted,
    heatCapacityPhase: file.heatCapacityPhase,
    heatCapacityProcessSamples: file.heatCapacityProcessSamples ?? {},
    releaseRecoveryTargetDeltaKPa: Number.isFinite(file.releaseRecoveryTargetDeltaKPa)
      ? file.releaseRecoveryTargetDeltaKPa
      : fallback.releaseRecoveryTargetDeltaKPa,
    modelConfig: {
      ...fallback.modelConfig,
      ambientPressureKPa: Number.isFinite(file.ambientPressureKPa) ? file.ambientPressureKPa : fallback.modelConfig.ambientPressureKPa,
      ambientTemperatureK: Number.isFinite(file.ambientTemperatureK) ? file.ambientTemperatureK : fallback.modelConfig.ambientTemperatureK,
      visualizationMode: file.visualizationMode === 'particle' ? file.visualizationMode : fallback.modelConfig.visualizationMode,
      calculationModel: file.calculationModel === 'airHeatCapacityRatio' ? file.calculationModel : fallback.modelConfig.calculationModel,
      theoreticalGamma: fallback.modelConfig.theoreticalGamma,
      pumpPressurePeakMv: experimentProfile?.pumpPeakPressureMv ?? fallback.modelConfig.pumpPressurePeakMv,
      stablePressureMv: experimentProfile?.stableBeforeReleaseMv ?? fallback.modelConfig.stablePressureMv,
      recoveryPressureMv: experimentProfile?.recoveryPressureMv ?? fallback.modelConfig.recoveryPressureMv,
      stableTemperatureMv: experimentProfile?.stableTemperatureMv ?? fallback.modelConfig.stableTemperatureMv,
      releaseTemperatureMv: experimentProfile?.releaseTemperatureLowMv ?? fallback.modelConfig.releaseTemperatureMv,
      recoveryTemperatureMv: experimentProfile?.recoveryTemperatureMv ?? fallback.modelConfig.recoveryTemperatureMv,
      releaseRate: experimentProfile
        ? fallback.modelConfig.releaseRate * experimentProfile.releaseSpeed
        : fallback.modelConfig.releaseRate,
      recoveryPressureRate: experimentProfile
        ? fallback.modelConfig.recoveryPressureRate * experimentProfile.thermalRecoveryRate
        : fallback.modelConfig.recoveryPressureRate,
      recoveryHeatFollowRate: experimentProfile
        ? fallback.modelConfig.recoveryHeatFollowRate * experimentProfile.thermalRecoveryRate
        : fallback.modelConfig.recoveryHeatFollowRate,
      sensor: {
        ...fallback.modelConfig.sensor,
        pressureSensitivityMvPerKPa: Number.isFinite(file.pressureSensitivityMvPerKPa)
          ? file.pressureSensitivityMvPerKPa
          : fallback.modelConfig.sensor.pressureSensitivityMvPerKPa,
        noiseStdDevMv: experimentProfile?.displayNoiseLevel ?? fallback.modelConfig.sensor.noiseStdDevMv,
      },
    },
  };
};

const getStatsPhaseForHeatCapacity = (
  file: WorkbenchHeatCapacityState,
  _runtime: HeatCapacityRuntimeState,
): SimulationStats['phase'] => {
  if (file.runState === 'running') return 'collecting';
  return 'idle';
};

const getHeatCapacityJitterFraction = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const updateHeatCapacityDisplayJitter = ({
  powerOn,
  now,
  baseValue,
  target,
  currentOffset,
  nextJitterAtMs,
  channelSeed,
  amplitudeMv,
  minIntervalMs,
  maxIntervalMs,
  stableThresholdMv,
}: {
  powerOn: boolean;
  now: number;
  baseValue: number | null;
  target: number;
  currentOffset: number;
  nextJitterAtMs: number;
  channelSeed: number;
  amplitudeMv: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  stableThresholdMv: number;
}) => {
  if (!powerOn || baseValue === null || !Number.isFinite(baseValue)) {
    return { offset: 0, nextJitterAtMs: now + minIntervalMs };
  }

  const stable = Math.abs(baseValue - target) <= stableThresholdMv;
  if (!stable) {
    return { offset: 0, nextJitterAtMs: now + minIntervalMs };
  }

  if (Number.isFinite(nextJitterAtMs) && now < nextJitterAtMs) {
    return {
      offset: Number.isFinite(currentOffset) ? currentOffset : 0,
      nextJitterAtMs,
    };
  }

  const offsetFraction = getHeatCapacityJitterFraction(now * 0.017 + channelSeed);
  const intervalFraction = getHeatCapacityJitterFraction(now * 0.011 + channelSeed * 2.37);
  return {
    offset: (offsetFraction * 2 - 1) * amplitudeMv,
    nextJitterAtMs: now + minIntervalMs + intervalFraction * (maxIntervalMs - minIntervalMs),
  };
};

const mergeHeatCapacityRuntimeState = (
  file: WorkbenchHeatCapacityState,
  runtime: HeatCapacityRuntimeState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const powerOn = file.powerOn && runtime.heatCapacityPhase !== 'powerOff';
  const elapsedS = file.displayResponseLastUpdateMs === null
    ? 0
    : (now - file.displayResponseLastUpdateMs) / 1000;
  const pressureSignalTargetMv = roundNumber(runtime.pressureSignalMvDisplayed, 3);
  const temperatureSignalTargetMv = roundNumber(runtime.temperatureSignalMv, 3);
  const pressureDisplayValue = powerOn
    ? getHeatCapacityDisplayValue({
        current: file.pressureSignalMv,
        target: pressureSignalTargetMv,
        previousTarget: Number.isFinite(file.pressureSignalTargetMv) ? file.pressureSignalTargetMv : pressureSignalTargetMv,
        elapsedS,
        now,
        config: HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
      })
    : null;
  // Temperature lag already lives in the physical sensor state. Applying a
  // second UI-space low-pass here would make Demo respond differently from the
  // same virtual sensor used by Guide and Free modes.
  const temperatureDisplayValue = powerOn ? temperatureSignalTargetMv : null;
  const pressureJitterState = updateHeatCapacityDisplayJitter({
    powerOn,
    now,
    baseValue: file.pressureSignalMv === null ? null : pressureDisplayValue,
    target: pressureSignalTargetMv,
    currentOffset: file.pressureDisplayJitterOffset,
    nextJitterAtMs: file.pressureDisplayNextJitterAtMs,
    channelSeed: 11.3,
    amplitudeMv: 0.055,
    minIntervalMs: 80,
    maxIntervalMs: 250,
    stableThresholdMv: 0.09,
  });
  const temperatureJitterState = updateHeatCapacityDisplayJitter({
    powerOn,
    now,
    baseValue: file.temperatureSignalMv === null ? null : temperatureDisplayValue,
    target: temperatureSignalTargetMv,
    currentOffset: file.temperatureDisplayJitterOffset,
    nextJitterAtMs: file.temperatureDisplayNextJitterAtMs,
    channelSeed: 23.7,
    amplitudeMv: 0.12,
    minIntervalMs: 120,
    maxIntervalMs: 350,
    stableThresholdMv: 0.12,
  });
  const pressureSignalDisplayRounded = pressureDisplayValue === null ? null : truncateHeatCapacitySignalMv(pressureDisplayValue + pressureJitterState.offset);
  const temperatureSignalDisplayRounded = temperatureDisplayValue === null ? null : truncateHeatCapacitySignalMv(temperatureDisplayValue + temperatureJitterState.offset);
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    file.pressureZeroDisplayedSamples,
    now,
    pressureSignalDisplayRounded,
    powerOn,
  );
  const gaugeTargetState = getHeatCapacityGaugePressureState(runtime.pressureDeltaKPa, powerOn, file);
  const pressureGaugeDisplayValue = getHeatCapacityGaugeDisplayValue({
    current: Number.isFinite(file.pressureGaugeDisplayValue) ? file.pressureGaugeDisplayValue : gaugeTargetState.pressureGaugeTargetValue,
    target: gaugeTargetState.pressureGaugeTargetValue,
    elapsedS,
    pressureOverLimit: gaugeTargetState.pressureOverLimit,
  });
  const gaugePressureState = getHeatCapacityGaugePressureState(
    runtime.pressureDeltaKPa,
    powerOn,
    file,
    pressureGaugeDisplayValue,
  );
  const pressureZeroed = isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
  const heatCapacityPhase = runtime.heatCapacityPhase === 'zeroed' && !pressureZeroed
    ? 'readyToZero'
    : runtime.heatCapacityPhase;
  return {
    ...file,
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
    pressureInitialBiasMv: roundNumber(runtime.pressureInitialBiasMv, 3),
    temperatureSignalTargetMv,
    pressureSignalTargetMv,
    displayResponseLastUpdateMs: now,
    pressureZeroDisplayedSamples,
    pressureDisplayJitterOffset: roundNumber(pressureJitterState.offset, 4),
    pressureDisplayNextJitterAtMs: pressureJitterState.nextJitterAtMs,
    temperatureDisplayJitterOffset: roundNumber(temperatureJitterState.offset, 4),
    temperatureDisplayNextJitterAtMs: temperatureJitterState.nextJitterAtMs,
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
    pressureZeroOffset: roundNumber(runtime.pressureZeroOffset, 3),
    releaseRecoveryTargetDeltaKPa: runtime.releaseRecoveryTargetDeltaKPa === null
      ? null
      : roundNumber(runtime.releaseRecoveryTargetDeltaKPa, 4),
    pressureZeroMvPerTurn: HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
    pressureZeroAdjusted: runtime.pressureZeroAdjusted,
    pressureZeroed,
    temperatureSignalMv: temperatureSignalDisplayRounded,
    pressureSignalMv: pressureSignalDisplayRounded,
    pressureKPa: powerOn ? roundNumber(runtime.gasPressureKPaAbs, 2) : null,
    visualizationMode: runtime.modelConfig.visualizationMode,
    calculationModel: runtime.modelConfig.calculationModel,
    pressureSensitivityMvPerKPa: runtime.modelConfig.sensor.pressureSensitivityMvPerKPa,
    vesselPressureReadoutKPa: roundNumber(runtime.gasPressureKPaAbs, 2),
    vesselTemperatureReadoutK: roundNumber(runtime.gasTemperatureK, 3),
    heatCapacityPhase,
    heatCapacityProcessSamples: runtime.heatCapacityProcessSamples,
    stats: {
      ...file.stats,
      time: roundNumber(runtime.simulationTimeS, 3),
      temperature: roundNumber(runtime.gasTemperatureK, 3),
      pressure: roundNumber(runtime.gasPressureKPaAbs, 3),
      phase: getStatsPhaseForHeatCapacity(file, runtime),
    },
    updatedAt: now,
  };
};

const createHeatCapacityGuidePressureInitialBiasMv = (
  seed: number | string,
) => createSeededFreePressureInitialBiasMv(seed, HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV);

const registerHeatCapacityPumpStrokeCore = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
    const workflowContext = getHeatCapacityGuideActionContext(currentFile, 'pressPumpBulb');
    const workflowGuard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, workflowContext);
    if (!workflowGuard.allowed) {
      const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, workflowContext);
      return mergeHeatCapacityGuideRuntimeState(
        {
          ...currentFile,
          pumpHint: workflowGuard.message,
          pumpBulbState: 'releasing',
        },
        currentFile.heatCapacityGuidePhysicsState,
        workflow,
        now,
      );
    }
    const frequencyState = getHeatCapacityPumpFrequencyState([...currentFile.pumpStrokeTimestamps, now], now);
    const stroke = applyGuidePumpStroke(
      currentFile.heatCapacityGuidePhysicsState,
      currentFile.heatCapacityGuidePhysicsConfig,
      {
        powerOn: currentFile.powerOn,
        pumpValveOpen: currentFile.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) === 'open',
      },
      {
        atS: currentFile.heatCapacityGuidePhysicsState.simulationTimeS,
        strength: 1,
      },
    );
    if (!stroke.accepted) {
      const pumpHint = stroke.reason === 'powerOff'
        ? '请先打开电源，再执行有效打气'
        : stroke.reason === 'stopcockOpen'
          ? '玻璃旋塞已打开，无法形成有效加压'
          : stroke.reason === 'pressureDanger'
            ? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。'
            : '打气阀门未打开，无法有效打气';
      const workflow = transitionHeatCapacityGuideWorkflow(
        currentFile.heatCapacityGuideWorkflow,
        getHeatCapacityGuideActionContext(currentFile, 'pressPumpBulb'),
      );
      return mergeHeatCapacityGuideRuntimeState(
        {
          ...currentFile,
          pumpHint,
          pumpBulbState: 'releasing',
        },
        stroke.state,
        workflow,
        now,
      );
    }
    const workflow = transitionHeatCapacityGuideWorkflow(
      currentFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(currentFile, 'pressPumpBulb'),
    );
    const guidePumpTargetReached = workflow.step === 'closePumpValveRequired';
    return mergeHeatCapacityGuideRuntimeState(
      {
        ...currentFile,
        pumpBulbState: 'compressing',
        pumpStrokeTimestamps: frequencyState.timestamps,
        pumpFrequency: frequencyState.pumpFrequency,
        pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
        lastPumpTime: now,
        pumpStrokeCount: stroke.state.pumpStrokeCount,
        pumpHint: guidePumpTargetReached
          ? '已达到打气标准，请关闭打气阀门。'
          : frequencyState.pumpFrequencyStatus === 'suitable'
          ? '打气频率合适，可以继续观察压强变化'
          : '打气速率偏低，实验效果可能不明显',
      },
      stroke.state,
      workflow,
      now,
    );
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    return registerHeatCapacityFreePumpStrokeCore(file, now);
  }
  if (!file.powerOn) {
    return {
      ...file,
      pumpHint: '请先打开电源，再执行有效打气',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }
  if (!file.pumpValveOpen) {
    return {
      ...file,
      pumpHint: '打气阀门未打开，无法有效打气',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }
  const currentGaugePressureState = getHeatCapacityGaugePressureState(file.pressureDeltaKPa, file.powerOn, file);
  if (
    getHeatCapacityStopcockState(file.stopcockAngleDeg) !== 'open' &&
    currentGaugePressureState.pressureBlockedPumping
  ) {
    return {
      ...file,
      pressureGaugeTargetValue: currentGaugePressureState.pressureGaugeTargetValue,
      pressureWarningThresholdKPa: currentGaugePressureState.pressureWarningThresholdKPa,
      pressureSafeThresholdKPa: currentGaugePressureState.pressureSafeThresholdKPa,
      pressureSafetyThresholdKPa: currentGaugePressureState.pressureSafetyThresholdKPa,
      pressureSafetyStatus: currentGaugePressureState.pressureSafetyStatus,
      pressureSafetyMessage: currentGaugePressureState.pressureSafetyMessage,
      pressureBlockedPumping: currentGaugePressureState.pressureBlockedPumping,
      pressureOverLimit: currentGaugePressureState.pressureOverLimit,
      pumpHint: currentGaugePressureState.pressureSafetyMessage ?? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }

  const frequencyState = getHeatCapacityPumpFrequencyState([...file.pumpStrokeTimestamps, now], now);
  const pumpStroke = applyHeatCapacityRuntimePumpStroke(
    getHeatCapacityRuntimeStateFromFile(file),
    {
      powerOn: file.powerOn,
      pumpValveOpen: file.pumpValveOpen,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpFrequency: frequencyState.pumpFrequency,
      pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    },
    now,
  );
  if (!pumpStroke.accepted) {
    const pumpHint = pumpStroke.reason === 'powerOff'
      ? '请先打开电源，再执行有效打气'
      : pumpStroke.reason === 'stopcockOpen'
        ? '玻璃旋塞已打开，无法形成有效加压'
        : '打气阀门未打开，无法有效打气';
    return {
      ...file,
      pumpHint,
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }

  return mergeHeatCapacityRuntimeState({
    ...file,
    pumpBulbState: 'compressing',
    pumpStrokeTimestamps: frequencyState.timestamps,
    pumpFrequency: frequencyState.pumpFrequency,
    pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    lastPumpTime: now,
    pumpStrokeCount: file.pumpStrokeCount + 1,
    pumpHint: frequencyState.pumpFrequencyStatus === 'suitable'
      ? '打气频率合适，可以继续观察压强变化'
      : '打气速率偏低，实验效果可能不明显',
  }, pumpStroke.state, now);
};

export const registerHeatCapacityPumpStroke = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return registerHeatCapacityPumpStrokeCore(file, now);
  }
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const nextFile = registerHeatCapacityPumpStrokeCore(hydratedFile, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, scheme);
};

export const refreshHeatCapacityPumpFrequency = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const frequencyState = getHeatCapacityPumpFrequencyState(file.pumpStrokeTimestamps, now);
  const pumpHint = frequencyState.pumpFrequencyStatus === 'idle'
    ? '未打气'
    : frequencyState.pumpFrequencyStatus === 'tooSlow'
      ? '打气速率偏低，实验效果可能不明显'
      : '打气频率合适，可以继续观察压强变化';
  return {
    ...file,
    pumpStrokeTimestamps: frequencyState.timestamps,
    pumpFrequency: frequencyState.pumpFrequency,
    pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
    pumpBulbState: frequencyState.pumpFrequencyStatus === 'idle' ? 'idle' : file.pumpBulbState,
    pumpHint,
    updatedAt: now,
  };
};

const createHeatCapacityAutoDemoResultTrial = (
  file: WorkbenchHeatCapacityState,
  now: number,
): HeatCapacityGuideTrial => {
  const profile = normalizeHeatCapacityTeachingProfile(file.heatCapacityExperimentProfile) ??
    createHeatCapacityAutoDemoProfile();
  const samples = file.heatCapacityProcessSamples;
  const baseTrial: HeatCapacityGuideTrial = {
    ...createHeatCapacityGuideTrial('demo-trial-1'),
    source: 'demo',
  };
  const u0Recorded = recordGuideU0(baseTrial, {
    atS: samples.zeroedSample?.timeS ?? 10,
    displayPressureMv: profile.u0MeasuredMv,
    displayTemperatureMv: samples.zeroedSample?.temperatureSignalMv ?? profile.initialTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-zero-1',
  });
  const u1Recorded = recordGuideU1(u0Recorded, {
    atS: samples.stableBeforeReleaseSample?.timeS ?? 86.9,
    displayPressureMv: profile.u1MeasuredMv,
    displayTemperatureMv: samples.stableBeforeReleaseSample?.temperatureSignalMv ?? profile.stableTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-zero-1',
  });
  return recordGuideU2(u1Recorded, {
    atS: samples.recoverySample?.timeS ?? 114.3,
    displayPressureMv: profile.u2MeasuredMv,
    displayTemperatureMv: samples.recoverySample?.temperatureSignalMv ?? profile.recoveryTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'demo-zero-1',
  }, now, {
    atmosphericPressureKPa: file.ambientPressureKPa,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
  });
};

export function completeHeatCapacityTeachingModeWorkbenchState(
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState {
  const heatCapacityGuideTrial = file.heatCapacityMode === 'demo'
    ? createHeatCapacityAutoDemoResultTrial(file, now)
    : file.heatCapacityGuideTrial;
  const completedReleaseState = file.heatCapacityReleaseState.formedRelease &&
    file.heatCapacityReleaseState.phase === 'closedAfterRelease'
    ? file.heatCapacityReleaseState
    : createClosedHeatCapacityReleaseState(file.simulationTimeS);
  const completedFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityTeachingStatus: 'completed',
    heatCapacityGuideTrial,
    powerOn: false,
    runState: 'idle',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    pressureSignalMv: null,
    temperatureSignalMv: null,
    pressureKPa: null,
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayedSamples: [],
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '教学流程已完成',
    heatCapacityReleaseState: completedReleaseState,
    updatedAt: now,
  };
  return ensureHeatCapacityCalculationSessionWorkbenchState(completedFile, now);
}

export function exitHeatCapacityTeachingModeWorkbenchState(
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState {
  return resetHeatCapacityFreeRunWorkbenchState({
    ...file,
    heatCapacityTeachingStatus: 'idle',
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityGuideTrial: null,
    heatCapacityProcessSamples: {},
  }, now);
}

const powerHeatCapacityWorkbenchFileCore = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
    const proposedFile: WorkbenchHeatCapacityState = {
      ...currentFile,
      powerOn: nextPowerOn,
      runState: nextPowerOn ? 'running' : 'idle',
      pressureZeroed: nextPowerOn ? currentFile.pressureZeroed : false,
    };
    const context = getHeatCapacityGuideActionContext(proposedFile, 'togglePower');
    const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
    const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
    const baseFile = guard.allowed
      ? proposedFile
      : currentFile;
    const mergedGuideFile = mergeHeatCapacityGuideRuntimeState(
      {
        ...baseFile,
        runState: workflow.step === 'completed'
          ? 'finished'
          : baseFile.powerOn
            ? baseFile.runState
            : 'idle',
      },
      currentFile.heatCapacityGuidePhysicsState,
      workflow,
      now,
    );
    return workflow.step === 'completed'
      ? completeHeatCapacityTeachingModeWorkbenchState(mergedGuideFile, now)
      : mergedGuideFile;
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    return powerHeatCapacityFreeWorkbenchFileCore(file, nextPowerOn, now);
  }
  const runtime = powerHeatCapacityRuntimeState(
    getHeatCapacityRuntimeStateFromFile(file),
    nextPowerOn,
    now,
  );
  const pressureZeroAdjusted = file.pressureZeroAdjusted || Math.abs(runtime.pressureZeroOffset) > 0.0001;
  return mergeHeatCapacityRuntimeState({
    ...file,
    powerOn: nextPowerOn,
    runState: nextPowerOn ? file.runState : 'idle',
    pressureZeroed: nextPowerOn ? file.pressureZeroed : false,
    pressureZeroAdjusted,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, runtime.pressureZeroOffset),
  }, {
    ...runtime,
    pressureZeroAdjusted,
  }, now);
};

export const powerHeatCapacityWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return powerHeatCapacityWorkbenchFileCore(file, nextPowerOn, now);
  }
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const steppedFile = stepHeatCapacityFreeWorkbenchFile(hydratedFile, now);
  const nextFile = powerHeatCapacityWorkbenchFileCore(steppedFile, nextPowerOn, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, scheme);
};

export const prepareHeatCapacityAutoDemoReset = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
  createInitialBiasMv = () => HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
): WorkbenchHeatCapacityState => {
  const experimentProfile = createHeatCapacityAutoDemoProfile();
  const pressureInitialBiasMv = roundNumber(clampNumber(
    createInitialBiasMv(),
    -HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
    HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV,
  ), 2);
  const gaugePressureState = getHeatCapacityGaugePressureState(0, true, file);
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  const resetFile: WorkbenchHeatCapacityState = {
    ...file,
    ...guideRuntimeFields,
    heatCapacityMode: 'demo',
    heatCapacityTeachingStatus: 'running',
    powerOn: false,
    runState: 'running',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    gasPressureKPaAbs: file.ambientPressureKPa,
    gasTemperatureK: file.ambientTemperatureK,
    pressureDeltaKPa: 0,
    simulationTimeS: 0,
    heatCapacityReleaseState: createClosedHeatCapacityReleaseState(),
    lastUpdateMs: null,
    pressureSignalMvRaw: 0,
    pressureSignalMvDisplayed: pressureInitialBiasMv,
    pressureInitialBiasMv,
    temperatureSignalTargetMv: file.temperatureSignalTargetMv,
    pressureSignalTargetMv: pressureInitialBiasMv,
    displayResponseLastUpdateMs: null,
    pressureZeroDisplayedSamples: [],
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
    temperatureDisplayJitterOffset: 0,
    temperatureDisplayNextJitterAtMs: now,
    pressureZeroOffset: 0,
    pressureZeroAdjusted: false,
    pressureZeroed: false,
    pressureZeroKnobAngle: 0,
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureSignalRawReadoutMv: 0,
    pressureSignalReadoutMv: pressureInitialBiasMv,
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
    temperatureSignalMv: null,
    pressureSignalMv: null,
    pressureKPa: null,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '自动演示已启动',
    visualizationMode: file.visualizationMode,
    calculationModel: file.calculationModel,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
    vesselPressureReadoutKPa: file.ambientPressureKPa,
    vesselTemperatureReadoutK: file.ambientTemperatureK,
    recordedPressures: { p0: file.ambientPressureKPa, p1: null, p2: null },
    heatCapacityGuideTrial: null,
    heatCapacityExperimentSeed: experimentProfile.seed,
    heatCapacityExperimentProfile: experimentProfile,
    heatCapacityProcessSamples: {},
    updatedAt: now,
  };

  return resetFile;
};

export const prepareHeatCapacityAutoDemoStart = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
  createInitialBiasMv = () => HEAT_CAPACITY_AUTO_DEMO_INITIAL_PRESSURE_BIAS_MV,
): WorkbenchHeatCapacityState => {
  const resetFile = prepareHeatCapacityAutoDemoReset(file, now, createInitialBiasMv);
  const poweredFile = powerHeatCapacityWorkbenchFile(resetFile, true, now);
  return {
    ...poweredFile,
    heatCapacityTeachingStatus: 'running',
    runState: 'running',
    pressureZeroAdjusted: false,
    pressureZeroed: false,
    pumpHint: '自动演示已启动',
  };
};

interface HeatCapacityGuideRuntimeMergeOptions {
  immediatePressureDisplay?: boolean;
}

const HEAT_CAPACITY_GUIDE_SENSOR_COUPLED_MAX_STEP_S = 0.02;
const HEAT_CAPACITY_GUIDE_RELEASE_COUPLED_MAX_STEP_S = 0.005;

const stepHeatCapacityGuidePhysicsAndTemperatureSensor = (
  physicsState: HeatCapacityGuidePhysicsState,
  sensorState: HeatCapacityTemperatureSensorState,
  config: HeatCapacityGuidePhysicsConfig,
  controls: Omit<Parameters<typeof stepGuidePhysicsState>[2], 'dtS'>,
  dtS: number,
  options: { stopAtReleaseEquilibrium?: boolean } = {},
) => {
  let nextPhysicsState = physicsState;
  let nextSensorState = sensorState;
  let remainingS = Math.max(0, dtS);
  let advancedDtS = 0;
  while (remainingS > 1e-9) {
    const stepS = Math.min(
      remainingS,
      options.stopAtReleaseEquilibrium
        ? HEAT_CAPACITY_GUIDE_RELEASE_COUPLED_MAX_STEP_S
        : HEAT_CAPACITY_GUIDE_SENSOR_COUPLED_MAX_STEP_S,
    );
    nextPhysicsState = stepGuidePhysicsState(
      nextPhysicsState,
      config,
      {
        ...controls,
        dtS: stepS,
      },
    );
    nextSensorState = stepHeatCapacityTemperatureSensor(
      nextSensorState,
      {
        gasTemperatureK: nextPhysicsState.gasTemperatureK,
        dtS: stepS,
      },
    );
    remainingS = Math.max(0, remainingS - stepS);
    advancedDtS += stepS;
    if (
      options.stopAtReleaseEquilibrium &&
      nextPhysicsState.releaseReference?.reachedAmbientAtS !== null &&
      nextPhysicsState.releaseReference?.reachedAmbientAtS !== undefined
    ) {
      break;
    }
  }
  return {
    physicsState: nextPhysicsState,
    sensorState: nextSensorState,
    advancedDtS,
  };
};

export const mergeHeatCapacityGuideRuntimeState = (
  file: WorkbenchHeatCapacityState,
  guidePhysicsState: HeatCapacityGuidePhysicsState,
  guideWorkflow: HeatCapacityGuideWorkflowState,
  now: number,
  options: HeatCapacityGuideRuntimeMergeOptions = {},
): WorkbenchHeatCapacityState => {
  guidePhysicsState = synchronizeHeatCapacityPhysicsControlTiming(
    guidePhysicsState,
    file.pumpValveOpen,
    isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState),
  );
  let nextGuideWorkflow = guideWorkflow;
  const derived = deriveGuidePhysicalState(guidePhysicsState, file.heatCapacityGuidePhysicsConfig);
  const pressureDeltaKPa = derived.pressureDeltaKPa;
  const rawPressureMv = pressureDeltaKPa * file.pressureSensitivityMvPerKPa;
  const pressureSignalTargetMv = truncateHeatCapacitySignalMv(applyHeatCapacityPressureZero(
    rawPressureMv,
    file.pressureInitialBiasMv,
    file.pressureZeroOffset,
  ));
  const guideSensorTemperatureK = Number.isFinite(
    file.heatCapacityGuideTemperatureSensorState?.temperatureK,
  )
    ? file.heatCapacityGuideTemperatureSensorState.temperatureK
    : file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK;
  const temperatureSignalTargetMv = truncateHeatCapacitySignalMv(
    mapGasTemperatureToSignalMv(
      guideSensorTemperatureK,
      file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    ),
  );
  const powerOn = file.powerOn;
  const elapsedS = file.displayResponseLastUpdateMs === null
    ? 0
    : Math.max(0, (now - file.displayResponseLastUpdateMs) / 1000);
  const pressureDisplayValue = powerOn
    ? options.immediatePressureDisplay
      ? pressureSignalTargetMv
      : getHeatCapacityDisplayValue({
        current: file.pressureSignalMv,
        target: pressureSignalTargetMv,
        previousTarget: Number.isFinite(file.pressureSignalTargetMv)
          ? file.pressureSignalTargetMv
          : pressureSignalTargetMv,
        elapsedS,
        now,
        config: HEAT_CAPACITY_PRESSURE_DISPLAY_RESPONSE,
      })
    : null;
  const temperatureDisplayValue = powerOn ? temperatureSignalTargetMv : null;
  const pressureSignalMv = pressureDisplayValue === null
    ? null
    : truncateHeatCapacitySignalMv(pressureDisplayValue);
  const temperatureSignalMv = temperatureDisplayValue === null
    ? null
    : truncateHeatCapacitySignalMv(temperatureDisplayValue);
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    file.pressureZeroDisplayedSamples,
    now,
    pressureSignalMv,
    powerOn,
  );
  const pressureZeroed = isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples);
  if (nextGuideWorkflow.step === 'zeroRequired' && pressureZeroed && file.pressureZeroAdjusted) {
    nextGuideWorkflow = transitionHeatCapacityGuideWorkflow(nextGuideWorkflow, {
      action: 'adjustZero',
      powerOn: file.powerOn,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpValveOpen: file.pumpValveOpen,
      displayPressureMv: pressureSignalMv ?? pressureSignalTargetMv,
      pressureZeroReady: true,
      simulationTimeS: guidePhysicsState.simulationTimeS,
    });
  }
  const gaugeState = getHeatCapacityGaugePressureState(
    pressureDeltaKPa,
    file.powerOn,
    file,
    file.pressureGaugeDisplayValue,
  );
  return {
    ...file,
    heatCapacityGuidePhysicsState: guidePhysicsState,
    heatCapacityGuideWorkflow: nextGuideWorkflow,
    heatCapacityPhase: getHeatCapacityGuideRuntimePhase(
      file.powerOn,
      nextGuideWorkflow.step,
      file.heatCapacityReleaseState,
    ),
    gasPressureKPaAbs: derived.gasPressureKPa,
    gasTemperatureK: guidePhysicsState.gasTemperatureK,
    sensorTemperatureK: guideSensorTemperatureK,
    pressureDeltaKPa,
    simulationTimeS: guidePhysicsState.simulationTimeS,
    pressureSignalMvRaw: rawPressureMv,
    pressureSignalMvDisplayed: pressureSignalTargetMv,
    pressureSignalTargetMv,
    temperatureSignalTargetMv,
    displayResponseLastUpdateMs: now,
    pressureZeroDisplayedSamples,
    pressureZeroed,
    pressureSignalMv,
    temperatureSignalMv,
    pressureKPa: powerOn ? derived.gasPressureKPa : null,
    pressureGaugeTargetValue: gaugeState.pressureGaugeTargetValue,
    pressureGaugeDisplayValue: gaugeState.pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: gaugeState.pressureGaugeNeedleAngle,
    gaugePressureMinKPa: gaugeState.gaugePressureMinKPa,
    gaugePressureMaxKPa: gaugeState.gaugePressureMaxKPa,
    pressureWarningThresholdKPa: gaugeState.pressureWarningThresholdKPa,
    pressureSafeThresholdKPa: gaugeState.pressureSafeThresholdKPa,
    pressureSafetyThresholdKPa: gaugeState.pressureSafetyThresholdKPa,
    pressureSafetyStatus: gaugeState.pressureSafetyStatus,
    pressureSafetyMessage: gaugeState.pressureSafetyMessage,
    pressureBlockedPumping: gaugeState.pressureBlockedPumping,
    pressureOverLimit: gaugeState.pressureOverLimit,
    vesselPressureReadoutKPa: roundNumber(derived.gasPressureKPa, 2),
    pressureSignalReadoutMv: roundNumber(pressureSignalMv ?? pressureSignalTargetMv, 2),
    vesselTemperatureReadoutK: roundNumber(guidePhysicsState.gasTemperatureK, 3),
    updatedAt: now,
  };
};

const getHeatCapacityGuideRuntimePhase = (
  powerOn: boolean,
  step: HeatCapacityGuideWorkflowState['step'],
  releaseState: HeatCapacityReleaseState,
): HeatCapacityRuntimePhase => {
  if (!powerOn) return 'powerOff';
  if (releaseState.purpose === 'release') {
    if (releaseState.phase === 'opening') return 'sealedStabilizing';
    if (releaseState.phase === 'releasing') return 'releasing';
    if (releaseState.phase === 'closing' || releaseState.phase === 'closedAfterRelease') return 'recovering';
  }
  switch (step) {
    case 'powerRequired':
    case 'preheatRequired':
    case 'openStopcockForZeroRequired':
    case 'zeroRequired':
      return 'readyToZero';
    case 'recordU0Required':
    case 'closeStopcockBeforePumpRequired':
      return 'zeroed';
    case 'openPumpValveRequired':
      return 'readyToPump';
    case 'pumpRequired':
    case 'closePumpValveRequired':
      return 'pumping';
    case 'u1Waiting':
    case 'recordU1Required':
      return 'sealedStabilizing';
    case 'openStopcockForReleaseRequired':
    case 'closeStopcockAfterReleaseRequired':
      return 'releasing';
    case 'u2Waiting':
    case 'recordU2Required':
    case 'closePowerRequired':
      return 'recovering';
    case 'completed':
      return 'powerOff';
  }
};

const getHeatCapacityGuideActionContext = (
  file: WorkbenchHeatCapacityState,
  action: HeatCapacityGuideAction,
  overrides: Partial<ReturnType<typeof buildHeatCapacityGuideActionContextBase> &
    Pick<HeatCapacityGuideActionContext, 'wallClockMs'>> = {},
) => ({
  ...buildHeatCapacityGuideActionContextBase(file, action),
  ...overrides,
});

const buildHeatCapacityGuideActionContextBase = (
  file: WorkbenchHeatCapacityState,
  action: HeatCapacityGuideAction,
) => ({
  action,
  powerOn: file.powerOn,
  stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
  pumpValveOpen: file.pumpValveOpen,
  displayPressureMv: Number.isFinite(file.pressureSignalMv)
    ? file.pressureSignalMv ?? 0
    : truncateHeatCapacitySignalMv(file.pressureSignalMvDisplayed),
  pressureZeroReady: file.pressureZeroed,
  simulationTimeS: file.heatCapacityGuidePhysicsState.simulationTimeS,
  releaseFormed: file.heatCapacityReleaseState.formedRelease,
});

export const setHeatCapacityGuideStopcockOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  if (nextOpen && currentFile.heatCapacityReleaseState.phase === 'closing') return currentFile;
  const action: HeatCapacityGuideAction = nextOpen ? 'openStopcock' : 'closeStopcock';
  const atS = currentFile.heatCapacityGuidePhysicsState.simulationTimeS;
  const purpose: Exclude<HeatCapacityReleasePurpose, 'none'> =
    currentFile.heatCapacityGuideWorkflow.step === 'openStopcockForReleaseRequired'
      ? 'release'
      : 'zeroing';
  const releaseState = nextOpen
    ? beginHeatCapacityReleaseOpening(currentFile.heatCapacityReleaseState, purpose, atS)
    : beginHeatCapacityReleaseClosing(currentFile.heatCapacityReleaseState, atS);
  const guideTrial = currentFile.heatCapacityGuideTrial
    ? {
        ...currentFile.heatCapacityGuideTrial,
        eventLog: [
          ...currentFile.heatCapacityGuideTrial.eventLog,
          {
            atS,
            type: 'release' as const,
            message: nextOpen ? '打开玻璃旋塞' : '关闭玻璃旋塞',
            data: {
              attemptId: releaseState.attemptId,
              purpose: releaseState.purpose,
              phase: releaseState.phase,
              formedRelease: releaseState.formedRelease,
              quickToggle: releaseState.quickToggle,
              releaseDurationS: releaseState.releaseDurationS,
            },
          },
        ],
      }
    : null;
  const proposedFile = {
    ...currentFile,
    stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(nextOpen),
    glassPistonState: nextOpen ? 'open' as const : 'closed' as const,
    heatCapacityReleaseState: releaseState,
    heatCapacityGuideTrial: guideTrial,
  };
  const context = getHeatCapacityGuideActionContext(proposedFile, action, { wallClockMs: now });
  const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  const baseFile = guard.allowed ? proposedFile : currentFile;
  return mergeHeatCapacityGuideRuntimeState(
    baseFile,
    currentFile.heatCapacityGuidePhysicsState,
    workflow,
    now,
  );
};

export const setHeatCapacityGuidePumpValveOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const action: HeatCapacityGuideAction = nextOpen ? 'openPumpValve' : 'closePumpValve';
  const proposedFile = {
    ...currentFile,
    pumpValveOpen: nextOpen,
    pumpValveState: nextOpen ? 'open' as const : 'closed' as const,
    pumpHint: nextOpen ? '打气阀门已打开' : '打气阀门已关闭',
  };
  const context = getHeatCapacityGuideActionContext(proposedFile, action);
  const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  const baseFile = guard.allowed ? proposedFile : currentFile;
  return mergeHeatCapacityGuideRuntimeState(
    baseFile,
    currentFile.heatCapacityGuidePhysicsState,
    workflow,
    now,
  );
};

export const setHeatCapacityGuideEquilibriumSpeedMultiplier = (
  file: WorkbenchHeatCapacityState,
  multiplier: unknown,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
  return {
    ...file,
    heatCapacityGuideWorkflow: {
      ...file.heatCapacityGuideWorkflow,
      speedMultiplier: normalizeHeatCapacityGuideSpeedMultiplier(multiplier),
    },
    lastUpdateMs: file.powerOn ? now : file.lastUpdateMs,
    updatedAt: now,
  };
};

export type HeatCapacityGuideWorkbenchRecordKind = 'u0' | 'u1' | 'u2';

export interface HeatCapacityGuideRecordButtonState {
  visible: boolean;
  disabledReason: string | null;
}

export const getHeatCapacityGuideRecordButtonState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityGuideWorkbenchRecordKind,
): HeatCapacityGuideRecordButtonState => {
  const step = file.heatCapacityGuideWorkflow.step;
  const visible = (
    (kind === 'u0' && step === 'recordU0Required') ||
    (kind === 'u1' && step === 'recordU1Required') ||
    (kind === 'u2' && step === 'recordU2Required')
  );
  return {
    visible,
    disabledReason: visible ? null : 'guide-step-not-ready',
  };
};

export type HeatCapacityGuideWorkbenchRecordAttempt =
  | {
      accepted: true;
      reason: 'accepted';
      kind: HeatCapacityGuideWorkbenchRecordKind;
      file: WorkbenchHeatCapacityState;
    }
  | {
      accepted: false;
      reason: string;
      kind: HeatCapacityGuideWorkbenchRecordKind;
      file: WorkbenchHeatCapacityState;
    };

export const applyHeatCapacityGuideRecordWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  kind: HeatCapacityGuideWorkbenchRecordKind,
  now = Date.now(),
): HeatCapacityGuideWorkbenchRecordAttempt => {
  if (file.heatCapacityMode !== 'guide' || !file.heatCapacityGuideTrial) {
    return { accepted: false, reason: 'not-guide', kind, file };
  }
  const action: HeatCapacityGuideAction = kind === 'u0'
    ? 'recordU0'
    : kind === 'u1'
      ? 'recordU1'
      : 'recordU2';
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const context = getHeatCapacityGuideActionContext(currentFile, action);
  const guard = getHeatCapacityGuideActionGuard(currentFile.heatCapacityGuideWorkflow, context);
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  if (!guard.allowed) {
    return {
      accepted: false,
      reason: guard.message,
      kind,
      file: mergeHeatCapacityGuideRuntimeState(
        currentFile,
        currentFile.heatCapacityGuidePhysicsState,
        workflow,
        now,
      ),
    };
  }
  const activeDisplay = selectActiveHeatCapacityWorkbenchDisplay(currentFile);
  const recordInput = {
    atS: currentFile.heatCapacityGuidePhysicsState.simulationTimeS,
    displayPressureMv: activeDisplay.pressureMv,
    displayTemperatureMv: activeDisplay.temperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'guide-zero',
  };
  const trial = kind === 'u0'
    ? recordGuideU0(currentFile.heatCapacityGuideTrial, recordInput)
    : kind === 'u1'
      ? recordGuideU1(currentFile.heatCapacityGuideTrial, recordInput)
      : recordGuideU2(currentFile.heatCapacityGuideTrial, recordInput, now, {
          atmosphericPressureKPa: currentFile.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa,
          pressureSensitivityMvPerKPa: currentFile.pressureSensitivityMvPerKPa,
        });
  return {
    accepted: true,
    reason: 'accepted',
    kind,
    file: mergeHeatCapacityGuideRuntimeState(
      {
        ...currentFile,
        heatCapacityGuideTrial: trial,
        recordedPressures: {
          ...currentFile.recordedPressures,
          ...(kind === 'u0' ? { p0: currentFile.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa } : {}),
          ...(kind === 'u1' ? { p1: activeDisplay.pressureMv } : {}),
          ...(kind === 'u2' ? { p2: activeDisplay.pressureMv } : {}),
        },
      },
      currentFile.heatCapacityGuidePhysicsState,
      workflow,
      now,
    ),
  };
};

export const stepHeatCapacityGuideWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const dtS = file.lastUpdateMs === null ? 0 : Math.max(0, (now - file.lastUpdateMs) / 1000);
  let guidePhysicsState = file.heatCapacityGuidePhysicsState;
  let guideTemperatureSensorState = file.heatCapacityGuideTemperatureSensorState ??
    createHeatCapacityTemperatureSensorState(
      file.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK,
    );
  let guideWorkflow = file.heatCapacityGuideWorkflow;
  let releaseState = advanceHeatCapacityReleaseState(
    file.heatCapacityReleaseState,
    guidePhysicsState.simulationTimeS,
  ).state;

  if (guideWorkflow.paused) {
    const releaseCloseReady = guideWorkflow.step === 'closeStopcockAfterReleaseRequired' &&
      guideWorkflow.releaseCloseResumeAtMs !== null &&
      now >= guideWorkflow.releaseCloseResumeAtMs;
    if (releaseCloseReady) {
      if (releaseState.phase === 'closing') {
        releaseState = {
          ...releaseState,
          phase: releaseState.formedRelease ? 'closedAfterRelease' : 'closed',
          phaseStartedAtS: guidePhysicsState.simulationTimeS,
          closingCompletedAtS: guidePhysicsState.simulationTimeS,
        };
      }
      guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
        action: 'releaseCloseAnimationComplete',
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: false,
        displayPressureMv: file.pressureSignalMvDisplayed,
        simulationTimeS: guidePhysicsState.simulationTimeS,
        wallClockMs: now,
      });
    }
    const pausedFile = mergeHeatCapacityGuideRuntimeState(
      {
        ...file,
        heatCapacityReleaseState: releaseState,
        heatCapacityGuideTemperatureSensorState: guideTemperatureSensorState,
      },
      guidePhysicsState,
      guideWorkflow,
      now,
    );
    return {
      ...pausedFile,
      lastUpdateMs: now,
    };
  }

  if (dtS > 0) {
    const isWaitingStep = guideWorkflow.step === 'u1Waiting' || guideWorkflow.step === 'u2Waiting';
    const speed = isWaitingStep ? guideWorkflow.speedMultiplier : 1;
    const targetWaitEndS = isWaitingStep && guideWorkflow.waitStartedAtS !== null
      ? guideWorkflow.waitStartedAtS + HEAT_CAPACITY_GUIDE_WAIT_TARGET_S
      : null;
    const requestedDtS = dtS * speed;
    const boundedDtS = targetWaitEndS === null
      ? requestedDtS
      : Math.max(0, Math.min(requestedDtS, targetWaitEndS - guidePhysicsState.simulationTimeS));
    let remainingDtS = boundedDtS;
    let transitionGuard = 0;
    while (remainingDtS > 1e-9 && transitionGuard < 4) {
      transitionGuard += 1;
      const segmentStartS = guidePhysicsState.simulationTimeS;
      const transitionAtS = getHeatCapacityReleaseNextTransitionAtS(releaseState);
      const segmentDtS = transitionAtS !== null && transitionAtS > segmentStartS + 1e-9
        ? Math.min(remainingDtS, transitionAtS - segmentStartS)
        : transitionAtS !== null
          ? 0
          : remainingDtS;
      if (segmentDtS > 0) {
        const stopAtReleaseEquilibrium = guideWorkflow.step === 'openStopcockForReleaseRequired' &&
          releaseState.phase === 'releasing' &&
          releaseState.purpose === 'release';
        const coupledStep = stepHeatCapacityGuidePhysicsAndTemperatureSensor(
          guidePhysicsState,
          guideTemperatureSensorState,
          file.heatCapacityGuidePhysicsConfig,
          {
            powerOn: file.powerOn,
            pumpValveOpen: file.pumpValveOpen,
            stopcockOpen: isHeatCapacityReleaseFlowOpen(releaseState),
            stopcockFlowPurpose: releaseState.purpose,
          },
          segmentDtS,
          { stopAtReleaseEquilibrium },
        );
        guidePhysicsState = coupledStep.physicsState;
        guideTemperatureSensorState = coupledStep.sensorState;
        remainingDtS = Math.max(0, remainingDtS - coupledStep.advancedDtS);
        const reachedAmbientAtS = guidePhysicsState.releaseReference?.reachedAmbientAtS;
        if (
          stopAtReleaseEquilibrium &&
          reachedAmbientAtS !== null &&
          reachedAmbientAtS !== undefined
        ) {
          releaseState = {
            ...releaseState,
            releaseDurationS: releaseState.openingCompletedAtS === null
              ? 0
              : Math.max(0, reachedAmbientAtS - releaseState.openingCompletedAtS),
          };
          guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
            action: 'releaseComplete',
            powerOn: file.powerOn,
            pumpValveOpen: file.pumpValveOpen,
            stopcockOpen: true,
            displayPressureMv: file.pressureSignalMvDisplayed,
            simulationTimeS: guidePhysicsState.simulationTimeS,
            wallClockMs: now,
          });
          remainingDtS = 0;
          break;
        }
      }
      const transition = advanceHeatCapacityReleaseState(
        releaseState,
        guidePhysicsState.simulationTimeS,
      );
      if (transition.transitions.length === 0) {
        if (segmentDtS <= 0) break;
        continue;
      }
      releaseState = transition.state;
      if (transition.transitions.some((releaseTransition) => (
        releaseTransition.type === 'opening-complete'
      ))) {
        // Materialize the exact flow-open edge before the runtime merge
        // synchronizes persisted valve timing. Otherwise the guide engine sees
        // an already-open valve and never creates its release reference.
        guidePhysicsState = stepGuidePhysicsState(
          guidePhysicsState,
          file.heatCapacityGuidePhysicsConfig,
          {
            powerOn: file.powerOn,
            pumpValveOpen: file.pumpValveOpen,
            stopcockOpen: isHeatCapacityReleaseFlowOpen(releaseState),
            stopcockFlowPurpose: releaseState.purpose,
            dtS: 0,
          },
        );
      }
    }
    if (releaseState.phase === 'releasing') {
      releaseState = {
        ...releaseState,
        releaseDurationS: getHeatCapacityReleaseDurationS(
          releaseState,
          guidePhysicsState.simulationTimeS,
        ),
      };
    }
    const timer = deriveHeatCapacityGuideExperimentTimer(guideWorkflow, guidePhysicsState.simulationTimeS);
    if (timer.complete && (guideWorkflow.step === 'u1Waiting' || guideWorkflow.step === 'u2Waiting')) {
      guideWorkflow = transitionHeatCapacityGuideWorkflow(guideWorkflow, {
        action: 'timerComplete',
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
        displayPressureMv: file.pressureSignalMvDisplayed,
        simulationTimeS: guidePhysicsState.simulationTimeS,
      });
    }
  }

  let mergedFile = mergeHeatCapacityGuideRuntimeState(
    {
      ...file,
      heatCapacityReleaseState: releaseState,
      heatCapacityGuideTemperatureSensorState: guideTemperatureSensorState,
    },
    guidePhysicsState,
    guideWorkflow,
    now,
  );
  if (
    mergedFile.heatCapacityGuideWorkflow.step === 'pumpRequired' &&
    (mergedFile.pressureSignalMv ?? Number.NEGATIVE_INFINITY) >= HEAT_CAPACITY_GUIDE_PUMP_TARGET_MV
  ) {
    const pumpTargetWorkflow = transitionHeatCapacityGuideWorkflow(
      mergedFile.heatCapacityGuideWorkflow,
      getHeatCapacityGuideActionContext(mergedFile, 'pressPumpBulb', {
        displayPressureMv: mergedFile.pressureSignalMv ?? mergedFile.pressureSignalTargetMv,
      }),
    );
    if (pumpTargetWorkflow.step !== mergedFile.heatCapacityGuideWorkflow.step) {
      mergedFile = mergeHeatCapacityGuideRuntimeState(
        {
          ...mergedFile,
          pumpHint: '已达到打气标准，请关闭打气阀门。',
        },
        mergedFile.heatCapacityGuidePhysicsState,
        pumpTargetWorkflow,
        now,
      );
    }
  }

  return {
    ...mergedFile,
    lastUpdateMs: now,
  };
};

export const stepHeatCapacityWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'free') {
    const scheme = file.heatCapacityFreeParameterScheme;
    const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
    const nextFile = stepHeatCapacityFreeWorkbenchFile(hydratedFile, now);
    return storeActiveHeatCapacityFreeDomainRuntimeFields(nextFile, scheme);
  }
  if (file.heatCapacityMode === 'guide') {
    return stepHeatCapacityGuideWorkbenchFile(file, now);
  }
  let runtime = getHeatCapacityRuntimeStateFromFile(file);
  let releaseState = advanceHeatCapacityReleaseState(
    file.heatCapacityReleaseState,
    runtime.simulationTimeS,
  ).state;
  let remainingDtS = runtime.lastUpdateMs === null
    ? 0
    : Math.max(0, (now - runtime.lastUpdateMs) / 1000);
  let transitionGuard = 0;
  while (remainingDtS > 1e-9 && transitionGuard < 4) {
    transitionGuard += 1;
    const stateTransitionAtS = getHeatCapacityReleaseNextTransitionAtS(releaseState);
    const autoDemoCloseAtS = file.heatCapacityMode === 'demo' &&
      releaseState.phase === 'releasing' &&
      releaseState.openingCompletedAtS !== null
      ? releaseState.openingCompletedAtS + HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS
      : null;
    const transitionAtS = stateTransitionAtS === null
      ? autoDemoCloseAtS
      : autoDemoCloseAtS === null
        ? stateTransitionAtS
        : Math.min(stateTransitionAtS, autoDemoCloseAtS);
    const segmentDtS = transitionAtS !== null && transitionAtS > runtime.simulationTimeS + 1e-9
      ? Math.min(remainingDtS, transitionAtS - runtime.simulationTimeS)
      : transitionAtS !== null
        ? 0
        : remainingDtS;
    if (segmentDtS > 0) {
      runtime = stepHeatCapacityExperiment(
        runtime,
        {
          powerOn: file.powerOn,
          pumpValveOpen: file.pumpValveOpen,
          stopcockOpen: isHeatCapacityReleaseFlowOpen(releaseState),
          pumpFrequency: file.pumpFrequency,
          pumpFrequencyStatus: file.pumpFrequencyStatus,
        },
        segmentDtS,
        now,
      );
      remainingDtS = Math.max(0, remainingDtS - segmentDtS);
    }
    if (autoDemoCloseAtS !== null && runtime.simulationTimeS >= autoDemoCloseAtS - 1e-9) {
      releaseState = beginHeatCapacityReleaseClosing(releaseState, autoDemoCloseAtS);
      continue;
    }
    const transition = advanceHeatCapacityReleaseState(releaseState, runtime.simulationTimeS);
    if (transition.transitions.length === 0) {
      if (segmentDtS <= 0) break;
      continue;
    }
    releaseState = transition.state;
  }
  if (releaseState.phase === 'releasing') {
    releaseState = {
      ...releaseState,
      releaseDurationS: getHeatCapacityReleaseDurationS(releaseState, runtime.simulationTimeS),
    };
  }
  const releaseCommandedClosed = releaseState.purpose === 'release' && (
    releaseState.phase === 'closing' || releaseState.phase === 'closedAfterRelease'
  );
  return mergeHeatCapacityRuntimeState({
    ...file,
    heatCapacityReleaseState: releaseState,
    ...(releaseCommandedClosed
      ? {
          stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
          glassPistonState: 'closed' as const,
        }
      : {}),
  }, runtime, now);
};

export const setHeatCapacityScriptedStopcockOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'demo' && file.heatCapacityMode !== null) return file;
  const currentFile = stepHeatCapacityWorkbenchFile(file, now);
  const atS = currentFile.simulationTimeS;
  const purpose: Exclude<HeatCapacityReleasePurpose, 'none'> =
    currentFile.heatCapacityProcessSamples.stableBeforeReleaseSample
      ? 'release'
      : 'zeroing';
  const releaseState = nextOpen
    ? beginHeatCapacityReleaseOpening(currentFile.heatCapacityReleaseState, purpose, atS)
    : beginHeatCapacityReleaseClosing(currentFile.heatCapacityReleaseState, atS);
  return {
    ...currentFile,
    stopcockAngleDeg: getHeatCapacityStopcockTargetAngle(nextOpen),
    glassPistonState: nextOpen ? 'open' : 'closed',
    heatCapacityReleaseState: releaseState,
    updatedAt: now,
  };
};

export const setHeatCapacityScriptedPumpValveOpen = (
  file: WorkbenchHeatCapacityState,
  nextOpen: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'demo') return file;
  const currentFile = stepHeatCapacityWorkbenchFile(file, now);
  return {
    ...currentFile,
    pumpValveOpen: nextOpen,
    pumpValveState: nextOpen ? 'open' : 'closed',
    updatedAt: now,
  };
};

export const shouldCommitHeatCapacityRealtimeTick = (
  previousFile: WorkbenchHeatCapacityState,
  nextFile: WorkbenchHeatCapacityState,
) => (
  nextFile.pumpFrequency !== previousFile.pumpFrequency ||
  nextFile.pumpFrequencyStatus !== previousFile.pumpFrequencyStatus ||
  nextFile.pumpBulbState !== previousFile.pumpBulbState ||
  nextFile.pumpHint !== previousFile.pumpHint ||
  nextFile.pumpStrokeTimestamps.length !== previousFile.pumpStrokeTimestamps.length ||
  nextFile.simulationTimeS !== previousFile.simulationTimeS ||
  nextFile.pressureSignalMv !== previousFile.pressureSignalMv ||
  nextFile.temperatureSignalMv !== previousFile.temperatureSignalMv ||
  nextFile.heatCapacityPhase !== previousFile.heatCapacityPhase ||
  nextFile.heatCapacityReleaseState !== previousFile.heatCapacityReleaseState ||
  (
    previousFile.heatCapacityMode === 'guide' &&
    nextFile.heatCapacityMode === 'guide' &&
    nextFile.heatCapacityGuideWorkflow !== previousFile.heatCapacityGuideWorkflow
  )
);

const applyHeatCapacityProfileToProcessSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
): WorkbenchHeatCapacityState => {
  const profile = normalizeHeatCapacityTeachingProfile(file.heatCapacityExperimentProfile);
  if (!profile) return file;
  const sample = file.heatCapacityProcessSamples[key];
  if (!sample) return file;
  const ambientTemperatureMv = profile.ambientTemperatureMv ?? profile.initialTemperatureMv;

  const overrides = key === 'zeroedSample'
    ? {
        pressureSignalMv: profile.u0MeasuredMv,
        temperatureSignalMv: ambientTemperatureMv,
      }
    : key === 'stableBeforeReleaseSample' || key === 'beforeReleaseSample' || key === 'pumpPeakSample'
      ? {
          pressureSignalMv: key === 'pumpPeakSample' ? profile.pumpPeakPressureMv : profile.u1MeasuredMv,
          temperatureSignalMv: key === 'pumpPeakSample' ? sample.temperatureSignalMv : ambientTemperatureMv,
        }
      : key === 'releaseLowSample' || key === 'afterReleaseSample'
        ? {
            pressureSignalMv: 0,
            temperatureSignalMv: profile.releaseTemperatureLowMv,
          }
        : key === 'recoverySample'
          ? {
              pressureSignalMv: profile.u2MeasuredMv,
              temperatureSignalMv: profile.recoveryTemperatureMv,
            }
          : null;

  if (!overrides) return file;

  return {
    ...file,
    heatCapacityProcessSamples: {
      ...file.heatCapacityProcessSamples,
      [key]: {
        ...sample,
        pressureSignalMv: truncateHeatCapacitySignalMv(overrides.pressureSignalMv),
        temperatureSignalMv: truncateHeatCapacitySignalMv(overrides.temperatureSignalMv),
      },
    },
  };
};

const captureHeatCapacityPhysicalKernelProcessSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const display = getFreeSensorDisplay(
    file.heatCapacityFreeInstrumentState.sensor,
    file.heatCapacityFreeInstrumentState.calibration,
    getEffectiveHeatCapacityFreeSensorConfig(
      file.heatCapacityFreeInstrumentConfig.sensor,
      file.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
    ),
  );
  const derived = deriveFreePhysicalState(file.heatCapacityFreeInstrumentState.physics, file.heatCapacityFreeInstrumentConfig.physics);
  const point: HeatCapacityProcessSamplePoint = {
    timeS: roundNumber(file.heatCapacityFreeInstrumentState.physics.simulationTimeS, 3),
    phase: file.heatCapacityPhase,
    temperatureSignalMv: roundNumber(truncateHeatCapacitySignalMv(display.displayTemperatureMv), 3),
    pressureSignalMv: roundNumber(truncateHeatCapacitySignalMv(display.displayPressureMv), 3),
    gasTemperatureK: roundNumber(file.heatCapacityFreeInstrumentState.physics.gasTemperatureK, 3),
    gasPressureKPaAbs: roundNumber(derived.gasPressureKPa, 3),
    pressureDeltaKPa: roundNumber(derived.pressureDeltaKPa, 3),
    pumpFrequency: roundNumber(file.pumpFrequency, 3),
    pumpValveOpen: file.pumpValveOpen,
    stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
  };
  return {
    ...file,
    heatCapacityProcessSamples: {
      ...file.heatCapacityProcessSamples,
      [key]: point,
    },
    updatedAt: now,
  };
};

export const captureHeatCapacityWorkbenchSample = (
  file: WorkbenchHeatCapacityState,
  key: HeatCapacityProcessSampleKey,
  now = Date.now(),
  options: { applyProfile?: boolean } = {},
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    return captureHeatCapacityPhysicalKernelProcessSample(file, key, now);
  }
  const currentFile = stepHeatCapacityWorkbenchFile(file, now);
  const sampledFile = mergeHeatCapacityRuntimeState(
    currentFile,
    {
      ...captureHeatCapacityProcessSample(getHeatCapacityRuntimeStateFromFile(currentFile), key, {
        pumpFrequency: currentFile.pumpFrequency,
        pumpValveOpen: currentFile.pumpValveOpen,
        stopcockOpen: isHeatCapacityReleaseFlowOpen(currentFile.heatCapacityReleaseState),
      }),
      lastUpdateMs: now,
    },
    now,
  );
  return options.applyProfile === false
    ? sampledFile
    : applyHeatCapacityProfileToProcessSample(sampledFile, key);
};

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

export const isHeatCapacityFreePreheatRequired = (
  file: Pick<
    WorkbenchHeatCapacityState,
    'heatCapacityMode' | 'powerOn' | 'heatCapacityFreePreheatCompleted' | 'heatCapacityFreeRunWorkspace'
  >,
) => (
  file.heatCapacityMode === 'free' &&
  file.powerOn &&
  !file.heatCapacityFreePreheatCompleted &&
  file.heatCapacityFreeRunWorkspace.activeAttempt?.preheatOutcome !== 'omitted'
);

export const completeHeatCapacityFreePreheatWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free' && file.powerOn && !file.heatCapacityFreePreheatCompleted
    ? {
        ...file,
        heatCapacityFreePreheatCompleted: true,
        updatedAt: now,
        lastOpenedAt: now,
      }
    : file
);

export const completeHeatCapacityGuidePreheatWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide' || file.heatCapacityGuideWorkflow.step !== 'preheatRequired') {
    return file;
  }
  const currentFile = stepHeatCapacityGuideWorkbenchFile(file, now);
  const context = getHeatCapacityGuideActionContext(currentFile, 'preheatComplete');
  const workflow = transitionHeatCapacityGuideWorkflow(currentFile.heatCapacityGuideWorkflow, context);
  return mergeHeatCapacityGuideRuntimeState(
    currentFile,
    currentFile.heatCapacityGuidePhysicsState,
    workflow,
    now,
  );
};

export const startHeatCapacityGuideWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  const guideConfig = guideRuntimeFields.heatCapacityGuidePhysicsConfig;
  const pressureInitialBiasMv = createHeatCapacityGuidePressureInitialBiasMv(`guide-${file.id}-${now}`);
  return {
    ...file,
    ...guideRuntimeFields,
    heatCapacityMode: 'guide',
    heatCapacityTeachingStatus: 'running',
    heatCapacityGuideTrial: createHeatCapacityGuideTrial('guide-trial-1'),
    powerOn: false,
    runState: 'idle',
    heatCapacityPhase: 'powerOff',
    glassPistonState: 'closed',
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    gasPressureKPaAbs: guideConfig.environment.ambientPressureKPa,
    gasTemperatureK: guideConfig.environment.ambientTemperatureK,
    sensorTemperatureK: guideConfig.environment.ambientTemperatureK,
    pressureDeltaKPa: 0,
    simulationTimeS: 0,
    heatCapacityReleaseState: createClosedHeatCapacityReleaseState(),
    lastUpdateMs: null,
    pressureSignalMvRaw: 0,
    pressureSignalMvDisplayed: pressureInitialBiasMv,
    pressureInitialBiasMv,
    pressureSignalTargetMv: pressureInitialBiasMv,
    temperatureSignalTargetMv: DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
    displayResponseLastUpdateMs: null,
    pressureZeroDisplayedSamples: [],
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureSignalRawReadoutMv: 0,
    pressureSignalReadoutMv: pressureInitialBiasMv,
    pressureSafetyStatus: 'normal',
    pressureSafetyMessage: null,
    pressureBlockedPumping: false,
    pressureOverLimit: false,
    temperatureSignalMv: null,
    pressureSignalMv: null,
    pressureKPa: null,
    pressureLimitKPa: guideConfig.pumpPressureLimitKPa,
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '未打气',
    recordedPressures: { p0: guideConfig.environment.ambientPressureKPa, p1: null, p2: null },
    heatCapacityExperimentSeed: null,
    heatCapacityExperimentProfile: null,
    heatCapacityProcessSamples: {},
    theoreticalGamma: guideConfig.gamma,
    updatedAt: now,
  };
};

export const abortHeatCapacityGuideWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const resetGuideFile = {
    ...file,
    ...createDefaultHeatCapacityGuideRuntimeFields(),
  };
  return resetHeatCapacityFreeRunWorkbenchState(resetGuideFile, now);
};

export const enterHeatCapacityFreeModeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const resetFile = resetHeatCapacityFreeRunWorkbenchState(file, now);
  return recordHeatCapacityFreeTraceEvent(resetFile, 'enter-free-mode', now);
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
