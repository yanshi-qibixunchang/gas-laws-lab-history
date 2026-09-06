import { readFileSync as readHeatArchitectureSource } from 'node:fs';
const heatArchitectureWorkbenchHeatCapacityExperimentProgressSource = readHeatArchitectureSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityExperimentProgress.tsx', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchHeatCapacityCenterFeedbackSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityCenterFeedback.tsx', import.meta.url), 'utf8');
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
for (const token of [
  '--prompt-dialog-radius-control: 3px',
  '--prompt-dialog-radius-window: 4px',
  '--prompt-dialog-window-padding: 12px',
  '--prompt-dialog-header-height: 42px',
  '--prompt-dialog-icon-size: 22px',
  '--prompt-dialog-status-rule-width: 0px',
  '--prompt-dialog-window-shadow: 0 8px 18px rgba(0, 0, 0, 0.18)',
]) {
  assert.ok(shellStyleSource.includes(token), `the A confirmation shell should expose ${token}`);
}
assert.match(styleSource, /padding: var\(--prompt-dialog-window-padding\)/, 'A confirmation content should use compact window padding');
assert.match(styleSource, /border-radius: var\(--prompt-dialog-radius-control\)/, 'A confirmation controls should use compact radii');
assert.doesNotMatch(`${shellStyleSource}\n${styleSource}`, /backdrop-filter|linear-gradient|radial-gradient/);

for (const language of ["'zh-CN'", "'zh-TW'", 'en']) {
  assert.ok(copySource.includes(`${language}: {`), `confirmation copy must include ${language}`);
}
assert.ok(copySource.includes('实验文件仍保留在本地缓存中，不会被删除。'));
assert.ok(copySource.includes('實驗檔案仍保留在本機快取中，不會被刪除。'));
assert.ok(copySource.includes('The experiment file will remain in the local cache and will not be deleted.'));

for (const [promptId, owner] of [
  ['restart-heat-capacity-experiment', 'useWorkbenchHeatFreeWorkspace.ts'],
  ['restart-heat-capacity-experiment-group', 'useWorkbenchHeatFreeWorkspace.ts'],
  ['switch-heat-capacity-teaching-mode', 'useWorkbenchHeatModeRuntime.ts'],
  ['close-running-workbench-file:', 'workbenchFileActions.ts'],
]) {
  const source = readFileSync(new URL('../../src/features/workbench/' + owner, import.meta.url), 'utf8');
  assert.ok(source.includes(promptId), 'internal confirmation must remain in its scoped action owner: ' + promptId);
}

assert.match(heatArchitectureWorkbenchHeatCapacityExperimentProgressSource, /id: 'restart-current-experiment'[\s\S]*onSelect: requestRestartHeatCapacityFreeExperiment/, 'the current-experiment restart should request confirmation from the shared progress menu');
assert.match(heatArchitectureWorkbenchHeatCapacityExperimentProgressSource, /id: 'restart-experiment-group'[\s\S]*onSelect: requestRestartHeatCapacityFreeGroup/, 'the whole-group restart should request a separate confirmation from the shared progress menu');
assert.match(workbenchHeatCapacityCenterFeedbackSource, /onReset=\{restartHeatCapacityFreeExperiment\}/, 'the invalid-flow dialog should execute the scoped current-experiment restart directly');
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

assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityCenterFeedback \} from '\.\/WorkbenchHeatCapacityCenterFeedback\.tsx';/);
