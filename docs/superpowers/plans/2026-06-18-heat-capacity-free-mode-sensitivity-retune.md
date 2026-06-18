# 比热容 Free Mode 敏感度重校准实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不新增可见 UI 和不新增一批新扰动参数的前提下，重新分配 Free Mode 当前模型的操作敏感度：降低放气时间和漏气时间的过强敏感度，提高打气节奏对错误操作的影响，并保留 5min 理论操作区域。

**Architecture:** 仍以 `stepFreePhysics` 为唯一物理推进入口，不恢复旧的理论 U2 目标。优先通过现有物理参数、内部流量曲线和现有打气事件时间来调校，不把诊断/评分层提前混进物理层。第 5 下报警只在确认既有报警路径仍存在时恢复，否则本轮只记录缺口并停止该分支。

**Tech Stack:** TypeScript、现有 Node `.test.ts` 测试框架、`src/domain/heatCapacity` Free Mode 模型、`src/features/workbench` 工作台运行逻辑。

---

## 0. 本轮边界

- [ ] 不新增计时器 UI。
- [ ] 不新增真实/理想模式预设。
- [ ] 不新增环境扰动、传感器漂移、随机空气波动等新模型。
- [ ] 不重写诊断报告。
- [ ] 不恢复旧的理论 U2 计算路径。
- [ ] 第 5 下报警只在旧报警/聚焦退出路径仍可复用时恢复；如果路径缺失，本轮不重建 UI 流程。

## 1. 目标验收区间

这些是本轮调参和行为改动的验收目标：

| 场景 | 输入定义 | 目标 |
| --- | --- | --- |
| 理论操作 | 4 下打气，U1 等 300s，实际开阀约 0.25s，U2 等 300s | gamma 落在 `1.40 ± 0.02` |
| 合理 U1 等待波动 | U1 等 `280/300/320s`，其余理论操作 | gamma 仍落在 `1.40 ± 0.02` 或非常接近 |
| 合理 U2 等待波动 | U2 等 `280/300/320s`，其余理论操作 | gamma 仍落在 `1.40 ± 0.02` 或非常接近 |
| 合理开阀波动 | 实际开阀 `0.15/0.25/0.35s` | 尽量压进 `1.40 ± 0.04`；至少不能出现当前 `0.15s -> 1.47` 的过强偏差 |
| 明显放气错误 | 实际开阀 `0.10s` 或 `0.95s` | 结果明显偏离理论操作 |
| 极端放气错误 | 实际开阀 `2.25s/6.25s` | gamma 明显偏低 |
| 打气不足 | 1-2 下打气 | 记录允许，但信号幅度明显偏低；后续诊断可识别，不要求 gamma 必然大幅偏离 |
| 理论打气节奏 | 4 下打气近似瞬间完成 | 对 gamma 的影响接近 `±0.000`，作为理论中心 |
| 合适打气节奏 | 4 下打气总时长不超过 `3s` | 对 gamma 的影响约束在 `±0.005` 内 |
| 错误打气节奏 | 4 下打气总时长超过 `15s` | 视为错误操作，影响由真实热交换/漏气模型自然跑出，不设置上限 |
| 正常漏气 | 开启较小漏气率，5min 等待 | 不应把理论操作直接压到 1.33 这类大偏差 |
| 强漏气/长等待 | 较大漏气率或长等待 | 压力趋向内外平衡，gamma 可大幅偏低或无效 |
| 第 5 下打气 | 4 下是合理边缘，5 下进入报警 | 第 5 下应产生报警提示并退出打气聚焦/禁止继续打气；不能提前吞掉这一步 |

## 2. 涉及文件

| 文件 | 责任 |
| --- | --- |
| `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` | 放气流量曲线、打气过程物理状态、漏气参与方式 |
| `src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts` | 漏气时间敏感度 |
| `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts` | 参数默认值、范围、草稿映射 |
| `src/features/workbench/workbenchState.ts` | 打气频率、报警、聚焦退出、工作台事件流 |
| `src/features/workbench/WorkbenchStudioPrototype.tsx` | 只在确认旧报警 UI 路径存在时轻量恢复，不新建复杂 UI |
| `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts` | 理论/合理/错误组合验收 |
| `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts` | 放气曲线、漏气、极端安全性 |
| `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts` | 第 5 下报警和打气频率行为 |

## 3. Task 1：建立组合扫描回归测试

- [ ] **Step 0：固定确定性校准环境**

本轮敏感度校准先关闭会掩盖主效应的扰动：

```text
关闭环境扰动。
关闭记录值扰动。
关闭或固定传感器随机噪声。
保留传感器滞后和量化，除非某个测试明确要隔离纯物理状态。
```

原因：

```text
先确定放气、打气、漏气、热交换各自对结果的主导方向和量级。
整体模型确定后，再把环境扰动和记录扰动加回真实模式。
```

- [ ] **Step 1：扩展参数验收测试，固定当前失败事实**

在 `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts` 中新增断言组，覆盖：

```ts
const openSensitivityRows = runHeatCapacityFreeParameterAcceptance({
  pumpStrokes: [4],
  openDurationsS: [-0.1, 0, 0.1],
  waitAfterPumpS: 300,
  waitAfterReleaseS: 300,
}).rows;
```

期望先失败：当前 `openActualS=0.15s` 的 gamma 约 `1.47`，超过合理波动目标。

- [ ] **Step 2：新增等待波动断言**

断言 `U1waitS=280/300/320` 和 `U2waitS=280/300/320` 的 gamma 接近理论操作。这个测试当前应通过，用来防止后续调放气/漏气时破坏合理等待区域。

- [ ] **Step 3：新增漏气敏感度断言**

用开启漏气的脚本场景断言：正常漏气率 5min 不应把 gamma 压到当前 `1.33` 级别；强漏气或长等待仍应明显压低 U2。

- [ ] **Step 4：运行测试确认红绿边界**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

预期：放气敏感度和漏气敏感度相关新增断言先失败，等待波动断言通过。

## 4. Task 2：削减放气时间敏感度

- [ ] **Step 1：调整开阀流量曲线，不恢复理论 U2**

修改 `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` 中 `stepOpenFlowAmountAndTemperature` 的流量函数。目标是让初期放气更快接近环境压，但接近环境压后明显变缓，避免 `0.15s` 过短时严重不足，同时避免 `0.35s` 轻微过长时过度放气。

实现方向：

```text
保持 gamma 参与能量路径。
保留 stepFreePhysics 分段推进。
不要直接设置 U2。
不要写固定目标 U2。
用 pressureRatio 或 pressureDelta 驱动流量 taper。
```

- [ ] **Step 2：校准 `stopcockFlowRate` 或内部流量比例**

以实际开阀 `0.25s` 仍为理论中心，扫描 `0.15/0.20/0.25/0.30/0.35s`。目标优先级：

```text
0.25s 接近 1.40。
0.15s 不再高到约 1.47。
0.35s 不明显低于 1.36。
0.95s、2.25s、6.25s 仍明显偏低。
```

- [ ] **Step 3：运行放气相关测试**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

预期：理论开阀和合理开阀波动通过，长开阀错误仍可见。

## 5. Task 3：削减漏气对时间的敏感度

- [ ] **Step 1：先确认是改默认值还是改模型映射**

优先方案：

```text
保留 leakage.enabled 默认 false。
降低建议/默认 leakage.ratePerS，或给 ratePerS 做更温和的有效映射。
不改变强漏气能主导结果的能力。
```

- [ ] **Step 2：修改漏气默认或有效率**

候选目标：

```text
正常漏气率下：U1/U2 等 300s 的 gamma 不应直接掉到 1.33。
正常漏气率 + 等待 600s：允许有可见偏低，但不应接近完全平衡。
强漏气率或 1800s 长等待：应趋向内外压平衡。
```

- [ ] **Step 3：更新参数影响测试**

`tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts` 中保留漏气参数“有影响”的证明，但不要要求正常漏气率造成过强变化。

- [ ] **Step 4：运行漏气相关测试**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeLeakageModel.test.ts
node tests\heatCapacity\heatCapacityFreeParameterImpact.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

## 6. Task 4：提升打气节奏对结果的敏感度

- [ ] **Step 1：先定义敏感度生效边界**

本轮不要破坏理论操作：4 下快速打气、U1 等 300s、U2 等 300s 仍应接近 1.40。打气节奏敏感度定义为：

```text
理论打气：近似瞬间完成，对 gamma 的影响约为 ±0.000。
合适打气：4 下总时长不超过 3s，对 gamma 的影响约束在 ±0.005 内。
慢打气错误：4 下总时长超过 15s，热交换/漏气有足够时间改变状态，影响由模型自然输出，不设置上限。
快打气不惩罚；越快越接近绝热打气。
```

- [ ] **Step 2：写打气节奏失败测试**

在 `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts` 或新建热容运行测试中比较：

```text
4 下理论节奏：总时长接近 0s。
4 下合适节奏：总时长 3s。
4 下错误慢节奏：总时长 15s、30s、60s。
```

断言：

```text
理论节奏和 3s 合适节奏的 gamma 差异约束在 ±0.005。
15s 以上慢节奏产生可检测偏差。
慢节奏即使最后从最后一下打气后等待完整 300s，也允许被模型自然判成错误结果。
快打气不得引入惩罚项。
```

- [ ] **Step 3：实现最小物理路径**

优先复用现有真实机制，不增加“慢打气散失”这种人为修正：

```text
使用 pumpProcesses 的持续过程。
使用已有 pumpStrokeTimestamps / pumpFrequencyStatus。
不新增 UI 参数。
尽量不新增可调参数；如必须新增，只做内部常量。
```

候选实现：

```text
让极慢打气期间继续正常热交换/漏气推进。
让工作台打气脚本不把多个 stroke 压成同一瞬间。
如现有线性热交换不足以体现慢打气差异，优先修改热交换曲线为温差驱动的非线性增强，而不是添加慢打气专用惩罚。
```

- [ ] **Step 4：验证不破坏理论区域**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
```

## 7. Task 5：检查并恢复第 5 下报警路径

- [ ] **Step 1：只做代码考古，不改行为**

检查：

```powershell
rg -n "pressureDanger|pressureOverLimit|pressureBlockedPumping|pumpHint|focus|alarm|安全阈值|报警" src tests
```

目标判断：

```text
如果旧路径仍存在：继续 Step 2。
如果旧路径缺失或需要重建 UI：本轮停止此分支，只向用户报告缺口。
```

- [ ] **Step 2：写第 5 下报警失败测试**

在 `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts` 中断言：

```text
第 4 下：达到或接近 warning，仍允许保持打气操作。
第 5 下：本次 stroke 被物理状态接受到报警区，随后 pressureOverLimit=true / pressureBlockedPumping=true，并给出报警提示。
第 6 下：禁止继续有效打气。
```

- [ ] **Step 3：恢复不吞报警的状态流**

修改 `registerHeatCapacityPumpStroke` 附近逻辑：

```text
不要在第 5 下之前用预测压力直接吞掉 stroke。
允许第 5 下使状态进入 danger。
进入 danger 后再禁止后续打气，并退出聚焦。
如果现有 UI 有报警弹窗/提示路径，只接回现有路径；不新建复杂 UI。
```

- [ ] **Step 4：运行报警相关测试**

运行：

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

## 8. Task 6：最终组合扫描和报告

- [ ] **Step 1：打印最终组合表**

至少输出：

```text
理论操作。
U1 280/300/320s。
U2 280/300/320s。
开阀 0.10/0.15/0.20/0.25/0.30/0.35/0.95/2.25/6.25s。
打气 1/2/3/4/5 下。
正常漏气 300/600/1800s。
强漏气 300/600/1800s。
打气节奏正常/过快/过慢。
```

- [ ] **Step 2：运行完整验证**

运行：

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

- [ ] **Step 3：固定预览检查**

如果代码或用户可见行为改动完成，检查固定端口：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

## 9. 本轮暂停点

完成 Task 1-4 后先报告一次组合扫描结果。如果第 5 下报警路径缺失，不继续重建 UI；等用户确认下一批再做。
