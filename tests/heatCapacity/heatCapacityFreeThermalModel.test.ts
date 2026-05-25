import assert from 'node:assert/strict';
import {
  calculateFreeGasHeatCapacityJPerK,
  calculateFreeGasMoles,
  createDefaultFreeThermalState,
  normalizeFreeThermalConfig,
  stepFreeThermalState,
} from '../../src/domain/heatCapacity/heatCapacityFreeThermalModel.ts';

const config = {
  gasWallConductanceWPerK: 0.22,
  wallAmbientConductanceWPerK: 0.45,
  wallHeatCapacityJPerK: 45,
  minimumGasHeatCapacityJPerK: 0.1,
};

const input = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  vesselVolumeL: 2,
  gamma: 1.4,
  gasAmountRatio: 1.06,
  dtS: 1,
};

{
  const state = createDefaultFreeThermalState(298.15);
  assert.equal(state.gasTemperatureK, 298.15);
  assert.equal(state.wallTemperatureK, 298.15);
}

{
  const moles = calculateFreeGasMoles(input);
  assert.ok(moles > 0.08 && moles < 0.09);
  const heatCapacity = calculateFreeGasHeatCapacityJPerK(input, 0.1);
  assert.ok(heatCapacity > 1.7 && heatCapacity < 1.9);
}

{
  const result = stepFreeThermalState({
    gasTemperatureK: 305.35,
    wallTemperatureK: 298.15,
  }, config, input);
  assert.ok(result.state.gasTemperatureK < 305.35);
  assert.ok(result.state.wallTemperatureK > 298.15);
  assert.ok(result.heatGasToWallJ > 0);
  assert.ok(result.heatWallToAmbientJ >= 0);
}

{
  const result = stepFreeThermalState({
    gasTemperatureK: 305.35,
    wallTemperatureK: 298.15,
  }, config, { ...input, dtS: 1 });
  const initialExcessK = 305.35 - 298.15;
  const remainingExcessK = result.state.gasTemperatureK - 298.15;
  assert.ok(remainingExcessK / initialExcessK > 0.7);
}

{
  const result = stepFreeThermalState({
    gasTemperatureK: 298.15,
    wallTemperatureK: 298.15,
  }, config, {
    ...input,
    ambientTemperatureK: 303.15,
    dtS: 1,
  });
  assert.ok(result.state.wallTemperatureK > 298.15);
  assert.ok(result.state.wallTemperatureK < 303.15);
  assert.ok(result.state.gasTemperatureK >= 298.15);
  assert.ok(result.state.gasTemperatureK < 303.15);
}

{
  const normalized = normalizeFreeThermalConfig({
    gasWallConductanceWPerK: Number.POSITIVE_INFINITY,
    wallAmbientConductanceWPerK: -1,
    wallHeatCapacityJPerK: 0,
    minimumGasHeatCapacityJPerK: Number.NaN,
  });
  assert.equal(normalized.gasWallConductanceWPerK, 0.22);
  assert.equal(normalized.wallAmbientConductanceWPerK, 0);
  assert.equal(normalized.wallHeatCapacityJPerK, 1);
  assert.equal(normalized.minimumGasHeatCapacityJPerK, 0.1);
}

console.log('heatCapacityFreeThermalModel tests passed');
