import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
const result = spawnSync('python', ['-c', String.raw`
import json, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path('tools/exporter').resolve()))
import hsl_exporter as exporter
from professional_graph_style import prepare_report_figure
D = exporter._import_dependencies()
styles = exporter.report_styles(D, exporter.register_report_fonts(D))
for name, size in {'title':22,'chapter':18,'group':15,'section':13,'body':11,'table_header':10,'table_body':9,'table_caption':12,'figure_caption':12}.items():
    assert styles[name].fontSize == size, name
assert styles['table_numeric'].alignment == D['TA_CENTER']
assert styles['table_body'].alignment == D['TA_LEFT']
assert exporter.report_centered_columns(['参数','数值'], [['长说明',2],['另一个说明',3]]) == {1}
standard=json.loads(Path('tests/exporter/fixtures/standard-report.json').read_text(encoding='utf-8'))['data']
ideal=json.loads(Path('tests/exporter/fixtures/ideal-pv-report.json').read_text(encoding='utf-8'))['data']
heat=json.loads(Path('tests/exporter/fixtures/heat-capacity-export-payload.json').read_text(encoding='utf-8'))['data']
piston={'language':'zh-CN','linearFitResult':{'points':[{'periodSquaredS2':.001,'heightM':.06},{'periodSquaredS2':.0014,'heightM':.08}], 'slopeMPerS2':50,'interceptM':.01,'rSquared':1}}
figures=[]
original=exporter.save_professional_figure
def inspect(fig, path):
    prepare_report_figure(fig)
    fig.canvas.draw()
    assert not fig.texts, 'no in-image title, status, or metadata band'
    for ax in fig.axes:
        if not ax.axison: continue
        assert all(s.get_visible() for s in ax.spines.values())
        for axis in (ax.xaxis,ax.yaxis):
            assert all(t._tickdir == 'in' for t in axis.get_major_ticks())
            assert not any(t.gridline.get_visible() for t in axis.get_minor_ticks())
        assert ax.xaxis.label.get_fontsize()==10
        assert ax.yaxis.label.get_fontsize()==10
        legend=ax.get_legend()
        if legend:
            assert legend.get_frame().get_alpha()==1
            assert legend.get_window_extent().y0 >= ax.get_window_extent().y1
    figures.append(fig)
    return path
exporter.save_professional_figure=inspect
with tempfile.TemporaryDirectory(prefix='hsl-report-style-') as tmp:
    out=Path(tmp)
    exporter.plot_distribution(standard,out,D,'speed','speed','unused title','unused caption')
    exporter.plot_ideal_verification(ideal,out,D)
    exporter.plot_heat_capacity_lollipop(heat,heat['groups'][0],out,D)
    exporter.plot_piston_oscillation_fit(piston,out,D)
assert len(figures)==4
assert list(figures[3].axes[0].collections[0].get_offsets()[:,0]) == [.001,.0014]
D['plt'].close('all')
print('Unified report typography and four chart families verified')
`], { cwd: root, encoding: 'utf8', timeout: 120_000, windowsHide: true });
assert.equal(result.status, 0, result.stderr || result.stdout);
console.log(result.stdout.trim());
