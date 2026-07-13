import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  FREE_PUMP_STROKE_DURATION_S,
  getFreePumpStrokeProgress,
  stepFreePhysics,
  synchronizeFreePhysicsThermodynamicState,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  deriveHeatCapacityMolarProperties,
  HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
} from '../../src/domain/heatCapacity/heatCapacityThermodynamicKernel.ts';
import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const baseConfig: HeatCapacityFreePhysicsConfig = {
  environment: {
    ambientTemperatureK: 298.15,
    ambientPressureKPa: 101.3,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.00345,
  pumpWorkRetention: 0.25,
  pumpPressureLimitKPa: 300,
  stopcockFlowRate: 4,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
  pumpValveExchange: {
    enabled: false,
    gasExchangeRatePerS: 0.00015,
    thermalConductanceWPerK: 0.01,
    openingDelayS: 0.42,
  },
  environmentDisturbance: {
    enabled: false,
    pressureAmplitudeKPa: 0.002,
    temperatureAmplitudeK: 0.015,
    timeScaleS: 180,
  },
  leakage: {
    enabled: false,
    ratePerS: 0.0005,
  },
};

const controls: HeatCapacityFreeControls = {
  pumpValveOpen: false,
  stopcockOpen: false,
};
const releaseControls: HeatCapacityFreeControls = {
  ...controls,
  stopcockOpen: true,
  stopcockFlowPurpose: 'release',
};

const leakageConfig = {
  ...baseConfig,
  leakage: {
    enabled: true,
    ratePerS: 0.0005,
  },
} as HeatCapacityFreePhysicsConfig;

const physicsEngineSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreePhysicsEngine.ts'),
  'utf8',
);
assert.doesNotMatch(
  physicsEngineSource,
  /FREE_RELEASE_OVEROPEN|getReleaseStopcockEffectiveDtS|getReleaseOveropenThermalMultiplier/,
  'release long-open should not keep the extra over-open exchange enhancement',
);
assert.match(
  physicsEngineSource,
  /FREE_POST_RELEASE_LATE_LEAK_START_S[\s\S]*FREE_POST_RELEASE_LATE_LEAK_MAX_MULTIPLIER[\s\S]*lateLeakRamp/,
  'U2 delayed-record sealed micro-leak enhancement should remain in the physics engine',
);

const expectClose = (actual: number, expected: number, tolerance: number, message: string) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const createLegacyFreePhysicsState = (
  state: HeatCapacityFreePhysicsState,
  overrides: Partial<HeatCapacityFreePhysicsState> = {},
) => {
  const legacy = {
    ...state,
    ...overrides,
  };
  delete legacy.amountMol;
  delete legacy.internalEnergyJ;
  delete legacy.referenceAmountMol;
  return legacy as HeatCapacityFreePhysicsState;
};

const createThermodynamicTestState = (
  state: HeatCapacityFreePhysicsState,
  overrides: Partial<HeatCapacityFreePhysicsState>,
  config = baseConfig,
) => synchronizeFreePhysicsThermodynamicState(
  createLegacyFreePhysicsState(state, overrides),
  config,
);

const calculateReducedFlowWorkPumpTemperatureK = (
  amountRatio: number,
  temperatureK: number,
  amountDeltaRatio: number,
  config = baseConfig,
) => {
  const nextAmountRatio = amountRatio + amountDeltaRatio;
  const retainedFlowWorkTemperatureRatio = config.pumpWorkRetention *
    (config.gamma - 1);
  return (
    amountRatio * temperatureK +
    amountDeltaRatio * config.environment.ambientTemperatureK *
      (1 + retainedFlowWorkTemperatureRatio)
  ) / nextAmountRatio;
};

assert.equal(getFreePumpStrokeProgress(0), 0);
assert.equal(getFreePumpStrokeProgress(FREE_PUMP_STROKE_DURATION_S), 1);
assert.equal(
  getFreePumpStrokeProgress(0.04) > getFreePumpStrokeProgress(0.02),
  true,
  'pump stroke progress should increase continuously before the stroke finishes',
);

const pumpOnce = (
  state: HeatCapacityFreePhysicsState,
  atS: number,
  strength = 1,
) => {
  const result = applyFreePumpStroke(
    state,
    baseConfig,
    {
      ...controls,
      pumpValveOpen: true,
    },
    { atS, strength },
  );
  assert.equal(result.accepted, true);
  return stepFreePhysics(result.state, baseConfig, controls, FREE_PUMP_STROKE_DURATION_S, atS + FREE_PUMP_STROKE_DURATION_S);
};

const createPumpedSequence = () => {
  let state = createDefaultFreePhysicsState(baseConfig);
  for (let index = 0; index < 5; index += 1) {
    state = pumpOnce(state, index + 1);
  }
  const pumpedState = state;
  let settledState = pumpedState;
  for (let index = 0; index < 30; index += 1) {
    settledState = stepFreePhysics(settledState, baseConfig, controls, 1, 10 + index);
  }
  return { pumpedState, settledState };
};

const initial = createDefaultFreePhysicsState(baseConfig);
const initialDerived = deriveFreePhysicalState(initial, baseConfig);
assert.equal(initial.gasAmountRatio, 1);
assert.equal(initial.gasTemperatureK, baseConfig.environment.ambientTemperatureK);
assert.equal(initial.wallTemperatureK, baseConfig.environment.ambientTemperatureK);
assert.equal(Number.isFinite(initial.amountMol), true);
assert.equal(Number.isFinite(initial.internalEnergyJ), true);
assert.equal(Number.isFinite(initial.referenceAmountMol), true);
assert.deepEqual(initial.pumpProcesses, []);
assert.equal(initialDerived.gasPressureKPa, baseConfig.environment.ambientPressureKPa);
assert.equal(initialDerived.pressureDeltaKPa, 0);
assert.equal(initial.lastPumpValveOpenedAtS, null);
assert.equal(initial.lastPumpValveClosedAtS, null);
assert.equal(initial.currentPumpValveOpenDurationS, 0);
assert.equal(initial.environmentDisturbanceSeed, 'free-physics');
assert.equal(initial.ambientPressureOffsetKPa, 0);
assert.equal(initial.ambientTemperatureOffsetK, 0);
assert.equal(initial.effectiveAmbientPressureKPa, baseConfig.environment.ambientPressureKPa);
assert.equal(initial.effectiveAmbientTemperatureK, baseConfig.environment.ambientTemperatureK);

const migratedLegacyState = synchronizeFreePhysicsThermodynamicState(
  createLegacyFreePhysicsState(initial, {
    gasAmountRatio: 1.03,
    gasTemperatureK: baseConfig.environment.ambientTemperatureK + 2,
  }),
  baseConfig,
);
expectClose(migratedLegacyState.gasAmountRatio, 1.03, 1e-12, 'legacy amount ratio should migrate to amountMol');
expectClose(
  migratedLegacyState.gasTemperatureK,
  baseConfig.environment.ambientTemperatureK + 2,
  1e-12,
  'legacy temperature should migrate to internalEnergyJ',
);
assert.equal(Number.isFinite(migratedLegacyState.amountMol), true);
assert.equal(Number.isFinite(migratedLegacyState.internalEnergyJ), true);

const staleCompatibilityAliases = {
  ...initial,
  gasAmountRatio: 4,
  gasTemperatureK: 100,
};
expectClose(
  deriveFreePhysicalState(staleCompatibilityAliases, baseConfig).gasPressureKPa,
  initialDerived.gasPressureKPa,
  1e-12,
  'authoritative amountMol/internalEnergyJ must not be overwritten by stale compatibility aliases',
);

const modifiedAmount = createThermodynamicTestState(initial, {
  gasAmountRatio: 1.12,
});
const modifiedTemperature = createThermodynamicTestState(modifiedAmount, {
  gasTemperatureK: baseConfig.environment.ambientTemperatureK + 12,
});
assert.equal(
  deriveFreePhysicalState(modifiedAmount, baseConfig).gasPressureKPa >
    deriveFreePhysicalState(initial, baseConfig).gasPressureKPa,
  true,
  'pressure should be derived from gas amount',
);
assert.equal(
  deriveFreePhysicalState(modifiedTemperature, baseConfig).gasPressureKPa >
    deriveFreePhysicalState(modifiedAmount, baseConfig).gasPressureKPa,
  true,
  'pressure should be derived from gas temperature',
);
assert.equal(
  'gasPressureKPa' in initial,
  false,
  'physical state must not store pressure as independent long-lived truth',
);

const hotSealed = createThermodynamicTestState(initial, {
  gasAmountRatio: 1.08,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK + 10,
});
const hotSealedPressure = deriveFreePhysicalState(hotSealed, baseConfig).gasPressureKPa;
const cooledSealed = stepFreePhysics(hotSealed, baseConfig, controls, 2, 12);
assert.equal(cooledSealed.gasAmountRatio, hotSealed.gasAmountRatio, 'closed waiting should preserve amount');
assert.equal(cooledSealed.gasTemperatureK < hotSealed.gasTemperatureK, true);
assert.equal(cooledSealed.wallTemperatureK > hotSealed.wallTemperatureK, true);
assert.equal(
  (cooledSealed.gasTemperatureK - baseConfig.environment.ambientTemperatureK) /
    (hotSealed.gasTemperatureK - baseConfig.environment.ambientTemperatureK) >
    0.7,
  true,
  'closed waiting should cool through vessel-wall inertia instead of snapping back to ambient',
);
assert.equal(
  deriveFreePhysicalState(cooledSealed, baseConfig).gasPressureKPa < hotSealedPressure,
  true,
  'closed waiting pressure should change through temperature relaxation only',
);

const leakedSealed = stepFreePhysics(hotSealed, leakageConfig, controls, 60, 70);
assert.equal(
  leakedSealed.gasAmountRatio < hotSealed.gasAmountRatio,
  true,
  'enabled micro-leak should slowly reduce gas amount while sealed above ambient',
);
assert.equal(
  leakedSealed.gasAmountRatio > 1,
  true,
  'weak micro-leak should not dominate a one-minute sealed wait',
);
assert.equal(
  deriveFreePhysicalState(leakedSealed, leakageConfig).gasPressureKPa <
    deriveFreePhysicalState(stepFreePhysics(hotSealed, baseConfig, controls, 60, 70), baseConfig).gasPressureKPa,
  true,
  'micro-leak should reduce pressure through gas amount, not by clamping pressure',
);

const leakageOnlyConfig: HeatCapacityFreePhysicsConfig = {
  ...leakageConfig,
  thermal: {
    ...leakageConfig.thermal,
    gasWallConductanceWPerK: 0,
    wallAmbientConductanceWPerK: 0,
  },
};
const leakageOnlyStart = createThermodynamicTestState(
  createDefaultFreePhysicsState(leakageOnlyConfig),
  {
    gasAmountRatio: 1.08,
    gasTemperatureK: leakageOnlyConfig.environment.ambientTemperatureK + 8,
  },
  leakageOnlyConfig,
);
const leakageOnlyEnd = stepFreePhysics(
  leakageOnlyStart,
  leakageOnlyConfig,
  controls,
  1,
  1,
);
assert.equal(leakageOnlyEnd.gasAmountRatio < leakageOnlyStart.gasAmountRatio, true);
expectClose(
  leakageOnlyEnd.gasTemperatureK,
  leakageOnlyStart.gasTemperatureK,
  1e-10,
  'sealed outflow leakage should remove the current molar internal energy without a temperature jump',
);

const belowAmbientSealed = stepFreePhysics(
  createThermodynamicTestState(initial, {
    gasAmountRatio: 0.96,
  }),
  leakageConfig,
  controls,
  60,
  71,
);
assert.equal(
  belowAmbientSealed.gasAmountRatio > 0.96,
  true,
  'sealed micro-leak should draw gas back in when pressure is below ambient',
);

const environmentDisturbanceConfig = {
  ...baseConfig,
  environmentDisturbance: {
    enabled: true,
    pressureAmplitudeKPa: 0.2,
    temperatureAmplitudeK: 0.5,
    timeScaleS: 120,
  },
} as HeatCapacityFreePhysicsConfig;
const disturbedInitialA = createDefaultFreePhysicsState(environmentDisturbanceConfig, 'env-a');
const disturbedA = stepFreePhysics(disturbedInitialA, environmentDisturbanceConfig, controls, 1, 60);
const disturbedARepeat = stepFreePhysics(
  createDefaultFreePhysicsState(environmentDisturbanceConfig, 'env-a'),
  environmentDisturbanceConfig,
  controls,
  1,
  60,
);
const disturbedB = stepFreePhysics(
  createDefaultFreePhysicsState(environmentDisturbanceConfig, 'env-b'),
  environmentDisturbanceConfig,
  controls,
  1,
  60,
);
assert.deepEqual(disturbedA, disturbedARepeat, 'environment disturbance should be deterministic from seed and time');
assert.notEqual(
  disturbedA.ambientPressureOffsetKPa,
  disturbedB.ambientPressureOffsetKPa,
  'different environment seeds should produce different pressure offsets',
);
assert.equal(
  Math.abs(disturbedA.ambientPressureOffsetKPa) <= 0.2,
  true,
  'pressure offset should remain within configured amplitude',
);
assert.equal(
  Math.abs(disturbedA.ambientTemperatureOffsetK) <= 0.5,
  true,
  'temperature offset should remain within configured amplitude',
);
expectClose(
  deriveFreePhysicalState(disturbedA, environmentDisturbanceConfig).gasPressureKPa,
  (disturbedA.amountMol ?? 0) *
    HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K *
    disturbedA.gasTemperatureK /
    (environmentDisturbanceConfig.vesselVolumeL / 1000) /
    1000,
  1e-9,
  'absolute gas pressure must be derived from nRT/V while the disturbed ambient only changes pressure delta',
);

const pumpValveExchangeConfig = {
  ...baseConfig,
  pumpValveExchange: {
    enabled: true,
    gasExchangeRatePerS: 0.004,
    thermalConductanceWPerK: 0,
    openingDelayS: 0.42,
  },
} as HeatCapacityFreePhysicsConfig;
const pumpValveExchangeControls = {
  ...controls,
  pumpValveOpen: true,
};
const pressurizedWithOpenPumpValve = createThermodynamicTestState(initial, {
  gasAmountRatio: 1.08,
});
const pumpValveBeforeOpenDelay = stepFreePhysics(
  pressurizedWithOpenPumpValve,
  pumpValveExchangeConfig,
  pumpValveExchangeControls,
  0.2,
  0.2,
);
assert.equal(
  pumpValveBeforeOpenDelay.gasAmountRatio,
  pressurizedWithOpenPumpValve.gasAmountRatio,
  'pump-valve exchange should wait for the opening animation delay before moving gas',
);
assert.equal(pumpValveBeforeOpenDelay.lastPumpValveOpenedAtS, 0.2);
assert.equal(pumpValveBeforeOpenDelay.currentPumpValveOpenDurationS, 0.2);
const pumpValveAfterOpenDelay = stepFreePhysics(
  pumpValveBeforeOpenDelay,
  pumpValveExchangeConfig,
  pumpValveExchangeControls,
  1,
  1.2,
);
assert.equal(
  pumpValveAfterOpenDelay.gasAmountRatio < pumpValveBeforeOpenDelay.gasAmountRatio,
  true,
  'pump-valve exchange should leak high-pressure gas outward after the opening delay',
);
assert.equal(pumpValveAfterOpenDelay.currentPumpValveOpenDurationS, 1.2);

const pumpValveOutflowOnlyConfig: HeatCapacityFreePhysicsConfig = {
  ...pumpValveExchangeConfig,
  pumpValveExchange: {
    ...pumpValveExchangeConfig.pumpValveExchange!,
    openingDelayS: 0,
  },
  thermal: {
    ...pumpValveExchangeConfig.thermal,
    gasWallConductanceWPerK: 0,
    wallAmbientConductanceWPerK: 0,
  },
};
const pumpValveOutflowOnlyStart = createThermodynamicTestState(
  createDefaultFreePhysicsState(pumpValveOutflowOnlyConfig),
  {
    gasAmountRatio: 1.08,
    gasTemperatureK: pumpValveOutflowOnlyConfig.environment.ambientTemperatureK + 8,
  },
  pumpValveOutflowOnlyConfig,
);
const pumpValveOutflowOnlyEnd = stepFreePhysics(
  pumpValveOutflowOnlyStart,
  pumpValveOutflowOnlyConfig,
  pumpValveExchangeControls,
  1,
  1,
);
assert.equal(
  pumpValveOutflowOnlyEnd.gasAmountRatio < pumpValveOutflowOnlyStart.gasAmountRatio,
  true,
);
expectClose(
  pumpValveOutflowOnlyEnd.gasTemperatureK,
  pumpValveOutflowOnlyStart.gasTemperatureK,
  1e-10,
  'pump-valve outflow should remove the current molar internal energy without a temperature jump',
);
const pumpValveClosedImmediately = stepFreePhysics(
  createThermodynamicTestState(pumpValveAfterOpenDelay, {
    gasAmountRatio: 1.08,
  }, pumpValveExchangeConfig),
  pumpValveExchangeConfig,
  controls,
  1,
  2.2,
);
assert.equal(
  pumpValveClosedImmediately.gasAmountRatio,
  1.08,
  'pump-valve exchange should stop as soon as the close command is received',
);
assert.equal(pumpValveClosedImmediately.lastPumpValveClosedAtS, 2.2);
assert.equal(pumpValveClosedImmediately.currentPumpValveOpenDurationS, 0);

const pendingPump = applyFreePumpStroke(
  initial,
  baseConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 1, strength: 1 },
);
assert.equal(pendingPump.accepted, true);
assert.equal(pendingPump.state.gasAmountRatio, initial.gasAmountRatio, 'accepted pump should enqueue a continuous stroke instead of jumping gas amount');
assert.equal(pendingPump.state.gasTemperatureK, initial.gasTemperatureK, 'accepted pump should not jump gas temperature before the stroke progresses');
assert.equal(pendingPump.state.pumpProcesses.length, 1);
assert.throws(
  () => applyFreePumpStroke(
    initial,
    { ...baseConfig, pumpWorkRetention: undefined as unknown as number },
    { ...controls, pumpValveOpen: true },
    { atS: 1, strength: 1 },
  ),
  /pumpWorkRetention must be configured/,
  'missing retention must not silently fall back to zero',
);
assert.throws(
  () => applyFreePumpStroke(
    initial,
    { ...baseConfig, pumpWorkRetention: 1 },
    { ...controls, pumpValveOpen: true },
    { atS: 1, strength: 1 },
  ),
  /reserved for ideal-upper-bound tests/,
  'production engine must reserve retention=1 for isolated upper-bound tests',
);
const halfPumped = stepFreePhysics(pendingPump.state, baseConfig, controls, 0.04, 1.04);
expectClose(
  halfPumped.gasAmountRatio,
  initial.gasAmountRatio + baseConfig.pumpAmountGainRatio * 0.68,
  0.000000001,
  'early in the 0.08 s pump stroke should apply most of the gas amount for a visible pressure step',
);
expectClose(
  halfPumped.gasTemperatureK,
  calculateReducedFlowWorkPumpTemperatureK(
    initial.gasAmountRatio,
    initial.gasTemperatureK,
    baseConfig.pumpAmountGainRatio * 0.68,
  ),
  0.002,
  'early in the pump stroke should include retained compression flow work',
);
assert.equal(halfPumped.pumpProcesses.length, 1);
const fullyPumped = stepFreePhysics(halfPumped, baseConfig, controls, 0.04, 1.08);
expectClose(
  fullyPumped.gasAmountRatio,
  initial.gasAmountRatio + baseConfig.pumpAmountGainRatio,
  0.000000001,
  'after 0.08 s the pump stroke should finish its full gas amount',
);
assert.equal(fullyPumped.pumpProcesses.length, 0, 'finished pump stroke should be removed from the active queue');

const isolatedPumpConfig: HeatCapacityFreePhysicsConfig = {
  ...baseConfig,
  thermal: {
    ...baseConfig.thermal,
    gasWallConductanceWPerK: 0,
    wallAmbientConductanceWPerK: 0,
  },
};
const isolatedPumpInitial = createDefaultFreePhysicsState(isolatedPumpConfig);
const isolatedPumpAccepted = applyFreePumpStroke(
  isolatedPumpInitial,
  isolatedPumpConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 4, strength: 1 },
);
assert.equal(isolatedPumpAccepted.accepted, true);
const isolatedPumpFinished = stepFreePhysics(
  isolatedPumpAccepted.state,
  isolatedPumpConfig,
  controls,
  FREE_PUMP_STROKE_DURATION_S,
  4 + FREE_PUMP_STROKE_DURATION_S,
);
const { cvMolarJPerMolK } = deriveHeatCapacityMolarProperties(isolatedPumpConfig.gamma);
const expectedPumpAmountDeltaMol = (isolatedPumpInitial.referenceAmountMol ?? 0) *
  isolatedPumpConfig.pumpAmountGainRatio;
const expectedPumpEnergyDeltaJ = expectedPumpAmountDeltaMol *
  isolatedPumpConfig.environment.ambientTemperatureK *
  (
    cvMolarJPerMolK +
    isolatedPumpConfig.pumpWorkRetention * HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
  );
expectClose(
  (isolatedPumpFinished.amountMol ?? 0) - (isolatedPumpInitial.amountMol ?? 0),
  expectedPumpAmountDeltaMol,
  1e-12,
  'one pump stroke should add the configured amount of gas',
);
expectClose(
  (isolatedPumpFinished.internalEnergyJ ?? 0) - (isolatedPumpInitial.internalEnergyJ ?? 0),
  expectedPumpEnergyDeltaJ,
  1e-10,
  'one pump stroke should add ambient internal energy plus retained compression flow work',
);
assert.equal(
  isolatedPumpFinished.gasTemperatureK > isolatedPumpInitial.gasTemperatureK,
  true,
  'the first physical pump stroke must raise gas temperature',
);

const runPumpCadence = (intervalS: number, strokeCount: number) => {
  let state = createDefaultFreePhysicsState(baseConfig);
  let atS = 0;
  let peakTemperatureK = state.gasTemperatureK;
  for (let index = 0; index < strokeCount; index += 1) {
    const acceptedStroke = applyFreePumpStroke(
      state,
      baseConfig,
      { ...controls, pumpValveOpen: true },
      { atS, strength: 1 },
    );
    assert.equal(acceptedStroke.accepted, true);
    const strokeEndS = atS + FREE_PUMP_STROKE_DURATION_S;
    state = stepFreePhysics(
      acceptedStroke.state,
      baseConfig,
      controls,
      FREE_PUMP_STROKE_DURATION_S,
      strokeEndS,
    );
    peakTemperatureK = Math.max(peakTemperatureK, state.gasTemperatureK);
    const interStrokeWaitS = Math.max(0, intervalS - FREE_PUMP_STROKE_DURATION_S);
    if (interStrokeWaitS > 0 && index < strokeCount - 1) {
      atS += intervalS;
      state = stepFreePhysics(
        state,
        baseConfig,
        controls,
        interStrokeWaitS,
        atS,
      );
    } else {
      atS = strokeEndS;
    }
  }
  return { state, peakTemperatureK };
};

const rapidEightPumps = runPumpCadence(0.1, 8);
const slowEightPumps = runPumpCadence(2, 8);
assert.equal(
  rapidEightPumps.peakTemperatureK > slowEightPumps.peakTemperatureK,
  true,
  'equal pump counts must peak hotter at a fast cadence because less heat escapes between strokes',
);
const rapidPumpPeaks = [4, 8, 12, 18].map((strokeCount) => (
  runPumpCadence(0.1, strokeCount).peakTemperatureK
));
assert.equal(
  rapidPumpPeaks.every((peak, index) => index === 0 || peak > rapidPumpPeaks[index - 1]),
  true,
  '4, 8, 12 and 18 rapid strokes should produce progressively higher gas-temperature peaks',
);

const rapidCadencePump = applyFreePumpStroke(
  initial,
  baseConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 1.5, strength: 1 },
);
const rapidCadenceAfterOneInterval = stepFreePhysics(
  rapidCadencePump.state,
  baseConfig,
  controls,
  0.1,
  1.6,
);
assert.equal(
  rapidCadenceAfterOneInterval.pumpProcesses.length,
  0,
  'a pump stroke should complete before a non-standard rapid 0.1 s next stroke so four clicks render as four visible steps',
);

let rapidSeparatedPumps = applyFreePumpStroke(
  initial,
  baseConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 2, strength: 1 },
).state;
rapidSeparatedPumps = stepFreePhysics(rapidSeparatedPumps, baseConfig, controls, 0.1, 2.1);
rapidSeparatedPumps = applyFreePumpStroke(
  rapidSeparatedPumps,
  baseConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 2.1, strength: 1 },
).state;
rapidSeparatedPumps = stepFreePhysics(rapidSeparatedPumps, baseConfig, controls, 0.04, 2.14);
expectClose(
  rapidSeparatedPumps.gasAmountRatio,
  initial.gasAmountRatio + baseConfig.pumpAmountGainRatio * (1 + 0.68),
  0.000000001,
  'non-standard rapid pump strokes 0.1 s apart should remain visible as separate stair steps',
);

const pumped = pumpOnce(initial, 1, 1.25);
assert.equal(pumped.pumpStrokeCount, 1);
assert.equal(pumped.gasAmountRatio > initial.gasAmountRatio, true);
assert.equal(pumped.gasTemperatureK > initial.gasTemperatureK, true);
assert.equal(pumped.wallTemperatureK >= initial.wallTemperatureK, true);
assert.equal(
  deriveFreePhysicalState(pumped, baseConfig).gasPressureKPa > initialDerived.gasPressureKPa,
  true,
);
assert.equal(pumped.maxPressureKPa, deriveFreePhysicalState(pumped, baseConfig).gasPressureKPa);

const accepted = applyFreePumpStroke(
  initial,
  baseConfig,
  { ...controls, pumpValveOpen: true },
  { atS: 2, strength: 1 },
);
assert.equal(accepted.accepted, true);
assert.equal(accepted.reason, 'accepted');
assert.equal(accepted.state.pumpStrokeCount, 1);
assert.equal(accepted.state.gasTemperatureK, initial.gasTemperatureK, 'accepted pump stroke should queue heating instead of applying it instantly');
assert.equal(accepted.state.wallTemperatureK, initial.wallTemperatureK);
assert.equal(
  accepted.state.maxPressureKPa,
  initial.maxPressureKPa,
  'accepted pump stroke should not raise max pressure before the continuous stroke progresses',
);
assert.equal(
  stepFreePhysics(accepted.state, baseConfig, controls, FREE_PUMP_STROKE_DURATION_S, 2 + FREE_PUMP_STROKE_DURATION_S).maxPressureKPa > initial.maxPressureKPa,
  true,
  'continuous pump progress should raise max pressure after the stroke advances',
);

const rejectCases: Array<[
  string,
  HeatCapacityFreePhysicsState,
  HeatCapacityFreeControls,
]> = [
  ['pumpValveClosed', initial, controls],
  ['stopcockOpen', initial, { ...controls, pumpValveOpen: true, stopcockOpen: true }],
  [
    'pressureDanger',
    createThermodynamicTestState(initial, {
      gasAmountRatio: 3,
      maxPressureKPa: deriveFreePhysicalState(
        createThermodynamicTestState(initial, { gasAmountRatio: 3 }),
        baseConfig,
      ).gasPressureKPa,
    }),
    { ...controls, pumpValveOpen: true },
  ],
];

for (const [expectedReason, state, caseControls] of rejectCases) {
  const result = applyFreePumpStroke(state, baseConfig, caseControls, { atS: 3, strength: 1 });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, expectedReason);
  assert.deepEqual(result.state, state, `${expectedReason} reject must not mutate physical state`);
}

{
  let state = createDefaultFreePhysicsState(baseConfig);
  for (let index = 0; index < 4; index += 1) {
    state = pumpOnce(state, index * 0.1);
  }
  for (let step = 0; step < 90; step += 1) {
    state = stepFreePhysics(state, baseConfig, controls, 1, step + 1);
  }
  const u1Mv = deriveFreePhysicalState(state, baseConfig).pressureDeltaKPa * 20;
  assert.ok(u1Mv >= 26);
  assert.ok(u1Mv <= 30);
}

{
  let state = createDefaultFreePhysicsState(baseConfig);
  for (let index = 0; index < 16; index += 1) {
    state = pumpOnce(state, index * 0.1);
  }
  for (let step = 0; step < 90; step += 1) {
    state = stepFreePhysics(state, baseConfig, controls, 1, step + 1);
  }
  const u1Mv = deriveFreePhysicalState(state, baseConfig).pressureDeltaKPa * 20;
  assert.ok(u1Mv >= 108);
  assert.ok(u1Mv <= 120);
}

const aboveAmbient = createThermodynamicTestState(initial, {
  gasAmountRatio: 1.1,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK,
});

const createAboveAmbientReleaseState = (
  config = baseConfig,
): HeatCapacityFreePhysicsState => createThermodynamicTestState(
  createDefaultFreePhysicsState(config),
  {
    gasAmountRatio: 1.08,
    gasTemperatureK: config.environment.ambientTemperatureK,
  },
  config,
);

const releaseForDuration = (
  durationS: number,
  config = baseConfig,
) => stepFreePhysics(
  createAboveAmbientReleaseState(config),
  config,
  releaseControls,
  durationS,
  200 + durationS,
);

const releasedAmountLossForDuration = (
  durationS: number,
  config = baseConfig,
) => {
  const before = createAboveAmbientReleaseState(config);
  const after = releaseForDuration(durationS, config);
  return before.gasAmountRatio - after.gasAmountRatio;
};

const loss003 = releasedAmountLossForDuration(0.03);
const loss005 = releasedAmountLossForDuration(0.05);
const loss010 = releasedAmountLossForDuration(0.1);
const lossStandard = releasedAmountLossForDuration(HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS);

assert.equal(loss003 > 0, true, '0.03s should still create a real but small release');
assert.equal(
  loss003 < loss005 && loss005 < loss010 && loss010 < lossStandard,
  true,
  'release loss should increase with open duration',
);

const apertureProbeConfig = {
  ...baseConfig,
  stopcockFlowRate: 0.2,
} as HeatCapacityFreePhysicsConfig;
const apertureProbeLoss003 = releasedAmountLossForDuration(0.03, apertureProbeConfig);
const apertureProbeLossStandard = releasedAmountLossForDuration(
  HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  apertureProbeConfig,
);
assert.equal(
  apertureProbeLoss003 / apertureProbeLossStandard < 0.03,
  true,
  '0.03s loss should be much smaller than the old full-aperture proportional duration',
);

let flicker = createAboveAmbientReleaseState();
let flickerAtS = 300;
for (let index = 0; index < 20; index += 1) {
  const stopcockOpen = index % 2 === 0;
  flickerAtS += 0.015;
  flicker = stepFreePhysics(flicker, baseConfig, stopcockOpen ? releaseControls : controls, 0.015, flickerAtS);
  assert.equal(Number.isFinite(flicker.gasAmountRatio), true);
  assert.equal(Number.isFinite(flicker.gasTemperatureK), true);
  assert.equal(flicker.currentStopcockOpenDurationS >= 0, true);
}
const afterFlicker = stepFreePhysics(flicker, baseConfig, controls, 0.2, flickerAtS + 0.2);
assert.equal(afterFlicker.currentStopcockOpenDurationS, 0);

const ventStarted = stepFreePhysics(
  aboveAmbient,
  baseConfig,
  releaseControls,
  0.01,
  20.01,
);
const vented = stepFreePhysics(
  ventStarted,
  baseConfig,
  releaseControls,
  0.2,
  20.21,
);
assert.equal(vented.gasAmountRatio < aboveAmbient.gasAmountRatio, true, 'above-ambient pressure should vent gas out');
assert.deepEqual(
  stepFreePhysics(
    stepFreePhysics(aboveAmbient, leakageConfig, releaseControls, 0.01, 20.01),
    leakageConfig,
    releaseControls,
    0.2,
    20.21,
  ),
  vented,
  'micro-leak config should not alter the open-stopcock release path',
);

const belowAmbient = createThermodynamicTestState(initial, {
  gasAmountRatio: 0.92,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK,
});
const filled = stepFreePhysics(
  belowAmbient,
  baseConfig,
  { ...controls, stopcockOpen: true },
  0.2,
  21,
);
assert.equal(filled.gasAmountRatio > belowAmbient.gasAmountRatio, true, 'below-ambient pressure should draw gas in');

const { pumpedState: state1, settledState: settled } = createPumpedSequence();
const settledDerived = deriveFreePhysicalState(settled, baseConfig);
const opened = stepFreePhysics(
  settled,
  baseConfig,
  releaseControls,
  0.01,
  50.01,
);
assert.notEqual(opened.releaseReference, null);
assert.equal(opened.releaseReference?.openedAtS, 50.01);
assert.equal(opened.releaseReference?.pressureBeforeKPa, settledDerived.gasPressureKPa);
assert.equal(opened.releaseReference?.temperatureBeforeK, settled.gasTemperatureK);
assert.equal(opened.releaseReference?.amountBeforeRatio, settled.gasAmountRatio);
assert.equal(opened.gasAmountRatio < settled.gasAmountRatio, true, 'open-stopcock flow should immediately reduce gas amount');
assert.equal(opened.gasTemperatureK < settled.gasTemperatureK, true, 'open-stopcock flow should cool the remaining gas by outflow energy');

const halfReleased = stepFreePhysics(opened, baseConfig, releaseControls, 0.1, 50.11);
assert.equal(
  halfReleased.gasAmountRatio < settled.gasAmountRatio && halfReleased.gasAmountRatio > initial.gasAmountRatio,
  true,
  '0.1 s after opening should be a partial continuous release between pumped and fully released amount',
);
const partialClosed = stepFreePhysics(halfReleased, baseConfig, controls, 0.1, 50.21);
assert.equal(partialClosed.gasAmountRatio, halfReleased.gasAmountRatio, 'partial release amount should be preserved after closing');

const quickReleased = stepFreePhysics(opened, baseConfig, releaseControls, 0.2, 50.21);
expectClose(
  deriveFreePhysicalState(quickReleased, baseConfig).gasPressureKPa,
  baseConfig.environment.ambientPressureKPa,
  0.15,
  'quick continuous release should approach ambient pressure',
);
let recovered = quickReleased;
for (let index = 0; index < 50; index += 1) {
  recovered = stepFreePhysics(recovered, baseConfig, controls, 0.5, 51 + index * 0.5);
}
assert.equal(settled.gasAmountRatio > initial.gasAmountRatio, true, 'state 2 amount should remain above initial after pumping');
assert.equal(quickReleased.gasAmountRatio < settled.gasAmountRatio, true, 'state 3 quick release should reduce amount');
assert.equal(quickReleased.gasAmountRatio > initial.gasAmountRatio, true, 'state 3 amount should remain above initial after a good release');
assert.equal(recovered.gasAmountRatio, quickReleased.gasAmountRatio, 'state 4 recovery should preserve state 3 amount');
assert.equal(
  state1.gasTemperatureK > initial.gasTemperatureK,
  true,
  'state 1 should gain temperature from retained pump flow work',
);
assert.equal(
  settled.gasTemperatureK < state1.gasTemperatureK &&
    settled.gasTemperatureK > initial.gasTemperatureK,
  true,
  'state 2 should cool continuously toward ambient without a scripted temperature reset',
);
assert.equal(quickReleased.gasTemperatureK < initial.gasTemperatureK, true, 'state 3 temperature should drop below ambient');
assert.equal(recovered.gasTemperatureK > quickReleased.gasTemperatureK, true, 'state 4 temperature should recover from release cooling');
assert.equal(recovered.gasTemperatureK < initial.gasTemperatureK, true, 'state 4 should still recover gradually through wall inertia');
assert.equal(
  settledDerived.gasPressureKPa > initialDerived.gasPressureKPa,
  true,
  'state 2 pressure should be above ambient after pumping',
);
assert.equal(
  settledDerived.gasPressureKPa > deriveFreePhysicalState(recovered, baseConfig).gasPressureKPa,
  true,
  'P2 should be greater than P4',
);
assert.equal(
  deriveFreePhysicalState(recovered, baseConfig).gasPressureKPa > deriveFreePhysicalState(quickReleased, baseConfig).gasPressureKPa,
  true,
  'P4 should be greater than P3',
);
expectClose(
  deriveFreePhysicalState(quickReleased, baseConfig).gasPressureKPa,
  baseConfig.environment.ambientPressureKPa,
  0.15,
  'P3 should be ambient immediately after quick release',
);
const deltaPBefore = settledDerived.pressureDeltaKPa;
const deltaPAfter = deriveFreePhysicalState(recovered, baseConfig).pressureDeltaKPa;
expectClose(
  deltaPAfter,
  deltaPBefore * (1 - 1 / baseConfig.gamma),
  0.35,
  'quick-release recovery should follow the locked adiabatic formula',
);

let longOpen = opened;
for (let index = 0; index < 120; index += 1) {
  longOpen = stepFreePhysics(
    longOpen,
    baseConfig,
    releaseControls,
    0.25,
    60 + index * 0.25,
  );
}
expectClose(
  deriveFreePhysicalState(longOpen, baseConfig).gasPressureKPa,
  baseConfig.environment.ambientPressureKPa,
  0.03,
  'long-open pressure should approach ambient without rebound',
);
expectClose(
  longOpen.gasTemperatureK,
  baseConfig.environment.ambientTemperatureK,
  0.7,
  'long-open temperature should approach ambient without rebound',
);

const afterState4Closed = stepFreePhysics(recovered, baseConfig, controls, 1, 100);
assert.equal(afterState4Closed.gasAmountRatio, recovered.gasAmountRatio, 'state 4 closed wait should preserve amount');
const reopenStarted = stepFreePhysics(
  afterState4Closed,
  baseConfig,
  releaseControls,
  0.01,
  101.01,
);
const reopened = stepFreePhysics(
  reopenStarted,
  baseConfig,
  releaseControls,
  0.1,
  101.11,
);
assert.equal(
  reopened.gasAmountRatio < afterState4Closed.gasAmountRatio,
  true,
  'reopening after recovery should vent again while pressure remains above ambient',
);

const deterministicA = stepFreePhysics(opened, baseConfig, releaseControls, 0.1, 70);
const deterministicB = stepFreePhysics(opened, baseConfig, releaseControls, 0.1, 70);
assert.deepEqual(deterministicA, deterministicB, 'physics stepping should be deterministic from explicit inputs');
assert.deepEqual(
  applyFreePumpStroke(initial, baseConfig, { ...controls, pumpValveOpen: true }, { atS: 5, strength: 0.8 }),
  applyFreePumpStroke(initial, baseConfig, { ...controls, pumpValveOpen: true }, { atS: 5, strength: 0.8 }),
  'pump events should be deterministic from explicit inputs',
);

const physicsSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreePhysicsEngine.ts'),
  'utf8',
);
assert.doesNotMatch(physicsSource, /Date\.now\s*\(/, 'free physics must not depend on Date.now()');
assert.doesNotMatch(physicsSource, /Math\.random\s*\(/, 'free physics must not depend on randomness');

console.log('heatCapacityFreePhysicsEngine tests passed');
