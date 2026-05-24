# Heat Capacity Free Parameter Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在热容自由实验中新增按“实验组”生效的参数调整体系，基础参数直接显示在右侧栏，高级参数通过独立弹窗调整，并保证同一实验文件内不同实验组的数据可对比且互不污染。

**Architecture:** 参数调整只接入热容自由实验，不接入标准模拟、理想气体实验、热容指导模式或热容演示模式。实现上把参数拆成可编辑草稿、当前实验组冻结快照、历史实验组结果快照三层，UI 只修改草稿，实验开始时冻结，记录和结果计算使用冻结或历史快照。右侧栏移除小球数量和速率的直接滑杆，把它们映射到全局性能模式。

**Tech Stack:** React 18, TypeScript, Vite, Electron, existing Node-based `.test.ts` scripts, PowerShell command entrypoints.

---

## 0. 已确认实现约束

以下约束已由用户确认，后续实现按这些语义执行。

1. 仪器噪声开关默认值：当前软件默认 `DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.noiseMv = 0.04`，因此噪声 checkbox 默认勾选。勾选后使用高级参数 `σ<sub>U</sub>`，取消勾选后有效噪声为 0，但不清空 `σ<sub>U</sub>` 的数值。
2. 传感器 `τ<sub>s</sub>` 表示真正的滞后时间参数。UI 调整时数值越大，读数越滞后；代码中转换到现有模型字段 `HeatCapacityFreeSensorConfig.lagRate`，推荐公式为 `lagRate = 1 / τs`。
3. 性能模式名称固定为“高性能 / 均衡 / 低负载”。复用现有 `WorkbenchPerformanceMode = 'standard' | 'balanced' | 'performance'` 时，显示映射为 `standard = 高性能`、`balanced = 均衡`、`performance = 低负载`。
4. 高级参数风险提示按实验文件记录，不按实验组重复弹出。同一实验文件确认过一次后，后续实验组再次打开高级参数不再提示。
5. 实验组开始后，参数面板表现应与标准模拟和理想气体的锁定态一致：整体变灰，鼠标悬浮显示禁止符号，不能编辑；尝试点击锁定控件时弹出提示。单纯选中文件、展开面板、打开高级参数弹窗不冻结参数；开机、打气、开关活塞或旋塞、调零、记录 U0/U1/U2、自动推进自由实验运行会冻结本组参数。
6. 标准模拟和理想气体继续使用现有参数面板，不做本次重构。比热容比实验中，演示实验模式和引导实验模式无法展开右侧参数折叠栏，尝试展开时弹出提示；只有自由模式可以展开，并且只有当前实验组未开始时可以改动参数。
7. 小球可视化开关必须保留，使用 checkbox 形式。右侧栏中的小球可视化 checkbox 和三维模型窗口上的小球可视化开关都保留，并以同一个状态 `hardSphereViewEnabled` 同步。

## 1. 仓库代码理解

根目录：`<project-root>`

当前实现中，热容自由实验的模型、状态、UI、持久化主要分布在以下文件：

| 文件 | 当前职责 | 本方案中的角色 |
| --- | --- | --- |
| `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` | 自由实验物理状态、物理配置、打气和放气演化 | 继续作为物理模型核心；新增参数只通过配置进入，不改基础演化结构 |
| `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts` | `Ggw`、`Gwa`、`Cw`、`Cg,min` 等热交换配置与归一化 | 暴露 `Ggw`、`Gwa`、`Cw`；继续隐藏 `Cg,min` |
| `src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts` | 泄漏开关和泄漏速率归一化 | 基础区控制泄漏开关，高级区控制 `λleak` |
| `src/domain/heatCapacity/heatCapacityFreeSensorModel.ts` | 压力/温度传感器读数、噪声、滞后、量化 | 暴露 `σU` 和 `τs`，继续隐藏量化步长和温度灵敏度 |
| `src/domain/heatCapacity/heatCapacityFreeRecordModel.ts` | U0/U1/U2 记录条件和判定阈值 | D 类高级参数进入这里的 `HeatCapacityFreeRecordConfig` |
| `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts` | 自由实验过程轨迹和配置快照 | 作为每组实验配置快照的落点 |
| `src/domain/heatCapacity/heatCapacityFreeTrialModel.ts` | 自由实验记录、修正量、结果平均 | 必须改成优先使用每组历史快照或已保存修正量，避免后续参数污染旧组结果 |
| `src/features/workbench/workbenchState.ts` | Workbench 文件状态、默认值、热容自由实验运行和记录集成 | 新增实验组状态、参数草稿、冻结函数、锁定函数 |
| `src/features/workbench/workbenchHeatCapacityPersistence.ts` | 热容实验文件保存和恢复 | 持久化参数草稿、冻结快照、风险确认、噪声开关、记录阈值 |
| `src/features/workbench/workbenchSession.ts` | 会话恢复和运行时状态归一化 | 对新增字段做向后兼容归一化 |
| `src/features/workbench/WorkbenchStudioPrototype.tsx` | 主 Workbench UI、右侧栏、设置窗口、热容交互 | 新增基础参数 UI、高级参数弹窗、风险确认弹窗，移除小球倍率和速率滑杆 |
| `src/features/workbench/WorkbenchStudioPrototype.css` | Workbench UI 样式 | 新增参数表单、checkbox、弹窗和锁定状态样式 |
| `tests/heatCapacity/*`、`tests/workbench/*` | 当前热容和 Workbench 行为测试 | 按批次新增或修改测试 |

当前默认值来源如下，基础参数默认必须沿用这些值：

| 参数 | 代码字段 | 当前默认 |
| --- | --- | --- |
| `P<sub>0</sub>` | `DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientPressureKPa` | `101.3` kPa |
| `T<sub>0</sub>` | `DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG.ambientTemperatureK` | `298.15` K |
| `G<sub>gw</sub>` | `DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.thermal.gasWallConductanceWPerK` | `0.22` W/K |
| `G<sub>wa</sub>` | `DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.thermal.wallAmbientConductanceWPerK` | `0.45` W/K |
| 泄漏开关 | `DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.leakage.enabled` | `false` |
| 仪器噪声开关 | 新增字段，默认从当前 `noiseMv = 0.04` 推导 | `true` |

### 1.1 本轮代码审计后的修正结论

下面这些结论来自当前仓库实际代码，不是新的产品需求；它们用于消除执行时容易遗漏的断言冲突和兼容性风险。

| 审计点 | 当前代码事实 | 计划修正 |
| --- | --- | --- |
| 工作区状态 | 当前工作区已有多处非本计划改动，包括 `WorkbenchStudioPrototype.tsx`、`WorkbenchStudioPrototype.css`、热容 3D 和若干测试文件 | 执行本计划时只修改本需求相关代码；不得重置、覆盖或格式化无关改动 |
| 运行时版本 | `workbenchState.ts` 中 `HEAT_CAPACITY_FREE_RUNTIME_VERSION = 4` | 新增参数草稿、组状态、风险确认、记录阈值和噪声开关后，将 runtime version 升到 `5`；`workbenchSession.ts` 兼容旧 v4 |
| 配置快照版本 | `heatCapacityFreeTraceModel.ts` 中 `HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION = 4`，且 `HeatCapacityFreeConfigSnapshot.record` 没有 `u0ZeroToleranceMv` | 扩展 record 快照并升到 `5`；恢复 v4 快照时补默认 `u0ZeroToleranceMv = 0.12` |
| 默认值来源 | `createDefaultFreeConfigSnapshot()` 中 `sensor.noiseMv = 0`、`historyWindowS = 1.2`，而 Workbench 默认 sensor 是 `noiseMv = 0.04`、`historyWindowS = 2` | UI 默认和新文件 draft 必须从 `DEFAULT_HEAT_CAPACITY_FREE_*` 与 `createDefaultHeatCapacityFreeRuntimeFields()` 派生，不能用 trace fallback 当 UI 默认 |
| 传感器滞后 | `normalizeHeatCapacityFreeSensorConfig()` 当前强制把 `lagRate` 还原为默认值 `8` | 必须改为保留归一化后的 `lagRate`，否则高级参数 `τ<sub>s</sub>` 不会生效 |
| 仪器噪声门控 | 当前多处直接使用 `file.heatCapacityFreeSensorConfig`，包括 `mergeHeatCapacityFreeRuntimeState`、`selectActiveHeatCapacityWorkbenchDisplay`、`stepHeatCapacityFreeWorkbenchFile`、`createHeatCapacityFreeConfigSnapshotFromFile` | 增加一个统一 helper 获取 effective sensor config；所有显示、步进、快照和记录路径必须走同一个 helper |
| 压力阈值 | `getHeatCapacityGaugePressureState()` 同时在 gauge config 和安全判断里硬编码 `HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV`、`HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV` | 改成接收或解析文件级 `heatCapacityFreePressureWarningMv` 与 `heatCapacityFreeRecordConfig.pressureDangerMv`；同步更新所有调用点 |
| 记录配置来源 | `WorkbenchStudioPrototype.tsx` 里有 UI 层常量 `HEAT_CAPACITY_FREE_RECORD_CONFIG`，并传给 `applyHeatCapacityFreeRecordWorkbenchState` | 记录阈值必须下沉到文件状态和冻结快照；移除 UI 层硬编码常量，记录函数从文件当前冻结配置读取 |
| 持久化测试文件 | 当前已有 `tests/heatCapacity/heatCapacityFreePersistence.test.ts`，没有 `workbenchHeatCapacityPersistence.test.ts` | 后续批次修改现有 `heatCapacityFreePersistence.test.ts`，不要引用不存在的测试文件 |
| copy 位置 | Workbench copy 目前内联在 `WorkbenchStudioPrototype.tsx`，不存在 `src/features/workbench/workbenchCopy.ts` | UI 文案修改直接落在现有 copy 定义区域，只有拆分 copy 时才新建文件 |
| 现有 UI 断言 | `workbenchHeatCapacityInstrumentUi.test.ts` 已断言旧性能档位“高清/均衡/低负载”和 3D 小球开关在 auto-demo lock 下仍不被 `interactionLocked` 禁用 | 本需求要把档位文案改为“高性能/均衡/低负载”；3D 小球开关只因自由实验参数锁定而禁用，不因 auto-demo interaction lock 禁用，测试要按此区分更新 |

## 2. 最终参数范围

### 2.1 基础参数，右侧栏直接呈现

这些参数只在热容自由实验的当前实验组处于 `draft` 时可编辑。UI 展示代号必须使用真正下标，例如 React `<sub>`，不能显示 `P_0`、`G_gw`、`lambda_leak`。

每一行参数必须同时显示“参数名 + 参数代号”。每一行右侧都放一个圆形 `?` 帮助按钮：鼠标悬浮时显示该参数的模型作用，鼠标离开时隐藏；点击 `?` 后说明固定显示，鼠标离开也不隐藏。固定后，点击当前 `?` 和帮助气泡以外的任意区域都会关闭说明，并且这一次点击只用于关闭说明，不触发被点击区域原本的动作。

| 类别 | 参数 | 代号 | UI 形式 | 模型作用 |
| --- | --- | --- | --- | --- |
| A 类 | 大气压 | `P<sub>0</sub>` | 数值输入 | 作为环境压力基准，影响初始压力、压力换算和自由实验修正量 |
| A 类 | 环境温度 | `T<sub>0</sub>` | 数值输入 | 作为初始热平衡温度和回温目标 |
| C 类 | 气体-屏壁导热系数 | `G<sub>gw</sub>` | 数值输入 | 控制气体向容器壁传热的快慢 |
| C 类 | 屏壁-环境导热系数 | `G<sub>wa</sub>` | 数值输入 | 控制容器壁向环境散热的快慢 |
| C 类 | 泄漏开关 | `leak` | checkbox | 勾选后启用慢速泄漏，未勾选时密封 |
| D 类 | 仪器噪声开关 | `noise` | checkbox | 勾选后读数叠加噪声，未勾选时有效噪声为 0 |

### 2.2 高级参数，独立弹窗呈现

这些参数通过右侧栏按钮打开独立弹窗。第一次在同一个实验文件打开高级参数时，必须先弹风险提示；取消直接关闭高级窗口，确认后进入表单。同一个实验文件确认后不再重复提示。

高级弹窗中的每一行同样显示“参数名 + 参数代号 + 圆形 `?` 帮助按钮”，帮助按钮交互规则与基础区一致。

| 类别 | 参数 | 代号 | 代码落点 | 模型作用 |
| --- | --- | --- | --- | --- |
| A 类 | 压力灵敏度 | `S<sub>p</sub>` | `HeatCapacityFreeSensorConfig.pressureMvPerKPa` | 决定压力读数 mV 与 kPa 的换算比例 |
| B 类 | 容器体积 | `V` | `HeatCapacityFreePhysicsConfig.vesselVolumeL` | 决定同样气体量和温度下的压力变化幅度 |
| B 类 | 气体绝热指数 | `γ` | `HeatCapacityFreePhysicsConfig.gamma` | 决定快速放气时压力和温度的绝热变化关系 |
| C 类 | 屏壁热容 | `C<sub>w</sub>` | `HeatCapacityFreeThermalConfig.wallHeatCapacityJPerK` | 决定容器壁温度变化的快慢 |
| C 类 | 泄漏速率 | `λ<sub>leak</sub>` | `HeatCapacityFreeLeakageConfig.ratePerS` | 泄漏开关开启时，决定封闭状态下气体慢速泄漏速度 |
| D 类 | 仪器噪声强度 | `σ<sub>U</sub>` | `HeatCapacityFreeSensorConfig.noiseMv` | 仪器噪声开关开启时，决定压力/温度读数抖动幅度 |
| D 类 | 传感器滞后时间 | `τ<sub>s</sub>` | UI 保存为 `sensorLagTimeS`，模型中转换为 `HeatCapacityFreeSensorConfig.lagRate = 1 / τs` | 决定显示读数追随真实状态的快慢；UI 数值越大，读数越滞后 |
| D 类 | 零点记录容差 | `ε<sub>0</sub>` | `HeatCapacityFreeRecordConfig.u0ZeroToleranceMv` | 决定 U0 记录时压力读数接近 0 的合格范围 |
| D 类 | 压力稳定斜率阈值 | `s<sub>p,max</sub>` | `HeatCapacityFreeRecordConfig.pressureStableSlopeMvPerS` | 决定压力读数足够平稳后才允许记录 |
| D 类 | 温度稳定斜率阈值 | `s<sub>T,max</sub>` | `HeatCapacityFreeRecordConfig.temperatureStableSlopeMvPerS` | 决定温度读数足够平稳后才允许记录 |
| D 类 | 环境温度容差 | `ε<sub>T</sub>` | `HeatCapacityFreeRecordConfig.temperatureAmbientToleranceMv` | 决定温度是否已经回到环境附近 |
| D 类 | 最小有效 U1 | `U<sub>1,min</sub>` | `HeatCapacityFreeRecordConfig.minimumUsefulU1CorrectedMv` | 防止打气不足时记录无效数据 |
| D 类 | 最小有效 U2 | `U<sub>2,min</sub>` | `HeatCapacityFreeRecordConfig.overVentedMinimumU2CorrectedMv` | 防止放气后压力读数异常或过低 |
| D 类 | 压力警告阈值 | `U<sub>warn</sub>` | 新增文件字段 `heatCapacityFreePressureWarningMv` | 控制压力偏高时的警告提示 |
| D 类 | 压力危险阈值 | `U<sub>danger</sub>` | `HeatCapacityFreeRecordConfig.pressureDangerMv` | 控制危险状态、禁止继续打气或记录失败边界 |

### 2.3 明确排除的参数

以下参数不进入基础区，也不进入高级区：

| 参数 | 代号 | 处理 |
| --- | --- | --- |
| 放气/泄压流速 | `q<sub>v</sub>` | 直接不要，继续使用内部默认 |
| 理论参考绝热指数 | `γ<sub>ref</sub>` | 不暴露 |
| 单次打气增压系数 | `α<sub>p</sub>` | 不暴露 |
| 单次打气升温量 | `α<sub>T</sub>` | 不暴露 |
| 放气冷却系数 | `c<sub>rel</sub>` | 不暴露 |
| 最小气体热容 | `C<sub>g,min</sub>` | 不暴露 |
| 量化步长 | `q<sub>U</sub>` | 不暴露 |
| 温度灵敏度 | `S<sub>T</sub>` | 不暴露 |

## 2.4 UI 设计契约

这一节把 UI 设计中容易被不同实现者理解成不同样子的内容固定下来。后续实现必须优先服从这里的规则；批次 5 和批次 6 只是代码落地路径。

### 2.4.1 右侧参数折叠栏入口

| 当前文件/模式 | 折叠栏行为 | 参数内容 |
| --- | --- | --- |
| 标准模拟 | 保持现有行为，可展开 | 继续使用现有标准模拟参数面板 |
| 理想气体 | 保持现有行为，可展开 | 继续使用现有理想气体参数面板 |
| 比热容比实验，自由模式，当前组 `draft` | 可展开 | 显示热容自由实验参数，允许编辑 |
| 比热容比实验，自由模式，当前组已开始 | 可展开 | 显示热容自由实验参数，但整体锁定 |
| 比热容比实验，演示实验模式 | 不展开 | 点击折叠入口弹出提示 |
| 比热容比实验，引导实验模式 | 不展开 | 点击折叠入口弹出提示 |

演示实验和引导实验的提示文案建议为：

```text
只有自由实验模式可以调整参数。
```

如果用户已经在自由模式展开了右侧参数折叠栏，然后切换到演示或引导模式，折叠栏应自动关闭。再次点击入口时只显示提示，不显示空面板。

### 2.4.2 基础参数区布局

基础区不做卡片嵌套，直接作为右侧参数折叠栏的主体内容。顺序固定为：

1. 大气压 `P<sub>0</sub>`
2. 环境温度 `T<sub>0</sub>`
3. 气体-屏壁导热系数 `G<sub>gw</sub>`
4. 屏壁-环境导热系数 `G<sub>wa</sub>`
5. 泄漏开关
6. 仪器噪声开关
7. 小球可视化开关
8. 高级参数按钮

每个数值参数使用紧凑数字输入框，不使用滑条。输入框右侧显示单位文本：

| 参数 | 单位显示 |
| --- | --- |
| `P<sub>0</sub>` | `kPa` |
| `T<sub>0</sub>` | `K` |
| `G<sub>gw</sub>` | `W/K` |
| `G<sub>wa</sub>` | `W/K` |

基础参数在 `draft` 状态下直接可输入，不需要先点 `Edit`。数值输入使用“文本编辑态 + 合法值提交”规则：用户输入过程中允许短暂不完整文本；失焦或按 Enter 时校验并写入 `heatCapacityFreeParameterDraft`；非法值保留在输入框中并显示行内错误，不写入模型。checkbox 切换立即写入 draft 或视觉状态。

### 2.4.3 单行参数结构

数值参数行使用三段结构：

```text
[参数名 代号 ?]        [数字输入框] [单位]
```

checkbox 参数行使用三段结构：

```text
[参数名 代号 ?]        [checkbox] [开/关状态文本]
```

规则：

1. 参数名和代号必须在同一行直接出现，例如“大气压 P<sub>0</sub>”。
2. 圆形 `?` 放在参数名和代号右侧，属于左侧标签区域，不放到整行最右边。
3. 数字输入框右对齐，避免不同参数名长度导致输入框不齐。
4. checkbox 与数值输入框左边缘对齐。
5. 行高固定，帮助气泡出现时不能挤压或推动参数行布局。

### 2.4.4 参数帮助气泡

每个参数行都有一个圆形 `?` 帮助按钮，内容就是该参数的“模型作用”。

状态机：

| 用户动作 | 行为 |
| --- | --- |
| 鼠标悬浮 `?` | 显示该参数帮助气泡 |
| 鼠标离开 `?` 和气泡 | 如果没有固定，则隐藏 |
| 点击 `?` | 固定当前帮助气泡 |
| 固定后鼠标离开 | 不隐藏 |
| 点击另一个 `?` | 切换固定到另一个参数 |
| 点击帮助浮层外任意区域 | 关闭固定帮助气泡，并拦截这一次点击 |

这里的“帮助浮层外任意区域”需要按用户语义重新定义：除了当前 `?` 按钮和当前帮助气泡本身之外，软件里的任何区域都算作外部区域，包括空白区域、参数编辑区、三维视图操控区、顶部工具区、文件列表、模式切换、其他按钮或输入框。

外部点击的事件处理必须满足：

1. 如果当前存在固定帮助气泡，第一次点击外部区域只负责关闭帮助气泡。
2. 这一次点击必须被消费，不能继续触发被点击区域原本的行为。
3. 例如帮助气泡固定后，用户点击三维视图里的电源开关：第一次点击只关闭帮助气泡，电源不变；第二次点击电源开关时才改变电源状态。
4. 文件切换、三维旋转/拖拽、参数输入聚焦、checkbox 切换、顶部菜单按钮等都遵循同一规则：第一次外部点击只关闭帮助气泡，不执行原动作。
5. 点击帮助气泡内部内容不关闭；点击当前 `?` 或另一个 `?` 按帮助按钮规则处理。

实现状态建议：

```ts
const [hoveredHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId] =
  useState<string | null>(null);
const [pinnedHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId] =
  useState<string | null>(null);

const visibleHeatCapacityParamHelpId =
  pinnedHeatCapacityParamHelpId ?? hoveredHeatCapacityParamHelpId;
```

外部点击建议在全局 capture 阶段处理；如果检测到 `pinnedHeatCapacityParamHelpId !== null` 且事件目标不在当前 `?` 或帮助气泡内，则执行 `preventDefault()`、`stopPropagation()`，关闭固定帮助气泡，并直接返回。

帮助气泡位置：贴近 `?` 按钮，优先向左或向下展开，不能遮住当前输入框。如果靠近窗口边缘，气泡需要 clamp 到可视区域内。

### 2.4.5 锁定态

当前实验组开始后，热容自由参数区仍可展开和查看，但不能编辑。

锁定态视觉和交互：

1. 整个热容自由参数区变灰，透明度降低。
2. 数字输入框、checkbox、高级参数按钮禁用。
3. 鼠标悬浮在锁定区域或锁定控件上显示禁止符号。
4. 点击锁定区域或锁定控件时显示提示，文案来自 `getHeatCapacityFreeParameterLockReason(activeFile)`。
5. `?` 帮助按钮在锁定态仍可查看，因为它不改变参数。
6. 小球可视化开关在锁定态是否可改按本方案固定为不可改，保持它与参数区锁定态一致；三维模型窗口上的同一开关也同步禁用。

锁定提示建议：

```text
当前实验组已开始，参数已锁定。完成并重置后可为下一组实验调整参数。
```

### 2.4.6 高级参数弹窗

高级参数不是折叠栏内部展开内容，而是独立弹窗。右侧基础区只放一个“高级参数”按钮。

高级参数主窗口位置：点击按钮后，在整个软件窗口中心弹出，水平和垂直都居中，视觉行为对齐现有顶部“设置”窗口。背景保留当前工作台但加遮罩，遮罩点击不保存、不关闭，避免误触丢失高级参数草稿。

弹窗结构：

1. 标题：`高级参数`
2. 副标题：说明这些参数只影响之后开始的新实验组，不会重写已完成实验组。
3. 参数表单区域：按 A 类、B 类、C 类、D 类分组，但整体排布为两到三列，尽量在一个可视窗口内把所有参数展示出来。
4. 桌面宽度足够时使用三列；中等宽度使用两列；窄屏才降为一列。
5. 每个参数行复用基础区行结构：`[参数名 代号 ?] [数字输入框] [单位]`。
6. 底部固定操作区：`取消`、`保存`。

高级参数排布规则：

1. 优先使用 3 列网格，把 A/B/C/D 参数按列表顺序填入网格。
2. 每一列内部纵向排列参数；分组标题可以跨列或作为列内小标题，但不能迫使用户横向滚动。
3. 主窗口宽度建议为 `min(920px, calc(100vw - 48px))`，高度建议为 `min(720px, calc(100vh - 48px))`。
4. 正常桌面视口按 `1366 × 768` 及以上理解：不应出现横向滚动条或纵向滚动条。
5. 如果极小视口确实无法容纳全部内容，允许主窗口内部纵向滚动作为兜底；横向滚动始终不允许。

首次进入高级参数时，先打开居中的高级参数主窗口，然后在这个主窗口上方再叠加一个风险确认窗口。风险确认窗口层级高于高级参数主窗口，主窗口在确认前不可编辑。风险确认窗口只有 `取消` 和 `确认`：

1. 点击 `取消`：关闭风险确认窗口和高级参数主窗口，不写入任何状态。
2. 点击 `确认`：把 `heatCapacityFreeAdvancedRiskAccepted` 写为 `true`，关闭风险确认窗口，解锁并显示高级参数表单。
3. 同一实验文件后续再打开高级参数，直接进入表单。

高级表单使用局部草稿。用户点击 `保存` 时一次性校验并写入 `heatCapacityFreeParameterDraft`；点击 `取消` 时丢弃弹窗内修改。

### 2.4.7 小球可视化和性能模式

小球可视化开关和性能模式是视觉设置，不属于每组实验的物理参数快照。

1. 右侧参数区保留“小球可视化” checkbox。
2. 三维模型窗口上的小球可视化开关保留。
3. 两个开关共用 `hardSphereViewEnabled`，任意一处切换后另一处立即同步。
4. 右侧参数区不再显示小球数量倍率和小球速率倍率。
5. 小球数量和速率由全局性能模式控制，模式名为“高性能 / 均衡 / 低负载”。

### 2.4.8 平滑效果契约

本功能涉及多种浮层、锁定态和表单反馈，需要统一平滑效果。动效必须服务状态变化，不做装饰性弹跳或大幅位移；时长控制在 `100ms` 到 `220ms`，避免拖慢实验操作。

通用规则：

1. 进入动效使用 `140ms-180ms ease-out`，退出动效使用 `100ms-140ms ease-in`。
2. 优先只动画 `opacity`、`transform`、`background-color`、`border-color`、`box-shadow`。避免动画会引起明显重排的宽高，除非用于行内错误提示的折叠高度。
3. 遵守 `prefers-reduced-motion: reduce`：用户系统要求减少动态效果时，关闭 transform 位移动效，保留必要的瞬时显示/隐藏。
4. 动效不能改变交互语义。尤其是帮助气泡固定后，外部第一次点击仍必须被拦截；关闭动效播放期间也不能让这次点击穿透到下层控件。

需要添加平滑效果的具体位置：

| UI 内容 | 平滑效果 | 交互要求 |
| --- | --- | --- |
| 右侧参数折叠栏展开/收起 | 内容区 `opacity` 从 0 到 1，轻微 `translateX(4px -> 0)`；收起反向 | 演示/引导模式阻止展开时，不播放空面板展开，只显示提示 |
| 演示/引导模式阻止提示 | 提示使用 `opacity` + `translateY(-4px -> 0)` 出现，自动消失时淡出 | 提示不能抢焦点，不能影响当前选择 |
| 参数行 hover/focus | 行背景、输入框边框、focus ring 平滑过渡 | 不改变行高，不推动右侧输入框 |
| 数值非法行内错误 | 错误文本 `opacity` + `max-height` 平滑展开/收起 | 错误出现可轻微增加行高，但必须平滑，不突然跳动 |
| checkbox 状态 | 勾选标记、边框、背景色平滑过渡 | 状态写入仍即时发生，动效只表现视觉 |
| `?` 帮助气泡出现/消失 | `opacity` + `scale(0.98 -> 1)` + `translateY(-2px -> 0)` | 气泡不能挤压布局；外部首击关闭时仍拦截原点击 |
| 固定帮助气泡切换参数 | 旧气泡淡出，新气泡淡入；位置变化使用短 transform 过渡 | 点击另一个 `?` 时不需要先点击外部关闭 |
| 参数区锁定态 | 容器 `opacity`、控件边框/文字颜色平滑变灰 | `cursor: not-allowed` 和禁用状态必须即时生效 |
| 锁定点击提示 | 轻微淡入/上移出现，淡出消失 | 点击锁定控件只提示，不触发编辑 |
| 高级参数主窗口 | 遮罩淡入；窗口 `opacity` + `scale(0.98 -> 1)` 居中出现，关闭反向 | 窗口始终水平/垂直居中，不从侧边滑入 |
| 高级风险确认窗口 | 在主窗口上方淡入并轻微放大到 1；关闭时淡出 | 风险确认未处理前，主窗口不可编辑 |
| 高级参数网格 | 跟随主窗口整体淡入，不做逐项长延迟动画 | 避免 15 个参数逐个跳动造成干扰 |
| 保存/取消按钮 hover/active | 背景、边框、阴影轻微过渡 | 按钮响应不能因动效延迟 |
| 性能模式三段选择 | 选中指示器平滑移动，文字颜色过渡 | 只影响视觉设置，不影响实验数据 |
| 小球可视化两个同步开关 | 两处开关状态变化都平滑过渡 | 同步状态必须即时，不能等动效结束 |

建议 CSS 变量：

```css
:root {
  --studio-heat-motion-fast: 120ms;
  --studio-heat-motion-normal: 160ms;
  --studio-heat-motion-slow: 220ms;
  --studio-heat-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --studio-heat-ease-in: cubic-bezier(0.7, 0, 0.84, 0);
}

@media (prefers-reduced-motion: reduce) {
  .studio-heat-free-params *,
  .studio-heat-advanced-window,
  .studio-heat-advanced-risk-window,
  .studio-param-help-popover {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
  }
}
```

### 2.4.9 固定 UI 取舍

为避免 Goal 模式执行时再次悬空，以下上一版中的 UI 假设在本方案中固定为执行规则。

1. 基础区数值提交方式：直接可输入，失焦或 Enter 提交合法值；非法值保留在输入框中并显示行内错误。不使用单独 `Edit` 按钮，也不在每次按键时立即写入模型。
2. 高级区提交方式：弹窗局部草稿 + 保存/取消。打开弹窗时从当前 `heatCapacityFreeParameterDraft` 复制局部草稿；保存时一次性校验并写回；取消时丢弃弹窗局部草稿。
3. 单位显示：在输入框右侧显示单位文本，不把单位写进输入框内部。
4. 小球可视化锁定：当前自由实验组开始后，右侧 checkbox 和三维窗口小球开关同步禁用，和参数区锁定态保持一致。
5. auto-demo 交互锁与自由实验参数锁必须分开：现有 auto-demo lock 不应顺带禁用 3D 小球开关；只有自由实验组已开始导致的参数锁定才禁用该开关。

## 3. 状态和数据设计

每个热容自由实验文件包含多个自由实验组。参数编辑边界是实验组，不是文件创建时刻。

| 状态 | 含义 | 参数权限 |
| --- | --- | --- |
| `draft` | 新实验组尚未开始 | 基础参数和高级参数可编辑 |
| `running` | 当前组已经开始实验过程 | 参数锁定 |
| `completed` | 当前组已经形成完整记录或被归档 | 参数锁定，重置后进入下一组 `draft` |

新增或修改的核心数据字段建议集中在 `WorkbenchHeatCapacityState`：

```ts
export type HeatCapacityFreeExperimentGroupStatus = 'draft' | 'running' | 'completed';

export interface HeatCapacityFreeParameterDraft {
  ambientPressureKPa: number;
  ambientTemperatureK: number;
  gasWallConductanceWPerK: number;
  wallAmbientConductanceWPerK: number;
  leakageEnabled: boolean;
  instrumentNoiseEnabled: boolean;
  pressureMvPerKPa: number;
  vesselVolumeL: number;
  gamma: number;
  wallHeatCapacityJPerK: number;
  leakageRatePerS: number;
  noiseMv: number;
  sensorLagTimeS: number;
  u0ZeroToleranceMv: number;
  pressureStableSlopeMvPerS: number;
  temperatureStableSlopeMvPerS: number;
  temperatureAmbientToleranceMv: number;
  minimumUsefulU1CorrectedMv: number;
  overVentedMinimumU2CorrectedMv: number;
  pressureWarningMv: number;
  pressureDangerMv: number;
}
```

`WorkbenchHeatCapacityState` 新增字段：

```ts
heatCapacityFreeExperimentGroupStatus: HeatCapacityFreeExperimentGroupStatus;
heatCapacityFreeParameterDraft: HeatCapacityFreeParameterDraft;
heatCapacityFreeActiveRunConfigSnapshot: HeatCapacityFreeConfigSnapshot | null;
heatCapacityFreeAdvancedRiskAccepted: boolean;
heatCapacityFreeRecordConfig: HeatCapacityFreeRecordConfig;
heatCapacityFreePressureWarningMv: number;
heatCapacityFreeInstrumentNoiseEnabled: boolean;
```

版本约束：

1. `HEAT_CAPACITY_FREE_RUNTIME_VERSION` 从 `4` 升到 `5`，因为 `WorkbenchHeatCapacityState` 的自由实验运行时语义新增了参数草稿、实验组状态、文件级记录阈值、噪声开关和风险确认。
2. `HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION` 从 `4` 升到 `5`，因为 `HeatCapacityFreeConfigSnapshot.record` 新增 `u0ZeroToleranceMv`。
3. 旧 runtime v4 或 config snapshot v4 恢复时不得报错；缺失字段一律按当前默认补齐，并保留旧 trial 的 `correctedSignals`。

历史结果隔离要求：

1. `draft` 中的参数只影响当前未开始的实验组。
2. 实验开始时把 `draft` 归一化并写入当前文件配置，同时生成 `heatCapacityFreeActiveRunConfigSnapshot`。
3. 记录 U2 或完成实验组时，把本组快照写入对应 trial 或 trace trial。
4. `calculateFreeHeatCapacityTrialResult` 优先使用 trial 内已保存的 `correctedSignals` 或 trial 级快照，不再用“当前文件配置”重算旧组。
5. 重置到下一组时，新草稿继承上一组最终参数，便于只改少数参数做对比。

## 4. 执行批次总览

| 批次 | 目标 | 主要文件 | 验证重点 |
| --- | --- | --- | --- |
| 批次 0 | 建立实现前基线和冲突保护 | Git 状态、测试命令 | 不覆盖用户已有改动 |
| 批次 1 | 新增参数配置模型和单元测试 | `heatCapacityFreeParameterConfig.ts` | 参数范围、默认值、排除项、噪声门控 |
| 批次 2 | 接入 Workbench 状态机和冻结语义 | `workbenchState.ts` | `draft -> running -> draft`，实验开始后锁定 |
| 批次 3 | 修正历史结果快照和计算隔离 | `heatCapacityFreeTrialModel.ts`、trace/persistence | 旧组结果不被新参数改变 |
| 批次 4 | 保存、恢复和旧文件兼容 | `workbenchHeatCapacityPersistence.ts`、`workbenchSession.ts` | 新字段持久化，旧文件可打开 |
| 批次 5 | 右侧栏和高级弹窗 UI | `WorkbenchStudioPrototype.tsx`、CSS | 基础参数、checkbox、高级风险提示、真下标 |
| 批次 6 | 性能模式替代小球倍率和速率 | Settings UI、scene props | 三档模式影响视觉，不影响数据 |
| 批次 7 | 全量回归、预览和验收 | 全仓库 | 测试、构建、浏览器手检 |

### 4.1 Goal 模式执行检查清单

执行者按下面顺序推进。每完成一项就更新 checkbox；不要把 UI 批次提前到模型和持久化之前。

- [ ] 批次 0：记录 `git status --short --branch`、`npm.cmd exec tsc -- --noEmit`、`npm.cmd test` 基线；标记既有失败。
- [ ] 批次 1：建立 `heatCapacityFreeParameterConfig.ts`，覆盖最终参数清单、默认值、排除项、`τ<sub>s</sub>` 转换、噪声门控。
- [ ] 批次 2：扩展 `WorkbenchHeatCapacityState`，实现 `draft -> running -> draft`、参数冻结、锁定原因、自由模式侧栏准入。
- [ ] 批次 3：升级 trace/config snapshot 到 v5，给 trial 补 `configSnapshot`，保证旧组结果不受新组参数影响。
- [ ] 批次 4：扩展 `workbenchHeatCapacityPersistence.ts` 和 `workbenchSession.ts`，覆盖旧 v4 恢复和新字段恢复。
- [ ] 批次 5：实现右侧栏基础参数、帮助气泡、锁定态、高级参数主窗口和风险确认窗口。
- [ ] 批次 6：移除右侧栏小球倍率滑杆，把小球数量和速率派生到“高性能 / 均衡 / 低负载”。
- [ ] 批次 7：运行全量自动验证、固定端口预览和浏览器验收。

## 5. 批次 0：实现前基线和冲突保护

### 目标

确认当前工作区已有改动，执行者不能重置、覆盖或格式化无关文件。本批不改代码。

### 操作

- [ ] 运行 Git 状态：

```powershell
git status --short --branch
```

预期：看到当前分支和已有脏文件。若 `src/features/workbench/WorkbenchStudioPrototype.tsx`、`src/features/workbench/WorkbenchStudioPrototype.css`、`src/features/workbench/workbenchState.ts` 等文件已有用户改动，先阅读相关片段再编辑。

- [ ] 运行 TypeScript 基线：

```powershell
npm.cmd exec tsc -- --noEmit
```

预期：若失败，记录失败信息。若失败来自本需求无关的既有改动，不在本批修复，但后续验证必须区分“既有失败”和“本次新增失败”。

- [ ] 运行测试基线：

```powershell
npm.cmd test
```

预期：同上，记录失败或通过状态。

## 6. 批次 1：参数配置模型

### 文件

- Create: `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`
- Test: `tests/heatCapacity/heatCapacityFreeParameterConfig.test.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeSensorModel.ts`，仅在需要导出类型或保留 lagRate 时小改

### 新增函数和类型

在 `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts` 新增。下面只列出签名和契约；实际源码必须写成普通 `export const` / `export function` 实现，不要把 `declare` 写进生产代码。

```ts
export type HeatCapacityFreeExperimentGroupStatus = 'draft' | 'running' | 'completed';

export interface HeatCapacityFreeParameterDraft { /* 字段见第 3 节 */ }

export interface HeatCapacityFreeParameterApplyResult {
  environmentConfig: HeatCapacityFreeEnvironmentConfig;
  physicsConfig: HeatCapacityFreePhysicsConfig;
  sensorConfig: HeatCapacityFreeSensorConfig;
  recordConfig: HeatCapacityFreeRecordConfig;
  pressureWarningMv: number;
  instrumentNoiseEnabled: boolean;
}

export declare const createHeatCapacityFreeParameterDraftFromConfigs: (
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  recordConfig: HeatCapacityFreeRecordConfig,
  pressureWarningMv: number,
  instrumentNoiseEnabled: boolean,
) => HeatCapacityFreeParameterDraft;

export declare const normalizeHeatCapacityFreeParameterDraft: (
  value: Partial<HeatCapacityFreeParameterDraft> | null | undefined,
  fallback: HeatCapacityFreeParameterDraft,
) => HeatCapacityFreeParameterDraft;

export declare const applyHeatCapacityFreeParameterDraftToConfigs: (
  draft: HeatCapacityFreeParameterDraft,
) => HeatCapacityFreeParameterApplyResult;

export const convertSensorLagRateToLagTimeS = (lagRate: number): number => (
  1 / Math.max(0.001, lagRate)
);

export const convertSensorLagTimeSToLagRate = (lagTimeS: number): number => (
  1 / Math.max(0.001, lagTimeS)
);

export const getEffectiveHeatCapacityFreeSensorConfig = (
  sensorConfig: HeatCapacityFreeSensorConfig,
  instrumentNoiseEnabled: boolean,
): HeatCapacityFreeSensorConfig => ({
  ...sensorConfig,
  noiseMv: instrumentNoiseEnabled ? sensorConfig.noiseMv : 0,
});
```

实现约束：

1. `applyHeatCapacityFreeParameterDraftToConfigs` 必须复用现有归一化逻辑，例如 `normalizeFreeThermalConfig`、`normalizeHeatCapacityFreePhysicsConfig`、`normalizeFreeLeakageConfig`。
2. 不能把排除参数写进 `HeatCapacityFreeParameterDraft`。
3. `sensorLagTimeS` 必须先归一化为正数，再通过 `convertSensorLagTimeSToLagRate(sensorLagTimeS)` 写回 `HeatCapacityFreeSensorConfig.lagRate`。UI 上 `τ<sub>s</sub>` 越大，模型响应越慢。
4. `pressureWarningMv` 不属于 `HeatCapacityFreeRecordConfig` 当前接口，需要作为 Workbench 文件字段保存。

### 测试

新增 `tests/heatCapacity/heatCapacityFreeParameterConfig.test.ts`，至少覆盖：

```ts
import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  createHeatCapacityFreeParameterDraftFromConfigs,
  getEffectiveHeatCapacityFreeSensorConfig,
  normalizeHeatCapacityFreeParameterDraft,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

// 1. 默认配置转换出的 draft 包含最终参数清单。
// 2. draft 不包含 qv、gammaRef、pumpAmountGainRatio、pumpTemperatureGainK、
//    releaseCoolingFactor、minimumGasHeatCapacityJPerK、quantizationMv、temperatureMvPerK。
// 3. noise checkbox 关闭时 effective sensor noiseMv 为 0，但原 sensorConfig.noiseMv 不被清空。
// 4. leakageEnabled 和 leakageRatePerS 分别写入 enabled 与 ratePerS。
// 5. sensorLagTimeS 通过 convertSensorLagTimeSToLagRate 写回 lagRate。
```

运行：

```powershell
node .\tests\heatCapacity\heatCapacityFreeParameterConfig.test.ts
```

预期：新增测试通过。

## 7. 批次 2：Workbench 状态机和参数冻结

### 文件

- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`
- Modify Test: `tests/workbench/workbenchRunningParamsLock.test.ts`

### 新增函数

在 `workbenchState.ts` 新增或导出。下面只列签名和关键返回结构；实际实现必须是普通导出函数，不要把 `declare` 写进源码。

```ts
export const createDefaultHeatCapacityFreeRecordConfig = (): HeatCapacityFreeRecordConfig => ({
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
});

export declare const createDefaultHeatCapacityFreeParameterState: () => HeatCapacityFreeParameterApplyResult;

export const isHeatCapacityFreeParameterEditingAvailable = (
  file: WorkbenchFileState | null,
): file is WorkbenchHeatCapacityState => (
  file?.kind === 'heatCapacity' &&
  file.heatCapacityMode === 'free' &&
  file.heatCapacityFreeExperimentGroupStatus === 'draft' &&
  file.runState !== 'running' &&
  file.runState !== 'paused'
);

export declare const getHeatCapacityFreeParameterLockReason: (
  file: WorkbenchFileState | null,
) => string | null;

export const canOpenHeatCapacityParameterSidebar = (
  file: WorkbenchFileState | null,
) => (
  file?.kind !== 'heatCapacity' ||
  file.heatCapacityMode === 'free'
);

export const getHeatCapacityParameterSidebarBlockReason = (
  file: WorkbenchFileState | null,
) => (
  file?.kind === 'heatCapacity' && file.heatCapacityMode !== 'free'
    ? '只有自由实验模式可以调整参数。'
    : null
);

export declare const applyHeatCapacityFreeParameterDraftWorkbenchState: (
  file: WorkbenchHeatCapacityState,
  draft: HeatCapacityFreeParameterDraft,
) => WorkbenchHeatCapacityState;

export declare const freezeHeatCapacityFreeParametersForCurrentGroup: (
  file: WorkbenchHeatCapacityState,
) => WorkbenchHeatCapacityState;

export declare const prepareNextHeatCapacityFreeExperimentGroupWorkbenchState: (
  file: WorkbenchHeatCapacityState,
) => WorkbenchHeatCapacityState;

export const acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => ({
  ...file,
  heatCapacityFreeAdvancedRiskAccepted: true,
});
```

### 修改函数

1. `createDefaultHeatCapacityFreeRuntimeFields(seed)`
   改为可接收参数应用结果：

```ts
export declare const createDefaultHeatCapacityFreeRuntimeFields: (
  seed: number | string,
  parameterState?: HeatCapacityFreeParameterApplyResult,
) => Partial<WorkbenchHeatCapacityState>;
```

2. `createDefaultHeatCapacityFile(index)`
   新建热容文件时初始化：

```ts
heatCapacityFreeExperimentGroupStatus: 'draft',
heatCapacityFreeParameterDraft: createHeatCapacityFreeParameterDraftFromConfigs(
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  createDefaultHeatCapacityFreeRecordConfig(),
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
  true,
),
heatCapacityFreeActiveRunConfigSnapshot: null,
heatCapacityFreeAdvancedRiskAccepted: false,
heatCapacityFreeRecordConfig: createDefaultHeatCapacityFreeRecordConfig(),
heatCapacityFreePressureWarningMv: HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
heatCapacityFreeInstrumentNoiseEnabled: true,
```

3. `normalizeHeatCapacityFreeSensorConfig(config)`
   允许保存由高级参数 `τ<sub>s</sub>` 换算出的 `lagRate`：

```ts
lagRate: clampNumber(
  config?.lagRate,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.lagRate,
  0.01,
  60,
),
```

`HeatCapacityFreeParameterDraft` 不直接暴露 `lagRate`，只暴露 `sensorLagTimeS`。保存参数时先执行 `convertSensorLagTimeSToLagRate(sensorLagTimeS)`；从现有配置生成草稿时执行 `convertSensorLagRateToLagTimeS(lagRate)`。保留 `quantizationMv`、`minSampleIntervalS`、`maxSampleIntervalS` 的内部默认策略，因为它们不在最终可调参数中。

4. `powerHeatCapacityWorkbenchFile(file, nextPowerOn)`
   当 `nextPowerOn === true` 且文件处于自由模式时，先调用 `freezeHeatCapacityFreeParametersForCurrentGroup`。冻结函数必须先把 draft 应用到 `heatCapacityFreePhysicsConfig`、`heatCapacityFreeSensorConfig`、`heatCapacityFreeRecordConfig`、`heatCapacityFreePressureWarningMv`、`heatCapacityFreeInstrumentNoiseEnabled`，再生成 `heatCapacityFreeActiveRunConfigSnapshot`。

5. `registerHeatCapacityPumpStroke(file)`
   打气前冻结参数，防止用户先打气再改参数。

6. `setHeatCapacityPressureZeroOffset`、`applyHeatCapacityFreeRecordWorkbenchState`
   调零或记录前冻结参数。`applyHeatCapacityFreeRecordWorkbenchState` 不再从 UI 层接收 `HeatCapacityFreeRecordConfig`，而是从冻结后的文件状态读取记录阈值。

7. `resetHeatCapacityFreeRunWorkbenchState(file)`
   当前 reset 完成后调用 `prepareNextHeatCapacityFreeExperimentGroupWorkbenchState`，让下一组回到 `draft`，清空 `heatCapacityFreeActiveRunConfigSnapshot`，并默认继承上一组最终参数。注意当前函数会调用 `createDefaultHeatCapacityFreeRuntimeFields()`，实现时不得因此把用户上一组的 draft/config 重置回默认值。

8. `stepHeatCapacityWorkbenchFile(file)`
   自由模式传入 sensor 配置时使用 `getEffectiveHeatCapacityFreeSensorConfig(file.heatCapacityFreeSensorConfig, file.heatCapacityFreeInstrumentNoiseEnabled)`。同一 helper 还必须用于 `mergeHeatCapacityFreeRuntimeState`、`selectActiveHeatCapacityWorkbenchDisplay`、`createHeatCapacityFreeConfigSnapshotFromFile`、`recordHeatCapacityFreeTraceEvent` 相关采样路径，避免显示值、记录值和快照值不一致。

9. `getHeatCapacityGaugePressureState` 或其调用点
   把 `Uwarn`、`Udanger` 改为来自文件字段和 `heatCapacityFreeRecordConfig.pressureDangerMv`。当前该函数在 gauge config、`pressureSafetyStatus`、`pressureBlockedPumping`、`pressureOverLimit` 多处使用硬编码阈值，必须一次性改完所有分支，并更新 `registerHeatCapacityPumpStroke`、`powerHeatCapacityWorkbenchFile`、`stepHeatCapacityWorkbenchFile` 等所有调用点。

10. `HEAT_CAPACITY_FREE_RUNTIME_VERSION`
    从 `4` 更新为 `5`，并在 `workbenchSession.ts`、`workbenchHeatCapacityPersistence.ts` 中给 v4 旧数据补齐新增字段。

### 测试

新增 `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`：

```ts
import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  isHeatCapacityFreeParameterEditingAvailable,
  prepareNextHeatCapacityFreeExperimentGroupWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';

// 1. 新建热容自由文件时状态为 draft，参数可编辑。
// 2. 修改 draft 后，未冻结前不创建 activeRunConfigSnapshot。
// 3. freeze 后状态为 running，参数不可编辑，activeRunConfigSnapshot 使用 draft 值。
// 4. reset/prepare next 后状态回到 draft，并继承上一组最终参数。
// 5. 非 free 模式、running、paused 均不可编辑。
// 6. 热容演示模式和引导模式 canOpenHeatCapacityParameterSidebar 为 false，
//    且 getHeatCapacityParameterSidebarBlockReason 返回提示文案。
```

运行：

```powershell
node .\tests\heatCapacity\workbenchHeatCapacityFreeParameters.test.ts
node .\tests\workbench\workbenchRunningParamsLock.test.ts
```

预期：新增测试通过，既有运行中参数锁定测试按新锁定函数更新后通过。

## 8. 批次 3：历史结果快照和计算隔离

### 文件

- Modify: `src/domain/heatCapacity/heatCapacityFreeTrialModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`
- Modify: `src/features/workbench/workbenchState.ts`
- Test: `tests/heatCapacity/heatCapacityFreeTrialModel.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`

### 修改点

0. `heatCapacityFreeTraceModel.ts`
   将 `HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION` 从 `4` 升到 `5`，并把 `HeatCapacityFreeConfigSnapshot.record` 扩展为包含 `u0ZeroToleranceMv`。`createDefaultFreeConfigSnapshot()` 的 record 默认值补 `u0ZeroToleranceMv: 0.12`。恢复旧 v4 snapshot 时若缺失该字段，按 `0.12` 补齐。

1. 扩展 `HeatCapacityFreeTrial`：

```ts
export interface HeatCapacityFreeTrial {
  id: string;
  source: 'free';
  traceTrialId: string | null;
  branchCount: number;
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'];
  u0: HeatCapacityFreeRecord | null;
  u1: HeatCapacityFreeRecord | null;
  u2: HeatCapacityFreeRecord | null;
  blockedReason: HeatCapacityFreeRecordRejectReason | null;
  correctedSignals: HeatCapacityFreeCorrectedSignals | null;
  configSnapshot: HeatCapacityFreeConfigSnapshot | null;
}
```

2. 修改 `createHeatCapacityFreeTrial(id, automaticU0)`，默认 `configSnapshot: null`。

3. 修改 `recordFreeU2(trial, input, options)` 或 Workbench 调用层。推荐在 Workbench 层记录成功后把 `file.heatCapacityFreeActiveRunConfigSnapshot` 写入 trial：

```ts
trial: {
  ...recordResult.trial,
  configSnapshot: file.heatCapacityFreeActiveRunConfigSnapshot,
}
```

   如果 U0/U1/U2 被删除或整组被删除，`removeHeatCapacityFreeTrialRecord` 必须同时清空相关 trial 的 `correctedSignals` 和 `configSnapshot`，避免残留旧快照。

4. 修改 `calculateFreeHeatCapacityTrialResult(trial, trialIndex, options)`：

```ts
const correctedSignals = trial.correctedSignals ??
  calculateFreeHeatCapacityTrialSignals(trial, optionsFromTrialSnapshotOrCurrentOptions);
```

优先顺序：

1. `trial.correctedSignals`，这是记录 U2 时已经根据当时参数算出的修正量。
2. `trial.configSnapshot`，用于兼容有快照但没有 correctedSignals 的数据。
3. 外部 `options`，用于旧文件和旧测试兼容。

5. 修改 `calculateFreeHeatCapacityMeanResult(trials, options)`，确保每个 trial 可以按自己的快照计算，不把同一个当前 `options` 强行套到所有历史组。

### 测试

扩展或新增 `tests/heatCapacity/heatCapacityFreeTrialModel.test.ts`：

```ts
// 构造两个 trial，U0/U1/U2 读数相同，但 pressureMvPerKPa 或 ambientPressureKPa 不同。
// 断言：trial A 的 gamma 使用 A 的 correctedSignals 或 configSnapshot；
//      修改当前 options 后，trial A 的结果不变化。
// 断言：没有 correctedSignals/configSnapshot 的旧 trial 仍然按传入 options 兼容计算。
```

运行：

```powershell
node .\tests\heatCapacity\heatCapacityFreeTrialModel.test.ts
node .\tests\heatCapacity\workbenchHeatCapacityFreeParameters.test.ts
```

预期：历史 trial 不受新参数影响；旧数据兼容分支仍通过。

## 9. 批次 4：保存、恢复和旧文件兼容

### 文件

- Modify: `src/features/workbench/workbenchHeatCapacityPersistence.ts`
- Modify: `src/features/workbench/workbenchSession.ts`
- Test: `tests/heatCapacity/heatCapacityFreePersistence.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`

### 修改点

1. `HeatCapacityFreePersistenceDataV1` 增加可选字段，保持旧文件兼容：

```ts
parameterDraft?: HeatCapacityFreeParameterDraft;
experimentGroupStatus?: HeatCapacityFreeExperimentGroupStatus;
activeRunConfigSnapshot?: HeatCapacityFreeConfigSnapshot | null;
advancedRiskAccepted?: boolean;
recordConfig?: HeatCapacityFreeRecordConfig;
pressureWarningMv?: number;
instrumentNoiseEnabled?: boolean;
```

2. `heatCapacityFreeUiReplayKeys` 增加 UI 需要恢复的新增字段。如果字段属于数据语义而非纯 UI，优先放在 `free` 顶层字段，不只放 `uiReplay`。

3. `createHeatCapacityFreeConfigSnapshotFromFile(file)` 改为使用文件当前字段：

```ts
record: {
  pressureStableSlopeMvPerS: file.heatCapacityFreeRecordConfig.pressureStableSlopeMvPerS,
  temperatureStableSlopeMvPerS: file.heatCapacityFreeRecordConfig.temperatureStableSlopeMvPerS,
  temperatureAmbientToleranceMv: file.heatCapacityFreeRecordConfig.temperatureAmbientToleranceMv,
  u0ZeroToleranceMv: file.heatCapacityFreeRecordConfig.u0ZeroToleranceMv,
  minimumUsefulU1CorrectedMv: file.heatCapacityFreeRecordConfig.minimumUsefulU1CorrectedMv,
  overVentedMinimumU2CorrectedMv: file.heatCapacityFreeRecordConfig.overVentedMinimumU2CorrectedMv,
  pressureWarningMv: file.heatCapacityFreePressureWarningMv,
  pressureDangerMv: file.heatCapacityFreeRecordConfig.pressureDangerMv,
}
```

同时补齐 `u0ZeroToleranceMv`，当前 `HeatCapacityFreeConfigSnapshot.record` 如果没有该字段，需要扩展 trace snapshot 接口和默认快照，并将 snapshot version 更新为 `5`。

4. `restoreHeatCapacityFileFromPersistencePayload` 恢复新增字段。若旧文件没有字段：

```ts
heatCapacityFreeExperimentGroupStatus: free?.experimentGroupStatus ?? fallback.heatCapacityFreeExperimentGroupStatus,
heatCapacityFreeParameterDraft: normalizeHeatCapacityFreeParameterDraft(free?.parameterDraft, fallback.heatCapacityFreeParameterDraft),
heatCapacityFreeActiveRunConfigSnapshot: free?.activeRunConfigSnapshot ?? null,
heatCapacityFreeAdvancedRiskAccepted: free?.advancedRiskAccepted === true,
heatCapacityFreeRecordConfig: normalizeHeatCapacityFreeRecordConfig(free?.recordConfig, fallback.heatCapacityFreeRecordConfig),
heatCapacityFreePressureWarningMv: finiteOrDefault(free?.pressureWarningMv, HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV),
heatCapacityFreeInstrumentNoiseEnabled: free?.instrumentNoiseEnabled ?? fallback.heatCapacityFreeInstrumentNoiseEnabled,
```

5. 旧 v4 `free.config` 兼容：
   - `free.config.version === 4` 或缺失版本时，允许恢复。
   - 缺失 `record.u0ZeroToleranceMv` 时补 `0.12`。
   - 缺失 `parameterDraft` 时，从恢复后的 physics/sensor/record/pressure warning/noise enabled 反推 draft。
   - 缺失 `instrumentNoiseEnabled` 时，若 `sensor.noiseMv > 0` 则默认 `true`，否则 `false`。

6. `workbenchSession.ts` 的 `normalizeRuntimeState(file)` 加入同样的归一化，保证会话恢复和文件恢复一致。这里还要更新 `tests/workbench/workbenchSessionPersistence.test.ts`，因为该测试已有热容自由运行时恢复断言。

### 测试

扩展 `tests/heatCapacity/heatCapacityFreePersistence.test.ts`：

```ts
// 1. 保存后 payload.free.parameterDraft、recordConfig、pressureWarningMv、
//    instrumentNoiseEnabled、advancedRiskAccepted 存在。
// 2. 恢复后这些字段值一致。
// 3. 旧 payload 缺少新增字段时，恢复为当前默认，不抛异常。
// 4. risk accepted 在同一文件恢复后仍为 true，新建文件为 false。
// 5. config snapshot version 写入 5；旧 version 4 缺 u0ZeroToleranceMv 时恢复默认 0.12。
```

运行：

```powershell
node .\tests\heatCapacity\heatCapacityFreePersistence.test.ts
node .\tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node .\tests\workbench\workbenchSessionPersistence.test.ts
```

预期：保存恢复稳定，旧数据兼容。

## 10. 批次 5：右侧栏参数 UI 和高级弹窗

### 文件

- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx` 内的现有 copy 定义区域；当前仓库没有独立 `workbenchCopy.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
- Test: `tests/workbench/workbenchChromePolish.test.ts`
- Test: `tests/workbench/workbenchClickOutsideDismiss.test.ts`

### 新增 UI 函数

在 `WorkbenchStudioPrototype.tsx` 中新增或拆分。下面只列组件/函数边界，实际源码使用普通函数或 `const` 实现，不写 `declare`。

```tsx
const [hoveredHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId] =
  useState<string | null>(null);
const [pinnedHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId] =
  useState<string | null>(null);

const renderHeatCapacityParameterSymbol = (
  parts: Array<string | { sub: string }>,
) => (
  <span className="studio-param-symbol">
    {parts.map((part, index) => (
      typeof part === 'string'
        ? <span key={index}>{part}</span>
        : <sub key={index}>{part.sub}</sub>
    ))}
  </span>
);

declare const renderHeatCapacityFreeParameterPanel: () => React.ReactNode;
declare const renderHeatCapacityBasicParameterRows: () => React.ReactNode;
declare const renderHeatCapacityAdvancedParameterDialog: () => React.ReactNode;
declare const renderHeatCapacityAdvancedRiskDialog: () => React.ReactNode;
declare const renderHeatCapacityParameterHelpButton: (
  parameterId: string,
  modelEffect: string,
) => React.ReactNode;
declare const commitHeatCapacityBasicParameterInput: (
  parameterId: string,
  valueText: string,
) => void;
declare const setHeatCapacityBasicCheckbox: (
  parameterId: 'leakageEnabled' | 'instrumentNoiseEnabled' | 'hardSphereViewEnabled',
  checked: boolean,
) => void;
declare const createHeatCapacityAdvancedDraftFromFile: () => HeatCapacityFreeParameterDraft;
declare const saveHeatCapacityAdvancedParameterDraft: (
  draft: HeatCapacityFreeParameterDraft,
) => void;
declare const cancelHeatCapacityAdvancedParameterDraft: () => void;
declare const openHeatCapacityAdvancedSettings: () => void;
declare const closePinnedHeatCapacityParameterHelp: () => void;
```

### 修改点

1. 右侧 `Current Parameters` 分支中，当 `activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'` 时，不再渲染通用 `getWorkbenchParameterRows(activeFile)` 生成的标准参数行，改为 `renderHeatCapacityFreeParameterPanel()`。
2. 热容演示模式和引导模式不能展开右侧参数折叠栏。当前代码多处用 `setParametersCollapsed(file.kind === 'heatCapacity')` 在热容文件中默认折叠右栏；实现时要把 rail button 的展开动作改为走 `canOpenHeatCapacityParameterSidebar`。点击折叠入口时阻止展开，并显示提示，例如“只有自由实验模式可以调整参数。”
3. 标准模拟和理想气体继续使用现有参数面板，不复用热容自由参数 UI。
4. 基础参数直接显示在右侧栏，包含四个数值输入和三个 checkbox：泄漏、仪器噪声、小球可视化。
5. checkbox 文案和行为：
   - 泄漏：勾选为开，未勾选为关。
   - 仪器噪声：勾选为开，未勾选为关。
   - 小球可视化：勾选为显示，未勾选为隐藏；它是视觉设置，不写入实验组物理参数快照。
6. 小球可视化 checkbox 使用现有 `hardSphereViewEnabled` 作为唯一状态源。右侧栏 checkbox 和三维模型窗口上的开关必须调用同一个 setter，任意一处修改后另一处立即同步。
7. 当前实验组开始后，参数面板进入锁定态：整体变灰，输入和 checkbox 禁用，鼠标悬浮显示禁止符号。用户点击锁定区域或锁定控件时显示 `getHeatCapacityFreeParameterLockReason(activeFile)` 返回的提示。
8. 高级按钮在不可编辑状态禁用，并显示锁定原因；点击锁定的高级入口也要弹出同样提示。
9. 每个参数行左侧显示参数名和代号，例如“大气压 P<sub>0</sub>”。每个参数行右侧显示圆形 `?` 帮助按钮。
10. `?` 帮助按钮交互：
   - hover：显示模型作用说明。
   - mouse leave：如果没有被点击固定，则说明消失。
   - click：固定当前说明，鼠标离开不消失。
   - outside click：除了当前 `?` 和帮助气泡本身以外，任意区域的第一次点击只关闭固定说明，并拦截这一次点击，不触发下层控件行为。
   - 点击其他参数的 `?`：切换固定说明到新参数。
11. 首次打开高级弹窗：
   - 先在软件窗口中心打开高级参数主窗口。
   - 若 `heatCapacityFreeAdvancedRiskAccepted === false`，在主窗口上方叠加风险确认窗口，主窗口暂不可编辑。
   - 点击取消：关闭风险确认窗口和高级参数主窗口，不改状态。
   - 点击确认：调用 `acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState`，关闭风险确认窗口，然后解锁高级参数表单。
12. 高级表单保存调用 `applyHeatCapacityFreeParameterDraftWorkbenchState`，只修改当前 `draft` 和当前文件配置，不修改历史 trial。
13. 所有参数代号使用 `<sub>` 或等价 React 节点，禁止把下划线写进 UI 文案。
14. 移除右侧栏中的 `hardSphereParticleMultiplier` 和 `hardSphereSpeedMultiplier` 滑杆，保留小球可视化 checkbox。
15. 高级参数主窗口内参数使用 2-3 列网格，正常桌面视口下不出现横向或纵向滚动条；极小视口允许纵向滚动兜底，横向滚动始终不允许。
16. 当前 Workbench 已有 top menu、file menu、rename input 的 document pointerdown 外部点击逻辑。帮助气泡固定后的“首个外部点击只关闭并拦截”必须在 capture 阶段处理，并且只在有 pinned help 时启用，避免破坏现有菜单关闭和 rename 提交语义。

### CSS

新增样式建议：

```css
.studio-heat-free-params { display: grid; gap: 10px; }
.studio-heat-free-param-row { display: grid; grid-template-columns: 1fr minmax(84px, 120px); gap: 8px; align-items: center; }
.studio-heat-free-check-row { display: flex; align-items: center; gap: 8px; }
.studio-heat-free-param-row,
.studio-heat-free-check-row { transition: background-color var(--studio-heat-motion-fast) var(--studio-heat-ease-out); }
.studio-heat-free-params.is-locked { opacity: 0.55; cursor: not-allowed; transition: opacity var(--studio-heat-motion-normal) var(--studio-heat-ease-out); }
.studio-param-help-button { inline-size: 20px; block-size: 20px; border-radius: 50%; }
.studio-param-help-popover { position: absolute; max-width: 240px; z-index: 20; transition: opacity var(--studio-heat-motion-fast) var(--studio-heat-ease-out), transform var(--studio-heat-motion-fast) var(--studio-heat-ease-out); }
.studio-heat-advanced-overlay { position: fixed; inset: 0; transition: opacity var(--studio-heat-motion-normal) var(--studio-heat-ease-out); }
.studio-heat-advanced-window { width: min(920px, calc(100vw - 48px)); max-height: min(720px, calc(100vh - 48px)); overflow-x: hidden; }
.studio-heat-advanced-window { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(1); transition: opacity var(--studio-heat-motion-normal) var(--studio-heat-ease-out), transform var(--studio-heat-motion-normal) var(--studio-heat-ease-out); }
.studio-heat-advanced-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 14px; }
.studio-heat-advanced-risk-window { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(1); z-index: 2; transition: opacity var(--studio-heat-motion-normal) var(--studio-heat-ease-out), transform var(--studio-heat-motion-normal) var(--studio-heat-ease-out); }
.studio-param-symbol sub { font-size: 0.7em; line-height: 0; }
```

具体视觉要贴合现有 `.studio-current-params`、`.studio-settings-window`、`.studio-param-row` 风格，不做无关 redesign。动效变量和 `prefers-reduced-motion` 规则按第 2.4.8 节添加。

### 测试

扩展 `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`：

```ts
// 1. 源码或渲染片段中存在基础参数：P<sub>0</sub>、T<sub>0</sub>、
//    G<sub>gw</sub>、G<sub>wa</sub>、leak checkbox、noise checkbox、
//    hardSphereViewEnabled checkbox。
// 2. 不存在 P_0、G_gw、lambda_leak、U_1,min 这样的 UI 下划线代号。
// 3. 高级参数弹窗包含居中主窗口，以及叠在主窗口上方的风险提示取消/确认路径。
// 4. 热容自由模式右侧栏不再出现小球数量倍率和速率倍率滑杆。
// 5. 标准模拟和理想气体现有参数 UI 未被热容自由参数面板替换。
// 6. 热容演示模式和引导模式的右侧参数折叠入口被阻止展开，并有提示文案。
// 7. 参数行包含帮助按钮；源码中存在 hover、click 固定、outside click 清除并拦截首击的逻辑。
// 8. 锁定态存在变灰、not-allowed cursor 和点击提示逻辑。
// 9. 高级参数表单使用 2-3 列网格，不允许横向滚动。
// 10. 源码中存在帮助气泡、锁定态、高级主窗口、风险确认窗口、阻止提示、
//     行内错误、checkbox、性能模式的 transition 或 animation 规则。
// 11. 源码中存在 prefers-reduced-motion 兜底。
// 12. 固定帮助气泡后的第一次外部 pointerdown 会 stopPropagation/preventDefault，
//     且不会破坏 top menu、file menu、rename input 的既有 outside-click 测试。
```

运行：

```powershell
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
node .\tests\workbench\workbenchChromePolish.test.ts
node .\tests\workbench\workbenchClickOutsideDismiss.test.ts
```

预期：UI 静态测试通过。

## 11. 批次 6：性能模式替代小球倍率和速率

### 文件

- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`
- Modify: `src/features/heatCapacity/HeatCapacityInstrumentScene.tsx`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

### 修改点

1. 保留现有设置中的三档性能模式入口，不在右侧参数栏新增小球数量或速度控件。三档显示名称固定为“高性能 / 均衡 / 低负载”。
   - 当前 copy 字段名仍是 `performanceModeOff`、`performanceModeBalanced`、`performanceModeOn`，实现时可以保留字段名但必须更新显示文案：`performanceModeOff = 高性能`、`performanceModeBalanced = 均衡`、`performanceModeOn = 低负载`。
   - `performanceModeSummary` 同步更新，避免测试仍断言“高清/低负载”这种旧语义。
2. 用性能模式统一决定小球数量和速度。建议映射：

```ts
const HEAT_CAPACITY_HARD_SPHERE_PERFORMANCE_PRESETS = {
  standard: { particleMultiplier: 1.25, speedMultiplier: 1.25 },
  balanced: { particleMultiplier: 1, speedMultiplier: 1 },
  performance: { particleMultiplier: 0.5, speedMultiplier: 0.5 },
} as const;
```

3. 如果当前 `HeatCapacityInstrumentScene.tsx` 同时接收 `performanceMode` 和文件级 `hardSphereParticleMultiplier`、`hardSphereSpeedMultiplier`，则优先从 `performanceMode` 派生 multiplier，逐步停止读取文件级滑杆值。现有 scene props 可以暂时保留以降低改动面，但传入值必须来自 preset，而不是右侧栏滑杆。
4. 旧文件中已保存的 `hardSphereParticleMultiplier`、`hardSphereSpeedMultiplier` 可以继续恢复但不再展示为可调参数，避免破坏旧数据结构。
5. `hardSphereViewEnabled` 继续保留为小球可视化开关状态。右侧栏 checkbox 和三维模型窗口开关同步读写同一个字段。
6. 当前自由实验组开始后，右侧栏 checkbox 和三维模型窗口开关都要禁用；但 auto-demo interaction lock 不能成为禁用小球开关的原因。现有 `workbenchHeatCapacityInstrumentUi.test.ts` 中关于 auto-demo lock 的断言要改为区分这两种锁。
7. 性能模式和小球可视化开关都是视觉设置，不写入每组实验物理参数快照，不参与结果计算。

### 测试

扩展 UI 测试：

```ts
// 1. 设置窗口存在三档性能模式文案：高性能、均衡、低负载。
// 2. 右侧 Current Parameters 中不存在 hardSphereParticleMultiplier /
//    hardSphereSpeedMultiplier 的滑杆输入。
// 3. performance preset 只影响 scene props，不影响 heatCapacityFreeParameterDraft、
//    HeatCapacityFreeConfigSnapshot 或 calculateFreeHeatCapacityMeanResult。
// 4. 右侧栏小球可视化 checkbox 与三维模型窗口开关使用同一 hardSphereViewEnabled 状态。
// 5. auto-demo interaction lock 不禁用小球开关；自由实验参数锁定会禁用小球开关。
```

运行：

```powershell
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
node .\tests\heatCapacity\heatCapacityHardSphereModel.test.ts
```

预期：性能模式替代视觉倍率，不影响数据测试。

## 12. 批次 7：全量验证和最终验收

### 自动验证

运行：

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
```

预期：

1. TypeScript 无新增错误。
2. 全部 `.test.ts` 通过。
3. Vite build 成功。

### 本地预览

固定端口启动：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

如果端口 `5174` 被占用，按仓库规则先停止占用进程或请用户确认，不静默换端口。

### 浏览器验收步骤

1. 新建热容自由实验文件，确认右侧栏直接显示基础参数：大气压、环境温度、气体-屏壁导热系数、屏壁-环境导热系数、泄漏 checkbox、仪器噪声 checkbox、小球可视化 checkbox。
2. 确认基础参数默认值与当前软件默认一致：`101.3`、`298.15`、`0.22`、`0.45`、泄漏未勾选、噪声默认勾选。
3. 点击高级参数按钮，首次出现风险提示；取消后高级窗口关闭且参数不变。
4. 再次点击高级参数按钮，确认风险后进入高级表单；同一实验文件后续打开不再重复提示。
5. 高级表单包含最终清单中的 A/B/C/D 参数，且不包含排除参数。
6. UI 中所有代号使用真下标，例如 `P0` 的 0 是下标，不能出现 `P_0`。
7. 每个参数行显示参数名和代号；右侧圆形 `?` 悬浮时显示模型作用，移开隐藏；点击后固定显示。固定后，点击当前 `?` 和帮助气泡以外任意区域只关闭信息，并拦截这一下点击。
8. 确认帮助气泡出现/消失、锁定态变灰、高级弹窗打开/关闭、风险确认弹窗、阻止提示、行内错误、checkbox、性能模式切换都有平滑过渡，且不会造成参数行跳动。
9. 在 `draft` 状态修改参数并保存，确认当前组未开始前可继续调整。
10. 开机或打气后确认参数锁定，面板变灰，鼠标悬浮为禁止符号，基础输入和高级入口都不可编辑，点击时显示锁定原因。
11. 完成或重置当前组后进入下一组，参数重新可编辑，并继承上一组最终参数。
12. 在同一实验文件内用两组不同参数完成记录，确认旧组结果不因新组参数改变。
13. 保存并重新打开实验文件，确认参数草稿、历史结果、风险确认状态、噪声开关、泄漏开关、小球可视化开关都恢复正确。
14. 切到热容指导或演示模式，确认右侧参数折叠栏无法展开，并弹出提示。
15. 标准模拟和理想气体文件的现有右侧参数行为不被本需求破坏。
16. 设置中的三档性能模式显示为“高性能 / 均衡 / 低负载”，可控制小球数量和速度；右侧栏不再有小球数量倍率和速率倍率滑杆。
17. 右侧栏的小球可视化 checkbox 与三维模型窗口上的小球可视化开关保持同步。

## 13. 断言冲突、不确定性和新增假设

本轮深度审计后，当前计划没有阻塞性待审核项。已发现的冲突都已在对应批次里转成明确修改任务：

1. trace config snapshot 需要从 v4 升到 v5，并补 `u0ZeroToleranceMv` 兼容。
2. heat capacity free runtime 需要从 v4 升到 v5，并补新增状态字段兼容。
3. `createDefaultFreeConfigSnapshot()` 不能作为 UI 默认值来源。
4. `normalizeHeatCapacityFreeSensorConfig()` 不能继续强制重置 `lagRate`。
5. `getHeatCapacityGaugePressureState()` 的警告/危险阈值硬编码必须全部替换。
6. UI 层 `HEAT_CAPACITY_FREE_RECORD_CONFIG` 必须下沉到文件状态和冻结快照。
7. 现有性能档位文案和 auto-demo 小球开关测试需要按新语义更新。

已固定的新增执行假设：

1. 高级参数弹窗的“正常桌面视口”验收按 `1366 × 768` 及以上判断。
2. 3D 小球开关只因自由实验参数锁定而禁用，不因 auto-demo interaction lock 禁用。
3. 现有 Workbench copy 暂不拆文件，直接在 `WorkbenchStudioPrototype.tsx` 内维护。

执行中如果发现新的代码事实与本节或第 1.1 节冲突，必须暂停并向用户审核，不能自行扩大范围。

## 14. 最终验收标准

实现完成后必须同时满足：

1. 参数范围只包含本方案第 2 节清单，排除参数不出现在基础区或高级区。
2. 参数调整只在热容自由实验的当前实验组 `draft` 状态可用。
3. 实验开始后参数锁定，重置到下一组后重新可调。
4. 同一实验文件内不同实验组保存各自参数快照，历史结果不被后续参数修改污染。
5. 高级参数风险提示按实验文件首次确认，取消不产生状态变更。
6. 泄漏、仪器噪声、小球可视化使用 checkbox，勾选为开，未勾选为关。
7. 基础参数默认值沿用当前软件默认配置。
8. UI 参数代号使用真下标。
9. 每个参数行都有圆形 `?` 帮助按钮，hover 临时显示，click 固定显示；固定后点击当前 `?` 和帮助气泡以外任意区域只关闭信息，并拦截这一下点击。
10. 帮助气泡、锁定态、高级主窗口、风险确认窗口、阻止提示、行内错误、checkbox、性能模式切换都具备平滑过渡，并支持 `prefers-reduced-motion`。
11. 热容演示模式和引导模式无法展开右侧参数折叠栏，尝试展开时提示；标准模拟和理想气体现有参数面板不变。
12. 小球数量和速率不再作为右侧栏可调参数，改由三档性能模式控制；三档名称为“高性能 / 均衡 / 低负载”。
13. 右侧栏小球可视化 checkbox 与三维模型窗口开关同步。
14. `npm.cmd exec tsc -- --noEmit`、`npm.cmd test`、`npm.cmd run build` 均通过。
15. 固定端口 `5174` 预览中完成第 12 节浏览器验收。
