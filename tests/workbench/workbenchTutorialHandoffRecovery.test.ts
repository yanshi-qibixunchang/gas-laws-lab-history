import assert from 'node:assert/strict';
import { scheduleWorkbenchTutorialHandoffRecovery, type WorkbenchTutorialHandoffRecoveryPorts } from '../../src/features/workbench/workbenchTutorialHandoffRecovery.ts';
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const harness = () => {
  const events: string[] = [], timers = new Map<number, () => void>();
  let nextId = 0, save = true, clear = true;
  let error: { message: string; retry: (() => void) | null } | null = null;
  const ports: WorkbenchTutorialHandoffRecoveryPorts = {
    initialTutorialHandoffRecovery: true, settingsLanguagePreference: 'zh-CN',
    flushWorkspacePersistenceRef: { current: async () => { events.push('save'); return save; } },
    setTutorialOperationError: next => { error = typeof next === 'function' ? next(error) : next; events.push(error ? 'error' : 'error:clear'); },
    setTutorialNoticeKind: value => events.push('notice:' + value),
    window: { setTimeout: (fn: () => void, ms: number) => { assert.equal(ms, 0); timers.set(++nextId, fn); return nextId; }, clearTimeout: (id: number) => { timers.delete(id); events.push('timer:clear'); }, hardSphereLabTutorial: { deactivate: () => { events.push('deactivate'); } } } as unknown as Window,
  };
  return { ports, events, timers, failSave: () => { save = false; }, restoreSave: () => { save = true; }, failClear: () => { clear = false; }, getError: () => error,
    start: () => scheduleWorkbenchTutorialHandoffRecovery(ports, () => { events.push('marker:clear'); return clear ? { ok: true } : { ok: false, error: new Error('clear blocked') }; }),
    fire: () => { const [id, fn] = [...timers][0]; timers.delete(id); fn(); },
  };
};
{
 const h = harness(); h.ports.initialTutorialHandoffRecovery = false; assert.equal(h.start(), undefined); assert.equal(h.timers.size, 0);
}
{
 const h = harness(); h.start(); assert.deepEqual(h.events, [], 'recovery retains its deferred first save'); h.fire(); await tick();
 assert.deepEqual(h.events, ['save', 'marker:clear', 'error:clear', 'deactivate', 'notice:all-unlocked']);
}
{
 const h = harness(); const cleanup = h.start()!; cleanup(); assert.equal(h.timers.size, 0); assert.deepEqual(h.events, ['timer:clear']);
}
{
 const h = harness(); let finish!: (saved: boolean) => void; h.ports.flushWorkspacePersistenceRef.current = () => new Promise<boolean>(resolve => { finish = resolve; });
 const cleanup = h.start()!; h.fire(); cleanup(); finish(true); await tick(); assert.deepEqual(h.events, ['timer:clear'], 'a late save completion cannot clear ownership or publish a recovered notice after cleanup');
}
{
 const h = harness(); h.failSave(); h.start(); h.fire(); await tick(); assert.deepEqual(h.events, ['save', 'error']); assert.ok(h.getError()?.retry);
 h.restoreSave(); h.getError()!.retry!(); await tick(); assert.deepEqual(h.events.slice(-5), ['save', 'marker:clear', 'error:clear', 'deactivate', 'notice:all-unlocked']);
}
{
 const h = harness(); h.failClear(); h.start(); h.fire(); await tick(); assert.deepEqual(h.events, ['save', 'marker:clear', 'error']); assert.ok(h.getError()?.retry);
}
console.log('workbenchTutorialHandoffRecovery tests passed');
