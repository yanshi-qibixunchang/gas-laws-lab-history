import fs from 'node:fs';
import assert from 'node:assert/strict';

const workbenchSource = fs.readFileSync('src/features/workbench/WorkbenchStudioPrototype.tsx', 'utf8');
const workbenchStudioCopySource = fs.readFileSync('src/features/workbench/workbenchStudioCopy.ts', 'utf8');
const engineSource = fs.readFileSync('src/domain/hardSphere/PhysicsEngine.ts', 'utf8');

assert.match(
  engineSource,
  /public\s+getCollectedSampleCount\s*\(\)\s*:\s*number/,
  'PhysicsEngine should expose a collected-sample count for realtime standard charts.',
);

assert.match(
  engineSource,
  /collectedSampleWindowTotal\s*:\s*number\s*=\s*0/,
  'PhysicsEngine should keep a separate cumulative sample-window total.',
);

assert.match(
  engineSource,
  /this\.collectedSampleWindowTotal\s*\+=\s*1/,
  'collected sample-window total should increase once for each accepted sampling window.',
);

assert.doesNotMatch(
  engineSource,
  /collectedSampleTotal\s*\+=\s*this\.particles\.length/,
  'realtime sample display should not count particle samples.',
);

assert.doesNotMatch(
  engineSource,
  /return\s+this\.collectedSpeeds\.length\s*;|return\s+this\.collectedSampleTotal\s*;/,
  'getCollectedSampleCount should not return the capped cache length or particle-sample total.',
);

assert.match(
  engineSource,
  /return\s+this\.collectedSampleWindowTotal\s*;/,
  'getCollectedSampleCount should return accepted sampling windows.',
);

assert.match(
  workbenchSource,
  /sampleCount\s*=\s*activeFile\.kind\s*===\s*'standard'\s*\?\s*runtime\?\.engine\.getCollectedSampleCount\(\)/,
  'standard realtime charts should use accumulated collected samples, not current histogram particle counts.',
);

assert.doesNotMatch(
  workbenchSource,
  /const\s+sampleCount\s*=\s*getHistogramSampleCount\(bins\)/,
  'standard realtime chart sample count should not be derived from the current frame histogram bins.',
);

assert.match(
  workbenchStudioCopySource,
  /sampleWindows:\s*\(count: number\)\s*=>/,
  'standard realtime chart copy should label counts as sampling windows instead of particle samples.',
);

console.log('workbenchStandardRealtimeSamples tests passed');

