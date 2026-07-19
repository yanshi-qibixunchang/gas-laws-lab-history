import assert from 'node:assert/strict';
import {
  appendFreeTraceEvent,
  appendFreeTraceSample,
  compactFreeTraceBranch,
  compactFreeTraceStore,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  FREE_TRACE_MAX_COMPLETED_TRIALS_PER_DOMAIN,
  FREE_TRACE_MAX_EVENTS_PER_BRANCH,
  FREE_TRACE_MAX_SAMPLES_PER_TRIAL,
  type HeatCapacityFreeEventType,
  type HeatCapacityFreeTraceSampleInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';

const LOGICAL_TICK_MS = 100;
const LOGICAL_DURATION_MINUTES = 30;
const TICK_COUNT =
  LOGICAL_DURATION_MINUTES * 60 * 1_000 / LOGICAL_TICK_MS;
const TICKS_PER_FIVE_MINUTES = 5 * 60 * 1_000 / LOGICAL_TICK_MS;
const LOGICAL_GROUP_COUNT = 7;
const TIMING_NOISE_FLOOR_MS = 1;

const createSample = (index: number): HeatCapacityFreeTraceSampleInput => ({
  atS: index * LOGICAL_TICK_MS / 1_000,
  reason: 'periodic',
  phase: index < TICK_COUNT / 2
    ? 'sealedStabilizing'
    : 'recovering',
  controls: {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    pumpBulbState: 'idle',
    releaseFlowOpen: false,
    releasePhase: 'closed',
    releaseDurationS: 0,
  },
  physical: {
    gasPressureKPa: 106,
    pressureDeltaKPa: 4.7,
    gasTemperatureK: 298.15,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1.04,
    pumpStrokeCount: 4,
    releaseStarted: index >= TICK_COUNT / 2,
    currentStopcockOpenDurationS: 0,
  },
  sensor: {
    displayPressureMv: 94 + Math.sin(index / 40),
    displayTemperatureMv: 1499 + Math.cos(index / 50),
    pressureSlopeMvPerS: 0.02,
    temperatureSlopeMvPerS: 0.01,
  },
  calibration: {
    calibrationVersion: 1,
    zeroOffsetMv: 0,
    zeroEventId: 'zero-1',
  },
  stability: {
    pressureStable: true,
    temperatureStable: true,
  },
  safetyStatus: 'normal',
});

const runEndurancePass = () => {
  let store = createDefaultFreeTraceStore();
  let trace = createFreeTraceTrial(
    store,
    createDefaultFreeConfigSnapshot(),
  );
  store = trace.store;
  let branch = trace.traceTrial.branches[0];
  let activeGroupIndex = 0;
  const operationDurationsMs: number[] = [];
  const fiveMinuteDurationsMs: number[] = [];
  const fiveMinuteP95DurationsMs: number[] = [];

  const completeActiveGroup = () => {
    store = compactFreeTraceStore({
      ...store,
      activeTraceTrialId: null,
      traceTrials: store.traceTrials.map((trial) => (
        trial.id === trace.traceTrial.id
          ? {
              ...trial,
              status: 'completed' as const,
              branches: [branch],
            }
          : trial
      )),
    });
  };

  for (
    let segmentStart = 0;
    segmentStart < TICK_COUNT;
    segmentStart += TICKS_PER_FIVE_MINUTES
  ) {
    const segmentStartedAt = performance.now();
    const segmentOperationDurationsMs: number[] = [];
    for (
      let index = segmentStart;
      index < segmentStart + TICKS_PER_FIVE_MINUTES;
      index += 1
    ) {
      const operationStartedAt = performance.now();
      const groupIndex = Math.min(
        LOGICAL_GROUP_COUNT - 1,
        Math.ceil((index + 1) * LOGICAL_GROUP_COUNT / TICK_COUNT) - 1,
      );
      if (groupIndex !== activeGroupIndex) {
        completeActiveGroup();
        trace = createFreeTraceTrial(
          store,
          createDefaultFreeConfigSnapshot(),
        );
        store = trace.store;
        branch = trace.traceTrial.branches[0];
        activeGroupIndex = groupIndex;
      }
      const sample = appendFreeTraceSample(branch, createSample(index));
      branch = compactFreeTraceBranch(sample.branch);
      const groupStart = Math.floor(
        groupIndex * TICK_COUNT / LOGICAL_GROUP_COUNT,
      );
      const groupEnd = Math.floor(
        (groupIndex + 1) * TICK_COUNT / LOGICAL_GROUP_COUNT,
      ) - 1;
      const groupMidpoint = Math.floor((groupStart + groupEnd) / 2);
      const localIndex = index - groupStart;
      if (
        localIndex === 0 ||
        index === groupMidpoint ||
        index === groupEnd ||
        (localIndex < 20 && localIndex % 2 === 0)
      ) {
        const type: HeatCapacityFreeEventType = localIndex === 0
          ? 'record-u0'
          : index === groupMidpoint
            ? 'record-u1'
            : index === groupEnd
              ? 'record-u2'
              : 'pump-stroke';
        branch = compactFreeTraceBranch(appendFreeTraceEvent(branch, {
          atS: sample.sample.atS,
          type,
          traceSampleId: sample.sample.id,
        }).branch);
      }
      const operationDurationMs = performance.now() - operationStartedAt;
      operationDurationsMs.push(operationDurationMs);
      segmentOperationDurationsMs.push(operationDurationMs);
    }
    fiveMinuteDurationsMs.push(performance.now() - segmentStartedAt);
    segmentOperationDurationsMs.sort((left, right) => left - right);
    fiveMinuteP95DurationsMs.push(
      segmentOperationDurationsMs[
        Math.floor(segmentOperationDurationsMs.length * 0.95)
      ] ?? Number.POSITIVE_INFINITY,
    );
  }
  completeActiveGroup();

  const sortedOperationDurations = [...operationDurationsMs].sort(
    (left, right) => left - right,
  );
  const p95 = sortedOperationDurations[
    Math.floor(sortedOperationDurations.length * 0.95)
  ] ?? Number.POSITIVE_INFINITY;
  const firstFiveMinutesMs = fiveMinuteP95DurationsMs[0]!;
  const lastFiveMinutesMs = fiveMinuteP95DurationsMs.at(-1)!;
  return {
    branch,
    store,
    operationDurationsMs,
    fiveMinuteDurationsMs,
    fiveMinuteP95DurationsMs,
    p95,
    rawDegradationRatio: lastFiveMinutesMs / firstFiveMinutesMs,
    degradationRatio:
      Math.max(lastFiveMinutesMs, TIMING_NOISE_FLOOR_MS) /
      Math.max(firstFiveMinutesMs, TIMING_NOISE_FLOOR_MS),
  };
};

const passes = Array.from({ length: 3 }, runEndurancePass);
const degradationRatio = [...passes]
  .map((pass) => pass.degradationRatio)
  .sort((left, right) => left - right)[1]!;
const p95 = Math.max(...passes.map((pass) => pass.p95));

console.log('heatCapacityFreeTraceEndurance metrics', {
  passes: passes.map((pass) => ({
    p95Ms: Number(pass.p95.toFixed(3)),
    fiveMinuteDurationsMs: pass.fiveMinuteDurationsMs.map((value) => (
      Number(value.toFixed(1))
    )),
    fiveMinuteP95DurationsMs: pass.fiveMinuteP95DurationsMs.map((value) => (
      Number(value.toFixed(3))
    )),
    rawDegradationRatio: Number(pass.rawDegradationRatio.toFixed(3)),
    degradationRatio: Number(pass.degradationRatio.toFixed(3)),
    retainedSamples: pass.branch.samples.length,
    retainedEvents: pass.branch.events.length,
  })),
  medianDegradationRatio: Number(degradationRatio.toFixed(3)),
});

for (const pass of passes) {
  assert.equal(pass.operationDurationsMs.length, TICK_COUNT);
  assert.ok(
    pass.branch.samples.length <= FREE_TRACE_MAX_SAMPLES_PER_TRIAL,
    'the accelerated 30-minute run must stay within the per-branch sample cap',
  );
  assert.ok(
    pass.branch.events.length <= FREE_TRACE_MAX_EVENTS_PER_BRANCH,
    'the accelerated 30-minute run must stay within the per-branch event cap',
  );
  assert.equal(
    pass.store.traceTrials.length,
    FREE_TRACE_MAX_COMPLETED_TRIALS_PER_DOMAIN,
    'the seven-group recording flow should retain all seven bounded completed trials',
  );
}
assert.ok(
  p95 <= 50,
  `trace update p95 must stay within one 50 ms interaction frame; got ${p95.toFixed(2)} ms`,
);
assert.ok(
  degradationRatio <= 1.2,
  `the median last-five-minute interaction p95 must not degrade by more than 20% above the 1 ms measurement-noise floor; got ${(degradationRatio * 100).toFixed(1)}%`,
);
for (const recordType of ['record-u0', 'record-u1', 'record-u2'] as const) {
  for (const pass of passes) {
    assert.equal(
      pass.branch.events.some((event) => event.type === recordType),
      true,
      `authoritative ${recordType} evidence must survive endurance compaction`,
    );
  }
}

console.log('heatCapacityFreeTraceEndurance tests passed');
