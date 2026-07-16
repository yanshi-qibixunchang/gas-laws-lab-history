# 研究报告可复核数据证据

生成器版本：research-report-evidence-v2

本目录由固定种子脚本生成，覆盖快速放气法、理想气体关系验证和独立硬球分子模块。CSV 使用 UTF-8 BOM，便于在常用表格软件中直接打开。

## 当前范围

- 快速放气法：逐次结果、按情形汇总、标准操作代表性时序、非理想因素逐项对照，以及传感器、调零、分辨率、两级换热和旋塞模型的可复核补充证据。
- 理想气体：P-T、P-1/V、P-N 各 6 个预设点，每点 5 个固定种子，采用 Stable（6 s 平衡 + 20 s 统计）采样。
- 独立硬球：5 个固定种子的 30 箱速率/能量分布、壁面动量压强窗口，以及独立的 nu=0 能量守恒组。
- 空气振动法、新实验界面、仪器与软件操作截图不在本次生成范围内，继续保留为最终软件版本后的占位材料。

## 文件说明

- `rapid-release/rapid-release-runs.csv`：全部快速放气检验的逐次结果。
- `rapid-release/rapid-release-summary.csv`：各操作情形的均值、标准差、误差带与可记录率。
- `rapid-release/rapid-release-representative-trace.csv`：18 次打气—等待—快速放气—恢复全过程时序。
- `rapid-release/rapid-release-nonideal-runs.csv` 与 `rapid-release-nonideal-comparison.csv`：非理想因素逐次值与汇总对照。
- `rapid-release/rapid-release-sensor-lag-response.csv` 与 `rapid-release-sensor-lag-summary.csv`：压强、温度传感器的理想无滞后与代表性滞后阶跃响应。
- `rapid-release/rapid-release-sensor-static-nonlinearity.csv`：压强通道静态非线性传递关系，不叠加随机误差。
- `rapid-release/rapid-release-zero-calibration.csv`：固定种子初始零偏、调零残差与 U0 作差结果。
- `rapid-release/rapid-release-display-resolution.csv` 与 `rapid-release-display-resolution-gamma.csv`：内部 0.01 mV 量化、界面 0.1 mV 记录分辨率及其对代表性 γ 计算的影响。
- `rapid-release/rapid-release-measurement-noise-resolution-runs.csv` 与 `rapid-release/rapid-release-measurement-noise-resolution-summary.csv`：5 个固定种子的噪声、量化与界面记录结果。
- `rapid-release/rapid-release-two-stage-thermal-response.csv` 与 `rapid-release/rapid-release-two-stage-thermal-summary.csv`：气体—器壁、器壁—环境两级换热的受控模块对照。
- `rapid-release/rapid-release-stopcock-aperture-ramp.csv`：生产模型固定平滑开启动画对应的开度与累积有效开启时间。
- `rapid-release/rapid-release-stopcock-flow-sensitivity.csv`：不同等效流通系数下的完整实验结果；该参数不等同于静态旋塞开度。
- `rapid-release/rapid-release-evidence-coverage.csv`：第 5.2.2 所列八类验证对象的证据文件、隔离状态与表述边界。
- `ideal-gas/ideal-gas-runs.csv`：90 次独立运行（3 关系 × 6 点 × 5 种子）。
- `ideal-gas/ideal-gas-point-summary.csv`：每个预设点的 5 种子汇总。
- `ideal-gas/ideal-gas-seed-regression.csv`：每个种子的一轮 6 点拟合。
- `ideal-gas/ideal-gas-relation-summary.csv`：三种关系的总体拟合与判定。
- `hard-sphere/hard-sphere-run-summary.csv`：分布、特征速度、平均能量和壁面压强汇总。
- `hard-sphere/hard-sphere-speed-distribution-30-bin.csv`：5 种子 × 30 箱速率分布。
- `hard-sphere/hard-sphere-energy-distribution-30-bin.csv`：5 种子 × 30 箱能量分布。
- `hard-sphere/hard-sphere-pressure-windows.csv`：统计阶段逐窗口壁面动量压强与理想压强。
- `hard-sphere/hard-sphere-energy-conservation-nu0.csv`：nu=0 组逐秒总能量。
- `hard-sphere/hard-sphere-energy-conservation-summary-nu0.csv`：nu=0 组漂移汇总。
- `evidence-summary.json`：适合写作程序读取的核心汇总。
- `evidence-metadata.json`：版本、工作树、参数、种子、源码 SHA-256 与生成文件 SHA-256。

## 可隔离性与表述边界

- 当前完整实验验收入口只直接暴露气体—器壁热导。两级换热分别关闭的证据来自同一生产热模型的受控模块运行，不应写成完整实验 γ 的两项独立单因素结果。
- 两级换热数据沿用生产模块的热量符号约定：气体向器壁、器壁向环境为正；负值表示实际传热方向相反。
- 当前完整实验验收入口不暴露压强、温度传感器的滞后参数。滞后证据是生产传感器模块的阶跃响应，用于说明数值实现，不是完整实验 γ 的单因素对照。
- 当前物理控制接口只有旋塞开/关；开度由固定 0.1 s 平滑斜坡自动生成，不能独立设置并保持某一静态部分开度。流通系数敏感性只能表述为等效流通能力变化。
- 正确记录 U0 并用 U1-U0、U2-U0 作差时，恒定调零残差会抵消，因此本证据不支持“恒定零偏必然导致 γ 偏差”的表述。
- “关闭泄漏、泵阀交换、环境扰动、噪声与非线性”的参考条件仍保留标称换热与传感器滞后，不是所有非理想因素全部关闭。
- 本次未创建任何图片；空气振动法、新实验仪器和软件操作界面仍等待最终版本后补充。

## 快速核对

- 标准真实化快速放气：30 次，γ 均值 1.374133，样本标准差 0.000906。
- 理想气体关系：P-T R²=0.9996052954；P-1/V R²=0.999106432；P-N R²=0.9989437861。
- 独立硬球：5 个分布种子；nu=0 能量守恒 5 个种子。

重新生成命令：

```powershell
node scripts/research-report/generate-evidence.ts
```
