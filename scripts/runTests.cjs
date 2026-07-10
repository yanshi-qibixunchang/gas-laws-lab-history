const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const testsRoot = path.join(root, 'tests');

const collectTests = (dir, tests = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTests(fullPath, tests);
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      tests.push(fullPath);
    }
  }
  return tests;
};

const requestedTests = process.argv.slice(2).map((value) => value.replace(/\\/g, '/'));
const tests = collectTests(testsRoot)
  .sort((a, b) => a.localeCompare(b))
  .filter((testPath) => {
    if (requestedTests.length === 0) return true;
    const relativePath = path.relative(root, testPath).replace(/\\/g, '/');
    return requestedTests.some((requested) => (
      relativePath === requested ||
      relativePath.endsWith(requested) ||
      relativePath.includes(requested)
    ));
  });

if (tests.length === 0) {
  console.error(`No test files matched: ${requestedTests.join(', ')}`);
  process.exit(1);
}

for (const testPath of tests) {
  const relativePath = path.relative(root, testPath);
  console.log(`\n> node ${relativePath}`);
  const result = spawnSync(process.execPath, [testPath], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\n${tests.length} test files passed.`);
