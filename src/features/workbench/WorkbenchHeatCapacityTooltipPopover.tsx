import type React from 'react';
import {
  createPortal,
} from 'react-dom';

export interface WorkbenchHeatCapacityTooltipPopoverProps {
  tooltipId: string;
  message: string;
  handlers?: { onMouseEnter?: () => void; onMouseLeave?: () => void; };
  visibleHeatCapacityParamHelpId: string | null;
  resolvedWorkbenchTheme: import('./workbenchGeneralSettings.ts').WorkbenchResolvedTheme;
  heatCapacityParamHelpPopoverStyle: React.CSSProperties;
}

export const WorkbenchHeatCapacityTooltipPopover = ({
  tooltipId,
  message,
  handlers,
  visibleHeatCapacityParamHelpId,
  resolvedWorkbenchTheme,
  heatCapacityParamHelpPopoverStyle,
}: WorkbenchHeatCapacityTooltipPopoverProps) => {
  return (
    visibleHeatCapacityParamHelpId === tooltipId
      ? createPortal(
        <span
          className={`studio-param-help-popover studio-heat-unified-tooltip studio-param-help-popover-${resolvedWorkbenchTheme}`}
          data-heat-capacity-param-help-popover-id={tooltipId}
          data-heat-capacity-tooltip-popover-id={tooltipId}
          role="tooltip"
          style={heatCapacityParamHelpPopoverStyle}
          onMouseEnter={handlers?.onMouseEnter}
          onMouseLeave={handlers?.onMouseLeave}
        >
          {message}
        </span>,
        document.body,
      )
      : null
  );
};
