import type React from 'react';
import HeatCapacityInstrumentScene from '../heatCapacity/HeatCapacityInstrumentScene';
import type { deriveWorkbenchHeatSceneReadingsResult } from './workbenchHeatSceneReadings.ts';
import type { deriveWorkbenchHeatSceneVisualsResult } from './workbenchHeatSceneVisuals.ts';
import type { deriveWorkbenchHeatSceneRestoreViewResult } from './workbenchHeatSceneRestoreView.ts';

type SceneProps = React.ComponentProps<typeof HeatCapacityInstrumentScene>;
export interface WorkbenchHeatCapacityInstrumentViewProps {
  readings: deriveWorkbenchHeatSceneReadingsResult;
  visuals: deriveWorkbenchHeatSceneVisualsResult;
  restoration: deriveWorkbenchHeatSceneRestoreViewResult;
  overlays: Pick<SceneProps, 'overlayTopCenter' | 'overlayTopRight' | 'overlayBelowDefaultView' | 'overlayBottomRight' | 'overlayCenter' | 'overlayCenterAboveGuideMask' | 'overlayBottomCenter' | 'overlayGuideMask'>;
  bindings: Pick<SceneProps, 'onCameraPoseChange' | 'onSceneCheckpoint' | 'onSceneCheckpointProviderChange' | 'onSceneReady' | 'onSceneRestoreRevealComplete' | 'onDiscreteMotionChange' | 'onModeTransitionControllerChange' | 'onRuntimeFailure' | 'onGuideTargetHolesChange' | 'onFocusModeChange' | 'onFocusExitRequest' | 'onLockedInteraction' | 'onPowerToggle' | 'onStopcockOpenChange' | 'onPressureZeroFineAdjust' | 'onPressureZeroCoarseAdjust' | 'onPumpValveToggle' | 'onPumpBulbPress' | 'onHardSphereViewToggle'>;
}

// Each group is the established instrument's controlled contract; no state is owned here.
export const WorkbenchHeatCapacityInstrumentView = ({ readings, visuals, restoration, overlays, bindings }: WorkbenchHeatCapacityInstrumentViewProps) => (
  <HeatCapacityInstrumentScene
    key={readings.sceneFileId}
    {...readings}
    {...visuals}
    {...restoration}
    {...overlays}
    {...bindings}
  />
);
