import type React from 'react';

export interface WorkbenchHeatCapacityCheckboxParameterRowProps {
  definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeCheckboxDefinition;
  checked: boolean;
  disabled: boolean;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  renderHeatCapacityParameterLabel: (parameterId: string, label: string, parts: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeParameterSymbolPart[], modelEffect: string) => React.ReactElement;
  setHeatCapacityBasicCheckbox: (parameterId: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeBasicCheckboxKey, checked: boolean) => void;
}

export const WorkbenchHeatCapacityCheckboxParameterRow = ({
  definition,
  checked,
  disabled,
  settingsLanguagePreference,
  renderHeatCapacityParameterLabel,
  setHeatCapacityBasicCheckbox,
}: WorkbenchHeatCapacityCheckboxParameterRowProps) => {
    const label = definition.label[settingsLanguagePreference];
    const modelEffect = definition.effect[settingsLanguagePreference];
    return (
      <div
        key={definition.id}
        className={`studio-heat-free-param-row studio-heat-free-check-row ${disabled ? 'studio-heat-free-param-row-locked' : ''}`}
        data-heat-capacity-free-param-id={definition.id}
      >
        {renderHeatCapacityParameterLabel(definition.id, label, definition.parts, modelEffect)}
        <label className="studio-heat-free-check-control">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            data-heat-capacity-basic-checkbox={definition.id}
            onChange={(event) => setHeatCapacityBasicCheckbox(definition.id, event.target.checked)}
          />
          <span>{checked ? definition.onText[settingsLanguagePreference] : definition.offText[settingsLanguagePreference]}</span>
        </label>
      </div>
    );
  };
