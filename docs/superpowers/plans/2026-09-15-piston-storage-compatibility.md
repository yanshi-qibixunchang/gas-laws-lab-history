# 活塞旧存档兼容修复与 6.4.2 发行实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 严格迁移已知旧活塞记录，在干净 Windows 上验证 6.4.0、6.4.1 到 6.4.2 的升级后完成三仓库发行。

**Architecture:** 迁移限制在 V3 当前编解码器支持的版本边界，用逐字段相等检查保护原始证据和未知权威。实验物理、显示值精确计算、状态权威和撤销行为保持现行合同。旧安装包只在临时托管 Windows 运行器执行，本地只使用合成资料或副本。

**Tech Stack:** TypeScript、Node 内置断言、Persistence V3、Electron、NSIS、GitHub Actions。

**完成记录（2026-09-20）：** 6.4.2 已正式发布；349 个测试文件、本地完整门禁、两条实际 Windows 升级及 6.4.1 联网发现 6.4.2 均通过。最终资产、标签及证据见 [6.4.2 发行记录](../../releases/v6.4.2.md)。

用户已同意只在副本中修复和验收，原日常资料保持现状；验收通过后沿既定私有源码、匿名源码历史、公开安装包仓库顺序发布。继续使用当前开发分支，不改动其他检出。

## 1. 固定失败与严格迁移

- [x] 修改前运行 `npm.cmd exec tsc -- --noEmit`、`npm.cmd test`、`npm.cmd run build`；347 个测试文件通过。
- [x] 从 Git `v6.4.0` 的纯模型构造合成数据，禁止将用户存档作为提交的 fixture。
- [x] 在 `tests/workbench/workbenchPersistenceV3PistonLegacyFree.test.ts` 固定失败，检查 `decodeWorkbenchPersistenceV3FileRecord(record).ok === true`、`status === 'migrated'`；实测修复前因 authority-not-canonical 失败。
- [x] 修改 `src/features/workbench/persistenceV3/projection.ts` 及有界迁移校验 helper，识别已知 Free 8/9→10 变换，其他权威字段必须保持规范相等。不要直接放行 normalizer 的全部修改。
- [x] 测试空会话、冻结参数、原始采样、审计事件、实验组来源、生产 generation 恢复和再次保存。覆盖未知字段、未来版本、损坏采样或不一致参数仍原样隔离；保持当前版本精确往返。
- [x] 执行相关 Persistence V3 与活塞测试；独立检查需求覆盖和代码质量。

## 2. 约束旧版桌面验收范围

- [x] 在 `tests/workbench/desktopUpgradeProbePolicy.test.ts` 先验证普通本机运行会在任何目录创建或程序启动前拒绝，确认修复前断言失败。
- [x] 为 `scripts/verifyPackagedDesktopState.cjs` 增加托管临时 Windows 环境与路径范围校验；测试允许合法临时路径，拒绝本机、自托管、缺少目录、越界路径。
- [x] 清晰记录实际文件身份与 Free schema，保护新旧工作区同一文件的恢复检查；旧版检查不得依靠名称相同误判成功。
- [x] 保持 `.github/workflows/desktop-upgrade-compatibility.yml` 从依赖锁定安装开始，并在 Windows 临时环境分别执行 6.4.0→6.4.2、6.4.1→6.4.2。

## 3. 构建与本地回归

- [x] 更新三语发布说明、当前交接、文档地图与 BUILD-001/COMPAT-001 状态；保留旧失败和资料误用的真实记录，不把修复推断写成已验收。
- [x] 运行严格 TypeScript、相关测试、全量测试、生产与完整依赖审计、生产构建、`npm.cmd run desktop:installer`。
- [x] 校验安装包、blockmap、latest.yml 的名称、版本、哈希；检查打包源码与当前源码一致、差分重建逐字节相等。
- [x] 使用 5174 检查四类文件、模式切换、参数、撤销/重做、刷新与动画；使用独立资料副本检查当前桌面包的正常关闭及重启。
- [x] 本地提交，核验上传前远端实际角色和祖先关系。

## 4. 三仓库发行与真实升级门禁

- [x] 先上传选定私有仓库，再生成匿名提交；维持 114 个既有排除项、匿名身份和原日期，运行源码字节相同，新增记录完成匿名审查。
- [x] 建立对应 annotated tag 和公开候选 Release，上传三个匹配资产；候选期间稳定更新仍指向 6.4.1。
- [x] 两条干净 Windows 覆盖升级均通过，核验文件身份、持久化、增量重建、正常退出和候选资产哈希后，再转为正式稳定 Release。
- [x] 更新真实发行回执和公开说明，不移动已经发布的 6.4.1 标签或替换资产；验证桌面更新可发现 6.4.2。
- [x] 下载地址、安装包与回执路径、最终验证结果和保留边界已整理在发行记录，供最终交付。原资料及事后备份均不作清理。
