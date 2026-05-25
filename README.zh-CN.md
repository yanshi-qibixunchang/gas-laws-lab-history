# Hard Sphere Lab v4.1.5

[English README](./README.md)

Hard Sphere Lab 是面向 Windows 桌面端的工程软件，用于硬球分子动力学模拟、理想气体关系验证，以及 FD-NCD-C 空气比热容比实验。当前正式发布路线是 Electron 桌面程序，并内置本地导出器，用于生成 PDF 报告、图像和 CSV 数据。

## V4.1.5 更新

- 测试修复后续版本更新说明的远端结构化读取与语言匹配。
- 确保更新弹窗按当前界面语言显示，不再同时展示所有语言的更新说明。
- 移除更新弹窗版本信息区的蓝色强调边和强调阴影，保持更简约的工程软件风格。
- 保留旧版客户端和异常场景可读的纯文本更新说明兜底。
- 将应用版本、包元数据、发布元数据和文档统一更新到 `4.1.5`。

## V4.1.4 更新

- 新增热容自由实验按实验组生效的参数调整体系，包含可编辑参数、历史结果快照隔离和自由模式持久化。
- 完善热容高级参数分组、三类实验参数行样式、亮暗模式适配和工程软件风格的界面细节。
- 改进热容自由模式物理链路，覆盖热交换、泄漏、传感响应、压力安全阈值、过程回顾和参数影响检查。
- 完善桌面自动更新信息，支持结构化更新说明、网络波动自动重试，以及自动更新失败后的直达安装包下载入口。
- 将应用版本、包元数据、发布元数据和文档统一更新到 `4.1.4`。

## 产品范围

- 标准硬球模拟：3D 预览、实时图表、最终结果分页。
- 理想气体关系研究：`P-T`、`P-V`、`P-N` 数据采集、关系验证和历史内容解锁。
- FD-NCD-C 空气比热容比实验：演示模式、引导模式、自由模式。
- 桌面端导出：PDF 报告、PNG/PDF 图像、CSV 数据。
- 支持简体中文、繁体中文和英文界面。
- 旧 Android/APK 资料只作为冻结归档，不属于当前活跃发布路线。

## 仓库结构

- `src/app/`：React 入口和旧应用外壳。
- `src/components/`：跨功能复用的可视化组件。
- `src/features/`：工作台、理想气体、空气比热容比等功能界面。
- `src/domain/`：硬球模拟、理想气体和比热容比计算模型。
- `src/shared/`：共享类型和工具定义。
- `src/i18n/`：应用级多语言文案。
- `tests/`：按功能划分的回归测试。
- `scripts/`：维护脚本，包括测试发现和导出器打包。
- `electron/`：Electron 主进程和 preload 桥接层，用于桌面导出。
- `tools/exporter/`：Python 导出器源码和样例载荷。
- `resources/exporter/`：PyInstaller 生成的内置导出器目录，被 Git 忽略，打包前重新生成。
- `resources/app-icon/`：桌面程序图标。
- `docs/theory/`：理论说明和推导材料。
- `docs/instrument-modeling/`：FD-NCD-C 建模资料和 Blender 接入规则。
- `legacy-apk/`：冻结的移动端资料，不作为活跃开发内容跟踪。
- `release/`：本地构建输出目录，被 Git 忽略。

## Web 部署

安装依赖：

```powershell
npm.cmd install
```

构建静态网页：

```powershell
npm.cmd run build
```

将生成的 `dist/` 目录部署到任意静态托管平台即可。开发预览使用项目固定端口：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

浏览器部署可以预览模拟器和工作台界面，但 PDF/图像本地导出依赖 Electron 桌面桥接。

## 桌面程序与安装包

先构建内置导出器：

```powershell
npm.cmd run exporter:bundle
```

再构建正式 Windows 安装包：

```powershell
npm.cmd run desktop:installer
```

V4.1.4 的正式分发文件是：

```text
release/heat-capacity-lab-setup-4.1.4.exe
```

本地桌面开发运行：

```powershell
npm.cmd run desktop:dev
```

## 软件界面

- 顶部菜单：新建/打开实验、新窗口、撤销/重做、窗口布局、设置、帮助和关于。
- 左侧栏：打开的实验文件，以及当前文件关联的面板。
- 中央工作区：3D 预览、实时数据/图表、结果、实验记录和数据处理。
- 右侧栏：当前参数、关系选择、扫描变量、采样预设和高级设置。
- 底部控制台：日志、警告和运行摘要。
- 通用设置：主题、语言、性能模式和布局偏好。
- 关于窗口：版本、本地导出环境、工作区缓存概要。

## 基本使用流程

1. 从顶部菜单或空工作区新建/打开实验。
2. 在左侧栏选择实验文件。
3. 运行前在右侧栏调整参数。
4. 启动模拟或按空气比热容比流程操作。
5. 查看实时图表、结果分页、数据记录和处理结果。
6. 在结果或导出区域导出报告、图像或 CSV 数据。

## 导出细节

桌面程序按以下顺序检查导出环境：

1. 优先使用系统 Python 导出器。
2. 系统环境不可用时，使用随安装包内置的 PyInstaller 导出器。

导出器会生成 PDF 报告、PDF/PNG 图像、CSV 数据和 metadata 文件。默认桌面导出目录位于用户 Documents 下。

## 验证命令

发布前建议运行：

```powershell
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd run exporter:bundle
npm.cmd run desktop:installer
```

打包后还需要验证生成的安装包和安装包内导出器，再创建 GitHub Release。

## 空气比热容比 / Blender 模型规则

FD-NCD-C 空气比热容比实验的仪器控制骨架继续遵循 v4.0.1 建模合同。3D/Blender 模型只作为状态机驱动的可视化与交互载体，不能成为 `P0`、`P1`、`P2`、`U_p`、`U_T` 或 `gamma` 的数据源。

独立 Blender 建模人员应遵循：

```text
docs/instrument-modeling/reference/Blender模型接入规则-v4.0.1.md
```
