# Heat Capacity Hard-Sphere Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正现有骨架模型的硬球分子可视化，先把正方体容器中的硬球碰撞做成可验收的稳定模型，再继续温度、压差和物质量语义修正。

**Architecture:** 第一阶段分成 1A 和 1B。1A 只抽出纯模拟模块并把新的正方体墙体碰撞、分子间碰撞、固定时间步和防重叠生成接入骨架渲染层，随后在浏览器暂停给用户视觉验收。1B 在用户确认后继续调整 `getHeatCapacityHardSphereVisualState()` 和渲染适配，使温度只控制热运动速度和颜色，压差只控制有效放气，`gasAmountRatio` 只控制粒子数。

**Tech Stack:** TypeScript, React, Three.js, @react-three/fiber, Node test runner via project `.test.ts` files, Vite preview on port `5174`.

---

## Scope Gates

第一阶段禁止修改 Ultra 接入范围：

- 不读取 `glass_bottle_inner_air`。
- 不启用圆柱容器。
- 不解除 Ultra 主界面或右侧栏的可视化禁用。
- 不接入 Worker。
- 不引入第三方物理引擎。

强制断点：

- 完成 Task 1 到 Task 4 后停止。
- Task 4 必须启动 `http://127.0.0.1:5174/`，让用户自己检查骨架小球的新碰撞逻辑和卡顿情况。
- 未得到用户明确继续指令前，不执行 Task 5 及后续任务。

## File Structure

- Create: `src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts`
  - 纯数据向量工具、正方体容器、正方体采样、正方体边界碰撞。
  - 第一阶段不暴露运行中的圆柱逻辑。

- Create: `src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts`
  - 纯硬球模拟状态、固定时间步、生成防重叠、粒子间碰撞、退出状态推进。
  - 不依赖 React、Three、DOM。

- Modify: `src/domain/heatCapacity/heatCapacityHardSphereModel.ts`
  - 断点前只做兼容所需的最小类型导出。
  - 断点后再分离 `thermalSpeedMultiplier`、`outflowDriftSpeed`、`exitSelectionRate` 和目标粒子数语义。

- Modify: `src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx`
  - 断点前把核心运动迁移到纯模拟模块，保留现有 visual state 输入和材质表现。
  - 断点后消费新的温度、压差、物质量字段。

- Modify: `tests/heatCapacity/heatCapacityHardSphereModel.test.ts`
  - 断点后更新旧断言，删除“pumping 阶段临时增加目标粒子数”的旧期待。

- Create: `tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts`
  - 正方体容器和边界测试。

- Create: `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`
  - 生成、固定步长、墙体碰撞、分子间碰撞、长期稳定测试。

- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - 更新源代码结构断言，让其检查纯模拟模块已被骨架层使用。
  - 第一阶段保留 Ultra 禁用断言。

## Task 1: 正方体几何纯模块

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts`
- Create: `tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts` 中覆盖以下行为：

```ts
import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereBoxContainer,
  isHeatCapacityHardSphereInsideContainer,
  resolveHeatCapacityHardSphereWallBounce,
  sampleHeatCapacityHardSpherePosition,
  type HeatCapacityHardSphereParticle,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts';

const container = createHeatCapacityHardSphereBoxContainer({
  halfSize: { x: 0.73, y: 0.73, z: 0.73 },
  outletPoint: { x: 0, y: 0.7132, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: -0.67, y: 0.28, z: 0.26 },
});
const radius = 0.048;

for (let index = 0; index < 128; index += 1) {
  const position = sampleHeatCapacityHardSpherePosition(container, radius, index * 17 + 3);
  assert.equal(isHeatCapacityHardSphereInsideContainer(container, position, radius), true);
}

const particle: HeatCapacityHardSphereParticle = {
  id: 1,
  position: { x: 0.9, y: 0, z: 0 },
  velocity: { x: 0.54, y: 0, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
resolveHeatCapacityHardSphereWallBounce(container, particle, radius);
assert.equal(particle.position.x <= 0.73 - radius, true);
assert.equal(particle.velocity.x < 0, true);
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereGeometry.test.ts
```

Expected: FAIL，提示新增模块或导出函数不存在。

- [ ] **Step 3: 实现几何模块**

在 `src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts` 中实现这些导出：

```ts
export interface HeatCapacityHardSphereVec3 {
  x: number;
  y: number;
  z: number;
}

export type HeatCapacityHardSphereParticleState = 'inside' | 'exiting' | 'hidden';

export interface HeatCapacityHardSphereParticle {
  id: number;
  position: HeatCapacityHardSphereVec3;
  velocity: HeatCapacityHardSphereVec3;
  state: HeatCapacityHardSphereParticleState;
  outflowProgress: number;
}

export interface HeatCapacityHardSphereBoxContainer {
  kind: 'box';
  halfSize: HeatCapacityHardSphereVec3;
  outletPoint: HeatCapacityHardSphereVec3;
  outletDirection: HeatCapacityHardSphereVec3;
  pumpPortPoint: HeatCapacityHardSphereVec3;
}

export type HeatCapacityHardSphereContainer = HeatCapacityHardSphereBoxContainer;
```

必须包含以下函数名：

```ts
export const createHeatCapacityHardSphereBoxContainer = (...): HeatCapacityHardSphereBoxContainer => ...;
export const isHeatCapacityHardSphereInsideContainer = (...): boolean => ...;
export const sampleHeatCapacityHardSpherePosition = (...): HeatCapacityHardSphereVec3 => ...;
export const resolveHeatCapacityHardSphereWallBounce = (...): void => ...;
```

实现规则：

- `sampleHeatCapacityHardSpherePosition()` 使用确定性种子，不调用 `Math.random()`。
- `resolveHeatCapacityHardSphereWallBounce()` 对 `x/y/z` 三轴独立夹紧并反向朝外速度。
- 所有向量工具保持本文件私有，避免扩大 API。

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereGeometry.test.ts
```

Expected: PASS，无输出或只输出测试脚本自身结果。

- [ ] **Step 5: 提交**

```powershell
git add src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts tests/heatCapacity/heatCapacityHardSphereGeometry.test.ts
git commit -m "feat: add hard-sphere box geometry"
```

## Task 2: 固定时间步与分子间碰撞纯模拟

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts`
- Modify: `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`，测试以下行为：

```ts
import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereBoxContainer,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts';
import {
  createHeatCapacityHardSphereSimulation,
  stepHeatCapacityHardSphereSimulation,
  getHeatCapacityHardSphereVisibleParticles,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts';

const container = createHeatCapacityHardSphereBoxContainer({
  halfSize: { x: 0.73, y: 0.73, z: 0.73 },
  outletPoint: { x: 0, y: 0.7132, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: -0.67, y: 0.28, z: 0.26 },
});

const simulation = createHeatCapacityHardSphereSimulation({
  maxParticles: 128,
  particleRadius: 0.048,
  container,
  seed: 41,
});

stepHeatCapacityHardSphereSimulation(simulation, {
  dtS: 0.2,
  targetParticleCount: 64,
  thermalSpeedMultiplier: 1,
  outflowActive: false,
  outflowDriftSpeed: 0,
  exitSelectionRate: 0,
  pumpFlowActive: false,
  pumpFlowIntensity: 0,
});

assert.equal(simulation.lastSubStepCount <= 5, true);
assert.equal(getHeatCapacityHardSphereVisibleParticles(simulation).length, 64);
```

同文件再覆盖：

- 两个粒子重叠时被分开。
- 两个相向粒子的法向速度交换。
- 30 秒模拟后没有 NaN，没有越界，没有持续重叠。

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereSimulation.test.ts
```

Expected: FAIL，提示模拟模块不存在。

- [ ] **Step 3: 实现模拟模块**

`src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts` 必须导出：

```ts
export interface HeatCapacityHardSphereSimulation {
  particles: HeatCapacityHardSphereParticle[];
  accumulatorS: number;
  lastSubStepCount: number;
  seed: number;
}

export interface HeatCapacityHardSphereSimulationOptions {
  maxParticles: number;
  particleRadius: number;
  container: HeatCapacityHardSphereContainer;
  seed: number;
}

export interface HeatCapacityHardSphereSimulationStepInput {
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

必须导出函数：

```ts
export const createHeatCapacityHardSphereSimulation = (...): HeatCapacityHardSphereSimulation => ...;
export const stepHeatCapacityHardSphereSimulation = (...): void => ...;
export const getHeatCapacityHardSphereVisibleParticles = (...): HeatCapacityHardSphereParticle[] => ...;
```

实现要求：

- 固定步长为 `1 / 120`。
- 每帧最多 5 个子步。
- 新增粒子用 Task 1 的正方体采样，最多尝试 24 次防重叠。
- 粒子间碰撞执行 2 轮位置修正和法向速度交换。
- 非有限位置或速度必须用确定性方向恢复。
- 断点前实现 `outflowActive` 输入但只保持现有方向运动语义，不做最终压力映射重构。

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereSimulation.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts
git commit -m "feat: add hard-sphere particle simulation"
```

## Task 3: 骨架粒子层接入新模拟模块

**Files:**
- Modify: `src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: 写源结构断言**

在 `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts` 中增加断言：

```ts
assert.match(
  hardSphereLayerSource,
  /createHeatCapacityHardSphereSimulation/,
  'hard-sphere layer should create the reusable pure simulation state',
);
assert.match(
  hardSphereLayerSource,
  /stepHeatCapacityHardSphereSimulation/,
  'hard-sphere layer should step particles through the pure simulation module',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /const resolveWallBounce =/,
  'hard-sphere layer should no longer own wall collision logic',
);
```

保留 Ultra 禁用相关断言，不删除 `hardSphereViewUnavailable` 断言。

- [ ] **Step 2: 运行相关测试并确认失败**

Run:

```powershell
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL，提示层文件未接入新模拟模块。

- [ ] **Step 3: 重构 `HeatCapacityHardSphereLayer.tsx`**

改动要求：

- 删除层内 `ParticleSeed` 的核心运动职责。
- 删除层内 `resolveWallBounce`。
- 保留材质、颜色、`InstancedMesh` 写入和启停隐藏逻辑。
- 用 `useRef` 保存 `HeatCapacityHardSphereSimulation`。
- 创建正方体容器：

```ts
const SKELETON_HARD_SPHERE_CONTAINER = createHeatCapacityHardSphereBoxContainer({
  halfSize: { x: 0.73, y: 0.73, z: 0.73 },
  outletPoint: { x: 0, y: 0.73 - 0.048 * 0.35, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: -0.67, y: 0.28, z: 0.26 },
});
```

- `useFrame` 中调用：

```ts
stepHeatCapacityHardSphereSimulation(simulation, {
  dtS: safeDelta,
  targetParticleCount: currentVisual.targetParticleCount,
  thermalSpeedMultiplier: currentVisual.speedMultiplier,
  outflowActive: outflowVisuallyActive,
  outflowDriftSpeed: effectiveOutflowIntensity,
  exitSelectionRate: effectiveOutflowIntensity,
  pumpFlowActive: pumpFlowActive || (pumpBulbState === 'compressing' && pumpValveOpen),
  pumpFlowIntensity,
});
```

- 断点前不要重写 `getHeatCapacityHardSphereVisualState()` 语义。
- 输出矩阵时只遍历模拟模块的粒子状态。
- 粒子状态为 `hidden` 时 scale 为 0。

- [ ] **Step 4: 跑相关测试**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereGeometry.test.ts
node .\tests\heatCapacity\heatCapacityHardSphereSimulation.test.ts
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 5: 跑类型检查**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected: PASS。

- [ ] **Step 6: 提交**

```powershell
git add src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
git commit -m "refactor: use pure hard-sphere simulation in scene"
```

## Task 4: 断点 A，骨架碰撞浏览器验收

**Files:**
- No source edits unless Task 4 finds a blocking compile issue.

- [ ] **Step 1: 运行断点前自动验证**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
```

Expected: 三个命令全部 PASS。

- [ ] **Step 2: 启动固定端口预览**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected: Vite 在 `http://127.0.0.1:5174/` 启动。若端口被占用，先定位占用进程并按仓库规则处理，不改端口。

- [ ] **Step 3: 浏览器断点检查清单**

打开：

```text
http://127.0.0.1:5174/
```

只验收骨架模型：

- 标准、均衡、性能画质下可打开硬球可视化。
- 粒子在现有正方体容器内运动。
- 连续观察 30 秒，不出现明显穿墙、边界消失、长时间重叠。
- 拖动视角、切换自由/引导/演示模式时不明显卡顿。
- 当前阶段不检查 Ultra。
- 当前阶段不要求温度、压差、物质量语义已经最终修正。

- [ ] **Step 4: 暂停并报告**

在最终或中间回复中报告：

```text
断点 A 已到达。预览地址：http://127.0.0.1:5174/
请先视觉验收骨架小球碰撞和卡顿情况。未确认前不会继续 Task 5。
```

- [ ] **Step 5: 提交断点状态**

若 Step 1 到 Step 3 没有新增代码修复，本任务不需要提交。若有修复：

```powershell
git add <fixed files>
git commit -m "fix: stabilize hard-sphere collision checkpoint"
```

## Task 5: 视觉状态语义重构

**Gate:** 只有用户确认断点 A 通过后才能执行。

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityHardSphereModel.ts`
- Modify: `tests/heatCapacity/heatCapacityHardSphereModel.test.ts`

- [ ] **Step 1: 写语义测试**

更新 `tests/heatCapacity/heatCapacityHardSphereModel.test.ts`，加入并调整断言：

```ts
assert.equal(
  heatedSameAmount.targetParticleCount,
  ambient.targetParticleCount,
  'temperature alone should not change hard-sphere molecule count',
);
assert.equal(
  noPressureOpen.outflowActive,
  false,
  'zero pressure difference should not create directed outflow even when the stopcock is open',
);
assert.equal(
  highPressureRelease.outflowDriftSpeed > lowPressureRelease.outflowDriftSpeed,
  true,
  'larger pressure difference should create faster directed release drift',
);
```

删除或改写旧断言：

- `active pump flow should show at least triple the previous inlet-particle emphasis`
- `demo pumping should visibly accelerate the shared particle layer`
- 其他把 pumping 阶段直接等同于数量或速度奖励的断言。

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereModel.test.ts
```

Expected: FAIL，提示新字段不存在或旧语义仍生效。

- [ ] **Step 3: 修改 visual state 类型和计算**

在 `HeatCapacityHardSphereVisualState` 中加入：

```ts
thermalSpeedMultiplier: number;
outflowDriftSpeed: number;
exitSelectionRate: number;
```

保留 `speedMultiplier` 作为兼容字段时，赋值为 `thermalSpeedMultiplier`，直到渲染层完成切换。

实现规则：

- `targetParticleCount` 只由 `gasAmountRatio` 和 `particleMultiplier` 决定。
- `phase === 'pumping'` 不再额外增加 `baseCount`。
- 温差只影响 `thermalSpeedMultiplier` 和 `temperatureColorFactor`。
- 有效放气条件仍为 `releaseFlowActive === true && stopcockFlowOpen === true && Math.abs(pressureDeltaKPa) > 0.08`。
- `outflowDriftSpeed` 和 `exitSelectionRate` 随压差单调增加。

- [ ] **Step 4: 运行模型测试**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereModel.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/domain/heatCapacity/heatCapacityHardSphereModel.ts tests/heatCapacity/heatCapacityHardSphereModel.test.ts
git commit -m "fix: separate hard-sphere visual physics inputs"
```

## Task 6: 渲染层消费新语义

**Files:**
- Modify: `src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: 写源结构断言**

在 `workbenchHeatCapacityInstrumentUi.test.ts` 中断言：

```ts
assert.match(
  hardSphereLayerSource,
  /thermalSpeedMultiplier/,
  'hard-sphere layer should drive random molecular motion from thermal speed only',
);
assert.match(
  hardSphereLayerSource,
  /outflowDriftSpeed/,
  'hard-sphere layer should pass pressure-driven outflow drift separately',
);
assert.match(
  hardSphereLayerSource,
  /exitSelectionRate/,
  'hard-sphere layer should pass pressure-driven exit selection separately',
);
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL，提示渲染层还未消费新字段。

- [ ] **Step 3: 修改渲染层输入映射**

`stepHeatCapacityHardSphereSimulation()` 的输入改为：

```ts
stepHeatCapacityHardSphereSimulation(simulation, {
  dtS: safeDelta,
  targetParticleCount: currentVisual.targetParticleCount,
  thermalSpeedMultiplier: currentVisual.thermalSpeedMultiplier,
  outflowActive: currentVisual.outflowActive,
  outflowDriftSpeed: currentVisual.outflowDriftSpeed,
  exitSelectionRate: currentVisual.exitSelectionRate,
  pumpFlowActive: pumpFlowActive || (pumpBulbState === 'compressing' && pumpValveOpen),
  pumpFlowIntensity,
});
```

要求：

- 温度变化不通过 `outflowDriftSpeed` 表达。
- 压差变化不通过 `thermalSpeedMultiplier` 表达。
- 粒子材质颜色仍由 `temperatureColorFactor` 驱动。

- [ ] **Step 4: 运行相关测试**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereModel.test.ts
```

Then run:

```powershell
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
git commit -m "fix: drive hard-sphere scene from separated inputs"
```

## Task 7: 第一阶段完整自动验证

**Files:**
- No source edits unless verification exposes a bug.

- [ ] **Step 1: 运行阶段测试**

Run:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereGeometry.test.ts
node .\tests\heatCapacity\heatCapacityHardSphereSimulation.test.ts
node .\tests\heatCapacity\heatCapacityHardSphereModel.test.ts
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 2: 运行全量验证**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
```

Expected: 全部 PASS。

- [ ] **Step 3: 检查 Ultra 禁用仍保留**

Run:

```powershell
Select-String -Path src/features/heatCapacity/HeatCapacityInstrumentScene.tsx -Pattern "hardSphereViewUnavailable = props.performanceMode === 'ultra'"
Select-String -Path tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts -Pattern "Ultra GLB tier should mark the hard-sphere teaching layer unavailable"
```

Expected: 两条都能找到匹配。

- [ ] **Step 4: 修复验证问题**

若有失败，只修复与第一阶段范围直接相关的问题，不做 Ultra 或 Worker 改动。修复后重复 Step 1 到 Step 3。

- [ ] **Step 5: 提交验证修复**

若 Step 4 有改动：

```powershell
git add <fixed files>
git commit -m "fix: complete hard-sphere stage one verification"
```

## Task 8: 第一阶段最终浏览器验收

**Files:**
- No source edits unless browser verification exposes a first-stage bug.

- [ ] **Step 1: 启动预览**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected: `http://127.0.0.1:5174/` 可访问。

- [ ] **Step 2: 骨架模型验收**

在浏览器执行：

- 标准、均衡、性能画质分别打开硬球可视化。
- 观察 30 秒，确认无明显穿墙、边界消失、长期重叠。
- 执行打气，粒子数随物质量增加。
- 高压放气，粒子朝出口方向运动，压差越大越快。
- 零压差开塞，不出现出口吸引。
- 升温、降温只改变速度和颜色，不改变粒子数。
- 拖动视角和切换模式，界面无明显卡顿。

- [ ] **Step 3: 报告第一阶段结果**

报告中必须包含：

```text
第一阶段已完成。
预览地址：http://127.0.0.1:5174/
Ultra 仍保持禁用，未接入圆柱容器，未接入 Worker。
```

- [ ] **Step 4: 等待用户决定**

第一阶段完成后停止。用户决定下一步：

- 继续第二阶段 Ultra 圆柱适配。
- 先调小球碰撞参数或性能策略。
- 回滚某个第一阶段提交。
