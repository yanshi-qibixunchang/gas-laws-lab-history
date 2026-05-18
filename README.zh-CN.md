# Hard Sphere Lab v4.0.1

[English README](./README.md)

Hard Sphere Lab 是面向 Windows 桌面端的工程软件，用于硬球分子动力学模拟、理想气体关系验证，以及 FD-NCD-C 空气比热容比实验仿真。当前正式路线是 Electron 桌面应用，不是旧的纯浏览器预览流程，也不是已经冻结的 Android/APK 资料。

GitHub 默认分支 `main` 是通用桌面打包路线的主入口。本次固化空气比热容比模型骨架的 `v4.0.1` 版本发布自 `codex/heat-capacity-ui-baseline` 分支。

## 当前产品定位

- Windows 桌面工程工作台，技术栈为 React、Vite、Electron 和本地 Python 导出器。
- 支持标准硬球模拟，以及理想气体 `P-T`、`P-V`、`P-N` 三类实验模板。
- 支持 FD-NCD-C 空气比热容比实验流程，并在 v4.0.1 固化 3D 仪器控件骨架，便于后续 Blender 模型替换。
- 支持本地高质量导出 PDF 报告、图像和 CSV 数据。
- 导出优先使用用户本机 Python；不可用时使用 PyInstaller 打包的内置导出器。
- 支持简体中文、繁体中文和英文界面。
- Android/APK 相关内容只保留在 `legacy-apk/` 作为冻结归档，不作为当前开发或发布路径。

## 空气比热容比 / Blender 模型接入规则

FD-NCD-C 空气比热容比实验的仪器控件骨架在 v4.0.1 固化。后续开发主要调整实验过程逻辑、教学提示、阈值和计算方法，不再随意调整仪器控件、交互骨架或模型接入接口。

3D/Blender 模型只作为状态机驱动的可视化与交互载体，不是 `P0`、`P1`、`P2`、`U_p`、`U_T` 或 `gamma` 的数据源。这些数值必须来自实验状态机和计算层。

独立 Blender 建模人员必须遵循稳定规则文档：[`仪器建模/Blender模型接入规则-v4.0.1.md`](./%E4%BB%AA%E5%99%A8%E5%BB%BA%E6%A8%A1/Blender%E6%A8%A1%E5%9E%8B%E6%8E%A5%E5%85%A5%E8%A7%84%E5%88%99-v4.0.1.md)。

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
release/Hard Sphere Lab Setup 4.0.1.exe
```

## release 目录文件说明

- `Hard Sphere Lab Setup 4.0.1.exe`：正式 Windows 安装包，用于完整的安装、使用和卸载流程。
- `Hard Sphere Lab 4.0.1.exe`：免安装 portable 版，双击即可运行；运行正式安装包前请先关闭它。
- `win-unpacked/`：未压缩程序目录，供开发者检查打包内容。
- `Hard Sphere Lab Setup 4.0.1.exe.blockmap`：差分更新元数据，不是安装包。
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

- 文件式工作台，支持标准模拟文件、理想气体实验文件和空气比热容比实验。
- 交互式 3D 预览、实时仪表读数，以及由状态机驱动的空气比热容比实验控件。
- 右侧当前参数栏支持编辑保存后立即刷新运行时。
- Results 窗口支持摘要、数据表、图像、点数据和验证视图。
- 桌面桥接导出报告、图像和 CSV。
- 默认导出归档目录为 `Documents\Hard Sphere Lab Exports\<实验名>_<YYYYMMDD-HHmmss>\`。
- 本地 PDF/PNG/CSV 导出优先使用系统 Python，并以内置导出器作为 fallback。
- 工作台会话、布局默认值、主题和语言设置会本地持久化。

## 验证命令

```powershell
node scripts\heatCapacityTrialModel.test.ts
node scripts\workbenchHeatCapacityInstrumentUi.test.ts
node scripts\workbenchHeatCapacityInstrument.test.ts
npm.cmd exec tsc -- --noEmit
```

发布 Windows 安装包前，还应运行：

```powershell
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

然后把 `release/Hard Sphere Lab Setup 4.0.1.exe` 安装到干净测试目录，启动应用，验证本地导出，再通过 Windows 应用设置或安装目录中的 `Uninstall Hard Sphere Lab.exe` 卸载。

## 仓库结构

- `components/`：工作台 UI、画布、结果窗口、导出 payload 和会话辅助逻辑。
- `electron/`：桌面主进程和 preload 桥接层，用于本地导出。
- `tools/exporter/`：Python PDF、图像和 CSV 导出器。
- `scripts/`：定向回归检查和导出器打包脚本。
- `仪器建模/`：FD-NCD-C 空气比热容比建模参考资料和 Blender 模型接入规则。
- `resources/exporter/`：本地 PyInstaller fallback exe 输出目录，产物被忽略。
- `legacy-apk/`：冻结的移动端打包资料，不作为当前开发路径。

安装包、构建输出、导出样例、日志和本地安装测试目录均不会提交到 Git。
