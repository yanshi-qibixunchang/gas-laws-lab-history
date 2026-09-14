import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { ensureLegacyUserDataPath } = require('../../electron/legacyUserDataPath.cjs') as {
  ensureLegacyUserDataPath: (electronApp: {
    commandLine?: { getSwitchValue: (name: string) => string; hasSwitch: (name: string) => boolean };
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
  const isolatedPath = join(appDataPath, 'acceptance profile');
  const isolatedCalls: string[] = [];
  assert.equal(ensureLegacyUserDataPath({
    commandLine: { getSwitchValue: () => isolatedPath, hasSwitch: () => true },
    getPath: () => { throw new Error('An explicit profile must not read the installed profile location.'); },
    setPath: (name, value) => { assert.equal(name, 'userData'); isolatedCalls.push(value); },
  }), isolatedPath);
  assert.deepEqual(isolatedCalls, [isolatedPath]);
  assert.ok(statSync(isolatedPath).isDirectory());
  for (const invalidPath of ['', 'relative-profile']) {
    assert.throws(() => ensureLegacyUserDataPath({
      commandLine: { getSwitchValue: () => invalidPath, hasSwitch: () => true },
      getPath: () => { throw new Error('An invalid override must not fall back to real user data.'); },
      setPath: () => { throw new Error('No path should be changed.'); },
    }), /absolute path/);
  }
} finally {
  rmSync(appDataPath, { recursive: true, force: true });
}

console.log('workbenchLegacyUserDataPath tests passed');
