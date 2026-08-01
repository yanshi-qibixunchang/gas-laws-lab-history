const assert = require('node:assert/strict');
const path = require('node:path');

const MAX_EXPORTER_OUTPUT_FILES = 4096;
const MAX_EXPORTER_PATH_CHARACTERS = 32_768;

const isPathInside = (rootPath, candidatePath) => {
  const relative = path.relative(rootPath, candidatePath);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

const validateAbsolutePathString = (value, label) => {
  assert.ok(typeof value === 'string' && value.length > 0, `${label} must be a non-empty path string`);
  assert.ok(value.length <= MAX_EXPORTER_PATH_CHARACTERS, `${label} is unreasonably long`);
  assert.equal(path.isAbsolute(value), true, `${label} must be absolute`);
  return value;
};

const validateRegularOutputFile = async ({ fs, rootRealPath, candidatePath, label }) => {
  validateAbsolutePathString(candidatePath, label);
  const directStat = await fs.lstat(candidatePath);
  assert.equal(directStat.isSymbolicLink(), false, `${label} must not be a symbolic link`);
  assert.equal(directStat.isFile(), true, `${label} must be a regular file`);
  const candidateRealPath = await fs.realpath(candidatePath);
  assert.equal(
    isPathInside(rootRealPath, candidateRealPath),
    true,
    `${label} escapes the requested export directory`,
  );
  return candidateRealPath;
};

const validateExporterOutputManifest = async ({ fs, outDir, parsed }) => {
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Exporter result must be an object');
  assert.equal(parsed.status, 'ok', 'Exporter result status must be ok');
  const rootRealPath = await fs.realpath(outDir);
  const reportedRoot = validateAbsolutePathString(parsed.out, 'Exporter output root');
  assert.equal(await fs.realpath(reportedRoot), rootRealPath, 'Exporter output root does not match the requested directory');
  assert.ok(Array.isArray(parsed.files), 'Exporter files must be an array');
  assert.ok(parsed.files.length > 0, 'Exporter did not return any output files');
  assert.ok(parsed.files.length <= MAX_EXPORTER_OUTPUT_FILES, 'Exporter returned too many output files');

  const files = [];
  const seen = new Set();
  for (let index = 0; index < parsed.files.length; index += 1) {
    const filePath = await validateRegularOutputFile({
      fs,
      rootRealPath,
      candidatePath: parsed.files[index],
      label: `Exporter file ${index + 1}`,
    });
    const key = process.platform === 'win32' ? filePath.toLocaleLowerCase('en-US') : filePath;
    assert.equal(seen.has(key), false, 'Exporter returned a duplicate output file');
    seen.add(key);
    files.push(filePath);
  }

  const metadataPath = parsed.metadata == null
    ? null
    : await validateRegularOutputFile({
        fs,
        rootRealPath,
        candidatePath: parsed.metadata,
        label: 'Exporter metadata file',
      });
  if (metadataPath) {
    const metadataKey = process.platform === 'win32'
      ? metadataPath.toLocaleLowerCase('en-US')
      : metadataPath;
    assert.equal(seen.has(metadataKey), false, 'Exporter metadata must not duplicate an output file');
  }

  return { files, metadataPath, outDir: rootRealPath };
};

module.exports = {
  isPathInside,
  validateExporterOutputManifest,
};
