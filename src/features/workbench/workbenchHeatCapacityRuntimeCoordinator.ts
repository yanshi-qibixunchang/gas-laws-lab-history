import {
  applyHeatCapacityPumpStroke as applyHeatCapacityRuntimePumpStroke,
  captureHeatCapacityProcessSample,
  powerHeatCapacityRuntimeState,
  stepHeatCapacityExperiment,
} from '../../domain/heatCapacity/heatCapacityTeachingRuntimeModel.ts';
import type {
  HeatCapacityProcessSampleKey,
  HeatCapacityProcessSamplePoint,
} from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  advanceHeatCapacityReleaseState,
  beginHeatCapacityReleaseClosing,
  beginHeatCapacityReleaseOpening,
  getHeatCapacityReleaseDurationS,
  getHeatCapacityReleaseNextTransitionAtS,
  isHeatCapacityReleaseFlowOpen,
  type HeatCapacityReleasePurpose,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  normalizeHeatCapacityTeachingProfile,
} from '../../domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  deriveFreePhysicalState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  getFreeSensorDisplay,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  getEffectiveHeatCapacityFreeSensorConfig,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  getHeatCapacityGaugePressureState,
  getHeatCapacityPressureZeroDisplayText,
  getHeatCapacityPumpFrequencyState,
  getHeatCapacityStopcockState,
  getHeatCapacityStopcockTargetAngle,
  isHeatCapacityPhysicalKernelMode,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  powerHeatCapacityFreeWorkbenchFileCore,
  registerHeatCapacityFreePumpStrokeCore,
} from './workbenchHeatCapacityFreeControlState.ts';
import {
  stepHeatCapacityFreeWorkbenchFile,
} from './workbenchHeatCapacityFreeRuntimeCoordinator.ts';
import {
  powerHeatCapacityGuideWorkbenchFileCore,
  registerHeatCapacityGuidePumpStrokeCore,
} from './workbenchHeatCapacityGuideControlState.ts';
import {
  stepHeatCapacityGuideWorkbenchFile,
} from './workbenchHeatCapacityGuideRuntimeCoordinator.ts';
import {
  getHeatCapacityRuntimeStateFromFile,
  mergeHeatCapacityRuntimeState,
} from './workbenchHeatCapacityTeachingRuntimeState.ts';
import {
  completeHeatCapacityTeachingModeWorkbenchState,
} from './workbenchHeatCapacityTeachingResultState.ts';
import type {
  HeatCapacityFreeParameterScheme,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

const registerHeatCapacityPumpStrokeCore = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    return registerHeatCapacityGuidePumpStrokeCore(file, now);
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

const powerHeatCapacityWorkbenchFileCore = (
  file: WorkbenchHeatCapacityState,
  nextPowerOn: boolean,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode === 'guide') {
    const mergedGuideFile = powerHeatCapacityGuideWorkbenchFileCore(file, nextPowerOn, now);
    return mergedGuideFile.heatCapacityGuideWorkflow.step === 'completed'
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
