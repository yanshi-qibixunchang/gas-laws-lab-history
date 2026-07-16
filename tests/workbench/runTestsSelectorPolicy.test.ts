import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, '..', '..');
const runner = path.join(root, 'scripts', 'runTests.cjs');
const knownTest = 'tests/workbench/workbenchAspectFrame.test.ts';

const runSelectors = (...selectors: string[]) => spawnSync(
  process.execPath,
  [runner, ...selectors],
  {
    cwd: root,
    encoding: 'utf8',
  },
);

const exactResult = runSelectors(knownTest);
assert.equal(exactResult.status, 0, exactResult.stderr);
assert.match(exactResult.stdout, /workbenchAspectFrame tests passed/);

const basenameResult = runSelectors('workbenchAspectFrame.test.ts');
assert.equal(basenameResult.status, 0, basenameResult.stderr);
assert.match(basenameResult.stdout, /1 test files passed\./);

const missingSelector = 'tests/workbench/does-not-exist.test.ts';
const mixedResult = runSelectors(knownTest, missingSelector);
assert.notEqual(mixedResult.status, 0, 'an existing selector must not hide a missing selector');
assert.match(mixedResult.stderr, /No test files matched selector\(s\): tests\/workbench\/does-not-exist\.test\.ts/);
assert.doesNotMatch(
  mixedResult.stdout,
  /> node /,
  'the runner should validate every explicit selector before executing a partial test set',
);

console.log('runTestsSelectorPolicy tests passed');
