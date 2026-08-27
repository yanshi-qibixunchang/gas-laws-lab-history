const fs = require('node:fs');
const path = require('node:path');
const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap');

const [inputArgument, outputArgument] = process.argv.slice(2);

if (!inputArgument || !outputArgument) {
  throw new Error('Usage: node scripts/regenerateBlockmap.cjs <installer> <blockmap>');
}

const installerPath = path.resolve(inputArgument);
const blockmapPath = path.resolve(outputArgument);

if (!fs.existsSync(installerPath) || !fs.statSync(installerPath).isFile()) {
  throw new Error(`Installer is unavailable: ${installerPath}`);
}

fs.mkdirSync(path.dirname(blockmapPath), { recursive: true });

buildBlockMap(installerPath, 'gzip', blockmapPath).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
