import { type HeatCapacitySceneDiscreteMotionState, type HeatCapacitySceneModeTransitionController } from '../heatCapacity/HeatCapacityInstrumentScene';
import { normalizeHeatCapacityModeTransitionCheckpoint } from '../heatCapacity/heatCapacityModeTransitionModel.ts';
import { useHeatCapacityModeSessionCoordinator, type HeatCapacityModeTransitionWatchdogEvent } from './useHeatCapacityModeSessionCoordinator.ts';
import { useRef, useState } from 'react';
import type { HeatCapacityMode, WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { type WorkbenchRunState } from './workbenchFileState.ts';
import { normalizeHeatCapacityCameraTransitionState, type HeatCapacityCameraPose, type HeatCapacityCameraTransitionState, type HeatCapacitySceneCheckpointProvider, type HeatCapacitySceneModeRestoreRequest } from '../heatCapacity/HeatCapacityInstrumentScene';
import { normalizeHeatCapacityHardSphereVisualCheckpoint, type HeatCapacityHardSphereVisualCheckpoint } from '../heatCapacity/HeatCapacityHardSphereLayer.tsx';
import { normalizeHeatCapacityUltraVisualState, type HeatCapacityUltraVisualState } from '../heatCapacity/HeatCapacityUltraInstrumentModel.tsx';
import { HEAT_CAPACITY_QUALITY_PROFILES } from '../heatCapacity/heatCapacityQualityProfiles';

import { getHeatCapacityRefreshObject, normalizeHeatCapacityFocusSession, type HeatCapacityFocusMode, type HeatCapacityFocusSession } from './workbenchHeatCapacityUiCheckpoint.ts';
import { type HeatCapacityModeGuideCheckpoint, type HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';

export interface useWorkbenchHeatSceneStatePorts {
  initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  initialHeatCapacityRefreshLayout: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
  settingsPerformanceMode: import("./../heatCapacity/heatCapacityQualityProfiles.ts").HeatCapacityQualityMode;
  desktopExitQuiesced: boolean;
  initialSession: import("./workbenchInitialSession.ts").WorkbenchInitialSession;
}

export const useWorkbenchHeatSceneState = (ports: useWorkbenchHeatSceneStatePorts) => {
  const { initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, settingsPerformanceMode, desktopExitQuiesced, initialSession } = ports;
  const initialHeatCapacityCameraPose: HeatCapacityCameraPose | null = initialHeatCapacityRefreshSession?.cameraPose
    ? {
        position: initialHeatCapacityRefreshSession.cameraPose.position,
        target: initialHeatCapacityRefreshSession.cameraPose.target,
        fov: initialHeatCapacityRefreshSession.cameraPose.fovDeg,
      }
    : null;

  const initialHeatCapacityFocusMode: HeatCapacityFocusMode =
    initialHeatCapacityRefreshSession?.focusMode ?? 'none';

  const initialHeatCapacityFocusSession = normalizeHeatCapacityFocusSession(
    getHeatCapacityRefreshObject(initialHeatCapacityRefreshLayout, 'heatCapacityFocusSession'),
  );

  const heatCapacityQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES[settingsPerformanceMode];

  const [initialHeatCapacityCameraTransition] = useState<HeatCapacityCameraTransitionState | null>(() => (
    normalizeHeatCapacityCameraTransitionState(initialHeatCapacityRefreshLayout.cameraTransition)
  ));

  const [initialHeatCapacityUltraVisualState] = useState<HeatCapacityUltraVisualState | null>(() => (
    normalizeHeatCapacityUltraVisualState(initialHeatCapacityRefreshLayout.ultraVisualState)
  ));

  const [initialHeatCapacityHardSphereVisualCheckpoint] = useState<HeatCapacityHardSphereVisualCheckpoint | null>(() => (
    normalizeHeatCapacityHardSphereVisualCheckpoint(
      initialHeatCapacityRefreshLayout.hardSphereVisualCheckpoint,
      heatCapacityQualityProfile.renderModel === 'ultraGlb' ? 'ultra-cylinder' : 'skeleton-box',
    )
  ));

  const [heatCapacitySceneRestoreAcknowledged, setHeatCapacitySceneRestoreAcknowledged] = useState(
    initialHeatCapacityRefreshSession === null,
  );

  const [heatCapacityInitialSceneRestoreEnabled, setHeatCapacityInitialSceneRestoreEnabled] = useState(
    initialHeatCapacityRefreshSession !== null,
  );

  const [heatCapacityModeSceneRestoreSession, setHeatCapacityModeSceneRestoreSession] = useState<
    HeatCapacityModeUiCheckpoint | null
  >(null);

  const [heatCapacityModeSceneRestoreRequest, setHeatCapacityModeSceneRestoreRequest] = useState<
    HeatCapacitySceneModeRestoreRequest | null
  >(null);

  const [heatCapacityRefreshRestoring, setHeatCapacityRefreshRestoring] = useState(
    initialHeatCapacityRefreshSession !== null,
  );

  const heatCapacityRuntimeFailureFileIdRef = useRef<string | null>(null);

  const [heatCapacityRuntimeFailureFileId, setHeatCapacityRuntimeFailureFileId] = useState<string | null>(null);

  const heatCapacityRuntimeRecoveryIntentRef = useRef<{
    fileId: string;
    expectedFile: WorkbenchHeatCapacityState | null;
    suspendedAtMs: number;
    projectedRunState: WorkbenchRunState;
    resumeGuideRunState: boolean;
    pauseDemoOnRecovery: boolean;
  } | null>(null);

  const [initialHeatCapacityModeTransitionState] = useState(() => {
    const initialFile = initialSession.files.find((file) => file.id === initialSession.activeFileId);
    const initialMode = initialFile?.kind === 'heatCapacity' ? initialFile.heatCapacityMode : 'free';
    return normalizeHeatCapacityModeTransitionCheckpoint(
      initialHeatCapacityRefreshSession?.modeTransition,
      initialMode,
    );
  });

  const heatCapacityModeTransitionWatchdogHandlerRef = useRef<(
    event: HeatCapacityModeTransitionWatchdogEvent,
  ) => void>(() => undefined);

  const {
    state: heatCapacityModeTransitionState,
    stateRef: heatCapacityModeTransitionStateRef,
    dispatch: dispatchHeatCapacityModeTransition,
    requestTransition: requestHeatCapacityModeTransition,
    locked: heatCapacityModeTransitionLocked,
  } = useHeatCapacityModeSessionCoordinator({
    initialState: initialHeatCapacityModeTransitionState,
    onWatchdog: (event) => heatCapacityModeTransitionWatchdogHandlerRef.current(event),
    watchdogPaused:
      heatCapacityRefreshRestoring ||
      desktopExitQuiesced ||
      heatCapacityRuntimeFailureFileId !== null,
  });

  const heatCapacitySceneDiscreteMotionRef = useRef<HeatCapacitySceneDiscreteMotionState>({
    active: false,
    reasons: [],
  });

  const heatCapacitySceneModeTransitionControllerRef = useRef<
    HeatCapacitySceneModeTransitionController | null
  >(null);

  const heatCapacityModeTransitionPrepareFrameRef = useRef<number | null>(null);

  const heatCapacityModeTransitionVisualTimerRef = useRef<number | null>(null);

  const heatCapacityModeTransitionPausedVisualClockRef = useRef<{
    requestId: number;
    remainingMs: number;
  } | null>(null);

  const heatCapacityModeTransitionRefreshResumedRef = useRef(false);

  const scheduleHeatCapacityModeTargetPreparationRef = useRef<(requestId: number) => void>(() => undefined);

  const pendingHeatCapacityGuideUiRestoreRef = useRef<{
    requestId: number;
    fileId: string;
    checkpoint: HeatCapacityModeGuideCheckpoint;
  } | null>(initialHeatCapacityRefreshSession?.modeTransitionGuideUi
    ? {
        requestId: heatCapacityModeTransitionState.requestId,
        fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
        checkpoint: initialHeatCapacityRefreshSession.modeTransitionGuideUi,
      }
    : null);

  const heatCapacityFocusSessionRef = useRef<HeatCapacityFocusSession | null>(initialHeatCapacityFocusSession);

  const heatCapacitySceneFocusModeRef = useRef<HeatCapacityFocusMode>(initialHeatCapacityFocusMode);

  const heatCapacityRefreshCheckpointIdRef = useRef(
    initialHeatCapacityRefreshSession?.checkpointId ?? `${initialSession.activeFileId}:${Date.now()}`,
  );

  const heatCapacityRefreshActiveFileIdRef = useRef(
    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId ?? null,
  );

  const heatCapacityRefreshModeRef = useRef<HeatCapacityMode | null>(
    initialHeatCapacityRefreshSession?.mode ?? null,
  );

  const heatCapacityCameraPoseRef = useRef<HeatCapacityCameraPose | null>(initialHeatCapacityCameraPose);

  const heatCapacityCameraTransitionRef = useRef<HeatCapacityCameraTransitionState | null>(
    initialHeatCapacityCameraTransition,
  );

  const heatCapacityUltraVisualStateRef = useRef<HeatCapacityUltraVisualState | null>(
    initialHeatCapacityUltraVisualState,
  );

  const heatCapacityHardSphereVisualCheckpointRef = useRef<HeatCapacityHardSphereVisualCheckpoint | null>(
    initialHeatCapacityHardSphereVisualCheckpoint,
  );

  const heatCapacityRefreshRestorePendingRef = useRef(initialHeatCapacityRefreshSession !== null);

  const heatCapacityRefreshRestoreAppliedRef = useRef(false);

  const heatCapacitySceneCheckpointProviderRef = useRef<{
    fileId: string;
    provider: HeatCapacitySceneCheckpointProvider;
  } | null>(null);

  const heatCapacitySceneCheckpointSuppressPersistenceRef = useRef(false);

  const [heatCapacitySceneReadyFileId, setHeatCapacitySceneReadyFileId] = useState<string | null>(null);

  const heatCapacitySceneReadyFileIdRef = useRef<string | null>(null);

  const recoverHeatCapacityRuntimeIfReadyRef = useRef<(fileId: string) => void>(() => undefined);

  const [heatCapacityFocusResetKey, setHeatCapacityFocusResetKey] = useState(0);

  const [heatCapacityHardSphereVisualResetKey, setHeatCapacityHardSphereVisualResetKey] = useState(0);
  return { initialHeatCapacityModeTransitionState, heatCapacityModeTransitionWatchdogHandlerRef, heatCapacityModeTransitionState, heatCapacityModeTransitionStateRef, dispatchHeatCapacityModeTransition, requestHeatCapacityModeTransition, heatCapacityModeTransitionLocked, heatCapacitySceneDiscreteMotionRef, heatCapacitySceneModeTransitionControllerRef, heatCapacityModeTransitionPrepareFrameRef, heatCapacityModeTransitionVisualTimerRef, heatCapacityModeTransitionPausedVisualClockRef, heatCapacityModeTransitionRefreshResumedRef, scheduleHeatCapacityModeTargetPreparationRef, initialHeatCapacityCameraPose, initialHeatCapacityFocusMode, heatCapacityQualityProfile, initialHeatCapacityCameraTransition, initialHeatCapacityUltraVisualState, initialHeatCapacityHardSphereVisualCheckpoint, heatCapacitySceneRestoreAcknowledged, setHeatCapacitySceneRestoreAcknowledged, heatCapacityInitialSceneRestoreEnabled, setHeatCapacityInitialSceneRestoreEnabled, heatCapacityModeSceneRestoreSession, setHeatCapacityModeSceneRestoreSession, heatCapacityModeSceneRestoreRequest, setHeatCapacityModeSceneRestoreRequest, heatCapacityRefreshRestoring, setHeatCapacityRefreshRestoring, heatCapacityRuntimeFailureFileIdRef, heatCapacityRuntimeFailureFileId, setHeatCapacityRuntimeFailureFileId, heatCapacityRuntimeRecoveryIntentRef, pendingHeatCapacityGuideUiRestoreRef, heatCapacityFocusSessionRef, heatCapacitySceneFocusModeRef, heatCapacityRefreshCheckpointIdRef, heatCapacityRefreshActiveFileIdRef, heatCapacityRefreshModeRef, heatCapacityCameraPoseRef, heatCapacityCameraTransitionRef, heatCapacityUltraVisualStateRef, heatCapacityHardSphereVisualCheckpointRef, heatCapacityRefreshRestorePendingRef, heatCapacityRefreshRestoreAppliedRef, heatCapacitySceneCheckpointProviderRef, heatCapacitySceneCheckpointSuppressPersistenceRef, heatCapacitySceneReadyFileId, setHeatCapacitySceneReadyFileId, heatCapacitySceneReadyFileIdRef, recoverHeatCapacityRuntimeIfReadyRef, heatCapacityFocusResetKey, setHeatCapacityFocusResetKey, heatCapacityHardSphereVisualResetKey, setHeatCapacityHardSphereVisualResetKey };
};
