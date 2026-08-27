const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {
  computeOperations,
  OperationKind,
} = require('electron-updater/out/differentialDownloader/downloadPlanBuilder');

const readBlockMap = (filePath) => JSON.parse(zlib.gunzipSync(fs.readFileSync(filePath)));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const verifyDifferentialUpgrade = ({
  oldInstallerPath,
  oldBlockmapPath,
  newInstallerPath,
  newBlockmapPath,
}) => {
  const oldInstaller = fs.readFileSync(oldInstallerPath);
  const newInstaller = fs.readFileSync(newInstallerPath);
  const oldBlockMap = readBlockMap(oldBlockmapPath);
  const newBlockMap = readBlockMap(newBlockmapPath);
  const messages = [];
  const operations = computeOperations(oldBlockMap, newBlockMap, {
    debug: (message) => messages.push({ level: 'debug', message }),
    info: (message) => messages.push({ level: 'info', message }),
    warn: (message) => messages.push({ level: 'warn', message }),
    error: (message) => messages.push({ level: 'error', message }),
  });

  let copiedBytes = 0;
  let downloadedBytes = 0;
  const chunks = operations.map((operation) => {
    assert.ok(operation.start >= 0 && operation.end > operation.start);
    const source = operation.kind === OperationKind.COPY ? oldInstaller : newInstaller;
    assert.ok(operation.end <= source.length, 'Differential operation exceeds its source asset');
    const chunk = source.subarray(operation.start, operation.end);
    if (operation.kind === OperationKind.COPY) copiedBytes += chunk.length;
    else downloadedBytes += chunk.length;
    return chunk;
  });
  const reconstructed = Buffer.concat(chunks);
  const reconstructedSha256 = sha256(reconstructed);
  const newInstallerSha256 = sha256(newInstaller);

  assert.equal(reconstructed.length, newInstaller.length, 'Differential reconstruction size differs from the new installer');
  assert.equal(reconstructedSha256, newInstallerSha256, 'Differential reconstruction digest differs from the new installer');

  return {
    oldInstaller: {
      path: path.resolve(oldInstallerPath),
      bytes: oldInstaller.length,
      sha256: sha256(oldInstaller),
    },
    newInstaller: {
      path: path.resolve(newInstallerPath),
      bytes: newInstaller.length,
      sha256: newInstallerSha256,
    },
    blockmapVersion: newBlockMap.version,
    operationCount: operations.length,
    copiedBytes,
    downloadedBytes,
    copiedPercent: Number(((copiedBytes / newInstaller.length) * 100).toFixed(2)),
    downloadedPercent: Number(((downloadedBytes / newInstaller.length) * 100).toFixed(2)),
    reconstructedBytes: reconstructed.length,
    reconstructedSha256,
    messages,
  };
};

if (require.main === module) {
  const [oldInstallerPath, oldBlockmapPath, newInstallerPath, newBlockmapPath] = process.argv.slice(2);
  if (!oldInstallerPath || !oldBlockmapPath || !newInstallerPath || !newBlockmapPath) {
    throw new Error('Usage: node scripts/verifyDifferentialUpgrade.cjs <old.exe> <old.blockmap> <new.exe> <new.blockmap>');
  }
  console.log(JSON.stringify(verifyDifferentialUpgrade({
    oldInstallerPath,
    oldBlockmapPath,
    newInstallerPath,
    newBlockmapPath,
  }), null, 2));
}

module.exports = { verifyDifferentialUpgrade };
