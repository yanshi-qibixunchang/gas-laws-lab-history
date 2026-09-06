import type React from 'react';

export interface WorkbenchHeatCapacityTooltipAnchorProps {
  tooltipId: string;
  message: string;
  children: React.ReactNode;
  options?: { className?: string; target?: string; focusable?: boolean; };
  hoverHeatCapacityParameterHelp: (parameterId: string, target?: HTMLElement) => void;
  hideHeatCapacityHoverTooltip: () => void;
  renderHeatCapacityTooltipPopover: (tooltipId: string, message: string, handlers?: { onMouseEnter?: () => void; onMouseLeave?: () => void; }) => React.ReactNode;
}

export const WorkbenchHeatCapacityTooltipAnchor = ({
  tooltipId,
  message,
  children,
  options,
  hoverHeatCapacityParameterHelp,
  hideHeatCapacityHoverTooltip,
  renderHeatCapacityTooltipPopover,
}: WorkbenchHeatCapacityTooltipAnchorProps) => {
  return (
    <span
      className={`studio-heat-tooltip-anchor ${options?.className ?? ''}`.trim()}
      data-heat-capacity-tooltip-target={options?.target ?? tooltipId}
      tabIndex={options?.focusable ? 0 : undefined}
      aria-label={options?.focusable ? message : undefined}
      onMouseEnter={(event) => {
        hoverHeatCapacityParameterHelp(tooltipId, event.currentTarget);
      }}
      onMouseLeave={hideHeatCapacityHoverTooltip}
      onFocus={(event) => {
        hoverHeatCapacityParameterHelp(tooltipId, event.currentTarget);
      }}
      onBlur={hideHeatCapacityHoverTooltip}
    >
      {children}
      {renderHeatCapacityTooltipPopover(tooltipId, message)}
    </span>
  );
};
