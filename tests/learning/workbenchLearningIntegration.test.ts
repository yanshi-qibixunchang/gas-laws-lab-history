const tutorialPromptsSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/WorkbenchTutorialPrompts.tsx', import.meta.url), 'utf8');
const tutorialOwnershipSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchTutorialOwnership.ts', import.meta.url), 'utf8');
const tutorialHandoffSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchTutorialHandoffActions.ts', import.meta.url), 'utf8');
const tutorialOverlaySource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchTutorialOverlayActions.ts', import.meta.url), 'utf8');
const tutorialProgressSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/useWorkbenchTutorialProgress.ts', import.meta.url), 'utf8');
const tutorialActivationSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchTutorialActivationActions.ts', import.meta.url), 'utf8');
const exportActionsSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchExportActions.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const workbenchHeatCapacityModeControlSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityModeControl.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchPistonOscillationModeControlSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPistonOscillationModeControl.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchPresentationSource } from 'node:fs';
const presentationWorkbenchExperimentTutorialPresentationSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchExperimentTutorialPresentation.ts', import.meta.url), 'utf8');
const presentationWorkbenchExperimentTutorialWorkspaceSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchExperimentTutorialWorkspace.ts', import.meta.url), 'utf8');
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
assert.match(presentationWorkbenchExperimentTutorialPresentationSource, /重置绝热膨胀学习进度/);
assert.match(workbenchSource, /重置活塞振动学习进度/);
assert.match(presentationWorkbenchExperimentTutorialWorkspaceSource, /getExperimentTutorialFileName/);
assert.match(workbenchPistonOscillationModeControlSource, /isExperimentTutorialModeUnlocked\(tutorialMilestone, 'guide'\)/);
assert.match(workbenchHeatCapacityModeControlSource, /isExperimentTutorialModeUnlocked\(tutorialMilestone, 'guide'\)/);
assert.match(workbenchPistonOscillationModeControlSource, /isExperimentTutorialModeUnlocked\(tutorialMilestone, 'free'\)/);
assert.match(workbenchHeatCapacityModeControlSource, /isExperimentTutorialModeUnlocked\(tutorialMilestone, 'free'\)/);
assert.match(tutorialPromptsSource, /PromptNoticeDialog/);
assert.match(tutorialPromptsSource, /PromptForcedNoticeDialog/);
assert.match(tutorialOwnershipSource, /takeOverExperimentTutorialOwnership/);
assert.match(tutorialOwnershipSource, /EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY/);
assert.match(tutorialOwnershipSource, /visibilitychange/);
assert.match(workbenchSource, /tutorialOwnershipAdoptionRef/);
assert.match(tutorialHandoffSource, /skipExperimentTutorialProfile/);
assert.match(tutorialOverlaySource, /exit-experiment-learning-tutorial/);
assert.match(tutorialPromptsSource, /PromptConfirmDialog/);
assert.doesNotMatch(workbenchSource, /window\.(?:confirm|alert|prompt)\(/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('create-file'\)/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('open-file'\)/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('close-file'\)/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchFileRenameActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('rename-file'\)/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('delete-file'\)/);
assert.match(exportActionsSource, /guardWorkbenchTutorialAction\('export-file'\)/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchDesktopNavigationActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('new-window'\)/);
assert.match(workbenchSource, /createWorkbenchDesktopNavigationActions\(\{ window, guardWorkbenchTutorialAction/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchEditHistoryActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('undo'\)/);
assert.match(readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchEditHistoryActions.ts', import.meta.url), 'utf8'), /guardWorkbenchTutorialAction\('redo'\)/);
assert.match(tutorialHandoffSource, /persistExperimentTutorialHandoff\(completedExperiment, freshFileId\)/);
assert.match(tutorialHandoffSource, /clearExperimentTutorialHandoff\(\)/);
assert.match(workbenchPistonOscillationModeControlSource, /activeTutorialExperiment === 'pistonOscillation'/);
assert.match(tutorialProgressSource, /pistonOscillationGuideSession\.status !== 'completed'/);
assert.match(tutorialActivationSource, /mergeArchivedNamespacesIntoTutorialWorkspace/);

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

assert.ok(workbenchSource.includes("from './workbenchExperimentTutorialPresentation.ts'"), 'workbenchExperimentTutorialPresentation must remain connected to the shell');
assert.ok(tutorialActivationSource.includes("from './workbenchExperimentTutorialWorkspace.ts'"), 'workbenchExperimentTutorialWorkspace must remain connected to the shell');

assert.match(workbenchViewShellSource, /import \{ WorkbenchPistonOscillationModeControl \} from '\.\/WorkbenchPistonOscillationModeControl\.tsx';/);

assert.match(workbenchViewShellSource, /import \{ WorkbenchPistonOscillationModeControl \} from '\.\/WorkbenchPistonOscillationModeControl\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityModeControl \} from '\.\/WorkbenchHeatCapacityModeControl\.tsx';/);

assert.match(tutorialOwnershipSource, /mergeArchivedNamespacesIntoTutorialWorkspace/);
assert.match(workbenchSource, /useWorkbenchTutorialLifecycle\(\{/);

assert.match(workbenchSource, /<WorkbenchTutorialPrompts[\s\S]*model=\{tutorialPromptModel\}[\s\S]*actions=\{tutorialPromptActions\}/);
assert.match(workbenchSource, /createWorkbenchTutorialActivationActions\(\{/);
