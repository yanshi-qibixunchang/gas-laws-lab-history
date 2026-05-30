# Ultra 阀门多组件实体化重建计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留当前回退版复杂阀门外形的基础上，把容易出现片状显示的阀体拆成多个独立闭合实体组件，避免旋转视角下出现薄片、透视或拼接感。

**Architecture:** 不再采用“整个黑色阀体合并成一个单 mesh”的方案，也不继续保留当前 `HSL_BallValve_Body` 内部 10 个拼接 primitive 的做法。改为一个 `HSL_BallValve_Body` 父节点承载多个闭合实体子组件，每个子组件都是有厚度、封口、法线正确的 mesh，通过金属套环、端盖和遮缝重叠形成一个完整球阀视觉整体。

**Tech Stack:** GLB/glTF、Three.js 预览、Python GLB 重建脚本、候选模型审计脚本、Playwright 浏览器截图。

---

## 当前证据

当前已回退到上一版候选 GLB：

```text
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb
SHA256=49734F9ECD66DDE3236336C40931B44674DF2182D63CA2EC4C1071F31F29000F
size=4005380 bytes
```

已检查到的阀门结构：

```text
HSL_BallValve_Body mesh=102 primitives=10
HSL_BallValve_PumpSideSleeve mesh=103 primitives=3
HSL_BallValve_LowerStem mesh=104 primitives=2
HSL_BallValve_StopperSeal mesh=105 primitives=2
InletValue_HandleStem mesh=106 primitives=2
InletValue_THandle mesh=107 primitives=1
```

当前 `HSL_BallValve_Body` 的拓扑结果：

```text
primitive_count=10
connected_components=10
boundary_edges=0
nonmanifold_edges=0
degenerate_triangles=128
single_closed_component=false
```

判断：当前问题不主要是“整体没有合成一个 mesh”，而是多组件内部存在退化三角形、薄片式端面或过薄叠片。正确方向是保留多组件，但要求每个组件自己成为闭合实体。

## 计划审查结论

本计划当前没有必须先交给用户二选一的阻塞决策。以下内容已经在计划里定为默认执行策略，除非执行中触发停止条件：

```text
默认保留多组件，不回到单个大实体。
默认保持当前回退版的真实感和复杂度优先，不为拓扑指标牺牲外观。
默认允许 HSL_BallValve_Body 从 mesh 节点变成 Object3D 父节点，但必须保留同名契约节点。
默认后续高亮、呼吸和材质效果应对 HSL_BallValve_Body 做 traverse，作用到其闭合实体子组件。
默认不使用 DoubleSide 修复黑色金属阀体；DoubleSide 只允许继续用于透明软管或透明 hitbox。
默认不移动已经验收过的阀门、灰管、打气球、主机和储气瓶布局。
```

仍需要执行中重点复核的隐患：

```text
HSL_BallValve_Body 由 mesh 改成父节点后，未来接入代码如果错误地只处理 obj.isMesh 会漏掉高亮或呼吸。
多个闭合实体之间如果共面贴合，仍可能出现 z-fighting 或闪烁。
端盖、套环和主体如果只是相切，近景会露出裂缝；如果重叠过多，又可能看起来穿模。
金属材质如果太黑或 roughness/metallic 不合适，闭合实体也可能在强反光下看起来像一片。
组件数量增加后，GLB 资源和 draw call 增加；本轮只影响 Ultra 候选模型，可以接受，但必须记录资源数量。
```

对应修复策略已经写入后续任务：增加契约节点类型审计、组件闭合审计、共面/裂缝视觉检查、材质单面渲染检查和资源表复核。

## 二次复核补充结论

本次执行前复核又确认了以下事实：

```text
当前主项目 src 代码里没有检索到 HSL_BallValve_Body、HSL_BallValve 或 InletValue_ 的运行时依赖。
当前主项目 src 代码里没有发现针对 HSL_BallValve_Body 的 obj.isMesh 专用判断。
当前工作区只有本计划文件未提交；执行模型改造前应先把本计划提交并推送，作为新的 checkpoint。
D:\tmp\codex\fd-ncd-c-candidate-preview\scripts 下的重建脚本和审计脚本位于仓库外，git push 不会保存这些脚本本身。
```

因此，本轮默认执行策略补充为：

```text
先提交并推送当前计划文件，再开始模型改造。
模型生产脚本仍可在 D:\tmp 中修改和运行，但最终推送到 GitHub 的只包含候选 GLB、审计 JSON、截图和候选说明。
如果执行中需要把生产脚本也纳入仓库以便长期复现，立即停止并让用户确认；默认不把外部预览脚本引入主项目，避免污染仓库。
如果执行中发现主项目实际需要修改高亮/呼吸代码才能适配父节点结构，立即停止；本计划只做候选模型，不接入 runtime。
```

本次复核没有发现新的必须由用户选择的阻塞问题；需要用户确认的情况已经全部写入停止条件。

## 设计原则

- `HSL_BallValve_Body` 可以是一个父节点，不强制它自己是单 mesh。
- `HSL_BallValve_Body` 必须保留同名契约节点；如果它变成父节点，未来项目侧高亮和呼吸必须遍历其子组件，不能只判断父节点本身是否是 mesh。
- 父节点下的每个可见子组件必须是闭合实体，不能是单面片。
- 每个子组件都要满足：`boundary_edges=0`、`nonmanifold_edges=0`、`degenerate_triangles=0`。
- 不用 `DoubleSide` 掩盖问题；闭合实体应在默认单面渲染下仍然从所有角度可见。
- 黑色金属阀体材质必须保持 `doubleSided` 未开启；如果开启才看起来正常，说明几何仍有问题。
- 子组件之间允许极小遮缝重叠，但不能使用完全共面的重叠面。
- 保持当前已验收布局：阀门位置、下方短接头、灰管、打气球、主机、储气瓶、玻璃旋塞、电线和传感器不移动。
- 保留项目契约节点：`HSL_BallValve_Body`、`HSL_BallValve_PumpSideSleeve`、`HSL_BallValve_LowerStem`、`HSL_BallValve_StopperSeal`、`InletValue_HandleStem`、`InletValue_THandle`、`InletValue_Pivot`。
- 新增子组件使用 `HSL_BallValve_Body_` 前缀，避免污染原始模型命名。

## 文件边界

**只修改候选模型生产与候选包：**

```text
D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py
D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py
<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\
<project-root>\docs\superpowers\plans\2026-05-31-ultra-valve-multi-solid-rebuild.md
<project-root>\docs\superpowers\plans\2026-05-30-heat-capacity-ultra-valve-clean-rebuild.md
```

说明：

```text
D:\tmp 下的脚本是临时生产工具，修改后不会被 git push 保存。
GitHub 上本轮固定的是候选模型产物和候选说明，不默认引入外部预览工程或生产脚本。
如果需要长期可复现脚本，应另开一轮确认是否把脚本整理进 docs/tools 或 scripts；本轮默认不做。
```

**明确不修改：**

```text
<project-root>\public\models
<project-root>\src
<project-root>\package.json
<project-root>\package-lock.json
```

**如果执行时发现需要修改主项目代码才能预览或审计通过，立即停止。**

## 组件拆分方案

把黑色阀体拆成以下闭合实体组件：

```text
HSL_BallValve_Body
  HSL_BallValve_Body_CoreBarrel
  HSL_BallValve_Body_LeftEndCap
  HSL_BallValve_Body_LeftFerruleRing
  HSL_BallValve_Body_RightEndCap
  HSL_BallValve_Body_RightFerruleRing
  HSL_BallValve_Body_CenterBulge
  HSL_BallValve_Body_UpperStemBoss
  HSL_BallValve_Body_LowerStemBoss
  HSL_BallValve_Body_SidePortBoss
  HSL_BallValve_Body_LeftSeamCollar
  HSL_BallValve_Body_RightSeamCollar
  HSL_BallValve_Body_UpperStemCollar
  HSL_BallValve_Body_LowerStemCollar
  HSL_BallValve_Body_SidePortCollar
```

说明：

- `CoreBarrel` 是阀体主金属管状主体，使用封闭圆柱或旋转剖面，不使用薄面。
- `LeftEndCap` / `RightEndCap` 是两侧端盖，做成有厚度的封口实体。
- `FerruleRing` 是接头金属套环，用来遮住管道和阀体之间的接缝。
- `CenterBulge` 做球阀中心鼓包，保持金属沉凝质感。
- `UpperStemBoss` 连接红色手柄立柱。
- `LowerStemBoss` 连接下方短接头。
- `SidePortBoss` 连接灰色打气管侧口。
- `LeftSeamCollar` / `RightSeamCollar` / `UpperStemCollar` / `LowerStemCollar` / `SidePortCollar` 用小套环遮盖必要的组件重叠，不让拼接边直接暴露；这些套环必须是独立闭合实体，不允许合成一个多断开的单 mesh。

## 任务清单

### Task 1: 建立执行前 checkpoint 和契约依赖复核

**Files:**
- Read: `<project-root>`
- Modify: `<project-root>\docs\superpowers\plans\2026-05-31-ultra-valve-multi-solid-rebuild.md`

- [ ] **Step 1: 检查工作区**

Run:

```powershell
cd <project-root>
git status --short --branch
```

Expected:

```text
## codex/heat-capacity-ultra-model-candidate...origin/codex/heat-capacity-ultra-model-candidate
?? docs/superpowers/plans/2026-05-31-ultra-valve-multi-solid-rebuild.md
```

- [ ] **Step 2: 如果只有当前计划文件未提交，先提交并推送计划 checkpoint**

Run:

```powershell
git add docs/superpowers/plans/2026-05-31-ultra-valve-multi-solid-rebuild.md
git commit -m "docs: add ultra valve multi-solid rebuild plan"
git push origin codex/heat-capacity-ultra-model-candidate
git status --short --branch
```

Expected:

```text
git push 成功。
git status --short --branch 只显示分支行，不再显示未提交文件。
```

如果输出里除本计划文件外还有其他 `M`、`A`、`D`、`??`，不要继续建模，先列出文件让用户确认是否一起 checkpoint。

- [ ] **Step 3: 确认当前基础版本是回退版**

Run:

```powershell
Get-FileHash -Algorithm SHA256 <project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb
```

Expected:

```text
49734F9ECD66DDE3236336C40931B44674DF2182D63CA2EC4C1071F31F29000F
```

如果 SHA 不一致，停止并说明当前不是用户要求回退到的版本。

- [ ] **Step 4: 检索主项目是否依赖阀体必须是 mesh**

Run:

```powershell
Get-ChildItem -LiteralPath '<project-root>\src' -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx | Select-String -Pattern 'HSL_BallValve_Body|HSL_BallValve|InletValue_|HSL_ControlAnchor_PumpValve'
```

Expected:

```text
没有输出，或只出现和候选说明无关的非运行时代码。
```

如果发现主项目 runtime 代码依赖 `HSL_BallValve_Body.isMesh === true`、直接读取 `HSL_BallValve_Body.geometry`，或必须修改 `src` 才能适配父节点结构，立即停止。本轮不修改主项目 runtime。

### Task 2: 重写黑色阀体组件生成器

**Files:**
- Modify: `D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`

- [ ] **Step 1: 删除单体化 `solid_ball_valve_body_geometry()` 路线**

保留回退版阀体外形参考，但不要再用一个大 mesh 表达全部阀体。

- [ ] **Step 2: 新增闭合组件生成辅助函数**

新增以下函数：

```python
def capped_cylinder_between(name, start, end, radius, radial_segments, material):
    """生成两端封口的圆柱实体，法线向外，不产生退化三角形。"""


def lathed_solid_profile(name, axis, center, profile_points, radial_segments, material):
    """用旋转剖面生成闭合实体，用于阀体鼓包、套环和端盖。"""


def lathed_collar_solid(name, axis, center, profile_points, radial_segments, material):
    """生成独立闭合套环实体；每个套环单独命名，不把多个套环塞进一个断开的 mesh。"""
```

要求：

```text
每个函数输出独立 mesh。
每个 mesh 的 index 三角形不能包含重复顶点。
每个 mesh 端面必须封口。
每个 mesh 法线必须朝外。
```

- [ ] **Step 3: 生成 `HSL_BallValve_Body` 父节点和子组件**

父节点保留名称：

```text
HSL_BallValve_Body
```

新增子组件名称：

```text
HSL_BallValve_Body_CoreBarrel
HSL_BallValve_Body_LeftEndCap
HSL_BallValve_Body_LeftFerruleRing
HSL_BallValve_Body_RightEndCap
HSL_BallValve_Body_RightFerruleRing
HSL_BallValve_Body_CenterBulge
HSL_BallValve_Body_UpperStemBoss
HSL_BallValve_Body_LowerStemBoss
HSL_BallValve_Body_SidePortBoss
HSL_BallValve_Body_LeftSeamCollar
HSL_BallValve_Body_RightSeamCollar
HSL_BallValve_Body_UpperStemCollar
HSL_BallValve_Body_LowerStemCollar
HSL_BallValve_Body_SidePortCollar
```

Expected:

```text
HSL_BallValve_Body 作为契约父节点存在。
每个子组件都是独立闭合实体。
视觉上仍是一个完整球阀。
```

- [ ] **Step 4: 加入非共面遮缝规则**

组件之间的遮缝重叠必须满足：

```text
端盖插入主体 0.003-0.008 模型单位。
套环覆盖接缝 0.006-0.012 模型单位。
禁止两个同半径、同平面的圆环面完全重合。
禁止为了遮缝创建零厚度片。
```

Expected:

```text
近景看不到裂缝。
旋转视角不会出现闪烁。
拓扑审计没有退化三角形。
```

### Task 3: 保持已验收布局和接口不变

**Files:**
- Modify: `D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`

- [ ] **Step 1: 锁定位置参数**

不得修改以下已验收参数：

```text
VALVE_GROUP_TRANSLATION = [-1.565, 1.94, 0.145]
HSL_BallValve_PumpSidePortCenter = [-1.565, 1.94, 0.515]
HSL_PumpBulb_Tube_InsertEnd = [0.755, 0.245, 1.7]
Pump_Bulb = [1.18, 0.23, 1.7]
InletValue_Pivot = [-1.565, 2.015, 0.145]
```

- [ ] **Step 2: 只允许局部遮缝**

允许套环和端盖有极小重叠，用于遮住接缝。

不得出现：

```text
灰管口脱离阀门侧口
阀体压入瓶塞平台
下方短接头从瓶塞侧边穿出
蓝线、灰管、电线互相明显穿插
打气球接口断开
```

### Task 4: 增加多组件实体审计

**Files:**
- Modify: `D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py`

- [ ] **Step 1: 新增组件级拓扑审计**

新增审计字段：

```text
valve_body_component_names
valve_body_component_count
valve_body_contract_node_kind
valve_body_contract_node_has_mesh
valve_body_contract_child_mesh_count
valve_body_component_required_missing
valve_body_components_all_closed
valve_body_components_have_no_degenerate_triangles
valve_body_components_have_no_boundary_edges
valve_body_components_have_no_nonmanifold_edges
valve_body_components_materials_single_sided
valve_body_components_no_coplanar_overlap_warning
valve_body_parent_contract_node_present
```

- [ ] **Step 2: 调整验收逻辑**

不再要求：

```text
valve_body_single_closed_component=true
```

改为要求：

```text
valve_body_parent_contract_node_present=true
valve_body_contract_node_kind="parent_without_mesh"
valve_body_contract_node_has_mesh=false
valve_body_contract_child_mesh_count >= 10
valve_body_component_required_missing=[]
valve_body_components_all_closed=true
valve_body_components_have_no_degenerate_triangles=true
valve_body_components_have_no_boundary_edges=true
valve_body_components_have_no_nonmanifold_edges=true
valve_body_components_materials_single_sided=true
```

说明：`valve_body_contract_node_kind="parent_without_mesh"` 是本项目审计自定义标签，表示 `HSL_BallValve_Body` 可以是父节点，不再要求它本身带 mesh；但后续集成必须遍历其子组件做高亮和呼吸。不要把这个字段误解为 glTF 原生字段。

- [ ] **Step 3: 保留旧几何断言**

这些断言仍必须通过：

```text
valve_body_bottom_above_stopper_top=true
lower_stem_bottom_touches_stopper_top=true
lower_stem_projection_inside_stopper_top=true
valve_body_clear_of_stopcock_glass=true
valve_body_clear_of_bottle_neck_glass=true
pump_tube_to_side_port_axis_error_deg <= 8
pump_tube_endpoint_inside_left_black_port=true
pump_tube_endpoint_not_in_right_port=true
pump_tube_intersects_compressed_bulb=false
grey_tube_crosses_wire_bundle_default_view=false
valve_handle_single_closed_component=true
valve_handle_rotates_without_moving_body=true
```

- [ ] **Step 4: 增加材质和法线审计**

对所有 `HSL_BallValve_Body_` 子组件检查：

```text
material.doubleSided != true
normal_count == position_count
normal_length_min > 0.5
normal_length_max < 1.5
triangle_area_min > 1e-8
```

Expected:

```text
黑色阀体不依赖双面材质。
没有零面积或接近零面积三角形。
```

### Task 5: 导出候选 GLB 并清理资源

**Files:**
- Modify: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb`
- Modify: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-audit.accepted.json`

- [ ] **Step 1: 重新导出临时候选 GLB**

Run:

```powershell
python D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py
```

Expected:

```text
生成新的候选 GLB
生成临时预览 GLB
```

- [ ] **Step 2: 清理未引用资源**

清理后必须满足：

```text
unused_meshes_count=0
unused_materials_count=0
unused_accessors_count=0
unused_bufferViews_count=0
```

- [ ] **Step 3: 记录资源增长**

Run:

```powershell
(Get-Item -LiteralPath '<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb').Length
```

Expected:

```text
文件大小可以增长，但如果超过回退版 4005380 bytes 的 1.25 倍，停止并说明原因。
```

### Task 6: 浏览器多角度验收

**Files:**
- Create: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\multi-solid-valve-left-close.png`
- Create: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\multi-solid-valve-right-close.png`
- Create: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\multi-solid-valve-overhead.png`
- Create: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\multi-solid-valve-global.png`

- [ ] **Step 1: 启动或刷新临时预览**

Run:

```powershell
cd D:\tmp\codex\fd-ncd-c-candidate-preview\fd-ncd-c-threejs
npm.cmd run dev -- --host 127.0.0.1 --port 5181 --strictPort
```

Preview:

```text
http://127.0.0.1:5181/?v=multi-solid-valve
```

- [ ] **Step 2: 检查 4 个角度**

必须检查：

```text
黑色阀体左侧近景：确认没有片状外壳。
黑色阀体右侧近景：确认没有视角切换后消失的薄片。
俯视图：确认阀体、灰管、瓶塞、蓝线不穿模。
全局图：确认打气球、主机、储气瓶整体布局未被破坏。
```

- [ ] **Step 3: 检查旋转连续性**

在浏览器中围绕阀门缓慢旋转至少一圈，检查：

```text
没有某个黑色组件突然消失。
没有某个黑色组件从实体变成片状。
没有接缝闪烁。
没有红色手柄遮住阀体导致误判。
```

如果只在某一个极端角度出现疑似片状，需要补充该角度截图并定位具体子组件名称。

### Task 7: 更新候选包说明并提交

**Files:**
- Modify: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\README.md`
- Modify: `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\model-cleanup-review.md`
- Modify: `<project-root>\docs\superpowers\plans\2026-05-30-heat-capacity-ultra-valve-clean-rebuild.md`

- [ ] **Step 1: 记录新 SHA 和审计结果**

Run:

```powershell
Get-FileHash -Algorithm SHA256 <project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb
```

Expected:

```text
README.md 和 model-cleanup-review.md 记录同一个 SHA256。
```

- [ ] **Step 2: 提交**

Run:

```powershell
git add -A
git commit -m "fix: rebuild ultra valve as multi solid components"
git push origin codex/heat-capacity-ultra-model-candidate
```

Expected:

```text
当前分支推送成功。
git status --short --branch 显示工作区干净。
```

## 停止条件

出现以下任一情况必须停止并回报，不继续硬改：

- 多组件实体化后质感明显不如当前回退版。
- 任一组件仍出现薄片感，但审计暂时无法定位是哪一个组件。
- 为消除片状问题必须移动阀门、灰管或打气球的已验收位置。
- 需要改 `public\models` 或主项目运行代码。
- 浏览器预览出现 GLB 加载错误、控制台 error，或相机截图无法确认阀体质感。
- 发现后续集成必须依赖 `HSL_BallValve_Body.isMesh === true`，而不是遍历 `HSL_BallValve_Body` 子组件。
- 为了让金属阀体可见而需要给黑色阀体材质开启 `doubleSided=true`。
- 新 GLB 大小超过回退版的 1.25 倍，且无法解释为必要实体细节。
- 执行中发现必须把 `D:\tmp` 外部脚本纳入主项目才能保证候选产物可用，且用户尚未确认是否允许引入生产脚本。
- 审计脚本只能通过开启黑色金属组件 `doubleSided=true` 才能让阀体看起来正常。

## 验收标准

最终验收必须同时满足：

```text
HSL_BallValve_Body contract parent exists
valve_body_contract_node_kind=parent_without_mesh
valve_body_contract_node_has_mesh=false
valve_body_contract_child_mesh_count >= 10
valve_body_component_required_missing=[]
valve_body_components_all_closed=true
valve_body_components_have_no_degenerate_triangles=true
valve_body_components_have_no_boundary_edges=true
valve_body_components_have_no_nonmanifold_edges=true
valve_body_components_materials_single_sided=true
valve_body_bottom_above_stopper_top=true
lower_stem_bottom_touches_stopper_top=true
lower_stem_projection_inside_stopper_top=true
pump_tube_endpoint_inside_left_black_port=true
pump_tube_endpoint_not_in_right_port=true
pump_tube_intersects_compressed_bulb=false
grey_tube_crosses_wire_bundle_default_view=false
```

人工视觉验收必须满足：

```text
黑色阀体从左右、侧面、俯视角都像完整实体。
红色手柄仍保持当前较真实的蝶形阀门手柄。
灰管仍从阀门侧边自然接出。
下方短接头仍贴合瓶塞上表面。
整体复杂度不低于当前回退版。
```
