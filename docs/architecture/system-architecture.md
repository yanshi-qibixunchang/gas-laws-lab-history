# 气律实验室当前系统架构合同

> 状态：当前合同
> 适用版本：6.4.0 及其后的未发布开发版本
> 最后核验：2026-09-01
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
| 工作台窗口交互 | `workbenchResultsWindowCoordinator.ts` 及同目录专用协调器 | 以纯状态计划定义 Results 标签的追加、替换、激活、关闭和下一标签选择 | 写入 React 状态、生成撤销记录、日志或直接操作窗口 |
| 工作台状态适配 | `src/features/workbench/workbenchState.ts` 及同目录专用模块 | 把文件状态、领域模型和 UI 操作连接起来；维持兼容入口 | 复制已经存在于领域对象中的权威状态 |
| 领域层 | `src/domain/` | 硬球、理想气体、绝热膨胀、活塞振荡、评分和计算的确定性规则 | 浏览器存储、窗口、文件选择和界面副作用 |
| 持久化 | `src/features/workbench/persistenceV3/` | 权威字段投影、版本化编码、诊断、保留未知数据、恢复 | 把可重算显示值重新定义成权威事实 |
| 存储执行 | `workbenchPersistenceWorkerClient.ts`、`workbenchPersistence.worker.ts` | 传输、超时、事务和 IndexedDB 代际写入 | 修改业务状态或静默吞掉不支持的未来版本 |
| 桌面边界 | `electron/preload.cjs`、`electron/main.cjs` | 白名单 IPC、窗口、退出、更新、本地导出 | 向渲染器暴露 Node.js 或不受控文件系统能力 |
| 导出器 | `tools/exporter/` | 从经过验证的输入生成报告、图表和数据文件 | 回写工作台业务状态 |

`WorkbenchStudioPrototype.tsx` 和 `workbenchState.ts` 目前仍是较大的协调入口。第一批拆分已经把通用工作台文案、绝热膨胀法实时文案和 UI 检查点归一化移入专用模块；第二批把标准模拟与理想气体的 Results 标签状态变化收口到统一窗口交互协调器。主组件只消费状态计划，并继续负责撤销记录、日志、界面选中和其他副作用。后续按“其他单一交互协调器 → 独立渲染区域 → 状态领域切片”的顺序小批拆分，避免一次性重写。新增逻辑时应优先进入现有专用模块；只有确属跨模块编排的代码才留在这两个入口中。

## 3. 状态权威规则

1. 物理状态、实验记录、评分输入和计算步骤分别由对应 `src/domain/` 模型定义。
2. 工作台文件状态是当前会话的聚合载体，但不得保存能够从权威领域对象稳定推导出的第二份事实。
3. UI 展开状态、活动标签和镜头等只在确有恢复价值时作为 `ui-checkpoint` 保存；瞬时动画、悬停和临时提示不持久化。
4. 首次运行、法律同意和学习进度以 `AppExperienceProfile` 的一次写入为权威；通用设置只能镜像已提交语言，不能单独标记同意完成。
5. 绝热膨胀法多组 Free 实验以 `heatCapacityFreeExperimentGroups` 为实验历史和业务决策的唯一权威：目标次数、正式编号、当前组、查看组、试次、轨迹、计算、评分、进度和结果均从实验组集合读取。
6. 真实/理想参数域与顶层 `heatCapacityFreeBatch / Trials / TraceStore` 继续作为物理引擎所需的当前现场投影，不得反向覆盖实验组集合。受控操作先更新当前现场，再由统一适配路径提交到当前可执行实验组；保存、恢复和历史查看则从实验组重新投影这些镜像。
7. 当前活动尝试、仪器状态、时钟和“本次 U2 已记录但尚未关机归档”等现场状态不属于历史组结果，继续由当前运行现场保存。实验组处于 `collecting` 时，运行现场的 `running / completed` 子状态不得被粗略折叠。
8. 兼容修复只允许旧参数域或顶层镜像提高 `nextTrialSequence`、`nextTraceTrialIndex` 这两个单调递增水位，以避免编号复用；其他冲突均以实验组为准重建镜像。可重算的校正信号和失效标准参考可在严格结构相等前提下修复，未知权威字段和未来版本仍必须隔离。

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
