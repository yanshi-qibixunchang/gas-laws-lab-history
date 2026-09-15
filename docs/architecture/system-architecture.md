# 气律实验室当前系统架构合同

> 状态：当前合同
> 适用版本：6.4.1 及后续沿用相同架构合同的版本
> 最后核验：2026-09-15（版本背景与文档入口复核；整体拆分证据见交接第 4.15 节）
> 替代关系：替代归档目录中所有旧架构草案；旧草案只作历史背景

## 1. 总体数据流

```text
React 入口与启动门禁
  -> 工作台类型化组合入口
    -> 文件/历史/参数动作、实验控制器与资源生命周期
    -> 工作台文件状态与领域适配器
      -> 纯领域模型 / 物理引擎 / 评分与计算
    -> Persistence V3 投影与编码
      -> Web Worker
        -> IndexedDB 代际存储（当前代 + 前一代回退）
    -> preload 白名单桥接
      -> Electron 主进程
        -> 窗口、退出保存、更新、本地文件与导出器子进程
```

依赖方向原则上只允许从外层协调代码指向内层领域代码。领域模型不得反向读取 React、DOM、Electron、IndexedDB 或本地文件系统。

## 2. 模块边界

| 层级 | 当前入口 | 职责 | 不应承担 |
| --- | --- | --- | --- |
| 应用启动 | `src/app/App.tsx` | 启动页、存储初始化、首次运行门禁、全局设置装配 | 实验物理计算、文件迁移细节 |
| 工作台组合入口 | `src/features/workbench/WorkbenchStudioPrototype.tsx` | 有界控制器和页面区域的显式装配、命名端口连接、轻量显示投影及原阶段 effect 安装 | 重新持有文件/运行时权威、仪器流程、教学计时、保存执行或物理公式 |
| 启动与集合所有者 | `useWorkbenchInitialWorkspace.ts`、`useWorkbenchWorkspaceCollectionState.ts`、`workbenchFileCollectionActions.ts` | 初始化并持有唯一文件集合与 refs；分开语义更新、运行帧更新和原子导航提交 | 创建第二套文件集合或让视图绕过提交入口 |
| 工作台动作与历史 | `workbenchFileActions.ts`、`workbenchFileRenameActions.ts`、`workbenchParameterActions.ts`、`workbenchLayoutActions.ts`、`workbenchWindowActions.ts`、`workbenchEditHistoryActions.ts` | 通过显式端口协调文件、参数、窗口、布局及三种 scope 历史；执行时读取当前 refs | 复制领域状态、改变物理算法或把 presentation 撤销扩大到实验快照 |
| 实验控制器 | `useWorkbenchHeatCapacityController.ts`、`useWorkbenchPistonController.ts` 及有界子模块；标准/理想 RuntimeRegistry、FrameLoop、ExperimentRunActions | 组合原状态、仪器命令、教学/模式/场景生命周期与运行调度 | 新建物理权威、重复计时器或通用巨型上下文 |
| 工作区保存与退出 | WorkspacePersistenceResources、WorkspacePersistenceActions、Semantic/LifecycleCheckpointActions、DesktopExitQuiescence、RefreshPresentationCapture | 沿原 scheduler/V3 保存；统一退出冻结、强制新鲜采集、恢复和 UI 采集时点 | 用当前渲染缓存替代 refs、在退出冻结前完成所谓最终保存 |
| 教程所有者 | Tutorial State/Profile/Ownership/Activation/Handoff/Workspace/Lifecycle/Progress 模块 | 管理原学习 profile、所有权和教学文件交接 | 改变实验模式保留策略或新增独立业务权威 |
| 工作台文案 | `workbenchStudioCopy.ts`、`workbenchHeatCapacityRealtimeCopy.ts` 及同目录专用文案模块 | 本地化文案合同、静态文案表和不依赖 React 的文案选择 | 界面状态、副作用、计时器或领域状态修改 |
| 工作台 UI 检查点 | `workbenchHeatCapacityUiCheckpoint.ts` 及同目录专用检查点模块 | 校验并归一化可恢复的纯 UI 状态、计时计划和镜头状态 | 安排计时器、操作 DOM 或直接修改工作台文件 |
| 工作台窗口交互 | `workbenchResultsWindowCoordinator.ts`、`workbenchHeatCapacityMaterialsWindowCoordinator.ts` 及同目录专用协调器 | 以纯状态计划定义 Results 与绝热膨胀法实验资料标签的追加、替换、激活、关闭和下一标签选择 | 写入 React 状态、生成撤销记录、日志或直接操作窗口 |
| 工作台文件生命周期 | `workbenchFileLifecycleCoordinator.ts` | 以纯状态计划定义重命名判定、关闭缓存、重新打开、删除、选择及下一活动文件 | 暂停运行时、释放热容会话、生成撤销记录、日志或持久化写入 |
| 工作台只读展示 | `WorkbenchSimulationRealtimePanel.tsx`、`WorkbenchIdealVerificationPanel.tsx`、`WorkbenchIdealResultsWindows.tsx`、`WorkbenchStandardResultsContent.tsx`、`WorkbenchStandardFiguresPanel.tsx`、`workbenchIdealVerificationChart.ts`、`workbenchPresentationFormatting.ts` 及同目录专用展示模块 | 从已计算状态渲染标准/理想实验实时摘要、Results 子页、关系验证、最终图表与诊断，并统一纯展示格式化和图表坐标模型；删除、清空、导出等动作只通过命名回调交还各动作所有者 | 创建运行时、直接修改文件状态、持久化或执行实验操作 |
| 工作台面板兼容 | `workbenchPanelRegistry.ts`、`workbenchPanelCompatibility.ts` | 注册当前可用面板键；只在读取边界把旧 `history` 映射到当前 `verification`，并去除映射后的重复项 | 把历史键重新加入当前状态类型、界面分支或写出白名单 |
| 工作台文件状态 | `workbenchFileState.ts`、`workbenchPistonOscillationState.ts` | 定义通用文件壳、标准/理想气体文件状态、布局默认值，以及活塞振荡文件状态和 Guide/Free 纯转换 | 依赖 `workbenchState.ts` 兼容入口、修改持久化字段名或承载绝热膨胀运行时 |
| 工作台状态适配 | `workbenchHeatCapacityStateTypes.ts`、各 `workbenchHeatCapacityFree*` 模块、`workbenchHeatCapacityGuideRuntimeState.ts`、`workbenchHeatCapacityGuideRuntimeCoordinator.ts`、`workbenchHeatCapacityGuideControlState.ts`、`workbenchHeatCapacityTeachingRuntimeState.ts`、`workbenchHeatCapacityTeachingLifecycleState.ts`、`workbenchHeatCapacityTeachingResultState.ts`、`workbenchHeatCapacityRuntimeCoordinator.ts`、`workbenchHeatCapacityCalibrationCoordinator.ts`、`workbenchHeatCapacityFileFactory.ts`、`workbenchHeatCapacityDisplayState.ts`、`workbenchHeatCapacityCalculationCoordinator.ts`、`workbenchParameterState.ts`、`workbenchFileUnion.ts`、`src/features/workbench/workbenchState.ts` 及同目录绝热膨胀专用模块 | 定义绝热膨胀状态类型边界、默认文件构造、Free 权威事务与证据链、Guide 状态合并/物理步进/操作门禁、Demo 教学映射、跨模式运行与调零、教学生命周期与结果完成、显示源、完整重置、实验组生命周期和计算；通用文件联合类型与参数校验独立承载，旧入口仅维持稳定重导出 | 复制已经存在于领域对象中的权威状态，让任何工作台源码反向依赖兼容入口，或绕过工作流门禁和证据链直接修改记录、回滚、教学结果与评分输入 |
| 领域层 | `src/domain/` | 硬球、理想气体、绝热膨胀、活塞振荡、评分和计算的确定性规则 | 浏览器存储、窗口、文件选择和界面副作用 |
| 持久化 | `src/features/workbench/persistenceV3/` | 权威字段投影、版本化编码、诊断、保留未知数据、恢复 | 把可重算显示值重新定义成权威事实 |
| 存储执行 | `workbenchPersistenceWorkerClient.ts`、`workbenchPersistence.worker.ts` | 传输、超时、事务和 IndexedDB 代际写入 | 修改业务状态或静默吞掉不支持的未来版本 |
| 桌面边界 | `electron/preload.cjs`、`electron/main.cjs` | 白名单 IPC、窗口、退出、更新、本地导出 | 向渲染器暴露 Node.js 或不受控文件系统能力 |
| 导出器 | `tools/exporter/` | 从经过验证的输入生成报告、图表和数据文件 | 回写工作台业务状态 |

ARCH-003 的业务、状态资源和生命周期拆分已完成，主入口清理迁出空行后为 2,670 行。该入口保留显式页面装配和轻量显示投影，没有裸 useState/useRef/useEffect/useLayoutEffect；完成判据是职责所有权与行为隔离，而非行数。七层所有者依次为启动与集合、动作与历史、实验运行、保存恢复与退出、教程、界面资源与只读呈现、主入口组合，完整模块地图见 [Workbench 界面组合合同](workbench-ui-composition.md)。

`workbenchState.ts` 仍为 300 行纯兼容重导出。绝热膨胀状态类型、Free 权威事务与证据链、Guide 控件和物理步进、Demo 映射、计算、模式和教学生命周期均直接依赖专用职责模块；递归架构门禁禁止其他工作台源码重新导入兼容入口。字段权威关系由 [绝热膨胀工作台状态权威表](workbench-heat-capacity-state-authority.md) 固定，实验分组、Real/Ideal 域和当前现场仍由统一事务同步。活塞控制器沿用原会话、通道和 refs，只读判断仍由 `workbenchPistonOscillationViewState.ts` 等派生模块提供；精确计算、主周期识别和物理算法不因拆分改变。

整体审计以 `44b98de` 为对照：99 项 effect 的 93 项 passive 与 6 项 layout 队列各自顺序不变，33 项 Heat 描述符的 callback/dependencies token 不变；刷新 `session.ui` 的 67 个字段在展开 40 个普通 UI 采集字段后，名称、顺序和值表达式全部一致。106 个新增生产模块全部接入主入口导入图，五类权威资源各初始化一次；静态运行时依赖图无环，领域层没有反向依赖外层。全局检查、浏览器与性能证据见[当前交接第 4.15 节](../current-development-handoff.md)。

绝热膨胀“实验资料与结果”的整体关闭与标签开关使用 `presentation` 历史：先采集布局，再提交关闭；撤销仅恢复目标文件的标签、活动页和窗口布局，并走已有保存调度，不恢复领域或模式运行快照。切换活动标签不增加历史，其他文件不受影响。纯布局计划仍由 `workbenchHeatCapacityMaterialsWindowCoordinator.ts` 提供；`workbenchWindowActions.ts` 执行先快照后提交及更新器内重新规划，`workbenchEditHistoryActions.ts` 负责记录和恢复，历史栈由 `useWorkbenchEditHistoryState.ts` 持有。最初修复证据见当前交接第 4.12 节，整体拆分复核见第 4.15 节。

活塞操作镜的绘制策略由 `pistonOscillationOperationMirror.ts` 的纯函数选择：两个常驻模型就绪且初始视图完成首帧后，完全隐藏时为 `never`，可见和退出动画期间为 `demand`。显示切换保留同一 Canvas、模型和相机；该策略只控制操作镜绘制，不得改变主画布、物理步进、实验记录或持久化权威。

标准/理想气体的 `SimulationCanvas` 将尺寸订阅交给 `src/components/simulationCanvasResize.ts`：一次挂载只建立一次监听，同帧合并尺寸通知，仅在整数缓冲尺寸或 DPR 改变时重置和重绘，并在卸载时取消待执行回调。粒子与相机仍走原绘制 effect，resize 回调读取当前绘制引用。工作台视口决定显示尺寸，canvas 在其中绝对定位，不参与祖先尺寸计算。该边界不接管物理步进、采样、文件数据或持久化；受控性能和交互证据见当前交接第 4.10 节。

绝热膨胀模式入口的纯选择由 `workbenchHeatCapacityModeActivation.ts` 负责：选择新建或恢复的 Demo/Guide/Free 会话、校验 Demo 检查点、准备文件激活投影及教学重置确认条件。`workbenchHeatCapacityModeActions.ts` 通过注入的文件读取、模式状态机、界面回调和保存接口协调进入、退出、切换及文件激活；构造时不执行动作，不另存文件、模式状态或计时器。确认回调重新读取当前文件；延迟保存执行时重新检查退出/运行故障门禁，读取最新保存回调，保持事件只安排保存、切换请求先安排保存再 flush 的原有顺序。Explore 文件激活不提供活动模式检查点覆盖，正式模式显式提供对应检查点（包括 null）。场景过渡与 Demo 时钟由 Heat 控制器的模式、演示和场景子模块协调；UI 检查点采集由 `workbenchHeatRuntimeCheckpoint.ts`、`workbenchHeatRefreshSessionCapture.ts` 及普通 UI 采集模块负责；调度器和 V3 写入沿用独立保存边界。不得在渲染时执行会话选择或增加物理采样。最初模式入口迁移见当前交接第 4.11 节，整体模块接线与生命周期复核见第 4.15 节。

## 3. 状态权威规则

1. 物理状态、实验记录、评分输入和计算步骤分别由对应 `src/domain/` 模型定义。
2. 工作台文件状态是当前会话的聚合载体，但不得保存能够从权威领域对象稳定推导出的第二份事实。
3. UI 展开状态、活动标签和镜头等只在确有恢复价值时作为 `ui-checkpoint` 保存；瞬时动画、悬停和临时提示不持久化。
4. 首次运行、法律同意和学习进度以 `AppExperienceProfile` 的一次写入为权威；通用设置只能镜像已提交语言，不能单独标记同意完成。
5. 绝热膨胀法多组 Free 实验以 `heatCapacityFreeExperimentGroups` 为实验历史和业务决策的唯一权威：目标次数、正式编号、当前组、查看组、试次、轨迹、计算、评分、进度和结果均从实验组集合读取。
6. 真实/理想参数域与 `heatCapacityFreeRunWorkspace`、`heatCapacityFreeInstrumentConfig`、`heatCapacityFreeInstrumentState` 共同构成物理引擎所需的当前现场投影；运行工作区保存批次、轨迹、试次和活动尝试，仪器配置对象保存低频有效配置，仪器状态对象保存高频物理、传感器和校准状态，三者都不得反向覆盖实验组集合。受控操作先更新当前现场，再由统一适配路径提交到当前可执行实验组；保存、恢复和历史查看则从实验组与参数域重新投影当前现场。
7. 当前活动尝试、仪器状态、时钟和“本次 U2 已记录但尚未关机归档”等现场状态不属于历史组结果，继续由当前运行现场保存。实验组处于 `collecting` 时，运行现场的 `running / completed` 子状态不得被粗略折叠。
8. 兼容修复只允许旧参数域、旧持久化投影或当前运行工作区提高 `nextTrialSequence`、`nextTraceTrialIndex` 这两个单调递增水位，以避免编号复用；其他冲突均以实验组为准重建工作区。可重算的校正信号和失效标准参考可在严格结构相等前提下修复，未知权威字段和未来版本仍必须隔离。

Persistence V3 的字段分类以 `src/features/workbench/persistenceV3/contract.ts` 为准：`authoritative`、`relation`、`derived`、`quality`、`ui-checkpoint`、`transient`。新增字段必须先确定所属类别。

## 4. 持久化与迁移合同

```text
当前工作台快照
  -> productionFacade 投影
  -> workspaceCodec 编码并校验引用
  -> worker 写入新 generation
  -> 指纹与读回校验
  -> 提交 current generation，并保留 previous generation
```

- 当前生产入口：`src/features/workbench/persistenceV3/productionFacade.ts`。
- 工作区格式与引用校验：`src/features/workbench/persistenceV3/workspaceCodec.ts`。
- 代际存储：`src/features/workbench/persistenceV3/generationStore.ts` 及 IndexedDB 实现。
- 调度与重试：`src/features/workbench/workbenchPersistenceScheduler.ts`。
- 调度请求、快照读端口及生命周期触发由 `useWorkbenchWorkspacePersistence.ts` 组合；普通 UI 的 40 个值由 `workbenchRefreshPresentationCapture.ts` 在保存调用时采集，再并入 Heat 的 67 字段刷新 UI 载荷。
- `workbenchDesktopExitQuiescence.ts` 冻结原运行时和时钟；原生退出经 `useWorkbenchLifecyclePersistence.ts` 等待已有 flush 后请求强制新鲜检查点，保持退出、场景恢复及故障恢复的原引用权威。
- 当前 V3 的生产保存与恢复只能依赖 `productionFacade.ts`、`workspaceCodec.ts` 和当前版本编解码器，不得静态依赖历史迁移实现。
- 在 Persistence V3 内，V2 工作区、V1 文件信封和早期 V3 投影只允许从 `src/features/workbench/persistenceV3/compat/workspaceCompatibilityDecoder.ts` 进入；支持的格式族与版本以 `compat/legacySupportMatrix.ts` 为准，具体旧格式解析冻结在 `compat/legacyV2Adapter.ts`，迁移成功后只写当前格式。
- 浏览器旧 `localStorage/sessionStorage` 的启动迁移仍由 `workbenchPersistenceMigration.ts` 单独负责，并且只能在没有可恢复 V3 代际时进入；它不得成为当前 V3 工作区的普通解码依赖。
- 早期 V3 绝热膨胀投影缺少实验组权威字段时，只有兼容入口可通过 `compat/legacyV3ProjectionAdapter.ts` 补齐；当前 V3 普通解码不得用默认值猜测性修复。
- 面板键以 `workbenchPanelRegistry.ts` 为当前集合；旧 `history` 仅由 `workbenchPanelCompatibility.ts` 在会话、旧工作区、文件布局和 V3 UI 检查点的读取边界映射为 `verification`。任何当前编码或保存路径都不得重新写出旧键。
- 历史迁移结果由基线指纹测试锁定。任何默认值或迁移规则调整若改变既有存档结果，必须先核对影响，再显式提升 `migrationBaselineVersion` 并更新测试说明。
- 不支持的未来版本不得猜测性降级。能够保留的未知文件以 opaque/preserved 形式保留，损坏聚合按诊断结果隔离。
- 保存成功必须建立在事务成功和读回验证上；退出流程不得把“已发起写入”等同于“已安全保存”。

## 5. 首次运行与设置

首次运行资料位于 `src/features/onboarding/`，学习进度位于 `src/features/learning/`。其存储与工作台 IndexedDB 分离：法律同意和学习档案使用版本化 `AppExperienceProfile`，工作区文件使用 Persistence V3。法律正文版本独立于软件包版本，只有法律内容发生实质变化时才提升 `CURRENT_WORKBENCH_LEGAL_VERSION`。

“重新观看产品介绍”只改变临时覆盖层，不得改写同意状态或学习进度；“重新选择学习需求”和“重置学习进度”属于明确的独立操作。

## 6. 桌面与导出边界

- 渲染器只能通过 `electron/preload.cjs` 暴露的窄接口访问桌面能力。
- `electron/main.cjs` 负责验证导出类型、目标位置和输出清单；渲染器不得直接启动 Python 或可执行文件。
- 导出器输出必须仍位于请求目录内，文件数量和路径受 `electron/exporterOutputPolicy.cjs` 限制。
- 导出器自检最长运行 30 秒，正式任务最长运行 180 秒；标准输出最多保留 8 MiB，标准错误最多保留 2 MiB。边界由 `electron/exporterProcessRunner.cjs` 统一执行。
- 超时或输出越界会终止整个导出进程树；Electron 随后仍按既有 `finally` 路径删除临时输入和失败产生的不完整输出目录。
- 自动更新只属于桌面发布链；实验运行和本地结果查看不依赖更新服务。

## 7. 修改门禁

涉及状态、存档或导出的修改必须回答：

1. 哪个对象是唯一权威来源？
2. 哪些字段可推导、哪些必须保存、哪些必须丢弃？
3. 旧版本从哪里迁移，未来版本如何拒绝或保留？
4. 正常、损坏、部分写入、重启恢复和撤销重做分别如何验证？
5. 是否跨越 preload/Electron/子进程边界；若跨越，输入、输出、超时和清理由谁负责？

大型架构修改必须独立成批，不与 UI 美化、物理调参或资料归档混合。
