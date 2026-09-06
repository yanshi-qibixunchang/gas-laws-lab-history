

export interface WorkbenchStatusBarProps {
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  isWorkbenchEmpty: boolean;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  activePanelTitle: string;
  consoleSummary: { counts: Record<import('./workbenchConsolePresentation.ts').LogKind, number>; latest: import('./workbenchConsolePresentation.ts').ConsoleLog; runtime: string; };
}

export const WorkbenchStatusBar = ({
  workbenchCopy,
  isWorkbenchEmpty,
  activeFile,
  activePanelTitle,
  consoleSummary,
}: WorkbenchStatusBarProps) => {
  return <footer className="studio-status">
          <div className="studio-status-group">
            <span>{workbenchCopy.status.activeFile(isWorkbenchEmpty ? workbenchCopy.status.none : activeFile.name)}</span>
            <span>{workbenchCopy.status.selectedBlock(isWorkbenchEmpty ? workbenchCopy.status.none : activePanelTitle)}</span>
          </div>
          <div className="studio-status-group">
            <span>
              {consoleSummary.runtime}
            </span>
          </div>
        </footer>;
};
