const fs = require('node:fs');
const path = require('node:path');
const {
  WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES,
  WORKBENCH_REQUIRED_CHUNK_NAMES,
} = require('../build/workbenchBuildPolicy.cjs');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('Build output is missing: dist/assets.');
  process.exit(1);
}

const javascriptAssets = fs.readdirSync(assetsDir)
  .filter((fileName) => fileName.endsWith('.js'))
  .map((fileName) => ({
    fileName,
    size: fs.statSync(path.join(assetsDir, fileName)).size,
  }));

const errors = [];
for (const chunkName of WORKBENCH_REQUIRED_CHUNK_NAMES) {
  if (!javascriptAssets.some(({ fileName }) => fileName.startsWith(`${chunkName}-`))) {
    errors.push(`Required JavaScript chunk is missing: ${chunkName}`);
  }
}
for (const { fileName, size } of javascriptAssets) {
  if (size > WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES) {
    errors.push(`${fileName} is ${size} bytes; limit is ${WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES} bytes.`);
  }
}

if (errors.length > 0) {
  console.error(`Build output policy failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`Build output policy passed for ${javascriptAssets.length} JavaScript chunks.`);
