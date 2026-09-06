import assert from 'node:assert/strict';
import { attachWorkbenchLifecyclePersistence, type WorkbenchLifecyclePersistencePorts } from '../../src/features/workbench/useWorkbenchLifecyclePersistence.ts';
import { attachWorkbenchDesktopExitInputBlock } from '../../src/features/workbench/useWorkbenchDesktopExitInputBlock.ts';
const windowEvents = new EventTarget(); const documentEvents = new EventTarget(); const events: string[] = [];
let now = 100; let visible = 'hidden'; let prepare: ((request: { requestId: string }) => void) | null = null; let resume: (() => void) | null = null;
const bridge = { onPrepareExit: (callback: typeof prepare) => { prepare = callback; return () => { prepare = null; }; }, onResumeAfterExitCancel: (callback: typeof resume) => { resume = callback; return () => { resume = null; }; }, reportPersistenceResult: async (report: { requestId: string; saved: boolean; message: string }) => { events.push(`report:${report.requestId}:${report.saved}:${report.message}`); } };
const windowPort = Object.assign(windowEvents, { hardSphereLabWindow: bridge }) as unknown as WorkbenchLifecyclePersistencePorts['window'];
const documentPort = Object.assign(documentEvents, { get visibilityState() { return visible; } });
Object.defineProperty(documentPort, 'visibilityState', { get: () => visible });
const last = { current: null as number | null };
const ports: WorkbenchLifecyclePersistencePorts = { window: windowPort, document: documentPort as WorkbenchLifecyclePersistencePorts['document'], performance: { now: () => now }, heatCapacityLifecycleLastCompletedFlushAtMsRef: last,
  persistWorkspaceLifecycleCheckpointRef: { current: async fresh => { events.push(fresh ? 'save:fresh' : 'save'); return true; } },
  prepareDesktopExitQuiescenceRef: { current: () => { events.push('pause'); } }, resumeDesktopExitQuiescenceRef: { current: () => { events.push('resume'); } },
};
const flushMicrotasks = async () => { await new Promise<void>(resolve => setImmediate(resolve)); };
const detach = attachWorkbenchLifecyclePersistence(ports);
windowEvents.dispatchEvent(new Event('pagehide')); await flushMicrotasks(); assert.deepEqual(events, ['save']); assert.equal(last.current, 100);
now = 200; documentEvents.dispatchEvent(new Event('visibilitychange')); await flushMicrotasks(); assert.deepEqual(events, ['save']);
visible = 'visible'; documentEvents.dispatchEvent(new Event('visibilitychange')); assert.equal(last.current, null);
windowEvents.dispatchEvent(new Event('pagehide')); await flushMicrotasks(); assert.deepEqual(events, ['save', 'save']);
const invokePrepare = prepare as unknown as (request: { requestId: string }) => void; invokePrepare({ requestId: 'exit-1' }); await flushMicrotasks();
assert.deepEqual(events.slice(-3), ['pause', 'save:fresh', 'report:exit-1:true:']);
(resume as unknown as () => void)(); assert.equal(events.at(-1), 'resume');
ports.persistWorkspaceLifecycleCheckpointRef.current = async () => { throw Error('failed disk'); };
invokePrepare({ requestId: 'exit-2' }); await flushMicrotasks(); assert.equal(events.at(-1), 'report:exit-2:false:failed disk');
detach(); const count = events.length; windowEvents.dispatchEvent(new Event('pagehide')); await flushMicrotasks(); assert.equal(events.length, count); assert.equal(prepare, null); assert.equal(resume, null);

const inputEvents = new EventTarget(); const blocked = { current: false }; let downstream = 0;
const inputPort = {
  addEventListener: (type: string, listener: EventListener, capture: boolean) => inputEvents.addEventListener(type, listener, { capture }),
  removeEventListener: (type: string, listener: EventListener, capture: boolean) => inputEvents.removeEventListener(type, listener, { capture }),
} as Pick<Window, 'addEventListener' | 'removeEventListener'>;
const detachInput = attachWorkbenchDesktopExitInputBlock(inputPort, blocked);
inputEvents.addEventListener('click', () => { downstream += 1; });
const normal = new Event('click', { cancelable: true }); inputEvents.dispatchEvent(normal); assert.equal(normal.defaultPrevented, false); assert.equal(downstream, 1);
blocked.current = true; const blockedClick = new Event('click', { cancelable: true }); inputEvents.dispatchEvent(blockedClick); assert.equal(blockedClick.defaultPrevented, true); assert.equal(downstream, 1);
detachInput(); inputEvents.dispatchEvent(new Event('click')); assert.equal(downstream, 2);
console.log('Workbench lifecycle subscriptions and desktop input block tests passed.');
