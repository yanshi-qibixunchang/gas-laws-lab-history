import type React from 'react';

export interface WorkbenchHeatCapacityParameterHelpProps {
  parameterId: string;
  modelEffect: string;
  visibleHeatCapacityParamHelpId: string | null;
  renderHeatCapacityTooltipPopover: (tooltipId: string, message: string, handlers?: { onMouseEnter?: () => void; onMouseLeave?: () => void; }) => React.ReactNode;
  hoverHeatCapacityParameterHelp: (id: string, target?: HTMLElement) => void;
  pinHeatCapacityParameterHelp: (id: string, target: HTMLElement) => void;
  hideHeatCapacityHoverTooltip: () => void;
  pinnedHeatCapacityParamHelpId: string | null;
}

export const WorkbenchHeatCapacityParameterHelp = ({
  parameterId,
  modelEffect,
  visibleHeatCapacityParamHelpId,
  renderHeatCapacityTooltipPopover,
  hoverHeatCapacityParameterHelp,
  pinHeatCapacityParameterHelp,
  hideHeatCapacityHoverTooltip,
  pinnedHeatCapacityParamHelpId,
}: WorkbenchHeatCapacityParameterHelpProps) => {
    const helpVisible = visibleHeatCapacityParamHelpId === parameterId;
    const helpPopover = helpVisible
      ? renderHeatCapacityTooltipPopover(parameterId, modelEffect, {
        onMouseEnter: () => hoverHeatCapacityParameterHelp(parameterId),
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
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === parameterId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-heat-capacity-param-help-id={parameterId}
          aria-label={`${modelEffect}`}
          onMouseEnter={(event) => {
            hoverHeatCapacityParameterHelp(parameterId, event.currentTarget);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            pinHeatCapacityParameterHelp(parameterId, event.currentTarget);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };
