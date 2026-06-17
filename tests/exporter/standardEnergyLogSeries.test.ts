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
      'from hsl_exporter import build_distribution_series',
      'rows = [',
      '  {"energy": 0.5, "logProb": -0.69, "theoreticalLog": -0.8},',
      '  {"energy": 1.0, "logProb": -1.1, "theoreticalLog": -1.2},',
      '  {"energy": 1.5, "logProb": -1.7, "theoreticalLog": -1.8},',
      ']',
      'print(json.dumps(build_distribution_series(rows, "energyLog")))',
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

const series = JSON.parse(result.stdout);
assert.deepEqual(series.centers, [0.5, 1, 1.5]);
assert.deepEqual(series.values, [-0.69, -1.1, -1.7]);
assert.deepEqual(series.theory, [-0.8, -1.2, -1.8]);
assert.equal(series.widths.length, 3);
assert.ok(series.widths.every((width: number) => width > 0), 'energyLog bar widths should be positive');

console.log('standardEnergyLogSeries tests passed');
