import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname.slice(1));

const result = spawnSync(
  'python',
  [
    '-c',
    [
      'import json, sys',
      'from pathlib import Path',
      'sys.path.insert(0, str(Path.cwd() / "tools" / "exporter"))',
      'from hsl_exporter import build_distribution_readout, build_distribution_series',
      'rows = [',
      '  {"energy": 0.5, "logProb": -0.69, "theoreticalLog": -0.8},',
      '  {"energy": 1.5, "logProb": -1.7, "theoreticalLog": -1.8},',
      ']',
      'energy_bins = [',
      '  {"binStart": 0.25, "binEnd": 0.75, "probability": 0.5, "theoretical": 0.45},',
      '  {"binStart": 0.75, "binEnd": 1.25, "probability": 0.0005, "theoretical": 1e-8},',
      '  {"binStart": 1.25, "binEnd": 1.75, "probability": 0.18, "theoretical": 0.15},',
      ']',
      'series = build_distribution_series(rows, "energyLog", energy_bins)',
      'readout = build_distribution_readout("energyLog", series, {})',
      'print(json.dumps({"series": series, "readout": readout}))',
    ].join('\n'),
  ],
  {
    cwd: root,
    encoding: 'utf8',
  },
);

assert.equal(
  result.status,
  0,
  `standard energyLog series should be readable by the Python exporter\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
);

const parsed = JSON.parse(result.stdout);
const series = parsed.series;
assert.deepEqual(series.centers, [0.5, 1, 1.5]);
assert.ok(Math.abs(series.values[0] - Math.log(0.5)) < 1e-12);
assert.ok(Math.abs(series.values[1] - Math.log(0.0005)) < 1e-12);
assert.ok(Math.abs(series.values[2] - Math.log(0.18)) < 1e-12);
assert.deepEqual(series.theoryCenters, [0.5, 1, 1.5]);
assert.ok(series.theory[1] < -12, 'semilog theory should keep tiny positive theoretical values instead of flattening at log(0.0001)');
assert.equal(series.widths.length, 3);
assert.ok(series.widths.every((width: number) => width > 0), 'energyLog bar widths should be positive');
assert.equal(series.totalBins, 3);
assert.equal(series.omittedBins, 0);
assert.deepEqual(series.selectedIndices, [0, 1, 2]);
assert.deepEqual(series.excludedIndices, []);
assert.deepEqual(parsed.readout.slice(0, 5), [
  ['Plotted bins', '3/3'],
  ['Selected bins', '3'],
  ['Excluded bins', '0'],
  ['Zero bins', '0'],
  ['Fit window', '0.5-1.5'],
]);

console.log('standardEnergyLogSeries tests passed');
