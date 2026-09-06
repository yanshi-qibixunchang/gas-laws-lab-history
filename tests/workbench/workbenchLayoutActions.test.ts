import assert from 'node:assert/strict';
import type React from 'react';
import { createWorkbenchLayoutActions, type WorkbenchLayoutActionPorts } from '../../src/features/workbench/workbenchLayoutActions.ts';
import { createWorkbenchParameterScrollActions } from '../../src/features/workbench/useWorkbenchParameterScroll.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultWorkbenchLayoutDefaults } from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import { createFilePresentationSnapshot, type WorkbenchEditSnapshot } from '../../src/features/workbench/workbenchEditSnapshot.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
const listeners = new Map<string, Set<(event: unknown) => void>>(); const frames = new Map<number, FrameRequestCallback>(); let frame = 0; let now = 0;
const clock = { innerHeight: 1000, performance: { now: () => now }, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frame, callback); return frame; }, cancelAnimationFrame: (id: number) => { frames.delete(id); },
 addEventListener: (name: string, callback: (event: unknown) => void) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback); },
 removeEventListener: (name: string, callback: (event: unknown) => void) => { listeners.get(name)?.delete(callback); } };
const fire = (name: string, event = {}) => { for (const callback of listeners.get(name) ?? []) callback(event); };
const advance = (time: number) => { now = time; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(time)); };
const element = (width = 1000, height = 600, top = 0) => {
 const classes = new Set<string>(); const styles = new Map<string, string>();
 return { scrollTop: 0, scrollHeight: 1500, clientHeight: height, style: { setProperty: (key: string, value: string) => styles.set(key, value) },
 classList: { add: (key: string) => classes.add(key), remove: (key: string) => classes.delete(key) },
 getBoundingClientRect: () => ({ width, height, top, bottom: top + height, left: 0 }), classes, styles };
};
const dom = element(); const domRef = () => ({ current: element() as unknown as HTMLElement });
let file: WorkbenchFileState = createDefaultStandardFile(1); const params = file.params; let leftWidth = 260; let resizing = false; let commits = 0;
const history: WorkbenchEditSnapshot[] = []; const snapshots: WorkbenchEditSnapshot[] = [];
const ghost = domRef();
const ports: WorkbenchLayoutActionPorts = {
 getView: () => ({ activeFile: file, workbenchLayoutDefaults: createDefaultWorkbenchLayoutDefaults(), openTopMenu: null, leftSidebarWidth: leftWidth, parameterSidebarWidth: 320, isWorkbenchEmpty: false, liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio, consoleCollapsed: false, consoleHeightPx: 240 }),
 window: clock as unknown as WorkbenchLayoutActionPorts['window'], document: { body: dom as unknown as HTMLElement },
 workspaceShellRef: domRef(), workbenchBodyRef: domRef(), sidebarResizeGhostRef: ghost, parameterSidebarResizeGhostRef: domRef(),
 idealResultWindowRegionRef: domRef(), centerWorkspaceRef: domRef(), fileTabsRef: { current: element(1000, 30) as unknown as HTMLElement }, liveWorkspaceRef: domRef(), liveWorkspaceResizeGhostRef: domRef(), shellRef: domRef(), consoleResizeGhostRef: domRef(), resizeGhostFrameRef: { current: null }, consoleResizeRef: { current: null },
 createEditSnapshot: label => { const snapshot = { kind: 'presentation', label, fileId: file.id, presentation: createFilePresentationSnapshot(file), selectedPanel: 'preview' } as WorkbenchEditSnapshot; snapshots.push(snapshot); return snapshot; },
 pushUndoSnapshot: snapshot => { history.push(snapshot); }, captureUndoSnapshot: label => { history.push({ kind: 'presentation', label, fileId: file.id, presentation: createFilePresentationSnapshot(file), selectedPanel: 'preview' } as WorkbenchEditSnapshot); },
 updateActiveFile: update => { commits += 1; file = update(file); }, setWorkbenchFiles: update => { file = update([file])[0]!; },
 setLeftSidebarWidth: next => { leftWidth = typeof next === 'function' ? next(leftWidth) : next; }, setParameterSidebarWidth: () => {},
 setLiveWorkspaceResizing: next => { resizing = typeof next === 'function' ? next(resizing) : next; }, setConsoleHeightPx: () => {}, setWorkbenchLayoutDefaults: () => {}, setOpenTopMenu: () => {}, pushLog: () => {},
};
const actions = createWorkbenchLayoutActions(ports);
const mouse = { clientX: 100, clientY: 400, preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
actions.startStandardResultsResize(mouse); assert.equal(history.length, 0); fire('mousemove', { clientY: 200 }); assert.equal(commits, 1); assert.equal(history.length, 0);
fire('mouseup'); assert.strictEqual(history[0], snapshots[0]); assert.strictEqual(file.params, params); assert.equal(listeners.get('mousemove')!.size, 0);
assert.equal(file.kind, 'standard'); if (file.kind !== 'standard') throw Error('expected standard'); assert.ok(file.standardResultsLayout.heightRatio <= actions.getStandardResultsMaxHeightRatio());
actions.startStandardResultsResize(mouse); fire('mouseup'); assert.equal(history.length, 1, 'no movement creates no undo entry');
actions.startSidebarResize('left', mouse); fire('mousemove', { clientX: 1000 }); assert.equal(leftWidth, 260); advance(1); assert.equal(ghost.current!.style.getPropertyValue?.('--studio-left-resize-ghost-x') ?? (ghost.current as unknown as ReturnType<typeof element>).styles.get('--studio-left-resize-ghost-x'), '420px'); fire('mouseup'); assert.equal(leftWidth, 420);
const pointer = { ...mouse, currentTarget: { parentElement: ports.liveWorkspaceRef.current, getBoundingClientRect: () => ({ width: 8 }) } } as unknown as React.PointerEvent<HTMLButtonElement>;
const beforeDrag = commits; const beforeRatio = file.liveWorkspaceSplitRatio;
actions.startLiveWorkspaceResize(pointer); assert.equal(resizing, true); fire('pointermove', { clientX: 750 }); advance(2); assert.equal(commits, beforeDrag); fire('pointercancel'); assert.equal(resizing, false); assert.equal(file.liveWorkspaceSplitRatio, beforeRatio); assert.equal(listeners.get('pointermove')!.size, 0);
actions.startLiveWorkspaceResize(pointer); fire('pointermove', { clientX: 750 }); fire('pointerup'); assert.equal(commits, beforeDrag + 1); assert.ok(file.liveWorkspaceSplitRatio > beforeRatio); assert.strictEqual(file.params, params);
const scroller = element(); scroller.scrollTop = 100; const scrollRef = { current: scroller as unknown as HTMLElement }; const frameRef = { current: null as number | null }; const previousRef = { current: 0 }; let open = false; let visible = false;
const scroll = createWorkbenchParameterScrollActions({ window: clock as unknown as Parameters<typeof createWorkbenchParameterScrollActions>[0]['window'], currentParametersBodyRef: scrollRef, idealAdvancedScrollFrameRef: frameRef, idealAdvancedSettingsPreviousScrollTopRef: previousRef,
 setIdealAdvancedSettingsOpen: next => { open = typeof next === 'function' ? next(open) : next; }, setIdealAdvancedSettingsBodyVisible: next => { visible = typeof next === 'function' ? next(visible) : next; } });
scroll.toggleIdealAdvancedSettings(); assert.equal(open, true); assert.equal(visible, true); assert.equal(previousRef.current, 100);
now = 0; let complete = 0; scroll.animateCurrentParametersScroll(500, () => { complete += 1; }); advance(210); assert.equal(scroller.scrollTop, 300); assert.equal(complete, 0); advance(420); assert.equal(scroller.scrollTop, 500); assert.equal(complete, 1); assert.equal(frameRef.current, null);
scroll.toggleIdealAdvancedSettings(); assert.equal(open, false); assert.equal(visible, true, 'collapse keeps body mounted until animation completes');
scroll.animateCurrentParametersScroll(previousRef.current, () => { visible = false; }); advance(630); assert.equal(scroller.scrollTop, 300); assert.equal(visible, true); advance(840); assert.equal(scroller.scrollTop, 100); assert.equal(visible, false);
scroll.animateCurrentParametersScroll(300); const cancelled = frameRef.current; scroll.animateCurrentParametersScroll(200); assert.ok(!frames.has(cancelled!)); advance(1260); assert.equal(scroller.scrollTop, 200);
console.log('Workbench layout drag and parameter scroll clock tests passed.');
