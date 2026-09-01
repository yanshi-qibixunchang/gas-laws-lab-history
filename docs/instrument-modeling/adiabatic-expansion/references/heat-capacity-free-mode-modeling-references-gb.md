# 空气比热容比 Free Mode 建模参考文献

> 格式按 GB/T 7714 风格整理。网络资料访问日期按实际核验日期记录；项目映射口径更新于 2026-07-16。每条后附“本项目用途”，说明它在模型设计中对应哪一部分。本文件是项目内部来源索引，正式报告应引用下列直接来源，并按正文首次出现顺序重新编号。

## 参考文献

[1] NASA Glenn Research Center. Mass flow choking[EB/OL]. [2026-06-19]. https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html.

本项目用途：用于开阀放气模型。该资料给出可压缩流质量流率、压比、总温、气体常数和临界流动的关系，用来支撑“流量由实时压差和温度决定，而不是由理论 U2 决定”的设计。

[2] NASA Glenn Research Center. Specific heats - cp and cv[EB/OL]. [2026-06-19]. https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-heats-cp-and-cv-1/.

本项目用途：用于能量更新链路。该资料说明 `cp`、`cv`、气体常数和焓的关系，用来支撑开阀流出/流入气体携带 `cp*T` 焓、瓶内气体按 `cv*T` 更新内能的简化实现。

[3] National Tsing Hua University General Physics Laboratory. 實驗: 空氣γ值的測定[EB/OL]. [2026-06-19]. https://www.phys.nthu.edu.tw/~gplab/file/11%20The%20Adiabatic%20Expansion/Cv%20to%20Cp%20ratio%20measurement.pdf.

本项目用途：用于实验操作时间的外部参照。该讲义描述了空气比热容比的放气实验流程，包含快速开口、等待数分钟热平衡、改变开口时间观察误差等操作思想；本项目据此把 `5min` 等待作为真实操作基准，并围绕 `0.60s` 标准代表点、`0.50–0.70s` 时序窗口及更短/更长探针建立连续时长扫描。

[4] CHURCHILL S W, CHU H H S. Correlating equations for laminar and turbulent free convection from a horizontal cylinder[J]. International Journal of Heat and Mass Transfer, 1975, 18(9): 1049-1053. DOI: 10.1016/0017-9310(75)90222-7.

本项目用途：用于热交换模型。该文献属于自然对流经验关联式的经典来源，本项目不直接引入完整 Nusselt/Rayleigh 计算表，而是用其“温差增大时自然对流换热增强”的物理方向，设计温差驱动的有效气壁换热系数。

[5] Idaho National Laboratory. ChurchillChuHTCFunctorMaterial[EB/OL]. [2026-06-19]. https://mooseframework.inl.gov/source/functormaterials/ChurchillChuHTCFunctorMaterial.html.

本项目用途：用于实现参照。该工程文档展示了 Churchill-Chu 自然对流关联式在数值模型中的参数化方式，帮助确定本项目只做低复杂度近似而不引入完整几何物性表。

[6] BOMELBURG H J. Estimation of gas leak rates through very small orifices and channels[R]. Richland: Pacific Northwest Laboratory, 1977. Report No.: BNWL-2223-77. https://www.osti.gov/servlets/purl/7318185.

本项目用途：用于漏气模型。该报告汇总小孔和毛细通道中的气体泄漏估算公式，本项目据此把漏气从单纯线性压差改为更接近气体微漏的压强平方差驱动，并保留平衡压强夹取，避免数值越界。

[7] Freie Universität Berlin, Fachbereich Physik. Basic Laboratory Course in Physics: GP I lab script[EB/OL]. [2026-06-19]. https://www.physik.fu-berlin.de/studium/lehre/gp/dateien/gp-doku/GP1-Script-English.pdf.

本项目用途：用于补充打气和开阀操作建模依据。该讲义把 Clement-Desormes 初态定义为轻微过压、已回到室温的状态，并说明短时间打开旋塞使气体近似绝热放至外界压强，后续再等容回温；还指出开口时间过短或过长都会造成系统误差。本项目据此把“打气”从直接评分项降级为通过进入瓶内气体量、打气升温、等待热交换、漏气、最终 U1 压差和放气实时流量影响结果的状态变量，并把开阀时间作为独立误差扫描项。

[8] TATUM J. 8.5: The Clément-Desormes Experiment[EB/OL]. Physics LibreTexts, 2020-09-10[2026-07-16]. https://phys.libretexts.org/Bookshelves/Thermodynamics_and_Statistical_Mechanics/Heat_and_Thermodynamics_%28Tatum%29/08%3A_Heat_Capacity_and_the_Expansion_of_Gases/8.05%3A_The_Clement-Desormes_Experiment.

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

本项目用途：用于放气阀有效开度模型。该资料说明阀门开度、阀芯/阀座形状、流通面积和流量之间存在特性关系；在相同压差下，流量与实际流通面积直接相关。本项目据此把当前理论放气流量改为 `理论放气流量 × aperture(releaseElapsedS)`，其中 `aperture` 从开启动画完成的主放气起点开始计算。

[16] docs.gl. smoothstep[EB/OL]. [2026-06-19]. https://docs.gl/sl4/smoothstep.

本项目用途：用于有效开度曲线公式。该资料给出 `smoothstep` 的标准 Hermite 平滑插值形式：`t = clamp((x - edge0) / (edge1 - edge0), 0, 1)`，`smoothstep = t * t * (3 - 2 * t)`。本项目据此定义 `x = clamp(releaseElapsedS / 0.1, 0, 1)`，并使用解析积分计算时间段内的平均开度，避免只取步末开度。

[17] ZHANG X, LU Y H, LI Y, ZHANG C, WANG R. Numerical calculation and experimental study on response characteristics of pneumatic solenoid valves[J/OL]. Measurement and Control, 2019. DOI: 10.1177/0020294019866853.

本项目用途：用于有限开阀响应时间依据。该研究用阀芯位移和出口压力响应描述气动阀开闭过程，并用出口压力达到 10%/90% 作为响应/切换时间判据，说明阀门有效流通能力不是从 0 瞬时跳到 1。本项目据此在放气阀模型中加入 `0.1s` 量级的有效开度 ramp，并要求短开阀时间按真实物理开阀时长积分。

[18] Massachusetts Institute of Technology. 2.5 Control volume form of the system laws[EB/OL]. [2026-07-13]. https://web.mit.edu/16.unified/www/SPRING/propulsion/notes/node18.html.

本项目用途：用于刚性容器非稳态充气的控制体能量方程。该资料在忽略轴功、热传递、动能、位能及出口质量流的理想充气示例中给出 `dU/dt = m_dot_in * h_in`，说明进入固定容积气瓶的质量携带入口焓，而不是只把环境温度气体与瓶内气体做温度加权平均。本项目据此把打气过程重构为质量通量和能量通量同步进入瓶内的前向守恒链路。

[19] NASA Glenn Research Center. Enthalpy[EB/OL]. [2026-07-13]. https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/enthalpy-5/.

本项目用途：用于入口内能和流动功的拆分依据。该资料给出 `H = E + pV` 及理想气体焓与定压比热的关系；结合 `[2]` 的 `cp`、`cv` 关系，本项目把理想入口能量拆为气体自身内能 `delta_n * Cv * T_ambient` 与流动功上限 `delta_n * R * T_ambient`，并用受限的 `pumpWorkRetention` 表示后者实际保留在瓶内气体中的比例，禁止改成每泵固定升温。

[20] YANG J C. A thermodynamic analysis of refueling of a hydrogen tank[J/OL]. International Journal of Hydrogen Energy, 2009, 34(16): 6712-6721[2026-07-13]. DOI: 10.1016/j.ijhydene.2009.06.015. https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=901791.

本项目用途：用于充气过程的开口系统守恒和换热响应参照。该研究从简单开口系统第一定律出发，以入口摩尔焓、质量流率和热交换共同描述气罐充气，并分别分析绝热、等温和有热交换条件下连续变化的温度与压强。本项目只借鉴其控制体方程、能量账本和“充气节奏通过换热影响温压轨迹”的建模原则，不采用高压氢气的物性、压力范围或数值结果来校准本项目的低压空气仪器。

[21] 李宏康, 孙国川, 邱菊, 薛红玲. 绝热膨胀法测量空气比热容比实验的探讨[J]. 物理实验, 2018, 38(8): 51-55. DOI: 10.19655/j.cnki.1005-4642.2018.08.012.

本项目用途：用于快速放气法非理想机制和验证场景。该论文通过真实实验讨论听声与看压差关阀、传感器响应滞后、放气阶段传热、隔热条件、阀门开度、放气时间和初始充气压差对测量结果的影响。本项目据此识别需要分离真实物理层与传感器显示层，并为换热、有限开度、操作时机和传感器滞后模型提供直接实验依据；论文数据用于趋势和量级参照，不等同于团队自有实测数据。

[22] 杨琴, 张海军. 空气比热容比的实验测量方法的比较探讨[J]. 大学物理实验, 2020, 33(6): 47-50. DOI: 10.14139/j.cnki.cn22-1228.2020.06.013.

本项目用途：用于空气振动法后续理论与非理想模型。该论文说明 FB212 型仪器的理想简谐振动关系，并讨论实际小球运动中的摩擦与黏性阻尼修正及测量误差。本项目现阶段仅将其登记为第二实验的直接理论和建模来源，不据此宣称尚未完成的实时底层数据模型。

[23] BURN-YF. 大学物理实验——空气比热容比的测定 | 云帆微课[EB/OL]. 哔哩哔哩, 2022-03-08[2026-07-15]. https://www.bilibili.com/video/BV1Ai4y117nD/.

本项目用途：用于快速放气法公开真实仪器、标准操作过程、实验状态和画面可见读数的参照。团队未自行完成该方法的真实实验，因此从视频提取的任何数值都必须同时记录时间点、截图、单位和读取方法，并表述为公开视频中的可见读数或估读值。若该视频参与模型调参，后续只能作为一致性对照，不能重复表述为独立验证数据。

[24] PASCO SCIENTIFIC. Ratio of Specific Heats Experiment: EX-5531A[EB/OL]. [2026-07-16]. https://www.pasco.com/products/complete-experiments/thermodynamics/ex-5531.

本项目用途：作为活塞振动法（Rüchardt 法）的官方英文实验来源。该资料说明通过测量充气圆筒内活塞的振动周期确定空气比热容比，并列出压力传感器、热机与气体定律装置等组成；本项目据此统一第二种方法的原理与仪器路线，并支撑真实仪器—GLB模型的结构对照。该来源不用于宣称当前软件已经完成实时底层数据模型；EX-5531与当前网页所列EX-5531A的版本差异仍需结合团队实际仪器资料核定。

## 建模使用说明

- [1] 和 [2] 支撑开阀流动与能量守恒主链路：U2 由实时粒子数、温度和热交换恢复得到，不再由 `gamma` 直接反推。
- [3] 支撑验收操作组：5min 等待、`18` 次打气首末跨度 `8s`、快速开闭及开口时间变化都应进入测试矩阵；项目统一标准代表点为 `0.60s`，最佳时序窗口为 `0.50–0.70s`。
- [4] 和 [5] 支撑热交换改造：本轮采用温差驱动的有效换热系数，不额外暴露 UI 参数。
- [6] 支撑漏气改造：弱漏用于真实默认参数，强漏用于错误操作和极端长等待验证。
- [7] 补充打气建模口径：打气本身不作为直接惩罚项，而是通过气体量、升温、热交换、漏气和后续开阀状态间接影响结果。
- [8] 和 [9] 支撑新验收分级：绝对理想、理想实验、真实实验和错误实验需要区分瞬时绝热、短时开阀、等容回温、气密性和长等待漏气。
- [10] 支撑真实结果区间：FD-NCD 类数据存在可见离散，真实合适操作应使用宽区间，错误操作再按轻度、明显和极端错误分级。
- [11]、[12] 和 [13] 支撑低压传感器不敏感模型：低压区不要求 mean gamma 固定偏向某一侧，而要求多 seed 下平均绝对误差或 RMSE 增大，且打气次数越少误差期望越大。
- [11] 和 [12] 支撑环境扰动模型：真实模式中的环境温度/压力漂移应弱、低频、可复现，并保持在和仪器示数波动同级或更低一级。
- [14] 补充支撑泵阀模型：慢打气影响必须来自打气阀开启期间的压差驱动泄漏和温差驱动交换，而不是人为时间惩罚。
- [15]、[16] 和 [17] 支撑放气阀有效开度模型：理论放气流量仍由压缩气体流动公式决定，但需要乘以从开启动画完成时刻起平滑增长的 `aperture(releaseElapsedS)`；短开阀必须按时间段积分开度计算，不能用步末开度或固定最小时间代替。
- [18]、[19] 和 [20] 支撑打气能量主链路：刚性瓶按非稳态开口控制体处理，泵入质量与入口能量同步更新；以物质的量 `n` 和总内能 `U` 为权威状态，按 `deltaU = deltaN * Cv * T_ambient + pumpWorkRetention * deltaN * R * T_ambient` 记账，再由 `T = U / (n Cv)` 和 `P = nRT / V` 前向推导。瓶内温升由真实 `gamma`、换热和操作节奏共同产生，不从压力显示值反推，也不使用固定温升或预制温度曲线。
- [21] 集中支撑快速放气法的缺陷导向建模：放气换热、隔热、阀门开度与持续时间、听声或看压差关阀、传感器滞后以及初始压差均应进入模型说明或验证矩阵。
- [22] 支撑空气振动法后续的理想简谐运动与摩擦、黏性阻尼修正；在底层算法冻结前只作为建模来源登记。
- [23] 是快速放气法的公开真实操作和可见读数来源，不是团队实测数据集；引用时必须附时间点，参与调参后不再作为独立验证来源。
- [24] 是活塞振动法（Rüchardt 法）的官方英文实验与仪器来源；当前用于方法路线、仪器组成和结构对照，不作为软件实时数据模型已经完成的证据。
- 本轮数值校准的适用域限定为空气理想气体 `gammaTrue = 1.4`、标准 `18` 次打气首末跨度 `8s`，并开启生产默认的漏气、泵阀交换、热交换和其他真实影响因素。当前固定场景温度峰值约为 `1505.05mV`，验收下限仅为 `UT > 1500mV`，观测值不构成额外的上下限区间。其他气体或其他 `gammaTrue` 只要求共享方程保持质量/能量守恒、状态连续和定性趋势正确，不沿用本轮 Up、UT 或测得 gamma 的数值验收区间，直至取得相应真实仪器数据并建立独立校准集。
