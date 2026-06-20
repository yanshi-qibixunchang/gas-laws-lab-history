# 空气比热容比阶段 A UI 基线报告

更新日期：2026-06-20

## 1. 本轮范围

本轮只建立阶段 A 的 UI 自动化入口和第一版基线，不修改物理模型、记录规则、流程状态机或评分逻辑。

已做的最小代码改动：

- 工作台空页面创建按钮增加稳定选择器：`data-workbench-create-experiment="heatCapacity"`。
- 自由模式 U0/U1/U2 记录按钮增加稳定选择器：`data-heat-capacity-free-record="u0|u1|u2"`。
- 引导/演示记录按钮增加当前记录类型选择器：`data-heat-capacity-guided-record={visibleRecordKind}`。
- 处理页计算按钮增加稳定选择器：`data-heat-capacity-calculate="free|teaching"`。

这些改动只服务自动化测试定位，不改变按钮行为。

## 2. 已验证结果

### 2.1 固定预览端口

命令：

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5174/" -TimeoutSec 5
```

结果：HTTP `200`。

### 2.2 静态 UI 选择器测试

命令：

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

结果：通过，输出 `workbenchHeatCapacityInstrumentUi tests passed`。

### 2.3 浏览器创建实验烟测

操作：打开 `http://127.0.0.1:5174/`，点击 `data-workbench-create-experiment="heatCapacity"` 创建热容实验。

结果：

| 检查项 | 数量 |
| --- | ---: |
| `data-heat-capacity-instrument-scene="true"` | 1 |
| `data-heat-capacity-preview-mount="true"` | 1 |
| `data-heat-capacity-mode-control="true"` | 1 |
| `data-heat-capacity-free-record-controls="true"` | 1 |
| U0/U1/U2 自由记录按钮 | 各 1 |
| 控制台错误 | 0 |

### 2.4 3D 控件坐标基线

固定窗口：`1440x900`，默认视角。

热点扫描得到的大致坐标范围：

| 控件 | 可用坐标/范围 | 说明 |
| --- | --- | --- |
| 电源开关 | 稳定点约 `(830,492)`、`(815,506)` | `(846,505)`、`(830,518)` 会漏点 |
| 玻璃旋塞 | 约 `x=540-690, y=295-345` | 可点击开关 |
| 打气阀门 | 约 `x=510-620, y=335-365` | 点击可开关 |
| 打气球 | 普通视角约 `x=720-850, y=505-555` | 普通视角单击不打气，需要进入打气聚焦 |

### 2.5 打气链路可被自动化驱动

操作：

1. 点击电源稳定点 `(830,492)`。
2. 点击打气阀门 `(530,350)`，阀门变为打开。
3. 双击打气球 `(745,530)` 进入打气聚焦。
4. 在聚焦视角扫描到打气球热点后，点击 5 次。

结果：`Up` 从约 `1.2 mV` 上升到约 `15.1 mV`，阶段进入“打气中”。说明打气模型和 3D 打气交互链路可以被自动化驱动。

## 3. 已发现问题

### 2026-06-20 修复状态更新

- BUG-A1 已按审核方案修复：新增 `heatCapacityFreeStopcockFlowPurpose`，将自由模式玻璃旋塞流通语义区分为 `none` / `zeroing` / `release`。
- U0 调零阶段打开玻璃旋塞会继续允许真实物理连通，但不会创建 `releaseReference`，也不会把阶段推入 `releasing/recovering`。
- 只有当前自由实验组已记录 U1 且尚未记录 U2 时，打开玻璃旋塞才会以 `release` 语义传入物理引擎。
- RISK-A2 已做最小修复：程序化 3D 电源开关 hitbox 从 `[0.34, 0.34, 0.22]` 扩展为 `[0.42, 0.42, 0.28]`，不改变可见模型和打气球聚焦设计。
- 验证结果：`npm.cmd test` 101 个测试文件通过；`npm.cmd exec tsc -- --noEmit` 通过；浏览器坐标验证中 `(830,490)`、`(815,495)`、`(845,495)`、`(835,505)` 均可 hover 到 `powerSwitch` 并切换开机。

### BUG-A1：U0 后玻璃旋塞打开被当成放气流程

复现步骤：

1. 创建空气比热容比实验。
2. 打开电源。
3. 打开玻璃旋塞。
4. 点击自由模式 `记录 U0`。

观察结果：

- 页面阶段从 U0/调零附近状态跳到“快速放气”类状态。
- 提示进入“关闭玻璃旋塞，并等待回温稳定”或后续 U2 相关流程。
- 这会阻断你定义的标准真实流程：`电源开 -> 玻璃旋塞开 -> 记录 U0 -> 关闭旋塞 -> 打气 -> 等待 U1`。

初步原因：

- U0 记录模型本身是对的：要求电源开、玻璃旋塞打开、压差接近零。
- 当前自由物理推进只要 `heatCapacityFreeStopcockFlowOpen` 为 true，就会把玻璃旋塞流通交给 `stepFreePhysics`。
- `stepFreePhysics` 不区分“U0 调零通大气”和“U1 后快速放气”，开阀后会创建 `releaseReference` 并把 `releaseStarted` 置为 true。
- `getHeatCapacityFreeRuntimePhase` 再根据 `stopcockOpen && releaseStarted` 推导为 `releasing`。

建议修复方向：

1. 在工作台层引入“放气有效门槛”：只有当前自由实验组已经记录 U1 后，玻璃旋塞打开才允许作为 release 输入传给物理层。
2. U0/调零阶段的玻璃旋塞打开仍应允许与外界连通、允许压差归零，但不应生成 `releaseReference`，也不应把阶段推进到 `releasing/recovering`。
3. 更干净的结构是增加一个语义状态，例如 `stopcockFlowPurpose: "zeroing" | "release"`，或者在 `stepHeatCapacityWorkbenchFile` 内计算 `stopcockOpenForRelease = hasCurrentFreeU1 && heatCapacityFreeStopcockFlowOpen`。
4. 增加回归测试：`power on + stopcock open + record U0 + wait` 后，阶段不得进入 `releasing/recovering`；关闭旋塞后应进入准备打气或等待打气状态。

### RISK-A2：3D 坐标点击对边界点敏感

复现观察：

- 电源开关热点扫描显示 `(830,492)`、`(815,506)` 稳定。
- `(846,505)`、`(830,518)` 虽然视觉上接近电源开关，但自动化点击会漏点。

初步判断：

- 这更像 3D hitbox、透视投影和自动化坐标边界问题，不一定是普通用户手动操作 bug。
- 但后续如果用坐标自动化验收，必须先 hover 到目标控件并确认 `data-heat-capacity-hovered-control` 后再 click。

建议修复方向：

1. 阶段 A 自动化脚本封装 `hoverUntilControl(controlId)`，只有 hover 命中目标控件才执行点击。
2. 对 3D 控件坐标只保留稳定点，不用视觉边缘点。
3. 后续若要更强稳定性，可以考虑开发模式测试钩子或 camera capture 辅助，但不应暴露到正式 UI。

### RISK-A3：打气球必须先进入聚焦模式才会真正打气

复现观察：

- 普通视角下点击打气球不会增加 `Up`。
- 代码中 `pumpBulb` 只有在 `focusMode === "pump"` 时才绑定打气 `onPointerDown`。
- 正确自动化路径是：打开打气阀 -> 双击打气球进入聚焦 -> 在聚焦视角点击打气球。

初步判断：

- 这可能是当前设计，不一定是 bug。
- 如果后续希望“自由模式快速操作更接近真实实操”，可以考虑是否允许普通视角直接打气，或者单击第一次聚焦、第二次打气。

建议修复方向：

1. 先由你确认交互目标：打气是否必须进入聚焦模式。
2. 如果保留聚焦模式，后续 UI 提示和自动化测试都按聚焦路径写。
3. 如果要改成交互更直接，需要单独设计，避免和现有聚焦面板、状态提示、报警退出逻辑冲突。

## 4. 阶段 A 下一步建议

建议先处理 BUG-A1 的修复方向审核。它会直接影响能否完成一条标准真实流程自动化：

`开电源 -> 开旋塞 -> 记录 U0 -> 关旋塞 -> 开打气阀 -> 打气 -> 关打气阀 -> 等待/倍速 -> 记录 U1 -> 开旋塞放气 -> 关旋塞 -> 等待/倍速 -> 记录 U2 -> 计算`

在 BUG-A1 未修复前，继续做完整流程自动化会绕开真实 U0 口径，得到的验收结果价值不高。
