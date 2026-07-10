import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatWorkbenchLastOpenedAt,
  getWorkbenchFileKindLabel,
  getWorkbenchSessionCacheSummary,
} from '../../src/features/workbench/workbenchFilePresentation.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
} from '../../src/features/workbench/workbenchState.ts';

const kindCopy = { std: 'Standard', ideal: 'Ideal', heat: 'Heat' };
assert.equal(getWorkbenchFileKindLabel('standard', kindCopy), 'Standard');
assert.equal(getWorkbenchFileKindLabel('ideal', kindCopy), 'Ideal');
assert.equal(getWorkbenchFileKindLabel('heatCapacity', kindCopy), 'Heat');

assert.equal(formatWorkbenchLastOpenedAt(Number.NaN, 'en'), '--');
assert.match(formatWorkbenchLastOpenedAt(Date.UTC(2026, 6, 10, 8, 30), 'en'), /2026/);
assert.match(formatWorkbenchLastOpenedAt(Date.UTC(2026, 6, 10, 8, 30), 'zh-CN'), /^2026年\d{2}月\d{2}日 /);

const summary = getWorkbenchSessionCacheSummary([
  createDefaultIdealFile(1),
  createDefaultHeatCapacityFile(1),
  createDefaultStandardFile(1),
  createDefaultIdealFile(2),
], {
  about: {
    sessionCacheSummary: (total) => `total:${total}`,
    sessionCacheBreakdown: (ideal, heat, standard) => `${ideal}/${heat}/${standard}`,
  },
});
assert.deepEqual(summary, { summary: 'total:4', breakdown: '2/1/1' });

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(workbenchSource, /from '\.\/workbenchFilePresentation\.ts'/);
assert.doesNotMatch(workbenchSource, /const getWorkbenchFileKindLabel\s*=|const formatWorkbenchLastOpenedAt\s*=/);

console.log('workbenchFilePresentation tests passed');
