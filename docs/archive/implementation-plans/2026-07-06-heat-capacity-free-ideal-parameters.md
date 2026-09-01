# Free Mode Ideal Parameter State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在空气比热容比自由模式中建立“真实模拟 / 理想状态”参数状态、隔离真实与理想实验数据、同步数据与过程回顾显示，并清理旧的文件级首次确认字段。

**Architecture:** 自由模式保留一个顶层交互模式，但内部拆出参数状态、文件级确认状态、真实实验数据域和理想实验数据域。UI 只通过统一 selector 读取当前参数状态和当前显示数据域，避免真实与理想数据混排。高级参数首次确认迁移到统一 acknowledgement 对象，旧字段从主路径移除。

**Tech Stack:** TypeScript, React, Vite, existing Workbench state model, existing heat-capacity domain models, Node test scripts, Playwright smoke checks.

---

## 文件结构与职责

- Modify: `src/features/workbench/workbenchState.ts`
  - 定义自由模式参数状态、文件级确认对象、真实/理想实验数据域类型。
  - 新增切换理想状态、确认理想说明、重置当前数据域、读取当前数据域的纯状态函数。
  - 将高级参数确认迁移到统一 acknowledgement。

- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
  - 保存和恢复新的 `free.acknowledgements`、`free.parameterScheme`、`free.displayScheme`、`free.real`、`free.ideal`。
  - 删除新写入路径里的旧 `free.advancedRiskAccepted`。

- Modify: `src/features/workbench/workbenchSession.ts`
  - 会话缓存跟随新的 acknowledgement 和双数据域结构。
  - 删除会话主路径里的旧 `heatCapacityFreeAdvancedRiskAccepted` 读写。

- Create: `src/domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts`
  - 定义理想参数固定值和阶段解析规则。
  - 对外提供 `createHeatCapacityFreeIdealEffectiveConfigs(stage)` 或等价纯函数。

- Modify: `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`
  - 保持真实模拟手动参数草稿的规范化。
  - 增加对理想参数 profile 的类型衔接，不把理想值写回手动草稿。

- Modify: `src/features/heatCapacity/heatCapacityFreeParameterPanelModel.ts`
  - 增加右侧栏文案：`真实模拟`、`理想状态`、首次说明弹窗文案、锁定提示、理想状态只读说明。

- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
  - 右侧栏新增理想状态切换按钮。
  - 首次进入理想状态弹确认说明。
  - 理想状态下普通/高级参数只读。
  - 过程回顾和数据与结果切换菜单同步。

- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`
  - 新增理想状态按钮选中态、只读参数区、说明弹窗、数据/过程切换菜单样式。

- Modify: `src/features/heatCapacity/HeatCapacityLeftPanel.tsx`
  - 数据与结果页表格右侧新增真实/理想显示切换。
  - 过程回顾顶部新增同一显示切换。
  - 理想数据域下隐藏评分、操作上限和诊断评分，保留 γ、相对误差、趋势图和事件时间条。

- Modify tests:
  - `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`
  - `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
  - `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - `tests/heatCapacity/heatCapacityFreePersistence.test.ts`
  - Add if needed: `tests/heatCapacity/heatCapacityFreeIdealParameterProfile.test.ts`

---

## Task 1: 统一文件级首次确认状态

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Test: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`

- [ ] **Step 1: 写失败测试，证明新 acknowledgement 是主结构**

在 `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts` 增加断言：

```ts
assert.deepEqual(defaultFile.heatCapacityFreeFileAcknowledgements, {
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});

const acknowledgedAdvanced = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  defaultFile,
  'advancedParametersRisk',
);
assert.equal(acknowledgedAdvanced.heatCapacityFreeFileAcknowledgements.advancedParametersRisk, true);
assert.equal(acknowledgedAdvanced.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro, false);

const acknowledgedIdeal = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  defaultFile,
  'idealParameterProfileIntro',
);
assert.equal(acknowledgedIdeal.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro, true);
assert.equal(acknowledgedIdeal.heatCapacityFreeFileAcknowledgements.advancedParametersRisk, false);
```

在 `tests/heatCapacity/heatCapacityFreePersistence.test.ts` 增加断言：

```ts
const noticeFile = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(
  acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(defaultFile, 'advancedParametersRisk'),
  'idealParameterProfileIntro',
);
const noticePayload = createHeatCapacityPersistencePayload(noticeFile, 123);
assert.deepEqual(noticePayload.free?.acknowledgements, {
  advancedParametersRisk: true,
  idealParameterProfileIntro: true,
});
assert.equal('advancedRiskAccepted' in (noticePayload.free ?? {}), false);
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts
node --experimental-strip-types tests/heatCapacity/heatCapacityFreePersistence.test.ts
```

Expected: FAIL，原因是 `heatCapacityFreeFileAcknowledgements` 和 `acknowledgeHeatCapacityFreeFileNoticeWorkbenchState` 尚不存在。

- [ ] **Step 3: 新增统一 acknowledgement 类型和状态函数**

在 `src/features/workbench/workbenchState.ts` 增加：

```ts
export type HeatCapacityFreeFileNoticeKey =
  | 'advancedParametersRisk'
  | 'idealParameterProfileIntro';

export interface HeatCapacityFreeFileAcknowledgements {
  advancedParametersRisk: boolean;
  idealParameterProfileIntro: boolean;
}

export const createDefaultHeatCapacityFreeFileAcknowledgements = (): HeatCapacityFreeFileAcknowledgements => ({
  advancedParametersRisk: false,
  idealParameterProfileIntro: false,
});

export const acknowledgeHeatCapacityFreeFileNoticeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  notice: HeatCapacityFreeFileNoticeKey,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeFileAcknowledgements: {
    ...file.heatCapacityFreeFileAcknowledgements,
    [notice]: true,
  },
});
```

将 `WorkbenchHeatCapacityState` 的主字段替换为：

```ts
heatCapacityFreeFileAcknowledgements: HeatCapacityFreeFileAcknowledgements;
```

新建文件默认值使用：

```ts
heatCapacityFreeFileAcknowledgements: createDefaultHeatCapacityFreeFileAcknowledgements(),
```

- [ ] **Step 4: 迁移高级参数确认逻辑**

将高级参数 UI 读取从：

```ts
activeFile.heatCapacityFreeAdvancedRiskAccepted
```

改为：

```ts
activeFile.heatCapacityFreeFileAcknowledgements.advancedParametersRisk
```

将确认函数从旧函数改为：

```ts
acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'advancedParametersRisk')
```

删除 `acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState` 的主调用路径。后续 Task 8 删除旧函数。

- [ ] **Step 5: 更新持久化结构**

在 `src/features/workbench/workbenchHeatCapacityPersistence.ts` 的 `HeatCapacityFreePersistenceDataV1` 增加：

```ts
acknowledgements: HeatCapacityFreeFileAcknowledgements;
```

保存时写入：

```ts
acknowledgements: clonePersistenceValue(file.heatCapacityFreeFileAcknowledgements),
```

恢复时读取：

```ts
heatCapacityFreeFileAcknowledgements: {
  ...createDefaultHeatCapacityFreeFileAcknowledgements(),
  ...(free?.acknowledgements ?? {}),
},
```

不要再新写入 `advancedRiskAccepted`。

- [ ] **Step 6: 运行测试确认通过**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts
node --experimental-strip-types tests/heatCapacity/heatCapacityFreePersistence.test.ts
```

Expected: PASS。

---

## Task 2: 建立自由模式参数状态和理想参数 profile

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts`
- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/heatCapacityFreeIdealParameterProfile.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`

- [ ] **Step 1: 写失败测试，定义理想参数语义**

创建 `tests/heatCapacity/heatCapacityFreeIdealParameterProfile.test.ts`：

```ts
import assert from 'node:assert/strict';
import {
  createHeatCapacityFreeIdealEffectiveConfigs,
} from '../../src/domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts';

const pumpConfig = createHeatCapacityFreeIdealEffectiveConfigs('fastAdiabatic');
assert.equal(pumpConfig.environment.ambientPressureKPa, 101.3);
assert.equal(pumpConfig.environment.ambientTemperatureK, 298.15);
assert.equal(pumpConfig.physics.gamma, 1.4);
assert.equal(pumpConfig.physics.leakage.enabled, false);
assert.equal(pumpConfig.sensor.noiseMv, 0);
assert.equal(pumpConfig.instrumentNoiseEnabled, false);
assert.equal(pumpConfig.thermalMode, 'adiabatic');

const stabilizeConfig = createHeatCapacityFreeIdealEffectiveConfigs('thermalEquilibrium');
assert.equal(stabilizeConfig.thermalMode, 'full-exchange');
assert.equal(stabilizeConfig.physics.leakage.enabled, false);
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/heatCapacityFreeIdealParameterProfile.test.ts
```

Expected: FAIL，原因是文件和函数不存在。

- [ ] **Step 3: 实现理想参数 profile**

创建 `src/domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts`：

```ts
import {
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeRecordConfig,
  createDefaultHeatCapacityFreeSensorConfig,
} from './heatCapacityDefaultConfig.ts';
import type {
  HeatCapacityFreePhysicsConfig,
} from './heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeSensorConfig,
} from './heatCapacityFreeSensorModel.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from './heatCapacityFreeRecordModel.ts';

export type HeatCapacityFreeIdealStage =
  | 'fastAdiabatic'
  | 'thermalEquilibrium';

export interface HeatCapacityFreeIdealEffectiveConfigs {
  environment: {
    ambientPressureKPa: 101.3;
    ambientTemperatureK: 298.15;
  };
  physics: HeatCapacityFreePhysicsConfig;
  sensor: HeatCapacityFreeSensorConfig;
  record: HeatCapacityFreeRecordConfig;
  pressureWarningMv: 120;
  instrumentNoiseEnabled: false;
  thermalMode: 'adiabatic' | 'full-exchange';
}

export const createHeatCapacityFreeIdealEffectiveConfigs = (
  stage: HeatCapacityFreeIdealStage,
): HeatCapacityFreeIdealEffectiveConfigs => {
  const physics = createDefaultHeatCapacityFreePhysicsConfig();
  const sensor = createDefaultHeatCapacityFreeSensorConfig();
  const record = createDefaultHeatCapacityFreeRecordConfig();
  return {
    environment: {
      ambientPressureKPa: 101.3,
      ambientTemperatureK: 298.15,
    },
    physics: {
      ...physics,
      environment: {
        ambientPressureKPa: 101.3,
        ambientTemperatureK: 298.15,
      },
      gamma: 1.4,
      leakage: {
        ...physics.leakage,
        enabled: false,
        ratePerS: 0,
      },
      thermal: {
        ...physics.thermal,
        gasWallConductanceWPerK: stage === 'thermalEquilibrium' ? 999 : 0,
        wallAmbientConductanceWPerK: stage === 'thermalEquilibrium' ? 999 : 0,
      },
      environmentDisturbance: {
        ...physics.environmentDisturbance,
        enabled: false,
      },
    },
    sensor: {
      ...sensor,
      noiseMv: 0,
      lagRate: 60,
      pressureNonlinearity: {
        ...sensor.pressureNonlinearity,
        enabled: false,
      },
    },
    record,
    pressureWarningMv: 120,
    instrumentNoiseEnabled: false,
    thermalMode: stage === 'thermalEquilibrium' ? 'full-exchange' : 'adiabatic',
  };
};
```

Implementation note: 如果现有 `environmentDisturbance` 或 `pressureNonlinearity` 字段名与实际类型不同，以实际类型为准，但测试语义不变。

- [ ] **Step 4: 新增参数状态字段**

在 `src/features/workbench/workbenchState.ts` 增加：

```ts
export type HeatCapacityFreeParameterScheme = 'real' | 'ideal';
export type HeatCapacityFreeDisplayScheme = HeatCapacityFreeParameterScheme;
```

在 `WorkbenchHeatCapacityState` 增加：

```ts
heatCapacityFreeParameterScheme: HeatCapacityFreeParameterScheme;
heatCapacityFreeDisplayScheme: HeatCapacityFreeDisplayScheme;
```

默认值：

```ts
heatCapacityFreeParameterScheme: 'real',
heatCapacityFreeDisplayScheme: 'real',
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/heatCapacityFreeIdealParameterProfile.test.ts
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts
```

Expected: PASS。

---

## Task 3: 拆分真实/理想实验数据域

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`

- [ ] **Step 1: 写失败测试，证明真实和理想数据独立编号与存储**

在 `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts` 增加：

```ts
const dualDomainFile = createDefaultHeatCapacityFile(101);
assert.equal(dualDomainFile.heatCapacityFreeRealDomain.trials.length, 0);
assert.equal(dualDomainFile.heatCapacityFreeIdealDomain.trials.length, 0);

const idealSelected = setHeatCapacityFreeParameterSchemeWorkbenchState(dualDomainFile, 'ideal', 1_000);
assert.equal(idealSelected.heatCapacityFreeParameterScheme, 'ideal');
assert.equal(selectActiveHeatCapacityFreeDomain(idealSelected).scheme, 'ideal');

const realSelectedAgain = setHeatCapacityFreeParameterSchemeWorkbenchState(idealSelected, 'real', 1_100);
assert.equal(realSelectedAgain.heatCapacityFreeParameterScheme, 'real');
assert.equal(selectActiveHeatCapacityFreeDomain(realSelectedAgain).scheme, 'real');
assert.equal(realSelectedAgain.heatCapacityFreeIdealDomain.trials.length, 0);
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
```

Expected: FAIL，原因是双数据域类型和 selector 不存在。

- [ ] **Step 3: 定义数据域类型**

在 `src/features/workbench/workbenchState.ts` 增加：

```ts
export interface HeatCapacityFreeExperimentDomainState {
  scheme: HeatCapacityFreeParameterScheme;
  experimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
  activeRunConfigSnapshot: HeatCapacityFreeTraceTrial['configSnapshot'] | null;
  physicsConfig: HeatCapacityFreePhysicsConfig;
  physicsState: HeatCapacityFreePhysicsState;
  sensorConfig: HeatCapacityFreeSensorConfig;
  sensorState: HeatCapacityFreeSensorState;
  calibrationState: HeatCapacityFreeCalibrationState;
  stopcockFlowOpen: boolean;
  stopcockPendingOpenAtMs: number | null;
  stopcockFlowPurpose: WorkbenchHeatCapacityFreeStopcockFlowPurpose;
  rollbackSnapshots: HeatCapacityFreeRollbackSnapshots;
  traceStore: HeatCapacityFreeTraceStore;
  trials: HeatCapacityFreeTrial[];
}
```

在 `WorkbenchHeatCapacityState` 增加：

```ts
heatCapacityFreeRealDomain: HeatCapacityFreeExperimentDomainState;
heatCapacityFreeIdealDomain: HeatCapacityFreeExperimentDomainState;
```

保留旧字段只作为迁移期间临时桥接；Task 8 删除旧字段主路径。

- [ ] **Step 4: 新增 domain selector**

在 `workbenchState.ts` 增加：

```ts
export const selectHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeExperimentDomainState => (
  scheme === 'ideal' ? file.heatCapacityFreeIdealDomain : file.heatCapacityFreeRealDomain
);

export const selectActiveHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => (
  selectHeatCapacityFreeDomain(file, file.heatCapacityFreeParameterScheme)
);

export const selectDisplayedHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => (
  selectHeatCapacityFreeDomain(file, file.heatCapacityFreeDisplayScheme)
);
```

- [ ] **Step 5: 新增切换函数**

在 `workbenchState.ts` 增加：

```ts
export const setHeatCapacityFreeParameterSchemeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  if (isHeatCapacityFreeExperimentStarted(file)) return file;
  return {
    ...file,
    heatCapacityFreeParameterScheme: scheme,
    heatCapacityFreeDisplayScheme: scheme,
    updatedAt: now,
  };
};

export const setHeatCapacityFreeDisplaySchemeWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeDisplayScheme,
  now = Date.now(),
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeDisplayScheme: scheme,
  updatedAt: now,
});
```

- [ ] **Step 6: 持久化双数据域**

在 `workbenchHeatCapacityPersistence.ts` 的 `free` payload 增加：

```ts
parameterScheme: file.heatCapacityFreeParameterScheme,
displayScheme: file.heatCapacityFreeDisplayScheme,
real: clonePersistenceValue(file.heatCapacityFreeRealDomain),
ideal: clonePersistenceValue(file.heatCapacityFreeIdealDomain),
```

恢复时如果没有 `real` 和 `ideal`，用默认 domain 构造函数补齐。

- [ ] **Step 7: 运行测试确认通过**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
node --experimental-strip-types tests/heatCapacity/heatCapacityFreePersistence.test.ts
```

Expected: PASS。

---

## Task 4: 将自由模式操作写入当前数据域

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`

- [ ] **Step 1: 写失败测试，理想状态操作只改变理想域**

在 `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts` 增加：

```ts
const idealRuntimeFile = setHeatCapacityFreeParameterSchemeWorkbenchState(
  createDefaultHeatCapacityFile(202),
  'ideal',
  2_000,
);
const poweredIdeal = powerHeatCapacityWorkbenchFile(idealRuntimeFile, true, 2_100);
assert.equal(poweredIdeal.heatCapacityFreeParameterScheme, 'ideal');
assert.equal(poweredIdeal.heatCapacityFreeRealDomain.physicsState.simulationTimeS, 0);
assert.ok(poweredIdeal.heatCapacityFreeIdealDomain.physicsState.simulationTimeS >= 0);
assert.equal(isHeatCapacityFreeExperimentStarted(poweredIdeal), true);

const switchBackAttempt = setHeatCapacityFreeParameterSchemeWorkbenchState(poweredIdeal, 'real', 2_200);
assert.equal(switchBackAttempt.heatCapacityFreeParameterScheme, 'ideal');
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
```

Expected: FAIL，原因是操作仍然写旧单域字段。

- [ ] **Step 3: 新增 started 判定**

在 `workbenchState.ts` 增加：

```ts
export const isHeatCapacityFreeExperimentStarted = (
  file: WorkbenchHeatCapacityState,
): boolean => {
  const domain = selectActiveHeatCapacityFreeDomain(file);
  return file.powerOn ||
    file.pumpValveOpen ||
    file.glassPistonState === 'open' ||
    file.pressureZeroed ||
    file.pumpBulbState === 'pressed' ||
    domain.trials.length > 0 ||
    domain.traceStore.traceTrials.length > 0 ||
    domain.physicsState.pumpStrokeCount > 0;
};
```

- [ ] **Step 4: 改写自由模式操作入口**

把下列函数内部对 `heatCapacityFreePhysicsState`、`heatCapacityFreeSensorState`、`heatCapacityFreeTrials`、`heatCapacityFreeTraceStore`、`heatCapacityFreeCalibrationState` 的读写，改为先取 active domain，再写回同一 domain：

```ts
selectActiveHeatCapacityFreeDomain(file)
```

涉及函数包括：

```ts
powerHeatCapacityWorkbenchFile
stepHeatCapacityWorkbenchFile
applyHeatCapacityFreePumpStrokeWorkbenchState
applyHeatCapacityFreeRecordWorkbenchState
resetHeatCapacityFreeRunWorkbenchState
prepareNextHeatCapacityFreeExperimentGroupWorkbenchState
recordHeatCapacityFreeTraceEvent
```

写回使用一个 helper：

```ts
const updateActiveHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
  update: (domain: HeatCapacityFreeExperimentDomainState) => HeatCapacityFreeExperimentDomainState,
): WorkbenchHeatCapacityState => (
  file.heatCapacityFreeParameterScheme === 'ideal'
    ? { ...file, heatCapacityFreeIdealDomain: update(file.heatCapacityFreeIdealDomain) }
    : { ...file, heatCapacityFreeRealDomain: update(file.heatCapacityFreeRealDomain) }
);
```

- [ ] **Step 5: 运行相关记录和仪器测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts
```

Expected: PASS。

---

## Task 5: 右侧参数栏 UI 与首次说明弹窗

**Files:**
- Modify: `src/features/heatCapacity/heatCapacityFreeParameterPanelModel.ts`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: 写失败测试，锁定 UI 结构和文案**

在 `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts` 增加断言：

```ts
assert.match(workbenchSource, /studio-heat-free-scheme-button/, 'Free parameter rail should render a real-or-ideal scheme toggle button');
assert.match(workbenchSource, /renderHeatCapacityIdealProfileIntroDialog/, 'first ideal profile activation should render a centered introduction confirmation');
assert.match(freeParameterPanelModelSource, /idealProfileIntroTitle:[\s\S]*idealProfileIntroBody:[\s\S]*confirmEnableIdealProfile:/, 'ideal profile introduction copy should live in shared free parameter copy');
assert.match(styleSource, /\.studio-heat-free-scheme-button-active[\s\S]*box-shadow:/, 'ideal scheme toggle should have a visible selected glow');
assert.match(styleSource, /\.studio-heat-free-params\.is-ideal-readonly[\s\S]*opacity:/, 'ideal scheme should visibly grey out editable parameters');
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 增加文案**

在 `heatCapacityFreeParameterPanelModel.ts` 的 `heatCapacityFreeSharedText` 增加：

```ts
realSimulation: {
  'zh-CN': '真实模拟',
  'zh-TW': '真實模擬',
  en: 'Real Simulation',
},
idealProfile: {
  'zh-CN': '理想状态',
  'zh-TW': '理想狀態',
  en: 'Ideal State',
},
idealProfileIntroTitle: {
  'zh-CN': '确认开启理想状态',
  'zh-TW': '確認開啟理想狀態',
  en: 'Enable Ideal State',
},
idealProfileIntroBody: {
  'zh-CN': '理想状态用于体验完全理想条件下的空气比热容比实验流程。开启后，普通参数和高级参数由系统按理想过程自动设定，暂不可编辑。如需回到真实模拟，再次点击此按钮即可。',
  'zh-TW': '理想狀態用於體驗完全理想條件下的空氣比熱容比實驗流程。開啟後，普通參數和進階參數由系統按理想過程自動設定，暫不可編輯。如需回到真實模擬，再次點擊此按鈕即可。',
  en: 'Ideal State lets you experience the heat-capacity ratio experiment under fully idealized conditions. Basic and advanced parameters are set automatically by the ideal process and cannot be edited. Click this button again to return to Real Simulation.',
},
confirmEnableIdealProfile: {
  'zh-CN': '确认开启',
  'zh-TW': '確認開啟',
  en: 'Enable',
},
```

- [ ] **Step 4: 实现按钮和首次弹窗**

在 `WorkbenchStudioPrototype.tsx` 增加本地弹窗状态：

```ts
const [heatCapacityIdealIntroOpen, setHeatCapacityIdealIntroOpen] = useState(false);
```

点击理想按钮时：

```ts
const requestToggleHeatCapacityFreeParameterScheme = () => {
  if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
  if (isHeatCapacityFreeExperimentStarted(activeFile)) {
    setScanInputToast('实验开始后不能切换参数状态。');
    return;
  }
  if (activeFile.heatCapacityFreeParameterScheme === 'ideal') {
    updateActiveFile((file) => setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'real'));
    return;
  }
  if (!activeFile.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro) {
    setHeatCapacityIdealIntroOpen(true);
    return;
  }
  updateActiveFile((file) => setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'ideal'));
};
```

取消弹窗时也记录 acknowledgement：

```ts
const cancelHeatCapacityIdealIntro = () => {
  updateActiveFile((file) => acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'idealParameterProfileIntro'));
  setHeatCapacityIdealIntroOpen(false);
};
```

确认弹窗时记录 acknowledgement 并切换：

```ts
const confirmHeatCapacityIdealIntro = () => {
  updateActiveFile((file) => (
    setHeatCapacityFreeParameterSchemeWorkbenchState(
      acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'idealParameterProfileIntro'),
      'ideal',
    )
  ));
  setHeatCapacityIdealIntroOpen(false);
};
```

- [ ] **Step 5: 参数区只读**

右侧参数区 class 增加：

```tsx
activeFile.heatCapacityFreeParameterScheme === 'ideal' ? 'is-ideal-readonly' : ''
```

所有输入 disable 条件增加：

```ts
activeFile.heatCapacityFreeParameterScheme === 'ideal'
```

高级参数弹窗可以打开，但输入和保存按钮只读/禁用，并显示理想状态说明。

- [ ] **Step 6: 样式**

新增：

```css
.studio-heat-free-scheme-button-active {
  border-color: rgba(34, 211, 238, 0.72);
  background: rgba(8, 145, 178, 0.28);
  color: #e0faff;
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.24), 0 0 18px rgba(34, 211, 238, 0.18);
}

.studio-heat-free-params.is-ideal-readonly .studio-heat-free-param-row,
.studio-heat-free-params.is-ideal-readonly .studio-heat-free-default-row {
  opacity: 0.55;
}
```

- [ ] **Step 7: 运行 UI 测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS。

---

## Task 6: 左侧栏数据与过程回顾显示切换

**Files:**
- Modify: `src/features/heatCapacity/HeatCapacityLeftPanel.tsx`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`
- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
- Test: `tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts`

- [ ] **Step 1: 写失败测试，要求两个位置共享 display scheme**

在 `workbenchHeatCapacityInstrumentUi.test.ts` 增加：

```ts
assert.match(leftPanelSource, /heatCapacityFreeDisplayScheme/, 'left panel should receive the shared real-or-ideal display scheme');
assert.match(leftPanelSource, /studio-heat-free-display-scheme-select/, 'data/results and review panels should render a scheme selector');
assert.match(leftPanelSource, /理想实验条件不参与评分。/, 'ideal process review should explain why scoring is omitted');
assert.match(leftPanelSource, /operationScore[\s\S]*--/, 'ideal process review should render scoring as placeholders');
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 传入显示状态和切换回调**

`WorkbenchStudioPrototype.tsx` 调用左侧面板时传入：

```tsx
heatCapacityFreeDisplayScheme={activeFile.heatCapacityFreeDisplayScheme}
onHeatCapacityFreeDisplaySchemeChange={(scheme) => {
  updateActiveFile((file) => setHeatCapacityFreeDisplaySchemeWorkbenchState(file, scheme));
}}
```

- [ ] **Step 4: 数据与结果页表格右侧加切换菜单**

在 `HeatCapacityLeftPanel.tsx` 的数据与结果页表格头部右侧加入：

```tsx
<select
  className="studio-heat-free-display-scheme-select"
  value={heatCapacityFreeDisplayScheme}
  onChange={(event) => onHeatCapacityFreeDisplaySchemeChange(event.target.value as HeatCapacityFreeDisplayScheme)}
>
  <option value="real">真实模拟</option>
  <option value="ideal">理想状态</option>
</select>
```

表格数据源从 `selectDisplayedHeatCapacityFreeDomain(file).trials` 读取，编号用显示数组 index + 1。

- [ ] **Step 5: 过程回顾页顶部加同一切换菜单**

过程回顾页顶部使用同一个 select 和同一个回调。

理想状态显示规则：

```tsx
const isIdealReview = heatCapacityFreeDisplayScheme === 'ideal';
```

评分相关位置：

```tsx
{isIdealReview ? '--' : formatScore(score)}
```

说明：

```tsx
{isIdealReview ? <p>理想实验条件不参与评分。</p> : null}
```

- [ ] **Step 6: 运行 UI 测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS。

---

## Task 7: 理想实验计算、平均值隔离和重置规则

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeRecordModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeRecordModel.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`

- [ ] **Step 1: 写失败测试，理想组不参与真实平均和评分**

在 `workbenchHeatCapacityFreeRecordAttempt.test.ts` 增加：

```ts
const mixedFile = createDefaultHeatCapacityFile(303);
const idealFile = setHeatCapacityFreeParameterSchemeWorkbenchState(mixedFile, 'ideal', 3_000);
assert.equal(selectDisplayedHeatCapacityFreeDomain(idealFile).scheme, 'ideal');
assert.equal(getHeatCapacityFreeTrialsForAverage(idealFile).every((trial) => trial.parameterScheme !== 'ideal'), true);
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 记录 trial 的参数状态**

在 `HeatCapacityFreeTrial` 或创建 trial 的输入中加入：

```ts
parameterScheme: HeatCapacityFreeParameterScheme;
```

真实 trial 写 `real`，理想 trial 写 `ideal`。

- [ ] **Step 4: 平均值 selector 只读真实域**

在 `workbenchState.ts` 增加：

```ts
export const getHeatCapacityFreeTrialsForAverage = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeTrial[] => (
  file.heatCapacityFreeRealDomain.trials
);
```

所有平均值计算入口改为该 selector。

- [ ] **Step 5: 重置只重置当前 domain**

`resetHeatCapacityFreeRunWorkbenchState(file)` 改为：

```ts
const activeScheme = file.heatCapacityFreeParameterScheme;
return updateActiveHeatCapacityFreeDomain(file, (domain) => createDefaultHeatCapacityFreeDomainState(activeScheme, file));
```

并保持：

```ts
heatCapacityFreeParameterScheme: activeScheme
```

- [ ] **Step 6: 运行记录和过程测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts
node --experimental-strip-types tests/heatCapacity/heatCapacityFreeRecordModel.test.ts
node --experimental-strip-types tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

Expected: PASS。

---

## Task 8: 删除旧主路径字段并收敛污染内容

**Files:**
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Modify: `tests/heatCapacity/*`

- [ ] **Step 1: 全局搜索旧字段**

Run:

```powershell
rg -n "heatCapacityFreeAdvancedRiskAccepted|advancedRiskAccepted" src tests
```

Expected before cleanup: only迁移兼容读取或测试中出现。

- [ ] **Step 2: 删除旧主路径**

删除：

```ts
heatCapacityFreeAdvancedRiskAccepted
acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState
free.advancedRiskAccepted 新写入
```

如果为了读取旧文件临时保留兼容读取，只允许出现在 `restoreHeatCapacityFileFromPersistencePayload` 的局部迁移代码中，且不写回新 payload。

- [ ] **Step 3: 更新测试断言**

旧断言：

```ts
assert.equal(restored.heatCapacityFreeAdvancedRiskAccepted, true);
```

改为：

```ts
assert.equal(restored.heatCapacityFreeFileAcknowledgements.advancedParametersRisk, true);
```

- [ ] **Step 4: 再次搜索确认无主路径污染**

Run:

```powershell
rg -n "heatCapacityFreeAdvancedRiskAccepted|advancedRiskAccepted" src tests
```

Expected: 没有结果，或仅有 `legacyAdvancedRiskAccepted` 这种局部恢复变量。如果保留局部变量，必须在注释中说明只用于一次性读取旧 payload。

---

## Task 9: 全量验证和浏览器冒烟测试

**Files:**
- No production file changes expected.

- [ ] **Step 1: 运行核心测试**

Run:

```powershell
node --experimental-strip-types tests/heatCapacity/heatCapacityFreeIdealParameterProfile.test.ts
node --experimental-strip-types tests/heatCapacity/heatCapacityFreePersistence.test.ts
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityFreeRecordAttempt.test.ts
node --experimental-strip-types tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: all PASS。

- [ ] **Step 2: 运行完整检查**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
git diff --check
```

Expected:
- TypeScript exits 0.
- `npm.cmd test` reports all test files passed.
- `git diff --check` exits 0.

- [ ] **Step 3: 固定端口预览**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open:

```text
http://127.0.0.1:5174/
```

- [ ] **Step 4: Playwright 冒烟测试**

Browser flow:

1. 新建空气比热容比实验文件。
2. 打开右侧当前参数栏。
3. 点击 `真实模拟` 按钮。
4. 第一次弹出理想状态说明。
5. 点击 `取消`，按钮仍为 `真实模拟`，再次点击不再弹说明，直接切到 `理想状态`。
6. 理想状态下参数区灰显、输入不可编辑、恢复默认不可用。
7. 再次点击 `理想状态`，切回 `真实模拟`，参数区恢复可编辑。
8. 再切到 `理想状态`，开电源后尝试切回真实模拟，出现提示且仍保持理想状态。
9. 理想状态下点自由模式重置，仍保持理想状态。
10. 完成一组理想实验后，数据与结果切到理想状态显示理想第 1 组；过程回顾同步显示理想第 1 组。
11. 再切真实模拟，真实列表仍从第 1 组编号，不混入理想组。

Expected: 所有步骤符合预期。

- [ ] **Step 5: 最终污染检查**

Run:

```powershell
rg -n "heatCapacityFreeAdvancedRiskAccepted|advancedRiskAccepted" src tests
rg -n "idealParameterProfileIntro|advancedParametersRisk" src tests
```

Expected:
- 旧字段无主路径残留。
- 新 acknowledgement 字段集中出现在 workbench state、persistence、session、UI 和 tests。

---

## 审核点

- 这个计划会重建自由模式的一部分底层数据结构，改动面较大。实施时必须按任务顺序执行，每个任务完成后跑该任务列出的测试。
- 旧字段 `heatCapacityFreeAdvancedRiskAccepted` 不允许作为新主路径保留。
- 理想状态的核心边界是：右侧栏参数状态，不是顶层实验模式。
- 理想实验组必须与真实实验组隔离存储、隔离编号、隔离平均值和评分。
- 最终必须跑完整验证，包括 `npm.cmd exec tsc -- --noEmit`、`npm.cmd test`、`git diff --check` 和浏览器冒烟测试。
