# 比热容 Free Mode 第一阶段网页验收适配实施计划

> **给后续执行者：** 执行本计划时需要按任务逐项推进，推荐使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。所有待办项都使用 checkbox（`- [ ]`）格式，完成后直接勾选。

**目标：** 让新的连续 U2 生成底层可以被网页真实验收：模型参数确实接入新链路，运行接口不再依赖旧理论释放过程，网页动画和关键状态与底层一致。

**架构：** 第一阶段不新增真实模式/理想模式预设，不新增环境扰动等新参数，也不重写完整评分报告。先把现有模型、运行接口、当前 UI 可见状态和网页验收流程对齐到 `stepFreePhysics` 的连续释放模型。

**技术栈：** TypeScript、React/Vite、现有 Node `.test.ts` 测试框架、`src/domain/heatCapacity` 下的 Free Mode 领域模型、`src/features/workbench` 下的工作台运行和 UI。

---

## 0. 第一阶段范围

### 本阶段要完成

- [ ] 现有模型因素适配到新 U2 链路，并有自动化测试证明。
- [x] 新增释放状态来源，供 UI/动画/运行层读取连续释放状态。
- [x] 修正网页中仍依赖旧释放过程状态的排气动画和释放阶段判断。
- [x] 确认 `2x/4x/8x/16x` 倍速和等待压缩仍然走同一个物理步进。
- [x] 建好真实实验计时器底层，但本阶段不显示 UI；后续 UI 阶段再把计时器与倍速条一起出现、一起消失，并通过延长倍速条增加计时区域。
- [x] 放宽 Free Mode 记录规则，让极端操作结果可以被记录，便于后续网页实验极端操作。
- [ ] 给出网页手动验收步骤和可比对的数值基线。

### 本阶段不做

- [ ] 不新增环境扰动、打气强度波动、传感器零点漂移等新物理因素。
- [ ] 不新增真实模式/理想模式参数预设。
- [ ] 不重写完整诊断报告和评分报告。
- [ ] 不允许跳过 U0/U1/U2 顺序、校准一致性、未打气记录 U1 或未释放记录 U2；数值大小和稳定性只交给后续诊断解释。
- [ ] 不在 UI 中新增计时器、强提示、建议记录、自动记录或强制等待；第一阶段只准备计时器底层。
- [ ] 不发布桌面版本。

## 1. 第一阶段完成标准

完成本阶段后，网页验收应满足：

- [ ] 正确操作的 gamma 仍接近空气比热容比。第一阶段临时目标为合理操作 `1.40 ± 0.02`，轻微操作波动 `1.40 ± 0.04`；后续新增环境扰动、打气波动、传感器漂移等模型后，目标范围可以重新校准到指导老师提到的约 `±0.05` 实验范围。
- [ ] 慢关旋塞会让 gamma 相比正确操作下降。
- [ ] 长时间开旋塞会让 gamma 明显低于慢关旋塞。
- [ ] 修改现有参数时，网页结果能体现参数影响，而不是只改变表面数值。
- [x] 排气动画和释放状态不再依赖旧的释放过程状态。
- [ ] `2x/4x/8x/16x` 或等待压缩不会绕过热交换、漏气、传感器滞后和连续释放；倍速只改变用户等待时的墙钟耗时，不改变底层实验时间。
- [ ] `npm.cmd exec tsc -- --noEmit` 和 `npm.cmd test` 通过。
- [ ] 固定预览 `http://127.0.0.1:5174/` 可访问。

## 1.0 真实操作节点定义

本节用于定义第一阶段的“理论操作”和“轻微操作波动”。这些数值是第一阶段校准目标，后续新增完整真实扰动模型后可以重新微调。

资料依据：

- Clément-Desormes 实验要求打开旋塞后迅速关闭，使容器压力接近大气压，然后让气体等容回温。
- 常见实验讲义给出的等待时间是分钟量级：U1 前等待约 `5-6 min`，U2 前等待约 `4-6 min`。本项目第一阶段统一采用 `5 min` 作为 U1 和 U2 的理论等待时间。

| 节点 | 理论操作值 | 轻微操作波动范围 | 离谱操作示例 | 备注 |
| --- | ---: | ---: | --- | --- |
| U1 前封闭等待 | `5 min` | `5 min ± 20 s` | 少等很多或多等数分钟 | 底层继续热交换和漏气；用户自己看计时器决定记录。 |
| 开阀持续时间 | 需要由 Task 1 扫描确定，初步围绕 `0.25 s` | 理论值 `±0.1 s` | 长时间打开旋塞 | 开阀理论值不是资料固定值，而是根据本仪器流量参数校准到压力接近大气压。 |
| U2 前封闭回温等待 | `5 min` | `5 min ± 20 s` | 过早记录或长时间等待 | 底层继续热交换和漏气；不以“数据不变”为记录条件。 |
| 倍速 | `1x` 物理时间基准 | UI 可提供 `2x/4x/8x/16x` | 用户开高倍速但错过计时 | 倍速调控计时器和仿真推进速度，不能改变物理模型。 |
| 记录动作 | 用户手动点击 | 用户可以早记或晚记 | 完全错过最佳时间 | UI 不给“该记录了”的强提示，最多显示计时器这种实验环境信息。 |
| 计时器底层 | 实验时间真实累计 | 支持倍速改变墙钟等待成本 | 用户错过时间后数据继续演进 | 本阶段不显示 UI；后续 UI 阶段再与倍速条同显同隐。 |

## 1.1 强制断点：Task 1 完成后暂停报告

- [ ] 完成 Task 1 后必须暂停，不继续 Task 2 或 UI 适配。
- [ ] 向用户报告所有影响结果的现有参数、建议默认值、建议合理范围和数据依据。
- [ ] 报告至少包含以下场景扫描：
  - 正确操作。
  - 开阀时间比最佳值快 `0.1s`。
  - 开阀时间比最佳值慢 `0.1s`。
  - U2 回温等待比建议值早 `20s`。
  - U2 回温等待比建议值晚 `20s`。
  - 漏气率较大时，长等待能明显压低 U2 或让压力趋向内外平衡。
- [ ] 报告需要说明当前默认参数是否能达到：
  - 合理操作时 gamma 大致落在 `1.40 ± 0.02`。
  - 轻微操作波动时 gamma 大致落在 `1.40 ± 0.04`。
  - 离谱操作可以大幅偏离，不设置人为下限。
- [ ] 报告需要说明上述目标是第一阶段临时校准目标；后续新增完整真实扰动模型后，可以按约 `±0.05` 的真实实验范围重新微调。
- [ ] 用户确认默认参数和验收范围后，才能继续 Task 2。

## 2. 需要重点触碰的文件

| 文件 | 责任 |
| --- | --- |
| `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` | Free Mode 物理状态、连续释放、压力派生、需要新增释放状态派生接口。 |
| `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts` | 现有参数映射和范围，需确认旧参数对新模型仍有意义。 |
| `src/domain/heatCapacity/heatCapacityFreeTraceModel.ts` | 配置快照已去除旧释放字段，需保持历史数据迁移兼容。 |
| `src/features/workbench/workbenchState.ts` | 实时步进、倍速、等待压缩、运行状态派生。 |
| `src/features/workbench/WorkbenchStudioPrototype.tsx` | 网页仪器动画、释放阶段可见状态、参数面板文案。 |
| `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts` | 物理引擎行为回归。 |
| `tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts` | 参数影响证明。 |
| `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts` | 脚本级验收和运行等价性。 |
| `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts` | 网页仪器 UI 结构和动画依赖检查。 |
| `tests/heatCapacity/heatCapacityFreeScenarioBaseline.test.ts` | 当前可验收场景基线。 |
| `tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts` | 场景脚本和开发输出。 |

## 3. Task 1：补齐现有模型参数影响测试并校准默认参数

**目的：** 先证明已有模型因素真的接入新 U2 链路，并重新设计第一版真实实验模拟默认参数。没有这一步，网页验收看到的结果可能只是偶然变化。

**文件：**

- 修改：`tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts`
- 可按需修改：`tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`
- 可按需修改：`src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`
- 可按需修改：`src/features/workbench/workbenchState.ts`

### 步骤

- [ ] **Step 0：整理默认参数提案**

输出内容：

```text
所有影响 U1/U2/gamma 的现有参数。
每个参数的当前默认值。
每个参数的建议默认值。
每个参数的建议合理范围。
该参数主要影响哪个实验阶段。
该参数过大或过小时会导致什么结果。
```

注意：本步骤先形成提案，不直接改默认参数。默认参数必须经用户审核后再写入代码。

- [ ] **Step 1：为 `stopcockFlowRate` 写失败测试**

测试意图：

```ts
// 同样打气、同样开阀时长、同样恢复时间：
// stopcockFlowRate 较大时，放气更充分，U2 或 gamma 应发生可检测变化。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterImpact.test.ts
```

预期：如果当前覆盖不足，应先失败或缺少对应断言。

- [ ] **Step 2：为 `gamma` 写释放过程影响测试**

测试意图：

```ts
// 改变 gamma 后，不只最终公式计算变化；
// 关阀瞬间温度、释放后回温 U2 也应变化。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

预期：测试能证明 `gamma` 参与释放能量路径。

- [ ] **Step 3：为热交换参数写 U2 影响测试**

测试意图：

```ts
// 固定开阀和恢复时长：
// 改变 gasWallConductanceWPerK 或 wallAmbientConductanceWPerK 后，
// U2 记录时压力或 gamma 应变化。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterImpact.test.ts
```

预期：测试通过，并显示热交换参数不是“无影响变量”。

- [ ] **Step 4：为漏气等待写影响测试**

测试意图：

```ts
// 开启 leakage.enabled 后：
// U1 前长时间封闭等待或 U2 前长时间封闭等待，应改变最终 gamma。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterImpact.test.ts
```

预期：漏气影响通过物理等待出现，而不是通过结果修正出现。

- [ ] **Step 5：运行参数影响总测试**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterImpact.test.ts
```

预期输出包含：

```text
heatCapacityFreeParameterImpact tests passed
```

- [ ] **Step 6：用场景扫描校准默认参数**

扫描场景：

```text
正确操作。
开阀时间比最佳值快 0.1s。
开阀时间比最佳值慢 0.1s。
U2 等待比建议值早 20s。
U2 等待比建议值晚 20s。
长时间等待 + 高漏气率。
长时间开阀。
```

目标：

```text
合理操作：gamma 约 1.40 ± 0.02。
轻微波动：gamma 约 1.40 ± 0.04。
离谱操作：允许大幅偏离，不设置硬下限。
```

- [ ] **Step 7：触发强制断点**

完成 Task 1 后停止执行，并向用户报告：

```text
参数提案。
测试结果。
场景扫描结果。
尚未解决的偏差来源。
是否建议继续 Task 2。
```

## 4. Task 2：迁移连续释放状态来源

**目的：** UI 和运行层应从 `releaseReference`、确认开阀状态和实时压差读取“当前是否在释放、处于什么阶段、动画应显示什么”，不能依赖旧目标态。

**文件：**

- 修改：`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`
- 修改：`tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`

### 建议接口

在 `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` 中新增导出类型和函数：

```ts
export interface HeatCapacityFreeReleaseActivity {
  phase: 'idle' | 'open-flow' | 'post-release-exchange' | 'partial-stopped';
  active: boolean;
  elapsedS: number;
  pressureDeltaKPa: number;
  amountBeforeRatio: number;
  amountCurrentRatio: number;
  amountReferenceRatio: number;
  progress: number;
}

export const deriveFreeReleaseActivity = (
  state: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreePhysicsConfig,
): HeatCapacityFreeReleaseActivity => {
  // 实现时只从当前 state/config 派生，不修改 state。
};
```

### 步骤

- [ ] **Step 1：先写失败测试**

测试覆盖：

```ts
// 初始状态应为 idle。
// 打开旋塞且压力高于环境时，应为 open-flow。
// 连续释放模型下没有旧目标态，但 active 应为 true。
// 关阀后如果已经发生释放但未完成回温，应能得到 partial-stopped 或 idle 中的明确状态。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

预期：因为 `deriveFreeReleaseActivity` 尚未实现而失败。

- [ ] **Step 2：实现最小派生函数**

实现约束：

```text
不能恢复旧的理论目标态。
不能创建新的旧目标态。
不能用 Date.now 或 Math.random。
只能从 state 和 config 计算当前释放活动。
```

- [ ] **Step 3：确认测试通过**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

预期输出：

```text
heatCapacityFreePhysicsEngine tests passed
```

## 5. Task 3：放宽 Free Mode 记录规则

**目的：** 真实实操模式需要让极端操作也能被记录，便于后续网页验收和 P2 UI/诊断适配。记录按钮只应保留最低必要规则：U0、U1、U2 顺序正确，同一次校准，且已发生相应实验动作。U1 太小、U2 太低、压力/温度未稳定等情况不再硬拦截，应允许记录并在后续诊断报告中解释。

**文件：**

- 修改：`src/domain/heatCapacity/heatCapacityFreeRecordModel.ts`
- 修改：`tests/heatCapacity/heatCapacityFreeRecordModel.test.ts`
- 修改：`tests/heatCapacity/heatCapacityFreeScenarioBaseline.test.ts`
- 修改：`tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`

### 步骤

- [x] **Step 1：写记录规则放宽失败测试**

测试意图：

```ts
// U1：只要 U0 已记录、同一校准、发生过打气，即使 U1 太小或读数未稳定，也允许记录。
// U2：只要 U1 已记录、同一校准、发生过释放，即使 U2 太低、U2 高于 U1 或读数未稳定，也允许记录。
// 仍然禁止：缺少 U0、缺少 U1、重复记录、校准变化、未打气记录 U1、未释放记录 U2。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeRecordModel.test.ts
```

预期：旧记录规则仍会因为 `insufficient-u1`、`over-vented`、`unstable-pressure` 等原因失败。

- [x] **Step 2：实现最低必要记录规则**

目标逻辑：

```text
evaluateFreeU1Record：
  保留 common 中的电源/校准基础判断。
  保留 U0 已有、U1 未记录、已打气。
  移除 minimumUsefulU1CorrectedMv 硬拦截。

evaluateFreeU2Record：
  保留 common 中的电源/校准基础判断。
  保留 U1 已有、U2 未记录、已释放。
  移除 overVentedMinimumU2CorrectedMv 和 U2 < U1 硬拦截。
```

注意：`recordFreeU2` 内部如果计算不出 gamma，仍可以返回 accepted 并保存原始 U2；后续报告把它标为 invalid，而不是阻止记录。

- [x] **Step 3：更新场景基线**

目标：

```text
early-u2-record 这类极端/过早操作应可以记录原始 U2。
如果 gamma 无法计算，结果可以是 invalid，但记录本身不能被按钮规则挡住。
```

- [x] **Step 4：运行记录相关测试**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeRecordModel.test.ts
node tests\heatCapacity\heatCapacityFreeScenarioBaseline.test.ts
```

预期输出：

```text
heatCapacityFreeRecordModel tests passed
heatCapacityFreeScenarioBaseline tests passed
```

## 6. Task 4：适配网页排气动画和释放阶段 UI

**目的：** 网页可验收时，用户看到的粒子排气和阶段提示必须和新底层一致。本任务放到记录规则之后执行。

**文件：**

- 修改：`src/features/workbench/WorkbenchStudioPrototype.tsx`
- 修改：`tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

### 步骤

- [ ] **Step 1：写 UI 源码检查测试**

测试意图：

```ts
// WorkbenchStudioPrototype.tsx 不应只依赖旧释放目标判断 Free Mode 排气动画。
// Free Mode 应使用 releaseReference、确认开阀状态和实时压差，或等价派生状态。
```

运行：

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

预期：如果 UI 仍只依赖旧释放目标，测试失败。

- [ ] **Step 2：把 Free Mode 动画判断改为释放活动派生值**

目标逻辑：

```ts
const freeReleaseActivity = deriveFreeReleaseActivity(
  activeFile.heatCapacityFreePhysicsState,
  activeFile.heatCapacityFreePhysicsConfig,
);

const freeReleaseFlowActive = activeFile.heatCapacityMode === 'free' &&
  activeFile.heatCapacityFreeStopcockFlowOpen &&
  freeReleaseActivity.active;
```

注意：教学模式的旧动画逻辑不要在这个任务里重构。

- [ ] **Step 3：释放时间线改成连续释放语义**

目标：

```text
Free Mode 不再显示或暗示固定响应延迟加固定主释放目标。
可以继续用 progress 驱动粒子动画，但 progress 必须是派生展示值，不是理论目标进度。
```

- [ ] **Step 4：运行 UI 测试**

运行：

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

预期输出：

```text
workbenchHeatCapacityInstrumentUi tests passed
```

## 7. Task 5：确认倍速、5 min 计时器底层和等待压缩不绕过新物理模型

**目的：** 网页验收时用户可能使用 `2x/4x/8x/16x` 或等待压缩。它们必须和正常速度走同一套 `stepFreePhysics`。本阶段只建立真实实验计时器底层：计时器累计实验时间，用户后续看到 `5 min` 后自行决定记录，系统不自动建议或强制记录；计时器 UI 延后到下一阶段与倍速条一起处理。

**文件：**

- 修改：`src/features/workbench/workbenchState.ts`
- 修改：`tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`
- 可按需新增：`tests/heatCapacity/workbenchHeatCapacityFreeRuntimeAcceleration.test.ts`

### 步骤

- [ ] **Step 1：写倍速等价性测试**

测试意图：

```ts
// 同一套操作脚本：
// A 路径用普通小步长推进。
// B 路径用工作台 2x/4x/8x/16x 加速/分段逻辑推进。
// 两者最终 U1、U2、gamma 应在容差内接近。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

预期：如果存在绕过 `stepFreePhysics` 的快捷路径，测试应失败。

- [x] **Step 2：写 5 min 实验计时器底层测试**

测试意图：

```ts
// 计时器显示的是实验时间，不是墙钟时间。
// 2x/4x/8x/16x 只改变墙钟等待成本。
// 计时器超过 5 min 后不自动记录、不自动阻止、不自动建议。
// 用户继续等待时，物理状态继续演进。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

预期：计时器底层必须和 `stepFreePhysics` 推进时间一致。

- [ ] **Step 3：审查 `workbenchState.ts` 中的快进分支**

重点检查：

```text
是否直接改 pressureDeltaKPa。
是否直接改 U2。
是否跳过 thermal/leakage/sensor。
是否用旧释放目标作为唯一快速过程标记。
```

- [ ] **Step 4：修正快进/压缩路径**

实现要求：

```text
所有时间推进都必须调用 stepFreePhysics。
需要提高采样密度时，只能增加分段数量。
不能写第二套 U2 近似计算。
```

- [ ] **Step 5：运行相关测试**

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
npm.cmd test
```

预期：

```text
heatCapacityFreeParameterAcceptance tests passed
94 test files passed
```

## 8. Task 6：扩展场景基线输出，服务网页验收

**目的：** 网页验收需要一组可对照的数据，不然只能凭肉眼判断。这个任务让开发者能打印关键过程数据。

**文件：**

- 修改：`tests/heatCapacity/heatCapacityFreeScenarioBaseline.test.ts`
- 修改：`tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`

### 建议输出字段

在 `HSL_PRINT_HEAT_BASELINE=1` 时输出：

```text
scenario id
U1
U2
gamma
U1 record time
release open time
release close time
release open duration
pressure at release close
temperature at release close
temperature at U2 record
gas amount at U2 record
U2 evaluation reason
```

### 步骤

- [ ] **Step 1：先写输出结构断言**

测试意图：

```ts
// formatHeatCapacityFreeScenarioBaseline 返回的每一行必须包含网页验收需要的关键字段。
```

运行：

```powershell
node tests\heatCapacity\heatCapacityFreeScenarioBaseline.test.ts
```

预期：缺少字段时失败。

- [ ] **Step 2：扩展场景 harness 记录过程节点**

实现要求：

```text
不改变物理模型。
不改变记录规则。
只在测试辅助层保存开阀、关阀、U2 记录时的派生状态。
```

- [ ] **Step 3：打印基线表**

运行：

```powershell
$env:HSL_PRINT_HEAT_BASELINE='1'
node tests\heatCapacity\heatCapacityFreeScenarioBaseline.test.ts
Remove-Item Env:\HSL_PRINT_HEAT_BASELINE
```

预期：表格包含正确操作、慢关、长开等场景的关键过程数据。

## 9. Task 7：网页手动验收流程

**目的：** 给真实网页验收一个固定脚本，避免每次操作标准不同。

**文件：**

- 可新增文档：`docs/instrument-modeling/heat-capacity-free-mode-web-acceptance.md`
- 不要求修改代码。

### 手动验收脚本

- [ ] **Step 1：启动固定预览**

运行：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

打开：

```text
http://127.0.0.1:5174/
```

- [ ] **Step 2：正确操作场景**

操作：

```text
打开 Free Mode。
完成 U0。
打气到合理 U1。
观察实验计时器，封闭等待到 5 min 后手动记录 U1。
短时间打开旋塞并关闭。
观察实验计时器，封闭回温等待到 5 min 后手动记录 U2。
查看 gamma。
```

预期：

```text
gamma 接近 1.4。
排气动画和压力变化同步。
U2 不是瞬间跳到固定理论值，而是随放气和回温过程变化。
系统不自动提醒“现在该记录”，用户依据计时器自行操作。
```

- [ ] **Step 3：慢关旋塞场景**

操作：

```text
与正确操作相同，但打开旋塞时间更长。
```

预期：

```text
U2 降低。
gamma 低于正确操作。
网页动画持续时间和开阀时间一致。
```

- [ ] **Step 4：长时间开旋塞场景**

操作：

```text
打气并记录 U1 后，长时间保持旋塞打开，再关闭并等待回温记录 U2。
```

预期：

```text
gamma 明显偏低。
报告或当前结果区域不应把该数据隐藏。
```

- [ ] **Step 5：参数影响验收**

操作：

```text
调整热交换、漏气、传感器噪声或 stopcockFlowRate 中的一个参数。
重复正确操作或慢关操作。
U1 和 U2 的理论等待仍按计时器 5 min 执行。
```

预期：

```text
结果变化方向能和参数含义对应。
没有控制台错误。
没有明显卡顿。
```

## 10. 第一阶段最终验证命令

完成本阶段后运行：

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

再确认固定预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预期访问地址：

```text
http://127.0.0.1:5174/
```

## 11. 第一阶段完成后再进入的工作

第一阶段完成后，再进入：

- [ ] 过程诊断数据中间层。
- [ ] 诊断报告阶段判断重写。
- [ ] 真实/理想参数预设。
- [ ] 新影响参数。
- [ ] 新参数 UI。

这能避免诊断层和新 UI 依赖一个尚未适配完整的底层接口。
