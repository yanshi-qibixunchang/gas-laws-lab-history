import assert from 'node:assert/strict';
import { createWorkbenchUpdaterActions, type WorkbenchUpdaterActionPorts } from '../../src/features/workbench/workbenchUpdaterActions.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
import type { WorkbenchUpdateState } from '../../src/features/workbench/workbenchDesktopUpdater.ts';
const createHarness = () => {
  let state: WorkbenchUpdateState = { status: 'idle', currentVersion: '6.4.0', latestVersion: null,
    releaseName: null, releaseDate: null, releaseNotes: null, releaseSummary: null, releaseSections: null,
    releasePageUrl: null, manualDownloadUrl: null, downloadAttempt: null, maxDownloadAttempts: null,
    retrying: false, errorKind: null, percent: null, message: '',
  };
  let open = false;
  const events: string[] = [];
  const ports: WorkbenchUpdaterActionPorts = {
    appVersion: '6.4.0', updaterState: state, updateDialogState: state, aboutUpdateChecking: false,
    aboutCopy: workbenchCopies['zh-CN'].about,
    setUpdaterState: value => { state = typeof value === 'function' ? value(state) : value; events.push('state:' + state.status); },
    setUpdateDialogOpen: value => { open = value; events.push('dialog:' + value); },
    getIgnoredUpdateVersion: () => null,
    rememberIgnoredUpdateVersion: version => events.push('ignore:' + version),
    showAboutResultNotice: (_title, _body, kind) => events.push('notice:' + kind),
    readUpdaterBridge: () => undefined,
    hasUpdaterBridge: () => false,
  };
  return { ports, events, get state() { return state; }, get open() { return open; }, actions: () => createWorkbenchUpdaterActions(ports) };
};
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
{
  const h = createHarness(); h.ports.aboutUpdateChecking = true;
  h.ports.readUpdaterBridge = () => { throw Error('duplicate check'); };
  h.actions().runAboutUpdateCheck(); assert.deepEqual(h.events, []);
}
{
  const h = createHarness(); h.actions().runAboutUpdateCheck();
  assert.equal(h.state.status, 'unsupported'); assert.equal(h.open, false);
  assert.deepEqual(h.events, ['state:unsupported', 'dialog:false', 'notice:warning']);
}
{
  const h = createHarness(); h.ports.getIgnoredUpdateVersion = () => '6.4.1';
  h.actions().applyUpdaterState({ ...h.state, status: 'available', latestVersion: '6.4.1' }, { manual: true });
  assert.equal(h.open, false); assert.equal(h.events.at(-1), 'notice:info');
  h.actions().applyUpdaterState({ ...h.state, status: 'available', latestVersion: '6.4.2' });
  assert.equal(h.open, true);
}
{
  const h = createHarness(); let resolveCheck!: (state: WorkbenchUpdateState) => void;
  const checked = new Promise<WorkbenchUpdateState>(resolve => { resolveCheck = resolve; });
  const bridge: NonNullable<Window['hardSphereLabUpdater']> = {
    checkForUpdates: () => { h.events.push('check'); return checked; },
    downloadUpdate: async () => { throw Error('unexpected download'); }, quitAndInstall: async () => { throw Error('unexpected install'); },
    openManualDownload: async () => ({ status: 'opened' }), onStatus: () => () => {},
  };
  h.ports.readUpdaterBridge = () => bridge; h.ports.hasUpdaterBridge = () => true;
  h.actions().runAboutUpdateCheck();
  assert.deepEqual(h.events, ['check', 'state:checking']);
  resolveCheck({ ...h.state, status: 'available', latestVersion: '6.4.1', releaseName: 'release' }); await settle();
  assert.equal(h.state.latestVersion, '6.4.1'); assert.equal(h.open, true);
}
{
  const h = createHarness(); const failure = { ...h.state, status: 'error' as const, errorStage: 'check' as const };
  h.ports.updateDialogState = failure; h.ports.updaterState = failure;
  let checks = 0; let downloads = 0;
  h.ports.readUpdaterBridge = () => ({ checkForUpdates: async () => { checks++; return { ...failure, status: 'not-available' }; },
    downloadUpdate: async () => { downloads++; return failure; }, quitAndInstall: async () => failure,
    openManualDownload: async () => ({ status: 'opened' }), onStatus: () => () => {},
  });
  h.actions().startUpdateDownload(); await settle();
  assert.equal(checks, 1); assert.equal(downloads, 0);
  assert.equal(h.events[0], 'dialog:false', 'check failures retry the check before allowing a download');
}
{
  const h = createHarness(); const ready = { ...h.state, status: 'available' as const, latestVersion: '6.4.1', releaseName: 'release' };
  h.ports.updaterState = ready; h.ports.updateDialogState = ready;
  h.ports.readUpdaterBridge = () => ({ checkForUpdates: async () => ready,
    downloadUpdate: async () => ({ ...ready, status: 'downloaded' }),
    quitAndInstall: async () => ({ ...ready, status: 'installing' }),
    openManualDownload: async () => ({ status: 'opened' }), onStatus: () => () => {},
  });
  h.actions().startUpdateDownload(); assert.equal(h.state.status, 'downloading'); assert.equal(h.state.percent, 0);
  await settle(); assert.equal(h.state.status, 'downloaded'); assert.equal(h.open, true);
  h.actions().restartAndInstallUpdate(); assert.equal(h.state.status, 'installing'); assert.equal(h.state.percent, 100);
  await settle(); assert.equal(h.state.latestVersion, '6.4.1');
  h.actions().ignoreUpdateDialogVersion(); assert.equal(h.events.at(-1), 'dialog:false');
  assert.ok(h.events.includes('ignore:6.4.1'));
}
console.log('Workbench updater commands preserve checking, ignore and desktop request sequences.');
