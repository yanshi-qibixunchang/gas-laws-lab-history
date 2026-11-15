import assert from 'node:assert/strict';
import { getUniqueWorkbenchFileName, normalizeWorkbenchFileNameCollections } from '../../src/features/workbench/workbenchFileNaming.ts';
import { createDefaultStandardFile, createDefaultIdealFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

const files: WorkbenchFileState[] = [
  { ...createDefaultStandardFile(), name: '实验' },
  { ...createDefaultIdealFile(), name: '实验' },
  { ...createDefaultHeatCapacityFile(), name: '实验 (1)' },
];
const closed: WorkbenchFileState[] = [{ ...createDefaultHeatCapacityPistonOscillationFile(), name: '实验' }];
const original = structuredClone([...files, ...closed]);
const migrated = normalizeWorkbenchFileNameCollections(files, closed);
assert.deepEqual([...migrated.files, ...migrated.closedFiles].map(f => f.name), ['实验', '实验 (2)', '实验 (1)', '实验 (3)']);
assert.strictEqual(migrated.files[0], files[0]);
assert.strictEqual(migrated.files[2], files[2]);
assert.deepEqual([...files, ...closed], original, 'the original saved objects are not mutated');
[...migrated.files, ...migrated.closedFiles].forEach((file, index) => {
  const { name: _name, ...actual } = file;
  const { name: _originalName, ...expected } = original[index];
  assert.deepEqual(actual, expected, 'IDs, timestamps, parameters and experiment data stay intact');
});
const secondLoad = normalizeWorkbenchFileNameCollections(migrated.files, migrated.closedFiles);
assert.strictEqual(secondLoad.files, migrated.files);
assert.strictEqual(secondLoad.closedFiles, migrated.closedFiles);
assert.deepEqual(normalizeWorkbenchFileNameCollections([], []), { files: [], closedFiles: [] });
assert.equal(getUniqueWorkbenchFileName('实验', [...migrated.files, ...migrated.closedFiles]), '实验 (4)');
assert.equal(getUniqueWorkbenchFileName('实验 (1)', [...migrated.files, ...migrated.closedFiles]), '实验 (4)');
assert.equal(getUniqueWorkbenchFileName('实验', files, files[1].id), '实验 (2)');
assert.equal(getUniqueWorkbenchFileName('实验 (1)', files, files[2].id), '实验 (1)');
assert.equal(getUniqueWorkbenchFileName('  Air  ', [{ id: 'a', name: 'air' }]), 'Air (1)');
assert.equal(getUniqueWorkbenchFileName('e\u0301', [{ id: 'a', name: 'é' }]), 'e\u0301 (1)');
assert.equal(getUniqueWorkbenchFileName('无重名', files), '无重名');
console.log('Global file naming and legacy duplicate migration tests passed.');
