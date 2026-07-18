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
assert.match(
  componentSource,
  /const checkFailed = isWorkbenchUpdateCheckFailure\(state\)/,
  'the dialog must use the authoritative updater failure stage instead of inferring it from stale metadata',
);
assert.match(
  componentSource,
  /checkFailed[\s\S]*copy\.updateCheckFailedTitle[\s\S]*copy\.updateCheckFailedBody/,
  'the check-failure branch should use honest localized update-check copy',
);
assert.match(
  componentSource,
  /\{checkFailed \? copy\.retryCheck : copy\.retryDownload\}/,
  'the recovery action must say Check Again when it reruns update discovery',
);
assert.match(componentSource, /onClick=\{onRestartAndInstall\}/);
assert.match(componentSource, /className="studio-update-primary" onClick=\{onManualDownload\}/);
assert.doesNotMatch(
  componentSource,
  /onClick=\{onManualDownload\} disabled=\{!state\.manualDownloadUrl\}/,
  'manual recovery must remain available because the desktop bridge falls back to the trusted latest-release page',
);
assert.match(componentSource, /onClick=\{onIgnoreVersion\} disabled=\{downloading \|\| retrying\}/);
assert.match(
  workbenchSource,
  /<WorkbenchUpdateDialog[\s\S]*state=\{updateDialogState\}[\s\S]*onDownload=\{startUpdateDownload\}[\s\S]*onRestartAndInstall=\{restartAndInstallUpdate\}/,
);
assert.doesNotMatch(workbenchSource, /const renderUpdateDialog/);

console.log('workbenchUpdateDialog tests passed');
