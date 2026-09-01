# Heat Capacity Hard-Sphere Visual Release Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化骨架模型硬球小球可视化的打气、放气和后续开放交换表现，让它用夸张但不突兀的方式反映实验数值，同时降低电源开启、放气和长时间运行时的 CPU 压力。  
**Architecture:** 保留真实热容实验状态机和自由模式物理计算不变，只在硬球可视化层增加“确定性视觉时间线”。真实实验数据继续决定压力、温度、物质量等目标值；小球层只消费这些目标值，按固定时间线生成入流/出流预算。  
**Tech Stack:** TypeScript, React, Three.js, @react-three/fiber, Vite, Node test scripts.

---

## Scope

本次只处理骨架模型的小球可视化。

- 不接入 Ultra GLB 圆柱容器。
- 不解除 Ultra GLB 的硬球可视化禁用。
- 不改变实验真实数值、评分、采样、记录按钮和数据表逻辑。
- 不接入 Worker。
- 不改发布版本、GitHub Release 或自动更新仓库。

## Current Root Cause

当前卡顿和“不真实感”主要来自三个点：

1. `HeatCapacityHardSphereLayer.tsx` 中的 `releaseExitBudget` 仍然由逐帧的 `amountCurrentRatio` 差值和目标粒子数差值驱动。帧率下降时，每帧推进少，视觉放气就会被拉长。
2. `heatCapacityHardSphereSimulation.ts` 为了稳定碰撞用了固定步长和最大子步限制，低帧率时最多只补一小段模拟时间。这个设计能保护 CPU，但不适合承担“放气应在固定现实时间内完成”的职责。
3. 放气阶段仍然同时保留压力差吸引、出流粒子选择、目标粒子数裁剪、尾流等多套机制，导致压力清零或状态切换时容易出现“突然少很多”“又补回来”“速度像卡住”的视觉结果。

## Desired Behavior

Confirmed decisions:

- Use `stopcockFlowOpen === true` as the release start point.
- Use a 3-8s bounded visual estimate for post-release exchange.
- This round only changes skeleton-model hard-sphere visualization.

打气：

- 小球不再因为目标数量上升而凭空出现。
- 打气时从打气阀门连接口附近喷入，按确定的入流速率补充粒子。
- 如果用户快速重复打气，已有入流动画继续推进，新补入的小球加入同一个入流队列。

主放气：

- 玻璃旋塞开启动画完成后，才启动放气视觉判断。
- 启动时一次性确定放气时间、需要离开的小球数、离开速率和粒子出流速度。
- 主放气必须是视觉上的快速爆发：大部分需要离开的粒子要在很短时间内被选中并朝瓶口方向运动，让用户立即看到明显的定向放气和数量减少。
- 出流数量按预先确定的时间线推进，不再每帧按压力差重新计算。
- 停止条件为：放气时间结束、压力差已经归零、用户开始关闭旋塞。
- 如果用户提前关闭旋塞，只保留已经按时间离开的小球数，不做补偿、不刷新、不偷偷重排瓶内粒子。

后续开放交换：

- 如果用户一直不关闭旋塞，并且主放气结束后压力差已经约等于 0，但温度仍在恢复，瓶内粒子可以继续缓慢向外交换。
- 交换数量只使用主放气后剩余的少量视觉余量，不能抢走主放气的表现重点。
- 交换速率固定且不需要很明显，持续到 3-8s 的估算热恢复时间结束，或用户开始关闭旋塞。
- 当交换结束后，瓶内剩余粒子继续自然热运动，不再定向流出。

## Design

### 1. Add a visual release schedule helper

Create a small pure helper, preferably:

`src/domain/heatCapacity/heatCapacityHardSphereReleaseSchedule.ts`

It should export visual-only types and builders:

```ts
export type HeatCapacityHardSphereVisualFlowPhase =
  | 'idle'
  | 'main-release'
  | 'partial-stopped'
  | 'post-release-exchange'
  | 'complete';

export interface HeatCapacityHardSphereVisualFlowSchedule {
  id: string;
  phase: HeatCapacityHardSphereVisualFlowPhase;
  elapsedS: number;
  durationS: number;
  progress: number;
  targetExitCount: number;
  expectedExitedCount: number;
  exitSpeed: number;
  stopReason: 'none' | 'duration-complete' | 'pressure-equalized' | 'stopcock-closing';
}
```

Rules:

- `expectedExitedCount = floor(targetExitCount * progress)` is based on wall-clock schedule progress, not physics substeps.
- `targetExitCount` is computed from amount-ratio change and the existing visual exaggeration constants.
- `exitSpeed` is constant per phase. Main release uses a faster value; post-release exchange uses a slower value.
- Pressure difference can decide whether a main release should start and can stop it when it reaches the equilibrium threshold, but it should not continuously drive per-frame speed.

Main release allocation:

- Compute a visual `totalPlannedExitCount` from the visible amount change, then split it into `mainBurstExitCount` and `postExchangeExitCount`.
- First implementation values:
  - If `totalPlannedExitCount >= 10`, allocate 78-88% to `mainBurstExitCount`.
  - If `totalPlannedExitCount < 10`, allocate all but 0-2 particles to `mainBurstExitCount`.
  - Cap `postExchangeExitCount` to a small tail, normally 2-8 particles, so the slow phase is visible only when the user watches closely.
- Main burst duration should stay short, approximately 0.18-0.32s.
- At least 60% of `mainBurstExitCount` should be selected for outlet motion in the first 80ms after `stopcockFlowOpen`; the particles still disappear only after moving through the outlet, not by instant hiding.
- Main release exit speed should be deliberately high enough that the first wave visibly leaves the bottle. Use a fixed visual speed band, for example 4.2-5.6 scene units per second, then tune by browser QA.
- Post-release exchange duration uses the accepted 3-8s estimate and a much lower fixed speed, for example 1.0-1.6 scene units per second.

### 2. Use `stopcockFlowOpen` as the start signal

Use the existing `stopcockFlowOpen === true` signal as “旋塞动画完成并允许流动”的 start gate.

Reason:

- Free mode already has a delayed flow signal for the stopcock, so this avoids coupling the hard-sphere layer to model-specific animation frames.
- It keeps skeleton and later Ultra behavior consistent: render layer receives “flow is open”, not “animation angle is X”.

If a later visual QA finds the start is still early, adjust the existing flow-open delay constant instead of adding another delay inside the hard-sphere simulation.

### 3. Decouple release count from particle simulation

Modify `HeatCapacityHardSphereLayer.tsx` so it owns flow accounting refs:

- active schedule id
- cumulative expected exited count
- cumulative actually submitted exit count
- active phase

Each frame:

1. Build or receive the current visual schedule.
2. Calculate `frameExitBudget = expectedExitedCount - submittedExitCount`.
3. Submit only that budget to `stepHeatCapacityHardSphereSimulation`.
4. Never use `previousTargetParticleCount - currentVisual.targetParticleCount` as an immediate trim fallback during scheduled release.

This ensures slow frames catch up by submitting the missing exit budget on the next frame, instead of stretching a 0.2s release into several seconds.

### 4. Make simulation consume explicit budgets

Modify `heatCapacityHardSphereSimulation.ts` so scheduled outflow is explicit:

```ts
releaseExitBudget?: number;
releaseExitSpeed?: number;
releaseSelectionMode?: 'none' | 'outlet';
```

Behavior:

- If `releaseExitBudget > 0`, select up to that many inside particles and mark them as `exiting`.
- Existing hidden/inside count reconciliation should not immediately create replacement particles during release or post-release exchange.
- Exiting particles should move toward the outlet with `releaseExitSpeed`, not with pressure-difference speed.
- Sorting by outlet priority should happen only when selecting a batch, not as a continuous per-frame pressure operation.

### 5. Keep pump entry deterministic and non-instant

Use the current `entering` state as the pump-entry path, but make target-count growth respect a visual entry budget.

Rules:

- If target particle count increases because of pumping, hidden particles enter from `pumpPortPoint`.
- Entry budget is based on fixed visual rate and accumulated fractional budget, not an instant while-loop fill.
- Initial render may still fill immediately so opening a file does not show an empty container.
- During ordinary pumping, new particles should not spawn at random interior positions.

### 6. Estimate post-release exchange cheaply

Do not run another expensive thermal simulation for the small balls.

Add a bounded visual helper:

```ts
estimateHeatCapacityHardSphereExchangeDurationS({
  gasTemperatureK,
  ambientTemperatureK,
  minS,
  maxS,
}): number
```

Suggested rule:

- Treat small temperature difference as no visible exchange.
- Map larger temperature difference to a 3-8s visual duration.
- Clamp hard to avoid long-running visual outflow.

For open-vessel final target:

- Main release equalizes pressure visually.
- Post-release exchange target should approach the room-temperature open equilibrium, normally represented visually as amount ratio close to `1`.
- The exact real calculation remains owned by the free thermal model; this helper only decides how many particles to animate out after pressure already looks balanced.

### 7. Remove contradictory old visual paths

After the schedule path is in place, clean up only directly related old logic:

- Remove or bypass pressure-driven `exitSelectionRate` during scheduled release.
- Remove target-count-delta trimming as a release fallback.
- Keep natural thermal speed and color smoothing.
- Keep the collision solver and fixed time step.

No broad cleanup outside hard-sphere visualization.

## Implementation Tasks

### Task 1: Pure schedule tests

Files:

- Create `tests/heatCapacity/heatCapacityHardSphereReleaseSchedule.test.ts`
- Create `src/domain/heatCapacity/heatCapacityHardSphereReleaseSchedule.ts`

Test first:

- main release computes fixed duration and fixed target exit count from amount before/current/target.
- main release allocates most particles to the fast burst and only a small tail to post-release exchange.
- main release selects at least 60% of its burst budget within the first 80ms.
- progress maps monotonically to `expectedExitedCount`.
- pressure-equalized stop freezes the schedule without adding replacement count.
- stopcock-closing stop preserves the partial emitted count.
- post-release exchange computes a bounded 3-8s duration and a smaller, slower outflow.

### Task 2: Layer accounting refactor

Files:

- Modify `src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx`
- Modify `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

Work:

- Replace frame-to-frame amount delta release budget with schedule-based cumulative budget.
- Reset flow accounting only when schedule id or phase changes.
- Make slow frames catch up by budget difference.
- Ensure no budget is submitted when stopcock is closed or phase is idle.

### Task 3: Simulation budget consumption

Files:

- Modify `src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts`
- Modify `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`

Work:

- Add explicit release speed input.
- Use outlet-priority batch selection only when consuming budget.
- Keep exiting particles moving toward outlet and hiding only after crossing the visual outlet/occlusion threshold.
- Prevent target-count reconciliation from spawning replacements during scheduled release.

### Task 4: Pump entry smoothing

Files:

- Modify `src/domain/heatCapacity/heatCapacityHardSphereSimulation.ts`
- Modify `tests/heatCapacity/heatCapacityHardSphereSimulation.test.ts`

Work:

- Keep immediate initial fill.
- For later increases, use `entering` particles from `pumpPortPoint`.
- Accumulate fractional entry budget so repeated pump actions are smooth.
- Verify particle radius stays constant and no particle appears in-place inside the vessel during pump entry.

### Task 5: Visual smoke and performance check

Commands:

```powershell
node .\tests\heatCapacity\heatCapacityHardSphereReleaseSchedule.test.ts
node .\tests\heatCapacity\heatCapacityHardSphereSimulation.test.ts
node .\tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Browser checks at `http://127.0.0.1:5174/`:

- Enable hard-sphere visualization on the skeleton model.
- Turn power on and confirm there is no obvious CPU stall.
- Pump: particles enter from the pump port, color and speed transition continuously.
- Open stopcock: particles move quickly toward the bottle outlet, count decreases over the intended visual duration.
- During the first main-release burst, most particles that will leave should visibly start moving toward the outlet almost immediately.
- Let pressure reach zero while stopcock remains open: no full refresh, no sudden refill, only optional slow post-release exchange.
- Close stopcock mid-release: release stops and keeps only the already-lost particles.

## Acceptance Criteria

- 打气不会导致粒子数量突变式凭空增加。
- 放气不会因为低帧率被明显拖慢。
- 主放气首段要足够快：打开旋塞后立即出现一波朝瓶口方向运动的粒子，并在短时间内看到明显数量减少。
- 后续慢速交换只占少量余量，不能让主放气显得拖沓。
- 压差归零时瓶内剩余小球不会重新刷新位置。
- 小球大小不因放气或补气改变。
- 关闭旋塞中断放气后，粒子数按已过去时间保留，不补偿。
- 温度颜色变化仍是连续过渡，不突变。
- 电源开启后没有持续 CPU 占用飙升或长时间卡顿。
- `npm.cmd test` 和 `npm.cmd exec tsc -- --noEmit` 通过。

## Risks

- 如果真实实验数值本身在很短时间内完成跳变，小球颜色仍可能跟随目标值很快变化。解决方式是在渲染层继续保留现有显示态 smoothing，而不是改真实数据。
- 如果出口视觉位置和骨架容器出口不完全对齐，出流方向需要微调 `outletPoint` / `outletDirection`，但这仍限定在骨架小球容器配置。
- 如果粒子数上限 128 在高性能档仍偏重，可以先限制 scheduled release 的 batch size，再做性能模式差异化。

## Execution Handoff

建议按任务顺序执行。每完成一个任务就运行该任务对应测试；完成 Task 5 后停下给用户视觉验收，不自动上传 GitHub。

Implementation options:

1. Inline execution in this session.
2. Subagent-driven execution with one subagent for schedule/model tests and one subagent for simulation/render integration.
