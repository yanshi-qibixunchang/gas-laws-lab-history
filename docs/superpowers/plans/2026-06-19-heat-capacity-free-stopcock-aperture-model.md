# Heat Capacity Free Stopcock Aperture Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Free Mode 放气阀建立“有效开度随开阀时间平滑增长”的物理模型，使极短放气按真实开阀时长计算，并让短开阀错误相比当前模型产生更明显偏离。

**Architecture:** 保留现有压缩气体放气主公式，只在流量系数前乘以 `aperture(openElapsedS)` 的时间积分平均值。新增独立的 stopcock aperture 纯函数模块，物理引擎只消费“本子步等效满开时间”，测试 harness 不再把 `0.03s` 这类短开阀吞成 `0.05s`。

**Tech Stack:** TypeScript, Node test runner via `node tests/...`, Vite project validation via `npm.cmd exec tsc -- --noEmit` and `npm.cmd test`.

---

## File Structure

- Create: `src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts`
  - 只负责有效开度、smoothstep、解析积分和区间平均开度。
- Create: `tests/heatCapacity/heatCapacityFreeStopcockApertureModel.test.ts`
  - 验证公式、积分、边界、可加性和无 NaN。
- Modify: `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`
  - 在 `stepOpenState` 的每个放气子步内使用区间积分开度。
  - 保持热交换用真实 `dtS`，只让放气流量用 `effectiveOpenDtS`。
- Modify: `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`
  - 增加短开阀、单调性、关闭后无继续流动、高频乱点稳定性测试。
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts`
  - 移除 `STOPCOCK_CLICK_STEP_S = 0.05` 对物理开阀时间的强制吞并。
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`
  - 增加 `0.03s` 和 `0.05s` 确实按真实物理时长计算的回归测试。
- Modify: `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`
  - 如需要，重标定默认 `stopcockFlowRate`。
- Modify: `src/features/workbench/workbenchState.ts`
  - 同步默认 `stopcockFlowRate`，保持新建文件和参数草稿一致。
- Modify: `tests/heatCapacity/heatCapacityFreeSixClassValidation.test.ts`
  - 锁定短开阀偏离更明显、标准操作仍通过；`<0.1s` 和 `>2.5s` 是否诊断判错留到 UI/诊断阶段。
- Modify: `docs/instrument-modeling/heat-capacity-free-mode-six-class-baseline-results.md`
  - 更新最终数值。
- Modify: `docs/instrument-modeling/heat-capacity-free-mode-six-class-validation-plan.md`
  - 更新放气阀有效开度测试口径。

---

### Task 1: 建立有效开度纯函数

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts`
- Create: `tests/heatCapacity/heatCapacityFreeStopcockApertureModel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import {
  FREE_STOPCOCK_APERTURE_RAMP_S,
  getFreeStopcockAperture,
  integrateFreeStopcockAperture,
  getFreeStopcockApertureEffectiveDtS,
} from '../../src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts';

const expectClose = (actual: number, expected: number, tolerance: number, message: string) => {
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${message}: got ${actual}, expected ${expected}`);
};

assert.equal(FREE_STOPCOCK_APERTURE_RAMP_S, 0.1);
assert.equal(getFreeStopcockAperture(-1), 0);
assert.equal(getFreeStopcockAperture(0), 0);
expectClose(getFreeStopcockAperture(0.05), 0.5, 1e-12, '0.05s should be half-open by smoothstep');
assert.equal(getFreeStopcockAperture(0.1), 1);
assert.equal(getFreeStopcockAperture(1), 1);

expectClose(integrateFreeStopcockAperture(0.03), 0.002295, 1e-9, '0.03s integral');
expectClose(integrateFreeStopcockAperture(0.05), 0.009375, 1e-9, '0.05s integral');
expectClose(integrateFreeStopcockAperture(0.1), 0.05, 1e-12, '0.1s integral');
expectClose(integrateFreeStopcockAperture(0.35), 0.3, 1e-12, '0.35s integral');

expectClose(
  getFreeStopcockApertureEffectiveDtS(0, 0.03),
  0.002295,
  1e-9,
  'effective dt for first 0.03s',
);
expectClose(
  getFreeStopcockApertureEffectiveDtS(0.03, 0.02),
  integrateFreeStopcockAperture(0.05) - integrateFreeStopcockAperture(0.03),
  1e-12,
  'interval integral should be additive',
);
expectClose(
  getFreeStopcockApertureEffectiveDtS(0.2, 0.02),
  0.02,
  1e-12,
  'after ramp the aperture should be fully open',
);

console.log('heatCapacityFreeStopcockApertureModel tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeStopcockApertureModel.test.ts
```

Expected: FAIL because `heatCapacityFreeStopcockApertureModel.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const FREE_STOPCOCK_APERTURE_RAMP_S = 0.1;

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

const clampNonNegative = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

export const getFreeStopcockAperture = (openElapsedS: number) => {
  const x = clampUnit(clampNonNegative(openElapsedS) / FREE_STOPCOCK_APERTURE_RAMP_S);
  return x * x * (3 - 2 * x);
};

export const integrateFreeStopcockAperture = (openElapsedS: number) => {
  const elapsedS = clampNonNegative(openElapsedS);
  const rampS = FREE_STOPCOCK_APERTURE_RAMP_S;
  const rampElapsedS = Math.min(elapsedS, rampS);
  const x = rampElapsedS / rampS;
  const rampIntegralS = rampS * (x * x * x - 0.5 * x * x * x * x);
  return rampIntegralS + Math.max(0, elapsedS - rampS);
};

export const getFreeStopcockApertureEffectiveDtS = (
  openElapsedBeforeS: number,
  dtS: number,
) => {
  const startS = clampNonNegative(openElapsedBeforeS);
  const endS = startS + clampNonNegative(dtS);
  return Math.max(0, integrateFreeStopcockAperture(endS) - integrateFreeStopcockAperture(startS));
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeStopcockApertureModel.test.ts
```

Expected: PASS.

---

### Task 2: 接入物理引擎放气积分

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts`
- Modify: `tests/heatCapacity/heatCapacityFreePhysicsEngine.test.ts`

- [ ] **Step 1: Write failing physics tests**

Add tests that start from the same above-ambient state and compare open durations:

```ts
const createAboveAmbientReleaseState = (): HeatCapacityFreePhysicsState => ({
  ...createDefaultFreePhysicsState(baseConfig),
  gasAmountRatio: 1.08,
  gasTemperatureK: baseConfig.environment.ambientTemperatureK,
});

const releaseFor = (durationS: number) => stepFreePhysics(
  createAboveAmbientReleaseState(),
  baseConfig,
  { ...controls, stopcockOpen: true },
  durationS,
  200 + durationS,
);

const lossFor = (durationS: number) => {
  const before = createAboveAmbientReleaseState();
  const after = releaseFor(durationS);
  return before.gasAmountRatio - after.gasAmountRatio;
};

const loss003 = lossFor(0.03);
const loss005 = lossFor(0.05);
const loss010 = lossFor(0.1);
const loss035 = lossFor(0.35);

assert.equal(loss003 > 0, true, '0.03s should still create a real but small release');
assert.equal(loss003 < loss005 && loss005 < loss010 && loss010 < loss035, true, 'release loss should increase with open duration');
assert.equal(
  loss003 / loss035 < 0.03 / 0.35 * 0.35,
  true,
  '0.03s loss should be much smaller than the old full-aperture proportional duration',
);
```

Add high-frequency state-machine test:

```ts
let flicker = createAboveAmbientReleaseState();
let atS = 300;
for (let index = 0; index < 20; index += 1) {
  const stopcockOpen = index % 2 === 0;
  atS += 0.015;
  flicker = stepFreePhysics(flicker, baseConfig, { ...controls, stopcockOpen }, 0.015, atS);
  assert.equal(Number.isFinite(flicker.gasAmountRatio), true);
  assert.equal(Number.isFinite(flicker.gasTemperatureK), true);
  assert.equal(flicker.currentStopcockOpenDurationS >= 0, true);
}
const afterFlicker = stepFreePhysics(flicker, baseConfig, controls, 0.2, atS + 0.2);
assert.equal(afterFlicker.currentStopcockOpenDurationS, 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

Expected: FAIL because current open flow uses full coefficient for the whole step.

- [ ] **Step 3: Implement aperture-weighted flow**

Implementation rules:

- Import `getFreeStopcockApertureEffectiveDtS`.
- In `stepFreePhysics`, compute `stopcockOpenElapsedBeforeS` before constructing `openedBaseState`:

```ts
const stopcockOpenElapsedBeforeS = controls.stopcockOpen
  ? (wasStopcockOpen ? environmentState.currentStopcockOpenDurationS : 0)
  : 0;
```

- Change `stepOpenState` signature to accept `openElapsedBeforeS`.
- Inside each `FREE_OPEN_FLOW_MAX_SUBSTEP_S` substep:
  - use real `stepS` for thermal exchange;
  - use `effectiveFlowDtS = getFreeStopcockApertureEffectiveDtS(openElapsedS, stepS)` for open-flow amount only;
  - increment `openElapsedS += stepS`.
- Do not use step-end aperture.
- Do not let closing continue flow.
- Preserve existing `releaseReference` behavior.

- [ ] **Step 4: Run physics tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
```

Expected: PASS.

---

### Task 3: 修正测试 harness 的短开阀吞并

**Files:**
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeParameterAcceptance.test.ts`

- [ ] **Step 1: Write failing acceptance test**

Add deterministic scenarios with `environmentDisturbanceEnabled: false` and `instrumentNoiseEnabled: false`:

```ts
const shortOpenExact = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'short-open-0.03-exact',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.03,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'short-open-0.05-exact',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.05,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  ],
}).rows;

assert.equal(
  shortOpenExact[0].u2CorrectedMv! > shortOpenExact[1].u2CorrectedMv!,
  true,
  '0.03s should remain physically shorter than 0.05s instead of being swallowed by a 0.05s click step',
);
```

- [ ] **Step 2: Run test to verify it fails or exposes old coupling**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

Expected: FAIL before harness correction if `0.03s` and `0.05s` are effectively treated the same.

- [ ] **Step 3: Modify `releaseAndRecover`**

Replace the current `STOPCOCK_CLICK_STEP_S` physical open/close sequence with exact physical open time:

```ts
const runRuntimeReleaseOnly = () => {
  let current = run;
  const openDurationS = Math.max(0, actualOpenDurationS);
  for (let elapsedS = 0; elapsedS < openDurationS - 1e-9; elapsedS += SIMULATION_STEP_S) {
    current = stepScriptedRun(
      current,
      physicsConfig,
      sensorConfig,
      openControls,
      Math.min(SIMULATION_STEP_S, openDurationS - elapsedS),
    );
  }
  return current;
};
```

Keep UI click animation out of this harness. This file is for physical acceptance scenarios, not UI gesture timing.

- [ ] **Step 4: Run acceptance tests**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
```

Expected: PASS.

---

### Task 4: 重标定最大出气速度并锁定短开阀偏离

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts`
- Modify: `src/features/workbench/workbenchState.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeSixClassValidation.test.ts`

- [ ] **Step 1: Run no-retune baseline**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeSixClassValidation.test.ts
```

Expected: likely FAIL or shifted results because `0.35s` now has only `0.30s` equivalent full-open time.

- [ ] **Step 2: Scan only release-related candidates**

Allowed parameters:

- `stopcockFlowRate`
- standard test `openDurationS` only if `stopcockFlowRate` alone cannot satisfy all tests

Initial candidate:

```text
newStopcockFlowRate = 4 * 0.35 / 0.30 = 4.6666666667
```

Scan range:

```text
4.40, 4.50, 4.60, 4.67, 4.75, 4.85, 4.95
```

Do not change:

- `gamma`
- pressure sensor nonlinearity
- pump amount
- thermal parameters
- leakage parameters

- [ ] **Step 3: Add validation assertions**

Add no-noise short-open assertions. 本轮只锁定“物理结果偏离更大”，不在物理层硬性判定 `<0.1s` 或 `>2.5s` 为诊断错误：

```ts
const openShort003 = runSingle(baseScenario('open-0.03s-no-noise', {
  openDurationS: 0.03,
  leakageEnabled: false,
  pumpValveExchangeEnabled: false,
  environmentDisturbanceEnabled: false,
  instrumentNoiseEnabled: false,
}));
const openShort005 = runSingle(baseScenario('open-0.05s-no-noise', {
  openDurationS: 0.05,
  leakageEnabled: false,
  pumpValveExchangeEnabled: false,
  environmentDisturbanceEnabled: false,
  instrumentNoiseEnabled: false,
}));
const openStandard035 = runSingle(baseScenario('open-0.35s-no-noise', {
  openDurationS: 0.35,
  leakageEnabled: false,
  pumpValveExchangeEnabled: false,
  environmentDisturbanceEnabled: false,
  instrumentNoiseEnabled: false,
}));

assert.equal(
  openShort003.u2CorrectedMv! - openStandard035.u2CorrectedMv! > 1.2,
  true,
  `0.03s should have a larger U2 gap than the old model: got ${openShort003.u2CorrectedMv} vs ${openStandard035.u2CorrectedMv}`,
);
assert.equal(
  openShort003.gamma! - openStandard035.gamma! > 0.05,
  true,
  `0.03s gamma should deviate by more than 0.05 from standard 0.35s release: got ${openShort003.gamma} vs ${openStandard035.gamma}`,
);
assert.equal(
  openShort005.u2CorrectedMv! - openStandard035.u2CorrectedMv! > 1.0,
  true,
  `0.05s should have a larger U2 gap than the old model: got ${openShort005.u2CorrectedMv} vs ${openStandard035.u2CorrectedMv}`,
);
```

These thresholds are intentionally tied to the current pre-aperture baseline, where `0.03-0.05s` was only about `0.4-0.6 mV` above standard and gamma gap was about `0.007-0.011`. The stricter `0.03s` gamma gap `> 0.05` is a user-approved acceptance target. Durations `<0.1s` and `>2.5s` are not forced into a physical pass/fail diagnosis in this task; they are recorded for the later diagnostic/UI layer.

- [ ] **Step 4: Apply selected `stopcockFlowRate`**

If `4.67` passes, set both defaults:

```ts
stopcockFlowRate: 4.67,
```

If it does not pass, choose the best scanned value that satisfies:

- absolute ideal remains `1.395-1.405`;
- ideal experiment remains `1.39-1.41`;
- best realistic operation remains continuous 3-run mean `1.37-1.43`;
- suitable operation groups remain mean `1.34-1.46`;
- `0.03s` and `0.05s` short release have larger deviation than old baseline;
- `0.03s` gamma is more than `0.05` above the `0.35s` standard release gamma in the no-noise control scenario;
- `<0.1s` and `>2.5s` cases are recorded for diagnostic/UI decisions instead of being forced to pass a physical error threshold in this task.

- [ ] **Step 5: Run six-class validation**

Run:

```powershell
node tests\heatCapacity\heatCapacityFreeSixClassValidation.test.ts
```

Expected: PASS.

---

### Task 5: 更新文档和结果表

**Files:**
- Modify: `docs/instrument-modeling/heat-capacity-free-mode-six-class-baseline-results.md`
- Modify: `docs/instrument-modeling/heat-capacity-free-mode-six-class-validation-plan.md`

- [ ] **Step 1: Generate final scenario numbers**

Run a one-off scenario table covering:

```text
absolute ideal
ideal experiment
best realistic 30 seeds
suitable 5 groups
low pressure 4/8/12/16/18
slow pump 12/50/120s
short release 0.03/0.04/0.05/0.10/0.20/0.35s
long release 2.5/10s
```

- [ ] **Step 2: Update baseline results**

Document:

- final `stopcockFlowRate`;
- `rampS = 0.1s`;
- `0.03/0.05/0.35s` effective full-open durations;
- short-open U2/gamma deviation compared with old baseline;
- all six-class pass/fail summaries.

- [ ] **Step 3: Update validation plan**

Add the new rule:

```text
放气流量 = 理论压缩气体流量 × aperture(openElapsedS)
aperture 使用 0.1s smoothstep ramp
积分使用区间平均开度
0.03s 必须真实按 0.03s 物理开阀计算
```

---

### Task 6: Full Verification

**Files:**
- No additional source files.

- [ ] **Step 1: Run focused tests**

```powershell
node tests\heatCapacity\heatCapacityFreeStopcockApertureModel.test.ts
node tests\heatCapacity\heatCapacityFreePhysicsEngine.test.ts
node tests\heatCapacity\heatCapacityFreeParameterAcceptance.test.ts
node tests\heatCapacity\heatCapacityFreeSixClassValidation.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run project verification**

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

Expected:

```text
100 test files passed.
```

- [ ] **Step 3: Check fixed preview port**

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected preview URL:

```text
http://127.0.0.1:5174/
```

If port `5174` is already serving the app, verify:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5174/' -UseBasicParsing -TimeoutSec 10
```

Expected: HTTP 200.

---

## Implementation Notes

- This plan intentionally does not change UI in this batch.
- This plan intentionally does not change `gamma`, pump amount, sensor nonlinearity, thermal exchange, or leakage to satisfy short-open behavior.
- If `stopcockFlowRate` retuning alone cannot keep standard operation valid, pause and report the candidate table before changing standard `0.35s` open duration.
- If short-open gamma moves toward the ideal value for a particular seed, use `U2_short - U2_standard` and multi-seed trend as the primary diagnostic; do not force a single-seed direction by adding nonphysical penalties.
