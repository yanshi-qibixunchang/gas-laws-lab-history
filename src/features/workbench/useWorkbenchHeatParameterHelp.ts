import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import type React from 'react';


export interface useWorkbenchHeatParameterHelpPorts {
  pinnedHeatCapacityParamHelpId: string | null;
  heatCapacityParamHelpSuppressClickRef: React.MutableRefObject<boolean>;
  setPinnedHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHeatCapacityParamHelpPopoverStyle: React.Dispatch<React.SetStateAction<React.CSSProperties | undefined>>;
}

export function useWorkbenchHeatParameterHelp({
  pinnedHeatCapacityParamHelpId,
  heatCapacityParamHelpSuppressClickRef,
  setPinnedHeatCapacityParamHelpId,
  setHoveredHeatCapacityParamHelpId,
  setHeatCapacityParamHelpPopoverStyle,
}: useWorkbenchHeatParameterHelpPorts) {
const parameterHelpPointerEffect = { run: () => {
    if (pinnedHeatCapacityParamHelpId === null) return undefined;
    const handleHeatCapacityParamHelpPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('[data-heat-capacity-param-help-button="true"]')) return;
      const activePopover = document.querySelector(
        `[data-heat-capacity-param-help-popover-id="${pinnedHeatCapacityParamHelpId}"]`,
      );
      if (activePopover?.contains(target)) return;
      heatCapacityParamHelpSuppressClickRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closePinnedHeatCapacityParameterHelp();
    };
    document.addEventListener('pointerdown', handleHeatCapacityParamHelpPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleHeatCapacityParamHelpPointerDown, true);
    };
  }, dependencies: [pinnedHeatCapacityParamHelpId] } satisfies WorkbenchHeatEffect;

const parameterHelpClickEffect = { run: () => {
    const handleHeatCapacityParamHelpClick = (event: MouseEvent) => {
      if (!heatCapacityParamHelpSuppressClickRef.current) return;
      heatCapacityParamHelpSuppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    document.addEventListener('click', handleHeatCapacityParamHelpClick, true);
    return () => {
      document.removeEventListener('click', handleHeatCapacityParamHelpClick, true);
    };
  }, dependencies: [] } satisfies WorkbenchHeatEffect;

const closePinnedHeatCapacityParameterHelp = () => {
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

const updateHeatCapacityParamHelpPopoverStyle = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const gap = 7;
    const width = Math.min(260, Math.max(180, viewportWidth - margin * 2));
    const maxHeight = Math.min(220, Math.max(96, viewportHeight - margin * 2));
    const estimatedHeight = Math.min(136, maxHeight);
    const maxLeft = Math.max(margin, viewportWidth - width - margin);
    const left = Math.min(Math.max(margin, rect.right - width), maxLeft);
    const belowTop = rect.bottom + gap;
    const aboveTop = rect.top - gap - estimatedHeight;
    const preferredTop = belowTop + estimatedHeight <= viewportHeight - margin ? belowTop : aboveTop;
    const maxTop = Math.max(margin, viewportHeight - estimatedHeight - margin);
    const top = Math.min(Math.max(margin, preferredTop), maxTop);
    setHeatCapacityParamHelpPopoverStyle({ left, top, width, maxHeight });
  };

const hideHeatCapacityHoverTooltip = () => {
    if (pinnedHeatCapacityParamHelpId !== null) return;
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  const hoverHeatCapacityParameterHelp = (parameterId: string, target?: HTMLElement) => {
    if (target) updateHeatCapacityParamHelpPopoverStyle(target);
    setHoveredHeatCapacityParamHelpId(parameterId);
  };
  const pinHeatCapacityParameterHelp = (parameterId: string, target: HTMLElement) => {
    updateHeatCapacityParamHelpPopoverStyle(target);
    setPinnedHeatCapacityParamHelpId(parameterId);
    setHoveredHeatCapacityParamHelpId(parameterId);
  };

  return {
    effects: { parameterHelpPointer: parameterHelpPointerEffect, parameterHelpClick: parameterHelpClickEffect }, hoverHeatCapacityParameterHelp, pinHeatCapacityParameterHelp, updateHeatCapacityParamHelpPopoverStyle, hideHeatCapacityHoverTooltip };
}
