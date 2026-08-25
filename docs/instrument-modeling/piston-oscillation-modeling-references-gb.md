# 活塞振动法底层物理模型参考文献

> 格式按 GB/T 7714 风格整理。网络资料访问日期按实际核验日期记录；项目映射口径更新于 2026-08-25。每条后附“本项目用途”，说明它在当前基础模型中对应哪一部分。本文件是项目内部来源索引，正式报告应引用下列直接来源，并按正文首次出现顺序重新编号。

## 参考文献

[1] PASCO SCIENTIFIC. Ratio of Specific Heats of a Gas: EX-5531A[EB/OL]. [2026-08-18]. https://cdn.pasco.com/lab_experiment/l_1301/EX-5531A-Ratio_of_Specific_Heats.pdf.

本项目用途：作为当前仪器和实验方法的官方实验依据。该资料说明通过按压并释放活塞产生快速、小振幅振动，记录绝对压强随时间的变化，在多个活塞高度下测量周期，并由活塞高度与周期平方的线性关系计算空气比热容比。本项目据此固定基础模型必须从同一物理状态同时生成活塞运动和压力曲线，并支持 `80、70、60、50、40、30 mm` 六个正式高度的连续实验数据；自由模式一轮最多选择六次测量。

[2] PASCO SCIENTIFIC. Heat Engine/Gas Law Apparatus Manual: TD-8572A[EB/OL]. [2026-08-18]. https://cdn.pasco.com/product_document/Heat-Engine-Gas-Law-Apparatus-Manual-TD-8572A.PDF.

本项目用途：作为仪器几何与机械边界条件的官方依据。该资料确认 TD-8572A 使用精密 Pyrex 气缸、超低摩擦石墨活塞、顶部质量平台、侧面锁紧螺钉和快接接口，并给出活塞直径 `32.5 mm`。本项目据此将气缸截面积固定为 `A = πd²/4`，并把软管接通或断开、锁紧螺钉状态、活塞高度和顶部随动组件统一纳入物理状态。

[3] PASCO SCIENTIFIC. PASPORT Dual Pressure Sensor Manual: PS-2181[EB/OL]. [2026-08-18]. https://cdn.pasco.com/product_document/PASPORT-Dual-Pressure-Sensor-Manual-PS-2181.pdf.

本项目用途：作为压力采集通道和采样边界的官方依据。该资料确认 PS-2181 可通过单个端口测量绝对压强，最高采样频率为 `1000 Hz`，并说明内部动态过采样程度随采样率变化。当前基础模型采用理想传感器，将真实气体绝对压强按独立的 `1000 Hz` 采样时钟输出，并实现下降穿越阈值触发；传感器响应滞后、采样率相关噪声和量化误差在取得真实仪器数据后另行标定。

[4] TORZO G, DELFITTO G, PECORI B, SCATTURIN P. A new microcomputer-based laboratory version of the Rüchardt experiment for measuring the ratio γ=Cp/Cv in air[J]. American Journal of Physics, 2001, 69(11): 1205-1210. DOI: 10.1119/1.1405505. https://www.labtrek.it/torzo/AJP_Ruchardt%202001.pdf.

本项目用途：作为非线性绝热气体弹簧、平衡压强和小振动极限的主要理论依据。该文从 `PV^γ = const`、活塞位移引起的体积变化 `ΔV = Ax` 和活塞受力出发，给出平衡压强 `P0 = Patm + mg/A`、气体弹簧的小振动频率以及周期计算关系。本项目基础模型保留完整的非线性绝热关系 `Pgas = P0(V0/V)^γ`，再由牛顿第二定律前向计算活塞位移、速度和压强；线性公式只用于数值验收和学生最终计算。

[5] SHEARWOOD C, SLOAN P A. The Rüchardt experiment revisited: using simple theory, accurate measurement and python based data analysis[J/OL]. European Journal of Physics, 2023, 44(3): 035102[2026-08-18]. DOI: 10.1088/1361-6404/acc5c2. https://arxiv.org/abs/2209.03323.

本项目用途：作为等效死体积、基础衰减振动和后续实测校准方法的依据。该研究实测到标尺体积之外约 `6 mL` 的气路和气缸底部附加体积，并通过多体积实验拟合阻尼振动的频率和衰减寿命。本项目据此在基础模型中显式保留非标尺密闭容积和线性阻尼，要求本轮各高度共享同一组可解释参数；高度相关阻尼、微漏和更复杂的低振幅摩擦留待真实数据校准阶段扩展。

[6] PASCO SCIENTIFIC. Heat Engine/Gas Law Apparatus: Model TD-8572, Instruction Manual and Experiment Guide, 012-06014B[EB/OL]. [2026-08-18]. https://www2.fisica.unlp.edu.ar/lef/lefweb/down_files/Termodinamica.pdf.

本项目用途：作为旧版同系列仪器结构和历史参数的对照来源。该手册所示旧铭牌给出活塞直径 `32.5 ± 0.1 mm`、活塞与平台总质量 `35.0 ± 0.6 g`。2026-08-25 用户提供的本机 TD-8572A 实物铭牌明确为 `48.5 ± 0.6 g`，因此旧版 `35.0 g` 不再作为本机正式质量，只用于解释旧模型快照。

[7] KNOX COLLEGE DEPARTMENT OF PHYSICS. Cp/Cv Ratio of an Ideal Gas: Physics 310 Laboratory[EB/OL]. [2026-08-18]. https://course.knox.edu/physics310/Labs/Lab_Cp_Cv_Ruchhardt_appx_S17.pdf.

本项目用途：作为同型号仪器在 Rüchardt 活塞振动实验中的历史独立核验。该资料说明质量口径必须覆盖活塞、活塞杆和顶部平台，而不能重复相加；其具体 `35.0 g` 数值属于所用器材版本，不覆盖本机铭牌的 `48.5 g`。

[8] PASCO SCIENTIFIC. Heat Engine and Gas Law Apparatus: TD-8572A[EB/OL]. [2026-08-25]. https://www.pasco.com/products/lab-apparatus/thermodynamics/heat-engine/td-8572.

本项目用途：作为当前产品规格与机械特性的官方依据。页面确认活塞直径 `32.5 mm`，并将活塞描述为超低摩擦石墨活塞、气缸描述为精密 Pyrex 气缸；基础模型因此不应把较大的干摩擦当成修正周期的主要手段。

[9] PASCO SCIENTIFIC. Thermodynamics: Ratio of Specific Heat Experiment EX-5631[EB/OL]. [2026-08-25]. https://tecnoedu.com/Download/CatalogoPasco.pdf.

本项目用途：作为同一 PASCO 实验套件非标尺密闭容积的独立先验。官方空气示例的 `h-T²` 直线截距约为 `-0.8359 cm`；按 `32.5 mm` 活塞直径换算，对应等效高度 `8.359 mm` 和非标尺密闭容积 `6.934 mL`。该体积用于覆盖软管、快接、压力传感器腔体和气缸底部未标尺空间，而不是把这些空间漏掉。

[10] MUNGAN C E. Entropic damping of the motion of a piston[J]. The Physics Teacher, 2017, 55(3): 180-183. DOI: 10.1119/1.4976666.

本项目用途：用于区分机械摩擦与气体自身的不可逆耗散。该研究说明即使假设活塞无滑动摩擦、气体无普通黏性或湍流，运动活塞附近的动态压强和热力学过程仍可使振动衰减。因此压力包络不能全部归因于库仑摩擦。

[11] LIANG J W. Identifying Coulomb and viscous damping from free-vibration acceleration decrements[J]. Journal of Sound and Vibration, 2005, 282(3-5): 1208-1220. DOI: 10.1016/j.jsv.2004.04.034.

本项目用途：作为混合耗散判据的依据。黏性阻尼表现为近似指数衰减，库仑摩擦表现为极值近似等量下降，并可能在小振幅阶段占主导；本项目据此先校准早期指数包络，再决定是否有证据加入独立干摩擦项。

## 建模使用说明

- [1] 和 [4] 共同支撑基础主链路：活塞位移改变密封体积，非线性绝热关系产生气体压强，压强差通过牛顿第二定律驱动活塞运动，压力曲线和三维动画来自同一个物理状态。
- [2] 支撑固定几何和仪器状态边界：活塞直径与正式模型尺寸保持固定，软管、锁紧螺钉、手部支撑和机械限位决定当前方程采用密封、通大气、锁定或自由运动状态。
- [3] 支撑当前理想采集层：物理压强不经过经验造波，按独立采样时钟形成正式 Run，并在下降穿越阈值后写入数据。
- [4] 支撑严格平衡关系和线性验收关系。物理引擎使用 `P0 = Patm + mg/A` 保证平衡位置处合力为零；实验计算窗口可继续采用教学流程规定的计算压力近似。
- [5] 支撑 `h0` 和基础线性阻尼。二者必须作为全组共享参数校准，不能为每个高度分别调整以强行贴合曲线。
- [6] 和 [7] 只保留旧版 `35.0 g` 历史口径；本机实物铭牌直接固定玻璃气缸内径 `32.5 mm`、运动总成质量 `48.5 g`，覆盖石墨活塞、活塞杆和顶部平台。铭牌允差分别为 `±0.1 mm` 和 `±0.6 g`。TD-8572A 随器材附带的 `200 g` 砝码用于热机举重实验，是平台外载荷，不计入本项目活塞振动法的默认运动总成质量。
- [5] 和 [9] 共同支撑基础非标尺密闭容积。正式 `V_dead = 6.934 mL` 包括软管、快接通道、传感器腔体和气缸底部未标尺空间，对应等效高度 `8.359 mm`。
- 当前基础模型的内部可调参数至少包括环境温度、环境绝对压强、运动组件总质量、空气比热容比、非标尺密闭容积、按压初始条件和基础线性阻尼；默认运动质量取 `0.0485 kg`。仪器直径、刻度和几何行程保持固定。
- 按上述名义参数，活塞自重对应的平衡压强增量为 `mg/A ≈ 0.573 kPa`。因此物理引擎严格采用 `P0 = Patm + mg/A`；教学计算继续采用大气压近似时，物理模拟压强和教学规定压强仍须分别保存和解释。
- [8]、[10] 和 [11] 共同约束耗散建模：机械摩擦不是基础周期校准参数；早期包络优先用速度相关或热力学耗散解释，只有尾部出现稳定的等量衰减、正负不对称或突然停滞时才引入独立库仑/静摩擦模型。
