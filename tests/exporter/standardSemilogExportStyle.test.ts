import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname.slice(1));
const exporter = readFileSync(join(root, 'tools', 'exporter', 'hsl_exporter.py'), 'utf8');

assert.match(
  exporter,
  /if key == "energyLog":[\s\S]*selected_indices[\s\S]*label="选中分箱"[\s\S]*label="未选中分箱"[\s\S]*ax\.axvline[\s\S]*label="拟合区间"[\s\S]*else:[\s\S]*ax\.bar\(/,
  'formal semilog energy exports should distinguish selected/excluded points and mark the fit window while ordinary distributions remain histograms',
);

assert.doesNotMatch(
  exporter,
  /add_metadata_band\(fig, build_(?:semilog|distribution|history)_metadata/,
  'report plots should keep metadata in report text, outside the exported figure',
);

assert.doesNotMatch(
  exporter,
  /label="Measured log (?:bins|points)"/,
  'formal semilog energy exports should not collapse all measured log data into one unlabeled point class',
);

assert.doesNotMatch(
  exporter,
  /if key == "energyLog":\s*[\r\n]+\s*add_readout_panel/,
  'formal semilog energy exports should not start their layout branch with an in-plot readout panel',
);

assert.doesNotMatch(
  exporter,
  /add_horizontal_legend/,
  'formal exports should not use an unboxed legend outside the plot area',
);

assert.match(
  exporter,
  /def plot_history[\s\S]*add_legend\(ax, loc="best"\)/,
  'history plots should use the shared boxed legend helper',
);

console.log('standardSemilogExportStyle tests passed');
