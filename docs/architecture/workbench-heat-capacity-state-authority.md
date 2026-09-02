# 绝热膨胀工作台状态权威表

最后核验：2026-09-02

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
| 当前 Free 仪器投影 | `heatCapacityFreeRunWorkspace`（批次、轨迹、试次、活动尝试）、`heatCapacityFreeInstrumentConfig`（记录、阈值、噪声、环境、物理和传感器配置）、`heatCapacityFreeInstrumentState`（物理、传感器、校准）、顶层当前试验状态 | 当前实验位置的工作副本；通过 `transactHeatCapacityFreeAuthority`、`commitHeatCapacityFreeRuntimeAuthorityTransaction` 或 `hydrateHeatCapacityFreeAuthorityProjection` 原子重建/回写 | 将运行工作区提升为第二套实验历史权威，或只改工作区不更新权威集合 |
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
6. 后续删除任何镜像字段前，仍必须同时检查 V1/V2 迁移、V3 capture/restore、IndexedDB 恢复、模式会话和导出路径。

## 4. 下一大改动断点

高频状态收口前的五轮 4000 步基线为平均 `0.0213–0.03729 ms/step`、P95 `0.0315–0.0994 ms/step`；Free 模式会话快照为 `14,035 bytes`，其中物理、传感器和校准三段共 `1,163 bytes`。本次只增加一层固定工作区引用，没有改变逐步物理算法，也没有把兼容快照改成新格式；完成后仍须用同一测量方法复测。
收口后的同方法复测为平均 `0.01499–0.03093 ms/step`、P95 `0.0214–0.0780 ms/step`；初始 Free 模式会话快照为 `14,024 bytes`。三个旧兼容分段合计 `1,159 bytes`，当前嵌套对象为 `1,196 bytes`，新增的 `37 bytes` 仅来自三个成员名和对象括号；兼容快照仍只写出三个旧字段。测量存在运行时预热波动，但没有观察到超出原基线的逐步开销或快照膨胀。

下一大改动断点是评估当前试验状态、气体类型和参数草稿的语义归属。`heatCapacityFreeExperimentGroupStatus`、`heatCapacityFreeGasType`、`heatCapacityFreeParameterDraft` 的更新频率不高，但分别横跨实验组生命周期、参数域选择和未应用编辑态，不能仅按字段相邻关系继续嵌套。进入下一批结构调整前，必须先列出三者的写入者、恢复优先级和与 Real/Ideal 域的冲突规则。

`heatCapacityFreeExperimentGroupStatus` 暂不列为纯镜像删除项：当前组可以保持 `collecting`，而组内新一次试验在重置后回到 `draft`，两者语义并不相同。后续若要移除顶层字段，应先把“当前试验状态”正式放入 Real/Ideal 活动域并改名，再迁移全部读写与兼容载荷，不能直接用实验组生命周期替代。
