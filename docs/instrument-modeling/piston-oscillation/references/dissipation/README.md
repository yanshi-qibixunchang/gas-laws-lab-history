# 活塞耗散来源存档（2026-11-15）

## 绝热缸内耗散

MUNGAN C E. Damped oscillations of a frictionless piston in an adiabatic cylinder enclosing an ideal gas. European Journal of Physics, 2017, 38: 035102. DOI: https://doi.org/10.1088/1361-6404/aa6054.

原文：`Mungan-2017-adiabatic-piston.pdf`，8 页。作者所在机构提供：https://www.usna.edu/Users/physics/mungan/_files/documents/Publications/EJP22.pdf 。

公式 (3) 的动态压强为 P̃=P[1−v√(8M/(πRT))]。在本软件的截面积 A 下，其速度阻力系数为 b=AP√(8M/(πRT))；气体能量方程用 dU/dt=−PAv+bv²，绝热时外界热流为零。阻力与加热使用同一系数，避免机械能凭空消失。

原文采用单原子气体、外侧真空等假设。本项目增加外侧大气压和活塞重力，空气热容采用 R/(γ−1)。这是文献模型在本仪器几何下的教学应用，并非本机耗散实测。293.15 K、平衡压强约 101.898 kPa、直径 32.5 mm 时，空气 b≈0.4651、氦气 b≈0.1729 N·s/m；它们是随压强和温度变化的系数，不是人为指定停止时刻。

## 真实装置的总衰减

SHEARWOOD C, SLOAN P A. The Rüchardt experiment revisited: using simple theory, accurate measurement and python based data analysis. European Journal of Physics, 2023, 44: 035102. DOI: https://doi.org/10.1088/1361-6404/acc5c2.

存档为作者 2022 年预印本 `Shearwood-Sloan-2022-preprint.pdf`，24 页，https://arxiv.org/pdf/2209.03323 。这是预印本，不标作出版社最终版。其第 13 页图 4（期刊版对应图 5）给出 60 mL 示例：空气振幅衰减到 1/e 的时间约 0.5 s，氦气约 0.2 s。1/e 时间不是振动停止时间；图中实际装置的总体衰减也不能当成纯绝热缸内阻力。

本软件 Real 继续由热交换、原等效线性损耗、松手不同步损耗和传感器共同产生曲线。没有把上述绝热阻力重复叠加到已标定的 Real 总损耗上。该论文支撑真实氦气可比空气衰减快的趋势，不提供本机可直接照抄的全部参数。

PDF 保存在项目中供研究核查。论文版权归原权利人；软件仅展示书目信息及模型用途，不将论文全文打包为开源组件许可。
