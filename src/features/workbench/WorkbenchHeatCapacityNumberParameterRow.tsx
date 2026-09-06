import type React from 'react';
import {
  getHeatCapacityFreeParameterInputValue,
  formatHeatCapacityFreeParameterValue,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';

export interface WorkbenchHeatCapacityNumberParameterRowProps {
  definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeNumberParameterDefinition;
  draft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft;
  scope: "advanced" | "basic";
  disabled: boolean;
  heatCapacityBasicInputDrafts: Record<string, string>;
  heatCapacityAdvancedInputDrafts: Record<string, string>;
  heatCapacityBasicInputErrors: Record<string, string>;
  heatCapacityAdvancedInputErrors: Record<string, string>;
  setHeatCapacityBasicInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityAdvancedInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  renderHeatCapacityParameterLabel: (parameterId: string, label: string, parts: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeParameterSymbolPart[], modelEffect: string) => React.ReactElement;
  setHeatCapacityBasicInputErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityAdvancedInputErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commitHeatCapacityBasicParameterInput: (parameterId: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeDraftNumberKey, valueText: string) => void;
}

export const WorkbenchHeatCapacityNumberParameterRow = ({
  definition,
  draft,
  scope,
  disabled,
  heatCapacityBasicInputDrafts,
  heatCapacityAdvancedInputDrafts,
  heatCapacityBasicInputErrors,
  heatCapacityAdvancedInputErrors,
  setHeatCapacityBasicInputDrafts,
  setHeatCapacityAdvancedInputDrafts,
  settingsLanguagePreference,
  renderHeatCapacityParameterLabel,
  setHeatCapacityBasicInputErrors,
  setHeatCapacityAdvancedInputErrors,
  commitHeatCapacityBasicParameterInput,
}: WorkbenchHeatCapacityNumberParameterRowProps) => {
    const inputDrafts = scope === 'basic' ? heatCapacityBasicInputDrafts : heatCapacityAdvancedInputDrafts;
    const inputErrors = scope === 'basic' ? heatCapacityBasicInputErrors : heatCapacityAdvancedInputErrors;
    const setInputDrafts = scope === 'basic' ? setHeatCapacityBasicInputDrafts : setHeatCapacityAdvancedInputDrafts;
    const error = inputErrors[definition.id] ?? null;
    const displayValue = getHeatCapacityFreeParameterInputValue(
      definition,
      draft[definition.id],
    );
    const value = inputDrafts[definition.id] ?? formatHeatCapacityFreeParameterValue(
      displayValue,
      definition.precision,
    );
    const parameterId = definition.id;
    const label = definition.label[settingsLanguagePreference];
    const modelEffect = definition.effect[settingsLanguagePreference];

    return (
      <div
        key={`${scope}-${definition.id}`}
        className={`studio-heat-free-param-row ${disabled ? 'studio-heat-free-param-row-locked' : ''} ${error ? 'studio-heat-free-param-row-error' : ''}`}
        data-heat-capacity-free-param-id={definition.id}
      >
        {renderHeatCapacityParameterLabel(parameterId, label, definition.parts, modelEffect)}
        <span className="studio-heat-free-input-cell">
          <span className="studio-heat-free-input-shell">
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              aria-label={`${label} ${definition.unit}`.trim()}
              aria-invalid={error ? true : undefined}
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value;
                setInputDrafts((current) => ({
                  ...current,
                  [definition.id]: nextValue,
                }));
                if (scope === 'basic') {
                  setHeatCapacityBasicInputErrors((current) => {
                    const { [definition.id]: _removed, ...rest } = current;
                    return rest;
                  });
                } else {
                  setHeatCapacityAdvancedInputErrors((current) => {
                    const { [definition.id]: _removed, ...rest } = current;
                    return rest;
                  });
                }
              }}
              onBlur={() => {
                if (scope === 'basic') {
                  commitHeatCapacityBasicParameterInput(definition.id, value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && scope === 'basic') {
                  commitHeatCapacityBasicParameterInput(definition.id, value);
                }
              }}
            />
            {definition.unit ? <span className="studio-heat-free-unit">{definition.unit}</span> : null}
          </span>
          {error ? <small className="studio-heat-free-inline-error">{error}</small> : null}
        </span>
      </div>
    );
  };
