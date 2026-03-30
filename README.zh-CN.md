# Hard Sphere Lab v3.4.2

[English README](./README.md)

Hard Sphere Lab 是一个基于 React、Vite 和 Capacitor 构建的硬球分子动力学仿真平台，提供浏览器端和 Android 端一致的交互体验，可用于实时观察粒子运动、统计量变化、三维交互以及报告查看。

## v3.4.2 更新要点

- Android 原生返回键在 PDF 查看器打开时会优先关闭 PDF，并返回应用主页面，而不是直接退出到桌面

- 优化移动端键盘弹出时的布局处理，避免侧边栏结构被压缩重排
- 预设校验提示统一改为底部全局提示，并确保显示在模糊层上方
- 删除预设不再使用浏览器原生确认框，改为应用内 React 确认弹窗
- 同步刷新 HSS 版本的图标、favicon、manifest 元数据与打包品牌资源

## 仓库内容

- Web 应用源码
- 用于打包 APK 的 Capacitor Android 工程
- PDF 报告、图标、PWA 清单等公共资源

## 项目简介

本项目围绕 Andersen 恒温器下的硬球气体动力学仿真展开，用户可以：

- 调整粒子数、半径、盒子尺寸和时间参数
- 在界面中执行重置、开始和暂停仿真
- 查看温度、压强、平均速率、方均根速率等统计信息
- 进行三维视图交互
- 保存和复用参数预设
- 在内置 PDF 查看器中打开实验报告
- 在简体中文、繁体中文和英文界面间切换

## 主要功能

- 实时硬球气体仿真
- 三维分子动力学视图，支持旋转 / 平移模式切换
- 平衡阶段与统计阶段的进度追踪
- 预设创建、选择、重命名、删除与设为启动默认值
- 面向桌面端和移动端的响应式布局
- 内置 PDF 查看器与缩放支持
- Web 预览与 Android APK 打包支持
- 多语言界面

## 环境要求

- Node.js 18 或更高版本
- npm
- 若需打包 Android 应用，还需要 Android Studio 与 Android SDK

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

由于资源路径为绝对路径，生产包应通过本地 HTTP 服务访问，而不是直接双击文件打开。

## 使用说明

### 基本流程

1. 打开左侧设置栏。
2. 调整粒子数量、半径、盒子尺寸和时间参数。
3. 修改参数后先点击 `重置系统`。
4. 点击 `开始模拟`。
5. 观察三维视图、统计卡片和分布图。

注意：

- 如果参数发生变化，应用通常会要求先重置再开始。
- 在移动端，原生返回键会优先关闭侧边栏和临时浮层，而不是直接退出应用。

### 三维视图交互

三维区域支持两种常见交互模式：

- 旋转模式
- 平移模式

当你进入三维交互区域后，如果一段时间内没有切换模式，界面会显示引导提示，帮助你找到视角切换按钮。

### 预设功能

预设区域支持：

- 新建预设
- 载入已有预设
- 重命名预设
- 删除预设
- 将某个预设设置为启动默认值

新建入口目前是一个紧凑的图标按钮，位于预设区域标题右侧。

### 主题与语言

右上角浮动按钮支持：

- 亮色 / 深色模式切换
- 界面语言切换

切换后会在底部出现对应提示。

### PDF 报告

页脚中的 `查看报告 (PDF)` 可直接打开内置 PDF 查看器。

支持的操作包括：

- 工具栏放大 / 缩小
- 重置缩放
- 移动端双指缩放
- 在支持的平台中导出 / 分享 PDF

### 联系组长

`联系组长` 按钮采用了一个有意设计的两段式流程：

1. 点击后先把邮箱复制到剪贴板。
2. 底部弹出提示，告诉你邮箱已经复制成功。
3. 大约 1 秒后，再尝试通过 `mailto:` 打开默认邮箱客户端。

这样设计是为了降低移动端失败时的困惑感。因为某些手机浏览器、WebView 或系统环境下，邮箱跳转可能会失败；但即使跳转失败，邮箱地址也已经复制好了，仍然可以手动粘贴发送。

当前联系邮箱：

```text
project-team@users.noreply.github.com
```

若想让自动跳转更稳定，请确保设备上已经设置默认邮箱应用，例如 QQ 邮箱、Outlook、Gmail 等支持 `mailto:` 的客户端。

## Android 打包

先把最新 Web 资源同步进 Android 工程：

```powershell
npm run build
npx cap sync android
```

再构建 debug APK：

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

默认 APK 输出路径：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

说明：

- `android/key.properties` 和 keystore 等签名文件不会提交到仓库。
- 如果需要打包 release 版本，请先在本地配置自己的签名信息。

## 常见问题

### 为什么修改参数后不能直接开始？

因为参数变更后需要先重置系统。请先点击 `重置系统`，再重新开始仿真。

### 为什么邮箱没有自动跳转成功？

常见原因包括：

- 设备没有设置默认邮箱应用
- 当前浏览器拦截了 `mailto:` 跳转
- 应用运行在未注册邮箱处理器的内嵌 WebView 中

这时可以直接使用已复制到剪贴板的邮箱地址手动发送邮件。

### 为什么 GitHub 仓库里没有 APK 和构建产物？

这个仓库刻意保持为“源码仓库”。像 `dist/`、`output/`、APK、Android 构建缓存和本地签名材料这类文件都不会提交，以保证仓库干净、可复现、便于他人克隆后自行安装和构建。

## 仓库结构

- `App.tsx`：主界面和高层交互逻辑
- `components/`：仿真视图、页脚、统计面板、PDF 模态框等组件
- `services/`：物理引擎和多语言资源
- `public/`：静态资源、PDF 报告、图标和 manifest
- `android/`：Capacitor Android 工程
- `assets/`：项目图形和打包相关素材

## 开发说明

常用命令：

```powershell
npm run dev
npm run build
npm run preview
```

仓库默认忽略以下本地文件：

- `node_modules/`
- `dist/`
- `output/`
- `.codex/`
- `.env.local`
- Android 构建缓存和 IDE 本地状态
- APK / AAB 构建产物
- 本地 Android 签名材料
