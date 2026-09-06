const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchPanelContentSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPanelContent.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const workbench = read('src/features/workbench/WorkbenchStudioPrototype.tsx');
const leftPanel = read('src/features/heatCapacity/HeatCapacityLeftPanel.tsx');
const contextBar = read('src/features/heatCapacity/HeatCapacityExperimentGroupContextBar.tsx');
const resultsPanel = read('src/features/heatCapacity/HeatCapacityGroupResultsPanel.tsx');
const groupChart = read('src/features/heatCapacity/HeatCapacityGroupLollipopChart.tsx');
const groupResultsCss = read('src/features/heatCapacity/HeatCapacityGroupResultsPanel.css');
const reportDialog = read('src/features/heatCapacity/HeatCapacityReportExportDialog.tsx');
const parameterPanelModel = read('src/features/heatCapacity/heatCapacityFreeParameterPanelModel.ts');

assert.match(
  workbench,
  /const activeHeatCapacityCurrentGroupTerminal =[\s\S]*status === 'completed'[\s\S]*status === 'legacy-incomplete-readonly'[\s\S]*const activeHeatCapacityFreeSchemeLocked =[\s\S]*!activeHeatCapacityCurrentGroupTerminal[\s\S]*isHeatCapacityFreeExperimentStarted/,
  'real/ideal scheme selection should unlock after a terminal experiment group',
);
assert.match(
  workbench,
  /activateFromExplore: activateHeatCapacityModeFromExplore[\s\S]*collapsePanels: \(\) => \{ setLeftCollapsed\(true\); setParametersCollapsed\(true\); \}/,
  'starting a Heat teaching mode should collapse both sidebars once for the experiment workspace',
);
assert.doesNotMatch(
  workbench,
  /const enteredFreeMode =[\s\S]*const groupCompleted =[\s\S]*setParametersCollapsed\(false\)/,
  'mode progress must not repeatedly override a user-selected right-sidebar state',
);
assert.match(
  workbenchPanelContentSource,
  /const storedTrialId = groupCollection\.lastViewedTrialIdByGroupId[\s\S]*runSeries\.trials\[0\]\?\.id \?\? null/,
  'process review should default to experiment 1 when a group has no saved local selection',
);
assert.match(
  workbench,
  /const requestRemoveHeatCapacityTrialRecord =[\s\S]*currentGroup\?\.status !== 'collecting'[\s\S]*viewedGroupId !== currentGroup\.id/,
  'record deletion should defensively reject historical and completed group contexts',
);
assert.match(
  workbench,
  /const selectHeatCapacityViewedGroup = \(groupId: string\) => \{[\s\S]*?setPendingRemoveHeatCapacityTrialRecord\(null\)/,
  "switching experiment groups from process review should clear any pending inline deletion confirmation",
);
assert.match(
  contextBar,
  /查看实验组[\s\S]*查看实验次序[\s\S]*lastViewedTrialIdByGroupId[\s\S]*runSeries\.trials\[0\]\?\.id/,
  'results and process review should use independent selectors and default a new group view to its first experiment',
);
assert.match(
  contextBar,
  /currentGroupRunning = currentGroup\?\.status === 'collecting'[\s\S]*currentGroupRunning \? copy\.historical : copy\.historicalIdle/,
  'the historical-view notice should only claim the instrument is running while the current group is collecting data',
);
assert.match(
  resultsPanel,
  /完成第 3 次实验后显示棒棒糖图[\s\S]*全部实验组结果概览[\s\S]*操作平均分[\s\S]*计算分[\s\S]*本组总分[\s\S]*overview\.points\.length >= 2/,
  'group results should show the approved lollipop threshold, overview, and 75+25 score summary',
);
assert.match(
  groupChart,
  /studio-heat-group-chart-legend-theory[\s\S]*model\.theoreticalGamma\.toFixed\(4\)[\s\S]*studio-heat-group-chart-legend-mean[\s\S]*mean\.toFixed\(4\)[\s\S]*studio-heat-group-chart-legend-uncertainty[\s\S]*uncertainty\.toFixed\(4\)/,
  'the group chart legend should pair each visual encoding with its exact value',
);
assert.match(
  groupChart,
  /studio-heat-chart-plot-frame[\s\S]*PLOT_BOTTOM - MAJOR_TICK_LENGTH[\s\S]*PLOT_TOP \+ MAJOR_TICK_LENGTH[\s\S]*studio-heat-chart-axis-title/,
  'the group chart should use a full plot frame, inward ticks, and explicit axis titles',
);
assert.match(
  groupResultsCss,
  /\.studio-heat-chart-axis-tick text \{[\s\S]*font-family: var\(--app-font-data\);[\s\S]*font-size: 13px;[\s\S]*\.studio-heat-chart-axis-title \{[\s\S]*font-family: var\(--app-font-ui-zh-cn\);[\s\S]*font-size: 13px;/,
  'the group chart should reuse the process charts numeric and Chinese font system',
);
assert.match(
  leftPanel,
  /data-heat-capacity-export-actions="true"[\s\S]*导出实验包[\s\S]*导出报告[\s\S]*导出图表/,
  'Free Mode results should expose the three approved export actions',
);
assert.match(
  leftPanel,
  /const displayedTrialsEditable = displayMatchesActiveDomain[\s\S]*viewedGroup\?\.status === 'collecting'[\s\S]*displayedTrialsEditable &&/,
  'historical or completed experiment groups must not expose record-deletion actions for the active runtime group',
);
assert.match(
  reportDialog,
  /已完成实验组默认纳入报告[\s\S]*有实验记录或过程数据的未完成组可主动勾选[\s\S]*空白新组不纳入报告[\s\S]*groups\.filter\(isHeatCapacityGroupReportable\)[\s\S]*disabled=\{selected\.size === 0\}/,
  'report selection should include reportable incomplete groups while excluding blank drafts',
);
assert.match(
  parameterPanelModel,
  /当前实验组已开始，参数方案已锁定[\s\S]*完成本组后可为下一组切换真实模拟或理想参数/,
  'scheme-lock guidance should explain the new multi-group continuation path',
);
assert.doesNotMatch(
  parameterPanelModel,
  /本轮实验|只能在新建的自由实验文件中切换/,
  'parameter guidance must not retain the obsolete single-batch restriction',
);

console.log('heatCapacityExperimentGroupUi tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchPanelContent \} from '\.\/WorkbenchPanelContent\.tsx';/);
