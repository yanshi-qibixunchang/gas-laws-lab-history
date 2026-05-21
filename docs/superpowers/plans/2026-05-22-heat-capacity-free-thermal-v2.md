# Heat Capacity Free Thermal V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a v2 Free Mode heat exchange model where gas, vessel wall, and environment exchange heat through explicit thermal state, while keeping the existing Free Mode UI and process-review charts compatible.

**Architecture:** The physics engine remains the single source of pressure, gas temperature, wall temperature, gas amount, and pump/release state. A new focused thermal model file owns the gas-wall-environment heat-transfer math. Sensor, trace, standard reference, operable-best reference, process review, and workbench runtime consume the v2 physical state without adding new UI.

**Tech Stack:** TypeScript, React/Vite, existing Node-based `.test.ts` test runner, existing Free Mode domain modules under `src/domain/heatCapacity`, existing workbench runtime under `src/features/workbench`.

---

## 0. Confirmed Scope

This plan implements only the Free Mode v2 heat exchange model:

- Add gas <-> vessel wall <-> environment thermal exchange.
- Keep the current two process-review charts:
  - pressure change chart, shown as `ΔP (kPa)`;
  - temperature change chart, shown as `ΔT (K)`.
- Keep existing Free Mode UI surfaces and labels.
- Keep the 115 mV warning line and 140 mV danger line.
- Keep warning as non-scoring in the scoring model; only danger deducts points.
- Keep danger behavior as a pump-source block only:
  - danger may reject later pump strokes;
  - danger must not clamp pressure;
  - danger must not clamp pointer-gauge angle;
  - pressure and pointer gauge continue to reflect calculated pressure.
- Keep current release/open-stopcock instantaneous cooling logic as a transition behavior.
- Do not add continuous leak/stopcock model in this task.
- Do not add new UI controls or windows in this task.
- Do not migrate old experiment files.
- Do not delete old experiment files or caches in this task. Deletion requires a separate exact target list and explicit confirmation.

## 0.1 Pre-Implementation Review Corrections

This section records the second-pass review fixes made before implementation. These are not optional during execution:

- The project targets `ES2022`, so tests and implementation must not use `Array.prototype.findLast`.
- Free runtime schema changes must bump `HEAT_CAPACITY_FREE_RUNTIME_VERSION` from `2` to `3`; otherwise restored local sessions can keep old physics states without `wallTemperatureK`.
- `workbenchSession.ts` must be updated together with `workbenchState.ts`; state-field changes are not complete until definition, default creation, reset, normalization, serialization, and restoration paths all agree.
- Old Free trace stores must be discarded when `heatCapacityFreeTraceVersion` does not match `HEAT_CAPACITY_FREE_TRACE_VERSION`; this task intentionally does not transform old trace samples.
- `copyConfigSnapshot` in `heatCapacityFreeTraceModel.ts` must deep-copy `physics.thermal`; a shallow copy would let later reference generation mutate the saved trace snapshot by shared object reference.
- Test helpers described in this plan are local test helpers unless they already exist in production. Do not export new production functions only to make tests easier.

## 1. Fixed Defaults And Acceptance Numbers

These numbers are fixed for this implementation pass.

| Item | Value | Meaning |
| --- | ---: | --- |
| vessel volume | `2 L` | Free Mode default bottle volume |
| effective pump volume | `30 mL` | one accepted pump stroke |
| pump amount gain ratio | `0.015` | `30 mL / 2000 mL` |
| target pump interval | `0.1 s` | standard and operable-best reference pump rhythm |
| reference simulation step | `0.05 s` | standard and operable-best generated trace step |
| sensor sample interval | `0.08-0.12 s` | runtime trace sampling range |
| reference sensor sample interval | `0.05 s` | generated reference curves only |
| pressure sensitivity | `20 mV/kPa` | `Up` conversion |
| temperature sensitivity | `2 mV/K` | `Ut` conversion |
| temperature ambient display | `1499 mV` | `Ut` at ambient temperature |
| insufficient U1 | `< 90 mV` | record/quality boundary |
| warning line | `115 mV` | warning boundary, no score deduction |
| danger line | `140 mV` | danger boundary and scoring deduction |
| four-stroke U1 target | `115-125 mV` | `4 * 30 mL` in `2 L` bottle, after stabilization |
| gamma default | `1.4` | air heat-capacity ratio |
| ambient pressure default | `101.3 kPa` | room pressure |
| ambient temperature default | `298.15 K` | room temperature, also temperature baseline |
| Free runtime schema version | `3` | invalidates old Free runtime shape without migration |
| Free trace snapshot version | `2` | invalidates old trace snapshot shape without migration |

Thermal v2 defaults:

| Parameter | Value | Reason |
| --- | ---: | --- |
| `gasWallConductanceWPerK` | `0.22` | gas cools over several seconds, not instantly |
| `wallAmbientConductanceWPerK` | `0.45` | wall returns to room over tens of seconds |
| `wallHeatCapacityJPerK` | `45` | bottle wall inertia is much larger than gas heat capacity |
| `minimumGasHeatCapacityJPerK` | `0.1` | numerical lower bound only |
| `thermalSubstepMaxS` | `0.02 s` | internal integration step, not user-configurable |

The model must not include an artificial one-second freeze in this task. The first second after pumping is protected by wall/gas thermal inertia. The default assertion for this is: after four accepted pump strokes, closed-vessel temperature excess must still retain at least `70%` of its initial post-pump gas-temperature excess after `1.0 s` of closed thermal stepping.

## 2. Data Definitions

### 2.1 Physical Meaning

`ambientTemperatureK` is the room-temperature baseline for one run. It affects:

- initial gas temperature;
- initial wall temperature;
- pressure conversion baseline;
- sensor temperature baseline;
- thermal exchange target.

`gasAmountRatio` remains relative to the amount of gas that would fill the same vessel at the current run's ambient pressure and ambient temperature. Therefore the pressure equation remains:

```ts
gasPressureKPa =
  ambientPressureKPa *
  gasAmountRatio *
  (gasTemperatureK / ambientTemperatureK);
```

This keeps the initial state physically neutral:

```ts
gasAmountRatio = 1
gasTemperatureK = ambientTemperatureK
gasPressureKPa = ambientPressureKPa
pressureDeltaKPa = 0
```

### 2.2 Four-Stroke Target Derivation

Four strokes add:

```ts
gasAmountRatio = 1 + 4 * 0.015 = 1.06
```

After thermal stabilization back near ambient temperature:

```ts
pressureDeltaKPa = 101.3 * 1.06 - 101.3 = 6.078
displayPressureMv = 6.078 * 20 = 121.56
```

The acceptance window remains:

```ts
115 <= U1_corrected_mV <= 125
```

## 3. Files To Create Or Modify

### Create

- `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts`
  - Owns gas-wall-environment heat transfer.
  - Contains no workbench UI logic.
  - Contains no sensor noise or trace sampling logic.

- `tests/heatCapacity/heatCapacityFreeThermalModel.test.ts`
  - Unit tests for thermal v2 math and default rates.

### Modify

- `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`
  - Replace direct ambient-temperature approach with thermal v2 stepping.
  - Add wall temperature to physics state.
  - Preserve pump rejection semantics.
  - Preserve release transition semantics.

- `src/domain/heatCapacity/heatCapacityFreeSensorModel.ts`
  - Remove hard-coded `298.15 K` from temperature display conversion.
  - Use physical input's ambient baseline.

- `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
  - Bump Free trace and config snapshot versions from `1` to `2`.
  - Replace `sealedThermalRate` and `openThermalRate` snapshot fields with `thermal`.
  - Add wall and ambient thermal data to trace samples.
  - Remove `reservedPhysicsV2`.

- `src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts`
  - Generate standard reference curves from v2 physics.
  - Keep pump interval at `0.1 s`.

- `src/domain/heatCapacity/heatCapacityFreeOperableBestModel.ts`
  - Generate operable-best curves from v2 physics.
  - Keep candidate pump interval list as `[0.1]`.

- `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
  - Keep current two chart outputs.
  - Ensure standard and operable-best traces use v2 config.
  - Keep measured trace conversion based on display-layer sensor values.

- `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`
  - Keep warning as non-deducting.
  - Assert danger remains deducting.

- `src/features/workbench/workbenchState.ts`
  - Bump `HEAT_CAPACITY_FREE_RUNTIME_VERSION` from `2` to `3`.
  - Update default Free physics config to include `thermal`.
  - Remove default `sealedThermalRate` and `openThermalRate`.
  - Pass ambient baseline into sensor physical input.
  - Record wall temperature and ambient baseline in trace samples.
  - Keep danger as pump-source rejection only.

- `src/features/workbench/workbenchSession.ts`
  - Reset incompatible Free runtime state when saved `heatCapacityFreeRuntimeVersion` is not `3`.
  - Reset incompatible Free trace store when saved `heatCapacityFreeTraceVersion` is not `2`.
  - Normalize v3 Free physics config, physics state, sensor config, and sensor state instead of blindly casting raw session objects.

- Existing tests under `tests/heatCapacity`
  - Update expectations for trace snapshot v2, thermal state, U1 target, pressure/gauge behavior, and process-review chart compatibility.

## 4. New Function And Type Contracts

### 4.1 `heatCapacityFreeThermalModel.ts`

Create this file with these exports:

```ts
export const FREE_THERMAL_AIR_GAS_CONSTANT_J_PER_MOL_K = 8.314462618;
export const FREE_THERMAL_MAX_SUBSTEP_S = 0.02;

export interface HeatCapacityFreeThermalConfig {
  gasWallConductanceWPerK: number;
  wallAmbientConductanceWPerK: number;
  wallHeatCapacityJPerK: number;
  minimumGasHeatCapacityJPerK: number;
}

export interface HeatCapacityFreeThermalState {
  gasTemperatureK: number;
  wallTemperatureK: number;
}

export interface HeatCapacityFreeThermalStepInput {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  vesselVolumeL: number;
  gamma: number;
  gasAmountRatio: number;
  dtS: number;
}

export interface HeatCapacityFreeThermalStepResult {
  state: HeatCapacityFreeThermalState;
  gasHeatCapacityJPerK: number;
  heatGasToWallJ: number;
  heatWallToAmbientJ: number;
}
```

Functions to create:

```ts
export const createDefaultFreeThermalState = (
  ambientTemperatureK: number,
): HeatCapacityFreeThermalState => ({
  gasTemperatureK: ambientTemperatureK,
  wallTemperatureK: ambientTemperatureK,
});
```

Purpose: initialize gas and wall at room temperature for a new run.

```ts
export const calculateFreeGasMoles = (
  input: Pick<
    HeatCapacityFreeThermalStepInput,
    'ambientPressureKPa' | 'ambientTemperatureK' | 'vesselVolumeL' | 'gasAmountRatio'
  >,
) => {
  const pressurePa = input.ambientPressureKPa * 1000;
  const volumeM3 = input.vesselVolumeL / 1000;
  return positiveFiniteOrZero(
    (pressurePa * volumeM3 * input.gasAmountRatio) /
      (FREE_THERMAL_AIR_GAS_CONSTANT_J_PER_MOL_K * input.ambientTemperatureK),
  );
};
```

Purpose: compute gas moles from ideal-gas equilibrium amount and current `gasAmountRatio`.

```ts
export const calculateFreeGasHeatCapacityJPerK = (
  input: Pick<
    HeatCapacityFreeThermalStepInput,
    'ambientPressureKPa' | 'ambientTemperatureK' | 'vesselVolumeL' | 'gamma' | 'gasAmountRatio'
  >,
  minimumGasHeatCapacityJPerK: number,
) => {
  const gammaMinusOne = input.gamma - 1;
  if (!Number.isFinite(gammaMinusOne) || gammaMinusOne <= 0) {
    return positiveFiniteOrFallback(minimumGasHeatCapacityJPerK, 0.1);
  }
  const moles = calculateFreeGasMoles(input);
  const heatCapacity = moles * FREE_THERMAL_AIR_GAS_CONSTANT_J_PER_MOL_K / gammaMinusOne;
  return Math.max(
    positiveFiniteOrFallback(heatCapacity, 0),
    positiveFiniteOrFallback(minimumGasHeatCapacityJPerK, 0.1),
  );
};
```

Purpose: compute gas constant-volume heat capacity from `gamma`; for default `2 L`, `101.3 kPa`, `298.15 K`, `gamma=1.4`, this is about `1.7 J/K`.

```ts
export const stepFreeThermalState = (
  state: HeatCapacityFreeThermalState,
  config: HeatCapacityFreeThermalConfig,
  input: HeatCapacityFreeThermalStepInput,
): HeatCapacityFreeThermalStepResult => {
  const safeConfig = normalizeFreeThermalConfig(config);
  const dtS = positiveFiniteOrZero(input.dtS);
  const gasHeatCapacityJPerK = calculateFreeGasHeatCapacityJPerK(
    input,
    safeConfig.minimumGasHeatCapacityJPerK,
  );
  const wallHeatCapacityJPerK = safeConfig.wallHeatCapacityJPerK;
  const gasWallConductanceWPerK = safeConfig.gasWallConductanceWPerK;
  const wallAmbientConductanceWPerK = safeConfig.wallAmbientConductanceWPerK;

  let gasTemperatureK = state.gasTemperatureK;
  let wallTemperatureK = state.wallTemperatureK;
  let remainingS = dtS;
  let totalHeatGasToWallJ = 0;
  let totalHeatWallToAmbientJ = 0;

  while (remainingS > 0) {
    const stepS = Math.min(remainingS, FREE_THERMAL_MAX_SUBSTEP_S);
    const heatGasToWallJ =
      gasWallConductanceWPerK * (gasTemperatureK - wallTemperatureK) * stepS;
    const heatWallToAmbientJ =
      wallAmbientConductanceWPerK * (wallTemperatureK - input.ambientTemperatureK) * stepS;

    gasTemperatureK -= heatGasToWallJ / gasHeatCapacityJPerK;
    wallTemperatureK += (heatGasToWallJ - heatWallToAmbientJ) / wallHeatCapacityJPerK;

    totalHeatGasToWallJ += heatGasToWallJ;
    totalHeatWallToAmbientJ += heatWallToAmbientJ;
    remainingS -= stepS;
  }

  return {
    state: {
      gasTemperatureK: finiteOrFallback(gasTemperatureK, state.gasTemperatureK),
      wallTemperatureK: finiteOrFallback(wallTemperatureK, state.wallTemperatureK),
    },
    gasHeatCapacityJPerK,
    heatGasToWallJ: totalHeatGasToWallJ,
    heatWallToAmbientJ: totalHeatWallToAmbientJ,
  };
};
```

Purpose: advance the thermal model by `dtS`. It transfers heat from gas to wall and wall to environment. It does not clamp pressure and does not know about alarms.

Private helpers in this file:

```ts
const clampFinite = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
);

const finiteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) ? value : fallback
);

const positiveFiniteOrZero = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const positiveFiniteOrFallback = (value: number, fallback: number) => (
  Number.isFinite(value) && value > 0 ? value : fallback
);
```

Add this exported normalizer before `stepFreeThermalState` so future advanced settings cannot inject numerically explosive values:

```ts
export const normalizeFreeThermalConfig = (
  value: Partial<HeatCapacityFreeThermalConfig> | null | undefined,
): HeatCapacityFreeThermalConfig => ({
  gasWallConductanceWPerK: clampFinite(value?.gasWallConductanceWPerK ?? 0.22, 0, 5, 0.22),
  wallAmbientConductanceWPerK: clampFinite(value?.wallAmbientConductanceWPerK ?? 0.45, 0, 5, 0.45),
  wallHeatCapacityJPerK: clampFinite(value?.wallHeatCapacityJPerK ?? 45, 1, 5000, 45),
  minimumGasHeatCapacityJPerK: clampFinite(value?.minimumGasHeatCapacityJPerK ?? 0.1, 0.01, 10, 0.1),
});
```

Purpose: keep the model stable when saved sessions or later advanced settings provide invalid values. These bounds are numerical safety bounds, not UI slider ranges.

### 4.2 Physics Engine Contract

Change `HeatCapacityFreePhysicsConfig` to:

```ts
export interface HeatCapacityFreePhysicsConfig {
  environment: HeatCapacityFreeEnvironmentConfig;
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpTemperatureGainK: number;
  stopcockFlowRate: number;
  releaseCoolingFactor: number;
  thermal: HeatCapacityFreeThermalConfig;
}
```

Remove from Free Mode config:

```ts
sealedThermalRate: number;
openThermalRate: number;
```

Change `HeatCapacityFreePhysicsState` to include wall temperature:

```ts
export interface HeatCapacityFreePhysicsState {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
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
```

Update `createDefaultFreePhysicsState` to set:

```ts
gasTemperatureK: config.environment.ambientTemperatureK,
wallTemperatureK: config.environment.ambientTemperatureK,
```

Keep `deriveFreePhysicalState` pressure equation:

```ts
const gasPressureKPa = config.environment.ambientPressureKPa *
  state.gasAmountRatio *
  (state.gasTemperatureK / config.environment.ambientTemperatureK);
```

Update `applyFreePumpStroke`:

```ts
const candidateState: HeatCapacityFreePhysicsState = {
  ...state,
  simulationTimeS: event.atS,
  gasAmountRatio: state.gasAmountRatio + config.pumpAmountGainRatio * strength,
  gasTemperatureK: state.gasTemperatureK + config.pumpTemperatureGainK * strength,
  wallTemperatureK: state.wallTemperatureK,
  pumpStrokeCount: state.pumpStrokeCount + 1,
};
```

The pump warms only gas immediately. Wall temperature changes only through `stepFreeThermalState`.

Update closed state stepping:

```ts
const thermal = stepFreeThermalState(
  {
    gasTemperatureK: state.gasTemperatureK,
    wallTemperatureK: state.wallTemperatureK,
  },
  config.thermal,
  {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    vesselVolumeL: config.vesselVolumeL,
    gamma: config.gamma,
    gasAmountRatio: state.gasAmountRatio,
    dtS,
  },
);

const closedState: HeatCapacityFreePhysicsState = {
  ...state,
  simulationTimeS: atS,
  gasTemperatureK: thermal.state.gasTemperatureK,
  wallTemperatureK: thermal.state.wallTemperatureK,
  lastStopcockClosedAtS: wasStopcockOpen ? atS : state.lastStopcockClosedAtS,
  currentStopcockOpenDurationS: 0,
};
```

Update open state stepping:

```ts
const stepOpenState = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
  dtS: number,
) => {
  const thermal = stepFreeThermalState(
    {
      gasTemperatureK: state.gasTemperatureK,
      wallTemperatureK: state.wallTemperatureK,
    },
    config.thermal,
    {
      ambientPressureKPa: config.environment.ambientPressureKPa,
      ambientTemperatureK: config.environment.ambientTemperatureK,
      vesselVolumeL: config.vesselVolumeL,
      gamma: config.gamma,
      gasAmountRatio: state.gasAmountRatio,
      dtS,
    },
  );

  const ambientPressureAmountRatio =
    config.environment.ambientTemperatureK / thermal.state.gasTemperatureK;
  const nextAmountRatio = approach(
    state.gasAmountRatio,
    ambientPressureAmountRatio,
    config.stopcockFlowRate,
    dtS,
  );

  return {
    ...state,
    gasAmountRatio: nextAmountRatio,
    gasTemperatureK: thermal.state.gasTemperatureK,
    wallTemperatureK: thermal.state.wallTemperatureK,
  };
};
```

This keeps open-state pressure relaxation but removes `openThermalRate`.

Update `applyOpeningRelease` to preserve wall temperature and use current ambient baseline:

```ts
const cooledTemperatureK = config.environment.ambientTemperatureK +
  (adiabaticTemperatureK - config.environment.ambientTemperatureK) *
    config.releaseCoolingFactor;
const releasedAmountRatio = config.environment.ambientTemperatureK / cooledTemperatureK;

return {
  ...state,
  gasAmountRatio: releasedAmountRatio,
  gasTemperatureK: cooledTemperatureK,
  wallTemperatureK: state.wallTemperatureK,
  releaseStarted: true,
  releaseReference,
};
```

### 4.3 Sensor Contract

Change `HeatCapacityFreePhysicalDisplayInput` to:

```ts
export interface HeatCapacityFreePhysicalDisplayInput {
  gasPressureKPa: number;
  pressureDeltaKPa: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
}
```

Remove:

```ts
const REFERENCE_AMBIENT_TEMPERATURE_K = 298.15;
```

Update target display conversion:

```ts
const toTargetDisplay = (
  physical: HeatCapacityFreePhysicalDisplayInput,
  config: HeatCapacityFreeSensorConfig,
  pressureInitialBiasMv: number,
) => ({
  pressureMv: physical.pressureDeltaKPa * config.pressureMvPerKPa +
    pressureInitialBiasMv,
  temperatureMv: config.temperatureMvAtAmbient +
    (physical.gasTemperatureK - physical.ambientTemperatureK) *
      config.temperatureMvPerK,
});
```

Purpose: room temperature may change per run, and `Ut` baseline follows the run's ambient temperature.

### 4.4 Trace Snapshot Contract

Change versions:

```ts
export const HEAT_CAPACITY_FREE_TRACE_VERSION = 2;
export const HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION = 2;
```

Change config snapshot:

```ts
export interface HeatCapacityFreeConfigSnapshot {
  version: 2;
  environment: {
    ambientPressureKPa: number;
    ambientTemperatureK: number;
  };
  physics: {
    gamma: number;
    vesselVolumeL: number;
    pumpAmountGainRatio: number;
    pumpTemperatureGainK: number;
    stopcockFlowRate: number;
    releaseCoolingFactor: number;
    thermal: {
      gasWallConductanceWPerK: number;
      wallAmbientConductanceWPerK: number;
      wallHeatCapacityJPerK: number;
      minimumGasHeatCapacityJPerK: number;
    };
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
    pressureWarningMv: number;
    pressureDangerMv: number;
  };
}
```

Remove:

```ts
reservedPhysicsV2: {
  leakRatePerS: null;
  wallThermalCapacityJPerK: null;
  pipeThermalCapacityJPerK: null;
  continuousStopcockEnabled: false;
};
```

Add to trace sample physical data:

```ts
physical: {
  gasPressureKPa: number;
  pressureDeltaKPa: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  ambientTemperatureK: number;
  gasAmountRatio: number;
  pumpStrokeCount: number;
  releaseStarted: boolean;
  currentStopcockOpenDurationS: number;
};
```

Purpose: process-review UI can still draw existing charts, while future advanced diagnostics can inspect wall temperature from trace data.

### 4.5 Workbench Runtime And Session Contract

In `src/features/workbench/workbenchState.ts`, bump:

```ts
export const HEAT_CAPACITY_FREE_RUNTIME_VERSION = 3;
```

Purpose: all saved v2 runtime states are considered incompatible because their physics state lacks `wallTemperatureK` and their config uses `sealedThermalRate/openThermalRate`.

Create an exported runtime config normalizer in `workbenchState.ts`:

```ts
export const normalizeHeatCapacityFreePhysicsConfig = (
  value: Partial<HeatCapacityFreePhysicsConfig> | null | undefined,
): HeatCapacityFreePhysicsConfig => ({
  environment: {
    ambientPressureKPa: Number.isFinite(value?.environment?.ambientPressureKPa)
      ? Number(value!.environment!.ambientPressureKPa)
      : DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa,
    ambientTemperatureK: Number.isFinite(value?.environment?.ambientTemperatureK)
      ? Number(value!.environment!.ambientTemperatureK)
      : DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientTemperatureK,
  },
  vesselVolumeL: Number.isFinite(value?.vesselVolumeL) && value!.vesselVolumeL > 0
    ? Number(value!.vesselVolumeL)
    : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.vesselVolumeL,
  gamma: Number.isFinite(value?.gamma) && value!.gamma > 1
    ? Number(value!.gamma)
    : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.gamma,
  pumpAmountGainRatio: Number.isFinite(value?.pumpAmountGainRatio) && value!.pumpAmountGainRatio > 0
    ? Number(value!.pumpAmountGainRatio)
    : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpAmountGainRatio,
  pumpTemperatureGainK: Number.isFinite(value?.pumpTemperatureGainK)
    ? Number(value!.pumpTemperatureGainK)
    : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpTemperatureGainK,
  stopcockFlowRate: Number.isFinite(value?.stopcockFlowRate) && value!.stopcockFlowRate >= 0
    ? Number(value!.stopcockFlowRate)
    : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.stopcockFlowRate,
  releaseCoolingFactor: Number.isFinite(value?.releaseCoolingFactor)
    ? Number(value!.releaseCoolingFactor)
    : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.releaseCoolingFactor,
  thermal: normalizeFreeThermalConfig(value?.thermal),
});
```

This normalizer requires this import in `workbenchState.ts`:

```ts
import {
  normalizeFreeThermalConfig,
} from '../../domain/heatCapacity/heatCapacityFreeThermalModel.ts';
```

In `src/features/workbench/workbenchSession.ts`, update restoration:

```ts
const savedFreeRuntimeCompatible = file.heatCapacityFreeRuntimeVersion === HEAT_CAPACITY_FREE_RUNTIME_VERSION;
const savedFreeTraceCompatible = file.heatCapacityFreeTraceVersion === HEAT_CAPACITY_FREE_TRACE_VERSION;
```

When `savedFreeRuntimeCompatible` is false, use:

```ts
const normalizedFreeRuntimeFields = fallbackFreeRuntimeFields;
```

When `savedFreeTraceCompatible` is false, use:

```ts
heatCapacityFreeTraceStore: createDefaultFreeTraceStore(),
```

When both are true, normalize rather than cast:

```ts
const freeEnvironmentConfig = isRecord(file.heatCapacityFreeEnvironmentConfig)
  ? {
      ambientPressureKPa: normalizeNullableNumber(file.heatCapacityFreeEnvironmentConfig.ambientPressureKPa) ??
        fallbackFreeRuntimeFields.heatCapacityFreeEnvironmentConfig.ambientPressureKPa,
      ambientTemperatureK: normalizeNullableNumber(file.heatCapacityFreeEnvironmentConfig.ambientTemperatureK) ??
        fallbackFreeRuntimeFields.heatCapacityFreeEnvironmentConfig.ambientTemperatureK,
    }
  : fallbackFreeRuntimeFields.heatCapacityFreeEnvironmentConfig;

const freePhysicsConfig = normalizeHeatCapacityFreePhysicsConfig({
  ...(isRecord(file.heatCapacityFreePhysicsConfig)
    ? file.heatCapacityFreePhysicsConfig as Partial<HeatCapacityFreePhysicsConfig>
    : {}),
  environment: freeEnvironmentConfig,
});
```

Then store both:

```ts
heatCapacityFreeEnvironmentConfig: freeEnvironmentConfig,
heatCapacityFreePhysicsConfig: freePhysicsConfig,
```

This requires adding `normalizeHeatCapacityFreePhysicsConfig` to the existing `workbenchState.ts` import list in `workbenchSession.ts`. If TypeScript needs the config type in this file, import it as a type from `../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`.

The plan intentionally discards incompatible saved Free runtime/trace data. It does not transform old files into v3/v2 shape.

## 5. Implementation Sequence

### Task 1: Add Thermal Model With Failing Tests

**Files:**

- Create: `tests/heatCapacity/heatCapacityFreeThermalModel.test.ts`
- Create later in Task 2: `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts`

- [ ] **Step 1.1: Write thermal model tests first**

Create `tests/heatCapacity/heatCapacityFreeThermalModel.test.ts` with these assertions:

```ts
import assert from 'node:assert/strict';
import {
  calculateFreeGasHeatCapacityJPerK,
  calculateFreeGasMoles,
  createDefaultFreeThermalState,
  stepFreeThermalState,
} from '../../src/domain/heatCapacity/heatCapacityFreeThermalModel.ts';

const config = {
  gasWallConductanceWPerK: 0.22,
  wallAmbientConductanceWPerK: 0.45,
  wallHeatCapacityJPerK: 45,
  minimumGasHeatCapacityJPerK: 0.1,
};

const input = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  vesselVolumeL: 2,
  gamma: 1.4,
  gasAmountRatio: 1.06,
  dtS: 1,
};

{
  const state = createDefaultFreeThermalState(298.15);
  assert.equal(state.gasTemperatureK, 298.15);
  assert.equal(state.wallTemperatureK, 298.15);
}

{
  const moles = calculateFreeGasMoles(input);
  assert.ok(moles > 0.08 && moles < 0.09);
  const heatCapacity = calculateFreeGasHeatCapacityJPerK(input, 0.1);
  assert.ok(heatCapacity > 1.7 && heatCapacity < 1.9);
}

{
  const result = stepFreeThermalState({
    gasTemperatureK: 305.35,
    wallTemperatureK: 298.15,
  }, config, input);
  assert.ok(result.state.gasTemperatureK < 305.35);
  assert.ok(result.state.wallTemperatureK > 298.15);
  assert.ok(result.heatGasToWallJ > 0);
  assert.ok(result.heatWallToAmbientJ >= 0);
}

{
  const result = stepFreeThermalState({
    gasTemperatureK: 305.35,
    wallTemperatureK: 298.15,
  }, config, { ...input, dtS: 1 });
  const initialExcessK = 305.35 - 298.15;
  const remainingExcessK = result.state.gasTemperatureK - 298.15;
  assert.ok(remainingExcessK / initialExcessK > 0.7);
}

{
  const result = stepFreeThermalState({
    gasTemperatureK: 298.15,
    wallTemperatureK: 298.15,
  }, config, {
    ...input,
    ambientTemperatureK: 303.15,
    dtS: 1,
  });
  assert.ok(result.state.wallTemperatureK > 298.15);
  assert.ok(result.state.wallTemperatureK < 303.15);
  assert.ok(result.state.gasTemperatureK >= 298.15);
  assert.ok(result.state.gasTemperatureK < 303.15);
}

console.log('heatCapacityFreeThermalModel tests passed');
```

- [ ] **Step 1.2: Run failing test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
```

Expected result:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module ... heatCapacityFreeThermalModel.ts
```

### Task 2: Implement Thermal Model

**Files:**

- Create: `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeThermalModel.test.ts`

- [ ] **Step 2.1: Create thermal model implementation**

Create `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts` using the contracts in section 4.1.

- [ ] **Step 2.2: Run thermal tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
```

Expected result:

```text
heatCapacityFreeThermalModel tests passed
```

- [ ] **Step 2.3: Run TypeScript check**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected result: exit code `0`.

- [ ] **Step 2.4: Commit**

Run:

```powershell
git add src\domain\heatCapacity\heatCapacityFreeThermalModel.ts tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
git commit -m "feat: add free thermal exchange model"
```

### Task 3: Wire Thermal V2 Into Physics Engine

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`
- Modify: `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`

- [ ] **Step 3.1: Add failing physics-engine tests**

Append or update tests in `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts` to assert:

```ts
const physicsConfig = {
  environment: {
    ambientPressureKPa: 101.3,
    ambientTemperatureK: 298.15,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.015,
pumpTemperatureGainK: 0.35,
  stopcockFlowRate: 4,
  releaseCoolingFactor: 1,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
};
```

Add these assertions:

```ts
{
  const state = createDefaultFreePhysicsState(physicsConfig);
  assert.equal(state.gasTemperatureK, 298.15);
  assert.equal(state.wallTemperatureK, 298.15);
}

{
  const state = createDefaultFreePhysicsState(physicsConfig);
  const result = applyFreePumpStroke(state, physicsConfig, {
    powerOn: true,
    pumpValveOpen: true,
    stopcockOpen: false,
  }, {
    atS: 0.1,
    strength: 1,
  });
  assert.equal(result.accepted, true);
  assert.ok(Math.abs(result.state.gasTemperatureK - 299.95) < 1e-9);
  assert.equal(result.state.wallTemperatureK, 298.15);
}

{
  let state = createDefaultFreePhysicsState(physicsConfig);
  for (let index = 0; index < 4; index += 1) {
    state = applyFreePumpStroke(state, physicsConfig, {
      powerOn: true,
      pumpValveOpen: true,
      stopcockOpen: false,
    }, {
      atS: index * 0.1,
      strength: 1,
    }).state;
  }
  const beforeStep = state;
  state = stepFreePhysics(state, physicsConfig, {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  }, 1, 1);
  assert.ok(state.gasTemperatureK < beforeStep.gasTemperatureK);
  assert.ok(state.wallTemperatureK > beforeStep.wallTemperatureK);
  assert.ok(
    (state.gasTemperatureK - physicsConfig.environment.ambientTemperatureK) /
      (beforeStep.gasTemperatureK - physicsConfig.environment.ambientTemperatureK) >
      0.7,
  );
}

{
  let state = createDefaultFreePhysicsState(physicsConfig);
  for (let index = 0; index < 4; index += 1) {
    state = applyFreePumpStroke(state, physicsConfig, {
      powerOn: true,
      pumpValveOpen: true,
      stopcockOpen: false,
    }, {
      atS: index * 0.1,
      strength: 1,
    }).state;
  }
  for (let step = 0; step < 90; step += 1) {
    state = stepFreePhysics(state, physicsConfig, {
      powerOn: true,
      pumpValveOpen: false,
      stopcockOpen: false,
    }, 1, step + 1);
  }
  const physical = deriveFreePhysicalState(state, physicsConfig);
  const u1Mv = physical.pressureDeltaKPa * 20;
  assert.ok(u1Mv >= 115);
  assert.ok(u1Mv <= 125);
}
```

- [ ] **Step 3.2: Run failing physics test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

Expected result: TypeScript/runtime failure because `thermal` and `wallTemperatureK` are not implemented yet.

- [ ] **Step 3.3: Update physics engine implementation**

Apply the contract in section 4.2.

Do not change:

```ts
type HeatCapacityFreePumpStrokeRejectReason =
  | 'powerOff'
  | 'pumpValveClosed'
  | 'stopcockOpen'
  | 'pressureDanger';
```

Do not clamp pressure in `deriveFreePhysicalState`.

- [ ] **Step 3.4: Run physics and thermal tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

Expected result: both pass.

- [ ] **Step 3.5: Commit**

Run:

```powershell
git add src\domain\heatCapacity\heatCapacityFreePhysicsEngine.ts tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
git commit -m "feat: use thermal v2 in free physics"
```

### Task 4: Update Sensor Ambient Baseline

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeSensorModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeSensorModel.test.ts`

- [ ] **Step 4.1: Add failing sensor assertions**

Add a test case that proves ambient temperature is not hard-coded:

```ts
{
  const state = createDefaultFreeSensorState('ambient-303', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: 1499,
  });
  const next = stepFreeSensor(state, {
    gasPressureKPa: 101.3,
    pressureDeltaKPa: 0,
    gasTemperatureK: 303.15,
    ambientTemperatureK: 303.15,
  }, {
    calibrationVersion: 0,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  }, {
    pressureMvPerKPa: 20,
    temperatureMvAtAmbient: 1499,
    temperatureMvPerK: 2,
    lagRate: 1000,
    noiseMv: 0,
    quantizationMv: 0.01,
    minSampleIntervalS: 0.05,
    maxSampleIntervalS: 0.05,
    historyWindowS: 2,
  }, 0.1);
  assert.equal(next.displayTemperatureMv, 1499);
}
```

- [ ] **Step 4.2: Run failing sensor test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
```

Expected result: failure because current code uses hard-coded `298.15`.

- [ ] **Step 4.3: Update sensor model**

Apply the contract in section 4.3.

- [ ] **Step 4.4: Update all callers**

Every `stepFreeSensor(..., physical, ...)` call must include:

```ts
ambientTemperatureK: physicsConfig.environment.ambientTemperatureK
```

or the equivalent ambient temperature from the current Free Mode config.

Search command:

```powershell
Select-String -Path 'src\**\*.ts','src\**\*.tsx','tests\**\*.ts' -Pattern 'stepFreeSensor\('
```

Expected result: every physical object passed to `stepFreeSensor` includes `ambientTemperatureK`.

- [ ] **Step 4.5: Run sensor and physics tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

Expected result: both pass.

- [ ] **Step 4.6: Commit**

Run:

```powershell
git add src\domain\heatCapacity\heatCapacityFreeSensorModel.ts tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
git commit -m "fix: use free ambient temperature for sensor baseline"
```

### Task 5: Update Trace Snapshot V2

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`

- [ ] **Step 5.1: Add failing trace assertions**

Add assertions:

```ts
{
  const snapshot = createDefaultFreeConfigSnapshot();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.physics.vesselVolumeL, 2);
  assert.equal(snapshot.physics.pumpAmountGainRatio, 0.015);
  assert.equal(snapshot.physics.thermal.gasWallConductanceWPerK, 0.22);
  assert.equal(snapshot.physics.thermal.wallAmbientConductanceWPerK, 0.45);
  assert.equal(snapshot.physics.thermal.wallHeatCapacityJPerK, 45);
  assert.equal(snapshot.physics.thermal.minimumGasHeatCapacityJPerK, 0.1);
  assert.equal(snapshot.record.pressureWarningMv, 115);
  assert.equal(snapshot.record.pressureDangerMv, 140);
  assert.equal('reservedPhysicsV2' in snapshot, false);
}
```

Add a sample creation assertion that stored physical data contains:

```ts
wallTemperatureK: 298.15,
ambientTemperatureK: 298.15,
```

Update the local `createSampleInput` helper in `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts` so its `physical` object is v2-shaped:

```ts
physical: {
  gasPressureKPa: 106,
  pressureDeltaKPa: 4.7,
  gasTemperatureK: 298.15,
  wallTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  gasAmountRatio: 1.04,
  pumpStrokeCount: 4,
  releaseStarted: false,
  currentStopcockOpenDurationS: 0,
},
```

- [ ] **Step 5.2: Run failing trace test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected result: failure because current snapshot is version `1` and still has old fields.

- [ ] **Step 5.3: Update trace types and default snapshot**

Apply the contract in section 4.4.

Default snapshot values:

```ts
physics: {
  gamma: 1.4,
  vesselVolumeL: 2,
  pumpAmountGainRatio: 0.015,
pumpTemperatureGainK: 0.35,
  stopcockFlowRate: 4,
  releaseCoolingFactor: 1,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
},
record: {
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureWarningMv: 115,
  pressureDangerMv: 140,
},
```

- [ ] **Step 5.4: Update trace snapshot copying**

Update `copyConfigSnapshot` so nested `physics.thermal` is deep-copied:

```ts
const copyConfigSnapshot = (
  configSnapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeConfigSnapshot => ({
  version: configSnapshot.version,
  environment: { ...configSnapshot.environment },
  physics: {
    ...configSnapshot.physics,
    thermal: { ...configSnapshot.physics.thermal },
  },
  sensor: { ...configSnapshot.sensor },
  record: { ...configSnapshot.record },
});
```

Add this assertion to `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`:

```ts
{
  const mutableSnapshot = createDefaultFreeConfigSnapshot();
  const created = createFreeTraceTrial(createDefaultFreeTraceStore(), mutableSnapshot);
  mutableSnapshot.physics.thermal.gasWallConductanceWPerK = 999;
  assert.equal(
    created.traceTrial.configSnapshot.physics.thermal.gasWallConductanceWPerK,
    0.22,
    'trace trial must deep-copy thermal config instead of sharing the source object',
  );
}
```

- [ ] **Step 5.5: Run trace tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected result: pass.

- [ ] **Step 5.6: Commit**

Run:

```powershell
git add src\domain\heatCapacity\heatCapacityFreeTraceModel.ts tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
git commit -m "feat: update free trace snapshot to thermal v2"
```

### Task 6: Update Standard And Operable-Best Reference Curves

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeOperableBestModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`

- [ ] **Step 6.1: Add failing standard-reference assertions**

In `tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts`, assert:

```ts
{
  const reference = createHeatCapacityStandardReference(createDefaultFreeConfigSnapshot());
  const pumpStage = reference.stages.find((stage) => stage.id === 'pump');
  assert.equal(pumpStage?.countText, 'x4');
  const u1Mv = (reference.records.u1?.pressureDeltaKPa ?? 0) * 20;
  assert.ok(u1Mv >= 115);
  assert.ok(u1Mv <= 125);
}
```

Add a thermal sensitivity assertion:

```ts
{
  const findLastPointByStage = (
    trace: HeatCapacityProcessReferencePoint[],
    stageId: HeatCapacityProcessStageId,
  ) => {
    for (let index = trace.length - 1; index >= 0; index -= 1) {
      if (trace[index].stageId === stageId) return trace[index];
    }
    return null;
  };

  const slowConfig = createDefaultFreeConfigSnapshot();
  slowConfig.physics.thermal.gasWallConductanceWPerK = 0.08;
  const fastConfig = createDefaultFreeConfigSnapshot();
  fastConfig.physics.thermal.gasWallConductanceWPerK = 0.6;

  const slowReference = createHeatCapacityStandardReference(slowConfig);
  const fastReference = createHeatCapacityStandardReference(fastConfig);

  const slowPumpEnd = findLastPointByStage(slowReference.trace, 'pump');
  const fastPumpEnd = findLastPointByStage(fastReference.trace, 'pump');

  assert.ok((slowPumpEnd?.temperatureDeltaK ?? 0) > (fastPumpEnd?.temperatureDeltaK ?? 0));
}
```

Do not use `trace.findLast(...)`; the project `tsconfig.json` uses `ES2022`, and `findLast` is not available in that lib target.

- [ ] **Step 6.2: Add failing operable-best/process-review assertions**

In `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`, assert:

```ts
{
  const review = selectHeatCapacityFreeProcessReview({
    trials: [trial],
    traceStore: store,
    theoreticalGamma: 1.4,
  });
  assert.equal(review.status, 'ready');
  assert.ok(review.chart.referenceTrace.length > 0);
  assert.ok(review.chart.operableBestTrace.length > 0);
  assert.ok(review.chart.trace.length > 0);
  assert.ok(review.chart.records.length >= 3);
}
```

Keep the measured trace assertion display-layer based:

```ts
assert.equal(
  measuredPoint.pressureDeltaKPa,
  Number(((sample.sensor.displayPressureMv - u0PressureMv) / 20).toFixed(3)),
);
```

Update every `HeatCapacityFreeTraceSampleInput` fixture in this test to include the v2 physical fields:

```ts
physical: {
  gasPressureKPa: 101.3 + pressureMv / 20,
  pressureDeltaKPa: pressureMv / 20,
  gasTemperatureK: 298.15 + (temperatureMv - 1499) / 2,
  wallTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  gasAmountRatio: 1,
  pumpStrokeCount: 0,
  releaseStarted: false,
  currentStopcockOpenDurationS: 0,
},
```

- [ ] **Step 6.3: Run failing tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeStandardReferenceModel.test.ts
node tests\heatCapacity\heatCapacityFreeProcessReviewModel.test.ts
```

Expected result: failures from missing ambient input and old config shape.

- [ ] **Step 6.4: Update reference models**

In both reference model files:

Use this config builder:

```ts
const createPhysicsConfig = (
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreePhysicsConfig => ({
  environment: {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
  },
  ...config.physics,
});
```

Every sensor sample must pass:

```ts
sensorState = stepFreeSensor(sensorState, {
  gasPressureKPa: physical.gasPressureKPa,
  pressureDeltaKPa: physical.pressureDeltaKPa,
  gasTemperatureK: physicsState.gasTemperatureK,
  ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
}, calibration, sensorConfig, timeS);
```

Keep:

```ts
const STEP_S = 0.05;
const PUMP_INTERVAL_S = 0.1;
const PUMP_INTERVAL_CANDIDATES = [0.1];
```

- [ ] **Step 6.5: Run reference tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeStandardReferenceModel.test.ts
node tests\heatCapacity\heatCapacityFreeProcessReviewModel.test.ts
```

Expected result: pass.

- [ ] **Step 6.6: Commit**

Run:

```powershell
git add src\domain\heatCapacity\heatCapacityFreeStandardReferenceModel.ts src\domain\heatCapacity\heatCapacityFreeOperableBestModel.ts tests\heatCapacity\heatCapacityFreeStandardReferenceModel.test.ts tests\heatCapacity\heatCapacityFreeProcessReviewModel.test.ts
git commit -m "feat: generate free references with thermal v2"
```

### Task 7: Update Workbench Runtime Defaults And Trace Recording

**Files:**

- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
- Modify: `tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`
- Modify: `tests/heatCapacity/workbenchHeatCapacityFile.test.ts`

- [ ] **Step 7.1: Add failing workbench assertions**

In `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`, assert:

```ts
{
  const file = createDefaultHeatCapacityFile(1);
  assert.equal(file.heatCapacityFreeRuntimeVersion, 3);
  assert.equal(file.heatCapacityFreePhysicsConfig.vesselVolumeL, 2);
  assert.equal(file.heatCapacityFreePhysicsConfig.pumpAmountGainRatio, 0.015);
  assert.equal(
    file.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK,
    0.22,
  );
  assert.equal(file.heatCapacityFreePhysicsState.wallTemperatureK, 298.15);
}
```

Add a four-pump acceptance assertion:

```ts
{
  let now = 1_000;
  let file = createDefaultHeatCapacityFile(1);
  file = powerHeatCapacityWorkbenchFile(file, true, now);
  file = {
    ...file,
    pumpValveOpen: true,
    pumpValveState: 'open',
  };

  for (let index = 0; index < 4; index += 1) {
    now += 100;
    file = registerHeatCapacityPumpStroke(file, now);
  }

  file = {
    ...file,
    pumpValveOpen: false,
    pumpValveState: 'closed',
  };
  for (let step = 0; step < 900; step += 1) {
    now += 100;
    file = stepHeatCapacityWorkbenchFile(file, now);
  }

  const u1 = file.pressureDeltaKPa * file.pressureSensitivityMvPerKPa;
  assert.ok(u1 >= 115);
  assert.ok(u1 <= 125);
}
```

Add danger-source-only assertion:

```ts
{
  const file = createDefaultHeatCapacityFile(1);
  const dangerDeltaKPa = HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV /
    file.pressureSensitivityMvPerKPa;
  const dangerLine = getHeatCapacityGaugePressureState(dangerDeltaKPa, true, file);
  const aboveDanger = getHeatCapacityGaugePressureState(dangerDeltaKPa + 1, true, file);

  assert.equal(aboveDanger.pressureSafetyStatus, 'danger');
  assert.equal(aboveDanger.pressureBlockedPumping, true);
  assert.ok(
    aboveDanger.pressureGaugeNeedleAngle > dangerLine.pressureGaugeNeedleAngle,
    'gauge needle should continue to follow pressure above danger instead of being clamped at the alarm line',
  );
}

{
  const file = createDefaultHeatCapacityFile(1);
  const belowDanger = getHeatCapacityGaugePressureState(
    HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV / file.pressureSensitivityMvPerKPa - 0.5,
    true,
    file,
  );
  assert.equal(belowDanger.pressureSafetyStatus, 'warning');
  assert.equal(belowDanger.pressureBlockedPumping, false);
}
```

Do not add production exports only for tests. If a helper is needed, create it inside the test file and build it from existing production exports such as `createDefaultHeatCapacityFile`, `powerHeatCapacityWorkbenchFile`, `registerHeatCapacityPumpStroke`, `stepHeatCapacityWorkbenchFile`, and `getHeatCapacityGaugePressureState`.

- [ ] **Step 7.2: Run failing workbench tests**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityFreeRecordAttempt.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

Expected result: failures from old config shape and missing wall trace fields.

- [ ] **Step 7.3: Update workbench defaults**

In `src/features/workbench/workbenchState.ts`, set Free Mode default physics:

```ts
const DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG = {
  environment: {
    ambientPressureKPa: 101.3,
    ambientTemperatureK: 298.15,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.015,
pumpTemperatureGainK: 0.35,
  stopcockFlowRate: 4,
  releaseCoolingFactor: 1,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
} satisfies HeatCapacityFreePhysicsConfig;
```

Keep sensor defaults:

```ts
pressureMvPerKPa: 20,
temperatureMvAtAmbient: 1499,
temperatureMvPerK: 2,
lagRate: 8,
noiseMv: 0.04,
quantizationMv: 0.01,
minSampleIntervalS: 0.08,
maxSampleIntervalS: 0.12,
historyWindowS: 2,
```

Keep record/safety defaults:

```ts
minimumUsefulU1CorrectedMv: 90,
pressureWarningMv: 115,
pressureDangerMv: 140,
```

Update Free Mode safety to use the current calculated pressure, not a settled future pressure estimate:

```ts
const gaugePressureState = getHeatCapacityGaugePressureState(
  derived.pressureDeltaKPa,
  powerOn,
  file,
);
```

Then use `gaugePressureState.pressureSafetyStatus`, `pressureBlockedPumping`, and `pressureOverLimit` for the Free runtime state. Do not use `getHeatCapacityFreeSettledSafetyPressureDeltaKPa` for Free Mode alarm or pump blocking after this change. If the helper becomes unused, remove it.

Reason: the pointer gauge, alarm status, and pump block must all be derived from current calculated pressure. The alarm may block future pump strokes, but it must not impose an independent pressure value or settled-pressure estimate on the UI.

- [ ] **Step 7.4: Update trace sample recording**

Every recorded trace sample physical object must include:

```ts
physical: {
  gasPressureKPa: physical.gasPressureKPa,
  pressureDeltaKPa: physical.pressureDeltaKPa,
  gasTemperatureK: physicsState.gasTemperatureK,
  wallTemperatureK: physicsState.wallTemperatureK,
  ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
  gasAmountRatio: physicsState.gasAmountRatio,
  pumpStrokeCount: physicsState.pumpStrokeCount,
  releaseStarted: physicsState.releaseStarted,
  currentStopcockOpenDurationS: physicsState.currentStopcockOpenDurationS,
},
```

- [ ] **Step 7.5: Fix pump frequency logic for 0.1 s adjacent strokes**

Keep these thresholds:

```ts
const HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS = 3000;
const HEAT_CAPACITY_MIN_PUMP_FREQUENCY = 0.5;
const HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ = 2;
```

Update `getHeatCapacityPumpFrequencyState` so two or more recent timestamps use adjacent-stroke elapsed time rather than dividing count by the whole 3-second window:

```ts
const sortedRecentTimestamps = recentTimestamps.sort((left, right) => left - right);
const pumpFrequency = sortedRecentTimestamps.length >= 2
  ? (sortedRecentTimestamps.length - 1) /
    Math.max(
      0.001,
      (sortedRecentTimestamps[sortedRecentTimestamps.length - 1] - sortedRecentTimestamps[0]) / 1000,
    )
  : sortedRecentTimestamps.length / (windowMs / 1000);
```

Return shape stays unchanged:

```ts
{
  timestamps: sortedRecentTimestamps,
  pumpFrequency,
  pumpFrequencyStatus,
}
```

Add these assertions where pump frequency state is tested:

```ts
{
  const pumpTimesMs = [0, 100, 200, 300];
  const status = getHeatCapacityPumpFrequencyState(pumpTimesMs, 300);
  assert.equal(status.pumpFrequencyStatus, 'suitable');
  assert.ok(status.pumpFrequency >= 9.9);
  assert.ok(status.pumpFrequency <= 10.1);
}

{
  const pumpTimesMs = [0, 2500];
  const status = getHeatCapacityPumpFrequencyState(pumpTimesMs, 2500);
  assert.equal(status.pumpFrequencyStatus, 'tooSlow');
  assert.ok(status.pumpFrequency < HEAT_CAPACITY_MIN_PUMP_FREQUENCY);
}
```

- [ ] **Step 7.6: Update session restore and add restore assertions**

In `src/features/workbench/workbenchSession.ts`, apply section 4.5. Then add assertions to `tests/heatCapacity/workbenchHeatCapacityFile.test.ts`:

```ts
{
  const oldRuntime = createDefaultHeatCapacityFile(1);
  const restored = decodeWorkbenchSession({
    version: WORKBENCH_SESSION_VERSION,
    activeFileId: oldRuntime.id,
    selectedPanel: 'preview',
    files: [
      {
        ...oldRuntime,
        heatCapacityFreeRuntimeVersion: 2,
        heatCapacityFreePhysicsState: {
          ...oldRuntime.heatCapacityFreePhysicsState,
          gasAmountRatio: 1.2,
          wallTemperatureK: undefined,
        },
        heatCapacityFreePhysicsConfig: {
          ...oldRuntime.heatCapacityFreePhysicsConfig,
          sealedThermalRate: 0.55,
          openThermalRate: 1.6,
          thermal: undefined,
        },
      },
    ],
  });
  const restoredFile = restored.files[0];
  assert.equal(restoredFile.kind, 'heatCapacity');
  if (restoredFile.kind !== 'heatCapacity') throw new Error('expected heat capacity file');
  assert.equal(restoredFile.heatCapacityFreeRuntimeVersion, 3);
  assert.equal(restoredFile.heatCapacityFreePhysicsState.gasAmountRatio, 1);
  assert.equal(restoredFile.heatCapacityFreePhysicsState.wallTemperatureK, 298.15);
  assert.equal(restoredFile.heatCapacityFreePhysicsConfig.thermal.gasWallConductanceWPerK, 0.22);
}

{
  const oldTrace = createDefaultHeatCapacityFile(1);
  const restored = decodeWorkbenchSession({
    version: WORKBENCH_SESSION_VERSION,
    activeFileId: oldTrace.id,
    selectedPanel: 'preview',
    files: [
      {
        ...oldTrace,
        heatCapacityFreeTraceVersion: 1,
        heatCapacityFreeTraceStore: {
          activeTraceTrialId: 'old',
          nextTraceTrialIndex: 2,
          traceTrials: [
            {
              id: 'old',
              linkedTrialId: null,
              status: 'active',
              activeBranchId: 'branch-1',
              nextBranchIndex: 2,
              branches: [],
              configSnapshot: createDefaultFreeConfigSnapshot(),
            },
          ],
        },
      },
    ],
  });
  const restoredFile = restored.files[0];
  assert.equal(restoredFile.kind, 'heatCapacity');
  if (restoredFile.kind !== 'heatCapacity') throw new Error('expected heat capacity file');
  assert.equal(restoredFile.heatCapacityFreeTraceVersion, 2);
  assert.deepEqual(restoredFile.heatCapacityFreeTraceStore.traceTrials, []);
}
```

Purpose: old incompatible runtime and trace data are reset, not half-restored.

- [ ] **Step 7.7: Run workbench tests**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityFreeRecordAttempt.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\workbenchHeatCapacityFile.test.ts
```

Expected result: pass.

- [ ] **Step 7.8: Commit**

Run:

```powershell
git add src\features\workbench\workbenchState.ts src\features\workbench\workbenchSession.ts tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts tests\heatCapacity\workbenchHeatCapacityFreeRecordAttempt.test.ts tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts tests\heatCapacity\workbenchHeatCapacityFile.test.ts
git commit -m "feat: update free workbench runtime for thermal v2"
```

### Task 8: Preserve Scoring And Warning/Danger Behavior

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeModePolicy.test.ts`

- [ ] **Step 8.1: Add scoring assertions**

Add assertions:

```ts
{
  const warningFixture = createCompleteProcessScoringInputFixture();
  const warningSample = warningFixture.branch.samples[1];
  assert.notEqual(warningSample, undefined, 'warning scoring fixture needs a U1 sample');
  const warningBranch = appendFreeTraceEvent(warningFixture.branch, {
    atS: warningSample!.atS,
    type: 'pressure-warning',
    traceSampleId: warningSample!.id,
  }).branch;
  const result = scoreHeatCapacityFreeProcess({
    ...warningFixture,
    branch: warningBranch,
  });
  const pumpingItem = result.items.find((item) => item.id === 'pumping');
  assert.equal(pumpingItem?.score, pumpingItem?.maxScore);
}

{
  const dangerFixture = createCompleteProcessScoringInputFixture();
  const dangerSample = dangerFixture.branch.samples[1];
  assert.notEqual(dangerSample, undefined, 'danger scoring fixture needs a U1 sample');
  const dangerBranch = appendFreeTraceEvent(dangerFixture.branch, {
    atS: dangerSample!.atS,
    type: 'pressure-danger',
    traceSampleId: dangerSample!.id,
  }).branch;
  const result = scoreHeatCapacityFreeProcess({
    ...dangerFixture,
    branch: dangerBranch,
  });
  const pumpingItem = result.items.find((item) => item.id === 'pumping');
  assert.ok((pumpingItem?.score ?? 0) < (pumpingItem?.maxScore ?? 0));
}
```

Use existing fixture helpers from `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts`. Do not export new production helpers just for tests.

- [ ] **Step 8.2: Add pressure/gauge non-clamp assertion**

Add a policy or instrument assertion:

```ts
assert.ok(physicalPressureKPa > dangerPressureKPa);
assert.equal(safetyStatus, 'danger');
assert.ok(pointerGaugeAngle > angleAtDangerLine);
```

This assertion proves alarm status does not cap physical pressure or pointer rendering.

- [ ] **Step 8.3: Run scoring/policy tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeProcessScoringModel.test.ts
node tests\heatCapacity\heatCapacityFreeModePolicy.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
```

Expected result: pass.

- [ ] **Step 8.4: Commit**

Run:

```powershell
git add src\domain\heatCapacity\heatCapacityFreeProcessScoringModel.ts tests\heatCapacity\heatCapacityFreeProcessScoringModel.test.ts tests\heatCapacity\heatCapacityFreeModePolicy.test.ts tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
git commit -m "test: lock free warning and danger semantics"
```

### Task 9: Full Code Verification

**Files:**

- No new files.
- This task validates all changed production and test files.

- [ ] **Step 9.1: Run focused heat-capacity tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
node tests\heatCapacity\heatCapacityFreeStandardReferenceModel.test.ts
node tests\heatCapacity\heatCapacityFreeProcessReviewModel.test.ts
node tests\heatCapacity\heatCapacityFreeProcessScoringModel.test.ts
node tests\heatCapacity\heatCapacityFreeModePolicy.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityFreeRecordAttempt.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

Expected result: every command exits `0`.

- [ ] **Step 9.2: Run TypeScript**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected result: exit code `0`.

- [ ] **Step 9.3: Run full test suite**

Run:

```powershell
npm.cmd test
```

Expected result:

```text
62 test files passed.
```

The number may increase after adding `heatCapacityFreeThermalModel.test.ts`. If the new total is `63`, the expected result is:

```text
63 test files passed.
```

- [ ] **Step 9.4: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected result: Vite build exits `0`.

- [ ] **Step 9.5: Check whitespace**

Run:

```powershell
git diff --check
```

Expected result: no trailing whitespace or conflict markers.

### Task 10: Fixed-Port Visual Verification

**Files:**

- No production code changes in this task unless visual verification finds a bug.
- If visual verification finds a bug, return to the relevant task and add a failing test before fixing it.

- [ ] **Step 10.1: Start fixed-port preview**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected result:

```text
Local: http://127.0.0.1:5174/
```

If port `5174` is occupied, stop the occupying process only after confirming it is the existing project preview. Do not switch ports silently.

- [ ] **Step 10.2: Open app in browser**

Open:

```text
http://127.0.0.1:5174/
```

- [ ] **Step 10.3: Create a new Heat Capacity Free Mode file**

Use a new experiment file after the code change. Old files are intentionally not part of this acceptance pass.

Expected default runtime values:

```text
vesselVolumeL = 2
pumpAmountGainRatio = 0.015
ambientTemperatureK = 298.15
pressureWarningMv = 115
pressureDangerMv = 140
```

- [ ] **Step 10.4: Visual check four-pump sequence**

Perform:

```text
power on
open pump valve
pump 4 times with approximately 0.1 s between adjacent strokes
close pump valve
wait for stabilization
record U1
```

Expected visible behavior:

- realtime pressure rises in multiple visible samples, not one giant single step;
- realtime temperature rises during pumping;
- during closed stabilization, temperature decays gradually instead of snapping back;
- `U1` corrected pressure is around `120 mV`, accepted when inside `115-125 mV`;
- warning state around `115 mV` does not block recording by itself;
- danger state around `140 mV` blocks additional pump strokes only.

- [ ] **Step 10.5: Visual check process-review charts**

Open process review.

Expected pressure chart:

- measured line appears;
- standard/reference line appears;
- operable-best line appears;
- warning and danger markers remain visible at the correct positions;
- pump-stage region reflects the `0.1 s` pump rhythm.

Expected temperature chart:

- measured line appears;
- standard/reference line appears;
- operable-best line appears;
- closed-vessel recovery is slower than the old direct ambient approach;
- no chart labels overlap the plotted lines in the default viewport.

- [ ] **Step 10.6: Browser console check**

Use Playwright or browser devtools to confirm:

```text
no uncaught runtime errors
no React render crashes
no NaN values visible in chart axes or realtime panels
```

- [ ] **Step 10.7: Mobile/narrow smoke check**

Resize browser to a narrow width used by the app's current responsive layout.

Expected result:

- existing panels remain reachable;
- charts still render;
- no new UI was added;
- no text overflow was introduced by the v2 model changes.

### Task 11: Final Git State And Review Summary

- [ ] **Step 11.1: Inspect changed files**

Run:

```powershell
git status --short
git diff --stat
```

Expected changed areas:

```text
src/domain/heatCapacity/...
src/features/workbench/workbenchState.ts
tests/heatCapacity/...
```

No unrelated files should be changed.

- [ ] **Step 11.2: Prepare final implementation summary**

The final implementation summary must include:

- model change: gas-wall-environment thermal v2;
- defaults: `2 L`, `0.015`, `0.1 s`, `115/140 mV`, thermal defaults;
- tests run and results;
- fixed preview command and URL;
- visual acceptance result;
- explicit note that old files were not migrated or deleted.

- [ ] **Step 11.3: Ask before deletion**

If old incompatible experiment files or caches still need deletion, stop and provide:

```text
exact file or directory path
why it is obsolete
whether it is user-authored or generated
exact deletion method proposed
```

Do not delete until the user explicitly confirms that exact list.

## 6. Assertions Checklist

The implementation is not accepted until all assertions below are true.

### Thermal Assertions

- Default gas and wall temperatures equal `ambientTemperatureK`.
- Pump stroke heats gas immediately and does not heat wall immediately.
- Closed-vessel stepping transfers heat from gas to wall.
- Wall transfers heat to environment.
- After four pump strokes, closed-vessel temperature excess retains more than `70%` after `1.0 s`.
- Four-pump stabilized pressure maps to `115-125 mV`.
- Ambient temperature changes use the run's `ambientTemperatureK`, not hard-coded `298.15 K`.

### Sampling And Curve Assertions

- Runtime trace sampling remains `0.08-0.12 s`.
- Reference trace step remains `0.05 s`.
- Reference pump interval remains `0.1 s`.
- Four pump strokes produce more than two visible process points across pump/stabilize stages.
- Standard/reference traces respond to thermal conductance changes.
- Measured process-review points are still derived from display-layer sensor data, not raw physics values.

### Safety Assertions

- Warning at `115 mV` does not deduct score.
- Danger at `140 mV` deducts score.
- Danger rejects later pump strokes.
- Danger does not clamp pressure.
- Danger does not clamp pointer-gauge angle.
- Pointer-gauge angle depends on pressure only.

### Compatibility Assertions

- Existing Free Mode UI opens without new controls.
- Existing pressure and temperature process-review charts render.
- Existing realtime data panel renders wall-free UI values as before.
- New trace samples contain wall temperature for future diagnostics.
- Old experiment files are not migrated in this task.

## 7. Not In This Task

These items are intentionally not implemented here:

- continuous leak through bottle mouth or stopcock;
- capillary/pipe thermal capacity;
- advanced settings UI;
- main-screen parameter controls;
- old experiment-file migration;
- deletion of old local experiment files or caches;
- release-curve redesign beyond preserving current open-stopcock transition logic.

## 8. Review Points For Human Approval

Before implementation, review these fixed decisions:

1. No artificial `1 s` freeze is added. Slow recovery comes from gas-wall-environment thermal inertia.
2. `ambientTemperatureK` is the run's room-temperature baseline. There is no separate pressure reference temperature.
3. `sealedThermalRate` and `openThermalRate` are removed from Free Mode config and trace snapshot because old-file compatibility is not required.
4. Trace snapshot version becomes `2`.
5. Thermal defaults are:
   - `gasWallConductanceWPerK = 0.22`;
   - `wallAmbientConductanceWPerK = 0.45`;
   - `wallHeatCapacityJPerK = 45`;
   - `minimumGasHeatCapacityJPerK = 0.1`.
6. Release behavior remains a transitional approximation in this task.
7. Old files and caches are not deleted by this task.
8. Free Mode alarm status and pump blocking are based on current calculated pressure, not a settled future pressure estimate.
9. The thermal defaults are engineering defaults chosen to match the desired UI behavior; they are not calibrated from measured bottle-wall material data yet.

## 8.1 Remaining Assumptions To Approve Or Change

These are the only remaining assumptions after review:

1. The vessel wall is modeled as one lumped thermal mass. There is no separate bottle cap, tubing, valve, or pressure-sensor thermal mass in this task.
2. Pumping adds gas amount and gas temperature instantly at the time of the stroke. The `0.1 s` interval affects sampling and process shape, not a gradual pump-flow curve inside each stroke.
3. Ambient temperature is constant during one run. A later advanced-settings UI may let the user change the ambient default before a run starts, but this task does not model room temperature drifting during a run.
4. Sensor lag remains a display-layer lag. It does not feed back into physics.
5. The reference and operable-best curves use deterministic `0.05 s` sampling, while user/runtime trace sampling remains `0.08-0.12 s`.
6. Old local Free Mode runtime and trace data are reset on restore. They are not converted, not shown in process review, and not used for acceptance.
7. The current release/open-stopcock transition can still look simplified. That is accepted for this task because the release model is explicitly deferred.

## 9. Reusable Commands

Focused tests:

```powershell
node tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
node tests\heatCapacity\heatCapacityFreeStandardReferenceModel.test.ts
node tests\heatCapacity\heatCapacityFreeProcessReviewModel.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
```

Full verification:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
git diff --check
```

Fixed-port preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview URL:

```text
http://127.0.0.1:5174/
```
