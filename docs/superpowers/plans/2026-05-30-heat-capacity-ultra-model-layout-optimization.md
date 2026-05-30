# 热容比 Ultra 模型布局优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 FD-NCD-C GLB 模型的空间排布，让模型布局尽量贴近当前软件内热容比程序化骨架，先完成模型层验收，再进入后续软件接入。

**Architecture:** 本阶段只做模型优化和模型契约准备，不做软件接入。以当前软件内程序化骨架的位置、命名和交互锚点作为体验基准；GLB 保留原关键节点名和动画目标，通过 Blender 或模型导出流程调整部件布局、管线、阀门、气囊和反馈锚点。

**Tech Stack:** Blender / Blender MCP、GLB 2.0、Three.js GLB 审计脚本、PowerShell、Node.js、现有 React Three Fiber 项目作为骨架参考。

---

## 当前拆分

- [x] **先做模型优化**：把外部 GLB 的部件排布改到更接近当前软件骨架。
- [ ] **后做软件接入**：模型通过视觉和节点验收后，再把它接入 `ultra` 模式。
- [ ] 本阶段不修改热容比实验状态机、不修改 3D 场景行为、不复制 GLB 到主项目运行目录，除非用户在模型验收后确认。

## 已审计的软件骨架基准

当前软件骨架文件：

`<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`

### 当前骨架总结构

当前程序化控件大多位于 `HeatCapacityProceduralSkeleton` 内。该组有 `scale={[0.9]}` 和 `position={[0, -0.08, 0]}`，所以表内同时记录局部坐标和换算后的近似世界坐标。模型优化不能把局部坐标直接当 GLB 根坐标使用。

| 软件骨架对象 | 当前名称 | 坐标空间 | 当前坐标 | 换算后参考 / 后续模型优化含义 |
| --- | --- | --- | --- | --- |
| 总骨架 | `HeatCapacityProceduralSkeleton` | 场景根 | `scale={[0.9]}`，`position={[0, -0.08, 0]}` | GLB 的整体视图比例和重心应对齐这套骨架。 |
| 工作台平面 | `WorkbenchDeck` | 场景根 | `position={[0, -1.55, 0]}` | GLB 不能沉入桌面或漂浮过高。 |
| 瓶体 | `SquareGlassPressureBottle` | 骨架局部 | `position={[-1.3, -0.28, 0]}` | 近似世界坐标 `[-1.17, -0.332, 0]`；GLB 瓶体区域应继续位于左侧。 |
| 旋塞组件 | `GlassStopcockAssembly` | 瓶体局部 | `position={[0, 1.58, 0]}` | 近似世界坐标 `[-1.17, 1.09, 0]`；GLB 的 `Stopcock_Pivot` 应保持在瓶口/上方区域。 |
| 仪表 | `InstrumentBoxRoot` | 骨架局部 | `position={[1.85, -0.5, 0]}` | 近似世界坐标 `[1.665, -0.53, 0]`；GLB 仪表应继续是右侧主要设备。 |
| 打气阀 | `pumpValve` | 骨架局部 | `position={[-1.72, 0.9, 0.54]}` | 近似世界坐标 `[-1.548, 0.73, 0.486]`；GLB 的 `InletValue_*` 应移到瓶塞上方，不应留在气管中段。 |
| 打气球 | `pumpBulb` | 骨架局部 | `position={[1.85, -1.03, 1.05]}` | 近似世界坐标 `[1.665, -1.007, 0.945]`；GLB 的 `Pump_Bulb` 应从左侧移到前方，保持当前操作习惯。 |
| 气管 | `pumpTube` | 骨架局部 | 从打气阀经前方连接到打气球 | GLB 气管应从瓶塞上方阀门出发，沿前方弧线路径连接打气球，避免用户误以为阀门在中段。 |
| 电源 | `PowerSwitch` | 仪表局部 | `position={[0.98, -0.14, 0.56]}` | 近似世界坐标 `[2.547, -0.656, 0.504]`；GLB `FD_NCD_C_PowerSwitch_Button` 位置已合理，保留。 |
| 调零旋钮 | `PressureZeroKnob` | 仪表局部 | `position={[0.22, -0.14, 0.55]}` | 近似世界坐标 `[1.863, -0.656, 0.495]`；GLB `FD_NCD_C_ZeroAdjustKnob` 已存在，保留在仪表前面板。 |
| 温度屏 | `TemperatureDisplay` | 仪表局部 | `position={[-0.64, 0.1, 0.48]}` | 近似世界坐标 `[1.089, -0.44, 0.432]`；GLB 温度屏继续作为动态贴图目标。 |
| 压力屏 | `PressureDisplay` | 仪表局部 | `position={[0, 0.1, 0.48]}` | 近似世界坐标 `[1.665, -0.44, 0.432]`；GLB 压力屏继续作为动态贴图目标。 |

本计划里的“前方”指主项目默认相机可直接看到的正 Z 前景区域。主项目默认相机参数是 `position={[4.15, 2.9, 8.25]}`、`target={[0.25, -0.05, 0]}`、`fov={38}`，所以打气球应靠近当前 `pumpBulb` 的世界参考点，而不是 GLB 原来的左侧 `[-3.1, 0.23, 0.45]`。

### 当前骨架交互命名规则

- 程序化骨架交互控件名多用语义化英文：
  - `pumpValve`
  - `pumpBulb`
  - `PowerSwitch`
  - `PressureZeroKnob`
  - `GlassStopcockAssembly`
  - `HitboxPowerSwitch`
  - `HitboxPressureZeroKnob`
  - `HitboxStopcockHandle`
  - `pumpValveHitbox`
  - `pumpBulbHitbox`
- 反馈名称遵循控件语义：
  - `DemoFocusHaloPowerSwitch`
  - `DemoFocusHaloPressureZero`
  - `DemoFocusHaloStopcock`
  - `DemoFocusHaloPumpValve`
  - `DemoFocusHaloPumpBulb`
- 软件交互状态只识别这些逻辑控件：
  - `powerSwitch`
  - `pressureZero`
  - `stopcock`
  - `pumpValve`
  - `pumpBulb`

模型优化时不需要把 GLB 所有节点改成这些软件名，但必须新增或保留足够清晰的锚点，让后续软件接入能稳定映射到这些逻辑控件。

### demoFocusControlId 映射矩阵

后续 Ultra 必须覆盖 `demo`、`guide`、`free`。模型阶段需要提前准备这些焦点锚点，避免软件接入时发现显示屏或面板没有呼吸位置。

| 项目焦点 ID | 当前含义 | GLB / HSL 锚点 |
| --- | --- | --- |
| `powerSwitch` | 电源开关焦点 | `HSL_ControlAnchor_PowerSwitch` 或 `FD_NCD_C_PowerSwitch_Button` |
| `pressureZero` | 压力调零旋钮焦点 | `HSL_ControlAnchor_PressureZero` 或 `FD_NCD_C_ZeroAdjustKnob` |
| `stopcock` | 旋塞焦点 | `HSL_ControlAnchor_Stopcock` 或 `Stopcock_Pivot` |
| `pumpValve` | 打气阀焦点 | `HSL_ControlAnchor_PumpValve` 或 `InletValue_Pivot` |
| `pumpBulb` | 打气球焦点 | `HSL_ControlAnchor_PumpBulb` 或 `Pump_Bulb` |
| `instrumentPressureDisplay` | 压力显示屏焦点 | `HSL_DisplayAnchor_Pressure` 或 `FD_NCD_C_PressureDisplay` |
| `instrumentTemperatureDisplay` | 温度显示屏焦点 | `HSL_DisplayAnchor_Temperature` 或 `FD_NCD_C_TemperatureDisplay` |
| `instrumentPanel` | 仪表面板整体焦点 | `HSL_LayoutReference_InstrumentPanel` 或 `FD_NCD_C_InstrumentBody` 前面板中心 |

## 已审计的 GLB 模型基准

外部模型文件：

`D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`

### 关键节点现状

| GLB 节点 | 当前位置 / 关系 | 当前问题 | 优化方向 |
| --- | --- | --- | --- |
| `FD_NCD_C_InstrumentBody` | `[1.7000, 0.4100, -0.0500]` | 右侧仪表位置整体接近当前骨架 | 尽量保留，只做必要的整体对齐。 |
| `FD_NCD_C_PowerSwitch_Button` | 仪表子节点 `[0.5099, -0.0053, 0.4360]` | 可用 | 保留名称和局部关系。 |
| `FD_NCD_C_PowerIndicator_LED` | 仪表子节点 `[0.6736, 0.0349, 0.4140]` | 可用 | 保留名称和局部关系。 |
| `FD_NCD_C_PressureDisplay` | 仪表子节点 `[-0.2299, 0.1333, 0.4165]` | 可用，后续要贴动态读数 | 保留名称。 |
| `FD_NCD_C_TemperatureDisplay` | 仪表子节点 `[-0.2299, 0.0212, 0.4165]` | 可用，后续要贴动态读数 | 保留名称。 |
| `FD_NCD_C_ZeroAdjustKnob` | 仪表子节点 `[0.5099, 0.1303, 0.4345]` | 可用 | 保留名称和 `FD_NCD_C_ZeroAdjustKnob_IndicatorLine` 子节点。 |
| `Stopcock_Pivot` | `[-0.9800, 2.0450, -0.0100]` | 基本符合瓶口上方旋塞概念 | 只微调到和瓶塞/瓶口视觉一致。 |
| `Pump_Bulb` | `[-3.1000, 0.2300, 0.4500]` | 在左侧，和当前软件骨架不一致 | 移到前方偏右，接近当前 `pumpBulb` 操作位置。 |
| `InletValue_Group` | `[-2.1300, 1.6000, 0.3900]` | 更像气管中段阀门，和当前软件的瓶塞上方打气阀不一致 | 移到瓶塞上方，成为当前软件逻辑里的 `pumpValve`。 |
| `InletValue_Pivot` | `InletValue_Group` 子节点 | 有动画和旋转支点 | 保留名称、支点和动画目标，整体随 `InletValue_Group` 移动。 |
| `InletValue_THandle` | `InletValue_Pivot` 子节点 | 有手柄 | 保留名称，后续软件映射到 `pumpValve`。 |
| `Airflow_To_Bottle_Group` | `[-2.3500, 1.1000, 0.5500]` | 需要跟随打气管路线 | 重新定位到新打气阀到瓶体方向。 |
| `Airflow_To_Outside_Group` | `[-1.4000, 2.3000, -0.9500]` | 释放流动位置可能还可用 | 跟随旋塞视觉微调。 |

### 必须保留的 GLB 名称、morph target 和动画

这些名称是后续软件契约、资产测试和动画目标的基础，模型优化时不能随意改名：

必需节点：

- `FD_NCD_C_InstrumentBody`
- `FD_NCD_C_PowerSwitch_Button`
- `FD_NCD_C_PowerIndicator_LED`
- `FD_NCD_C_PressureDisplay`
- `FD_NCD_C_TemperatureDisplay`
- `FD_NCD_C_ZeroAdjustKnob`
- `FD_NCD_C_ZeroAdjustKnob_IndicatorLine`
- `Stopcock_Pivot`
- `Pump_Bulb`
- `InletValue_Group`
- `InletValue_Pivot`
- `InletValue_THandle`
- `InletValue_GlassBody`
- `InletValue_HandleStem`
- `InletValue_TubeSocket_PumpSide`
- `InletValue_TubeSocket_BottleSide`
- `Airflow_To_Bottle_Group`
- `Airflow_To_Outside_Group`

必需 morph target 名称：

- `Pump_Bulb_Compressed`

注意：`Pump_Bulb_Compressed` 不是 GLB node，它是 `Pump_Bulb_Mesh` 的 morph target 名称。资产验收必须检查 morph target，而不是用 node 查找它。

必须保留的动画：

- `Pump_Compress_Release`，目标 `Pump_Bulb.weights`
- `Stopcock_Open_Close`，目标 `Stopcock_Pivot.rotation`
- `InletValue_Closed_Open`，目标 `InletValue_Pivot.rotation`
- `PowerSwitch_Button_Press_Test`，目标 `FD_NCD_C_PowerSwitch_Button.translation`
- `ZeroAdjust_Knob_Rotate_Test`，目标 `FD_NCD_C_ZeroAdjustKnob.rotation`

## 模型命名和锚点规范

### 保留原始模型节点名

- 不把 `InletValue_*` 改成 `PumpValve_*`，因为当前 GLB、动画和外部 preview 都依赖 `InletValue_*`。
- 不把 `Pump_Bulb` 改成 `pumpBulb`，因为 morph target 和动画已经使用 `Pump_Bulb`。
- 不把 `FD_NCD_C_*` 改成软件里的 `PowerSwitch` / `PressureZeroKnob`，避免破坏仪表内部结构。

### 新增 HSL 锚点名

如果需要新增空节点或辅助锚点，统一使用 `HSL_` 前缀，表示这是为了当前 `hard-sphere-lab-new` 项目接入而增加的模型锚点：

- `HSL_ControlAnchor_PowerSwitch`
- `HSL_ControlAnchor_PressureZero`
- `HSL_ControlAnchor_Stopcock`
- `HSL_ControlAnchor_PumpValve`
- `HSL_ControlAnchor_PumpBulb`
- `HSL_DisplayAnchor_Pressure`
- `HSL_DisplayAnchor_Temperature`
- `HSL_FlowAnchor_PumpToBottle`
- `HSL_FlowAnchor_StopcockToOutside`
- `HSL_LayoutReference_BottleStopper`
- `HSL_LayoutReference_PumpBulbFront`
- `HSL_LayoutReference_InstrumentPanel`

### 新增元数据

如果 Blender 导出能保留自定义属性，给锚点写入：

- `hsl_role`
- `hsl_control`
- `hsl_source`

示例：

```text
HSL_ControlAnchor_PumpValve
hsl_role = control_anchor
hsl_control = pumpValve
hsl_source = derived_from_existing_procedural_skeleton
```

## 子代理规划

执行时建议使用子代理，但不要让多个子代理同时改同一个模型文件。

- [ ] **子代理 A：软件骨架审计**
  - 只读当前项目代码。
  - 输出当前骨架控件坐标、命名、反馈锚点、模式覆盖表。
  - 不修改文件。

- [ ] **子代理 B：GLB 资产审计**
  - 只读外部 GLB。
  - 输出节点树、动画目标、材质数量、可移动组、不可改名节点。
  - 不修改文件。

- [ ] **子代理 C：模型布局修改**
  - 负责 Blender / GLB 工作副本修改。
  - 只在 A、B 审计结果稳定后开始。
  - 每次只改一个模型工作副本。

- [ ] **子代理 D：模型 QA**
  - 重新解析导出的 GLB。
  - 验证名称、动画、节点、截图、布局是否符合验收。
  - 不做修改，只给审查结论。

推荐顺序：A 和 B 可并行；C 必须等 A/B 完成；D 必须等 C 导出候选 GLB 后执行。

## Task 1：建立模型优化工作副本

**Files:**
- Source: `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`
- Source: `D:\tmp\codex\fd-ncd-c-model-preview\air_heat_capacity_ratio_instrument.py`
- Working output: `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-candidate.glb`
- Report: `<project-root>\docs\superpowers\plans\2026-05-30-heat-capacity-ultra-model-layout-optimization.md`

- [ ] **Step 1：确认不直接改主项目运行目录**

不要创建或修改：

```text
<project-root>\public\models\fd-ncd-c-experiment.glb
```

本阶段只在临时外部仓库或临时工作目录导出候选模型。

- [ ] **Step 2：确认 Blender 可用性**

优先检查 Blender MCP：

```text
Blender MCP get_scene_info
```

如果 MCP 不可用，再检查本机 Blender 路径：

```powershell
Get-Command blender -ErrorAction SilentlyContinue
Get-ChildItem -Path 'D:\program\Blender','D:\Program Files\Blender Foundation','C:\Program Files\Blender Foundation' -Recurse -Filter blender.exe -ErrorAction SilentlyContinue | Select-Object -First 5 FullName
```

Expected:

```text
能找到 Blender 或用户手动启动 Blender MCP。
```

如果找不到 Blender，也不能连接 MCP，停止模型修改，只保留审计计划，并要求用户启动 Blender MCP 或提供 `blender.exe` 路径。不要使用在线转换器、未知第三方导出器或会改变节点/动画/morph target 的替代导出流程。

- [ ] **Step 3：创建候选 GLB 输出命名**

候选文件命名：

```text
fd-ncd-c-experiment.ultra-layout-candidate.glb
```

不要覆盖原文件：

```text
fd-ncd-c-experiment.glb
```

## Task 2：锁定软件骨架参考坐标

**Files:**
- Read: `<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`
- Optional report: `<project-root>\docs\superpowers\plans\2026-05-30-heat-capacity-ultra-model-layout-optimization.md`

- [ ] **Step 1：记录控件参考表**

执行前确认表内关键坐标仍存在：

```text
HeatCapacityProceduralSkeleton: scale 0.9, position [0, -0.08, 0]
SquareGlassPressureBottle: skeleton local [-1.3, -0.28, 0], approx world [-1.17, -0.332, 0]
GlassStopcockAssembly: bottle local [0, 1.58, 0], approx world [-1.17, 1.09, 0]
InstrumentBoxRoot: skeleton local [1.85, -0.5, 0], approx world [1.665, -0.53, 0]
pumpValve: skeleton local [-1.72, 0.9, 0.54], approx world [-1.548, 0.73, 0.486]
pumpBulb: skeleton local [1.85, -1.03, 1.05], approx world [1.665, -1.007, 0.945]
PowerSwitch: instrument local [0.98, -0.14, 0.56], approx world [2.547, -0.656, 0.504]
PressureZeroKnob: instrument local [0.22, -0.14, 0.55], approx world [1.863, -0.656, 0.495]
TemperatureDisplay: instrument local [-0.64, 0.1, 0.48], approx world [1.089, -0.44, 0.432]
PressureDisplay: instrument local [0, 0.1, 0.48], approx world [1.665, -0.44, 0.432]
Default camera: position [4.15, 2.9, 8.25], target [0.25, -0.05, 0], fov 38
```

执行者必须用换算后的世界参考点判断 GLB 根级布局，不得直接把局部坐标写入 GLB 根空间。

- [ ] **Step 2：记录当前打气管路径**

当前程序化管线点：

```text
[-1.72, 0.9, 0.74]
[-2.18, 0.72, 0.92]
[-2.18, -0.3, 1.52]
[-1.18, -1.08, 1.62]
[0.32, -1.28, 1.42]
[1.66, -0.98, 1.08]
```

模型优化时，新的 GLB 气管不必逐点相同，但视觉关系必须相同：从瓶塞上方阀门出发，绕向前方，连接前方打气球。

- [ ] **Step 3：锁定体验基准**

验收时使用这些用户体验规则：

```text
打气阀门应在瓶塞上方或非常接近瓶塞。
打气球应在模型前方，用户一眼能找到。
气管不能让用户误以为阀门在中段。
旋塞仍在瓶口上方。
仪表仍在右侧，屏幕、调零、电源仍在前面板。
```

## Task 3：建立 GLB 节点保护清单

**Files:**
- Read: `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`
- Read: `D:\tmp\codex\fd-ncd-c-model-preview\air_heat_capacity_ratio_instrument.py`

- [ ] **Step 1：解析 GLB 节点和动画**

运行：

```powershell
@'
const fs = require('fs');
const path = 'D:/tmp/codex/fd-ncd-c-model-preview/fd-ncd-c-threejs/public/models/fd-ncd-c-experiment.glb';
const buf = fs.readFileSync(path);
let off = 12;
let json = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  off += 8;
  if (type === 'JSON') json = JSON.parse(buf.slice(off, off + len).toString('utf8'));
  off += len;
}
for (const name of ['FD_NCD_C_InstrumentBody','Stopcock_Pivot','Pump_Bulb','InletValue_Group','InletValue_Pivot','InletValue_THandle','FD_NCD_C_ZeroAdjustKnob']) {
  const idx = json.nodes.findIndex(n => n.name === name);
  console.log(name, idx >= 0 ? 'FOUND' : 'MISSING');
}
const pumpNode = json.nodes.find(node => node.name === 'Pump_Bulb');
const pumpMesh = typeof pumpNode?.mesh === 'number' ? json.meshes[pumpNode.mesh] : null;
const pumpTargetNames = pumpMesh?.extras?.targetNames || [];
const pumpHasPrimitiveTargets = Boolean(pumpMesh?.primitives?.some(primitive => Array.isArray(primitive.targets) && primitive.targets.length > 0));
console.log('morph target Pump_Bulb_Compressed', pumpTargetNames.includes('Pump_Bulb_Compressed') && pumpHasPrimitiveTargets ? 'FOUND' : 'MISSING');
for (const animation of json.animations || []) console.log('animation', animation.name);
'@ | node -
```

Expected:

```text
所有必需节点 FOUND。
五个动画都存在。
Pump_Bulb_Compressed morph target FOUND。
```

- [ ] **Step 2：保护动画目标**

不允许破坏这些目标关系：

```text
Pump_Compress_Release -> Pump_Bulb weights
Stopcock_Open_Close -> Stopcock_Pivot rotation
InletValue_Closed_Open -> InletValue_Pivot rotation
PowerSwitch_Button_Press_Test -> FD_NCD_C_PowerSwitch_Button translation
ZeroAdjust_Knob_Rotate_Test -> FD_NCD_C_ZeroAdjustKnob rotation
```

- [ ] **Step 3：保护模型子树**

移动这些部件时，优先移动整组，不拆散子节点：

```text
Move InletValue_Group as a group.
Move Pump_Bulb with its morph target intact.
Move or rebuild pump tube and airflow groups together.
Do not detach FD_NCD_C_ZeroAdjustKnob_IndicatorLine from FD_NCD_C_ZeroAdjustKnob.
Do not detach FD_NCD_C_PowerSwitch_Button from FD_NCD_C_InstrumentBody unless absolutely necessary.
```

## Task 4：重排打气阀门到瓶塞上方

**Files:**
- Modify working model only.
- Do not modify project runtime model yet.

- [ ] **Step 1：移动 `InletValue_Group`**

目标关系：

```text
InletValue_Group should visually sit on or above the bottle stopper.
InletValue_THandle should be easy to click from the default camera.
InletValue_TubeSocket_BottleSide should point toward the bottle/stem.
InletValue_TubeSocket_PumpSide should point toward the pump tube.
```

不要做：

```text
Do not leave InletValue_Group in the middle of a long tube segment.
Do not rename InletValue_Group.
Do not rename InletValue_Pivot.
Do not break InletValue_Closed_Open.
```

- [ ] **Step 2：检查阀门支点**

阀门开关必须围绕 `InletValue_Pivot` 旋转。

验收：

```text
手柄打开/关闭时，旋转中心稳定。
手柄不穿过瓶塞、气管或仪器。
打开/关闭状态视觉差异明显。
```

- [ ] **Step 3：新增锚点**

在阀门附近新增：

```text
HSL_ControlAnchor_PumpValve
HSL_LayoutReference_BottleStopper
```

锚点要求：

```text
HSL_ControlAnchor_PumpValve 位于用户应点击的阀门中心附近。
HSL_LayoutReference_BottleStopper 位于瓶塞中心或瓶塞顶部。
```

- [ ] **Step 4：新增或确认旋塞锚点**

在 `Stopcock_Pivot` 附近新增或确认：

```text
HSL_ControlAnchor_Stopcock
```

锚点要求：

```text
HSL_ControlAnchor_Stopcock 位于旋塞手柄/旋转核心的点击中心附近。
它应跟随旋塞组件布局，但不替代 Stopcock_Pivot。
后续软件可以用它放置 stopcock 的 hover、呼吸和 demo focus 反馈。
```

## Task 5：重排打气球到前方

**Files:**
- Modify working model only.

- [ ] **Step 1：移动 `Pump_Bulb`**

目标关系：

```text
Pump_Bulb should be in the front area of the scene.
Pump_Bulb should be visually closer to current software pumpBulb than to the old GLB left-side placement.
Pump_Bulb should be unobstructed from the default camera.
Pump_Bulb should remain easy to highlight and click.
```

不要做：

```text
Do not rename Pump_Bulb.
Do not delete the Pump_Bulb_Compressed morph target.
Do not apply destructive mesh operations that remove morph target data.
```

- [ ] **Step 2：保护压缩形态**

导出前后确认：

```text
Pump_Bulb has morph target Pump_Bulb_Compressed.
Pump_Compress_Release still targets Pump_Bulb weights.
```

- [ ] **Step 3：新增锚点**

在气囊中心附近新增：

```text
HSL_ControlAnchor_PumpBulb
HSL_LayoutReference_PumpBulbFront
```

锚点要求：

```text
HSL_ControlAnchor_PumpBulb 位于气囊可点击中心。
HSL_LayoutReference_PumpBulbFront 标记前方布局参考点。
```

## Task 6：重建打气管和流动箭头

**Files:**
- Modify working model only.

- [ ] **Step 1：重建或重排打气管**

目标路线：

```text
Bottle stopper / pump valve -> front path -> Pump_Bulb.
```

视觉规则：

```text
管线不遮挡仪表屏幕。
管线不穿过瓶体主体。
管线不穿过打气阀手柄。
管线不穿过打气球主体。
管线从视觉上说明：打气球通过瓶塞上方阀门向瓶内打气。
```

- [ ] **Step 2：调整 `Airflow_To_Bottle_Group`**

目标：

```text
Airflow_To_Bottle_Group follows the new pump tube direction.
```

保留名称：

```text
Airflow_To_Bottle_Group
Airflow_To_Bottle_Arrow_01
Airflow_To_Bottle_Arrow_02
Airflow_To_Bottle_Arrow_03
Airflow_To_Bottle_Arrow_04
```

- [ ] **Step 3：调整 `Airflow_To_Outside_Group`**

目标：

```text
Airflow_To_Outside_Group remains visually associated with Stopcock_Pivot.
```

保留名称：

```text
Airflow_To_Outside_Group
Airflow_To_Outside_Arrow_01
Airflow_To_Outside_Arrow_02
Airflow_To_Outside_Arrow_03
```

- [ ] **Step 4：新增流动锚点**

新增：

```text
HSL_FlowAnchor_PumpToBottle
HSL_FlowAnchor_StopcockToOutside
```

## Task 7：保持仪表、调零、电源和屏幕可接入

**Files:**
- Modify working model only if necessary.

- [ ] **Step 1：保护仪表前面板**

保持：

```text
FD_NCD_C_InstrumentBody
FD_NCD_C_PowerSwitch_Button
FD_NCD_C_PowerIndicator_LED
FD_NCD_C_PressureDisplay
FD_NCD_C_TemperatureDisplay
FD_NCD_C_ZeroAdjustKnob
FD_NCD_C_ZeroAdjustKnob_IndicatorLine
```

- [ ] **Step 2：新增控件锚点**

新增或确认：

```text
HSL_ControlAnchor_PowerSwitch
HSL_ControlAnchor_PressureZero
HSL_DisplayAnchor_Pressure
HSL_DisplayAnchor_Temperature
HSL_LayoutReference_InstrumentPanel
```

- [ ] **Step 3：检查屏幕贴图空间**

验收：

```text
PressureDisplay surface faces the default camera enough to be readable.
TemperatureDisplay surface faces the default camera enough to be readable.
No tube or valve crosses in front of the displays.
```

## Task 8：导出候选 GLB 并做节点验收

**Files:**
- Output: `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-candidate.glb`

- [ ] **Step 1：导出 GLB**

导出设置：

```text
Format: GLB
Include custom properties if available.
Keep animation data.
Keep morph target data.
Do not apply destructive mesh simplification.
```

- [ ] **Step 2：解析导出文件**

运行：

```powershell
@'
const fs = require('fs');
const path = 'D:/tmp/codex/fd-ncd-c-model-preview/fd-ncd-c-threejs/public/models/fd-ncd-c-experiment.ultra-layout-candidate.glb';
const buf = fs.readFileSync(path);
let off = 12;
let json = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  off += 8;
  if (type === 'JSON') json = JSON.parse(buf.slice(off, off + len).toString('utf8'));
  off += len;
}
const requiredNodes = [
  'FD_NCD_C_InstrumentBody',
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_PressureDisplay',
  'FD_NCD_C_TemperatureDisplay',
  'FD_NCD_C_ZeroAdjustKnob',
  'FD_NCD_C_ZeroAdjustKnob_IndicatorLine',
  'Stopcock_Pivot',
  'Pump_Bulb',
  'InletValue_Group',
  'InletValue_Pivot',
  'InletValue_THandle',
  'Airflow_To_Bottle_Group',
  'Airflow_To_Outside_Group',
  'HSL_ControlAnchor_PumpValve',
  'HSL_ControlAnchor_PumpBulb',
  'HSL_ControlAnchor_Stopcock',
  'HSL_ControlAnchor_PowerSwitch',
  'HSL_ControlAnchor_PressureZero',
  'HSL_DisplayAnchor_Pressure',
  'HSL_DisplayAnchor_Temperature',
  'HSL_LayoutReference_InstrumentPanel',
  'HSL_LayoutReference_BottleStopper',
  'HSL_LayoutReference_PumpBulbFront',
  'HSL_FlowAnchor_PumpToBottle',
  'HSL_FlowAnchor_StopcockToOutside'
];
const nodeByName = new Map((json.nodes || []).map((node, index) => [node.name, { node, index }]));
const meshByIndex = new Map((json.meshes || []).map((mesh, index) => [index, mesh]));
let failed = false;
const report = (label, ok) => {
  console.log(`${label}: ${ok ? 'FOUND' : 'MISSING'}`);
  if (!ok) failed = true;
};
for (const name of requiredNodes) {
  report(name, nodeByName.has(name));
}
const pumpNode = nodeByName.get('Pump_Bulb')?.node;
const pumpMesh = typeof pumpNode?.mesh === 'number' ? meshByIndex.get(pumpNode.mesh) : null;
const pumpTargetNames = pumpMesh?.extras?.targetNames || [];
const pumpHasPrimitiveTargets = Boolean(pumpMesh?.primitives?.some(primitive => Array.isArray(primitive.targets) && primitive.targets.length > 0));
report('morph target Pump_Bulb_Compressed', pumpTargetNames.includes('Pump_Bulb_Compressed') && pumpHasPrimitiveTargets);

const animationChecks = [
  { animation: 'Pump_Compress_Release', node: 'Pump_Bulb', path: 'weights' },
  { animation: 'Stopcock_Open_Close', node: 'Stopcock_Pivot', path: 'rotation' },
  { animation: 'InletValue_Closed_Open', node: 'InletValue_Pivot', path: 'rotation' },
  { animation: 'PowerSwitch_Button_Press_Test', node: 'FD_NCD_C_PowerSwitch_Button', path: 'translation' },
  { animation: 'ZeroAdjust_Knob_Rotate_Test', node: 'FD_NCD_C_ZeroAdjustKnob', path: 'rotation' },
];
for (const check of animationChecks) {
  const animation = (json.animations || []).find(item => item.name === check.animation);
  const ok = Boolean(animation?.channels?.some(channel => (
    json.nodes?.[channel.target.node]?.name === check.node &&
    channel.target.path === check.path
  )));
  report(`animation ${check.animation} -> ${check.node}.${check.path}`, ok);
}
if (failed) process.exitCode = 1;
'@ | node -
```

Expected:

```text
所有必需节点存在。
所有 HSL_ 锚点存在。
五个动画存在。
Pump_Bulb_Compressed morph target 名称和 primitive targets 仍可用。
```

- [ ] **Step 3：禁止验收的失败情况**

任一情况出现都不能进入软件接入：

```text
Pump_Bulb_Compressed morph target 丢失。
InletValue_Closed_Open 丢失。
Stopcock_Open_Close 丢失。
FD_NCD_C_ZeroAdjustKnob_IndicatorLine 脱离旋钮。
InletValue_Group 仍在气管中段。
Pump_Bulb 仍在左侧。
屏幕被管线或气囊遮挡。
```

## Task 9：视觉验收

**Files:**
- Candidate GLB: `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-candidate.glb`

- [ ] **Step 1：Blender 默认视角截图**

截图至少包含：

```text
front/default view
slightly top-down view
right-side view
main-project camera view: position [4.15, 2.9, 8.25], target [0.25, -0.05, 0], fov 38
```

验收：

```text
打气球位于前方。
打气阀位于瓶塞上方。
管线路径符合当前软件骨架逻辑。
旋塞仍在瓶口上方。
仪表仍在右侧。
屏幕、电源、调零旋钮可见。
主项目默认相机视角下，打气球、打气阀、旋塞、仪表屏幕都可见且不互相遮挡。
```

- [ ] **Step 2：浏览器 preview 验证**

外部 preview 工程默认硬编码加载 `/models/fd-ncd-c-experiment.glb`。不要覆盖原始审计源，也不要修改主项目。正确做法是创建一个临时 scratch preview，把候选 GLB 复制成 scratch preview 里的硬编码文件名。

准备 scratch preview：

```powershell
$sourcePreview = 'D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs'
$scratchPreview = 'D:\tmp\codex\fd-ncd-c-candidate-preview\fd-ncd-c-threejs'
$candidateGlb = 'D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-candidate.glb'
if (Test-Path $scratchPreview) { throw "Scratch preview already exists. Inspect it before reusing or choose a new scratch path." }
New-Item -ItemType Directory -Force -Path $scratchPreview, "$scratchPreview\public\models" | Out-Null
Copy-Item -Path "$sourcePreview\package*.json", "$sourcePreview\index.html" -Destination $scratchPreview
Copy-Item -Path "$sourcePreview\src" -Destination $scratchPreview -Recurse
Copy-Item -Path $candidateGlb -Destination "$scratchPreview\public\models\fd-ncd-c-experiment.glb"
cd $scratchPreview
npm.cmd install --cache D:\tmp\codex\npm-cache
npm.cmd exec vite -- --host 127.0.0.1 --port 5181 --strictPort
```

打开：

```text
http://127.0.0.1:5181/
```

说明：

```text
5181 只用于外部模型 viewer。
一旦修改主项目代码或用户可见项目行为，仍必须按 AGENTS.md 使用 5174 预览主项目。
scratch preview 是临时隔离目录，不进入主项目，不覆盖源 GLB。
```

验收：

```text
模型非空。
候选 GLB 可加载。
阀门、气囊、旋塞、仪表都在可见区域。
没有明显穿模。
```

完成后停止 5181 端口服务。

## Task 10：用户验收交付

**Files:**
- Candidate GLB: `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-candidate.glb`
- Plan: `<project-root>\docs\superpowers\plans\2026-05-30-heat-capacity-ultra-model-layout-optimization.md`

- [ ] **Step 1：向用户展示候选模型**

交付内容：

```text
候选 GLB 路径。
截图路径。
外部 preview URL，若服务仍在运行。
已通过的节点/动画检查结果。
仍存在的视觉风险。
```

- [ ] **Step 2：用户只验收模型布局**

本阶段用户验收重点：

```text
打气球位置是否舒服。
打气阀是否像当前软件骨架那样在瓶塞上方。
气管是否符合直觉。
旋塞是否仍容易理解。
仪表是否清晰。
整体是否适合进入软件接入。
```

不在本阶段验收：

```text
React 代码接入。
项目状态同步。
demo / guide / free 软件流程。
最终发布。
```

## 后续衔接

模型布局验收通过后，再回到总计划：

`<project-root>\docs\superpowers\plans\2026-05-29-heat-capacity-ultra-glb-mode.md`

后续软件接入应以候选模型的 `HSL_` 锚点和保留节点作为契约输入。

## 停止条件

- [ ] 找不到 Blender 或 Blender MCP，且无法导入/导出 GLB。
- [ ] 移动 `Pump_Bulb` 后丢失 `Pump_Bulb_Compressed` morph target。
- [ ] 移动 `InletValue_Group` 后 `InletValue_Closed_Open` 动画目标失效。
- [ ] 打气阀放到瓶塞上方后支点不自然，手柄穿模严重。
- [ ] 打气球放到前方后遮挡仪表或瓶体关键区域。
- [ ] 模型重排后名称和动画无法通过 GLB 解析验收。
- [ ] 用户认为布局不符合当前软件骨架体验。

触发停止条件时，不进入软件接入，先继续模型优化。
