# Hard Sphere Lab v4.0.1

[English README](./README.md)

Hard Sphere Lab 是面向 Windows 桌面端的工程软件，用于硬球分子动力学模拟、理想气体关系验证，以及 FD-NCD-C 空气比热容比实验仿真。当前正式路线是 Electron 桌面应用。

## 当前产品定位

- Windows 桌面工程工作台，技术栈为 React、Vite、Electron 和本地 Python 导出器。
- 支持标准硬球模拟、理想气体 `P-T`、`P-V`、`P-N` 实验模板。
- 支持 FD-NCD-C 空气比热容比实验流程。
- 支持本地 PDF、图像和 CSV 导出。
- 支持简体中文、繁体中文和英文界面。
- 旧 Android/APK 资料保留在本地 `legacy-apk/`，不作为当前开发或发布路径，也不纳入 Git 跟踪。

## 空气比热容比 / Blender 模型规则

FD-NCD-C 空气比热容比实验的仪器控制骨架在 v4.0.1 固化。后续主要调整实验流程逻辑、教学提示、阈值和计算方法，不应随意改变仪器控制骨架或模型接入接口。

3D/Blender 模型只作为状态机驱动的可视化与交互载体，不是 `P0`、`P1`、`P2`、`U_p`、`U_T` 或 `gamma` 的数据源。这些数值必须来自实验状态机和计算层。

独立 Blender 建模人员应遵循：[`docs/instrument-modeling/reference/Blender模型接入规则-v4.0.1.md`](./docs/instrument-modeling/reference/Blender%E6%A8%A1%E5%9E%8B%E6%8E%A5%E5%85%A5%E8%A7%84%E5%88%99-v4.0.1.md)。

## 安装与打包

安装依赖：

```powershell
npm.cmd install
```

制作桌面安装包前，先构建内置导出器：

```powershell
npm.cmd run exporter:bundle
```

生成 Windows 安装包：

```powershell
npm.cmd run desktop:installer
```

生成 portable 版本：

```powershell
npm.cmd run desktop:portable
```

生成文件位于 `release/`。正式分发时使用：

```text
release/Hard Sphere Lab Setup 4.0.1.exe
```

## 桌面开发预览

桌面预览：

```powershell
npm.cmd run desktop:dev
```

浏览器调试预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## 验证命令

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run build
```

发布 Windows 安装包前还应运行：

```powershell
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

## 仓库结构

- `src/app/`：React 入口和应用外壳。
- `src/components/`：跨功能复用的 UI 组件。
- `src/features/`：工作台、理想气体、空气比热容比等功能界面。
- `src/domain/`：硬球模拟、理想气体和热容比计算模型。
- `src/shared/`：共享类型和小工具。
- `src/i18n/`：界面多语言文案。
- `tests/`：按功能分组的回归测试。
- `scripts/`：维护脚本，例如测试发现和导出器打包。
- `electron/`：桌面主进程和 preload 桥接层。
- `tools/exporter/`：Python PDF、图像和 CSV 导出器源码。
- `docs/theory/`：理论说明和推导文档。
- `docs/instrument-modeling/`：FD-NCD-C 建模参考资料和 Blender 模型接入规则。
- `resources/exporter/`：本地 PyInstaller fallback exe 输出目录，产物被忽略。
- `legacy-apk/`：冻结的移动端打包资料，本地保留但不纳入 Git。

安装包、构建输出、导出样例、日志、本地安装测试目录和本地环境目录均不提交到 Git。
