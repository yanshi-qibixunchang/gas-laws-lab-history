import type React from 'react';
import {
  PromptDialogShell,
} from '../../components/prompts/PromptDialogShell.tsx';
import {
  heatCapacityFreeSharedText,
  heatCapacityFreeAdvancedParameterGroups,
  heatCapacityFreeAdvancedNumberParameters,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import {
  WorkbenchHeatCapacityAdvancedRiskDialog,
} from './WorkbenchHeatCapacityParameterDialogs.tsx';

export interface WorkbenchHeatCapacityAdvancedParametersProps {
  heatCapacityAdvancedOpen: boolean;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  heatCapacityAdvancedDraft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  activeHeatCapacityFreeIdealReadonly: boolean;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  cancelHeatCapacityAdvancedParameterDraft: () => void;
  renderHeatCapacityFreeNumberInputRow: (definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeNumberParameterDefinition, draft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft, scope: "advanced" | "basic", disabled: boolean) => React.ReactElement;
  saveHeatCapacityAdvancedParameterDraft: (draft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft) => void;
  acknowledgeHeatCapacityFreeAdvancedRisk: () => void;
}

export const WorkbenchHeatCapacityAdvancedParameters = ({
  heatCapacityAdvancedOpen,
  activeFile,
  heatCapacityAdvancedDraft,
  settingsLanguagePreference,
  activeHeatCapacityFreeIdealReadonly,
  workbenchCopy,
  cancelHeatCapacityAdvancedParameterDraft,
  renderHeatCapacityFreeNumberInputRow,
  saveHeatCapacityAdvancedParameterDraft,
  acknowledgeHeatCapacityFreeAdvancedRisk,
}: WorkbenchHeatCapacityAdvancedParametersProps) => {
    if (
      !heatCapacityAdvancedOpen ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'free' ||
      heatCapacityAdvancedDraft === null
    ) {
      return null;
    }
    const riskPending = !activeFile.heatCapacityFreeFileAcknowledgements.advancedParametersRisk;
    return (
      <>
        <PromptDialogShell
          title={heatCapacityFreeSharedText.advancedTitle[settingsLanguagePreference]}
          titleId="studio-heat-advanced-title"
          subtitle={activeHeatCapacityFreeIdealReadonly ? (
            <span className="studio-heat-advanced-readonly-note">
              {heatCapacityFreeSharedText.idealProfileReadonlyNote[settingsLanguagePreference]}
            </span>
          ) : undefined}
          variant="task"
          closeLabel={workbenchCopy.actions.close}
          dismiss={{ closeButton: true, escape: true, backdrop: true }}
          onRequestClose={cancelHeatCapacityAdvancedParameterDraft}
          overlayClassName="studio-heat-advanced-overlay"
          dialogClassName={`studio-heat-advanced-window ${riskPending ? 'studio-heat-advanced-window-blocked' : ''}`}
          headerClassName="studio-heat-advanced-header"
          closeButtonClassName="studio-heat-advanced-close"
          windowOverflow="auto"
        >
          <div className="studio-heat-advanced-groups" aria-disabled={riskPending || activeHeatCapacityFreeIdealReadonly}>
            {heatCapacityFreeAdvancedParameterGroups.map((group) => (
              <section className="studio-heat-advanced-group" key={group.id} data-heat-capacity-advanced-group-section={group.id}>
                <h3 className="studio-heat-advanced-group-title">{group.title[settingsLanguagePreference]}</h3>
                <div className="studio-heat-advanced-grid">
                  {heatCapacityFreeAdvancedNumberParameters.filter((definition) => definition.group === group.id)
                    .map((definition) => {
                      return (
                        <div className="studio-heat-advanced-grid-item" key={definition.id} data-heat-capacity-advanced-group={group.id}>
                          {renderHeatCapacityFreeNumberInputRow(
                            definition,
                            heatCapacityAdvancedDraft,
                            'advanced',
                            riskPending || activeHeatCapacityFreeIdealReadonly,
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
          <footer className="studio-heat-advanced-actions">
            <button type="button" onClick={cancelHeatCapacityAdvancedParameterDraft}>
              {heatCapacityFreeSharedText.cancel[settingsLanguagePreference]}
            </button>
            <button
              type="button"
              className="studio-heat-advanced-primary"
              disabled={riskPending || activeHeatCapacityFreeIdealReadonly}
              onClick={() => saveHeatCapacityAdvancedParameterDraft(heatCapacityAdvancedDraft)}
            >
              {heatCapacityFreeSharedText.save[settingsLanguagePreference]}
            </button>
          </footer>
        </PromptDialogShell>
        <WorkbenchHeatCapacityAdvancedRiskDialog
          open={riskPending}
          copy={{
            title: heatCapacityFreeSharedText.riskTitle[settingsLanguagePreference],
            body: heatCapacityFreeSharedText.riskBody[settingsLanguagePreference],
            cancel: heatCapacityFreeSharedText.cancel[settingsLanguagePreference],
            confirm: heatCapacityFreeSharedText.confirm[settingsLanguagePreference],
          }}
          onCancel={cancelHeatCapacityAdvancedParameterDraft}
          onConfirm={acknowledgeHeatCapacityFreeAdvancedRisk}
        />
      </>
    );
  };
