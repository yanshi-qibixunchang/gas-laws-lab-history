import type React from 'react';

export type deriveWorkbenchHeatSceneVisualsResult = Pick<React.ComponentProps<typeof import('../heatCapacity/HeatCapacityInstrumentScene.tsx').default>, 'performanceMode' | 'sceneTheme' | 'language' | 'autoDemoActive' | 'pressureReleaseBurstActive' | 'releaseFlowActive' | 'releaseAudioPathOpen' | 'releaseTimeline' | 'pumpFlowActive' | 'pumpFlowIntensity' | 'hardSphereViewEnabled' | 'hardSphereViewLocked' | 'particleMultiplier' | 'speedMultiplier' | 'hardSphereVisualResetKey' | 'hardSpherePaused' | 'interactionLocked' | 'cameraInteractionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'demoCameraFocusMode' | 'demoCameraFocusKey' | 'guideRollbackAnimation' | 'guideRollbackKey' | 'focusResetKey' | 'guideFocusMode' | 'guideFocusKey' | 'guideProjectionEnabled'>;

export interface deriveWorkbenchHeatSceneVisualsPorts {
  settingsPerformanceMode: import('../heatCapacity/heatCapacityQualityProfiles.ts').HeatCapacityQualityMode;
  resolvedWorkbenchTheme: import('./workbenchGeneralSettings.ts').WorkbenchResolvedTheme;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  autoDemoInteractionLocked: boolean;
  releaseFlowActive: boolean;
  releaseAudioPathOpen: boolean;
  heatCapacityHardSphereReleaseTimeline: import('../../domain/heatCapacity/heatCapacityHardSphereModel.ts').HeatCapacityHardSphereReleaseTimeline;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  heatCapacityModeTransitionLocked: boolean;
  heatCapacityQualityProfile: import('../heatCapacity/heatCapacityQualityProfiles.ts').HeatCapacityQualityProfile;
  heatCapacityHardSphereVisualResetKey: number;
  heatCapacityHardSpherePaused: boolean;
  activeHeatCapacityModalLocked: boolean;
  heatCapacityTeachingCompleted: boolean;
  activeHeatCapacityCurrentGroup: import('../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts').HeatCapacityFreeExperimentGroupRecord | null;
  guideHeatCapacityFocusControlId: string | null;
  demoFocusControlId: string | null;
  demoFocusPulseActive: boolean;
  guideHeatCapacityPulseActive: boolean;
  demoCameraFocusMode: "instrument" | "pump" | "bottle" | null;
  demoCameraFocusKey: number;
  guideHeatCapacityRollback: { animation: import('../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts').HeatCapacityGuideRollbackAnimation; key: number; };
  heatCapacityFocusResetKey: number;
  heatCapacityGuideFocusMode: import('./workbenchHeatCapacityUiCheckpoint.ts').HeatCapacityFocusMode | null;
  guideHeatCapacityStrongReminderFocusKey: number;
  heatCapacityGuideStrongTargetSpec: import('./workbenchHeatCapacityGuidePresentation.ts').HeatCapacityGuideStrongTargetSpec | null;
}

export function deriveWorkbenchHeatSceneVisuals({
  settingsPerformanceMode,
  resolvedWorkbenchTheme,
  settingsLanguagePreference,
  autoDemoInteractionLocked,
  releaseFlowActive,
  releaseAudioPathOpen,
  heatCapacityHardSphereReleaseTimeline,
  pumpFlowActive,
  pumpFlowIntensity,
  activeFile,
  heatCapacityModeTransitionLocked,
  heatCapacityQualityProfile,
  heatCapacityHardSphereVisualResetKey,
  heatCapacityHardSpherePaused,
  activeHeatCapacityModalLocked,
  heatCapacityTeachingCompleted,
  activeHeatCapacityCurrentGroup,
  guideHeatCapacityFocusControlId,
  demoFocusControlId,
  demoFocusPulseActive,
  guideHeatCapacityPulseActive,
  demoCameraFocusMode,
  demoCameraFocusKey,
  guideHeatCapacityRollback,
  heatCapacityFocusResetKey,
  heatCapacityGuideFocusMode,
  guideHeatCapacityStrongReminderFocusKey,
  heatCapacityGuideStrongTargetSpec,
}: deriveWorkbenchHeatSceneVisualsPorts): deriveWorkbenchHeatSceneVisualsResult {
  return {
    performanceMode: settingsPerformanceMode,
    sceneTheme: resolvedWorkbenchTheme,
    language: settingsLanguagePreference,
    autoDemoActive: autoDemoInteractionLocked,
    pressureReleaseBurstActive: releaseFlowActive,
    releaseFlowActive: releaseFlowActive,
    releaseAudioPathOpen: releaseAudioPathOpen,
    releaseTimeline: heatCapacityHardSphereReleaseTimeline,
    pumpFlowActive: pumpFlowActive,
    pumpFlowIntensity: pumpFlowIntensity,
    hardSphereViewEnabled: activeFile.hardSphereViewEnabled,
    hardSphereViewLocked: heatCapacityModeTransitionLocked,
    particleMultiplier: heatCapacityQualityProfile.particleMultiplier,
    speedMultiplier: heatCapacityQualityProfile.speedMultiplier,
    hardSphereVisualResetKey: heatCapacityHardSphereVisualResetKey,
    hardSpherePaused: heatCapacityHardSpherePaused,
    interactionLocked: autoDemoInteractionLocked ||
                    activeHeatCapacityModalLocked ||
                    heatCapacityTeachingCompleted ||
                    heatCapacityModeTransitionLocked ||
                    (
                      activeFile.heatCapacityMode === 'free' &&
                      (
                        activeHeatCapacityCurrentGroup === null ||
                        (
                          activeHeatCapacityCurrentGroup.status !== 'draft' &&
                          activeHeatCapacityCurrentGroup.status !== 'collecting'
                        )
                      )
                    ),
    cameraInteractionLocked: autoDemoInteractionLocked || heatCapacityModeTransitionLocked,
    demoFocusControlId: guideHeatCapacityFocusControlId ?? demoFocusControlId,
    demoFocusPulseActive: demoFocusPulseActive || guideHeatCapacityPulseActive,
    demoCameraFocusMode: demoCameraFocusMode,
    demoCameraFocusKey: demoCameraFocusKey,
    guideRollbackAnimation: guideHeatCapacityRollback?.animation ?? null,
    guideRollbackKey: guideHeatCapacityRollback?.key ?? 0,
    focusResetKey: heatCapacityFocusResetKey,
    guideFocusMode: heatCapacityGuideFocusMode,
    guideFocusKey: guideHeatCapacityStrongReminderFocusKey,
    guideProjectionEnabled: Boolean(heatCapacityGuideStrongTargetSpec),
  };
}
