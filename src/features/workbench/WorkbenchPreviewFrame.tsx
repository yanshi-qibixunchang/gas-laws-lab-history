import type React from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

export interface WorkbenchPreviewFrameProps {
  kind: WorkbenchFileState['kind'];
  children: React.ReactNode;
  metrics: React.ReactNode;
}

export const WorkbenchPreviewFrame = ({ kind, children, metrics }: WorkbenchPreviewFrameProps) => (
  <div className={`studio-preview ${kind === 'heatCapacity' ? 'studio-preview-heat-capacity' : kind === 'heatCapacityPistonOscillation' ? 'studio-preview-piston-oscillation' : ''}`}>
    <div className={`studio-preview-stage ${kind === 'heatCapacity' ? 'studio-heat-preview-stage' : kind === 'heatCapacityPistonOscillation' ? 'studio-piston-oscillation-preview-stage' : ''}`}>
      {children}
    </div>
    {metrics}
  </div>
);
