# 热容比 Ultra 阀门与打气管干净重建计划

> **给后续执行者的要求：**执行本计划时必须按任务清单逐项勾选。建议使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development`。
>
> **当前状态：本文件原为执行计划，已在用户后续确认“执行计划 / 开始修改”后执行。**前半部分保留原始计划和门禁要求，后半部分记录实际执行、用户反馈和固化结果。

**目标：**从干净基线重建 FD-NCD-C Ultra 候选模型的打气阀门与打气管连接，让打气球端、阀门端、瓶塞短接头都没有断口、穿模、悬空和错轴。

**总体方案：**最终候选模型从原始 GLB 干净重放改造，不再基于 `candidate-v10` 或 `candidate-v11` 继续堆隐藏旧节点。打气球端保留现有打气球与黑色接口结构，只重建灰管端点对接；阀门端删除旧阀门视觉件，保留软件契约节点，重新建立现实球阀结构、下方短接头和侧边打气管接口。

**使用工具：**Blender / Blender MCP、GLB 2.0、Three.js 预览、Python GLB 审计脚本、PowerShell、Playwright。

---

## 已确认需求

- [x] 阀门采用“侧边阀体 + 下方短接头插入瓶塞”的方案。
- [x] 打气球端灰管插进黑色接头内，并用黑色套筒盖住接缝。
- [x] 打气球后续会有压缩变形，灰管不能插入到会变形的橙色球体内部。
- [x] 红色手柄采用现实球阀的红色蝶形手柄，要做成完整精致的球阀，不要像纸片或分离碎片。
- [x] 阀门端现有视觉内容可以删除，建立干净的新阀门。
- [x] 审核通过前不开始执行。

## 不做的事

- [ ] 不修改主项目 Ultra 接入代码。
- [ ] 不覆盖主项目运行资源目录里的 GLB。
- [ ] 不基于 `candidate-v10` 或 `candidate-v11` 继续堆隐藏节点。
- [ ] 不把模型自带逻辑接入软件；后续仍由软件状态机控制阀门、打气球、高亮和呼吸。

## 文件边界

**只读参考：**

- `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`
- `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-candidate-v10.glb`
- `<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`
- `<project-root>\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts`
- `<project-root>\AGENTS.md`
- `<project-root>\docs\instrument-modeling\reference\Blender模型接入规则-v4.0.1.md`

**审核通过后允许新建：**

- `D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`
- `D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-clean-valve-candidate.glb`
- `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-*.png`
- `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-audit.json`
- `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-anchor-map.json`
- `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-contract-map.json`
- `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-subasset-ball-valve.glb`

**禁止修改，除非用户后续单独确认接入阶段开始：**

- `<project-root>\public\models\fd-ncd-c-experiment.glb`
- `<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`
- 任何主项目实验状态、公式、导出、结果数据相关文件。

## 必须保留的模型契约

- [ ] 保留 `Pump_Bulb`，并保留 `Pump_Bulb_Compressed` 变形目标。
- [ ] 保留 `InletValue_Group`，作为阀门总定位组。
- [ ] 保留 `InletValue_Pivot`，作为软件旋转阀门手柄的节点。
- [ ] 新红色蝶形手柄必须命名为 `InletValue_THandle`，并挂在 `InletValue_Pivot` 下。
- [ ] 新手柄支杆必须命名为 `InletValue_HandleStem`。
- [ ] 保留 `Stopcock_Pivot`、`FD_NCD_C_PowerSwitch_Button`、`FD_NCD_C_ZeroAdjustKnob`、两个显示屏节点。
- [ ] 保留动画名称：
  - `Pump_Compress_Release`
  - `Stopcock_Open_Close`
  - `InletValue_Closed_Open`
  - `PowerSwitch_Button_Press_Test`
  - `ZeroAdjust_Knob_Rotate_Test`

## 必须对齐的主项目交互契约

以下名称来自现有程序骨架和测试断言。执行本计划时，GLB 内部可以继续保留原模型节点名，但必须额外输出一份契约映射，证明后续 Ultra 接入时能把 GLB 节点绑定到现有软件控件。

- [ ] `pumpAssembly`：打气系统总根节点，对应外部模型里的打气球、灰管、阀门和瓶塞进气短接头。
- [ ] `pumpValve`：打气阀门交互控件，对应 `InletValue_Group` 或 `HSL_ControlAnchor_PumpValve`。
- [ ] `pumpValveHandle`：打气阀门旋转手柄，对应 `InletValue_Pivot` 下的新 `InletValue_THandle`。
- [ ] `pumpValveBody`：固定金属球阀主体，对应新建的 `HSL_BallValve_Body`。
- [ ] `pumpValveWingHandle`：红色蝶形手柄视觉件，对应新建的 `InletValue_THandle` 或其子节点。
- [ ] `pumpTube`：外绕灰色打气软管，对应新建连续曲线管 `HSL_PumpTube_Rebuilt`。
- [ ] `pumpBulb`：打气球视觉与动画控件，对应 `Pump_Bulb`。
- [ ] `pumpBulbHitbox`：打气球点击区域，对应 `HSL_Hitbox_PumpBulb`，不得直接依赖橙色球体网格作为唯一点击目标。
- [ ] `pumpPortOnStopper`：瓶塞上的打气入口，对应 `HSL_Anchor_Stopper_InletPort`。
- [ ] `pumpShortConnectorIn`：瓶塞到阀门下方短接头，对应 `HSL_BallValve_LowerStem`。
- [ ] `pumpShortConnectorOut`：阀门侧边到灰管套筒，对应 `HSL_BallValve_PumpSideSleeve`。

契约映射必须写入：

```text
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-contract-map.json
```

映射文件必须使用中文说明字段，不允许只给英文或只给坐标。

## 建模约束

### 打气球接口

- [ ] 灰管终点必须与黑色接头同轴。
- [ ] 灰管终点进入黑色接头套筒，但不能进入橙色打气球主体。
- [ ] 灰管插入深度控制为黑色套筒长度的 25%-45%。
- [ ] 黑色套筒长度必须覆盖灰管端面，近景不能看到灰管截面露在外面。
- [ ] 压缩变形到最大时，灰管与橙色球体之间保留可见间隙，不能穿进橙色球体。

### 阀门与瓶塞

- [ ] 删除旧阀门视觉件，包括旧透明阀体、旧横杆、旧玻璃套管和旧中段阀体。
- [ ] 保留 `InletValue_Group` / `InletValue_Pivot` 节点名，不删除这两个契约节点。
- [ ] 新阀门由这些实体组成：
  - 金属球阀本体。
  - 左右六角或圆角金属接头。
  - 侧边打气管接口。
  - 下方短接头。
  - 黑色瓶塞密封座。
  - 红色蝶形手柄。
- [ ] 下方短接头必须插入瓶塞孔位，视觉上不能悬空。
- [ ] 下方短接头不使用透明管，不允许出现“透明段连接阀门和瓶塞”的效果。
- [ ] 阀体尺寸要小于瓶塞直径，不能显得比瓶塞还笨重。
- [ ] 红色手柄默认关闭状态应与管路方向明显不一致；打开后旋转 90 度，肉眼能看出状态变化。

### 管线路径

- [ ] 灰管从打气球端外绕，保持当前骨架逻辑，不穿过传感器、主机连接线、蓝线、橙线、黑线。
- [ ] 灰管是连续曲线网格，不能用多段直圆柱拼接。
- [ ] 灰管到阀门端必须接入阀门侧边接口，不允许插到阀体侧面中间形成穿模。
- [ ] 阀门到瓶塞的连接由金属短接头和黑色密封座完成，不再使用灰色软管连接瓶塞。

## 任务 1：只读审计干净基线

**文件：**

- 读取：`D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`
- 审核通过后写入：`D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-source-audit.json`

- [ ] **步骤 1：审计原始 GLB 节点、动画、变形目标**

审核通过后运行：

```powershell
python D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_glb_contract.py `
  --input D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb `
  --output D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-source-audit.json
```

期望结果：

```text
required_nodes_missing: []
required_animations_missing: []
required_morph_targets_missing: []
duplicate_node_names: {}
```

- [ ] **步骤 2：记录现有可复用部件**

必须确认这些部件可复用：

```text
Pump_Bulb
Pump_Bulb_Compressed
打气球黑色接头或黑色接口几何
瓶塞表面和瓶塞孔位
FD_NCD_C 仪器和已有电线
压力传感器和已有蓝色、橙色、黑色线束
```

如果原始 GLB 内找不到稳定的打气球黑色接头节点，则只参考 `candidate-v10` 的几何位置和比例；最终仍在干净源上重建，不继承 `candidate-v10` 的隐藏节点。

## 任务 2：建立几何锚点表

**文件：**

- 审核通过后写入：`D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-anchor-map.json`
- 审核通过后写入：`D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-contract-map.json`

- [ ] **步骤 1：定义打气球端锚点**

锚点必须包含以下机器字段名，字段说明写入中文：

```json
{
  "PumpBulb_Nozzle_Axis": "黑色接头的局部前向轴",
  "PumpBulb_Nozzle_PortCenter": "黑色接头外侧开口中心",
  "PumpBulb_Tube_InsertEnd": "灰管插入黑色套筒后的终点，必须位于橙色球体压缩变形范围之外",
  "PumpBulb_Compressed_ClearanceVolume": "打气球最大压缩状态下需要避开的体积范围"
}
```

验收标准：

```text
灰管插入终点位于黑色套筒内部。
灰管插入终点位于压缩后的橙色球体范围之外。
灰管轴线与黑色接头轴线夹角不超过 5 度。
```

- [ ] **步骤 2：定义瓶塞与阀门锚点**

锚点必须包含以下机器字段名，字段说明写入中文：

```json
{
  "Stopper_Inlet_PortCenter": "瓶塞进气孔中心",
  "Stopper_Inlet_Normal": "瓶塞孔位向外的法线方向",
  "Valve_LowerStem_Bottom": "阀门下方短接头插入瓶塞的一端",
  "Valve_LowerStem_Top": "阀门下方短接头连接球阀本体的一端",
  "Valve_PumpSide_PortCenter": "阀门侧边连接灰管的接口中心",
  "Valve_Handle_Pivot": "红色蝶形手柄旋转中心"
}
```

验收标准：

```text
阀门下方短接头底端位于瓶塞孔位内或密封座内。
阀门下方短接头顶端连接金属阀体。
阀门侧边接口中心不埋在阀体网格内部。
```

## 任务 2.5：建立主项目契约映射表

**文件：**

- 审核通过后写入：`D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-contract-map.json`

- [ ] **步骤 1：读取主项目当前契约**

审核通过后只读检查：

```powershell
Select-String -Path <project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx `
  -Pattern 'name="pumpAssembly"|name="pumpValve"|name="pumpValveHandle"|name="pumpValveBody"|name="pumpValveWingHandle"|name="pumpTube"|name="pumpBulb"|name="pumpBulbHitbox"|name="pumpPortOnStopper"|name="pumpShortConnectorIn"|name="pumpShortConnectorOut"'
```

期望结果：

```text
所有上述程序骨架名称都能在当前主项目里找到。
如果主项目名称已变化，停止执行并先更新本计划，不得按旧名称继续改模型。
```

- [ ] **步骤 2：写出 GLB 到主项目的映射**

映射文件必须至少包含：

```json
{
  "版本": "clean-valve-candidate",
  "用途": "说明 Ultra GLB 候选模型如何对应主项目现有程序骨架控件",
  "映射": {
    "pumpAssembly": {
      "模型节点或锚点": "HSL_ControlRoot_PumpAssembly",
      "中文说明": "打气系统总根节点，包含打气球、灰管、阀门和瓶塞进气短接头"
    },
    "pumpValve": {
      "模型节点或锚点": "InletValue_Group 或 HSL_ControlAnchor_PumpValve",
      "中文说明": "打气阀门点击、高亮、呼吸和引导目标"
    },
    "pumpValveHandle": {
      "模型节点或锚点": "InletValue_Pivot",
      "中文说明": "阀门手柄旋转中心，只负责开关状态的 90 度旋转"
    },
    "pumpValveBody": {
      "模型节点或锚点": "HSL_BallValve_Body",
      "中文说明": "固定金属球阀主体，不随手柄旋转"
    },
    "pumpValveWingHandle": {
      "模型节点或锚点": "InletValue_THandle",
      "中文说明": "红色蝶形手柄视觉件，挂在 InletValue_Pivot 下"
    },
    "pumpTube": {
      "模型节点或锚点": "HSL_PumpTube_Rebuilt",
      "中文说明": "连续灰色外绕打气软管"
    },
    "pumpBulb": {
      "模型节点或锚点": "Pump_Bulb",
      "中文说明": "打气球视觉和压缩变形目标"
    },
    "pumpBulbHitbox": {
      "模型节点或锚点": "HSL_Hitbox_PumpBulb",
      "中文说明": "打气球独立点击区域"
    }
  }
}
```

验收标准：

```text
主项目每一个 pump 相关交互控件都有明确模型节点或 HSL_ 锚点。
映射不能引入新的实验状态字段。
映射不能要求主项目读取模型内部压力、温度、gamma 或试次数据。
```

## 任务 3：重建阀门端

**文件：**

- 审核通过后新建：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`
- 审核通过后输出：`D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-clean-valve-candidate.glb`

- [ ] **步骤 1：保留契约节点，删除旧阀门视觉子节点**

执行逻辑：

```text
保留 InletValue_Group。
保留 InletValue_Pivot。
删除或不导出以下旧视觉子节点：
  InletValue_GlassBody
  InletValue_HandleJoint
  InletValue_HandleStem
  InletValue_RotatingPlugCore
  InletValue_THandle
  InletValue_TubeSocket_PumpSide
  InletValue_TubeSocket_BottleSide
```

期望结果：

```text
InletValue_Group 存在。
InletValue_Pivot 存在。
旧阀门视觉网格不出现在最终干净导出中，而不是仅仅缩放到 0.001。
```

- [ ] **步骤 2：新建完整现实球阀**

新节点命名：

```text
HSL_BallValve_Body
HSL_BallValve_PumpSideConnector
HSL_BallValve_LowerStem
HSL_BallValve_StopperSeal
InletValue_HandleStem
InletValue_THandle
```

父子关系：

```text
InletValue_Group
  HSL_BallValve_Body
  HSL_BallValve_PumpSideConnector
  HSL_BallValve_LowerStem
  HSL_BallValve_StopperSeal
  InletValue_Pivot
    InletValue_HandleStem
    InletValue_THandle
```

期望结果：

```text
InletValue_Pivot 旋转时，只有红色手柄和手柄支杆旋转。
金属阀体和下方短接头保持固定。
```

- [ ] **步骤 3：细化红色蝶形手柄**

手柄几何要求：

```text
一个中心帽。
左右两个圆角蝶形翼片。
边缘做倒角或圆角。
使用带高光的红色材质。
不能像分离纸片。
翼片和中心帽之间不能有可见缝隙。
```

视觉期望：

```text
近景看起来像完整塑料或喷漆金属手柄，而不是几片红色薄片拼起来。
```

## 任务 4：重建打气管连接

**文件：**

- 审核通过后修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`

- [ ] **步骤 1：保留打气球端结构，只重建灰管端点**

打气球端策略：

```text
保留 Pump_Bulb 和黑色接头结构。
创建或保留黑色套筒，位置在接头开口处。
灰管终点进入黑色套筒。
灰管不得进入会变形的橙色打气球网格。
```

期望结果：

```text
默认状态下，灰管端面被黑色套筒遮住。
压缩变形状态下，灰管仍然不穿进橙色打气球。
```

- [ ] **步骤 2：阀门端灰管对接到侧边接头**

阀门端策略：

```text
灰管终点等于 Valve_PumpSide_PortCenter。
灰管末端切线方向等于阀门侧边接头轴线方向。
灰管半径小于或等于侧边接头的视觉内径。
侧边接头套筒覆盖灰管终点。
```

期望结果：

```text
灰管截面不露在侧边接头外面。
灰管终点不漂在阀体旁边。
灰管不穿过金属阀体。
```

- [ ] **步骤 3：保持外绕路径**

路径控制点必须绕开线束：

```text
PumpBulb_Tube_InsertEnd
前方或外侧避让点
左侧外绕点
阀门接近点
Valve_PumpSide_PortCenter
```

期望结果：

```text
灰管保持在线束外侧。
默认视角下，灰管不穿过蓝色、橙色、黑色电线。
```

## 任务 5：Blender 路线与回退路线

**文件：**

- Blender 路线输出：`D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-clean-valve-candidate.glb`
- Blender 子资产输出：`D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-subasset-ball-valve.glb`
- 脚本回退路线：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`

- [ ] **步骤 1：优先评估 Blender MCP**

审核通过后运行：

```text
Blender MCP get_scene_info
```

期望结果：

```text
Blender 可以连接。
Blender 场景可以导入原始 GLB。
```

- [ ] **步骤 2：做一次只导入再导出的保真审计**

只导入再导出，不改模型。

验收标准：

```text
必须保留节点名。
必须保留动画名。
必须保留 Pump_Bulb_Compressed 变形目标。
材质透明度不能被意外改变。
```

- [ ] **步骤 3：选择执行路线**

路线选择规则：

```text
首选路线：Blender 只制作高质量球阀子资产，不直接把整个原始 GLB 作为最终导出源。
合并路线：用 Python GLB 脚本把 Blender 子资产合并回原始 GLB，保留原始动画、变形目标、材质和节点路径。
整体 Blender 导出路线：只有在只导入再导出保真审计完全通过时才允许使用。
回退路线：如果 Blender 往返破坏动画、变形目标或节点名，禁止整体导出，改为 Python GLB 网格生成或子资产合并。
```

- [ ] **步骤 4：制作球阀子资产时的硬性约束**

Blender 子资产只能包含：

```text
金属球阀本体。
左右或侧边接头。
下方短接头。
黑色密封座。
红色蝶形手柄。
必要倒角、法线和材质。
```

Blender 子资产不得包含：

```text
实验状态机。
压力、温度、gamma、试次数据。
外部预览 App 状态。
主项目 React 代码。
主项目 public\models 运行资源。
```

验收标准：

```text
子资产能单独打开查看。
子资产没有旧透明阀体、旧纸片手柄、旧横穿阀体结构。
子资产导入原始 GLB 后，原始动画和 Pump_Bulb_Compressed 仍存在。
```

## 任务 6：自动验收脚本

**文件：**

- 审核通过后新建：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py`
- 审核通过后读取：`D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-clean-valve-candidate.glb`

- [ ] **步骤 1：结构验收**

审核通过后运行：

```powershell
python D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py `
  --input D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-clean-valve-candidate.glb
```

期望结果：

```text
required_nodes_missing: []
required_animations_missing: []
required_morph_targets_missing: []
duplicate_node_names: {}
old_valve_visual_nodes_present: []
contract_map_missing_keys: []
hsl_anchor_missing_keys: []
```

- [ ] **步骤 2：几何验收**

期望结果：

```text
pump_tube_to_pump_sleeve_axis_error_deg <= 5
pump_tube_end_inside_black_sleeve: true
pump_tube_intersects_compressed_bulb: false
valve_tube_to_side_connector_axis_error_deg <= 5
valve_lower_stem_seated_in_stopper: true
grey_tube_crosses_wire_bundle_default_view: false
pump_bulb_compressed_clearance_mm > 0
valve_handle_rotation_axis_matches_contract: true
valve_handle_rotates_without_moving_body: true
```

## 任务 7：浏览器视觉验收

**文件：**

- 审核通过后预览复制目标：`D:\tmp\codex\fd-ncd-c-candidate-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`
- 审核通过后截图：
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-global.png`
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-connection.png`
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-valve-connection.png`
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-user-angle-pump-sleeve.png`
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-user-angle-valve-stopper.png`
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-inlet-open.png`
  - `D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-compressed.png`

- [ ] **步骤 1：启动预览**

审核通过后运行：

```powershell
cd D:\tmp\codex\fd-ncd-c-candidate-preview\fd-ncd-c-threejs
npm.cmd exec vite -- --host 127.0.0.1 --port 5181 --strictPort
```

预览地址：

```text
http://127.0.0.1:5181/?v=clean-valve
```

- [ ] **步骤 2：检查七张截图**

验收标准：

```text
全局视角：管线路径保持外绕，没有明显穿过线束。
打气球接口近景：灰管进入黑色套筒，没有露出截面，没有刺入打气球。
阀门连接近景：阀门侧边接头和灰管同轴，接缝被套筒覆盖。
用户问题角度-打气球套筒：复现用户截图中指出的打气球端接缝角度，灰管不能悬空、错位或露出截面。
用户问题角度-阀门瓶塞：复现用户截图中指出的阀门端角度，侧管、下方短接头、瓶塞孔位不能错轴、穿模或透明悬浮。
瓶塞近景：下方短接头明确插入瓶塞密封座，没有透明悬浮段。
打开和关闭对比：红色蝶形手柄旋转清楚可见。
打气球压缩视角：压缩后不暴露灰管穿进打气球的问题。
```

- [ ] **步骤 3：检查控制台与点击**

控制台期望：

```text
错误数量为 0。
表示 GLB 加载失败或动画失败的警告数量为 0。
InletValue_Hitbox created: true
contract_map loaded: true
```

交互期望：

```text
点击阀门区域后，Inlet Valve 能在 Closed 和 Open 之间切换。
点击打气球后，打气球压缩动画仍然运行。
切换阀门时只有红色蝶形手柄旋转，金属阀体、下方短接头和灰管接口不跟着整体转动。
```

## 任务 8：审核交付

- [ ] **步骤 1：交付候选模型和证据**

交付内容：

```text
最终候选 GLB 路径。
审计 JSON 路径。
五张截图路径。
主项目契约映射 JSON 路径。
预览地址。
预览命令。
已知限制。
```

- [ ] **步骤 2：用户审核**

用户重点审核：

```text
打气球端是否还穿模。
阀门侧边管线是否错位。
阀门下方短接头是否真的插入瓶塞。
红色蝶形手柄是否足够真实、完整、精致。
整体是否比当前 candidate-v10 更接近软件骨架体验。
```

只有用户确认模型验收后，才进入下一份计划：把干净阀门候选模型接入主项目 Ultra 模式。

## 推荐执行方式

- [ ] 优先使用一个子代理做只读模型审计：只输出原始 GLB 节点、动画、变形目标、可复用接口，不修改文件。
- [ ] 主代理执行模型重建：避免多个代理同时改同一个 GLB。
- [ ] 再用一个子代理做 QA 审核：只读最终 GLB 和截图，专门找穿模、命名冲突、动画丢失、隐藏节点堆积。

## 风险与回退

- [ ] 如果 Blender 导入再导出丢失动画或变形目标，立即停止 Blender 导出路线，改用 Python GLB 生成路线。
- [ ] 如果 Blender 制作的球阀子资产质量更好但整体 GLB 往返不稳定，保留 Blender 子资产，使用 Python 脚本合并进原始 GLB。
- [ ] 如果灰管外绕路径导致和线束冲突，优先移动管线控制点，不移动仪器、电线或传感器。
- [ ] 如果阀门下方短接头插入瓶塞后遮挡瓶塞其他结构，优先缩小阀体和短接头，不改变“下方短接头插入瓶塞”的已确认方向。
- [ ] 如果打气球压缩变形暴露接缝，优先加长黑色套筒或减少灰管插入深度，不让灰管进入橙色球体。
- [ ] 如果 GLB 节点名和主项目 `pumpValve` / `pumpBulb` / `pumpTube` 契约无法一一对应，停止模型接入，先补 `HSL_` 锚点或契约映射，不在主项目里临时硬编码脆弱路径。

## 执行记录：2026-05-30 阶段 0-4

- [x] 阶段 0：确认本轮只改候选与临时预览目录，不接入主项目运行资源。
- [x] 阶段 1：完成源 GLB 契约审计，保留 `Pump_Bulb`、`Pump_Bulb_Compressed`、`InletValue_Group`、`InletValue_Pivot`、`Stopcock_Pivot`、电源、调零旋钮和显示屏契约。
- [x] 阶段 2：建立 `clean-valve-anchor-map.json` 与 `clean-valve-contract-map.json`，并完成子代理只读审查。
- [x] 阶段 3：完成干净球阀、外绕灰管、主机正面打气球布局和左侧黑口连接。
- [x] 阶段 3 审查：第一次子代理审查为 `CONCERNS`，原因是审查脚本仍有占位几何检查；已修复为读取真实 tube 控制点、mesh 顶点和 `Pump_Bulb_Compressed` morph 后点云的审查。
- [x] 阶段 3 复审：第二次子代理复审为 `PASS`，候选模型可以进入主项目接入前的用户验收。
- [x] 阶段 4：整理候选产物、预览地址和验收方式，等待用户决定是否进入主项目 Ultra 接入。

### 本轮候选产物

```text
候选 GLB：
D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.ultra-layout-clean-valve-candidate.glb

临时预览 GLB：
D:\tmp\codex\fd-ncd-c-candidate-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb

生成脚本：
D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py

审查脚本：
D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py

审查结果：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-audit.json

契约映射：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-contract-map.json

锚点映射：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-anchor-map.json
```

### 关键审查结论

```text
required_nodes_missing: []
required_animations_missing: []
required_morph_targets_missing: []
duplicate_node_names: {}
old_valve_visual_nodes_present: []
hidden_or_legacy_nodes_present: []
contract_map_missing_keys: []
hsl_anchor_missing_keys: []

pump_bulb_in_front_of_instrument: true
pump_tube_uses_left_bulb_port: true
pump_tube_endpoint_inside_left_black_port: true
pump_tube_endpoint_not_in_right_port: true
pump_tube_intersects_compressed_bulb: false
grey_tube_crosses_wire_bundle_default_view: false
pump_bulb_compressed_clearance_mm: 18.97
```

### 验收截图

```text
全局视角：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-global-pump-front.png

打气球左口连接：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-front-left-port.png

打气球压缩态：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-front-compressed.png

阀门近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-shorter-insert-valve.png

阀门打开态：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-inlet-open-valve.png
```

### 当前边界

- [x] 没有把候选 GLB 放入 `<project-root>\public\models`。
- [x] 没有修改主项目运行代码来接入 Ultra GLB。
- [x] 临时预览查看器只位于 `D:\tmp\codex\fd-ncd-c-candidate-preview`。
- [ ] 主项目当前仍存在既有 dirty worktree，进入接入阶段前需要确认这些改动的归属和是否一起保留。

## 执行记录：2026-05-30 阀门质感与残留玻璃管修正

- [x] 删除旧的 `stopper_independent_inlet_glass_stub` 节点，避免瓶塞附近残留上一版独立透明短管。
- [x] 将候选球阀主体改为更厚的深色金属材质和更粗壮的一体化阀体、端部接头、上方阀杆座。
- [x] 将红色碟形手柄加厚，并补充中心实体块与圆角体，减少“薄片拼接”的视觉感。
- [x] 更新审计脚本，把旧玻璃短管纳入旧可视节点检查。
- [x] 重新生成候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：旧阀门节点、旧泵管节点、旧玻璃短管均不存在；阀门旋转轴、下方插入瓶塞、打气球左侧接口、打气球压缩避让均保持通过。
- [x] 浏览器预览通过：`http://127.0.0.1:5181/?v=solid-metal-no-glass` 无控制台错误或警告。

### 本轮新增验收截图

```text
阀门近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-solid-metal-no-glass-close.png

全局视角：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-solid-metal-no-glass-global.png
```

## 执行记录：2026-05-30 红色球阀手柄单体化修正

- [x] 确认问题根因：上一版 `InletValue_THandle` 由 7 个独立 primitive 叠加组成，拖动视角时会出现片状换边、红色端头像圆饼的问题。
- [x] 在 `audit_clean_valve_candidate.py` 增加手柄拓扑审计，要求红色手柄是单个闭合组件。
- [x] 先跑红灯验证：旧模型审计失败，数据为 `primitive_count=7`、`connected_components=7`、`single_closed_component=false`。
- [x] 重建 `InletValue_THandle`：保留节点名和 `InletValue_Pivot` 动画轴，把 7 段拼装件替换成 1 个闭合蝶形手柄 mesh。
- [x] 重新导出候选 GLB，并通过审计：`primitive_count=1`、`connected_components=1`、`boundary_edges=0`、`nonmanifold_edges=0`、`single_closed_component=true`。
- [x] 两个相反角度预览检查：红色圆饼端头消失，手柄变为连续厚实体。

### 本轮新增验收截图

```text
手柄角度 A：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-single-piece-handle-angle-a.png

手柄角度 B：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-single-piece-handle-angle-b.png
```

## 执行记录：2026-05-30 红色球阀手柄缩小

- [x] 按用户反馈将单体蝶形手柄等比例缩小到上一版的 86%。
- [x] 保留 `InletValue_THandle` 节点名、`InletValue_Pivot` 旋转轴和单体闭合网格结构。
- [x] 重新导出候选 GLB，并通过审计：`primitive_count=1`、`connected_components=1`、`boundary_edges=0`、`nonmanifold_edges=0`、`single_closed_component=true`。
- [x] 近景预览确认手柄小了一圈，红色端头没有回到圆饼拼装形态。

### 本轮新增验收截图

```text
缩小后的手柄近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-smaller-single-piece-handle-close.png
```

## 执行记录：2026-05-30 打气球外移与打气管适配

- [x] 按用户反馈将打气球沿远离主机方向外移 0.24 个模型单位。
- [x] 同步外移打气球左侧插管端、黑色套筒、右侧喷嘴和尾端夹环，避免打气球本体外移后接口分离。
- [x] 同步调整灰色打气管末端导向点，使灰管仍插入打气球左侧黑色接口，而不是接到右侧喷嘴。
- [x] 重新导出候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_endpoint_not_in_right_port=true`、`pump_tube_intersects_compressed_bulb=false`、`grey_tube_crosses_wire_bundle_default_view=false`。
- [x] 浏览器预览确认：打气球已远离主机面板，灰管接口仍对齐左侧黑色套筒。

### 本轮新增验收截图

```text
打气球外移全局视角：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-bulb-outward-global.png

打气球外移接口近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-bulb-outward-connection.png
```

## 执行记录：2026-05-30 打气球前移加距与向瓶侧微调

- [x] 按用户反馈把打气球继续向前移动，使它与主机前面板的模型深度间距从 `0.6715` 增加到 `1.3415`，约为上一版两倍。
- [x] 将打气球整体向储气瓶方向小幅左移 `0.18` 个模型单位。
- [x] 同步移动打气球左侧插管端、黑色套筒、右侧喷嘴和尾端夹环，避免打气球外移后局部组件脱节。
- [x] 重新调整灰色打气管末端导向点，使管线仍接入左侧黑色套筒，并保持平滑过渡。
- [x] 重新导出候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：`pump_bulb_instrument_front_clearance=1.3415`、`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_endpoint_not_in_right_port=true`、`pump_tube_intersects_compressed_bulb=false`、`pump_bulb_compressed_clearance_mm=24.32`。
- [x] 浏览器预览确认：打气球相对主机更靠前，且向储气瓶侧偏移；灰管接口仍对齐左侧黑色套筒。

### 本轮新增验收截图

```text
打气球前移与左移全局视角：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-bulb-forward-left-global.png

打气球前移与左移接口近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-bulb-forward-left-connection.png
```

## 执行记录：2026-05-30 按俯视图重走灰色打气管

- [x] 按用户俯视图红线，将灰色打气管从“中间斜穿”改为外侧绕行：阀门出口先顺着接头向外，再下绕到模型前缘，沿底部前方横向走线，最后接入打气球左侧黑色套筒。
- [x] 保持主机、储气瓶、阀门和打气球本体位置不变，只调整灰色打气管控制点。
- [x] 修正阀门出口第一段方向，避免管线在阀门口形成硬折；`valve_tube_to_side_connector_axis_error_deg=3.9452`。
- [x] 保持打气球接口端水平对齐；`pump_tube_to_pump_sleeve_axis_error_deg=0.0`。
- [x] 重新导出候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_endpoint_not_in_right_port=true`、`pump_tube_intersects_compressed_bulb=false`、`grey_tube_crosses_wire_bundle_default_view=false`、`pump_bulb_compressed_clearance_mm=27.43`。
- [x] 浏览器俯视图预览确认：灰色打气管沿前缘绕行，整体接近用户标注路线。

### 本轮新增验收截图

```text
按俯视图重走灰色打气管：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-tube-top-route-overhead.png

打气球接口近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-tube-top-route-connection.png
```

## 执行记录：2026-05-30 打气球左移与整根打气管线重排

- [x] 按用户红箭头将打气球、左侧黑色套筒、右侧喷嘴和打气球命中盒整体向画面左侧移动 `0.30` 个模型单位。
- [x] 同步移动 `HSL_PumpBulb_Tube_InsertEnd`，避免打气球左移后灰色打气管末端脱离左侧接口。
- [x] 不再只拖拽末端，重新布置整根灰色打气管：保留阀门出口顺接段、外侧前缘大弧线段、打气球接口水平插入段。
- [x] 重新导出候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：`pump_tube_to_pump_sleeve_axis_error_deg=0.0`、`valve_tube_to_side_connector_axis_error_deg=3.9452`、`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_intersects_compressed_bulb=false`、`pump_bulb_compressed_clearance_mm=27.37`。
- [x] 浏览器俯视图与近景确认：打气球左移后，灰管仍从外侧前缘绕行并自然接入左侧黑色套筒。

### 本轮新增验收截图

```text
打气球左移与整根管线重排俯视图：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-left-route-rebuild-overhead.png

打气球左移与整根管线重排接口近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-left-route-rebuild-connection.png
```

## 执行记录：2026-05-30 打气球再左移 1 与低折角管线重排

- [x] 按用户反馈，将打气球、左侧黑色套筒、右侧喷嘴和打气球命中盒在上一版基础上继续向左移动 `1.00` 个模型单位；打气球中心从 `x=2.18` 调整到 `x=1.18`。
- [x] 同步移动 `HSL_PumpBulb_Tube_InsertEnd`，将灰色打气管目标接口从 `x=1.755` 调整到 `x=0.755`。
- [x] 重新布置整根灰色打气管，保留外侧前缘绕行，但把打气球接口前的末端急弯拆成多段小弧线。
- [x] 量化检查：灰色打气管最大控制点转角从上一版 `63.43°` 降到 `44.28°`，接口前末端转角降到 `30.23°`。
- [x] 重新导出候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_endpoint_not_in_right_port=true`、`pump_tube_intersects_compressed_bulb=false`、`pump_bulb_compressed_clearance_mm=23.4`。
- [x] 浏览器俯视图与近景确认：打气球左移幅度更明显，灰色管线仍从外侧绕行并平滑接入左侧黑色套筒。

### 本轮新增验收截图

```text
打气球再左移 1 与低折角管线俯视图：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-left-1-smooth-route-overhead.png

打气球再左移 1 与低折角管线接口近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-left-1-smooth-route-connection.png
```

## 执行记录：2026-05-30 灰色打气管线内收

- [x] 按用户反馈将灰色打气管外侧绕行段向模型内部收回，保持打气球和阀门本体位置不变。
- [x] 将灰色打气管最外侧控制点从 `z=2.24` 收到 `z=2.02`，避免管线绕到过低、过外的位置。
- [x] 保留外侧绕行逻辑，但把前缘横向段整体上收，使其更接近用户红线标注的路径。
- [x] 重新导出候选 GLB 和临时预览 GLB。
- [x] 结构审计通过：`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_endpoint_not_in_right_port=true`、`pump_tube_intersects_compressed_bulb=false`、`pump_bulb_compressed_clearance_mm=20.66`。
- [x] 控制点量化检查通过：`max_pump_tube_z=2.02`、`max_turn_deg=45.64`。
- [x] 浏览器俯视图与近景确认：灰色打气管已经往内收，接口仍由黑色套筒包住。

### 本轮新增验收截图

```text
灰色打气管线内收俯视图：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-tube-retracted-overhead.png

灰色打气管线内收接口近景：
D:\tmp\codex\fd-ncd-c-candidate-preview\artifacts\clean-valve-pump-tube-retracted-connection.png
```

## 固化记录：2026-05-30 当前候选模型快照

- [x] 将当前候选 GLB 固化到仓库内的候选产物目录，不覆盖运行时 `public\models`。
- [x] 固化结构审计 JSON 和最终两张验收截图，方便后续 GitHub 上传或 Ultra 接入阶段复核。
- [x] 增加候选快照说明文件，记录 SHA256、审计摘要和使用边界。

```text
候选快照目录：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted

候选 GLB：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb
```

## 执行记录：2026-05-30 阀门上移内收与短接头贴合

- [x] 按本轮计划将阀门基准从 `[-1.62, 1.86, 0.22]` 调整为 `[-1.565, 1.94, 0.145]`，同步移动 `HSL_ControlAnchor_PumpValve`、`HSL_BallValve_PumpSidePortCenter`、`InletValue_Pivot` 和 `HSL_Hitbox_PumpValve`。
- [x] 重建 `HSL_BallValve_LowerStem` 和 `HSL_BallValve_StopperSeal`：短接头只从瓶塞上表面向上连接阀体，底部保留 `-0.006` 模型单位遮缝重叠，密封圈投影半径为 `0.265659`，小于瓶塞上表面可见半径 `0.267`。
- [x] 重排灰色打气管前两段控制点，保持阀门侧口第一段同轴；审计值 `pump_tube_to_side_port_axis_error_deg=3.9452`，低于 `8` 度阈值。
- [x] 保持打气球、主机、储气瓶、玻璃旋塞、电线和传感器不移动。
- [x] 更新结构审计脚本，新增阀体高度、短接头贴合、短接头投影、玻璃避让和侧口轴向断言。
- [x] 重新导出候选 GLB，清理未引用资源，并固化到候选包；未覆盖运行时 `public\models`。
- [x] 结构审计通过：`required_nodes_missing=[]`、`required_animations_missing=[]`、`required_morph_targets_missing=[]`、`old_valve_visual_nodes_present=[]`、`hidden_or_legacy_nodes_present=[]`、`contract_map_missing_keys=[]`、`hsl_anchor_missing_keys=[]`。
- [x] 几何审计通过：`valve_body_bottom_above_stopper_top=true`、`lower_stem_bottom_touches_stopper_top=true`、`lower_stem_projection_inside_stopper_top=true`、`valve_body_clear_of_stopcock_glass=true`、`valve_body_clear_of_bottle_neck_glass=true`。

### 本轮新增验收截图

```text
全局侧面：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-up-inward-side.png

阀门近景：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-up-inward-valve-close.png

俯视图：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-up-inward-overhead.png

阀门侧口视角：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-up-inward-side-port.png

打气球接口视角：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-up-inward-pump-connection.png
```

## 执行记录：2026-05-30 黑色阀体单体化修正

- [x] 执行前先固定当前工作区：已提交并推送 checkpoint `f64baf7`，提交信息为 `chore: checkpoint ultra model candidate work`。
- [x] 复核当前分支和远端：`codex/heat-capacity-ultra-model-candidate` 已成功推送到 `origin/codex/heat-capacity-ultra-model-candidate`，没有使用 force push。
- [x] 在候选 GLB 重建脚本中新增 `solid_ball_valve_body_geometry()`，把 `HSL_BallValve_Body` 从 10 段 primitive 拼接改为 1 个连续闭合 mesh。
- [x] 保持阀门基准 `[-1.565, 1.94, 0.145]` 不变；未移动灰色打气管、打气球、主机、储气瓶、玻璃旋塞、电线和传感器。
- [x] 重新导出候选 GLB，清理未引用资源，并更新仓库内候选包；未覆盖运行时 `public\models`。
- [x] 更新结构审计脚本，新增黑色阀体拓扑断言：primitive 数量、闭合连通体、边界边、非流形边和退化三角形。
- [x] 结构审计通过：`required_nodes_missing=[]`、`required_animations_missing=[]`、`required_morph_targets_missing=[]`、`old_valve_visual_nodes_present=[]`、`hidden_or_legacy_nodes_present=[]`、`contract_map_missing_keys=[]`、`hsl_anchor_missing_keys=[]`。
- [x] 阀体拓扑审计通过：`valve_body_primitive_count=1`、`valve_body_single_closed_component=true`、`valve_body_boundary_edges=0`、`valve_body_nonmanifold_edges=0`、`valve_body_degenerate_triangles=0`。
- [x] 上一轮几何断言保持通过：`valve_body_bottom_above_stopper_top=true`、`lower_stem_bottom_touches_stopper_top=true`、`lower_stem_projection_inside_stopper_top=true`、`valve_body_clear_of_stopcock_glass=true`、`valve_body_clear_of_bottle_neck_glass=true`、`pump_tube_endpoint_inside_left_black_port=true`、`pump_tube_endpoint_not_in_right_port=true`、`pump_tube_intersects_compressed_bulb=false`。
- [x] 浏览器预览截图复核：左侧近景、右侧近景、瓶塞侧面近景和全局视角均已固化到候选包。

### 本轮新增验收截图

```text
黑色阀体左侧近景：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-solid-body-left-close.png

黑色阀体右侧近景：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-solid-body-right-close.png

阀门与瓶塞侧面近景：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-solid-body-stopper-side.png

单体化阀体后的全局视角：
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-solid-body-global.png
```
