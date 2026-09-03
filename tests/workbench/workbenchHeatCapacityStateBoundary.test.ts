import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState as applyParameterDraftFromFacade,
  completeHeatCapacityCalculationWorkflowWorkbenchState as completeCalculationFromFacade,
  configureHeatCapacityFreeBatchWorkbenchState as configureBatchFromFacade,
  createDefaultHeatCapacityFreeParameterState as createDefaultParameterStateFromFacade,
  freezeHeatCapacityFreeParametersForCurrentGroup as freezeParametersFromFacade,
  getHeatCapacityCalculationSession as getCalculationSessionFromFacade,
  getActiveHeatCapacityFreeTrialIndex as getActiveTrialIndexFromFacade,
  getHeatCapacityGaugePressureState as getGaugeFromFacade,
  getHeatCapacityFreeParameterLockReason as getParameterLockReasonFromFacade,
  getHeatCapacityStopcockState as getStopcockFromFacade,
  mergeHeatCapacityFreeRuntimeState as mergeRuntimeFromFacade,
  ensureHeatCapacityCalculationSessionWorkbenchState as ensureCalculationFromFacade,
  evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState as evaluateAttemptTimeoutFromFacade,
  applyHeatCapacityFreeRecordWorkbenchState as applyRecordFromFacade,
  recordHeatCapacityFreeTraceEvent as recordTraceEventFromFacade,
  removeHeatCapacityFreeTrialRecordWorkbenchState as removeRecordFromFacade,
  selectActiveHeatCapacityWorkbenchDisplay as selectDisplayFromFacade,
  setHeatCapacityFreeStopcockOpen as setFreeStopcockFromFacade,
  resetHeatCapacityFreeRunWorkbenchState as resetFreeRunFromFacade,
  setHeatCapacityFreeParameterSchemeWorkbenchState as setParameterSchemeFromFacade,
} from '../../src/features/workbench/workbenchState.ts';
import {
  completeHeatCapacityCalculationWorkflowWorkbenchState,
  ensureHeatCapacityCalculationSessionWorkbenchState,
  getHeatCapacityCalculationSession,
} from '../../src/features/workbench/workbenchHeatCapacityCalculationCoordinator.ts';
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
import {
  evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityFreeAttemptState.ts';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRecordState.ts';
import {
  recordHeatCapacityFreeTraceEvent,
} from '../../src/features/workbench/workbenchHeatCapacityFreeTraceState.ts';
import {
  removeHeatCapacityFreeTrialRecordWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRollbackState.ts';
import {
  selectActiveHeatCapacityWorkbenchDisplay,
} from '../../src/features/workbench/workbenchHeatCapacityDisplayState.ts';
import {
  setHeatCapacityFreeStopcockOpen,
} from '../../src/features/workbench/workbenchHeatCapacityFreeRuntimeCoordinator.ts';

const facadeSource = readFileSync(
  new URL('../../src/features/workbench/workbenchState.ts', import.meta.url),
  'utf8',
);
const workbenchUiSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
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
const freeAttemptStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeAttemptState.ts', import.meta.url),
  'utf8',
);
const freeRecordStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeRecordState.ts', import.meta.url),
  'utf8',
);
const freeRollbackStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeRollbackState.ts', import.meta.url),
  'utf8',
);
const freeRuntimeCoordinatorSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeRuntimeCoordinator.ts', import.meta.url),
  'utf8',
);
const freeControlStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityFreeControlState.ts', import.meta.url),
  'utf8',
);
const heatCapacityDisplayStateSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityDisplayState.ts', import.meta.url),
  'utf8',
);
const calculationCoordinatorSource = readFileSync(
  new URL(
    '../../src/features/workbench/workbenchHeatCapacityCalculationCoordinator.ts',
    import.meta.url,
  ),
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
assert.equal(
  getCalculationSessionFromFacade,
  getHeatCapacityCalculationSession,
  'the compatibility facade should forward the extracted calculation-session selector',
);
assert.equal(
  ensureCalculationFromFacade,
  ensureHeatCapacityCalculationSessionWorkbenchState,
  'the compatibility facade should forward the extracted calculation-session initializer',
);
assert.equal(
  completeCalculationFromFacade,
  completeHeatCapacityCalculationWorkflowWorkbenchState,
  'the compatibility facade should forward the extracted calculation completion command',
);
assert.equal(
  evaluateAttemptTimeoutFromFacade,
  evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState,
  'the compatibility facade should forward the extracted Free attempt lifecycle API',
);
assert.equal(
  applyRecordFromFacade,
  applyHeatCapacityFreeRecordWorkbenchState,
  'the compatibility facade should forward the extracted Free record API',
);
assert.equal(
  recordTraceEventFromFacade,
  recordHeatCapacityFreeTraceEvent,
  'the compatibility facade should forward the extracted Free trace-evidence API',
);
assert.equal(
  removeRecordFromFacade,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  'the compatibility facade should forward the extracted Free rollback API',
);
assert.equal(
  selectDisplayFromFacade,
  selectActiveHeatCapacityWorkbenchDisplay,
  'the compatibility facade should forward the extracted heat-capacity display selector',
);
assert.equal(
  setFreeStopcockFromFacade,
  setHeatCapacityFreeStopcockOpen,
  'the compatibility facade should forward the extracted Free runtime control API',
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
  [calculationCoordinatorSource, 'cross-mode calculation coordinator'],
  [freeAttemptStateSource, 'Free attempt state'],
  [freeRecordStateSource, 'Free record state'],
  [freeRollbackStateSource, 'Free rollback state'],
  [freeRuntimeCoordinatorSource, 'Free runtime coordinator'],
  [freeControlStateSource, 'Free control state'],
  [heatCapacityDisplayStateSource, 'heat-capacity display state'],
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
  facadeSource,
  /from '\.\/workbenchHeatCapacityCalculationCoordinator\.ts'/,
  'the compatibility facade should explicitly forward the extracted calculation API',
);
assert.match(
  workbenchUiSource,
  /from '\.\/workbenchHeatCapacityCalculationCoordinator\.ts'/,
  'the workbench UI should depend directly on the extracted calculation coordinator',
);
for (const directUiDependency of [
  'workbenchHeatCapacityFreeAttemptState',
  'workbenchHeatCapacityFreeRecordState',
  'workbenchHeatCapacityFreeRollbackState',
  'workbenchHeatCapacityFreeRuntimeCoordinator',
  'workbenchHeatCapacityDisplayState',
]) {
  assert.match(
    workbenchUiSource,
    new RegExp(`from '\\.\\/${directUiDependency}\\.ts'`),
    `the workbench UI should depend directly on ${directUiDependency}`,
  );
}
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
  /heatCapacityFreeRunWorkspace\.currentExperimentStatus[\s\S]*Free 实验操作与证据链的职责拆分已经完成[\s\S]*下一大改动断点是 Demo\/Guide 教学运行协调/,
  'the authority table should record the completed Free evidence boundary and next teaching-runtime breakpoint',
);

console.log('workbenchHeatCapacityStateBoundary tests passed');
