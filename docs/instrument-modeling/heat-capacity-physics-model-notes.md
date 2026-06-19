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
| Free 物理主循环 | `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` | 气体量、温度、压强、连续打气、连续放气、热交换、微漏 |
| 热交换 | `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts` | 气体、瓶壁、环境三节点热交换 |
| 微漏 | `src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts` | 关闭状态下由内外压差驱动的慢泄漏 |
| 传感器 | `src/domain/heatCapacity/heatCapacityFreeSensorModel.ts` | 显示滞后、噪声、量化、采样历史 |
| Trace | `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts` | trace store、样本、事件、配置快照、降采样 |
| 过程图 | `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts` | 将 trace、记录值和参考曲线整理成图表数据 |
| 3D 分子映射 | `src/domain/heatCapacity/heatCapacityHardSphereModel.ts` | 分子数量、速度、颜色、定向放气运动 |
| Workbench 状态 | `src/features/workbench/workbenchState.ts` | 默认配置、运行推进、倍速、传感器采样、trace 写入 |
| Workbench UI | `src/features/workbench/WorkbenchStudioPrototype.tsx` | 将 Free Mode 物理状态映射到仪器和 3D 场景 |

## 3. 气体和瓶体主模型

核心关系保持理想气体近似：

```text
P_gas = P_ambient * gasAmountRatio * gasTemperatureK / ambientTemperatureK
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
gasAmountRatio
gasTemperatureK
wallTemperatureK
pumpStrokeCount
pumpProcesses
maxPressureKPa
releaseStarted
currentStopcockOpenDurationS
releaseReference
```

说明：

- `gasAmountRatio = 1` 且 `gasTemperatureK = ambientTemperatureK` 时，瓶内外压强相等。
- `gasAmountRatio` 代表瓶内气体摩尔量相对初始状态的比例。
- `wallTemperatureK` 是热交换 v2 模型新增的瓶壁热容状态。

## 4. 连续打气模型

目标是让一次打气成为短时间连续过程，而不是瞬时跳变。

默认参数：

```text
pumpAmountGainRatio = 0.00345
vesselVolumeL = 2 L
每次有效进气量约 6.9 mL
pumpInflowTemperatureRiseK = 42
FREE_PUMP_STROKE_DURATION_S = 0.08
推荐相邻打气间隔 = 0.1 s
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
- 打气过程短于推荐 0.1 s 节奏；0.1 s 连续点击时，前一次打气应基本完成，过程图能显示出每次点击对应的独立阶梯。
- 每个推进步只应用“本步新增进度”，避免重复加气。
- 打气以进入容器的气体物质的量为自变量；温度由原容器气体与高于环境温度的进气混合得到，压强再由状态方程推导。
- 单次打气不再直接叠加固定温升，也不直接叠加固定压强。
- 当前已进入危险区时，新打气会被拒绝；从安全区或建议区继续打气导致的跨线过程会进入危险报警，随后禁止继续打气。
- 被拒绝的打气不创建 `pumpProcess`，也不改变气体量。

验收要点：

- 单次隔离打气在充分热平衡后应约增加 7 mV 压力示数。
- 快速连续打气达到约 127 mV 后，封闭等待 300 s 应回到约 114 mV。
- 相邻 0.1 s 打气时，上升段应出现多个连续小阶梯，而不是一两个大跳变。
- 超过报警边界后，压强可自然保持或衰减，但新打气应被阻止。

## 5. 连续放气模型

目标是让放气成为确认阀门接通后的短时间连续过程，并修正“点击阀门就触发分子定向运动”的问题。

默认参数：

```text
stopcockFlowRate = 5.25
stopcockApertureRampS = 0.10
releaseVisualResponseDelayS = 0.02
releaseVisualMainDurationS = 0.18
```

规则：

- 用户点击阀门只会启动阀门动画和状态过渡。
- 只有阀门状态确认接通后，才按实时压差、气体温度、`gamma` 和 `stopcockFlowRate` 推进真实气体流动。
- 阀门确认接通后，真实放气流量还会乘以有效开度 `aperture(openElapsedS)`。
- 有效开度使用 `0.1s` smoothstep ramp：`x = clamp(openElapsedS / 0.1, 0, 1)`，`aperture = x * x * (3 - 2 * x)`。
- 每个物理步使用时间段内的积分开度，`0.03s` 这类极短开阀不会被 `0.05s` 点击时间或步末开度吞并。
- 放气不再预先计算目标气体量或目标温度；每个物理步都根据当前状态重新计算流量。
- `releaseReference` 只记录本次确认开阀时的起点状态，用于诊断、动画和阶段判断。
- `releaseVisualResponseDelayS` 和 `releaseVisualMainDurationS` 只用于硬球粒子动画展示，不参与 U2 物理数值计算。
- 如果用户很快连续点击导致阀门只做无效开合，但没有确认接通，则不发生真实放气，也不触发定向分子流。
- 如果放气未完成就关闭阀门，物理状态保留已经发生的部分放气结果，后续不继续向旧目标补齐。

验收要点：

- 点击阀门但尚未确认接通时，3D 分子不能出现定向外流。
- 确认接通后，压强和温度应快速但连续变化，且变化速度随实时压差自然改变。
- 只放一部分和完全放出时，气体量变化应不同。
- `0.03s` 和 `0.05s` 极短开阀应按真实物理时长产生明显不足放气结果。

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

当前微漏模型已经接入，但默认关闭。

规则：

- 只有在 `enabled = true` 且阀门关闭时生效。
- 漏气速率由瓶内外压差驱动。
- 微漏只让压强缓慢衰减，不参与报警夹断。
- 演示模式和引导模式默认不需要微漏。

用途：

- 关闭微漏时，用于更精确地观察理想封闭模型。
- 开启微漏时，用于更真实地模拟实验装置的慢泄漏。

## 8. 传感器和采样模型

传感器层和物理层分开。

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

打气阶段会使用更快的压力显示响应，避免 0.1 s 连续打气被传感器滞后拖成一段连续斜坡。

Trace 写入仍会屏蔽过小的显示层波动，避免后台采集点被噪声填满。

验收要点：

- 打气和放气过程中，显示层采样点应足够密。
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
- 主动打气节奏、阀门确认、0.2 s 放气窗口不因等待倍率而缩短。
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

- 连续打气过程可重叠，0.1 s 相邻打气不会合并成单次大跳。
- 连续放气只在确认接通后开始，0.2 s 内完成快速连续释放。
- 点击阀门但未确认接通时，不触发定向分子运动。
- 分子数量由气体量控制，压力报警不直接控制分子数量。
- 分子颜色和速度由气体温度相对环境温度控制。
- 快速过程期间传感器采样更密，trace 仍屏蔽小波动。

视觉验收：

- 打气上升段应有多个连续小阶梯。
- 以 0.1 s 节奏打 4 次时，应能看到 4 个清晰的压强阶梯，而不是一段连续斜坡。
- 放气下降段应快速但连续，不是单点跳变。
- 阀门确认接通后才能看到分子定向外流。
- 打气和放气后，3D 分子数量变化与瓶内气体量方向一致。
- 等待倍速出现时，图表时间轴仍对应模拟时间。
