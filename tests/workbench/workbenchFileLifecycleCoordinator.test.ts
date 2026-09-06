import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDefaultHeatCapacityFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  applyWorkbenchFileRename,
  createWorkbenchFileClosePlan,
  createWorkbenchFileDeletePlan,
  createWorkbenchFileReopenPlan,
  createWorkbenchFileSelectionPlan,
  resolveWorkbenchFileRename,
} from '../../src/features/workbench/workbenchFileLifecycleCoordinator.ts';

const at = 123_456;
const standardA = {
  ...createDefaultStandardFile(1),
  id: 'standard-a',
  name: 'Standard A',
  runState: 'running' as const,
};
const standardB = {
  ...createDefaultStandardFile(2),
  id: 'standard-b',
  name: 'Standard B',
};
const idealC = {
  ...createDefaultIdealFile(3),
  id: 'ideal-c',
  name: 'Ideal C',
};
const heatD = {
  ...createDefaultHeatCapacityFile(4),
  id: 'heat-d',
  name: 'Heat D',
  runState: 'running' as const,
};

const openFiles: WorkbenchFileState[] = [standardA, standardB, idealC];
const closedFiles: WorkbenchFileState[] = [{ ...standardA, runState: 'idle' }];

const activeClosePlan = createWorkbenchFileClosePlan(
  openFiles,
  closedFiles,
  standardA.id,
  standardA.id,
  at,
);
assert.equal(activeClosePlan.kind, 'ready');
if (activeClosePlan.kind === 'ready') {
  assert.equal(activeClosePlan.wasActive, true);
  assert.deepEqual(activeClosePlan.nextFiles.map((file) => file.id), ['standard-b', 'ideal-c']);
  assert.equal(activeClosePlan.nextClosedFiles[0]?.id, standardA.id);
  assert.equal(activeClosePlan.nextClosedFiles[0]?.runState, 'paused');
  assert.equal(activeClosePlan.nextClosedFiles[0]?.updatedAt, at);
  assert.equal(activeClosePlan.nextClosedFiles.filter((file) => file.id === standardA.id).length, 1);
  assert.equal(activeClosePlan.nextActiveFile?.id, standardB.id);
}
assert.equal(openFiles[0]?.runState, 'running', 'close planning must not mutate source files');

const inactiveClosePlan = createWorkbenchFileClosePlan(
  openFiles,
  [],
  standardA.id,
  idealC.id,
  at,
);
assert.equal(inactiveClosePlan.kind, 'ready');
if (inactiveClosePlan.kind === 'ready') {
  assert.equal(inactiveClosePlan.wasActive, false);
  assert.equal(inactiveClosePlan.nextActiveFile?.id, standardA.id);
}

const finalClosePlan = createWorkbenchFileClosePlan([standardA], [], standardA.id, standardA.id, at);
assert.equal(finalClosePlan.kind, 'ready');
if (finalClosePlan.kind === 'ready') {
  assert.equal(finalClosePlan.nextActiveFile, null);
  assert.equal(finalClosePlan.nextActiveFileId, '');
}

const heatClosePlan = createWorkbenchFileClosePlan([heatD], [], heatD.id, heatD.id, at);
assert.equal(heatClosePlan.kind, 'ready');
if (heatClosePlan.kind === 'ready') {
  assert.equal(heatClosePlan.cachedFile.runState, 'running', 'heat-capacity close must preserve resumable state');
}
assert.deepEqual(
  createWorkbenchFileClosePlan(openFiles, [], standardA.id, 'missing', at),
  { kind: 'missing' },
);

const deleteMiddlePlan = createWorkbenchFileDeletePlan(
  openFiles,
  [{ ...standardB }, heatD],
  standardB.id,
  standardB.id,
);
assert.equal(deleteMiddlePlan.kind, 'ready');
if (deleteMiddlePlan.kind === 'ready') {
  assert.deepEqual(deleteMiddlePlan.nextFiles.map((file) => file.id), ['standard-a', 'ideal-c']);
  assert.deepEqual(deleteMiddlePlan.nextClosedFiles.map((file) => file.id), ['heat-d']);
  assert.equal(deleteMiddlePlan.nextActiveFile?.id, idealC.id);
}

const inactiveDeletePlan = createWorkbenchFileDeletePlan(
  openFiles,
  [],
  standardA.id,
  idealC.id,
);
assert.equal(inactiveDeletePlan.kind, 'ready');
if (inactiveDeletePlan.kind === 'ready') {
  assert.equal(inactiveDeletePlan.nextActiveFile?.id, standardA.id);
}

const preparedReopened = { ...heatD, updatedAt: at, lastOpenedAt: at };
const reopenPlan = createWorkbenchFileReopenPlan(
  [standardA],
  [standardB, heatD],
  preparedReopened,
);
assert.equal(reopenPlan.kind, 'ready');
if (reopenPlan.kind === 'ready') {
  assert.deepEqual(reopenPlan.nextFiles.map((file) => file.id), ['standard-a', 'heat-d']);
  assert.deepEqual(reopenPlan.nextClosedFiles.map((file) => file.id), ['standard-b']);
  assert.equal(reopenPlan.nextActiveFile.id, heatD.id);
  assert.equal(reopenPlan.nextActiveFileId, heatD.id);
}
assert.deepEqual(
  createWorkbenchFileReopenPlan([standardA, heatD], [heatD], preparedReopened),
  { kind: 'already-open' },
);
assert.deepEqual(
  createWorkbenchFileReopenPlan([standardA], [standardB], preparedReopened),
  { kind: 'missing' },
);

const selectionPlan = createWorkbenchFileSelectionPlan(openFiles, standardA.id, idealC.id, at);
assert.equal(selectionPlan.kind, 'ready');
if (selectionPlan.kind === 'ready') {
  assert.equal(selectionPlan.nextActiveFile.id, idealC.id);
  assert.equal(selectionPlan.nextFiles[2]?.lastOpenedAt, at);
}
assert.notEqual(openFiles[2]?.lastOpenedAt, at, 'selection planning must not mutate source files');
assert.deepEqual(
  createWorkbenchFileSelectionPlan(openFiles, standardA.id, standardA.id, at),
  { kind: 'unchanged' },
);
assert.deepEqual(
  createWorkbenchFileSelectionPlan(openFiles, standardA.id, 'missing', at),
  { kind: 'missing' },
);

assert.deepEqual(resolveWorkbenchFileRename(openFiles, standardA.id, '   '), { kind: 'empty' });
assert.deepEqual(
  resolveWorkbenchFileRename(openFiles, standardA.id, '  Standard A  '),
  { kind: 'unchanged', name: 'Standard A' },
);
assert.deepEqual(
  resolveWorkbenchFileRename(openFiles, standardA.id, '  Renamed A  '),
  { kind: 'rename', name: 'Renamed A' },
);
assert.deepEqual(resolveWorkbenchFileRename(openFiles, 'missing', 'Renamed A'), { kind: 'missing' });
const renamed = applyWorkbenchFileRename(standardA, 'Renamed A', at);
assert.equal(renamed.name, 'Renamed A');
assert.equal(renamed.updatedAt, at);
assert.equal(standardA.name, 'Standard A');

const coordinatorSource = readFileSync(
  new URL('../../src/features/workbench/workbenchFileLifecycleCoordinator.ts', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(coordinatorSource, /export const createWorkbenchFileClosePlan/);
assert.match(coordinatorSource, /export const createWorkbenchFileSelectionPlan/);
assert.match(readFileSync(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8'), /from '\.\/workbenchFileLifecycleCoordinator\.ts'/);
assert.match(workbenchSource, /createWorkbenchFileActions\(\{/);
assert.doesNotMatch(workbenchSource, /const cachedFile: WorkbenchFileState =/);
assert.doesNotMatch(workbenchSource, /const remainingFiles = openFiles\.filter/);

console.log('workbenchFileLifecycleCoordinator tests passed');
