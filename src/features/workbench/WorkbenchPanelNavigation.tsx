import {
  isIdealResultWindowKey,
} from './workbenchLayoutCompatibility.ts';
import {
  LOCKED_PANEL_KEYS,
} from './workbenchPanelAvailability.ts';
import React from 'react';
import {
  ChevronRight,
  LockKeyhole,
} from 'lucide-react';

export interface WorkbenchPanelNavigationProps {
  renderSectionTitle: (label: string, collapsed: boolean, onToggle: () => void, kind?: "files" | "panels") => React.ReactElement;
  isWorkbenchEmpty: boolean;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  panelsSectionCollapsed: boolean;
  setPanelsSectionCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  renderHeatCapacityPanelTree: () => React.ReactElement;
  renderPistonOscillationPanelTree: () => React.ReactElement;
  availablePanels: import('./workbenchPanelDefinitions.tsx').PanelDefinition[];
  isWindowPanelVisible: (panel: import('./workbenchFileState.ts').WorkbenchPanelKey) => boolean;
  selectedPanel: import('./workbenchFileState.ts').WorkbenchPanelKey;
  setSelectedPanel: React.Dispatch<React.SetStateAction<import('./workbenchFileState.ts').WorkbenchPanelKey>>;
  handleLockedPanel: (title: string) => void;
  openIdealResultsWindow: (tab?: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey, openAllTabs?: boolean, replaceOpenTabs?: boolean) => void;
  openPanel: (panel: import('./workbenchFileState.ts').WorkbenchPanelKey) => void;
  handleSectionKeyDown: (event: React.KeyboardEvent<Element>, action: () => void) => void;
  openStandardResultsWindow: (tab?: import('./workbenchFileState.ts').WorkbenchStandardResultsTab, openAllTabs?: boolean, replaceOpenTabs?: boolean) => void;
  resultsChildrenCollapsed: boolean;
  setResultsChildrenCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  idealResultWindowPanels: (import('./workbenchPanelDefinitions.tsx').PanelDefinition & { key: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey; })[];
  openIdealResultWindow: (panel: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey) => void;
  getLocalizedTreeState: (state: "active" | "off" | "open" | "locked" | "shown") => string;
  getIdealResultTabState: (tab: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey) => import('./workbenchResultsWindowCoordinator.ts').WorkbenchResultsTabState;
  resultsSections: { key: import('./workbenchFileState.ts').WorkbenchStandardResultsTab; title: string; icon: React.ReactNode; }[];
  getStandardResultsTabState: (tab: import('./workbenchFileState.ts').WorkbenchStandardResultsTab) => import('./workbenchResultsWindowCoordinator.ts').WorkbenchResultsTabState;
  selectResultsSection: (section: import('./workbenchFileState.ts').WorkbenchStandardResultsTab, openResults?: boolean) => void;
}

export const WorkbenchPanelNavigation = ({
  renderSectionTitle,
  isWorkbenchEmpty,
  workbenchCopy,
  activeFile,
  panelsSectionCollapsed,
  setPanelsSectionCollapsed,
  renderHeatCapacityPanelTree,
  renderPistonOscillationPanelTree,
  availablePanels,
  isWindowPanelVisible,
  selectedPanel,
  setSelectedPanel,
  handleLockedPanel,
  openIdealResultsWindow,
  openPanel,
  handleSectionKeyDown,
  openStandardResultsWindow,
  resultsChildrenCollapsed,
  setResultsChildrenCollapsed,
  idealResultWindowPanels,
  openIdealResultWindow,
  getLocalizedTreeState,
  getIdealResultTabState,
  resultsSections,
  getStandardResultsTabState,
  selectResultsSection,
}: WorkbenchPanelNavigationProps) => {
  return <section className="studio-tree-section">
                {renderSectionTitle(
                  isWorkbenchEmpty
                    ? workbenchCopy.files.panels
                    : activeFile.kind === 'heatCapacity' || activeFile.kind === 'heatCapacityPistonOscillation'
                      ? `${activeFile.name.toUpperCase()} / PANELS`
                      : `${activeFile.name} / ${workbenchCopy.files.panels}`,
                  panelsSectionCollapsed,
                  () => setPanelsSectionCollapsed((current) => !current),
                  'panels',
                )}
                <div className={`studio-tree-section-content ${panelsSectionCollapsed ? 'studio-tree-section-content-collapsed' : ''}`} aria-hidden={panelsSectionCollapsed}>
                {isWorkbenchEmpty ? (
                  <div className="studio-empty-panel-tree">
                    <span>{workbenchCopy.files.noOpenPanelState}</span>
                  </div>
                ) : activeFile.kind === 'heatCapacity' ? (
                  renderHeatCapacityPanelTree()
                ) : activeFile.kind === 'heatCapacityPistonOscillation' ? (
                  renderPistonOscillationPanelTree()
                ) : availablePanels.filter((panel) => !(activeFile.kind === 'ideal' && isIdealResultWindowKey(panel.key))).map((panel) => {
                  const visible = isWindowPanelVisible(panel.key);
                  const locked = LOCKED_PANEL_KEYS.includes(panel.key);
                  return (
                    <React.Fragment key={panel.key}>
                      <div
                        role="button"
                        tabIndex={panelsSectionCollapsed ? -1 : 0}
                        className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-panel-row-active' : ''}`}
                        onClick={() => {
                          if (panelsSectionCollapsed) return;
                          setSelectedPanel(panel.key);
                          if (locked) handleLockedPanel(panel.title);
                        }}
                        onDoubleClick={() => {
                          if (panelsSectionCollapsed) return;
                          if (locked) {
                            handleLockedPanel(panel.title);
                          } else if (panel.key === 'results' && activeFile.kind === 'ideal') {
                            openIdealResultsWindow('experimentPoints', true);
                          } else {
                            openPanel(panel.key);
                          }
                        }}
                        onKeyDown={(event) => handleSectionKeyDown(event, () => {
                          if (locked) {
                            setSelectedPanel(panel.key);
                            handleLockedPanel(panel.title);
                          } else if (panel.key === 'results') {
                            if (activeFile.kind === 'ideal') {
                              openIdealResultsWindow('experimentPoints', true);
                            } else {
                              openStandardResultsWindow('summary', true);
                            }
                          } else {
                            openPanel(panel.key);
                          }
                        })}
                        data-prompt-tooltip={
                          locked
                            ? panel.hint
                            : panel.key === 'results'
                              ? `${panel.hint}. ${workbenchCopy.results.resultsOpenHint}`
                              : `${panel.hint}. ${workbenchCopy.results.resultsJumpHint}`
                        }
                      >
                        {panel.key === 'results' ? (
                          <button
                            type="button"
                            className={`studio-results-folder-button ${resultsChildrenCollapsed ? 'studio-tree-title-collapsed' : ''}`}
                            aria-label={resultsChildrenCollapsed ? workbenchCopy.results.resultsTreeExpandAria : workbenchCopy.results.resultsTreeCollapseAria}
                            aria-expanded={!resultsChildrenCollapsed}
                            tabIndex={panelsSectionCollapsed ? -1 : 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setResultsChildrenCollapsed((current) => !current);
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              if (activeFile.kind === 'ideal') {
                                openIdealResultsWindow('experimentPoints', true);
                              } else {
                                openStandardResultsWindow('summary', true);
                              }
                            }}
                          >
                            <span className="studio-results-expander-icon">
                              <ChevronRight size={13} />
                            </span>
                            <span className="studio-results-folder-label">{panel.title}</span>
                          </button>
                        ) : (
                          <>
                            {panel.icon}
                            <span>{panel.title}</span>
                          </>
                        )}
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
                        ) : (
                          <span className="studio-tree-meta">{visible ? workbenchCopy.files.shown : workbenchCopy.files.off}</span>
                        )}
                      </div>
                      {panel.key === 'results' && activeFile.kind === 'ideal' && !resultsChildrenCollapsed ? (
                        <div className="studio-results-nav studio-results-child-nav studio-ideal-results-nav">
                          {idealResultWindowPanels.map((childPanel) => (
                            <button
                              type="button"
                              key={childPanel.key}
                              className={selectedPanel === childPanel.key ? 'studio-results-nav-active studio-panel-row-active' : ''}
                              tabIndex={panelsSectionCollapsed ? -1 : 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPanel(childPanel.key);
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                openIdealResultWindow(childPanel.key);
                              }}
                              data-prompt-tooltip={workbenchCopy.results.openIdealResultsTabTitle}
                            >
                              {childPanel.icon}
                              <span>{childPanel.title}</span>
                              <span className="studio-tree-meta">
                                {getLocalizedTreeState(getIdealResultTabState(childPanel.key))}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {panel.key === 'results' && activeFile.kind === 'standard' && !resultsChildrenCollapsed ? (
                        <div className="studio-results-nav studio-results-child-nav">
                          {resultsSections.map((section) => (
                            <button
                              type="button"
                              key={section.key}
                              className={getStandardResultsTabState(section.key) === 'active' && selectedPanel === 'results' ? 'studio-results-nav-active studio-panel-row-active' : ''}
                              tabIndex={panelsSectionCollapsed ? -1 : 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPanel('results');
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                selectResultsSection(section.key, true);
                              }}
                              data-prompt-tooltip={workbenchCopy.results.resultsJumpHint}
                            >
                              {section.icon}
                              <span>{section.title}</span>
                              <span className="studio-tree-meta">{getLocalizedTreeState(getStandardResultsTabState(section.key))}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                </div>
              </section>;
};
