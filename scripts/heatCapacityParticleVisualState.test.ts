import assert from 'node:assert/strict';
import {
  applyHeatCapacityAction,
  calculateGamma,
  createHeatCapacityExperiment,
  getHeatCapacityParticleVisualState,
} from '../utils/heatCapacityExperiment.ts';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const equalizing = applyHeatCapacityAction(
  createHeatCapacityExperiment({ ambientPressure: 100, ambientTemperature: 1 }),
  { type: 'setInstrumentPower', powered: true },
);
const equalVisual = getHeatCapacityParticleVisualState(equalizing);
assert.equal(equalVisual.outflowActive, false);
assert.equal(equalVisual.outflowIntensity, 0);
assert.ok(equalVisual.densityMultiplier >= 0.95 && equalVisual.densityMultiplier <= 1.05);
assert.ok(equalVisual.speedMultiplier >= 0.95 && equalVisual.speedMultiplier <= 1.05);

const pumping = applyHeatCapacityAction(
  applyHeatCapacityAction(equalizing, { type: 'recordP0' }),
  { type: 'pump', strokes: 6 },
);
const pumpingVisual = getHeatCapacityParticleVisualState(pumping);
assert.equal(pumpingVisual.outflowActive, false);
assert.ok(pumpingVisual.densityMultiplier > equalVisual.densityMultiplier);
assert.ok(pumpingVisual.speedMultiplier > equalVisual.speedMultiplier);
assert.equal(pumpingVisual.color, '#fb923c');

const stabilizing = applyHeatCapacityAction(pumping, { type: 'stabilizeP1' });
const stabilizingVisual = getHeatCapacityParticleVisualState(stabilizing);
assert.ok(stabilizingVisual.densityMultiplier >= pumpingVisual.densityMultiplier * 0.95);
assert.ok(stabilizingVisual.speedMultiplier < pumpingVisual.speedMultiplier);
assert.equal(stabilizingVisual.outflowActive, false);

const recordP1 = applyHeatCapacityAction(stabilizing, { type: 'stabilizeP1' });
const recordP1Visual = getHeatCapacityParticleVisualState(recordP1);
assert.ok(recordP1Visual.densityMultiplier >= stabilizingVisual.densityMultiplier * 0.98);
assert.ok(recordP1Visual.speedMultiplier <= stabilizingVisual.speedMultiplier + 0.05);

const releasing = applyHeatCapacityAction(recordP1, { type: 'recordP1' });
const releasingVisual = getHeatCapacityParticleVisualState(releasing);
assert.equal(releasingVisual.outflowActive, true);
assert.ok(releasingVisual.outflowIntensity > 0);
assert.ok(releasingVisual.densityMultiplier < recordP1Visual.densityMultiplier);
assert.equal(releasingVisual.color, '#7dd3fc');

const recovering = applyHeatCapacityAction(
  applyHeatCapacityAction(releasing, { type: 'release', durationMs: 420, closeDelayMs: 0 }),
  { type: 'recover' },
);
const recoveringVisual = getHeatCapacityParticleVisualState(recovering);
assert.equal(recoveringVisual.outflowActive, false);
assert.ok(recoveringVisual.speedMultiplier >= 0.9 && recoveringVisual.speedMultiplier <= 1.15);
assert.notEqual(recoveringVisual.color, releasingVisual.color);

const completed = applyHeatCapacityAction(recovering, { type: 'recordP2' });
const beforeVisualRead = clone(completed);
const completedVisual = getHeatCapacityParticleVisualState(completed);
assert.deepEqual(completed, beforeVisualRead);
assert.equal(completedVisual.outflowActive, false);
assert.equal(completedVisual.outflowIntensity, 0);
assert.ok(completed.result);
assert.equal(calculateGamma(completed.recorded.p0 ?? 0, completed.recorded.p1 ?? 0, completed.recorded.p2 ?? 0), completed.result.gamma);

console.log('heatCapacityParticleVisualState tests passed');
