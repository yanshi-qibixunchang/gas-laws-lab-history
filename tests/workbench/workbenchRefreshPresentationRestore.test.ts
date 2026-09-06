import assert from 'node:assert/strict';
import { scheduleWorkbenchRefreshPresentationRestore, type WorkbenchRefreshPresentationRestorePorts } from '../../src/features/workbench/workbenchRefreshPresentationRestore.ts';
const harness = () => {
 const frames = new Map<number, FrameRequestCallback>(), events: string[] = [];
 const ports: WorkbenchRefreshPresentationRestorePorts = {
  initialHeatCapacityRefreshSession: {} as WorkbenchRefreshPresentationRestorePorts['initialHeatCapacityRefreshSession'],
  initialHeatCapacityRefreshLayout: { consoleScrollTop: 22, currentParametersScrollTop: 44, renameSelectionStart: 2, renameSelectionEnd: 5 },
  consoleBodyRef: { current: { scrollTop: 0 } as HTMLDivElement }, currentParametersBodyRef: { current: { scrollTop: 0 } as HTMLDivElement },
  renameInputRef: { current: { value: 'file name', focus: () => events.push('focus'), setSelectionRange: (a: number, b: number) => events.push('selection:' + a + ':' + b) } as unknown as HTMLInputElement }, renamingFileId: 'file-a',
  window: { requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(1, fn); return 1; }, cancelAnimationFrame: (id: number) => frames.delete(id) } as unknown as Window,
 };
 return { ports, frames, events, fire: () => { const fn = frames.get(1)!; frames.delete(1); fn(0); } };
};
{
 const h = harness(); const cleanup = scheduleWorkbenchRefreshPresentationRestore(h.ports)!;
 assert.equal(h.ports.consoleBodyRef.current!.scrollTop, 0); assert.deepEqual(h.events, []);
 h.fire(); assert.equal(h.ports.consoleBodyRef.current!.scrollTop, 22); assert.equal(h.ports.currentParametersBodyRef.current!.scrollTop, 44); assert.deepEqual(h.events, ['focus', 'selection:2:5']); cleanup();
}
{
 const h = harness(); const cleanup = scheduleWorkbenchRefreshPresentationRestore(h.ports)!; cleanup(); assert.equal(h.frames.size, 0); assert.deepEqual(h.events, []);
}
{
 const h = harness(); h.ports.initialHeatCapacityRefreshSession = null; assert.equal(scheduleWorkbenchRefreshPresentationRestore(h.ports), undefined); assert.equal(h.frames.size, 0);
}
{
 const h = harness(); h.ports.initialHeatCapacityRefreshLayout = {}; scheduleWorkbenchRefreshPresentationRestore(h.ports); h.ports.consoleBodyRef.current = null; h.ports.currentParametersBodyRef.current = null; h.fire(); assert.deepEqual(h.events, ['focus', 'selection:9:9']);
}
{
 const h = harness(); h.ports.renamingFileId = null; scheduleWorkbenchRefreshPresentationRestore(h.ports); h.fire(); assert.deepEqual(h.events, []);
}
console.log('workbenchRefreshPresentationRestore tests passed');
