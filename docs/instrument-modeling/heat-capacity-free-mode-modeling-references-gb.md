# 空气比热容比 Free Mode 建模参考文献

> 格式按 GB/T 7714 风格整理。网络资料访问日期统一记为 2026-06-19。每条后附“本项目用途”，说明它在模型设计中对应哪一部分。

## 参考文献

[1] NASA Glenn Research Center. Mass flow choking[EB/OL]. [2026-06-19]. https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html.

本项目用途：用于开阀放气模型。该资料给出可压缩流质量流率、压比、总温、气体常数和临界流动的关系，用来支撑“流量由实时压差和温度决定，而不是由理论 U2 决定”的设计。

[2] NASA Glenn Research Center. Specific heats - cp and cv[EB/OL]. [2026-06-19]. https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-heats-cp-and-cv-1/.

本项目用途：用于能量更新链路。该资料说明 `cp`、`cv`、气体常数和焓的关系，用来支撑开阀流出/流入气体携带 `cp*T` 焓、瓶内气体按 `cv*T` 更新内能的简化实现。

[3] National Tsing Hua University General Physics Laboratory. 實驗: 空氣γ值的測定[EB/OL]. [2026-06-19]. https://www.phys.nthu.edu.tw/~gplab/file/11%20The%20Adiabatic%20Expansion/Cv%20to%20Cp%20ratio%20measurement.pdf.

本项目用途：用于实验操作时间的外部参照。该讲义描述了空气比热容比的放气实验流程，包含快速开口、等待数分钟热平衡、改变开口时间观察误差等操作思想；本项目据此把 `5min` 等待作为真实操作基准，并把 `0.03s/0.05s/0.10s/0.25s/0.35s/0.45s/0.60s/1s/2.5s/10s` 纳入开阀时长扫描。

[4] CHURCHILL S W, CHU H H S. Correlating equations for laminar and turbulent free convection from a horizontal cylinder[J]. International Journal of Heat and Mass Transfer, 1975, 18(9): 1049-1053. DOI: 10.1016/0017-9310(75)90222-7.

本项目用途：用于热交换模型。该文献属于自然对流经验关联式的经典来源，本项目不直接引入完整 Nusselt/Rayleigh 计算表，而是用其“温差增大时自然对流换热增强”的物理方向，设计温差驱动的有效气壁换热系数。

[5] Idaho National Laboratory. ChurchillChuHTCFunctorMaterial[EB/OL]. [2026-06-19]. https://mooseframework.inl.gov/source/functormaterials/ChurchillChuHTCFunctorMaterial.html.

本项目用途：用于实现参照。该工程文档展示了 Churchill-Chu 自然对流关联式在数值模型中的参数化方式，帮助确定本项目只做低复杂度近似而不引入完整几何物性表。

[6] BOMELBURG H J. Estimation of gas leak rates through very small orifices and channels[R]. Richland: Pacific Northwest Laboratory, 1977. Report No.: BNWL-2223-77. https://www.osti.gov/servlets/purl/7318185.

本项目用途：用于漏气模型。该报告汇总小孔和毛细通道中的气体泄漏估算公式，本项目据此把漏气从单纯线性压差改为更接近气体微漏的压强平方差驱动，并保留平衡压强夹取，避免数值越界。

[7] Freie Universität Berlin, Fachbereich Physik. Basic Laboratory Course in Physics: GP I lab script[EB/OL]. [2026-06-19]. https://www.physik.fu-berlin.de/studium/lehre/gp/dateien/gp-doku/GP1-Script-English.pdf.

本项目用途：用于补充打气和开阀操作建模依据。该讲义把 Clement-Desormes 初态定义为轻微过压、已回到室温的状态，并说明短时间打开旋塞使气体近似绝热放至外界压强，后续再等容回温；还指出开口时间过短或过长都会造成系统误差。本项目据此把“打气”从直接评分项降级为通过进入瓶内气体量、打气升温、等待热交换、漏气、最终 U1 压差和放气实时流量影响结果的状态变量，并把开阀时间作为独立误差扫描项。

[8] TATUM J. The Clément-Desormes Experiment[EB/OL]. LibreTexts, 2020-10-05[2026-06-19]. https://phys.libretexts.org/Bookshelves/Thermodynamics_and_Statistical_Mechanics/Heat_and_Thermodynamics_%28Tatum%29/08%3A_Heat_Capacity_and_the_Expansion_of_Gases/8.05%3A_The_Clement-Desormes_Experiment.

本项目用途：用于理想过程和验收阈值定义。该资料说明旋塞应快速打开并立即关闭，绝热近似依赖于放气后尚未来得及与外界换热，随后气体再等容回温；本项目据此定义“绝对理想情况”的瞬时放气、等待阶段等容热交换，以及放气时间过短/过长只应分级判定而不全部强制为极端错误。

[9] 焦冬生. 实验一 气体绝热指数测定实验[EB/OL]. 中国科学技术大学[2026-06-19]. https://faculty.ustc.edu.cn/jiaodongsheng/zh_CN/article/996309/content/1860.htm.

本项目用途：用于真实仪器操作和漏气阈值参照。该资料给出气密性检查、恒定室温、高速采样、电磁阀控制膨胀时间和等容加热回温等实验要求；本项目据此把漏气作为长等待和真实模式的重要误差来源，同时避免把 7min 量级等待直接设为极端错误，而是将更长等待作为强漏气验收场景。

[10] 唐亚陆, 胡光, 张俊. 用声速测量空气比热容比[J/OL]. 大学物理实验, 2010, 23(5): 59-61[2026-06-19]. https://fs.gongkong.com/files/technicalPaper/201107/2011072411014300001.pdf.

本项目用途：用于真实 FD-NCD 类仪器数据范围参照。该文给出 FD-NCD 方法下的 U1、U2 和计算 gamma 示例，显示真实实验数据会围绕理论值产生可见离散；本项目据此保留真实合适操作的较宽结果区间，并把明显错误、极端错误分级，而不把所有偏差都要求落到同一个超大失败区间。

[11] Solinst Canada Ltd. Understanding pressure sensor accuracy, precision, resolution & drift[EB/OL]. [2026-06-19]. https://www.solinst.com/onthelevel-news/water-level-monitoring/water-level-datalogging/understanding-pressure-sensor-accuracy-precision-resolution-drift/.

本项目用途：用于低压传感器不敏感和环境漂移建模。该资料区分了 accuracy、precision、resolution 和 drift，并说明传感器精度常用满量程百分比描述，分辨率是可检测的最小压力变化，漂移会随使用条件发生；本项目据此把低压区建模为“相同绝对误差对应更大相对误差、结果波动增大、可信度下降”，而不是强行给出固定方向偏差。

[12] Avnet Abacus. Pressure sensor specification and impact on accuracy[EB/OL]. [2026-06-19]. https://my.avnet.com/abacus/solutions/technologies/sensors/pressure-sensors/understanding-specification/.

本项目用途：用于传感器误差项分解。该资料说明影响压力传感器准确性的因素包括温度系数、温度滞后、压力滞后、非线性、零点和量程变化，并指出精度可按满量程百分比或读数百分比表达；本项目据此在真实模式中把低压不稳定、温度相关漂移和零点/量程误差作为可复现扰动来源。

[13] Validyne Engineering. Pressure sensor accuracy[EB/OL]. [2026-06-19]. https://www.validyne.com/blog/pressure-sensor-accuracy-2/.

本项目用途：用于压力传感器非线性和滞后建模。该资料说明理想压力传感器输出应与压力成正比，但实际传感器存在非线性和迟滞误差；本项目据此为低压区传感器响应增加非线性、滞后/噪声导致的单次结果不稳定，同时用多次实验的平均绝对误差或 RMSE 验证低压结果整体更差。

[14] The MathWorks, Inc. Flow Restriction - isentropic ideal gas flow through an orifice[EB/OL]. [2026-06-19]. https://www.mathworks.com/help/autoblks/ref/flowrestriction.html.

本项目用途：用于泵阀泄漏和开阀流动建模。该资料把小孔/节流流动描述为基于质量守恒和能量守恒的等熵理想气体流动，并包含有效孔口面积、放流系数、上下游压力、压力比、比热容比和热流项；本项目据此要求打气阀打开时的泄漏/泵腔交换由实时压差、温差和阀门有效开启时间驱动，而不是额外添加“慢打气扣分”。

[15] Spirax Sarco. Control valve characteristics[EB/OL]. [2026-06-19]. https://www.spiraxsarco.com/learn-about-steam/control-hardware-electric-pneumatic-actuation/control-valve-characteristics?sc_lang=en-GB.

本项目用途：用于放气阀有效开度模型。该资料说明阀门开度、阀芯/阀座形状、流通面积和流量之间存在特性关系；在相同压差下，流量与实际流通面积直接相关。本项目据此把当前理论放气流量改为 `理论放气流量 × aperture(openElapsedS)`，其中 `aperture` 表示旋塞从关闭到有效全开的归一化流通能力。

[16] docs.gl. smoothstep[EB/OL]. [2026-06-19]. https://docs.gl/sl4/smoothstep.

本项目用途：用于有效开度曲线公式。该资料给出 `smoothstep` 的标准 Hermite 平滑插值形式：`t = clamp((x - edge0) / (edge1 - edge0), 0, 1)`，`smoothstep = t * t * (3 - 2 * t)`。本项目据此定义 `x = clamp(openElapsedS / 0.1, 0, 1)`，`aperture = x * x * (3 - 2 * x)`，并使用该函数的解析积分计算时间段内的平均开度，避免只取步末开度。

[17] ZHANG X, LU Y H, LI Y, ZHANG C, WANG R. Numerical calculation and experimental study on response characteristics of pneumatic solenoid valves[J/OL]. Measurement and Control, 2019. DOI: 10.1177/0020294019866853.

本项目用途：用于有限开阀响应时间依据。该研究用阀芯位移和出口压力响应描述气动阀开闭过程，并用出口压力达到 10%/90% 作为响应/切换时间判据，说明阀门有效流通能力不是从 0 瞬时跳到 1。本项目据此在放气阀模型中加入 `0.1s` 量级的有效开度 ramp，并要求短开阀时间按真实物理开阀时长积分。

## 建模使用说明

- [1] 和 [2] 支撑开阀流动与能量守恒主链路：U2 由实时粒子数、温度和热交换恢复得到，不再由 `gamma` 直接反推。
- [3] 支撑验收操作组：5min 等待、`18` 下 `12s` 内完成打气、`0.35s` 物理开阀中心和开口时间变化都应进入测试矩阵。
- [4] 和 [5] 支撑热交换改造：本轮采用温差驱动的有效换热系数，不额外暴露 UI 参数。
- [6] 支撑漏气改造：弱漏用于真实默认参数，强漏用于错误操作和极端长等待验证。
- [7] 补充打气建模口径：打气本身不作为直接惩罚项，而是通过气体量、升温、热交换、漏气和后续开阀状态间接影响结果。
- [8] 和 [9] 支撑新验收分级：绝对理想、理想实验、真实实验和错误实验需要区分瞬时绝热、短时开阀、等容回温、气密性和长等待漏气。
- [10] 支撑真实结果区间：FD-NCD 类数据存在可见离散，真实合适操作应使用宽区间，错误操作再按轻度、明显和极端错误分级。
- [11]、[12] 和 [13] 支撑低压传感器不敏感模型：低压区不要求 mean gamma 固定偏向某一侧，而要求多 seed 下平均绝对误差或 RMSE 增大，且打气次数越少误差期望越大。
- [11] 和 [12] 支撑环境扰动模型：真实模式中的环境温度/压力漂移应弱、低频、可复现，并保持在和仪器示数波动同级或更低一级。
- [14] 补充支撑泵阀模型：慢打气影响必须来自打气阀开启期间的压差驱动泄漏和温差驱动交换，而不是人为时间惩罚。
- [15]、[16] 和 [17] 支撑放气阀有效开度模型：理论放气流量仍由压缩气体流动公式决定，但需要乘以随开阀时间平滑增长的 `aperture(openElapsedS)`；短开阀必须按时间段积分开度计算，不能用步末开度或固定最小 0.05s 开阀代替。
