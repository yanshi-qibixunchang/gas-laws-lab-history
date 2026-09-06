import type React from 'react';
import {
  WorkbenchEmptyWorkspace,
} from './WorkbenchEmptyWorkspace.tsx';
import {
  getPistonOscillationGuideStrongDimPath,
} from './workbenchPistonGuideMaskGeometry.ts';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';
import {
  clampIdealResultHeightRatio,
} from './workbenchLayoutCompatibility.ts';

export interface WorkbenchCenterWorkspaceProps {
  isWorkbenchEmpty: boolean;
  activePistonOscillationExpandedRealtime: boolean;
  resultsPanel: import('./workbenchPanelDefinitions.tsx').PanelDefinition;
  idealResultPanels: (import('./workbenchPanelDefinitions.tsx').PanelDefinition & { key: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey; })[];
  activeHeatCapacityMaterialsWindowOpen: boolean;
  centerWorkspaceRef: React.MutableRefObject<HTMLDivElement>;
  openableClosedFiles: import('./workbenchFileUnion.ts').WorkbenchFileState[];
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  createFile: (kind: "heatCapacity" | "standard" | "ideal" | "heatCapacityPistonOscillation") => void;
  openClosedWorkbenchFile: (fileId: string) => void;
  liveWorkspaceResizing: boolean;
  liveWorkspaceStyle: React.CSSProperties & Record<"--studio-live-preview-ratio" | "--studio-live-realtime-ratio" | "--studio-live-resize-ghost-x", string>;
  liveWorkspaceRef: React.MutableRefObject<HTMLDivElement>;
  pistonOscillationGuideStrongReminderActive: boolean;
  pistonGuideExpectedStrongTargetId: import('../pistonOscillation/pistonOscillationGuidePresentation.ts').PistonOscillationGuideStrongTargetId;
  pistonGuideStrongTargetContext: string;
  pistonOscillationGuidePulseElapsedMs: number;
  primaryPanels: import('./workbenchPanelDefinitions.tsx').PanelDefinition[];
  renderDockPanel: (panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition, optional?: boolean) => React.ReactElement;
  startLiveWorkspaceResize: (event: React.PointerEvent<HTMLButtonElement>) => void;
  liveWorkspaceResizeGhostRef: React.MutableRefObject<HTMLDivElement>;
  auxiliaryPanels: import('./workbenchPanelDefinitions.tsx').PanelDefinition[];
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  pistonGuideStrongTargetId: import('../pistonOscillation/pistonOscillationGuidePresentation.ts').PistonOscillationGuideStrongTargetId;
  pistonOscillationGuideStrongMaskLayout: import('./workbenchPistonGuideMaskGeometry.ts').PistonOscillationGuideStrongMaskLayout;
  pistonGuideStrongReminderText: string;
  pistonOscillationGuideLessonOverlay: React.ReactElement;
  standardResultsLayout: import('./workbenchFileState.ts').WorkbenchStandardResultsLayout;
  startStandardResultsResize: (event: React.MouseEvent<Element, MouseEvent>) => void;
  renderIdealResultWindows: () => React.ReactElement;
  renderHeatCapacityMaterialsWindow: () => React.ReactElement;
}

export const WorkbenchCenterWorkspace = ({
  isWorkbenchEmpty,
  activePistonOscillationExpandedRealtime,
  resultsPanel,
  idealResultPanels,
  activeHeatCapacityMaterialsWindowOpen,
  centerWorkspaceRef,
  openableClosedFiles,
  settingsLanguagePreference,
  workbenchCopy,
  createFile,
  openClosedWorkbenchFile,
  liveWorkspaceResizing,
  liveWorkspaceStyle,
  liveWorkspaceRef,
  pistonOscillationGuideStrongReminderActive,
  pistonGuideExpectedStrongTargetId,
  pistonGuideStrongTargetContext,
  pistonOscillationGuidePulseElapsedMs,
  primaryPanels,
  renderDockPanel,
  startLiveWorkspaceResize,
  liveWorkspaceResizeGhostRef,
  auxiliaryPanels,
  activeFile,
  pistonGuideStrongTargetId,
  pistonOscillationGuideStrongMaskLayout,
  pistonGuideStrongReminderText,
  pistonOscillationGuideLessonOverlay,
  standardResultsLayout,
  startStandardResultsResize,
  renderIdealResultWindows,
  renderHeatCapacityMaterialsWindow,
}: WorkbenchCenterWorkspaceProps) => {
  return <div
                className={`studio-center-workspace ${!isWorkbenchEmpty ? 'studio-center-workspace-active' : ''} ${activePistonOscillationExpandedRealtime ? 'studio-center-workspace-piston-processing' : ''} ${!isWorkbenchEmpty && (resultsPanel || idealResultPanels.length > 0 || activeHeatCapacityMaterialsWindowOpen) ? 'studio-results-open' : ''} ${isWorkbenchEmpty ? 'studio-center-workspace-empty' : ''}`}
                ref={centerWorkspaceRef}
              >
                {isWorkbenchEmpty ? (
                  <WorkbenchEmptyWorkspace
                    openableClosedFiles={openableClosedFiles}
                    language={settingsLanguagePreference}
                    copy={workbenchCopy}
                    onCreateFile={createFile}
                    onOpenFile={openClosedWorkbenchFile}
                  />
                ) : (
                  <>
                    <div
                      className={`studio-live-workspace ${
                        liveWorkspaceResizing ? 'studio-live-workspace-resizing' : ''
                      } ${
                        activePistonOscillationExpandedRealtime
                          ? 'studio-live-workspace-piston-processing'
                          : ''
                      }`}
                      style={liveWorkspaceStyle}
                      ref={liveWorkspaceRef}
                      data-piston-guide-strong-active={
                        pistonOscillationGuideStrongReminderActive ? 'true' : 'false'
                      }
                      data-piston-guide-strong-expected-target={
                        pistonGuideExpectedStrongTargetId ?? 'none'
                      }
                      data-piston-guide-strong-context={pistonGuideStrongTargetContext ?? 'none'}
                      data-piston-guide-pulse-elapsed-ms={
                        Math.round(pistonOscillationGuidePulseElapsedMs)
                      }
                    >
                      {primaryPanels[0] ? renderDockPanel(primaryPanels[0]) : null}
                      <button
                        type="button"
                        className="studio-live-workspace-resizer"
                        aria-label={workbenchCopy.panels.liveWorkspaceResizeAria}
                        disabled={activePistonOscillationExpandedRealtime}
                        onPointerDown={startLiveWorkspaceResize}
                      />
                      <div
                        ref={liveWorkspaceResizeGhostRef}
                        className="studio-resize-ghost-divider studio-live-workspace-resize-ghost"
                        aria-hidden="true"
                      />
                      {primaryPanels[1] ? renderDockPanel(primaryPanels[1]) : null}
                      {auxiliaryPanels.length > 0 ? (
                        <div className="studio-optional-panels">
                          {auxiliaryPanels.map((panel) => renderDockPanel(panel, true))}
                        </div>
                      ) : null}
                      {activeFile.kind === 'heatCapacityPistonOscillation'
                      && pistonGuideStrongTargetId
                      && pistonOscillationGuideStrongMaskLayout ? (
                        <div
                          className="studio-heat-guide-strong-mask studio-piston-guide-strong-mask"
                          data-piston-guide-strong-mask="true"
                          data-piston-guide-strong-mask-target={pistonGuideStrongTargetId}
                          data-piston-guide-strong-mask-blocking="true"
                          role="status"
                          aria-live="polite"
                          style={{
                            top: `${pistonOscillationGuideStrongMaskLayout.top}px`,
                            right: 0,
                            bottom: 0,
                            left: 0,
                          }}
                        >
                          <svg
                            className="studio-heat-guide-strong-cutout-svg"
                            viewBox={`0 0 ${pistonOscillationGuideStrongMaskLayout.width} ${pistonOscillationGuideStrongMaskLayout.height}`}
                            aria-hidden="true"
                          >
                            <path
                              className="studio-heat-guide-strong-dim"
                              d={getPistonOscillationGuideStrongDimPath(
                                pistonOscillationGuideStrongMaskLayout,
                              )}
                              fillRule="evenodd"
                              clipRule="evenodd"
                            />
                            <rect
                              className="studio-heat-guide-strong-cutout-outline"
                              {...pistonOscillationGuideStrongMaskLayout.cutout}
                              fill="var(--studio-piston-guide-cutout-fill)"
                              stroke="var(--studio-piston-guide-cutout-stroke)"
                              strokeWidth="1.5"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                          <div
                            className={`studio-heat-guide-strong-card ${
                              pistonOscillationGuideStrongMaskLayout.card.compact
                                ? 'studio-piston-guide-strong-card-compact'
                                : ''
                            }`}
                            style={{
                              left: `${pistonOscillationGuideStrongMaskLayout.card.x}px`,
                              top: `${pistonOscillationGuideStrongMaskLayout.card.y}px`,
                              width: `${pistonOscillationGuideStrongMaskLayout.card.width}px`,
                            }}
                          >
                            <strong>{renderScientificText(pistonGuideStrongReminderText)}</strong>
                          </div>
                        </div>
                      ) : null}
                      {activeFile.kind === 'heatCapacityPistonOscillation'
                        ? pistonOscillationGuideLessonOverlay
                        : null}
                    </div>
                    {resultsPanel && activeFile.kind === 'standard' ? (
                      <div
                        className="studio-results-region"
                        style={{ height: `${clampIdealResultHeightRatio(standardResultsLayout.heightRatio) * 100}%` }}
                      >
                        <div
                          className="studio-results-window-resizer"
                          role="separator"
                          aria-orientation="horizontal"
                          onMouseDown={startStandardResultsResize}
                        />
                        {renderDockPanel(resultsPanel, true)}
                      </div>
                    ) : null}
                    {renderIdealResultWindows()}
                    {renderHeatCapacityMaterialsWindow()}
                  </>
                )}
              </div>;
};
