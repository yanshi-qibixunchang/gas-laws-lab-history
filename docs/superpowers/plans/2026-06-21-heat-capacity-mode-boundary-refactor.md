# Heat Capacity Mode Boundary Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the heat-capacity experiment so Demo, Free, and Guide are three independent business modes with separate data pools, state machines, and result paths.

**Architecture:** Demo keeps the old scripted teaching profile. Free keeps the realistic Free model and Free data pool. Guide is rebuilt as a separate guided single-trial experiment that owns its own runtime, trial, workflow, timer, pause, and result state; it may reuse pure calculation/display utilities but must not write Free trials or use the Demo profile.

**Tech Stack:** React 18, TypeScript, Vite, local Node test runner through `npm.cmd test`, existing heat-capacity domain/workbench modules.

---

## Confirmed Decisions

- Old Guide data does not need migration. The app is still in development; old mixed Guide data can be discarded/reset.
- Demo behavior must stay the same, except Guide pollution is removed.
- Free behavior must stay the same, except Guide pollution is removed.
- Guide supports one complete guided experiment in this round.
- Guide does not support rerecording. A record button appears only at the correct threshold, records a reasonable value, disappears, and advances the workflow.
- Guide results do not participate in Free multi-group averaging.
- Guide UI only needs to show the final single-trial result for now. Full left-panel data design can be redone later.
- Guide runtime does not include leakage, environmental disturbance, random instrument noise, low-pressure nonlinearity, or pump-valve exchange. These models are not "disabled"; they are absent from Guide.
- Guide keeps sensor lag.
- Guide hard-sphere visualization remains user-controlled. At Guide pause points, if visualization is enabled, particles freeze in place.
- U1 and U2 waits use a visible 5 min timer with 2/4/8/16 speed controls.
- During U1/U2 waiting, Guide shows ordinary prompts only. No strong reminder during the active wait.
- When each 5 min wait completes, Guide pauses physics and particle motion, then opens a strong reminder targeting the correct record button.
- Recording U2 calculates the single-trial gamma immediately.
- Closing the power switch is part of the guided workflow. After U2 result calculation, Guide enters a final strong reminder step asking the user to close power; closing power completes the guided run.
- Aborting Guide clears current Guide trial/runtime/workflow and exits to Free mode after confirmation.
- Error clicks in Guide show a reason and optional visual rollback; they do not change business state, write records, or advance workflow.
- Guide should persist/recover its new workflow, timer, records, pause state, and active strong reminder across refresh.
- Displayed and recorded voltage precision should remain one decimal, using the existing truncation behavior.
- Guide pump target is `Up >= 120.0 mV`, not a fixed pump count. Pump count and pump timing can be logged internally for future diagnosis.

---

## Boundary Rules

### Demo

- Uses old auto demo script and `heatCapacityExperimentProfile`.
- Owns old `heatCapacityTrials`, `heatCapacityActiveTrialIndex`, and demo/teaching processing result.
- Must not reference Guide workflow, Guide strong reminder state, Guide timer, or Guide trial data.
- Must not read or write `heatCapacityFreeTrials`.

### Free

- Uses `heatCapacityFreeTrials`, Free realistic physics, Free parameters, Free records, Free data processing, Free process review/diagnosis.
- Must not reference Guide workflow restrictions, Guide strong reminders, Guide auto pauses, or Guide fixed 5 min teaching waits.
- Must not read or write Guide trial data.
- Must not be affected by Guide abort/restart.

### Guide

- Owns new Guide runtime/trial/workflow/result state.
- Must not write `heatCapacityFreeTrials`.
- Must not use `heatCapacityExperimentProfile`.
- Must not use old `heatCapacityTrials` for workflow, records, or result.
- May reuse pure formula/display helpers after they are named generically or wrapped clearly.
- Reuses existing scene overlay capabilities: control pulse, ordinary prompt, strong reminder mask, camera focus mode, rollback animation.

---

## File Responsibility Map

### Create

- `src/domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts`
  - Guide-only ideal runtime.
  - No leakage, no environmental disturbance, no random noise, no low-pressure nonlinearity, no pump-valve exchange.
  - Contains Guide state creation, pump stroke application, stopcock release stepping, constant-volume thermal recovery, physical display derivation, and pause-safe stepping.

- `src/domain/heatCapacity/heatCapacityGuideTrialModel.ts`
  - Guide trial and record types.
  - Guide U0/U1/U2 recording functions.
  - Guide single-trial gamma calculation.
  - Guide internal event log type for future diagnosis.

- `src/domain/heatCapacity/heatCapacityGuideWorkflowModel.ts`
  - Guide workflow steps and expected actions.
  - Guide guard results for allowed/blocked actions.
  - Ordinary prompt text keys, strong reminder target ids, pause decisions, and transition rules.

- `src/domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts`
  - Guide U1/U2 5 min timer derivation.
  - 2/4/8/16 speed option support.
  - Wait completion and pause-point detection.

- `tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts`
  - Guardrail tests proving Demo/Free/Guide data separation.

- `tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts`
  - Guide workflow, wait, pause, record, final close-power, abort, and refresh-persistence model tests.

### Modify

- `src/features/workbench/workbenchState.ts`
  - Add Guide fields to `WorkbenchHeatCapacityState`.
  - Add Guide state creation/reset/step/action/record functions.
  - Remove broad Guide/Free coupling from `isHeatCapacityPhysicalKernelMode`.
  - Keep Free functions Free-only and Demo functions Demo-only.

- `src/features/workbench/WorkbenchStudioPrototype.tsx`
  - Replace old `manualHeatCapacity*` Guide business logic with the new Guide workflow controller.
  - Keep reusable overlay/pulse/rollback/camera UI framework.
  - Render Guide timer/speed overlay independently from Free.
  - Render Guide record button from Guide workflow only.
  - Route mode buttons and abort behavior through explicit Demo/Free/Guide handlers.

- `src/features/heatCapacity/HeatCapacityLeftPanel.tsx`
  - Keep Free data/result page Free-only.
  - Keep Demo old recording/processing paths Demo-only.
  - Add minimal Guide single-result display when Guide has a completed U2/result.

- `src/features/workbench/workbenchHeatCapacityPersistence.ts`
  - Add `guided` payload and restoration.
  - Stop treating Guide as `common` teaching trial data.

- `src/features/workbench/workbenchSession.ts`
  - Persist/restore new Guide workflow state.
  - Old mixed Guide session data should normalize to fresh Guide defaults.

- `src/features/workbench/workbenchPersistenceSchema.ts`
  - Add schema validation for new Guide session/payload.

- `src/features/workbench/workbenchPersistenceMigration.ts`
  - Drop old mixed Guide data on load.
  - Preserve Demo common data and Free data.

- `src/domain/heatCapacity/heatCapacityDisplaySource.ts`
  - Make display source selection explicit for Demo, Free, and Guide.

- `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
  - Update imports and assertions for removed old Guide functions.
  - Add integration-level Guide state tests if not fully covered by new Guide tests.

- `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - Replace old static assertions for `manualHeatCapacity*` with assertions for new Guide controller boundaries.

- `tests/workbench/workbenchSessionPersistence.test.ts`
  - Update Guide session persistence assertions.

### Delete Or Remove After Replacement

- Old `ManualHeatCapacityStep` / `ManualHeatCapacityAction` types in `WorkbenchStudioPrototype.tsx`.
- Old `manualHeatCapacity*` state, refs, timers, guards, and helper functions after the new Guide controller is wired.
- Old Guide paths that record to `heatCapacityTrials`.
- Old Guide paths that read `heatCapacityExperimentProfile`.
- Static tests that require `manualHeatCapacity*` names or old Guide/teaching-trial coupling.

---

## Task 1: Add Mode Boundary Guardrail Tests

**Files:**
- Create: `tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts`
- Modify only if needed for imports: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`

- [ ] **Step 1: Write failing boundary tests**

Create tests that intentionally fail on the current mixed implementation:

```ts
import assert from 'node:assert/strict';
import {
  createDefaultHeatCapacityFile,
  enterHeatCapacityFreeModeWorkbenchState,
  prepareHeatCapacityAutoDemoStart,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';

const makeGuideFile = (): WorkbenchHeatCapacityState => ({
  ...createDefaultHeatCapacityFile(1),
  heatCapacityMode: 'guide',
});

{
  const file = createDefaultHeatCapacityFile(1);
  const demo = prepareHeatCapacityAutoDemoStart(file, 1234);
  assert.equal(demo.heatCapacityMode, 'demo');
  assert.notEqual(demo.heatCapacityExperimentProfile, null);
  assert.deepEqual(demo.heatCapacityFreeTrials, []);
}

{
  const file = createDefaultHeatCapacityFile(1);
  const free = enterHeatCapacityFreeModeWorkbenchState(file);
  assert.equal(free.heatCapacityMode, 'free');
  assert.equal(free.heatCapacityExperimentProfile, null);
  assert.deepEqual(free.heatCapacityTrials.map((trial) => trial.status), ['waiting', 'waiting', 'waiting']);
}

{
  const guide = makeGuideFile();
  assert.equal(guide.heatCapacityMode, 'guide');
  assert.deepEqual(guide.heatCapacityFreeTrials, []);
  assert.equal(guide.heatCapacityExperimentProfile, null);
}
```

- [ ] **Step 2: Run the new test and confirm failure where Guide fields/functions are missing**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts
```

Expected before implementation:

- FAIL because Guide-specific state/actions are not implemented yet, or because current Guide still relies on common teaching structures.

- [ ] **Step 3: Keep the failing tests committed only after implementation starts**

Do not weaken the tests to match current behavior. These tests define the new contract.

---

## Task 2: Introduce Guide Trial And Result Model

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityGuideTrialModel.ts`
- Test: `tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts`

- [ ] **Step 1: Define Guide record/trial/result types**

Use Guide-specific names, not Free aliases:

```ts
export type HeatCapacityGuideRecordKind = 'u0' | 'u1' | 'u2';

export interface HeatCapacityGuideRecord {
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  calibrationVersion: number;
  zeroEventId: string;
}

export interface HeatCapacityGuideCorrectedSignals {
  U0DisplayMv: number;
  U1DisplayMv: number;
  U2DisplayMv: number;
  U1CorrectedMv: number;
  U2CorrectedMv: number;
  gamma: number;
}

export interface HeatCapacityGuideEventLogEntry {
  atS: number;
  type: 'workflow' | 'blocked-action' | 'record' | 'pump' | 'release' | 'timer' | 'abort' | 'complete';
  message: string;
  data?: Record<string, unknown>;
}

export interface HeatCapacityGuideTrial {
  id: string;
  source: 'guide';
  u0: HeatCapacityGuideRecord | null;
  u1: HeatCapacityGuideRecord | null;
  u2: HeatCapacityGuideRecord | null;
  correctedSignals: HeatCapacityGuideCorrectedSignals | null;
  completedAtMs: number | null;
  eventLog: HeatCapacityGuideEventLogEntry[];
}
```

- [ ] **Step 2: Implement Guide record normalization**

Use the existing one-decimal truncation behavior:

```ts
import { truncateHeatCapacitySignalMv } from './heatCapacitySignalDisplayModel.ts';

export const normalizeHeatCapacityGuideRecord = (
  input: HeatCapacityGuideRecord,
): HeatCapacityGuideRecord => ({
  ...input,
  displayPressureMv: truncateHeatCapacitySignalMv(input.displayPressureMv),
  displayTemperatureMv: truncateHeatCapacitySignalMv(input.displayTemperatureMv),
});
```

- [ ] **Step 3: Implement single-trial gamma calculation**

Use the same correction formula as Free, but expose Guide-specific result names. If a generic correction helper does not exist yet, extract a generic wrapper from `heatCapacityFreeCalibrationModel.ts` without changing Free public behavior.

```ts
export const calculateGuideHeatCapacityTrialSignals = (
  trial: HeatCapacityGuideTrial,
  options: { atmosphericPressureKPa?: number; pressureSensitivityMvPerKPa?: number } = {},
): HeatCapacityGuideCorrectedSignals | null => {
  if (!trial.u0 || !trial.u1 || !trial.u2) return null;
  // Uses generic corrected-signal helper extracted from Free calibration model.
  // Must return null for non-positive or non-finite corrected values.
  return null;
};
```

- [ ] **Step 4: Test Guide result calculation**

Add tests:

```ts
import assert from 'node:assert/strict';
import {
  createHeatCapacityGuideTrial,
  recordGuideU0,
  recordGuideU1,
  recordGuideU2,
} from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';

{
  const trial0 = createHeatCapacityGuideTrial('guide-trial-1');
  const trial1 = recordGuideU0(trial0, { atS: 0, displayPressureMv: 0, displayTemperatureMv: 1499, calibrationVersion: 1, zeroEventId: 'zero-1' });
  const trial2 = recordGuideU1(trial1, { atS: 300, displayPressureMv: 120, displayTemperatureMv: 1499, calibrationVersion: 1, zeroEventId: 'zero-1' });
  const trial3 = recordGuideU2(trial2, { atS: 600, displayPressureMv: 30, displayTemperatureMv: 1499, calibrationVersion: 1, zeroEventId: 'zero-1' });
  assert.equal(trial3.source, 'guide');
  assert.equal(trial3.correctedSignals?.gamma !== null, true);
}
```

- [ ] **Step 5: Run Guide model tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts
```

Expected: PASS after implementation.

---

## Task 3: Add Guide Ideal Physics Engine

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts`
- Test: `tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts`

- [ ] **Step 1: Define Guide runtime types**

The type must not contain fields for leakage, environmental disturbance, random noise, low-pressure nonlinearity, or pump-valve exchange.

```ts
export interface HeatCapacityGuidePhysicsConfig {
  environment: {
    ambientTemperatureK: number;
    ambientPressureKPa: number;
  };
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpPressureLimitKPa: number;
  pumpInflowTemperatureRiseK: number;
  stopcockFlowRate: number;
  thermal: {
    wallExchangeRate: number;
    gasWallExchangeRate: number;
  };
}

export interface HeatCapacityGuidePhysicsState {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  pumpProcesses: Array<{
    startedAtS: number;
    strength: number;
    appliedProgress: number;
  }>;
  pumpStrokeCount: number;
  lastPumpStrokeAtS: number | null;
  lastPumpValveOpenedAtS: number | null;
  lastPumpValveClosedAtS: number | null;
  currentPumpValveOpenDurationS: number;
  releaseStarted: boolean;
  lastStopcockOpenedAtS: number | null;
  lastStopcockClosedAtS: number | null;
  currentStopcockOpenDurationS: number;
  releaseReference: {
    pressureBeforeKPa: number;
    temperatureBeforeK: number;
    amountBeforeRatio: number;
    openedAtS: number;
    reachedAmbientAtS: number | null;
  } | null;
}
```

- [ ] **Step 2: Implement physical derivation**

Use the ideal gas relation already used in Free:

```ts
export const deriveGuidePhysicalState = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
) => {
  const gasPressureKPa = config.environment.ambientPressureKPa *
    state.gasAmountRatio *
    (state.gasTemperatureK / config.environment.ambientTemperatureK);
  return {
    gasPressureKPa,
    pressureDeltaKPa: gasPressureKPa - config.environment.ambientPressureKPa,
  };
};
```

- [ ] **Step 3: Implement Guide pump stroke**

Pump stroke must be continuous, not an instant pressure jump. Use a local copy or extracted pure helper for the existing pump progress curve. Do not import the whole Free engine.

- [ ] **Step 4: Implement Guide stopcock release**

Use the same aperture/flow concept as Free, but keep it Guide-local or pure. Guide release should respond to pressure difference and stop when pressure reaches ambient under the current temperature.

- [ ] **Step 5: Implement Guide thermal recovery**

Keep only the ideal thermal recovery required for U1/U2 waiting. Do not call leakage or disturbance models.

- [ ] **Step 6: Add tests for absence of excluded models**

Add static assertions:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const source = readFileSync(join(process.cwd(), 'src/domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts'), 'utf8');
assert.doesNotMatch(source, /Leakage|leakage|EnvironmentDisturbance|environmentDisturbance/);
assert.doesNotMatch(source, /PressureSensorNonlinearity|pressureNonlinearity/);
assert.doesNotMatch(source, /PumpValveExchange|pumpValveExchange/);
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts
```

Expected: PASS.

---

## Task 4: Add Guide Timer And Workflow Models

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts`
- Create: `src/domain/heatCapacity/heatCapacityGuideWorkflowModel.ts`
- Test: `tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts`

- [ ] **Step 1: Implement Guide timer model**

```ts
export const HEAT_CAPACITY_GUIDE_WAIT_TARGET_S = 300;
export const HEAT_CAPACITY_GUIDE_SPEED_OPTIONS = [2, 4, 8, 16] as const;
export type HeatCapacityGuideSpeedMultiplier = typeof HEAT_CAPACITY_GUIDE_SPEED_OPTIONS[number];

export interface HeatCapacityGuideTimerState {
  stage: 'none' | 'u1-wait' | 'u2-wait' | 'u1-ready' | 'u2-ready';
  elapsedS: number;
  targetS: number;
  complete: boolean;
}
```

- [ ] **Step 2: Implement Guide workflow steps**

The workflow must include final power-off closure:

```ts
export type HeatCapacityGuideWorkflowStep =
  | 'powerRequired'
  | 'openStopcockForZeroRequired'
  | 'zeroRequired'
  | 'recordU0Required'
  | 'openPumpValveRequired'
  | 'pumpRequired'
  | 'closePumpValveRequired'
  | 'u1Waiting'
  | 'recordU1Required'
  | 'openStopcockForReleaseRequired'
  | 'closeStopcockAfterReleaseRequired'
  | 'u2Waiting'
  | 'recordU2Required'
  | 'closePowerRequired'
  | 'completed';
```

- [ ] **Step 3: Implement expected action mapping**

Examples:

```ts
export type HeatCapacityGuideAction =
  | 'togglePower'
  | 'openStopcock'
  | 'closeStopcock'
  | 'adjustZero'
  | 'recordU0'
  | 'openPumpValve'
  | 'closePumpValve'
  | 'pressPumpBulb'
  | 'recordU1'
  | 'recordU2'
  | 'abortGuide';
```

Blocked actions return:

```ts
export interface HeatCapacityGuideGuardResult {
  allowed: boolean;
  message: string;
  rollbackAnimation?: 'valveBounce' | 'stopcockBounce' | 'pumpBulbBounce' | 'knobBounce' | 'powerBounce';
  targetControlId: string | null;
}
```

- [ ] **Step 4: Test key workflow transitions**

Tests must cover:

- Power off starts at `powerRequired`.
- After power on, open stopcock is required.
- U0 can only record after zeroing is ready.
- Pumping must reach `Up >= 120.0 mV` before close-pump-valve is allowed.
- U1 waiting does not open strong reminder before 300 s.
- At 300 s, workflow becomes `recordU1Required` and physics pause is required.
- U2 waiting behaves the same.
- After record U2, result exists and step becomes `closePowerRequired`.
- Closing power changes step to `completed`.
- Wrong actions do not mutate trial records.

- [ ] **Step 5: Run tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityGuideWorkflowModel.test.ts
```

Expected: PASS.

---

## Task 5: Add Guide State To Workbench State

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`

- [ ] **Step 1: Add Guide fields to `WorkbenchHeatCapacityState`**

Add fields with explicit Guide names:

```ts
heatCapacityGuideTrial: HeatCapacityGuideTrial | null;
heatCapacityGuidePhysicsState: HeatCapacityGuidePhysicsState;
heatCapacityGuideWorkflow: {
  step: HeatCapacityGuideWorkflowStep;
  speedMultiplier: HeatCapacityGuideSpeedMultiplier;
  paused: boolean;
  waitStartedAtS: number | null;
  waitStage: 'u1' | 'u2' | null;
  strongReminderActive: boolean;
  strongReminderTargetControlId: string | null;
};
```

- [ ] **Step 2: Add default Guide state creation**

Default heat-capacity file should include empty Guide fields without affecting Demo/Free defaults.

- [ ] **Step 3: Add Guide start/reset/abort functions**

Implement:

```ts
export const startHeatCapacityGuideWorkbenchState = (file: WorkbenchHeatCapacityState, now = Date.now()) => ({ ...file });
export const abortHeatCapacityGuideWorkbenchState = (file: WorkbenchHeatCapacityState, now = Date.now()) => ({ ...file });
export const resetHeatCapacityGuideWorkbenchState = (file: WorkbenchHeatCapacityState, now = Date.now()) => ({ ...file });
```

Contract:

- `start` sets mode to `guide`, creates clean Guide runtime/trial/workflow, clears old mixed Guide state.
- `abort` clears Guide runtime/trial/workflow and exits to `free`.
- `reset` clears Guide runtime/trial/workflow but keeps file available.

- [ ] **Step 4: Add Guide step function**

Implement:

```ts
export const stepHeatCapacityGuideWorkbenchFile = (
  file: WorkbenchHeatCapacityState,
  elapsedMs: number,
  now = Date.now(),
) => file;
```

Contract:

- If Guide workflow is paused, return file without advancing physics or hard-sphere visual time.
- During U1/U2 waits, apply speed multiplier to physical elapsed time.
- At 300 s, set paused and open strong reminder target for `recordU1` or `recordU2`.

- [ ] **Step 5: Update `stepHeatCapacityWorkbenchFile` explicit dispatch**

Use explicit mode dispatch:

```ts
if (file.heatCapacityMode === 'free') return stepHeatCapacityFreeWorkbenchFile(file, elapsedMs, now);
if (file.heatCapacityMode === 'guide') return stepHeatCapacityGuideWorkbenchFile(file, elapsedMs, now);
return stepHeatCapacityTeachingWorkbenchFile(file, elapsedMs, now);
```

Do not use `mode === 'free' || mode === 'guide'` for business state.

- [ ] **Step 6: Update display source selector**

Make `selectActiveHeatCapacityWorkbenchDisplay` choose:

- Demo: teaching display.
- Free: Free sensor display.
- Guide: Guide sensor display.

- [ ] **Step 7: Run state tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
```

Expected: PASS after test updates.

---

## Task 6: Clean Demo And Free Boundary Coupling

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/domain/heatCapacity/heatCapacityDisplaySource.ts`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: Remove broad physical-kernel helper**

Delete or narrow:

```ts
export const isHeatCapacityPhysicalKernelMode = ...
```

Replace with explicit helpers only if needed:

```ts
export const isHeatCapacityFreeMode = (mode: HeatCapacityMode | null | undefined) => mode === 'free';
export const isHeatCapacityGuideMode = (mode: HeatCapacityMode | null | undefined) => mode === 'guide';
```

- [ ] **Step 2: Split stopcock flow purpose**

Replace `getHeatCapacityFreeStopcockFlowPurpose` mixed Guide logic with:

```ts
export const getHeatCapacityFreeStopcockFlowPurpose = (file: HeatCapacityFreeActiveTrialSource, stopcockOpen: boolean) => ...
export const getHeatCapacityGuideStopcockFlowPurpose = (file: WorkbenchHeatCapacityState, stopcockOpen: boolean) => ...
```

Free version must not accept `heatCapacityTrials`.

- [ ] **Step 3: Keep Free trace and rollback Free-only**

Verify Free trace helpers are called only from Free record/reset/delete paths, not Guide.

- [ ] **Step 4: Keep Demo profile Demo-only**

Verify `createHeatCapacityExperimentProfile` and `prepareHeatCapacityAutoDemoStart` are only called for Demo.

- [ ] **Step 5: Run guardrail tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS.

---

## Task 7: Wire Guide UI Controller

**Files:**
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: Replace old manual Guide state names**

Introduce Guide UI state names:

```ts
const [heatCapacityGuideFocusControlId, setHeatCapacityGuideFocusControlId] = useState<string | null>(null);
const [heatCapacityGuidePulseActive, setHeatCapacityGuidePulseActive] = useState(false);
const [heatCapacityGuideStrongReminderActive, setHeatCapacityGuideStrongReminderActive] = useState(false);
const [heatCapacityGuideStrongReminderControlId, setHeatCapacityGuideStrongReminderControlId] = useState<string | null>(null);
```

Remove old `manualHeatCapacityActiveFileId` and related state once replacement is complete.

- [ ] **Step 2: Use Guide workflow for record button**

Render Guide record buttons from `heatCapacityGuideWorkflow.step`:

- `recordU0Required` => show `记录 U0`.
- `recordU1Required` => show `记录 U1`.
- `recordU2Required` => show `记录 U2`.
- No rerecord labels.
- After click, button disappears because workflow advances.

- [ ] **Step 3: Wire Guide ordinary prompts**

Render ordinary process prompt at the 3D center-lower position:

- During active waits: show timer-related ordinary prompt, no strong reminder.
- During action steps: show current action prompt and pulse target control.
- Prompt should not duplicate under strong reminder.

- [ ] **Step 4: Wire Guide strong reminders**

Strong reminder should activate for:

- 4 s idle on actionable steps.
- Two wrong clicks on actionable steps.
- U1/U2 timer complete pause.
- Final `closePowerRequired`.

Strong reminder should not activate during active U1/U2 waiting before 300 s.

- [ ] **Step 5: Keep Guide focus targets**

Preserve existing working overlay/camera framework:

- Power: default view.
- Pressure-zero knob: focused instrument view; hole includes knob and numeric display.
- Pump valve and glass stopcock: shared bottle/control view.
- Pump bulb: pump/bottle view.
- Record buttons: screen-space button target.

- [ ] **Step 6: Render Guide timer above strong mask**

When Guide has an active timer or pause-ready timer state, the timer/speed control should remain visible above the dim mask. Use a dedicated overlay layer or z-index class instead of Free-only overlay.

- [ ] **Step 7: Implement abort confirmation**

Clicking Guide stop action should confirm abort. Confirmed abort calls `abortHeatCapacityGuideWorkbenchState`, clears Guide UI state, and enters Free mode.

- [ ] **Step 8: Run UI static tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS after old static assertions are replaced.

---

## Task 8: Add Guide Persistence And Refresh Recovery

**Files:**
- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Modify: `src/features/workbench/workbenchPersistenceSchema.ts`
- Modify: `src/features/workbench/workbenchPersistenceMigration.ts`
- Test: `tests/workbench/workbenchSessionPersistence.test.ts`
- Test: `tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts`

- [ ] **Step 1: Add guided payload**

Change persistence payload:

```ts
guided: {
  trial: HeatCapacityGuideTrial | null;
  physicsState: HeatCapacityGuidePhysicsState;
  workflow: HeatCapacityGuideWorkflowPersistenceState;
  sensorState: HeatCapacityGuideSensorState;
  calibrationState: HeatCapacityGuideCalibrationState;
} | null;
```

- [ ] **Step 2: Restore new Guide only**

Old mixed Guide data must not be migrated. On load:

- If new `guided` payload exists and validates, restore it.
- If only old common teaching data exists for Guide, reset Guide to fresh defaults.
- Always preserve Demo common data and Free payload.

- [ ] **Step 3: Persist UI-recoverable strong reminder state**

Persist enough state to recompute:

- active Guide file id,
- workflow step,
- strong reminder active flag,
- target control id,
- pause state.

Do not persist pixel mask coordinates; recompute them after render.

- [ ] **Step 4: Test refresh recovery**

Test cases:

- Guide during U1 wait restores timer and speed.
- Guide at `recordU1Required` restores paused state and strong reminder target.
- Guide completed trial restores result and `closePowerRequired` if power is still on.
- Free trials are unchanged after Guide restore.

- [ ] **Step 5: Run persistence tests**

Run:

```powershell
npm.cmd test -- tests/workbench/workbenchSessionPersistence.test.ts tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts
```

Expected: PASS.

---

## Task 9: Minimal Guide Result Display

**Files:**
- Modify: `src/features/heatCapacity/HeatCapacityLeftPanel.tsx`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: Keep Free merged page Free-only**

Ensure:

```ts
file.heatCapacityMode === 'free'
```

is the only route into Free data/result display.

- [ ] **Step 2: Add minimal Guide result block**

For `file.heatCapacityMode === 'guide'`, show a small single-result section when `heatCapacityGuideTrial?.correctedSignals` exists:

- U0 record value.
- U1 record value.
- U2 record value.
- gamma.
- result status.

- [ ] **Step 3: Do not implement multi-group Guide averaging**

No Guide mean gamma, no Guide selection/exclusion UI, no Guide diagnostic report in this round.

- [ ] **Step 4: Run UI tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS.

---

## Task 10: Delete Old Guide Code And Tests

**Files:**
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`

- [ ] **Step 1: Remove old manual Guide types and helpers**

Delete old code after new Guide tests pass:

- `ManualHeatCapacityStep`
- `ManualHeatCapacityAction`
- `ManualHeatCapacityRollbackAnimation` if fully replaced by Guide-specific type
- `ManualHeatCapacityGuardResult`
- `getManualHeatCapacity...`
- `guardManualHeatCapacityAction`
- `recordHeatCapacityManualSample`
- `startNextHeatCapacityManualTrial`
- `manualHeatCapacityActiveFileId`
- old manual timers and refs

- [ ] **Step 2: Remove old Guide trial/profile dependencies**

Search:

```powershell
rg -n "manualHeatCapacity|ManualHeatCapacity|heatCapacityMode === 'guide'[\\s\\S]{0,120}heatCapacityTrials|heatCapacityExperimentProfile" src tests
```

Expected after cleanup:

- No `manualHeatCapacity` business code remains.
- No Guide branch reads `heatCapacityTrials`.
- No Guide branch reads `heatCapacityExperimentProfile`.

- [ ] **Step 3: Replace old tests with new boundary assertions**

Remove static tests that require old names. Add assertions for:

- `startHeatCapacityGuideWorkbenchState`
- `applyHeatCapacityGuideAction`
- `heatCapacityGuideWorkflow`
- Guide strong reminder UI props
- Guide does not write Free data

- [ ] **Step 4: Run targeted tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
```

Expected: PASS.

---

## Task 11: Full Verification

**Files:**
- No planned source edits unless verification exposes defects.

- [ ] **Step 1: Run TypeScript check**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm.cmd test
```

Expected: PASS.

- [ ] **Step 3: Check diff hygiene**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 4: Start fixed preview port**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected:

- Vite serves `http://127.0.0.1:5174/`.
- If port 5174 is already occupied by the project dev server, reuse it.
- If port 5174 is occupied by another process, stop and ask before changing port.

- [ ] **Step 5: Manual UI acceptance checklist**

Preview URL:

```text
http://127.0.0.1:5174/
```

Verify Demo:

- Demo mode starts old script.
- Demo still uses scripted profile.
- Demo does not show Guide strong reminder.
- Demo does not create Free trials.

Verify Free:

- Free mode can complete one normal experiment.
- Free timer/speed behavior remains as before.
- Free records write only to Free data/result page.
- Guide abort/restart does not affect existing Free completed trials.

Verify Guide:

- Starting Guide creates a fresh guided single-trial workflow.
- Wrong clicks show reason and do not change state.
- Strong reminder appears after idle/wrong actions on actionable steps.
- U0 records only after power/open stopcock/zero readiness.
- Pump target is based on `Up >= 120.0 mV`.
- U1 wait shows 5 min timer and 2/4/8/16 speed controls.
- At 5 min, physics and particles pause; strong reminder targets `记录 U1`.
- Release requires open then close after the target duration.
- U2 wait works like U1.
- Recording U2 calculates gamma.
- Final strong reminder asks the user to close power.
- Closing power completes the Guide run.
- Aborting Guide confirms, clears Guide state, exits to Free mode.
- Refresh during Guide restores workflow/timer/pause/strong reminder.

---

## Execution Notes

- Keep commits frequent if committing is requested later:
  - boundary tests,
  - Guide domain models,
  - workbench state integration,
  - UI wiring,
  - persistence,
  - cleanup.
- Do not rename or rewrite Free physics files unless required by a failing test. The safer boundary is Guide-specific runtime plus shared pure calculation helpers.
- Do not reuse Free data-pool functions for Guide by passing flags. If a function writes `heatCapacityFreeTrials`, it is Free-only.
- Do not use `heatCapacityExperimentProfile` in Guide. It is Demo-only.
- Any deletion not covered above should be listed explicitly before execution.

