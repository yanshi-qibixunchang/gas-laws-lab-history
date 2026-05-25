import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const getCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `${selector} should have a CSS block`);
  return match[0];
};

assert.match(
  source,
  /type WorkbenchThemePreference = 'system' \| 'light' \| 'dark';/,
  'general settings should define a constrained theme preference type',
);

assert.match(
  source,
  /type WorkbenchLanguagePreference = 'zh-CN' \| 'zh-TW' \| 'en';/,
  'general settings should define a constrained language preference type',
);

assert.match(
  source,
  /const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings';/,
  'general settings should use the planned localStorage key',
);

assert.match(
  source,
  /const loadWorkbenchGeneralSettings = \(\): WorkbenchGeneralSettings => \{[\s\S]*?window\.localStorage\.getItem\(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY\)[\s\S]*?isWorkbenchThemePreference[\s\S]*?isWorkbenchLanguagePreference[\s\S]*?\};/,
  'general settings should load persisted preferences with enum validation and fallback',
);

assert.match(
  source,
  /const persistWorkbenchGeneralSettings = \(settings: WorkbenchGeneralSettings\) => \{[\s\S]*?window\.localStorage\.setItem\(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY, JSON\.stringify\(settings\)\);[\s\S]*?\};/,
  'general settings should persist valid preferences immediately',
);

assert.match(
  source,
  /const \[settingsGeneralOpen, setSettingsGeneralOpen\] = useState\(false\);/,
  'general settings window should have independent open state',
);

assert.match(
  source,
  /const \[settingsThemePreference, setSettingsThemePreference\] = useState<WorkbenchThemePreference>\(\(\) => initialGeneralSettings\.theme\);/,
  'theme preference state should initialize from persisted general settings',
);

assert.match(
  source,
  /const \[settingsLanguagePreference, setSettingsLanguagePreference\] = useState<WorkbenchLanguagePreference>\(\(\) => initialGeneralSettings\.language\);/,
  'language preference state should initialize from persisted general settings',
);

assert.match(
  source,
  /const openGeneralSettings = \(\) => \{[\s\S]*?setOpenTopMenu\(null\);[\s\S]*?setSettingsGeneralOpen\(true\);[\s\S]*?\};/,
  'Settings > General should open the independent settings window and close the top menu',
);

assert.match(
  source,
  /const updateSettingsThemePreference = \(theme: WorkbenchThemePreference\) => \{[\s\S]*?setSettingsThemePreference\(theme\);[\s\S]*?persistWorkbenchGeneralSettings\(\{ theme, language: settingsLanguagePreference, performanceMode: settingsPerformanceMode \}\);[\s\S]*?\};/,
  'theme option clicks should update state and persist immediately',
);

assert.match(
  source,
  /const updateSettingsLanguagePreference = \(language: WorkbenchLanguagePreference\) => \{[\s\S]*?setSettingsLanguagePreference\(language\);[\s\S]*?setSettingsLanguageMenuOpen\(false\);[\s\S]*?persistWorkbenchGeneralSettings\(\{ theme: settingsThemePreference, language, performanceMode: settingsPerformanceMode \}\);[\s\S]*?\};/,
  'language option clicks should update state, close the capsule menu, and persist immediately',
);

assert.match(
  source,
  /\{workbenchCopy\.menus\.general\}/,
  'Settings menu should include a localized General first-level item',
);

assert.doesNotMatch(
  source,
  /<span>Theme: Dark \/ Light<\/span>|<span>Language: Chinese \/ English<\/span>/,
  'old separate Theme and Language Settings menu entries should be removed',
);

assert.match(
  source,
  /const renderGeneralSettingsWindow = \(\) => \{/,
  'general settings window should render theme cards and language choices',
);

assert.match(
  source,
  /const workbenchCopy = workbenchCopies\[settingsLanguagePreference\];/,
  'language preference should drive the current workbench copy source',
);

for (const expression of [
  'workbenchCopy.settings.title',
  'workbenchCopy.settings.themeOptions[key]',
  'workbenchCopy.settings.languageOptions[key]',
  'workbenchCopy.settings.languageHint',
  'workbenchCopy.shortcuts.title',
  'workbenchCopy.shortcuts.undo',
  'workbenchCopy.shortcuts.redo',
  'workbenchCopy.shortcuts.closeSettings',
]) {
  assert.ok(source.includes(expression), `general settings window should use ${expression}`);
}

const generalWindowSource = source.slice(
  source.indexOf('const renderGeneralSettingsWindow = () => {'),
  source.indexOf('const renderTopCommand ='),
);

assert.doesNotMatch(
  generalWindowSource,
  /Save<\/button>|Cancel<\/button>/,
  'general settings window should not add Save or Cancel buttons',
);

assert.match(
  generalWindowSource,
  /studio-settings-shortcuts-card[\s\S]*Ctrl\+Z[\s\S]*Ctrl\+Y[\s\S]*Ctrl\+Shift\+Z[\s\S]*Esc/,
  'general settings window should show shortcut help inline instead of routing it through the console',
);

assert.match(
  generalWindowSource,
  /studio-settings-section studio-settings-control-row[\s\S]*studio-settings-control-surface[\s\S]*studio-settings-language-select/,
  'language settings should use a label/control row with a unified control surface',
);

assert.match(
  generalWindowSource,
  /studio-settings-section studio-settings-control-row studio-settings-performance-row[\s\S]*studio-settings-control-surface[\s\S]*studio-settings-performance-segmented/,
  '3D performance settings should align label and segmented control in the same engineering row pattern',
);

assert.match(
  generalWindowSource,
  /studio-settings-section studio-settings-control-row studio-settings-shortcuts-section[\s\S]*studio-settings-control-surface[\s\S]*studio-settings-shortcuts-card/,
  'shortcut help should use the same lower settings row and control-surface treatment',
);

assert.match(
  source,
  /\{renderGeneralSettingsWindow\(\)\}/,
  'general settings window should render above the main interface',
);

assert.match(
  styles,
  /\.studio-settings-overlay[\s\S]*position: fixed;[\s\S]*\.studio-settings-window[\s\S]*\.studio-settings-theme-grid[\s\S]*\.studio-settings-language-select/,
  'settings window CSS should define a fixed overlay, modal window, theme grid, and language capsule',
);

assert.match(
  styles,
  /\.studio-settings-shortcuts-card[\s\S]*\.studio-settings-shortcuts-list[\s\S]*kbd/,
  'settings window CSS should define an inline shortcut-help card',
);

assert.doesNotMatch(
  getCssBlock('.studio-settings-window'),
  /linear-gradient/,
  'settings window should use a solid engineering surface instead of a modal gradient',
);

assert.match(
  styles,
  /\.studio-settings-control-row \{[\s\S]*?grid-template-columns: minmax\(160px, 0\.72fr\) minmax\(0, 1fr\);/,
  'lower settings sections should align labels and controls on a consistent two-column grid',
);

assert.match(
  styles,
  /\.studio-settings-control-surface \{[\s\S]*?background: #171d23;/,
  'lower settings controls should sit on a unified solid control surface',
);

assert.doesNotMatch(
  getCssBlock('.studio-settings-performance-thumb'),
  /linear-gradient/,
  '3D performance segmented thumb should use a solid selected state instead of a gradient',
);

assert.match(
  styles,
  /\.studio-settings-language-trigger > span \{[\s\S]*?display: flex;[\s\S]*?align-items: baseline;[\s\S]*?\}/,
  'language capsule should keep language label and hint on one baseline-aligned row',
);

assert.match(
  styles,
  /\.studio-settings-language-menu \{[\s\S]*?top: auto;[\s\S]*?bottom: calc\(100% \+ 6px\);[\s\S]*?transform: translateY\(6px\) scale\(0\.98\);[\s\S]*?transform-origin: bottom center;[\s\S]*?\}/,
  'language menu should expand upward from the capsule to avoid bottom clipping',
);

assert.match(
  styles,
  /\.studio-settings-language-menu button \{[\s\S]*?display: flex;[\s\S]*?align-items: baseline;[\s\S]*?\}/,
  'language menu options should keep label and hint on one baseline-aligned row',
);

console.log('workbenchSettingsGeneral tests passed');

