import type React from 'react';
import {
  renderHeatCapacityParameterSymbol,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityParameterLabelProps {
  parameterId: string;
  label: string;
  parts: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeParameterSymbolPart[];
  modelEffect: string;
  renderHeatCapacityParameterHelpButton: (parameterId: string, modelEffect: string) => React.ReactElement;
}

export const WorkbenchHeatCapacityParameterLabel = ({
  parameterId,
  label,
  parts,
  modelEffect,
  renderHeatCapacityParameterHelpButton,
}: WorkbenchHeatCapacityParameterLabelProps) => {
    const symbolLayoutClass = parts.length > 0
      ? 'studio-heat-free-param-label-with-symbol'
      : 'studio-heat-free-param-label-no-symbol';
    return (
      <span className={`studio-heat-free-param-label ${symbolLayoutClass}`}>
        <span className="studio-heat-free-param-name">{label}</span>
        {renderHeatCapacityParameterSymbol(parts)}
        {renderHeatCapacityParameterHelpButton(parameterId, modelEffect)}
      </span>
    );
  };
