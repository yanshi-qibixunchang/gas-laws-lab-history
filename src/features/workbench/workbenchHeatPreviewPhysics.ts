import { clampNumber as clampHeatCapacityHardSphereNumber, type HeatCapacityHardSphereReleaseTimeline, HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE } from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';
import { isHeatCapacityMainReleaseFlowOpen, HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA, isHeatCapacityReleaseFlowOpen, getHeatCapacityReleaseDurationS } from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import { HEAT_CAPACITY_RELEASE_TIMING } from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { getLocalizedHeatCapacityPumpHint } from './workbenchHeatCapacityRealtimeCopy.ts';
import type { HeatCapacityCameraPose } from '../heatCapacity/HeatCapacityInstrumentScene';
import { type HeatCapacityFocusMode } from './workbenchHeatCapacityUiCheckpoint.ts';

export interface deriveWorkbenchHeatPreviewPhysicsPorts {
  normalizeHeatCapacityCameraTransitionState: typeof import('../heatCapacity/HeatCapacityInstrumentScene.tsx').normalizeHeatCapacityCameraTransitionState;
  normalizeHeatCapacityUltraVisualState: typeof import('../heatCapacity/HeatCapacityUltraInstrumentModel.tsx').normalizeHeatCapacityUltraVisualState;
  normalizeHeatCapacityHardSphereVisualCheckpoint: typeof import('../heatCapacity/HeatCapacityHardSphereLayer.tsx').normalizeHeatCapacityHardSphereVisualCheckpoint;
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  desktopExitQuiesced: boolean;
  heatCapacityRefreshRestoring: boolean;
  heatCapacityRuntimeFailureFileId: string | null;
  heatCapacityLessonDialogActive: boolean;
  autoDemoPaused: boolean;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  heatCapacityModeSceneRestoreSession: import('../heatCapacity/heatCapacityModeUiCheckpoint.ts').HeatCapacityModeUiCheckpoint | null;
  heatCapacityQualityProfile: import('../heatCapacity/heatCapacityQualityProfiles.ts').HeatCapacityQualityProfile;
}

export function deriveWorkbenchHeatPreviewPhysics({
  normalizeHeatCapacityCameraTransitionState,
  normalizeHeatCapacityUltraVisualState,
  normalizeHeatCapacityHardSphereVisualCheckpoint,
  activeFile,
  desktopExitQuiesced,
  heatCapacityRefreshRestoring,
  heatCapacityRuntimeFailureFileId,
  heatCapacityLessonDialogActive,
  autoDemoPaused,
  settingsLanguagePreference,
  heatCapacityModeSceneRestoreSession,
  heatCapacityQualityProfile,
}: deriveWorkbenchHeatPreviewPhysicsPorts) {
const heatCapacityHardSphereGasTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentState.physics.gasTemperatureK
                  : activeFile.gasTemperatureK;

const heatCapacityHardSphereAmbientTemperatureK = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsConfig.environment.ambientTemperatureK
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentConfig.physics.environment.ambientTemperatureK
                  : activeFile.ambientTemperatureK;

const heatCapacityHardSphereGasAmountRatio = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.gasAmountRatio
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentState.physics.gasAmountRatio
                  : clampHeatCapacityHardSphereNumber(
                      (Math.max(0.001, activeFile.gasPressureKPaAbs) / Math.max(0.001, activeFile.ambientPressureKPa)) *
                        (Math.max(1, heatCapacityHardSphereAmbientTemperatureK) / Math.max(1, heatCapacityHardSphereGasTemperatureK)),
                      0.05,
                      2.5,
                    );

const activeHeatCapacityUsesVisualPhysics = activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide';

const heatCapacityPhysicalReleaseReference = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.releaseReference
                : activeFile.heatCapacityFreeInstrumentState.physics.releaseReference;

const heatCapacityPhysicalStopcockFlowOpen =
                isHeatCapacityMainReleaseFlowOpen(activeFile.heatCapacityReleaseState);

const physicalReleaseFlowActive = activeHeatCapacityUsesVisualPhysics &&
                heatCapacityPhysicalStopcockFlowOpen &&
                heatCapacityPhysicalReleaseReference !== null &&
                activeFile.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA;

const teachingStopcockFlowOpen = isHeatCapacityReleaseFlowOpen(activeFile.heatCapacityReleaseState);

const teachingReleaseElapsedS = getHeatCapacityReleaseDurationS(
                activeFile.heatCapacityReleaseState,
                activeFile.simulationTimeS,
              );

const teachingReleaseFlowActive = !activeHeatCapacityUsesVisualPhysics &&
                isHeatCapacityMainReleaseFlowOpen(activeFile.heatCapacityReleaseState);

const teachingReleaseProgress = teachingReleaseFlowActive
                ? Math.min(1, Math.max(
                    0,
                    teachingReleaseElapsedS / HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                  ))
                : 0;

const releaseFlowActive = physicalReleaseFlowActive || teachingReleaseFlowActive;

const releaseAudioPathOpen = isHeatCapacityReleaseFlowOpen(activeFile.heatCapacityReleaseState);

const stopcockFlowOpen = activeHeatCapacityUsesVisualPhysics
                ? heatCapacityPhysicalStopcockFlowOpen
                : teachingStopcockFlowOpen;

const heatCapacityHardSphereReleaseTimeline: HeatCapacityHardSphereReleaseTimeline = (() => {
                const gasAmountRatio = heatCapacityHardSphereGasAmountRatio;
                const pressureFactor = clampHeatCapacityHardSphereNumber(activeFile.pressureDeltaKPa / 6, 0, 1);
                const idleTimeline = {
                  ...HEAT_CAPACITY_HARD_SPHERE_IDLE_RELEASE_TIMELINE,
                  amountBeforeRatio: gasAmountRatio,
                  amountCurrentRatio: gasAmountRatio,
                  amountTargetRatio: gasAmountRatio,
                  pressureFactor,
                };

                if (activeHeatCapacityUsesVisualPhysics) {
                  const releaseReference = heatCapacityPhysicalReleaseReference;
                  if (
                    heatCapacityPhysicalStopcockFlowOpen &&
                    releaseReference
                  ) {
                    const physicalState = activeFile.heatCapacityMode === 'guide'
                      ? activeFile.heatCapacityGuidePhysicsState
                      : activeFile.heatCapacityFreeInstrumentState.physics;
                    const elapsedS = getHeatCapacityReleaseDurationS(
                      activeFile.heatCapacityReleaseState,
                      physicalState.simulationTimeS,
                    );
                    const progress = releaseReference.reachedAmbientAtS === null
                      ? Math.min(1, Math.max(
                          0,
                          elapsedS / HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                        ))
                      : 1;
                    const gasTemperatureK = Math.max(1, heatCapacityHardSphereGasTemperatureK);
                    const ambientPressureAmountRatio =
                      heatCapacityHardSphereAmbientTemperatureK / gasTemperatureK;
                    return {
                      phase: releaseReference.reachedAmbientAtS === null
                        ? 'main-release'
                        : 'post-release-exchange',
                      elapsedS,
                      responseDelayS: 0,
                      mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                      progress,
                      pressureFactor,
                      amountBeforeRatio: releaseReference.amountBeforeRatio,
                      amountCurrentRatio: gasAmountRatio,
                      amountTargetRatio: ambientPressureAmountRatio,
                    };
                  }

                  if (!heatCapacityPhysicalStopcockFlowOpen && releaseReference?.reachedAmbientAtS === null) {
                    return {
                      ...idleTimeline,
                      phase: 'partial-stopped',
                      responseDelayS: 0,
                      mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                    };
                  }

                  return idleTimeline;
                }

                if (teachingReleaseFlowActive) {
                  const teachingReleaseAmountDelta = 0.018 + pressureFactor * 0.042;
                  return {
                    phase: 'main-release',
                    elapsedS: teachingReleaseElapsedS,
                    responseDelayS: 0,
                    mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                    progress: teachingReleaseProgress,
                    pressureFactor,
                    amountBeforeRatio: gasAmountRatio + teachingReleaseAmountDelta,
                    amountCurrentRatio: gasAmountRatio + teachingReleaseAmountDelta * (1 - teachingReleaseProgress),
                    amountTargetRatio: gasAmountRatio,
                  };
                }

                if (stopcockFlowOpen && activeFile.pressureDeltaKPa <= HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA) {
                  return {
                    ...idleTimeline,
                    phase: 'post-release-exchange',
                    responseDelayS: 0,
                    mainDurationS: HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS,
                    progress: 1,
                  };
                }

                return idleTimeline;
              })();

const activePumpProcesses = activeFile.heatCapacityMode === 'guide'
                ? activeFile.heatCapacityGuidePhysicsState.pumpProcesses
                : activeFile.heatCapacityMode === 'free'
                  ? activeFile.heatCapacityFreeInstrumentState.physics.pumpProcesses ?? []
                  : [];

const pumpFlowIntensity = Math.min(1.6, activePumpProcesses.reduce((total, process) => (
                total + Math.max(0, 1 - process.appliedProgress)
              ), 0));

const pumpFlowActive = pumpFlowIntensity > 0 ||
                (!activeHeatCapacityUsesVisualPhysics && activeFile.pumpValveOpen && activeFile.pumpBulbState === 'compressing');

const heatCapacityHardSpherePaused = desktopExitQuiesced ||
                heatCapacityRefreshRestoring ||
                heatCapacityRuntimeFailureFileId === activeFile.id ||
                activeFile.runState === 'paused' ||
                heatCapacityLessonDialogActive ||
                autoDemoPaused ||
                (activeFile.heatCapacityMode === 'guide' && activeFile.heatCapacityGuideWorkflow.paused);

const localizedHeatCapacityPumpHint = getLocalizedHeatCapacityPumpHint(
                activeFile.pumpHint,
                settingsLanguagePreference,
              );

const modeSceneRestoreSession = heatCapacityModeSceneRestoreSession?.fileId === activeFile.id &&
                heatCapacityModeSceneRestoreSession.mode === activeFile.heatCapacityMode
                ? heatCapacityModeSceneRestoreSession
                : null;

const modeSceneCameraPose: HeatCapacityCameraPose | null = modeSceneRestoreSession?.scene.cameraPose
                ? {
                    position: modeSceneRestoreSession.scene.cameraPose.position,
                    target: modeSceneRestoreSession.scene.cameraPose.target,
                    fov: modeSceneRestoreSession.scene.cameraPose.fovDeg,
                  }
                : null;

const modeSceneFocusMode: HeatCapacityFocusMode | null = modeSceneRestoreSession
                ? modeSceneRestoreSession.scene.focusMode
                : null;

const modeSceneCameraTransition = modeSceneRestoreSession
                ? normalizeHeatCapacityCameraTransitionState(modeSceneRestoreSession.scene.cameraTransition)
                : null;

const modeSceneUltraVisualState = modeSceneRestoreSession
                ? normalizeHeatCapacityUltraVisualState(modeSceneRestoreSession.scene.ultraVisualState)
                : null;

const modeSceneHardSphereCheckpoint = modeSceneRestoreSession
                ? normalizeHeatCapacityHardSphereVisualCheckpoint(
                    modeSceneRestoreSession.scene.hardSphereVisualCheckpoint,
                    heatCapacityQualityProfile.renderModel === 'ultraGlb' ? 'ultra-cylinder' : 'skeleton-box',
                  )
                : null;

  return { heatCapacityHardSphereGasTemperatureK, heatCapacityHardSphereAmbientTemperatureK, heatCapacityHardSphereGasAmountRatio, releaseFlowActive, releaseAudioPathOpen, heatCapacityHardSphereReleaseTimeline, pumpFlowIntensity, pumpFlowActive, heatCapacityHardSpherePaused, localizedHeatCapacityPumpHint, modeSceneRestoreSession, modeSceneCameraPose, modeSceneFocusMode, modeSceneCameraTransition, modeSceneUltraVisualState, modeSceneHardSphereCheckpoint };
}
