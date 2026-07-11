import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WORKBENCH_LANGUAGE_PREFERENCE_ORDER,
  WORKBENCH_THEME_PREFERENCE_ORDER,
  defaultWorkbenchGeneralSettings,
  normalizeWorkbenchGeneralSettings,
} from '../../src/features/workbench/workbenchGeneralSettings.ts';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const generalSettingsWindowSource = readFileSync(new URL('../../src/features/workbench/WorkbenchGeneralSettingsWindow.tsx', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('../../src/features/workbench/workbenchGeneralSettings.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const getCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `${selector} should have a CSS block`);
  return match[0];
};

assert.deepEqual(WORKBENCH_THEME_PREFERENCE_ORDER, ['system', 'light', 'dark']);

assert.match(
  settingsSource,
  /type WorkbenchResolvedTheme = 'light' \| 'dark';/,
  'system theme resolution should use a constrained light-or-dark type',
);

assert.deepEqual(WORKBENCH_LANGUAGE_PREFERENCE_ORDER, ['zh-CN', 'zh-TW', 'en']);
assert.doesNotMatch(generalSettingsWindowSource, /const THEME_PREFERENCES|const LANGUAGE_PREFERENCES/, 'settings UI should reuse shared preference order registries');

assert.match(
  settingsSource,
  /const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings_v2';/,
  'general settings should use the planned localStorage key',
);

assert.match(
  settingsSource,
  /const loadWorkbenchGeneralSettings = \(\): WorkbenchGeneralSettings => \{[\s\S]*?window\.localStorage\.getItem\(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY\)[\s\S]*?normalizeWorkbenchGeneralSettings\(JSON\.parse\(raw\)\)[\s\S]*?\};/,
  'general settings should load persisted preferences with enum validation and fallback',
);
assert.match(
  settingsSource,
  /const normalizeWorkbenchGeneralSettings[\s\S]*?isWorkbenchThemePreference[\s\S]*?isWorkbenchLanguagePreference[\s\S]*?isWorkbenchPerformanceMode/,
  'general settings normalization should own all preference validation',
);

assert.match(
  settingsSource,
  /const persistWorkbenchGeneralSettings = \(settings: WorkbenchGeneralSettings\) => \{[\s\S]*?window\.localStorage\.setItem\(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY, JSON\.stringify\(settings\)\);[\s\S]*?\};/,
  'general settings should persist valid preferences immediately',
);

assert.match(
  source,
  /const \[settingsGeneralOpen, setSettingsGeneralOpen\] = useState\(\(\) => \([\s\S]*?getHeatCapacityRefreshBoolean\(initialHeatCapacityRefreshWindows, 'settingsGeneralOpen'\)/,
  'general settings window should have independent state restored from the active heat-capacity refresh session',
);

assert.match(
  source,
  /const \[settingsThemePreference, setSettingsThemePreference\] = useState<WorkbenchThemePreference>\(\(\) => initialGeneralSettings\.theme\);/,
  'theme preference state should initialize from persisted general settings',
);

assert.match(
  source,
  /const \[systemWorkbenchTheme, setSystemWorkbenchTheme\] = useState<WorkbenchResolvedTheme>\(\(\) => getSystemWorkbenchTheme\(\)\);/,
  'system theme state should initialize from the real OS color-scheme preference',
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
  settingsSource,
  /const getSystemWorkbenchTheme = \(\): WorkbenchResolvedTheme => \{[\s\S]*?window\.matchMedia\('\(prefers-color-scheme: dark\)'\)[\s\S]*?\};/,
  'system theme resolution should read prefers-color-scheme from the browser',
);

assert.deepEqual(
  normalizeWorkbenchGeneralSettings({
    theme: 'invalid',
    language: 'invalid',
    performanceMode: 'invalid',
  }),
  defaultWorkbenchGeneralSettings,
  'invalid general settings should fall back to defaults',
);
assert.deepEqual(
  normalizeWorkbenchGeneralSettings({
    theme: 'dark',
    language: 'en',
    performanceMode: 'highPerformance',
  }),
  { theme: 'dark', language: 'en', performanceMode: 'highPerformance' },
  'valid general settings should survive normalization',
);
assert.match(source, /from '\.\/workbenchGeneralSettings\.ts'/);
assert.doesNotMatch(source, /const loadWorkbenchGeneralSettings\s*=/);

assert.match(
  source,
  /const resolvedWorkbenchTheme = settingsThemePreference === 'system' \? systemWorkbenchTheme : settingsThemePreference;/,
  'system theme preference should resolve to the current OS theme instead of a fixed theme',
);

assert.doesNotMatch(
  source,
  /settingsThemePreference === 'system' \? 'dark' : settingsThemePreference/,
  'system theme preference should not be hardcoded to dark mode',
);

assert.match(
  source,
  /window\.matchMedia\('\(prefers-color-scheme: dark\)'\)[\s\S]*?addEventListener\('change', updateSystemTheme\)[\s\S]*?removeEventListener\('change', updateSystemTheme\)/,
  'system theme preference should update when the OS color-scheme preference changes',
);

assert.match(
  source,
  /const updateSettingsLanguagePreference = \(language: WorkbenchLanguagePreference\) => \{[\s\S]*?setSettingsLanguagePreference\(language\);[\s\S]*?setSettingsLanguageMenuOpen\(false\);[\s\S]*?persistWorkbenchGeneralSettings\(\{ theme: settingsThemePreference, language, performanceMode: settingsPerformanceMode \}\);[\s\S]*?\};/,
  'language option clicks should update state, close the capsule menu, and persist immediately',
);

assert.match(
  topCommandsSource,
  /\{copy\.menus\.general\}/,
  'Settings menu should include a localized General first-level item',
);

assert.doesNotMatch(
  source,
  /<span>Theme: Dark \/ Light<\/span>|<span>Language: Chinese \/ English<\/span>/,
  'old separate Theme and Language Settings menu entries should be removed',
);

assert.match(
  source,
  /<WorkbenchGeneralSettingsWindow/,
  'workbench should mount the extracted general settings window',
);
assert.doesNotMatch(source, /const renderGeneralSettingsWindow = \(\) => \{/, 'legacy inline settings renderer should be removed');

assert.match(
  source,
  /const workbenchCopy = workbenchCopies\[settingsLanguagePreference\];/,
  'language preference should drive the current workbench copy source',
);

assert.match(
  source,
  /settingsSummary=\{`\$\{workbenchCopy\.settings\.themeOptions\[settingsThemePreference\]\.label\} \/ \$\{workbenchCopy\.settings\.languageOptions\[settingsLanguagePreference\]\.label\} \/ \$\{workbenchCopy\.settings\.performanceModeSummary\[settingsPerformanceMode\]\}`\}/,
  'top-menu settings summary should display localized labels instead of internal preference keys',
);

for (const expression of [
  'copy.settings.title',
  'copy.settings.themeOptions[key]',
  'copy.settings.languageOptions[key]',
  'copy.settings.languageHint',
  'copy.shortcuts.title',
  'copy.shortcuts.undo',
  'copy.shortcuts.redo',
  'copy.shortcuts.closeSettings',
]) {
  assert.ok(generalSettingsWindowSource.includes(expression), `general settings window should use ${expression}`);
}

const generalWindowSource = generalSettingsWindowSource;

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
  /\{languageMenuOpen \? \([\s\S]*className="studio-settings-language-menu"/,
  'language menu should only render while open so a focused option is never hidden with aria-hidden',
);

assert.doesNotMatch(
  generalWindowSource,
  /className="studio-settings-language-menu"[^>]*aria-hidden/,
  'language menu should not use aria-hidden for its closed state',
);

assert.match(
  generalWindowSource,
  /studio-settings-section studio-settings-control-row studio-settings-performance-row[\s\S]*studio-settings-control-surface[\s\S]*studio-settings-performance-segmented/,
  '3D performance settings should align label and segmented control in the same engineering row pattern',
);

assert.match(
  generalWindowSource,
  /studio-settings-section studio-settings-shortcuts-section[\s\S]*studio-settings-section-title[\s\S]*studio-settings-control-surface[\s\S]*studio-settings-shortcuts-card/,
  'shortcut help should put the shortcut list on a new row below the section title',
);

assert.doesNotMatch(
  generalWindowSource,
  /studio-settings-control-row studio-settings-shortcuts-section/,
  'shortcut help should not reuse the two-column control row because shortcut lists can grow',
);

assert.match(
  source,
  /<WorkbenchGeneralSettingsWindow[\s\S]*?onLanguageMenuOpenChange=\{setSettingsLanguageMenuOpen\}/,
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

assert.match(
  styles,
  /\.studio-settings-shortcuts-section \{[\s\S]*?gap: 10px;/,
  'shortcut section should define its own vertical spacing for title and shortcut rows',
);

assert.match(
  getCssBlock('.studio-settings-shortcuts-list'),
  /display: grid;[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(128px, 1fr\)\);/,
  'shortcut list should be a wrapping grid so new shortcuts do not overlap existing labels',
);

assert.match(
  getCssBlock('.studio-settings-shortcuts-list span'),
  /flex-wrap: wrap;/,
  'each shortcut item should be allowed to wrap its keycaps and label',
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
