import assert from 'node:assert/strict';

import {
  createDefaultWorkbenchSidebarRefreshState,
  loadWorkbenchSidebarRefreshState,
  persistWorkbenchSidebarRefreshState,
  WORKBENCH_SIDEBAR_REFRESH_STATE_STORAGE_KEY,
} from '../../src/features/workbench/workbenchSidebarRefreshState.ts';

const createMemoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
};

const storage = createMemoryStorage();
assert.deepEqual(
  loadWorkbenchSidebarRefreshState(storage),
  createDefaultWorkbenchSidebarRefreshState(),
);

assert.equal(persistWorkbenchSidebarRefreshState({
  schemaVersion: 1,
  leftCollapsed: true,
  parametersCollapsed: false,
}, storage), true);
assert.deepEqual(loadWorkbenchSidebarRefreshState(storage), {
  schemaVersion: 1,
  leftCollapsed: true,
  parametersCollapsed: false,
});

storage.values.set(WORKBENCH_SIDEBAR_REFRESH_STATE_STORAGE_KEY, JSON.stringify({
  schemaVersion: 999,
  leftCollapsed: 'invalid',
  parametersCollapsed: true,
}));
assert.deepEqual(loadWorkbenchSidebarRefreshState(storage), {
  schemaVersion: 1,
  leftCollapsed: false,
  parametersCollapsed: true,
});

storage.values.set(WORKBENCH_SIDEBAR_REFRESH_STATE_STORAGE_KEY, '{bad json');
assert.deepEqual(
  loadWorkbenchSidebarRefreshState(storage),
  createDefaultWorkbenchSidebarRefreshState(),
);

console.log('workbenchSidebarRefreshState tests passed');
