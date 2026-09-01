import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isWorkbenchPanelKey,
  WORKBENCH_PANEL_KEYS,
} from '../../src/features/workbench/workbenchPanelRegistry.ts';
import {
  isRestorableWorkbenchPanelKey,
  normalizeWorkbenchPanelKey,
  normalizeWorkbenchPanelKeys,
} from '../../src/features/workbench/workbenchPanelCompatibility.ts';
import {
  createDefaultIdealFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  decodeWorkbenchSession,
  WORKBENCH_SESSION_VERSION,
} from '../../src/features/workbench/workbenchSession.ts';

assert.equal(WORKBENCH_PANEL_KEYS.includes('history' as never), false);
assert.equal(isWorkbenchPanelKey('history'), false);
assert.equal(isRestorableWorkbenchPanelKey('history'), true);
assert.equal(normalizeWorkbenchPanelKey('history', 'preview'), 'verification');
assert.equal(normalizeWorkbenchPanelKey('unknown-panel', 'preview'), 'preview');
assert.deepEqual(
  normalizeWorkbenchPanelKeys(
    ['preview', 'history', 'verification', 'unknown-panel'],
    ['realtime'],
  ),
  ['preview', 'verification'],
);
assert.deepEqual(normalizeWorkbenchPanelKeys(null, ['realtime']), ['realtime']);

const idealFile = createDefaultIdealFile(1);
const restored = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  files: [{
    ...idealFile,
    visiblePanels: ['preview', 'history', 'verification'],
  }],
  activeFileId: idealFile.id,
  selectedPanel: 'history',
});
assert.equal(restored.selectedPanel, 'verification');
assert.deepEqual(restored.files[0]?.visiblePanels, ['preview', 'verification']);

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.doesNotMatch(workbenchSource, /const renderHistoryPanel =/);
assert.doesNotMatch(workbenchSource, /panel\.key === 'history'/);

console.log('workbenchPanelCompatibility tests passed');
