import type {
  WorkbenchFileKind,
  WorkbenchFileState,
} from './workbenchState.ts';

const DISPLAY_NAME_PREFIX_BY_KIND: Record<WorkbenchFileKind, string> = {
  standard: 'Standard Simulation',
  ideal: 'Ideal Gas Simulation',
  heatCapacity: 'Heat Capacity Ratio',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ID_GENERATION_ATTEMPTS = 64;

export type WorkbenchFileUuidGenerator = () => string;

const createWorkbenchFileUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('A cryptographically strong workspace identity generator is unavailable.');
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
};

export const getNextWorkbenchFileDisplayIndex = (
  kind: WorkbenchFileKind,
  files: readonly WorkbenchFileState[],
): number => {
  const prefix = DISPLAY_NAME_PREFIX_BY_KIND[kind];
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - (\\d+)$`);
  let largestIndex = 0;
  for (const file of files) {
    if (file.kind !== kind) continue;
    const match = pattern.exec(file.name);
    if (!match) continue;
    const index = Number(match[1]);
    if (Number.isSafeInteger(index) && index > largestIndex) {
      largestIndex = index;
    }
  }
  if (largestIndex >= Number.MAX_SAFE_INTEGER) {
    throw new Error(`No display index remains available for ${kind} experiments.`);
  }
  return largestIndex + 1;
};

export const createUniqueWorkbenchFileId = (
  kind: WorkbenchFileKind,
  issuedIds: ReadonlySet<string>,
  generateUuid: WorkbenchFileUuidGenerator = createWorkbenchFileUuid,
): string => {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const uuid = generateUuid();
    if (!UUID_PATTERN.test(uuid)) {
      throw new Error('Workspace identity generator returned an invalid UUID.');
    }
    const candidate = `${kind}-${uuid.toLowerCase()}`;
    if (!issuedIds.has(candidate)) return candidate;
  }
  throw new Error('Unable to allocate a unique workspace file identity.');
};

export const assertUniqueWorkbenchFileCollections = (
  openFiles: readonly WorkbenchFileState[],
  closedFiles: readonly WorkbenchFileState[],
  activeFileId?: string,
): void => {
  const openIds = new Set<string>();
  const allIds = new Set<string>();
  for (const [collectionName, files] of [
    ['open', openFiles],
    ['closed', closedFiles],
  ] as const) {
    for (const file of files) {
      if (file.id.trim().length === 0) {
        throw new Error(`Workspace ${collectionName} file identity cannot be empty.`);
      }
      if (allIds.has(file.id)) {
        throw new Error(`Workspace file identity must be globally unique: ${file.id}.`);
      }
      allIds.add(file.id);
      if (collectionName === 'open') openIds.add(file.id);
    }
  }
  if (openFiles.length === 0) {
    if (activeFileId) {
      throw new Error(`An empty workspace cannot retain an active file identity: ${activeFileId}.`);
    }
  } else if (!activeFileId || !openIds.has(activeFileId)) {
    throw new Error(`Workspace active file identity is not open: ${activeFileId ?? ''}.`);
  }
};
