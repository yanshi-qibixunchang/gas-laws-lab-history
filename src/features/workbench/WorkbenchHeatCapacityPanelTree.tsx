import type React from 'react';
import {
  getHeatCapacityMaterialsTabOrder,
  heatCapacityTabIdToPanelKey,
} from './workbenchHeatCapacityTabRegistry.ts';
import {
  type WorkbenchHeatCapacityTabId,
} from './workbenchFileState.ts';
import {
  type PanelDefinition,
} from './workbenchPanelDefinitions.tsx';
import {
  LOCKED_PANEL_KEYS,
} from './workbenchPanelAvailability.ts';
import {
  LockKeyhole,
  ChevronRight,
} from 'lucide-react';

export interface WorkbenchHeatCapacityPanelTreeProps {
  toggleHeatCapacityMaterialsExpanded: () => void;
  availablePanels: import('./workbenchPanelDefinitions.tsx').PanelDefinition[];
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  getHeatCapacityPanelDisplayDefinition: (tabId: import('./workbenchFileState.ts').WorkbenchHeatCapacityTabId, panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition) => import('./workbenchPanelDefinitions.tsx').PanelDefinition;
  selectedPanel: import('./workbenchFileState.ts').WorkbenchPanelKey;
  panelsSectionCollapsed: boolean;
  setSelectedPanel: React.Dispatch<React.SetStateAction<import('./workbenchFileState.ts').WorkbenchPanelKey>>;
  handleLockedPanel: (title: string) => void;
  handleSectionKeyDown: (event: React.KeyboardEvent<Element>, action: () => void) => void;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  openAllHeatCapacityMaterialsTabs: () => void;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  getHeatCapacityTabState: (tabId: import('./workbenchFileState.ts').WorkbenchHeatCapacityTabId) => import('./workbenchHeatCapacityMaterialsWindowCoordinator.ts').WorkbenchHeatCapacityMaterialsTabState;
  openHeatCapacityTab: (requestedTabId: import('./workbenchFileState.ts').WorkbenchHeatCapacityTabId, recordUndo?: boolean) => void;
  getLocalizedTreeState: (state: "active" | "off" | "open" | "locked" | "shown") => string;
}

export const WorkbenchHeatCapacityPanelTree = ({
  toggleHeatCapacityMaterialsExpanded,
  availablePanels,
  activeFile,
  getHeatCapacityPanelDisplayDefinition,
  selectedPanel,
  panelsSectionCollapsed,
  setSelectedPanel,
  handleLockedPanel,
  handleSectionKeyDown,
  workbenchCopy,
  openAllHeatCapacityMaterialsTabs,
  heatCapacityRealtimeCopy,
  getHeatCapacityTabState,
  openHeatCapacityTab,
  getLocalizedTreeState,
}: WorkbenchHeatCapacityPanelTreeProps) => {
    const previewPanel = availablePanels.find((panel) => panel.key === 'preview');
    const realtimePanel = availablePanels.find((panel) => panel.key === 'realtime');
    const materialPanels = getHeatCapacityMaterialsTabOrder(activeFile)
      .map((tabId) => {
        const panel = availablePanels.find((item) => item.key === heatCapacityTabIdToPanelKey(tabId));
        return panel ? { tabId, panel: getHeatCapacityPanelDisplayDefinition(tabId, panel) } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => Boolean(item.panel));
    const materialsSelected = selectedPanel === 'results';
    const allowedMaterialTabIds = materialPanels.map(({ tabId }) => tabId);
    const materialsOpen = activeFile.kind === 'heatCapacity'
      && activeFile.openHeatCapacityTabs.some((tabId) => allowedMaterialTabIds.includes(tabId));
    const topPanels = [previewPanel, realtimePanel].filter((panel): panel is PanelDefinition => Boolean(panel));

    return (
      <>
        {topPanels.map((panel) => {
          const locked = LOCKED_PANEL_KEYS.includes(panel.key);
          return (
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
                if (panelsSectionCollapsed) return;
                handleLockedPanel(panel.title);
              }}
              onKeyDown={(event) => handleSectionKeyDown(event, () => {
                setSelectedPanel(panel.key);
                handleLockedPanel(panel.title);
              })}
              data-prompt-tooltip={panel.hint}
            >
              {panel.icon}
              <span>{panel.title}</span>
              {locked ? (
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
              ) : null}
            </div>
          );
        })}
        {materialPanels.length > 0 ? (
          <>
          <div
          role="button"
          tabIndex={panelsSectionCollapsed ? -1 : 0}
          className={`studio-tree-row studio-tree-row-child studio-heat-materials-group ${materialsSelected ? 'studio-panel-row-active' : ''}`}
          onClick={() => {
            if (panelsSectionCollapsed) return;
            setSelectedPanel('results');
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            openAllHeatCapacityMaterialsTabs();
          }}
          onKeyDown={(event) => handleSectionKeyDown(event, () => {
            setSelectedPanel('results');
          })}
          data-prompt-tooltip={heatCapacityRealtimeCopy.materialsFolderTitle}
        >
          <button
            type="button"
            className={`studio-results-folder-button ${activeFile.kind === 'heatCapacity' && !activeFile.heatCapacityMaterialsExpanded ? 'studio-tree-title-collapsed' : ''}`}
            aria-expanded={activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMaterialsExpanded : true}
            aria-label={heatCapacityRealtimeCopy.materialsGroupAria}
            onClick={(event) => {
              event.stopPropagation();
              if (activeFile.kind !== 'heatCapacity') return;
              toggleHeatCapacityMaterialsExpanded();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            <span className="studio-results-expander-icon">
              <ChevronRight size={13} />
            </span>
          </button>
          <span
            className="studio-results-folder-label"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPanel('results');
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              openAllHeatCapacityMaterialsTabs();
            }}
          >
            {heatCapacityRealtimeCopy.materialsTitle}
          </span>
          <span className="studio-tree-meta">{materialsOpen ? workbenchCopy.files.active : workbenchCopy.files.off}</span>
        </div>
          {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMaterialsExpanded ? (
          <div className="studio-results-nav studio-heat-materials-nav">
            {materialPanels.map(({ tabId, panel }) => {
              const state = getHeatCapacityTabState(tabId);
              return (
                <button
                  type="button"
                  key={tabId}
                  className={selectedPanel === panel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                  tabIndex={panelsSectionCollapsed ? -1 : 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPanel(panel.key);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    openHeatCapacityTab(tabId);
                  }}
                  data-prompt-tooltip={heatCapacityRealtimeCopy.materialsTabTitle}
                >
                  {panel.icon}
                  <span>{panel.title}</span>
                  <span className="studio-tree-meta">{getLocalizedTreeState(state)}</span>
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
