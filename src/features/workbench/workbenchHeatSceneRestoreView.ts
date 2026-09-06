import type React from 'react';

export type deriveWorkbenchHeatSceneRestoreViewResult = Pick<React.ComponentProps<typeof import('../heatCapacity/HeatCapacityInstrumentScene.tsx').default>, 'initialCameraPose' | 'initialFocusMode' | 'initialCameraTransition' | 'initialUltraVisualState' | 'initialHardSphereVisualCheckpoint' | 'sceneRestoreAcknowledged' | 'modeRestoreRequest' | 'modeTransitionActive' | 'modeTransitionDurationMs' | 'restoreAudioMuted' | 'restoredSceneFrameDataUrl'>;

export interface deriveWorkbenchHeatSceneRestoreViewPorts {
  modeSceneRestoreSession: import('../heatCapacity/heatCapacityModeUiCheckpoint.ts').HeatCapacityModeUiCheckpoint | null;
  modeSceneCameraPose: import('../heatCapacity/HeatCapacityInstrumentScene.tsx').HeatCapacityCameraPose | null;
  heatCapacityInitialSceneRestoreEnabled: boolean;
  initialHeatCapacityRefreshSession: import('./workbenchHeatCapacityRefreshSession.ts').WorkbenchHeatCapacityRefreshSession | null;
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  initialHeatCapacityCameraPose: import('../heatCapacity/HeatCapacityInstrumentScene.tsx').HeatCapacityCameraPose | null;
  modeSceneFocusMode: import('./workbenchHeatCapacityUiCheckpoint.ts').HeatCapacityFocusMode | null;
  initialHeatCapacityFocusMode: import('./workbenchHeatCapacityUiCheckpoint.ts').HeatCapacityFocusMode | null;
  modeSceneCameraTransition: import('../heatCapacity/HeatCapacityInstrumentScene.tsx').HeatCapacityCameraTransitionState | null;
  initialHeatCapacityCameraTransition: import('../heatCapacity/HeatCapacityInstrumentScene.tsx').HeatCapacityCameraTransitionState | null;
  modeSceneUltraVisualState: import('../heatCapacity/HeatCapacityUltraInstrumentModel.tsx').HeatCapacityUltraVisualState | null;
  initialHeatCapacityUltraVisualState: import('../heatCapacity/HeatCapacityUltraInstrumentModel.tsx').HeatCapacityUltraVisualState | null;
  modeSceneHardSphereCheckpoint: import('../heatCapacity/HeatCapacityHardSphereLayer.tsx').HeatCapacityHardSphereVisualCheckpoint | null;
  initialHeatCapacityHardSphereVisualCheckpoint: import('../heatCapacity/HeatCapacityHardSphereLayer.tsx').HeatCapacityHardSphereVisualCheckpoint | null;
  heatCapacitySceneRestoreAcknowledged: boolean;
  heatCapacityModeSceneRestoreRequest: import('../heatCapacity/HeatCapacityInstrumentScene.tsx').HeatCapacitySceneModeRestoreRequest | null;
  heatCapacityModeTransitionLocked: boolean;
  HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS: 380;
  desktopExitQuiesced: boolean;
  heatCapacityModeTransitionState: import('../heatCapacity/heatCapacityModeTransitionModel.ts').HeatCapacityModeTransitionState;
  HEAT_CAPACITY_REFRESH_SCENE_REVISION: "heat-capacity-instrument-scene-v1";
  resolvedWorkbenchTheme: import('./workbenchGeneralSettings.ts').WorkbenchResolvedTheme;
  settingsPerformanceMode: import('../heatCapacity/heatCapacityQualityProfiles.ts').HeatCapacityQualityMode;
}

export function deriveWorkbenchHeatSceneRestoreView({
  modeSceneRestoreSession,
  modeSceneCameraPose,
  heatCapacityInitialSceneRestoreEnabled,
  initialHeatCapacityRefreshSession,
  activeFile,
  initialHeatCapacityCameraPose,
  modeSceneFocusMode,
  initialHeatCapacityFocusMode,
  modeSceneCameraTransition,
  initialHeatCapacityCameraTransition,
  modeSceneUltraVisualState,
  initialHeatCapacityUltraVisualState,
  modeSceneHardSphereCheckpoint,
  initialHeatCapacityHardSphereVisualCheckpoint,
  heatCapacitySceneRestoreAcknowledged,
  heatCapacityModeSceneRestoreRequest,
  heatCapacityModeTransitionLocked,
  HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS,
  desktopExitQuiesced,
  heatCapacityModeTransitionState,
  HEAT_CAPACITY_REFRESH_SCENE_REVISION,
  resolvedWorkbenchTheme,
  settingsPerformanceMode,
}: deriveWorkbenchHeatSceneRestoreViewPorts): deriveWorkbenchHeatSceneRestoreViewResult {
  return {
    initialCameraPose: modeSceneRestoreSession
                      ? modeSceneCameraPose
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityCameraPose
                      : null,
    initialFocusMode: modeSceneRestoreSession
                      ? modeSceneFocusMode
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityFocusMode
                      : null,
    initialCameraTransition: modeSceneRestoreSession
                      ? modeSceneCameraTransition
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityCameraTransition
                      : null,
    initialUltraVisualState: modeSceneRestoreSession
                      ? modeSceneUltraVisualState
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityUltraVisualState
                      : null,
    initialHardSphereVisualCheckpoint: modeSceneRestoreSession
                      ? modeSceneHardSphereCheckpoint
                      : heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id
                      ? initialHeatCapacityHardSphereVisualCheckpoint
                      : null,
    sceneRestoreAcknowledged: heatCapacitySceneRestoreAcknowledged,
    modeRestoreRequest: heatCapacityModeSceneRestoreRequest,
    modeTransitionActive: heatCapacityModeTransitionLocked,
    modeTransitionDurationMs: HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS,
    restoreAudioMuted: desktopExitQuiesced ||
                    heatCapacityModeTransitionState.phase === 'preparing-target' ||
                    heatCapacityModeTransitionState.phase === 'animating',
    restoredSceneFrameDataUrl: heatCapacityInitialSceneRestoreEnabled &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id &&
                    initialHeatCapacityRefreshSession.sceneSnapshot?.sceneRevision === HEAT_CAPACITY_REFRESH_SCENE_REVISION &&
                    initialHeatCapacityRefreshSession.sceneSnapshot.themeId === resolvedWorkbenchTheme &&
                    initialHeatCapacityRefreshSession.sceneSnapshot.performanceProfileId === settingsPerformanceMode
                      ? initialHeatCapacityRefreshSession.sceneSnapshot.imageDataUrl
                      : null,
  };
}
