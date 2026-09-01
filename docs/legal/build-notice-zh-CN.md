# 当前构建、权限与第三方说明核验基线

> 状态：当前核验文档；软件界面的实际正文以应用源码为准
> 当前项目版本：6.4.0。
> 最后核验：2026-08-31

## 本地运行与权限边界

气律实验室默认在用户本机运行，不要求注册账户。软件会在用户主动操作时读取实验文件、保存工作区状态，并把报告、图表、CSV 和元数据写入用户选择的本地目录。桌面更新功能会访问配置的 GitHub Release；核心实验和本地结果查看不依赖账户服务。

实验文件、实验参数、结果和工作区缓存不会因为检查更新而被上传。导出器可能在系统临时目录创建中间文件，并应在导出结束后清理本次临时目录。

## 当前直接运行时组件

| 组件 | 用途 | 许可 |
| --- | --- | --- |
| React / React DOM | 用户界面 | MIT |
| Three.js | 三维场景 | MIT |
| React Three Fiber / Drei | React 与 Three.js 集成 | MIT |
| Electron Updater | Windows 桌面自动更新 | MIT |
| Lucide React | 界面图标 | ISC |

PDF.js 和 Capacitor 不是当前 `package.json` 中的直接运行时依赖，不再列入直接组件表。完整传递依赖、锁定版本、版权和许可证不得手工维护，以生成型清单为准。

## 权威材料

- 根目录 `THIRD_PARTY_NOTICES.md`：项目级第三方说明入口。
- `public/legal/third-party-dependencies.html`：锁定依赖、版本、许可证和来源。
- `public/legal/third-party-license-texts.html`：许可证全文。
- `public/legal/LICENSE.electron.txt`：Electron 许可证。
- `public/legal/font-licenses.txt`：字体许可证。
- `public/legal/exporter-licenses.html`：导出器和 Python 依赖许可证。
- `docs/audio/THIRD_PARTY_AUDIO_NOTICES.md`：音效来源和程序化音效说明。
- `docs/legal/original-assets.md`：项目原创、内部录制和程序化生成资产的统一来源入口。
- `public/models/heat-capacity/model-provenance.json`：绝热膨胀法模型的原创状态、摘要和派生关系。
- `public/models/piston-oscillation/model-provenance.json`：活塞模型内部来源、版本和权利状态。
- `public/models/shared/unified-light-lab-bench.provenance.json`：共享实验台来源记录。

生成型法律材料由 `npm.cmd run legal:generate` 更新，由 `npm.cmd run legal:check` 验证。项目内部制作的模型、文档和界面应标记为“本项目原创”或“项目内部制作”，不虚构第三方来源。
