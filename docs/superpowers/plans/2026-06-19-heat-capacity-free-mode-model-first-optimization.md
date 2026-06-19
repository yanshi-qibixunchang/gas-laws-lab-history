# Free Mode 模型优先优化执行计划

更新日期：2026-06-19

## 当前目标

先完成底层模型，再进入 UI 和诊断报告层。当前批次只处理模型、参数、六类验证和基线文档，不改参数面板 UI。

## 已完成

- [x] 低压传感器不敏感模型
  - 文件：`src/domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts`
  - 接入：`stepFreeSensor`
  - 作用：低 U1/U2 信号下增大统计误差和不稳定性，用 MAE/RMSE 判断，不强制单次结果固定偏高或偏低。

- [x] 打气阀打开期间气体交换模型
  - 文件：`src/domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts`
  - 接入：`stepFreePhysics`
  - 作用：打气阀物理打开后，按压差发生气体交换，按温差发生弱热交换；关闭信号出现后立即停止。
  - 当前真实默认：`gasExchangeRatePerS = 0.005`，`thermalConductanceWPerK = 0.004`，`openingDelayS = 0.42`。

- [x] 独立环境扰动模型
  - 文件：`src/domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts`
  - 接入：`stepFreePhysics`
  - 作用：用固定 seed 产生弱、低频、可复现的环境压力/温度偏移。
  - 当前真实默认：`pressureAmplitudeKPa = 0.002`，`temperatureAmplitudeK = 0.015`，`timeScaleS = 180`。

- [x] 六类测试方案更新
  - 文件：`docs/instrument-modeling/heat-capacity-free-mode-six-class-validation-plan.md`

- [x] 六类基线结果更新
  - 文件：`docs/instrument-modeling/heat-capacity-free-mode-six-class-baseline-results.md`

## 当前验收口径

- 绝对理想情况：gamma 进入 `1.395-1.405`。
- 理想实验操作：gamma 进入 `1.39-1.41`。
- 实验最佳操作：30 次固定 seed 的任意连续 3 次均值进入 `1.37-1.43`。
- 合适真实操作：指定 5 组各 30 次均值进入 `1.34-1.46`。
- 低压打气次数：`4, 8, 12, 16, 18` 的 MAE 随次数接近 18 下降，且改善放缓。
- 慢打气：50s 必须进入 `1.36x` 段，120s 必须进一步变差，且 U1 随总时长降低；不强制 50s 自然超出 `1.3-1.5`。

## 保留到下一阶段

- [ ] 参数面板 UI：显示/编辑新增模型参数。
- [ ] 真实/理想模式参数组切换。
- [ ] 倍速条与 5min 计时器 UI。
- [ ] 诊断报告中解释低压、慢打气、泵阀未关、长等待、极短放气等错误。
- [ ] 对 50s 慢打气进入 `1.36x` 后的诊断扣分等级做 UI/评分规则设计。

## 本轮验证命令

```powershell
node tests\heatCapacity\heatCapacityFreeSixClassValidation.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeSensorModel.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
npm.cmd exec tsc -- --noEmit
```
