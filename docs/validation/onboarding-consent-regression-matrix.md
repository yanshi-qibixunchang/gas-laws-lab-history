# 首次运行、法律同意与重新观看回归矩阵

> 状态：当前回归合同
> 适用版本：6.4.0 及其后的未发布开发版本
> 最后核验：2026-09-01

`AppExperienceProfile` 是首次运行完成、法律同意、语言和学习进度的唯一权威记录。通用设置不能单独完成首次运行或法律同意。

| 场景 | 必须结果 | 自动化覆盖 |
| --- | --- | --- |
| 无档案首次启动 | 进入完整首次流程；读取兼容回退不得自动写入存储 | `firstRunExperienceModel.test.ts`、`experimentLearningModel.test.ts` |
| 完成首次流程 | 一次提交语言、法律版本、学习需求和教程入口 | `firstRunExperienceModel.test.ts`、`firstRunExperienceStore.test.ts` |
| 正常重启 | 重新读取同一档案并直接进入工作台 | `firstRunExperienceStore.test.ts` |
| 法律正文版本提升 | 已完成首次流程的用户只进入法律确认，不重做语言、产品介绍或学习需求 | `firstRunExperienceModel.test.ts`、`firstRunExperienceStore.test.ts` |
| 接受新法律版本后重启 | 保留原语言和学习进度，只更新 `acceptedLegalVersion` | `firstRunExperienceStore.test.ts` |
| 存储缺失、损坏或不可读 | 进入安全的完整流程/兼容回退，不把损坏内容覆盖成成功状态 | `experimentLearningModel.test.ts` |
| 保存失败 | 保持当前门禁并显示错误，不进入工作台 | `firstRunExperienceStore.test.ts`、`firstRunExperienceUi.test.ts` |
| 重新观看产品介绍 | 只打开临时欢迎/产品覆盖层；不得修改同意或学习档案 | `firstRunExperienceUi.test.ts` |
| 重新选择学习需求 | 只在明确操作后更新绝热膨胀学习路径 | `workbenchLearningIntegration.test.ts`、`experimentLearningModel.test.ts` |
| 重置或退出教程 | 现有实验文件不删除；教程所有权、窗口接管和恢复保持一致 | `experimentLearningChannel.test.ts`、`workbenchLearningIntegration.test.ts` |

法律正文发生实质变化时，应先提升 `CURRENT_WORKBENCH_LEGAL_VERSION`，再运行本矩阵相关测试；普通软件版本提升不得触发重复同意。
