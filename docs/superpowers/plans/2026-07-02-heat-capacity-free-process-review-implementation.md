# Heat Capacity Free Process Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Free Mode process review so it compares the actual trace with a reproducible same-condition standard operation, reports operation upper bound clearly, and scores the operation with the approved 20/20/50/10 structure.

**Architecture:** Add a focused standard-process domain model that simulates one deterministic reference process from the selected trial snapshot and disturbance settings. Replace the old actual-trace "best window" upper-bound selection in the review path with standard-operation windows and `max(actual, standard)` upper-bound semantics, then rebuild scoring and UI around the new domain result.

**Tech Stack:** TypeScript domain modules, React process review panel, existing Vite test runner through `npm.cmd test`, fixed preview through Vite on port 5174.

---

### File Structure

- Create: `src/domain/heatCapacity/heatCapacityFreeStandardProcessModel.ts`
  - Owns deterministic standard-operation simulation, standard trace points, record windows, standard gamma, and upper-bound calculation.
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts`
  - Replace old best-window source semantics and score item ids with standard-operation-friendly types.
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
  - Select actual trial/branch as before, attach standard process data, create summary metrics, chart data, diagnostics, and score.
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`
  - Rebuild scoring into `pumping`, `release`, `recordChain`, and `retake` groups with approved point weights.
- Modify or delete: `src/domain/heatCapacity/heatCapacityFreeBestWindowModel.ts`
  - Remove old actual-trace candidate upper-bound logic from the active review path. Keep only a narrow compatibility wrapper if tests or imports still need the public name during migration.
- Keep: `src/domain/heatCapacity/heatCapacityFreeIdealReferenceModel.ts`
  - It is still used by parameter-impact tests; do not route Free Mode process review through it.
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
  - Rename visible reference from ideal reference to standard process, render upper-bound tooltip, and display standard windows on charts.
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.css`
  - Style actual line stronger, standard line lighter, and record windows as visible ranges.
- Modify tests:
  - `tests/heatCapacity/heatCapacityFreeStandardProcessModel.test.ts`
  - `tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts`
  - `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`
  - `tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts`
  - `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts`

### Task 1: Standard Process Domain Tests

**Files:**
- Create: `tests/heatCapacity/heatCapacityFreeStandardProcessModel.test.ts`
- Modify: `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts`

- [ ] **Step 1: Write failing tests for deterministic same-condition standard process**

Add tests that build a trace trial from existing helper data, call `createHeatCapacityFreeStandardProcess`, and assert:

```ts
assert.equal(first.seed, second.seed);
assert.deepEqual(first.recordWindows.map((window) => window.recordId), ['u0', 'u1', 'u2']);
assert.equal(first.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(first.trace.some((point) => point.stageId === 'release'), true);
assert.equal(first.assumptions.disturbancesPreserved, true);
assert.equal(first.upperBound.gamma, Math.max(first.gamma ?? -Infinity, actualGamma ?? -Infinity));
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityFreeStandardProcessModel.test.ts
```

Expected: FAIL because `heatCapacityFreeStandardProcessModel.ts` does not exist.

### Task 2: Implement Standard Process Model

**Files:**
- Create: `src/domain/heatCapacity/heatCapacityFreeStandardProcessModel.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts`

- [ ] **Step 1: Add standard process types**

Add explicit types:

```ts
export type HeatCapacityRecordWindowSource = 'standard-operation' | 'actual-record';

export interface HeatCapacityStandardProcessSummary {
  feasible: boolean;
  seed: number;
  gamma: number | null;
  relativeErrorPercent: number | null;
  targetPressureMv: number | null;
  releaseDurationS: number | null;
  assumptions: {
    operationMode: 'standard-operation';
    disturbancesPreserved: true;
    stageAligned: true;
  };
}
```

- [ ] **Step 2: Generate a reproducible standard trace**

Use existing physics/sensor APIs:

```ts
createDefaultFreePhysicsState(config, seed);
createDefaultFreeSensorState(seed, { pressureMv, pressureInitialBiasMv, temperatureMv });
applyFreePumpStroke(state, config, controls, { atS, strength });
stepFreePhysics(state, config, controls, dtS, atS);
stepFreeSensor(sensor, physical, calibration, config, atS);
```

The operation sequence is:

```text
zero: power on, stopcock open, wait stable
pump: close stopcock, open pump valve, apply evenly spaced pump strokes until target pressure
stabilize: close pump valve, wait until slopes are stable
release: open stopcock for calculated release duration
recover: close stopcock, wait until U2 stable
```

- [ ] **Step 3: Calculate standard and upper-bound gamma**

Create synthetic U0/U1/U2 records from standard windows and call:

```ts
calculateFreeHeatCapacityTrialSignals(syntheticTrial, {
  atmosphericPressureKPa: snapshot.environment.ambientPressureKPa,
  pressureSensitivityMvPerKPa: snapshot.sensor.pressureMvPerKPa,
});
```

Set:

```ts
const upperBoundGamma = actualGamma === null
  ? standardGamma
  : standardGamma === null
    ? actualGamma
    : Math.max(actualGamma, standardGamma);
```

- [ ] **Step 4: Run standard model tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityFreeStandardProcessModel.test.ts
```

Expected: PASS.

### Task 3: Wire Standard Process Into Review Model

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`
- Modify: `tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts`

- [ ] **Step 1: Replace old ideal-reference assertions**

Update tests from `idealReferenceTrace`, `idealReferenceStages`, `idealReference`, and `bestWindows` to:

```ts
assert.equal(review.chart.standardTrace.length > 0, true);
assert.equal(review.chart.standardTrace.some((point) => point.stageId === 'pump'), true);
assert.equal(review.chart.standardProcess.assumptions.disturbancesPreserved, true);
assert.equal(review.chart.standardWindows.length, 3);
assert.equal(review.summary?.upperBoundGamma, Math.max(
  review.chart.standardProcess.gamma ?? -Infinity,
  review.summary?.gamma ?? -Infinity,
));
```

- [ ] **Step 2: Run review tests and verify failure**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts
```

Expected: FAIL until the review model exposes the new names and data.

- [ ] **Step 3: Modify review model imports and data flow**

Remove these imports from the process review model:

```ts
selectHeatCapacityBestRecordWindows
createHeatCapacityIdealReference
```

Add:

```ts
createHeatCapacityFreeStandardProcess
```

Pass the standard process to `createSummary`, `createChartData`, and `scoreHeatCapacityFreeProcess`.

- [ ] **Step 4: Remove old active upper-bound fallback**

Ensure the review path no longer uses the old rule that replaces the selected upper bound with theoretical gamma when the selected candidate is not above the actual result.

- [ ] **Step 5: Run review tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts
```

Expected: PASS.

### Task 4: Rebuild Scoring Model

**Files:**
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`
- Modify: `tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts`

- [ ] **Step 1: Write failing scoring tests for the approved weights**

Assert the score groups and point totals are:

```ts
assert.deepEqual(score.items.map((item) => item.id), ['pumping', 'release', 'recordChain', 'retake']);
assert.deepEqual(score.items.map((item) => item.maxScore), [20, 20, 50, 10]);
assert.deepEqual(score.items.find((item) => item.id === 'recordChain')?.details.map((detail) => detail.maxScore), [10, 5, 15, 20]);
```

- [ ] **Step 2: Run scoring tests and verify failure**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts
```

Expected: FAIL because old ids include `completeness`, `zeroing`, and `recording`.

- [ ] **Step 3: Rebuild score items**

Implement four top-level items:

```ts
const SCORE_MAX = {
  pumping: 20,
  release: 20,
  recordChain: 50,
  retake: 10,
} as const;
```

Use standard windows for timing tolerances and actual trace events for operation evidence.

- [ ] **Step 4: Run scoring tests**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts
```

Expected: PASS.

### Task 5: Update Process Review UI

**Files:**
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.css`
- Modify: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

- [ ] **Step 1: Update UI source assertions**

Assert the panel contains:

```ts
assert.match(processReviewPanelSource, /standardTrace/);
assert.match(processReviewPanelSource, /standardWindows/);
assert.match(processReviewPanelSource, /upperBoundHelp/);
assert.doesNotMatch(processReviewPanelSource, /idealReferenceAssumptions/);
```

- [ ] **Step 2: Run UI source assertions and verify failure**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL until UI names and help text are updated.

- [ ] **Step 3: Update summary cards**

Use three distinct metrics:

```text
本组 γ: actual gamma, small text "对理论误差 X%"
操作上限 γ ?: upper-bound gamma, small text "上限对理论误差 X%"
操作损失: upperBoundGapPercent, small text "距操作上限 X%"
```

Tooltip text:

```text
操作上限表示同一参数和干扰条件下，标准操作可达到的参考结果，用于判断本组误差中有多少来自操作时机。若实际结果高于标准操作参考，则以实际结果作为本组操作上限。
```

- [ ] **Step 4: Update chart rendering**

Render actual data with the existing strong line, standard data with a lighter line, and standard record windows as visible ranges on the pressure and temperature charts.

- [ ] **Step 5: Run UI source assertions**

Run:

```powershell
npm.cmd test -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: PASS.

### Task 6: Cleanup, Verification, Preview

**Files:**
- Modify or delete redundant code only when no active import remains.

- [ ] **Step 1: Search for retired active-review names**

Run:

```powershell
rg -n "bestWindows|idealReferenceTrace|idealReferenceStages|idealReferenceAssumptions|selectHeatCapacityBestRecordWindows" src tests
```

Expected: no active process-review UI/model usage remains. Any remaining `createHeatCapacityIdealReference` references are outside the Free Mode process review path.

- [ ] **Step 2: Typecheck**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
```

Expected: PASS.

- [ ] **Step 3: Full test suite**

Run:

```powershell
npm.cmd test
```

Expected: PASS.

- [ ] **Step 4: Fixed-port preview**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected: Vite serves `http://127.0.0.1:5174/`.

- [ ] **Step 5: Commit implementation**

Run:

```powershell
git status --short
git add docs/superpowers/plans/2026-07-02-heat-capacity-free-process-review-implementation.md src tests
git commit -m "Rebuild free process review scoring"
```

Expected: one implementation commit on top of the existing approved design commit.

