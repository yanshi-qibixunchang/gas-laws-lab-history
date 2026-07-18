import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const topCommandsSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url),
  'utf8',
);
const emptyWorkspaceSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchEmptyWorkspace.tsx', import.meta.url),
  'utf8',
);
const placeholderStyles = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationPlaceholders.css', import.meta.url),
  'utf8',
);

const sourceSlice = (start: string, end: string) => {
  const startIndex = workbenchSource.indexOf(start);
  const endIndex = workbenchSource.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return workbenchSource.slice(startIndex, endIndex);
};

assert.match(
  topCommandsSource,
  /onCreateFile\('heatCapacity'\)[\s\S]*onCreateFile\('heatCapacityPistonOscillation'\)/,
);
assert.match(
  emptyWorkspaceSource,
  /data-workbench-create-experiment="heatCapacityPistonOscillation"[\s\S]*onCreateFile\('heatCapacityPistonOscillation'\)/,
);
assert.match(workbenchSource, /heatCapacityStudy:\s*'空气热容比（绝热膨胀法）'/);
assert.match(workbenchSource, /heatCapacityPistonOscillationStudy:\s*'空气热容比（活塞振动法）'/);

assert.match(
  workbenchSource,
  /const pistonOscillationPanels = useMemo\(\s*\(\) => createHeatCapacityPanels\(workbenchCopy, heatCapacityRealtimeCopy\)/,
);
assert.match(
  workbenchSource,
  /const isPistonOscillationDevelopmentPanelKey = \([\s\S]*file\.kind === 'heatCapacityPistonOscillation'[\s\S]*isHeatCapacityPanelKey\(panel\)/,
);

const openPanelSource = sourceSlice(
  'const openPanel = (panel: WorkbenchPanelKey) => {',
  'const closePanel = (panel: WorkbenchPanelKey',
);
assert.ok(
  openPanelSource.indexOf('isPistonOscillationDevelopmentPanelKey(activeFile, panel)') <
    openPanelSource.indexOf('setSelectedPanel(panel)'),
  'piston development panels must be intercepted before selection or persistence changes',
);
assert.ok(
  openPanelSource.indexOf("showPistonOscillationDevelopmentNotice('navigationItem')") <
    openPanelSource.indexOf('captureUndoSnapshot('),
  'piston development panels must return before an undo entry is captured',
);

const sidebarRailSource = sourceSlice(
  'const openParameterSidebarFromRail = () => {',
  'const collapseHeatCapacityFreeParameterSidebarForExperimentAction',
);
assert.match(
  sidebarRailSource,
  /activeFile\.kind === 'heatCapacityPistonOscillation'[\s\S]*showPistonOscillationDevelopmentNotice\('rightSidebar'\);[\s\S]*return;/,
);
assert.ok(
  sidebarRailSource.indexOf("activeFile.kind === 'heatCapacityPistonOscillation'") <
    sidebarRailSource.indexOf('setParametersCollapsed(false)'),
);
assert.match(
  workbenchSource,
  /const effectiveParametersCollapsed = \([\s\S]*parametersCollapsed \|\|[\s\S]*activeFile\.kind === 'heatCapacityPistonOscillation'/,
);
assert.match(
  workbenchSource,
  /!isWorkbenchEmpty && activeFile\.kind !== 'heatCapacityPistonOscillation' \? \([\s\S]*<aside/,
);

const windowMenuSource = sourceSlice(
  'const topMenuWindowPanels = availablePanels',
  'const activeLayoutDefaults',
);
assert.match(
  windowMenuSource,
  /!isPistonOscillationDevelopmentPanelKey\(activeFile, panel\.key\)/,
);

assert.match(
  workbenchSource,
  /<PistonOscillationPreviewPlaceholder language=\{settingsLanguagePreference\} \/>/,
);
assert.match(
  workbenchSource,
  /<PistonOscillationRealtimeUnavailable language=\{settingsLanguagePreference\} \/>/,
);
assert.match(
  placeholderStyles,
  /\.studio-preview\.studio-preview-piston-oscillation\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
);
assert.match(
  placeholderStyles,
  /\.studio-realtime-panel\.studio-realtime-panel-piston-oscillation\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
);

console.log('workbenchPistonOscillationShell tests passed');
