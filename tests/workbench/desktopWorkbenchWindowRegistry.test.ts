import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createPersistentWorkbenchWindowNamespace,
  createWorkbenchWindowRegistry,
  isPersistentWorkbenchWindowNamespace,
  normalizeWorkbenchWindowRegistry,
} = require('../../electron/workbenchWindowRegistry.cjs') as {
  createPersistentWorkbenchWindowNamespace: (randomUuid: () => string) => string;
  createWorkbenchWindowRegistry: (options: {
    fs: typeof fs;
    registryPath: string;
  }) => {
    add: (namespace: string) => Promise<{ schemaVersion: 1; namespaces: string[] }>;
    read: () => Promise<{ schemaVersion: 1; namespaces: string[] }>;
    remove: (namespace: string) => Promise<{ schemaVersion: 1; namespaces: string[] }>;
  };
  isPersistentWorkbenchWindowNamespace: (value: unknown) => boolean;
  normalizeWorkbenchWindowRegistry: (value: unknown) => { schemaVersion: 1; namespaces: string[] };
};

const firstNamespace = createPersistentWorkbenchWindowNamespace(
  () => '11111111-1111-4111-8111-111111111111',
);
const secondNamespace = createPersistentWorkbenchWindowNamespace(
  () => '22222222-2222-4222-8222-222222222222',
);
assert.equal(isPersistentWorkbenchWindowNamespace(firstNamespace), true);
assert.equal(isPersistentWorkbenchWindowNamespace('temporary:11111111-1111-4111-8111-111111111111'), false);
assert.throws(
  () => normalizeWorkbenchWindowRegistry({ schemaVersion: 1, namespaces: [firstNamespace, firstNamespace] }),
  /duplicate namespace/,
);

const directory = await fs.mkdtemp(join(tmpdir(), 'hsl-window-registry-'));
try {
  const registryPath = join(directory, 'registry.json');
  const registry = createWorkbenchWindowRegistry({ fs, registryPath });
  assert.deepEqual(await registry.read(), { schemaVersion: 1, namespaces: [] });
  await Promise.all([
    registry.add(firstNamespace),
    registry.add(secondNamespace),
    registry.add(firstNamespace),
  ]);
  assert.deepEqual(await registry.read(), {
    schemaVersion: 1,
    namespaces: [firstNamespace, secondNamespace],
  });
  await registry.remove(firstNamespace);
  assert.deepEqual(await registry.read(), {
    schemaVersion: 1,
    namespaces: [secondNamespace],
  });
  assert.equal(
    (await fs.readdir(directory)).some((name) => name.endsWith('.tmp')),
    false,
    'atomic registry writes must not leave temporary files behind',
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}

console.log('desktopWorkbenchWindowRegistry tests passed');
