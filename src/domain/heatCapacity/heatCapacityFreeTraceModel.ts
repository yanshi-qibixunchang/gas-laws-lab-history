import type {
  HeatCapacityRuntimePhase,
} from './heatCapacityProcessTypes.ts';
import type {
  HeatCapacityReleasePhase,
} from './heatCapacityReleaseModel.ts';
import {
  FREE_PUMP_STROKE_DURATION_S,
} from './heatCapacityFreePhysicsEngine.ts';
import {
  HEAT_CAPACITY_DEFAULT_PRESSURE_WARNING_MV,
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
  createDefaultHeatCapacityEnvironmentConfig,
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeRecordConfig,
  createDefaultHeatCapacityFreeSensorConfig,
} from './heatCapacityDefaultConfig.ts';

export const HEAT_CAPACITY_FREE_TRACE_VERSION = 6;
export const HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION = 9;
export const HEAT_CAPACITY_FREE_CALCULATION_VERSION = 'log-pressure-v1' as const;
export const HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S = 0.04;

export const FREE_TRACE_MAX_SAMPLES_PER_TRIAL = 800;
export const FREE_TRACE_MAX_EVENTS_PER_BRANCH = 320;
export const FREE_TRACE_MAX_BRANCHES_PER_TRIAL = 4;
export const FREE_TRACE_MAX_COMPLETED_TRIALS_PER_DOMAIN = 7;
export const HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION = 1 as const;

export const FREE_TRACE_SIMILAR_PRESSURE_DELTA_MV = 0.2;
export const FREE_TRACE_SIMILAR_TEMPERATURE_DELTA_MV = 0.1;

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
  | 'release-start'
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
  compaction?: HeatCapacityFreeTraceStoreCompaction;
}

export interface HeatCapacityFreeTraceTrial {
  id: string;
  linkedTrialId: string | null;
  status: 'active' | 'completed' | 'discarded';
  activeBranchId: string;
  nextBranchIndex: number;
  branches: HeatCapacityFreeTraceBranch[];
  configSnapshot: HeatCapacityFreeConfigSnapshot;
  branchCompaction?: HeatCapacityFreeTraceTrialCompaction;
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
  compaction?: HeatCapacityFreeTraceBranchCompaction;
}

export interface HeatCapacityFreeTraceBranchCompaction {
  version: typeof HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION;
  droppedSampleCount: number;
  droppedEventCount: number;
  droppedEventCounts: Partial<Record<HeatCapacityFreeEventType, number>>;
  firstDroppedAtS: number | null;
  lastDroppedAtS: number | null;
}

export interface HeatCapacityFreeTraceTrialCompaction {
  version: typeof HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION;
  droppedBranchCount: number;
  droppedSampleCount: number;
  droppedEventCount: number;
  firstDroppedBranchId: string | null;
  lastDroppedBranchId: string | null;
}

export interface HeatCapacityFreeTraceStoreCompaction {
  version: typeof HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION;
  droppedTrialCount: number;
  droppedBranchCount: number;
  droppedSampleCount: number;
  droppedEventCount: number;
  firstDroppedTrialId: string | null;
  lastDroppedTrialId: string | null;
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
    releaseFlowOpen: boolean;
    releasePhase: HeatCapacityReleasePhase;
    releaseDurationS: number;
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
    ambientPressureOffsetKPa?: number;
    ambientTemperatureOffsetK?: number;
    effectiveAmbientPressureKPa?: number;
    effectiveAmbientTemperatureK?: number;
  };
  sensor: {
    displayPressureMv: number;
    displayTemperatureMv: number;
    pressureSlopeMvPerS: number;
    temperatureSlopeMvPerS: number;
    pressureReliability?: number;
    pressureNonlinearErrorMv?: number;
    pressureStochasticErrorMv?: number;
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
  version: 9;
  environment: {
    ambientPressureKPa: number;
    ambientTemperatureK: number;
  };
  physics: {
    gamma: number;
    vesselVolumeL: number;
    pumpAmountGainRatio: number;
    pumpWorkRetention: number;
    pumpPressureLimitKPa: number;
    pumpStrokeDurationS: number;
    recommendedPumpIntervalS: number;
    stopcockFlowRate: number;
    openingAnimationDurationMs: number;
    closingAnimationDurationMs: number;
    releaseApertureRampS: number;
    releaseOptimalMinS: number;
    releaseOptimalMaxS: number;
    autoDemoReleaseDurationS: number;
    thermal: {
      gasWallConductanceWPerK: number;
      wallAmbientConductanceWPerK: number;
      wallHeatCapacityJPerK: number;
      minimumGasHeatCapacityJPerK: number;
    };
    pumpValveExchange?: {
      enabled: boolean;
      gasExchangeRatePerS: number;
      thermalConductanceWPerK: number;
      openingDelayS: number;
    };
    environmentDisturbance?: {
      enabled: boolean;
      pressureAmplitudeKPa: number;
      temperatureAmplitudeK: number;
      timeScaleS: number;
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
    noiseMv: number;
    quantizationMv: number;
    minSampleIntervalS: number;
    maxSampleIntervalS: number;
    fastProcessSampleStepS: number;
    historyWindowS: number;
    pressureNonlinearity?: {
      enabled: boolean;
      kneeMv: number;
      minGain: number;
      exponent: number;
      extraNoiseMv: number;
    };
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
    processScoringVersion: 'free-process-score-v3';
  };
}

export const createDefaultFreeTraceStore = (): HeatCapacityFreeTraceStore => ({
  activeTraceTrialId: null,
  nextTraceTrialIndex: 1,
  traceTrials: [],
  compaction: {
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedTrialCount: 0,
    droppedBranchCount: 0,
    droppedSampleCount: 0,
    droppedEventCount: 0,
    firstDroppedTrialId: null,
    lastDroppedTrialId: null,
  },
});

export const createDefaultFreeConfigSnapshot = (): HeatCapacityFreeConfigSnapshot => {
  const environment = createDefaultHeatCapacityEnvironmentConfig();
  const physics = createDefaultHeatCapacityFreePhysicsConfig();
  const sensor = createDefaultHeatCapacityFreeSensorConfig();
  const record = createDefaultHeatCapacityFreeRecordConfig();
  return {
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment,
    physics: {
      gamma: physics.gamma,
      vesselVolumeL: physics.vesselVolumeL,
      pumpAmountGainRatio: physics.pumpAmountGainRatio,
      pumpWorkRetention: physics.pumpWorkRetention,
      pumpPressureLimitKPa: physics.pumpPressureLimitKPa,
      pumpStrokeDurationS: FREE_PUMP_STROKE_DURATION_S,
      recommendedPumpIntervalS: HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
      stopcockFlowRate: physics.stopcockFlowRate,
      ...HEAT_CAPACITY_RELEASE_TIMING,
      thermal: { ...physics.thermal },
      pumpValveExchange: physics.pumpValveExchange ? { ...physics.pumpValveExchange } : undefined,
      environmentDisturbance: physics.environmentDisturbance ? { ...physics.environmentDisturbance } : undefined,
      leakage: { ...physics.leakage },
    },
    sensor: {
      pressureMvPerKPa: sensor.pressureMvPerKPa,
      temperatureMvAtAmbient: sensor.temperatureMvAtAmbient,
      temperatureMvPerK: sensor.temperatureMvPerK,
      lagRate: sensor.lagRate,
      noiseMv: sensor.noiseMv,
      quantizationMv: sensor.quantizationMv,
      minSampleIntervalS: sensor.minSampleIntervalS,
      maxSampleIntervalS: sensor.maxSampleIntervalS,
      fastProcessSampleStepS: HEAT_CAPACITY_FREE_FAST_PROCESS_SAMPLE_STEP_S,
      historyWindowS: sensor.historyWindowS,
      pressureNonlinearity: sensor.pressureNonlinearity ? { ...sensor.pressureNonlinearity } : undefined,
    },
    record: {
      u0ZeroToleranceMv: record.u0ZeroToleranceMv,
      pressureStableSlopeMvPerS: record.pressureStableSlopeMvPerS,
      temperatureStableSlopeMvPerS: record.temperatureStableSlopeMvPerS,
      temperatureAmbientToleranceMv: record.temperatureAmbientToleranceMv,
      minimumUsefulU1CorrectedMv: record.minimumUsefulU1CorrectedMv,
      overVentedMinimumU2CorrectedMv: record.overVentedMinimumU2CorrectedMv,
      pressureWarningMv: HEAT_CAPACITY_DEFAULT_PRESSURE_WARNING_MV,
      pressureDangerMv: record.pressureDangerMv,
    },
    scoring: {
      processScoringVersion: 'free-process-score-v3',
    },
  };
};

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
  compaction: {
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedSampleCount: 0,
    droppedEventCount: 0,
    droppedEventCounts: {},
    firstDroppedAtS: null,
    lastDroppedAtS: null,
  },
});

const copyConfigSnapshot = (
  configSnapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeConfigSnapshot => ({
  version: configSnapshot.version,
  environment: { ...configSnapshot.environment },
  physics: {
    ...configSnapshot.physics,
    thermal: { ...configSnapshot.physics.thermal },
    pumpValveExchange: configSnapshot.physics.pumpValveExchange
      ? { ...configSnapshot.physics.pumpValveExchange }
      : undefined,
    environmentDisturbance: configSnapshot.physics.environmentDisturbance
      ? { ...configSnapshot.physics.environmentDisturbance }
      : undefined,
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
    branchCompaction: {
      version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
      droppedBranchCount: 0,
      droppedSampleCount: 0,
      droppedEventCount: 0,
      firstDroppedBranchId: null,
      lastDroppedBranchId: null,
    },
  };
  const nextStore = compactFreeTraceStore({
    ...store,
    activeTraceTrialId: traceTrialId,
    nextTraceTrialIndex: traceTrialIndex + 1,
    traceTrials: [...store.traceTrials, traceTrial],
  });
  return {
    store: nextStore,
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
  const { payload, ...requiredInput } = input;
  const event: HeatCapacityFreeEvent = {
    id: `event-${eventIndex}`,
    index: eventIndex,
    ...requiredInput,
    ...(payload === undefined ? {} : { payload }),
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

const AUTHORITATIVE_FREE_TRACE_EVENT_TYPES =
  new Set<HeatCapacityFreeEventType>([
    'zero-calibration',
    'release-start',
    'stopcock-close',
    'record-u0',
    'record-u1',
    'record-u2',
    'record-invalidated',
    'branch-created',
    'pressure-warning',
    'pressure-danger',
    'pressure-danger-cleared',
  ]);

const createDefaultBranchCompaction =
  (): HeatCapacityFreeTraceBranchCompaction => ({
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedSampleCount: 0,
    droppedEventCount: 0,
    droppedEventCounts: {},
    firstDroppedAtS: null,
    lastDroppedAtS: null,
  });

const createDefaultTrialCompaction =
  (): HeatCapacityFreeTraceTrialCompaction => ({
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedBranchCount: 0,
    droppedSampleCount: 0,
    droppedEventCount: 0,
    firstDroppedBranchId: null,
    lastDroppedBranchId: null,
  });

const createDefaultStoreCompaction =
  (): HeatCapacityFreeTraceStoreCompaction => ({
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedTrialCount: 0,
    droppedBranchCount: 0,
    droppedSampleCount: 0,
    droppedEventCount: 0,
    firstDroppedTrialId: null,
    lastDroppedTrialId: null,
  });

const selectEvenlySpacedIndexes = (
  indexes: readonly number[],
  count: number,
) => {
  if (count <= 0 || indexes.length === 0) return [] as number[];
  if (indexes.length <= count) return [...indexes];
  if (count === 1) return [indexes[indexes.length - 1]];
  const selected = new Set<number>();
  for (let slot = 0; slot < count; slot += 1) {
    selected.add(indexes[Math.round(
      slot * (indexes.length - 1) / (count - 1),
    )]);
  }
  if (selected.size < count) {
    for (let index = indexes.length - 1; index >= 0; index -= 1) {
      selected.add(indexes[index]);
      if (selected.size >= count) break;
    }
  }
  return [...selected].sort((left, right) => left - right);
};

const selectBoundedTraceEvents = (
  events: readonly HeatCapacityFreeEvent[],
  maxEvents: number,
) => {
  if (events.length <= maxEvents) return [...events];
  const authoritativeIndexes = events.flatMap((event, index) => (
    AUTHORITATIVE_FREE_TRACE_EVENT_TYPES.has(event.type) ? [index] : []
  ));
  const selectedIndexes = new Set(
    authoritativeIndexes.length <= maxEvents
      ? authoritativeIndexes
      : selectEvenlySpacedIndexes(authoritativeIndexes, maxEvents),
  );
  const remainingSlots = Math.max(0, maxEvents - selectedIndexes.size);
  const otherIndexes = events.flatMap((_, index) => (
    selectedIndexes.has(index) ? [] : [index]
  ));
  for (const index of selectEvenlySpacedIndexes(otherIndexes, remainingSlots)) {
    selectedIndexes.add(index);
  }
  return [...selectedIndexes]
    .sort((left, right) => left - right)
    .map((index) => events[index]);
};

const mergeBranchCompaction = (
  current: HeatCapacityFreeTraceBranchCompaction | undefined,
  droppedSamples: readonly HeatCapacityFreeTraceSample[],
  droppedEvents: readonly HeatCapacityFreeEvent[],
): HeatCapacityFreeTraceBranchCompaction => {
  const base = current ?? createDefaultBranchCompaction();
  const droppedTimes = [
    ...droppedSamples.map((sample) => sample.atS),
    ...droppedEvents.map((event) => event.atS),
  ];
  const firstDroppedAtS = droppedTimes.length === 0
    ? base.firstDroppedAtS
    : base.firstDroppedAtS === null
      ? Math.min(...droppedTimes)
      : Math.min(base.firstDroppedAtS, ...droppedTimes);
  const lastDroppedAtS = droppedTimes.length === 0
    ? base.lastDroppedAtS
    : base.lastDroppedAtS === null
      ? Math.max(...droppedTimes)
      : Math.max(base.lastDroppedAtS, ...droppedTimes);
  const droppedEventCounts = { ...base.droppedEventCounts };
  for (const event of droppedEvents) {
    droppedEventCounts[event.type] =
      (droppedEventCounts[event.type] ?? 0) + 1;
  }
  return {
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedSampleCount: base.droppedSampleCount + droppedSamples.length,
    droppedEventCount: base.droppedEventCount + droppedEvents.length,
    droppedEventCounts,
    firstDroppedAtS,
    lastDroppedAtS,
  };
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
  const boundedMaxSamples = Math.max(1, Math.floor(maxSamples));
  const retainedEvents = selectBoundedTraceEvents(
    branch.events,
    Math.min(FREE_TRACE_MAX_EVENTS_PER_BRANCH, boundedMaxSamples),
  );
  const retainedEventIds = new Set(retainedEvents.map((event) => event.id));
  const droppedEvents = branch.events.filter((event) => (
    !retainedEventIds.has(event.id)
  ));
  if (
    branch.samples.length <= boundedMaxSamples &&
    droppedEvents.length === 0 &&
    branch.compaction !== undefined
  ) {
    return branch;
  }
  const protectedIds = createProtectedSampleIds(
    branch.samples,
    retainedEvents,
  );
  const eventReferencedSampleIds = new Set(
    retainedEvents.map((event) => event.traceSampleId),
  );
  const eventReferencedIndexes = branch.samples.flatMap((sample, index) => (
    eventReferencedSampleIds.has(sample.id) ? [index] : []
  ));
  const selectedIndexes = new Set(eventReferencedIndexes);
  const otherProtectedIndexes = branch.samples.flatMap((sample, index) => (
    !selectedIndexes.has(index) && protectedIds.has(sample.id) ? [index] : []
  ));
  for (
    const index of selectEvenlySpacedIndexes(
      otherProtectedIndexes,
      Math.max(0, boundedMaxSamples - selectedIndexes.size),
    )
  ) {
    selectedIndexes.add(index);
  }
  let remainingSlots = Math.max(
    0,
    boundedMaxSamples - selectedIndexes.size,
  );
  const featureIndexes = branch.samples.flatMap((sample, index) => (
    selectedIndexes.has(index) ||
    (
      isValueSimilarToNeighbor(sample, branch.samples[index - 1]) ||
      isValueSimilarToNeighbor(sample, branch.samples[index + 1])
    )
      ? []
      : [index]
  ));
  for (
    const index of selectEvenlySpacedIndexes(
      featureIndexes,
      remainingSlots,
    )
  ) {
    selectedIndexes.add(index);
  }
  remainingSlots = Math.max(
    0,
    boundedMaxSamples - selectedIndexes.size,
  );
  const unprotectedIndexes = branch.samples.flatMap((_, index) => (
    selectedIndexes.has(index) ? [] : [index]
  ));
  for (
    const index of selectEvenlySpacedIndexes(
      unprotectedIndexes,
      remainingSlots,
    )
  ) {
    selectedIndexes.add(index);
  }
  const compacted = [...selectedIndexes]
    .sort((left, right) => left - right)
    .map((index) => branch.samples[index]);
  const retainedSampleIds = new Set(compacted.map((sample) => sample.id));
  const referentialEvents = retainedEvents.filter((event) => (
    retainedSampleIds.has(event.traceSampleId)
  ));
  const referentialEventIds = new Set(
    referentialEvents.map((event) => event.id),
  );
  const additionallyDroppedEvents = retainedEvents.filter((event) => (
    !referentialEventIds.has(event.id)
  ));
  const allDroppedEvents = [...droppedEvents, ...additionallyDroppedEvents];
  const droppedSamples = branch.samples.filter((sample) => (
    !retainedSampleIds.has(sample.id)
  ));
  return {
    ...branch,
    samples: compacted,
    events: referentialEvents,
    lastKeptSampleId: compacted[compacted.length - 1]?.id ?? null,
    compaction: mergeBranchCompaction(
      branch.compaction,
      droppedSamples,
      allDroppedEvents,
    ),
  };
};

const getTraceBranchTotalSampleCount = (
  branch: HeatCapacityFreeTraceBranch,
) => branch.samples.length + (branch.compaction?.droppedSampleCount ?? 0);

const getTraceBranchTotalEventCount = (
  branch: HeatCapacityFreeTraceBranch,
) => branch.events.length + (branch.compaction?.droppedEventCount ?? 0);

export const getFreeTraceTrialBranchCount = (
  traceTrial: HeatCapacityFreeTraceTrial,
) => traceTrial.branches.length +
  (traceTrial.branchCompaction?.droppedBranchCount ?? 0);

export const compactFreeTraceTrial = (
  traceTrial: HeatCapacityFreeTraceTrial,
): HeatCapacityFreeTraceTrial => {
  const compactedBranches = traceTrial.branches.map((branch) => (
    compactFreeTraceBranch(branch)
  ));
  if (compactedBranches.length <= FREE_TRACE_MAX_BRANCHES_PER_TRIAL) {
    return {
      ...traceTrial,
      branches: compactedBranches,
      branchCompaction:
        traceTrial.branchCompaction ?? createDefaultTrialCompaction(),
    };
  }
  const activeIndex = compactedBranches.findIndex((branch) => (
    branch.id === traceTrial.activeBranchId
  ));
  const retainedIndexes = new Set<number>(
    activeIndex >= 0 ? [activeIndex] : [],
  );
  for (
    let index = compactedBranches.length - 1;
    index >= 0 &&
      retainedIndexes.size < FREE_TRACE_MAX_BRANCHES_PER_TRIAL;
    index -= 1
  ) {
    retainedIndexes.add(index);
  }
  const retainedBranches = compactedBranches.filter((_, index) => (
    retainedIndexes.has(index)
  ));
  const droppedBranches = compactedBranches.filter((_, index) => (
    !retainedIndexes.has(index)
  ));
  const droppedIds = new Set(droppedBranches.map((branch) => branch.id));
  const normalizedRetainedBranches = retainedBranches.map((branch) => (
    branch.parentBranchId !== null && droppedIds.has(branch.parentBranchId)
      ? { ...branch, parentBranchId: null }
      : branch
  ));
  const current = traceTrial.branchCompaction ??
    createDefaultTrialCompaction();
  return {
    ...traceTrial,
    branches: normalizedRetainedBranches,
    branchCompaction: {
      version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
      droppedBranchCount:
        current.droppedBranchCount + droppedBranches.length,
      droppedSampleCount: current.droppedSampleCount +
        droppedBranches.reduce(
          (total, branch) => total + getTraceBranchTotalSampleCount(branch),
          0,
        ),
      droppedEventCount: current.droppedEventCount +
        droppedBranches.reduce(
          (total, branch) => total + getTraceBranchTotalEventCount(branch),
          0,
        ),
      firstDroppedBranchId: current.firstDroppedBranchId ??
        droppedBranches[0]?.id ?? null,
      lastDroppedBranchId:
        droppedBranches[droppedBranches.length - 1]?.id ??
        current.lastDroppedBranchId,
    },
  };
};

export const compactFreeTraceStore = (
  store: HeatCapacityFreeTraceStore,
): HeatCapacityFreeTraceStore => {
  const compactedTrials = store.traceTrials.map(compactFreeTraceTrial);
  const fallbackActiveTrialId = [...compactedTrials]
    .reverse()
    .find((trial) => trial.status === 'active')?.id ?? null;
  const activeTrialId = compactedTrials.some((trial) => (
    trial.id === store.activeTraceTrialId && trial.status === 'active'
  ))
    ? store.activeTraceTrialId
    : fallbackActiveTrialId;
  const completedTrials = compactedTrials.filter((trial) => (
    trial.status === 'completed'
  ));
  const retainedCompletedIds = new Set(
    completedTrials.slice(
      -FREE_TRACE_MAX_COMPLETED_TRIALS_PER_DOMAIN,
    ).map((trial) => trial.id),
  );
  const retainedTrials = compactedTrials.filter((trial) => (
    trial.id === activeTrialId ||
    (
      trial.status === 'completed' &&
      retainedCompletedIds.has(trial.id)
    )
  ));
  const retainedIds = new Set(retainedTrials.map((trial) => trial.id));
  const droppedTrials = compactedTrials.filter((trial) => (
    !retainedIds.has(trial.id)
  ));
  if (droppedTrials.length === 0) {
    return {
      ...store,
      activeTraceTrialId: activeTrialId,
      traceTrials: retainedTrials,
      compaction: store.compaction ?? createDefaultStoreCompaction(),
    };
  }
  const current = store.compaction ?? createDefaultStoreCompaction();
  return {
    ...store,
    activeTraceTrialId: activeTrialId,
    traceTrials: retainedTrials,
    compaction: {
      version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
      droppedTrialCount: current.droppedTrialCount + droppedTrials.length,
      droppedBranchCount: current.droppedBranchCount +
        droppedTrials.reduce(
          (total, trial) => total + getFreeTraceTrialBranchCount(trial),
          0,
        ),
      droppedSampleCount: current.droppedSampleCount +
        droppedTrials.reduce(
          (total, trial) => total + trial.branches.reduce(
            (branchTotal, branch) => (
              branchTotal + getTraceBranchTotalSampleCount(branch)
            ),
            trial.branchCompaction?.droppedSampleCount ?? 0,
          ),
          0,
        ),
      droppedEventCount: current.droppedEventCount +
        droppedTrials.reduce(
          (total, trial) => total + trial.branches.reduce(
            (branchTotal, branch) => (
              branchTotal + getTraceBranchTotalEventCount(branch)
            ),
            trial.branchCompaction?.droppedEventCount ?? 0,
          ),
          0,
        ),
      firstDroppedTrialId:
        current.firstDroppedTrialId ?? droppedTrials[0]?.id ?? null,
      lastDroppedTrialId:
        droppedTrials[droppedTrials.length - 1]?.id ??
        current.lastDroppedTrialId,
    },
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
  const nextTraceTrial = compactFreeTraceTrial({
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
  });
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
    branchCount: getFreeTraceTrialBranchCount(nextTraceTrial),
  };
};
