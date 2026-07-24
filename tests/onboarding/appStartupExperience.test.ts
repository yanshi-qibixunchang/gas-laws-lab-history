import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APP_STARTUP_STAGE_PROGRESS,
  appStartupCopies,
  getAppStartupMinimumVisibleMs,
  resolveAppStartupPreviewScenario,
} from '../../src/app/appStartupModel.ts';

const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const startupSource = readFileSync(new URL('../../src/app/AppStartupExperience.tsx', import.meta.url), 'utf8');
const startupCssSource = readFileSync(new URL('../../src/app/AppStartupExperience.css', import.meta.url), 'utf8');
const persistenceSource = readFileSync(
  new URL('../../src/features/workbench/workbenchIndexedDbPersistence.ts', import.meta.url),
  'utf8',
);

assert.equal(resolveAppStartupPreviewScenario('?startupPreview=normal', true), 'normal');
assert.equal(resolveAppStartupPreviewScenario('?startupPreview=slow', true), 'slow');
assert.equal(resolveAppStartupPreviewScenario('?startupPreview=error', true), 'error');
assert.equal(resolveAppStartupPreviewScenario('?startupPreview=slow', false), null);
assert.equal(resolveAppStartupPreviewScenario('?startupPreview=unknown', true), null);

assert.ok(APP_STARTUP_STAGE_PROGRESS.starting < APP_STARTUP_STAGE_PROGRESS['opening-storage']);
assert.ok(APP_STARTUP_STAGE_PROGRESS['opening-storage'] < APP_STARTUP_STAGE_PROGRESS['restoring-workspace']);
assert.ok(APP_STARTUP_STAGE_PROGRESS['restoring-workspace'] < APP_STARTUP_STAGE_PROGRESS['preparing-workbench']);
assert.equal(APP_STARTUP_STAGE_PROGRESS.complete, 96);
assert.ok(getAppStartupMinimumVisibleMs('slow') > getAppStartupMinimumVisibleMs('normal'));
assert.ok(getAppStartupMinimumVisibleMs('normal') > getAppStartupMinimumVisibleMs(null));

assert.equal(Object.keys(appStartupCopies).length, 3);
assert.equal(appStartupCopies['zh-CN'].title, '欢迎使用气律实验室');
assert.equal(appStartupCopies['zh-TW'].title, '歡迎使用氣律實驗室');
assert.equal(appStartupCopies.en.title, 'Welcome to Gas Laws Lab');
assert.match(appStartupCopies['zh-CN'].failedBody, /本地数据没有被清除/);
assert.match(appStartupCopies.en.failedBody, /local data was not cleared/i);

assert.match(appSource, /<AppStartupExperience/);
assert.match(appSource, /resolveAppStartupPreviewScenario/);
assert.match(appSource, /subscribeWorkbenchPersistenceInitialization/);
assert.doesNotMatch(appSource, /正在恢复工作区…/);
assert.match(startupSource, /role="progressbar"/);
assert.match(startupSource, /displayedProgress < 99\.75/);
assert.match(
  startupSource,
  /if \(visualState !== 'ready'\) return undefined;[\s\S]*setVisualState\('leaving'\)/,
  'the ready hold should transition to leaving in its own effect',
);
assert.match(
  startupSource,
  /if \(visualState !== 'leaving'\) return undefined;[\s\S]*window\.setTimeout\([\s\S]*onComplete/,
  'startup completion should run from the leaving state instead of a timer cleaned up by the ready transition',
);
assert.match(startupSource, /disabled=\{!bootstrapReady\}/);
assert.match(startupSource, /className="app-startup-stalled-indicator"/);
assert.match(startupCssSource, /\.app-startup-content[\s\S]*grid-template-columns: 168px 1px minmax\(0, 1fr\)/);
assert.match(startupCssSource, /@keyframes appStartupStalledSpin/);
assert.doesNotMatch(startupCssSource, /\.app-startup-failure\s*\{[^}]*border-left:/);
assert.match(startupCssSource, /@media \(prefers-reduced-motion: reduce\)/);
assert.doesNotMatch(startupCssSource, /linear-gradient/);

assert.match(persistenceSource, /WorkbenchPersistenceInitializationStage/);
assert.match(persistenceSource, /publishPersistenceInitializationStage\('opening-storage'\)/);
assert.match(persistenceSource, /publishPersistenceInitializationStage\('restoring-workspace'\)/);
assert.match(persistenceSource, /publishPersistenceInitializationStage\('preparing-workbench'\)/);
assert.match(persistenceSource, /publishPersistenceInitializationStage\(result\.error \? 'failed' : 'complete'\)/);

console.log('appStartupExperience tests passed');
