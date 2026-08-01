import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

const forbiddenFields = [
  'pumpInflowTemperatureRiseK',
  'pumpTemperatureGainK',
  'chamberTemperatureRiseK',
  'releaseResponseDelayS',
  'releaseMainDurationS',
  'hardSphereParticleMultiplier',
  'hardSphereSpeedMultiplier',
  'hardSphereTrailsEnabled',
] as const;

const sourceFiles = (dir: string, files: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      sourceFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
};

const forbiddenFiles = [
  path.join(srcDir, 'domain', 'heatCapacity', 'heatCapacityFreeIdealReferenceModel.ts'),
  path.join(srcDir, 'domain', 'heatCapacity', 'heatCapacityFreeStandardProcessModel.ts'),
] as const;

assert.deepEqual(
  forbiddenFiles.filter((filePath) => existsSync(filePath)).map((filePath) => path.relative(rootDir, filePath)),
  [],
  'obsolete synthetic heat-capacity reference models should be removed from src',
);

const matches: string[] = [];
const forbiddenSourceTokens = [
  'createHeatCapacityFreeStandardProcess',
  'HeatCapacityFreeStandardProcess',
] as const;
const forbiddenHardCodedTheoryDefaults = [
  {
    file: path.join(srcDir, 'domain', 'heatCapacity', 'heatCapacityFreeProcessReviewModel.ts'),
    pattern: /theoreticalGamma\s*=\s*1\.4|IDEAL_REVIEW_THEORETICAL_GAMMA\s*=\s*1\.4/,
  },
  {
    file: path.join(srcDir, 'domain', 'heatCapacity', 'heatCapacityFreeStandardReferenceModel.ts'),
    pattern: /theoreticalGamma\s*=\s*1\.4/,
  },
  {
    file: path.join(srcDir, 'domain', 'heatCapacity', 'heatCapacityFreeTrialModel.ts'),
    pattern: /theoreticalGamma\s*=\s*options\.theoreticalGamma\s*\?\?\s*1\.4/,
  },
] as const;
const exactLegacySchemaBoundary = path.join(
  srcDir,
  'features',
  'workbench',
  'persistenceV3',
  'legacyV2Adapter.ts',
);

for (const filePath of sourceFiles(srcDir)) {
  const source = readFileSync(filePath, 'utf8');
  for (const field of forbiddenFields) {
    if (
      filePath !== exactLegacySchemaBoundary &&
      source.includes(field)
    ) {
      matches.push(`${path.relative(rootDir, filePath)}: ${field}`);
    }
  }
  for (const token of forbiddenSourceTokens) {
    if (source.includes(token)) {
      matches.push(`${path.relative(rootDir, filePath)}: ${token}`);
    }
  }
}

for (const { file, pattern } of forbiddenHardCodedTheoryDefaults) {
  const source = readFileSync(file, 'utf8');
  if (pattern.test(source)) {
    matches.push(`${path.relative(rootDir, file)}: hard-coded theoretical gamma default`);
  }
}

assert.deepEqual(matches, [], 'legacy heat-capacity fields should be removed from src');
