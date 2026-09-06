import type React from 'react';

export interface WorkbenchHeatCapacityGuideMaskProps {
  heatCapacityPreheatLockOverlay: React.ReactElement;
  heatCapacityGuideStrongMaskOverlay: React.ReactElement;
  heatCapacityGuideLessonOverlay: React.ReactElement;
}

export const WorkbenchHeatCapacityGuideMask = ({
  heatCapacityPreheatLockOverlay,
  heatCapacityGuideStrongMaskOverlay,
  heatCapacityGuideLessonOverlay,
}: WorkbenchHeatCapacityGuideMaskProps) => {
  return <>
                  {heatCapacityPreheatLockOverlay}
                  {heatCapacityGuideStrongMaskOverlay}
                  {heatCapacityGuideLessonOverlay}
                </>;
};
