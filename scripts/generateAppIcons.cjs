const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'resources', 'app-icon', 'gas-laws-lab-icon-source.png');
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const webSizes = [48, 72, 96, 128, 192, 256, 512];

const ensureDirectory = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const padImageToSquareWithoutCropping = (sourceImage) => {
  const { width, height } = sourceImage.getSize();
  if (width <= 0 || height <= 0) {
    throw new Error(`Canonical app icon source has invalid dimensions: ${width}x${height}`);
  }
  if (width === height) return sourceImage;

  const side = Math.max(width, height);
  const sourceBitmap = sourceImage.toBitmap({ scaleFactor: 1 });
  const expectedByteLength = width * height * 4;
  if (sourceBitmap.length !== expectedByteLength) {
    throw new Error(
      `Canonical app icon bitmap has ${sourceBitmap.length} bytes; expected ${expectedByteLength}.`,
    );
  }

  const squareBitmap = Buffer.alloc(side * side * 4);
  const offsetX = Math.floor((side - width) / 2);
  const offsetY = Math.floor((side - height) / 2);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = row * width * 4;
    const targetStart = ((row + offsetY) * side + offsetX) * 4;
    sourceBitmap.copy(
      squareBitmap,
      targetStart,
      sourceStart,
      sourceStart + width * 4,
    );
  }

  const squareImage = nativeImage.createFromBitmap(squareBitmap, {
    width: side,
    height: side,
    scaleFactor: 1,
  });
  if (squareImage.isEmpty()) {
    throw new Error(`Failed to place the ${width}x${height} icon on a transparent square canvas.`);
  }
  return squareImage;
};

const createPng = (sourceImage, size) => {
  const resized = sourceImage.resize({
    width: size,
    height: size,
    quality: 'best',
  });
  const png = resized.toPNG();
  if (png.length === 0) throw new Error(`Failed to render ${size}x${size} PNG icon.`);
  return png;
};

const createPngIco = (frames) => {
  const directorySize = 6 + frames.length * 16;
  const header = Buffer.alloc(directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = directorySize;
  frames.forEach(({ size, png }, index) => {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...frames.map((frame) => frame.png)]);
};

const writeIcon = (relativePath, bytes) => {
  const outputPath = path.join(rootDir, relativePath);
  ensureDirectory(outputPath);
  fs.writeFileSync(outputPath, bytes);
};

app.whenReady().then(() => {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Canonical app icon source is missing: ${sourcePath}`);
  }
  const sourceImage = nativeImage.createFromPath(sourcePath);
  if (sourceImage.isEmpty()) throw new Error(`Canonical app icon source could not be decoded: ${sourcePath}`);
  const squareSourceImage = padImageToSquareWithoutCropping(sourceImage);

  const resource1024 = createPng(squareSourceImage, 1024);
  const resource256 = createPng(squareSourceImage, 256);
  writeIcon('resources/app-icon/icon-1024.png', resource1024);
  writeIcon('resources/app-icon/icon.png', resource256);
  writeIcon('public/favicon.png', resource1024);

  webSizes.forEach((size) => {
    writeIcon(`public/icons/icon-${size}.png`, createPng(squareSourceImage, size));
  });

  const icoFrames = icoSizes.map((size) => ({ size, png: createPng(squareSourceImage, size) }));
  writeIcon('resources/app-icon/icon.ico', createPngIco(icoFrames));
}).then(() => {
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
