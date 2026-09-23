import type React from 'react';
import {
  FileArchive,
  Download,
  X,
} from 'lucide-react';
import {
  WorkbenchStandardResultsSummary,
  WorkbenchStandardResultsDataTable,
} from './WorkbenchStandardResultsContent.tsx';
import {
  WorkbenchStandardFiguresPanel,
} from './WorkbenchStandardFiguresPanel.tsx';

export interface WorkbenchStandardResultsWindowProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  resultSummary: import('./workbenchResults.ts').WorkbenchResultSummary;
  isExportModeDataReady: (mode: import('./workbenchResults.ts').WorkbenchExportMode) => boolean;
  exportInProgress: boolean;
  handleExportAction: (mode: import('./workbenchResults.ts').WorkbenchExportMode, heatCapacityGroupIds?: readonly string[]) => Promise<void>;
  closePanel: (panel: import('./workbenchFileState.ts').WorkbenchPanelKey, recordUndo?: boolean) => void;
  resultsSections: { key: import('./workbenchFileState.ts').WorkbenchStandardResultsTab; title: string; icon: React.ReactNode; }[];
  standardResultsLayout: import('./workbenchFileState.ts').WorkbenchStandardResultsLayout;
  setActiveStandardResultsTab: (tab: import('./workbenchFileState.ts').WorkbenchStandardResultsTab) => void;
  closeStandardResultsTab: (tab: import('./workbenchFileState.ts').WorkbenchStandardResultsTab) => void;
  figureSpecs: import('./workbenchResults.ts').WorkbenchFigureSpec[];
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
}

export const WorkbenchStandardResultsWindow = ({
  activeFile,
  workbenchCopy,
  resultSummary,
  isExportModeDataReady,
  exportInProgress,
  handleExportAction,
  closePanel,
  resultsSections,
  standardResultsLayout,
  setActiveStandardResultsTab,
  closeStandardResultsTab,
  figureSpecs,
  settingsLanguagePreference,
}: WorkbenchStandardResultsWindowProps) => {
    if (activeFile.kind === 'ideal') {
      return (
        <div className="studio-empty">
          <div>
            <strong>{workbenchCopy.results.title}</strong>
            <p>{workbenchCopy.panels.pointsTitle} / {workbenchCopy.panels.verificationTitle}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="studio-results-panel">
        <div className="studio-results-toolbar">
          <div className="studio-results-title">
            <strong>{workbenchCopy.results.title}</strong>
            <span>
              {resultSummary.ready ? workbenchCopy.results.ready : workbenchCopy.results.notReady}
            </span>
          </div>
          <div className="studio-results-actions">
            <button
              type="button"
              disabled={!isExportModeDataReady('completeBundle') || exportInProgress}
              onClick={() => handleExportAction('completeBundle')}
            >
              <FileArchive size={13} />
              {workbenchCopy.results.exportAll}
            </button>
            <button
              type="button"
              disabled={!isExportModeDataReady('report') || exportInProgress}
              onClick={() => handleExportAction('report')}
            >
              <Download size={13} />
              {workbenchCopy.results.reportPdf}
            </button>
            <button
              type="button"
              disabled={!isExportModeDataReady('tablesCsv') || exportInProgress}
              onClick={() => handleExportAction('tablesCsv')}
            >
              <Download size={13} />
              {workbenchCopy.results.exportTables}
            </button>
            <button
              type="button"
              aria-label={`${workbenchCopy.actions.close} ${workbenchCopy.results.title}`}
              onClick={(event) => {
                event.stopPropagation();
                closePanel('results');
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="studio-results-tabs" role="tablist" aria-label={workbenchCopy.results.title}>
          {(() => {
            const openStandardResultTabs = resultsSections.filter((section) => standardResultsLayout.openTabs.includes(section.key));
            return openStandardResultTabs.map((section) => (
              <button
              type="button"
              key={section.key}
              className={standardResultsLayout.activeTab === section.key ? 'studio-results-tab-active' : ''}
              onClick={() => setActiveStandardResultsTab(section.key)}
              role="tab"
              aria-selected={standardResultsLayout.activeTab === section.key}
            >
              {section.icon}
              <span>{section.title}</span>
              <span
                role="button"
                tabIndex={0}
                className="studio-results-tab-close"
                aria-label={`${workbenchCopy.actions.close} ${section.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeStandardResultsTab(section.key);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    closeStandardResultsTab(section.key);
                  }
                }}
              >
                <X size={12} />
              </span>
            </button>
            ));
          })()}
        </div>

        <div className="studio-results-body">
          {standardResultsLayout.activeTab === 'summary' ? (
            <WorkbenchStandardResultsSummary
              resultSummary={resultSummary}
              workbenchCopy={workbenchCopy}
            />
          ) : null}
          {standardResultsLayout.activeTab === 'dataTable' ? (
            <WorkbenchStandardResultsDataTable
              resultSummary={resultSummary}
              workbenchCopy={workbenchCopy}
            />
          ) : null}
          {standardResultsLayout.activeTab === 'figures' ? (
            <WorkbenchStandardFiguresPanel
              file={activeFile}
              figureSpecs={figureSpecs}
              resultSummary={resultSummary}
              language={settingsLanguagePreference}
              workbenchCopy={workbenchCopy}
              exportInProgress={exportInProgress}
              figuresExportReady={isExportModeDataReady('figuresZip')}
              onExportFigures={() => {
                void handleExportAction('figuresZip');
              }}
            />
          ) : null}
        </div>
      </div>
    );
  };
