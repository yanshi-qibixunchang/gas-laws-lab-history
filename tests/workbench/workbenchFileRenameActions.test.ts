import assert from 'node:assert/strict';
import { createWorkbenchFileRenameActions } from '../../src/features/workbench/workbenchFileRenameActions.ts';
import { attachWorkbenchOutsidePointerInteraction } from '../../src/features/workbench/workbenchOutsidePointerInteraction.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
const original = createDefaultStandardFile(1); const other = createDefaultStandardFile(2);
const filesRef = { current: [original, other] as import('../../src/features/workbench/workbenchFileUnion.ts').WorkbenchFileState[] }; const renamingFileIdRef = { current: null as string | null };
const renameSelectionModeRef = { current: 'normal' as 'initial' | 'normal' };
let draft = ''; const events: string[] = []; let pendingDelete = true;
const actions = createWorkbenchFileRenameActions({
 getFiles: () => filesRef.current, getRenameDraft: () => draft, filesRef, renamingFileIdRef, renameSelectionModeRef,
 guardWorkbenchTutorialAction: () => true, captureUndoSnapshot: (label, scope, id) => { assert.equal(scope, 'file'); assert.equal(id, original.id); events.push(label); },
 updateFileById: (id, update) => { events.push('commit'); filesRef.current = filesRef.current.map(file => file.id === id ? update(file) : file); },
 setOpenFileMenuId: () => {}, setPendingDeleteFileId: () => { pendingDelete = false; }, setRenamingFileId: () => {},
 setRenameDraft: next => { draft = typeof next === 'function' ? next(draft) : next; }, pushLog: (_, kind) => { if (kind === 'error') events.push('error'); },
});
actions.beginRenameFile(original); assert.equal(pendingDelete, false); assert.equal(draft, original.name); assert.equal(renameSelectionModeRef.current, 'initial');
draft = '  New name  '; actions.commitRenameFile(original.id);
assert.deepEqual(events, ['renamed file', 'commit']); assert.equal(filesRef.current[0]!.name, 'New name');
assert.strictEqual(filesRef.current[0]!.params, original.params); assert.strictEqual(filesRef.current[1], other); assert.equal(renamingFileIdRef.current, null);
events.length = 0; actions.beginRenameFile(filesRef.current[0]!); actions.commitRenameFile(original.id); assert.deepEqual(events, []);
actions.beginRenameFile(filesRef.current[0]!); draft = ' '; actions.commitRenameFile(original.id);
assert.deepEqual(events, ['error']); assert.equal(renamingFileIdRef.current, original.id, 'explicit empty submission preserves existing editor behavior');
actions.commitRenameFileFromOutside(); assert.equal(renamingFileIdRef.current, null); assert.equal(draft, ''); assert.deepEqual(events, ['error', 'error']);
actions.beginRenameFile(filesRef.current[0]!); draft = 'Outside name'; actions.commitRenameFileFromOutside(); assert.equal(filesRef.current[0]!.name, 'Outside name');
actions.beginRenameFile(filesRef.current[0]!); actions.cancelRenameFile(); assert.equal(renamingFileIdRef.current, null); assert.equal(draft, '');
let selection: number[] = []; actions.selectRenameNumericSuffix({ value: 'File-003', setSelectionRange: (start: number, end: number) => { selection = [start, end]; } } as HTMLInputElement);
assert.deepEqual(selection, [5, 8]);
const inside = {} as Node; const outside = {} as Node; let handler: ((target: Node) => void) | undefined; let closed = 0;
const detach = attachWorkbenchOutsidePointerInteraction({ subscribe: next => { handler = next; return () => { handler = undefined; }; }, contains: target => target === inside, onOutside: () => { closed += 1; } });
handler!(inside); assert.equal(closed, 0); handler!(outside); assert.equal(closed, 1); detach(); assert.equal(handler, undefined);
console.log('Workbench rename and outside pointer tests passed.');
