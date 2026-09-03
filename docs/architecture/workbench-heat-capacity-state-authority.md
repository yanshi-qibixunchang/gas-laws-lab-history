# 绝热膨胀工作台状态权威表

最后核验：2026-09-03

当前实现：Free 实验分组、Real/Ideal 域和当前仪器投影统一通过
`workbenchHeatCapacityFreeAuthorityTransaction.ts` 提交或重建。旧的
`storeHeatCapacityFreeRuntimeFieldsInDomain` 名称仅保留为兼容入口。
顶层 `heatCapacityFreeActiveRunConfigSnapshot` 镜像已经删除；当前冻结配置统一通过
当前实验组的 `parameterSnapshot` 读取，无当前组时才回退到所选 Real/Ideal 域的
`activeRunConfigSnapshot`。V1/V2 和模式会话中的同名字段仅作为读取/写出兼容投影保留，
恢复后不得重新进入当前 `WorkbenchHeatCapacityState`。
顶层 `heatCapacityFreeBatch`、`heatCapacityFreeTraceStore`、`heatCapacityFreeTrials` 和
`heatCapacityFreeActiveAttempt` 也已删除；当前运行副本统一收口到
`heatCapacityFreeRunWorkspace`。模式会话和旧存档仍使用原字段名作为稳定的兼容载荷，
解码后必须转换成运行工作区，不能把旧字段重新扩散到当前状态。
顶层 `heatCapacityFreeRecordConfig`、`heatCapacityFreePressureWarningMv`、
`heatCapacityFreeInstrumentNoiseEnabled`、`heatCapacityFreeEnvironmentConfig`、
`heatCapacityFreePhysicsConfig` 和 `heatCapacityFreeSensorConfig` 已收口到
`heatCapacityFreeInstrumentConfig`。该对象只承载当前所选参数域的低频配置投影；模式会话
继续写出原字段名以保持兼容，Persistence V3 则从 Real/Ideal 域和冻结配置重建，不把
这个当前投影重复写入 `activeRuntime`。
顶层 `heatCapacityFreePhysicsState`、`heatCapacityFreeSensorState` 和
`heatCapacityFreeCalibrationState` 已收口到 `heatCapacityFreeInstrumentState`。该对象是
当前 Free 物理、传感器和校准的高频热路径工作区；模式会话与回滚快照仍使用三个原字段名
作为稳定兼容载荷，恢复后统一转入该工作区。跨 Demo、Guide、Free 共用的
`heatCapacityReleaseState` 保持顶层，不属于 Free 专用工作区。
顶层 `heatCapacityFreeExperimentGroupStatus` 已删除并改名为
`heatCapacityFreeRunWorkspace.currentExperimentStatus`。它描述组内当前一次试验的
`draft/running/completed` 生命周期，不等同于实验组集合的 `draft/collecting/completed`；
旧存档和模式会话仍可使用原字段名，但恢复后不得重新形成顶层镜像。
顶层 `heatCapacityFreeGasType` 和 `heatCapacityFreeParameterDraft` 也已删除。当前气体类型
由所选方案的当前实验组（方案一致时）或 Real/Ideal 域读取；已应用参数视图由
`heatCapacityFreeInstrumentConfig` 和该气体类型即时重建。高级参数窗口尚未保存的草稿
继续只存在于 React 局部状态。V1/V2 与模式会话仍可写出这两个旧字段作为稳定兼容载荷，
但恢复后会剥离，不能重新进入当前状态。
旧版存档解码是例外：解码阶段必须暂时保留域聚合中的身份高水位，等实验组迁移和
后续 capture 完成合并后再形成统一权威，不能提前用普通运行时 hydrate 覆盖。

## 1. 目的

本文固定 `WorkbenchHeatCapacityState` 各类字段的权威关系，作为拆分 `workbenchState.ts`、修改持久化投影和清理旧镜像字段时的判断基线。它描述当前实现；兼容载荷中的旧字段继续可读，当前状态字段可以在完成迁移门禁后删除。

## 2. 权威分区

| 分区 | 当前字段或投影 | 权威规则 | 禁止的误用 |
| --- | --- | --- | --- |
| 文件身份与公共运行状态 | `id`、`name`、时间戳、`params`、`appliedParams`、`runState`、公共布局字段 | 文件级权威；由通用文件状态和工作区生命周期管理 | 在绝热膨胀领域函数中重新创建另一套文件身份 |
| 模式关系 | `heatCapacityMode`、`heatCapacityFreeParameterScheme`、`heatCapacityFreeDisplayScheme` | 当前模式和当前 Real/Ideal 选择关系的权威 | 从标签页、按钮状态或某个临时运行时字段反推模式 |
| 模式会话 | `heatCapacityModeSessions` | Demo、Guide、Free 暂停/恢复状态的权威集合；必须保持会话 schema 与嵌套版本兼容 | 把当前仪器投影当作所有暂停会话的替代品 |
| Free 实验分组 | `heatCapacityFreeExperimentGroups` | 实验分组历史、组进度、试次归属、计算过程和最终结果的唯一权威 | 直接从 `heatCapacityFreeRunWorkspace` 生成历史结果 |
| Free Real/Ideal 域 | `heatCapacityFreeRealDomain`、`heatCapacityFreeIdealDomain` | 保存各方案参数、物理/传感器/校准/回滚等域状态；其中批次、试次和轨迹必须与实验分组权威保持一致 | 独立修改域内组绑定成员而不经过统一投影/回写函数 |
| 当前 Free 仪器投影 | `heatCapacityFreeRunWorkspace`（批次、轨迹、试次、活动尝试、当前试验状态）、`heatCapacityFreeInstrumentConfig`（记录、阈值、噪声、环境、物理和传感器配置）、`heatCapacityFreeInstrumentState`（物理、传感器、校准） | 当前实验位置的工作副本；通过 `transactHeatCapacityFreeAuthority`、`commitHeatCapacityFreeRuntimeAuthorityTransaction` 或 `hydrateHeatCapacityFreeAuthorityProjection` 原子重建/回写 | 将运行工作区提升为第二套实验历史权威，或只改工作区不更新权威集合 |
| 当前仪器运行检查点 | 电源、阀门、压力、温度、调零、泵频、显示响应、释放状态等跨模式顶层字段；Persistence V3 的 `activeRuntime` | 当前模式可恢复的仪器现场；Free 模式下组绑定数据仍服从实验分组和 Real/Ideal 域 | 用当前现场覆盖另一模式的暂停会话，或把显示缓存写成实验结果 |
| Guide 状态 | `heatCapacityGuidePhysicsConfig`、`heatCapacityGuidePhysicsState`、温度传感器、workflow、trial、calculation session | Guide 模式的权威实验状态，Persistence V3 独立存入 `guide` | 与 Free trial、trace 或 experiment groups 混用 |
| 质量与完成度 | `heatCapacityTeachingStatus`、`heatCapacityFreePreheatCompleted` | 教学完成度和预热完成度的权威标记 | 从 UI 是否打开或某个瞬时压力值推断并永久写回 |
| UI 检查点 | 标签页、资料区高度、展开状态、速度选项、提示确认、Intro 标记、硬球视图等 | 可恢复的界面偏好，不属于物理或实验结果 | 让 UI 状态改变物理权威或成为运行阶段判定依据 |
| 派生缓存 | `stats`、`chartData`、`particles` 以及可由权威状态重算的读数 | 可清空或重建；Persistence V3 不把它们视为实验权威 | 用派生缓存覆盖权威实验记录 |
| 旧版持久化载荷 | V1/V2 的 `free.runtime`、`controls`、`sensor`、`calibration`、`trials`、`uiReplay` 等 | 仅用于兼容读取与迁移；写入和恢复必须经过现有 codec/normalizer | 继续扩充旧载荷，或绕过 V3 投影直接把旧镜像定义成新权威 |

## 3. 拆分顺序

1. 先拆状态类型和纯仪器控制逻辑，不改变字段名、字段层级与默认值。
2. 再为实验分组、Real/Ideal 域和当前 Free 仪器投影建立单一事务入口。（已完成）
3. 事务入口和兼容测试齐备后，删除批次、轨迹、试次、活动尝试四个顶层镜像，并调整 Persistence V3 投影。（已完成）
4. 按读写频率拆分剩余字段：先收口六个低频配置投影，不改变高频物理更新对象。（已完成）
5. 取得热路径与会话体积基线后，把物理、传感器和校准三个高频状态收口到独立仪器状态工作区，同时保持旧模式会话与回滚字段兼容。（已完成）
6. 把组内当前一次试验的状态改名后收口到运行工作区，同时保留旧存档和模式会话字段的单向兼容。（已完成）
7. 固定旧气体字段、旧草稿气体与 `physics.gamma` 的冲突优先级，再删除气体类型和参数草稿两个顶层镜像。（已完成）
8. 将参数编辑/冻结策略、当前试次选择规则、实验组配置/方案切换/历史查看迁入专用模块，并由旧入口兼容重导出。（已完成）
9. 将 Free/Guide 运行默认值、Free 热状态合并、轨迹清理和完整运行重置迁入无反向依赖的专用模块。（已完成）
10. 将 Demo、Guide、Free 的计算会话创建、逐步作答、实验结束启动和最终结果/评分回写迁入统一协调器。（已完成）
11. 后续删除任何镜像字段前，仍必须同时检查 V1/V2 迁移、V3 capture/restore、IndexedDB 恢复、模式会话和导出路径。

## 4. 下一大改动断点

高频状态收口前的五轮 4000 步基线为平均 `0.0213–0.03729 ms/step`、P95 `0.0315–0.0994 ms/step`；Free 模式会话快照为 `14,035 bytes`，其中物理、传感器和校准三段共 `1,163 bytes`。本次只增加一层固定工作区引用，没有改变逐步物理算法，也没有把兼容快照改成新格式；完成后仍须用同一测量方法复测。
收口后的同方法复测为平均 `0.01499–0.03093 ms/step`、P95 `0.0214–0.0780 ms/step`；初始 Free 模式会话快照为 `14,024 bytes`。三个旧兼容分段合计 `1,159 bytes`，当前嵌套对象为 `1,196 bytes`，新增的 `37 bytes` 仅来自三个成员名和对象括号；兼容快照仍只写出三个旧字段。测量存在运行时预热波动，但没有观察到超出原基线的逐步开销或快照膨胀。

当前试验状态的语义核验和迁移已经完成：实验组可以保持 `collecting`，组内新一次试验则可回到 `draft`，因此它作为 `heatCapacityFreeRunWorkspace.currentExperimentStatus` 独立存在，不能直接由实验组生命周期替代。迁移覆盖默认构造、事务投影、运行操作、V1/V2 与 V3 恢复、IndexedDB/会话规范化和界面读取；冲突时仍以实验组及活动参数域为权威，旧顶层镜像不能反向覆盖。

气体类型与参数草稿收口已经完成。当前读取统一经过
`selectHeatCapacityFreeGasType` 和 `selectHeatCapacityFreeAppliedParameterDraft`；气体切换先同步
当前草稿实验组与所选参数域，再由权威事务提交仪器配置。旧载荷冲突时固定采用“显式旧气体
字段 > 旧草稿气体字段 > 旧草稿 `gamma` > 已应用 `physics.gamma`”的顺序。兼容快照仍保留
旧字段名，当前 `WorkbenchHeatCapacityState`、默认构造和恢复结果均不再包含它们。

参数编辑/冻结与实验组生命周期的职责拆分已经完成。编辑门禁、锁定原因、配置应用核心和
参数冻结进入 `workbenchHeatCapacityFreeParameterState.ts`；当前试次
选择、记录完成度与进度判定进入 `workbenchHeatCapacityFreeTrialState.ts`；实验组配置、方案切换、
展示域、批次进度和历史查看进入 `workbenchHeatCapacityFreeExperimentGroupState.ts`。主界面直接
依赖这些专用模块，`workbenchState.ts` 只为旧调用方保留兼容重导出；专用模块均不得反向依赖
兼容入口。

Free 运行默认值与完整重置的职责拆分已经完成。`workbenchHeatCapacityRuntimeDefaults.ts` 统一
构造 Real/Ideal 参数档案、Free 运行现场和 Guide 默认现场；
`workbenchHeatCapacityFreeRuntimeState.ts` 负责将物理、传感器和校准状态合并回当前显示现场；
`workbenchHeatCapacityFreeTraceState.ts` 负责重置时的轨迹清理；
`workbenchHeatCapacityFreeRunReset.ts` 负责保留已完成历史、清除当前可重做试验并将结果原子提交
回 Real/Ideal 域。参数保存与恢复默认值也已直接从参数模块调用该重置边界。总协调器由 6479 行
降为 5262 行；外部兼容入口、物理算法和存档格式均未改变。

跨模式计算会话的职责拆分已经完成。`workbenchHeatCapacityCalculationCoordinator.ts` 统一负责
Demo/Guide 单次试验与 Free 多组试验的计算基准创建、会话选择、草稿更新、分步提交、答案揭示、
组间切换和完成退出。Free 实验结束后的批次完成与计算启动也通过该模块执行；最终完成时，Ideal
只保存计算过程和结果而不评分，Real 则结合过程回顾生成批次评分并经权威事务回写实验组。
主界面直接依赖新模块，`workbenchState.ts` 继续兼容重导出旧 API。总协调器由 5262 行降为
4867 行，旧计算会话存档结构和恢复语义未改变。

下一大改动断点是 Free 实验操作与证据链的职责拆分。当前打气、阀门、调零、尝试状态、轨迹采样、
回滚快照、记录/重录和错误操作后果仍共同位于总协调器中；这些行为同时决定“操作是否不可逆”、
试次证据和 Real 评分输入，迁移时必须作为同一批次审查，不能只拆界面调用而破坏轨迹或评分链。
