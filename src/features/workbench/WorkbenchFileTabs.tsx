import type React from 'react';
import {
  isExperimentTutorialFileId,
} from '../learning/workbenchTutorialCoordinator.ts';
import {
  Activity,
  FlaskConical,
  Gauge,
  LockKeyhole,
  X,
} from 'lucide-react';
import {
  getWorkbenchFileKindLabel,
} from './workbenchFilePresentation.ts';

export interface WorkbenchFileTabsProps {
  fileTabsRef: React.MutableRefObject<HTMLDivElement>;
  isWorkbenchEmpty: boolean;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  files: import('./workbenchFileUnion.ts').WorkbenchFileState[];
  selectedFileId: string;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  selectFile: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  requestCloseWorkbenchFile: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
}

export const WorkbenchFileTabs = ({
  fileTabsRef,
  isWorkbenchEmpty,
  workbenchCopy,
  files,
  selectedFileId,
  activeFile,
  selectFile,
  requestCloseWorkbenchFile,
}: WorkbenchFileTabsProps) => {
  return <div className="studio-file-tabs" ref={fileTabsRef}>
              {isWorkbenchEmpty ? (
                <div className="studio-file-tabs-empty">{workbenchCopy.files.noOpenFiles}</div>
              ) : files.map((file) => {
                const tutorialFile = isExperimentTutorialFileId(file.id);
                return (
                <div
                  key={file.id}
                  className={`studio-file-tab ${file.id === selectedFileId ? 'studio-file-tab-selected' : ''} ${file.id === activeFile.id ? 'studio-file-tab-active' : ''}`}
                >
                  <button
                    type="button"
                    className="studio-file-tab-select"
                    onClick={() => selectFile(file)}
                    data-prompt-tooltip={file.name}
                  >
                    {file.kind === 'standard' ? <Activity size={13} /> : file.kind === 'ideal' ? <FlaskConical size={13} /> : <Gauge size={13} />}
                    <span className="studio-file-tab-name">{file.name}</span>
                    {tutorialFile ? <LockKeyhole size={11} className="studio-tutorial-file-lock" aria-hidden="true" /> : null}
                    <span className="studio-file-kind">{getWorkbenchFileKindLabel(file.kind, workbenchCopy.files)}</span>
                  </button>
                  {!tutorialFile ? <button
                    type="button"
                    className="studio-file-tab-close"
                    aria-label={`${workbenchCopy.files.closeExperiment} ${file.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestCloseWorkbenchFile(file);
                    }}
                  >
                    <X size={12} />
                  </button> : null}
                </div>
                );
              })}
            </div>;
};
