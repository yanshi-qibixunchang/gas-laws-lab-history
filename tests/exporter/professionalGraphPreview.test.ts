import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname.slice(1));
const outputDir = mkdtempSync(join(tmpdir(), 'hsl-professional-graph-preview-'));
const previewScript = join(root, 'tools', 'exporter', 'preview_professional_graphs.py');
const previewStyleSource = readFileSync(join(root, 'tools', 'exporter', 'professional_graph_style.py'), 'utf8');
const formalExporter = readFileSync(join(root, 'tools', 'exporter', 'hsl_exporter.py'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

try {
  assert.match(
    previewStyleSource,
    /PROFESSIONAL_FONT_FAMILY = \["Times New Roman", "Times", "DejaVu Serif", "serif"\]/,
    'professional graph preview style should use a Times-family serif stack',
  );

  assert.match(
    previewStyleSource,
    /ENGINEERING_EXPORT_STYLE = \{[\s\S]*"data_line_width": 1\.35[\s\S]*"fit_line_width": 1\.05[\s\S]*"grid_major_width": 0\.55[\s\S]*"grid_minor_width": 0\.35/,
    'professional graph preview style should use thinner engineering export lines instead of dashboard-like strokes',
  );

  assert.doesNotMatch(
    previewStyleSource,
    /rounding_size|round,pad|device_strip/,
    'professional graph preview style should avoid dashboard-like rounded panels and status strips',
  );

  assert.match(
    previewStyleSource,
    /ax\.legend\(loc=loc, borderpad=0\.55, handlelength=2\.0, fancybox=False\)/,
    'professional graph preview legends should use square engineering-style frames',
  );

  assert.match(
    previewStyleSource,
    /ax\.tick_params\(axis="both", which="major", direction="in", length=3\.2, width=0\.6\)/,
    'professional graph preview major ticks should point inward like engineering export plots',
  );

  assert.match(
    previewStyleSource,
    /ax\.tick_params\(axis="both", which="minor", direction="in", length=1\.8, width=0\.4\)/,
    'professional graph preview minor ticks should point inward and stay shorter than major ticks',
  );

  const result = spawnSync('python', [previewScript, '--out', outputDir], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `professional graph preview script should run successfully\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );

  const expectedFiles = [
    'ideal-pt-verification-preview.png',
    'standard-speed-distribution-preview.png',
    'standard-temperature-error-preview.png',
  ];

  for (const filename of expectedFiles) {
    const filePath = join(outputDir, filename);
    assert.ok(existsSync(filePath), `${filename} should be generated`);
    assert.ok(statSync(filePath).size > 10_000, `${filename} should not be blank`);
    assert.deepEqual(
      Array.from(readFileSync(filePath).subarray(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      `${filename} should be a valid PNG`,
    );
  }

  assert.match(
    formalExporter,
    /from professional_graph_style import \([\s\S]*create_professional_figure[\s\S]*save_professional_figure[\s\S]*style_axes/,
    'formal Python exporter should reuse the accepted professional graph style module',
  );

  assert.match(
    formalExporter,
    /save_professional_figure\(fig, outputs\["png"\]\)/,
    'formal Python exporter should save generated figures through the accepted professional graph output helper',
  );

assert.ok(
  packageJson.build.extraResources.some((resource: { from?: string; to?: string }) => (
    resource.from === 'tools/exporter/professional_graph_style.py'
    && resource.to === 'exporter/professional_graph_style.py'
  )),
  'desktop package resources should include professional_graph_style.py next to hsl_exporter.py',
);

assert.match(
  formalExporter,
  /figure_width\s*=\s*160\s*\*\s*mm/,
  'formal PDF reports should render professional graphs as readable single-column figures',
);

assert.doesNotMatch(
  formalExporter,
  /pair_flowables\(figure_images,\s*table_width,\s*gap_width\)/,
  'formal PDF reports should not shrink professional graphs into the old two-column thumbnail layout',
);

assert.match(
  formalExporter,
  /if params\.get\("targetTemperature"\) is not None:[\s\S]*\("Target T", format_graph_metric\(params\.get\("targetTemperature"\), 4\)\)/,
  'formal graph readouts should omit the target temperature row when the payload does not provide it',
);

console.log('professionalGraphPreview tests passed');
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
