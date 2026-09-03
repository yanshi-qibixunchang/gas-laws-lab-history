import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const componentSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchGeneralSettingsWindow.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(componentSource, /interface WorkbenchGeneralSettingsWindowProps/, 'settings window should expose a typed component boundary');
assert.match(componentSource, /open: boolean;/, 'settings window visibility should remain controlled by the workbench');
assert.match(componentSource, /onThemeChange: \(theme: WorkbenchThemePreference\) => void;/, 'theme updates should cross an explicit callback boundary');
assert.match(componentSource, /onLanguageChange: \(language: WorkbenchLanguagePreference\) => void;/, 'language updates should cross an explicit callback boundary');
assert.match(componentSource, /onPerformanceModeChange: \(mode: WorkbenchPerformanceMode\) => void;/, 'performance updates should cross an explicit callback boundary');
assert.match(componentSource, /onExitTutorial: \(\) => void;/, 'settings should expose a dedicated tutorial exit callback');
assert.match(componentSource, /tutorialActive \? \(/, 'tutorial exit should only be visible while a tutorial is active');
assert.match(componentSource, /resetLearningActions\.map/, 'settings should expose reset actions for every experiment');
assert.match(componentSource, /learningCopy\.exitTutorialLabel/, 'tutorial exit should use localized settings copy');
assert.match(componentSource, /HEAT_CAPACITY_QUALITY_MODE_ORDER\.map/, 'performance options should use the shared quality-mode registry');
assert.doesNotMatch(componentSource, /persistWorkbenchGeneralSettings|localStorage/, 'the view component should not own persistence side effects');
assert.match(workbenchSource, /import \{ WorkbenchGeneralSettingsWindow \} from '\.\/WorkbenchGeneralSettingsWindow\.tsx';/, 'workbench should import the extracted settings component');
assert.doesNotMatch(workbenchSource, /const renderGeneralSettingsWindow/, 'workbench should not retain the old inline renderer');

console.log('workbenchGeneralSettingsWindow tests passed');
