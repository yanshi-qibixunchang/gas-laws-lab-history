# 项目原创与内部制作资产来源记录

> 状态：当前来源记录
> 适用版本：6.4.0 及其后的未发布开发版本
> 最后核验：2026-09-01

本文件记录随软件分发、但不属于第三方开源依赖的项目资产。项目原创资产不需要虚构外部下载地址；若制作过程参考了论文、仪器说明或照片，应把“资产权利状态”和“事实参考依据”分开记录。

## 当前资产

| 资产 | 权利与来源 | 制作或派生关系 | 精确证据 |
| --- | --- | --- | --- |
| `public/models/heat-capacity/fd-ncd-c-ultra.glb` | 本项目原创，由项目团队内部制作 | Blender/glTF 工作流制作并在仓库内持续细化；仪器事实依据另见绝热膨胀法 `references/`，不等同于第三方模型来源 | `public/models/heat-capacity/model-provenance.json` |
| `public/models/piston-oscillation/piston-oscillation.glb` | 项目提供并授权集成的模型资产 | 由项目模型仓库的已记录版本组合、移植并细化 | `public/models/piston-oscillation/model-provenance.json` |
| `public/models/shared/unified-light-lab-bench.glb` | 项目内部派生资产 | 从绝热膨胀法 GLB 的指定实验台节点确定性提取 | `public/models/shared/unified-light-lab-bench.provenance.json`、`scripts/extractUnifiedLightLabBench.py` |
| `resources/app-icon/gas-laws-lab-icon-source.png` | 本项目原创应用图标源图 | `scripts/generateAppIcons.cjs` 生成 Windows 图标、favicon 和多尺寸 Web 图标 | `scripts/verifyAppIconResources.cjs` 固定尺寸和 SHA-256 |
| `src/assets/onboarding/*.mp4` | 项目内部录制的产品介绍素材 | 由软件自身的开发捕获页面和演示流程录制，不是第三方视频 | 对应 `ProductIntro*CapturePage.tsx` 与使用组件 |
| `docs/validation/generated/` 中的 CSV/JSON | 项目程序化生成 | 由当前模型、固定种子和证据生成器计算；属于验证输出，不是外部数据集 | `scripts/research-report/generate-evidence.ts`、`evidence-metadata.json` |
| 程序化图表与界面示意 | 项目程序化生成 | 由导出器或分析脚本根据项目/获授权数据生成；具体输入来源随对应报告记录 | `tools/exporter/`、`scripts/analysis/` 及各验证目录 README |

第三方音频及其项目衍生文件不归入“完全原创”表，继续以 `docs/audio/THIRD_PARTY_AUDIO_NOTICES.md` 和音频 manifest 为权威来源记录。

## 维护规则

1. 新增可分发 GLB 或其他不可从源码直观看出来源的二进制资产时，必须同时增加机器可读 provenance 文件。
2. 资产内容变化后同步更新字节数、SHA-256、制作方法、基础资产和派生资产记录。
3. 只有第三方原始资产或第三方代码依赖才写外部来源与许可证；项目原创资产明确写“本项目原创/内部制作”。
4. 从原创资产派生的文件要记录具体源文件、节点或生成脚本，不能只写“自行制作”。
5. `npm.cmd run legal:check` 必须能够发现进入生成型法律清单的 provenance 变化。
