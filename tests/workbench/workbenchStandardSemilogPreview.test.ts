import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname.slice(1));
const prototypeSource = readFileSync(join(root, 'src', 'features', 'workbench', 'WorkbenchStandardFiguresPanel.tsx'), 'utf8');
const prototypeCss = readFileSync(join(root, 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.css'), 'utf8');

assert.match(
  prototypeSource,
  /if \(figureId === 'semilog-energy'\) \{[\s\S]*finalChartData\.energy[\s\S]*probability > 0/,
  'standard results preview should render semilog-energy from calculable final energy bins, not the ordinary energy histogram',
);

assert.match(
  prototypeSource,
  /renderFinalChartFrame\(\s*figureId,\s*'semilog'/,
  'standard results preview should render semilog-energy through the semilog chart frame',
);

assert.match(
  prototypeSource,
  /<polyline[\s\S]*className="[^"]*studio-final-semilog-theory[^"]*"[\s\S]*<circle[\s\S]*className="[^"]*studio-final-semilog-point[^"]*"/,
  'standard semilog preview should show a theory trend line plus measured log-density points',
);

assert.match(
  prototypeSource,
  /semilogLegendCopy[\s\S]*theory[\s\S]*renderFinalChartLegend\(\[[\s\S]*semilogLegendCopy\.selected[\s\S]*semilogLegendCopy\.excluded[\s\S]*semilogLegendCopy\.window[\s\S]*semilogLegendCopy\.theory/,
  'standard semilog preview should explain selected points, excluded points, fit window, and theory line in a boxed legend',
);

assert.match(
  prototypeSource,
  /const bins = figureId === 'speed-distribution'[\s\S]*: finalChartData\.energy;/,
  'ordinary speed and energy distribution previews should remain histogram-based',
);

assert.match(
  prototypeCss,
  /\.studio-final-chart[\s\S]*\.studio-final-chart-theory[\s\S]*\.studio-final-chart-point[\s\S]*\.studio-final-chart-legend-panel/,
  'standard semilog preview should have dedicated SVG styles and a white legend panel',
);

console.log('workbenchStandardSemilogPreview tests passed');
