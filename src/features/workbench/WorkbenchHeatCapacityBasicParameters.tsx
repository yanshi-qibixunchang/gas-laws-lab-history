import type React from 'react';
import {
  selectHeatCapacityFreeAppliedParameterDraft,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  type HeatCapacityFreeBasicCheckboxKey,
  heatCapacityFreeSharedText,
  heatCapacityFreeBasicNumberParameters,
  heatCapacityFreeBasicCheckboxes,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import {
  RotateCcw,
} from 'lucide-react';

export interface WorkbenchHeatCapacityBasicParametersProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  activeHeatCapacityNextScheme: import('./workbenchHeatCapacityStateTypes.ts').HeatCapacityFreeParameterScheme;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  activeHeatCapacityFreeSchemeLocked: boolean;
  activeHeatCapacityFreeIdealReadonly: boolean;
  activeHeatCapacityFreeParameterLockMessage: string;
  activeHeatCapacityFreeParameterLocked: boolean;
  renderHeatCapacityTooltipAnchor: (tooltipId: string, message: string, children: React.ReactNode, options?: { className?: string; target?: string; focusable?: boolean; }) => React.ReactElement;
  requestToggleHeatCapacityFreeParameterScheme: () => void;
  activeHeatCapacityFreeParameterInputDisabled: boolean;
  openHeatCapacityRestoreDefaultConfirm: () => void;
  renderHeatCapacityFreeGasTypeRow: () => React.ReactElement;
  renderHeatCapacityFreeNumberInputRow: (definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeNumberParameterDefinition, draft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft, scope: "advanced" | "basic", disabled: boolean) => React.ReactElement;
  renderHeatCapacityFreeCheckboxRow: (definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeCheckboxDefinition, checked: boolean, disabled: boolean) => React.ReactElement;
}

export const WorkbenchHeatCapacityBasicParameters = ({
  activeFile,
  activeHeatCapacityNextScheme,
  settingsLanguagePreference,
  activeHeatCapacityFreeSchemeLocked,
  activeHeatCapacityFreeIdealReadonly,
  activeHeatCapacityFreeParameterLockMessage,
  activeHeatCapacityFreeParameterLocked,
  renderHeatCapacityTooltipAnchor,
  requestToggleHeatCapacityFreeParameterScheme,
  activeHeatCapacityFreeParameterInputDisabled,
  openHeatCapacityRestoreDefaultConfirm,
  renderHeatCapacityFreeGasTypeRow,
  renderHeatCapacityFreeNumberInputRow,
  renderHeatCapacityFreeCheckboxRow,
}: WorkbenchHeatCapacityBasicParametersProps) => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    const draft = selectHeatCapacityFreeAppliedParameterDraft(activeFile);
    const checkboxValue = (id: HeatCapacityFreeBasicCheckboxKey) => (
      id === 'hardSphereViewEnabled'
        ? activeFile.hardSphereViewEnabled
        : Boolean(draft[id])
    );
    const schemeIsIdeal = activeHeatCapacityNextScheme === 'ideal';
    const schemeButtonText = schemeIsIdeal
      ? heatCapacityFreeSharedText.idealProfile[settingsLanguagePreference]
      : heatCapacityFreeSharedText.realSimulation[settingsLanguagePreference];
    const schemeButtonTooltip = activeHeatCapacityFreeSchemeLocked
      ? heatCapacityFreeSharedText.idealProfileLockedHint[settingsLanguagePreference]
      : heatCapacityFreeSharedText.idealProfileIntroBody[settingsLanguagePreference];
    const restoreDefaultTooltip = activeHeatCapacityFreeIdealReadonly
      ? heatCapacityFreeSharedText.idealProfileReadonlyNote[settingsLanguagePreference]
      : activeHeatCapacityFreeParameterLockMessage ?? heatCapacityFreeSharedText.restoreDefault[settingsLanguagePreference];
    return (
      <>
        <div className={`studio-heat-free-default-row ${activeHeatCapacityFreeParameterLocked ? 'studio-heat-free-default-row-locked' : ''}`}>
          {renderHeatCapacityTooltipAnchor(
            'heatCapacityFreeParameterScheme',
            schemeButtonTooltip,
            <button
              type="button"
              className={`studio-heat-free-scheme-button ${schemeIsIdeal ? 'studio-heat-free-scheme-button-active' : ''} ${activeHeatCapacityFreeSchemeLocked ? 'studio-heat-free-scheme-button-locked' : ''}`}
              disabled={activeHeatCapacityFreeSchemeLocked}
              aria-disabled={activeHeatCapacityFreeSchemeLocked}
              aria-pressed={schemeIsIdeal}
              onClick={requestToggleHeatCapacityFreeParameterScheme}
            >
              <span>{schemeButtonText}</span>
            </button>,
            {
              className: 'studio-heat-free-scheme-tooltip-anchor',
              target: 'scheme',
              focusable: activeHeatCapacityFreeSchemeLocked,
            },
          )}
          {renderHeatCapacityTooltipAnchor(
            'heatCapacityRestoreDefault',
            restoreDefaultTooltip,
            <button
              type="button"
              className="studio-heat-free-default-button"
              disabled={activeHeatCapacityFreeParameterInputDisabled}
              onClick={openHeatCapacityRestoreDefaultConfirm}
            >
              <RotateCcw size={13} />
              <span>{heatCapacityFreeSharedText.restoreDefault[settingsLanguagePreference]}</span>
            </button>,
            {
              className: 'studio-heat-free-default-tooltip-anchor',
              target: 'restore-default',
              focusable: activeHeatCapacityFreeParameterInputDisabled,
            },
          )}
        </div>
        {renderHeatCapacityFreeGasTypeRow()}
        {heatCapacityFreeBasicNumberParameters.map((definition) => (
          renderHeatCapacityFreeNumberInputRow(
            definition,
            draft,
            'basic',
            activeHeatCapacityFreeParameterInputDisabled,
          )
        ))}
        {heatCapacityFreeBasicCheckboxes.map((definition) => (
          renderHeatCapacityFreeCheckboxRow(
            definition,
            checkboxValue(definition.id),
            definition.id === 'hardSphereViewEnabled'
              ? false
              : activeHeatCapacityFreeParameterLocked
                ? true
                : activeHeatCapacityFreeIdealReadonly,
          )
        ))}
      </>
    );
  };
