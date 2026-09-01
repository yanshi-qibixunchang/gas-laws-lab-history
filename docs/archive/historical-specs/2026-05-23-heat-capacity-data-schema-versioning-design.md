# 热容实验数据格式与版本兼容方案

状态：待审核方案，不是实施记录。

本文目标是先固化实验数据的保存、加载、版本迁移和校验规则。后续“哪些参数在主界面可调、哪些在高级设置可调、哪些隐藏”不在本轮决定，但本轮必须保证所有会影响实验结果的参数都有稳定保存位置和配置快照。

## 1. 已确认事实

当前代码已经存在以下版本与持久化事实：

- Workbench 会话版本：`WORKBENCH_SESSION_VERSION = 1`。
- Workbench 会话存储键：`hsl_workbench_session_v1`。
- 已关闭文件存储键：`hsl_workbench_closed_files_v1`。
- 热容 Free Mode runtime 版本：`HEAT_CAPACITY_FREE_RUNTIME_VERSION = 4`。
- 热容 Free Mode trace 版本：`HEAT_CAPACITY_FREE_TRACE_VERSION = 3`。
- 热容 Free Mode config snapshot 版本：`HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION = 3`。
- 热容 Free Mode 计算版本：`HEAT_CAPACITY_FREE_CALCULATION_VERSION = "log-pressure-v1"`。
- 现有加载逻辑已经有 normalize 行为，但还没有形成独立、可审查、可测试的 schema/migration 契约。

这些事实来自当前代码，不是本方案新假设。

## 2. 本轮目标

本轮只解决数据结构和兼容性基础，不直接处理 UI 参数面板。

目标：

1. 明确实验文件保存时的顶层结构。
2. 明确不同实验类型共享的公共字段。
3. 明确热容 Free Mode 的配置、运行状态、记录结果、trace、参考线如何存储。
4. 明确版本号命名、递增和迁移规则。
5. 明确哪些数据可以迁移，哪些数据不能自动重算覆盖。
6. 建立集中 migration/validation 入口，禁止 UI 层零散补字段。
7. 为后续参数注册表、高级设置、标准曲线、最佳可达曲线提供稳定基础。

## 3. 不做内容

本轮不做以下内容：

- 不决定哪些参数进入主界面。
- 不决定哪些参数进入高级设置。
- 不做新的参数编辑 UI。
- 不重新调整物理模型数值。
- 不重新设计标准曲线和最佳可达曲线的视觉样式。
- 不保证兼容任意历史开发期缓存，除非你明确要求保留当前本地缓存文件。
- 不把参考曲线定义成真实世界曲线。它们只保存生成依据，真实实验参考线如果未来需要，应作为第三类参考数据单独建模。

## 4. 已确认决策

以下决策来自 2026-05-23 的用户确认，作为后续实施约束。

### 4.1 开发期与正式版兼容策略

当前仍处于开发期。

开发期规则：

- 需要时允许自动清空旧缓存。
- 需要时允许不兼容旧开发期缓存。
- 开发期缓存不纳入长期兼容承诺。
- 若实施中需要清空缓存，代码可以提供自动清空或版本失配后重建策略，不需要为当前开发期缓存写复杂迁移。

正式发布后规则：

- 从用户明确宣布的第一个正式发布版本开始，旧缓存和旧实验文件不能在没有用户要求的情况下自动清理。
- 正式发布后的旧数据要尽量兼容。
- 如果无法完整兼容，必须降级为只读、迁移警告或明确拒绝，不允许静默丢数据。

未来更高版本文件策略：

- 正式发布前：采用 A，拒绝打开未来更高版本文件。
- 正式发布后：采用 B，只读打开未来更高版本文件。

正式发布边界：

- 需要在用户宣布正式发布时写入一个明确边界，例如 `officialCompatibilityEpoch` 或等价常量。
- 在该边界之前生成的数据按开发期策略处理。
- 在该边界之后生成的数据按正式兼容策略处理。

### 4.2 参考曲线持久化策略

标准曲线和最佳可达曲线需要有持久化位置，但当前参考线逻辑尚未最终优化，因此本轮不冻结参考线算法语义。

本轮规则：

- schema 中保留 `references` 结构。
- `references` 必须能保存点集、阶段、记录点、生成配置、生成器版本和对齐方式。
- 开发期允许 reference generator 变化后清空或重建旧 reference cache。
- 正式发布后，reference generator 变化必须升级 `referenceGeneratorVersion`。
- 正式发布后的旧 reference snapshot 不能静默改写；如果需要用新逻辑重算，必须生成新 snapshot 或明确标记。

这样做的原因：

- 如果现在完全不设计 `references`，后续过程图和评价 UI 还会继续依赖临时派生数据。
- 如果现在把参考线物理逻辑冻结，会阻碍你后续重做标准曲线和最佳可达逻辑。
- 因此本轮固定存储形状和版本规则，不固定尚未完成的生成逻辑。

### 4.3 trace 压缩与 UI 复现策略

trace 是否保留原始未压缩点，不作为硬性要求。

硬性要求是：

- 再次打开后，UI 展示结果必须与保存时一致。
- 过程图可见曲线、阶段条、记录点、系统事件、评分和结果摘要必须能复现。
- 如果压缩 trace，压缩结果必须足以复现 UI。
- 如果某些 UI 结果来自派生计算，必须保存派生计算所需的输入、版本和配置快照。

### 4.4 实验类型覆盖策略

第一阶段采用：

- 公共 envelope 覆盖所有实验文件。
- 比热容比实验做完整 schema、migration、validation。
- 标准实验和理想气体实验先保持现有 payload 结构，通过公共 envelope 承载，不在第一阶段强行完整 schema 化。

原因：

- 当前最复杂、最需要长期兼容的是比热容比实验。
- 标准实验和理想气体实验涉及粒子状态、图表数据、点集分析、验证状态和历史内容，完整 schema 化会扩大第一阶段范围。
- 为保证质量，先把比热容比实验做完整，再按同一模式扩展其他实验。

## 5. 数据分类规则

实验文件中的数据必须按性质分层。后续任何 schema 都不能把这些层混在一起。

### 5.1 身份与 UI 布局数据

用途：让工作台知道这是哪个文件、叫什么、打开哪些面板。

示例字段：

- `id`
- `kind`
- `name`
- `createdAt`
- `updatedAt`
- `lastOpenedAt`
- `selectedPanel`
- `layout`
- `openTabs`

规则：

- 这类数据可以迁移、补默认值。
- 这类数据不参与物理计算。
- 这类数据不能进入 trace 的物理快照。

### 5.2 配置型数据

用途：决定模型如何运行。

示例：

- 环境参数：室温、环境气压。
- 气体/瓶体参数：`gamma`、瓶体体积。
- 打气模型参数：每次打气量、打气温升、打气过程时长。
- 放气模型参数：放气响应延迟、放气主过程时长、放气冷却因子。
- 热交换参数：气体-瓶壁导热、瓶壁-环境导热、瓶壁热容、最低气体热容。
- 微漏参数：是否开启、漏气速率。
- 传感器参数：灵敏度、滞后、噪声、量化、采样间隔。
- 评价阈值：预警线、报警线、记录稳定阈值。

规则：

- 所有影响实验结果、trace、参考曲线或评分的配置都必须保存。
- 即使参数未来不可由用户编辑，也必须保存到配置快照中。
- 可调性是后续参数注册表元数据，不是本轮 schema 的前置条件。

### 5.3 运行状态数据

用途：保存当前实验运行到哪里。

示例：

- `simulationTimeS`
- `powerOn`
- `pumpValveOpen`
- `stopcockOpen`
- `gasAmountRatio`
- `gasTemperatureK`
- `wallTemperatureK`
- `pumpProcesses`
- `releaseProcess`
- `pumpStrokeCount`
- `currentStopcockOpenDurationS`

规则：

- 这类数据可以用于恢复当前运行现场。
- 这类数据不是最终实验记录。
- reset 可以重建这类数据，但不能删除已经完成的历史记录，除非 reset 规则明确要求开始新 run。

### 5.4 记录型数据

用途：保存用户已经记录下来的实验结果。

示例：

- U0 记录。
- U1 记录。
- U2 记录。
- 由 U0/U1/U2 计算出的 `gamma`。
- 操作评分。
- 记录对应的 trace sample id、branch id、校准版本。

规则：

- 记录型数据默认不可被新模型自动重算覆盖。
- 模型升级后，旧记录仍然代表当时用户看到并确认的结果。
- 如果未来提供“按新模型重新计算”的功能，必须生成新的结果版本，不能静默覆盖旧结果。

### 5.5 过程型数据

用途：复盘实验过程、画过程图、解释记录值来源。

示例：

- trace trial。
- trace branch。
- trace sample。
- trace event。
- 阶段时间轴。
- 标准曲线和最佳可达曲线的生成快照。

规则：

- 过程型数据必须记录当时的配置快照。
- 过程图默认使用保存的 trace 采样点，不用 UI 人工重画一条脱离采样的曲线。
- 过程型数据可以压缩、降采样，但压缩规则必须有版本号。

### 5.6 UI 复现数据

用途：保证关闭后再次打开，用户看到的界面结果与保存时一致。

必须覆盖：

- 当前打开文件、当前选中面板、结果窗口 tab、热容子 tab。
- 左侧文件树展开/选中状态中会影响可见界面的字段。
- 热容材料区展开状态、结果容器高度、实时/3D 分割比例。
- 调零状态：调零旋钮角度、调零 offset、调零显示文本、调零采样窗口。
- 仪表显示状态：压力显示值、温度显示值、压力表当前显示值、压力表指针角度。
- 旋塞视觉状态：目标角度、确认接通状态、pending open 时间。
- 打气视觉状态：打气阀状态、打气球状态、最近打气时间、打气频率状态。
- 等待倍速状态：当前倍率、提示是否已显示。
- 硬球可视化设置：是否开启、粒子倍率、速度倍率、拖尾开关。
- 过程回顾 UI 所需选择：当前选中的实验组、trace branch、隐藏分支状态。

规则：

- 如果某字段只影响动画瞬间、且关闭再打开无需复现，可以不持久化。
- 如果某字段影响当前截图或用户判断，必须保存或能由保存数据确定性重建。
- 若选择“确定性重建”，必须在 schema 文档里说明输入来源和版本。

## 6. 顶层持久化结构

本方案采用统一 envelope。逻辑结构如下：

```ts
interface WorkbenchSessionV2 {
  schemaFamily: 'hard-sphere-lab.workbench-session';
  schemaVersion: 2;
  appVersion: string;
  savedAt: number;
  activeFileId: string | null;
  selectedPanel: string;
  files: WorkbenchExperimentFile[];
}
```

规则：

- `schemaFamily` 用于阻止误把其他 JSON 当作本软件文件。
- `schemaVersion` 用于决定迁移入口。
- `appVersion` 只记录保存软件版本，不替代 schema version。
- `files` 内每个文件自己带实验类型和 payload 版本。

文件 envelope：

```ts
interface WorkbenchExperimentFile {
  schemaFamily: 'hard-sphere-lab.experiment-file';
  fileSchemaVersion: 1;
  id: string;
  kind: 'standard' | 'ideal' | 'heatCapacity';
  name: string;
  createdAt: number;
  updatedAt: number;
  layout: WorkbenchFileLayoutState;
  payload: StandardPayloadV1 | IdealGasPayloadV1 | HeatCapacityPayloadV1;
}
```

规则：

- 公共字段只放身份和工作台布局。
- 实验专属字段只放进 `payload`。
- 后续新增实验类型，只新增新的 payload，不污染公共 envelope。

## 7. 热容实验 payload

热容实验采用以下结构：

```ts
interface HeatCapacityPayloadV1 {
  experimentKind: 'heatCapacity';
  heatCapacitySchemaVersion: 1;
  mode: 'free' | 'guided' | 'demo';
  common: HeatCapacityCommonDataV1;
  free: HeatCapacityFreeDataV1 | null;
  guided: HeatCapacityGuidedDataV1 | null;
  demo: HeatCapacityDemoDataV1 | null;
}
```

规则：

- `common` 放热容实验共享信息。
- `free` 放 Free Mode 专属信息。
- `guided` 和 `demo` 先保留结构位置，不要求本轮完整重构。
- 当前重点是 `free`。

### 7.1 HeatCapacityCommonDataV1

```ts
interface HeatCapacityCommonDataV1 {
  expectedTrialCount: number;
  activeTrialIndex: number;
  materialsExpanded: boolean;
  selectedHeatCapacityPanel: string;
  processing: HeatCapacityProcessingStateV1;
}
```

规则：

- 这里不放底层物理状态。
- 这里不放 Free Mode trace。

### 7.2 HeatCapacityFreeDataV1

```ts
interface HeatCapacityFreeDataV1 {
  runtimeVersion: number;
  traceVersion: number;
  calculationVersion: string;
  config: HeatCapacityFreeConfigV1;
  runtime: HeatCapacityFreeRuntimeV1;
  controls: HeatCapacityFreeControlsV1;
  sensor: HeatCapacityFreeSensorRuntimeV1;
  calibration: HeatCapacityFreeCalibrationV1;
  traceStore: HeatCapacityFreeTraceStoreV1;
  trials: HeatCapacityFreeTrialV1[];
  references: HeatCapacityReferenceStoreV1;
}
```

规则：

- `config` 是当前运行配置。
- `runtime` 是当前物理状态。
- `controls` 是用户操作状态。
- `sensor` 是显示层传感器状态。
- `calibration` 是调零状态。
- `traceStore` 是过程数据。
- `trials` 是记录结果。
- `references` 是标准曲线/最佳可达等派生参考数据。

## 8. Free Mode 配置结构

```ts
interface HeatCapacityFreeConfigV1 {
  snapshotVersion: number;
  environment: {
    ambientPressureKPa: number;
    ambientTemperatureK: number;
  };
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
  sensor: {
    pressureMvPerKPa: number;
    temperatureMvAtAmbient: number;
    temperatureMvPerK: number;
    lagRate: number;
    pumpLagRate: number;
    noiseMv: number;
    quantizationMv: number;
    minSampleIntervalS: number;
    maxSampleIntervalS: number;
    fastProcessSampleStepS: number;
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

规则：

- 当前代码里部分常量还不在 config snapshot 中，例如打气持续时间、推荐打气间隔、放气响应延迟、快速过程采样间隔。本方案要求它们进入可保存配置，避免参考线和真实 trace 使用隐式常量。
- `pressureWarningMv` 保留为预警线。
- `pressureDangerMv` 保留为报警线。
- 预警是否扣分属于 scoring 配置或评分规则，不应混入物理模型。

## 9. Free Mode 运行状态结构

```ts
interface HeatCapacityFreeRuntimeV1 {
  simulationTimeS: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  pumpProcesses: HeatCapacityFreePumpProcessV1[];
  releaseProcess: HeatCapacityFreeReleaseProcessV1 | null;
  pumpStrokeCount: number;
  maxPressureKPa: number;
  releaseStarted: boolean;
  lastStopcockOpenedAtS: number | null;
  lastStopcockClosedAtS: number | null;
  currentStopcockOpenDurationS: number;
  releaseReference: HeatCapacityFreeReleaseReferenceV1 | null;
}
```

规则：

- reset Free Mode 时，这里应回到默认状态，包含 `gasAmountRatio = 1`。
- 分子可视化数量不单独保存为物理结果，应由 `gasAmountRatio` 和视觉映射规则派生。
- 视觉映射参数如果会影响复盘截图或教学一致性，可以进入 visual config；否则不进入物理 config。

## 10. Free Mode trace schema

每个 trace trial：

```ts
interface HeatCapacityFreeTraceTrialV1 {
  id: string;
  status: 'active' | 'completed' | 'discarded';
  linkedTrialId: string | null;
  activeBranchId: string;
  nextBranchIndex: number;
  configSnapshot: HeatCapacityFreeConfigV1;
  referenceSnapshotIds: string[];
  branches: HeatCapacityFreeTraceBranchV1[];
}
```

每个 sample：

```ts
interface HeatCapacityFreeTraceSampleV1 {
  id: string;
  index: number;
  atS: number;
  reason:
    | 'periodic'
    | 'event'
    | 'record'
    | 'record-blocked'
    | 'phase-change'
    | 'reset'
    | 'heartbeat';
  phase: string;
  controls: {
    powerOn: boolean;
    stopcockOpen: boolean;
    pumpValveOpen: boolean;
    pumpBulbState: string;
    stopcockFlowOpen: boolean;
  };
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

规则：

- trace sample 必须同时保留物理层和显示层数据。
- 过程图用显示层数据画实测线，用物理层数据解释模型状态。
- 采样点不能依赖当前 UI 状态二次推导。

## 11. 记录结果 schema

```ts
interface HeatCapacityFreeTrialV1 {
  id: string;
  source: 'free';
  traceTrialId: string | null;
  branchCount: number;
  automaticU0: HeatCapacityFreeRecordV1 | null;
  u0: HeatCapacityFreeRecordV1 | null;
  u1: HeatCapacityFreeRecordV1 | null;
  u2: HeatCapacityFreeRecordV1 | null;
  correctedSignals: HeatCapacityFreeCorrectedSignalsV1 | null;
  scoring: HeatCapacityFreeScoringSnapshotV1 | null;
  blockedReason: string | null;
}
```

记录点：

```ts
interface HeatCapacityFreeRecordV1 {
  label: 'U0' | 'U1' | 'U2';
  recordedAtS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  correctedPressureMv: number;
  traceTrialId: string | null;
  traceBranchId: string | null;
  traceSampleId: string | null;
  calibrationVersion: number;
  configSnapshotVersion: number;
  calculationVersion: string;
}
```

规则：

- 已记录的 `displayPressureMv`、`displayTemperatureMv`、`correctedPressureMv` 不能被迁移自动改写。
- 迁移可以补缺失的 metadata，但不能重算用户记录值。
- 如果 `calculationVersion` 改变，新算法结果必须写入新字段或新 trial，不能覆盖旧字段。

## 12. 参考曲线 schema

参考线必须保存生成依据，不能只保存一组点。

```ts
interface HeatCapacityReferenceStoreV1 {
  standard: HeatCapacityReferenceCurveV1 | null;
  operableBest: HeatCapacityReferenceCurveV1 | null;
}

interface HeatCapacityReferenceCurveV1 {
  id: string;
  kind: 'standard' | 'operableBest';
  generatorVersion: string;
  generatedAt: number;
  configSnapshot: HeatCapacityFreeConfigV1;
  operationScript: HeatCapacityReferenceOperationScriptV1;
  alignmentMode: 'nativeTime' | 'stageScaled';
  trace: HeatCapacityReferencePointV1[];
  stages: HeatCapacityReferenceStageV1[];
  records: {
    u0: HeatCapacityReferenceRecordV1 | null;
    u1: HeatCapacityReferenceRecordV1 | null;
    u2: HeatCapacityReferenceRecordV1 | null;
  };
}
```

规则：

- 标准曲线定义为：推荐操作流程在指定配置快照下生成的参考曲线。
- 最佳可达定义为：指定配置快照和候选操作限制下，后台搜索出的理想可达曲线。
- 两条线都不是现实世界曲线。
- 如果以后要加入真实实验参考线，应新增 `kind: 'realWorldReference'`，不要复用 `standard` 或 `operableBest`。
- 图表对齐时必须保留原始参考时间，同时明确是否做阶段时间拉伸。若做拉伸，图例或内部 metadata 必须记录 `alignmentMode`。
- 开发期可以重建 reference cache；正式发布后不能静默重写旧 reference snapshot。

## 13. 必须固化的数据盘点

第一阶段实施前必须逐项确认以下数据已进入 schema、migration 或明确派生规则。

### 13.1 公共工作台数据

- 文件 id、名称、类型、创建时间、更新时间、最后打开时间。
- 当前 active file。
- 当前 selected panel。
- live workspace split ratio。
- 可见面板和打开 tab。
- 标准实验结果窗口布局。
- 理想气体结果窗口布局。
- 热容实验结果 tab 和面板布局。

### 13.2 标准实验与理想气体保留数据

第一阶段不完整 schema 化，但公共 envelope 必须无损承载：

- `params`、`appliedParams`、`activeParams`。
- `particles`。
- `runState`。
- `stats`。
- `chartData`、`finalChartData`。
- 理想气体 `relation`。
- 理想气体 `pointsByRelation`。
- 理想气体 `latestPressureSummary`。
- 理想气体 `needsReset`。
- 理想气体 `verificationState`。
- 理想气体 `historyUnlocked`。

这些字段本轮不重构含义，只防止公共 envelope 改造时丢失。

### 13.3 热容 Free Mode 配置

- 环境气压、环境温度。
- `gamma`。
- 瓶体体积。
- 每次打气气体量增量。
- 打气温升。
- 打气过程时长。
- 推荐相邻打气间隔。
- 旋塞流动率。
- 放气响应延迟。
- 放气主过程时长。
- 放气冷却因子。
- 热交换参数。
- 微漏参数。
- 压力传感器灵敏度。
- 温度传感器基准和灵敏度。
- 常规传感器滞后。
- 打气阶段传感器滞后。
- 噪声。
- 量化精度。
- 常规采样间隔。
- 快速过程采样步长。
- 历史窗口长度。
- 记录稳定阈值。
- U1 有效下限。
- U2 过放下限。
- 预警线。
- 报警线。
- 评分规则版本。

### 13.4 热容 Free Mode 运行与仪表状态

- 物理 simulation time。
- `gasAmountRatio`。
- 气体温度。
- 瓶壁温度。
- 未完成打气过程。
- 未完成放气过程。
- 总打气次数。
- 最大压强。
- 放气是否开始。
- 最近旋塞打开/关闭时间。
- 当前旋塞打开时长。
- 放气参考状态。
- 传感器显示压力、显示温度、初始偏置、下一次采样时间、历史窗口和斜率。
- 调零版本、零点 offset、zero events、automatic U0。
- 压力表当前显示值和指针角度。
- 调零旋钮角度、调零采样、调零文本。
- pending stopcock open 时间和确认 flow open 状态。
- 等待倍速和提示显示状态。

### 13.5 热容 Free Mode 记录、trace 与评价

- Free trial 列表。
- automatic U0。
- U0/U1/U2 记录值。
- corrected signals。
- blocked reason。
- trace trial、branch、sample、event。
- trace branch 隐藏状态。
- trace idle state。
- trace config snapshot。
- 过程评分输入。
- 过程评分版本。
- 操作上限/最佳窗口计算版本。
- 标准曲线和最佳可达曲线 reference snapshot。

## 14. 版本递增规则

必须区分以下版本：

| 版本字段 | 作用 |
| --- | --- |
| `WORKBENCH_SESSION_VERSION` | 工作台整体保存格式 |
| `fileSchemaVersion` | 单个文件 envelope 格式 |
| `heatCapacitySchemaVersion` | 热容实验 payload 格式 |
| `runtimeVersion` | Free Mode 运行状态格式 |
| `traceVersion` | trace store/sample/event 格式 |
| `snapshotVersion` | 配置快照格式 |
| `calculationVersion` | U0/U1/U2 结果计算公式 |
| `referenceGeneratorVersion` | 标准曲线/最佳可达生成逻辑 |

递增规则：

- 新增可选字段：不一定递增顶层版本，但必须有默认值。
- 新增必需字段：递增对应 schema 版本。
- 改变字段含义或单位：必须递增对应 schema 版本。
- 改变 U0/U1/U2 计算公式：必须递增 `calculationVersion`。
- 改变 trace sample 结构：必须递增 `traceVersion`。
- 改变参考曲线生成规则：必须递增 `referenceGeneratorVersion`。
- 改变物理参数默认值：必须递增 config snapshot 版本，或至少记录 `modelDefaultsVersion`。

## 15. 迁移入口规则

所有持久化加载必须走集中入口：

```text
read raw JSON
-> parse raw object
-> validate minimum envelope
-> migrate session version
-> migrate file envelope version
-> migrate experiment payload version
-> migrate heat capacity free runtime/trace/config versions
-> validate final schema
-> return normalized state
```

规则：

- UI 组件不得自己补业务字段。
- Workbench 创建默认文件可以调用 default factory，但加载旧文件必须走 migration。
- migration 函数必须是纯函数，不依赖 React 状态。
- migration 必须保留原始记录型数据。
- migration 可以丢弃无法解释的 transient UI 状态，但必须保留实验记录和 trace，除非文件损坏到无法校验。
- migration 不应静默删除 trace branch 或 trial；如果必须丢弃，需要在返回结果中携带 warning。

## 16. 校验规则

需要建立两类校验：

### 16.1 轻量加载校验

用途：决定文件能不能打开。

检查：

- 顶层对象存在。
- `schemaFamily` 正确。
- version 是支持范围内的数字。
- 文件数组存在。
- 每个文件有 `id`、`kind`、`payload`。

### 16.2 完整业务校验

用途：开发测试和保存前检查。

检查：

- 必需字段存在。
- 数值为有限数。
- 单位合理。
- `gasAmountRatio > 0`。
- `ambientTemperatureK > 0`。
- `gamma > 1`。
- trace sample 的 `traceTrialId`、`branchId`、`sampleId` 引用可追踪。
- record 引用的 trace sample 存在，或明确标记为 legacy/missing。
- 已记录 U0/U1/U2 在迁移前后数值不变。
- config snapshot 存在并与 trace trial 绑定。

## 17. 参数可调性与数据格式的关系

参数可调性不阻塞本轮数据固化。

本轮只要求：

- 所有影响模型和结果的参数都能保存。
- 所有参数都能进入 config snapshot。
- 参数值有单位、范围和默认值来源。

后续参数注册表再补：

```ts
interface ExperimentParameterDescriptor {
  id: string;
  modelScope: string;
  labelZhCN: string;
  labelEnUS: string;
  unit: string;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  editable: boolean;
  uiLevel: 'main' | 'advanced' | 'hidden';
  affectsPhysics: boolean;
  affectsSensor: boolean;
  affectsScoring: boolean;
  requiresNewRun: boolean;
}
```

规则：

- 这个注册表后续再建。
- 本轮不能因为参数暂时不可调而不保存它。

## 18. 测试计划

必须补以下测试。

### 18.1 schema 创建测试

验证：

- 新建热容 Free Mode 文件有完整版本号。
- 新建文件有完整 config/runtime/trace/trials/references 结构。
- 默认 `gasAmountRatio = 1`。
- 默认 `ambientTemperatureK = 298.15`。
- 默认微漏关闭。

### 18.2 round-trip 测试

流程：

```text
create default session
-> serialize
-> parse
-> migrate/normalize
-> serialize again
```

验证：

- 文件数量不变。
- active file 不丢。
- Free Mode 配置不丢。
- trace store 不丢。
- trials 不丢。

### 18.3 记录值保护测试

流程：

```text
create trial with U0/U1/U2
-> simulate old version migration
-> inspect migrated trial
```

验证：

- U0/U1/U2 显示值不变。
- corrected signals 不被新计算覆盖。
- calculationVersion 保留。
- 新版本 metadata 可以补充，但不能改记录值。

### 18.4 trace 快照保护测试

验证：

- trace trial 保存 configSnapshot。
- 修改当前默认参数后，旧 trace 的 configSnapshot 不变。
- 过程图可用 trace 自己的 snapshot 解释数据。

### 18.5 版本迁移测试

至少需要 fixtures：

- 当前版本完整文件。
- 缺少 Free runtime version 的 legacy 文件。
- 缺少 trace snapshot 的 legacy 文件。
- 含已记录 U0/U1/U2 的 legacy 文件。
- version 大于当前支持版本的 future 文件。

### 18.6 失败路径测试

验证：

- 非 JSON 内容不能打开。
- schemaFamily 错误不能作为实验文件打开。
- 必需字段缺失时进入恢复/拒绝逻辑。
- 不支持的未来版本按已确认策略处理。

## 19. 代码实施顺序

审核通过后，按以下顺序实施：

1. 盘点当前实际持久化字段，列出保留、迁移、废弃字段。
2. 新建 schema/type 文件，只放类型、版本常量和校验工具。
3. 新建 migration 文件，集中处理 session/file/payload 迁移。
4. 将 `workbenchSession.ts` 中零散 normalize 逐步迁入 migration 层。
5. 为热容 Free Mode config/runtime/trace/trial/reference 建立明确 schema。
6. 补测试 fixture。
7. 补 round-trip、记录保护、trace snapshot、未来版本失败测试。
8. 再评估是否要把标准曲线/最佳可达生成结果存入 `references`。

## 20. 验收标准

代码完成后必须满足：

- `npm.cmd exec tsc -- --noEmit` 通过。
- `npm.cmd test` 通过。
- 固定端口 `5174` 可预览。
- 新建实验文件后版本字段完整。
- 保存再打开后 Free Mode 运行状态、trace、记录值不丢。
- 已记录 U0/U1/U2 不因迁移或模型默认值改变而自动变化。
- trace trial 带有完整 config snapshot。
- 标准曲线/最佳可达如被保存，必须带生成配置和生成版本。
- UI 层不再承担业务字段补全职责。
- 保存前后 UI 可见结果一致，包括过程图、记录点、评分摘要、仪表显示值和热容 Free Mode 当前运行状态。

## 21. 剩余确认项

以下内容不阻塞第一阶段方案，但在正式发布前需要确认：

1. 第一个正式发布版本号是什么。
2. 正式发布边界在代码里采用 `officialCompatibilityEpoch` 常量，还是绑定 `package.json` 的某个版本号。
3. 标准实验和理想气体实验的完整 schema 化排期。

这些问题不影响当前第一阶段实施计划，但影响正式版兼容承诺的开始边界。
