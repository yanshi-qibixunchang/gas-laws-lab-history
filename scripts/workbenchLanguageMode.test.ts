import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /interface WorkbenchCopy \{/,
  'Workbench should define a dedicated copy contract for localized UI text',
);

assert.match(
  source,
  /const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = \{[\s\S]*?'zh-CN':[\s\S]*?'zh-TW':[\s\S]*?en:/,
  'Workbench should provide copy tables for zh-CN, zh-TW, and en',
);

const copyKeys = [...source.matchAll(/^\s{2}('zh-CN'|'zh-TW'|en): \{/gm)].map((match) => match[1].replace(/'/g, ''));
assert.deepEqual(copyKeys, ['zh-CN', 'zh-TW', 'en'], 'copy table language keys should stay complete and ordered');

const getLanguageBlock = (languageKey) => {
  const nextKey = languageKey === "'zh-CN'" ? "'zh-TW': {" : languageKey === "'zh-TW'" ? 'en: {' : '};';
  const start = source.indexOf(`  ${languageKey}: {`);
  const end = source.indexOf(`  ${nextKey}`, start + 1);
  assert.notEqual(start, -1, `${languageKey} copy block should exist`);
  assert.notEqual(end, -1, `${languageKey} copy block should have an end marker`);
  return source.slice(start, end);
};

const zhCNBlock = getLanguageBlock("'zh-CN'");
const zhTWBlock = getLanguageBlock("'zh-TW'");
const enBlock = getLanguageBlock('en');
const renderSource = source.slice(source.indexOf('interface WorkbenchLayoutDefaultState'));

for (const [field, zhCNText, zhTWText, enText] of [
  ['openFiles', '打开文件', '開啟檔案', 'Open Files'],
  ['currentParams', '当前参数', '目前參數', 'Current Parameters'],
  ['realtimeTitle', '实时数据 / 图表', '即時資料 / 圖表', 'Realtime Data / Charts'],
  ['advancedSettings', '高级设置', '進階設定', 'Advanced settings'],
  ['logs tab', '日志', '日誌', 'Logs'],
  ['status active', '当前文件', '目前檔案', 'Active file'],
]) {
  assert.ok(zhCNBlock.includes(zhCNText), `zh-CN copy should localize ${field}`);
  assert.ok(zhTWBlock.includes(zhTWText), `zh-TW copy should localize ${field}`);
  assert.ok(enBlock.includes(enText), `en copy should retain ${field}`);
}

for (const englishOnly of [
  "openFiles: 'Open Files'",
  "title: 'Current Parameters'",
  "realtimeTitle: 'Realtime Data / Charts'",
  "advancedSettings: 'Advanced settings'",
]) {
  assert.ok(!zhCNBlock.includes(englishOnly), `zh-CN should not inherit ${englishOnly}`);
  assert.ok(!zhTWBlock.includes(englishOnly), `zh-TW should not inherit ${englishOnly}`);
}

assert.match(
  source,
  /const workbenchCopy = workbenchCopies\[settingsLanguagePreference\];/,
  'settingsLanguagePreference should drive the current workbench copy source',
);

assert.match(
  source,
  /data-workbench-language=\{settingsLanguagePreference\}/,
  'Workbench root should expose the active language for layout-specific CSS',
);

assert.doesNotMatch(
  source,
  /const workbenchTranslation = translations\['zh-CN'\];/,
  'Workbench should not pin relation UI copy to Simplified Chinese',
);

for (const expression of [
  'workbenchCopy.menus.newStudy',
  'workbenchCopy.settings.title',
  'workbenchCopy.files.openFiles',
  'workbenchCopy.parameters.title',
  'workbenchCopy.parameters.samplingPreset',
  'workbenchCopy.parameters.samplingPresets',
  'workbenchCopy.parameters.samplingDuration',
  'workbenchCopy.results.scan',
  'workbenchCopy.results.measuredPressure',
  'workbenchCopy.results.idealPressure',
  'workbenchCopy.results.gap',
  'workbenchCopy.results.meanSpeed',
  'workbenchCopy.results.measuredBars',
  'workbenchCopy.results.idealLine',
  'workbenchCopy.results.finalSpeedSamples',
  'workbenchCopy.results.energyDrift',
  'workbenchCopy.results.resultsReady',
  'workbenchCopy.results.clearRelation',
  'workbenchCopy.results.confirmClear',
  'workbenchCopy.results.remove',
  'workbenchCopy.console.tabs[tab]',
  'workbenchCopy.status.activeFile',
  'workbenchCopy.status.idealRuntime',
  'workbenchCopy.shortcuts.title',
  'workbenchCopy.shortcuts.undo',
]) {
  assert.ok(source.includes(expression), `core UI should render ${expression}`);
}

for (const copyMember of [
  'console: {',
  'status: {',
  'shortcuts: {',
  'parameterLabels: Record',
  'samplingPresets: Record',
  'samplingDuration: (equilibriumTime: number, statsDuration: number) => string;',
]) {
  assert.ok(source.includes(copyMember), `WorkbenchCopy should include ${copyMember}`);
}

assert.match(
  source,
  /pointsTitle: \(relation\) =>/,
  'Interpolated result labels should use copy functions instead of string concatenation at call sites',
);

assert.match(
  source,
  /samplingDuration: \(equilibriumTime, statsDuration\) =>/,
  'Sampling duration copy should use a function so each language controls word order',
);

assert.match(
  source,
  /activeFile: \(name\) =>/,
  'Bottom status active-file text should use a copy function',
);

assert.match(
  source,
  /idealRuntime: \(relation, verdict\) =>/,
  'Runtime status text should use a copy function for relation and verdict interpolation',
);

assert.match(
  source,
  /const getWorkbenchParameterDisplayLabel = \(/,
  'Parameter rows should resolve labels through a localized helper',
);

assert.match(
  source,
  /createInitialLogs = \(language: WorkbenchLanguagePreference\)/,
  'Initial logs should be created from the selected language',
);

assert.match(
  source,
  /workbenchCopy\.logs\.fileSelected\(file\.name\)/,
  'Common dynamic logs should read from the active copy table',
);

for (const dynamicLogCall of [
  'workbenchCopy.logs.autoPausedSingleRuntime',
  'workbenchCopy.logs.autoPausedCreateFile',
  'workbenchCopy.logs.autoPausedSwitchFile',
  'workbenchCopy.logs.fileCreated',
  'workbenchCopy.logs.layoutReset',
]) {
  assert.ok(source.includes(dynamicLogCall), `${dynamicLogCall} should localize common dynamic logs`);
}

for (const forbiddenJsxText of [
  '<span>Mean speed</span>',
  '<td>final speed samples</td>',
  '<td>final energy samples</td>',
  '<td>temp history samples</td>',
  '<td>final data ready</td>',
  '<td>energy drift</td>',
  '<td>mean abs temp error</td>',
  '<span>measured bars</span>',
  '<span>ideal line</span>',
  'experiment result ready',
  'waiting for recorded points',
]) {
  assert.ok(!renderSource.includes(forbiddenJsxText), `UI text should not be hardcoded as ${forbiddenJsxText}`);
}

assert.match(
  source,
  /getWorkbenchParameterDisplayLabel\(param, workbenchCopy\)/,
  'Rendered parameter rows should use localized parameter labels',
);

assert.match(
  source,
  /workbenchCopy\.parameters\.samplingPresets\[activeSamplingPreset\.key\]/,
  'Sampling preset trigger should use localized preset labels',
);

assert.match(
  source,
  /workbenchCopy\.status\.selectedBlock/,
  'Bottom selected-block text should be localized',
);

assert.doesNotMatch(
  source,
  /pushLog\('Redo shortcut: Ctrl\+Y or Ctrl\+Shift\+Z\. Undo shortcut: Ctrl\+Z\.'/,
  'Shortcut Help should not write shortcut hints to the console anymore',
);

assert.match(
  source,
  /className="studio-settings-shortcuts-card"/,
  'General settings should render shortcut help inside the settings window',
);

assert.match(
  styles,
  /\.studio-ideal-point-strip \{[\s\S]*?grid-template-columns: repeat\(auto-fit, minmax\(92px, 1fr\)\);/,
  'Ideal realtime point strip should wrap responsively instead of clipping narrow panels',
);

assert.match(
  styles,
  /\.studio-console-summary-wide \{[\s\S]*?grid-column: span 5;/,
  'Console summary wide rows should retain a dedicated layout hook for light/dark styling',
);

assert.match(
  styles,
  /\[data-workbench-language='en'\][\s\S]*text-overflow: ellipsis;/,
  'English mode should have overflow handling for longer labels',
);

assert.match(
  styles,
  /\[data-workbench-language='zh-TW'\][\s\S]*text-overflow: ellipsis;/,
  'Traditional Chinese mode should have overflow handling for longer UI terms',
);

console.log('workbenchLanguageMode tests passed');
