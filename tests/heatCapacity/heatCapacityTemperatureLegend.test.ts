import assert from 'node:assert/strict';
import { getHeatCapacityHardSphereTemperatureLegend, HEAT_CAPACITY_HARD_SPHERE_TEMPERATURE_PALETTES } from '../../src/domain/heatCapacity/heatCapacityHardSphereColor.ts';
import { getHeatCapacityHardSphereVisualState } from '../../src/domain/heatCapacity/heatCapacityHardSphereModel.ts';

for (const theme of ['light', 'dark'] as const) {
  for (const ambientK of [298.15, 293.15, 301.65]) {
    const legend = getHeatCapacityHardSphereTemperatureLegend(theme, ambientK);
    for (const [temperatureC, expectedFactor] of [[legend.minC, 0], [legend.maxC, 1]]) {
      const visual = getHeatCapacityHardSphereVisualState({
        ambientTemperatureK: ambientK, gasTemperatureK: temperatureC + 273.15,
        temperatureMv: 1499, pressureMv: 0, phase: 'zeroed',
        glassStopcockOpen: false, pumpValveOpen: false, pumpBulbState: 'idle',
      });
      assert.equal(visual.temperatureColorFactor, expectedFactor, 'legend endpoints match actual sphere color normalization');
    }
    assert.ok(legend.gradient.startsWith('linear-gradient(90deg in srgb,'));
    for (const stop of HEAT_CAPACITY_HARD_SPHERE_TEMPERATURE_PALETTES[theme]) {
      assert.ok(legend.gradient.includes(`${stop.color} ${stop.at * 100}%`));
    }
  }
}
assert.equal(getHeatCapacityHardSphereTemperatureLegend('light').minC, 20);
assert.equal(getHeatCapacityHardSphereTemperatureLegend('light').maxC, 28);
assert.equal(getHeatCapacityHardSphereTemperatureLegend('dark', NaN).minC, 20);
console.log('Temperature legend and sphere color range tests passed.');
