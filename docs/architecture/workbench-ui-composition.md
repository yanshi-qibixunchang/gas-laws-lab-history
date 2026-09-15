# Workbench 界面组合合同

> 状态：当前合同；ARCH-003 整体职责拆分已完成
> 适用版本：6.4.1 及后续沿用相同架构合同的版本
> 最后核验：2026-09-15（版本背景复核；原整体审计完成于 2026-09-07）

本文件固定 ARCH-003 完成后的职责边界。2026-09-06 用户将交付断点调整到整体架构拆分完成，内部检查点不作为整体交付。业务、状态资源与生命周期已迁入明确所有者；主入口保留显式页面装配、命名端口连接和轻量显示投影。整体拆分完成时包版本为 6.4.0，随后相同职责边界进入 6.4.1 正式发行。全局检查、5174 浏览器验收和性能证据集中记录在[当前交接第 4.15 节](../current-development-handoff.md)。

## 完成边界

仪器动作、教学计时、模式切换、快照采集、文件历史和各实验的具体组件均有可追踪的模块所有者。清理迁出空行后的 `WorkbenchStudioPrototype.tsx` 为 2,670 行；行数只说明入口规模，不作为完成条件。入口仍有区域分派、受控组件属性连接、菜单与提示列表投影、文案选择和少量可访问性事件适配，这些均不创建第二权威或执行实验物理、保存与计时生命周期。

不能把职责重新合并为一个同样庞大的控制器或数百字段的通用上下文。实验控制器按状态、动作、显示绑定和生命周期分组；每个子模块只接收完成本职责所需的类型化端口。

## 七层所有者

| 层级 | 主要所有者 | 权威与允许行为 |
| --- | --- | --- |
| 1. 启动与文件集合 | `useWorkbenchInitialWorkspace`、`workbenchInitialSession`、`useWorkbenchWorkspaceCollectionState`、`workbenchFileCollectionActions` | 按原顺序选择和规范化会话。文件、关闭缓存、活动文件与选中面板及其 refs 只有一套；语义更新、运行帧更新和原子集合提交使用各自命名入口。 |
| 2. 文件、参数、布局与历史动作 | `workbenchFileActions`、`workbenchFileRenameActions`、`workbenchParameterActions`、`workbenchIdealExperimentActions`、`workbenchLayoutActions`、`workbenchWindowActions`、`workbenchEditSnapshot`、`workbenchEditHistoryActions` | 读取当前权威，通过现有提交、运行时和保存端口协调动作。纯窗口/文件计划仍由对应 Coordinator 提供；历史保持 file/workspace/presentation 三种 scope。 |
| 3. 实验运行 | `useWorkbenchHeatCapacityController`、`useWorkbenchPistonController` 及各自有界子模块；`useWorkbenchHardSphereRuntimeResources`、`workbenchHardSphereRuntimeRegistry`、`workbenchHardSphereFrameLoop`、`workbenchExperimentRunActions` | 管理原有仪器、教学时钟、模式过渡、场景恢复和运行调度。标准/理想引擎注册表、Heat/Piston refs 均复用原权威，不另建物理模型、采样链或运行时集合。 |
| 4. 保存、恢复与退出 | `useWorkbenchWorkspacePersistenceResources`、`workbenchWorkspacePersistenceActions`、`workbenchSemanticCheckpointActions`、`workbenchLifecycleCheckpointActions`、`useWorkbenchWorkspacePersistence`、`useWorkbenchLifecyclePersistence`、`workbenchDesktopExitQuiescence`、`workbenchRefreshPresentationCapture`、`workbenchHeatRefreshSessionCapture` | 延迟读取当前文件与检查点，沿用单一 scheduler 和 V3 写入。退出冻结、恢复和强制新鲜采集共用原 refs；普通 UI 与 Heat 检查点分开采集，DOM 位置在保存调用时读取。 |
| 5. 教程 | `useWorkbenchTutorialState`、Tutorial Profile/Ownership/Activation/Handoff/Workspace Actions、`useWorkbenchTutorialLifecycle`、`useWorkbenchTutorialProgress` | 沿用学习 profile、跨窗口所有权、临时教学文件和普通工作区交接协议；不把教学状态并入另一套实验文件权威。 |
| 6. 界面资源与只读呈现 | Console/FileTree/Layout/ParameterInteraction 状态 Hook、`useWorkbenchHeatParameterState`、文案/几何/场景派生模块及受控 `Workbench*` 区域组件 | 临时界面状态由各自 Hook 持有；纯投影只读数据，DOM 测量、监听与动画资源独立安装；视图只接数据和命名动作回调。 |
| 7. 主入口组合 | `WorkbenchStudioPrototype.tsx` | 组合上述所有者，按原执行阶段安装 effect，连接窗口和页面区域；不再直接声明 useState、useRef、useEffect 或 useLayoutEffect。 |

纯计算模块不读取 React 状态、DOM 或存储；仅用于类型的导入不产生运行时依赖。DOM 测量与纯几何分开。视图不得通过全局事件或可变单例绕过动作所有者，运行时资源不得因拆分重复创建计时器或逐帧持久化。

## 不变合同

- 文件集合仍是当前工作区权威；历史只按原 scope 捕获文件、工作区或布局。
- 窗口关闭先捕获布局；窗口更新仍在更新器内读取最新文件并重新规划。presentation 撤销只恢复标签、活动页与布局，不回滚实验或重建引擎。
- 文件切换保持旧模式暂停与保存、原子集合提交、目标模式激活及目标检查点保存的顺序；等待刷新恢复的文件继续走保留原模式存储的分支。
- 未提供检查点与显式空检查点具有不同语义。等待场景恢复时保留原模式存储及刷新时间锚点。
- 原生退出先冻结，再等待旧 lifecycle flush，随后强制重新采集并保存；恢复只执行一次，迟到回调、旧文件回调和替换后的计时器继续受原门禁约束。
- 活塞按用户可见且已舍入的数据逐步计算并严格判等，最少两个主周期和局部小峰过滤保持不变。
- Explore 的显式 null 是合法模式，启动恢复不能把它当作缺省 Free 并重新捕获默认读数。Guide 初始化的环境温压和容器读数来自既有 Guide 配置，不能继承非默认 Free 显示值；Free 保存会话保持完整。两处边界的真实保存回归见当前交接第 4.15 节。
- 物理步进、主曲线、采样频率、历史容量、文件持久化格式及其 schema 版本保持不变。

## 整体审计证据

- 以内部检查点 `44b98de` 为对照，递归展开主组件及其自定义 Hook 后，前后均有 99 项 effect：93 项 passive effect 与 6 项 layout effect 各自队列的相对顺序完全一致。模式切换 watchdog 与侧栏 layout effect 的声明位置跨队列互换，但各队列执行顺序不变；中间没有新增即时采集或计时器注册。
- 33 项原 Heat effect 改为只收集 callback/dependencies 的描述符，由 `useWorkbenchHeatEffectPhases` 在原交错阶段安装。逐项 AST 对照确认回调与依赖数组 token 不变，教程和工作区资源仍保持原相对位置。
- `session.ui` 前后均为 67 个字段。展开 `workbenchRefreshPresentationCapture` 的 40 个普通 UI 字段后，全部字段的名称、顺序和值表达式一致；其余 Heat 字段保持原采集表达式。滚动位置和重命名选区仍在实际保存时读取。
- 本批 106 个新增生产模块全部在主入口实际导入图中可达。文件集合、持久化资源、退出资源、标准/理想运行时资源及历史状态各初始化一次。排除 type-only 导入的源码依赖图没有运行时依赖环，领域层没有指向外层模块的反向依赖。

## 验证与后续修改

直接行为测试覆盖真实工厂、引用身份、窗口/历史连续操作、文件切换、参数应用、保存合并和退出时钟。源码合同分别读取实际所有者并检查入口接线，不能拼接整个目录掩盖职责位置。完整全局检查及浏览器证据见[当前交接第 4.15 节](../current-development-handoff.md)。

后续修改仍须复查文件切换、模型加载、模式切换、参数调整、菜单与窗口、撤销/重做、刷新恢复、桌面退出防护及活塞精确计算。性能在独立新浏览器上下文中串行比较，测量时不并发类型检查、测试或构建；保留偶发长帧和实际证据范围，不把架构验收解释为物理标定完成。
