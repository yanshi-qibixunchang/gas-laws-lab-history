import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  createDefaultHeatCapacityFile,
  recordHeatCapacityFreeTraceEvent,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createHeatCapacityPersistencePayload,
  getHeatCapacityPersistenceReplayFields,
  validateHeatCapacityPersistencePayload,
} from '../../src/features/workbench/workbenchHeatCapacityPersistence.ts';

const file = createDefaultHeatCapacityFile(1);
const payload = createHeatCapacityPersistencePayload(file, 12345);

assert.equal(payload.experimentKind, 'heatCapacity');
assert.equal(payload.heatCapacitySchemaVersion, 1);
assert.equal(payload.mode, 'free');
assert.equal(payload.free?.runtimeVersion, file.heatCapacityFreeRuntimeVersion);
assert.equal(payload.free?.traceVersion, file.heatCapacityFreeTraceVersion);
assert.equal(payload.free?.config.version, 4);
assert.equal(payload.free?.config.physics.pumpAmountGainRatio, 0.015);
assert.equal(payload.free?.config.physics.pumpStrokeDurationS, 0.08);
assert.equal(payload.free?.config.physics.releaseMainDurationS, 0.18);
assert.equal(payload.free?.config.sensor.pumpLagRate, 36);
assert.equal(payload.free?.config.sensor.fastProcessSampleStepS, 0.04);
assert.equal(payload.free?.config.scoring.processScoringVersion, 'free-process-score-v1');
assert.equal(payload.free?.runtime.gasAmountRatio, 1);
assert.equal(payload.free?.controls.powerOn, false);
assert.equal(payload.free?.controls.stopcockFlowOpen, false);
assert.equal(payload.free?.uiReplay.heatCapacityMaterialsExpanded, true);
assert.equal(payload.free?.uiReplay.pressureGaugeNeedleAngle, file.pressureGaugeNeedleAngle);
assert.equal(payload.free?.uiReplay.stopcockAngleDeg, file.stopcockAngleDeg);
assert.equal(payload.free?.uiReplay.hardSphereViewEnabled, file.hardSphereViewEnabled);
assert.equal(payload.free?.references.standard, null);
assert.equal(payload.free?.references.operableBest, null);

const replay = getHeatCapacityPersistenceReplayFields(payload);
assert.equal(replay.pressureGaugeNeedleAngle, file.pressureGaugeNeedleAngle);
assert.equal(replay.heatCapacityFreeEquilibriumSpeedMultiplier, 4);

const validation = validateHeatCapacityPersistencePayload(payload);
assert.deepEqual(validation.errors, []);
assert.equal(validation.valid, true);

const invalid = validateHeatCapacityPersistencePayload({
  ...payload,
  free: {
    ...payload.free!,
    runtime: {
      ...payload.free!.runtime,
      gasAmountRatio: 0,
    },
  },
});
assert.equal(invalid.valid, false);
assert.equal(invalid.errors.includes('free.runtime.gasAmountRatio must be > 0'), true);

const tracedFile = recordHeatCapacityFreeTraceEvent({
  ...file,
  powerOn: true,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  glassPistonState: 'open',
  stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  heatCapacityFreeStopcockFlowOpen: true,
}, 'pump-stroke', 123);
const tracedTrial = tracedFile.heatCapacityFreeTraceStore.traceTrials[0];
const tracedSample = tracedTrial.branches[0].samples[0];
assert.equal(tracedSample.controls.stopcockOpen, true);
assert.equal(tracedSample.controls.stopcockFlowOpen, true);
assert.equal(tracedSample.controls.pumpBulbState, 'compressing');

const recordedTrial = {
  ...createHeatCapacityFreeTrial('trial-1'),
  traceTrialId: 'free-trace-trial-1',
  branchCount: 1,
  u0: normalizeHeatCapacityFreeRecordInput({
    atS: 1,
    displayPressureMv: 0.12,
    displayTemperatureMv: 1499.01,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    phaseAtRecord: 'readyToZero',
    traceTrialId: 'free-trace-trial-1',
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-1',
    eventId: 'event-1',
  }),
  u1: normalizeHeatCapacityFreeRecordInput({
    atS: 12,
    displayPressureMv: 119.8,
    displayTemperatureMv: 1499.2,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    phaseAtRecord: 'sealedStabilizing',
    traceTrialId: 'free-trace-trial-1',
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-2',
    eventId: 'event-2',
  }),
  u2: normalizeHeatCapacityFreeRecordInput({
    atS: 20,
    displayPressureMv: 35.4,
    displayTemperatureMv: 1499,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
    phaseAtRecord: 'recovering',
    traceTrialId: 'free-trace-trial-1',
    traceBranchId: 'branch-1',
    traceSampleId: 'sample-3',
    eventId: 'event-3',
  }),
  correctedSignals: {
    calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
    atmosphericPressureKPa: 101.3,
    pressureSensitivityMvPerKPa: 20,
    U0DisplayMv: 0.12,
    U1DisplayMv: 119.8,
    U2DisplayMv: 35.4,
    U1CorrectedMv: 119.68,
    U2CorrectedMv: 35.28,
    gamma: 1.39,
  },
};
const recordedPayload = createHeatCapacityPersistencePayload({
  ...file,
  heatCapacityFreeTrials: [recordedTrial],
}, 555);
assert.equal(recordedPayload.free?.trials[0].u1?.displayPressureMv, 119.8);
assert.equal(recordedPayload.free?.trials[0].correctedSignals?.gamma, 1.39);

console.log('heatCapacityFreePersistence tests passed');
