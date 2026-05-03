# Hard Sphere Lab v3.5.0

[English README](./README.md)

Hard Sphere Lab 是一个面向电脑桌面端的硬球分子动力学工程工作台。项目基于 React 和 Vite 构建，主要运行在桌面浏览器中，用于交互式仿真、理想气体关系验证、结果查看和报告辅助。

## 设计目的

这个项目的目标不是只展示一段动画，而是提供一个可以反复操作的实验工作台。用户可以创建实验文件、调整参数、运行模拟、观察实时诊断、积累理想气体验证点，并通过 Results 窗口查看结果表格、图形和验证结论。

当前版本的产品方向是电脑桌面端 Web 工程软件。移动端打包资料仅作为冻结的旧版归档保留，不作为当前版本的主要发布流程。

## 主要功能

- 标准硬球气体仿真，支持 Andersen 热浴相关参数。
- 理想气体工作台，支持 `P-T`、`P-V`、`P-N` 关系研究。
- 类文件式工作区，支持标准模拟文件和理想气体研究文件。
- 面向桌面指针交互的三维粒子视图。
- 实时温度、压强、速率和诊断图表面板。
- Results 标签页窗口，包含摘要、数据表、图形、实验点和验证视图。
- 当前参数侧栏、Reset/Start 流程、撤销/重做和工作台状态保存。
- 内置 PDF 报告查看器。
- 简体中文、繁体中文和英文界面文案。

## 环境要求

- Node.js 18 或更高版本
- npm
- 现代桌面浏览器

正常本地使用不需要额外运行时环境变量。

## 本地开发

克隆仓库：

```powershell
git clone https://github.com/yanshi-qibixunchang/gas-laws-lab-history.git
cd hard-sphere-lab-1
```

安装依赖：

```powershell
npm.cmd install
```

启动固定端口开发预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

在 Windows PowerShell 中建议使用 `npm.cmd`，避免 `npm.ps1` 被执行策略拦截。

## 构建与部署

生成生产构建：

```powershell
npm.cmd run build
```

本地预览生产包：

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

生产入口文件：

```text
dist/index.html
```

生产包应通过 HTTP 服务访问，不建议直接双击打开 `dist/index.html`。

Netlify 部署使用仓库中的 `netlify.toml`：

```toml
[build]
command = "npm run build"
publish = "dist"
```

## 使用指南

1. 在桌面浏览器中打开工作台。
2. 从左侧文件区创建或选择一个实验文件。
3. 在右侧当前参数栏调整参数。
4. 参数变更后先使用 Reset，再启动模拟。
5. 运行模拟并观察三维视图、实时图表和状态数值。
6. 打开 Results 查看摘要、表格、图形、实验点或验证图。
7. 需要查看项目报告时，使用内置 PDF 报告查看器。

理想气体研究中，先选择验证关系和扫描变量，再逐点运行并查看 Verification 标签页。标准模拟中，使用 Results 标签页检查最终统计和分析图形。

## 仓库结构

- `App.tsx`：应用外壳和旧标准模式入口。
- `components/`：工作台 UI、三维视图、图表、结果窗口、页脚和 PDF 查看器组件。
- `services/`：物理引擎、翻译文案，以及未来 Help 入口可复用的旧 APK 路径常量。
- `utils/`：理想气体分析、诊断和数字格式化工具。
- `scripts/`：工作台行为的定向回归测试。
- `public/`：运行时静态资源、图标、manifest 和报告 PDF。
- `legacy-apk/`：冻结的旧移动端打包资料归档，不属于当前桌面端发布路径。

## 验证命令

```powershell
npm.cmd run build
```

可选本地预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

仓库默认忽略依赖目录、构建输出、缓存、日志、本地环境文件和生成式打包产物。
