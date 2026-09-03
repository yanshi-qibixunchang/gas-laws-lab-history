import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState as applyParameterDraftFromFacade,
  configureHeatCapacityFreeBatchWorkbenchState as configureBatchFromFacade,
  createDefaultHeatCapacityFreeParameterState as createDefaultParameterStateFromFacade,
  freezeHeatCapacityFreeParametersForCurrentGroup as freezeParametersFromFacade,
  getActiveHeatCapacityFreeTrialIndex as getActiveTrialIndexFromFacade,
  getHeatCapacityGaugePressureState as getGaugeFromFacade,
  getHeatCapacityFreeParameterLockReason as getParameterLockReasonFromFacade,
  getHeatCapacityStopcockState as getStopcockFromFacade,
  mergeHeatCapacityFreeRuntimeState as mergeRuntimeFromFacade,
  resetHeatCapacityFreeRunWorkbenchState as resetFreeRunFromFacade,
  setHeatCapacityFreeParameterSchemeWorkbenchState as setParameterSchemeFromFacade,
} from '../../src/features/workbench/workbenchState.ts';
import {
  getHeatCapacityGaugePressureState,
  getHeatCapacityStopcockState,
} from '../../src/features/workbench/workbenchHeatCapacityInstrumentState.ts';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  createDefaultHeatCapacityFreeParameterState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityFreeParameterLockReason,
} from '../../src/features/workbench/workbenchHeatCapacityFreeParameterState.ts';
import {
  resetHeatCapacityFreeRunWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRunReset.ts';
import {
  mergeHeatCapacityFreeRuntimeState,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRuntimeState.ts';
import {
  getActiveHeatCapacityFreeTrialIndex,
} from '../../src/features/workbench/workbenchHeatCapacityFreeTrialState.ts';
import {
  configureHeatCapacityFreeBatchWorkbenchState,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityFreeExperimentGroupState.ts';

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
const parameterStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeParameterState.ts', import.meta.url),
  'utf8',
);
const trialStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeTrialState.ts', import.meta.url),
  'utf8',
);
const experimentGroupStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeExperimentGroupState.ts', import.meta.url),
  'utf8',
);
const freeRuntimeDefaultsSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityRuntimeDefaults.ts', import.meta.url),
  'utf8',
);
const freeRuntimeStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeRuntimeState.ts', import.meta.url),
  'utf8',
);
const freeTraceStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeTraceState.ts', import.meta.url),
  'utf8',
);
const freeRunResetSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeRunReset.ts', import.meta.url),
  'utf8',
);
const authoritySource = readFileSync(
  new URL('../../docs/architecture/workbench-heat-capacity-state-authority.md', import.meta.url),
  'utf8',
);
const workbenchHeatCapacityStateDeclaration = stateTypesSource.match(
  /export interface WorkbenchHeatCapacityState extends WorkbenchFileBase \{[\s\S]*?\n\}/,
)?.[0] ?? '';

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
assert.equal(
  createDefaultParameterStateFromFacade,
  createDefaultHeatCapacityFreeParameterState,
  'the compatibility facade should forward the extracted Free parameter defaults',
);
assert.equal(
  freezeParametersFromFacade,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  'the compatibility facade should forward the extracted parameter-freeze command',
);
assert.equal(
  getParameterLockReasonFromFacade,
  getHeatCapacityFreeParameterLockReason,
  'the compatibility facade should forward the extracted parameter-lock policy',
);
assert.equal(
  getActiveTrialIndexFromFacade,
  getActiveHeatCapacityFreeTrialIndex,
  'the compatibility facade should forward the extracted active-trial selector',
);
assert.equal(
  configureBatchFromFacade,
  configureHeatCapacityFreeBatchWorkbenchState,
  'the compatibility facade should forward the extracted experiment-group configuration command',
);
assert.equal(
  setParameterSchemeFromFacade,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  'the compatibility facade should forward the extracted parameter-scheme command',
);
assert.equal(
  applyParameterDraftFromFacade,
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  'the compatibility facade should forward the parameter-apply command that resets Free runtime',
);
assert.equal(
  mergeRuntimeFromFacade,
  mergeHeatCapacityFreeRuntimeState,
  'the compatibility facade should forward the extracted Free runtime merge API',
);
assert.equal(
  resetFreeRunFromFacade,
  resetHeatCapacityFreeRunWorkbenchState,
  'the compatibility facade should forward the extracted Free run-reset API',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityStateTypes\.ts'/,
  'the compatibility facade should explicitly forward the heat-capacity state types',
);
assert.doesNotMatch(
  trialStateSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the extracted Free trial selectors must not depend back on the compatibility facade',
);
assert.doesNotMatch(
  experimentGroupStateSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the extracted experiment-group module must not depend back on the compatibility facade',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityFreeExperimentGroupState\.ts'/,
  'the compatibility facade should explicitly forward the extracted experiment-group API',
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
assert.doesNotMatch(
  parameterStateSource,
  /from '\.\/workbenchState(?:\.ts)?'/,
  'the extracted Free parameter module must not depend back on the compatibility facade',
);
for (const [source, moduleName] of [
  [freeRuntimeDefaultsSource, 'Free runtime defaults'],
  [freeRuntimeStateSource, 'Free runtime state'],
  [freeTraceStateSource, 'Free trace state'],
  [freeRunResetSource, 'Free run reset'],
] as const) {
  assert.doesNotMatch(
    source,
    /from '\.\/workbenchState(?:\.ts)?'/,
    `the extracted ${moduleName} module must not depend back on the compatibility facade`,
  );
}
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityFreeParameterState\.ts'/,
  'the compatibility facade should explicitly forward the extracted Free parameter API',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityFreeRunReset\.ts'/,
  'the compatibility facade should explicitly forward the extracted Free reset API',
);
assert.match(
  facadeSource,
  /from '\.\/workbenchHeatCapacityFreeRuntimeState\.ts'/,
  'the compatibility facade should explicitly forward the extracted Free runtime merge API',
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
assert.match(
  authorityTransactionSource,
  /export const selectHeatCapacityFreeGasType/,
  'the retired top-level gas mirror must have one authority selector',
);
assert.match(
  authorityTransactionSource,
  /export const selectHeatCapacityFreeAppliedParameterDraft/,
  'the retired applied-parameter mirror must have one reconstruction selector',
);
assert.doesNotMatch(
  stateTypesSource,
  /heatCapacityFreeActiveRunConfigSnapshot:/,
  'the retired active-config mirror must stay out of current workbench state',
);
for (const retiredRuntimeField of [
  'heatCapacityFreeBatch',
  'heatCapacityFreeTraceStore',
  'heatCapacityFreeTrials',
  'heatCapacityFreeActiveAttempt',
  'heatCapacityFreeRecordConfig',
  'heatCapacityFreePressureWarningMv',
  'heatCapacityFreeInstrumentNoiseEnabled',
  'heatCapacityFreeEnvironmentConfig',
  'heatCapacityFreePhysicsConfig',
  'heatCapacityFreeSensorConfig',
  'heatCapacityFreeGasType',
  'heatCapacityFreeParameterDraft',
]) {
  assert.doesNotMatch(
    stateTypesSource,
    new RegExp(`^\\s*${retiredRuntimeField}:`, 'm'),
    `${retiredRuntimeField} must stay out of current workbench state`,
  );
}
assert.match(
  stateTypesSource,
  /interface HeatCapacityFreeRunWorkspace[\s\S]*batch:[\s\S]*traceStore:[\s\S]*trials:[\s\S]*activeAttempt:[\s\S]*currentExperimentStatus:/,
  'the active Free runtime projections should remain grouped in one workspace',
);
assert.match(
  stateTypesSource,
  /interface HeatCapacityFreeInstrumentConfigWorkspace[\s\S]*record:[\s\S]*pressureWarningMv:[\s\S]*instrumentNoiseEnabled:[\s\S]*environment:[\s\S]*physics:[\s\S]*sensor:/,
  'the low-frequency Free instrument configuration should remain grouped',
);
assert.match(
  stateTypesSource,
  /interface HeatCapacityFreeInstrumentStateWorkspace[\s\S]*physics:[\s\S]*sensor:[\s\S]*calibration:/,
  'the high-frequency Free instrument state should remain grouped',
);
assert.match(
  workbenchHeatCapacityStateDeclaration,
  /heatCapacityFreeInstrumentState:\s*HeatCapacityFreeInstrumentStateWorkspace/,
  'current workbench state should expose one grouped Free instrument state',
);
for (const retiredInstrumentStateField of [
  'heatCapacityFreePhysicsState',
  'heatCapacityFreeSensorState',
  'heatCapacityFreeCalibrationState',
  'heatCapacityFreeExperimentGroupStatus',
]) {
  assert.doesNotMatch(
    workbenchHeatCapacityStateDeclaration,
    new RegExp(`^\\s*${retiredInstrumentStateField}:`, 'm'),
    `${retiredInstrumentStateField} must stay out of current workbench state`,
  );
}
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
  /heatCapacityFreeRunWorkspace\.currentExperimentStatus[\s\S]*Free 运行默认值与完整重置的职责拆分已经完成[\s\S]*下一大改动断点是跨模式计算会话/,
  'the authority table should preserve the next cross-mode coordination breakpoint',
);

console.log('workbenchHeatCapacityStateBoundary tests passed');
