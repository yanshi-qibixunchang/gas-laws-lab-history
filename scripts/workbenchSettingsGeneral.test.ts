import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

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
  /const updateSettingsThemePreference = \(theme: WorkbenchThemePreference\) => \{[\s\S]*?setSettingsThemePreference\(theme\);[\s\S]*?persistWorkbenchGeneralSettings\(\{ theme, language: settingsLanguagePreference \}\);[\s\S]*?\};/,
  'theme option clicks should update state and persist immediately',
);

assert.match(
  source,
  /const updateSettingsLanguagePreference = \(language: WorkbenchLanguagePreference\) => \{[\s\S]*?setSettingsLanguagePreference\(language\);[\s\S]*?setSettingsLanguageMenuOpen\(false\);[\s\S]*?persistWorkbenchGeneralSettings\(\{ theme: settingsThemePreference, language \}\);[\s\S]*?\};/,
  'language option clicks should update state, close the capsule menu, and persist immediately',
);

assert.match(
  source,
  /<span>General<\/span>/,
  'Settings menu should include a General first-level item',
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

for (const label of ['General Settings', 'System', 'Light', 'Dark', '简体中文', '繁體中文', 'English']) {
  assert.match(source, new RegExp(label), `general settings window should include ${label}`);
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
