import type React from 'react';
import {
  isExperimentTutorialFileId,
} from '../learning/workbenchTutorialCoordinator.ts';
import {
  getWorkbenchFileKindLabel,
} from './workbenchFilePresentation.ts';
import {
  Activity,
  FlaskConical,
  Gauge,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  X,
  Trash2,
} from 'lucide-react';

export interface WorkbenchFileTreeProps {
  openFileMenuId: string;
  renderSectionTitle: (label: string, collapsed: boolean, onToggle: () => void, kind?: "files" | "panels") => React.ReactElement;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  filesSectionCollapsed: boolean;
  setFilesSectionCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isWorkbenchEmpty: boolean;
  files: import('./workbenchFileUnion.ts').WorkbenchFileState[];
  renamingFileId: string;
  pendingDeleteFileId: string;
  selectedFileId: string;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string>>;
  selectFile: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  setTutorialBlockedNoticeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenFileMenuId: React.Dispatch<React.SetStateAction<string>>;
  setPendingDeleteFileId: React.Dispatch<React.SetStateAction<string>>;
  handleSectionKeyDown: (event: React.KeyboardEvent<Element>, action: () => void) => void;
  renameInputRef: React.MutableRefObject<HTMLInputElement>;
  renameDraft: string;
  renameSelectionModeRef: React.MutableRefObject<"initial" | "normal">;
  setRenameDraft: React.Dispatch<React.SetStateAction<string>>;
  commitRenameFileFromOutside: () => void;
  selectRenameNumericSuffix: (input: HTMLInputElement) => void;
  commitRenameFile: (fileId: string) => void;
  cancelRenameFile: () => void;
  fileMenuButtonRef: React.MutableRefObject<HTMLButtonElement>;
  fileMenuRef: React.MutableRefObject<HTMLDivElement>;
  beginRenameFile: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  requestCloseWorkbenchFile: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  requestDeleteWorkbenchFile: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  cancelDeleteWorkbenchFile: () => void;
}

export const WorkbenchFileTree = ({
  openFileMenuId,
  renderSectionTitle,
  workbenchCopy,
  filesSectionCollapsed,
  setFilesSectionCollapsed,
  isWorkbenchEmpty,
  files,
  renamingFileId,
  pendingDeleteFileId,
  selectedFileId,
  activeFile,
  setSelectedFileId,
  selectFile,
  setTutorialBlockedNoticeOpen,
  setOpenFileMenuId,
  setPendingDeleteFileId,
  handleSectionKeyDown,
  renameInputRef,
  renameDraft,
  renameSelectionModeRef,
  setRenameDraft,
  commitRenameFileFromOutside,
  selectRenameNumericSuffix,
  commitRenameFile,
  cancelRenameFile,
  fileMenuButtonRef,
  fileMenuRef,
  beginRenameFile,
  requestCloseWorkbenchFile,
  requestDeleteWorkbenchFile,
  cancelDeleteWorkbenchFile,
}: WorkbenchFileTreeProps) => {
  return <section className={`studio-tree-section ${openFileMenuId ? 'studio-tree-section-menu-open' : ''}`}>
                {renderSectionTitle(workbenchCopy.files.files, filesSectionCollapsed, () => setFilesSectionCollapsed((current) => !current))}
                <div className={`studio-tree-section-content ${filesSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={filesSectionCollapsed}>
                  {isWorkbenchEmpty ? (
                    <div className="studio-empty-files">
                      <strong>{workbenchCopy.files.noOpenFileState}</strong>
                      <span>{workbenchCopy.files.emptyHint}</span>
                    </div>
                  ) : files.map((file) => {
                    const isRenaming = renamingFileId === file.id;
                    const tutorialFile = isExperimentTutorialFileId(file.id);
                    const menuOpen = openFileMenuId === file.id;
                    const pendingDelete = pendingDeleteFileId === file.id;
                    const fileKindLabel = getWorkbenchFileKindLabel(file.kind, workbenchCopy.files);

                    return (
                      <div
                        role="button"
                        tabIndex={filesSectionCollapsed ? -1 : 0}
                        key={file.id}
                        className={`studio-tree-row studio-file-row ${file.id === selectedFileId ? 'studio-file-row-selected' : ''} ${file.id === activeFile.id ? 'studio-file-row-active' : ''} ${menuOpen ? 'studio-file-row-menu-open' : ''} ${isRenaming ? 'studio-file-row-renaming' : ''}`}
                        onClick={() => {
                          if (!isRenaming && !filesSectionCollapsed) setSelectedFileId(file.id);
                        }}
                        onDoubleClick={() => {
                          if (!isRenaming && !filesSectionCollapsed) selectFile(file);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (tutorialFile) {
                            setTutorialBlockedNoticeOpen(true);
                            return;
                          }
                          if (isRenaming || filesSectionCollapsed) return;
                          setOpenFileMenuId(file.id);
                          setPendingDeleteFileId(null);
                        }}
                        onKeyDown={(event) => handleSectionKeyDown(event, () => selectFile(file))}
                      >
                        {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                        {isRenaming ? (
                          <input
                            className="studio-file-rename-input"
                            ref={renameInputRef}
                            value={renameDraft}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={() => {
                              renameSelectionModeRef.current = 'normal';
                            }}
                            onChange={(event) => {
                              renameSelectionModeRef.current = 'normal';
                              setRenameDraft(event.target.value);
                            }}
                            onBlur={() => commitRenameFileFromOutside()}
                            onKeyDown={(event) => {
                              event.stopPropagation();
                              if (event.key === 'ArrowRight' && renameSelectionModeRef.current === 'initial') {
                                event.preventDefault();
                                selectRenameNumericSuffix(event.currentTarget);
                                renameSelectionModeRef.current = 'normal';
                                return;
                              }
                              if (event.key === 'Enter') {
                                renameSelectionModeRef.current = 'normal';
                                commitRenameFile(file.id);
                                return;
                              }
                              if (event.key === 'Escape') {
                                renameSelectionModeRef.current = 'normal';
                                cancelRenameFile();
                                return;
                              }
                              if (
                                event.key === 'ArrowLeft'
                                || event.key === 'Home'
                                || event.key === 'End'
                                || event.key === 'Delete'
                                || event.key === 'Backspace'
                                || event.key.length === 1
                              ) {
                                renameSelectionModeRef.current = 'normal';
                              }
                            }}
                          />
                        ) : (
                          <span>{file.name}</span>
                        )}
                        {tutorialFile ? (
                          <LockKeyhole
                            size={12}
                            className="studio-tutorial-file-lock"
                            aria-label={workbenchCopy.files.locked}
                          />
                        ) : null}
                        <span className="studio-tree-meta">{fileKindLabel}</span>
                        {!tutorialFile ? <button
                          type="button"
                          className="studio-file-menu-button"
                          aria-label={workbenchCopy.files.openActions(file.name)}
                          tabIndex={filesSectionCollapsed ? -1 : 0}
                          ref={menuOpen ? fileMenuButtonRef : undefined}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenFileMenuId((current) => (current === file.id ? null : file.id));
                            setPendingDeleteFileId(null);
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button> : null}
                        {menuOpen ? (
                          <div
                            className={pendingDelete ? 'studio-file-menu studio-file-menu-pending' : 'studio-file-menu'}
                            ref={fileMenuRef}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button type="button" onClick={() => beginRenameFile(file)}>
                              <Pencil size={13} />
                              {workbenchCopy.files.rename}
                            </button>
                            <button type="button" onClick={() => requestCloseWorkbenchFile(file)}>
                              <X size={13} />
                              {workbenchCopy.files.closeExperiment}
                            </button>
                            <div className={`studio-file-menu-confirm-row ${pendingDelete ? 'studio-file-menu-confirm-row-pending' : ''}`}>
                              <button
                                type="button"
                                className={pendingDelete ? 'studio-file-menu-danger studio-file-menu-confirm' : 'studio-file-menu-danger'}
                                onClick={() => requestDeleteWorkbenchFile(file)}
                              >
                                <Trash2 size={13} />
                                {pendingDelete ? workbenchCopy.files.confirmDelete : workbenchCopy.files.delete}
                              </button>
                              {pendingDelete ? (
                                <button
                                  type="button"
                                  className="studio-file-menu-cancel"
                                  aria-label={`${workbenchCopy.files.cancel} ${file.name}`}
                                  onClick={cancelDeleteWorkbenchFile}
                                >
                                  {workbenchCopy.files.cancel}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>;
};
