import {
  beginHeatCapacityReleaseClosing,
  beginHeatCapacityReleaseOpening,
  type HeatCapacityReleasePurpose,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  applyGuidePumpStroke,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  getHeatCapacityGuideActionGuard,
  transitionHeatCapacityGuideWorkflow,
  type HeatCapacityGuideAction,
} from '../../domain/heatCapacity/heatCapacityGuideWorkflowModel.ts';
import {
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import {
  normalizeHeatCapacityGuideSpeedMultiplier,
} from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import {
  applyHeatCapacityPressureZero,
  getHeatCapacityPressureZeroDisplayText,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityStopcockState,
  getHeatCapacityStopcockTargetAngle,
  isHeatCapacityPressureZeroWithinTolerance,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  selectActiveHeatCapacityWorkbenchDisplay,
} from './workbenchHeatCapacityDisplayState.ts';
import {
  getHeatCapacityGuideActionContext,
  mergeHeatCapacityGuideRuntimeState,
} from './workbenchHeatCapacityGuideRuntimeState.ts';
import {
  stepHeatCapacityGuideWorkbenchFile,
} from './workbenchHeatCapacityGuideRuntimeCoordinator.ts';
import type {
  WorkbenchHeatCapacityPressureZeroAdjustMode,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';
import { truncateHeatCapacitySignalMv } from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';

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

export const setHeatCapacityGuidePressureZeroOffsetCore = (
  file: WorkbenchHeatCapacityState,
  pressureZeroOffset: number,
  pressureZeroAdjusted: boolean,
  pressureZeroKnobAngle: number,
  adjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
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
};

export const registerHeatCapacityGuidePumpStrokeCore = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
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
};

export const powerHeatCapacityGuideWorkbenchFileCore = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'guide') return file;
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
  return mergedGuideFile;
};
