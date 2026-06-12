# Ultra 圆柱硬球分子可视化设计

## 1. 目标

为热容比实验的 Ultra GLB 高级模型增加常驻硬球分子可视化，使粒子只在玻璃瓶圆柱主腔内运动，并满足以下要求：

1. 粒子与圆柱侧壁、顶部空气墙、底部空气墙以及其他粒子发生稳定碰撞。
2. 正常运行时粒子不会因接触边界而消失，不会长期穿墙或明显重叠。
3. 粒子的无规则运动速度和颜色由气体温度决定。
4. 打开玻璃旋塞且瓶内压力高于环境压力时，粒子产生朝瓶颈出口的定向放气运动；压力差越大，流出越快。
5. 压力差为零时，即使玻璃旋塞打开，粒子也只保持无规则热运动，不产生定向流动。
6. 粒子数量表示瓶内气体物质的量，打气和实际放气可以改变数量，单纯升温或降温不能改变数量。
7. 三维视图开关和右侧参数栏开关继续共享 `hardSphereViewEnabled`，Ultra 模式不再额外禁用。

本功能是教学可视化，不改变热容比实验的物理计算、传感器读数、实验结果或数据记录结构。

## 2. 已确认范围

### 2.1 本期包含

- 只模拟 Ultra GLB 玻璃瓶的圆柱主腔。
- 在圆柱顶部设置不可见空气墙，瓶颈和管道不参与常驻碰撞空间。
- 放气时，被选中的粒子从主腔向顶部出口移动，越过瓶颈遮挡位置后才从画面隐藏。
- 标准、均衡和性能骨架模型继续使用现有长方体容器，不改变当前外观与位置。
- Ultra 模型从 `glass_bottle_inner_air` 节点读取位置、方向和有效尺寸，不使用屏幕坐标或固定世界坐标。

### 2.2 本期不包含

- 不模拟粒子进入瓶颈、旋塞孔和外部软管后的逐段碰撞。
- 不使用 GLB 三角网格逐面碰撞、SDF 或物理引擎。
- 不改变现有实验物理状态机。
- 不增加粒子数量、粒子尺寸或速度的用户调节项。
- 不为可视化开关增加新的持久化字段。

## 3. 设计原则

### 3.1 物理状态是唯一事实来源

视觉层读取现有状态：

- `gasAmountRatio`：决定目标粒子数量。
- `gasTemperatureK` 和 `ambientTemperatureK`：决定无规则热运动速度及颜色。
- `pressureDeltaKPa`：决定放气定向速度。
- `stopcockFlowOpen` 和 `releaseFlowActive`：决定是否允许定向放气。
- `pumpFlowActive`：决定新增粒子是否从进气口附近出现。

视觉层不得自行修改实验物理状态，也不得根据动画阶段临时增加或减少目标粒子数量。

### 3.2 热运动与定向流动分离

每个粒子的运动由两部分组成：

```text
最终位移 = 温度驱动的无规则热运动 + 压差驱动的出口定向运动
```

- 温度只能改变无规则运动速度和颜色。
- 压力差只能在旋塞确认导通并存在实际放气时增加出口方向速度。
- 当 `pressureDeltaKPa <= 0.08 kPa` 时，定向流动强度必须为零。

这样可以避免“开盖就自动吸向出口”，也不会把高温误表现为更强放气。

### 3.3 粒子数量表示物质的量

目标粒子数只由 `gasAmountRatio` 和画质性能倍率计算：

```text
physicalCount = map(gasAmountRatio)
renderedCount = clamp(round(physicalCount * performanceMultiplier), min, max)
```

具体约束：

- `gasAmountRatio` 不变时，升温和降温不改变粒子数。
- 打气导致 `gasAmountRatio` 增大后，粒子从进气口分批加入。
- 放气导致 `gasAmountRatio` 减小后，粒子通过出口动画分批离开。
- 压强恢复平衡后，粒子数保持当前物质的量对应的数量，不强制恢复初始值。
- 移除现有视觉模型中仅因 `pumping` 阶段临时增加粒子数的分支；打气动画只改变新增粒子的出生位置和加入速率。

## 4. 容器几何

### 4.1 统一容器接口

新增纯数据容器配置，供粒子生成、墙体碰撞和出口计算共同使用：

```ts
export type HeatCapacityHardSphereContainerProfile =
  | {
      kind: 'box';
      halfSize: THREE.Vector3;
      outletPoint: THREE.Vector3;
      outletDirection: THREE.Vector3;
      pumpPortPoint: THREE.Vector3;
    }
  | {
      kind: 'cylinder';
      radius: number;
      halfHeight: number;
      outletPoint: THREE.Vector3;
      outletDirection: THREE.Vector3;
      pumpPortPoint: THREE.Vector3;
    };
```

骨架模型继续使用 `box`。Ultra 模型使用 `cylinder`。

### 4.2 Ultra 圆柱尺寸来源

Ultra GLB 已存在 `glass_bottle_inner_air` 节点。运行时执行：

1. 计算该节点相对 `runtimeRootRef` 的矩阵。
2. 从相对矩阵取得位置、旋转和累计缩放。
3. 从节点几何包围盒计算缩放后的圆柱直径与高度。
4. 使用 `min(size.x, size.z) / 2` 作为内腔半径。
5. 从半径和半高分别扣除粒子半径及安全间隙。
6. 粒子组继承位置和旋转，但不继承非均匀缩放，避免球体变成椭球。

当前资源的测量值约为：

- 内腔中心：`[-1.4, 0.7625, 0]`
- 内腔直径：`0.97`
- 内腔高度：`1.265`
- 原始内半径：约 `0.485`
- 原始内半高：约 `0.6325`

这些值只作为测试和异常诊断参考，运行时以 GLB 节点数据为准。

### 4.3 空气墙

圆柱碰撞空间由三个不可见边界组成：

- 侧壁：`sqrt(x^2 + z^2) <= usableRadius`
- 底部：`y >= -usableHalfHeight`
- 顶部：`y <= usableHalfHeight`

常驻运动时顶部始终是空气墙。只有被标记为 `exiting` 的粒子可以忽略顶部空气墙，并沿出口动画离开。

## 5. 碰撞模型

### 5.1 固定时间步

渲染帧率不直接作为物理步长。粒子模拟使用累加器和固定步长：

```text
fixedDt = 1 / 120 s
maxSubSteps = 5
maxAccumulatedTime = fixedDt * maxSubSteps
```

长帧只执行有限子步，避免页面卡顿后粒子一次跨越墙体。

### 5.2 圆柱墙体碰撞

侧壁碰撞：

1. 计算径向距离 `r = sqrt(x^2 + z^2)`。
2. 若 `r > usableRadius`，把位置投影回圆柱边界。
3. 法向量为 `n = normalize([x, 0, z])`。
4. 仅当速度朝墙外运动时执行镜面反射：`v' = v - 2(v·n)n`。

顶部和底部碰撞分别夹紧 `y`，再反转对应的 `velocity.y`。墙体碰撞不删除粒子。

### 5.3 粒子之间的硬球碰撞

粒子采用等质量、近似完全弹性碰撞：

1. 检测球心距离是否小于 `2 * particleRadius`。
2. 对重叠量进行对半位置修正，先消除可见穿插。
3. 仅当两球相向运动时，沿碰撞法线交换法向速度分量。
4. 切向速度保持不变。
5. 每个固定步执行两轮约束求解，减少密集状态下的残余重叠。

最大粒子数为 128，首版直接执行成对检测。单帧最多约 8128 对，复杂度可控，也比引入空间哈希更容易验证。只有性能验收表明该检测成为瓶颈时，才增加均匀网格宽相位。

### 5.4 生成时防重叠

新增粒子采用圆柱体积均匀采样：

```text
radius = sqrt(random) * usableRadius
angle = random * 2PI
y = uniform(-usableHalfHeight, usableHalfHeight)
```

每个候选位置最多尝试 24 次，并检查与当前粒子的距离。找不到合法位置时，本帧延后生成，禁止把粒子强行放进已有粒子内部。

## 6. 温度映射

继续复用：

- `getHeatCapacityHardSphereVisualState()`
- `resolveHeatCapacityHardSphereTemperatureColor()`

温度映射保持现有范围：

- 冷端：环境温度以下约 `5 K`
- 热端：环境温度以上约 `3 K`
- 速度倍率：按温差连续插值并夹紧
- 颜色：继续区分亮色和暗色主题

实现时需要调整 `getHeatCapacityHardSphereVisualState()`：

- `speedMultiplier` 只表达热运动速度和画质倍率。
- 放气的压力速度不再混入 `speedMultiplier`，改为独立的 `outflowDriftSpeed`。
- `targetParticleCount` 不再受动画阶段的临时数量奖励影响。

## 7. 放气动画

### 7.1 启动条件

定向放气必须同时满足：

```text
releaseFlowActive === true
stopcockFlowOpen === true
pressureDeltaKPa > 0.08
```

玻璃旋塞仅视觉上打开、尚未达到确认导通状态时，不提前启动粒子流动。

### 7.2 压差到速度的映射

使用连续且有上限的映射：

```text
pressureFactor = smoothstep(0.08 kPa, 6 kPa, max(pressureDeltaKPa, 0))
outflowDriftSpeed = lerp(0, maxOutflowSpeed, pressureFactor)
exitSelectionRate = lerp(minExitRate, maxExitRate, pressureFactor)
```

效果要求：

- 刚超过阈值时只有较弱定向趋势。
- 压差越大，靠近出口的粒子越快被选中，流出速度也越快。
- 压差降到阈值以下后，停止选取新粒子流出；尚未越过出口的粒子恢复正常碰撞。
- 压差为零时，出口吸引力、定向速度和流出选择率全部为零。

### 7.3 出口动画

- 出口点优先由 Ultra GLB 的瓶颈或旋塞入口锚点转换到 `glass_bottle_inner_air` 局部坐标。
- 被选中的粒子先向圆柱顶部中心区域汇聚，再穿过顶部空气墙。
- 粒子到达瓶颈遮挡区后缩小并隐藏，视觉上表现为进入瓶颈，而不是在圆柱边界瞬间消失。
- 已经离开的粒子不在视觉层自动补回；是否需要新增粒子只由最新 `gasAmountRatio` 决定。

## 8. 打气与数量变化

当物理状态使目标粒子数增加时：

- `pumpFlowActive === true`：新增粒子从 Ultra 进气口锚点附近生成，初速度朝圆柱内部。
- 非打气情况下的状态恢复或首次启用：新增粒子在圆柱内部无重叠生成。
- 每帧生成数量有限，防止大量粒子同一帧堆叠。

当目标粒子数减少时：

- 存在有效放气：通过出口动画减少。
- 不存在有效放气但状态因文件恢复或模式切换发生跳变：按离出口最近的顺序短时淡出，但不得在墙体碰撞时消失。

## 9. 开关行为

### 9.1 三维视图开关

删除 Ultra 专属不可用判断：

```ts
const hardSphereViewUnavailable = props.performanceMode === 'ultra';
```

Ultra 与其他画质使用相同的 `hardSphereViewEnabled`。开关关闭时不渲染粒子，打开时根据当前物理状态重新建立正确数量和温度表现。

### 9.2 右侧参数栏开关

删除 `settingsPerformanceMode === 'ultra'` 导致的强制禁用。保留其他模式已有的参数锁定规则，避免扩大本次修改范围。

两个入口必须：

- 读取同一个 `activeFile.hardSphereViewEnabled`。
- 调用同一个 setter。
- 任意一处切换后，另一处立即同步。
- 保存并重新打开实验文件后恢复一致状态。

## 10. 文件边界

### 新增

- `src/features/heatCapacity/heatCapacityHardSphereContainer.ts`
  - 容器配置类型。
  - 圆柱和长方体采样。
  - 墙体碰撞。
  - 容器内判定。

- `src/features/heatCapacity/heatCapacityHardSphereCollision.ts`
  - 固定时间步辅助函数。
  - 粒子间重叠修正和弹性碰撞。

- `tests/heatCapacity/heatCapacityHardSphereContainer.test.ts`
  - 几何、采样和墙体碰撞测试。

- `tests/heatCapacity/heatCapacityHardSphereCollision.test.ts`
  - 粒子间碰撞和长期稳定测试。

### 修改

- `src/domain/heatCapacity/heatCapacityHardSphereModel.ts`
  - 分离热运动速度、压力流动速度和物质量粒子数。

- `src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx`
  - 接收容器配置。
  - 使用固定步长、圆柱墙体和粒子碰撞。
  - 使用配置中的出口及进气口。

- `src/features/heatCapacity/HeatCapacityInstrumentScene.tsx`
  - 骨架模型传入现有长方体配置。
  - 取消 Ultra 可视化开关禁用。

- `src/features/heatCapacity/HeatCapacityUltraInstrumentModel.tsx`
  - 从 `glass_bottle_inner_air` 创建圆柱配置。
  - 跟随 GLB 节点变换。

- `src/features/workbench/WorkbenchStudioPrototype.tsx`
  - 取消右侧参数栏中 Ultra 专属禁用。

- `tests/heatCapacity/heatCapacityHardSphereModel.test.ts`
  - 更新数量、温度速度和压差流动断言。

- `tests/heatCapacity/heatCapacityUltraGlbIntegration.test.ts`
  - 验证圆柱节点绑定和回退规则。

- `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - 删除 Ultra 禁用旧断言，增加双入口同步和可用性断言。

## 11. 测试标准

### 11.1 数值测试

1. 随机生成 128 个粒子，所有球体整体位于圆柱内。
2. 侧壁碰撞后位置合法、径向速度反向、速度模长近似不变。
3. 顶部和底部碰撞后粒子不会越界。
4. 两球正碰后法向速度交换，碰撞后无明显重叠。
5. 两球正在分离时不重复施加冲量。
6. 模拟 30 秒后不存在非退出粒子越界、NaN 或持续重叠。
7. 温度变化时颜色和热运动速度变化，但目标粒子数不变。
8. `gasAmountRatio` 变化时目标粒子数单调变化。
9. 压差为零且旋塞打开时 `outflowDriftSpeed === 0`。
10. 压差增大时 `outflowDriftSpeed` 和 `exitSelectionRate` 单调增大并保持上限。

### 11.2 UI 和集成测试

1. Ultra 模式的两个可视化开关均不再因画质档位而禁用。
2. 两个开关同步控制同一状态。
3. 骨架模型仍使用原长方体范围。
4. Ultra 使用 `glass_bottle_inner_air` 节点，不存在固定屏幕位置计算。
5. GLB 节点缺失或包围盒无效时，隐藏 Ultra 粒子层并输出开发警告，不把粒子错误放到世界原点。

## 12. 浏览器验收

固定预览命令：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

预览地址：

```text
http://127.0.0.1:5174/
```

验收场景：

1. Ultra 模式初始状态下，粒子均匀分布在圆柱主腔，不进入瓶颈和瓶外。
2. 连续观察至少 30 秒，不出现穿墙、边界消失、球体明显长期重叠或位置跳变。
3. 左右侧栏拖动、窗口缩放、默认视角和聚焦视角切换后，粒子仍跟随 GLB 内腔。
4. 打气时粒子从正确进气侧加入，数量随 `gasAmountRatio` 增加。
5. 高压放气时出现明显向上流动，初始压差更大的场景流出更快。
6. 压差降到零后保持开塞，粒子恢复无规则运动，不继续被出口吸引。
7. 升温时颜色趋向热端且速度提高，降温时颜色趋向冷端且速度降低，数量不因温度改变。
8. 放气后即使压力重新平衡，粒子数量保持当前物质的量对应值，不自动恢复初始数量。
9. 三维视图开关和右侧栏开关均能控制粒子显隐，并即时同步。
10. 亮色和暗色主题下粒子均可辨识，但不会遮挡玻璃瓶结构。

## 13. 实施顺序

1. 先完成纯函数圆柱几何、固定步长和粒子碰撞，并以数值测试证明稳定。
2. 再重构现有粒子层，使骨架模型通过统一容器接口运行，确认原有效果不变。
3. 接入 Ultra 的 `glass_bottle_inner_air` 节点和圆柱配置，完成常驻粒子。
4. 接入温度颜色及热运动速度，验证数量不受温度影响。
5. 接入压力驱动放气和打气出生位置。
6. 最后解除两个 Ultra 开关禁用并更新旧测试断言。
7. 运行全量类型检查、测试、构建和浏览器视觉验收。

## 14. 停止条件

出现以下任一情况时暂停实现并重新确认，不使用固定坐标掩盖问题：

1. `glass_bottle_inner_air` 节点不存在或尺寸无效。
2. GLB 内腔不是以局部 Y 轴为圆柱轴，导致当前圆柱配置无法正确对齐。
3. 现有 `gasAmountRatio` 在某个模式下没有随打气或放气更新，无法作为粒子数量事实来源。
4. 为实现粒子进入瓶颈或外部管道必须引入新的几何碰撞范围。
5. 粒子碰撞在 Ultra 档位产生可复现的明显帧率下降，需要引入空间哈希或降低求解频率。

## 15. 最终验收标准

本功能完成时必须同时满足：

1. Ultra 圆柱主腔内存在稳定、常驻的硬球粒子运动。
2. 常驻粒子不因墙体接触消失，不持续穿墙，不存在明显长期重叠。
3. 温度只控制热运动速度和颜色。
4. 压力差只控制有效放气时的定向流动强度。
5. 零压差开塞不产生定向运动。
6. 粒子数量反映物质的量，并保留打气、放气后的历史差异。
7. 两个可视化开关在 Ultra 模式可用且状态同步。
8. 骨架模型现有视觉行为不回归。
9. `npm.cmd exec tsc -- --noEmit`、`npm.cmd test` 和 `npm.cmd run build` 全部通过。
10. 在固定端口 `5174` 完成不同尺寸、侧栏布局、主题和实验阶段的真实浏览器验收。
