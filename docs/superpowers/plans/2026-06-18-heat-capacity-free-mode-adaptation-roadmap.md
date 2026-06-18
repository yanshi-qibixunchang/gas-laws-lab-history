# 比热容 Free Mode 适配路线图实施计划

> **给后续执行者：** 执行本计划时需要按任务逐项推进，推荐使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。所有待办项都使用 checkbox（`- [ ]`）格式，完成后直接勾选。

**目标：** 记录 Free Mode 在 U2 生成方式改为连续过程模型之后，后续还需要完成的模型适配、UI 适配、模型新增和 UI 新增工作。

**架构：** Free Mode 的物理引擎继续作为压力、气体量、气体温度、瓶壁温度、漏气和传感器输入的唯一状态来源。UI、实验诊断报告、倍速运行、等待时间压缩和评分报告都应该适配这套真实过程状态，而不是重新依赖旧的固定释放窗口或理论目标 U2。

**技术栈：** TypeScript、React/Vite、现有 Node `.test.ts` 测试框架、`src/domain/heatCapacity` 下的 Free Mode 领域模型、`src/features/workbench` 下的工作台运行和 UI。

---

## 0. 优先级说明

| 优先级 | 含义 |
| --- | --- |
| P0 | 必须先完成，否则不能认为新模型已经稳定适配。 |
| P1 | 诊断、评分、参数调优需要依赖的核心能力。 |
| P2 | 当前模型稳定之后再加入的真实感或体验增强。 |
| P3 | 可选优化或发布前润色工作。 |

## 1. 当前基线状态

- [x] U2 不再通过预先计算 `amountTargetRatio` 和 `temperatureTargetK` 的理论释放目标生成。
- [x] 打开旋塞后，气体量和气体温度会按连续过程更新。
- [x] 当前热交换模型在打开旋塞放气过程中和关阀回温过程中都会参与。
- [x] 当前漏气模型仍然在封闭等待阶段参与。
- [x] 当前传感器滞后、量化和噪声仍然影响最终显示值。
- [x] 已有基线场景覆盖：正确操作、打气不足、慢关旋塞、长时间开旋塞、过早记录 U2。
- [x] 已建立 U1/U2 的 `5 min` 实验计时器底层，当前不显示 UI。
- [x] Free Mode 记录规则已放宽到最低必要顺序规则，极端 U1/U2 原始值可记录，后续诊断再解释。

当前连续过程模型的参考结果：

| 场景 | 预期表现 |
| --- | --- |
| 正确操作 | gamma 接近空气比热容比，当前约为 `1.38`。 |
| 慢关旋塞 | gamma 相比正确操作下降。 |
| 长时间开旋塞 | gamma 明显低于慢关旋塞。 |
| 过早记录 U2 | 可记录原始 U2，gamma 可能明显偏低或在后续诊断中标为无效。 |

## 2. 模型待适配

本节只适配已经存在的模型因素，不新增新的物理参数。

### P0 模型待适配

- [ ] 确认 `stopcockFlowRate` 在连续释放路径下会直接影响 U2。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`，`tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts`。
  - 验收标准：改变 `stopcockFlowRate` 后，关阀瞬间压力、U2 或 gamma 至少有一个在确定性测试中发生可检测变化。

- [ ] 确认 `gamma` 影响释放过程中的能量路径，而不是只影响最终报告计算。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`，`tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`。
  - 验收标准：在打气和开阀时长完全一致时，改变 `gamma` 会改变释放降温和回温后的 U2。

- [ ] 确认热交换参数通过释放和回温过程影响新的 U2 链路。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeThermalModel.ts`，`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`，`tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts`。
  - 验收标准：改变 `gasWallConductanceWPerK` 或 `wallAmbientConductanceWPerK` 后，固定恢复时间下的 U2 会发生可检测变化。

- [ ] 确认漏气通过封闭等待影响 U1 和 U2，而不是通过隐藏修正影响结果。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts`，`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`，`tests/heatCapacity/heatCapacityFreeParameterImpact.test.ts`。
  - 验收标准：开启漏气后，U1 前或 U2 前增加封闭等待时间会改变最终 gamma。

- [x] 明确 `releaseCoolingFactor` 在新模型中的状态：已从 Free 运行时配置、快照和测试中移除，新的连续放气模型不再使用旧理论释放冷却修正参数。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`，`src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`，`src/domain/heatCapacity/heatCapacityFreeTraceModel.ts`，`src/features/workbench/workbenchHeatCapacityPersistence.ts`。
  - 推荐处理：为了兼容旧数据可以继续持久化，但不要再把它当成隐藏的 U2 理论目标修饰参数。如果后续仍保留为可调项，需要单独重命名或重新映射。

- [ ] 确认时间倍速使用和正常速度相同的物理步进。
  - 相关文件：`src/features/workbench/workbenchState.ts`，`tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`。
  - 验收标准：同一套脚本操作在正常速度和加速分段步进下，U1、U2、gamma 结果应保持接近。

### P1 模型待适配

- [ ] 增加一组针对当前“理论动态模型”的回归测试。
  - 相关文件：`tests/heatCapacity/heatCapacityFreeScenarioBaseline.test.ts`，`tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`。
  - 验收标准：输出基线继续显示正确操作接近空气 gamma，长时间开旋塞表现为明显错误操作。

- [ ] 增加极端参数安全测试。
  - 相关文件：`tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`。
  - 验收标准：极高 `stopcockFlowRate`、极低 `stopcockFlowRate`、高 `gamma`、低 `gamma` 都不能导致气体量为负、温度非法或出现 `NaN`。

- [ ] 重新检查当前参数调节范围是否适合连续释放路径。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`，`tests/heatCapacity/heatCapacityFreeParameterConfig.test.ts`。
  - 验收标准：参数上下限既能产生可见影响，也不会把物理模型推到不稳定状态。

## 3. UI 待适配

本节适配已有 UI 和运行层假设，不新增新的模型参数。

### P0 UI 待适配

- [ ] 让 Free Mode 排气粒子动画不再依赖 `releaseProcess`。
  - 相关文件：`src/features/workbench/WorkbenchStudioPrototype.tsx`，`tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`。
  - 验收标准：即使 `releaseProcess` 为 `null`，只要 Free Mode 旋塞打开且压力高于环境，粒子排气动画仍然应该激活。

- [ ] 适配释放时间线文案和视觉阶段标签。
  - 相关文件：`src/features/workbench/WorkbenchStudioPrototype.tsx`。
  - 验收标准：Free Mode UI 不再暗示存在固定 `0.02s + 0.18s` 的理论释放目标过程。

- [ ] 审查实验诊断报告的阶段判断是否还依赖旧释放窗口。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`，`src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`，`tests/heatCapacity` 下相关测试。
  - 验收标准：报告能够基于真实过程状态判断开阀过短、开阀过久、回温不足、封闭等待过久，而不是依赖 `releaseProcess`。

- [ ] 审查 `2x/4x/8x/16x` 倍速提示和加速弹窗。
  - 相关文件：`src/features/workbench/workbenchState.ts`，`src/features/workbench/WorkbenchStudioPrototype.tsx`。
  - 验收标准：倍速提示不依赖旧的固定释放时长，也不会在连续释放仍在发生时错误隐藏状态。

- [ ] 审查等待时间过久的时间压缩逻辑。
  - 相关文件：`src/features/workbench/workbenchState.ts`，热容运行加速相关测试。
  - 验收标准：压缩等待必须通过重复 `stepFreePhysics` 分段推进完成，不能使用绕过漏气、热交换或传感器滞后的快捷路径。

### P1 UI 待适配

- [ ] 适配当前参数调整窗口的标签和分组。
  - 相关文件：`src/features/workbench/WorkbenchStudioPrototype.tsx`，`src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`，`tests/heatCapacity/workbenchHeatCapacityFreeParameters.test.ts`。
  - 验收标准：现有参数都能明确映射到当前模型，旧的“理论释放目标”相关表述被移除或改写。

- [ ] 增加开发用场景输出，辅助调参。
  - 相关文件：`tests/heatCapacity/heatCapacityFreeScenarioBaseline.test.ts`，`tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`。
  - 验收标准：设置 `HSL_PRINT_HEAT_BASELINE=1` 时，能输出 U1、U2、gamma、开阀时长、关阀瞬间压力、关阀瞬间温度、U2 记录时温度。

- [ ] 确保结果窗口和报告视图能展示无效或较差操作，而不是隐藏数据。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeTrialModel.ts`，`src/features/workbench/WorkbenchStudioPrototype.tsx`，`tests/heatCapacity` 下结果视图测试。
  - 验收标准：低 U2 或较差 gamma 仍然作为结果显示，并附带诊断原因。

## 4. 模型待添加

本节是新增模型能力。只有当现有模型适配稳定后再做。

### P1 模型待添加

- [ ] 新增实验过程诊断数据层。
  - 新建文件：`src/domain/heatCapacity/heatCapacityFreeProcessDiagnosticsModel.ts`。
  - 新建测试：`tests/heatCapacity/heatCapacityFreeProcessDiagnosticsModel.test.ts`。
  - 需要捕获的节点：U1 记录、打开旋塞、关闭旋塞、U2 记录。
  - 需要捕获的数值：时间、压力、温度、气体量、瓶壁温度、修正后的 U1/U2、gamma、开阀持续时间、封闭等待时间。

- [ ] 基于过程数据新增诊断分类。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeProcessDiagnosticsModel.ts`，`tests/heatCapacity/heatCapacityFreeProcessDiagnosticsModel.test.ts`。
  - 分类项：打气不足、U1 前等待过久、开阀过短、开阀过久、回温不足、U2 前等待过久、漏气敏感等待。

- [ ] 新增真实模式和理想模式参数预设。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`，持久化测试，参数 UI 测试。
  - 理想预设：无噪声、无漏气、确定性传感器，参数调到正确操作接近 `1.4`。
  - 真实预设：保留或开启热交换、传感器、漏气影响，让错误操作能明显影响结果。

### P2 模型待添加

- [ ] 新增环境扰动模型。
  - 新建文件：`src/domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts`。
  - 需要更新：物理引擎测试和传感器测试。
  - 行为要求：使用确定性种子模拟环境温度或压力漂移，物理模型中不能使用 `Math.random()`。

- [ ] 新增打气强度波动模型。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts` 或独立的打气模型文件。
  - 行为要求：用脚本或确定性种子产生强度变化，能够改变 U1，但不破坏可重复性。

- [ ] 新增传感器零点漂移模型。
  - 相关文件：`src/domain/heatCapacity/heatCapacityFreeSensorModel.ts`，校准测试。
  - 行为要求：长时间等待和校准过程中可以看到缓慢、确定性的零点漂移。

- [ ] 新增阀门关闭延迟或操作者时序延迟。
  - 相关文件：工作台控制逻辑和物理步进代码。
  - 行为要求：用户发出关闭命令后，物理流动可以存在一个很小的确定性延迟。

## 5. UI 待添加

本节是新增用户可见界面。应在诊断数据和参数预设稳定后再做。

### P1 UI 待添加

- [ ] 新增开发诊断面板或受控调试输出。
  - 相关文件：`src/features/workbench/WorkbenchStudioPrototype.tsx`，诊断模型测试。
  - 开启方式：开发专用开关或隐藏调试参数，不能出现在普通生产流程中。
  - 显示内容：U1、U2、gamma，以及 U1、开阀、关阀、U2 各节点的压力、温度、气体量。

- [ ] 新增详细评分报告分区。
  - 相关文件：`src/domain/heatCapacity` 和 `src/features/workbench` 下的过程诊断与报告渲染文件。
  - 分区建议：操作顺序、打气质量、放气时机、热恢复、等待/漏气风险、传感器稳定性。

- [ ] 在参数预设完成后新增真实/理想模式控制。
  - 相关文件：`src/features/workbench/WorkbenchStudioPrototype.tsx` 中的 Free Mode 参数 UI，参数配置测试。
  - 行为要求：切换预设时参数组应明确变化，高级参数仍能查看。

### P2 UI 待添加

- [ ] 在环境扰动模型完成后新增环境扰动控制。
  - 相关文件：参数 UI 和参数配置模型。
  - 控件建议：启用开关、扰动强度、确定性种子或预设。

- [ ] 在打气波动模型完成后新增打气波动控制。
  - 相关文件：参数 UI 和参数配置模型。
  - 控件建议：启用开关、强度范围。

- [ ] 在传感器漂移模型完成后新增传感器漂移控制。
  - 相关文件：参数 UI 和参数配置模型。
  - 控件建议：启用开关、漂移速率。

- [ ] 新增解释理想模式和真实模式区别的报告文案。
  - 相关文件：本地化/内容文件和报告视图文件。
  - 行为要求：用户能看出当前结果来自理想设置还是真实设置。

## 6. 推荐推进流程

### 阶段 1：收口现有模型适配

- [ ] 完成所有 P0 模型待适配项。
- [ ] 完成会影响当前体验的 P0 UI 待适配项。
- [ ] 运行：

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

- [ ] 检查固定预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

### 阶段 2：建立诊断数据基础

- [ ] 新增实验过程诊断数据层。
- [ ] 新增开发用基线输出。
- [ ] 用诊断数据解释正确操作、慢关旋塞、长时间开旋塞、过早记录 U2、打气不足。
- [ ] 在数据结构稳定前，UI 展示保持最小化。

### 阶段 3：适配报告和评分

- [ ] 基于过程诊断数据重建阶段判断。
- [ ] 更新评分报告，让它能指出主导错误操作。
- [ ] 确保无效或较差记录仍然可见，并带有解释。

### 阶段 4：建立参数预设

- [ ] 新增理想预设。
- [ ] 新增真实预设。
- [ ] 用脚本场景验证两个预设。
- [ ] 领域测试证明预设有效后，再新增预设 UI。

### 阶段 5：添加新影响参数

- [ ] 新增环境扰动。
- [ ] 新增打气强度波动。
- [ ] 新增传感器零点漂移。
- [ ] 如果阀门时序延迟能明显提升操作真实感，再新增阀门延迟。
- [ ] 每个新增模型组件都必须先有确定性测试，再添加 UI 控件。

## 7. 勾选完成规则

每个待办项勾选前应满足：

- 行为有聚焦的自动化测试。
- 如果是行为变更，测试应先失败再实现。
- `npm.cmd exec tsc -- --noEmit` 通过。
- 相关目标测试通过。
- 涉及用户可见内容时，检查固定预览 `http://127.0.0.1:5174/`。
- 不能引入绕过 `stepFreePhysics` 的第二套物理捷径。

## 8. 当前最建议的下一项

- [ ] 先做 P0 模型待适配覆盖：
  - `stopcockFlowRate`
  - `gamma`
  - 热交换系数
  - 封闭等待阶段漏气
  - 倍速运行等价性

这是最稳的下一步，因为它先验证新 U2 链路中的现有因素都已经正确接入，再让诊断、报告、参数预设或新增参数依赖它。
