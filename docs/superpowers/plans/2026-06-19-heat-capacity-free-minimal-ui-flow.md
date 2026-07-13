# Heat Capacity Free Minimal UI Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Free Mode 默认真实参数下能在网页中完成一次正常自由实验流程，并让等待计时器和预警/报警层级与当前底层模型一致。

**Architecture:** 复用已有 Free Mode 物理、记录、倍速和 `deriveHeatCapacityFreeExperimentTimer` 底层逻辑，只在 Workbench UI 层增加计时器显示和预警语义修正。保持右侧参数栏、诊断报告和默认物理参数不变。

**Tech Stack:** React/TypeScript Workbench UI, Node-based tests, Vite preview on port 5174.

---

## File Structure

- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
  - 将 Free Mode 实验计时器显示接入现有等待倍速浮层。
  - 将建议停止打气文案与中心报警标题分离。
  - 确保 warning 只作为 info toast，danger 才显示中心强报警。
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - 增加计时器 UI 稳定标记、文案和 warning/danger 分层断言。
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`
  - 如状态层已有覆盖则只补缺口；重点覆盖 warning 不阻断、danger 阻断。
- Optionally Modify: `tests/heatCapacity/helpers/heatCapacityFreeScenarioHarness.ts`
  - 仅在现有 helper 无法表达完整默认流程时补最小辅助函数。

## Task 1: Free Wait Timer UI

**Files:**
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [x] **Step 1: Write failing UI source test**

Add assertions that the independent Free wait controller renders only while U1/U2 wait state exists:

```ts
assert.match(workbenchSource, /deriveHeatCapacityFreeWorkbenchAttemptWaitTimer/, 'Workbench should derive Free experiment timer state from the active attempt');
assert.match(workbenchSource, /HeatCapacityWaitController/, 'Free waits should render the independent timer component');
assert.match(workbenchSource, /freeWaitTimerLabel/, 'Free wait timer should use localized stage labels');
assert.match(workbenchSource, /formatHeatCapacityFreeWaitTimer/, 'Free wait timer should format mm:ss elapsed and target values');
```

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL because the independent wait controller is not wired to attempt state.

- [x] **Step 3: Implement timer display**

In `WorkbenchStudioPrototype.tsx`:

- import `deriveHeatCapacityFreeWorkbenchAttemptWaitTimer` and `HeatCapacityWaitController`;
- add localized copy:
  - `freeWaitTimerLabel.u1 = 'U₁ 等待'`
  - `freeWaitTimerLabel.u2 = 'U₂ 等待'`
  - English/TW equivalents;
- keep `formatHeatCapacityWaitDuration(seconds)` inside the independent component;
- derive timer only for an active, valid U1/U2 wait attempt;
- render `HeatCapacityWaitController` as an independent overlay, with the shared ×2/×4/×8/×16 options.

Do not auto-record or show a strong prompt when the timer reaches 5 minutes.

- [x] **Step 4: Run UI source test**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS.

## Task 2: Warning vs Alarm Semantics

**Files:**
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [x] **Step 1: Write failing semantic assertions**

Add assertions:

```ts
assert.match(workbenchSource, /pressureAlarmTitle:\s*'报警'/, 'center alarm title should be alarm, not generic danger warning');
assert.match(workbenchSource, /pressureWarningMessage:\s*'压强已达到建议打气范围，请停止打气并等待回温。'/, 'suggested-stop warning copy should remain ordinary guidance');
assert.match(workbenchSource, /showHeatCapacityToast\(heatCapacityRealtimeCopy\.pressureWarningMessage,\s*'info'/, 'suggested-stop hint should use info toast styling');
assert.doesNotMatch(workbenchSource, /showHeatCapacityPressureAlarm[\s\S]{0,400}pressureWarningMessage/, 'center alarm must not be triggered by the suggested-stop message');
```

- [x] **Step 2: Run test to verify it fails if title is still ambiguous**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL if center title still uses `pressureWarningTitle: '危险'` instead of a dedicated alarm title.

- [x] **Step 3: Implement copy split**

In `heatCapacityRealtimeCopies`:

- keep `pressureWarningMessage` as normal suggested-stop copy;
- add or rename center overlay title to `pressureAlarmTitle`;
- use `pressureAlarmTitle` in the center overlay;
- keep warning toast level `info`;
- keep alarm toast level `danger`.

- [x] **Step 4: Run UI source test**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS.

## Task 3: Normal Flow and Safety Behavior Verification

**Files:**
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrument.test.ts`

- [x] **Step 1: Inspect existing tests**

Check whether existing tests already assert:

- warning state does not block pumping;
- danger state blocks pumping;
- normal Free Mode can record U1/U2.

- [x] **Step 2: Add only missing assertions**

If absent, add source-level or state-level assertions using existing helpers. Required behaviors:

- warning state can continue operation and does not set `pressureOverLimit`;
- danger state blocks new pump strokes;
- default Free trial records U1/U2 and produces gamma after normal operation.

- [x] **Step 3: Run focused state tests**

Run:

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityFreeRecordAttempt.test.ts
```

Expected: PASS.

## Task 4: Full Verification and Preview

**Files:**
- No additional source files.

- [x] **Step 1: Run focused tests**

```powershell
node tests\heatCapacity\workbenchHeatCapacityInstrumentUi.test.ts
node tests\heatCapacity\workbenchHeatCapacityInstrument.test.ts
node tests\heatCapacity\workbenchHeatCapacityFreeRecordAttempt.test.ts
node tests\heatCapacity\workbenchHeatCapacityFreeAttemptIntegration.test.ts
node tests\heatCapacity\heatCapacityFreeSixClassValidation.test.ts
```

Expected: all PASS.

- [x] **Step 2: Run project verification**

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

Expected: all PASS.

- [x] **Step 3: Check fixed preview port**

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5174/' -UseBasicParsing -TimeoutSec 10
```

Expected: HTTP 200. If not running, start with:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## Non-Goals

- Do not adapt the right parameter sidebar in this batch.
- Do not add new model parameters.
- Do not change default physical parameters.
- Do not rewrite the diagnostic report.
- Do not add auto-recording or hard suggestions at 5 minutes.
