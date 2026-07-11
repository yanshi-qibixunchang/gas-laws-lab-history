import assert from 'node:assert/strict';
import {
  isPersistedWorkbenchRunState,
  normalizePersistedChartData,
  normalizePersistedParticles,
  normalizePersistedSimulationStats,
  normalizePersistedVisiblePanels,
} from '../../src/features/workbench/workbenchRuntimePersistence.ts';

assert.equal(isPersistedWorkbenchRunState('paused'), true);
assert.equal(isPersistedWorkbenchRunState('unknown'), false);
assert.equal(normalizePersistedSimulationStats(null).phase, 'idle');
assert.equal(normalizePersistedSimulationStats({ temperature: 1.25 }).temperature, 1.25);
assert.deepEqual(normalizePersistedChartData(null), { speed: [], energy: [], energyLog: [], tempHistory: [] });

const chart = {
  speed: [{ binStart: 0, binEnd: 1, count: 2, probability: 1 }],
  energy: [],
  energyLog: [],
  tempHistory: [],
};
const clonedChart = normalizePersistedChartData(chart);
assert.deepEqual(clonedChart, chart);
assert.notEqual(clonedChart, chart, 'restored chart data should not retain payload references');

const particles = [{ x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, speed: 1, energy: 0.5 }];
const clonedParticles = normalizePersistedParticles(particles);
assert.deepEqual(clonedParticles, particles);
assert.notEqual(clonedParticles, particles, 'restored particles should not retain payload references');
assert.deepEqual(normalizePersistedParticles({}), []);
assert.deepEqual(
  normalizePersistedVisiblePanels(['preview', 'invalid'], ['preview', 'realtime']),
  ['preview'],
);

console.log('workbenchRuntimePersistence tests passed');
