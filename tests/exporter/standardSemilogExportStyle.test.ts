import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname.slice(1));
const exporter = readFileSync(join(root, 'tools', 'exporter', 'hsl_exporter.py'), 'utf8');

assert.match(
  exporter,
  /if key == "energyLog":[\s\S]*selected_indices[\s\S]*label="Selected bins"[\s\S]*label="Excluded bins"[\s\S]*ax\.axvline[\s\S]*label="Fit window"[\s\S]*else:[\s\S]*ax\.bar\(/,
  'formal semilog energy exports should distinguish selected/excluded points and mark the fit window while ordinary distributions remain histograms',
);

assert.match(
  exporter,
  /if key == "energyLog":\s*[\r\n]+\s*add_metadata_band\(fig, build_semilog_metadata\(series, params\)\)\s*[\r\n]+\s*add_legend\(ax, loc="upper right"\)\s*[\r\n]+\s*else:\s*[\r\n]+\s*add_metadata_band\(fig, build_distribution_metadata\(key, series, params\)\)\s*[\r\n]+\s*add_legend\(ax, loc="upper right"\)/,
  'formal distribution exports should use a two-line out-of-plot metadata band and keep boxed legends inside clear plot areas',
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
  /add_metadata_band\(fig, build_history_metadata\(field, rows, values, params\)\)[\s\S]*add_legend\(ax, loc="best"\)/,
  'formal history exports should also move readouts to the out-of-plot metadata band and let the boxed legend choose a clear area',
);

console.log('standardSemilogExportStyle tests passed');
