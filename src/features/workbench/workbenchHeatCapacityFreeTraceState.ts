import {
  appendFreeTraceEvent,
  appendFreeTraceSample,
  compactFreeTraceBranch,
  compactFreeTraceStore,
  createFreeTraceTrial,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  type HeatCapacityFreeEventType,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceSampleInput,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import { deriveFreePhysicalState } from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import { getFreeSensorDisplay } from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  getEffectiveHeatCapacityFreeSensorConfig,
  getHeatCapacityFreeIdealTheoreticalGamma,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  getHeatCapacityReleaseDurationS,
  isHeatCapacityReleaseFlowOpen,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import { createDefaultHeatCapacityFreeRecordConfig } from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { createHeatCapacityFreeStandardReference } from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import type {
  HeatCapacityFreeRecordTraceReference,
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { createHeatCapacityFreeRuntimeConfigSnapshotFromFile } from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  selectHeatCapacityFreeGasType,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { getHeatCapacityStopcockState } from './workbenchHeatCapacityInstrumentState.ts';
import { isHeatCapacityFreeTrialComplete } from './workbenchHeatCapacityFreeTrialState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';

export const removeHeatCapacityFreeTraceTrialFromStore = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string | null,
): HeatCapacityFreeTraceStore => {
  if (!traceTrialId) return store;
  const traceTrials = store.traceTrials.filter(
    (traceTrial) => traceTrial.id !== traceTrialId,
  );
  return {
    ...store,
    activeTraceTrialId: traceTrials.some(
      (traceTrial) => traceTrial.id === store.activeTraceTrialId,
    )
      ? store.activeTraceTrialId
      : null,
    traceTrials,
  };
};

export const markHeatCapacityFreeTraceTrialCompleted = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string | null,
  linkedTrialId: string,
): HeatCapacityFreeTraceStore => {
  if (!traceTrialId) return store;
  return compactFreeTraceStore({
    ...store,
    traceTrials: store.traceTrials.map((traceTrial) => (
      traceTrial.id === traceTrialId
        ? { ...traceTrial, linkedTrialId, status: 'completed' }
        : traceTrial
    )),
  });
};

const ensureActiveHeatCapacityFreeTraceTrial = (
  file: WorkbenchHeatCapacityState,
) => {
  const activeTraceTrial = file.heatCapacityFreeRunWorkspace.traceStore.traceTrials.find((traceTrial) => (
    traceTrial.id === file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId &&
    traceTrial.branches.some((branch) => branch.id === traceTrial.activeBranchId)
  ));
  if (activeTraceTrial) return file;
  const { store } = createFreeTraceTrial(
    file.heatCapacityFreeRunWorkspace.traceStore,
    createHeatCapacityFreeRuntimeConfigSnapshotFromFile(file),
  );
  return {
    ...file,
    heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      traceStore: store,
    },
  };
};

const updateActiveHeatCapacityFreeTraceBranch = (
  file: WorkbenchHeatCapacityState,
  updateBranch: (branch: HeatCapacityFreeTraceBranch) => HeatCapacityFreeTraceBranch,
) => {
  const ensuredFile = ensureActiveHeatCapacityFreeTraceTrial(file);
  const store = ensuredFile.heatCapacityFreeRunWorkspace.traceStore;
  const traceTrialIndex = store.traceTrials.findIndex((traceTrial) => (
    traceTrial.id === store.activeTraceTrialId
  ));
  if (traceTrialIndex < 0) return ensuredFile;
  const traceTrial = store.traceTrials[traceTrialIndex];
  const branchIndex = traceTrial.branches.findIndex((branch) => branch.id === traceTrial.activeBranchId);
  if (branchIndex < 0) return ensuredFile;
  const nextBranch = updateBranch(traceTrial.branches[branchIndex]);
  const nextTraceTrial: HeatCapacityFreeTraceTrial = {
    ...traceTrial,
    branches: traceTrial.branches.map((branch, index) => (
      index === branchIndex ? nextBranch : branch
    )),
  };
  return {
    ...ensuredFile,
    heatCapacityFreeRunWorkspace: {
      ...ensuredFile.heatCapacityFreeRunWorkspace,
      traceStore: {
        ...store,
        traceTrials: store.traceTrials.map((candidate, index) => (
          index === traceTrialIndex ? nextTraceTrial : candidate
        )),
      },
    },
  };
};

const buildHeatCapacityFreeTraceSampleInput = (
  file: WorkbenchHeatCapacityState,
  reason: HeatCapacityFreeTraceSampleInput['reason'],
  calibrationReference?: {
    calibrationVersion: number;
    zeroEventId: string | null;
  },
): HeatCapacityFreeTraceSampleInput => {
  const derived = deriveFreePhysicalState(
    file.heatCapacityFreeInstrumentState.physics,
    file.heatCapacityFreeInstrumentConfig.physics,
  );
  const display = getFreeSensorDisplay(
    file.heatCapacityFreeInstrumentState.sensor,
    file.heatCapacityFreeInstrumentState.calibration,
    getEffectiveHeatCapacityFreeSensorConfig(
      file.heatCapacityFreeInstrumentConfig.sensor,
      file.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
    ),
  );
  const latestZeroEventId = file.heatCapacityFreeInstrumentState.calibration.zeroEvents[
    file.heatCapacityFreeInstrumentState.calibration.zeroEvents.length - 1
  ]?.id ?? null;
  const recordConfig = file.heatCapacityFreeInstrumentConfig.record ??
    createDefaultHeatCapacityFreeRecordConfig();
  return {
    atS: file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
    reason,
    phase: file.heatCapacityPhase,
    controls: {
      powerOn: file.powerOn,
      stopcockOpen: getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open',
      pumpValveOpen: file.pumpValveOpen,
      pumpBulbState: file.pumpBulbState,
      releaseFlowOpen: isHeatCapacityReleaseFlowOpen(file.heatCapacityReleaseState),
      releasePhase: file.heatCapacityReleaseState.phase,
      releaseDurationS: getHeatCapacityReleaseDurationS(
        file.heatCapacityReleaseState,
        file.heatCapacityFreeInstrumentState.physics.simulationTimeS,
      ),
    },
    physical: {
      gasPressureKPa: derived.gasPressureKPa,
      pressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: file.heatCapacityFreeInstrumentState.physics.gasTemperatureK,
      wallTemperatureK: file.heatCapacityFreeInstrumentState.physics.wallTemperatureK,
      ambientTemperatureK: file.heatCapacityFreeInstrumentConfig.physics.environment.ambientTemperatureK,
      gasAmountRatio: file.heatCapacityFreeInstrumentState.physics.gasAmountRatio,
      pumpStrokeCount: file.heatCapacityFreeInstrumentState.physics.pumpStrokeCount,
      releaseStarted: file.heatCapacityFreeInstrumentState.physics.releaseStarted,
      currentStopcockOpenDurationS: file.heatCapacityFreeInstrumentState.physics.currentStopcockOpenDurationS,
      ambientPressureOffsetKPa: file.heatCapacityFreeInstrumentState.physics.ambientPressureOffsetKPa,
      ambientTemperatureOffsetK: file.heatCapacityFreeInstrumentState.physics.ambientTemperatureOffsetK,
      effectiveAmbientPressureKPa: file.heatCapacityFreeInstrumentState.physics.effectiveAmbientPressureKPa,
      effectiveAmbientTemperatureK: file.heatCapacityFreeInstrumentState.physics.effectiveAmbientTemperatureK,
    },
    sensor: {
      displayPressureMv: display.displayPressureMv,
      displayTemperatureMv: display.displayTemperatureMv,
      pressureSlopeMvPerS: file.heatCapacityFreeInstrumentState.sensor.pressureSlopeMvPerS,
      temperatureSlopeMvPerS: file.heatCapacityFreeInstrumentState.sensor.temperatureSlopeMvPerS,
      pressureReliability: file.heatCapacityFreeInstrumentState.sensor.pressureReliability,
      pressureNonlinearErrorMv: file.heatCapacityFreeInstrumentState.sensor.pressureNonlinearErrorMv,
      pressureStochasticErrorMv: file.heatCapacityFreeInstrumentState.sensor.pressureStochasticErrorMv,
    },
    calibration: {
      calibrationVersion: calibrationReference
        ? calibrationReference.calibrationVersion
        : file.heatCapacityFreeInstrumentState.calibration.calibrationVersion,
      zeroOffsetMv: file.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv,
      zeroEventId: calibrationReference ? calibrationReference.zeroEventId : latestZeroEventId,
    },
    stability: {
      pressureStable: Math.abs(file.heatCapacityFreeInstrumentState.sensor.pressureSlopeMvPerS) <=
        recordConfig.pressureStableSlopeMvPerS,
      temperatureStable: Math.abs(file.heatCapacityFreeInstrumentState.sensor.temperatureSlopeMvPerS) <=
        recordConfig.temperatureStableSlopeMvPerS,
    },
    safetyStatus: file.pressureSafetyStatus,
  };
};

export const recordHeatCapacityFreeTraceEvent = (
  file: WorkbenchHeatCapacityState,
  type: HeatCapacityFreeEventType,
  now = Date.now(),
  payload?: Record<string, unknown>,
  calibrationReference?: {
    calibrationVersion: number;
    zeroEventId: string | null;
  },
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  const nextFile = updateActiveHeatCapacityFreeTraceBranch(file, (branch) => {
    const sampleResult = appendFreeTraceSample(
      branch,
      buildHeatCapacityFreeTraceSampleInput(file, 'event', calibrationReference),
    );
    const eventResult = appendFreeTraceEvent(sampleResult.branch, {
      atS: sampleResult.sample.atS,
      type,
      traceSampleId: sampleResult.sample.id,
      payload: { ...(payload ?? {}), atMs: now },
    });
    return compactFreeTraceBranch(eventResult.branch);
  });
  return commitHeatCapacityFreeRuntimeAuthorityTransaction(
    nextFile,
    nextFile.heatCapacityFreeParameterScheme,
  );
};

const createEmptyHeatCapacityFreeRecordTraceReference = (
  phaseAtRecord: WorkbenchHeatCapacityState['heatCapacityPhase'] | null,
): HeatCapacityFreeRecordTraceReference => ({
  source: 'user',
  phaseAtRecord,
  traceTrialId: null,
  traceBranchId: null,
  traceSampleId: null,
  eventId: null,
});

const getLatestHeatCapacityFreeRecordTraceReference = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeRecordTraceReference => {
  const store = file.heatCapacityFreeRunWorkspace.traceStore;
  const traceTrial = store.traceTrials.find((candidate) => candidate.id === store.activeTraceTrialId);
  const branch = traceTrial?.branches.find((candidate) => candidate.id === traceTrial.activeBranchId);
  const event = branch?.events[branch.events.length - 1] ?? null;
  if (!traceTrial || !branch || !event) {
    return createEmptyHeatCapacityFreeRecordTraceReference(file.heatCapacityPhase);
  }
  return {
    source: 'user',
    phaseAtRecord: file.heatCapacityPhase,
    traceTrialId: traceTrial.id,
    traceBranchId: branch.id,
    traceSampleId: event.traceSampleId,
    eventId: event.id,
  };
};

export const recordHeatCapacityFreeTraceEventWithReference = (
  file: WorkbenchHeatCapacityState,
  type: HeatCapacityFreeEventType,
  now = Date.now(),
  payload?: Record<string, unknown>,
  calibrationReference?: {
    calibrationVersion: number;
    zeroEventId: string | null;
  },
) => {
  const nextFile = recordHeatCapacityFreeTraceEvent(file, type, now, payload, calibrationReference);
  return {
    file: nextFile,
    reference: getLatestHeatCapacityFreeRecordTraceReference(nextFile),
  };
};

const getLatestFreeTraceSample = (
  branch: HeatCapacityFreeTraceBranch,
) => branch.samples[branch.samples.length - 1] ?? null;

const shouldKeepFreePeriodicTraceSample = (
  previous: ReturnType<typeof getLatestFreeTraceSample>,
  sample: HeatCapacityFreeTraceSampleInput,
) => {
  if (!previous) return true;
  if (previous.phase !== sample.phase) return true;
  if (
    previous.controls.powerOn !== sample.controls.powerOn ||
    previous.controls.stopcockOpen !== sample.controls.stopcockOpen ||
    previous.controls.pumpValveOpen !== sample.controls.pumpValveOpen ||
    previous.controls.pumpBulbState !== sample.controls.pumpBulbState ||
    previous.controls.releaseFlowOpen !== sample.controls.releaseFlowOpen ||
    previous.controls.releasePhase !== sample.controls.releasePhase
  ) return true;
  if (previous.safetyStatus !== sample.safetyStatus) return true;
  if (
    previous.stability.pressureStable !== sample.stability.pressureStable ||
    previous.stability.temperatureStable !== sample.stability.temperatureStable
  ) return true;
  const pressureDeltaMv = Math.abs(previous.sensor.displayPressureMv - sample.sensor.displayPressureMv);
  const temperatureDeltaMv = Math.abs(previous.sensor.displayTemperatureMv - sample.sensor.displayTemperatureMv);
  return pressureDeltaMv >= 0.2 || temperatureDeltaMv >= 0.1;
};

export const recordHeatCapacityFreePeriodicTraceSample = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (
    file.heatCapacityMode !== 'free' ||
    file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId === null
  ) return file;
  return updateActiveHeatCapacityFreeTraceBranch(file, (branch) => {
    const sampleInput = buildHeatCapacityFreeTraceSampleInput(file, 'periodic');
    if (!shouldKeepFreePeriodicTraceSample(getLatestFreeTraceSample(branch), sampleInput)) return branch;
    return compactFreeTraceBranch(appendFreeTraceSample(branch, sampleInput).branch);
  });
};

export const recordHeatCapacityFreeAutomaticU0Event = (
  previousFile: WorkbenchHeatCapacityState,
  nextFile: WorkbenchHeatCapacityState,
  now: number,
) => (
  previousFile.heatCapacityFreeInstrumentState.calibration.automaticU0 === null &&
  nextFile.heatCapacityFreeInstrumentState.calibration.automaticU0 !== null
    ? recordHeatCapacityFreeTraceEvent(nextFile, 'automatic-u0-candidate', now)
    : nextFile
);

export const recordHeatCapacityFreeSafetyTransitionEvents = (
  previousFile: WorkbenchHeatCapacityState,
  nextFile: WorkbenchHeatCapacityState,
  now: number,
) => {
  if (previousFile.pressureSafetyStatus === nextFile.pressureSafetyStatus) return nextFile;
  if (nextFile.pressureSafetyStatus === 'danger') {
    return recordHeatCapacityFreeTraceEvent(nextFile, 'pressure-danger', now);
  }
  if (nextFile.pressureSafetyStatus === 'warning') {
    return recordHeatCapacityFreeTraceEvent(nextFile, 'pressure-warning', now);
  }
  if (previousFile.pressureSafetyStatus === 'danger') {
    return recordHeatCapacityFreeTraceEvent(nextFile, 'pressure-danger-cleared', now);
  }
  return nextFile;
};

export const syncFreeTrialBranchReference = (
  trials: HeatCapacityFreeTrial[],
  trialIndex: number,
  traceTrialId: string,
  branchCount: number,
) => trials.map((trial, index) => (
  index === trialIndex ? { ...trial, traceTrialId, branchCount } : trial
));

const findHeatCapacityFreeTraceTrialForTrial = (
  store: HeatCapacityFreeTraceStore,
  trial: HeatCapacityFreeTrial,
) => store.traceTrials.find((candidate) => (
  candidate.id === trial.traceTrialId || candidate.linkedTrialId === trial.id
)) ?? null;

const getHeatCapacityFreeReviewTheoreticalGamma = (
  file: WorkbenchHeatCapacityState,
  trial: HeatCapacityFreeTrial,
) => {
  const owningGroup = file.heatCapacityFreeExperimentGroups.groups.find((group) => (
    group.runSeries.trials.some((candidate) => candidate.id === trial.id)
  ));
  return owningGroup?.parameterSnapshot?.physics.gamma ??
    trial.standardReferenceSnapshot?.configSnapshot.physics.gamma ??
    (trial.parameterScheme === 'ideal'
      ? getHeatCapacityFreeIdealTheoreticalGamma(
          owningGroup?.gasType ?? selectHeatCapacityFreeGasType(file),
        )
      : file.theoreticalGamma);
};

const createStandardReferenceSnapshotForCompletedFreeTrial = (
  file: WorkbenchHeatCapacityState,
  trial: HeatCapacityFreeTrial,
) => {
  if (trial.standardReferenceSnapshot || !isHeatCapacityFreeTrialComplete(trial)) {
    return trial.standardReferenceSnapshot;
  }
  const traceTrial = findHeatCapacityFreeTraceTrialForTrial(file.heatCapacityFreeRunWorkspace.traceStore, trial);
  if (!traceTrial) return null;
  return createHeatCapacityFreeStandardReference({
    traceTrial,
    trial,
    theoreticalGamma: getHeatCapacityFreeReviewTheoreticalGamma(file, trial),
  });
};

const stampLatestCompletedHeatCapacityFreeTrial = (
  file: WorkbenchHeatCapacityState,
  completedAtMs: number,
): WorkbenchHeatCapacityState => {
  const trialIndex = file.heatCapacityFreeRunWorkspace.trials.length - 1;
  const latestTrial = file.heatCapacityFreeRunWorkspace.trials[trialIndex] ?? null;
  if (!latestTrial || !isHeatCapacityFreeTrialComplete(latestTrial)) return file;
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      trials: file.heatCapacityFreeRunWorkspace.trials.map((trial, index) => (
        index === trialIndex
          ? {
              ...trial,
              completedAtMs,
              standardReferenceSnapshot: createStandardReferenceSnapshotForCompletedFreeTrial(file, trial),
            }
          : trial
      )),
    },
  };
};

export const finalizeCompletedHeatCapacityFreeExperimentGroupWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now: number,
): WorkbenchHeatCapacityState => {
  const stampedFile = stampLatestCompletedHeatCapacityFreeTrial(file, now);
  const trials = stampedFile.heatCapacityFreeRunWorkspace.trials;
  const latestTrial = trials[trials.length - 1] ?? null;
  if (!latestTrial || !isHeatCapacityFreeTrialComplete(latestTrial)) return stampedFile;
  const activeTraceTrialId = stampedFile.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId;
  let traceStore = markHeatCapacityFreeTraceTrialCompleted(
    stampedFile.heatCapacityFreeRunWorkspace.traceStore,
    latestTrial.traceTrialId,
    latestTrial.id,
  );
  traceStore = activeTraceTrialId && activeTraceTrialId !== latestTrial.traceTrialId
    ? removeHeatCapacityFreeTraceTrialFromStore(traceStore, activeTraceTrialId)
    : { ...traceStore, activeTraceTrialId: null };
  return {
    ...stampedFile,
    heatCapacityFreeRunWorkspace: {
      ...stampedFile.heatCapacityFreeRunWorkspace,
      traceStore,
      activeAttempt: null,
    },
  };
};
