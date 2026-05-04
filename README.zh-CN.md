# Hard Sphere Workbench

[English README](./README.md)

Hard Sphere Workbench 是一个以桌面端为主的 React / Vite / Electron 工作台原型，用于硬球与理想气体模拟研究。当前版本启动后默认进入空工作区，需要用户主动新建实验；创建后的工作台文件、窗口布局、主题偏好和界面语言会写入本地持久化存储。

## 当前重点

这个分支主要完善 Workbench 桌面体验：

- 空启动流程：首次打开没有默认实验，用户通过 New Study / 新建研究主动创建标准模拟或理想气体实验。
- 桌面导出桥：支持报告和图片导出，导出内容内部文字跟随当前语言，科学符号和文件名保持原样。
- Settings -> General 设置窗口：集中管理主题、语言、快捷键说明和默认窗口布局。
- 主题偏好：支持随系统、亮模式、暗模式，并持久化保存。
- 语言偏好：支持简体中文、繁體中文、English，并驱动 Workbench UI 文案。
- 3D 预览 / 实时数据区域支持横向拖拽调整宽度，当前文件和默认布局都会记忆该比例。
- Results 窗口布局记忆同时支持标准实验和理想气体实验。

## 本地开发

先安装依赖：

```powershell
npm.cmd install
```

启动桌面端预览，这是当前 Workbench 验证的主要入口：

```powershell
npm.cmd run desktop:dev
```

如果只需要浏览器里的 Vite 预览，也可以使用固定端口命令：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## 验证

Workbench 的主要回归检查由脚本测试和生产构建组成：

```powershell
node scripts\workbenchLanguageMode.test.ts
node scripts\workbenchSettingsGeneral.test.ts
node scripts\workbenchLightTheme.test.ts
node scripts\workbenchLayoutExport.test.ts
node scripts\workbenchEmptySession.test.ts
node scripts\workbenchClickOutsideDismiss.test.ts
npm.cmd run build
```

## 项目结构

- `components/WorkbenchStudioPrototype.tsx`：Workbench 主界面、状态、设置窗口、多语言文案、布局拖拽和桌面导出桥调用。
- `components/WorkbenchStudioPrototype.css`：Workbench 深浅主题样式和响应式布局规则。
- `components/workbenchState.ts`：Workbench 文件状态、会话状态和默认布局辅助逻辑。
- `components/workbenchSession.ts`：Workbench 持久化会话的编码与解码。
- `components/workbenchResults.ts`：报告和图片导出的 payload / figure specs 生成逻辑。
- `scripts/workbench*.test.ts`：Workbench 相关的静态与行为回归检查。

## 说明

应用不会翻译科学变量、关系缩写、单位、生成文件名或底层导出器原始错误。语言偏好只影响 Workbench 面向用户的菜单、面板、日志、设置窗口、报告和图片内部文字。
