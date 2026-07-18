import assert from 'node:assert/strict';
import {
  WORKBENCH_EDIT_HISTORY_LIMIT,
  WORKBENCH_WORKSPACE_EDIT_HISTORY_LIMIT,
  trimWorkbenchEditHistory,
} from '../../src/features/workbench/workbenchEditHistory.ts';

type Snapshot = {
  kind: 'workspace' | 'file' | 'presentation';
  id: number;
};

const history: Snapshot[] = [];
for (let id = 0; id < 120; id += 1) {
  history.push({
    kind: id % 2 === 0 ? 'workspace' : id % 3 === 0 ? 'presentation' : 'file',
    id,
  });
}
const trimmed = trimWorkbenchEditHistory(history);
assert.ok(trimmed.length <= WORKBENCH_EDIT_HISTORY_LIMIT);
assert.ok(
  trimmed.filter((snapshot) => snapshot.kind === 'workspace').length <=
    WORKBENCH_WORKSPACE_EDIT_HISTORY_LIMIT,
  'full open+closed workspace snapshots must have a small independent memory bound',
);
assert.equal(
  trimmed.filter((snapshot) => snapshot.kind === 'workspace').at(-1)?.id,
  history.filter((snapshot) => snapshot.kind === 'workspace').at(-1)?.id,
  'the newest workspace ownership snapshot must be retained',
);
assert.equal(
  trimmed.at(-1)?.id,
  history.at(-1)?.id,
  'history trimming must preserve the newest action',
);

const causalHistory: Snapshot[] = [
  { kind: 'file', id: 0 },
  { kind: 'workspace', id: 1 },
  { kind: 'file', id: 2 },
  ...Array.from({ length: WORKBENCH_WORKSPACE_EDIT_HISTORY_LIMIT }, (_, index): Snapshot => ({
    kind: 'workspace',
    id: index + 3,
  })),
];
const causalTrimmed = trimWorkbenchEditHistory(causalHistory);
assert.equal(
  causalTrimmed.some((snapshot) => snapshot.id === 0 || snapshot.id === 1),
  false,
  'dropping an old workspace ownership action must also drop the entire older causal prefix',
);
assert.equal(
  causalTrimmed.some((snapshot) => snapshot.id === 2),
  true,
  'actions newer than the discarded ownership boundary must remain undoable',
);

console.log('workbenchEditHistory tests passed');
