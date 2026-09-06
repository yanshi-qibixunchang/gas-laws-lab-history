const archUseWorkbenchConsoleStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchConsoleState.ts', import.meta.url), 'utf8');
const archUseWorkbenchConsoleScrollSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchConsoleScroll.ts', import.meta.url), 'utf8');
const archWorkbenchConsoleStateSource = readFileSync(new URL('../../src/features/workbench/workbenchConsoleState.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchPanelContentSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPanelContent.tsx', import.meta.url), 'utf8');
const workbenchPanelNavigationSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPanelNavigation.tsx', import.meta.url), 'utf8');
const workbenchIdealControlsSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchIdealControls.tsx', import.meta.url), 'utf8');
const workbenchDockHeaderSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchDockHeader.tsx', import.meta.url), 'utf8');
const workbenchIdealResultsRegionSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchIdealResultsRegion.tsx', import.meta.url), 'utf8');
const workbenchConsoleSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchConsole.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchPresentationSource } from 'node:fs';
const presentationWorkbenchConsolePresentationSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchConsolePresentation.ts', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const realtimePanelSource = readFileSync(new URL('../../src/features/workbench/WorkbenchSimulationRealtimePanel.tsx', import.meta.url), 'utf8');
const verificationPanelSource = readFileSync(new URL('../../src/features/workbench/WorkbenchIdealVerificationPanel.tsx', import.meta.url), 'utf8');
const idealWindowsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchIdealResultsWindows.tsx', import.meta.url), 'utf8');
const coordinatorSource = readFileSync(new URL('../../src/features/workbench/workbenchResultsWindowCoordinator.ts', import.meta.url), 'utf8');
const workbenchStudioCopySource = readFileSync(new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const fileStateSource = readFileSync(new URL('../../src/features/workbench/workbenchFileState.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }

  return '';
};

const panelDefinitionsSource = readFileSync(new URL('../../src/features/workbench/workbenchPanelDefinitions.tsx', import.meta.url), 'utf8');
assert.ok(source.includes("from './workbenchPanelDefinitions.tsx'"));
const idealPanelsMatch = panelDefinitionsSource.match(/const createIdealPanels[\s\S]*?\n\];/);
assert.ok(idealPanelsMatch, 'createIdealPanels definition should exist');
const idealPanelsBlock = idealPanelsMatch[0];

assert.ok(
  idealPanelsBlock.includes("key: 'experimentPoints'"),
  'ideal files should expose Points as a Results child window',
);
assert.ok(
  idealPanelsBlock.includes("key: 'verification'"),
  'ideal files should expose Verification as a Results child window',
);
for (const expectedCopy of [
  "pointsTitle: '实验数据记录'",
  "verificationTitle: '关系验证分析'",
  "pointsTitle: '實驗資料記錄'",
  "verificationTitle: '關係驗證分析'",
  "pointsTitle: 'Experiment Data'",
  "verificationTitle: 'Relation Verification'",
]) {
  assert.ok(workbenchStudioCopySource.includes(expectedCopy), `ideal Results child window label should use ${expectedCopy}`);
}
assert.doesNotMatch(
  workbenchStudioCopySource,
  /pointsTitle:\s*'点|pointsTitle:\s*'點|pointsTitle:\s*'Points'|verificationTitle:\s*'验证'|verificationTitle:\s*'驗證'|verificationTitle:\s*'Verification'/,
  'ideal Results child window labels should use experiment-style names instead of casual one-word labels',
);
assert.ok(
  !idealPanelsBlock.includes("key: 'history'"),
  'ideal files should no longer expose Success History as a separate panel',
);
assert.ok(
  idealPanelsBlock.includes("key: 'results'"),
  'ideal files should expose Results as the consolidated experiment window',
);

assert.match(
  idealWindowsSource,
  /export const WorkbenchIdealPointsWindow/,
  'ideal Points child window should have a dedicated presentation component',
);
assert.match(
  idealWindowsSource,
  /export const WorkbenchIdealVerificationWindow/,
  'ideal Verification child window should have a dedicated presentation component',
);
assert.match(workbenchPanelContentSource, /from '\.\/WorkbenchIdealResultsWindows\.tsx'/);
assert.match(workbenchPanelContentSource, /<WorkbenchIdealPointsWindow/);
assert.match(workbenchPanelContentSource, /<WorkbenchIdealVerificationWindow/);
assert.doesNotMatch(idealWindowsSource, /useEffect|useState|updateActiveFile|captureUndoSnapshot/);
assert.doesNotMatch(source, /const renderExperimentPointsPanel =/);
assert.doesNotMatch(source, /const renderIdealPointsWindow =/);
assert.doesNotMatch(source, /const renderIdealVerificationWindow =/);
assert.match(
  workbenchPanelNavigationSource,
  /panel\.key === 'results' && activeFile\.kind === 'ideal' && !resultsChildrenCollapsed/,
  'Ideal Results tree should render Points and Verification child rows',
);
assert.ok(
  !source.includes('Switch relation without leaving Results.'),
  'ideal Results should not duplicate the relation switch from Current Parameters',
);
assert.ok(
  !source.includes('Next preset point'),
  'ideal scan variable controls should replace the unclear next preset point button',
);
assert.match(
  workbenchIdealControlsSource,
  /studio-ideal-scan-slider/,
  'ideal scan variable should expose a value-synchronized slider control',
);
assert.match(
  workbenchIdealControlsSource,
  /studio-ideal-scan-input/,
  'ideal scan variable should also expose a direct numeric input',
);
assert.match(
  workbenchIdealControlsSource,
  /studio-ideal-preset-select/,
  'ideal sampling preset should render as a select-style dropdown',
);
assert.match(
  workbenchIdealControlsSource,
  /studio-ideal-preset-menu-overlay/,
  'ideal sampling preset options should render as an overlay instead of pushing lower parameters down',
);
assert.match(
  workbenchDockHeaderSource,
  /const showPanelActions = isProcessingRealtime[\s\S]*panel\.key === 'preview' && !activePistonOscillationExpandedRealtime/,
  'Preview Reset should be available for both standard and ideal files',
);
assert.match(
  verificationPanelSource,
  /studio-ideal-legend-measured-dot/,
  'measured legend marker should be a scatter dot, not a line swatch',
);
assert.match(
  cssSource,
  /\.studio-ideal-result-window-layer[\s\S]*?position:\s*absolute/,
  'ideal result window should render as an absolute full-width layer',
);
assert.match(
  workbenchIdealResultsRegionSource,
  /activeIdealResultTab/,
  'ideal result state should store a single active tab instead of deriving foreground order from stacked windows',
);
assert.match(
  fileStateSource,
  /openTabs:\s*WorkbenchIdealResultWindowKey\[\]/,
  'ideal result layout should remember which browser-style child tabs are open',
);
assert.match(
  fileStateSource,
  /openTabs:\s*\['experimentPoints',\s*'verification'\]/,
  'new and legacy ideal Results windows should default to both child tabs open',
);
assert.match(
  workbenchIdealResultsRegionSource,
  /const openIdealResultTabs = idealResultWindowPanels\.filter\(\(panel\) => layout\.openTabs\.includes\(panel\.key\)\)/,
  'ideal Results should render tab buttons only for child tabs that are currently open',
);
assert.match(
  workbenchIdealResultsRegionSource,
  /aria-label=\{`\$\{workbenchCopy\.actions\.close\} \$\{panel\.title\}`\}[\s\S]*?closeIdealResultTab\(panel\.key\)/,
  'ideal Results tabs should expose a close button inside each open tab',
);
assert.match(
  source,
  /getIdealResultTabState\(panel\.key\)/,
  'Window menu should show active/open/off state for ideal Results child tabs',
);
assert.match(
  source,
  /kind: 'ideal' as const,[\s\S]*?key: panel\.key/,
  'workbench should expose ideal Results child tabs through the structured Window-menu view model',
);
assert.match(
  topCommandsSource,
  /panel\.children\.map\(\(child\)[\s\S]*?onToggleWindowResultChild\(child\)/,
  'ideal Results child tabs should be toggleable from the Window menu with a single click',
);
assert.match(
  coordinatorSource,
  /options\.replaceOpenTabs\s*\?\s*\[requestedTab\]\s*:/,
  'ideal Results single-child open should replace default open tabs with only the selected tab',
);
assert.match(
  readFileSync(new URL('../../src/features/workbench/workbenchWindowActions.ts', import.meta.url), 'utf8'),
  /openIdealResultsWindow\(tab,\s*false,\s*replaceOpenTabs\)/,
  'ideal Results child switches should single-open from closed state and append to already open tabs',
);
assert.doesNotMatch(
  source,
  /studio-ideal-result-tabs/,
  'ideal Results should not use a separate centered capsule tab component',
);
assert.match(
  workbenchIdealResultsRegionSource,
  /className="studio-results-tabs studio-ideal-results-tabs"/,
  'ideal Results should reuse the standard Results tab strip styling',
);
assert.match(
  workbenchPanelNavigationSource,
  /className="studio-results-nav studio-results-child-nav studio-ideal-results-nav"/,
  'ideal Results tree children should use the shared indented child navigation styling',
);
assert.match(
  workbenchPanelNavigationSource,
  /className="studio-results-nav studio-results-child-nav"/,
  'standard Results tree children should use the shared indented child navigation styling',
);
assert.match(
  cssSource,
  /\.studio-results-child-nav\s*\{[\s\S]*?border-left:/,
  'standard and ideal Results children should show a vertical guide line like heat capacity child files',
);
assert.doesNotMatch(
  cssSource,
  /\.studio-ideal-result-window-back/,
  'ideal Results should no longer render a back result layer',
);
assert.doesNotMatch(
  cssSource,
  /\.studio-ideal-result-window-front/,
  'ideal Results should no longer render a front result layer',
);
assert.match(
  realtimePanelSource,
  /studio-realtime-summary-ideal/,
  'ideal realtime summary should use an ideal-only layout class',
);
assert.match(
  cssSource,
  /\.studio-realtime-summary-ideal[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  'ideal realtime summary should use a 3-column grid instead of the standard 6-column strip',
);
assert.match(
  realtimePanelSource,
  /studio-realtime-summary-standard/,
  'standard realtime summary should also use a dedicated comfortable layout class',
);
assert.match(
  cssSource,
  /\.studio-realtime-summary-standard[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  'standard realtime summary should use a 3-column grid instead of truncating six metrics in one row',
);
assert.match(
  realtimePanelSource,
  /studio-ideal-point-strip/,
  'ideal realtime current point summary should render as a compact strip',
);
assert.match(
  verificationPanelSource,
  /studio-verification-panel-\$\{file\.relation\}/,
  'ideal Verification should add a relation-specific panel class',
);
assert.match(
  verificationPanelSource,
  /studio-verification-layout-pv/,
  'ideal P-V Verification should use a dedicated double-chart layout class',
);
assert.match(
  verificationPanelSource,
  /studio-verification-layout-single/,
  'ideal P-T and P-N Verification should use a dedicated single-chart layout class',
);
assert.match(
  verificationPanelSource,
  /studio-verification-chart-primary[\s\S]*?<IdealValidationChart[\s\S]*?analysis=\{analysis\}/,
  'ideal Verification should render the linearized validation chart as the primary chart',
);
assert.match(
  verificationPanelSource,
  /isPvVerification \? \([\s\S]*?studio-verification-chart-secondary[\s\S]*?<IdealValidationChart[\s\S]*?variant="pvRaw"/,
  'ideal P-V Verification should render the raw P-V chart only in the P-V branch',
);
assert.match(
  cssSource,
  /\.studio-verification-panel[\s\S]*?height:\s*clamp\(420px,\s*56vh,\s*620px\)[\s\S]*?overflow:\s*hidden/,
  'ideal Verification should use a fixed internal workspace instead of an unconstrained content flow',
);
assert.match(
  cssSource,
  /\.studio-verification-layout-pv[\s\S]*?grid-template-columns/,
  'ideal P-V Verification should have relation-specific layout CSS',
);
assert.match(
  cssSource,
  /\.studio-verification-layout-single[\s\S]*?grid-template-columns/,
  'ideal P-T and P-N Verification should have relation-specific layout CSS',
);
assert.match(
  getRuleBody('.studio-ideal-child-window-body'),
  /align-content:\s*start/,
  'ideal Results child content should stay top-aligned when the result window is stretched taller',
);
assert.match(
  getRuleBody('.studio-ideal-results-card'),
  /align-self:\s*start/,
  'ideal Results cards should keep content-driven height instead of stretching to fill free space',
);
assert.match(
  getRuleBody('.studio-ideal-results-status-grid div'),
  /min-height:\s*64px/,
  'ideal Results metric blocks should use stable compact heights without excessive blank space',
);
assert.match(
  presentationWorkbenchConsolePresentationSource,
  /type ConsoleTab = 'logs' \| 'warnings' \| 'summary'/,
  'Console Output should define clickable log filter tabs',
);
assert.match(
  archUseWorkbenchConsoleStateSource,
  /const \[consoleTab,\s*setConsoleTab\]/,
  'Console Output should store the active log tab',
);
assert.match(
  archUseWorkbenchConsoleScrollSource,
  /consoleBodyRef[\s\S]*?scrollTop\s*=\s*body\.scrollHeight/,
  'Console Output should auto-scroll to the newest log entry',
);
assert.match(
  workbenchConsoleSource,
  /<button[\s\S]*?setConsoleTab\(tab\)/,
  'Console Output tabs should render as clickable buttons',
);
assert.match(
  archWorkbenchConsoleStateSource,
  /createInitialLogs/,
  'initial Console Output rows should be generated at component startup',
);
assert.doesNotMatch(
  source,
  /time:\s*'00:00:0\d'/,
  'initial Console Output rows should not use hard-coded fake timestamps',
);
assert.doesNotMatch(
  source,
  /Branch:\s*react-workbench/,
  'footer status should no longer show the branch label',
);
assert.doesNotMatch(
  source,
  /Workbench integration batch 4\/6 prep/,
  'footer status should no longer show the internal workbench batch label',
);
assert.match(
  verificationPanelSource,
  /studio-ideal-diagnosis-card/,
  'ideal Verification should surface shared failure diagnosis and recommendation text',
);
assert.match(
  cssSource,
  /\.studio-ideal-history-grid/,
  'ideal Verification should provide a visible shared history content grid',
);
assert.match(
  getRuleBody('.studio-ideal-scan-derived'),
  /justify-content:\s*space-between/,
  'P-V derived V and 1/V value chips should sit at the left and right edges under the scan slider',
);
assert.match(
  fileStateSource,
  /equilibriumTime:\s*4,[\s\S]*statsDuration:\s*12,/,
  'ideal default sampling preset should be Balanced',
);

console.log('workbenchIdealResultsWindow tests passed');

assert.match(archWorkbenchConsoleStateSource, /from '\.\/workbenchConsolePresentation\.ts'/);

assert.match(workbenchViewShellSource, /import \{ WorkbenchPanelContent \} from '\.\/WorkbenchPanelContent\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchPanelNavigation \} from '\.\/WorkbenchPanelNavigation\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchIdealControls \} from '\.\/WorkbenchIdealControls\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchDockHeader \} from '\.\/WorkbenchDockHeader\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchIdealResultsRegion \} from '\.\/WorkbenchIdealResultsRegion\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchConsole \} from '\.\/WorkbenchConsole\.tsx';/);

assert.match(source, /from '\.\/useWorkbenchConsoleState\.ts'/);
assert.match(source, /from '\.\/useWorkbenchConsoleScroll\.ts'/);
assert.match(source, /from '\.\/workbenchConsoleState\.ts'/);
