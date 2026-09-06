import { HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO } from './workbenchLayoutConstants.ts';
import type React from 'react';
import {
  getHeatCapacityMaterialsWindowState,
} from './workbenchHeatCapacityMaterialsWindowCoordinator.ts';
import {
  type WorkbenchHeatCapacityTabId,
} from './workbenchFileState.ts';
import {
  type PanelDefinition,
} from './workbenchPanelDefinitions.tsx';
import {
  X,
} from 'lucide-react';

export interface WorkbenchHeatCapacityMaterialsWindowProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  getHeatCapacityTabDefinition: (tabId: import('./workbenchFileState.ts').WorkbenchHeatCapacityTabId) => import('./workbenchPanelDefinitions.tsx').PanelDefinition;
  getHeatCapacityMaterialsMaxHeightRatio: () => number;
  clamp: (value: number, min: number, max: number) => number;
  startHeatCapacityMaterialsResize: (event: React.MouseEvent<Element, MouseEvent>) => void;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  activeHeatCapacityCalculationHint: string;
  closeHeatCapacityMaterialsWindow: () => void;
  activeHeatCapacityMaterialsTabsAria: string;
  activateHeatCapacityTab: (requestedTabId: import('./workbenchFileState.ts').WorkbenchHeatCapacityTabId) => void;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  closeHeatCapacityTab: (requestedTabId: import('./workbenchFileState.ts').WorkbenchHeatCapacityTabId, recordUndo?: boolean) => void;
  renderPanelContent: (panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition) => React.ReactElement;
}

export const WorkbenchHeatCapacityMaterialsWindow = ({
  activeFile,
  getHeatCapacityTabDefinition,
  getHeatCapacityMaterialsMaxHeightRatio,
  clamp,
  startHeatCapacityMaterialsResize,
  heatCapacityRealtimeCopy,
  activeHeatCapacityCalculationHint,
  closeHeatCapacityMaterialsWindow,
  activeHeatCapacityMaterialsTabsAria,
  activateHeatCapacityTab,
  workbenchCopy,
  closeHeatCapacityTab,
  renderPanelContent,
}: WorkbenchHeatCapacityMaterialsWindowProps) => {
    if (activeFile.kind !== 'heatCapacity') return null;
    const windowState = getHeatCapacityMaterialsWindowState(activeFile);
    if (!windowState) return null;
    const openTabs = windowState.openTabs
      .map((tabId) => {
        const panel = getHeatCapacityTabDefinition(tabId);
        return panel ? { tabId, panel } : null;
      })
      .filter((item): item is { tabId: WorkbenchHeatCapacityTabId; panel: PanelDefinition } => item !== null);
    if (openTabs.length === 0) return null;
    const activeTabId = windowState.activeTabId;
    const activePanel = openTabs.find((item) => item.tabId === activeTabId)?.panel ?? openTabs[0].panel;
    const materialsMaxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio();
    const materialsHeightRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      materialsMaxHeightRatio,
    );

    return (
      <div
        className="studio-results-region studio-heat-materials-region"
        style={{ height: `${materialsHeightRatio * 100}%` }}
        data-heat-capacity-materials-window="true"
      >
        <div
          className="studio-results-window-resizer"
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={startHeatCapacityMaterialsResize}
        />
        <section className="studio-dock-panel studio-optional-panel studio-results-window studio-heat-materials-window">
        <div className="studio-results-toolbar studio-heat-materials-toolbar">
          <div className="studio-results-title">
              <strong>{heatCapacityRealtimeCopy.materialsTitle}</strong>
              <span>{activeHeatCapacityCalculationHint}</span>
            </div>
            <div className="studio-results-actions">
              <button
                type="button"
                aria-label={heatCapacityRealtimeCopy.closeMaterialsAria}
                onClick={(event) => {
                  event.stopPropagation();
                  closeHeatCapacityMaterialsWindow();
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-heat-materials-tabs" role="tablist" aria-label={activeHeatCapacityMaterialsTabsAria}>
            {openTabs.map(({ tabId, panel }) => (
              <button
                type="button"
                key={tabId}
                role="tab"
                aria-selected={tabId === activeTabId}
                className={tabId === activeTabId ? 'studio-results-tab-active' : ''}
                onClick={() => activateHeatCapacityTab(tabId)}
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
                    closeHeatCapacityTab(tabId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeHeatCapacityTab(tabId);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
          <div className="studio-results-body studio-heat-materials-body">
            {renderPanelContent(activePanel)}
          </div>
        </section>
      </div>
    );
  };
