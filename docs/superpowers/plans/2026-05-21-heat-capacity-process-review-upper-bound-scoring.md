# Heat Capacity Process Review Upper Bound And Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Free Mode 过程回顾页内完整融合组别切换、标准操作参考曲线、本次最佳记录窗口、操作上限和操作评分，不新增独立评分页，不改变实验文件保存格式。

**Architecture:** 所有新增结果都作为运行时派生数据生成：trace/event/trial/config 是唯一输入，summary/chart/diagnostics 是输出。模型层拆为组别选择、标准参考、最佳窗口、评分四个纯函数边界，UI 只负责显示和交互状态。Demo Mode / Guide Mode 继续不接入真实 Free trace 评分逻辑。

**Tech Stack:** React + TypeScript + Vite；现有 Free Mode domain models；SVG 图表；Node/tsx 脚本测试；固定预览端口 `5174`。

---

## Scope And Non-Goals

- 本计划只增强 `Heat Capacity` 的 Free Mode 过程回顾。
- 不修改 Demo Mode / Guide Mode 的教学预设行为。
- 不保存评分、最佳窗口、标准参考曲线、诊断结论。
- 不新增实验数据格式字段。
- 不新增左侧栏项、标签页或独立评分窗口。
- 不调整传感器噪声。
- 不让标准参考曲线直接参与评分。
- 第一版只切换实验组，不切换隐藏分支。

## Files And Responsibilities

**Create**

- `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts`
  - 存放过程回顾派生数据的共享类型：组别选项、参考曲线点、最佳窗口、操作上限、评分项。
  - 只导出类型，不导入任何运行时代码，避免标准参考、最佳窗口、评分模型之间形成循环依赖。

- `src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts`
  - 从 Free config snapshot 生成无噪声标准操作参考曲线。
  - 输出按用户阶段对齐后的参考 trace。

- `src/domain/heatCapacity/heatCapacityFreeBestWindowModel.ts`
  - 从用户真实 trace 中寻找 U0/U1/U2 的最佳可记录窗口。
  - 输出推荐样本、窗口范围、操作上限 gamma。

- `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`
  - 根据实际记录、最佳窗口、标准参考和 trace 事件生成分项评分。
  - 输出总分和诊断关系文本，不保存结论。

- `tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts`
  - 验证标准参考曲线可生成、无噪声、按阶段对齐。

- `tests/heatCapacity/heatCapacityFreeBestWindowModel.test.ts`
  - 验证最佳窗口不按答案倒推，能处理不足、过放、未完成。

- `tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts`
  - 验证 100 分制和分项扣分稳定。

- `tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts`
  - 端到端模型验收：标准操作、打气不足、放气过度、记录过早、重录。

**Modify**

- `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
  - 扩展 `selectHeatCapacityFreeProcessReview` 的选择参数、返回结构、chart 和 diagnostics。
  - 聚合标准参考、最佳窗口、评分结果。

- `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
  - 增加组别菜单。
  - 在现有图表内显示参考虚线和最佳窗口。
  - 扩展 summary 和 diagnosis rows。

- `src/features/heatCapacity/HeatCapacityProcessReviewPanel.css`
  - 增加组别菜单、参考线、最佳窗口、评分列样式。
  - 保持深色/浅色主题变量适配。

- `src/features/workbench/WorkbenchStudioPrototype.tsx`
  - 保存当前过程回顾组别选择的运行时 UI 状态。
  - 只在用户手动选择后固定历史组；否则默认跟随最新可回顾组。

- `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`
  - 扩展既有过程回顾测试，覆盖新增 summary/chart/diagnostics 字段。

- `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`
  - 增加静态 UI 合同：组别菜单存在、无持久化字段、图例包含参考曲线和最佳窗口。

---

## Shared Domain Contracts

Create `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts` before individual model tasks use these contracts. Domain implementation files must import these contracts with `import type` only. Do not import `heatCapacityFreeProcessReviewModel.ts` from standard-reference, best-window, or scoring model files.

```ts
export type HeatCapacityProcessStageId = 'zero' | 'pump' | 'stabilize' | 'release' | 'recover';
export type HeatCapacityProcessRecordId = 'u0' | 'u1' | 'u2';
export type HeatCapacityProcessDiagnosisId = 'pumping' | 'release' | 'recording' | 'retake';
export type HeatCapacityProcessDiagnosisStatus =
  | 'reasonable'
  | 'review'
  | 'needs-improvement'
  | 'retaken'
  | 'insufficient-data';

export interface HeatCapacityProcessStageSegment {
  id: HeatCapacityProcessStageId;
  label: string;
  startS: number;
  endS: number;
}

export interface HeatCapacityProcessReviewTrialOption {
  trialId: string;
  traceTrialId: string | null;
  trialIndex: number;
  status: 'complete' | 'incomplete' | 'missing-trace';
  gamma: number | null;
  retakeCount: number;
}

export interface HeatCapacityProcessReferencePoint {
  sampleId: string;
  stageId: HeatCapacityProcessStageId;
  timeS: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
}

export interface HeatCapacityBestRecordWindow {
  recordId: HeatCapacityProcessRecordId;
  startS: number;
  endS: number;
  recommendedSampleId: string | null;
  recommendedTimeS: number | null;
  displayPressureMv: number | null;
  displayTemperatureMv: number | null;
  pressureDeltaKPa: number | null;
  temperatureDeltaK: number | null;
  qualityScore: number;
  source: 'trace' | 'automatic-u0';
  reason: string;
}

export interface HeatCapacityOperationUpperBound {
  gamma: number | null;
  relativeErrorPercent: number | null;
  gapFromActualPercent: number | null;
  windows: HeatCapacityBestRecordWindow[];
}

export interface HeatCapacityProcessScoreItem {
  id: 'completeness' | 'zeroing' | 'pumping' | 'release' | 'recording' | 'retake';
  label: string;
  score: number;
  maxScore: number;
  evidence: string;
  relation: string;
  recommendation: string;
  status: HeatCapacityProcessDiagnosisStatus;
}

export interface HeatCapacityProcessScore {
  total: number | null;
  maxScore: 100;
  items: HeatCapacityProcessScoreItem[];
}
```

When Batch 1 touches `heatCapacityFreeProcessReviewModel.ts`, move the existing base type exports shown above into `heatCapacityFreeProcessReviewTypes.ts` and re-export/import them from the review model as needed. This keeps current public type names stable while preventing runtime import cycles.

If an implementation discovers the current type names conflict with existing exports, stop and report the conflict before renaming public model fields.

---

## Batch 0: Baseline And Safety

**Goal:** Confirm current branch, dirty files, and baseline tests before adding scoring and reference logic.

**Files:** No source edits.

**Acceptance Commands:**

```powershell
git status --short --branch
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

- [ ] **Step 1: Read project rules and current plan context**

Read:

```powershell
Get-Content -Path AGENTS.md -TotalCount 220
Get-Content -Path docs\superpowers\plans\2026-05-21-heat-capacity-process-review-upper-bound-scoring.md -TotalCount 260
```

Expected: Both files are readable; AGENTS confirms fixed preview port `5174`.

- [ ] **Step 2: Check current branch and dirty state**

Run:

```powershell
git status --short --branch
```

Expected: Branch is visible. Existing unrelated modifications are not reverted. If files planned for this work have newer user edits that conflict with this plan, stop and report.

- [ ] **Step 3: Run baseline process review tests**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: Both pass before edits. If either fails for unrelated existing changes, stop and report the failure before editing.

---

## Batch 1: Trial Option Selection Model

**Goal:** Let process review select any Free trial group while preserving current default behavior.

**Files:**

- Create: `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

- [ ] **Step 1: Write failing tests for trial options and selected trial**

Add assertions to `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts` after the existing ready review assertions:

```ts
assert.equal(review.trialOptions.length, 1);
assert.deepEqual(review.trialOptions[0], {
  trialId: trial.id,
  traceTrialId: traceTrial.id,
  trialIndex: 1,
  status: 'complete',
  gamma: review.summary?.gamma ?? null,
  retakeCount: 1,
});
assert.equal(review.selectedTrialId, trial.id);
```

Add a second synthetic trial and assert explicit selection:

```ts
const secondTrial: HeatCapacityFreeTrial = {
  ...trial,
  id: 'free-trial-2',
  traceTrialId: traceTrial.id,
  branchCount: 1,
};

const selectedFirstReview = selectHeatCapacityFreeProcessReview({
  trials: [trial, secondTrial],
  traceStore: store,
  theoreticalGamma: 1.4,
  selectedTrialId: 'free-trial-1',
});

assert.equal(selectedFirstReview.summary?.trialId, 'free-trial-1');
assert.equal(selectedFirstReview.selectedTrialId, 'free-trial-1');
assert.equal(selectedFirstReview.trialOptions.length, 2);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

Expected: FAIL because `trialOptions`, `selectedTrialId`, and `selectedTrialId` option input do not exist.

- [ ] **Step 3: Create shared process-review types and extend output types**

Create `src/domain/heatCapacity/heatCapacityFreeProcessReviewTypes.ts` with the contracts from the `Shared Domain Contracts` section. Move the currently exported base process-review types that are listed there out of `heatCapacityFreeProcessReviewModel.ts`, then import and re-export them from `heatCapacityFreeProcessReviewModel.ts` so existing callers do not have to change in this batch:

```ts
export type {
  HeatCapacityProcessDiagnosisId,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessRecordId,
  HeatCapacityProcessReviewTrialOption,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';
```

In `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`, import the new option type and extend the review/options interfaces:

```ts
import type {
  HeatCapacityProcessReviewTrialOption,
} from './heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityFreeProcessReview {
  status: HeatCapacityProcessReviewStatus;
  selectedTrialId: string | null;
  trialOptions: HeatCapacityProcessReviewTrialOption[];
  summary: HeatCapacityProcessReviewSummary | null;
  chart: HeatCapacityProcessChartData;
  diagnostics: HeatCapacityProcessDiagnosisRow[];
}

export interface SelectHeatCapacityFreeProcessReviewOptions {
  trials: HeatCapacityFreeTrial[];
  traceStore: HeatCapacityFreeTraceStore;
  theoreticalGamma?: number;
  trialIndex?: number;
  selectedTrialId?: string | null;
}
```

- [ ] **Step 4: Add option builder and selected trial resolver**

Replace the current `selectTrial` with a resolver that accepts `selectedTrialId` first, then `trialIndex`, then latest complete, then latest trial.

```ts
const createTrialOptions = (
  trials: HeatCapacityFreeTrial[],
  traceStore: HeatCapacityFreeTraceStore,
): HeatCapacityProcessReviewTrialOption[] => trials.map((trial, index) => {
  const traceTrial = findTraceTrial(traceStore, trial);
  const branchCount = traceTrial?.branches.length ?? trial.branchCount;
  return {
    trialId: trial.id,
    traceTrialId: traceTrial?.id ?? trial.traceTrialId,
    trialIndex: index + 1,
    status: traceTrial
      ? trial.u0 && trial.u1 && trial.u2
        ? 'complete'
        : 'incomplete'
      : 'missing-trace',
    gamma: trial.correctedSignals?.gamma ?? null,
    retakeCount: Math.max(0, branchCount - 1),
  };
});
```

Use exact trial ids for selection. Keep the existing `trialIndex` path for backward compatibility with tests and internal callers.

- [ ] **Step 5: Update empty and missing-trace returns**

Every return from `selectHeatCapacityFreeProcessReview` must include:

```ts
selectedTrialId: selected?.trial.id ?? null,
trialOptions,
```

For no trials:

```ts
selectedTrialId: null,
trialOptions: [],
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

Expected: PASS.

---

## Batch 2: Workbench Runtime Selection State And Menu Contract

**Goal:** Add group-switching UI state and a menu contract without changing saved experiment data.

**Files:**

- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.css`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

- [ ] **Step 1: Write failing static UI contract tests**

In `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`, add:

```ts
assert.match(processReviewPanelSource, /data-hpr-trial-select="true"/, 'process review should expose a group-selection menu');
assert.match(processReviewPanelSource, /trialOptions\.map/, 'process review menu should list all reviewable groups');
assert.match(processReviewPanelSource, /onSelectedTrialChange/, 'process review menu should report selected group changes to the workbench');
assert.match(processReviewPanelSource, /trialSelectRef/, 'process review menu should close from outside-click handling');
assert.match(processReviewPanelSource, /pointerdown/, 'process review menu should close as soon as an outside pointer is pressed');
assert.match(processReviewPanelSource, /Escape/, 'process review menu should close from Escape');
assert.match(workbenchSource, /heatCapacityReviewSelectionByFileId/, 'workbench should keep process-review group selection as runtime UI state');
assert.doesNotMatch(sessionSource, /heatCapacityReviewSelectionByFileId|selectedProcessReviewTrialId/, 'process-review group selection must not be saved in session payloads');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL because the menu and runtime state do not exist.

- [ ] **Step 3: Add runtime selection state in Workbench**

In `WorkbenchStudioPrototype.tsx`, add a local state near other UI-only state:

```ts
const [heatCapacityReviewSelectionByFileId, setHeatCapacityReviewSelectionByFileId] = useState<Record<string, {
  selectedTrialId: string | null;
  manual: boolean;
}>>({});
```

When rendering `heatCapacityReview`, compute:

```ts
const reviewSelection = heatCapacityReviewSelectionByFileId[activeFile.id] ?? null;
const reviewOptionIds = new Set(activeFile.heatCapacityFreeTrials.map((trial) => trial.id));
const requestedReviewTrialId =
  reviewSelection?.manual && reviewSelection.selectedTrialId && reviewOptionIds.has(reviewSelection.selectedTrialId)
    ? reviewSelection.selectedTrialId
    : null;
const review = selectHeatCapacityFreeProcessReview({
  trials: activeFile.heatCapacityFreeTrials,
  traceStore: activeFile.heatCapacityFreeTraceStore,
  theoreticalGamma: activeFile.theoreticalGamma,
  selectedTrialId: requestedReviewTrialId,
});
```

Pass:

```tsx
selectedTrialId={review.selectedTrialId}
onSelectedTrialChange={(trialId) => {
  setHeatCapacityReviewSelectionByFileId((previous) => ({
    ...previous,
    [activeFile.id]: { selectedTrialId: trialId, manual: true },
  }));
}}
```

- [ ] **Step 4: Keep default following latest group without a nested hook**

Do not set `manual: true` unless the user chooses a menu item. If the selected id becomes invalid because the group was deleted or reset, do not run a cleanup `useEffect` inside `renderPanelContent`; that helper is not a React component and a hook there would violate React hook rules.

The derived `requestedReviewTrialId` in Step 3 is the cleanup boundary: invalid manual ids are ignored and the selector falls back to the latest reviewable group. The stale runtime entry may remain in `heatCapacityReviewSelectionByFileId`, but it has no effect until the user picks a valid group again. If this stale-key behavior becomes noisy during implementation, clean it only from an existing top-level component effect, not inside the nested render branch.

- [ ] **Step 5: Add menu props and rendering**

Update `HeatCapacityProcessReviewPanelProps`:

```ts
interface HeatCapacityProcessReviewPanelProps {
  mode: 'demo' | 'guide' | 'free';
  review: HeatCapacityFreeProcessReview;
  selectedTrialId: string | null;
  onSelectedTrialChange: (trialId: string) => void;
}
```

If the file does not already import these hooks, update the React import to include `useEffect`, `useRef`, and `useState`.

Add local menu state:

```ts
const [trialMenuOpen, setTrialMenuOpen] = useState(false);
const trialSelectRef = useRef<HTMLDivElement | null>(null);
```

Add component-level outside-close behavior. This `useEffect` belongs inside `HeatCapacityProcessReviewPanel`, not inside any nested helper:

```ts
useEffect(() => {
  if (!trialMenuOpen) {
    return undefined;
  }
  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (target instanceof Node && trialSelectRef.current?.contains(target)) {
      return;
    }
    setTrialMenuOpen(false);
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setTrialMenuOpen(false);
    }
  };
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('keydown', handleKeyDown, true);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}, [trialMenuOpen]);
```

In the process heading right side, render:

```tsx
<div className="hpr-trial-select" data-hpr-trial-select="true" ref={trialSelectRef}>
  <button
    type="button"
    className="hpr-trial-select-trigger"
    aria-haspopup="menu"
    aria-expanded={trialMenuOpen}
    onClick={() => setTrialMenuOpen((open) => !open)}
  >
    第 {summary.trialIndex} 组实验
    <span aria-hidden="true">▾</span>
  </button>
  {trialMenuOpen ? (
    <div className="hpr-trial-select-menu" role="menu">
      {review.trialOptions.map((option) => (
        <button
          type="button"
          role="menuitemradio"
          aria-checked={option.trialId === selectedTrialId}
          key={option.trialId}
          onClick={() => {
            onSelectedTrialChange(option.trialId);
            setTrialMenuOpen(false);
          }}
        >
          <strong>第 {option.trialIndex} 组实验</strong>
          <span>{option.gamma === null ? '未完成' : `γ ${option.gamma.toFixed(3)}`} · 重录 {option.retakeCount} 次</span>
        </button>
      ))}
    </div>
  ) : null}
</div>
```

Keep all new visible copy in Simplified Chinese to match the existing process review panel. Do not defer localization to a later pass and do not add English hard-coded copy to user-facing controls.

- [ ] **Step 6: Add minimal menu styles**

In `HeatCapacityProcessReviewPanel.css`, add menu styles using existing theme variables:

```css
.hpr-trial-select {
  position: relative;
  margin-left: auto;
}

.hpr-trial-select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--hpr-border);
  border-radius: 5px;
  background: var(--hpr-panel-bg-elevated);
  color: var(--hpr-text);
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 720;
}

.hpr-trial-select-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 20;
  display: grid;
  min-width: 210px;
  border: 1px solid var(--hpr-border);
  background: var(--hpr-detail-bg);
}

.hpr-trial-select-menu button {
  display: grid;
  gap: 3px;
  border: 0;
  border-top: 1px solid var(--hpr-border-soft);
  background: transparent;
  color: var(--hpr-text);
  padding: 8px 10px;
  text-align: left;
}

.hpr-trial-select-menu button:first-child {
  border-top: 0;
}

.hpr-trial-select-menu button[aria-checked='true'] {
  background: var(--hpr-panel-bg-muted);
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

Expected: Both pass.

---

## Batch 3: Standard Operation Reference Model

**Goal:** Generate a standard, no-noise reference curve from the current Free Mode physical configuration and align it to the user's stage timeline.

**Files:**

- Create: `src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

- [ ] **Step 1: Write failing standard reference tests**

Create `tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts`:

```ts
import assert from 'node:assert/strict';
import { createDefaultFreeConfigSnapshot } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createHeatCapacityStandardReference,
  alignStandardReferenceToStages,
} from '../../src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';

const config = createDefaultFreeConfigSnapshot();
const reference = createHeatCapacityStandardReference(config);

assert.equal(reference.trace.length > 10, true);
assert.equal(reference.records.u0 !== null, true);
assert.equal(reference.records.u1 !== null, true);
assert.equal(reference.records.u2 !== null, true);
assert.equal(reference.noiseMv, 0);
assert.equal(reference.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(reference.trace.some((point) => point.stageId === 'release'), true);

const aligned = alignStandardReferenceToStages(reference, [
  { id: 'zero', label: '调零', startS: 0, endS: 6 },
  { id: 'pump', label: '打气', startS: 6, endS: 30 },
  { id: 'stabilize', label: '回温稳定', startS: 30, endS: 60 },
  { id: 'release', label: '快速放气', startS: 60, endS: 61 },
  { id: 'recover', label: '恢复记录', startS: 61, endS: 90 },
]);

assert.equal(aligned.every((point) => point.timeS >= 0 && point.timeS <= 90), true);
assert.equal(aligned.some((point) => point.stageId === 'stabilize' && point.timeS >= 30 && point.timeS <= 60), true);

console.log('heatCapacityFreeStandardReferenceModel tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts
```

Expected: FAIL because the model file does not exist.

- [ ] **Step 3: Implement standard reference types**

Create `src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts` with exports:

```ts
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
} from './heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
} from './heatCapacityFreeSensorModel.ts';
import type {
  HeatCapacityFreeCalibrationState,
} from './heatCapacityFreeCalibrationModel.ts';
import type {
  HeatCapacityFreeConfigSnapshot,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityProcessReferencePoint,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityStandardReferenceRecord {
  timeS: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
}

export interface HeatCapacityStandardReference {
  noiseMv: 0;
  trace: HeatCapacityProcessReferencePoint[];
  stages: HeatCapacityProcessStageSegment[];
  records: {
    u0: HeatCapacityStandardReferenceRecord | null;
    u1: HeatCapacityStandardReferenceRecord | null;
    u2: HeatCapacityStandardReferenceRecord | null;
  };
}
```

Use `heatCapacityFreeProcessReviewTypes.ts` for shared process-review types. Do not import `heatCapacityFreeProcessReviewModel.ts` from this file.

- [ ] **Step 4: Implement deterministic reference simulation**

Use this control sequence:

```ts
const STEP_S = 0.2;
const PUMP_INTERVAL_S = 0.8;
const RELEASE_DURATION_S = 0.7;
const MAX_PUMP_STROKES = 24;
const MAX_STABILIZE_S = 90;
const MAX_RECOVER_S = 90;
```

Derive target pressure from the config snapshot, without hard-coding U1/U2:

```ts
const getReferenceTargetPressureMv = (config: HeatCapacityFreeConfigSnapshot) => {
  const lower = config.record.minimumUsefulU1CorrectedMv;
  const upper = Math.max(
    lower + 10,
    Math.min(config.record.pressureDangerMv * 0.82, config.record.pressureDangerMv - 25),
  );
  return (lower + upper) / 2;
};
```

Generate points through the same sensor response path with noise disabled. This keeps the reference line comparable to the actual displayed trace while avoiding random fluctuation:

```ts
const createReferenceCalibration = (): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 0,
  zeroOffsetMv: 0,
  zeroEvents: [],
  automaticU0: null,
});

const createReferenceSensorConfig = (config: HeatCapacityFreeConfigSnapshot) => ({
  ...config.sensor,
  noiseMv: 0,
});

const toReferencePoint = (
  id: string,
  stageId: HeatCapacityProcessStageId,
  timeS: number,
  displayPressureMv: number,
  displayTemperatureMv: number,
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityProcessReferencePoint => ({
  sampleId: id,
  stageId,
  timeS: Number(timeS.toFixed(2)),
  pressureDeltaKPa: Number((displayPressureMv / config.sensor.pressureMvPerKPa).toFixed(3)),
  temperatureDeltaK: Number(((displayTemperatureMv - config.sensor.temperatureMvAtAmbient) / config.sensor.temperatureMvPerK).toFixed(3)),
});
```

At each physics step, call `stepFreeSensor` with `createReferenceSensorConfig(config)`, then call `getFreeSensorDisplay(sensorState, calibration, config.sensor)` and pass those display values to `toReferencePoint`. Keep `noiseMv: 0`; do not skip sensor lag unless implementation finds the current sensor model cannot be called without changing product logic.

- [ ] **Step 5: Implement stage alignment**

Implement:

```ts
export const alignStandardReferenceToStages = (
  reference: HeatCapacityStandardReference,
  userStages: HeatCapacityProcessStageSegment[],
): HeatCapacityProcessReferencePoint[] => reference.trace.flatMap((point) => {
  const referenceStage = reference.stages.find((stage) => stage.id === point.stageId);
  const userStage = userStages.find((stage) => stage.id === point.stageId);
  if (!referenceStage || !userStage || referenceStage.endS <= referenceStage.startS) {
    return [];
  }
  const ratio = (point.timeS - referenceStage.startS) / (referenceStage.endS - referenceStage.startS);
  return [{
    ...point,
    timeS: Number((userStage.startS + ratio * (userStage.endS - userStage.startS)).toFixed(2)),
  }];
});
```

- [ ] **Step 6: Connect reference trace into process review chart**

Extend `HeatCapacityProcessChartData` in `heatCapacityFreeProcessReviewModel.ts`:

```ts
referenceTrace: HeatCapacityProcessReferencePoint[];
```

In `emptyChart`, return `referenceTrace: []`.

In `createChartData`, after `stages` is created:

```ts
const standardReference = createHeatCapacityStandardReference(traceTrial.configSnapshot);
const referenceTrace = alignStandardReferenceToStages(standardReference, stages);
```

Return `referenceTrace`.

- [ ] **Step 7: Run model tests**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeStandardReferenceModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

Expected: Both pass. If the generated reference gamma is far from theoretical gamma because current physics config changed, stop and report before tuning target rules.

---

## Batch 4: Best Record Window And Operation Upper Bound Model

**Goal:** Find U0/U1/U2 best record windows from the user's actual trace and compute the operation upper bound gamma.

**Files:**

- Create: `src/domain/heatCapacity/heatCapacityFreeBestWindowModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeBestWindowModel.test.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeBestWindowModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

- [ ] **Step 1: Write failing best-window tests**

Create `tests/heatCapacity/heatCapacityFreeBestWindowModel.test.ts` with a trace that has stable candidate samples and one unstable sample:

```ts
import assert from 'node:assert/strict';
import { calculateFreeHeatCapacityTrialSignals } from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import { createDefaultFreeConfigSnapshot } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  selectHeatCapacityBestRecordWindows,
} from '../../src/domain/heatCapacity/heatCapacityFreeBestWindowModel.ts';
import {
  createSampleInputForProcessReviewTest,
  createTraceTrialForProcessReviewTest,
  createTrialForProcessReviewTest,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const config = createDefaultFreeConfigSnapshot();
const setup = createTraceTrialForProcessReviewTest(config, [
  createSampleInputForProcessReviewTest(5, 0, 1499, { phase: 'zeroed', controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false } }),
  createSampleInputForProcessReviewTest(30, 112, 1499.05, { phase: 'sealedStabilizing' }),
  createSampleInputForProcessReviewTest(60, 35, 1498.98, { phase: 'recovering' }),
]);
const trial = createTrialForProcessReviewTest(setup);
const windows = selectHeatCapacityBestRecordWindows(setup.traceTrial, setup.branch, trial, 1.4);

assert.equal(windows.windows.length, 3);
assert.equal(windows.windows.every((window) => window.qualityScore > 0), true);
assert.equal(windows.gamma !== null, true);
assert.equal(windows.gapFromActualPercent !== null, true);
assert.equal(windows.windows.find((window) => window.recordId === 'u1')?.recommendedSampleId !== null, true);

console.log('heatCapacityFreeBestWindowModel tests passed');
```

Create `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts` in this batch. Keep it additive: export the new helpers used by best-window, scoring, and acceptance tests. Do not refactor existing `heatCapacityFreeProcessReviewModel.test.ts` unless duplicate setup blocks become a compile-time conflict.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeBestWindowModel.test.ts
```

Expected: FAIL because model and helper do not exist.

- [ ] **Step 3: Create test factory helper**

Create `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts` with exports:

```ts
export const createSampleInputForProcessReviewTest = (
  atS: number,
  pressureMv: number,
  temperatureMv: number,
  overrides: Partial<HeatCapacityFreeTraceSampleInput> = {},
): HeatCapacityFreeTraceSampleInput => ({
  atS,
  reason: 'periodic',
  phase: 'sealedStabilizing',
  controls: { powerOn: true, stopcockOpen: false, pumpValveOpen: false },
  physical: {
    gasPressureKPa: 101.3 + pressureMv / 20,
    pressureDeltaKPa: pressureMv / 20,
    gasTemperatureK: 298.15 + (temperatureMv - 1499) / 2,
    gasAmountRatio: 1,
    pumpStrokeCount: 0,
    releaseStarted: false,
    currentStopcockOpenDurationS: 0,
  },
  sensor: {
    displayPressureMv: pressureMv,
    displayTemperatureMv: temperatureMv,
    pressureSlopeMvPerS: 0.03,
    temperatureSlopeMvPerS: 0.02,
  },
  calibration: { calibrationVersion: 1, zeroOffsetMv: 0, zeroEventId: 'zero-1' },
  stability: { pressureStable: true, temperatureStable: true },
  safetyStatus: 'normal',
  ...overrides,
});
```

Include helper functions for trace trial and trial construction by reusing `appendFreeTraceSample`, `appendFreeTraceEvent`, `createFreeTraceTrial`, and `calculateFreeHeatCapacityTrialSignals`. Also export raw fixture-part builders for later batches:

```ts
export interface HeatCapacityProcessReviewFixtureParts {
  traceStore: HeatCapacityFreeTraceStore;
  traceTrial: HeatCapacityFreeTraceTrial;
  branch: HeatCapacityFreeTraceBranch;
  trial: HeatCapacityFreeTrial;
}

export const createCompleteProcessReviewFixtureParts = (): HeatCapacityProcessReviewFixtureParts => {
  const config = createDefaultFreeConfigSnapshot();
  const setup = createTraceTrialForProcessReviewTest(config, [
    createSampleInputForProcessReviewTest(5, 0, 1499, { phase: 'zeroed', controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false } }),
    createSampleInputForProcessReviewTest(30, 112, 1499.05, { phase: 'sealedStabilizing' }),
    createSampleInputForProcessReviewTest(60, 35, 1498.98, { phase: 'recovering' }),
  ]);
  return {
    traceStore: setup.traceStore,
    traceTrial: setup.traceTrial,
    branch: setup.branch,
    trial: createTrialForProcessReviewTest(setup),
  };
};

export const createOverVentedProcessReviewFixtureParts = (): HeatCapacityProcessReviewFixtureParts => {
  const config = createDefaultFreeConfigSnapshot();
  const setup = createTraceTrialForProcessReviewTest(config, [
    createSampleInputForProcessReviewTest(5, 0, 1499, { phase: 'zeroed', controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false } }),
    createSampleInputForProcessReviewTest(30, 112, 1499.05, { phase: 'sealedStabilizing' }),
    createSampleInputForProcessReviewTest(60, 4, 1498.5, { phase: 'recovering' }),
  ]);
  return {
    traceStore: setup.traceStore,
    traceTrial: setup.traceTrial,
    branch: setup.branch,
    trial: createTrialForProcessReviewTest(setup),
  };
};

export const createIncompleteProcessReviewFixtureParts = (): HeatCapacityProcessReviewFixtureParts => {
  const parts = createCompleteProcessReviewFixtureParts();
  return {
    ...parts,
    trial: {
      ...parts.trial,
      u1: null,
      u2: null,
      correctedSignals: null,
    },
  };
};
```

- [ ] **Step 4: Implement best-window scoring rules**

Create `src/domain/heatCapacity/heatCapacityFreeBestWindowModel.ts`. The selector must:

```ts
export const selectHeatCapacityBestRecordWindows = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  theoreticalGamma = 1.4,
): HeatCapacityOperationUpperBound => {
  const u0 = selectBestU0Window(traceTrial, branch, trial);
  const u1 = selectBestU1Window(traceTrial, branch, trial, u0);
  const u2 = selectBestU2Window(traceTrial, branch, trial, u0, u1);
  const gamma = calculateUpperBoundGamma(traceTrial, trial, u0, u1, u2);
  const actualGamma = trial.correctedSignals?.gamma ?? null;
  return {
    gamma,
    relativeErrorPercent: gamma === null ? null : roundNumber(Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100, 2),
    gapFromActualPercent: gamma === null || actualGamma === null ? null : roundNumber(Math.abs(gamma - actualGamma) / gamma * 100, 2),
    windows: [u0, u1, u2],
  };
};
```

Implement `calculateUpperBoundGamma` in the same file. It must calculate gamma from the best-window display values with the existing pressure formula, not by aiming at the theoretical answer:

```ts
const createUpperBoundRecord = (
  recordId: HeatCapacityProcessRecordId,
  window: HeatCapacityBestRecordWindow,
  trial: HeatCapacityFreeTrial,
): HeatCapacityFreeRecord | null => {
  if (window.displayPressureMv === null || window.displayTemperatureMv === null || window.recommendedTimeS === null) {
    return null;
  }
  const original = recordId === 'u0' ? trial.u0 : recordId === 'u1' ? trial.u1 : trial.u2;
  return normalizeHeatCapacityFreeRecordInput({
    atS: window.recommendedTimeS,
    displayPressureMv: window.displayPressureMv,
    displayTemperatureMv: window.displayTemperatureMv,
    calibrationVersion: original?.calibrationVersion ?? trial.u0?.calibrationVersion ?? 0,
    zeroEventId: original?.zeroEventId ?? trial.u0?.zeroEventId ?? 'upper-bound-zero',
    phaseAtRecord: original?.phaseAtRecord ?? null,
    traceTrialId: trial.traceTrialId,
    traceBranchId: original?.traceBranchId ?? null,
    traceSampleId: window.recommendedSampleId,
    eventId: original?.eventId ?? null,
  });
};

const calculateUpperBoundGamma = (
  traceTrial: HeatCapacityFreeTraceTrial,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
  u1: HeatCapacityBestRecordWindow,
  u2: HeatCapacityBestRecordWindow,
): number | null => {
  const syntheticTrial: HeatCapacityFreeTrial = {
    ...trial,
    u0: createUpperBoundRecord('u0', u0, trial),
    u1: createUpperBoundRecord('u1', u1, trial),
    u2: createUpperBoundRecord('u2', u2, trial),
  };
  return calculateFreeHeatCapacityTrialSignals(syntheticTrial, {
    atmosphericPressureKPa: traceTrial.configSnapshot.environment.atmosphericPressureKPa,
    pressureSensitivityMvPerKPa: traceTrial.configSnapshot.sensor.pressureMvPerKPa,
  })?.gamma ?? null;
};
```

Use these non-answer-chasing eligibility rules:

- U0: `powerOn`, `stopcockOpen`, pressure near zero, pressure/temperature stable. Automatic U0 can provide `source: 'automatic-u0'` if it has no matching sample.
- U1: before the first `stopcock-open` event after pumping, stopcock closed, pump valve closed, stable, corrected pressure at least `minimumUsefulU1CorrectedMv`, below `pressureDangerMv`.
- U2: after release started, stopcock closed, stable, corrected pressure above `overVentedMinimumU2CorrectedMv`, corrected pressure below selected U1.
- Candidate quality uses stability, phase, safety, and range; it does not optimize for gamma closeness.

- [ ] **Step 5: Add best windows to process review chart and summary**

Extend `HeatCapacityProcessChartData`:

```ts
bestWindows: HeatCapacityBestRecordWindow[];
```

Extend `HeatCapacityProcessReviewSummary`:

```ts
upperBoundGamma: number | null;
upperBoundRelativeErrorPercent: number | null;
upperBoundGapPercent: number | null;
```

In `createChartData`, return best windows. In `createSummary`, return upper-bound fields from `selectHeatCapacityBestRecordWindows`.

- [ ] **Step 6: Run model tests**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeBestWindowModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

Expected: Both pass.

---

## Batch 5: Process Scoring Model

**Goal:** Generate a 100-point operation score and reusable row-level diagnostics without saving score conclusions.

**Files:**

- Create: `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts`
- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Test: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

- [ ] **Step 1: Write failing scoring tests**

Create `tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  scoreHeatCapacityFreeProcess,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts';
import {
  createCompleteProcessScoringInputFixture,
  createOverVentedProcessScoringInputFixture,
  createIncompleteProcessScoringInputFixture,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const complete = createCompleteProcessScoringInputFixture();
const completeScore = scoreHeatCapacityFreeProcess(complete);

assert.equal(completeScore.maxScore, 100);
assert.equal(completeScore.items.map((item) => item.id).join(','), 'completeness,zeroing,pumping,release,recording,retake');
assert.equal(completeScore.total !== null && completeScore.total >= 70, true);

const overVented = scoreHeatCapacityFreeProcess(createOverVentedProcessScoringInputFixture());
assert.equal(overVented.items.find((item) => item.id === 'release')!.status, 'needs-improvement');
assert.equal(overVented.items.find((item) => item.id === 'release')!.score < 14, true);

const incomplete = scoreHeatCapacityFreeProcess(createIncompleteProcessScoringInputFixture());
assert.equal(incomplete.total, null);
assert.equal(incomplete.items.find((item) => item.id === 'completeness')!.status, 'insufficient-data');

console.log('heatCapacityFreeProcessScoringModel tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts
```

Expected: FAIL because the scoring model does not exist.

- [ ] **Step 3: Implement scoring input and score items**

Create `src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts`:

```ts
export interface HeatCapacityProcessScoringInput {
  traceTrial: HeatCapacityFreeTraceTrial;
  branch: HeatCapacityFreeTraceBranch;
  trial: HeatCapacityFreeTrial;
  summary: HeatCapacityProcessReviewSummary;
  upperBound: HeatCapacityOperationUpperBound;
}

export const SCORE_MAX = {
  completeness: 15,
  zeroing: 15,
  pumping: 20,
  release: 20,
  recording: 20,
  retake: 10,
} as const;
```

Add helper exports in `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts` that return `HeatCapacityProcessScoringInput`, not a finished review:

```ts
export const createCompleteProcessScoringInputFixture = (): HeatCapacityProcessScoringInput => {
  const { traceTrial, branch, trial } = createCompleteProcessReviewFixtureParts();
  const summary = createProcessReviewSummaryForTest(traceTrial, branch, trial, 1.4);
  const upperBound = selectHeatCapacityBestRecordWindows(traceTrial, branch, trial, 1.4);
  return { traceTrial, branch, trial, summary, upperBound };
};

export const createOverVentedProcessScoringInputFixture = (): HeatCapacityProcessScoringInput => {
  const { traceTrial, branch, trial } = createOverVentedProcessReviewFixtureParts();
  const summary = createProcessReviewSummaryForTest(traceTrial, branch, trial, 1.4);
  const upperBound = selectHeatCapacityBestRecordWindows(traceTrial, branch, trial, 1.4);
  return { traceTrial, branch, trial, summary, upperBound };
};

export const createIncompleteProcessScoringInputFixture = (): HeatCapacityProcessScoringInput => {
  const { traceTrial, branch, trial } = createIncompleteProcessReviewFixtureParts();
  const summary = createProcessReviewSummaryForTest(traceTrial, branch, trial, 1.4);
  const upperBound = selectHeatCapacityBestRecordWindows(traceTrial, branch, trial, 1.4);
  return { traceTrial, branch, trial, summary, upperBound };
};
```

`createProcessReviewSummaryForTest` should live in the helper file and build only the summary shape needed by scoring tests. It must not call `scoreHeatCapacityFreeProcess`, because that is the unit under test.

```ts
const toReviewRecordValueForTest = (
  record: HeatCapacityFreeRecord | null,
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityProcessReviewRecordValue | null => record
  ? {
    atS: record.atS,
    displayPressureMv: record.displayPressureMv,
    displayTemperatureMv: record.displayTemperatureMv,
    pressureDeltaKPa: Number((record.displayPressureMv / config.sensor.pressureMvPerKPa).toFixed(3)),
    temperatureDeltaK: Number(((record.displayTemperatureMv - config.sensor.temperatureMvAtAmbient) / config.sensor.temperatureMvPerK).toFixed(3)),
  }
  : null;

export const createProcessReviewSummaryForTest = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  theoreticalGamma = 1.4,
): HeatCapacityProcessReviewSummary => ({
  trialIndex: 1,
  trialId: trial.id,
  traceTrialId: traceTrial.id,
  branchId: branch.id,
  branchCount: traceTrial.branches.length,
  retakeCount: Math.max(0, traceTrial.branches.length - 1),
  u1: toReviewRecordValueForTest(trial.u1, traceTrial.configSnapshot),
  u2: toReviewRecordValueForTest(trial.u2, traceTrial.configSnapshot),
  gamma: trial.correctedSignals?.gamma ?? null,
  relativeErrorPercent: trial.correctedSignals
    ? Number((Math.abs(trial.correctedSignals.gamma - theoreticalGamma) / theoreticalGamma * 100).toFixed(2))
    : null,
  upperBoundGamma: null,
  upperBoundRelativeErrorPercent: null,
  upperBoundGapPercent: null,
});
```

- [ ] **Step 4: Implement deterministic item scoring**

Use these rules:

```ts
const scoreCompleteness = (trial: HeatCapacityFreeTrial): HeatCapacityProcessScoreItem => {
  const complete = Boolean(trial.u0 && trial.u1 && trial.u2 && trial.correctedSignals);
  return {
    id: 'completeness',
    label: '数据完整性',
    maxScore: 15,
    score: complete ? 15 : 0,
    status: complete ? 'reasonable' : 'insufficient-data',
    evidence: complete ? 'U0 / U1 / U2 与计算结果完整。' : '缺少完整 U0 / U1 / U2 或计算结果。',
    relation: complete ? '可用于评分和过程诊断。' : '只能显示已采集 trace，不能生成完整评分。',
    recommendation: complete ? '保持完整记录链路。' : '完成三次手动记录后再查看评分。',
  };
};
```

For other items:

- Zeroing: full score if U0 best window exists and manual U0 is inside or close to it; otherwise proportional.
- Pumping: full score if U1 pressure is in recommended range and no danger; warning reduces 3 points; insufficient pressure reduces at least 8 points; danger reduces at least 12 points.
- Release: full score if U2/U1 is in valid band and stopcock duration is not extreme; over-vented reduces at least 10 points.
- Recording: compare manual U0/U1/U2 to best windows; each outside-window record reduces points.
- Retake: 10 for no retake, 8 for one retake, 6 for two, 4 for more than two; missing trace gives 0.

Every item must produce `evidence`, `relation`, and `recommendation` strings.

- [ ] **Step 5: Add score to process review output**

Extend `HeatCapacityFreeProcessReview`:

```ts
score: HeatCapacityProcessScore;
```

Use `scoreHeatCapacityFreeProcess` in `selectHeatCapacityFreeProcessReview` after summary and upper bound are created.

For empty/missing trace returns:

```ts
score: {
  total: null,
  maxScore: 100,
  items: [],
},
```

- [ ] **Step 6: Replace diagnosis rows with score-backed rows**

Extend `HeatCapacityProcessDiagnosisRow`:

```ts
relation: string;
score: number | null;
maxScore: number | null;
```

Map score items to diagnosis rows with this exact ownership:

- Summary uses `score.total` and includes no item-level details.
- Diagnosis table rows remain exactly four rows: `pumping`, `release`, `recording`, `retake`.
- `pumping` maps from the `pumping` score item.
- `release` maps from the `release` score item.
- `retake` maps from the `retake` score item.
- `recording` combines `completeness`, `zeroing`, and `recording`.

Use this helper for the combined recording row:

```ts
const combineScoreItems = (
  id: HeatCapacityProcessDiagnosisId,
  title: string,
  items: HeatCapacityProcessScoreItem[],
): HeatCapacityProcessDiagnosisRow => {
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0);
  const status = items.some((item) => item.status === 'needs-improvement')
    ? 'needs-improvement'
    : items.some((item) => item.status === 'review' || item.status === 'insufficient-data')
      ? 'review'
      : 'reasonable';
  return {
    id,
    title,
    status,
    score,
    maxScore,
    evidence: items.map((item) => item.evidence).filter(Boolean).join('；'),
    relation: items.map((item) => item.relation).filter(Boolean).join('；'),
    recommendation: items.map((item) => item.recommendation).filter(Boolean).join('；'),
  };
};
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessScoringModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
```

Expected: Both pass.

---

## Batch 6: Chart Layer Integration

**Goal:** Show standard reference curve and best record windows inside the existing pressure/temperature charts without adding new charts.

**Files:**

- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.css`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

- [ ] **Step 1: Write failing static UI tests**

Add:

```ts
assert.match(processReviewPanelSource, /hpr-reference-line/, 'process review charts should render the standard reference curve');
assert.match(processReviewPanelSource, /hpr-best-window/, 'process review charts should render best record windows');
assert.match(processReviewPanelSource, /referenceTrace/, 'process review charts should consume reference trace data');
assert.match(processReviewPanelSource, /bestWindows/, 'process review charts should consume best record windows');
assert.match(processReviewStyleSource, /\.hpr-reference-line/, 'reference curve should have an explicit style');
assert.match(processReviewStyleSource, /\.hpr-best-window/, 'best record window should have an explicit style');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL because chart layers do not exist.

- [ ] **Step 3: Draw reference line**

In `ProcessChart`, create:

```ts
const referencePath = useMemo(
  () => buildLinePath(chart.referenceTrace, kind, timeToX, domain),
  [chart.referenceTrace, kind, timeToX, domain],
);
```

Render before the actual trace:

```tsx
{referencePath ? (
  <path className="hpr-reference-line" d={referencePath} />
) : null}
<path className="hpr-trace-line" d={linePath} stroke={stroke} />
```

- [ ] **Step 4: Draw best windows**

For each window, render a vertical translucent region in both charts:

```tsx
{chart.bestWindows.map((window) => {
  if (window.startS >= window.endS) return null;
  const x = timeToX(window.startS);
  const width = Math.max(3, timeToX(window.endS) - x);
  return (
    <g className={`hpr-best-window hpr-best-window-${window.recordId}`} key={`${kind}-${window.recordId}`}>
      <rect x={x} y={PLOT_TOP} width={width} height={PLOT_BOTTOM - PLOT_TOP} />
      <title>{`${window.recordId.toUpperCase()} 最佳窗口：${window.reason}`}</title>
    </g>
  );
})}
```

Render windows before lines so they do not cover data.

- [ ] **Step 5: Add styles**

In CSS:

```css
.hpr-reference-line {
  fill: none;
  stroke: var(--hpr-muted);
  stroke-width: 1.35;
  stroke-dasharray: 5 4;
  opacity: 0.72;
}

.hpr-best-window rect {
  fill: var(--hpr-accent);
  opacity: 0.1;
}

.hpr-best-window-u0 rect {
  opacity: 0.08;
}
```

- [ ] **Step 6: Add legend text without crowding current control legend**

Add a compact chart legend near the existing legend:

```tsx
<span className="hpr-line-legend hpr-line-legend-trace">实测 trace</span>
<span className="hpr-line-legend hpr-line-legend-reference">标准参考</span>
<span className="hpr-line-legend hpr-line-legend-window">最佳窗口</span>
```

Keep it in the sticky heading so horizontal scrolling does not move the legend.

- [ ] **Step 7: Run UI tests and typecheck**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

Expected: Both pass.

---

## Batch 7: Summary And Diagnosis Fusion UI

**Goal:** Merge upper bound and score into the existing summary and diagnosis table without repeating information.

**Files:**

- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.css`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

- [ ] **Step 1: Write failing static tests**

Add:

```ts
assert.match(processReviewPanelSource, /upperBoundGamma/, 'summary should display operation upper-bound gamma');
assert.match(processReviewPanelSource, /upperBoundGapPercent/, 'summary should display actual-vs-upper-bound gap');
assert.match(processReviewPanelSource, /review\.score\.total/, 'summary should display operation score');
assert.match(processReviewPanelSource, /row\.relation/, 'diagnosis rows should explain relation to best windows or reference');
assert.match(processReviewPanelSource, /row\.score/, 'diagnosis rows should display item scores');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Update summary grid**

Replace the current four metric cells with:

```tsx
<div>
  <span>γ</span>
  <strong>{formatMetric(summary.gamma, 3)}</strong>
  <small>相对误差 {formatMetric(summary.relativeErrorPercent, 2, '%')}</small>
</div>
<div>
  <span>操作上限 γ</span>
  <strong>{formatMetric(summary.upperBoundGamma, 3)}</strong>
  <small>与上限差距 {formatMetric(summary.upperBoundGapPercent, 2, '%')}</small>
</div>
<div>
  <span>操作评分</span>
  <strong>{review.score.total === null ? '--' : `${review.score.total} / 100`}</strong>
  <small>基于本次 trace 派生</small>
</div>
<div>
  <span>退回 / 重录</span>
  <strong>{retakeText}</strong>
  <small>隐藏分支 {summary.retakeCount} 条</small>
</div>
```

Do not duplicate U1/U2 metrics in summary. U1/U2 details remain available through record markers and diagnosis evidence.

- [ ] **Step 4: Update diagnosis row layout**

Render:

```tsx
<div className="hpr-diagnosis-row" key={row.id}>
  <strong>{row.title}</strong>
  <span>{row.evidence}</span>
  <span>{row.relation}</span>
  <span>{row.recommendation}</span>
  <em className={`hpr-diagnosis-status hpr-diagnosis-status-${row.status}`}>
    {row.score === null || row.maxScore === null
      ? diagnosisStatusLabels[row.status]
      : `${row.score} / ${row.maxScore}`}
  </em>
</div>
```

- [ ] **Step 5: Adjust diagnosis grid styles**

Use five columns:

```css
.hpr-diagnosis-row {
  grid-template-columns: 104px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 72px;
}
```

At narrow widths, keep the existing single-column media query.

- [ ] **Step 6: Run UI tests and typecheck**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

Expected: Both pass.

---

## Batch 8: Empty, Incomplete, Legacy, And Free-Only Guards

**Goal:** Ensure new functionality does not break old files, incomplete groups, or non-Free modes.

**Files:**

- Modify: `src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts`
- Modify: `src/features/heatCapacity/HeatCapacityProcessReviewPanel.tsx`
- Test: `tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts`
- Test: `tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts`

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

- [ ] **Step 1: Add model tests for incomplete and missing trace groups**

Add:

```ts
const incompleteTrial: HeatCapacityFreeTrial = {
  ...trial,
  id: 'free-trial-incomplete',
  u1: null,
  u2: null,
  correctedSignals: null,
};

const incompleteReview = selectHeatCapacityFreeProcessReview({
  trials: [incompleteTrial],
  traceStore: store,
  selectedTrialId: incompleteTrial.id,
});

assert.equal(incompleteReview.status, 'incomplete');
assert.equal(incompleteReview.summary?.gamma, null);
assert.equal(incompleteReview.score.total, null);
assert.equal(incompleteReview.chart.trace.length > 0, true);
```

- [ ] **Step 2: Add UI tests for Free-only behavior**

Add static assertions:

```ts
assert.match(processReviewPanelSource, /mode !== 'free'/, 'process review scoring should remain Free Mode only');
assert.doesNotMatch(processReviewPanelSource, /demo[^\\n]+upperBoundGamma|guide[^\\n]+upperBoundGamma/, 'Demo and Guide modes should not render upper-bound scoring');
```

- [ ] **Step 3: Implement null-safe score and upper bound handling**

All UI fields must format `null` as `--`. The panel must not call `.toFixed` directly on nullable score fields.

Use:

```ts
const formatScore = (score: number | null | undefined, max = 100) => (
  typeof score === 'number' && Number.isFinite(score)
    ? `${score} / ${max}`
    : '--'
);
```

- [ ] **Step 4: Keep Demo / Guide empty message**

Existing `mode !== 'free'` branch stays before summary rendering. Do not compute or display score in that branch.

- [ ] **Step 5: Run tests**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityFreeProcessReviewModel.test.ts
npm.cmd exec tsx -- tests/heatCapacity/workbenchHeatCapacityInstrumentUi.test.ts
npm.cmd exec tsc -- --noEmit
```

Expected: All pass.

---

## Batch 9: Acceptance Script And Regression Matrix

**Goal:** Add an automated process-review acceptance test that verifies the complete fused feature across representative traces.

**Files:**

- Create: `tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts`
- Modify: `scripts/runTests.cjs` only if the runner does not already discover the new test file.

**Acceptance Commands:**

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts
npm.cmd test
```

- [ ] **Step 1: Write acceptance scenarios**

First extend `tests/heatCapacity/helpers/heatCapacityProcessReviewTestFactory.ts` with review-level helpers used only by acceptance tests:

```ts
const createReviewFromParts = (parts: HeatCapacityProcessReviewFixtureParts) => {
  const traceStore: HeatCapacityFreeTraceStore = {
    ...parts.traceStore,
    traceTrials: parts.traceStore.traceTrials.map((traceTrial) => (
      traceTrial.id === parts.traceTrial.id ? parts.traceTrial : traceTrial
    )),
  };
  return selectHeatCapacityFreeProcessReview({
    trials: [parts.trial],
    traceStore,
    theoreticalGamma: 1.4,
    selectedTrialId: parts.trial.id,
  });
};

export const createStandardOperationReviewFixture = () => (
  createReviewFromParts(createCompleteProcessReviewFixtureParts())
);

export const createOverVentedProcessReviewFixture = () => (
  createReviewFromParts(createOverVentedProcessReviewFixtureParts())
);

export const createIncompleteProcessReviewFixture = () => (
  createReviewFromParts(createIncompleteProcessReviewFixtureParts())
);
```

Add these scenario helpers in the same file by creating fixture parts with the shown pressure/time changes:

```ts
export const createInsufficientPumpReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  const weakU1 = parts.trial.u1
    ? { ...parts.trial.u1, displayPressureMv: parts.traceTrial.configSnapshot.record.minimumUsefulU1CorrectedMv - 8 }
    : null;
  return createReviewFromParts({
    ...parts,
    trial: {
      ...parts.trial,
      u1: weakU1,
      correctedSignals: calculateFreeHeatCapacityTrialSignals({ ...parts.trial, u1: weakU1 }, {
        atmosphericPressureKPa: parts.traceTrial.configSnapshot.environment.atmosphericPressureKPa,
        pressureSensitivityMvPerKPa: parts.traceTrial.configSnapshot.sensor.pressureMvPerKPa,
      }),
    },
  });
};

export const createEarlyU1RecordReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  return createReviewFromParts({
    ...parts,
    trial: {
      ...parts.trial,
      u1: parts.trial.u1 ? { ...parts.trial.u1, atS: 18, traceSampleId: 'early-u1-sample' } : null,
    },
  });
};

export const createEarlyU2RecordReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  return createReviewFromParts({
    ...parts,
    trial: {
      ...parts.trial,
      u2: parts.trial.u2 ? { ...parts.trial.u2, atS: 61, traceSampleId: 'early-u2-sample' } : null,
    },
  });
};

export const createRetakeReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  const archivedBranch: HeatCapacityFreeTraceBranch = {
    ...parts.branch,
    status: 'archived',
    hiddenInDefaultChart: true,
  };
  const retakeBranch: HeatCapacityFreeTraceBranch = {
    ...parts.branch,
    id: `${parts.branch.id}-retake`,
    parentBranchId: parts.branch.id,
    createdByEventId: 'retake-event-1',
    status: 'main',
    hiddenInDefaultChart: false,
  };
  return createReviewFromParts({
    ...parts,
    traceTrial: {
      ...parts.traceTrial,
      activeBranchId: retakeBranch.id,
      branches: [archivedBranch, retakeBranch],
    },
    trial: {
      ...parts.trial,
      branchCount: 2,
    },
  });
};
```

Create `tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts`:

```ts
import assert from 'node:assert/strict';
import {
  createStandardOperationReviewFixture,
  createInsufficientPumpReviewFixture,
  createOverVentedProcessReviewFixture,
  createEarlyU1RecordReviewFixture,
  createEarlyU2RecordReviewFixture,
  createRetakeReviewFixture,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const standard = createStandardOperationReviewFixture();
assert.equal(standard.status, 'ready');
assert.equal(standard.score.total !== null && standard.score.total >= 80, true);
assert.equal(standard.summary?.upperBoundGamma !== null, true);
assert.equal(standard.chart.referenceTrace.length > 0, true);
assert.equal(standard.chart.bestWindows.length, 3);

const insufficientPump = createInsufficientPumpReviewFixture();
assert.equal(insufficientPump.diagnostics.find((row) => row.id === 'pumping')?.status, 'needs-improvement');

const overVented = createOverVentedProcessReviewFixture();
assert.equal(overVented.diagnostics.find((row) => row.id === 'release')?.status, 'needs-improvement');

const earlyU1 = createEarlyU1RecordReviewFixture();
assert.equal(earlyU1.diagnostics.find((row) => row.id === 'recording')?.status, 'review');

const earlyU2 = createEarlyU2RecordReviewFixture();
assert.equal(earlyU2.diagnostics.find((row) => row.id === 'recording')?.status, 'review');

const retake = createRetakeReviewFixture();
assert.equal(retake.summary?.retakeCount, 1);
assert.equal(retake.diagnostics.find((row) => row.id === 'retake')?.status, 'retaken');

console.log('heatCapacityProcessReviewAcceptance tests passed');
```

- [ ] **Step 2: Run acceptance test**

Run:

```powershell
npm.cmd exec tsx -- tests/heatCapacity/heatCapacityProcessReviewAcceptance.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```powershell
npm.cmd test
```

Expected: All test files pass. If chunk warning appears during build later, treat it as existing Vite warning unless the build fails.

---

## Batch 10: Preview And Visual Verification

**Goal:** Verify the fused UI in the actual app on fixed port 5174.

**Files:** No required source edits unless visual verification exposes defects.

**Acceptance Commands:**

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd test
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

- [ ] **Step 1: Run final typecheck, build, and tests**

Run:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd test
```

Expected: Typecheck/build/tests pass. Existing Vite chunk-size warnings are acceptable if build exits 0.

- [ ] **Step 2: Start or reuse fixed-port preview**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected: App is available at `http://127.0.0.1:5174/`. If port 5174 is occupied by a different project, stop and ask before changing port.

- [ ] **Step 3: Visual checks**

Open `http://127.0.0.1:5174/` and verify:

- Process Review in Free Mode shows a group menu at the right side of the process chart heading.
- Switching groups updates summary, chart, and diagnosis rows.
- The standard reference curve appears as a subtle dashed line in both pressure and temperature charts.
- Best record windows appear as low-emphasis regions and do not cover actual trace lines.
- Summary shows gamma, relative error, operation upper-bound gamma, upper-bound gap, operation score, and retake count without repeating U1/U2 blocks.
- Diagnosis rows show evidence, relation, recommendation, and score.
- Demo Mode / Guide Mode still show the Free-only empty message.
- Dark and light themes are readable.
- Horizontal chart scrolling and standard vertical result-tab scrolling still work.

- [ ] **Step 4: Clean transient artifacts**

If Playwright or preview tools create `.playwright-mcp`, screenshots, temp logs, or other task-local transient artifacts, delete only those artifacts created during verification:

```powershell
if (Test-Path '.playwright-mcp') { Remove-Item -LiteralPath '.playwright-mcp' -Recurse -Force }
```

Do not delete user-authored files or ambiguous artifacts.

---

## Batch 11: Final Review Checklist

**Goal:** Ensure the implementation matches the agreed product behavior and does not introduce persistence or mode leakage.

**Files:** No source edits unless checklist finds a defect.

- [ ] **Step 1: Check no data format persistence was added**

Run:

```powershell
Select-String -Path 'src\features\workbench\workbenchSession.ts','src\features\workbench\workbenchState.ts' -Pattern 'upperBoundGamma|operationScore|bestWindows|referenceTrace|selectedProcessReviewTrialId|heatCapacityReviewSelectionByFileId'
```

Expected: `workbenchSession.ts` has no matches for these fields. `workbenchState.ts` should not persist them into file/session payloads.

- [ ] **Step 2: Check Free-only containment**

Run:

```powershell
Select-String -Path 'src\features\heatCapacity\HeatCapacityProcessReviewPanel.tsx','src\domain\heatCapacity\heatCapacityFreeProcessReviewModel.ts' -Pattern 'mode !== ''free''|selectHeatCapacityFreeProcessReview|scoreHeatCapacityFreeProcess'
```

Expected: UI scoring path remains gated by Free Mode; process review selector is only called for Heat Capacity review content.

- [ ] **Step 3: Check exact information ownership**

Confirm manually:

- Total gamma and total score appear only in summary.
- Reference curve appears only in chart.
- Best windows appear only in chart and tooltips.
- Item-level scoring appears only in diagnosis rows.
- Group switching appears only in process chart heading.

- [ ] **Step 4: Prepare user summary**

Report:

- Changed files.
- Passed commands and results.
- Remaining risks, especially score-threshold tuning.
- Preview URL and reusable preview command.

---

## Risk Notes

- Score thresholds may need tuning after user tests real operation traces. The first implementation should keep thresholds deterministic and easy to adjust.
- Standard reference curve is stage-aligned, not absolute-time aligned. The UI must communicate this in tooltip or legend text.
- Best-window selection must not optimize for gamma closeness. If future tests reveal answer-chasing behavior, stop and revise the candidate quality formula.
- If current process review copy remains mojibake in source due encoding issues, fix only touched strings in this feature scope and avoid broad copy rewrites.

## Execution Notes

- Execute batches in order.
- At the start of each batch, restate the batch goal, files, and acceptance commands.
- If code reality conflicts with this plan, stop and ask for a decision before changing the product goal.
- Do not commit, push, or publish unless the user explicitly requests it.
- After user-facing changes, verify preview on `http://127.0.0.1:5174/`.
