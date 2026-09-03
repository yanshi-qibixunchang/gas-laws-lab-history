import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFile(`${root}${path}`, 'utf8');

const [
  workbenchSource,
  settingsSource,
  desktopMainSource,
  preloadSource,
  persistenceSource,
] = await Promise.all([
  read('src/features/workbench/WorkbenchStudioPrototype.tsx'),
  read('src/features/workbench/WorkbenchGeneralSettingsWindow.tsx'),
  read('electron/main.cjs'),
  read('electron/preload.cjs'),
  read('src/features/workbench/workbenchIndexedDbPersistence.ts'),
]);

assert.match(settingsSource, /learningCopy\.title/);
assert.match(settingsSource, /resetLearningActions\.map/);
assert.match(settingsSource, /onExitTutorial/);
assert.match(settingsSource, /disabled=\{tutorialActive\}/);
assert.match(workbenchSource, /重置绝热膨胀学习进度/);
assert.match(workbenchSource, /重置活塞振动学习进度/);
assert.match(workbenchSource, /getExperimentTutorialFileName/);
assert.match(workbenchSource, /isExperimentTutorialModeUnlocked\(tutorialMilestone, 'guide'\)/);
assert.match(workbenchSource, /isExperimentTutorialModeUnlocked\(tutorialMilestone, 'free'\)/);
assert.match(workbenchSource, /PromptNoticeDialog/);
assert.match(workbenchSource, /PromptForcedNoticeDialog/);
assert.match(workbenchSource, /takeOverExperimentTutorialOwnership/);
assert.match(workbenchSource, /EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY/);
assert.match(workbenchSource, /visibilitychange/);
assert.match(workbenchSource, /tutorialOwnershipAdoptionRef/);
assert.match(workbenchSource, /skipExperimentTutorialProfile/);
assert.match(workbenchSource, /exit-experiment-learning-tutorial/);
assert.match(workbenchSource, /PromptConfirmDialog/);
assert.doesNotMatch(workbenchSource, /window\.(?:confirm|alert|prompt)\(/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('create-file'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('open-file'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('close-file'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('rename-file'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('delete-file'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('export-file'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('new-window'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('undo'\)/);
assert.match(workbenchSource, /guardWorkbenchTutorialAction\('redo'\)/);
assert.match(workbenchSource, /persistExperimentTutorialHandoff\(completedExperiment, freshFileId\)/);
assert.match(workbenchSource, /clearExperimentTutorialHandoff\(\)/);
assert.match(workbenchSource, /activeTutorialExperiment === 'pistonOscillation'/);
assert.match(workbenchSource, /pistonOscillationGuideSession\.status !== 'completed'/);
assert.match(workbenchSource, /mergeArchivedNamespacesIntoTutorialWorkspace/);

assert.match(desktopMainSource, /hsl-tutorial:activate/);
assert.match(desktopMainSource, /prepareWindowsForExit/);
assert.match(desktopMainSource, /hsl-tutorial:finalize-activation/);
assert.match(desktopMainSource, /workbenchWindowRegistry\.remove\(namespace\)/);
assert.match(desktopMainSource, /activeTutorialWindowId !== null/);
assert.match(desktopMainSource, /hsl-tutorial:exit-application/);
assert.match(preloadSource, /hardSphereLabTutorial/);
assert.match(preloadSource, /finalizeActivation/);
assert.match(preloadSource, /exitApplication/);
assert.match(persistenceSource, /loadWorkbenchArchivedNamespaceSnapshot/);

console.log('workbench learning integration tests passed');
