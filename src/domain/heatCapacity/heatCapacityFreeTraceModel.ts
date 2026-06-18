import type {
  HeatCapacityRuntimePhase,
} from './heatCapacityExperimentModel.ts';

export const HEAT_CAPACITY_FREE_TRACE_VERSION = 4;
export const HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION = 5;
export const HEAT_CAPACITY_FREE_CALCULATION_VERSION = 'log-pressure-v1' as const;
export const HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S = 0.04;

export const FREE_TRACE_MAX_SAMPLES_PER_TRIAL = 800;
export const FREE_TRACE_MAX_EVENTS_PER_TRIAL = 200;

export const FREE_TRACE_SIMILAR_PRESSURE_DELTA_MV = 0.2;
export const FREE_TRACE_SIMILAR_TEMPERATURE_DELTA_MV = 0.1;

export const FREE_TRACE_THRESHOLDS = {
  zeroing: { pressureMv: 0.1, temperatureMv: 0.2 },
  pumpingBurst: { pressureMv: 1.0, temperatureMv: 0.3 },
  sealedStabilizing: { pressureMv: 0.5, temperatureMv: 0.2 },
  releasing: { pressureMv: 0.5, temperatureMv: 0.2 },
  recoveringEarly: { pressureMv: 0.3, temperatureMv: 0.15 },
  recoveringStable: { pressureMv: 0.5, temperatureMv: 0.2 },
  idle: { pressureMv: Number.POSITIVE_INFINITY, temperatureMv: Number.POSITIVE_INFINITY },
} as const;

export type HeatCapacityFreeTracePhase = HeatCapacityRuntimePhase;

export type HeatCapacityFreeTraceSampleReason =
  | 'periodic'
  | 'event'
  | 'record'
  | 'record-blocked'
  | 'phase-change'
  | 'reset'
  | 'heartbeat';

export type HeatCapacityFreeEventType =
  | 'enter-free-mode'
  | 'reset-free-run'
  | 'power-on'
  | 'power-off'
  | 'zero-calibration'
  | 'automatic-u0-candidate'
  | 'pump-valve-open'
  | 'pump-valve-close'
  | 'pump-stroke'
  | 'stopcock-open'
  | 'stopcock-close'
  | 'record-u0'
  | 'record-u1'
  | 'record-u2'
  | 'record-blocked'
  | 'record-invalidated'
  | 'branch-created'
  | 'pressure-warning'
  | 'pressure-danger'
  | 'pressure-danger-cleared';

export interface HeatCapacityFreeTraceStore {
  activeTraceTrialId: string | null;
  nextTraceTrialIndex: number;
  traceTrials: HeatCapacityFreeTraceTrial[];
}

export interface HeatCapacityFreeTraceTrial {
  id: string;
  linkedTrialId: string | null;
  status: 'active' | 'completed' | 'discarded';
  activeBranchId: string;
  nextBranchIndex: number;
  branches: HeatCapacityFreeTraceBranch[];
  configSnapshot: HeatCapacityFreeConfigSnapshot;
}

export interface HeatCapacityFreeTraceBranch {
  id: string;
  parentBranchId: string | null;
  createdByEventId: string | null;
  status: 'main' | 'archived';
  hiddenInDefaultChart: boolean;
  nextSampleIndex: number;
  nextEventIndex: number;
  nextSampleAtS: number | null;
  lastKeptSampleId: string | null;
  idleState: HeatCapacityFreeTraceIdleState;
  samples: HeatCapacityFreeTraceSample[];
  events: HeatCapacityFreeEvent[];
}

export interface HeatCapacityFreeTraceIdleState {
  lastUserActionAtS: number | null;
  dormantSinceS: number | null;
  lastHeartbeatAtS: number | null;
}

export interface HeatCapacityFreeTraceSample {
  id: string;
  index: number;
  atS: number;
  reason: HeatCapacityFreeTraceSampleReason;
  phase: HeatCapacityFreeTracePhase;
  controls: {
    powerOn: boolean;
    stopcockOpen: boolean;
    pumpValveOpen: boolean;
    pumpBulbState: 'idle' | 'compressing' | 'releasing';
    stopcockFlowOpen: boolean;
  };
  physical: {
    gasPressureKPa: number;
    pressureDeltaKPa: number;
    gasTemperatureK: number;
    wallTemperatureK: number;
    ambientTemperatureK: number;
    gasAmountRatio: number;
    pumpStrokeCount: number;
    releaseStarted: boolean;
    currentStopcockOpenDurationS: number;
  };
  sensor: {
    displayPressureMv: number;
    displayTemperatureMv: number;
    pressureSlopeMvPerS: number;
    temperatureSlopeMvPerS: number;
  };
  calibration: {
    calibrationVersion: number;
    zeroOffsetMv: number;
    zeroEventId: string | null;
  };
  stability: {
    pressureStable: boolean;
    temperatureStable: boolean;
  };
  safetyStatus: 'normal' | 'warning' | 'danger';
}

export type HeatCapacityFreeTraceSampleInput = Omit<HeatCapacityFreeTraceSample, 'id' | 'index'>;

export interface HeatCapacityFreeEvent {
  id: string;
  index: number;
  atS: number;
  type: HeatCapacityFreeEventType;
  traceSampleId: string;
  payload?: Record<string, unknown>;
}

export type HeatCapacityFreeEventInput = Omit<HeatCapacityFreeEvent, 'id' | 'index'>;

export interface HeatCapacityFreeConfigSnapshot {
  version: 5;
  environment: {
    ambientPressureKPa: number;
    ambientTemperatureK: number;
  };
  physics: {
    gamma: number;
    vesselVolumeL: number;
    pumpAmountGainRatio: number;
    pumpPressureLimitKPa: number;
    pumpTemperatureGainK: number;
    pumpStrokeDurationS: number;
    recommendedPumpIntervalS: number;
    stopcockFlowRate: number;
    releaseResponseDelayS: number;
    releaseMainDurationS: number;
    thermal: {
      gasWallConductanceWPerK: number;
      wallAmbientConductanceWPerK: number;
      wallHeatCapacityJPerK: number;
      minimumGasHeatCapacityJPerK: number;
    };
    leakage: {
      enabled: boolean;
      ratePerS: number;
    };
  };
  sensor: {
    pressureMvPerKPa: number;
    temperatureMvAtAmbient: number;
    temperatureMvPerK: number;
    lagRate: number;
    pumpLagRate: number;
    noiseMv: number;
    quantizationMv: number;
    minSampleIntervalS: number;
    maxSampleIntervalS: number;
    fastProcessSampleStepS: number;
    historyWindowS: number;
  };
  record: {
    u0ZeroToleranceMv: number;
    pressureStableSlopeMvPerS: number;
    temperatureStableSlopeMvPerS: number;
    temperatureAmbientToleranceMv: number;
    minimumUsefulU1CorrectedMv: number;
    overVentedMinimumU2CorrectedMv: number;
    pressureWarningMv: number;
    pressureDangerMv: number;
  };
  scoring: {
    processScoringVersion: 'free-process-score-v1';
  };
}

export const createDefaultFreeTraceStore = (): HeatCapacityFreeTraceStore => ({
  activeTraceTrialId: null,
  nextTraceTrialIndex: 1,
  traceTrials: [],
});

export const createDefaultFreeConfigSnapshot = (): HeatCapacityFreeConfigSnapshot => ({
  version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  environment: {
    ambientPressureKPa: 101.3,
    ambientTemperatureK: 298.15,
  },
  physics: {
    gamma: 1.4,
    vesselVolumeL: 2,
    pumpAmountGainRatio: 0.015,
    pumpPressureLimitKPa: 108.3,
    pumpTemperatureGainK: 0.35,
    pumpStrokeDurationS: 0.08,
    recommendedPumpIntervalS: 0.1,
    stopcockFlowRate: 4,
    releaseResponseDelayS: 0.02,
    releaseMainDurationS: 0.18,
    thermal: {
      gasWallConductanceWPerK: 0.14,
      wallAmbientConductanceWPerK: 0.45,
      wallHeatCapacityJPerK: 45,
      minimumGasHeatCapacityJPerK: 0.1,
    },
    leakage: {
      enabled: false,
      ratePerS: 0.0005,
    },
  },
  sensor: {
    pressureMvPerKPa: 20,
    temperatureMvAtAmbient: 1499,
    temperatureMvPerK: 2,
    lagRate: 8,
    pumpLagRate: 36,
    noiseMv: 0,
    quantizationMv: 0.01,
    minSampleIntervalS: 0.08,
    maxSampleIntervalS: 0.12,
    fastProcessSampleStepS: HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
    historyWindowS: 1.2,
  },
  record: {
    u0ZeroToleranceMv: 0.12,
    pressureStableSlopeMvPerS: 0.25,
    temperatureStableSlopeMvPerS: 0.12,
    temperatureAmbientToleranceMv: 0.35,
    minimumUsefulU1CorrectedMv: 90,
    overVentedMinimumU2CorrectedMv: 0.2,
    pressureWarningMv: 115,
    pressureDangerMv: 140,
  },
  scoring: {
    processScoringVersion: 'free-process-score-v1',
  },
});

const createEmptyFreeTraceBranch = (
  id: string,
  parentBranchId: string | null = null,
  createdByEventId: string | null = null,
): HeatCapacityFreeTraceBranch => ({
  id,
  parentBranchId,
  createdByEventId,
  status: 'main',
  hiddenInDefaultChart: false,
  nextSampleIndex: 1,
  nextEventIndex: 1,
  nextSampleAtS: null,
  lastKeptSampleId: null,
  idleState: {
    lastUserActionAtS: null,
    dormantSinceS: null,
    lastHeartbeatAtS: null,
  },
  samples: [],
  events: [],
});

const copyConfigSnapshot = (
  configSnapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeConfigSnapshot => ({
  version: configSnapshot.version,
  environment: { ...configSnapshot.environment },
  physics: {
    ...configSnapshot.physics,
    thermal: { ...configSnapshot.physics.thermal },
    leakage: { ...configSnapshot.physics.leakage },
  },
  sensor: { ...configSnapshot.sensor },
  record: { ...configSnapshot.record },
  scoring: { ...configSnapshot.scoring },
});

export const createFreeTraceTrial = (
  store: HeatCapacityFreeTraceStore,
  configSnapshot: HeatCapacityFreeConfigSnapshot,
  linkedTrialId: string | null = null,
) => {
  const traceTrialIndex = store.nextTraceTrialIndex;
  const traceTrialId = `free-trace-trial-${traceTrialIndex}`;
  const branch = createEmptyFreeTraceBranch('branch-1');
  const traceTrial: HeatCapacityFreeTraceTrial = {
    id: traceTrialId,
    linkedTrialId,
    status: 'active',
    activeBranchId: branch.id,
    nextBranchIndex: 2,
    branches: [branch],
    configSnapshot: copyConfigSnapshot(configSnapshot),
  };
  return {
    store: {
      ...store,
      activeTraceTrialId: traceTrialId,
      nextTraceTrialIndex: traceTrialIndex + 1,
      traceTrials: [...store.traceTrials, traceTrial],
    },
    traceTrial,
  };
};

export const appendFreeTraceSample = (
  branch: HeatCapacityFreeTraceBranch,
  input: HeatCapacityFreeTraceSampleInput,
) => {
  const sampleIndex = branch.nextSampleIndex;
  const sample: HeatCapacityFreeTraceSample = {
    id: `sample-${sampleIndex}`,
    index: sampleIndex,
    ...input,
  };
  return {
    branch: {
      ...branch,
      nextSampleIndex: sampleIndex + 1,
      lastKeptSampleId: sample.id,
      samples: [...branch.samples, sample],
    },
    sample,
  };
};

export const appendFreeTraceEvent = (
  branch: HeatCapacityFreeTraceBranch,
  input: HeatCapacityFreeEventInput,
) => {
  const eventIndex = branch.nextEventIndex;
  const event: HeatCapacityFreeEvent = {
    id: `event-${eventIndex}`,
    index: eventIndex,
    ...input,
  };
  return {
    branch: {
      ...branch,
      nextEventIndex: eventIndex + 1,
      events: [...branch.events, event],
    },
    event,
  };
};

const createProtectedSampleIds = (
  samples: HeatCapacityFreeTraceSample[],
  events: HeatCapacityFreeEvent[],
) => {
  const protectedIds = new Set(events.map((event) => event.traceSampleId));
  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];
  if (firstSample) protectedIds.add(firstSample.id);
  if (lastSample) protectedIds.add(lastSample.id);
  for (const sample of samples) {
    if (
      sample.reason === 'event' ||
      sample.reason === 'record' ||
      sample.reason === 'record-blocked' ||
      sample.reason === 'phase-change' ||
      sample.reason === 'reset'
    ) {
      protectedIds.add(sample.id);
    }
  }
  return protectedIds;
};

const haveSameTraceContext = (
  left: HeatCapacityFreeTraceSample,
  right: HeatCapacityFreeTraceSample,
) => (
  left.phase === right.phase &&
  left.safetyStatus === right.safetyStatus &&
  left.controls.powerOn === right.controls.powerOn &&
  left.controls.stopcockOpen === right.controls.stopcockOpen &&
  left.controls.pumpValveOpen === right.controls.pumpValveOpen
);

const isValueSimilarToNeighbor = (
  sample: HeatCapacityFreeTraceSample,
  neighbor: HeatCapacityFreeTraceSample | undefined,
) => (
  neighbor !== undefined &&
  haveSameTraceContext(sample, neighbor) &&
  Math.abs(sample.sensor.displayPressureMv - neighbor.sensor.displayPressureMv) <
    FREE_TRACE_SIMILAR_PRESSURE_DELTA_MV &&
  Math.abs(sample.sensor.displayTemperatureMv - neighbor.sensor.displayTemperatureMv) <
    FREE_TRACE_SIMILAR_TEMPERATURE_DELTA_MV
);

export const compactFreeTraceBranch = (
  branch: HeatCapacityFreeTraceBranch,
  maxSamples = FREE_TRACE_MAX_SAMPLES_PER_TRIAL,
): HeatCapacityFreeTraceBranch => {
  if (branch.samples.length <= maxSamples) {
    return branch;
  }

  const protectedIds = createProtectedSampleIds(branch.samples, branch.events);
  const compacted: HeatCapacityFreeTraceSample[] = [];
  let remainingDrops = branch.samples.length - maxSamples;
  for (let index = 0; index < branch.samples.length; index += 1) {
    const sample = branch.samples[index];
    const previousKept = compacted[compacted.length - 1];
    const nextSample = branch.samples[index + 1];
    const canDrop = remainingDrops > 0 &&
      sample.reason === 'periodic' &&
      !protectedIds.has(sample.id) &&
      (
        isValueSimilarToNeighbor(sample, previousKept) ||
        isValueSimilarToNeighbor(sample, nextSample)
      );
    if (canDrop) {
      remainingDrops -= 1;
    } else {
      compacted.push(sample);
    }
  }

  return {
    ...branch,
    samples: compacted,
    lastKeptSampleId: compacted[compacted.length - 1]?.id ?? null,
  };
};

export const archiveCurrentFreeTraceBranchForRecordInvalidation = (
  store: HeatCapacityFreeTraceStore,
  traceTrialId: string,
) => {
  const traceTrialIndex = store.traceTrials.findIndex((traceTrial) => traceTrial.id === traceTrialId);
  if (traceTrialIndex < 0) {
    return { store, archivedBranchId: null, newBranchId: null, branchCount: 0 };
  }
  const traceTrial = store.traceTrials[traceTrialIndex];
  const branchIndex = traceTrial.branches.findIndex((branch) => branch.id === traceTrial.activeBranchId);
  if (branchIndex < 0) {
    return { store, archivedBranchId: null, newBranchId: null, branchCount: traceTrial.branches.length };
  }
  const archivedBranch = traceTrial.branches[branchIndex];
  const newBranchId = `branch-${traceTrial.nextBranchIndex}`;
  const newBranch = createEmptyFreeTraceBranch(newBranchId, archivedBranch.id);
  const nextTraceTrial: HeatCapacityFreeTraceTrial = {
    ...traceTrial,
    activeBranchId: newBranchId,
    nextBranchIndex: traceTrial.nextBranchIndex + 1,
    branches: [
      ...traceTrial.branches.slice(0, branchIndex),
      {
        ...archivedBranch,
        status: 'archived',
        hiddenInDefaultChart: true,
      },
      ...traceTrial.branches.slice(branchIndex + 1),
      newBranch,
    ],
  };
  const nextStore = {
    ...store,
    activeTraceTrialId: traceTrialId,
    traceTrials: store.traceTrials.map((candidate, index) => (
      index === traceTrialIndex ? nextTraceTrial : candidate
    )),
  };
  return {
    store: nextStore,
    archivedBranchId: archivedBranch.id,
    newBranchId,
    branchCount: nextTraceTrial.branches.length,
  };
};
