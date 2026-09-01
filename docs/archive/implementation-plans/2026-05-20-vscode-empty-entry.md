# VS Code Style Empty Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-file state experiment entry buttons with VS Code style command rows while preserving behavior.

**Architecture:** Keep the existing `WorkbenchStudioPrototype` render structure and introduce presentation-only class names for empty-state command rows. The change is CSS-first, with minimal JSX class updates and static tests guarding scope.

**Tech Stack:** React, TypeScript, CSS, existing Node static tests, Vite preview on fixed port `5174`.

---

## File Structure

- Modify `src/features/workbench/WorkbenchStudioPrototype.tsx`
  - Keep `renderEmptyStudyActions` and `renderCachedExperimentOpenActions`.
  - Add command-row class names to no-file creation and cached open entries only.
  - Do not touch top command menus.

- Modify `src/features/workbench/WorkbenchStudioPrototype.css`
  - Replace no-file empty action button treatment with VS Code style command rows.
  - Add theme-specific light and dark hover/focus styles.
  - Keep disabled cached-open hint muted.

- Modify `tests/workbench/workbenchChromePolish.test.ts`
  - Add assertions that empty-state controls use command-row classes.
  - Add assertions that the command-row CSS does not use hard blue outlined button styling.

---

### Task 1: Add Failing Static Coverage

**Files:**
- Modify: `tests/workbench/workbenchChromePolish.test.ts`

- [ ] **Step 1: Add JSX class assertions**

Append these assertions near the existing empty-state assertions:

```ts
assert.match(
  source,
  /const renderEmptyStudyActions = \(className = 'studio-empty-actions'\) => \(\s*<div className=\{className\}>\s*<button type="button" className="studio-empty-command-row"/,
  'empty study creation entries should render as VS Code style command rows',
);

assert.match(
  source,
  /<div className="studio-empty-open-list">\s*\{openableClosedFiles\.length === 0 \? \(\s*<button type="button" className="studio-empty-command-row studio-empty-command-row-disabled" disabled>/,
  'empty cached-open disabled hint should use the command-row disabled treatment',
);

assert.match(
  source,
  /openableClosedFiles\.slice\(0, 5\)\.map\(\(file\) => \(\s*<button type="button" className="studio-empty-command-row studio-empty-open-row"/,
  'cached-open entries should render as command rows, not boxed buttons',
);
```

- [ ] **Step 2: Add CSS assertions**

Append these assertions near the existing empty workspace CSS checks:

```ts
assert.match(
  getRuleBody('.studio-empty-command-row'),
  /border:\s*0;[\s\S]*background:\s*transparent;[\s\S]*justify-content:\s*flex-start;/,
  'empty-state command rows should be transparent text commands by default',
);

assert.match(
  getRuleBody('.studio-empty-command-row:hover'),
  /background:\s*rgba\(79,\s*127,\s*184,\s*0\.\d+\);/,
  'empty-state command rows should reveal only a subtle hover surface',
);

assert.doesNotMatch(
  getRuleBody('.studio-empty-command-row'),
  /border:\s*1px solid rgba\(79,\s*127,\s*184/,
  'empty-state command rows should not use the old blue outline button border',
);

assert.match(
  getRuleBody('.studio-theme-light .studio-empty-command-row:hover'),
  /background:\s*#e8f0fb;/,
  'light theme command rows should use a VS Code-like pale hover row',
);
```

- [ ] **Step 3: Run the targeted test and verify it fails**

Run:

```powershell
node tests\workbench\workbenchChromePolish.test.ts
```

Expected: failure mentioning missing `studio-empty-command-row` class or missing CSS rule.

---

### Task 2: Update Empty-State JSX Classes

**Files:**
- Modify: `src/features/workbench/WorkbenchStudioPrototype.tsx`

- [ ] **Step 1: Update cached-open disabled row**

Change the disabled cached-open button in `renderCachedExperimentOpenActions` to:

```tsx
<button type="button" className="studio-empty-command-row studio-empty-command-row-disabled" disabled>
  <Archive size={14} />
  <span>{workbenchCopy.menus.noCachedExperiments}</span>
</button>
```

- [ ] **Step 2: Update cached-open experiment rows**

Change cached experiment buttons in `renderCachedExperimentOpenActions` to:

```tsx
<button
  type="button"
  className="studio-empty-command-row studio-empty-open-row"
  key={file.id}
  onClick={() => openClosedWorkbenchFile(file.id)}
>
  {file.kind === 'standard' ? <Activity size={14} /> : file.kind === 'ideal' ? <FlaskConical size={14} /> : <Gauge size={14} />}
  <span>{file.name}</span>
  <strong>{getWorkbenchFileKindLabel(file.kind, workbenchCopy.files)}</strong>
</button>
```

- [ ] **Step 3: Update creation rows**

Change each button in `renderEmptyStudyActions` to include `className="studio-empty-command-row"`.

The three buttons should retain their existing `onClick` handlers and icon/text content:

```tsx
<button type="button" className="studio-empty-command-row" onClick={() => createFile('ideal')}>
  <FlaskConical size={14} />
  {workbenchCopy.files.createIdeal}
</button>
<button type="button" className="studio-empty-command-row" onClick={() => createFile('heatCapacity')}>
  <Gauge size={14} />
  {workbenchCopy.files.createHeatCapacity}
</button>
<button type="button" className="studio-empty-command-row" onClick={() => createFile('standard')}>
  <Activity size={14} />
  {workbenchCopy.files.createStandard}
</button>
```

- [ ] **Step 4: Run the targeted test**

Run:

```powershell
node tests\workbench\workbenchChromePolish.test.ts
```

Expected: still fails until CSS rules are added.

---

### Task 3: Replace Empty-State Button Styling With Command Rows

**Files:**
- Modify: `src/features/workbench/WorkbenchStudioPrototype.css`

- [ ] **Step 1: Add base command-row CSS**

Add this block near the existing empty-state action styles:

```css
.studio-empty-command-row {
  display: inline-flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--studio-accent-strong);
  padding: 0 6px;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.studio-empty-command-row:hover,
.studio-empty-command-row:focus-visible {
  background: rgba(79, 127, 184, 0.12);
  color: var(--studio-text);
  outline: none;
}

.studio-empty-command-row svg {
  flex: 0 0 auto;
  color: var(--studio-accent);
}

.studio-empty-command-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Add cached-row label CSS**

Add:

```css
.studio-empty-open-row strong {
  margin-left: auto;
  color: var(--studio-subtle);
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 10px;
  font-weight: 700;
}

.studio-empty-command-row-disabled,
.studio-empty-command-row-disabled:hover,
.studio-empty-command-row-disabled:focus-visible {
  background: transparent;
  color: var(--studio-subtle);
  cursor: default;
  opacity: 0.72;
}
```

- [ ] **Step 3: Remove the old boxed button treatment for these rows**

Edit the shared selectors so `.studio-empty-file-actions button`, `.studio-empty-file-open-actions button`, `.studio-empty-actions button`, and `.studio-empty-open-actions button` no longer define the old border/background/button box treatment.

Keep layout containers:

```css
.studio-empty-file-actions,
.studio-empty-file-open-actions,
.studio-empty-actions,
.studio-empty-open-actions,
.studio-empty-param-actions {
  display: grid;
  gap: 7px;
}
```

Leave `.studio-empty-param-actions button` on the old boxed style if parameter empty controls still use it outside this scope.

- [ ] **Step 4: Add light theme command-row CSS**

Add:

```css
.studio-theme-light .studio-empty-command-row {
  color: #006ab1;
}

.studio-theme-light .studio-empty-command-row svg {
  color: #2563eb;
}

.studio-theme-light .studio-empty-command-row:hover,
.studio-theme-light .studio-empty-command-row:focus-visible {
  background: #e8f0fb;
  color: #004f8c;
}

.studio-theme-light .studio-empty-command-row-disabled,
.studio-theme-light .studio-empty-command-row-disabled:hover,
.studio-theme-light .studio-empty-command-row-disabled:focus-visible {
  background: transparent;
  color: #64748b;
}
```

- [ ] **Step 5: Run the targeted test**

Run:

```powershell
node tests\workbench\workbenchChromePolish.test.ts
```

Expected: pass.

---

### Task 4: Verify Scope And Regression

**Files:**
- Test only.

- [ ] **Step 1: Run focused workbench tests**

Run:

```powershell
node tests\workbench\workbenchChromePolish.test.ts
node tests\workbench\workbenchEmptyFiles.test.ts
node tests\workbench\workbenchEmptySession.test.ts
node tests\workbench\workbenchLightTheme.test.ts
node tests\workbench\workbenchExperimentFiles.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run full tests**

Run:

```powershell
npm.cmd test
```

Expected: all test files pass.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: build exits with code 0. Existing large chunk warning is acceptable.

---

### Task 5: Browser Preview Validation

**Files:**
- No code changes unless validation finds an issue.

- [ ] **Step 1: Start fixed preview**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Expected: preview available at `http://127.0.0.1:5174/`.

- [ ] **Step 2: Validate dark no-file state**

Open `http://127.0.0.1:5174/`, force or select dark theme, clear/open no-file state if needed, and verify:
- Creation entries look like VS Code command links.
- No hard blue outline around each entry.
- Hover reveals a subtle row background.
- Cached open rows show muted right-side kind labels.

- [ ] **Step 3: Validate light no-file state**

Switch to light theme and verify:
- Command rows use link-blue text.
- Hover uses pale VS Code-like row background.
- No blue button outlines appear.

- [ ] **Step 4: Validate top menu remains unchanged**

Open the top `实验文件` menu and verify its new/open submenu still uses the existing command menu style, not the new empty-state command rows.

- [ ] **Step 5: Check console**

Expected: no browser console errors. Existing Three.js deprecation warnings are acceptable if still present.

---

### Task 6: Cleanup And Commit

**Files:**
- Commit only the implementation and test files.

- [ ] **Step 1: Remove generated preview artifacts**

Remove only task-local generated artifacts if present:

```powershell
Remove-Item -LiteralPath .playwright-mcp -Recurse -Force
Remove-Item -LiteralPath dist -Recurse -Force
```

Only run each command if that path exists in the repository root.

- [ ] **Step 2: Inspect Git status**

Run:

```powershell
git status --short
```

Expected changed files:
- `src/features/workbench/WorkbenchStudioPrototype.tsx`
- `src/features/workbench/WorkbenchStudioPrototype.css`
- `tests/workbench/workbenchChromePolish.test.ts`
- this plan/spec document if the planning docs are being committed with the work

- [ ] **Step 3: Commit**

Run:

```powershell
git add src/features/workbench/WorkbenchStudioPrototype.tsx src/features/workbench/WorkbenchStudioPrototype.css tests/workbench/workbenchChromePolish.test.ts docs/archive/historical-specs/2026-05-20-vscode-empty-entry-design.md docs/archive/implementation-plans/2026-05-20-vscode-empty-entry.md
git commit -m "polish empty experiment entry commands"
```

Expected: commit succeeds.
