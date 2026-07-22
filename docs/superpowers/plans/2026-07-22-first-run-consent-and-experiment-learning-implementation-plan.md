# 首次启动、许可确认与实验学习解锁详细实施计划

> 状态：第一小版本已实现并通过自动检查，待用户体验验收
>
> 制定日期：2026-07-22
>
> 总体设计：`docs/superpowers/specs/2026-07-22-first-run-consent-and-experiment-learning-design.md`

## 1. 实施目标

在不重写现有绝热膨胀物理模型和实验数据链的前提下，分三个可独立验收的小版本完成：

1. 新增不可见的探索基态，统一演示、引导、自由三种正式模式的进入与退出；把组数选择延后到首次进入自由模式。
2. 新增按实验扩展的学习进度、唯一临时教程文件、全局文件锁和逐步解锁流程。
3. 新增语言、欢迎动画、产品卡片、学习需求问题和强制许可组成的首次启动流程。

每个断点先在固定预览地址完成用户验收。只有用户确认该断点后，才决定是否制作桌面安装版；制作安装版或发布前必须另行确认版本号。

## 2. 总体架构

本次实现分成四层，避免把首次流程、实验学习和绝热膨胀运行态混在一个大型组件中。

### 2.1 应用入口协调层

职责：

- 在工作台显示前判断首次完整流程、许可单独确认、未完成教程和普通工作台。
- 管理语言、卡片、问题和许可的内存草稿。
- 用户同意许可后统一提交体验档案。
- 用户拒绝或退出时丢弃草稿。

建议新增目录：

```text
src/features/onboarding/
  firstRunExperienceModel.ts
  firstRunExperienceStore.ts
  firstRunCopy.ts
  FirstRunExperience.tsx
  FirstRunLanguagePage.tsx
  ProductIntroCarousel.tsx
  LearningNeedsPage.tsx
  MandatoryConsentDialog.tsx
  useReducedMotionPreference.ts
```

小型组件可以在实施时合并，但状态模型、持久化和许可判定必须与展示组件分离。

### 2.2 全局学习协调层

职责：

- 保存每种实验的独立需求答案和学习里程碑。
- 保证全局同一时间只有一个活动教程。
- 管理临时教程文件、普通文件访问锁和教程恢复。
- 为将来的活塞振动实验提供注册表，不提前显示 UI。

建议新增：

```text
src/features/learning/
  experimentLearningModel.ts
  experimentLearningRegistry.ts
  experimentLearningStore.ts
  workbenchTutorialAccessPolicy.ts
  workbenchTutorialCoordinator.ts
  experimentLearningChannel.ts
```

### 2.3 绝热膨胀模式层

职责：

- 把现有 `demo | guide | free` 改为三个正式模式，并允许“当前没有正式模式”。
- 探索基态运行交互和读数，但没有正式记录权限。
- 演示、引导退出后丢弃本轮会话；自由退出后保存完整自由会话。
- 管理教程模式按钮的可见性和解锁转换。

主要复用：

```text
src/domain/heatCapacity/
src/features/heatCapacity/
src/features/workbench/workbenchState.ts
src/features/workbench/workbenchHeatCapacityModeSession.ts
src/features/workbench/useHeatCapacityModeSessionCoordinator.ts
src/features/workbench/WorkbenchStudioPrototype.tsx
```

### 2.4 桌面与网页协调层

职责：

- 桌面端在激活教程前安全保存并关闭其他工作台窗口。
- 教程期间由主进程拒绝新建窗口。
- 网页版同步多标签页教程锁。
- 许可拒绝时执行桌面安全退出或网页阻断。

主要涉及：

```text
electron/main.cjs
electron/preload.cjs
electron/workbenchWindowRegistry.cjs
electron/exitPersistenceCoordinator.cjs
electron.d.ts
```

## 3. 数据模型方案

### 3.1 体验档案

建议使用一个带结构版本的单一体验档案记录，避免零散布尔值互相矛盾。

概念结构：

```ts
interface AppExperienceProfile {
  schemaVersion: 1;
  firstRunCompleted: boolean;
  acceptedLegalVersion: string | null;
  committedLanguage: 'zh-CN' | 'zh-TW' | 'en' | null;
  needs: {
    workspaceUi: 'known' | 'needs-guidance' | null;
    heatCapacity: 'known' | 'needs-guidance' | null;
    pistonOscillation: 'known' | 'needs-guidance' | null;
  };
  learning: {
    heatCapacity: 'demo' | 'guide' | 'unlocked';
    pistonOscillation: 'demo' | 'guide' | 'unlocked';
  };
  activeTutorialExperiment: 'heatCapacity' | 'pistonOscillation' | null;
}
```

当前版本只注册和修改 `heatCapacity`，另外两个需求问题和活塞学习状态保留结构能力但不显示入口。

约束：

- 首次流程草稿只存在 React 内存中。
- 同意许可后才写入完整档案。
- 用户完成绝热膨胀教程后，把 `needs.heatCapacity` 更新为 `known`，把学习状态更新为 `unlocked`。
- 不把临时教程文件、相机位置或教程中间步骤写入体验档案。
- 体验档案保存失败时不继续进入工作台或解锁下一模式。

建议键名：

```text
hsl_experience_profile_v1
```

实际实现可继续使用浏览器本地存储，但必须有严格解析、默认值归一化、写入失败返回值和跨窗口通知；不能使用吞掉异常的“尽力保存”策略处理许可和学习里程碑。

### 3.2 许可版本

建议新增：

```text
src/features/onboarding/workbenchLegalVersion.ts
```

内容包括：

- 当前人工许可版本常量。
- 许可主文档内容修订标识。
- 判断“无需确认、首次确认、版本变化确认”的纯函数。

增加测试，确保许可主内容发生变化时需要同步更新许可修订标识和人工版本。具体许可版本号在真正实施或发布时确定，不在本计划中预设软件版本号。

### 3.3 正式模式与探索基态

保留：

```ts
type HeatCapacityMode = 'demo' | 'guide' | 'free';
```

把文件的当前正式模式改为：

```ts
heatCapacityMode: HeatCapacityMode | null;
```

其中 `null` 表示探索基态，不新增可见的 `explore` 模式按钮。三种模式会话仓库仍然只包含 `demo`、`guide`、`free`。

所有业务分发必须显式处理 `null`，禁止继续使用“非演示、非引导即自由”的默认分支。

### 3.4 临时教程文件

临时教程文件由里程碑即时构建，不作为普通文件写入长期工作区：

- 使用运行时专用标识和系统所有者元数据。
- 文件名固定为“绝热膨胀学习实验（临时）”。
- 文件树和菜单通过统一访问策略判断权限，不在每个按钮里分别硬编码。
- 重启时根据 `activeTutorialExperiment` 和学习里程碑重新构造。
- 完全解锁后销毁运行时文件，再创建普通文件。

## 4. 共通实施规则

- 不修改与本任务无关的实验模型、图表和导出逻辑。
- 不删除旧实验文件或用户现有输出。
- 不把探索基态作为第四个可见模式。
- 不复制一套新的绝热膨胀物理引擎；复用现有物理推进，并通过权限边界禁止记录。
- 所有文件、新窗口和实验窗口入口都必须调用同一个教程访问策略，不能只禁用两个可见按钮。
- 临时教程文件严格只有三条里程碑日志。
- 旧文件不要求完全恢复瞬时动画或计时器，但实验数据和结果必须保留。
- 每个小版本通过后再进入下一版本；同一断点允许多轮修正。
- 每次代码或 UI 修改后使用固定预览端口 `5174`。

## 5. 第一小版本：探索基态与模式统一

### 5.1 目标

用户新建普通绝热膨胀法实验文件后不再立即选择组数，而是进入可交互但不记录的探索基态。演示、引导、自由成为对称的正式模式，自由模式获得退出和自动切组能力。

### 5.2 任务 1：补充状态边界测试

计划新增或修改：

```text
tests/heatCapacity/heatCapacityModeBoundaryRefactor.test.ts
tests/heatCapacity/heatCapacityModeControlModel.test.ts
tests/heatCapacity/workbenchHeatCapacityModeSession.test.ts
tests/heatCapacity/workbenchHeatCapacityFile.test.ts
tests/workbench/workbenchSessionPersistence.test.ts
```

- [ ] 固定现有演示、引导和自由数据结构的兼容基线。
- [ ] 增加“新文件当前正式模式为空”的测试。
- [ ] 增加探索基态不建立自由批次、不写记录、不生成结果的测试。
- [ ] 增加普通文件重开统一回到探索基态的测试。
- [ ] 增加旧版 `free` 文件数据仍可恢复为自由会话的兼容测试。

### 5.3 任务 2：扩展模式类型与显式分发

主要文件：

```text
src/domain/heatCapacity/heatCapacityModeTypes.ts
src/features/workbench/workbenchState.ts
src/features/workbench/workbenchHeatCapacityModeSession.ts
src/features/workbench/useHeatCapacityModeSessionCoordinator.ts
src/features/heatCapacity/heatCapacityModeControlModel.ts
```

- [ ] 允许 `heatCapacityMode` 为 `null`。
- [ ] 新建绝热膨胀文件默认 `null`，不再默认 `free`。
- [ ] 把模式推进、显示来源、控制权限和窗口内容全部改为显式四分支：探索、演示、引导、自由。
- [ ] 删除任何把未知或空模式默认为自由模式的逻辑。
- [ ] 保持 `HeatCapacityMode` 本身仍然只有三种正式模式。

### 5.4 任务 3：建立探索权限边界

建议新增纯策略：

```text
src/domain/heatCapacity/heatCapacityExecutionAuthority.ts
```

- [ ] 探索基态继续推进必要的物理状态和传感器显示。
- [ ] 禁止建立批次、记录 U0/U1/U2、追加自由试验、计算和生成报告。
- [ ] 禁止普通用户操作写入控制台。
- [ ] 保留安全限制和仪器真实反馈。
- [ ] 从探索进入正式模式时构造全新的模式引擎状态，不复制探索现场。
- [ ] 从正式模式退出时构造全新的探索现场。

### 5.5 任务 4：统一模式进入、退出和直接切换

- [ ] 新增统一的 `enter`、`exit` 和 `switch` 模式策略，避免 UI 各自修改文件状态。
- [ ] 演示和引导退出时清除本轮过程、样本、临时结果和报告数据，只保留文件公共参数。
- [ ] 自由退出时保存批次、当前组、已完成组、结果和继续实验所需的仪器状态。
- [ ] 自由会话不保存相机、窗口布局和探索现场。
- [ ] 演示或引导未完成时直接切换，先显示进度清除确认。
- [ ] 从自由切换到其他模式时自动保存，不显示数据丢失提示。
- [ ] 应用重启后的普通文件当前模式统一归一化为 `null`。

### 5.6 任务 5：移动自由模式组数入口

主要文件：

```text
src/features/heatCapacity/HeatCapacityBatchSetupDialog.tsx
src/features/workbench/WorkbenchStudioPrototype.tsx
src/features/workbench/workbenchState.ts
```

- [ ] 删除“新建文件后自动弹组数”的触发。
- [ ] 仅在没有自由批次且用户第一次点击自由模式时打开组数窗口。
- [ ] 取消组数窗口后回到探索基态。
- [ ] 确认组数后固定当前文件的组数方案。
- [ ] 已有自由会话时直接恢复，不重复询问。

### 5.7 任务 6：修改自由模式控制条

主要文件：

```text
src/features/heatCapacity/heatCapacityModeControlModel.ts
src/features/workbench/WorkbenchStudioPrototype.tsx
src/features/workbench/WorkbenchStudioPrototype.css
```

- [ ] 模式栏仍然只显示演示、引导、自由。
- [ ] 为自由模式增加与演示、引导一致的退出图标。
- [ ] 保留“重置当前自由实验组”图标。
- [ ] 删除“下一组”图标及其点击路径。
- [ ] 当前未完成组重置前显示确认；只清除当前组，保留组数和已完成组。
- [ ] 全部实验组完成后隐藏重置图标。

### 5.8 任务 7：自动切组和最终计算

主要文件：

```text
src/features/workbench/workbenchState.ts
src/features/workbench/WorkbenchStudioPrototype.tsx
src/domain/heatCapacity/heatCapacityFreeBatchModel.ts
src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts
```

- [ ] 在成功关机并完成当前组的同一个受控事务中调用现有下一组初始化底层逻辑。
- [ ] 防止快速重复关机产生重复组。
- [ ] 显示非阻断提示“第 N 组已完成，已进入第 N+1 组”并更新组数。
- [ ] 最后一组完成后进入计算交接，不再初始化下一组。
- [ ] 数据交接期间锁定模式切换和重复提交。
- [ ] 自动打开现有计算窗口。
- [ ] 完成文件进入只读结果状态，重新实验必须新建文件。

### 5.9 任务 8：持久化与旧文件迁移

主要文件：

```text
src/features/workbench/workbenchPersistenceSchema.ts
src/features/workbench/workbenchPersistenceMigration.ts
src/features/workbench/persistenceV3/contract.ts
src/features/workbench/persistenceV3/projection.ts
src/features/workbench/persistenceV3/legacyV2Adapter.ts
src/features/workbench/persistenceV3/heatCapacityValueDecoder.ts
src/features/workbench/workbenchSession.ts
```

- [ ] 新格式允许当前正式模式为空。
- [ ] 旧格式的 `demo | guide | free` 仍然是合法输入。
- [ ] 读取旧文件时保留模式数据，但把普通文件当前显示状态归一化为探索基态。
- [ ] 旧自由运行态可安全转换时写入自由会话快照。
- [ ] 无法安全恢复的瞬时状态归一化，不丢弃历史数据和结果。
- [ ] 更新兼容夹具并覆盖旧版本样本。

### 5.10 第一小版本验收

- [ ] 新建文件不弹组数窗口。
- [ ] 探索状态可操作仪器和查看读数，但没有记录、计算、报告和操作日志。
- [ ] 三个正式模式都能从探索进入并正常退出。
- [ ] 演示和引导退出后再次进入从头开始。
- [ ] 自由退出后再次进入恢复完整自由会话。
- [ ] 当前组关机后自动进入下一组。
- [ ] 最后一组自动打开计算结果。
- [ ] 旧文件数据和结果仍可打开。

## 6. 第二小版本：教程文件、全局锁与逐步解锁

### 6.1 目标

在尚未接入完整首次启动 UI 前，先通过设置中的“重置绝热膨胀学习进度”触发完整教程流程，验证全局锁、临时文件、里程碑和异常恢复。

第二版可以创建体验档案和学习状态，但不得把尚未完成的首次启动 UI 标记为已完成。第三版上线时，缺少 `firstRunCompleted` 的老用户仍然会进入正式首次流程。

### 6.2 任务 1：实现体验档案和实验注册表

计划新增：

```text
src/features/learning/experimentLearningModel.ts
src/features/learning/experimentLearningRegistry.ts
src/features/learning/experimentLearningStore.ts
tests/learning/experimentLearningModel.test.ts
tests/learning/experimentLearningStore.test.ts
```

- [ ] 实现严格解析、默认值、结构版本和持久化错误返回。
- [ ] 当前只注册绝热膨胀实验。
- [ ] 预留软件 UI 和活塞振动需求字段，但不渲染入口。
- [ ] 全局最多一个 `activeTutorialExperiment`。
- [ ] 保存里程碑时同步跨窗口和跨标签页。

### 6.3 任务 2：建立统一教程访问策略

计划新增：

```text
src/features/learning/workbenchTutorialAccessPolicy.ts
tests/learning/workbenchTutorialAccessPolicy.test.ts
```

访问策略至少返回：

- 是否允许新建、打开、关闭、重命名、删除、导出和另存文件。
- 是否允许新建窗口。
- 是否允许撤销和重做。
- 是否允许打开实验参数、结果、数据表和计算窗口。
- 是否允许重新观看产品介绍、重新选择需求和重置学习进度。
- 被阻止时的统一提示文案。

所有菜单、快捷键、文件树、系统文件打开和窗口入口统一调用该策略。

### 6.4 任务 3：实现临时教程文件

计划新增或修改：

```text
src/features/learning/workbenchTutorialCoordinator.ts
src/features/workbench/workbenchState.ts
src/features/workbench/WorkbenchStudioPrototype.tsx
src/features/workbench/WorkbenchStudioPrototype.css
tests/learning/workbenchTutorialCoordinator.test.ts
```

- [ ] 保存并关闭当前普通文件，把它们保留在可恢复列表中。
- [ ] 创建唯一的系统所有教程文件。
- [ ] 文件树只显示教程文件和锁定标记。
- [ ] 阻止重命名、关闭、删除、导出和另存。
- [ ] 重启时不读取教程文件快照，只根据里程碑创建新文件。
- [ ] 完全解锁时删除运行时教程文件，创建新的普通探索文件。
- [ ] 旧文件只恢复可打开状态，不自动打开。

### 6.5 任务 4：实现三个教程里程碑

计划新增：

```text
src/features/heatCapacity/heatCapacityLearningProgress.ts
src/features/heatCapacity/HeatCapacityLearningMilestoneDialog.tsx
tests/heatCapacity/heatCapacityLearningFlow.test.ts
```

- [ ] 演示阶段只渲染演示按钮。
- [ ] 初始阻断提示关闭后自动进入演示。
- [ ] 首次演示完成后先保存引导里程碑，再显示引导按钮和解锁动画。
- [ ] 自动进入引导准备态，提示关闭后再启动引导计时和强提醒。
- [ ] 引导正确结果继续使用现有判定。
- [ ] 引导正确后先保存完全解锁里程碑，再完成文件交接。
- [ ] 最终普通新文件停留探索基态。
- [ ] 三种阻断提示统一支持确认、遮罩和 Enter，不支持 Esc。

### 6.6 任务 5：实现模式重放和中断恢复

- [ ] 引导阶段允许重看演示。
- [ ] 演示或引导未完成时切换，显示进度清除确认。
- [ ] 重看演示完成后仍停留演示，不重复里程碑。
- [ ] 教程关闭前显示“下次从本模式第一步开始”的退出确认。
- [ ] 演示阶段重启进入演示第一步。
- [ ] 引导阶段重启进入引导第一步。
- [ ] 引导阶段重看演示时关闭，重启仍进入引导。
- [ ] 日志从里程碑派生，严格只显示三条，不因重启重复。

### 6.7 任务 6：桌面多窗口与网页多标签页锁

桌面文件：

```text
electron/main.cjs
electron/preload.cjs
electron/workbenchWindowRegistry.cjs
electron/exitPersistenceCoordinator.cjs
electron.d.ts
tests/workbench/desktopWorkbenchWindowRegistry.test.ts
tests/workbench/desktopExitPersistenceCoordinator.test.ts
tests/workbench/workbenchElectronSecurity.test.ts
```

- [ ] 新增教程锁状态查询和变更 IPC。
- [ ] 激活教程前请求所有窗口完成持久化。
- [ ] 成功后关闭其他工作台窗口。
- [ ] 教程期间主进程拒绝 `newWindow`。
- [ ] 失败时保留所有原窗口并显示重试/退出，不进入半锁状态。

网页文件：

```text
src/features/learning/experimentLearningChannel.ts
tests/learning/experimentLearningChannel.test.ts
```

- [ ] 使用 `BroadcastChannel`，并提供存储事件降级。
- [ ] 同步活动教程、里程碑和所有者状态。
- [ ] 非所有者标签页显示阻断页。
- [ ] 所有者消失后下次进入按里程碑重建，不接管中间运行态。

### 6.8 任务 7：设置中的学习入口

主要文件：

```text
src/features/workbench/WorkbenchGeneralSettingsWindow.tsx
src/features/workbench/workbenchGeneralSettings.ts
src/features/workbench/WorkbenchStudioPrototype.tsx
src/features/workbench/WorkbenchStudioPrototype.css
tests/workbench/workbenchGeneralSettingsWindow.test.ts
```

- [ ] 新增“学习与引导”分区。
- [ ] 第二版先接入“重置绝热膨胀学习进度”。
- [ ] 已解锁用户确认重置后立即关闭普通文件并创建教程文件。
- [ ] 明确说明旧文件不删除，只暂时不能访问。
- [ ] 教程进行期间禁用该入口。
- [ ] 第二版不渲染尚未接线的“重新观看产品介绍”和“重新选择学习需求”；两个入口在第三版接通后一次性显示。

### 6.9 任务 8：失败恢复

- [ ] 教程文件创建、里程碑保存、窗口关闭或普通文件持久化失败时显示阻断错误。
- [ ] 只提供“重试”和“退出软件”。
- [ ] 不自动解锁、不删除原文件、不跳过教程。
- [ ] 为“完全解锁已保存但普通新文件尚未创建”的中断增加恢复测试。

### 6.10 第二小版本验收

- [ ] 从设置重置学习进度后立即进入唯一教程文件。
- [ ] 其他文件、窗口、快捷键和系统打开入口均无法绕过教程。
- [ ] 演示完成后解锁引导，引导正确后解锁全部模式。
- [ ] 临时文件完成后消失，新普通文件处于探索基态。
- [ ] 退出、崩溃、重启和许可预留状态不会破坏里程碑。
- [ ] 旧文件内容保持不变，教程后可手动重新打开。

## 7. 第三小版本：首次启动 UI 与强制许可

### 7.1 目标

把语言、欢迎动画、产品卡片、学习需求和许可确认接到第二版已经验证的学习系统上，形成完整用户入口。

### 7.2 任务 1：应用入口协调器

主要文件：

```text
src/app/App.tsx
src/features/onboarding/firstRunExperienceModel.ts
src/features/onboarding/firstRunExperienceStore.ts
src/features/onboarding/FirstRunExperience.tsx
tests/onboarding/firstRunExperienceModel.test.ts
tests/onboarding/firstRunExperienceStore.test.ts
```

- [ ] 在渲染 `WorkbenchStudioPrototype` 前判断入口分支。
- [ ] 保留现有 IndexedDB 初始化和安全模式优先级。
- [ ] 首次档案缺失时进入完整流程。
- [ ] 仅许可版本变化时进入许可单独确认。
- [ ] 许可完成后恢复教程或普通工作台。
- [ ] 首次流程中的语言和问题答案只存内存草稿。

### 7.3 任务 2：语言页

主要复用：

```text
src/features/workbench/workbenchGeneralSettings.ts
src/features/workbench/workbenchBrand.ts
```

- [ ] 支持简体中文、繁体中文和 English。
- [ ] 全新用户按 `navigator.languages`、浏览器环境和桌面系统语言匹配。
- [ ] 无匹配时使用简体中文。
- [ ] 旧版语言设置存在时优先使用旧设置。
- [ ] 选择后立即更新首次流程文案，但不提前持久化。
- [ ] 许可同意后再同步到现有通用设置。

### 7.4 任务 3：欢迎动画和产品卡片

计划新增：

```text
src/features/onboarding/ProductIntroCarousel.tsx
src/features/onboarding/useReducedMotionPreference.ts
tests/onboarding/productIntroCarouselModel.test.ts
```

- [ ] 三张本地占位卡片。
- [ ] 左右圆形尖角按钮和三个页码指示点。
- [ ] 5 秒循环轮播。
- [ ] 手动切换后重置计时。
- [ ] 悬停、焦点进入、页面隐藏和最小化时暂停。
- [ ] 返回语言再前进时不重复欢迎动画。
- [ ] 通过 `matchMedia('(prefers-reduced-motion: reduce)')` 检测系统减少动态效果；匹配时停止轮播并缩短动画。
- [ ] 卡片页始终允许直接点击“下一步”。

### 7.5 任务 4：学习需求页

计划新增：

```text
src/features/onboarding/LearningNeedsPage.tsx
src/features/onboarding/firstRunCopy.ts
tests/onboarding/learningNeedsPage.test.ts
```

- [ ] 架构保留三个问题，当前只渲染绝热膨胀问题。
- [ ] 标题使用“您是否了解本软件中绝热膨胀法实验的操作逻辑？”。
- [ ] 辅助说明使用“请根据您是否能够使用本软件完成模式选择、仪器操作、数据记录与结果处理进行选择。”。
- [ ] 答案使用“是，我已了解”和“否，我需要引导”。
- [ ] 默认不选择，未选择时禁用“下一步”。
- [ ] 返回卡片后保留答案。
- [ ] 同意许可后，“已了解”直接设为完全解锁；“需要引导”立即激活教程。

### 7.6 任务 5：强制许可窗口

复用：

```text
src/features/workbench/workbenchBuildNoticeContent.ts
src/features/workbench/workbenchBuildNoticeContract.ts
src/features/workbench/WorkbenchBuildNoticeWindow.tsx
```

建议新增独立强制变体，不直接改变“关于”中的普通查看窗口：

```text
src/features/onboarding/MandatoryConsentDialog.tsx
src/features/onboarding/mandatoryConsentModel.ts
src/features/onboarding/workbenchLegalVersion.ts
tests/onboarding/mandatoryConsentModel.test.ts
tests/workbench/workbenchBuildNoticeContent.test.ts
```

- [ ] 主文档滚动容器和二级许可证材料复用现有内容。
- [ ] 15 秒与滚动到底两个条件独立。
- [ ] 页面隐藏或最小化时暂停累计。
- [ ] 内部二级材料不暂停、不重置。
- [ ] 固定底栏显示两个完成条件。
- [ ] 同意按钮在两个条件完成前不可点击。
- [ ] 主按钮固定为“我已阅读并知悉”，次要按钮固定为“不同意并退出”。
- [ ] 无窗口关闭按钮、无返回、无 Esc、无遮罩关闭。
- [ ] “不同意并退出”调用桌面安全退出或网页阻断。
- [ ] “关于”中的普通许可查看保持现有可关闭逻辑，不受强制条件影响。

### 7.7 任务 6：提交与许可版本变化

- [ ] 完整首次流程同意后，一次性提交首次完成状态、许可版本、语言、问题答案和学习里程碑。
- [ ] “需要引导”提交成功后立即执行第二版教程协调器。
- [ ] 用户拒绝或从系统标题栏退出时不写入草稿。
- [ ] 许可版本变化只显示强制许可窗口。
- [ ] 许可版本变化且教程未完成时，先同意许可再重建教程。
- [ ] 增加人工许可版本与内容修订检查。

### 7.8 任务 7：补齐设置入口

- [ ] 开放“重新观看产品介绍”，只播放欢迎和卡片。
- [ ] 正式模式运行时暂停，结束后恢复。
- [ ] 开放“重新选择学习需求”，只显示当前已开放问题。
- [ ] 从已了解改为需要引导时显示文件暂时锁定的后果确认。
- [ ] 保留第二版的直接重置入口。
- [ ] 教程进行期间三个入口全部禁用。

### 7.9 任务 8：内部测试入口

- [ ] 仅测试构建显示“模拟首次启动”。
- [ ] 不删除实验文件。
- [ ] 清除首次完成、许可确认和学习状态。
- [ ] 下次启动执行完整首次流程。
- [ ] 正式发行构建通过明确构建条件隐藏，不能只依靠 CSS。

### 7.10 第三小版本验收

- [ ] 全新用户完整走通语言、卡片、问题和许可。
- [ ] 不同意时桌面退出、网页阻断，所有草稿不保存。
- [ ] 熟悉用户进入完整工作台。
- [ ] 不熟悉用户立即进入教程。
- [ ] 正常重启不重复首次流程。
- [ ] 许可版本变化只重复许可。
- [ ] 保留数据卸载重装后维持原状态；删除数据后重新首次流程。
- [ ] 三种语言、减少动态效果和多标签页行为一致。

## 8. 旧用户与阶段升级策略

### 8.1 第一版升级

- 旧文件保存内容照常迁移。
- 当前正式模式归一化为探索基态。
- 原自由会话保存在自由模式会话中。

### 8.2 第二版升级

- 可以创建学习档案，但不把 `firstRunCompleted` 自动写成 `true`。
- 内部测试人员可从设置重置并体验教程。
- 首次入口协调器尚未启用时，没有学习记录的用户仅在运行时按“已解锁”处理，不把这个临时回退写入档案。
- 没有主动重置的用户可继续测试第一版功能；第三版启用入口协调器后，仍因缺少 `firstRunCompleted` 而进入正式首次流程。

### 8.3 第三版升级

- 体验档案没有完成首次流程记录的内部老用户也执行首次完整流程。
- 选择“已了解”后旧文件立即恢复可访问。
- 选择“需要引导”后旧文件安全关闭并锁定，直到教程完成。
- 不为规避内部测试用户重新体验流程而增加复杂的“老用户自动跳过”迁移。

## 9. 测试与验证矩阵

### 9.1 每个断点最低自动验证

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
git diff --check
```

若完整测试耗时过长，可在开发中先运行相关定向测试，但断点交付前必须运行完整测试。

### 9.2 固定预览

每次代码或用户可见修改后使用：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

端口被本项目现有预览占用时复用；被其他进程占用时先确认，不静默更换端口。

### 9.3 关键自动测试类别

- 入口状态机：首次、许可变化、教程恢复、普通工作台。
- 草稿提交：拒绝不保存，同意完整提交，失败不半完成。
- 学习状态：演示、引导、完全解锁和重复观看。
- 访问策略：菜单、快捷键、文件树、窗口、导出和系统打开入口。
- 模式边界：探索无记录，演示/引导清空，自由保存。
- 自由批次：取消组数、固定组数、当前组重置、自动下一组、最终计算。
- 旧文件迁移：旧模式、旧自由数据、历史结果和无法恢复的瞬时状态。
- 多窗口和多标签页：唯一教程所有者、窗口关闭失败和新窗口拒绝。
- 许可计时：可见累计、隐藏暂停、二级材料继续、滚动条件独立。
- 三语言和系统减少动态效果。

### 9.4 人工验收重点

- 信息是否按层次出现，没有在新建文件时提前询问组数。
- 首次流程是否保持现有工程软件风格。
- 模式按钮解锁动画是否自然，不像新增仪表盘。
- 教程提示是否清楚说明后果，但不暴露底层计时机制。
- 模式切换、返回、退出和软件重开是否没有意外数据丢失。
- 旧文件在教程前后是否保持原内容。

## 10. 每个小版本的交付流程

1. 只实施当前断点，不提前接入下一断点 UI。
2. 运行定向测试、TypeScript 检查和完整测试。
3. 启动固定预览 `5174`。
4. 由用户按本计划的断点验收清单体验。
5. 同一断点不符合预期时继续迭代，直到用户确认。
6. 用户确认后，再决定是否制作桌面安装版。
7. 如果需要安装版、GitHub 测试或发布，先询问版本号。
8. 发布桌面更新时按仓库规则生成并核对安装程序、`latest.yml` 和对应 `.blockmap`。

## 11. 预期文件影响范围

以下是计划范围，不代表必须同时修改每个文件；实施时以最小改动为准。

### 新增目录或文件

```text
src/features/onboarding/*
src/features/learning/*
src/domain/heatCapacity/heatCapacityExecutionAuthority.ts
src/features/heatCapacity/heatCapacityLearningProgress.ts
src/features/heatCapacity/HeatCapacityLearningMilestoneDialog.tsx
tests/onboarding/*
tests/learning/*
tests/heatCapacity/heatCapacityExploreMode.test.ts
tests/heatCapacity/heatCapacityLearningFlow.test.ts
```

### 主要修改文件

```text
src/app/App.tsx
src/domain/heatCapacity/heatCapacityModeTypes.ts
src/features/heatCapacity/heatCapacityModeControlModel.ts
src/features/heatCapacity/HeatCapacityBatchSetupDialog.tsx
src/features/workbench/workbenchState.ts
src/features/workbench/workbenchHeatCapacityModeSession.ts
src/features/workbench/useHeatCapacityModeSessionCoordinator.ts
src/features/workbench/workbenchGeneralSettings.ts
src/features/workbench/WorkbenchGeneralSettingsWindow.tsx
src/features/workbench/WorkbenchStudioPrototype.tsx
src/features/workbench/WorkbenchStudioPrototype.css
src/features/workbench/workbenchSession.ts
src/features/workbench/workbenchPersistenceSchema.ts
src/features/workbench/workbenchPersistenceMigration.ts
src/features/workbench/persistenceV3/contract.ts
src/features/workbench/persistenceV3/projection.ts
src/features/workbench/persistenceV3/legacyV2Adapter.ts
src/features/workbench/persistenceV3/heatCapacityValueDecoder.ts
electron/main.cjs
electron/preload.cjs
electron/workbenchWindowRegistry.cjs
electron/exitPersistenceCoordinator.cjs
electron.d.ts
```

### 明确不应修改

- 绝热膨胀自由模式核心物理模型，除非状态边界测试证明必须修改。
- 活塞振动物理模型和当前占位 UI。
- 现有用户实验文件和本任务外的文档。
- 安装器语言配置。
- 用户现有未跟踪输出目录。

## 12. 完成标准

三个断点分别获得用户验收，并且最终版本满足：

- 首次启动完整流程和许可版本变化流程可稳定恢复。
- 不熟悉用户无法绕过绝热膨胀教程。
- 熟悉用户不被强制重复教程。
- 新建普通文件不再提前询问组数。
- 探索、演示、引导和自由的数据权限边界明确。
- 自由模式退出、当前组重置、自动切组和最终计算符合确认规则。
- 多窗口、多标签页、卸载保留数据和旧文件兼容均通过测试。
- 正式产品卡片内容、全局 UI 教程和活塞振动教程可以在现有注册表和入口协调器上继续扩展，而不需要推翻本次结构。
