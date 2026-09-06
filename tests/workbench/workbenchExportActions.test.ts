import assert from 'node:assert/strict';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createWorkbenchExportActions, type WorkbenchExportActionPorts } from '../../src/features/workbench/workbenchExportActions.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
import { createWorkbenchExportPayload } from '../../src/features/workbench/workbenchResults.ts';
const file = createDefaultStandardFile(1);
const harness = () => {
  const events: string[] = [];
  const payloads: unknown[] = [];
  let result: DesktopExportResult = { status: 'ok', files: ['report.csv'] };
  let failure: Error | null = null;
  const ports: WorkbenchExportActionPorts = {
    activeFile: file, idealPointCount: 0, resultSummary: { ready: true }, settingsLanguagePreference: 'zh-CN', workbenchCopy: workbenchCopies['zh-CN'],
    exportEnvironmentStatus: 'available-bundled', guardWorkbenchTutorialAction: () => true,
    pushLog: (message, kind) => events.push('log:' + kind + ':' + (typeof message === 'function' ? message('zh-CN') : message)),
    setExportInProgress: value => events.push('busy:' + value),
    window: { hardSphereLabExporter: { exportWorkbenchPayload: async (payload: unknown) => { events.push('bridge'); payloads.push(payload); if (failure) throw failure; return result; } } } as unknown as Window,
  };
  return { ports, events, payloads, run: () => createWorkbenchExportActions(ports), setResult: (next: DesktopExportResult) => { result = next; }, fail: () => { failure = new Error('disk unavailable'); } };
};
{
 const h = harness(); h.ports.guardWorkbenchTutorialAction = () => false;
 await h.run().handleExportAction('pointsCsv'); assert.deepEqual(h.events, []); assert.deepEqual(h.payloads, []);
}
{
 const h = harness(); h.ports.resultSummary.ready = false;
 await h.run().handleExportAction('report'); assert.equal(h.events.length, 1); assert.match(h.events[0], /^log:warning:/); assert.deepEqual(h.payloads, []);
}
{
 const h = harness(); h.ports.exportEnvironmentStatus = 'unavailable';
 await h.run().handleExportAction('pointsCsv'); assert.equal(h.events.length, 1); assert.match(h.events[0], /^log:warning:/); assert.deepEqual(h.payloads, []);
}
{
 const h = harness(); await h.run().handleExportAction('pointsCsv');
 assert.equal(h.events[0], 'busy:true'); assert.match(h.events[1], /^log:info:/); assert.equal(h.events[2], 'bridge'); assert.match(h.events[3], /^log:success:/); assert.equal(h.events[4], 'busy:false');
 assert.deepEqual(h.payloads, [createWorkbenchExportPayload(file, 'pointsCsv', 'zh-CN', { includedGroupIds: undefined })]);
}
for (const status of ['cancelled', 'error'] as const) {
 const h = harness(); h.setResult({ status }); await h.run().handleExportAction('report');
 assert.match(h.events[3], status === 'cancelled' ? /^log:warning:/ : /^log:error:/); assert.equal(h.events.at(-1), 'busy:false');
}
{
 const h = harness(); h.fail(); await h.run().handleExportAction('report'); assert.match(h.events[3], /disk unavailable/); assert.equal(h.events.at(-1), 'busy:false');
}
console.log('workbenchExportActions tests passed');
