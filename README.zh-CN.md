# 气律实验室

[English](./README.md)

气律实验室是面向 Windows 的工程软件工作台，用于硬球分子动力学模拟、理想气体关系研究，以及 FD-NCD-C 空气比热容比实验。

当前已公开发布的桌面稳定版是 `v5.2.1`。`main` 可以包含该标签之后已经评审的开发内容；只有在明确确定版本号、同步更新版本文件并发布完整更新资产后，主线源码才构成新的桌面版本。

- 公开下载与更新元数据：[hard-sphere-lab-release](https://github.com/yanshi-qibixunchang/hard-sphere-lab-release)
- 安全与漏洞报告规则：[SECURITY.md](./SECURITY.md)
- 协作、提交与隐私检查：[CONTRIBUTING.md](./CONTRIBUTING.md)

## 产品范围

- 标准硬球模拟：实时 3D 预览、实时图表和结果标签页。
- 理想气体关系研究：`P-T`、`P-V`、`P-N` 采样、验证和历史视图。
- FD-NCD-C 空气比热容比实验：演示、引导和自由三种模式。
- 桌面端本地导出：PDF 报告、PDF/PNG 图像、CSV 数据和元数据。
- 支持简体中文、繁体中文和英文界面。

## 当前源码重点

- 工作台已按职责拆分为命令、设置、更新器、参数、持久化和实验功能模块。
- 热容比实验运行态与标准模拟、理想气体文件使用各自明确的状态边界。
- `v5.2.1` 新增完整的三语言首次使用流程、可重录动态产品介绍、统一工程软件提示体系、教程会话恢复，以及由真实工作区恢复进度驱动的开屏动画。
- `v5.2.0` 将经过回读校验的 V3 保存移出界面主线程，为长时间 Free 轨迹设置硬上限，并无损兼容 4.2.3 和 5.1.1 的有效工作区，同时保持既有用户资料目录和更新身份不变。已撤回的 5.1.2 废版所写实验数据不在兼容承诺内。
- 桌面发布目标只指向公开更新仓库，源码仓库不是更新通道。

## 仓库结构

- `src/app/`：React 应用入口。
- `src/components/`：共享可视化组件。
- `src/features/`：工作台、理想气体和热容比界面及编排逻辑。
- `src/domain/`：模拟和实验计算模型。
- `src/shared/`：共享类型和工具。
- `src/i18n/`：应用多语言文案。
- `tests/`：硬球、理想气体、热容比、工作台和导出器回归测试。
- `electron/`：Electron 主进程、preload 桥接和自动更新集成。
- `tools/exporter/`：Python 导出器源码。
- `scripts/`、`build/`：构建、校验、打包和安装器辅助脚本。
- `public/`：运行时模型、字体、图标、界面素材和生成的第三方许可说明。
- `resources/`：桌面图标和生成的导出器资源。
- `docs/`：发布说明、理论资料、仪器建模参考和内部设计记录。

`node_modules/`、`dist/`、`release/`、`output/`、`tmp/` 等依赖或生成目录均被 Git 忽略。

## 仓库访问与 Codex 协作

源码仓库公开期间，队友可以直接在 Codex 中使用 GitHub 仓库链接，或克隆到本地后用 Codex 打开，不需要单独发送仓库邀请。

如果协作结束后重新改为私有，队友可以通过明确授权继续访问：

1. 将每位队友的 GitHub 账号邀请为私有源码仓库的协作者。
2. 队友接受 GitHub 邀请。
3. 队友可以克隆仓库后在 Codex 中打开本地目录，也可以在 Codex/ChatGPT 连接 GitHub 时授权访问这个仓库。

个人账号名下的私有仓库只能给协作者写权限。如果团队需要只读权限，应把源码仓库转移到 GitHub Organization，再给队友分配 `Read` 角色。

## 本地开发

按锁文件安装依赖：

```powershell
npm.cmd ci
```

使用固定端口启动预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：`http://127.0.0.1:5174/`

运行常规质量检查：

```powershell
npm.cmd run check
npm.cmd run build
```

本地运行 Electron 桌面程序：

```powershell
npm.cmd run desktop:dev
```

浏览器预览覆盖模拟器和工作台界面；本地报告/图像导出依赖 Electron 桥接和导出器环境。

## 桌面发布边界

不能因为 `main` 有新提交就直接制作安装包。只有明确确定版本号，并同步更新 `package.json` 和 `package-lock.json` 后，才能进入桌面发布流程。

正式发布时，公开更新仓库必须同时收到 `release/` 中版本一致的三个更新资产：

- `heat-capacity-lab-setup-<version>.exe`
- `heat-capacity-lab-setup-<version>.exe.blockmap`
- `latest.yml`

公开更新仓库可以保留面向用户的 README、更新日志、安全说明和结构化发布说明，但不能包含本仓库源码、开发分支、构建输入、本地报告、凭据或个人信息。

## 隐私与仓库卫生

- Git 提交统一使用 GitHub 提供的 `noreply` 邮箱。
- 禁止提交凭据、`.env` 文件、个人联系方式、参赛者姓名、学校信息、用户绝对路径，以及文档/图片作者元数据。
- 任何仓库转为公开前，都要检查当前文件、全部已推送分支和标签、提交身份、历史删除对象、发布资产和二进制元数据。
- 开源许可证和学术引用中依法或规范保留的第三方作者属于来源归属，不等同于项目成员身份；两者必须分开判断。

## 仪器模型边界

FD-NCD-C 3D 模型只作为状态机驱动的显示和交互载体，不能成为 `P0`、`P1`、`P2`、`U_p`、`U_T` 或 `gamma` 的数据源。

Blender 接入规则位于：

```text
docs/instrument-modeling/reference/Blender模型接入规则-v4.0.1.md
```

## 许可说明

项目源码当前没有声明开源许可证。获得仓库访问权限不等于获得再分发授权。第三方组件和参考材料继续遵循各自条款，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
