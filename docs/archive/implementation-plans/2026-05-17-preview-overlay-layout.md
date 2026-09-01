# 3D Preview Overlay Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让工作台里的三维预览窗口在所有已知显示状态下满足“浮层不互相重叠、不压住主要模型、统一靠角留白、小模块平滑让位给大模块”。

**Architecture:** 保留现有三维模型、状态流和实验交互，只重构三维窗口的浮层排版层。热容仪器预览使用一个统一 overlay layer 管理四角槽位和居中提示；普通 `SimulationCanvas` 同步使用同一套边距变量。小组件让位动画使用稳定 DOM key 的 FLIP 位移动画，避免依赖单个面板高度的特例测量。

**Tech Stack:** React, TypeScript, CSS, Vite, existing Node static test scripts, Playwright manual verification on port 5174.

---

## Current Baseline

- `<project-root>\App.tsx` 已有上一轮 16:9 工作台 frame 改动，当前标准视觉基准是 `1440 x 810`。
- `<project-root>\components\WorkbenchStudioPrototype.tsx` 当前在热容预览父层渲染这些浮层：stopcock mini readout、压力警告、右下控制栈、演示步骤面板、完成 toast、手动步骤 hint。
- `<project-root>\components\heatCapacity\HeatCapacityInstrumentScene.tsx` 当前在三维场景内部渲染这些浮层：默认视角按钮、硬球开关、硬球说明、交互说明、hover tooltip、三个 focus panel。
- `<project-root>\components\WorkbenchStudioPrototype.css` 当前存在多套浮层边距：`8px`、`10px`、`12px`、`14px`、`18px`、`24px+`。
- `<project-root>\components\SimulationCanvas.tsx` 的普通工作台三维窗口使用独立的 `8px` 工具和提示边距。

## Desired Layout Contract

- Every non-center overlay lives in exactly one corner slot:
  - Top left: status/readout/explanatory toggles.
  - Top right: demo/explanation panels and reset actions.
  - Bottom left: operation hints.
  - Bottom right: focus panels, record controls, next-trial controls, hover tooltip.
- Center overlays are reserved for modal-like or toast-like prompts:
  - Pressure warning.
  - Demo complete toast.
  - Manual step hint / locked interaction hint.
- Uniform viewport inset:
  - `--studio-preview-overlay-inset: 18px`
  - `--studio-preview-overlay-gap: 10px`
- Big modules keep the actual corner.
  - In a top slot, the big module is first and small modules move downward.
  - In a bottom slot, the big module is last and small modules move upward.
- Movement is animated for existing small modules when a big module appears or disappears.

## File Structure

- Modify `<project-root>\components\WorkbenchStudioPrototype.tsx`
  - Pass parent-owned heat-capacity overlays into the instrument scene.
  - Remove `heatCapacityFocusPanelHeightPx` and the focus-panel `ResizeObserver` special case.
  - Keep existing experiment state and button handlers unchanged.
- Modify `<project-root>\components\heatCapacity\HeatCapacityInstrumentScene.tsx`
  - Add overlay slot props.
  - Render one heat overlay layer with four corner slots plus center and bottom-center prompt slots.
  - Move internal scene chrome into those slots.
- Modify `<project-root>\components\WorkbenchStudioPrototype.css`
  - Add shared overlay tokens and slot CSS.
  - Convert heat overlay selectors from absolute coordinates to slot-contained blocks.
  - Align `SimulationCanvas` workbench overlay spacing with the same tokens.
- Create `<project-root>\components\usePreviewOverlayMotion.ts`
  - Provide a small FLIP animation hook for visible overlay items with stable `data-preview-overlay-item` keys.
- Create `<project-root>\scripts\workbenchPreviewOverlayLayout.test.ts`
  - Static tests for the overlay contract, shared tokens, slot usage, removal of focus-height special case, and standard canvas spacing alignment.

---

### Task 1: Add Failing Overlay Contract Test

**Files:**
- Create: `<project-root>\scripts\workbenchPreviewOverlayLayout.test.ts`

- [ ] **Step 1: Create the failing static test**

Add this file:

```ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workbenchPath = join(root, 'components', 'WorkbenchStudioPrototype.tsx');
const scenePath = join(root, 'components', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const canvasPath = join(root, 'components', 'SimulationCanvas.tsx');
const stylePath = join(root, 'components', 'WorkbenchStudioPrototype.css');
const motionPath = join(root, 'components', 'usePreviewOverlayMotion.ts');

for (const path of [workbenchPath, scenePath, canvasPath, stylePath]) {
  assert.equal(existsSync(path), true, `${path} should exist`);
}

const workbenchSource = readFileSync(workbenchPath, 'utf8');
const sceneSource = readFileSync(scenePath, 'utf8');
const canvasSource = readFileSync(canvasPath, 'utf8');
const styleSource = readFileSync(stylePath, 'utf8');

assert.match(styleSource, /--studio-preview-overlay-inset:\s*18px/, 'preview overlays should use one shared edge inset');
assert.match(styleSource, /--studio-preview-overlay-gap:\s*10px/, 'preview overlays should use one shared inter-item gap');
assert.match(styleSource, /\.studio-preview-overlay-layer/, 'heat preview should define one overlay layer');
assert.match(styleSource, /\.studio-preview-overlay-slot-top-left/, 'overlay layer should expose a top-left slot');
assert.match(styleSource, /\.studio-preview-overlay-slot-top-right/, 'overlay layer should expose a top-right slot');
assert.match(styleSource, /\.studio-preview-overlay-slot-bottom-left/, 'overlay layer should expose a bottom-left slot');
assert.match(styleSource, /\.studio-preview-overlay-slot-bottom-right/, 'overlay layer should expose a bottom-right slot');
assert.match(styleSource, /\.studio-preview-overlay-center/, 'overlay layer should expose a center prompt slot');

assert.equal(existsSync(motionPath), true, 'overlay motion hook should exist');
const motionSource = readFileSync(motionPath, 'utf8');
assert.match(motionSource, /usePreviewOverlayMotion/, 'motion hook should be named usePreviewOverlayMotion');
assert.match(motionSource, /data-preview-overlay-item/, 'motion hook should animate stable overlay item keys');
assert.match(motionSource, /prefers-reduced-motion:\s*reduce/, 'motion hook should respect reduced motion preferences');

assert.match(sceneSource, /overlayTopLeft\?:\s*React\.ReactNode/, 'instrument scene should accept top-left overlays from the parent');
assert.match(sceneSource, /overlayTopRight\?:\s*React\.ReactNode/, 'instrument scene should accept top-right overlays from the parent');
assert.match(sceneSource, /overlayBottomRight\?:\s*React\.ReactNode/, 'instrument scene should accept bottom-right overlays from the parent');
assert.match(sceneSource, /overlayCenter\?:\s*React\.ReactNode/, 'instrument scene should accept center overlays from the parent');
assert.match(sceneSource, /overlayBottomCenter\?:\s*React\.ReactNode/, 'instrument scene should accept bottom-center overlays from the parent');
assert.match(sceneSource, /usePreviewOverlayMotion/, 'instrument scene should animate displaced overlay items');
assert.match(sceneSource, /studio-preview-overlay-slot-top-left/, 'instrument scene should render top-left overlay slot');
assert.match(sceneSource, /data-preview-overlay-item="heat-hard-sphere-toggle"/, 'hard-sphere toggle should be a tracked overlay item');
assert.match(sceneSource, /data-preview-overlay-item="heat-focus-panel"/, 'focus panel should be a tracked overlay item');
assert.match(sceneSource, /data-preview-overlay-item="heat-view-reset"/, 'reset action should be a tracked overlay item');
assert.doesNotMatch(sceneSource, /className="studio-heat-view-reset"[\s\S]{0,80}<Canvas/, 'reset button should live in the overlay layer before/after the canvas, not float independently over the model');

assert.match(workbenchSource, /overlayTopLeft=\{heatCapacityTopLeftOverlay\}/, 'workbench should pass top-left overlay content into the heat scene');
assert.match(workbenchSource, /overlayTopRight=\{heatCapacityTopRightOverlay\}/, 'workbench should pass top-right overlay content into the heat scene');
assert.match(workbenchSource, /overlayBottomRight=\{heatCapacityBottomRightOverlay\}/, 'workbench should pass bottom-right overlay content into the heat scene');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}/, 'workbench should pass centered prompts into the heat scene');
assert.match(workbenchSource, /overlayBottomCenter=\{heatCapacityBottomCenterOverlay\}/, 'workbench should pass bottom-centered prompts into the heat scene');
assert.doesNotMatch(workbenchSource, /heatCapacityFocusPanelHeightPx/, 'focus panel height should not be measured as a one-off layout workaround');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-focus-panel'\]/, 'workbench should not query the scene DOM to make sibling overlays move');
assert.doesNotMatch(workbenchSource, /--heat-record-focus-offset/, 'record controls should move through the shared overlay stack, not a focus-only CSS variable');

assert.match(styleSource, /\.simulation-canvas-workbench-frame[\s\S]*--studio-preview-overlay-inset/, 'standard workbench 3D canvas should inherit the shared overlay inset');
assert.doesNotMatch(styleSource, /\.simulation-canvas-workbench-tools\s*\{[\s\S]*top:\s*8px/, 'standard 3D tools should not use the old 8px top inset');
assert.doesNotMatch(styleSource, /\.simulation-canvas-workbench-hint\s*\{[\s\S]*left:\s*8px/, 'standard 3D hint should not use the old 8px left inset');

assert.doesNotMatch(styleSource, /\.studio-heat-hard-sphere-toggle\s*\{[\s\S]*position:\s*absolute/, 'hard-sphere toggle should be positioned by its slot');
assert.doesNotMatch(styleSource, /\.studio-heat-focus-panel\s*\{[\s\S]*right:\s*14px/, 'focus panel should be positioned by its slot');
assert.doesNotMatch(styleSource, /\.studio-heat-demo-step-panel\s*\{[\s\S]*top:\s*48px/, 'demo step panel should be positioned by its slot');
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
```

Expected: FAIL because overlay tokens, motion hook, scene overlay props, and slot markup are not implemented yet.

---

### Task 2: Add Shared Overlay Motion Hook

**Files:**
- Create: `<project-root>\components\usePreviewOverlayMotion.ts`

- [ ] **Step 1: Add the hook**

Create:

```ts
import { useLayoutEffect, useRef } from 'react';

const OVERLAY_MOTION_DURATION_MS = 240;
const OVERLAY_MOTION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const MINIMUM_MOTION_PX = 0.5;

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const usePreviewOverlayMotion = <ElementType extends HTMLElement>() => {
  const rootRef = useRef<ElementType | null>(null);
  const previousRectsRef = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-preview-overlay-item]'));
    const nextRects = new Map<string, DOMRect>();

    for (const item of items) {
      const key = item.dataset.previewOverlayItem;
      if (!key) continue;
      nextRects.set(key, item.getBoundingClientRect());
    }

    if (!prefersReducedMotion()) {
      for (const item of items) {
        const key = item.dataset.previewOverlayItem;
        if (!key) continue;

        const previousRect = previousRectsRef.current.get(key);
        const nextRect = nextRects.get(key);
        if (!previousRect || !nextRect) continue;

        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaX) < MINIMUM_MOTION_PX && Math.abs(deltaY) < MINIMUM_MOTION_PX) continue;

        item.animate(
          [
            { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          {
            duration: OVERLAY_MOTION_DURATION_MS,
            easing: OVERLAY_MOTION_EASING,
          },
        );
      }
    }

    previousRectsRef.current = nextRects;
  });

  return rootRef;
};

export default usePreviewOverlayMotion;
```

- [ ] **Step 2: Run the focused static test**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
```

Expected: still FAIL, but the failures about `components\usePreviewOverlayMotion.ts` should be gone.

---

### Task 3: Render One Overlay Layer Inside HeatCapacityInstrumentScene

**Files:**
- Modify: `<project-root>\components\heatCapacity\HeatCapacityInstrumentScene.tsx`

- [ ] **Step 1: Add overlay props to the props interface**

In `HeatCapacityInstrumentSceneProps`, add:

```ts
  overlayTopLeft?: React.ReactNode;
  overlayTopRight?: React.ReactNode;
  overlayBottomRight?: React.ReactNode;
  overlayCenter?: React.ReactNode;
  overlayBottomCenter?: React.ReactNode;
```

- [ ] **Step 2: Import the motion hook**

Near the existing imports, add:

```ts
import usePreviewOverlayMotion from '../usePreviewOverlayMotion';
```

- [ ] **Step 3: Create the motion ref inside the component**

Inside `HeatCapacityInstrumentScene`, near other refs/state:

```ts
  const overlayMotionRef = usePreviewOverlayMotion<HTMLDivElement>();
```

- [ ] **Step 4: Extract the three focus panels into one render helper**

Keep the existing JSX content and handlers unchanged, but wrap the current conditional focus-panel JSX in a helper:

```tsx
  const renderFocusPanel = () => {
    if (focusMode === 'stopcock') {
      return (
        <div
          className="studio-heat-focus-panel studio-heat-focus-panel-stopcock"
          data-heat-capacity-focus-panel="stopcock"
          data-preview-overlay-item="heat-focus-panel"
        >
          {/* move the current stopcock focus panel content here unchanged */}
        </div>
      );
    }

    if (focusMode === 'pump') {
      return (
        <div
          className="studio-heat-focus-panel studio-heat-focus-panel-pump"
          data-heat-capacity-focus-panel="pump"
          data-preview-overlay-item="heat-focus-panel"
        >
          {/* move the current pump focus panel content here unchanged */}
        </div>
      );
    }

    if (focusMode === 'instrument') {
      return (
        <div
          className="studio-heat-focus-panel studio-heat-focus-panel-instrument"
          data-heat-capacity-focus-panel="instrument"
          data-preview-overlay-item="heat-focus-panel"
        >
          {/* move the current instrument focus panel content here unchanged */}
        </div>
      );
    }

    return null;
  };
```

The implementation must move the current panel JSX exactly; do not change button handlers, copy strings, `disabled` rules, or data markers.

- [ ] **Step 5: Replace scattered overlay elements with one slot layer**

Inside the returned root, keep `<Canvas {...canvasProps}>...</Canvas>` where it is. Replace the current absolute overlay siblings with this layer after the canvas:

```tsx
      <div
        ref={overlayMotionRef}
        className="studio-preview-overlay-layer studio-heat-overlay-layer"
        data-preview-overlay-layer="heat-capacity"
      >
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-left">
          {props.overlayTopLeft ? (
            <div data-preview-overlay-item="heat-parent-top-left">
              {props.overlayTopLeft}
            </div>
          ) : null}
          <HeatCapacityHardSphereToggle
            enabled={props.hardSphereViewEnabled}
            onToggle={props.onHardSphereViewToggle}
            language={props.language}
          />
          {props.hardSphereViewEnabled ? (
            <div
              className="studio-heat-hard-sphere-note"
              data-heat-capacity-hard-sphere-note="true"
              data-preview-overlay-item="heat-hard-sphere-note"
            >
              <strong>{hardSphereNoteCopy.title}</strong>
              <span>{hardSphereNoteText}</span>
              <small>{hardSphereNoteCopy.footnote}</small>
            </div>
          ) : null}
        </div>

        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-right">
          {props.overlayTopRight ? (
            <div data-preview-overlay-item="heat-parent-top-right">
              {props.overlayTopRight}
            </div>
          ) : null}
          <button
            type="button"
            className="studio-heat-view-reset"
            data-heat-capacity-view-reset="true"
            data-preview-overlay-item="heat-view-reset"
            disabled={props.interactionLocked}
            onClick={() => {
              if (props.interactionLocked) {
                props.onLockedInteraction();
                return;
              }
              triggerSmoothDefaultView();
            }}
          >
            {sceneCopy.defaultView}
          </button>
        </div>

        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-bottom-left">
          <div
            className="studio-heat-interaction-hints"
            data-heat-capacity-interaction-hints="true"
            data-preview-overlay-item="heat-interaction-hints"
          >
            <strong>{sceneCopy.interactionTitle}</strong>
            {interactionHints.map((hint) => (
              <span key={hint}>{hint}</span>
            ))}
          </div>
        </div>

        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-bottom-right">
          {hoverTooltip ? (
            <div
              className="studio-heat-hover-tooltip"
              data-heat-capacity-hover-tooltip="true"
              data-preview-overlay-item="heat-hover-tooltip"
            >
              {hoverTooltip}
            </div>
          ) : null}
          {props.overlayBottomRight ? (
            <div data-preview-overlay-item="heat-parent-bottom-right">
              {props.overlayBottomRight}
            </div>
          ) : null}
          {renderFocusPanel()}
        </div>

        {props.overlayCenter ? (
          <div className="studio-preview-overlay-center" data-preview-overlay-center="true">
            {props.overlayCenter}
          </div>
        ) : null}

        {props.overlayBottomCenter ? (
          <div className="studio-preview-overlay-bottom-center" data-preview-overlay-bottom-center="true">
            {props.overlayBottomCenter}
          </div>
        ) : null}
      </div>
```

Important ordering:
- Top-left: parent large readout first, hard-sphere controls below.
- Top-right: parent demo panel first, reset below.
- Bottom-right: tooltip, parent controls, focus panel last. Because the slot is bottom-anchored, the focus panel keeps the corner and smaller items move upward.

- [ ] **Step 6: Run the focused static test**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
```

Expected: still FAIL because the workbench parent has not passed overlays yet and CSS has not been updated.

---

### Task 4: Pass Parent-Owned Heat Overlays Into The Scene

**Files:**
- Modify: `<project-root>\components\WorkbenchStudioPrototype.tsx`

- [ ] **Step 1: Remove focus-panel height state**

Delete:

```ts
  const [heatCapacityFocusPanelHeightPx, setHeatCapacityFocusPanelHeightPx] = useState(0);
```

Delete the `useEffect` that:
- checks `heatCapacityFocusMode === 'none'`
- queries `[data-heat-capacity-focus-panel]`
- creates `ResizeObserver`
- updates `heatCapacityFocusPanelHeightPx`

- [ ] **Step 2: Build named overlay nodes before rendering HeatCapacityInstrumentScene**

Inside the heat-capacity branch of `renderPreviewPanel`, before `<HeatCapacityInstrumentScene ... />`, define:

```tsx
            {(() => {
              const heatCapacityTopLeftOverlay = heatCapacityFocusMode === 'stopcock'
                && !autoDemoRunning
                && !autoDemoInteractionLocked
                ? renderHeatCapacityStopcockMiniReadout()
                : null;

              const heatCapacityTopRightOverlay = autoDemoStepPanelMode !== 'hidden'
                && (autoDemoRunning || autoDemoPaused || autoDemoStepTitle)
                ? (
                    <div
                      className={`studio-heat-demo-step-panel studio-heat-demo-step-panel-${autoDemoStepPanelMode}`}
                      data-heat-capacity-demo-step-panel="true"
                    >
                      {/* move the current demo step panel content here unchanged */}
                    </div>
                  )
                : null;

              const heatCapacityBottomRightOverlay = (
                <div className="studio-heat-preview-control-stack" data-heat-capacity-preview-control-stack="true">
                  {/* move the current manual reset / record / next trial controls here unchanged */}
                </div>
              );

              const heatCapacityCenterOverlay = (
                <>
                  {activeFile.pressureSafetyStatus === 'danger' || activeFile.pressureSafetyStatus === 'warning' ? (
                    <div className="studio-heat-pressure-warning" data-heat-capacity-pressure-warning="true">
                      {/* move the current pressure warning content here unchanged */}
                    </div>
                  ) : null}
                  {showHeatCapacityDemoCompleteToast ? (
                    <div className="studio-heat-demo-complete-toast" data-heat-capacity-demo-complete-toast="true">
                      {/* move the current demo complete toast content here unchanged */}
                    </div>
                  ) : null}
                </>
              );

              const heatCapacityBottomCenterOverlay = heatCapacityManualStepHint ? (
                <div className="studio-heat-manual-step-hint" data-heat-capacity-manual-step-hint="true">
                  {/* move the current manual step hint content here unchanged */}
                </div>
              ) : null;

              return (
                <HeatCapacityInstrumentScene
                  ...
                  overlayTopLeft={heatCapacityTopLeftOverlay}
                  overlayTopRight={heatCapacityTopRightOverlay}
                  overlayBottomRight={heatCapacityBottomRightOverlay}
                  overlayCenter={heatCapacityCenterOverlay}
                  overlayBottomCenter={heatCapacityBottomCenterOverlay}
                />
              );
            })()}
```

Use the existing `<HeatCapacityInstrumentScene>` props unchanged; only append the five overlay props.

- [ ] **Step 3: Remove focus-only offset styles from record controls**

Replace the current record/next-trial control style logic:

```ts
                const recordControlsStyle = heatCapacityFocusMode !== 'none'
                  ? ({
                      '--heat-record-focus-offset': `${heatCapacityFocusPanelHeightPx + 18}px`,
                    } as React.CSSProperties)
                  : undefined;
```

with:

```ts
                const recordControlsStyle = undefined;
```

Then remove `style={recordControlsStyle}` if TypeScript reports the value is unnecessary.

Do the same for `nextTrialControlsStyle`.

- [ ] **Step 4: Keep all existing user actions unchanged**

Verify these strings still exist in `WorkbenchStudioPrototype.tsx` after the move:

```txt
data-heat-capacity-record-controls="true"
data-heat-capacity-next-trial="true"
data-heat-capacity-demo-step-panel="true"
data-heat-capacity-pressure-warning="true"
data-heat-capacity-manual-step-hint="true"
```

- [ ] **Step 5: Run the focused static test**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
```

Expected: still FAIL because CSS is not converted yet.

---

### Task 5: Convert Heat Overlay CSS To Slot-Based Layout

**Files:**
- Modify: `<project-root>\components\WorkbenchStudioPrototype.css`

- [ ] **Step 1: Add shared overlay tokens**

Add near `.studio-preview-stage`:

```css
.studio-preview-stage,
.studio-heat-preview-mount,
.simulation-canvas-workbench-frame {
  --studio-preview-overlay-inset: 18px;
  --studio-preview-overlay-gap: 10px;
}
```

- [ ] **Step 2: Add overlay layer and slot CSS**

Add after `.studio-heat-preview-mount`:

```css
.studio-preview-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 34;
  pointer-events: none;
}

.studio-preview-overlay-slot {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--studio-preview-overlay-gap);
  max-width: calc(100% - var(--studio-preview-overlay-inset) * 2);
  pointer-events: none;
}

.studio-preview-overlay-slot > * {
  pointer-events: auto;
}

.studio-preview-overlay-slot-top-left {
  top: var(--studio-preview-overlay-inset);
  left: var(--studio-preview-overlay-inset);
  align-items: flex-start;
}

.studio-preview-overlay-slot-top-right {
  top: var(--studio-preview-overlay-inset);
  right: var(--studio-preview-overlay-inset);
  align-items: flex-end;
}

.studio-preview-overlay-slot-bottom-left {
  bottom: var(--studio-preview-overlay-inset);
  left: var(--studio-preview-overlay-inset);
  align-items: flex-start;
}

.studio-preview-overlay-slot-bottom-right {
  right: var(--studio-preview-overlay-inset);
  bottom: var(--studio-preview-overlay-inset);
  align-items: flex-end;
}

.studio-preview-overlay-center,
.studio-preview-overlay-bottom-center {
  position: absolute;
  left: 50%;
  display: grid;
  width: min(440px, calc(100% - var(--studio-preview-overlay-inset) * 2));
  justify-items: center;
  pointer-events: none;
}

.studio-preview-overlay-center {
  top: 50%;
  transform: translate(-50%, -50%);
}

.studio-preview-overlay-bottom-center {
  bottom: var(--studio-preview-overlay-inset);
  transform: translateX(-50%);
}

.studio-preview-overlay-center > *,
.studio-preview-overlay-bottom-center > * {
  pointer-events: auto;
}
```

- [ ] **Step 3: Convert heat overlay selectors from absolute positioning to slot-contained blocks**

Update these selectors by removing `position`, `top`, `right`, `bottom`, `left`, and old z-index placement:

```css
.studio-heat-interaction-hints {
  display: grid;
  gap: 4px;
  max-width: min(320px, max(180px, calc(100% - 140px)));
  border: 1px solid rgba(100, 116, 139, 0.58);
  border-radius: 4px;
  background: rgba(10, 15, 23, 0.74);
  padding: 10px 11px;
  box-shadow: 0 18px 34px rgba(2, 6, 23, 0.28);
  backdrop-filter: blur(12px);
  font-size: 11px;
}

.studio-heat-hover-tooltip {
  max-width: 260px;
  border: 1px solid rgba(226, 232, 240, 0.34);
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.86);
  padding: 8px 10px;
  box-shadow: 0 18px 30px rgba(2, 6, 23, 0.28);
  color: rgba(226, 232, 240, 0.94);
  font-size: 11px;
}

.studio-heat-preview-control-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}

.studio-heat-view-reset {
  height: 28px;
  border: 1px solid rgba(148, 163, 184, 0.44);
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.78);
  color: rgba(226, 232, 240, 0.9);
}

.studio-heat-hard-sphere-toggle {
  display: inline-grid;
  grid-template-columns: auto auto 38px;
  align-items: center;
  gap: 8px;
}

.studio-heat-hard-sphere-note {
  display: grid;
  gap: 4px;
  width: min(210px, calc(100% - 32px));
  border: 1px solid rgba(56, 189, 248, 0.42);
  border-radius: 4px;
  background: rgba(8, 47, 73, 0.78);
  padding: 9px 10px;
}

.studio-heat-stopcock-mini-readout {
  display: grid;
  gap: 7px;
  width: clamp(210px, 21vw, 276px);
}

.studio-heat-demo-step-panel {
  display: grid;
  gap: 7px;
  width: min(330px, calc(100vw - 36px));
}

.studio-heat-focus-panel {
  width: min(316px, calc(100vw - 36px));
}
```

Keep the existing visual declarations that are not placement-related: borders, colors, shadows, typography, inner grid rows, warning/danger variants, hover states, and animations.

- [ ] **Step 4: Remove obsolete focus offset CSS**

Delete:

```css
.studio-heat-record-controls-focus-raised {
  transform: translateY(calc(-1 * var(--heat-record-focus-offset)));
}
```

If there are related `--heat-record-focus-offset` rules, delete them too.

- [ ] **Step 5: Preserve centered prompt semantics**

Update `.studio-heat-pressure-warning`, `.studio-heat-demo-complete-toast`, and `.studio-heat-manual-step-hint` so their boxes no longer position themselves with `left: 50%`, `top: 50%`, `bottom: 18px`, or `transform`. Their parent slot now positions them. Keep their visual styling.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
node scripts/workbenchHeatCapacityInstrumentUi.test.ts
```

Expected: both PASS after selector conversion and source updates.

---

### Task 6: Align Standard SimulationCanvas Workbench Overlays

**Files:**
- Modify: `<project-root>\components\WorkbenchStudioPrototype.css`
- Optional modify: `<project-root>\components\SimulationCanvas.tsx` only if markup needs clearer slot names.

- [ ] **Step 1: Change workbench canvas tool spacing**

Replace:

```css
.simulation-canvas-workbench-tools {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
}
```

with:

```css
.simulation-canvas-workbench-tools {
  position: absolute;
  top: var(--studio-preview-overlay-inset);
  left: var(--studio-preview-overlay-inset);
  right: var(--studio-preview-overlay-inset);
}
```

- [ ] **Step 2: Change workbench canvas hint spacing**

Replace:

```css
.simulation-canvas-workbench-hint {
  position: absolute;
  left: 8px;
  bottom: 8px;
}
```

with:

```css
.simulation-canvas-workbench-hint {
  position: absolute;
  left: var(--studio-preview-overlay-inset);
  bottom: var(--studio-preview-overlay-inset);
}
```

- [ ] **Step 3: Run focused tests**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
node scripts/workbenchMenuAndCanvasControls.test.ts
```

Expected: PASS.

---

### Task 7: Add Geometry Verification Script For Runtime Layout

**Files:**
- Create: `<project-root>\scripts\workbenchPreviewOverlayGeometry.playwright.ts`

- [ ] **Step 1: Create a Playwright runtime checker**

Add:

```ts
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const previewUrl = 'http://127.0.0.1:5174/';
const expectedInsetPx = 18;
const tolerancePx = 2;

type Rect = {
  name: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  center?: boolean;
};

const overlaps = (a: Rect, b: Rect) => (
  a.left < b.right
  && a.right > b.left
  && a.top < b.bottom
  && a.bottom > b.top
);

const assertNoSiblingOverlap = (rects: Rect[]) => {
  for (let index = 0; index < rects.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < rects.length; otherIndex += 1) {
      const first = rects[index];
      const second = rects[otherIndex];
      if (first.center || second.center) continue;
      assert.equal(overlaps(first, second), false, `${first.name} should not overlap ${second.name}`);
    }
  }
};

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });

  await page.goto(previewUrl);
  await page.waitForSelector('[data-heat-capacity-preview-mount="true"]', { timeout: 10000 });

  const result = await page.evaluate(() => {
    const stage = document.querySelector('[data-heat-capacity-preview-mount="true"]');
    if (!stage) throw new Error('Heat capacity preview mount was not found');
    const stageRect = stage.getBoundingClientRect();
    const selectors = [
      '[data-heat-capacity-hard-sphere-toggle="true"]',
      '[data-heat-capacity-hard-sphere-note="true"]',
      '[data-heat-capacity-interaction-hints="true"]',
      '[data-heat-capacity-view-reset="true"]',
      '[data-heat-capacity-preview-control-stack="true"]',
      '[data-heat-capacity-demo-step-panel="true"]',
      '[data-heat-capacity-focus-panel]',
      '[data-heat-capacity-hover-tooltip="true"]',
      '[data-heat-capacity-pressure-warning="true"]',
      '[data-heat-capacity-demo-complete-toast="true"]',
      '[data-heat-capacity-manual-step-hint="true"]',
    ];

    const rects = selectors.flatMap((selector) => (
      Array.from(document.querySelectorAll<HTMLElement>(selector)).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: selector,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          center: selector.includes('pressure-warning')
            || selector.includes('demo-complete-toast')
            || selector.includes('manual-step-hint'),
        };
      })
    ));

    return {
      stage: {
        left: stageRect.left,
        top: stageRect.top,
        right: stageRect.right,
        bottom: stageRect.bottom,
        width: stageRect.width,
        height: stageRect.height,
      },
      rects,
    };
  });

  assertNoSiblingOverlap(result.rects);

  const cornerItems = result.rects.filter((rect) => !rect.center);
  assert.ok(cornerItems.length >= 4, 'default heat preview should render several corner overlays');

  for (const rect of cornerItems) {
    const distances = [
      Math.abs(rect.left - result.stage.left),
      Math.abs(rect.top - result.stage.top),
      Math.abs(result.stage.right - rect.right),
      Math.abs(result.stage.bottom - rect.bottom),
    ];
    assert.ok(
      distances.some((distance) => Math.abs(distance - expectedInsetPx) <= tolerancePx),
      `${rect.name} should be aligned to at least one 18px safe edge`,
    );
  }

  await browser.close();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run it while preview server is active**

Start preview if needed:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

In another terminal:

```powershell
npx playwright install chromium
node scripts/workbenchPreviewOverlayGeometry.playwright.ts
```

Expected: PASS at `1440 x 810`.

If `npx playwright install chromium` is unnecessary because Chromium is already installed, skip it and run the script directly.

---

### Task 8: Run Existing Regression Tests

**Files:**
- No source changes.

- [ ] **Step 1: Run dependency sanity check**

Run:

```powershell
npm.cmd ls --depth=0
```

Expected: command exits successfully.

- [ ] **Step 2: Run existing static tests that touch this area**

Run:

```powershell
node scripts/workbenchPreviewOverlayLayout.test.ts
node scripts/workbenchHeatCapacityInstrument.test.ts
node scripts/workbenchHeatCapacityInstrumentUi.test.ts
node scripts/workbenchMatteVisualStyle.test.ts
node scripts/workbenchLayoutExport.test.ts
node scripts/workbenchMenuAndCanvasControls.test.ts
node scripts/workbenchAspectFrame.test.ts
```

Expected: all PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: build exits successfully. Existing Vite chunk-size warning is acceptable unless new errors appear.

---

### Task 9: Manual Visual Acceptance

**Files:**
- No source changes.

- [ ] **Step 1: Start fixed preview**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open:

```txt
http://127.0.0.1:5174/
```

- [ ] **Step 2: Check standard viewport**

At `1440 x 810`, verify:
- Heat preview fills the expected 16:9 workbench area.
- Hard-sphere toggle is in the top-left corner with 18px inset.
- Reset view is in the top-right corner with 18px inset.
- Interaction hint is in the bottom-left corner with 18px inset.
- Manual reset / record controls are in the bottom-right corner with 18px inset.
- No corner overlay overlaps another corner overlay.

- [ ] **Step 3: Check big-module priority**

Trigger these states and verify:
- Demo step panel appears at top-right and reset view moves smoothly below it.
- Stopcock focus readout appears at top-left and hard-sphere toggle/note move smoothly below it.
- Pump/stopcock/instrument focus panel appears at bottom-right and record/next-trial controls move smoothly above it.
- Closing each big module returns the small module to its original corner position smoothly.

- [ ] **Step 4: Check centered prompts**

Trigger warning/toast states and verify:
- Pressure warning stays centered and does not cover any corner control.
- Demo complete toast stays centered and does not cover any corner control.
- Manual/locked interaction hint stays bottom-center and does not cover bottom-left or bottom-right stacks.

- [ ] **Step 5: Check non-16:9 windows**

Use these viewport sizes:
- `1600 x 900`
- `1920 x 1080`
- `1440 x 900`
- `1200 x 900`

Verify:
- The 16:9 workbench frame remains centered.
- Overlay positions are stable relative to the 1440 x 810 logical canvas.
- Non-16:9 letterbox/pillarbox areas do not affect overlay positions.

- [ ] **Step 6: Check narrow fallback**

Use a narrow viewport such as `800 x 700`.

Verify:
- The app uses the existing responsive layout rather than forcing an unreadable scaled 1440 x 810 desktop canvas.
- Controls remain clickable.

---

## Commit Plan

Commit only after all tests pass.

Suggested commits:

```powershell
git add components/usePreviewOverlayMotion.ts scripts/workbenchPreviewOverlayLayout.test.ts
git add components/heatCapacity/HeatCapacityInstrumentScene.tsx components/WorkbenchStudioPrototype.tsx components/WorkbenchStudioPrototype.css components/SimulationCanvas.tsx
git commit -m "fix: unify 3d preview overlay layout"
```

Do not include unrelated files. Do not revert the existing 16:9 workbench frame changes.

## Acceptance Criteria

- All non-center 3D preview overlays use one `18px` inset and the same corner-slot contract.
- Heat-capacity overlays from parent and scene render in one layer, so they cannot unknowingly occupy the same corner independently.
- Focus panels, demo panels, and stopcock readouts keep their corner priority.
- Small modules displaced by big modules move smoothly and return smoothly.
- Existing heat-capacity experiment buttons, locked interactions, focus exits, demo steps, and hard-sphere controls keep their behavior.
- Standard workbench `SimulationCanvas` uses the same inset value as heat-capacity preview.
- Static tests, existing workbench tests, build, and manual preview checks pass.

## Self-Review

- Spec coverage:
  - No overlap: Tasks 3-7 create a shared slot layer and geometry verification.
  - Corner alignment and uniform spacing: Tasks 5-6 introduce shared inset/gap tokens and convert selectors.
  - Small-yields-big strategy: Tasks 2-5 use slot order plus FLIP motion.
- Placeholder scan:
  - The only “move current content unchanged” notes are scoped refactor instructions for existing JSX blocks; the engineer must preserve the existing contents rather than invent new behavior.
- Type consistency:
  - Overlay prop names are consistent across test, scene, and workbench: `overlayTopLeft`, `overlayTopRight`, `overlayBottomRight`, `overlayCenter`, `overlayBottomCenter`.
