import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BROWSER_DESKTOP_RELEASE, createBrowserDownloadPrompt, isBrowserEdition } from '../../src/features/workbench/workbenchBrowserEdition.ts';

assert.equal(isBrowserEdition({}), true);
for (const bridge of ['hardSphereLabWindow', 'hardSphereLabExporter', 'hardSphereLabUpdater']) {
  const scope = {};
  Object.defineProperty(scope, bridge, { value: {} });
  assert.equal(isBrowserEdition(scope), false, `${bridge} identifies a desktop environment`);
}
const catalog = JSON.parse(readFileSync(new URL('../../docs/releases/release-notes.json', import.meta.url), 'utf8'));
const target = catalog.releases.find((release: { version: string }) => release.version === BROWSER_DESKTOP_RELEASE.version);
assert.ok(target, 'browser download must target a documented desktop release');
assert.equal(BROWSER_DESKTOP_RELEASE.installerUrl, target.download.windowsInstaller);
for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
  for (const reason of ['download', 'export'] as const) {
    let downloads = 0;
    const prompt = createBrowserDownloadPrompt(language, reason, () => { downloads += 1; });
    assert.equal(downloads, 0, 'opening a prompt must not start a download');
    assert.ok(prompt.title && prompt.body && prompt.consequence && prompt.cancelLabel && prompt.confirmLabel);
    prompt.onConfirm();
    assert.equal(downloads, 1, 'only confirming the prompt starts the download');
  }
}
console.log('workbenchBrowserEdition tests passed');
