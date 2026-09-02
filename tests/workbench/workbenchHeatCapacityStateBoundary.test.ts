import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getHeatCapacityGaugePressureState as getGaugeFromFacade,
  getHeatCapacityStopcockState as getStopcockFromFacade,
} from '../../src/features/workbench/workbenchState.ts';
import {
  getHeatCapacityGaugePressureState,
  getHeatCapacityStopcockState,
} from '../../src/features/workbench/workbenchHeatCapacityInstrumentState.ts';

const facadeSource = readFileSync(
  new URL('../../src/features/workbench/workbenchState.ts', import.meta.url),
  'utf8',
);
const stateTypesSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityStateTypes.ts', import.meta.url),
  'utf8',
);
const instrumentStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityInstrumentState.ts', import.meta.url),
  'utf8',
);
const authorityTransactionSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeAuthorityTransaction.ts', import.meta.url),
  'utf8',
);
const authoritySource = readFileSync(
  new URL('../../docs/architecture/workbench-heat-capacity-state-authority.md', import.meta.url),
  'utf8',
);

assert.equal(
  getGaugeFromFacade,
  getHeatCapacityGaugePressureState,
  'the compatibility facade should forward the extracted gauge-state API',
);
assert.equal(
  getStopcockFromFacade,
  getHeatCapacityStopcockState,
  'the compatibility facade should forward the extracted stopcock-state API',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityStateTypes\.ts'/,
  'the compatibility facade should explicitly forward the heat-capacity state types',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityInstrumentState\.ts'/,
  'the compatibility facade should explicitly forward the extracted instrument-state API',
);
assert.doesNotMatch(
  stateTypesSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the heat-capacity state type boundary must not depend back on the compatibility facade',
);
assert.doesNotMatch(
  instrumentStateSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the extracted instrument-state module must not depend back on the compatibility facade',
);
assert.doesNotMatch(
  authorityTransactionSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the Free authority transaction must not depend back on the compatibility facade',
);
assert.match(
  authorityTransactionSource,
  /export const transactHeatCapacityFreeAuthority/,
  'the extracted authority boundary should expose one transaction entrypoint',
);
assert.match(
  authorityTransactionSource,
  /export const selectHeatCapacityFreeActiveRunConfigSnapshot/,
  'the retired top-level snapshot mirror must have one authority selector',
);
assert.doesNotMatch(
  stateTypesSource,
  /heatCapacityFreeActiveRunConfigSnapshot:/,
  'the retired active-config mirror must stay out of current workbench state',
);
assert.match(
  stateTypesSource,
  /Sole authority for Free experiment-group history, progress, calculation, and results/,
  'the state type should identify the Free experiment-group authority',
);
assert.match(
  authoritySource,
  /heatCapacityFreeExperimentGroups[\s\S]*唯一权威/,
  'the authority table should identify the Free experiment-group collection as the sole authority',
);
assert.match(
  authoritySource,
  /下一大改动断点是继续删除批次、试次、轨迹和当前尝试等高频运行镜像/,
  'the authority table should preserve the next high-risk persistence breakpoint',
);

console.log('workbenchHeatCapacityStateBoundary tests passed');
