# 空气比热容比 Free Mode 建模参考文献

> 格式按 GB/T 7714 风格整理。网络资料访问日期统一记为 2026-06-19。每条后附“本项目用途”，说明它在模型设计中对应哪一部分。

## 参考文献

[1] NASA Glenn Research Center. Mass flow choking[EB/OL]. [2026-06-19]. https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html.

本项目用途：用于开阀放气模型。该资料给出可压缩流质量流率、压比、总温、气体常数和临界流动的关系，用来支撑“流量由实时压差和温度决定，而不是由理论 U2 决定”的设计。

[2] NASA Glenn Research Center. Specific heats - cp and cv[EB/OL]. [2026-06-19]. https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-heats-cp-and-cv-1/.

本项目用途：用于能量更新链路。该资料说明 `cp`、`cv`、气体常数和焓的关系，用来支撑开阀流出/流入气体携带 `cp*T` 焓、瓶内气体按 `cv*T` 更新内能的简化实现。

[3] National Tsing Hua University General Physics Laboratory. 實驗: 空氣γ值的測定[EB/OL]. [2026-06-19]. https://www.phys.nthu.edu.tw/~gplab/file/11%20The%20Adiabatic%20Expansion/Cv%20to%20Cp%20ratio%20measurement.pdf.

本项目用途：用于实验操作时间的外部参照。该讲义描述了空气比热容比的放气实验流程，包含快速开口、等待数分钟热平衡、改变开口时间观察误差等操作思想；本项目据此把 `5min` 等待作为真实操作基准，并把 `0.25s/0.50s/1s/2s/5s` 纳入开阀时长扫描。

[4] CHURCHILL S W, CHU H H S. Correlating equations for laminar and turbulent free convection from a horizontal cylinder[J]. International Journal of Heat and Mass Transfer, 1975, 18(9): 1049-1053. DOI: 10.1016/0017-9310(75)90222-7.

本项目用途：用于热交换模型。该文献属于自然对流经验关联式的经典来源，本项目不直接引入完整 Nusselt/Rayleigh 计算表，而是用其“温差增大时自然对流换热增强”的物理方向，设计温差驱动的有效气壁换热系数。

[5] Idaho National Laboratory. ChurchillChuHTCFunctorMaterial[EB/OL]. [2026-06-19]. https://mooseframework.inl.gov/source/functormaterials/ChurchillChuHTCFunctorMaterial.html.

本项目用途：用于实现参照。该工程文档展示了 Churchill-Chu 自然对流关联式在数值模型中的参数化方式，帮助确定本项目只做低复杂度近似而不引入完整几何物性表。

[6] BOMELBURG H J. Estimation of gas leak rates through very small orifices and channels[R]. Richland: Pacific Northwest Laboratory, 1977. Report No.: BNWL-2223-77. https://www.osti.gov/servlets/purl/7318185.

本项目用途：用于漏气模型。该报告汇总小孔和毛细通道中的气体泄漏估算公式，本项目据此把漏气从单纯线性压差改为更接近气体微漏的压强平方差驱动，并保留平衡压强夹取，避免数值越界。

## 建模使用说明

- [1] 和 [2] 支撑开阀流动与能量守恒主链路：U2 由实时粒子数、温度和热交换恢复得到，不再由 `gamma` 直接反推。
- [3] 支撑验收操作组：5min 等待、快速开口和开口时间变化都应进入测试矩阵。
- [4] 和 [5] 支撑热交换改造：本轮采用温差驱动的有效换热系数，不额外暴露 UI 参数。
- [6] 支撑漏气改造：弱漏用于真实默认参数，强漏用于错误操作和极端长等待验证。
