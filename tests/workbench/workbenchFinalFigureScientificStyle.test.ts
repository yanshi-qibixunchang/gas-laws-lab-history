const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchStandardResultsWindowSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStandardResultsWindow.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStandardFiguresPanel.tsx', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /renderFinalChartFrame\(\s*figureId,\s*'bars'/,
  'standard result histogram previews should render with the scientific SVG chart shell',
);

assert.match(
  source,
  /renderFinalChartFrame\(\s*figureId,\s*'line'/,
  'standard result history previews should render with the scientific SVG chart shell',
);

assert.doesNotMatch(
  source,
  /<div className="studio-final-bars">[\s\S]*?<span/,
  'standard result histogram previews should not use the old div/span preview bars',
);

assert.doesNotMatch(
  source,
  /<div className="studio-final-line">[\s\S]*?<span/,
  'standard result history previews should not use the old div/span preview columns',
);

assert.match(
  source,
  /<circle[\s\S]*className="[^"]*studio-final-chart-point[^"]*"/,
  'standard semilog preview should keep measured data as points',
);

assert.match(
  source,
  /finalChartData\.energy[\s\S]*probability > 0[\s\S]*studio-final-chart-excluded-point[\s\S]*studio-final-chart-selected-point/,
  'standard semilog preview should show all calculable points and distinguish selected versus excluded bins',
);

assert.match(
  source,
  /studio-final-chart-selection-boundary[\s\S]*studio-final-chart-boundary-label[\s\S]*renderFinalChartLegend/,
  'standard semilog preview should annotate the selected energy window with boundary lines and a legend',
);

assert.match(
  source,
  /const getFinalChartAxisCopy[\s\S]*xLabel[\s\S]*yLabel[\s\S]*studio-final-chart-axis-label/,
  'standard result previews should render localized x and y axis labels inside the shared SVG shell',
);

assert.match(
  source,
  /const renderFinalChartLegend[\s\S]*studio-final-chart-legend-panel[\s\S]*studio-final-chart-legend-text/,
  'standard result previews should use a reusable boxed SVG legend with text labels',
);

assert.match(
  source,
  /const getFinalChartLegendWidth[\s\S]*Array\.from\(label\)[\s\S]*width \?\? getFinalChartLegendWidth\(items\)/,
  'standard result chart legends should calculate a compact panel width from their labels instead of leaving fixed whitespace',
);

assert.doesNotMatch(
  source,
  /renderFinalChartLegend\([\s\S]*,\s*(?:'upper-right'|historyLegendPosition),\s*3[01]\)/,
  'standard result chart legend calls should not force the old wide 30-31 unit panels',
);

assert.match(
  source,
  /renderFinalChartLegend\(\[[\s\S]*workbenchCopy\.results\.measuredBars[\s\S]*workbenchCopy\.results\.theoryLegend/,
  'standard distribution previews should explain measured bars and theory line in a legend',
);

assert.match(
  source,
  /renderFinalChartLegend\(\[[\s\S]*figureId === 'temperature-error'[\s\S]*historyLegendCopy\.temperatureErrorTrace[\s\S]*historyLegendCopy\.totalEnergyTrace/,
  'standard history previews should explain the plotted diagnostic trace in a legend',
);

assert.match(
  source,
  /viewBox=\{`0 0 \$\{FINAL_CHART_VIEWBOX_WIDTH\} \$\{FINAL_CHART_VIEWBOX_HEIGHT\}`\}/,
  'standard result previews should use shared compressed chart dimensions',
);

assert.match(
  styles,
  /\.studio-final-chart[\s\S]*aspect-ratio: 25 \/ 16[\s\S]*\.studio-final-chart-axis[\s\S]*\.studio-final-chart-tick[\s\S]*\.studio-final-chart-bar[\s\S]*\.studio-final-chart-point/,
  'standard result previews should share scientific chart frame, axis, tick, bar, and point styles',
);

assert.match(
  styles,
  /\.studio-final-chart-axis-label[\s\S]*\.studio-final-chart-legend-panel[\s\S]*fill:\s*#ffffff[\s\S]*\.studio-final-chart-legend-text/,
  'standard result previews should style axis labels and give legends a solid white panel above the grid',
);

assert.match(
  styles,
  /\.studio-theme-light \.studio-final-chart[\s\S]*\.studio-theme-light \.studio-final-chart-point/,
  'light theme should cover the scientific result chart styles',
);

assert.match(workbenchStandardResultsWindowSource, /from '\.\/WorkbenchStandardFiguresPanel\.tsx'/);
assert.match(workbenchStandardResultsWindowSource, /<WorkbenchStandardFiguresPanel/);
assert.doesNotMatch(workbenchSource, /const renderFinalFigurePreview =/);

console.log('workbenchFinalFigureScientificStyle tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchStandardResultsWindow \} from '\.\/WorkbenchStandardResultsWindow\.tsx';/);
