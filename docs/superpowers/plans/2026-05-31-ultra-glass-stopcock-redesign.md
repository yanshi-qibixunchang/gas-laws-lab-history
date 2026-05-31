# Ultra 玻璃旋塞位置与结构重做计划

> **代理执行约定：** 执行本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务推进。所有步骤使用复选框（`- [ ]`）记录进度。

**目标：** 在候选 GLB 中把玻璃旋塞移动到黑色打气阀门的对角位置，并仿照软件内玻璃旋塞骨架重做为更真实、可交互、可审计的完整玻璃旋塞总成。

**架构：** 本计划只处理候选模型包和候选重建/审计脚本，不接入主项目运行模型，不覆盖主项目 `public\models`。玻璃旋塞作为一个完整总成迁移：上部旋塞阀体、旋转塞芯、玻璃把手、上/侧接口、下方穿过瓶塞的通气管、密封圈和孔位必须一起移动。保留现有 GLB 交互契约和原有节点/动画路径，必要时只新增 `HSL_` 前缀锚点。

**技术栈：** Python GLB 重建脚本、glTF/GLB 节点与 mesh 审计、Three.js/浏览器候选预览、PowerShell 验证命令、可选 Blender MCP 视觉检查。

---

## 0. 范围和硬性边界

### 本轮只允许修改

- `D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`
  - 候选 GLB 重建脚本。
  - 用于移动和重做玻璃旋塞几何。
- `D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py`
  - 候选 GLB 审计脚本。
  - 用于新增玻璃旋塞位置、穿模、契约和拓扑断言。
- `<project-root>\docs\superpowers\model-candidates\2026-05-31-ultra-glass-stopcock-redesign\`
  - 候选包输出目录。
  - 允许新增本轮 GLB、审计 JSON、截图、README 更新和复核记录。
- 本计划文件：
  - `<project-root>\docs\superpowers\plans\2026-05-31-ultra-glass-stopcock-redesign.md`

### 本轮禁止修改

- 主项目 `<project-root>\public\models`
  - 不把候选 GLB 覆盖成运行时模型。
- `<project-root>\src`
  - 不做 Ultra 运行时接入。
  - 不改 React/Three 交互逻辑。
- 现有已验收布局：
  - 不移动黑色打气阀门。
  - 不移动灰色打气管已验收的整体路线，除非玻璃旋塞移动后发现新穿模；如需调整必须单独停下说明。
  - 不移动打气球、主机、储气瓶、传感器、蓝线、电线。
- 不删除任何用户未确认的源模型、原始审计模型、外部仓库内容或运行时资源。
- 外部隔离预览目录里的 `public\models` 只用于本轮候选预览，不等同于主项目运行模型目录；最终候选 GLB、审计 JSON 和截图必须写入本轮新的 repo 候选目录。

### 当前基线

- 工作分支：
  - `codex/heat-capacity-ultra-model-candidate`
- 当前 accepted 候选 GLB：
  - `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb`
- 当前 accepted 审计：
  - `<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\clean-valve-audit.accepted.json`
- 当前 accepted 目录只作为只读基线引用，不作为本轮输出目录。
- 当前候选中已知玻璃旋塞相关节点：
  - `Stopcock_VerticalGlassTube`
  - `Stopcock_GlassBulgedBody`
  - `Stopcock_HandleStem`
  - `Stopcock_RotatingPlugCore`
  - `Stopcock_RotatingRoundKnob`
  - `Stopcock_THandle`
  - `Stopcock_Pivot`
  - `Stopcock_UpperGlassLip`
  - `Stopcock_LowerGlassLip`
  - `stopcock_stopper_glass_seal`

---

## 1. 软件内玻璃旋塞骨架理解

软件内的玻璃旋塞对应 Heat Capacity 场景里的 `Stopcock`，不是前面重做的黑色打气球阀门。它在实验语义上负责“连通/关闭储气瓶与外界或后续通道”，在软件内参与演示模式、引导模式和自由模式。

参考文件：

- `<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`
- `<project-root>\src\features\workbench\workbenchState.ts`
- `<project-root>\src\domain\heatCapacity\heatCapacityAutoDemo.ts`

软件内 `GlassStopcock` 的结构可以拆成两类。

### 固定玻璃结构

- `StopcockBody`
  - 水平透明玻璃旋塞腔体。
  - 是用户识别玻璃旋塞主体的主要部分。
- `StopcockSidePort`
  - 侧向玻璃接口。
  - 表达旋塞有横向连通路径。
- `StopcockTopVentOutlet`
  - 上方竖直玻璃口。
  - 表达上方通气/连通路径。
- `StopcockDownTube`
  - 下方通入瓶塞和瓶内的玻璃通气管。
  - 这是玻璃旋塞总成的一部分，不是瓶体或瓶塞的独立装饰。

### 旋转交互结构

- `StopcockRotatingCore`
  - 旋转核心总组。
  - 负责随开/关状态旋转。
- `StopcockCorePlug`
  - 旋塞内部塞芯。
- `StopcockRotatingFlowChannel`
  - 可读的内部流道。
  - 用于让用户理解开/关方向。
- `StopcockRodHandle`
  - 玻璃杆状把手。
- `StopcockRodHandleConnector`
  - 把手和塞芯之间的短连接件。
- `StopcockRodHandleTipTop` / `StopcockRodHandleTipBottom`
  - 把手两端圆头。

### 状态和交互契约

- `0°` 表示玻璃旋塞打开。
- `90°` 表示玻璃旋塞关闭。
- 用户点击玻璃旋塞应切换开关状态。
- 高亮、呼吸、聚焦气泡和引导锚点应落在旋塞可操作区域。
- 后续 GLB 接入时，GLB 只读取软件现有状态，不新增独立的压力、温度、阀门或实验逻辑。

---

## 2. 新设计结论

### 核心改动

把玻璃旋塞从当前中心/拥挤位置移动到黑色打气阀门相对于瓶塞中心的对角侧。

### 为什么这样做

当前瓶塞中心附近同时有：

- 瓶口玻璃结构。
- 黑色打气阀门。
- 蓝色传感线。
- 灰色打气管。
- 玻璃旋塞旧结构。

如果继续把玻璃旋塞放在中心位置，玻璃件无法充分展开，容易变成简化管件，也容易与黑色打气阀、蓝管和瓶口玻璃发生穿模。把玻璃旋塞移到黑色打气阀门对角侧后，瓶塞上表面形成两个功能区：

- 黑色打气阀门区：负责打气球和灰色打气管。
- 玻璃旋塞区：负责软件内 `Stopcock` 开关。

这样更符合用户操作认知，也给玻璃旋塞完整建模留出空间。

### 必须保留的物理关系

玻璃旋塞是完整总成，不是只摆一个上部玻璃阀。

移动时必须一起移动：

- 上方玻璃旋塞腔体。
- 内部旋转塞芯。
- 杆状玻璃把手。
- 上方玻璃口。
- 侧向玻璃口。
- 下方穿过瓶塞的玻璃通气管。
- 瓶塞上表面的密封圈/磨口座。
- 瓶塞孔位视觉。

旧中心位不能残留透明下管、密封圈或孔位。

---

## 3. 三个主要步骤

### 任务 1：调整玻璃旋塞整体位置

**目标：** 将完整玻璃旋塞总成移动到黑色打气阀门的对角区域，并保持下方穿塞气管随总成移动。

**涉及文件：**

- 修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`
- 修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py`
- 输出：`<project-root>\docs\superpowers\model-candidates\2026-05-31-ultra-glass-stopcock-redesign\`

#### 步骤 1.1：记录当前基线

- [ ] 运行 Git 状态检查。

```powershell
git status --short --branch
```

预期：

- 当前分支是 `codex/heat-capacity-ultra-model-candidate`。
- 若工作区已有未提交改动，先列出并判断是否与本任务相关。
- 不得在未确认来源的情况下覆盖用户改动。

- [ ] 记录当前 accepted GLB 的 SHA256。

```powershell
Get-FileHash "<project-root>\docs\superpowers\model-candidates\2026-05-30-ultra-clean-valve-accepted\fd-ncd-c-experiment.ultra-layout-clean-valve.accepted.glb" -Algorithm SHA256
```

预期：

- 得到一个 SHA256，用作回退基线。

#### 步骤 1.2：读取当前旋塞和黑色打气阀位置

- [ ] 从 GLB 中读取这些节点的 world transform 或近似包围盒中心：
  - `Stopcock_Pivot`
  - `Stopcock_GlassBulgedBody`
  - `Stopcock_VerticalGlassTube`
  - `Stopcock_LowerGlassLip`
  - `stopcock_stopper_glass_seal`
  - `HSL_BallValve_Body`
  - `HSL_BallValve_LowerStem`
  - `Rubber_Stopper` 或当前审计里对应的瓶塞节点

预期：

- 得到瓶塞中心、黑色打气阀中心、玻璃旋塞当前中心。
- 能判断黑色打气阀相对瓶塞中心在哪个方向。

#### 步骤 1.3：计算对角放置位置

- [ ] 以瓶塞中心为原点，计算黑色打气阀方向向量。
- [ ] 将玻璃旋塞目标点放在相反方向。
- [ ] 目标点必须满足：
  - 位于瓶塞上表面投影内。
  - 与黑色打气阀保持可见间距。
  - 与瓶口玻璃、蓝管、灰管保持安全间距。
  - 下方玻璃气管垂直穿过瓶塞区域，不从侧面穿出。

默认建议：

- 优先让玻璃旋塞整体落在瓶塞上表面的对角象限。
- 如果对角位置过靠边，沿瓶塞中心方向轻微内收。
- 如果仍然拥挤，优先缩小玻璃旋塞尺寸，不退回中心位。

#### 步骤 1.4：整体移动玻璃旋塞总成

- [ ] 在重建脚本中新增一个清晰的玻璃旋塞定位常量，例如：

```python
GLASS_STOPCOCK_GROUP_TRANSLATION = [...]
```

- [ ] 将以下节点统一基于该位置生成或移动：
  - `Stopcock_VerticalGlassTube`
  - `Stopcock_GlassBulgedBody`
  - `Stopcock_UpperGlassLip`
  - `Stopcock_LowerGlassLip`
  - `Stopcock_Pivot`
  - `stopcock_stopper_glass_seal`
  - `Stopcock_Pivot` 下的旋转子节点

- [ ] 确保下方穿塞玻璃气管跟随旋塞移动。
- [ ] 删除或替换旧中心位置的下方透明管、密封环和孔位视觉。

停止条件：

- 如果移动后需要调整黑色打气阀、灰色打气管或打气球位置，停止并向用户说明，不在本任务内顺手修改。

#### 步骤 1.5：任务 1 阶段验收

- [ ] 导出临时候选 GLB。
- [ ] 运行审计。
- [ ] 截图至少 3 个角度：
  - 俯视图：确认玻璃旋塞位于黑色打气阀对角侧。
  - 侧面近景：确认下方玻璃气管跟随移动并穿过瓶塞。
  - 全局视角：确认整体布局仍协调。

任务 1 必须通过后才能进入任务 2。

---

### 任务 2：仿照软件骨架重做玻璃旋塞结构

**目标：** 让候选 GLB 的玻璃旋塞更接近软件内 `GlassStopcock` 骨架，形成固定玻璃外壳 + 旋转核心 + 杆状把手 + 下方穿塞通气管的完整结构。

**涉及文件：**

- 修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`
- 修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py`
- 参考：`<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`

#### 步骤 2.1：建立结构映射

- [ ] 将软件骨架映射到 GLB 节点：

| 软件骨架概念 | 候选 GLB 节点建议 | 是否旋转 |
| --- | --- | --- |
| 固定水平玻璃腔体 | `Stopcock_GlassBulgedBody` | 否 |
| 上方玻璃口 | `Stopcock_UpperGlassLip` + 新闭合上管 | 否 |
| 下方穿瓶塞玻璃气管 | `Stopcock_LowerGlassLip` + 新闭合下管 | 否 |
| 侧向玻璃接口 | 可新增 `HSL_Stopcock_SidePort` 或复用现有侧口节点 | 否 |
| 旋转塞芯 | `Stopcock_RotatingPlugCore` | 是 |
| 可读内部流道 | 可新增 `HSL_Stopcock_FlowChannel` | 是 |
| 玻璃把手连接杆 | `Stopcock_HandleStem` | 是 |
| 玻璃 T 形/杆状把手 | `Stopcock_THandle` | 是 |
| 圆形旋钮或端帽 | `Stopcock_RotatingRoundKnob` | 是 |

规则：

- 原有节点名尽量保留。
- 如果必须新增节点，使用 `HSL_` 前缀。
- 不要重命名会被动画或未来接入依赖的节点。

#### 步骤 2.2：重做固定玻璃外壳

- [ ] 将水平玻璃腔体做成闭合实体。
- [ ] 中部做轻微膨大，保持“玻璃旋塞阀腔”的识别度。
- [ ] 两侧增加玻璃厚口沿或磨口环。
- [ ] 上方竖直玻璃口加厚壁、口沿和轻微透明高光。
- [ ] 下方玻璃气管做成穿过瓶塞的连续管件。
- [ ] 瓶塞上表面增加密封圈/磨口座，遮住管子与瓶塞的接缝。

验收：

- 从任意角度看不是透明薄片。
- 下方气管和上方旋塞是连续通道。
- 旧中心位没有残留的透明管。

#### 步骤 2.3：重做旋转核心和把手

- [ ] 保持 `Stopcock_Pivot` 作为旋转父节点。
- [ ] 将以下内容放在 `Stopcock_Pivot` 下：
  - 旋转塞芯。
  - 内部流道可视件。
  - 把手连接杆。
  - 玻璃杆状把手。
  - 把手两端圆头。
- [ ] 旋转核心视觉上应在玻璃腔体内部，不要外露成穿模螺钉。
- [ ] 把手采用软件骨架风格：透明玻璃杆，细长，端部圆润。

验收：

- 打开/关闭状态时，旋转的是塞芯和把手，不是固定玻璃外壳。
- 把手能被用户一眼识别为可操作部位。
- 把手不会和上方玻璃口、黑色打气阀或蓝线穿模。

#### 步骤 2.4：保留交互契约

- [ ] 保持 `0°` 为开，`90°` 为关。
- [ ] 保持 `Stopcock_Pivot` 动画路径不丢失。
- [ ] 如需新增高亮或点击锚点，只新增：
  - `HSL_Anchor_Stopcock`
  - `HSL_Hitbox_Stopcock`
  - `HSL_Anchor_Stopcock_Handle`
  - `HSL_Anchor_Stopcock_DownTube`
- [ ] 不引入任何独立阀门逻辑。

#### 步骤 2.5：任务 2 阶段验收

- [ ] 导出临时候选 GLB。
- [ ] 检查节点层级：
  - 固定玻璃外壳不在 `Stopcock_Pivot` 下。
  - 旋转塞芯和把手在 `Stopcock_Pivot` 下。
- [ ] 截图至少 4 个角度：
  - 玻璃旋塞近景。
  - 旋塞开状态。
  - 旋塞关状态。
  - 下方穿塞气管近景。

任务 2 必须通过后才能进入任务 3。

---

### 任务 3：增强真实感并完成完整审计

**目标：** 让玻璃旋塞在视觉上更像真实玻璃仪器，同时确保它在候选 GLB 中可控、可点、可高亮、无穿模、无旧残留。

**涉及文件：**

- 修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\rebuild_ultra_clean_valve.py`
- 修改：`D:\tmp\codex\fd-ncd-c-candidate-preview\scripts\audit_clean_valve_candidate.py`
- 新建或更新：`<project-root>\docs\superpowers\model-candidates\2026-05-31-ultra-glass-stopcock-redesign\README.md`
- 新建或更新：本轮最终审计 JSON 和截图，位置为 `<project-root>\docs\superpowers\model-candidates\2026-05-31-ultra-glass-stopcock-redesign\`

#### 步骤 3.1：材质和体积感修正

- [ ] 所有玻璃件使用闭合实体 mesh。
- [ ] 所有口沿、密封座、管壁都有厚度。
- [ ] 透明材质使用浅蓝/灰白玻璃风格。
- [ ] 保留适度高光，但不要比红色手柄或黑色球阀更抢眼。
- [ ] 避免过度透明导致结构不可读。

默认视觉风格：

- 固定玻璃外壳：浅蓝透明、轻微高光。
- 旋转塞芯：稍微更高不透明度，便于识别。
- 内部流道：可以略带蓝绿色或浅色，但必须低调。
- 把手：玻璃透明杆，两端圆头，悬停或后续高亮时有明确可读轮廓。

#### 步骤 3.2：新增审计断言

- [ ] 在审计脚本中新增或更新以下断言：

```text
stopcock_opposite_to_pump_valve=true
stopcock_group_inside_stopper_top=true
stopcock_down_tube_follows_stopcock=true
stopcock_down_tube_penetrates_stopper=true
stopcock_old_center_tube_absent=true
stopcock_pivot_exists=true
stopcock_animation_paths_preserved=true
stopcock_fixed_body_not_under_pivot=true
stopcock_rotating_core_under_pivot=true
stopcock_handle_rotates_with_pivot=true
stopcock_body_closed_geometry=true
stopcock_down_tube_closed_geometry=true
stopcock_no_collision_with_ball_valve=true
stopcock_no_collision_with_blue_tube=true
stopcock_no_collision_with_bottle_neck=true
stopcock_no_collision_with_grey_pump_tube=true
```

- [ ] 保留既有黑色打气阀和灰管相关断言：

```text
pump_tube_endpoint_inside_left_black_port=true
pump_tube_endpoint_not_in_right_port=true
pump_tube_intersects_compressed_bulb=false
grey_tube_crosses_wire_bundle_default_view=false
valve_handle_single_closed_component=true
valve_handle_rotates_without_moving_body=true
```

#### 步骤 3.3：结构清理

- [ ] 清理旧中心位的玻璃旋塞残留。
- [ ] 清理未引用 mesh/material/accessor。
- [ ] 不删除原始输入 GLB。
- [ ] 不删除、不覆盖 accepted 旧版 GLB；本轮必须输出到新的玻璃旋塞候选目录。

默认输出命名：

```text
fd-ncd-c-experiment.ultra-layout-glass-stopcock-redesign.candidate.glb
glass-stopcock-redesign-audit.candidate.json
glass-stopcock-redesign-overhead.png
glass-stopcock-redesign-side.png
glass-stopcock-redesign-close-open.png
glass-stopcock-redesign-close-closed.png
glass-stopcock-redesign-global.png
```

#### 步骤 3.4：浏览器预览验收

- [ ] 启动或复用隔离候选预览。
- [ ] 外部 GLB 预览可继续使用临时端口，例如：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5181 --strictPort
```

注意：

- 这是候选模型隔离预览，不是主项目预览。
- 如果外部脚本先输出到 `D:\tmp\codex\fd-ncd-c-candidate-preview\public\models`，该输出只作为隔离预览中间产物；最终 GLB、审计 JSON、截图和 README 必须复制或写入 `<project-root>\docs\superpowers\model-candidates\2026-05-31-ultra-glass-stopcock-redesign\`。
- 本轮没有改主项目代码，因此不需要启动固定 `5174` 主项目预览。
- 如果后续改到主项目代码，必须使用：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

必须截图：

- 俯视图：玻璃旋塞在黑色打气阀对角侧。
- 正面近景：玻璃旋塞结构完整。
- 侧面近景：下方气管穿过瓶塞，且旧中心位无残留。
- 开状态近景：把手和流道方向可读。
- 关状态近景：把手和流道方向可读。
- 全局视角：整体布局协调，没有破坏已验收打气球和黑色球阀布局。

#### 步骤 3.5：文档和交接

- [ ] 更新候选包 README，写清楚：
  - 本轮只更新候选 GLB。
  - 玻璃旋塞移动到黑色打气阀对角位置。
  - 下方穿塞玻璃气管随旋塞总成一起移动。
  - 旧中心位残留已清理。
  - 未覆盖主项目 `public\models`。
- [ ] 写入最终审计结果路径。
- [ ] 写入截图路径。
- [ ] 写入本轮最终验收记录、审计结果、截图路径和遗留风险。

---

## 4. 总体验收清单

### 视觉验收

- [ ] 玻璃旋塞在黑色打气阀对角位置，不再挤在中心拥挤区。
- [ ] 玻璃旋塞整体比当前候选更像真实玻璃旋塞。
- [ ] 固定外壳、旋转塞芯、杆状把手、上方玻璃口、侧向玻璃口、下方穿塞气管层次清楚。
- [ ] 下方玻璃气管跟随旋塞移动，没有留在旧中心位。
- [ ] 玻璃管和瓶塞之间有合理密封/磨口视觉。
- [ ] 没有明显透明薄片、空壳、穿模、悬空或错轴。
- [ ] 不破坏已验收的黑色球阀、灰管、打气球和主机布局。

### 交互契约验收

- [ ] `Stopcock_Pivot` 存在。
- [ ] 玻璃旋塞开关动画路径存在。
- [ ] 固定玻璃外壳不跟着开关旋转。
- [ ] 旋转塞芯和把手跟着开关旋转。
- [ ] 后续点击、高亮、呼吸、引导锚点有明确可挂载位置。
- [ ] 不新增独立实验状态或阀门逻辑。

### 文件边界验收

- [ ] 没有覆盖 `<project-root>\public\models`。
- [ ] 没有修改 `<project-root>\src`。
- [ ] 没有删除原始输入 GLB。
- [ ] 候选包内新增或更新的文件路径清楚。

---

## 5. 风险和停止条件

### 必须停止并询问用户的情况

- 对角位置放不下完整玻璃旋塞，需要移动黑色打气阀。
- 玻璃旋塞移动后，灰色打气管或蓝管必须大幅重排。
- 旧中心位玻璃件无法判断是否属于旋塞总成，删除可能影响其他结构。
- 旋塞动画路径因移动/重建失效。
- 视觉上必须在“软件骨架风格”和“真实仪器风格”之间做明显取舍。

### 可由执行者直接决定的情况

- 对角位置只需要小幅内收或缩放。
- 口沿、密封圈、玻璃厚度需要微调。
- 玻璃材质透明度需要调整以便看清结构。
- 需要新增 `HSL_` 前缀锚点，但不改变原有节点名。

---

## 6. 执行交接与阶段审查要求

### 执行前必须完成

- [ ] 读取并遵守 `<project-root>\AGENTS.md`。
- [ ] 运行 `git status --short --branch`，确认工作区改动来源。
- [ ] 记录 accepted 基线 GLB 的 SHA256，不把 accepted 目录作为输出目录。
- [ ] 确认本轮输出目录为 `<project-root>\docs\superpowers\model-candidates\2026-05-31-ultra-glass-stopcock-redesign\`。

### 阶段审查规则

- [ ] 每完成任务 1、任务 2 或任务 3，必须停止并输出阶段审查材料。
- [ ] 阶段审查材料必须包含：
  - 改动文件清单。
  - 候选 GLB 路径。
  - 审计 JSON 路径。
  - 截图路径。
  - 已通过的断言。
  - 未解决风险和是否触发第 5 节停止条件。
- [ ] 任务 1 通过前不得执行任务 2。
- [ ] 任务 2 通过前不得执行任务 3。

### 绝对禁止项

- [ ] 不覆盖主项目 `<project-root>\public\models`。
- [ ] 不修改主项目 `<project-root>\src`。
- [ ] 不删除、不替换 accepted 基线 GLB。
- [ ] 不在触发第 5 节停止条件后继续下一任务。
