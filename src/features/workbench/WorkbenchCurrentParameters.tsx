import type React from 'react';
import {
  PistonOscillationParameterPanel,
} from '../pistonOscillation/PistonOscillationParameterPanel.tsx';
import {
  ChevronDown,
} from 'lucide-react';

export interface WorkbenchCurrentParametersProps {
  currentParameterControlsLocked: boolean;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  startSidebarResize: (side: "params" | "left", event: React.MouseEvent<Element, MouseEvent>) => void;
  setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  currentParametersBodyRef: React.MutableRefObject<HTMLDivElement>;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  pistonOscillationCopy: import('../pistonOscillation/pistonOscillationCopy.ts').PistonOscillationShellCopy;
  activeHeatCapacityExperimentTitle: string;
  parametersDirty: boolean;
  renderIdealControls: () => React.ReactElement;
  renderHeatCapacityFreeParameterPanel: () => React.ReactElement;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  activePistonOscillationParameterMode: "demo" | "guide" | "free" | "explore";
  renderHeatCapacityParameterHelpButton: (parameterId: string, modelEffect: string) => React.ReactElement;
  updatePistonOscillationFreeParameterDraft: (parameterDraft: import('../../domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts').PistonOscillationFreeParameterDraft) => void;
  setPistonOscillationOperationVisualization: (enabled: boolean) => void;
  acknowledgePistonOscillationAdvancedParametersRisk: () => void;
  restorePistonOscillationFreeParameters: () => void;
  setPistonOscillationFreeExperimentScheme: (scheme: "ideal" | "real") => void;
  setPistonOscillationFreeGasType: (gasType: "air" | "helium") => void;
  showPistonOscillationParameterLockHint: () => void;
  idealAdvancedSettingsOpen: boolean;
  toggleIdealAdvancedSettings: () => void;
  idealAdvancedSettingsBodyVisible: boolean;
  idealAdvancedSettingsBodyRef: React.MutableRefObject<HTMLDivElement>;
  editableCurrentParameters: import('./workbenchParameterState.ts').WorkbenchParameterRow[];
  renderWorkbenchParameterInputRow: (param: import('./workbenchParameterState.ts').WorkbenchParameterRow) => React.ReactElement;
  parameterErrors: string[];
  activeHeatCapacityCalculationHint: string;
}

export const WorkbenchCurrentParameters = ({
  currentParameterControlsLocked,
  workbenchCopy,
  startSidebarResize,
  setParametersCollapsed,
  currentParametersBodyRef,
  activeFile,
  pistonOscillationCopy,
  activeHeatCapacityExperimentTitle,
  parametersDirty,
  renderIdealControls,
  renderHeatCapacityFreeParameterPanel,
  settingsLanguagePreference,
  activePistonOscillationParameterMode,
  renderHeatCapacityParameterHelpButton,
  updatePistonOscillationFreeParameterDraft,
  setPistonOscillationOperationVisualization,
  acknowledgePistonOscillationAdvancedParametersRisk,
  restorePistonOscillationFreeParameters,
  setPistonOscillationFreeExperimentScheme,
  setPistonOscillationFreeGasType,
  showPistonOscillationParameterLockHint,
  idealAdvancedSettingsOpen,
  toggleIdealAdvancedSettings,
  idealAdvancedSettingsBodyVisible,
  idealAdvancedSettingsBodyRef,
  editableCurrentParameters,
  renderWorkbenchParameterInputRow,
  parameterErrors,
  activeHeatCapacityCalculationHint,
}: WorkbenchCurrentParametersProps) => {
  return <aside
                className={`studio-current-params ${currentParameterControlsLocked ? 'studio-current-params-locked' : ''}`}
                aria-label={workbenchCopy.parameters.title}
                aria-disabled={currentParameterControlsLocked}
              >
                <div
                  className="studio-params-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  onMouseDown={(event) => startSidebarResize('params', event)}
                />
                <div className="studio-current-params-header">
                  <div>
                    <span>{workbenchCopy.parameters.title}</span>
                    <small>{currentParameterControlsLocked ? workbenchCopy.parameters.lockedUntilStopped : workbenchCopy.parameters.currentFileValues}</small>
                  </div>
                  <button
                    type="button"
                    className="studio-panel-collapse"
                    aria-label={`${workbenchCopy.actions.hide} ${workbenchCopy.parameters.title}`}
                    onClick={() => setParametersCollapsed(true)}
                  >
                    {workbenchCopy.actions.hide}
                  </button>
                </div>
                <div className="studio-current-params-body" ref={currentParametersBodyRef}>
                  <div className="studio-param-file">
                    <strong>{activeFile.kind === 'standard'
                      ? workbenchCopy.parameters.standardSimulation
                      : activeFile.kind === 'ideal'
                        ? workbenchCopy.parameters.idealSimulation
                        : activeFile.kind === 'heatCapacityPistonOscillation'
                          ? pistonOscillationCopy.methodName
                          : activeHeatCapacityExperimentTitle}</strong>
                    <span>{activeFile.name}</span>
                    <span className={`studio-param-state ${parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset) ? 'studio-param-state-pending' : ''}`}>
                      {parametersDirty
                        ? workbenchCopy.parameters.savedChangesOnStart
                        : activeFile.kind === 'ideal' && activeFile.needsReset
                          ? workbenchCopy.parameters.idealRuntimeOnStart
                          : workbenchCopy.parameters.applied}
                    </span>
                  </div>
                  {renderIdealControls()}
                  {activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free' ? (
                    renderHeatCapacityFreeParameterPanel()
                  ) : activeFile.kind === 'heatCapacityPistonOscillation' ? (
                    <PistonOscillationParameterPanel
                      language={settingsLanguagePreference}
                      mode={activePistonOscillationParameterMode}
                      session={activeFile.pistonOscillationFreeSession}
                      operationVisualizationEnabled={
                        activeFile.pistonOscillationOperationVisualizationEnabled
                      }
                      renderParameterHelpButton={(parameterId, modelEffect) => (
                        renderHeatCapacityParameterHelpButton(
                          `pistonOscillation-${parameterId}`,
                          modelEffect,
                        )
                      )}
                      onParameterDraftChange={updatePistonOscillationFreeParameterDraft}
                      onOperationVisualizationChange={
                        setPistonOscillationOperationVisualization
                      }
                      onAcknowledgeAdvancedParametersRisk={
                        acknowledgePistonOscillationAdvancedParametersRisk
                      }
                      onRestoreDefaults={restorePistonOscillationFreeParameters}
                      onExperimentSchemeChange={
                        setPistonOscillationFreeExperimentScheme
                      }
                      onGasTypeChange={setPistonOscillationFreeGasType}
                      onLockedInteraction={showPistonOscillationParameterLockHint}
                    />
                  ) : activeFile.kind === 'heatCapacity' ? (
                    <>
                      <div className="studio-panel-note">{workbenchCopy.parameters.heatCapacityReadonlyNote}</div>
                    </>
                  ) : null}
                  {activeFile.kind === 'ideal' ? (
                    <section className={`studio-param-advanced ${idealAdvancedSettingsOpen ? 'studio-param-advanced-open' : ''}`}>
                      <button
                        type="button"
                        className="studio-param-advanced-toggle"
                        aria-expanded={idealAdvancedSettingsOpen}
                        onClick={toggleIdealAdvancedSettings}
                      >
                        <span>
                          <strong>{workbenchCopy.parameters.advancedSettings}</strong>
                          <small>{idealAdvancedSettingsOpen ? workbenchCopy.parameters.advancedHide : workbenchCopy.parameters.advancedShow}</small>
                        </span>
                        <ChevronDown
                          size={15}
                          className={`studio-param-advanced-chevron ${idealAdvancedSettingsOpen ? 'studio-param-advanced-chevron-open' : ''}`}
                        />
                      </button>
                      {idealAdvancedSettingsBodyVisible ? (
                        <div className="studio-param-advanced-body" ref={idealAdvancedSettingsBodyRef} aria-hidden={!idealAdvancedSettingsOpen}>
                          {editableCurrentParameters.map((param) => renderWorkbenchParameterInputRow(param))}
                        </div>
                      ) : null}
                    </section>
                  ) : activeFile.kind === 'heatCapacity' || activeFile.kind === 'heatCapacityPistonOscillation' ? null : (
                    <>
                      {editableCurrentParameters.map((param) => renderWorkbenchParameterInputRow(param))}
                    </>
                  )}
                  {parameterErrors.length > 0 ? (
                    <div className="studio-param-errors">
                      {parameterErrors.map((error) => (
                        <span key={error}>{error}</span>
                      ))}
                    </div>
                  ) : null}
                  {activeFile.kind !== 'heatCapacityPistonOscillation' ? (
                  <div className="studio-readonly-note">
                    {activeFile.kind === 'standard'
                        ? workbenchCopy.parameters.standardReadonlyNote
                        : activeFile.kind === 'heatCapacity'
                          ? activeHeatCapacityCalculationHint
                          : workbenchCopy.parameters.idealReadonlyNote}
                  </div>
                  ) : null}
                </div>
              </aside>;
};
