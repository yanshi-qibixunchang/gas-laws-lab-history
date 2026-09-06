import type React from 'react';
import {
  getPistonOscillationMaterialsPanelOrder,
} from './workbenchHeatCapacityTabRegistry.ts';
import {
  type PanelDefinition,
} from './workbenchPanelDefinitions.tsx';
import {
  LockKeyhole,
  ChevronRight,
} from 'lucide-react';

export interface WorkbenchPistonOscillationPanelTreeProps {
  togglePistonOscillationMaterialsExpanded: () => void;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  availablePanels: import('./workbenchPanelDefinitions.tsx').PanelDefinition[];
  selectedPanel: import('./workbenchFileState.ts').WorkbenchPanelKey;
  pistonOscillationDataProcessingReviewOpen: boolean;
  pistonOscillationCalculationReviewOpen: boolean;
  pistonOscillationProcessReviewOpen: boolean;
  panelsSectionCollapsed: boolean;
  setSelectedPanel: React.Dispatch<React.SetStateAction<import('./workbenchFileState.ts').WorkbenchPanelKey>>;
  handleLockedPanel: (title: string) => void;
  handleSectionKeyDown: (event: React.KeyboardEvent<Element>, action: () => void) => void;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  isWindowPanelVisible: (panel: import('./workbenchFileState.ts').WorkbenchPanelKey) => boolean;
  openPistonOscillationDataProcessingReview: () => void;
  openPistonOscillationProcessReview: () => void;
  openPanel: (panel: import('./workbenchFileState.ts').WorkbenchPanelKey) => void;
}

export const WorkbenchPistonOscillationPanelTree = ({
  togglePistonOscillationMaterialsExpanded,
  activeFile,
  availablePanels,
  selectedPanel,
  pistonOscillationDataProcessingReviewOpen,
  pistonOscillationCalculationReviewOpen,
  pistonOscillationProcessReviewOpen,
  panelsSectionCollapsed,
  setSelectedPanel,
  handleLockedPanel,
  handleSectionKeyDown,
  workbenchCopy,
  heatCapacityRealtimeCopy,
  isWindowPanelVisible,
  openPistonOscillationDataProcessingReview,
  openPistonOscillationProcessReview,
  openPanel,
}: WorkbenchPistonOscillationPanelTreeProps) => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') return null;
    const previewPanel = availablePanels.find((panel) => panel.key === 'preview');
    const realtimePanel = availablePanels.find((panel) => panel.key === 'realtime');
    const materialsPanels = getPistonOscillationMaterialsPanelOrder(activeFile)
      .map((panelKey) => availablePanels.find((panel) => panel.key === panelKey))
      .filter((panel): panel is PanelDefinition => Boolean(panel));
    const materialsSelected = materialsPanels.some((panel) => panel.key === selectedPanel);
    const materialsOpen = pistonOscillationDataProcessingReviewOpen
      || pistonOscillationCalculationReviewOpen
      || pistonOscillationProcessReviewOpen;
    const toggleMaterialsExpanded = () => {
      if (panelsSectionCollapsed) return;
      togglePistonOscillationMaterialsExpanded();
    };

    return (
      <>
        {[previewPanel, realtimePanel]
          .filter((panel): panel is PanelDefinition => Boolean(panel))
          .map((panel) => (
            <div
              role="button"
              tabIndex={panelsSectionCollapsed ? -1 : 0}
              key={panel.key}
              className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-panel-row-active' : ''}`}
              onClick={() => {
                if (panelsSectionCollapsed) return;
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              }}
              onDoubleClick={() => {
                if (!panelsSectionCollapsed) handleLockedPanel(panel.title);
              }}
              onKeyDown={(event) => handleSectionKeyDown(event, () => {
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              })}
              data-prompt-tooltip={panel.hint}
            >
              {panel.icon}
              <span>{panel.title}</span>
              <button
                type="button"
                className="studio-panel-lock-button"
                aria-label={`${panel.title} ${workbenchCopy.files.locked}`}
                tabIndex={panelsSectionCollapsed ? -1 : 0}
                onClick={(event) => {
                  event.stopPropagation();
                  handleLockedPanel(panel.title);
                }}
              >
                <LockKeyhole size={12} />
                {workbenchCopy.files.locked}
              </button>
            </div>
          ))}
        {materialsPanels.length > 0 ? (
          <>
          <div
          role="button"
          tabIndex={panelsSectionCollapsed ? -1 : 0}
          className={`studio-tree-row studio-tree-row-child studio-heat-materials-group ${materialsSelected ? 'studio-panel-row-active' : ''}`}
          aria-expanded={activeFile.pistonOscillationMaterialsExpanded}
          onClick={toggleMaterialsExpanded}
          onKeyDown={(event) => handleSectionKeyDown(event, toggleMaterialsExpanded)}
          data-prompt-tooltip={heatCapacityRealtimeCopy.materialsFolderTitle}
        >
          <span
            className={`studio-results-folder-button ${!activeFile.pistonOscillationMaterialsExpanded ? 'studio-tree-title-collapsed' : ''}`}
            aria-hidden="true"
          >
            <span className="studio-results-expander-icon">
              <ChevronRight size={13} />
            </span>
          </span>
          <span className="studio-results-folder-label">
            {heatCapacityRealtimeCopy.materialsTitle}
          </span>
          <span className="studio-tree-meta">
            {materialsOpen ? workbenchCopy.files.active : workbenchCopy.files.off}
          </span>
        </div>
          {activeFile.pistonOscillationMaterialsExpanded ? (
          <div className="studio-results-nav studio-heat-materials-nav">
            {materialsPanels.map((panel) => {
              const visible = panel.key === 'heatCapacityGuide'
                ? pistonOscillationDataProcessingReviewOpen
                  || pistonOscillationCalculationReviewOpen
                : panel.key === 'heatCapacityReview'
                  ? pistonOscillationProcessReviewOpen
                : isWindowPanelVisible(panel.key);
              const openMaterialPanel = () => {
                if (panel.key === 'heatCapacityGuide') {
                  openPistonOscillationDataProcessingReview();
                } else if (panel.key === 'heatCapacityReview') {
                  openPistonOscillationProcessReview();
                } else {
                  openPanel(panel.key);
                }
              };
              return (
                <button
                  type="button"
                  key={panel.key}
                  className={selectedPanel === panel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPanel(panel.key);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    openMaterialPanel();
                  }}
                  onKeyDown={(event) => handleSectionKeyDown(event, openMaterialPanel)}
                  data-prompt-tooltip={panel.hint}
                >
                  {panel.icon}
                  <span>{panel.title}</span>
                  <span className="studio-tree-meta">
                    {visible ? workbenchCopy.files.shown : workbenchCopy.files.off}
                  </span>
                </button>
              );
            })}
          </div>
          ) : null}
          </>
        ) : null}
      </>
    );
  };
