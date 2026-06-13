import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const electronMain = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const exporterSource = readFileSync(new URL('../../tools/exporter/hsl_exporter.py', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

assert.match(
  electronMain,
  /const getExporterFormatsForMode = \(mode\) => \{[\s\S]*case 'report':[\s\S]*return 'report';[\s\S]*case 'verificationFigure':[\s\S]*case 'figuresZip':[\s\S]*return 'figures';[\s\S]*case 'completeBundle':[\s\S]*return 'report,figures,csv,metadata';/,
  'desktop exporter should map each UI export mode to a distinct Python --formats value',
);

assert.match(
  electronMain,
  /if \(payload\.kind === 'json' && options\?\.mode === 'report'\) \{[\s\S]*dialog\.showSaveDialog[\s\S]*--formats'[\s\S]*'report'[\s\S]*fs\.copyFile\(reportFile, target\)/,
  'Report PDF export should use a save-file dialog and copy only the generated report PDF to the selected path',
);

assert.match(
  electronMain,
  /const result = await runExporter\(selectedExporterRuntime, \['--input', inputPath, '--out', outDir, '--formats', getExporterFormatsForMode\(options\?\.mode\)\]\);/,
  'folder-based exports should pass the requested format filter to the Python exporter',
);

assert.match(
  exporterSource,
  /def parse_export_formats\(value: str \| None\) -> set\[str\]:[\s\S]*"report"[\s\S]*"figures"[\s\S]*"csv"[\s\S]*"metadata"/,
  'Python exporter should parse report, figures, csv, and metadata format filters',
);

assert.match(
  exporterSource,
  /def save_figure\(fig: Any, figures_dir: Path, stem: str, caption: str\) -> dict\[str, Path\]:[\s\S]*"png": figure_dir \/ f"\{stem\}\.png"[\s\S]*fig\.savefig\(outputs\["png"\]/,
  'figure exports should save PNG images without creating per-figure PDF files',
);

assert.match(
  exporterSource,
  /if include_figures:[\s\S]*figure_root = paths\["figures"\] if include_report or include_csv else paths\["root"\]/,
  'figures-only exports should write image subfolders directly inside the selected export folder',
);

assert.match(
  exporterSource,
  /if include_report:[\s\S]*outputs\.append\(build_story\(data, figure_outputs, csv_outputs, paths\["root"\], deps\)\)/,
  'report output should be generated only when the report format is requested',
);

assert.match(
  exporterSource,
  /if payload\.get\("mode"\) != "verificationFigure":[\s\S]*raw_pv = plot_ideal_raw_pv\(data, figure_root, deps\)/,
  'ideal verification-figure exports should not create the extra raw P-V figure file',
);

assert.match(
  exporterSource,
  /metadata = write_metadata\(out_dir, input_path, outputs\) if "metadata" in formats else None/,
  'metadata should only be written for complete bundle exports',
);

assert.match(
  workbenchSource,
  /defaultDirName: `\$\{activeFile\.name\} \$\{mode === 'completeBundle' \? workbenchCopy\.results\.exportAll : mode === 'figuresZip' \|\| mode === 'verificationFigure' \? workbenchCopy\.results\.exportFigures : 'Export'\}`/,
  'renderer should give folder exports mode-specific default folder names',
);

console.log('workbenchExporterModes tests passed');
