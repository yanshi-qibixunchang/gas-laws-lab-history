const updaterActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchUpdaterActions.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WORKBENCH_IGNORED_UPDATE_VERSION_KEY,
  formatWorkbenchReleaseDate,
  getAboutUpdateStatusLabel,
  getWorkbenchLocalizedText,
  isWorkbenchUpdateCheckFailure,
  isWorkbenchUpdateDownloadFailure,
  mergeWorkbenchUpdateState,
  type WorkbenchUpdateState,
  type WorkbenchUpdateStatusCopy,
} from '../../src/features/workbench/workbenchDesktopUpdater.ts';

const previous: WorkbenchUpdateState = {
  status: 'available',
  currentVersion: '4.2.2',
  latestVersion: '4.2.3',
  releaseName: 'Release 4.2.3',
  releaseDate: '2026-07-10T00:00:00.000Z',
  releaseSummary: { 'zh-CN': '更新摘要', en: 'Release summary' },
  releaseSections: [],
  releasePageUrl: 'https://example.com/release',
};
const downloading: WorkbenchUpdateState = {
  status: 'downloading',
  currentVersion: '4.2.2',
  latestVersion: '4.2.3',
  percent: 25,
};

assert.deepEqual(mergeWorkbenchUpdateState(downloading, null), downloading);
assert.deepEqual(mergeWorkbenchUpdateState(downloading, previous), {
  ...downloading,
  releaseName: previous.releaseName,
  releaseDate: previous.releaseDate,
  releaseNotes: undefined,
  releaseSummary: previous.releaseSummary,
  releaseSections: previous.releaseSections,
  releasePageUrl: previous.releasePageUrl,
  manualDownloadUrl: undefined,
});
assert.deepEqual(
  mergeWorkbenchUpdateState({ ...downloading, latestVersion: '4.3.0' }, previous),
  { ...downloading, latestVersion: '4.3.0' },
  'metadata from one release must not leak into a different version',
);
assert.equal(
  mergeWorkbenchUpdateState({ ...downloading, latestVersion: null }, previous).latestVersion,
  previous.latestVersion,
  'partial updater events should preserve the current release identity',
);
const failedRecheck = mergeWorkbenchUpdateState({
  status: 'error',
  currentVersion: '4.2.3',
  latestVersion: null,
  errorStage: 'check',
}, {
  ...previous,
  status: 'not-available',
  currentVersion: '4.2.3',
  latestVersion: '4.2.3',
});
assert.equal(failedRecheck.latestVersion, '4.2.3');
assert.equal(isWorkbenchUpdateCheckFailure(failedRecheck), true);
assert.equal(isWorkbenchUpdateDownloadFailure(failedRecheck), false);
assert.equal(isWorkbenchUpdateDownloadFailure({
  ...failedRecheck,
  latestVersion: '4.2.4',
  errorStage: 'download',
}), true);

assert.equal(getWorkbenchLocalizedText(previous.releaseSummary, 'zh-CN'), '更新摘要');
assert.equal(getWorkbenchLocalizedText({ en: 'Fallback' }, 'zh-TW'), 'Fallback');
assert.equal(getWorkbenchLocalizedText(null, 'en'), null);
assert.equal(formatWorkbenchReleaseDate(null, 'en'), '--');
assert.equal(formatWorkbenchReleaseDate('invalid', 'en'), 'invalid');
assert.notEqual(formatWorkbenchReleaseDate(previous.releaseDate, 'en'), '--');

const copy: WorkbenchUpdateStatusCopy = {
  checking: 'checking',
  available: 'available',
  updateAvailableStatus: (version) => `found ${version}`,
  upToDateStatus: 'up to date',
  downloadingUpdateStatus: (percent) => `downloading ${percent}`,
  retryingUpdateStatus: (attempt, maxAttempts) => `retrying ${attempt}/${maxAttempts}`,
  updateReadyStatus: 'ready',
  unsupportedUpdateStatus: 'unsupported',
  updateErrorStatus: 'error',
};
assert.equal(getAboutUpdateStatusLabel(previous, copy, true), 'found 4.2.3');
assert.equal(getAboutUpdateStatusLabel(downloading, copy, true), 'downloading 25');
assert.equal(getAboutUpdateStatusLabel({ status: 'idle', currentVersion: '4.2.2' }, copy, false), 'unsupported');
assert.equal(WORKBENCH_IGNORED_UPDATE_VERSION_KEY, 'hslIgnoredUpdateVersion');

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(workbenchSource, /from '\.\/workbenchDesktopUpdater\.ts'/);
assert.doesNotMatch(workbenchSource, /interface WorkbenchUpdateState|const mergeWorkbenchUpdateState\s*=/);
assert.doesNotMatch(
  updaterActionsSource,
  /showAboutResultNotice\(aboutCopy\.updateResultTitle,\s*(?:result\.)?message/,
  'desktop updater failures should not expose unlocalized bridge error text in the UI',
);
assert.match(
  updaterActionsSource,
  /showAboutResultNotice\(\s*aboutCopy\.updateResultTitle,\s*aboutCopy\.updateErrorStatus,\s*'danger',?\s*\)/,
  'manual updater failures should use the active localized error copy and danger feedback level',
);

console.log('workbenchDesktopUpdater tests passed');
