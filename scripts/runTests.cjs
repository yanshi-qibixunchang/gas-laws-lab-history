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

const normalizeSelector = (value) => {
  const normalized = value.replace(/\\/g, '/');
  if (path.isAbsolute(value)) {
    return path.relative(root, path.resolve(value)).replace(/\\/g, '/');
  }
  return normalized.replace(/^\.\//, '');
};

const requestedTests = process.argv.slice(2).map(normalizeSelector);
const allTests = collectTests(testsRoot).sort((a, b) => a.localeCompare(b));
const relativeTestPaths = new Map(allTests.map((testPath) => [
  testPath,
  path.relative(root, testPath).replace(/\\/g, '/'),
]));
const matchesSelector = (relativePath, selector) => {
  const isExplicitTestPath = selector.endsWith('.test.ts') && selector.includes('/');
  if (isExplicitTestPath) return relativePath === selector;
  if (selector.endsWith('.test.ts')) {
    return relativePath === selector || relativePath.endsWith(`/${selector}`);
  }
  return relativePath.includes(selector);
};
const selectorMatches = requestedTests.map((selector) => ({
  selector,
  tests: allTests.filter((testPath) => matchesSelector(relativeTestPaths.get(testPath), selector)),
}));
const missingSelectors = selectorMatches
  .filter((entry) => entry.tests.length === 0)
  .map((entry) => entry.selector);

if (missingSelectors.length > 0) {
  console.error(`No test files matched selector(s): ${missingSelectors.join(', ')}`);
  process.exit(1);
}

const tests = requestedTests.length === 0
  ? allTests
  : allTests.filter((testPath) => selectorMatches.some((entry) => entry.tests.includes(testPath)));

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
