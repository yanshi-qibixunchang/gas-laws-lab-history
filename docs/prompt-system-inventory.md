# 软件提示体系盘点与最终归属

盘点日期：2026-07-22  
盘点范围：`src/`、`electron/` 与相关测试；以当前未提交工作区为准。  
目的：保留阶段零防遗漏基线，并记录阶段一、二窗口层由 B 方案切换为 A 方案后的正式归属。本文件不授权修改实验业务逻辑。

## 最终结论摘要

- 3 处浏览器原生 `window.confirm` 均已迁移到共享警告确认流程；业务代码没有直接调用 `window.alert` 或 `window.prompt`。
- Electron 主进程的 2 处退出持久化 `showMessageBox` 以及 Windows 保存文件/选择文件夹窗口均为系统安全边界，继续保留。
- 确认、普通/强制告知、大型任务外壳、全局 Toast、持续状态条和内部 Tooltip 已形成正式公共组件；设置、关于、更新、构建说明、参数、批次和计算窗口保留各自业务内容。
- 扫描输入、关于操作结果和工作区保存状态已进入同一全局 Toast 堆栈；保存状态以稳定 ID 更新，避免重复叠加和相互遮挡。
- 压强超限继续作为 3D 视图区内持续警报；教学遮罩、预热、等待和强引导继续作为过程反馈，只共享正式视觉变量。
- 活跃入口的浏览器原生 Tooltip 已迁移；动态普通 DOM `title` 由全局 Provider 接管。`iframe title`、组件内容型 `title` 和 `document.title` 继续保留其语义。
- 阶段零 `promptStylePreview=1` 临时入口及专用文件、测试已删除；绝热膨胀法的开发态相机输出工具独立保留。
- 2026-07-23 起，阶段一确认窗口和阶段二告知/任务窗口统一采用 A 方案；阶段三 Toast、持续警报和 Tooltip 保持既有实现与作用域。

## 入口盘点表

| 触发位置 | 提示内容 | 当前呈现方式 | 阻断 | 需用户决定 | 作用范围 | 系统安全兜底 | 后续统一归属 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `WorkbenchStudioPrototype.tsx:9215` `resetHeatCapacityFreeRun` | 重置自由模式当前未完成组，保留已完成组和组数 | 浏览器原生 `window.confirm` | 是，同步阻断 | 是 | 当前热容比自由模式 | 否 | 警告确认窗口 |
| `WorkbenchStudioPrototype.tsx:11693` `confirmHeatCapacityTeachingProgressReset` | 切换模式并重置当前教学进度 | 浏览器原生 `window.confirm` | 是，同步阻断 | 是 | 当前热容比教学模式 | 否 | 警告确认窗口 |
| `WorkbenchStudioPrototype.tsx:16025` `requestCloseWorkbenchFile` | 关闭正在运行的实验文件 | 浏览器原生 `window.confirm` | 是，同步阻断 | 是 | 当前工作台文件 | 否 | 警告确认窗口；正式文案需明确文件仍留在本地缓存 |
| `electron/exitPersistenceCoordinator.cjs:101` | 工作区保存失败：重试、取消关闭、放弃保存后关闭 | Electron `dialog.showMessageBox` | 是 | 是 | 桌面窗口退出 | 是 | 保留原生最终安全兜底 |
| `electron/exitPersistenceCoordinator.cjs:157` | 关闭前的持久窗口记录更新失败 | Electron `dialog.showMessageBox` | 是 | 仅确认 | 桌面窗口退出 | 是 | 保留原生最终安全兜底 |
| `electron/main.cjs:995` | 导出报告 PDF 的目标文件 | Windows `showSaveDialog` | 是 | 是 | 桌面导出流程 | 是，系统文件选择 | 保留 Windows 原生保存窗口 |
| `electron/main.cjs:1080` | 选择导出根文件夹 | Windows `showOpenDialog` | 是 | 是 | 桌面导出流程 | 是，系统目录选择 | 保留 Windows 原生文件夹窗口 |
| `WorkbenchGeneralSettingsWindow.tsx` | 主题、语言、性能、音效和快捷键 | 已接入 `PromptDialogShell`，保留设置页内部布局 | 是 | 配置任务 | 全软件设置 | 否 | 阶段二已统一大型任务窗口公共外壳 |
| `WorkbenchAboutWindow.tsx` | 版本、更新检查、导出环境和缓存摘要 | 已接入 `PromptDialogShell`；局部结果 Toast 保留待阶段三 | 是 | 部分操作 | 全软件关于页 | 否 | 阶段二已统一外壳；局部结果后续改为统一 Toast |
| `WorkbenchBuildNoticeWindow.tsx` | 构建说明、许可材料和本地文件预览 | 已接入普通告知语义的 `PromptDialogShell` | 是 | 否 | 全软件帮助/法律资料 | 否 | 阶段二已统一普通告知 / 大型任务窗口公共外壳 |
| `WorkbenchUpdateDialog.tsx` | 更新可用、下载、失败、安装与发行说明 | 已接入 `PromptDialogShell`；关闭请求仍由原更新状态处理 | 是 | 是 | 桌面更新任务 | 否 | 阶段二已统一普通告知 + 大型任务窗口公共外壳 |
| `HeatCapacityBatchSetupDialog.tsx` | 选择自由模式实验组数 | 已接入 `PromptDialogShell`；保留 Esc 取消、遮罩不关闭 | 是 | 是 | 热容比自由模式启动 | 否 | 阶段二已统一大型任务窗口公共外壳 |
| `HeatCapacityCalculationWindow.tsx` | 分组/汇总计算、步骤校验和完成退出 | 已接入 `PromptDialogShell`；计算进行中仍不可关闭 | 是 | 是 | 热容比计算任务 | 否 | 阶段二已统一外壳；强制任务状态仍由原状态机决定 |
| `WorkbenchStudioPrototype.tsx` `renderHeatCapacityAdvancedParameterDialog` | 高级参数编辑 | 已接入 `PromptDialogShell`；风险确认使用独立高层外壳 | 是 | 是 | 热容比自由模式参数 | 否 | 阶段二已统一大型任务窗口公共外壳 |
| `WorkbenchHeatCapacityParameterDialogs.tsx` `RestoreDefaultDialog` | 恢复默认参数 | 已接入共享警告确认外壳；遮罩和 Esc 取消 | 是 | 是 | 热容比参数 | 否 | 阶段二复用公共外壳，确认语义保持不变 |
| `WorkbenchHeatCapacityParameterDialogs.tsx` `IdealProfileIntroDialog` | 切换理想参数方案前说明 | 已接入共享警告确认外壳；遮罩和 Esc 取消 | 是 | 是 | 热容比参数 | 否 | 阶段二复用公共外壳，确认语义保持不变 |
| `WorkbenchHeatCapacityParameterDialogs.tsx` `AdvancedRiskDialog` | 首次进入高级参数的风险确认 | 已接入顶层警告确认外壳并参与统一焦点栈 | 是 | 是 | 高级参数窗口内部 | 否 | 阶段二已消除嵌套窗口的独立外壳 |
| `HeatCapacityInvalidAttemptDialog.tsx` | 本组实验流程失效：重置本组或继续自由操作 | 3D 视图区中的 `alertdialog` | 仅阻断当前仪器交互 | 是 | 当前热容比实验组 | 否 | 视图区作用域的警告确认；“重置本组”直接执行，不再二次确认 |
| `WorkbenchStudioPrototype.tsx:8855` `renderHeatCapacityGuideLessonOverlay` | 教学课程卡片、继续和关闭 | 教学遮罩 `dialog` | 仅教学流程 | 教学推进 | 热容比教学 | 否 | 教学/过程提示，保留独立形态 |
| `HeatCapacityInstrumentScene.tsx:4829` | 3D Ultra 场景错误与重试 | 视图区全覆盖 `alertdialog`，当前样式内联 | 仅阻断 3D 视图区 | 是 | 3D 视图区 | 否 | 视图区错误，保持作用域；后续共享状态色和窗口语义 |
| `App.tsx` | IndexedDB 安全模式与重试 | 共享底部持续状态条；错误详情使用内部 Tooltip | 否 | 可重试 | 全工作台 | 否 | 已统一为 `PromptPersistentBanner` |
| `WorkbenchStudioPrototype.tsx` | 扫描输入错误、参数锁定等 | 共享右上 Toast 堆栈中的危险消息 | 否 | 否 | 全工作台 | 否 | 已统一为可关闭短时 Toast |
| `WorkbenchStudioPrototype.tsx` | 工作区保存重试或失败 | 同一共享堆栈中的稳定持续项，失败时 `role=alert` | 否 | 否 | 全工作台 | 否 | 已统一为警告/危险 Toast；同一故障不重复叠加 |
| `WorkbenchAboutWindow.tsx` | 关于窗口检查结果 | 共享右上 Toast 堆栈 | 否 | 否 | 全工作台 | 否 | 已按结果分类为成功/信息/警告/危险 |
| `heatCapacityToastController.ts` + `WorkbenchStudioPrototype.tsx` | 信息、成功、警告、危险以及压强相关短时消息 | 单个当前项 + 单个待处理项，视图区内显示 | 否 | 否 | 热容比 3D 视图区 | 否 | 保留教学/过程作用域，共享四级色彩与正式时长变量 |
| `WorkbenchStudioPrototype.tsx` | 压强超过安全阈值 | 3D 视图区紧凑持续 `role=alert` | 否 | 否 | 当前 3D 视图区 | 否 | 保持持续警报；不转为弹窗或全局 Toast |
| `HeatCapacityPreheatOverlay.tsx` | 预热进度、暂停状态 | 视图区过程遮罩 + `progressbar` | 仅过程阶段 | 否 | 热容比 3D 视图区 | 否 | 教学/过程反馈，保留独立形态 |
| `HeatCapacityWaitController.tsx` + `.studio-heat-wait-overlay` | 稳定等待计时与速度控制 | 视图区顶部过程控件 | 局部流程约束 | 是，速度可选 | 热容比 3D 视图区 | 否 | 教学/过程反馈，保留独立形态 |
| `.studio-heat-guide-strong-mask`、`.studio-heat-guide-step-*` | 教学遮罩、控件高亮、强提醒和步骤信息 | 视图区遮罩、侧栏和高亮 | 仅教学流程 | 依步骤而定 | 热容比教学 | 否 | 教学/过程反馈，只共享视觉变量 |
| `HeatCapacityBatchProgress.tsx` `restartPending` | 重新开始实验批次 | 菜单内行内二次确认 | 否 | 是，第二次点击 | 当前实验批次 | 否 | 保留行内二次确认 |
| `WorkbenchStudioPrototype.tsx:9029` `pendingRemoveHeatCapacityTrialRecord` | 删除热容比实验记录 | 行内二次确认 | 否 | 是，第二次点击 | 数据/结果面板 | 否 | 保留行内二次确认 |
| `WorkbenchStudioPrototype.tsx:15681` `pendingRemovePointId` | 删除理想气体数据点 | 表格行内二次确认 | 否 | 是，第二次点击 | 理想气体结果表 | 否 | 保留行内二次确认 |
| `WorkbenchStudioPrototype.tsx:15755` `pendingClearRelationKey` | 清空关系数据 | 结果窗口行内二次确认 | 否 | 是，第二次点击 | 理想气体结果窗口 | 否 | 保留行内二次确认 |
| `WorkbenchStudioPrototype.tsx:16131` `pendingDeleteFileId` | 从当前工作台会话删除实验文件 | 文件菜单行内二次确认 | 否 | 是，第二次点击 | 文件树 | 否 | 保留行内二次确认 |
| `WorkbenchStudioPrototype.tsx:6500` 参数帮助 | 参数说明 | Portal 内部 Tooltip；支持悬停、焦点、边缘定位和点击固定 | 否 | 否 | 参数侧栏 | 否 | 统一 Tooltip；可复用定位与外部点击经验，需补延迟/Esc/通用 API |
| `WorkbenchStudioPrototype.tsx:17023` | 采样精度说明 | 内部 `role=tooltip` | 否 | 否 | 理想气体采样控件 | 否 | 统一 Tooltip |
| `HeatCapacityInstrumentScene.tsx:4889`、`:4937` | 3D 控件悬停与硬球显示说明 | 视图区自定义 Tooltip | 否 | 否 | 3D 视图区 | 否 | 统一 Tooltip 视觉变量；保留视图区定位能力 |
| `SimulationCanvas.tsx` | 旋转/平移模式与重置相机 | 内部 Tooltip | 否 | 否 | 标准模拟 3D 视图 | 否 | 已迁移并保留控件无障碍名称 |
| `HeatCapacityCalculationWindow.tsx` | 未开放分组和操作提示 | 内部 Tooltip | 否 | 否 | 计算窗口 | 否 | 已迁移 |
| `WorkbenchStudioPrototype.tsx` 多处提示 | 参数锁定、关系说明、模式控制、图表数据点、运行/停止、面板、文件和窗口控制 | 全局委托式内部 Tooltip | 否 | 否 | 工作台多区域 | 否 | 已迁移；支持悬停、聚焦、延迟、Esc 和边缘避让 |
| `WorkbenchBuildNoticeWindow.tsx:144` iframe `title` | 内嵌法律材料的可访问名称 | iframe 语义名称，不是悬停提示 | 否 | 否 | 构建说明 | 否 | 有意保留，不纳入 Tooltip 替换 |
| `PistonOscillationInstrumentScene.tsx` | 活塞振动场景加载错误 | 视图区内 `alert` | 否 | 否 | 活塞振动视图 | 否 | 视图区错误；保持局部作用域 |

## 原生 `title` 说明

最终静态检索中的 `title=` 命中仅包含以下语义类别：

- `document.title` 赋值：页面标题，不是 Tooltip；
- `PromptDialogShell`、`DocumentDisclosure` 等 React 组件的内容属性：不是浏览器原生 Tooltip；
- `iframe title`：无障碍名称，Provider 明确跳过，必须保留；
- 活跃普通 DOM 的悬停 `title` 已改为 `data-prompt-tooltip`；Provider 同时观察后续动态挂载的普通 DOM `title`，防止回退到宿主提示；

## 桌面端与浏览器端差异

| 场景 | 桌面端 | 浏览器开发预览 | 处理边界 |
| --- | --- | --- | --- |
| 退出前保存失败 | Electron 原生 `showMessageBox` | 无 Electron 退出协调器 | 保留桌面系统安全兜底 |
| 导出报告目标 | Windows 保存文件窗口 | 桌面桥接不可用，返回提示/错误 | 保留系统文件窗口，不模拟为内部窗口 |
| 选择导出根目录 | Windows 文件夹窗口 | 桌面桥接不可用 | 保留系统目录窗口 |
| 自动更新 | Electron updater + 内部更新窗口 | 显示不可用或手动下载状态 | 统一内部任务窗口外壳，不改更新业务 |
| 原生 `window.confirm` | 已由共享内部警告确认替代 | 已由共享内部警告确认替代 | 已完成，不再显示“127.0.0.1 显示”类宿主框 |

## 阶段零复用判断（历史记录）

- 可直接复用的视觉基准：`WorkbenchStudioPrototype.css` 中的主题色、状态色、字体层级、按钮颜色和现有设置窗口密度。
- 可借鉴但暂不直接复用的实现：热容比 Toast 优先级、参数 Tooltip 的 Portal/边缘定位、批次行内二次确认的外部点击与 Esc 规则、批次/计算窗口的焦点循环。
- 不能作为全局公共组件直接复用：`WorkbenchHeatCapacityParameterDialogs`、`.studio-settings-*` 外壳和 `renderHeatCapacityTooltip*` 均带有业务类名、状态或结构耦合。正式公共组件应在用户选定阶段零样式后建立，避免现在形成第二套生产系统。
- 阶段零曾使用开发参数启用隔离预览；正式组件完成后，该参数、预览源码和专用测试已按计划清理。
