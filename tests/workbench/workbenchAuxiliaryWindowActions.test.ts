import assert from 'node:assert/strict';
import { createWorkbenchAuxiliaryWindowActions, type WorkbenchAuxiliaryWindowActionPorts, type WorkbenchAboutResultNotice } from '../../src/features/workbench/workbenchAuxiliaryWindowActions.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
const createHarness = () => {
  const calls: string[] = [];
  const timers = new Map<number, () => void>(); let nextTimer = 1;
  let notice: WorkbenchAboutResultNotice | null = null;
  const container = { scrollTop: 42, scrollHeight: 300, clientHeight: 100,
    getBoundingClientRect: () => ({ top: 100 }), scrollTo: (options: { top: number; behavior: string }) => calls.push('scroll:' + options.top + ':' + options.behavior),
  };
  const ports: WorkbenchAuxiliaryWindowActionPorts = {
    window: { setTimeout: (callback: () => void, delay: number) => { const id = nextTimer++; timers.set(id, callback); calls.push('timer:' + delay); return id; },
      clearTimeout: (id: number) => { timers.delete(id); calls.push('cancel:' + id); },
      getComputedStyle: () => ({ scrollMarginTop: '18px' }),
      open: (url: string) => calls.push('open:' + url),
    } as unknown as Window,
    document: { querySelector: () => container, getElementById: () => ({ getBoundingClientRect: () => ({ top: 600 }) }) } as unknown as Document,
    aboutCopy: workbenchCopies['zh-CN'].about,
    setSettingsGeneralOpen: value => calls.push('general:' + value),
    setSettingsLanguageMenuOpen: value => calls.push('language-menu:' + value),
    setOpenTopMenu: value => calls.push('top-menu:' + value),
    setAboutWindowOpen: value => calls.push('about:' + value),
    setBuildNoticeWindowOpen: value => calls.push('build:' + value),
    setBuildNoticeNavOpen: value => calls.push('navigation:' + value),
    setActiveBuildNoticeMaterialId: value => calls.push('material:' + value),
    setBuildNoticeFilePreview: value => calls.push('preview:' + value),
    setBuildNoticeOpenError: value => calls.push('error:' + value),
    setAboutResultNotice: value => { notice = value; calls.push('notice:' + (value?.title ?? 'null')); },
    aboutResultNoticeTimerRef: { current: null }, buildNoticeReturnScrollTopRef: { current: 0 },
    buildNoticeRestoreScrollOnReturnRef: { current: false },
  };
  return { calls, timers, ports, get notice() { return notice; }, actions: createWorkbenchAuxiliaryWindowActions(ports) };
};
{
  const h = createHarness(); h.actions.openGeneralSettings();
  assert.deepEqual(h.calls, ['top-menu:null', 'about:false', 'language-menu:false', 'general:true']);
  h.calls.length = 0; h.actions.closeGeneralSettings();
  assert.deepEqual(h.calls, ['general:false', 'language-menu:false']);
}
{
  const h = createHarness(); h.actions.showAboutResultNotice('first', 'body');
  const oldTimer = h.ports.aboutResultNoticeTimerRef.current!;
  h.actions.showAboutResultNotice('second', 'body', 'warning');
  assert.equal(h.timers.has(oldTimer), false, 'replacing a notice releases its earlier timeout');
  assert.equal(h.notice?.title, 'second'); assert.equal(h.notice?.kind, 'warning');
  const current = h.ports.aboutResultNoticeTimerRef.current!; h.timers.get(current)!();
  assert.equal(h.notice, null); assert.equal(h.ports.aboutResultNoticeTimerRef.current, null);
}
{
  const h = createHarness(); h.actions.showAboutResultNotice('open', 'body');
  h.ports.buildNoticeReturnScrollTopRef.current = 90; h.ports.buildNoticeRestoreScrollOnReturnRef.current = true;
  h.actions.closeAboutWindow();
  assert.equal(h.timers.size, 0); assert.equal(h.notice, null);
  assert.equal(h.ports.buildNoticeReturnScrollTopRef.current, 0);
  assert.equal(h.ports.buildNoticeRestoreScrollOnReturnRef.current, false);
  assert.ok(h.calls.includes('material:null')); assert.ok(h.calls.includes('preview:null'));
  assert.ok(h.calls.includes('about:false')); assert.ok(h.calls.includes('build:false'));
}
{
  const h = createHarness(); h.actions.jumpToBuildNoticeSection('source');
  assert.deepEqual(h.calls, ['material:null', 'error:null', 'navigation:false', 'timer:90']);
  [...h.timers.values()][0]();
  assert.equal(h.calls.at(-1), 'scroll:200:smooth', 'section navigation respects scroll margins and clamps to the real scroll range');
}
{
  const h = createHarness(); h.actions.closeBuildNoticeMaterial();
  assert.equal(h.ports.buildNoticeRestoreScrollOnReturnRef.current, true);
  assert.deepEqual(h.calls, ['material:null', 'preview:null', 'error:null']);
}
console.log('Workbench auxiliary window sequencing, notice ownership and scroll tests passed.');
