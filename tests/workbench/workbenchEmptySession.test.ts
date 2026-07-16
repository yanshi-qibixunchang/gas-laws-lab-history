import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sessionSource = readFileSync(new URL('../../src/features/workbench/workbenchSession.ts', import.meta.url), 'utf8');
const indexedDbPersistenceSource = readFileSync(new URL('../../src/features/workbench/workbenchIndexedDbPersistence.ts', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../../src/features/workbench/workbenchState.ts', import.meta.url), 'utf8');

assert.doesNotMatch(
  sessionSource,
  /import \{ createInitialWorkbenchFiles \}/,
  'session fallback should not import default sample studies',
);

assert.doesNotMatch(
  stateSource,
  /createInitialWorkbenchFiles/,
  'the obsolete default sample-study factory should not remain after empty-workbench startup became canonical',
);

assert.match(
  sessionSource,
  /const fallbackSession = \(\): WorkbenchSessionState => \{[\s\S]*?files: \[\],[\s\S]*?activeFileId: '',[\s\S]*?selectedPanel: 'preview'/,
  'missing or invalid session data should open an empty workbench',
);

assert.match(
  sessionSource,
  /if \(files\.length === 0\) return fallbackSession\(\);/,
  'empty stored sessions should remain empty rather than recreating default studies',
);

assert.match(
  indexedDbPersistenceSource,
  /const records = preparedRecords \?\? createPersistenceRecords\(namespace, snapshot, migrationState\);[\s\S]*fileRecordsToWrite\.forEach\(\(record\) => fileStore\.put\(record\)\);[\s\S]*modeRecordsToWrite\.forEach\(\(record\) => modeStore\.put\(record\)\);[\s\S]*metaStore\.put\(records\.meta\);[\s\S]*await completed;/,
  'newly created studies should persist atomically through the versioned, incrementally selected IndexedDB records',
);

assert.match(
  sessionSource,
  /liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio\(file\.liveWorkspaceSplitRatio\)/,
  'stored sessions should normalize the live workspace split ratio',
);

console.log('workbenchEmptySession tests passed');
