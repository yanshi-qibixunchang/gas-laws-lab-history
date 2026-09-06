import type React from 'react';
import {
  selectHeatCapacityFreeGasType,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  isHeatCapacityFreeGasTypeEditingAvailable,
} from './workbenchHeatCapacityFreeParameterState.ts';
import {
  type HeatCapacityFreeGasTypeOptionDefinition,
  heatCapacityFreeSharedText,
  heatCapacityFreeGasTypeOptions,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';

export interface WorkbenchHeatCapacityGasParameterRowProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  showHeatCapacityGasTypeLockHint: () => void;
  setHeatCapacityFreeGasType: (gasType: import('../../domain/heatCapacity/heatCapacityGasTheory.ts').HeatCapacityFreeGasType) => void;
  renderHeatCapacityTooltipAnchor: (tooltipId: string, message: string, children: React.ReactNode, options?: { className?: string; target?: string; focusable?: boolean; }) => React.ReactElement;
}

export const WorkbenchHeatCapacityGasParameterRow = ({
  activeFile,
  settingsLanguagePreference,
  showHeatCapacityGasTypeLockHint,
  setHeatCapacityFreeGasType,
  renderHeatCapacityTooltipAnchor,
}: WorkbenchHeatCapacityGasParameterRowProps) => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    const selectedGasType = selectHeatCapacityFreeGasType(activeFile);
    const gasTypeLocked = !isHeatCapacityFreeGasTypeEditingAvailable(activeFile);
    const disabled = gasTypeLocked;
    const nativeDisabled = false;
    const renderOption = (option: HeatCapacityFreeGasTypeOptionDefinition) => {
      const selected = selectedGasType === option.id;
      const gasTypeHelp = (
        <span
          className="studio-heat-free-gas-type-help"
          aria-label={option.help[settingsLanguagePreference]}
        >
          ?
        </span>
      );
      return (
        <button
          key={option.id}
          type="button"
          className="studio-heat-free-gas-type-option"
          data-heat-capacity-gas-type-option={option.id}
          aria-pressed={selected}
          aria-disabled={disabled}
          disabled={nativeDisabled}
          onClick={() => {
            if (disabled) {
              showHeatCapacityGasTypeLockHint();
              return;
            }
            setHeatCapacityFreeGasType(option.id);
          }}
        >
          <span>{option.label[settingsLanguagePreference]}</span>
          {renderHeatCapacityTooltipAnchor(
            `gasType-${option.id}`,
            option.help[settingsLanguagePreference],
            gasTypeHelp,
            {
              className: 'studio-heat-free-gas-type-help-anchor',
              target: `gasType-${option.id}`,
            },
          )}
        </button>
      );
    };
    return (
      <div
        className={`studio-heat-free-param-row studio-heat-free-gas-type-row ${disabled ? 'studio-heat-free-param-row-locked' : ''}`}
        data-heat-capacity-free-param-id="gasType"
      >
        <span className="studio-heat-free-param-label studio-heat-free-param-label-no-symbol">
          <span className="studio-heat-free-param-name">
            {heatCapacityFreeSharedText.gasTypeLabel[settingsLanguagePreference]}
          </span>
        </span>
        <span
          className={`studio-heat-free-gas-type-control studio-heat-free-gas-type-control-${selectedGasType}`}
          role="group"
          aria-label={heatCapacityFreeSharedText.gasTypeLabel[settingsLanguagePreference]}
        >
          <span className="studio-heat-free-gas-type-thumb" aria-hidden="true" />
          {heatCapacityFreeGasTypeOptions.map(renderOption)}
        </span>
      </div>
    );
  };
