# Heat Capacity Free Physics Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-version real thermodynamic engine for Free Mode only, while keeping Demo Mode and Guide Mode stable and isolated.

**Architecture:** Split heat-capacity behavior into scripted teaching profiles, a Free Mode physical runtime, a sensor/display layer, and a mode policy boundary. Demo/Guide continue to use controlled teaching profiles; Free Mode resets physical/sensor/runtime state into a separate physical session while keeping Free trial records until the user explicitly starts a new Free run.

**Tech Stack:** TypeScript, React, Vite, existing Node script tests under `scripts/`, existing workbench state/session modules.

---

## Confirmed Decisions

- Free Mode is the only mode using the new real thermodynamic engine in version 1.
- Demo Mode and Guide Mode can keep the existing scripted/preconfigured behavior, but their preset fields must be isolated from Free Mode.
- Switching into Free Mode resets Free Mode physical, sensor, runtime, and calibration state to a new runtime session. It does not clear existing Free trials.
- Existing Free trials are cleared only by an explicit `Reset Free Trial` or `New Free Run` action.
- Switching out of Free Mode restores the previously paused Demo/Guide state.
- Free Mode users can record U1/U2 and send records into the existing data-processing page.
- Free Mode record controls are persistent while Free Mode is active; valid recording should not make the buttons disappear.
- Free Mode does not expose a U0 record button. U0 is recorded automatically from the displayed instrument value after power-on, open stopcock, completed zeroing, and stable display are all satisfied.
- Free Mode must protect against deliberate or accidental bad re-zeroing after automatic U0. Every zero calibration has a version and history entry; if zeroing changes after U0, current Free trial recording is blocked until a new stable U0 is captured or the affected trial is reset.
- Free Mode gamma calculation uses zero-corrected display records: `U1Corrected = U1Display - U0Display`, `U2Corrected = U2Display - U0Display`, `gamma = U1Corrected / (U1Corrected - U2Corrected)`.
- Free Mode records instrument display values, not hidden physical truth values.
- Free Mode bad operation should block recording and explain why, rather than recording unusable data.
- Demo Mode must keep producing stable teaching-standard results.
- Guide Mode should continue correcting wrong operation and preventing invalid progression.
- Sensor randomness must be reproducible through a seed. The physical layer has no randomness in version 1.
- First version hides parameter UI, but the engine structure must reserve environment config fields for room-temperature baseline and atmospheric-pressure baseline.
- First version keeps temperature display in the current scale around 1499 mV, with later parameter controls allowed to shift ranges through environment config.
- First version uses ideal gas plus empirical corrections. It does not explicitly model bottle-wall or pipe heat capacity, continuous valve angle, or visible parameter controls.
- Old experiment cache compatibility is not required; cleanup/reset behavior is allowed.
- Plan documents are permanent project documentation, not temporary files.
- Teaching records and Free Mode records are stored separately and displayed according to active mode. Demo/Guide cannot overwrite Free Mode records, and Free Mode cannot overwrite teaching records.
- Demo/Guide restore after Free Mode means restoring file-level teaching state, teaching trial data, current teaching step, panel state, and user-visible teaching messages. It does not mean preserving timer remaining milliseconds or animation intermediate frames; timers must be restarted from restored state.

## Version 1 Non-Goals

- Do not replace Demo/Guide with the physical engine in version 1.
- Do not build visible parameter adjustment UI in version 1.
- Do not model continuous stopcock angle; use open/closed controls with flow coefficients.
- Do not explicitly model bottle-wall/pipe heat capacity; reserve type fields or extension seams only.
- Do not implement full compressible-flow CFD or multi-chamber gas dynamics.
- Do not make Free Mode force-good results. Free Mode should reward good operation and block invalid recording.

## Target File Boundaries

- `components/heatCapacity/heatCapacityExperimentRandom.ts`
  - Rename or reinterpret current preset fields as teaching/demo profile data.
  - Keep Demo/Guide profile generation here or in a renamed adjacent module.
- `components/heatCapacity/heatCapacityExperimentModel.ts`
  - Keep scripted Demo/Guide runtime behavior here initially.
  - Remove any assumption that this model is globally authoritative for Free Mode.
- `components/heatCapacity/heatCapacityFreePhysicsEngine.ts`
  - New Free Mode physical engine: environment, physical state, controls, stepping function, derived P/T/N values.
- `components/heatCapacity/heatCapacityFreeSensorModel.ts`
  - New instrument layer: seeded sampling interval, lag, display noise, quantization, displayed pressure/temperature mV.
- `components/heatCapacity/heatCapacityFreeCalibrationModel.ts`
  - New zero-calibration layer: zero offset, calibration versions, zero event history, automatic U0 eligibility.
- `components/heatCapacity/heatCapacityFreeRecordModel.ts`
  - New Free Mode record gate: automatic U0 readiness, calibration-version checks, stability checks, operation-quality checks, U1/U2 readiness, messages.
- `components/heatCapacity/heatCapacityFreeConstants.ts`
  - Shared Free Mode constants for stability thresholds, zero tolerance, quick-release tolerance, and target ranges.
- `components/heatCapacity/heatCapacityFreeModePolicy.ts`
  - New mode/trial/display-source contract: enter Free runtime reset, exit Free restore teaching snapshot, active display source, active trial source.
- `components/heatCapacity/heatCapacityFreeTrialModel.ts`
  - New Free trial data model: automatic U0, U1/U2 display values, corrected values, calibration version, record source, blocked reason, and Free result calculation.
- `components/heatCapacity/heatCapacityDisplaySource.ts`
  - New active display-source selector that prevents Free sensor output from being filtered again by teaching display response.
- `components/workbenchState.ts`
  - Store Free Mode runtime state separately from Demo/Guide runtime state.
  - Add hidden environment config fields with defaults.
- `components/workbenchSession.ts`
  - Normalize or reset new Free Mode fields in Batch 5 only. Old caches do not need full compatibility.
- `components/WorkbenchStudioPrototype.tsx`
  - Wire mode switching, Free Mode stepping, Free Mode record buttons, and record warnings.
- `components/heatCapacity/HeatCapacityInstrumentScene.tsx`
  - Reuse current instrument UI. It should read the active mode display values without knowing which engine produced them.
- `components/heatCapacity/HeatCapacityLeftPanel.tsx`
  - Must read the active trial source and show teaching records or Free records without mixing them.
- `scripts/heatCapacityFreePhysicsEngine.test.ts`
  - New physical invariants and user-operation tests.
- `scripts/heatCapacityFreeSensorModel.test.ts`
  - New sensor sampling/noise/reproducibility tests.
- `scripts/heatCapacityFreeCalibrationModel.test.ts`
  - New zero-calibration and automatic-U0 tests.
- `scripts/heatCapacityFreeRecordModel.test.ts`
  - New record gating tests.
- `scripts/heatCapacityFreeModePolicy.test.ts`
  - New mode/trial/display-source isolation tests.
- Existing regression tests:
  - `scripts/heatCapacityExperimentModel.test.ts`
  - `scripts/workbenchHeatCapacityInstrument.test.ts`
  - `scripts/workbenchHeatCapacityInstrumentUi.test.ts`
  - `scripts/heatCapacityTrialModel.test.ts`
  - `scripts/workbenchRunStopControls.test.ts`
  - `scripts/workbenchSessionPersistence.test.ts`

## Layer Contract

### Layer 1: Teaching Profile

Purpose: preserve Demo/Guide stability.

Allowed:
- Target ranges such as U1 105-130 mV.
- U2 near `U1 * (1 - 1 / gamma)`.
- Scripted teaching-friendly response profiles.
- Direct teaching readout targets when used only by Demo/Guide.

Forbidden:
- Free Mode reading `u1MeasuredMv`, `u2MeasuredMv`, `recoveryPressureMv`, or any later-renamed teaching-target fields.
- Teaching profile values being treated as physical truth globally.

### Layer 2: Free Physical State

Purpose: make Free Mode obey P/V/N/T relationships.

State:
- `environment.ambientTemperatureK`
- `environment.ambientPressureKPa`
- `vessel.volumeL`
- `gas.amountRatio`
- `gas.temperatureK`
- `controls.powerOn`
- `controls.pumpValveOpen`
- `controls.stopcockOpen`
- `time.simulationTimeS`
- `operationHistory.pumpStrokeCount`
- `operationHistory.maxPressureKPa`
- `operationHistory.releaseStarted`
- `operationHistory.lastStopcockOpenedAtS`
- `operationHistory.lastStopcockClosedAtS`
- `operationHistory.currentStopcockOpenDurationS`
- `operationHistory.releaseReference`

Derived rule:
- Pressure is never an independent long-lived physical state. It is derived from `amountRatio`, `temperatureK`, fixed volume, environment pressure, environment temperature, and optional correction factor.
- Closed vessel with no pumping keeps gas amount constant.
- Open stopcock changes gas amount according to pressure difference and flow coefficient.
- Pumping is a discrete event, not only a continuous time step.
- Every `stepFreePhysics` and event helper must be deterministic from explicit state, config, controls, event, and simulation time. The Free physical engine must not call `Date.now()` and must not depend on a random seed.
- Fast release must obey the Clément-Desormes relationship before empirical tuning is applied.

### Locked Physics Formula for Version 1

The Free Mode physical engine must lock the baseline quick-release relationship before UI integration:

```text
Before release:
P_before = P0 + deltaP1
T_before ~= T0

Fast release to ambient pressure:
T_cold = T_before * (P0 / P_before)^((gamma - 1) / gamma)

Closed recovery to ambient temperature:
P_after = P0 * T0 / T_cold
```

Small pressure-difference consequence:

```text
deltaP_after ~= deltaP1 * (1 - 1 / gamma)
```

Version 1 can include empirical factors for valve flow speed, heat exchange rate, pump heating, and sensor behavior, but these factors cannot override the locked relationship for a well-operated quick-release sequence. `releaseCoolingFactor` defaults to `1` and is only allowed to represent non-ideal correction or long-open deviation; well-operated quick-release baseline tests use the locked formula with this factor neutral. Calibration in later batches tunes physical parameters around this relationship; it must not write U1/U2 directly.

### PVTN Constraints Embedded From Reference Document

Reference document path:
`<project-root>\PVTN状态比较三线表_含比热容比推导.docx`

Version 1 tests must directly encode these constraints so implementation does not depend on opening the docx:

```text
V0 = V1 = V2 = V3 = V4
T1 > T0
T2 ~= T0
T3 < T0
T4 ~= T0
N1 = N2
N3 = N4
N1 = N2 > N3 = N4 > N0
P1 > P2 > P4 > P3 ~= P0
```

The first-version physical engine may use amount ratio instead of absolute moles, but closed periods must preserve that ratio exactly apart from explicit pump or valve events.

### Layer 3: Free Sensor State

Purpose: make displayed values realistic and recordable.

State:
- last sampled physical pressure and temperature.
- display pressure and temperature mV.
- display history window for pressure/temperature mV.
- derived `pressureSlopeMvPerS` and `temperatureSlopeMvPerS`.
- next sample time.
- seeded noise state.
- display quantization.

Rules:
- Sampling interval is seeded and irregular.
- Sensor maps derived physical pressure/temperature into raw instrument mV values, then applies lag, seeded noise, and quantization.
- Sensor does not own zero offset. It receives calibration state or zero offset as input when producing displayed pressure mV.
- Display value lags behind sampled physical truth.
- Noise affects display and therefore affects records.
- Same seed and same user actions produce the same display sequence.
- Free sensor output is the final display/record value. It must not pass through the existing Demo/Guide display response a second time.
- The Free sensor model must not call `Date.now()` internally. Tests and UI pass explicit `simulationTimeS` or `atMs`.

### Layer 3.5: Free Calibration State

Purpose: make U0 and zeroing traceable without polluting physical state.

State:
- `zeroOffsetMv`
- `calibrationVersion`
- `zeroEvents`
- `automaticU0Record`

Rules:
- Physics does not own zero offset or calibration version.
- A zero calibration event increments `calibrationVersion` and appends a zero event with timestamp, display pressure mV, display temperature mV, and source.
- Automatic U0 stores display pressure mV, display temperature mV, `calibrationVersion`, zero event id, and timestamp.
- U1/U2 can only belong to a trial whose calibration version matches the automatic U0 and the U1 record already captured for that trial.
- Free gamma calculation uses corrected display values:

```text
U1Corrected = U1Display - U0Display
U2Corrected = U2Display - U0Display
gamma = U1Corrected / (U1Corrected - U2Corrected)
```

- Data tables should show raw display values and corrected values so later error analysis can trace zeroing mistakes.

### Layer 4: Mode Policy

Purpose: prevent cross-contamination.

Rules:
- Enter Free Mode: reset Free Mode physical, sensor, runtime, and calibration state from default hidden environment config.
- Enter Free Mode must not clear existing Free trials. Free trial clearing belongs to an explicit `Reset Free Trial` or `New Free Run` action.
- Exit Free Mode: restore paused Demo/Guide state.
- Demo/Guide record and progress rules stay unchanged except for naming/boundary cleanup.
- Free Mode record rules use Free Mode record gate only.
- `heatCapacityMode` becomes explicit state for the heat-capacity file.
- `pausedTeachingSnapshot` becomes explicit state for restoring Demo/Guide after Free Mode.
- The mode policy owns a paused teaching snapshot for Demo/Guide state that must be restored when leaving Free Mode.
- Active display source is explicit: Demo/Guide use existing teaching display response; Free uses final Free sensor display.
- Active trial source is explicit: Demo/Guide use teaching trials; Free uses Free trials.

Paused teaching snapshot fields:
- teaching runtime file fields needed by Demo/Guide.
- teaching trials and processing result.
- active teaching step.
- selected heat-capacity panel and open heat-capacity tabs.
- user-visible teaching guidance/toast message state.
- demo/guide paused/running identity.

Paused teaching snapshot exclusions:
- timer remaining milliseconds.
- animation intermediate frames.
- transient hover/focus state.

## Version 1 Record and Stability Constants

These constants are part of the version 1 plan so record gating is not left to subjective implementation judgment. If later testing shows the values feel wrong, change the named constants and tests together.

- `FREE_DISPLAY_STABLE_WINDOW_S = 1.2`
- `FREE_PRESSURE_STABLE_SLOPE_MAX_MV_PER_S = 0.25`
- `FREE_TEMPERATURE_STABLE_SLOPE_MAX_MV_PER_S = 0.12`
- `FREE_TEMPERATURE_AMBIENT_TOLERANCE_MV = 0.35`
- `FREE_U0_ZERO_TOLERANCE_MV = 0.12`
- `FREE_MIN_EFFECTIVE_U1_CORRECTED_MV = 90`
- `FREE_STANDARD_U1_CORRECTED_RANGE_MV = [105, 130]`
- `FREE_MIN_U2_CORRECTED_MV = 0.2`
- `FREE_MAX_U2_CORRECTED_RATIO_OF_U1 = 0.55`
- `FREE_GOOD_OPERATION_U2_TOLERANCE_MV = 8`
- `FREE_QUICK_RELEASE_RELATION_TOLERANCE_MV = 6`

Record handling around pressure safety:
- If current pressure is in danger status, block new U1/U2 recording and show a warning message.
- A previous danger event does not permanently invalidate the physical state. After pressure returns to stable and record constraints are satisfied, recording can proceed.
- Past danger events remain in operation history for version 2 scoring and error-cause analysis.

## Batch Plan

### 2026-05-19 Revision: Manual Free Recording UX

This revision supersedes the earlier Version 1 Free Mode record-control rule that hid the U0 record action.

New required behavior:
- Free Mode must expose persistent `U0`, `U1`, and `U2` record buttons in the 3D lower-right record-control area.
- User-clicked records are the authoritative Free trial records. Free gamma calculation must use the user-clicked `U0DisplayMv`, `U1DisplayMv`, and `U2DisplayMv`.
- The existing automatic U0 capture code must not be deleted. It is demoted from "required trial record" to an advisory/diagnostic candidate layer.
- Automatic capture may be reused later to track the best stable zero candidate, best operation candidate, or theoretical operation upper bound, but it must never silently replace user-clicked records or unblock a trial by itself.
- Free record tables and processing tables must be localized through the same `zh-CN` / `zh-TW` / `en` copy mechanism as the rest of `HeatCapacityLeftPanel.tsx`.
- Free pump default gain and safety policy must be tuned so a normal user can pump with roughly teaching-mode-like feel before warning/danger, instead of reaching warning/danger after only a few strokes.
- Free warning/danger feedback and pump blocking must use the same visible safety thresholds and event behavior as Guide Mode:
  - warning at `HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV`;
  - danger at `HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV`;
  - once danger is reached, further pump strokes must not be accepted by the Free physical state;
  - warning toast and center alarm behavior must match the Guide Mode trigger rules.

Implementation constraints:
- Do not delete `captureAutomaticU0IfReady`, `automaticU0`, or zero-event history code. Keep tests proving deterministic automatic capture works as an advisory signal.
- Rename or add trial fields so the source distinction is explicit:
  - user-clicked trial record: `u0`, `u1`, `u2`;
  - advisory automatic candidate: `automaticU0` or a later renamed `automaticU0Candidate`.
- Calibration-version protection still applies to user-clicked U0/U1/U2: if the user re-zeros after recording U0, existing U1/U2 recording must be blocked until the user records a fresh U0 or starts/resets the Free trial.
- The automatic candidate can be displayed as advisory status, but it must be visually separate from the user-recorded trial table.

### 2026-05-19 Revision 2: Approved Manual-U012 Scope

This revision records the approved behavior boundary before Batch 9 implementation.

Approved decisions:
- Free `U0`, `U1`, and `U2` are all user-clicked official records.
- The Free `U0` button must require an already valid zeroing context: power on, stopcock open, pressure zeroed, stable display, and a latest zero event. If there is no latest zero event, the button must block with guidance asking the user to zero first. It must not silently create a zero event.
- `automaticU0` remains as a deterministic advisory candidate captured by the existing automatic code path. It is not a formal record, must not fill `trial.u0`, must not unlock `U1`/`U2`, and must not participate in official gamma calculation.
- The "operation upper bound / best value" idea is explicitly deferred. Batch 9 only preserves the data foundation for later analysis; it must not add a scoring model, operation upper-bound result, best-value table column, or new processing calculation.
- Any saved Free trial that has only `automaticU0` and no user-clicked `u0` must be treated as incomplete after normalization. The saved automatic candidate may be preserved for display, but it cannot become an official trial record.

Implementation approach:
- Add `u0` to the Free trial model and make official Free gamma calculation depend on `u0`, `u1`, and `u2`.
- Add manual `U0` evaluation and record helpers in the Free record model. Keep automatic capture helpers in the calibration model unchanged unless a type alias or naming helper is required.
- Wire the lower-right Free record controls to call `recordFreeHeatCapacitySample('u0' | 'u1' | 'u2')`.
- Localize Free record and processing tables through `copyByLanguage`.
- Tune Free pump gain and block additional pump strokes by the same visible danger threshold used by Guide Mode.

### Batch 9: Manual Free Recording and Teaching-Like Safety Feel

**Purpose:** Correct Free Mode UX so it uses the real physics engine while matching the manual recording and safety feel of Guide Mode.

**Files:**
- Modify: `components/WorkbenchStudioPrototype.tsx`
- Modify: `components/heatCapacity/HeatCapacityLeftPanel.tsx`
- Modify: `components/workbenchState.ts`
- Modify: `components/workbenchSession.ts`
- Modify: `components/heatCapacity/heatCapacityFreeRecordModel.ts`
- Modify: `components/heatCapacity/heatCapacityFreeTrialModel.ts`
- Modify: `components/heatCapacity/heatCapacityFreeCalibrationModel.ts` only if type naming is needed; do not change automatic-capture semantics
- Test: `scripts/workbenchHeatCapacityInstrumentUi.test.ts`
- Test: `scripts/workbenchHeatCapacityInstrument.test.ts`
- Test: `scripts/heatCapacityFreeRecordModel.test.ts`
- Test: `scripts/heatCapacityFreeCalibrationModel.test.ts`
- Test: `scripts/workbenchSessionPersistence.test.ts`

- [x] Add failing tests that Free Mode renders persistent `U0`, `U1`, and `U2` record buttons in the 3D lower-right record area.
- [x] Add failing tests that clicking Free `U0` writes a user record using the current Free sensor display value, current calibration version, and latest zero event id.
- [x] Add failing tests that clicking Free `U0` is blocked when there is no latest zero event; the click must not call or emulate `applyFreeZeroCalibration`.
- [x] Add failing tests that Free `U1`/`U2` record gates require the user-clicked `U0`, not the automatic candidate.
- [x] Add failing tests that automatic U0 remains available as an advisory candidate but does not replace or silently create the user trial `u0`.
- [x] Add failing tests that official Free trial signals and processing use `trial.u0`, not `trial.automaticU0`.
- [x] Add failing tests that saved automatic-only Free trials normalize as incomplete unless they contain a user-clicked `u0`.
- [x] Add failing tests that Free record and processing tables render localized Chinese copy for `zh-CN` and no hard-coded English labels remain in the Chinese table path.
- [x] Add failing tests that normal Free pumping has teaching-like feel: several strokes should not immediately hit danger; the target U1 range remains near 105-130 mV under good operation.
- [x] Add failing tests that Free pump warning/danger behavior matches Guide Mode thresholds and further pump strokes are rejected at the visible danger threshold.
- [x] Add failing tests that Batch 9 does not introduce operation scoring, best-value columns, or upper-bound processing output.
- [x] Implement minimal code to pass tests.
- [x] Run:

```powershell
node scripts\workbenchHeatCapacityInstrumentUi.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
node scripts\heatCapacityFreeRecordModel.test.ts
node scripts\heatCapacityFreeCalibrationModel.test.ts
node scripts\heatCapacityFreePhysicsEngine.test.ts
node scripts\workbenchSessionPersistence.test.ts
npm.cmd run build
```

**Acceptance:**
- Free Mode records can progress through user-clicked U0, U1, and U2 without relying on hidden automatic capture.
- The Free U0 button blocks without a latest zero event and never creates zero calibration by itself.
- Automatic U0 remains deterministic and available only as an advisory candidate.
- No operation upper-bound, best-value, or scoring output is added in Batch 9.
- Existing automatic-only Free trials are not treated as complete official records after session normalization.
- Free tables are localized and do not show English labels in Simplified Chinese mode.
- Free pumping and warning/danger behavior feel consistent with Guide Mode while still deriving values from Free physical/sensor state.
- No Demo Mode or Guide Mode teaching flow changes.

### Batch 0: Inventory and Safety Baseline

**Purpose:** Freeze current behavior and identify exact scripted fields before changing boundaries.

**Files:**
- Read: `components/heatCapacity/heatCapacityExperimentRandom.ts`
- Read: `components/heatCapacity/heatCapacityExperimentModel.ts`
- Read: `components/workbenchState.ts`
- Read: `components/WorkbenchStudioPrototype.tsx`
- Modify: test files listed below

- [x] List every field currently acting as a teaching preset: `u1MeasuredMv`, `u2MeasuredMv`, `recoveryPressureMv`, `stableBeforeReleaseMv`, `releaseTemperatureLowMv`, `thermalRecoveryRate`, and related fields.
- [x] Add or extend tests proving Demo/Guide baseline still produces U1 around 105-130 mV and U2 near `U1 * (1 - 1 / gamma)`.
- [x] Run:

```powershell
node scripts\heatCapacityExperimentModel.test.ts
node scripts\heatCapacityAutoDemo.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
node scripts\workbenchHeatCapacityInstrumentUi.test.ts
```

**Acceptance:**
- Current Demo/Guide behavior is covered before boundary edits.
- No Free Mode engine code exists yet.
- Working tree contains only test or documentation changes from this batch.

### Batch 1: Preset Boundary Cleanup

**Purpose:** Demote old result presets into Demo/Guide teaching profile semantics without changing visible behavior.

**Files:**
- Modify: `components/heatCapacity/heatCapacityExperimentRandom.ts`
- Modify: `components/heatCapacity/heatCapacityExperimentModel.ts`
- Modify: `components/workbenchState.ts`
- Test: `scripts/heatCapacityExperimentRandom.test.ts`
- Test: `scripts/workbenchHeatCapacityInstrument.test.ts`

- [x] Rename or document profile ownership so teaching preset fields are clearly Demo/Guide-only.
- [x] Create a type boundary named `HeatCapacityTeachingProfile`.
- [x] Ensure Free Mode state will not include teaching-target fields.
- [x] Run:

```powershell
node scripts\heatCapacityExperimentRandom.test.ts
node scripts\heatCapacityExperimentModel.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
```

**Acceptance:**
- Demo/Guide behavior unchanged.
- Teaching preset fields are no longer described or typed as global physical truth.
- No Free Mode runtime consumes teaching target values.

### Batch 2A: Free Physical Formula and API Lock

**Purpose:** Lock the Free Mode physics formula and event API before any UI or record wiring.

**Files:**
- Create: `components/heatCapacity/heatCapacityFreePhysicsEngine.ts`
- Create: `scripts/heatCapacityFreePhysicsEngine.test.ts`

Required public API:

```ts
export interface HeatCapacityFreeEnvironmentConfig {
  ambientTemperatureK: number;
  ambientPressureKPa: number;
}

export interface HeatCapacityFreePhysicsConfig {
  environment: HeatCapacityFreeEnvironmentConfig;
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpTemperatureGainK: number;
  sealedThermalRate: number;
  openThermalRate: number;
  stopcockFlowRate: number;
  // Default 1. Well-operated quick-release tests keep this neutral.
  releaseCoolingFactor: number;
}

export interface HeatCapacityFreePhysicsState {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  pumpStrokeCount: number;
  maxPressureKPa: number;
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

export interface HeatCapacityFreeControls {
  powerOn: boolean;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
}

export interface HeatCapacityFreePumpStrokeEvent {
  atS: number;
  strength: number;
}

export type HeatCapacityFreePumpStrokeRejectReason =
  | 'powerOff'
  | 'pumpValveClosed'
  | 'stopcockOpen'
  | 'pressureDanger';

export interface HeatCapacityFreePumpStrokeResult {
  accepted: boolean;
  reason: 'accepted' | HeatCapacityFreePumpStrokeRejectReason;
  state: HeatCapacityFreePhysicsState;
}
```

- Required functions:

```ts
export const createDefaultFreePhysicsState = (
  config: HeatCapacityFreePhysicsConfig,
) => HeatCapacityFreePhysicsState;

export const applyFreePumpStroke = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  controls: HeatCapacityFreeControls,
  event: HeatCapacityFreePumpStrokeEvent,
) => HeatCapacityFreePumpStrokeResult;

export const stepFreePhysics = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  controls: HeatCapacityFreeControls,
  dtS: number,
  atS: number,
) => HeatCapacityFreePhysicsState;

export const deriveFreePhysicalState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
) => {
  gasPressureKPa: number;
  pressureDeltaKPa: number;
};

```

- [x] Write failing tests for initial equilibrium: P equals ambient pressure, T equals ambient temperature, gas amount ratio equals 1.
- [x] Write failing invariant test proving pressure is derived from amount and temperature and cannot drift from stored state.
- [x] Write failing tests for closed waiting: gas amount is constant and pressure changes only through temperature.
- [x] Write failing tests for pumping: gas amount increases, temperature increases, pressure increases.
- [x] Write failing tests for `applyFreePumpStroke`: one accepted stroke increments `pumpStrokeCount`, raises `maxPressureKPa`, and does not require a continuous step to create pressure gain.
- [x] Write failing reject tests for `applyFreePumpStroke`: power off, pump valve closed, stopcock open, and pressure danger each return `{ accepted: false, reason, state }` without physical state mutation.
- [x] Write failing tests for open stopcock: if pressure is above ambient, gas flows out; if pressure is below ambient, gas can flow in.
- [x] Write failing tests for `releaseReference`: opening the stopcock after stable pumping stores pressure, temperature, amount, and opening time.
- [x] Write failing tests for locked quick-release formula: a well-operated sequence produces `deltaP_after` close to `deltaP_before * (1 - 1 / gamma)` within an explicit tolerance.
- [x] Write failing tests for long-open behavior: pressure and temperature approach environment without artificial rebound.
- [x] Write failing tests that reopening after recovery vents again if pressure remains above ambient.
- [x] Write failing tests proving all engine functions are deterministic from explicit state/config/time, with no `Date.now()` dependency and no random seed dependency.
- [x] Implement minimal engine to pass tests.
- [x] Run:

```powershell
node scripts\heatCapacityFreePhysicsEngine.test.ts
```

**Acceptance:**
- P/V/N/T constraints from the PVTN document hold in Free Mode tests.
- State 2 and state 4 closed-wait periods preserve gas amount.
- Reopening after state 4 still vents if pressure remains above ambient.
- The quick-release formula is tested before calibration.
- `releaseReference` exists before any continuous-flow tuning.
- UI integration can call `applyFreePumpStroke` directly from the existing pump-bulb event path.
- No React or UI code depends on this engine yet.

### Batch 2B: Free Calibration Contract

**Purpose:** Define zero calibration, automatic U0, and corrected-value calculation before record gate or UI work.

**Files:**
- Create: `components/heatCapacity/heatCapacityFreeCalibrationModel.ts`
- Create: `scripts/heatCapacityFreeCalibrationModel.test.ts`

Required public API:

```ts
export interface HeatCapacityFreeZeroEvent {
  id: string;
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  zeroOffsetMv: number;
  source: 'user' | 'auto';
}

export interface HeatCapacityFreeCalibrationState {
  calibrationVersion: number;
  zeroOffsetMv: number;
  zeroEvents: HeatCapacityFreeZeroEvent[];
  automaticU0: {
    displayPressureMv: number;
    displayTemperatureMv: number;
    calibrationVersion: number;
    zeroEventId: string;
    atS: number;
  } | null;
}

export const applyFreeZeroCalibration = (
  state: HeatCapacityFreeCalibrationState,
  event: Omit<HeatCapacityFreeZeroEvent, 'id'>,
) => HeatCapacityFreeCalibrationState;

export const captureAutomaticU0IfReady = (
  state: HeatCapacityFreeCalibrationState,
  input: {
    atS: number;
    powerOn: boolean;
    stopcockOpen: boolean;
    zeroed: boolean;
    zeroEventId: string;
    pressureStable: boolean;
    temperatureStable: boolean;
    displayPressureMv: number;
    displayTemperatureMv: number;
  },
) => HeatCapacityFreeCalibrationState;

export const getFreeCorrectedSignals = (
  records: {
    U0DisplayMv: number;
    U1DisplayMv: number;
    U2DisplayMv: number;
  },
) => {
  U1CorrectedMv: number;
  U2CorrectedMv: number;
  gamma: number;
};
```

- Zero event id generation is deterministic. `applyFreeZeroCalibration` must assign the new event id as `zero-${calibrationVersion + 1}` after incrementing the version, never from `Date.now()` or a random source.

- [x] Write failing test for zero calibration version increment and zero event append.
- [x] Write failing test for automatic U0 capture only when powered, open, zeroed, and stable.
- [x] Write failing test that automatic U0 refuses capture when display pressure is outside `FREE_U0_ZERO_TOLERANCE_MV` or the provided zero event id is not the latest zero event.
- [x] Write failing test that a later zero event invalidates prior automatic U0 for new U1/U2 records.
- [x] Write failing test for corrected gamma: `U1Corrected = U1Display - U0Display`, `U2Corrected = U2Display - U0Display`.
- [x] Write failing test that physics state is not modified by zero calibration.
- [x] Run:

```powershell
node scripts\heatCapacityFreeCalibrationModel.test.ts
```

**Acceptance:**
- Calibration is separate from physical state.
- Automatic U0 has a traceable zero event and calibration version.
- Free gamma calculation uses corrected display values.
- Bad re-zeroing has a testable state transition before UI work begins.

### Batch 2C: Mode, Trial, and Display Source Contract

**Purpose:** Define state separation before UI wiring so Free Mode does not contaminate Demo/Guide.

**Files:**
- Create: `components/heatCapacity/heatCapacityFreeModePolicy.ts`
- Create: `scripts/heatCapacityFreeModePolicy.test.ts`
- Create: `components/heatCapacity/heatCapacityDisplaySource.ts`

Required contract:
- Explicit mode value for `demo`, `guide`, and `free`.
- Entering Free resets Free physical, sensor, runtime, and calibration state.
- Entering Free does not clear existing Free trials. `Reset Free Trial` or `New Free Run` is the only path that clears Free trial records.
- Entering Free stores a paused teaching snapshot if Demo/Guide was active.
- Exiting Free restores the paused teaching snapshot at file/step/panel/message level. Timer remaining milliseconds and animation intermediate frames are not restored; timers restart from restored state.
- Teaching trials and Free trials are separate.
- Active display source is explicit by mode.

Required public API:

```ts
export type HeatCapacityMode = 'demo' | 'guide' | 'free';

export interface HeatCapacityTeachingTrialFixture {
  id: string;
  source: 'teaching';
}

export interface HeatCapacityTeachingSnapshot {
  teachingRuntime: {
    phase: string;
    activeStepIndex: number;
  };
  teachingTrials: HeatCapacityTeachingTrialFixture[];
  teachingProcessingResult: {
    gamma: number;
  } | null;
  activeTeachingStep: string | null;
  panelState: {
    activePanelId: string;
  };
  messageState: {
    text: string;
    tone: 'info' | 'warning' | 'success';
  } | null;
  teachingModeIdentity: 'demo' | 'guide' | null;
}

export interface HeatCapacityModePolicyState {
  heatCapacityMode: HeatCapacityMode;
  pausedTeachingSnapshot: HeatCapacityTeachingSnapshot | null;
  teachingTrials: HeatCapacityTeachingTrialFixture[];
  freeTrials: HeatCapacityFreeTrial[];
  teachingDisplay: HeatCapacityDisplaySource;
  freeDisplay: HeatCapacityDisplaySource;
}

export interface HeatCapacityDisplaySource {
  source: 'teaching' | 'free';
  pressureMv: number;
  temperatureMv: number;
}

export interface HeatCapacityTrialSource {
  source: 'teaching' | 'free';
  trials: HeatCapacityTeachingTrialFixture[] | HeatCapacityFreeTrial[];
}

export const enterHeatCapacityFreeModePolicy = (
  state: HeatCapacityModePolicyState,
  atS: number,
) => HeatCapacityModePolicyState;

export const exitHeatCapacityFreeModePolicy = (
  state: HeatCapacityModePolicyState,
  atS: number,
) => HeatCapacityModePolicyState;

export const resetHeatCapacityFreeTrialsPolicy = (
  state: HeatCapacityModePolicyState,
) => HeatCapacityModePolicyState;

export const selectActiveHeatCapacityDisplay = (
  file: HeatCapacityModePolicyState,
) => HeatCapacityDisplaySource;

export const selectActiveHeatCapacityTrials = (
  file: HeatCapacityModePolicyState,
) => HeatCapacityTrialSource;
```

- [x] Add tests proving Free Mode runtime reset does not mutate paused Demo/Guide teaching snapshot.
- [x] Add tests proving entering Free Mode does not clear existing Free trials.
- [x] Add tests proving `resetHeatCapacityFreeTrialsPolicy` clears only Free trials and leaves teaching trials unchanged.
- [x] Add tests proving exiting Free restores Demo/Guide mode state.
- [x] Add tests proving Free trials and teaching trials do not overwrite each other.
- [x] Add tests proving active display source selects teaching display for Demo/Guide and Free sensor display for Free.
- [x] Run:

```powershell
node scripts\heatCapacityFreeModePolicy.test.ts
```

**Acceptance:**
- Mode switching has a clear state contract before UI wiring.
- Free Mode and teaching modes have independent trial storage.
- There is one active display source per mode.
- This batch does not modify real workbench state/session modules; it defines pure policy and display-source contracts with fixtures.

### Batch 3: Free Sensor and Instrument Display Layer

**Purpose:** Convert Free Mode physical truth into seeded, lagged, noisy, recordable display values.

**Files:**
- Create: `components/heatCapacity/heatCapacityFreeSensorModel.ts`
- Create: `scripts/heatCapacityFreeSensorModel.test.ts`

Required public API:

```ts
export interface HeatCapacityFreeDisplaySample {
  atS: number;
  valueMv: number;
}

export interface HeatCapacityFreeSensorConfig {
  pressureMvPerKPa: number;
  temperatureMvAtAmbient: number;
  temperatureMvPerK: number;
  lagRate: number;
  noiseMv: number;
  quantizationMv: number;
  minSampleIntervalS: number;
  maxSampleIntervalS: number;
  historyWindowS: number;
}

export interface HeatCapacityFreePhysicalDisplayInput {
  gasPressureKPa: number;
  pressureDeltaKPa: number;
  gasTemperatureK: number;
}

export interface HeatCapacityFreeSensorState {
  seed: number | string;
  displayPressureMv: number;
  displayTemperatureMv: number;
  nextSampleAtS: number;
  pressureHistory: HeatCapacityFreeDisplaySample[];
  temperatureHistory: HeatCapacityFreeDisplaySample[];
  pressureSlopeMvPerS: number;
  temperatureSlopeMvPerS: number;
}

export const createDefaultFreeSensorState = (
  seed: number | string,
  initialDisplay: {
    pressureMv: number;
    temperatureMv: number;
  },
) => HeatCapacityFreeSensorState;

export const stepFreeSensor = (
  state: HeatCapacityFreeSensorState,
  physical: HeatCapacityFreePhysicalDisplayInput,
  calibration: HeatCapacityFreeCalibrationState,
  config: HeatCapacityFreeSensorConfig,
  atS: number,
) => HeatCapacityFreeSensorState;

export const getFreeSensorDisplay = (
  state: HeatCapacityFreeSensorState,
) => {
  displayPressureMv: number;
  displayTemperatureMv: number;
  pressureSlopeMvPerS: number;
  temperatureSlopeMvPerS: number;
};
```

Required behaviors:
- Same seed plus same physical sequence yields identical displayed values.
- Different seed yields different small noise.
- Display values update on seeded sampling intervals.
- Display values lag physical jumps.
- Quantization keeps pressure/temperature display in the existing mV style.
- Sensor keeps a display-history window and exposes slopes for record gating.
- Sensor output is already final display data for Free Mode. Workbench integration, not the sensor module itself, is responsible for bypassing teaching display lag/jitter.

- [x] Write failing reproducibility test.
- [x] Write failing display-lag test.
- [x] Write failing irregular-sampling test.
- [x] Write failing record-value test showing records use display values.
- [x] Write failing slope-history test for stable and unstable display windows.
- [x] Implement sensor model.
- [x] Run:

```powershell
node scripts\heatCapacityFreeSensorModel.test.ts
```

**Acceptance:**
- Sensor randomness is deterministic under seed.
- Records can read display state without reading physical truth.
- Record gate can read display history and slopes from the sensor layer.
- Current temperature baseline around 1499 mV remains default.
- Environment config can shift baseline later without changing the sensor API.

### Batch 4: Free Record Gate

**Purpose:** Decide when Free Mode users may record U1/U2 and when to block with clear guidance.

**Files:**
- Create: `components/heatCapacity/heatCapacityFreeRecordModel.ts`
- Create: `scripts/heatCapacityFreeRecordModel.test.ts`
- Create: `components/heatCapacity/heatCapacityFreeTrialModel.ts`
- Modify: `components/heatCapacity/heatCapacityTrialModel.ts` only if shared teaching-safe types must be extracted; teaching calculation behavior remains unchanged.
- Export `calculateFreeHeatCapacityMeanResult` from `components/heatCapacity/heatCapacityFreeTrialModel.ts`.
- Keep teaching `calculateHeatCapacityMeanResult` unchanged.

Required public API:

```ts
export type HeatCapacityFreeRecordRejectReason =
  | 'missing-u0'
  | 'calibration-changed'
  | 'unstable-pressure'
  | 'unstable-temperature'
  | 'insufficient-u1'
  | 'release-not-started'
  | 'over-vented'
  | 'pressure-danger'
  | 'invalid-sequence';

export interface HeatCapacityFreeRecordEvaluation {
  ready: boolean;
  reason: 'ready' | HeatCapacityFreeRecordRejectReason;
}

export interface HeatCapacityFreeRecordConfig {
  pressureStableSlopeMvPerS: number;
  temperatureStableSlopeMvPerS: number;
  temperatureAmbientToleranceMv: number;
  minimumUsefulU1CorrectedMv: number;
  overVentedMinimumU2CorrectedMv: number;
  pressureDangerMv: number;
}

export interface HeatCapacityFreeRecordInput {
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  calibrationVersion: number;
  zeroEventId: string;
}

export interface HeatCapacityFreeRecordResult {
  accepted: boolean;
  reason: 'accepted' | HeatCapacityFreeRecordRejectReason;
  trial: HeatCapacityFreeTrial;
}

export interface HeatCapacityFreeTrial {
  id: string;
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'];
  u1: HeatCapacityFreeRecordInput | null;
  u2: HeatCapacityFreeRecordInput | null;
  blockedReason: HeatCapacityFreeRecordRejectReason | null;
}

export const evaluateFreeU1Record = (
  trial: HeatCapacityFreeTrial,
  calibration: HeatCapacityFreeCalibrationState,
  display: ReturnType<typeof getFreeSensorDisplay>,
  physics: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreeRecordConfig,
) => HeatCapacityFreeRecordEvaluation;

export const evaluateFreeU2Record = (
  trial: HeatCapacityFreeTrial,
  calibration: HeatCapacityFreeCalibrationState,
  display: ReturnType<typeof getFreeSensorDisplay>,
  physics: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreeRecordConfig,
) => HeatCapacityFreeRecordEvaluation;

export const recordFreeU1 = (
  trial: HeatCapacityFreeTrial,
  input: HeatCapacityFreeRecordInput,
) => HeatCapacityFreeRecordResult;

export const recordFreeU2 = (
  trial: HeatCapacityFreeTrial,
  input: HeatCapacityFreeRecordInput,
) => HeatCapacityFreeRecordResult;
```

Record rules:
- U0 has no visible button. It is automatically captured after power-on, open stopcock, completed zeroing, and stable display.
- Every automatic U0 stores `calibrationVersion`, display pressure mV, display temperature mV, timestamp, and zero-event id.
- If zero offset changes after automatic U0 and before U1/U2 completion, the current Free trial becomes blocked until a new stable U0 is captured or the affected trial is reset.
- U1 can be recorded only after pumping, stopcock closed, pressure display stable, temperature display close to environment baseline, pressure above the minimum useful range, and current `calibrationVersion` matching the automatic U0.
- U2 can be recorded only after a release has occurred, stopcock closed, pressure display stable, temperature display close to environment baseline, `0 < U2 < U1`, and current `calibrationVersion` matching the trial U1.
- Free trial records store raw display values and corrected values:
  - `U0DisplayMv`
  - `U1DisplayMv`
  - `U2DisplayMv`
  - `U1CorrectedMv = U1DisplayMv - U0DisplayMv`
  - `U2CorrectedMv = U2DisplayMv - U0DisplayMv`
- Free data processing uses `U1CorrectedMv` and `U2CorrectedMv` for gamma calculation.
- Bad operation blocks record and returns a message.
- Warning/danger pressure does not corrupt the engine; it only affects record eligibility and user feedback.

- [x] Write failing U1-ready test for good operation.
- [x] Write failing automatic-U0 test for stable open-stopcock zeroed state.
- [x] Write failing calibration-version test: bad re-zero after U0 blocks U1/U2 recording.
- [x] Write failing U1-blocked test for unstable pressure/temperature.
- [x] Write failing U2-ready test for quick release and recovery.
- [x] Write failing U2-blocked test for long-open over-vented operation if U2 is too low or unstable.
- [x] Write failing tests that blocked records return stable reason codes: `missing-u0`, `unstable-pressure`, `unstable-temperature`, `calibration-changed`, `over-vented`, and `invalid-sequence`.
- [x] Write failing test proving record output uses sensor display mV.
- [x] Write failing Free gamma calculation test using `U1 - U0` and `U2 - U0`.
- [x] Write failing test proving teaching gamma calculation remains unchanged.
- [x] Write failing test for `calculateFreeHeatCapacityMeanResult` using raw display values plus corrected values.
- [x] Implement record gate.
- [x] Run:

```powershell
node scripts\heatCapacityFreeRecordModel.test.ts
node scripts\heatCapacityTrialModel.test.ts
```

**Acceptance:**
- Free Mode can automatically capture U0 and produce complete U1/U2 trial data.
- A later bad zeroing operation cannot silently contaminate the trial.
- Free data processing uses zero-corrected signals.
- Teaching data processing remains unchanged.
- Bad operation is blocked before entering the data table.
- Blocking logic is independent of Demo/Guide step logic.

### Batch 5: Workbench State and Mode Switching

**Purpose:** Store Free Mode separately and make switching clean.

**Files:**
- Modify: `components/workbenchState.ts`
- Modify: `components/workbenchSession.ts`
- Modify: `components/WorkbenchStudioPrototype.tsx`
- Modify: `components/heatCapacity/heatCapacityFreeModePolicy.ts`
- Modify: `components/heatCapacity/heatCapacityDisplaySource.ts`
- Test: `scripts/heatCapacityFreeModePolicy.test.ts`
- Test: `scripts/workbenchRunStopControls.test.ts`
- Test: `scripts/workbenchSessionPersistence.test.ts`
- Test: `scripts/workbenchHeatCapacityInstrument.test.ts`

Required behavior:
- Enter Free Mode resets Free Mode physical, sensor, runtime, and calibration state, but does not clear existing Free trials.
- Exit Free Mode restores prior Demo/Guide state.
- Switching does not rebuild unrelated UI or reset 3D scene assets.
- Hidden environment config exists with defaults:
  - `ambientTemperatureK = 298.15`
  - `ambientPressureKPa = 101.3`
- `selectActiveHeatCapacityDisplay()` chooses one display source:
  - teaching display response for Demo/Guide.
  - final Free sensor display for Free Mode.

- [x] Add Free Mode runtime fields to heat-capacity workbench state.
- [x] Add mode policy helpers for entering/exiting Free Mode.
- [x] Add `selectActiveHeatCapacityDisplay()` and route Free Mode around teaching display response.
- [x] Add `heatCapacityFreeRuntimeVersion` as the local version field for heat-capacity Free runtime normalization.
- [x] Add session normalization that resets incompatible or stale Free Mode runtime fields only; do not globally reset unrelated session data.
- [x] Write tests for mode switching reset/restore.
- [x] Write tests that entering Free Mode preserves existing Free trials until explicit Free trial reset.
- [x] Write tests that teaching profile fields do not exist in Free Mode runtime.
- [x] Write tests that Free sensor display is not passed through teaching display response.
- [x] Run:

```powershell
node scripts\heatCapacityFreeModePolicy.test.ts
node scripts\workbenchRunStopControls.test.ts
node scripts\workbenchSessionPersistence.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
```

**Acceptance:**
- Mode switch is state-only and should not cause visible lag.
- Free Mode and Demo/Guide states do not overwrite each other.
- Free display values are not double-filtered.
- Old saved heat-capacity Free runtime can be cleaned/reset safely through the local Free runtime version.

### Batch 6: Free Mode UI Wiring and Recording

**Purpose:** Make Free Mode usable in the current interface.

**Files:**
- Modify: `components/WorkbenchStudioPrototype.tsx`
- Modify: `components/heatCapacity/HeatCapacityInstrumentScene.tsx`
- Modify: `components/heatCapacity/HeatCapacityLeftPanel.tsx`
- Modify: `components/heatCapacity/heatCapacityTrialModel.ts`
- Modify: `components/heatCapacity/heatCapacityFreeTrialModel.ts`
- Test: `scripts/workbenchHeatCapacityInstrumentUi.test.ts`
- Test: `scripts/workbenchHeatCapacityInstrument.test.ts`
- Test: `scripts/heatCapacityTrialModel.test.ts`

Required behavior:
- Free Mode shows current instrument display values from the Free sensor layer.
- Existing 3D controls still manipulate physical controls: pump valve, stopcock, pump bulb.
- Free Mode provides persistent U1/U2 record actions in the 3D interface lower-right area. Successful recording must not make the buttons disappear.
- Free Mode does not provide a U0 button; automatic U0 status is shown in the record panel/table as an automatic calibration record.
- Blocked recording shows yellow guidance in the same style as existing warning guidance.
- Successful Free recording writes to the Free trial table and Free data processing path; teaching trial data remains separate.
- `HeatCapacityLeftPanel.tsx` must select teaching records or Free records based on active mode and must show a source label so the user can tell which table is active.

- [x] Wire active display source by mode.
- [x] Add persistent Free Mode U1/U2 record actions in the 3D lower-right area.
- [x] Add automatic U0 status display in the record table or record panel.
- [x] Add Free Mode record feedback messages.
- [x] Update the data-record table to show automatic U0 and corrected U1/U2 values for Free Mode.
- [x] Update delete/reset behavior so Free records and teaching records cannot delete each other.
- [x] Keep Demo/Guide record buttons and flow unchanged.
- [x] Run:

```powershell
node scripts\workbenchHeatCapacityInstrumentUi.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
node scripts\heatCapacityTrialModel.test.ts
```

**Acceptance:**
- Free Mode can produce a valid trial through user actions.
- Demo/Guide visible behavior is unchanged.
- Record values in the table match displayed values, not hidden physical truth.
- Free trial table and teaching trial table are separate views selected by active mode.
- Free delete/reset controls affect only Free records.

### Batch 7: Calibration and Operation-Quality Validation

**Purpose:** Tune version 1 so good Free Mode operation produces plausible data and poor operation is blocked or produces lower-quality results before blocking.

**Files:**
- Modify: `components/heatCapacity/heatCapacityFreePhysicsEngine.ts`
- Modify: `components/heatCapacity/heatCapacityFreeSensorModel.ts`
- Modify: `components/heatCapacity/heatCapacityFreeRecordModel.ts`
- Test: `scripts/heatCapacityFreePhysicsEngine.test.ts`
- Test: `scripts/heatCapacityFreeRecordModel.test.ts`

Scenarios:
- Excellent operation: pump to target range, wait stable, quick release, close, wait stable, record U1/U2. Expected U1 105-130 mV and U2 near `U1 * (1 - 1 / gamma)`.
- Slow close after release: U2 smaller than excellent operation.
- Long-open after release: recording blocked if over-vented or unstable.
- Reopen after recovery: if pressure remains above ambient, gas vents again.
- Insufficient pumping: U1 recording blocked.
- Good U0 followed by bad re-zero: U1/U2 recording blocked until a new U0 or trial reset.
- Excessive pressure: pressure warning/danger does not corrupt state, but blocks or warns as policy requires.

- [x] Add scripted test harness for Free Mode user-action sequences.
- [x] Tune default hidden config until excellent operation falls in target range.
- [x] Confirm poor operations diverge physically without breaking UI.
- [x] Run:

```powershell
node scripts\heatCapacityFreePhysicsEngine.test.ts
node scripts\heatCapacityFreeSensorModel.test.ts
node scripts\heatCapacityFreeRecordModel.test.ts
```

**Acceptance:**
- Free Mode good-operation data is plausible and processable.
- Free Mode poor-operation outcomes are physically explainable.
- No direct U1/U2 result overwrite exists in Free Mode.

### Batch 8: Full Regression, Preview, and Cleanup

**Purpose:** Verify the full app and remove temporary artifacts.

**Files:**
- No intended source changes except fixes discovered by verification.

- [x] Run core heat-capacity tests:

```powershell
node scripts\heatCapacityExperimentModel.test.ts
node scripts\heatCapacityAutoDemo.test.ts
node scripts\heatCapacityFreePhysicsEngine.test.ts
node scripts\heatCapacityFreeSensorModel.test.ts
node scripts\heatCapacityFreeCalibrationModel.test.ts
node scripts\heatCapacityFreeRecordModel.test.ts
node scripts\heatCapacityFreeModePolicy.test.ts
node scripts\heatCapacityTrialModel.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
node scripts\workbenchHeatCapacityInstrumentUi.test.ts
node scripts\workbenchRunStopControls.test.ts
node scripts\workbenchSessionPersistence.test.ts
```

- [x] Run visual/style regressions:

```powershell
node scripts\workbenchAspectFrame.test.ts
node scripts\workbenchPreviewOverlayLayout.test.ts
node scripts\workbenchMatteVisualStyle.test.ts
node scripts\workbenchMenuAndCanvasControls.test.ts
```

- [x] Build:

```powershell
npm.cmd run build
```

- [x] Preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

- [x] Browser-check `http://127.0.0.1:5174/`.
- [x] Delete any temporary screenshots, Playwright snapshots, scratch scripts, logs, or generated verification files created during implementation.
- [x] Run `git status --short` and verify only intentional source/test/doc changes remain.

**Acceptance:**
- App builds.
- Preview opens on fixed port 5174.
- No console error introduced by the engine.
- No local temporary validation files remain.
- Demo/Guide still behave as before.
- Free Mode uses real physical/sensor layers.

## Version 2 Idea Log

These are intentionally not part of version 1 implementation.

- Free Mode evaluation system that scores experiment operation, result quality, and experiment speed.
- Free Mode error-cause analysis for obviously biased results, using operation history, calibration events, display history, and final trial values.
- Scoring dimensions can include: correct zeroing, pressure target quality, waiting-for-stability discipline, release timing, close timing, repeated unnecessary operations, elapsed time, and result deviation.
- Error analysis can identify likely causes such as bad re-zeroing after U0, insufficient pumping, over-venting, premature U1/U2 record, unstable display, excessive pressure, or long-open release.
- Visible room-temperature baseline control.
- Visible atmospheric-pressure baseline control.
- Continuous stopcock angle and flow curve.
- Explicit bottle-wall and pipe heat capacity state.
- Non-ideal gas correction factor beyond a reserved hook.
- Parameter presets for different lab environments.
- Advanced operation scoring that affects final uncertainty or report quality.
- Free Mode charts comparing true physical value versus instrument display value for teaching.

## Checklist Maintenance Rule

During implementation, each batch must be updated from `[ ]` to `[x]` only after its acceptance checks pass. If a batch discovers a new required behavior, add it to that batch before proceeding rather than burying it in code.

## Final Definition of Done

- Free Mode has a separate physical engine and sensor layer.
- Demo/Guide teaching profiles are isolated and unchanged in visible behavior.
- Free Mode uses a locked quick-release formula and event API before UI integration.
- Free Mode has explicit mode, trial-source, and display-source contracts.
- Free Mode automatic U0 is captured with calibration version and protected from later bad zeroing.
- Free Mode gamma calculation uses `U1 - U0` and `U2 - U0`; teaching gamma calculation remains unchanged.
- Free Mode physics uses explicit simulation/event time with no randomness; Free Mode sensor randomness uses deterministic seed and never hidden `Date.now()` calls.
- Free Mode U1/U2 buttons are persistent in the 3D interface while Free Mode is active.
- Free Mode and teaching records are stored and displayed separately.
- `HeatCapacityLeftPanel.tsx` shows the correct active record source and cannot mix Free records with teaching records.
- Free Mode record values come from instrument display values.
- Bad Free Mode operation is blocked with guidance.
- Good Free Mode operation can produce processable U1/U2 data.
- P/V/N/T invariants are tested.
- Hidden environment config supports future room-temperature and atmospheric-pressure controls.
- No temporary verification artifacts remain in the repo.
