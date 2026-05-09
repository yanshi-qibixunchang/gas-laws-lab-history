import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modelSource = readFileSync(new URL('../components/advancedHeatCapacity/InstrumentProceduralModel.tsx', import.meta.url), 'utf8');

assert.match(
  modelSource,
  /motionsRef/,
  'heat-capacity particles should keep mutable velocity state for wall and particle collisions',
);
assert.match(
  modelSource,
  /resolveElasticParticleCollisions/,
  'heat-capacity particles should resolve elastic collisions between visible balls',
);
assert.match(
  modelSource,
  /velocity\[axis\] \*= -1/,
  'heat-capacity particles should bounce from vessel walls instead of wrapping through boundaries',
);
assert.doesNotMatch(
  modelSource,
  /position\[axis\] = -bound|position\[axis\] = bound/,
  'heat-capacity particles should not teleport from one vessel wall to the opposite wall',
);
assert.match(
  modelSource,
  /revealedCountRef/,
  'visible particles should be gradually revealed so pumping can show particle count increasing',
);

console.log('heatCapacityParticleMotion tests passed');
