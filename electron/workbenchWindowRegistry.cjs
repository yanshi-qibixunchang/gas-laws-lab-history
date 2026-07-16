const path = require('node:path');

const WORKBENCH_WINDOW_REGISTRY_VERSION = 1;
const WORKBENCH_WINDOW_NAMESPACE_PREFIX = 'persistent:window:';

const isPersistentWorkbenchWindowNamespace = (value) => (
  typeof value === 'string' &&
  /^persistent:window:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
);

const createPersistentWorkbenchWindowNamespace = (randomUuid) => {
  const namespace = `${WORKBENCH_WINDOW_NAMESPACE_PREFIX}${randomUuid()}`;
  if (!isPersistentWorkbenchWindowNamespace(namespace)) {
    throw new Error('Unable to create a valid persistent workbench window namespace.');
  }
  return namespace;
};

const normalizeWorkbenchWindowRegistry = (value) => {
  if (
    !value ||
    typeof value !== 'object' ||
    value.schemaVersion !== WORKBENCH_WINDOW_REGISTRY_VERSION ||
    !Array.isArray(value.namespaces)
  ) {
    throw new Error('Workbench window registry is invalid.');
  }
  const namespaces = value.namespaces.filter(isPersistentWorkbenchWindowNamespace);
  if (namespaces.length !== value.namespaces.length || new Set(namespaces).size !== namespaces.length) {
    throw new Error('Workbench window registry contains an invalid or duplicate namespace.');
  }
  return {
    schemaVersion: WORKBENCH_WINDOW_REGISTRY_VERSION,
    namespaces,
  };
};

const createWorkbenchWindowRegistry = ({ fs, registryPath }) => {
  let mutation = Promise.resolve();

  const read = async () => {
    try {
      const raw = await fs.readFile(registryPath, 'utf8');
      return normalizeWorkbenchWindowRegistry(JSON.parse(raw));
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return { schemaVersion: WORKBENCH_WINDOW_REGISTRY_VERSION, namespaces: [] };
      }
      throw error;
    }
  };

  const write = async (registry) => {
    const normalized = normalizeWorkbenchWindowRegistry(registry);
    await fs.mkdir(path.dirname(registryPath), { recursive: true });
    const temporaryPath = `${registryPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
      });
      await fs.rename(temporaryPath, registryPath);
    } finally {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
    return normalized;
  };

  const add = (namespace) => {
    if (!isPersistentWorkbenchWindowNamespace(namespace)) {
      return Promise.reject(new Error('Cannot register an invalid workbench window namespace.'));
    }
    const operation = mutation.then(async () => {
      const registry = await read();
      if (registry.namespaces.includes(namespace)) return registry;
      return write({
        schemaVersion: WORKBENCH_WINDOW_REGISTRY_VERSION,
        namespaces: [...registry.namespaces, namespace],
      });
    });
    mutation = operation.catch(() => undefined);
    return operation;
  };

  const remove = (namespace) => {
    const operation = mutation.then(async () => {
      const registry = await read();
      if (!registry.namespaces.includes(namespace)) return registry;
      return write({
        schemaVersion: WORKBENCH_WINDOW_REGISTRY_VERSION,
        namespaces: registry.namespaces.filter((candidate) => candidate !== namespace),
      });
    });
    mutation = operation.catch(() => undefined);
    return operation;
  };

  return { add, read, remove };
};

module.exports = {
  WORKBENCH_WINDOW_NAMESPACE_PREFIX,
  WORKBENCH_WINDOW_REGISTRY_VERSION,
  createPersistentWorkbenchWindowNamespace,
  createWorkbenchWindowRegistry,
  isPersistentWorkbenchWindowNamespace,
  normalizeWorkbenchWindowRegistry,
};
