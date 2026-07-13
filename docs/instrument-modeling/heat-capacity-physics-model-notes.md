# 空气比热容 Free Mode 建模说明

本文档记录当前 Free Mode 的底层模型、实现边界和验收点，便于后续调参、新增高级设置或继续扩展物理模型。这里记录的是当前设计事实，不是实验结果数据。

## 1. 分层原则

当前模型分为五层：

```text
用户操作
  -> Workbench 运行状态机
  -> 物理模型: 气体量 / 温度 / 压强 / 打气 / 放气 / 热交换 / 微漏
  -> 传感器模型: 响应滞后 / 噪声 / 量化 / 采样
  -> Trace: 物理层样本 + 显示层样本 + 事件
  -> 过程图 / 数据记录 / 评分
```

约束：

- 压强永远由物理状态推导，不被报警、指针或 UI 直接钳制。
- 报警只限制新的压强来源，也就是继续打气；已经存在的压强继续由模型自然演化。
- 指针压力表只绑定压强值，不绑定报警状态。
- 3D 分子表现只读取物理状态和确认后的阀门状态，不读取点击瞬间或报警状态。
- 过程图展示采样结果，不人工重画一条脱离采样数据的曲线。

## 2. 主要实现入口

| 层级 | 主要文件 | 职责 |
| --- | --- | --- |
| 统一放气状态机 | `src/domain/heatCapacity/heatCapacityReleaseModel.ts` | 三模式共用的 opening / releasing / closing 时序、尝试编号、快速开关判定和气体流动内核 |
| 统一放气配置 | `src/domain/heatCapacity/heatCapacityDefaultConfig.ts` | 动画、开度斜坡、最佳窗口和自动演示标准时长的唯一配置源 |
| 共享热力学内核 | `src/domain/heatCapacity/heatCapacityThermodynamicKernel.ts` | `n/U` 权威态、理想气体状态推导、泵入质量/能量通量和气体—瓶壁—环境换热 |
| Free 物理主循环 | `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` | 气体量、温度、压强、连续打气、连续放气、热交换、微漏 |
| 热交换 | `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts` | 气体、瓶壁、环境三节点热交换 |
| 微漏 | `src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts` | 关闭状态下由内外压差驱动的慢泄漏 |
| 共享温度传感器 | `src/domain/heatCapacity/heatCapacityTemperatureSensorModel.ts` | 三模式共用的独立 `Tsensor` 一阶迟滞 |
| Free 显示传感器 | `src/domain/heatCapacity/heatCapacityFreeSensorModel.ts` | 统一温度映射、压力响应、噪声、量化和采样历史 |
| Trace | `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts` | trace store、样本、事件、配置快照、降采样 |
| 过程图 | `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts` | 将 trace、记录值和参考曲线整理成图表数据 |
| 3D 分子映射 | `src/domain/heatCapacity/heatCapacityHardSphereModel.ts` | 分子数量、速度、颜色、定向放气运动 |
| Workbench 状态 | `src/features/workbench/workbenchState.ts` | 默认配置、运行推进、倍速、传感器采样、trace 写入 |
| Workbench UI | `src/features/workbench/WorkbenchStudioPrototype.tsx` | 将 Free Mode 物理状态映射到仪器和 3D 场景 |

## 3. 气体和瓶体主模型

核心关系保持理想气体近似：

```text
Cv = R / (gammaTrue - 1)
T_gas = internalEnergyJ / (amountMol * Cv)
P_gas = amountMol * R * T_gas / vesselVolume
deltaP = P_gas - P_ambient
U_p = deltaP * pressureMvPerKPa
```

默认环境：

```text
ambientTemperatureK = 298.15
ambientPressureKPa = 101.3
vesselVolumeL = 2
gamma = 1.4
```

核心状态：

```text
simulationTimeS
amountMol
internalEnergyJ
referenceAmountMol
wallTemperatureK
pumpStrokeCount
pumpProcesses
maxPressureKPa
releaseStarted
currentStopcockOpenDurationS
releaseReference
```

说明：

- `amountMol`（气体物质的量 `n`）和 `internalEnergyJ`（气体总内能 `U`）是运行时权威状态；温度和压强只能从这两个状态前向推导，不能从当前压力显示值反推温度。
- `referenceAmountMol` 是环境温度、环境压强和瓶体容积下的初始摩尔量；`gasAmountRatio = amountMol / referenceAmountMol` 与 `gasTemperatureK = internalEnergyJ / (amountMol * Cv)` 仅是兼容投影，不是第二套可独立写入的权威状态。
- 初始 `amountMol = referenceAmountMol`、`internalEnergyJ = amountMol * Cv * ambientTemperatureK` 时，瓶内外压强相等。
- `wallTemperatureK` 是热交换 v2 模型新增的瓶壁热容状态。

## 4. 连续打气模型

目标是让一次打气成为短时间连续过程，而不是瞬时跳变。

默认参数：

```text
pumpAmountGainRatio = 0.00334
pumpWorkRetention = 0.30
vesselVolumeL = 2 L
每次有效进气量约 6.68 mL
FREE_PUMP_STROKE_DURATION_S = 0.08
标准 18 次打气首末起点跨度 = 8 s
标准相邻打气起点间隔 = 8 / 17 s ≈ 0.470588 s
标准末次行程完成时刻 = 8.08 s
```

一次打气的累计进度曲线：

```text
0.00 s -> 0.00
0.02 s -> 0.18
0.04 s -> 0.68
0.06 s -> 0.92
0.08 s -> 1.00
```

规则：

- 用户每次有效打气会创建一个 `pumpProcess`。
- 单次打气行程持续 0.08 s；在非标准的 0.1 s 快速交互压力测试中，前一次打气应基本完成，过程图能显示出每次点击对应的独立阶梯。
- 每个推进步只应用“本步新增进度”，避免重复加气。
- 打气以进入容器的物质的量和总内能为权威状态。令本步进气量为 `Δn`，则环境气体携带的内能为 `Δn * Cv * T_ambient`，理想流动功上限为 `Δn * R * T_ambient`，写入瓶内的能量为：

```text
deltaU = deltaN * Cv * T_ambient
       + pumpWorkRetention * deltaN * R * T_ambient
n_next = n + deltaN
U_next = U + deltaU
T_next = U_next / (n_next * Cv)
P_next = n_next * R * T_next / vesselVolume
```

- `pumpWorkRetention = 0.30` 只表示理想流动功中最终保留在瓶内气体里的比例，不改变 `Δn`；生产配置必须位于 `[0, 1)`，`1` 只用于理想绝热上限测试。
- 单次打气不再直接叠加固定温升，也不直接叠加固定压强。
- 当前已进入危险区时，新打气会被拒绝；从安全区或建议区继续打气导致的跨线过程会进入危险报警，随后禁止继续打气。
- 被拒绝的打气不创建 `pumpProcess`，也不改变气体量。

验收要点：

- 单次隔离打气在充分热平衡后应约增加 7 mV 压力示数。
- 标准 18 次/8 s 打气的第 18 次峰值应进入 `120–125 mV`，封闭等待 300 s 后约为 `110–115 mV`。
- 标准空气组的温度电压峰值只要求高于 `1500 mV`；当前固定场景观测值约为 `1505.05 mV`，该观测值不构成额外的上下限验收带。
- 非标准的相邻 0.1 s 快速打气压力测试中，上升段应出现多个连续小阶梯，而不是一两个大跳变。
- 超过报警边界后，压强可自然保持或衰减，但新打气应被阻止。

数值校准边界：上述 `0.00334`、`0.30`、压力区间和温度峰值只针对空气理想气体 `gammaTrue = 1.4`、标准 18 次打气首末起点跨度 8 s，并开启生产默认漏气、泵阀交换、热交换等真实影响因素的场景。其他气体只复用质量守恒、能量守恒和连续响应模型，不沿用空气的数值验收区间。

## 5. 连续放气模型

目标是让自动演示、指导模式和自由模式共用同一套时序语义，并让真实流动只发生在阀门开启动画结束之后。

默认参数：

```text
openingAnimationDurationMs = 420
closingAnimationDurationMs = 420
releaseApertureRampS = 0.10
releaseOptimalMinS = 0.30
releaseOptimalMaxS = 0.50
autoDemoReleaseDurationS = 0.375
stopcockFlowRate = 0.79
```

规则：

- 状态机顺序为 `closed -> opening -> releasing -> closing -> closedAfterRelease`；调零开启使用 `opening -> open`，不会误记为放气。
- 用户发出打开指令时进入 `opening`。这 `420 ms` 内背景物理和模拟时钟继续推进，但主放气量、放气时长和开度积分都保持为零。
- 开启动画完成的模拟时刻是唯一的放气起点；同一时刻开度从零开始按 `0.1 s` smoothstep 斜坡积分。
- 放气时长严格等于“关闭指令模拟时刻 - 开启动画完成模拟时刻”。
- 用户发出关闭指令时立即停止主放气并冻结时长；随后的 `420 ms` 关闭动画不计入放气。
- 开启动画完成前关闭属于快速开关：时长为零、不形成 `release-start`、不产生放气阶段或失败条，但开/关操作点仍保留，关闭完成后可重新尝试。
- 只有 `releasing` 且存在向外压差时，才按实时压差、气体温度、`gamma` 和 `stopcockFlowRate` 推进真实气体外流。
- 有效开度使用 `0.1 s` smoothstep ramp：`x = clamp(releaseElapsedS / 0.1, 0, 1)`，`aperture = x * x * (3 - 2 * x)`。
- 每个物理步使用时间段内的积分开度，`0.03s` 这类极短开阀不会被 `0.05s` 点击时间或步末开度吞并。
- 放气不再预先计算目标气体量或目标温度；每个物理步都根据当前状态重新计算流量。
- `releaseReference` 只记录本次确认开阀时的起点状态，用于诊断、动画和阶段判断。
- 粒子动画、过程图和评分读取同一个放气状态与模拟时间，不再维护浏览器墙钟 burst 或视觉专用放气时钟。
- 如果放气未完成就关闭阀门，物理状态保留已经发生的部分放气结果，后续不继续向旧目标补齐。
- 结果仍由 `U0 / U1 / U2` 的压强关系计算；时长不会被直接写入 gamma，也没有人工时长惩罚。

验收要点：

- `opening` 内压强可因热交换、微漏或环境扰动继续自然演化，但不能出现主放气或定向外流。
- `releasing` 后压强和温度应快速但连续变化，且变化速度随实时压差自然改变。
- 只放一部分和完全放出时，气体量变化应不同。
- `0.03s` 和 `0.05s` 极短开阀应按真实物理时长产生明显不足放气结果。
- `0.375 s` 标准操作应接近理论 gamma；明显过短和过长的真实操作应产生更大的绝对误差。
- 自动演示固定使用 `0.375 s`；指导和自由模式允许用户随时关闭，`0.30–0.50 s`（含边界）获得完整时序分。
- 评分明细、放气分项与百分制总分统一量化为 `0.5` 分的整数倍；恰好位于两个半分档之间时使用“四舍六入五成双”，整数不显示小数，半分显示一位小数。

跨模式关系：

- 自动演示、指导模式和自由模式从 `heatCapacityDefaultConfig.ts` 读取同一套核心环境、容积、气体、打气、热交换和放气参数。
- 指导模式对应自由模式的一组确定性配置：关闭微漏、泵阀交换、环境扰动、传感器噪声和低压非线性，保留同一套基础热交换参数。
- 对 `0.30 s`、`0.375 s`、`0.50 s` 三个主放气时长及其后 `300 s` 密闭恢复，指导物理状态与上述自由模式配置的气体量、气体温度和压差必须逐项一致。
- 自由模式界面中的“理想参数组”还可能调整热导，因此它不是指导模式的别名；指导模式的精确对照是“自由模式真实物理核心 + 所有非理想开关关闭”。

## 6. 热交换 v2 模型

当前热交换采用三节点模型：

```text
气体 <-> 瓶壁 <-> 环境
```

基础思想是牛顿冷却/线性热导近似：单位时间热交换量与温差成正比。

```text
gasWallHeatFlowW = gasWallConductanceWPerK * (wallTemperatureK - gasTemperatureK)
wallAmbientHeatFlowW = wallAmbientConductanceWPerK * (ambientTemperatureK - wallTemperatureK)
```

设计目的：

- 气体不直接瞬间回到室温。
- 气体先和瓶壁换热，瓶壁再和环境换热。
- 瓶壁有热容，所以刚打完气后不会马上大幅回温。
- 温差越大，升温或降温速率越快；接近平衡时速率自然变慢。

当前边界：

- 环境温度在一次实验内为常量。
- 底层温度使用 K。
- UI 当前显示仍沿用实验界面的 U_t / 换算温差表示。

## 7. 微漏模型

当前微漏模型已经接入。自由模式真实参数默认开启弱微漏；指导模式和关闭非理想因素的确定性检验不启用微漏。

规则：

- 只有在 `enabled = true` 且阀门关闭时生效。
- 漏气速率由瓶内外压差驱动。
- 微漏只让压强缓慢衰减，不参与报警夹断。
- 演示模式和引导模式默认不需要微漏。

用途：

- 关闭微漏时，用于更精确地观察理想封闭模型。
- 开启微漏时，用于更真实地模拟实验装置的慢泄漏。

## 8. 传感器和采样模型

传感器层和物理层分开。真实气体温度 `Tgas` 参与状态方程和换热；独立状态 `Tsensor` 只决定温度电压显示，不能回写物理引擎：

```text
dTsensor / dt = (Tgas - Tsensor) / tauSensor
tauSensor = 0.8 s
UT = 1498.7 mV + 5.0 mV/K * (Tsensor - T_ambient)
```

自由、引导和演示模式最终都使用这套共享映射。新建和重置时必须显式令 `Tgas = Twall = Tsensor = T_ambient`；旧存档缺少 `Tsensor` 时只在恢复边界做一次迁移，不能重新引入模式专属的温度灵敏度。

常规采样参数：

```text
sampleIntervalMinS = 0.08
sampleIntervalMaxS = 0.12
```

快速过程采样规则：

```text
activeFastProcessStepS = 0.04
```

当存在以下任一快速过程时，运行推进会切成更密的内部段，并强制显示层传感器在每段采样：

- 存在未完成的 `pumpProcess`。
- 阀门确认接通且瓶内压强仍高于环境压强。

打气阶段会使用更快的压力显示响应，避免非标准的 0.1 s 快速交互压力测试被传感器滞后拖成一段连续斜坡。温度通道不复用压力通道的快速响应或 UI 平滑，而是始终沿共享 `Tsensor` 一阶模型连续推进，因此显示会以连续小数变化追随真实温度，不会瞬间跳到最终值。

Trace 写入仍会屏蔽过小的显示层波动，避免后台采集点被噪声填满。

验收要点：

- 打气和放气过程中，显示层采样点应足够密。
- 打气、放气和关阀回温时，`Tgas` 可以快速变化，但 `UT` 必须按 `Tsensor` 的时间常数连续跟随。
- 等待倍速必须同时推进 `Tgas`、`Twall` 和 `Tsensor`，不能只推进倒计时或压力通道。
- 后台 trace 不应因为噪声产生大量无意义点。
- 过程图展示的是采样结果，而不是 UI 人工修饰曲线。

## 9. 3D 分子可视化映射

当前 3D 分子不再直接用压强控制数量，而是用更接近物理含义的状态控制。

规则：

- 分子数量由 `gasAmountRatio` 决定。
- 分子速度和颜色由 `gasTemperatureK - ambientTemperatureK` 决定。
- 分子定向漂移只在 `releaseFlowActive = true` 且 `stopcockFlowOpen = true` 且压差未平衡时出现；分子离开数量由 release timeline 的显式预算控制。
- 打气过程中的新分子从打气口进入，强度由未完成打气过程的剩余进度综合决定。
- 报警状态不直接影响分子数量、分子颜色、分子速度或定向运动。

视觉映射可以适度夸张，但必须保持不同阶段之间的相对关系：

- 打气后气体量增加，分子数增加。
- 部分放气后分子数只部分降低。
- 完全放气后分子数更接近环境基线。
- 温度高于环境时分子更快、颜色更热；接近环境时逐渐回落。

## 10. 等待倍速

当前 Free Mode 支持等待倍速：

```text
可选倍率 = x2 / x4 / x8 / x16
默认倍率 = x4
```

规则：

- 倍速只用于封闭等待稳定和回温等待这类等待阶段。
- 主动打气节奏、`420 ms` 阀门动画和真实放气窗口不因等待倍率而缩短。
- 图表横轴使用底层模拟时间，不使用用户实际等待墙钟时间。
- 因此 x16 等待只会让系统更快推进到相同的模拟时刻，不会把过程图压缩成 1/16 的物理时间长度。

## 11. 当前不做的内容

以下内容记录为后续方向，不属于当前已实现范围：

- 更精细的放气阀几何开度、阀孔面积和真实阀芯结构标定。
- 更复杂的泵腔、单向阀、管路死体积模型。
- 外界环境温度随时间变化。
- 视觉线条平滑算法。
- 主界面参数面板和高级参数窗口。

## 12. 本轮回归验收清单

代码级验收：

- 连续打气过程可重叠，非标准的 0.1 s 快速交互压力测试不会合并成单次大跳。
- 连续放气只在 `420 ms` 开启动画完成后开始；自动演示主放气严格持续 `0.375 s`。
- 点击阀门但未确认接通时，不触发定向分子运动。
- 快速开关不形成放气，关闭完成后可再次正常开阀放气。
- 分子数量由气体量控制，压力报警不直接控制分子数量。
- 分子颜色和速度由气体温度相对环境温度控制。
- 快速过程期间传感器采样更密，trace 仍屏蔽小波动。

视觉验收：

- 打气上升段应有多个连续小阶梯。
- 以非标准的 0.1 s 快速节奏打 4 次时，应能看到 4 个清晰的压强阶梯，而不是一段连续斜坡。
- 放气下降段应快速但连续，不是单点跳变。
- 阀门确认接通后才能看到分子定向外流。
- 打气和放气后，3D 分子数量变化与瓶内气体量方向一致。
- 等待倍速出现时，图表时间轴仍对应模拟时间。
