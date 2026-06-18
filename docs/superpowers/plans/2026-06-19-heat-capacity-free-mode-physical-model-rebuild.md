# Free Mode 物理模型重建与验收计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将空气比热容比 Free Mode 的 U2 产生链路改为由开阀流动、热交换、漏气和实际操作时间共同推进得到，并用固定实验操作组验证理论、合理和错误操作的结果边界。

**Architecture:** 保留 `stepFreePhysics` 作为唯一物理推进入口，不恢复“理论 gamma 直接反推 U2”的旧路径。把开阀流动、热交换、漏气分别做成可单测的物理子模型，再通过场景扫描验证它们组合后的 U1、U2、gamma。参数调整先服务“真实实验默认参数组”，理想参数组和 UI 模式切换放到后续 P2/P3。

**Tech Stack:** TypeScript, Node `.test.ts` 测试脚本, `src/domain/heatCapacity` Free Mode 物理层, `tests/heatCapacity` 场景验收脚本。

---

## 0. 执行状态记录

2026-06-19 断点记录：

- [x] Task 1 验收脚手架已扩展：支持具名场景、泵总时长、U1/U2 等待、漏气开关/强度、噪声关闭，并输出压力、温度、气体量。
- [x] Task 2 开阀流动已改为实时压比驱动的可压缩孔口流简化模型，不再用理论 U2 目标。
- [x] Task 3 漏气已改为压强平方差驱动，真实默认弱漏已开启，默认弱漏率为 `0.00005/s`。
- [x] Task 4 热交换已加入温差驱动的有效气壁换热系数，内部拐点使用 `4K`，不新增 UI 参数。
- [x] Task 5 打气节奏验收已补充：3s 内打气与理论打气等价；60s 慢打气会降低 U1 信号，但在当前弱漏和无泵腔模型下 gamma 基本稳定。
- [ ] Task 6 第 5 下报警行为尚未修改；路径考古显示旧报警/退出聚焦路径仍存在，可在下一批按最小改动恢复。
- [ ] Task 7 最终报告/文档同步尚未完成，本节先记录断点扫描表。

断点扫描表：

| ID | gamma | U1/mV | U2/mV | P/kPa | T/K | nRatio | 结论 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| T0 | 1.3802 | 117.88 | 31.81 | 102.8904 | 298.1388 | 1.015739 | 理论中心落在 `1.40 ± 0.02` 下边界内。 |
| T0b-open-0.50 | 1.3581 | 117.88 | 30.44 | 102.8218 | 298.1386 | 1.015061 | 文献半秒开阀偏低，暂不切换默认中心。 |
| R1-u1-280 | 1.3801 | 118.13 | 31.87 | 102.8935 | 298.1388 | 1.015769 | U1 提前 20s 稳定。 |
| R1-u1-320 | 1.3803 | 117.63 | 31.75 | 102.8873 | 298.1388 | 1.015708 | U1 滞后 20s 稳定。 |
| R2-u2-280 | 1.3810 | 117.88 | 31.86 | 102.8928 | 298.1364 | 1.015770 | U2 提前 20s 稳定。 |
| R2-u2-320 | 1.3794 | 117.88 | 31.76 | 102.8879 | 298.1407 | 1.015707 | U2 滞后 20s 稳定。 |
| R3-open-0.15 | 1.3802 | 117.88 | 31.81 | 102.8904 | 298.1388 | 1.015739 | 偏快 0.10s 不再过敏。 |
| R3-open-0.35 | 1.3724 | 117.88 | 31.33 | 102.8665 | 298.1387 | 1.015503 | 偏慢 0.10s 轻微偏低。 |
| E1-open-0.10 | 1.3876 | 117.88 | 32.26 | 102.9127 | 298.1388 | 1.015958 | 放气偏短，gamma 偏高。 |
| E2-open-0.95 | 1.3366 | 117.88 | 29.06 | 102.7528 | 298.1385 | 1.014381 | 长开阀明显偏低。 |
| E2-open-2.25 | 1.2707 | 117.88 | 24.56 | 102.5279 | 298.1380 | 1.012163 | 极长开阀大幅偏低。 |
| E2-open-6.25 | 1.1577 | 117.88 | 15.67 | 102.0833 | 298.1373 | 1.007775 | 离谱长开阀接近错误结果。 |
| E3-u2-0 | 1.1646 | 117.88 | 16.26 | 101.3423 | 293.5178 | 1.016206 | U2 过早记录明显偏低。 |
| E3-u2-60 | 1.3814 | 117.88 | 31.88 | 102.8940 | 298.0371 | 1.016120 | 60s 已基本恢复。 |
| E4-pump-15s | 1.3803 | 117.79 | 31.79 | 102.8893 | 298.1388 | 1.015728 | 慢打气对 U1 有轻微影响。 |
| E4-pump-30s | 1.3803 | 117.70 | 31.77 | 102.8882 | 298.1388 | 1.015716 | U1 继续下降，gamma 基本稳定。 |
| E4-pump-60s | 1.3803 | 117.51 | 31.72 | 102.8859 | 298.1387 | 1.015694 | 当前模型能诊断慢打气信号下降，但不能让 gamma 大幅变化。 |
| E5-one-stroke | 1.3853 | 29.49 | 8.16 | 101.7079 | 298.1472 | 1.004037 | 允许记录，低信号明显。 |
| E5-two-strokes | 1.3859 | 58.97 | 16.25 | 102.1127 | 298.1444 | 1.008042 | 允许记录，低信号明显。 |
| E5-three-strokes | 1.3769 | 88.43 | 23.83 | 102.4915 | 298.1415 | 1.011791 | 接近有效信号下限。 |
| L1-weak-600 | 1.3659 | 117.88 | 30.93 | 102.8467 | 298.1494 | 1.015270 | 弱漏长等 600s 有可见偏低。 |
| L1-weak-1800 | 1.3118 | 117.88 | 27.42 | 102.6708 | 298.1500 | 1.013532 | 弱漏超长等待明显偏低。 |
| L2-strong-300 | 1.0986 | 35.71 | 3.18 | 101.4588 | 298.1467 | 1.001579 | 强漏主导，接近内外压平衡。 |
| L2-strong-600 | 1.0282 | 35.71 | 0.97 | 101.3483 | 298.1498 | 1.000477 | 强漏进一步接近平衡。 |
| L2-strong-1800 | 1.0003 | 35.72 | 0.01 | 101.3004 | 298.1500 | 1.000004 | 强漏几乎完全平衡。 |

2026-06-19 回温微调记录：

- 将真实默认 `gasWallConductanceWPerK` 从 `0.22` 保守下调到 `0.14`，用于让 U2 回温稍慢。
- 没有调整 `wallAmbientConductanceWPerK`、`wallHeatCapacityJPerK`、漏气率或开阀流量，避免同时移动太多机制。
- 选择 `0.14` 而不是扫描中更慢的 `0.12`，原因是 `0.12` 会更明显削弱长开阀错误组；`0.14` 只让 60s 回温从“略高于 T0”变成“略低于 T0”，对其他组影响更小。

微调后核心扫描：

| ID | gamma | U1/mV | U2/mV | P/kPa | T/K | nRatio | 结论 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| T0 | 1.3807 | 117.88 | 31.84 | 102.8918 | 298.1378 | 1.015756 | 理论中心基本不动。 |
| R2-u2-60 | 1.3797 | 117.88 | 31.78 | 102.8893 | 298.0184 | 1.016137 | 60s 仍低于 300s，回温不再等同于完成。 |
| R2-u2-280 | 1.3814 | 117.88 | 31.88 | 102.8942 | 298.1352 | 1.015787 | 合理提前 20s 仍稳定。 |
| R2-u2-320 | 1.3799 | 117.88 | 31.79 | 102.8894 | 298.1399 | 1.015724 | 合理滞后 20s 仍稳定。 |
| R3-open-0.15 | 1.3880 | 117.87 | 32.28 | 102.9138 | 298.1379 | 1.015972 | 合理偏快仍在目标范围内。 |
| R3-open-0.35 | 1.3807 | 117.88 | 31.84 | 102.8918 | 298.1378 | 1.015755 | 合理偏慢稳定。 |
| E2-open-0.95 | 1.3521 | 117.88 | 30.06 | 102.8026 | 298.1376 | 1.014875 | 长开阀仍偏低。 |
| E2-open-2.25 | 1.3111 | 117.88 | 27.37 | 102.6682 | 298.1374 | 1.013550 | 极长开阀仍明显偏低。 |
| L1-weak-600 | 1.3666 | 117.87 | 30.97 | 102.8483 | 298.1493 | 1.015287 | 弱漏长等仍可见。 |
| L1-weak-1800 | 1.3123 | 117.88 | 27.45 | 102.6723 | 298.1500 | 1.013546 | 弱漏超长等待仍明显偏低。 |

## 1. 当前设计结论

- Free Mode 的 U2 不应再由 `gamma -> 理论 U2 -> 修饰偏差` 生成，而应由状态量 `gasAmountRatio`、`gasTemperatureK`、`wallTemperatureK` 和压力差随时间自然演化得到。
- `gamma = 1.4` 仍然是空气的客观待测物理量，它参与绝热能量关系、流出/流入气体携带的焓、气体热容计算，而不是一个后处理“答案锚点”。
- 本轮不加新的可见 UI 参数，不做理想/真实模式切换 UI，不重写诊断报告。底层可使用内部常量和现有参数映射，但不得新增“慢打气惩罚”这类只为拟合结果的假机制。
- 校准模型时先关闭随机噪声、记录扰动和环境扰动。当前项目里环境扰动尚未接入，传感器噪声可通过 `instrumentNoiseEnabled=false` 和 `noiseMv=0` 隔离。
- 5min 是真实操作的固定等待规则：U1 从最后一下打气后等 300s，U2 从关闭旋塞后等 300s。用户可提前或滞后记录，底层继续演进，不做硬性拦截。
- 开阀理论中心先保留当前软件中心 `0.25s`，同时新增 `0.50s` 文献对照组。若后续决定切换到文献更常见的“约半秒”，验收组已经能直接比较影响。

## 2. 文件责任

| 文件 | 责任 |
| --- | --- |
| `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` | 重建开阀流动模型；把流动方向、流量、能量携带全部绑定实时压力差和温度。 |
| `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts` | 在现有牛顿冷却基础上增加温差驱动的有效换热能力，用于慢打气和回温阶段。 |
| `src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts` | 将漏气从线性压差模型改为气体微漏更合理的压强平方差驱动，并保留不越过平衡压力的夹取。 |
| `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts` | 调整真实实验默认参数；校准期间提供噪声关闭的参数组合。 |
| `tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts` | 扩展可脚本化操作：泵次数、泵总时长、U1 等待、开阀时长、U2 等待、漏气强度、噪声开关。 |
| `tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts` | 输出固定组合扫描表，供调参和回归测试使用。 |
| `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts` | 断言理论、合理、错误操作的方向和区间。 |
| `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts` | 单测开阀流动方向、零压差无流动、近环境压不越界、长开阀趋向环境压。 |
| `tests/heatCapacity/heatCapacityFreeLeakageModel.test.ts` | 单测漏气方向、压强平方差驱动、平衡夹取、弱漏/强漏差异。 |
| `tests/heatCapacity/heatCapacityFreeThermalModel.test.ts` | 单测温差越大换热越强、线性小温差稳定、数值不发散。 |

## 3. 物理模型设计

### 3.1 开阀流动模型

采用可压缩孔口流的简化形式。每个子步先计算实时压力：

```text
Pgas = Pamb * gasAmountRatio * gasTemperatureK / Tamb
```

如果 `abs(Pgas - Pamb)` 小于近似零阈值，则本子步无粒子输送。如果 `Pgas > Pamb`，气体从瓶内流出；如果 `Pgas < Pamb`，外界空气流入。上游压强 `Pu`、下游压强 `Pd` 按流向选择。

流量使用无量纲驱动：

```text
r = Pd / Pu
rCritical = (2 / (gamma + 1)) ^ (gamma / (gamma - 1))
rEffective = max(r, rCritical)
phi = sqrt((2 * gamma / (gamma - 1)) * (rEffective^(2/gamma) - rEffective^((gamma + 1)/gamma)))
dnRatio = Copen * (Pu / Pamb) * sqrt(Tamb / Tup) * phi * dt
```

能量更新仍使用 `cv = 1 / (gamma - 1)` 和 `cp = gamma * cv`：

```text
流出: E_next = n * cv * Tg - dn * cp * Tg
流入: E_next = n * cv * Tg + dn * cp * Tamb
T_next = E_next / (n_next * cv)
```

关键约束：

- 流动只由实时压差决定，不直接使用理论 U2。
- 接近环境压后自动变慢，避免 0.15s 和 0.35s 两端过度敏感。
- 长时间开阀会继续随温度回升产生新的压差并输送粒子，直到趋向内外压力平衡。
- 极端压差使用临界压比上限，避免流量无限增长。

### 3.2 热交换模型

当前 `stepFreeThermalState` 已经是温差越大热量越大：

```text
QgasWall = GgasWall * (Tgas - Twall) * dt
QwallAmbient = GwallAmbient * (Twall - Tamb) * dt
```

下一步保留这个骨架，但把 `GgasWall` 改成有效换热系数：

```text
deltaT = abs(Tgas - Twall)
boost = min(MAX_BOOST, (deltaT / THERMAL_KNEE_K)^0.25)
GgasWallEffective = GgasWall * (1 + NATURAL_CONVECTION_GAIN * boost)
```

设计理由：

- 自然对流常用 Rayleigh/Nusselt 经验关联式，温差增大时换热增强；指数 `0.25` 是低复杂度近似，不引入完整几何尺度和空气物性表。
- 小温差区域仍接近当前线性模型，保证 5min 合理等待区间不被破坏。
- 慢打气不会被专门惩罚；慢打气期间的热交换只是因为高温状态持续更久而自然发生。

需要明确的物理边界：

- 如果漏气完全关闭，并且最后从最后一下打气后等待足够久，慢打气对最终 U1/U2 的影响理论上不应非常大。强行让它大幅改变 gamma 会变成非物理惩罚。
- 因此慢打气的主要结果影响应来自“高压持续时间更长导致漏气积累”和“壁温记忆影响后续回温”，验收时要量化这个上限。

### 3.3 漏气模型

当前漏气是线性压差：

```text
dnLeak ~ ratePerS * abs((Pgas - Pamb) / Pamb) * dt
```

下一步改成气体微漏/毛细通道更合理的压强平方差驱动：

```text
x = Pgas / Pamb
drive = sign(x - 1) * abs(x^2 - 1)
dnLeak = Cleak * drive * dt
```

关键约束：

- `x = 1` 时漏气为 0。
- 轻微压差附近近似线性，不制造奇怪跳变。
- 高压差时漏气更明显，有利于让慢打气和过度打气产生真实影响。
- 每步夹取到当前温度下的平衡量：

```text
equilibriumAmountRatio = Tamb / Tgas
```

即漏气不能一步跨过内外气压相等的位置。

### 3.4 泵气节奏

本轮不加入泵腔几何和橡皮球内部状态。泵气节奏通过操作事件时间体现：

- 理论打气：4 下近似瞬间完成，作为绝热打气中心。
- 合适打气：4 下总时长不超过 3s，gamma 与理论打气差异目标 `<= 0.005`。
- 错误慢打气：4 下总时长超过 15s，允许模型通过漏气和热交换自然跑出偏差，不设置上限。
- 快打气不惩罚；越快越接近绝热打气。

如果执行后发现“15s/30s 慢打气仍几乎不影响结果”，不要增加假惩罚。应记录为物理上限，并在下一轮讨论是否加入真实泵腔模型或把慢打气主要交给诊断报告评分。

## 4. 验收操作组

所有组合第一轮都用噪声关闭参数运行。表中 gamma 区间是本轮调参目标，不是永久物理常数。

| ID | 泵气 | U1 等待 | 开阀 | U2 等待 | 漏气 | 目标 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| T0 | 4 下，近似瞬间 | 300s | 0.25s | 300s | 真实默认弱漏 | gamma 在 `1.40 ± 0.02`。 |
| T0b | 4 下，近似瞬间 | 300s | 0.50s | 300s | 真实默认弱漏 | 文献对照点；结果不应灾难性偏离，用于判断是否切换开阀中心。 |
| R1 | 4 下，近似瞬间 | 280/320s | 0.25s | 300s | 真实默认弱漏 | 与 T0 接近，优先保持 `±0.02`。 |
| R2 | 4 下，近似瞬间 | 300s | 0.25s | 280/320s | 真实默认弱漏 | 与 T0 接近，优先保持 `±0.02`。 |
| R3 | 4 下，近似瞬间 | 300s | 0.15/0.35s | 300s | 真实默认弱漏 | 合理开阀波动不应出现当前 `0.15s -> 1.47` 级别偏差；目标优先压入 `1.40 ± 0.04`。 |
| R4 | 4 下，总时长 3s | 300s | 0.25s | 300s | 真实默认弱漏 | 与理论打气差异 `<= 0.005`。 |
| E1 | 4 下，近似瞬间 | 300s | 0.10s | 300s | 真实默认弱漏 | 明显偏高或无效，表示放气不足。 |
| E2 | 4 下，近似瞬间 | 300s | 0.95/2.25/6.25s | 300s | 真实默认弱漏 | 随开阀过长逐步偏低或无效，表示过放气。 |
| E3 | 4 下，近似瞬间 | 300s | 0.25s | 0/60s | 真实默认弱漏 | 过早记录 U2 应偏低，60s 应比 0s 更接近 T0。 |
| E4 | 4 下，总时长 15/30/60s | 300s | 0.25s | 300s | 真实默认弱漏 | 慢打气应产生可检测偏差；方向和幅度由模型输出，不强行规定。 |
| E5 | 1/2/3 下，近似瞬间 | 300s | 0.25s | 300s | 真实默认弱漏 | 允许记录，U1 幅度随泵数显著降低；gamma 可接近理论，但诊断层后续标记低信号。 |
| L1 | 4 下，近似瞬间 | 300s | 0.25s | 300/600/1800s | 真实默认弱漏 | 弱漏不应 300s 就主导结果，但长等待应逐渐可见。 |
| L2 | 4 下，近似瞬间 | 300s | 0.25s | 300/600/1800s | 强漏 | 压力明显趋向内外平衡，gamma 大幅偏离或无效。 |
| P5 | 5 下 | 300s | 0.25s | 300s | 真实默认弱漏 | 如果旧报警路径存在，第 5 下触发报警并禁止继续打气；若旧路径缺失，本轮只记录缺口。 |

## 5. 执行任务

### Task 1: 扩展验收脚手架

**Files:**

- Modify: `tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`

- [ ] **Step 1: 写失败测试**

新增参数化输入：

```ts
interface HeatCapacityFreeScenarioInput {
  pumpStrokes: number;
  pumpTotalDurationS: number;
  waitAfterPumpS: number;
  openDurationS: number;
  waitAfterReleaseS: number;
  leakageRatePerS?: number;
  leakageEnabled?: boolean;
  instrumentNoiseEnabled?: boolean;
}
```

断言 T0、R1、R2、R3、R4、E1、E2、E3、E4、L1、L2 都能生成行，并且包含 `U1CorrectedMv`、`U2CorrectedMv`、`gamma`、`pressureKPa`、`gasTemperatureK`、`gasAmountRatio`。

- [ ] **Step 2: 跑测试确认失败**

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

Expected: FAIL，因为当前脚手架还不支持泵总时长、漏气开关和 5min 组合扫描。

- [ ] **Step 3: 最小实现脚手架**

扩展现有 `simulateRow`，让泵气可以按 `pumpTotalDurationS / (pumpStrokes - 1)` 间隔触发。`pumpStrokes <= 1` 时不除零。

- [ ] **Step 4: 输出扫描表**

保留 `HSL_PRINT_HEAT_BASELINE=1` 或新增 `HSL_PRINT_HEAT_ACCEPTANCE=1`，运行后能打印每组结果。

- [ ] **Step 5: 跑测试**

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

Expected: 新脚手架通过；区间断言可以先按当前模型失败，用于驱动后续物理模型修改。

### Task 2: 重建开阀流动

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`
- Test: `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`

- [ ] **Step 1: 写单测**

覆盖：

```text
零压差: 开阀 1s 后 amount 和 temperature 基本不变。
高于环境压: amount 下降，temperature 因绝热流出下降。
低于环境压: amount 上升，temperature 因外界空气流入回升。
长开阀: 不越过环境压过多，最终趋近环境压。
0.15/0.25/0.35s: 合理开阀波动不再过强。
```

- [ ] **Step 2: 实现孔口流函数**

在 `heatCapacityFreePhysicsEngine.ts` 内部新增私有函数：

```ts
const calculateOpenStopcockFlowAmountRatio = (input: {
  gasPressureKPa: number;
  ambientPressureKPa: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  gamma: number;
  coefficient: number;
  dtS: number;
}) => {
  // returns signed dnRatio; positive means inflow, negative means outflow
};
```

用该函数替换当前 `flowFraction` 和 `outflowToAmbientRatio / inflowToAmbientRatio` 的线性指数推进。

- [ ] **Step 3: 保留能量守恒路径**

流出/流入后的温度仍通过 `cv/cp` 和能量计算得到，不直接设置目标温度。

- [ ] **Step 4: 校准 `stopcockFlowRate` 映射**

先保留 UI 上的 `stopcockFlowRate` 字段名，把它解释为开阀有效系数 `Copen` 的映射来源。调参目标优先级：

```text
0.25s 接近 1.40
0.15s 和 0.35s 不再过度偏离
0.95s、2.25s、6.25s 仍明显错误
```

- [ ] **Step 5: 跑测试**

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

### Task 3: 重建漏气模型

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`
- Test: `tests/heatCapacity/heatCapacityFreeLeakageModel.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`

- [ ] **Step 1: 写单测**

覆盖：

```text
Pgas == Pamb: 无漏气。
Pgas > Pamb: amount 下降。
Pgas < Pamb: amount 上升。
弱漏 300s: 不应主导理论操作。
强漏或长等待: 明显趋向内外气压平衡。
```

- [ ] **Step 2: 替换驱动函数**

把线性 `pressureDifferenceRatio` 改成：

```ts
const pressureRatio = gasPressureKPa / ambientPressureKPa;
const drive = Math.sign(pressureRatio - 1) * Math.abs(pressureRatio * pressureRatio - 1);
const amountStep = safeConfig.ratePerS * Math.abs(drive) * dtS;
```

保留 `equilibriumAmountRatio` 夹取。

- [ ] **Step 3: 调整真实默认弱漏**

当前 `ratePerS = 0.0005` 在 300s 内过强。第一轮候选扫描：

```text
0
0.00002
0.00005
0.00010
0.00050
0.00200
```

真实默认从 `0.00002 - 0.00010` 中选，使 T0 保持 `1.40 ± 0.02`，L1 有轻微但不主导的时间趋势，L2 仍能模拟强漏。

- [ ] **Step 4: 跑测试**

```powershell
node tests\heatCapacity\heatCapacityFreeLeakageModel.test.ts
node tests\heatCapacity\heatCapacityFreeParameterImpact.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

### Task 4: 重建热交换有效系数

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeThermalModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeThermalModel.test.ts`
- Test: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`

- [ ] **Step 1: 写单测**

覆盖：

```text
deltaT = 0: 无气壁换热。
deltaT 小: 与旧线性模型接近。
deltaT 大: 单位时间换热量比线性基准更强，但不超过稳定上限。
长时间推进: 温度最终趋向环境温度，不发散。
```

- [ ] **Step 2: 增加有效换热函数**

在 `heatCapacityFreeThermalModel.ts` 内部新增：

```ts
const deriveEffectiveGasWallConductanceWPerK = (
  baseConductanceWPerK: number,
  deltaTK: number,
) => {
  const kneeK = 1.5;
  const gain = 0.35;
  const maxBoost = 2.5;
  const boost = Math.min(maxBoost, Math.pow(Math.max(0, deltaTK) / kneeK, 0.25));
  return baseConductanceWPerK * (1 + gain * boost);
};
```

这些是内部候选常量，不暴露到 UI。实际执行时通过验收表调整。

- [ ] **Step 3: 验证等待区间**

重点检查 R1/R2：U1/U2 等待 `300 ± 20s` 不应被新热交换模型拉出合理区间。

- [ ] **Step 4: 跑测试**

```powershell
node tests\heatCapacity\heatCapacityFreeThermalModel.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

### Task 5: 打气节奏验收

**Files:**

- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`

- [ ] **Step 1: 写节奏组合**

```text
PUMP0: 4 下，总时长 0s 或最小仿真步长。
PUMP3: 4 下，总时长 3s。
PUMP15: 4 下，总时长 15s。
PUMP30: 4 下，总时长 30s。
PUMP60: 4 下，总时长 60s。
```

- [ ] **Step 2: 断言**

```text
abs(gamma(PUMP3) - gamma(PUMP0)) <= 0.005
PUMP15/PUMP30/PUMP60 至少一个相对 PUMP0 产生可见偏差，或测试输出明确报告“当前物理参数下慢打气影响不足”
```

- [ ] **Step 3: 不加入假惩罚**

如果慢打气不敏感，先回到 Task 3/4 调整弱漏和壁温记忆；仍不足时向用户报告物理限制，不在本轮硬塞慢打气修正项。

### Task 6: 第 5 下打气报警路径检查

**Files:**

- Inspect: `src/features/workbench/workbenchState.ts`
- Inspect: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: 只做路径考古**

```powershell
rg -n "pressureDanger|pressureOverLimit|pressureBlockedPumping|pumpHint|focus|alarm|安全阈值|报警" src tests
```

- [ ] **Step 2: 判断是否恢复**

```text
如果旧报警/聚焦退出路径仍存在: 允许第 5 下进入 danger，再禁止第 6 下。
如果路径缺失或需要重建 UI: 本轮停止，只记录缺口，等待 P2。
```

- [ ] **Step 3: 跑测试**

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

### Task 7: 最终组合扫描和验收报告

**Files:**

- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts`
- Modify: `docs/superpowers/plans/2026-06-18-heat-capacity-free-mode-p1-web-acceptance.md`

- [ ] **Step 1: 打印最终扫描表**

```powershell
$env:HSL_PRINT_HEAT_ACCEPTANCE='1'; node tests\heatCapacity\heatCapacityFreeParameterAcceptance.ts
```

报告至少列出：

```text
ID, pumpStrokes, pumpTotalDurationS, waitAfterPumpS, openDurationS, waitAfterReleaseS,
leakageEnabled, leakageRatePerS, U1CorrectedMv, U2CorrectedMv, gamma, pressureKPa,
gasTemperatureK, gasAmountRatio
```

- [ ] **Step 2: 完整验证**

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

- [ ] **Step 3: 固定预览**

如本轮改动包含用户可见行为，确认固定预览端口：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview URL:

```text
http://127.0.0.1:5174/
```

## 6. 执行断点

完成 Task 1 到 Task 5 后先暂停并报告：

- T0/T0b/R1/R2/R3/R4/E1/E2/E3/E4/L1/L2 的扫描表。
- 新默认真实参数组合。
- 慢打气影响是否足够；如果不足，说明是物理限制还是参数仍需调整。
- 第 5 下报警路径是否存在；如果缺失，不在本轮重建 UI。
