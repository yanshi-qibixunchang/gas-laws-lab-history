import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const componentSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchUpdateDialog.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(componentSource, /export const WorkbenchUpdateDialog = \(/);
assert.match(componentSource, /if \(!state\) return null/);
assert.match(componentSource, /state\.status === 'downloading'/);
assert.match(componentSource, /state\.status === 'downloaded'/);
assert.match(componentSource, /state\.status === 'installing'/);
assert.match(componentSource, /state\.status === 'error'/);
assert.match(componentSource, /getWorkbenchLocalizedText\(state\.releaseSummary, language\)/);
assert.match(componentSource, /formatWorkbenchReleaseDate\(state\.releaseDate, language\)/);
assert.match(componentSource, /releaseSections\.map[\s\S]*section\.items\.map/);
assert.match(componentSource, /onClick=\{onRestartAndInstall\}/);
assert.match(componentSource, /onClick=\{onManualDownload\} disabled=\{!state\.manualDownloadUrl\}/);
assert.match(componentSource, /onClick=\{onIgnoreVersion\} disabled=\{downloading \|\| retrying\}/);
assert.match(
  workbenchSource,
  /<WorkbenchUpdateDialog[\s\S]*state=\{updateDialogState\}[\s\S]*onDownload=\{startUpdateDownload\}[\s\S]*onRestartAndInstall=\{restartAndInstallUpdate\}/,
);
assert.doesNotMatch(workbenchSource, /const renderUpdateDialog/);

console.log('workbenchUpdateDialog tests passed');
