import assert from 'node:assert/strict';
import {
  appendFreeTraceEvent,
  appendFreeTraceSample,
  compactFreeTraceBranch,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  FREE_TRACE_MAX_SAMPLES_PER_TRIAL,
  type HeatCapacityFreeTraceSampleInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';

const configSnapshot = createDefaultFreeConfigSnapshot();

assert.equal(HEAT_CAPACITY_FREE_TRACE_VERSION, 4);
assert.equal(HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION, 6);
assert.equal(configSnapshot.version, 6);
assert.equal(configSnapshot.physics.vesselVolumeL, 2);
assert.equal(configSnapshot.physics.pumpAmountGainRatio, 0.015);
assert.equal(configSnapshot.physics.pumpStrokeDurationS, 0.08);
assert.equal(configSnapshot.physics.recommendedPumpIntervalS, 0.1);
assert.equal(configSnapshot.physics.releaseVisualResponseDelayS, 0.02);
assert.equal(configSnapshot.physics.releaseVisualMainDurationS, 0.18);
assert.equal(configSnapshot.physics.thermal.gasWallConductanceWPerK, 0.14);
assert.equal(configSnapshot.physics.thermal.wallAmbientConductanceWPerK, 0.45);
assert.equal(configSnapshot.physics.thermal.wallHeatCapacityJPerK, 45);
assert.equal(configSnapshot.physics.thermal.minimumGasHeatCapacityJPerK, 0.1);
assert.deepEqual(configSnapshot.physics.leakage, {
  enabled: false,
  ratePerS: 0.0005,
});
assert.equal(configSnapshot.sensor.pumpLagRate, 36);
assert.equal(configSnapshot.sensor.fastProcessSampleStepS, 0.04);
assert.equal(configSnapshot.record.pressureWarningMv, 115);
assert.equal(configSnapshot.record.u0ZeroToleranceMv, 0.12);
assert.equal(configSnapshot.scoring.processScoringVersion, 'free-process-score-v1');
assert.equal('reservedPhysicsV2' in configSnapshot, false);
assert.equal(
  configSnapshot.physics.pumpAmountGainRatio * configSnapshot.physics.vesselVolumeL * 1000,
  30,
  'trace snapshots should preserve the same 30 mL effective pump stroke as Workbench Free Mode',
);
assert.equal(
  configSnapshot.record.pressureDangerMv,
  140,
  'trace snapshots should preserve the same 140 mV Free Mode alarm line as Workbench',
);

let store = createDefaultFreeTraceStore();
const first = createFreeTraceTrial(store, configSnapshot);
store = first.store;
const second = createFreeTraceTrial(store, configSnapshot);
configSnapshot.physics.thermal.gasWallConductanceWPerK = 999;
configSnapshot.physics.leakage.enabled = true;

assert.equal(first.traceTrial.id, 'free-trace-trial-1');
assert.equal(first.traceTrial.activeBranchId, 'branch-1');
assert.equal(second.traceTrial.id, 'free-trace-trial-2');
assert.equal(
  first.traceTrial.configSnapshot.physics.thermal.gasWallConductanceWPerK,
  0.14,
  'trace trial must deep-copy thermal config instead of sharing the source object',
);
assert.equal(
  first.traceTrial.configSnapshot.physics.leakage.enabled,
  false,
  'trace trial must deep-copy leakage config instead of sharing the source object',
);

const createSampleInput = (
  index: number,
  overrides: Partial<HeatCapacityFreeTraceSampleInput> = {},
): HeatCapacityFreeTraceSampleInput => ({
  atS: index * 0.1,
  reason: 'periodic',
  phase: 'sealedStabilizing',
  controls: {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    pumpBulbState: 'idle',
    stopcockFlowOpen: false,
  },
  physical: {
    gasPressureKPa: 106,
    pressureDeltaKPa: 4.7,
    gasTemperatureK: 298.15,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1.04,
    pumpStrokeCount: 4,
    releaseStarted: false,
    currentStopcockOpenDurationS: 0,
  },
  sensor: {
    displayPressureMv: 94 + index * 0.01,
    displayTemperatureMv: 1499 + index * 0.001,
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
  ...overrides,
});

let branch = first.traceTrial.branches[0];
for (let index = 0; index < 805; index += 1) {
  branch = appendFreeTraceSample(branch, createSampleInput(index)).branch;
}
const eventSampleResult = appendFreeTraceSample(branch, createSampleInput(900, {
  reason: 'event',
  sensor: {
    displayPressureMv: 130,
    displayTemperatureMv: 1502,
    pressureSlopeMvPerS: 0.2,
    temperatureSlopeMvPerS: 0.1,
  },
}));
branch = eventSampleResult.branch;
branch = appendFreeTraceEvent(branch, {
  atS: eventSampleResult.sample.atS,
  type: 'pump-stroke',
  traceSampleId: eventSampleResult.sample.id,
}).branch;
const compacted = compactFreeTraceBranch(branch);

assert.equal(
  compacted.samples.some((sample) => sample.id === eventSampleResult.sample.id),
  true,
  'event-linked sample must survive compaction',
);
assert.equal(
  compacted.samples.length <= FREE_TRACE_MAX_SAMPLES_PER_TRIAL,
  true,
  'compaction should keep the branch within the sample limit',
);

let similarityBranch = second.traceTrial.branches[0];
similarityBranch = appendFreeTraceSample(similarityBranch, createSampleInput(0, {
  sensor: {
    displayPressureMv: 100,
    displayTemperatureMv: 1499,
    pressureSlopeMvPerS: 0.02,
    temperatureSlopeMvPerS: 0.01,
  },
})).branch;
const dissimilarResult = appendFreeTraceSample(similarityBranch, createSampleInput(1, {
  sensor: {
    displayPressureMv: 140,
    displayTemperatureMv: 1510,
    pressureSlopeMvPerS: 0.02,
    temperatureSlopeMvPerS: 0.01,
  },
}));
similarityBranch = dissimilarResult.branch;
const similarSampleIds: string[] = [];
for (let index = 0; index < 799; index += 1) {
  const result = appendFreeTraceSample(similarityBranch, createSampleInput(index + 2, {
    sensor: {
      displayPressureMv: 100 + index * 0.0001,
      displayTemperatureMv: 1499 + index * 0.00001,
      pressureSlopeMvPerS: 0.02,
      temperatureSlopeMvPerS: 0.01,
    },
  }));
  similarityBranch = result.branch;
  similarSampleIds.push(result.sample.id);
}
const protectedEventSample = appendFreeTraceSample(similarityBranch, createSampleInput(900, {
  reason: 'event',
  sensor: {
    displayPressureMv: 160,
    displayTemperatureMv: 1512,
    pressureSlopeMvPerS: 0.2,
    temperatureSlopeMvPerS: 0.1,
  },
}));
similarityBranch = protectedEventSample.branch;
similarityBranch = appendFreeTraceEvent(similarityBranch, {
  atS: protectedEventSample.sample.atS,
  type: 'stopcock-close',
  traceSampleId: protectedEventSample.sample.id,
}).branch;
const compactedSimilarityBranch = compactFreeTraceBranch(similarityBranch);

assert.equal(
  compactedSimilarityBranch.samples.some((sample) => sample.id === dissimilarResult.sample.id),
  true,
  'compaction should preserve a dissimilar unprotected periodic sample before dropping similar samples',
);
assert.equal(
  similarSampleIds.some((sampleId) => (
    !compactedSimilarityBranch.samples.some((sample) => sample.id === sampleId)
  )),
  true,
  'compaction should remove at least one value-similar periodic sample',
);
assert.equal(
  compactedSimilarityBranch.samples.some((sample) => sample.id === protectedEventSample.sample.id),
  true,
  'event sample should remain after value-similar compaction',
);

let displayNoiseBranch = first.traceTrial.branches[0];
const displayNoiseSamples: string[] = [];
for (const [index, pressureMv, temperatureMv] of [
  [0, 120, 1499],
  [1, 120.08, 1499.03],
  [2, 120.11, 1499.04],
] as const) {
  const result = appendFreeTraceSample(displayNoiseBranch, createSampleInput(index, {
    sensor: {
      displayPressureMv: pressureMv,
      displayTemperatureMv: temperatureMv,
      pressureSlopeMvPerS: 0.01,
      temperatureSlopeMvPerS: 0.01,
    },
  }));
  displayNoiseBranch = result.branch;
  displayNoiseSamples.push(result.sample.id);
}
const compactedDisplayNoiseBranch = compactFreeTraceBranch(displayNoiseBranch, 2);
assert.equal(
  compactedDisplayNoiseBranch.samples.some((sample) => sample.id === displayNoiseSamples[1]),
  false,
  'display-layer sub-threshold jitter should be shielded from background trace compaction',
);
assert.deepEqual(
  compactedDisplayNoiseBranch.samples.map((sample) => sample.id),
  [displayNoiseSamples[0], displayNoiseSamples[2]],
);

console.log('heatCapacityFreeTraceModel tests passed');
