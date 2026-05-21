# Heat Capacity Free Trace Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stable Free Mode trace/event data foundation before freezing the heat-capacity Free Mode data format.

**Architecture:** Free Mode will store hidden diagnostic trace data per Free trial, with branch support for user rollback and deterministic event/sample IDs. UI charts, Blender visuals, operation scoring, and deeper physics changes are intentionally deferred; this plan only creates the persisted data contract, capture rules, record linkage, reset/delete semantics, and compatibility normalization.

**Tech Stack:** TypeScript, React state helpers, existing Vite workbench, Node script tests under `tests/`, existing Electron updater untouched.

---

## User-Approved Decisions

- Trace/event data is saved in the experiment/session file.
- Trace includes real physical values, but normal UI, record tables, processing tables, and regular exports must not show them.
- Trace is bound per Free trial, not only per run.
- Each Free trial has one active main branch and can keep archived hidden branches after user deletes records.
- Default charts later should show only the current main branch. Archived branches are saved for diagnostics and rollback count only.
- Deleting a complete data group deletes the group and its trace.
- Deleting an individual U0/U1/U2 record archives the current branch and starts a new branch. It does not delete old branch data.
- Deleting U0 invalidates U0/U1/U2 and starts a new branch.
- Deleting U1 invalidates U1/U2, preserves U0, and starts a new branch.
- Deleting U2 invalidates only U2, preserves U0/U1, and starts a new branch.
- Reset Free Run has state-dependent behavior:
  - If current group is complete, Reset starts the next group without mutating completed group data or trace.
  - If current group is incomplete and has data, Reset deletes the current incomplete trace and returns the current group to a new blank state.
  - If current group is blank, Reset does not create extra empty groups, traces, or seeds.
- Repeated Reset clicks must not create many empty trials, trace trials, branches, or seeds.
- Automatic U0 candidate is saved as an event/candidate, not as an official record.
- Event-linked samples must never be removed by compression.
- When over sample limit, remove value-similar periodic samples first. If still over limit, stop saving low-priority periodic samples and keep event samples only.
- Failed record attempts are saved as events.
- Warning/danger state changes are saved as events.
- Free enter/exit events are saved. Demo/Guide do not get trace.
- Regular export hides trace. A future explicit diagnostic export can expose it.
- Blender is not part of this data freeze work.
- More realistic physics v2 is deferred. This plan may save config snapshots and reserved fields, but does not enable new physics behavior.
- Diagnostic conclusions are not saved. Later diagnostics compute from trace/event data.

## Non-Goals

- Do not build process charts or trace UI.
- Do not expose true physical trace in normal UI.
- Do not change Blender models or 3D visual assets.
- Do not add scoring, best-operation limits, or saved diagnostic conclusions.
- Do not implement leak, wall heat capacity, continuous valve opening, or pipe thermal states.
- Do not bump `package.json` version.
- Do not create or upload a GitHub Release.
- Do not alter the existing updater channel.

## Data Contract

### Constants

Add constants in `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`:

```ts
export const HEAT_CAPACITY_FREE_TRACE_VERSION = 1;
export const HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION = 1;
export const HEAT_CAPACITY_FREE_CALCULATION_VERSION = 'log-pressure-v1' as const;

export const FREE_TRACE_MAX_SAMPLES_PER_TRIAL = 800;
export const FREE_TRACE_MAX_EVENTS_PER_TRIAL = 200;

export const FREE_TRACE_SIMILAR_PRESSURE_DELTA_MV = 0.2;
export const FREE_TRACE_SIMILAR_TEMPERATURE_DELTA_MV = 0.1;

export const FREE_TRACE_THRESHOLDS = {
  zeroing: { pressureMv: 0.1, temperatureMv: 0.2 },
  pumpingBurst: { pressureMv: 1.0, temperatureMv: 0.3 },
  sealedStabilizing: { pressureMv: 0.5, temperatureMv: 0.2 },
  releasing: { pressureMv: 0.5, temperatureMv: 0.2 },
  recoveringEarly: { pressureMv: 0.3, temperatureMv: 0.15 },
  recoveringStable: { pressureMv: 0.5, temperatureMv: 0.2 },
  idle: { pressureMv: Number.POSITIVE_INFINITY, temperatureMv: Number.POSITIVE_INFINITY },
} as const;
```

### Trace Store

Add to `WorkbenchHeatCapacityState`:

```ts
heatCapacityFreeTraceVersion: number;
heatCapacityFreeTraceStore: HeatCapacityFreeTraceStore;
```

Use this persisted shape:

```ts
export interface HeatCapacityFreeTraceStore {
  activeTraceTrialId: string | null;
  nextTraceTrialIndex: number;
  traceTrials: HeatCapacityFreeTraceTrial[];
}

export interface HeatCapacityFreeTraceTrial {
  id: string;
  linkedTrialId: string | null;
  status: 'active' | 'completed' | 'discarded';
  activeBranchId: string;
  nextBranchIndex: number;
  branches: HeatCapacityFreeTraceBranch[];
  configSnapshot: HeatCapacityFreeConfigSnapshot;
}

export interface HeatCapacityFreeTraceBranch {
  id: string;
  parentBranchId: string | null;
  createdByEventId: string | null;
  status: 'main' | 'archived';
  hiddenInDefaultChart: boolean;
  nextSampleIndex: number;
  nextEventIndex: number;
  nextSampleAtS: number | null;
  lastKeptSampleId: string | null;
  idleState: HeatCapacityFreeTraceIdleState;
  samples: HeatCapacityFreeTraceSample[];
  events: HeatCapacityFreeEvent[];
}

export interface HeatCapacityFreeTraceIdleState {
  lastUserActionAtS: number | null;
  dormantSinceS: number | null;
  lastHeartbeatAtS: number | null;
}
```

### Sample

```ts
export type HeatCapacityFreeTraceSampleReason =
  | 'periodic'
  | 'event'
  | 'record'
  | 'record-blocked'
  | 'phase-change'
  | 'reset'
  | 'heartbeat';

export interface HeatCapacityFreeTraceSample {
  id: string;
  index: number;
  atS: number;
  reason: HeatCapacityFreeTraceSampleReason;
  phase: HeatCapacityRuntimePhase;
  controls: {
    powerOn: boolean;
    stopcockOpen: boolean;
    pumpValveOpen: boolean;
  };
  physical: {
    gasPressureKPa: number;
    pressureDeltaKPa: number;
    gasTemperatureK: number;
    gasAmountRatio: number;
    pumpStrokeCount: number;
    releaseStarted: boolean;
    currentStopcockOpenDurationS: number;
  };
  sensor: {
    displayPressureMv: number;
    displayTemperatureMv: number;
    pressureSlopeMvPerS: number;
    temperatureSlopeMvPerS: number;
  };
  calibration: {
    calibrationVersion: number;
    zeroOffsetMv: number;
    zeroEventId: string | null;
  };
  stability: {
    pressureStable: boolean;
    temperatureStable: boolean;
  };
  safetyStatus: 'normal' | 'warning' | 'danger';
}
```

### Events

```ts
export type HeatCapacityFreeEventType =
  | 'enter-free-mode'
  | 'exit-free-mode'
  | 'reset-free-run'
  | 'power-on'
  | 'power-off'
  | 'zero-calibration'
  | 'automatic-u0-candidate'
  | 'pump-valve-open'
  | 'pump-valve-close'
  | 'pump-stroke'
  | 'stopcock-open'
  | 'stopcock-close'
  | 'record-u0'
  | 'record-u1'
  | 'record-u2'
  | 'record-blocked'
  | 'record-invalidated'
  | 'branch-created'
  | 'pressure-warning'
  | 'pressure-danger'
  | 'pressure-danger-cleared';

export interface HeatCapacityFreeEvent {
  id: string;
  index: number;
  atS: number;
  type: HeatCapacityFreeEventType;
  traceSampleId: string;
  payload?: Record<string, unknown>;
}
```

### Config Snapshot

Every trace trial stores a snapshot at creation. The snapshot must be copied from the active Free configs, not read later from global defaults.

```ts
export interface HeatCapacityFreeConfigSnapshot {
  version: 1;
  environment: {
    ambientPressureKPa: number;
    ambientTemperatureK: number;
  };
  physics: {
    gamma: number;
    vesselVolumeL: number;
    pumpAmountGainRatio: number;
    pumpTemperatureGainK: number;
    sealedThermalRate: number;
    openThermalRate: number;
    stopcockFlowRate: number;
    releaseCoolingFactor: number;
  };
  sensor: {
    pressureMvPerKPa: number;
    temperatureMvAtAmbient: number;
    temperatureMvPerK: number;
    lagRate: number;
    noiseMv: number;
    quantizationMv: number;
    minSampleIntervalS: number;
    maxSampleIntervalS: number;
    historyWindowS: number;
  };
  record: {
    pressureStableSlopeMvPerS: number;
    temperatureStableSlopeMvPerS: number;
    temperatureAmbientToleranceMv: number;
    minimumUsefulU1CorrectedMv: number;
    overVentedMinimumU2CorrectedMv: number;
    pressureDangerMv: number;
  };
  reservedPhysicsV2: {
    leakRatePerS: null;
    wallThermalCapacityJPerK: null;
    pipeThermalCapacityJPerK: null;
    continuousStopcockEnabled: false;
  };
}
```

### Trial Record Linkage

Extend Free official records with trace references:

```ts
export interface HeatCapacityFreeRecordTraceReference {
  source: 'user';
  phaseAtRecord: HeatCapacityRuntimePhase;
  traceTrialId: string;
  traceBranchId: string;
  traceSampleId: string;
  eventId: string;
}
```

Each official `u0`, `u1`, and `u2` record gets these fields.

Extend `HeatCapacityFreeTrial`:

```ts
traceTrialId: string | null;
branchCount: number;
```

Extend `HeatCapacityFreeCorrectedSignals`:

```ts
calculationVersion: 'log-pressure-v1';
atmosphericPressureKPa: number;
pressureSensitivityMvPerKPa: number;
```

## Sampling Rules

### Keep Versus Drop

Periodic samples are saved only when at least one condition is true:

- Pressure display delta exceeds the phase threshold.
- Temperature display delta exceeds the phase threshold.
- Phase changed.
- Control state changed.
- Safety state changed.
- Stability state changed.
- Heartbeat is due.

Non-periodic samples are always saved:

- event
- record
- record-blocked
- phase-change
- reset

### Dense Check Windows

Dense check means "check often, save only if threshold passes."

- Pump stroke: check every `0.1s` for `2s` after each pump stroke.
- Stopcock release: check every `0.05s` for the first `1s` after stopcock opens.
- If release remains open past `1s`, check every `0.2s`.
- If release remains open past `5s`, check every `1s` and keep only summary samples.
- Recovery: check every `0.25s` for the first `5s` after stopcock closes, then every `1s` until stable.

### Idle Slowdown

- No user action for `0-30s`: use current phase strategy, still threshold-gated.
- No user action for `30-120s`: at most one heartbeat every `60s`.
- No user action for `2-10min`: at most one heartbeat every `5min`.
- No user action over `10min`: dormant. Do not save periodic samples.
- Any user action exits dormant state and forces an event sample.

### Compression

When samples exceed `FREE_TRACE_MAX_SAMPLES_PER_TRIAL`:

1. Build a protected sample ID set from every event's `traceSampleId`.
2. Also protect record samples, record-blocked samples, phase-change samples, reset samples, first sample, and last sample.
3. Remove unprotected periodic samples that are value-similar to neighboring samples.
4. Value-similar means same phase, same controls, same safety status, pressure delta `< 0.2mV`, and temperature delta `< 0.1mV`.
5. If still over limit, stop accepting low-priority periodic samples for that branch. Event-linked samples continue to be accepted.

## Reset and Delete Semantics

### Reset Free Run

Implement a helper with deterministic behavior:

```ts
resetHeatCapacityFreeRunForTrace(
  file: WorkbenchHeatCapacityState,
  now: number,
): WorkbenchHeatCapacityState
```

Rules:

- If the current Free trial is complete, keep it and its trace, then move to a blank next-trial state.
- Repeated Reset on that blank state does not create extra empty trial/trace records.
- If the current Free trial is incomplete and has official data or active trace data, discard that incomplete trial/trace and return to a blank current trial state.
- If the current Free trial is blank, reset runtime/controls/view only and make no structural trial/trace changes.
- Completed groups and their traces are never removed by Reset.

### Delete Whole Trial

- Remove the Free trial.
- Remove its linked `traceTrialId` from `traceTrials`.
- Recompute active trace state if the deleted trial was active.

### Delete Record

- Do not delete the old branch.
- Add `record-invalidated` to the archived branch.
- Archive the current main branch.
- Create a new main branch with `parentBranchId` pointing to the archived branch.
- Add `branch-created` to the new branch.
- Update `branchCount`.

Record-specific effects:

- Delete U0: clear U0/U1/U2/correctedSignals.
- Delete U1: keep U0, clear U1/U2/correctedSignals.
- Delete U2: keep U0/U1, clear U2/correctedSignals.

## Export and Visibility Rules

- Normal UI must not render `physical` trace values.
- Free record tables and processing tables remain based on official records.
- Normal CSV/result export must not include `heatCapacityFreeTraceStore`.
- Saved experiment/session files include trace.
- If a future export mode is explicitly named "diagnostic export", it may include trace, but this plan does not implement that mode.

## Stop-And-Ask Conditions

Stop and ask the user before changing goals if any of these are discovered:

- There is no clear difference in code between "saved experiment/session file" and "regular export"; this affects whether hiding trace from export can coexist with saving trace.
- Current reset logic is incompatible with "completed Reset starts next group, blank Reset is no-op."
- Current trial creation is too lazy/eager to support traceTrialId without either creating placeholder trials or changing UI behavior.
- Existing session normalization strips unknown fields in a way that would drop trace.
- Adding trace to saved files would make file size unacceptably large in realistic manual tests.
- Any implementation path would expose true physical trace in normal UI or normal export.

## Batch A: Trace Model and Compression

**Purpose:** Create standalone trace/event data model helpers before touching workbench integration.

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
- Create: `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`

- [x] **A1: Write failing test for deterministic trace trial and branch IDs**

Test should create an empty trace store, create two trace trials, and assert IDs:

```ts
assert.equal(first.traceTrial.id, 'free-trace-trial-1');
assert.equal(first.traceTrial.activeBranchId, 'branch-1');
assert.equal(second.traceTrial.id, 'free-trace-trial-2');
```

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected: fails because module/functions do not exist.

- [x] **A2: Implement default store and trace trial creation**

Add:

```ts
export const createDefaultFreeTraceStore = (): HeatCapacityFreeTraceStore => ({
  activeTraceTrialId: null,
  nextTraceTrialIndex: 1,
  traceTrials: [],
});
```

Implement `createFreeTraceTrial(store, configSnapshot)` returning updated store and trace trial.

- [x] **A3: Write failing test for event-linked sample protection**

Create 805 periodic samples plus one event-linked sample, compact, and assert the event-linked sample remains.

- [x] **A4: Implement sample/event append and compaction helpers**

Required helpers:

```ts
appendFreeTraceSample(...)
appendFreeTraceEvent(...)
compactFreeTraceBranch(...)
```

- [x] **A5: Write failing test for value-similar sample removal**

Assert unprotected same-phase samples with pressure delta `<0.2mV` and temperature delta `<0.1mV` are compressed before event samples.

- [x] **A6: Run trace model test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected: pass.

## Batch B: Workbench State and Session Schema

**Purpose:** Persist trace store, config snapshots, and schema versions without changing UI behavior.

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Test: `tests/workbench/workbenchSessionPersistence.test.ts`
- Test: `tests/workbench/workbenchRunStopControls.test.ts`

- [x] **B1: Write failing session normalization test**

Create a heatCapacity file object without trace fields, pass through session normalization, and assert:

```ts
assert.equal(restored.heatCapacityFreeTraceVersion, 1);
assert.deepEqual(restored.heatCapacityFreeTraceStore.traceTrials, []);
```

- [x] **B2: Add trace fields to default heat-capacity files**

Default new files get:

```ts
heatCapacityFreeTraceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
heatCapacityFreeTraceStore: createDefaultFreeTraceStore(),
```

- [x] **B3: Add session normalization**

Normalize missing or invalid trace store to default empty store. Preserve valid trace trials and branches.

- [x] **B4: Run session tests**

Run:

```powershell
node tests\workbench\workbenchSessionPersistence.test.ts
node tests\workbench\workbenchRunStopControls.test.ts
```

Expected: pass.

## Batch C: Sampling and Event Capture Integration

**Purpose:** Capture hidden trace/event data from Free runtime and user actions.

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`

- [x] **C1: Write failing test for event sample creation**

Simulate Free Mode power on and pump stroke. Assert trace store contains:

```ts
events.some((event) => event.type === 'power-on')
events.some((event) => event.type === 'pump-stroke')
```

and every event references an existing sample.

- [x] **C2: Implement snapshot builder**

Add a helper that builds `HeatCapacityFreeTraceSample` from current workbench file, physics, sensor display, calibration, phase, and reason. It must not call `Date.now()`.

- [x] **C3: Integrate event capture in user action handlers**

Add event capture to:

- enter Free Mode
- exit Free Mode
- power on/off
- zero calibration
- pump valve open/close
- pump stroke
- stopcock open/close
- pressure warning/danger state transitions

- [x] **C4: Implement threshold-gated periodic sampling**

In Free runtime step, evaluate whether to keep a periodic sample. Respect dense check windows and idle slowdown. Do not save samples when dormant unless an event occurs.

- [x] **C5: Run integration tests**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected: pass.

## Batch D: Record Linkage and Branching

**Purpose:** Link official Free records to trace/event points and support rollback branches.

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityFreeRecordModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeTrialModel.ts`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/heatCapacityFreeRecordModel.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [x] **D1: Write failing test for record trace references**

Record U0/U1/U2 and assert each official record contains:

```ts
source: 'user',
traceTrialId,
traceBranchId,
traceSampleId,
eventId,
phaseAtRecord,
```

- [x] **D2: Extend record input and trial types**

Add optional trace metadata to `HeatCapacityFreeRecordInput`. Keep backward compatibility in normalization by filling missing values with `null` or default source where appropriate.

- [x] **D3: Write failing test for delete U1 branch behavior**

Delete U1 after U0/U1/U2 exist. Assert:

- U0 remains.
- U1/U2 are cleared.
- Previous branch becomes archived.
- New main branch is created.
- Branch count increments.

- [x] **D4: Implement branch archive/create helper**

Add a trace model helper:

```ts
archiveCurrentFreeTraceBranchForRecordInvalidation(...)
```

It writes `record-invalidated` and `branch-created` events, then returns updated store and new branch refs.

- [x] **D5: Wire delete actions**

Modify existing Free delete handling:

- Whole trial delete removes trace trial.
- U0/U1/U2 delete archives branch and starts new branch.

- [x] **D6: Run record and UI tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeRecordModel.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: pass.

## Batch E: Reset Semantics

**Purpose:** Make Reset safe, idempotent, and compatible with completed group preservation.

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
- Test: `tests/workbench/workbenchRunStopControls.test.ts`

- [x] **E1: Write failing test for completed trial reset**

Create one complete Free trial with trace. Call Reset twice. Assert:

- Complete trial remains.
- Its trace remains.
- No more than one blank current state exists.
- No extra empty trace trials are created.

- [x] **E2: Write failing test for incomplete trial reset**

Create incomplete Free trial with trace. Call Reset. Assert:

- Incomplete official data is cleared.
- Its incomplete trace is deleted.
- Completed older trials and traces remain.

- [x] **E3: Implement reset helper**

Update `resetHeatCapacityFreeRunWorkbenchState` or add a trace-aware wrapper. It must follow the state table in this plan.

- [x] **E4: Run reset tests**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\workbench\workbenchRunStopControls.test.ts
```

Expected: pass.

## Batch F: Config Snapshot and Calculation Version

**Purpose:** Preserve the parameters and calculation formula used by each Free trace/trial.

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeTrialModel.ts`
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Test: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeRecordModel.test.ts`

- [x] **F1: Write failing test for config snapshot preservation**

Create a Free trace trial and assert its snapshot stores environment, physics, sensor, and record config values copied at creation time.

- [x] **F2: Add snapshot creation helper**

Add:

```ts
createFreeConfigSnapshot(file, recordConfig)
```

The helper must copy values, not keep references.

- [x] **F3: Write failing test for calculation version in corrected signals**

Assert complete Free records include:

```ts
correctedSignals.calculationVersion === 'log-pressure-v1'
correctedSignals.atmosphericPressureKPa === snapshot.environment.ambientPressureKPa
correctedSignals.pressureSensitivityMvPerKPa === snapshot.sensor.pressureMvPerKPa
```

- [x] **F4: Implement calculation metadata**

Pass pressure formula options through `recordFreeU2` and `calculateFreeHeatCapacityMeanResult` so stored and recalculated results use the same explicit version and parameters.

- [x] **F5: Run calculation tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\heatCapacityFreeRecordModel.test.ts
```

Expected: pass.

## Batch G: Export Hiding and Visibility Guard

**Purpose:** Ensure true physical trace is saved internally but hidden from normal UI/export.

**Files:**
- Modify only if needed after inspection:
  - `src/features/workbench/workbenchResults.ts`
  - `tools/exporter/hsl_exporter.py`
  - related export tests if present
- Test:
  - existing export-related tests if present
  - `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [x] **G1: Inspect normal export payload**

Determine whether normal JSON/CSV export includes raw workbench file objects. If normal export would leak trace, add a sanitizer.

- [x] **G2: Write export-hidden test**

Assert regular export payload does not contain:

```text
heatCapacityFreeTraceStore
gasAmountRatio
gasTemperatureK
physical
```

- [x] **G3: Implement sanitizer if needed**

Remove trace from regular export while keeping saved experiment/session files unchanged.

- [x] **G4: Run export/UI tests**

Run relevant export tests plus:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: pass.

## Batch H: Full Verification

**Purpose:** Verify the data foundation without publishing or bumping app version.

**Files:** No intended source changes except fixes discovered by verification.

- [x] **H1: Run Free data tests**

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
node tests\heatCapacity\heatCapacityFreeCalibrationModel.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
node tests\heatCapacity\heatCapacityFreeRecordModel.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\heatCapacityFreeModePolicy.test.ts
```

- [x] **H2: Run workbench tests**

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
node tests\workbench\workbenchRunStopControls.test.ts
node tests\workbench\workbenchSessionPersistence.test.ts
```

- [x] **H3: Run diff and build checks**

```powershell
git diff --check
npm.cmd run build
```

- [x] **H4: Preview fixed port**

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open:

```text
http://127.0.0.1:5174/
```

- [x] **H5: Verify release safety**

Assert:

- `package.json` version unchanged.
- No GitHub release is created.
- Updater files are not modified unless unrelated pre-existing changes already exist.
- No temporary screenshots, trace dumps, caches, or scratch files remain.

## Expected Result

After this plan is implemented:

- Every Free trial can carry a hidden trace with true physical state and final sensor display state.
- Official U0/U1/U2 values remain user-clicked display records.
- Every official record can be traced to an event/sample point.
- Failed record attempts are preserved as diagnostic events.
- Deleting records creates archived branches instead of destroying diagnostic history.
- Reset is safe and idempotent.
- Completed group traces are preserved unless the whole group is deleted.
- Incomplete current experiment trace is deleted by Reset.
- Old files without trace fields still open.
- Normal UI and regular export do not expose true physical values.
- Later charts, diagnostics, best-window analysis, scoring, and Blender visual iteration can read this data without changing old file structure.
