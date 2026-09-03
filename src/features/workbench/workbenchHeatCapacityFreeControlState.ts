import { applyFreePumpStroke } from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import { applyFreeZeroCalibration } from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import { setHeatCapacityFreeAttemptPower } from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import { startHeatCapacityFreeBatchCalculationWorkbenchState } from './workbenchHeatCapacityCalculationCoordinator.ts';
import {
  freezeHeatCapacityFreeParametersForCurrentGroup,
  isHeatCapacityFreeExperimentGroupComplete,
} from './workbenchHeatCapacityFreeParameterState.ts';
import {
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureZeroDisplayText,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityStopcockState,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  startHeatCapacityFreeWorkbenchAttempt,
  transitionHeatCapacityFreeWorkbenchAttempt,
} from './workbenchHeatCapacityFreeAttemptState.ts';
import { captureHeatCapacityFreeRollbackSnapshot } from './workbenchHeatCapacityFreeRollbackState.ts';
import { stepHeatCapacityFreeWorkbenchFile } from './workbenchHeatCapacityFreeRuntimeCoordinator.ts';
import { mergeHeatCapacityFreeRuntimeState } from './workbenchHeatCapacityFreeRuntimeState.ts';
import {
  finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState,
  recordHeatCapacityFreeSafetyTransitionEvents,
  recordHeatCapacityFreeTraceEvent,
} from './workbenchHeatCapacityFreeTraceState.ts';
import type {
  WorkbenchHeatCapacityPressureZeroAdjustMode,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

export const setHeatCapacityFreePressureZeroOffsetCore = (
  file: WorkbenchHeatCapacityState,
  pressureZeroOffset: number,
  pressureZeroAdjusted: boolean,
  pressureZeroKnobAngle: number,
  adjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode,
  now: number,
): WorkbenchHeatCapacityState => {
  const sourceFile = stepHeatCapacityFreeWorkbenchFile(file, now);
  const previousZeroOffset = sourceFile.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv;
  const calibrationState = applyFreeZeroCalibration(
    sourceFile.heatCapacityFreeInstrumentState.calibration,
    {
      atS: sourceFile.heatCapacityFreeInstrumentState.physics.simulationTimeS,
      displayPressureMv: sourceFile.heatCapacityFreeInstrumentState.sensor.displayPressureMv,
      displayTemperatureMv: sourceFile.heatCapacityFreeInstrumentState.sensor.displayTemperatureMv,
      zeroOffsetMv: pressureZeroOffset,
      source: 'user',
    },
  );
  const mergedFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...sourceFile,
      pressureZeroAdjusted,
      pressureZeroed: false,
      pressureZeroKnobAngle,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(
        pressureZeroAdjusted,
        pressureZeroOffset,
      ),
      pressureZeroAdjustMode: adjustMode,
      pressureZeroDisplayedSamples: pressureZeroOffset === previousZeroOffset
        ? sourceFile.pressureZeroDisplayedSamples
        : [],
    },
    sourceFile.heatCapacityFreeInstrumentState.physics,
    sourceFile.heatCapacityFreeInstrumentState.sensor,
    calibrationState,
    now,
  );
  const latestZeroEvent = mergedFile.heatCapacityFreeInstrumentState.calibration.zeroEvents[
    mergedFile.heatCapacityFreeInstrumentState.calibration.zeroEvents.length - 1
  ] ?? null;
  const attemptedFile = transitionHeatCapacityFreeWorkbenchAttempt(mergedFile, 'zero-adjusted', now);
  return recordHeatCapacityFreeTraceEvent(attemptedFile, 'zero-calibration', now, {
    zeroEventId: latestZeroEvent?.id ?? null,
    zeroOffsetMv: latestZeroEvent?.zeroOffsetMv ?? pressureZeroOffset,
  });
};

export const powerHeatCapacityFreeWorkbenchFileCore = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (
    nextPowerOn &&
    !file.powerOn &&
    file.heatCapacityFreeRunWorkspace.batch.targetGroupCount === null
  ) return file;
  const sourceFile = nextPowerOn && !file.powerOn
    ? freezeHeatCapacityFreeParametersForCurrentGroup(file, now)
    : file;
  const pressureZeroOffset = sourceFile.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv;
  const pressureZeroAdjusted = sourceFile.pressureZeroAdjusted || Math.abs(pressureZeroOffset) > 0.0001;
  const poweredFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...sourceFile,
      powerOn: nextPowerOn,
      runState: nextPowerOn ? sourceFile.runState : 'idle',
      pressureZeroed: nextPowerOn ? sourceFile.pressureZeroed : false,
      pressureZeroAdjusted,
      pressureZeroKnobAngle: sourceFile.pressureZeroKnobAngle,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(
        pressureZeroAdjusted,
        pressureZeroOffset,
      ),
      pressureZeroAdjustMode: nextPowerOn ? sourceFile.pressureZeroAdjustMode : 'none',
    },
    sourceFile.heatCapacityFreeInstrumentState.physics,
    sourceFile.heatCapacityFreeInstrumentState.sensor,
    sourceFile.heatCapacityFreeInstrumentState.calibration,
    now,
  );
  const poweredFileWithSnapshot = nextPowerOn
    ? {
        ...poweredFile,
        heatCapacityFreeRollbackSnapshots: {
          ...poweredFile.heatCapacityFreeRollbackSnapshots,
          afterPowerOn: captureHeatCapacityFreeRollbackSnapshot(poweredFile),
          beforePump: null,
          beforeRelease: null,
        },
      }
    : poweredFile;
  const tracedFile = recordHeatCapacityFreeTraceEvent(
    recordHeatCapacityFreeSafetyTransitionEvents(sourceFile, poweredFileWithSnapshot, now),
    nextPowerOn ? 'power-on' : 'power-off',
    now,
  );
  const attempt = tracedFile.heatCapacityFreeRunWorkspace.activeAttempt;
  const fileWithAttemptPower = attempt === null
    ? tracedFile
    : {
        ...tracedFile,
        heatCapacityFreeRunWorkspace: {
          ...tracedFile.heatCapacityFreeRunWorkspace,
          activeAttempt: setHeatCapacityFreeAttemptPower(attempt, {
            powerOn: nextPowerOn,
            atS: tracedFile.heatCapacityFreeInstrumentState.physics.simulationTimeS,
            wallClockMs: now,
          }),
        },
      };
  if (!nextPowerOn && isHeatCapacityFreeExperimentGroupComplete(fileWithAttemptPower)) {
    const finalizedFile = finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState(
      fileWithAttemptPower,
      now,
    );
    return startHeatCapacityFreeBatchCalculationWorkbenchState(finalizedFile, now);
  }
  return fileWithAttemptPower;
};

export const registerHeatCapacityFreePumpStrokeCore = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const currentFile = stepHeatCapacityFreeWorkbenchFile(file, now);
  // Parameter drafts become immutable only when a stroke is physically
  // accepted. Rejected bulb presses must not start or freeze an experiment.
  const pumpCandidateFile = currentFile.heatCapacityFreeRunWorkspace.activeAttempt?.status !== 'invalid'
    ? freezeHeatCapacityFreeParametersForCurrentGroup(currentFile)
    : currentFile;
  const currentGaugePressureState = getHeatCapacityGaugePressureState(
    pumpCandidateFile.pressureDeltaKPa,
    pumpCandidateFile.powerOn,
    pumpCandidateFile,
  );
  if (
    getHeatCapacityStopcockState(currentFile.stopcockAngleDeg) !== 'open' &&
    currentGaugePressureState.pressureBlockedPumping
  ) {
    return {
      ...currentFile,
      pressureGaugeTargetValue: currentGaugePressureState.pressureGaugeTargetValue,
      pressureWarningThresholdKPa: currentGaugePressureState.pressureWarningThresholdKPa,
      pressureSafeThresholdKPa: currentGaugePressureState.pressureSafeThresholdKPa,
      pressureSafetyThresholdKPa: currentGaugePressureState.pressureSafetyThresholdKPa,
      pressureSafetyStatus: currentGaugePressureState.pressureSafetyStatus,
      pressureSafetyMessage: currentGaugePressureState.pressureSafetyMessage,
      pressureBlockedPumping: currentGaugePressureState.pressureBlockedPumping,
      pressureOverLimit: currentGaugePressureState.pressureOverLimit,
      pumpHint: '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。',
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }
  const frequencyState = getHeatCapacityPumpFrequencyState([...currentFile.pumpStrokeTimestamps, now], now);
  const stroke = applyFreePumpStroke(
    pumpCandidateFile.heatCapacityFreeInstrumentState.physics,
    pumpCandidateFile.heatCapacityFreeInstrumentConfig.physics,
    {
      pumpValveOpen: pumpCandidateFile.pumpValveOpen,
      stopcockOpen: getHeatCapacityStopcockState(pumpCandidateFile.stopcockAngleDeg) === 'open',
    },
    {
      atS: pumpCandidateFile.heatCapacityFreeInstrumentState.physics.simulationTimeS,
      strength: 1,
    },
  );
  if (!stroke.accepted) {
    const pumpHint = stroke.reason === 'stopcockOpen'
      ? '玻璃旋塞已打开，无法形成有效加压'
      : stroke.reason === 'pressureDanger'
        ? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。'
        : '打气阀门未打开，无法有效打气';
    return {
      ...currentFile,
      pumpHint,
      pumpBulbState: 'releasing',
      updatedAt: now,
    };
  }
  const pumpCandidateWithRollback = pumpCandidateFile.heatCapacityFreeRollbackSnapshots.beforePump === null &&
    pumpCandidateFile.heatCapacityFreeInstrumentState.physics.pumpStrokeCount === 0
    ? {
        ...pumpCandidateFile,
        heatCapacityFreeRollbackSnapshots: {
          ...pumpCandidateFile.heatCapacityFreeRollbackSnapshots,
          beforePump: captureHeatCapacityFreeRollbackSnapshot(pumpCandidateFile),
        },
      }
    : pumpCandidateFile;
  const pumpedPhysicalFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...pumpCandidateWithRollback,
      pumpBulbState: 'compressing',
      pumpStrokeTimestamps: frequencyState.timestamps,
      pumpFrequency: frequencyState.pumpFrequency,
      pumpFrequencyStatus: frequencyState.pumpFrequencyStatus,
      lastPumpTime: now,
      pumpStrokeCount: stroke.state.pumpStrokeCount,
      pumpHint: frequencyState.pumpFrequencyStatus === 'suitable'
        ? '打气频率合适，可以继续观察压强变化'
        : '打气速率偏低，实验效果可能不明显',
    },
    stroke.state,
    pumpCandidateWithRollback.heatCapacityFreeInstrumentState.sensor,
    pumpCandidateWithRollback.heatCapacityFreeInstrumentState.calibration,
    now,
  );
  const pumpedFile = pumpedPhysicalFile.heatCapacityFreeRunWorkspace.activeAttempt === null
    ? startHeatCapacityFreeWorkbenchAttempt(pumpedPhysicalFile, 'effective-pump', now)
    : transitionHeatCapacityFreeWorkbenchAttempt(pumpedPhysicalFile, 'effective-pump', now);
  const withPumpEvent = recordHeatCapacityFreeTraceEvent(pumpedFile, 'pump-stroke', now, {
    pumpStrokeCount: stroke.state.pumpStrokeCount,
  });
  return recordHeatCapacityFreeSafetyTransitionEvents(currentFile, withPumpEvent, now);
};
