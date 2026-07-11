import assert from 'node:assert/strict';
import type { SimulationParams } from '../../src/shared/types.ts';
import {
  WORKBENCH_TRACKED_PARAMETER_KEYS,
  assignWorkbenchParameterValue,
  getWorkbenchAdvancedParameterDefinitions,
  getWorkbenchParameterDefinition,
} from '../../src/features/workbench/workbenchParameterRegistry.ts';

assert.equal(
  new Set(WORKBENCH_TRACKED_PARAMETER_KEYS).size,
  WORKBENCH_TRACKED_PARAMETER_KEYS.length,
  'the parameter registry should define every tracked model field once',
);
assert.deepEqual(
  WORKBENCH_TRACKED_PARAMETER_KEYS,
  ['N', 'L', 'r', 'm', 'k', 'dt', 'nu', 'targetTemperature', 'equilibriumTime', 'statsDuration'],
  'the registry should cover every simulation parameter used by ideal change tracking',
);
assert.deepEqual(
  getWorkbenchAdvancedParameterDefinitions('standard').map(({ key }) => key),
  ['N', 'r', 'L', 'dt', 'nu', 'equilibriumTime', 'statsDuration'],
  'standard parameter rows should preserve their established order',
);
assert.deepEqual(
  getWorkbenchAdvancedParameterDefinitions('ideal').map(({ key }) => key),
  ['N', 'r', 'L', 'dt', 'nu', 'equilibriumTime', 'statsDuration'],
  'ideal advanced settings should expose only registry-owned advanced fields',
);
assert.equal(getWorkbenchParameterDefinition('targetTemperature').surfaceByKind.ideal, 'dedicated');
assert.equal(getWorkbenchParameterDefinition('m').surfaceByKind.ideal, 'internal');
assert.equal(getWorkbenchParameterDefinition('k').surfaceByKind.standard, 'internal');

const params: SimulationParams = {
  N: 100,
  L: 10,
  r: 0.2,
  m: 1,
  k: 1,
  dt: 0.01,
  nu: 0.8,
  targetTemperature: 0.6,
  equilibriumTime: 4,
  statsDuration: 12,
};
assignWorkbenchParameterValue(params, 'N', 123.6);
assignWorkbenchParameterValue(params, 'dt', 0.025);
assert.equal(params.N, 124, 'particle count input should retain integer normalization');
assert.equal(params.dt, 0.025, 'continuous parameter input should retain its numeric value');

console.log('workbenchParameterRegistry tests passed');
