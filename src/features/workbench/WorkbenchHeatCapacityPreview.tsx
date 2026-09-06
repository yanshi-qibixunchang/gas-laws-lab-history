import type React from 'react';

export interface WorkbenchHeatCapacityPreviewProps {
  mountAria: string;
  interactionLocked: boolean;
  onLockedPointer: () => void;
  children: React.ReactNode;
}

export const WorkbenchHeatCapacityPreview = ({ mountAria, interactionLocked, onLockedPointer, children }: WorkbenchHeatCapacityPreviewProps) => (
  <div
    className="studio-heat-preview-mount"
    aria-label={mountAria}
    data-heat-capacity-preview-mount="true"
    onPointerDownCapture={(event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-heat-capacity-hard-sphere-toggle="true"]')) return;
      if (interactionLocked) onLockedPointer();
    }}
    onWheelCapture={(event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-heat-capacity-hard-sphere-toggle="true"]')) return;
      if (interactionLocked) onLockedPointer();
    }}
  >
    {children}
  </div>
);
