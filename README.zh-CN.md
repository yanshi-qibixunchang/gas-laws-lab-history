# Hard Sphere Lab v3.5.1

[English README](./README.md)

Hard Sphere Lab 是面向 Windows 桌面端的工程软件，用于硬球分子动力学模拟和理想气体关系验证。当前正式路线是 Electron 桌面应用，不是旧的纯浏览器预览流程，也不是已经冻结的 Android/APK 资料。

GitHub 默认分支 `main` 是当前桌面打包版本的唯一主入口。除非维护者明确要求测试其他分支，否则 clone、查看 README、打安装包都应从 `main` 开始。

## 当前产品定位

- Windows 桌面工程工作台，技术栈为 React、Vite、Electron 和本地 Python 导出器。
- 支持标准硬球模拟，以及理想气体 `P-T`、`P-V`、`P-N` 三类实验模板。
- 支持本地高质量导出 PDF 报告、图像和 CSV 数据。
- 导出优先使用用户本机 Python；不可用时使用 PyInstaller 打包的内置导出器。
- 支持简体中文、繁体中文和英文界面。
- Android/APK 相关内容只保留在 `legacy-apk/` 作为冻结归档，不作为当前开发或发布路径。

## 安装与打包

先安装依赖：

```powershell
npm.cmd install
```

制作桌面安装包前，先构建内置导出器：

```powershell
npm.cmd run exporter:bundle
```

生成正式 Windows 安装包：

```powershell
npm.cmd run desktop:installer
```

生成免安装 portable 版本：

```powershell
npm.cmd run desktop:portable
```

生成文件会放在 `release/` 目录。面向普通用户分发时，应使用：

```text
release/Hard Sphere Lab Setup 3.5.1.exe
```

## release 目录文件说明

- `Hard Sphere Lab Setup 3.5.1.exe`：正式 Windows 安装包，用于完整的安装、使用、卸载流程。
- `Hard Sphere Lab 3.5.1.exe`：免安装 portable 版，双击即可运行；运行正式安装包前请先关闭它。
- `win-unpacked/`：未压缩程序目录，供开发者检查打包内容。
- `Hard Sphere Lab Setup 3.5.1.exe.blockmap`：差分更新元数据，不是安装包。
- `latest.yml`：自动更新元数据，不是安装包。
- `builder-debug.yml`：electron-builder 本地调试输出。

只有带 `Setup` 的 exe 是正式安装包。

## 桌面开发预览

启动本地桌面预览：

```powershell
npm.cmd run desktop:dev
```

浏览器 Vite 命令只作为底层 UI 调试入口保留，不是当前桌面版本的主要验收方式：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## 主要功能

- 文件式工作台，支持标准模拟文件和理想气体实验文件。
- 交互式 3D 粒子预览和实时图表面板。
- 右侧当前参数栏支持编辑保存后立即刷新运行时。
- Results 窗口支持摘要、数据表、图像、点数据和验证视图。
- 桌面桥接导出报告、图像和 CSV。
- 默认导出归档目录为 `Documents\Hard Sphere Lab Exports\<实验名>_<YYYYMMDD-HHmmss>\`。
- 本地 PDF/PNG/CSV 导出优先使用系统 Python，并以内置导出器作为 fallback。
- 工作台会话、布局默认值、主题和语言设置会本地持久化。

## 验证命令

```powershell
node scripts\workbenchRemoveApplyAction.test.ts
node scripts\workbenchStartAutoApplyScanControls.test.ts
node scripts\workbenchRunningParamsLock.test.ts
node scripts\workbenchExportButtonReadiness.test.ts
node scripts\workbenchLanguageMode.test.ts
npm.cmd run build
```

发布 Windows 安装包前，还应运行：

```powershell
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

然后把 `release/Hard Sphere Lab Setup 3.5.1.exe` 安装到干净测试目录，启动应用，验证本地导出，再通过 Windows 应用设置或安装目录中的 `Uninstall Hard Sphere Lab.exe` 卸载。

## 仓库结构

- `components/`：工作台 UI、画布、结果窗口、导出 payload 和会话辅助逻辑。
- `electron/`：桌面主进程和 preload 桥接层，用于本地导出。
- `tools/exporter/`：Python PDF、图像和 CSV 导出器。
- `scripts/`：定向回归检查和导出器打包脚本。
- `resources/exporter/`：本地 PyInstaller fallback exe 输出目录，产物被忽略。
- `legacy-apk/`：冻结的移动端打包资料，不作为当前开发路径。

安装包、构建输出、导出样例、日志和本地安装测试目录均不会提交到 Git。
