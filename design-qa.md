# Design QA — 提示体系阶段 1

## 范围

- 目标：将已选定的 B 方案正式应用到通用确认窗口，并核对“关闭运行中的实验文件”真实业务状态。
- 参考状态：B 方案 / 警告型确认。
- 实现状态：标准模拟运行中 / 关闭文件确认。

## 对照材料

- 参考全屏：`docs/design-qa/prompt-phase1/source-b-warning-full.png`
- 参考窗口：`docs/design-qa/prompt-phase1/source-b-warning-dialog.png`
- 实现全屏：`docs/design-qa/prompt-phase1/implementation-close-running-final-full.png`
- 实现窗口：`docs/design-qa/prompt-phase1/implementation-close-running-final-dialog.png`
- 最终并排对照（左：参考；右：实现）：`docs/design-qa/prompt-phase1/comparison-dialog-final.png`
- 首轮对照留档：`docs/design-qa/prompt-phase1/comparison-dialog-initial.png`

## 捕获条件

- 参考与实现使用相同视口：1440 × 810 CSS px。
- 设备像素比：1。
- 最终中文警告窗口尺寸：参考 460 × 172 px，实现 460 × 172 px。
- 最终实现截图使用亮色主题、简体中文和真实运行中文件名。

## 视觉核对

- 结构一致：3 px 状态色条、48 px 标题栏、图标、眉题、标题、正文、后果说明、双操作按钮。
- 几何一致：宽度、高度、圆角、标题栏高度、正文与底栏分区均与 B 方案对齐。
- 色彩与层级一致：警告琥珀色、哑光面板、实体按钮、细边框与低扩散阴影符合选定方案。
- 文本适配：简体中文与繁体中文保持 460 × 172 px；英文因正文自然换行为 460 × 190 px，无横向溢出或裁切。
- 首轮发现 P2：正式实现缺少参考方案标题栏关闭按钮；第二轮已补齐并重新对照通过。

## 状态与交互核对

- 已检查真实入口：切换教学模式、重置自由模式未完成组、关闭运行中的实验文件。
- 初始焦点落在安全取消操作。
- `Tab` / `Shift+Tab` 焦点保持在窗口内；实测序列覆盖取消、确认、标题栏关闭。
- `Escape`、遮罩单击、标题栏关闭均按取消处理，并把焦点返回触发控件。
- 双击触发只保留一个确认窗口；第二次点击不会立即落到新遮罩并取消窗口。
- 遮罩阻止背景控件接收指针操作。
- 确认关闭运行中文件后，运行停止、打开标签关闭；控制台确认文件保留在本地缓存中。
- 无效实验流程中的“重置本组”继续直达原重置动作，不叠加第二层确认。

## 主题、语言与可访问性

- 手动检查：简体中文 / 亮色、English / 暗色、繁體中文 / 亮色。
- 三种语言均无横向溢出，安全按钮均获得默认焦点。
- `role="alertdialog"`、`aria-modal`、标题与描述关联完整。
- 浏览器控制台：0 error，0 warning。
- 减少动态效果偏好已由样式规则覆盖。

## 自动验证

- TypeScript 无输出类型检查通过。
- 220 个测试文件全部通过。
- 生产构建通过，且正式产物不含开发专用方案预览标记。
- 原生浏览器 `confirm` / `alert` / `prompt` 防回归扫描通过；桌面系统安全窗口保留。

final result: passed
