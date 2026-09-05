# 气律实验室当前系统架构合同

> 状态：当前合同
> 适用版本：6.4.0 及其后的未发布开发版本
> 最后核验：2026-09-06
> 替代关系：替代归档目录中所有旧架构草案；旧草案只作历史背景

## 1. 总体数据流

```text
React 入口与启动门禁
  -> 工作台 UI 协调器
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
| 工作台 UI | `src/features/workbench/WorkbenchStudioPrototype.tsx` | 窗口、菜单、文件选择、界面事件和跨功能协调 | 新增可独立验证的物理公式或持久化格式判断 |
| 工作台文案 | `workbenchStudioCopy.ts`、`workbenchHeatCapacityRealtimeCopy.ts` 及同目录专用文案模块 | 本地化文案合同、静态文案表和不依赖 React 的文案选择 | 界面状态、副作用、计时器或领域状态修改 |
| 工作台 UI 检查点 | `workbenchHeatCapacityUiCheckpoint.ts` 及同目录专用检查点模块 | 校验并归一化可恢复的纯 UI 状态、计时计划和镜头状态 | 安排计时器、操作 DOM 或直接修改工作台文件 |
| 工作台窗口交互 | `workbenchResultsWindowCoordinator.ts`、`workbenchHeatCapacityMaterialsWindowCoordinator.ts` 及同目录专用协调器 | 以纯状态计划定义 Results 与绝热膨胀法实验资料标签的追加、替换、激活、关闭和下一标签选择 | 写入 React 状态、生成撤销记录、日志或直接操作窗口 |
| 工作台文件生命周期 | `workbenchFileLifecycleCoordinator.ts` | 以纯状态计划定义重命名判定、关闭缓存、重新打开、删除、选择及下一活动文件 | 暂停运行时、释放热容会话、生成撤销记录、日志或持久化写入 |
| 工作台只读展示 | `WorkbenchSimulationRealtimePanel.tsx`、`WorkbenchIdealVerificationPanel.tsx`、`WorkbenchIdealResultsWindows.tsx`、`WorkbenchStandardResultsContent.tsx`、`WorkbenchStandardFiguresPanel.tsx`、`workbenchIdealVerificationChart.ts`、`workbenchPresentationFormatting.ts` 及同目录专用展示模块 | 从已计算状态渲染标准/理想实验实时摘要、Results 子页、关系验证、最终图表与诊断，并统一纯展示格式化和图表坐标模型；删除、清空、导出等动作只通过回调交还主组件 | 创建运行时、直接修改文件状态、持久化或执行实验操作 |
| 工作台面板兼容 | `workbenchPanelRegistry.ts`、`workbenchPanelCompatibility.ts` | 注册当前可用面板键；只在读取边界把旧 `history` 映射到当前 `verification`，并去除映射后的重复项 | 把历史键重新加入当前状态类型、界面分支或写出白名单 |
| 工作台文件状态 | `workbenchFileState.ts`、`workbenchPistonOscillationState.ts` | 定义通用文件壳、标准/理想气体文件状态、布局默认值，以及活塞振荡文件状态和 Guide/Free 纯转换 | 依赖 `workbenchState.ts` 兼容入口、修改持久化字段名或承载绝热膨胀运行时 |
| 工作台状态适配 | `workbenchHeatCapacityStateTypes.ts`、各 `workbenchHeatCapacityFree*` 模块、`workbenchHeatCapacityGuideRuntimeState.ts`、`workbenchHeatCapacityGuideRuntimeCoordinator.ts`、`workbenchHeatCapacityGuideControlState.ts`、`workbenchHeatCapacityTeachingRuntimeState.ts`、`workbenchHeatCapacityTeachingLifecycleState.ts`、`workbenchHeatCapacityTeachingResultState.ts`、`workbenchHeatCapacityRuntimeCoordinator.ts`、`workbenchHeatCapacityCalibrationCoordinator.ts`、`workbenchHeatCapacityFileFactory.ts`、`workbenchHeatCapacityDisplayState.ts`、`workbenchHeatCapacityCalculationCoordinator.ts`、`workbenchParameterState.ts`、`workbenchFileUnion.ts`、`src/features/workbench/workbenchState.ts` 及同目录绝热膨胀专用模块 | 定义绝热膨胀状态类型边界、默认文件构造、Free 权威事务与证据链、Guide 状态合并/物理步进/操作门禁、Demo 教学映射、跨模式运行与调零、教学生命周期与结果完成、显示源、完整重置、实验组生命周期和计算；通用文件联合类型与参数校验独立承载，旧入口仅维持稳定重导出 | 复制已经存在于领域对象中的权威状态，让任何工作台源码反向依赖兼容入口，或绕过工作流门禁和证据链直接修改记录、回滚、教学结果与评分输入 |
| 领域层 | `src/domain/` | 硬球、理想气体、绝热膨胀、活塞振荡、评分和计算的确定性规则 | 浏览器存储、窗口、文件选择和界面副作用 |
| 持久化 | `src/features/workbench/persistenceV3/` | 权威字段投影、版本化编码、诊断、保留未知数据、恢复 | 把可重算显示值重新定义成权威事实 |
| 存储执行 | `workbenchPersistenceWorkerClient.ts`、`workbenchPersistence.worker.ts` | 传输、超时、事务和 IndexedDB 代际写入 | 修改业务状态或静默吞掉不支持的未来版本 |
| 桌面边界 | `electron/preload.cjs`、`electron/main.cjs` | 白名单 IPC、窗口、退出、更新、本地导出 | 向渲染器暴露 Node.js 或不受控文件系统能力 |
| 导出器 | `tools/exporter/` | 从经过验证的输入生成报告、图表和数据文件 | 回写工作台业务状态 |

`WorkbenchStudioPrototype.tsx` 目前仍是 25,216 行的较大界面协调入口；`workbenchState.ts` 已收尾为 300 行纯兼容重导出，不再承载声明或实现。展示拆分已经把标准/理想实验实时摘要、理想气体关系验证、标准结果和最终图表，以及 Points/Verification 子页外壳移入独立组件；状态拆分已覆盖绝热膨胀的完整类型、纯仪器计算、参数与试次选择、实验组、运行默认值、Free 热状态与证据链、Guide 状态合并、物理步进、操作门禁、Demo 映射、跨模式运行与调零、教学生命周期、结果完成、默认文件构造和通用参数校验。主组件、持久化和会话恢复均直接依赖职责模块；递归架构门禁禁止除兼容入口自身以外的工作台源码重新导入 `workbenchState.ts`。绝热膨胀字段权威关系由 `workbench-heat-capacity-state-authority.md` 固定；实验分组、Real/Ideal 域与当前 Free 运行现场通过统一事务同步，旧字段名只允许出现在持久化、模式会话或回滚兼容边界。活塞模式、电源显示和结果窗口的只读判断已迁至 `workbenchPistonOscillationViewState.ts`：仅接收文件与瞬态显示请求，返回标量和原会话引用；不创建状态权威，不规范化数据，也不执行副作用。参数缓存、实时通道、模式切换、持久化和撤销仍由原调用位置负责。当前交接第 4.9 节已完成受控性能复核并修复隐藏操作镜绘制；下一批先收口标准模拟的持续长帧（`PERF-001`），再独立拆分绝热膨胀模式与持久化副作用。

活塞操作镜的绘制策略由 `pistonOscillationOperationMirror.ts` 的纯函数选择：两个常驻模型就绪且初始视图完成首帧后，完全隐藏时为 `never`，可见和退出动画期间为 `demand`。显示切换保留同一 Canvas、模型和相机；该策略只控制操作镜绘制，不得改变主画布、物理步进、实验记录或持久化权威。

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
