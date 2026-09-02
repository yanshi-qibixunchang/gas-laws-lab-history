# 绝热膨胀工作台状态权威表

最后核验：2026-09-02

当前实现：Free 实验分组、Real/Ideal 域和当前仪器投影统一通过
`workbenchHeatCapacityFreeAuthorityTransaction.ts` 提交或重建。旧的
`storeHeatCapacityFreeRuntimeFieldsInDomain` 名称仅保留为兼容入口。
旧版存档解码是例外：解码阶段必须暂时保留域聚合中的身份高水位，等实验组迁移和
后续 capture 完成合并后再形成统一权威，不能提前用普通运行时 hydrate 覆盖。

## 1. 目的

本文固定 `WorkbenchHeatCapacityState` 各类字段的权威关系，作为拆分 `workbenchState.ts`、修改持久化投影和清理旧镜像字段时的判断基线。它描述当前实现，不改变已有文件字段、版本号或恢复语义。

## 2. 权威分区

| 分区 | 当前字段或投影 | 权威规则 | 禁止的误用 |
| --- | --- | --- | --- |
| 文件身份与公共运行状态 | `id`、`name`、时间戳、`params`、`appliedParams`、`runState`、公共布局字段 | 文件级权威；由通用文件状态和工作区生命周期管理 | 在绝热膨胀领域函数中重新创建另一套文件身份 |
| 模式关系 | `heatCapacityMode`、`heatCapacityFreeParameterScheme`、`heatCapacityFreeDisplayScheme` | 当前模式和当前 Real/Ideal 选择关系的权威 | 从标签页、按钮状态或某个临时运行时字段反推模式 |
| 模式会话 | `heatCapacityModeSessions` | Demo、Guide、Free 暂停/恢复状态的权威集合；必须保持会话 schema 与嵌套版本兼容 | 把当前仪器投影当作所有暂停会话的替代品 |
| Free 实验分组 | `heatCapacityFreeExperimentGroups` | 实验分组历史、组进度、试次归属、计算过程和最终结果的唯一权威 | 直接从顶层 `heatCapacityFreeBatch`、`heatCapacityFreeTrials` 或 `heatCapacityFreeTraceStore` 生成历史结果 |
| Free Real/Ideal 域 | `heatCapacityFreeRealDomain`、`heatCapacityFreeIdealDomain` | 保存各方案参数、物理/传感器/校准/回滚等域状态；其中批次、试次和轨迹必须与实验分组权威保持一致 | 独立修改域内组绑定成员而不经过统一投影/回写函数 |
| 当前 Free 仪器投影 | 顶层 `heatCapacityFreeBatch`、`heatCapacityFreeExperimentGroupStatus`、`heatCapacityFreeTrials`、`heatCapacityFreeTraceStore`、`heatCapacityFreeActiveAttempt` 及相关配置字段 | 当前实验位置的工作副本；通过 `transactHeatCapacityFreeAuthority`、`commitHeatCapacityFreeRuntimeAuthorityTransaction` 或 `hydrateHeatCapacityFreeAuthorityProjection` 原子重建/回写 | 将这些顶层镜像提升为第二套实验历史权威，或只改镜像不更新权威集合 |
| 当前仪器运行检查点 | 电源、阀门、压力、温度、调零、泵频、显示响应、释放状态等顶层字段；Persistence V3 的 `activeRuntime` | 当前模式可恢复的仪器现场；Free 模式下组绑定数据仍服从实验分组和 Real/Ideal 域 | 用当前现场覆盖另一模式的暂停会话，或把显示缓存写成实验结果 |
| Guide 状态 | `heatCapacityGuidePhysicsConfig`、`heatCapacityGuidePhysicsState`、温度传感器、workflow、trial、calculation session | Guide 模式的权威实验状态，Persistence V3 独立存入 `guide` | 与 Free trial、trace 或 experiment groups 混用 |
| 质量与完成度 | `heatCapacityTeachingStatus`、`heatCapacityFreePreheatCompleted` | 教学完成度和预热完成度的权威标记 | 从 UI 是否打开或某个瞬时压力值推断并永久写回 |
| UI 检查点 | 标签页、资料区高度、展开状态、速度选项、提示确认、Intro 标记、硬球视图等 | 可恢复的界面偏好，不属于物理或实验结果 | 让 UI 状态改变物理权威或成为运行阶段判定依据 |
| 派生缓存 | `stats`、`chartData`、`particles` 以及可由权威状态重算的读数 | 可清空或重建；Persistence V3 不把它们视为实验权威 | 用派生缓存覆盖权威实验记录 |
| 旧版持久化载荷 | V1/V2 的 `free.runtime`、`controls`、`sensor`、`calibration`、`trials`、`uiReplay` 等 | 仅用于兼容读取与迁移；写入和恢复必须经过现有 codec/normalizer | 继续扩充旧载荷，或绕过 V3 投影直接把旧镜像定义成新权威 |

## 3. 拆分顺序

1. 先拆状态类型和纯仪器控制逻辑，不改变字段名、字段层级与默认值。
2. 再为实验分组、Real/Ideal 域和当前 Free 仪器投影建立单一事务入口。（已完成）
3. 只有在事务入口和兼容测试齐备后，才允许删除顶层镜像或调整 Persistence V3 投影。
4. 删除任何镜像字段前，必须同时检查 V1/V2 迁移、V3 capture/restore、IndexedDB 恢复、模式会话和导出路径。

## 4. 下一大改动断点

下一大改动断点是删除顶层镜像字段或调整 Persistence V3 投影格式。该阶段会改变存档兼容边界，开始前必须重新核对 V1/V2 迁移、V3 capture/restore、IndexedDB 恢复、模式会话和导出路径，并明确字段删除清单与版本迁移策略。
