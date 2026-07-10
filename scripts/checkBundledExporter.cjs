const path = require('node:path');
const {
  assertBundledExporterCurrent,
} = require('../build/exporterBundlePolicy.cjs');

const rootDir = path.resolve(__dirname, '..');

try {
  const details = assertBundledExporterCurrent(rootDir);
  console.log(`Bundled exporter policy passed for v${details.exporterVersion}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
