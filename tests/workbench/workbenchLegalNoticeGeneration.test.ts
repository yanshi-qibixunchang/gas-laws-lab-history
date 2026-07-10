import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const legalFiles = [
  'exporter-licenses.html',
  'third-party-dependencies.html',
  'third-party-license-texts.html',
  'third-party-summary.json',
] as const;

const readLegalFiles = () => Object.fromEntries(legalFiles.map((fileName) => [
  fileName,
  readFileSync(new URL(`../../public/legal/${fileName}`, import.meta.url), 'utf8'),
]));

const before = readLegalFiles();
const result = spawnSync(process.execPath, ['scripts/generateLegalNotices.cjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

assert.equal(result.status, 0, result.stderr || 'legal notice generation should succeed');
assert.deepEqual(
  readLegalFiles(),
  before,
  'legal notice generation should not rewrite tracked outputs when its inputs are unchanged',
);

const summary = JSON.parse(before['third-party-summary.json']) as {
  generatedAt?: string;
  contentFingerprint?: string;
};
assert.equal(Number.isNaN(Date.parse(summary.generatedAt ?? '')), false);
assert.match(summary.contentFingerprint ?? '', /^[a-f0-9]{64}$/);

console.log('workbenchLegalNoticeGeneration tests passed');
