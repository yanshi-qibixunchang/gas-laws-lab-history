import assert from 'node:assert/strict';
import {
  applyGuidePumpStroke,
  createDefaultGuidePhysicsConfig,
  createDefaultGuidePhysicsState,
  deriveGuidePhysicalState,
  migrateGuidePhysicsState,
  stepGuidePhysicsState,
  type HeatCapacityGuidePhysicsConfig,
  type HeatCapacityGuidePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';
import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const TEST_PUMP_WORK_RETENTION = 0.5;
const PUMP_STROKE_DURATION_S = 0.08;

const createTestConfig = (): HeatCapacityGuidePhysicsConfig => ({
  ...createDefaultGuidePhysicsConfig(),
  pumpWorkRetention: TEST_PUMP_WORK_RETENTION,
});

const pumpControls = {
  powerOn: true,
  pumpValveOpen: true,
  stopcockOpen: false,
};

const waitControls = {
  powerOn: true,
  pumpValveOpen: false,
  stopcockOpen: false,
};

const completePumpStroke = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
) => stepGuidePhysicsState(state, config, {
  ...pumpControls,
  dtS: PUMP_STROKE_DURATION_S,
});

const runPumpSequence = (
  config: HeatCapacityGuidePhysicsConfig,
  totalStrokeSpanS: number,
) => {
  let state = createDefaultGuidePhysicsState(config);
  const intervalS = totalStrokeSpanS / 17;
  for (let strokeIndex = 0; strokeIndex < 18; strokeIndex += 1) {
    const strokeAtS = strokeIndex * intervalS;
    const waitBeforeStrokeS = strokeAtS - state.simulationTimeS;
    if (waitBeforeStrokeS > 0) {
      state = stepGuidePhysicsState(state, config, {
        ...pumpControls,
        dtS: waitBeforeStrokeS,
      });
    }
    const result = applyGuidePumpStroke(state, config, pumpControls, {
      atS: strokeAtS,
      strength: 1,
    });
    assert.equal(result.accepted, true, `pump stroke ${strokeIndex + 1} should be accepted`);
    state = result.state;
  }
  return completePumpStroke(state, config);
};

const config = createTestConfig();
const initial = createDefaultGuidePhysicsState(config);
assert.equal(initial.gasAmountRatio, 1);
assert.equal(initial.gasTemperatureK, config.environment.ambientTemperatureK);
assert.equal(initial.wallTemperatureK, config.environment.ambientTemperatureK);
assert.equal(initial.amountMol, initial.referenceAmountMol);
assert.equal(initial.amountMol > 0, true);
assert.equal(initial.internalEnergyJ > 0, true);
assert.equal(
  Math.abs(deriveGuidePhysicalState(initial, config).pressureDeltaKPa) < 1e-10,
  true,
  'authoritative ambient state should derive ambient pressure',
);

const firstPumpAccepted = applyGuidePumpStroke(initial, config, pumpControls, {
  atS: 0,
  strength: 1,
});
assert.equal(firstPumpAccepted.accepted, true);
const afterFirstPump = completePumpStroke(firstPumpAccepted.state, config);
assert.equal(afterFirstPump.amountMol > initial.amountMol, true);
assert.equal(afterFirstPump.internalEnergyJ > initial.internalEnergyJ, true);
assert.equal(
  afterFirstPump.gasTemperatureK > config.environment.ambientTemperatureK,
  true,
  'the first pump stroke should raise true gas temperature through retained flow work',
);

const {
  amountMol: _legacyAmountMol,
  internalEnergyJ: _legacyInternalEnergyJ,
  referenceAmountMol: _legacyReferenceAmountMol,
  ...legacyProjection
} = initial;
void _legacyAmountMol;
void _legacyInternalEnergyJ;
void _legacyReferenceAmountMol;
const migrated = migrateGuidePhysicsState({
  ...legacyProjection,
  gasAmountRatio: 1.04,
  gasTemperatureK: config.environment.ambientTemperatureK + 3,
} as HeatCapacityGuidePhysicsState, config);
assert.equal(migrated.amountMol > migrated.referenceAmountMol, true);
assert.equal(Math.abs(migrated.gasAmountRatio - 1.04) < 1e-12, true);
assert.equal(
  Math.abs(migrated.gasTemperatureK - (config.environment.ambientTemperatureK + 3)) < 1e-10,
  true,
);
assert.equal(migrated.internalEnergyJ > initial.internalEnergyJ, true);

const fastPumping = runPumpSequence(config, 8);
const slowPumping = runPumpSequence(config, 34);
assert.equal(fastPumping.pumpStrokeCount, 18);
assert.equal(slowPumping.pumpStrokeCount, 18);
assert.equal(
  Math.abs(fastPumping.amountMol - slowPumping.amountMol) < 1e-12,
  true,
  'pump cadence must not alter the injected gas amount',
);
assert.equal(
  fastPumping.gasTemperatureK > slowPumping.gasTemperatureK,
  true,
  'the faster 18-stroke sequence should retain more heat because less real time elapses',
);

const beforeRelease = fastPumping;
const pressureBeforeRelease = deriveGuidePhysicalState(beforeRelease, config).gasPressureKPa;
const afterRelease = stepGuidePhysicsState(beforeRelease, config, {
  powerOn: true,
  pumpValveOpen: false,
  stopcockOpen: true,
  stopcockFlowPurpose: 'release',
  dtS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
});
const pressureAfterRelease = deriveGuidePhysicalState(afterRelease, config).gasPressureKPa;
assert.equal(afterRelease.amountMol < beforeRelease.amountMol, true);
assert.equal(afterRelease.internalEnergyJ < beforeRelease.internalEnergyJ, true);
assert.equal(afterRelease.gasTemperatureK < beforeRelease.gasTemperatureK, true);
assert.equal(
  pressureAfterRelease < pressureBeforeRelease,
  true,
  'the unchanged release-flow model should reduce authoritative pressure and temperature',
);

const afterRecovery = stepGuidePhysicsState(afterRelease, config, {
  ...waitControls,
  dtS: 300,
});
const pressureAfterRecovery = deriveGuidePhysicalState(afterRecovery, config).gasPressureKPa;
assert.equal(afterRecovery.gasTemperatureK > afterRelease.gasTemperatureK, true);
assert.equal(pressureAfterRecovery > pressureAfterRelease, true);
assert.equal(
  Math.abs(afterRecovery.gasTemperatureK - config.environment.ambientTemperatureK) < 0.05,
  true,
  'closed-vessel heat exchange should return true gas temperature to ambient over a long wait',
);

console.log('heatCapacityGuidePhysicsEngine tests passed');
