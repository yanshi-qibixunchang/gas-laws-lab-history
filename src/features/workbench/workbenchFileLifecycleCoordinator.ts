import type { WorkbenchFileState } from './workbenchFileUnion.ts';

export type WorkbenchFileRenameDecision =
  | { kind: 'empty' }
  | { kind: 'missing' }
  | { kind: 'unchanged'; name: string }
  | { kind: 'rename'; name: string };

export interface WorkbenchFileCollectionPlan {
  nextFiles: WorkbenchFileState[];
  nextClosedFiles: WorkbenchFileState[];
  nextActiveFile: WorkbenchFileState | null;
  nextActiveFileId: string;
}

export type WorkbenchFileClosePlan =
  | { kind: 'missing' }
  | ({
      kind: 'ready';
      file: WorkbenchFileState;
      cachedFile: WorkbenchFileState;
      wasActive: boolean;
    } & WorkbenchFileCollectionPlan);

export type WorkbenchFileDeletePlan =
  | { kind: 'missing' }
  | ({
      kind: 'ready';
      file: WorkbenchFileState;
      wasActive: boolean;
    } & WorkbenchFileCollectionPlan);

export type WorkbenchFileReopenPlan =
  | { kind: 'missing' }
  | { kind: 'already-open' }
  | ({
      kind: 'ready';
      nextActiveFile: WorkbenchFileState;
    } & Omit<WorkbenchFileCollectionPlan, 'nextActiveFile'>);

export type WorkbenchFileSelectionPlan =
  | { kind: 'missing' }
  | { kind: 'unchanged' }
  | ({
      kind: 'ready';
      nextActiveFile: WorkbenchFileState;
    } & Omit<WorkbenchFileCollectionPlan, 'nextActiveFile' | 'nextClosedFiles'>);

const resolveActiveFileAfterExit = (
  remainingFiles: WorkbenchFileState[],
  removedIndex: number,
  activeFileId: string,
  removedWasActive: boolean,
) => {
  if (removedWasActive) {
    return remainingFiles[Math.min(removedIndex, remainingFiles.length - 1)] ?? null;
  }

  return remainingFiles.find((file) => file.id === activeFileId) ?? null;
};

export const resolveWorkbenchFileRename = (
  files: WorkbenchFileState[],
  fileId: string,
  draft: string,
): WorkbenchFileRenameDecision => {
  const name = draft.trim();
  if (!name) return { kind: 'empty' };

  const targetFile = files.find((file) => file.id === fileId);
  if (!targetFile) return { kind: 'missing' };
  if (targetFile.name === name) return { kind: 'unchanged', name };
  return { kind: 'rename', name };
};

export const applyWorkbenchFileRename = <T extends WorkbenchFileState>(
  file: T,
  name: string,
  updatedAt: number,
): T => ({
  ...file,
  name,
  updatedAt,
});

export const createWorkbenchFileClosePlan = (
  files: WorkbenchFileState[],
  closedFiles: WorkbenchFileState[],
  activeFileId: string,
  fileId: string,
  updatedAt: number,
): WorkbenchFileClosePlan => {
  const index = files.findIndex((file) => file.id === fileId);
  const file = files[index];
  if (!file) return { kind: 'missing' };

  const wasActive = fileId === activeFileId;
  const cachedFile: WorkbenchFileState = {
    ...file,
    runState: file.kind === 'heatCapacity'
      ? file.runState
      : file.runState === 'running' ? 'paused' : file.runState,
    updatedAt,
  };
  const nextFiles = files.filter((candidate) => candidate.id !== fileId);
  const nextClosedFiles = [
    cachedFile,
    ...closedFiles.filter((candidate) => candidate.id !== fileId),
  ];
  const nextActiveFile = resolveActiveFileAfterExit(nextFiles, index, activeFileId, wasActive);

  return {
    kind: 'ready',
    file,
    cachedFile,
    wasActive,
    nextFiles,
    nextClosedFiles,
    nextActiveFile,
    nextActiveFileId: nextActiveFile?.id ?? '',
  };
};

export const createWorkbenchFileDeletePlan = (
  files: WorkbenchFileState[],
  closedFiles: WorkbenchFileState[],
  activeFileId: string,
  fileId: string,
): WorkbenchFileDeletePlan => {
  const index = files.findIndex((file) => file.id === fileId);
  const file = files[index];
  if (!file) return { kind: 'missing' };

  const wasActive = fileId === activeFileId;
  const nextFiles = files.filter((candidate) => candidate.id !== fileId);
  const nextClosedFiles = closedFiles.filter((candidate) => candidate.id !== fileId);
  const nextActiveFile = resolveActiveFileAfterExit(nextFiles, index, activeFileId, wasActive);

  return {
    kind: 'ready',
    file,
    wasActive,
    nextFiles,
    nextClosedFiles,
    nextActiveFile,
    nextActiveFileId: nextActiveFile?.id ?? '',
  };
};

export const createWorkbenchFileReopenPlan = (
  files: WorkbenchFileState[],
  closedFiles: WorkbenchFileState[],
  reopenedFile: WorkbenchFileState,
): WorkbenchFileReopenPlan => {
  if (!closedFiles.some((file) => file.id === reopenedFile.id)) return { kind: 'missing' };
  if (files.some((file) => file.id === reopenedFile.id)) return { kind: 'already-open' };

  return {
    kind: 'ready',
    nextFiles: [...files, reopenedFile],
    nextClosedFiles: closedFiles.filter((file) => file.id !== reopenedFile.id),
    nextActiveFile: reopenedFile,
    nextActiveFileId: reopenedFile.id,
  };
};

export const createWorkbenchFileSelectionPlan = (
  files: WorkbenchFileState[],
  activeFileId: string,
  fileId: string,
  openedAt: number,
): WorkbenchFileSelectionPlan => {
  if (fileId === activeFileId) return { kind: 'unchanged' };
  if (!files.some((file) => file.id === fileId)) return { kind: 'missing' };

  const nextFiles = files.map((file) => file.id === fileId
    ? { ...file, lastOpenedAt: openedAt }
    : file);
  const nextActiveFile = nextFiles.find((file) => file.id === fileId);
  if (!nextActiveFile) return { kind: 'missing' };

  return {
    kind: 'ready',
    nextFiles,
    nextActiveFile,
    nextActiveFileId: nextActiveFile.id,
  };
};
