import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const generatorSource = readFileSync(new URL('../../scripts/generateLegalNotices.cjs', import.meta.url), 'utf8');

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
};
assert.equal(Number.isNaN(Date.parse(summary.generatedAt ?? '')), false);
assert.match(summary.contentFingerprint ?? '', /^[a-f0-9]{64}$/);
assert.match(generatorSource, /const dependencyManifest = Object\.fromEntries/);
assert.match(generatorSource, /appendFile\(audioManifestPath\)/);
assert.doesNotMatch(generatorSource, /appendFile\(packageJsonPath\)/, 'unrelated package scripts should not invalidate generated legal notices');

console.log('workbenchLegalNoticeGeneration tests passed');
