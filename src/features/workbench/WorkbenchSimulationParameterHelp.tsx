import type React from 'react';

export interface WorkbenchSimulationParameterHelpProps {
  parameterId: string;
  modelEffect: string;
  visibleHeatCapacityParamHelpId: string | null;
  renderHeatCapacityTooltipPopover: (tooltipId: string, message: string, handlers?: { onMouseEnter?: () => void; onMouseLeave?: () => void; }) => React.ReactNode;
  hoverHeatCapacityParameterHelp: (id: string, target?: HTMLElement) => void;
  pinHeatCapacityParameterHelp: (id: string, target: HTMLElement) => void;
  hideHeatCapacityHoverTooltip: () => void;
  pinnedHeatCapacityParamHelpId: string | null;
}

export const WorkbenchSimulationParameterHelp = ({
  parameterId,
  modelEffect,
  visibleHeatCapacityParamHelpId,
  renderHeatCapacityTooltipPopover,
  hoverHeatCapacityParameterHelp,
  pinHeatCapacityParameterHelp,
  hideHeatCapacityHoverTooltip,
  pinnedHeatCapacityParamHelpId,
}: WorkbenchSimulationParameterHelpProps) => {
    const workbenchHelpId = `workbench-${parameterId}`;
    const helpVisible = visibleHeatCapacityParamHelpId === workbenchHelpId;
    const helpPopover = helpVisible
      ? renderHeatCapacityTooltipPopover(workbenchHelpId, modelEffect, {
        onMouseEnter: () => hoverHeatCapacityParameterHelp(workbenchHelpId),
        onMouseLeave: hideHeatCapacityHoverTooltip,
      })
      : null;
    return (
      <span
        className="studio-param-help-anchor"
        onMouseLeave={hideHeatCapacityHoverTooltip}
      >
        <button
          type="button"
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === workbenchHelpId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-workbench-param-help-button="true"
          data-workbench-param-help-id={parameterId}
          aria-label={modelEffect}
          onMouseEnter={(event) => {
            hoverHeatCapacityParameterHelp(workbenchHelpId, event.currentTarget);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            pinHeatCapacityParameterHelp(workbenchHelpId, event.currentTarget);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };
