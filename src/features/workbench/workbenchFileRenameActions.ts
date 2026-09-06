import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { applyWorkbenchFileRename, resolveWorkbenchFileRename } from './workbenchFileLifecycleCoordinator.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';

export interface WorkbenchFileRenamePorts {
  getFiles: () => WorkbenchFileState[];
  getRenameDraft: () => string;
  filesRef: Ref<WorkbenchFileState[]>;
  renamingFileIdRef: Ref<string | null>;
  renameSelectionModeRef: Ref<'initial' | 'normal'>;
  guardWorkbenchTutorialAction: (action: 'rename-file') => boolean;
  captureUndoSnapshot: (label: string, scope: 'file', fileId: string) => void;
  updateFileById: (fileId: string, update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
  setOpenFileMenuId: Setter<string | null>;
  setPendingDeleteFileId: Setter<string | null>;
  setRenamingFileId: Setter<string | null>;
  setRenameDraft: Setter<string>;
  pushLog: WorkbenchLogWriter;
}

/** Rename draft is transient; only a nonempty changed name commits file history. */
export const createWorkbenchFileRenameActions = (ports: WorkbenchFileRenamePorts) => {
  const { filesRef, renamingFileIdRef, renameSelectionModeRef, guardWorkbenchTutorialAction,
    captureUndoSnapshot, updateFileById, setOpenFileMenuId, setPendingDeleteFileId,
    setRenamingFileId, setRenameDraft, pushLog } = ports;
  const beginRenameFile = (file: WorkbenchFileState) => {
    if (!guardWorkbenchTutorialAction('rename-file')) return;
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    renamingFileIdRef.current = file.id;
    renameSelectionModeRef.current = 'initial';
    setRenamingFileId(file.id);
    setRenameDraft(file.name);
  };

  const selectRenameNumericSuffix = (input: HTMLInputElement) => {
    const numericSuffix = input.value.match(/\d+$/);
    if (!numericSuffix || numericSuffix.index === undefined) {
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    input.setSelectionRange(numericSuffix.index, input.value.length);
  };

  const commitRenameFile = (fileId: string) => {
    const files = ports.getFiles();
    const renameDraft = ports.getRenameDraft();
    const renameDecision = resolveWorkbenchFileRename(files, fileId, renameDraft);
    if (renameDecision.kind === 'empty') {
      pushLog((language) => workbenchCopies[language].logs.fileNameCannotBeEmpty, 'error');
      return;
    }
    if (renameDecision.kind === 'missing') {
      cancelRenameFile();
      return;
    }
    if (renameDecision.kind === 'unchanged') {
      cancelRenameFile();
      pushLog((language) => workbenchCopies[language].logs.fileNameUnchanged(renameDecision.name));
      return;
    }

    captureUndoSnapshot('renamed file', 'file', fileId);
    updateFileById(fileId, (file) => applyWorkbenchFileRename(file, renameDecision.name, Date.now()));
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
    pushLog((language) => workbenchCopies[language].logs.fileRenamed(renameDecision.name), 'success');
  };

  const cancelRenameFile = () => {
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
  };

  const commitRenameFileFromOutside = () => {
    const renameDraft = ports.getRenameDraft();
    const fileId = renamingFileIdRef.current;
    if (!fileId) return;

    const renameDecision = resolveWorkbenchFileRename(filesRef.current, fileId, renameDraft);
    if (renameDecision.kind === 'empty') {
      pushLog((language) => workbenchCopies[language].logs.fileNameCannotBeEmpty, 'error');
      renamingFileIdRef.current = null;
      renameSelectionModeRef.current = 'normal';
      setRenamingFileId(null);
      setRenameDraft('');
      return;
    }
    if (renameDecision.kind === 'missing') {
      cancelRenameFile();
      return;
    }
    if (renameDecision.kind === 'unchanged') {
      cancelRenameFile();
      pushLog((language) => workbenchCopies[language].logs.fileNameUnchanged(renameDecision.name));
      return;
    }

    captureUndoSnapshot('renamed file', 'file', fileId);
    updateFileById(fileId, (file) => applyWorkbenchFileRename(file, renameDecision.name, Date.now()));
    renamingFileIdRef.current = null;
    renameSelectionModeRef.current = 'normal';
    setRenamingFileId(null);
    setRenameDraft('');
    pushLog((language) => workbenchCopies[language].logs.fileRenamed(renameDecision.name), 'success');
  };

  return { beginRenameFile, selectRenameNumericSuffix, commitRenameFile, cancelRenameFile, commitRenameFileFromOutside };
};
