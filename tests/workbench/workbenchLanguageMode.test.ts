import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const copySource = readFileSync(new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url), 'utf8');
const generalSettingsWindowSource = readFileSync(new URL('../../src/features/workbench/WorkbenchGeneralSettingsWindow.tsx', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const realtimePanelSource = readFileSync(new URL('../../src/features/workbench/WorkbenchSimulationRealtimePanel.tsx', import.meta.url), 'utf8');
const uiSource = `${source}\n${generalSettingsWindowSource}\n${topCommandsSource}\n${realtimePanelSource}`;
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  copySource,
  /export interface WorkbenchCopy \{/,
  'Workbench should define a dedicated copy contract for localized UI text',
);

assert.match(
  copySource,
  /export const workbenchCopies: Record<WorkbenchLanguagePreference, WorkbenchCopy> = \{[\s\S]*?'zh-CN':[\s\S]*?'zh-TW':[\s\S]*?en:/,
  'Workbench should provide copy tables for zh-CN, zh-TW, and en',
);

const workbenchCopiesStart = copySource.indexOf('export const workbenchCopies:');
const workbenchCopiesEnd = copySource.length;
assert.notEqual(workbenchCopiesStart, -1, 'workbenchCopies table should exist');
const workbenchCopiesSource = copySource.slice(workbenchCopiesStart, workbenchCopiesEnd);
const copyKeys = [...workbenchCopiesSource.matchAll(/^\s{2}('zh-CN'|'zh-TW'|en): \{/gm)].map((match) => match[1].replace(/'/g, ''));
assert.deepEqual(copyKeys, ['zh-CN', 'zh-TW', 'en'], 'copy table language keys should stay complete and ordered');

const getLanguageBlock = (languageKey) => {
  const nextKey = languageKey === "'zh-CN'" ? "'zh-TW': {" : languageKey === "'zh-TW'" ? 'en: {' : '};';
  const start = workbenchCopiesSource.indexOf(`  ${languageKey}: {`);
  const end = workbenchCopiesSource.indexOf(languageKey === 'en' ? nextKey : `  ${nextKey}`, start + 1);
  assert.notEqual(start, -1, `${languageKey} copy block should exist`);
  assert.notEqual(end, -1, `${languageKey} copy block should have an end marker`);
  return workbenchCopiesSource.slice(start, end);
};

const zhCNBlock = getLanguageBlock("'zh-CN'");
const zhTWBlock = getLanguageBlock("'zh-TW'");
const enBlock = getLanguageBlock('en');
const renderSource = `${source.slice(source.indexOf('interface WorkbenchLayoutDefaultState'))}\n${generalSettingsWindowSource}\n${topCommandsSource}\n${realtimePanelSource}`;

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
  'copy.menus.experimentFiles',
  'copy.settings.title',
  'workbenchCopy.files.openFiles',
  'workbenchCopy.parameters.title',
  'workbenchCopy.parameters.samplingPreset',
  'workbenchCopy.parameters.relationHints[option.key]',
  'workbenchCopy.parameters.samplingPresets',
  'workbenchCopy.parameters.samplingDuration',
  'workbenchCopy.results.scan',
  'workbenchCopy.results.temperature',
  'workbenchCopy.results.pressure',
  'workbenchCopy.results.measuredPressure',
  'workbenchCopy.results.idealPressure',
  'workbenchCopy.results.gap',
  'workbenchCopy.results.meanSpeed',
  'workbenchCopy.results.measuredBars',
  'workbenchCopy.results.idealLine',
  'workbenchCopy.results.finalSpeedSamples',
  'workbenchCopy.results.energyDrift',
  'workbenchCopy.results.resultReadyStatus',
  'workbenchCopy.results.resultReadyDetail',
  'workbenchCopy.results.finalTime',
  'workbenchCopy.results.rmsSpeed',
  'workbenchCopy.results.figuresHint',
  'workbenchCopy.results.noIdealPointsTitle',
  'workbenchCopy.results.activeRelation',
  'workbenchCopy.results.historyLockedFor',
  'workbenchCopy.results.historicalContext',
  'workbenchCopy.results.keyFiguresValue',
  'workbenchCopy.results.whyItHappened',
  'workbenchCopy.results.recommendedNextStep',
  'workbenchCopy.results.pvLinearizedValidation',
  'workbenchCopy.results.relationValidation',
  'workbenchCopy.results.verdictLabel',
  'workbenchCopy.results.pointsMetric',
  'workbenchCopy.results.pointsShort',
  'workbenchCopy.results.failureReason',
  'workbenchCopy.results.currentVerification',
  'workbenchCopy.results.currentVerdictRecommendation',
  'workbenchCopy.results.measuredLegend',
  'workbenchCopy.results.phaseStates[activeFile.stats.phase]',
  'workbenchCopy.results.probabilityDensity',
  'workbenchCopy.results.figureStatus[figure.status]',
  'workbenchCopy.results.resultsReady',
  'workbenchCopy.results.clearRelation',
  'workbenchCopy.results.confirmClear',
  'workbenchCopy.results.remove',
  'workbenchCopy.results.exportFigures',
  'workbenchCopy.results.reportPdf',
  'workbenchCopy.results.verificationFigure',
  'workbenchCopy.results.pointsCsv',
  'workbenchCopy.exportEnvironment[exportEnvironmentStatus]',
  'workbenchCopy.console.tabs[tab]',
  'workbenchCopy.status.activeFile',
  'workbenchCopy.status.idealRuntime',
  'copy.shortcuts.title',
  'copy.shortcuts.undo',
]) {
  assert.ok(uiSource.includes(expression), `core UI should render ${expression}`);
}

for (const copyMember of [
  'console: {',
  'status: {',
  'shortcuts: {',
  'parameterLabels: Record',
  'samplingPresets: Record',
  'samplingDuration: (equilibriumTime: number, statsDuration: number) => string;',
]) {
  assert.ok(copySource.includes(copyMember), `WorkbenchCopy should include ${copyMember}`);
}

assert.match(
  copySource,
  /pointsTitle: \(relation\) =>/,
  'Interpolated result labels should use copy functions instead of string concatenation at call sites',
);

assert.match(
  copySource,
  /samplingDuration: \(equilibriumTime, statsDuration\) =>/,
  'Sampling duration copy should use a function so each language controls word order',
);

assert.match(
  copySource,
  /activeFile: \(name\) =>/,
  'Bottom status active-file text should use a copy function',
);

assert.match(
  copySource,
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
  /workbenchCopies\[language\]\.logs\.fileSelected\(selectedFile\.name\)/,
  'Common dynamic logs should read from the language selected at render time',
);

for (const dynamicLogCall of [
  'workbenchCopies[language].logs.autoPausedSingleRuntime',
  'workbenchCopies[language].logs.autoPausedCreateFile',
  'workbenchCopies[language].logs.autoPausedSwitchFile',
  'workbenchCopies[language].logs.fileCreated',
  'workbenchCopies[language].logs.layoutReset',
  'workbenchCopies[language].logs.exportPayloadPrepared',
  'workbenchCopies[language].logs.exportNeedsTwoPoints',
  'workbenchCopies[language].logs.exportCsvSaved',
  'workbenchCopies[language].logs.standardResultsOpened',
  'workbenchCopies[language].logs.fileNameCannotBeEmpty',
  'workbenchCopies[language].logs.confirmDeleteFile',
]) {
  assert.ok(source.includes(dynamicLogCall), `${dynamicLogCall} should localize common dynamic logs`);
}

for (const exportHardcodedCall of [
  'payload prepared as',
  'result data is not ready for scientific export',
  'at least 2 points are required for a fitted report or figure export',
  'PDF export unavailable in web preview',
  '<span>Verification</span><strong>{verificationSpec.recommendedFilename}</strong>',
  '<span>Raw P-V</span><strong>{rawPvSpec.recommendedFilename}</strong>',
  '<span>Points CSV</span><strong>{pointsSpec.recommendedFilename}</strong>',
  '<span>History</span><strong>{historySpec.recommendedFilename}</strong>',
]) {
  assert.ok(!renderSource.includes(exportHardcodedCall), `Export UI/log text should not be hardcoded as ${exportHardcodedCall}`);
}

for (const forbiddenJsxText of [
  '<span>Mean speed</span>',
  '<span>Temperature</span>',
  '<span>Pressure</span>',
  'String(relationVariableKey)',
  '<span>{activeFile.pointsByRelation[option.key].length} pts</span>',
  'Scan temperature at fixed N and V',
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
  'Results ready',
  'Results not ready',
  'Final data has been captured',
  'Run the standard simulation until the collecting phase finishes',
  '<span>Final time</span>',
  '<span>RMS speed</span>',
  '<span>Speed bins</span>',
  '<strong>Figures</strong>',
  'Figure readiness, recommended filenames, and preview.',
  'No ideal-gas points',
  'No ideal-gas verification',
  '<span>Active</span>',
  '<span>Points</span>',
  'History locked for',
  'Unlocked by verified experiment data.',
  'Historical context',
  'Workbench interpretation',
  '<span>Key figures</span>',
  'Recommended next step',
  'P - 1/V linearized validation',
  'Measured scatter with fit and theoretical reference.',
  'Original P - V physical view',
  'Shows the inverse relation directly',
  'verdict: {idealAnalysis.verdictState}',
  '<span>Slope</span>',
  '<span>Theory slope</span>',
  '<span>Slope error</span>',
  '<span>Failure reason</span>',
  "?? 'none'",
  'Current verification: R2',
  'Current verdict:',
  'No ideal-gas history',
  'No verification chart',
  'Panel not connected',
  'This panel will be wired',
  '>measured</span>',
  '>fit</span>',
  '>theory</span>',
  '<th>target T</th>',
  '<th>mean T</th>',
  '<th>measured P</th>',
  '<th>ideal P</th>',
  '<th>gap</th>',
  'P-T pressure trace',
  'Run the current ideal point',
  'Speed distribution',
  'Energy distribution',
  '<span>probability density</span>',
  '<span>v mean</span>',
  '<span>v rms</span>',
  '<strong>{activeFile.stats.phase}</strong>',
  'No experiment point table',
  'Open this ideal Results tab',
  'Double-click to open Results',
  'Expand Results sections',
  'Collapse Results sections',
  'opened Results window on ${tab}',
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
  generalSettingsWindowSource,
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
