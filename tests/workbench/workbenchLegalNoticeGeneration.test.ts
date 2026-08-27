import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const generatorSource = readFileSync(new URL('../../scripts/generateLegalNotices.cjs', import.meta.url), 'utf8');
const exporterInventory = JSON.parse(
  readFileSync(new URL('../../resources/exporter/hsl-exporter.legal.json', import.meta.url), 'utf8'),
) as {
  archiveFingerprint: string;
  pythonRuntime: { name: string; licenseFile: { text: string; sha256: string } };
  frozenDistributions: Array<{ name: string; licenseFiles: Array<{ text: string }> }>;
  buildComponents: Array<{ name: string; licenseFiles: Array<{ text: string }> }>;
  runtimeLibraries: Array<{
    name: string;
    component: string;
    licenseEvidence: { owner: string; licenseFileName: string; sha256: string };
  }>;
};

const legalFiles = [
  'exporter-licenses.html',
  'audio-materials.html',
  'third-party-dependencies.html',
  'third-party-license-texts.html',
  'third-party-summary.json',
  'LICENSE.electron.txt',
  'font-licenses.txt',
] as const;

const readLegalFiles = () => Object.fromEntries(legalFiles.map((fileName) => [
  fileName,
  readFileSync(new URL(`../../public/legal/${fileName}`, import.meta.url), 'utf8'),
]));

const before = readLegalFiles();
const exporterLicensesHtml = before['exporter-licenses.html'];
const result = spawnSync(process.execPath, ['scripts/generateLegalNotices.cjs', '--check'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

assert.equal(result.status, 0, result.stderr || 'legal notice check should succeed without writing files');
assert.deepEqual(
  readLegalFiles(),
  before,
  'legal notice checks must remain read-only',
);
for (const fileName of legalFiles.filter((candidate) => candidate.endsWith('.html'))) {
  assert.doesNotMatch(before[fileName], /[ \t]+$/m, `${fileName} should not contain generated trailing whitespace`);
}

const summary = JSON.parse(before['third-party-summary.json']) as {
  generatedAt?: string;
  contentFingerprint?: string;
  licenseCounts?: Record<string, number>;
};
assert.equal(Number.isNaN(Date.parse(summary.generatedAt ?? '')), false);
assert.match(summary.contentFingerprint ?? '', /^[a-f0-9]{64}$/);
assert.equal(summary.licenseCounts?.UNKNOWN ?? 0, 0, 'published dependency notices must not contain unclassified licenses');
assert.doesNotMatch(before['third-party-dependencies.html'], />UNKNOWN</, 'the dependency table must not publish UNKNOWN licenses');
assert.match(generatorSource, /const dependencyManifest = Object\.fromEntries/);
assert.match(generatorSource, /appendFile\(audioManifestPath\)/);
assert.match(generatorSource, /appendFile\(pistonModelProvenancePath\)/, 'piston model provenance should invalidate stale legal output');
assert.match(generatorSource, /appendFile\(sharedBenchProvenancePath\)/, 'shared bench provenance should invalidate stale legal output');
assert.match(generatorSource, /appendFile\(exporterLegalInventoryPath\)/, 'actual exporter inventory should invalidate stale legal output');
assert.match(before['third-party-dependencies.html'], /Packaged 3D model assets/, 'packaged legal materials should cover project-provided 3D assets');
assert.match(before['third-party-dependencies.html'], /A72C2609713B2CD7B2624A5343CA8073A547153C2ECD14CC18E83D2AD007CDBC/, 'packaged legal materials should pin the approved piston model digest');
assert.match(generatorSource, /assertExporterLegalInventory/, 'legal generation should reject incomplete exporter inventory');
assert.match(
  generatorSource,
  /webgl-constants@1\.1\.1[\s\S]*licenseFileName: 'LICENSE'[\s\S]*sha256: '[a-f0-9]{64}'/,
  'lockfile license gaps should use an exact-version override bound to hashed installed evidence',
);
assert.match(generatorSource, /Unclassified package licenses/, 'legal generation should fail closed on any remaining UNKNOWN license');
assert.doesNotMatch(generatorSource, /appendFile\(packageJsonPath\)/, 'unrelated package scripts should not invalidate generated legal notices');

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const renderNormalizedLicenseText = (value: string) => escapeHtml(value).replace(/[ \t]+$/gm, '');

assert.ok(exporterLicensesHtml.includes(exporterInventory.archiveFingerprint), 'exporter legal page should identify the exact frozen archive');
assert.ok(exporterLicensesHtml.includes(exporterInventory.pythonRuntime.name), 'exporter legal page should identify CPython');
assert.doesNotMatch(exporterLicensesHtml, /may also include/, 'exporter legal page should not describe a speculative package set');
for (const record of [...exporterInventory.frozenDistributions, ...exporterInventory.buildComponents]) {
  assert.ok(exporterLicensesHtml.includes(`<code>${escapeHtml(record.name)}</code>`), `exporter legal page should list actual component ${record.name}`);
  for (const licenseFile of record.licenseFiles) {
    assert.ok(
      exporterLicensesHtml.includes(`<pre>${renderNormalizedLicenseText(licenseFile.text)}</pre>`),
      `exporter legal page should embed the complete ${record.name} license text`,
    );
  }
}
assert.ok(
  exporterLicensesHtml.includes(`<pre>${renderNormalizedLicenseText(exporterInventory.pythonRuntime.licenseFile.text)}</pre>`),
  'exporter legal page should embed the complete CPython and Windows binary notice text',
);
for (const runtimeComponent of ['openssl', 'libffi', 'microsoft-runtime', 'python-runtime']) {
  assert.ok(
    exporterInventory.runtimeLibraries.some((record) => record.component === runtimeComponent),
    `exporter inventory should classify ${runtimeComponent}`,
  );
}
for (const runtimeLibrary of exporterInventory.runtimeLibraries) {
  assert.equal(runtimeLibrary.licenseEvidence.sha256, exporterInventory.pythonRuntime.licenseFile.sha256);
  assert.ok(
    exporterLicensesHtml.includes(runtimeLibrary.licenseEvidence.sha256),
    `exporter legal page should show the hashed evidence bound to ${runtimeLibrary.name}`,
  );
}
assert.match(exporterLicensesHtml, /OpenSSL runtime covered by the CPython Windows binary notices/);
assert.match(exporterLicensesHtml, /libffi runtime covered by the CPython Windows binary notices/);

console.log('workbenchLegalNoticeGeneration tests passed');
