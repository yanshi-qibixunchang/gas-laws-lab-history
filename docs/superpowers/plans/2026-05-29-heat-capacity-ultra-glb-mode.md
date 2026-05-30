# 热容比 Ultra GLB 模型接入计划（基于现有审计）

> 后续执行本计划时，建议使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`，并按本文的 `- [ ]` 清单逐项推进、完成一项勾选一项。

> **计划拆分状态：** 当前先执行模型布局优化专案 `<project-root>\docs\superpowers\plans\2026-05-30-heat-capacity-ultra-model-layout-optimization.md`。本文件保留为后续软件接入总计划；在模型布局由用户验收前，不进入 GLB 软件接入实现。

## 目标

- [ ] 只在 `极致画质` / `ultra` 性能模式中使用 FD-NCD-C GLB 模型。
- [ ] `低负载`、`均衡`、`高性能` 继续使用当前项目内已有的程序化骨架。
- [ ] Ultra 不是单独的静态展示档，必须完整支持当前热容比的三种模式：`demo`、`guide`、`free`。
- [ ] Ultra 必须支持引导演示和自由实验；自动演示焦点、手动引导步骤、自由实验操作都要能驱动 GLB 模型上的同一套控件。
- [ ] GLB 接入后必须达到和当前程序化骨架同级别的可用程度：点击区域、悬停高亮、焦点呼吸、状态变化、数字屏幕、阀门、气囊、调零旋钮、电源、流动反馈都能正常被项目状态驱动。
- [ ] GLB 需要做一层项目侧骨架适配：把现有程序化骨架中的呼吸、脉冲、高亮、回滚、焦点、锁定交互和流程提示重新锚到 GLB 节点上。
- [ ] 如果模型或项目适配做不到完整可用，不把半成品并入最终接入；先停在模型优化或项目侧锚点调整阶段。
- [ ] 项目环境保持干净：最终默认只纳入运行时需要的 `.glb` 和项目接入代码，不纳入外部 preview app、`.blend`、Blender 生成脚本、外部实验状态机。

## 已完成的事实审计

- [x] 外部仓库已临时克隆到 `D:\tmp\codex\fd-ncd-c-model-preview`。
- [x] 外部仓库 HEAD 已确认是用户给出的发布提交：`49750ff90f7b3bd1221af65c7c238a2918925a9f`。
- [x] 外部 preview 已在本地跑通过，端口使用过 `http://127.0.0.1:5181/`，验证后已停止。
- [x] 外部 GLB 已解析，不是仅凭描述判断。
- [x] 当前项目热容比 3D 场景和工作台回调已扫描，不是后续执行时才开始找入口。
- [x] 当前项目尚无 `<project-root>\public\models` 目录；后续只有在资产审计通过后才创建并复制运行时 GLB。
- [x] Blender MCP 当前未连接，系统命令中也没有直接找到 `blender.exe`。这不阻塞当前计划，因为 GLB 节点、动画和 preview 行为已经可由文件解析和浏览器验证确认；如果后续需要真正改模型，需要先启动 Blender MCP 插件或提供 Blender 路径。

## 模型现状审计

### GLB 文件

- 外部运行时 GLB：`D:\tmp\codex\fd-ncd-c-model-preview\fd-ncd-c-threejs\public\models\fd-ncd-c-experiment.glb`
- 外部根目录 GLB：`D:\tmp\codex\fd-ncd-c-model-preview\air_heat_capacity_ratio_instrument_interactive.glb`
- 两个 GLB 文件大小一致：`3,620,968` 字节。
- 已解析 GLB 内容：
  - 节点数：`131`
  - 网格数：`112`
  - 材质数：`22`
  - 动画数：`5`

### 已确认存在的关键模型部件

| 项目控件 | GLB 节点或动画 | 当前结论 |
| --- | --- | --- |
| 电源按钮 | `FD_NCD_C_PowerSwitch_Button`，动画 `PowerSwitch_Button_Press_Test` | 有模型节点和测试动画，可接项目 `powerOn` 状态。 |
| 电源指示灯 | `FD_NCD_C_PowerIndicator_LED` | 有模型节点，可由项目 `powerOn` 改材质发光。 |
| 旋塞 | `Stopcock_Pivot`，动画 `Stopcock_Open_Close` | 有 pivot 和测试动画，可接项目 `stopcockAngleDeg` / `onStopcockOpenChange`。 |
| 打气气囊 | `Pump_Bulb`，morph target 名称 `Pump_Bulb_Compressed`，动画 `Pump_Compress_Release` | 有压缩形态，可接项目 `pumpBulbState` / `pumpPulseId` / `onPumpBulbPress`。注意 `Pump_Bulb_Compressed` 不是节点名，资产测试要检查 morph target。 |
| 打气阀门 / 进气阀 | `InletValue_Pivot`、`InletValue_THandle`，动画 `InletValue_Closed_Open` | 有阀门模型，不需要先新建；需要在项目侧接成当前 `pumpValveOpen` 控件。 |
| 压力调零旋钮 | `FD_NCD_C_ZeroAdjustKnob`、`FD_NCD_C_ZeroAdjustKnob_BaseRing`、`FD_NCD_C_ZeroAdjustKnob_IndicatorLine`，动画 `ZeroAdjust_Knob_Rotate_Test` | 有调零旋钮，不需要先新建；外部 preview 没有完整交互，项目侧必须补 hitbox、拖拽、滚轮、高亮和呼吸。 |
| 压力屏幕 | `FD_NCD_C_PressureDisplay`、`FD_NCD_C_PressureDisplay_Anchor` | 有屏幕节点；anchor 当前是空节点且局部位移为 `[0,0,0]`，不能直接当显示贴图锚点，需要以实际屏幕节点包围盒或契约配置定位。 |
| 温度屏幕 | `FD_NCD_C_TemperatureDisplay`、`FD_NCD_C_TemperatureDisplay_Anchor` | 同上，需要项目生成动态贴图。 |
| 释放/流动可视组 | `Airflow_To_Bottle_Group`、`Airflow_To_Outside_Group` | 有模型组，可接项目已有流动状态，但不能复制外部 preview 的压力逻辑。 |

### 已确认的模型变换线索

- `FD_NCD_C_PowerSwitch_Button` 是 `FD_NCD_C_InstrumentBody` 子节点；外部 preview 使用 `z` 轴、负方向、`0.025` 位移表现按下。
- `Stopcock_Pivot` 的外部 preview 使用 `x` 轴旋转，打开角度 `90` 度。
- `InletValue_Pivot` / `InletValue_THandle` 的外部 preview 使用 `y` 轴旋转，打开角度 `90` 度；Blender 生成脚本注释中又出现 `local_z` 参考。后续执行时以浏览器 preview 已验证的 `y` 轴为第一实现，但必须做交互截图验证；如果视觉方向不对，先改项目契约轴配置，不立刻改模型。
- `Pump_Bulb` 有 morph target `Pump_Bulb_Compressed`，优先用 morph target 表现压缩；资产测试要检查 `mesh.extras.targetNames`、primitive `targets` 和 `Pump_Compress_Release -> Pump_Bulb.weights`。如果运行时找不到 morph influence，再退到局部缩放压缩。
- `FD_NCD_C_ZeroAdjustKnob` 有旋转测试动画，但外部 preview 没接交互。后续项目侧要复用当前程序化旋钮的屏幕投影拖拽算法，而不是复制外部 preview。

### 外部 preview 可参考但不能照搬的内容

- 可参考：
  - 节点命名。
  - 电源按钮位移距离。
  - 旋塞打开角度。
  - 进气阀命中盒范围。
  - 气囊压缩表现。
- 不可照搬：
  - 外部 preview 的 `powerOn`、`stopcockOpen`、`inletValveOpen`、`pressureSignal`、`temperatureSignal` 等内部状态。
  - 外部 preview 的压力、温度、计时、阀门业务逻辑。
  - 外部 preview 的页面结构、Vite 工程、CSS、调试 UI。

## 软件现状审计

### 当前热容比 3D 入口

- 文件：`<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`
- `performanceMode` 类型已包含四档：`standard | balanced | performance | ultra`。
- 当前 hover 控件类型已覆盖未来 GLB 需要的五个交互点：`stopcock`、`pumpBulb`、`pumpValve`、`powerSwitch`、`pressureZero`。
- 当前焦点模式是：`none`、`stopcock`、`instrument`、`pump`。GLB 不需要新增业务焦点类型，除非后续要把 `pressureZero` 从仪表焦点中拆出来。
- 当前 `ultra` 仍走程序化骨架，但和 `performance` 一样被视为 `interactionQualityReduced`，这会暂停部分 halo / edge 反馈。后续 GLB 要达到“极致画质”，不能直接沿用这个暂停逻辑，需要把“轨道相机拖动时降低交互反馈”和“Ultra 模型反馈”拆开处理。
- 当前 Canvas DPR 逻辑是：
  - `standard`: `2.5`
  - `balanced`: `1.5`
  - `performance` / `ultra`: `1`
  后续 GLB 如果要更高画质，需要单独评估 Ultra DPR，不能默认继续用 `1`。

### 当前程序化骨架组成

- 当前主渲染组：`HeatCapacityProceduralSkeleton`
- 里面包含：
  - `HeatCapacityHardSphereLayer`
  - `InstrumentLeads`
  - `PumpAssembly`
  - `InstrumentBox`
- 后续 Ultra 接 GLB 时，不能简单把整个 `HeatCapacityProceduralSkeleton` 整体替换掉，否则可能把硬球教学层一起丢掉。默认方案是：
  - 非 Ultra：继续渲染完整 `HeatCapacityProceduralSkeleton`。
  - Ultra：渲染 GLB 仪器、GLB 交互层、GLB 反馈层，并把 `HeatCapacityHardSphereLayer` 抽到模型分支之外继续保留。

### 当前项目状态和回调入口

| 软件能力 | 已有状态 / props | 已有回调 | GLB 接入要求 |
| --- | --- | --- | --- |
| 电源 | `powerOn` | `onPowerToggle`，工作台中接 `updateHeatCapacityPower` | GLB 按钮只能调用现有回调，不能自建电源状态。 |
| 旋塞 | `stopcockAngleDeg`、`stopcockFlowOpen`、`releaseFlowActive`、`releaseProgress` | `onStopcockOpenChange`，工作台中接 `updateHeatCapacityStopcockOpen` | GLB pivot 旋转必须由项目角度驱动。 |
| 压力调零 | `pressureZeroKnobAngle`、`pressureZeroOffset`、`pressureZeroDisplayText`、`pressureZeroAdjustMode` | `onPressureZeroFineAdjust`、`onPressureZeroCoarseAdjust` | GLB 旋钮必须复用项目调零函数，不能自己改压力读数。 |
| 打气阀门 | `pumpValveOpen`、`pumpValveState`、`pumpHint` | `onPumpValveToggle`，工作台中接 `updateHeatCapacityPumpValve` | GLB 进气阀作为当前打气阀门接入。 |
| 打气气囊 | `pumpBulbState`、`pumpPulseId`、`pumpFrequency`、`pumpFlowActive`、`pumpFlowIntensity` | `onPumpBulbPress`，工作台中接 `pressHeatCapacityPumpBulb` | GLB 气囊只触发现有打气流程。 |
| 数字显示 | `pressureGaugeDisplayValue`、`pressureSignalMv`、`temperatureSignalMv`、`pressureOverLimit` | 无独立 GLB 回调 | 用项目值生成动态贴图，不能用外部 preview 读数。 |
| 锁定交互 | `interactionLocked` | `onLockedInteraction` | GLB hitbox 必须遵守锁定状态，锁定时只走现有锁定提示。 |
| 演示焦点/回滚 | `demoFocusControlId`、`demoFocusPulseActive`、`manualRollbackAnimation`、`manualRollbackKey` | 现有场景内部处理 | GLB 反馈层必须接同一套焦点、呼吸和回滚信号。 |

### 当前调零逻辑可以直接复用

- `<project-root>\src\features\workbench\workbenchState.ts` 已有：
  - `clampHeatCapacityPressureZeroKnobAngle`
  - `getHeatCapacityPressureZeroOffsetForKnobAngle`
  - `getHeatCapacityPressureZeroKnobAngleForOffset`
  - `setHeatCapacityPressureZeroOffset`
  - `adjustHeatCapacityPressureZeroFine`
  - `adjustHeatCapacityPressureZeroCoarse`
- `HeatCapacityInstrumentScene.tsx` 当前程序化旋钮已有：
  - `getPressureZeroPointerAngle`
  - `handlePressureZeroWheel`
  - `startPressureZeroDrag`
  - `HitboxPressureZeroKnob`
- 后续 GLB 方案不是重写调零算法，而是把这些交互方式迁移到 GLB 旋钮命中区域上。

### 当前热容比模式覆盖要求

- 工作台中现有热容比模式类型是 `HeatCapacityMode = 'demo' | 'guide' | 'free'`。
- Ultra 必须覆盖这三种模式：
  - `demo`：自动演示步骤、`autoDemoActive`、`demoFocusControlId`、`demoFocusPulseActive` 必须能在 GLB 控件上表现焦点呼吸和自动操作状态。
  - `guide`：手动引导步骤、锁定操作、错误操作回滚、`manualRollbackAnimation`、`manualRollbackKey` 必须能在 GLB 控件上表现。
  - `free`：自由实验中的电源、旋塞、打气阀、气囊、调零旋钮、显示屏和流动反馈必须和当前项目状态同步。
- 这意味着后续不能只做一个“GLB 模型显示层”；必须做“GLB 模型 + 项目侧交互骨架 + 项目侧反馈骨架”三层。
- `demoFocusControlId` 至少要覆盖这些 GLB/HSL 锚点：`powerSwitch -> HSL_ControlAnchor_PowerSwitch`、`pressureZero -> HSL_ControlAnchor_PressureZero`、`stopcock -> HSL_ControlAnchor_Stopcock`、`pumpValve -> HSL_ControlAnchor_PumpValve`、`pumpBulb -> HSL_ControlAnchor_PumpBulb`、`instrumentPressureDisplay -> HSL_DisplayAnchor_Pressure`、`instrumentTemperatureDisplay -> HSL_DisplayAnchor_Temperature`、`instrumentPanel -> HSL_LayoutReference_InstrumentPanel`。

### 当前依赖

- `package.json` 已有：
  - `three`
  - `@react-three/fiber`
  - `@react-three/drei`
  - `playwright`
- 后续 GLB 接入不新增运行时依赖。
- GLB 加载优先使用现有 `@react-three/drei` 的 `useGLTF` 或 Three 自带能力；如果要 clone scene，优先用 `scene.clone(true)` 并深拷贝材质，避免新增依赖。

## 模型到软件的具体映射表

| GLB 部件 | 项目状态来源 | 项目回调来源 | 视觉适配 | 交互适配 | 风险和处理 |
| --- | --- | --- | --- | --- | --- |
| `FD_NCD_C_PowerSwitch_Button` | `powerOn` | `onPowerToggle(!powerOn)` | 按下时沿 `z` 负向移动 `0.025`；按钮材质按开关状态变亮/变暗。 | 透明 hitbox 包住按钮；锁定时走 `onLockedInteraction`。 | 外部按钮本身没有项目逻辑，必须由项目状态反推视觉。 |
| `FD_NCD_C_PowerIndicator_LED` | `powerOn` | 无 | `powerOn` 时提高 emissive / opacity；关闭时降低。 | 不单独点击。 | 若材质共享，必须 clone material，避免污染同 GLB 其他实例。 |
| `Stopcock_Pivot` | `stopcockAngleDeg` | `onStopcockOpenChange(nextOpen)` | 以项目角度驱动 pivot，不使用外部 preview 的 `stopcockOpen`。 | hitbox 覆盖旋塞手柄和旋转核心。 | 需要浏览器验证打开方向是否和当前程序化骨架一致。 |
| `InletValue_Pivot` / `InletValue_THandle` | `pumpValveOpen`、`pumpValveState` | `onPumpValveToggle()` | 打开/关闭角度由契约配置，首版按 preview 的 `y` 轴 `90` 度实现。 | hitbox union 包住 `InletValue_Pivot`、`InletValue_THandle`、`InletValue_HandleStem`。 | 生成脚本和 preview 的轴描述不完全一致；如果视觉不对，只改契约轴，不改业务代码。 |
| `Pump_Bulb` | `pumpBulbState`、`pumpPulseId`、`pumpFlowActive` | `onPumpBulbPress()` | 优先使用 morph target 名称 `Pump_Bulb_Compressed`；否则按 `y` 轴缩放到 `0.72`。 | hitbox 包住气囊，悬停/按下和当前程序化气囊一致。 | morph target 名称、primitive targets、动画 channel 都必须用资产测试锁住。 |
| `FD_NCD_C_ZeroAdjustKnob` | `pressureZeroKnobAngle` | `onPressureZeroFineAdjust(direction)`、`onPressureZeroCoarseAdjust(delta)` | 旋钮和指示线按项目角度旋转；保留回滚动画。 | 支持滚轮细调和拖拽粗调，复用现有屏幕投影算法。 | 外部 preview 没做该交互，所以这是项目侧新增适配重点。 |
| `FD_NCD_C_ZeroAdjustKnob_IndicatorLine` | `pressureZeroKnobAngle` | 无 | 跟随旋钮角度；用于用户判断旋转状态。 | 不单独点击。 | 如果 indicator 是旋钮子节点，避免重复旋转。 |
| `FD_NCD_C_PressureDisplay` | `pressureGaugeDisplayValue`、`pressureSignalMv`、`pressureOverLimit` | 无 | 项目生成 `CanvasTexture` 贴到屏幕表面。 | 不单独点击。 | GLB anchor 为空位移，不能直接信任；用屏幕节点包围盒定位贴图。 |
| `FD_NCD_C_TemperatureDisplay` | `temperatureSignalMv` | 无 | 同压力屏幕。 | 不单独点击。 | 贴图方向、比例、可读性必须浏览器验收。 |
| `Airflow_To_Bottle_Group` | `pumpFlowActive`、`pumpFlowIntensity` | 无 | 按项目打气状态显示流动脉冲。 | 不单独点击。 | 不能复制外部 preview 的压力变化逻辑。 |
| `Airflow_To_Outside_Group` | `releaseFlowActive`、`releaseProgress`、`stopcockFlowOpen` | 无 | 按项目释放状态显示流动脉冲。 | 不单独点击。 | 需要和当前旋塞释放表现一致。 |
| GLB 整体仪器 | `performanceMode === 'ultra'` | 无 | 只在 Ultra 分支出现。 | 交互层统一管理。 | GLB 失败时回退到程序化骨架，不阻塞其他三档。 |

## 执行建议和已简化决策

- [x] **D1：Ultra 必须覆盖三种热容比模式**
  - 结论：按完整覆盖执行。
  - 范围：`demo`、`guide`、`free` 都要支持。
  - 实施要求：引导演示、自动演示焦点、自由实验操作、锁定提示、错误回滚、呼吸高亮都要重新适配到 GLB 控件锚点。

- [x] **D2：Ultra 中保留硬球教学层**
  - 建议：保留。
  - 原因：当前程序化骨架里硬球教学层是热容比 3D 体验的一部分，直接替换整组会让 Ultra 比其他档少一个教学能力。
  - 实施方式：把硬球教学层从程序化仪器分支里拆出来或在 Ultra 分支复用，不让 GLB 接入破坏已有教学层。

- [x] **D3：GLB 加载失败的处理方式**
  - 建议：先静默回退到程序化骨架，并在控制台输出 warning。
  - 解释：意思是如果 Ultra 模型文件丢了、损坏了、加载失败了，软件不要卡死，也不要让用户无法继续实验；它临时显示回原来的普通骨架。开发调试时我们通过控制台 warning 和测试发现问题。
  - 原因：这是对用户影响最小、实现也最简单的方案。可见错误提示不是不能做，但会增加 UI 状态和文案维护，暂时没必要。

- [x] **D4：最终只提交运行时 GLB**
  - 建议：只提交 `<project-root>\public\models\fd-ncd-c-experiment.glb` 和项目接入代码。
  - 解释：运行时 GLB 就是软件真正运行时要加载的模型文件。外部仓库里的 preview app、`.blend`、Blender Python 生成脚本都只是模型制作或审计资料，不应该进你的主项目。
  - 原因：这和你的要求一致：项目环境最干净，软件只接静态模型，所有开关、电源、阀门、压力和实验逻辑都由当前软件控制。

- [x] **D5：轴向不一致时优先改项目契约**
  - 建议：先改项目契约，不先改 GLB。
  - 原因：这是更简单、风险更低的方向。GLB 已经有 `InletValue_Pivot`、`InletValue_THandle` 和测试动画；如果只是旋转轴、方向、角度不对，在项目契约里改 `axis`、`sign`、`angleDeg` 就能解决。
  - 进入 Blender 改模型的条件：只有当项目契约怎么调都不能解决支点偏移、模型穿插、命中区严重不自然、控件位置无法对齐时，才改 GLB 模型本体。

## 文件改动计划

- [ ] 新增 `<project-root>\public\models\fd-ncd-c-experiment.glb`
  - 只在资产测试通过后复制。
  - 如果模型需要 Blender 修改，先在临时目录改并重新导出，通过测试后再复制。

- [ ] 新增 `<project-root>\src\features\heatCapacity\heatCapacityGlbModelContract.ts`
  - 保存 GLB URL、必需节点名、动画名、轴向、角度、按钮位移、屏幕贴图配置、hitbox 配置、反馈锚点。
  - 该文件是模型和软件之间的唯一契约层，避免节点名散落在组件里。

- [ ] 新增 `<project-root>\src\features\heatCapacity\HeatCapacityInstrumentGlbLayer.tsx`
  - 加载 GLB。
  - clone scene 和 material。
  - 按项目 props 驱动按钮、灯、旋塞、进气阀、气囊、调零旋钮、显示屏、流动组。
  - 不持有实验业务状态。

- [ ] 新增 `<project-root>\src\features\heatCapacity\HeatCapacityGlbInteractionLayer.tsx`
  - 渲染项目侧透明命中盒。
  - 统一处理 pointer enter/leave/down/click/wheel。
  - 调用已有回调，不创建新业务逻辑。

- [ ] 新增 `<project-root>\src\features\heatCapacity\HeatCapacityGlbControlFeedbackLayer.tsx`
  - 渲染 GLB 控件对应的 hover 高亮、激活高亮、焦点呼吸、演示脉冲和手动回滚反馈。
  - 反馈位置来自契约配置和实际节点包围盒。
  - Ultra 下不能被现有 `interactionQualityReduced` 全部关闭。
  - 必须覆盖 `demo`、`guide`、`free` 三种模式中的反馈来源。

- [ ] 修改 `<project-root>\src\features\heatCapacity\HeatCapacityInstrumentScene.tsx`
  - 增加 Ultra GLB 分支。
  - 非 Ultra 保持原程序化骨架。
  - GLB 加载失败时回退程序化骨架。
  - 将硬球教学层从程序化仪器分支里拆出或复制到 Ultra 分支，按 D2 执行。
  - 保持相机、视角重置、overlay、右侧参数、工作台状态不变。

- [ ] 新增 `<project-root>\tests\heatCapacity\heatCapacityGlbAsset.test.ts`
  - 解析运行时 GLB。
  - 校验文件存在、magic 是 `glTF`、JSON chunk 可读。
  - 校验必需节点和动画存在。

- [ ] 新增 `<project-root>\tests\heatCapacity\heatCapacityGlbModelContract.test.ts`
  - 校验契约中的节点名都能在 GLB 里找到。
  - 校验控件映射完整覆盖：电源、旋塞、打气阀、气囊、调零旋钮、压力屏、温度屏。
  - 校验轴向和角度值在允许范围内。

- [ ] 修改现有相关测试
  - `<project-root>\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts`
  - `<project-root>\tests\workbench\workbenchSettingsGeneral.test.ts`
  - 只补 Ultra 模式和 GLB 分支所需断言，不扩大测试范围到无关 UI。

## 后续执行任务清单

### 任务 1：把审计结论锁进测试

- [ ] 在 `heatCapacityGlbAsset.test.ts` 中加入 GLB 解析工具。
- [ ] 校验这些节点必须存在：
  - `FD_NCD_C_InstrumentBody`
  - `FD_NCD_C_PowerSwitch_Button`
  - `FD_NCD_C_PowerIndicator_LED`
  - `Stopcock_Pivot`
  - `Pump_Bulb`
  - `InletValue_Pivot`
  - `InletValue_THandle`
  - `FD_NCD_C_ZeroAdjustKnob`
  - `FD_NCD_C_ZeroAdjustKnob_IndicatorLine`
  - `FD_NCD_C_PressureDisplay`
  - `FD_NCD_C_TemperatureDisplay`
  - `Airflow_To_Bottle_Group`
  - `Airflow_To_Outside_Group`
- [ ] 校验这些动画必须存在：
  - `PowerSwitch_Button_Press_Test`
  - `Stopcock_Open_Close`
  - `Pump_Compress_Release`
  - `InletValue_Closed_Open`
  - `ZeroAdjust_Knob_Rotate_Test`
- [ ] 校验 `Pump_Bulb_Compressed` 是 `Pump_Bulb` mesh 的 morph target 名称，并且 `Pump_Compress_Release` 的 animation channel 指向 `Pump_Bulb.weights`。
- [ ] 运行：

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityGlbAsset.test.ts
```

预期结果：测试失败时说明模型不满足接入门槛；不能继续做 UI 接入。

### 任务 2：建立 GLB 契约

- [ ] 创建 `heatCapacityGlbModelContract.ts`。
- [ ] 将上面的节点名、动画名、轴向、角度、按钮位移写成常量。
- [ ] 为每个控件定义 contract key：
  - `powerButton`
  - `powerLed`
  - `stopcockPivot`
  - `pumpBulb`
  - `pumpValvePivot`
  - `pumpValveHandle`
  - `zeroAdjustKnob`
  - `zeroAdjustIndicatorLine`
  - `pressureDisplay`
  - `temperatureDisplay`
  - `airflowToBottle`
  - `airflowToOutside`
- [ ] 创建 contract 测试，确保契约与 GLB 文件一致。
- [ ] 运行：

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityGlbModelContract.test.ts
```

预期结果：契约名和 GLB 实物一致；后续组件只引用 contract，不散写字符串。

### 任务 3：实现 GLB 视觉层

- [ ] 用现有 `@react-three/drei` 加载 GLB。
- [ ] clone scene，clone material，避免改到缓存实例。
- [ ] 接 `powerOn`：
  - 电源按钮按下/回弹。
  - LED 发光/熄灭。
- [ ] 接 `stopcockAngleDeg`：
  - `Stopcock_Pivot` 按项目角度旋转。
- [ ] 接 `pumpValveOpen`：
  - `InletValue_Pivot` 按契约轴和角度旋转。
- [ ] 接 `pumpBulbState` / `pumpPulseId`：
  - `Pump_Bulb` 使用 morph target 或缩放表现按压。
- [ ] 接 `pressureZeroKnobAngle`：
  - `FD_NCD_C_ZeroAdjustKnob` 和指示线按项目角度旋转。
- [ ] 接 `pressureGaugeDisplayValue`、`pressureSignalMv`、`temperatureSignalMv`：
  - 生成压力屏和温度屏 `CanvasTexture`。
  - 保证文字在深色/亮色主题下都可读。
- [ ] 接流动状态：
  - `Airflow_To_Bottle_Group` 跟随打气流动。
  - `Airflow_To_Outside_Group` 跟随释放流动。

验收：只打开 Ultra 分支时，所有视觉状态都由项目 props 控制，刷新或切换档位不会产生 GLB 自己的状态残留。

### 任务 4：实现 GLB 交互层

- [ ] 为电源按钮创建透明 hitbox。
- [ ] 为旋塞创建透明 hitbox。
- [ ] 为进气阀创建透明 hitbox。
- [ ] 为气囊创建透明 hitbox。
- [ ] 为压力调零旋钮创建透明 hitbox。
- [ ] hitbox 的 hover 状态写回现有 `hoveredControl` 体系。
- [ ] 锁定时所有 hitbox 都调用 `onLockedInteraction`，不触发真实操作。
- [ ] 点击电源时调用 `onPowerToggle(!powerOn)`。
- [ ] 点击旋塞时调用 `onStopcockOpenChange(nextOpen)`。
- [ ] 点击进气阀时调用 `onPumpValveToggle()`。
- [ ] 点击气囊时调用 `onPumpBulbPress()`。
- [ ] 调零旋钮滚轮调用 `onPressureZeroFineAdjust(direction)`。
- [ ] 调零旋钮拖拽调用 `onPressureZeroCoarseAdjust(deltaDeg)`。

验收：Ultra 下五个控件和当前程序化骨架交互语义一致。

### 任务 5：实现 GLB 高亮和呼吸反馈层

- [ ] 将当前程序化骨架里的 hover edge、focus halo、demo pulse、manual rollback 概念迁移到 GLB 控件锚点。
- [ ] 覆盖 `demo`、`guide`、`free` 三种模式，不只覆盖自由实验。
- [ ] `demo` 模式下，自动演示焦点必须能让目标 GLB 控件呼吸或脉冲。
- [ ] `guide` 模式下，手动引导的允许操作、禁止操作、错误回滚必须能反馈到 GLB 控件。
- [ ] `free` 模式下，用户自由点击、拖拽、滚轮操作必须能反馈到 GLB 控件。
- [ ] 每个控件都要有可见反馈：
  - 电源按钮
  - 旋塞
  - 进气阀
  - 气囊
  - 压力调零旋钮
- [ ] Ultra 下拖动相机时可以降低临时反馈，但不能因为 `performanceMode === 'ultra'` 永久关闭反馈。
- [ ] 确认反馈不遮挡数字屏幕，不影响 hitbox 点击。

验收：用户可以像使用普通骨架一样判断“当前鼠标指向哪里、当前焦点在哪里、刚才操作是否生效”。

### 任务 6：接入 Ultra 分支

- [ ] 修改 `HeatCapacityInstrumentScene.tsx`，判断 `props.performanceMode === 'ultra'`。
- [ ] Ultra 加载成功时渲染 GLB 仪器、交互层、反馈层。
- [ ] Ultra 加载失败时回退 `HeatCapacityProceduralSkeleton`。
- [ ] 非 Ultra 不加载 GLB，不改变现有程序化骨架行为。
- [ ] 按 D2 决策处理 `HeatCapacityHardSphereLayer`。
- [ ] 不改变工作台右侧参数、结果窗口、实验状态机、数据记录逻辑。

验收：切换四档顺序仍是 `低负载 / 均衡 / 高性能 / 极致画质`；只有 `极致画质` 出现 GLB。

### 任务 7：测试与浏览器验收

- [ ] 类型检查：

```powershell
npm.cmd exec tsc -- --noEmit
```

- [ ] 单元测试：

```powershell
npm.cmd test
```

- [ ] 固定端口预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

- [ ] 浏览器打开：

```text
http://127.0.0.1:5174/
```

- [ ] Playwright 验收：
  - 打开设置。
  - 切到 `低负载`，确认仍是普通骨架。
  - 切到 `均衡`，确认仍是普通骨架。
  - 切到 `高性能`，确认仍是普通骨架。
  - 切到 `极致画质`，确认 GLB 出现。
  - 点击电源，确认按钮、LED、项目状态同步。
  - 点击旋塞，确认旋塞角度、释放流动、项目状态同步。
  - 点击进气阀，确认阀门角度、项目状态同步。
  - 点击气囊，确认气囊压缩、项目压力流程同步。
  - 滚轮和拖拽调零旋钮，确认压力调零数值和旋钮角度同步。
  - 检查悬停高亮和焦点呼吸不偏位。
  - 使用主项目相机参数检查构图：`position={[4.15, 2.9, 8.25]}`、`target={[0.25, -0.05, 0]}`、`fov={38}`。
  - 在 `demo` 模式检查自动演示焦点能驱动 GLB 呼吸/脉冲。
  - 在 `guide` 模式检查引导步骤、锁定提示和错误回滚能驱动 GLB 反馈。
  - 在 `free` 模式检查自由实验的全部交互能驱动 GLB 状态。
  - 切回其他档，再切回 Ultra，确认状态不丢失、不重复加载异常。

验收：上述任一项失败，都不能标记 GLB 接入完成。

### 任务 8：最终收尾

- [ ] 确认没有提交外部仓库、临时截图、临时审计脚本、外部 preview app。
- [ ] 确认 `D:\tmp\codex\fd-ncd-c-model-preview` 只作为本地临时审计源，不进入主项目。
- [ ] 确认 `git status --short` 只包含本任务需要的文件。
- [ ] 汇总最终变更、测试命令、预览 URL、未解决风险。

## 停止条件

- [ ] GLB 缺少上述必需节点或动画，且不能通过契约适配解决。
- [ ] 调零旋钮无法做到滚轮、拖拽、状态同步和高亮呼吸。
- [ ] 进气阀方向或支点无法通过项目契约自然适配。
- [ ] 数字屏幕贴图不可读或位置严重偏移。
- [ ] GLB 分支会污染项目实验状态机，或需要导入外部 preview 逻辑才能工作。
- [ ] Ultra 下用户无法像普通骨架一样完成电源、旋塞、打气阀、气囊、调零操作。

触发停止条件时，后续不继续合入 GLB 接入，而是回到模型优化或契约锚点修正。

## 当前计划状态

- [x] 已审计外部 GLB 文件、节点、动画和 preview 交互。
- [x] 已审计当前项目热容比 3D 场景、状态、回调和测试基础。
- [x] 已确认调零旋钮存在，不需要先新建模型零件。
- [x] 已确认打气阀门 / 进气阀存在，不需要先新建模型零件。
- [x] 已把后续执行方向改成基于现有模型和现有软件入口的具体映射方案。
- [x] 已按用户要求确认 Ultra 必须完整支持 `demo`、`guide`、`free` 三种热容比模式。
- [x] 已给出简化建议：轴向不一致时先改项目契约，只有契约解决不了支点/穿插/命中区问题才改 GLB。
- [ ] 等用户审核本计划后，再进入实际 GLB 接入执行。
