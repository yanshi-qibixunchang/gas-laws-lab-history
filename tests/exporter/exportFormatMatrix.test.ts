import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the desktop format selector as well as the actual Python output.
const main = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const selector = main.slice(main.indexOf('const isIdealExportPayload'), main.indexOf('const getReportExportFilename'));
const selectFormats = vm.runInNewContext(`${selector}\ngetExporterFormatsForMode`);
for (const [mode, format] of [['report', 'report'], ['figuresZip', 'figures'], ['tablesCsv', 'csv']]) {
  assert.equal(selectFormats(mode, { data: {} }), format);
}
const result = spawnSync('python', ['-c', String.raw`
import csv, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / 'tools' / 'exporter'))
from hsl_exporter import export_json_payload
from matplotlib import pyplot as plt
cases = {
    'standard': Path('tests/exporter/fixtures/standard-report.json'),
    'ideal-pt': Path('tests/exporter/fixtures/ideal-pt-report.json'),
    'ideal-pv': Path('tests/exporter/fixtures/ideal-pv-report.json'),
    'ideal-pn': Path('tests/exporter/fixtures/ideal-pn-report.json'),
    'adiabatic': Path('tests/exporter/fixtures/heat-capacity-export-payload.json'),
}
with tempfile.TemporaryDirectory(prefix='hsl-export-matrix-') as directory:
    for name, fixture in cases.items():
        payload = json.loads(fixture.read_text(encoding='utf-8-sig'))
        for mode, format, extension in [('report','report','.pdf'), ('figuresZip','figures','.png'), ('tablesCsv','csv','.csv')]:
            payload['mode'] = mode
            out = Path(directory) / name / format
            executable = os.environ.get('HSL_EXPORTER_EXECUTABLE')
            if executable:
                source = Path(directory) / 'payload.json'
                source.write_text(json.dumps(payload), encoding='utf-8')
                result = subprocess.run([executable, '--input', str(source), '--out', str(out), '--formats', format], capture_output=True, text=True, encoding='utf-8', timeout=120)
                assert result.returncode == 0, result.stderr or result.stdout
                files = [Path(file) for file in json.loads(result.stdout)['files']]
            else:
                files = export_json_payload(payload, out, {format})
                assert not plt.get_fignums(), (name, format, 'export left figure canvases open')
            assert files, (name, format, 'empty output')
            assert all(file.is_file() and file.suffix == extension for file in files), (name, format, files)
            assert set(out.rglob('*' + extension)) == set(files), (name, 'unreported outputs')
            assert all(file.stat().st_size > 20 for file in files)
            if format == 'report':
                assert len(files) == 1 and files[0].read_bytes().startswith(b'%PDF')
                assert not list(out.rglob('*.png')) and not list(out.rglob('*.csv'))
            elif format == 'figures':
                assert all(file.read_bytes().startswith(b'\x89PNG') for file in files)
                if name == 'standard': assert len(files) == 5
                if name == 'ideal-pv': assert len(files) == 2
            else:
                assert all(len(list(csv.reader(file.open(encoding='utf-8-sig', newline='')))) > 1 for file in files)
                if name == 'standard':
                    assert len(files) == 6, files
                    for key, filename in [('speed','standard-speed-distribution.csv'), ('energy','standard-energy-distribution.csv'), ('energyLog','standard-energy-log.csv'), ('tempHistory','standard-history.csv')]:
                        table = list(csv.DictReader((out/'data'/filename).open(encoding='utf-8-sig', newline='')))
                        assert len(table) == len(payload['data']['finalChartData'][key])
                        first = payload['data']['finalChartData'][key][0]
                        for column, value in first.items():
                            if column in table[0] and isinstance(value, (int,float)):
                                assert float(table[0][column]) == value, (name, column)
            qa = os.environ.get('HSL_EXPORT_QA_DIR')
            if qa:
                target = Path(qa) / name / format
                assert not target.exists(), target
                shutil.copytree(out, target)
            print(name, format, len(files), 'files passed')
`], {cwd: new URL('../..', import.meta.url), encoding:'utf8', timeout:240_000, windowsHide:true});
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log(result.stdout.trim());
