import assert from 'node:assert/strict';

import {
  HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
  applyHeatCapacityMassEnergyFlux,
  createHeatCapacityThermodynamicStateAtAmbient,
  createReducedFlowWorkPumpEnergyFluxV1,
  deriveHeatCapacityMolarProperties,
  deriveHeatCapacityThermodynamicState,
  normalizeReducedFlowWorkPumpRetentionV1,
  stepHeatCapacityThermodynamicHeatExchange,
} from '../../src/domain/heatCapacity/heatCapacityThermodynamicKernel.ts';

const expectClose = (
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: expected ${actual} within ${tolerance} of ${expected}`,
  );
};

const ambient = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  vesselVolumeL: 2,
  gammaTrue: 1.4,
};

{
  const initialized = createHeatCapacityThermodynamicStateAtAmbient(ambient);
  const derived = deriveHeatCapacityThermodynamicState(initialized.state, initialized.system);
  expectClose(derived.gasTemperatureK, ambient.ambientTemperatureK, 1e-10, 'initial gas temperature');
  expectClose(derived.wallTemperatureK, ambient.ambientTemperatureK, 1e-10, 'initial wall temperature');
  expectClose(derived.gasPressureKPa, ambient.ambientPressureKPa, 1e-10, 'initial gas pressure');
  expectClose(derived.gasAmountRatio, 1, 1e-12, 'initial amount ratio');
}

{
  const initialized = createHeatCapacityThermodynamicStateAtAmbient(ambient);
  const amountDeltaMol = initialized.system.referenceAmountMol * 0.04;
  const carriedEnergyJ = amountDeltaMol *
    deriveHeatCapacityMolarProperties(ambient.gammaTrue).cvMolarJPerMolK *
    ambient.ambientTemperatureK;
  const next = applyHeatCapacityMassEnergyFlux(initialized.state, {
    source: 'test-inflow',
    amountDeltaMol,
    internalEnergyDeltaJ: carriedEnergyJ,
  });
  const derived = deriveHeatCapacityThermodynamicState(next, initialized.system);
  expectClose(derived.gasTemperatureK, ambient.ambientTemperatureK, 1e-10, 'ambient inflow temperature');
  expectClose(derived.gasAmountRatio, 1.04, 1e-12, 'mass flux amount ratio');
  expectClose(
    derived.gasPressureKPa,
    derived.amountMol * HEAT_CAPACITY_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K *
      derived.gasTemperatureK / (ambient.vesselVolumeL / 1000) / 1000,
    1e-10,
    'ideal-gas state equation',
  );
}

{
  const initialized = createHeatCapacityThermodynamicStateAtAmbient(ambient);
  const amountDeltaMol = initialized.system.referenceAmountMol * 0.003;
  const pump = createReducedFlowWorkPumpEnergyFluxV1({
    amountDeltaMol,
    ambientTemperatureK: ambient.ambientTemperatureK,
    gammaTrue: ambient.gammaTrue,
    pumpWorkRetention: 0.35,
  });
  expectClose(
    pump.ledger.vesselInternalEnergyGainJ,
    pump.ledger.environmentInternalEnergyJ + pump.ledger.retainedFlowWorkJ,
    1e-12,
    'pump vessel-energy ledger',
  );
  expectClose(
    pump.ledger.idealFlowWorkJ,
    pump.ledger.retainedFlowWorkJ + pump.ledger.externalLossJ,
    1e-12,
    'pump ideal-work ledger',
  );
  expectClose(
    pump.flux.internalEnergyDeltaJ,
    pump.ledger.vesselInternalEnergyGainJ,
    1e-12,
    'pump flux energy',
  );
  const pumpedState = applyHeatCapacityMassEnergyFlux(initialized.state, pump.flux);
  assert.equal(
    deriveHeatCapacityThermodynamicState(pumpedState, initialized.system).gasTemperatureK >
      ambient.ambientTemperatureK,
    true,
    'retained flow work should increase gas temperature without a fixed-K increment',
  );
}

{
  assert.equal(normalizeReducedFlowWorkPumpRetentionV1(-1), 0);
  assert.equal(normalizeReducedFlowWorkPumpRetentionV1(0.5), 0.5);
  assert.equal(normalizeReducedFlowWorkPumpRetentionV1(2), 1);
  assert.equal(normalizeReducedFlowWorkPumpRetentionV1(Number.NaN), 0);
  assert.throws(
    () => createReducedFlowWorkPumpEnergyFluxV1({
      amountDeltaMol: 0.001,
      ambientTemperatureK: ambient.ambientTemperatureK,
      gammaTrue: ambient.gammaTrue,
      pumpWorkRetention: 1,
    }),
    /ideal-upper-bound-test/,
    'retention one must not become a production default',
  );
  const idealUpperBound = createReducedFlowWorkPumpEnergyFluxV1({
    amountDeltaMol: 0.001,
    ambientTemperatureK: ambient.ambientTemperatureK,
    gammaTrue: ambient.gammaTrue,
    pumpWorkRetention: 1,
    usage: 'ideal-upper-bound-test',
  });
  expectClose(idealUpperBound.ledger.externalLossJ, 0, 1e-12, 'ideal upper-bound loss');
}

{
  const air = createHeatCapacityThermodynamicStateAtAmbient(ambient);
  const helium = createHeatCapacityThermodynamicStateAtAmbient({ ...ambient, gammaTrue: 5 / 3 });
  const amountRatioDelta = 0.003;
  const pumpAir = createReducedFlowWorkPumpEnergyFluxV1({
    amountDeltaMol: air.system.referenceAmountMol * amountRatioDelta,
    ambientTemperatureK: ambient.ambientTemperatureK,
    gammaTrue: air.system.gammaTrue,
    pumpWorkRetention: 0.4,
  });
  const pumpHelium = createReducedFlowWorkPumpEnergyFluxV1({
    amountDeltaMol: helium.system.referenceAmountMol * amountRatioDelta,
    ambientTemperatureK: ambient.ambientTemperatureK,
    gammaTrue: helium.system.gammaTrue,
    pumpWorkRetention: 0.4,
  });
  const airTemperatureK = deriveHeatCapacityThermodynamicState(
    applyHeatCapacityMassEnergyFlux(air.state, pumpAir.flux),
    air.system,
  ).gasTemperatureK;
  const heliumTemperatureK = deriveHeatCapacityThermodynamicState(
    applyHeatCapacityMassEnergyFlux(helium.state, pumpHelium.flux),
    helium.system,
  ).gasTemperatureK;
  assert.equal(
    heliumTemperatureK > airTemperatureK,
    true,
    'gammaTrue should affect Cv and the retained-work temperature response',
  );
}

{
  const initialized = createHeatCapacityThermodynamicStateAtAmbient(ambient);
  const { cvMolarJPerMolK } = deriveHeatCapacityMolarProperties(ambient.gammaTrue);
  const hotState = {
    ...initialized.state,
    internalEnergyJ: initialized.state.amountMol * cvMolarJPerMolK * 308.15,
  };
  const wallHeatCapacityJPerK = 45;
  const initialClosedEnergyJ = hotState.internalEnergyJ +
    wallHeatCapacityJPerK * hotState.wallTemperatureK;
  const exchange = stepHeatCapacityThermodynamicHeatExchange(
    hotState,
    initialized.system,
    {
      ambientTemperatureK: ambient.ambientTemperatureK,
      gasWallConductanceWPerK: 0.14,
      wallAmbientConductanceWPerK: 0,
      wallHeatCapacityJPerK,
    },
    1,
  );
  const finalClosedEnergyJ = exchange.state.internalEnergyJ +
    wallHeatCapacityJPerK * exchange.state.wallTemperatureK;
  expectClose(finalClosedEnergyJ, initialClosedEnergyJ, 1e-9, 'closed gas-wall energy conservation');
  assert.equal(exchange.state.amountMol, hotState.amountMol, 'heat exchange should preserve gas amount');
  assert.equal(exchange.ledger.heatGasToWallJ > 0, true);
  assert.equal(exchange.ledger.heatWallToAmbientJ, 0);
  const derived = deriveHeatCapacityThermodynamicState(exchange.state, initialized.system);
  assert.equal(derived.gasTemperatureK < 308.15, true);
  assert.equal(derived.wallTemperatureK > ambient.ambientTemperatureK, true);
}

console.log('heatCapacityThermodynamicKernel tests passed');
