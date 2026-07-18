import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { ensureLegacyUserDataPath } = require('../../electron/legacyUserDataPath.cjs') as {
  ensureLegacyUserDataPath: (electronApp: {
    getPath: (name: string) => string;
    setPath: (name: string, value: string) => void;
  }) => string;
};

const appDataPath = mkdtempSync(join(tmpdir(), 'hsl-fresh-app-data-'));
const expectedUserDataPath = join(appDataPath, 'hard-sphere-lab');
const setPathCalls: Array<{ name: string; value: string }> = [];

try {
  assert.equal(existsSync(expectedUserDataPath), false, 'the regression fixture must begin without a legacy user-data directory');
  const actualPath = ensureLegacyUserDataPath({
    getPath: (name) => {
      assert.equal(name, 'appData');
      return appDataPath;
    },
    setPath: (name, value) => {
      assert.equal(
        existsSync(value) && statSync(value).isDirectory(),
        true,
        'the user-data directory must exist before Electron app.setPath is called',
      );
      setPathCalls.push({ name, value });
    },
  });

  assert.equal(actualPath, expectedUserDataPath);
  assert.deepEqual(setPathCalls, [{ name: 'userData', value: expectedUserDataPath }]);
  assert.equal(statSync(expectedUserDataPath).isDirectory(), true);
} finally {
  rmSync(appDataPath, { recursive: true, force: true });
}

console.log('workbenchLegacyUserDataPath tests passed');
