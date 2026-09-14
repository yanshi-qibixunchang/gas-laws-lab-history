import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Exercise ReportLab's actual pagination, without requiring a PDF parser.
// Capturing afterFlowable observes the page chosen by the real layout engine.
const result = spawnSync('python', ['-c', `
import sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / 'tools' / 'exporter'))
from hsl_exporter import _import_dependencies, build_story

deps = _import_dependencies()
BaseDocument = deps['SimpleDocTemplate']
pages = []
class ObservedDocument(BaseDocument):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'getPlainText'):
            pages.append((self.page, flowable.getPlainText()))

deps['SimpleDocTemplate'] = ObservedDocument
with tempfile.TemporaryDirectory(prefix='hsl-ideal-pagination-') as temporary:
    root = Path(temporary)
    figure = deps['plt'].figure(figsize=(8, 5.2))
    axes = figure.add_subplot()
    axes.plot([0.6, 0.8, 1, 1.2, 1.4], [0.04, 0.06, 0.08, 0.10, 0.12])
    image = root / 'verification.png'
    figure.savefig(image, dpi=150)
    deps['plt'].close(figure)
    for relation in ['pt', 'pn']:
        data = {
            'relation': relation, 'fileName': 'Ideal Gas Verification',
            'summary': {'runState': 'finished', 'finalTime': 15, 'temperature': 1.026,
                'pressure': 0.0828, 'meanSpeed': 1.616, 'rmsSpeed': 1.754},
            'verification': {'rSquared': 0.99892, 'slopeError': 1.06, 'verdictState': 'verified'},
            'params': dict(N=128, L=12, r=0.16, m=1, k=1, dt=0.01, nu=0.8,
                targetTemperature=1, equilibriumTime=4, statsDuration=12),
        }
        pages.clear()
        build_story(data, [{'png': image}], [], root, deps)
        assert (root / 'report.pdf').read_bytes().startswith(b'%PDF')
        assert max(page for page, text in pages) == 1, (relation, pages)
        assert (1, 'Conclusion') in pages
        assert any(page == 1 and 'current automated verdict is verified' in text for page, text in pages)
print('P-T and P-N conclusions remain with the figure on one A4 page.')
`], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8', timeout: 60_000, windowsHide: true });
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log(result.stdout.trim());
