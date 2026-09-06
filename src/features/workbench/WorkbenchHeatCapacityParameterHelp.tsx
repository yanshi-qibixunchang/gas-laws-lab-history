import type React from 'react';

export interface WorkbenchHeatCapacityParameterHelpProps {
  parameterId: string;
  modelEffect: string;
  visibleHeatCapacityParamHelpId: string;
  renderHeatCapacityTooltipPopover: (tooltipId: string, message: string, handlers?: { onMouseEnter?: () => void; onMouseLeave?: () => void; }) => React.ReactPortal;
  setHoveredHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string>>;
  hideHeatCapacityHoverTooltip: () => void;
  pinnedHeatCapacityParamHelpId: string;
  setHeatCapacityParamHelpPopoverStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>;
  updateHeatCapacityParamHelpPopoverStyle: (target: HTMLElement) => void;
  setPinnedHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string>>;
}

export const WorkbenchHeatCapacityParameterHelp = ({
  parameterId,
  modelEffect,
  visibleHeatCapacityParamHelpId,
  renderHeatCapacityTooltipPopover,
  setHoveredHeatCapacityParamHelpId,
  hideHeatCapacityHoverTooltip,
  pinnedHeatCapacityParamHelpId,
  setHeatCapacityParamHelpPopoverStyle,
  updateHeatCapacityParamHelpPopoverStyle,
  setPinnedHeatCapacityParamHelpId,
}: WorkbenchHeatCapacityParameterHelpProps) => {
    const helpVisible = visibleHeatCapacityParamHelpId === parameterId;
    const helpPopover = helpVisible
      ? renderHeatCapacityTooltipPopover(parameterId, modelEffect, {
        onMouseEnter: () => setHoveredHeatCapacityParamHelpId(parameterId),
        onMouseLeave: hideHeatCapacityHoverTooltip,
      })
      : null;
    return (
      <span
        className="studio-param-help-anchor"
        onMouseLeave={() => {
          if (pinnedHeatCapacityParamHelpId === null) {
            setHoveredHeatCapacityParamHelpId(null);
            setHeatCapacityParamHelpPopoverStyle(undefined);
          }
        }}
      >
        <button
          type="button"
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === parameterId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-heat-capacity-param-help-id={parameterId}
          aria-label={`${modelEffect}`}
          onMouseEnter={(event) => {
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setHoveredHeatCapacityParamHelpId(parameterId);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setPinnedHeatCapacityParamHelpId(parameterId);
            setHoveredHeatCapacityParamHelpId(parameterId);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };
