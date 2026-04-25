# Hard Sphere Lab v3.4.4

[English README](./README.md)

Hard Sphere Lab 是一个基于 React、Vite 和 Capacitor 构建的硬球分子动力学模拟平台，集成了浏览器端仿真界面、三维粒子视图、统计诊断图表、预设管理和内置 PDF 报告查看器。

## v3.4.4 更新要点

- 实时图表和最终结果图表重构为更接近科研绘图风格的展示形式
- 最终结果区改为固定分析面板，桌面端和移动端的阅读结构更清晰
- 在半对数分布图下方新增统计摘要区，用于展示拟合偏差和系统稳定性指标
- 调整主页面容器、高度约束和全屏行为，避免图表标题与控制按钮被裁切
- 统一主卡片、图表面板、弹窗和分析窗口的圆角层级

## 仓库内容

- Web 应用源代码
- 用于打包 APK 的 Capacitor Android 工程
- PDF 报告、PWA manifest、图标等公共资源

## 主要功能

- Andersen 热浴下的硬球气体模拟
- 可旋转 / 平移的三维分子动力学视图
- 实时温度、压强、平均速率和方均根速率监测
- 科研风格的速率分布、能量分布、半对数分布和诊断图表
- 预设的新建、载入、重命名、删除和启动默认设置
- 内置 PDF 查看器，支持缩放和导出 / 分享
- 简体中文、繁体中文和英文界面
- Web 预览与 Android 打包流程

## 环境要求

- Node.js 18 或更高版本
- npm
- 如需构建 Android 应用，还需要 Android Studio 与 Android SDK

正常运行 Web 版本不需要额外环境变量。

## 快速开始

### 1. 克隆仓库

```powershell
git clone https://github.com/yanshi-qibixunchang/gas-laws-lab-history.git
cd hard-sphere-lab
```

### 2. 安装依赖

```powershell
npm install
```

### 3. 启动开发服务器

```powershell
npm run dev
```

默认本地预览地址：

```text
http://127.0.0.1:5173
```

## 生产预览

构建项目：

```powershell
npm run build
```

本地预览生产包：

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

默认预览地址：

```text
http://127.0.0.1:4173
```

构建后的入口文件为：

```text
dist/index.html
```

生产包应通过本地 HTTP 服务访问，而不是直接双击文件打开。

## 使用说明

### 基本流程

1. 打开左侧设置面板。
2. 调整粒子数量、半径、盒子边长和时间参数。
3. 修改参数后先点击 `重置系统`。
4. 点击 `开始模拟`。
5. 观察三维视图、状态统计面板和分析图表。

注意：

- 参数变更后通常需要先重置再开始
- 在移动端，原生返回键会优先关闭 PDF 查看器等临时界面，再退出应用

### 图表与诊断

分析区域目前包含：

- 速率分布
- 能量分布
- 半对数能量分布
- 系统总能量轨迹
- 温度误差轨迹
- 用于评估拟合质量和稳定性的统计摘要指标

### 预设功能

预设区域支持：

- 新建预设
- 载入已有预设
- 重命名和删除自定义预设
- 将预设设置为启动默认值

### 主题与语言

右上角悬浮控制区支持：

- 亮色 / 深色模式切换
- 界面语言切换

### PDF 报告

页脚中的 `查看报告 (PDF)` 会打开内置 PDF 查看器，支持：

- 放大 / 缩小
- 重置缩放
- 移动端双指缩放
- 在支持的平台上导出 / 分享

## Android 打包

先把最新 Web 资源同步到 Android 工程：

```powershell
npm run build
npx cap sync android
```

构建 debug APK：

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

默认 APK 输出路径：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 仓库结构

- `App.tsx`：主界面和高层交互逻辑
- `components/`：仿真视图、图表、页脚、统计面板、PDF 弹窗等组件
- `services/`：物理引擎和多语言资源
- `public/`：静态资源、PDF 报告、图标和 manifest
- `android/`：Capacitor Android 工程
- `assets/`：项目图形与打包相关素材

## 开发说明

常用命令：

```powershell
npm run dev
npm run build
npm run preview
```

仓库默认忽略以下本地产物：

- `node_modules/`
- `dist/`
- `output/`
- `.codex/`
- `.env.local`
- Android 构建缓存和 IDE 本地状态
- APK / AAB 构建产物
- 本地 Android 签名材料
