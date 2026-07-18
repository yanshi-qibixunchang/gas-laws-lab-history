const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'resources', 'app-icon', 'gas-laws-lab-icon-source.png');
const expectedSourceSha256 = '72b78ec264dd98c18824bbe75dcbfb886f43e068f33f3b5d79c94e45f5702b15';
const expectedIcoSizes = [16, 24, 32, 48, 64, 128, 256];
const expectedPngs = new Map([
  ['resources/app-icon/icon-1024.png', 1024],
  ['resources/app-icon/icon.png', 256],
  ['public/favicon.png', 1024],
  ...[48, 72, 96, 128, 192, 256, 512].map((size) => [`public/icons/icon-${size}.png`, size]),
]);
const expectedGeneratedSha256 = new Map([
  ['resources/app-icon/icon-1024.png', '7efdfff368f046131d8bb37fb8ba434a87e1b4ccf4780f4680b061f16d4b5a8e'],
  ['resources/app-icon/icon.png', 'd267715fe9676d4e88200759612d28179118538652825bf3ff307849ff5623b0'],
  ['public/favicon.png', '7efdfff368f046131d8bb37fb8ba434a87e1b4ccf4780f4680b061f16d4b5a8e'],
  ['public/icons/icon-48.png', 'efd1ed1b2f5595a37ebf934ae02d1d7b112edc3d4a77902fbdc01fddbf2c97ff'],
  ['public/icons/icon-72.png', 'e0434b88261e78bd01d9d68fa5e9f688c11875d5009c2aa2d3d05db7f0a005cd'],
  ['public/icons/icon-96.png', '48ad005e010208a6138a8a9aa439457fc41e4e206db771a5a56fb2010225d426'],
  ['public/icons/icon-128.png', '37327614aeba04736ccd2818084ff47b1d959d57c6bd55564c58584a84d495eb'],
  ['public/icons/icon-192.png', 'c7e44ba3f3d48865b05476baebfb10ab32f2913a01ec11fdbbe3e810b180d9e8'],
  ['public/icons/icon-256.png', 'd267715fe9676d4e88200759612d28179118538652825bf3ff307849ff5623b0'],
  ['public/icons/icon-512.png', 'c6a0b8c4a93e2ac26e5a92a504d8b8342e68e08efe9c5801489c392b9985450d'],
  ['resources/app-icon/icon.ico', '534955af3aeb72646280eb8ef4e5565327e4ae821c5026d343bfe78d934fe57a'],
]);

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const readPngSize = (bytes, label) => {
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${label} is not a PNG`);
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR', `${label} has no PNG IHDR`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
};

assert.ok(fs.existsSync(sourcePath), 'canonical app icon source is missing');
const sourceBytes = fs.readFileSync(sourcePath);
assert.equal(
  sha256(sourceBytes),
  expectedSourceSha256,
  'canonical app icon source does not match the user-provided artwork',
);
assert.deepEqual(readPngSize(sourceBytes, 'canonical source'), { width: 401, height: 396 });

for (const [relativePath, expectedSize] of expectedPngs) {
  const bytes = fs.readFileSync(path.join(rootDir, relativePath));
  assert.equal(
    sha256(bytes),
    expectedGeneratedSha256.get(relativePath),
    `${relativePath} is stale or was not generated from the canonical artwork`,
  );
  assert.deepEqual(
    readPngSize(bytes, relativePath),
    { width: expectedSize, height: expectedSize },
    `${relativePath} has the wrong dimensions`,
  );
}
assert.ok(
  fs.readFileSync(path.join(rootDir, 'resources', 'app-icon', 'icon-1024.png'))
    .equals(fs.readFileSync(path.join(rootDir, 'public', 'favicon.png'))),
  'desktop and browser canonical 1024px icons must match',
);

const icoBytes = fs.readFileSync(path.join(rootDir, 'resources', 'app-icon', 'icon.ico'));
assert.equal(
  sha256(icoBytes),
  expectedGeneratedSha256.get('resources/app-icon/icon.ico'),
  'Windows ICO is stale or was not generated from the canonical artwork',
);
assert.equal(icoBytes.readUInt16LE(0), 0, 'ICO reserved header is invalid');
assert.equal(icoBytes.readUInt16LE(2), 1, 'ICO type must be icon');
const icoCount = icoBytes.readUInt16LE(4);
assert.equal(icoCount, expectedIcoSizes.length, 'ICO frame count is invalid');
const actualIcoSizes = [];
for (let index = 0; index < icoCount; index += 1) {
  const entryOffset = 6 + index * 16;
  const width = icoBytes.readUInt8(entryOffset) || 256;
  const height = icoBytes.readUInt8(entryOffset + 1) || 256;
  const byteLength = icoBytes.readUInt32LE(entryOffset + 8);
  const imageOffset = icoBytes.readUInt32LE(entryOffset + 12);
  assert.equal(width, height, `ICO frame ${index} must be square`);
  assert.equal(icoBytes.readUInt16LE(entryOffset + 4), 1, `ICO frame ${index} planes are invalid`);
  assert.equal(icoBytes.readUInt16LE(entryOffset + 6), 32, `ICO frame ${index} bit depth is invalid`);
  const frame = icoBytes.subarray(imageOffset, imageOffset + byteLength);
  assert.deepEqual(readPngSize(frame, `ICO frame ${width}`), { width, height });
  actualIcoSizes.push(width);
}
assert.deepEqual(actualIcoSizes, expectedIcoSizes, 'ICO frames must cover all required Windows sizes');

const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'manifest.webmanifest'), 'utf8'));
for (const size of [48, 72, 96, 128, 192, 256, 512]) {
  assert.ok(
    manifest.icons?.some((icon) => (
      icon.src === `/icons/icon-${size}.png`
      && icon.type === 'image/png'
      && icon.sizes === `${size}x${size}`
    )),
    `web manifest does not reference the ${size}px PNG icon`,
  );
}

console.log('app icon resources verified');
