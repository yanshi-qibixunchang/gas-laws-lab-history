# Standard And Ideal Gas Data Schema Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Workbench 里剩余两个实验（Standard Simulation、Ideal Gas Simulation）的数据保存从 `runtimeState` 原样兜底，升级为显式、可验证、可迁移的 schema，并保证重新打开后 UI 显示结果和后台继续运行状态都能一致恢复。

**Architecture:** 沿用当前已经为比热容实验建立的公共 envelope：session / closed files / experiment-file 三层外壳不变；新增标准实验和理想气体实验各自的 persistence adapter。两者共用同一个 `PhysicsEngine` 快照结构，避免只保存 UI 数组而丢失后台采样窗口、压力历史、累计样本等隐藏运行状态。

**Tech Stack:** TypeScript, React, Vite, Node `assert` tests, existing `PhysicsEngine`, existing Workbench session persistence envelope.

---

## Source Context

已完成的比热容固化方案建立了这些基础设施：

- `src/features/workbench/workbenchPersistenceSchema.ts`
- `src/features/workbench/workbenchPersistenceMigration.ts`
- `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- `tests/workbench/workbenchSessionPersistence.test.ts`

当前缺口：

- `workbenchPersistenceMigration.ts` 对 `standard` / `ideal` 仍然写入：

```ts
{
  experimentKind: file.kind,
  runtimeState: file,
}
```

这只是“整体塞进去”，没有 schema 版本、没有字段校验、没有可迁移边界。

更关键的是，当前 `WorkbenchStandardState` / `WorkbenchIdealState` 只保存显示层状态，例如：

- `particles`
- `stats`
- `chartData`
- `finalChartData`
- `standardResultsLayout`
- `pointsByRelation`
- `latestPressureSummary`
- `idealWindowLayout`

但真正的后台 `PhysicsEngine` 还含有这些不在 file state 里的运行状态：

- `time`
- `targetTemperature`
- `collectedSpeeds`
- `collectedEnergies`
- `collectedSampleWindowTotal`
- `tempHistory`
- `lastSampleTime`
- `pressureWindowStartTime`
- `pressureWindowMomentum`
- `pressureHistory`
- `latestMeasuredPressure`

因此这次“完整固化”不能只拆 `runtimeState`，还必须给 `PhysicsEngine` 增加可序列化快照。

## Fixed Decisions

- 这次只处理 Standard Simulation 和 Ideal Gas Simulation。
- 不改比热容模型和比热容 persistence adapter。
- 不改物理模型公式。
- 不改 UI 设计和文案。
- 不删除旧缓存文件。正式执行时只增加新 schema 读写；开发期旧 raw session 和旧 `runtimeState` envelope 继续可读。
- 新 schema 写入时必须不再使用 `runtimeState: file` 作为标准/理想实验的主路径。
- 重新打开后，用户可见 UI 必须一致；如果继续运行，也应从上次保存时的 `PhysicsEngine` 快照继续，而不是重新随机初始化。

## No Open Questions

我按当前项目结构判断，“剩下两个实验”就是：

- `standard`: Standard Simulation
- `ideal`: Ideal Gas Simulation

没有发现需要你额外确认的断言冲突。唯一需要明确写进计划的风险是：如果不固化 `PhysicsEngine` 快照，标准/理想实验的隐藏采样状态会重置，这和“完整固化”冲突，所以本计划把 engine 快照列为必做项。

## Code Reread Corrections Before Execution

复读当前仓库后，对原计划做三条执行修正：

- 本仓库没有 `tsx` 依赖，`scripts/runTests.cjs` 也是直接执行 `node tests/...test.ts`，所以所有聚焦测试命令统一使用 `node tests/...test.ts`。
- 旧 raw session 和旧 `runtimeState` envelope 里不会有 `hardSphereEngineSnapshot`，标准/理想文件恢复时必须显式归一化为 `null`，不能让字段缺失进入运行时。
- `PhysicsEngine.fromSnapshot()` 只接收已经校验过的 snapshot。UI 创建 runtime 时必须先确认 snapshot 参数与当前 `appliedParams` / `activeParams` 一致，否则必须退回新建 engine。

## File Structure

Create:

- `tests/hardSphere/physicsEngineSnapshot.test.ts`  
  验证 `PhysicsEngine` 快照能恢复粒子、时间、累计采样、温度历史、压力采样历史。

- `src/features/workbench/workbenchHardSpherePersistence.ts`  
  存放 Standard / Ideal 共用的保存工具：深拷贝、参数校验、chart/particle/stats 归一化、engine snapshot 校验。

- `src/features/workbench/workbenchStandardPersistence.ts`  
  负责 Standard Simulation payload 的创建、校验、恢复。

- `src/features/workbench/workbenchIdealGasPersistence.ts`  
  负责 Ideal Gas Simulation payload 的创建、校验、恢复。

- `tests/workbench/workbenchStandardPersistence.test.ts`  
  验证标准实验完整 round-trip，不丢 `finalChartData`、结果窗口布局、engine 累计采样。

- `tests/workbench/workbenchIdealGasPersistence.test.ts`  
  验证理想气体实验完整 round-trip，不丢 relation、点集、压力汇总、验证状态、结果窗口布局、engine 压力历史。

Modify:

- `src/domain/hardSphere/PhysicsEngine.ts`  
  增加 `createSnapshot()` 和 `fromSnapshot()`，不改变 step / collect / pressure 公式。

- `src/features/workbench/workbenchState.ts`  
  给 `WorkbenchStandardState` 和 `WorkbenchIdealState` 增加 `hardSphereEngineSnapshot` 字段，默认 `null`。

- `src/features/workbench/WorkbenchStudioPrototype.tsx`  
  创建、运行、重置、恢复 Standard / Ideal runtime 时同步 engine snapshot；创建 runtime 时优先从 snapshot 恢复。

- `src/features/workbench/workbenchPersistenceMigration.ts`  
  对 standard / ideal 改用新 adapter；保留旧 `runtimeState` envelope 的 legacy fallback。

- `src/features/workbench/workbenchPersistenceSchema.ts`  
  只在需要新增 diagnostic code 时修改。当前计划不提升 session schema version，除非实现中发现 envelope 结构本身必须变。

- `tests/workbench/workbenchSessionPersistence.test.ts`  
  扩展 session 和 closed-files envelope 的 Standard / Ideal schema round-trip 覆盖。

Do not modify:

- 比热容 physics / UI / persistence。
- `SimulationParams` 的语义。
- `PhysicsEngine.step()` 的运动、碰撞、恒温器、压力统计公式。
- 结果图的 UI 样式。

## Schema Design

### Shared `PhysicsEngineSnapshotV1`

Add to `src/domain/hardSphere/PhysicsEngine.ts`:

```ts
export const PHYSICS_ENGINE_SNAPSHOT_VERSION = 1 as const;

export interface PhysicsEngineSnapshotV1 {
  schemaVersion: typeof PHYSICS_ENGINE_SNAPSHOT_VERSION;
  params: SimulationParams;
  particles: Particle[];
  time: number;
  targetTemperature: number;
  collectedSpeeds: number[];
  collectedEnergies: number[];
  collectedSampleWindowTotal: number;
  tempHistory: Array<{ time: number; error: number; totalEnergy: number }>;
  lastSampleTime: number;
  pressureWindowStartTime: number;
  pressureWindowMomentum: number;
  pressureHistory: PressureWindowPoint[];
  latestMeasuredPressure: number;
}
```

Restore rule:

- `PhysicsEngine.fromSnapshot(snapshot)` 先构造同参数 engine，再覆盖所有 snapshot 字段。
- `speedBins` / `energyBins` 不保存；恢复时根据 `targetTemperature` 和 `params` 重建。
- 如果 snapshot 缺失或版本不支持，就退回当前逻辑：用参数新建 engine，但 UI 仍使用保存的 file state 显示。

### `WorkbenchStandardPersistencePayloadV1`

Create in `src/features/workbench/workbenchStandardPersistence.ts`:

```ts
export const STANDARD_SIMULATION_SCHEMA_VERSION = 1 as const;
export const STANDARD_SIMULATION_MODEL_VERSION = 'hard-sphere-standard-v1' as const;

export interface WorkbenchStandardPersistencePayloadV1 {
  experimentKind: 'standard';
  standardSchemaVersion: typeof STANDARD_SIMULATION_SCHEMA_VERSION;
  modelVersion: typeof STANDARD_SIMULATION_MODEL_VERSION;
  params: SimulationParams;
  appliedParams: SimulationParams;
  runtime: {
    runState: WorkbenchRunState;
    stats: SimulationStats;
    chartData: ChartData;
    finalChartData: ChartData | null;
    particles: Particle[];
    engineSnapshot: PhysicsEngineSnapshotV1 | null;
  };
  uiReplay: {
    visiblePanels: WorkbenchPanelKey[];
    liveWorkspaceSplitRatio: number;
    standardResultsLayout: WorkbenchStandardResultsLayout;
  };
}
```

### `WorkbenchIdealGasPersistencePayloadV1`

Create in `src/features/workbench/workbenchIdealGasPersistence.ts`:

```ts
export const IDEAL_GAS_SCHEMA_VERSION = 1 as const;
export const IDEAL_GAS_MODEL_VERSION = 'hard-sphere-ideal-gas-v1' as const;

export interface WorkbenchIdealGasPersistencePayloadV1 {
  experimentKind: 'ideal';
  idealGasSchemaVersion: typeof IDEAL_GAS_SCHEMA_VERSION;
  modelVersion: typeof IDEAL_GAS_MODEL_VERSION;
  relation: ExperimentRelation;
  params: SimulationParams;
  appliedParams: SimulationParams;
  activeParams: SimulationParams;
  runtime: {
    runState: WorkbenchRunState;
    stats: SimulationStats;
    chartData: ChartData;
    finalChartData: ChartData | null;
    particles: Particle[];
    engineSnapshot: PhysicsEngineSnapshotV1 | null;
    latestPressureSummary: PressureMeasurementSummary | null;
  };
  experimentData: {
    pointsByRelation: PointsByRelation;
    needsReset: boolean;
    verificationState: WorkbenchIdealState['verificationState'];
    historyUnlocked: boolean;
  };
  uiReplay: {
    visiblePanels: WorkbenchPanelKey[];
    liveWorkspaceSplitRatio: number;
    idealWindowLayout: WorkbenchIdealWindowLayout;
  };
}
```

## Task 1: Add PhysicsEngine Snapshot Test

**Files:**

- Create: `tests/hardSphere/physicsEngineSnapshot.test.ts`
- Production target: `src/domain/hardSphere/PhysicsEngine.ts`

- [ ] **Step 1: Write failing test**

Create `tests/hardSphere/physicsEngineSnapshot.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  PHYSICS_ENGINE_SNAPSHOT_VERSION,
  PhysicsEngine,
} from '../../src/domain/hardSphere/PhysicsEngine.ts';

const params = {
  N: 32,
  r: 0.15,
  L: 8,
  m: 1,
  k: 1,
  dt: 0.02,
  nu: 0.4,
  equilibriumTime: 0.2,
  statsDuration: 0.4,
  targetTemperature: 1.2,
};

const engine = new PhysicsEngine(params);
for (let i = 0; i < 40; i += 1) {
  engine.step();
  if (engine.time >= params.equilibriumTime) engine.collectSamples();
}
engine.flushPressureMeasurement();

const snapshot = engine.createSnapshot();
assert.equal(snapshot.schemaVersion, PHYSICS_ENGINE_SNAPSHOT_VERSION);
assert.equal(snapshot.params.N, params.N);
assert.equal(snapshot.particles.length, params.N);
assert.ok(snapshot.time > 0);
assert.ok(snapshot.collectedSampleWindowTotal > 0);
assert.ok(snapshot.pressureHistory.length > 0);

const restored = PhysicsEngine.fromSnapshot(snapshot);
assert.equal(restored.time, snapshot.time);
assert.equal(restored.targetTemperature, snapshot.targetTemperature);
assert.equal(restored.particles.length, snapshot.particles.length);
assert.equal(restored.getCollectedSampleCount(), snapshot.collectedSampleWindowTotal);
assert.deepEqual(restored.getPressureMeasurementSummary(), engine.getPressureMeasurementSummary());
assert.deepEqual(restored.getStats(), engine.getStats());

restored.step();
assert.ok(restored.time > snapshot.time, 'restored engine should continue from the snapshot time');

console.log('physicsEngineSnapshot tests passed');
```

- [ ] **Step 2: Run test to verify fail**

Run:

```powershell
node tests/hardSphere/physicsEngineSnapshot.test.ts
```

Expected:

```text
Property 'createSnapshot' does not exist
```

## Task 2: Implement PhysicsEngine Snapshot

**Files:**

- Modify: `src/domain/hardSphere/PhysicsEngine.ts`
- Test: `tests/hardSphere/physicsEngineSnapshot.test.ts`

- [ ] **Step 1: Add exported constants and interface**

Add near imports:

```ts
export const PHYSICS_ENGINE_SNAPSHOT_VERSION = 1 as const;

export interface PhysicsEngineSnapshotV1 {
  schemaVersion: typeof PHYSICS_ENGINE_SNAPSHOT_VERSION;
  params: SimulationParams;
  particles: Particle[];
  time: number;
  targetTemperature: number;
  collectedSpeeds: number[];
  collectedEnergies: number[];
  collectedSampleWindowTotal: number;
  tempHistory: { time: number; error: number; totalEnergy: number }[];
  lastSampleTime: number;
  pressureWindowStartTime: number;
  pressureWindowMomentum: number;
  pressureHistory: PressureWindowPoint[];
  latestMeasuredPressure: number;
}
```

- [ ] **Step 2: Add deep-copy helpers inside `PhysicsEngine.ts`**

Use internal helpers so callers cannot mutate engine internals through snapshot references:

```ts
const cloneParams = (params: SimulationParams): SimulationParams => ({ ...params });
const cloneParticles = (particles: Particle[]): Particle[] => particles.map((particle) => ({ ...particle }));
const clonePressureHistory = (history: PressureWindowPoint[]): PressureWindowPoint[] => (
  history.map((point) => ({ ...point }))
);
```

- [ ] **Step 3: Add `createSnapshot()`**

Inside `PhysicsEngine`:

```ts
public createSnapshot(): PhysicsEngineSnapshotV1 {
  return {
    schemaVersion: PHYSICS_ENGINE_SNAPSHOT_VERSION,
    params: cloneParams(this.params),
    particles: cloneParticles(this.particles),
    time: this.time,
    targetTemperature: this.targetTemperature,
    collectedSpeeds: [...this.collectedSpeeds],
    collectedEnergies: [...this.collectedEnergies],
    collectedSampleWindowTotal: this.collectedSampleWindowTotal,
    tempHistory: this.tempHistory.map((point) => ({ ...point })),
    lastSampleTime: this.lastSampleTime,
    pressureWindowStartTime: this.pressureWindowStartTime,
    pressureWindowMomentum: this.pressureWindowMomentum,
    pressureHistory: clonePressureHistory(this.pressureHistory),
    latestMeasuredPressure: this.latestMeasuredPressure,
  };
}
```

- [ ] **Step 4: Add `fromSnapshot()`**

Inside `PhysicsEngine`:

```ts
public static fromSnapshot(snapshot: PhysicsEngineSnapshotV1): PhysicsEngine {
  const engine = new PhysicsEngine(cloneParams(snapshot.params));
  engine.params = cloneParams(snapshot.params);
  engine.particles = cloneParticles(snapshot.particles);
  engine.time = snapshot.time;
  engine.targetTemperature = snapshot.targetTemperature;
  engine.collectedSpeeds = [...snapshot.collectedSpeeds];
  engine.collectedEnergies = [...snapshot.collectedEnergies];
  engine.collectedSampleWindowTotal = snapshot.collectedSampleWindowTotal;
  engine.tempHistory = snapshot.tempHistory.map((point) => ({ ...point }));
  engine.lastSampleTime = snapshot.lastSampleTime;
  engine.pressureWindowStartTime = snapshot.pressureWindowStartTime;
  engine.pressureWindowMomentum = snapshot.pressureWindowMomentum;
  engine.pressureHistory = clonePressureHistory(snapshot.pressureHistory);
  engine.latestMeasuredPressure = snapshot.latestMeasuredPressure;
  engine.initBins();
  return engine;
}
```

- [ ] **Step 5: Run test**

Run:

```powershell
node tests/hardSphere/physicsEngineSnapshot.test.ts
```

Expected:

```text
physicsEngineSnapshot tests passed
```

## Task 3: Store Engine Snapshot In Workbench State

**Files:**

- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Test: existing build/type checks plus the persistence tests defined in Tasks 6 and 7.

- [ ] **Step 1: Extend Workbench state types**

In `workbenchState.ts`, import `PhysicsEngineSnapshotV1` as a type and add:

```ts
hardSphereEngineSnapshot: PhysicsEngineSnapshotV1 | null;
```

to both:

```ts
export interface WorkbenchStandardState extends WorkbenchFileBase
export interface WorkbenchIdealState extends WorkbenchFileBase
```

- [ ] **Step 2: Default new files to null snapshot**

In `createDefaultStandardFile()`:

```ts
hardSphereEngineSnapshot: null,
```

In `createDefaultIdealFile()`:

```ts
hardSphereEngineSnapshot: null,
```

- [ ] **Step 3: Clone snapshot in undo/redo snapshots**

In `cloneWorkbenchFiles()`, copy:

```ts
hardSphereEngineSnapshot: file.hardSphereEngineSnapshot
  ? clonePersistenceValue(file.hardSphereEngineSnapshot)
  : null,
```

If `clonePersistenceValue` is not available in this file, add a local generic clone near `cloneWorkbenchChartData`:

```ts
const cloneWorkbenchPlainValue = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => cloneWorkbenchPlainValue(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneWorkbenchPlainValue(item)]),
    ) as T;
  }
  return value;
};
```

## Task 4: Restore Standard / Ideal Runtime From Snapshot

**Files:**

- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Test: `tests/workbench/workbenchStandardPersistence.test.ts`, `tests/workbench/workbenchIdealGasPersistence.test.ts`

- [ ] **Step 1: Update runtime creation**

Change `createStandardRuntime(file)`:

```ts
const engine = file.hardSphereEngineSnapshot
  ? PhysicsEngine.fromSnapshot(file.hardSphereEngineSnapshot)
  : new PhysicsEngine(cloneParams(file.appliedParams));
```

Guard:

```ts
if (file.hardSphereEngineSnapshot && areWorkbenchParamsEqual(file.hardSphereEngineSnapshot.params, file.appliedParams)) {
  // restore from snapshot
}
```

If params do not match, ignore snapshot and create new engine.

Change `createIdealRuntime(file)` the same way, but compare snapshot params to `file.activeParams`.

- [ ] **Step 2: Update file state whenever runtime changes**

Every place that already writes `stats`, `chartData`, `particles`, or `latestPressureSummary` from `runtime.engine` must also write:

```ts
hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
```

Apply this to these flows:

- initial runtime initialization effect
- `initializeStandardOrIdealFile`
- standard frame loop
- ideal frame loop
- start run
- reset current run
- apply standard parameters
- apply ideal scan / relation parameters
- reopen closed file if runtime is rebuilt
- undo/redo restore reconciliation if runtime is rebuilt

- [ ] **Step 3: Do not update snapshot for heat capacity**

All changes must be guarded by:

```ts
if (file.kind === 'standard' || file.kind === 'ideal') { ... }
```

## Task 5: Add Shared Standard / Ideal Persistence Helpers

**Files:**

- Create: `src/features/workbench/workbenchHardSpherePersistence.ts`

- [ ] **Step 1: Add common clone and validation helpers**

Create:

```ts
import type {
  ChartData,
  Particle,
  PressureMeasurementSummary,
  SimulationParams,
  SimulationStats,
} from '../../shared/types.ts';
import {
  PHYSICS_ENGINE_SNAPSHOT_VERSION,
  type PhysicsEngineSnapshotV1,
} from '../../domain/hardSphere/PhysicsEngine.ts';

export const clonePersistenceValue = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => clonePersistenceValue(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePersistenceValue(item)]),
    ) as T;
  }
  return value;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

export const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);
```

- [ ] **Step 2: Add narrow validators**

Add validators for:

- `SimulationParams`
- `Particle[]`
- `SimulationStats`
- `ChartData`
- `PressureMeasurementSummary | null`
- `PhysicsEngineSnapshotV1 | null`

Validation must be narrow enough to reject invalid payloads but not so strict that older numeric arrays become unreadable.

Key rule for `PhysicsEngineSnapshotV1`:

```ts
snapshot.schemaVersion === PHYSICS_ENGINE_SNAPSHOT_VERSION
```

and:

```ts
snapshot.params.N === snapshot.particles.length
```

If this relation fails, treat the snapshot as invalid and restore runtime from parameters instead.

## Task 6: Add Standard Persistence Adapter

**Files:**

- Create: `src/features/workbench/workbenchStandardPersistence.ts`
- Test: `tests/workbench/workbenchStandardPersistence.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/workbench/workbenchStandardPersistence.test.ts`:

```ts
import assert from 'node:assert/strict';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchState.ts';
import {
  STANDARD_SIMULATION_SCHEMA_VERSION,
  createStandardPersistencePayload,
  restoreStandardFileFromPersistencePayload,
  validateStandardPersistencePayload,
} from '../../src/features/workbench/workbenchStandardPersistence.ts';

const file = createDefaultStandardFile(3);
const engine = new PhysicsEngine(file.appliedParams);
for (let index = 0; index < 30; index += 1) {
  engine.step();
  if (engine.time >= file.appliedParams.equilibriumTime) engine.collectSamples();
}
const snapshot = engine.createSnapshot();
const sourceFile = {
  ...file,
  visiblePanels: ['preview', 'realtime', 'results'] as const,
  runState: 'paused' as const,
  stats: engine.getStats(),
  chartData: engine.getHistogramData(false),
  finalChartData: engine.getHistogramData(true),
  particles: engine.particles.map((particle) => ({ ...particle })),
  hardSphereEngineSnapshot: snapshot,
  standardResultsLayout: {
    openTabs: ['summary', 'figures'] as const,
    activeTab: 'figures' as const,
    heightRatio: 0.63,
  },
};

const payload = createStandardPersistencePayload(sourceFile, 1710000000000);
assert.equal(payload.experimentKind, 'standard');
assert.equal(payload.standardSchemaVersion, STANDARD_SIMULATION_SCHEMA_VERSION);
assert.equal(payload.runtime.engineSnapshot?.time, snapshot.time);
assert.equal(validateStandardPersistencePayload(payload).valid, true);

const restored = restoreStandardFileFromPersistencePayload({
  schemaFamily: 'hard-sphere-lab.experiment-file',
  fileSchemaVersion: 1,
  id: sourceFile.id,
  kind: 'standard',
  name: sourceFile.name,
  createdAt: sourceFile.createdAt,
  updatedAt: sourceFile.updatedAt,
  lastOpenedAt: sourceFile.lastOpenedAt,
  layout: {
    visiblePanels: sourceFile.visiblePanels,
    liveWorkspaceSplitRatio: sourceFile.liveWorkspaceSplitRatio,
    standardResultsLayout: sourceFile.standardResultsLayout,
  },
  payload,
}, payload, 3);

assert.equal(restored.kind, 'standard');
assert.equal(restored.finalChartData?.speed.length, sourceFile.finalChartData.speed.length);
assert.equal(restored.standardResultsLayout.activeTab, 'figures');
assert.equal(restored.hardSphereEngineSnapshot?.collectedSampleWindowTotal, snapshot.collectedSampleWindowTotal);

console.log('workbenchStandardPersistence tests passed');
```

- [ ] **Step 2: Implement adapter exports**

Implement:

```ts
export const STANDARD_SIMULATION_SCHEMA_VERSION = 1 as const;
export const STANDARD_SIMULATION_MODEL_VERSION = 'hard-sphere-standard-v1' as const;

export const createStandardPersistencePayload = (
  file: WorkbenchStandardState,
  savedAt: number,
): WorkbenchStandardPersistencePayloadV1 => { ... };

export const validateStandardPersistencePayload = (
  payload: unknown,
): { valid: boolean; errors: string[] } => { ... };

export const restoreStandardFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchStandardState => { ... };
```

Restore rules:

- Use `createDefaultStandardFile(index)` as fallback.
- Envelope id/name/timestamps override payload identity.
- Envelope layout overrides payload `uiReplay` if both exist.
- `runState: 'running'` must restore as `'paused'`.
- Invalid or missing `engineSnapshot` restores as `null`, not as a fabricated snapshot.

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/workbench/workbenchStandardPersistence.test.ts
```

Expected:

```text
workbenchStandardPersistence tests passed
```

## Task 7: Add Ideal Gas Persistence Adapter

**Files:**

- Create: `src/features/workbench/workbenchIdealGasPersistence.ts`
- Test: `tests/workbench/workbenchIdealGasPersistence.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/workbench/workbenchIdealGasPersistence.test.ts`:

```ts
import assert from 'node:assert/strict';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import { createDefaultIdealFile } from '../../src/features/workbench/workbenchState.ts';
import {
  IDEAL_GAS_SCHEMA_VERSION,
  createIdealGasPersistencePayload,
  restoreIdealGasFileFromPersistencePayload,
  validateIdealGasPersistencePayload,
} from '../../src/features/workbench/workbenchIdealGasPersistence.ts';

const file = createDefaultIdealFile(4);
const activeParams = { ...file.activeParams, targetTemperature: 1.4 };
const engine = new PhysicsEngine(activeParams);
for (let index = 0; index < 80; index += 1) {
  engine.step();
  if (engine.time >= activeParams.equilibriumTime) engine.collectSamples();
}
engine.flushPressureMeasurement();
const snapshot = engine.createSnapshot();
const summary = engine.getPressureMeasurementSummary();
const sourceFile = {
  ...file,
  relation: 'pv' as const,
  activeParams,
  visiblePanels: ['preview', 'realtime', 'results'] as const,
  runState: 'paused' as const,
  stats: engine.getStats(),
  chartData: engine.getHistogramData(false),
  finalChartData: engine.getHistogramData(true),
  particles: engine.particles.map((particle) => ({ ...particle })),
  hardSphereEngineSnapshot: snapshot,
  latestPressureSummary: summary,
  pointsByRelation: {
    ...file.pointsByRelation,
    pv: [{
      id: 'pv-point-1',
      relation: 'pv' as const,
      targetTemperature: 1.4,
      meanTemperature: summary.meanTemperature ?? 1.4,
      meanPressure: summary.meanPressure ?? 0.01,
      idealPressure: summary.meanIdealPressure ?? 0.01,
      relativeGap: summary.relativeGap ?? 0,
      timestamp: 1710000000000,
      boxLength: activeParams.L,
      volume: activeParams.L ** 3,
      inverseVolume: 1 / (activeParams.L ** 3),
      particleCount: null,
    }],
  },
  needsReset: true,
  verificationState: 'verified' as const,
  historyUnlocked: true,
  idealWindowLayout: {
    openTabs: ['verification'] as const,
    activeIdealResultTab: 'verification' as const,
    heightRatio: 0.7,
    hasCustomHeight: true,
  },
};

const payload = createIdealGasPersistencePayload(sourceFile, 1710000000000);
assert.equal(payload.experimentKind, 'ideal');
assert.equal(payload.idealGasSchemaVersion, IDEAL_GAS_SCHEMA_VERSION);
assert.equal(validateIdealGasPersistencePayload(payload).valid, true);

const restored = restoreIdealGasFileFromPersistencePayload({
  schemaFamily: 'hard-sphere-lab.experiment-file',
  fileSchemaVersion: 1,
  id: sourceFile.id,
  kind: 'ideal',
  name: sourceFile.name,
  createdAt: sourceFile.createdAt,
  updatedAt: sourceFile.updatedAt,
  lastOpenedAt: sourceFile.lastOpenedAt,
  layout: {
    visiblePanels: sourceFile.visiblePanels,
    liveWorkspaceSplitRatio: sourceFile.liveWorkspaceSplitRatio,
    idealWindowLayout: sourceFile.idealWindowLayout,
  },
  payload,
}, payload, 4);

assert.equal(restored.kind, 'ideal');
assert.equal(restored.relation, 'pv');
assert.equal(restored.pointsByRelation.pv.length, 1);
assert.equal(restored.latestPressureSummary?.sampleCount, summary.sampleCount);
assert.equal(restored.verificationState, 'verified');
assert.equal(restored.historyUnlocked, true);
assert.equal(restored.idealWindowLayout.activeIdealResultTab, 'verification');
assert.equal(restored.hardSphereEngineSnapshot?.pressureHistory.length, snapshot.pressureHistory.length);

console.log('workbenchIdealGasPersistence tests passed');
```

- [ ] **Step 2: Implement adapter exports**

Implement:

```ts
export const IDEAL_GAS_SCHEMA_VERSION = 1 as const;
export const IDEAL_GAS_MODEL_VERSION = 'hard-sphere-ideal-gas-v1' as const;

export const createIdealGasPersistencePayload = (
  file: WorkbenchIdealState,
  savedAt: number,
): WorkbenchIdealGasPersistencePayloadV1 => { ... };

export const validateIdealGasPersistencePayload = (
  payload: unknown,
): { valid: boolean; errors: string[] } => { ... };

export const restoreIdealGasFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchIdealState => { ... };
```

Restore rules:

- Use `createDefaultIdealFile(index)` as fallback.
- Envelope id/name/timestamps override payload identity.
- Envelope layout overrides payload `uiReplay` if both exist.
- `runState: 'running'` must restore as `'paused'`.
- Invalid relation restores to `'pt'`.
- `pointsByRelation` must always restore all three keys: `pt`, `pv`, `pn`.
- `latestPressureSummary.history` must retain `duration`, `measuredPressure`, `idealPressure`, and `isCollectionWindow`.
- Invalid or missing `engineSnapshot` restores as `null`.

- [ ] **Step 3: Run test**

Run:

```powershell
node tests/workbench/workbenchIdealGasPersistence.test.ts
```

Expected:

```text
workbenchIdealGasPersistence tests passed
```

## Task 8: Wire Adapters Into Session Envelope Migration

**Files:**

- Modify: `src/features/workbench/workbenchPersistenceMigration.ts`
- Test: `tests/workbench/workbenchSessionPersistence.test.ts`

- [ ] **Step 1: Replace standard / ideal encode path**

In `encodeFileEnvelope`, replace standard / ideal fallback:

```ts
file.kind === 'heatCapacity'
  ? createHeatCapacityPersistencePayload(file, savedAt)
  : {
      experimentKind: file.kind,
      runtimeState: file,
    }
```

with:

```ts
file.kind === 'heatCapacity'
  ? createHeatCapacityPersistencePayload(file, savedAt)
  : file.kind === 'standard'
    ? createStandardPersistencePayload(file, savedAt)
    : createIdealGasPersistencePayload(file, savedAt)
```

- [ ] **Step 2: Replace standard / ideal decode path**

Change `decodeFilesFromEnvelopes`:

```ts
if (fileEnvelope.kind === 'standard') {
  return [restoreStandardFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index + 1)];
}
if (fileEnvelope.kind === 'ideal') {
  return [restoreIdealGasFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index + 1)];
}
```

- [ ] **Step 3: Keep legacy fallback**

If payload is old shape:

```ts
payload.runtimeState
```

then `restoreStandardOrIdealRuntimeFile()` remains available and is used before returning empty fallback.

Rule:

- New schema path first if `standardSchemaVersion` or `idealGasSchemaVersion` exists.
- Old `runtimeState` path second.
- Invalid payload returns empty file array for that file and records diagnostic only if the caller currently supports diagnostics. Do not expand UI error handling in this batch.

- [ ] **Step 4: Extend session persistence test**

In `tests/workbench/workbenchSessionPersistence.test.ts`, add assertions:

```ts
assert.equal(envelope.files[0].payload.experimentKind, 'standard');
assert.equal(envelope.files[0].payload.standardSchemaVersion, 1);
assert.equal(envelope.files[1].payload.experimentKind, 'ideal');
assert.equal(envelope.files[1].payload.idealGasSchemaVersion, 1);
assert.equal('runtimeState' in envelope.files[0].payload, false);
assert.equal('runtimeState' in envelope.files[1].payload, false);
```

Then assert decoded files still keep existing values:

```ts
const decodedStandard = decodedEnvelope.session.files[0];
assert.equal(decodedStandard.kind, 'standard');
assert.equal(decodedStandard.finalChartData?.tempHistory.length, 1);

const decodedIdeal = decodedEnvelope.session.files[1];
assert.equal(decodedIdeal.kind, 'ideal');
assert.equal(decodedIdeal.pointsByRelation.pv.length, 1);
assert.equal(decodedIdeal.latestPressureSummary?.sampleCount, 6);
assert.equal(decodedIdeal.idealWindowLayout.activeIdealResultTab, 'verification');
```

## Task 9: Preserve Closed Files With New Payloads

**Files:**

- Modify: `tests/workbench/workbenchSessionPersistence.test.ts`
- No separate production file if Task 8 updates shared envelope path correctly.

- [ ] **Step 1: Extend closed-file test**

Add a closed files envelope that contains one standard and one ideal file:

```ts
const closedMixedEnvelope = encodeWorkbenchClosedFilesStorageEnvelope([
  restored.files[0],
  restored.files[1],
], 1002);
assert.equal(closedMixedEnvelope.files[0].payload.experimentKind, 'standard');
assert.equal(closedMixedEnvelope.files[1].payload.experimentKind, 'ideal');
assert.equal('runtimeState' in closedMixedEnvelope.files[0].payload, false);
assert.equal('runtimeState' in closedMixedEnvelope.files[1].payload, false);

const closedMixedDecoded = decodeWorkbenchClosedFilesStorageEnvelope(closedMixedEnvelope);
assert.equal(closedMixedDecoded.files.length, 2);
assert.equal(closedMixedDecoded.files[0].kind, 'standard');
assert.equal(closedMixedDecoded.files[1].kind, 'ideal');
```

- [ ] **Step 2: Run persistence test**

Run:

```powershell
node tests/workbench/workbenchSessionPersistence.test.ts
```

Expected:

```text
workbenchSessionPersistence tests passed
```

## Task 10: Verify UI Replay And Runtime Continuation

**Files:**

- Modify tests only if needed:
  - `tests/workbench/workbenchStandardResultsClosableTabs.test.ts`
  - `tests/idealGas/workbenchIdealResultsWindow.test.ts`

- [ ] **Step 1: Add static UI replay assertions if missing**

Ensure tests cover:

- Standard `standardResultsLayout.openTabs`
- Standard `standardResultsLayout.activeTab`
- Standard `standardResultsLayout.heightRatio`
- Ideal `idealWindowLayout.openTabs`
- Ideal `idealWindowLayout.activeIdealResultTab`
- Ideal `idealWindowLayout.heightRatio`
- Ideal `idealWindowLayout.hasCustomHeight`

- [ ] **Step 2: Manual browser acceptance**

After implementation, run fixed preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open:

```text
http://127.0.0.1:5174/
```

Manual check:

1. Create Standard Simulation.
2. Run until collecting or finished.
3. Open Results, switch active tab to Figures, resize results height.
4. Refresh browser.
5. Verify particles, realtime stats, result tab, result height, final charts are preserved.
6. Start again from restored state and verify sampling count does not restart from zero if a snapshot existed.
7. Create Ideal Gas Simulation.
8. Record at least one point.
9. Switch Results to Verification tab, resize result window.
10. Refresh browser.
11. Verify relation, recorded point, latest pressure summary, verification tab, result height, and pressure trace are preserved.

## Task 11: Full Verification

**Files:**

- All modified source and tests.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node tests/hardSphere/physicsEngineSnapshot.test.ts
node tests/workbench/workbenchStandardPersistence.test.ts
node tests/workbench/workbenchIdealGasPersistence.test.ts
node tests/workbench/workbenchSessionPersistence.test.ts
```

Expected:

```text
physicsEngineSnapshot tests passed
workbenchStandardPersistence tests passed
workbenchIdealGasPersistence tests passed
workbenchSessionPersistence tests passed
```

- [ ] **Step 2: Run type check**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected: exit code `0`.

- [ ] **Step 3: Run all tests**

Run:

```powershell
npm.cmd test
```

Expected: exit code `0`.

- [ ] **Step 4: Run build**

Run:

```powershell
npm.cmd run build
```

Expected: exit code `0`. Existing Vite chunk-size warning is acceptable if no new error appears.

- [ ] **Step 5: Run fixed-port preview**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected:

```text
Local: http://127.0.0.1:5174/
```

## Acceptance Criteria

Code-level acceptance:

- Standard / Ideal new persistence payloads do not contain `runtimeState`.
- Standard / Ideal payloads contain explicit schema version fields.
- Standard / Ideal payloads validate core numerical structures before restore.
- Legacy `runtimeState` envelopes still decode during development.
- Running sessions restore as paused.
- `PhysicsEngine` snapshot round-trip preserves:
  - particles
  - simulation time
  - target temperature
  - accumulated sample count
  - collected speed / energy arrays
  - temperature history
  - pressure history
  - latest measured pressure

UI acceptance:

- Reopening the app preserves Standard Simulation visible panels, realtime data, result tabs, result height, particles, charts.
- Reopening the app preserves Ideal Gas relation, active params, points, pressure summary, verification state, history unlock state, result tabs, result height, particles, charts.
- Continuing a restored Standard / Ideal run does not silently restart hidden sampling from zero when a valid engine snapshot exists.

Out-of-scope:

- No new advanced parameter UI.
- No migration promise for formal release compatibility yet.
- No physical model retuning.
- No chart smoothing or visual redesign.
- No deletion of old caches.

## Self-Review

- No unresolved placeholder remains.
- Plan covers both remaining experiments.
- Plan explicitly addresses the hidden `PhysicsEngine` state, which is the main boundary risk for “complete” persistence.
- Plan keeps current public envelope and existing heat-capacity adapter untouched.
- Plan keeps development-phase compatibility with old raw `runtimeState` envelopes.
- Plan includes focused tests, full test suite, build, and fixed-port preview acceptance.
