import { Activity, Archive, FlaskConical, FolderOpen, Gauge } from 'lucide-react';
import {
  formatWorkbenchLastOpenedAt,
  getWorkbenchFileKindLabel,
  type WorkbenchFileKindCopy,
} from './workbenchFilePresentation.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchFileKind, WorkbenchFileState } from './workbenchState.ts';

export interface WorkbenchEmptyWorkspaceCopy {
  menus: {
    openExperiment: string;
    noCachedExperiments: string;
  };
  files: WorkbenchFileKindCopy & {
    noOpenStudy: string;
    emptyTitle: string;
    emptyBody: string;
    createStandard: string;
    createIdeal: string;
    createHeatCapacity: string;
    createHeatCapacityPistonOscillation: string;
  };
}

interface WorkbenchEmptyWorkspaceProps {
  openableClosedFiles: WorkbenchFileState[];
  language: WorkbenchLanguagePreference;
  copy: WorkbenchEmptyWorkspaceCopy;
  onCreateFile: (kind: WorkbenchFileKind) => void;
  onOpenFile: (fileId: string) => void;
}

const renderFileIcon = (kind: WorkbenchFileKind) => (
  kind === 'standard'
    ? <Activity size={14} />
    : kind === 'ideal'
      ? <FlaskConical size={14} />
      : <Gauge size={14} />
);

export const WorkbenchEmptyWorkspace = ({
  openableClosedFiles,
  language,
  copy,
  onCreateFile,
  onOpenFile,
}: WorkbenchEmptyWorkspaceProps) => (
  <div className="studio-empty-workbench">
    <div>
      <span className="studio-empty-kicker">{copy.files.noOpenStudy}</span>
      <h2>{copy.files.emptyTitle}</h2>
      <p>{copy.files.emptyBody}</p>
      <div className="studio-empty-actions">
        <button
          type="button"
          className="studio-empty-command-row"
          data-workbench-create-experiment="ideal"
          onClick={() => onCreateFile('ideal')}
        >
          <FlaskConical size={14} />
          {copy.files.createIdeal}
        </button>
        <button
          type="button"
          className="studio-empty-command-row"
          data-workbench-create-experiment="heatCapacity"
          onClick={() => onCreateFile('heatCapacity')}
        >
          <Gauge size={14} />
          {copy.files.createHeatCapacity}
        </button>
        <button
          type="button"
          className="studio-empty-command-row"
          data-workbench-create-experiment="heatCapacityPistonOscillation"
          onClick={() => onCreateFile('heatCapacityPistonOscillation')}
        >
          <Gauge size={14} />
          {copy.files.createHeatCapacityPistonOscillation}
        </button>
        <button
          type="button"
          className="studio-empty-command-row"
          data-workbench-create-experiment="standard"
          onClick={() => onCreateFile('standard')}
        >
          <Activity size={14} />
          {copy.files.createStandard}
        </button>
      </div>
      <div className="studio-empty-open-actions">
        <div className="studio-empty-open-heading">
          <FolderOpen size={14} />
          <span>{copy.menus.openExperiment}</span>
        </div>
        <div className="studio-empty-open-list">
          {openableClosedFiles.length === 0 ? (
            <button type="button" className="studio-empty-command-row studio-empty-command-row-disabled" disabled>
              <Archive size={14} />
              <span>{copy.menus.noCachedExperiments}</span>
            </button>
          ) : openableClosedFiles.slice(0, 5).map((file) => (
            <button
              type="button"
              className="studio-empty-command-row studio-empty-open-row"
              key={file.id}
              onClick={() => onOpenFile(file.id)}
            >
              {renderFileIcon(file.kind)}
              <span>{file.name}</span>
              <span className="studio-empty-open-meta">
                <strong>{getWorkbenchFileKindLabel(file.kind, copy.files)}</strong>
                <time dateTime={new Date(file.lastOpenedAt).toISOString()}>
                  {formatWorkbenchLastOpenedAt(file.lastOpenedAt, language)}
                </time>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);
