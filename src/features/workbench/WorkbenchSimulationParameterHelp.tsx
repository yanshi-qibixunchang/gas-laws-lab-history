import type React from 'react';

export interface WorkbenchSimulationParameterHelpProps {
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

export const WorkbenchSimulationParameterHelp = ({
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
}: WorkbenchSimulationParameterHelpProps) => {
    const workbenchHelpId = `workbench-${parameterId}`;
    const helpVisible = visibleHeatCapacityParamHelpId === workbenchHelpId;
    const helpPopover = helpVisible
      ? renderHeatCapacityTooltipPopover(workbenchHelpId, modelEffect, {
        onMouseEnter: () => setHoveredHeatCapacityParamHelpId(workbenchHelpId),
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
          className={`studio-param-help-button ${pinnedHeatCapacityParamHelpId === workbenchHelpId ? 'studio-param-help-button-pinned' : ''}`}
          data-heat-capacity-param-help-button="true"
          data-workbench-param-help-button="true"
          data-workbench-param-help-id={parameterId}
          aria-label={modelEffect}
          onMouseEnter={(event) => {
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setHoveredHeatCapacityParamHelpId(workbenchHelpId);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateHeatCapacityParamHelpPopoverStyle(event.currentTarget);
            setPinnedHeatCapacityParamHelpId(workbenchHelpId);
            setHoveredHeatCapacityParamHelpId(workbenchHelpId);
          }}
        >
          ?
        </button>
        {helpPopover}
      </span>
    );
  };
