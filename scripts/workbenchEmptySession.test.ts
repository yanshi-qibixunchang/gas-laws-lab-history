import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sessionSource = readFileSync(new URL('../components/workbenchSession.ts', import.meta.url), 'utf8');

assert.doesNotMatch(
  sessionSource,
  /import \{ createInitialWorkbenchFiles \}/,
  'session fallback should not import default sample studies',
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
  sessionSource,
  /window\.localStorage\.setItem\(WORKBENCH_SESSION_STORAGE_KEY, JSON\.stringify\(session\)\);/,
  'newly created studies should still persist through the existing session storage key',
);

assert.match(
  sessionSource,
  /liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio\(file\.liveWorkspaceSplitRatio\)/,
  'stored sessions should normalize the live workspace split ratio',
);

console.log('workbenchEmptySession tests passed');
