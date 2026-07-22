import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const componentSource = readFileSync(
  new URL('../../src/components/prompts/PromptConfirmDialog.tsx', import.meta.url),
  'utf8',
);
const styleSource = readFileSync(
  new URL('../../src/components/prompts/PromptConfirmDialog.css', import.meta.url),
  'utf8',
);
const shellSource = readFileSync(
  new URL('../../src/components/prompts/PromptDialogShell.tsx', import.meta.url),
  'utf8',
);
const shellStyleSource = readFileSync(
  new URL('../../src/components/prompts/PromptDialogShell.css', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const copySource = readFileSync(
  new URL('../../src/features/workbench/workbenchPromptCopies.ts', import.meta.url),
  'utf8',
);
const electronSafetySource = readFileSync(
  new URL('../../electron/exitPersistenceCoordinator.cjs', import.meta.url),
  'utf8',
);

assert.match(componentSource, /export type PromptConfirmationTone = PromptDialogTone/);
assert.match(componentSource, /role="alertdialog"/);
assert.match(shellSource, /aria-modal="true"/);
assert.match(componentSource, /titleId=\{titleId\}/);
assert.match(componentSource, /ariaDescribedBy=\{`\$\{bodyId\} \$\{consequenceId\}`\}/);
assert.match(componentSource, /closeLabel=\{request\.closeLabel\}[\s\S]*onRequestClose=\{onCancel\}/, 'the shared title-bar close action should cancel the confirmation');
assert.match(componentSource, /initialFocusRef=\{cancelButtonRef\}/, 'the safe cancel action should receive initial focus');
assert.match(shellSource, /event\.key === 'Escape'[\s\S]*onRequestClose\?\.\(\)/, 'the shared shell should map Escape to the close request');
assert.match(shellSource, /event\.key !== 'Tab'[\s\S]*event\.shiftKey[\s\S]*last\.focus\(\)[\s\S]*first\.focus\(\)/, 'Tab focus should stay inside the shared shell');
assert.match(shellSource, /event\.target !== event\.currentTarget[\s\S]*onRequestClose\(\)/, 'the mask should close only for a direct outside pointer press');
assert.match(shellSource, /event\.detail > 1/, 'a duplicate trigger click must not immediately cancel the new dialog');
assert.match(componentSource, /request\.returnFocusTo\?\.isConnected[\s\S]*request\.returnFocusTo\.focus\(\)/, 'focus should return to the connected trigger');
assert.match(componentSource, /if \(activeRequestRef\.current \|\| settlingRef\.current\) return false;/, 'a second request should be rejected while a confirmation is active or settling');
assert.match(componentSource, /if \(!request \|\| settlingRef\.current\) return;/, 'the confirmation callback should settle only once');

assert.match(styleSource, /\.prompt-confirm-dialog\[data-prompt-tone='warning'\]/);
assert.match(styleSource, /\.prompt-confirm-dialog\[data-prompt-tone='danger'\]/);
assert.match(shellStyleSource, /\.studio-workbench\.studio-theme-light/);
assert.match(styleSource, /\.prompt-confirm-button:focus-visible/);
assert.match(styleSource, /@media \(prefers-reduced-motion: reduce\)/);
assert.doesNotMatch(`${shellStyleSource}\n${styleSource}`, /backdrop-filter|linear-gradient|radial-gradient/);

for (const language of ["'zh-CN'", "'zh-TW'", 'en']) {
  assert.ok(copySource.includes(`${language}: {`), `confirmation copy must include ${language}`);
}
assert.ok(copySource.includes('实验文件仍保留在本地缓存中，不会被删除。'));
assert.ok(copySource.includes('實驗檔案仍保留在本機快取中，不會被刪除。'));
assert.ok(copySource.includes('The experiment file will remain in the local cache and will not be deleted.'));

for (const promptId of [
  'reset-heat-capacity-free-run',
  'switch-heat-capacity-teaching-mode',
  'close-running-workbench-file:',
]) {
  assert.ok(workbenchSource.includes(promptId), `workbench must route ${promptId} through the internal confirmation`);
}
assert.match(workbenchSource, /onClick=\{requestHeatCapacityFreeRunReset\}/, 'the Free reset button should request confirmation');
assert.match(workbenchSource, /onReset=\{resetHeatCapacityFreeRun\}/, 'the invalid-flow dialog reset should execute directly without a second confirmation');
assert.match(workbenchSource, /<PromptConfirmDialog[\s\S]*request=\{activePromptConfirmation\}/);

const sourceRoot = fileURLToPath(new URL('../../src', import.meta.url));
const collectSourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
  const path = join(directory, entry);
  if (statSync(path).isDirectory()) return collectSourceFiles(path);
  return /\.(?:ts|tsx)$/.test(entry) ? [path] : [];
});
const nativePromptUsages = collectSourceFiles(sourceRoot).flatMap((path) => {
  const source = readFileSync(path, 'utf8');
  return /window\.(?:confirm|alert|prompt)\s*\(/.test(source) ? [path] : [];
});
assert.deepEqual(nativePromptUsages, [], 'renderer business code must not call browser-native confirm, alert, or prompt APIs');
assert.match(electronSafetySource, /dialog\.showMessageBox/, 'the desktop exit persistence safety fallback must remain native');

console.log('workbenchPromptConfirmation tests passed');
