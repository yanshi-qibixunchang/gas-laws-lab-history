# 热容硬球分子可视化两阶段设计

## 1. 范围调整

本方案按两个阶段推进。第一阶段只修正现有骨架模型的硬球分子可视化，不接入 Ultra GLB，不解除 Ultra 模式的可视化禁用，也不接入 Worker。第一阶段完成并通过验收后，第二阶段再复用同一套纯模拟模块，为 Ultra GLB 增加圆柱容器、空气墙、节点坐标、进出口适配，并解除 Ultra 开关禁用。

这个拆分的目的不是降低最终目标，而是先把分子运动本身做稳。只有正方体容器中的固定时间步、分子间碰撞、生成防重叠、温度和压差映射、物质量粒子数以及性能验收全部通过后，才进入更复杂的 GLB 圆柱空间。

## 2. 总体目标

1. 把硬球分子运动从 React/Three 渲染层抽成独立纯模块。
2. 第一阶段在现有骨架正方体容器中完成稳定硬球运动。
3. 第二阶段复用同一模块，为 Ultra GLB 提供圆柱容器配置和坐标适配。
4. 保持教学可视化定位，不改变热容比实验的物理计算、传感器读数、实验结果或数据记录结构。

## 3. 两阶段交付边界

### 3.1 第一阶段：骨架正方体硬球修正

第一阶段只覆盖当前已有骨架模型，也就是标准、均衡、性能这些非 Ultra 画质下的可视化。容器仍使用当前正方体范围，位置和整体视觉布局不做 GLB 适配。

第一阶段必须完成：

1. 独立纯模拟模块。
2. 固定时间步。
3. 正方体墙体碰撞。
4. 分子间硬球碰撞。
5. 生成防重叠。
6. 温度控制速度和颜色。
7. 压力差控制有效放气时的定向运动。
8. 物质量 `gasAmountRatio` 决定粒子数量。
9. 现有骨架模型接入新模块。
10. 自动测试和浏览器性能验收。

第一阶段明确不做：

1. 不接入 Ultra GLB。
2. 不新增圆柱容器。
3. 不读取 `glass_bottle_inner_air` 或任何 GLB 节点。
4. 不解除 Ultra 的可视化开关禁用。
5. 不接入 Worker。
6. 不模拟瓶颈、旋塞孔和外部管道。

### 3.2 第二阶段：Ultra GLB 圆柱适配

第二阶段必须以第一阶段的纯模拟模块为基础，不能重新写一套 Ultra 专用分子运动逻辑。Ultra 只新增容器配置、坐标换算和进出口适配。

第二阶段必须完成：

1. 圆柱容器配置。
2. 圆柱侧壁、顶部空气墙、底部空气墙。
3. `glass_bottle_inner_air` 节点坐标和尺寸读取。
4. Ultra 进气口和出气口锚点转换到容器局部坐标。
5. Ultra 模式下常驻圆柱主腔粒子。
6. Ultra 主界面和右侧栏可视化开关解禁。
7. Ultra 不同视角、侧栏缩放和窗口尺寸下的视觉验收。

第二阶段仍不做：

1. 不让粒子真实进入瓶颈、旋塞孔或软管内部碰撞。
2. 不使用 GLB 三角网格逐面碰撞、SDF 或第三方物理引擎。
3. 不新增用户可调的粒子数量、粒子尺寸或速度滑杆。

## 4. 第一阶段详细设计

### 4.1 模块边界

新增纯模块放在 domain 层，渲染层只负责把模拟结果画出来。

建议新增文件：

- `src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts`
  - 粒子状态类型。
  - 固定时间步推进。
  - 墙体碰撞。
  - 粒子间碰撞。
  - 生成、退出和数量调节。

- `src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts`
  - `box` 容器配置。
  - 第二阶段预留 `cylinder` 类型，但第一阶段不启用。
  - 采样、容器内判定、出口方向计算。

- `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`
  - 模拟核心测试。

- `tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts`
  - 几何与生成测试。

第一阶段修改文件：

- `src/domain/heatCapacity/heatCapacityHardSphereModel.ts`
  - 分离温度速度、压力流动速度和目标粒子数。

- `src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx`
  - 删除本文件内部的核心运动计算。
  - 只保留 Three 实例化渲染、材质、颜色写入和 React 生命周期。
  - 将每帧输入转换为纯模块输入，再把模块输出同步到 `InstancedMesh`。

- `tests/heatCapacity/heatCapacityHardSphereModel.test.ts`
  - 更新温度、压力、数量语义断言。

- `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - 只更新与骨架硬球模块相关的源代码断言，不改 Ultra 解禁断言。

### 4.2 纯模块输入输出

纯模块不依赖 React、Three、DOM 或浏览器时间。它只接收普通数据并返回普通数据。

建议核心类型：

```ts
export interface HeatCapacityHardSphereVec3 {
  x: number;
  y: number;
  z: number;
}

export interface HeatCapacityHardSphereParticle {
  id: number;
  position: HeatCapacityHardSphereVec3;
  velocity: HeatCapacityHardSphereVec3;
  state: 'inside' | 'exiting' | 'hidden';
  outflowProgress: number;
}

export interface HeatCapacityHardSphereBoxContainer {
  kind: 'box';
  halfSize: HeatCapacityHardSphereVec3;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}

export interface HeatCapacityHardSphereStepInput {
  dtS: number;
  targetParticleCount: number;
  thermalSpeedMultiplier: number;
  outflowActive: boolean;
  outflowDriftSpeed: number;
  exitSelectionRate: number;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
}
```

第一阶段只创建 `box` 容器实例。`cylinder` 类型可以在文件中预留，但不进入第一阶段运行路径。

### 4.3 固定时间步

模拟使用固定步长，渲染帧只向模拟器提供经过夹紧的累计时间。

```text
fixedDt = 1 / 120 s
maxSubSteps = 5
maxAccumulatedTime = fixedDt * maxSubSteps
```

原则：

- 正常帧按固定步推进。
- 长帧最多推进 5 个子步，剩余时间丢弃或截断，避免一次大步穿墙。
- 渲染层不直接用 `delta` 移动粒子。

### 4.4 正方体墙体碰撞

第一阶段保持当前正方体容器。当前骨架容器约为：

```text
halfSize = { x: 0.73, y: 0.73, z: 0.73 }
particleRadius = 0.048
```

每个轴独立处理：

1. 可用边界为 `halfSize[axis] - particleRadius`。
2. 粒子越界时先把位置夹回边界内。
3. 若速度朝外，则反转该轴速度。
4. 墙体碰撞不隐藏、不删除粒子。

### 4.5 分子间硬球碰撞

第一阶段必须加入分子间碰撞，而不是只做墙体反弹。

规则：

1. 两球距离小于 `2 * particleRadius` 时判定为重叠。
2. 先按法线方向把两球各推出一半重叠量。
3. 只有两球相向运动时才交换法向速度分量。
4. 切向速度保持不变。
5. 每个固定步执行 2 轮约束求解，降低密集状态下的残余穿插。
6. 速度向量出现非有限值时，使用粒子 id 的确定性方向重置，不能让 NaN 传播到渲染层。

第一阶段不引入空间哈希。128 个粒子的成对检测约 8128 对，先以简单可靠为主。只有性能验收失败，才在后续小修中增加宽相位。

### 4.6 生成防重叠

新增粒子时必须先找合法位置。

正方体采样规则：

```text
x = uniform(-usableHalfX, usableHalfX)
y = uniform(-usableHalfY, usableHalfY)
z = uniform(-usableHalfZ, usableHalfZ)
```

约束：

- 每个粒子最多尝试 24 个候选位置。
- 候选位置必须在容器内。
- 候选位置与现有 inside 粒子的距离必须大于 `2 * particleRadius`。
- 找不到位置时，本固定步延后生成，禁止强行叠放。
- 初始启用时也使用同一套防重叠生成逻辑。

### 4.7 温度速度和颜色绑定

继续复用现有颜色函数：

- `resolveHeatCapacityHardSphereTemperatureColor()`

继续由 `getHeatCapacityHardSphereVisualState()` 输出温度颜色因子，但需要调整语义：

- `thermalSpeedMultiplier` 只表示温度驱动的无规则热运动速度。
- 温度升高时，热运动速度增加，颜色向热端移动。
- 温度降低时，热运动速度降低，颜色向冷端移动。
- `gasAmountRatio` 不变时，温度变化不能改变 `targetParticleCount`。

第一阶段验收时必须覆盖：同一物质量下升温、降温、回温，粒子数不变但速度和颜色变化。

### 4.8 压力驱动放气

放气的定向流动独立于热运动速度。

启动条件：

```text
releaseFlowActive === true
stopcockFlowOpen === true
pressureDeltaKPa > 0.08
```

映射规则：

```text
pressureFactor = smoothstep(0.08 kPa, 6 kPa, max(pressureDeltaKPa, 0))
outflowDriftSpeed = lerp(0, maxOutflowSpeed, pressureFactor)
exitSelectionRate = lerp(minExitRate, maxExitRate, pressureFactor)
```

要求：

- 压差越大，出口方向速度越大。
- 压差越大，单位时间被选中离开的粒子越多。
- 压差为 0 或低于阈值时，即使旋塞打开，也不产生定向流动。
- 放气方向只在有效放气时附加到热运动上，不能污染热运动速度倍率。

### 4.9 物质量决定粒子数

粒子数量必须只代表 `gasAmountRatio`。

规则：

- `targetParticleCount` 由 `gasAmountRatio`、基础数量、夸张系数和画质倍率共同计算。
- 不再因为 `phase === 'pumping'` 临时增加目标粒子数。
- 打气时，物理状态中的 `gasAmountRatio` 增大，目标粒子数随之增大；新增粒子从泵入口附近出现。
- 放气时，物理状态中的 `gasAmountRatio` 减小，目标粒子数随之减小；减少的粒子通过出口动画离开。
- 温度导致的压强变化不直接改变粒子数。
- 压强重新平衡后，粒子数保持当前 `gasAmountRatio` 对应值，不恢复初始值。

### 4.10 性能验收

第一阶段不接入 Worker，所有模拟都在主线程执行，因此必须在骨架模型中完成性能验收。

自动验收：

- 128 粒子、固定步长、30 秒模拟不出现 NaN、越界或持续重叠。
- 每步碰撞检测次数有明确上限，不能随帧时间失控增长。
- 测试中验证长帧被 `maxSubSteps` 限制。

浏览器验收：

- 固定预览端口 `5174`。
- 标准、均衡、性能三个骨架画质都能打开硬球可视化。
- 连续观察 30 秒，粒子不穿墙、不边界消失、不出现明显长期重叠。
- 打气、放气、零压差开塞、升温、降温场景均符合上述规则。
- 128 粒子运行时界面交互仍可响应，拖动视角和切换模式不出现明显卡顿。

第一阶段完成后先停止，汇报测试和浏览器验收结果，再决定是否进入第二阶段。

## 5. 第二阶段详细设计

### 5.1 Ultra 容器适配

第二阶段新增 `cylinder` 容器配置，并复用第一阶段纯模块。

Ultra GLB 已存在 `glass_bottle_inner_air` 节点。运行时执行：

1. 计算该节点相对 `runtimeRootRef` 的矩阵。
2. 从相对矩阵取得位置、旋转和累计缩放。
3. 从节点几何包围盒计算缩放后的圆柱直径与高度。
4. 使用 `min(size.x, size.z) / 2` 作为内腔半径。
5. 从半径和半高分别扣除粒子半径及安全间隙。
6. 粒子组继承位置和旋转，但不继承非均匀缩放，避免球体变成椭球。

当前资源的参考测量值：

- 内腔中心：`[-1.4, 0.7625, 0]`
- 内腔直径：`0.97`
- 内腔高度：`1.265`
- 原始内半径：约 `0.485`
- 原始内半高：约 `0.6325`

这些值只用于诊断，运行时以 GLB 节点数据为准。

### 5.2 圆柱空气墙

圆柱容器由三类边界组成：

- 侧壁：`sqrt(x^2 + z^2) <= usableRadius`
- 底部空气墙：`y >= -usableHalfHeight`
- 顶部空气墙：`y <= usableHalfHeight`

常驻运动时顶部始终是空气墙。只有被标记为 `exiting` 的粒子可以忽略顶部空气墙，并沿出口动画离开。

### 5.3 Ultra 进出口

第二阶段将 GLB 锚点转换到 `glass_bottle_inner_air` 局部坐标。

要求：

- 打气新增粒子从进气口附近进入圆柱主腔。
- 放气粒子先向顶部出口靠近，再越过顶部空气墙并淡出。
- 不模拟瓶颈、旋塞孔和管道内碰撞。
- 出口点缺失时暂停 Ultra 粒子接入，不能使用猜测坐标。

### 5.4 Ultra 开关解禁

第二阶段通过浏览器验收后，删除 Ultra 专属不可用判断：

```ts
const hardSphereViewUnavailable = props.performanceMode === 'ultra';
```

同时删除右侧参数栏中 `settingsPerformanceMode === 'ultra'` 导致的强制禁用。保留其他已有参数锁定规则。

两个入口必须：

- 读取同一个 `activeFile.hardSphereViewEnabled`。
- 调用同一个 setter。
- 任意一处切换后，另一处立即同步。
- 保存并重新打开实验文件后恢复一致状态。

## 6. 测试计划

### 6.1 第一阶段测试

新增或更新：

- `tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts`
- `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`
- `tests/heatCapacity/heatCapacityHardSphereModel.test.ts`
- `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

必须断言：

1. 正方体采样全部在边界内。
2. 生成时不会与已有 inside 粒子重叠。
3. 墙体碰撞后位置合法，速度朝内。
4. 两粒子正碰后不重叠，法向速度交换。
5. 两粒子正在分离时不重复施加冲量。
6. 固定步长限制长帧推进次数。
7. 30 秒模拟无 NaN、无越界、无持续重叠。
8. 温度变化影响速度和颜色，不影响数量。
9. `gasAmountRatio` 变化影响数量。
10. 零压差开塞时 `outflowDriftSpeed === 0`。
11. 压差增大时 `outflowDriftSpeed` 和 `exitSelectionRate` 单调增大。
12. Ultra 禁用断言在第一阶段保持不变。

第一阶段验收命令：

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

### 6.2 第二阶段测试

新增或更新：

- `tests/heatCapacity/heatCapacityUltraGlbIntegration.test.ts`
- `tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts`
- `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

必须断言：

1. Ultra 从 `glass_bottle_inner_air` 读取圆柱尺寸。
2. 圆柱采样全部位于圆柱内。
3. 圆柱侧壁、顶部、底部碰撞稳定。
4. GLB 节点缺失或尺寸无效时不把粒子放到世界原点。
5. Ultra 主界面开关和右侧栏开关解除画质禁用。
6. Ultra 两个开关同步同一 `hardSphereViewEnabled` 状态。
7. 骨架正方体行为不因圆柱接入回归。

第二阶段验收命令与第一阶段相同，另加浏览器 Ultra 视觉验收。

## 7. 浏览器验收

固定预览命令：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

### 7.1 第一阶段浏览器验收

1. 在骨架模型中打开硬球可视化，粒子只在现有正方体容器范围内运动。
2. 连续观察 30 秒，粒子不穿墙、不在边界消失、不出现明显长期重叠。
3. 打气后粒子数随 `gasAmountRatio` 增加。
4. 高压放气时粒子向出口方向运动，压差越大越快。
5. 零压差开塞时粒子保持无规则运动，不被出口吸引。
6. 升温和降温只改变速度及颜色，不改变粒子数。
7. 放气后压力重新平衡，粒子数保持当前物质量对应值。
8. 切换标准、均衡、性能画质后，硬球可视化稳定运行。
9. 主线程交互仍可响应，视角拖动和模式切换没有明显卡顿。

### 7.2 第二阶段浏览器验收

1. Ultra 模式下粒子均匀分布在圆柱主腔，不进入瓶颈和瓶外。
2. 左右侧栏拖动、窗口缩放、默认视角和聚焦视角切换后，粒子仍跟随 GLB 内腔。
3. 打气时粒子从正确进气侧加入。
4. 高压放气时粒子向顶部出口运动并淡出。
5. 零压差开塞时没有定向流动。
6. 三维视图开关和右侧栏开关均可控制 Ultra 粒子显隐，并即时同步。
7. 亮色和暗色主题下粒子可辨识，但不遮挡玻璃瓶结构。

## 8. 实施顺序

### 8.1 第一阶段顺序

1. 新建纯几何和模拟模块。
2. 先写正方体采样、墙体碰撞、粒子碰撞测试。
3. 实现固定时间步和防重叠生成。
4. 调整视觉状态模型，分离热运动速度、压力流动速度和粒子数量。
5. 重构 `HeatCapacityHardSphereLayer.tsx`，让骨架模型使用纯模块。
6. 完成第一阶段自动测试。
7. 在 `5174` 完成骨架浏览器性能验收。
8. 停止并汇报第一阶段结果。

### 8.2 第二阶段顺序

1. 在纯几何模块中启用圆柱容器。
2. 为圆柱采样和碰撞补测试。
3. 在 Ultra 模型中读取 `glass_bottle_inner_air`。
4. 转换 Ultra 进气口和出气口锚点。
5. 接入 Ultra 圆柱粒子层。
6. 完成 Ultra 浏览器验收。
7. 解除 Ultra 主界面和右侧栏开关禁用。
8. 运行全量类型检查、测试、构建和浏览器验收。

## 9. 停止条件

### 9.1 第一阶段停止条件

1. 纯模拟模块必须依赖 React、Three 或 DOM 才能工作。
2. 128 粒子在主线程下无法通过浏览器性能验收。
3. 固定时间步后仍出现可复现穿墙、边界消失或明显长期重叠。
4. 现有 `gasAmountRatio` 在骨架模式下无法作为粒子数量事实来源。
5. 为解决性能问题必须引入 Worker。

### 9.2 第二阶段停止条件

1. `glass_bottle_inner_air` 节点不存在或尺寸无效。
2. GLB 内腔不是以局部 Y 轴为圆柱轴，导致当前圆柱配置无法正确对齐。
3. 进气口或出口锚点缺失，无法可靠确定局部坐标。
4. 粒子跟随 GLB 节点时随侧栏缩放或视角变化发生漂移。
5. 为实现粒子进入瓶颈或外部管道必须引入新的碰撞范围。

## 10. 最终验收标准

第一阶段完成时必须满足：

1. 骨架正方体容器内存在稳定硬球粒子运动。
2. 粒子不因墙体接触消失，不持续穿墙，不存在明显长期重叠。
3. 温度只控制热运动速度和颜色。
4. 压力差只控制有效放气时的定向流动强度。
5. 零压差开塞不产生定向运动。
6. 粒子数量反映物质量，并保留打气、放气后的历史差异。
7. Ultra 可视化仍保持禁用状态。
8. `npm.cmd exec tsc -- --noEmit`、`npm.cmd test` 和 `npm.cmd run build` 全部通过。
9. 固定端口 `5174` 完成第一阶段浏览器性能验收。

第二阶段完成时必须在第一阶段基础上继续满足：

1. Ultra 圆柱主腔内存在稳定常驻粒子。
2. Ultra 粒子跟随 GLB 内腔，不受窗口尺寸、左右栏缩放和聚焦视角影响。
3. Ultra 打气和放气使用正确的 GLB 进出口位置。
4. Ultra 主界面和右侧栏可视化开关可用且同步。
5. 骨架模型第一阶段行为不回归。
6. 全量类型检查、测试、构建和浏览器验收全部通过。
