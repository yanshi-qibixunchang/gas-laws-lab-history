import type React from 'react';
import {
  normalizeIdealWindowLayoutState,
  clampIdealResultHeightRatio,
} from './workbenchLayoutCompatibility.ts';
import {
  X,
} from 'lucide-react';

export interface WorkbenchIdealResultsRegionProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  workbenchLayoutDefaults: import('./workbenchLayoutCompatibility.ts').WorkbenchLayoutDefaults;
  idealResultWindowPanels: (import('./workbenchPanelDefinitions.tsx').PanelDefinition & { key: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey; })[];
  idealResultWindowRegionRef: React.MutableRefObject<HTMLDivElement>;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  selectedPanel: import('./workbenchFileState.ts').WorkbenchPanelKey;
  startIdealResultWindowResize: (event: React.MouseEvent<Element, MouseEvent>) => void;
  closeIdealResultsWindow: (recordUndo?: boolean) => void;
  setActiveIdealResultTab: (tab: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey) => void;
  closeIdealResultTab: (tab: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey) => void;
  renderPanelContent: (panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition) => React.ReactElement;
}

export const WorkbenchIdealResultsRegion = ({
  activeFile,
  workbenchLayoutDefaults,
  idealResultWindowPanels,
  idealResultWindowRegionRef,
  workbenchCopy,
  selectedPanel,
  startIdealResultWindowResize,
  closeIdealResultsWindow,
  setActiveIdealResultTab,
  closeIdealResultTab,
  renderPanelContent,
}: WorkbenchIdealResultsRegionProps) => {
    if (activeFile.kind !== 'ideal') return null;

    if (!activeFile.visiblePanels.includes('results')) return null;

    const layout = normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal);
    const activePanel = idealResultWindowPanels.find((panel) => panel.key === layout.activeIdealResultTab)
      ?? idealResultWindowPanels[0];
    const openIdealResultTabs = idealResultWindowPanels.filter((panel) => layout.openTabs.includes(panel.key));

    return (
      <div
        className="studio-ideal-results-region"
        ref={idealResultWindowRegionRef}
        aria-label={workbenchCopy.results.title}
      >
        <section
          className={`studio-ideal-result-window-layer ${selectedPanel === activePanel.key ? 'studio-ideal-result-window-selected' : ''}`}
          style={{ height: `${clampIdealResultHeightRatio(layout.heightRatio) * 100}%` }}
          aria-label={workbenchCopy.results.title}
        >
          <div
            className="studio-ideal-result-window-resizer"
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={startIdealResultWindowResize}
          />
          <div className="studio-results-toolbar studio-ideal-result-window-toolbar">
            <div className="studio-results-title">
              <strong>{workbenchCopy.results.title}</strong>
              <span>{activePanel.hint}</span>
            </div>
            <div className="studio-results-actions">
              <button
                type="button"
                aria-label={`${workbenchCopy.actions.close} ${workbenchCopy.results.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeIdealResultsWindow();
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-ideal-results-tabs" role="tablist" aria-label={workbenchCopy.results.idealResultsSectionsAria}>
            {openIdealResultTabs.map((panel) => (
              <button
                type="button"
                key={panel.key}
                role="tab"
                aria-selected={layout.activeIdealResultTab === panel.key}
                className={layout.activeIdealResultTab === panel.key ? 'studio-results-tab-active' : ''}
                onClick={() => setActiveIdealResultTab(panel.key)}
              >
                {panel.icon}
                <span>{panel.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="studio-results-tab-close"
                  aria-label={`${workbenchCopy.actions.close} ${panel.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeIdealResultTab(panel.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeIdealResultTab(panel.key);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
          <div className="studio-results-body">
            {renderPanelContent(activePanel)}
          </div>
        </section>
      </div>
    );
  };
