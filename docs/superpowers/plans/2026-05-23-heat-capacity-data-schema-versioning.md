# Heat Capacity Data Schema Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable persistence/schema layer for Workbench experiment files, with a complete first-phase contract for Heat Capacity Free Mode data, while keeping standard and ideal-gas experiment payloads losslessly carried through the public envelope.

**Architecture:** Keep the current runtime state shape used by React and the domain models, and add a persistence adapter layer around it. Storage will move toward a versioned envelope; migration and validation are centralized outside UI components so UI code stops silently patching business fields.

**Tech Stack:** TypeScript, Vite, React, Node `assert` test files run through `node` / `npm.cmd test`, existing Workbench state and heat-capacity domain models.

---

## Source Spec

Implement from:

- `docs/superpowers/specs/2026-05-23-heat-capacity-data-schema-versioning-design.md`

Key fixed decisions:

- Development builds may reject or clear incompatible cache.
- Before formal release, unsupported future versions are rejected.
- After formal release, unsupported future versions must open read-only.
- First phase covers public envelope plus complete Heat Capacity Free Mode schema.
- Standard and ideal-gas payloads remain losslessly carried, not fully schema-normalized in this phase.
- Reference curves get a persisted shape and version metadata, but current generator logic is not frozen.

## Pre-Implementation Boundary Corrections

The code reread before implementation found three plan boundaries that must be handled in this batch:

- Closed-file cache must not remain a raw runtime array. `hsl_workbench_closed_files_v1` will store a versioned closed-files envelope that carries the same experiment-file envelopes as the open session.
- The Free Mode trace sample control snapshot must include both command-side and confirmed-flow state: `stopcockOpen` records the visible stopcock command/angle state, `stopcockFlowOpen` records the delayed confirmed flow state, and `pumpBulbState` records the pump bulb animation/control state.
- Because the trace sample structure and config snapshot required fields change, `HEAT_CAPACITY_FREE_TRACE_VERSION` and `HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION` are both incremented from `3` to `4`. Development cache may be reset by existing normalization; this follows the accepted development-phase policy.

## File Structure

Create:

- `src/features/workbench/workbenchPersistenceSchema.ts`  
  Owns schema family constants, schema versions, compatibility policy constants, envelope interfaces, persistence diagnostics, and narrow type guards.

- `src/features/workbench/workbenchHeatCapacityPersistence.ts`  
  Owns Heat Capacity payload conversion, Heat Capacity Free Mode schema validation, reference snapshot scaffolding, and runtime-to-persistence mapping helpers.

- `src/features/workbench/workbenchPersistenceMigration.ts`  
  Owns decode/encode flow for current storage, legacy v1 session fallback, future-version policy, migration diagnostics, and central validation calls.

- `tests/workbench/workbenchPersistenceSchema.test.ts`  
  Covers public envelope constants, future-version policy, and basic schema-family validation.

- `tests/heatCapacity/heatCapacityFreePersistence.test.ts`  
  Covers Heat Capacity Free Mode payload completeness, record protection, config snapshot retention, reference snapshot storage shape, and UI reproduction fields.

Modify:

- `src/features/workbench/workbenchSession.ts`  
  Delegate storage decode/encode to the new persistence migration module while preserving existing exported functions used by UI and tests.

- `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`  
  Extend config snapshot shape to include currently implicit physical/sampling constants needed for durable replay, and extend trace sample controls with `pumpBulbState` and `stopcockFlowOpen`.

- `src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts`  
  Attach reference generator metadata to generated standard reference output if the final reference snapshot helper reads directly from the generator.

- `src/domain/heatCapacity/heatCapacityFreeOperableBestModel.ts`  
  Attach reference generator metadata to generated operable-best output if the final reference snapshot helper reads directly from the generator.

- `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`  
  Keep chart selection compatible with reference snapshots and avoid relying on hidden current defaults when stored snapshots exist.

- `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`  
  Assert new config snapshot fields are present and deep-copied.

- `tests/heatCapacity/workbenchHeatCapacityFile.test.ts`  
  Keep existing runtime reset behavior tests and add schema-envelope decode coverage where appropriate.

- `tests/workbench/workbenchSessionPersistence.test.ts`  
  Add round-trip tests for v2 persistence envelope while keeping legacy v1 decode coverage.

Do not modify:

- UI appearance.
- Physical parameter values.
- Scoring formulas.
- Standard and ideal-gas runtime semantics.

## Task 1: Add Persistence Schema Tests First

**Files:**

- Create: `tests/workbench/workbenchPersistenceSchema.test.ts`
- No production files changed in this task.

- [ ] **Step 1: Write the failing schema-constant test**

Create `tests/workbench/workbenchPersistenceSchema.test.ts` with:

```ts
import assert from 'node:assert/strict';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
  getWorkbenchUnsupportedFutureVersionPolicy,
  isWorkbenchExperimentFileEnvelope,
  isWorkbenchSessionEnvelope,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';

assert.equal(WORKBENCH_SESSION_SCHEMA_FAMILY, 'hard-sphere-lab.workbench-session');
assert.equal(WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY, 'hard-sphere-lab.experiment-file');
assert.equal(WORKBENCH_SESSION_SCHEMA_VERSION, 2);
assert.equal(WORKBENCH_FILE_SCHEMA_VERSION, 1);
assert.equal(WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH, null);
assert.equal(
  getWorkbenchUnsupportedFutureVersionPolicy(),
  'reject',
  'before the first formal release, unsupported future files must be rejected',
);

assert.equal(isWorkbenchSessionEnvelope({
  schemaFamily: WORKBENCH_SESSION_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  appVersion: '4.1.3',
  savedAt: 1,
  activeFileId: null,
  selectedPanel: 'preview',
  files: [],
}), true);

assert.equal(isWorkbenchSessionEnvelope({
  schemaFamily: 'other',
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  files: [],
}), false);

assert.equal(isWorkbenchExperimentFileEnvelope({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heatCapacity-001',
  kind: 'heatCapacity',
  name: 'Heat Capacity Ratio - 001',
  createdAt: 1,
  updatedAt: 1,
  layout: {},
  payload: {},
}), true);

assert.equal(isWorkbenchExperimentFileEnvelope({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: 999,
  id: 'heatCapacity-001',
  kind: 'heatCapacity',
  name: 'Heat Capacity Ratio - 001',
  createdAt: 1,
  updatedAt: 1,
  layout: {},
  payload: {},
}), false);

console.log('workbenchPersistenceSchema tests passed');
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node tests\workbench\workbenchPersistenceSchema.test.ts
```

Expected: fail with a module-not-found error for `workbenchPersistenceSchema.ts`.

## Task 2: Create Public Persistence Schema Module

**Files:**

- Create: `src/features/workbench/workbenchPersistenceSchema.ts`
- Test: `tests/workbench/workbenchPersistenceSchema.test.ts`

- [ ] **Step 1: Implement schema constants and guards**

Create `src/features/workbench/workbenchPersistenceSchema.ts`:

```ts
import type {
  WorkbenchFileKind,
  WorkbenchPanelKey,
} from './workbenchState.ts';

export const WORKBENCH_SESSION_SCHEMA_FAMILY = 'hard-sphere-lab.workbench-session' as const;
export const WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY = 'hard-sphere-lab.experiment-file' as const;
export const WORKBENCH_SESSION_SCHEMA_VERSION = 2 as const;
export const WORKBENCH_FILE_SCHEMA_VERSION = 1 as const;
export const WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH: string | null = null;

export type WorkbenchUnsupportedFutureVersionPolicy = 'reject' | 'readonly';

export interface WorkbenchPersistenceDiagnostic {
  level: 'info' | 'warning' | 'error';
  code:
    | 'legacy-session'
    | 'development-cache-reset'
    | 'unsupported-future-version'
    | 'invalid-envelope'
    | 'invalid-file'
    | 'readonly-future-version';
  message: string;
  fileId?: string;
}

export interface WorkbenchExperimentFileEnvelopeV1 {
  schemaFamily: typeof WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY;
  fileSchemaVersion: typeof WORKBENCH_FILE_SCHEMA_VERSION;
  id: string;
  kind: WorkbenchFileKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  layout: Record<string, unknown>;
  payload: unknown;
}

export interface WorkbenchSessionEnvelopeV2 {
  schemaFamily: typeof WORKBENCH_SESSION_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_SESSION_SCHEMA_VERSION;
  appVersion: string;
  savedAt: number;
  activeFileId: string | null;
  selectedPanel: WorkbenchPanelKey;
  files: WorkbenchExperimentFileEnvelopeV1[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isWorkbenchFileKind = (value: unknown): value is WorkbenchFileKind => (
  value === 'standard' || value === 'ideal' || value === 'heatCapacity'
);

export const getWorkbenchUnsupportedFutureVersionPolicy = (): WorkbenchUnsupportedFutureVersionPolicy => (
  WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH === null ? 'reject' : 'readonly'
);

export const isWorkbenchExperimentFileEnvelope = (
  value: unknown,
): value is WorkbenchExperimentFileEnvelopeV1 => (
  isRecord(value) &&
  value.schemaFamily === WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY &&
  value.fileSchemaVersion === WORKBENCH_FILE_SCHEMA_VERSION &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isWorkbenchFileKind(value.kind) &&
  isFiniteNumber(value.createdAt) &&
  isFiniteNumber(value.updatedAt) &&
  isRecord(value.layout)
);

export const isWorkbenchSessionEnvelope = (
  value: unknown,
): value is WorkbenchSessionEnvelopeV2 => (
  isRecord(value) &&
  value.schemaFamily === WORKBENCH_SESSION_SCHEMA_FAMILY &&
  value.schemaVersion === WORKBENCH_SESSION_SCHEMA_VERSION &&
  typeof value.appVersion === 'string' &&
  isFiniteNumber(value.savedAt) &&
  (typeof value.activeFileId === 'string' || value.activeFileId === null) &&
  typeof value.selectedPanel === 'string' &&
  Array.isArray(value.files) &&
  value.files.every(isWorkbenchExperimentFileEnvelope)
);
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
node tests\workbench\workbenchPersistenceSchema.test.ts
```

Expected: pass and print `workbenchPersistenceSchema tests passed`.

## Task 3: Extend Free Mode Config Snapshot Fields

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`

- [ ] **Step 1: Add failing assertions for implicit constants**

In `tests/heatCapacity/heatCapacityFreeTraceModel.test.ts`, after existing config snapshot assertions, add:

```ts
assert.equal(configSnapshot.physics.pumpStrokeDurationS, 0.08);
assert.equal(configSnapshot.physics.recommendedPumpIntervalS, 0.1);
assert.equal(configSnapshot.physics.releaseResponseDelayS, 0.02);
assert.equal(configSnapshot.physics.releaseMainDurationS, 0.18);
assert.equal(configSnapshot.sensor.pumpLagRate, 36);
assert.equal(configSnapshot.sensor.fastProcessSampleStepS, 0.04);
assert.equal(configSnapshot.scoring.processScoringVersion, 'free-process-score-v1');
```

- [ ] **Step 2: Run the trace model test and confirm it fails**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected: fail because the new snapshot fields are undefined.

- [ ] **Step 3: Add snapshot fields**

Modify `HeatCapacityFreeConfigSnapshot` in `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`:

```ts
  physics: {
    gamma: number;
    vesselVolumeL: number;
    pumpAmountGainRatio: number;
    pumpTemperatureGainK: number;
    pumpStrokeDurationS: number;
    recommendedPumpIntervalS: number;
    stopcockFlowRate: number;
    releaseResponseDelayS: number;
    releaseMainDurationS: number;
    releaseCoolingFactor: number;
    thermal: {
      gasWallConductanceWPerK: number;
      wallAmbientConductanceWPerK: number;
      wallHeatCapacityJPerK: number;
      minimumGasHeatCapacityJPerK: number;
    };
    leakage: {
      enabled: boolean;
      ratePerS: number;
    };
  };
```

Add sensor fields:

```ts
    pumpLagRate: number;
    fastProcessSampleStepS: number;
```

Add scoring:

```ts
  scoring: {
    processScoringVersion: 'free-process-score-v1';
  };
```

Update `createDefaultFreeConfigSnapshot()` defaults:

```ts
    pumpStrokeDurationS: 0.08,
    recommendedPumpIntervalS: 0.1,
    releaseResponseDelayS: 0.02,
    releaseMainDurationS: 0.18,
```

```ts
    pumpLagRate: 36,
    fastProcessSampleStepS: 0.04,
```

```ts
  scoring: {
    processScoringVersion: 'free-process-score-v1',
  },
```

- [ ] **Step 4: Verify focused tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
```

Expected: pass.

## Task 4: Add Heat Capacity Persistence Tests

**Files:**

- Create: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`
- Create later: `src/features/workbench/workbenchHeatCapacityPersistence.ts`

- [ ] **Step 1: Write failing tests for Heat Capacity payload completeness**

Create `tests/heatCapacity/heatCapacityFreePersistence.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  createDefaultHeatCapacityFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createHeatCapacityPersistencePayload,
  getHeatCapacityPersistenceReplayFields,
  validateHeatCapacityPersistencePayload,
} from '../../src/features/workbench/workbenchHeatCapacityPersistence.ts';

const file = createDefaultHeatCapacityFile(1);
const payload = createHeatCapacityPersistencePayload(file, 12345);

assert.equal(payload.experimentKind, 'heatCapacity');
assert.equal(payload.heatCapacitySchemaVersion, 1);
assert.equal(payload.mode, 'free');
assert.equal(payload.free?.runtimeVersion, file.heatCapacityFreeRuntimeVersion);
assert.equal(payload.free?.traceVersion, file.heatCapacityFreeTraceVersion);
assert.equal(payload.free?.config.physics.pumpAmountGainRatio, 0.015);
assert.equal(payload.free?.config.physics.pumpStrokeDurationS, 0.08);
assert.equal(payload.free?.config.physics.releaseMainDurationS, 0.18);
assert.equal(payload.free?.config.sensor.fastProcessSampleStepS, 0.04);
assert.equal(payload.free?.runtime.gasAmountRatio, 1);
assert.equal(payload.free?.controls.powerOn, false);
assert.equal(payload.free?.uiReplay.heatCapacityMaterialsExpanded, true);
assert.equal(payload.free?.uiReplay.pressureGaugeNeedleAngle, file.pressureGaugeNeedleAngle);
assert.equal(payload.free?.uiReplay.hardSphereViewEnabled, file.hardSphereViewEnabled);
assert.equal(payload.free?.references.standard, null);
assert.equal(payload.free?.references.operableBest, null);

const replay = getHeatCapacityPersistenceReplayFields(payload);
assert.equal(replay.pressureGaugeNeedleAngle, file.pressureGaugeNeedleAngle);
assert.equal(replay.heatCapacityFreeEquilibriumSpeedMultiplier, 4);

const validation = validateHeatCapacityPersistencePayload(payload);
assert.deepEqual(validation.errors, []);
assert.equal(validation.valid, true);

const invalid = validateHeatCapacityPersistencePayload({
  ...payload,
  free: {
    ...payload.free!,
    runtime: {
      ...payload.free!.runtime,
      gasAmountRatio: 0,
    },
  },
});
assert.equal(invalid.valid, false);
assert.equal(invalid.errors.includes('free.runtime.gasAmountRatio must be > 0'), true);

console.log('heatCapacityFreePersistence tests passed');
```

- [ ] **Step 2: Run and confirm failure**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePersistence.test.ts
```

Expected: fail with module-not-found for `workbenchHeatCapacityPersistence.ts`.

## Task 5: Implement Heat Capacity Persistence Adapter

**Files:**

- Create: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- Test: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`

- [ ] **Step 1: Create the adapter module**

Create `src/features/workbench/workbenchHeatCapacityPersistence.ts`:

```ts
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import {
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
  type HeatCapacityFreeConfigSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';

export const HEAT_CAPACITY_SCHEMA_VERSION = 1 as const;

export interface HeatCapacityReferenceStoreV1 {
  standard: null | HeatCapacityReferenceCurveV1;
  operableBest: null | HeatCapacityReferenceCurveV1;
}

export interface HeatCapacityReferenceCurveV1 {
  id: string;
  kind: 'standard' | 'operableBest';
  generatorVersion: string;
  generatedAt: number;
  configSnapshot: HeatCapacityFreeConfigSnapshot;
  operationScript: {
    steps: Array<{
      action: string;
      atS: number;
      durationS?: number;
    }>;
  };
  alignmentMode: 'nativeTime' | 'stageScaled';
  trace: Array<{
    sampleId: string;
    stageId: string;
    timeS: number;
    pressureDeltaKPa: number;
    temperatureDeltaK: number;
  }>;
  stages: Array<{
    id: string;
    label: string;
    startS: number;
    endS: number;
    countText?: string;
    durationText?: string;
  }>;
  records: {
    u0: unknown | null;
    u1: unknown | null;
    u2: unknown | null;
  };
}

export interface HeatCapacityFreeUiReplayV1 {
  selectedHeatCapacityPanel: WorkbenchHeatCapacityState['selectedHeatCapacityPanel'];
  openHeatCapacityTabs: WorkbenchHeatCapacityState['openHeatCapacityTabs'];
  activeHeatCapacityTabId: WorkbenchHeatCapacityState['activeHeatCapacityTabId'];
  heatCapacityMaterialsExpanded: boolean;
  heatCapacityTabContainerHeight: number;
  pressureGaugeDisplayValue: number;
  pressureGaugeNeedleAngle: number;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  pumpValveOpen: boolean;
  pumpBulbState: WorkbenchHeatCapacityState['pumpBulbState'];
  heatCapacityFreeStopcockFlowOpen: boolean;
  heatCapacityFreeStopcockPendingOpenAtMs: number | null;
  heatCapacityFreeEquilibriumSpeedMultiplier: WorkbenchHeatCapacityState['heatCapacityFreeEquilibriumSpeedMultiplier'];
  hardSphereViewEnabled: boolean;
  hardSphereParticleMultiplier: number;
  hardSphereSpeedMultiplier: number;
  hardSphereTrailsEnabled: boolean;
}

export interface HeatCapacityFreePersistenceDataV1 {
  runtimeVersion: typeof HEAT_CAPACITY_FREE_RUNTIME_VERSION;
  traceVersion: typeof HEAT_CAPACITY_FREE_TRACE_VERSION;
  calculationVersion: typeof HEAT_CAPACITY_FREE_CALCULATION_VERSION;
  config: HeatCapacityFreeConfigSnapshot;
  runtime: WorkbenchHeatCapacityState['heatCapacityFreePhysicsState'];
  controls: {
    powerOn: boolean;
    pumpValveOpen: boolean;
    stopcockOpen: boolean;
    pumpBulbState: WorkbenchHeatCapacityState['pumpBulbState'];
    stopcockFlowOpen: boolean;
  };
  sensor: WorkbenchHeatCapacityState['heatCapacityFreeSensorState'];
  calibration: WorkbenchHeatCapacityState['heatCapacityFreeCalibrationState'];
  traceStore: WorkbenchHeatCapacityState['heatCapacityFreeTraceStore'];
  trials: WorkbenchHeatCapacityState['heatCapacityFreeTrials'];
  references: HeatCapacityReferenceStoreV1;
  uiReplay: HeatCapacityFreeUiReplayV1;
}

export interface HeatCapacityPersistencePayloadV1 {
  experimentKind: 'heatCapacity';
  heatCapacitySchemaVersion: typeof HEAT_CAPACITY_SCHEMA_VERSION;
  mode: WorkbenchHeatCapacityState['heatCapacityMode'];
  common: {
    expectedTrialCount: number;
    activeTrialIndex: number;
    materialsExpanded: boolean;
    selectedHeatCapacityPanel: WorkbenchHeatCapacityState['selectedHeatCapacityPanel'];
    processingCalculated: boolean;
    processingResult: WorkbenchHeatCapacityState['heatCapacityProcessingResult'];
  };
  free: HeatCapacityFreePersistenceDataV1 | null;
  guided: null;
  demo: null;
}

export interface HeatCapacityPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

export const createHeatCapacityFreeConfigSnapshotFromFile = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeConfigSnapshot => ({
  version: 4,
  environment: {
    ambientPressureKPa: file.heatCapacityFreePhysicsConfig.environment.ambientPressureKPa,
    ambientTemperatureK: file.heatCapacityFreePhysicsConfig.environment.ambientTemperatureK,
  },
  physics: {
    gamma: file.heatCapacityFreePhysicsConfig.gamma,
    vesselVolumeL: file.heatCapacityFreePhysicsConfig.vesselVolumeL,
    pumpAmountGainRatio: file.heatCapacityFreePhysicsConfig.pumpAmountGainRatio,
    pumpTemperatureGainK: file.heatCapacityFreePhysicsConfig.pumpTemperatureGainK,
    pumpStrokeDurationS: 0.08,
    recommendedPumpIntervalS: 0.1,
    stopcockFlowRate: file.heatCapacityFreePhysicsConfig.stopcockFlowRate,
    releaseResponseDelayS: 0.02,
    releaseMainDurationS: 0.18,
    releaseCoolingFactor: file.heatCapacityFreePhysicsConfig.releaseCoolingFactor,
    thermal: { ...file.heatCapacityFreePhysicsConfig.thermal },
    leakage: { ...file.heatCapacityFreePhysicsConfig.leakage },
  },
  sensor: {
    pressureMvPerKPa: file.heatCapacityFreeSensorConfig.pressureMvPerKPa,
    temperatureMvAtAmbient: file.heatCapacityFreeSensorConfig.temperatureMvAtAmbient,
    temperatureMvPerK: file.heatCapacityFreeSensorConfig.temperatureMvPerK,
    lagRate: file.heatCapacityFreeSensorConfig.lagRate,
    pumpLagRate: 36,
    noiseMv: file.heatCapacityFreeSensorConfig.noiseMv,
    quantizationMv: file.heatCapacityFreeSensorConfig.quantizationMv,
    minSampleIntervalS: file.heatCapacityFreeSensorConfig.minSampleIntervalS,
    maxSampleIntervalS: file.heatCapacityFreeSensorConfig.maxSampleIntervalS,
    fastProcessSampleStepS: 0.04,
    historyWindowS: file.heatCapacityFreeSensorConfig.historyWindowS,
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
  scoring: {
    processScoringVersion: 'free-process-score-v1',
  },
});

export const createHeatCapacityPersistencePayload = (
  file: WorkbenchHeatCapacityState,
  savedAt: number,
): HeatCapacityPersistencePayloadV1 => {
  void savedAt;
  const freeConfig = createHeatCapacityFreeConfigSnapshotFromFile(file);
  return {
    experimentKind: 'heatCapacity',
    heatCapacitySchemaVersion: HEAT_CAPACITY_SCHEMA_VERSION,
    mode: file.heatCapacityMode,
    common: {
      expectedTrialCount: file.heatCapacityExpectedTrialCount,
      activeTrialIndex: file.heatCapacityActiveTrialIndex,
      materialsExpanded: file.heatCapacityMaterialsExpanded,
      selectedHeatCapacityPanel: file.selectedHeatCapacityPanel,
      processingCalculated: file.heatCapacityProcessingCalculated,
      processingResult: file.heatCapacityProcessingResult,
    },
    free: {
      runtimeVersion: HEAT_CAPACITY_FREE_RUNTIME_VERSION,
      traceVersion: HEAT_CAPACITY_FREE_TRACE_VERSION,
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      config: freeConfig,
      runtime: { ...file.heatCapacityFreePhysicsState },
      controls: {
        powerOn: file.powerOn,
        pumpValveOpen: file.pumpValveOpen,
        stopcockOpen: file.glassPistonState === 'open',
        pumpBulbState: file.pumpBulbState,
        stopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen,
      },
      sensor: { ...file.heatCapacityFreeSensorState },
      calibration: { ...file.heatCapacityFreeCalibrationState },
      traceStore: file.heatCapacityFreeTraceStore,
      trials: file.heatCapacityFreeTrials,
      references: {
        standard: null,
        operableBest: null,
      },
      uiReplay: {
        selectedHeatCapacityPanel: file.selectedHeatCapacityPanel,
        openHeatCapacityTabs: [...file.openHeatCapacityTabs],
        activeHeatCapacityTabId: file.activeHeatCapacityTabId,
        heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded,
        heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight,
        pressureGaugeDisplayValue: file.pressureGaugeDisplayValue,
        pressureGaugeNeedleAngle: file.pressureGaugeNeedleAngle,
        pressureZeroKnobAngle: file.pressureZeroKnobAngle,
        pressureZeroOffset: file.pressureZeroOffset,
        pressureZeroDisplayText: file.pressureZeroDisplayText,
        pumpValveOpen: file.pumpValveOpen,
        pumpBulbState: file.pumpBulbState,
        heatCapacityFreeStopcockFlowOpen: file.heatCapacityFreeStopcockFlowOpen,
        heatCapacityFreeStopcockPendingOpenAtMs: file.heatCapacityFreeStopcockPendingOpenAtMs,
        heatCapacityFreeEquilibriumSpeedMultiplier:
          file.heatCapacityFreeEquilibriumSpeedMultiplier ?? HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
        hardSphereViewEnabled: file.hardSphereViewEnabled,
        hardSphereParticleMultiplier: file.hardSphereParticleMultiplier,
        hardSphereSpeedMultiplier: file.hardSphereSpeedMultiplier,
        hardSphereTrailsEnabled: file.hardSphereTrailsEnabled,
      },
    },
    guided: null,
    demo: null,
  };
};

export const getHeatCapacityPersistenceReplayFields = (
  payload: HeatCapacityPersistencePayloadV1,
): HeatCapacityFreeUiReplayV1 => {
  if (!payload.free) {
    throw new Error('Heat capacity Free Mode replay fields are unavailable.');
  }
  return payload.free.uiReplay;
};

export const validateHeatCapacityPersistencePayload = (
  payload: HeatCapacityPersistencePayloadV1,
): HeatCapacityPayloadValidationResult => {
  const errors: string[] = [];
  if (payload.experimentKind !== 'heatCapacity') errors.push('experimentKind must be heatCapacity');
  if (payload.heatCapacitySchemaVersion !== HEAT_CAPACITY_SCHEMA_VERSION) {
    errors.push('heatCapacitySchemaVersion is unsupported');
  }
  if (payload.free) {
    if (!(payload.free.runtime.gasAmountRatio > 0)) {
      errors.push('free.runtime.gasAmountRatio must be > 0');
    }
    if (!(payload.free.config.environment.ambientTemperatureK > 0)) {
      errors.push('free.config.environment.ambientTemperatureK must be > 0');
    }
    if (!(payload.free.config.physics.gamma > 1)) {
      errors.push('free.config.physics.gamma must be > 1');
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
};
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePersistence.test.ts
```

Expected: pass.

## Task 6: Add Workbench Envelope Round-Trip Tests

**Files:**

- Modify: `tests/workbench/workbenchSessionPersistence.test.ts`
- Create later: `src/features/workbench/workbenchPersistenceMigration.ts`

- [ ] **Step 1: Add failing v2 envelope tests**

Append to `tests/workbench/workbenchSessionPersistence.test.ts`:

```ts
import {
  decodeWorkbenchStorageEnvelope,
  encodeWorkbenchStorageEnvelope,
} from '../../src/features/workbench/workbenchPersistenceMigration.ts';
import {
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';

const envelope = encodeWorkbenchStorageEnvelope(restored.files, restored.activeFileId, restored.selectedPanel, 777);
assert.equal(envelope.schemaFamily, WORKBENCH_SESSION_SCHEMA_FAMILY);
assert.equal(envelope.schemaVersion, WORKBENCH_SESSION_SCHEMA_VERSION);
assert.equal(envelope.files.length, restored.files.length);
assert.equal(envelope.files.some((file) => file.kind === 'heatCapacity'), true);

const decodedEnvelope = decodeWorkbenchStorageEnvelope(envelope);
assert.equal(decodedEnvelope.readonly, false);
assert.deepEqual(decodedEnvelope.diagnostics.filter((entry) => entry.level === 'error'), []);
assert.equal(decodedEnvelope.session.files.length, restored.files.length);
assert.equal(decodedEnvelope.session.activeFileId, restored.activeFileId);

const futureEnvelope = {
  ...envelope,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION + 1,
};
const futureDecoded = decodeWorkbenchStorageEnvelope(futureEnvelope);
assert.equal(futureDecoded.readonly, false);
assert.equal(futureDecoded.session.files.length, 0);
assert.equal(
  futureDecoded.diagnostics.some((entry) => entry.code === 'unsupported-future-version'),
  true,
);
```

- [ ] **Step 2: Run and confirm failure**

Run:

```powershell
node tests\workbench\workbenchSessionPersistence.test.ts
```

Expected: fail with module-not-found for `workbenchPersistenceMigration.ts`.

## Task 7: Implement Storage Envelope Encode/Decode

**Files:**

- Create: `src/features/workbench/workbenchPersistenceMigration.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Test: `tests/workbench/workbenchSessionPersistence.test.ts`

- [ ] **Step 1: Create migration module**

Create `src/features/workbench/workbenchPersistenceMigration.ts`:

```ts
import {
  createDefaultHeatCapacityFile,
  type WorkbenchFileState,
  type WorkbenchPanelKey,
} from './workbenchState.ts';
import type {
  WorkbenchSessionState,
} from './workbenchSession.ts';
import {
  createHeatCapacityPersistencePayload,
} from './workbenchHeatCapacityPersistence.ts';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
  getWorkbenchUnsupportedFutureVersionPolicy,
  isWorkbenchSessionEnvelope,
  type WorkbenchPersistenceDiagnostic,
  type WorkbenchSessionEnvelopeV2,
} from './workbenchPersistenceSchema.ts';

export interface DecodeWorkbenchStorageResult {
  session: WorkbenchSessionState;
  diagnostics: WorkbenchPersistenceDiagnostic[];
  readonly: boolean;
  handled: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const fallbackSession = (): WorkbenchSessionState => ({
  version: 1,
  files: [],
  activeFileId: '',
  selectedPanel: 'preview',
});

const encodeFileEnvelope = (
  file: WorkbenchFileState,
  savedAt: number,
) => ({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: file.id,
  kind: file.kind,
  name: file.name,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
  lastOpenedAt: file.lastOpenedAt,
  layout: {
    visiblePanels: file.visiblePanels,
    liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
  },
  payload: file.kind === 'heatCapacity'
    ? createHeatCapacityPersistencePayload(file, savedAt)
    : {
        experimentKind: file.kind,
        runtimeState: file,
      },
});

export const encodeWorkbenchStorageEnvelope = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
  savedAt = Date.now(),
): WorkbenchSessionEnvelopeV2 => ({
  schemaFamily: WORKBENCH_SESSION_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  appVersion: 'development',
  savedAt,
  activeFileId: activeFileId || null,
  selectedPanel,
  files: files.map((file) => encodeFileEnvelope(file, savedAt)),
});

const decodeEnvelopeAsRuntimeSession = (
  envelope: WorkbenchSessionEnvelopeV2,
): WorkbenchSessionState => {
  const runtimeFiles = envelope.files.flatMap((fileEnvelope): WorkbenchFileState[] => {
    if (
      isRecord(fileEnvelope.payload) &&
      isRecord(fileEnvelope.payload.runtimeState) &&
      (fileEnvelope.kind === 'standard' || fileEnvelope.kind === 'ideal')
    ) {
      return [fileEnvelope.payload.runtimeState as WorkbenchFileState];
    }
    if (fileEnvelope.kind === 'heatCapacity') {
      const fallback = createDefaultHeatCapacityFile(1);
      return [{
        ...fallback,
        id: fileEnvelope.id,
        name: fileEnvelope.name,
        createdAt: fileEnvelope.createdAt,
        updatedAt: fileEnvelope.updatedAt,
        lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
      }];
    }
    return [];
  });
  return {
    version: 1,
    files: runtimeFiles,
    activeFileId: envelope.activeFileId ?? runtimeFiles[0]?.id ?? '',
    selectedPanel: envelope.selectedPanel,
  };
};

export const decodeWorkbenchStorageEnvelope = (
  value: unknown,
): DecodeWorkbenchStorageResult => {
  if (isRecord(value) && value.schemaFamily === WORKBENCH_SESSION_SCHEMA_FAMILY) {
    const version = value.schemaVersion;
    if (typeof version === 'number' && version > WORKBENCH_SESSION_SCHEMA_VERSION) {
      const policy = getWorkbenchUnsupportedFutureVersionPolicy();
      return {
        session: fallbackSession(),
        diagnostics: [{
          level: policy === 'reject' ? 'error' : 'warning',
          code: policy === 'reject' ? 'unsupported-future-version' : 'readonly-future-version',
          message: `Unsupported future workbench session schema version: ${version}.`,
        }],
        readonly: policy === 'readonly',
        handled: true,
      };
    }
    if (isWorkbenchSessionEnvelope(value)) {
      return {
        session: decodeEnvelopeAsRuntimeSession(value),
        diagnostics: [],
        readonly: false,
        handled: true,
      };
    }
    return {
      session: fallbackSession(),
      diagnostics: [{
        level: 'error',
        code: 'invalid-envelope',
        message: 'Workbench session envelope is invalid.',
      }],
      readonly: false,
      handled: true,
    };
  }
  return {
    session: fallbackSession(),
    diagnostics: [],
    readonly: false,
    handled: false,
  };
};
```

- [ ] **Step 2: Verify the migration module does not depend on UI globals**

The migration module must not depend on UI-only globals. Confirm `encodeWorkbenchStorageEnvelope` contains:

```ts
  appVersion: 'development',
```

Later release work can thread the actual app version into this function. That is outside this schema batch.

- [ ] **Step 3: Keep legacy decoding in `workbenchSession.ts`**

Do not import `decodeWorkbenchSession` into `workbenchPersistenceMigration.ts`. `workbenchSession.ts` remains responsible for legacy v1 decode. The load path in Task 8 will call:

```ts
const decodedEnvelope = decodeWorkbenchStorageEnvelope(parsed);
return decodedEnvelope.handled
  ? decodeWorkbenchSession(decodedEnvelope.session)
  : decodeWorkbenchSession(parsed);
```

This avoids a runtime circular import.

- [ ] **Step 4: Run session persistence test**

Run:

```powershell
node tests\workbench\workbenchSessionPersistence.test.ts
```

Expected: pass after import cycle is resolved.

## Task 8: Wire Storage Load/Persist Through Envelope

**Files:**

- Modify: `src/features/workbench/workbenchSession.ts`
- Test: `tests/workbench/workbenchSessionPersistence.test.ts`
- Test: `tests/workbench/workbenchExperimentFiles.test.ts`

- [ ] **Step 1: Add tests for storage helpers**

In `tests/workbench/workbenchSessionPersistence.test.ts`, add assertions against source or direct helper behavior:

```ts
const sessionSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'workbenchSession.ts'),
  'utf8',
);

assert.match(sessionSource, /decodeWorkbenchStorageEnvelope/);
assert.match(sessionSource, /encodeWorkbenchStorageEnvelope/);
assert.match(sessionSource, /WORKBENCH_SESSION_STORAGE_KEY/);
assert.match(sessionSource, /WORKBENCH_CLOSED_FILES_STORAGE_KEY/);
```

- [ ] **Step 2: Wire `loadWorkbenchSession`**

In `src/features/workbench/workbenchSession.ts`, import:

```ts
import {
  decodeWorkbenchStorageEnvelope,
  encodeWorkbenchStorageEnvelope,
} from './workbenchPersistenceMigration.ts';
```

Change `loadWorkbenchSession` parse section to:

```ts
const raw = storage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
if (!raw) return fallbackSession();
const parsed = JSON.parse(raw);
const decodedEnvelope = decodeWorkbenchStorageEnvelope(parsed);
return decodedEnvelope.handled
  ? decodeWorkbenchSession(decodedEnvelope.session)
  : decodeWorkbenchSession(parsed);
```

- [ ] **Step 3: Wire `persistWorkbenchSession`**

Change `persistWorkbenchSession` to store the envelope:

```ts
const envelope = encodeWorkbenchStorageEnvelope(
  session.files,
  session.activeFileId,
  session.selectedPanel,
);
storage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(envelope));
```

- [ ] **Step 4: Keep `encodeWorkbenchSession` public API stable**

Do not change callers in `WorkbenchStudioPrototype.tsx`. Keep:

```ts
persistWorkbenchSession(encodeWorkbenchSession(files, activeFileId, selectedPanel));
```

This preserves the current React call pattern while changing only storage serialization.

- [ ] **Step 5: Run tests**

Run:

```powershell
node tests\workbench\workbenchSessionPersistence.test.ts
node tests\workbench\workbenchExperimentFiles.test.ts
```

Expected: both pass.

## Task 9: Protect Recorded Values Through Migration

**Files:**

- Modify: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`
- Modify: `src/features/workbench/workbenchPersistenceMigration.ts`

- [ ] **Step 1: Add record-protection failing test**

Append to `tests/heatCapacity/heatCapacityFreePersistence.test.ts`:

```ts
const recordedFile = {
  ...file,
  heatCapacityFreeTrials: [{
    id: 'trial-1',
    source: 'free' as const,
    traceTrialId: 'free-trace-trial-1',
    branchCount: 1,
    automaticU0: null,
    u0: {
      atS: 1,
      displayPressureMv: 0.12,
      displayTemperatureMv: 1499.01,
      calibrationVersion: 1,
      zeroEventId: 'zero-1',
      source: 'user' as const,
      phaseAtRecord: 'readyToZero' as const,
      traceTrialId: 'free-trace-trial-1',
      traceBranchId: 'branch-1',
      traceSampleId: 'sample-1',
      eventId: 'event-1',
    },
    u1: {
      atS: 12,
      displayPressureMv: 119.8,
      displayTemperatureMv: 1499.2,
      calibrationVersion: 1,
      zeroEventId: 'zero-1',
      source: 'user' as const,
      phaseAtRecord: 'sealedStabilizing' as const,
      traceTrialId: 'free-trace-trial-1',
      traceBranchId: 'branch-1',
      traceSampleId: 'sample-2',
      eventId: 'event-2',
    },
    u2: {
      atS: 20,
      displayPressureMv: 35.4,
      displayTemperatureMv: 1499.0,
      calibrationVersion: 1,
      zeroEventId: 'zero-1',
      source: 'user' as const,
      phaseAtRecord: 'recovering' as const,
      traceTrialId: 'free-trace-trial-1',
      traceBranchId: 'branch-1',
      traceSampleId: 'sample-3',
      eventId: 'event-3',
    },
    blockedReason: null,
    correctedSignals: {
      calculationVersion: 'log-pressure-v1' as const,
      atmosphericPressureKPa: 101.3,
      pressureSensitivityMvPerKPa: 20,
      U0DisplayMv: 0.12,
      U1DisplayMv: 119.8,
      U2DisplayMv: 35.4,
      U1CorrectedMv: 119.68,
      U2CorrectedMv: 35.28,
      gamma: 1.39,
    },
  }],
};
const recordedPayload = createHeatCapacityPersistencePayload(recordedFile, 555);
assert.equal(recordedPayload.free?.trials[0].u1?.displayPressureMv, 119.8);
assert.equal(recordedPayload.free?.trials[0].correctedSignals?.gamma, 1.39);
```

- [ ] **Step 2: Run focused test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePersistence.test.ts
```

Expected: pass once payload stores trial records by value and does not recalculate them.

## Task 10: Add Reference Snapshot Shape Without Freezing Generator Logic

**Files:**

- Modify: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`
- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`

- [ ] **Step 1: Add reference-shape test**

Append:

```ts
const referencePayload = createHeatCapacityPersistencePayload(file, 999);
assert.equal(referencePayload.free?.references.standard, null);
assert.equal(referencePayload.free?.references.operableBest, null);
assert.equal(
  'references' in referencePayload.free!,
  true,
  'schema must reserve a durable reference store before the generators are finalized',
);
```

- [ ] **Step 2: Add helper for future reference snapshots**

In `workbenchHeatCapacityPersistence.ts`, add:

```ts
export const createEmptyHeatCapacityReferenceStore = (): HeatCapacityReferenceStoreV1 => ({
  standard: null,
  operableBest: null,
});
```

Use it in `createHeatCapacityPersistencePayload`:

```ts
references: createEmptyHeatCapacityReferenceStore(),
```

- [ ] **Step 3: Run focused test**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePersistence.test.ts
```

Expected: pass.

## Task 11: Preserve UI-Replay Fields on Round Trip

**Files:**

- Modify: `tests/workbench/workbenchSessionPersistence.test.ts`
- Modify: `src/features/workbench/workbenchPersistenceMigration.ts`

- [ ] **Step 1: Add UI replay round-trip test**

Append:

```ts
const heatReplayFile = createDefaultHeatCapacityFile(8);
const replayEnvelope = encodeWorkbenchStorageEnvelope([{
  ...heatReplayFile,
  pressureGaugeNeedleAngle: 33,
  heatCapacityFreeEquilibriumSpeedMultiplier: 8,
  hardSphereViewEnabled: true,
  hardSphereParticleMultiplier: 1.2,
  hardSphereSpeedMultiplier: 1.1,
  hardSphereTrailsEnabled: true,
}], heatReplayFile.id, 'preview', 1000);
const replayDecoded = decodeWorkbenchStorageEnvelope(replayEnvelope).session;
const replayFile = replayDecoded.files[0];
assert.equal(replayFile.kind, 'heatCapacity');
if (replayFile.kind !== 'heatCapacity') throw new Error('expected heat capacity replay file');
assert.equal(replayFile.pressureGaugeNeedleAngle, 33);
assert.equal(replayFile.heatCapacityFreeEquilibriumSpeedMultiplier, 8);
assert.equal(replayFile.hardSphereViewEnabled, true);
assert.equal(replayFile.hardSphereParticleMultiplier, 1.2);
assert.equal(replayFile.hardSphereSpeedMultiplier, 1.1);
assert.equal(replayFile.hardSphereTrailsEnabled, true);
```

- [ ] **Step 2: Implement Heat Capacity payload-to-runtime restore**

In `workbenchPersistenceMigration.ts`, replace the heat-capacity fallback branch in `decodeEnvelopeAsRuntimeSession` with:

```ts
if (fileEnvelope.kind === 'heatCapacity' && isRecord(fileEnvelope.payload)) {
  const fallback = createDefaultHeatCapacityFile(1);
  const free = isRecord(fileEnvelope.payload.free) ? fileEnvelope.payload.free : null;
  const uiReplay = free && isRecord(free.uiReplay) ? free.uiReplay : {};
  return [{
    ...fallback,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    ...(free && isRecord(free.runtime) ? { heatCapacityFreePhysicsState: free.runtime } : {}),
    ...(free && isRecord(free.sensor) ? { heatCapacityFreeSensorState: free.sensor } : {}),
    ...(free && isRecord(free.calibration) ? { heatCapacityFreeCalibrationState: free.calibration } : {}),
    ...(free && isRecord(free.traceStore) ? { heatCapacityFreeTraceStore: free.traceStore } : {}),
    ...(Array.isArray(free?.trials) ? { heatCapacityFreeTrials: free.trials } : {}),
    pressureGaugeNeedleAngle: typeof uiReplay.pressureGaugeNeedleAngle === 'number'
      ? uiReplay.pressureGaugeNeedleAngle
      : fallback.pressureGaugeNeedleAngle,
    heatCapacityFreeEquilibriumSpeedMultiplier: uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier === 1 ||
      uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier === 2 ||
      uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier === 4 ||
      uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier === 8
      ? uiReplay.heatCapacityFreeEquilibriumSpeedMultiplier
      : fallback.heatCapacityFreeEquilibriumSpeedMultiplier,
    hardSphereViewEnabled: uiReplay.hardSphereViewEnabled === true,
    hardSphereParticleMultiplier: typeof uiReplay.hardSphereParticleMultiplier === 'number'
      ? uiReplay.hardSphereParticleMultiplier
      : fallback.hardSphereParticleMultiplier,
    hardSphereSpeedMultiplier: typeof uiReplay.hardSphereSpeedMultiplier === 'number'
      ? uiReplay.hardSphereSpeedMultiplier
      : fallback.hardSphereSpeedMultiplier,
    hardSphereTrailsEnabled: uiReplay.hardSphereTrailsEnabled === true,
  }];
}
```

- [ ] **Step 3: Run session persistence test**

Run:

```powershell
node tests\workbench\workbenchSessionPersistence.test.ts
```

Expected: pass.

## Task 12: Full Test and Type Verification

**Files:**

- No code changes unless verification exposes failures.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
node tests\workbench\workbenchPersistenceSchema.test.ts
node tests\heatCapacity\heatCapacityFreeTraceModel.test.ts
node tests\heatCapacity\heatCapacityFreePersistence.test.ts
node tests\workbench\workbenchSessionPersistence.test.ts
node tests\heatCapacity\workbenchHeatCapacityFile.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run full test suite**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 4: Start fixed preview port**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected: Vite serves on `http://127.0.0.1:5174/`.

- [ ] **Step 5: Browser smoke test**

Open:

```text
http://127.0.0.1:5174/
```

Verify:

- App loads without console errors.
- A new Heat Capacity file opens.
- Free Mode reset still works.
- Record U0/U1/U2 controls still render.
- Process Review still renders with no missing-data crash.

## Task 13: Update Plan/Spec Cross-Check

**Files:**

- Modify if needed: `docs/superpowers/specs/2026-05-23-heat-capacity-data-schema-versioning-design.md`
- Modify if needed: `docs/superpowers/plans/2026-05-23-heat-capacity-data-schema-versioning.md`

- [ ] **Step 1: Cross-check implementation against spec**

Confirm every spec requirement has an implementation task:

- development cache policy
- future-version policy
- public envelope
- Heat Capacity complete payload
- UI replay fields
- trace config snapshot
- record protection
- reference store shape
- standard/ideal payload lossless carriage

- [ ] **Step 2: Search for forbidden placeholders**

Run:

```powershell
$pattern = ('TB' + 'D') + '|'+ ('TO' + 'DO') + '|' + 'implement ' + 'later|' + 'fill in ' + 'details|' + '适' + '当|' + '后续' + '再补'
Select-String -LiteralPath 'docs\superpowers\plans\2026-05-23-heat-capacity-data-schema-versioning.md' -Pattern $pattern
```

Expected: no matches.

- [ ] **Step 3: Check changed files**

Run:

```powershell
git status --short
```

Expected: only files related to this implementation plus pre-existing user worktree changes. Do not revert unrelated dirty files.

## Implementation Notes

- Use `npm.cmd`, not `npm`, in PowerShell.
- Do not change physical defaults in this implementation.
- Do not remove development cache unless a failing test or runtime path proves it is necessary.
- Do not add main-screen parameter UI in this batch.
- Do not claim official-release compatibility has started. `WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH` remains `null` until the user chooses the formal release boundary.
