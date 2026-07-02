import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

const matches: string[] = [];

for (const filePath of sourceFiles(srcDir)) {
  const source = readFileSync(filePath, 'utf8');
  for (const field of forbiddenFields) {
    if (source.includes(field)) {
      matches.push(`${path.relative(rootDir, filePath)}: ${field}`);
    }
  }
}

assert.deepEqual(matches, [], 'legacy heat-capacity fields should be removed from src');
