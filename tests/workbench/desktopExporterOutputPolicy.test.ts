import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateExporterOutputManifest } = require('../../electron/exporterOutputPolicy.cjs') as {
  validateExporterOutputManifest: (options: {
    fs: typeof fs;
    outDir: string;
    parsed: unknown;
  }) => Promise<{ files: string[]; metadataPath: string | null; outDir: string }>;
};
const mainSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const outputPolicySource = readFileSync(new URL('../../electron/exporterOutputPolicy.cjs', import.meta.url), 'utf8');

assert.match(
  outputPolicySource,
  /const MAX_EXPORTER_OUTPUT_FILES = 4096;/,
  'multi-group experiment packages should allow the bounded figure count produced by many retained groups',
);

assert.doesNotMatch(
  mainSource,
  /path\.join\(os\.tmpdir\(\), 'heat-capacity-ratio-lab-export'\)/,
  'desktop exports must not share a fixed temporary input path',
);
assert.match(
  mainSource,
  /fs\.mkdtemp\(path\.join\(app\.getPath\('temp'\), 'heat-capacity-ratio-lab-export-'\)\)[\s\S]*finally \{\s*await fs\.rm\(tempDir, \{ recursive: true, force: true \}\);/,
  'every exporter input should live in a unique temporary directory that is removed on all outcomes',
);
assert.match(
  mainSource,
  /validateExporterOutputManifest\(\{ fs, outDir, parsed \}\)/,
  'Electron should validate child-process output paths before copying or returning them',
);
assert.match(
  mainSource,
  /const outDir = await fs\.mkdtemp\(path\.join\([\s\S]*selectedRoot,[\s\S]*getExperimentFolderName/,
  'each persistent export should receive an atomically unique output directory',
);
assert.match(
  mainSource,
  /if \(payload\.kind === 'json' && !selectedExporterRuntime\)[\s\S]*resolveExporterRuntime\(\)[\s\S]*const outDir = await fs\.mkdtemp/,
  'a missing exporter runtime must fail before creating a persistent experiment folder',
);
assert.match(
  mainSource,
  /let retainExportDirectory = false;[\s\S]*retainExportDirectory = true;[\s\S]*finally \{[\s\S]*if \(!retainExportDirectory\) \{\s*await fs\.rm\(outDir, \{ recursive: true, force: true \}\);/,
  'failed or unsafe exports must remove their empty or partial persistent directory',
);
assert.match(
  mainSource,
  /const replaceFileAtomically = async \(source, target\) => \{[\s\S]*randomUUID\(\)[\s\S]*fs\.copyFile\(source, temporaryTarget, fsSync\.constants\.COPYFILE_EXCL\)[\s\S]*fs\.rename\(temporaryTarget, target\)[\s\S]*replaceFileAtomically\(reportFiles\[0\], target\)/,
  'report replacement should stage a unique same-directory file and publish it with one rename',
);
assert.match(
  mainSource,
  /const resolveExporterRuntime = async \(\) => \{\s*if \(app\.isPackaged\) \{\s*const packagedBundledResult = await resolveBundledExporterRuntime\(\);[\s\S]*\}\s*\n\s*const systemRuntime = await getSystemRuntime\(\);/,
  'packaged applications must resolve the bundled frozen exporter without probing system Python first',
);
assert.match(
  mainSource,
  /require\('\.\/exporterProcessRunner\.cjs'\)/,
  'desktop exports should use the bounded child-process runner',
);

const directory = await fs.mkdtemp(join(tmpdir(), 'hsl-exporter-output-policy-'));
try {
  const outDir = join(directory, 'out');
  await fs.mkdir(join(outDir, 'figures'), { recursive: true });
  const reportPath = join(outDir, 'report.pdf');
  const figurePath = join(outDir, 'figures', 'plot.png');
  const metadataPath = join(outDir, 'metadata.json');
  const outsidePath = join(directory, 'outside.pdf');
  await Promise.all([
    fs.writeFile(reportPath, 'report'),
    fs.writeFile(figurePath, 'figure'),
    fs.writeFile(metadataPath, '{}'),
    fs.writeFile(outsidePath, 'outside'),
  ]);

  const valid = await validateExporterOutputManifest({
    fs,
    outDir,
    parsed: {
      status: 'ok',
      out: outDir,
      files: [reportPath, figurePath],
      metadata: metadataPath,
    },
  });
  assert.equal(valid.outDir, await fs.realpath(outDir));
  assert.deepEqual(valid.files, [await fs.realpath(reportPath), await fs.realpath(figurePath)]);
  assert.equal(valid.metadataPath, await fs.realpath(metadataPath));

  await assert.rejects(
    validateExporterOutputManifest({
      fs,
      outDir,
      parsed: { status: 'ok', out: outDir, files: [outsidePath], metadata: null },
    }),
    /escapes the requested export directory/,
    'an exporter process must not make Electron copy or disclose an arbitrary outside file',
  );
  await assert.rejects(
    validateExporterOutputManifest({
      fs,
      outDir,
      parsed: { status: 'ok', out: outDir, files: ['report.pdf'], metadata: null },
    }),
    /must be absolute/,
    'relative child-process paths must not be interpreted against Electron cwd',
  );
  await assert.rejects(
    validateExporterOutputManifest({
      fs,
      outDir,
      parsed: { status: 'ok', out: outDir, files: [reportPath, reportPath], metadata: null },
    }),
    /duplicate output file/,
  );
  await assert.rejects(
    validateExporterOutputManifest({
      fs,
      outDir,
      parsed: { status: 'ok', out: directory, files: [reportPath], metadata: null },
    }),
    /output root does not match/,
  );
  await assert.rejects(
    validateExporterOutputManifest({
      fs,
      outDir,
      parsed: { status: 'ok', out: outDir, files: [], metadata: null },
    }),
    /did not return any output files/,
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}

console.log('desktopExporterOutputPolicy tests passed');
