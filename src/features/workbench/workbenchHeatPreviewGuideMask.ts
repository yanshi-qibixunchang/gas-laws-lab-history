import { getHeatCapacityGuideStrongTargetSpec } from './workbenchHeatCapacityGuidePresentation.ts';
import { getHeatCapacityGuideStrongCutouts } from './workbenchHeatCapacityGuideMaskDom.ts';
import { createHeatCapacityGuideStrongDimPath } from './workbenchHeatCapacityGuideMaskGeometry.ts';
import React from 'react';

export interface deriveWorkbenchHeatPreviewGuideMaskPorts {
  guideHeatCapacityStrongReminderActive: boolean;
  guideHeatCapacityStrongReminderControlId: string | null;
  heatCapacityGuideProjectedHoles: Record<string, import('./workbenchHeatCapacityGuideMaskGeometry.ts').HeatCapacityGuideStrongCutout>;
  heatCapacityGuideMaskRef: React.MutableRefObject<HTMLDivElement>;
  heatCapacityGuideMaskBounds: { width: number; height: number; };
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
}

export function deriveWorkbenchHeatPreviewGuideMask({
  guideHeatCapacityStrongReminderActive,
  guideHeatCapacityStrongReminderControlId,
  heatCapacityGuideProjectedHoles,
  heatCapacityGuideMaskRef,
  heatCapacityGuideMaskBounds,
  heatCapacityRealtimeCopy,
}: deriveWorkbenchHeatPreviewGuideMaskPorts) {
const heatCapacityGuideStrongTargetSpec = guideHeatCapacityStrongReminderActive
                ? getHeatCapacityGuideStrongTargetSpec(guideHeatCapacityStrongReminderControlId)
                : null;

const heatCapacityGuideFocusMode = heatCapacityGuideStrongTargetSpec?.focusMode ?? null;

const heatCapacityGuideCutouts = heatCapacityGuideStrongTargetSpec
                ? getHeatCapacityGuideStrongCutouts(
                  heatCapacityGuideStrongTargetSpec,
                  heatCapacityGuideProjectedHoles,
                  heatCapacityGuideMaskRef.current,
                  heatCapacityGuideMaskBounds,
                )
                : [];

const heatCapacityGuideDimPath = createHeatCapacityGuideStrongDimPath(
                heatCapacityGuideMaskBounds,
                heatCapacityGuideCutouts,
              );

const heatCapacityGuideStrongReminderText = heatCapacityGuideStrongTargetSpec
                ? heatCapacityRealtimeCopy[heatCapacityGuideStrongTargetSpec.reminderCopyKey ?? 'guideStrongReminder']
                : heatCapacityRealtimeCopy.guideStrongReminder;

  return { heatCapacityGuideStrongTargetSpec, heatCapacityGuideFocusMode, heatCapacityGuideCutouts, heatCapacityGuideDimPath, heatCapacityGuideStrongReminderText };
}
