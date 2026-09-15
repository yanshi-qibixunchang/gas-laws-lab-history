# 绝热膨胀法历史验证回归合同

> 状态：当前回归合同
> 适用版本：6.4.1 及后续沿用相同实验合同的版本
> 最后核验：2026-09-01
> 来源边界：从已归档六类验证中提炼约束，不复制旧报告的整组瞬时数值

| 约束 | 当前合同 | 自动化覆盖 |
| --- | --- | --- |
| 标准放气窗口 | `0.50–0.70 s` 含边界获得完整时序分；标准代表点为 `0.60 s` | `heatCapacityHistoricalValidationContract.test.ts`、`heatCapacityFreeProcessScoringModel.test.ts` |
| 分数量化 | 分项与总分为 `0.5` 分整数倍；中点使用五成双 | `heatCapacityHistoricalValidationContract.test.ts`、`heatCapacityFreeProcessScoringModel.test.ts` |
| 极短真实放气 | `0.03/0.05 s` 必须由真实流动自然产生明显偏差，不允许向结果写入人工时长惩罚 | `heatCapacityHistoricalValidationContract.test.ts`、`heatCapacityFreeSixClassValidation.test.ts` |
| 快速开关 | 开启动画完成前关闭不形成 release，真实放气时长为零，不显示失败条，关闭后允许重试 | `heatCapacityHistoricalValidationContract.test.ts`、`heatCapacityReleaseModel.test.ts`、`heatCapacityFreeProcessReviewModel.test.ts` |
| U1 长时间等待 | 不设置人工硬截止或禁止记录；泄漏和换热造成的自然变化保留，并在过程诊断中解释 | `heatCapacityHistoricalValidationContract.test.ts`、`heatCapacityFreeParameterAcceptance.test.ts` |
| 六类结果边界 | 理想、最佳真实、合适、错误、严重错误按绝对误差和重复运行规则验证 | `heatCapacityFreeSixClassValidation.test.ts` |

修改放气状态机、默认物理参数、评分、记录门禁或过程回顾时，必须先运行本表对应测试。若需要改变这些合同，应独立说明物理依据和用户可见后果，不能以“让结果更接近理论值”为唯一理由。
